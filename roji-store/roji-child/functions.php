<?php
/**
 * Roji Child theme bootstrap.
 *
 * Loads modular includes from /inc and registers the child theme stylesheet.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ROJI_CHILD_DIR', get_stylesheet_directory() );
define( 'ROJI_CHILD_URI', get_stylesheet_directory_uri() );

/*
 * Cache-bust the child stylesheet (and any other asset that uses
 * ROJI_CHILD_VERSION as its `wp_enqueue_*` $ver) by deriving the
 * version string from style.css's mtime.
 *
 * Why
 * ---
 * 2026-05-20 incident: the cart-merge "Your order" card shipped to
 * production with all hooks firing and 26 matching CSS rules in the
 * deployed style.css, yet rendered totally unstyled in the browser.
 * Root cause: the constant was hardcoded "1.7.0" and never bumped on
 * deploys, so the browser + Cloudflare edge cache kept serving the
 * stale `style.css?ver=1.7.0` payload from before the new rules were
 * added. Bumping the version on every commit by hand is a recipe for
 * forgetting.
 *
 * Strategy
 * --------
 * Compose `<semver>+<mtime>`. Semver is for human/changelog readers;
 * the mtime suffix changes any time we re-rsync the file, which is
 * exactly the "did the bytes change?" question CDNs / browsers want
 * to answer. Result looks like "1.7.0+1747762319" — readable, sortable,
 * and uniquely identifies the on-disk asset.
 *
 * The constant is reused for elementor-overrides.css, branded favicons
 * and a couple of register_script calls. They'll change URL on every
 * style.css change too — wasteful by a few KB, but harmless.
 */
$roji_child_style_path     = get_stylesheet_directory() . '/style.css';
$roji_child_style_mtime    = file_exists( $roji_child_style_path ) ? (string) filemtime( $roji_child_style_path ) : 'static';
define( 'ROJI_CHILD_VERSION', '1.7.0+' . $roji_child_style_mtime );
unset( $roji_child_style_path, $roji_child_style_mtime );

require_once ROJI_CHILD_DIR . '/inc/config.php';
require_once ROJI_CHILD_DIR . '/inc/emails.php';
require_once ROJI_CHILD_DIR . '/inc/enqueue.php';
require_once ROJI_CHILD_DIR . '/inc/branding.php';
require_once ROJI_CHILD_DIR . '/inc/seo.php';
require_once ROJI_CHILD_DIR . '/inc/seo-merchant.php';
require_once ROJI_CHILD_DIR . '/inc/disclaimers.php';
require_once ROJI_CHILD_DIR . '/inc/woocommerce.php';
require_once ROJI_CHILD_DIR . '/inc/members-account.php';
require_once ROJI_CHILD_DIR . '/inc/header-cart.php';
require_once ROJI_CHILD_DIR . '/inc/mobile-nav.php';
require_once ROJI_CHILD_DIR . '/inc/checkout-country-lock.php';
require_once ROJI_CHILD_DIR . '/inc/tracking.php';
require_once ROJI_CHILD_DIR . '/inc/age-gate.php';
require_once ROJI_CHILD_DIR . '/inc/payment-failover.php';
require_once ROJI_CHILD_DIR . '/inc/trustpilot-widgets.php';
require_once ROJI_CHILD_DIR . '/inc/trustpilot-afs.php';
require_once ROJI_CHILD_DIR . '/inc/subscriptions.php';
require_once ROJI_CHILD_DIR . '/inc/subscriptions-dunning.php';
require_once ROJI_CHILD_DIR . '/inc/subscriptions-customer-ui.php';
require_once ROJI_CHILD_DIR . '/inc/affiliates.php';
require_once ROJI_CHILD_DIR . '/inc/affiliates-ui.php';
require_once ROJI_CHILD_DIR . '/inc/affiliates-admin.php';
require_once ROJI_CHILD_DIR . '/inc/cart-upsell.php';
require_once ROJI_CHILD_DIR . '/inc/gateway-reserve-order.php';
require_once ROJI_CHILD_DIR . '/inc/llms-txt.php';
require_once ROJI_CHILD_DIR . '/inc/research-compounds.php';
require_once ROJI_CHILD_DIR . '/inc/research-pages.php';
