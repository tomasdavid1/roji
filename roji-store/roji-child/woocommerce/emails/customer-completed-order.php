<?php
/**
 * Customer completed order email — Roji copy + tracking link.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 3.7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$tracking      = trim( (string) $order->get_meta( '_roji_tracking_number' ) );
$carrier       = (string) $order->get_meta( '_roji_tracking_carrier' );
$tracking_url  = function_exists( 'roji_carrier_tracking_url' ) ? roji_carrier_tracking_url( $carrier, $tracking ) : '';

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;"><?php printf( esc_html__( 'Hi %s,', 'roji-child' ), esc_html( $order->get_billing_first_name() ?: 'there' ) ); ?></p>
<p style="margin:0 0 14px;"><?php
	printf(
		/* translators: %s: order number */
		esc_html__( 'Your order #%s is complete and on its way.', 'roji-child' ),
		esc_html( $order->get_order_number() )
	);
?></p>

<?php if ( $tracking !== '' ) : ?>
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">
		<tr><td style="padding:18px 20px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:14px;line-height:1.6;">
			<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;">Tracking</div>
			<div style="font-family:JetBrains Mono,monospace;font-size:15px;color:#f0f0f5;margin:6px 0 12px;"><?php echo esc_html( $tracking ); ?></div>
			<?php if ( $tracking_url ) : ?>
				<a href="<?php echo esc_url( $tracking_url ); ?>" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:13px;">Track shipment →</a>
			<?php endif; ?>
		</td></tr>
	</table>
<?php endif; ?>

<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );

if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
