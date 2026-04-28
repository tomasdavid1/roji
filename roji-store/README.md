# roji-store

WordPress + WooCommerce + Elementor storefront for Roji Peptides. This repo contains a deployable child theme (`roji-child/`) and a WP-CLI product seeder script. It does **not** include WordPress core or a database — you bring those.

## Layout

```
roji-store/
├── roji-child/            Drop-in child theme for Hello Elementor
│   ├── style.css          Theme header + dark WooCommerce overrides
│   ├── functions.php      Loads /inc modules
│   ├── screenshot.png
│   ├── inc/
│   │   ├── config.php             Centralized IDs (product, GAds, GA4)
│   │   ├── enqueue.php            Fonts + stylesheets
│   │   ├── disclaimers.php        Research-use disclaimers + checkout consent
│   │   ├── woocommerce.php        Cart deep-link, COA tab, research tab, etc.
│   │   ├── tracking.php           gtag.js + purchase conversion
│   │   ├── age-gate.php           21+ modal (cookie-gated)
│   │   └── payment-failover.php   Failed-payment notifier
│   ├── assets/css/
│   │   └── elementor-overrides.css
│   └── woocommerce/emails/
│       ├── email-styles.php
│       ├── email-header.php
│       └── email-footer.php
└── scripts/
    └── import-products.php    WP-CLI seeder
```

## Setup (LocalWP / Docker / production)

### 1. Provision WordPress

Either via LocalWP (recommended for dev), Docker, or a managed host (Kinsta, Cloudways).

```bash
# Docker example
docker run -d --name roji-wp \
  -p 8080:80 \
  -e WORDPRESS_DB_HOST=db \
  -e WORDPRESS_DB_USER=wp \
  -e WORDPRESS_DB_PASSWORD=wp \
  -e WORDPRESS_DB_NAME=wp \
  --link roji-mysql:db \
  wordpress:latest
```

### 2. Install required plugins

```bash
# Inside the WP container or via SSH on production
wp plugin install woocommerce yoast-seo wordfence age-gate \
  litespeed-cache gdpr-cookie-consent \
  --activate --allow-root

# Elementor (free)
wp plugin install elementor --activate --allow-root

# Elementor Pro requires a paid license — install manually from a downloaded .zip:
wp plugin install /tmp/elementor-pro.zip --activate --allow-root

# Custom fields helper
wp plugin install advanced-custom-fields --activate --allow-root
```

### 3. Install Hello Elementor parent theme

```bash
wp theme install hello-elementor --activate --allow-root
```

### 4. Drop in the child theme

Copy `roji-child/` into `wp-content/themes/`, then:

```bash
wp theme activate roji-child --allow-root
```

### 5. Seed products

```bash
wp eval-file wp-content/themes/roji-child/../../../roji-store/scripts/import-products.php --allow-root
# Or, if you've copied scripts/ into the WP root:
wp eval-file scripts/import-products.php --allow-root
```

The script prints the new product IDs. Copy them into `roji-child/inc/config.php`:

```php
define( 'ROJI_WOLVERINE_PRODUCT_ID', 42 );
define( 'ROJI_RECOMP_PRODUCT_ID', 43 );
define( 'ROJI_FULL_PRODUCT_ID', 44 );
```

This makes the protocol-engine deep-link (`/cart/?protocol_stack=wolverine`) work.

### 6. Configure WooCommerce

```bash
wp option update woocommerce_currency USD --allow-root
wp option update woocommerce_default_country US:CA --allow-root
wp option update woocommerce_calc_taxes yes --allow-root
```

Then in **WooCommerce → Settings**:

- **General**: store address, USD currency.
- **Products → Inventory**: hide out-of-stock items.
- **Shipping**: add a free-shipping zone for US over $200 (the theme filter enforces it once a free-shipping method exists).
- **Payments**: install your high-risk gateway plugin (AllayPay / Durango / Corepay) and configure with the API keys they provide. Set the billing descriptor to `ROJI RESEARCH`. Add a crypto backup (Coinbase Commerce or NOWPayments).
- **Emails**: set the brand color and footer text — the dark templates in `woocommerce/emails/` will be used automatically.

### 7. Configure tracking IDs

Edit `roji-child/inc/config.php`:

```php
define( 'ROJI_GADS_ID', 'AW-XXXXXXXXXX' );
define( 'ROJI_GADS_PURCHASE_LABEL', 'aBcDeF1GhIjKlMnO' );
define( 'ROJI_GA4_ID', 'G-XXXXXXXXXX' );
```

### 8. Build pages in Elementor

Use Elementor to build the pages described in section 1.4 of the project brief:

- Home, Shop, Product pages, About, COA / Lab Results, Research Library, FAQ, Legal pages.

The dark palette is enforced through `elementor-overrides.css`.

### 9. Final checks

- Visit any product page — the **Research Use Only** disclaimer appears under the add-to-cart button.
- At checkout, the disclaimer + mandatory `research_use_confirm` checkbox appear above **Place Order**. Submitting without it triggers a `wc_add_notice` error.
- Footer disclaimer renders sitewide.
- Age gate modal appears on first visit (cookie persists 30 days).
- Visit `/cart/?protocol_stack=wolverine` — empties cart, adds Wolverine, redirects to checkout.

## Payment gateway notes

| Gateway | Recommended for | Fees |
| --- | --- | --- |
| AllayPay | Primary card | ~3–6% + $0.30, 5–10% rolling reserve |
| Durango Merchant Services | Primary card backup | similar |
| Corepay | Primary card alt | similar |
| Coinbase Commerce | Crypto (USDT, BTC, ETH) | ~1% |
| NOWPayments | Crypto alt | ~0.5% |
| CoinGate | Crypto alt | ~1% |

Plugin auto-discovery: install the gateway plugin from the processor, then enable it in **WooCommerce → Settings → Payments**. The `payment-failover.php` include logs gateway failures and emails the site admin.

## Compliance reference

Every product page, the cart, and checkout display the research-use-only disclaimer. The mandatory `research_use_confirm` checkbox is enforced server-side. Site-wide footer carries the FDA / 21+ disclaimer. Age verification (21+) is enforced via the modal on first visit.

Reviews are disabled on all products (handled by `inc/woocommerce.php`).

Product copy must use research-only language — see the protocol-engine constants for compliant phrasing patterns.
