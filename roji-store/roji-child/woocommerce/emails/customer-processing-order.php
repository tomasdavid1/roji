<?php
/**
 * Customer processing order email — Roji copy.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 3.7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;"><?php printf( esc_html__( 'Hi %s,', 'roji-child' ), esc_html( $order->get_billing_first_name() ?: 'there' ) ); ?></p>
<p style="margin:0 0 14px;"><?php
	printf(
		/* translators: %s: order number */
		esc_html__( 'Thanks for your order #%s. Payment is confirmed and we\'re preparing your shipment.', 'roji-child' ),
		esc_html( $order->get_order_number() )
	);
?></p>
<p style="margin:0 0 14px;"><?php esc_html_e( 'We typically dispatch within 1–2 business days. You\'ll receive a separate email with tracking the moment your package leaves our warehouse.', 'roji-child' ); ?></p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
