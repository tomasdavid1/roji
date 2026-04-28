<?php
/**
 * Roji Child — Trustpilot AFS (Automatic Feedback Service) integration.
 *
 * Sends a review invitation to the customer N days after a WooCommerce order
 * is marked completed (configurable via ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS).
 *
 * Architecture:
 *   1. On `woocommerce_order_status_completed`, we schedule a wp_cron event.
 *   2. The cron handler calls Trustpilot's Invitations API with both service
 *      review (one per order) and product reviews (one per line item).
 *   3. Trustpilot handles delivery, reminder, and clickthrough.
 *
 * If Trustpilot is not configured (missing secrets), the schedule is silently
 * skipped — the WP install behaves identically.
 *
 * Trustpilot endpoints used:
 *   - POST https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken
 *   - POST https://invitations-api.trustpilot.com/v1/private/business-units/{id}/email-invitations
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * Schedule on order completion
 * -------------------------------------------------------------------------- */

add_action(
	'woocommerce_order_status_completed',
	'roji_trustpilot_schedule_invitation',
	20,
	1
);

/**
 * Schedule a one-shot wp_cron event N days from now to send the invite.
 *
 * @param int $order_id WC order ID.
 */
function roji_trustpilot_schedule_invitation( $order_id ) {
	if ( ! roji_trustpilot_enabled() ) {
		return;
	}
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	$email = $order->get_billing_email();
	if ( empty( $email ) || ! is_email( $email ) ) {
		return;
	}

	$delay_days = (int) ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS;
	$timestamp  = time() + ( $delay_days * DAY_IN_SECONDS );

	// Idempotency: don't double-schedule if already pending for this order.
	if ( wp_next_scheduled( 'roji_trustpilot_send_invitation', array( $order_id ) ) ) {
		return;
	}

	wp_schedule_single_event(
		$timestamp,
		'roji_trustpilot_send_invitation',
		array( $order_id )
	);
}

/* -----------------------------------------------------------------------------
 * Cron handler
 * -------------------------------------------------------------------------- */

add_action( 'roji_trustpilot_send_invitation', 'roji_trustpilot_dispatch_invitation', 10, 1 );

/**
 * Cron callback: actually call Trustpilot.
 *
 * @param int $order_id WC order ID.
 */
function roji_trustpilot_dispatch_invitation( $order_id ) {
	if ( ! roji_trustpilot_enabled() ) {
		return;
	}
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}

	$token = roji_trustpilot_access_token();
	if ( is_wp_error( $token ) ) {
		roji_trustpilot_log( $order_id, 'token_error', $token->get_error_message() );
		return;
	}

	$payload = roji_trustpilot_build_invitation_payload( $order );
	if ( empty( $payload ) ) {
		return;
	}

	$endpoint = sprintf(
		'https://invitations-api.trustpilot.com/v1/private/business-units/%s/email-invitations',
		rawurlencode( ROJI_TRUSTPILOT_BUSINESS_UNIT_ID )
	);

	$response = wp_remote_post(
		$endpoint,
		array(
			'timeout' => 15,
			'headers' => array(
				'Authorization'       => 'Bearer ' . $token,
				'Content-Type'        => 'application/json',
				'x-business-user-id'  => ROJI_TRUSTPILOT_BUSINESS_USER_ID,
			),
			'body'    => wp_json_encode( $payload ),
		)
	);

	if ( is_wp_error( $response ) ) {
		roji_trustpilot_log( $order_id, 'http_error', $response->get_error_message() );
		return;
	}

	$code = wp_remote_retrieve_response_code( $response );
	$body = wp_remote_retrieve_body( $response );

	if ( $code >= 200 && $code < 300 ) {
		$order->add_order_note(
			__( 'Trustpilot review invitation sent.', 'roji-child' ),
			false
		);
		$order->update_meta_data( '_roji_trustpilot_invited_at', current_time( 'mysql' ) );
		$order->save();
	} else {
		roji_trustpilot_log( $order_id, 'api_error_' . $code, $body );
	}
}

/* -----------------------------------------------------------------------------
 * Payload building
 * -------------------------------------------------------------------------- */

/**
 * Build the Invitations API payload for a WooCommerce order.
 *
 * Trustpilot expects a single email-invitation object that can include
 * service review prompts and an array of line-item product references.
 *
 * @param WC_Order $order
 * @return array Payload, or empty array if no recipient email.
 */
function roji_trustpilot_build_invitation_payload( $order ) {
	$email = $order->get_billing_email();
	if ( empty( $email ) ) {
		return array();
	}

	$first_name = trim( $order->get_billing_first_name() );
	$last_name  = trim( $order->get_billing_last_name() );
	$consumer   = trim( $first_name . ' ' . $last_name );
	if ( $consumer === '' ) {
		$consumer = strstr( $email, '@', true );
	}

	// Reference Number = Order ID. Trustpilot uses this to dedupe and to
	// match conversations / replies back to the order.
	$reference_id = (string) $order->get_id();

	// Build product list for product reviews.
	$products = array();
	foreach ( $order->get_items() as $item ) {
		/** @var WC_Order_Item_Product $item */
		$product = $item->get_product();
		if ( ! $product ) {
			continue;
		}
		$products[] = array(
			'productUrl' => get_permalink( $product->get_id() ),
			'imageUrl'   => wp_get_attachment_url( $product->get_image_id() ) ?: '',
			'name'       => $product->get_name(),
			'sku'        => $product->get_sku(),
			// Trustpilot uses gtin/mpn/brand if present.
			'brand'      => ROJI_BRAND_NAME,
		);
	}

	$payload = array(
		'replyTo'          => get_option( 'admin_email' ),
		'senderName'       => ROJI_TRUSTPILOT_SENDER_NAME,
		'consumerEmail'    => $email,
		'consumerName'     => $consumer,
		'referenceNumber'  => $reference_id,
		'serviceReviewInvitation' => array(
			'preferredSendTime' => gmdate( 'Y-m-d\TH:i:s\Z' ),
			'redirectUri'       => home_url( '/thanks/' ),
			'tags'              => array( 'woocommerce' ),
			'locale'            => ROJI_TRUSTPILOT_LOCALE,
		),
	);

	if ( ROJI_TRUSTPILOT_TEMPLATE_ID !== '' ) {
		$payload['templateId'] = ROJI_TRUSTPILOT_TEMPLATE_ID;
	}

	if ( ! empty( $products ) ) {
		$payload['productReviewInvitation'] = array(
			'products' => $products,
		);
	}

	return $payload;
}

/* -----------------------------------------------------------------------------
 * OAuth — client credentials grant
 * -------------------------------------------------------------------------- */

/**
 * Get a (cached) Trustpilot OAuth access token.
 *
 * Tokens are valid for ~1h; we cache for 50 min to leave headroom.
 *
 * @return string|WP_Error
 */
function roji_trustpilot_access_token() {
	$cached = get_transient( 'roji_trustpilot_access_token' );
	if ( $cached ) {
		return $cached;
	}

	$basic = base64_encode( ROJI_TRUSTPILOT_API_KEY . ':' . ROJI_TRUSTPILOT_API_SECRET );

	$response = wp_remote_post(
		'https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken',
		array(
			'timeout' => 15,
			'headers' => array(
				'Authorization' => 'Basic ' . $basic,
				'Content-Type'  => 'application/x-www-form-urlencoded',
			),
			'body'    => 'grant_type=client_credentials',
		)
	);

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$code = wp_remote_retrieve_response_code( $response );
	$body = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( $code < 200 || $code >= 300 || empty( $body['access_token'] ) ) {
		return new WP_Error(
			'trustpilot_oauth',
			sprintf( 'Trustpilot OAuth returned HTTP %d', (int) $code ),
			array( 'response' => $body )
		);
	}

	set_transient(
		'roji_trustpilot_access_token',
		$body['access_token'],
		50 * MINUTE_IN_SECONDS
	);

	return $body['access_token'];
}

/* -----------------------------------------------------------------------------
 * Logging
 * -------------------------------------------------------------------------- */

/**
 * Log a Trustpilot event to PHP error log + the order notes (admin-visible).
 */
function roji_trustpilot_log( $order_id, $event, $message ) {
	$msg = sprintf( '[trustpilot][order=%d][%s] %s', (int) $order_id, $event, $message );
	if ( function_exists( 'error_log' ) ) {
		error_log( $msg ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}
	$order = wc_get_order( $order_id );
	if ( $order ) {
		$order->add_order_note( $msg, false );
	}
}
