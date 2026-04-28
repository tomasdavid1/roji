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
		'sku'               => 'ROJI-WOLF-001',
		'name'              => 'Wolverine Stack',
		'slug'              => 'wolverine-stack',
		'price'             => 149.00,
		'category'          => 'Healing & Recovery',
		'tags'              => array( 'healing', 'recovery', 'bpc-157', 'tb-500', 'research' ),
		'weight_lbs'        => 0.3,
		'short_description' => 'BPC-157 10mg + TB-500 10mg research stack. 4-week supply.',
		'description'       => 'A two-compound research stack referenced from published literature for tissue repair and recovery studies. Includes one vial of BPC-157 (10mg) and one vial of TB-500 (10mg). All compounds are tested ≥99% purity with batch-specific Certificate of Analysis available. For research and laboratory use only. Not intended for human consumption.',
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
		'sku'               => 'ROJI-RECOMP-001',
		'name'              => 'Recomp Stack',
		'slug'              => 'recomp-stack',
		'price'             => 199.00,
		'category'          => 'Body Recomposition',
		'tags'              => array( 'recomp', 'gh-axis', 'cjc-1295', 'ipamorelin', 'mk-677', 'research' ),
		'weight_lbs'        => 0.4,
		'short_description' => 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. 4-week supply.',
		'description'       => 'A comprehensive GH-axis research stack referenced from published literature. Includes one vial of CJC-1295 with DAC (5mg), one vial of Ipamorelin (5mg), and a 30-day supply of MK-677 oral capsules. ≥99% purity with COA per batch. Research use only.',
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
		'category'          => 'Full Protocols',
		'tags'              => array( 'full-protocol', 'comprehensive', 'research' ),
		'weight_lbs'        => 0.7,
		'short_description' => 'Wolverine + Recomp stacks × 3 months. Includes printed protocol guide.',
		'description'       => 'A complete 12-week research protocol shipping monthly. Combines the Wolverine and Recomp stacks across three months and includes a printed research protocol guide, dosing calendar, and bacteriostatic water. Per-month price; ships in three monthly deliveries.',
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
