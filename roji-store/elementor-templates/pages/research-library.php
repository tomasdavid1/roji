<?php
roji_el_set_page_key( 'research-library' );

/**
 * Compound -> peer-reviewed references. Mirrors roji-protocol/src/lib/constants.ts
 * (kept in sync manually — both small enough to not warrant a build step).
 */
$compounds = array(
	array(
		'name'       => 'BPC-157',
		'short'      => 'Body Protection Compound 157',
		'category'   => 'Healing & recovery',
		'summary'    => 'Synthetic pentadecapeptide derived from a sequence in human gastric juice. The most extensively studied research peptide for in-vitro tendon, ligament, and gut tissue work.',
		'shop_slug'  => 'bpc-157-10mg',
		'shop_label' => 'Buy BPC-157 10mg',
		'stack_slug' => 'wolverine-stack',
		'stack_label' => 'or as part of the BPC-157 + TB-500 Stack',
		'references' => array(
			array(
				'title'  => 'Stable gastric pentadecapeptide BPC 157 in clinical trials as a therapy for inflammatory bowel disease',
				'source' => 'Sikiric P. et al., Curr Pharm Des',
				'year'   => 2012,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/22950504/',
			),
			array(
				'title'  => 'Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts',
				'source' => 'Chang CH. et al., Molecules',
				'year'   => 2014,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/24686573/',
			),
		),
	),
	array(
		'name'       => 'TB-500',
		'short'      => 'Thymosin Beta-4 fragment',
		'category'   => 'Healing & recovery',
		'summary'    => 'Synthetic version of a naturally occurring peptide. Research literature focuses on tissue regeneration, actin sequestration, and angiogenesis.',
		'shop_slug'  => 'tb-500-10mg',
		'shop_label' => 'Buy TB-500 10mg',
		'stack_slug' => 'wolverine-stack',
		'stack_label' => 'or as part of the BPC-157 + TB-500 Stack',
		'references' => array(
			array(
				'title'  => 'Thymosin beta-4: a multi-functional regenerative peptide. Basic properties and clinical applications',
				'source' => 'Goldstein AL. et al., Expert Opin Biol Ther',
				'year'   => 2012,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/22394215/',
			),
		),
	),
	array(
		'name'       => 'CJC-1295 (DAC)',
		'short'      => 'GHRH analog with Drug Affinity Complex',
		'category'   => 'GH axis',
		'summary'    => 'Long-acting growth hormone-releasing hormone (GHRH) analog. The DAC modification extends half-life to ~8 days, producing sustained pulsatile GH release in published research.',
		'shop_slug'  => 'cjc-1295-dac-5mg',
		'shop_label' => 'Buy CJC-1295 (DAC) 5mg',
		'stack_slug' => 'recomp-stack',
		'stack_label' => 'or as part of the CJC-1295 + Ipamorelin + MK-677 Stack',
		'references' => array(
			array(
				'title'  => 'A phase I, open-label, ascending-dose study of CJC-1295, a long-acting GHRH analog',
				'source' => 'Teichman SL. et al., J Clin Endocrinol Metab',
				'year'   => 2006,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/16352683/',
			),
		),
	),
	array(
		'name'       => 'Ipamorelin',
		'short'      => 'Selective GH secretagogue',
		'category'   => 'GH axis',
		'summary'    => 'First selective ghrelin-receptor agonist studied. Research literature emphasizes its specificity for GH release without affecting cortisol, prolactin, or ACTH at typical study doses.',
		'shop_slug'  => 'ipamorelin-5mg',
		'shop_label' => 'Buy Ipamorelin 5mg',
		'stack_slug' => 'recomp-stack',
		'stack_label' => 'or as part of the CJC-1295 + Ipamorelin + MK-677 Stack',
		'references' => array(
			array(
				'title'  => 'Ipamorelin, the first selective growth hormone secretagogue',
				'source' => 'Raun K. et al., Eur J Endocrinol',
				'year'   => 1998,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/9849822/',
			),
		),
	),
	array(
		'name'       => 'MK-677 (Ibutamoren)',
		'short'      => 'Oral ghrelin mimetic',
		'category'   => 'GH axis',
		'summary'    => 'Non-peptide ghrelin receptor agonist active orally. Two-year clinical research has examined sustained GH and IGF-1 elevation in older adult populations.',
		'shop_slug'  => 'mk-677-30caps',
		'shop_label' => 'Buy MK-677 30-day oral',
		'stack_slug' => 'recomp-stack',
		'stack_label' => 'or as part of the CJC-1295 + Ipamorelin + MK-677 Stack',
		'references' => array(
			array(
				'title'  => 'Two-year treatment with the oral growth hormone secretagogue MK-677 in older adults',
				'source' => 'Nass R. et al., Ann Intern Med',
				'year'   => 2008,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/19075081/',
			),
		),
	),
);

$content = array(
	// Hero
	roji_el_container( array(
		'padding' => array( 'top' => '100', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'content_width' => 'boxed',
	), array(
		roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Research Library</div>' ),
		roji_el_heading( 'The papers behind the products.', array(
			'header_size' => 'h1',
			'typography_font_size' => array( 'unit' => 'px', 'size' => 56, 'sizes' => array() ),
			'typography_line_height' => array( 'unit' => 'em', 'size' => 1.05, 'sizes' => array() ),
		) ),
		roji_el_text( '<p style="font-size:18px;color:#a8a8b8;max-width:700px;">Every compound on our shelf is here because of published, peer-reviewed research. Below: the foundational papers we point to for each. Inclusion is informational — none of this constitutes medical advice or therapeutic claims.</p>' ),
	) ),
);

// Per-compound card
foreach ( $compounds as $c ) {
	$ref_list_html = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;">';
	foreach ( $c['references'] as $r ) {
		$ref_list_html .= sprintf(
			'<li style="padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;">
				<a href="%s" target="_blank" rel="noopener" style="color:#f0f0f5;font-weight:600;font-size:15px;text-decoration:none;">%s ↗</a>
				<div style="margin-top:4px;color:#8a8a9a;font-size:13px;font-family:JetBrains Mono,monospace;">%s · %d</div>
			</li>',
			esc_url( $r['url'] ),
			esc_html( $r['title'] ),
			esc_html( $r['source'] ),
			(int) $r['year']
		);
	}
	$ref_list_html .= '</ul>';

	$content[] = roji_el_container( array(
		'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'content_width' => 'boxed',
	), array(
		roji_el_card( array(
			roji_el_inner( array(
				'flex_direction' => 'row',
				'flex_wrap' => 'wrap',
				'flex_justify_content' => 'space-between',
				'flex_gap' => array( 'column' => '20', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
				'padding' => array( 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => true ),
			), array(
				roji_el_inner( array( 'padding' => array( 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => true ), 'flex_gap' => array( 'column' => '4', 'row' => '4', 'unit' => 'px', 'isLinked' => true ) ), array(
					roji_el_heading( $c['name'], array( 'header_size' => 'h2', 'typography_font_size' => array( 'unit' => 'px', 'size' => 28, 'sizes' => array() ) ) ),
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:13px;color:#8a8a9a;">' . esc_html( $c['short'] ) . '</div>' ),
				) ),
				roji_el_html( '<span style="display:inline-block;padding:6px 12px;background:rgba(79,109,245,0.1);color:#4f6df5;border-radius:999px;font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">' . esc_html( $c['category'] ) . '</span>' ),
			) ),
			roji_el_text( '<p style="font-size:15px;color:#a8a8b8;line-height:1.7;">' . esc_html( $c['summary'] ) . '</p>' ),
			roji_el_html( '<div style="margin-top:8px;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;">References</div>' ),
			roji_el_html( $ref_list_html ),
			/*
			 * Inline shop CTA — quiet, link-style. The intent is "we just
			 * spent 6 paragraphs justifying this compound, here's how to
			 * actually buy it" without resorting to a screaming button.
			 * Renders as: accent link "Buy X →"  then a softer
			 * "or as part of the Y Stack" subordinate link beneath.
			 */
			isset( $c['shop_slug'] ) ? roji_el_html( sprintf(
				'<div class="roji-rl-cta" style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:6px;">
					<a href="%s" style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:600;color:#4f6df5;text-decoration:none;letter-spacing:0.02em;">%s &rarr;</a>
					<a href="%s" style="font-size:12px;color:#8a8a9a;text-decoration:none;">%s &rarr;</a>
				</div>',
				esc_url( '/product/' . $c['shop_slug'] . '/' ),
				esc_html( $c['shop_label'] ),
				esc_url( '/product/' . $c['stack_slug'] . '/' ),
				esc_html( $c['stack_label'] )
			) ) : roji_el_html( '' ),
		), array( 'padding' => array( 'top' => '32', 'right' => '32', 'bottom' => '32', 'left' => '32', 'unit' => 'px', 'isLinked' => true ) ) ),
	) );
}

/**
 * Compounds-studied-together section.
 *
 * Strictly compliance-safe framing: we report what's been published
 * about these compounds being investigated in parallel, citing the
 * studies. We do NOT recommend stacking, dosing, or human use.
 *
 * Pattern follows examine.com / vendor research pages — research
 * summary + PubMed links + a quiet "the compounds in this body of
 * literature are sold together as <Stack>" link. The customer
 * connects the dots; we never tell them to inject anything.
 *
 * If you add a new stack, add an entry here AND on the stack PDP.
 */
$combinations = array(
	array(
		'title'      => 'BPC-157 + TB-500 — Combination tissue-repair literature',
		'eyebrow'    => 'BPC-157 + TB-500 Stack compounds',
		'summary'    => 'Multiple published studies have investigated BPC-157 and TB-500 in parallel tissue-repair models, noting complementary mechanisms — BPC-157 research has focused on angiogenesis and growth-factor receptor expression, while TB-500 literature emphasizes actin sequestration, cell migration, and angiogenesis. Inclusion here is purely informational; the studies below describe in-vitro and animal-model research.',
		'references' => array(
			array(
				'title'  => 'Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts',
				'source' => 'Chang CH. et al., Molecules',
				'year'   => 2014,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/24686573/',
			),
			array(
				'title'  => 'Thymosin beta-4: a multi-functional regenerative peptide. Basic properties and clinical applications',
				'source' => 'Goldstein AL. et al., Expert Opin Biol Ther',
				'year'   => 2012,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/22394215/',
			),
		),
		'stack_slug'  => 'wolverine-stack',
		'stack_label' => 'View the BPC-157 + TB-500 Stack',
	),
	array(
		'title'      => 'CJC-1295 (DAC) + Ipamorelin + MK-677 — GH-axis combination literature',
		'eyebrow'    => 'CJC-1295 + Ipamorelin + MK-677 Stack compounds',
		'summary'    => 'Published pharmacokinetic research has characterized each of these GH-axis compounds independently — CJC-1295 (DAC) as a long-acting GHRH analog producing sustained pulsatile GH release, Ipamorelin as a selective ghrelin-receptor agonist with a clean specificity profile in early studies, and MK-677 as an orally active non-peptide ghrelin mimetic with multi-year clinical research on GH and IGF-1 elevation. Their combined investigation in the literature reflects overlap in mechanism rather than any combined-protocol recommendation by Roji.',
		'references' => array(
			array(
				'title'  => 'A phase I, open-label, ascending-dose study of CJC-1295, a long-acting GHRH analog',
				'source' => 'Teichman SL. et al., J Clin Endocrinol Metab',
				'year'   => 2006,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/16352683/',
			),
			array(
				'title'  => 'Ipamorelin, the first selective growth hormone secretagogue',
				'source' => 'Raun K. et al., Eur J Endocrinol',
				'year'   => 1998,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/9849822/',
			),
			array(
				'title'  => 'Two-year treatment with the oral growth hormone secretagogue MK-677 in older adults',
				'source' => 'Nass R. et al., Ann Intern Med',
				'year'   => 2008,
				'url'    => 'https://pubmed.ncbi.nlm.nih.gov/19075081/',
			),
		),
		'stack_slug'  => 'recomp-stack',
		'stack_label' => 'View the CJC-1295 + Ipamorelin + MK-677 Stack',
	),
);

// Section header
$content[] = roji_el_container( array(
	'padding' => array( 'top' => '60', 'right' => '20', 'bottom' => '20', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
	'content_width' => 'boxed',
), array(
	roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Combination research</div>' ),
	roji_el_heading( 'Compounds studied together in the literature.', array(
		'header_size' => 'h2',
		'typography_font_size' => array( 'unit' => 'px', 'size' => 36, 'sizes' => array() ),
		'typography_line_height' => array( 'unit' => 'em', 'size' => 1.1, 'sizes' => array() ),
	) ),
	roji_el_text( '<p style="font-size:16px;color:#a8a8b8;max-width:700px;">Some research peptides appear together in the published literature because their mechanisms overlap or complement. Below: published studies for the compounds we sell as multi-vial research stacks. The references describe what the studies investigated — not how anyone should use these materials.</p>' ),
) );

foreach ( $combinations as $combo ) {
	$ref_list_html = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;">';
	foreach ( $combo['references'] as $r ) {
		$ref_list_html .= sprintf(
			'<li style="padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;">
				<a href="%s" target="_blank" rel="noopener" style="color:#f0f0f5;font-weight:600;font-size:15px;text-decoration:none;">%s ↗</a>
				<div style="margin-top:4px;color:#8a8a9a;font-size:13px;font-family:JetBrains Mono,monospace;">%s · %d</div>
			</li>',
			esc_url( $r['url'] ),
			esc_html( $r['title'] ),
			esc_html( $r['source'] ),
			(int) $r['year']
		);
	}
	$ref_list_html .= '</ul>';

	$content[] = roji_el_container( array(
		'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'content_width' => 'boxed',
	), array(
		roji_el_card( array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">' . esc_html( $combo['eyebrow'] ) . '</div>' ),
			roji_el_heading( $combo['title'], array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ), 'typography_line_height' => array( 'unit' => 'em', 'size' => 1.25, 'sizes' => array() ) ) ),
			roji_el_text( '<p style="font-size:15px;color:#a8a8b8;line-height:1.7;">' . esc_html( $combo['summary'] ) . '</p>' ),
			roji_el_html( '<div style="margin-top:8px;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;">References</div>' ),
			roji_el_html( $ref_list_html ),
			// Single quiet stack CTA — same visual language as per-compound cards.
			roji_el_html( sprintf(
				'<div class="roji-rl-cta" style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:6px;">
					<a href="%s" style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:600;color:#4f6df5;text-decoration:none;letter-spacing:0.02em;">%s &rarr;</a>
					<span style="font-size:12px;color:#55556a;">These compounds are available together as a research stack.</span>
				</div>',
				esc_url( '/product/' . $combo['stack_slug'] . '/' ),
				esc_html( $combo['stack_label'] )
			) ),
		), array( 'padding' => array( 'top' => '32', 'right' => '32', 'bottom' => '32', 'left' => '32', 'unit' => 'px', 'isLinked' => true ) ) ),
	) );
}

// Footer note + CTA
$content[] = roji_el_container( array(
	'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '100', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
	'content_width' => 'boxed',
), array(
	roji_el_card( array(
		roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Reminder</div>' ),
		roji_el_heading( 'Research references, not therapeutic claims.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ) ) ),
		roji_el_text( '<p>The papers above describe published in-vitro and in-vivo research. Their inclusion on this page is informational only and does not represent a claim by Roji Peptides that any product is intended to diagnose, treat, cure, mitigate, or prevent any disease. All products are sold for in-vitro laboratory research and identification purposes only. <a href="/disclaimer/">Read the full disclaimer.</a></p>' ),
		roji_el_inner( array(
			'flex_direction' => 'row',
			'flex_wrap' => 'wrap',
			'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
			'padding' => array( 'top' => '12', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
		), array(
			roji_el_button( 'Explore the research tools', 'https://tools.rojipeptides.com' ),
			roji_el_button_secondary( 'View COA library', '/coa/' ),
		) ),
	), array( 'padding' => array( 'top' => '32', 'right' => '32', 'bottom' => '32', 'left' => '32', 'unit' => 'px', 'isLinked' => true ) ) ),
) );

return array(
	'title'   => 'Research Library',
	'content' => $content,
);
