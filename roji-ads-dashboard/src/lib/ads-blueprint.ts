/**
 * Roji Google Ads campaign blueprint.
 *
 * Codifies the launch strategy into a typed, validated structure. The
 * provisioner (`createBlueprintCampaign`) walks this tree to create real
 * Google Ads entities — or in mock mode, a deterministic plan you can
 * eyeball before spending a dollar.
 *
 * Compliance framing (2026 rewrite):
 *   The customer-facing surface is **Research Tools** at
 *   `tools.rojipeptides.com`. The word "protocol" has been removed from
 *   ad copy, keywords, and campaign names because:
 *     1. Our own deploy gate (`roji-store/deploy/assert-compliance.sh`)
 *        forbids "Protocol Engine" framing on the store.
 *     2. "Peptide protocol calculator" patterns trigger Google Ads policy
 *        review at much higher rates than neutral "research calculator"
 *        framing.
 *   Use "calculator", "tool", "framework", "planner" instead.
 *
 * Two modes:
 *   - "tool-only": Campaign 1, Ad Group 3 only (Biohacker intent, no
 *     compound names). Single RSA. Full negative-keyword list.
 *
 *   - "full": Campaign 1 (2 ad groups, 3 RSAs, full keyword expansion)
 *     plus Campaign 3 (Brand Defense). Compound-specific Ad Group 2 from
 *     the original strategy doc is intentionally excluded by default —
 *     add it manually after Ad Group 1 has been clean for a week.
 *
 * Anything sourced from here passes through `safety.ts` before mutation
 * so we cannot accidentally ship a forbidden compound name. Both ad copy
 * AND keywords are walked.
 */

import { DEFAULT_STORE_URL, DEFAULT_TOOLS_URL } from "./env";
import { validateAdCopy } from "./safety";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type BlueprintMode = "tool-only" | "full" | "peptide-experiment";

export type KeywordMatchType = "EXACT" | "PHRASE" | "BROAD";

export interface BlueprintKeyword {
  text: string;
  match: KeywordMatchType;
  /** Annotate keywords we know carry policy risk so the UI can warn. */
  risk?: "low" | "moderate" | "high";
}

export interface BlueprintRSA {
  /** Up to 15. */
  headlines: string[];
  /** Up to 4. */
  descriptions: string[];
  /** Display path segments (max 15 chars each). */
  path1?: string;
  path2?: string;
}

export interface BlueprintAdGroup {
  name: string;
  cpcBidCeilingUsd: number;
  keywords: BlueprintKeyword[];
  ads: BlueprintRSA[];
  finalUrl: string;
  /** Optional ad-group-specific notes shown in the dry-run summary. */
  notes?: string;
  /** When true, the safety validator ignores brand-name matches like
   *  "Roji Peptides". Use only on Brand Defense ad groups where the
   *  brand name is the legitimate, intended subject. */
  allowBrandTerms?: boolean;
  /** When true, the safety validator ignores the standalone `peptide`
   *  pattern for THIS ad group only — used by the deliberate
   *  "peptide-experiment" mode to test whether Google approves
   *  research-framed ads using the word `peptide`. Compound names
   *  (BPC-157, TB-500, etc.) and therapeutic claims still flag.
   *  Worst case: the ad group / its parent campaign is disapproved
   *  and we pause it. Bounded experiment, scoped per ad group. */
  allowPeptideExperiment?: boolean;
}

export interface BlueprintCampaign {
  /** Display name in Google Ads. We append `[roji-blueprint]` so we can
   *  detect prior runs and stay idempotent. */
  name: string;
  /** Daily budget in USD. */
  dailyBudgetUsd: number;
  /** Search-network only. We never enable Display from this provisioner. */
  channel: "SEARCH";
  /** Common to every campaign in this account: US-only, English. */
  language: "en";
  geoTargets: ["US"];
  adGroups: BlueprintAdGroup[];
  /** Campaign-level negative keywords. The big policy-protection list. */
  negativeKeywords: string[];
  /** Initial bid strategy. We start with MAX_CLICKS for data collection. */
  bidStrategy: "MAXIMIZE_CLICKS" | "MAXIMIZE_CONVERSIONS" | "TARGET_IMPRESSION_SHARE";
  /** Notes shown at the top of the dry-run summary. */
  rationale: string;
}

export interface ResolvedBlueprint {
  mode: BlueprintMode;
  /** Final URL for tool/calculator-intent ad groups. */
  toolsUrl: string;
  /** Final URL for the storefront (brand-defense ad group). */
  storeUrl: string;
  /**
   * Legacy alias kept for back-compat with the BlueprintCard UI and any
   * external callers that still read `protocolUrl`. Mirrors `toolsUrl`.
   * @deprecated Use `toolsUrl`.
   */
  protocolUrl: string;
  campaigns: BlueprintCampaign[];
}

/* -------------------------------------------------------------------------- */
/* Constants pulled straight from the strategy doc                             */
/* -------------------------------------------------------------------------- */

/**
 * Negative keywords from the strategy doc. Applied at campaign level so
 * every ad group inherits them. These exist to keep ads from showing on
 * commerce-intent searches that would (a) flag the policy review and
 * (b) pull traffic that won't convert through the research tools.
 */
export const POLICY_NEGATIVE_KEYWORDS: string[] = [
  "buy",
  "purchase",
  "order",
  "cheap",
  "discount",
  "coupon",
  "for sale",
  "price",
  "cost",
  "shop",
  "store",
  "pharmacy",
  "prescription",
  "doctor",
  "clinic",
  "inject",
  "injection",
  "syringe",
  "human use",
  "fda approved",
  "weight loss",
  "semaglutide",
  "ozempic",
  "wegovy",
  "tirzepatide",
  "steroid",
  "testosterone",
  "hgh",
  "growth hormone",
  "illegal",
  "side effects",
  "safe",
  "dangerous",
  "drug",
  "medicine",
  "treatment",
  "therapy",
  "cure",
  "heal",
];

/* -------------------------------------------------------------------------- */
/* Ad copy & keyword catalog                                                   */
/* -------------------------------------------------------------------------- */

/** Ad Group 3 — Biohacker / Optimization Intent (safest, no compound names). */
function biohackerAdGroup(finalUrl: string): BlueprintAdGroup {
  return {
    name: "AG3 — Biohacker Intent",
    cpcBidCeilingUsd: 3.0,
    finalUrl,
    notes:
      "Lowest policy risk. No compound names, no 'protocol' framing. " +
      "Lands on Roji Research Tools. Always launch this first.",
    keywords: [
      "biohacking tools",
      "biohacking calculator",
      "body optimization tools",
      "performance optimization tools",
      "recovery optimization calculator",
      "biohacker calculator",
      "body recomposition calculator",
      "advanced recovery planner",
      "performance research tools",
      "optimization framework builder",
      "biohacking stack builder",
      "recovery stack calculator",
      "lean mass research planner",
      "body composition calculator",
      "fitness research tools",
    ].map((text) => ({ text, match: "PHRASE" as KeywordMatchType, risk: "low" as const })),
    ads: [
      // RSA #1 — "biohacker community / evidence-based" angle.
      // Tone: belonging, scientific credibility.
      {
        headlines: [
          "Biohacker Research Tools",
          "Optimize With Data",
          "Performance Frameworks",
          "Free Optimization Tool",
          "Body Recomp Calculator",
          "Personalized Frameworks",
          "Research Tools — Free",
          "Smart Research Suite",
          "Built For Researchers",
          "60-Second Frameworks",
          "Evidence-Based Tools",
          "Calibrated Frameworks",
          "Roji Research Tools",
          "Data-Driven Precision",
          "Start Building — Free",
        ],
        descriptions: [
          "Free research tools built for biohackers. Input your stats, get a personalized framework.",
          "Skip the spreadsheets. Roji generates evidence-based frameworks in 60 seconds.",
          "Used by 500+ biohackers to plan recomp, recovery, and performance. Free, referenced, fast.",
          "Stop guessing recovery windows and recomp math. Calculate it. Free tools, no signup.",
        ],
      },
      // RSA #2 — "productivity / replace spreadsheets" angle.
      // Tone: practical, time-saving, anti-spreadsheet. Distinct narrative
      // so Google's RSA optimizer can A/B against RSA #1 on a fundamentally
      // different value prop.
      {
        headlines: [
          "Stop Spreadsheet Hell",
          "Replace Your Spreadsheet",
          "60-Second Research Math",
          "Calculate, Don't Guess",
          "Free Optimization Math",
          "Skip The Spreadsheet",
          "Roji Research Tools",
          "Built For Researchers",
          "Personalized In 60s",
          "Free Calculator Suite",
          "Smart Math Tools",
          "Calibrated, Not Guessed",
          "Stats To Framework Fast",
          "Recomp Math Made Easy",
          "Tools That Just Work",
        ],
        descriptions: [
          "Replace your messy spreadsheets with calibrated calculators. Browser-based. Free.",
          "Input your stats and goals. Roji handles the math. Done in under 60 seconds.",
          "What used to take 2 hours of forum-hunting now takes 60 seconds. All referenced.",
          "Built by researchers tired of bad spreadsheets. Free, referenced, no account needed.",
        ],
      },
    ],
  };
}

/**
 * Ad Group 1 — Calculator / Framework Intent (core, low-moderate risk).
 *
 * Replaces the original "Protocol Intent" group from the legacy strategy
 * doc. Same intent (researchers looking for a calculator), neutral copy.
 */
function calculatorIntentAdGroup(finalUrl: string): BlueprintAdGroup {
  return {
    name: "AG1 — Research Calculator Intent",
    cpcBidCeilingUsd: 3.5,
    finalUrl,
    notes:
      "Core ad group. Neutral 'research calculator' framing. No 'protocol' " +
      "or compound-name keywords. Monitor first 48h regardless.",
    keywords: [
      { text: "research calculator", match: "PHRASE", risk: "low" },
      { text: "research framework builder", match: "PHRASE", risk: "low" },
      { text: "research planner tool", match: "PHRASE", risk: "low" },
      { text: "research stack calculator", match: "PHRASE", risk: "low" },
      { text: "compound research calculator", match: "PHRASE", risk: "low" },
      { text: "research planning tool", match: "PHRASE", risk: "low" },
      { text: "research stack builder", match: "PHRASE", risk: "low" },
      { text: "biotech research tool", match: "PHRASE", risk: "low" },
      { text: "research framework generator", match: "PHRASE", risk: "low" },
      { text: "biohacking calculator", match: "PHRASE", risk: "low" },
      { text: "biohacking framework builder", match: "PHRASE", risk: "low" },
      { text: "body optimization calculator", match: "PHRASE", risk: "low" },
      { text: "performance framework builder", match: "PHRASE", risk: "low" },
      { text: "recovery research calculator", match: "PHRASE", risk: "low" },
      { text: "research compound stack builder", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Free Research Calculator",
          "Build Your Research Plan",
          "Evidence-Based Frameworks",
          "Personalized In 60 Seconds",
          "Free Research Framework",
          "Research Calculator — Free",
          "Research Framework Builder",
          "Custom Research Frameworks",
          "Data-Driven Frameworks",
          "Input Stats, Get Framework",
          "Free Research Suite",
          "Science-Based Frameworks",
          "Roji Research Tools",
          "Calibrated Research Tools",
          "Start Building — Free",
        ],
        descriptions: [
          "Free research calculator. Input parameters, get a calibrated framework in 60 seconds.",
          "Every output cites the published literature it's built on. No account, no email gate.",
          "Built by researchers, for researchers. Personalized frameworks, not generic templates.",
          "Trusted by 500+ in the research community. Save hours of spreadsheet math. Try it free.",
        ],
      },
      {
        headlines: [
          "Roji Research Tools",
          "Get A Framework In 60s",
          "Free Compound Calculator",
          "Evidence-Based Frameworks",
          "Calibrate Your Research",
          "Research Tool — Free",
          "Personalized Frameworks",
          "Research Stack Calculator",
          "Built For Researchers",
          "Data-Driven Precision",
          "Published References",
          "Compound Research Tool",
          "No Account Required",
          "Advanced Research Suite",
          "Smart Research Tools",
        ],
        descriptions: [
          "Free framework calculator. Input your goals, get a calibrated phase-by-phase plan.",
          "Every framework is referenced to published research. For serious researchers, not bros.",
          "Personalized output, not a one-size-fits-all template. 60 seconds from input to framework.",
          "Replace your messy spreadsheets with one calibrated tool. Free, browser-based, no account.",
        ],
      },
      {
        headlines: [
          "Smart Research Calculator",
          "Research Framework Tool",
          "Compound Framework Maker",
          "Personalized Frameworks",
          "Free Research Suite",
          "60-Second Frameworks",
          "Built On Published Data",
          "Advanced Calculators",
          "Custom Stack Frameworks",
          "Research Made Precise",
          "Framework Generator",
          "Roji Research Suite",
          "Framework Builder Free",
          "Evidence-Based Stacks",
          "No Guesswork Needed",
        ],
        descriptions: [
          "Generate a custom research framework in 60 seconds. Personalized, fully referenced.",
          "Tell Roji your goals and parameters. We pick the right phase structure and timing for you.",
          "Over 1,000 frameworks generated by the research community. Free, referenced, no account.",
          "Why guess when you can calculate? Roji turns published research into precise frameworks.",
        ],
      },
    ],
  };
}

/**
 * Ad Group 4 — Peptide Research Intent (DELIBERATE EXPERIMENT).
 *
 * The word `peptide` is on our `safety.ts` FORBIDDEN list because it's
 * the highest-risk policy trigger in this niche. We're nonetheless
 * shipping ONE small phrase-match ad group on a SEPARATE low-budget
 * campaign so we can answer the question: "Does Google's automated
 * review approve research-framed ads that contain the word `peptide`?"
 *
 * Risk profile:
 *   - Worst case: the ad group / campaign is disapproved. We pause it.
 *     C1 (AG3) keeps running, conversion infra keeps tracking, account
 *     stays clean. **Compound NAMES are what trip account-level strikes
 *     — not the standalone word "peptide".**
 *   - Best case: ads approve, we get real-intent traffic with much
 *     higher conversion potential than AG3 and a real CAC number.
 *
 * Constraints kept tight on purpose:
 *   - 2 phrase-match keywords only (no broad). Tight intent.
 *   - $5/day campaign budget. Bounded spend even on a runaway week.
 *   - Lower CPC ceiling than AG3 ($2 vs $3) — we don't want to
 *     over-bid into uncertain territory before we know the ads serve.
 *   - Single RSA. Less surface area for review issues.
 *   - Final URL: tools.rojipeptides.com (NOT the store) — landing on
 *     a tool reduces "Unapproved Pharmaceuticals" classifier risk
 *     vs. a store product page.
 *   - `allowPeptideExperiment: true` opts THIS ad group out of the
 *     standalone-`peptide` safety check. Compound names + therapeutic
 *     claims are still hard errors.
 *
 * Pause criteria (for future-me):
 *   - Disapproved by Google → pause campaign, log the reason in
 *     ADS-PLAYBOOK.md, never re-enable without copy changes.
 *   - >100 clicks with 0 conversions over 7 days → also pause,
 *     refund the experiment, conclude "intent ≠ buy here" for now.
 */
function peptideExperimentAdGroup(finalUrl: string): BlueprintAdGroup {
  return {
    name: "AG4 — Peptide Research Intent (experiment)",
    cpcBidCeilingUsd: 2.0,
    finalUrl,
    allowPeptideExperiment: true,
    notes:
      "DELIBERATE POLICY EXPERIMENT. Tests whether research-framed ads " +
      "containing the word `peptide` clear Google's automated review. " +
      "Bounded: $5/day campaign budget, 2 phrase-match keywords, single " +
      "RSA, lands on Research Tools (not store). Pause if disapproved.",
    keywords: [
      { text: "peptide research calculator", match: "PHRASE", risk: "high" },
      { text: "peptide research tools", match: "PHRASE", risk: "high" },
    ],
    ads: [
      {
        // RSA — neutral research framing. No compound names, no
        // therapeutic claims, no "buy", no "dosing". Mirrors the AG3
        // structural patterns the existing approved RSA uses, just
        // with the word `peptide` swapped in where natural.
        headlines: [
          "Peptide Research Tools",
          "Free Research Calculator",
          "Built For Researchers",
          "Research Framework Builder",
          "Peptide Research Suite",
          "Evidence-Based Tools",
          "Roji Research Tools",
          "Peptide Research Math",
          "60-Second Frameworks",
          "Calibrated Calculators",
          "Personalized Frameworks",
          "Free Research Suite",
          "Data-Driven Precision",
          "Smart Research Tools",
          "Start Building — Free",
        ],
        descriptions: [
          "Free research calculators for peptide researchers. Input parameters, get a framework.",
          "Skip the spreadsheet math. Roji turns research into precise frameworks in 60 seconds.",
          "For researchers, not patients. Every output cites the published literature.",
          "Calibrated research math. Free, browser-based, referenced. Built by researchers.",
        ],
      },
    ],
  };
}

/** Brand Defense ad group — exact-match brand keywords. */
function brandAdGroup(storeUrl: string): BlueprintAdGroup {
  return {
    name: "AG-Brand — Defense",
    cpcBidCeilingUsd: 1.5,
    finalUrl: storeUrl,
    allowBrandTerms: true,
    notes:
      "Owns brand search. Cheap clicks. Prevents competitors from poaching " +
      "branded queries.",
    keywords: [
      { text: "roji", match: "EXACT", risk: "low" },
      { text: "roji peptides", match: "EXACT", risk: "low" },
      { text: "rojipeptides", match: "EXACT", risk: "low" },
      { text: "roji research", match: "EXACT", risk: "low" },
      { text: "roji research tools", match: "EXACT", risk: "low" },
      { text: "roji peptides", match: "PHRASE", risk: "low" },
      { text: "roji research tools", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Roji — Official Site",
          "Roji Research Tools",
          "Research-Grade Stacks",
          "Free Research Calculator",
          "Roji Peptides Official",
        ],
        descriptions: [
          "Official Roji research tools. Build personalized, evidence-based frameworks in 60 seconds.",
          "Roji — premium research compound stacks with third-party COA verification on every batch.",
          "Free research calculators trusted by 500+ in the research community. No account required.",
          "The Roji research suite: framework builders, dose-cost math, recomp planners. All free.",
        ],
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Resolver                                                                    */
/* -------------------------------------------------------------------------- */

export interface ResolveOptions {
  mode: BlueprintMode;
  /**
   * Final URL for tool-intent ad groups. Defaults to
   * `https://tools.rojipeptides.com`. Legacy alias `protocolUrl` is
   * still accepted for back-compat and takes precedence if both are set
   * (so an existing caller passing `protocolUrl` doesn't silently break).
   */
  toolsUrl?: string;
  /** @deprecated use `toolsUrl` */
  protocolUrl?: string;
  /** Defaults to https://rojipeptides.com */
  storeUrl?: string;
  /** Override Campaign 1 daily budget (USD). Defaults vary by mode. */
  campaign1Budget?: number;
  /** Override Brand campaign daily budget (USD). */
  brandBudget?: number;
  /** Override the peptide-experiment campaign daily budget (USD). */
  peptideExperimentBudget?: number;
}

export function resolveBlueprint(opts: ResolveOptions): ResolvedBlueprint {
  const toolsUrl = opts.protocolUrl ?? opts.toolsUrl ?? DEFAULT_TOOLS_URL;
  const storeUrl = opts.storeUrl ?? DEFAULT_STORE_URL;

  if (opts.mode === "peptide-experiment") {
    return {
      mode: "peptide-experiment",
      toolsUrl,
      storeUrl,
      protocolUrl: toolsUrl,
      campaigns: [
        {
          // Separate campaign on purpose: budget isolation, blast-radius
          // isolation (a disapproval here can't pause C1), and clean
          // per-campaign reporting in the Google Ads UI.
          name: "C2 — Peptide Research — Experiment [roji-blueprint]",
          dailyBudgetUsd: opts.peptideExperimentBudget ?? 5,
          channel: "SEARCH",
          language: "en",
          geoTargets: ["US"],
          bidStrategy: "MAXIMIZE_CLICKS",
          rationale:
            "DELIBERATE POLICY EXPERIMENT. Single ad group with two " +
            "phrase-match keywords containing 'peptide research'. $5/day " +
            "cap. Tests whether Google's automated review approves " +
            "research-framed ads using the word `peptide`. Disapproval = " +
            "expected outcome we tolerate; we pause and learn. Compound " +
            "names + therapeutic claims still blocked by safety.ts.",
          adGroups: [peptideExperimentAdGroup(toolsUrl)],
          negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
        },
      ],
    };
  }

  if (opts.mode === "tool-only") {
    return {
      mode: "tool-only",
      toolsUrl,
      storeUrl,
      protocolUrl: toolsUrl,
      campaigns: [
        {
          name: "C1 — Research Tools — Calculators [roji-blueprint]",
          // $14.29/day = $100/week. Slow-start budget while we validate
          // the conversion flow on the live AW-18130000394 account.
          // Override via opts.campaign1Budget once 30+ purchases land.
          dailyBudgetUsd: opts.campaign1Budget ?? 14.29,
          channel: "SEARCH",
          language: "en",
          geoTargets: ["US"],
          bidStrategy: "MAXIMIZE_CLICKS",
          rationale:
            "Calculator-intent traffic only. One ad group (Biohacker — no compound " +
            "names, no 'protocol' framing). Lands on Roji Research Tools. Goal: " +
            "validate that Google approves the ads, measure CTR, and track " +
            "purchase conversions (reserve-order thank-you page) as the primary " +
            "optimization target.",
          adGroups: [biohackerAdGroup(toolsUrl)],
          negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
        },
      ],
    };
  }

  // Full mode
  return {
    mode: "full",
    toolsUrl,
    storeUrl,
    protocolUrl: toolsUrl,
    campaigns: [
      {
        name: "C1 — Research Tools — Search [roji-blueprint]",
        dailyBudgetUsd: opts.campaign1Budget ?? 40,
        channel: "SEARCH",
        language: "en",
        geoTargets: ["US"],
        bidStrategy: "MAXIMIZE_CLICKS",
        rationale:
          "Primary spend. Two ad groups: Research Calculator Intent (core) + " +
          "Biohacker Intent (safest). Compound-specific Ad Group 2 from the " +
          "legacy strategy doc is intentionally omitted — add it manually only " +
          "after Ad Group 1 has been clean for 7+ days.",
        adGroups: [calculatorIntentAdGroup(toolsUrl), biohackerAdGroup(toolsUrl)],
        negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
      },
      {
        name: "C3 — Brand Defense [roji-blueprint]",
        dailyBudgetUsd: opts.brandBudget ?? 7,
        channel: "SEARCH",
        language: "en",
        geoTargets: ["US"],
        bidStrategy: "TARGET_IMPRESSION_SHARE",
        rationale:
          "Owns the brand. Budget should rarely max out — brand traffic is cheap.",
        adGroups: [brandAdGroup(storeUrl)],
        negativeKeywords: [],
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  campaign: string;
  adGroup?: string;
  field: string;
  text: string;
  reason: string;
}

/**
 * Walk the blueprint and run every headline, description, AND keyword
 * through the safety validator. We never want to ship a blueprint that
 * contains a flagged term — and we want a yellow flag for soft-warning
 * patterns ("protocol", "stack", "cycle") so future drift is visible.
 */
/**
 * Google Ads RSA character limits (hard-rejected at API time if exceeded):
 *   - headlines:    max 30
 *   - descriptions: max 90
 *   - keywords:     max 80
 *   - path1/path2:  max 15 (not currently used by us)
 *
 * We validate at blueprint-resolution time so a regression in copy can't
 * silently break provisioning. The check is "error" severity because the
 * API will refuse the create call with TOO_LONG; warnings would be a lie.
 */
const RSA_HEADLINE_MAX = 30;
const RSA_DESCRIPTION_MAX = 90;
const KEYWORD_MAX = 80;

export function validateBlueprint(b: ResolvedBlueprint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const c of b.campaigns) {
    for (const g of c.adGroups) {
      g.ads.forEach((ad, idx) => {
        ad.headlines.forEach((h, hi) => {
          pushIssues(issues, h, c.name, g, `ad${idx}.headline${hi}`);
          pushLengthIssue(
            issues,
            h,
            c.name,
            g,
            `ad${idx}.headline${hi}`,
            RSA_HEADLINE_MAX,
            "Headline",
          );
        });
        ad.descriptions.forEach((d, di) => {
          pushIssues(issues, d, c.name, g, `ad${idx}.description${di}`);
          pushLengthIssue(
            issues,
            d,
            c.name,
            g,
            `ad${idx}.description${di}`,
            RSA_DESCRIPTION_MAX,
            "Description",
          );
        });
      });
      g.keywords.forEach((k, ki) => {
        pushIssues(issues, k.text, c.name, g, `keyword[${ki}]`);
        pushLengthIssue(
          issues,
          k.text,
          c.name,
          g,
          `keyword[${ki}]`,
          KEYWORD_MAX,
          "Keyword",
        );
      });
    }
  }
  return issues;
}

function pushLengthIssue(
  issues: ValidationIssue[],
  text: string,
  campaign: string,
  g: BlueprintAdGroup,
  field: string,
  max: number,
  label: string,
) {
  if (text.length <= max) return;
  issues.push({
    severity: "error",
    campaign,
    adGroup: g.name,
    field,
    text,
    reason: `${label} exceeds Google Ads limit of ${max} characters (current: ${text.length}).`,
  });
}

function pushIssues(
  issues: ValidationIssue[],
  text: string,
  campaign: string,
  g: BlueprintAdGroup,
  field: string,
) {
  const r = validateAdCopy(text);
  const errors = filterAllowedIssues(r.errors, g);
  for (const e of errors) {
    issues.push({
      severity: "error",
      campaign,
      adGroup: g.name,
      field,
      text,
      reason: e.reason,
    });
  }
  for (const w of r.warnings) {
    issues.push({
      severity: "warning",
      campaign,
      adGroup: g.name,
      field,
      text,
      reason: w.reason,
    });
  }
}

/**
 * Suppress safety errors that the ad group has explicitly opted into.
 *
 * - `allowBrandTerms`: brand-defense ad groups where "Roji Peptides" is
 *   the legitimate subject. Filters `peptide` matches.
 * - `allowPeptideExperiment`: deliberate peptide-experiment ad group
 *   testing whether Google's policy review approves the word `peptide`
 *   in research-framed ads. Filters `peptide` matches only.
 *
 * Compound names (BPC-157 etc.), therapeutic claims, dosing/injection
 * language, and punctuation violations are NEVER filtered — those
 * remain hard errors regardless of any opt-in flag.
 */
function filterAllowedIssues(
  issues: Array<{ reason: string; match: string }>,
  g: BlueprintAdGroup,
) {
  const peptideExempt = g.allowBrandTerms || g.allowPeptideExperiment;
  if (!peptideExempt) return issues;
  return issues.filter((i) => !/peptide/i.test(i.match));
}

/* -------------------------------------------------------------------------- */
/* Stats helpers (for the dry-run summary card)                                */
/* -------------------------------------------------------------------------- */

export interface BlueprintStats {
  campaigns: number;
  adGroups: number;
  ads: number;
  keywords: number;
  negatives: number;
  totalDailyBudgetUsd: number;
}

export function blueprintStats(b: ResolvedBlueprint): BlueprintStats {
  let adGroups = 0;
  let ads = 0;
  let keywords = 0;
  let negatives = 0;
  let totalDailyBudgetUsd = 0;
  for (const c of b.campaigns) {
    totalDailyBudgetUsd += c.dailyBudgetUsd;
    negatives += c.negativeKeywords.length;
    for (const g of c.adGroups) {
      adGroups += 1;
      ads += g.ads.length;
      keywords += g.keywords.length;
    }
  }
  return {
    campaigns: b.campaigns.length,
    adGroups,
    ads,
    keywords,
    negatives,
    totalDailyBudgetUsd,
  };
}
