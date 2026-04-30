<?php
/**
 * Customer failed order email — Roji copy + retry link.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 9.5.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;"><?php printf( esc_html__( 'Hi %s,', 'roji-child' ), esc_html( $order->get_billing_first_name() ?: 'there' ) ); ?></p>
<p style="margin:0 0 14px;"><?php esc_html_e( 'We weren\'t able to complete your order — your payment didn\'t go through. No charge was made.', 'roji-child' ); ?></p>

<?php $pay_url = $order->get_checkout_payment_url(); ?>
<?php if ( $pay_url ) : ?>
	<p style="margin:18px 0;">
		<a href="<?php echo esc_url( $pay_url ); ?>" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Try a different payment method →</a>
	</p>
<?php endif; ?>

<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;"><?php esc_html_e( 'Common causes: card declined by issuer, AVS mismatch, or insufficient funds. If you\'ve verified your card and it still won\'t go through, reply to this email and we\'ll help in under a business day.', 'roji-child' ); ?></p>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
