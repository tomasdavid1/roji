#!/usr/bin/env node
/**
 * Audit geo targeting for every live campaign in the Roji Tools account.
 *
 * Why this exists:
 *   The blueprint declares `geoTargets: ["US"]` for every campaign,
 *   but the provisioner never actually wired that field to a
 *   `CampaignCriterion` of type LOCATION on Google's side. So the
 *   blueprint is asserting US-only while the live account may be
 *   serving everywhere by default.
 *
 *   This script walks every non-removed campaign, pulls its
 *   campaign_criterion rows for LOCATION + COUNTRY criterion types,
 *   and prints what's targeted vs. what's excluded.
 *
 * Run:
 *   node scripts/check-geo-targeting.js
 *
 * Reference: https://developers.google.com/google-ads/api/fields/v17/campaign_criterion
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

// Status enum 0=UNSPECIFIED 1=UNKNOWN 2=ENABLED 3=PAUSED 4=REMOVED
const STATUS = { 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };
// Type enum: just the ones we care about
const CRIT_TYPE = {
  3: "PROXIMITY",
  7: "LOCATION",
  17: "COUNTRY",
};

async function main() {
  const campaigns = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.geo_target_type_setting.positive_geo_target_type,
           campaign.geo_target_type_setting.negative_geo_target_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);

  for (const row of campaigns) {
    const c = row.campaign;
    console.log(`\n=== ${c.name}  (id=${c.id}, ${STATUS[c.status] ?? c.status}) ===`);

    // geo_target_type_setting controls *intent* targeting:
    //   PRESENCE_OR_INTEREST = "include people interested in" the geo (default).
    //   PRESENCE = only people physically there.
    // For a US-only research vendor, PRESENCE is the disciplined choice
    // because PRESENCE_OR_INTEREST will serve to anyone *globally* who
    // searches for "US peptides" or similar.
    const setting = c.geo_target_type_setting ?? {};
    console.log(
      `  geo_target_type:  positive=${setting.positive_geo_target_type ?? "?"}  negative=${setting.negative_geo_target_type ?? "?"}`,
    );

    const crits = await customer.query(`
      SELECT campaign_criterion.criterion_id,
             campaign_criterion.type,
             campaign_criterion.negative,
             campaign_criterion.location.geo_target_constant,
             campaign_criterion.status
      FROM campaign_criterion
      WHERE campaign.id = ${c.id}
        AND campaign_criterion.type IN ('LOCATION', 'COUNTRY', 'PROXIMITY')
        AND campaign_criterion.status != 'REMOVED'
    `);

    if (crits.length === 0) {
      console.log(
        `  [!] NO location criteria found — campaign serves to ALL COUNTRIES.`,
      );
      continue;
    }
    for (const ck of crits) {
      const k = ck.campaign_criterion;
      const typ = CRIT_TYPE[k.type] ?? `type=${k.type}`;
      const constant = k.location?.geo_target_constant ?? "?";
      const neg = k.negative ? "EXCLUDE" : "INCLUDE";
      console.log(`  ${neg.padEnd(7)} ${typ.padEnd(10)} ${constant}`);
    }
  }
  console.log("");
  console.log("Reference: geoTargetConstants/2840 = United States");
}

main().catch((e) => {
  console.error(e?.errors ?? e);
  process.exit(1);
});
