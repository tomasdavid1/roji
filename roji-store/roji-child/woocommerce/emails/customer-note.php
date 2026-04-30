<?php
/**
 * Customer note email — Roji copy.
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
<p style="margin:0 0 14px;"><?php esc_html_e( 'We added a note to your order:', 'roji-child' ); ?></p>

<blockquote style="margin:0 0 18px;padding:16px 18px;background:#111118;border-left:3px solid #4f6df5;border-radius:6px;color:#f0f0f5;font-size:14px;line-height:1.6;">
	<?php echo wpautop( wptexturize( make_clickable( $customer_note ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</blockquote>

<p style="margin:0 0 14px;"><?php esc_html_e( 'For reference, your order details are below.', 'roji-child' ); ?></p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
