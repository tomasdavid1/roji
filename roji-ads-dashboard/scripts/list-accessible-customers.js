#!/usr/bin/env node
/**
 * List every customer this OAuth refresh token can reach, plus — when
 * a login_customer_id (MCC) is set — every child account under the MCC.
 *
 *   node scripts/list-accessible-customers.js
 */
require("dotenv").config({ path: ".env.local" });

const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

(async () => {
  // 1. Top-level: every customer the refresh token has direct access to.
  console.log("\nDirectly accessible customers:");
  const top = await client.listAccessibleCustomers(process.env.GOOGLE_ADS_REFRESH_TOKEN);
  for (const r of top.resource_names || []) console.log("  •", r);

  // 2. If MCC, walk one level down.
  const mcc = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (!mcc) return;

  console.log(`\nChildren of MCC ${mcc}:`);
  const customer = client.Customer({
    customer_id: mcc,
    login_customer_id: mcc,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });

  const rows = await customer.query(`
    SELECT
      customer_client.client_customer,
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.status,
      customer_client.currency_code,
      customer_client.time_zone
    FROM customer_client
    WHERE customer_client.level <= 1
  `);

  for (const row of rows) {
    const c = row.customer_client || {};
    const tag = c.manager ? "[MCC]" : "     ";
    console.log(
      `  ${tag} ${c.id}  ${c.descriptive_name || "(unnamed)"}  ${c.currency_code || ""}  status=${c.status}`,
    );
  }
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  process.exit(2);
});
