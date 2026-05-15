/**
 * fix-campaign-geo-presence-only.js
 *
 * Flips C2 (and any other live campaign in the account) from
 * `positive_geo_target_type: PRESENCE_OR_INTEREST` (the leak) to
 * `PRESENCE` (presence-only), so we stop paying for clicks from
 * users in LatAm / Asia / EU who are merely *interested* in
 * US-targeted peptide research content.
 *
 * Background: the original blueprint was supposed to set this at
 * creation time, but a fallback bug in ads-provisioner.ts used the
 * wrong enum value (5 instead of 7), and 5 in the SDK happens to be
 * PRESENCE_OR_INTEREST. Result: C2 has been leaking for ~2 weeks.
 *
 * Idempotent: running it after the fix is a no-op.
 *
 * Usage:
 *   node ./scripts/fix-campaign-geo-presence-only.js          # dry-run
 *   node ./scripts/fix-campaign-geo-presence-only.js --apply  # write
 */

require("./_cli-bootstrap.cjs");
const { GoogleAdsApi, enums } = require("google-ads-api");

const APPLY = process.argv.includes("--apply");

const POSITIVE_PRESENCE = enums.PositiveGeoTargetType?.PRESENCE ?? 7;
const NEGATIVE_PRESENCE = enums.NegativeGeoTargetType?.PRESENCE ?? 5;
const POSITIVE_LEAK = enums.PositiveGeoTargetType?.PRESENCE_OR_INTEREST ?? 5;

const enumName = (typeMap, val) => typeMap[val] ?? `?(${val})`;

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  });

  console.log(`\n${APPLY ? "APPLYING" : "DRY-RUN"} — flip campaigns to PRESENCE-only geo targeting\n`);

  const campaigns = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.geo_target_type_setting.positive_geo_target_type,
           campaign.geo_target_type_setting.negative_geo_target_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `);

  const updates = [];
  for (const row of campaigns) {
    const c = row.campaign;
    const setting = c.geo_target_type_setting ?? {};
    const positive = Number(setting.positive_geo_target_type);
    const negative = Number(setting.negative_geo_target_type);

    const positiveOk = positive === POSITIVE_PRESENCE;
    const negativeOk = negative === NEGATIVE_PRESENCE;

    console.log(
      `[${c.status === enums.CampaignStatus.ENABLED ? "ENABLED" : "PAUSED "}] ${c.name}`,
    );
    console.log(
      `  positive: ${enumName(enums.PositiveGeoTargetType, positive)} (${positive}) ${positiveOk ? "OK" : "→ PRESENCE"}`,
    );
    console.log(
      `  negative: ${enumName(enums.NegativeGeoTargetType, negative)} (${negative}) ${negativeOk ? "OK" : "→ PRESENCE"}`,
    );

    if (positiveOk && negativeOk) {
      console.log("  (already correct, no update)\n");
      continue;
    }

    updates.push({
      resource_name: `customers/${process.env.GOOGLE_ADS_CUSTOMER_ID}/campaigns/${c.id}`,
      geo_target_type_setting: {
        positive_geo_target_type: POSITIVE_PRESENCE,
        negative_geo_target_type: NEGATIVE_PRESENCE,
      },
    });
    console.log(`  WILL UPDATE\n`);
  }

  if (updates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (!APPLY) {
    console.log(`\n${updates.length} campaign(s) to update. Re-run with --apply to commit.`);
    return;
  }

  const result = await customer.campaigns.update(updates);
  console.log(`\nApplied. Mutated resource names:`);
  for (const r of result.results ?? []) {
    console.log(`  ${r.resource_name}`);
  }
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  if (e?.errors) console.error(JSON.stringify(e.errors, null, 2));
  process.exit(1);
});
