<?php
/**
 * Roji-branded order received (thank-you) template.
 *
 * Replaces WooCommerce's default minimal thank-you page with a richer
 * post-purchase experience tailored to research customers:
 *
 *   - Hero confirmation with order number + email summary
 *   - Itemized order recap (mirrors the cart caption format we use
 *     for protocol stacks)
 *   - "What happens next" timeline (payment confirmed → shipped →
 *     research kit arrives → start your protocol)
 *   - Protocol-aware cross-sell: if the order contains a stack but no
 *     consumables (bac water, swabs, syringes), surface them with a
 *     one-click add-to-next-order CTA. If it contains consumables but
 *     no stack, surface the most popular stack.
 *   - Trustpilot AFS hint: the AFS engine already schedules an
 *     invitation email; we mention it here so customers know to expect it.
 *   - Affiliate share card: if the customer has affiliate cookie set,
 *     we don't show this. Otherwise, we offer the affiliate program.
 *
 * Variables (set by WooCommerce):
 *   $order — WC_Order
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'ABSPATH' ) || exit;

if ( ! is_a( $order, 'WC_Order' ) ) {
	?>
	<p class="woocommerce-notice woocommerce-notice--info woocommerce-thankyou-order-received">
		<?php esc_html_e( 'Thank you. Your order has been received.', 'roji-child' ); ?>
	</p>
	<?php
	return;
}

$order_id      = $order->get_id();
$order_email   = $order->get_billing_email();
$first_name    = $order->get_billing_first_name();
$total_str     = $order->get_formatted_order_total();
$contains_stack    = false;
$contains_supplies = false;
$cycle_weeks       = 0;
foreach ( $order->get_items() as $item ) {
	$pid = method_exists( $item, 'get_product_id' ) ? (int) $item->get_product_id() : 0;
	if ( in_array( $pid, array(
		(int) ( defined( 'ROJI_WOLVERINE_PRODUCT_ID' ) ? ROJI_WOLVERINE_PRODUCT_ID : 0 ),
		(int) ( defined( 'ROJI_RECOMP_PRODUCT_ID' ) ? ROJI_RECOMP_PRODUCT_ID : 0 ),
		(int) ( defined( 'ROJI_FULL_PRODUCT_ID' ) ? ROJI_FULL_PRODUCT_ID : 0 ),
	), true ) ) {
		$contains_stack = true;
		// Pull cycle metadata if the line was added via the protocol-engine deep-link.
		$weeks = (int) wc_get_order_item_meta( $item->get_id(), 'roji_cycle_weeks', true );
		if ( $weeks > $cycle_weeks ) {
			$cycle_weeks = $weeks;
		}
	}
	if ( in_array( $pid, array(
		(int) ( defined( 'ROJI_BAC_WATER_PRODUCT_ID' ) ? ROJI_BAC_WATER_PRODUCT_ID : 0 ),
		(int) ( defined( 'ROJI_SYRINGES_PRODUCT_ID' ) ? ROJI_SYRINGES_PRODUCT_ID : 0 ),
		(int) ( defined( 'ROJI_SWABS_PRODUCT_ID' ) ? ROJI_SWABS_PRODUCT_ID : 0 ),
	), true ) ) {
		$contains_supplies = true;
	}
}

// Compute cross-sell items: if a stack with no supplies, push consumables.
$cross_sells = array();
if ( $contains_stack && ! $contains_supplies ) {
	foreach ( array( 'ROJI_BAC_WATER_PRODUCT_ID', 'ROJI_SYRINGES_PRODUCT_ID', 'ROJI_SWABS_PRODUCT_ID' ) as $const ) {
		if ( ! defined( $const ) ) {
			continue;
		}
		$pid = (int) constant( $const );
		$p   = wc_get_product( $pid );
		if ( $p && $p->is_purchasable() && $p->is_in_stock() ) {
			$cross_sells[] = $p;
		}
	}
} elseif ( $contains_supplies && ! $contains_stack ) {
	if ( defined( 'ROJI_RECOMP_PRODUCT_ID' ) ) {
		$p = wc_get_product( (int) ROJI_RECOMP_PRODUCT_ID );
		if ( $p && $p->is_purchasable() ) {
			$cross_sells[] = $p;
		}
	}
}

$store_url    = home_url( '/' );
$protocol_url = defined( 'ROJI_PROTOCOL_URL' ) ? ROJI_PROTOCOL_URL : home_url( '/' );
$account_url  = wc_get_page_permalink( 'myaccount' );
$has_aff_cookie = ! empty( $_COOKIE['roji_aff_ref'] );

// Estimated shipping window — flat values for now; once carrier integration
// is wired (USPS/UPS) we'll replace with real ETAs.
$ship_eta_min = 2;
$ship_eta_max = 5;
?>

<style>
	.roji-thanks { max-width: 920px; margin: 0 auto; padding: 24px 0 64px; }
	.roji-thanks-hero { text-align: center; padding: 48px 24px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); margin-bottom: 32px; position: relative; overflow: hidden; }
	.roji-thanks-hero::before { content: ""; position: absolute; top: -120px; left: 50%; width: 380px; height: 380px; transform: translateX(-50%); background: radial-gradient(circle, rgba(79,109,245,0.18) 0%, transparent 70%); pointer-events: none; }
	.roji-thanks-hero .check { position: relative; width: 64px; height: 64px; margin: 0 auto 18px; border-radius: 50%; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.4); display: flex; align-items: center; justify-content: center; }
	.roji-thanks-hero .check svg { width: 28px; height: 28px; color: #4ade80; }
	.roji-thanks-hero h1 { position: relative; margin: 0 0 8px; font-size: 2.2rem; letter-spacing: -0.02em; }
	.roji-thanks-hero p.lede { position: relative; font-size: 1.05rem; color: var(--roji-text-secondary); margin: 0 auto; max-width: 540px; line-height: 1.6; }
	.roji-thanks-hero .meta { position: relative; display: inline-flex; gap: 18px; margin-top: 22px; padding: 12px 22px; background: rgba(255,255,255,0.02); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); font-family: var(--roji-font-mono); font-size: 13px; color: var(--roji-text-secondary); flex-wrap: wrap; justify-content: center; }
	.roji-thanks-hero .meta strong { color: var(--roji-text-primary); }

	.roji-thanks-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 32px; }
	@media (max-width: 800px) { .roji-thanks-grid { grid-template-columns: 1fr; } }
	.roji-thanks-card { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); overflow: hidden; }
	.roji-thanks-card h3 { margin: 0; padding: 18px 22px; font-size: 0.9rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); border-bottom: 1px solid var(--roji-border); }

	.roji-thanks-items { padding: 6px 0; }
	.roji-thanks-item { display: flex; gap: 14px; padding: 14px 22px; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.03); }
	.roji-thanks-item:last-child { border-bottom: none; }
	.roji-thanks-item .name { flex: 1; font-size: 14px; color: var(--roji-text-primary); }
	.roji-thanks-item .name small { display: block; color: var(--roji-text-muted); font-size: 12px; margin-top: 4px; }
	.roji-thanks-item .qty { font-family: var(--roji-font-mono); font-size: 12px; color: var(--roji-text-muted); }
	.roji-thanks-item .price { font-family: var(--roji-font-mono); font-size: 14px; font-weight: 600; color: var(--roji-text-primary); }
	.roji-thanks-totals { padding: 14px 22px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--roji-border); display: flex; justify-content: space-between; font-family: var(--roji-font-mono); font-weight: 600; }

	.roji-thanks-side { display: grid; gap: 16px; align-content: start; }
	.roji-thanks-side .ship { padding: 18px 22px; }
	.roji-thanks-side .ship .label { font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--roji-text-muted); margin-bottom: 6px; }
	.roji-thanks-side .ship .value { font-size: 14px; color: var(--roji-text-primary); line-height: 1.5; }
	.roji-thanks-side .ship .eta { color: var(--roji-accent); font-weight: 600; }

	.roji-thanks-timeline { display: grid; gap: 14px; padding: 22px; }
	.roji-thanks-timeline li { display: grid; grid-template-columns: 32px 1fr; gap: 14px; align-items: flex-start; list-style: none; }
	.roji-thanks-timeline .step-num { width: 28px; height: 28px; border-radius: 50%; background: rgba(79,109,245,0.1); border: 1px solid rgba(79,109,245,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px; font-family: var(--roji-font-mono); color: var(--roji-accent); font-weight: 600; }
	.roji-thanks-timeline .step-num.done { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.4); color: #4ade80; }
	.roji-thanks-timeline .step-body { padding-top: 4px; }
	.roji-thanks-timeline .step-body strong { display: block; font-size: 14px; color: var(--roji-text-primary); margin-bottom: 2px; }
	.roji-thanks-timeline .step-body span { font-size: 12px; color: var(--roji-text-secondary); line-height: 1.5; }

	.roji-thanks-cross { background: var(--roji-card); border: 1px solid var(--roji-accent-subtle); border-radius: var(--roji-radius); padding: 24px; margin-bottom: 24px; }
	.roji-thanks-cross .pill { display: inline-block; font-family: var(--roji-font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--roji-accent); background: var(--roji-accent-subtle); padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
	.roji-thanks-cross h3 { margin: 0 0 6px; font-size: 1.1rem; color: var(--roji-text-primary); }
	.roji-thanks-cross p { margin: 0 0 16px; color: var(--roji-text-secondary); font-size: 14px; line-height: 1.5; }
	.roji-thanks-cross-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
	@media (max-width: 600px) { .roji-thanks-cross-grid { grid-template-columns: 1fr; } }
	.roji-thanks-cross-item { background: rgba(255,255,255,0.02); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 14px; display: flex; flex-direction: column; gap: 8px; }
	.roji-thanks-cross-item .title { font-size: 14px; font-weight: 600; color: var(--roji-text-primary); }
	.roji-thanks-cross-item .sub { font-size: 12px; color: var(--roji-text-secondary); }
	.roji-thanks-cross-item .price { font-family: var(--roji-font-mono); font-size: 14px; color: var(--roji-text-primary); margin-top: auto; }
	.roji-thanks-cross-item a { display: inline-block; text-align: center; padding: 8px 12px; background: var(--roji-accent); color: #fff !important; border-radius: var(--roji-radius); font-size: 13px; font-weight: 600; text-decoration: none; transition: background 0.15s ease; margin-top: 4px; }
	.roji-thanks-cross-item a:hover { background: var(--roji-accent-hover); }

	.roji-thanks-meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
	@media (max-width: 600px) { .roji-thanks-meta-row { grid-template-columns: 1fr; } }
	.roji-thanks-info { padding: 18px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); }
	.roji-thanks-info h4 { margin: 0 0 8px; font-size: 0.85rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); }
	.roji-thanks-info p { margin: 0; font-size: 13px; color: var(--roji-text-secondary); line-height: 1.6; }
	.roji-thanks-info a { color: var(--roji-accent); }

	.roji-thanks-aff { background: linear-gradient(135deg, rgba(79,109,245,0.06), rgba(79,109,245,0.02)); border: 1px solid rgba(79,109,245,0.3); border-radius: var(--roji-radius); padding: 22px; display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
	.roji-thanks-aff div strong { display: block; font-size: 14px; margin-bottom: 4px; }
	.roji-thanks-aff div span { font-size: 13px; color: var(--roji-text-secondary); }
	.roji-thanks-aff a { background: var(--roji-accent); color: #fff !important; padding: 10px 18px; border-radius: var(--roji-radius); font-weight: 600; font-size: 13px; text-decoration: none; white-space: nowrap; }
</style>

<div class="roji-thanks">
	<div class="roji-thanks-hero">
		<div class="check">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</div>
		<h1><?php echo esc_html( $first_name ? sprintf( "Thanks, %s.", $first_name ) : 'Thanks for your order.' ); ?></h1>
		<p class="lede">Your order is confirmed and we've emailed a receipt to <strong style="color:var(--roji-text-primary);"><?php echo esc_html( $order_email ); ?></strong>. We pack research kits within 24 business hours and you'll get a tracking link as soon as it ships.</p>
		<div class="meta">
			<span>Order <strong>#<?php echo esc_html( $order_id ); ?></strong></span>
			<span>Total <strong><?php echo wp_kses_post( $total_str ); ?></strong></span>
			<?php if ( $cycle_weeks > 0 ) : ?>
				<span>Protocol <strong><?php echo esc_html( $cycle_weeks ); ?> weeks</strong></span>
			<?php endif; ?>
		</div>
	</div>

	<div class="roji-thanks-grid">
		<div class="roji-thanks-card">
			<h3>Your order</h3>
			<div class="roji-thanks-items">
				<?php foreach ( $order->get_items() as $item ) :
					$qty   = $item->get_quantity();
					$total = $order->get_line_subtotal( $item, true );
					$weeks = (int) wc_get_order_item_meta( $item->get_id(), 'roji_cycle_weeks', true );
				?>
					<div class="roji-thanks-item">
						<div class="name">
							<?php echo esc_html( $item->get_name() ); ?>
							<?php if ( $weeks > 0 && $total > 0 ) :
								$weekly = (int) round( $total / $weeks );
							?>
								<small>One-time payment of <?php echo wp_kses_post( wc_price( $total ) ); ?> · ~$<?php echo esc_html( $weekly ); ?>/week for <?php echo esc_html( $weeks ); ?> weeks of protocol</small>
							<?php endif; ?>
						</div>
						<div class="qty">×<?php echo esc_html( $qty ); ?></div>
						<div class="price"><?php echo wp_kses_post( wc_price( $total ) ); ?></div>
					</div>
				<?php endforeach; ?>
			</div>
			<div class="roji-thanks-totals">
				<span>Total</span>
				<span><?php echo wp_kses_post( $total_str ); ?></span>
			</div>
		</div>

		<aside class="roji-thanks-side">
			<div class="roji-thanks-card ship">
				<div class="label">Estimated arrival</div>
				<div class="value"><span class="eta"><?php echo esc_html( $ship_eta_min ); ?>–<?php echo esc_html( $ship_eta_max ); ?> business days</span><br>after we ship.</div>
			</div>
			<div class="roji-thanks-card">
				<h3>What happens next</h3>
				<ul class="roji-thanks-timeline">
					<li>
						<div class="step-num done">✓</div>
						<div class="step-body"><strong>Payment confirmed</strong><span>You'll have a receipt in your inbox in seconds.</span></div>
					</li>
					<li>
						<div class="step-num">2</div>
						<div class="step-body"><strong>Packed within 24h</strong><span>We pack and label your kit during business hours.</span></div>
					</li>
					<li>
						<div class="step-num">3</div>
						<div class="step-body"><strong>Shipped with tracking</strong><span>USPS or UPS depending on destination. You'll get the tracking link by email.</span></div>
					</li>
					<li>
						<div class="step-num">4</div>
						<div class="step-body"><strong>Reference materials</strong><span>Each product ships with a Certificate of Analysis. Reach out anytime if anything looks off.</span></div>
					</li>
				</ul>
			</div>
		</aside>
	</div>

	<?php if ( ! empty( $cross_sells ) ) : ?>
		<div class="roji-thanks-cross">
			<span class="pill"><?php echo $contains_stack ? 'Recommended add-ons' : 'Most popular'; ?></span>
			<h3><?php echo $contains_stack
					? esc_html__( 'Common research supplies for this stack', 'roji-child' )
					: esc_html__( 'Pair these supplies with a research stack', 'roji-child' ); ?></h3>
			<p><?php echo $contains_stack
					? esc_html__( "Most researchers running a stack also need bacteriostatic water, syringes, and alcohol swabs. We didn't want to bundle them in case you already have them — but if not, knock them out now.", 'roji-child' )
					: esc_html__( 'Supplies pair best with our calibrated stacks. The Recomp stack is the most-ordered.', 'roji-child' ); ?></p>
			<div class="roji-thanks-cross-grid">
				<?php foreach ( $cross_sells as $p ) : ?>
					<div class="roji-thanks-cross-item">
						<div class="title"><?php echo esc_html( $p->get_name() ); ?></div>
						<div class="sub"><?php echo esc_html( wp_strip_all_tags( $p->get_short_description() ?: $p->get_description() ) ?: '' ); ?></div>
						<div class="price"><?php echo wp_kses_post( $p->get_price_html() ); ?></div>
						<a href="<?php echo esc_url( add_query_arg( 'add-to-cart', $p->get_id(), wc_get_cart_url() ) ); ?>">Add to a new order →</a>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	<?php endif; ?>

	<div class="roji-thanks-meta-row">
		<div class="roji-thanks-info">
			<h4>Track this order</h4>
			<p>
				Your order details are saved to your account.
				<a href="<?php echo esc_url( $account_url ); ?>">Sign in to view shipping status</a>, manage subscriptions, or download the COA for your stack.
			</p>
		</div>
		<div class="roji-thanks-info">
			<h4>Help us research better</h4>
			<p>
				A few weeks from now we'll email you a Trustpilot review request.
				It takes 30 seconds and helps the next researcher decide whether Roji is right for them.
				<?php if ( defined( 'ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS' ) ) : ?>
					(Sent <?php echo (int) ROJI_TRUSTPILOT_INVITATION_DELAY_DAYS; ?> days after your order arrives.)
				<?php endif; ?>
			</p>
		</div>
	</div>

	<?php if ( ! $has_aff_cookie ) : ?>
		<div class="roji-thanks-aff">
			<div>
				<strong>Friends researching too?</strong>
				<span>Earn <?php echo esc_html( (int) ( defined( 'ROJI_AFF_TIER_DEFAULT_PCT' ) ? ROJI_AFF_TIER_DEFAULT_PCT : 10 ) ); ?>% on every customer you refer — including renewals on subscriptions.</span>
			</div>
			<a href="<?php echo esc_url( home_url( '/become-an-affiliate/' ) ); ?>">Join the affiliate program →</a>
		</div>
	<?php endif; ?>

	<p style="text-align:center;color:var(--roji-text-muted);font-size:12px;margin-top:24px;">
		Questions? Email <a href="mailto:support@rojipeptides.com" style="color:var(--roji-accent);">support@rojipeptides.com</a> · we reply within one business day.
	</p>
</div>

<?php
/**
 * Fire tracking-only hooks for GA4 + Google Ads purchase pixels.
 * We deliberately DON'T call do_action('woocommerce_thankyou', ...)
 * because that hook also re-renders the default order details block
 * (woocommerce_order_details_after_order_table etc.) which would
 * duplicate everything we just printed.
 *
 * inc/tracking.php hooks into woocommerce_thankyou specifically; we
 * detach the order-details printer first, then fire, then reattach
 * for any other consumers.
 */
remove_action( 'woocommerce_thankyou', 'woocommerce_order_details_table', 10 );
do_action( 'woocommerce_thankyou', $order_id );
