# C2 — Peptide Research Keyword Expansion

> **Date:** 2026-05-01
> **Context:** C2 ("Peptide Research Experiment") is working. Real
> first-party search data shows people are searching for our exact
> intent in English, Spanish, German, and Portuguese.
> **Goal:** Expand C2 keywords from the current 7 to ~22 with
> high confidence each addition matches the same research intent
> that's already converting clicks at $1.55–$2.11 CPC.

## Why this isn't from Google's Keyword Plan Ideas API

We tried (`scripts/keyword-research.js`). The Roji Tools customer
account holds an **explorer-tier** developer token; Google's
KeywordPlanIdeaService requires **basic** access or higher. The
script throws:

```
authorization_error: 10
"This method is not allowed for use with explorer access."
```

Upgrading the dev token requires a separate application to
<https://developers.google.com/google-ads/api/docs/access-levels>
and ~3–5 business days of review. Not blocking this expansion on it.

**Better signal anyway:** we have the actual search-term report
from C2 with real impressions, real clicks, and real CTR — that's
strictly stronger evidence than Google's keyword volume estimates.

## What the C2 search-term report already tells us

From the user's pull on 2026-05-01:

| Search term | Match type | Status | Imps | Clicks | CTR | CPC |
|---|---|---|---|---|---|---|
| `peptide calculator` | Exact | **Added** | 73 | 1 | 1.37% | $2.11 |
| `chinese peptides` | Phrase (close variant) | None | 5 | 0 | 0% | — |
| `calculadora peptideo` | Exact (close variant) | None | 3 | 0 | 0% | — |
| `peptidrechner` | Exact (close variant) | None | 3 | 0 | 0% | — |
| `calculadora de peptídeo` | Exact (close variant) | None | 2 | 0 | 0% | — |
| `calculadora de peptídeos` | Exact (close variant) | None | 2 | 0 | 0% | — |
| `peptid rechner` | Exact (close variant) | None | 2 | 1 | 50% | $1.55 |
| `peptide dosage calculator` | Exact (close variant) | None | 2 | 0 | 0% | — |
| `peptide reconstitution calculator` | Exact (close variant) | None | 2 | 0 | 0% | — |
| `peptides calculator` | Exact (close variant) | None | — | — | — | — |

### What this tells us, in priority order

1. **`peptid rechner`** (German "peptide calculator") had 50%
   CTR on 2 impressions for $1.55 CPC. That's a STRONG signal
   despite tiny sample size — German researchers are searching
   for this and clicking through.
2. **Spanish/Portuguese close variants** (`calculadora peptideo`,
   `calculadora de peptídeo`, `calculadora de peptídeos`) appear
   organically as close variants of our Exact-match keywords.
   Adding them as their own keywords moves them from "close
   variant guess" to "first-class match."
3. **`peptide dosage calculator`** + **`peptide reconstitution
   calculator`** — already firing as close variants. Promote
   them to first-class Phrase or Exact.
4. **`peptides calculator`** (plural) is firing as a close
   variant of `peptide calculator`. Add explicit plural.
5. **`chinese peptides`** got 5 impressions with 0 clicks —
   shopping intent, not research. Add as a **negative keyword**
   so we stop wasting impressions.

## Recommended C2 keyword additions

I'm grouping into three tiers by confidence. Tier 1 is "ship now."
Tier 2 is "ship now if budget allows." Tier 3 is "test in a week."

### Tier 1 — Ship now (high confidence, first-party data backed)

These are direct upgrades of close-variants that already produced
impressions or clicks. Adding them as first-class keywords
removes the close-variant guesswork.

| # | Keyword | Match | Rationale |
|---|---|---|---|
| 1 | `peptide reconstitution calculator` | PHRASE | 2 organic close-variant impressions. Already long-tail intent. |
| 2 | `peptide dosage calculator` | PHRASE | 2 organic close-variant impressions. Note: `dosage` ≠ `dose` — Google treats them differently for ad-copy compliance, and `dosage calculator` is the standard biomed framing. |
| 3 | `peptides calculator` | PHRASE | Plural form firing as close variant. |
| 4 | `peptide concentration calculator` | PHRASE | High-intent reconstitution-adjacent searches; matches our actual landing-page math. |
| 5 | `peptide rechner` | EXACT | German `peptid rechner` had 50% CTR. Add as Exact for low CPC. |
| 6 | `calculadora de peptidos` | EXACT | Spanish close variant already firing. |
| 7 | `peptide half life calculator` | PHRASE | Complements our half-life database tool. Long-tail, low competition. |
| 8 | `peptide half life database` | PHRASE | Same as above; databasey framing. |

**Estimated weekly cost** at current $1.50–$2 CPC and current C2
budget ($15/day): no change to spend, just a wider net catching
more close-variant traffic.

### Tier 2 — Ship now if budget allows (research-intent expansion)

These keywords aren't yet in our search-term report but match the
same intent class. Adding them with PHRASE match keeps them
broad enough to capture variants but tight enough to filter shopping.

| # | Keyword | Match | Rationale |
|---|---|---|---|
| 9 | `research peptide calculator` | PHRASE | Adjacent to our top-performer (`peptide research calculator`); reverse-order word arrangement. |
| 10 | `peptide vial calculator` | PHRASE | Vial framing is research-coded; pulls reconstitution intent. |
| 11 | `peptide mixing calculator` | PHRASE | "Mixing" is a less-restricted synonym for reconstitution. |
| 12 | `peptide vendor comparison` | PHRASE | Lands on /cost-per-dose. High-intent, matches our `peptide quality` already-active keyword. |
| 13 | `peptide cost calculator` | PHRASE | Same as above — direct cost-per-dose intent. |
| 14 | `peptide purity test` | PHRASE | Lands on /coa. Matches `peptide coa` already-active keyword. |
| 15 | `peptide research database` | PHRASE | Lands on /half-life. Matches `peptide research tools` already-active keyword. |

### Tier 3 — Test in a week if Tier 1+2 are healthy

International / multilingual. Only worth running once Tier 1+2
have proven they convert; Spanish/German searchers may not buy
US peptides for shipping reasons.

| # | Keyword | Match | Rationale |
|---|---|---|---|
| 16 | `calculadora peptidos` | EXACT | Spanish, no `de`. Less common but firing as close variant. |
| 17 | `peptid rechner` | PHRASE | German broader match (vs. `peptide rechner` Exact in Tier 1). |
| 18 | `calculadora de peptideos` | EXACT | Portuguese close variant already firing. |
| 19 | `peptide research review` | PHRASE | Mid-funnel research intent. |
| 20 | `peptide reference guide` | PHRASE | Database intent. |

### Negative keywords to ADD to C2

These are catching traffic we don't want. The user's data
specifically calls out `chinese peptides`. Add these as
**campaign-level negatives** in C2:

| # | Negative | Match | Rationale |
|---|---|---|---|
| 1 | `chinese` | BROAD | `chinese peptides` was 5 imps / 0 clicks. Shopping intent. |
| 2 | `buy` | BROAD | Shopping intent. Already in our standard policy negatives but worth confirming on C2. |
| 3 | `cheap` | BROAD | Same. |
| 4 | `for sale` | PHRASE | Same. |
| 5 | `store` | BROAD | Same. |
| 6 | `pharmacy` | BROAD | Triggers Rx policy review. |
| 7 | `prescription` | BROAD | Same. |

## How to ship

1. Update `peptideExperimentAdGroup()` in
   `roji-ads-dashboard/src/lib/ads-blueprint.ts` with Tier 1
   keywords (8 additions).
2. Add the negative keywords to the C2 campaign's
   `negativeKeywords` list (or to the global
   `POLICY_NEGATIVE_KEYWORDS` if not already there).
3. `npm run blueprint:dryrun` to validate.
4. `npm run blueprint:live` to push.
5. **Wait 3–5 days** before judging. CTR < 0.5% on > 200
   impressions = pause. CPA visible = scale via Tier 2 next.

## Decision framework for the next iteration

After 7 days of data:

- **Good signal** (≥2% CTR on Tier 1 keywords): add Tier 2.
- **Mixed signal** (Tier 1 CTR varies wildly): keep the winners,
  drop the losers. Don't add Tier 2 yet.
- **Bad signal** (CTR < 1% across Tier 1): pause. The peptide
  experiment is fundamentally not working at our budget.

Tier 3 is only worth opening if both Tier 1 AND Tier 2 are
hitting positive ROAS.
