# Roji Tools

Free marketing tools for the peptide research community. Lives at `tools.rojipeptides.com`.

Built as an "engineering as marketing" play: every tool answers a high-intent SEO query that biohackers / researchers actually Google, while quietly building trust in Roji as a knowledgeable, transparent brand.

## What's in here

10 tools, all live, all free, all ad-safe:

| # | Slug | One-liner |
|---|------|-----------|
| 1 | `/reconstitution` | Vial mg + BAC water mL → mcg per insulin-syringe tick |
| 2 | `/half-life` | Half-life + PK database for 20+ peptides, plasma-decay charts, citations |
| 3 | `/research` | Searchable PubMed wrapper with study-type tagging |
| 4 | `/coa` | Drop-in COA PDF analyzer (parses client-side, never uploaded) |
| 5 | `/bloodwork` | 25+ marker reference range visualizer with multi-panel tracking |
| 6 | `/recomp` | TDEE + macros + 8/12/16-week body composition projection |
| 7 | `/interactions` | OTC supplement interaction / synergy / timing checker |
| 8 | `/cost-per-dose` | Vendor-anonymous price comparison ($/mg, $/dose, after purity) |
| 9 | `/tracker` | Local-first stack journal with daily metric tracking + trends |
| 10 | `/ai` | Claude-powered citation-only research chat with PubMed grounding |

## Local development

```bash
cd roji-tools
npm install
npm run dev   # http://localhost:3100
```

## Production build

```bash
npm run build
npm start
```

## Deploy

This app is deployed as its own Vercel project from the `roji-tools/` root directory of the monorepo. See `FOLLOWUPS.md` for full setup instructions including DNS, env vars, and the launch checklist.

## Adding a new tool

1. Create `src/app/<slug>/page.tsx`.
2. Add an entry to `TOOLS` in `src/lib/tools.ts` — that's the single source of truth used by header, footer, sitemap, and the home directory.

That's it.

## Architecture notes

- **Single Next.js app, multiple tool routes.** One subdomain, one set of secrets, one deploy. Every tool is path-based under `tools.rojipeptides.com`.
- **Local-first by default.** Tools that have user data (Tracker, Bloodwork) store everything in localStorage. No accounts, no DB. Cloud sync hooks are intentionally left as follow-ups — see `FOLLOWUPS.md` §7.
- **Cross-domain attribution.** GA4 + Google Ads linker covers `rojipeptides.com`, `protocol.rojipeptides.com`, and `tools.rojipeptides.com` so the funnel from tool → store is properly attributed.
- **No medical claims, anywhere.** Every tool's UX, copy, and disclaimers are written to stay on the safe side of "research education." The AI assistant in particular has hard guardrails refusing dosing or human-use questions before the LLM ever sees them.
