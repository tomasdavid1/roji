#!/usr/bin/env node
/**
 * exclude-ip-from-campaigns.js — add the developer's home IP as a
 * negative campaign criterion on every active campaign so QA clicks
 * don't land in conversion / cost data.
 *
 * Why
 * ---
 * Even with PRESENCE-only geo targeting (which we already enforce),
 * the developer can pollute conversion data when:
 *   - Travelling to the US (geo passes; clicks count)
 *   - Using a US VPN
 *   - Quietly being added back to PRESENCE_OR_INTEREST by an Ads
 *     "Recommendation" we missed
 *
 * Google Ads supports per-campaign IP block lists (max 500 entries
 * per campaign). They're applied BEFORE bidding — so the click never
 * costs money, never shows in metrics, and never triggers a
 * conversion. Belt-and-suspenders to the geo targeting.
 *
 * What this does
 * --------------
 * 1. Pulls every campaign with status != REMOVED.
 * 2. For each, queries existing IP_BLOCK criteria.
 * 3. If the target IP is already excluded → no-op.
 * 4. Otherwise, creates a campaign_criterion with negative=true and
 *    ip_block.ip_address=<target>.
 *
 * Usage
 * -----
 *   # Dry-run (default): print what would change.
 *   node scripts/exclude-ip-from-campaigns.js
 *
 *   # Apply: actually push the criterion ops.
 *   node scripts/exclude-ip-from-campaigns.js --apply
 *
 *   # Override the IP (default uses CURRENT_DEV_IP below):
 *   node scripts/exclude-ip-from-campaigns.js --ip 1.2.3.4 --apply
 *
 * Reference: https://developers.google.com/google-ads/api/reference/rpc/v17/CampaignCriterion#ip_block
 */

require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const ROJI_CID = "6573032286";

// Default — Tomas's Rio dev machine on 2026-05-20. Override with --ip
// if the ISP has rotated the lease.
const CURRENT_DEV_IP = "179.164.127.61";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ipFlagIdx = args.indexOf("--ip");
const TARGET_IP =
  ipFlagIdx >= 0 && args[ipFlagIdx + 1] ? args[ipFlagIdx + 1] : CURRENT_DEV_IP;

if (!/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(TARGET_IP)) {
  console.error(`ERROR: invalid IPv4 address/CIDR: ${TARGET_IP}`);
  process.exit(1);
}

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

// Status enum: 2=ENABLED 3=PAUSED 4=REMOVED
const STATUS = { 2: "ENABLED", 3: "PAUSED", 4: "REMOVED" };

async function main() {
  console.log(`\n=== IP exclusion sync ===`);
  console.log(`  Target IP:  ${TARGET_IP}`);
  console.log(`  Mode:       ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("");

  const campaigns = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);

  if (campaigns.length === 0) {
    console.log("(no active campaigns)");
    return;
  }

  let toCreate = 0;
  let alreadyExcluded = 0;

  for (const row of campaigns) {
    const c = row.campaign;
    const label = `${c.name} (id=${c.id}, ${STATUS[c.status] ?? c.status})`;

    // IP_BLOCK criterion type = 22.
    // We can filter by type name in GAQL.
    const existing = await customer.query(`
      SELECT campaign_criterion.criterion_id,
             campaign_criterion.ip_block.ip_address,
             campaign_criterion.negative,
             campaign_criterion.status
      FROM campaign_criterion
      WHERE campaign.id = ${c.id}
        AND campaign_criterion.type = 'IP_BLOCK'
        AND campaign_criterion.status != 'REMOVED'
    `);

    // Google normalizes a bare IPv4 to its /32 CIDR form, so the API
    // returns "179.164.127.61/32" even though we sent "179.164.127.61".
    // Compare on the bare-IP form to keep this script idempotent.
    const normalize = (ip) => String(ip || "").replace(/\/32$/, "");
    const have = new Set(
      existing
        .map((r) => normalize(r.campaign_criterion?.ip_block?.ip_address))
        .filter(Boolean),
    );

    if (have.has(normalize(TARGET_IP))) {
      console.log(`  ✓ ${label}`);
      console.log(`     already excludes ${TARGET_IP} (${have.size} total IPs)`);
      alreadyExcluded++;
      continue;
    }

    console.log(`  + ${label}`);
    console.log(
      `     would add ${TARGET_IP} (currently has ${have.size} excluded IPs)`,
    );
    toCreate++;

    if (APPLY) {
      try {
        const res = await customer.campaignCriteria.create([
          {
            campaign: `customers/${ROJI_CID}/campaigns/${c.id}`,
            negative: true,
            ip_block: { ip_address: TARGET_IP },
          },
        ]);
        console.log(`     ✓ created: ${res.results?.[0]?.resource_name ?? "ok"}`);
      } catch (e) {
        const errs = e?.errors ?? [{ message: e?.message ?? String(e) }];
        console.log(`     ✗ FAILED:`);
        for (const err of errs) {
          console.log(`        ${err.error_code ? JSON.stringify(err.error_code) + " " : ""}${err.message}`);
        }
      }
    }
  }

  console.log("");
  console.log(
    `Summary: ${campaigns.length} campaigns · ${alreadyExcluded} already had IP · ${toCreate} ${APPLY ? "applied" : "would change"}`,
  );
  if (!APPLY && toCreate > 0) {
    console.log(`Re-run with --apply to push.`);
  }
}

main().catch((e) => {
  const errs = e?.errors ?? [{ message: e?.message ?? String(e) }];
  console.error("\nFAILED:");
  for (const err of errs) {
    console.error(`  ${err.error_code ? JSON.stringify(err.error_code) + " " : ""}${err.message}`);
  }
  process.exit(1);
});
