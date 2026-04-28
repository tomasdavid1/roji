<?php
/**
 * Smoke-test page — used during development to verify the builder
 * produces Elementor-renderable output.
 */
roji_el_set_page_key( 'smoke' );

return array(
	'title'   => 'Roji Smoke Test',
	'content' => array(
		roji_el_container( array(), array(
			roji_el_heading( 'It works.', array( 'header_size' => 'h1', 'align' => 'center' ) ),
			roji_el_text( '<p style="text-align:center;">If you can see this on a real Elementor-rendered page, the importer is wired correctly.</p>' ),
			roji_el_inner( array( 'flex_direction' => 'row', 'flex_gap' => array( 'column' => '12', 'row' => '12', 'unit' => 'px', 'isLinked' => true ) ), array(
				roji_el_button( 'Primary', '#' ),
				roji_el_button_secondary( 'Secondary', '#' ),
			) ),
			roji_el_grid( array(
				roji_el_card( array( roji_el_heading( 'Card 1', array( 'header_size' => 'h3' ) ), roji_el_text( '<p>Card body text.</p>' ) ) ),
				roji_el_card( array( roji_el_heading( 'Card 2', array( 'header_size' => 'h3' ) ), roji_el_text( '<p>Card body text.</p>' ) ) ),
				roji_el_card( array( roji_el_heading( 'Card 3', array( 'header_size' => 'h3' ) ), roji_el_text( '<p>Card body text.</p>' ) ) ),
			), 3 ),
		) ),
	),
);
