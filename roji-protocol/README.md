# roji-protocol

Free protocol-builder tool. Recommends personalized research protocols and deep-links to the WooCommerce store.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · `framer-motion` · `zustand`.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx           Root layout, fonts, gtag.js bootstrap
│   ├── page.tsx             Landing page
│   ├── protocol/page.tsx    Multi-step wizard
│   ├── results/page.tsx     Standalone results view
│   └── api/recommend/       POST endpoint wrapping generateProtocol()
├── components/
│   ├── ProtocolWizard.tsx   Orchestrator with framer-motion transitions
│   ├── GoalSelector.tsx     Step 1
│   ├── StatsInput.tsx       Step 2 (lbs/kg toggle)
│   ├── ExperienceLevel.tsx  Step 3
│   ├── GoalsDetail.tsx      Step 4 (conditional per goal)
│   ├── ProtocolOutput.tsx   Step 5 — fires gtag conversion
│   ├── StackCard.tsx        "Get this stack" CTA
│   └── ui/
└── lib/
    ├── constants.ts         Compound + stack tables, references
    ├── recommend.ts         generateProtocol() — pure function
    └── store.ts             Zustand wizard state
```

## Recommendation logic

`generateProtocol(input: UserInput)` in [src/lib/recommend.ts](./src/lib/recommend.ts):

1. Convert `weight_lbs` → kg (`* 0.453592`).
2. Determine `cycleWeeks` from goal + healing timeline, then clamp by `EXPERIENCE_CYCLE_CAP[peptide_experience]` (none=6, some=8, experienced=12).
3. For each compound in the stack, compute per-administration dose:
   - **BPC-157**: `max(baseMcg, perKgMcg * weightKg) * SEX_MULTIPLIER[sex]`, then severity bump (significant=1.25x, minor=0.85x). Route depends on `healing_area`.
   - **TB-500**: 4-week loading at `2mg + perKg`, then maintenance at 75% loading.
   - **CJC-1295 (DAC)**: fixed 2mg twice weekly.
   - **Ipamorelin**: `max(baseMcg, perKgMcg * weightKg) * SEX_MULTIPLIER[sex]`. Frequency bumps to 3x/day if `training_freq >= 5`.
   - **MK-677**: 10/15/20mg by experience; -5mg if `body_fat_pct < 12`.
4. Returns full recommendation including `shopUrl` with UTM params for the cart deep-link.

Female sex multiplier: `0.85`. Editable in [src/lib/constants.ts](./src/lib/constants.ts).

## Deployment

```bash
vercel --prod
# Set env vars in Vercel dashboard:
#   NEXT_PUBLIC_STORE_URL=https://rojipeptides.com
#   NEXT_PUBLIC_GADS_ID=AW-XXXXXXXXXX
#   NEXT_PUBLIC_GADS_PROTOCOL_LABEL=...
#   NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
# Custom domain: protocol.rojipeptides.com
```

`vercel.json` adds security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

## Conversion tracking

When a protocol is generated, `ProtocolOutput.tsx` fires:

- `gtag('event', 'conversion', { send_to: 'AW-XXXX/LABEL' })` — Google Ads micro-conversion
- `gtag('event', 'protocol_complete', { event_label, value })` — GA4 event

When the user clicks "Get this stack", an additional `stack_click` event fires before redirect to `${NEXT_PUBLIC_STORE_URL}/cart/?protocol_stack=<slug>&utm_source=protocol_engine&...`.

The WooCommerce store handles `protocol_stack` query param via `template_redirect` to auto-add the right product (see [`roji-store/roji-child/inc/woocommerce.php`](../roji-store/roji-child/inc/woocommerce.php)).

## Compliance

- All copy uses research-only language. No therapeutic claims.
- Footer disclaimer on results page. Age requirement (21+) enforced in step 2.
- The tool itself is free. It never sells anything directly — it only links to the store.
