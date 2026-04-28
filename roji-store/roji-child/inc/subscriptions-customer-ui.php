<?php
/**
 * Roji Child — Customer-facing subscription dunning UI.
 *
 * The dunning *engine* (retry ladder, status transitions, email notices)
 * lives in inc/subscriptions-dunning.php. This file ships the customer
 * surfaces:
 *
 *   1. Account banner — every page in /my-account/* shows a red banner
 *      if any of the user's subscriptions are mid-dunning, with a
 *      single-click "Update payment method" CTA pointing to the right
 *      provider URL.
 *
 *   2. /update-payment endpoint — a unified, branded landing page
 *      that:
 *        - For WooCommerce Subscriptions: redirects to the native
 *          "change payment method" form (which is already polished).
 *        - For WP Swings (free plugin): renders a custom form because
 *          the free plugin's UI is poor and confusing for customers.
 *        - For "no plugin": shows a graceful explainer with our
 *          support email.
 *
 *   3. Subscriptions list enhancement — adds an at-a-glance status
 *      pill ("Active", "Payment retrying — day 3 of 7", "Paused")
 *      to the My Account → Subscriptions table so customers can see
 *      what's wrong without opening each subscription.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_DUNNING_ENDPOINT = 'update-payment';

/* -----------------------------------------------------------------------------
 * Custom My Account endpoint: /my-account/update-payment/
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		add_rewrite_endpoint( ROJI_DUNNING_ENDPOINT, EP_ROOT | EP_PAGES );
	}
);

add_filter(
	'woocommerce_account_menu_items',
	function ( $items ) {
		// Only inject a menu link if user has at least one subscription
		// (logged-in check already happens because this is a /my-account/ template).
		if ( ! is_user_logged_in() ) {
			return $items;
		}
		if ( roji_dunning_user_has_subs( get_current_user_id() ) ) {
			$reordered = array();
			foreach ( $items as $key => $label ) {
				$reordered[ $key ] = $label;
				if ( $key === 'subscriptions' ) {
					$reordered[ ROJI_DUNNING_ENDPOINT ] = __( 'Payment method', 'roji-child' );
				}
			}
			// If subscriptions endpoint is absent (no plugin renders it), append at end.
			if ( ! isset( $reordered[ ROJI_DUNNING_ENDPOINT ] ) ) {
				$reordered[ ROJI_DUNNING_ENDPOINT ] = __( 'Payment method', 'roji-child' );
			}
			return $reordered;
		}
		return $items;
	}
);

add_action(
	'woocommerce_account_' . ROJI_DUNNING_ENDPOINT . '_endpoint',
	'roji_dunning_render_endpoint'
);

/**
 * Render the customer-facing payment-method update view.
 */
function roji_dunning_render_endpoint() {
	$user_id = get_current_user_id();
	if ( ! $user_id ) {
		echo '<p>' . esc_html__( 'You need to sign in to update your payment method.', 'roji-child' ) . '</p>';
		return;
	}
	$subs = roji_dunning_get_user_subscriptions( $user_id );
	?>
	<style>
		.roji-pm { display: grid; gap: 16px; }
		.roji-pm h2 { margin: 0 0 6px; font-size: 1.5rem; }
		.roji-pm .lede { color: var(--roji-text-secondary); margin: 0 0 8px; font-size: 14px; line-height: 1.6; }
		.roji-pm-sub { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 18px; }
		.roji-pm-sub.danger { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.04); }
		.roji-pm-sub.warn { border-color: rgba(234,179,8,0.4); background: rgba(234,179,8,0.04); }
		.roji-pm-sub header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
		.roji-pm-sub header strong { font-size: 15px; }
		.roji-pm-sub .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
		.roji-pm-sub .pill.active { background: rgba(34,197,94,0.1); color: #4ade80; }
		.roji-pm-sub .pill.retrying { background: rgba(234,179,8,0.1); color: #fbbf24; }
		.roji-pm-sub .pill.paused { background: rgba(239,68,68,0.1); color: #fca5a5; }
		.roji-pm-sub .pill.cancelled { background: rgba(255,255,255,0.06); color: var(--roji-text-muted); }
		.roji-pm-sub .meta { color: var(--roji-text-secondary); font-size: 13px; line-height: 1.6; }
		.roji-pm-sub .meta code { font-family: var(--roji-font-mono); font-size: 12px; color: var(--roji-text-primary); background: rgba(255,255,255,0.04); padding: 1px 6px; border-radius: 3px; }
		.roji-pm-sub .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
		.roji-pm-sub .btn { display: inline-block; padding: 10px 18px; border-radius: var(--roji-radius); font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.15s ease; border: none; cursor: pointer; }
		.roji-pm-sub .btn.primary { background: var(--roji-accent); color: #fff !important; }
		.roji-pm-sub .btn.primary:hover { background: var(--roji-accent-hover); }
		.roji-pm-sub .btn.secondary { background: rgba(255,255,255,0.04); color: var(--roji-text-primary) !important; border: 1px solid var(--roji-border); }
		.roji-pm-sub .btn.secondary:hover { border-color: var(--roji-border-hover); }
		.roji-pm-empty { text-align: center; padding: 40px 20px; color: var(--roji-text-muted); }
	</style>

	<div class="roji-pm">
		<div>
			<h2><?php echo esc_html__( 'Payment method', 'roji-child' ); ?></h2>
			<p class="lede">Manage the card on file for each of your active subscriptions. Updating one card here doesn't touch the others — each subscription has its own payment instrument.</p>
		</div>

		<?php if ( empty( $subs ) ) : ?>
			<div class="roji-pm-empty">
				<?php esc_html_e( 'No subscriptions on file. Subscribe via the cart toggle on any stack to enable autoship.', 'roji-child' ); ?>
			</div>
		<?php else : ?>
			<?php foreach ( $subs as $sub_info ) :
				$sub_id   = $sub_info['id'];
				$status   = $sub_info['status'];        // active|on-hold|cancelled|expired
				$dunning  = (int) get_post_meta( $sub_id, '_roji_dunning_attempt', true );
				$next_at  = (int) get_post_meta( $sub_id, '_roji_dunning_next_retry_at', true );
				$delays   = function_exists( 'roji_subs_dunning_delays' ) ? roji_subs_dunning_delays() : array( 1, 3, 7 );
				$total    = count( $delays );

				$state = 'active';
				if ( $status === 'on-hold' ) {
					$state = 'paused';
				} elseif ( $status === 'cancelled' || $status === 'expired' ) {
					$state = 'cancelled';
				} elseif ( $dunning > 0 ) {
					$state = 'retrying';
				}

				$update_url = roji_subs_update_payment_url( $sub_id );
				$kind_class = $state === 'paused' ? 'danger' : ( $state === 'retrying' ? 'warn' : '' );
			?>
				<div class="roji-pm-sub <?php echo esc_attr( $kind_class ); ?>">
					<header>
						<strong><?php echo esc_html( $sub_info['title'] ); ?></strong>
						<span class="pill <?php echo esc_attr( $state ); ?>">
							<?php
								echo esc_html(
									$state === 'paused'   ? 'Paused — payment failed' :
									( $state === 'retrying' ? sprintf( 'Payment retrying — attempt %d of %d', $dunning, $total ) :
									( $state === 'cancelled' ? 'Cancelled' : 'Active' ) )
								);
							?>
						</span>
					</header>

					<div class="meta">
						<?php if ( $state === 'paused' ) : ?>
							<p>Your last few renewal payments didn't go through and we've paused the subscription. Update your payment method to resume — your card won't be charged until you complete the update.</p>
						<?php elseif ( $state === 'retrying' ) : ?>
							<p>Heads up — your last renewal payment didn't go through. We're automatically retrying, but you can fix it now in 30 seconds and avoid any interruption.</p>
						<?php else : ?>
							<p>
								Subscription <code>#<?php echo esc_html( $sub_id ); ?></code>
								<?php if ( ! empty( $sub_info['next_payment_iso'] ) ) : ?>
									· Next payment <?php echo esc_html( $sub_info['next_payment_human'] ); ?>
								<?php endif; ?>
							</p>
						<?php endif; ?>
					</div>

					<div class="actions">
						<?php if ( $state !== 'cancelled' ) : ?>
							<a href="<?php echo esc_url( $update_url ); ?>" class="btn primary">
								<?php echo esc_html( $state === 'paused' || $state === 'retrying' ? 'Update card to resume' : 'Update payment method' ); ?>
							</a>
						<?php endif; ?>
						<a href="<?php echo esc_url( wc_get_account_endpoint_url( 'subscriptions' ) ); ?>" class="btn secondary">View subscription</a>
					</div>
				</div>
			<?php endforeach; ?>
		<?php endif; ?>

		<p style="text-align:center;color:var(--roji-text-muted);font-size:12px;margin-top:18px;">
			Trouble? Email <a href="mailto:support@rojipeptides.com" style="color:var(--roji-accent);">support@rojipeptides.com</a> — we'll fix it within a business day.
		</p>
	</div>
	<?php
}

/* -----------------------------------------------------------------------------
 * Dunning banner on every /my-account/* page
 * -------------------------------------------------------------------------- */

add_action(
	'woocommerce_before_account_navigation',
	function () {
		if ( ! is_user_logged_in() ) {
			return;
		}
		$user_id = get_current_user_id();
		$alerts  = roji_dunning_alerts_for_user( $user_id );
		if ( empty( $alerts ) ) {
			return;
		}
		$endpoint = wc_get_account_endpoint_url( ROJI_DUNNING_ENDPOINT );
		?>
		<div class="roji-dunning-banner" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.4);border-radius:var(--roji-radius);padding:16px 20px;margin:0 0 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
			<div style="flex:1;min-width:240px;">
				<div style="font-weight:600;color:#fca5a5;margin-bottom:4px;">
					<?php
					$count = count( $alerts );
					if ( $count === 1 ) {
						echo esc_html__( 'Action needed: a payment failed on your subscription', 'roji-child' );
					} else {
						printf( esc_html__( 'Action needed: %d subscription payments failed', 'roji-child' ), $count );
					}
					?>
				</div>
				<div style="font-size:13px;color:var(--roji-text-secondary);line-height:1.5;">
					<?php esc_html_e( "We'll keep retrying, but you can fix this in 30 seconds and avoid any interruption to your protocol.", 'roji-child' ); ?>
				</div>
			</div>
			<a href="<?php echo esc_url( $endpoint ); ?>" style="background:var(--roji-accent);color:#fff;padding:10px 18px;border-radius:var(--roji-radius);font-weight:600;text-decoration:none;font-size:14px;white-space:nowrap;">Update payment method →</a>
		</div>
		<?php
	}
);

/* -----------------------------------------------------------------------------
 * Subscription list enhancement — status pills
 * -------------------------------------------------------------------------- */

add_action(
	'woocommerce_my_subscriptions_actions',
	function ( $actions, $subscription ) {
		$sub_id  = is_object( $subscription ) && method_exists( $subscription, 'get_id' ) ? $subscription->get_id() : 0;
		if ( ! $sub_id ) {
			return $actions;
		}
		$dunning = (int) get_post_meta( $sub_id, '_roji_dunning_attempt', true );
		if ( $dunning > 0 ) {
			$actions['roji_update_pm'] = array(
				'url'  => wc_get_account_endpoint_url( ROJI_DUNNING_ENDPOINT ),
				'name' => __( 'Fix payment', 'roji-child' ),
			);
		}
		return $actions;
	},
	10,
	2
);

/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

/**
 * Quickly check if a user owns any subscriptions (any status).
 */
function roji_dunning_user_has_subs( $user_id ) {
	$provider = function_exists( 'roji_subs_provider' ) ? roji_subs_provider() : 'none';
	if ( $provider === 'woocommerce_subscriptions' && function_exists( 'wcs_user_has_subscription' ) ) {
		return (bool) wcs_user_has_subscription( $user_id );
	}
	if ( $provider === 'wps_sfw' ) {
		$q = new WP_Query(
			array(
				'post_type'      => array( 'wps_subscriptions', 'shop_subscription' ),
				'meta_key'       => '_customer_user',
				'meta_value'     => (int) $user_id,
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		return $q->have_posts();
	}
	return false;
}

/**
 * Return [{id, title, status, next_payment_iso, next_payment_human}] for the user.
 */
function roji_dunning_get_user_subscriptions( $user_id ) {
	$provider = function_exists( 'roji_subs_provider' ) ? roji_subs_provider() : 'none';
	$out = array();

	if ( $provider === 'woocommerce_subscriptions' && function_exists( 'wcs_get_users_subscriptions' ) ) {
		$subs = wcs_get_users_subscriptions( $user_id );
		foreach ( $subs as $sub ) {
			$next = method_exists( $sub, 'get_date' ) ? $sub->get_date( 'next_payment' ) : '';
			$out[] = array(
				'id'                 => $sub->get_id(),
				'title'              => sprintf( '%s subscription', wc_clean( implode( ', ', wp_list_pluck( $sub->get_items(), 'name' ) ) ) ),
				'status'             => $sub->get_status(),
				'next_payment_iso'   => $next,
				'next_payment_human' => $next ? human_time_diff( current_time( 'timestamp' ), strtotime( $next ) ) . ' from now' : '',
			);
		}
		return $out;
	}

	if ( $provider === 'wps_sfw' ) {
		$posts = get_posts(
			array(
				'post_type'      => array( 'wps_subscriptions', 'shop_subscription' ),
				'meta_key'       => '_customer_user',
				'meta_value'     => (int) $user_id,
				'posts_per_page' => 50,
			)
		);
		foreach ( $posts as $p ) {
			$status = (string) get_post_meta( $p->ID, 'wps_subscription_status', true );
			$out[]  = array(
				'id'                 => $p->ID,
				'title'              => $p->post_title ?: 'Roji subscription',
				'status'             => $status ?: 'active',
				'next_payment_iso'   => '',
				'next_payment_human' => '',
			);
		}
	}
	return $out;
}

/**
 * Return only subscriptions that are currently mid-dunning or on-hold.
 */
function roji_dunning_alerts_for_user( $user_id ) {
	$alerts = array();
	foreach ( roji_dunning_get_user_subscriptions( $user_id ) as $s ) {
		$dunning = (int) get_post_meta( $s['id'], '_roji_dunning_attempt', true );
		$is_held = in_array( $s['status'], array( 'on-hold' ), true );
		if ( $dunning > 0 || $is_held ) {
			$alerts[] = $s;
		}
	}
	return $alerts;
}

/* -----------------------------------------------------------------------------
 * Flush rewrites once on theme activation so the new endpoint registers
 * without manual `wp rewrite flush`.
 * -------------------------------------------------------------------------- */

add_action(
	'after_switch_theme',
	function () {
		// register here too so flush_rewrite_rules picks it up.
		add_rewrite_endpoint( ROJI_DUNNING_ENDPOINT, EP_ROOT | EP_PAGES );
		flush_rewrite_rules();
	}
);
