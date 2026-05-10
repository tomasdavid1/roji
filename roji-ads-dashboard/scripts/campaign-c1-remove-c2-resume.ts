/**
 * One-shot ops script (2026-05-10):
 *   - REMOVE C1 ("Research Tools — Calculators") — irreversible.
 *   - RESUME C2 ("Peptide Research — Experiment") — sets to ENABLED.
 *
 * Rationale: C1 has spent ~$48 over the last 7 days at $5/day with
 * zero conversions. C2 is the strongest performer in the account
 * (18% CTR on `research peptide`) and is the campaign we're focusing
 * on. Tools site fixes (cart layout, GA4 events, paid-homepage redirect,
 * checkout reassurance) all just shipped — C2's funnel should be
 * cleaner now, so resume spend.
 *
 * Safety: dry-run by default. Requires --live to actually execute.
 *
 * Run:
 *   node --require ./scripts/_cli-bootstrap.cjs --import tsx ./scripts/campaign-c1-remove-c2-resume.ts          # dry-run
 *   node --require ./scripts/_cli-bootstrap.cjs --import tsx ./scripts/campaign-c1-remove-c2-resume.ts --live   # apply
 */

import { GoogleAdsApi, enums } from "google-ads-api";

const LIVE = process.argv.includes("--live");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
});

interface Row {
  campaign?: { id?: string | number; name?: string; status?: number | string };
}

async function findCampaignByNamePrefix(prefix: string): Promise<{
  id: string;
  name: string;
  status: string;
} | null> {
  const rows = (await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.name LIKE '${prefix}%'
      AND campaign.status != 'REMOVED'
    LIMIT 5
  `)) as Row[];
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw new Error(
      `Ambiguous prefix "${prefix}" — found ${rows.length} matching campaigns`,
    );
  }
  const c = rows[0]!.campaign!;
  const statusLabel =
    c.status === enums.CampaignStatus.ENABLED || c.status === "ENABLED"
      ? "ENABLED"
      : c.status === enums.CampaignStatus.PAUSED || c.status === "PAUSED"
        ? "PAUSED"
        : c.status === enums.CampaignStatus.REMOVED || c.status === "REMOVED"
          ? "REMOVED"
          : String(c.status);
  return { id: String(c.id), name: String(c.name), status: statusLabel };
}

async function main() {
  console.log(`\n=== ${LIVE ? "LIVE APPLY" : "DRY RUN"} — C1 remove + C2 resume ===\n`);

  const c1 = await findCampaignByNamePrefix("C1 — Research Tools");
  const c2 = await findCampaignByNamePrefix("C2 — Peptide Research");

  if (!c1) {
    console.log("  C1: not found (already removed?)");
  } else {
    console.log(`  C1: id=${c1.id}  status=${c1.status}  name=${c1.name}`);
  }
  if (!c2) {
    console.log("  C2: not found");
    process.exit(1);
  } else {
    console.log(`  C2: id=${c2.id}  status=${c2.status}  name=${c2.name}`);
  }

  console.log("");
  console.log("  Plan:");
  if (c1 && c1.status !== "REMOVED") {
    console.log(`    - REMOVE C1 (irreversible) — id=${c1.id}`);
  } else {
    console.log("    - C1 already removed, skipping");
  }
  if (c2.status === "ENABLED") {
    console.log("    - C2 already ENABLED, skipping");
  } else {
    console.log(`    - SET C2 status = ENABLED (id=${c2.id})`);
  }

  if (!LIVE) {
    console.log("\n  (dry-run; pass --live to apply)\n");
    return;
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");

  if (c1 && c1.status !== "REMOVED") {
    console.log(`\n  -> Removing C1 (id=${c1.id})...`);
    await customer.campaigns.remove([
      `customers/${customerId}/campaigns/${c1.id}`,
    ]);
    console.log("     done.");
  }

  if (c2.status !== "ENABLED") {
    console.log(`\n  -> Resuming C2 (id=${c2.id})...`);
    await customer.campaigns.update([
      {
        resource_name: `customers/${customerId}/campaigns/${c2.id}`,
        status: enums.CampaignStatus.ENABLED,
      },
    ]);
    console.log("     done.");
  }

  console.log("\n  Verifying final state...\n");
  const c1after = await findCampaignByNamePrefix("C1 — Research Tools");
  const c2after = await findCampaignByNamePrefix("C2 — Peptide Research");
  console.log(
    `  C1 after: ${c1after ? `${c1after.status} (still queryable)` : "not in active list ✓"}`,
  );
  console.log(`  C2 after: ${c2after ? c2after.status : "not found"}`);

  console.log("\n=== DONE ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
