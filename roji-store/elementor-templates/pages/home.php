<?php
roji_el_set_page_key( 'home' );

return array(
	'title'   => 'Roji Peptides',
	'content' => array(

		// ── HERO ─────────────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '120', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
			'flex_gap' => array( 'column' => '24', 'row' => '24', 'unit' => 'px', 'isLinked' => true ),
			'background_overlay_background' => 'gradient',
			'background_overlay_color' => 'rgba(79,109,245,0.04)',
			'background_overlay_color_b' => 'rgba(10,10,15,0)',
			'background_overlay_gradient_angle' => array( 'unit' => 'deg', 'size' => 180, 'sizes' => array() ),
		), array(
			roji_el_html( '<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(79,109,245,0.1);border:1px solid rgba(79,109,245,0.25);border-radius:999px;font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;text-transform:uppercase;width:fit-content;"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span>Now shipping · COA on every batch</div>' ),
			roji_el_heading( 'Research-grade peptides, with the receipts.', array(
				'header_size' => 'h1',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 72, 'sizes' => array() ),
				'typography_line_height' => array( 'unit' => 'em', 'size' => 1.0, 'sizes' => array() ),
				'typography_letter_spacing' => array( 'unit' => 'px', 'size' => -2, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="font-size:22px;line-height:1.5;color:#a8a8b8;max-width:680px;">Tested every batch. Cited every product. Built around a free protocol engine that does the dosing math for you.</p>' ),
			roji_el_inner( array(
				'flex_direction' => 'row',
				'flex_wrap' => 'wrap',
				'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
				'padding' => array( 'top' => '12', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
			), array(
				roji_el_button( 'Build my research stack →', 'https://protocol.rojipeptides.com', array(
					'size' => 'lg',
					'text_padding' => array( 'top' => '18', 'right' => '32', 'bottom' => '18', 'left' => '32', 'unit' => 'px', 'isLinked' => false ),
					'typography_font_size' => array( 'unit' => 'px', 'size' => 16, 'sizes' => array() ),
				) ),
				roji_el_button_secondary( 'Or browse the shop', '/shop/', array(
					'size' => 'lg',
					'text_padding' => array( 'top' => '18', 'right' => '32', 'bottom' => '18', 'left' => '32', 'unit' => 'px', 'isLinked' => false ),
					'typography_font_size' => array( 'unit' => 'px', 'size' => 16, 'sizes' => array() ),
				) ),
			) ),

			// Trust strip
			roji_el_html( '<div style="display:flex;flex-wrap:wrap;gap:24px;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#8a8a9a;">
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Third-party COA on every batch</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Free shipping over $200</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>21+ verified · US ship only</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Card + crypto accepted</div>
			</div>' ),
		) ),

		// ── PROTOCOL ENGINE TEASER ──────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_card( array(
				roji_el_inner( array(
					'flex_direction' => 'row',
					'flex_wrap' => 'wrap',
					'flex_gap' => array( 'column' => '32', 'row' => '32', 'unit' => 'px', 'isLinked' => true ),
					'flex_align_items' => 'center',
					'padding' => array( 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => true ),
				), array(
					roji_el_inner( array(
						'_inline_size' => 60,
						'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
						'padding' => array( 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => true ),
					), array(
						roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Protocol Engine</div>' ),
						roji_el_heading( 'Tell us your goal. Get a referenced stack in 60 seconds.', array(
							'header_size' => 'h2',
							'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ),
							'typography_line_height' => array( 'unit' => 'em', 'size' => 1.15, 'sizes' => array() ),
						) ),
						roji_el_text( '<p style="font-size:16px;color:#a8a8b8;">Weight-adjusted dosing, frequency, cycle length — every number cited from published research. Skip the forum spelunking.</p>' ),
						roji_el_button( 'Open the engine →', 'https://protocol.rojipeptides.com' ),
					) ),
					roji_el_inner( array(
						'_inline_size' => 35,
						'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'unit' => 'px', 'isLinked' => true ),
						'background_background' => 'classic',
						'background_color' => '#0d0d14',
						'border_border' => 'solid',
						'border_width' => array( 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'unit' => 'px', 'isLinked' => true ),
						'border_color' => 'rgba(255,255,255,0.06)',
						'border_radius' => array( 'top' => '8', 'right' => '8', 'bottom' => '8', 'left' => '8', 'unit' => 'px', 'isLinked' => true ),
					), array(
						roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:12px;line-height:1.7;color:#a8a8b8;">
<span style="color:#4f6df5;">// example output</span><br>
<span style="color:#55556a;">stack:</span> wolverine<br>
<span style="color:#55556a;">bpc-157:</span> <span style="color:#22c55e;">250mcg</span> <span style="color:#55556a;">2x daily SC</span><br>
<span style="color:#55556a;">tb-500:</span>&nbsp;&nbsp;<span style="color:#22c55e;">2.5mg</span> <span style="color:#55556a;">2x weekly SC</span><br>
<span style="color:#55556a;">cycle:</span>&nbsp;&nbsp;&nbsp;<span style="color:#22c55e;">4 weeks</span><br>
<span style="color:#55556a;">cited:</span>&nbsp;&nbsp;&nbsp;<span style="color:#4f6df5;">3 papers</span> <span style="color:#22c55e;">↗</span>
</div>' ),
					) ),
				) ),
			), array( 'padding' => array( 'top' => '48', 'right' => '40', 'bottom' => '48', 'left' => '40', 'unit' => 'px', 'isLinked' => false ) ) ),
		) ),

		// ── 3-STACK GRID ────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Pre-built stacks</div>' ),
			roji_el_heading( 'Or skip the questionnaire.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 36, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="color:#a8a8b8;font-size:17px;max-width:600px;margin:0 0 32px;">Three stacks cover most research goals. Each ships with the matching compounds + a research dosing reference card.</p>' ),
			roji_el_grid( array(
				// Wolverine
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">HEALING & RECOVERY</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$149</div></div>' ),
					roji_el_heading( 'Wolverine Stack', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">BPC-157 10mg + TB-500 10mg. The most-cited research stack for in-vitro tendon, ligament, and tissue work. 4-week supply.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 2 compounds</li><li>↳ 4-week supply</li><li>↳ 3 published references</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '8', 'row' => '8', 'unit' => 'px', 'isLinked' => true ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=wolverine', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=wolverine&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
					) ),
				) ),
				// Recomp
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">GH AXIS</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$199</div></div>' ),
					roji_el_heading( 'Recomp Stack', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. Comprehensive GH-axis research stack. 4-week supply.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 3 compounds</li><li>↳ 4-week supply</li><li>↳ 3 published references</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '8', 'row' => '8', 'unit' => 'px', 'isLinked' => true ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=recomp', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=recomp&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
					) ),
				) ),
				// Full
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">FULL PROTOCOL</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$399</div></div>' ),
					roji_el_heading( 'Full Protocol', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">Wolverine + Recomp combined across 12 weeks. Ships monthly. Includes printed protocol guide and dosing calendar.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 5 compounds</li><li>↳ 12-week protocol</li><li>↳ Printed dosing card</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '8', 'row' => '8', 'unit' => 'px', 'isLinked' => true ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=full', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=full&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
					) ),
				) ),
			), 3 ),
		) ),

		// ── TRUST PILLARS ───────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
			'background_background' => 'classic',
			'background_color' => '#0d0d14',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Why Roji</div>' ),
			roji_el_heading( 'Boring transparency. Loud results.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 36, 'sizes' => array() ),
			) ),
			roji_el_spacer( 32 ),
			roji_el_grid( array(
				roji_el_card( array(
					roji_el_html( '<div style="font-size:36px;line-height:1;">🧪</div>' ),
					roji_el_heading( 'Independent COA per batch', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>HPLC + MS via Janoshik Analytical. PDFs published with batch numbers. <a href="/coa/">View library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-size:36px;line-height:1;">📚</div>' ),
					roji_el_heading( 'PubMed-cited products', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Every compound page links to the foundational research. No anecdotes. <a href="/research-library/">Read the library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-size:36px;line-height:1;">🚚</div>' ),
					roji_el_heading( 'Discreet · USPS Priority', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Plain unmarked packaging. Free over $200, always free on autoship. <a href="/shipping/">Shipping policy →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-size:36px;line-height:1;">💳</div>' ),
					roji_el_heading( 'Card or crypto', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Multiple high-risk-friendly card processors with crypto fallback if a card declines. No drama.</p>' ),
				) ),
			), 4 ),
		) ),

		// ── FREE TOOLS ─────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Free tools</div>' ),
			roji_el_heading( 'Tools we wish someone else had built.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 36, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="color:#a8a8b8;font-size:17px;max-width:640px;margin:0 0 32px;">Calculators, databases, and verifiers for the peptide research community. Free, ad-free, no accounts. <a href="https://tools.rojipeptides.com" style="color:#4f6df5;">See all tools →</a></p>' ),
			roji_el_grid( array(
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">CALCULATOR</div>' ),
					roji_el_heading( 'Reconstitution Calculator', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 20, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">Vial mg + BAC water mL → exact mcg per insulin-syringe tick.</p>' ),
					roji_el_button( 'Open →', 'https://tools.rojipeptides.com/reconstitution', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">VERIFIER</div>' ),
					roji_el_heading( 'COA Verifier', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 20, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">Drop in any vendor COA. Plain-English breakdown + red-flag scoring.</p>' ),
					roji_el_button( 'Open →', 'https://tools.rojipeptides.com/coa', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">DATABASE</div>' ),
					roji_el_heading( 'Half-Life Database', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 20, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">PK data + plasma decay charts for 20+ research peptides. Cited.</p>' ),
					roji_el_button( 'Open →', 'https://tools.rojipeptides.com/half-life', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">CALCULATOR</div>' ),
					roji_el_heading( 'Bloodwork Interpreter', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 20, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">Drop in a panel. See where each marker falls vs reference ranges.</p>' ),
					roji_el_button( 'Open →', 'https://tools.rojipeptides.com/bloodwork', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
				) ),
			), 4 ),
		) ),

		// ── TRUSTPILOT ──────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '60', 'right' => '20', 'bottom' => '60', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;text-align:center;">What researchers say</div>' ),
			roji_el_heading( 'Independent reviews on Trustpilot.', array(
				'header_size' => 'h2',
				'align' => 'center',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ),
			) ),
			roji_el_spacer( 24 ),
			roji_el_shortcode( '[trustpilot_hero]' ),
		) ),

		// ── FAQ TEASE ───────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px;">Common questions</div>' ),
			roji_el_heading( 'The questions everyone asks first.', array(
				'header_size' => 'h2',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ),
			) ),
			roji_el_spacer( 24 ),
			roji_el_faq_item(
				'Why does everything say "research use only"?',
				'<p>Because that is the legal and intended purpose of these compounds. They are not FDA-approved drugs, supplements, cosmetics, or food additives. We sell them as research-grade chemicals to qualified buyers — and we are required by law to be very explicit about that, including at checkout where you confirm intended use.</p>'
			),
			roji_el_faq_item(
				'How do I know the products are what you say they are?',
				'<p>Every batch is tested by an independent third-party lab via HPLC and mass spectrometry. The Certificate of Analysis is published on the product page and downloadable as a PDF. <a href="/coa/">Browse the COA library.</a></p>'
			),
			roji_el_faq_item(
				'How does autoship work?',
				'<p>Pick a stack, choose "Save 15% with monthly autoship" at the top of any product page (or in the Protocol Engine). Your card is charged once a month and a fresh supply ships automatically. Free shipping on every renewal. Pause or cancel anytime from your account.</p>'
			),
			roji_el_faq_item(
				'Is the packaging discreet?',
				'<p>Yes — every order ships in plain, unmarked packaging with no external branding or product descriptions visible.</p>'
			),
			roji_el_inner( array(
				'flex_direction' => 'row',
				'flex_justify_content' => 'flex-start',
				'padding' => array( 'top' => '12', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
			), array(
				roji_el_button_secondary( 'See all FAQs →', '/faq/' ),
			) ),
		) ),

		// ── BOTTOM CTA ──────────────────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '120', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_card( array(
				roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;text-align:center;">Get started</div>' ),
				roji_el_heading( 'Skip the forums. Start with the math.', array(
					'header_size' => 'h2',
					'align' => 'center',
					'typography_font_size' => array( 'unit' => 'px', 'size' => 40, 'sizes' => array() ),
				) ),
				roji_el_text( '<p style="text-align:center;font-size:18px;color:#a8a8b8;max-width:560px;margin:8px auto 0;">60 seconds to a referenced research stack tailored to your goal.</p>' ),
				roji_el_inner( array(
					'flex_direction' => 'row',
					'flex_wrap' => 'wrap',
					'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
					'flex_justify_content' => 'center',
					'padding' => array( 'top' => '20', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
				), array(
					roji_el_button( 'Open the Protocol Engine', 'https://protocol.rojipeptides.com', array(
						'align' => 'center',
						'text_padding' => array( 'top' => '18', 'right' => '36', 'bottom' => '18', 'left' => '36', 'unit' => 'px', 'isLinked' => false ),
						'typography_font_size' => array( 'unit' => 'px', 'size' => 16, 'sizes' => array() ),
					) ),
				) ),
			), array( 'padding' => array( 'top' => '64', 'right' => '40', 'bottom' => '64', 'left' => '40', 'unit' => 'px', 'isLinked' => false ) ) ),
		) ),
	),
);
