#!/usr/bin/env node
/**
 * Update the daily budget on an existing Google Ads campaign.
 *
 * Usage:
 *   node scripts/set-campaign-budget.js <campaignId> <dailyUsd>
 *
 * Example:
 *   # Set the live blueprint campaign to ~$14.29/day = $100/week.
 *   node scripts/set-campaign-budget.js 23802331833 14.29
 *
 * Reads the campaign → finds its attached campaign_budget → mutates the
 * budget's amount_micros. Idempotent: re-running with the same value is
 * a harmless no-op-style update.
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const [, , campaignIdArg, dailyUsdArg] = process.argv;
if (!campaignIdArg || !dailyUsdArg) {
  console.error(
    "Usage: node scripts/set-campaign-budget.js <campaignId> <dailyUsd>",
  );
  process.exit(2);
}
const campaignId = String(campaignIdArg).replace(/[^0-9]/g, "");
const dailyUsd = Number(dailyUsdArg);
if (!campaignId || !Number.isFinite(dailyUsd) || dailyUsd <= 0) {
  console.error("Invalid args. campaignId must be numeric, dailyUsd > 0.");
  process.exit(2);
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
  const rows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.campaign_budget,
      campaign_budget.id,
      campaign_budget.resource_name,
      campaign_budget.amount_micros,
      campaign_budget.name
    FROM campaign
    WHERE campaign.id = ${campaignId}
    LIMIT 1
  `);
  if (!rows.length) {
    console.error(`No campaign found with id ${campaignId}`);
    process.exit(1);
  }
  const row = rows[0];
  const cmp = row.campaign;
  const bud = row.campaign_budget;
  if (!bud || !bud.resource_name) {
    console.error(
      `Campaign ${campaignId} has no attached campaign_budget — aborting.`,
    );
    process.exit(1);
  }

  const oldMicros = Number(bud.amount_micros || 0);
  const oldUsd = oldMicros / 1_000_000;
  const newMicros = Math.round(dailyUsd * 1_000_000);

  console.log(`Campaign:      ${cmp.name} (id ${cmp.id})`);
  console.log(`Budget:        ${bud.name} (id ${bud.id})`);
  console.log(
    `Current daily: $${oldUsd.toFixed(2)} (${oldMicros.toLocaleString()} micros)`,
  );
  console.log(
    `New daily:     $${dailyUsd.toFixed(2)} (${newMicros.toLocaleString()} micros)`,
  );
  console.log(
    `Weekly approx: $${(dailyUsd * 7).toFixed(2)} (Google bills daily, can spend up to 2× on a given day but averages over the month)`,
  );

  if (oldMicros === newMicros) {
    console.log("\nBudget already at target — nothing to do.");
    return;
  }

  console.log("\nApplying update...");
  const res = await customer.campaignBudgets.update([
    {
      resource_name: bud.resource_name,
      amount_micros: newMicros,
    },
  ]);
  console.log("OK:", JSON.stringify(res.results || res, null, 2));
})().catch((e) => {
  console.error("FAILED:", e?.errors || e?.message || e);
  process.exit(1);
});
