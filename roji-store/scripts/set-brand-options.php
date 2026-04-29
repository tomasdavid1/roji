<?php
/**
 * Roji Peptides - WP-CLI script to pin brand-related wp_options.
 *
 * Some themes (OceanWP, Astra, etc.) bypass the bloginfo() filter
 * pipeline and print get_option('blogname') directly into the header
 * .site-title anchor. Rather than chase every theme variant, we set
 * the underlying option to 'roji' (lowercase) so every code path
 * that asks WordPress for the site name gets the wordmark by default.
 *
 * The browser-tab document title is owned separately by a
 * pre_get_document_title filter in roji-child/inc/branding.php so
 * SERPs / share previews still see the full 'Roji Peptides' brand.
 *
 * Usage from the WordPress root (locally or on Kinsta):
 *   wp eval-file scripts/set-brand-options.php
 *
 * Idempotent.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "This script must be run via WP-CLI: wp eval-file scripts/set-brand-options.php\n";
	exit( 1 );
}

$desired = array(
	'blogname'        => 'roji',
	'blogdescription' => '',

	// WooCommerce image sizes - these are read every loop render and
	// override add_theme_support('woocommerce', [...]). Pinning them
	// here means a Customizer change can never silently shrink the
	// shop tiles back down. 600x600 1:1 keeps our square packshots
	// crisp on retina displays.
	'woocommerce_thumbnail_image_width' => '600',
	'woocommerce_thumbnail_cropping'    => '1:1',
	'woocommerce_single_image_width'    => '1200',
);

$updated = 0;
$same    = 0;
foreach ( $desired as $key => $value ) {
	$current = get_option( $key );
	if ( $current === $value ) {
		++$same;
		continue;
	}
	update_option( $key, $value );
	WP_CLI::log( sprintf( '%s: %s -> %s', $key, var_export( $current, true ), var_export( $value, true ) ) );
	++$updated;
}

WP_CLI::success( sprintf( 'set-brand-options: %d updated, %d already-current', $updated, $same ) );
