#!/usr/bin/env node
/**
 * Dump the conversion_tracking_id the Roji Tools sub-account is actually
 * looking for, and list its conversion actions + their tag snippets.
 *
 *   node scripts/check-sub-account-tracking.js
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
  const custRows = await customer.query(`
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.conversion_tracking_setting.conversion_tracking_id,
      customer.conversion_tracking_setting.cross_account_conversion_tracking_id,
      customer.conversion_tracking_setting.accepted_customer_data_terms
    FROM customer
  `);
  for (const r of custRows) {
    const s = (r.customer && r.customer.conversion_tracking_setting) || {};
    console.log(`Sub-account ${r.customer.id} (${r.customer.descriptive_name}):`);
    console.log(`  conversion_tracking_id:               ${s.conversion_tracking_id}`);
    console.log(`  cross_account_conversion_tracking_id: ${s.cross_account_conversion_tracking_id}`);
    console.log(`  accepted_customer_data_terms:         ${s.accepted_customer_data_terms}`);
  }
  console.log();
  const convRows = await customer.query(`
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.status,
      conversion_action.type,
      conversion_action.category,
      conversion_action.owner_customer,
      conversion_action.tag_snippets
    FROM conversion_action
    WHERE conversion_action.status != 'REMOVED'
    ORDER BY conversion_action.id
  `);
  console.log(`Conversion actions visible to sub-account (${convRows.length}):`);
  for (const r of convRows) {
    const c = r.conversion_action;
    console.log(`- [${c.id}] ${c.name} — status=${c.status} type=${c.type} cat=${c.category}`);
    console.log(`    owner: ${c.owner_customer}`);
    if (Array.isArray(c.tag_snippets)) {
      for (const t of c.tag_snippets) {
        const snippet = (t.event_snippet || t.global_site_tag || "")
          .replace(/\s+/g, " ")
          .slice(0, 160);
        const aw = (snippet.match(/AW-\d+/) || [])[0] || "(no AW- id found)";
        console.log(`    snippet type=${t.type} page_format=${t.page_format} AW=${aw}`);
      }
    }
  }
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", e.message);
  process.exit(1);
});
