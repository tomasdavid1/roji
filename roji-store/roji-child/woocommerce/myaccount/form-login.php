<?php
/**
 * Roji-themed login form (WC My Account).
 *
 * Replaces the default WC Login + Register two-column form. Registration
 * is handled by the standard WC option (`woocommerce_enable_myaccount_registration`)
 * so when the under-construction flag is on we render login only.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 9.2.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_before_customer_login_form' );

$show_register = 'yes' === get_option( 'woocommerce_enable_myaccount_registration' );
?>

<div class="roji-auth">

	<div class="roji-auth__hero">
		<div class="roji-auth__brand">
			<span class="roji-auth__brand-mark">roji</span>
			<span class="roji-auth__brand-eyebrow">Research peptides</span>
		</div>
		<h1 class="roji-auth__title"><?php esc_html_e( 'Sign in to your account', 'roji-child' ); ?></h1>
		<p class="roji-auth__sub"><?php esc_html_e( 'Track orders, manage autoship, and download your batch COAs.', 'roji-child' ); ?></p>
	</div>

	<div class="roji-auth__cols<?php echo $show_register ? ' roji-auth__cols--two' : ''; ?>">

		<section class="roji-auth__card">
			<h2 class="roji-auth__card-title"><?php esc_html_e( 'Sign in', 'roji-child' ); ?></h2>

			<form class="woocommerce-form woocommerce-form-login login roji-auth__form" method="post">
				<?php do_action( 'woocommerce_login_form_start' ); ?>

				<p class="roji-auth__field">
					<label for="username"><?php esc_html_e( 'Email or username', 'roji-child' ); ?></label>
					<input type="text" name="username" id="username" autocomplete="username" required
						value="<?php echo ( ! empty( $_POST['username'] ) ) ? esc_attr( wp_unslash( $_POST['username'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.MissingUnslash ?>" />
				</p>

				<p class="roji-auth__field">
					<label for="password"><?php esc_html_e( 'Password', 'roji-child' ); ?></label>
					<input type="password" name="password" id="password" autocomplete="current-password" required />
				</p>

				<?php do_action( 'woocommerce_login_form' ); ?>

				<div class="roji-auth__row">
					<label class="roji-auth__remember">
						<input type="checkbox" name="rememberme" value="forever" />
						<span><?php esc_html_e( 'Remember me', 'roji-child' ); ?></span>
					</label>
					<a class="roji-auth__forgot" href="<?php echo esc_url( wp_lostpassword_url() ); ?>"><?php esc_html_e( 'Forgot password?', 'roji-child' ); ?></a>
				</div>

				<?php wp_nonce_field( 'woocommerce-login', 'woocommerce-login-nonce' ); ?>
				<button type="submit" class="roji-auth__btn" name="login" value="<?php esc_attr_e( 'Sign in', 'roji-child' ); ?>">
					<?php esc_html_e( 'Sign in', 'roji-child' ); ?>
				</button>

				<?php do_action( 'woocommerce_login_form_end' ); ?>
			</form>
		</section>

		<?php if ( $show_register ) : ?>
			<section class="roji-auth__card">
				<h2 class="roji-auth__card-title"><?php esc_html_e( 'Create an account', 'roji-child' ); ?></h2>
				<form method="post" class="woocommerce-form woocommerce-form-register register roji-auth__form" <?php do_action( 'woocommerce_register_form_tag' ); ?>>
					<?php do_action( 'woocommerce_register_form_start' ); ?>

					<?php if ( 'no' === get_option( 'woocommerce_registration_generate_username' ) ) : ?>
						<p class="roji-auth__field">
							<label for="reg_username"><?php esc_html_e( 'Username', 'roji-child' ); ?></label>
							<input type="text" name="username" id="reg_username" autocomplete="username" required
								value="<?php echo ( ! empty( $_POST['username'] ) ) ? esc_attr( wp_unslash( $_POST['username'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.MissingUnslash ?>" />
						</p>
					<?php endif; ?>

					<p class="roji-auth__field">
						<label for="reg_email"><?php esc_html_e( 'Email address', 'roji-child' ); ?></label>
						<input type="email" name="email" id="reg_email" autocomplete="email" required
							value="<?php echo ( ! empty( $_POST['email'] ) ) ? esc_attr( wp_unslash( $_POST['email'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.MissingUnslash ?>" />
					</p>

					<?php if ( 'no' === get_option( 'woocommerce_registration_generate_password' ) ) : ?>
						<p class="roji-auth__field">
							<label for="reg_password"><?php esc_html_e( 'Password', 'roji-child' ); ?></label>
							<input type="password" name="password" id="reg_password" autocomplete="new-password" required />
						</p>
					<?php else : ?>
						<p class="roji-auth__hint"><?php esc_html_e( 'A link to set a new password will be sent to your email address.', 'roji-child' ); ?></p>
					<?php endif; ?>

					<?php do_action( 'woocommerce_register_form' ); ?>

					<?php wp_nonce_field( 'woocommerce-register', 'woocommerce-register-nonce' ); ?>
					<button type="submit" class="roji-auth__btn" name="register" value="<?php esc_attr_e( 'Create account', 'roji-child' ); ?>">
						<?php esc_html_e( 'Create account', 'roji-child' ); ?>
					</button>
					<p class="roji-auth__legal">
						<?php
						printf(
							/* translators: 1: terms page link, 2: shipping policy, 3: returns policy */
							esc_html__( 'By creating an account, you agree to our %1$s, %2$s, and %3$s.', 'roji-child' ),
							'<a href="' . esc_url( home_url( '/terms/' ) ) . '">terms</a>',
							'<a href="' . esc_url( home_url( '/shipping-policy/' ) ) . '">shipping policy</a>',
							'<a href="' . esc_url( home_url( '/return-policy/' ) ) . '">returns policy</a>'
						);
						?>
					</p>

					<?php do_action( 'woocommerce_register_form_end' ); ?>
				</form>
			</section>
		<?php endif; ?>
	</div>

	<p class="roji-auth__research">
		<?php esc_html_e( 'For research and laboratory use only. Not for human consumption. Must be 21+.', 'roji-child' ); ?>
	</p>
</div>

<?php do_action( 'woocommerce_after_customer_login_form' );
