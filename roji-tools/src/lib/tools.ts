/**
 * Single source of truth for the suite of marketing tools.
 *
 * Each tool registers a slug, the route segment under /tools-app,
 * a short title, a one-line tagline, the SEO keyword cluster it
 * targets, an ad-safety rating, and a launch status.
 *
 * The home page, header dropdown, footer, and "More tools" panels
 * on each calculator all read from this list — so adding a new
 * tool only requires:
 *
 *   1. A new route under src/app/<slug>/page.tsx
 *   2. A new entry in this array
 *
 * No copy-paste of nav/links anywhere.
 */
export type ToolStatus = "live" | "beta" | "soon";
export type AdSafety = "google_meta" | "google_only" | "organic_only";

export interface Tool {
  slug: string;
  href: string;
  title: string;
  shortTitle: string;
  tagline: string;
  category: "Calculators" | "Research" | "Verification" | "AI";
  status: ToolStatus;
  adSafety: AdSafety;
  /** Human-readable list of search intents this tool ranks for. */
  searchIntents: readonly string[];
}

export const TOOLS: readonly Tool[] = [
  {
    slug: "reconstitution",
    href: "/reconstitution",
    title: "Peptide Reconstitution Calculator",
    shortTitle: "Reconstitution",
    tagline: "Convert vial mg + BAC water mL into mcg per insulin-syringe tick.",
    category: "Calculators",
    status: "live",
    adSafety: "google_only",
    searchIntents: [
      "peptide reconstitution calculator",
      "how to reconstitute BPC-157",
      "BAC water calculator",
      "peptide mixing calculator",
      "reconstitution calculator mcg",
    ],
  },
  {
    slug: "half-life",
    href: "/half-life",
    title: "Compound Half-Life Database",
    shortTitle: "Half-Life",
    tagline: "Half-life, molecular weight, plasma decay. Cited from the literature.",
    category: "Research",
    status: "live",
    adSafety: "google_only",
    searchIntents: [
      "BPC-157 half-life",
      "CJC-1295 DAC half-life",
      "TB-500 half-life",
      "ipamorelin half-life",
      "compound half-life database",
    ],
  },
  {
    slug: "research",
    href: "/research",
    title: "Peptide Research Library",
    shortTitle: "Research Library",
    tagline: "Search published peer-reviewed studies. PubMed, made human-readable.",
    category: "Research",
    status: "live",
    adSafety: "google_only",
    searchIntents: [
      "BPC-157 studies",
      "TB-500 research",
      "peptide research papers",
      "CJC-1295 clinical trials",
    ],
  },
  {
    slug: "coa",
    href: "/coa",
    title: "COA Verifier",
    shortTitle: "COA Verifier",
    tagline: "Drop in any vendor's Certificate of Analysis. We translate + flag red flags.",
    category: "Verification",
    status: "live",
    adSafety: "google_only",
    searchIntents: [
      "how to read peptide COA",
      "is this COA legit",
      "verify peptide purity",
      "Janoshik COA explained",
    ],
  },
  {
    slug: "bloodwork",
    href: "/bloodwork",
    title: "Bloodwork Interpreter",
    shortTitle: "Bloodwork",
    tagline: "Drop in any blood panel. See where each marker falls vs reference ranges.",
    category: "Calculators",
    status: "live",
    adSafety: "google_meta",
    searchIntents: [
      "blood test results explained",
      "IGF-1 levels normal range",
      "testosterone levels by age",
      "how to read bloodwork",
      "free blood panel analyzer",
    ],
  },
  {
    slug: "recomp",
    href: "/recomp",
    title: "Body Recomp Calculator",
    shortTitle: "Recomp",
    tagline: "TDEE, macros, lean mass projection across 8 / 12 / 16-week timeframes.",
    category: "Calculators",
    status: "live",
    adSafety: "google_meta",
    searchIntents: [
      "body recomp calculator",
      "TDEE calculator",
      "lean bulk calculator",
      "body fat percentage calculator",
      "macro calculator for recomp",
    ],
  },
  {
    slug: "interactions",
    href: "/interactions",
    title: "Supplement Interaction Checker",
    shortTitle: "Interactions",
    tagline: "Pick what you take. We'll flag absorption conflicts and known interactions.",
    category: "Calculators",
    status: "live",
    adSafety: "google_meta",
    searchIntents: [
      "supplement interaction checker",
      "vitamins that don't mix",
      "zinc and iron timing",
      "supplement timing chart",
    ],
  },
  {
    slug: "cost-per-dose",
    href: "/cost-per-dose",
    title: "Cost-Per-Dose Comparison",
    shortTitle: "Cost / Dose",
    tagline: "Vial $, vial mg, target dose → real cost per dose. Compare any vendor.",
    category: "Calculators",
    status: "live",
    adSafety: "google_only",
    searchIntents: [
      "peptide cost calculator",
      "cost per mg peptide",
      "research compound price comparison",
    ],
  },
  {
    slug: "tracker",
    href: "/tracker",
    title: "Stack Tracker",
    shortTitle: "Tracker",
    tagline: "Private journal for your stack, dose schedule, and subjective metrics.",
    category: "Calculators",
    status: "beta",
    adSafety: "google_meta",
    searchIntents: [
      "biohacker stack tracker",
      "supplement tracker",
      "peptide journal",
    ],
  },
  {
    slug: "ai",
    href: "/ai",
    title: "AI Research Assistant",
    shortTitle: "AI Assistant",
    tagline: "Ask any peptide question. Cited answers from published literature only.",
    category: "AI",
    status: "beta",
    adSafety: "google_only",
    searchIntents: [
      "ai peptide research assistant",
      "peptide research chatbot",
    ],
  },
];

export function findTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function otherTools(currentSlug: string, n = 3): Tool[] {
  return TOOLS.filter((t) => t.slug !== currentSlug && t.status === "live").slice(0, n);
}

export const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL ?? "https://rojipeptides.com";
