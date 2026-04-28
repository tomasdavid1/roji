# Roji Elementor Templates

Programmatic Elementor page builder. Each page is a PHP file that returns a structured array; an importer script writes the result into `_elementor_data` post-meta. Pages are then editable in the Elementor visual editor for fine-tuning.

## Why programmatic?

- **Version-controlled**: every page lives in git as a PHP file you can diff and review.
- **Idempotent**: re-running the importer updates pages by slug without duplicating posts. Element IDs are deterministic so Elementor's compiled CSS doesn't get orphaned between runs.
- **Reproducible**: Friday's local site, Monday's staging, and production all build the same pages from the same source.
- **Editor-compatible**: produces real Elementor data, so post-import you can open any page in the visual editor and tweak it.

## Structure

```
elementor-templates/
├── README.md
├── import.php             — WP-CLI entry point for pages
├── menus.php              — WP-CLI entry point for header/footer menus
├── lib/
│   └── builder.php        — Tiny helper library (containers, widgets, cards, grids,
│                            FAQ items, legal-page template, page persistence)
└── pages/
    ├── home.php
    ├── about.php
    ├── faq.php
    ├── research-library.php
    ├── coa.php
    └── legal/
        ├── terms.php
        ├── privacy.php
        ├── refunds.php
        └── shipping.php
```

## Run

From the WordPress root (LocalWP, Kinsta SSH, etc.):

```bash
# All pages
wp eval-file /path/to/roji-store/elementor-templates/import.php

# Single page (or comma-separated list)
wp eval-file /path/to/roji-store/elementor-templates/import.php -- home
wp eval-file /path/to/roji-store/elementor-templates/import.php -- terms,privacy

# Header + footer menus (requires pages to exist first)
wp eval-file /path/to/roji-store/elementor-templates/menus.php
```

The importer:

1. Looks up each page by slug; updates if it exists, creates if it doesn't.
2. Writes the dark-theme background to Elementor page settings.
3. Sets Home as the front page.
4. Clears Elementor's compiled CSS cache so changes show on next view.

The menu provisioner:

1. Creates `roji-header` (assigned to `menu-1`) and `roji-footer` (assigned to `menu-2`) — Hello Elementor's two nav locations.
2. Resolves relative URLs to actual page IDs so links survive site-URL changes.
3. Wipes existing items before re-adding so menus stay in sync with the source code.

## Adding a new page

1. Create `pages/<slug>.php`. Return an array `['title' => ..., 'content' => [array of containers]]`.
2. Use the helpers in `lib/builder.php` — they cover containers, headings, text, buttons, cards, grids, FAQ items, dividers, spacers, raw HTML, shortcodes, and a one-shot `roji_el_legal_page()` for policy-style pages.
3. Add the slug to the `$ALL_PAGES` map in `import.php`.
4. Re-run the importer.

## Re-running safely

- **Element IDs are deterministic** per `(slug, counter)` so Elementor's `_elementor_css` stays valid between rebuilds — your handcrafted custom CSS in the editor doesn't get orphaned.
- The importer **does not delete** custom edits made in the visual editor; it overwrites `_elementor_data` wholesale. If you've polished a page in the editor and want to keep those changes, **don't re-run the importer for that slug** — or copy the JSON back into the page file first.

## After import

Pages opened in the Elementor editor can be customized further. Refinements made there are **not** synced back to git automatically; treat the importer output as a strong starting point, then either iterate in code (and re-import) or in the editor (and stop importing).

## Required plugins

- Elementor (free) — version 4.0+ verified.
- Hello Elementor parent theme.
- Roji Child theme (active).

## Trustpilot widget

The Home page renders `[trustpilot_hero]`. The shortcode is defined in `roji-store/roji-child/inc/trustpilot-widgets.php` and only outputs anything once `ROJI_TRUSTPILOT_BUSINESS_UNIT_ID` is configured (in `wp-config.php` or as an environment constant). Until then it gracefully returns nothing — the page renders fine without it.
