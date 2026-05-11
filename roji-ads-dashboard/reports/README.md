# `reports/`

Rolling daily snapshots of the Roji paid-funnel (Google Ads × GA4),
written by the
[`daily-funnel-report.yml`](../../.github/workflows/daily-funnel-report.yml)
GitHub Actions workflow that runs `npm run report:today` once a day
at 23:30 UTC and commits the captured output here as
`YYYY-MM-DD.md`.

## What's in each file

The verbatim console output of `scripts/today-report.ts`, wrapped in
a fenced code block so it renders cleanly on GitHub. Each report
contains:

- **Google Ads (today)** — spend, impressions, clicks, CTR, avg CPC,
  conversions; with deltas vs yesterday and the trailing 7-day avg.
- **By campaign** — the same metrics broken out per active campaign.
- **Top keywords today** — the 8 keywords that drove the most clicks.
- **GA4 mid-funnel** — page_view, tool_engagement, store_outbound_click,
  add_to_cart, begin_checkout. Self-traffic (anything from Rio de
  Janeiro, the developer's location) is excluded; see
  [`src/lib/ga4-self-filter.ts`](../src/lib/ga4-self-filter.ts).
- **Funnel rates today** — the click → tool view → store click →
  ATC → checkout rate cascade. The first rate is often >100%
  because the GA4 numerator is "all sources" (organic + paid)
  while the denominator is paid Google Ads clicks only — that's by
  design (we want to see total tool engagement vs paid-traffic-only
  conversion). Treat it as a proxy, not a literal funnel rate.

## Triggering an ad-hoc run

Workflow → Actions tab → "Daily funnel snapshot" → "Run workflow"
→ optionally fill in a reason. The result will be either a new
file (if no scheduled run has happened yet today) or appended as
a "Re-run at HH:MM UTC" section to the existing day's file.

## Why does this exist

Manually running `npm run report:today` and pasting the output into
chat is fine once or twice. It's not a system. As of 2026-05-11
we're spending ~$40/day on Google Ads with the funnel finally
deployed correctly, and we need the trajectory of weeks, not just
spot-checks. This dir is the trajectory.

## What about a chart?

Not yet. The first 30 entries are signal-poor (small N, lots of
campaign-launch noise) so a chart would mostly show variance, not
trend. Around entry 30+ we'll write a small aggregator that pulls
each markdown's numbers into a CSV / chart.
