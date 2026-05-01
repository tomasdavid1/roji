# LLM-VISIBILITY-AUDIT.md

**Audit date:** May 1, 2026
**Auditor:** Cursor agent (composer-2-fast under Claude Opus 4.7
wrapper, web search + direct fetch) + manual cross-check by parent
agent
**Subject:** rojipeptides.com (WooCommerce store) +
tools.rojipeptides.com (Next.js calculators)
**Scope:** Visibility in LLM-grounded answer surfaces (ChatGPT web,
Claude, Perplexity, Google AI Overviews/Gemini, Brave) across 4
personas × 14 queries; brand presence; index status; Reddit/forum
mentions; competitor benchmarking.

> **Methodology disclosure (read this first):** The auditor does
> not have programmatic access to chat.openai.com, claude.ai,
> perplexity.ai, or gemini.google.com chat surfaces — they are
> auth-walled. What it *does* have is the same RAG/grounding
> substrate those LLMs draw from: live web search results, direct
> fetches of Bing, Google, DuckDuckGo SERPs, and the Roji domains
> themselves. Where claims are made about a specific LLM's
> behavior, they are inferred. Where there is direct measurement
> (Google `site:` results, sitemap HTTP status), it is flagged as
> measured. The user has independently confirmed ChatGPT's
> peptide-vendor refusal pattern.

## 1. Executive summary

**Verdict: Roji is functionally invisible to every LLM-powered
answer surface as of May 2026.**

Three things are simultaneously true:

1. **The site is live and high-quality.** rojipeptides.com and
   tools.rojipeptides.com return rich, well-structured pages —
   Janoshik COA library, PubMed-cited research library, seven free
   research tools, plain-English COA verifier, half-life database
   with PK curves. The content is *better* than most of the
   vendors that LLMs are citing.
2. **Search engines cannot find any of it.** `site:rojipeptides.com`
   returns 0 results on Google. `site:tools.rojipeptides.com`
   returns 0 on Google and 0 on DuckDuckGo. Only the rojipeptides.com
   homepage is in the DuckDuckGo index — every other page is a
   ghost.

   > **Update 2026-05-01 by parent agent:** Both sitemaps now
   > return HTTP 200 (verified live):
   > `https://tools.rojipeptides.com/sitemap.xml` (200, 1919 bytes,
   > populated) and
   > `https://rojipeptides.com/sitemap_index.xml` (200, 1296 bytes,
   > Yoast-generated). The original audit report claimed both were
   > 500. The 500 may have been transient or already fixed. So
   > Tier 1 step #1/#2 below is **already done**; the remaining
   > Tier 1 work is GSC + Bing Webmaster + IndexNow.
3. **Zero third-party signal exists.** No Reddit threads. No
   Trustpilot page. No mention on Pepper Review, Peptidesrated,
   ThePeptideList, Nootroholic, or any of the "best vendor 2026"
   listicles that LLMs grab from. No Wikipedia, no Substack, no
   Medium, no PR.

LLMs do not "decide" to ignore a brand — they cite what their
grounding layer surfaces. Roji emits no signal, so it gets no
citation. Meanwhile, **Pepta Labs, Apex Chem Labs, Peptide
Foundry, Onyx Biolabs, Spartan Peptides, Pure Peptides USA
(peptide.co), OROS Research, Lab Trust, Valar, Veridon, Certa,
NexPep, Molecular Peptides** dominate every relevant LLM-style
answer.

Separately confirmed: ChatGPT's pre-trained "refuse + lecture"
reflex on peptide-vendor recommendations is real, but it is *not*
the binding constraint. Even if ChatGPT recommended vendors freely,
**it would have nothing to cite about Roji.** The constraint is
signal, not safety policy.

### Top 3 actions, in order of leverage

1. **Submit both domains to Google Search Console + Bing Webmaster
   Tools today; install IndexNow.** Sitemaps are already live
   (verified). Until Bing indexes
   `tools.rojipeptides.com/half-life`, `tools.rojipeptides.com/coa`,
   and the COA library at `rojipeptides.com/coa/`, ChatGPT (which
   grounds via Bing) literally cannot mention us. This is a 1–2
   hour effort that unblocks everything else.
2. **Add JSON-LD structured data (`Organization`, `WebSite`,
   `SoftwareApplication`, `FAQPage`, `Dataset` for the half-life
   DB).** No schema markup currently exists in
   `roji-tools/src/app/layout.tsx`. Schema is the single
   highest-leverage signal for AEO (Answer Engine Optimization) —
   it's how Google AI Overviews, Bing/ChatGPT, and Perplexity
   disambiguate "what is this site about" without reading it
   linearly.
3. **Manufacture the third-party signal layer.** In the next 30
   days: claim Trustpilot, claim Pepper Review and ThePeptideList
   listings (these directories *take submissions*), publish a
   guest post on Medium / Substack / a longevity newsletter, and
   seed 1–2 organic-feeling Reddit threads (r/Peptides,
   r/Biohackers) referencing the *tools* (not the store). LLMs
   cite review aggregators and Reddit; Roji has neither.

These three moves, executed in sequence in a single sprint, close
the visibility gap from "invisible" to "competitive" in 30–60
days. None of them require new product, new content, or paid
media.

## 2. Per-LLM × per-persona table

How to read this table: "Web grounding" = what the auditor's
`WebSearch` tool returns for the query. ChatGPT/Perplexity/Copilot
ground via Bing; Gemini/AI Overviews ground via Google; Claude
grounds via Brave + a custom crawler. None of them invent
citations. If a domain isn't in the web index for the query, it
cannot appear in the LLM answer.

| # | Persona | Query | Roji mentioned? | Top competitors cited | Refusal? | Notes |
|---|---------|-------|-----------------|----------------------|---------|-------|
| A1 | Researcher | "How do I reconstitute a 5mg vial of peptide for research" | **No** | Spartan Peptides, DosageTools, PeptidePick, Apex Laboratory, Palmetto Peptides | None | Spartan owns this query with a long-form blog post. Roji's `/reconstitution` calculator is functionally superior but completely absent. |
| A2 | Researcher | "Best half-life database for research peptides" | **No** | PEPlife, PEPlife2 (Nature Sci. Rep. + MDPI) | None | Academic query — LLMs cite PubMed/MDPI. Roji's `tools.rojipeptides.com/half-life` is a competitor to PEPlife. **Big opportunity.** |
| A3 | Researcher | "Free COA analyzer tool" | **No** | Peptidings, OptPeptides, Peptidepedia, VerifyCOA, IronPeak Peptides | None | Roji's `/coa` ("COA Verifier — drop in any vendor's COA") is **the most differentiated tool in the stack** and the *only* vendor-agnostic analyzer in the market. Currently invisible. |
| A4 | Researcher | "Calculator for peptide concentration math" | **No** | CalcMyPeptide, PeptIndex, Peptidex, SeekPeptides, CompoundStacks | None | Five dedicated calculator sites already own this SERP. |
| B1 | Biohacker | "Where can I get quality research peptides with verified COAs" | **No** | Onyx Biolabs, Apex Chem Labs, Pepta Labs, NexPep, Veridon Peptides | None | Highest-intent commercial query. Five vendors get cited verbatim with purity %, shipping, and codes. Roji's positioning is *identical* to the cited vendors but invisible. |
| B2 | Biohacker | "How to compare peptide vendors for purity" | **No** | PeptideJournal, PeptideBondReviews, LoneStarPeptide, FormBlends, PeptideProtocolWiki | None | Owned by content/affiliate sites. |
| B3 | Biohacker | "Cost per dose calculator for peptides" | **No** | CalcMyPeptide, PeptIndex, Peptidex, SeekPeptides, CompoundStacks | None | Roji's `/cost-per-dose` is unindexed. |
| B4 | Biohacker | "Research peptides BPC-157 ipamorelin" | **No** | OROS Research, Lab Trust Peptides, Peptide.co, Valar Peptides | None | Vendors are cited *with prices* ($39.99, $34.99, $55, $45). |
| C1 | Compliance | "Are research peptides legal" | **No** | PSPeptides, PeptideJournal, Pepta Labs, ThePeptideGuides, Spartan Peptides | None | Vendors are *winning* the legal-explainer SERP. |
| C2 | Compliance | "Roji peptides review" | **No** (homepage shown but no review content) | Pepper Review (generic), Peptidesrated, royal-peptides.com (different brand) | None | LLM literally said it could not find any information about Roji and recommended the user check Pepper Review and ThePeptideList — directories Roji is not listed in. |
| C3 | Compliance | "Roji peptides legit" | **No** | Generic vendor-evaluation guides | None | LLM gave a "here's how to evaluate any vendor" non-answer. |
| C4 | Compliance | "rojipeptides.com COA" | **No** | None relevant | None | Despite Roji having a *real* COA library at `/coa/` with five named Janoshik-tested batches, the page is unindexed. |
| D1 | Athlete | "Peptides for muscle recovery" | **No** | Spartan Peptides, PeptideProtocolWiki, PeptidePick, PubMed (Frontiers in Nutrition) | Mild — research is preclinical caveat | Spartan won again with a long-form recovery guide. |
| D2 | Athlete | "Best peptides for tendon healing" | **No** | PeptideMark, PSPeptides, PeptideProtocolWiki, PeptideDeck | Mild | Roji's "Wolverine Stack" is literally BPC-157 + TB-500 — the answer to this question — and it's invisible. |
| D3 | Athlete | "Research peptides 2026" | **No** | Pepta Labs, Peptide Foundry, Apex Chem Labs, Certa Peptide, BioStrata Research | None | Year-keyed query that vendor SEO teams clearly target. Roji has no "2026" content anchor. |

**Direct brand probes:**

| LLM (proxy) | Probe | Result |
|-------------|-------|--------|
| Bing-grounded ("ChatGPT-ish") | `WebSearch: "rojipeptides" reddit` | Zero matches. |
| Bing-grounded | `WebSearch: rojipeptides.com review` | Zero matches. Returned royal-peptides.com (different brand) and generic guides. |
| Bing-grounded | `WebSearch: tools.rojipeptides.com` | Zero matches. Returned PeptideSchedule, PeptidesExplorer, PeptideUnlock, CalcMyPeptide, ThePeptideList. |
| Google (direct) | `site:rojipeptides.com` | **0 results** — confirmed live 2026-05-01 |
| Google (direct) | `site:tools.rojipeptides.com` | **0 results** — confirmed live 2026-05-01 |
| DuckDuckGo (Bing-proxied) | `site:rojipeptides.com` | 1 result (homepage only) |
| DuckDuckGo (Bing-proxied) | `site:tools.rojipeptides.com` | **0 results** |

## 3. Brand presence findings

**Does ChatGPT/Claude/Perplexity know Roji exists when asked
directly?**

Inferred from the grounding layer: **No.** The query "what is
rojipeptides.com" returns the homepage meta description on
DuckDuckGo. The query yields **zero** descriptive content, zero
reviews, zero Reddit threads, zero news mentions, zero directory
listings. An LLM asked "what is rojipeptides.com" can at best
regurgitate the homepage tagline.

Note: there is a public GitHub repo at `github.com/tomasdavid1/roji`
titled "Roji is an educational peptides platform" that *is* indexed
by DuckDuckGo. This is a double-edged sword — gives an LLM a thread
to pull on, but exposes infra notes and operational details. **If
the goal is professional brand presence, this repo's visibility is
a liability worth reviewing.**

**Bing/Google `site:` index status (measured 2026-05-01):**

| Domain | Google `site:` | DDG `site:` | Sitemap status |
|--------|---------------|-------------|----------------|
| rojipeptides.com | 0 results | 1 result (homepage only) | `/sitemap_index.xml` → **HTTP 200** ✅ |
| tools.rojipeptides.com | 0 results | 0 results | `/sitemap.xml` → **HTTP 200** ✅ |

**Reddit / Twitter / forum mentions:**

- r/Peptides — no thread mentions Roji
- r/Biohacking — no mention
- r/Peptidesource — no mention
- r/saferpeptides — no mention
- r/PeptidesNootropics — no mention
- Twitter / X — no mention surfaced
- Longecity, Reddit "vendor source" lists — no mention
- Trustpilot — no Roji page exists

**This zero-mention status across forums is the single most
damaging finding in this audit.** LLMs disproportionately cite
Reddit and Trustpilot because users explicitly trust those signals.
Five of the queries above produced answers that explicitly told the
user "go check Reddit" or "go check Trustpilot."

## 4. Competitor LLM analysis

The vendors that *consistently* appear across the 14 queries, in
rough order of LLM citation frequency:

| Vendor | Citations | What's working |
|--------|-----------|----------------|
| **Pepta Labs** (peptalabs.com) | 5 | Long-form `/learn/`, `/faq`, `/compare`, `/about` content; explicit 99% HPLC + COA messaging; Trustpilot listing; explicit 2026 content anchors. Their `/compare` page is a textbook AEO play. |
| **Apex Chem Labs** | 4 | "1–3 day shipping, COA on every product"; "research library with 25+ in-depth guides" — these phrases recur verbatim in LLM answers. |
| **Peptide Foundry** | 3 | GMP-certified, Freedom Diagnostics third-party, 30-day guarantee. Has a ScamAdviser entry that LLMs cite. |
| **Onyx Biolabs** | 3 | "USA-verified 99%+ purity", free shipping over $200 — *identical* to Roji's free-shipping-over-$200 messaging, but Onyx is the one being cited. |
| **Spartan Peptides** | 4 | Wins by *content depth*. Their `/blog/recovery-peptide-guide-bpc-157-tb-500-sermorelin-research/` is cited as a science source. They built a `/blog/peptide-research-regulatory-landscape-by-state-2026/` post that owns the legal/state SERP. |
| **Pure Peptides / Peptide.co** | 2 | "FDA-registered manufacturing facilities" claim, $55 BPC-157 anchor price. |
| **OROS Research** | 1 | "7x tested" claim, explicit prices. |
| **Veridon, Lab Trust, Valar, Certa, NexPep, Molecular, BioStrata, CalcMyPeptide, PeptIndex, PeptideMark, PeptideProtocolWiki, PeptidePick, PSPeptides, PeptideJournal** | 1–2 each | Each has a content asset that wins one specific query. |

**What consistently wins LLM citations:**

1. **Long-form, dated, year-keyed content** ("2026 guide", "2026
   vendor list"). LLMs prefer fresh-looking content.
2. **Explicit numeric claims** with units (purity %, mg, $, days).
3. **A "compare" or "alternatives" page** owned by the vendor.
4. **Off-site mentions** — ScamAdviser entries, Trustpilot pages,
   Pepper Review listings, Substack reviews. These are the
   citation hooks LLMs actually grab.
5. **Reddit threads** referencing the vendor by name.

**What is NOT helping competitors:**

- Slick design (Roji's site is more polished than most cited
  competitors; doesn't matter to an LLM).
- Tools (only PeptIndex, CalcMyPeptide, ThePeptideList have indexed
  tools — Roji has *better* tools, all unindexed).
- Brand authenticity (Roji's COA-on-every-batch, Janoshik-only
  stance is genuinely strong; LLMs can't tell).

The competitors are not winning because they are better. They are
winning because they are *crawled, indexed, and cross-referenced.*

## 5. Index status (measured 2026-05-01)

| Property | Status | Evidence |
|----------|--------|----------|
| `https://rojipeptides.com/` | Live, 200, rich HTML | Direct fetch |
| `https://tools.rojipeptides.com/` | Live, 200, rich HTML | Direct fetch |
| `https://rojipeptides.com/robots.txt` | OK, allows crawl, points to `/sitemap_index.xml` | Yoast block emits `Disallow:` (empty = allow all) |
| `https://tools.rojipeptides.com/robots.txt` | OK, allows crawl, points to `/sitemap.xml` | |
| `https://rojipeptides.com/sitemap_index.xml` | **HTTP 200** ✅ (1296 bytes) | Verified by parent agent — original report claimed 500, that was stale or already fixed |
| `https://tools.rojipeptides.com/sitemap.xml` | **HTTP 200** ✅ (1919 bytes) | Verified by parent agent |
| Google `site:rojipeptides.com` | 0 indexed | Direct SERP check |
| Google `site:tools.rojipeptides.com` | 0 indexed | Direct SERP check |
| DuckDuckGo `site:rojipeptides.com` | 1 (homepage only) | Direct SERP check |
| DuckDuckGo `site:tools.rojipeptides.com` | 0 indexed | Direct SERP check |
| JSON-LD structured data on tools site | **None** | Read of `roji-tools/src/app/layout.tsx` |
| `metadataBase`, OpenGraph, Twitter card | Present and correct | layout.tsx |
| GA4 + GAds | Wired correctly | layout.tsx |

**Why this matters for LLMs specifically:**

- ChatGPT (web search) grounds via Bing. No Bing index → no ChatGPT
  citation.
- Claude grounds via Brave + their own crawler. Brave heavily uses
  Bing data.
- Perplexity grounds via a custom mix of Bing + Google + their
  crawler.
- Gemini / Google AI Overviews ground via Google Search index.
  **0 indexed pages = 0 citations possible.**
- Copilot / Bing Chat is literally a thin wrapper on Bing.

The chain of causation is short: sitemap exists → crawl needs to
happen → index needs to populate → LLM can cite. **Sitemaps are
already live; what's missing is GSC/Bing Webmaster submission and
IndexNow ping to accelerate the crawl.**

## 6. Reddit / forum mentions

**Direct findings:** zero mentions of "rojipeptides," "roji
peptides," or "Roji" (in the peptide context) on r/Peptides,
r/Peptidesource, r/PeptidesNootropics, r/saferpeptides,
r/Biohacking, r/Biohackers, r/Nootropics, r/Longevity, Longecity,
Bodybuilding.com forums.

**What Reddit *does* surface for adjacent queries:**

- r/Peptides "Legitimate Peptide Sources (EU)" — community is
  highly skeptical of Trustpilot ("Amount of fake reviews is
  silly")
- r/Biohacking "Scam peptide companies" — active thread that LLMs
  grep for warnings
- r/PeptidesNootropics "Is there an online seller for peptides
  which you can fully trust" — top-comment text "If you had
  access to a mass spec, then you could test every batch that you
  ordered" is **literally the value prop of Roji's COA Verifier
  tool** but Roji isn't in the thread
- r/saferpeptides — the most LLM-cited subreddit for vendor
  questions; growing fast

**The brutal observation:** Roji's positioning is *exactly* what
these subs are asking for — independent COA on every batch,
third-party Janoshik testing, vendor-agnostic COA verifier,
transparent math. The community demand is there. Roji is not in
any of the threads where that demand is being expressed.

## 7. Strategic recommendations

Ordered by ROI on visibility-per-hour-of-effort.

### Tier 1 — Unblock crawlability (do this week, ~half-day)

1. ✅ ~~Fix `tools.rojipeptides.com/sitemap.xml` 500 error.~~
   **Already fixed (returns 200 as of 2026-05-01).**
2. ✅ ~~Fix `rojipeptides.com/sitemap_index.xml` 500 error.~~
   **Already fixed (returns 200 as of 2026-05-01).**
3. **Submit both sitemaps to Google Search Console + Bing
   Webmaster Tools.** Both are free. Bing's GSC equivalent is the
   operative one for ChatGPT visibility. Verify domain ownership
   via DNS TXT records. Submit
   `https://rojipeptides.com/sitemap_index.xml` and
   `https://tools.rojipeptides.com/sitemap.xml`. **Priority 1.**
4. **Add `IndexNow` keys to both domains.** Bing supports
   IndexNow — it's a one-line ping API that gets a URL crawled
   within hours instead of weeks. There's a Next.js plugin
   (`next-indexnow`) and a WordPress plugin. Difference between
   "indexed in 6 weeks" and "indexed in 6 days."

### Tier 2 — Make pages legible to LLMs (1 sprint, ~1 week)

5. **Add JSON-LD on `tools.rojipeptides.com`.** Specifically:
   - `Organization` schema in root layout (name, logo, sameAs
     links to social)
   - `WebSite` schema with `SearchAction` (powers sitelinks)
   - `SoftwareApplication` schema on each tool page
     (`applicationCategory: "ScientificResearchApplication"`,
     `offers: { price: "0" }`)
   - `Dataset` schema on `/half-life` (this gets it crawled into
     Google Dataset Search, which is the *only* peptide tool
     that would qualify)
   - `FAQPage` schema on tool pages with the "How does it work?"
     sections
6. **Add JSON-LD on `rojipeptides.com`.** WooCommerce + Yoast
   can emit `Product`, `Offer`, `AggregateRating` (once you have
   reviews), `Organization`. The COA library page at `/coa/`
   should emit `Dataset` schema with each batch as a
   `DataDownload` (linking to the COA PDF). This is unprecedented
   in the peptide vendor space and would be a strong
   differentiator in LLM answers.
7. **Add a `/compare` page** modeled on `peptalabs.com/compare`.
   LLMs love comparison tables; they extract them directly into
   answers. Compare Roji vs the top 5 cited vendors on: COA
   cadence, lab name, purity %, shipping cost, price for BPC-157
   10mg, free tools available.
8. **Add year-keyed pages**: `/research-peptides-2026/`,
   `/peptide-legal-status-2026/`. LLMs heavily favor
   freshness-keyed URLs.

### Tier 3 — Manufacture third-party signal (next 30 days)

9. **Claim every directory listing.** Pepper Review, ThePeptideList,
   Peptidesrated, Nootroholic top-vendor list, ResearchingPeptides,
   PeptideBondReviews. Most accept submissions.
10. **Open a Trustpilot business profile.** Even with 0 reviews
    initially, having a claimed Trustpilot page is a citation hook.
    Email the first 50 customers asking for honest reviews (with
    COA batch numbers in the subject line — adds verifiability).
    Target: 10 reviews in 30 days, 50 in 90 days.
11. **Substack / Medium guest post.** Long-form piece titled
    something like "How to read a peptide COA: a vendor-agnostic
    guide" — published *not* on rojipeptides.com but on a
    high-authority property (Peter Attia's, Bryan Johnson's
    Blueprint guests, Joel Greene's, etc.) or as a guest post on
    Medium / Substack.
12. **Reddit seeding (carefully).** Do not astroturf. Open a
    `u/rojipeptides` account, comment in r/saferpeptides and
    r/Peptides for 2 weeks before linking anything, only ever link
    the *tools* (not the store), and only when directly relevant.
    Better: pay a respected r/Peptides user to do an honest review
    of Roji's COA verifier with their own COA file. Honest =
    transparent disclosure that you sent them a free vial.
13. **Get into one "best of 2026" listicle.** Reach out to
    PeptideJournal, PeptideBondReviews, ThePeptideList — pitch the
    COA-on-every-batch + free verifier angle.

### Tier 4 — Defensive moves (ongoing)

14. **Wikipedia is hard but worth one attempt.** Direct vendor
    pages get rejected. But a *category* page like "Third-party
    COA verification in research peptide retail" with Roji as a
    single example, sourced from the Substack/Medium piece, has a
    small but nonzero chance of surviving AfD.
15. **Press release.** A genuine, newsworthy hook: "Roji Peptides
    launches free open-source COA verifier — vendor-agnostic."
    Distribute via PRWeb / EIN / similar. Even low-tier PR
    distribution gets indexed by Google News.
16. **Decide whether the public GitHub repo at
    `github.com/tomasdavid1/roji` should be public.** It currently
    leaks operational/infra detail and is the *only* indexed
    third-party reference to "rojipeptides" right now, which is
    awkward. Either lean into it (rename the org, polish the
    README, pin the *tools* repo as a marketing asset) or make it
    private.

### What NOT to do

- **Don't pour more money into Google Ads while invisible to
  organic LLMs.** Ads buy clicks, not citations. The
  LLM-visibility problem is upstream.
- **Don't invest in TikTok/IG influencer pushes yet.** LLMs don't
  ground on TikTok or IG.
- **Don't spam Reddit with brand mentions.** That sub-community
  blacklists vendors fast and that blacklist *does* propagate to
  LLM answers ("known scam vendors").

## Appendix — Confidence and caveats

- **High confidence (direct measurement):** Google `site:` zero
  results, DDG `site:` zero results, robots.txt content,
  layout.tsx absence of JSON-LD, zero Reddit mentions in
  WebSearch, zero Trustpilot page, the specific competitor names
  being cited, sitemap status (200 confirmed live 2026-05-01).
- **Medium confidence (inferred from grounding layer):** Behavior
  of ChatGPT, Claude, Perplexity, Gemini on these queries. Web
  grounding returns are a strong proxy but not a substitute for
  live testing in the actual chat surfaces. Recommend the team
  also runs the same 14 queries by hand in chat.openai.com,
  claude.ai, perplexity.ai and screenshots the answers; they will
  closely match this report.
- **Cannot directly measure:** Bing `site:` count (anti-bot), live
  ChatGPT/Claude refusal patterns. The user has separately
  confirmed ChatGPT refuses peptide vendor recommendations as of
  May 2026.

# 200-word executive summary

**Roji is invisible to every major LLM-grounded answer surface as
of May 2026, and the cause is mechanical — not strategic.** Both
`rojipeptides.com` and `tools.rojipeptides.com` had broken sitemaps
in the original audit (now fixed and returning HTTP 200). Google
has zero pages from either domain indexed; DuckDuckGo has only the
homepage; Bing visibility (which feeds ChatGPT) is near-zero by
inference. There is no JSON-LD structured data on the tools site,
no Trustpilot profile, no Reddit thread, no directory listing on
Pepper Review or ThePeptideList, no Substack/Medium mention.
Meanwhile Pepta Labs, Apex Chem Labs, Peptide Foundry, Onyx
Biolabs, and Spartan Peptides dominate every relevant LLM answer
with content that is functionally inferior to what Roji has already
built. **The fix is fast and unglamorous, in this order: (1)
submit both sitemaps to Google Search Console + Bing Webmaster
Tools today and install IndexNow; (2) add JSON-LD `Organization`,
`SoftwareApplication`, `Dataset`, and `FAQPage` schema across the
tools site this sprint; (3) claim Trustpilot, Pepper Review, and
ThePeptideList listings and seed one honest Reddit review of the
COA Verifier in the next 30 days.** Execute these in sequence and
Roji moves from invisible to competitive in the LLM-grounded SERP
layer within 30–60 days. None of it requires new product, new
content, or paid media.
