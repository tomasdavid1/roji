# roji-ads-dashboard

Internal Google Ads management console for Roji.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · `google-ads-api` · `googleapis`.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3001
```

When `GOOGLE_ADS_*` are missing, the dashboard runs against mock data so the UI can be developed offline.

## Architecture

```
src/
├── app/
│   ├── layout.tsx                    Root shell, fonts
│   ├── page.tsx                      Redirects to /performance
│   ├── (dashboard)/
│   │   ├── layout.tsx                Nav + mock-data banner
│   │   ├── performance/page.tsx      Top metrics + per-campaign table
│   │   ├── campaigns/page.tsx        List + Create form
│   │   └── keywords/page.tsx         Keyword performance table
│   ├── api/ads/
│   │   ├── campaigns/route.ts        GET (list) + POST (create, safety-checked)
│   │   ├── campaigns/[id]/route.ts   PUT (status / budget)
│   │   ├── performance/route.ts
│   │   └── keywords/route.ts
│   └── middleware.ts                 Basic-auth gate
├── components/
│   ├── Nav.tsx
│   ├── MetricCard.tsx
│   └── CreateCampaignForm.tsx
└── lib/
    ├── google-ads.ts                 Customer client, mock fallback
    ├── safety.ts                     validateAdCopy() / assertSafeAdCopy()
    └── format.ts
```

## Auth

`src/middleware.ts` enforces HTTP Basic auth using `ADMIN_USER` / `ADMIN_PASS`. If `ADMIN_PASS` is empty (default `.env.example`) auth is **disabled**, so local dev just works. Set both before deploying.

This is a placeholder — replace with real OAuth (Auth.js, Clerk, etc.) before exposing the dashboard publicly.

## Safety

`src/lib/safety.ts` blocks ad copy or campaign names containing flagged terms (compound names, "peptide", "dosing", "healing", "injection", therapeutic claims, etc.). The campaigns POST route calls `assertSafeAdCopy` before hitting the Google Ads API.

Only ad-copy that focuses on the **tool** (research protocol calculator, evidence-based framework) will pass — see section 3.3 of the project brief for safe headline patterns.

## Mock vs live

`isLive()` returns `true` when all `GOOGLE_ADS_*` env vars are set. Each function in `google-ads.ts` checks this and short-circuits to mock data otherwise. The dashboard nav shows a `Live API` / `Mock data` pill so you always know which mode you're in.

## Deployment

```bash
vercel --prod
# Set env vars in Vercel dashboard:
#   GOOGLE_ADS_DEVELOPER_TOKEN
#   GOOGLE_ADS_CLIENT_ID
#   GOOGLE_ADS_CLIENT_SECRET
#   GOOGLE_ADS_REFRESH_TOKEN
#   GOOGLE_ADS_CUSTOMER_ID
#   GOOGLE_ADS_LOGIN_CUSTOMER_ID  (if using a manager account)
#   ADMIN_USER, ADMIN_PASS         (basic-auth gate — set BOTH or neither)
# Custom domain: admin-ads.rojipeptides.com
```

## API surface

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/ads/campaigns` | GET | List campaigns + 30-day metrics |
| `/api/ads/campaigns` | POST | Create paused Search campaign + budget. Body: `{ name, daily_budget_usd }`. Runs safety validation. |
| `/api/ads/campaigns/[id]` | PUT | Update status (`ENABLED` / `PAUSED`) and/or `daily_budget_usd`. |
| `/api/ads/performance` | GET | Aggregate totals + per-campaign rows. `?range=LAST_7_DAYS` etc. |
| `/api/ads/keywords` | GET | Keyword-level performance. |
