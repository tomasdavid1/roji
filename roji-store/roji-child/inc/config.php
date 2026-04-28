<?php
/**
 * Roji Child — centralized configuration constants.
 *
 * Single source of truth for IDs and credentials referenced across the
 * theme's includes. Edit values here after seeding products and obtaining
 * tracking / payment credentials.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * WooCommerce product IDs
 *
 * Defaults below match a fresh seed via `scripts/import-products.php` on a
 * clean WP install (where products start at ID 12). If your install assigned
 * different IDs, override them here OR rely on the SKU-based fallback in
 * roji_product_id_for_stack() below.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_WOLVERINE_PRODUCT_ID' ) ) {
	define( 'ROJI_WOLVERINE_PRODUCT_ID', 12 );
}
if ( ! defined( 'ROJI_RECOMP_PRODUCT_ID' ) ) {
	define( 'ROJI_RECOMP_PRODUCT_ID', 13 );
}
if ( ! defined( 'ROJI_FULL_PRODUCT_ID' ) ) {
	define( 'ROJI_FULL_PRODUCT_ID', 14 );
}

/* -----------------------------------------------------------------------------
 * Google Ads / Analytics
 *
 * AW-XXXXXXXXXX  — Google Ads account ID
 * G-XXXXXXXXXX   — GA4 measurement ID
 * CONVERSION_LABEL — per-conversion label string from Google Ads
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_GADS_ID' ) ) {
	define( 'ROJI_GADS_ID', '' );
}
if ( ! defined( 'ROJI_GADS_PURCHASE_LABEL' ) ) {
	define( 'ROJI_GADS_PURCHASE_LABEL', '' );
}
if ( ! defined( 'ROJI_GA4_ID' ) ) {
	define( 'ROJI_GA4_ID', '' );
}

/* -----------------------------------------------------------------------------
 * Brand / business
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_BRAND_NAME' ) ) {
	define( 'ROJI_BRAND_NAME', 'Roji Peptides' );
}
if ( ! defined( 'ROJI_BILLING_DESCRIPTOR' ) ) {
	define( 'ROJI_BILLING_DESCRIPTOR', 'ROJI RESEARCH' );
}
if ( ! defined( 'ROJI_FREE_SHIPPING_THRESHOLD' ) ) {
	define( 'ROJI_FREE_SHIPPING_THRESHOLD', 200 );
}
if ( ! defined( 'ROJI_AGE_REQUIREMENT' ) ) {
	define( 'ROJI_AGE_REQUIREMENT', 21 );
}

/* -----------------------------------------------------------------------------
 * Protocol engine URL
 *
 * Used for any in-store CTAs that link to the external protocol builder.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_PROTOCOL_URL' ) ) {
	define( 'ROJI_PROTOCOL_URL', 'https://protocol.rojipeptides.com' );
}

/**
 * Map a protocol_stack slug to a WooCommerce product ID.
 *
 * Tries the constants first (fast path), then falls back to a SKU lookup
 * if the constant points at a non-existent post — covers the case where
 * the install used different IDs than the defaults.
 *
 * @param string $slug Slug from the protocol engine (wolverine|recomp|full).
 * @return int Product ID, or 0 if unmapped.
 */
function roji_product_id_for_stack( $slug ) {
	static $map = null;
	if ( null === $map ) {
		$map = array(
			'wolverine' => array( ROJI_WOLVERINE_PRODUCT_ID, 'ROJI-WOLF-001' ),
			'recomp'    => array( ROJI_RECOMP_PRODUCT_ID, 'ROJI-RECOMP-001' ),
			'full'      => array( ROJI_FULL_PRODUCT_ID, 'ROJI-FULL-001' ),
		);
	}
	if ( ! isset( $map[ $slug ] ) ) {
		return 0;
	}
	list( $id, $sku ) = $map[ $slug ];
	if ( $id > 0 && get_post_status( $id ) === 'publish' ) {
		return (int) $id;
	}
	if ( function_exists( 'wc_get_product_id_by_sku' ) ) {
		$found = wc_get_product_id_by_sku( $sku );
		if ( $found > 0 ) {
			return (int) $found;
		}
	}
	return 0;
}
