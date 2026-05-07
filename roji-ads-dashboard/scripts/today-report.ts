/**
 * today-report.ts — one-shot end-of-day funnel snapshot.
 *
 * Pulls today's numbers from Google Ads and GA4 in parallel and
 * prints a single end-to-end view of the paid funnel:
 *
 *   ad spend → ad clicks → tool sessions → store outbound clicks
 *     → add-to-cart → checkout view  ( → purchase, when GA4 surfaces it )
 *
 * Compares against yesterday and the prior 7-day average so today's
 * numbers have context, not just absolutes.
 *
 * Run:
 *   npm run report:today
 *
 * Notes:
 *   - GA4's daily report has a 24–48h lag for new properties. The
 *     funnel lib auto-routes TODAY queries to runRealtimeReport,
 *     which doesn't accept a paid-traffic filter — today's mid-
 *     funnel numbers are "all sources" by design (the ad-click
 *     side is paid by definition since it comes from Google Ads).
 *   - Output is plain text so it pastes cleanly into a chat.
 */

import { getCampaignPerformance, getKeywordPerformance } from "../src/lib/google-ads";

/**
 * Funnel events we count, with the underlying GA4 event names.
 *
 * `getGa4ToolFunnelEvents` from src/lib/ga4 routes "TODAY" to the
 * realtime endpoint, which only covers the last 30 minutes — useless
 * for an EOD snapshot. We re-implement the same query here against the
 * standard endpoint with explicit `today`/`today` dates so we get the
 * full day's totals.
 */
type FunnelStep =
  | "tool_view"
  | "tool_engagement"
  | "store_outbound_click"
  | "add_to_cart"
  | "checkout_view";

const TOOL_ENGAGEMENT_EVENTS = [
  "recomp_calculated",
  "bloodwork_panel_saved",
  "coa_analyzed",
  "recon_preset_click",
  "research_search",
  "ai_message_sent",
  "notify_me_submit",
  "notify_me_open",
  "cost_add_row",
  "tracker_item_added",
  "tracker_dose_logged",
  "interactions_toggle",
  "tool_complete",
  "tool_result_rendered",
  "hero_tool_pick",
  "directory_card_click",
] as const;

async function ga4AccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    refresh_token: process.env.GA4_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`GA4 token refresh failed: ${resp.status} ${await resp.text()}`);
  const json = (await resp.json()) as { access_token: string };
  return json.access_token;
}

async function fetchFunnel(
  startDate: string,
  endDate: string,
): Promise<Record<FunnelStep, number>> {
  if (!process.env.GA4_PROPERTY_ID || !process.env.GA4_REFRESH_TOKEN) {
    return {
      tool_view: 0,
      tool_engagement: 0,
      store_outbound_click: 0,
      add_to_cart: 0,
      checkout_view: 0,
    };
  }
  const token = await ga4AccessToken();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: "200",
    }),
  });
  if (!resp.ok) throw new Error(`GA4 runReport failed: ${resp.status} ${await resp.text()}`);
  const data = (await resp.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
  };
  const counts = new Map<string, number>();
  for (const r of data.rows ?? []) {
    counts.set(r.dimensionValues[0].value, Number(r.metricValues[0].value));
  }
  const sumOf = (...names: string[]) => names.reduce((a, n) => a + (counts.get(n) ?? 0), 0);
  return {
    tool_view: sumOf("page_view"),
    tool_engagement: sumOf(...TOOL_ENGAGEMENT_EVENTS),
    store_outbound_click: sumOf("store_outbound_click", "tool_result_shop_click", "hero_shop_cta_click"),
    add_to_cart: sumOf("add_to_cart"),
    checkout_view: sumOf("begin_checkout"),
  };
}

type AdsTotals = {
  impressions: number;
  clicks: number;
  cost_usd: number;
  conversions: number;
  ctr: number;
  avg_cpc: number;
};

const fmt = {
  usd: (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" }),
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  pct: (n: number) => `${(n * 100).toFixed(2)}%`,
  n: (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("en-US")),
};

function totals(rows: Array<{ impressions: number; clicks: number; cost_usd: number; conversions: number }>): AdsTotals {
  const t = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.cost_usd += r.cost_usd;
      acc.conversions += r.conversions;
      return acc;
    },
    { impressions: 0, clicks: 0, cost_usd: 0, conversions: 0 },
  );
  return {
    ...t,
    ctr: t.impressions > 0 ? t.clicks / t.impressions : 0,
    avg_cpc: t.clicks > 0 ? t.cost_usd / t.clicks : 0,
  };
}

function delta(today: number, baseline: number): string {
  if (baseline <= 0 && today <= 0) return "—";
  if (baseline <= 0) return `+${fmt.int(today)} (new)`;
  const pct = (today - baseline) / baseline;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(0)}%`;
}

async function main() {
  console.log("\n→ Roji daily funnel snapshot");
  console.log(`  ${new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}\n`);

  // Run in parallel — both APIs are read-only and independent.
  const [
    adsToday,
    adsYesterday,
    adsLast7,
    keywordsToday,
    funnelToday,
    funnelYesterday,
  ] = await Promise.all([
    getCampaignPerformance("TODAY"),
    getCampaignPerformance("YESTERDAY"),
    getCampaignPerformance("LAST_7_DAYS"),
    getKeywordPerformance("TODAY").catch(() => []),
    fetchFunnel("today", "today"),
    fetchFunnel("yesterday", "yesterday"),
  ]);

  const t = totals(adsToday);
  const y = totals(adsYesterday);
  const w = totals(adsLast7);
  const w_avg = {
    impressions: w.impressions / 7,
    clicks: w.clicks / 7,
    cost_usd: w.cost_usd / 7,
    conversions: w.conversions / 7,
  };

  // ── Google Ads block ────────────────────────────────────────────────
  console.log("┌─ Google Ads (today)");
  console.log(
    `│  Spend:        ${fmt.usd(t.cost_usd).padEnd(10)}  vs y'day ${fmt.usd(y.cost_usd)} (${delta(t.cost_usd, y.cost_usd)})  ·  7d avg ${fmt.usd(w_avg.cost_usd)}`,
  );
  console.log(
    `│  Impressions:  ${fmt.int(t.impressions).padEnd(10)}  vs y'day ${fmt.int(y.impressions)} (${delta(t.impressions, y.impressions)})  ·  7d avg ${fmt.int(w_avg.impressions)}`,
  );
  console.log(
    `│  Clicks:       ${fmt.int(t.clicks).padEnd(10)}  vs y'day ${fmt.int(y.clicks)} (${delta(t.clicks, y.clicks)})  ·  7d avg ${fmt.int(w_avg.clicks)}`,
  );
  console.log(
    `│  CTR:          ${fmt.pct(t.ctr).padEnd(10)}  vs y'day ${fmt.pct(y.ctr)}`,
  );
  console.log(
    `│  Avg CPC:      ${fmt.usd(t.avg_cpc).padEnd(10)}  vs y'day ${fmt.usd(y.avg_cpc)}`,
  );
  console.log(
    `│  Conv (Ads):   ${t.conversions.toFixed(1).padEnd(10)}  vs y'day ${y.conversions.toFixed(1)} (${delta(t.conversions, y.conversions)})`,
  );
  console.log("└──");

  // ── Per-campaign breakdown ──────────────────────────────────────────
  if (adsToday.length > 0) {
    console.log("\n  By campaign (today):");
    const sorted = [...adsToday].sort((a, b) => b.cost_usd - a.cost_usd);
    for (const r of sorted) {
      if (r.cost_usd === 0 && r.clicks === 0 && r.impressions === 0) continue;
      console.log(
        `    ${r.name.padEnd(48)}  ${fmt.usd(r.cost_usd).padStart(9)}  ${fmt.int(r.clicks).padStart(5)}c  ${fmt.int(r.impressions).padStart(7)}i  ${(r.clicks / Math.max(r.impressions, 1) * 100).toFixed(2)}%CTR`,
      );
    }
  }

  // ── Top keywords today ──────────────────────────────────────────────
  if (keywordsToday.length > 0) {
    const top = [...keywordsToday]
      .filter((k) => k.clicks > 0 || k.cost_usd > 0)
      .sort((a, b) => b.clicks - a.clicks || b.cost_usd - a.cost_usd)
      .slice(0, 8);
    if (top.length > 0) {
      console.log("\n  Top keywords today (by clicks):");
      for (const k of top) {
        console.log(
          `    ${(k.keyword_text + ` [${k.match_type}]`).padEnd(48)}  ${fmt.usd(k.cost_usd).padStart(9)}  ${fmt.int(k.clicks).padStart(5)}c  ${fmt.int(k.impressions).padStart(7)}i`,
        );
      }
    }
  }

  // ── GA4 mid-funnel ──────────────────────────────────────────────────
  console.log("\n┌─ GA4 mid-funnel (today, all sources — full-day standard report)");
  console.log(
    `│  page_view (tools+store):   ${fmt.int(funnelToday.tool_view).padEnd(8)}  vs y'day ${fmt.int(funnelYesterday.tool_view)} (${delta(funnelToday.tool_view, funnelYesterday.tool_view)})`,
  );
  console.log(
    `│  tool_engagement:           ${fmt.int(funnelToday.tool_engagement).padEnd(8)}  vs y'day ${fmt.int(funnelYesterday.tool_engagement)} (${delta(funnelToday.tool_engagement, funnelYesterday.tool_engagement)})`,
  );
  console.log(
    `│  store_outbound_click:      ${fmt.int(funnelToday.store_outbound_click).padEnd(8)}  vs y'day ${fmt.int(funnelYesterday.store_outbound_click)} (${delta(funnelToday.store_outbound_click, funnelYesterday.store_outbound_click)})`,
  );
  console.log(
    `│  add_to_cart:               ${fmt.int(funnelToday.add_to_cart).padEnd(8)}  vs y'day ${fmt.int(funnelYesterday.add_to_cart)} (${delta(funnelToday.add_to_cart, funnelYesterday.add_to_cart)})`,
  );
  console.log(
    `│  begin_checkout:            ${fmt.int(funnelToday.checkout_view).padEnd(8)}  vs y'day ${fmt.int(funnelYesterday.checkout_view)} (${delta(funnelToday.checkout_view, funnelYesterday.checkout_view)})`,
  );
  console.log("└──");

  // ── Funnel-rate summary ─────────────────────────────────────────────
  const tv = funnelToday.tool_view;
  const so = funnelToday.store_outbound_click;
  const ac = funnelToday.add_to_cart;
  const cv = funnelToday.checkout_view;
  console.log("\n  Funnel rates today:");
  console.log(
    `    Click → tool view:        ${t.clicks > 0 ? fmt.pct(tv / t.clicks) : "—"}  (${fmt.int(tv)} / ${fmt.int(t.clicks)})`,
  );
  console.log(
    `    Tool view → store click:  ${tv > 0 ? fmt.pct(so / tv) : "—"}  (${fmt.int(so)} / ${fmt.int(tv)})`,
  );
  console.log(
    `    Store click → ATC:        ${so > 0 ? fmt.pct(ac / so) : "—"}  (${fmt.int(ac)} / ${fmt.int(so)})`,
  );
  console.log(
    `    ATC → checkout:           ${ac > 0 ? fmt.pct(cv / ac) : "—"}  (${fmt.int(cv)} / ${fmt.int(ac)})`,
  );
  console.log();
}

main().catch((err) => {
  console.error("\n✗ today-report failed:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
