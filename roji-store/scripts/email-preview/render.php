<?php
/**
 * Roji email preview renderer.
 *
 * Renders every customer + admin + branded-HTML transactional email
 * the theme produces, using synthetic order data, into self-contained
 * .html files under preview/emails/.
 *
 * Usage:  php scripts/email-preview/render.php
 *
 * @package roji-preview
 */

require __DIR__ . '/wp-shim.php';

// Boot the real Roji emails module so its filter/action callbacks
// (woocommerce_email_footer_text, woocommerce_email_order_meta,
// roji_email_customer_order_context, etc.) are registered against
// our shim's apply_filters / do_action.
require ROJI_CHILD_DIR . '/inc/emails.php';

// ---------- shared synthetic data ----------
$order = new WC_Order([
    'id'          => 12847,
    'number'      => '12847',
    'first_name'  => 'Alex',
    'last_name'   => 'Mercer',
    'email'       => 'alex.mercer@example.com',
    'status'      => 'completed',
    'total'       => 248.50,
    'subtotal'    => 239.00,
    'shipping'    => 0,
    'tax'         => 9.50,
    'items'       => [
        ['name' => 'Recomp Stack — Tirzepatide 10mg + Retatrutide 10mg', 'qty' => 1, 'total' => 169.00],
        ['name' => 'BPC-157 5mg',                                      'qty' => 2, 'total' => 70.00],
    ],
    'meta' => [
        '_roji_tracking_number' => '9400111202555512345678',
        '_roji_tracking_carrier'=> 'usps',
        '_roji_utm_source'      => 'reddit',
        '_roji_utm_medium'      => 'organic',
        '_roji_utm_campaign'    => 'pro-tier-launch',
        '_roji_aff_ref'         => 'KAI42',
        '_roji_autoship'        => '1',
    ],
]);

$preview_dir = dirname(__DIR__, 2) . '/preview/emails';
@mkdir($preview_dir, 0755, true);

// ---------- helper: render a WC-style template into a full HTML doc ----------
function render_wc_template($template_path, array $vars) {
    extract($vars, EXTR_SKIP);
    $email = new WC_Email_Stub($vars['email']->id ?? 'preview');
    if (!isset($vars['email'])) $vars['email'] = $email;
    $email = $vars['email'];
    ob_start();
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-header.php';
    require $template_path;
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-footer.php';
    return ob_get_clean();
}

function render_branded_html($heading, $html_body) {
    // Mirrors what roji_render_branded_email_html() does in production:
    // WC's core hook calls wc_get_template('emails/email-header.php',
    // ['email_heading' => $heading]) when do_action('woocommerce_email_header', $heading, $email)
    // fires. We replicate that variable scoping here.
    $email_heading = $heading;
    $email         = new WC_Email_Stub('branded_notice');
    ob_start();
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-header.php';
    echo $html_body;
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-footer.php';
    return ob_get_clean();
}

function write_preview($name, $subject, $html, $preview_dir) {
    // Wrap each rendered email in a tiny "client chrome" so the screenshot
    // shows what arrives in an inbox: From, Subject, then the body.
    $wrapped = <<<HTML
<!doctype html><html><head><meta charset="utf-8"><title>{$name}</title>
<style>
  html,body{margin:0;padding:0;background:#1a1a22;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;}
  .client{max-width:780px;margin:24px auto;padding:0 16px;}
  .meta{background:#22222d;border:1px solid rgba(255,255,255,0.06);border-radius:10px 10px 0 0;padding:14px 18px;color:#c8c8d0;font-size:13px;line-height:1.5;}
  .meta .label{color:#8a8a9a;display:inline-block;width:60px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;}
  .meta .v{color:#f0f0f5;}
  .name{display:block;color:#666;font-size:11px;text-align:center;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;font-family:JetBrains Mono,monospace;}
  .body{border:1px solid rgba(255,255,255,0.06);border-top:0;border-radius:0 0 10px 10px;overflow:hidden;}
</style>
</head><body>
<div class="client">
  <span class="name">preview · {$name}</span>
  <div class="meta">
    <div><span class="label">From</span> <span class="v">Roji Peptides &lt;support@rojipeptides.com&gt;</span></div>
    <div><span class="label">To</span> <span class="v">alex.mercer@example.com</span></div>
    <div><span class="label">Subject</span> <span class="v">{$subject}</span></div>
  </div>
  <div class="body">{$html}</div>
</div>
</body></html>
HTML;
    file_put_contents("{$preview_dir}/{$name}.html", $wrapped);
    echo "  ✓ {$name}.html\n";
}

echo "Rendering emails to {$preview_dir}\n";

// ============================================================
// 1. WooCommerce template overrides (customer)
// ============================================================
$base_vars = [
    'order'              => $order,
    'sent_to_admin'      => false,
    'plain_text'         => false,
    'additional_content' => '',
    'email'              => new WC_Email_Stub('customer_processing_order'),
];

$cases = [
    'customer-processing'    => ['file' => 'customer-processing-order.php',  'heading' => 'Thank you for your order',          'subject' => '[Roji Peptides] Your order #12847 is confirmed',           'id' => 'customer_processing_order'],
    'customer-completed'     => ['file' => 'customer-completed-order.php',   'heading' => 'Your order is complete',             'subject' => '[Roji Peptides] Your order #12847 is complete',            'id' => 'customer_completed_order'],
    'customer-on-hold'       => ['file' => 'customer-on-hold-order.php',     'heading' => 'Your order is on hold',              'subject' => '[Roji Peptides] Your order #12847 is on hold',             'id' => 'customer_on_hold_order'],
    'customer-failed'        => ['file' => 'customer-failed-order.php',      'heading' => 'Payment didn\'t go through',         'subject' => '[Roji Peptides] Payment failed for order #12847',          'id' => 'customer_failed_order'],
    'customer-refunded-full' => ['file' => 'customer-refunded-order.php',    'heading' => 'Your order has been refunded',       'subject' => '[Roji Peptides] Your order #12847 has been refunded',      'id' => 'customer_refunded_order',  'extra' => ['partial_refund' => false]],
    'customer-refunded-partial' => ['file' => 'customer-refunded-order.php', 'heading' => 'Partial refund processed',           'subject' => '[Roji Peptides] Partial refund for order #12847',          'id' => 'customer_partially_refunded_order', 'extra' => ['partial_refund' => true]],
    'customer-note'          => ['file' => 'customer-note.php',              'heading' => 'A note about your order',            'subject' => '[Roji Peptides] Note added to order #12847',               'id' => 'customer_note', 'extra' => ['customer_note' => "Heads up — we substituted the BPC-157 vials with a freshly-released batch (B2510-04). The COA is already attached in your account. Same product, newer test date."]],
];

foreach ($cases as $name => $c) {
    $vars = array_merge($base_vars, [
        'email_heading' => $c['heading'],
        'email'         => new WC_Email_Stub($c['id']),
    ], $c['extra'] ?? []);
    $html = render_wc_template(ROJI_CHILD_DIR . '/woocommerce/emails/' . $c['file'], $vars);
    write_preview($name, $c['subject'], $html, $preview_dir);
}

// ============================================================
// 2. WooCommerce template overrides (admin)
// ============================================================
$admin_vars_base = array_merge($base_vars, [
    'sent_to_admin' => true,
]);
$admin_cases = [
    'admin-new-order'       => ['file' => 'admin-new-order.php',       'heading' => 'New order #12847',                  'subject' => '[Roji Peptides] New order #12847',                'id' => 'new_order'],
    'admin-failed-order'    => ['file' => 'admin-failed-order.php',    'heading' => 'Failed order #12847',               'subject' => '[Roji Peptides] Failed order #12847',             'id' => 'failed_order'],
    'admin-cancelled-order' => ['file' => 'admin-cancelled-order.php', 'heading' => 'Cancelled order #12847',            'subject' => '[Roji Peptides] Cancelled order #12847',          'id' => 'cancelled_order'],
];
foreach ($admin_cases as $name => $c) {
    $vars = array_merge($admin_vars_base, [
        'email_heading' => $c['heading'],
        'email'         => new WC_Email_Stub($c['id']),
    ]);
    $html = render_wc_template(ROJI_CHILD_DIR . '/woocommerce/emails/' . $c['file'], $vars);
    write_preview($name, $c['subject'], $html, $preview_dir);
}

// ============================================================
// 3. Account / password (need extra vars)
// ============================================================
$acct_vars = array_merge($base_vars, [
    'email_heading'       => 'Welcome to Roji Peptides',
    'email'               => new WC_Email_Stub('customer_new_account'),
    'user_login'          => 'alex.mercer',
    'user_pass'           => '',
    'blogname'            => 'Roji Peptides',
    'password_generated'  => false,
    'set_password_url'    => '',
]);
$html = render_wc_template(ROJI_CHILD_DIR . '/woocommerce/emails/customer-new-account.php', $acct_vars);
write_preview('customer-new-account', '[Roji Peptides] Welcome — your account is ready', $html, $preview_dir);

$reset_vars = array_merge($base_vars, [
    'email_heading' => 'Reset your password',
    'email'         => new WC_Email_Stub('customer_reset_password'),
    'user_login'    => 'alex.mercer',
    'user_id'       => 4291,
    'reset_key'     => 'rk_4f6df59bc23',
]);
$html = render_wc_template(ROJI_CHILD_DIR . '/woocommerce/emails/customer-reset-password.php', $reset_vars);
write_preview('customer-reset-password', '[Roji Peptides] Reset your password', $html, $preview_dir);

// ============================================================
// 4. Branded HTML (non-WC) — affiliate, dunning, magic-link, shipped
// ============================================================

// 4a. Affiliate: application received
$applicant_html  = '<p style="margin:0 0 14px;">Thanks for applying to the Roji Peptides affiliate program.</p>';
$applicant_html .= '<p style="margin:0 0 14px;">We received your application and reserved referral code <code style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;color:#4f6df5;font-family:JetBrains Mono,monospace;">KAI42</code>.</p>';
$applicant_html .= '<p style="margin:0 0 14px;">Our team reviews partners by hand — watch your inbox for an approval message (typically within 48 hours).</p>';
$applicant_html .= '<p style="margin:0 0 14px;">After approval, your dashboard (stats, link, and payouts) lives here:<br><a href="https://rojipeptides.com/affiliate-dashboard/" style="color:#4f6df5;">https://rojipeptides.com/affiliate-dashboard/</a></p>';
write_preview('affiliate-application-received', '[Roji Peptides] We received your affiliate application', render_branded_html('Application received', $applicant_html), $preview_dir);

// 4b. Affiliate: approval
$ref_link = 'https://rojipeptides.com/?ref=KAI42';
$approval  = '<p style="margin:0 0 14px;">Welcome to the Roji Peptides affiliate program — you\'re approved.</p>';
$approval .= '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">';
$approval .= '<tr><td style="padding:18px 20px;">';
$approval .= '<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;margin-bottom:6px;">Referral code</div>';
$approval .= '<div style="font-family:JetBrains Mono,monospace;font-size:18px;color:#4f6df5;margin-bottom:14px;">KAI42</div>';
$approval .= '<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;margin-bottom:6px;">Share link</div>';
$approval .= '<div style="font-family:JetBrains Mono,monospace;font-size:13px;color:#f0f0f5;word-break:break-all;">' . $ref_link . '</div>';
$approval .= '</td></tr></table>';
$approval .= '<p style="margin:0 0 12px;font-weight:600;color:#f0f0f5;">Your tier ladder</p>';
$approval .= '<ul style="margin:0 0 18px;padding-left:18px;color:#c8c8d0;line-height:1.8;">';
$approval .= '<li>Default: <strong style="color:#f0f0f5;">15%</strong> on first orders.</li>';
$approval .= '<li>Lifetime gross ≥ <strong style="color:#f0f0f5;">$5,000</strong>: bumps to <strong style="color:#4ade80;">20%</strong>.</li>';
$approval .= '<li>Lifetime gross ≥ <strong style="color:#f0f0f5;">$25,000</strong>: bumps to <strong style="color:#4ade80;">25%</strong>.</li>';
$approval .= '<li>Subscription renewals pay <strong style="color:#f0f0f5;">50%</strong> of your tier rate, forever.</li>';
$approval .= '</ul>';
$approval .= '<p style="margin:18px 0;"><a href="https://rojipeptides.com/affiliate-dashboard/" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Open your dashboard →</a></p>';
write_preview('affiliate-approval', '[Roji Peptides] You\'re in — affiliate program approved', render_branded_html('You\'re approved', $approval), $preview_dir);

// 4c. Affiliate: magic link
$link = 'https://rojipeptides.com/affiliate-dashboard/?roji_aff_token=8f4a7c2e9d1b3e5a6c0f8d2b4e7a9c1d';
$magic  = '<p style="margin:0 0 14px;">Click the button below to sign in to your affiliate dashboard. The link expires in 60 minutes and can only be used once.</p>';
$magic .= '<p style="margin:18px 0;"><a href="' . $link . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Sign in to dashboard →</a></p>';
$magic .= '<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;">Or paste this link into your browser:<br><span style="word-break:break-all;color:#c8c8d0;">' . $link . '</span></p>';
$magic .= '<p style="margin:0;font-size:13px;color:#8a8a9a;">If you didn\'t request this, you can safely ignore this message — no one can sign in without the link above.</p>';
write_preview('affiliate-magic-link', '[Roji Peptides] Your affiliate dashboard sign-in link', render_branded_html('Sign in to your dashboard', $magic), $preview_dir);

// 4d. Affiliate: payout sent
$payout  = '<p style="margin:0 0 14px;">Hi Kai,</p>';
$payout .= '<p style="margin:0 0 14px;">We just paid out <strong>14</strong> commissions, totaling:</p>';
$payout .= '<div style="font-family:JetBrains Mono,monospace;font-size:28px;color:#4ade80;margin:0 0 18px;">$1,247.50</div>';
$payout .= '<p style="margin:0 0 14px;color:#8a8a9a;font-size:13px;">Payment reference: <code style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;">CB_INV_2026-04-29</code></p>';
$payout .= '<p style="margin:18px 0;"><a href="https://rojipeptides.com/affiliate-dashboard/" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">View commission details →</a></p>';
$payout .= '<p style="margin:0;color:#c8c8d0;font-size:14px;">Thanks for sending people our way.</p>';
write_preview('affiliate-payout-sent', '[Roji Peptides] Commission payout sent — $1,247.50', render_branded_html('Payout sent', $payout), $preview_dir);

// 4e. Dunning: payment failed (initial)
$dun_url = 'https://rojipeptides.com/my-account/subscriptions/';
$dun  = '<p style="margin:0 0 14px;">Quick heads up — your last subscription renewal payment didn\'t go through. We\'ll automatically retry, but you can fix it now in 30 seconds:</p>';
$dun .= '<p style="margin:18px 0;"><a href="' . $dun_url . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Update payment method →</a></p>';
$dun .= '<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;">If you\'ve already fixed this, you can ignore this message.</p>';
write_preview('dunning-payment-failed', '[Roji Peptides] Action needed: payment failed for your subscription', render_branded_html('Action needed: payment failed', $dun), $preview_dir);

// 4f. Dunning: subscription paused (final)
$dunf  = '<p style="margin:0 0 14px;">We tried to charge your card a few times and it didn\'t go through. To avoid interrupting your protocol, please update your payment method:</p>';
$dunf .= '<p style="margin:18px 0;"><a href="' . $dun_url . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Update payment method →</a></p>';
$dunf .= '<p style="margin:0 0 14px;font-size:13px;color:#8a8a9a;">If you\'ve already fixed this, you can ignore this message.</p>';
write_preview('dunning-subscription-paused', '[Roji Peptides] Your subscription is paused — update payment to resume', render_branded_html('Subscription paused', $dunf), $preview_dir);

// 4g. Order shipped (mirrors roji_send_order_shipped_email)
$ship  = '<p style="margin:0 0 14px;">Hi Alex,</p>';
$ship .= '<p style="margin:0 0 14px;">Your order <strong>#12847</strong> has shipped. Standard transit is 2–5 business days from dispatch.</p>';
$ship .= '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">';
$ship .= '<tr><td style="padding:18px 20px;color:#c8c8d0;font-family:Inter,sans-serif;font-size:14px;line-height:1.6;">';
$ship .= '<div style="font-family:JetBrains Mono,monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#55556a;">Tracking</div>';
$ship .= '<div style="font-family:JetBrains Mono,monospace;font-size:15px;color:#f0f0f5;margin:6px 0 12px;">9400111202555512345678</div>';
$ship .= '<a href="https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9400111202555512345678" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:13px;">Track shipment →</a>';
$ship .= '</td></tr></table>';
$ship .= '<p style="margin:0 0 14px;">Reminder: your batch ships with a third-party Janoshik COA. View it any time from <a href="https://rojipeptides.com/my-account/" style="color:#4f6df5;">your account</a>.</p>';
$ship .= '<p style="margin:18px 0 0;color:#8a8a9a;font-size:13px;">For research and laboratory use only. Not for human consumption.</p>';
write_preview('order-shipped', '[Roji Peptides] Your order #12847 has shipped', render_branded_html('Your order has shipped', $ship), $preview_dir);

echo "\nDone. Open them via:\n  open " . $preview_dir . "/customer-completed.html\n";
