#!/usr/bin/env node
/**
 * One-shot audit of the Roji Tools (657-303-2286) Google Ads account.
 * Checks account status, conversion tracking settings, conversion actions,
 * campaigns, and (if any campaigns exist) their settings — so we can
 * surgically fix anything Google's onboarding wizard left in a bad state.
 *
 *   node scripts/audit-roji-account.js
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const ROJI_CID = "6573032286";

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

async function safeQuery(label, gaql) {
  try {
    const rows = await customer.query(gaql);
    console.log(`\n=== ${label} (${rows.length} rows) ===`);
    if (rows.length === 0) console.log("  (empty)");
    for (const row of rows) console.log(JSON.stringify(row, null, 2));
  } catch (err) {
    console.log(`\n=== ${label} === FAILED`);
    if (err && err.errors && err.errors[0]) {
      console.log(`  ${err.errors[0].message}`);
    } else {
      console.log("  ", err && err.message ? err.message : err);
    }
  }
}

(async () => {
  await safeQuery(
    "Account metadata",
    `SELECT
       customer.id,
       customer.descriptive_name,
       customer.status,
       customer.test_account,
       customer.auto_tagging_enabled,
       customer.conversion_tracking_setting.conversion_tracking_id,
       customer.conversion_tracking_setting.cross_account_conversion_tracking_id,
       customer.currency_code,
       customer.time_zone
     FROM customer`,
  );

  await safeQuery(
    "Conversion actions",
    `SELECT
       conversion_action.id,
       conversion_action.resource_name,
       conversion_action.name,
       conversion_action.category,
       conversion_action.type,
       conversion_action.status,
       conversion_action.primary_for_goal
     FROM conversion_action`,
  );

  await safeQuery(
    "Campaigns",
    `SELECT
       campaign.id,
       campaign.name,
       campaign.status,
       campaign.advertising_channel_type,
       campaign.advertising_channel_sub_type,
       campaign.bidding_strategy_type,
       campaign.maximize_conversions.target_cpa_micros,
       campaign.manual_cpc.enhanced_cpc_enabled,
       campaign.network_settings.target_google_search,
       campaign.network_settings.target_search_network,
       campaign.network_settings.target_content_network,
       campaign.network_settings.target_partner_search_network,
       campaign_budget.amount_micros,
       campaign_budget.delivery_method
     FROM campaign`,
  );

  await safeQuery(
    "Ad groups",
    `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign FROM ad_group`,
  );

  await safeQuery(
    "Keywords",
    `SELECT
       ad_group_criterion.criterion_id,
       ad_group_criterion.keyword.text,
       ad_group_criterion.keyword.match_type,
       ad_group_criterion.status,
       ad_group_criterion.ad_group
     FROM ad_group_criterion
     WHERE ad_group_criterion.type = 'KEYWORD'`,
  );

  await safeQuery(
    "Ads",
    `SELECT
       ad_group_ad.ad.id,
       ad_group_ad.ad.type,
       ad_group_ad.status,
       ad_group_ad.ad.responsive_search_ad.headlines,
       ad_group_ad.ad.responsive_search_ad.descriptions,
       ad_group_ad.ad.final_urls
     FROM ad_group_ad`,
  );
})().catch((err) => {
  console.error("FATAL:", err && err.message ? err.message : err);
  process.exit(1);
});
