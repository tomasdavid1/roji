<?php
/**
 * Customer on-hold order email — Roji copy.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 7.3.0
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;"><?php printf( esc_html__( 'Hi %s,', 'roji-child' ), esc_html( $order->get_billing_first_name() ?: 'there' ) ); ?></p>

<?php
/*
 * Two distinct on-hold paths produce this email today, and the customer
 * copy is meaningfully different between them:
 *
 *   1. Reserve-Order checkout (the live default while no real payment
 *      processor is wired). The customer never entered card details —
 *      they explicitly chose "Place order — pay by secure link". So
 *      "confirming payment" copy is wrong; the truthful copy is
 *      "we'll email you a secure payment link within 24h, nothing has
 *      been charged".
 *   2. A future real-payment processor that drops to on-hold for
 *      fraud/manual review. There the original "confirm payment"
 *      copy is correct.
 *
 * We branch on the `_roji_reserve_order` meta the gateway sets in
 * process_payment so each path gets accurate copy.
 */
$is_reserve = $order->get_meta( '_roji_reserve_order' ) === 'yes';
?>

<?php if ( $is_reserve ) : ?>
	<p style="margin:0 0 14px;"><?php
		printf(
			/* translators: %s: order number */
			esc_html__( 'We\'ve received your order #%s. Your items are reserved while we confirm inventory.', 'roji-child' ),
			esc_html( $order->get_order_number() )
		);
	?></p>
	<p style="margin:0 0 14px;"><strong><?php esc_html_e( 'Nothing has been charged today.', 'roji-child' ); ?></strong> <?php esc_html_e( 'We\'ll email you a secure payment link within 24 hours so you can complete checkout. Reply to that email any time if you need to make changes.', 'roji-child' ); ?></p>
<?php else : ?>
	<p style="margin:0 0 14px;"><?php
		printf(
			/* translators: %s: order number */
			esc_html__( 'We\'ve received your order #%s. It\'s on hold while we complete a quick review — you don\'t need to do anything unless we contact you.', 'roji-child' ),
			esc_html( $order->get_order_number() )
		);
	?></p>
	<p style="margin:0 0 14px;"><?php esc_html_e( 'You\'ll get another email the moment we move it to processing. Most reviews finish within a few hours during US business hours.', 'roji-child' ); ?></p>
<?php endif; ?>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
