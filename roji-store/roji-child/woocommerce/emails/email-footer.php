<?php
/**
 * Roji Child — dark email footer.
 *
 * Overrides woocommerce/templates/emails/email-footer.php.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
														</div>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td align="center" valign="top">
								<table border="0" cellpadding="10" cellspacing="0" width="100%" id="template_footer">
									<tr>
										<td valign="top" style="background-color:#0d0d14;border-top:1px solid rgba(255,255,255,0.04);border-radius:0 0 12px 12px;padding:24px;">
											<table border="0" cellpadding="10" cellspacing="0" width="100%">
												<tr>
													<td colspan="2" valign="middle" id="credit" style="color:#55556a;font-family:Inter,sans-serif;font-size:11px;line-height:1.6;text-align:center;">
														<?php echo wp_kses_post( wpautop( wptexturize( apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text' ) ) ) ) ); ?>
														<br /><br />
														<?php
														esc_html_e( 'For research and laboratory use only. Not intended for human dosing or ingestion. Must be 21+.', 'roji-child' );
														?>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</div>
</body>
</html>
