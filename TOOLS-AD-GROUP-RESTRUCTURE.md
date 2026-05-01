# Roji Google Ads — Per-Tool Ad Group Restructure for External Review

**Snapshot date:** 2026-04-30
**Context:** This is the third of three external review documents. The first two (`GADS-STRATEGY-EXPORT.md`, `TOOLS-CONVERSION-EXPORT.md`) covered overall strategy and tools-site UX. This document covers a specific structural change: **splitting Campaign 1 into per-tool ad groups, each routing to a tool-specific landing page.**

All four prior reviewers (Claude, ChatGPT, Gemini, Grok) unanimously identified the current "every keyword lands on the homepage" routing as a HIGH-impact CRO mistake. This export proposes the restructure and asks the reviewers to validate, adjust, and stress-test it before we build.

---

## How to use this document if you are the reviewer

Please respond using **exactly this structure**. Do not omit any section.

```
1. ONE-LINE VERDICT
   Is the proposed structure right? Too many ad groups? Too few?
   Wrong split?

2. STRUCTURE VALIDATION
   Per-ad-group critique. For each proposed ad group:
   - Keep / merge / drop
   - Suggested keyword changes
   - Suggested RSA angle changes

3. KEYWORD DISTRIBUTION CONCERNS
   Some ad groups end up with only 2-3 keywords. Will they
   starve for impressions? What's the right minimum to keep
   Google's auction surface healthy?

4. AG-GENERIC FATE
   Should the "biohacker generic" catch-all ad group exist
   at all if every keyword has a clear tool home? What's
   the strongest argument for keeping it vs. removing it?

5. RSA STRATEGY PER AD GROUP
   For each proposed ad group, what's the strongest RSA
   angle? (We need 1-2 RSAs per ad group; this is where
   per-tool copy actually pays off.)

6. POLICY RISK CHANGES
   Does this restructure introduce new policy risk? In
   particular, AG-Reconstitution and AG-CostPerDose are
   closer to the policy danger zone (preparation, dose).
   How do we mitigate?

7. WHAT YOU'D DO DIFFERENTLY
   If you were architecting from scratch given the same
   constraints, would you split this way? If not, how?

8. THE HONEST QUESTION
   What's the ONE structural choice that, if we get it
   wrong, will hurt the most?
```

---

## 1. Why we're restructuring

**Current state (live in Google Ads as of today):**

```
C1 — Research Tools — Calculators ($25/day)
├── AG3 — Biohacker Intent (23 phrase-match keywords)
│     Final URL: tools.rojipeptides.com (homepage)
└── AG5 — Fitness Calculator Intent (6 phrase-match keywords)
      Final URL: tools.rojipeptides.com (homepage)
```

**Problem:** Every keyword — including highly specific ones like `"reconstitution calculator"`, `"half life calculator"`, `"coa analyzer"` — lands on the homepage tool grid. The user has to find and click the right tool card before they get value. This is two extra steps and a page load between ad click and tool engagement.

**Quote from one of the four AI reviewers:**

> "Landing every paid click on the homepage is wrong for conversion and likely wrong for Quality Score. A search for 'reconstitution calculator' should land on /reconstitution. Every extra click between the ad and the tool is a 20-30% drop in conversion."

All four reviewers independently reached the same conclusion: route specific-intent keywords to tool-specific URLs.

---

## 2. The tools we have

Live tools at `tools.rojipeptides.com`:

| Route | Tool | What it does | Has store CTA? |
|-------|------|--------------|---------------|
| `/reconstitution` | Reconstitution Calculator | Vial size + BAC water → mcg per syringe unit | Yes |
| `/half-life` | Half-Life Database | Compound pharmacokinetics, decay curves | Yes |
| `/coa` | COA Analyzer | Upload Certificate of Analysis, scan for red flags | Yes |
| `/cost-per-dose` | Cost-Per-Dose Calculator | Compare $/mg, $/dose across vendors | Yes |
| `/bloodwork` | Bloodwork Interpreter | Visualize blood panel vs. reference ranges | Yes (just added) |
| `/recomp` | Body Recomp Calculator | TDEE, macros, projected composition over 8-24 weeks | Yes (just added) |
| `/research` | Research Database | Curated PubMed search with plain-English summaries | Yes (just added) |
| `/tracker` | Stack Tracker (beta) | Local-first stack journal | Yes (just added) |

---

## 3. Proposed restructure

```
C1 — Research Tools — Calculators ($25/day)
├── AG-Reconstitution     → /reconstitution
├── AG-HalfLife           → /half-life
├── AG-COA                → /coa
├── AG-CostPerDose        → /cost-per-dose
├── AG-Recomp             → /recomp        (includes fitness keywords)
└── AG-Generic            → / (homepage)   (catch-all biohacker terms)

C3 — Brand Defense ($5/day) — UNCHANGED
└── AG-Brand              → rojipeptides.com

C2 — Peptide Experiment ($5/day, paused) — UNCHANGED
└── AG4 — Peptide Research → /
```

**Deliberate omissions:**

- **No AG-Bloodwork.** Bloodwork → peptide purchase is the weakest commercial bridge. The compliance risk (bloodwork keywords could trigger health-classifier review) doesn't justify spending separately. Bloodwork-related searches stay parked in AG-Generic if anywhere.
- **No AG-Research.** "Research database" / "PubMed" intent is too educational and too far from purchase. Same logic.
- **No AG-Tracker.** Stack Tracker is positioned as "Coming Soon" on the homepage; not a paid-traffic destination yet.

---

## 4. Per-ad-group proposal

### AG-Reconstitution → /reconstitution

**Final URL:** `tools.rojipeptides.com/reconstitution`
**CPC ceiling:** $3.00
**Keywords (phrase, all low risk):**
- `"reconstitution calculator"`
- `"vial calculator"`
- `"bac water calculator"`

**RSA angle:** "The math you need before you ever touch a vial." — concrete, tool-specific, value-first.

**Headlines (proposed):**
- "Reconstitution Calculator"
- "Free BAC Water Math"
- "Vial → Syringe Unit Math"
- "Calculate Concentrations"
- "Free Reconstitution Tool"
- "Mcg Per Syringe Tick"
- "Lab Math In 60 Seconds"
- "Built For Researchers"
- "Roji Research Tools"
- "Skip The Forum Math"
- "Free Reconstitution Calc"
- "Reconstitution In Seconds"
- "Personalized Math"
- "Evidence-Based Tool"
- "Start Calculating — Free"

**Descriptions:**
- "Input vial size and water volume, get exact mcg per insulin-syringe tick. Free, no signup."
- "The reconstitution math you need before you ever touch a vial. Browser-based, fast, free."
- "Skip the forum spreadsheets. Calculate concentrations and units in 60 seconds. Free tool."
- "Lab-grade reconstitution math, calibrated to your vial. Built by researchers, for researchers."

---

### AG-HalfLife → /half-life

**Final URL:** `tools.rojipeptides.com/half-life`
**CPC ceiling:** $3.00
**Keywords (phrase, low risk):**
- `"half life calculator"`
- `"half life database"`
- `"half life comparison"`
- `"compound half life"`

**RSA angle:** "Compare pharmacokinetic profiles." — database / discovery tool, less calculation-y.

**Headlines (proposed):**
- "Half-Life Database — Free"
- "Compare Compound Half-Lives"
- "Pharmacokinetic Profiles"
- "Decay Curves, Visualized"
- "20+ Compounds Covered"
- "Cited Half-Life Data"
- "Free Research Database"
- "Roji Research Tools"
- "Built For Researchers"
- "PubMed-Cited Data"
- "Compound Comparison Tool"
- "Half-Life Made Visual"
- "Lab Math In 60 Seconds"
- "Evidence-Based Tools"
- "Browse — Free"

**Descriptions:**
- "Half-life ranges, molecular weights, and pharmacokinetics for 20+ research compounds. Cited."
- "Compare decay curves, MW, and pharmacokinetic profiles across compounds. Free, referenced."
- "PubMed-cited half-life data for the most-researched compounds. No account, no paywall."
- "Visualize compound decay curves with referenced data. Built for researchers, free."

---

### AG-COA → /coa

**Final URL:** `tools.rojipeptides.com/coa`
**CPC ceiling:** $3.00
**Keywords (phrase, low risk):**
- `"coa analyzer"`
- `"certificate of analysis checker"`
- `"coa verifier"`

**RSA angle:** "Vendor verification / trust" — speaks directly to research-compound buyers' top pain (sketchy COAs).

**Headlines (proposed):**
- "Free COA Analyzer"
- "Verify Your COA"
- "Spot COA Red Flags"
- "Certificate Of Analysis Tool"
- "Free Vendor COA Checker"
- "HPLC Purity Analyzer"
- "Roji Research Tools"
- "Built For Researchers"
- "Lab COA Translator"
- "COA In Plain English"
- "Free, Files Stay Local"
- "Janoshik COA Standards"
- "Evidence-Based Tools"
- "Catch Sketchy COAs"
- "Upload — Free"

**Descriptions:**
- "Drop in any vendor's COA. We translate every line into plain English and flag red flags."
- "Verify HPLC purity, MS confirmation, and lab accreditation. Free, files never leave your device."
- "Spot fake or incomplete COAs in seconds. Built by researchers tired of sketchy vendor reports."
- "Free COA analyzer with Janoshik-grade verification standards. Upload, get a trust score."

---

### AG-CostPerDose → /cost-per-dose

**Final URL:** `tools.rojipeptides.com/cost-per-dose`
**CPC ceiling:** $3.00
**Keywords (phrase, low risk):**
- `"cost per dose calculator"`
- `"compound cost calculator"`

**RSA angle:** "True cost / vendor comparison." — commercial intent without saying "buy."

**Headlines (proposed):**
- "Cost-Per-Dose Calculator"
- "Compare Vendors Free"
- "True Cost Per Dose"
- "$/mg Comparison Tool"
- "Vendor Cost Calculator"
- "Free Compound Calculator"
- "Compare Research Stacks"
- "Roji Research Tools"
- "Built For Researchers"
- "Lab Math In 60 Seconds"
- "Free Vendor Comparison"
- "Cost Per Vial Math"
- "Evidence-Based Tools"
- "Skip The Spreadsheet"
- "Calculate — Free"

**Descriptions:**
- "Input vial mg + price + target dose. Get $/mg, $/dose, and total doses per vial. Free."
- "Compare any vendor anonymously. We do the math. Browser-based, no account needed."
- "What's a vial actually costing you per dose? Add vendors, we'll rank them. Free tool."
- "Vendor cost comparison built for researchers. Transparent math, no marketing fluff."

---

### AG-Recomp → /recomp

**Final URL:** `tools.rojipeptides.com/recomp`
**CPC ceiling:** $2.50 (lower — fitness keywords are cheaper, more competitive)
**Keywords (phrase, low risk):**
- `"body recomp calculator"`
- `"body recomposition calculator"`
- `"body composition calculator"`
- `"tdee calculator"`
- `"macro calculator"`
- `"body fat calculator"`
- `"lean bulk calculator"`
- `"cutting calculator"`

**RSA angle:** "Personalized body composition projections" — fitness-first, peptide-adjacent.

**Headlines (proposed):**
- "Body Recomp Calculator"
- "Free TDEE Calculator"
- "Macro Calculator — Free"
- "16-Week Composition Plan"
- "Personalized Recomp Math"
- "Free Body Fat Calculator"
- "Lean Bulk Planner"
- "Cutting Calculator"
- "Roji Research Tools"
- "Built For Researchers"
- "Free Calculator Suite"
- "60-Second Recomp Math"
- "Evidence-Based Tools"
- "Skip The Spreadsheet"
- "Start Calculating — Free"

**Descriptions:**
- "TDEE, macros, and projected body composition over 8-24 weeks. Calibrated to your data."
- "Personalized recomp math in 60 seconds. Free, browser-based, no signup needed."
- "Replace your fitness spreadsheet with a calibrated calculator. Free, fast, evidence-based."
- "16-week body composition projection based on your TDEE, training, and goal. Free tool."

---

### AG-Generic → / (homepage)

**Final URL:** `tools.rojipeptides.com` (homepage)
**CPC ceiling:** $3.00
**Keywords (phrase, low risk):**
- `"biohacking tools"`
- `"biohacking calculator"`
- `"biohacker calculator"`
- `"biohacking stack builder"`
- `"body optimization tools"`
- `"performance optimization tools"`
- `"performance research tools"`
- `"recovery optimization calculator"`
- `"recovery stack calculator"`
- `"advanced recovery planner"`
- `"lean mass research planner"`
- `"optimization framework builder"`
- `"fitness research tools"`
- `"bloodwork interpreter"`

**Rationale:** These are broad-intent terms where the homepage is genuinely the right destination — the user is exploring, not looking for a specific tool. Bloodwork lives here too (no dedicated AG).

**RSA angle:** "Suite of free research tools" — current AG3 RSA #1 carries over here essentially as-is, since it was always the best fit for "tour the catalog" intent.

---

## 5. Net change summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| C1 ad groups | 2 | 6 | +4 |
| Total keywords across C1 | 29 | ~33 | +4 |
| RSAs in C1 (1 per AG, expandable to 2-3 later) | 4 | 6 | +2 |
| Tool-specific landing pages | 0 | 5 | +5 |
| Average keyword per AG | 14 | 5.5 | down |
| Daily budget | $25 | $25 | unchanged |

---

## 6. Concerns the reviewer should address

### Concern 1: Will small ad groups starve?

AG-COA has 3 keywords. AG-CostPerDose has 2. At Maximize Clicks bidding with $25/day budget split across 6 ad groups, will Google's auction give COA enough impressions to learn?

### Concern 2: Should there even BE an AG-Generic?

If every keyword has a clear tool home, the catch-all might just dilute spend. But removing it kills broad-intent traffic that might convert. What's the right call?

### Concern 3: Reconstitution + Cost-Per-Dose policy risk

"Reconstitution" is chemistry-adjacent. "Dose" is in "cost-per-dose." Even with `tools.rojipeptides.com/reconstitution` as the landing page (a math calculator, not a pharmacy), Google's classifier may flag these. How do we soften the framing without losing the keyword intent?

### Concern 4: Per-AG RSA quality vs. quantity

Each new ad group needs at least 1 RSA. Should we ship 1 RSA per AG (lighter touch, faster review) or 2-3 per AG (more variation for Google to optimize, but more review surface area)?

### Concern 5: Budget reallocation

If AG-Reconstitution converts 5x better than AG-Recomp, should the budget shift automatically (campaign-level Maximize Clicks doesn't redistribute by AG performance)? Or do we need to split into separate campaigns per tool?

---

## 7. Constraints the reviewer should respect

- **Total daily budget stays at $25 for C1.** No budget bump in this proposal — the question is structural, not financial.
- **Keep AG-Brand and C2 untouched.** They're fine as-is.
- **No new keywords beyond what's already in the live blueprint.** This is a redistribution exercise, not a keyword-expansion exercise.
- **All keywords stay phrase-match.** No broad, no exact (yet).
- **All landing pages must be on `tools.rojipeptides.com` subdomain.** No direct routing to the store from ads.
- **No compound names anywhere.** No "BPC-157," "TB-500," etc.
- **No therapeutic / human-use language.** No "dosing," "injection," "treat," "heal."
- **Account-level suspension is the worst outcome.** Recommendations must explicitly weigh that risk.

---

## 8. What we want from this review

1. **Structural validation:** Is 6 ad groups the right number? Too many? Too few?
2. **Per-AG keyword adjustments:** Is "vial calculator" really high-intent for AG-Reconstitution? Is "tdee calculator" worth the spend in AG-Recomp given fitness traffic rarely converts to peptide purchases?
3. **Per-AG RSA copy critique:** Are the headlines/descriptions specific enough to each tool to justify the split, or are they still too generic?
4. **AG-Generic survival:** Does it earn its place, or kill it?
5. **Risk hot spots:** Which proposed ad group has the highest disapproval probability, and how do we mitigate?

---

## End of export.

**Reviewer:** please respond using the section structure at the top. Be specific. We will compare 4 reviewers' responses side-by-side and adjust before provisioning. Account-level safety is the hard constraint; everything else is negotiable.

---

## POST-REVIEW DECISIONS (updated after 4-AI review)

All four reviewers submitted responses. The decisions we shipped into the blueprint:

### Structural
- **Kept:** 5 tool-specific ad groups in C1 (AG-Reconstitution, AG-HalfLife, AG-COA, AG-CostCompare, AG-Generic).
- **Renamed:** AG-CostPerDose → **AG-CostCompare** (ChatGPT + Gemini consensus — keep "dose" out of ad group label and ad copy, URL route `/cost-per-dose` unchanged).
- **Moved:** AG-Recomp from C1 → **new C4 campaign** at $5/day (Claude + Gemini consensus — fitness CPCs would cannibalise C1 under Maximize Clicks).
- **Kept separate:** AG-COA and AG-CostCompare (ChatGPT + Gemini view — different intent personas, cleaner per-tool conversion data).

### Copy (policy softening)
- **Reconstitution RSA:** stripped "syringe", "tick", "insulin", "before you touch a vial" entirely (unanimous consensus across all 4 reviewers).
- **CostCompare RSA:** stripped "dose" from all headlines and descriptions. Lead with "Research Cost Calculator" / "Vendor Cost Calculator" framing.
- **COA RSA:** dropped "Janoshik" from ad copy (kept on landing page). Replaced "Janoshik COA Standards" headline with "Third-Party COA Standards".
- **All ad groups ship with 1 RSA each** at launch (unanimous). Add RSA #2 per ad group only after 2 weeks of data.

### AG-Generic prune
Keyword set slimmed from 14 → 7. Kept:
- `"biohacking tools"`, `"biohacking calculator"`, `"biohacker calculator"`, `"body optimization tools"`, `"performance research tools"`, `"fitness research tools"`, `"bloodwork interpreter"`.

Dropped (redistributed or killed):
- Tool-specific keywords moved to their dedicated ad groups.
- `"recovery stack calculator"`, `"advanced recovery planner"`, `"lean mass research planner"`, `"optimization framework builder"` — near-zero search volume.

### Net change vs. current live
| Metric | Before | After |
|--------|--------|-------|
| C1 ad groups | 2 | 5 |
| Total C1 keywords | 29 | 19 |
| Total RSAs (all campaigns) | 5 | 6 (tool-only) / 7 (full) |
| Daily budget | $30 (tool-only) | $30 (tool-only) / $35 (full incl. C4) |
| Tool-specific landing pages | 0 | 5 |

### gclid attribution audit (Gemini's honest question)
Separate investigation confirmed: **gtag cross-domain linker is correctly configured on both `tools.rojipeptides.com` and `rojipeptides.com`** with matching `linker.domains`. Outbound links rely on gtag's automatic decoration (standard pattern). In-browser gclid → Google Ads conversion attribution should work end-to-end.

**Gap (not blocking):** gclid is not stored in WooCommerce order metadata for manual reconciliation. Only UTMs are captured server-side. Nice-to-have follow-up, not required for the restructure to produce signal.

### Migration
The provisioner is idempotent by ad-group name, so the new ad groups (AG-Reconstitution, etc.) are created alongside the existing AG3 + AG5. **After provisioning the new blueprint, manually pause AG3 + AG5 in the Google Ads UI** or spend will double up.



more answers 

claude

**1. ONE-LINE VERDICT**

The split is structurally correct and long overdue — 6 ad groups is the right number, not too many, and the per-tool routing will likely improve Quality Score and CTR enough to offset any impression-starvation risk on the smaller ad groups.

**2. STRUCTURE VALIDATION**

**AG-Reconstitution → Keep.** This is your highest-intent, most differentiated ad group. Nobody else is bidding on "reconstitution calculator." The 3 keywords are tight but they're exactly the right 3. The landing page is a genuine calculator that delivers immediate value. This ad group will likely have the best CTR and lowest CPC in the entire account. No changes needed.

**AG-HalfLife → Keep.** 4 keywords, all clean, all relevant. "Compound half life" is the broadest and might match some chemistry homework queries — monitor search terms for irrelevant student traffic in week 1. If you see junk, add `"chemistry homework"` and `"physics"` as negatives on this ad group. Otherwise solid.

**AG-COA → Keep, but add 1-2 keywords.** 3 keywords is thin. Add `"peptide coa"` (moderate risk but high intent — test it) and `"hplc purity report"` (low risk, directly relevant). That gives you 5, which is a healthier floor. The COA angle is your strongest trust-building tool and the most direct bridge to "this vendor's COA is bad → Roji's COA is good → buy from Roji." Worth feeding this ad group.

**AG-CostPerDose → Keep, but add 2-3 keywords.** 2 keywords is dangerously thin — Google might barely serve this ad group at all. Add `"peptide price comparison"` (moderate risk — has "peptide" but it's a comparison tool, not a pharmacy), `"research compound cost"` (low risk), and `"vial cost calculator"` (low risk). That gives you 5. The "cost per dose" framing does contain "dose" but the landing page is a cost comparison calculator, not a dosing guide. Google's classifier evaluates the landing page, and your landing page is math — not medicine.

**AG-Recomp → Keep, but acknowledge it's a different funnel.** This ad group has 8 keywords — the most of any AG — and they're all high-volume fitness terms. The traffic will be cheap ($0.50-1.50 CPC) but the conversion path to peptide purchase is the longest and weakest. Someone calculating their macros is not thinking about research peptides. This is a top-of-funnel brand awareness play, not a conversion play. That's fine, but be honest about what it's doing: it's buying cheap impressions and email captures, not purchases. Consider lowering the CPC ceiling to $2.00 (from $2.50) to reflect the weaker commercial intent.

**AG-Generic → Keep, but trim.** See Section 4 for the full argument. The short version: keep it, but remove the keywords that now have a clear home in another ad group. After the redistribution, AG-Generic should only contain terms that genuinely don't map to any specific tool.

**3. KEYWORD DISTRIBUTION CONCERNS**

At $25/day across 6 ad groups, Google's campaign-level Maximize Clicks bidding will naturally allocate more budget to the ad groups with better auction opportunities. It won't split evenly. This means AG-Recomp (8 high-volume fitness keywords) will probably eat 40-50% of the budget, AG-Reconstitution and AG-Generic will split another 30-40%, and AG-COA and AG-CostPerDose might only get $1-2/day each.

That's actually fine for week 1 — let Google find the cheapest clicks. But monitor the impression share per ad group. If AG-COA is getting <100 impressions/week, it's not learning. At that point you have two options: bump the C1 budget to $35/day to give the smaller ad groups room, or merge AG-COA and AG-CostPerDose into a single "AG-Verification" ad group (COA checking + cost comparison are both "is my vendor legit?" intent — they share an audience).

The minimum viable keyword count per ad group is 3. Below that, Google's auction surface is too narrow to generate consistent impressions at any budget level. AG-CostPerDose at 2 keywords is below this threshold, which is why I recommended adding 2-3 more above.

**4. AG-GENERIC FATE**

**Keep it, but gut it.** After redistributing tool-specific keywords to their new homes, AG-Generic should only contain these:

```
"biohacking tools"
"biohacker calculator"
"biohacking stack builder"
"body optimization tools"
"performance optimization tools"
"performance research tools"
"fitness research tools"
```

**Remove from AG-Generic** (they now live elsewhere):
- `"reconstitution calculator"` → AG-Reconstitution
- `"half life calculator"` → AG-HalfLife
- `"coa analyzer"` → AG-COA
- `"body recomp calculator"` → AG-Recomp
- `"body composition calculator"` → AG-Recomp
- `"recovery optimization calculator"` → could go to AG-Generic or drop entirely (low volume)
- `"recovery stack calculator"` → drop (near-zero volume, "stack" is borderline)
- `"advanced recovery planner"` → drop (near-zero volume)
- `"lean mass research planner"` → drop (near-zero volume)
- `"optimization framework builder"` → drop (nobody searches this)
- `"bloodwork interpreter"` → keep in AG-Generic (no dedicated AG)

The strongest argument for keeping AG-Generic: someone searching "biohacking tools" has broad intent that genuinely maps to the homepage directory. The homepage shows the full suite and lets them self-select. Routing them to a single calculator would be the wrong landing page. AG-Generic earns its place as the catch-all for exploratory intent — but only if you strip it of every keyword that has a specific tool home.

The strongest argument for killing it: the remaining keywords are so broad and low-intent that they'll eat budget without converting. "Biohacking tools" could match someone looking for a meditation app, a nootropic tracker, or a cold plunge timer. None of those people buy peptides. If budget is tight ($25/day), killing AG-Generic and concentrating 100% of spend on tool-specific ad groups is the higher-ROI move.

**My recommendation:** Keep it for 2 weeks. If AG-Generic's cost-per-store-click is 3x worse than the tool-specific ad groups, kill it and redistribute the budget.

**5. RSA STRATEGY PER AD GROUP**

Ship **1 RSA per ad group** initially. Here's why: each RSA has 15 headlines and 4 descriptions, giving Google 15×14×4×3 = 2,520 possible combinations per RSA. That's more than enough variation. Adding a second RSA doubles the review surface area (more chances for a disapproval) without meaningfully improving optimization at low volume. Add RSA #2 per ad group only after you have 2+ weeks of data showing which headlines perform and which don't — then the second RSA can be a targeted variation test.

The strongest RSA angle per ad group:

**AG-Reconstitution:** "The math you need before you touch a vial." Lead with the tool name in headline 1 and 2 (pin "Reconstitution Calculator" to position 1). This is the most specific, highest-intent ad group — the copy should be 100% about the calculator, zero generic "research tools" language.

**AG-HalfLife:** "Compare compounds side-by-side." Lead with the visual/data angle — decay curves, pharmacokinetic profiles, 20+ compounds. This attracts the data-nerd biohacker who wants to compare, not just look up.

**AG-COA:** "Is your vendor's COA real?" Lead with the fear/verification angle. This is the most emotionally charged ad group — people searching for COA verification are already suspicious of their current vendor. Lean into that anxiety. "Spot Fake COAs" and "Trust Score Calculator" are the headlines that will drive clicks.

**AG-CostPerDose:** "What's a vial actually costing you?" Lead with the savings/comparison angle. These searchers are price-conscious and in buying mode. The copy should feel like a consumer comparison tool, not a lab instrument.

**AG-Recomp:** "Personalized body composition projections." Keep this pure fitness, zero research/lab language. The RSA should be indistinguishable from any other fitness calculator ad. The Roji brand association happens on the landing page, not in the ad.

**AG-Generic:** Keep the current RSA #1 essentially as-is — it was designed for broad "biohacker suite" intent and still fits that purpose.

**6. POLICY RISK CHANGES**

**AG-Reconstitution — LOW-MEDIUM risk.** "Reconstitution" is pharmaceutical-adjacent vocabulary. Google's automated classifier has seen this word primarily in pharmacy contexts (drug reconstitution, IV preparation). However, the landing page is a math calculator with no therapeutic claims, no product sales, and a research-only disclaimer. The risk is the initial automated flag, not the manual review — if a human reviewer looks at the landing page, it's obviously a calculator. Mitigation: make sure the ad copy never pairs "reconstitution" with any compound name, human anatomy, or injection language. Your proposed copy is clean — keep it that way.

**AG-CostPerDose — LOW risk, despite "dose" in the name.** "Cost per dose" is a standard pharmacoeconomic term used in academic research, health economics, and insurance. It's not a human-use instruction. The landing page is a price comparison calculator. The risk would increase if you added keywords like "peptide cost per dose" (compound category + dosing language) — avoid that combination. Keep it as pure cost/math framing.

**AG-COA — LOWEST risk of all ad groups.** Certificate of Analysis is an analytical chemistry document. Nothing pharmaceutical about checking lab reports. "COA analyzer" and "COA verifier" are fully inert terms. No policy concerns.

**AG-HalfLife — LOW risk.** "Half-life" is a physics/chemistry/pharmacology term. The landing page shows decay curves and molecular data. No therapeutic claims. Clean.

**AG-Recomp — ZERO risk.** Pure fitness keywords. TDEE, macros, body fat — these are mainstream health and wellness terms with no pharmaceutical association. Google serves thousands of ads for these keywords from fitness apps.

**AG-Generic — LOWEST risk.** "Biohacking tools" and "performance optimization" are wellness/productivity terms. No pharmaceutical classifier triggers.

**Net assessment:** The restructure does NOT introduce meaningful new policy risk. The highest-risk element in the entire account remains C2 (the "peptide" experiment), which is unchanged. The per-tool routing actually reduces risk slightly because each landing page is more obviously a calculator/tool (not a store gateway) than the homepage directory was.

**7. WHAT I'D DO DIFFERENTLY**

If I were architecting from scratch with the same constraints, I'd make two changes:

**Merge AG-COA and AG-CostPerDose into a single "AG-Verification" ad group.** Both serve the same user persona: someone who already buys research peptides and is evaluating vendor quality/value. The COA checker says "is the vendor legit?" and the cost calculator says "is the vendor worth it?" These are two sides of the same purchase decision. Merging them gives the ad group 5-7 keywords (healthier impression surface), lets you write one RSA that speaks to the trust/value evaluation mindset, and concentrates budget on a single high-intent audience instead of splitting it across two starving ad groups. Landing page: use the homepage for this merged group (the user can self-select COA or cost tool), OR create a simple landing page at `/verify` that shows both tools side-by-side with a headline like "Verify your vendor."

**Don't create AG-Recomp in C1 at all — put it in a separate campaign.** AG-Recomp's keywords are fundamentally different traffic: high-volume, low-CPC, low-purchase-intent fitness queries. In a campaign-level Maximize Clicks setup, these cheap fitness clicks will eat disproportionate budget because Google sees them as "easy wins" for click volume. That starves the expensive-but-high-intent tool-specific ad groups. A separate campaign with its own $5-8/day budget isolates the fitness experiment without cannibalizing the core tool campaigns. If fitness traffic doesn't convert to store visits within 3 weeks, pause the campaign with zero impact on C1 performance.

**8. THE HONEST QUESTION**

**If you let AG-Recomp stay in C1, it will eat your budget and hide the results of the tool-specific ad groups.**

Campaign-level Maximize Clicks optimizes for the cheapest clicks. Fitness keywords ("tdee calculator," "macro calculator") have CPCs of $0.30-0.80 — far cheaper than "reconstitution calculator" at $1.50-3.00 or "coa analyzer" at $1.00-2.50. Google's algorithm will naturally pour budget into AG-Recomp because it can buy 3-5x more clicks there per dollar. You'll see a dashboard showing "great, 50 clicks today!" but 40 of them are fitness traffic that will never buy a peptide stack. Meanwhile AG-Reconstitution — your highest-intent, most differentiated ad group — gets 3 clicks because Google spent the budget elsewhere.

This is the structural choice that, if you get it wrong, will hide your best signal under a pile of cheap noise. Either move AG-Recomp to its own campaign with a separate budget, or set a very aggressive CPC ceiling on AG-Recomp ($1.00) that forces Google to also spend on the higher-CPC, higher-intent ad groups. Don't let the cheap clicks crowd out the valuable ones.

gemini
1. ONE-LINE VERDICT
The proposed structure correctly solves the critical landing page CRO mismatch, but funneling generic fitness keywords (AG-Recomp) into the same campaign as highly niche research keywords (AG-COA) under a shared $25 budget will result in the generic keywords cannibalizing 100% of your spend.

2. STRUCTURE VALIDATION
*   **AG-Reconstitution:** Keep. High intent. **Change:** Drop `"Mcg Per Syringe Tick"` from headlines. "Syringe" is a massive policy trigger for the Healthcare and Medicines classifier. Use "Precise Concentration Math" instead.
*   **AG-HalfLife:** Keep. Safe, academic intent. Headlines and descriptions are excellent.
*   **AG-COA:** Keep. Addresses the biggest trust barrier in the niche. Keywords are perfect.
*   **AG-CostPerDose:** **Merge/Modify.** The word "dose" is a severe policy risk. Rename to AG-CostPerMg, change URL to `/cost-per-mg`, and swap "dose" for "mg" or "vial" in all RSAs and keywords. 
*   **AG-Recomp:** **Drop.** `"tdee calculator"` and `"macro calculator"` have astronomically higher search volumes than your other terms. Because Google uses Maximize Clicks, the algorithm will find the cheapest, most abundant clicks—meaning teenagers looking for fitness advice will eat your entire $25/day budget before a single peptide researcher searches for a COA analyzer. 
*   **AG-Generic:** Keep. Serves as the top-of-funnel net. 

3. KEYWORD DISTRIBUTION CONCERNS
Ad groups with 2-3 phrase-match keywords will absolutely starve *if* they are competing against broad-appeal keywords in the same campaign. Google's Maximize Clicks does not care about ad group equity; it cares about click volume. If AG-Generic or AG-Recomp are active, AG-COA will likely get zero impressions. The right minimum isn't about keyword count; it's about separating high-volume/low-intent terms from low-volume/high-intent terms into different campaigns to force spend allocation. Since budget is fixed at $25, your best move is dropping the fitness keywords so the algorithm is forced to hunt for your niche terms.

4. AG-GENERIC FATE
Keep it. The strongest argument for its survival is that top-of-funnel researchers often search for the *outcome* ("optimization framework builder") rather than the specific *mechanism* ("half-life database"). They don't know they need a half-life database until they see your suite. It catches the abstract intent that hasn't crystallized into a specific tool need yet.

5. RSA STRATEGY PER AD GROUP
Shipping 1 highly relevant RSA per ad group is exactly the right move right now. It minimizes your review surface area while you test the structure.
*   **AG-Reconstitution:** "The math you need before you ever touch a vial." (Perfect).
*   **AG-HalfLife:** "Compare pharmacokinetic profiles." (Excellent, highly academic).
*   **AG-COA:** "Verify your vendor's HPLC purity." (Focus heavily on the "Janoshik" trust signal).
*   **AG-CostPerDose (CostPerMg):** "True Cost Per Vial." (Shift angle entirely away from dosing and toward vendor transparency).
*   **AG-Generic:** "Suite of free research tools." (Keep as the "tour the catalog" angle).

6. POLICY RISK CHANGES
This restructure introduces **High Policy Risk** in two specific places:
1.  **AG-Reconstitution:** As noted above, the headline "Mcg Per Syringe Tick" bridges the gap from "chemistry math" to "human injection." Google will suspend for this. Scrub "syringe" and "inject."
2.  **AG-CostPerDose:** The word "dose" implies human/animal consumption. The bots scanning `[tools.rojipeptides.com/cost-per-dose](https://tools.rojipeptides.com/cost-per-dose)` will flag this for Unapproved Pharmaceuticals. You must mitigate this by framing it as laboratory yield: "Cost Per Mg" or "Cost Per Concentration." 

7. WHAT YOU'D DO DIFFERENTLY
If architecting from scratch with the same $25 constraint, I would split this into 4 Ad Groups, not 6. I would aggressively cull the fitness/recomp keywords because they are an active threat to your CAC (they will generate clicks but zero $400 AOV peptide purchases). I would run: AG-Reconstitution, AG-HalfLife, AG-COA, and AG-Generic. By removing the cheap fitness clicks, you force Google's Max Clicks algorithm to work harder to find the actual researchers within your core 4 ad groups. 

8. THE HONEST QUESTION
If a user clicks an ad for the "COA Analyzer", uses the tool, clicks the `StoreCTA`, and completes a Reserve Order checkout... does your cross-domain tracking *actually* attribute that $900 purchase back to AG-COA, or does WooCommerce capture it as direct/organic traffic? (If your tracking drops the gclid across the subdomain hop, this entire granular restructure gives you zero usable conversion data to optimize against).

grok

```
1. ONE-LINE VERDICT
The proposed structure is mostly right and a clear improvement over homepage dumping, but too many ad groups for the $25/day budget and tiny keyword sets — consolidate to 3–4 ad groups max to avoid starving impressions and complicating management.

2. STRUCTURE VALIDATION
- **AG-Reconstitution → /reconstitution**: Keep. Strongest commercial bridge (direct prep math). Suggested keyword changes: keep the three; consider adding "reconstitution tool" if it fits existing blueprint. RSA angle: keep "math before vial" but soften "touch a vial" and "syringe tick" — they edge toward preparation language. 
- **AG-HalfLife → /half-life**: Keep but merge potential with Generic later. Keywords solid (low risk). RSA angle good for discovery; "pharmacokinetic profiles" is safe research framing.
- **AG-COA → /coa**: Keep. Excellent trust/quality signal that aligns with research use. Keywords fine. RSA angle strong ("spot red flags" is valuable without claims).
- **AG-CostPerDose → /cost-per-dose**: Merge into Reconstitution or drop/park in Generic. Only 2 keywords; "dose" + "cost" combo raises policy flags even framed as vendor math. Suggested: move keywords to Reconstitution if volume justifies, otherwise Generic.
- **AG-Recomp → /recomp**: Keep as broader fitness/research bridge. Keywords are the highest-volume set; lower CPC ceiling smart. RSA angle solid for entry-level intent.
- **AG-Generic → /**: Keep for now as safety net, but plan to shrink it over time as tool-specific groups prove out.

3. KEYWORD DISTRIBUTION CONCERNS
Yes, small ad groups (2–3 keywords) will likely starve for impressions at $25/day split across 6 groups under Maximize Clicks, especially on a new account with limited auction history. Google's system needs reasonable volume per ad group for learning and Quality Score stability. Best practice is 5–15 tightly themed keywords per ad group for healthy auction surface without diluting relevance. With your budget, 3–4 total ad groups in C1 is healthier than 6; sub-5-keyword groups risk "not enough data" loops and poor ad rotation.

4. AG-GENERIC FATE
Keep a slimmed AG-Generic initially as a catch-all for broad/exploratory terms and weaker bridges (bloodwork, stack builder, etc.). Strongest argument for keeping: it captures top-of-funnel researchers who aren't tool-specific yet and prevents total loss of broad biohacker traffic. Argument for removing: it dilutes budget from high-intent tool pages and lowers overall relevance/Quality Score. Compromise — keep it but assign it the smallest budget share and monitor search terms aggressively; phase it down once tool-specific groups have data.

5. RSA STRATEGY PER AD GROUP
- **AG-Reconstitution**: Strongest angle — "Precise research math for vial preparation" (stay neutral). Use 2 RSAs: one benefit-focused ("60-second concentration calculator"), one trust-focused ("Referenced lab tools, free").
- **AG-HalfLife**: "Explore referenced pharmacokinetic data" — emphasize database/visualization over calculation. 1–2 RSAs highlighting "PubMed-cited," "compare profiles," "decay curves."
- **AG-COA**: "Verify and understand COAs" — trust/verification angle wins. RSAs: "Spot issues fast," "Plain-English analysis," "Local file processing."
- **AG-CostPerDose**: If kept, "Transparent research cost math" — focus on comparison/spreadsheet replacement.
- **AG-Recomp**: "Personalized body composition frameworks" — fitness-to-research bridge. Lean on "evidence-based projections," "skip spreadsheets."
- **AG-Generic**: Suite overview — "Free research tool collection for biohackers" as before.

Aim for 1–2 RSAs per group at launch (faster policy review) rather than 3; expand after approval.

6. POLICY RISK CHANGES
This restructure introduces moderate new risk, primarily in AG-Reconstitution ("reconstitution," "vial," "syringe" implications in copy) and AG-CostPerDose ("dose," "cost per dose"). Google's Healthcare and Medicines policy and unapproved pharmaceuticals rules are aggressively enforced in the peptide space in 2026, with recent actions against even "research use only" framed ads. Terms evoking preparation or consumption math can trigger classifiers even on calculator pages. 

Mitigation: 
- Keep all copy strictly "research math," "lab calculator," "concentration tool," "vendor comparison math." 
- Avoid "vial," "syringe tick," "touch a vial," "per dose." 
- Ensure landing pages have strong "for laboratory/research use only" framing, 21+ disclaimers, and no purchase path visible immediately. 
- Test these groups with very limited budget share initially. AG-COA and AG-HalfLife are lower risk (analysis/database). Overall account risk rises slightly vs. fully generic — monitor disapproved assets closely and have pause plan ready. No compound names helps, but the niche itself is high-scrutiny.

7. WHAT YOU'D DO DIFFERENTLY
From scratch, I would split into 3–4 ad groups max: 
1. Reconstitution + Cost Math (combined high-intent prep/comparison)
2. Recomp/Fitness Research 
3. Analysis Tools (COA + HalfLife merged or separate if volume justifies)
4. Generic catch-all (small).

This balances relevance gains from specific landing pages against impression volume and management overhead. Single-keyword or 2–3 keyword ad groups are viable long-term with SKAG-style precision once you have conversion data, but premature here with low budget and new account. I would also prioritize building 2 RSAs per group from day one for better Google's asset optimization, while keeping policy validator runs strict.

8. THE HONEST QUESTION
Which of these tools has shown the strongest organic engagement or tool_complete → store click-through rate in your internal analytics so far (even pre-Google Ads traffic), and how does that correlate with actual reserve-order conversions? This would let us weight budget and structure toward proven commercial bridges instead of assumed intent.
```


chatgpt

## 1. ONE-LINE VERDICT

The split is directionally right, but I would ship it as **5 active tool-specific ad groups plus a tightly capped AG-Generic**, with **AG-Reconstitution and AG-CostPerDose softened hard before review** because their proposed copy is currently too close to prep/use language.

## 2. STRUCTURE VALIDATION

### AG-Reconstitution → `/reconstitution`

* **Decision:** Keep, but rewrite aggressively before launch.
* **Suggested keyword changes:**
  Keep:

  * `"reconstitution calculator"`
  * `"vial calculator"`
  * `"bac water calculator"`

  But monitor this ad group daily. If search terms drift toward human-use, prep, or administration intent, pause fast.
* **Suggested RSA angle changes:**
  Current angle is too risky: **“before you ever touch a vial”** sounds operational/preparatory. Also remove “syringe,” “tick,” and “mcg per syringe tick” from ad copy. Those terms are avoidable policy heat.

  Safer angle: **“Research concentration math, browser-based.”**

  Replace risky headlines:

  * Replace `Vial → Syringe Unit Math` with `Research Concentration Math`
  * Replace `Mcg Per Syringe Tick` with `Concentration Calculator`
  * Replace `Skip The Forum Math` with `Transparent Research Math`
  * Replace `Personalized Math` with `Input-Based Calculator`
  * Replace `Start Calculating — Free` with `Free Research Calculator`

  Replace risky descriptions:

  * Replace `Input vial size and water volume, get exact mcg per insulin-syringe tick. Free, no signup.`
    with `Input research parameters and volume to calculate concentration. Browser-based, free, no signup.`
  * Replace `The reconstitution math you need before you ever touch a vial.`
    with `Transparent research concentration math for lab-planning contexts. Fast, free, browser-based.`

This is the ad group most likely to create outsized value, but it is also one of the highest policy-risk groups.

### AG-HalfLife → `/half-life`

* **Decision:** Keep.
* **Suggested keyword changes:**
  Keep all 4:

  * `"half life calculator"`
  * `"half life database"`
  * `"half life comparison"`
  * `"compound half life"`

  This is the cleanest tool-specific split.
* **Suggested RSA angle changes:**
  The angle is good, but “pharmacokinetic profiles” may be slightly medical-coded. It is not forbidden, but I would balance it with database/reference language.

  Strongest angle: **“Referenced half-life data and visual comparisons.”**

  Keep:

  * `Half-Life Database — Free`
  * `Compare Compound Half-Lives`
  * `Decay Curves, Visualized`
  * `Cited Half-Life Data`
  * `PubMed-Cited Data`

  Consider replacing:

  * `Pharmacokinetic Profiles` → `Referenced Research Profiles`
  * `20+ Compounds Covered` → `20+ Research Entries`
  * `Compound Comparison Tool` → `Research Comparison Tool`

### AG-COA → `/coa`

* **Decision:** Keep.
* **Suggested keyword changes:**
  Keep:

  * `"coa analyzer"`
  * `"certificate of analysis checker"`
  * `"coa verifier"`

  This ad group can survive with 3 keywords because the intent is sharp.
* **Suggested RSA angle changes:**
  This is probably the best conversion-quality ad group in the proposal because COA intent maps naturally to trust and vendor evaluation.

  Strongest angle: **“Check COA completeness and red flags locally.”**

  Keep:

  * `Free COA Analyzer`
  * `Spot COA Red Flags`
  * `Certificate Of Analysis Tool`
  * `Free Vendor COA Checker`
  * `COA In Plain English`
  * `Free, Files Stay Local`

  Change:

  * `Catch Sketchy COAs` → `Flag COA Red Flags`
  * `Janoshik COA Standards` → `Third-Party COA Standards`

  “Janoshik” is good trust language on-site, but in ad copy it may narrow eligibility or create unnecessary review surface.

### AG-CostPerDose → `/cost-per-dose`

* **Decision:** Keep, but consider renaming/copy-softening inside ads.
* **Suggested keyword changes:**
  Keep:

  * `"cost per dose calculator"`
  * `"compound cost calculator"`

  Do not expand this ad group yet.
* **Suggested RSA angle changes:**
  This is the second-highest policy-risk group after Reconstitution because the word “dose” is commercially and health-use adjacent. The tool can exist, but the ad copy should lean into **cost comparison / research math**, not practical use.

  Strongest angle: **“Compare research cost inputs transparently.”**

  Replace:

  * `True Cost Per Dose` → `Research Cost Calculator`
  * `$/mg Comparison Tool` → `Cost Comparison Tool`
  * `Cost Per Vial Math` → `Research Cost Math`
  * `Compare Research Stacks` → `Compare Research Inputs`
  * `Free Compound Calculator` → `Free Research Calculator`

  Rewrite descriptions:

  * Replace `Input vial mg + price + target dose. Get $/mg, $/dose, and total doses per vial. Free.`
    with `Input research quantity and price to compare cost metrics across vendors. Free, browser-based.`
  * Replace `What's a vial actually costing you per dose? Add vendors, we'll rank them.`
    with `Compare vendor cost inputs with transparent formulas. No account needed.`

### AG-Recomp → `/recomp`

* **Decision:** Keep, but expect lower buyer quality.
* **Suggested keyword changes:**
  Keep:

  * `"body recomp calculator"`
  * `"body recomposition calculator"`
  * `"body composition calculator"`
  * `"tdee calculator"`
  * `"macro calculator"`

  Watch carefully:

  * `"body fat calculator"`
  * `"lean bulk calculator"`
  * `"cutting calculator"`

  Those last three can pull generic fitness/diet traffic. They are not policy-dangerous in the same way, but they may be CAC-dangerous.
* **Suggested RSA angle changes:**
  Strongest angle: **“Body composition calculator with projections.”**

  Replace:

  * `Lean Bulk Planner` → `Composition Planner`
  * `Cutting Calculator` → `Goal-Based Calculator`
  * `Personalized Recomp Math` → `Input-Based Recomp Math`

  Keep copy away from outcome promises. No fat-loss, muscle-gain, anti-aging, or enhancement language.

### AG-Generic → `/`

* **Decision:** Keep, but cap and prune.
* **Suggested keyword changes:**
  Keep only the terms that genuinely need the homepage:

  * `"biohacking tools"`
  * `"biohacking calculator"`
  * `"biohacker calculator"`
  * `"body optimization tools"`
  * `"performance research tools"`
  * `"fitness research tools"`
  * `"bloodwork interpreter"`

  Consider pausing:

  * `"biohacking stack builder"`
  * `"recovery stack calculator"`
  * `"recovery optimization calculator"`
  * `"advanced recovery planner"`
  * `"lean mass research planner"`
  * `"optimization framework builder"`

  These are either vague, likely to drift, or too “stack/planner” coded.
* **Suggested RSA angle changes:**
  Keep the suite angle. Do not make it store-like.

  Strongest angle: **“Free research calculator suite.”**

## 3. KEYWORD DISTRIBUTION CONCERNS

Small ad groups are not inherently bad here. In this account, **intent purity matters more than keyword count**.

A 2-keyword ad group can work if:

* the query intent is clear,
* the landing page is exact-match relevant,
* the RSA is highly specific,
* search terms are reviewed daily,
* the campaign has enough budget to let the group occasionally enter auctions.

The bigger risk is not “Google cannot learn.” The bigger risk is that **Maximize Clicks will chase cheap clicks across the campaign**, not necessarily the tool group that produces reserve orders. Google describes Maximize Clicks as a strategy that tries to get as many clicks as possible within budget; it does not optimize toward purchases by itself. ([Google Help][1])

My practical minimum:

* **2–3 keywords is fine** for COA and CostPerDose.
* **3–5 keywords is ideal** for Reconstitution and HalfLife.
* **5–8 keywords is fine** for Recomp.
* **Keep Generic under 8–10 keywords** or it becomes the junk drawer.

Do not add keywords just to make ad groups look “healthy.” Add only if the landing page and RSA can satisfy that exact intent.

## 4. AG-GENERIC FATE

AG-Generic should exist, but it should be treated as a **controlled discovery lane**, not the heart of C1.

**Strongest argument for keeping it:**
Some users search by problem space, not by tool name. “Biohacking tools,” “fitness research tools,” and “performance research tools” are real exploratory queries where the homepage is the right landing page. The homepage can show breadth, credibility, and multiple possible tool paths.

**Strongest argument for removing it:**
It can quietly absorb spend that should go to higher-intent tool pages, especially under Maximize Clicks. It also creates the most search-term ambiguity.

**My call:** keep it, but constrain it.

Recommended rules:

* Keep homepage-only broad-intent terms there.
* Remove any keyword that can clearly route to a specific tool.
* Review its search terms most aggressively.
* If it spends more than ~30–35% of C1 without proportional tool engagement or store outbound clicks, cut it back.

## 5. RSA STRATEGY PER AD GROUP

I would ship **1 RSA per ad group first**, not 2–3.

Reason: in this niche, every additional RSA increases review surface. Google’s RSA system can test headline/description combinations within a single responsive ad, so you do not need multiple RSAs per ad group on day one. Google describes RSAs as ads where you provide multiple headlines/descriptions and Google serves different combinations over time. ([Linguee][2])

### AG-Reconstitution

Strongest RSA angle: **Research concentration calculator.**

Use language like:

* `Research Concentration Math`
* `Free Reconstitution Calculator`
* `Input-Based Lab Calculator`
* `Calculate Research Volumes`
* `Transparent Research Math`
* `Browser-Based Calculator`
* `No Signup Required`
* `Built For Researchers`

Avoid in ad copy:

* syringe
* tick
* inject
* dose
* human
* before you touch a vial
* use instructions

### AG-HalfLife

Strongest RSA angle: **Referenced half-life database.**

Use:

* `Half-Life Database — Free`
* `Compare Half-Life Ranges`
* `Decay Curves Visualized`
* `Cited Research Data`
* `PubMed-Cited References`
* `Free Research Database`
* `Built For Researchers`

Avoid making it sound like patient guidance.

### AG-COA

Strongest RSA angle: **COA red-flag checker.**

Use:

* `Free COA Analyzer`
* `Spot COA Red Flags`
* `Certificate Analysis Tool`
* `COA In Plain English`
* `Files Stay Local`
* `Check COA Completeness`
* `Built For Researchers`

This is one of the best ad groups for trust-building.

### AG-CostPerDose

Strongest RSA angle: **Research cost comparison.**

Use:

* `Research Cost Calculator`
* `Compare Vendor Costs`
* `Cost Comparison Tool`
* `Transparent Cost Math`
* `Free Research Calculator`
* `No Signup Required`
* `Browser-Based Tool`

Avoid overusing “dose” in headlines/descriptions even if the page route contains it.

### AG-Recomp

Strongest RSA angle: **Body composition projections.**

Use:

* `Body Recomp Calculator`
* `Body Composition Calculator`
* `Free TDEE Calculator`
* `Macro Calculator — Free`
* `Composition Projections`
* `Input-Based Recomp Math`
* `No Signup Required`

Avoid:

* fat loss
* muscle gain
* cutting promises
* enhancement framing

### AG-Generic

Strongest RSA angle: **Free research tool suite.**

Use:

* `Free Research Tools`
* `Research Calculator Suite`
* `Built For Researchers`
* `Biohacker Research Tools`
* `Evidence-Based Tools`
* `No Signup Required`
* `Roji Research Tools`

This ad group should sell the suite, not any product path.

## 6. POLICY RISK CHANGES

The restructure improves landing-page relevance, which is good for Quality Score and user experience. Google’s Quality Score includes landing page experience, and landing page experience considers relevance/usefulness after the click. ([Google Help][3])

But the restructure also increases policy review specificity. Google will now evaluate tighter combinations of keyword + RSA + landing page. That helps for COA/HalfLife/Recomp, but increases risk for Reconstitution and CostPerDose.

### Highest-risk group: AG-Reconstitution

Risk drivers:

* “BAC water”
* “vial”
* “syringe”
* “mcg”
* reconstitution/preparation context

Mitigation:

* Keep keyword set small.
* Remove “syringe” from ad copy.
* Remove practical-use phrasing.
* Make the landing page clearly research-only.
* Put disclaimers near the calculator and footer.
* Do not add compound names.
* Do not send users directly to product pages from this landing page.
* Use “research concentration math” more than “vial/syringe” language.

### Second-highest-risk group: AG-CostPerDose

Risk drivers:

* “dose”
* vendor comparison
* commercial intent
* possible implication of human use

Mitigation:

* Keep “dose” mostly confined to the tool name/route if unavoidable.
* In ads, use “research cost calculator” and “cost comparison.”
* Avoid “target dose” and “doses per vial” in ad descriptions.
* Avoid “rank vendors” language if it sounds like purchase enablement.
* CTA should be trust/comparison framed, not “shop.”

### Medium risk: AG-HalfLife

Risk drivers:

* pharmacokinetic language
* compound references
* possible medical/scientific classification

Mitigation:

* Keep “research database” framing.
* Avoid treatment, patient, dosing, or use guidance.
* Make references visible.

### Low-to-medium risk: AG-COA

Risk drivers:

* vendor verification in a regulated niche

Mitigation:

* Keep it document-quality focused.
* “Files stay local” and “plain-English COA check” are safe, useful angles.

### Low policy risk but higher CAC risk: AG-Recomp

Risk drivers:

* generic fitness audience
* possible health/weight-loss drift

Mitigation:

* Keep negatives strong around weight loss, fat loss, treatment, medical advice, steroids, etc.
* Avoid transformation claims.

Google’s healthcare and medicines policy says some healthcare-related content cannot be advertised, and other content may require certification or location restrictions; its unapproved pharmaceuticals/supplements page also says its examples are not exhaustive. That means “not using a named banned compound” is helpful, but not a complete shield. ([Google Help][4])

## 7. WHAT YOU'D DO DIFFERENTLY

If architecting from scratch under the same constraints, I would use almost this structure, with two adjustments:

### My preferred C1 structure

```text
C1 — Research Tools — Calculators ($25/day)
├── AG-Reconstitution     → /reconstitution
├── AG-HalfLife           → /half-life
├── AG-COA                → /coa
├── AG-CostCompare        → /cost-per-dose
├── AG-Recomp             → /recomp
└── AG-Generic            → /
```

So yes: **6 ad groups is the right starting number**.

What I would change:

* Rename the ad group internally from **AG-CostPerDose** to **AG-CostCompare** if the codebase allows it. The landing page can remain `/cost-per-dose`, but the ad group and RSA copy should de-emphasize “dose.”
* Rewrite AG-Reconstitution before launch. The proposed copy is too practical-use coded.
* Launch with **one RSA per ad group**, not multiple.
* Keep everything phrase match as requested.
* Do not split into per-tool campaigns yet. With $25/day, six campaigns would fragment the budget too much.
* Reallocate manually after 7–14 days using:

  * tool engagement rate,
  * store outbound CTR,
  * checkout starts,
  * reserve orders,
  * search-term cleanliness,
  * policy status.

Only split a tool into its own campaign if it proves both high-intent and budget-constrained. The first candidate would be AG-Reconstitution if it passes policy cleanly and converts. The second would be AG-COA if it drives high-trust store visits.

## 8. THE HONEST QUESTION

The structural choice that will hurt the most if wrong is **letting AG-Generic or AG-Recomp absorb the majority of the $25/day while AG-Reconstitution, AG-COA, and AG-HalfLife starve**, because that would make the restructure look “clean” in the account while still sending most paid traffic to lower-intent paths.

[1]: https://support.google.com/google-ads/answer/6268626?hl=en&utm_source=chatgpt.com "About Maximize Clicks bidding - Google Ads Help"
[2]: https://www.linguee.com.br/ingles-portugues/traducao/responsive.html?utm_source=chatgpt.com "responsive - Tradução em português"
[3]: https://support.google.com/google-ads/answer/6167118?hl=en&utm_source=chatgpt.com "About Quality Score for Search campaigns"
[4]: https://support.google.com/adspolicy/answer/176031?hl=en&utm_source=chatgpt.com "Healthcare and medicines - Advertising Policies Help"
