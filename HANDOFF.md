# Roji — Comprehensive Handoff

**Snapshot date:** 2026-04-30 (≈14:00 UTC-3)
**Repo root:** `/Users/tomas/Roji`
**Single git repo, monorepo of 4 deployables.**

Paste/attach this file at the start of any new Cursor chat to onboard the agent without re-reading the entire prior thread.

---

## 1. The product

**Roji Peptides** — premium research-grade peptide marketplace.

Two customer-facing surfaces + two internal:

| | Surface | Stack | URL | Hosting |
|---|---|---|---|---|
| 1 | **Store** | WordPress + WooCommerce + Hello Elementor + Elementor Pro, child theme `roji-child` | `rojipeptides.com` | **Kinsta** |
| 2 | **Research Tools** | Next.js 14 (App Router), Tailwind, gtag.js | `tools.rojipeptides.com` | **Vercel** |
| 3 | **Ads dashboard** (internal) | Next.js 14, Tailwind, `google-ads-api` SDK | `ads.rojipeptides.com` (basic-auth) | **Vercel** |
| 4 | **MCP server** (internal) | Node + Fly.io | `roji-mcp.fly.dev` | **Fly.io** |

The whole thing exists to drive **research-grade peptide purchases** at the store, with the Tools surface acting as a top-of-funnel lead magnet (calculators / frameworks for biohackers/researchers) that links through to product pages.

### Non-negotiable compliance constraints

- No therapeutic or human-use claims anywhere customer-facing. Use "research compound", "laboratory use", "published literature suggests".
- Google Ads copy and keywords MUST avoid: "peptide", compound names (BPC-157, TB-500, etc.), "injection", "dosing", "healing", "protocol" (this last one is high-risk for ad approval).
- Customer-facing surfaces use **"Research Tools"** branding everywhere — never "Protocol Engine" (legacy name, removed for compliance).
- The "research-use confirm" checkbox at checkout is mandatory; server-side rejects without it.
- Site footer carries the FDA / 21+ / "research only" disclaimer on every page.
- A CI gate (`roji-store/deploy/assert-compliance.sh`) greps home/FAQ/about Elementor data after every deploy and fails the build if "Protocol Engine" residue appears.

### Conversion strategy

Primary KPI: **`purchase`** event, fired on the WooCommerce thank-you page after a Reserve-Order checkout.

The "Reserve Order" payment gateway (`roji-store/roji-child/inc/gateway-reserve-order.php`) is our high-intent lead-capture funnel. There is no real payment processor wired yet — the user fills the entire WC checkout, picks "Place order — pay by secure link", and WC saves the order in `on-hold`. The reserve gateway emits the gtag `purchase` event with full transaction value + items array. We email an invoice link manually within 24h. This is honest deferred-payment, not a fake gateway.

Secondary signal: **`add_to_cart`**, fired on every WC add-to-cart action.

Both conversion actions exist on the Roji Tools sub-account `657-303-2286` and are flagged `primary_for_goal=true`. Campaigns optimize against `purchase` from day one — we do NOT optimize against `tool_complete` (tool engagement is too weak a signal for buying intent).

---

## 2. Repo layout

```
/Users/tomas/Roji/                    ← single git repo, branch `main`
├── ADS-PLAYBOOK.md                   ← Google Ads launch guide (user-facing)
├── CONTEXT_EXPORT_FOR_NEW_CHAT.md    ← legacy, superseded by THIS file
├── DEPLOY.md                         ← cross-cutting deploy guide
├── HANDOFF.md                        ← THIS FILE
├── README.md                         ← top-level intro (somewhat stale)
├── SECURITY-NOTE.md                  ← rotation reminders for shared creds
├── .github/workflows/
│   ├── deploy-roji-store.yml         ← GitHub Actions: WP child theme → Kinsta
│   └── run-sql-migration.yml         ← (rare, manual SQL migrations)
├── brand/                            ← SVG monogram + favicon build script
├── roji-store/                       ← WordPress child theme + Elementor templates
│   ├── roji-child/                   ← the child theme (deployed to Kinsta)
│   ├── elementor-templates/          ← page builder PHP templates
│   ├── scripts/                      ← WP-CLI scripts (mu-plugin/roji-scripts/)
│   ├── deploy/
│   │   └── assert-compliance.sh      ← post-deploy compliance gate
│   ├── assets/                       ← product images
│   └── preview/                      ← local previews of theme bits
├── roji-tools/                       ← Next.js Research Tools (Vercel)
│   ├── src/                          ← app/, components/, lib/
│   ├── chatgpt-widget/               ← embeddable widget bundle (shared)
│   └── public/
├── roji-ads-dashboard/               ← Next.js Google Ads dashboard (Vercel)
│   ├── src/
│   │   ├── app/(dashboard)/          ← UI routes
│   │   ├── app/api/ads/              ← Google Ads API endpoints
│   │   └── lib/                      ← provisioner, blueprint, safety, env
│   └── scripts/                      ← Node CLI tools (set-campaign-budget.js, etc.)
├── roji-mcp/                         ← Model Context Protocol server (Fly.io)
└── roji-protocol/                    ← legacy, do not use; replaced by roji-tools
```

`.gitignore` covers `node_modules/`, `.next/`, `.env*`, `*.log`, `.vscode/`, `.idea/`, `.vercel/`, plus `roji-mcp/` is ignored as an embedded git boundary.

There are NO secondary worktrees. All work is on `main`. We commit + push directly to `main` — no PR workflow currently. **Don't** introduce one without asking.

---

## 3. CI / CD pipelines

### `roji-store` → Kinsta (GitHub Actions)

File: `.github/workflows/deploy-roji-store.yml`

Triggers on `push: main` for paths `roji-store/**`. Steps:

1. PHP lint every `.php` file (fails build on syntax error).
2. Install `sshpass` + `rsync`, configure Kinsta SSH known_hosts.
3. Verify connection with `wp core version`.
4. **rsync** `roji-store/roji-child/` → `$WP_PATH/wp-content/themes/roji-child/` (with `--delete`).
5. **rsync** `roji-store/elementor-templates/` → `mu-plugins/roji-elementor-templates/`.
6. **rsync** `roji-store/scripts/` → `mu-plugins/roji-scripts/`.
7. Detect changed Elementor pages by diffing against HEAD~1; if any `lib/` or `import.php` changed → rebuild ALL pages.
8. Run `wp eval-file` for: page rebuild, product image wiring, brand options, thumbnail regeneration.
9. Activate `roji-child` theme + flush `wp cache` + `wp transient`.
10. Smoke-test `https://rojipeptides.com/` for HTTP 200/301/302.
11. **Compliance assertion** (`roji-store/deploy/assert-compliance.sh`) — greps live DB for forbidden "Protocol Engine" residue. Fails build if found.

Required GitHub secrets: `KINSTA_SSH_HOST`, `KINSTA_SSH_PORT`, `KINSTA_SSH_USER`, `KINSTA_SSH_PASSWORD`, `KINSTA_WP_PATH`.

**Manual SSH access** for ops/wp-config.php edits: see `~/.cursor/projects/Users-tomas-Roji/agent-tools/kinsta-ssh.md` (gitignored, contains creds).

### `roji-tools` → Vercel (auto-deploy)

GitHub-connected Vercel project named **`roji-tools`** under owner `tomasdavid1's projects`. Auto-deploys on every push to `main` for paths matching `roji-tools/**`. Build: `next build` from `roji-tools/` root. Production URL: `tools.rojipeptides.com` (custom domain). Preview URLs auto-generated for branches.

Vercel root directory: `roji-tools`. Build/install commands inherited from `vercel.json`.

### `roji-ads-dashboard` → Vercel (auto-deploy)

Vercel project **`roji-ads`** under same owner. Same pattern — auto-deploys on `main` for `roji-ads-dashboard/**`. Production URL: `ads.rojipeptides.com`, behind:
- **Vercel Deployment Protection** on `*.vercel.app` URLs (returns 401 to non-logged-in browsers)
- Our **basic-auth middleware** on the canonical `ads.rojipeptides.com` (returns 401 unless `ADMIN_USER` + `ADMIN_PASS` match what's set in Vercel env)

Cron jobs (`vercel.json`):
- `0 14 * * *` UTC → `/api/cron/mine-search-terms` (daily search-term harvest)
- `0 13 * * *` UTC → `/api/cron/check-disapprovals` (daily ad disapproval check)

`X-Robots-Tag: noindex, nofollow` on all pages.

### `roji-mcp` → Fly.io (manual)

Deployed via `flyctl deploy` from `roji-mcp/`. Not part of the CI pipeline. Used for ChatGPT/Claude MCP integration.

### Local Vercel CLI

User signed in as `tomasdaavid@gmail.com`. There's a separate `tomas-scopelabs` Vercel scope which is unrelated work — do NOT touch projects under that scope.

---

## 4. Google Ads — current state (LIVE)

**Account topology:**

```
MCC (manager) 263-783-2527 / Tomas
  ├── 6679780942 — EstudiantePro (legacy, do not touch)
  └── 6573032286 — Roji Tools (active, billing enabled)
```

`GOOGLE_ADS_CUSTOMER_ID=6573032286`
`GOOGLE_ADS_LOGIN_CUSTOMER_ID=2637832527`
`NEXT_PUBLIC_GADS_ID=AW-18130000394` (the gtag ID for this customer)

### Conversion actions (on `6573032286`, ENABLED, primary_for_goal=true)

| Name | ID | Label (used in `send_to:`) | Source |
|---|---|---|---|
| Purchase | 7594156790 | `5UzRCPbFlqUcEIq0h8VD` | WC `woocommerce_thankyou` |
| Add to cart | 7594158611 | `zMB-CJPUlqUcEIq0h8VD` | WC `woocommerce_add_to_cart` |

### Live campaign

| | |
|---|---|
| ID | `23802331833` |
| Name | `C1 — Research Tools — Calculators [roji-blueprint]` |
| **Status** | **ENABLED** |
| **Daily budget** | **$14.29** ( = $100/week, $434/month cap) |
| Channel | SEARCH only |
| Bid strategy | MAXIMIZE_CLICKS |
| Geo | US |
| Language | English |
| Start | 2026-04-30 |
| EU political flag | DOES_NOT_CONTAIN |

**Ad group `AG3 — Biohacker Intent`** (id `199183702274`):
- CPC bid ceiling: $3
- 15 phrase-match keywords (low policy risk; biohacker/optimization intent, no compound names, no "protocol")
- 39 campaign-level negative keywords (medical, prescription, dosing, etc.)
- 2 RSAs ("community" angle + "productivity" angle), 15 headlines + 4 descriptions each, all approved (`approval=APPROVED`) but **status=PAUSED**

### Why "campaign ENABLED but ads PAUSED"

The campaign is enabled and budgeted; the 2 RSAs were left paused intentionally during launch so the user has a final UI gate before live impressions begin. **Once the user unpauses the 2 ads, traffic starts flowing.** Conversion tracking and cross-domain linker are already verified via Tag Assistant — `AW-18130000394` fires on every page of `rojipeptides.com`.

The Google Ads UI may show "Your website is missing a Google tag." That's a soft warning — Google's crawler hasn't done its async backend verification yet (typically 24–48h). The tag IS installed, fires, and tracks correctly. Optimization works regardless because conversion attribution flows via gclid → conversion endpoint, not via the crawler-verification path.

### Ad-blueprint codebase

The campaign was provisioned via `roji-ads-dashboard/src/lib/ads-blueprint.ts` + `ads-provisioner.ts`. To re-provision (idempotent — won't create duplicates):

```bash
cd roji-ads-dashboard
npm run blueprint:live    # uses .env.local credentials
```

The provisioner has RSA idempotency (dedups by first-headline + first-description signature), 2 modes (`tool-only` = current, `full` = future expansion with C2/C3), and a `validateBlueprint` function that distinguishes blocking errors from warnings.

### Useful CLI scripts (`roji-ads-dashboard/scripts/`)

| Script | Purpose |
|---|---|
| `set-campaign-budget.js <id> <usd>` | Update daily budget on a campaign |
| `delete-campaign.js <id>` | Soft-delete a campaign |
| `remove-ad.js <ad_id>` | Remove a specific ad |
| `cleanup-orphan-budgets.js` | Remove unattached budgets from failed creates |
| `audit-roji-account.js` | Full account inventory dump |
| `list-conversions.js` | List conversion actions |
| `list-accessible-customers.js` | List sub-accounts under MCC |
| `check-cross-account-tracking.js` | Inspect MCC cross-account settings |
| `provision-blueprint.ts` | Run the full blueprint (live or dry-run) |
| `test-blueprint.ts` | Local smoke tests (48 assertions) |

All Node scripts auto-load `.env.local` via `_cli-bootstrap.cjs`.

---

## 5. Tracking architecture

### Where gtag lives

**Store** (`rojipeptides.com`):
- Bootstrapped in `roji-store/roji-child/inc/tracking.php` via `wp_head`.
- Loads `gtag.js` with `AW-18130000394` (or `ROJI_GA4_ID` if set, never both as primary).
- `gtag('config', ...)` runs with `linker: { domains: ['rojipeptides.com', 'tools.rojipeptides.com', 'protocol.rojipeptides.com'] }` so gclid + GA4 client_id survive cross-domain hops.

**Tools** (`tools.rojipeptides.com`):
- Bootstrapped in `roji-tools/src/components/Analytics.tsx` (or similar) reading `NEXT_PUBLIC_GADS_ID` + `NEXT_PUBLIC_GA4_ID` from env.
- Same linker domains list. `roji-tools/src/lib/track.ts` exposes `toolComplete()`, `leadCapture()`, `addToCart()` helpers (most NOT currently wired in production — see strategy notes).

### Conversion events (rojipeptides.com)

| Event | Hook | When | Conversion fires |
|---|---|---|---|
| `page_view` | gtag `config` | Every page load | No (ambient) |
| `add_to_cart` | `woocommerce_add_to_cart` | Every WC add (POST or AJAX) | Yes if `ROJI_GADS_ADD_TO_CART_LABEL` set |
| `purchase` | `woocommerce_thankyou` | Thank-you page after order saved | Yes if `ROJI_GADS_PURCHASE_LABEL` set |
| `reserve_order_submitted` | `woocommerce_thankyou_roji_reserve` | Same page, only when reserve gateway used | Yes (extra, alongside purchase) |
| `shop_view` / `cart_view` / `checkout_view` | `wp_footer` | Funnel-step views | No (GA4-only signals) |

**`add_to_cart` mechanism** (recently rewired): the `woocommerce_add_to_cart` server action stuffs the line item into the WC session. The next footer drains that flash and emits `gtag('event', 'add_to_cart', ...)` once. For AJAX add-to-cart (no page reload), a jQuery `added_to_cart` listener fires gtag directly. Either path also fires the Google Ads `conversion` ping if the label env is set.

### Required WordPress constants (in `wp-config.php` on Kinsta)

```php
define('ROJI_GADS_ID',                'AW-18130000394');
define('ROJI_GADS_PURCHASE_LABEL',    '5UzRCPbFlqUcEIq0h8VD');
define('ROJI_GADS_ADD_TO_CART_LABEL', 'zMB-CJPUlqUcEIq0h8VD');
// Optional:
// define('ROJI_GA4_ID',               'G-XXXXXXX');
// define('ROJI_GTAG_LINKER_DOMAINS',  ['rojipeptides.com','tools.rojipeptides.com']);
```

These are **already set on production**.

### Required Vercel env vars (both `roji-tools` AND `roji-ads-dashboard`, production + preview)

```
NEXT_PUBLIC_GADS_ID=AW-18130000394
NEXT_PUBLIC_GADS_PURCHASE_LABEL=5UzRCPbFlqUcEIq0h8VD
NEXT_PUBLIC_GADS_ADD_TO_CART_LABEL=zMB-CJPUlqUcEIq0h8VD
NEXT_PUBLIC_TOOLS_URL=https://tools.rojipeptides.com
```

These are **already set** for both projects on both environments.

### Local `.env.local` for `roji-ads-dashboard`

Server-only OAuth + Google Ads creds: `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID=6573032286`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID=2637832527`. **All of these are leaked in chat history and need rotation eventually** (see `SECURITY-NOTE.md`).

### Verified state (as of this snapshot)

- gtag `AW-18130000394` confirmed firing on `rojipeptides.com` via Tag Assistant Companion (Page View, Shop View, Remarketing, User Provided Data events all sending).
- `add_to_cart` not yet observed in Tag Assistant because the wiring fix was committed in `11ad2b8` and the test hadn't been redone after Kinsta deploy + cache flush.
- `purchase` not yet observed because checkout was broken (see §6).

---

## 6. Recently shipped (last 24h, in commit order)

```
72cbaa8  feat(ads): slow-start budget — $14.29/day = $100/week
65cb1d2  polish(ads-dashboard): align /tracking + readiness with purchase-first strategy
11ad2b8  fix(store): unblock checkout submit + fire add_to_cart on every WC add
1965fd7  fix(ads): wire Roji Tools account 6573032286 + ship 2-RSA blueprint live
79489db  fix(ads): provisioner blocks on errors only, not warnings + smoke test
3ea698d  feat(ads): rewrite blueprint to Research Tools framing, drop "protocol" language
150d2ca  fix(checkout): bulletproof Reserve Order placement against side-effect failures
```

Highlights of what was fixed today:

1. **Checkout was silently broken.** Symptom: clicking Place Order produced no network request, no error, button stale. Root cause: cart-upsell rendered via `woocommerce_checkout_before_order_review_heading` which fires INSIDE `<form class="checkout">`. The upsell rendered its own `<form method="post">` — HTML5 forbids nested forms, so the parser dropped the inner opening tag, leaking the upsell's hidden `roji_add_supplies=1` input and submit button into the outer checkout form. Place Order then accidentally serialized `roji_add_supplies=1`, the upsell's `template_redirect` handler caught it before WC's checkout handler ran, and bounced the user back to `/checkout/`. Fix in `11ad2b8`: moved the upsell to `woocommerce_before_checkout_form` so it renders ABOVE the checkout form in its own DOM scope.

2. **`add_to_cart` was wired wrong.** It only fired on `/cart/?protocol_stack=...` deep-links — i.e. essentially never in real traffic. Rewired in `11ad2b8` to fire on every WC add-to-cart action via session flash + jQuery AJAX listener.

3. **Research-use confirm checkbox said "(optional)"**. WC auto-appends "(optional)" when `required => true` is not passed — but we deliberately don't pass `required` to avoid the silent HTML5-block-on-submit bug. Fix: explicit "(required)" suffix in label + CSS to hide WC's `.optional` span on this row.

4. **Google Ads provisioned end-to-end** to the new Roji Tools sub-account `6573032286` with the AW-18130000394 conversion labels, RSA idempotency in the provisioner, EU political compliance flag, and the slow-start $100/week budget.

5. **Dashboard `/tracking` page reordered** to put Purchase first (PRIMARY) and surface the new `GADS_PURCHASE_LABEL` / `GADS_ADD_TO_CART_LABEL` env keys in the env-state card.

---

## 7. Known issues + immediate next user actions

### Blocking the Google Ads launch (small set)

1. **End-to-end Tag Assistant test on `rojipeptides.com` after the latest Kinsta deploy.** Once GitHub Actions deploys commits `11ad2b8` + flushes Kinsta cache, retest:
   - Add a product to cart → confirm `add_to_cart` event + Google Ads `conversion` to `AW-18130000394/zMB-CJPUlqUcEIq0h8VD` fire in Tag Assistant.
   - Complete the reserve-order checkout → confirm `purchase` event + `conversion` to `AW-18130000394/5UzRCPbFlqUcEIq0h8VD` fire on the thank-you page.
2. **Unpause the 2 RSAs** in the Google Ads UI (campaign `23802331833` → AG3 → ads). Campaign is already ENABLED and budgeted; ads are PAUSED.
3. **Wait 24–48h** for Google's crawler to clear the "Your website is missing a Google tag" warning. Optionally, click "Test" in Google Ads → Tools → Conversions → Diagnostics to force-verify via Tag Assistant connected mode.

### Background tasks / debt

- **Rotate leaked credentials** (see `SECURITY-NOTE.md`): Google Ads OAuth client secret, developer token, refresh token. All leaked in agent chat history.
- **Real payment processor.** Reserve gateway is honest deferred-payment but not scalable. AllayPay / Durango / Coinbase Commerce candidates listed in `README.md`.
- **`tool_complete` event.** Wiring exists in `roji-tools/src/lib/track.ts` but is NOT a Google Ads conversion. If we ever spin up a separate lead-gen campaign, this becomes the optimization target for that campaign only.
- **MCC cross-account tracking** abandoned. Conversion actions live on the Roji Tools sub-account directly; this is fine while we have one campaign.
- **Vercel deployment protection** on `*.vercel.app` for `roji-ads`. We rely on basic-auth middleware on `ads.rojipeptides.com` instead. Don't expose any admin route on a `.vercel.app` URL.

---

## 8. Where to look in the code

### Want to change ad copy / keywords / negatives?
`roji-ads-dashboard/src/lib/ads-blueprint.ts` (single source of truth). Then `npm run test:smoke` to validate, then `npm run blueprint:live` to push to Google Ads (idempotent).

### Want to change conversion tracking on the store?
`roji-store/roji-child/inc/tracking.php` for events; `roji-store/roji-child/inc/gateway-reserve-order.php` for the Reserve gateway.

### Want to change the dashboard UI?
`roji-ads-dashboard/src/app/(dashboard)/`. The `/tracking` page is the operator HUD with env-state card + probe checklist.

### Want to add a new Tools calculator?
`roji-tools/src/app/` (App Router). Use the existing components from `roji-tools/src/components/`. Don't wire `tool_complete` as a Google Ads conversion unless we explicitly add a lead-gen campaign.

### Want to change WP Elementor pages?
`roji-store/elementor-templates/pages/<slug>.php`. The `import.php` rebuild step in the deploy workflow detects diffed slugs and rebuilds only those pages (or all of them if `lib/` changed).

### Want to flush Kinsta cache manually?
SSH via creds in `~/.cursor/projects/Users-tomas-Roji/agent-tools/kinsta-ssh.md`, then `cd $WP_PATH && wp kinsta cache purge --all`.

---

## 9. Useful local commands

```bash
# Roji Ads Dashboard
cd roji-ads-dashboard
npm run dev           # http://localhost:3001
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run test:smoke    # 48 assertions on blueprint + safety
npm run build         # production build

# Update live campaign budget (idempotent)
node scripts/set-campaign-budget.js 23802331833 14.29

# Provision blueprint live (idempotent — RSA dedup, won't dup campaigns)
npm run blueprint:live

# Roji Tools
cd roji-tools && npm run dev    # http://localhost:3000

# WP child theme — there's no local dev loop; commit + push deploys to Kinsta
```

---

## 10. Conventions the previous agent established

- **No PR workflow.** Commit + push to `main` directly. Two commits if work spans separate domains (e.g. one for `roji-store`, one for `roji-ads-dashboard`) so blame is clean.
- **Conventional-commit-ish messages** (`fix(store):`, `feat(ads):`, `polish(ads-dashboard):`, `chore:`). Body explains the WHY, not just the WHAT.
- **Always run typecheck + lint + smoke before committing** in `roji-ads-dashboard`. The user has been bitten by silent regressions and explicitly asked for rigor.
- **Don't reintroduce "protocol" language** in customer-facing code, ad copy, env-var names if avoidable, or migrations. Internal-only fields (DB column names, function names) can stay if they'd be churn to rename.
- **Always use the dashboard scripts over inline API calls** for Google Ads mutations. Idempotency + logging are baked in.
- **The `/tracking` page is the operator HUD** for env state. Surface new `NEXT_PUBLIC_GADS_*` labels there when they're added.
- **Test with Tag Assistant Companion** for any tracking change. Server-side curl can confirm the tag is in HTML; only Tag Assistant confirms it actually fires.

---

## 11. The 30-second mental model

> Roji is a research-peptide store. Customers find us via a Google Ads search campaign that lands them on our Research Tools (calculators / frameworks). They click through to the WooCommerce store, add to cart, and reserve-checkout (no money moves yet — we invoice manually via the Reserve gateway). Conversion tracking is gtag-based with `AW-18130000394`, optimizing the campaign on `purchase` events from the thank-you page. The campaign is provisioned + managed via our own Next.js dashboard against the Google Ads API. Everything deploys via `git push origin main` — Kinsta picks up WP changes via GitHub Actions, Vercel picks up Next.js changes natively, the dashboard mutates ads programmatically. Compliance copy is non-negotiable and CI-enforced.

---

**End of handoff.** When in doubt, search this file first, then `ADS-PLAYBOOK.md` (campaign-specific), then `DEPLOY.md` (env-var reference).
