#!/usr/bin/env node
/**
 * Pulls every disapproved / under-review asset and ad in the Roji Tools
 * account and prints the specific policy reason Google gave.
 *
 *   node scripts/check-policy-status.js
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

async function main() {
  console.log("=== Disapproved / under-review ADS ===\n");

  const adRows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.review_status,
      ad_group_ad.policy_summary.policy_topic_entries,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad
    WHERE ad_group_ad.policy_summary.approval_status != 'APPROVED'
  `);

  if (adRows.length === 0) {
    console.log("  (none — all ads fully approved)\n");
  } else {
    for (const row of adRows) {
      const p = row.ad_group_ad.policy_summary;
      console.log(`Campaign : ${row.campaign.name}`);
      console.log(`Ad group : ${row.ad_group.name}`);
      console.log(`Ad ID    : ${row.ad_group_ad.ad.id}`);
      console.log(`Approval : ${p.approval_status}`);
      console.log(`Review   : ${p.review_status}`);
      if (p.policy_topic_entries && p.policy_topic_entries.length) {
        console.log("Topics   :");
        for (const t of p.policy_topic_entries) {
          console.log(`    - topic=${t.topic} type=${t.type}`);
          if (t.evidences) {
            for (const ev of t.evidences) {
              const fragments = ev.text_list?.texts ?? [];
              if (fragments.length) {
                console.log(`      evidence: ${JSON.stringify(fragments)}`);
              }
            }
          }
          if (t.constraints) {
            for (const c of t.constraints) {
              console.log(`      constraint: ${JSON.stringify(c)}`);
            }
          }
        }
      }
      const rsa = row.ad_group_ad.ad.responsive_search_ad;
      if (rsa) {
        const heads = (rsa.headlines ?? []).slice(0, 3).map((h) => h.text);
        console.log(`First 3 headlines: ${JSON.stringify(heads)}`);
      }
      console.log("");
    }
  }

  console.log("\n=== Disapproved / under-review ASSETS ===\n");

  const assetRows = await customer.query(`
    SELECT
      asset.id,
      asset.type,
      asset.name,
      asset.sitelink_asset.link_text,
      asset.sitelink_asset.description1,
      asset.sitelink_asset.description2,
      asset.callout_asset.callout_text,
      asset.final_urls,
      asset.policy_summary.approval_status,
      asset.policy_summary.review_status,
      asset.policy_summary.policy_topic_entries
    FROM asset
    WHERE asset.policy_summary.approval_status != 'APPROVED'
  `);

  if (assetRows.length === 0) {
    console.log("  (none — all assets fully approved)\n");
  } else {
    for (const row of assetRows) {
      const a = row.asset;
      const p = a.policy_summary;
      console.log(`Asset ID : ${a.id}`);
      console.log(`Type     : ${a.type}`);
      if (a.sitelink_asset?.link_text) {
        console.log(`Sitelink : "${a.sitelink_asset.link_text}"`);
        console.log(`  desc1 : "${a.sitelink_asset.description1 ?? ""}"`);
        console.log(`  desc2 : "${a.sitelink_asset.description2 ?? ""}"`);
      }
      if (a.callout_asset?.callout_text) {
        console.log(`Callout  : "${a.callout_asset.callout_text}"`);
      }
      if (a.final_urls?.length) {
        console.log(`URL      : ${a.final_urls[0]}`);
      }
      console.log(`Approval : ${p.approval_status}`);
      console.log(`Review   : ${p.review_status}`);
      if (p.policy_topic_entries?.length) {
        console.log("Topics   :");
        for (const t of p.policy_topic_entries) {
          console.log(`    - topic=${t.topic} type=${t.type}`);
          if (t.evidences) {
            for (const ev of t.evidences) {
              const fragments = ev.text_list?.texts ?? [];
              if (fragments.length) {
                console.log(`      evidence: ${JSON.stringify(fragments)}`);
              }
            }
          }
        }
      }
      console.log("");
    }
  }

  console.log("\n=== Summary of ALL ad approval status (for context) ===\n");
  const allAds = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.status
    FROM ad_group_ad
    WHERE ad_group_ad.status != 'REMOVED'
  `);
  const STATUS_MAP = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "DISAPPROVED", 3: "APPROVED", 4: "APPROVED_LIMITED", 5: "AREA_OF_INTEREST_ONLY" };
  const AD_STATUS_MAP = { 0: "UNSPECIFIED", 1: "UNKNOWN", 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
  for (const row of allAds) {
    const approval = STATUS_MAP[row.ad_group_ad.policy_summary.approval_status] ?? String(row.ad_group_ad.policy_summary.approval_status);
    const adStatus = AD_STATUS_MAP[row.ad_group_ad.status] ?? String(row.ad_group_ad.status);
    console.log(
      `  ${approval.padEnd(18)} | ad=${adStatus.padEnd(8)} | ${row.campaign.name} > ${row.ad_group.name} (ad ${row.ad_group_ad.ad.id})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
