<?php
/**
 * Roji Member dashboard — replaces WooCommerce's default prose intro
 * with a card-based action layout (orders / subscriptions / address /
 * downloads / affiliate) that matches the rest of the storefront.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 4.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$current_user = wp_get_current_user();
$first        = $current_user && $current_user->first_name ? $current_user->first_name : ( $current_user->display_name ?? '' );
$first        = sanitize_text_field( $first );

$orders_url   = wc_get_endpoint_url( 'orders' );
$subs_url     = wc_get_endpoint_url( 'subscriptions' );
$dl_url       = wc_get_endpoint_url( 'downloads' );
$addr_url     = wc_get_endpoint_url( 'edit-address' );
$account_url  = wc_get_endpoint_url( 'edit-account' );
$aff_url      = wc_get_endpoint_url( defined( 'ROJI_ACCOUNT_AFFILIATE_ENDPOINT' ) ? ROJI_ACCOUNT_AFFILIATE_ENDPOINT : 'affiliate' );
$logout_url   = wc_logout_url();

// Recent orders — last 3.
$recent = wc_get_orders( array(
	'customer_id' => get_current_user_id(),
	'limit'       => 3,
	'orderby'     => 'date',
	'order'       => 'DESC',
) );

// Detect whether the WC Subscriptions / WP Swings endpoints are real.
$has_subs_endpoint = (bool) get_option( 'woocommerce_myaccount_subscriptions_endpoint', '' )
	|| function_exists( 'wcs_get_users_subscriptions' );
?>

<div class="roji-member-dashboard">
	<header class="rmd-greet">
		<h2 class="rmd-greet__title">
			<?php
			if ( $first !== '' ) {
				/* translators: %s: customer first name */
				printf( esc_html__( 'Welcome back, %s.', 'roji-child' ), esc_html( $first ) );
			} else {
				esc_html_e( 'Welcome back.', 'roji-child' );
			}
			?>
		</h2>
		<p class="rmd-greet__sub">
			<?php esc_html_e( 'Your member area for orders, subscriptions, addresses, and the affiliate program.', 'roji-child' ); ?>
		</p>
	</header>

	<div class="rmd-grid">
		<a class="rmd-card" href="<?php echo esc_url( $orders_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18l-2 13H5L3 6z"/><path d="M3 6L2 3H1"/><path d="M9 11h6"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Orders</div>
				<div class="rmd-card__title">View order history &amp; tracking</div>
				<div class="rmd-card__hint"><?php
					$total_orders = wc_get_customer_order_count( get_current_user_id() );
					/* translators: %d: total order count */
					printf( esc_html( _n( '%d order on file', '%d orders on file', $total_orders, 'roji-child' ) ), (int) $total_orders );
				?></div>
			</div>
		</a>

		<?php if ( $has_subs_endpoint ) : ?>
		<a class="rmd-card" href="<?php echo esc_url( $subs_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3.8-7.3"/><polyline points="21 4 21 10 15 10"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Subscriptions</div>
				<div class="rmd-card__title">Manage autoship &amp; renewals</div>
				<div class="rmd-card__hint"><?php esc_html_e( 'Skip, pause, or cancel any time.', 'roji-child' ); ?></div>
			</div>
		</a>
		<?php endif; ?>

		<a class="rmd-card" href="<?php echo esc_url( $addr_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Addresses</div>
				<div class="rmd-card__title">Edit shipping &amp; billing</div>
				<div class="rmd-card__hint"><?php esc_html_e( 'US-only shipping today.', 'roji-child' ); ?></div>
			</div>
		</a>

		<a class="rmd-card" href="<?php echo esc_url( $account_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Account</div>
				<div class="rmd-card__title">Email &amp; password</div>
				<div class="rmd-card__hint"><?php echo esc_html( $current_user->user_email ); ?></div>
			</div>
		</a>

		<?php if ( $dl_url ) : ?>
		<a class="rmd-card" href="<?php echo esc_url( $dl_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Downloads</div>
				<div class="rmd-card__title">Certificates of Analysis</div>
				<div class="rmd-card__hint"><?php esc_html_e( 'COA, batch records, receipts.', 'roji-child' ); ?></div>
			</div>
		</a>
		<?php endif; ?>

		<a class="rmd-card rmd-card--accent" href="<?php echo esc_url( $aff_url ); ?>">
			<div class="rmd-card__icon">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
			</div>
			<div class="rmd-card__body">
				<div class="rmd-card__label">Affiliate program</div>
				<div class="rmd-card__title">Earn on every referral</div>
				<div class="rmd-card__hint"><?php esc_html_e( 'Track clicks, commissions, and tier progress.', 'roji-child' ); ?></div>
			</div>
		</a>
	</div>

	<?php if ( ! empty( $recent ) ) : ?>
		<section class="rmd-recent">
			<header class="rmd-section-head">
				<h3><?php esc_html_e( 'Recent orders', 'roji-child' ); ?></h3>
				<a href="<?php echo esc_url( $orders_url ); ?>" class="rmd-section-head__link"><?php esc_html_e( 'See all →', 'roji-child' ); ?></a>
			</header>
			<div class="rmd-recent__list">
				<?php foreach ( $recent as $order ) : ?>
					<?php
					$status_label = wc_get_order_status_name( $order->get_status() );
					$status_slug  = sanitize_html_class( $order->get_status() );
					?>
					<a class="rmd-order" href="<?php echo esc_url( $order->get_view_order_url() ); ?>">
						<div class="rmd-order__num">#<?php echo esc_html( $order->get_order_number() ); ?></div>
						<div class="rmd-order__date"><?php echo esc_html( wc_format_datetime( $order->get_date_created() ) ); ?></div>
						<div class="rmd-order__total"><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></div>
						<div class="rmd-order__status rmd-order__status--<?php echo esc_attr( $status_slug ); ?>"><?php echo esc_html( $status_label ); ?></div>
					</a>
				<?php endforeach; ?>
			</div>
		</section>
	<?php endif; ?>

	<footer class="rmd-foot">
		<p>
			<?php esc_html_e( 'Need help? Reply to any order email or write to', 'roji-child' ); ?>
			<a href="mailto:<?php echo esc_attr( get_option( 'admin_email' ) ); ?>"><?php echo esc_html( get_option( 'admin_email' ) ); ?></a>
			· <a href="<?php echo esc_url( $logout_url ); ?>"><?php esc_html_e( 'Sign out', 'roji-child' ); ?></a>
		</p>
	</footer>
</div>

<?php
/**
 * Preserve the WC dashboard hooks so any plugin/extension that injects
 * dashboard widgets (subscriptions plugins, downloads, etc.) still gets a
 * chance to render.
 */
do_action( 'woocommerce_account_dashboard' );

/**
 * Deprecated hook for backwards compatibility.
 */
do_action( 'woocommerce_before_my_account' );
do_action( 'woocommerce_after_my_account' );
