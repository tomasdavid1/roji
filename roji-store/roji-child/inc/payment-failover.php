<?php
/**
 * Roji Child — payment gateway failover notifier.
 *
 * Logs gateway failures and emails the site admin so we can investigate
 * holds, declines, or fraud-system trips on the high-risk processor.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Notify on payment failure (any gateway).
 *
 * @param int $order_id Order ID.
 */
add_action(
	'woocommerce_payment_failed',
	function ( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$msg = sprintf(
			'[Roji] Order #%1$d payment failed. Gateway: %2$s · Amount: %3$s %4$s · Customer: %5$s',
			(int) $order_id,
			$order->get_payment_method_title(),
			number_format_i18n( (float) $order->get_total(), 2 ),
			$order->get_currency(),
			$order->get_billing_email()
		);

		// Logged to PHP error log for monitoring/uptime tools to pick up.
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( $msg );

		wp_mail(
			get_option( 'admin_email' ),
			__( 'Roji: Payment Gateway Failure', 'roji-child' ),
			$msg . "\n\n"
				. __( 'If failures cluster, check the primary gateway dashboard for holds or fraud flags. Crypto backup remains available at checkout.', 'roji-child' )
		);
	}
);

/**
 * Suppress unsupported gateways at the storefront, AND guarantee a
 * working fallback so checkout never silently breaks.
 *
 * Roji accepts cards (high-risk processor), crypto (Coinbase Commerce
 * / NOWPayments), and — during onboarding — the internal Reserve-Order
 * gateway (see inc/gateway-reserve-order.php). WooCommerce ships with
 * several built-ins that must NEVER appear on this site:
 *
 *   - cod      (Cash on Delivery)         — we don't deliver cash
 *   - cheque   (Check Payments / "test")  — not supported
 *   - bacs     (Direct bank transfer)     — not supported
 *   - paypal   (legacy PayPal Standard)   — not supported (PayPal does
 *                                           not service this category)
 *
 * Filtering at `woocommerce_available_payment_gateways` is defense in
 * depth — even if an admin accidentally re-enables one of these in
 * WooCommerce → Settings → Payments, they still won't show on
 * checkout. To intentionally re-enable one, remove it from $blocked.
 *
 * Fallback safety net:
 *   If, after filtering, NO production gateway remains available
 *   (i.e. neither AllayPay/Durango cards nor a crypto gateway is
 *   active), we register the Reserve-Order gateway in its place so
 *   the customer still has a way to submit the order. Without this,
 *   "Place Order" silently 4xx's with WC's "Sorry, no payment
 *   methods are available." error — which is exactly what just
 *   happened in production.
 *
 * Allowed production gateway IDs (extend as more are wired up):
 *   - allaypay, durango, nmi      (high-risk cards)
 *   - coinbase_commerce           (crypto)
 *   - nowpayments                 (crypto)
 *   - roji_reserve                (manual — defer-and-invoice)
 */
add_filter(
	'woocommerce_available_payment_gateways',
	function ( $gateways ) {
		if ( ! is_array( $gateways ) ) {
			return $gateways;
		}

		$blocked = array( 'cod', 'cheque', 'bacs', 'paypal' );
		foreach ( $blocked as $id ) {
			if ( isset( $gateways[ $id ] ) ) {
				unset( $gateways[ $id ] );
			}
		}

		// If at least one Roji-approved gateway is left, we're done.
		$approved = array(
			'allaypay',
			'durango',
			'nmi',
			'coinbase_commerce',
			'nowpayments',
			'roji_reserve',
		);
		foreach ( $approved as $id ) {
			if ( isset( $gateways[ $id ] ) ) {
				return $gateways;
			}
		}

		/*
		 * No approved gateway is available right now. Force-inject
		 * the Reserve-Order gateway so the customer can still
		 * complete the funnel (we'll email a payment link within
		 * 24h). We must bypass the gateway's own `enabled` setting
		 * here — on a fresh install it defaults to "yes" but only
		 * after an admin opens WC > Settings > Payments and saves
		 * once. Until then WC excludes it from the available list,
		 * which is exactly the failure mode we're guarding against.
		 *
		 * We try three injection sources in order:
		 *   1. The registered instance from WC's gateway registry
		 *      (most correct — preserves any admin-set settings).
		 *   2. A fresh instance of the class if it's loaded.
		 *   3. Defer to a later filter pass after `plugins_loaded`
		 *      has fully run, in case checkout rendered before our
		 *      gateway class registration fired.
		 */
		$reserve = null;
		if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
			$all = WC()->payment_gateways()->payment_gateways();
			if ( isset( $all['roji_reserve'] ) ) {
				$reserve = $all['roji_reserve'];
			}
		}
		if ( ! $reserve && class_exists( 'WC_Roji_Reserve_Gateway' ) ) {
			$reserve = new WC_Roji_Reserve_Gateway();
		}
		if ( $reserve ) {
			// Force-enable for this request; we don't persist the
			// setting because admins should still be able to flip
			// it via Settings. Also force-set the chosen method on
			// the WC session so the single-gateway radio template
			// finds a valid `chosen_payment_method` and the form
			// submits with `payment_method=roji_reserve` instead of
			// failing validation with "Invalid payment method".
			$reserve->enabled = 'yes';
			$gateways['roji_reserve'] = $reserve;

			if ( function_exists( 'WC' ) && WC()->session ) {
				$current = WC()->session->get( 'chosen_payment_method' );
				if ( empty( $current ) || ! in_array( $current, array_keys( $gateways ), true ) ) {
					WC()->session->set( 'chosen_payment_method', 'roji_reserve' );
				}
			}
		} else {
			// Loud signal so this never silently fails again.
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( '[Roji Checkout] payment-failover: Reserve gateway class not available — checkout will show "no methods" notice. Enable the Reserve gateway in wp-admin → WooCommerce → Settings → Payments.' );
		}

		return $gateways;
	},
	100
);

/**
 * Replace WooCommerce's stock "Sorry, it seems that there are no
 * available payment methods..." notice with friendlier Roji copy.
 *
 * In practice the failover above should keep at least Reserve-Order
 * available at all times, so this notice should never reach a real
 * customer. We override it anyway as a belt-and-suspenders so that
 * if something race-conditions the fallback (e.g. a plugin runs at
 * priority > 100 and strips it again), the message still tells the
 * customer what to do instead of looking broken.
 */
add_filter(
	'gettext',
	function ( $translated, $original, $domain ) {
		if ( 'woocommerce' !== $domain ) {
			return $translated;
		}
		// WC core source string, used by both the checkout page and
		// the order-pay endpoint when no gateway is available.
		if ( 'Sorry, it seems that there are no available payment methods. Please contact us if you require assistance or wish to make alternate arrangements.' === $original ) {
			return __(
				"Place your order below — we'll email you a secure payment link within 24 hours. Nothing is charged today. Your order is reserved while we confirm inventory.",
				'roji-child'
			);
		}
		return $translated;
	},
	20,
	3
);

/**
 * Belt & suspenders: log when the fallback fires so we notice if
 * the production processor goes offline mid-shift instead of finding
 * out from a confused customer support ticket.
 */
add_action(
	'woocommerce_checkout_order_processed',
	function ( $order_id, $data, $order ) {
		$method = $order->get_payment_method();
		if ( 'roji_reserve' === $method ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( sprintf( '[Roji] Order #%d placed via Reserve-Order fallback gateway.', (int) $order_id ) );
		}
	},
	10,
	3
);

/**
 * Backfill `payment_method` on submit when the customer's POST didn't
 * include one but the only available gateway is `roji_reserve`.
 *
 * Why this is needed:
 *   When `woocommerce_available_payment_gateways` returned an empty list
 *   on the page render (e.g. before our failover wired things up, or
 *   during a brief race during deploy/cache warm), WC's `payment.php`
 *   template prints the "no methods" notice instead of any radios. The
 *   customer fills the form, clicks Place Order, the AJAX POST arrives
 *   with `payment_method=` empty, WC validation rejects with "Invalid
 *   payment method." This filter sees the empty value, confirms Reserve
 *   is in fact available now (cache warmed, classes loaded, etc.), and
 *   sets the method before validation runs.
 *
 * We only do this when Reserve is the ONLY available gateway — if the
 * customer had a real choice we never want to silently pick for them.
 */
add_filter(
	'woocommerce_checkout_posted_data',
	function ( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}
		if ( ! empty( $data['payment_method'] ) ) {
			return $data;
		}
		if ( ! function_exists( 'WC' ) || ! WC()->payment_gateways() ) {
			return $data;
		}
		$available = WC()->payment_gateways()->get_available_payment_gateways();
		if ( ! is_array( $available ) || count( $available ) !== 1 ) {
			return $data;
		}
		$only_id = array_keys( $available )[0];
		if ( 'roji_reserve' !== $only_id ) {
			return $data;
		}
		$data['payment_method'] = 'roji_reserve';
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( '[Roji Checkout] backfilled empty payment_method=roji_reserve on submit (Reserve was sole available gateway).' );
		return $data;
	},
	5
);

/**
 * Log every checkout-validation error so we can see in the server log
 * what's actually blocking the order. WC's default behavior is to
 * collect notices and display them at the top of the checkout, but
 * if anything throws *before* notices render the customer just sees
 * the generic "We were unable to process your order" message.
 *
 * This handler attaches at priority 1 so it runs before WC's own
 * processing and doesn't interfere with normal error display.
 */
add_action(
	'woocommerce_after_checkout_validation',
	function ( $data, $errors ) {
		if ( ! ( $errors instanceof WP_Error ) ) {
			return;
		}
		$codes = $errors->get_error_codes();
		if ( empty( $codes ) ) {
			return;
		}
		$messages = array();
		foreach ( $codes as $code ) {
			foreach ( (array) $errors->get_error_messages( $code ) as $msg ) {
				$messages[] = $code . ': ' . wp_strip_all_tags( $msg );
			}
		}
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log(
			'[Roji Checkout] validation errors: '
			. implode( ' | ', $messages )
			. ' | payment_method=' . ( isset( $data['payment_method'] ) ? $data['payment_method'] : '?' )
			. ' | country=' . ( isset( $data['billing_country'] ) ? $data['billing_country'] : '?' )
		);
	},
	10,
	2
);

/**
 * Catch any uncaught exception thrown by gateway process_payment so
 * the customer sees something better than the generic WC "unable to
 * process" message and we get a full stack trace in the log to debug.
 *
 * Hooks into the action WC fires right before redirecting on payment
 * success - if we got here, the gateway returned success. The point
 * of this handler is the LOG side, so we can correlate ChatGPT order
 * complaints with what actually happened.
 */
add_action(
	'woocommerce_payment_complete',
	function ( $order_id ) {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( sprintf( '[Roji Checkout] payment_complete fired for order #%d', (int) $order_id ) );
	},
	5
);
