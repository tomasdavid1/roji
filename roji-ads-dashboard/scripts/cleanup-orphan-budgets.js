#!/usr/bin/env node
/**
 * Find and remove campaign budgets that aren't attached to any campaign.
 * The provisioner can leave these around when campaign creation fails
 * mid-flight (budget created → campaign create errors → budget orphan).
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

(async () => {
  const budgets = await customer.query(`
    SELECT
      campaign_budget.resource_name,
      campaign_budget.id,
      campaign_budget.name,
      campaign_budget.reference_count,
      campaign_budget.status
    FROM campaign_budget
  `);

  const orphans = budgets.filter(
    (b) =>
      (b.campaign_budget.reference_count || 0) === 0 &&
      b.campaign_budget.status !== 3, // not already removed
  );

  console.log(`Total budgets: ${budgets.length}`);
  console.log(`Orphans (refs=0, status≠REMOVED): ${orphans.length}`);

  if (orphans.length === 0) return;

  for (const o of orphans) {
    console.log(`  removing ${o.campaign_budget.resource_name} (${o.campaign_budget.name})`);
  }

  const r = await customer.campaignBudgets.remove(orphans.map((o) => o.campaign_budget.resource_name));
  console.log("Removed:", JSON.stringify(r.results || r));
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", JSON.stringify(e));
  process.exit(1);
});
