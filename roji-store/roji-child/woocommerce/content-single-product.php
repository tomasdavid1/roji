<?php
/**
 * Roji Child — single product (PDP) layout.
 *
 * Replaces the default WooCommerce single-product layout with a
 * branded 2-column hero (image left, summary + buy box right) and a
 * tabbed content section beneath. Maintains compatibility with WC
 * filter/action hooks so add-to-cart, variation, tab content, COA,
 * subscriptions toggle, etc. all keep working — we just rearrange
 * the visual structure.
 *
 * Falls back to the default WC layout if `$product` is missing for
 * any reason.
 *
 * Roji-specific niceties:
 *   - Per-week pricing badge for stack products (mirrors the
 *     protocol-engine and cart framing).
 *   - "What's in this stack" compound breakdown for stack SKUs.
 *   - Trust indicators row (third-party COA, 21+ verified, ships
 *     from US, refund policy).
 *   - Published research hint card if the product has _research_refs.
 *
 * @package roji-child
 */

defined( 'ABSPATH' ) || exit;

global $product;
if ( ! is_a( $product, 'WC_Product' ) ) {
	?>
	<div class="woocommerce-info"><?php esc_html_e( 'Product not available.', 'roji-child' ); ?></div>
	<?php
	return;
}

$is_stack = in_array(
	$product->get_id(),
	array_filter(
		array(
			(int) ( defined( 'ROJI_WOLVERINE_PRODUCT_ID' ) ? ROJI_WOLVERINE_PRODUCT_ID : 0 ),
			(int) ( defined( 'ROJI_RECOMP_PRODUCT_ID' ) ? ROJI_RECOMP_PRODUCT_ID : 0 ),
			(int) ( defined( 'ROJI_FULL_PRODUCT_ID' ) ? ROJI_FULL_PRODUCT_ID : 0 ),
		)
	),
	true
);

$weeks_for_stack = 0;
if ( $product->get_id() === (int) ( defined( 'ROJI_WOLVERINE_PRODUCT_ID' ) ? ROJI_WOLVERINE_PRODUCT_ID : 0 ) ) {
	$weeks_for_stack = 4;
} elseif ( $product->get_id() === (int) ( defined( 'ROJI_RECOMP_PRODUCT_ID' ) ? ROJI_RECOMP_PRODUCT_ID : 0 ) ) {
	$weeks_for_stack = 4;
} elseif ( $product->get_id() === (int) ( defined( 'ROJI_FULL_PRODUCT_ID' ) ? ROJI_FULL_PRODUCT_ID : 0 ) ) {
	$weeks_for_stack = 12;
}

$weekly_price = 0;
if ( $is_stack && $weeks_for_stack > 0 ) {
	$price = (float) $product->get_price();
	if ( $price > 0 ) {
		$weekly_price = (int) round( $price / $weeks_for_stack );
	}
}

$has_research = (bool) get_post_meta( $product->get_id(), '_research_refs', true );

/**
 * Bundle upsell: when this product is part of a stack, the
 * `_bundled_in` post-meta names the parent stack slug and
 * `_bundle_savings_usd` carries the per-bundle savings. The
 * upsell card is rendered in the buy box just under the price
 * (where intent is concentrated). Skipped silently if either
 * meta is missing or the parent stack can't be resolved.
 */
$bundle_pitch       = null;
$bundled_in_slug    = (string) get_post_meta( $product->get_id(), '_bundled_in', true );
$bundle_savings_usd = (float) get_post_meta( $product->get_id(), '_bundle_savings_usd', true );
if ( $bundled_in_slug && $bundle_savings_usd > 0 ) {
	$bundle_post = get_page_by_path( $bundled_in_slug, OBJECT, 'product' );
	if ( $bundle_post instanceof WP_Post ) {
		$bundle_product = wc_get_product( $bundle_post->ID );
		if ( $bundle_product instanceof WC_Product ) {
			$bundle_pitch = array(
				'name'        => $bundle_product->get_name(),
				'url'         => get_permalink( $bundle_post->ID ),
				'savings_usd' => $bundle_savings_usd,
				'compounds'   => (string) get_post_meta( $bundle_post->ID, '_compounds', true ),
			);
		}
	}
}

?>
<div id="product-<?php the_ID(); ?>" <?php wc_product_class( 'roji-pdp', $product ); ?>>
	<style>
		.roji-pdp { max-width: 1200px; margin: 0 auto; padding: 24px 0 64px; }
		.roji-pdp-hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; margin-bottom: 48px; }
		@media (max-width: 900px) { .roji-pdp-hero { grid-template-columns: 1fr; gap: 28px; } }
		.roji-pdp-img { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); overflow: hidden; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; }
		.roji-pdp-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
		.roji-pdp-img .placeholder { color: var(--roji-text-muted); font-family: var(--roji-font-mono); font-size: 13px; padding: 32px; text-align: center; }

		.roji-pdp-summary { display: flex; flex-direction: column; gap: 18px; }
		.roji-pdp-cat { font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--roji-accent); margin-bottom: 4px; }
		.roji-pdp-summary h1 { margin: 0; font-size: 2.2rem; line-height: 1.1; letter-spacing: -0.02em; }
		.roji-pdp-tagline { color: var(--roji-text-secondary); font-size: 1rem; line-height: 1.6; margin: 0; }
		.roji-pdp-priceblock { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 22px; }
		.roji-pdp-priceblock .row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
		.roji-pdp-priceblock .price { font-family: var(--roji-font-mono); font-size: 2rem; font-weight: 700; color: var(--roji-text-primary); }
		.roji-pdp-priceblock .price small { font-size: 14px; font-weight: 400; color: var(--roji-text-secondary); }
		.roji-pdp-priceblock .weekly { font-size: 13px; color: var(--roji-text-secondary); margin-top: 6px; }
		.roji-pdp-priceblock .weekly strong { color: var(--roji-accent); font-family: var(--roji-font-mono); }
		.roji-pdp-priceblock form.cart { margin-top: 18px; display: flex; gap: 10px; align-items: stretch; flex-wrap: wrap; }
		.roji-pdp-priceblock form.cart .quantity { display: flex; align-items: center; }
		.roji-pdp-priceblock form.cart input.qty { width: 80px !important; height: 100% !important; min-height: 50px; }
		.roji-pdp-priceblock form.cart .single_add_to_cart_button { flex: 1 1 200px; min-height: 50px; font-size: 15px !important; }
		.roji-pdp-priceblock .stock { font-size: 12px; font-family: var(--roji-font-mono); margin-top: 12px; color: var(--roji-text-secondary); }
		.roji-pdp-priceblock .stock.in-stock { color: #4ade80; }

		.roji-pdp-trust { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
		/* Only the card row gets the frame — inner text div must stay borderless (was "box in a box"). */
		.roji-pdp-trust > .roji-pdp-trust__item { display: flex; gap: 12px; align-items: flex-start; padding: 14px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); font-size: 12px; line-height: 1.45; color: var(--roji-text-secondary); }
		.roji-pdp-trust__item .roji-pdp-trust__text { flex: 1; min-width: 0; margin: 0; padding: 0; border: none; background: transparent; display: block; }
		.roji-pdp-trust__item strong { color: var(--roji-text-primary); display: block; margin: 0 0 4px; font-size: 13px; font-weight: 600; }
		.roji-pdp-trust__item .ico { width: 20px; height: 20px; flex-shrink: 0; color: var(--roji-accent); margin-top: 2px; }

		.roji-pdp-meta-list { display: grid; gap: 6px; padding: 14px 16px; border: 1px solid var(--roji-border); border-radius: var(--roji-radius); background: rgba(255,255,255,0.01); }
		.roji-pdp-meta-list .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
		.roji-pdp-meta-list .row .label { color: var(--roji-text-muted); font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
		.roji-pdp-meta-list .row .value { color: var(--roji-text-primary); }

		.roji-pdp-tabs { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); overflow: hidden; }
		.roji-pdp-tabs ul.tabs { display: flex; flex-wrap: wrap; gap: 0; margin: 0 !important; padding: 0 !important; list-style: none !important; border-bottom: 1px solid var(--roji-border) !important; background: rgba(255,255,255,0.02); }
		.roji-pdp-tabs ul.tabs::before, .roji-pdp-tabs ul.tabs::after { display: none !important; }
		.roji-pdp-tabs ul.tabs li { background: transparent !important; border: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; }
		.roji-pdp-tabs ul.tabs li::before, .roji-pdp-tabs ul.tabs li::after { display: none !important; }
		.roji-pdp-tabs ul.tabs li a { display: block; padding: 16px 22px !important; color: var(--roji-text-secondary) !important; font-size: 13px !important; font-family: var(--roji-font-mono) !important; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid transparent !important; transition: color 0.15s ease, border-color 0.15s ease; }
		.roji-pdp-tabs ul.tabs li a:hover { color: var(--roji-text-primary) !important; }
		.roji-pdp-tabs ul.tabs li.active a { color: var(--roji-text-primary) !important; border-bottom-color: var(--roji-accent) !important; }
		.roji-pdp-tabs .panel, .roji-pdp-tabs .woocommerce-Tabs-panel { padding: 28px; line-height: 1.7; color: var(--roji-text-secondary); font-size: 15px; }
		.roji-pdp-tabs .panel h2, .roji-pdp-tabs .woocommerce-Tabs-panel h2 { color: var(--roji-text-primary); font-size: 1.2rem; margin: 0 0 14px; }

		.roji-pdp-disclaimer { margin-top: 24px; padding: 18px; border-left: 3px solid var(--roji-accent); background: rgba(79,109,245,0.04); border-radius: var(--roji-radius); font-size: 13px; line-height: 1.6; color: var(--roji-text-secondary); }
		.roji-pdp-disclaimer strong { color: var(--roji-text-primary); display: block; margin-bottom: 4px; }

		/* Bundle upsell card on individual PDPs (added 2026-05-06).
		   Shown inside the priceblock just below the price row;
		   visible only when the product has _bundled_in + savings.
		   Designed to feel like an inline savings hint with one
		   clear action — not a competing buy block. */
		.roji-pdp-bundle-pitch {
			display: flex;
			align-items: center;
			gap: 14px;
			margin-top: 14px;
			padding: 12px 14px;
			background: rgba(79,109,245,0.06);
			border: 1px solid rgba(79,109,245,0.22);
			border-radius: var(--roji-radius);
			text-decoration: none;
			color: inherit;
			transition: background 0.15s ease, border-color 0.15s ease;
		}
		.roji-pdp-bundle-pitch:hover {
			background: rgba(79,109,245,0.1);
			border-color: rgba(79,109,245,0.4);
		}
		.roji-pdp-bundle-pitch__chip {
			flex-shrink: 0;
			padding: 4px 10px;
			background: rgba(34,197,94,0.15);
			border: 1px solid rgba(34,197,94,0.4);
			border-radius: 999px;
			color: #4ade80;
			font-family: var(--roji-font-mono);
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.02em;
		}
		.roji-pdp-bundle-pitch__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
		.roji-pdp-bundle-pitch__title { font-size: 14px; font-weight: 600; color: var(--roji-text-primary); }
		.roji-pdp-bundle-pitch__sub { font-size: 12px; color: var(--roji-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.roji-pdp-bundle-pitch__cta { flex-shrink: 0; font-family: var(--roji-font-mono); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--roji-accent); white-space: nowrap; }
		@media (max-width: 520px) {
			.roji-pdp-bundle-pitch { flex-wrap: wrap; }
			.roji-pdp-bundle-pitch__cta { width: 100%; text-align: right; }
		}
	</style>

	<div class="roji-pdp-hero">
		<div class="roji-pdp-img">
			<?php if ( $product->get_image_id() ) : ?>
				<?php echo $product->get_image( 'large' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<?php else : ?>
				<div class="placeholder">No product image yet.</div>
			<?php endif; ?>
		</div>

		<div class="roji-pdp-summary">
			<?php
			$cats = wc_get_product_category_list( $product->get_id(), ' · ' );
			if ( $cats ) {
				echo '<div class="roji-pdp-cat">' . wp_kses( wp_strip_all_tags( $cats ), array() ) . '</div>';
			}
			?>
			<h1><?php the_title(); ?></h1>
			<?php if ( $product->get_short_description() ) : ?>
				<p class="roji-pdp-tagline"><?php echo wp_kses_post( $product->get_short_description() ); ?></p>
			<?php endif; ?>

			<div class="roji-pdp-priceblock">
				<div class="row">
					<?php if ( $weekly_price > 0 ) : ?>
						<div class="price">$<?php echo esc_html( $weekly_price ); ?><small>/week</small></div>
						<div style="text-align:right;font-family:var(--roji-font-mono);font-size:14px;color:var(--roji-text-secondary);">
							<?php echo wp_kses_post( $product->get_price_html() ); ?>
							<div style="font-size:11px;color:var(--roji-text-muted);margin-top:2px;">billed once · <?php echo esc_html( $weeks_for_stack ); ?>-week supply</div>
						</div>
					<?php else : ?>
						<div class="price"><?php echo wp_kses_post( $product->get_price_html() ); ?></div>
					<?php endif; ?>
				</div>

				<?php if ( null !== $bundle_pitch ) : ?>
					<a class="roji-pdp-bundle-pitch" href="<?php echo esc_url( $bundle_pitch['url'] ); ?>">
						<span class="roji-pdp-bundle-pitch__chip">−$<?php echo esc_html( number_format( $bundle_pitch['savings_usd'], 0 ) ); ?></span>
						<span class="roji-pdp-bundle-pitch__body">
							<span class="roji-pdp-bundle-pitch__title"><?php echo esc_html( $bundle_pitch['name'] ); ?></span>
							<?php if ( $bundle_pitch['compounds'] ) : ?>
								<span class="roji-pdp-bundle-pitch__sub"><?php echo esc_html( $bundle_pitch['compounds'] ); ?></span>
							<?php endif; ?>
						</span>
						<span class="roji-pdp-bundle-pitch__cta" aria-hidden="true">View stack &rarr;</span>
					</a>
				<?php endif; ?>

				<?php
				/**
				 * We render title + price + short description ourselves above,
				 * so detach those defaults before firing the summary hook —
				 * leaving only the add-to-cart button, variation form, meta,
				 * sharing, and any third-party additions (autoship toggle,
				 * Trustpilot widget) intact.
				 */
				remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_title', 5 );
				remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_price', 10 );
				remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_excerpt', 20 );
				remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40 );
				do_action( 'woocommerce_single_product_summary' );
				?>

				<?php if ( $product->is_in_stock() ) : ?>
					<div class="stock in-stock">In stock · ships within 24 business hours</div>
				<?php else : ?>
					<div class="stock">Currently out of stock — email us to be notified.</div>
				<?php endif; ?>
			</div>

			<div class="roji-pdp-trust">
				<div class="roji-pdp-trust__item">
					<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<div class="roji-pdp-trust__text"><strong>Third-party COA</strong>Every batch verified by independent lab</div>
				</div>
				<div class="roji-pdp-trust__item">
					<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke-linecap="round"/></svg>
					<div class="roji-pdp-trust__text"><strong>21+ verified</strong>Research use only · age-gated checkout</div>
				</div>
				<div class="roji-pdp-trust__item">
					<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h13l3 5h2v6h-3a3 3 0 11-6 0H9a3 3 0 11-6 0V6z" stroke-linejoin="round"/></svg>
					<div class="roji-pdp-trust__text"><strong>Ships from US</strong>Free shipping over $200 · USPS / UPS</div>
				</div>
				<div class="roji-pdp-trust__item">
					<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
					<div class="roji-pdp-trust__text"><strong>14-day refund</strong>Unopened · no questions asked</div>
				</div>
			</div>

			<div class="roji-pdp-meta-list">
				<?php if ( $product->get_sku() ) : ?>
					<div class="row"><span class="label">SKU</span><span class="value"><?php echo esc_html( $product->get_sku() ); ?></span></div>
				<?php endif; ?>
				<?php if ( $weeks_for_stack > 0 ) : ?>
					<div class="row"><span class="label">Supply duration</span><span class="value"><?php echo esc_html( $weeks_for_stack ); ?> weeks</span></div>
				<?php endif; ?>
				<?php if ( $cats ) : ?>
					<div class="row"><span class="label">Category</span><span class="value"><?php echo wp_kses( wp_strip_all_tags( $cats ), array() ); ?></span></div>
				<?php endif; ?>
				<?php if ( $product->get_weight() ) : ?>
					<div class="row"><span class="label">Weight</span><span class="value"><?php echo esc_html( wc_format_weight( $product->get_weight() ) ); ?></span></div>
				<?php endif; ?>
			</div>
		</div>
	</div>

	<div class="roji-pdp-tabs">
		<?php
		/**
		 * WC tabs filter chain — we already register COA + Published Research
		 * in inc/woocommerce.php and remove the reviews tab.
		 */
		woocommerce_output_product_data_tabs();
		?>
	</div>

	<?php if ( $is_stack ) : ?>
		<div class="roji-pdp-disclaimer">
			<strong>Research Use Only</strong>
			This stack is sold by Roji Peptides for research and laboratory use only. Not intended for human dosing, injection, ingestion, or any form of bodily introduction. Not evaluated by the FDA. Must be 21+ to purchase. By placing an order you agree to our <a href="<?php echo esc_url( home_url( '/terms' ) ); ?>" style="color:var(--roji-accent);">Terms</a>.
		</div>
	<?php endif; ?>

	<?php
	/**
	 * Related/upsell products are rendered by woocommerce_after_single_product_summary,
	 * but that hook also re-fires the tabs (priority 10) which we already rendered
	 * above. Detach the tabs callback before firing so we don't duplicate.
	 */
	remove_action( 'woocommerce_after_single_product_summary', 'woocommerce_output_product_data_tabs', 10 );
	do_action( 'woocommerce_after_single_product_summary' );
	?>
</div>
<?php
do_action( 'woocommerce_after_single_product' );
