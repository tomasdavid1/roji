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
| **Funnel** (per-tool conversion funnel — the daily-check-in answer) | `/funnel` |
| **Provisioner UI** ("Provision from Blueprint" card) | `/campaigns` |
| **Tracking checklist** (probes, env state, Tag Assistant guide) | `/tracking` |
| **Search-terms mining** (auto-flag risky terms) | `/search-terms` |
| **Disapproval auto-pause** | `/disapprovals` |
| **Performance** (campaign-level KPI dashboard) | `/performance` |
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

**Tool-only mode** (`--mode tool-only`) — **current live mode** (restructured Apr 2026):

- 2 campaigns · 6 ad groups · 26 keywords · 6 RSAs · 59 campaign-level negatives
- C1 — Research Tools — Calculators: $25/day
  - **AG-Reconstitution** → `/reconstitution` (3 kw, 1 RSA, hard-softened copy)
  - **AG-HalfLife** → `/half-life` (4 kw, 1 RSA)
  - **AG-COA** → `/coa` (3 kw, 1 RSA, "Janoshik" dropped from ads)
  - **AG-CostCompare** → `/cost-per-dose` (2 kw, 1 RSA, "dose" stripped from copy)
  - **AG-Generic** → `/` (7 kw, 1 RSA, slimmed catch-all)
- C3 — Brand Defense: $5/day (AG-Brand, TARGET_IMPRESSION_SHARE)
- 4 sitelinks (Reconstitution, Half-Life, COA, Cost Comparison Tool)
- 6 callouts (Free, No Signup Required, Browser-Based, etc.)
- 18-24 age demographic exclusion on all campaigns
- Daily budget: $30 ($25 C1 + $5 C3)
- Bid strategy: `MAXIMIZE_CLICKS` (data collection mode until 30+ purchases land)
- All resources start `PAUSED`

**Peptide experiment mode** (`--mode peptide-experiment`):

- 1 campaign (C2) · 1 ad group (AG4 — Peptide Research Intent) · 2 keywords · 1 RSA
- Daily budget: $5/day
- DELIBERATE policy test: uses the word "peptide" in research-framed copy
- Separate campaign for blast-radius isolation — disapproval can't touch C1
- Enable after C1 has run clean for 7 days

**Full mode** (`--mode full`) — tool-only + C4 Recomp fitness funnel:

- 3 campaigns · 7 ad groups · 34 keywords · 7 RSAs · 118 negatives
- Daily budget: $35 ($25 C1 + $5 C3 + $5 C4)
- C4 — Body Recomp (Fitness Funnel): $5/day, isolated from C1 per 4-AI review consensus (cheap fitness CPCs would cannibalise C1 tool budget under Maximize Clicks)
  - **AG-Recomp** → `/recomp` (8 fitness keywords: TDEE, macros, body fat, lean bulk, cutting, body composition)
- Includes all sitelinks, callouts, and demographic exclusions
- Decision rule: pause C4 without C1 impact if fitness traffic doesn't convert within 3 weeks

### Apr 2026 restructure — why the new shape

Four external AI reviewers (Claude, ChatGPT, Gemini, Grok) independently flagged the pre-restructure AG3 ("Biohacker Intent") as a HIGH-impact CRO mistake: every keyword, even highly specific ones like `"reconstitution calculator"`, routed to the homepage tool grid. Users had to find and click the right tool card before getting value.

The new structure routes specific-intent keywords to tool-specific landing pages. Same budget, same keyword set (redistributed, not expanded), meaningfully better landing-page relevance → better Quality Score + CTR.

Additional changes from the same review:
- **Reconstitution + CostCompare copy hard-softened.** All four reviewers flagged "syringe", "tick", "before you ever touch a vial" as Healthcare/Medicines policy triggers. Scrubbed from RSAs (kept on landing pages where they're useful and not reviewed).
- **"Dose" dropped from CostCompare ad copy.** URL route `/cost-per-dose` unchanged (Google evaluates the page, which is math). Ad group name changed from AG-CostPerDose → AG-CostCompare.
- **AG-Recomp isolated in its own campaign (C4).** Fitness keywords have 3-5x cheaper CPCs. In a shared campaign, Maximize Clicks would pour budget into them and starve high-intent tool groups. Separate $5/day budget + kill switch.
- **AG-Generic pruned from 14 keywords to 7.** Removed keywords that now have clear tool homes.
- **Single RSA per ad group at launch.** All four reviewers agreed: additional RSAs multiply policy review surface without material optimization gain at low volume. Add RSA #2 after 2 weeks of data.

Migration: the provisioner is idempotent by ad-group name. After provisioning the new structure, **manually pause AG3 + AG5** in the Google Ads UI so spend doesn't double up with the new ad groups.

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

- `C1 — Research Tools — Calculators [roji-blueprint]` ($25/day)
  - `AG-Reconstitution`: 3 phrase-match keywords, 1 RSA → `/reconstitution`
  - `AG-HalfLife`: 4 phrase-match keywords, 1 RSA → `/half-life`
  - `AG-COA`: 3 phrase-match keywords, 1 RSA → `/coa`
  - `AG-CostCompare`: 2 phrase-match keywords, 1 RSA → `/cost-per-dose`
  - `AG-Generic`: 7 phrase-match keywords, 1 RSA → `/` (homepage)
  - 4 sitelinks, 6 callouts, 18-24 age exclusion
  - 59 campaign-level negative keywords
- `C3 — Brand Defense [roji-blueprint]` ($5/day, TARGET_IMPRESSION_SHARE)
  - `AG-Brand — Defense`: 7 keywords (exact + phrase), 1 RSA
  - 18-24 age exclusion
- **Expected leftovers from previous blueprint (PAUSE manually):** `AG3 — Biohacker Intent` and `AG5 — Fitness Calculator Intent`. The provisioner is idempotent by ad-group name so it leaves them in place. Pause them in the UI immediately after the new ad groups go live, or spend will double.

**Manual review checklist before un-pausing:**

- [ ] Final URLs: each tool-specific ad group routes to its tool page (`/reconstitution`, `/half-life`, `/coa`, `/cost-per-dose`). AG-Generic → homepage. AG-Brand → `https://rojipeptides.com`.
- [ ] Old AG3 + AG5 paused so the new tool-specific ad groups aren't starved by legacy spend.
- [ ] Geo target: United States only.
- [ ] Network: Google Search only (no Search Partners, no Display).
- [ ] No "protocol", no compound names, no therapeutic claims in any headline/description.
- [ ] C1 bid strategy: Maximize Clicks. C3: Target Impression Share.
- [ ] Conversion goals: `purchase` set as primary; `add_to_cart` secondary; nothing else.
- [ ] Sitelinks point to correct tool pages (/reconstitution, /half-life, /coa, /cost-per-dose).
- [ ] Remove stale negatives: `safe`, `cost`, `price` (replaced by phrase variants).

When happy: enable both campaigns.

### Day 5-6 — first hours of traffic

- Watch the dashboard `/disapprovals` page. Any disapproved ad gets auto-paused by the daily cron (or manually via the page button).
- Check `/search-terms` → "Risky terms" tab daily. Review and add to negatives (the cron does this automatically; the UI is for spot-checks).
- Watch the conversion column on `/performance`. Expect zero conversions in the first 24h while traffic builds.
- Use the daily check-in template in [§ Optimization decision framework](#optimization-decision-framework) below.

### Day 7-14 — readout and iterate

See the full decision framework below for kill/keep thresholds. Key metrics to watch:
- **CTR**: target 3-6%.
- **Search term quality**: are phrase-match keywords leaking to junk?
- **Tool engagement**: are clickers actually using the calculators? (GA4)
- **Tools → store click-through rate**: is the bridge working?
- **Reserve orders**: even 1-2 is meaningful signal.
- **Disapproval rate**: should be ≤ 5%.

If lead-capture rate is healthy, scale to the full blueprint (`npm run blueprint:live -- --mode full`) — adds the Research Calculator Intent ad group.

---

## Optimization decision framework

Use this during daily check-ins. Every decision has a data threshold so we don't kill things too early or keep losers too long.

### Budget context

- First $500 of spend is full price. After that, $500 Google Ads credit kicks in.
- Total ~$1000 of spend for $500 out of pocket. That's ~33 days at $30/day.

### Keyword level — kill or keep?

| Signal | Threshold | Action |
| --- | --- | --- |
| Impressions but 0 clicks | 200+ impressions | Pause — ad isn't relevant for that intent |
| Clicks but 0 tool engagement | 20+ clicks, bounce >85% | Pause — paying for accidents |
| Clicks + tool use but 0 store click-through | 30+ clicks | Keep, flag — might be UX, not keyword |
| Clicks + store visits + 0 reserve orders | 50+ clicks | Pause — intent doesn't convert |
| Good CTR + conversions | Any | Increase bid, never touch |

### Ad group level — kill or keep?

| Signal | Threshold | Action |
| --- | --- | --- |
| <10 impressions/day | After 7 days | Bump CPC ceiling by $1 |
| Clicks but wrong search terms | Day 3, 7, 14 | Add negatives, don't kill AG |
| CTR below 2% | 500+ impressions | Rewrite ad copy |
| CTR above 5% | Any time | Winner — increase budget share |
| 50+ clicks, 0 conversions | 14-21 days | Pause and investigate funnel |

**C4 / AG-Recomp (fitness) note:** Top-of-funnel, isolated in its own campaign on purpose. Judge on tool engagement and CPC, not direct conversions. CPCs $0.30-0.80 with calculator usage = working. Pause C4 entirely (no C1 impact) if fitness traffic still hasn't converted after 3 weeks.

### RSA level — kill or keep?

| Signal | Threshold | Action |
| --- | --- | --- |
| Google labels assets "Low" | 2,000+ impressions on the RSA | Swap those headlines/descriptions |
| One RSA has 2x CTR of another | Both at 500+ impressions | Pause the loser |
| "Approved Limited" on assets | Immediately | Not fatal, consider rewording |

### Campaign level — kill or keep?

| Signal | Threshold | Action |
| --- | --- | --- |
| C1: 100+ clicks, 0 reserve orders | 3-4 weeks | Cut to $10/day, investigate funnel |
| C1: 100+ clicks, 1-3 reserve orders | 3-4 weeks | Promising. Maintain, optimize keywords |
| C1: 100+ clicks, 5+ reserve orders | 3-4 weeks | Working. Bump budget, plan Max Conversions |
| C2: disapproved | Any time | Pause immediately. Don't retry without copy changes |
| C2: 50+ clicks, 0 conversions | 14 days | Pause. "Peptide" intent ≠ buy-here |
| C2: approved and converting | Any | Bump to $10-15/day |

### C2 (Peptide Experiment) escalation ladder

| Phase | Budget | Trigger to advance |
| --- | --- | --- |
| Paused | $0 | C1 clean for 7 days |
| Phase 1 | $5/day | Google approves ads, serving cleanly 3-5 days |
| Phase 2 | $10-15/day | Clicks converting, CAC reasonable |
| Phase 3 | Match C1 budget | CAC < C1's CAC (peptide keywords are tighter intent) |

### Bid strategy transitions

| Milestone | Switch to | Why |
| --- | --- | --- |
| 0-29 conversions | MAXIMIZE_CLICKS | Not enough data for Smart Bidding |
| 30+ conversions (in 30 days) | MAXIMIZE_CONVERSIONS | Google can now bid toward purchase-likely users |
| 50+ conversions + known margin | TARGET_CPA at computed target | Full optimization |

### The weekly calendar (first 5 weeks)

**Week 1** (~$175 spend):
- [ ] Check search terms report day 3 and day 7
- [ ] Add negatives for junk queries
- [ ] Confirm all C1 ad groups (Reconstitution, HalfLife, COA, CostCompare, Generic) and C3 cleared policy review
- [ ] Confirm sitelinks/callouts showing in ad previews
- [ ] Track: impressions, CTR, search term quality

**Week 2** (~$350 cumulative):
- [ ] First keyword-level decisions (pause zero-click keywords)
- [ ] Check tools → store click-through rate in GA4
- [ ] Enable C2 if C1 is clean
- [ ] RSA asset performance labels start appearing
- [ ] Track: tool engagement rate, store click-through rate

**Week 3-4** (~$500-700 cumulative, credit kicks in around here):
- [ ] First AG-level decisions
- [ ] Should have 200-300 total clicks
- [ ] If 0 reserve orders at 300 clicks: red flag, investigate funnel
- [ ] If 3-5 reserve orders: channel works, optimize
- [ ] Track: reserve orders, CAC, funnel drop-off points

**Week 5+** (real money now):
- [ ] If 30+ conversions: switch to Maximize Conversions
- [ ] CAC should start trending down
- [ ] Make the "pour gas or kill channel" decision
- [ ] If killing: redirect budget to SEO / Reddit / influencer

### CAC expectations by phase

| Phase | Expected CAC | Don't panic unless |
| --- | --- | --- |
| Week 1-2 (learning) | $300-900 | Normal. You're buying data |
| Week 3-4 (optimizing) | $150-400 | >$700 after 300+ clicks |
| Month 2 (Max Conversions) | $80-200 | >$300 sustained |
| Month 3+ (Target CPA) | $60-150 | Not reaching this = wrong channel |

### Daily check-in template

```
Date: ____
Spend yesterday: $____  (cumulative: $____)
Impressions: ____  Clicks: ____  CTR: ____%
Reserve orders: ____  (cumulative: ____)
Blended CAC: $____

Search terms reviewed?  [ ] yes  [ ] no
Negatives added today: ____
Any disapprovals?      [ ] no   [ ] yes → action: ____
Funnel: tool_view → store_click → cart → purchase
        ____    →   ____      → ____ → ____

Decision: [ ] stay course  [ ] pause keyword(s): ____
          [ ] bump budget  [ ] kill AG: ____
          [ ] enable C2    [ ] switch bid strategy
Notes: ____
```

---

## Funnel page — how it works and how to fill in the gaps

`ads.rojipeptides.com/funnel` is the dashboard's home page and the answer to the daily "where did the clicks go?" question. It implements the funnel defined at the top of this playbook (lines 26-50), one tool at a time, with a tab strip so you can switch between Reconstitution / Half-Life / COA / Cost Compare / Recomp / Generic / Brand / All-tools without page reloads.

### Data sources

Each step in the funnel cites its data source inline. The page never fakes data — if a source is missing, the affected steps render as a dashed "not connected" placeholder rather than zeros.

| Step | Source | Wired today? |
| --- | --- | --- |
| 1. Ad click | Google Ads API (`keyword_view`) | ✅ Yes |
| 2. tool_view | GA4 Data API | ⚠ Needs GA4 service account |
| 3. Tool used (any per-tool engagement event) | GA4 Data API | ⚠ Needs GA4 service account |
| 4. Store CTA click (`store_outbound_click`) | GA4 Data API | ⚠ Needs GA4 service account |
| 5. Add to cart | GA4 Data API | ⚠ Needs GA4 service account |
| 6. Checkout view | GA4 Data API | ⚠ Needs GA4 service account |
| 7. Reserve order (purchase conversion) | Google Ads API | ✅ Yes |

The "implied CAC" KPI in the page header is `total_spend / reserve_orders` — both sides are Google Ads numbers, so this works today even without GA4. The mid-funnel just shows you *why* CAC is what it is.

### How to wire GA4 (one-time, ~3 min — OAuth, no service-account key)

We use the **same OAuth client** as Google Ads. No Google Cloud service-account key required (so this works even under orgs that enforce `iam.disableServiceAccountKeyCreation`).

1. **Find your GA4 Property ID.** GA4 → Admin → Property details → copy the numeric Property ID (NOT the `G-XXXXX` measurement id).
2. **Run the helper script** from `roji-ads-dashboard/`:
   ```bash
   node scripts/get-ga4-refresh-token.js
   ```
   It prints a Google sign-in URL. Open it in a browser, sign in with the Google account that has access to the GA4 property, and grant the `analytics.readonly` scope. The script catches the redirect and prints a refresh token.
3. **Set on Vercel** (`roji-ads-dashboard` project → Settings → Environment Variables → Production):
   ```
   GA4_PROPERTY_ID=<numeric id from step 1>
   GA4_REFRESH_TOKEN=<token printed by step 2>
   ```
   `GOOGLE_ADS_CLIENT_ID` and `GOOGLE_ADS_CLIENT_SECRET` are reused — they're already set.
4. Redeploy. The funnel page mid-steps go live on the next request.

The dashboard authenticates as **you personally**, not as a service account — same auth model as Google Ads. If you ever revoke consent at https://myaccount.google.com/permissions you'll need to re-run the helper.

### WooCommerce REST API — DEFERRED (May 2026)

**Status:** keys generated and stored on Vercel, but the integration is **deliberately deferred**. Note from May 1, 2026 audit:

- Steps 5 (Add to cart) and 7 (Purchase) on the funnel are **already populated by Google Ads conversion actions**, segmented by action name (`getConversionsByAdGroupAndAction` in `src/lib/google-ads.ts`). This is the *paid-attributed* number, which is exactly what the funnel wants.
- WooCommerce would give us **total** orders (paid + organic + direct), useful as a sanity-check side panel but not for paid-funnel attribution.
- The site sits behind **Cloudflare WAF with a "Just a moment..." JS challenge**. `curl` and the Vercel runtime get HTTP 403 + an HTML challenge page instead of JSON. Bypassing requires either:
  1. A Cloudflare custom rule: "When `path matches /wp-json/wc/v3/*` AND `header has Authorization: Basic` → Skip Bot Fight Mode + Managed challenge", OR
  2. An IP allowlist for Vercel's egress range (changes; brittle), OR
  3. A custom shared-secret header check on the WP side (e.g. `x-roji-internal: <token>`) plus a WAF skip rule.
- **Trigger to re-open this**: when reserve orders or paid orders cross ~10/day and we want a "WC says X, Google Ads attributes Y" delta on the funnel header. Until then the marginal value isn't worth the WAF detour.
- **Alternative if Stripe is wired** before WC becomes worth it: pull `payment_intents` from the Stripe API directly. Stripe is not behind Cloudflare and authenticates cleanly with a restricted read-only key. Probably the better plumbing once payments are real.

**When ready to actually wire it** (env vars are already on Vercel as of May 1, 2026):

```
WOO_API_BASE=https://rojipeptides.com/wp-json/wc/v3
WOO_CONSUMER_KEY=ck_...   # already set
WOO_CONSUMER_SECRET=cs_... # already set
```

You'll still need the Cloudflare bypass rule above before the keys actually reach WP. Test from Vercel (not local curl) once the rule is in place.

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
