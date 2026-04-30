#!/usr/bin/env node
/**
 * Soft-delete a Google Ads campaign by ID. "Soft" because the API doesn't
 * truly delete campaigns — it sets the status to REMOVED, which hides them
 * from the UI and stops all serving but leaves stats intact for reporting.
 *
 *   node scripts/delete-campaign.js <campaign_id>
 *
 * Example:
 *   node scripts/delete-campaign.js 23812078453
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi, enums, resources } = require("google-ads-api");

const id = process.argv[2];
if (!id || !/^\d+$/.test(id)) {
  console.error("Usage: node scripts/delete-campaign.js <campaign_id>");
  process.exit(1);
}

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
  const cid = process.env.GOOGLE_ADS_CUSTOMER_ID;
  const resourceName = `customers/${cid}/campaigns/${id}`;

  console.log(`Looking up campaign ${id} on customer ${cid}…`);
  const rows = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign_budget.resource_name
    FROM campaign
    WHERE campaign.id = ${id}
  `);
  if (rows.length === 0) {
    console.error(`Campaign ${id} not found.`);
    process.exit(2);
  }
  const c = rows[0].campaign;
  const budgetRn = rows[0].campaign_budget && rows[0].campaign_budget.resource_name;
  console.log(`  found: "${c.name}" (status=${c.status})`);

  console.log(`Removing campaign…`);
  const res = await customer.campaigns.remove([resourceName]);
  console.log(`  removed: ${JSON.stringify(res.results || res)}`);

  if (budgetRn) {
    console.log(`Removing orphaned budget ${budgetRn}…`);
    try {
      const r2 = await customer.campaignBudgets.remove([budgetRn]);
      console.log(`  removed: ${JSON.stringify(r2.results || r2)}`);
    } catch (e) {
      console.log(`  budget removal skipped: ${e.message || e}`);
    }
  }

  console.log("\nDone. Campaign hidden from UI; stats retained for reporting.");
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", JSON.stringify(e));
  process.exit(1);
});
