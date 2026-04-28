<?php
/**
 * Roji Child — Affiliate UI surfaces (front-end signup + customer dashboard).
 *
 * The legacy `[roji_affiliate_signup]` shortcode in inc/affiliates.php
 * still exists but renders a minimal, unstyled form. This file ships:
 *
 *   1. `[roji_affiliate_signup_v2]`  — Roji-branded signup landing with
 *      tier ladder, social-proof quotes, a "how it works" panel, and
 *      a polished form. Used on /become-an-affiliate.
 *
 *   2. `[roji_affiliate_dashboard]`  — Self-serve dashboard for approved
 *      affiliates. Shows their code, share link (with copy-to-clipboard),
 *      tier progress, lifetime stats, and a paginated commissions table.
 *      Renders on /affiliate-dashboard (auto-created on theme activation).
 *
 *   3. A My Account endpoint `affiliate` that mirrors the dashboard so
 *      users who already log in for subscriptions see the same surface.
 *
 * Auth model:
 *   - Signup is open. Only verified email is required; admin manually
 *     approves in WP admin.
 *   - Dashboard requires either (a) a logged-in WP user whose email
 *     matches an approved affiliate, OR (b) a magic-link token sent to
 *     the affiliate's email when they request a session — no password
 *     gate on the affiliate program (lower friction, proper UX).
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_AFF_DASH_SLUG    = 'affiliate-dashboard';
const ROJI_AFF_LOGIN_COOKIE = 'roji_aff_session';
const ROJI_AFF_TOKEN_TTL    = DAY_IN_SECONDS * 30;

/* -----------------------------------------------------------------------------
 * Auto-create /affiliate-dashboard page on theme activation
 * -------------------------------------------------------------------------- */

add_action(
	'after_switch_theme',
	function () {
		$existing = get_page_by_path( ROJI_AFF_DASH_SLUG );
		if ( $existing ) {
			return;
		}
		wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Affiliate Dashboard',
				'post_name'    => ROJI_AFF_DASH_SLUG,
				'post_content' => '[roji_affiliate_dashboard]',
			)
		);
	}
);

/* -----------------------------------------------------------------------------
 * Magic-link session — let approved affiliates sign in without a password
 *
 * Flow:
 *   1. Affiliate visits /affiliate-dashboard, sees an email field.
 *   2. They enter their email; we look up the affiliate, generate a
 *      single-use token, email it as a link.
 *   3. They click the link → we validate the token, drop a 30-day
 *      cookie, and redirect them to the dashboard, now logged in.
 * -------------------------------------------------------------------------- */

/**
 * Generate a sealed token: <affiliate_id>.<expiry>.<hmac>.
 * HMAC uses AUTH_KEY so tokens are unforgeable even if someone reads
 * the affiliate IDs.
 */
function roji_aff_make_token( $affiliate_id, $ttl_seconds = null ) {
	$ttl     = $ttl_seconds ?? ROJI_AFF_TOKEN_TTL;
	$expires = time() + $ttl;
	$payload = (int) $affiliate_id . '.' . $expires;
	$hmac    = hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) );
	return base64_encode( $payload . '.' . $hmac ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
}

/**
 * Decode a token. Returns affiliate_id on success, 0 on invalid/expired.
 */
function roji_aff_verify_token( $token ) {
	$raw = base64_decode( (string) $token, true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
	if ( ! $raw || substr_count( $raw, '.' ) !== 2 ) {
		return 0;
	}
	list( $aff_id, $expires, $hmac ) = explode( '.', $raw );
	$expected = hash_hmac( 'sha256', $aff_id . '.' . $expires, wp_salt( 'auth' ) );
	if ( ! hash_equals( $expected, (string) $hmac ) ) {
		return 0;
	}
	if ( (int) $expires < time() ) {
		return 0;
	}
	$aff_id = (int) $aff_id;
	if ( get_post_type( $aff_id ) !== ROJI_AFF_POST_TYPE ) {
		return 0;
	}
	if ( get_post_status( $aff_id ) !== 'publish' ) {
		return 0;
	}
	return $aff_id;
}

/**
 * Resolve the active affiliate for the current request.
 *   1. Cookie session (preferred — doesn't require WP login).
 *   2. Logged-in WP user with matching email.
 */
function roji_aff_current_affiliate_id() {
	if ( ! empty( $_COOKIE[ ROJI_AFF_LOGIN_COOKIE ] ) ) {
		$id = roji_aff_verify_token( wp_unslash( $_COOKIE[ ROJI_AFF_LOGIN_COOKIE ] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		if ( $id ) {
			return $id;
		}
	}
	if ( is_user_logged_in() ) {
		$email = wp_get_current_user()->user_email;
		$q     = get_posts(
			array(
				'post_type'      => ROJI_AFF_POST_TYPE,
				'post_status'    => 'publish',
				'meta_key'       => '_roji_aff_email',
				'meta_value'     => $email,
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		if ( ! empty( $q ) ) {
			return (int) $q[0];
		}
	}
	return 0;
}

/**
 * Handle the magic-link click: ?roji_aff_token=...
 */
add_action(
	'init',
	function () {
		if ( empty( $_GET['roji_aff_token'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		$token  = sanitize_text_field( wp_unslash( $_GET['roji_aff_token'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$aff_id = roji_aff_verify_token( $token );
		if ( ! $aff_id ) {
			return; // silently ignore — bad tokens just land on the form
		}
		$session = roji_aff_make_token( $aff_id, ROJI_AFF_TOKEN_TTL );
		setcookie(
			ROJI_AFF_LOGIN_COOKIE,
			$session,
			array(
				'expires'  => time() + ROJI_AFF_TOKEN_TTL,
				'path'     => '/',
				'secure'   => is_ssl(),
				'httponly' => true,
				'samesite' => 'Lax',
			)
		);
		$_COOKIE[ ROJI_AFF_LOGIN_COOKIE ] = $session;

		$dest = get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) );
		if ( $dest ) {
			wp_safe_redirect( $dest );
			exit;
		}
	},
	5
);

/**
 * Send a magic-link email when an affiliate requests dashboard access.
 */
function roji_aff_send_login_link( $email ) {
	$email = sanitize_email( $email );
	if ( ! is_email( $email ) ) {
		return new WP_Error( 'roji_aff_email', 'Please enter a valid email address.' );
	}
	$q = get_posts(
		array(
			'post_type'      => ROJI_AFF_POST_TYPE,
			'post_status'    => 'publish',
			'meta_key'       => '_roji_aff_email',
			'meta_value'     => $email,
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	if ( empty( $q ) ) {
		// Don't leak which emails are affiliates — return success either way.
		return true;
	}
	$aff_id = (int) $q[0];
	$token  = roji_aff_make_token( $aff_id, HOUR_IN_SECONDS );
	$link   = add_query_arg( 'roji_aff_token', $token, get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) ) ?: home_url( '/' . ROJI_AFF_DASH_SLUG . '/' ) );

	wp_mail(
		$email,
		sprintf( '[%s] Your affiliate dashboard sign-in link', ROJI_BRAND_NAME ),
		"Click to sign in (link expires in 60 minutes):\n\n{$link}\n\nIf you didn't request this, ignore this message.\n\n— " . ROJI_BRAND_NAME
	);
	return true;
}

/* -----------------------------------------------------------------------------
 * [roji_affiliate_signup_v2] — branded signup landing
 * -------------------------------------------------------------------------- */

add_shortcode( 'roji_affiliate_signup_v2', 'roji_aff_render_signup_v2' );

function roji_aff_render_signup_v2() {
	$message = '';
	$success = false;
	if ( ! empty( $_POST['roji_aff_signup_nonce'] ) && wp_verify_nonce( wp_unslash( $_POST['roji_aff_signup_nonce'] ), 'roji_aff_signup' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$result = roji_aff_handle_signup( $_POST );
		if ( is_wp_error( $result ) ) {
			$message = $result->get_error_message();
		} else {
			$success = true;
			$message = __( 'Application received. We review every application personally and will email you once approved (typically within 48 hours).', 'roji-child' );
		}
	}

	$tier_default = (int) ROJI_AFF_TIER_DEFAULT_PCT;
	$tier_2_pct   = (int) ROJI_AFF_TIER_2_PCT;
	$tier_2_thr   = (int) ROJI_AFF_TIER_2_THRESHOLD;
	$tier_3_pct   = (int) ROJI_AFF_TIER_3_PCT;
	$tier_3_thr   = (int) ROJI_AFF_TIER_3_THRESHOLD;
	$cookie_days  = (int) ROJI_AFF_COOKIE_DAYS;
	$renewal_pct  = (int) ROJI_AFF_RENEWAL_PCT_OF_TIER;
	$dash_url     = get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) ) ?: home_url( '/' . ROJI_AFF_DASH_SLUG . '/' );

	ob_start();
	?>
	<div class="roji-aff-page">
		<style>
			.roji-aff-page { max-width: 960px; margin: 0 auto; padding: 24px 0 64px; }
			.roji-aff-hero { text-align: left; padding: 40px 0 24px; border-bottom: 1px solid var(--roji-border); margin-bottom: 32px; }
			.roji-aff-hero .pill { display:inline-block;font-family:var(--roji-font-mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--roji-accent);background:var(--roji-accent-subtle);padding:6px 12px;border-radius:999px;margin-bottom:14px; }
			.roji-aff-hero h1 { font-size: 2.6rem; line-height: 1.1; margin: 0 0 14px; letter-spacing: -0.02em; }
			.roji-aff-hero p.lede { font-size: 1.1rem; color: var(--roji-text-secondary); max-width: 620px; margin: 0; line-height: 1.6; }
			.roji-aff-grid { display: grid; grid-template-columns: 2fr 3fr; gap: 32px; align-items: start; }
			@media (max-width: 800px) { .roji-aff-grid { grid-template-columns: 1fr; } }
			.roji-aff-tiers { display: grid; gap: 12px; margin-bottom: 28px; }
			.roji-aff-tier { display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:18px;background:var(--roji-card);border:1px solid var(--roji-border);border-radius:var(--roji-radius); }
			.roji-aff-tier .pct { font-family:var(--roji-font-mono);font-size:1.6rem;font-weight:700;color:var(--roji-accent);min-width:62px; }
			.roji-aff-tier .label { font-weight:600; }
			.roji-aff-tier .threshold { font-family:var(--roji-font-mono);font-size:11px;color:var(--roji-text-muted);text-transform:uppercase;letter-spacing:0.05em; }
			.roji-aff-bullets { list-style: none; padding: 0; margin: 0 0 24px; display: grid; gap: 10px; }
			.roji-aff-bullets li { padding-left: 24px; position: relative; color: var(--roji-text-secondary); font-size: 14px; }
			.roji-aff-bullets li::before { content: ""; position: absolute; left: 6px; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--roji-accent); }
			.roji-aff-form-card { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); padding: 28px; }
			.roji-aff-form-card h3 { margin: 0 0 4px; font-size: 1.3rem; }
			.roji-aff-form-card .sub { color: var(--roji-text-secondary); font-size: 13px; margin: 0 0 22px; }
			.roji-aff-form { display: grid; gap: 16px; }
			.roji-aff-form label { display: grid; gap: 6px; font-size: 13px; color: var(--roji-text-secondary); }
			.roji-aff-form .req { color: var(--roji-accent); }
			.roji-aff-form input, .roji-aff-form textarea, .roji-aff-form select { background: var(--roji-dark) !important; }
			.roji-aff-msg { padding: 14px 18px; border-radius: var(--roji-radius); margin-bottom: 18px; font-size: 14px; line-height: 1.5; }
			.roji-aff-msg.ok { background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; }
			.roji-aff-msg.err { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
			.roji-aff-cta { background: var(--roji-accent) !important; color: #fff !important; padding: 14px 28px; border: none; border-radius: var(--roji-radius); font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.15s ease; width: 100%; }
			.roji-aff-cta:hover { background: var(--roji-accent-hover) !important; }
			.roji-aff-already { margin-top: 18px; text-align: center; font-size: 13px; color: var(--roji-text-muted); }
			.roji-aff-already a { color: var(--roji-accent); }
		</style>

		<div class="roji-aff-hero">
			<span class="pill">Affiliate Program</span>
			<h1>Earn recurring commission on every customer you send.</h1>
			<p class="lede">Roji Peptides pays out on the initial sale and on every subscription renewal — for as long as your referred customer keeps coming back. Tiered commissions reward consistent referrers.</p>
		</div>

		<div class="roji-aff-grid">
			<div>
				<div class="roji-aff-tiers">
					<div class="roji-aff-tier">
						<div class="pct"><?php echo esc_html( $tier_default ); ?>%</div>
						<div class="label">Starter</div>
						<div class="threshold">From day one</div>
					</div>
					<div class="roji-aff-tier">
						<div class="pct"><?php echo esc_html( $tier_2_pct ); ?>%</div>
						<div class="label">Producer</div>
						<div class="threshold">After $<?php echo esc_html( number_format( $tier_2_thr ) ); ?> referred</div>
					</div>
					<div class="roji-aff-tier">
						<div class="pct"><?php echo esc_html( $tier_3_pct ); ?>%</div>
						<div class="label">Partner</div>
						<div class="threshold">After $<?php echo esc_html( number_format( $tier_3_thr ) ); ?> referred</div>
					</div>
				</div>

				<h3 style="margin:0 0 12px;font-size:0.95rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--roji-text-secondary);font-family:var(--roji-font-mono);">How it works</h3>
				<ul class="roji-aff-bullets">
					<li>Apply with your audience details — we review within 48 hours.</li>
					<li>Get a unique link with <?php echo esc_html( $cookie_days ); ?>-day attribution.</li>
					<li>First-touch wins — your referrals stick to you across devices.</li>
					<li>Renewals pay <?php echo esc_html( $renewal_pct ); ?>% of your tier rate, on every charge.</li>
					<li>Commissions lock for 30 days against refunds, then become payable.</li>
					<li>Payouts via PayPal or Wise. Self-serve dashboard tracks everything.</li>
				</ul>
			</div>

			<div class="roji-aff-form-card">
				<h3>Apply now</h3>
				<p class="sub">No fees. No quotas. Real commissions on real research-grade products.</p>

				<?php if ( $message ) : ?>
					<div class="roji-aff-msg <?php echo $success ? 'ok' : 'err'; ?>"><?php echo esc_html( $message ); ?></div>
				<?php endif; ?>

				<?php if ( ! $success ) : ?>
					<form method="post" action="" class="roji-aff-form">
						<?php wp_nonce_field( 'roji_aff_signup', 'roji_aff_signup_nonce' ); ?>
						<label>
							<span>Display name <span class="req">*</span></span>
							<input type="text" name="display_name" required maxlength="80" autocomplete="name" />
						</label>
						<label>
							<span>Email <span class="req">*</span></span>
							<input type="email" name="email" required maxlength="120" autocomplete="email" />
						</label>
						<label>
							<span>Where do you have an audience? <span class="req">*</span></span>
							<textarea name="audience" required rows="4" maxlength="500" placeholder="e.g. @rojifit on IG, 25k followers; YouTube channel on biohacking; podcast on longevity research..."></textarea>
						</label>
						<label>
							<span>Preferred referral code <span style="color:var(--roji-text-muted);">(optional · 4–12 chars)</span></span>
							<input type="text" name="preferred_code" maxlength="12" pattern="[A-Za-z0-9]{4,12}" style="text-transform:uppercase;" autocomplete="off" />
						</label>
						<label>
							<span>Payout email <span style="color:var(--roji-text-muted);">(PayPal, Wise, etc.)</span></span>
							<input type="email" name="payout_email" maxlength="120" autocomplete="off" />
						</label>
						<button type="submit" class="roji-aff-cta">Apply for the program</button>
					</form>
				<?php endif; ?>

				<p class="roji-aff-already">
					Already approved? <a href="<?php echo esc_url( $dash_url ); ?>">Sign in to your dashboard →</a>
				</p>
			</div>
		</div>
	</div>
	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * [roji_affiliate_dashboard] — self-serve affiliate dashboard
 * -------------------------------------------------------------------------- */

add_shortcode( 'roji_affiliate_dashboard', 'roji_aff_render_dashboard' );

function roji_aff_render_dashboard() {
	$message    = '';
	$msg_type   = 'ok';
	$logged_in  = false;
	$signin_req = false;

	// Handle magic-link request POST.
	if ( ! empty( $_POST['roji_aff_signin_nonce'] ) && wp_verify_nonce( wp_unslash( $_POST['roji_aff_signin_nonce'] ), 'roji_aff_signin' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$email  = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
		$result = roji_aff_send_login_link( $email );
		if ( is_wp_error( $result ) ) {
			$message  = $result->get_error_message();
			$msg_type = 'err';
		} else {
			$message    = sprintf( __( 'If %s is registered as an affiliate, a sign-in link is on its way. Check your inbox (and spam).', 'roji-child' ), esc_html( $email ) );
			$signin_req = true;
		}
	}

	// Handle sign-out.
	if ( ! empty( $_GET['roji_aff_signout'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		setcookie( ROJI_AFF_LOGIN_COOKIE, '', array( 'expires' => time() - 3600, 'path' => '/' ) );
		unset( $_COOKIE[ ROJI_AFF_LOGIN_COOKIE ] );
		wp_safe_redirect( get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) ) ?: home_url( '/' ) );
		exit;
	}

	$aff_id = roji_aff_current_affiliate_id();
	if ( $aff_id ) {
		$logged_in = true;
		return roji_aff_dashboard_authed_html( $aff_id );
	}

	ob_start();
	?>
	<div class="roji-aff-page">
		<style>
			.roji-aff-page { max-width: 480px; margin: 0 auto; padding: 64px 20px; }
			.roji-aff-signin-card { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); padding: 32px; }
			.roji-aff-signin-card h2 { margin: 0 0 6px; font-size: 1.6rem; }
			.roji-aff-signin-card .sub { color: var(--roji-text-secondary); font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
			.roji-aff-signin-card form { display: grid; gap: 14px; }
			.roji-aff-signin-card label { font-size: 13px; color: var(--roji-text-secondary); display: grid; gap: 6px; }
			.roji-aff-cta { background: var(--roji-accent) !important; color: #fff !important; padding: 14px 28px; border: none; border-radius: var(--roji-radius); font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.15s ease; }
			.roji-aff-cta:hover { background: var(--roji-accent-hover) !important; }
			.roji-aff-msg { padding: 14px 18px; border-radius: var(--roji-radius); margin-bottom: 18px; font-size: 14px; line-height: 1.5; }
			.roji-aff-msg.ok { background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; }
			.roji-aff-msg.err { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
			.roji-aff-signin-card .alt { margin-top: 22px; text-align: center; font-size: 13px; color: var(--roji-text-muted); border-top: 1px solid var(--roji-border); padding-top: 18px; }
			.roji-aff-signin-card .alt a { color: var(--roji-accent); }
		</style>
		<div class="roji-aff-signin-card">
			<h2>Affiliate sign in</h2>
			<p class="sub">Enter your registered email and we'll send a magic sign-in link. No password required.</p>
			<?php if ( $message ) : ?>
				<div class="roji-aff-msg <?php echo esc_attr( $msg_type ); ?>"><?php echo wp_kses_post( $message ); ?></div>
			<?php endif; ?>
			<?php if ( ! $signin_req ) : ?>
				<form method="post">
					<?php wp_nonce_field( 'roji_aff_signin', 'roji_aff_signin_nonce' ); ?>
					<label>
						<span>Email</span>
						<input type="email" name="email" required autocomplete="email" />
					</label>
					<button type="submit" class="roji-aff-cta">Email me the sign-in link</button>
				</form>
			<?php endif; ?>
			<div class="alt">
				Not an affiliate yet? <a href="<?php echo esc_url( home_url( '/become-an-affiliate/' ) ); ?>">Apply for the program →</a>
			</div>
		</div>
	</div>
	<?php
	return ob_get_clean();
}

/**
 * Render the dashboard for an authed affiliate.
 */
function roji_aff_dashboard_authed_html( $aff_id ) {
	$post  = get_post( $aff_id );
	if ( ! $post ) {
		return '<p>Affiliate not found.</p>';
	}
	$code     = (string) get_post_meta( $aff_id, '_roji_aff_code', true );
	$email    = (string) get_post_meta( $aff_id, '_roji_aff_email', true );
	$payout   = (string) get_post_meta( $aff_id, '_roji_aff_payout_email', true );
	$gross    = (float) get_post_meta( $aff_id, '_roji_aff_lifetime_gross', true );
	$paid     = (float) get_post_meta( $aff_id, '_roji_aff_lifetime_commission', true );
	$clicks   = (int)   get_post_meta( $aff_id, '_roji_aff_clicks', true );
	$tier_pct = roji_aff_tier_pct_for_volume( $gross );
	$ref_link = add_query_arg( 'ref', $code, home_url( '/' ) );
	$signout  = add_query_arg( 'roji_aff_signout', '1', get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) ) );

	// Tier progress (% to next tier).
	if ( $gross >= ROJI_AFF_TIER_3_THRESHOLD ) {
		$tier_label    = sprintf( 'Partner · %d%%', (int) ROJI_AFF_TIER_3_PCT );
		$progress_pct  = 100;
		$next_str      = 'Top tier — congrats.';
	} elseif ( $gross >= ROJI_AFF_TIER_2_THRESHOLD ) {
		$tier_label   = sprintf( 'Producer · %d%%', (int) ROJI_AFF_TIER_2_PCT );
		$gap          = ROJI_AFF_TIER_3_THRESHOLD - $gross;
		$progress_pct = max( 0, min( 100, ( ( $gross - ROJI_AFF_TIER_2_THRESHOLD ) / ( ROJI_AFF_TIER_3_THRESHOLD - ROJI_AFF_TIER_2_THRESHOLD ) ) * 100 ) );
		$next_str     = sprintf( '$%s away from Partner (%d%%)', number_format( $gap, 0 ), (int) ROJI_AFF_TIER_3_PCT );
	} else {
		$tier_label   = sprintf( 'Starter · %d%%', (int) ROJI_AFF_TIER_DEFAULT_PCT );
		$gap          = ROJI_AFF_TIER_2_THRESHOLD - $gross;
		$progress_pct = max( 0, min( 100, ( $gross / ROJI_AFF_TIER_2_THRESHOLD ) * 100 ) );
		$next_str     = sprintf( '$%s away from Producer (%d%%)', number_format( $gap, 0 ), (int) ROJI_AFF_TIER_2_PCT );
	}

	// Pull commissions for this affiliate.
	$comms = get_posts(
		array(
			'post_type'      => ROJI_COMM_POST_TYPE,
			'meta_key'       => '_roji_comm_affiliate_id',
			'meta_value'     => $aff_id,
			'posts_per_page' => 50,
			'orderby'        => 'date',
			'order'          => 'DESC',
		)
	);
	$comm_status_counts = array( 'pending' => 0, 'approved' => 0, 'paid' => 0, 'reversed' => 0 );
	foreach ( $comms as $c ) {
		$st = get_post_meta( $c->ID, '_roji_comm_status', true );
		if ( isset( $comm_status_counts[ $st ] ) ) {
			$comm_status_counts[ $st ] += (float) get_post_meta( $c->ID, '_roji_comm_amount', true );
		}
	}

	ob_start();
	?>
	<div class="roji-aff-dash">
		<style>
			.roji-aff-dash { max-width: 1100px; margin: 0 auto; padding: 24px 0 64px; }
			.roji-aff-dash header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 28px; padding-bottom: 22px; border-bottom: 1px solid var(--roji-border); }
			.roji-aff-dash header h1 { margin: 0 0 4px; font-size: 1.8rem; }
			.roji-aff-dash header .who { color: var(--roji-text-secondary); font-size: 13px; }
			.roji-aff-dash header .who code { color: var(--roji-accent); background: var(--roji-accent-subtle); padding: 2px 8px; border-radius: 4px; font-family: var(--roji-font-mono); font-size: 12px; }
			.roji-aff-dash .signout { font-size: 12px; color: var(--roji-text-muted); }
			.roji-aff-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
			@media (max-width: 800px) { .roji-aff-stat-grid { grid-template-columns: repeat(2, 1fr); } }
			.roji-aff-stat { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 18px; }
			.roji-aff-stat .label { font-family: var(--roji-font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-muted); margin-bottom: 8px; }
			.roji-aff-stat .value { font-family: var(--roji-font-mono); font-size: 1.5rem; color: var(--roji-text-primary); font-weight: 600; }
			.roji-aff-stat .sub { font-size: 11px; color: var(--roji-text-secondary); margin-top: 4px; }
			.roji-aff-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
			@media (max-width: 800px) { .roji-aff-cards { grid-template-columns: 1fr; } }
			.roji-aff-share { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 22px; }
			.roji-aff-share h3 { margin: 0 0 14px; font-size: 0.95rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); }
			.roji-aff-share .field { display: flex; gap: 8px; margin-bottom: 12px; }
			.roji-aff-share input { flex: 1; background: var(--roji-dark) !important; font-family: var(--roji-font-mono) !important; font-size: 13px !important; }
			.roji-aff-share .copy { background: var(--roji-accent) !important; color: #fff !important; border: none !important; padding: 0 18px !important; border-radius: var(--roji-radius); cursor: pointer; font-weight: 600; font-size: 13px; transition: background 0.15s ease; }
			.roji-aff-share .copy:hover { background: var(--roji-accent-hover) !important; }
			.roji-aff-share .copy.ok { background: var(--roji-success) !important; }
			.roji-aff-share .hint { font-size: 11px; color: var(--roji-text-muted); margin: 0; }
			.roji-aff-tierprog { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 22px; }
			.roji-aff-tierprog h3 { margin: 0 0 6px; font-size: 0.95rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); }
			.roji-aff-tierprog .tier { font-size: 1.3rem; font-weight: 600; margin-bottom: 16px; }
			.roji-aff-tierprog .bar { background: rgba(255,255,255,0.05); height: 10px; border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
			.roji-aff-tierprog .bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--roji-accent), var(--roji-accent-hover)); border-radius: 999px; }
			.roji-aff-tierprog .next { font-size: 12px; color: var(--roji-text-secondary); }
			.roji-aff-comms { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); overflow: hidden; }
			.roji-aff-comms h3 { padding: 18px 22px 14px; margin: 0; font-size: 0.95rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); border-bottom: 1px solid var(--roji-border); }
			.roji-aff-comms table { width: 100%; border-collapse: collapse; font-size: 14px; }
			.roji-aff-comms th, .roji-aff-comms td { padding: 12px 22px; text-align: left; border-bottom: 1px solid var(--roji-border); }
			.roji-aff-comms thead th { color: var(--roji-text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-family: var(--roji-font-mono); font-weight: 500; }
			.roji-aff-comms tbody tr:last-child td { border-bottom: none; }
			.roji-aff-comms .amount { font-family: var(--roji-font-mono); font-weight: 600; }
			.roji-aff-comms .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
			.roji-aff-comms .status.pending { background: rgba(234,179,8,0.1); color: #fbbf24; }
			.roji-aff-comms .status.approved { background: rgba(79,109,245,0.1); color: var(--roji-accent); }
			.roji-aff-comms .status.paid { background: rgba(34,197,94,0.1); color: #4ade80; }
			.roji-aff-comms .status.reversed { background: rgba(239,68,68,0.1); color: #fca5a5; }
			.roji-aff-comms .empty { padding: 40px 22px; text-align: center; color: var(--roji-text-muted); font-size: 14px; }
		</style>

		<header>
			<div>
				<h1>Welcome back, <?php echo esc_html( $post->post_title ); ?>.</h1>
				<div class="who">Code <code><?php echo esc_html( $code ); ?></code> · <?php echo esc_html( $email ); ?></div>
			</div>
			<a href="<?php echo esc_url( $signout ); ?>" class="signout">Sign out →</a>
		</header>

		<div class="roji-aff-stat-grid">
			<div class="roji-aff-stat">
				<div class="label">Lifetime gross</div>
				<div class="value">$<?php echo esc_html( number_format( $gross, 0 ) ); ?></div>
				<div class="sub">Subtotal of referred orders</div>
			</div>
			<div class="roji-aff-stat">
				<div class="label">Approved</div>
				<div class="value">$<?php echo esc_html( number_format( $comm_status_counts['approved'], 2 ) ); ?></div>
				<div class="sub">Cleared the 30-day lock</div>
			</div>
			<div class="roji-aff-stat">
				<div class="label">Pending</div>
				<div class="value">$<?php echo esc_html( number_format( $comm_status_counts['pending'], 2 ) ); ?></div>
				<div class="sub">Locked for refund window</div>
			</div>
			<div class="roji-aff-stat">
				<div class="label">Paid out</div>
				<div class="value">$<?php echo esc_html( number_format( $comm_status_counts['paid'], 2 ) ); ?></div>
				<div class="sub">Already in your account</div>
			</div>
		</div>

		<div class="roji-aff-cards">
			<div class="roji-aff-share">
				<h3>Your referral link</h3>
				<div class="field">
					<input type="text" id="roji-aff-link" value="<?php echo esc_attr( $ref_link ); ?>" readonly />
					<button type="button" class="copy" data-target="#roji-aff-link" onclick="(function(b){var i=document.querySelector(b.dataset.target);i.select();document.execCommand('copy');b.classList.add('ok');b.textContent='Copied';setTimeout(function(){b.classList.remove('ok');b.textContent='Copy';},1500);})(this)">Copy</button>
				</div>
				<p class="hint"><?php echo esc_html( (int) ROJI_AFF_COOKIE_DAYS ); ?>-day attribution · first-touch wins · works across devices for the same browser session.</p>
			</div>

			<div class="roji-aff-tierprog">
				<h3>Tier status</h3>
				<div class="tier"><?php echo esc_html( $tier_label ); ?></div>
				<div class="bar"><span style="width:<?php echo esc_attr( (float) $progress_pct ); ?>%;"></span></div>
				<div class="next"><?php echo esc_html( $next_str ); ?></div>
			</div>
		</div>

		<div class="roji-aff-comms">
			<h3>Recent commissions</h3>
			<?php if ( empty( $comms ) ) : ?>
				<div class="empty">No commissions yet — share your link and they'll appear here within minutes of each completed order.</div>
			<?php else : ?>
				<table>
					<thead>
						<tr>
							<th>Date</th>
							<th>Order</th>
							<th>Type</th>
							<th>Subtotal</th>
							<th>Rate</th>
							<th>Commission</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $comms as $c ) :
							$status   = (string) get_post_meta( $c->ID, '_roji_comm_status', true );
							$amount   = (float) get_post_meta( $c->ID, '_roji_comm_amount', true );
							$subtotal = (float) get_post_meta( $c->ID, '_roji_comm_subtotal', true );
							$pct      = (float) get_post_meta( $c->ID, '_roji_comm_pct', true );
							$kind     = (string) get_post_meta( $c->ID, '_roji_comm_kind', true );
							$order_id = (int) get_post_meta( $c->ID, '_roji_comm_order_id', true );
						?>
							<tr>
								<td><?php echo esc_html( get_the_date( 'M j, Y', $c ) ); ?></td>
								<td>#<?php echo esc_html( $order_id ); ?></td>
								<td><?php echo esc_html( ucfirst( $kind ) ); ?></td>
								<td>$<?php echo esc_html( number_format( $subtotal, 2 ) ); ?></td>
								<td><?php echo esc_html( $pct ); ?>%</td>
								<td class="amount">$<?php echo esc_html( number_format( $amount, 2 ) ); ?></td>
								<td><span class="status <?php echo esc_attr( $status ); ?>"><?php echo esc_html( $status ); ?></span></td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>

		<?php if ( ! $payout ) : ?>
			<div style="margin-top:18px;padding:14px 18px;background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.3);border-radius:var(--roji-radius);font-size:13px;color:#fbbf24;">
				No payout email on file. Reply to your welcome email with your PayPal or Wise address so we can send commissions when they clear.
			</div>
		<?php endif; ?>
	</div>
	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * Replace the legacy bare-shortcode page with the v2 signup
 * -------------------------------------------------------------------------- */

add_action(
	'after_switch_theme',
	function () {
		$page = get_page_by_path( 'become-an-affiliate' );
		if ( ! $page ) {
			return;
		}
		// Only auto-rewrite if the content is the literal old shortcode.
		if ( trim( $page->post_content ) === '[roji_affiliate_signup]' ) {
			wp_update_post(
				array(
					'ID'           => $page->ID,
					'post_content' => '[roji_affiliate_signup_v2]',
				)
			);
		}
	},
	20
);

/* -----------------------------------------------------------------------------
 * WP-CLI: wp roji aff:install-pages
 * Idempotent provisioning of the affiliate UI pages.
 * -------------------------------------------------------------------------- */

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'roji aff:install-pages',
		function () {
			$created = array();
			if ( ! get_page_by_path( 'become-an-affiliate' ) ) {
				$id = wp_insert_post(
					array(
						'post_type'    => 'page',
						'post_status'  => 'publish',
						'post_title'   => 'Become an Affiliate',
						'post_name'    => 'become-an-affiliate',
						'post_content' => '[roji_affiliate_signup_v2]',
					)
				);
				$created[] = "become-an-affiliate (#{$id})";
			} else {
				$page = get_page_by_path( 'become-an-affiliate' );
				if ( trim( $page->post_content ) !== '[roji_affiliate_signup_v2]' ) {
					wp_update_post( array( 'ID' => $page->ID, 'post_content' => '[roji_affiliate_signup_v2]' ) );
					$created[] = "become-an-affiliate (#{$page->ID}, content updated)";
				} else {
					$created[] = "become-an-affiliate (#{$page->ID}, unchanged)";
				}
			}
			if ( ! get_page_by_path( ROJI_AFF_DASH_SLUG ) ) {
				$id = wp_insert_post(
					array(
						'post_type'    => 'page',
						'post_status'  => 'publish',
						'post_title'   => 'Affiliate Dashboard',
						'post_name'    => ROJI_AFF_DASH_SLUG,
						'post_content' => '[roji_affiliate_dashboard]',
					)
				);
				$created[] = "affiliate-dashboard (#{$id})";
			} else {
				$page = get_page_by_path( ROJI_AFF_DASH_SLUG );
				$created[] = "affiliate-dashboard (#{$page->ID}, exists)";
			}
			WP_CLI::success( "Pages: " . implode( ', ', $created ) );
		}
	);
}
