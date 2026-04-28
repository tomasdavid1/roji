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
		// when bouncing between protocol.rojipeptides.com and
		// rojipeptides.com. Override ROJI_GTAG_LINKER_DOMAINS in
		// wp-config.php for non-prod test pairs.
		$linker_domains = defined( 'ROJI_GTAG_LINKER_DOMAINS' )
			? (array) ROJI_GTAG_LINKER_DOMAINS
			: array( 'rojipeptides.com', 'protocol.rojipeptides.com', 'tools.rojipeptides.com' );
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
 * Fire add_to_cart when a user lands on /cart/ via the protocol-engine
 * deep-link. We can identify these because the URL carries
 * `?protocol_stack=...&utm_source=protocol_engine`. This is the second
 * conversion (after `protocol_complete` on the engine, before `purchase`
 * on the thank-you) — exactly the funnel the blueprint optimizes for.
 */
add_action(
	'wp_footer',
	function () {
		if ( empty( ROJI_GADS_ID ) && empty( ROJI_GA4_ID ) ) {
			return;
		}
		if ( ! function_exists( 'is_cart' ) || ! is_cart() ) {
			return;
		}
		// Only fire for protocol-engine deep-links so we measure the
		// engine→cart transition, not every cart pageview.
		if ( empty( $_GET['protocol_stack'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		$cart = function_exists( 'WC' ) ? WC()->cart : null;
		if ( ! $cart ) {
			return;
		}
		$total  = (float) $cart->get_total( 'edit' );
		$items  = array();
		foreach ( $cart->get_cart() as $line ) {
			$product = isset( $line['data'] ) ? $line['data'] : null;
			if ( ! $product ) {
				continue;
			}
			$items[] = array(
				'item_id'   => (string) $product->get_sku(),
				'item_name' => (string) $product->get_name(),
				'price'     => (float) $product->get_price(),
				'quantity'  => (int) $line['quantity'],
			);
		}
		$ads_label = defined( 'ROJI_GADS_ADD_TO_CART_LABEL' ) ? ROJI_GADS_ADD_TO_CART_LABEL : '';
		?>
<script>
(function () {
  if (typeof gtag !== 'function') return;
  var payload = <?php echo wp_json_encode( array(
		'value'    => $total,
		'currency' => get_woocommerce_currency(),
		'items'    => $items,
	) ); ?>;
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
