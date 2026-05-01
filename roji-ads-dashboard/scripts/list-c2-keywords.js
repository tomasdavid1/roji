#!/usr/bin/env node
/**
 * Quick audit — list every active keyword in C2's ad group, sorted
 * by date added so we can spot the new arrivals at the bottom.
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const ROJI_CID = "6573032286";
const C2_CAMPAIGN_ID = "23813304892";

const MATCH_TYPE = { 2: "EXACT", 3: "PHRASE", 4: "BROAD" };
const STATUS = { 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };

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

(async () => {
  const rows = await customer.query(`
    SELECT
      ad_group.name,
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${C2_CAMPAIGN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY ad_group_criterion.criterion_id
  `);
  console.log(`C2 active keywords: ${rows.length}`);
  console.log("");
  for (const r of rows) {
    const k = r.ad_group_criterion;
    const text = k.keyword?.text ?? "?";
    const mt = MATCH_TYPE[k.keyword?.match_type] ?? "?";
    const st = STATUS[k.status] ?? "?";
    console.log(`  ${st.padEnd(8)} ${mt.padEnd(7)} ${text}`);
  }
})().catch((e) => {
  console.error(e?.errors ?? e);
  process.exit(1);
});
