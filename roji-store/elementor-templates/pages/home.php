<?php
roji_el_set_page_key( 'home' );

return array(
	'title'   => 'Roji Peptides',
	'content' => array(

		// ── HERO ─────────────────────────────────────────────────────────────
		// Image-led, shop-first hero (rebuilt 2026-05-07).
		//
		// Why: the previous hero was four blocks of text (eyebrow, 72px H1,
		// 22px subhead, two CTAs, trust strip, compliance disclaimer)
		// before a visitor saw a single product image. For paid traffic
		// arriving from compound-name searches, "what do they sell?" is
		// the only question that matters in the first 2 seconds.
		//
		// New layout: two-column on desktop, stacked on mobile.
		//   Left: small chip + short H1 + ONE primary CTA → /shop/.
		//   Right: collage of the three bundle product images, slightly
		//          rotated/staggered with soft shadows.
		//
		// Trust strip + compliance line moved to a dedicated section
		// below so they're still visible but don't block the first
		// impression.
		//
		// Implemented as a single roji_el_html so flex/grid + media
		// queries work cleanly without fighting Elementor column widgets.
		// Image URLs come from the live attachment IDs (121/122/123)
		// pinned by import-product-images.sh.
		roji_el_container( array(
			'padding' => array( 'top' => '80', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'padding_mobile' => array( 'top' => '24', 'right' => '20', 'bottom' => '24', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'padding_tablet' => array( 'top' => '48', 'right' => '20', 'bottom' => '32', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
			'background_overlay_background' => 'gradient',
			'background_overlay_color' => 'rgba(79,109,245,0.04)',
			'background_overlay_color_b' => 'rgba(10,10,15,0)',
			'background_overlay_gradient_angle' => array( 'unit' => 'deg', 'size' => 180, 'sizes' => array() ),
		), array(
			roji_el_html(
				'<style>
					.roji-hero-shop { display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center; min-height: 480px; }
					@media (max-width: 900px) { .roji-hero-shop { grid-template-columns: 1fr; gap: 32px; min-height: 0; } }
					.roji-hero-shop__left { display: flex; flex-direction: column; gap: 20px; }
					.roji-hero-shop__chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: rgba(79,109,245,0.1); border: 1px solid rgba(79,109,245,0.25); border-radius: 999px; font-family: JetBrains Mono, monospace; font-size: 11px; color: #4f6df5; letter-spacing: 0.1em; text-transform: uppercase; width: fit-content; }
					.roji-hero-shop__chip-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; display: inline-block; }
					.roji-hero-shop__h1 { margin: 0; font-size: 64px; line-height: 1.0; letter-spacing: -0.02em; color: #f0f0f5; font-weight: 700; }
					@media (max-width: 900px) { .roji-hero-shop__h1 { font-size: 44px; } }
					.roji-hero-shop__sub { margin: 0; font-size: 18px; line-height: 1.5; color: #a8a8b8; max-width: 540px; }
					.roji-hero-shop__cta-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 8px; }
					.roji-hero-shop__cta { display: inline-flex; align-items: center; gap: 8px; padding: 18px 32px; background: #4f6df5; color: #fff; font-size: 16px; font-weight: 600; border-radius: 8px; text-decoration: none; transition: background 0.15s ease; }
					.roji-hero-shop__cta:hover { background: #3954d8; color: #fff; }
					.roji-hero-shop__cta-sub { font-size: 13px; color: #8a8a9a; }
					.roji-hero-shop__cta-sub a { color: #4f6df5; text-decoration: none; }
					.roji-hero-shop__cta-sub a:hover { text-decoration: underline; }

					/* Image collage — three bundle covers, gently fanned. */
					.roji-hero-shop__right { position: relative; min-height: 380px; }
					@media (max-width: 900px) { .roji-hero-shop__right { min-height: 280px; order: -1; } }
					.roji-hero-shop__img { position: absolute; width: 58%; aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden; background: #0d0d14; border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 24px 48px -16px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(79,109,245,0.2); transition: transform 0.4s ease; }
					.roji-hero-shop__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
					.roji-hero-shop__img--back  { top: 0;     right: 0;   transform: rotate(4deg); z-index: 1; }
					.roji-hero-shop__img--mid   { top: 20%;   left: 18%;  transform: rotate(-3deg); z-index: 2; }
					.roji-hero-shop__img--front { bottom: 0;  left: 0;    transform: rotate(2deg); z-index: 3; }
					.roji-hero-shop:hover .roji-hero-shop__img--back  { transform: rotate(6deg) translate(4px, -4px); }
					.roji-hero-shop:hover .roji-hero-shop__img--mid   { transform: rotate(-4deg) translate(-2px, -2px); }
					.roji-hero-shop:hover .roji-hero-shop__img--front { transform: rotate(0deg) translate(0, 4px); }
				</style>
				<div class="roji-hero-shop">
					<div class="roji-hero-shop__left">
						<div class="roji-hero-shop__chip">
							<span class="roji-hero-shop__chip-dot"></span>Now shipping · COA on every batch
						</div>
						<h1 class="roji-hero-shop__h1">Research-grade peptides, with the receipts.</h1>
						<p class="roji-hero-shop__sub">Three peer-reviewed stacks. ≥99% purity. Janoshik third-party COA on every batch.</p>
						<div class="roji-hero-shop__cta-row">
							<a class="roji-hero-shop__cta" href="/shop/">Browse the shop &rarr;</a>
							<span class="roji-hero-shop__cta-sub">or <a href="https://tools.rojipeptides.com">browse the free research tools</a></span>
						</div>
					</div>
					<div class="roji-hero-shop__right">
						<div class="roji-hero-shop__img roji-hero-shop__img--back" aria-hidden="true">
							<img src="https://rojipeptides.com/wp-content/uploads/2026/04/full-protocol-1.png" alt="" loading="eager" />
						</div>
						<div class="roji-hero-shop__img roji-hero-shop__img--mid" aria-hidden="true">
							<img src="https://rojipeptides.com/wp-content/uploads/2026/04/recomp-stack-1.png" alt="" loading="eager" />
						</div>
						<div class="roji-hero-shop__img roji-hero-shop__img--front">
							<img src="https://rojipeptides.com/wp-content/uploads/2026/04/wolverine-stack-1.png" alt="Roji bundle covers: BPC-157 + TB-500, CJC-1295 + Ipamorelin + MK-677, and Full Protocol" loading="eager" />
						</div>
					</div>
				</div>'
			),
		) ),

		// ── TRUST STRIP ─────────────────────────────────────────────────────
		// Pulled out of the hero (2026-05-07) so the hero can be image-led.
		// Still above the fold on desktop; tucked under the hero on mobile.
		roji_el_container( array(
			'padding' => array( 'top' => '0', 'right' => '20', 'bottom' => '32', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_html( '<div style="display:flex;flex-wrap:wrap;gap:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);font-size:13px;color:#8a8a9a;">
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Janoshik third-party COA on every batch</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Free shipping over $200</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>21+ verified · US ship only</div>
				<div style="display:flex;align-items:center;gap:8px;"><span style="color:#22c55e;font-size:16px;">✓</span>Card + crypto accepted</div>
			</div>
			<div style="margin-top:16px;font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.05em;line-height:1.6;max-width:760px;">
				All products are intended strictly for laboratory and preclinical research use. We do not provide usage instructions, dosing guidelines, or any advice regarding the application of our products.
			</div>' ),
		) ),

		// ── RESEARCH TOOLS TEASER ───────────────────────────────────────────
		roji_el_container( array(
			'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
			'content_width' => 'boxed',
		), array(
			roji_el_card( array(
				roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">Research Tools</div>' ),
				roji_el_heading( 'Calculators, databases, and analyzers — all free.', array(
					'header_size' => 'h2',
					'typography_font_size' => array( 'unit' => 'px', 'size' => 32, 'sizes' => array() ),
					'typography_line_height' => array( 'unit' => 'em', 'size' => 1.15, 'sizes' => array() ),
				) ),
				roji_el_text( '<p style="font-size:16px;color:#a8a8b8;max-width:680px;">Reconstitution math, half-life databases, COA analyzers, and more. Open references. Open math. Skip the forum spelunking.</p>' ),
				roji_el_button( 'Explore the tools →', 'https://tools.rojipeptides.com' ),
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
				// BPC-157 + TB-500 (formerly "Wolverine"; renamed
				// 2026-05-06 — see import-products.php).
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">TISSUE-RESEARCH</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$149</div></div>' ),
					roji_el_heading( 'BPC-157 + TB-500 Stack', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">BPC-157 10mg + TB-500 10mg. Among the most-referenced two-compound stacks in the published preclinical literature. 4-week supply.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 2 compounds</li><li>↳ 4-week supply</li><li>↳ 3 published references</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '12', 'row' => '8', 'unit' => 'px', 'isLinked' => false ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
						'_css_classes' => 'roji-buy-row',
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=wolverine', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=wolverine&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ), '_css_classes' => 'roji-cta-link roji-cta-link--autoship' ) ),
					) ),
				) ),
				// CJC-1295 + Ipamorelin + MK-677 (formerly "Recomp";
				// renamed 2026-05-06).
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">GH AXIS</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$199</div></div>' ),
					roji_el_heading( 'CJC-1295 + Ipamorelin + MK-677', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. Three GH-axis research compounds with extensive published pharmacokinetic data. 4-week supply.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 3 compounds</li><li>↳ 4-week supply</li><li>↳ 3 published references</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '12', 'row' => '8', 'unit' => 'px', 'isLinked' => false ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
						'_css_classes' => 'roji-buy-row',
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=recomp', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=recomp&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ), '_css_classes' => 'roji-cta-link roji-cta-link--autoship' ) ),
					) ),
				) ),
				// Full Protocol — both stacks combined.
				roji_el_card( array(
					roji_el_html( '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.1em;">FULL PROTOCOL</div><div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#f0f0f5;font-weight:600;">$399</div></div>' ),
					roji_el_heading( 'Full Protocol', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 24, 'sizes' => array() ) ) ),
					roji_el_text( '<p style="color:#a8a8b8;">Both stacks (BPC-157 + TB-500 and CJC-1295 + Ipamorelin + MK-677) combined across 12 weeks. Ships monthly. Includes printed protocol guide and dosing calendar.</p>' ),
					roji_el_html( '<ul style="list-style:none;padding:0;margin:0;font-size:13px;color:#8a8a9a;display:flex;flex-direction:column;gap:6px;"><li>↳ 5 compounds</li><li>↳ 12-week protocol</li><li>↳ Printed dosing card</li></ul>' ),
					roji_el_inner( array(
						'flex_direction' => 'row',
						'flex_gap' => array( 'column' => '12', 'row' => '8', 'unit' => 'px', 'isLinked' => false ),
						'padding' => array( 'top' => '8', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
						'_css_classes' => 'roji-buy-row',
					), array(
						roji_el_button( 'One-time', '/cart/?protocol_stack=full', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ) ) ),
						roji_el_button_secondary( 'Autoship −15%', '/cart/?protocol_stack=full&autoship=1', array( 'typography_font_size' => array( 'unit' => 'px', 'size' => 14, 'sizes' => array() ), '_css_classes' => 'roji-cta-link roji-cta-link--autoship' ) ),
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
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">01 / Lab tested</div>' ),
					roji_el_heading( 'Independent COA per batch', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>HPLC + MS via Janoshik Analytical. PDFs published with batch numbers. <a href="/coa/">View library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">02 / Cited</div>' ),
					roji_el_heading( 'PubMed-cited products', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Every compound page links to the foundational peer-reviewed literature. No anecdotes. <a href="/research-library/">Read the library →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">03 / Shipping</div>' ),
					roji_el_heading( 'Discreet · USPS Priority', array( 'header_size' => 'h3', 'typography_font_size' => array( 'unit' => 'px', 'size' => 18, 'sizes' => array() ) ) ),
					roji_el_text( '<p>Plain unmarked packaging. Free over $200, always free on autoship. <a href="/shipping/">Shipping policy →</a></p>' ),
				) ),
				roji_el_card( array(
					roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">04 / Payments</div>' ),
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
				'<p>Pick a stack and choose "Save 15% with monthly autoship" at the top of any product page. Your card is charged once a month and a fresh supply ships automatically. Free shipping on every renewal. Pause or cancel anytime from your account.</p>'
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
				roji_el_text( '<p style="text-align:center;font-size:18px;color:#a8a8b8;max-width:560px;margin:8px auto 0;">Free calculators, half-life databases, and COA analyzers for the research community.</p>' ),
				roji_el_inner( array(
					'flex_direction' => 'row',
					'flex_wrap' => 'wrap',
					'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ),
					'flex_justify_content' => 'center',
					'padding' => array( 'top' => '20', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
				), array(
					roji_el_button( 'Explore the research tools', 'https://tools.rojipeptides.com', array(
						'align' => 'center',
						'text_padding' => array( 'top' => '18', 'right' => '36', 'bottom' => '18', 'left' => '36', 'unit' => 'px', 'isLinked' => false ),
						'typography_font_size' => array( 'unit' => 'px', 'size' => 16, 'sizes' => array() ),
					) ),
				) ),
			), array( 'padding' => array( 'top' => '64', 'right' => '40', 'bottom' => '64', 'left' => '40', 'unit' => 'px', 'isLinked' => false ) ) ),
		) ),
	),
);
