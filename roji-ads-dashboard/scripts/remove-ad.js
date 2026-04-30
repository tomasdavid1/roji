#!/usr/bin/env node
/**
 * Remove a specific Google Ads ad by ad_group_ad ID. The ID format is
 * "<ad_group_id>~<ad_id>" — we look up the right resource_name first.
 *
 *   node scripts/remove-ad.js <ad_id>
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const adId = process.argv[2];
if (!adId || !/^\d+$/.test(adId)) {
  console.error("Usage: node scripts/remove-ad.js <ad_id>");
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
  const rows = await customer.query(`
    SELECT
      ad_group_ad.resource_name,
      ad_group_ad.ad.id,
      ad_group_ad.status,
      ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad
    WHERE ad_group_ad.ad.id = ${adId}
  `);
  if (rows.length === 0) {
    console.error(`Ad ${adId} not found.`);
    process.exit(2);
  }
  const r = rows[0];
  const descs = (r.ad_group_ad.ad.responsive_search_ad && r.ad_group_ad.ad.responsive_search_ad.descriptions) || [];
  console.log("Removing ad:", r.ad_group_ad.resource_name);
  console.log("  first description was:", descs[0] && descs[0].text);
  const res = await customer.adGroupAds.remove([r.ad_group_ad.resource_name]);
  console.log("  removed:", JSON.stringify(res.results || res));
})().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  if (err && err.errors) for (const e of err.errors) console.error("  ↳", JSON.stringify(e));
  process.exit(1);
});
