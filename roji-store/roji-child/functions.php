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

define( 'ROJI_CHILD_VERSION', '1.5.1' );
define( 'ROJI_CHILD_DIR', get_stylesheet_directory() );
define( 'ROJI_CHILD_URI', get_stylesheet_directory_uri() );

require_once ROJI_CHILD_DIR . '/inc/config.php';
require_once ROJI_CHILD_DIR . '/inc/enqueue.php';
require_once ROJI_CHILD_DIR . '/inc/branding.php';
require_once ROJI_CHILD_DIR . '/inc/seo.php';
require_once ROJI_CHILD_DIR . '/inc/disclaimers.php';
require_once ROJI_CHILD_DIR . '/inc/woocommerce.php';
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
