<?php
/**
 * Roji Child — transactional email branding (WooCommerce + wp_mail).
 *
 * Operational mail only: order lifecycle, account, password, affiliates,
 * dunning, shipping. No newsletter / marketing automation here.
 *
 * What this file owns:
 *   - The "From: Roji Peptides <addr>" identity for everything WP sends.
 *   - A footer-text default when WC's option is empty.
 *   - `roji_wp_mail_plain()` — plain-text branded sender used by
 *     affiliates / dunning / magic-link flows.
 *   - `roji_wp_mail_branded_html()` — HTML branded sender that wraps an
 *     arbitrary body in our existing dark email shell so non-WC notices
 *     (affiliate approval, payouts, magic links) match transactional
 *     emails visually.
 *   - Lede copy added BEFORE WC's order detail table for
 *     refunded/partial-refund/invoice (WC defaults are thin).
 *   - Lede copy added AFTER the order detail table for completed orders
 *     (the COA download nudge — research-grade signal for compliance).
 *   - Shipped-order email trigger when admin enters a tracking number on
 *     a "completed" order (no plugin dependency).
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * "From" identity
 * -------------------------------------------------------------------------- */

/**
 * "From" address for WooCommerce emails and plain wp_mail() (affiliates, etc.).
 */
function roji_transactional_from_email() {
	if ( defined( 'ROJI_TRANSACTIONAL_FROM_EMAIL' ) && ROJI_TRANSACTIONAL_FROM_EMAIL !== '' && is_string( ROJI_TRANSACTIONAL_FROM_EMAIL ) && is_email( ROJI_TRANSACTIONAL_FROM_EMAIL ) ) {
		return ROJI_TRANSACTIONAL_FROM_EMAIL;
	}
	$admin = sanitize_email( (string) get_option( 'admin_email' ) );
	return $admin !== '' ? $admin : 'noreply@' . wp_parse_url( home_url(), PHP_URL_HOST );
}

/**
 * "From" name for outbound mail.
 */
function roji_transactional_from_name() {
	return defined( 'ROJI_BRAND_NAME' ) ? ROJI_BRAND_NAME : get_bloginfo( 'name', 'display' );
}

add_filter( 'woocommerce_email_from_name', 'roji_transactional_from_name', 99 );
add_filter( 'woocommerce_email_from_address', 'roji_transactional_from_email', 99 );

add_filter(
	'woocommerce_email_footer_text',
	function ( $text ) {
		$text = is_string( $text ) ? trim( $text ) : '';
		if ( $text !== '' ) {
			return $text;
		}
		$site = wp_specialchars_decode( get_bloginfo( 'name', 'display' ), ENT_QUOTES );
		/* translators: %s store name */
		return sprintf( __( '%s — research-grade peptides with third-party COA on every batch.', 'roji-child' ), $site );
	},
	99
);

/**
 * Encode display name for RFC 2047 when it contains non-ASCII.
 */
function roji_encode_rfc2047_name( $name ) {
	$name = (string) $name;
	if ( preg_match( '/[^\x20-\x7E]/', $name ) ) {
		return sprintf( '=?UTF-8?B?%s?=', base64_encode( $name ) );
	}
	return $name;
}

/**
 * Send plain-text mail with Roji From name/address (affiliate flows, etc.).
 *
 * @param string|string[] $to      Recipient(s).
 * @param string          $subject Subject line.
 * @param string          $message Body (plain text).
 * @return bool
 */
function roji_wp_mail_plain( $to, $subject, $message ) {
	$from_addr = roji_transactional_from_email();
	$from_name = roji_transactional_from_name();
	$headers   = array(
		'Content-Type: text/plain; charset=UTF-8',
		sprintf( 'From: %s <%s>', roji_encode_rfc2047_name( $from_name ), $from_addr ),
	);
	return wp_mail( $to, $subject, $message, $headers );
}

/* -----------------------------------------------------------------------------
 * Branded HTML mailer (wraps body in the WC email shell)
 *
 * Use for non-WC operational emails (magic-link, affiliate approval/payout,
 * dunning) so the visual identity matches order emails. Internally re-uses
 * WC's `email_header` / `email_footer` action hooks so our dark-mode
 * email-header.php / email-footer.php override automatically applies.
 * -------------------------------------------------------------------------- */

/**
 * `WC_Email` is abstract in current WooCommerce, so we ship a tiny
 * concrete subclass (see inc/class-roji-branded-notice-email.php) that
 * we instantiate purely to pass through the `woocommerce_email_header` /
 * `woocommerce_email_footer` action hooks and to call `style_inline()`.
 *
 * The class is NOT registered with the `woocommerce_email_classes`
 * filter — it never appears in WooCommerce settings and is never sent
 * through the WC pipeline. It only wraps wp_mail() callers in our
 * dark-mode shell.
 */
function roji_make_branded_email_stub() {
	if ( ! class_exists( 'WC_Email' ) ) {
		return null;
	}
	if ( ! class_exists( 'Roji_Branded_Notice_Email', false ) ) {
		require_once ROJI_CHILD_DIR . '/inc/class-roji-branded-notice-email.php';
	}
	if ( ! class_exists( 'Roji_Branded_Notice_Email', false ) ) {
		return null;
	}
	try {
		return new Roji_Branded_Notice_Email();
	} catch ( \Throwable $e ) {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( '[Roji emails] Failed to instantiate branded email stub: ' . $e->getMessage() );
		return null;
	}
}

/**
 * Render a branded HTML email body wrapped in the WooCommerce email shell.
 *
 * @param string $heading Heading shown in the dark header bar.
 * @param string $html    Body HTML (use simple <p>, <a>, <strong>, etc.).
 * @return string Full HTML document ready to email.
 */
function roji_render_branded_email_html( $heading, $html ) {
	$email = roji_make_branded_email_stub();
	if ( ! $email ) {
		// WooCommerce not loaded — fall back to a minimal inline shell.
		return '<!doctype html><html><body style="background:#0a0a0f;color:#f0f0f5;font-family:Inter,sans-serif;padding:24px;">'
			. '<h1 style="font-size:22px;margin:0 0 18px;color:#f0f0f5;">' . esc_html( $heading ) . '</h1>'
			. $html
			. '</body></html>';
	}
	ob_start();
	do_action( 'woocommerce_email_header', $heading, $email );
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- caller is responsible for trusted markup.
	do_action( 'woocommerce_email_footer', $email );
	$rendered = ob_get_clean();
	if ( method_exists( $email, 'style_inline' ) ) {
		// `style_inline` lives on WC_Email; it inlines email-styles.php CSS
		// (via Emogrifier or the WC fallback) so Gmail/Outlook keep dark mode.
		return $email->style_inline( $rendered );
	}
	return $rendered;
}

/**
 * Send a branded HTML email (uses the same dark shell as WC emails).
 *
 * @param string|string[] $to      Recipient(s).
 * @param string          $subject Subject line.
 * @param string          $heading Email heading text.
 * @param string          $html    Pre-built body HTML.
 * @return bool
 */
function roji_wp_mail_branded_html( $to, $subject, $heading, $html ) {
	$from_addr = roji_transactional_from_email();
	$from_name = roji_transactional_from_name();
	$headers   = array(
		'Content-Type: text/html; charset=UTF-8',
		sprintf( 'From: %s <%s>', roji_encode_rfc2047_name( $from_name ), $from_addr ),
	);
	$body = roji_render_branded_email_html( $heading, $html );
	return wp_mail( $to, $subject, $body, $headers );
}

/* -----------------------------------------------------------------------------
 * Customer order email — context lede BEFORE the order table
 * -------------------------------------------------------------------------- */

/**
 * Add brand-specific context paragraph above the order table for emails
 * where WC's defaults are weak (refunds, invoice). Processing/completed
 * are handled by our own template overrides under woocommerce/emails/.
 *
 * @param WC_Order      $order
 * @param bool          $sent_to_admin
 * @param bool          $plain_text
 * @param WC_Email|bool $email
 */
function roji_email_customer_order_context( $order, $sent_to_admin, $plain_text, $email ) {
	if ( $plain_text || $sent_to_admin || ! is_object( $email ) || ! isset( $email->id ) ) {
		return;
	}
	if ( ! $order instanceof WC_Order ) {
		return;
	}
	$ids = array(
		'customer_refunded_order',
		'customer_partially_refunded_order',
		'customer_invoice',
	);
	if ( ! in_array( (string) $email->id, $ids, true ) ) {
		return;
	}
	$support = roji_transactional_from_email();
	$lines   = array();
	switch ( (string) $email->id ) {
		case 'customer_refunded_order':
		case 'customer_partially_refunded_order':
			$lines[] = __( 'A refund has been processed for this order. Depending on your bank, it may take a few business days to appear on your statement.', 'roji-child' );
			break;
		case 'customer_invoice':
			$lines[] = __( 'Below is a summary of this order. If you have already paid, you can disregard any payment instructions.', 'roji-child' );
			break;
		default:
			return;
	}
	$lines[] = sprintf(
		/* translators: 1: support email */
		__( 'Need help? Reply to this message or write to %s.', 'roji-child' ),
		$support
	);
	$body = implode( ' ', $lines );
	echo '<p style="margin:0 0 16px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:14px;line-height:1.65;">' . esc_html( $body ) . '</p>';
}

add_action( 'woocommerce_email_order_details', 'roji_email_customer_order_context', 4, 4 );

/* -----------------------------------------------------------------------------
 * COA reminder + research-use disclaimer AFTER the order table
 * -------------------------------------------------------------------------- */

/**
 * Append the COA / research-use compliance block to customer order emails
 * AFTER the order details table. Compliance: every customer-facing order
 * email must carry the research-use language (matches site-wide footers).
 *
 * Hooked to `woocommerce_email_order_meta` at priority 99 so it lands
 * after WC's own meta block but before the additional_content + footer.
 */
add_action(
	'woocommerce_email_order_meta',
	function ( $order, $sent_to_admin, $plain_text, $email ) {
		if ( $plain_text || $sent_to_admin || ! is_object( $email ) || ! isset( $email->id ) ) {
			return;
		}
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		$customer_emails = array(
			'customer_processing_order',
			'customer_completed_order',
			'customer_on_hold_order',
			'customer_invoice',
		);
		if ( ! in_array( (string) $email->id, $customer_emails, true ) ) {
			return;
		}

		$account_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/my-account/' );
		$tools_url   = defined( 'ROJI_TOOLS_URL' ) ? ROJI_TOOLS_URL : 'https://tools.rojipeptides.com';
		?>
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 0;border-collapse:collapse;">
			<tr>
				<td style="background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:18px 20px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:13px;line-height:1.6;">
					<p style="margin:0 0 10px;color:#f0f0f5;font-size:14px;font-weight:600;">What's next</p>
					<ul style="margin:0;padding:0 0 0 18px;color:#c8c8d0;">
						<?php if ( $email->id === 'customer_processing_order' ) : ?>
							<li>We typically dispatch within 1–2 business days. You'll get a tracking email when it ships.</li>
						<?php elseif ( $email->id === 'customer_completed_order' ) : ?>
							<li>Your shipment is on the way. Tracking (if available) is in the order details above.</li>
						<?php endif; ?>
						<li>Each batch ships with a third-party Janoshik Certificate of Analysis. Download yours from <a href="<?php echo esc_url( $account_url ); ?>" style="color:#4f6df5;">your account</a>.</li>
						<li>Calculators, half-life data, and reconstitution charts at <a href="<?php echo esc_url( $tools_url ); ?>" style="color:#4f6df5;"><?php echo esc_html( wp_parse_url( $tools_url, PHP_URL_HOST ) ?: $tools_url ); ?></a>.</li>
					</ul>
				</td>
			</tr>
		</table>
		<p style="margin:18px 0 0;color:#55556a;font-family:Inter,sans-serif;font-size:11px;line-height:1.55;text-align:left;">
			For research and laboratory use only. Not for human consumption. Must be 21+.
		</p>
		<?php
	},
	99,
	4
);

/* -----------------------------------------------------------------------------
 * Shipping email trigger
 *
 * WooCommerce core does NOT send a "your order has shipped" email when an
 * order moves to `completed`. We add one — but only when there's actually
 * shipping information to send (a tracking number stored as order meta or
 * a dedicated note). This keeps us from double-emailing when "completed"
 * just means "marked done" with no tracking.
 *
 * Tracking number meta key: `_roji_tracking_number`
 * Tracking carrier meta:   `_roji_tracking_carrier`  (e.g. usps|ups|fedex)
 *
 * The admin order edit screen exposes both fields below.
 * -------------------------------------------------------------------------- */

/**
 * Send shipped notification when a tracking number is added (or updated).
 *
 * Triggered from the admin order screen via the meta update hook, AND
 * idempotently from `woocommerce_order_status_completed` if a tracking
 * number is already on file but the shipped email was never sent.
 */
function roji_send_order_shipped_email( $order ) {
	if ( is_numeric( $order ) ) {
		$order = wc_get_order( (int) $order );
	}
	if ( ! $order instanceof WC_Order ) {
		return;
	}
	if ( $order->get_meta( '_roji_shipped_email_sent' ) === 'yes' ) {
		return;
	}
	$email_to = sanitize_email( $order->get_billing_email() );
	if ( ! $email_to ) {
		return;
	}
	$tracking = trim( (string) $order->get_meta( '_roji_tracking_number' ) );
	if ( $tracking === '' ) {
		return;
	}
	$carrier   = strtolower( (string) $order->get_meta( '_roji_tracking_carrier' ) );
	$track_url = roji_carrier_tracking_url( $carrier, $tracking );
	$first     = esc_html( $order->get_billing_first_name() ?: 'there' );

	$html  = '<p style="margin:0 0 14px;">Hi ' . $first . ',</p>';
	$html .= '<p style="margin:0 0 14px;">Your order <strong>#' . esc_html( $order->get_order_number() ) . '</strong> has shipped. Standard transit is 2–5 business days from dispatch.</p>';
	$html .= '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">';
	$html .= '<tr><td style="padding:18px 20px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:14px;line-height:1.6;">';
	$html .= '<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;">Tracking</div>';
	$html .= '<div style="font-family:JetBrains Mono,monospace;font-size:15px;color:#f0f0f5;margin:6px 0 12px;">' . esc_html( $tracking ) . '</div>';
	if ( $track_url ) {
		$html .= '<a href="' . esc_url( $track_url ) . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:13px;">Track shipment →</a>';
	}
	$html .= '</td></tr></table>';
	$html .= '<p style="margin:0 0 14px;">Reminder: your batch ships with a third-party Janoshik COA. View it any time from <a href="' . esc_url( wc_get_page_permalink( 'myaccount' ) ) . '" style="color:#4f6df5;">your account</a>.</p>';
	$html .= '<p style="margin:18px 0 0;color:#8a8a9a;font-size:13px;">For research and laboratory use only. Not for human consumption.</p>';

	$subject = sprintf( '[%s] Your order #%s has shipped', defined( 'ROJI_BRAND_NAME' ) ? ROJI_BRAND_NAME : 'Roji', $order->get_order_number() );
	$sent    = roji_wp_mail_branded_html( $email_to, $subject, 'Your order has shipped', $html );

	if ( $sent ) {
		$order->update_meta_data( '_roji_shipped_email_sent', 'yes' );
		$order->add_order_note( 'Roji: shipped notification sent to ' . $email_to . ' (tracking ' . $tracking . ').' );
		$order->save();
	}
}

/**
 * Build a deep tracking URL for known carriers; empty string if unknown.
 */
function roji_carrier_tracking_url( $carrier, $tracking ) {
	$tracking = rawurlencode( (string) $tracking );
	switch ( strtolower( (string) $carrier ) ) {
		case 'usps':
			return 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=' . $tracking;
		case 'ups':
			return 'https://www.ups.com/track?tracknum=' . $tracking;
		case 'fedex':
			return 'https://www.fedex.com/fedextrack/?trknbr=' . $tracking;
		case 'dhl':
			return 'https://www.dhl.com/global-en/home/tracking.html?tracking-id=' . $tracking;
		default:
			return '';
	}
}

// Fire once when an order is marked completed (covers the "tracking already
// stored, then status flipped" case).
add_action(
	'woocommerce_order_status_completed',
	function ( $order_id ) {
		roji_send_order_shipped_email( $order_id );
	}
);

// Note: legacy postmeta hooks (added_post_meta / updated_post_meta) are
// not used here — they don't fire under HPOS. The "tracking added later"
// workflow is handled inside the metabox save handler instead.

/* -----------------------------------------------------------------------------
 * Admin order screen — tracking number / carrier fields
 * -------------------------------------------------------------------------- */

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box(
			'roji_order_tracking',
			'Roji — Shipment tracking',
			'roji_render_tracking_metabox',
			array( 'shop_order', 'woocommerce_page_wc-orders' ),
			'side',
			'default'
		);
	}
);

function roji_render_tracking_metabox( $post_or_order ) {
	if ( $post_or_order instanceof WP_Post ) {
		$order = wc_get_order( $post_or_order->ID );
	} else {
		$order = $post_or_order;
	}
	if ( ! $order instanceof WC_Order ) {
		echo '<p>Order not available.</p>';
		return;
	}
	wp_nonce_field( 'roji_save_tracking', 'roji_tracking_nonce' );
	$num     = (string) $order->get_meta( '_roji_tracking_number' );
	$carrier = (string) $order->get_meta( '_roji_tracking_carrier' );
	$sent    = $order->get_meta( '_roji_shipped_email_sent' ) === 'yes';
	?>
	<p style="margin:0 0 6px;font-weight:600;">Carrier</p>
	<select name="roji_tracking_carrier" style="width:100%;margin-bottom:12px;">
		<?php foreach ( array( '' => '— Select —', 'usps' => 'USPS', 'ups' => 'UPS', 'fedex' => 'FedEx', 'dhl' => 'DHL', 'other' => 'Other' ) as $val => $label ) : ?>
			<option value="<?php echo esc_attr( $val ); ?>" <?php selected( $carrier, $val ); ?>><?php echo esc_html( $label ); ?></option>
		<?php endforeach; ?>
	</select>

	<p style="margin:0 0 6px;font-weight:600;">Tracking number</p>
	<input type="text" name="roji_tracking_number" value="<?php echo esc_attr( $num ); ?>" style="width:100%;" placeholder="e.g. 9400111202..." />

	<p style="margin:14px 0 0;font-size:11px;color:#666;line-height:1.5;">
		Adding/updating this on a <strong>completed</strong> order triggers the customer's "shipped" email automatically.
		<?php if ( $sent ) : ?>
			<br><span style="color:#4ade80;">✓ Shipped email already sent.</span>
		<?php endif; ?>
	</p>
	<?php
}

add_action(
	'woocommerce_process_shop_order_meta',
	function ( $order_id, $post_or_order = null ) {
		if ( ! isset( $_POST['roji_tracking_nonce'] ) || ! wp_verify_nonce( wp_unslash( $_POST['roji_tracking_nonce'] ), 'roji_save_tracking' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		$carrier = isset( $_POST['roji_tracking_carrier'] ) ? sanitize_text_field( wp_unslash( $_POST['roji_tracking_carrier'] ) ) : '';
		$num     = isset( $_POST['roji_tracking_number'] ) ? sanitize_text_field( wp_unslash( $_POST['roji_tracking_number'] ) ) : '';
		$order->update_meta_data( '_roji_tracking_carrier', $carrier );
		$order->update_meta_data( '_roji_tracking_number', $num );
		$order->save();

		// HPOS orders don't fire the postmeta hooks below — re-trigger
		// the shipped email here so admin can paste tracking on an
		// already-completed order and have the customer notified.
		if ( $num !== '' && $order->get_status() === 'completed' ) {
			roji_send_order_shipped_email( $order );
		}
	},
	10,
	2
);
