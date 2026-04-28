/**
 * Research Tools registry — single source of truth.
 *
 * The directory page, the footer, and the SEO sitemap all read from this
 * list. Adding a new tool only requires appending to the array.
 *
 * `href` is built from TOOLS_BASE_URL so we can repoint everything via
 * env var. In production it's tools.rojipeptides.com; in dev it can be
 * pointed at localhost for QA.
 *
 * IMPORTANT: This page must remain Google-Ads-safe. That means tool
 * names and descriptions here must NOT include compound names, dosing
 * language, or therapeutic claims. Compound-specific copy belongs on
 * the individual tool pages, not in this directory.
 */

export const TOOLS_BASE_URL =
  process.env.NEXT_PUBLIC_TOOLS_URL ?? "https://tools.rojipeptides.com";

export const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL ?? "https://rojipeptides.com";

export type ToolStatus = "live" | "soon";

export type IconKey =
  | "calculator"
  | "clock"
  | "shieldCheck"
  | "dollarSign"
  | "activity"
  | "trendingUp"
  | "bookOpen"
  | "clipboardList";

export interface Tool {
  slug: string;
  name: string;
  description: string;
  status: ToolStatus;
  icon: IconKey;
  /** Path on tools.rojipeptides.com — used to build href when status === "live". */
  toolsPath: string;
}

export const TOOLS: readonly Tool[] = [
  {
    slug: "reconstitution",
    name: "Reconstitution Calculator",
    description:
      "Calculate water volumes, concentrations, and syringe units for any vial size.",
    status: "live",
    icon: "calculator",
    toolsPath: "/reconstitution",
  },
  {
    slug: "half-life",
    name: "Half-Life Database",
    description:
      "Compare pharmacokinetic profiles and decay curves for 15+ research compounds.",
    status: "live",
    icon: "clock",
    toolsPath: "/half-life",
  },
  {
    slug: "coa-analyzer",
    name: "COA Analyzer",
    description:
      "Upload any Certificate of Analysis. Check purity, lab accreditation, and red flags.",
    status: "live",
    icon: "shieldCheck",
    toolsPath: "/coa",
  },
  {
    slug: "cost-calculator",
    name: "Cost-Per-Dose Calculator",
    description:
      "Calculate true cost per unit and compare individual compounds vs. bundled options.",
    status: "live",
    icon: "dollarSign",
    toolsPath: "/cost-per-dose",
  },
  {
    slug: "bloodwork",
    name: "Bloodwork Interpreter",
    description:
      "Visualize blood panel results against reference ranges. Plain-English explanations.",
    status: "soon",
    icon: "activity",
    toolsPath: "/bloodwork",
  },
  {
    slug: "recomp",
    name: "Body Recomp Calculator",
    description:
      "TDEE, macros, and projected body composition changes over 8–24 weeks.",
    status: "soon",
    icon: "trendingUp",
    toolsPath: "/recomp",
  },
  {
    slug: "research",
    name: "Research Database",
    description:
      "Search curated, peer-reviewed studies with plain-English summaries and PubMed links.",
    status: "soon",
    icon: "bookOpen",
    toolsPath: "/research",
  },
  {
    slug: "tracker",
    name: "Stack Tracker",
    description:
      "Log compounds, track subjective metrics, and visualize trends over time.",
    status: "soon",
    icon: "clipboardList",
    toolsPath: "/tracker",
  },
];

export function toolHref(tool: Tool): string {
  return `${TOOLS_BASE_URL}${tool.toolsPath}`;
}
