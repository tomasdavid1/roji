<?php
/**
 * Roji Child — concrete WC_Email subclass used as a wrapper for branded
 * non-WC notices (affiliate flows, dunning, magic-link, shipped emails).
 *
 * NOT registered with the `woocommerce_email_classes` filter — it is
 * never surfaced in WC settings, never auto-sent, and never visible to
 * site admins. Its only purpose is to be a valid `WC_Email` instance so
 * we can pass it to `do_action('woocommerce_email_header', ...)` and
 * call `style_inline()` to inline our email-styles.php CSS.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'WC_Email' ) ) {
	return;
}

if ( ! class_exists( 'Roji_Branded_Notice_Email' ) ) {
	class Roji_Branded_Notice_Email extends WC_Email {

		public function __construct() {
			$this->id             = 'roji_branded_notice';
			$this->title          = 'Roji Branded Notice';
			$this->customer_email = true;
			$this->email_type     = 'html';
			parent::__construct();
		}

		// We intentionally do NOT implement `trigger()` — this email is
		// never sent through the WC pipeline. It exists purely as a
		// styled-inline wrapper for `wp_mail()` callers.
	}
}
