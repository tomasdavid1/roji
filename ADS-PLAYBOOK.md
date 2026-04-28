# Roji Ads — Launch Playbook

The strategy doc describes the destination. This is the runbook to get there. It is keyed to the actual code that lives in this repo.

---

## TL;DR — what to actually do, in order

1. **Get Basic Access.** While that's pending, do steps 2–4.
2. **Run the protocol engine in TEST_MODE** so ads can land on a clean, commerce-free page (`NEXT_PUBLIC_PROTOCOL_TEST_MODE=1` in Vercel → Protocol Engine project). The "Get this stack" button becomes "Email me when this stack is ready" — Google sees a tool, you collect intent signals.
3. **Verify tracking** at `/tracking` in the dashboard. Walk every probe with Tag Assistant. You want `protocol_complete` and `lead_capture` firing reliably before spending a dollar.
4. **Dry-run the blueprint** locally to eyeball what would be created:

   ```bash
   cd roji-ads-dashboard
   npm run blueprint:dryrun                       # tool-only mode (default)
   npm run blueprint:dryrun -- --mode full        # full blueprint preview
   ```
5. **The day Basic Access lands**: hit "Provision live (PAUSED)" on `/campaigns` (or `npm run blueprint:live`). Review every campaign / ad group / RSA in the Google Ads UI, then enable the campaign.

---

## What's been wired up

### Protocol engine (roji-protocol)

| Behavior | Where it lives | Triggered by |
| --- | --- | --- |
| `gtag.js` bootstrap with cross-domain linker | `src/app/layout.tsx` | `NEXT_PUBLIC_GADS_ID` and/or `NEXT_PUBLIC_GA4_ID` |
| `protocol_complete` GA4 event + Google Ads conversion | `src/components/ProtocolOutput.tsx` (useEffect on results) | User reaches the results page |
| `stack_click` GA4 event when buy button is clicked | `src/components/ProtocolOutput.tsx` (handleGetStack) | "Get this stack" click |
| **TEST_MODE**: `LeadCapture` component replaces buy button | `src/components/StackCard.tsx` | `NEXT_PUBLIC_PROTOCOL_TEST_MODE=1` |
| `lead_capture` GA4 event + optional Google Ads conversion | Same component | Email submitted |
| `/api/lead` server endpoint | `src/app/api/lead/route.ts` | Form POST. Logs to console + optional webhook + optional file. |

Set on Vercel:

```
NEXT_PUBLIC_GADS_ID=AW-XXXXXXXXXX                 # required to fire ads conversions
NEXT_PUBLIC_GADS_PROTOCOL_LABEL=aBcDeF1GhIjKlMnO  # protocol_complete conversion
NEXT_PUBLIC_GADS_LEAD_LABEL=aBcDeF1GhIjKlMnO      # lead_capture conversion (TEST_MODE)
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX                   # GA4 measurement
NEXT_PUBLIC_GTAG_LINKER_DOMAINS=rojipeptides.com,protocol.rojipeptides.com
NEXT_PUBLIC_PROTOCOL_TEST_MODE=1                  # ON until store + payments are live
ROJI_LEAD_WEBHOOK_URL=https://hooks.slack.com/...  # optional: forward leads
```

### Storefront (roji-store/roji-child)

| Behavior | Where | Triggered by |
| --- | --- | --- |
| `gtag.js` bootstrap with cross-domain linker | `inc/tracking.php` | `ROJI_GADS_ID` and/or `ROJI_GA4_ID` defined |
| `add_to_cart` event when arriving via protocol-engine deep-link | `inc/tracking.php` (wp_footer) | URL has `?protocol_stack=` |
| `purchase` event + Google Ads conversion | `inc/tracking.php` (woocommerce_thankyou) | WC order completed |

Set in `wp-config.php`:

```php
define( 'ROJI_GADS_ID', 'AW-XXXXXXXXXX' );
define( 'ROJI_GADS_PURCHASE_LABEL', 'aBcDeF1GhIjKlMnO' );
define( 'ROJI_GADS_ADD_TO_CART_LABEL', 'aBcDeF1GhIjKlMnO' );  // optional
define( 'ROJI_GA4_ID', 'G-XXXXXXXXXX' );
// Override only if testing non-prod cross-subdomain pairs:
// define( 'ROJI_GTAG_LINKER_DOMAINS', array( 'staging.rojipeptides.com', 'protocol-staging.rojipeptides.com' ) );
```

### Ads dashboard (roji-ads-dashboard)

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

### Blueprint structure

`roji-ads-dashboard/src/lib/ads-blueprint.ts` codifies the strategy doc.

**Tool-only mode** (`--mode tool-only`):

- 1 campaign · 1 ad group · 15 keywords · 1 RSA · 39 campaign-level negatives
- Daily budget: $30
- Lands on `protocol.rojipeptides.com`
- Bid strategy: `MAXIMIZE_CLICKS` (data collection mode)
- All resources start `PAUSED`

**Full mode** (`--mode full`):

- 2 campaigns · 3 ad groups · 37 keywords · 5 RSAs · 39 negatives
- Daily budget: $47 ($40 search + $7 brand)
- Campaigns: Protocol Engine Search + Brand Defense
- The compound-specific Ad Group 2 from the doc is intentionally **omitted** — add it manually only after Ad Group 1 is clean for 7+ days.

Both modes pass the safety validator (see `src/lib/safety.ts`) which blocks any compound names, therapeutic claims, or human-use language. Brand-defense ad groups carry an `allowBrandTerms: true` exemption so "Roji Peptides" passes.

---

## Day-by-day launch sequence (test-mode adaptation)

### Day 0 — pre-flight

```bash
# Dashboard build sanity
cd roji-ads-dashboard && npm run typecheck && npm run lint && npm run build

# Blueprint dry-run — eyeball what would be created
npm run blueprint:dryrun
npm run blueprint:dryrun -- --mode full
```

### Day 1 — protocol engine in TEST_MODE on Vercel

1. Deploy roji-protocol with `NEXT_PUBLIC_PROTOCOL_TEST_MODE=1` set.
2. Verify the live URL: results page should show "Coming soon" + email-capture form, not "Get this stack".
3. Walk through the engine yourself: complete the wizard, submit a test email. Confirm:
   - `/tracking` page in the dashboard shows the right env config.
   - Tag Assistant on the protocol app shows `protocol_complete` event.
   - Email submission shows 201 and `lead_capture` event.

### Day 2 — Google Ads account setup (in the UI, not the API)

You can do this without Basic Access:

1. Create Google Ads account if you haven't (under MCC).
2. Set timezone, currency (USD), billing (no charge until campaign is enabled).
3. Create the four conversion actions exactly as named in the strategy doc:
   - `protocol_complete` (Other, no value, one per user, 30-day window)
   - `lead_capture` (Sign-up, no value, one per user, 30-day window) — for TEST_MODE
   - `add_to_cart` (Add to cart, dynamic value, every, 30-day window)
   - `purchase` (Purchase, dynamic value, every, 90-day window) — **optimize against this once products live; until then, optimize against `lead_capture`**
4. For each conversion action, copy the conversion label and paste into the appropriate env var (Vercel for protocol; `wp-config.php` for store).
5. **Enable Enhanced Conversions** in Google Ads settings.

### Day 3 — wait for Basic Access (or proceed with manual UI)

While waiting:

- Watch real visitor behavior on the protocol engine. Are people completing the wizard? Bouncing where? The lead-capture rate is your first real signal.
- Refine the negative keywords list in `src/lib/ads-blueprint.ts → POLICY_NEGATIVE_KEYWORDS` based on your gut.

### Day 4 — Basic Access lands

```bash
cd roji-ads-dashboard
npm run blueprint:dryrun        # one final preview
npm run blueprint:live          # creates everything PAUSED
```

Or use the dashboard UI: go to `/campaigns` → "Provision live (PAUSED)" on the BlueprintCard.

### Day 5 — review in Google Ads UI

Open Google Ads. You should see:

- One campaign: `C1 — Protocol Engine — Tool Only [roji-blueprint]` ($30/day, paused)
- One ad group: `AG3 — Biohacker Intent` (paused)
- 15 keywords, 1 RSA (15 headlines + 4 descriptions)
- 39 campaign-level negatives

**Manual review checklist before un-pausing:**

- [ ] Final URL is the protocol engine, not the store.
- [ ] Geo target is United States only.
- [ ] Network is Google Search only (no Search Partners, no Display).
- [ ] No compound names anywhere.
- [ ] Bid strategy: Maximize Clicks.
- [ ] Conversion goals: `lead_capture` set as primary (TEST_MODE) or `protocol_complete` if the engine isn't in TEST_MODE.

When happy: enable the campaign.

### Day 6 — first hours of traffic

- Watch the dashboard `/disapprovals` page. Any disapproved ad gets auto-paused.
- Check `/search-terms` → "Risky terms" tab daily. Review and add to negatives.
- Watch the conversion column on `/performance`. You should see at least 1 `lead_capture` per ~10 clicks.

### Day 14 — readout

Calculate:
- **CTR**: should be 3–6% per the strategy doc.
- **Cost per lead** (CPL via `lead_capture`): under $20 is good for a research tool with no commerce. Under $10 is great.
- **Disapproval rate**: should be ≤ 5%.

If lead-capture rate is healthy, **products are listed**, and **payment processor is approved**: flip `NEXT_PUBLIC_PROTOCOL_TEST_MODE` off, switch the campaign's primary conversion to `purchase`, and gradually scale to the full blueprint.

---

## Flipping from TEST_MODE to live

When products are listed and payment is wired:

1. **Protocol engine**: unset `NEXT_PUBLIC_PROTOCOL_TEST_MODE` in Vercel → redeploy. The "Get this stack" buy button comes back.
2. **Google Ads**: in the campaign settings, change the primary conversion from `lead_capture` to `purchase`.
3. **Blueprint mode**: re-run `npm run blueprint:live -- --mode full` to add the Brand Defense campaign + the second ad group on Campaign 1.
4. **Bid strategy**: after 30+ purchases, switch the campaign from `MAXIMIZE_CLICKS` to `MAXIMIZE_CONVERSIONS`. After 50+ purchases, switch to `TARGET_CPA` with your computed CAC target.

The blueprint provisioner is idempotent: re-running it doesn't duplicate campaigns (it looks them up by the `[roji-blueprint]` name suffix). It will, however, append fresh ad-copy variants — useful when iterating.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Provisioner reports "Test mode" | Developer token in Test Access | Apply for Basic Access. See `DEPLOY.md` §1. |
| `lead_capture` event not firing | `gtag.js` not loaded — `NEXT_PUBLIC_GADS_ID` or `NEXT_PUBLIC_GA4_ID` unset | Set on Vercel and redeploy. |
| `add_to_cart` event not firing on cart | URL doesn't have `?protocol_stack=` | This is intentional — the event only fires on the engine→cart transition, not regular cart loads. |
| Cross-domain `gclid` lost | Linker domains misconfigured | Confirm both apps have matching `NEXT_PUBLIC_GTAG_LINKER_DOMAINS` / `ROJI_GTAG_LINKER_DOMAINS`. |
| Provisioner fails with `developer_token_not_approved` | Trying to mutate against a production account from Test Access | Only Basic Access can mutate production accounts. Wait for approval. |
| Validation fails on a real ad | Forbidden term in copy | Check `src/lib/safety.ts` — adjust copy in `ads-blueprint.ts`. Brand-defense ads exempt the word "peptide" only. |

---

## Reference: every Google-Ads-API-related file

```
roji-ads-dashboard/
├── src/
│   ├── lib/
│   │   ├── google-ads.ts              # main client, KPIs, search terms, disapprovals
│   │   ├── google-ads-internal.ts     # bare Customer accessor (for provisioner)
│   │   ├── ads-blueprint.ts           # blueprint structure + safety walker
│   │   ├── ads-provisioner.ts         # creates campaigns / ad groups / RSAs / negatives
│   │   ├── safety.ts                  # ad-copy forbidden-term validator
│   │   └── negative-keywords.ts       # search-terms mining classifier
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── campaigns/page.tsx     # houses BlueprintCard
│   │   │   ├── tracking/page.tsx      # tracking checklist
│   │   │   ├── performance/page.tsx
│   │   │   ├── search-terms/page.tsx
│   │   │   └── disapprovals/page.tsx
│   │   └── api/ads/
│   │       ├── readiness/route.ts             # GET pre-flight check
│   │       ├── blueprint/provision/route.ts   # POST + GET blueprint provisioner
│   │       ├── campaigns/route.ts             # GET + POST simple campaign
│   │       ├── search-terms/route.ts
│   │       └── disapprovals/route.ts
│   └── components/
│       └── BlueprintCard.tsx
└── scripts/
    ├── provision-blueprint.ts         # CLI fallback
    ├── _cli-bootstrap.cjs             # server-only shim for CLI
    ├── server-only-shim.cjs           # no-op server-only replacement
    ├── get-refresh-token.js           # OAuth helper
    └── smoke-test.js
```
