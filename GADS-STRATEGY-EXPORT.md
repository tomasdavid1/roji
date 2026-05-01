# Roji Peptides — Google Ads Strategy Export for External Review

**Snapshot date:** 2026-04-30
**Account state at time of export:** live, 2 active campaigns, 1 RSA serving impressions for ~3 hours, 0 conversions yet.

This document is a **standalone export** of the current Google Ads strategy plus live state. It is designed to be pasted into a second-opinion AI chat (or shown to a Google Ads expert) without requiring any other context. The author wants a critical review specifically focused on **whether we are leaving money on the table** by being too conservative — but not at the cost of triggering policy strikes that would jeopardize the entire account.

---

## How to use this document if you are the reviewer

Please respond using **exactly this structure**, in this order, with these section headings. Do not omit any section. Brevity is fine; depth is welcome where it matters. The author will compare your response side-by-side with other AIs' responses, so a consistent format matters.

```
1. ONE-LINE VERDICT
   Single sentence. Are we under-shooting, over-shooting, or roughly right
   on aggressiveness given the policy/CAC tradeoff?

2. WHAT YOU WOULD KEEP AS-IS
   Bullet list. Things in the current setup that are correct and shouldn't change.

3. WHAT YOU WOULD CHANGE THIS WEEK (high confidence, low risk)
   Bullet list. Each item:
   - Change description
   - Why
   - Risk if wrong (account / spend / conversion)

4. WHAT YOU WOULD TEST NEXT WEEK (medium confidence)
   Bullet list. Same shape.

5. KEYWORDS YOU WOULD ADD
   Concrete list. Match type for each. Group them by which existing ad
   group they'd join, OR propose a new ad group.

6. KEYWORDS / NEGATIVES YOU WOULD REMOVE
   Concrete list. Why.

7. AD-COPY CRITIQUE
   Bullet the specific RSA headlines/descriptions you'd swap, and what
   you'd swap them for. Brevity over diplomacy.

8. POLICY RISK ASSESSMENT
   For any keyword or copy change you proposed above that touches on
   "peptide", compound names, dosing, or therapeutic language: explain
   the specific Google Ads policy you think it does or doesn't trip.
   Cite the policy if you can.

9. WHAT GOOGLE ADS WILL OPTIMIZE AUTOMATICALLY VS. WHAT WE MUST DO
   Two-column or two-list breakdown. Specifically: with Maximize Clicks
   bidding on a single-purchase-action signal, what's auto-optimized vs.
   what is the human responsibility.

10. CAC EXPECTATION
    Given the niche, the bidding strategy, the budgets, and the keyword
    set: what's a realistic blended CAC range for the first 30 days of
    spend? What conversion-rate assumptions are baked in?

11. THE HONEST QUESTION
    What's the ONE question you'd want to ask the operator that, if
    answered, would change your recommendations significantly? (E.g.
    "what's your gross margin per stack" or "have you used SEO to test
    organic intent for these terms".)
```

---

## 1. Business context (read this first)

**Roji Peptides** is a US-only DTC marketplace for **research-grade peptides**, sold under strict "for laboratory and research use only — not for human consumption — must be 21+" framing. The business does NOT make therapeutic claims and is NOT a pharmacy.

Customer-facing surfaces:

- `rojipeptides.com` — WooCommerce store. AOV ~ $400–$900 typical (3-stack research kits).
- `tools.rojipeptides.com` — Free research tools / calculators (lead-magnet surface). No payment, no signup gate.

Funnel:

```
Google Ad → tools.rojipeptides.com (calculator) → click "View on store"
  → rojipeptides.com (PDP) → add to cart → /checkout/
  → "Reserve Order" gateway (no real payment yet — we email a payment
     link within 24h; gross-margin-bearing transaction)
  → thank-you page fires `purchase` conversion to AW-18130000394.
```

**There is no real payment processor live yet.** Reserve-Order is honest deferred-payment-by-invoice. AllayPay / Durango / Coinbase Commerce are candidate processors but none are wired. This is a launch-week setup; the goal of advertising right now is *signal*, not *scale*.

**Compliance constraints (non-negotiable):**

- No therapeutic / human-use claims anywhere customer-facing.
- "Research compound", "laboratory use", "published literature" framing.
- Customer-facing surfaces use "Research Tools" branding (legacy "Protocol Engine" name removed).
- Site-wide footer carries FDA / 21+ / "research only" disclaimer.
- Mandatory checkout consent checkbox (server-validated).

**Why Google Ads at all in this niche:** The peptide research industry advertises mostly via SEO, organic content, influencer, and Reddit/forum presence. Google Ads is widely considered a high-policy-risk channel here. The author is testing whether neutral "research tool" framing on `tools.rojipeptides.com` (a genuinely informational landing surface) can clear policy review and produce profitable click-through to the store. **Worst case is account-level suspension** if the classifier flags the advertiser as "Unapproved Pharmaceuticals". Recovery from a suspension can be months and sometimes never.

---

## 2. Account topology

```
MCC (manager)  263-783-2527 / Tomas
  └── 657-303-2286  Roji Tools  (active, billing enabled)  ← all activity here
```

- `GOOGLE_ADS_CUSTOMER_ID = 6573032286`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID = 2637832527`
- gtag id: `AW-18130000394` (auto-tagging on, conversion-tracking_id wired)

### Conversion actions on the account (both ENABLED, both `primary_for_goal=true`)

| Name | ID | Label (used in `send_to:`) | Source | Optimization target? |
|---|---|---|---|---|
| Purchase | 7594156790 | `5UzRCPbFlqUcEIq0h8VD` | WC `woocommerce_thankyou` (Reserve thank-you page) | **YES — primary** |
| Add to cart | 7594158611 | `zMB-CJPUlqUcEIq0h8VD` | WC `woocommerce_add_to_cart` | secondary signal only |

Verified firing on `rojipeptides.com` via Tag Assistant. Cross-domain linker configured for `rojipeptides.com` ↔ `tools.rojipeptides.com`.

---

## 3. Live state (queried from the Google Ads API at export time)

### Campaigns

| ID | Name | Status | Channel | Bid strategy | Daily budget |
|---|---|---|---|---|---|
| 23802331833 | C1 — Research Tools — Calculators [roji-blueprint] | **ENABLED** | SEARCH (Search-only, no Display) | MAXIMIZE_CLICKS | **$14.29/day** ($100/wk, $434/mo cap) |
| 23813304892 | C2 — Peptide Research — Experiment [roji-blueprint] | **PAUSED** (awaiting policy review) | SEARCH | MAXIMIZE_CLICKS | **$5.00/day** |
| 23812078453 | Campaign #1 | **REMOVED** (orphan from initial Google "Smart Campaign" wizard) | SEARCH+Display | — | $5.00/day (orphan) |

### Ad groups

| Campaign | Ad group | Status | CPC bid ceiling |
|---|---|---|---|
| C1 (live) | AG3 — Biohacker Intent | ENABLED | $3.00 |
| C2 (paused) | AG4 — Peptide Research Intent (experiment) | ENABLED | $2.00 |
| Campaign #1 (removed) | Ad group 1 | ENABLED (but parent removed → no impressions) | — |

### Ads (RSAs)

**AG3 / RSA #1 — "Biohacker Community" angle — ELIGIBLE, serving**

- Final URL: `https://tools.rojipeptides.com`
- Headlines (15):
  ```
  Biohacker Research Tools         (24/30)
  Optimize With Data               (18/30)
  Performance Frameworks           (22/30)
  Free Optimization Tool           (22/30)
  Body Recomp Calculator           (22/30)
  Personalized Frameworks          (23/30)
  Research Tools — Free            (21/30)
  Smart Research Suite             (20/30)
  Built For Researchers            (21/30)
  60-Second Frameworks             (20/30)
  Evidence-Based Tools             (20/30)
  Calibrated Frameworks            (21/30)
  Roji Research Tools              (19/30)
  Data-Driven Precision            (21/30)
  Start Building — Free            (21/30)
  ```
- Descriptions (4):
  ```
  Free research tools built for biohackers. Input your stats, get a personalized framework.
  Skip the spreadsheets. Roji generates evidence-based frameworks in 60 seconds.
  Used by 500+ biohackers to plan recomp, recovery, and performance. Free, referenced, fast.
  Stop guessing recovery windows and recomp math. Calculate it. Free tools, no signup.
  ```

**AG3 / RSA #2 — "Productivity / Replace Spreadsheets" angle — UNDER REVIEW (paused), one asset returned `Approved Limited`**

- Final URL: `https://tools.rojipeptides.com`
- Headlines (15):
  ```
  Stop Spreadsheet Hell            ← came back APPROVED_LIMITED
  Replace Your Spreadsheet         ← came back APPROVED_LIMITED
  60-Second Research Math          ← came back APPROVED_LIMITED
  Calculate, Don't Guess           ← came back APPROVED_LIMITED
  Free Optimization Math
  Skip The Spreadsheet
  Roji Research Tools
  Built For Researchers
  Personalized In 60s
  Free Calculator Suite
  Smart Math Tools
  Calibrated, Not Guessed
  Stats To Framework Fast
  Recomp Math Made Easy
  Tools That Just Work
  ```
- Descriptions (4):
  ```
  Replace your messy spreadsheets with calibrated calculators. Browser-based. Free.
  Input your stats and goals. Roji handles the math. Done in under 60 seconds.
  What used to take 2 hours of forum-hunting now takes 60 seconds. All referenced.
  Built by researchers tired of bad spreadsheets. Free, referenced, no account needed.
  ```

**AG4 / RSA #1 — Peptide Research experiment — PAUSED (awaiting policy review)**

- Final URL: `https://tools.rojipeptides.com`
- Headlines (15):
  ```
  Peptide Research Tools           (22/30)
  Free Research Calculator         (24/30)
  Built For Researchers            (21/30)
  Research Framework Builder       (26/30)
  Peptide Research Suite           (22/30)
  Evidence-Based Tools             (20/30)
  Roji Research Tools              (19/30)
  Peptide Research Math            (21/30)
  60-Second Frameworks             (20/30)
  Calibrated Calculators           (22/30)
  Personalized Frameworks          (23/30)
  Free Research Suite              (19/30)
  Data-Driven Precision            (21/30)
  Smart Research Tools             (20/30)
  Start Building — Free            (21/30)
  ```
- Descriptions (4):
  ```
  Free research calculators for peptide researchers. Input parameters, get a framework.
  Skip the spreadsheet math. Roji turns research into precise frameworks in 60 seconds.
  For researchers, not patients. Every output cites the published literature.
  Calibrated research math. Free, browser-based, referenced. Built by researchers.
  ```

### Active keywords (per ad group)

**AG3 — Biohacker Intent** (15 PHRASE keywords, all ENABLED)

```
"biohacking tools"
"biohacking calculator"
"biohacker calculator"
"biohacking stack builder"
"body optimization tools"
"body recomposition calculator"
"body composition calculator"
"performance optimization tools"
"performance research tools"
"recovery optimization calculator"
"recovery stack calculator"
"advanced recovery planner"
"lean mass research planner"
"optimization framework builder"
"fitness research tools"
```

**AG4 — Peptide Research Intent (experiment)** (2 PHRASE keywords, ENABLED but campaign paused)

```
"peptide research calculator"
"peptide research tools"
```

**Orphaned under removed Campaign #1 — these will not serve, but they exist in the account and could leak into search-term reports:**

```
BROAD: bmi, calculators, calculator online, free calculator, savings calculator,
       interest rate calculator, time calculator, cost calculator, body calculator,
       bmi calculator, rate calculator, science calculator, interest calculator savings,
       download calculator, compound calculator, measurement calculator, log calculator,
       savings rate calculator, calculator tool, calculator online free, calculator app free,
       estimate calculator, price calculator, compound savings calculator, build calculator,
       interest compound calculator, water calculator, unit calculator, body composition
       calculator, bill calculator, savings calculator compound interest, calculator free
       calculator, macros calculator free, calculator database, free free calculator,
       calculator and tools, savings interest rate calculator, calculators and tools,
       body recomp calculator
```

### Campaign-level negative keywords

**C1 has 39 broad-match negatives. C2 has the same 39.** Identical list:

```
buy, purchase, order, cheap, discount, coupon, for sale, price, cost, shop, store,
pharmacy, prescription, doctor, clinic, inject, injection, syringe, human use,
fda approved, weight loss, semaglutide, ozempic, wegovy, tirzepatide, steroid,
testosterone, hgh, growth hormone, illegal, side effects, safe, dangerous, drug,
medicine, treatment, therapy, cure, heal
```

(Source-of-truth: `roji-ads-dashboard/src/lib/ads-blueprint.ts → POLICY_NEGATIVE_KEYWORDS`.)

### Targeting

- Geo: **US only**
- Language: **English only**
- Devices: **all** (no device-level adjustment)
- Demographics: **all** (no demo-level adjustment)
- Audience signals: **none** wired
- Ad schedule: **24/7** (no day-parting)
- Sitelinks: **none** wired
- Callout extensions: **none** wired
- Structured snippets: **none** wired
- Business name / logo assets: **none** wired (Google will fall back to URL)
- EU political flag: `DOES_NOT_CONTAIN`

### Performance to date

**Zero impressions, zero clicks, zero spend** at time of export. AG3's RSA #1 is `Eligible` but the campaign has been live for ~3 hours on a brand-new account with no auction history. AG3's RSA #2 is paused. AG4 is paused awaiting Google's policy review.

---

## 4. The codified strategy (intent + assumptions)

This section captures the *thinking* behind the live state, not just the live state itself.

### Why "Maximize Clicks" not "Maximize Conversions"

We have **zero conversion data** at launch. Maximize Conversions / Target CPA need ~30 conversions in 30 days to bid effectively. We chose Maximize Clicks to fill the funnel, intending to switch to Maximize Conversions once we hit 30 purchases. Conversion actions are still live and tracked from day one — we want the data.

### Why optimize against `purchase`, not `tool_complete`

`tool_complete` (an event fired when a user finishes filling a calculator on `tools.rojipeptides.com`) is wired in code but is NOT a Google Ads conversion. The author considers it too weak a buying-intent signal. The campaign optimizes against the actual buying signal — `purchase` from the Reserve-Order thank-you page, which represents a customer who completed full checkout including billing details and explicit research-use consent.

### Why phrase-match (not broad, not exact)

**Phrase** is the safest middle ground here:

- **Broad** in this niche has historically led to disapprovals because Google's classifier sees the broad-matched search terms (e.g. someone searching for `bmi calculator` might match `body composition calculator`) and flags the campaign for irrelevance/policy. We want tight intent.
- **Exact** is too narrow when the keyword set is small (15 keywords). We'd starve impressions.
- **Phrase** matches the keyword in any word order with optional surrounding words. Lets us catch real intent without leaking to unrelated searches.

### Why two ad groups, two campaigns

The author's instinct, debated in the chat that produced this export:

- **AG3 (Biohacker Intent)** is the safe lane. Zero compound names, no "peptide" word, neutral "research / framework / calculator" framing. Designed to *never* trip Google's pharma classifier and serve as the long-term workhorse.
- **AG4 (Peptide Research)** is a deliberate, scoped policy experiment. The author wants to know: does Google approve a research-framed ad that contains the word `peptide` in headlines and keywords? Worst case: AG4/C2 disapproved → pause it, lose nothing. Best case: approved → real-intent traffic at a probably-much-better CAC.

The two are in **separate campaigns** for blast-radius isolation: a disapproval of C2 cannot pause C1, and budget cannot bleed across.

### Why the ad-copy framing

Three constraints drive copy:

1. **Cannot say** any compound name, "dosing", "injection", "human", "treatment", "heal", "cure", "therapy", or "weight loss". There's a code-level safety validator (`roji-ads-dashboard/src/lib/safety.ts`) that blocks blueprint provisioning if any of these appear in copy.
2. **Should not say** "protocol" or "cycle" — soft-banned by our internal compliance gate (warn-not-error in the validator).
3. **Should say** the things a researcher actually wants: free, fast, evidence-based, references, no signup, "for researchers, not patients".

### Why the negative-keyword list is what it is

Each negative is on the list to **prevent ad-serve to one of:**

- **Buying-intent searches** (`buy`, `order`, `cheap`, `discount`, `for sale`, `pharmacy`) — these would route purchase-ready visitors to a calculator landing page that doesn't sell anything, wasting spend AND triggering the "irrelevant landing page" policy flag.
- **Approved drug names** (`semaglutide`, `ozempic`, `wegovy`, `tirzepatide`) — competing high-CPC categories where our ad would lose the auction anyway.
- **Schedule-controlled / banned substance terms** (`steroid`, `hgh`, `growth hormone`, `testosterone`) — pure policy risk.
- **Human-use indicators** (`inject`, `injection`, `syringe`, `human use`, `prescription`, `doctor`, `clinic`) — compliance + policy.
- **Therapeutic claim terms** (`cure`, `heal`, `treatment`, `therapy`, `medicine`, `drug`, `side effects`, `safe`, `dangerous`, `fda approved`).
- **`weight loss`** — ad-policy lightning rod.

### What we're explicitly NOT doing

- **No Display network.** Search-only. Display in this niche is almost certainly placement-quality-disastrous.
- **No Performance Max.** PMax's auto-asset / auto-target behavior is incompatible with our copy/keyword guardrails.
- **No Smart Bidding** until we have ≥30 conversions. Maximize Clicks until then.
- **No retargeting** yet. We don't have audience-list infrastructure or a privacy-safe consent gate.
- **No brand-defense campaign yet.** "Roji" / "Roji Peptides" / "rojipeptides" exact-match is in the codified `full` blueprint mode but not provisioned (low priority while the brand has zero direct-search volume).
- **No video / YouTube.** Out of scope for launch.
- **No competitor-name keywords.** (a) High-CPC, (b) attracts angry brand teams who can flag your account.
- **No `tool_complete` as a conversion event.** Not a real buying signal at our funnel depth.

---

## 5. What Google Ads is supposed to do automatically vs. what's our job

### Google's automation (what the system optimizes on its own)

| Lever | Optimization signal |
|---|---|
| Which RSA combination of headlines + descriptions to show | CTR maximization within Maximize Clicks |
| Time-of-day / day-of-week ad serving | Click volume |
| Device split | Click volume |
| Auction CPC inside our $3 / $2 ceilings | Maximum clicks under budget |
| Geographic micro-targeting within US | Click volume |
| Search-term match to our phrase keywords | Native match-type behavior (this is where leakage happens) |
| Audience inference (in-market, affinity) — passively | Used by Smart Bidding once enabled |

### Our job (what Google will not do for us)

| Responsibility | Why |
|---|---|
| Picking which keywords to ADD | Google can recommend (Recommendations tab) but every recommendation in this niche has historically been bad — they almost always suggest broad / unrelated calculator terms (see "Campaign #1" orphan above). |
| Deciding which negatives to ADD | The most important ongoing job. Search-term harvesting must be daily. |
| Pausing / killing ad groups that disapprove | The blueprint code can re-create paused, but no automation to detect disapproval and pause spend on the disapproval reason. |
| Switching from Maximize Clicks → Maximize Conversions when ≥30 conversions land | Manual flip. |
| Adding sitelinks / callouts / structured snippets | Manual. |
| Geographic adjustments (city / state level) once data exists | Manual. |
| Day-part adjustments once data exists | Manual. |
| Compliance copy review | The `safety.ts` validator catches keyword/copy regressions before provisioning, but doesn't catch *new* policy patterns Google introduces. |
| Cross-account-tracking decisions (do we want it on the MCC?) | Currently OFF. Conversion actions live on the sub-account directly — fine for one account, would matter at scale. |

**The author's specific concern:** in the current setup, Google's "Recommendations" tab in the UI is showing many "not enough traffic" warnings and pushing us to add broad keywords / enable PMax / enable Display. The author is reasonably worried that **rejecting those recommendations is the right call for policy safety but the wrong call for finding low-CAC niches**. They want a reviewer's outside view on whether there's a smart middle path we're missing.

---

## 6. Operator-level concerns the author wants the reviewer to address

**Direct quote from the author:**

> A lot of google ads stuff im seeing on the dashboard is saying not enough traffic etc i don't want us to miss a goldmine of low CAC and stuck with high conversion words just due to lack of imagination

Translated into the questions a reviewer should answer:

1. **Are we under-keyworded?** AG3 has 15 keywords. AG4 has 2. Is that too tight to ever generate enough auction surface for Maximize Clicks to do meaningful learning? What's the right keyword count for the budget?

2. **Are we leaving low-CAC long-tail niches on the table?** "Recovery optimization calculator" is a phrase keyword. Is the long-tail of `bpc-157 reconstitution calculator`, `peptide reconstitution calculator`, `mock-up dose calculator`, `research peptide bac water calculator` something we should test, given that these keywords are highest-intent? Or is the policy risk a non-starter?

3. **Are our match types too restrictive?** Should we add a small-budget broad-match-modifier (or modern broad-match-with-conversion-data) experiment to discover terms we wouldn't think of?

4. **Are we wrong about Maximize Clicks?** Should we run a tiny separate campaign with Maximize Conversions even at low conversion volume to let Google's auto-bidder collect signal, given conversion tracking IS already firing?

5. **Should the AG3 ad copy be more aggressive on intent?** It currently leans heavily on "biohacker community / spreadsheet productivity". The author wonders if "Save 2 Hours On Recomp Math" / "Lab-Grade Calculations" / "Skip The Forum Hunt" punches harder for our actual ICP (peptide-curious researchers and biohackers).

6. **Are we reasonable to skip brand defense?** Or should `AG-Brand` be live now, even if traffic is zero, to seed it before any organic discovery starts?

7. **Are sitelinks / callouts / structured snippets a free 5–10% CTR uplift we're stupid not to ship?**

8. **What's a reasonable CAC ceiling for the first 30 days such that we'd say "this is working"?** AOV is $400–$900. Reserve-order conversion rate is unknown.

---

## 7. Constraints the reviewer should respect

- **Do not propose enabling Display Network.** Ever, in this niche.
- **Do not propose Performance Max.** Same.
- **Do not propose any keyword that contains a compound name.** BPC-157, TB-500, CJC-1295, Ipamorelin, MK-677, Ibutamoren, Sermorelin, GHRH, semaglutide, tirzepatide, etc.
- **Do not propose copy with "buy", "order", "dosing", "injection", "heal", "cure", "treat", "therapy", "prescription", "weight loss", "muscle gain", "anti-aging", "fda approved".**
- **`peptide` is a deliberate experiment in AG4 and may be discussed.** The author wants to know if the experiment is well-shaped or could be expanded.
- **Budget is the hard constraint.** Total ad spend ceiling is currently $14.29 + $5 = $19.29/day. Recommend within or near that envelope unless you make a strong argument for more.
- **Account-level suspension is the worst possible outcome.** Any "let's just try it and see if Google approves" recommendation must explicitly weigh that risk, not hand-wave it.
- **The store's payment processor is not yet wired** — the funnel currently captures via Reserve-Order (manual invoice within 24h). This means CAC measurement is real but cash flow is delayed; treat conversion-rate assumptions accordingly.

---

## 8. Codebase pointers (for context if useful)

These are relative paths from the repo root:

- `roji-ads-dashboard/src/lib/ads-blueprint.ts` — the codified blueprint (single source of truth).
- `roji-ads-dashboard/src/lib/safety.ts` — copy/keyword safety validator.
- `roji-ads-dashboard/src/lib/negative-keywords.ts` — master negative-keyword catalog with reasons.
- `roji-ads-dashboard/src/lib/ads-provisioner.ts` — idempotent provisioner (RSA dedup, etc.).
- `roji-ads-dashboard/scripts/audit-roji-account.js` — pulls live account state.
- `roji-ads-dashboard/scripts/provision-blueprint.ts` — CLI for dry-run / live provisioning.

---

## End of export.

**Reviewer:** please respond using the section structure in "How to use this document if you are the reviewer" at the top. Do not skip sections. Brief is fine; specific is mandatory. Thank you.
