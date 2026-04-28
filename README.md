# Roji Peptides Platform

Premium research peptide platform. Three sibling projects:

| Path | Stack | Purpose |
| --- | --- | --- |
| [`roji-protocol/`](./roji-protocol) | Next.js 14, TS, Tailwind, framer-motion, zustand | Free protocol-builder tool. Deep-links to the WooCommerce store. Deployable to Vercel as `protocol.rojipeptides.com`. |
| [`roji-store/`](./roji-store) | WordPress + WooCommerce + Elementor | Storefront. This repo contains the `roji-child` child theme + a WP-CLI product seeder. Deploys onto an existing WP install (Hello Elementor parent theme required). |
| [`roji-ads-dashboard/`](./roji-ads-dashboard) | Next.js 14, TS, Tailwind, `google-ads-api` | Internal admin for Google Ads campaign management. Runs with mock data when env vars are missing. Deploys to `admin-ads.rojipeptides.com`. |

## Quick Start

```bash
# Protocol engine
cd roji-protocol && npm install && npm run dev

# Ads dashboard
cd roji-ads-dashboard && npm install && npm run dev

# WordPress child theme: see roji-store/README.md
```

## Design System (shared across all three)

Dark mode only. Inter for UI, JetBrains Mono for data. Indigo-blue accent.

```
--roji-black:   #0a0a0f   --roji-text:    #f0f0f5
--roji-dark:    #111118   --roji-muted:   #8a8a9a
--roji-card:    #16161f   --roji-dim:     #55556a
--roji-border:  rgba(255,255,255,0.06)
--roji-accent:  #4f6df5   --roji-accent-hover: #6380ff
```

## Required Credentials (out of scope for this repo)

These must be obtained and configured in each project's `.env` / `inc/config.php` before going live:

- **Google Ads**: developer token (apply at ads.google.com/api), OAuth client ID/secret, refresh token, customer ID, conversion ID + label.
- **Google Analytics 4**: GA4 measurement ID.
- **Payment processor**: AllayPay / Durango / Corepay account + WooCommerce gateway plugin.
- **Crypto backup**: Coinbase Commerce or NOWPayments account + plugin.
- **Hosting**: Kinsta / Cloudways for WordPress; Vercel for the two Next.js apps.
- **Domains**: `rojipeptides.com`, `protocol.rojipeptides.com`, `admin-ads.rojipeptides.com`.
- **Elementor Pro license** ($59/yr).
- **WooCommerce product IDs**: set in [`roji-store/roji-child/inc/config.php`](./roji-store/roji-child/inc/config.php) after running the product seeder.

## Compliance Notes

All product/marketing copy MUST avoid: health claims, therapeutic language, human-use implications, "heals", "treats", "cures", "dosing for humans", "inject". Use "research compound", "laboratory use", "published literature suggests" instead.

Google Ads copy MUST avoid: "peptide", compound names (BPC-157, TB-500, etc.), "injection", "dosing", "healing". The Ads dashboard's [`safety.ts`](./roji-ads-dashboard/src/lib/safety.ts) enforces this on `createCampaign`.

Every product page, cart, and checkout shows a research-use-only disclaimer; checkout requires a mandatory `research_use_confirm` checkbox. Site footer carries the FDA / 21+ disclaimer on every page.

## Out of Scope (require user action)

- Provisioning a real WordPress install (LocalWP / Kinsta / Cloudways).
- Purchasing/installing the Elementor Pro license.
- Signing up with payment processors and obtaining API credentials.
- Obtaining a Google Ads developer token + OAuth refresh token.
- DNS configuration for the three subdomains.
- Vercel deployment of the two Next.js apps (code is deploy-ready).
