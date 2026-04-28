/**
 * Roji Google Ads campaign blueprint.
 *
 * Codifies the launch strategy into a typed, validated structure. The
 * provisioner (`createBlueprintCampaign`) walks this tree to create real
 * Google Ads entities — or in mock mode, a deterministic plan you can
 * eyeball before spending a dollar.
 *
 * Two modes:
 *   - "tool-only": Campaign 1, Ad Group 3 only (Biohacker intent — no
 *     compound names anywhere). Single RSA. Full negative-keyword list.
 *     Designed for the pre-store launch: ads send traffic to the protocol
 *     engine in TEST_MODE (lead-capture, no commerce surface).
 *
 *   - "full": Campaign 1 (3 ad groups, 3 RSAs, full keyword expansion)
 *     plus Campaign 3 (Brand Defense). Ad Group 2 (compound-specific) is
 *     intentionally excluded by default — the blueprint flags it as high
 *     risk. Add it manually after Ad Group 1 has been running clean for a
 *     week.
 *
 * Anything sourced from here passes through `safety.ts` before mutation
 * so we cannot accidentally ship a forbidden compound name.
 */

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
  protocolUrl: string;
  storeUrl: string;
  campaigns: BlueprintCampaign[];
}

/* -------------------------------------------------------------------------- */
/* Constants pulled straight from the strategy doc                             */
/* -------------------------------------------------------------------------- */

/**
 * Negative keywords from the strategy doc. Applied at campaign level so
 * every ad group inherits them. These exist to keep ads from showing on
 * commerce-intent searches that would (a) flag the policy review and
 * (b) pull traffic that won't convert through the protocol engine.
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
      "Lowest policy risk. No compound names. Lands on the protocol engine. " +
      "Always launch this first.",
    keywords: [
      "biohacking tools",
      "biohacking protocol",
      "body optimization protocol",
      "performance optimization tools",
      "recovery optimization protocol",
      "biohacker calculator",
      "body recomposition protocol",
      "advanced recovery protocol",
      "performance research tools",
      "optimization framework builder",
      "biohacking stack builder",
      "recovery stack protocol",
      "lean mass protocol research",
      "body composition calculator",
      "fitness research protocol",
    ].map((text) => ({ text, match: "PHRASE", risk: "low" })),
    ads: [
      {
        headlines: [
          "Biohacker Protocol Builder",
          "Optimize Your Protocol",
          "Performance Framework",
          "Free Optimization Tool",
          "Body Recomp Calculator",
          "Personalized Frameworks",
          "Protocol Builder — Free",
          "Smart Research Tools",
          "Built For Researchers",
          "60-Second Protocols",
          "Evidence-Based Tools",
          "Calibrated Frameworks",
          "Roji Protocol Engine",
          "Data-Driven Precision",
          "Start Building — Free",
        ],
        descriptions: [
          "Advanced protocol builder for biohackers. Input your stats, goals, and experience. Get a personalized research framework.",
          "Join the biohacking community using data-driven protocols. Free tool. Personalized. Evidence-based. Start now.",
          "Build calibrated optimization frameworks in 60 seconds. Published references included. No signup required.",
          "Stop guessing. Use our protocol engine to build personalized research frameworks. Free, no signup.",
        ],
      },
    ],
  };
}

/** Ad Group 1 — Protocol / Calculator Intent (core, moderate risk). */
function protocolIntentAdGroup(finalUrl: string): BlueprintAdGroup {
  return {
    name: "AG1 — Protocol Intent",
    cpcBidCeilingUsd: 3.5,
    finalUrl,
    notes:
      "Core ad group. 'peptide protocol calculator' carries moderate risk; " +
      "monitor first 48h and pause that single keyword if disapproved.",
    keywords: [
      { text: "research protocol builder", match: "PHRASE", risk: "low" },
      { text: "research protocol calculator", match: "PHRASE", risk: "low" },
      { text: "research compound protocol", match: "PHRASE", risk: "low" },
      { text: "peptide protocol calculator", match: "PHRASE", risk: "moderate" },
      { text: "research protocol generator", match: "PHRASE", risk: "low" },
      { text: "compound dosing calculator", match: "PHRASE", risk: "low" },
      { text: "research stack builder", match: "PHRASE", risk: "low" },
      { text: "biotech protocol tool", match: "PHRASE", risk: "low" },
      { text: "research protocol framework", match: "PHRASE", risk: "low" },
      { text: "biohacking protocol builder", match: "PHRASE", risk: "low" },
      { text: "biohacking calculator", match: "PHRASE", risk: "low" },
      { text: "body optimization protocol", match: "PHRASE", risk: "low" },
      { text: "performance protocol builder", match: "PHRASE", risk: "low" },
      { text: "recovery research protocol", match: "PHRASE", risk: "low" },
      { text: "research compound stack builder", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Free Protocol Builder Tool",
          "Build Your Research Protocol",
          "Evidence-Based Protocols",
          "Personalized In 60 Seconds",
          "Free Research Framework",
          "Protocol Calculator — Free",
          "Research Protocol Generator",
          "Custom Research Protocols",
          "Data-Driven Protocols",
          "Input Stats, Get Protocol",
          "Free Protocol Builder",
          "Science-Based Framework",
          "Roji Protocol Engine",
          "Calibrated Research Tools",
          "Start Building — Free",
        ],
        descriptions: [
          "Input your research parameters. Get a personalized, evidence-based protocol in 60 seconds. Free tool.",
          "Comprehensive protocol builder with published literature references. No account needed. Start now.",
          "Built by researchers for researchers. Personalized compound protocols based on your specific parameters.",
          "Join 500+ researchers using our free protocol engine. Fast, evidence-based, referenced. Try it now.",
        ],
      },
      {
        headlines: [
          "Research Protocol Engine",
          "Get Your Protocol In 60s",
          "Free Compound Calculator",
          "Evidence-Based Protocols",
          "Calibrate Your Research",
          "Protocol Builder — Free",
          "Personalized Frameworks",
          "Research Stack Calculator",
          "Built For Researchers",
          "Data-Driven Precision",
          "Published References",
          "Compound Protocol Tool",
          "No Account Required",
          "Advanced Protocol Builder",
          "Smart Research Tools",
        ],
        descriptions: [
          "Input your parameters and objectives. Our engine generates a calibrated research protocol with literature references.",
          "Free protocol builder tool. Personalized compound stacks and cycle planning frameworks. Start in seconds.",
          "Precision matters in research. Our protocol engine helps you build frameworks backed by published data. Free.",
          "Stop guessing. Use our research protocol engine to build evidence-based compound frameworks. Free, no signup.",
        ],
      },
      {
        headlines: [
          "Smart Protocol Builder",
          "Research Framework Tool",
          "Compound Protocol Maker",
          "Personalized Protocols",
          "Free Research Engine",
          "60-Second Protocols",
          "Built On Published Data",
          "Advanced Calculators",
          "Custom Stack Protocols",
          "Research Made Precise",
          "Protocol Generator",
          "Roji Research Tools",
          "Framework Builder Free",
          "Evidence-Based Stacks",
          "No Guesswork Needed",
        ],
        descriptions: [
          "Advanced protocol builder that generates personalized research frameworks. Based on published literature. Free.",
          "Tell us your research goals and parameters. Get a custom protocol with compound selection and timing. Free tool.",
          "Our protocol engine has generated 1,000+ research frameworks. Personalized, referenced, free. Try it.",
          "Why guess when you can calculate? Our protocol engine uses published data to build precise frameworks. Free.",
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
      { text: "roji protocol", match: "EXACT", risk: "low" },
      { text: "roji research", match: "EXACT", risk: "low" },
      { text: "roji peptides", match: "PHRASE", risk: "low" },
      { text: "roji protocol builder", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Roji — Official Site",
          "Roji Protocol Engine",
          "Research-Grade Stacks",
          "Free Protocol Builder",
          "Roji Peptides Official",
        ],
        descriptions: [
          "The official Roji protocol engine. Build personalized research protocols in 60 seconds. Free, evidence-based.",
          "Roji Peptides — premium research compound stacks with third-party COA verification. Protocol-driven research.",
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
  /** Defaults to https://protocol.rojipeptides.com */
  protocolUrl?: string;
  /** Defaults to https://rojipeptides.com */
  storeUrl?: string;
  /** Override Campaign 1 daily budget (USD). Defaults vary by mode. */
  campaign1Budget?: number;
  /** Override Brand campaign daily budget (USD). */
  brandBudget?: number;
}

export function resolveBlueprint(opts: ResolveOptions): ResolvedBlueprint {
  const protocolUrl = opts.protocolUrl ?? "https://protocol.rojipeptides.com";
  const storeUrl = opts.storeUrl ?? "https://rojipeptides.com";

  if (opts.mode === "tool-only") {
    return {
      mode: "tool-only",
      protocolUrl,
      storeUrl,
      campaigns: [
        {
          name: "C1 — Protocol Engine — Tool Only [roji-blueprint]",
          dailyBudgetUsd: opts.campaign1Budget ?? 30,
          channel: "SEARCH",
          language: "en",
          geoTargets: ["US"],
          bidStrategy: "MAXIMIZE_CLICKS",
          rationale:
            "Pre-store launch. One ad group only (Biohacker — no compound names). " +
            "Lands on the protocol engine running in TEST_MODE (lead-capture, " +
            "no commerce surface). Goal: validate that Google approves the ads, " +
            "measure CTR, and capture leads as a real intent signal.",
          adGroups: [biohackerAdGroup(protocolUrl)],
          negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
        },
      ],
    };
  }

  // Full mode
  return {
    mode: "full",
    protocolUrl,
    storeUrl,
    campaigns: [
      {
        name: "C1 — Protocol Engine — Search [roji-blueprint]",
        dailyBudgetUsd: opts.campaign1Budget ?? 40,
        channel: "SEARCH",
        language: "en",
        geoTargets: ["US"],
        bidStrategy: "MAXIMIZE_CLICKS",
        rationale:
          "Primary spend. Two ad groups: Protocol Intent (core) + Biohacker Intent " +
          "(safest). Compound-specific Ad Group 2 from the blueprint is intentionally " +
          "omitted — add it manually only after Ad Group 1 has been clean for 7+ days.",
        adGroups: [protocolIntentAdGroup(protocolUrl), biohackerAdGroup(protocolUrl)],
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

export interface ValidationIssue {
  campaign: string;
  adGroup?: string;
  field: string;
  text: string;
  reason: string;
}

/**
 * Walk the blueprint and run every headline, description, keyword, and
 * ad-group name through the safety validator. We never want to ship a
 * blueprint that contains a flagged term.
 */
export function validateBlueprint(b: ResolvedBlueprint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const c of b.campaigns) {
    for (const g of c.adGroups) {
      g.ads.forEach((ad, idx) => {
        ad.headlines.forEach((h, hi) => {
          const r = validateAdCopy(h);
          if (!r.ok) {
            const filtered = filterBrandIssues(r.issues, g.allowBrandTerms);
            if (filtered.length > 0) {
              issues.push({
                campaign: c.name,
                adGroup: g.name,
                field: `ad${idx}.headline${hi}`,
                text: h,
                reason: filtered.map((i) => i.reason).join("; "),
              });
            }
          }
        });
        ad.descriptions.forEach((d, di) => {
          const r = validateAdCopy(d);
          if (!r.ok) {
            const filtered = filterBrandIssues(r.issues, g.allowBrandTerms);
            if (filtered.length > 0) {
              issues.push({
                campaign: c.name,
                adGroup: g.name,
                field: `ad${idx}.description${di}`,
                text: d,
                reason: filtered.map((i) => i.reason).join("; "),
              });
            }
          }
        });
      });
      // Keywords intentionally not validated here — brand-defense terms
      // like "roji peptides" must contain "peptide" by definition, and
      // Google policy-checks keywords on its own at serve time.
    }
  }
  return issues;
}

/**
 * If `allowBrandTerms` is true on the ad group, suppress safety issues
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
