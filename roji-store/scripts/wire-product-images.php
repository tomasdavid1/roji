<?php
/**
 * Roji Peptides - WP-CLI script to attach product packshots as featured images.
 *
 * Usage from the WordPress root (locally or on Kinsta):
 *   wp eval-file scripts/wire-product-images.php
 *
 * Idempotent: looks up each product by SKU, sideloads the matching PNG from
 * roji-child/assets/products/<slug>.png if and only if the current featured
 * image filename does not already match. Safe to run repeatedly.
 *
 * Requires the assets to have been deployed alongside the child theme to
 *   wp-content/themes/roji-child/assets/products/<slug>.png
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "This script must be run via WP-CLI: wp eval-file scripts/wire-product-images.php\n";
	exit( 1 );
}

if ( ! function_exists( 'media_handle_sideload' ) ) {
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
}

$map = array(
	'ROJI-WOLF-001'   => 'wolverine-stack.png',
	'ROJI-RECOMP-001' => 'recomp-stack.png',
	'ROJI-FULL-001'   => 'full-protocol.png',
	'ROJI-BPC-10'     => 'bpc-157-10mg.png',
	'ROJI-TB-10'      => 'tb-500-10mg.png',
	'ROJI-CJC-5'      => 'cjc-1295-dac-5mg.png',
	'ROJI-IPA-5'      => 'ipamorelin-5mg.png',
	'ROJI-MK-30'      => 'mk-677-30caps.png',
	'ROJI-BAC-30'     => 'bacteriostatic-water-30ml.png',
	'ROJI-SYR-100'    => 'insulin-syringes-100pk.png',
	'ROJI-SWAB-200'   => 'alcohol-swabs-200pk.png',
);

$assets_dir = get_stylesheet_directory() . '/assets/products';

if ( ! is_dir( $assets_dir ) ) {
	WP_CLI::error( "Assets directory not found: $assets_dir" );
}

$updated = 0;
$skipped = 0;
$missing = array();

foreach ( $map as $sku => $filename ) {
	$file = $assets_dir . '/' . $filename;

	if ( ! file_exists( $file ) ) {
		$missing[] = $filename;
		continue;
	}

	$product_id = wc_get_product_id_by_sku( $sku );
	if ( ! $product_id ) {
		WP_CLI::warning( "No product for SKU $sku, skipping" );
		continue;
	}

	$current_thumb_id = (int) get_post_thumbnail_id( $product_id );
	if ( $current_thumb_id ) {
		$current_path = get_attached_file( $current_thumb_id );
		if ( $current_path && basename( $current_path ) === $filename ) {
			++$skipped;
			continue;
		}
	}

	$tmp = wp_tempnam( $filename );
	if ( ! $tmp ) {
		WP_CLI::warning( "wp_tempnam failed for $filename" );
		continue;
	}
	if ( ! @copy( $file, $tmp ) ) {
		@unlink( $tmp );
		WP_CLI::warning( "copy failed: $file -> $tmp" );
		continue;
	}

	$file_array = array(
		'name'     => $filename,
		'tmp_name' => $tmp,
	);

	$attachment_id = media_handle_sideload( $file_array, $product_id );
	if ( is_wp_error( $attachment_id ) ) {
		@unlink( $tmp );
		WP_CLI::warning( sprintf( '%s: %s', $sku, $attachment_id->get_error_message() ) );
		continue;
	}

	set_post_thumbnail( $product_id, $attachment_id );
	wp_update_post(
		array(
			'ID'         => $attachment_id,
			'post_title' => sprintf( 'Roji %s product photo', $sku ),
		)
	);
	update_post_meta( $attachment_id, '_wp_attachment_image_alt', sprintf( 'Roji Peptides %s vial and box', $sku ) );

	++$updated;
	WP_CLI::log( sprintf( '%s -> attachment %d (%s)', $sku, $attachment_id, $filename ) );
}

WP_CLI::success( sprintf( 'Wired %d images, skipped %d already-current', $updated, $skipped ) );

if ( $missing ) {
	WP_CLI::warning( 'Missing files: ' . implode( ', ', $missing ) );
}
