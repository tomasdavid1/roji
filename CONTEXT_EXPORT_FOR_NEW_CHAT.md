# Roji platform — context export for a new chat

**Purpose:** Paste or `@`-attach this file when opening a new Cursor chat so the model has full project context without re-reading the whole prior thread.

**Repo root:** `/Users/tomas/Roji`  
**Date of export:** 2026-04-29

---

## 1. What this monorepo is

E-commerce + “engineering as marketing” research tools for **Roji Peptides**.

| Directory | Stack | Live / intended URL |
|-----------|--------|----------------------|
| `roji-store/` | WordPress + WooCommerce + **Hello Elementor** + **Elementor Pro**, child theme **`roji-child`** | **https://rojipeptides.com** (Kinsta) |
| `roji-tools/` | Next.js (App Router), Tailwind, GA4 via gtag | **https://tools.rojipeptides.com** (Vercel) |
| `roji-ads-dashboard/` | Next.js, Google Ads API | **ads.rojipeptides.com** / admin naming (Vercel) |
| `brand/` | SVG monogram (`r-mark.svg`), `build.sh` → favicons / OG components | Source assets; theme copies under `roji-child/assets/img/` |

Older README may mention `roji-protocol/` — the live “protocol” product was replaced by **Research Tools** at `tools.rojipeptides.com`. Do **not** reintroduce “Protocol Engine” naming in customer-facing copy (compliance).

---

## 2. Compliance (non-negotiable)

- **No** personalized human dosing, weight-adjusted stacks, or “protocol wizard” language on the **store** or in crawlable FAQ/about/nav.
- Nav must say **Research Tools** → `https://tools.rojipeptides.com`, not “Protocol Engine”.
- Product/marketing copy: research / laboratory framing; no therapeutic or human-use claims.
- **Deploy gate:** `roji-store/deploy/assert-compliance.sh` runs in GitHub Actions after deploy; greps home/faq/about Elementor data + `roji-header` menu + header wordmark text.

---

## 3. Store (`roji-store/`) — the important paths

| Path | Role |
|------|------|
| `roji-child/functions.php` | Defines `ROJI_CHILD_VERSION`, loads `inc/*.php` |
| `roji-child/style.css` | Dark theme, WooCommerce PDP, header/footer, mobile nav |
| `roji-child/inc/branding.php` | Favicons, OG fallback, **`get_custom_logo`** wordmark (`roji` + `RESEARCH PEPTIDES` eyebrow desktop; eyebrow hidden &lt;768px), `bloginfo` / `pre_option_blogname` / `pre_get_document_title`, site icon kill |
| `roji-child/inc/woocommerce.php` | Shop filters (`roji_view`), bundles default on bare `/shop/`, `?roji_view=all` = full catalog, image sizes, individuals banner, etc. |
| `roji-child/inc/tracking.php` | gtag / funnel events |
| `roji-child/inc/gateway-reserve-order.php` | “Reserve order” WooCommerce gateway |
| `roji-child/assets/css/elementor-overrides.css` | Elementor kit overrides (loaded **after** child `style.css`) — **critical for nav specificity** |
| `roji-child/woocommerce/content-single-product.php` | Custom PDP layout + trust grid (`.roji-pdp-trust__item` / `__text` to avoid double-border) |
| `elementor-templates/` | PHP builders for Elementor pages; `menus.php` provisions `roji-header` / `roji-footer` |
| `scripts/` | WP-CLI: `import-products.php`, `wire-product-images.php`, `set-brand-options.php`, `regenerate-product-thumbnails.php` |
| `deploy/` | `assert-compliance.sh`, `migrate-to-kinsta.sh`, `.env.example` (secrets not in repo) |

**Product images:** `roji-store/assets/products/` (vial+box packshots); wiring + MD5 + autoship sibling sync in `wire-product-images.php`.

**Shop default:** Canonical **`/shop/`** shows **bundles only** (same as `?roji_view=bundles`). **`/shop/?roji_view=all`** = full catalog.

---

## 4. CI/CD (GitHub Actions)

- **`.github/workflows/deploy-roji-store.yml`**  
  rsync `roji-child` + `scripts/` to Kinsta; optional Elementor page re-import when templates change; runs `wire-product-images.php`, `set-brand-options.php`, `regenerate-product-thumbnails.php`; **`assert-compliance.sh`**; cache flush.
- **`.github/workflows/run-sql-migration.yml`**  
  Manual SQL migrations against Kinsta DB.

Checkout uses **`fetch-depth: 2`** where `HEAD~1` diff is needed.

---

## 5. Branding decisions (current)

- **Header wordmark:** lowercase **`roji`** is primary; optional eyebrow **`RESEARCH PEPTIDES`** (tools site uses **Research Tools**).
- **R monogram:** favicons / accents only (`brand/src/r-mark.svg`); not in primary header lockup.
- **Browser title / SEO:** still “Roji Peptides …” via `pre_get_document_title` where applicable.
- **`blogname`** in DB + filters pinned toward **`roji`** for on-page display; Elementor dynamic tags use **`option_blogname`** filter on frontend.

---

## 6. Analytics / ads

- GA4 measurement ID has been **`G-7SK3K1GD0N`** in conversation (verify in `config.php` / env).
- Store tracking extended for funnel steps in `inc/tracking.php`.
- Tools app: `roji-tools/src/lib/track.ts` + events on directory/tools.

---

## 7. Recent fixes (so you don’t redo them)

- **Mobile nav:** Global `.elementor-nav-menu a { muted !important }` in overrides was killing white menu text; scoped horizontal header vs **global dropdown** dark panel + light links; menu toggle focus ring; transparent header section backgrounds to shed kit white; `min-height` on dropdown to reduce content bleed-through.
- **Footer:** Link color + flex-wrap; PDP trust tiles no double border.
- **Autoship product images:** Parent thumbnail propagated to `_roji_autoship_for` siblings in `wire-product-images.php`.
- **Shop loop image quality:** WC thumbnail width 600 + regeneration script + `set-brand-options.php`.

---

## 8. Known backlog (from prior audit / todos)

1. **HIGH:** Cost-per-dose calculator — remove or clearly label pre-filled “Roji wins” demo rows (`roji-tools`, id `cpd_demo` in notes).
2. **MEDIUM:** “Research Supplies Kit” bundle (BAC + syringes + swabs).
3. **LOW:** COA library placeholder batches before heavy traffic.
4. Optional: shop “Showing X results” / default sort UI still mentioned in audit — may already be partially CSS-hidden in `woocommerce.php` / `style.css` (verify live).

---

## 9. Local / secrets (never commit)

- Kinsta SSH/SFTP lives in **`roji-store/deploy/.env`** (gitignored pattern expected); GitHub **Secrets** for Actions.
- Vercel env for Next apps set per project.

---

## 10. Commands that keep coming up

```bash
# Menus (WP-CLI on server or local)
wp eval-file wp-content/mu-plugins/roji-elementor-templates/menus.php   # path varies on host

# Theme version bump (cache bust) — edit define in roji-child/functions.php

# YAML / deploy debugging
# workflows under .github/workflows/
```

---

## 11. What to tell the new chat in one line

> Monorepo: **rojipeptides.com** = WordPress child theme **`roji-store/roji-child`** (Hello Elementor + WooCommerce + Elementor templates in `roji-store/elementor-templates/`); **tools** = **`roji-tools`** Next.js; deploy store via **`deploy-roji-store.yml`**; compliance enforced by **`roji-store/deploy/assert-compliance.sh`**; do not restore Protocol Engine / dosing FAQ language.

---

*End of export. Delete or trim this file anytime; it is only for chat handoff.*
