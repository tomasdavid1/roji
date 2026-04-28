<?php
/**
 * Roji Elementor template importer.
 *
 * Run from the WP root with:
 *   wp eval-file /path/to/roji-store/elementor-templates/import.php
 *
 * Or with a single page slug to refresh just one:
 *   wp eval-file /path/to/import.php -- home
 *   wp eval-file /path/to/import.php -- terms,privacy,refunds
 *
 * Idempotent: pages are looked up by slug. Re-running updates content
 * without duplicating posts. Element ids are deterministic per (slug,
 * counter) so Elementor's compiled CSS doesn't get orphaned.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "Run via WP-CLI: wp eval-file " . __FILE__ . "\n";
	exit;
}
if ( ! did_action( 'elementor/loaded' ) ) {
	WP_CLI::error( 'Elementor is not active. Activate it first: wp plugin activate elementor' );
}

$base = __DIR__;
require_once $base . '/lib/builder.php';

// All known page definition files. Order matters: legal pages first so
// that Home/About/FAQ can link to them safely; then content pages; then
// Home which references everything.
$ALL_PAGES = array(
	// slug          => relative path
	'terms'                  => 'pages/legal/terms.php',
	'privacy'                => 'pages/legal/privacy.php',
	'refunds'                => 'pages/legal/refunds.php',
	'shipping'               => 'pages/legal/shipping.php',
	'about'                  => 'pages/about.php',
	'faq'                    => 'pages/faq.php',
	'research-library'       => 'pages/research-library.php',
	'coa'                    => 'pages/coa.php',
	'home'                   => 'pages/home.php',
);

// Optional CLI arg: comma-sep list of slugs to (re)build, otherwise all.
$args  = (array) ( $args ?? array() ); // wp-cli passes positional args as $args
$only  = ! empty( $args[0] ) ? array_filter( array_map( 'trim', explode( ',', $args[0] ) ) ) : array();

$pages_to_build = $only ? array_intersect_key( $ALL_PAGES, array_flip( $only ) ) : $ALL_PAGES;

if ( empty( $pages_to_build ) ) {
	WP_CLI::error( 'No matching pages. Available: ' . implode( ', ', array_keys( $ALL_PAGES ) ) );
}

WP_CLI::log( sprintf( 'Building %d page(s)...', count( $pages_to_build ) ) );

$summary = array();
foreach ( $pages_to_build as $slug => $rel ) {
	$file = $base . '/' . $rel;
	if ( ! file_exists( $file ) ) {
		WP_CLI::warning( "Missing definition: {$rel}" );
		continue;
	}

	// Each page file returns the args array that roji_el_save_dark_page() expects.
	// Reset the id-generation counter via runkit-free trick: each definition
	// file declares its own ROJI_EL_PAGE_KEY so md5 input differs per page.
	$args_arr = include $file;
	if ( ! is_array( $args_arr ) || empty( $args_arr['title'] ) ) {
		WP_CLI::warning( "Definition {$rel} did not return a valid args array." );
		continue;
	}
	$args_arr['slug'] = $slug;

	$post_id = roji_el_save_dark_page( $args_arr );
	if ( is_wp_error( $post_id ) ) {
		WP_CLI::warning( "[$slug] " . $post_id->get_error_message() );
		continue;
	}

	$permalink  = get_permalink( $post_id );
	$summary[]  = sprintf( '  ✓ /%s — #%d → %s', $slug, $post_id, $permalink );
	WP_CLI::log( "  Built {$slug} (#{$post_id})" );
}

WP_CLI::success( "Done. Imported pages:\n" . implode( "\n", $summary ) );

// After all pages exist, set up the front page if Home was built.
if ( isset( $pages_to_build['home'] ) ) {
	$home = get_page_by_path( 'home' );
	if ( $home ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $home->ID );
		WP_CLI::log( "Set Home as static front page." );
	}
}

// Trigger Elementor CSS regeneration globally so changes show immediately.
if ( class_exists( '\Elementor\Plugin' ) ) {
	\Elementor\Plugin::$instance->files_manager->clear_cache();
	WP_CLI::log( "Cleared Elementor file cache." );
}
