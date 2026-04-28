<?php
/**
 * Roji Child — stylesheet and font enqueue.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Load Hello Elementor parent + Roji child stylesheets, plus Google Fonts.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style(
			'hello-elementor',
			get_template_directory_uri() . '/style.css',
			array(),
			null
		);

		wp_enqueue_style(
			'roji-fonts',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
			array(),
			null
		);

		wp_enqueue_style(
			'roji-child',
			get_stylesheet_uri(),
			array( 'hello-elementor', 'roji-fonts' ),
			ROJI_CHILD_VERSION
		);

		// Optional Elementor overrides — loaded only when Elementor is active.
		if ( did_action( 'elementor/loaded' ) ) {
			wp_enqueue_style(
				'roji-elementor-overrides',
				ROJI_CHILD_URI . '/assets/css/elementor-overrides.css',
				array( 'roji-child' ),
				ROJI_CHILD_VERSION
			);
		}
	},
	20
);

/**
 * Preconnect to Google Fonts for faster loads.
 */
add_action(
	'wp_head',
	function () {
		echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
		echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	},
	1
);
