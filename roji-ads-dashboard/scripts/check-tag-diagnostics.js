#!/usr/bin/env node
/**
 * Pull per-conversion-action status (last conversion date, tag status)
 * to see whether Google has actually received any conversions yet.
 *
 *   node scripts/check-tag-diagnostics.js
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const MCC_CID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
const SUB_CID = process.env.GOOGLE_ADS_CUSTOMER_ID;

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: SUB_CID,
  login_customer_id: MCC_CID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

(async () => {
  console.log("=== Conversion actions (config) ===\n");
  const rows = await customer.query(`
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.status,
      conversion_action.type,
      conversion_action.category,
      conversion_action.include_in_conversions_metric
    FROM conversion_action
    WHERE conversion_action.status != 'REMOVED'
  `);
  for (const r of rows) {
    const c = r.conversion_action;
    console.log(
      `[${c.id}] ${c.name} — status=${c.status} type=${c.type} ` +
        `cat=${c.category} include_in_conv=${c.include_in_conversions_metric}`,
    );
  }

  console.log("\n=== Conversions last 30d (segmented by conversion action) ===\n");
  const segRows = await customer.query(`
    SELECT
      segments.conversion_action,
      segments.conversion_action_name,
      metrics.all_conversions,
      metrics.all_conversions_value,
      metrics.conversions
    FROM customer
    WHERE segments.date DURING LAST_30_DAYS
  `);
  if (!segRows.length) {
    console.log("  (no conversions recorded in last 30 days)");
  }
  for (const r of segRows) {
    const s = r.segments || {};
    const m = r.metrics || {};
    console.log(
      `  action=${s.conversion_action_name || s.conversion_action} ` +
        `all_conv=${m.all_conversions || 0} conv=${m.conversions || 0} ` +
        `value=$${(m.all_conversions_value || 0).toFixed(2)}`,
    );
  }
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", e.message);
  process.exit(1);
});
