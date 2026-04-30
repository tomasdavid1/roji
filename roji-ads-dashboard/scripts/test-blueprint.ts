/**
 * Local smoke test for the blueprint + safety + provisioner pipeline.
 *
 * Runs in-process (no Google Ads API calls, no network). Catches the
 * regressions that typecheck/lint/build can't:
 *
 *   - validateAdCopy returns the right shape (errors vs warnings vs alias)
 *   - validateBlueprint walks BOTH ad copy AND keywords
 *   - provisionBlueprint blocks on errors but NOT on warnings
 *     (regression: pre-fix it threw on any non-empty issues array,
 *      meaning a single "protocol" warning would brick the provisioner)
 *   - The shipped tool-only and full blueprints both produce zero errors
 *   - The default URLs match the Research Tools rewrite
 *   - Legacy protocolUrl option still resolves (back-compat)
 *
 * Run: npm run test:smoke
 *
 * Exit codes: 0 = all pass, 1 = any failure.
 */

import { provisionBlueprint } from "../src/lib/ads-provisioner";
import {
  resolveBlueprint,
  validateBlueprint,
  blueprintStats,
  type BlueprintMode,
} from "../src/lib/ads-blueprint";
import { validateAdCopy } from "../src/lib/safety";

let failed = 0;
let passed = 0;

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
  }
}

function eq<T>(label: string, actual: T, expected: T) {
  ok(
    label,
    actual === expected,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

console.log("\n— Blueprint smoke test —\n");

/* -------------------------------------------------------------------------- */
/* safety.ts                                                                   */
/* -------------------------------------------------------------------------- */

console.log("safety.validateAdCopy:");
{
  const r = validateAdCopy("Free recomp calculator");
  ok("clean text → ok=true", r.ok);
  eq("clean text → 0 errors", r.errors.length, 0);
  eq("clean text → 0 warnings", r.warnings.length, 0);
  ok("clean text → issues alias === errors", r.issues === r.errors);
}
{
  const r = validateAdCopy("Buy our peptides for healing");
  ok("hard error → ok=false", !r.ok);
  ok("hard error → at least 1 error", r.errors.length >= 1);
  ok(
    "hard error → flags 'peptide'",
    r.errors.some((e) => /peptide/i.test(e.match)),
  );
  ok(
    "hard error → flags 'healing'",
    r.errors.some((e) => /heal/i.test(e.match)),
  );
}
{
  const r = validateAdCopy("Free protocol builder for cycle planning");
  ok("warnings only → ok=true (warnings don't block)", r.ok);
  eq("warnings only → 0 errors", r.errors.length, 0);
  ok("warnings only → flags 'protocol'", r.warnings.some((w) => /protocol/i.test(w.match)));
  ok("warnings only → flags 'cycle'", r.warnings.some((w) => /cycle/i.test(w.match)));
}

/* -------------------------------------------------------------------------- */
/* ads-blueprint.ts                                                            */
/* -------------------------------------------------------------------------- */

console.log("\nads-blueprint.resolveBlueprint:");
for (const mode of ["tool-only", "full"] as BlueprintMode[]) {
  const b = resolveBlueprint({ mode });
  eq(`${mode}: toolsUrl defaults to tools.rojipeptides.com`, b.toolsUrl, "https://tools.rojipeptides.com");
  eq(`${mode}: storeUrl defaults to rojipeptides.com`, b.storeUrl, "https://rojipeptides.com");
  ok(`${mode}: protocolUrl alias mirrors toolsUrl`, b.protocolUrl === b.toolsUrl);
  ok(
    `${mode}: no campaign name contains 'Protocol'`,
    b.campaigns.every((c) => !/Protocol/i.test(c.name)),
  );
  for (const c of b.campaigns) {
    for (const g of c.adGroups) {
      ok(
        `${mode}: ${g.name} final URL is correct domain`,
        g.allowBrandTerms
          ? g.finalUrl.includes("rojipeptides.com") && !g.finalUrl.includes("tools.")
          : g.finalUrl === "https://tools.rojipeptides.com",
      );
    }
  }
}

console.log("\nads-blueprint.resolveBlueprint (back-compat):");
{
  const b = resolveBlueprint({
    mode: "tool-only",
    protocolUrl: "https://legacy.example.com",
  });
  eq("legacy protocolUrl still resolves", b.toolsUrl, "https://legacy.example.com");
  eq("protocolUrl alias mirrors", b.protocolUrl, "https://legacy.example.com");
}

console.log("\nads-blueprint.validateBlueprint (shipped blueprints):");
for (const mode of ["tool-only", "full", "peptide-experiment"] as BlueprintMode[]) {
  const issues = validateBlueprint(resolveBlueprint({ mode }));
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  eq(`${mode}: 0 errors in shipped blueprint`, errors.length, 0);
  eq(`${mode}: 0 warnings in shipped blueprint`, warnings.length, 0);
}

console.log("\nads-blueprint.peptide-experiment shape:");
{
  const b = resolveBlueprint({ mode: "peptide-experiment" });
  eq("peptide-experiment: 1 campaign", b.campaigns.length, 1);
  eq(
    "peptide-experiment: campaign name flags it as experimental",
    b.campaigns[0].name.includes("Experiment"),
    true,
  );
  eq("peptide-experiment: 1 ad group", b.campaigns[0].adGroups.length, 1);
  eq(
    "peptide-experiment: ad group opts into peptide bypass",
    b.campaigns[0].adGroups[0].allowPeptideExperiment,
    true,
  );
  eq(
    "peptide-experiment: $5/day cap by default",
    b.campaigns[0].dailyBudgetUsd,
    5,
  );
  eq(
    "peptide-experiment: 2 keywords (tight)",
    b.campaigns[0].adGroups[0].keywords.length,
    2,
  );
  ok(
    "peptide-experiment: every keyword references 'peptide' (intent)",
    b.campaigns[0].adGroups[0].keywords.every((k) => /peptide/i.test(k.text)),
  );
  ok(
    "peptide-experiment: every keyword is PHRASE match",
    b.campaigns[0].adGroups[0].keywords.every((k) => k.match === "PHRASE"),
  );
  ok(
    "peptide-experiment: 1 RSA only",
    b.campaigns[0].adGroups[0].ads.length === 1,
  );
  ok(
    "peptide-experiment: lands on tools.rojipeptides.com (not store)",
    b.campaigns[0].adGroups[0].finalUrl === "https://tools.rojipeptides.com",
  );
  // Critical safety guard: opt-in must NOT bypass compound names or
  // therapeutic claims. Re-add a forbidden term and confirm validator
  // still flags it even though allowPeptideExperiment is true.
  const tampered = resolveBlueprint({ mode: "peptide-experiment" });
  tampered.campaigns[0].adGroups[0].ads[0].headlines[0] = "BPC-157 Calculator";
  const tIssues = validateBlueprint(tampered);
  ok(
    "peptide-experiment: opt-in does NOT bypass compound names (BPC-157 still errors)",
    tIssues.some(
      (i) => i.severity === "error" && /bpc/i.test(i.text),
    ),
  );
  const tampered2 = resolveBlueprint({ mode: "peptide-experiment" });
  tampered2.campaigns[0].adGroups[0].ads[0].headlines[0] = "Healing With Peptides";
  const t2Issues = validateBlueprint(tampered2);
  ok(
    "peptide-experiment: opt-in does NOT bypass therapeutic claims ('healing' still errors)",
    t2Issues.some(
      (i) => i.severity === "error" && /heal/i.test(i.reason),
    ),
  );
}

console.log("\nads-blueprint.validateBlueprint (walks keywords):");
{
  // Simulate: someone slips a forbidden keyword past code review.
  const b = resolveBlueprint({ mode: "tool-only" });
  b.campaigns[0].adGroups[0].keywords.push({
    text: "buy bpc-157 cheap",
    match: "PHRASE",
    risk: "high",
  });
  const issues = validateBlueprint(b);
  ok(
    "compound-name keyword is flagged as ERROR (not just copy)",
    issues.some(
      (i) =>
        i.severity === "error" &&
        i.field.startsWith("keyword[") &&
        /bpc/i.test(i.text),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* ads-provisioner.ts (async — wrap in main())                                 */
/* -------------------------------------------------------------------------- */

async function provisionerSection() {
  console.log("\nads-provisioner.provisionBlueprint:");
  {
    // Clean blueprint → succeeds, no warnings surfaced.
    const b = resolveBlueprint({ mode: "tool-only" });
    try {
      const r = await provisionBlueprint(b, { dryRun: true });
      ok("clean blueprint dry-run succeeds", r.mode === "mock");
      eq("clean blueprint → 0 validation_issues", r.validation_issues.length, 0);
      ok("clean blueprint → 1 campaign created", r.campaigns.length === 1);
    } catch (err) {
      ok("clean blueprint dry-run succeeds", false, String(err));
    }
  }
  {
    // Warning-only blueprint → succeeds, warnings surface in result.warnings.
    // (Regression guard for the pre-fix bug where provisionBlueprint threw
    // on ANY non-empty issues array, including warning-only ones.)
    const b = resolveBlueprint({ mode: "tool-only" });
    b.campaigns[0].adGroups[0].keywords.push({
      text: "research protocol calculator",
      match: "PHRASE",
    });
    try {
      const r = await provisionBlueprint(b, { dryRun: true });
      ok("WARNING-only blueprint does NOT throw (regression)", r.mode === "mock");
      ok(
        "validation warning surfaced in result.warnings",
        r.warnings.some((w) => /protocol/i.test(w)),
      );
    } catch (err) {
      ok(
        "WARNING-only blueprint does NOT throw (regression)",
        false,
        String(err) + " ← THIS IS THE PRE-FIX BUG. provisionBlueprint must filter on severity='error'.",
      );
    }
  }
  {
    // Hard-error blueprint → throws.
    const b = resolveBlueprint({ mode: "tool-only" });
    b.campaigns[0].adGroups[0].ads[0].headlines[0] = "Buy our peptides today";
    let threw = false;
    try {
      await provisionBlueprint(b, { dryRun: true });
    } catch {
      threw = true;
    }
    ok("hard-error blueprint throws", threw);
  }
  {
    // peptide-experiment dry-run → succeeds (the allowPeptideExperiment
    // bypass on AG4 lets the word `peptide` through; everything else
    // still validates clean).
    const b = resolveBlueprint({ mode: "peptide-experiment" });
    try {
      const r = await provisionBlueprint(b, { dryRun: true });
      ok("peptide-experiment dry-run succeeds", r.mode === "mock");
      eq(
        "peptide-experiment dry-run → 0 validation_issues",
        r.validation_issues.length,
        0,
      );
      ok("peptide-experiment dry-run → 1 campaign", r.campaigns.length === 1);
    } catch (err) {
      ok("peptide-experiment dry-run succeeds", false, String(err));
    }
  }
}

/* -------------------------------------------------------------------------- */
/* blueprintStats sanity                                                       */
/* -------------------------------------------------------------------------- */

function statsSection() {
  console.log("\nblueprintStats:");
  {
    const s = blueprintStats(resolveBlueprint({ mode: "tool-only" }));
    eq("tool-only: 1 campaign", s.campaigns, 1);
    eq("tool-only: 1 ad group", s.adGroups, 1);
    eq("tool-only: 15 keywords", s.keywords, 15);
    eq("tool-only: 2 RSAs", s.ads, 2);
    eq("tool-only: 39 negatives", s.negatives, 39);
    eq("tool-only: $14.29/day ($100/week slow-start)", s.totalDailyBudgetUsd, 14.29);
  }
  {
    const s = blueprintStats(resolveBlueprint({ mode: "full" }));
    eq("full: 2 campaigns", s.campaigns, 2);
    eq("full: 3 ad groups", s.adGroups, 3);
    eq("full: 37 keywords", s.keywords, 37);
    eq("full: 6 RSAs", s.ads, 6);
    eq("full: $47/day", s.totalDailyBudgetUsd, 47);
  }
  {
    const s = blueprintStats(resolveBlueprint({ mode: "peptide-experiment" }));
    eq("peptide-experiment: 1 campaign", s.campaigns, 1);
    eq("peptide-experiment: 1 ad group", s.adGroups, 1);
    eq("peptide-experiment: 2 keywords", s.keywords, 2);
    eq("peptide-experiment: 1 RSA", s.ads, 1);
    eq("peptide-experiment: $5/day cap", s.totalDailyBudgetUsd, 5);
  }
}

/* -------------------------------------------------------------------------- */

provisionerSection()
  .then(() => statsSection())
  .then(() => {
    console.log(`\n${passed} passed · ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("\nUNCAUGHT:", err);
    process.exit(1);
  });
