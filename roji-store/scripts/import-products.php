<?php
/**
 * Roji Peptides — WP-CLI product seeder.
 *
 * Creates the 3 research stacks + 3 accessories with all required custom
 * fields, categories, tags, weights, and disclaimers.
 *
 * Usage:
 *   wp eval-file scripts/import-products.php
 *
 * Idempotent: looks up existing products by SKU before creating.
 *
 * After running, copy the printed product IDs into
 * wp-content/themes/roji-child/inc/config.php (ROJI_*_PRODUCT_ID).
 *
 * @package roji-store
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	echo "This script must be run via WP-CLI: wp eval-file scripts/import-products.php\n";
	return;
}

if ( ! class_exists( 'WC_Product_Simple' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}

/**
 * Ensure a product category exists by name; return its term ID.
 *
 * @param string $name Category display name.
 * @return int
 */
function roji_ensure_category( $name ) {
	$slug = sanitize_title( $name );
	$term = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $term && ! is_wp_error( $term ) ) {
		return (int) $term->term_id;
	}
	$created = wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );
	if ( is_wp_error( $created ) ) {
		return 0;
	}
	return (int) $created['term_id'];
}

/**
 * Find a product by SKU.
 *
 * @param string $sku Product SKU.
 * @return int Product ID (0 if missing).
 */
function roji_find_by_sku( $sku ) {
	$id = wc_get_product_id_by_sku( $sku );
	return (int) $id;
}

/**
 * Create or update a simple product.
 *
 * @param array $args Product spec.
 * @return int Product ID.
 */
function roji_upsert_product( array $args ) {
	$existing_id = roji_find_by_sku( $args['sku'] );
	$product     = $existing_id ? wc_get_product( $existing_id ) : new WC_Product_Simple();

	$product->set_name( $args['name'] );
	$product->set_slug( $args['slug'] );
	$product->set_sku( $args['sku'] );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$product->set_price( (string) $args['price'] );
	$product->set_regular_price( (string) $args['price'] );
	$product->set_short_description( $args['short_description'] );
	$product->set_description( $args['description'] );
	$product->set_weight( (string) $args['weight_lbs'] );
	$product->set_manage_stock( false );
	$product->set_stock_status( 'instock' );
	$product->set_reviews_allowed( false );
	$product->set_sold_individually( false );

	$cat_id = roji_ensure_category( $args['category'] );
	if ( $cat_id ) {
		$product->set_category_ids( array( $cat_id ) );
	}
	$product->set_tag_ids( array() );

	$product_id = $product->save();

	// Tags.
	if ( ! empty( $args['tags'] ) ) {
		wp_set_object_terms( $product_id, $args['tags'], 'product_tag' );
	}

	// Custom meta fields.
	if ( ! empty( $args['meta'] ) ) {
		foreach ( $args['meta'] as $key => $value ) {
			update_post_meta( $product_id, $key, $value );
		}
	}

	return (int) $product_id;
}

$products = array(
	array(
		// Renamed 2026-05-06: lead with the compound names. "Wolverine
		// Stack" is meaningful only to people already in the niche;
		// paid-search visitors arriving from `bpc 157` / `tb 500`
		// keywords need to recognize the product instantly. Slug kept
		// at `wolverine-stack` so existing inbound links + the
		// `?protocol_stack=wolverine` tracking URLs don't break.
		'sku'               => 'ROJI-WOLF-001',
		'name'              => 'BPC-157 + TB-500 Stack',
		'slug'              => 'wolverine-stack',
		'price'             => 149.00,
		'category'          => 'Tissue-Research Compounds',
		'tags'              => array( 'bpc-157', 'tb-500', 'research', 'preclinical' ),
		'weight_lbs'        => 0.3,
		// short_description is also the PDP tagline (rendered just
		// under the title in roji-pdp-tagline) and the archive card
		// excerpt. Keep it plain-English: what's in the box, what the
		// research literature focuses on. No claims, no dosing.
		'short_description' => 'One vial each of BPC-157 (10mg) and TB-500 (10mg) — the two compounds whose preclinical literature most often appears together in tissue-repair and angiogenesis research. 4-week research supply.',
		'description'       => 'A two-compound research stack referenced from peer-reviewed preclinical literature. Includes one vial of BPC-157 (10mg) and one vial of TB-500 (10mg). All compounds are tested at ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'        => 'BPC-157 (10mg), TB-500 (10mg)',
			'_supply_duration'  => '4 weeks',
			'_purity'           => '≥99%',
			'_coa_pdf'          => '',
			'_research_refs'    => array(
				array(
					'title' => 'Stable gastric pentadecapeptide BPC 157 in clinical trials as a therapy for inflammatory bowel disease',
					'url'   => 'https://pubmed.ncbi.nlm.nih.gov/22950504/',
				),
				array(
					'title' => 'Thymosin beta-4: a multi-functional regenerative peptide. Basic properties and clinical applications',
					'url'   => 'https://pubmed.ncbi.nlm.nih.gov/22394215/',
				),
			),
			'_protocol_stack'   => 'wolverine',
			'_disclaimer'       => 'For research and laboratory use only. Not intended for human consumption.',
		),
	),
	array(
		// Renamed 2026-05-06: lead with the compound names. Same
		// rationale as the BPC-157+TB-500 stack — "Recomp" alone
		// reads as fitness-app-jargon to a researcher arriving from
		// a `cjc 1295 ipamorelin` query.
		'sku'               => 'ROJI-RECOMP-001',
		'name'              => 'CJC-1295 + Ipamorelin + MK-677 Stack',
		'slug'              => 'recomp-stack',
		'price'             => 199.00,
		'category'          => 'GH-Axis Compounds',
		'tags'              => array( 'gh-axis', 'cjc-1295', 'ipamorelin', 'mk-677', 'research', 'preclinical' ),
		'weight_lbs'        => 0.4,
		'short_description' => 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + a 30-day MK-677 oral supply — the three GH-axis compounds with the most extensive published pharmacokinetic research, all in one stack. 4-week research supply.',
		'description'       => 'A three-compound research stack covering the GH-axis, referenced from preclinical and clinical pharmacokinetic literature. Includes one vial of CJC-1295 with DAC (5mg), one vial of Ipamorelin (5mg), and a 30-day supply of MK-677 oral capsules. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'        => 'CJC-1295 w/ DAC (5mg), Ipamorelin (5mg), MK-677 (30 capsules)',
			'_supply_duration'  => '4 weeks',
			'_purity'           => '≥99%',
			'_coa_pdf'          => '',
			'_research_refs'    => array(
				array(
					'title' => 'A phase I, open-label, ascending-dose study of CJC-1295, a long-acting GHRH analog',
					'url'   => 'https://pubmed.ncbi.nlm.nih.gov/16352683/',
				),
				array(
					'title' => 'Two-year treatment with the oral growth hormone secretagogue MK-677 in older adults',
					'url'   => 'https://pubmed.ncbi.nlm.nih.gov/19075081/',
				),
			),
			'_protocol_stack'   => 'recomp',
			'_disclaimer'       => 'For research and laboratory use only. Not intended for human consumption.',
		),
	),
	array(
		'sku'               => 'ROJI-FULL-001',
		'name'              => 'Full Protocol',
		'slug'              => 'full-protocol',
		'price'             => 399.00,
		'category'          => 'Multi-Compound Bundles',
		'tags'              => array( 'multi-compound', 'bundle', 'research', 'preclinical' ),
		'weight_lbs'        => 0.7,
		'short_description' => 'All five compounds — BPC-157, TB-500, CJC-1295 (DAC), Ipamorelin, MK-677 — across 12 weeks of research supply, ships monthly. Both stacks combined, plus bacteriostatic water and a printed research reference card.',
		'description'       => 'A 12-week research-grade compound supply, shipping monthly. Combines the BPC-157 + TB-500 stack and the CJC-1295 + Ipamorelin + MK-677 stack across three monthly deliveries, plus bacteriostatic water and a printed research reference card with reconstitution math drawn from published literature. ≥99% purity with a batch-specific Certificate of Analysis on every vial. Per-month price; total billed in three monthly deliveries. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'        => 'BPC-157, TB-500, CJC-1295 (DAC), Ipamorelin, MK-677',
			'_supply_duration'  => '12 weeks (ships monthly)',
			'_purity'           => '≥99%',
			'_includes'         => 'Printed research protocol guide, dosing calendar, BAC water',
			'_coa_pdf'          => '',
			'_protocol_stack'   => 'full',
			'_disclaimer'       => 'For research and laboratory use only. Not intended for human consumption.',
		),
	),

	// Individual Compounds — sold separately at a premium vs. the bundles.
	// Pricing is calibrated so the bundle savings round to ~25–30%:
	//   BPC-157 ($99) + TB-500 ($109) = $208 → Wolverine Stack $149 → save $59 (28%)
	//   CJC-1295 ($109) + Ipa ($89) + MK-677 ($89) = $287 → Recomp $199 → save $88 (31%)
	array(
		'sku'               => 'ROJI-BPC-10',
		'name'              => 'BPC-157 (10mg)',
		'slug'              => 'bpc-157-10mg',
		'price'             => 99.00,
		'category'          => 'Individual Compounds',
		'tags'              => array( 'bpc-157', 'individual', 'research', 'preclinical' ),
		'weight_lbs'        => 0.15,
		'short_description' => 'BPC-157, 10mg lyophilized. Single vial.',
		'description'       => 'A single 10mg vial of BPC-157, referenced extensively in peer-reviewed preclinical literature. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'           => 'BPC-157 (10mg)',
			'_purity'              => '≥99%',
			'_coa_pdf'             => '',
			'_bundle_savings_usd'  => 59,
			'_bundled_in'          => 'wolverine-stack',
			'_disclaimer'          => 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		),
	),
	array(
		'sku'               => 'ROJI-TB-10',
		'name'              => 'TB-500 (10mg)',
		'slug'              => 'tb-500-10mg',
		'price'             => 109.00,
		'category'          => 'Individual Compounds',
		'tags'              => array( 'tb-500', 'individual', 'research', 'preclinical' ),
		'weight_lbs'        => 0.15,
		'short_description' => 'TB-500 (Thymosin β-4), 10mg lyophilized. Single vial.',
		'description'       => 'A single 10mg vial of TB-500 (Thymosin β-4 fragment), referenced in peer-reviewed preclinical literature. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'           => 'TB-500 (10mg)',
			'_purity'              => '≥99%',
			'_coa_pdf'             => '',
			'_bundle_savings_usd'  => 59,
			'_bundled_in'          => 'wolverine-stack',
			'_disclaimer'          => 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		),
	),
	array(
		'sku'               => 'ROJI-CJC-5',
		'name'              => 'CJC-1295 with DAC (5mg)',
		'slug'              => 'cjc-1295-dac-5mg',
		'price'             => 109.00,
		'category'          => 'Individual Compounds',
		'tags'              => array( 'cjc-1295', 'gh-axis', 'individual', 'research', 'preclinical' ),
		'weight_lbs'        => 0.15,
		'short_description' => 'CJC-1295 with DAC, 5mg lyophilized. Single vial.',
		'description'       => 'A single 5mg vial of CJC-1295 with DAC (a long-acting GHRH analog), referenced in published preclinical and clinical pharmacokinetic literature. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'           => 'CJC-1295 with DAC (5mg)',
			'_purity'              => '≥99%',
			'_coa_pdf'             => '',
			'_bundle_savings_usd'  => 88,
			'_bundled_in'          => 'recomp-stack',
			'_disclaimer'          => 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		),
	),
	array(
		'sku'               => 'ROJI-IPA-5',
		'name'              => 'Ipamorelin (5mg)',
		'slug'              => 'ipamorelin-5mg',
		'price'             => 89.00,
		'category'          => 'Individual Compounds',
		'tags'              => array( 'ipamorelin', 'gh-axis', 'individual', 'research', 'preclinical' ),
		'weight_lbs'        => 0.15,
		'short_description' => 'Ipamorelin, 5mg lyophilized. Single vial.',
		'description'       => 'A single 5mg vial of Ipamorelin (a selective GH secretagogue), referenced in published preclinical literature. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'           => 'Ipamorelin (5mg)',
			'_purity'              => '≥99%',
			'_coa_pdf'             => '',
			'_bundle_savings_usd'  => 88,
			'_bundled_in'          => 'recomp-stack',
			'_disclaimer'          => 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		),
	),
	array(
		'sku'               => 'ROJI-MK-30',
		'name'              => 'MK-677 (30 capsules)',
		'slug'              => 'mk-677-30caps',
		'price'             => 89.00,
		'category'          => 'Individual Compounds',
		'tags'              => array( 'mk-677', 'gh-axis', 'individual', 'oral', 'research', 'preclinical' ),
		'weight_lbs'        => 0.1,
		'short_description' => 'MK-677 (Ibutamoren), 30 oral capsules. 30-day supply.',
		'description'       => 'A 30-capsule supply of MK-677 (Ibutamoren), an orally bioavailable GH secretagogue, referenced in published preclinical and clinical literature. ≥99% purity with a batch-specific Certificate of Analysis. For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		'meta'              => array(
			'_compounds'           => 'MK-677 (30 capsules)',
			'_purity'              => '≥99%',
			'_coa_pdf'             => '',
			'_bundle_savings_usd'  => 88,
			'_bundled_in'          => 'recomp-stack',
			'_disclaimer'          => 'For research and laboratory use only. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products. Not intended for human or animal consumption.',
		),
	),

	// Accessories.
	array(
		'sku'               => 'ROJI-BAC-30',
		'name'              => 'Bacteriostatic Water 30ml',
		'slug'              => 'bacteriostatic-water-30ml',
		'price'             => 8.99,
		'category'          => 'Accessories',
		'tags'              => array( 'accessory', 'bac-water' ),
		'weight_lbs'        => 0.1,
		'short_description' => '30ml bacteriostatic water for laboratory reconstitution.',
		'description'       => '30ml vial of 0.9% benzyl-alcohol bacteriostatic water. For laboratory reconstitution use only.',
		'meta'              => array(),
	),
	array(
		'sku'               => 'ROJI-SYR-100',
		'name'              => 'Insulin Syringes (100-pack)',
		'slug'              => 'insulin-syringes-100pk',
		'price'             => 12.99,
		'category'          => 'Accessories',
		'tags'              => array( 'accessory', 'syringes' ),
		'weight_lbs'        => 0.5,
		'short_description' => '100 sterile insulin syringes for laboratory measurement.',
		'description'       => '100-count box of sterile single-use 1cc insulin syringes. For laboratory measurement use only.',
		'meta'              => array(),
	),
	array(
		'sku'               => 'ROJI-SWAB-200',
		'name'              => 'Alcohol Swabs (200-pack)',
		'slug'              => 'alcohol-swabs-200pk',
		'price'             => 6.99,
		'category'          => 'Accessories',
		'tags'              => array( 'accessory', 'swabs' ),
		'weight_lbs'        => 0.3,
		'short_description' => '200 sterile 70% isopropyl alcohol prep pads.',
		'description'       => '200-count box of sterile 70% isopropyl alcohol prep pads. Laboratory use only.',
		'meta'              => array(),
	),

	/*
	 * Research Supplies Kit — bundles BAC water + syringes + swabs at
	 * a small discount. Sold as a simple product (not a WC grouped or
	 * bundle product) because:
	 *   - Grouped products force a multi-line checkout cart that
	 *     fights our cart card layout.
	 *   - Our cart-upsell module needs ONE SKU it can add in a single
	 *     click; that's incompatible with grouped/bundle flows.
	 *   - The fulfillment SOP is "ship 1× of each" regardless of the
	 *     parent SKU; warehouse picks the same three boxes either way.
	 *
	 * Pricing: $8.99 + $12.99 + $6.99 = $28.97 individually → $24.99
	 * as a kit, savings $3.98 (≈14%). Tweak `price` to retune.
	 */
	array(
		'sku'               => 'ROJI-KIT-001',
		'name'              => 'Research Supplies Kit',
		'slug'              => 'research-supplies-kit',
		'price'             => 24.99,
		'category'          => 'Accessories',
		'tags'              => array( 'accessory', 'kit', 'supplies-kit' ),
		'weight_lbs'        => 0.9, // sum of the three components.
		'short_description' => 'Everything you need to use a research peptide stack: 30ml BAC water, 100 insulin syringes, 200 alcohol swabs. Save $3.98 vs. buying separately.',
		'description'       => 'A bundled supplies kit for laboratory peptide research. Includes one 30ml vial of 0.9% benzyl-alcohol bacteriostatic water, one 100-count box of sterile single-use 1cc insulin syringes, and one 200-count box of sterile 70% isopropyl alcohol prep pads. For laboratory use only.',
		'meta'              => array(
			'_roji_supplies_kit'   => 1,
			'_roji_kit_components' => 'ROJI-BAC-30,ROJI-SYR-100,ROJI-SWAB-200',
		),
	),
);

$ids = array();
foreach ( $products as $spec ) {
	$id = roji_upsert_product( $spec );
	$ids[ $spec['sku'] ] = $id;
	WP_CLI::success( sprintf( '%s -> ID %d (%s)', $spec['sku'], $id, $spec['name'] ) );
}

WP_CLI::log( '' );
WP_CLI::log( 'Add to wp-content/themes/roji-child/inc/config.php:' );
WP_CLI::log( sprintf( "define( 'ROJI_WOLVERINE_PRODUCT_ID', %d );", $ids['ROJI-WOLF-001'] ?? 0 ) );
WP_CLI::log( sprintf( "define( 'ROJI_RECOMP_PRODUCT_ID', %d );", $ids['ROJI-RECOMP-001'] ?? 0 ) );
WP_CLI::log( sprintf( "define( 'ROJI_FULL_PRODUCT_ID', %d );", $ids['ROJI-FULL-001'] ?? 0 ) );
WP_CLI::log( sprintf( "define( 'ROJI_SUPPLIES_KIT_PRODUCT_ID', %d );", $ids['ROJI-KIT-001'] ?? 0 ) );
