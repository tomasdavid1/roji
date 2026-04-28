<?php
/**
 * Roji — Elementor template builder helpers.
 *
 * Tiny composable helpers that produce the exact array shape Elementor's
 * `_elementor_data` post-meta expects. Call from a page definition file,
 * pass the returned array to roji_el_save_page().
 *
 * Schema crib (Elementor v4):
 *   element = ['id' => '8-char-hex', 'elType' => 'container'|'widget',
 *              'settings' => [...controls...], 'elements' => [...children...],
 *              'isInner' => bool, 'widgetType' => '...' (widgets only)]
 *
 * @package roji-elementor-templates
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * Identity helpers
 * -------------------------------------------------------------------------- */

/**
 * Generate a stable-ish 8-char hex id Elementor expects on every node.
 * Stability matters because Elementor's CSS file is keyed off these — we
 * hash the page slug + a counter so re-runs of the importer produce the
 * same ids and don't blow away handcrafted CSS.
 */
function roji_el_id() {
	static $counter = 0;
	$counter++;
	return substr( md5( ( defined( 'ROJI_EL_PAGE_KEY' ) ? ROJI_EL_PAGE_KEY : 'unknown' ) . ':' . $counter ), 0, 8 );
}

/**
 * Convenience: declare which page we're building so id-generation stays
 * deterministic across runs.
 */
function roji_el_set_page_key( $key ) {
	if ( ! defined( 'ROJI_EL_PAGE_KEY' ) ) {
		define( 'ROJI_EL_PAGE_KEY', $key );
	}
}

/* -----------------------------------------------------------------------------
 * Section / column / container builders
 * -------------------------------------------------------------------------- */

/**
 * Modern container (flex). Replaces section/column for new builds.
 *
 * @param array $settings Settings overrides.
 * @param array $children Child elements.
 */
function roji_el_container( array $settings = array(), array $children = array() ) {
	$defaults = array(
		'content_width'         => 'boxed',
		'flex_direction'        => 'column',
		'flex_gap'              => array(
			'column' => '24',
			'row'    => '24',
			'unit'   => 'px',
			'isLinked' => true,
		),
		'padding'               => array(
			'top'      => '60',
			'right'    => '20',
			'bottom'   => '60',
			'left'     => '20',
			'unit'     => 'px',
			'isLinked' => false,
		),
	);
	return array(
		'id'       => roji_el_id(),
		'elType'   => 'container',
		'settings' => array_merge( $defaults, $settings ),
		'elements' => $children,
		'isInner'  => false,
	);
}

/**
 * Inner container — same as container but isInner=true so Elementor renders
 * with reduced default padding. Use inside another container for grid cells.
 */
function roji_el_inner( array $settings = array(), array $children = array() ) {
	$el = roji_el_container( array_merge(
		array(
			'padding' => array(
				'top'    => '0',
				'right'  => '0',
				'bottom' => '0',
				'left'   => '0',
				'unit'   => 'px',
				'isLinked' => true,
			),
		),
		$settings
	), $children );
	$el['isInner'] = true;
	return $el;
}

/* -----------------------------------------------------------------------------
 * Widget builders
 * -------------------------------------------------------------------------- */

function roji_el_widget( $widget_type, array $settings = array() ) {
	return array(
		'id'         => roji_el_id(),
		'elType'     => 'widget',
		'widgetType' => $widget_type,
		'settings'   => $settings,
		'elements'   => array(),
		'isInner'    => false,
	);
}

function roji_el_heading( $title, array $opts = array() ) {
	return roji_el_widget( 'heading', array_merge(
		array(
			'title'           => $title,
			'header_size'     => 'h2',
			'align'           => 'left',
			'title_color'     => '#f0f0f5',
			'typography_typography' => 'custom',
			'typography_font_family' => 'Inter',
			'typography_font_weight' => '700',
			'typography_letter_spacing' => array( 'unit' => 'px', 'size' => -1, 'sizes' => array() ),
		),
		$opts
	) );
}

function roji_el_text( $html, array $opts = array() ) {
	return roji_el_widget( 'text-editor', array_merge(
		array(
			'editor'                  => $html,
			'text_color'              => '#8a8a9a',
			'typography_typography'   => 'custom',
			'typography_font_family'  => 'Inter',
			'typography_line_height'  => array( 'unit' => 'em', 'size' => 1.7, 'sizes' => array() ),
		),
		$opts
	) );
}

function roji_el_button( $text, $url, array $opts = array() ) {
	return roji_el_widget( 'button', array_merge(
		array(
			'text'                    => $text,
			'link'                    => array( 'url' => $url, 'is_external' => '', 'nofollow' => '' ),
			'align'                   => 'left',
			'background_color'        => '#4f6df5',
			'button_text_color'       => '#ffffff',
			'border_radius'           => array( 'top' => '8', 'right' => '8', 'bottom' => '8', 'left' => '8', 'unit' => 'px', 'isLinked' => true ),
			'text_padding'            => array( 'top' => '14', 'right' => '28', 'bottom' => '14', 'left' => '28', 'unit' => 'px', 'isLinked' => false ),
			'typography_typography'   => 'custom',
			'typography_font_family'  => 'Inter',
			'typography_font_weight'  => '600',
		),
		$opts
	) );
}

function roji_el_button_secondary( $text, $url, array $opts = array() ) {
	return roji_el_button( $text, $url, array_merge(
		array(
			'background_color'        => 'transparent',
			'button_text_color'       => '#f0f0f5',
			'border_border'           => 'solid',
			'border_width'            => array( 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'unit' => 'px', 'isLinked' => true ),
			'border_color'            => 'rgba(255,255,255,0.12)',
			'hover_background_color'  => 'rgba(255,255,255,0.04)',
		),
		$opts
	) );
}

function roji_el_html( $html, array $opts = array() ) {
	return roji_el_widget( 'html', array_merge(
		array( 'html' => $html ),
		$opts
	) );
}

function roji_el_shortcode( $shortcode, array $opts = array() ) {
	return roji_el_widget( 'shortcode', array_merge(
		array( 'shortcode' => $shortcode ),
		$opts
	) );
}

function roji_el_spacer( $height_px = 40 ) {
	return roji_el_widget( 'spacer', array(
		'space' => array( 'unit' => 'px', 'size' => $height_px, 'sizes' => array() ),
	) );
}

function roji_el_divider( array $opts = array() ) {
	return roji_el_widget( 'divider', array_merge(
		array(
			'color' => 'rgba(255,255,255,0.06)',
			'weight' => array( 'unit' => 'px', 'size' => 1, 'sizes' => array() ),
		),
		$opts
	) );
}

function roji_el_icon_box( $icon_class, $title, $description, array $opts = array() ) {
	return roji_el_widget( 'icon-box', array_merge(
		array(
			'selected_icon'           => array( 'value' => $icon_class, 'library' => 'fa-solid' ),
			'title_text'              => $title,
			'description_text'        => $description,
			'position'                => 'top',
			'title_color'             => '#f0f0f5',
			'description_color'       => '#8a8a9a',
			'primary_color'           => '#4f6df5',
			'title_typography_typography' => 'custom',
			'title_typography_font_weight' => '600',
			'title_typography_font_size' => array( 'unit' => 'px', 'size' => 17, 'sizes' => array() ),
		),
		$opts
	) );
}

/* -----------------------------------------------------------------------------
 * Pre-styled "card" containers (Roji design system)
 * -------------------------------------------------------------------------- */

function roji_el_card( array $children, array $settings = array() ) {
	return roji_el_inner( array_merge(
		array(
			'background_background'   => 'classic',
			'background_color'        => '#16161f',
			'border_border'           => 'solid',
			'border_width'            => array( 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'unit' => 'px', 'isLinked' => true ),
			'border_color'            => 'rgba(255,255,255,0.06)',
			'border_radius'           => array( 'top' => '12', 'right' => '12', 'bottom' => '12', 'left' => '12', 'unit' => 'px', 'isLinked' => true ),
			'padding'                 => array( 'top' => '28', 'right' => '28', 'bottom' => '28', 'left' => '28', 'unit' => 'px', 'isLinked' => true ),
			'flex_gap'                => array( 'column' => '16', 'row' => '16', 'unit' => 'px', 'isLinked' => true ),
		),
		$settings
	), $children );
}

/**
 * Two/three-column responsive grid wrapper. Pass each cell as a
 * roji_el_card() (or any container) inside `$cells`.
 */
function roji_el_grid( array $cells, $cols = 3 ) {
	return roji_el_inner( array(
		'flex_direction' => 'row',
		'flex_wrap'      => 'wrap',
		'flex_gap'       => array( 'column' => '20', 'row' => '20', 'unit' => 'px', 'isLinked' => true ),
		'_css_classes'   => 'roji-el-grid roji-el-grid-' . (int) $cols,
		'padding'        => array( 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'unit' => 'px', 'isLinked' => true ),
	), $cells );
}

/**
 * FAQ row — uses a styled details/summary so it works without Elementor
 * Pro's accordion widget. Native progressive enhancement.
 */
function roji_el_faq_item( $question, $answer_html ) {
	$html = sprintf(
		'<details class="roji-faq-item" style="background:#16161f;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 22px;margin:0 0 12px;cursor:pointer;">
			<summary style="font-weight:600;font-size:16px;color:#f0f0f5;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;">%s<span style="color:#4f6df5;font-family:JetBrains Mono,monospace;font-size:18px;flex-shrink:0;">+</span></summary>
			<div style="margin-top:14px;color:#a8a8b8;font-size:15px;line-height:1.7;">%s</div>
		</details>',
		esc_html( $question ),
		$answer_html
	);
	return roji_el_html( $html );
}

/* -----------------------------------------------------------------------------
 * High-level: legal-style page from structured sections
 *
 * Pass an array of ['heading' => str, 'body' => html_string] sections and
 * this returns a content array ready for roji_el_save_dark_page().
 * -------------------------------------------------------------------------- */

/**
 * @param string $title          Page title (rendered as H1).
 * @param string $last_updated   E.g. 'April 2026'.
 * @param string $intro_html     Optional intro paragraph (raw HTML).
 * @param array  $sections       Each: ['heading' => str, 'body' => html_string].
 * @return array Top-level content for roji_el_save_dark_page.
 */
function roji_el_legal_page( $title, $last_updated, $intro_html, array $sections ) {
	$body = array(
		// Hero / title block
		roji_el_container( array(
			'padding' => array( 'top' => '80', 'right' => '20', 'bottom' => '24', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		), array(
			roji_el_heading( $title, array(
				'header_size' => 'h1',
				'align' => 'left',
				'typography_font_size' => array( 'unit' => 'px', 'size' => 44, 'sizes' => array() ),
			) ),
			roji_el_text( '<p style="color:#55556a;font-family:JetBrains Mono,monospace;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;margin:8px 0 0;">Last updated: ' . esc_html( $last_updated ) . '</p>' ),
		) ),
	);

	if ( ! empty( $intro_html ) ) {
		$body[] = roji_el_container( array(
			'padding' => array( 'top' => '0', 'right' => '20', 'bottom' => '24', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		), array(
			roji_el_text( $intro_html, array(
				'typography_font_size' => array( 'unit' => 'px', 'size' => 17, 'sizes' => array() ),
				'text_color' => '#a8a8b8',
			) ),
		) );
	}

	// Sections — each = an H2 + body text
	$section_widgets = array();
	foreach ( $sections as $i => $sec ) {
		$num = $i + 1;
		$section_widgets[] = roji_el_heading( $num . '. ' . $sec['heading'], array(
			'header_size' => 'h2',
			'typography_font_size' => array( 'unit' => 'px', 'size' => 22, 'sizes' => array() ),
		) );
		$section_widgets[] = roji_el_text( $sec['body'] );
	}
	$body[] = roji_el_container( array(
		'content_width' => 'boxed',
		'padding' => array( 'top' => '0', 'right' => '20', 'bottom' => '80', 'left' => '20', 'unit' => 'px', 'isLinked' => false ),
		'flex_gap' => array( 'column' => '14', 'row' => '14', 'unit' => 'px', 'isLinked' => true ),
	), $section_widgets );

	return $body;
}

/* -----------------------------------------------------------------------------
 * Page persistence
 * -------------------------------------------------------------------------- */

/**
 * Create or update a page with the given Elementor data.
 *
 * @param array $args {
 *     @type string $slug          Page slug (also the unique key for ID generation).
 *     @type string $title         Post title.
 *     @type array  $content       Top-level array of containers (the _elementor_data).
 *     @type string $template      Page template (default 'elementor_canvas' for full-bleed,
 *                                 'elementor_header_footer' to keep theme header/footer).
 *     @type string $status        Default 'publish'.
 *     @type array  $page_settings Optional Elementor page-level settings.
 * }
 * @return int Post ID.
 */
function roji_el_save_page( array $args ) {
	$slug          = $args['slug'];
	$title         = $args['title'];
	$content       = $args['content'] ?? array();
	$template      = $args['template'] ?? 'elementor_header_footer';
	$status        = $args['status'] ?? 'publish';
	$page_settings = $args['page_settings'] ?? array();

	$existing = get_page_by_path( $slug );
	$post_arr = array(
		'post_title'   => $title,
		'post_name'    => $slug,
		'post_status'  => $status,
		'post_type'    => 'page',
		'post_content' => '', // Elementor reads from meta, not post_content
	);
	if ( $existing ) {
		$post_arr['ID'] = $existing->ID;
		$post_id        = wp_update_post( $post_arr, true );
	} else {
		$post_id = wp_insert_post( $post_arr, true );
	}
	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}

	update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
	update_post_meta( $post_id, '_elementor_template_type', 'wp-page' );
	update_post_meta( $post_id, '_elementor_version', defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : '4.0.3' );
	update_post_meta( $post_id, '_wp_page_template', $template );
	update_post_meta( $post_id, '_elementor_data', wp_slash( wp_json_encode( $content ) ) );

	if ( ! empty( $page_settings ) ) {
		update_post_meta( $post_id, '_elementor_page_settings', $page_settings );
	}

	// Force CSS rebuild on next page view.
	delete_post_meta( $post_id, '_elementor_css' );

	return (int) $post_id;
}

/**
 * Save a page with the dark-mode page background applied via Elementor's
 * page settings. Most Roji pages should use this.
 */
function roji_el_save_dark_page( array $args ) {
	$args['page_settings'] = array_merge(
		array(
			'background_background' => 'classic',
			'background_color'      => '#0a0a0f',
		),
		$args['page_settings'] ?? array()
	);
	return roji_el_save_page( $args );
}
