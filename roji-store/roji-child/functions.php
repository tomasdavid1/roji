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

define( 'ROJI_CHILD_VERSION', '1.0.0' );
define( 'ROJI_CHILD_DIR', get_stylesheet_directory() );
define( 'ROJI_CHILD_URI', get_stylesheet_directory_uri() );

require_once ROJI_CHILD_DIR . '/inc/config.php';
require_once ROJI_CHILD_DIR . '/inc/enqueue.php';
require_once ROJI_CHILD_DIR . '/inc/disclaimers.php';
require_once ROJI_CHILD_DIR . '/inc/woocommerce.php';
require_once ROJI_CHILD_DIR . '/inc/tracking.php';
require_once ROJI_CHILD_DIR . '/inc/age-gate.php';
require_once ROJI_CHILD_DIR . '/inc/payment-failover.php';
require_once ROJI_CHILD_DIR . '/inc/trustpilot-widgets.php';
require_once ROJI_CHILD_DIR . '/inc/trustpilot-afs.php';
require_once ROJI_CHILD_DIR . '/inc/subscriptions.php';
require_once ROJI_CHILD_DIR . '/inc/subscriptions-dunning.php';
require_once ROJI_CHILD_DIR . '/inc/affiliates.php';
