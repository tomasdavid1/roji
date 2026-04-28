<?php
/**
 * Roji-branded empty-cart template override.
 *
 * Replaces WC's "Your cart is currently empty. Return to shop." with
 * a richer empty state that:
 *   - Confirms the cart is empty
 *   - Offers two clear paths: "Build my protocol" (Protocol Engine,
 *     for goal-driven shoppers) or "Browse stacks" (for direct shoppers)
 *   - Surfaces the three bundle products inline so a wandering visitor
 *     never has to navigate elsewhere to add something.
 *
 * @package roji-child
 */

defined( 'ABSPATH' ) || exit;

/**
 * Standard WC empty-cart hook (lets plugins inject notices, etc.)
 *
 * Note: WC also queues a "Your cart is currently empty." notice
 * elsewhere on cart-page render. We blank that out via the
 * wc_empty_cart_message filter (registered in inc/woocommerce.php)
 * so our card stands alone on the page.
 */
do_action( 'woocommerce_cart_is_empty' );

$bundles = array();
foreach ( array( 'ROJI_WOLVERINE_PRODUCT_ID', 'ROJI_RECOMP_PRODUCT_ID', 'ROJI_FULL_PRODUCT_ID' ) as $const ) {
	if ( ! defined( $const ) ) {
		continue;
	}
	$p = wc_get_product( (int) constant( $const ) );
	if ( $p && $p->is_purchasable() ) {
		$bundles[] = $p;
	}
}
$protocol_url = defined( 'ROJI_PROTOCOL_URL' ) ? ROJI_PROTOCOL_URL : home_url( '/' );
?>

<style>
	.roji-empty-cart { max-width: 880px; margin: 32px auto; padding: 56px 32px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); text-align: center; position: relative; overflow: hidden; }
	.roji-empty-cart::before { content: ""; position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 320px; height: 320px; background: radial-gradient(circle, rgba(79,109,245,0.1) 0%, transparent 70%); pointer-events: none; }
	.roji-empty-cart .pill { position: relative; display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--roji-border); border-radius: 999px; font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); margin-bottom: 18px; }
	.roji-empty-cart h2 { position: relative; margin: 0 0 10px; font-size: 1.7rem; }
	.roji-empty-cart p { position: relative; color: var(--roji-text-secondary); margin: 0 0 28px; font-size: 14px; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto; }
	.roji-empty-cart .ctas { position: relative; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 32px; }
	.roji-empty-cart .ctas a { display: inline-block; padding: 12px 22px; border-radius: var(--roji-radius); font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.15s ease; }
	.roji-empty-cart .ctas a.primary { background: var(--roji-accent); color: #fff !important; }
	.roji-empty-cart .ctas a.primary:hover { background: var(--roji-accent-hover); }
	.roji-empty-cart .ctas a.ghost { background: rgba(255,255,255,0.04); color: var(--roji-text-primary) !important; border: 1px solid var(--roji-border); }
	.roji-empty-cart .ctas a.ghost:hover { border-color: var(--roji-accent); }

	.roji-empty-bundles { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 640px; margin: 0 auto; text-align: left; }
	@media (max-width: 600px) { .roji-empty-bundles { grid-template-columns: 1fr; } }
	.roji-empty-bundle { background: rgba(255,255,255,0.02); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 14px; }
	.roji-empty-bundle .ph { aspect-ratio: 1 / 1; background: rgba(255,255,255,0.02); border-radius: var(--roji-radius); margin-bottom: 10px; overflow: hidden; }
	.roji-empty-bundle .ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.roji-empty-bundle .name { font-size: 13px; font-weight: 600; color: var(--roji-text-primary); margin-bottom: 2px; }
	.roji-empty-bundle .price { font-family: var(--roji-font-mono); font-size: 12px; color: var(--roji-text-secondary); margin-bottom: 8px; }
	.roji-empty-bundle a { display: block; text-align: center; padding: 7px; background: var(--roji-accent); color: #fff !important; border-radius: var(--roji-radius); font-size: 12px; text-decoration: none; transition: background 0.15s ease; font-weight: 600; }
	.roji-empty-bundle a:hover { background: var(--roji-accent-hover); }
</style>

<div class="roji-empty-cart">
	<span class="pill">Empty cart</span>
	<h2>Nothing in your cart yet.</h2>
	<p>Most researchers start with the Protocol Engine — answer a few quick questions and we'll calibrate a stack to your goal. Or jump straight to the shop if you already know what you want.</p>

	<div class="ctas">
		<a class="primary" href="<?php echo esc_url( $protocol_url ); ?>">Build my protocol →</a>
		<a class="ghost" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">Browse stacks</a>
	</div>

	<?php if ( ! empty( $bundles ) ) : ?>
		<div class="roji-empty-bundles">
			<?php foreach ( $bundles as $p ) : ?>
				<div class="roji-empty-bundle">
					<div class="ph"><?php echo $p->get_image( 'medium' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
					<div class="name"><?php echo esc_html( $p->get_name() ); ?></div>
					<div class="price"><?php echo wp_kses_post( $p->get_price_html() ); ?></div>
					<a href="<?php echo esc_url( $p->get_permalink() ); ?>">View →</a>
				</div>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
