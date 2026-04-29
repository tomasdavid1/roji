<?php
/**
 * Roji Child — header cart icon.
 *
 * Adds a cart icon (with item count badge) as the LAST item of the
 * primary header menu (`roji-header`). Updates live via WooCommerce's
 * built-in `wc_fragments` AJAX so the badge increments without a page
 * reload after add-to-cart.
 *
 * Why filter into the menu instead of editing the Elementor header
 * template:
 *   - The Elementor header uses the Site Logo + Nav Menu widgets and
 *     is provisioned by elementor-templates/menus.php. Modifying it
 *     would require an Elementor template re-import on deploy. A
 *     simple `wp_nav_menu_items` filter is zero-friction and keeps
 *     the menu spec in PHP unchanged.
 *   - Both the desktop horizontal menu and the mobile dropdown
 *     dropdown share the same nav menu, so we get cart visibility on
 *     both surfaces for free.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'roji_header_cart_link_html' ) ) {
	/**
	 * Render the cart link with current count + total. The outer
	 * <a> uses class `roji-cart-link` (themed below) and is wrapped
	 * in `<li class="menu-item roji-cart-menu-item">` so it slots
	 * cleanly into both `wp_nav_menu` output and the dropdown.
	 *
	 * @param bool $with_li Whether to wrap in <li>.
	 * @return string
	 */
	function roji_header_cart_link_html( $with_li = true ) {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return '';
		}
		$count = (int) WC()->cart->get_cart_contents_count();
		$url   = wc_get_cart_url();
		$label = $count > 0
			? sprintf(
				/* translators: %d cart item count */
				_n( '%d item', '%d items', $count, 'roji-child' ),
				$count
			)
			: __( 'Cart empty', 'roji-child' );

		$svg = '<svg class="roji-cart-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
			. '<path d="M6 6h15l-1.5 9h-12z"/>'
			. '<path d="M6 6L5 3H2"/>'
			. '<circle cx="9" cy="20" r="1.5"/>'
			. '<circle cx="18" cy="20" r="1.5"/>'
			. '</svg>';

		$badge = '<span class="roji-cart-link__badge" data-count="' . esc_attr( $count ) . '"' . ( 0 === $count ? ' hidden' : '' ) . '>' . esc_html( $count ) . '</span>';

		$inner = '<a class="roji-cart-link elementor-item" href="' . esc_url( $url ) . '" aria-label="' . esc_attr__( 'View cart', 'roji-child' ) . '" title="' . esc_attr( $label ) . '">'
			. $svg . $badge
			. '<span class="roji-cart-link__text">' . esc_html__( 'Cart', 'roji-child' ) . '</span>'
			. '</a>';

		if ( ! $with_li ) {
			return $inner;
		}
		return '<li class="menu-item roji-cart-menu-item">' . $inner . '</li>';
	}
}

/**
 * Append cart link to the `roji-header` menu (theme location `menu-1`)
 * AND to the legacy menu used by Hello Elementor mobile dropdown if
 * Elementor renders the menu via its own widget (which also fires
 * `wp_nav_menu_items` with `args->theme_location` == 'menu-1').
 */
add_filter(
	'wp_nav_menu_items',
	function ( $items, $args ) {
		// Only add to the primary header menu — never to the footer.
		$is_header_menu = false;
		if ( ! empty( $args->theme_location ) && 'menu-1' === $args->theme_location ) {
			$is_header_menu = true;
		}
		if ( ! empty( $args->menu ) ) {
			$slug = is_object( $args->menu ) ? $args->menu->slug : $args->menu;
			if ( 'roji-header' === $slug ) {
				$is_header_menu = true;
			}
		}
		if ( ! $is_header_menu ) {
			return $items;
		}
		return $items . roji_header_cart_link_html( true );
	},
	10,
	2
);

/**
 * Make the cart link participate in WooCommerce's built-in
 * fragments AJAX so the badge updates without a page reload after
 * add-to-cart. WC re-renders any fragment whose JSON key matches a
 * CSS selector after each update.
 */
add_filter(
	'woocommerce_add_to_cart_fragments',
	function ( $fragments ) {
		$fragments['li.roji-cart-menu-item'] = roji_header_cart_link_html( true );
		return $fragments;
	}
);

/**
 * Re-style WooCommerce's "%s has been added to your cart. [View cart]"
 * success notice so the "View cart" call-to-action reads as a real
 * button rather than a stray accent-blue link (which is what was
 * happening on the PDP — see screenshot, dark card with "Add to cart"
 * button followed by an unstyled "View cart" link).
 *
 * We can't easily change the markup (it's emitted by `wc_add_to_cart_message`)
 * but we CAN replace it with a customized message that wraps the link
 * in a class we own.
 */
add_filter(
	'wc_add_to_cart_message_html',
	function ( $message, $products = array(), $show_qty = false ) {
		$count = 0;
		foreach ( (array) $products as $product_id => $qty ) {
			$count += (int) $qty;
		}
		if ( $count <= 0 ) {
			$count = 1;
		}
		$cart_url = wc_get_cart_url();
		$checkout_url = wc_get_checkout_url();
		$titles = array();
		foreach ( (array) $products as $product_id => $qty ) {
			$p = wc_get_product( $product_id );
			if ( $p ) {
				$titles[] = $p->get_name();
			}
		}
		$first_title = $titles ? $titles[0] : __( 'Item', 'roji-child' );
		$added_text = sprintf(
			/* translators: %s product name */
			__( 'Added to cart: %s', 'roji-child' ),
			'<strong>' . esc_html( $first_title ) . '</strong>'
		);
		return sprintf(
			'<div class="roji-cart-notice"><span class="roji-cart-notice__msg">%1$s</span>'
			. '<span class="roji-cart-notice__actions">'
			. '<a href="%2$s" class="roji-cart-notice__btn roji-cart-notice__btn--primary">%3$s</a>'
			. '<a href="%4$s" class="roji-cart-notice__btn roji-cart-notice__btn--ghost">%5$s</a>'
			. '</span></div>',
			$added_text,
			esc_url( $checkout_url ),
			esc_html__( 'Checkout', 'roji-child' ),
			esc_url( $cart_url ),
			esc_html__( 'View cart', 'roji-child' )
		);
	},
	10,
	3
);
