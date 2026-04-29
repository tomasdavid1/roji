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
 * Declare WooCommerce theme support and pin product image sizes.
 *
 * The default WC `woocommerce_thumbnail` size is 324x324 hard-cropped,
 * which looks soft on retina displays once the browser scales it up to
 * fill a ~300px loop tile. Bumping the canonical sizes lets WP generate
 * larger intermediates so srcset can pick a sharp source.
 *
 *   thumbnail (loop / shop):    600x600 cropped, 1:1 (matches our square
 *                               vial+box packshots; sharp on 2x screens up
 *                               to a 300px display slot).
 *   single   (PDP main):        1200px wide, uncropped.
 *   gallery  (PDP gallery row): 200x200 cropped (small thumbnails).
 *
 * Theme support must be declared via add_theme_support('woocommerce', ...)
 * during after_setup_theme; the ['thumbnail_image_width'] key tells WC
 * what to use for the loop tiles.
 */
add_action(
	'after_setup_theme',
	function () {
		add_theme_support(
			'woocommerce',
			array(
				'thumbnail_image_width' => 600,
				'gallery_thumbnail_image_width' => 200,
				'single_image_width' => 1200,
			)
		);
	},
	5
);

/**
 * Force the loop thumbnail to crop to a clean 1:1 square (matches our
 * vial+box packshot composition). WC reads this option dynamically so
 * filtering it covers shops where it was never set in the customizer.
 */
add_filter(
	'pre_option_woocommerce_thumbnail_cropping',
	function () {
		return '1:1';
	}
);

/**
 * Suppress WooCommerce's default "Your cart is currently empty." notice —
 * our custom woocommerce/cart/cart-empty.php template renders a richer
 * branded card and we don't want the bare notice line above it.
 */
add_filter( 'wc_empty_cart_message', '__return_empty_string' );

/**
 * Deep-link handler: ?protocol_stack=wolverine|recomp|full&qty=N&weeks=W
 *
 * Empties the cart, adds the mapped product at the requested quantity, and
 * redirects to the cart so the customer sees the upsell + autoship banner
 * before checkout.
 *
 * The protocol engine sells by the week (e.g. "$50/week") and reveals the
 * total at the cart. `qty` is the number of supply periods needed to cover
 * the calibrated cycle (e.g. recomp = 2 four-week supplies for an 8wk
 * cycle = $398 total). `weeks` is the calibrated cycle length so we can
 * print "~$50/week for 8 weeks of protocol" under the line item.
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
		$qty   = isset( $_GET['qty'] ) ? max( 1, min( 12, absint( $_GET['qty'] ) ) ) : 1;
		$weeks = isset( $_GET['weeks'] ) ? max( 1, min( 24, absint( $_GET['weeks'] ) ) ) : 0;

		$item_data = array();
		if ( $weeks > 0 ) {
			$item_data['roji_cycle_weeks']    = $weeks;
			$item_data['roji_supply_periods'] = $qty;
		}

		WC()->cart->empty_cart();
		WC()->cart->add_to_cart( $product_id, $qty, 0, array(), $item_data );
		wp_safe_redirect( wc_get_cart_url() );
		exit;
	}
);

/**
 * Persist roji_cycle_weeks / roji_supply_periods on the cart line item so
 * we can print a per-week breakdown caption under the stack title.
 *
 * The same cart_item_data hash (returned here untouched) is what carries
 * cycle metadata across page loads via WC()->cart serialization.
 */
add_filter(
	'woocommerce_add_cart_item_data',
	function ( $cart_item_data, $product_id, $variation_id ) {
		// Already populated by the deep-link handler — just preserve it.
		return $cart_item_data;
	},
	10,
	3
);

/**
 * Print a subtle per-week breakdown caption under stack line items in
 * the cart and checkout. Reads the protocol-engine cycle metadata that
 * the deep-link handler stamped onto the cart item.
 */
add_filter(
	'woocommerce_cart_item_name',
	function ( $name, $cart_item, $cart_item_key ) {
		$weeks   = isset( $cart_item['roji_cycle_weeks'] ) ? (int) $cart_item['roji_cycle_weeks'] : 0;
		$periods = isset( $cart_item['roji_supply_periods'] ) ? (int) $cart_item['roji_supply_periods'] : 0;
		if ( $weeks <= 0 || $periods <= 0 ) {
			return $name;
		}
		$product = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
		if ( ! $product || ! is_callable( array( $product, 'get_price' ) ) ) {
			return $name;
		}
		$unit_price = (float) $product->get_price();
		$total      = $unit_price * max( 1, (int) $cart_item['quantity'] );
		if ( $total <= 0 || $weeks <= 0 ) {
			return $name;
		}
		$weekly       = (int) round( $total / $weeks );
		$weekly_price = wc_price(
			$weekly,
			array(
				'decimals' => 0,
			)
		);
		$caption = sprintf(
			/* translators: 1: total one-time price, 2: weekly equivalent, 3: cycle length in weeks */
			__( 'One-time payment of %1$s (~%2$s/week for %3$d weeks of protocol)', 'roji-child' ),
			wc_price( $total ),
			$weekly_price,
			$weeks
		);
		return $name . '<div class="roji-cart-item-caption" style="margin-top:6px;font-size:12px;color:#888;font-style:italic;line-height:1.4;">' . $caption . '</div>';
	},
	10,
	3
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

/* -----------------------------------------------------------------------------
 * Shop archive — branded category filter chips (replaces the result count
 * + sort dropdown that we hide via CSS).
 *
 * Rendered as plain anchors that use WooCommerce's built-in product_cat
 * permalink structure, so the filter just works without a query handler.
 * The "Bundles" chip is a meta-filter that maps to a comma-list of
 * bundle category slugs, served by `roji_apply_bundles_filter` below.
 * -------------------------------------------------------------------------- */

/**
 * Slugs grouped under the "Bundles" meta-category. Update in one place if
 * you ever add a new bundle taxonomy. Maps to the term slugs from
 * `wp term list product_cat`.
 *
 * Slugs were updated 2026-04-28 after compliance copy rewrite renamed:
 *   healing-recovery     -> tissue-research-compounds
 *   body-recomposition   -> gh-axis-compounds
 *   full-protocols       -> multi-compound-bundles
 */
function roji_bundle_category_slugs() {
	return array( 'tissue-research-compounds', 'gh-axis-compounds', 'multi-compound-bundles' );
}

/**
 * Slug for the "Individual Compounds" category — single-vial products
 * sold separately (priced at a premium vs. the bundled equivalent).
 */
function roji_individuals_category_slug() {
	return 'individual-compounds';
}

/**
 * Render the filter chips above the product grid on the shop archive
 * + every product_cat archive. Hooked into `woocommerce_before_shop_loop`
 * so it appears just above the products and below the page title.
 */
add_action(
	'woocommerce_before_shop_loop',
	function () {
		if ( ! is_shop() && ! is_product_taxonomy() ) {
			return;
		}
		$shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );

		$current_view = '';
		if ( is_shop() && empty( $_GET['roji_view'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$current_view = 'all';
		} elseif ( ! empty( $_GET['roji_view'] ) && 'bundles' === $_GET['roji_view'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$current_view = 'bundles';
		} elseif ( is_product_category( 'accessories' ) ) {
			$current_view = 'supplies';
		} elseif ( is_product_category( roji_individuals_category_slug() ) ) {
			$current_view = 'individuals';
		} elseif ( is_product_taxonomy() ) {
			$term         = get_queried_object();
			$current_view = isset( $term->slug ) ? $term->slug : '';
		}

		// Order chosen deliberately: Bundles first (highest-margin, best
		// for the customer), then Individuals (where most lookers will
		// land first), Supplies, and All as the catch-all on the right.
		$individuals_term_link = get_term_link( roji_individuals_category_slug(), 'product_cat' );
		$chips = array(
			array(
				'label' => __( 'Bundles', 'roji-child' ),
				'url'   => add_query_arg( 'roji_view', 'bundles', $shop_url ),
				'key'   => 'bundles',
			),
			array(
				'label' => __( 'Individuals', 'roji-child' ),
				'url'   => is_wp_error( $individuals_term_link ) ? $shop_url : $individuals_term_link,
				'key'   => 'individuals',
			),
			array(
				'label' => __( 'Supplies', 'roji-child' ),
				'url'   => get_term_link( 'accessories', 'product_cat' ),
				'key'   => 'supplies',
			),
			array(
				'label' => __( 'All', 'roji-child' ),
				'url'   => $shop_url,
				'key'   => 'all',
			),
		);

		echo '<ul class="roji-cat-filter">';
		foreach ( $chips as $chip ) {
			$is_active = ( $chip['key'] === $current_view );
			$cls       = $is_active ? 'is-active' : '';
			printf(
				'<li><a href="%s" class="%s">%s</a></li>',
				esc_url( is_wp_error( $chip['url'] ) ? $shop_url : $chip['url'] ),
				esc_attr( $cls ),
				esc_html( $chip['label'] )
			);
		}
		echo '</ul>';
	},
	5
);

/**
 * When the "Bundles" chip is clicked, restrict the shop loop to products
 * in any of the bundle categories. Uses the main query's `tax_query`
 * via pre_get_posts so pagination + sorting still behave.
 */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}
		if ( empty( $_GET['roji_view'] ) || 'bundles' !== $_GET['roji_view'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		if ( ! ( is_shop() || is_post_type_archive( 'product' ) ) ) {
			return;
		}
		$tax_query   = (array) $q->get( 'tax_query' );
		$tax_query[] = array(
			'taxonomy' => 'product_cat',
			'field'    => 'slug',
			'terms'    => roji_bundle_category_slugs(),
			'operator' => 'IN',
		);
		$q->set( 'tax_query', $tax_query );
	}
);

/* -----------------------------------------------------------------------------
 * "Save with the bundle" messaging on the Individuals archive + cards.
 *
 * The per-product savings comes from a `_bundle_savings_usd` post-meta we
 * set on each individual SKU at seed time. Renders as:
 *   - a banner above the Individuals product grid
 *   - a "Save $X with the bundle" badge on each individual product card
 * -------------------------------------------------------------------------- */

/**
 * Banner above the Individuals archive nudging customers toward the
 * matching bundle. Hooked at priority 6 so it sits between the chip
 * filter (priority 5) and the product grid.
 */
add_action(
	'woocommerce_before_shop_loop',
	function () {
		if ( ! is_product_category( roji_individuals_category_slug() ) ) {
			return;
		}
		$bundles_url = add_query_arg(
			'roji_view',
			'bundles',
			function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' )
		);
		?>
		<div class="roji-individuals-banner" role="note">
			<div class="roji-individuals-banner__body">
				<div class="roji-individuals-banner__eyebrow">Tip · save 25–30%</div>
				<div class="roji-individuals-banner__title">Most researchers save by bundling.</div>
				<div class="roji-individuals-banner__sub">The Wolverine and Recomp Stacks bundle the same compounds at ~30% off the individual price. Worth a look.</div>
			</div>
			<a class="roji-individuals-banner__cta" href="<?php echo esc_url( $bundles_url ); ?>">See the bundles &rarr;</a>
		</div>
		<?php
	},
	6
);

/**
 * "Save $X with the bundle" badge inside each individual product card on
 * loop archives. The savings number comes from `_bundle_savings_usd`
 * post-meta seeded by import-products.php; absent meta = no badge.
 */
add_action(
	'woocommerce_after_shop_loop_item_title',
	function () {
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}
		$savings = (float) get_post_meta( $product->get_id(), '_bundle_savings_usd', true );
		if ( $savings <= 0 ) {
			return;
		}
		printf(
			'<div class="roji-card-savings"><span class="roji-card-savings__chip">−$%s</span><span class="roji-card-savings__txt">with the bundle</span></div>',
			esc_html( number_format( $savings, 0 ) )
		);
	},
	7
);
