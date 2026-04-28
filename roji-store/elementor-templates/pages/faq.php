<?php
roji_el_set_page_key( 'faq' );

$faqs = array(
	// Compliance / research-use language
	array( 'cat' => 'Compliance', 'q' => 'Why does everything say "research use only"?',
		'a' => '<p>Because that is the legal and intended purpose of these compounds. Peptides like BPC-157 and TB-500 are used worldwide in published, peer-reviewed in-vitro research. They are not FDA-approved drugs, supplements, cosmetics, or food additives. We sell them as research-grade chemicals to qualified buyers — and we are required by law to be very explicit about that, including at checkout where you confirm intended use. <a href="/disclaimer/">Read the full disclaimer.</a></p>' ),
	array( 'cat' => 'Compliance', 'q' => 'Are these legal to purchase?',
		'a' => '<p>In the United States, research peptides are legal to purchase and possess for laboratory research purposes. They are not scheduled controlled substances. However, regulations vary by state and by intended use, and you are responsible for compliance with all applicable federal, state, and local laws.</p>' ),
	array( 'cat' => 'Compliance', 'q' => 'Do you make any therapeutic claims?',
		'a' => '<p>No. We never claim our products treat, cure, mitigate, or prevent any disease. We link to published research so you can read the science yourself, but the inclusion of those references is informational, not promotional. <a href="/research-library/">View the library.</a></p>' ),

	// Product / quality
	array( 'cat' => 'Quality', 'q' => 'How do I know the products are what you say they are?',
		'a' => '<p>Every batch is tested by an independent third-party lab via HPLC and mass spectrometry. The Certificate of Analysis (COA) is published on the product page and downloadable as a PDF. The COA shows batch number, identity confirmation, and purity (we ship ≥99%). <a href="/coa/">Browse the COA library.</a></p>' ),
	array( 'cat' => 'Quality', 'q' => 'How are products stored before shipping?',
		'a' => '<p>Inventory is held in temperature- and humidity-controlled storage with full lot tracking from supplier receipt through fulfillment. Temperature-sensitive products may include cold packs in warmer months at our discretion.</p>' ),
	array( 'cat' => 'Quality', 'q' => 'How do I store products after they arrive?',
		'a' => '<p>General guidance: store lyophilized (freeze-dried) peptides in a cool, dry place away from direct sunlight. Refrigerate after reconstitution. Specific storage instructions ship with each product. Improper storage can affect compound integrity.</p>' ),

	// Research Tools
	array( 'cat' => 'Research Tools', 'q' => 'What research tools do you offer?',
		'a' => '<p>A free suite of calculators, databases, and analyzers at <a href="https://tools.rojipeptides.com">tools.rojipeptides.com</a> — including a reconstitution calculator, a half-life database covering 15+ research compounds, a COA analyzer, a cost-per-dose calculator, and more. No signup, no upsell. They\'re educational reference tools for the research community.</p>' ),
	array( 'cat' => 'Research Tools', 'q' => 'Are the tools free?',
		'a' => '<p>Yes. All tools are 100% free, no account required. Data you enter into a calculator stays in your browser; we don\'t store it. Every reference data point links back to its published source.</p>' ),

	// Shipping / orders
	array( 'cat' => 'Shipping & orders', 'q' => 'How fast do you ship?',
		'a' => '<p>Orders placed before 1:00 PM ET on business days typically ship the same day. Standard USPS Priority delivery is 2–4 business days; Express is 1–2. <a href="/shipping/">Full shipping policy.</a></p>' ),
	array( 'cat' => 'Shipping & orders', 'q' => 'Is the packaging discreet?',
		'a' => '<p>Yes — every order ships in plain, unmarked packaging with no external branding or product descriptions visible.</p>' ),
	array( 'cat' => 'Shipping & orders', 'q' => 'Do you ship internationally?',
		'a' => '<p>Not currently — U.S. shipping only, including all 50 states, D.C., and U.S. territories.</p>' ),
	array( 'cat' => 'Shipping & orders', 'q' => 'When is shipping free?',
		'a' => '<p>Free USPS Priority on any order over $200. Monthly autoship orders ship free regardless of total.</p>' ),

	// Payment
	array( 'cat' => 'Payment', 'q' => 'What payment methods do you accept?',
		'a' => '<p>Credit/debit cards (processed via our high-risk card processor) and crypto (Coinbase Commerce, NOWPayments). The card descriptor will read <code style="font-family:JetBrains Mono,monospace;font-size:13px;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;">ROJI RESEARCH</code>.</p>' ),
	array( 'cat' => 'Payment', 'q' => 'Why was my card declined?',
		'a' => '<p>High-risk processors are conservative. The most common cause is a billing address that doesn\'t match what your bank has on file. If a card fails, our checkout will surface a backup payment option (additional card processor or crypto). If you keep hitting walls, email <a href="mailto:support@rojipeptides.com">support@rojipeptides.com</a> with your order number — we can usually fix it within a few hours.</p>' ),

	// Subscriptions / autoship
	array( 'cat' => 'Subscriptions', 'q' => 'How does autoship work?',
		'a' => '<p>Pick a stack and choose "Save 15% with monthly autoship" at the top of any product page. Your card is charged once a month and a fresh supply ships automatically. Free shipping on every renewal. You can pause or cancel any time from your account.</p>' ),
	array( 'cat' => 'Subscriptions', 'q' => 'What happens if my card fails on a renewal?',
		'a' => '<p>We retry on day 1, day 3, and day 7. After each failed attempt you\'ll get an email with a one-click link to update your payment method. After three failures the subscription pauses and waits for you to fix it — we won\'t cancel without telling you first.</p>' ),

	// Refunds
	array( 'cat' => 'Refunds', 'q' => 'Can I return a product?',
		'a' => '<p>Unopened products in original sealed condition may be returned within 14 days of confirmed delivery (15% restocking fee, customer pays return shipping). Once a vial has been opened we cannot accept it back — the chain of custody is broken. Damaged or defective items get full replacements at our cost. <a href="/refunds/">Full refund policy.</a></p>' ),
	array( 'cat' => 'Refunds', 'q' => 'How long does a refund take?',
		'a' => '<p>Card refunds appear in 5–10 business days depending on your bank. Crypto refunds are issued at the USD-equivalent value of the original purchase, not at the current exchange rate.</p>' ),

	// Affiliates
	array( 'cat' => 'Affiliates', 'q' => 'Do you have an affiliate program?',
		'a' => '<p>Yes — tiered: 10% on every sale by default, 15% after $10k in lifetime referrals, 20% after $50k. Subscription renewals also pay (at half-tier rate). 30-day attribution window. <a href="/become-an-affiliate/">Apply here.</a></p>' ),
);

// Group by category
$by_cat = array();
foreach ( $faqs as $f ) {
	$by_cat[ $f['cat'] ][] = $f;
}

$content = array(
	// Hero
	roji_el_container( array(
		'padding' => array( 'top' => '100', 'right' => '20', 'bottom' => '40', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'content_width' => 'boxed',
	), array(
		roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#4f6df5;letter-spacing:0.15em;text-transform:uppercase;">FAQ</div>' ),
		roji_el_heading( 'Questions, answered.', array(
			'header_size' => 'h1',
			'typography_font_size' => array( 'unit' => 'px', 'size' => 56, 'sizes' => array() ),
			'typography_line_height' => array( 'unit' => 'em', 'size' => 1.05, 'sizes' => array() ),
		) ),
		roji_el_text( '<p style="font-size:18px;color:#a8a8b8;max-width:680px;">If something below doesn\'t cover what you need, email <a href="mailto:support@rojipeptides.com">support@rojipeptides.com</a> — a real human reads everything within one business day.</p>' ),
	) ),
);

foreach ( $by_cat as $cat => $items ) {
	$widgets = array(
		roji_el_html( '<div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#55556a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">' . esc_html( $cat ) . '</div>' ),
	);
	foreach ( $items as $f ) {
		$widgets[] = roji_el_faq_item( $f['q'], $f['a'] );
	}
	$content[] = roji_el_container( array(
		'padding' => array( 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'content_width' => 'boxed',
		'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
	), $widgets );
}

// Bottom CTA
$content[] = roji_el_container( array(
	'padding' => array( 'top' => '40', 'right' => '20', 'bottom' => '100', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
	'content_width' => 'boxed',
), array(
	roji_el_card( array(
		roji_el_heading( 'Still have questions?', array( 'header_size' => 'h2', 'align' => 'center', 'typography_font_size' => array( 'unit' => 'px', 'size' => 28, 'sizes' => array() ) ) ),
		roji_el_text( '<p style="text-align:center;font-size:16px;">Email us — we usually respond within a few hours during business days.</p>' ),
		roji_el_inner( array(
			'flex_direction' => 'row',
			'flex_justify_content' => 'center',
			'padding' => array( 'top' => '12', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => false ),
		), array(
			roji_el_button( 'support@rojipeptides.com', 'mailto:support@rojipeptides.com', array( 'align' => 'center' ) ),
		) ),
	), array( 'padding' => array( 'top' => '40', 'right' => '32', 'bottom' => '40', 'left' => '32', 'unit' => 'px', 'isLinked' => false ) ) ),
) );

return array(
	'title'   => 'Frequently Asked Questions',
	'content' => $content,
);
