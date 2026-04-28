<?php
/**
 * Roji Child — WooCommerce customizations.
 *
 * - Disable default WC stylesheets (we ship our own dark theme).
 * - Protocol-engine deep-link handler (?protocol_stack=...).
 * - Custom product tabs (COA, Published Research) and remove reviews.
 * - Free shipping over the configured threshold.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Strip default WooCommerce styles — the child theme owns visual styling.
 */
add_filter( 'woocommerce_enqueue_styles', '__return_empty_array' );

/**
 * Deep-link handler: ?protocol_stack=wolverine|recomp|full
 *
 * Empties the cart, adds the mapped product, and redirects to checkout.
 * Triggered by the protocol-engine "Get this stack" button.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! isset( $_GET['protocol_stack'] ) ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
			return;
		}
		$slug       = sanitize_text_field( wp_unslash( $_GET['protocol_stack'] ) );
		$product_id = roji_product_id_for_stack( $slug );
		if ( $product_id <= 0 ) {
			return;
		}
		WC()->cart->empty_cart();
		WC()->cart->add_to_cart( $product_id );
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}
);

/**
 * Remove the reviews tab — not appropriate for research chemicals.
 */
add_filter(
	'woocommerce_product_tabs',
	function ( $tabs ) {
		unset( $tabs['reviews'] );
		return $tabs;
	},
	98
);

/**
 * Add "Certificate of Analysis" tab on every product page.
 */
add_filter(
	'woocommerce_product_tabs',
	function ( $tabs ) {
		$tabs['coa'] = array(
			'title'    => __( 'Certificate of Analysis', 'roji-child' ),
			'priority' => 15,
			'callback' => 'roji_render_coa_tab',
		);
		return $tabs;
	}
);

/**
 * Render the COA tab body.
 */
function roji_render_coa_tab() {
	global $product;
	if ( ! $product ) {
		return;
	}
	$coa_url = get_post_meta( $product->get_id(), '_coa_pdf', true );
	echo '<div class="roji-coa-tab">';
	echo '<p>' . esc_html__( 'Third-party laboratory analysis confirming compound identity and purity.', 'roji-child' ) . '</p>';
	if ( $coa_url ) {
		printf(
			'<a class="button" href="%s" target="_blank" rel="noopener">%s</a>',
			esc_url( $coa_url ),
			esc_html__( 'Download COA (PDF)', 'roji-child' )
		);
	} else {
		echo '<p><em>' . esc_html__( 'COA for this batch is being processed. Check back soon.', 'roji-child' ) . '</em></p>';
	}
	echo '</div>';
}

/**
 * Add "Published Research" tab — references stored as a `_research_refs` meta array.
 *
 * Expected meta shape:
 *   array(
 *     array( 'title' => 'Study title', 'url' => 'https://pubmed...' ),
 *     ...
 *   )
 */
add_filter(
	'woocommerce_product_tabs',
	function ( $tabs ) {
		$tabs['research'] = array(
			'title'    => __( 'Published Research', 'roji-child' ),
			'priority' => 20,
			'callback' => 'roji_render_research_tab',
		);
		return $tabs;
	}
);

/**
 * Render the research references tab.
 */
function roji_render_research_tab() {
	global $product;
	if ( ! $product ) {
		return;
	}
	$refs = get_post_meta( $product->get_id(), '_research_refs', true );
	echo '<div class="roji-research-tab">';
	echo '<p style="color:var(--roji-text-secondary);font-size:13px;margin-bottom:16px;">';
	echo esc_html__( 'Peer-reviewed studies referenced for educational purposes only. This is not medical advice.', 'roji-child' );
	echo '</p>';
	if ( is_array( $refs ) && ! empty( $refs ) ) {
		echo '<ul style="list-style:none;padding:0;margin:0;">';
		foreach ( $refs as $ref ) {
			if ( empty( $ref['title'] ) || empty( $ref['url'] ) ) {
				continue;
			}
			printf(
				'<li style="margin-bottom:12px;padding:12px;border:1px solid var(--roji-border);border-radius:var(--roji-radius);">'
					. '<a href="%s" target="_blank" rel="noopener">%s</a></li>',
				esc_url( $ref['url'] ),
				esc_html( $ref['title'] )
			);
		}
		echo '</ul>';
	} else {
		echo '<p><em>' . esc_html__( 'References for this product are being curated.', 'roji-child' ) . '</em></p>';
	}
	echo '</div>';
}

/**
 * Free shipping over the configured threshold; otherwise keep flat-rate options.
 */
add_filter(
	'woocommerce_package_rates',
	function ( $rates ) {
		if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
			return $rates;
		}
		$cart_total = (float) WC()->cart->get_subtotal();
		if ( $cart_total >= (float) ROJI_FREE_SHIPPING_THRESHOLD ) {
			$has_free = false;
			foreach ( $rates as $rate ) {
				if ( 'free_shipping' === $rate->method_id ) {
					$has_free = true;
					break;
				}
			}
			if ( $has_free ) {
				foreach ( $rates as $rate_key => $rate ) {
					if ( 'free_shipping' !== $rate->method_id ) {
						unset( $rates[ $rate_key ] );
					}
				}
			}
		}
		return $rates;
	},
	10,
	1
);

/**
 * Allow ?add-to-cart= behavior across the protocol deep-link.
 * (WooCommerce handles this natively; this is a safety net for cache plugins.)
 */
add_action(
	'init',
	function () {
		if ( isset( $_GET['protocol_stack'] ) ) {
			nocache_headers();
		}
	}
);

/* -------------------------------------------------------------------------- */
/* Branded product-image fallback                                             */
/* -------------------------------------------------------------------------- */

/**
 * Replace the WooCommerce default placeholder ("woocommerce-placeholder") with
 * our Roji-branded fallback. The attachment ID is stored in the
 * `roji_default_product_image` option (set by the asset-import script in
 * roji-store/scripts/import-product-images.sh).
 *
 * Applies to:
 *   - Shop / category archives
 *   - Single product pages (when no _thumbnail_id is set)
 *   - Cart, checkout, and order-received line items
 *   - Email order summaries
 *
 * The override is no-op until the option is populated, so this is safe to
 * ship even on installs where the placeholder hasn't been imported yet.
 */
add_filter(
	'woocommerce_placeholder_img_src',
	function ( $src ) {
		$attachment_id = (int) get_option( 'roji_default_product_image' );
		if ( $attachment_id <= 0 ) {
			return $src;
		}
		$url = wp_get_attachment_image_url( $attachment_id, 'woocommerce_thumbnail' );
		return $url ? $url : $src;
	}
);

add_filter(
	'woocommerce_placeholder_img',
	function ( $html, $size ) {
		$attachment_id = (int) get_option( 'roji_default_product_image' );
		if ( $attachment_id <= 0 ) {
			return $html;
		}
		$alt = esc_attr__( 'Roji Peptides — research-grade product', 'roji-child' );
		$override = wp_get_attachment_image(
			$attachment_id,
			$size,
			false,
			array(
				'class' => 'woocommerce-placeholder wp-post-image roji-placeholder',
				'alt'   => $alt,
			)
		);
		return $override ? $override : $html;
	},
	10,
	2
);

/* -------------------------------------------------------------------------- */
/* Shop archive ordering — bundles first                                      */
/* -------------------------------------------------------------------------- */

/**
 * Pin the three protocol bundles (Wolverine, Recomp, Full Protocol) and the
 * autoship siblings to the top of the Shop archive. Supplies (water,
 * syringes, swabs) fall in after them.
 *
 * We do this with a custom orderby clause — `menu_order` first (which we
 * pre-set on the bundle products), then date as a tiebreaker. This way the
 * default WC sort still works for users who pick "Sort by price"; we only
 * override the default catalog order.
 *
 * The `menu_order` values are set by `roji_pin_bundles_to_top()` once on
 * theme activation (and re-runnable via WP-CLI:
 * `wp eval "roji_pin_bundles_to_top();"`).
 */
add_filter(
	'woocommerce_default_catalog_orderby',
	function ( $default ) {
		// Only override if the admin hasn't already set a non-default value.
		if ( 'menu_order' === $default ) {
			return 'menu_order';
		}
		return $default;
	}
);

/**
 * Pre-seed menu_order values so bundles come first. Run once at theme
 * activation; safe to re-run.
 */
function roji_pin_bundles_to_top() {
	// WooCommerce sorts ascending by menu_order, so LOWER values = EARLIER.
	// Default products carry menu_order=0, so we use negative values to pin
	// the bundles unambiguously above everything else.
	$pinned = array(
		// product_id => menu_order
		12 => -10,  // Wolverine Stack
		13 => -9,   // Recomp Stack
		14 => -8,   // Full Protocol
		26 => -7,   // Wolverine Autoship
		27 => -6,   // Recomp Autoship
		28 => -5,   // Full Protocol Autoship
	);
	foreach ( $pinned as $product_id => $order ) {
		if ( get_post_status( $product_id ) ) {
			wp_update_post(
				array(
					'ID'         => $product_id,
					'menu_order' => $order,
				)
			);
		}
	}
}
add_action( 'after_switch_theme', 'roji_pin_bundles_to_top' );
