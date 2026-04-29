<?php
/**
 * Roji Child — custom mobile navigation drawer.
 *
 * Replaces Elementor's built-in mobile dropdown (.elementor-menu-toggle
 * + .elementor-nav-menu--dropdown) with a custom full-screen overlay
 * drawer that we own end-to-end.
 *
 * Why we can't keep using Elementor's dropdown:
 *   - It re-emits inline styles on every render (white background +
 *     muted link color) that fight every CSS override we throw at it.
 *   - Several rounds of !important-heavy overrides STILL leak through
 *     on some kit configurations because Elementor injects new wrapper
 *     classes per-version; the cycle never ends.
 *
 * Approach:
 *   - Print our own toggle + drawer into `wp_body_open` so it lives
 *     OUTSIDE Elementor's widget tree (no parent specificity to fight).
 *   - Pull menu items from the existing `roji-header` nav menu so the
 *     content stays a single source of truth (admin > Appearance >
 *     Menus). Cart link is appended dynamically using the same helper
 *     that powers the desktop header cart icon.
 *   - Hide Elementor's mobile toggle + dropdown on screens <= 1024px
 *     via CSS (see style.css). Desktop horizontal menu is unaffected.
 *   - All client behavior is in a tiny vanilla-JS IIFE inlined at the
 *     bottom of the markup; no extra HTTP request.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolve the menu items that should appear in the drawer. Reads the
 * `roji-header` menu by slug (provisioned via elementor-templates/menus.php).
 * Returns an array of objects compatible with our render loop.
 *
 * @return array<int, object{title:string,url:string,is_current:bool}>
 */
function roji_mobile_nav_items() {
	$menu = wp_get_nav_menu_object( 'roji-header' );
	if ( ! $menu || is_wp_error( $menu ) ) {
		return array();
	}
	$raw = wp_get_nav_menu_items( $menu->term_id );
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$current_url = home_url( add_query_arg( null, null ) );
	$out         = array();
	foreach ( $raw as $item ) {
		// Skip child items — drawer is intentionally a flat list to
		// avoid an accordion UI on mobile (the Roji menu is shallow
		// and a flat list is faster to scan).
		if ( ! empty( $item->menu_item_parent ) && (int) $item->menu_item_parent !== 0 ) {
			continue;
		}
		$obj             = new stdClass();
		$obj->title      = (string) $item->title;
		$obj->url        = (string) $item->url;
		$obj->is_current = ( untrailingslashit( $obj->url ) === untrailingslashit( $current_url ) );
		$out[]           = $obj;
	}
	return $out;
}

/**
 * Render the drawer markup right after <body>. Hidden by default;
 * the inline JS below toggles the `is-open` class on the root.
 */
function roji_render_mobile_nav() {
	// Don't render in admin / wp-login / Elementor editor preview.
	if ( is_admin() ) {
		return;
	}
	if ( isset( $_GET['elementor-preview'] ) ) {
		return;
	}

	$items = roji_mobile_nav_items();
	if ( empty( $items ) ) {
		return;
	}

	$cart_html = function_exists( 'roji_header_cart_link_html' )
		? roji_header_cart_link_html( false )
		: '';
	?>
	<button
		type="button"
		class="roji-mnav-toggle"
		aria-label="<?php esc_attr_e( 'Open menu', 'roji-child' ); ?>"
		aria-controls="roji-mnav-drawer"
		aria-expanded="false"
		data-roji-mnav-toggle
	>
		<span class="roji-mnav-toggle__bar"></span>
		<span class="roji-mnav-toggle__bar"></span>
		<span class="roji-mnav-toggle__bar"></span>
	</button>

	<div
		id="roji-mnav-drawer"
		class="roji-mnav-drawer"
		role="dialog"
		aria-modal="true"
		aria-label="<?php esc_attr_e( 'Site navigation', 'roji-child' ); ?>"
		hidden
		data-roji-mnav-drawer
	>
		<div class="roji-mnav-backdrop" data-roji-mnav-close></div>
		<aside class="roji-mnav-panel" tabindex="-1">
			<header class="roji-mnav-header">
				<a class="roji-mnav-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" data-roji-mnav-close-link>
					<span class="roji-mnav-brand__mark">roji</span>
					<span class="roji-mnav-brand__eyebrow">RESEARCH&nbsp;PEPTIDES</span>
				</a>
				<button
					type="button"
					class="roji-mnav-close"
					aria-label="<?php esc_attr_e( 'Close menu', 'roji-child' ); ?>"
					data-roji-mnav-close
				>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</header>

			<nav class="roji-mnav-nav" aria-label="<?php esc_attr_e( 'Primary', 'roji-child' ); ?>">
				<ul class="roji-mnav-list">
					<?php foreach ( $items as $item ) : ?>
						<li class="roji-mnav-item">
							<a
								class="roji-mnav-link<?php echo $item->is_current ? ' is-current' : ''; ?>"
								href="<?php echo esc_url( $item->url ); ?>"
								data-roji-mnav-close-link
							>
								<span><?php echo esc_html( $item->title ); ?></span>
								<svg class="roji-mnav-link__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</a>
						</li>
					<?php endforeach; ?>

					<?php if ( $cart_html ) : ?>
						<li class="roji-mnav-item roji-mnav-item--cart">
							<?php
							// Output already-escaped HTML built by roji_header_cart_link_html().
							// The helper escapes URLs / attrs / labels at construction time.
							echo $cart_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							?>
						</li>
					<?php endif; ?>
				</ul>
			</nav>

			<footer class="roji-mnav-footer">
				<p class="roji-mnav-footer__text">
					<?php esc_html_e( 'For research and laboratory use only. Not for human consumption.', 'roji-child' ); ?>
				</p>
			</footer>
		</aside>
	</div>

	<script>
	(function () {
		var toggle = document.querySelector('[data-roji-mnav-toggle]');
		var drawer = document.querySelector('[data-roji-mnav-drawer]');
		if (!toggle || !drawer) return;

		var panel = drawer.querySelector('.roji-mnav-panel');
		var closers = drawer.querySelectorAll('[data-roji-mnav-close], [data-roji-mnav-close-link]');
		var bodyClass = 'roji-mnav-locked';

		function open() {
			drawer.hidden = false;
			// Force layout flush so the CSS transition runs.
			requestAnimationFrame(function () {
				drawer.classList.add('is-open');
				toggle.classList.add('is-active');
				toggle.setAttribute('aria-expanded', 'true');
				document.body.classList.add(bodyClass);
				if (panel) panel.focus();
			});
		}

		function close() {
			drawer.classList.remove('is-open');
			toggle.classList.remove('is-active');
			toggle.setAttribute('aria-expanded', 'false');
			document.body.classList.remove(bodyClass);
			// Hide after transition for AT.
			window.setTimeout(function () {
				if (!drawer.classList.contains('is-open')) {
					drawer.hidden = true;
				}
			}, 240);
		}

		toggle.addEventListener('click', function (e) {
			e.preventDefault();
			if (drawer.classList.contains('is-open')) close(); else open();
		});

		closers.forEach(function (el) {
			el.addEventListener('click', function () {
				close();
			});
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
		});
	})();
	</script>
	<?php
}
add_action( 'wp_body_open', 'roji_render_mobile_nav', 5 );
