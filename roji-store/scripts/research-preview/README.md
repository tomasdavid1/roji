# Roji /research/* preview + flow tests

Offline harness for the programmatic-SEO research pages defined in
`roji-child/inc/research-compounds.php` and rendered by
`roji-child/inc/research-pages.php`.

## What gets generated

- **24 compound pages** at `/research/<compound-slug>/`
- **16 combination pages** at `/research/<a>-and-<b>/` (and 1 three-way)
- **1 index page** at `/research/`
- **1 sitemap** at `/research-sitemap.xml` (auto-injected into Yoast or native sitemap)

## Files

| Path | Purpose |
| --- | --- |
| `render.php` | Boots a minimal WP shim, loads the real renderers, and writes 9 representative pages to `roji-store/preview/research/*.html` |
| `screenshot.sh` | Shoots each into `roji-store/preview/research-screenshots/*.png` |
| `flow-tests.php` | 35 unit tests covering dataset integrity, slug resolution, canonical combo ordering, page rendering, JSON-LD validity, cross-references, URL builders |

## Usage

```bash
php scripts/research-preview/render.php
scripts/research-preview/screenshot.sh
php scripts/research-preview/flow-tests.php
```

## Coverage (35 tests, 7 sections)

1. **Dataset integrity** — required keys, kebab-case slugs, PubMed citations, ≤200 char meta, no compliance-violating phrases, ≥20 compounds, ≥15 combos
2. **Slug resolution** — index, `__index__`, compound, combination, wrong-order combo redirect, unknown slugs
3. **Canonical combo slug** — alphabetical sort, deduplication, three-way ordering
4. **Page renderers** — chemistry/pharmacology/citations/buy-block presence, "Notify me" form for uncarried, green CTA for carried stacks, source-list for non-carried combos, disclaimer present everywhere
5. **JSON-LD schema** — valid JSON, BreadcrumbList + Article + DefinedTerm types, absolute URLs
6. **Cross-references** — all combo compound refs exist, every combo key matches its canonical slug, every uncarried compound nudges to a real product
7. **URL builders** — index/compound/combo URL formats

## What canonical-combo testing caught

The first run of these tests flagged **5 combination keys** that were
not in canonical alphabetical order. In production, those would have
caused infinite 301 redirects (the resolver `301`s to the canonical
slug, which would itself `301` again). Every key was fixed.

## Limitations

- The shim is offline-only. It doesn't exercise `add_rewrite_rule`, `wp_safe_redirect`, or the AJAX endpoint over HTTP — those need a live WP install. Use staging to verify rewrite-rule flush.
- Screenshots use a desktop viewport (1200×3200). Mobile rendering should be spot-checked once on staging.
