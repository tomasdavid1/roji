<?php
/**
 * Roji Child — Subscription dunning (failed-payment retry ladder).
 *
 * When a renewal payment fails:
 *   1. Schedule retry on day 1, day 3, day 7 (configurable via
 *      ROJI_SUBS_DUNNING_DELAYS).
 *   2. After each failed retry, email the customer with an "update payment"
 *      link.
 *   3. After the final retry fails, set the subscription to 'on-hold'
 *      (which both plugins support) and email the customer + admin.
 *
 * Provider differences:
 *   - Free WP Swings plugin fires `wps_sfw_renewal_payment_failed` per its
 *     payment scheduler.
 *   - Paid Automattic plugin fires `woocommerce_subscription_payment_failed`.
 *
 * We hook both so the same logic applies regardless of which is installed.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Parsed dunning ladder as int[]. Default: [1, 3, 7].
 */
function roji_subs_dunning_delays() {
	$raw   = (string) ROJI_SUBS_DUNNING_DELAYS;
	$parts = array_filter( array_map( 'intval', explode( ',', $raw ) ), fn( $n ) => $n > 0 );
	return ! empty( $parts ) ? array_values( $parts ) : array( 1, 3, 7 );
}

/* -----------------------------------------------------------------------------
 * Hook into both providers' payment-failed events
 * -------------------------------------------------------------------------- */

add_action( 'woocommerce_subscription_payment_failed', 'roji_subs_handle_payment_failure', 10, 1 );
add_action( 'wps_sfw_renewal_payment_failed', 'roji_subs_handle_payment_failure', 10, 1 );

/**
 * Schedule the next retry attempt and email the customer.
 *
 * @param int|object $subscription Subscription post id (free plugin) or
 *                                  WC_Subscription instance (paid plugin).
 */
function roji_subs_handle_payment_failure( $subscription ) {
	$sub_id = is_object( $subscription ) ? $subscription->get_id() : (int) $subscription;
	if ( ! $sub_id ) {
		return;
	}

	$attempt = (int) get_post_meta( $sub_id, '_roji_dunning_attempt', true );
	$delays  = roji_subs_dunning_delays();

	if ( $attempt >= count( $delays ) ) {
		// Out of retries → put the subscription on hold and notify.
		roji_subs_set_status( $sub_id, 'on-hold' );
		roji_subs_send_dunning_email( $sub_id, 'final' );
		return;
	}

	$delay_days     = $delays[ $attempt ];
	$next_attempt   = $attempt + 1;
	$retry_at       = time() + ( $delay_days * DAY_IN_SECONDS );

	update_post_meta( $sub_id, '_roji_dunning_attempt', $next_attempt );
	update_post_meta( $sub_id, '_roji_dunning_last_failure_at', current_time( 'mysql' ) );

	if ( ! wp_next_scheduled( 'roji_subs_retry_payment', array( $sub_id ) ) ) {
		wp_schedule_single_event( $retry_at, 'roji_subs_retry_payment', array( $sub_id ) );
	}
	roji_subs_send_dunning_email( $sub_id, $next_attempt );
}

/**
 * Reset the dunning counter on successful renewal so future failures get a
 * fresh 3-strike window.
 */
add_action( 'woocommerce_subscription_payment_complete', 'roji_subs_reset_dunning', 10, 1 );
add_action( 'wps_sfw_renewal_payment_success', 'roji_subs_reset_dunning', 10, 1 );

function roji_subs_reset_dunning( $subscription ) {
	$sub_id = is_object( $subscription ) ? $subscription->get_id() : (int) $subscription;
	if ( $sub_id ) {
		delete_post_meta( $sub_id, '_roji_dunning_attempt' );
		delete_post_meta( $sub_id, '_roji_dunning_last_failure_at' );
	}
}

/* -----------------------------------------------------------------------------
 * Cron handler — actually retry the payment
 * -------------------------------------------------------------------------- */

add_action( 'roji_subs_retry_payment', 'roji_subs_dispatch_retry', 10, 1 );

function roji_subs_dispatch_retry( $sub_id ) {
	$provider = roji_subs_provider();
	if ( $provider === 'woocommerce_subscriptions' && function_exists( 'wcs_get_subscription' ) ) {
		$sub = wcs_get_subscription( $sub_id );
		if ( $sub && method_exists( $sub, 'payment_failed' ) ) {
			// Trigger a payment retry via the standard WCS scheduler.
			do_action( 'woocommerce_scheduled_subscription_payment', $sub_id );
		}
	} elseif ( $provider === 'wps_sfw' ) {
		// WP Swings exposes a do_action that the scheduler listens to.
		do_action( 'wps_sfw_renewal_payment_recurring_orders', $sub_id );
	}
}

/* -----------------------------------------------------------------------------
 * Email helpers
 * -------------------------------------------------------------------------- */

/**
 * @param int        $sub_id
 * @param int|string $attempt 1, 2, 3, or 'final'.
 */
function roji_subs_send_dunning_email( $sub_id, $attempt ) {
	$customer_email = roji_subs_customer_email( $sub_id );
	if ( ! $customer_email ) {
		return;
	}

	$update_url = roji_subs_update_payment_url( $sub_id );
	$is_final   = $attempt === 'final';
	$subject    = $is_final
		? sprintf( '[%s] Your subscription is paused — update payment to resume', ROJI_BRAND_NAME )
		: sprintf( '[%s] Action needed: payment failed for your subscription', ROJI_BRAND_NAME );

	$body  = $is_final
		? "We tried to charge your card a few times and it didn't go through. To avoid interrupting your protocol, please update your payment method:\n\n"
		: "Quick heads up — your last subscription renewal payment didn't go through. We'll automatically retry, but you can also fix it now in 30 seconds:\n\n";
	$body .= $update_url . "\n\n";
	$body .= "If you've already fixed this, you can ignore this message.\n\n— " . ROJI_BRAND_NAME;

	$heading = $is_final ? 'Subscription paused' : 'Action needed: payment failed';
	$lede    = $is_final
		? '<p style="margin:0 0 14px;">We tried to charge your card a few times and it didn\'t go through. To avoid interrupting your protocol, please update your payment method:</p>'
		: '<p style="margin:0 0 14px;">Quick heads up — your last subscription renewal payment didn\'t go through. We\'ll automatically retry, but you can fix it now in 30 seconds:</p>';
	$html  = $lede;
	$html .= '<p style="margin:18px 0;"><a href="' . esc_url( $update_url ) . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Update payment method →</a></p>';
	$html .= '<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;">If you\'ve already fixed this, you can ignore this message.</p>';

	if ( function_exists( 'roji_wp_mail_branded_html' ) ) {
		roji_wp_mail_branded_html( $customer_email, $subject, $heading, $html );
	} elseif ( function_exists( 'roji_wp_mail_plain' ) ) {
		roji_wp_mail_plain( $customer_email, $subject, $body );
	} else {
		wp_mail( $customer_email, $subject, $body );
	}

	if ( $is_final ) {
		$admin_note = "Subscription #{$sub_id} moved to on-hold after exhausting retries.";
		if ( function_exists( 'roji_wp_mail_plain' ) ) {
			roji_wp_mail_plain( get_option( 'admin_email' ), '[Roji] Subscription paused (dunning exhausted)', $admin_note );
		} else {
			wp_mail( get_option( 'admin_email' ), '[Roji] Subscription paused (dunning exhausted)', $admin_note );
		}
	}
}

function roji_subs_customer_email( $sub_id ) {
	// Both plugins store the customer user id on the subscription post; fall
	// back to the post author for older WP Swings versions.
	$user_id = (int) get_post_meta( $sub_id, '_customer_user', true );
	if ( ! $user_id ) {
		$user_id = (int) get_post_field( 'post_author', $sub_id );
	}
	if ( ! $user_id ) {
		return null;
	}
	$user = get_userdata( $user_id );
	return $user ? $user->user_email : null;
}

function roji_subs_update_payment_url( $sub_id ) {
	$provider = roji_subs_provider();
	if ( $provider === 'woocommerce_subscriptions' && function_exists( 'wcs_get_subscription' ) ) {
		$sub = wcs_get_subscription( $sub_id );
		if ( $sub && method_exists( $sub, 'get_change_payment_method_url' ) ) {
			return $sub->get_change_payment_method_url();
		}
	}
	// Fallback to my-account → subscriptions, where both plugins surface
	// "update payment" affordances.
	return wc_get_account_endpoint_url( 'subscriptions' );
}

/* -----------------------------------------------------------------------------
 * Status helpers
 * -------------------------------------------------------------------------- */

/**
 * Set subscription status using whichever provider is active.
 */
function roji_subs_set_status( $sub_id, $new_status ) {
	$provider = roji_subs_provider();
	if ( $provider === 'woocommerce_subscriptions' && function_exists( 'wcs_get_subscription' ) ) {
		$sub = wcs_get_subscription( $sub_id );
		if ( $sub ) {
			$sub->update_status( $new_status, 'Roji dunning ladder' );
			return;
		}
	}
	if ( $provider === 'wps_sfw' ) {
		// Free plugin stores status in the wps_subscription_status meta.
		$mapped = array(
			'on-hold'   => 'on-hold',
			'cancelled' => 'cancelled',
			'expired'   => 'expired',
			'active'    => 'active',
		);
		$value = $mapped[ $new_status ] ?? $new_status;
		update_post_meta( $sub_id, 'wps_subscription_status', $value );
	}
}
