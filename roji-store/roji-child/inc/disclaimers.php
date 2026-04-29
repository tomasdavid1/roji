<?php
/**
 * Roji Child — research-use disclaimers and mandatory checkout consent.
 *
 * - Disclaimer block under every product's add-to-cart form.
 * - Disclaimer block above the place-order button at checkout.
 * - Mandatory `research_use_confirm` checkbox at checkout, validated server-side.
 * - Site-wide footer disclaimer on every page.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Product page disclaimer (after add-to-cart form).
 */
add_action(
	'woocommerce_after_add_to_cart_form',
	function () {
		echo '<div class="roji-disclaimer">'
			. '<strong>Research Use Only</strong>'
			. esc_html__( 'All products sold on this website are intended for research and laboratory use only. These products are not intended for human dosing, injection, ingestion, or any form of bodily introduction. By purchasing, you agree to our Terms of Service and confirm you are at least ', 'roji-child' )
			. (int) ROJI_AGE_REQUIREMENT
			. esc_html__( ' years of age.', 'roji-child' )
			. '</div>';
	}
);

/**
 * Checkout disclaimer (before place-order button).
 *
 * Priority is set so this fires before the mandatory checkbox below.
 */
add_action(
	'woocommerce_review_order_before_submit',
	function () {
		printf(
			'<div class="roji-checkout-disclaimer">%s <a href="%s">%s</a> %s <a href="%s">%s</a>.</div>',
			esc_html__( 'By placing this order, I confirm that I am purchasing these products for research and laboratory purposes only, that I am at least 21 years of age, and that I have read and agree to the', 'roji-child' ),
			esc_url( home_url( '/terms' ) ),
			esc_html__( 'Terms of Service', 'roji-child' ),
			esc_html__( 'and', 'roji-child' ),
			esc_url( home_url( '/disclaimer' ) ),
			esc_html__( 'Research Use Disclaimer', 'roji-child' )
		);
	},
	5
);

/**
 * Mandatory checkout checkbox.
 */
add_action(
	'woocommerce_review_order_before_submit',
	function () {
		if ( ! function_exists( 'woocommerce_form_field' ) ) {
			return;
		}
		woocommerce_form_field(
			'research_use_confirm',
			array(
				'type'     => 'checkbox',
				'class'    => array( 'roji-research-confirm', 'form-row-wide' ),
				'label'    => sprintf(
					/* translators: %d: minimum age requirement */
					__( 'I confirm these products are for research use only and I am %d+.', 'roji-child' ),
					(int) ROJI_AGE_REQUIREMENT
				),
				'required' => true,
			)
		);
	},
	10
);

/**
 * Server-side validation: block checkout without the consent checkbox.
 */
add_action(
	'woocommerce_checkout_process',
	function () {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing — WC handles checkout nonce.
		if ( empty( $_POST['research_use_confirm'] ) ) {
			wc_add_notice(
				__( 'You must confirm research use to complete your order.', 'roji-child' ),
				'error'
			);
		}
	}
);

/**
 * Auto-scroll checkout errors into view so the user never misses them.
 * WooCommerce inserts validation errors at the top of the form; if the
 * user is scrolled down near Place Order, they see "nothing happened."
 */
add_action(
	'woocommerce_after_checkout_form',
	function () {
		?>
		<script>
		(function(){
			var form = document.querySelector('form.checkout');
			if (!form) return;
			var observer = new MutationObserver(function(){
				var notice = form.querySelector('.woocommerce-NoticeGroup, .woocommerce-error');
				if (notice) {
					notice.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			});
			observer.observe(form, { childList: true, subtree: true });
		})();
		</script>
		<?php
	}
);

/**
 * Site-wide footer disclaimer.
 */
add_action(
	'wp_footer',
	function () {
		printf(
			'<div class="roji-footer-disclaimer">%s &copy; %d %s.</div>',
			esc_html__( 'All products sold on this site are intended for research and identification purposes only. These products are NOT intended for human dosing, injection, or ingestion. Products have not been evaluated by the FDA. Not for medical, veterinary, or household use. Must be 21+ to purchase.', 'roji-child' ),
			(int) gmdate( 'Y' ),
			esc_html( ROJI_BRAND_NAME )
		);
	},
	100
);
