# Roji Tools — Operational follow-ups

Last updated: 2026-04-28
Owner: Tomas

This file captures everything you (Tomas) still need to do **outside the codebase** to take the new `roji-tools` Next.js app live and connect it to the rest of the Roji stack. Code is shipped and tested locally; everything below is platform / DNS / API key work.

If a task says **YOU**, I can't do it on your behalf (it requires you logging into a vendor or making a billing decision). If a task says **AGENT**, ask me to handle it next session.

---

## 1. Architecture decision (already made)

I picked the subdomain pattern: **`tools.rojipeptides.com`** hosts ALL marketing tools as one Next.js app with path-based routes (`/reconstitution`, `/half-life`, etc.).

Why one subdomain, not 10:
- Single Vercel project, single set of secrets, single deploy pipeline.
- Shared nav / footer / theming. Adding tool #11 takes hours, not days.
- Clean to brand as "Roji Tools" / "tools.rojipeptides.com" in ads.
- The protocol engine stays at its own subdomain (`protocol.rojipeptides.com`) because it's already deployed and live.

If you want to revisit and use a path (`rojipeptides.com/tools/*`) later, it's straightforward — point a Vercel rewrite from the WordPress origin at the tools app. Not recommended; subdomain is cleaner.

---

## 2. Vercel deployment — `roji-tools`

You'll need a new Vercel project for this app, the same way you set up `roji-protocol`.

### Steps (YOU)

1. Push the repo (this happens automatically when I push to `main`).
2. Vercel → **Add New Project** → Import `tomasdavid1/roji`.
3. **Root directory** = `roji-tools` (critical — same pattern as the protocol engine).
4. **Framework preset** = Next.js (auto-detected).
5. **Build command** = `next build` (auto).
6. **Output directory** = leave blank (Next.js handles it).
7. **Install command** = `npm install` (auto).
8. Add environment variables (see §3 below).
9. Deploy.
10. Add custom domain: `tools.rojipeptides.com`. Vercel will give you a DNS record to add to whoever holds your DNS.

### DNS (YOU)

At your DNS provider, add:

```
CNAME   tools     cname.vercel-dns.com.
```

(Match whatever Vercel tells you in the project settings — the format may differ slightly per provider.)

---

## 3. Environment variables for `roji-tools`

Set these in Vercel → Project → Settings → Environment Variables. **Apply to Production + Preview** unless noted.

### Required for full functionality

| Var | Source | Purpose |
|-----|--------|---------|
| `NEXT_PUBLIC_GADS_ID` | same Google Ads ID as the protocol engine and store | Cross-domain conversion attribution |
| `NEXT_PUBLIC_GA4_ID` | same GA4 ID | Cross-domain GA4 events |
| `NEXT_PUBLIC_GTAG_LINKER_DOMAINS` | `rojipeptides.com,protocol.rojipeptides.com,tools.rojipeptides.com` | (Optional override; default already includes all three) |
| `NEXT_PUBLIC_STORE_URL` | `https://rojipeptides.com` | (Optional override; default is correct) |
| `NEXT_PUBLIC_PROTOCOL_URL` | `https://protocol.rojipeptides.com` | (Optional override; default is correct) |

### Optional but recommended

| Var | Source | Purpose |
|-----|--------|---------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Powers the AI Research Assistant. Without this, the chat returns a "not configured yet" stub but still surfaces PubMed results. |
| `NCBI_API_KEY` | https://www.ncbi.nlm.nih.gov/account/settings/ → API Key Management | Bumps PubMed rate limit from 3 req/s to 10 req/s. Free. Recommended once research search gets traffic. |
| `NCBI_CONTACT_EMAIL` | your support email | NCBI asks all programmatic users to provide a contact. Defaults to `research@rojipeptides.com`. |

### Do NOT set

- `NODE_ENV` — Vercel handles this.
- Anything matching a database connection — there's no DB; everything is local-first or PubMed.

---

## 4. WordPress store changes (already pushed in this commit)

Three files were edited in the store theme. None of them need a manual deploy — they ship to Kinsta whenever you next sync the theme.

### `roji-store/elementor-templates/menus.php`
Adds **"Tools"** to the header menu (after Protocol Engine) and **"Free Tools"** to the footer menu. To re-provision after deploy:

```bash
# On the server (or via WP-CLI on Kinsta):
wp eval-file /path/to/roji-store/elementor-templates/menus.php
```

### `roji-store/roji-child/inc/tracking.php`
Adds `tools.rojipeptides.com` to the gtag linker domains so cross-domain tracking covers all three properties. No manual action needed beyond uploading the theme.

### `roji-store/elementor-templates/pages/home.php`
Inserts a new "Free tools" section on the storefront homepage between Trust Pillars and Trustpilot, surfacing the Reconstitution Calculator, COA Verifier, Half-Life Database, and Bloodwork Interpreter. To re-render the home page in Elementor:

```bash
wp eval-file /path/to/roji-store/elementor-templates/pages/home.php
```

(Or whatever your Elementor template-import flow is — same pattern you used for the original homepage.)

---

## 5. Tools status & launch checklist

| # | Tool | Path | Status | Ad-safe | Needs |
|---|------|------|--------|---------|-------|
| 1 | Reconstitution Calculator | `/reconstitution` | LIVE | Google + Meta | ✓ ready |
| 2 | Half-Life Database | `/half-life` | LIVE | Google | ✓ ready |
| 3 | Research Library | `/research` | LIVE (uses PubMed live) | Google | NCBI key recommended once traffic ramps |
| 4 | COA Verifier | `/coa` | LIVE (PDF parsed in browser) | Google | ✓ ready |
| 5 | Bloodwork Interpreter | `/bloodwork` | LIVE | Google + Meta | ✓ ready |
| 6 | Body Recomp Calculator | `/recomp` | LIVE | Google + Meta | ✓ ready |
| 7 | Supplement Interaction Checker | `/interactions` | LIVE | Google + Meta | ✓ ready |
| 8 | Cost-Per-Dose Comparison | `/cost-per-dose` | LIVE | Google | ✓ ready |
| 9 | Stack Tracker (MVP) | `/tracker` | BETA — local-first | Google + Meta | Cloud sync (Supabase) is a follow-up; see §7 |
| 10 | AI Research Assistant | `/ai` | BETA — needs Anthropic key | Google | Add `ANTHROPIC_API_KEY` to Vercel |
| 11 | Vendor Comparison | (separate domain) | NOT BUILT | TBD | See §6 |

---

## 6. Vendor Comparison Site (Tier 3 #11) — not built

I deferred this one because the brief says it should live on a separate "independent-feeling" domain (`peptidereviews.com`, `researchvendors.com`, etc.) for credibility. That's a domain decision only you can make.

### What you need to do (YOU)

1. Pick a domain. Suggestions:
   - `peptidereviews.com`
   - `researchvendors.com`
   - `peptidegrade.com`
   - `peptidelab.org` (if available — `.org` reads more independent)
2. Buy it (Namecheap or Cloudflare Registrar; ~$10/year).
3. Tell me the domain and I'll scaffold a separate Next.js app on that domain in the same monorepo (e.g. `roji-vendors/`) with a deliberately distinct visual style so it doesn't read as obvious Roji marketing.

### What I'll do once you give me the domain (AGENT)

- Scaffold the app, deploy to Vercel.
- Build a vendor-comparison framework (criteria: COA quality, lab used, purity, shipping, payment options, $/mg, sourcing transparency).
- Pre-populate ratings for the obvious ~10 competitors based on their public sites and COAs.
- Roji is rated honestly alongside them — but the criteria naturally favor what you do well (third-party Janoshik COAs, stack curation, etc.).

---

## 7. Stack Tracker — cloud sync (deferred)

The Tracker MVP works fully today: people log items, daily metrics, and trends, all in their browser. They can export/import JSON.

The next step is **optional cloud sync** so users can:
- Sync across devices.
- Get reorder reminders ("you've been logging BPC-157 for 28 days — running low?").
- Receive insights ("87% of users tracking BPC-157 also track TB-500 — view the Wolverine Stack").

### What you'd need to provide (YOU)

- A Supabase project (free tier is fine to start). Or Vercel KV / Postgres.
- 30 minutes to decide on the sign-in method (email magic-link is what we already use elsewhere — keeps consistency).

### What I'd build (AGENT)

- Supabase auth + table for tracker rows.
- Background-sync hook in the existing tracker UI (already designed for it — the local-first store has the schema in place).
- Reorder + insight emails using `wp_mail` from the WordPress store side.

This is real work (~3-4 days) and it crosses into "we are now collecting health-adjacent data" territory which has GDPR/privacy implications. Worth doing, but tackle once the v1 has actual users.

---

## 8. Trustpilot AFS — pending your account creation

(Carryover from the previous chat — still on your plate.)

The thank-you page already has Trustpilot AFS hint copy in place but no actual Trustpilot integration. When you have the account:

| Var | Source | Purpose |
|-----|--------|---------|
| `ROJI_TRUSTPILOT_BU_ID` | Trustpilot dashboard | Business Unit ID |
| `ROJI_TRUSTPILOT_API_KEY` | Trustpilot Integrations API | Server-side AFS post-purchase email trigger |
| `ROJI_TRUSTPILOT_API_SECRET` | Trustpilot | API secret |

Hand them over and I'll wire them up end-to-end (trustpilot-afs.php is already mostly in place).

---

## 9. Google Ads — campaign setup

The protocol engine + tools subdomain are now both ad-targets. Each new tool below has a recommended campaign type and ad-safety class:

```
GOOGLE ADS (run all of these):
  /reconstitution    "Free Peptide Reconstitution Calculator"     — search, broad-match
  /half-life         "Compound Half-Life Database — Free"          — search, broad-match
  /coa               "Is Your Vendor COA Legit? Free Analyzer"     — search + display, competitor remarketing
  /research          "Peptide Research Library"                    — search, long-tail
  /cost-per-dose     "Research Compound Cost Calculator"           — search, high-intent
  /bloodwork         "Free Blood Panel Interpreter"                — search + display
  /recomp            "Body Recomposition Calculator"               — search + display

META / INSTAGRAM ADS (only fitness/wellness-coded tools):
  /bloodwork         "Free Blood Panel Analyzer"                   — health & wellness audience
  /recomp            "Body Recomp Calculator"                      — fitness audience
  /interactions      "Supplement Interaction Checker"              — biohacker / wellness
  /tracker           "Free Biohacker Stack Tracker"                — biohacker audience
```

When you're ready to run real campaigns, ping me and I'll generate the ad copy variants per tool (5+ headlines, 5+ descriptions per ad group) optimized for the SEO keyword clusters already documented in `roji-tools/src/lib/tools.ts`.

---

## 10. Reddit launch sequence (free organic distribution)

Once `tools.rojipeptides.com` is live, queue the following posts (space them 4-7 days apart):

1. **r/peptides** — "I built a free reconstitution calculator that doesn't suck"
   Link: `tools.rojipeptides.com/reconstitution`
2. **r/biohackers** — "Free tool: drop in your COA and it explains every line in plain English"
   Link: `tools.rojipeptides.com/coa`
3. **r/Nootropics** — "Half-life database for peptides + nootropics with cited PK data"
   Link: `tools.rojipeptides.com/half-life`
4. **r/peptides** — "I keep losing my mental model of which compound stacks compete with which — built a free tool"
   Link: `tools.rojipeptides.com/interactions`

Be a real person, link the tool naturally, mention "I built this" — Reddit users see through ads instantly.

---

## 11. Master secrets / accounts list — what I still need from you

Roll these up so you have a single checklist:

### Already have (just paste them as Vercel env vars)
- [x] Google Ads OAuth (already authorized — refresh token captured earlier)
- [x] Google Ads + GA4 IDs (already in protocol engine env)

### Missing — you create the account, paste the keys
- [ ] **Anthropic API key** — `ANTHROPIC_API_KEY` for AI Research Assistant
- [ ] **NCBI API key** (free, 5 minutes) — `NCBI_API_KEY` for higher PubMed rate limits
- [ ] **Trustpilot keys** (BU_ID, API key, API secret) — for thank-you page AFS
- [ ] **Stripe live key** — when you're ready to flip from test mode (carryover)
- [ ] **WooCommerce Subscriptions license** — already installed, ensure license key activated for updates (carryover)
- [ ] **AffiliateWP** — alternative if you ever want to retire the custom affiliate system (low priority — current system works)

### Missing — you decide and tell me
- [ ] **Vendor Comparison domain** (see §6) — pick one, register it, give me the name
- [ ] **Stack Tracker cloud-sync provider** (see §7) — Supabase is my recommendation; only matters once Tracker has real users

### Missing — DNS / Vercel work (see §2)
- [ ] Add `tools` CNAME to your DNS pointing at Vercel
- [ ] Create Vercel project for `roji-tools/`
- [ ] Set env vars in that project
- [ ] Sit back

---

## 12. Repo housekeeping

The monorepo now contains four apps:

```
roji-store/        WordPress + WooCommerce + Elementor (storefront)
roji-protocol/     Next.js (Protocol Engine) — protocol.rojipeptides.com
roji-tools/        Next.js (10-tool marketing suite) — tools.rojipeptides.com  ← NEW
roji-ads-dashboard/  Next.js (internal Google Ads dashboard, local-only)
```

Each app has its own `vercel.json`, `package.json`, and is independently deployable.

---

Anything unclear, ping me.
