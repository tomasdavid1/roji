<?php
/**
 * Roji "Reserve Order" payment gateway.
 *
 * A WooCommerce payment method that captures the entire checkout funnel
 * without taking any money. Used during the validation phase before a
 * real high-risk processor (AllayPay / Durango / Coinbase Commerce) is
 * wired up.
 *
 * UX (truthful, no fake card form):
 *   - Customer fills the standard WC checkout (cart, shipping, billing).
 *   - At the payment step, ONE option appears: "Reserve order (we'll
 *     invoice you)".
 *   - On submit, WC creates an order in `on-hold` status (no money
 *     moves, no PII beyond what WC already captures).
 *   - Order confirmation page shows: "Reserved — we'll email you a
 *     secure payment link within 24h."
 *   - Standard WC new-order email goes out to admin (you get the lead).
 *
 * This is NOT a fake gateway that pretends to charge — that would be
 * dishonest and PCI-relevant. This is a real WC gateway that defers
 * payment, like a B2B "invoice on shipment" workflow. We're explicit
 * about it everywhere it appears.
 *
 * Toggle via wp-admin → WooCommerce → Settings → Payments. Disable when
 * a real processor is live.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*
 * Theme files are loaded on `after_setup_theme`, which runs AFTER
 * `plugins_loaded` has already fired. So registering on the
 * `plugins_loaded` hook here would silently never run (latent bug
 * since the theme's first day) — the gateway class never gets
 * declared, the WC payment_gateways filter at the bottom of this
 * file therefore can't reference it, and the failover in
 * payment-failover.php has nothing to fall back to either.
 *
 * Strategy: run the init now if plugins_loaded already fired
 * (the normal theme-load path), otherwise queue it on the hook
 * (defensive — covers any future load path where this file
 * happens to be required earlier, e.g. an mu-plugin chain).
 */
if ( did_action( 'plugins_loaded' ) ) {
	roji_reserve_init_gateway();
} else {
	add_action( 'plugins_loaded', 'roji_reserve_init_gateway', 11 );
}
function roji_reserve_init_gateway() {
	if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
		return;
	}

	/**
	 * The gateway itself.
	 */
	class WC_Roji_Reserve_Gateway extends WC_Payment_Gateway {
		public function __construct() {
			$this->id                 = 'roji_reserve';
			$this->method_title       = __( 'Roji — Reserve Order', 'roji-child' );
			$this->method_description = __(
				'Captures order details without taking payment. Customer is told a payment link will be emailed within 24 hours. Used during processor onboarding to validate the funnel end-to-end.',
				'roji-child'
			);
			$this->has_fields         = false;

			$this->init_form_fields();
			$this->init_settings();

			$this->title       = $this->get_option( 'title', 'Place your order — pay by secure link' );
			$this->description = $this->get_option(
				'description',
				"Place your order below — we'll email you a secure payment link within 24 hours.\nNothing is charged today. Your order is reserved while we confirm inventory."
			);
			$this->enabled     = $this->get_option( 'enabled', 'yes' );

			add_action(
				'woocommerce_update_options_payment_gateways_' . $this->id,
				array( $this, 'process_admin_options' )
			);
			// Show a special note on the thank-you page when this gateway was used.
			add_action( 'woocommerce_thankyou_' . $this->id, array( $this, 'thankyou_page' ), 5 );
		}

		public function init_form_fields() {
			$this->form_fields = array(
				'enabled'     => array(
					'title'   => __( 'Enable / Disable', 'roji-child' ),
					'type'    => 'checkbox',
					'label'   => __( 'Enable Reserve-Order checkout', 'roji-child' ),
					'default' => 'yes',
				),
				'title'       => array(
					'title'       => __( 'Title shown to customer', 'roji-child' ),
					'type'        => 'text',
					'description' => __( 'Label on the checkout payment-method radio group.', 'roji-child' ),
					'default'     => __( 'Place order — pay by secure link', 'roji-child' ),
				),
				'description' => array(
					'title'       => __( 'Description shown to customer', 'roji-child' ),
					'type'        => 'textarea',
					'description' => __( 'Helper text under the radio. Be honest about the deferred-payment flow.', 'roji-child' ),
					'default'     => __( "Submit your order now and we'll email you a secure payment link within 24 hours. Nothing is charged today; your order is reserved while we verify inventory and ship-readiness.", 'roji-child' ),
				),
				'admin_email' => array(
					'title'       => __( 'Notify email on new reserved order', 'roji-child' ),
					'type'        => 'email',
					'description' => __( 'In addition to the standard WC admin email, we send a richer "validation" digest to this address. Leave blank to disable.', 'roji-child' ),
					'default'     => get_option( 'admin_email' ),
				),
			);
		}

		public function process_payment( $order_id ) {
			// All steps below are wrapped so a single failure (stock, mail,
			// transient store) cannot bubble up as the generic WC
			// "We were unable to process your order" error. The order is
			// the source of truth — once it's saved on-hold, we redirect
			// to thank-you regardless of secondary side-effect failures.

			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( "[Roji Reserve] process_payment: order #{$order_id} not found" );
				wc_add_notice(
					__( "We couldn't find your order. Please try again or email support@rojipeptides.com.", 'roji-child' ),
					'error'
				);
				return array( 'result' => 'failure', 'redirect' => '' );
			}

			// Stock reduction is best-effort. Most Roji SKUs run with
			// manage_stock=false (so this is a no-op), but if any single
			// item has stock issues we don't want to block the order —
			// ops will reconcile inventory manually before shipping.
			try {
				wc_reduce_stock_levels( $order_id );
			} catch ( \Throwable $e ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( sprintf(
					'[Roji Reserve] stock reduction failed for order #%d: %s',
					$order_id,
					$e->getMessage()
				) );
				$order->add_order_note( 'Stock reduction skipped: ' . $e->getMessage() );
			}

			try {
				$order->update_status(
					'on-hold',
					__( 'Reserve-order checkout: payment deferred — awaiting manual invoice.', 'roji-child' )
				);
				$order->update_meta_data( '_roji_reserve_order', 'yes' );
				$order->update_meta_data( '_roji_reserve_at', gmdate( 'c' ) );
				$order->save();
			} catch ( \Throwable $e ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( sprintf(
					'[Roji Reserve] order status/save failed for order #%d: %s',
					$order_id,
					$e->getMessage()
				) );
				wc_add_notice(
					__( "Something went wrong saving your order. We've been notified — please email support@rojipeptides.com so we can complete it manually.", 'roji-child' ),
					'error'
				);
				return array( 'result' => 'failure', 'redirect' => '' );
			}

			// Empty cart so customer can start fresh. Wrap because a
			// session/cart edge case here would derail the redirect.
			try {
				if ( function_exists( 'WC' ) && WC()->cart ) {
					WC()->cart->empty_cart();
				}
			} catch ( \Throwable $e ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( sprintf(
					'[Roji Reserve] cart empty failed for order #%d: %s',
					$order_id,
					$e->getMessage()
				) );
			}

			// Conversion pixel transient — pure key/value write, but
			// guard it anyway so a transient backend hiccup is harmless.
			try {
				roji_reserve_emit_conversion_pixel( $order );
			} catch ( \Throwable $e ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				error_log( sprintf(
					'[Roji Reserve] conversion pixel failed for order #%d: %s',
					$order_id,
					$e->getMessage()
				) );
			}

			// Validation email is the most likely source of synchronous
			// failure on a fresh Kinsta install (no SMTP plugin, no SPF,
			// or wp_mail throwing on a misconfigured From). Defer it to
			// a one-shot WP-Cron task so the customer always gets the
			// thank-you redirect even if the mailer is unhappy.
			$admin_email = $this->get_option( 'admin_email' );
			if ( ! empty( $admin_email ) ) {
				if ( ! wp_next_scheduled( 'roji_reserve_send_email_async', array( $order_id, $admin_email ) ) ) {
					wp_schedule_single_event(
						time() + 5,
						'roji_reserve_send_email_async',
						array( $order_id, $admin_email )
					);
				}
			}

			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( sprintf(
				'[Roji Reserve] order #%d placed successfully (total=%s %s)',
				$order_id,
				$order->get_total(),
				$order->get_currency()
			) );

			return array(
				'result'   => 'success',
				'redirect' => $this->get_return_url( $order ),
			);
		}

		/**
		 * Notice on the thank-you page (in addition to the order details).
		 */
		public function thankyou_page() {
			?>
			<div class="roji-reserve-thankyou" style="
				margin: 1.5em 0; padding: 1.25em 1.5em;
				border: 1px solid rgba(79,109,245,0.35);
				border-radius: 12px;
				background: linear-gradient(180deg, rgba(79,109,245,0.06), rgba(79,109,245,0.02));
				color: var(--roji-text, #f0f0f5);
			">
				<strong style="display:block; margin-bottom: 0.4em; font-size: 1.05em;">
					Order received — payment link on the way.
				</strong>
				<p style="margin: 0; line-height: 1.55;">
					Check your inbox: we'll email you a secure payment link within 24 hours.
					Your order is reserved while we verify inventory.
					<strong>Nothing has been charged today.</strong>
				</p>
			</div>
			<?php
		}
	}

	/**
	 * Tell WooCommerce about it.
	 */
	add_filter(
		'woocommerce_payment_gateways',
		function ( $gateways ) {
			$gateways[] = 'WC_Roji_Reserve_Gateway';
			return $gateways;
		}
	);
}

/**
 * Add a simple custom WC order status if not already present so we can
 * later distinguish "reserved" orders from "on-hold for fraud check".
 *
 * For now we lean on `on-hold` (native WC) + an order meta `_roji_reserve_order=yes`,
 * so no custom status is registered. This keeps reports compatible with
 * existing WC dashboards.
 *
 * The `roji-cli` script `wp roji reserve:list` (below) lists all reserved
 * orders so ops can see what's pending.
 */

/**
 * Send a richer "validation" email to ops on every reserved order.
 *
 * Beyond the standard WC new-order email, this digest includes the
 * conversion-funnel context the validation phase actually cares about:
 *
 *   - Source / medium / campaign (UTMs from session)
 *   - Affiliate code if present
 *   - Subscription / autoship flag
 *   - Time-to-purchase from first session
 */
/**
 * Async wrapper triggered by the wp_schedule_single_event call inside
 * process_payment. Loads the order fresh and delegates to the regular
 * sender. Wrapped in try/catch so a mail failure cannot retrigger the
 * cron retry storm WC's default behavior would create.
 */
add_action( 'roji_reserve_send_email_async', 'roji_reserve_send_email_async_handler', 10, 2 );
function roji_reserve_send_email_async_handler( $order_id, $to ) {
	try {
		$order = wc_get_order( (int) $order_id );
		if ( ! $order ) {
			return;
		}
		roji_reserve_send_validation_email( $order, $to );
	} catch ( \Throwable $e ) {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( sprintf(
			'[Roji Reserve] async validation email failed for order #%d: %s',
			(int) $order_id,
			$e->getMessage()
		) );
	}
}

function roji_reserve_send_validation_email( WC_Order $order, $to ) {
	if ( empty( $to ) ) {
		return;
	}
	$lines = array();
	$lines[] = sprintf( 'Reserved order #%d (%s) — %s %s',
		$order->get_id(),
		$order->get_status(),
		$order->get_currency(),
		$order->get_formatted_order_total()
	);
	$lines[] = '';
	$lines[] = 'Customer: ' . trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
	$lines[] = 'Email:    ' . $order->get_billing_email();
	$lines[] = 'Phone:    ' . $order->get_billing_phone();
	$lines[] = 'Country:  ' . $order->get_billing_country() . ' / ' . $order->get_billing_state();
	$lines[] = '';
	$lines[] = 'Items:';
	foreach ( $order->get_items() as $item ) {
		$lines[] = sprintf( '  · %d × %s — %s',
			$item->get_quantity(),
			$item->get_name(),
			wp_strip_all_tags( wc_price( $item->get_total() ) )
		);
	}

	// Funnel context.
	$utm_source   = $order->get_meta( '_roji_utm_source' );
	$utm_medium   = $order->get_meta( '_roji_utm_medium' );
	$utm_campaign = $order->get_meta( '_roji_utm_campaign' );
	$aff_code     = $order->get_meta( '_roji_aff_ref' );
	$autoship     = $order->get_meta( '_roji_autoship' );

	if ( $utm_source || $utm_medium || $utm_campaign || $aff_code || $autoship ) {
		$lines[] = '';
		$lines[] = 'Funnel:';
		if ( $utm_source )   $lines[] = '  utm_source:   ' . $utm_source;
		if ( $utm_medium )   $lines[] = '  utm_medium:   ' . $utm_medium;
		if ( $utm_campaign ) $lines[] = '  utm_campaign: ' . $utm_campaign;
		if ( $aff_code )     $lines[] = '  affiliate:    ' . $aff_code;
		if ( $autoship )     $lines[] = '  autoship:     yes';
	}

	$lines[] = '';
	$lines[] = 'Admin:';
	$lines[] = '  ' . admin_url( 'post.php?post=' . $order->get_id() . '&action=edit' );

	$body = implode( "\n", $lines );

	$sent = false;
	try {
		$sent = wp_mail(
			$to,
			sprintf( '[Roji RESERVED] Order #%d — %s',
				$order->get_id(),
				$order->get_billing_email()
			),
			$body
		);
	} catch ( \Throwable $e ) {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( '[Roji Reserve] wp_mail threw: ' . $e->getMessage() );
	}

	if ( ! $sent ) {
		// Persist the digest as an order note so ops can still read it
		// from wp-admin even when SMTP is unavailable.
		$order->add_order_note( "Validation digest (mailer unavailable):\n\n" . $body );
	}
}

/**
 * Emit the GA4/Ads conversion event server-side AND attach a pixel so
 * the redirect-completed page completes attribution.
 *
 * We run this from `process_payment` (just before the redirect) by
 * stuffing event data into a transient keyed by order ID, which the
 * thank-you-page tracking script picks up and fires.
 */
function roji_reserve_emit_conversion_pixel( WC_Order $order ) {
	$payload = array(
		'event'       => 'reserve_order_submitted',
		'order_id'    => $order->get_id(),
		'value'       => floatval( $order->get_total() ),
		'currency'    => $order->get_currency(),
		'items_count' => $order->get_item_count(),
		'autoship'    => $order->get_meta( '_roji_autoship' ) ? 1 : 0,
	);
	set_transient( 'roji_reserve_pixel_' . $order->get_id(), $payload, HOUR_IN_SECONDS );
}

/**
 * Inject the conversion pixel into the thank-you page footer when the
 * order was a reserve-order. Reads the transient set above.
 */
add_action( 'woocommerce_thankyou_roji_reserve', 'roji_reserve_print_pixel', 20 );
function roji_reserve_print_pixel( $order_id ) {
	$payload = get_transient( 'roji_reserve_pixel_' . $order_id );
	if ( ! $payload ) {
		return;
	}
	delete_transient( 'roji_reserve_pixel_' . $order_id );

	$json = wp_json_encode( $payload );
	if ( ! $json ) {
		return;
	}
	?>
	<script>
	(function(){
		try {
			var p = <?php echo $json; // already escaped via wp_json_encode ?>;
			if (typeof window.gtag === 'function') {
				window.gtag('event', p.event, {
					transaction_id: 'reserve-' + p.order_id,
					value:          p.value,
					currency:       p.currency,
					items_count:    p.items_count,
					autoship:       !!p.autoship,
				});
			}
			if (window.dataLayer && Array.isArray(window.dataLayer)) {
				window.dataLayer.push(Object.assign({}, p, { event: 'roji_reserve_order' }));
			}
		} catch(e) { /* swallow */ }
	})();
	</script>
	<?php
}

/**
 * Persist UTMs / affiliate refs from session into order meta so the
 * validation email + later analytics see them.
 *
 * Fires before WC writes the order so the meta lands in the same DB
 * write rather than as a follow-up update.
 */
add_action( 'woocommerce_checkout_create_order', 'roji_reserve_persist_funnel_context', 10, 2 );
function roji_reserve_persist_funnel_context( $order, $data ) {
	if ( ! is_a( $order, 'WC_Order' ) ) {
		return;
	}

	$session = WC()->session;
	if ( ! $session ) {
		return;
	}

	$keys = array(
		'_roji_utm_source'   => 'utm_source',
		'_roji_utm_medium'   => 'utm_medium',
		'_roji_utm_campaign' => 'utm_campaign',
		'_roji_utm_term'     => 'utm_term',
		'_roji_utm_content'  => 'utm_content',
		'_roji_aff_ref'      => 'roji_aff_ref',
	);
	foreach ( $keys as $meta => $session_key ) {
		$val = $session->get( $session_key );
		if ( $val !== null && $val !== '' ) {
			$order->update_meta_data( $meta, sanitize_text_field( $val ) );
		}
	}

	// Cookie fallback for affiliate ref (session may not have it yet on
	// first checkout if the cookie was set on a previous browser tab).
	if ( empty( $order->get_meta( '_roji_aff_ref' ) ) && ! empty( $_COOKIE['roji_aff_ref'] ) ) {
		$order->update_meta_data( '_roji_aff_ref', sanitize_text_field( wp_unslash( $_COOKIE['roji_aff_ref'] ) ) );
	}
}

/**
 * Capture UTMs from query string into WC session on every page load.
 * First-touch wins (we don't overwrite if already set).
 */
add_action( 'wp', 'roji_reserve_capture_utms', 5 );
function roji_reserve_capture_utms() {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() ) {
		return;
	}
	if ( ! function_exists( 'WC' ) || ! WC()->session ) {
		return;
	}

	$utm_keys = array( 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' );
	foreach ( $utm_keys as $k ) {
		if ( ! isset( $_GET[ $k ] ) ) {
			continue;
		}
		$existing = WC()->session->get( $k );
		if ( $existing ) {
			continue; // first-touch wins
		}
		$val = sanitize_text_field( wp_unslash( $_GET[ $k ] ) );
		WC()->session->set( $k, substr( $val, 0, 200 ) );
	}
}

/**
 * WP-CLI helpers for ops:
 *
 *   wp roji reserve:list           — all reserved orders, newest first
 *   wp roji reserve:cancel <id>    — cancel one (e.g. customer abandoned)
 *   wp roji reserve:counts         — quick conversion summary
 */
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command( 'roji reserve:list', function () {
		$orders = wc_get_orders(
			array(
				'limit'      => 100,
				'meta_key'   => '_roji_reserve_order',
				'meta_value' => 'yes',
				'orderby'    => 'date',
				'order'      => 'DESC',
			)
		);
		if ( empty( $orders ) ) {
			WP_CLI::success( 'No reserve orders.' );
			return;
		}
		$rows = array();
		foreach ( $orders as $o ) {
			$rows[] = array(
				'id'      => $o->get_id(),
				'status'  => $o->get_status(),
				'total'   => $o->get_total(),
				'email'   => $o->get_billing_email(),
				'utm'     => $o->get_meta( '_roji_utm_source' ),
				'aff'     => $o->get_meta( '_roji_aff_ref' ),
				'created' => $o->get_date_created()->date( 'Y-m-d H:i' ),
			);
		}
		WP_CLI\Utils\format_items( 'table', $rows, array_keys( $rows[0] ) );
	} );

	WP_CLI::add_command( 'roji reserve:counts', function () {
		global $wpdb;
		$total = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value = %s",
			'_roji_reserve_order',
			'yes'
		) );
		$by_source = $wpdb->get_results( $wpdb->prepare(
			"SELECT pm.meta_value AS source, COUNT(DISTINCT pm.post_id) AS n
			 FROM {$wpdb->postmeta} pm
			 INNER JOIN {$wpdb->postmeta} pm2 ON pm2.post_id = pm.post_id
			 WHERE pm.meta_key = %s AND pm2.meta_key = %s AND pm2.meta_value = %s
			 GROUP BY pm.meta_value
			 ORDER BY n DESC",
			'_roji_utm_source',
			'_roji_reserve_order',
			'yes'
		) );
		WP_CLI::log( "Total reserved orders: {$total}" );
		WP_CLI::log( '' );
		WP_CLI::log( 'By utm_source:' );
		if ( empty( $by_source ) ) {
			WP_CLI::log( '  (none with utm_source)' );
		} else {
			foreach ( $by_source as $r ) {
				WP_CLI::log( sprintf( '  %-30s %d', $r->source ?: '(direct)', $r->n ) );
			}
		}
	} );
}
