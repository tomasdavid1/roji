<?php
/**
 * Customer reset password email — Roji wording + correct link escaping.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 9.3.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$reset_url = add_query_arg(
	array(
		'key'   => $reset_key,
		'id'    => $user_id,
		'login' => rawurlencode( $user_login ),
	),
	wc_get_endpoint_url( 'lost-password', '', wc_get_page_permalink( 'myaccount' ) )
);

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<?php /* translators: %s: Customer username */ ?>
<p><?php printf( esc_html__( 'Hi %s,', 'woocommerce' ), esc_html( $user_login ) ); ?></p>
<p><?php printf( esc_html__( 'Someone requested a new password for the following account on %s:', 'woocommerce' ), esc_html( wp_specialchars_decode( get_option( 'blogname' ), ENT_QUOTES ) ) ); ?></p>
<p><?php printf( esc_html__( 'Username: %s', 'woocommerce' ), esc_html( $user_login ) ); ?></p>
<p><?php esc_html_e( 'If you did not ask for this, you can ignore this email. Your password will stay the same.', 'roji-child' ); ?></p>
<p style="margin:18px 0;">
	<a href="<?php echo esc_url( $reset_url ); ?>" style="display:inline-block;background:#4f6df5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
		<?php esc_html_e( 'Reset your password →', 'roji-child' ); ?>
	</a>
</p>
<p style="font-size:13px;color:#8a8a9a;"><?php esc_html_e( 'For your security, this link expires after a short time. If it stops working, request a fresh reset from the login page.', 'roji-child' ); ?></p>

<?php
if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
