<?php
/**
 * Roji /research/* preview renderer.
 *
 * Boots a minimal WP shim, loads the real research-compounds dataset
 * and the renderers from inc/research-pages.php, then writes:
 *   - the index page
 *   - 6 representative compound pages (mix of carried + uncarried)
 *   - 3 combination pages (carried stack + 2 research-only pairs)
 * to preview/research/*.html so we can screenshot them with the same
 * Chrome harness used for emails.
 *
 * Usage:  php scripts/research-preview/render.php
 *
 * @package roji-preview
 */

// ---------- WP shim (very small subset) ----------
if (!defined('ABSPATH'))             define('ABSPATH', __DIR__ . '/');
if (!defined('ROJI_BRAND_NAME'))     define('ROJI_BRAND_NAME', 'Roji Peptides');
if (!defined('ROJI_CHILD_DIR'))      define('ROJI_CHILD_DIR', dirname(__DIR__, 2) . '/roji-child');
if (!defined('ROJI_CHILD_VERSION'))  define('ROJI_CHILD_VERSION', '1.7.0');
if (!defined('OBJECT'))              define('OBJECT', 'OBJECT');
if (!defined('JSON_UNESCAPED_SLASHES'))  /* always defined */ ;

function esc_html($t){ return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8'); }
function esc_attr($t){ return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8'); }
function esc_url($u) { return htmlspecialchars((string)$u, ENT_QUOTES, 'UTF-8'); }
function esc_html__($t){ return esc_html($t); }
function esc_html_e($t){ echo esc_html($t); }
function esc_xml($v){ return htmlspecialchars((string)$v, ENT_XML1 | ENT_QUOTES, 'UTF-8'); }
function __($t){ return $t; }
function _x($t){ return $t; }
function sanitize_title($s){
    $s = strtolower((string)$s);
    $s = preg_replace('/[^a-z0-9\-]/', '-', $s);
    $s = preg_replace('/-+/', '-', $s);
    return trim($s, '-');
}
function sanitize_email($e){ return filter_var((string)$e, FILTER_SANITIZE_EMAIL) ?: ''; }
function is_email($e){ return (bool) filter_var((string)$e, FILTER_VALIDATE_EMAIL); }
function wp_trim_words($text, $n = 55, $end = '…'){
    $words = preg_split('/\s+/', trim((string)$text));
    if (count($words) <= $n) return implode(' ', $words);
    return implode(' ', array_slice($words, 0, $n)) . $end;
}
function wp_json_encode($v, $opts = 0){ return json_encode($v, $opts); }
function home_url($p = '/'){ return 'https://rojipeptides.com' . (str_starts_with($p, '/') ? $p : '/' . $p); }
function get_permalink($p){ return is_object($p) ? home_url('/product/' . ($p->post_name ?? '')) : ''; }
function in_the_loop(){ return false; }
function did_action($a){ return 0; }
function get_query_var($k){ return ''; }
function status_header($code){ /* noop */ }
function wp_safe_redirect($u, $code = 302){ throw new RuntimeException("REDIRECT:{$code}:{$u}"); }
function add_action(...$a){}
function add_filter(...$a){}
function add_rewrite_tag(...$a){}
function add_rewrite_rule(...$a){}
function get_option($k, $d = ''){ return $d; }
function update_option(...$a){ return true; }
function flush_rewrite_rules(...$a){ return true; }
function admin_url($p = ''){ return home_url('/wp-admin/' . $p); }
function wp_create_nonce($k){ return 'nonce_stub'; }
function wp_register_script(...$a){ return true; }
function wp_enqueue_script(...$a){ return true; }
function wp_add_inline_script(...$a){ return true; }
function apply_filters($t, $v){ return $v; }
function get_header(){ /* will be replaced per render */ }
function get_footer(){ /* will be replaced per render */ }

// Stub WC product lookup so the renderer can build product URLs/names.
$GLOBALS['__products'] = array(
    'bpc-157-10mg'      => 'BPC-157 (10mg)',
    'tb-500-10mg'       => 'TB-500 (10mg)',
    'cjc-1295-dac-5mg'  => 'CJC-1295 with DAC (5mg)',
    'ipamorelin-5mg'    => 'Ipamorelin (5mg)',
    'mk-677-30caps'     => 'MK-677 (30 capsules)',
    'wolverine-stack'   => 'BPC-157 + TB-500 Stack',
    'recomp-stack'      => 'CJC-1295 + Ipamorelin + MK-677 Stack',
    'full-protocol'     => 'Full Protocol',
);
function wc_get_product_id_by_sku($sku){ return 0; }
function get_page_by_path($slug, $output = OBJECT, $type = 'page'){
    if (isset($GLOBALS['__products'][$slug])) {
        return (object) ['post_name' => $slug, 'post_title' => $GLOBALS['__products'][$slug]];
    }
    return null;
}

require ROJI_CHILD_DIR . '/inc/research-compounds.php';
require ROJI_CHILD_DIR . '/inc/research-pages.php';

// Pick representative pages.
$cases = array(
    array('slug' => '',          'type' => 'index'),
    array('slug' => 'bpc-157',   'type' => 'compound'),
    array('slug' => 'mk-677',    'type' => 'compound'),
    array('slug' => 'tirzepatide','type' => 'compound'),  // uncarried — request form
    array('slug' => 'retatrutide','type' => 'compound'),  // uncarried — request form
    array('slug' => 'epitalon',  'type' => 'compound'),   // uncarried, niche
    array('slug' => 'bpc-157-and-tb-500', 'type' => 'combination'),                    // carried stack
    array('slug' => 'cjc-1295-and-ipamorelin-and-mk-677', 'type' => 'combination'),    // carried 3-stack
    array('slug' => 'retatrutide-and-tirzepatide', 'type' => 'combination'),           // research-only
);

$out_dir = dirname(__DIR__, 2) . '/preview/research';
// Note: __DIR__ is .../roji-store/scripts/research-preview ; up 2 = .../roji-store
@mkdir($out_dir, 0755, true);
$css = file_get_contents(ROJI_CHILD_DIR . '/style.css');

function render_one($slug, $type, $out_dir, $css) {
    $resolved = $type === 'index' ? roji_research_resolve('__index__') : roji_research_resolve($slug);
    $name     = $type === 'index' ? 'index' : $slug;
    if (!$resolved) {
        echo "  ! could not resolve {$slug}\n";
        return;
    }
    $GLOBALS['roji_research_current'] = $resolved;
    switch ($resolved['type']) {
        case 'index':       $body = roji_research_render_index(); break;
        case 'compound':    $body = roji_research_render_compound($resolved['data']); break;
        case 'combination': $body = roji_research_render_combination($resolved['data']); break;
        default: return;
    }
    // Capture JSON-LD too (for visual confidence).
    $jsonld = roji_research_jsonld_block($resolved);

    $title = roji_research_page_title($resolved);
    $desc  = roji_research_meta_description($resolved);
    $url   = roji_research_url($resolved['type'] === 'index' ? '' : $resolved['slug']);

    $html = <<<HTML
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<title>{$title} | Roji Peptides</title>
<meta name="description" content="{$desc}">
<link rel="canonical" href="{$url}">
<style>
{$css}
</style>
</head>
<body>
<div class="preview-chrome" style="background:#22222d;color:#c8c8d0;padding:10px 20px;font-family:JetBrains Mono,monospace;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.06);letter-spacing:0.04em;text-transform:uppercase;">
  preview · {$url}
</div>
<main class="roji-research-main">
{$body}
</main>
</body></html>
HTML;
    file_put_contents("{$out_dir}/{$name}.html", $html);
    echo "  ✓ {$name}.html\n";
}

echo "Rendering /research/ pages to {$out_dir}\n";
foreach ($cases as $c) render_one($c['slug'], $c['type'], $out_dir, $css);
echo "Done.\n";
