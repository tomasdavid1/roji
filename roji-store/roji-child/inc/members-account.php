<?php
/**
 * Roji Child — WooCommerce “members” area (My Account).
 *
 * WooCommerce already owns orders, addresses, subscriptions, and payment
 * flows; we only ensure the account page exists, expose it in navigation,
 * add an Affiliate tab for logged-in shoppers, and lightly theme the hub.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_ACCOUNT_AFFILIATE_ENDPOINT = 'affiliate';

/**
 * Temporary gate for public login/register while members UX is under construction.
 */
function roji_members_auth_under_construction() {
	return defined( 'ROJI_MEMBERS_AUTH_UNDER_CONSTRUCTION' ) && ROJI_MEMBERS_AUTH_UNDER_CONSTRUCTION;
}

/**
 * Allow staff/admin access while public auth is gated.
 */
function roji_members_can_bypass_auth_gate() {
	return current_user_can( 'manage_options' ) || current_user_can( 'manage_woocommerce' );
}

add_filter(
	'woocommerce_enable_myaccount_registration',
	function ( $enabled ) {
		if ( roji_members_auth_under_construction() ) {
			return 'no';
		}
		return $enabled;
	},
	20
);

/**
 * Public-facing redirect destination for the gated period.
 * We use a dedicated page so the URL is clean + share-friendly.
 */
function roji_members_coming_soon_url() {
	return home_url( '/members-coming-soon/' );
}

/**
 * Render the gated "coming soon" view inline (no Elementor required) so
 * the page works even before the editor visits it.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! roji_members_auth_under_construction() || roji_members_can_bypass_auth_gate() ) {
			return;
		}
		if ( ! function_exists( 'is_account_page' ) || ! is_account_page() ) {
			return;
		}
		if ( is_user_logged_in() ) {
			return;
		}
		wp_safe_redirect( roji_members_coming_soon_url() );
		exit;
	},
	2
);

add_action(
	'login_init',
	function () {
		if ( ! roji_members_auth_under_construction() || roji_members_can_bypass_auth_gate() ) {
			return;
		}
		$action = isset( $_REQUEST['action'] ) ? sanitize_key( wp_unslash( $_REQUEST['action'] ) ) : 'login'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( in_array( $action, array( 'logout', 'rp', 'resetpass' ), true ) ) {
			return;
		}
		wp_safe_redirect( roji_members_coming_soon_url() );
		exit;
	},
	2
);

/**
 * Auto-provision the /members-coming-soon page on theme switch (and
 * lazily for shop managers in admin) with a branded shortcode body.
 */
function roji_members_ensure_coming_soon_page() {
	$slug = 'members-coming-soon';
	if ( get_page_by_path( $slug ) ) {
		return;
	}
	wp_insert_post(
		array(
			'post_status'    => 'publish',
			'post_type'      => 'page',
			'post_title'     => 'Members area — coming soon',
			'post_name'      => $slug,
			'post_content'   => '[roji_members_coming_soon]',
			'comment_status' => 'closed',
		)
	);
}

add_action( 'after_switch_theme', 'roji_members_ensure_coming_soon_page' );
add_action(
	'admin_init',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		roji_members_ensure_coming_soon_page();
	},
	30
);

add_shortcode(
	'roji_members_coming_soon',
	function () {
		ob_start();
		?>
		<div class="roji-members-soon">
			<div class="roji-members-soon__inner">
				<span class="roji-members-soon__pill">Members area</span>
				<h1>Coming soon.</h1>
				<p class="roji-members-soon__lede">Account dashboards, autoship management, and Certificate-of-Analysis downloads land here shortly. Until then, every order email carries your COA, tracking, and a direct support line.</p>
				<div class="roji-members-soon__actions">
					<a class="roji-members-soon__cta" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ?: home_url( '/shop/' ) ); ?>">Browse the shop</a>
					<a class="roji-members-soon__alt" href="<?php echo esc_url( defined( 'ROJI_TOOLS_URL' ) ? ROJI_TOOLS_URL : 'https://tools.rojipeptides.com' ); ?>">Explore research tools →</a>
				</div>
				<p class="roji-members-soon__support">Need a past order, COA, or address change in the meantime? Email <a href="mailto:<?php echo esc_attr( get_option( 'admin_email' ) ); ?>"><?php echo esc_html( get_option( 'admin_email' ) ); ?></a>.</p>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
);

/**
 * Register My Account endpoint (same pattern as update-payment in
 * subscriptions-customer-ui.php).
 */
add_action(
	'init',
	function () {
		add_rewrite_endpoint( ROJI_ACCOUNT_AFFILIATE_ENDPOINT, EP_ROOT | EP_PAGES );
	},
	8
);

/**
 * After theme switch: ensure My Account page + flush rewrites for new endpoints.
 */
add_action(
	'after_switch_theme',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		roji_members_ensure_my_account_page();
		update_option( 'roji_members_flush_rewrite_rules', '1' );
	}
);

add_action(
	'init',
	function () {
		if ( get_option( 'roji_members_flush_rewrite_rules' ) !== '1' ) {
			return;
		}
		flush_rewrite_rules( false );
		delete_option( 'roji_members_flush_rewrite_rules' );
	},
	999
);

/**
 * Existing installs: repair missing My Account page when a shop manager visits admin.
 */
add_action(
	'admin_init',
	function () {
		if ( ! class_exists( 'WooCommerce' ) || ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		$page_id = (int) wc_get_page_id( 'myaccount' );
		if ( $page_id > 0 && get_post_status( $page_id ) ) {
			return;
		}
		roji_members_ensure_my_account_page();
	},
	20
);

/**
 * Create or repair the WC My Account page if the option points nowhere.
 */
function roji_members_ensure_my_account_page() {
	if ( ! function_exists( 'wc_get_page_id' ) ) {
		return;
	}
	$page_id = (int) wc_get_page_id( 'myaccount' );
	if ( $page_id > 0 && get_post_status( $page_id ) ) {
		return;
	}
	$new_id = wp_insert_post(
		array(
			'post_status'    => 'publish',
			'post_type'      => 'page',
			'post_title'     => __( 'My account', 'woocommerce' ),
			'post_name'      => 'my-account',
			'post_content'   => '[woocommerce_my_account]',
			'comment_status' => 'closed',
		),
		true
	);
	if ( is_wp_error( $new_id ) || ! $new_id ) {
		return;
	}
	update_option( 'woocommerce_myaccount_page_id', (int) $new_id );
}

/**
 * Affiliate program inside My Account (mirrors standalone dashboard shortcode).
 */
add_filter(
	'woocommerce_account_menu_items',
	function ( $items ) {
		$logout_key   = 'customer-logout';
		$logout_label = $items[ $logout_key ] ?? '';
		unset( $items[ $logout_key ] );
		$items[ ROJI_ACCOUNT_AFFILIATE_ENDPOINT ] = __( 'Affiliate program', 'roji-child' );
		if ( $logout_label !== '' ) {
			$items[ $logout_key ] = $logout_label;
		}
		return $items;
	},
	60
);

add_action(
	'woocommerce_account_' . ROJI_ACCOUNT_AFFILIATE_ENDPOINT . '_endpoint',
	function () {
		echo do_shortcode( '[roji_affiliate_dashboard]' );
	}
);

/* The native dashboard greeting now lives in
 * woocommerce/myaccount/dashboard.php. We intentionally do NOT register
 * an additional `woocommerce_account_dashboard` widget here, to keep the
 * member area uncluttered. Plugins can still hook in. */
