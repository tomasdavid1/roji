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
<p style="margin:0 0 14px;"><?php
	printf(
		/* translators: %s: order number */
		esc_html__( 'We\'ve received your order #%s. It\'s on hold while we confirm payment or complete a quick review — you don\'t need to do anything unless we contact you.', 'roji-child' ),
		esc_html( $order->get_order_number() )
	);
?></p>
<p style="margin:0 0 14px;"><?php esc_html_e( 'You\'ll get another email the moment we move it to processing. Most reviews finish within a few hours during US business hours.', 'roji-child' ); ?></p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
