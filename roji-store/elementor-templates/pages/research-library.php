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
