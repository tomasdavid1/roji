#!/usr/bin/env node
/**
 * Check whether the MCC's conversion actions are configured for
 * cross-account conversion tracking. If they are, every child account
 * (including the new Roji Tools 657-303-2286) will share them.
 *
 *   node scripts/check-cross-account-tracking.js
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const MCC_CID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: MCC_CID,
  login_customer_id: MCC_CID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

(async () => {
  const rows = await customer.query(`
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.conversion_tracking_setting.conversion_tracking_id,
      customer.conversion_tracking_setting.cross_account_conversion_tracking_id,
      customer.conversion_tracking_setting.accepted_customer_data_terms,
      customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled
    FROM customer
  `);
  for (const r of rows) {
    const s = (r.customer && r.customer.conversion_tracking_setting) || {};
    console.log(`MCC ${r.customer.id} (${r.customer.descriptive_name}):`);
    console.log(`  conversion_tracking_id:               ${s.conversion_tracking_id}`);
    console.log(`  cross_account_conversion_tracking_id: ${s.cross_account_conversion_tracking_id}`);
    console.log(`  accepted_customer_data_terms:         ${s.accepted_customer_data_terms}`);
    console.log(`  enhanced_conversions_for_leads:       ${s.enhanced_conversions_for_leads_enabled}`);
  }
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", e.message);
  process.exit(1);
});
