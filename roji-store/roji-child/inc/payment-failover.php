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
