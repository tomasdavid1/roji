<?php
/**
 * Roji Child — Trustpilot TrustBox widget renderer.
 *
 * Provides:
 *   1. wp_enqueue_script for the Trustpilot widget bootstrap.
 *   2. Three shortcodes for common placements:
 *        [trustpilot_hero]    — large, on the homepage hero
 *        [trustpilot_mini]    — compact star strip, cart/checkout
 *        [trustpilot_footer]  — micro version for site footer
 *   3. Auto-injected widgets at WC hooks (cart top, checkout top, footer).
 *
 * Widget templates are Trustpilot's official ones; we just embed them and
 * Trustpilot's bootstrap script hydrates them client-side. Widget IDs are
 * documented at https://support.trustpilot.com/hc/en-us/categories/201164107
 *
 * Renders nothing if ROJI_TRUSTPILOT_BUSINESS_UNIT_ID is not set, so this
 * file is safe to load in all environments.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * Bootstrap script — site-wide, async
 * -------------------------------------------------------------------------- */

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! roji_trustpilot_widgets_enabled() ) {
			return;
		}
		wp_enqueue_script(
			'trustpilot-bootstrap',
			'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js',
			array(),
			null,
			array(
				'in_footer' => false,
				'strategy'  => 'async',
			)
		);
	},
	30
);

/* -----------------------------------------------------------------------------
 * Widget renderer
 * -------------------------------------------------------------------------- */

/**
 * Trustpilot's official template IDs for the placements we use.
 * Source: trustpilot.com/business/widgets (each widget has a 24-char id).
 */
function roji_trustpilot_widget_template( $variant ) {
	$templates = array(
		// "Mini" — compact stars, ~140px tall. Good for cart/checkout/footer.
		'mini'   => array(
			'template-id' => '53aa8807dec7e10d38f59f32',
			'height'      => '20px',
			'width'       => '160px',
			'data-style-alignment' => 'left',
		),
		// "Slider" — wide rotating quotes carousel. Good for homepage hero.
		'hero'   => array(
			'template-id' => '54ad5defc6454f065c28af8b',
			'height'      => '240px',
			'width'       => '100%',
			'data-style-alignment' => 'center',
		),
		// "Micro Combo" — single line stars + count. Good for site footer.
		'footer' => array(
			'template-id' => '5419b6ffb0d04a076446a9af',
			'height'      => '20px',
			'width'       => '210px',
			'data-style-alignment' => 'center',
		),
	);
	return isset( $templates[ $variant ] ) ? $templates[ $variant ] : $templates['mini'];
}

/**
 * Render a TrustBox widget.
 *
 * @param string $variant 'mini' | 'hero' | 'footer'
 * @return string HTML (empty if Trustpilot not configured).
 */
function roji_trustpilot_render( $variant = 'mini' ) {
	if ( ! roji_trustpilot_widgets_enabled() ) {
		return '';
	}
	$cfg          = roji_trustpilot_widget_template( $variant );
	$business_id  = esc_attr( ROJI_TRUSTPILOT_BUSINESS_UNIT_ID );
	$locale       = esc_attr( ROJI_TRUSTPILOT_LOCALE );
	$href         = esc_url( 'https://www.trustpilot.com/review/' . ROJI_TRUSTPILOT_DOMAIN );

	return sprintf(
		'<div class="trustpilot-widget roji-trustpilot roji-trustpilot--%1$s" data-locale="%2$s" data-template-id="%3$s" data-businessunit-id="%4$s" data-style-height="%5$s" data-style-width="%6$s" data-style-alignment="%7$s" data-theme="dark"><a href="%8$s" target="_blank" rel="noopener nofollow">Trustpilot</a></div>',
		esc_attr( $variant ),
		$locale,
		esc_attr( $cfg['template-id'] ),
		$business_id,
		esc_attr( $cfg['height'] ),
		esc_attr( $cfg['width'] ),
		esc_attr( $cfg['data-style-alignment'] ),
		$href
	);
}

/* -----------------------------------------------------------------------------
 * Shortcodes
 * -------------------------------------------------------------------------- */

add_shortcode(
	'trustpilot_hero',
	function () {
		return roji_trustpilot_render( 'hero' );
	}
);
add_shortcode(
	'trustpilot_mini',
	function () {
		return roji_trustpilot_render( 'mini' );
	}
);
add_shortcode(
	'trustpilot_footer',
	function () {
		return roji_trustpilot_render( 'footer' );
	}
);

/* -----------------------------------------------------------------------------
 * Auto-injection at WooCommerce hooks
 * -------------------------------------------------------------------------- */

// Top of cart page (above the cart items table).
add_action(
	'woocommerce_before_cart',
	function () {
		echo '<div class="roji-trustpilot-wrap" style="margin:0 0 24px;">' . roji_trustpilot_render( 'mini' ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	},
	5
);

// Top of checkout (above the form).
add_action(
	'woocommerce_before_checkout_form',
	function () {
		echo '<div class="roji-trustpilot-wrap" style="margin:0 0 24px;">' . roji_trustpilot_render( 'mini' ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	},
	5
);

// Site footer (just before closing wp_footer).
add_action(
	'wp_footer',
	function () {
		if ( ! roji_trustpilot_widgets_enabled() ) {
			return;
		}
		echo '<div class="roji-trustpilot-footer" style="text-align:center;padding:24px 0;border-top:1px solid var(--roji-border,rgba(255,255,255,0.06));">' . roji_trustpilot_render( 'footer' ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	},
	5
);
