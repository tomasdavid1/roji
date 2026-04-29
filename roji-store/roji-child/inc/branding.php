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
 * Hard-kill the Customizer site icon at the data layer. Any leftover
 * `cropped-*.png` from the previous (Bluum-era) icon, if not overwritten
 * by the theme assets, will otherwise resurface on:
 *  - mobile theme headers that render <img class="custom-logo">
 *  - any plugin/widget that calls get_site_icon_url() directly
 * Returning a falsy URL forces those surfaces to fall back to either
 * our custom-logo filter (header lockup) or our wp_head favicon tags.
 */
add_filter( 'get_site_icon_url', '__return_empty_string', 100 );
add_filter( 'site_icon_meta_tags', '__return_empty_array', 100 );

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
		$home  = esc_url( home_url( '/' ) );
		$label = esc_attr__( 'Roji Peptides home', 'roji-child' );
		// Match tools.rojipeptides.com: lowercase wordmark + mono uppercase
		// eyebrow. Eyebrow is hidden below 768px in CSS so mobile stays tight.
		return sprintf(
			'<a href="%1$s" class="custom-logo-link roji-wordmark group" rel="home" aria-label="%2$s">'
			. '<span class="roji-wordmark__text">roji</span>'
			. '<span class="roji-wordmark__eyebrow" aria-hidden="true">RESEARCH PEPTIDES</span>'
			. '</a>',
			$home,
			$label
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
 * Inject the RESEARCH PEPTIDES eyebrow into Elementor's Site Title
 * widgets in the header.
 *
 * Why this exists despite get_custom_logo() above:
 *   The store's Elementor header template uses the Site Title widget
 *   (`theme-site-title` / `site-title`), NOT the Site Logo widget.
 *   Site Title renders `<h2 class="elementor-heading-title"><a>roji</a></h2>`
 *   from `get_bloginfo('name')` directly — `get_custom_logo` is never
 *   called, so our filter above never fires for that header.
 *
 *   Result: desktop + mobile show only the bare "roji" wordmark while
 *   tools.rojipeptides.com shows the full "roji RESEARCH TOOLS" lockup.
 *   We've shipped four CSS-only attempts to make this match; the
 *   actual fix is to inject the eyebrow into the rendered widget HTML
 *   so the markup matches the tools header.
 *
 * Strategy: filter `elementor/widget/render_content` for both Site
 * Title widget IDs. If the rendered HTML contains a single anchor
 * whose inner text is the lowercase wordmark, append the eyebrow
 * <span> just before the closing </a>. CSS in style.css /
 * elementor-overrides.css already lays the lockup out (baseline-
 * aligned flex with mono uppercase eyebrow, hidden on <768px).
 */
add_filter(
	'elementor/widget/render_content',
	function ( $content, $widget ) {
		if ( ! $widget || ! is_object( $widget ) || ! method_exists( $widget, 'get_name' ) ) {
			return $content;
		}
		$name = $widget->get_name();
		if ( 'theme-site-title' !== $name && 'site-title' !== $name ) {
			return $content;
		}
		// Only patch the header surface. In_the_loop guards against
		// random use of the widget inside post content.
		if ( ! is_string( $content ) || '' === trim( $content ) ) {
			return $content;
		}
		// Already patched (idempotent).
		if ( false !== strpos( $content, 'roji-wordmark__eyebrow' ) ) {
			return $content;
		}

		$eyebrow = '<span class="roji-wordmark__eyebrow" aria-hidden="true">RESEARCH PEPTIDES</span>';

		// Inject just before </a> if the widget rendered an anchor
		// (the typical Site Title path). Fall back to before </h1>/<h2>
		// if Elementor's "link" toggle is disabled and the anchor is
		// absent.
		if ( false !== stripos( $content, '</a>' ) ) {
			$patched = preg_replace( '#</a>#i', $eyebrow . '</a>', $content, 1 );
		} else {
			$patched = preg_replace( '#</(h1|h2|h3|h4|h5|h6)>#i', $eyebrow . '</$1>', $content, 1 );
		}

		// Add the wordmark layout class to the heading wrapper so the
		// flex/baseline rules in CSS take effect (without touching
		// Elementor's own classnames).
		$patched = preg_replace(
			'#(elementor-heading-title)#',
			'$1 roji-wordmark roji-wordmark--inline',
			$patched,
			1
		);

		// And tag the inner wordmark text so the CSS grabs it.
		$patched = preg_replace(
			'#(<a[^>]*>)([^<]+)#i',
			'$1<span class="roji-wordmark__text">$2</span>',
			$patched,
			1
		);

		return $patched ?: $content;
	},
	10,
	2
);

/**
 * Belt-and-suspenders for themes whose header path bypasses
 * get_custom_logo() and prints the site name directly. We attack
 * this from THREE angles so the wordmark can't drift:
 *
 *   1. wp_options.blogname = 'roji' (set via scripts/set-brand-options.php
 *      and asserted by the deploy pipeline). This wins even for code
 *      paths that read the option directly.
 *   2. bloginfo() filter as a guard, in case anything resets the option.
 *   3. pre_get_document_title filter so the BROWSER TAB / SEO title
 *      still reads the full brand 'Roji Peptides ...' even though
 *      the on-page header renders the lowercase 'roji' wordmark.
 */
add_filter(
	'bloginfo',
	function ( $output, $show ) {
		if ( is_admin() ) {
			return $output;
		}
		if ( in_array( $show, array( 'name', 'title', 'sitename' ), true ) ) {
			return 'roji';
		}
		return $output;
	},
	20,
	2
);

/**
 * Elementor Site Title / dynamic tags often call get_option( 'blogname' )
 * directly, bypassing bloginfo(). Keep the public site name lowercase
 * 'roji' without affecting WP-CLI or wp-admin screens.
 */
add_filter(
	'option_blogname',
	function ( $value ) {
		if ( ( defined( 'WP_CLI' ) && WP_CLI ) || is_admin() ) {
			return $value;
		}
		return 'roji';
	},
	20
);

/**
 * Override the document title (the <title> tag) so search engines,
 * social previews, and browser tabs see the full brand even though
 * the in-page wordmark is lowercase.
 *
 *  Home:        Roji Peptides - Research-grade peptides
 *  Inner page:  <Page Name> | Roji Peptides
 */
add_filter(
	'pre_get_document_title',
	function ( $title ) {
		if ( is_admin() ) {
			return $title;
		}
		$brand = 'Roji Peptides';
		if ( is_front_page() || is_home() ) {
			// Wider, intent-rich homepage title for SEO. Brand on the
			// LEFT (Google trims long titles from the right), key
			// claims after the pipe.
			return $brand . ' | Research-Grade Peptide Stacks with Third-Party COA';
		}
		if ( function_exists( 'is_shop' ) && is_shop() ) {
			return 'Shop Research-Grade Peptide Stacks | ' . $brand;
		}
		if ( function_exists( 'is_product' ) && is_product() ) {
			$pid = get_queried_object_id();
			$p   = $pid ? wc_get_product( $pid ) : null;
			if ( $p ) {
				return $p->get_name() . ' — Research-Grade · Third-Party COA | ' . $brand;
			}
		}
		if ( is_singular() ) {
			$page_title = wp_get_document_title_for_post( get_queried_object_id() );
			if ( $page_title ) {
				return $page_title . ' | ' . $brand;
			}
		}
		// Fall back to whatever WP/Yoast computed, but swap the lowercase
		// wordmark out for the proper brand on the right-hand-side suffix.
		if ( is_string( $title ) && $title ) {
			$title = preg_replace( '/(^|\s[\-|]\s)roji(\s|$)/i', '$1' . $brand . '$2', $title );
			return $title;
		}
		return $brand;
	},
	20
);

/**
 * Tiny helper used inside pre_get_document_title above. Returns the
 * raw post/page title for the queried object, or the empty string.
 */
if ( ! function_exists( 'wp_get_document_title_for_post' ) ) {
	function wp_get_document_title_for_post( $post_id ) {
		$p = $post_id ? get_post( $post_id ) : null;
		if ( ! $p ) {
			return '';
		}
		return wp_strip_all_tags( $p->post_title );
	}
}

/**
 * Inject the eyebrow into Hello Elementor's native header.
 *
 * Hello Elementor renders the header via its own PHP template that
 * outputs: <div class="site-title show"><a href="...">roji</a></div>
 * None of the Elementor widget filters fire for this path. We hook
 * `wp_footer` to inject a tiny DOM-patch script that transforms
 * the bare "roji" anchor into our "roji RESEARCH PEPTIDES" lockup.
 * Runs once on DOMContentLoaded.
 */
add_action(
	'wp_footer',
	function () {
		if ( is_admin() ) {
			return;
		}
		?>
<script>
(function(){
	var st = document.querySelector('.site-title a');
	if (!st) return;
	if (st.querySelector('.roji-wordmark__eyebrow')) return;
	st.classList.add('roji-wordmark');
	var txt = st.textContent.trim();
	st.innerHTML = '<span class="roji-wordmark__text">' + txt + '</span>'
		+ '<span class="roji-wordmark__eyebrow" aria-hidden="true">RESEARCH PEPTIDES</span>';
})();
</script>
		<?php
	},
	5
);

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
	.roji-wordmark {
		display: inline-flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: nowrap;
		text-decoration: none;
	}
	.roji-wordmark img { display: none !important; } /* hide any Customizer-uploaded image */
	.roji-wordmark__text {
		color: #f0f0f5;
		font-family: Inter, system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.25rem;
		letter-spacing: -0.025em;
		line-height: 1;
	}
	.roji-wordmark__eyebrow {
		font-family: "JetBrains Mono", ui-monospace, monospace;
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #8a8a9a;
		line-height: 1;
		white-space: nowrap;
		transition: color 0.15s ease;
	}
	.roji-wordmark:hover .roji-wordmark__eyebrow {
		color: #f0f0f5;
	}
	/* Hello Elementor native header lockup */
	.site-title a.roji-wordmark {
		display: inline-flex;
		align-items: baseline;
		gap: 12px;
		text-decoration: none;
	}
	@media (max-width: 480px) {
		.roji-wordmark__eyebrow {
			font-size: 9px;
			letter-spacing: 0.16em;
		}
		.roji-wordmark {
			gap: 8px;
		}
	}
</style>
		<?php
	},
	100
);
