<?php
/**
 * Roji-themed lost-password form.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 9.2.0
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_before_lost_password_form' );
?>

<div class="roji-auth">
	<div class="roji-auth__hero">
		<div class="roji-auth__brand">
			<span class="roji-auth__brand-mark">roji</span>
			<span class="roji-auth__brand-eyebrow">Research peptides</span>
		</div>
		<h1 class="roji-auth__title"><?php esc_html_e( 'Reset your password', 'roji-child' ); ?></h1>
		<p class="roji-auth__sub"><?php esc_html_e( 'Enter your email or username and we\'ll send a password reset link.', 'roji-child' ); ?></p>
	</div>

	<section class="roji-auth__card roji-auth__card--solo">
		<form method="post" class="woocommerce-ResetPassword lost_reset_password roji-auth__form">
			<p class="roji-auth__field">
				<label for="user_login"><?php esc_html_e( 'Email or username', 'roji-child' ); ?></label>
				<input type="text" name="user_login" id="user_login" autocomplete="username" required />
			</p>
			<?php do_action( 'woocommerce_lostpassword_form' ); ?>
			<input type="hidden" name="wc_reset_password" value="true" />
			<?php wp_nonce_field( 'lost_password', 'woocommerce-lost-password-nonce' ); ?>
			<button type="submit" class="roji-auth__btn" value="<?php esc_attr_e( 'Send reset link', 'roji-child' ); ?>"><?php esc_html_e( 'Send reset link', 'roji-child' ); ?></button>

			<p class="roji-auth__alt">
				<a href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>">← <?php esc_html_e( 'Back to sign in', 'roji-child' ); ?></a>
			</p>
		</form>
	</section>
</div>

<?php do_action( 'woocommerce_after_lost_password_form' );
