<?php
/**
 * Roji Child - Brand assets.
 *
 * Emits favicon link tags + Open Graph images that point at the static
 * brand assets shipped with the theme. Both surfaces are deliberately
 * theme-managed (rather than uploaded via the Customizer) so the
 * GitHub-Actions deploy is the single source of truth and there's
 * nothing to forget after a fresh Kinsta migration.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Output favicon + apple-touch-icon + manifest hints in <head>.
 *
 * Hooked at priority 5 so we run before plugins that might inject
 * their own conflicting <link rel="icon"> tags (notably Yoast and
 * WP's core wp_site_icon when the Customizer site icon is set).
 */
add_action(
	'wp_head',
	function () {
		$base = ROJI_CHILD_URI . '/assets/img';
		$ver  = defined( 'ROJI_CHILD_VERSION' ) ? ROJI_CHILD_VERSION : '1';
		printf( '<link rel="icon" type="image/x-icon" href="%s/favicon.ico?v=%s">' . "\n", esc_url( $base ), esc_attr( $ver ) );
		printf( '<link rel="icon" type="image/png" sizes="16x16" href="%s/favicon-16.png?v=%s">' . "\n", esc_url( $base ), esc_attr( $ver ) );
		printf( '<link rel="icon" type="image/png" sizes="32x32" href="%s/favicon-32.png?v=%s">' . "\n", esc_url( $base ), esc_attr( $ver ) );
		printf( '<link rel="apple-touch-icon" sizes="180x180" href="%s/apple-touch-icon.png?v=%s">' . "\n", esc_url( $base ), esc_attr( $ver ) );
		printf( '<link rel="icon" type="image/png" sizes="192x192" href="%s/android-192.png?v=%s">' . "\n", esc_url( $base ), esc_attr( $ver ) );
		printf( '<meta name="theme-color" content="#0a0a0f">' . "\n" );
	},
	5
);

/**
 * Set a default Open Graph image at the document head when no
 * page-specific OG image has been set (e.g. by Yoast on individual
 * posts/products). Yoast's own filter wins for product/post pages,
 * so this is effectively the site-wide fallback.
 *
 * Yoast filter that overrides this for products: `wpseo_opengraph_image`.
 */
add_action(
	'wp_head',
	function () {
		// If Yoast (or another SEO plugin) is going to emit OG, let it
		// own the page; we only fill the gap.
		if ( defined( 'WPSEO_VERSION' ) ) {
			return;
		}
		$og = ROJI_CHILD_URI . '/assets/img/og-image.png';
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $og ) );
		printf( '<meta property="og:image:width" content="1200">' . "\n" );
		printf( '<meta property="og:image:height" content="630">' . "\n" );
		printf( '<meta name="twitter:card" content="summary_large_image">' . "\n" );
		printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $og ) );
	},
	6
);

/**
 * If Yoast SEO is active and no per-page OG image has been chosen,
 * use our branded card as the default. Filter only fires when Yoast
 * is computing a page's OG image, so this gracefully no-ops otherwise.
 */
add_filter(
	'wpseo_opengraph_image',
	function ( $url ) {
		if ( ! empty( $url ) ) {
			return $url;
		}
		return ROJI_CHILD_URI . '/assets/img/og-image.png';
	}
);

/**
 * Suppress WP core's site icon emission when the theme is supplying
 * one. Otherwise WP injects /wp-content/uploads/.../cropped-* tags
 * that compete with ours and confuse browser tab caching.
 */
remove_action( 'wp_head', 'wp_site_icon', 99 );

/**
 * Inline SVG of the Roji R monogram. Single source of truth for the
 * header wordmark - keep in sync with /brand/src/r-mark.svg.
 *
 * Returned as a fully self-contained <svg> string so it can be inlined
 * anywhere (header, breadcrumb, footer) without an extra HTTP request,
 * and the color follows whatever CSS `color:` is on the parent.
 *
 * @param int $size Pixel height of the rendered mark.
 * @return string
 */
function roji_r_mark_svg( $size = 28 ) {
	$size = (int) $size;
	return sprintf(
		'<svg viewBox="0 0 256 256" width="%1$d" height="%1$d" fill="currentColor" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:middle;"><path fill-rule="evenodd" d="M 56 48 L 56 208 L 88 208 L 88 152 L 124 152 L 168 208 L 208 208 L 208 200 L 158 142 C 184 132 196 116 196 92 C 196 64 174 48 142 48 Z M 88 80 L 138 80 C 154 80 164 86 164 100 C 164 116 152 124 138 124 L 88 124 Z"/></svg>',
		$size
	);
}

/**
 * Override Hello Elementor's site-title / custom-logo block in the
 * header with our wordmark. The "roji" lowercase wordmark IS the logo
 * by itself - we deliberately do NOT pair it with the R glyph in the
 * primary lockup. The glyph is reserved for the favicon, breadcrumb
 * markers, and other supporting contexts.
 *
 * Hello Elementor's header pulls the logo via get_custom_logo() and
 * the title via get_bloginfo(); we filter both to the wordmark.
 */
add_filter(
	'get_custom_logo',
	function ( $html ) {
		$home = esc_url( home_url( '/' ) );
		return sprintf(
			'<a href="%s" class="custom-logo-link roji-wordmark" rel="home" aria-label="Roji Peptides home">'
				. '<span class="roji-wordmark__text" style="color:#f0f0f5;font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:22px;letter-spacing:-0.01em;line-height:1;">roji</span>'
			. '</a>',
			$home
		);
	},
	20
);

/**
 * Tell Hello Elementor that we have a custom logo even if no
 * Customizer logo is set, so it renders the (now-filtered) lockup
 * instead of falling back to the plain bloginfo title.
 */
add_filter( 'has_custom_logo', '__return_true' );

/**
 * Tiny CSS for the wordmark lockup - kept here next to the markup
 * so it's easy to maintain together. Hooked at high priority so it
 * sits after the rest of the theme's styles and wins specificity.
 */
add_action(
	'wp_head',
	function () {
		?>
<style>
	.roji-wordmark { display: inline-flex; align-items: baseline; text-decoration: none; }
	.roji-wordmark img { display: none !important; } /* hide any Customizer-uploaded image */
</style>
		<?php
	},
	100
);
