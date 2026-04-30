<?php
/**
 * Customer refunded order email — Roji copy.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 3.7.0
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;"><?php printf( esc_html__( 'Hi %s,', 'roji-child' ), esc_html( $order->get_billing_first_name() ?: 'there' ) ); ?></p>

<p style="margin:0 0 14px;">
<?php
if ( $partial_refund ) {
	printf(
		/* translators: %s: order number */
		esc_html__( 'Your order #%s has been partially refunded. Details are below for your records.', 'roji-child' ),
		esc_html( $order->get_order_number() )
	);
} else {
	printf(
		/* translators: %s: order number */
		esc_html__( 'Your order #%s has been refunded in full. Details are below for your records.', 'roji-child' ),
		esc_html( $order->get_order_number() )
	);
}
?>
</p>
<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;"><?php esc_html_e( 'The refund returns to your original payment method. Depending on your bank, it may take up to 10 business days to appear on your statement.', 'roji-child' ); ?></p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
