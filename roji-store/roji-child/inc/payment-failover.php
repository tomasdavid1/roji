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
		 * No approved gateway is available right now. Try to inject
		 * the always-safe Reserve-Order gateway so the customer can
		 * still complete the funnel (we'll invoice them within 24h).
		 *
		 * We pull the registered instance straight from the WC
		 * gateways manager rather than instantiating a new one, so
		 * settings and admin overrides are preserved.
		 */
		if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
			$all = WC()->payment_gateways()->payment_gateways();
			if ( isset( $all['roji_reserve'] ) ) {
				$gateways['roji_reserve'] = $all['roji_reserve'];
			}
		}

		return $gateways;
	},
	100
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
