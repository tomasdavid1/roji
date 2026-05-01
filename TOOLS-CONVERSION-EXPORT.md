# Roji Tools — Conversion Optimization Export for External Review

**Snapshot date:** 2026-04-30
**Context:** We are running Google Ads campaigns driving traffic to `tools.rojipeptides.com`. The tools surface is a free research calculator suite that acts as a lead-magnet bridge to the store (`rojipeptides.com`). Our CAC is directly tied to how well this bridge converts.

This document exports the current tools UX for external review, specifically focused on **maximizing the conversion rate from Google Ads click → tool engagement → store visit → reserve order** without compromising the compliance framing that keeps our ads approved.

---

## How to use this document if you are the reviewer

Please respond using **exactly this structure**, in this order. Do not omit any section.

```
1. ONE-LINE VERDICT
   Single sentence. Is the tools-to-store bridge well-designed for conversion,
   or are we leaking qualified traffic?

2. FRICTION POINTS
   Bullet list. Each item:
   - What the friction is
   - Where it occurs in the funnel
   - Estimated conversion impact (low/medium/high)
   - Suggested fix

3. STORE CTA CRITIQUE
   Is the current store CTA placement, copy, and prominence sufficient?
   What would you change?

4. LANDING PAGE CRITIQUE
   A Google Ads click on "Reconstitution Calculator" lands on
   tools.rojipeptides.com (the homepage, not the tool directly).
   Is this right? Should ad groups route to tool-specific URLs?

5. TOOL PAGE FLOW
   For each tool page, does the flow from "use the calculator" to
   "visit the store" feel natural or forced? Specific suggestions.

6. MOBILE EXPERIENCE
   The store link in the header is desktop-only. Is this a problem?

7. TRUST & CREDIBILITY
   Does the tools surface build enough trust to bridge to a $400-900
   peptide purchase? What's missing?

8. THE HONEST QUESTION
   What's the ONE UX change that would have the biggest impact on
   tools→store conversion rate?
```

---

## 1. The funnel we're optimizing

```
Google Ads click (Search, US-only, phrase-match keywords)
  ↓
tools.rojipeptides.com (landing — currently the homepage for all ad groups)
  ↓
User finds and opens a specific calculator
  ↓
User engages with the calculator (inputs data, gets results)
  ↓
User sees store CTA and clicks through to rojipeptides.com
  ↓
rojipeptides.com → add to cart → checkout → reserve order → purchase conversion
```

**The problem:** We're paying $2-4 per click to get people to the tools homepage. If only 5% of tool users click through to the store, our effective CAC is 10x worse than if 20% do. This bridge conversion rate is the single biggest lever on CAC that's fully under our control.

---

## 2. What exists today

### Tools available (7 live, 1 coming soon)

| Tool | Route | Status | Store CTA present? |
|------|-------|--------|-------------------|
| Reconstitution Calculator | `/reconstitution` | Live | Yes (inline `StoreCTA` component) |
| Half-Life Database | `/half-life` | Live | Yes (inline `StoreCTA` component) |
| COA Analyzer | `/coa` | Live | Yes (custom: "See our COA library →" links to store `/coa/`) |
| Cost-Per-Dose Calculator | `/cost-per-dose` | Live | Yes (inline `StoreCTA` component) |
| Bloodwork Interpreter | `/bloodwork` | Live | **No** — only header/footer links |
| Body Recomp Calculator | `/recomp` | Live | **No** — only header/footer links |
| Research Database | `/research` | Live | **No** — only header/footer links |
| Stack Tracker | `/tracker` | "Coming Soon" on homepage, but page works | **No** — only header/footer links |

**Key observation:** 4 out of 7 live tools have NO dedicated store CTA. Users of the bloodwork interpreter, body recomp calculator, and research database can only find the store through a subtle header link (desktop only) or footer link.

### Homepage (tools.rojipeptides.com)

What a Google Ads click sees:
1. Sticky header: "roji" logo + "Research Tools" + subtle "rojipeptides.com →" link (desktop only)
2. Hero: "Free research tools, built for [researchers / biohackers / the curious / your lab]"
3. 8-card tool grid
4. Trust signals (no signup, free, data local, open references)
5. "Built by Roji Peptides" section with "Explore research stacks →" text link

**The homepage does NOT have a prominent store CTA.** The only store link is a small text link at the bottom ("Explore research stacks →") and the header link (desktop only).

### Store CTA component (when present)

The `StoreCTA` component is a gradient-bordered card that appears inline (NOT sticky) on tool pages that include it. It contains:
- Pill: "From the team behind this tool"
- Title: "Need research-grade peptides?"
- Body: "Roji Peptides ships third-party Janoshik-verified, ≥99% purity research compounds with transparent COAs."
- Button: "Browse research stacks →" → links to `rojipeptides.com/shop/`

It scrolls with the page — it is NOT a sticky footer or persistent element. Once the user scrolls past it, it's gone.

### Header store link

The header contains `rojipeptides.com →` but it is **hidden on mobile** (`hidden md:inline-flex`). This is documented as a "compliance choice" — the team didn't want the tools surface to look like a store front-end.

### Tracking

- `tool_view` fires on every tool page mount
- `store_outbound_click` fires when the StoreCTA button is clicked
- Per-tool engagement events (`recomp_calculated`, `coa_analyzed`, etc.)
- `toolComplete()` exists in code but is NOT wired to any component
- Cross-domain linker preserves gclid between tools and store

---

## 3. The compliance constraint

The tools surface is deliberately designed to look like an independent research tool suite, NOT a store. This is critical for Google Ads policy:

- Google's Healthcare and Medicines policy would flag a "tools site that's obviously just a store front-end"
- The current framing — free tools, no signup, no purchase pressure — is what keeps the ads approved
- **Any conversion optimization must preserve this framing.** We can make the store connection more discoverable without making the tools page look like a sales funnel.

The line to walk: **"researcher who just used a useful free tool naturally discovers that the team behind it also sells research compounds"** — not **"researcher who clicked an ad gets funneled through a sales pipeline."**

---

## 4. Current Google Ads keyword → landing page routing

**All ad groups currently land on `tools.rojipeptides.com` (the homepage):**

| Ad Group | Keywords (examples) | Landing page |
|----------|-------------------|-------------|
| AG3 — Biohacker Intent | "reconstitution calculator", "half life calculator", "coa analyzer", "body recomp calculator" | `tools.rojipeptides.com` (homepage) |
| AG5 — Fitness Calculator Intent | "body recomp calculator", "tdee calculator", "macro calculator" | `tools.rojipeptides.com` (homepage) |

**The problem:** Someone searching "reconstitution calculator" lands on a homepage with 8 tool cards. They have to find and click the right card. This adds a step and increases bounce rate vs. landing directly on `/reconstitution`.

**The tradeoff:** Landing on the homepage shows the full suite (builds credibility, shows breadth). Landing on the specific tool page is more relevant but loses the "suite" impression.

---

## 5. What we want the reviewer to evaluate

### Primary question
**Where are we leaking qualified traffic, and what's the highest-impact fix?**

### Specific concerns

1. **Half the tool pages have no store CTA.** Is this a deliberate compliance choice that's working, or are we silently losing our best-qualified visitors?

2. **The store CTA is not sticky.** It's an inline card that scrolls away. Should it be a persistent (but subtle) element?

3. **The homepage has no real store CTA.** The "Explore research stacks →" text link is easy to miss. Is this by design (compliance) or an oversight?

4. **Mobile has no header store link.** Mobile users who bounce without engaging a tool have zero exposure to the store.

5. **Google Ads clicks land on the homepage, not tool-specific pages.** Should we route "reconstitution calculator" searches directly to `/reconstitution`?

6. **`toolComplete()` is unwired.** Should tool completion trigger a more prominent (but tasteful) store suggestion?

7. **The "Coming Soon" card (Stack Tracker) captures emails via a modal.** Is this email capture being used? Is it a conversion path worth emphasizing?

### Numbers we don't have yet (but will within 7-14 days)
- Actual tools→store click-through rate
- Bounce rate by landing page
- Tool engagement rate (% of visitors who actually use a calculator)
- Which tools drive the most store visits

---

## 6. Store context (so the reviewer understands the destination)

`rojipeptides.com` is a WooCommerce store selling research-grade peptide stacks (AOV $400-900). The checkout uses a Reserve-Order gateway — no real payment processor is wired yet. Customers submit billing/shipping info and receive a payment link by email within 24h.

The store design was modeled on successful competitors in the niche. The tools surface was built as the top-of-funnel lead magnet because direct Google Ads → store traffic would almost certainly trigger policy violations.

---

## 7. Constraints the reviewer should respect

- **Do not suggest making the tools page look like a store.** The compliance framing is non-negotiable.
- **Do not suggest pop-ups, interstitials, or aggressive CTAs.** These would undermine trust AND trigger Google's landing page quality checks.
- **Do not suggest adding prices, "Add to Cart", or product imagery on the tools surface.** The tools must remain genuinely useful standalone products.
- **Subtle, contextual, "natural discovery" patterns are welcome.** Example: a reconstitution calculator showing "Need the compounds? Roji ships Janoshik-verified research stacks →" after the user completes a calculation.
- **The 21+ / research-only disclaimer must remain visible.**

---

## End of export.

**Reviewer:** please respond using the section structure above. Be specific about what you'd change and where. We'll compare responses across multiple AIs.
