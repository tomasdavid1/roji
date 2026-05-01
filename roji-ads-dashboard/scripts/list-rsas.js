#!/usr/bin/env node
/**
 * List every RSA (status != REMOVED) per ad group, grouped by campaign.
 *
 *   node scripts/list-rsas.js
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const MCC_CID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
const SUB_CID = process.env.GOOGLE_ADS_CUSTOMER_ID;

const STATUS = { 1: "UNKNOWN", 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
const POLICY = { 0: "UNKNOWN", 1: "UNSPECIFIED", 2: "APPROVED", 3: "APPROVED_LIMITED", 4: "ELIGIBLE", 5: "UNDER_REVIEW", 6: "DISAPPROVED", 7: "SITE_SUSPENDED", 8: "AREA_OF_INTEREST_ONLY" };

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
  const rows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines
    FROM ad_group_ad
    WHERE ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
    ORDER BY campaign.name, ad_group.name, ad_group_ad.ad.id
  `);
  let cur = null;
  for (const r of rows) {
    const key = `${r.campaign.name} > ${r.ad_group.name}`;
    if (key !== cur) {
      console.log(`\n${key}`);
      cur = key;
    }
    const aga = r.ad_group_ad;
    const hs = (aga.ad.responsive_search_ad.headlines || []).map((h) => h.text).slice(0, 3);
    console.log(
      `  ad ${aga.ad.id} | status=${STATUS[aga.status] || aga.status} | policy=${POLICY[aga.policy_summary?.approval_status] || aga.policy_summary?.approval_status} | url=${(aga.ad.final_urls || [])[0]}`,
    );
    console.log(`    headlines[0..2]: ${JSON.stringify(hs)}`);
  }
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  process.exit(1);
});
