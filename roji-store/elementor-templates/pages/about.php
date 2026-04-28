<?php
roji_el_set_page_key( 'about' );

return array(
	'title'   => 'About Roji Peptides',
	'content' => array(

		// ── HERO ────────────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '100', 'right' => '20', 'bottom' => '60', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
			'flex_gap' => array( 'column' => '20', 'row' => '20', 'unit' => 'px', 'isLinked' => true ),
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">About</div>' ),
			roji_el_heading( 'Research-grade peptides, no theatre.', array(
				'header_size' => 'h1',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 56, 'sizes' => array() ),
				'typography_line_height' => array( 'unit' => 'em', 'size' => 1.05, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="font-size:20px;line-height:1.6;color:#a8a8b8;max-width:700px;">We exist because every other research-chemical site reads like it was built to confuse you. Vague claims, generic stock photography of test tubes, no documentation. We do the opposite: published references on every product, third-party COA on every batch, and a protocol builder that shows our math.</p>' ),
		) ),

		// ── PRINCIPLES (3 cards) ────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '60', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">What we stand for</div>' ),
			roji_el_heading( 'Three commitments.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 36, 'sizes' => array() ),
			) ),
			roji_el_spacer( 24 ),
			roji_el_grid( array(
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">01</div>' ),
					roji_el_heading( 'Tested every batch.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ) ) ),
					roji_el_text( '<p>We don\'t ship a vial without a third-party Certificate of Analysis confirming identity and ≥99% purity. Every COA is downloadable from the product page. <a href="/coa/">View the library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">02</div>' ),
					roji_el_heading( 'Cited, not claimed.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Every product page links to the published research that puts the compound on the map — peer-reviewed PubMed papers, not blog summaries. We won\'t make therapeutic claims because we don\'t need to. <a href="/research-library/">See the library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">03</div>' ),
					roji_el_heading( 'Stacks, not guesswork.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Our <a href="https://protocol.rojipeptides.com">Protocol Engine</a> takes your goal and parameters and outputs an evidence-referenced research stack. The math is open. The references are clickable. No hand-waving.</p>' ),
				) ),
			), 3 ),
		) ),

		// ── COMPLIANCE BAND ─────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'background_background' => 'classic',
			'background_color' => '#0d0d14',
			'content_width' => 'boxed',
		), array(
			roji_el_inner( array(
				'flex_direction' => 'row',
				'flex_wrap' => 'wrap',
				'flex_gap' => array( 'column' => '32', 'row' => '32', 'unit' => 'px', 'isLinked' => true ),
				'padding' => array( 'top' => '32', 'right' => '32', 'bottom' => '32', 'left' => '32', 'unit' => 'px', 'isLinked' => true ),
				'border_border' => 'solid',
				'border_width' => array( 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'unit' => 'px', 'isLinked' => true ),
				'border_color' => 'rgba(255,255,255,0.06)',
				'border_radius' => array( 'top' => '12', 'right' => '12', 'bottom' => '12', 'left' => '12', 'unit' => 'px', 'isLinked' => true ),
			), array(
				roji_el_inner( array(
					'_inline_size' => 30,
					'flex_gap' => array( 'column' => '8', 'row' => '8', 'unit' => 'px', 'isLinked' => true ),
				), array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Compliance</div>' ),
					roji_el_heading( 'Research use only.', array(
						'header_size' => 'h3',
						'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ),
					) ),
				) ),
				roji_el_inner( array( '_inline_size' => 65 ), array(
					roji_el_text( '<p>Everything we sell is intended for in-vitro laboratory research and identification purposes only. Not for human consumption. Not evaluated by the FDA. Not a dietary supplement. Not a drug. We say this on every page and at checkout because it\'s the truth and it matters. By purchasing, you confirm you understand.</p>' ),
				) ),
			) ),
		) ),

		// ── HOW WE OPERATE (icon row) ───────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '60', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">How we operate</div>' ),
			roji_el_heading( 'From sourcing to your door.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ),
			) ),
			roji_el_spacer( 24 ),
			roji_el_grid( array(
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">SOURCE</div>' ),
					roji_el_heading( 'GMP-certified suppliers.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>We source from multiple GMP-certified manufacturers and rotate based on test results — not on price.</p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">TEST</div>' ),
					roji_el_heading( 'Independent third-party labs.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>HPLC + MS testing on every batch via independent labs we don\'t own. The COA is published with the batch number — not generic.</p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">STORE</div>' ),
					roji_el_heading( 'Cold chain, controlled.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Inventory held in temperature- and humidity-controlled storage. Lot tracking from receipt through shipment.</p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">SHIP</div>' ),
					roji_el_heading( 'Discreet, tracked, fast.', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>USPS Priority in plain unmarked packaging. Free over $200 or always-free on autoship. <a href="/shipping/">Shipping policy →</a></p>' ),
				) ),
			), 4 ),
		) ),

		// ── CTA ─────────────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '100', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_card( array(
				roji_el_heading( 'Ready to build a research stack?', array( 'header_size' => 'h2', 'align' => 'center', 'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ) ) ),
				roji_el_text( '<p style="text-align:center;font-size:17px;">The Protocol Engine takes 60 seconds and outputs a referenced stack tailored to your research parameters.</p>' ),
				roji_el_inner( array(
					'flex_direction' => 'row',
					'flex_wrap' => 'wrap',
					'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
					'flex_justify_content' => 'center',
					'padding' => array( 'top' => '12', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
				), array(
					roji_el_button( 'Open the Protocol Engine', 'https://protocol.rojipeptides.com', array( 'align' => 'center' ) ),
					roji_el_button_secondary( 'Browse the shop', '/shop/', array( 'align' => 'center' ) ),
				) ),
			), array( 'padding' => array( 'top' => '48', 'right' => '32', 'bottom' => '48', 'left' => '32', 'unit' => 'px', 'isLinked' => false ) ) ),
		) ),

	),
);
