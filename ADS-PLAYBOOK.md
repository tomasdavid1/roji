# Roji Ads — Launch Playbook

The strategy doc describes the destination. This is the runbook to get there. It is keyed to the actual code that lives in this repo as of the **2026 Research Tools rewrite**.

---

## TL;DR — what to actually do, in order

1. **You already have Explorer Access.** That gives the developer token 2,880 mutate-ops/day against production accounts — more than enough.
2. **Create the conversion actions** (10 minutes in the Google Ads UI) — see [§ Conversion actions](#conversion-actions) below. Optimize against `purchase`, secondary on `add_to_cart`. No `tool_complete` (we tried; tool engagement is a poor proxy for buying intent).
3. **Verify `ROJI_GADS_*` constants** exist in Kinsta `wp-config.php`. The reserve-order funnel + `purchase` conversion are fully wired in `roji-store/roji-child/inc/tracking.php` — you just need the labels populated.
4. **Walk the funnel yourself** with Tag Assistant Companion: tools.rojipeptides.com → use a calculator → click through to store → add to cart → checkout → place reserve order. Confirm `purchase` + `conversion` events fire on the thank-you page.
5. **Dry-run the blueprint** locally:

   ```bash
   cd roji-ads-dashboard
   npm run blueprint:dryrun                       # tool-only (recommended first)
   npm run blueprint:dryrun -- --mode full        # full (Brand Defense + 2 ad groups)
   ```
6. **Provision live (PAUSED).** Hit the button on `/campaigns` (or `npm run blueprint:live`). Review every campaign / ad group / RSA in the Google Ads UI, then enable.

---

## The funnel we're optimizing for

```
Google Ads click (Search, US-only)
  ↓
tools.rojipeptides.com (calculator landing page)         [tool_view event]
  ↓
User uses calculator                                      [<tool>_<action> event]
  ↓
User clicks "Get this stack" / store CTA                  [store_outbound_click + _gl param]
  ↓
rojipeptides.com (with gclid preserved)                   [shop_view / product_view]
  ↓
Add product to cart                                       [add_to_cart event + GAds conversion]
  ↓
Checkout (standard WC flow, billing/shipping)             [checkout_view]
  ↓
"Place order — pay by secure link" (Reserve gateway)
  ↓
Order saved on-hold, customer told truthfully
"we'll email you a secure payment link within 24h —
nothing has been charged today"
  ↓
Thank-you page                                            [purchase event + GAds conversion]
                                                          [reserve_order_submitted event]
                                                          ← THIS is what Google Ads optimizes against
```

**Why optimize on `purchase` even though no money changes hands yet?** Google Ads doesn't know whether a card was charged — it just knows a `conversion` event fired with a `value`. The reserve-order signal is high-quality: people who fill in real shipping info + commit to a stack are very different from tire-kickers who poke a free calculator. We get real lead intent + Google Ads gets a clean optimization target. Once a payment processor is wired, we keep the same conversion event but the orders flip from "on-hold" to "completed" — no Ads-side change needed.

---

## What's wired in this repo

### Tools surface (`roji-tools` → tools.rojipeptides.com)

| Behavior | Where | Triggered by |
| --- | --- | --- |
| `gtag.js` bootstrap with cross-domain linker | (Vercel framework auto-injects via env-driven config; verify via `/tracking` page) | `NEXT_PUBLIC_GADS_ID` and/or `NEXT_PUBLIC_GA4_ID` |
| Per-tool engagement events (`recomp_calculated`, `bloodwork_panel_saved`, `coa_analyzed`, `recon_preset_click`, `research_search`, `ai_message_sent`, `notify_me_submit`, etc.) | `roji-tools/src/components/*` via `track()` from `lib/track.ts` | User actions inside each calculator |
| `tool_view` | `<ToolView/>` mounts on every tool page | Page mount |
| `store_outbound_click` | `PageChrome` StoreCTA + various inline CTAs | Click on a store-bound button |
| `toolComplete()` helper | `lib/track.ts` | **NOT WIRED.** Available for future soft-conversion campaigns. Don't use as primary optimization target. |

Set on Vercel (project: `roji-tools`):

```
NEXT_PUBLIC_GADS_ID=AW-18130000394
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTAG_LINKER_DOMAINS=rojipeptides.com,tools.rojipeptides.com
```

No conversion labels are needed on the tools side — `tools.rojipeptides.com` doesn't fire any Google Ads conversions itself. It just emits GA4 events and passes the gclid via the linker.

### Storefront (`roji-store/roji-child` → rojipeptides.com)

| Behavior | Where | Triggered by |
| --- | --- | --- |
| `gtag.js` bootstrap + cross-domain linker (rojipeptides.com ↔ tools.rojipeptides.com ↔ legacy protocol.rojipeptides.com) | `inc/tracking.php` lines 22-59 | `ROJI_GADS_ID` and/or `ROJI_GA4_ID` defined |
| `shop_view` / `product_view` / `cart_view` / `checkout_view` GA4 events | `inc/tracking.php` lines 141-201 | Page-context detection |
| `add_to_cart` GA4 + GAds conversion | `inc/tracking.php` lines 68-123 | URL has `?protocol_stack=...` deep-link from Tools |
| `purchase` GA4 + GAds conversion | `inc/tracking.php` lines 208-255 | `woocommerce_thankyou` (any payment method, including Reserve) |
| Reserve-order WC payment gateway | `inc/gateway-reserve-order.php` | Customer picks "Place order — pay by secure link" |
| `reserve_order_submitted` GA4 event (rich, with order_id + value + items_count + autoship flag) | `gateway-reserve-order.php` `roji_reserve_print_pixel` | Reserve-order thank-you page |
| UTM capture into WC session + order meta | `gateway-reserve-order.php` `roji_reserve_capture_utms` + `roji_reserve_persist_funnel_context` | Every page load (first-touch wins) |
| Validation email digest to ops on every reserve order | `gateway-reserve-order.php` `roji_reserve_send_validation_email` | Async via `wp_schedule_single_event` |
| WP-CLI: `wp roji reserve:list`, `wp roji reserve:counts` | `gateway-reserve-order.php` lines 503-562 | Manual ops |

Set in `wp-config.php` on Kinsta:

```php
define( 'ROJI_GADS_ID', 'AW-18130000394' );
define( 'ROJI_GADS_PURCHASE_LABEL', '5UzRCPbFlqUcEIq0h8VD' );      // required to fire purchase conversion
define( 'ROJI_GADS_ADD_TO_CART_LABEL', 'zMB-CJPUlqUcEIq0h8VD' );   // optional, secondary signal
define( 'ROJI_GA4_ID', 'G-XXXXXXXXXX' );
// Override only when testing non-prod cross-subdomain pairs:
// define( 'ROJI_GTAG_LINKER_DOMAINS', array( 'staging.rojipeptides.com', 'tools-staging.rojipeptides.com' ) );
```

### Ads dashboard (`roji-ads-dashboard` → ads.rojipeptides.com)

| Surface | Path |
| --- | --- |
| **Provisioner UI** ("Provision from Blueprint" card) | `/campaigns` |
| **Tracking checklist** (probes, env state, Tag Assistant guide) | `/tracking` |
| **Search-terms mining** (auto-flag risky terms) | `/search-terms` |
| **Disapproval auto-pause** | `/disapprovals` |
| **Performance** (KPI dashboard) | `/performance` |
| **Readiness JSON** | `GET /api/ads/readiness` |
| **Blueprint preview** (dry-run JSON) | `GET /api/ads/blueprint/provision?mode=tool-only` |
| **Blueprint provision** (live or dry) | `POST /api/ads/blueprint/provision` body `{ mode, dry_run }` |
| **Daily cron: search-terms mining** | `vercel.json` → `/api/cron/mine-search-terms` (14:00 UTC) |
| **Daily cron: disapproval auto-pause** | `vercel.json` → `/api/cron/check-disapprovals` (13:00 UTC) |

Set on Vercel (project: `roji-ads`):

```
# Server-side (required for live mutations)
GOOGLE_ADS_DEVELOPER_TOKEN=...                    # Explorer Access — got it
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...                      # via scripts/get-refresh-token.js
GOOGLE_ADS_CUSTOMER_ID=6573032286                 # Roji Tools (657-303-2286), no dashes
GOOGLE_ADS_LOGIN_CUSTOMER_ID=2637832527           # MCC (263-783-2527), no dashes

# Client-side (display + tracking-page checks only)
NEXT_PUBLIC_GADS_ID=AW-18130000394
NEXT_PUBLIC_GADS_PURCHASE_LABEL=5UzRCPbFlqUcEIq0h8VD
NEXT_PUBLIC_GADS_ADD_TO_CART_LABEL=zMB-CJPUlqUcEIq0h8VD
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_TOOLS_URL=https://tools.rojipeptides.com
# Legacy NEXT_PUBLIC_PROTOCOL_URL is still honored as a fallback.

# Cron auth (required in production)
CRON_SECRET=$(openssl rand -hex 32)
```

### Blueprint structure

`roji-ads-dashboard/src/lib/ads-blueprint.ts` codifies the strategy. **All "protocol" framing has been removed** to comply with our deploy gate (`roji-store/deploy/assert-compliance.sh`) and to reduce Google Ads policy-review risk. Replaced with "Research Tools" / "calculator" / "framework" / "planner" language.

**Tool-only mode** (`--mode tool-only`):

- 1 campaign · 1 ad group (Biohacker Intent) · 15 keywords · 1 RSA · 39 campaign-level negatives
- Daily budget: $30
- Lands on `tools.rojipeptides.com`
- Bid strategy: `MAXIMIZE_CLICKS` (data collection mode until 30+ purchases land)
- All resources start `PAUSED`

**Full mode** (`--mode full`):

- 2 campaigns · 3 ad groups · 37 keywords · 5 RSAs · 39 negatives
- Daily budget: $47 ($40 search + $7 brand)
- Campaigns: `C1 — Research Tools — Search` (calculator-intent + biohacker-intent ad groups) + `C3 — Brand Defense`
- The compound-specific Ad Group 2 from the original strategy doc is **omitted by default** — add it manually only after Ad Group 1 is clean for 7+ days.

Both modes pass the safety validator (`src/lib/safety.ts`) which:

- **Errors** on: `peptide`, compound names (BPC-157, TB-500, CJC-1295, Ipamorelin, MK-677, Ibutamoren, Sermorelin, GHRH), human-use language (inject/dosing), therapeutic claims (heal/cure/treat/therapy), prescription, weight-loss, anti-aging.
- **Warns** on: `protocol`, `cycle` (compliance drift, elevated review risk).
- Walks **both ad copy and keywords** (previously only walked copy — the rewrite caught and fixed this gap).
- Brand-defense ad groups carry `allowBrandTerms: true` so "Roji Peptides" passes the `peptide` check.

---

## <a id="conversion-actions"></a>Conversion actions — set up in Google Ads UI

You don't need the API for these. Create them in **Tools → Conversions → New conversion action → Website**:

### 1. `purchase` — primary conversion target

| Field | Value |
| --- | --- |
| Goal | **Purchase** |
| Value | Use different values for each conversion (passed by gtag) |
| Default value | `0.00` USD (placeholder) |
| Count | **Every** |
| Click-through window | **90 days** |
| View-through window | 1 day |
| Attribution model | Data-driven (or Last click if not yet available) |
| Include in "Conversions" | ✅ Yes |
| Primary or Secondary | **Primary** |

> Fires on the WC thank-you page for every order — including Reserve orders. Until a payment processor is wired, every conversion is a high-intent reserved lead.

### 2. `add_to_cart` — secondary funnel signal

| Field | Value |
| --- | --- |
| Goal | **Add to cart** |
| Value | Use different values for each conversion |
| Count | **Every** |
| Click-through window | 30 days |
| Include in "Conversions" | ❌ No (don't optimize against this — too noisy) |
| Primary or Secondary | **Secondary** |

> Fires when a user lands on the cart page via a tools deep-link (`?protocol_stack=...`). Useful for funnel debugging on `/performance`.

### Skip these for now

- ~~`tool_complete`~~ — we considered it; tool engagement is a poor proxy for buying intent. The `toolComplete()` helper exists in `roji-tools/src/lib/track.ts` for future use.
- ~~`lead_capture`~~ — only relevant if we ever flip Tools into a purely lead-gen mode (not the current funnel).

### After creating the actions

1. **Enable Enhanced Conversions for Web** (Tools → Conversions → Settings → Enhanced conversions → Google tag method).
2. Click into the `purchase` action → **Tag setup → Use Google tag** → copy the **conversion label** (the chunk after `/` in `AW-XXXXXXXXXX/abc123def`).
3. Paste into `wp-config.php`:
   ```php
   define( 'ROJI_GADS_ID', 'AW-18130000394' );
   define( 'ROJI_GADS_PURCHASE_LABEL', '5UzRCPbFlqUcEIq0h8VD' );
   define( 'ROJI_GADS_ADD_TO_CART_LABEL', 'zMB-CJPUlqUcEIq0h8VD' );
   ```
4. (Both `purchase` and `Add to cart` labels above are already pulled from the Roji Tools account `657-303-2286`.)
5. Deploy the WP change (or just SFTP-edit `wp-config.php` since it's not in version control).

---

## Day-by-day launch sequence

### Day 0 — pre-flight

```bash
# Dashboard build sanity
cd roji-ads-dashboard
npm run typecheck && npm run lint && npm run build

# Blueprint dry-run — eyeball what would be created
npm run blueprint:dryrun                # tool-only
npm run blueprint:dryrun -- --mode full # full
```

Confirm:
- Both modes report **`Validation: ✓ clean (no errors, no warnings)`**.
- Final URLs are `https://tools.rojipeptides.com` (calculator ad groups) and `https://rojipeptides.com` (brand-defense ad group only).

### Day 1 — Google Ads conversion actions

In the Google Ads UI, create the two conversion actions per [§ Conversion actions](#conversion-actions). Paste the `purchase` label into Kinsta `wp-config.php`. Deploy.

### Day 2 — end-to-end funnel walkthrough

1. Open Chrome with [Tag Assistant Companion](https://chromewebstore.google.com/detail/tag-assistant-companion/jmekfmbnaedfebfnmakmokmlfpblbfdm) installed.
2. Visit https://tools.rojipeptides.com/recomp.
3. Use the calculator (change any input). **Tag Assistant should show `tool_view` and `recomp_calculated`.**
4. Click any store-bound button. **Should show `store_outbound_click`** + the destination URL on rojipeptides.com should have a `_gl=...` query param.
5. On rojipeptides.com: add a product to cart. **Should show `cart_view`**, plus `add_to_cart` if you arrived via a deep-link with `?protocol_stack=`.
6. Proceed to checkout, fill billing/shipping, pick **"Place order — pay by secure link"**, submit.
7. On the thank-you page:
   - Tag Assistant should show **`purchase` event** with `transaction_id`, `value`, `currency`, `items`.
   - Tag Assistant should show **`conversion` event** with `send_to: AW-XXXXXXXXXX/<purchase label>`.
   - Tag Assistant should show **`reserve_order_submitted` event** with order_id + value + items_count.
   - The thank-you page UI should show the blue "Order received — payment link on the way. Nothing has been charged today." block.
8. Check your inbox — you should receive both the standard WC new-order email AND the `[Roji RESERVED]` validation digest.

If anything in steps 3-7 doesn't fire, **stop and fix before going further**. Don't spend ad money on a broken funnel.

### Day 3 — provision the campaigns (PAUSED)

```bash
cd roji-ads-dashboard
npm run blueprint:dryrun                # one final preview
npm run blueprint:live                  # creates everything PAUSED
```

Or use the dashboard UI: `/campaigns` → "Provision live (PAUSED)" on the BlueprintCard.

### Day 4 — review in Google Ads UI

Open Google Ads. You should see:

- One campaign: `C1 — Research Tools — Calculators [roji-blueprint]` ($30/day, paused)
- One ad group: `AG3 — Biohacker Intent` (paused)
- 15 phrase-match keywords
- 1 RSA (15 headlines + 4 descriptions)
- 39 campaign-level negative keywords

**Manual review checklist before un-pausing:**

- [ ] Final URL is `https://tools.rojipeptides.com`, not the store.
- [ ] Geo target: United States only.
- [ ] Network: Google Search only (no Search Partners, no Display).
- [ ] No "protocol", no compound names, no therapeutic claims in any headline/description.
- [ ] Bid strategy: Maximize Clicks.
- [ ] Conversion goals: `purchase` set as primary; `add_to_cart` secondary; nothing else.

When happy: enable the campaign.

### Day 5-6 — first hours of traffic

- Watch the dashboard `/disapprovals` page. Any disapproved ad gets auto-paused by the daily cron (or manually via the page button).
- Check `/search-terms` → "Risky terms" tab daily. Review and add to negatives (the cron does this automatically; the UI is for spot-checks).
- Watch the conversion column on `/performance`. Expect zero conversions in the first 24h while traffic builds.

### Day 7-14 — readout and iterate

Calculate:
- **CTR**: target 3-6% per the strategy doc.
- **Cost per reserved-order**: under $30 is good for a research tool with no commerce yet. Under $15 is great.
- **Disapproval rate**: should be ≤ 5%.
- **Funnel drop-off** (from `/performance`): tool_view → store_outbound_click → cart_view → checkout_view → purchase. Find the biggest leak and fix it before scaling spend.

If lead-capture rate is healthy, scale to the full blueprint (`npm run blueprint:live -- --mode full`) — adds Brand Defense + the second ad group.

---

## Switching from reserve-orders to real payments

When a payment processor (AllayPay / Durango / Coinbase Commerce / Stripe High-Risk) is approved and wired:

1. **Storefront**: enable the new gateway in WC Settings → Payments. Optionally disable the Reserve-Order gateway, OR keep both (some customers may prefer the deferred path).
2. **Google Ads**: no changes needed — the same `purchase` conversion fires whether the order was paid or reserved. The `value` will be the same. Once 30+ "completed" orders land, switch the campaign bid strategy from `MAXIMIZE_CLICKS` → `MAXIMIZE_CONVERSIONS`. After 50+ completed orders, switch to `TARGET_CPA` with your computed CAC target.
3. **Blueprint**: re-run `npm run blueprint:live -- --mode full` to add Brand Defense + the second ad group on Campaign 1.

The blueprint provisioner is idempotent: re-running it doesn't duplicate campaigns (it looks them up by the `[roji-blueprint]` name suffix). Fresh ad-copy variants get appended on each run — useful when iterating.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Provisioner reports "Test mode" | Developer token still in Test Access | Should not happen — you have Explorer. If it does, re-check `GOOGLE_ADS_DEVELOPER_TOKEN` is the Explorer-tier one. |
| `purchase` event not firing | `ROJI_GADS_ID` or `ROJI_GADS_PURCHASE_LABEL` not defined in `wp-config.php` | Define both, redeploy. |
| `purchase` fires but Google Ads shows no conversions | Conversion action not yet active in Google Ads | First conversion takes up to 3 hours to register; 24h to be reliable. |
| Cross-domain `gclid` lost between tools and store | Linker domains misconfigured | Confirm `NEXT_PUBLIC_GTAG_LINKER_DOMAINS` on Vercel (tools) AND `ROJI_GTAG_LINKER_DOMAINS` (or default) in `wp-config.php` (store) both list `rojipeptides.com` + `tools.rojipeptides.com`. |
| Provisioner fails with `developer_token_not_approved` | Trying to mutate against a production account from Test Access | You have Explorer — should be fine. If not: apply for Basic Access. |
| Validation fails on a real ad | Forbidden term in copy | Check `src/lib/safety.ts` — adjust copy in `ads-blueprint.ts`. Brand-defense ads exempt the word "peptide" only. |
| Disapproval rate > 5% in first week | Ad copy borderline; too aggressive on "biohacker" framing | Pull the worst-performing RSA, soften copy, re-provision. |

---

## Reference: every Google-Ads-API-related file

```
roji-ads-dashboard/
├── src/
│   ├── lib/
│   │   ├── env.ts                     # central env resolver (TOOLS_* with PROTOCOL_* fallback)
│   │   ├── google-ads.ts              # main client, KPIs, search terms, disapprovals
│   │   ├── google-ads-internal.ts     # bare Customer accessor (for provisioner)
│   │   ├── ads-blueprint.ts           # blueprint structure + safety walker (Research Tools framing)
│   │   ├── ads-provisioner.ts         # creates campaigns / ad groups / RSAs / negatives
│   │   ├── safety.ts                  # errors (compounds/claims) + warnings (protocol/cycle)
│   │   └── negative-keywords.ts       # search-terms mining classifier
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── campaigns/page.tsx     # houses BlueprintCard
│   │   │   ├── tracking/page.tsx      # tracking checklist + env state
│   │   │   ├── performance/page.tsx
│   │   │   ├── search-terms/page.tsx
│   │   │   └── disapprovals/page.tsx
│   │   └── api/
│   │       ├── ads/
│   │       │   ├── readiness/route.ts             # GET pre-flight check
│   │       │   ├── blueprint/provision/route.ts   # POST + GET blueprint provisioner
│   │       │   ├── campaigns/route.ts             # GET + POST simple campaign
│   │       │   ├── search-terms/route.ts
│   │       │   └── disapprovals/route.ts
│   │       └── cron/
│   │           ├── mine-search-terms/route.ts     # daily 14:00 UTC
│   │           └── check-disapprovals/route.ts    # daily 13:00 UTC
│   └── components/
│       ├── BlueprintCard.tsx
│       └── CreateCampaignForm.tsx
└── scripts/
    ├── provision-blueprint.ts         # CLI fallback (npm run blueprint:dryrun / blueprint:live)
    ├── _cli-bootstrap.cjs             # server-only shim for CLI
    ├── server-only-shim.cjs           # no-op server-only replacement
    ├── get-refresh-token.js           # OAuth helper (one-time)
    └── smoke-test.js

roji-store/roji-child/inc/
├── tracking.php                       # gtag bootstrap, GA4 funnel events, purchase + add_to_cart conversions
└── gateway-reserve-order.php          # Reserve-Order WC payment method, UTM persistence, validation email, WP-CLI

roji-tools/src/lib/
└── track.ts                           # GA4 event helpers (track, conversion, toolComplete (unwired))
```
