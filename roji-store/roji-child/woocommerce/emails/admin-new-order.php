<?php
/**
 * Admin new order email — Roji copy with funnel context.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails\HTML
 * @version 3.7.0
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<p style="margin:0 0 14px;">
<?php
	/* translators: %s: customer full name */
	printf( esc_html__( 'New order received from %s.', 'roji-child' ), esc_html( $order->get_formatted_billing_full_name() ) );
?>
</p>

<?php
$utm_source   = (string) $order->get_meta( '_roji_utm_source' );
$utm_medium   = (string) $order->get_meta( '_roji_utm_medium' );
$utm_campaign = (string) $order->get_meta( '_roji_utm_campaign' );
$aff_code     = (string) $order->get_meta( '_roji_aff_ref' );
$autoship     = (string) $order->get_meta( '_roji_autoship' );

if ( $utm_source || $utm_medium || $utm_campaign || $aff_code || $autoship ) :
?>
	<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">
		<tr><td style="padding:14px 18px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:13px;line-height:1.7;">
			<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;margin-bottom:8px;">Funnel context</div>
			<?php if ( $utm_source ) : ?><div>utm_source · <code><?php echo esc_html( $utm_source ); ?></code></div><?php endif; ?>
			<?php if ( $utm_medium ) : ?><div>utm_medium · <code><?php echo esc_html( $utm_medium ); ?></code></div><?php endif; ?>
			<?php if ( $utm_campaign ) : ?><div>utm_campaign · <code><?php echo esc_html( $utm_campaign ); ?></code></div><?php endif; ?>
			<?php if ( $aff_code ) : ?><div>affiliate · <code><?php echo esc_html( $aff_code ); ?></code></div><?php endif; ?>
			<?php if ( $autoship ) : ?><div>autoship · <code>yes</code></div><?php endif; ?>
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
