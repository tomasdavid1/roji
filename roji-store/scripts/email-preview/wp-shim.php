<?php
/**
 * Minimal WordPress / WooCommerce shim for offline email preview.
 *
 * This is NOT a substitute for a real WP environment — it implements
 * only the surface area the Roji email templates actually touch.
 *
 * If a template calls something we don't stub, we'll get a clean PHP
 * fatal pointing right at it and we add a stub.
 *
 * @package roji-preview
 */

// ---------- Constants the theme expects ----------
if (!defined('ABSPATH'))             define('ABSPATH', __DIR__ . '/');
if (!defined('ROJI_BRAND_NAME'))     define('ROJI_BRAND_NAME', 'Roji Peptides');
if (!defined('ROJI_CHILD_DIR'))      define('ROJI_CHILD_DIR', dirname(__DIR__, 2) . '/roji-child');
if (!defined('ROJI_TOOLS_URL'))      define('ROJI_TOOLS_URL', 'https://tools.rojipeptides.com');
if (!defined('HOUR_IN_SECONDS'))     define('HOUR_IN_SECONDS', 3600);
if (!defined('ENT_QUOTES'))          /* always defined */ ;

// ---------- WP escaping / formatting primitives ----------
function esc_html($t)   { return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8'); }
function esc_attr($t)   { return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8'); }
function esc_url($u)    { return htmlspecialchars((string)$u, ENT_QUOTES, 'UTF-8'); }
function esc_html__($t) { return esc_html($t); }
function esc_html_e($t) { echo esc_html($t); }
function __($t)         { return $t; }
function _x($t)         { return $t; }
function _e($t)         { echo $t; }
function sanitize_email($e) { return filter_var((string)$e, FILTER_SANITIZE_EMAIL) ?: ''; }
function sanitize_text_field($t) { return trim(strip_tags((string)$t)); }
function wp_kses_post($s)   { return $s; }
function wpautop($s)        { return '<p>' . str_replace("\n\n", "</p>\n<p>", trim((string)$s)) . '</p>'; }
function wptexturize($s)    { return $s; }
function make_clickable($s) { return $s; }
function wp_strip_all_tags($s) { return strip_tags((string)$s); }
function wp_specialchars_decode($s, $q = null) { return htmlspecialchars_decode((string)$s, ENT_QUOTES); }
function wp_parse_url($u, $component = -1) { return parse_url((string)$u, $component); }
function selected($sel, $val) { return $sel === $val ? ' selected' : ''; }
function language_attributes() { echo 'lang="en-US"'; }
function is_rtl() { return false; }
function is_email($e) { return (bool) filter_var((string)$e, FILTER_VALIDATE_EMAIL); }
function rawurlencode_($s) { return rawurlencode((string)$s); }
function add_query_arg($args, $url = null) {
    if (is_string($args)) { $args = [$args => func_get_arg(1)]; $url = func_num_args() > 2 ? func_get_arg(2) : ''; }
    $url  = (string)$url;
    $sep  = strpos($url, '?') === false ? '?' : '&';
    $pair = http_build_query($args);
    return $url . $sep . $pair;
}

// ---------- Site identity ----------
function home_url($p = '/') { return 'https://rojipeptides.com' . (str_starts_with($p, '/') ? $p : '/' . $p); }
function get_bloginfo($k = 'name', $f = 'raw') {
    if ($k === 'name') return 'Roji Peptides';
    if ($k === 'admin_email') return 'support@rojipeptides.com';
    return '';
}
function get_option($k, $d = '') {
    if ($k === 'admin_email') return 'support@rojipeptides.com';
    if ($k === 'blogname')    return 'Roji Peptides';
    if ($k === 'woocommerce_email_header_image') return '';
    if ($k === 'woocommerce_email_footer_text')  return '';
    if ($k === 'woocommerce_registration_generate_password') return 'no';
    return $d;
}

// ---------- Hooks (very lightweight) ----------
$GLOBALS['wp_filters']  = [];
$GLOBALS['wp_actions']  = [];

function add_filter($tag, $cb, $prio = 10, $args = 1) {
    $GLOBALS['wp_filters'][$tag][$prio][] = ['cb' => $cb, 'args' => $args];
    return true;
}
function add_action($tag, $cb, $prio = 10, $args = 1) {
    $GLOBALS['wp_actions'][$tag][$prio][] = ['cb' => $cb, 'args' => $args];
    return true;
}
function apply_filters($tag, $value, ...$rest) {
    if (empty($GLOBALS['wp_filters'][$tag])) return $value;
    $hooks = $GLOBALS['wp_filters'][$tag];
    ksort($hooks);
    foreach ($hooks as $list) {
        foreach ($list as $h) {
            $args = array_merge([$value], $rest);
            $args = array_slice($args, 0, $h['args']);
            $value = call_user_func_array($h['cb'], $args);
        }
    }
    return $value;
}
function do_action($tag, ...$rest) {
    if (empty($GLOBALS['wp_actions'][$tag])) return;
    $hooks = $GLOBALS['wp_actions'][$tag];
    ksort($hooks);
    foreach ($hooks as $list) {
        foreach ($list as $h) {
            $args = array_slice($rest, 0, $h['args']);
            call_user_func_array($h['cb'], $args);
        }
    }
}

// ---------- WooCommerce helpers ----------
function wc_get_page_permalink($k) {
    return $k === 'myaccount' ? 'https://rojipeptides.com/my-account/' : 'https://rojipeptides.com/';
}
function wc_get_endpoint_url($endpoint, $value = '', $base = '') {
    return rtrim($base ?: home_url('/my-account/'), '/') . '/' . $endpoint . '/' . ($value !== '' ? $value . '/' : '');
}
function wc_price($amount, $args = []) {
    return '$' . number_format((float)$amount, 2);
}
function get_woocommerce_currency_symbol() { return '$'; }

// ---------- Fake WC_Order / WC_Email ----------
class WC_Order {
    private array $data;
    public function __construct(array $data) { $this->data = $data; }
    public function get_id()                  { return $this->data['id'] ?? 12345; }
    public function get_order_number()        { return (string)($this->data['number'] ?? '12345'); }
    public function get_billing_first_name()  { return $this->data['first_name'] ?? 'Alex'; }
    public function get_billing_last_name()   { return $this->data['last_name'] ?? 'Mercer'; }
    public function get_billing_email()       { return $this->data['email'] ?? 'alex@example.com'; }
    public function get_formatted_billing_full_name() { return ($this->data['first_name'] ?? 'Alex') . ' ' . ($this->data['last_name'] ?? 'Mercer'); }
    public function get_status()              { return $this->data['status'] ?? 'processing'; }
    public function get_meta($k, $single = true) {
        return $this->data['meta'][$k] ?? '';
    }
    public function update_meta_data($k, $v) { $this->data['meta'][$k] = $v; }
    public function save() { return true; }
    public function add_order_note($n) { return true; }
    public function get_checkout_payment_url() { return 'https://rojipeptides.com/checkout/order-pay/12345/?pay_for_order=true&key=wc_order_abc'; }
    public function get_view_order_url() { return 'https://rojipeptides.com/my-account/view-order/12345/'; }
    public function get_items() { return $this->data['items'] ?? []; }
    public function get_total() { return $this->data['total'] ?? 248.50; }
    public function get_subtotal() { return $this->data['subtotal'] ?? 239.00; }
    public function get_shipping_total() { return $this->data['shipping'] ?? 0; }
    public function get_total_tax() { return $this->data['tax'] ?? 9.50; }
    public function get_currency() { return 'USD'; }
    public function get_payment_method_title() { return 'Credit Card (Stripe)'; }
    public function get_formatted_billing_address() { return "Alex Mercer<br/>123 Lab Lane<br/>Brooklyn, NY 11201<br/>United States"; }
    public function get_formatted_shipping_address() { return $this->get_formatted_billing_address(); }
    public function get_billing_phone() { return '+1 (555) 010-2034'; }
    public function get_date_created() { return new DateTime('now', new DateTimeZone('UTC')); }
}

class WC_Email_Stub {
    public string $id;
    public function __construct(string $id = 'stub') { $this->id = $id; }
    public function style_inline($html) { return $html; }
}
if (!class_exists('WC_Email')) {
    // Real WC_Email declares these public props; declare them here so PHP 8.2
    // doesn't emit deprecation warnings when subclasses (Roji_Branded_Notice_Email)
    // assign them in __construct.
    class WC_Email extends WC_Email_Stub {
        public string $title = '';
        public bool   $customer_email = false;
        public string $email_type = 'html';
        public function __construct() { /* parent stub */ }
    }
}

// ---------- Order details / meta / customer details renderers ----------
// These mimic what WC outputs in the order email body; we intercept the
// hooks the templates call and emit clean, brand-styled HTML so the preview
// looks like the real thing.
function roji_preview_render_order_details($order, $sent_to_admin, $plain_text, $email) {
    if ($plain_text) return;
    $items = $order->get_items();
    ?>
    <h2 style="font-family:Inter,sans-serif;font-size:18px;font-weight:600;color:#f0f0f5;margin:24px 0 12px;letter-spacing:-0.02em;">Order #<?php echo esc_html($order->get_order_number()); ?></h2>
    <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;font-size:14px;color:#c8c8d0;border:1px solid rgba(255,255,255,0.06);border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#111118;">
          <th style="text-align:left;padding:12px 14px;color:#f0f0f5;font-weight:600;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.06);">Product</th>
          <th style="text-align:right;padding:12px 14px;color:#f0f0f5;font-weight:600;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.06);">Total</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($items as $item): ?>
          <tr>
            <td style="padding:14px;border-bottom:1px solid rgba(255,255,255,0.04);"><?php echo esc_html($item['name']); ?> <span style="color:#55556a;">× <?php echo (int)$item['qty']; ?></span></td>
            <td style="padding:14px;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);font-family:JetBrains Mono,monospace;color:#f0f0f5;"><?php echo wc_price($item['total']); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
      <tfoot>
        <tr><td style="padding:10px 14px;text-align:right;color:#8a8a9a;">Subtotal</td><td style="padding:10px 14px;text-align:right;font-family:JetBrains Mono,monospace;color:#c8c8d0;"><?php echo wc_price($order->get_subtotal()); ?></td></tr>
        <tr><td style="padding:10px 14px;text-align:right;color:#8a8a9a;">Shipping</td><td style="padding:10px 14px;text-align:right;font-family:JetBrains Mono,monospace;color:#c8c8d0;"><?php echo $order->get_shipping_total() > 0 ? wc_price($order->get_shipping_total()) : '<span style="color:#4ade80;">Free</span>'; ?></td></tr>
        <tr><td style="padding:10px 14px;text-align:right;color:#8a8a9a;">Tax</td><td style="padding:10px 14px;text-align:right;font-family:JetBrains Mono,monospace;color:#c8c8d0;"><?php echo wc_price($order->get_total_tax()); ?></td></tr>
        <tr><td style="padding:14px;text-align:right;color:#f0f0f5;font-weight:600;border-top:1px solid rgba(255,255,255,0.06);">Total</td><td style="padding:14px;text-align:right;font-family:JetBrains Mono,monospace;font-size:16px;color:#f0f0f5;font-weight:600;border-top:1px solid rgba(255,255,255,0.06);"><?php echo wc_price($order->get_total()); ?></td></tr>
        <tr><td style="padding:8px 14px;text-align:right;color:#55556a;font-size:12px;">Payment</td><td style="padding:8px 14px;text-align:right;color:#8a8a9a;font-size:12px;"><?php echo esc_html($order->get_payment_method_title()); ?></td></tr>
      </tfoot>
    </table>
    <?php
}
function roji_preview_render_customer_details($order, $sent_to_admin, $plain_text, $email) {
    if ($plain_text) return;
    ?>
    <table cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;">
      <tr>
        <td valign="top" style="width:50%;padding-right:8px;">
          <h2 style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#f0f0f5;margin:0 0 10px;letter-spacing:0.02em;text-transform:uppercase;">Billing</h2>
          <div style="background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;color:#c8c8d0;font-size:13px;line-height:1.6;">
            <?php echo $order->get_formatted_billing_address(); ?><br/>
            <a href="mailto:<?php echo esc_attr($order->get_billing_email()); ?>" style="color:#4f6df5;"><?php echo esc_html($order->get_billing_email()); ?></a><br/>
            <?php echo esc_html($order->get_billing_phone()); ?>
          </div>
        </td>
        <td valign="top" style="width:50%;padding-left:8px;">
          <h2 style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#f0f0f5;margin:0 0 10px;letter-spacing:0.02em;text-transform:uppercase;">Shipping</h2>
          <div style="background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;color:#c8c8d0;font-size:13px;line-height:1.6;">
            <?php echo $order->get_formatted_shipping_address(); ?>
          </div>
        </td>
      </tr>
    </table>
    <?php
}
add_action('woocommerce_email_order_details',     'roji_preview_render_order_details', 10, 4);
add_action('woocommerce_email_customer_details',  'roji_preview_render_customer_details', 10, 4);
