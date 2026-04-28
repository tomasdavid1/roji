<?php
/**
 * Roji Child — 404 page.
 *
 * Branded "page not found" with multiple recovery paths so users
 * never hit a dead end:
 *   - Search form (full-width, autofocused)
 *   - "Most-visited" links from the main IA (Research Tools, Shop,
 *     Research Library, COA Library)
 *   - Three featured products (the bundles) so commerce-intent
 *     visitors who landed on a stale URL still convert.
 *   - Support email tucked at the bottom for stuck users.
 *
 * @package roji-child
 */

defined( 'ABSPATH' ) || exit;

get_header();

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
$tools_url = defined( 'ROJI_TOOLS_URL' ) ? ROJI_TOOLS_URL : home_url( '/' );
?>
<style>
	.roji-404 { max-width: 960px; margin: 0 auto; padding: 56px 24px 80px; text-align: center; }
	.roji-404 .glyph { display: inline-block; padding: 10px 18px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: 999px; font-family: var(--roji-font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--roji-accent); margin-bottom: 24px; }
	.roji-404 h1 { font-size: 3.2rem; margin: 0 0 16px; letter-spacing: -0.03em; line-height: 1.05; }
	.roji-404 .lede { font-size: 1.05rem; color: var(--roji-text-secondary); max-width: 540px; margin: 0 auto 36px; line-height: 1.6; }

	.roji-404-search { max-width: 560px; margin: 0 auto 44px; }
	.roji-404-search form { display: flex; gap: 8px; }
	.roji-404-search input[type="search"] { flex: 1; padding: 14px 18px; font-size: 15px; }
	.roji-404-search button { background: var(--roji-accent); color: #fff !important; border: none; padding: 0 26px; border-radius: var(--roji-radius); font-weight: 600; cursor: pointer; transition: background 0.15s ease; font-size: 14px; }
	.roji-404-search button:hover { background: var(--roji-accent-hover); }

	.roji-404-quick { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 56px; }
	.roji-404-quick a { display: inline-block; padding: 10px 18px; background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); color: var(--roji-text-primary) !important; text-decoration: none; font-size: 14px; transition: border-color 0.15s ease; }
	.roji-404-quick a:hover { border-color: var(--roji-accent); }

	.roji-404-bundles { text-align: left; margin-top: 56px; }
	.roji-404-bundles h2 { font-size: 0.9rem; font-family: var(--roji-font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--roji-text-secondary); margin: 0 0 18px; text-align: center; }
	.roji-404-bundles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
	@media (max-width: 700px) { .roji-404-bundles-grid { grid-template-columns: 1fr; } }
	.roji-404-bundle { background: var(--roji-card); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); padding: 16px; transition: border-color 0.15s ease; }
	.roji-404-bundle:hover { border-color: var(--roji-border-hover); }
	.roji-404-bundle .ph { aspect-ratio: 1 / 1; background: rgba(255,255,255,0.02); border-radius: var(--roji-radius); margin-bottom: 12px; overflow: hidden; }
	.roji-404-bundle .ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.roji-404-bundle .name { font-size: 14px; font-weight: 600; color: var(--roji-text-primary); margin-bottom: 4px; }
	.roji-404-bundle .price { font-family: var(--roji-font-mono); font-size: 13px; color: var(--roji-text-secondary); margin-bottom: 10px; }
	.roji-404-bundle a.btn { display: block; text-align: center; padding: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--roji-border); border-radius: var(--roji-radius); color: var(--roji-text-primary) !important; font-size: 13px; text-decoration: none; transition: all 0.15s ease; }
	.roji-404-bundle a.btn:hover { background: var(--roji-accent); border-color: var(--roji-accent); color: #fff !important; }

	.roji-404-support { margin-top: 56px; font-size: 13px; color: var(--roji-text-muted); }
	.roji-404-support a { color: var(--roji-accent); }
</style>

<div class="roji-404">
	<span class="glyph">404 · Not found</span>
	<h1>This page slipped out of stock.</h1>
	<p class="lede">The link you followed has either moved or was never minted in the first place. Try a search, or jump straight to one of the most-used surfaces.</p>

	<div class="roji-404-search">
		<form role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
			<input type="search" name="s" placeholder="Search for a compound, COA, or guide…" autofocus />
			<button type="submit">Search</button>
		</form>
	</div>

	<div class="roji-404-quick">
		<a href="<?php echo esc_url( $tools_url ); ?>">Research Tools →</a>
		<a href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">Browse stacks →</a>
		<a href="<?php echo esc_url( home_url( '/research-library/' ) ); ?>">Research library →</a>
		<a href="<?php echo esc_url( home_url( '/coa/' ) ); ?>">COA library →</a>
		<a href="<?php echo esc_url( home_url( '/faq/' ) ); ?>">FAQ →</a>
	</div>

	<?php if ( ! empty( $bundles ) ) : ?>
		<div class="roji-404-bundles">
			<h2>Or start with a stack</h2>
			<div class="roji-404-bundles-grid">
				<?php foreach ( $bundles as $p ) : ?>
					<div class="roji-404-bundle">
						<div class="ph">
							<?php echo $p->get_image( 'medium' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>
						<div class="name"><?php echo esc_html( $p->get_name() ); ?></div>
						<div class="price"><?php echo wp_kses_post( $p->get_price_html() ); ?></div>
						<a class="btn" href="<?php echo esc_url( $p->get_permalink() ); ?>">View →</a>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	<?php endif; ?>

	<p class="roji-404-support">
		Still stuck? Email <a href="mailto:support@rojipeptides.com">support@rojipeptides.com</a> — we'll get you sorted within a business day.
	</p>
</div>

<?php
get_footer();
