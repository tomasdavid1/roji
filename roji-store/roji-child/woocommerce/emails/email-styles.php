<?php
/**
 * Roji Child — dark-mode WooCommerce email styles.
 *
 * Overrides woocommerce/templates/emails/email-styles.php. WooCommerce
 * inlines this CSS into every transactional email.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
body {
	background-color: #0a0a0f !important;
	color: #f0f0f5 !important;
	font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	margin: 0;
	padding: 0;
}

#wrapper {
	background-color: #0a0a0f !important;
	margin: 0;
	padding: 40px 0;
	width: 100%;
	-webkit-text-size-adjust: none;
}

#template_container {
	background-color: #16161f !important;
	border: 1px solid rgba(255,255,255,0.06) !important;
	border-radius: 12px !important;
	-webkit-border-radius: 12px !important;
	box-shadow: none !important;
}

#template_header {
	background-color: #111118 !important;
	border-bottom: 1px solid rgba(255,255,255,0.06) !important;
	border-radius: 12px 12px 0 0 !important;
	color: #f0f0f5 !important;
	padding: 24px;
}

#template_header h1,
#template_header h1 a {
	color: #f0f0f5 !important;
	font-family: 'Inter', sans-serif;
	font-weight: 700;
	letter-spacing: -0.02em;
	font-size: 22px;
	margin: 0;
}

#template_header_image img {
	max-height: 48px;
}

#body_content {
	background-color: #16161f !important;
	color: #f0f0f5 !important;
	padding: 24px;
}

#body_content table td {
	color: #f0f0f5 !important;
	border-color: rgba(255,255,255,0.06) !important;
}

#body_content table tr:nth-child(even) td {
	background-color: rgba(255,255,255,0.02) !important;
}

#body_content_inner {
	color: #c8c8d0 !important;
	font-family: 'Inter', sans-serif;
	font-size: 15px;
	line-height: 1.6;
	text-align: left;
}

#body_content_inner p {
	margin: 0 0 16px;
}

h1, h2, h3 {
	color: #f0f0f5 !important;
	font-family: 'Inter', sans-serif;
	font-weight: 600;
	letter-spacing: -0.02em;
}

h2 {
	font-size: 18px;
	margin: 24px 0 12px;
}

a {
	color: #4f6df5 !important;
	text-decoration: none;
}
a:hover {
	color: #6380ff !important;
}

#template_footer td {
	background-color: #0d0d14 !important;
	border-top: 1px solid rgba(255,255,255,0.04) !important;
	border-radius: 0 0 12px 12px;
	padding: 24px;
}

#template_footer #credit {
	color: #55556a !important;
	font-family: 'Inter', sans-serif;
	font-size: 11px;
	line-height: 1.6;
	text-align: center;
}

.address {
	background-color: #111118 !important;
	border: 1px solid rgba(255,255,255,0.06) !important;
	color: #c8c8d0 !important;
	padding: 16px;
	border-radius: 8px;
}

.button,
a.button {
	background-color: #4f6df5 !important;
	color: #ffffff !important;
	border-radius: 8px;
	padding: 12px 22px;
	font-weight: 600;
	display: inline-block;
}
