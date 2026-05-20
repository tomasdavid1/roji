<?php
/**
 * Roji Child — Google Ads + GA4 tracking.
 *
 * - gtag.js bootstrap in <head>.
 * - WooCommerce purchase conversion + ecommerce items array on the
 *   thank-you page.
 *
 * Both sites (storefront + protocol engine) share the same AW account ID;
 * each fires events with its own conversion label.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * gtag.js bootstrap. No-op when no IDs are configured.
 */
add_action(
	'wp_head',
	function () {
		$ads_id = ROJI_GADS_ID;
		$ga4_id = ROJI_GA4_ID;
		if ( empty( $ads_id ) && empty( $ga4_id ) ) {
			return;
		}
		$primary_id = $ads_id ? $ads_id : $ga4_id;
		// Cross-domain linker config: keep gclid + GA4 client_id alive
		// when bouncing between rojipeptides.com (the store) and
		// tools.rojipeptides.com (the research-tools subdomain).
		// protocol.rojipeptides.com is included only as a redirect-shim
		// host so any legacy traffic 301'd through it preserves the
		// gclid as well. Override ROJI_GTAG_LINKER_DOMAINS in
		// wp-config.php for non-prod test pairs.
		$linker_domains = defined( 'ROJI_GTAG_LINKER_DOMAINS' )
			? (array) ROJI_GTAG_LINKER_DOMAINS
			: array( 'rojipeptides.com', 'tools.rojipeptides.com', 'protocol.rojipeptides.com' );
		$linker_json = wp_json_encode( array_values( array_filter( array_map( 'trim', $linker_domains ) ) ) );
		?>
<!-- Roji: Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr( $primary_id ); ?>"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
		<?php if ( $ga4_id ) : ?>
gtag('config', '<?php echo esc_js( $ga4_id ); ?>', { linker: { domains: <?php echo $linker_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> } });
		<?php endif; ?>
		<?php if ( $ads_id ) : ?>
gtag('config', '<?php echo esc_js( $ads_id ); ?>', { linker: { domains: <?php echo $linker_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> } });
		<?php endif; ?>
</script>
		<?php
	},
	1
);

/**
 * Fire `llm_referral` once per session whenever a visitor arrives via a
 * known LLM product (ChatGPT, Perplexity, Claude, Gemini, Copilot, etc.).
 *
 * Why a dedicated event?
 *   - GA4's source attribution lumps `chatgpt.com`, `perplexity.ai`,
 *     `claude.ai`, etc. under different mediums and sometimes misses
 *     the referrer entirely (desktop apps, in-page link openers).
 *   - Treating LLM-referred traffic as a first-class channel requires
 *     a stable event-level signal so we can build a "LLM funnel"
 *     report and import it as a Google Ads audience later.
 *
 * Detection runs client-side and tries TWO signals in order:
 *
 *   1. document.referrer — works for clients that send a Referer
 *      header (older or browser-resident LLMs).
 *
 *   2. ?utm_source=… — works when the LLM client strips Referer
 *      (most modern AI clients including ChatGPT desktop/iOS/Android
 *      and recent ChatGPT web). ChatGPT appends utm_source=chatgpt.com
 *      automatically; Claude does utm_source=claude.ai, etc.
 *
 * 2026-05-20 root-cause note
 * --------------------------
 * The original v1 only checked document.referrer and silently bailed
 * on empty. GA4 saw 14 chatgpt.com sessions in 30 days but recorded 0
 * llm_referral events — the referrer was being stripped by ChatGPT's
 * outbound-link policy. The utm_source fallback (added here) recovers
 * those sessions. We also send `detection_method` so we can verify in
 * GA4 which signal is actually catching production traffic.
 *
 * Data sent is non-PII (canonical LLM host, detection method, path).
 * sessionStorage flag prevents double-fires on internal navigation.
 */
add_action(
	'wp_footer',
	function () {
		if ( empty( ROJI_GA4_ID ) ) {
			return;
		}
		?>
<script>
(function () {
  if (typeof gtag !== 'function') return;
  try {
    if (window.sessionStorage.getItem('roji_llm_referral_fired_v1') === '1') return;
  } catch (e) { /* private mode / iframe — fall through */ }

  var llmHosts = {
    'chatgpt.com': 1, 'chat.openai.com': 1, 'openai.com': 1,
    'perplexity.ai': 1, 'www.perplexity.ai': 1,
    'claude.ai': 1, 'anthropic.com': 1,
    'gemini.google.com': 1, 'bard.google.com': 1,
    'copilot.microsoft.com': 1,
    'you.com': 1, 'phind.com': 1, 'kagi.com': 1, 'duckduckgo.com': 1,
    'poe.com': 1, 'character.ai': 1, 'groq.com': 1, 'mistral.ai': 1,
    'huggingface.co': 1
  };
  // utm_source short-form aliases → canonical host. Many LLMs tag
  // links with utm_source=<host> directly, in which case llmHosts
  // already covers it; this only catches the short forms.
  var utmAlias = {
    'chatgpt': 'chatgpt.com',
    'openai': 'openai.com',
    'perplexity': 'perplexity.ai',
    'claude': 'claude.ai',
    'anthropic': 'anthropic.com',
    'gemini': 'gemini.google.com',
    'bard': 'bard.google.com',
    'copilot': 'copilot.microsoft.com',
    'bing-chat': 'copilot.microsoft.com'
  };

  var source = null;
  var method = null;

  // 1) Try document.referrer.
  if (document.referrer) {
    try {
      var host = new URL(document.referrer).hostname.toLowerCase();
      if (llmHosts[host]) { source = host; method = 'referrer'; }
    } catch (e) { /* malformed referrer */ }
  }

  // 2) Fall back to utm_source (covers Referer-stripping clients).
  if (!source) {
    try {
      var raw = (new URLSearchParams(window.location.search).get('utm_source') || '')
        .toLowerCase().trim();
      if (raw) {
        if (llmHosts[raw]) { source = raw; method = 'utm_source'; }
        else if (utmAlias[raw]) { source = utmAlias[raw]; method = 'utm_source'; }
      }
    } catch (e) { /* querystring parse failed */ }
  }

  if (!source) return;

  gtag('event', 'llm_referral', {
    llm_source: source,
    detection_method: method,
    landing_path: window.location.pathname,
    landing_host: window.location.hostname
  });
  try { window.sessionStorage.setItem('roji_llm_referral_fired_v1', '1'); }
  catch (e) { /* ignore */ }
})();
</script>
		<?php
	},
	2  // Run early so it fires before page-specific scripts may navigate.
);

/**
 * Fire `add_to_cart` (+ optional Google Ads conversion) whenever a user
 * actually adds something to their cart — from anywhere on the site
 * (single-product page, shop archive, cart upsell, tools deep-link).
 *
 * Mechanism:
 *   1. The `woocommerce_add_to_cart` action runs server-side as soon as
 *      WC accepts the add. We capture the product/variation/qty into a
 *      WC-session "flash" payload. This works for both classic POST adds
 *      (which redirect) and AJAX adds.
 *   2. On the *next* footer render — typically the cart page after the
 *      302, or any subsequent page if the user stayed put — we emit the
 *      gtag event once and clear the flash.
 *   3. For AJAX adds, the page does NOT reload, so we ALSO listen for
 *      jQuery's `added_to_cart` event on the client and fire gtag
 *      directly with the line item we just added.
 *
 * This is the standard ecommerce-tracking pattern: gtag fires whenever
 * an item enters the cart, regardless of source. The blueprint's
 * `add_to_cart` conversion action will pick this up.
 */
add_action(
	'woocommerce_add_to_cart',
	function ( $cart_item_key, $product_id, $quantity, $variation_id /* , $variation, $cart_item_data */ ) {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}
		$product = wc_get_product( $variation_id ? $variation_id : $product_id );
		if ( ! $product ) {
			return;
		}
		$qty   = max( 1, (int) $quantity );
		$price = (float) $product->get_price();
		$flash = array(
			'value'    => round( $price * $qty, 2 ),
			'currency' => get_woocommerce_currency(),
			'items'    => array(
				array(
					'item_id'   => (string) $product->get_sku(),
					'item_name' => (string) $product->get_name(),
					'price'     => $price,
					'quantity'  => $qty,
				),
			),
		);
		WC()->session->set( 'roji_add_to_cart_flash', $flash );
	},
	10,
	4
);

/**
 * Drain the `add_to_cart` flash on the next footer render (the page the
 * user lands on after the POST redirect, e.g. /cart/).
 */
add_action(
	'wp_footer',
	function () {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}
		$flash = WC()->session->get( 'roji_add_to_cart_flash' );
		if ( empty( $flash ) ) {
			return;
		}
		// One-shot: clear before emitting so a hard reload doesn't double-fire.
		WC()->session->set( 'roji_add_to_cart_flash', null );

		$ads_label = defined( 'ROJI_GADS_ADD_TO_CART_LABEL' ) ? ROJI_GADS_ADD_TO_CART_LABEL : '';
		?>
<script>
(function () {
  if (typeof gtag !== 'function') return;
  var payload = <?php echo wp_json_encode( $flash ); ?>;
  gtag('event', 'add_to_cart', payload);
		<?php if ( ! empty( ROJI_GADS_ID ) && ! empty( $ads_label ) ) : ?>
  gtag('event', 'conversion', {
    send_to: '<?php echo esc_js( ROJI_GADS_ID . '/' . $ads_label ); ?>',
    value: payload.value,
    currency: payload.currency
  });
		<?php endif; ?>
})();
</script>
		<?php
	},
	30
);

/**
 * AJAX add-to-cart: WooCommerce fires the jQuery event `added_to_cart`
 * on success without a full page reload, so the session-flash drain
 * above never runs. Hook into that event client-side and fire gtag
 * directly. We don't have the line item in the event payload, so we
 * read the latest added line from `wc_fragments` if available, and
 * fall back to a minimal payload otherwise.
 */
add_action(
	'wp_footer',
	function () {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		// Only wire on pages where AJAX add-to-cart can happen
		// (shop archive, single product, related products). Skip cart
		// page itself — there the session flash already fired.
		if ( ! function_exists( 'is_woocommerce' ) ) {
			return;
		}
		if ( function_exists( 'is_cart' ) && is_cart() ) {
			return;
		}
		if ( ! ( is_woocommerce() || is_shop() || is_product_category() || is_product_tag() || is_product() || is_front_page() || is_home() ) ) {
			return;
		}
		$ads_label = defined( 'ROJI_GADS_ADD_TO_CART_LABEL' ) ? ROJI_GADS_ADD_TO_CART_LABEL : '';
		$ads_id    = ROJI_GADS_ID;
		?>
<script>
(function () {
  if (typeof window.jQuery !== 'function') return;
  jQuery(document.body).on('added_to_cart', function (event, fragments, cart_hash, $button) {
    if (typeof gtag !== 'function') return;
    var item = { item_id: '', item_name: '', price: 0, quantity: 1 };
    try {
      if ($button && $button.length) {
        item.item_id   = String($button.data('product_sku') || $button.data('product_id') || '');
        item.item_name = String($button.attr('aria-label') || $button.attr('title') || $button.text() || '').replace(/^add to cart:?\s*/i, '').trim();
        item.quantity  = parseInt($button.data('quantity'), 10) || 1;
      }
    } catch (e) { /* noop */ }
    var payload = {
      currency: '<?php echo esc_js( get_woocommerce_currency() ); ?>',
      value: 0,
      items: [item]
    };
    gtag('event', 'add_to_cart', payload);
		<?php if ( ! empty( $ads_id ) && ! empty( $ads_label ) ) : ?>
    gtag('event', 'conversion', {
      send_to: '<?php echo esc_js( $ads_id . '/' . $ads_label ); ?>',
      value: payload.value,
      currency: payload.currency
    });
		<?php endif; ?>
  });
})();
</script>
		<?php
	},
	31
);

/**
 * Fire generic funnel-step events on shop / PDP / cart / checkout pages
 * so we can build a clean funnel report in GA4 without relying solely
 * on `page_view` URL matching (which is fragile across WC versions).
 *
 *   - `shop_view`      — anywhere on the WC shop archive
 *   - `view_item`      — anywhere on a single-product page (GA4 standard)
 *   - `view_cart`      — anywhere on the cart page (GA4 standard)
 *   - `begin_checkout` — anywhere on the checkout page (GA4 standard)
 *
 * Each of view_item / view_cart / begin_checkout carries a GA4-standard
 * `items: [...]` array so the built-in ecommerce funnel + item-revenue
 * reports can attribute to specific products. Legacy event names
 * (product_view / cart_view / checkout_view) are dual-emitted for
 * backwards compatibility with existing audiences and reports.
 *
 * Combined with `roji-tools` events (`tool_view`, `directory_card_click`,
 * `store_outbound_click`) and `reserve_order_submitted` from the Reserve
 * gateway, this gives us the complete cross-domain funnel:
 *
 *   tool_view (tools.) → store_outbound_click → shop_view → view_item
 *   → add_to_cart → view_cart → begin_checkout → reserve_order_submitted
 *   (or purchase)
 */
add_action(
	'wp_footer',
	function () {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		if ( ! function_exists( 'is_shop' ) ) {
			return; // WC not loaded yet.
		}

		$event = '';
		$extra = array();

		if ( is_shop() || is_product_category() || is_product_tag() ) {
			$event = 'shop_view';
			$extra = array( 'shop_section' => is_shop() ? 'all' : ( is_product_category() ? 'category' : 'tag' ) );
		} elseif ( is_product() ) {
			// `view_item` is the GA4-standard ecommerce event name. We
			// previously emitted only `product_view` (a custom event),
			// which made GA4's built-in funnel + item-revenue reports
			// blind to PDP attention. Renamed 2026-05-15 to `view_item`
			// with the standard `items: [...]` shape so GA4 can compute
			// per-product `items_viewed` -> `items_added_to_cart` rates.
			// Legacy `product_view` is still emitted on the same load
			// so any existing report or audience keyed to the old name
			// keeps working.
			global $post;
			$product = $post ? wc_get_product( $post->ID ) : null;
			$event   = 'view_item';
			if ( $product ) {
				$item = array(
					'item_id'   => (string) $product->get_sku(),
					'item_name' => (string) $product->get_name(),
					'price'     => (float) $product->get_price(),
					'quantity'  => 1,
				);
				// Tag the primary category so GA4 can show "PDP views by
				// category" (peptides vs accessories vs bundles).
				$cats = wc_get_product_term_ids( $product->get_id(), 'product_cat' );
				if ( ! empty( $cats ) ) {
					$term = get_term( $cats[0], 'product_cat' );
					if ( $term && ! is_wp_error( $term ) ) {
						$item['item_category'] = (string) $term->name;
					}
				}
				$extra = array(
					'value'    => (float) $product->get_price(),
					'currency' => get_woocommerce_currency(),
					'items'    => array( $item ),
				);
			} else {
				$extra = array();
			}
		} elseif ( is_cart() ) {
			// `view_cart` is the GA4-standard ecommerce event name. We
			// previously emitted `cart_view`; renamed 2026-05-10 so
			// GA4's built-in funnel reports + Google Ads conversion
			// imports can see the cart-page visit. The legacy event
			// is also emitted on the same load so any existing report
			// or audience definition keyed to `cart_view` keeps working.
			$event = 'view_cart';
			$cart  = WC()->cart;
			if ( $cart ) {
				$items = array();
				foreach ( $cart->get_cart() as $cart_item ) {
					$product = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
					if ( ! $product ) { continue; }
					$items[] = array(
						'item_id'   => (string) $product->get_sku(),
						'item_name' => (string) $product->get_name(),
						'price'     => (float) $product->get_price(),
						'quantity'  => (int) $cart_item['quantity'],
					);
				}
				$extra = array(
					'value'       => (float) $cart->get_total( 'edit' ),
					'currency'    => get_woocommerce_currency(),
					'items_count' => (int) $cart->get_cart_contents_count(),
					'items'       => $items,
				);
			}
		} elseif ( is_checkout() && ! is_wc_endpoint_url( 'order-received' ) ) {
			// `begin_checkout` is the GA4-standard event. We previously
			// emitted `checkout_view`; renamed 2026-05-10 so GA4's
			// purchase-funnel reports + Google Ads "Begin checkout"
			// conversion can attribute. Legacy `checkout_view` still
			// fires below so existing reports don't go dark.
			$event = 'begin_checkout';
			$cart  = WC()->cart;
			if ( $cart ) {
				$items = array();
				foreach ( $cart->get_cart() as $cart_item ) {
					$product = isset( $cart_item['data'] ) ? $cart_item['data'] : null;
					if ( ! $product ) { continue; }
					$items[] = array(
						'item_id'   => (string) $product->get_sku(),
						'item_name' => (string) $product->get_name(),
						'price'     => (float) $product->get_price(),
						'quantity'  => (int) $cart_item['quantity'],
					);
				}
				$extra = array(
					'value'       => (float) $cart->get_total( 'edit' ),
					'currency'    => get_woocommerce_currency(),
					'items_count' => (int) $cart->get_cart_contents_count(),
					'items'       => $items,
				);
			}
		}

		if ( empty( $event ) ) {
			return;
		}

		// For backwards compatibility, also emit the legacy event name
		// so any GA4 audience or report still keyed to the old names
		// keeps reading data while we migrate them. Mapping:
		//   view_item       → product_view (legacy)
		//   view_cart       → cart_view (legacy)
		//   begin_checkout  → checkout_view (legacy)
		// Other events have no legacy counterpart.
		$legacy_event = '';
		if ( 'view_item' === $event ) {
			$legacy_event = 'product_view';
		} elseif ( 'view_cart' === $event ) {
			$legacy_event = 'cart_view';
		} elseif ( 'begin_checkout' === $event ) {
			$legacy_event = 'checkout_view';
		}
		?>
<script>
(function () {
  if (typeof gtag !== 'function') return;
  var payload = <?php echo wp_json_encode( $extra ); ?>;
  gtag('event', <?php echo wp_json_encode( $event ); ?>, payload);
		<?php if ( $legacy_event ) : ?>
  gtag('event', <?php echo wp_json_encode( $legacy_event ); ?>, payload);
		<?php endif; ?>
})();
</script>
		<?php
	},
	35
);

/**
 * Fire purchase conversion + ecommerce on the WooCommerce thank-you page.
 *
 * @param int $order_id Order ID.
 */
add_action(
	'woocommerce_thankyou',
	function ( $order_id ) {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$items = array();
		foreach ( $order->get_items() as $item ) {
			$product = $item->get_product();
			if ( ! $product ) {
				continue;
			}
			$qty = max( 1, (int) $item->get_quantity() );
			$items[] = array(
				'item_id'   => (string) $product->get_sku(),
				'item_name' => (string) $item->get_name(),
				'price'     => round( ( (float) $item->get_total() ) / $qty, 2 ),
				'quantity'  => $qty,
			);
		}

		$payload = array(
			'transaction_id' => (string) $order_id,
			'value'          => (float) $order->get_total(),
			'currency'       => (string) $order->get_currency(),
			'items'          => $items,
		);

		?>
<script>
		<?php if ( ! empty( ROJI_GADS_ID ) && ! empty( ROJI_GADS_PURCHASE_LABEL ) ) : ?>
gtag('event', 'conversion', {
  'send_to': '<?php echo esc_js( ROJI_GADS_ID . '/' . ROJI_GADS_PURCHASE_LABEL ); ?>',
  'value': <?php echo wp_json_encode( $payload['value'] ); ?>,
  'currency': <?php echo wp_json_encode( $payload['currency'] ); ?>,
  'transaction_id': <?php echo wp_json_encode( $payload['transaction_id'] ); ?>
});
		<?php endif; ?>
gtag('event', 'purchase', <?php echo wp_json_encode( $payload ); ?>);
</script>
		<?php
	}
);
