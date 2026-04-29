<?php
/**
 * Roji Child — lock checkout country to United States.
 *
 * We ship US-only (see compliance + the "21+ verified · US ship only"
 * trust strip on the homepage). The default Woo checkout still
 * presents a country dropdown which (a) confuses buyers, (b) can be
 * edited to a non-US value that breaks shipping calc, and (c)
 * encourages out-of-policy orders we then have to refund.
 *
 * Defense in depth — three layers:
 *
 *   1. Tell WooCommerce we sell + ship to the US ONLY. This makes
 *      the country dropdown effectively a single option and lets
 *      WC's address validation reject anything else server-side.
 *      (`woocommerce_allowed_countries` / `_ship_to_countries`).
 *
 *   2. Pre-fill billing + shipping country to 'US' on every cart
 *      and checkout request via `default_checkout_billing_country`
 *      filters, so even guest first-paint shows US.
 *
 *   3. Mark the billing/shipping country fields readonly + visually
 *      locked at the checkout-fields filter layer. Renders as a
 *      static "United States" line with a small "🇺🇸 US-only" hint,
 *      and removes the <select> entirely so nobody can pry it open.
 *
 * Cart shipping calculator on the cart page is also locked the same
 * way (separate fields filter), since it shares the same UX issue.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -------------------------------------------------------------------------- */
/* 1. Restrict allowed selling + shipping countries to US                     */
/* -------------------------------------------------------------------------- */

add_filter( 'woocommerce_countries_allowed_countries',  'roji_us_only_countries' );
add_filter( 'woocommerce_countries_shipping_countries', 'roji_us_only_countries' );

/**
 * @param array $countries Country code => display name.
 * @return array
 */
function roji_us_only_countries( $countries ) {
	return array( 'US' => isset( $countries['US'] ) ? $countries['US'] : 'United States (US)' );
}

/* -------------------------------------------------------------------------- */
/* 2. Pre-fill country = US for every visitor                                 */
/* -------------------------------------------------------------------------- */

add_filter( 'default_checkout_billing_country',  'roji_force_us' );
add_filter( 'default_checkout_shipping_country', 'roji_force_us' );

function roji_force_us( $value ) {
	return 'US';
}

/* -------------------------------------------------------------------------- */
/* 3. Lock the checkout country field to a static "United States" line        */
/* -------------------------------------------------------------------------- */

add_filter( 'woocommerce_checkout_fields',         'roji_lock_country_fields' );
add_filter( 'woocommerce_billing_fields',          'roji_lock_country_billing_fields' );
add_filter( 'woocommerce_shipping_fields',         'roji_lock_country_shipping_fields' );

/**
 * Replace the billing/shipping country selects with a hidden input
 * (so the form still submits 'US') plus a non-editable display row.
 */
function roji_lock_country_fields( $fields ) {
	foreach ( array( 'billing', 'shipping' ) as $section ) {
		$key = $section . '_country';
		if ( ! isset( $fields[ $section ][ $key ] ) ) {
			continue;
		}
		$fields[ $section ][ $key ] = roji_country_field_locked( $fields[ $section ][ $key ] );
	}
	return $fields;
}

function roji_lock_country_billing_fields( $fields ) {
	if ( isset( $fields['billing_country'] ) ) {
		$fields['billing_country'] = roji_country_field_locked( $fields['billing_country'] );
	}
	return $fields;
}

function roji_lock_country_shipping_fields( $fields ) {
	if ( isset( $fields['shipping_country'] ) ) {
		$fields['shipping_country'] = roji_country_field_locked( $fields['shipping_country'] );
	}
	return $fields;
}

/**
 * Mutate a country field definition into a locked hidden+display
 * pair. We keep `type=country` so WC still applies the right
 * validation, but mark it readonly with a custom field class that
 * our CSS turns into a static line.
 */
function roji_country_field_locked( array $field ) {
	$field['type']        = 'hidden';
	$field['default']     = 'US';
	$field['required']    = true;
	$classes              = isset( $field['class'] ) ? (array) $field['class'] : array();
	$classes[]            = 'roji-country-locked';
	$field['class']       = array_values( array_unique( $classes ) );
	$field['custom_attributes'] = array(
		'readonly' => 'readonly',
		'aria-readonly' => 'true',
	);
	return $field;
}

/* -------------------------------------------------------------------------- */
/* 4. Render a static "United States · US-only" line where the country        */
/*    select used to live, on both checkout AND cart shipping calculator.     */
/* -------------------------------------------------------------------------- */

add_action( 'woocommerce_after_checkout_billing_form',  'roji_render_country_lock_notice' );
add_action( 'woocommerce_after_checkout_shipping_form', 'roji_render_country_lock_notice' );

function roji_render_country_lock_notice( $checkout = null ) {
	echo '<p class="roji-country-lock-line" aria-hidden="true">'
		. '<span class="roji-country-lock-line__label">Country</span>'
		. '<span class="roji-country-lock-line__value">United States <span class="roji-country-lock-line__hint">· US-only · 21+ verified</span></span>'
		. '</p>';
}

/*
 * NOTE: The cart-page shipping calculator's country <select> is
 * already hidden via CSS (.shipping-calculator-form
 * #calc_shipping_country_field { display:none }). We deliberately
 * do NOT inject another "Ships to · United States only" line above
 * the calculator — it ends up nesting inside the Cart Totals card
 * and visually competes with the totals rows. The state/zip fields
 * imply US-only context already, and the homepage trust strip +
 * checkout lock keep the policy explicit elsewhere.
 */
