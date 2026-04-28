<?php
/**
 * Roji Child — native affiliate program.
 *
 * Self-contained, no plugin dependency. Stores affiliates as `roji_affiliate`
 * custom posts and commissions as `roji_aff_commission` posts (one per
 * referred order line item). Cookie-based attribution with a 30-day window.
 *
 * Test-mode safety:
 *   - Commissions are recorded with status `pending` (locked for 30 days
 *     against refunds) then transition to `approved`. No automated payout
 *     is performed — payout is a manual action via a future admin tool.
 *   - The "Become an affiliate" page creates pending applications that an
 *     admin must approve before the affiliate's code starts working.
 *
 * Schema:
 *   roji_affiliate (post)
 *     post_title   = display name
 *     post_status  = pending | publish (=approved) | trash
 *     meta:
 *       _roji_aff_code         (string, uppercased, unique)
 *       _roji_aff_email        (string)
 *       _roji_aff_user_id      (int, optional WP user)
 *       _roji_aff_payout_email (string, where to send payment)
 *       _roji_aff_lifetime_gross  (float, cumulative referred subtotals)
 *       _roji_aff_lifetime_commission (float, cumulative paid commissions)
 *       _roji_aff_clicks       (int, lifetime click counter)
 *
 *   roji_aff_commission (post)
 *     post_title  = "Order #X — Affiliate Y"
 *     post_status = publish
 *     meta:
 *       _roji_comm_affiliate_id  (int, → roji_affiliate post)
 *       _roji_comm_order_id      (int, → WC order)
 *       _roji_comm_subtotal      (float, gross sale that produced this commission)
 *       _roji_comm_amount        (float, commission USD)
 *       _roji_comm_pct           (int,  tier % at time of sale)
 *       _roji_comm_status        (pending | approved | paid | reversed)
 *       _roji_comm_locked_until  (mysql datetime — when status auto-transitions to approved)
 *       _roji_comm_kind          (initial | renewal)
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_AFF_POST_TYPE  = 'roji_affiliate';
const ROJI_COMM_POST_TYPE = 'roji_aff_commission';
const ROJI_AFF_COOKIE     = 'roji_aff_ref';

/* -----------------------------------------------------------------------------
 * Custom post types
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		register_post_type(
			ROJI_AFF_POST_TYPE,
			array(
				'label'           => 'Affiliates',
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'menu_icon'       => 'dashicons-share',
				'menu_position'   => 56,
				'supports'        => array( 'title' ),
				'capability_type' => 'page',
				'map_meta_cap'    => true,
			)
		);
		register_post_type(
			ROJI_COMM_POST_TYPE,
			array(
				'label'           => 'Affiliate commissions',
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => 'edit.php?post_type=' . ROJI_AFF_POST_TYPE,
				'supports'        => array( 'title' ),
				'capability_type' => 'page',
				'map_meta_cap'    => true,
			)
		);
	},
	5
);

/* -----------------------------------------------------------------------------
 * Lookup helpers
 * -------------------------------------------------------------------------- */

/**
 * Get an affiliate post by its referral code (case-insensitive).
 * Only returns approved affiliates (post_status=publish).
 */
function roji_aff_get_by_code( $code ) {
	$code = strtoupper( trim( (string) $code ) );
	if ( $code === '' ) {
		return null;
	}
	$q = new WP_Query(
		array(
			'post_type'      => ROJI_AFF_POST_TYPE,
			'post_status'    => 'publish',
			'meta_key'       => '_roji_aff_code',
			'meta_value'     => $code,
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	return $q->have_posts() ? (int) $q->posts[0] : null;
}

/**
 * Get the lifetime gross volume an affiliate has produced.
 */
function roji_aff_lifetime_gross( $affiliate_id ) {
	return (float) get_post_meta( $affiliate_id, '_roji_aff_lifetime_gross', true );
}

/**
 * Generate a unique 8-char uppercase alphanumeric code.
 * Avoids ambiguous chars (0/O, 1/I) so codes are easy to type from a podcast.
 */
function roji_aff_generate_code() {
	$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	for ( $attempt = 0; $attempt < 20; $attempt++ ) {
		$code = '';
		for ( $i = 0; $i < 8; $i++ ) {
			$code .= $alphabet[ wp_rand( 0, strlen( $alphabet ) - 1 ) ];
		}
		if ( ! roji_aff_get_by_code( $code ) ) {
			return $code;
		}
	}
	return strtoupper( wp_generate_password( 12, false ) );
}

/* -----------------------------------------------------------------------------
 * Tracking — drop a cookie when ?ref=CODE is present
 *
 * First-touch attribution. We only overwrite a cookie if the customer
 * arrives via a different affiliate AND there's no order in progress.
 * (Standard "first cookie wins" — fairer for the affiliates who do the
 * education work.)
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		if ( empty( $_GET['ref'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		$code = strtoupper( sanitize_text_field( wp_unslash( $_GET['ref'] ) ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( $code === '' ) {
			return;
		}
		$existing = isset( $_COOKIE[ ROJI_AFF_COOKIE ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ ROJI_AFF_COOKIE ] ) ) : '';
		if ( $existing !== '' ) {
			return; // first-touch wins
		}
		$affiliate_id = roji_aff_get_by_code( $code );
		if ( ! $affiliate_id ) {
			return; // unknown code — silently ignore so typos don't taint analytics
		}

		$expires = time() + ( ROJI_AFF_COOKIE_DAYS * DAY_IN_SECONDS );
		setcookie( ROJI_AFF_COOKIE, $code, array(
			'expires'  => $expires,
			'path'     => '/',
			'secure'   => is_ssl(),
			'httponly' => true,
			'samesite' => 'Lax',
		) );
		$_COOKIE[ ROJI_AFF_COOKIE ] = $code; // make it visible this request

		$clicks = (int) get_post_meta( $affiliate_id, '_roji_aff_clicks', true );
		update_post_meta( $affiliate_id, '_roji_aff_clicks', $clicks + 1 );
	}
);

/* -----------------------------------------------------------------------------
 * Order attribution — copy cookie onto order at checkout
 * -------------------------------------------------------------------------- */

add_action(
	'woocommerce_checkout_create_order',
	function ( $order ) {
		$code = isset( $_COOKIE[ ROJI_AFF_COOKIE ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ ROJI_AFF_COOKIE ] ) ) : '';
		if ( $code === '' ) {
			return;
		}
		$affiliate_id = roji_aff_get_by_code( $code );
		if ( ! $affiliate_id ) {
			return;
		}
		$order->update_meta_data( '_roji_aff_code', strtoupper( $code ) );
		$order->update_meta_data( '_roji_aff_id', $affiliate_id );
	},
	10,
	1
);

/* -----------------------------------------------------------------------------
 * Commission creation — fire on order completed (initial) and on
 * subscription renewal payment success (renewal).
 * -------------------------------------------------------------------------- */

add_action( 'woocommerce_order_status_completed', 'roji_aff_create_commission_for_order', 30, 1 );
// Subscription renewals — both providers fire one of these on success.
add_action( 'woocommerce_subscription_renewal_payment_complete', 'roji_aff_create_commission_for_renewal', 30, 1 );
add_action( 'wps_sfw_renewal_payment_success', 'roji_aff_create_commission_for_renewal', 30, 1 );

function roji_aff_create_commission_for_order( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	$affiliate_id = (int) $order->get_meta( '_roji_aff_id' );
	if ( ! $affiliate_id ) {
		return;
	}
	roji_aff_record_commission( $affiliate_id, $order, 'initial' );
}

function roji_aff_create_commission_for_renewal( $sub_or_id ) {
	// Both subscription plugins pass either a sub object or an order id.
	if ( is_object( $sub_or_id ) && method_exists( $sub_or_id, 'get_last_order' ) ) {
		$order_id = $sub_or_id->get_last_order( 'ids', 'renewal' );
		$affiliate_id = (int) get_post_meta( $sub_or_id->get_id(), '_roji_aff_id', true );
	} else {
		$order_id = (int) $sub_or_id;
		$order    = wc_get_order( $order_id );
		$affiliate_id = $order ? (int) $order->get_meta( '_roji_aff_id' ) : 0;
		if ( ! $affiliate_id ) {
			// Subscription-level meta fallback.
			$parent_id = $order ? (int) $order->get_parent_id() : 0;
			if ( $parent_id ) {
				$affiliate_id = (int) get_post_meta( $parent_id, '_roji_aff_id', true );
			}
		}
	}
	if ( ! $order_id || ! $affiliate_id ) {
		return;
	}
	$order = wc_get_order( $order_id );
	if ( $order ) {
		roji_aff_record_commission( $affiliate_id, $order, 'renewal' );
	}
}

/**
 * Record a commission line. Idempotent: a (affiliate_id, order_id) pair
 * never produces more than one commission row.
 */
function roji_aff_record_commission( $affiliate_id, $order, $kind ) {
	if ( roji_aff_commission_exists( $affiliate_id, $order->get_id() ) ) {
		return;
	}
	$subtotal      = (float) $order->get_subtotal();
	if ( $subtotal <= 0 ) {
		return;
	}
	$lifetime      = roji_aff_lifetime_gross( $affiliate_id );
	$tier_pct      = roji_aff_tier_pct_for_volume( $lifetime );
	$effective_pct = $kind === 'renewal'
		? round( ( $tier_pct * (float) ROJI_AFF_RENEWAL_PCT_OF_TIER ) / 100, 2 )
		: $tier_pct;
	$amount        = round( $subtotal * ( $effective_pct / 100 ), 2 );

	$comm_id = wp_insert_post(
		array(
			'post_type'   => ROJI_COMM_POST_TYPE,
			'post_status' => 'publish',
			'post_title'  => sprintf( 'Order #%d — Affiliate #%d (%s)', $order->get_id(), $affiliate_id, $kind ),
		)
	);
	if ( is_wp_error( $comm_id ) || ! $comm_id ) {
		return;
	}

	$locked_until = gmdate( 'Y-m-d H:i:s', time() + ( ROJI_AFF_LOCK_DAYS * DAY_IN_SECONDS ) );
	update_post_meta( $comm_id, '_roji_comm_affiliate_id', (int) $affiliate_id );
	update_post_meta( $comm_id, '_roji_comm_order_id', (int) $order->get_id() );
	update_post_meta( $comm_id, '_roji_comm_subtotal', (float) $subtotal );
	update_post_meta( $comm_id, '_roji_comm_amount', (float) $amount );
	update_post_meta( $comm_id, '_roji_comm_pct', (float) $effective_pct );
	update_post_meta( $comm_id, '_roji_comm_status', 'pending' );
	update_post_meta( $comm_id, '_roji_comm_locked_until', $locked_until );
	update_post_meta( $comm_id, '_roji_comm_kind', $kind );

	// Update affiliate lifetime totals immediately for tier promotion.
	update_post_meta( $affiliate_id, '_roji_aff_lifetime_gross', $lifetime + $subtotal );

	$order->add_order_note(
		sprintf(
			'Affiliate commission recorded: $%.2f to affiliate #%d (%s%% on $%.2f, %s).',
			$amount,
			$affiliate_id,
			$effective_pct,
			$subtotal,
			$kind
		),
		false
	);
}

function roji_aff_commission_exists( $affiliate_id, $order_id ) {
	$q = new WP_Query(
		array(
			'post_type'      => ROJI_COMM_POST_TYPE,
			'post_status'    => 'any',
			'meta_query'     => array(
				array(
					'key'   => '_roji_comm_affiliate_id',
					'value' => (int) $affiliate_id,
				),
				array(
					'key'   => '_roji_comm_order_id',
					'value' => (int) $order_id,
				),
			),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	return $q->have_posts();
}

/* -----------------------------------------------------------------------------
 * Refund handling — reverse the commission if the order is refunded.
 * -------------------------------------------------------------------------- */

add_action(
	'woocommerce_order_status_refunded',
	function ( $order_id ) {
		$comms = get_posts(
			array(
				'post_type'      => ROJI_COMM_POST_TYPE,
				'meta_key'       => '_roji_comm_order_id',
				'meta_value'     => (int) $order_id,
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		foreach ( $comms as $comm_id ) {
			update_post_meta( $comm_id, '_roji_comm_status', 'reversed' );
			$affiliate_id = (int) get_post_meta( $comm_id, '_roji_comm_affiliate_id', true );
			$subtotal     = (float) get_post_meta( $comm_id, '_roji_comm_subtotal', true );
			if ( $affiliate_id && $subtotal > 0 ) {
				$lifetime = roji_aff_lifetime_gross( $affiliate_id );
				update_post_meta( $affiliate_id, '_roji_aff_lifetime_gross', max( 0, $lifetime - $subtotal ) );
			}
		}
	},
	30,
	1
);

/* -----------------------------------------------------------------------------
 * Daily cron — promote `pending` commissions to `approved` once the lock
 * window has passed. Test mode never moves anything to `paid`; that's a
 * manual operator step (or a future plugin / Stripe Connect integration).
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		if ( ! wp_next_scheduled( 'roji_aff_daily_unlock' ) ) {
			wp_schedule_event( time() + 60, 'daily', 'roji_aff_daily_unlock' );
		}
	}
);

add_action(
	'roji_aff_daily_unlock',
	function () {
		global $wpdb;
		$now  = current_time( 'mysql', true );
		$rows = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT pm.post_id FROM {$wpdb->postmeta} pm
				 INNER JOIN {$wpdb->postmeta} sm ON sm.post_id = pm.post_id AND sm.meta_key = '_roji_comm_status' AND sm.meta_value = 'pending'
				 WHERE pm.meta_key = '_roji_comm_locked_until' AND pm.meta_value <= %s",
				$now
			)
		);
		foreach ( $rows as $comm_id ) {
			update_post_meta( (int) $comm_id, '_roji_comm_status', 'approved' );
		}
	}
);

/* -----------------------------------------------------------------------------
 * Front-end signup — [roji_affiliate_signup] shortcode
 * -------------------------------------------------------------------------- */

add_shortcode( 'roji_affiliate_signup', 'roji_aff_render_signup_form' );

function roji_aff_render_signup_form() {
	$message = '';
	$success = false;
	if ( ! empty( $_POST['roji_aff_signup_nonce'] ) && wp_verify_nonce( wp_unslash( $_POST['roji_aff_signup_nonce'] ), 'roji_aff_signup' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$result = roji_aff_handle_signup( $_POST );
		if ( is_wp_error( $result ) ) {
			$message = $result->get_error_message();
		} else {
			$success = true;
			$message = sprintf(
				__( 'Thanks! Your application is pending review. We\'ll email %s when you\'re approved with your unique referral link.', 'roji-child' ),
				esc_html( wp_unslash( $_POST['email'] ?? '' ) )
			);
		}
	}

	$tier_default = (int) ROJI_AFF_TIER_DEFAULT_PCT;
	$tier_2_pct   = (int) ROJI_AFF_TIER_2_PCT;
	$tier_2_thr   = (int) ROJI_AFF_TIER_2_THRESHOLD;
	$tier_3_pct   = (int) ROJI_AFF_TIER_3_PCT;
	$tier_3_thr   = (int) ROJI_AFF_TIER_3_THRESHOLD;
	$cookie_days  = (int) ROJI_AFF_COOKIE_DAYS;

	ob_start();
	?>
	<div class="roji-aff-signup" style="max-width:560px;">
		<div style="margin-bottom:24px;">
			<h3 style="margin:0 0 8px;">Become an affiliate</h3>
			<p style="margin:0;color:var(--roji-muted,#888);">Earn on every customer you refer. Tiered:</p>
			<ul style="margin:8px 0 0;padding-left:20px;color:var(--roji-muted,#888);">
				<li><strong><?php echo esc_html( $tier_default ); ?>%</strong> on every sale (default)</li>
				<li><strong><?php echo esc_html( $tier_2_pct ); ?>%</strong> after $<?php echo esc_html( number_format( $tier_2_thr ) ); ?> in lifetime referrals</li>
				<li><strong><?php echo esc_html( $tier_3_pct ); ?>%</strong> after $<?php echo esc_html( number_format( $tier_3_thr ) ); ?> in lifetime referrals</li>
			</ul>
			<p style="margin:8px 0 0;color:var(--roji-muted,#888);font-size:13px;"><?php echo esc_html( $cookie_days ); ?>-day attribution window. Subscription renewals also pay.</p>
		</div>

		<?php if ( $message ) : ?>
			<div class="roji-aff-message" style="padding:12px 16px;border-radius:8px;margin-bottom:16px;background:<?php echo $success ? 'rgba(0,255,178,0.08)' : 'rgba(255,90,90,0.08)'; ?>;border:1px solid <?php echo $success ? 'rgba(0,255,178,0.25)' : 'rgba(255,90,90,0.25)'; ?>;">
				<?php echo esc_html( $message ); ?>
			</div>
		<?php endif; ?>

		<?php if ( ! $success ) : ?>
			<form method="post" action="" style="display:grid;gap:14px;">
				<?php wp_nonce_field( 'roji_aff_signup', 'roji_aff_signup_nonce' ); ?>
				<label style="display:grid;gap:6px;">
					<span>Display name *</span>
					<input type="text" name="display_name" required maxlength="80" style="padding:10px 12px;border:1px solid #333;border-radius:6px;background:transparent;color:inherit;">
				</label>
				<label style="display:grid;gap:6px;">
					<span>Email *</span>
					<input type="email" name="email" required maxlength="120" style="padding:10px 12px;border:1px solid #333;border-radius:6px;background:transparent;color:inherit;">
				</label>
				<label style="display:grid;gap:6px;">
					<span>Where do you have an audience? *</span>
					<textarea name="audience" required rows="3" maxlength="500" placeholder="e.g. @rojifit on IG, 25k followers; YouTube channel on biohacking; podcast on longevity..." style="padding:10px 12px;border:1px solid #333;border-radius:6px;background:transparent;color:inherit;font-family:inherit;"></textarea>
				</label>
				<label style="display:grid;gap:6px;">
					<span>Preferred referral code <span style="color:var(--roji-muted,#888);font-weight:400;">(optional · 4–12 chars · letters/numbers · we'll generate one if you skip this)</span></span>
					<input type="text" name="preferred_code" maxlength="12" pattern="[A-Za-z0-9]{4,12}" style="padding:10px 12px;border:1px solid #333;border-radius:6px;background:transparent;color:inherit;text-transform:uppercase;">
				</label>
				<label style="display:grid;gap:6px;">
					<span>Payout email (PayPal, Wise, etc.)</span>
					<input type="email" name="payout_email" maxlength="120" style="padding:10px 12px;border:1px solid #333;border-radius:6px;background:transparent;color:inherit;">
				</label>
				<button type="submit" class="button alt" style="margin-top:8px;">Apply</button>
			</form>
		<?php endif; ?>
	</div>
	<?php
	return ob_get_clean();
}

/**
 * @return int|WP_Error Affiliate post ID on success.
 */
function roji_aff_handle_signup( $form ) {
	$display_name   = sanitize_text_field( wp_unslash( $form['display_name'] ?? '' ) );
	$email          = sanitize_email( wp_unslash( $form['email'] ?? '' ) );
	$audience       = sanitize_textarea_field( wp_unslash( $form['audience'] ?? '' ) );
	$preferred_code = strtoupper( sanitize_text_field( wp_unslash( $form['preferred_code'] ?? '' ) ) );
	$payout_email   = sanitize_email( wp_unslash( $form['payout_email'] ?? '' ) );

	if ( $display_name === '' || ! is_email( $email ) || $audience === '' ) {
		return new WP_Error( 'roji_aff_invalid', 'Please complete all required fields.' );
	}

	// Reject duplicate emails.
	$existing = get_posts(
		array(
			'post_type'      => ROJI_AFF_POST_TYPE,
			'post_status'    => array( 'pending', 'publish' ),
			'meta_key'       => '_roji_aff_email',
			'meta_value'     => $email,
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	if ( ! empty( $existing ) ) {
		return new WP_Error( 'roji_aff_dupe', 'There is already an application or affiliate using this email.' );
	}

	$code = '';
	if ( $preferred_code !== '' && preg_match( '/^[A-Z0-9]{4,12}$/', $preferred_code ) && ! roji_aff_get_by_code( $preferred_code ) ) {
		$code = $preferred_code;
	} else {
		$code = roji_aff_generate_code();
	}

	$affiliate_id = wp_insert_post(
		array(
			'post_type'   => ROJI_AFF_POST_TYPE,
			'post_status' => 'pending', // approved manually by admin
			'post_title'  => $display_name,
		),
		true
	);
	if ( is_wp_error( $affiliate_id ) ) {
		return $affiliate_id;
	}

	update_post_meta( $affiliate_id, '_roji_aff_code', $code );
	update_post_meta( $affiliate_id, '_roji_aff_email', $email );
	update_post_meta( $affiliate_id, '_roji_aff_audience', $audience );
	update_post_meta( $affiliate_id, '_roji_aff_payout_email', $payout_email );
	update_post_meta( $affiliate_id, '_roji_aff_lifetime_gross', 0.0 );
	update_post_meta( $affiliate_id, '_roji_aff_lifetime_commission', 0.0 );
	update_post_meta( $affiliate_id, '_roji_aff_clicks', 0 );

	// Notify admin.
	wp_mail(
		get_option( 'admin_email' ),
		sprintf( '[%s] New affiliate application: %s', ROJI_BRAND_NAME, $display_name ),
		"New affiliate application:\n\n"
			. "Name:     {$display_name}\n"
			. "Email:    {$email}\n"
			. "Audience: {$audience}\n"
			. "Code:     {$code}\n\n"
			. "Approve in WP admin → Affiliates → Pending."
	);

	return $affiliate_id;
}

/* -----------------------------------------------------------------------------
 * On-approval: email the affiliate their referral link and code.
 * -------------------------------------------------------------------------- */

add_action(
	'transition_post_status',
	function ( $new_status, $old_status, $post ) {
		if ( $post->post_type !== ROJI_AFF_POST_TYPE ) {
			return;
		}
		if ( $new_status !== 'publish' || $old_status === 'publish' ) {
			return;
		}
		$email = get_post_meta( $post->ID, '_roji_aff_email', true );
		$code  = get_post_meta( $post->ID, '_roji_aff_code', true );
		if ( ! $email || ! $code ) {
			return;
		}
		$ref_link = add_query_arg( 'ref', $code, home_url( '/' ) );
		wp_mail(
			$email,
			sprintf( '[%s] You\'re approved! Here\'s your referral link', ROJI_BRAND_NAME ),
			"Welcome to the " . ROJI_BRAND_NAME . " affiliate program.\n\n"
				. "Your referral code: {$code}\n"
				. "Your referral link: {$ref_link}\n\n"
				. "You'll start earning " . ROJI_AFF_TIER_DEFAULT_PCT . "% on every sale that comes through your link.\n"
				. "After \$" . number_format( ROJI_AFF_TIER_2_THRESHOLD ) . " in lifetime referrals you bump to " . ROJI_AFF_TIER_2_PCT . "%, then "
				. ROJI_AFF_TIER_3_PCT . "% after \$" . number_format( ROJI_AFF_TIER_3_THRESHOLD ) . ".\n\n"
				. "Subscription renewals also pay (at " . ROJI_AFF_RENEWAL_PCT_OF_TIER . "% of your tier rate).\n\n"
				. "Track your performance by replying to this email any time — we'll add a self-serve dashboard soon."
		);
	},
	10,
	3
);

/* -----------------------------------------------------------------------------
 * REST: GET /wp-json/roji/v1/affiliates/metrics
 *
 * Aggregate read-only metrics for the Ads dashboard. Same auth as the
 * subscriptions endpoint (X-Roji-Token header).
 * -------------------------------------------------------------------------- */

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'roji/v1',
			'/affiliates/metrics',
			array(
				'methods'             => 'GET',
				'callback'            => 'roji_aff_rest_metrics',
				'permission_callback' => function ( $req ) {
					if ( ROJI_INTERNAL_API_TOKEN === '' ) {
						return false;
					}
					$got = $req->get_header( 'x-roji-token' );
					return is_string( $got ) && hash_equals( ROJI_INTERNAL_API_TOKEN, $got );
				},
			)
		);
	}
);

function roji_aff_rest_metrics() {
	global $wpdb;

	$counts_by_status = array( 'pending' => 0, 'publish' => 0, 'trash' => 0 );
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT post_status, COUNT(*) AS n FROM {$wpdb->posts} WHERE post_type = %s GROUP BY post_status",
			ROJI_AFF_POST_TYPE
		)
	);
	foreach ( $rows as $r ) {
		$counts_by_status[ $r->post_status ] = (int) $r->n;
	}

	$comm_status = array( 'pending' => 0, 'approved' => 0, 'paid' => 0, 'reversed' => 0 );
	$amount_by_status = array_fill_keys( array_keys( $comm_status ), 0.0 );
	$rows = $wpdb->get_results(
		"SELECT s.meta_value AS status, COUNT(*) AS n, COALESCE(SUM(CAST(a.meta_value AS DECIMAL(10,2))), 0) AS amount
		 FROM {$wpdb->postmeta} s
		 INNER JOIN {$wpdb->postmeta} a ON a.post_id = s.post_id AND a.meta_key = '_roji_comm_amount'
		 WHERE s.meta_key = '_roji_comm_status'
		 GROUP BY s.meta_value"
	);
	foreach ( $rows as $r ) {
		$comm_status[ $r->status ]     = (int) $r->n;
		$amount_by_status[ $r->status ] = (float) $r->amount;
	}

	$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( 30 * DAY_IN_SECONDS ) );
	$gmv_30d = (float) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COALESCE(SUM(CAST(sub.meta_value AS DECIMAL(10,2))), 0)
			 FROM {$wpdb->posts} p
			 INNER JOIN {$wpdb->postmeta} sub ON sub.post_id = p.ID AND sub.meta_key = '_roji_comm_subtotal'
			 WHERE p.post_type = %s AND p.post_date_gmt >= %s",
			ROJI_COMM_POST_TYPE,
			$cutoff
		)
	);

	$top = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT p.ID AS id, p.post_title AS name,
			        COALESCE(g.meta_value, '0') AS lifetime_gross,
			        COALESCE(c.meta_value, '0') AS lifetime_commission,
			        COALESCE(k.meta_value, '0') AS clicks,
			        co.meta_value AS code
			 FROM {$wpdb->posts} p
			 LEFT JOIN {$wpdb->postmeta} g  ON g.post_id  = p.ID AND g.meta_key  = '_roji_aff_lifetime_gross'
			 LEFT JOIN {$wpdb->postmeta} c  ON c.post_id  = p.ID AND c.meta_key  = '_roji_aff_lifetime_commission'
			 LEFT JOIN {$wpdb->postmeta} k  ON k.post_id  = p.ID AND k.meta_key  = '_roji_aff_clicks'
			 LEFT JOIN {$wpdb->postmeta} co ON co.post_id = p.ID AND co.meta_key = '_roji_aff_code'
			 WHERE p.post_type = %s AND p.post_status = 'publish'
			 ORDER BY CAST(g.meta_value AS DECIMAL(10,2)) DESC
			 LIMIT 10",
			ROJI_AFF_POST_TYPE
		)
	);

	return new WP_REST_Response(
		array(
			'enabled'         => true,
			'currency'        => get_woocommerce_currency(),
			'mode'            => 'test', // payouts not automated
			'tier_default_pct'=> (int) ROJI_AFF_TIER_DEFAULT_PCT,
			'tier_2_pct'      => (int) ROJI_AFF_TIER_2_PCT,
			'tier_2_threshold'=> (int) ROJI_AFF_TIER_2_THRESHOLD,
			'tier_3_pct'      => (int) ROJI_AFF_TIER_3_PCT,
			'tier_3_threshold'=> (int) ROJI_AFF_TIER_3_THRESHOLD,
			'cookie_days'     => (int) ROJI_AFF_COOKIE_DAYS,
			'lock_days'       => (int) ROJI_AFF_LOCK_DAYS,
			'affiliate_counts'=> array(
				'approved' => (int) ( $counts_by_status['publish'] ?? 0 ),
				'pending'  => (int) ( $counts_by_status['pending'] ?? 0 ),
			),
			'commission_counts' => $comm_status,
			'commission_amounts'=> $amount_by_status,
			'gmv_30d'         => round( $gmv_30d, 2 ),
			'top_affiliates'  => array_map(
				fn( $r ) => array(
					'id'                  => (int) $r->id,
					'name'                => $r->name,
					'code'                => $r->code,
					'clicks'              => (int) $r->clicks,
					'lifetime_gross'      => (float) $r->lifetime_gross,
					'lifetime_commission' => (float) $r->lifetime_commission,
					'tier_pct'            => roji_aff_tier_pct_for_volume( (float) $r->lifetime_gross ),
				),
				$top ?? array()
			),
			'as_of'           => current_time( 'c' ),
		),
		200
	);
}

/* -----------------------------------------------------------------------------
 * WP-CLI: wp roji aff:create / wp roji aff:approve / wp roji aff:status
 * -------------------------------------------------------------------------- */

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'roji aff:create',
		function ( $args, $assoc ) {
			$name  = $assoc['name'] ?? '';
			$email = $assoc['email'] ?? '';
			$code  = strtoupper( $assoc['code'] ?? '' );
			if ( ! $name || ! is_email( $email ) ) {
				WP_CLI::error( 'Required: --name="..." --email=... [--code=ABCD1234] [--approve]' );
			}
			if ( $code === '' ) {
				$code = roji_aff_generate_code();
			} elseif ( roji_aff_get_by_code( $code ) ) {
				WP_CLI::error( "Code {$code} is already taken." );
			}
			$id = wp_insert_post(
				array(
					'post_type'   => ROJI_AFF_POST_TYPE,
					'post_status' => isset( $assoc['approve'] ) ? 'publish' : 'pending',
					'post_title'  => $name,
				),
				true
			);
			if ( is_wp_error( $id ) ) {
				WP_CLI::error( $id->get_error_message() );
			}
			update_post_meta( $id, '_roji_aff_code', $code );
			update_post_meta( $id, '_roji_aff_email', $email );
			update_post_meta( $id, '_roji_aff_audience', $assoc['audience'] ?? '(via CLI)' );
			update_post_meta( $id, '_roji_aff_lifetime_gross', 0.0 );
			update_post_meta( $id, '_roji_aff_lifetime_commission', 0.0 );
			update_post_meta( $id, '_roji_aff_clicks', 0 );
			WP_CLI::success( sprintf( 'Created affiliate #%d with code %s (%s).', $id, $code, isset( $assoc['approve'] ) ? 'approved' : 'pending' ) );
		}
	);
	WP_CLI::add_command(
		'roji aff:approve',
		function ( $args ) {
			$id = (int) ( $args[0] ?? 0 );
			if ( ! $id || get_post_type( $id ) !== ROJI_AFF_POST_TYPE ) {
				WP_CLI::error( 'Usage: wp roji aff:approve <affiliate_id>' );
			}
			wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
			WP_CLI::success( "Approved affiliate #{$id}." );
		}
	);
	WP_CLI::add_command(
		'roji aff:status',
		function () {
			$res = roji_aff_rest_metrics();
			$data = $res->get_data();
			WP_CLI::log( 'Mode:          ' . $data['mode'] );
			WP_CLI::log( 'Tiers:         ' . $data['tier_default_pct'] . '% / ' . $data['tier_2_pct'] . '% @ $' . number_format( $data['tier_2_threshold'] ) . ' / ' . $data['tier_3_pct'] . '% @ $' . number_format( $data['tier_3_threshold'] ) );
			WP_CLI::log( 'Cookie window: ' . $data['cookie_days'] . ' days' );
			WP_CLI::log( 'Lock window:   ' . $data['lock_days'] . ' days' );
			WP_CLI::log( 'Affiliates:    ' . $data['affiliate_counts']['approved'] . ' approved · ' . $data['affiliate_counts']['pending'] . ' pending' );
			WP_CLI::log( 'GMV (30d):     $' . number_format( $data['gmv_30d'], 2 ) );
			WP_CLI::log( 'Commissions:   ' );
			foreach ( $data['commission_counts'] as $st => $n ) {
				WP_CLI::log( sprintf( '  %-8s %d  ($%s)', $st, $n, number_format( $data['commission_amounts'][ $st ], 2 ) ) );
			}
		}
	);
}
