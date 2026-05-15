/**
 * week-deep-dive.ts — per-day deep funnel analysis for the trailing week.
 *
 * Goal: answer "we spent ~$150 over a week, what happened EVERY DAY,
 * where did people drop, are they converting INSIDE the store, and
 * if not why?"
 *
 * What `today-report.ts` does NOT do that we need here:
 *   - per-day breakdown across N days, not just today vs y'day
 *   - inside-the-store funnel (shop pageviews → PDP views → ATC →
 *     view_cart → begin_checkout → purchase), not just the outbound
 *     click that signals "they left the tools site"
 *   - per-product breakdown of ATC events (which products did people
 *     try to buy?)
 *   - per-page breakdown of where store sessions died (did they
 *     bounce on /shop/? on a PDP? on /cart/? on /checkout/?)
 *
 * Self-traffic (Rio de Janeiro) is excluded throughout via
 * SELF_TRAFFIC_RULES.
 *
 * Run:
 *   node --require ./scripts/_cli-bootstrap.cjs --import tsx ./scripts/week-deep-dive.ts
 *
 * Date range defaults to last 5 days inclusive (Mon-Fri-style window
 * when run on a Friday). Override with --from / --to:
 *   ... ./scripts/week-deep-dive.ts --from 2026-05-09 --to 2026-05-15
 */

import { GoogleAdsApi } from "google-ads-api";

import { ga4WithoutSelfTraffic } from "../src/lib/ga4-self-filter";

/* ── args ───────────────────────────────────────────────────────────── */

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoMinusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const argFrom = (() => {
  const i = process.argv.indexOf("--from");
  return i > -1 ? process.argv[i + 1] : isoMinusDays(4);
})();
const argTo = (() => {
  const i = process.argv.indexOf("--to");
  return i > -1 ? process.argv[i + 1] : todayISO();
})();

console.log(`\n=== Week deep-dive: ${argFrom} → ${argTo} ===\n`);

/* ── google ads ─────────────────────────────────────────────────────── */

const adsClient = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});
const adsCustomer = adsClient.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
});

interface AdsDayRow {
  date: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  costUsd: number;
  conversions: number;
}

async function fetchAdsByDay(): Promise<AdsDayRow[]> {
  const rows = (await adsCustomer.query(`
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${argFrom}' AND '${argTo}'
    ORDER BY segments.date
  `)) as Array<{
    segments?: { date?: string };
    campaign?: { id?: string | number; name?: string };
    metrics?: {
      impressions?: string | number;
      clicks?: string | number;
      cost_micros?: string | number;
      conversions?: string | number;
    };
  }>;
  return rows.map((r) => ({
    date: String(r.segments?.date ?? ""),
    campaignName: String(r.campaign?.name ?? "?"),
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    costUsd: Number(r.metrics?.cost_micros ?? 0) / 1_000_000,
    conversions: Number(r.metrics?.conversions ?? 0),
  }));
}

interface KeywordRow {
  date: string;
  keyword: string;
  matchType: string | number;
  impressions: number;
  clicks: number;
  costUsd: number;
  conversions: number;
}

async function fetchKeywordsByDay(): Promise<KeywordRow[]> {
  const rows = (await adsCustomer.query(`
    SELECT
      segments.date,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date BETWEEN '${argFrom}' AND '${argTo}'
      AND metrics.clicks > 0
    ORDER BY metrics.clicks DESC
  `)) as Array<{
    segments?: { date?: string };
    ad_group_criterion?: {
      keyword?: { text?: string; match_type?: string | number };
    };
    metrics?: {
      impressions?: string | number;
      clicks?: string | number;
      cost_micros?: string | number;
      conversions?: string | number;
    };
  }>;
  return rows.map((r) => ({
    date: String(r.segments?.date ?? ""),
    keyword: String(r.ad_group_criterion?.keyword?.text ?? "?"),
    matchType: r.ad_group_criterion?.keyword?.match_type ?? "?",
    impressions: Number(r.metrics?.impressions ?? 0),
    clicks: Number(r.metrics?.clicks ?? 0),
    costUsd: Number(r.metrics?.cost_micros ?? 0) / 1_000_000,
    conversions: Number(r.metrics?.conversions ?? 0),
  }));
}

/* ── ga4 ────────────────────────────────────────────────────────────── */

async function ga4AccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    refresh_token: process.env.GA4_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`GA4 token: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

type Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

async function ga4Run(token: string, body: unknown): Promise<Row[]> {
  const r = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) throw new Error(`GA4 runReport: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { rows?: Row[] };
  return j.rows ?? [];
}

const dateRange = { startDate: argFrom, endDate: argTo };
const selfFilter = ga4WithoutSelfTraffic();

/* ── output formatting ──────────────────────────────────────────────── */

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtN = (n: number) => n.toLocaleString();
const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
const padN = (s: string, n: number) => s.padStart(n);

/* ── main ───────────────────────────────────────────────────────────── */

async function main() {
  const token = await ga4AccessToken();

  console.log("Fetching Google Ads per-day...");
  const adsByDay = await fetchAdsByDay();

  console.log("Fetching keyword breakdown...");
  const keywords = await fetchKeywordsByDay();

  console.log("Fetching GA4 daily events (tools+store, self-filtered)...");
  // Per-day funnel events
  const funnelEvents = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "date" }, { name: "eventName" }, { name: "hostName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              inListFilter: {
                values: [
                  // tools-side
                  "tool_view",
                  "store_outbound_click",
                  "hero_shop_click",
                  "hero_shop_cta_click",
                  "header_shop_click",
                  "tool_complete",
                  "tool_result_rendered",
                  "directory_card_click",
                  "hero_tool_pick",
                  // store-side (key funnel events)
                  "page_view",
                  "view_item",
                  "view_item_list",
                  "select_item",
                  "add_to_cart",
                  "view_cart",
                  "begin_checkout",
                  "purchase",
                  "reserve_order_submitted",
                  "checkout_view",
                  "cart_view",
                ],
              },
            },
          },
          ...(selfFilter ? [selfFilter] : []),
        ],
      },
    },
    limit: 5000,
  });

  console.log("Fetching store page-path breakdown...");
  // Store-side, per-day, per-pagePath: where do sessions actually go?
  const storePages = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "date" }, { name: "pagePath" }],
    metrics: [{ name: "sessions" }, { name: "screenPageViews" }, { name: "totalUsers" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "hostName",
              stringFilter: {
                matchType: "EXACT",
                value: "rojipeptides.com",
              },
            },
          },
          ...(selfFilter ? [selfFilter] : []),
        ],
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 200,
  });

  console.log("Fetching product-level ATC breakdown...");
  // Which products are people adding to cart?
  const atcByProduct = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "date" }, { name: "itemName" }, { name: "itemId" }],
    metrics: [{ name: "itemsAddedToCart" }, { name: "itemsViewed" }],
    dimensionFilter: selfFilter ?? undefined,
    orderBys: [{ metric: { metricName: "itemsAddedToCart" }, desc: true }],
    limit: 50,
  });

  console.log("Fetching session source/medium for store traffic...");
  const storeSources = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "country" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "hostName",
              stringFilter: {
                matchType: "EXACT",
                value: "rojipeptides.com",
              },
            },
          },
          ...(selfFilter ? [selfFilter] : []),
        ],
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });

  /* ── format ─────────────────────────────────────────────────────────── */

  // Build the set of dates in range (inclusive)
  const dates: string[] = [];
  {
    const start = new Date(argFrom);
    const end = new Date(argTo);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    }
  }

  const dayLabel = (yyyymmdd: string) => {
    const y = yyyymmdd.slice(0, 4);
    const m = yyyymmdd.slice(4, 6);
    const d = yyyymmdd.slice(6, 8);
    const date = new Date(`${y}-${m}-${d}T12:00:00`);
    const wk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    return `${wk} ${m}-${d}`;
  };

  /* ── 1. Per-day Ads summary ─────────────────────────────────────── */
  console.log("\n\n========================================================");
  console.log("  PART 1 — DAILY GOOGLE ADS BREAKDOWN");
  console.log("========================================================\n");
  console.log(
    `  ${pad("day", 12)} ${padN("spend", 8)} ${padN("clicks", 7)} ${padN("impr", 7)} ${padN("CTR", 7)} ${padN("CPC", 7)} ${padN("conv", 6)}`,
  );
  console.log(
    `  ${"-".repeat(12)} ${"-".repeat(8)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(6)}`,
  );

  let totSpend = 0,
    totClicks = 0,
    totImpr = 0,
    totConv = 0;
  for (const d of dates) {
    const day = adsByDay.filter((r) => r.date === `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
    const spend = day.reduce((s, r) => s + r.costUsd, 0);
    const clicks = day.reduce((s, r) => s + r.clicks, 0);
    const impr = day.reduce((s, r) => s + r.impressions, 0);
    const conv = day.reduce((s, r) => s + r.conversions, 0);
    const ctr = impr > 0 ? clicks / impr : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    totSpend += spend;
    totClicks += clicks;
    totImpr += impr;
    totConv += conv;
    console.log(
      `  ${pad(dayLabel(d), 12)} ${padN(fmtUsd(spend), 8)} ${padN(String(clicks), 7)} ${padN(String(impr), 7)} ${padN(fmtPct(ctr), 7)} ${padN(fmtUsd(cpc), 7)} ${padN(conv.toFixed(1), 6)}`,
    );
  }
  console.log(
    `  ${"-".repeat(12)} ${"-".repeat(8)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(6)}`,
  );
  const totCtr = totImpr > 0 ? totClicks / totImpr : 0;
  const totCpc = totClicks > 0 ? totSpend / totClicks : 0;
  console.log(
    `  ${pad("TOTAL", 12)} ${padN(fmtUsd(totSpend), 8)} ${padN(String(totClicks), 7)} ${padN(String(totImpr), 7)} ${padN(fmtPct(totCtr), 7)} ${padN(fmtUsd(totCpc), 7)} ${padN(totConv.toFixed(1), 6)}`,
  );
  console.log(
    `\n  ⚠ "conv" comes from Google Ads attribution which DOES NOT see our GA4 self-traffic filter — it can include the developer's QA clicks from Rio.`,
  );

  /* ── 2. Per-day GA4 funnel summary ──────────────────────────────────── */
  console.log("\n\n========================================================");
  console.log("  PART 2 — DAILY FUNNEL (GA4, RIO SELF-TRAFFIC EXCLUDED)");
  console.log("========================================================\n");

  // Pivot funnelEvents to a {date: {event: count}} structure
  type DayCounts = Record<string, number>;
  const funnelByDay: Record<string, DayCounts> = {};
  for (const r of funnelEvents) {
    const date = r.dimensionValues?.[0]?.value ?? "";
    const event = r.dimensionValues?.[1]?.value ?? "";
    const host = r.dimensionValues?.[2]?.value ?? "";
    const n = Number(r.metricValues?.[0]?.value ?? 0);
    if (!funnelByDay[date]) funnelByDay[date] = {};
    // Distinguish tools-side vs store-side page_view
    const key = event === "page_view" ? `page_view@${host}` : event;
    funnelByDay[date][key] = (funnelByDay[date][key] ?? 0) + n;
  }

  const funnelSteps: Array<[string, string]> = [
    ["page_view@tools.rojipeptides.com", "tools_pv"],
    ["tool_view", "tool_view"],
    ["hero_shop_click", "hero_pill"],
    ["hero_shop_cta_click", "hero_card"],
    ["store_outbound_click", "→store"],
    ["page_view@rojipeptides.com", "store_pv"],
    ["view_item", "PDP_view"],
    ["add_to_cart", "ATC"],
    ["view_cart", "view_cart"],
    ["begin_checkout", "begin_chk"],
    ["purchase", "purchase"],
  ];

  console.log(`  ${pad("day", 12)} ${funnelSteps.map(([, h]) => padN(h, 10)).join("")}`);
  console.log(`  ${"-".repeat(12)} ${funnelSteps.map(() => "-".repeat(10)).join(" ")}`);
  for (const d of dates) {
    const counts = funnelByDay[d] ?? {};
    const cells = funnelSteps.map(([k]) => padN(String(counts[k] ?? 0), 10)).join("");
    console.log(`  ${pad(dayLabel(d), 12)} ${cells}`);
  }

  /* ── 3. Inside-the-store: which pages did sessions land on / hit? ───── */
  console.log("\n\n========================================================");
  console.log("  PART 3 — INSIDE THE STORE — PAGE BY PAGE");
  console.log("========================================================\n");
  console.log(
    "  Aggregated across the whole window. The 'sessions' column is the\n  number of distinct sessions that hit each page (so a session that hits\n  /shop/ then /product/foo/ counts in BOTH rows).\n",
  );
  console.log(
    `  ${pad("path", 50)} ${padN("sessions", 10)} ${padN("pageviews", 11)} ${padN("users", 7)}`,
  );
  console.log(
    `  ${"-".repeat(50)} ${"-".repeat(10)} ${"-".repeat(11)} ${"-".repeat(7)}`,
  );
  const pageAgg: Record<string, { sessions: number; pv: number; users: number }> = {};
  for (const r of storePages) {
    const path = r.dimensionValues?.[1]?.value ?? "?";
    const a = pageAgg[path] ?? (pageAgg[path] = { sessions: 0, pv: 0, users: 0 });
    a.sessions += Number(r.metricValues?.[0]?.value ?? 0);
    a.pv += Number(r.metricValues?.[1]?.value ?? 0);
    a.users += Number(r.metricValues?.[2]?.value ?? 0);
  }
  const sortedPages = Object.entries(pageAgg).sort(([, a], [, b]) => b.sessions - a.sessions);
  for (const [path, a] of sortedPages.slice(0, 25)) {
    console.log(
      `  ${pad(path, 50)} ${padN(String(a.sessions), 10)} ${padN(String(a.pv), 11)} ${padN(String(a.users), 7)}`,
    );
  }
  if (sortedPages.length > 25) {
    console.log(`  ... ${sortedPages.length - 25} more rows hidden`);
  }

  /* ── 4. Product-level ATC ───────────────────────────────────────────── */
  console.log("\n\n========================================================");
  console.log("  PART 4 — WHICH PRODUCTS ARE GETTING VIEWED / ATC'D?");
  console.log("========================================================\n");
  // Aggregate across days
  const productAgg: Record<string, { viewed: number; atc: number }> = {};
  for (const r of atcByProduct) {
    const name = r.dimensionValues?.[1]?.value ?? "(unspecified)";
    const a = productAgg[name] ?? (productAgg[name] = { viewed: 0, atc: 0 });
    a.atc += Number(r.metricValues?.[0]?.value ?? 0);
    a.viewed += Number(r.metricValues?.[1]?.value ?? 0);
  }
  const sortedProducts = Object.entries(productAgg)
    .filter(([, a]) => a.viewed > 0 || a.atc > 0)
    .sort(([, a], [, b]) => b.viewed - a.viewed);

  if (sortedProducts.length === 0) {
    console.log("  (no product-level events recorded — either no PDP traffic, or item params not being sent)");
  } else {
    console.log(
      `  ${pad("product", 40)} ${padN("views", 8)} ${padN("ATCs", 8)} ${padN("ATC rate", 10)}`,
    );
    console.log(`  ${"-".repeat(40)} ${"-".repeat(8)} ${"-".repeat(8)} ${"-".repeat(10)}`);
    for (const [name, a] of sortedProducts.slice(0, 20)) {
      const rate = a.viewed > 0 ? a.atc / a.viewed : 0;
      console.log(
        `  ${pad(name, 40)} ${padN(String(a.viewed), 8)} ${padN(String(a.atc), 8)} ${padN(rate > 0 ? fmtPct(rate) : "—", 10)}`,
      );
    }
  }

  /* ── 5. Where is store traffic actually coming from? ──────────────── */
  console.log("\n\n========================================================");
  console.log("  PART 5 — STORE TRAFFIC SOURCES (last 5 days)");
  console.log("========================================================\n");
  console.log(
    `  ${pad("source", 22)} ${pad("medium", 14)} ${pad("country", 14)} ${padN("sessions", 10)} ${padN("users", 8)}`,
  );
  console.log(
    `  ${"-".repeat(22)} ${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(10)} ${"-".repeat(8)}`,
  );
  for (const r of storeSources.slice(0, 20)) {
    const src = r.dimensionValues?.[0]?.value ?? "?";
    const med = r.dimensionValues?.[1]?.value ?? "?";
    const country = r.dimensionValues?.[2]?.value ?? "?";
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    const users = Number(r.metricValues?.[1]?.value ?? 0);
    console.log(
      `  ${pad(src, 22)} ${pad(med, 14)} ${pad(country, 14)} ${padN(String(sessions), 10)} ${padN(String(users), 8)}`,
    );
  }

  /* ── 6. Top keywords for the week ───────────────────────────────────── */
  console.log("\n\n========================================================");
  console.log("  PART 6 — TOP KEYWORDS (week aggregate)");
  console.log("========================================================\n");
  // Aggregate keyword stats across the window
  const kwAgg: Record<string, KeywordRow> = {};
  for (const k of keywords) {
    const key = k.keyword;
    const a =
      kwAgg[key] ??
      (kwAgg[key] = {
        date: "agg",
        keyword: k.keyword,
        matchType: k.matchType,
        impressions: 0,
        clicks: 0,
        costUsd: 0,
        conversions: 0,
      });
    a.impressions += k.impressions;
    a.clicks += k.clicks;
    a.costUsd += k.costUsd;
    a.conversions += k.conversions;
  }
  const sortedKw = Object.values(kwAgg).sort((a, b) => b.clicks - a.clicks);
  console.log(
    `  ${pad("keyword", 40)} ${padN("impr", 7)} ${padN("clicks", 7)} ${padN("cost", 8)} ${padN("CTR", 7)} ${padN("CPC", 7)}`,
  );
  console.log(
    `  ${"-".repeat(40)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(8)} ${"-".repeat(7)} ${"-".repeat(7)}`,
  );
  for (const k of sortedKw.slice(0, 20)) {
    const ctr = k.impressions > 0 ? k.clicks / k.impressions : 0;
    const cpc = k.clicks > 0 ? k.costUsd / k.clicks : 0;
    console.log(
      `  ${pad(k.keyword, 40)} ${padN(String(k.impressions), 7)} ${padN(String(k.clicks), 7)} ${padN(fmtUsd(k.costUsd), 8)} ${padN(fmtPct(ctr), 7)} ${padN(fmtUsd(cpc), 7)}`,
    );
  }
  console.log("\n=== end ===\n");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  if (e?.stack) console.error(e.stack);
  process.exit(1);
});
