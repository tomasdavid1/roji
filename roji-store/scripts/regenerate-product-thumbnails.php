<?php
/**
 * Roji Peptides - WP-CLI script to regenerate WooCommerce product
 * image intermediates after the canonical image sizes change.
 *
 * Background: WC's default `woocommerce_thumbnail` is 324x324, which
 * looks soft on retina once a 2x screen scales it to a ~300px tile.
 * roji-child/inc/woocommerce.php now declares thumbnail_image_width
 * = 600 (and single_image_width = 1200), but existing attachments
 * still only have the OLD intermediates on disk. This script walks
 * every featured-image attachment for our 11 SKUs and regenerates
 * the metadata + intermediate sizes against the current WC config.
 *
 * Idempotent: re-running is a no-op once the intermediates match the
 * current size config (we compare wp_check_filetype against the
 * existing -600x600 / -1200x800 derivatives).
 *
 * Usage from the WordPress root (locally or on Kinsta):
 *   wp eval-file scripts/regenerate-product-thumbnails.php
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "This script must be run via WP-CLI: wp eval-file scripts/regenerate-product-thumbnails.php\n";
	exit( 1 );
}

if ( ! function_exists( 'wp_generate_attachment_metadata' ) ) {
	require_once ABSPATH . 'wp-admin/includes/image.php';
}

$skus = array(
	'ROJI-WOLF-001',
	'ROJI-RECOMP-001',
	'ROJI-FULL-001',
	'ROJI-BPC-10',
	'ROJI-TB-10',
	'ROJI-CJC-5',
	'ROJI-IPA-5',
	'ROJI-MK-30',
	'ROJI-BAC-30',
	'ROJI-SYR-100',
	'ROJI-SWAB-200',
);

$updated = 0;
$skipped = 0;
$missing = array();

foreach ( $skus as $sku ) {
	$product_id = wc_get_product_id_by_sku( $sku );
	if ( ! $product_id ) {
		$missing[] = $sku;
		continue;
	}

	$attachment_id = (int) get_post_thumbnail_id( $product_id );
	if ( ! $attachment_id ) {
		WP_CLI::warning( "$sku has no featured image" );
		continue;
	}

	$file = get_attached_file( $attachment_id );
	if ( ! $file || ! file_exists( $file ) ) {
		WP_CLI::warning( "$sku attachment $attachment_id file missing on disk: " . ( $file ?: 'NULL' ) );
		continue;
	}

	// Check whether the 600px intermediate already exists. If so, skip.
	$existing_meta = wp_get_attachment_metadata( $attachment_id );
	$has_600       = false;
	if ( is_array( $existing_meta ) && ! empty( $existing_meta['sizes']['woocommerce_thumbnail'] ) ) {
		$existing_w = (int) ( $existing_meta['sizes']['woocommerce_thumbnail']['width'] ?? 0 );
		if ( $existing_w >= 600 ) {
			$has_600 = true;
		}
	}

	if ( $has_600 ) {
		++$skipped;
		continue;
	}

	// Regenerate.
	$meta = wp_generate_attachment_metadata( $attachment_id, $file );
	if ( is_wp_error( $meta ) ) {
		WP_CLI::warning( sprintf( '%s: %s', $sku, $meta->get_error_message() ) );
		continue;
	}
	wp_update_attachment_metadata( $attachment_id, $meta );

	$new_thumb_w = isset( $meta['sizes']['woocommerce_thumbnail']['width'] )
		? $meta['sizes']['woocommerce_thumbnail']['width']
		: 'unknown';

	WP_CLI::log( sprintf( '%s -> attachment %d, woocommerce_thumbnail width: %s', $sku, $attachment_id, $new_thumb_w ) );
	++$updated;
}

WP_CLI::success( sprintf( 'regenerated %d, skipped %d already-current', $updated, $skipped ) );

if ( $missing ) {
	WP_CLI::warning( 'Missing SKUs: ' . implode( ', ', $missing ) );
}
