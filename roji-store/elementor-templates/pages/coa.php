<?php
roji_el_set_page_key( 'coa' );

/**
 * COA library — placeholder rows that the Roji team will replace with real
 * batch records (and PDF uploads) post-launch. Built as a styled HTML table
 * so it works without a Pro table widget.
 */
$batches = array(
	array( 'compound' => 'BPC-157',         'batch' => 'BPC-2604-A', 'date' => 'Apr 2026', 'purity' => '99.4%', 'lab' => 'Janoshik Analytical', 'pdf' => '#' ),
	array( 'compound' => 'TB-500',          'batch' => 'TB-2604-A',  'date' => 'Apr 2026', 'purity' => '99.2%', 'lab' => 'Janoshik Analytical', 'pdf' => '#' ),
	array( 'compound' => 'CJC-1295 (DAC)',  'batch' => 'CJC-2603-B', 'date' => 'Mar 2026', 'purity' => '99.1%', 'lab' => 'Janoshik Analytical', 'pdf' => '#' ),
	array( 'compound' => 'Ipamorelin',      'batch' => 'IPA-2603-A', 'date' => 'Mar 2026', 'purity' => '99.5%', 'lab' => 'Janoshik Analytical', 'pdf' => '#' ),
	array( 'compound' => 'MK-677',          'batch' => 'MK-2602-A',  'date' => 'Feb 2026', 'purity' => '99.6%', 'lab' => 'Janoshik Analytical', 'pdf' => '#' ),
);

$rows_html = '';
foreach ( $batches as $b ) {
	$rows_html .= sprintf(
		'<tr>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);"><strong style="color:#f0f0f5;">%s</strong></td>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:JetBrains Mono,monospace;font-size:13px;color:#8a8a9a;">%s</td>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);color:#a8a8b8;">%s</td>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);color:#22c55e;font-family:JetBrains Mono,monospace;font-size:13px;">%s</td>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);color:#a8a8b8;">%s</td>
			<td style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;"><a href="%s" target="_blank" rel="noopener" style="color:#4f6df5;font-weight:600;font-size:14px;text-decoration:none;">View PDF →</a></td>
		</tr>',
		esc_html( $b['compound'] ),
		esc_html( $b['batch'] ),
		esc_html( $b['date'] ),
		esc_html( $b['purity'] ),
		esc_html( $b['lab'] ),
		esc_url( $b['pdf'] )
	);
}

$table_html = '<div style="overflow-x:auto;background:#16161f;border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
	<table style="width:100%;border-collapse:collapse;min-width:780px;">
		<thead>
			<tr style="background:rgba(255,255,255,0.02);">
				<th style="padding:14px 20px;text-align:left;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">Compound</th>
				<th style="padding:14px 20px;text-align:left;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">Batch</th>
				<th style="padding:14px 20px;text-align:left;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">Tested</th>
				<th style="padding:14px 20px;text-align:left;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">Purity</th>
				<th style="padding:14px 20px;text-align:left;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">Lab</th>
				<th style="padding:14px 20px;text-align:right;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">COA</th>
			</tr>
		</thead>
		<tbody>' . $rows_html . '</tbody>
	</table>
</div>';

return array(
	'title'   => 'Certificates of Analysis',
	'content' => array(

		// Hero
		roji_el_container( array(
			'padding' => array( 'top' => '100', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">COA Library</div>' ),
			roji_el_heading( 'Tested every batch.', array(
				'header_size' => 'h1',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 56, 'sizes' => array() ),
				'typography_line_height' => array( 'unit' => 'em', 'size' => 1.05, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="font-size:18px;color:#a8a8b8;max-width:700px;">Every batch we ship has an independently-issued Certificate of Analysis confirming identity (HPLC + MS) and purity. PDFs below are downloadable. Batch numbers print on the vial label so you can match them.</p>' ),
		) ),

		// Process strip (3 steps)
		roji_el_container( array(
			'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_grid( array(
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">STEP 01</div>' ),
					roji_el_heading( 'Sample pulled at intake.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Every shipment from a supplier is sealed in our intake bin. Before it touches inventory, a sample is pulled and labeled with the batch number.</p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">STEP 02</div>' ),
					roji_el_heading( 'Independent lab tests it.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Sample ships to <strong>Janoshik Analytical</strong> in the EU — the lab that everyone in the research-peptide world trusts because it isn\'t owned by any seller. HPLC + MS.</p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">STEP 03</div>' ),
					roji_el_heading( 'Pass = ship. Fail = burn.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Below 99% purity, or any identity question, the entire batch goes to disposal. We have rotated suppliers over a single failed COA.</p>' ),
				) ),
			), 3 ),
		) ),

		// Table
		roji_el_container( array(
			'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">Recent Batches</div>' ),
			roji_el_html( $table_html ),
			roji_el_html( '<div style="margin-top:16px;font-size:13px;color:#55556a;">Looking for an older batch? Email <a href="mailto:support@rojipeptides.com" style="color:#4f6df5;">support@rojipeptides.com</a> with your order number — we keep the COA on file for every batch we\'ve ever shipped.</div>' ),
		) ),

		// Notice
		roji_el_container( array(
			'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '100', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_card( array(
				roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Note</div>' ),
				roji_el_heading( 'COAs verify identity and purity, not therapeutic use.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 20, 'sizes' => array() ) ) ),
				roji_el_text( '<p>A Certificate of Analysis confirms that the compound in the vial is the compound on the label, at the stated purity. It does not constitute approval for human or animal use. All products are sold for in-vitro laboratory research and identification purposes only. <a href="/disclaimer/">Read the disclaimer.</a></p>' ),
			), array( 'padding' => array( 'top' => '32', 'right' => '32', 'bottom' => '32', 'left' => '32', 'unit' => 'px', 'isLinked' => true ) ) ),
		) ),
	),
);
