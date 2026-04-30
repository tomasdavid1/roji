<?php
/**
 * Roji Child — Merchant-listings structured data (Product / Offer / Shipping / Returns).
 *
 * Why this file exists:
 *   Google Search Console flagged three non-critical merchant-listing issues
 *   on rojipeptides.com — missing `hasMerchantReturnPolicy`, missing
 *   `shippingDetails`, and missing brand/global identifier. Yoast (and
 *   most plugins, unless WooCommerce SEO is in play) does not emit those
 *   nested nodes. We add them ourselves on product pages so Google has
 *   the full picture for free Shopping listings + rich SERP treatment.
 *
 *   We deliberately DO NOT emit `review` / `aggregateRating`. Google
 *   has been deindexing self-fed review markup since 2019 and stuffing
 *   fake ratings risks a manual action. Trustpilot's widget injects
 *   verified `aggregateRating` once enough genuine reviews exist (see
 *   inc/trustpilot-widgets.php / inc/trustpilot-afs.php), at which point
 *   the GSC warning silences itself.
 *
 * Output:
 *   A single <script type="application/ld+json"> block on each product
 *   page with a `@graph` containing:
 *     - Product: name, description, image, sku, mpn, brand
 *     - Offer:   price, priceCurrency, availability, itemCondition,
 *                priceValidUntil, url, hasMerchantReturnPolicy,
 *                shippingDetails (per-region)
 *
 *   The product/offer node is keyed off the canonical product URL so
 *   Google can dedupe across markup we emit and any markup Yoast emits.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * Config — edit here if shipping/returns policy changes.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_RETURN_WINDOW_DAYS' ) ) {
	define( 'ROJI_RETURN_WINDOW_DAYS', 30 );
}
if ( ! defined( 'ROJI_SHIPPING_FLAT_RATE' ) ) {
	define( 'ROJI_SHIPPING_FLAT_RATE', 9.99 );
}
if ( ! defined( 'ROJI_SHIPPING_HANDLING_DAYS_MIN' ) ) {
	define( 'ROJI_SHIPPING_HANDLING_DAYS_MIN', 1 );
}
if ( ! defined( 'ROJI_SHIPPING_HANDLING_DAYS_MAX' ) ) {
	define( 'ROJI_SHIPPING_HANDLING_DAYS_MAX', 2 );
}
if ( ! defined( 'ROJI_SHIPPING_TRANSIT_DAYS_MIN' ) ) {
	define( 'ROJI_SHIPPING_TRANSIT_DAYS_MIN', 2 );
}
if ( ! defined( 'ROJI_SHIPPING_TRANSIT_DAYS_MAX' ) ) {
	define( 'ROJI_SHIPPING_TRANSIT_DAYS_MAX', 5 );
}

/**
 * Currency for offers. Falls back to USD because we're US-only today.
 */
function roji_seo_currency() {
	if ( function_exists( 'get_woocommerce_currency' ) ) {
		$c = (string) get_woocommerce_currency();
		if ( $c !== '' ) {
			return $c;
		}
	}
	return 'USD';
}

/**
 * Permalink for the returns / shipping policy pages (auto-provisioned below).
 */
function roji_seo_policy_url( $kind ) {
	$slug = $kind === 'shipping' ? 'shipping-policy' : 'return-policy';
	$page = get_page_by_path( $slug );
	if ( $page ) {
		return get_permalink( $page );
	}
	return home_url( '/' . $slug . '/' );
}

/**
 * Build the OfferShippingDetails node(s).
 *
 * We split into two tiers when a free-shipping threshold is configured
 * (free over threshold; flat rate under) so Google can render the
 * "Free shipping over $200" annotation accurately. If no threshold is
 * set, we collapse to a single flat-rate node.
 *
 * @return array<int, array<string, mixed>>
 */
function roji_seo_shipping_details() {
	$currency  = roji_seo_currency();
	$delivery  = array(
		'@type'              => 'ShippingDeliveryTime',
		'handlingTime'       => array(
			'@type'    => 'QuantitativeValue',
			'minValue' => (int) ROJI_SHIPPING_HANDLING_DAYS_MIN,
			'maxValue' => (int) ROJI_SHIPPING_HANDLING_DAYS_MAX,
			'unitCode' => 'DAY',
		),
		'transitTime'        => array(
			'@type'    => 'QuantitativeValue',
			'minValue' => (int) ROJI_SHIPPING_TRANSIT_DAYS_MIN,
			'maxValue' => (int) ROJI_SHIPPING_TRANSIT_DAYS_MAX,
			'unitCode' => 'DAY',
		),
		'cutoffTime'         => '15:00:00-05:00',
		'businessDays'       => array(
			'@type'      => 'OpeningHoursSpecification',
			'dayOfWeek'  => array( 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday' ),
		),
	);

	$destination = array(
		'@type'            => 'DefinedRegion',
		'addressCountry'   => 'US',
	);

	$threshold = defined( 'ROJI_FREE_SHIPPING_THRESHOLD' ) ? (float) ROJI_FREE_SHIPPING_THRESHOLD : 0.0;

	$nodes = array();

	if ( $threshold > 0 ) {
		// Free shipping when order subtotal >= threshold.
		$nodes[] = array(
			'@type'                 => 'OfferShippingDetails',
			'shippingRate'          => array(
				'@type'    => 'MonetaryAmount',
				'value'    => 0,
				'currency' => $currency,
			),
			'shippingDestination'   => $destination,
			'eligibleTransactionVolume' => array(
				'@type'         => 'PriceSpecification',
				'minPrice'      => $threshold,
				'priceCurrency' => $currency,
			),
			'deliveryTime'          => $delivery,
		);
	}

	// Flat-rate fallback (or sole node if no threshold).
	$nodes[] = array(
		'@type'               => 'OfferShippingDetails',
		'shippingRate'        => array(
			'@type'    => 'MonetaryAmount',
			'value'    => (float) ROJI_SHIPPING_FLAT_RATE,
			'currency' => $currency,
		),
		'shippingDestination' => $destination,
		'deliveryTime'        => $delivery,
	);

	return $nodes;
}

/**
 * Build the MerchantReturnPolicy node.
 *
 * Mirrors industry-standard research-peptide returns policy:
 *   - 30-day money-back window from delivery
 *   - No physical return required (sealed/regulated product)
 *   - Refund = full purchase price, original payment method
 *
 * @return array<string, mixed>
 */
function roji_seo_return_policy() {
	return array(
		'@type'                       => 'MerchantReturnPolicy',
		'applicableCountry'           => 'US',
		'returnPolicyCategory'        => 'https://schema.org/MerchantReturnFiniteReturnWindow',
		'merchantReturnDays'          => (int) ROJI_RETURN_WINDOW_DAYS,
		'returnMethod'                => 'https://schema.org/ReturnByMail',
		'returnFees'                  => 'https://schema.org/FreeReturn',
		'merchantReturnLink'          => roji_seo_policy_url( 'return' ),
	);
}

/**
 * Build the Product + Offer JSON-LD graph for the current product page.
 *
 * @param WC_Product $product Current product.
 * @return array<string, mixed>|null
 */
function roji_seo_product_graph( $product ) {
	if ( ! $product instanceof WC_Product ) {
		return null;
	}

	$canonical = get_permalink( $product->get_id() );
	$image_id  = $product->get_image_id();
	$image_url = $image_id ? wp_get_attachment_url( $image_id ) : '';

	// Pricing — use sale_price when on sale, else regular_price; fall back to get_price().
	$price = (float) wc_get_price_to_display( $product );
	if ( $price <= 0 ) {
		$price = (float) $product->get_price();
	}

	$availability = $product->is_in_stock()
		? 'https://schema.org/InStock'
		: 'https://schema.org/OutOfStock';

	// SKU doubles as MPN for our catalog (peptides have no GS1-issued GTIN).
	// Per Google's docs, brand + mpn is a valid identifier pair without GTIN.
	$sku  = (string) $product->get_sku();
	$mpn  = $sku !== '' ? $sku : (string) $product->get_id();

	// priceValidUntil — 1 year out so Google doesn't flag the offer as stale.
	$valid_until = gmdate( 'Y-m-d', time() + YEAR_IN_SECONDS );

	$description = wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() );
	$description = preg_replace( '/\s+/', ' ', (string) $description );
	$description = trim( $description );
	if ( $description === '' ) {
		$description = sprintf(
			'%s — research-grade peptide from %s. Third-party COA, ≥99%% HPLC purity, batch-tested, US-only shipping.',
			$product->get_name(),
			defined( 'ROJI_BRAND_NAME' ) ? ROJI_BRAND_NAME : 'Roji Peptides'
		);
	}

	$offer = array(
		'@type'                  => 'Offer',
		'url'                    => $canonical,
		'price'                  => number_format( $price, 2, '.', '' ),
		'priceCurrency'          => roji_seo_currency(),
		'priceValidUntil'        => $valid_until,
		'availability'           => $availability,
		'itemCondition'          => 'https://schema.org/NewCondition',
		'hasMerchantReturnPolicy'=> roji_seo_return_policy(),
		'shippingDetails'        => roji_seo_shipping_details(),
	);

	$product_node = array(
		'@type'       => 'Product',
		'@id'         => $canonical . '#product',
		'name'        => $product->get_name(),
		'description' => $description,
		'sku'         => $sku !== '' ? $sku : null,
		'mpn'         => $mpn,
		'brand'       => array(
			'@type' => 'Brand',
			'name'  => defined( 'ROJI_BRAND_NAME' ) ? ROJI_BRAND_NAME : 'Roji Peptides',
		),
		'offers'      => $offer,
	);
	if ( $image_url ) {
		$product_node['image'] = $image_url;
	}
	// Drop nullables.
	$product_node = array_filter( $product_node, function ( $v ) {
		return $v !== null && $v !== '';
	} );

	return array(
		'@context' => 'https://schema.org',
		'@graph'   => array( $product_node ),
	);
}

/**
 * Emit the structured-data block in <head> on product pages.
 *
 * Yoast-compatibility note: Yoast (without WooCommerce SEO) does not
 * emit Product/Offer markup. Yoast's WooCommerce SEO add-on does, but
 * still misses shippingDetails + hasMerchantReturnPolicy in default
 * configurations. Emitting our own block is therefore additive — Google
 * merges multiple blocks and uses the @id to dedupe.
 */
add_action(
	'wp_head',
	function () {
		if ( ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}
		$pid     = get_queried_object_id();
		$product = $pid ? wc_get_product( $pid ) : null;
		if ( ! $product ) {
			return;
		}
		$graph = roji_seo_product_graph( $product );
		if ( ! $graph ) {
			return;
		}
		$json = wp_json_encode( $graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		if ( ! is_string( $json ) ) {
			return;
		}
		echo "\n<script type=\"application/ld+json\" data-roji-merchant>\n" . $json . "\n</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	},
	30
);

/* -----------------------------------------------------------------------------
 * Auto-provision /shipping-policy and /return-policy pages on theme switch
 * (and lazily for shop-managers who hit admin) so the URLs we point Google
 * at actually resolve.
 * -------------------------------------------------------------------------- */

function roji_seo_ensure_policy_pages() {
	$brand     = defined( 'ROJI_BRAND_NAME' ) ? ROJI_BRAND_NAME : 'Roji Peptides';
	$threshold = defined( 'ROJI_FREE_SHIPPING_THRESHOLD' ) ? (int) ROJI_FREE_SHIPPING_THRESHOLD : 0;
	$flat      = number_format( (float) ROJI_SHIPPING_FLAT_RATE, 2, '.', '' );

	$pages = array(
		'shipping-policy' => array(
			'title'   => 'Shipping Policy',
			'content' => trim(
				"<h2>Shipping Policy</h2>\n"
				. "<p><strong>Where we ship.</strong> {$brand} ships within the United States only.</p>\n"
				. "<p><strong>Processing.</strong> Orders are typically processed within 1–2 business days (excluding weekends and US holidays). Once shipped, you will receive a confirmation email with tracking.</p>\n"
				. "<p><strong>Delivery times.</strong> Standard shipping arrives in 2–5 business days from dispatch. Expedited and overnight options are offered at checkout where available.</p>\n"
				. ( $threshold > 0
					? "<p><strong>Rates.</strong> Standard shipping is a flat \${$flat}. Orders subtotaling \${$threshold} or more ship free.</p>\n"
					: "<p><strong>Rates.</strong> Standard shipping is a flat \${$flat}.</p>\n" )
				. "<p><strong>Address accuracy.</strong> Customers are responsible for providing a correct shipping address. Re-shipping costs apply if a package is returned to us due to an incorrect or incomplete address.</p>\n"
				. "<p><strong>Lost or stolen packages.</strong> {$brand} is not responsible for packages marked delivered by the carrier or for prolonged carrier delays. We will assist with carrier claims wherever possible.</p>\n"
			),
		),
		'return-policy' => array(
			'title'   => 'Return & Refund Policy',
			'content' => trim(
				"<h2>Return &amp; Refund Policy</h2>\n"
				. "<p><strong>30-day money-back guarantee.</strong> {$brand} offers a 30-day money-back guarantee from the date of delivery. To request a refund, email <a href=\"mailto:" . esc_attr( get_option( 'admin_email' ) ) . "\">" . esc_html( get_option( 'admin_email' ) ) . "</a> with your order number and the reason for your request.</p>\n"
				. "<p><strong>Returns are not required.</strong> Because our products are sold for laboratory research use only, no physical return is required to be eligible for a refund.</p>\n"
				. "<p><strong>If something is wrong on our end.</strong> If your order arrives damaged, defective, or with the wrong item, contact us within 48 hours of delivery with your order number and photos of the product and outer packaging. Refunds and replacements for our errors are processed without question.</p>\n"
				. "<p><strong>How refunds are issued.</strong> Approved refunds are returned to the original payment method. Depending on your bank, it may take up to 10 business days for the refund to appear on your statement.</p>\n"
				. "<p><strong>Research-use only.</strong> All products are sold strictly for laboratory and research use. Any indication of personal use voids refund eligibility, and {$brand} reserves the right to suspend ordering privileges for misuse of the guarantee.</p>\n"
			),
		),
	);

	foreach ( $pages as $slug => $cfg ) {
		$existing = get_page_by_path( $slug );
		if ( $existing ) {
			continue;
		}
		wp_insert_post(
			array(
				'post_status'    => 'publish',
				'post_type'      => 'page',
				'post_title'     => $cfg['title'],
				'post_name'      => $slug,
				'post_content'   => $cfg['content'],
				'comment_status' => 'closed',
			)
		);
	}
}

add_action(
	'after_switch_theme',
	function () {
		roji_seo_ensure_policy_pages();
	}
);

add_action(
	'admin_init',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// Quick check: only run if either page is missing.
		if ( get_page_by_path( 'shipping-policy' ) && get_page_by_path( 'return-policy' ) ) {
			return;
		}
		roji_seo_ensure_policy_pages();
	},
	30
);
