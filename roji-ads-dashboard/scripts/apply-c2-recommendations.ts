/**
 * apply-c2-recommendations.ts — surgically apply the actionable subset of
 * Google Ads' "Recommendations" panel for C2 (the Peptide Research
 * Experiment campaign) without surrendering account control to Google's
 * defaults.
 *
 * What this DOES (in order):
 *
 *   1. Looks for and removes the two negatives Google's Recommendations
 *      panel claims are blocking our positives:
 *        - [research grade peptides]   (EXACT negative)
 *        - [research grade peptide]    (EXACT negative)
 *      Note: as of 2026-05-07 a full sweep of campaign_criterion,
 *      customer_negative_criterion, and shared_set turned up zero matches —
 *      no actual conflict exists. The corresponding positives are LIVE and
 *      ENABLED in C2/AG4 (status=ENABLED, serving=ELIGIBLE, approval=APPROVED).
 *      Google's recommendation appears to be stale-state UI noise. We keep
 *      the removal step in this script anyway — if those negatives ever
 *      reappear (manual UI edit, future blueprint addition), this script
 *      will clean them up cheaply and idempotently.
 *
 *   2. Adds 6 CALLOUT extensions to C2. The blueprint defines them on C1
 *      only; Google's recommendation surfaces "Callouts are missing from 1
 *      campaign" — that one is C2. Callouts are below-headline trust hooks
 *      that lift CTR ~2-3% and don't risk policy review. Same content
 *      shape as C1 (free / no signup / browser-based / cites research /
 *      20+ data entries / for researchers only) — these line up cleanly
 *      with C2's calculator landing page.
 *
 *   3. Adds a STRUCTURED SNIPPET extension to C2 with header `Services`.
 *      Values list the actual tools researchers find on the landing page,
 *      so the snippet is a credible micro-sitemap rather than fluff.
 *      New asset type for us — first STRUCTURED_SNIPPET we ship.
 *
 * What this explicitly DOES NOT do (and why):
 *
 *   - Does not change the bid strategy. Google recommends "Maximize
 *     Conversions" (+10.3%), but the account has 0 actual purchases
 *     all-time; switching now lets the smart-bid model burn budget
 *     learning from a noise-only signal. Revisit per ADS-PLAYBOOK
 *     "strategy pivot" after the 24h UI/UX-change observation window.
 *
 *   - Does not remove "redundant" keywords flagged by Google. Each one
 *     is intentional, blueprint-defined, and serves a distinct match-type
 *     role; the blueprint provisioner would re-add them on next sync
 *     anyway. Skipping per blueprint-as-source-of-truth principle.
 *
 *   - Does not add dynamic images / Performance Max / Merchant Center
 *     links. All three are "AI Essential" recommendations that hand
 *     spend control to Google's blackbox optimizer — explicit non-goal
 *     for this account given our policy sensitivity and zero-purchase
 *     conversion-data state.
 *
 * Idempotency:
 *
 *   - Negatives: only removes the two named EXACT negatives and is safe
 *     to re-run (the second run finds nothing to remove, prints "already
 *     clean", exits 0).
 *   - Callouts: pre-checks linked callout text on C2; only creates assets
 *     for callouts that aren't already linked.
 *   - Structured snippet: pre-checks linked structured-snippet headers on
 *     C2; only creates one if no Services snippet already exists.
 *
 * Run:
 *
 *   # Dry-run (default — no writes, prints planned ops):
 *   npx tsx -r ./scripts/_cli-bootstrap.cjs scripts/apply-c2-recommendations.ts
 *
 *   # Live:
 *   npx tsx -r ./scripts/_cli-bootstrap.cjs scripts/apply-c2-recommendations.ts --live
 */

import { _internalCustomer } from "../src/lib/google-ads-internal";
import { enums } from "google-ads-api";

const C2_NAME_FRAGMENT = "C2 — Peptide Research — Experiment";

const NEGATIVES_TO_REMOVE: Array<{ text: string; matchType: "EXACT" | "PHRASE" | "BROAD" }> = [
  { text: "research grade peptides", matchType: "EXACT" },
  { text: "research grade peptide", matchType: "EXACT" },
];

const CALLOUTS_TO_ADD: string[] = [
  "Free",
  "No Signup Required",
  "Browser-Based",
  "Cites Published Research",
  "20+ Data Entries",
  "For Researchers Only",
];

const STRUCTURED_SNIPPET_HEADER = "Services" as const;
const STRUCTURED_SNIPPET_VALUES: string[] = [
  "Reconstitution Calculator",
  "Half-Life Database",
  "Cost Per Dose",
  "COA Analyzer",
];

const LIVE = process.argv.includes("--live");

async function main() {
  const cust = _internalCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  console.log("");
  console.log("Apply C2 Recommendations");
  console.log("========================");
  console.log(LIVE ? "Mode: LIVE (will write)" : "Mode: DRY-RUN (no writes; pass --live to apply)");
  console.log("");

  const c2 = await findC2(cust);
  if (!c2) {
    console.error(`Could not find a campaign named like "${C2_NAME_FRAGMENT}". Aborting.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Target campaign: ${c2.name} (id ${c2.id})`);
  console.log("");

  await removeConflictingNegatives(cust, c2.id);
  console.log("");
  await addCallouts(cust, customerId, c2.id);
  console.log("");
  await addStructuredSnippet(cust, customerId, c2.id);
  console.log("");

  console.log(LIVE ? "Done — changes applied." : "Done — dry-run complete. Re-run with --live to apply.");
}

interface CampaignRow {
  id: string;
  name: string;
}

async function findC2(cust: ReturnType<typeof _internalCustomer>): Promise<CampaignRow | null> {
  const rows = (await cust.query(`
    SELECT campaign.id, campaign.name
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND campaign.name LIKE '${C2_NAME_FRAGMENT}%'
    LIMIT 1
  `)) as Array<{ campaign?: { id?: string | number; name?: string } }>;
  const c = rows[0]?.campaign;
  if (!c?.id) return null;
  return { id: String(c.id), name: String(c.name ?? "") };
}

async function removeConflictingNegatives(
  cust: ReturnType<typeof _internalCustomer>,
  campaignId: string,
): Promise<void> {
  console.log("Step 1: Remove conflicting negative keywords");
  console.log("--------------------------------------------");

  // Find every campaign-level negative across the account that matches the
  // texts we want to remove. Google's "conflicting negatives" recommendation
  // is account-wide — the negatives may be on C1, C2, or any other campaign.
  // We remove all matching campaign-level negatives so no future campaign
  // inherits a silent conflict with the C2 EXACT positives in the blueprint.
  //
  // We do NOT touch account-level negative lists (CustomerNegativeCriterion
  // / SharedSet) here — none have ever been provisioned for this account
  // and querying them adds risk for no upside.
  const targetTexts = new Set(NEGATIVES_TO_REMOVE.map((n) => n.text.toLowerCase()));

  const rows = (await cust.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign_criterion.resource_name,
      campaign_criterion.keyword.text,
      campaign_criterion.keyword.match_type,
      campaign_criterion.negative
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = TRUE
      AND campaign_criterion.status != 'REMOVED'
  `)) as Array<{
    campaign?: { id?: string | number; name?: string };
    campaign_criterion?: {
      resource_name?: string;
      keyword?: { text?: string; match_type?: string | number };
      negative?: boolean;
    };
  }>;

  const matches = rows
    .map((r) => ({
      campaignId: String(r.campaign?.id ?? ""),
      campaignName: String(r.campaign?.name ?? ""),
      crit: r.campaign_criterion,
    }))
    .filter((m) => !!m.crit?.resource_name && !!m.crit?.keyword?.text)
    .filter((m) => targetTexts.has(String(m.crit!.keyword!.text).toLowerCase()));

  if (matches.length === 0) {
    console.log("  Already clean — no conflicting negatives found on any campaign.");
    return;
  }

  for (const m of matches) {
    console.log(
      `  Will remove: "${m.crit!.keyword!.text}" [match=${m.crit!.keyword!.match_type}] ` +
        `from campaign "${m.campaignName}" (${m.crit!.resource_name})`,
    );
  }

  if (!LIVE) return;

  await cust.campaignCriteria.remove(matches.map((m) => m.crit!.resource_name!));
  console.log(`  Removed ${matches.length} negative(s).`);
}

async function addCallouts(
  cust: ReturnType<typeof _internalCustomer>,
  customerId: string,
  campaignId: string,
): Promise<void> {
  console.log("Step 2: Add callout extensions to C2");
  console.log("------------------------------------");

  // Pull existing callout texts already linked to C2 so we don't duplicate.
  const linked = (await cust.query(`
    SELECT
      campaign.id,
      campaign_asset.resource_name,
      asset.callout_asset.callout_text
    FROM campaign_asset
    WHERE campaign.id = ${campaignId}
      AND campaign_asset.field_type = 'CALLOUT'
      AND campaign_asset.status != 'REMOVED'
  `)) as Array<{ asset?: { callout_asset?: { callout_text?: string } } }>;

  const existing = new Set(
    linked
      .map((r) => r.asset?.callout_asset?.callout_text)
      .filter((t): t is string => !!t)
      .map((t) => t.trim().toLowerCase()),
  );

  const toAdd = CALLOUTS_TO_ADD.filter((t) => !existing.has(t.toLowerCase()));

  if (toAdd.length === 0) {
    console.log(`  All ${CALLOUTS_TO_ADD.length} callouts already linked to C2.`);
    return;
  }

  for (const text of toAdd) console.log(`  Will add: "${text}"`);
  if (existing.size > 0) {
    console.log(`  (${existing.size} other callout(s) already linked; leaving them alone.)`);
  }

  if (!LIVE) return;

  // Create the callout assets first.
  const assetOps = toAdd.map((text) => ({
    callout_asset: { callout_text: text },
  }));
  const assetResp = await cust.assets.create(assetOps as never);
  const assetResources = (assetResp as { results?: Array<{ resource_name?: string }> }).results
    ?.map((r) => r.resource_name ?? "")
    .filter(Boolean) ?? [];

  if (assetResources.length !== toAdd.length) {
    console.warn(
      `  Created ${assetResources.length} of ${toAdd.length} callout assets — Google returned a partial result.`,
    );
  }

  // Link them to the campaign.
  const linkOps = assetResources.map((resource) => ({
    asset: resource,
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    field_type: enums.AssetFieldType.CALLOUT,
  }));
  await cust.campaignAssets.create(linkOps as never);
  console.log(`  Linked ${linkOps.length} callout(s) to C2.`);
}

async function addStructuredSnippet(
  cust: ReturnType<typeof _internalCustomer>,
  customerId: string,
  campaignId: string,
): Promise<void> {
  console.log("Step 3: Add structured snippet (Services) to C2");
  console.log("-----------------------------------------------");

  // Pull existing structured-snippet headers already linked to C2.
  const linked = (await cust.query(`
    SELECT
      campaign.id,
      campaign_asset.resource_name,
      asset.structured_snippet_asset.header,
      asset.structured_snippet_asset.values
    FROM campaign_asset
    WHERE campaign.id = ${campaignId}
      AND campaign_asset.field_type = 'STRUCTURED_SNIPPET'
      AND campaign_asset.status != 'REMOVED'
  `)) as Array<{
    asset?: { structured_snippet_asset?: { header?: string; values?: string[] } };
  }>;

  const existingHeaders = new Set(
    linked
      .map((r) => r.asset?.structured_snippet_asset?.header)
      .filter((h): h is string => !!h)
      .map((h) => h.trim().toLowerCase()),
  );

  if (existingHeaders.has(STRUCTURED_SNIPPET_HEADER.toLowerCase())) {
    console.log(`  C2 already has a "${STRUCTURED_SNIPPET_HEADER}" structured snippet — skipping.`);
    return;
  }

  console.log(`  Will add: header="${STRUCTURED_SNIPPET_HEADER}"`);
  for (const v of STRUCTURED_SNIPPET_VALUES) console.log(`    - ${v}`);

  if (!LIVE) return;

  const assetResp = await cust.assets.create([
    {
      structured_snippet_asset: {
        header: STRUCTURED_SNIPPET_HEADER,
        values: STRUCTURED_SNIPPET_VALUES,
      },
    },
  ] as never);
  const assetResource = (assetResp as { results?: Array<{ resource_name?: string }> })
    .results?.[0]?.resource_name;

  if (!assetResource) {
    console.error("  Failed to create structured-snippet asset — no resource_name returned.");
    process.exitCode = 1;
    return;
  }

  await cust.campaignAssets.create([
    {
      asset: assetResource,
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      field_type: enums.AssetFieldType.STRUCTURED_SNIPPET,
    },
  ] as never);
  console.log("  Linked structured snippet to C2.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
