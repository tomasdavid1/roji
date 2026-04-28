<?php
/**
 * Roji menu provisioning. Creates the primary header + footer menus and
 * assigns them to Hello Elementor's `menu-1` and `menu-2` locations.
 *
 * Run with:
 *   wp eval-file /path/to/elementor-templates/menus.php
 *
 * Idempotent: looks up by slug, replaces items in place.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "Run via WP-CLI: wp eval-file " . __FILE__ . "\n";
	return;
}

/**
 * @param string $name      Menu display name.
 * @param string $slug      Menu slug (idempotency key).
 * @param string $location  Theme nav location.
 * @param array  $items     Each: ['title' => str, 'url' => str].
 */
function roji_provision_menu( $name, $slug, $location, array $items ) {
	$menu = wp_get_nav_menu_object( $slug );
	if ( $menu ) {
		// Wipe existing items so we can rewrite cleanly.
		$existing = wp_get_nav_menu_items( $menu->term_id );
		foreach ( (array) $existing as $it ) {
			wp_delete_post( $it->ID, true );
		}
		$menu_id = $menu->term_id;
	} else {
		$menu_id = wp_create_nav_menu( $name );
		if ( is_wp_error( $menu_id ) ) {
			WP_CLI::warning( "[$slug] " . $menu_id->get_error_message() );
			return;
		}
		// Force the slug.
		wp_update_nav_menu_object( $menu_id, array( 'menu-name' => $name, 'description' => '' ) );
		$term = get_term( $menu_id, 'nav_menu' );
		if ( $term && $term->slug !== $slug ) {
			wp_update_term( $menu_id, 'nav_menu', array( 'slug' => $slug ) );
		}
	}

	foreach ( $items as $i => $item ) {
		// Try to resolve relative URLs to a known page so the link survives
		// site URL changes in production.
		$args = array(
			'menu-item-title'   => $item['title'],
			'menu-item-url'     => $item['url'],
			'menu-item-status'  => 'publish',
			'menu-item-position'=> $i + 1,
		);

		$slug_match = ltrim( parse_url( $item['url'], PHP_URL_PATH ) ?? '', '/' );
		$slug_match = rtrim( $slug_match, '/' );
		if ( $slug_match && false === strpos( $item['url'], '://' ) ) {
			$page = get_page_by_path( $slug_match );
			if ( $page ) {
				$args = array(
					'menu-item-title'     => $item['title'],
					'menu-item-object'    => 'page',
					'menu-item-object-id' => $page->ID,
					'menu-item-type'      => 'post_type',
					'menu-item-status'    => 'publish',
					'menu-item-position'  => $i + 1,
				);
			}
		}

		wp_update_nav_menu_item( $menu_id, 0, $args );
	}

	// Assign to theme location.
	$locations = (array) get_theme_mod( 'nav_menu_locations' );
	$locations[ $location ] = $menu_id;
	set_theme_mod( 'nav_menu_locations', $locations );

	WP_CLI::log( "  ✓ {$name} (slug={$slug}, " . count( $items ) . " items, location={$location})" );
}

WP_CLI::log( "Provisioning Roji menus..." );

roji_provision_menu( 'Roji Header', 'roji-header', 'menu-1', array(
	array( 'title' => 'Shop',             'url' => '/shop/' ),
	array( 'title' => 'Research Tools',   'url' => 'https://tools.rojipeptides.com' ),
	array( 'title' => 'Research Library', 'url' => '/research-library/' ),
	array( 'title' => 'COA',              'url' => '/coa/' ),
	array( 'title' => 'About',            'url' => '/about/' ),
	array( 'title' => 'FAQ',              'url' => '/faq/' ),
) );

roji_provision_menu( 'Roji Footer', 'roji-footer', 'menu-2', array(
	array( 'title' => 'Shop',                  'url' => '/shop/' ),
	array( 'title' => 'About',                 'url' => '/about/' ),
	array( 'title' => 'Research Tools',        'url' => 'https://tools.rojipeptides.com' ),
	array( 'title' => 'Research Library',      'url' => '/research-library/' ),
	array( 'title' => 'COA Library',           'url' => '/coa/' ),
	array( 'title' => 'FAQ',                   'url' => '/faq/' ),
	array( 'title' => 'Become an Affiliate',   'url' => '/become-an-affiliate/' ),
	array( 'title' => 'Shipping Policy',       'url' => '/shipping/' ),
	array( 'title' => 'Refund Policy',         'url' => '/refunds/' ),
	array( 'title' => 'Privacy Policy',        'url' => '/privacy/' ),
	array( 'title' => 'Terms of Service',      'url' => '/terms/' ),
) );

WP_CLI::success( 'Menus provisioned.' );
