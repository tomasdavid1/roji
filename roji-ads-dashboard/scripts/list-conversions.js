#!/usr/bin/env node
/**
 * One-shot: list every conversion action on the configured Ads account.
 *
 *   node scripts/list-conversions.js
 *
 * Useful right after creating new conversion actions in the Google Ads UI
 * to confirm names, categories, status, AND grab the resource_name (which
 * encodes the AW-id and label that go into wp-config.php).
 */
require("dotenv").config({ path: ".env.local" });

const { GoogleAdsApi } = require("google-ads-api");

const required = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

(async () => {
  console.log(`\nConversion actions on customer ${process.env.GOOGLE_ADS_CUSTOMER_ID}:\n`);
  try {
    const rows = await customer.query(`
      SELECT
        conversion_action.id,
        conversion_action.resource_name,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        conversion_action.primary_for_goal,
        conversion_action.counting_type,
        conversion_action.click_through_lookback_window_days,
        conversion_action.value_settings.default_value,
        conversion_action.value_settings.always_use_default_value,
        conversion_action.tag_snippets
      FROM conversion_action
      ORDER BY conversion_action.id DESC
    `);

    if (rows.length === 0) {
      console.log("  (none)");
      return;
    }

    for (const row of rows) {
      const ca = row.conversion_action || {};
      const vs = ca.value_settings || {};
      console.log(`  • ${ca.name}`);
      console.log(`      id:           ${ca.id}`);
      console.log(`      resource:     ${ca.resource_name}`);
      console.log(`      category:     ${ca.category}`);
      console.log(`      type:         ${ca.type}`);
      console.log(`      status:       ${ca.status}`);
      console.log(`      counting:     ${ca.counting_type}`);
      console.log(`      ctc_window:   ${ca.click_through_lookback_window_days} days`);
      console.log(`      primary_goal: ${ca.primary_for_goal}`);
      if (vs.default_value !== undefined) {
        console.log(`      default_val:  ${vs.default_value} (always=${!!vs.always_use_default_value})`);
      }
      // tag_snippets carries the gtag install snippet which contains
      // the AW-XXXXXX/label pair — print only when present.
      if (Array.isArray(ca.tag_snippets) && ca.tag_snippets.length > 0) {
        for (const t of ca.tag_snippets) {
          // Each snippet has page_format, type, global_site_tag, event_snippet
          // We want event_snippet because that's where the send_to lives.
          const ev = t.event_snippet || "";
          const m = ev.match(/AW-\d+\/[\w-]+/);
          if (m) {
            console.log(`      send_to:      ${m[0]}`);
          }
        }
      }
      console.log();
    }
  } catch (err) {
    console.error("FAILED:", err && err.message ? err.message : err);
    if (err && err.errors) {
      for (const e of err.errors) {
        console.error("  ↳", JSON.stringify(e.error_code || e));
      }
    }
    process.exit(2);
  }
})();
