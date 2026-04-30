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
		// We deliberately do NOT pass `required => true` to woocommerce_form_field.
		// WC translates that into the HTML5 `required` attribute, which makes
		// the browser silently block form submission when unchecked — no JS
		// fires, no AJAX request, nothing in the network/console tab. The
		// customer just clicks Place Order and "nothing happens." Instead we
		// validate this checkbox client-side (with a visible error + scroll)
		// and server-side (woocommerce_checkout_process below).
		woocommerce_form_field(
			'research_use_confirm',
			array(
				'type'  => 'checkbox',
				'class' => array( 'roji-research-confirm', 'form-row-wide' ),
				'label' => sprintf(
					/* translators: %d: minimum age requirement */
					__( 'I confirm these products are for research use only and I am %d+.', 'roji-child' ),
					(int) ROJI_AGE_REQUIREMENT
				),
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
 * Checkout UX glue:
 *   1. Client-side validation of the research-use checkbox with a visible
 *      inline error (no silent HTML5 `required` block).
 *   2. Spinner + "Placing order…" label on Place Order while the request
 *      is in flight, so customers always see feedback when they click.
 *   3. Auto-scroll any WC validation errors into view (server-side errors
 *      appear at the top of the form; if the user is near Place Order
 *      they otherwise see no signal).
 */
add_action(
	'woocommerce_after_checkout_form',
	function () {
		?>
		<script>
		(function(){
			var form = document.querySelector('form.checkout');
			if (!form) return;

			var btn         = form.querySelector('#place_order');
			var origLabel   = btn ? btn.textContent : '';
			var consentSel  = '#research_use_confirm';

			function findConsentRow() {
				return form.querySelector('.roji-research-confirm') ||
				       (form.querySelector(consentSel) && form.querySelector(consentSel).closest('.form-row'));
			}

			function showConsentError(msg) {
				var row = findConsentRow();
				if (!row) return;
				row.classList.add('roji-consent-invalid');
				var existing = row.querySelector('.roji-consent-error');
				if (!existing) {
					existing = document.createElement('p');
					existing.className = 'roji-consent-error';
					existing.setAttribute('role', 'alert');
					row.appendChild(existing);
				}
				existing.textContent = msg;
				row.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}

			function clearConsentError() {
				var row = findConsentRow();
				if (!row) return;
				row.classList.remove('roji-consent-invalid');
				var existing = row.querySelector('.roji-consent-error');
				if (existing) existing.remove();
			}

			form.addEventListener('change', function(e){
				if (e.target && e.target.matches(consentSel) && e.target.checked) {
					clearConsentError();
				}
			});

			// Capture-phase listener so we run BEFORE WC's own submit handler
			// (which would otherwise fire the AJAX request).
			form.addEventListener('submit', function(e){
				var consent = form.querySelector(consentSel);
				if (consent && !consent.checked) {
					e.preventDefault();
					e.stopImmediatePropagation();
					showConsentError(
						<?php echo wp_json_encode( __( 'Please confirm research use to place your order.', 'roji-child' ) ); ?>
					);
					return false;
				}
				clearConsentError();
				if (btn) {
					btn.classList.add('roji-placing');
					btn.disabled = true;
					// Preserve the original text inside a span so the spinner
					// pseudo-element can sit alongside it without clobbering.
					btn.dataset.origLabel = origLabel;
					btn.textContent = <?php echo wp_json_encode( __( 'Placing order…', 'roji-child' ) ); ?>;
				}
			}, true);

			// WC fires this whenever it finishes a checkout AJAX request
			// (success OR validation error) — re-enable the button so the
			// customer can correct + retry.
			jQuery && jQuery(document.body).on('checkout_error updated_checkout', function(){
				if (!btn) return;
				btn.classList.remove('roji-placing');
				btn.disabled = false;
				btn.textContent = btn.dataset.origLabel || origLabel;
			});

			// Auto-scroll WC server-side errors into view.
			var observer = new MutationObserver(function(){
				var notice = form.querySelector('.woocommerce-NoticeGroup, .woocommerce-error, ul.woocommerce-error');
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
