<?php
/**
 * Roji /research/* programmatic-page flow tests.
 *
 * Exercises the pure-PHP logic: dataset integrity, slug resolution,
 * canonical combo ordering, JSON-LD assembly, and the page-renderers.
 *
 * Run:  php scripts/research-preview/flow-tests.php
 *
 * @package roji-preview
 */

require __DIR__ . '/render.php'; // boots the shim + loads inc/research-*.php
// render.php prints output. Discard it for the test run; the test
// runner output below is what matters.
ob_end_clean();
ob_start();
ob_end_clean();

// Re-print a fresh banner so the test output starts cleanly.
fwrite(STDOUT, "\n");

$pass = 0; $fail = 0;
function rt(string $name, callable $fn) {
    global $pass, $fail;
    try { $fn(); fwrite(STDOUT, "  \033[32m✓\033[0m {$name}\n"); $pass++; }
    catch (Throwable $e) {
        fwrite(STDOUT, "  \033[31m✗\033[0m {$name}\n      → " . $e->getMessage() . "\n");
        $fail++;
    }
}
function eq($exp, $act, $msg = '') {
    if ($exp !== $act) {
        throw new RuntimeException('expected ' . var_export($exp, true) . ', got ' . var_export($act, true) . ($msg ? " — {$msg}" : ''));
    }
}
function contains($needle, $haystack, $msg = '') {
    if (strpos((string)$haystack, (string)$needle) === false) {
        throw new RuntimeException("expected to contain '{$needle}'" . ($msg ? " — {$msg}" : ''));
    }
}
function notContains($needle, $haystack, $msg = '') {
    if (strpos((string)$haystack, (string)$needle) !== false) {
        throw new RuntimeException("expected NOT to contain '{$needle}'" . ($msg ? " — {$msg}" : ''));
    }
}
function tr($v, $msg = '') { if (!$v) throw new RuntimeException("expected truthy{$msg}"); }

fwrite(STDOUT, "\n\033[1mRoji /research/* flow tests\033[0m\n\n");

// ============================================================
// 1. Dataset integrity
// ============================================================
fwrite(STDOUT, "[1] Dataset integrity\n");

$compounds = roji_research_compounds();
$combos    = roji_research_combinations();

rt('All compounds have required keys', function () use ($compounds) {
    $required = ['slug','name','category','carried','product_slug','chemistry','pharmacology','citations','meta_desc'];
    foreach ($compounds as $slug => $c) {
        foreach ($required as $k) {
            if (!array_key_exists($k, $c)) throw new RuntimeException("missing '{$k}' in compound '{$slug}'");
        }
        if ($c['slug'] !== $slug) throw new RuntimeException("slug mismatch: '{$slug}' vs '{$c['slug']}'");
    }
});

rt('All compound slugs are valid (kebab-case)', function () use ($compounds) {
    foreach ($compounds as $slug => $_) {
        if (!preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
            throw new RuntimeException("invalid slug: '{$slug}'");
        }
    }
});

rt('Carried compounds have non-empty product_slug', function () use ($compounds) {
    foreach ($compounds as $slug => $c) {
        if ($c['carried'] && $c['product_slug'] === '') {
            throw new RuntimeException("carried compound '{$slug}' has empty product_slug");
        }
    }
});

rt('Every compound has at least one citation with a PubMed URL', function () use ($compounds) {
    foreach ($compounds as $slug => $c) {
        if (empty($c['citations'])) throw new RuntimeException("'{$slug}' has no citations");
        $has_pubmed = false;
        foreach ($c['citations'] as $cit) {
            if (str_contains($cit['url'] ?? '', 'pubmed.ncbi.nlm.nih.gov')) { $has_pubmed = true; break; }
        }
        if (!$has_pubmed) throw new RuntimeException("'{$slug}' has no PubMed citation");
    }
});

rt('Meta description ≤ 200 chars (Google truncates ~155 but allow buffer)', function () use ($compounds) {
    foreach ($compounds as $slug => $c) {
        if (mb_strlen($c['meta_desc']) > 200) {
            throw new RuntimeException("'{$slug}' meta_desc is " . mb_strlen($c['meta_desc']) . " chars");
        }
    }
});

rt('No compound page mentions a dose, mg/kg, or "take"', function () use ($compounds) {
    $banned = ['mg/kg', 'take ', 'dose of ', 'recommended dosage', 'dose:'];
    foreach ($compounds as $slug => $c) {
        $blob = strtolower(json_encode($c));
        foreach ($banned as $b) {
            if (strpos($blob, strtolower($b)) !== false) {
                throw new RuntimeException("'{$slug}' contains compliance-violating phrase: '{$b}'");
            }
        }
    }
});

rt('At least 20 compounds in dataset', function () use ($compounds) {
    if (count($compounds) < 20) throw new RuntimeException('only ' . count($compounds) . ' compounds');
});

rt('At least 15 combinations in dataset', function () use ($combos) {
    if (count($combos) < 15) throw new RuntimeException('only ' . count($combos) . ' combos');
});

// ============================================================
// 2. Slug resolution
// ============================================================
fwrite(STDOUT, "\n[2] Slug resolution\n");

rt('Empty slug → index', function () { eq('index', roji_research_resolve('')['type']); });
rt('"__index__" → index', function () { eq('index', roji_research_resolve('__index__')['type']); });
rt('"bpc-157" → compound', function () {
    $r = roji_research_resolve('bpc-157');
    eq('compound', $r['type']); eq('BPC-157', $r['data']['name']);
});
rt('"bpc-157-and-tb-500" → combination', function () {
    $r = roji_research_resolve('bpc-157-and-tb-500');
    eq('combination', $r['type']);
});
rt('Wrong-order combo slug → 301 redirect to canonical', function () {
    $r = roji_research_resolve('tb-500-and-bpc-157');
    eq('redirect', $r['type']);
    eq('bpc-157-and-tb-500', $r['slug']);
});
rt('Unknown slug → null (404)', function () {
    eq(null, roji_research_resolve('totally-fake-compound-9000'));
});
rt('Unknown combo slug (ordering fix doesn\'t apply) → null', function () {
    eq(null, roji_research_resolve('bpc-157-and-fake'));
});

// ============================================================
// 3. Canonical combo slug builder
// ============================================================
fwrite(STDOUT, "\n[3] Canonical combo slug\n");

rt('Sorts alphabetically', function () {
    eq('bpc-157-and-tb-500', roji_research_combo_slug(['tb-500','bpc-157']));
});
rt('Deduplicates', function () {
    eq('bpc-157-and-tb-500', roji_research_combo_slug(['tb-500','bpc-157','tb-500']));
});
rt('Three-way combo orders correctly', function () {
    eq('cjc-1295-and-ipamorelin-and-mk-677', roji_research_combo_slug(['mk-677','cjc-1295','ipamorelin']));
});

// ============================================================
// 4. Page renderers produce expected content
// ============================================================
fwrite(STDOUT, "\n[4] Page renderers\n");

rt('Compound page renders chemistry, pharmacology, citations, buy block', function () use ($compounds) {
    $GLOBALS['roji_research_current'] = ['type'=>'compound','slug'=>'bpc-157','data'=>$compounds['bpc-157']];
    $html = roji_research_render_compound($compounds['bpc-157']);
    contains('BPC-157', $html);
    contains('Chemistry', $html);
    contains('Pharmacology', $html);
    contains('Selected literature', $html);
    contains('Available now', $html);
    contains('View product', $html);
    contains('Studied alongside', $html); // related combos sidebar
    notContains('mg/kg', $html);
});

rt('Uncarried compound page shows request-stocking form (no buy CTA)', function () use ($compounds) {
    $GLOBALS['roji_research_current'] = ['type'=>'compound','slug'=>'tirzepatide','data'=>$compounds['tirzepatide']];
    $html = roji_research_render_compound($compounds['tirzepatide']);
    contains('Notify me', $html);
    contains('data-roji-research-request', $html);
    contains('Not stocked yet', $html);
    notContains('Available now', $html);
});

rt('Combination page (carried stack) shows green "In stock as a stack" CTA', function () use ($combos, $compounds) {
    $GLOBALS['roji_research_current'] = ['type'=>'combination','slug'=>'bpc-157-and-tb-500','data'=>$combos['bpc-157-and-tb-500']];
    $html = roji_research_render_combination($combos['bpc-157-and-tb-500']);
    contains('In stock as a stack', $html);
    contains('Wolverine Stack', $html);
    contains('Side-by-side', $html);
});

rt('Combination page (no carried stack) shows per-compound source list', function () use ($combos) {
    $GLOBALS['roji_research_current'] = ['type'=>'combination','slug'=>'retatrutide-and-tirzepatide','data'=>$combos['retatrutide-and-tirzepatide']];
    $html = roji_research_render_combination($combos['retatrutide-and-tirzepatide']);
    contains('Source the compounds', $html);
    contains('Tirzepatide', $html);
    contains('Retatrutide', $html);
    notContains('In stock as a stack', $html);
});

rt('Index page lists every compound', function () use ($compounds) {
    $GLOBALS['roji_research_current'] = ['type'=>'index','slug'=>'','data'=>[]];
    $html = roji_research_render_index();
    contains('Peptide research library', $html);
    foreach ($compounds as $c) {
        contains($c['name'], $html, "missing {$c['name']}");
    }
});

rt('Index page lists all combinations', function () use ($combos) {
    $GLOBALS['roji_research_current'] = ['type'=>'index','slug'=>'','data'=>[]];
    $html = roji_research_render_index();
    foreach ($combos as $combo) {
        contains($combo['name'], $html, "missing combo {$combo['name']}");
    }
});

rt('Disclaimer present on every renderable page type', function () use ($compounds, $combos) {
    foreach ([
        roji_research_render_compound($compounds['bpc-157']),
        roji_research_render_combination($combos['bpc-157-and-tb-500']),
        roji_research_render_index(),
    ] as $html) {
        contains('Research use only', $html);
        contains('not medical advice', $html);
    }
});

// ============================================================
// 5. JSON-LD schema
// ============================================================
fwrite(STDOUT, "\n[5] JSON-LD schema\n");

rt('Compound JSON-LD is valid JSON, contains BreadcrumbList + Article + DefinedTerm', function () use ($compounds) {
    $cur = ['type'=>'compound','slug'=>'bpc-157','data'=>$compounds['bpc-157']];
    $block = roji_research_jsonld_block($cur);
    contains('application/ld+json', $block);
    preg_match('/<script[^>]*>(.*?)<\/script>/s', $block, $m);
    $json = json_decode($m[1], true);
    tr(is_array($json) && isset($json['@graph']));
    $types = array_column($json['@graph'], '@type');
    tr(in_array('BreadcrumbList', $types, true));
    tr(in_array('Article', $types, true));
    tr(in_array('DefinedTerm', $types, true));
});

rt('Combination JSON-LD has Article with about[] of DefinedTerm', function () use ($combos) {
    $cur = ['type'=>'combination','slug'=>'bpc-157-and-tb-500','data'=>$combos['bpc-157-and-tb-500']];
    $block = roji_research_jsonld_block($cur);
    preg_match('/<script[^>]*>(.*?)<\/script>/s', $block, $m);
    $json = json_decode($m[1], true);
    $article = null;
    foreach ($json['@graph'] as $node) if ($node['@type'] === 'Article') $article = $node;
    tr($article !== null);
    tr(is_array($article['about']) && count($article['about']) === 2);
});

rt('Index JSON-LD has CollectionPage + DefinedTermSet', function () {
    $cur = ['type'=>'index','slug'=>'','data'=>[]];
    $block = roji_research_jsonld_block($cur);
    preg_match('/<script[^>]*>(.*?)<\/script>/s', $block, $m);
    $json = json_decode($m[1], true);
    $types = array_column($json['@graph'], '@type');
    tr(in_array('CollectionPage', $types, true));
    tr(in_array('DefinedTermSet', $types, true));
});

rt('JSON-LD URLs are absolute (https://) not relative', function () use ($compounds) {
    $cur = ['type'=>'compound','slug'=>'bpc-157','data'=>$compounds['bpc-157']];
    $block = roji_research_jsonld_block($cur);
    preg_match('/<script[^>]*>(.*?)<\/script>/s', $block, $m);
    $json = json_decode($m[1], true);
    foreach ($json['@graph'] as $node) {
        if (isset($node['url']) && !str_starts_with($node['url'], 'https://')) {
            throw new RuntimeException("relative URL in JSON-LD: {$node['url']}");
        }
    }
});

// ============================================================
// 6. Cross-references between compounds and combinations
// ============================================================
fwrite(STDOUT, "\n[6] Cross-references\n");

rt('Every combination references compounds that exist', function () use ($combos, $compounds) {
    foreach ($combos as $key => $combo) {
        foreach ($combo['compounds'] as $slug) {
            if (!isset($compounds[$slug])) {
                throw new RuntimeException("combo '{$key}' references unknown compound '{$slug}'");
            }
        }
    }
});

rt('Every combo key matches its canonical compound-slug ordering', function () use ($combos) {
    $bad = [];
    foreach ($combos as $key => $combo) {
        $canon = roji_research_combo_slug($combo['compounds']);
        if ($canon !== $key) $bad[] = "'{$key}' should be '{$canon}'";
    }
    if ($bad) throw new RuntimeException(count($bad) . " non-canonical combo keys: " . implode('; ', $bad));
});

rt('Every uncarried compound nudges to a real product slug', function () use ($compounds) {
    $real_products = ['bpc-157-10mg','tb-500-10mg','cjc-1295-dac-5mg','ipamorelin-5mg','mk-677-30caps','wolverine-stack','recomp-stack','full-protocol'];
    foreach ($compounds as $slug => $c) {
        if (!$c['carried'] && !in_array($c['product_slug'], $real_products, true)) {
            throw new RuntimeException("'{$slug}' nudges to non-existent product '{$c['product_slug']}'");
        }
    }
});

// ============================================================
// 7. URL builders
// ============================================================
fwrite(STDOUT, "\n[7] URL builders\n");

rt('Index URL', function () { eq('https://rojipeptides.com/research/', roji_research_url()); });
rt('Compound URL', function () { eq('https://rojipeptides.com/research/bpc-157/', roji_research_url('bpc-157')); });
rt('Combo URL', function () { eq('https://rojipeptides.com/research/bpc-157-and-tb-500/', roji_research_url('bpc-157-and-tb-500')); });

// ============================================================
fwrite(STDOUT, "\n" . str_repeat('─', 60) . "\n");
fwrite(STDOUT, "\033[1m{$pass} passed");
if ($fail) fwrite(STDOUT, ", \033[31m{$fail} failed\033[0m");
fwrite(STDOUT, "\033[0m\n");
exit($fail ? 1 : 0);
