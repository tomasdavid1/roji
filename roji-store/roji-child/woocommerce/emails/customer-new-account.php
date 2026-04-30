<?php
/**
 * Customer new account email — Roji copy + member-area context.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates\Emails
 * @version 6.0.0
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email ); ?>

<?php /* translators: %s: Customer username */ ?>
<p><?php printf( esc_html__( 'Hi %s,', 'woocommerce' ), esc_html( $user_login ) ); ?></p>
<p>
	<?php
	printf(
		/* translators: %s: site title */
		esc_html__( 'Thanks for creating an account on %s.', 'roji-child' ),
		esc_html( $blogname )
	);
	echo ' ';
	printf(
		/* translators: %s: username */
		esc_html__( 'Your username is %s.', 'roji-child' ),
		esc_html( $user_login )
	);
	?>
</p>
<?php if ( 'yes' === get_option( 'woocommerce_registration_generate_password' ) && $password_generated && $set_password_url ) : ?>
	<p style="margin:18px 0;">
		<a href="<?php echo esc_url( $set_password_url ); ?>" style="display:inline-block;background:#4f6df5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
			<?php esc_html_e( 'Set your password →', 'roji-child' ); ?>
		</a>
	</p>
<?php else : ?>
	<p style="margin:18px 0;">
		<a href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>" style="display:inline-block;background:#4f6df5;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
			<?php esc_html_e( 'Open your member area →', 'roji-child' ); ?>
		</a>
	</p>
<?php endif; ?>

<p style="margin:0 0 14px;font-size:14px;color:#c8c8d0;"><?php esc_html_e( 'Inside your account you can:', 'roji-child' ); ?></p>
<ul style="margin:0 0 18px;padding-left:18px;color:#c8c8d0;line-height:1.8;font-size:14px;">
	<li><?php esc_html_e( 'Track every order and download Janoshik COAs for each batch.', 'roji-child' ); ?></li>
	<li><?php esc_html_e( 'Manage subscriptions, payment methods, and shipping addresses.', 'roji-child' ); ?></li>
	<li><?php esc_html_e( 'Apply to the affiliate program once you\'ve placed your first order.', 'roji-child' ); ?></li>
</ul>

<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;"><?php esc_html_e( 'If you did not create this account, please contact us right away so we can secure it.', 'roji-child' ); ?></p>

<?php
if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}

do_action( 'woocommerce_email_footer', $email );
