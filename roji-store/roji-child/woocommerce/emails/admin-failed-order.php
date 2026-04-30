<?php
/**
 * Admin failed order email — Roji copy with funnel context.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 3.7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;">
<?php
	/* translators: %1$s: order number, %2$s: customer name */
	printf(
		esc_html__( 'Payment failed on order #%1$s from %2$s.', 'roji-child' ),
		esc_html( $order->get_order_number() ),
		esc_html( $order->get_formatted_billing_full_name() )
	);
?>
</p>

<?php
$utm_source   = (string) $order->get_meta( '_roji_utm_source' );
$utm_campaign = (string) $order->get_meta( '_roji_utm_campaign' );
if ( $utm_source || $utm_campaign ) :
?>
	<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;">
		Source: <code><?php echo esc_html( $utm_source ); ?></code>
		<?php if ( $utm_campaign ) : ?> · <code><?php echo esc_html( $utm_campaign ); ?></code><?php endif; ?>
	</p>
<?php endif; ?>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
