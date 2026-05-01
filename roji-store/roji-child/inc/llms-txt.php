<?php
/**
 * Serve llms.txt at the site root for AI crawler discovery.
 *
 * Responds to GET /llms.txt with the static file from the child theme.
 * This follows the emerging llms.txt specification — like robots.txt
 * but for LLM crawlers.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'template_redirect', 'roji_serve_llms_txt', 1 );

function roji_serve_llms_txt() {
    if ( ! isset( $_SERVER['REQUEST_URI'] ) ) return;

    $path = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
    if ( $path !== '/llms.txt' ) return;

    $file = get_stylesheet_directory() . '/llms.txt';
    if ( ! file_exists( $file ) ) {
        status_header( 404 );
        echo 'llms.txt not found.';
        exit;
    }

    // WordPress sets the response status to 404 in template_redirect
    // when the URL doesn't match a known post/page. We need to override
    // that to 200 BEFORE we stream the file body — otherwise AI
    // crawlers (and search engines) discard the response, treating it
    // as a 404 with garbage content.
    status_header( 200 );
    // Prevent the WP 404 query state from flagging the page as
    // not-found in case a later filter inspects it.
    global $wp_query;
    if ( isset( $wp_query ) ) {
        $wp_query->is_404 = false;
    }
    header( 'Content-Type: text/plain; charset=utf-8' );
    header( 'Cache-Control: public, max-age=86400' );
    readfile( $file );
    exit;
}
