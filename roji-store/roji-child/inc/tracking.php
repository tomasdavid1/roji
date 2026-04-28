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
		?>
<!-- Roji: Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr( $primary_id ); ?>"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
		<?php if ( $ads_id ) : ?>
gtag('config', '<?php echo esc_js( $ads_id ); ?>');
		<?php endif; ?>
		<?php if ( $ga4_id ) : ?>
gtag('config', '<?php echo esc_js( $ga4_id ); ?>');
		<?php endif; ?>
</script>
		<?php
	},
	1
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
