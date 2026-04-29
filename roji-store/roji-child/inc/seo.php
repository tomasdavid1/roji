<?php
/**
 * Roji Child — minimal SEO surface (meta description + canonical fallbacks).
 *
 * Yoast remains the canonical source of truth for per-page SEO. This
 * file ONLY fills the gap when:
 *   - Yoast is absent (e.g. fresh Kinsta migration before plugins
 *     are reinstalled), OR
 *   - A page exists that Yoast didn't get bespoke copy for (most
 *     product pages today).
 *
 * Behavior:
 *   - If Yoast is active (`WPSEO_VERSION` defined), this file no-ops.
 *     Yoast's filters win and it would be hostile to fight them.
 *   - If Yoast is NOT active, we emit:
 *       <meta name="description" content="...">
 *       <link rel="canonical" href="...">
 *     on every front-end page, computed per page-type.
 *
 * Meta-description rules:
 *   - Home: brand + key trust signals (third-party COA, ≥99% purity,
 *     research-grade language).
 *   - Shop: catalog overview.
 *   - Product: derived from product short_description or name + COA
 *     promise. Includes compound names + "research-grade" language
 *     per the SEO brief.
 *   - Other singular: post excerpt fallback.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @return bool True when Yoast is loaded — in which case we don't
 *              emit our own tags.
 */
function roji_seo_yoast_active() {
	return defined( 'WPSEO_VERSION' );
}

/**
 * Compute the meta description for the current request.
 *
 * @return string Plain text description, max ~160 chars.
 */
function roji_seo_compute_description() {
	$brand = 'Roji Peptides';

	if ( is_front_page() || is_home() ) {
		return 'Roji Peptides ships research-grade peptide stacks with a third-party Janoshik Certificate of Analysis on every batch. ≥99% purity. US-only. Free research tools and references included.';
	}

	if ( function_exists( 'is_shop' ) && is_shop() ) {
		return 'Browse Roji Peptides research-grade stacks: BPC-157, TB-500, CJC-1295, Ipamorelin, MK-677. Janoshik third-party COA on every batch. ≥99% purity. US-only.';
	}

	if ( function_exists( 'is_product' ) && is_product() ) {
		$pid = get_queried_object_id();
		$p   = $pid ? wc_get_product( $pid ) : null;
		if ( $p ) {
			$short = wp_strip_all_tags( $p->get_short_description() );
			$short = preg_replace( '/\s+/', ' ', (string) $short );
			$short = trim( $short );
			if ( $short && strlen( $short ) > 30 ) {
				$base = $short;
			} else {
				$base = sprintf(
					'%s — research-grade peptide from Roji Peptides. Third-party Janoshik COA, ≥99%% HPLC purity, batch-tested, US-only shipping.',
					$p->get_name()
				);
			}
			return roji_seo_truncate( $base, 158 );
		}
	}

	if ( function_exists( 'is_product_category' ) && is_product_category() ) {
		$term = get_queried_object();
		if ( $term && ! empty( $term->name ) ) {
			return sprintf(
				'%s — research-grade peptide products from Roji Peptides. Third-party COA, ≥99%% purity, batch-tested.',
				$term->name
			);
		}
	}

	if ( is_singular() ) {
		$pid = get_queried_object_id();
		$post = $pid ? get_post( $pid ) : null;
		if ( $post ) {
			$excerpt = $post->post_excerpt;
			if ( ! $excerpt ) {
				$excerpt = wp_strip_all_tags( $post->post_content );
			}
			$excerpt = preg_replace( '/\s+/', ' ', (string) $excerpt );
			$excerpt = trim( $excerpt );
			if ( $excerpt ) {
				return roji_seo_truncate( $excerpt, 158 );
			}
		}
	}

	// Generic fallback for archives, search, 404 — keeps every page
	// from emitting an empty description tag.
	return 'Roji Peptides — research-grade peptides with third-party COA on every batch.';
}

/**
 * Truncate at the nearest word boundary, append ellipsis if cut.
 */
function roji_seo_truncate( $text, $max ) {
	$text = trim( (string) $text );
	if ( strlen( $text ) <= $max ) {
		return $text;
	}
	$cut = substr( $text, 0, $max );
	$sp  = strrpos( $cut, ' ' );
	if ( false !== $sp ) {
		$cut = substr( $cut, 0, $sp );
	}
	return $cut . '…';
}

/**
 * Emit the meta description + canonical when Yoast isn't doing it.
 *
 * Hooked at priority 2 so it runs before any other late SEO add-ons
 * but after WP's own canonical (which we want to skip — see below).
 */
add_action(
	'wp_head',
	function () {
		if ( roji_seo_yoast_active() ) {
			return;
		}

		$desc = roji_seo_compute_description();
		if ( $desc ) {
			printf(
				"<meta name=\"description\" content=\"%s\">\n",
				esc_attr( $desc )
			);
			// Mirror to OG + Twitter so social previews aren't empty.
			// branding.php handles og:image; we just add the text.
			printf(
				"<meta property=\"og:description\" content=\"%s\">\n",
				esc_attr( $desc )
			);
			printf(
				"<meta name=\"twitter:description\" content=\"%s\">\n",
				esc_attr( $desc )
			);
		}

		$canonical = roji_seo_compute_canonical();
		if ( $canonical ) {
			printf(
				"<link rel=\"canonical\" href=\"%s\">\n",
				esc_url( $canonical )
			);
		}
	},
	2
);

/**
 * Compute the canonical URL for the current request.
 *
 * - Singular: the permalink.
 * - Front page: home_url('/').
 * - Shop: wc shop permalink.
 * - Product category / tag: term link.
 * - Else: WP's get_canonical_url() output.
 *
 * Strips known tracking params (`ref`, `utm_*`) so the canonical
 * stays deduplicated across affiliate/ads-tagged variations.
 */
function roji_seo_compute_canonical() {
	$url = '';
	if ( is_front_page() || is_home() ) {
		$url = home_url( '/' );
	} elseif ( function_exists( 'is_shop' ) && is_shop() ) {
		$url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
	} elseif ( is_singular() ) {
		$url = get_permalink( get_queried_object_id() );
	} elseif ( function_exists( 'is_product_category' ) && ( is_product_category() || is_tax() || is_category() || is_tag() ) ) {
		$term = get_queried_object();
		if ( $term && ! is_wp_error( $term ) ) {
			$link = get_term_link( $term );
			if ( ! is_wp_error( $link ) ) {
				$url = $link;
			}
		}
	}

	if ( ! $url ) {
		return '';
	}

	// Strip tracking junk so the canonical reflects the indexable
	// resource, not whichever campaign drove this hit.
	$strip = array( 'ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'roji_view' );
	$parts = wp_parse_url( $url );
	if ( isset( $parts['query'] ) ) {
		parse_str( $parts['query'], $q );
		foreach ( $strip as $k ) {
			unset( $q[ $k ] );
		}
		$query = http_build_query( $q );
		$url   = ( $parts['scheme'] ?? 'https' ) . '://' . ( $parts['host'] ?? '' )
			. ( $parts['path'] ?? '' )
			. ( $query ? '?' . $query : '' );
	}

	return $url;
}

/**
 * Suppress WP core's default `rel_canonical` emission when we're
 * the ones emitting it. Otherwise both fire and we get duplicate
 * <link rel="canonical"> tags. (Yoast does the same when active.)
 */
add_action(
	'template_redirect',
	function () {
		if ( ! roji_seo_yoast_active() ) {
			remove_action( 'wp_head', 'rel_canonical' );
		}
	}
);

/**
 * Productivity guard: ensure every WooCommerce product image has a
 * non-empty alt attribute. WC defaults to the post title when the
 * image alt is empty, but loop archives sometimes emit `alt=""` for
 * placeholder images. Filter the attachment image attrs to set a
 * sensible default derived from the product name.
 */
add_filter(
	'wp_get_attachment_image_attributes',
	function ( $attr, $attachment ) {
		if ( empty( $attr['alt'] ) ) {
			// On a product context, prefer the product name. Otherwise
			// fall back to the attachment's caption/title.
			global $product;
			if ( $product instanceof WC_Product ) {
				$attr['alt'] = $product->get_name() . ' — Roji Peptides research-grade peptide';
			} elseif ( $attachment instanceof WP_Post ) {
				$caption     = trim( (string) $attachment->post_excerpt );
				$attr['alt'] = $caption ? $caption : $attachment->post_title;
			}
		}
		return $attr;
	},
	10,
	2
);
