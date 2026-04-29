<?php
/**
 * Roji Child — Cart / checkout supply upsell.
 *
 * Researchers buying a stack invariably need consumables to use it:
 * bacteriostatic water (for reconstitution), insulin syringes, and
 * alcohol swabs. We don't include them in the bundle because some
 * customers already have them, but we surface a one-click upsell
 * card on the cart and checkout pages whenever a stack is present
 * AND the customer hasn't already added the supply.
 *
 * The card sits below the autoship banner (different hook priority)
 * and uses the same dark-card visual language. A nonce-protected
 * POST `roji_add_supplies` adds whichever supply IDs the user
 * checked.
 *
 * Behavior:
 *   - Visible only on /cart/ and /checkout/ pages.
 *   - Only renders if (a) at least one stack is in the cart and
 *     (b) at least one supply is NOT already in the cart.
 *   - Pre-checks all missing supplies by default — friction-free.
 *   - Adds the supplies and reloads to the same page so the cart
 *     totals update immediately.
 *   - Honors the `roji_cart_upsell_supplies` filter so additional
 *     SKUs (cohorts, future products) can be added without forking
 *     this file.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------- */
/* POST handler — runs early so the redirect happens before page render.      */
/* -------------------------------------------------------------------------- */

add_action(
	'template_redirect',
	function () {
		// Kit one-click — handled before the checkbox flow so a single
		// nonce field can't collide with both submit buttons.
		if ( ! empty( $_POST['roji_add_kit'] ) ) {
			if ( ! isset( $_POST['_rcu_nonce'] ) ) {
				return;
			}
			$nonce = sanitize_text_field( wp_unslash( $_POST['_rcu_nonce'] ) );
			if ( ! wp_verify_nonce( $nonce, 'roji_add_supplies' ) ) {
				return;
			}
			if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
				return;
			}

			$kit_id = roji_supply_kit_product_id();
			if ( $kit_id <= 0 ) {
				return;
			}

			// Drop any individual supplies already in the cart — the kit
			// supersedes them and we don't want the customer to pay twice.
			$replaced = roji_remove_individual_supplies_from_cart();

			$res = roji_cart_contains_product( $kit_id )
				? true
				: WC()->cart->add_to_cart( $kit_id, 1 );

			if ( $res ) {
				wc_add_notice(
					$replaced > 0
						? __( 'Research Supplies Kit added — individual supplies were swapped out.', 'roji-child' )
						: __( 'Research Supplies Kit added to your order.', 'roji-child' ),
					'success'
				);
			}

			$ref = wp_get_referer();
			wp_safe_redirect( $ref ? $ref : wc_get_cart_url() );
			exit;
		}

		if ( empty( $_POST['roji_add_supplies'] ) ) {
			return;
		}
		if ( ! isset( $_POST['_rcu_nonce'] ) ) {
			return;
		}
		$nonce = sanitize_text_field( wp_unslash( $_POST['_rcu_nonce'] ) );
		if ( ! wp_verify_nonce( $nonce, 'roji_add_supplies' ) ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
			return;
		}

		$picked = isset( $_POST['supplies'] ) && is_array( $_POST['supplies'] )
			? array_map( 'sanitize_key', wp_unslash( $_POST['supplies'] ) )
			: array();

		$added = 0;
		foreach ( $picked as $key ) {
			$pid = roji_supply_product_id( $key );
			if ( $pid <= 0 ) {
				continue;
			}
			// Don't add a second copy if it's already in the cart.
			if ( roji_cart_contains_product( $pid ) ) {
				continue;
			}
			$res = WC()->cart->add_to_cart( $pid, 1 );
			if ( $res ) {
				$added++;
			}
		}

		if ( $added > 0 ) {
			wc_add_notice(
				sprintf(
					/* translators: 1: number of supply items added to cart. */
					_n( '%d supply added to your order.', '%d supplies added to your order.', $added, 'roji-child' ),
					$added
				),
				'success'
			);
		}

		// Redirect back to whatever page they were on (cart or checkout) so
		// the order totals refresh and the upsell card recomputes.
		$ref = wp_get_referer();
		wp_safe_redirect( $ref ? $ref : wc_get_cart_url() );
		exit;
	}
);

/* -------------------------------------------------------------------------- */
/* Render hooks — cart page + checkout page                                   */
/* -------------------------------------------------------------------------- */

// Cart page — sits below the cart table, above the cross-sells.
add_action( 'woocommerce_after_cart_table', 'roji_render_cart_upsell', 5 );

// Checkout page — sits above the order review so it's impossible to miss.
add_action( 'woocommerce_checkout_before_order_review_heading', 'roji_render_cart_upsell', 5 );

/**
 * Render the supply upsell card. No-op when no stack is in the cart, or
 * when every recommended supply is already in the cart.
 */
function roji_render_cart_upsell() {
	if ( ! function_exists( 'WC' ) || null === WC()->cart || WC()->cart->is_empty() ) {
		return;
	}

	if ( ! roji_cart_contains_any_stack() ) {
		return;
	}

	// If the kit is already in the cart, the customer has every
	// consumable we'd suggest — skip the entire upsell card.
	$kit_id_check = roji_supply_kit_product_id();
	if ( $kit_id_check > 0 && roji_cart_contains_product( $kit_id_check ) ) {
		return;
	}

	$catalog = roji_supply_upsell_catalog();
	if ( empty( $catalog ) ) {
		return;
	}

	// Filter to only supplies the cart doesn't already have.
	$missing = array_filter(
		$catalog,
		function ( $entry ) {
			return ! roji_cart_contains_product( (int) $entry['id'] );
		}
	);

	if ( empty( $missing ) ) {
		return;
	}

	// Kit upsell — only worth surfacing when 2+ of the 3 supplies are
	// missing AND the kit product is seeded AND it isn't already in the
	// cart. With only 1 missing item, the kit math no longer "saves"
	// the customer money, so we keep the simpler checkbox-only UI.
	$kit_id      = roji_supply_kit_product_id();
	$kit_product = $kit_id > 0 ? wc_get_product( $kit_id ) : null;
	$show_kit    = (
		$kit_product
		&& $kit_product->is_purchasable()
		&& $kit_product->is_in_stock()
		&& count( $missing ) >= 2
		&& ! roji_cart_contains_product( $kit_id )
	);

	?>
	<div
		class="roji-supply-upsell"
		style="
			background: linear-gradient(180deg, rgba(79,109,245,0.10) 0%, rgba(79,109,245,0.04) 100%);
			border: 1px solid rgba(79,109,245,0.30);
			border-radius: 10px;
			padding: 20px 22px;
			margin: 24px 0;
			color: var(--roji-text, #f0f0f5);
		"
	>
		<div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-bottom:14px;">
			<div style="flex:1;min-width:240px;">
				<div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#4f6df5;margin-bottom:6px;">
					Suggested
				</div>
				<div style="font-size:17px;font-weight:600;line-height:1.3;">
					Do you also need these?
				</div>
				<div style="font-size:13px;color:#8a8a9a;margin-top:6px;line-height:1.5;">
					Most researchers running a Roji stack also need bacteriostatic
					water, insulin syringes, and alcohol swabs. Add what&apos;s
					missing in one click.
				</div>
			</div>
		</div>

		<?php if ( $show_kit ) :
			$kit_price     = (float) $kit_product->get_price();
			$missing_total = 0.0;
			foreach ( $missing as $entry ) {
				$missing_total += (float) $entry['price'];
			}
			$savings = max( 0.0, $missing_total - $kit_price );
			?>
			<form method="post" action="" style="margin:0 0 14px;">
				<?php wp_nonce_field( 'roji_add_supplies', '_rcu_nonce' ); ?>
				<input type="hidden" name="roji_add_kit" value="1" />
				<button
					type="submit"
					class="roji-supply-kit-cta"
					style="
						display:flex;align-items:center;gap:14px;
						width:100%;text-align:left;
						background:linear-gradient(180deg, rgba(79,109,245,0.18) 0%, rgba(79,109,245,0.08) 100%);
						border:1px solid rgba(79,109,245,0.55);
						border-radius:10px;
						padding:14px 16px;
						color:#f0f0f5;
						cursor:pointer;
						font:inherit;
						box-shadow:0 0 24px rgba(79,109,245,0.18);
						transition:box-shadow 150ms ease, border-color 150ms ease, background-color 150ms ease;
					"
					onmouseover="this.style.boxShadow='0 0 36px rgba(79,109,245,0.35)';this.style.borderColor='rgba(79,109,245,0.85)';"
					onmouseout="this.style.boxShadow='0 0 24px rgba(79,109,245,0.18)';this.style.borderColor='rgba(79,109,245,0.55)';"
				>
					<div style="
						width:36px;height:36px;flex-shrink:0;
						border-radius:8px;
						background:rgba(79,109,245,0.25);
						display:flex;align-items:center;justify-content:center;
						font-family:ui-monospace,monospace;font-size:18px;color:#fff;font-weight:700;
					">+</div>
					<div style="flex:1;min-width:0;">
						<div style="font-size:14px;font-weight:700;line-height:1.3;color:#fff;">
							Or grab all three: Research Supplies Kit
						</div>
						<div style="font-size:12px;color:#b8b8c8;margin-top:3px;line-height:1.45;">
							<?php
							echo esc_html( sprintf(
								/* translators: 1: kit price, 2: savings amount. */
								__( 'One click — %1$s. Save %2$s vs. adding them separately.', 'roji-child' ),
								wp_strip_all_tags( wc_price( $kit_price ) ),
								wp_strip_all_tags( wc_price( $savings ) )
							) );
							?>
						</div>
					</div>
					<div style="
						font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.16em;
						text-transform:uppercase;color:#4f6df5;flex-shrink:0;
						border:1px solid rgba(79,109,245,0.55);
						border-radius:999px;
						padding:5px 10px;
					">
						Add kit
					</div>
				</button>
			</form>

			<div style="
				display:flex;align-items:center;gap:10px;
				margin:0 0 12px;font-size:11px;color:#55556a;
				text-transform:uppercase;letter-spacing:0.18em;font-family:ui-monospace,monospace;
			">
				<span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span>
				<span>or pick what you need</span>
				<span style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></span>
			</div>
		<?php endif; ?>

		<form method="post" action="" style="margin:0;">
			<?php wp_nonce_field( 'roji_add_supplies', '_rcu_nonce' ); ?>
			<input type="hidden" name="roji_add_supplies" value="1" />

			<div style="display:grid;gap:10px;margin:14px 0 16px;">
				<?php foreach ( $missing as $key => $entry ) : ?>
					<label
						for="roji-supply-<?php echo esc_attr( $key ); ?>"
						style="
							display:flex;align-items:center;gap:14px;
							background:rgba(255,255,255,0.025);
							border:1px solid rgba(255,255,255,0.08);
							border-radius:8px;
							padding:12px 14px;
							cursor:pointer;
							transition:border-color 120ms ease,background-color 120ms ease;
						"
						onmouseover="this.style.borderColor='rgba(79,109,245,0.45)';this.style.backgroundColor='rgba(79,109,245,0.06)';"
						onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.backgroundColor='rgba(255,255,255,0.025)';"
					>
						<input
							id="roji-supply-<?php echo esc_attr( $key ); ?>"
							type="checkbox"
							name="supplies[]"
							value="<?php echo esc_attr( $key ); ?>"
							checked="checked"
							style="
								width:18px;height:18px;accent-color:#4f6df5;flex-shrink:0;
								cursor:pointer;
							"
						/>
						<div style="flex:1;min-width:0;">
							<div style="font-size:14px;font-weight:600;color:#f0f0f5;">
								<?php echo esc_html( $entry['name'] ); ?>
							</div>
							<div style="font-size:12px;color:#8a8a9a;margin-top:2px;line-height:1.4;">
								<?php echo esc_html( $entry['why'] ); ?>
							</div>
						</div>
						<div style="font-family:ui-monospace,monospace;font-size:14px;color:#f0f0f5;flex-shrink:0;">
							<?php echo wp_kses_post( wc_price( $entry['price'] ) ); ?>
						</div>
					</label>
				<?php endforeach; ?>
			</div>

			<button
				type="submit"
				class="button alt"
				style="
					background:#4f6df5;
					border:none;
					color:white;
					padding:12px 22px;
					border-radius:8px;
					font-weight:600;
					font-size:14px;
					cursor:pointer;
					box-shadow: 0 0 24px rgba(79,109,245,0.25);
					transition: box-shadow 150ms ease;
				"
				onmouseover="this.style.boxShadow='0 0 36px rgba(79,109,245,0.40)';"
				onmouseout="this.style.boxShadow='0 0 24px rgba(79,109,245,0.25)';"
			>
				Add selected to order
			</button>

			<p style="margin:10px 0 0;font-size:11px;color:#55556a;line-height:1.5;">
				Uncheck anything you already have. Your stack alone won&apos;t
				ship with consumables.
			</p>
		</form>
	</div>
	<?php
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Default supply catalog used by the upsell. Each entry: product ID,
 * customer-facing name, why-line, and price (read fresh from the product
 * so we never desync). Filterable so additional SKUs can be appended.
 *
 * @return array<string, array{id:int,name:string,why:string,price:float}>
 */
function roji_supply_upsell_catalog() {
	$out = array();

	$defs = array(
		'bac_water' => array(
			'name' => 'Bacteriostatic Water (30ml)',
			'why'  => 'For reconstitution. One vial covers a 4-week stack.',
		),
		'syringes'  => array(
			'name' => 'Insulin Syringes (100-pack)',
			'why'  => '0.5cc · 29G · sealed sterile.',
		),
		'swabs'     => array(
			'name' => 'Alcohol Swabs (200-pack)',
			'why'  => 'Pre-injection prep. Individually wrapped.',
		),
	);

	foreach ( $defs as $key => $meta ) {
		$pid = roji_supply_product_id( $key );
		if ( $pid <= 0 ) {
			continue;
		}
		$product = wc_get_product( $pid );
		if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
			continue;
		}
		$out[ $key ] = array(
			'id'    => $pid,
			'name'  => isset( $meta['name'] ) ? $meta['name'] : $product->get_name(),
			'why'   => isset( $meta['why'] ) ? $meta['why'] : '',
			'price' => (float) $product->get_price(),
		);
	}

	/**
	 * Filter the catalog of suggested supplies surfaced at cart / checkout.
	 *
	 * @param array $out The default catalog (key => array of id/name/why/price).
	 */
	return apply_filters( 'roji_cart_upsell_supplies', $out );
}

/**
 * True if the current cart contains any product that counts as a stack
 * (one-time bundle OR autoship sibling).
 */
function roji_cart_contains_any_stack() {
	if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
		return false;
	}
	$stack_ids = roji_stack_product_ids();
	if ( empty( $stack_ids ) ) {
		return false;
	}
	foreach ( WC()->cart->get_cart() as $line ) {
		$pid = isset( $line['product_id'] ) ? (int) $line['product_id'] : 0;
		if ( $pid > 0 && in_array( $pid, $stack_ids, true ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Remove every individual supply line (BAC, syringes, swabs) from the
 * cart. Used when the customer accepts the kit upsell so we don't
 * charge twice for the same consumables.
 *
 * @return int Number of cart lines removed.
 */
function roji_remove_individual_supplies_from_cart() {
	if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
		return 0;
	}
	$supply_ids = array_filter(
		array(
			roji_supply_product_id( 'bac_water' ),
			roji_supply_product_id( 'syringes' ),
			roji_supply_product_id( 'swabs' ),
		)
	);
	if ( empty( $supply_ids ) ) {
		return 0;
	}
	$removed = 0;
	foreach ( WC()->cart->get_cart() as $key => $line ) {
		$pid = isset( $line['product_id'] ) ? (int) $line['product_id'] : 0;
		if ( $pid > 0 && in_array( $pid, $supply_ids, true ) ) {
			WC()->cart->remove_cart_item( $key );
			$removed++;
		}
	}
	return $removed;
}

/**
 * True if the given product ID is already in the cart (any quantity).
 */
function roji_cart_contains_product( $product_id ) {
	if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
		return false;
	}
	foreach ( WC()->cart->get_cart() as $line ) {
		if ( isset( $line['product_id'] ) && (int) $line['product_id'] === (int) $product_id ) {
			return true;
		}
	}
	return false;
}
