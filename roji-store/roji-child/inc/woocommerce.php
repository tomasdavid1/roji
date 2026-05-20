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

/**
 * Paid-traffic homepage redirect: send Google Ads clicks landing on
 * the bare homepage straight to /shop/ so they see products
 * immediately instead of the marketing hero.
 *
 * History:
 *   2026-05-07: First shipped on `template_redirect` priority 1.
 *   2026-05-10: GA4 reports 10/10 paid `cpc` sessions in 14 days
 *               STILL landing on /, not /shop/. Root cause: LiteSpeed
 *               Cache normalizes `?gclid=…` to the same cache key as
 *               `/` and serves the static cached homepage HTML before
 *               PHP ever runs. `template_redirect` is too late.
 *               Moved to `parse_request` (the earliest hook that has
 *               $_GET reliably populated and runs before any cache
 *               layer's "is this cacheable?" decision is final), and
 *               we force no-cache on responses with paid params so
 *               LiteSpeed can't reuse them across visitors.
 *
 * Detection rule: any URL param that Google Ads ever attaches to a
 * paid click — gclid (standard), gbraid / wbraid (iOS/Privacy
 * Sandbox variants), gclsrc, or our own utm_medium=cpc convention.
 * That's the same signal Google Ads uses to attribute conversions,
 * so it's reliable and survives Cloudflare's URL-stripping rules.
 *
 * Important: we preserve the FULL query string in the redirect target
 * so the gclid travels with the user to /shop/ and lands in their
 * GA4 session — losing it would break Ads conversion attribution.
 *
 * Bots: any bot UA bypasses the redirect so search engines keep
 * indexing the marketing homepage for SEO. We use 302 (temporary)
 * not 301 (permanent) so search engines never index the redirect.
 */
function roji_paid_homepage_request_is_paid() {
	$paid_param_keys = array( 'gclid', 'gbraid', 'wbraid', 'gclsrc' );
	foreach ( $paid_param_keys as $k ) {
		if ( ! empty( $_GET[ $k ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return true;
		}
	}
	if ( isset( $_GET['utm_medium'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$medium = strtolower( sanitize_text_field( wp_unslash( $_GET['utm_medium'] ) ) );
		if ( in_array( $medium, array( 'cpc', 'ppc', 'paid', 'paidsearch' ), true ) ) {
			return true;
		}
	}
	return false;
}

function roji_paid_homepage_is_homepage_request() {
	$path = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ) : '/';
	$path = $path === false || $path === null ? '/' : $path;
	return ( $path === '/' || $path === '' || $path === '/index.php' );
}

function roji_paid_homepage_is_bot() {
	$ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
	return $ua && (bool) preg_match( '/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot/i', $ua );
}

/**
 * Tell LiteSpeed (and any other HTTP-cache layer) NOT to cache this
 * response. We do this on EVERY request that carries paid params,
 * even before we decide whether to redirect, because the cache key
 * may strip the gclid and reuse this response for a non-paid visitor.
 */
function roji_paid_homepage_send_nocache_headers() {
	if ( ! headers_sent() ) {
		nocache_headers();
		header( 'X-LiteSpeed-Cache-Control: no-cache' );
		header( 'X-LiteSpeed-Vary: roji_paid' );
	}
	if ( function_exists( 'do_action' ) ) {
		do_action( 'litespeed_control_set_nocache', 'roji paid homepage redirect' );
	}
}

/**
 * Run the redirect as early as possible. `send_headers` runs before
 * the response body is generated and (critically) before any
 * full-page cache layer commits a cached entry. We also attach to
 * `init` as a belt-and-suspenders for cases where send_headers is
 * skipped (e.g. early die() in another plugin).
 */
function roji_paid_homepage_maybe_redirect() {
	if ( is_admin() ) {
		return;
	}
	if ( wp_doing_ajax() || wp_doing_cron() ) {
		return;
	}
	if ( ! roji_paid_homepage_is_homepage_request() ) {
		return;
	}
	if ( ! roji_paid_homepage_request_is_paid() ) {
		return;
	}
	// Always mark non-cacheable on paid-params requests, even if we
	// then bail out (bot, logged-in editor) — a cached response
	// would be a worse failure mode than firing the redirect twice.
	roji_paid_homepage_send_nocache_headers();

	if ( roji_paid_homepage_is_bot() ) {
		return;
	}
	if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) {
		return;
	}

	$shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
	$qs       = isset( $_SERVER['QUERY_STRING'] ) ? (string) $_SERVER['QUERY_STRING'] : '';
	if ( $qs ) {
		$shop_url .= ( false === strpos( $shop_url, '?' ) ? '?' : '&' ) . $qs;
	}
	wp_safe_redirect( $shop_url, 302 );
	exit;
}

// `send_headers` is the earliest hook with HTTP headers still mutable
// where we have a fully-bootstrapped WP and access to $_GET.
add_action( 'send_headers', 'roji_paid_homepage_maybe_redirect', 1 );

// Belt-and-suspenders: also fire from template_redirect (after the
// query is parsed) for the rare path where send_headers didn't run.
add_action( 'template_redirect', 'roji_paid_homepage_maybe_redirect', 1 );

/**
 * Server-side fallback: if for ANY reason both the send_headers and
 * template_redirect hooks fail to redirect a paid visitor (e.g. a
 * cache layer ahead of PHP serves a cached body), this client-side
 * redirect runs the moment the cached HTML hits the browser.
 *
 * It only fires on the homepage AND only when paid params are
 * present in the URL — same gating as the server-side rule. The
 * full query string travels along so gclid attribution survives.
 *
 * This adds ~50ms of extra navigation latency in the cache-failure
 * path, which is far better than landing on the wrong page.
 */
add_action(
	'wp_head',
	function () {
		if ( ! roji_paid_homepage_is_homepage_request() ) {
			return;
		}
		if ( is_user_logged_in() && current_user_can( 'edit_posts' ) ) {
			return;
		}
		?>
<script>
(function () {
  try {
    var p = new URLSearchParams(window.location.search);
    var paid = ['gclid','gbraid','wbraid','gclsrc'].some(function(k){ return !!p.get(k); }) ||
               ['cpc','ppc','paid','paidsearch'].indexOf((p.get('utm_medium')||'').toLowerCase()) !== -1;
    if (!paid) return;
    var qs = window.location.search || '';
    window.location.replace('/shop/' + qs);
  } catch (e) { /* noop */ }
})();
</script>
		<?php
	},
	1
);

/* -----------------------------------------------------------------------------
 * One-page cart + checkout
 *
 * 2026-05-20: data showed /cart/ → /checkout/ was the worst drop in
 * the funnel (4 cart sessions, 0 begin_checkout events in 2 weeks).
 * The cart page was a friction wall, not a feature — its job ("review
 * what you added") is identical to what the checkout page already
 * does in its order-review section, just on a separate URL.
 *
 * The fix is two parts:
 *
 *   1. Auto-redirect /cart/ → /checkout/ when the cart has items.
 *      Empty carts still get the branded /cart/ empty-state, because
 *      WooCommerce's checkout page itself redirects empty carts back
 *      to /cart/ — we honor that loop terminator.
 *
 *   2. Render the cart line items as a "Your order" card at the top
 *      of /checkout/ (above the customer-details form). Includes
 *      thumbnail, name, quantity, line subtotal, and a remove link.
 *      The default order-review table at the bottom is kept for
 *      totals + payment + place-order, with its line-item rows
 *      hidden via CSS (style.css → .roji-checkout-merge-cart).
 *
 * Together this collapses the funnel from 5 steps (PDP → ATC → cart →
 * checkout → place order) to 3 (PDP → ATC → checkout → place order)
 * and removes the highest-drop transition.
 * -------------------------------------------------------------------------- */

/**
 * Auto-redirect /cart/ → /checkout/ when the cart has at least one item.
 *
 * Empty carts are left on /cart/ so the branded
 * woocommerce/cart/cart-empty.php template can render. Logged-in admins
 * can still inspect the cart page via ?roji_keep_cart=1 for QA.
 *
 * Hooks on `template_redirect` priority 5, AFTER the protocol_stack
 * deep-link handler (which empties + repopulates the cart and then
 * redirects to /checkout/ on its own) so we don't double-redirect.
 */
add_action(
	'template_redirect',
	function () {
		if ( ! function_exists( 'is_cart' ) || ! is_cart() ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
			return;
		}
		if ( WC()->cart->is_empty() ) {
			return; // Branded empty-cart template handles this case.
		}
		// QA escape hatch for editors who need to see the cart page
		// (e.g. testing the cart-empty fallback or the legacy template).
		if (
			is_user_logged_in()
			&& current_user_can( 'edit_posts' )
			&& ! empty( $_GET['roji_keep_cart'] ) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		) {
			return;
		}
		// Preserve any tracking / coupon query params on the way to
		// /checkout/ so we don't lose attribution context.
		$qs = isset( $_SERVER['QUERY_STRING'] ) ? (string) $_SERVER['QUERY_STRING'] : '';
		$to = wc_get_checkout_url();
		if ( $qs !== '' ) {
			$to .= ( false === strpos( $to, '?' ) ? '?' : '&' ) . $qs;
		}
		wp_safe_redirect( $to, 302 );
		exit;
	},
	5
);

/**
 * "Your order" cart-summary card at the top of /checkout/.
 *
 * Renders ABOVE the Reserve-Order reassurance card and the customer-
 * details form so the user reviews what they're buying first, then
 * fills in shipping, then sees totals + place-order at the bottom —
 * the standard ecommerce flow, all on one URL.
 *
 * Each line item shows a thumbnail, product name (passes through the
 * existing `woocommerce_cart_item_name` filter so the per-week
 * caption from the protocol-engine deep-link still appears),
 * quantity, line subtotal, and an inline remove button. Clicking
 * remove uses WooCommerce's own /?remove_item= endpoint which
 * round-trips through the standard cart API and sends the user back
 * to /checkout/.
 *
 * Hooked on woocommerce_before_checkout_form at priority 2 so it
 * appears BEFORE the reassurance card (priority 3) and any other
 * pre-form widgets. The default order_review table at the bottom of
 * the page keeps the totals + payment + place-order button; its
 * line-item rows are CSS-hidden so we don't duplicate the items.
 */
add_action(
	'woocommerce_before_checkout_form',
	function () {
		if ( ! function_exists( 'WC' ) || null === WC()->cart ) {
			return;
		}
		$cart = WC()->cart;
		if ( $cart->is_empty() ) {
			return;
		}
		// Tag the body so style.css can hide the duplicate line-item
		// rows in the bottom order-review table for this page only.
		?>
<script>document.documentElement.classList.add('roji-checkout-merge-cart');</script>
<section class="roji-checkout-cart-summary" aria-label="Your order">
	<header class="roji-checkout-cart-summary__head">
		<span class="roji-checkout-cart-summary__eyebrow">Your order</span>
		<a class="roji-checkout-cart-summary__continue" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">← Keep shopping</a>
	</header>
	<ul class="roji-checkout-cart-summary__list">
		<?php
		foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
			$product = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
			if ( ! $product || ! $product->exists() || (int) $cart_item['quantity'] <= 0 ) {
				continue;
			}
			$thumb         = $product->get_image( 'woocommerce_gallery_thumbnail' );
			$name_html     = apply_filters( 'woocommerce_cart_item_name', $product->get_name(), $cart_item, $cart_item_key );
			$line_subtotal = $cart->get_product_subtotal( $product, $cart_item['quantity'] );
			$remove_url    = wc_get_cart_remove_url( $cart_item_key );
			$qty_label     = sprintf(
				/* translators: %d = quantity */
				_n( 'Qty %d', 'Qty %d', (int) $cart_item['quantity'], 'roji-child' ),
				(int) $cart_item['quantity']
			);
			?>
			<li class="roji-checkout-cart-summary__item">
				<div class="roji-checkout-cart-summary__thumb"><?php echo $thumb; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
				<div class="roji-checkout-cart-summary__name"><?php echo wp_kses_post( $name_html ); ?></div>
				<div class="roji-checkout-cart-summary__meta">
					<span class="roji-checkout-cart-summary__qty"><?php echo esc_html( $qty_label ); ?></span>
					<span class="roji-checkout-cart-summary__price"><?php echo wp_kses_post( $line_subtotal ); ?></span>
				</div>
				<a
					class="roji-checkout-cart-summary__remove"
					href="<?php echo esc_url( $remove_url ); ?>"
					aria-label="<?php
					/* translators: %s = product name */
					echo esc_attr( sprintf( __( 'Remove %s from order', 'roji-child' ), wp_strip_all_tags( $product->get_name() ) ) );
					?>"
				>×</a>
			</li>
			<?php
		}
		?>
	</ul>
</section>
		<?php
	},
	2 // Before the reassurance card (priority 3).
);

/**
 * Checkout-page trust + "what happens next" banner.
 *
 * Why: walkthrough on 2026-05-10 caught that the checkout page opens
 * with 9 required-field rows and zero context. Real first-time
 * visitors arriving from a paid ad have no idea (a) that no card is
 * charged today, (b) that we'll email a payment link, (c) that the
 * order is reserved while we confirm. The Reserve Order gateway
 * description explains all of this — but it's at the bottom of the
 * form, after the user has already decided to bail.
 *
 * Placement: woocommerce_before_checkout_form fires BEFORE the form
 * opens (not before the order-review section), so this block sits at
 * the very top of /checkout/, above the existing Trustpilot mini
 * widget and the supply upsell. Three short reassurance lines,
 * formatted as a card so the eye reads them in <2 seconds.
 *
 * Hidden if the user is logged in and already has past orders — they
 * already know how this works.
 */
add_action(
	'woocommerce_before_checkout_form',
	function () {
		if ( is_user_logged_in() ) {
			$customer_id = get_current_user_id();
			$has_orders  = wc_get_orders(
				array(
					'customer_id' => $customer_id,
					'limit'       => 1,
					'status'      => array( 'on-hold', 'processing', 'completed' ),
					'return'      => 'ids',
				)
			);
			if ( ! empty( $has_orders ) ) {
				return;
			}
		}
		?>
<div class="roji-checkout-reassure" role="region" aria-label="What happens next">
	<div class="roji-checkout-reassure__title">What happens after you place the order</div>
	<ul class="roji-checkout-reassure__list">
		<li><strong>Nothing is charged today.</strong> No card details collected on this page.</li>
		<li><strong>You'll get a secure payment link by email within 24 hours.</strong> Pay then; your order ships after.</li>
		<li><strong>No account needed.</strong> Just shipping + email so we can send the link.</li>
	</ul>
</div>
		<?php
	},
	3
);

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
		// Skip /cart/ — the cart contents now render at the top of
		// /checkout/ as the "Your order" card (see hook below).
		wp_safe_redirect( wc_get_checkout_url() );
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

		// /shop/ defaults to the Individuals view (changed 2026-05-06).
		// Most paid-search traffic arrives from compound-name keywords
		// (`bpc 157`, `tb 500`, etc.) and wants to see one product
		// matching that compound, not a bundle they didn't search for.
		// Researchers who *do* want the bundle savings can opt in via
		// the chip filter; a small inline tip on the individuals view
		// keeps the savings story discoverable without stealing focus
		// from the products themselves.
		// ?roji_view=all is the explicit opt-in to see everything
		// (single + autoship + supplies + bundles).
		$requested_view = isset( $_GET['roji_view'] ) ? sanitize_key( wp_unslash( $_GET['roji_view'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		$current_view = '';
		if ( is_shop() && '' === $requested_view ) {
			$current_view = 'individuals';
		} elseif ( 'bundles' === $requested_view ) {
			$current_view = 'bundles';
		} elseif ( 'all' === $requested_view ) {
			$current_view = 'all';
		} elseif ( is_product_category( 'accessories' ) ) {
			$current_view = 'supplies';
		} elseif ( is_product_category( roji_individuals_category_slug() ) ) {
			$current_view = 'individuals';
		} elseif ( is_product_taxonomy() ) {
			$term         = get_queried_object();
			$current_view = isset( $term->slug ) ? $term->slug : '';
		}

		// Order chosen deliberately: Individuals first (the default
		// landing — what compound-name searchers came for), Bundles
		// second (the savings upsell), Supplies, then All.
		$individuals_term_link = get_term_link( roji_individuals_category_slug(), 'product_cat' );
		$chips = array(
			array(
				'label' => __( 'Individuals', 'roji-child' ),
				'url'   => $shop_url, // canonical /shop/ now lands on individuals
				'key'   => 'individuals',
			),
			array(
				'label' => __( 'Bundles', 'roji-child' ),
				'url'   => add_query_arg( 'roji_view', 'bundles', $shop_url ),
				'key'   => 'bundles',
			),
			array(
				'label' => __( 'Supplies', 'roji-child' ),
				'url'   => get_term_link( 'accessories', 'product_cat' ),
				'key'   => 'supplies',
			),
			array(
				'label' => __( 'All', 'roji-child' ),
				'url'   => add_query_arg( 'roji_view', 'all', $shop_url ),
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
 * Restrict the shop loop based on `?roji_view`:
 *   - default (no param) → individual compounds (changed 2026-05-06;
 *     paid-search traffic arrives from compound-name keywords and
 *     wants to see those products, not a bundle upsell)
 *   - `?roji_view=bundles` → only bundle categories
 *   - `?roji_view=all` → no taxonomy restriction
 *   - any other value → passes through unchanged
 *
 * Uses the main query's tax_query via pre_get_posts so pagination +
 * sorting still behave.
 */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() || ! $q->is_main_query() ) {
			return;
		}
		if ( ! ( is_shop() || is_post_type_archive( 'product' ) ) ) {
			return;
		}
		$requested_view = isset( $_GET['roji_view'] ) ? sanitize_key( wp_unslash( $_GET['roji_view'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		$tax_query = (array) $q->get( 'tax_query' );

		if ( '' === $requested_view ) {
			// Default landing — restrict to the individuals category.
			$tax_query[] = array(
				'taxonomy' => 'product_cat',
				'field'    => 'slug',
				'terms'    => array( roji_individuals_category_slug() ),
				'operator' => 'IN',
			);
			$q->set( 'tax_query', $tax_query );
			return;
		}

		if ( 'bundles' === $requested_view ) {
			$tax_query[] = array(
				'taxonomy' => 'product_cat',
				'field'    => 'slug',
				'terms'    => roji_bundle_category_slugs(),
				'operator' => 'IN',
			);
			$q->set( 'tax_query', $tax_query );
			return;
		}

		// `all` and any other value: no restriction.
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
 * NOTE: The above-grid "save by bundling" tip was removed 2026-05-06.
 *
 * Iteration history of this surface:
 *   2026-04   Full-width bordered card with an accent CTA pill —
 *             stole focus from the product grid.
 *   2026-05-06 (AM) Compressed to a one-line muted tip + inline link.
 *             Better, but still telling visitors who'd just landed
 *             ON Individuals that they should leave for Bundles.
 *   2026-05-06 (PM) Removed entirely. Each individual product card
 *             ALREADY shows a green "−$59 with the bundle" chip
 *             next to its price (see hook at priority 7 below),
 *             which implies the savings naturally without
 *             interrupting the grid. The stronger bundle pitch now
 *             lives on the individual PDP buy box, where someone
 *             who clicked through has signaled real intent in that
 *             specific compound and the upsell is contextual.
 *
 * The "$X with the bundle" per-card chip remains (next hook).
 */

/**
 * Inline "−$X bundle" chip appended to the price on each individual
 * product card. The savings number comes from `_bundle_savings_usd`
 * post-meta seeded by import-products.php; absent meta = no chip.
 *
 * 2026-05-07: previously rendered on its own row via
 * `woocommerce_after_shop_loop_item_title`, which pushed the savings
 * cue to a separate line below the price and added vertical noise to
 * the grid. Moved inline next to the price by appending into the
 * price HTML — visually one tight unit ($99 −$59 bundle). PDP price
 * is left alone because the dedicated bundle-pitch card in the buy
 * box already carries the upsell where intent is concentrated.
 */
add_filter(
	'woocommerce_get_price_html',
	function ( $price_html, $product ) {
		if ( ! $product instanceof WC_Product ) {
			return $price_html;
		}
		// Only render on loop / archive contexts. PDPs handle the
		// bundle pitch via the dedicated card in content-single-product.
		if ( ( function_exists( 'is_product' ) && is_product() ) || is_admin() ) {
			return $price_html;
		}
		$savings = (float) get_post_meta( $product->get_id(), '_bundle_savings_usd', true );
		if ( $savings <= 0 ) {
			return $price_html;
		}
		$chip = sprintf(
			'<span class="roji-price-bundle-chip" aria-label="%s">−$%s <span class="roji-price-bundle-chip__sub">bundle</span></span>',
			esc_attr( sprintf(
				/* translators: %s = dollar savings amount */
				__( 'Save $%s with the matching bundle', 'roji-child' ),
				number_format( $savings, 0 )
			) ),
			esc_html( number_format( $savings, 0 ) )
		);
		return $price_html . ' ' . $chip;
	},
	20,
	2
);

/**
 * Bundle-card excerpt on archives — show the short_description on
 * the three stack cards so a visitor scanning the Bundles tab can
 * tell at a glance what each one actually contains (compounds + the
 * "4-week supply" framing) without having to click into the PDP.
 *
 * Scoped to the three bundle products only via the `_protocol_stack`
 * post-meta (set in scripts/import-products.php to `wolverine`,
 * `recomp`, or `full`). Catches the autoship variants automatically
 * because they inherit the same meta. Individual-compound cards stay
 * lean — they only carry a one-line tagline plus the inline savings
 * chip, which is plenty for that grid.
 */
add_action(
	'woocommerce_after_shop_loop_item_title',
	function () {
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}
		// Bundles only — `_protocol_stack` is empty for individual
		// compounds and accessories.
		$is_bundle = (string) get_post_meta( $product->get_id(), '_protocol_stack', true );
		if ( '' === $is_bundle ) {
			return;
		}
		$excerpt = $product->get_short_description();
		if ( ! $excerpt ) {
			return;
		}
		printf(
			'<p class="roji-card-excerpt">%s</p>',
			wp_kses_post( $excerpt )
		);
	},
	8 // Between title (10 default → moved by parent) and price (10).
);
