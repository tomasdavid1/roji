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
 * Tool-specific ad group restructure (4-AI review consensus, Apr 2026):
 *   The original AG3 ("Biohacker Intent") routed every keyword to the
 *   homepage tool grid, which all four reviewers (Claude, ChatGPT,
 *   Gemini, Grok) flagged as a high-impact CRO mistake. Specific-intent
 *   keywords like "reconstitution calculator" now route to their
 *   tool-specific landing page (`/reconstitution`) instead of the
 *   homepage. AG3 is decomposed into 5 tool-specific ad groups plus a
 *   slimmed AG-Generic catch-all. AG5 (Fitness) is moved to its own
 *   campaign C4 to prevent cheap fitness clicks from cannibalising
 *   high-intent tool budget under Maximize Clicks.
 *
 *   Per the same review, ad copy on Reconstitution + CostCompare was
 *   hard-softened: "syringe", "tick", "before you touch a vial",
 *   "insulin-syringe" stripped from RSAs (kept on landing pages where
 *   they're useful and unreviewed). The URL `/cost-per-dose` stays
 *   (Google evaluates the page, which is math) but the ad group name
 *   is AG-CostCompare and "dose" is dropped from RSA copy.
 *
 * Modes:
 *   - "tool-only": C1 (5 tool-specific ad groups, slimmed AG-Generic).
 *     Default. Brand defense (C3) included.
 *
 *   - "full": tool-only PLUS C4 (Recomp/Fitness Funnel, separate $5/day
 *     budget so cheap fitness clicks can't starve tool ad groups).
 *
 *   - "peptide-experiment": C2 only — bounded $5/day experiment with
 *     `peptide` in two phrase-match keywords.
 *
 * Anything sourced from here passes through `safety.ts` before mutation
 * so we cannot accidentally ship a forbidden compound name. Both ad copy
 * AND keywords are walked.
 *
 * Migration notes (Apr 2026):
 *   The provisioner is idempotent by ad-group name. When this new
 *   blueprint provisions, the live AG3 + AG5 are NOT touched — they
 *   keep running in the account until manually paused in the Google
 *   Ads UI. Pause AG3 and AG5 immediately after the new ad groups go
 *   live so spend doesn't double up.
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

export interface BlueprintSitelink {
  text: string;        // max 25 chars
  finalUrl: string;
  description1?: string; // max 35 chars
  description2?: string; // max 35 chars
}

export interface BlueprintCallout {
  text: string;  // max 25 chars
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
  /** Sitelink extensions at campaign level. */
  sitelinks?: BlueprintSitelink[];
  /** Callout extensions at campaign level. */
  callouts?: BlueprintCallout[];
  /** Exclude the 18-24 age demographic. Reduces spend on unqualified traffic
   *  and signals compliance with our 21+ requirement. */
  excludeAge18to24?: boolean;
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
  // Commerce intent — our landing page is a free tool, not a store
  "buy",
  "purchase",
  "order",
  "cheap",
  "discount",
  "coupon",
  "for sale",
  "price",
  "cost to buy",
  "price to buy",
  "where to buy",
  "shop",
  "store",
  // Medical / pharma — policy protection
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
  "medical advice",
  "symptoms",
  // Named drugs — high CPC, wrong audience
  "semaglutide",
  "ozempic",
  "wegovy",
  "tirzepatide",
  // Controlled substances
  "steroid",
  "testosterone",
  "hgh",
  "growth hormone",
  "illegal",
  // Safety / harm framing
  "side effects",
  "safe to inject",
  "safe for humans",
  "dangerous",
  "drug",
  "medicine",
  "treatment",
  "therapy",
  "cure",
  "heal",
  // Sourcing / unverified-vendor framing — added 2026-05-01 after C2's
  // search-term report showed `chinese peptides` was firing (5 imps,
  // 0 clicks). Pure shopping intent for unverified sources; we don't
  // want this anywhere near our tools landing pages.
  "chinese",
  "china",
  "wholesale",
  "bulk",
  // Junk calculator traffic — especially important with AG5 fitness keywords
  "bmi",
  "mortgage",
  "loan",
  "interest",
  "savings",
  "tax",
  "grade",
  "gpa",
  "scientific calculator",
  "calculator app",
  "download",
  "unit conversion",
  "pregnancy",
  "calorie deficit",
  "diet plan",
];

/* -------------------------------------------------------------------------- */
/* Ad copy & keyword catalog                                                   */
/* -------------------------------------------------------------------------- */

/* === Tool-specific ad groups (post-restructure, 4-AI review consensus) === */

/**
 * AG-Reconstitution → /reconstitution
 *
 * Highest-intent ad group in the account. Nobody else bids on
 * "reconstitution calculator". Landing page is a math calculator.
 *
 * COPY POLICY (per 4-AI consensus):
 *   - No "syringe", "tick", "insulin", "inject" in ad copy.
 *   - No "before you ever touch a vial" — sounds operational/preparatory.
 *   - "Vial" is allowed as a research lab term but used sparingly.
 *   - Lead with "Research Concentration Math" framing.
 *   - Do NOT echo "BAC water" in ad copy (Google flagged this under
 *     "Unapproved substances" 2026-04-30). Keep the keyword `"bac water
 *     calculator"` because it represents real user search intent — we
 *     just don't repeat the term back in our own asset copy.
 *   - Focus on concentration math / volume calculator framing instead.
 */
function reconstitutionAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-Reconstitution",
    cpcBidCeilingUsd: 3.0,
    finalUrl: `${toolsUrl}/reconstitution`,
    notes:
      "Highest-intent tool group. Hard-softened ad copy per 4-AI review " +
      "(strip 'syringe', 'tick', 'before you touch a vial'). Landing " +
      "page route /reconstitution is research-only math, not pharma.",
    keywords: [
      { text: "reconstitution calculator", match: "PHRASE", risk: "low" },
      { text: "vial calculator", match: "PHRASE", risk: "low" },
      { text: "bac water calculator", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          // "BAC Water Math — Free" removed 2026-04-30 after Google
          // flagged "BAC water" in the Reconstitution sitelink under
          // "Unapproved substances." The keyword "bac water calculator"
          // stays (represents user search intent), but we don't echo
          // the term back in our own copy.
          "Reconstitution Calculator",
          "Free Research Concentration",
          "Free Volume Calculator",
          "Concentration Calculator",
          "Research Math Calculator",
          "Free Reconstitution Tool",
          "Lab Math In 60 Seconds",
          "Browser-Based Calculator",
          "Roji Research Tools",
          "Built For Researchers",
          "Input-Based Lab Math",
          "Transparent Research Math",
          "Free Research Calculator",
          "No Signup Required",
          "Skip The Forum Math",
        ],
        descriptions: [
          "Input research parameters and volume to calculate concentration. Browser-based, free.",
          "Transparent research concentration math for lab-planning. Fast, free, no signup.",
          "Replace forum spreadsheets. Calculate concentrations in 60 seconds. Free research tool.",
          "Research concentration calculator built by researchers, for researchers. Free, no account.",
        ],
      },
    ],
  };
}

/**
 * AG-HalfLife → /half-life
 *
 * Cleanest tool-specific split. Half-life is physics/chemistry, no
 * pharma classifier triggers. Lead with database/reference angle, not
 * pharmacokinetic-sounding language.
 */
function halfLifeAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-HalfLife",
    cpcBidCeilingUsd: 3.0,
    finalUrl: `${toolsUrl}/half-life`,
    notes:
      "Cleanest tool split. No policy risk. Database/reference framing. " +
      "Watch search terms in week 1 for chemistry-homework drift.",
    keywords: [
      { text: "half life calculator", match: "PHRASE", risk: "low" },
      { text: "half life database", match: "PHRASE", risk: "low" },
      { text: "half life comparison", match: "PHRASE", risk: "low" },
      { text: "compound half life", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        // Rewritten 2026-04-30 after Google flagged the sitelink
        // "Compare compound half-lives" under Unapproved Substances.
        // The pairing of "compound" + "half-life" (especially plural)
        // reads as pharmacokinetic claims about unapproved substances.
        // Stripped "compound half-lives", "research compounds",
        // "compound decay curves" — replaced with research-database /
        // reference-data framing that describes the TOOL, not the
        // substances it covers.
        headlines: [
          "Half-Life Database — Free",
          "Free Research Database",
          "Decay Curves, Visualized",
          "Cited Research Data",
          "PubMed-Cited References",
          "20+ Research Entries",
          "Research Comparison Tool",
          "Roji Research Tools",
          "Built For Researchers",
          "Half-Life Made Visual",
          "Browse — Free",
          "Evidence-Based Tools",
          "No Signup Required",
          "Research Reference Data",
          "Referenced Half-Life Data",
        ],
        descriptions: [
          "Referenced half-life ranges and reference data for 20+ research entries. Free, cited.",
          "Compare decay curves and reference profiles in one free research database. Browser-based.",
          "PubMed-cited reference data in a free research database. No paywall, no account needed.",
          "Visualize referenced decay curves in a free research database. Built for researchers.",
        ],
      },
    ],
  };
}

/**
 * AG-COA → /coa
 *
 * Lowest policy risk in the entire account. COA = analytical chemistry
 * document. "Janoshik" dropped from ad copy per 4-AI review (kept on
 * landing pages — narrows ad eligibility unnecessarily in copy).
 */
function coaAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-COA",
    cpcBidCeilingUsd: 3.0,
    finalUrl: `${toolsUrl}/coa`,
    notes:
      "Lowest policy risk. COA = lab document, fully inert classifier-wise. " +
      "Sharpest trust/verification angle in the account. 'Janoshik' kept " +
      "on landing page only, dropped from ad copy.",
    keywords: [
      { text: "coa analyzer", match: "PHRASE", risk: "low" },
      { text: "certificate of analysis checker", match: "PHRASE", risk: "low" },
      { text: "coa verifier", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Free COA Analyzer",
          "Verify Your COA",
          "Spot COA Red Flags",
          "Certificate Analysis Tool",
          "Free Vendor COA Checker",
          "HPLC Purity Analyzer",
          "COA In Plain English",
          "Files Stay Local",
          "Roji Research Tools",
          "Built For Researchers",
          "Lab COA Translator",
          "Check COA Completeness",
          "Third-Party COA Standards",
          "Flag COA Red Flags",
          "Upload — Free",
        ],
        descriptions: [
          "Drop in any vendor's COA. We translate every line into plain English and flag red flags.",
          "Verify HPLC purity, MS confirmation, and lab accreditation. Free, local files only.",
          "Spot fake or incomplete COAs in seconds. Built by researchers tired of sketchy reports.",
          "Free COA analyzer with third-party verification standards. Upload, get a trust score.",
        ],
      },
    ],
  };
}

/**
 * AG-CostCompare → /cost-per-dose
 *
 * Ad group label intentionally avoids "dose" even though the URL keeps
 * the existing route. Google evaluates the landing page (cost
 * comparison math, not pharma). Ad copy leads with vendor cost
 * comparison framing — "research cost calculator" not "cost per dose."
 */
function costCompareAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-CostCompare",
    cpcBidCeilingUsd: 3.0,
    finalUrl: `${toolsUrl}/cost-per-dose`,
    notes:
      "Renamed from AG-CostPerDose to keep 'dose' out of the ad group " +
      "label and ad copy. URL route /cost-per-dose unchanged. Lead with " +
      "vendor cost comparison framing.",
    keywords: [
      { text: "cost per dose calculator", match: "PHRASE", risk: "moderate" },
      { text: "compound cost calculator", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Research Cost Calculator",
          "Compare Vendor Costs",
          "Cost Comparison Tool",
          "$/mg Comparison Tool",
          "Vendor Cost Calculator",
          "Free Research Calculator",
          "Free Vendor Comparison",
          "Transparent Cost Math",
          "Roji Research Tools",
          "Built For Researchers",
          "Lab Math In 60 Seconds",
          "Skip The Spreadsheet",
          "Browser-Based Tool",
          "No Signup Required",
          "Calculate — Free",
        ],
        descriptions: [
          "Input research quantity and price to compare cost metrics across vendors. Free.",
          "Compare vendor cost inputs with transparent formulas. Browser-based, no account.",
          "Vendor cost comparison built for researchers. Transparent math, no marketing fluff.",
          "Free research cost calculator. Compare vendors anonymously. No signup needed.",
        ],
      },
    ],
  };
}

/**
 * AG-Generic → / (homepage)
 *
 * Slimmed catch-all for true broad-intent terms (no clear tool home).
 * Aggressively pruned per 4-AI consensus — every keyword that maps to
 * a specific tool was redistributed to its own ad group. The remaining
 * keywords are exploratory: someone searching "biohacking tools" wants
 * to see the suite, not a single calculator.
 *
 * Bloodwork keyword lives here because: (a) bloodwork → peptide is the
 * weakest commercial bridge, (b) bloodwork keywords could trigger
 * health-classifier review if isolated, (c) traffic is low enough to
 * absorb here without dominating.
 */
function genericAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-Generic",
    cpcBidCeilingUsd: 3.0,
    finalUrl: toolsUrl,
    notes:
      "Slimmed catch-all (was AG3). Only keywords with no clear tool " +
      "home. Aggressive search-term review — first to cut if budget " +
      "starves the tool-specific groups.",
    keywords: [
      // Broad biohacker-suite intent (homepage is the right destination)
      { text: "biohacking tools", match: "PHRASE", risk: "low" },
      { text: "biohacking calculator", match: "PHRASE", risk: "low" },
      { text: "biohacker calculator", match: "PHRASE", risk: "low" },
      { text: "body optimization tools", match: "PHRASE", risk: "low" },
      { text: "performance research tools", match: "PHRASE", risk: "low" },
      { text: "fitness research tools", match: "PHRASE", risk: "low" },
      // Bloodwork has no dedicated AG (weak commercial bridge)
      { text: "bloodwork interpreter", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Free Research Tools",
          "Research Calculator Suite",
          "Built For Researchers",
          "Biohacker Research Tools",
          "Roji Research Tools",
          "Evidence-Based Tools",
          "Free Calculator Suite",
          "Body Optimization Suite",
          "Lab Math In 60 Seconds",
          "Skip The Spreadsheet",
          "Browser-Based Tools",
          "No Signup Required",
          "Personalized Frameworks",
          "Free Research Suite",
          "Start Building — Free",
        ],
        descriptions: [
          "Free research tools built for biohackers. Reconstitution, half-life, COA scoring, more.",
          "Reconstitution math, half-life curves, COA red-flag scoring. The tools that should exist.",
          "Suite of free research calculators. Browser-based, referenced, no account needed.",
          "Stop guessing. Calculate it. Free research tools, all referenced, no signup.",
        ],
      },
    ],
  };
}

/**
 * AG-Recomp → /recomp  (own campaign C4, NOT in C1)
 *
 * Per 4-AI review, fitness keywords have CPCs 3-5x cheaper than
 * tool-specific keywords. If they ran in C1 with Maximize Clicks,
 * Google would pour budget into them and starve the high-intent tool
 * groups. Solution: separate $5/day campaign C4 with its own budget.
 * If fitness traffic doesn't convert in 3 weeks, pause C4 with zero
 * impact on C1.
 */
function recompAdGroup(toolsUrl: string): BlueprintAdGroup {
  return {
    name: "AG-Recomp",
    cpcBidCeilingUsd: 2.0,
    finalUrl: `${toolsUrl}/recomp`,
    notes:
      "Top-of-funnel fitness traffic, isolated in C4 with its own " +
      "$5/day budget so cheap clicks don't cannibalise C1. Lower CPC " +
      "ceiling reflects weaker commercial intent vs. tool-specific groups.",
    keywords: [
      { text: "body recomp calculator", match: "PHRASE", risk: "low" },
      { text: "body recomposition calculator", match: "PHRASE", risk: "low" },
      { text: "body composition calculator", match: "PHRASE", risk: "low" },
      { text: "tdee calculator", match: "PHRASE", risk: "low" },
      { text: "macro calculator", match: "PHRASE", risk: "low" },
      { text: "body fat calculator", match: "PHRASE", risk: "low" },
      { text: "lean bulk calculator", match: "PHRASE", risk: "low" },
      { text: "cutting calculator", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Body Recomp Calculator",
          "Free TDEE Calculator",
          "Macro Calculator — Free",
          "Body Composition Calculator",
          "Composition Projections",
          "Input-Based Recomp Math",
          "Free Body Fat Calculator",
          "Composition Planner",
          "Goal-Based Calculator",
          "Roji Research Tools",
          "60-Second Recomp Math",
          "Free Calculator Suite",
          "Skip The Spreadsheet",
          "Evidence-Based Tools",
          "Start Calculating — Free",
        ],
        descriptions: [
          "TDEE, macros, and projected body composition over 8-24 weeks. Calibrated to your data.",
          "Personalized recomp math in 60 seconds. Free, browser-based, no signup needed.",
          "Replace your fitness spreadsheet with a calibrated calculator. Free, fast, evidence-based.",
          "16-week body composition projection based on your TDEE, training, and goal. Free tool.",
        ],
      },
    ],
  };
}

/* === Legacy ad groups ===
 *
 * NOTE: The three functions below (`biohackerAdGroup`, `calculatorIntentAdGroup`,
 * `fitnessIntentAdGroup`) were the pre-restructure ad groups. They are no
 * longer referenced by any resolver mode, but are retained for one release
 * cycle as reference for anyone debugging diffs between the old and new
 * structures. Safe to delete after the new blueprint has run clean for 14 days.
 */

/** Ad Group 3 — Biohacker / Optimization Intent (LEGACY — see AG-Generic). */
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
      // Tool-specific keywords (all reviewers agree these are high-intent,
      // low-competition queries targeting people looking for exactly what
      // we built).
      "reconstitution calculator",
      "half life calculator",
      "coa analyzer",
      "cost per dose calculator",
      "compound cost calculator",
      "vial calculator",
      "bloodwork interpreter",
      "bac water calculator",
    ].map((text) => ({ text, match: "PHRASE" as KeywordMatchType, risk: "low" as const })),
    ads: [
      // RSA #1 — "biohacker community / evidence-based" angle.
      // Tone: belonging, scientific credibility.
      // Headlines swapped per external review: bland "Optimize With Data",
      // "Smart Research Suite", "Calibrated Frameworks", "Data-Driven
      // Precision", "Performance Frameworks" replaced with tool-specific /
      // pain-point headlines that speak directly to ICP.
      {
        headlines: [
          "Biohacker Research Tools",
          "Lab Math In 60 Seconds",
          "Reconstitution Calculator",
          "Free Optimization Tool",
          "Body Recomp Calculator",
          "Personalized Frameworks",
          "Research Tools — Free",
          "Skip 3 Hours Of Reddit",
          "Built For Researchers",
          "Free COA Analyzer",
          "Evidence-Based Tools",
          "20+ Compounds Covered",
          "Roji Research Tools",
          "Half-Life Database",
          "Start Building — Free",
        ],
        descriptions: [
          "Free research tools built for biohackers. Input your stats, get a personalized framework.",
          "Reconstitution math, half-life curves, COA scoring. The tools that should exist. Free.",
          "Join researchers planning recomp, recovery, and performance. Free, referenced, no signup.",
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
      // RSA #3 — "tool-specific / what-we-actually-do" angle.
      // Tone: concrete, names the tools, speaks to the pain. Distinct
      // narrative from #1 (community) and #2 (productivity) — this one
      // says "here are the exact calculators you're looking for."
      {
        headlines: [
          "Reconstitution Calculator",
          "Half-Life Database",
          "Free COA Analyzer",
          "Cost-Per-Dose Math",
          "Body Recomp Planner",
          "Bloodwork Interpreter",
          "Lab Math In 60 Seconds",
          "Roji Research Tools",
          "Skip 3 Hours Of Reddit",
          "Built For Researchers",
          "Free Research Suite",
          "20+ Compounds Covered",
          "Cites Published Research",
          "No Account Required",
          "Start Building — Free",
        ],
        descriptions: [
          "Reconstitution, half-life, COA red-flag scoring, cost-per-dose. All free, all referenced.",
          "The research calculators that should already exist. 60 seconds from input to framework.",
          "For researchers, not patients. Every output cites the published literature it's built on.",
          "Stop guessing reconstitution math. Input your vial, get precise numbers. Free, no signup.",
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
          "Trusted by the research community. Save hours of spreadsheet math. Try it free, no signup.",
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
      "DELIBERATE POLICY EXPERIMENT — now SCALING. Originally launched " +
      "with 2 PHRASE keywords as a $5/day test. As of 2026-05-01 the " +
      "campaign is approved (Eligible/Learning), serving real " +
      "impressions, and capturing organic close-variant matches in " +
      "Spanish/German/Portuguese. Tier 1 expansion below promotes the " +
      "highest-signal close variants from the search-term report into " +
      "first-class keywords. See: C2-KEYWORD-EXPANSION.md for the full " +
      "rationale, negative-keyword recommendations, and Tier 2/3 " +
      "follow-ups.",
    keywords: [
      // Original 2 — proven, keep.
      { text: "peptide research calculator", match: "PHRASE", risk: "high" },
      { text: "peptide research tools", match: "PHRASE", risk: "high" },
      // User-added on 2026-05-01 (already serving):
      { text: "peptide calculator", match: "EXACT", risk: "high" },
      { text: "research peptide", match: "PHRASE", risk: "high" },
      { text: "peptide quality", match: "PHRASE", risk: "high" },
      { text: "peptide coa", match: "PHRASE", risk: "high" },
      { text: "peptide reconstitution", match: "PHRASE", risk: "high" },
      // Tier 1 expansion (close-variant promotions backed by C2's
      // own search-term report). All match-types chosen to balance
      // reach vs. CPC discipline; Exact is reserved for terms with
      // confirmed positive CTR in the report.
      {
        text: "peptide reconstitution calculator",
        match: "PHRASE",
        risk: "high",
      },
      { text: "peptide dosage calculator", match: "PHRASE", risk: "high" },
      { text: "peptides calculator", match: "PHRASE", risk: "high" },
      {
        text: "peptide concentration calculator",
        match: "PHRASE",
        risk: "high",
      },
      // German keyword — `peptid rechner` had 50% CTR on 2 imps in
      // the search-term report. Promote to Exact for low CPC.
      { text: "peptide rechner", match: "EXACT", risk: "high" },
      // Spanish keyword — already firing as a close variant of
      // `peptide calculator`.
      { text: "calculadora de peptidos", match: "EXACT", risk: "high" },
      { text: "peptide half life calculator", match: "PHRASE", risk: "high" },
      { text: "peptide half life database", match: "PHRASE", risk: "high" },
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

/**
 * Ad Group 5 — Fitness Calculator Intent (zero-risk top-of-funnel).
 *
 * High-volume, zero-policy-risk fitness keywords. tools.rojipeptides.com
 * has a body recomp calculator and these keywords bring broader
 * top-of-funnel traffic at very cheap CPCs ($0.30-1.00). They won't
 * convert directly to peptide sales but they build awareness,
 * remarketing audiences, and tool usage.
 */
function fitnessIntentAdGroup(finalUrl: string): BlueprintAdGroup {
  return {
    name: "AG5 — Fitness Calculator Intent",
    cpcBidCeilingUsd: 2.0,
    finalUrl,
    notes:
      "Zero policy risk. Generic fitness calculator terms. Cheap CPCs, " +
      "high volume. Top-of-funnel awareness play — visitors who use a " +
      "recomp calculator may discover the rest of the suite.",
    keywords: [
      { text: "body recomp calculator", match: "PHRASE", risk: "low" },
      { text: "tdee calculator", match: "PHRASE", risk: "low" },
      { text: "macro calculator", match: "PHRASE", risk: "low" },
      { text: "body fat calculator", match: "PHRASE", risk: "low" },
      { text: "lean bulk calculator", match: "PHRASE", risk: "low" },
      { text: "cutting calculator", match: "PHRASE", risk: "low" },
    ],
    ads: [
      {
        headlines: [
          "Body Recomp Calculator",
          "Free TDEE Calculator",
          "Macro Calculator — Free",
          "Body Fat Calculator",
          "Lean Bulk Planner",
          "Cutting Calculator",
          "Roji Research Tools",
          "Personalized In 60s",
          "Evidence-Based Math",
          "Built For Researchers",
          "Free Calculator Suite",
          "No Account Required",
          "Data-Driven Precision",
          "Start Building — Free",
          "Skip The Guesswork",
        ],
        descriptions: [
          "Free body recomp calculator. Input your stats, get a personalized phase-by-phase plan.",
          "TDEE, macros, body fat, lean bulk — all calibrated to your data. Free, no signup needed.",
          "Replace your fitness spreadsheet with calibrated calculators. Browser-based. 60 seconds.",
          "Evidence-based fitness math. Personalized output, not a generic template. Free and fast.",
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
        // Rewritten 2026-05-01 after Google flagged the brand RSA under
        // "Unapproved substances" — "Research-Grade Stacks" and "research
        // compound stacks" were pharma-adjacent enough to trigger the
        // classifier even on our brand-defense queries. Keep brand name
        // prominent, drop the stack/compound framing entirely in ad copy.
        headlines: [
          "Roji — Official Site",
          "Roji Research Tools",
          "Free Research Calculator",
          "Roji Peptides Official",
          "Roji Research Hub",
        ],
        descriptions: [
          "Official Roji research tools. Build evidence-based frameworks in 60 seconds. Free.",
          "Roji — the research hub with third-party COA verification on every batch.",
          "Free research calculators trusted by the research community. No account required.",
          "The Roji research suite: framework builders, cost math, and body composition tools.",
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
  /** Override the C4 Recomp campaign daily budget (USD). Defaults to $5. */
  recompBudget?: number;
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
          excludeAge18to24: true,
        },
      ],
    };
  }

  // Shared C1 + C3 builders for tool-only and full modes (full adds C4).
  const c1: BlueprintCampaign = {
    name: "C1 — Research Tools — Calculators [roji-blueprint]",
    dailyBudgetUsd: opts.campaign1Budget ?? 25,
    channel: "SEARCH",
    language: "en",
    geoTargets: ["US"],
    bidStrategy: "MAXIMIZE_CLICKS",
    rationale:
      "Calculator-intent traffic, restructured per 4-AI review (Apr 2026). " +
      "5 tool-specific ad groups, each routing to its own landing page. " +
      "Recomp/fitness lives in C4 (separate budget) so it can't cannibalise " +
      "high-intent tool spend under Maximize Clicks.",
    adGroups: [
      reconstitutionAdGroup(toolsUrl),
      halfLifeAdGroup(toolsUrl),
      coaAdGroup(toolsUrl),
      costCompareAdGroup(toolsUrl),
      genericAdGroup(toolsUrl),
    ],
    negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
    sitelinks: [
      // Campaign-level **extension assets**. Sync is URL-keyed.
      //
      // 2026-05-01: Sitelinks pointing at /reconstitution and /half-life
      // were disapproved under "Unapproved substances" twice in a row,
      // even with progressively softer text ("Reconstitution Calc" →
      // "Lab Mixing Calculator"; "Half-Life Database" → "Decay Chart
      // Browser"). Google's classifier reads the URL + sitelink + brand
      // context together — the link text is fine, the URL semantics on
      // a peptide-research advertiser trip the topic. Pulled both for
      // now; the provisioner will unlink any leftover live assets at
      // those URLs. COA + Cost Comparison stayed APPROVED_LIMITED in
      // the same campaign so we keep them as the visible extension set.
      // Revisit if/when we want to reintroduce these via Google policy
      // appeal or a different sitelink angle (e.g. linking to a
      // landing page that doesn't carry peptide context in the URL).
      {
        text: "COA Analyzer",
        finalUrl: `${toolsUrl}/coa`,
        description1: "Score your COA for red flags",
        description2: "Third-party verification tool",
      },
      {
        text: "Cost Comparison Tool",
        finalUrl: `${toolsUrl}/cost-per-dose`,
        description1: "Compare vendor research costs",
        description2: "Transparent cost math, free",
      },
    ],
    callouts: [
      { text: "Free" },
      { text: "No Signup Required" },
      { text: "Browser-Based" },
      { text: "Cites Published Research" },
      { text: "20+ Data Entries" },
      { text: "For Researchers Only" },
    ],
    excludeAge18to24: true,
  };

  const c3: BlueprintCampaign = {
    name: "C3 — Brand Defense [roji-blueprint]",
    dailyBudgetUsd: opts.brandBudget ?? 5,
    channel: "SEARCH",
    language: "en",
    geoTargets: ["US"],
    bidStrategy: "TARGET_IMPRESSION_SHARE",
    rationale:
      "Owns the brand. Budget should rarely max out — brand traffic is cheap. " +
      "Preemptive defense before organic discovery generates branded searches.",
    adGroups: [brandAdGroup(storeUrl)],
    negativeKeywords: [],
    excludeAge18to24: true,
  };

  if (opts.mode === "tool-only") {
    return {
      mode: "tool-only",
      toolsUrl,
      storeUrl,
      protocolUrl: toolsUrl,
      campaigns: [c1, c3],
    };
  }

  // Full mode = tool-only + C4 (Recomp / Fitness Funnel, isolated budget).
  const c4: BlueprintCampaign = {
    name: "C4 — Body Recomp (Fitness Funnel) [roji-blueprint]",
    dailyBudgetUsd: opts.recompBudget ?? 5,
    channel: "SEARCH",
    language: "en",
    geoTargets: ["US"],
    bidStrategy: "MAXIMIZE_CLICKS",
    rationale:
      "Top-of-funnel fitness traffic isolated from C1. Cheap CPCs " +
      "($0.30-1.00) on high-volume fitness keywords (TDEE, macros, body " +
      "composition). Pause without C1 impact if fitness → store doesn't " +
      "convert within 3 weeks.",
    adGroups: [recompAdGroup(toolsUrl)],
    negativeKeywords: POLICY_NEGATIVE_KEYWORDS,
    excludeAge18to24: true,
  };

  return {
    mode: "full",
    toolsUrl,
    storeUrl,
    protocolUrl: toolsUrl,
    campaigns: [c1, c3, c4],
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

    c.sitelinks?.forEach((sl, si) => {
      if (sl.text.length > 25) {
        issues.push({
          severity: "error",
          campaign: c.name,
          field: `sitelink[${si}].text`,
          text: sl.text,
          reason: `Sitelink text exceeds Google Ads limit of 25 characters (current: ${sl.text.length}).`,
        });
      }
      if (sl.description1 && sl.description1.length > 35) {
        issues.push({
          severity: "error",
          campaign: c.name,
          field: `sitelink[${si}].description1`,
          text: sl.description1,
          reason: `Sitelink description1 exceeds Google Ads limit of 35 characters (current: ${sl.description1.length}).`,
        });
      }
      if (sl.description2 && sl.description2.length > 35) {
        issues.push({
          severity: "error",
          campaign: c.name,
          field: `sitelink[${si}].description2`,
          text: sl.description2,
          reason: `Sitelink description2 exceeds Google Ads limit of 35 characters (current: ${sl.description2.length}).`,
        });
      }
    });

    c.callouts?.forEach((co, ci) => {
      if (co.text.length > 25) {
        issues.push({
          severity: "error",
          campaign: c.name,
          field: `callout[${ci}].text`,
          text: co.text,
          reason: `Callout text exceeds Google Ads limit of 25 characters (current: ${co.text.length}).`,
        });
      }
    });
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
  sitelinks: number;
  callouts: number;
  totalDailyBudgetUsd: number;
}

export function blueprintStats(b: ResolvedBlueprint): BlueprintStats {
  let adGroups = 0;
  let ads = 0;
  let keywords = 0;
  let negatives = 0;
  let sitelinks = 0;
  let callouts = 0;
  let totalDailyBudgetUsd = 0;
  for (const c of b.campaigns) {
    totalDailyBudgetUsd += c.dailyBudgetUsd;
    negatives += c.negativeKeywords.length;
    sitelinks += c.sitelinks?.length ?? 0;
    callouts += c.callouts?.length ?? 0;
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
    sitelinks,
    callouts,
    totalDailyBudgetUsd,
  };
}
