<?php
/**
 * Roji-branded no-products-found template (used on shop archive when
 * a category/filter/search returns zero matches).
 *
 * @package roji-child
 */

defined( 'ABSPATH' ) || exit;
?>
<style>
	.roji-no-products { padding: 56px 32px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius-lg); text-align: center; max-width: 640px; margin: 24px auto; }
	.roji-no-products .pill { display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--roji-border); border-radius: 999px; font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); margin-bottom: 16px; }
	.roji-no-products h3 { margin: 0 0 8px; font-size: 1.4rem; }
	.roji-no-products p { margin: 0 0 22px; color: var(--roji-text-secondary); font-size: 14px; line-height: 1.6; }
	.roji-no-products a { display: inline-block; padding: 10px 20px; background: var(--roji-accent); color: #fff !important; border-radius: var(--roji-radius); text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.15s ease; }
	.roji-no-products a:hover { background: var(--roji-accent-hover); }
</style>
<div class="roji-no-products">
	<span class="pill">No matches</span>
	<h3>Nothing here matches that filter.</h3>
	<p>Try adjusting your filter, or head back to the full catalog.</p>
	<a href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">Browse all stacks →</a>
</div>
<?php
