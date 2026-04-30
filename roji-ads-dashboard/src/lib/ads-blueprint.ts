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

export type BlueprintMode = "tool-only" | "full";

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
          "Advanced research tools for biohackers. Input your stats and goals. Get a personalized, evidence-based framework.",
          "Join the biohacking community using data-driven research tools. Free. Personalized. Evidence-based. Start now.",
          "Build calibrated optimization frameworks in 60 seconds. Published references included. No signup required.",
          "Stop guessing. Use Roji Research Tools to build personalized research frameworks. Free, no signup.",
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
          "Input your research parameters. Get a personalized, evidence-based research framework in 60 seconds. Free.",
          "Comprehensive research calculator with published literature references. No account needed. Start now.",
          "Built by researchers for researchers. Personalized compound research frameworks based on your parameters.",
          "Join 500+ researchers using our free research tools. Fast, evidence-based, referenced. Try it now.",
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
          "Input your parameters and objectives. Our research tools generate a calibrated framework with literature references.",
          "Free research calculator. Personalized compound stacks and phase-planning frameworks. Start in seconds.",
          "Precision matters in research. Our research tools help you build frameworks backed by published data. Free.",
          "Stop guessing. Use Roji Research Tools to build evidence-based compound frameworks. Free, no signup.",
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
          "Advanced research calculator that generates personalized frameworks. Based on published literature. Free.",
          "Tell us your research goals and parameters. Get a custom framework with compound selection and timing. Free tool.",
          "Our research suite has generated 1,000+ frameworks. Personalized, referenced, free. Try it.",
          "Why guess when you can calculate? Our research tools use published data to build precise frameworks. Free.",
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
          "The official Roji research tools. Build personalized research frameworks in 60 seconds. Free, evidence-based.",
          "Roji Peptides — premium research compound stacks with third-party COA verification. Research-driven.",
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
}

export function resolveBlueprint(opts: ResolveOptions): ResolvedBlueprint {
  const toolsUrl = opts.protocolUrl ?? opts.toolsUrl ?? DEFAULT_TOOLS_URL;
  const storeUrl = opts.storeUrl ?? DEFAULT_STORE_URL;

  if (opts.mode === "tool-only") {
    return {
      mode: "tool-only",
      toolsUrl,
      storeUrl,
      protocolUrl: toolsUrl,
      campaigns: [
        {
          name: "C1 — Research Tools — Calculators [roji-blueprint]",
          dailyBudgetUsd: opts.campaign1Budget ?? 30,
          channel: "SEARCH",
          language: "en",
          geoTargets: ["US"],
          bidStrategy: "MAXIMIZE_CLICKS",
          rationale:
            "Calculator-intent traffic only. One ad group (Biohacker — no compound " +
            "names, no 'protocol' framing). Lands on Roji Research Tools. Goal: " +
            "validate that Google approves the ads, measure CTR, and track " +
            "tool_complete conversions as the primary intent signal.",
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
export function validateBlueprint(b: ResolvedBlueprint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const c of b.campaigns) {
    for (const g of c.adGroups) {
      g.ads.forEach((ad, idx) => {
        ad.headlines.forEach((h, hi) => {
          pushIssues(issues, h, c.name, g, `ad${idx}.headline${hi}`);
        });
        ad.descriptions.forEach((d, di) => {
          pushIssues(issues, d, c.name, g, `ad${idx}.description${di}`);
        });
      });
      g.keywords.forEach((k, ki) => {
        pushIssues(issues, k.text, c.name, g, `keyword[${ki}]`);
      });
    }
  }
  return issues;
}

function pushIssues(
  issues: ValidationIssue[],
  text: string,
  campaign: string,
  g: BlueprintAdGroup,
  field: string,
) {
  const r = validateAdCopy(text);
  const errors = filterBrandIssues(r.errors, g.allowBrandTerms);
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
 * If `allowBrandTerms` is true on the ad group, suppress error issues
 * that match only because of the word "peptide". Other forbidden terms
 * (compound names, therapeutic claims, etc.) still flag as normal.
 */
function filterBrandIssues(
  issues: Array<{ reason: string; match: string }>,
  allowBrandTerms: boolean | undefined,
) {
  if (!allowBrandTerms) return issues;
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
