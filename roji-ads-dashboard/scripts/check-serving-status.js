#!/usr/bin/env node
/**
 * Definitive check of whether ads are actually serving in the US.
 * Looks at (a) per-ad policy constraint details and (b) last 24h impressions.
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const ROJI_CID = "6573032286";

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: ROJI_CID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

// 2840 = United States
const US_GEO = "geoTargetConstants/2840";

async function main() {
  console.log("=== Ad-level impressions last 7 days (were they serving?) ===\n");

  const rows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE segments.date DURING LAST_7_DAYS
      AND ad_group_ad.status != 'REMOVED'
  `);

  const STATUS_MAP = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "DISAPPROVED", 3: "APPROVED", 4: "APPROVED_LIMITED", 5: "AREA_OF_INTEREST_ONLY" };
  const AD_STATUS_MAP = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };

  // Aggregate per ad (date segment splits them)
  const byAd = new Map();
  for (const row of rows) {
    const id = String(row.ad_group_ad.ad.id);
    if (!byAd.has(id)) {
      byAd.set(id, {
        campaign: row.campaign.name,
        adGroup: row.ad_group.name,
        adId: id,
        approval: STATUS_MAP[row.ad_group_ad.policy_summary.approval_status] ?? row.ad_group_ad.policy_summary.approval_status,
        status: AD_STATUS_MAP[row.ad_group_ad.status] ?? row.ad_group_ad.status,
        impressions: 0,
        clicks: 0,
        costUsd: 0,
      });
    }
    const e = byAd.get(id);
    e.impressions += Number(row.metrics.impressions ?? 0);
    e.clicks += Number(row.metrics.clicks ?? 0);
    e.costUsd += Number(row.metrics.cost_micros ?? 0) / 1_000_000;
  }

  const sorted = Array.from(byAd.values()).sort((a, b) => b.impressions - a.impressions);
  for (const e of sorted) {
    console.log(
      `  ${e.approval.padEnd(18)} | ad=${e.status.padEnd(8)} | impr=${String(e.impressions).padStart(6)} clicks=${String(e.clicks).padStart(4)} $${e.costUsd.toFixed(2).padStart(6)} | ${e.campaign.split("—")[0].trim()} > ${e.adGroup} (ad ${e.adId})`,
    );
  }

  console.log("\n=== Ad-group level serving status + impressions (7d) ===\n");
  const agRows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group.status,
      ad_group.id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
    FROM ad_group
    WHERE segments.date DURING LAST_7_DAYS
      AND ad_group.status != 'REMOVED'
  `);
  const AG_STATUS = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
  const byAG = new Map();
  for (const row of agRows) {
    const id = String(row.ad_group.id);
    if (!byAG.has(id)) {
      byAG.set(id, {
        campaign: row.campaign.name,
        name: row.ad_group.name,
        id,
        status: AG_STATUS[row.ad_group.status] ?? row.ad_group.status,
        impressions: 0,
        clicks: 0,
        costUsd: 0,
      });
    }
    const e = byAG.get(id);
    e.impressions += Number(row.metrics.impressions ?? 0);
    e.clicks += Number(row.metrics.clicks ?? 0);
    e.costUsd += Number(row.metrics.cost_micros ?? 0) / 1_000_000;
  }
  const agSorted = Array.from(byAG.values()).sort((a, b) => b.impressions - a.impressions);
  for (const e of agSorted) {
    console.log(
      `  ${e.status.padEnd(10)} | impr=${String(e.impressions).padStart(6)} clicks=${String(e.clicks).padStart(4)} $${e.costUsd.toFixed(2).padStart(6)} | ${e.campaign.split("—")[0].trim()} > ${e.name}`,
    );
  }

  console.log("\n=== Campaign-level spend last 7d ===\n");
  const cRows = await customer.query(`
    SELECT
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
  `);
  const C_STATUS = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
  const byC = new Map();
  for (const row of cRows) {
    const n = row.campaign.name;
    if (!byC.has(n)) {
      byC.set(n, {
        name: n,
        status: C_STATUS[row.campaign.status] ?? row.campaign.status,
        budgetUsd: Number(row.campaign_budget?.amount_micros ?? 0) / 1_000_000,
        impressions: 0,
        clicks: 0,
        costUsd: 0,
      });
    }
    const e = byC.get(n);
    e.impressions += Number(row.metrics.impressions ?? 0);
    e.clicks += Number(row.metrics.clicks ?? 0);
    e.costUsd += Number(row.metrics.cost_micros ?? 0) / 1_000_000;
  }
  for (const e of byC.values()) {
    console.log(
      `  ${e.status.padEnd(10)} | budget=$${e.budgetUsd.toFixed(2).padStart(6)}/day | impr=${String(e.impressions).padStart(6)} clicks=${String(e.clicks).padStart(4)} $${e.costUsd.toFixed(2).padStart(6)} | ${e.name}`,
    );
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
