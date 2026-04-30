<?php
/**
 * Roji Child — programmatic /research/* pages.
 *
 * Generates one page per compound and one per combination from the
 * dataset in inc/research-compounds.php. URLs:
 *
 *   /research/                       → index (all compounds, all combos, all carried stacks)
 *   /research/<compound-slug>/       → single-compound page
 *   /research/<combo-slug>/          → combination page (e.g. bpc-157-and-tb-500)
 *
 * No DB pages are created — these are virtual routes handled in
 * `template_redirect` and rendered through the active theme. This
 * keeps the dataset version-controlled and avoids 40 stale CPT entries
 * if a compound is ever removed.
 *
 * SEO surface:
 *   - <meta description>, <meta robots>, <link rel="canonical">
 *   - JSON-LD Article schema (DefinedTerm-flavored) + BreadcrumbList
 *   - Yoast filters honored when Yoast is active
 *   - Sitemap entries auto-injected into Yoast's sitemap (and a
 *     fallback /research-sitemap.xml when Yoast is absent)
 *
 * Compliance:
 *   - Pages render the standard research-use-only disclaimer
 *   - No dosing, no human-application info, plain-fact only
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_RESEARCH_BASE_SLUG = 'research';
const ROJI_RESEARCH_QUERY_VAR = 'roji_research_slug';
const ROJI_RESEARCH_VERSION   = 1; // bump to force rewrite-rule flush

/* -----------------------------------------------------------------------------
 * Routing — one rewrite rule, virtual pages
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		add_rewrite_tag( '%' . ROJI_RESEARCH_QUERY_VAR . '%', '([^/]+)' );
		// Index: /research/  → empty query var (rendered as the directory)
		add_rewrite_rule( '^' . ROJI_RESEARCH_BASE_SLUG . '/?$', 'index.php?' . ROJI_RESEARCH_QUERY_VAR . '=__index__', 'top' );
		// Detail: /research/<slug>/
		add_rewrite_rule( '^' . ROJI_RESEARCH_BASE_SLUG . '/([a-z0-9][a-z0-9-]*)/?$', 'index.php?' . ROJI_RESEARCH_QUERY_VAR . '=$matches[1]', 'top' );
	},
	5
);

add_filter(
	'query_vars',
	function ( $vars ) {
		$vars[] = ROJI_RESEARCH_QUERY_VAR;
		return $vars;
	}
);

/**
 * Flush rewrite rules once when the file's version bumps. We persist
 * the last-flushed version in an option so we don't flush on every
 * request (expensive).
 */
add_action(
	'init',
	function () {
		if ( (int) get_option( 'roji_research_rewrite_version' ) === ROJI_RESEARCH_VERSION ) {
			return;
		}
		flush_rewrite_rules( false );
		update_option( 'roji_research_rewrite_version', ROJI_RESEARCH_VERSION );
	},
	999
);

/* -----------------------------------------------------------------------------
 * Resolver — slug → 'compound' | 'combination' | 'index' | null (404)
 * -------------------------------------------------------------------------- */

/**
 * Determine what kind of /research/ page this slug resolves to.
 *
 * @param string $slug Raw slug from the URL.
 * @return array{type:string, slug:string, data:array}|null Null if unknown.
 */
function roji_research_resolve( $slug ) {
	$raw  = (string) $slug;
	$slug = sanitize_title( $slug );
	if ( $slug === '' || $raw === '__index__' || $slug === 'index' ) {
		return array( 'type' => 'index', 'slug' => '', 'data' => array() );
	}
	$compound = roji_research_get_compound( $slug );
	if ( $compound ) {
		return array( 'type' => 'compound', 'slug' => $slug, 'data' => $compound );
	}
	$combo = roji_research_get_combination( $slug );
	if ( $combo ) {
		return array( 'type' => 'combination', 'slug' => $slug, 'data' => $combo );
	}
	// Try to canonicalize: a user might hit /research/tb-500-and-bpc-157/
	// (wrong order). Re-sort and 301 to the canonical URL if it exists.
	if ( str_contains( $slug, '-and-' ) ) {
		$parts = explode( '-and-', $slug );
		$canon = roji_research_combo_slug( $parts );
		if ( $canon !== $slug && roji_research_get_combination( $canon ) ) {
			return array( 'type' => 'redirect', 'slug' => $canon, 'data' => array() );
		}
	}
	return null;
}

/**
 * Public URL for a /research/<slug>/ page.
 */
function roji_research_url( $slug = '' ) {
	$base = home_url( '/' . ROJI_RESEARCH_BASE_SLUG . '/' );
	return $slug === '' ? $base : $base . sanitize_title( $slug ) . '/';
}

/* -----------------------------------------------------------------------------
 * Render pipeline — intercept before WP renders a 404
 * -------------------------------------------------------------------------- */

add_action(
	'template_redirect',
	function () {
		$slug = get_query_var( ROJI_RESEARCH_QUERY_VAR );
		if ( $slug === '' || $slug === null ) {
			return;
		}
		$resolved = roji_research_resolve( (string) $slug );
		if ( ! $resolved ) {
			return; // let WP serve a 404
		}
		if ( $resolved['type'] === 'redirect' ) {
			wp_safe_redirect( roji_research_url( $resolved['slug'] ), 301 );
			exit;
		}
		// Cancel WP's "this is a 404" determination — we have content.
		global $wp_query;
		$wp_query->is_404      = false;
		$wp_query->is_page     = true;
		$wp_query->is_singular = true;
		status_header( 200 );

		// Stash the resolved payload for the renderers / SEO emitters to use.
		$GLOBALS['roji_research_current'] = $resolved;

		// Render via the active theme's page template so header / footer
		// (the Roji header with cart, mobile nav, age gate, footer disclaimer)
		// all wrap our content automatically.
		add_filter( 'the_title', 'roji_research_filter_title', 10, 2 );
		add_filter( 'document_title_parts', 'roji_research_filter_document_title' );
		add_filter( 'the_content', 'roji_research_filter_content', 5 );

		// Bypass canonical-redirect (it would 404 us back).
		remove_action( 'template_redirect', 'redirect_canonical' );

		// Render the page.
		get_header();
		echo '<main id="main-content" class="roji-research-main" role="main">';
		echo apply_filters( 'the_content', '' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '</main>';
		get_footer();
		exit;
	}
);

function roji_research_filter_title( $title, $post_id = 0 ) {
	$cur = $GLOBALS['roji_research_current'] ?? null;
	if ( ! $cur ) return $title;
	if ( in_the_loop() || $post_id === 0 || did_action( 'wp_head' ) === 0 ) {
		return roji_research_page_title( $cur );
	}
	return $title;
}

function roji_research_filter_document_title( $parts ) {
	$cur = $GLOBALS['roji_research_current'] ?? null;
	if ( ! $cur ) return $parts;
	$parts['title'] = roji_research_page_title( $cur );
	return $parts;
}

function roji_research_filter_content( $content ) {
	$cur = $GLOBALS['roji_research_current'] ?? null;
	if ( ! $cur ) return $content;
	switch ( $cur['type'] ) {
		case 'index':       return roji_research_render_index();
		case 'compound':    return roji_research_render_compound( $cur['data'] );
		case 'combination': return roji_research_render_combination( $cur['data'] );
	}
	return $content;
}

/* -----------------------------------------------------------------------------
 * Title / meta helpers
 * -------------------------------------------------------------------------- */

function roji_research_page_title( $resolved ) {
	switch ( $resolved['type'] ) {
		case 'index':
			return 'Peptide Research Library';
		case 'compound':
			return $resolved['data']['name'] . ' — Research Profile';
		case 'combination':
			return $resolved['data']['name'] . ' — Research Pairing';
	}
	return 'Research';
}

function roji_research_meta_description( $resolved ) {
	switch ( $resolved['type'] ) {
		case 'index':
			return 'Peptide research library: chemistry, half-life, mechanism, storage, and PubMed-cited literature for 24+ research-grade peptides and 16+ commonly co-studied combinations.';
		case 'compound':
			return $resolved['data']['meta_desc'];
		case 'combination':
			return $resolved['data']['meta_desc'];
	}
	return '';
}

/* -----------------------------------------------------------------------------
 * Compound page renderer
 * -------------------------------------------------------------------------- */

function roji_research_render_compound( array $c ) {
	ob_start();
	$h = fn( $v ) => esc_html( (string) $v );
	$crumbs = array(
		array( 'label' => 'Home',     'url' => home_url( '/' ) ),
		array( 'label' => 'Research', 'url' => roji_research_url() ),
		array( 'label' => $c['name'], 'url' => '' ),
	);
	echo roji_research_breadcrumbs_html( $crumbs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>

	<article class="roji-research roji-research--compound">
		<header class="roji-research__header">
			<span class="roji-research__category"><?php echo $h( $c['category'] ); ?></span>
			<h1 class="roji-research__title"><?php echo $h( $c['name'] ); ?></h1>
			<?php if ( ! empty( $c['aliases'] ) ) : ?>
				<p class="roji-research__aliases">Also known as: <?php echo $h( implode( ' · ', $c['aliases'] ) ); ?></p>
			<?php endif; ?>
		</header>

		<section class="roji-research__factsheet">
			<h2>Chemistry</h2>
			<dl class="roji-research__dl">
				<?php foreach ( array(
					'sequence'    => 'Sequence / structure',
					'mw'          => 'Molecular weight',
					'formula'     => 'Molecular formula',
					'pubchem_cid' => 'PubChem CID',
					'drugbank_id' => 'DrugBank ID',
				) as $key => $label ) : ?>
					<?php $val = $c['chemistry'][ $key ] ?? ''; if ( $val === '' ) continue; ?>
					<dt><?php echo $h( $label ); ?></dt>
					<dd>
						<?php if ( $key === 'pubchem_cid' ) : ?>
							<a href="https://pubchem.ncbi.nlm.nih.gov/compound/<?php echo $h( $val ); ?>" rel="noopener" target="_blank"><?php echo $h( $val ); ?></a>
						<?php elseif ( $key === 'drugbank_id' ) : ?>
							<a href="https://go.drugbank.com/drugs/<?php echo $h( $val ); ?>" rel="noopener" target="_blank"><?php echo $h( $val ); ?></a>
						<?php else : ?>
							<code><?php echo $h( $val ); ?></code>
						<?php endif; ?>
					</dd>
				<?php endforeach; ?>
			</dl>
		</section>

		<section class="roji-research__factsheet">
			<h2>Pharmacology</h2>
			<dl class="roji-research__dl">
				<?php foreach ( array(
					'half_life'     => 'Half-life',
					'route_studied' => 'Routes studied',
					'mechanism'     => 'Mechanism',
					'storage'       => 'Storage',
				) as $key => $label ) : ?>
					<?php $val = $c['pharmacology'][ $key ] ?? ''; if ( $val === '' ) continue; ?>
					<dt><?php echo $h( $label ); ?></dt>
					<dd><?php echo $h( $val ); ?></dd>
				<?php endforeach; ?>
			</dl>
		</section>

		<?php if ( ! empty( $c['research_focus'] ) ) : ?>
			<section class="roji-research__focus">
				<h2>What this compound has been studied for</h2>
				<ul>
					<?php foreach ( $c['research_focus'] as $line ) : ?>
						<li><?php echo $h( $line ); ?></li>
					<?php endforeach; ?>
				</ul>
				<p class="roji-research__nb">Listed for reference only. Roji Peptides makes no efficacy or safety claims for any compound.</p>
			</section>
		<?php endif; ?>

		<?php if ( ! empty( $c['citations'] ) ) : ?>
			<section class="roji-research__citations">
				<h2>Selected literature</h2>
				<ol>
					<?php foreach ( $c['citations'] as $cit ) : ?>
						<li>
							<a href="<?php echo esc_url( $cit['url'] ); ?>" rel="noopener nofollow" target="_blank"><?php echo $h( $cit['title'] ); ?></a>
							<?php if ( ! empty( $cit['year'] ) ) : ?>
								<span class="roji-research__cit-year">· <?php echo $h( $cit['year'] ); ?></span>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ol>
			</section>
		<?php endif; ?>

		<?php echo roji_research_render_buy_block( $c ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<?php echo roji_research_render_disclaimer(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<?php echo roji_research_render_related_combos( $c['slug'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</article>

	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * Combination page renderer
 * -------------------------------------------------------------------------- */

function roji_research_render_combination( array $combo ) {
	ob_start();
	$h        = fn( $v ) => esc_html( (string) $v );
	$compounds = array_values( array_filter( array_map( 'roji_research_get_compound', $combo['compounds'] ) ) );
	$crumbs   = array(
		array( 'label' => 'Home',     'url' => home_url( '/' ) ),
		array( 'label' => 'Research', 'url' => roji_research_url() ),
		array( 'label' => $combo['name'], 'url' => '' ),
	);
	echo roji_research_breadcrumbs_html( $crumbs ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>

	<article class="roji-research roji-research--combo">
		<header class="roji-research__header">
			<span class="roji-research__category"><?php echo $h( $combo['category'] ); ?></span>
			<h1 class="roji-research__title"><?php echo $h( $combo['name'] ); ?></h1>
			<p class="roji-research__lede"><?php echo $h( $combo['rationale'] ); ?></p>
		</header>

		<section class="roji-research__compounds-grid">
			<h2>Compounds in this pairing</h2>
			<div class="roji-research__cards">
				<?php foreach ( $compounds as $c ) : ?>
					<a class="roji-research__card" href="<?php echo esc_url( roji_research_url( $c['slug'] ) ); ?>">
						<span class="roji-research__card-cat"><?php echo $h( $c['category'] ); ?></span>
						<span class="roji-research__card-name"><?php echo $h( $c['name'] ); ?></span>
						<span class="roji-research__card-mw"><?php echo $h( $c['chemistry']['mw'] ); ?></span>
						<span class="roji-research__card-mech"><?php echo $h( wp_trim_words( $c['pharmacology']['mechanism'], 14, '…' ) ); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		</section>

		<section class="roji-research__factsheet">
			<h2>Side-by-side</h2>
			<div class="roji-research__sxs-wrap">
				<table class="roji-research__sxs">
					<thead>
						<tr>
							<th>Property</th>
							<?php foreach ( $compounds as $c ) : ?>
								<th><?php echo $h( $c['name'] ); ?></th>
							<?php endforeach; ?>
						</tr>
					</thead>
					<tbody>
						<?php
						$rows = array(
							'Class'           => fn( $c ) => $c['category'],
							'Sequence'        => fn( $c ) => $c['chemistry']['sequence'],
							'Molecular wt.'   => fn( $c ) => $c['chemistry']['mw'],
							'Half-life'       => fn( $c ) => $c['pharmacology']['half_life'],
							'Routes studied'  => fn( $c ) => $c['pharmacology']['route_studied'],
							'Mechanism'       => fn( $c ) => $c['pharmacology']['mechanism'],
						);
						foreach ( $rows as $label => $accessor ) : ?>
							<tr>
								<th scope="row"><?php echo $h( $label ); ?></th>
								<?php foreach ( $compounds as $c ) : ?>
									<td><?php echo $h( $accessor( $c ) ); ?></td>
								<?php endforeach; ?>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			</div>
		</section>

		<?php
		// Citation aggregation across all compounds.
		$cits = array();
		foreach ( $compounds as $c ) {
			foreach ( $c['citations'] ?? array() as $cit ) {
				$cits[ $cit['url'] ] = $cit;
			}
		}
		if ( $cits ) : ?>
			<section class="roji-research__citations">
				<h2>Selected literature</h2>
				<ol>
					<?php foreach ( $cits as $cit ) : ?>
						<li>
							<a href="<?php echo esc_url( $cit['url'] ); ?>" rel="noopener nofollow" target="_blank"><?php echo $h( $cit['title'] ); ?></a>
							<?php if ( ! empty( $cit['year'] ) ) : ?>
								<span class="roji-research__cit-year">· <?php echo $h( $cit['year'] ); ?></span>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ol>
			</section>
		<?php endif; ?>

		<?php echo roji_research_render_combo_buy_block( $combo, $compounds ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<?php echo roji_research_render_disclaimer(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</article>

	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * Index page (/research/)
 * -------------------------------------------------------------------------- */

function roji_research_render_index() {
	ob_start();
	$h         = fn( $v ) => esc_html( (string) $v );
	$compounds = roji_research_compounds();
	$combos    = roji_research_combinations();

	// Group compounds by primary category (first segment before "/").
	// e.g. "Cosmetic / Tissue Repair" → "Cosmetic" so the index doesn't
	// fragment into one-card sections for every cross-listed compound.
	$by_cat = array();
	foreach ( $compounds as $c ) {
		$primary = trim( strtok( (string) $c['category'], '/' ) );
		if ( $primary === '' ) $primary = 'Other';
		$by_cat[ $primary ][] = $c;
	}
	// Order categories by curated weight (most commercially relevant first).
	$weights = array(
		'GH-Axis'           => 10,
		'GLP-1'             => 20,
		'Tissue Repair'     => 30,
		'Metabolic'         => 40,
		'Cognitive'         => 50,
		'Cosmetic'          => 60,
		'Sleep'             => 70,
		'Longevity Research'=> 80,
		'Specialty'         => 90,
	);
	uksort( $by_cat, fn( $a, $b ) => ( $weights[ $a ] ?? 999 ) <=> ( $weights[ $b ] ?? 999 ) ?: strcmp( $a, $b ) );
	?>
	<?php echo roji_research_breadcrumbs_html( array(
		array( 'label' => 'Home',     'url' => home_url( '/' ) ),
		array( 'label' => 'Research', 'url' => '' ),
	) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

	<header class="roji-research__index-header">
		<h1>Peptide research library</h1>
		<p class="roji-research__lede">Plain-fact reference profiles for <?php echo (int) count( $compounds ); ?> research-grade peptides and <?php echo (int) count( $combos ); ?> commonly co-studied combinations. Chemistry, pharmacology, storage, and PubMed-cited literature — for laboratory reference only, not clinical advice.</p>
	</header>

	<?php foreach ( $by_cat as $cat => $items ) : ?>
		<section class="roji-research__index-section">
			<h2><?php echo $h( $cat ); ?></h2>
			<div class="roji-research__cards">
				<?php foreach ( $items as $c ) : ?>
					<a class="roji-research__card" href="<?php echo esc_url( roji_research_url( $c['slug'] ) ); ?>">
						<span class="roji-research__card-cat"><?php echo $h( $c['category'] ); ?></span>
						<span class="roji-research__card-name"><?php echo $h( $c['name'] ); ?></span>
						<span class="roji-research__card-mw"><?php echo $h( $c['chemistry']['mw'] ); ?></span>
						<span class="roji-research__card-mech"><?php echo $h( wp_trim_words( $c['pharmacology']['mechanism'], 14, '…' ) ); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		</section>
	<?php endforeach; ?>

	<section class="roji-research__index-section">
		<h2>Research combinations</h2>
		<div class="roji-research__cards roji-research__cards--combos">
			<?php foreach ( $combos as $combo ) : ?>
				<a class="roji-research__card roji-research__card--combo" href="<?php echo esc_url( roji_research_url( $combo['compounds'] ? roji_research_combo_slug( $combo['compounds'] ) : '' ) ); ?>">
					<span class="roji-research__card-cat"><?php echo $h( $combo['category'] ); ?></span>
					<span class="roji-research__card-name"><?php echo $h( $combo['name'] ); ?></span>
					<?php if ( $combo['carried_stack'] ) : ?>
						<span class="roji-research__card-badge">In stock as a stack</span>
					<?php endif; ?>
					<span class="roji-research__card-mech"><?php echo $h( wp_trim_words( $combo['rationale'], 18, '…' ) ); ?></span>
				</a>
			<?php endforeach; ?>
		</div>
	</section>

	<?php echo roji_research_render_disclaimer(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * Buy block — carried compound vs. uncarried (request-stocking form)
 * -------------------------------------------------------------------------- */

function roji_research_render_buy_block( array $c ) {
	$h = fn( $v ) => esc_html( (string) $v );
	if ( $c['carried'] && function_exists( 'wc_get_product_id_by_sku' ) ) {
		// Resolve the WC product page for the carried compound.
		$product_url = roji_research_product_url( $c['product_slug'] );
		if ( $product_url ) {
			ob_start(); ?>
			<aside class="roji-research__buy roji-research__buy--in-stock">
				<div class="roji-research__buy-inner">
					<div>
						<span class="roji-research__buy-eyebrow">Available now</span>
						<p class="roji-research__buy-line">
							We carry research-grade <strong><?php echo $h( $c['name'] ); ?></strong> with a third-party Janoshik Certificate of Analysis on every batch (≥99% purity).
						</p>
					</div>
					<a class="roji-research__buy-btn" href="<?php echo esc_url( $product_url ); ?>">View product →</a>
				</div>
			</aside>
			<?php
			return ob_get_clean();
		}
	}
	// Uncarried compound — show "request stocking" form + nudge to closest related product.
	$nudge_url  = roji_research_product_url( $c['product_slug'] );
	$nudge_name = roji_research_product_name( $c['product_slug'] );
	ob_start(); ?>
	<aside class="roji-research__buy roji-research__buy--request">
		<div class="roji-research__buy-inner">
			<div class="roji-research__buy-text">
				<span class="roji-research__buy-eyebrow">Not stocked yet</span>
				<p class="roji-research__buy-line">
					We don't currently carry <strong><?php echo $h( $c['name'] ); ?></strong>. Tell us you'd buy it and we'll prioritize sourcing — and email you the moment it lands.
				</p>
				<?php if ( $nudge_url && $nudge_name ) : ?>
					<p class="roji-research__buy-nudge">
						In the meantime: <a href="<?php echo esc_url( $nudge_url ); ?>"><?php echo $h( $nudge_name ); ?></a> is the closest research-related product we currently stock.
					</p>
				<?php endif; ?>
			</div>
			<form class="roji-research__request-form" data-roji-research-request data-compound="<?php echo $h( $c['slug'] ); ?>" data-compound-name="<?php echo $h( $c['name'] ); ?>">
				<label for="roji-rq-<?php echo $h( $c['slug'] ); ?>">Email me when stocked</label>
				<div class="roji-research__request-row">
					<input id="roji-rq-<?php echo $h( $c['slug'] ); ?>" type="email" name="email" required placeholder="you@research.lab" autocomplete="email" />
					<button type="submit">Notify me</button>
				</div>
				<p class="roji-research__request-status" role="status" aria-live="polite"></p>
			</form>
		</div>
	</aside>
	<?php
	return ob_get_clean();
}

function roji_research_render_combo_buy_block( array $combo, array $compounds ) {
	$h = fn( $v ) => esc_html( (string) $v );
	if ( $combo['carried_stack'] ) {
		$url = roji_research_product_url( $combo['carried_stack'] );
		if ( $url ) {
			ob_start(); ?>
			<aside class="roji-research__buy roji-research__buy--in-stock">
				<div class="roji-research__buy-inner">
					<div>
						<span class="roji-research__buy-eyebrow">In stock as a stack</span>
						<p class="roji-research__buy-line">
							Roji's <strong><?php echo $h( roji_research_product_name( $combo['carried_stack'] ) ?: $combo['name'] ); ?></strong> ships this exact pairing — research-grade, third-party Janoshik COA on every batch.
						</p>
					</div>
					<a class="roji-research__buy-btn" href="<?php echo esc_url( $url ); ?>">View the stack →</a>
				</div>
			</aside>
			<?php
			return ob_get_clean();
		}
	}
	// Uncarried combo — list per-compound buy/request links inline.
	ob_start(); ?>
	<aside class="roji-research__buy roji-research__buy--combo-mixed">
		<div class="roji-research__buy-inner">
			<div>
				<span class="roji-research__buy-eyebrow">Source the compounds</span>
				<p class="roji-research__buy-line">
					We don't sell this exact pairing as a stack yet. Source each compound individually:
				</p>
				<ul class="roji-research__buy-list">
					<?php foreach ( $compounds as $c ) : ?>
						<li>
							<strong><?php echo $h( $c['name'] ); ?></strong> —
							<?php if ( $c['carried'] ) :
								$url = roji_research_product_url( $c['product_slug'] ); ?>
								<a href="<?php echo esc_url( $url ); ?>">In stock at Roji →</a>
							<?php else : ?>
								<a href="<?php echo esc_url( roji_research_url( $c['slug'] ) ); ?>">Not stocked — request it</a>
							<?php endif; ?>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	</aside>
	<?php
	return ob_get_clean();
}

/**
 * WC product permalink by slug, with caching.
 */
function roji_research_product_url( $product_slug ) {
	if ( ! $product_slug || ! function_exists( 'get_page_by_path' ) ) return '';
	$post = get_page_by_path( $product_slug, OBJECT, 'product' );
	return $post ? get_permalink( $post ) : '';
}

function roji_research_product_name( $product_slug ) {
	if ( ! $product_slug || ! function_exists( 'get_page_by_path' ) ) return '';
	$post = get_page_by_path( $product_slug, OBJECT, 'product' );
	return $post ? $post->post_title : '';
}

/* -----------------------------------------------------------------------------
 * Related combos sidebar
 * -------------------------------------------------------------------------- */

function roji_research_render_related_combos( $compound_slug ) {
	$matches = array();
	foreach ( roji_research_combinations() as $key => $combo ) {
		if ( in_array( $compound_slug, $combo['compounds'], true ) ) {
			$matches[ $key ] = $combo;
		}
	}
	if ( ! $matches ) return '';
	$h = fn( $v ) => esc_html( (string) $v );
	ob_start(); ?>
	<section class="roji-research__related">
		<h2>Studied alongside</h2>
		<ul class="roji-research__related-list">
			<?php foreach ( $matches as $key => $combo ) : ?>
				<li>
					<a href="<?php echo esc_url( roji_research_url( $key ) ); ?>">
						<span class="roji-research__related-name"><?php echo $h( $combo['name'] ); ?></span>
						<?php if ( $combo['carried_stack'] ) : ?>
							<span class="roji-research__related-badge">In stock</span>
						<?php endif; ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	</section>
	<?php
	return ob_get_clean();
}

/* -----------------------------------------------------------------------------
 * Disclaimer + breadcrumbs
 * -------------------------------------------------------------------------- */

function roji_research_render_disclaimer() {
	return '<aside class="roji-research__disclaimer"><strong>Research use only.</strong> '
		. esc_html__( 'All compounds described on this page are intended exclusively for laboratory and research use. Roji Peptides does not provide dosing recommendations, usage instructions, or any guidance on human application. Information is sourced from peer-reviewed literature for reference only and is not medical advice.', 'roji-child' )
		. '</aside>';
}

function roji_research_breadcrumbs_html( array $items ) {
	$out = '<nav class="roji-research__crumbs" aria-label="Breadcrumb"><ol>';
	$last = count( $items ) - 1;
	foreach ( $items as $i => $it ) {
		$is_last = $i === $last;
		$out .= '<li>';
		if ( ! $is_last && $it['url'] !== '' ) {
			$out .= '<a href="' . esc_url( $it['url'] ) . '">' . esc_html( $it['label'] ) . '</a>';
		} else {
			$out .= '<span aria-current="page">' . esc_html( $it['label'] ) . '</span>';
		}
		$out .= '</li>';
	}
	$out .= '</ol></nav>';
	return $out;
}

/* -----------------------------------------------------------------------------
 * <head> emission — meta description, canonical, robots, JSON-LD
 *
 * Defers to Yoast when present (Yoast wins). Otherwise emits our own.
 * -------------------------------------------------------------------------- */

add_action(
	'wp_head',
	function () {
		$cur = $GLOBALS['roji_research_current'] ?? null;
		if ( ! $cur ) return;

		// JSON-LD always — even if Yoast handles meta/canonical, our
		// per-compound Article schema is independent.
		echo "\n" . roji_research_jsonld_block( $cur ) . "\n";

		// Meta tags only if Yoast isn't doing it.
		if ( defined( 'WPSEO_VERSION' ) ) return;

		$desc = roji_research_meta_description( $cur );
		$canonical = roji_research_url( $cur['type'] === 'index' ? '' : $cur['slug'] );
		echo '<meta name="description" content="' . esc_attr( $desc ) . '" />' . "\n";
		echo '<link rel="canonical" href="' . esc_url( $canonical ) . '" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( roji_research_page_title( $cur ) ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $desc ) . '" />' . "\n";
		echo '<meta property="og:url" content="' . esc_url( $canonical ) . '" />' . "\n";
		echo '<meta property="og:type" content="article" />' . "\n";
		echo '<meta name="twitter:card" content="summary" />' . "\n";
	},
	2
);

/**
 * If Yoast is active, override its description + canonical + title for our pages.
 */
add_filter( 'wpseo_metadesc',  function ( $desc ) { $cur = $GLOBALS['roji_research_current'] ?? null; return $cur ? roji_research_meta_description( $cur ) : $desc; }, 99 );
add_filter( 'wpseo_canonical', function ( $can )  { $cur = $GLOBALS['roji_research_current'] ?? null; return $cur ? roji_research_url( $cur['type'] === 'index' ? '' : $cur['slug'] ) : $can; }, 99 );
add_filter( 'wpseo_title',     function ( $t )    { $cur = $GLOBALS['roji_research_current'] ?? null; return $cur ? roji_research_page_title( $cur ) . ' | Roji Peptides' : $t; }, 99 );

/* -----------------------------------------------------------------------------
 * JSON-LD
 * -------------------------------------------------------------------------- */

function roji_research_jsonld_block( $cur ) {
	$graph = array();
	$site  = home_url( '/' );

	// Breadcrumbs always.
	$crumbs = array(
		array( 'name' => 'Home',     'url' => $site ),
		array( 'name' => 'Research', 'url' => roji_research_url() ),
	);
	if ( $cur['type'] !== 'index' ) {
		$crumbs[] = array(
			'name' => $cur['data']['name'],
			'url'  => roji_research_url( $cur['slug'] ),
		);
	}
	$graph[] = array(
		'@type' => 'BreadcrumbList',
		'itemListElement' => array_values( array_map(
			function ( $i, $it ) {
				return array(
					'@type'    => 'ListItem',
					'position' => $i + 1,
					'name'     => $it['name'],
					'item'     => $it['url'],
				);
			},
			array_keys( $crumbs ),
			$crumbs
		) ),
	);

	switch ( $cur['type'] ) {
		case 'compound':
			$c = $cur['data'];
			$graph[] = array(
				'@type'           => 'DefinedTerm',
				'@id'             => roji_research_url( $c['slug'] ) . '#term',
				'name'            => $c['name'],
				'alternateName'   => $c['aliases'] ?? array(),
				'description'     => $c['meta_desc'],
				'inDefinedTermSet'=> roji_research_url() . '#defined-term-set',
				'url'             => roji_research_url( $c['slug'] ),
			);
			$graph[] = array(
				'@type'         => 'Article',
				'mainEntityOfPage' => roji_research_url( $c['slug'] ),
				'headline'      => $c['name'] . ' — Research Profile',
				'description'   => $c['meta_desc'],
				'inLanguage'    => 'en-US',
				'isPartOf'      => array(
					'@type' => 'WebSite',
					'name'  => 'Roji Peptides',
					'url'   => $site,
				),
				'publisher'     => array(
					'@type' => 'Organization',
					'name'  => 'Roji Peptides',
					'url'   => $site,
				),
				'about'         => array( '@id' => roji_research_url( $c['slug'] ) . '#term' ),
				'citation'      => array_map(
					fn( $cit ) => array(
						'@type' => 'CreativeWork',
						'name'  => $cit['title'],
						'url'   => $cit['url'],
					),
					$c['citations'] ?? array()
				),
			);
			break;

		case 'combination':
			$combo     = $cur['data'];
			$compounds = array_filter( array_map( 'roji_research_get_compound', $combo['compounds'] ) );
			$graph[]   = array(
				'@type'         => 'Article',
				'mainEntityOfPage' => roji_research_url( $cur['slug'] ),
				'headline'      => $combo['name'] . ' — Research Pairing',
				'description'   => $combo['meta_desc'],
				'inLanguage'    => 'en-US',
				'isPartOf'      => array( '@type' => 'WebSite', 'name' => 'Roji Peptides', 'url' => $site ),
				'publisher'     => array( '@type' => 'Organization', 'name' => 'Roji Peptides', 'url' => $site ),
				'about'         => array_map(
					fn( $c ) => array(
						'@type' => 'DefinedTerm',
						'name'  => $c['name'],
						'url'   => roji_research_url( $c['slug'] ),
					),
					array_values( $compounds )
				),
			);
			break;

		case 'index':
			$graph[] = array(
				'@type'      => 'CollectionPage',
				'name'       => 'Peptide Research Library',
				'url'        => roji_research_url(),
				'description'=> roji_research_meta_description( $cur ),
				'isPartOf'   => array( '@type' => 'WebSite', 'name' => 'Roji Peptides', 'url' => $site ),
			);
			$graph[] = array(
				'@type' => 'DefinedTermSet',
				'@id'   => roji_research_url() . '#defined-term-set',
				'name'  => 'Roji Peptide Research Library',
				'url'   => roji_research_url(),
			);
			break;
	}

	$payload = array(
		'@context' => 'https://schema.org',
		'@graph'   => $graph,
	);
	return '<script type="application/ld+json">' . wp_json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>';
}

/* -----------------------------------------------------------------------------
 * Sitemap — Yoast hook + native fallback
 * -------------------------------------------------------------------------- */

// Yoast: register a custom sitemap that lists every research URL.
add_action( 'init', function () {
	if ( ! defined( 'WPSEO_VERSION' ) || ! function_exists( 'YoastSEO' ) ) return;
	if ( method_exists( YoastSEO()->helpers->options, 'get' ) ) {
		// Use the class-based registration only when available; otherwise
		// fall back to the global function below.
	}
	if ( function_exists( 'wpseo_register_xml_sitemap' ) ) {
		// Yoast >= 14: filter the index instead.
	}
} );

add_filter(
	'wpseo_sitemap_index',
	function ( $xml ) {
		$xml .= '<sitemap>'
			. '<loc>' . esc_url( home_url( '/research-sitemap.xml' ) ) . '</loc>'
			. '<lastmod>' . esc_xml( gmdate( 'c' ) ) . '</lastmod>'
			. '</sitemap>';
		return $xml;
	}
);

// Native sitemap (also used as the URL Yoast points to above).
add_action(
	'init',
	function () {
		add_rewrite_rule( '^research-sitemap\.xml$', 'index.php?roji_research_sitemap=1', 'top' );
	}
);

add_filter(
	'query_vars',
	function ( $v ) {
		$v[] = 'roji_research_sitemap';
		return $v;
	}
);

add_action(
	'template_redirect',
	function () {
		if ( get_query_var( 'roji_research_sitemap' ) !== '1' ) return;
		header( 'Content-Type: application/xml; charset=UTF-8' );
		echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
		echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
		$urls = array_merge( array( '' ), array_keys( roji_research_compounds() ), array_keys( roji_research_combinations() ) );
		foreach ( $urls as $slug ) {
			$loc = roji_research_url( $slug );
			$prio = $slug === '' ? '0.7' : '0.6';
			echo '  <url><loc>' . esc_xml( $loc ) . '</loc><changefreq>monthly</changefreq><priority>' . $prio . "</priority></url>\n";
		}
		echo '</urlset>';
		exit;
	}
);

// Add to native WP sitemap too (5.5+).
add_filter(
	'wp_sitemaps_add_provider',
	function ( $provider, $name ) {
		return $provider;
	},
	10,
	2
);

add_filter(
	'wp_sitemaps_index_entries',
	function ( $entries ) {
		$entries[] = array(
			'loc'     => home_url( '/research-sitemap.xml' ),
			'lastmod' => gmdate( 'Y-m-d\TH:i:s+00:00' ),
		);
		return $entries;
	}
);

/* -----------------------------------------------------------------------------
 * "Notify me when stocked" AJAX endpoint
 * -------------------------------------------------------------------------- */

add_action( 'wp_ajax_roji_research_stocking_request',         'roji_research_handle_stocking_request' );
add_action( 'wp_ajax_nopriv_roji_research_stocking_request',  'roji_research_handle_stocking_request' );

function roji_research_handle_stocking_request() {
	if ( ! isset( $_POST['_roji_nonce'] ) || ! wp_verify_nonce( wp_unslash( $_POST['_roji_nonce'] ), 'roji_research_request' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		wp_send_json_error( array( 'message' => 'Bad request — please refresh the page.' ), 400 );
	}
	$email    = isset( $_POST['email'] )    ? sanitize_email( wp_unslash( $_POST['email'] ) )         : '';
	$compound = isset( $_POST['compound'] ) ? sanitize_title( wp_unslash( $_POST['compound'] ) )      : '';
	if ( ! is_email( $email ) ) {
		wp_send_json_error( array( 'message' => 'Please enter a valid email.' ), 422 );
	}
	$c = roji_research_get_compound( $compound );
	if ( ! $c ) {
		wp_send_json_error( array( 'message' => 'Unknown compound.' ), 422 );
	}

	$existing = (array) get_option( 'roji_research_stocking_requests', array() );
	$key      = $compound;
	$existing[ $key ]            = $existing[ $key ] ?? array( 'count' => 0, 'emails' => array() );
	$existing[ $key ]['count']  += 1;
	$existing[ $key ]['emails']  = array_values( array_unique( array_merge( $existing[ $key ]['emails'], array( $email ) ) ) );
	$existing[ $key ]['updated'] = time();
	update_option( 'roji_research_stocking_requests', $existing, false );

	// Notify ops.
	$admin   = sanitize_email( (string) get_option( 'admin_email' ) );
	$subject = sprintf( '[Roji] Stock request: %s (%d total)', $c['name'], (int) $existing[ $key ]['count'] );
	$body    = "Compound:    {$c['name']} ({$compound})\n"
		. "From:        {$email}\n"
		. "Total demand: {$existing[ $key ]['count']}\n\n"
		. 'Page: ' . roji_research_url( $compound );
	if ( function_exists( 'roji_wp_mail_plain' ) ) {
		roji_wp_mail_plain( $admin, $subject, $body );
	} else {
		wp_mail( $admin, $subject, $body );
	}

	wp_send_json_success( array( 'message' => 'Got it — we\'ll email ' . $email . ' the moment ' . $c['name'] . ' is in stock.' ) );
}

/* -----------------------------------------------------------------------------
 * Front-end nonce + JS for the request-stocking forms
 * -------------------------------------------------------------------------- */

add_action(
	'wp_enqueue_scripts',
	function () {
		$cur = $GLOBALS['roji_research_current'] ?? null;
		if ( ! $cur || $cur['type'] !== 'compound' ) return;
		if ( ! empty( $cur['data']['carried'] ) ) return;
		wp_register_script( 'roji-research-request', '', array(), ROJI_CHILD_VERSION, true );
		wp_enqueue_script( 'roji-research-request' );
		$payload = wp_json_encode( array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'roji_research_request' ),
		) );
		wp_add_inline_script(
			'roji-research-request',
			"window.RojiResearch = {$payload};
(function(){
  document.addEventListener('submit', async function(e){
    var form = e.target.closest('[data-roji-research-request]');
    if (!form) return;
    e.preventDefault();
    var status = form.querySelector('.roji-research__request-status');
    var btn    = form.querySelector('button[type=submit]');
    var input  = form.querySelector('input[name=email]');
    if (!input || !input.value) return;
    btn.disabled = true; status.textContent = 'Sending…'; status.dataset.state = 'pending';
    try {
      var fd = new FormData();
      fd.append('action', 'roji_research_stocking_request');
      fd.append('_roji_nonce', RojiResearch.nonce);
      fd.append('email', input.value);
      fd.append('compound', form.dataset.compound);
      var r = await fetch(RojiResearch.ajaxUrl, { method:'POST', credentials:'same-origin', body: fd });
      var j = await r.json();
      if (j && j.success) {
        status.textContent = j.data.message || 'Thanks — you\\'re on the list.';
        status.dataset.state = 'ok';
        input.value = '';
      } else {
        status.textContent = (j && j.data && j.data.message) || 'Something went wrong. Try again.';
        status.dataset.state = 'err';
        btn.disabled = false;
      }
    } catch (err) {
      status.textContent = 'Network error. Try again.';
      status.dataset.state = 'err';
      btn.disabled = false;
    }
  });
})();"
		);
	}
);
