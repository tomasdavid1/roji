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
// Optional Google Ads conversion label for the protocol-engine →
// add-to-cart transition. Leave empty to fire only the GA4 event.
if ( ! defined( 'ROJI_GADS_ADD_TO_CART_LABEL' ) ) {
	define( 'ROJI_GADS_ADD_TO_CART_LABEL', '' );
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

/* -----------------------------------------------------------------------------
 * Trustpilot
 *
 * Wired up but inert until the four secrets are supplied via wp-config.php
 * or the environment. To populate them, add to wp-config.php (preferred):
 *
 *     define( 'ROJI_TRUSTPILOT_BUSINESS_UNIT_ID', 'xxxxxxxxxxxxxxxxxxxxxxxx' );
 *     define( 'ROJI_TRUSTPILOT_API_KEY',          'xxxxxxxxxxxxxxxxxxxxxxxx' );
 *     define( 'ROJI_TRUSTPILOT_API_SECRET',       'xxxxxxxxxxxxxxxxxxxxxxxx' );
 *     define( 'ROJI_TRUSTPILOT_BUSINESS_USER_ID', 'xxxxxxxxxxxxxxxxxxxxxxxx' );
 *
 * Business Unit ID is public (it appears in widget HTML). The other three
 * are server-side secrets used by the AFS invitation API. Never commit them.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_TRUSTPILOT_BUSINESS_UNIT_ID' ) ) {
	define( 'ROJI_TRUSTPILOT_BUSINESS_UNIT_ID', '' );
}
if ( ! defined( 'ROJI_TRUSTPILOT_API_KEY' ) ) {
	define( 'ROJI_TRUSTPILOT_API_KEY', '' );
}
if ( ! defined( 'ROJI_TRUSTPILOT_API_SECRET' ) ) {
	define( 'ROJI_TRUSTPILOT_API_SECRET', '' );
}
// User ID is required as the `x-business-user-id` header when authenticating
// via client_credentials (per Trustpilot OAuth docs). Find it in your
// Trustpilot Business app's user profile page.
if ( ! defined( 'ROJI_TRUSTPILOT_BUSINESS_USER_ID' ) ) {
	define( 'ROJI_TRUSTPILOT_BUSINESS_USER_ID', '' );
}
// Domain Trustpilot reviews are tied to. Used as the `referenceId` host
// segment and as a sanity check.
if ( ! defined( 'ROJI_TRUSTPILOT_DOMAIN' ) ) {
	define( 'ROJI_TRUSTPILOT_DOMAIN', 'rojipeptides.com' );
}
// Locale + sender for invitation emails.
if ( ! defined( 'ROJI_TRUSTPILOT_LOCALE' ) ) {
	define( 'ROJI_TRUSTPILOT_LOCALE', 'en-US' );
}
if ( ! defined( 'ROJI_TRUSTPILOT_SENDER_NAME' ) ) {
	define( 'ROJI_TRUSTPILOT_SENDER_NAME', ROJI_BRAND_NAME );
}
// Optional: a custom invitation template ID created in Trustpilot Business.
// If empty, Trustpilot uses your default AFS template.
if ( ! defined( 'ROJI_TRUSTPILOT_TEMPLATE_ID' ) ) {
	define( 'ROJI_TRUSTPILOT_TEMPLATE_ID', '' );
}
// Days to wait between order completion and the invitation email being sent.
// 7 days is the Trustpilot default and gives time for the package to arrive.
if ( ! defined( 'ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS' ) ) {
	define( 'ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS', 7 );
}

/**
 * True when all required Trustpilot secrets are present (so we can short-circuit
 * widget rendering / AFS calls without wiring complex feature flags).
 */
function roji_trustpilot_enabled() {
	return ROJI_TRUSTPILOT_BUSINESS_UNIT_ID !== ''
		&& ROJI_TRUSTPILOT_API_KEY !== ''
		&& ROJI_TRUSTPILOT_API_SECRET !== ''
		&& ROJI_TRUSTPILOT_BUSINESS_USER_ID !== '';
}

/**
 * True when the public Business Unit ID is set — enough to render TrustBox
 * widgets even if AFS isn't configured.
 */
function roji_trustpilot_widgets_enabled() {
	return ROJI_TRUSTPILOT_BUSINESS_UNIT_ID !== '';
}

/* -----------------------------------------------------------------------------
 * Subscriptions / Autoship
 *
 * Plugin-agnostic config consumed by inc/subscriptions.php. Currently wired
 * to the free 'Subscriptions for WooCommerce' (WP Swings) plugin via meta
 * keys; the same layer can be repointed at the paid WC Subscriptions plugin
 * by changing roji_subs_provider() return value.
 *
 *  - DISCOUNT_PCT: percent off when customer chooses autoship vs one-time.
 *    15% is the industry default for monthly recurring (Quince, Athletic
 *    Greens, etc.) and gives enough margin headroom for free shipping.
 *  - INTERVAL: months between renewals. Peptide cycles are typically
 *    8-12 weeks, so monthly = 1 cycle every renewal which matches dosing.
 *  - DUNNING_RETRIES + delays: standard 3-attempt dunning ladder.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_SUBS_DISCOUNT_PCT' ) ) {
	define( 'ROJI_SUBS_DISCOUNT_PCT', 15 );
}
if ( ! defined( 'ROJI_SUBS_INTERVAL_NUMBER' ) ) {
	define( 'ROJI_SUBS_INTERVAL_NUMBER', 1 );
}
if ( ! defined( 'ROJI_SUBS_INTERVAL_UNIT' ) ) {
	define( 'ROJI_SUBS_INTERVAL_UNIT', 'month' ); // day | week | month | year
}
if ( ! defined( 'ROJI_SUBS_FREE_SHIPPING' ) ) {
	define( 'ROJI_SUBS_FREE_SHIPPING', true );
}
// Days to retry a failed renewal payment, in order. After the last entry,
// the subscription moves to on-hold and the customer is asked to update
// payment method.
if ( ! defined( 'ROJI_SUBS_DUNNING_DELAYS' ) ) {
	define( 'ROJI_SUBS_DUNNING_DELAYS', '1,3,7' );
}

/**
 * Returns 'wps_sfw' (free WP Swings plugin) or 'woocommerce_subscriptions'
 * (paid Automattic plugin), depending on what's installed. The subscriptions
 * helper layer reads this to dispatch the correct meta keys / API.
 */
function roji_subs_provider() {
	if ( defined( 'WCS_INIT_TIMESTAMP' ) ) {
		return 'woocommerce_subscriptions';
	}
	if ( defined( 'SUBSCRIPTIONS_FOR_WOOCOMMERCE_VERSION' ) ) {
		return 'wps_sfw';
	}
	return 'none';
}

/**
 * True when any subscription plugin is active.
 */
function roji_subs_enabled() {
	return roji_subs_provider() !== 'none';
}

/* -----------------------------------------------------------------------------
 * Affiliate program (native — no plugin dependency)
 *
 * Why native instead of wrapping AffiliateWP or one of the free plugins:
 *   - AffiliateWP uses its own custom tables (no overlap with WP standards
 *     to "be compatible with"). So abstracting against it has zero benefit.
 *   - Free plugins (Affiliates by Itthinx, YITH) bring large admin UIs
 *     and MLM features we don't want.
 *   - Our scope is small: ?ref=CODE cookie, commission calc on order
 *     completion, signup form, custom post type. ~250 LOC total.
 *   - When/if you outgrow this, we export to AffiliateWP via a one-shot
 *     CSV — much cleaner than a maintained shim.
 *
 * Tiered commissions reward proven affiliates without burning margin on
 * day-one signups. Thresholds are LIFETIME GROSS VOLUME (the affiliate's
 * cumulative referred-order subtotals).
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_AFF_TIER_DEFAULT_PCT' ) ) {
	define( 'ROJI_AFF_TIER_DEFAULT_PCT', 10 );
}
if ( ! defined( 'ROJI_AFF_TIER_2_THRESHOLD' ) ) {
	define( 'ROJI_AFF_TIER_2_THRESHOLD', 10000 ); // USD lifetime gross
}
if ( ! defined( 'ROJI_AFF_TIER_2_PCT' ) ) {
	define( 'ROJI_AFF_TIER_2_PCT', 15 );
}
if ( ! defined( 'ROJI_AFF_TIER_3_THRESHOLD' ) ) {
	define( 'ROJI_AFF_TIER_3_THRESHOLD', 50000 );
}
if ( ! defined( 'ROJI_AFF_TIER_3_PCT' ) ) {
	define( 'ROJI_AFF_TIER_3_PCT', 20 );
}
// Cookie window: how many days after a click can the customer convert and
// still credit the affiliate. 30d is the AffiliateWP / industry default.
if ( ! defined( 'ROJI_AFF_COOKIE_DAYS' ) ) {
	define( 'ROJI_AFF_COOKIE_DAYS', 30 );
}
// "Locked" period before commissions are payable: lets us wait out
// chargeback / refund risk before a payout obligation crystallizes.
// 30d is standard for D2C supplements.
if ( ! defined( 'ROJI_AFF_LOCK_DAYS' ) ) {
	define( 'ROJI_AFF_LOCK_DAYS', 30 );
}
// Commissions from autoship renewals: full first payment, half on
// subsequent renewals. This is the SaaS-style model that keeps
// affiliates incentivized for retention without breaking unit economics.
if ( ! defined( 'ROJI_AFF_RENEWAL_PCT_OF_TIER' ) ) {
	define( 'ROJI_AFF_RENEWAL_PCT_OF_TIER', 50 ); // 50% of tier rate
}

/**
 * Resolve the commission % an affiliate should earn given their lifetime
 * gross volume. Pure function — easy to unit test.
 *
 * @param float $lifetime_gross_usd Sum of referred-order subtotals.
 * @return int Commission percent (10, 15, or 20).
 */
function roji_aff_tier_pct_for_volume( $lifetime_gross_usd ) {
	if ( $lifetime_gross_usd >= ROJI_AFF_TIER_3_THRESHOLD ) {
		return (int) ROJI_AFF_TIER_3_PCT;
	}
	if ( $lifetime_gross_usd >= ROJI_AFF_TIER_2_THRESHOLD ) {
		return (int) ROJI_AFF_TIER_2_PCT;
	}
	return (int) ROJI_AFF_TIER_DEFAULT_PCT;
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
		return (int) apply_filters( 'roji_product_id_for_stack', (int) $id, $slug );
	}
	if ( function_exists( 'wc_get_product_id_by_sku' ) ) {
		$found = wc_get_product_id_by_sku( $sku );
		if ( $found > 0 ) {
			return (int) apply_filters( 'roji_product_id_for_stack', (int) $found, $slug );
		}
	}
	return 0;
}
