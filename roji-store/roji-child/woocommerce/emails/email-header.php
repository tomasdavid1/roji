<?php
/**
 * Roji Child — dark email header.
 *
 * Overrides woocommerce/templates/emails/email-header.php.
 *
 * @package roji-child
 *
 * @var string $email_heading Email heading text.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	<title><?php echo get_bloginfo( 'name', 'display' ); ?></title>
</head>
<body <?php echo is_rtl() ? 'rightmargin' : 'leftmargin'; ?>="0" topmargin="0" marginwidth="0" marginheight="0" offset="0" style="background-color:#0a0a0f;">
	<div id="wrapper" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>" style="background-color:#0a0a0f;">
		<table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
			<tr>
				<td align="center" valign="top">
					<div id="template_header_image">
						<?php
						$img = get_option( 'woocommerce_email_header_image' );
						if ( $img ) {
							echo '<p style="margin-top:0;"><img src="' . esc_url( $img ) . '" alt="' . esc_attr( get_bloginfo( 'name', 'display' ) ) . '" style="max-height:48px;" /></p>';
						}
						?>
					</div>
					<table border="0" cellpadding="0" cellspacing="0" width="600" id="template_container" style="background-color:#16161f;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
						<tr>
							<td align="center" valign="top">
								<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_header" style="background-color:#111118;border-radius:12px 12px 0 0;border-bottom:1px solid rgba(255,255,255,0.06);">
									<tr>
										<td id="header_wrapper" style="padding:24px;color:#f0f0f5;">
											<h1 style="color:#f0f0f5;font-family:Inter,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;margin:0;text-align:left;"><?php echo esc_html( $email_heading ); ?></h1>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td align="center" valign="top">
								<table border="0" cellpadding="0" cellspacing="0" width="100%" id="template_body">
									<tr>
										<td valign="top" id="body_content" style="background-color:#16161f;">
											<table border="0" cellpadding="20" cellspacing="0" width="100%">
												<tr>
													<td valign="top" style="padding:24px;">
														<div id="body_content_inner" style="color:#c8c8d0;font-family:Inter,sans-serif;font-size:15px;line-height:1.6;text-align:left;">
