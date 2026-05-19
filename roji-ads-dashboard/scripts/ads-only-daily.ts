/**
 * ads-only-daily.ts — Google Ads daily breakdown when GA4 token is dead.
 *
 * Plain spend/click/impression/conversion daily breakdown, by campaign.
 * Use when GA4 OAuth is expired and we still want to know what the
 * paid side has been doing.
 *
 * Run:
 *   node --require ./scripts/_cli-bootstrap.cjs --import tsx ./scripts/ads-only-daily.ts --from 2026-05-13 --to 2026-05-19
 */

import { GoogleAdsApi } from "google-ads-api";

const argFrom = (() => { const i = process.argv.indexOf("--from"); return i > -1 ? process.argv[i + 1] : ""; })();
const argTo = (() => { const i = process.argv.indexOf("--to"); return i > -1 ? process.argv[i + 1] : ""; })();
if (!argFrom || !argTo) {
  console.error("Usage: ads-only-daily.ts --from YYYY-MM-DD --to YYYY-MM-DD");
  process.exit(2);
}

const adsClient = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});
const customer = adsClient.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
});

const fmt = {
  usd: (n: number) => `$${n.toFixed(2)}`,
  pct: (n: number) => `${(n * 100).toFixed(2)}%`,
};
const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
const padN = (s: string, n: number) => s.padStart(n);

async function main() {
  console.log(`\n=== Google Ads daily — ${argFrom} → ${argTo} ===\n`);

  const rows = (await customer.query(`
    SELECT
      segments.date,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${argFrom}' AND '${argTo}'
    ORDER BY segments.date, campaign.name
  `)) as Array<{
    segments?: { date?: string };
    campaign?: { name?: string };
    metrics?: { impressions?: number | string; clicks?: number | string; cost_micros?: number | string; conversions?: number | string };
  }>;

  // Aggregate by date
  const byDate = new Map<string, { spend: number; clicks: number; impr: number; conv: number; campaigns: string[] }>();
  for (const r of rows) {
    const date = String(r.segments?.date ?? "");
    const a = byDate.get(date) ?? { spend: 0, clicks: 0, impr: 0, conv: 0, campaigns: [] };
    a.spend += Number(r.metrics?.cost_micros ?? 0) / 1_000_000;
    a.clicks += Number(r.metrics?.clicks ?? 0);
    a.impr += Number(r.metrics?.impressions ?? 0);
    a.conv += Number(r.metrics?.conversions ?? 0);
    if (r.campaign?.name && !a.campaigns.includes(r.campaign.name)) a.campaigns.push(r.campaign.name);
    byDate.set(date, a);
  }

  console.log(`  ${pad("date", 12)} ${padN("spend", 9)} ${padN("clicks", 7)} ${padN("impr", 7)} ${padN("CTR", 7)} ${padN("CPC", 7)} ${padN("conv", 6)}`);
  console.log(`  ${"-".repeat(12)} ${"-".repeat(9)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(6)}`);
  let totSpend = 0, totClicks = 0, totImpr = 0, totConv = 0;
  for (const [date, a] of [...byDate.entries()].sort()) {
    const ctr = a.impr > 0 ? a.clicks / a.impr : 0;
    const cpc = a.clicks > 0 ? a.spend / a.clicks : 0;
    const dt = new Date(date + "T12:00:00");
    const wk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
    const mmdd = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    console.log(
      `  ${pad(`${wk} ${mmdd}`, 12)} ${padN(fmt.usd(a.spend), 9)} ${padN(String(a.clicks), 7)} ${padN(String(a.impr), 7)} ${padN(fmt.pct(ctr), 7)} ${padN(fmt.usd(cpc), 7)} ${padN(a.conv.toFixed(1), 6)}`,
    );
    totSpend += a.spend; totClicks += a.clicks; totImpr += a.impr; totConv += a.conv;
  }
  const totCtr = totImpr > 0 ? totClicks / totImpr : 0;
  const totCpc = totClicks > 0 ? totSpend / totClicks : 0;
  console.log(`  ${"-".repeat(12)} ${"-".repeat(9)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(7)} ${"-".repeat(6)}`);
  console.log(
    `  ${pad("TOTAL", 12)} ${padN(fmt.usd(totSpend), 9)} ${padN(String(totClicks), 7)} ${padN(String(totImpr), 7)} ${padN(fmt.pct(totCtr), 7)} ${padN(fmt.usd(totCpc), 7)} ${padN(totConv.toFixed(1), 6)}`,
  );

  console.log(`\n  Campaigns active during this window:`);
  const allCampaigns = new Set<string>();
  for (const a of byDate.values()) for (const c of a.campaigns) allCampaigns.add(c);
  for (const c of allCampaigns) console.log(`    - ${c}`);

  // Geo check — did the presence-only fix kick in?
  console.log(`\n--- Country breakdown (post May 15, sanity check on geo fix) ---\n`);
  const geoRows = (await customer.query(`
    SELECT
      segments.date,
      segments.geo_target_country,
      metrics.clicks,
      metrics.cost_micros
    FROM geographic_view
    WHERE segments.date BETWEEN '${argFrom}' AND '${argTo}'
      AND metrics.clicks > 0
    ORDER BY metrics.clicks DESC
  `)) as Array<{
    segments?: { date?: string; geo_target_country?: string };
    metrics?: { clicks?: number | string; cost_micros?: number | string };
  }>;

  const byCountry = new Map<string, { clicks: number; spend: number }>();
  for (const r of geoRows) {
    const cn = String(r.segments?.geo_target_country ?? "?");
    const a = byCountry.get(cn) ?? { clicks: 0, spend: 0 };
    a.clicks += Number(r.metrics?.clicks ?? 0);
    a.spend += Number(r.metrics?.cost_micros ?? 0) / 1_000_000;
    byCountry.set(cn, a);
  }
  console.log(`  ${pad("geo_target_country", 35)} ${padN("clicks", 7)} ${padN("spend", 9)}`);
  console.log(`  ${"-".repeat(35)} ${"-".repeat(7)} ${"-".repeat(9)}`);
  const sortedCountries = [...byCountry.entries()].sort(([, a], [, b]) => b.clicks - a.clicks);
  for (const [cn, a] of sortedCountries.slice(0, 10)) {
    console.log(`  ${pad(cn, 35)} ${padN(String(a.clicks), 7)} ${padN(fmt.usd(a.spend), 9)}`);
  }

  console.log("\n=== end ===\n");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  process.exit(1);
});
