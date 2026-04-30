<?php
/**
 * Admin cancelled order email — Roji copy.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 4.1.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;">
<?php
	/* translators: %1$s: order number, %2$s: customer name */
	printf(
		esc_html__( 'Order #%1$s from %2$s was cancelled.', 'roji-child' ),
		esc_html( $order->get_order_number() ),
		esc_html( $order->get_formatted_billing_full_name() )
	);
?>
</p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
