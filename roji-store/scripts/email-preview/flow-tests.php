<?php
/**
 * Roji members + email flow tests.
 *
 * Lightweight unit tests that exercise the pure-PHP logic of the
 * members area (auth gate, account link visibility) and the email
 * helpers (subject formatting, carrier URL builder, branded HTML
 * wrapper) in isolation.
 *
 * Run:  php scripts/email-preview/flow-tests.php
 *
 * @package roji-preview
 */

require __DIR__ . '/wp-shim.php';

// Stubs that the modules under test call. Toggle these per-test.
$GLOBALS['__user_logged_in'] = false;
$GLOBALS['__caps']           = [];

function is_user_logged_in()       { return (bool) ($GLOBALS['__user_logged_in'] ?? false); }
function current_user_can($cap)    { return in_array($cap, $GLOBALS['__caps'] ?? [], true); }
function is_account_page()         { return (bool) ($GLOBALS['__is_account_page'] ?? false); }
function wp_safe_redirect($url)    { $GLOBALS['__last_redirect'] = $url; throw new RuntimeException("REDIRECT:{$url}"); }
function wp_unslash($v)            { return is_string($v) ? stripslashes($v) : $v; }
function sanitize_key($v)          { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$v)); }
function get_page_by_path($s)      { return null; }
function wp_insert_post($a)        { return 9999; }
function get_post_status($id)      { return 'publish'; }
function function_exists_($n)      { return function_exists($n); }
function add_rewrite_endpoint(...$a){ return null; }
function add_shortcode(...$a)      { return null; }
function update_option(...$a)      { return true; }
function delete_option(...$a)      { return true; }
function flush_rewrite_rules(...$a){ return true; }
function wc_get_page_id($k)        { return 42; }
function _n($s, $p, $n) { return $n === 1 ? $s : $p; }
function esc_attr__($t) { return esc_attr(__($t)); }

// ROJI_CHILD config + emails
define('ROJI_MEMBERS_AUTH_UNDER_CONSTRUCTION', true);
define('ROJI_TRANSACTIONAL_FROM_EMAIL', '');
require ROJI_CHILD_DIR . '/inc/emails.php';
require ROJI_CHILD_DIR . '/inc/members-account.php';
require ROJI_CHILD_DIR . '/inc/header-cart.php';

// ---------- tiny test runner ----------
$pass = 0; $fail = 0; $failures = [];
function test(string $name, callable $fn) {
    global $pass, $fail, $failures;
    try {
        $fn();
        echo "  \033[32m✓\033[0m {$name}\n";
        $pass++;
    } catch (Throwable $e) {
        echo "  \033[31m✗\033[0m {$name}\n      → " . $e->getMessage() . "\n";
        $fail++;
        $failures[] = "{$name}: {$e->getMessage()}";
    }
}
function assertSame_($exp, $act, $msg = '') {
    if ($exp !== $act) {
        $e = var_export($exp, true); $a = var_export($act, true);
        throw new RuntimeException("expected {$e}, got {$a}" . ($msg ? " — {$msg}" : ''));
    }
}
function assertContains_($needle, $haystack, $msg = '') {
    if (strpos($haystack, $needle) === false) {
        throw new RuntimeException("expected to contain '{$needle}'" . ($msg ? " — {$msg}" : ''));
    }
}
function assertNotContains_($needle, $haystack, $msg = '') {
    if (strpos($haystack, $needle) !== false) {
        throw new RuntimeException("expected to NOT contain '{$needle}'" . ($msg ? " — {$msg}" : ''));
    }
}
function assertTrue_($v, $msg = '') { if (!$v) throw new RuntimeException("expected true{$msg}"); }
function assertFalse_($v, $msg = '') { if ($v) throw new RuntimeException("expected false{$msg}"); }

echo "\n\033[1mRoji members + email flow tests\033[0m\n\n";

// ============================================================
// 1. Auth gate — public visibility / staff bypass
// ============================================================
echo "[1] Auth gate (members area under construction)\n";

test('roji_members_auth_under_construction() reflects constant', function () {
    assertTrue_(roji_members_auth_under_construction());
});

test('Logged-out shopper without admin caps → cannot bypass', function () {
    $GLOBALS['__user_logged_in'] = false;
    $GLOBALS['__caps']           = [];
    assertFalse_(roji_members_can_bypass_auth_gate());
});

test('Shop manager (manage_woocommerce) → bypasses gate', function () {
    $GLOBALS['__caps'] = ['manage_woocommerce'];
    assertTrue_(roji_members_can_bypass_auth_gate());
});

test('Admin (manage_options) → bypasses gate', function () {
    $GLOBALS['__caps'] = ['manage_options'];
    assertTrue_(roji_members_can_bypass_auth_gate());
});

test('Coming-soon URL is canonical', function () {
    assertSame_('https://rojipeptides.com/members-coming-soon/', roji_members_coming_soon_url());
});

test('Logged-out shopper hitting /my-account → redirected to coming-soon', function () {
    $GLOBALS['__user_logged_in']  = false;
    $GLOBALS['__caps']            = [];
    $GLOBALS['__is_account_page'] = true;
    try {
        do_action('template_redirect');
        throw new RuntimeException('expected redirect');
    } catch (RuntimeException $e) {
        if (strpos($e->getMessage(), 'REDIRECT:') !== 0) throw $e;
        assertSame_('REDIRECT:https://rojipeptides.com/members-coming-soon/', $e->getMessage());
    }
});

test('Logged-in customer hitting /my-account → no redirect', function () {
    $GLOBALS['__user_logged_in']  = true;
    $GLOBALS['__caps']            = [];
    $GLOBALS['__is_account_page'] = true;
    do_action('template_redirect'); // should NOT throw
});

test('Shop manager (logged out) hitting /my-account → bypasses', function () {
    $GLOBALS['__user_logged_in']  = false;
    $GLOBALS['__caps']            = ['manage_woocommerce'];
    $GLOBALS['__is_account_page'] = true;
    do_action('template_redirect'); // should NOT throw
});

test('login_init redirects logged-out users', function () {
    $GLOBALS['__user_logged_in'] = false;
    $GLOBALS['__caps']           = [];
    $_REQUEST = [];
    try {
        do_action('login_init');
        throw new RuntimeException('expected redirect');
    } catch (RuntimeException $e) {
        if (strpos($e->getMessage(), 'REDIRECT:') !== 0) throw $e;
    }
});

test('login_init exempts logout/rp/resetpass actions', function () {
    foreach (['logout', 'rp', 'resetpass'] as $act) {
        $GLOBALS['__user_logged_in'] = false;
        $GLOBALS['__caps']           = [];
        $_REQUEST = ['action' => $act];
        do_action('login_init'); // must NOT throw
    }
    $_REQUEST = [];
});

// ============================================================
// 2. Header account link visibility
// ============================================================
echo "\n[2] Header account link visibility\n";

test('Logged-out + gate ON → no account link in header', function () {
    $GLOBALS['__user_logged_in'] = false;
    $html = roji_header_account_link_html();
    assertSame_('', $html);
});

test('Logged-in + gate ON → "Account" link rendered with icon', function () {
    $GLOBALS['__user_logged_in'] = true;
    $html = roji_header_account_link_html();
    assertContains_('roji-account-link', $html);
    assertContains_('Account', $html);
    assertContains_('<svg', $html);
});

// ============================================================
// 3. Email "From" identity
// ============================================================
echo "\n[3] Email \"From\" identity\n";

test('From name = ROJI_BRAND_NAME', function () {
    assertSame_('Roji Peptides', roji_transactional_from_name());
});

test('From email falls back to admin_email', function () {
    assertSame_('support@rojipeptides.com', roji_transactional_from_email());
});

test('woocommerce_email_from_name filter is registered with high priority', function () {
    $h = $GLOBALS['wp_filters']['woocommerce_email_from_name'] ?? [];
    assertTrue_(!empty($h[99]));
});

test('woocommerce_email_footer_text default supplied when blank', function () {
    $out = apply_filters('woocommerce_email_footer_text', '');
    assertContains_('research-grade peptides', $out);
    assertContains_('COA', $out);
});

test('woocommerce_email_footer_text passes through admin overrides', function () {
    $out = apply_filters('woocommerce_email_footer_text', 'Custom footer XYZ');
    assertSame_('Custom footer XYZ', $out);
});

test('RFC2047 encode passes ASCII names through unchanged', function () {
    assertSame_('Roji Peptides', roji_encode_rfc2047_name('Roji Peptides'));
});

test('RFC2047 encode wraps non-ASCII names', function () {
    $out = roji_encode_rfc2047_name('Rōji Péptides');
    assertContains_('=?UTF-8?B?', $out);
});

// ============================================================
// 4. Carrier tracking URL builder
// ============================================================
echo "\n[4] Carrier tracking URL\n";

test('USPS carrier produces tools.usps.com URL', function () {
    $u = roji_carrier_tracking_url('usps', '9400111202555512345678');
    assertContains_('tools.usps.com', $u);
    assertContains_('9400111202555512345678', $u);
});
test('UPS carrier', function () {
    assertContains_('ups.com/track', roji_carrier_tracking_url('ups', '1Z999AA10123456784'));
});
test('FedEx carrier', function () {
    assertContains_('fedex.com/fedextrack', roji_carrier_tracking_url('fedex', '123456789012'));
});
test('DHL carrier', function () {
    assertContains_('dhl.com/global-en/home/tracking', roji_carrier_tracking_url('dhl', 'JD0123456789'));
});
test('Unknown carrier returns empty (so we just print the number, no broken link)', function () {
    assertSame_('', roji_carrier_tracking_url('royal-mail', 'X123'));
    assertSame_('', roji_carrier_tracking_url('', '12345'));
});
test('Carrier matching is case-insensitive', function () {
    $u = roji_carrier_tracking_url('USPS', '9400111202555512345678');
    assertContains_('tools.usps.com', $u);
});
test('Tracking number is URL-encoded', function () {
    $u = roji_carrier_tracking_url('usps', 'AB CD/12');
    assertContains_('AB%20CD%2F12', $u);
});

// ============================================================
// 5. Branded HTML email shell
// ============================================================
echo "\n[5] Branded HTML email shell\n";

// Register a shim of WC's core email_header / email_footer handlers so the
// branded-HTML renderer can produce a full email shell in tests. In real
// WP these are added by WC_Emails::__construct() at boot.
add_action('woocommerce_email_header', function ($email_heading, $email) {
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-header.php';
}, 10, 2);
add_action('woocommerce_email_footer', function ($email) {
    require ROJI_CHILD_DIR . '/woocommerce/emails/email-footer.php';
}, 10, 1);

test('roji_render_branded_email_html produces a body containing the markup we pass in', function () {
    $html = roji_render_branded_email_html('Welcome', '<p>Body</p>');
    assertContains_('<p>Body</p>', $html);
});

test('Branded HTML carries the dark wordmark fallback when no logo set', function () {
    $html = roji_render_branded_email_html('Welcome', '<p>Body</p>');
    // The header template emits the CSS wordmark when woocommerce_email_header_image is empty
    assertContains_('roji', $html);
    assertContains_('research peptides', $html);
});

test('Branded HTML carries the email heading bar', function () {
    $html = roji_render_branded_email_html('Application received', '<p>x</p>');
    assertContains_('Application received', $html);
});

test('Branded HTML carries footer with research-use disclaimer', function () {
    $html = roji_render_branded_email_html('Heading', '<p>x</p>');
    assertContains_('For research and laboratory use only', $html);
});

test('Branded HTML wraps body in dark email shell', function () {
    $html = roji_render_branded_email_html('Heading', '<p>BODY-CONTENT-MARKER</p>');
    assertContains_('background-color:#0a0a0f', $html, 'expected dark background');
    assertContains_('BODY-CONTENT-MARKER', $html);
});

// ============================================================
// 6. Customer order context filter
// ============================================================
echo "\n[6] Customer order context (refunds / invoice lede)\n";

test('Refund email gets refund-specific lede', function () {
    $order = new WC_Order(['number' => '999']);
    $email = new WC_Email_Stub('customer_refunded_order');
    ob_start();
    roji_email_customer_order_context($order, false, false, $email);
    $out = ob_get_clean();
    assertContains_('refund', strtolower($out));
});

test('Invoice email gets invoice-specific lede', function () {
    $order = new WC_Order(['number' => '999']);
    $email = new WC_Email_Stub('customer_invoice');
    ob_start();
    roji_email_customer_order_context($order, false, false, $email);
    $out = ob_get_clean();
    assertContains_('summary', strtolower($out));
});

test('Plain-text emails are not modified', function () {
    $order = new WC_Order(['number' => '999']);
    $email = new WC_Email_Stub('customer_refunded_order');
    ob_start();
    roji_email_customer_order_context($order, false, true /* plain_text */, $email);
    assertSame_('', ob_get_clean());
});

test('Admin emails are not modified', function () {
    $order = new WC_Order(['number' => '999']);
    $email = new WC_Email_Stub('customer_refunded_order');
    ob_start();
    roji_email_customer_order_context($order, true /* admin */, false, $email);
    assertSame_('', ob_get_clean());
});

test('Unrelated emails (processing) get no extra lede from this hook', function () {
    $order = new WC_Order(['number' => '999']);
    $email = new WC_Email_Stub('customer_processing_order');
    ob_start();
    roji_email_customer_order_context($order, false, false, $email);
    assertSame_('', ob_get_clean());
});

// ============================================================
// 7. Order shipped email — guard rails
// ============================================================
echo "\n[7] Order shipped email guards\n";

test('Shipped email skipped when no tracking number', function () {
    $order = new WC_Order(['email' => 'a@b.com', 'meta' => []]);
    $sent_marker_before = $order->get_meta('_roji_shipped_email_sent');
    roji_send_order_shipped_email($order);
    assertSame_('', $order->get_meta('_roji_shipped_email_sent'));
});

test('Shipped email skipped when no billing email', function () {
    $order = new WC_Order(['email' => '', 'meta' => ['_roji_tracking_number' => 'X123']]);
    roji_send_order_shipped_email($order);
    assertSame_('', $order->get_meta('_roji_shipped_email_sent'));
});

test('Shipped email is idempotent (skipped if already sent)', function () {
    $order = new WC_Order(['email' => 'a@b.com', 'meta' => [
        '_roji_tracking_number'    => 'X123',
        '_roji_shipped_email_sent' => 'yes',
    ]]);
    // wp_mail isn't defined → if the function tries to send, it'd fatal.
    // The "already sent" guard must short-circuit BEFORE that.
    roji_send_order_shipped_email($order);
});

// ============================================================
// 8. Affiliate endpoint registration
// ============================================================
echo "\n[8] Affiliate endpoint\n";

test('ROJI_ACCOUNT_AFFILIATE_ENDPOINT constant defined', function () {
    assertSame_('affiliate', ROJI_ACCOUNT_AFFILIATE_ENDPOINT);
});

test('Affiliate menu item appears between profile + logout', function () {
    $items = ['dashboard' => 'Dashboard', 'orders' => 'Orders', 'edit-account' => 'Account', 'customer-logout' => 'Logout'];
    $out   = apply_filters('woocommerce_account_menu_items', $items);
    $keys  = array_keys($out);
    // Affiliate must exist and logout must be last
    assertTrue_(in_array('affiliate', $keys, true));
    assertSame_('customer-logout', end($keys));
});

// ============================================================
// Summary
// ============================================================
echo "\n";
echo str_repeat('─', 60) . "\n";
echo "\033[1m{$pass} passed";
if ($fail) echo ", \033[31m{$fail} failed\033[0m";
echo "\033[0m\n";
exit($fail ? 1 : 0);
