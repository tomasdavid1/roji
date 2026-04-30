#!/usr/bin/env -S npx tsx
/**
 * CLI fallback for the blueprint provisioner. Same logic as the /api/ads/
 * blueprint/provision route, runnable from the terminal without booting
 * the dashboard.
 *
 *   npx tsx scripts/provision-blueprint.ts                     # dry-run, tool-only
 *   npx tsx scripts/provision-blueprint.ts --mode full          # dry-run full
 *   npx tsx scripts/provision-blueprint.ts --live               # actually provision
 *   npx tsx scripts/provision-blueprint.ts --mode full --live   # provision full
 *
 * Always writes a JSON report to scripts/.last-provision.json so you can
 * scroll through it after the fact.
 */

// IMPORTANT: this script must be invoked through `npm run blueprint:*`
// which sets up a `server-only` shim via the bootstrap. Running tsx on
// this file directly will fail because google-ads.ts imports the real
// `server-only` package (which Next intercepts in production but Node
// alone cannot).

import { promises as fs } from "fs";
import path from "path";

import {
  resolveBlueprint,
  type BlueprintMode,
  blueprintStats,
  validateBlueprint,
} from "../src/lib/ads-blueprint";
import { provisionBlueprint } from "../src/lib/ads-provisioner";

const VALID_MODES: BlueprintMode[] = ["tool-only", "full", "peptide-experiment"];

function parseArgs(argv: string[]) {
  let mode: BlueprintMode = "tool-only";
  let live = false;
  let campaign1Budget: number | undefined;
  let brandBudget: number | undefined;
  let peptideExperimentBudget: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode" && argv[i + 1]) {
      const m = argv[i + 1] as BlueprintMode;
      if (!VALID_MODES.includes(m)) {
        throw new Error(`--mode must be one of: ${VALID_MODES.join(", ")}`);
      }
      mode = m;
      i += 1;
    } else if (a === "--live") {
      live = true;
    } else if (a === "--budget" && argv[i + 1]) {
      campaign1Budget = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--brand-budget" && argv[i + 1]) {
      brandBudget = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--peptide-budget" && argv[i + 1]) {
      peptideExperimentBudget = Number(argv[i + 1]);
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(`Roji blueprint provisioner

Usage:
  provision-blueprint.ts [--mode <mode>] [--live] [--budget USD] [--brand-budget USD] [--peptide-budget USD]

Modes:
  tool-only            Campaign 1 / Ad Group 3 only (current live setup)
  full                 Campaign 1 (2 ad groups) + Brand Defense
  peptide-experiment   Campaign 2 only — DELIBERATE peptide-keyword test ($5/day cap)

Defaults:
  --mode tool-only
  dry-run              (use --live to actually create resources in Google Ads)`);
      process.exit(0);
    }
  }
  return { mode, live, campaign1Budget, brandBudget, peptideExperimentBudget };
}

async function main() {
  const { mode, live, campaign1Budget, brandBudget, peptideExperimentBudget } =
    parseArgs(process.argv.slice(2));

  const blueprint = resolveBlueprint({
    mode,
    campaign1Budget,
    brandBudget,
    peptideExperimentBudget,
  });

  console.log("\n— Roji blueprint provisioner —");
  console.log(`Mode:           ${mode}`);
  console.log(`Live:           ${live ? "YES" : "no (dry-run)"}`);
  console.log(`Tools URL:      ${blueprint.toolsUrl}`);
  console.log(`Store URL:      ${blueprint.storeUrl}`);

  const stats = blueprintStats(blueprint);
  console.log(`Will create:    ${stats.campaigns} campaign(s), ${stats.adGroups} ad group(s), ${stats.keywords} keyword(s), ${stats.ads} RSA(s), ${stats.negatives} negative(s)`);
  console.log(`Daily budget:   $${stats.totalDailyBudgetUsd.toFixed(2)}`);

  const issues = validateBlueprint(blueprint);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  if (errors.length > 0) {
    console.error("\nBlueprint failed safety validation:");
    for (const i of errors) {
      console.error(`  ✗ ${i.field}: "${i.text}" — ${i.reason}`);
    }
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.log(`Validation:     ✓ no errors · ${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.log(`  ⚠ ${w.adGroup ?? "?"} / ${w.field}: "${w.text}" — ${w.reason}`);
    }
  } else {
    console.log("Validation:     ✓ clean (no errors, no warnings)");
  }

  console.log("\nProvisioning...");
  const result = await provisionBlueprint(blueprint, { dryRun: !live });

  for (const c of result.campaigns) {
    console.log(`\n  ${c.reused ? "↺ Reused" : "✓ Created"} campaign: ${c.name}`);
    console.log(`    id=${c.campaign_id} budget=${c.budget_id}`);
    console.log(`    ${c.negatives_added} negative keyword(s) added`);
    for (const g of c.ad_groups) {
      console.log(`    ↳ ${g.name}: ${g.keywords_added} keywords, ${g.ads_created} ad(s)`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\n  ⚠ ${result.warnings.length} warning(s):`);
    for (const w of result.warnings) {
      console.log(`    • ${w}`);
    }
  }

  const reportPath = path.resolve(__dirname, ".last-provision.json");
  await fs.writeFile(reportPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`\nReport saved: ${reportPath}`);

  if (!live) {
    console.log(
      "\n(dry-run only — no resources were created. Re-run with --live to apply.)",
    );
  } else {
    console.log("\nAll campaigns are PAUSED. Review them in the Google Ads UI before enabling.");
  }
}

main().catch((err) => {
  console.error("\n✗ Provision failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
