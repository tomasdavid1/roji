/**
 * Directory-page registry — the 8 cards on the Research Tools homepage.
 *
 * Separate from `lib/tools.ts` (which is the richer registry powering
 * the header dropdown, "more tools" suggestions, and per-tool SEO).
 * This file is the *Google-Ads-compliant projection* of the catalog:
 *
 *   - Tool names + descriptions are the verbatim copy from the
 *     compliance brief.
 *   - Compound names are intentionally absent.
 *   - "live" vs "soon" is curated from the brief, NOT inherited
 *     from the broader tools.ts (some tools that are technically
 *     live in this app are still surfaced as COMING SOON on the
 *     directory page so the page matches the spec exactly and
 *     the email-capture funnel remains active).
 *
 * To promote a SOON tool to LIVE on the directory: change its
 * `status` here. Internal tool pages remain reachable regardless.
 */

import type { IconKey } from "@/components/ToolIcon";

export type DirectoryStatus = "live" | "soon";

export interface DirectoryTool {
  /** Stable identifier used in the email-capture endpoint and analytics. */
  slug: string;
  /** Internal route on tools.rojipeptides.com (relative). */
  href: string;
  /** Card title — directly per spec, no compound names. */
  name: string;
  /** Card description — directly per spec. */
  description: string;
  /** Visual + interaction state. */
  status: DirectoryStatus;
  /** Lucide icon key. */
  icon: IconKey;
}

export const DIRECTORY_TOOLS: readonly DirectoryTool[] = [
  {
    slug: "reconstitution",
    href: "/reconstitution",
    name: "Reconstitution Calculator",
    description:
      "Calculate water volumes, concentrations, and syringe units for any vial size.",
    status: "live",
    icon: "calculator",
  },
  {
    slug: "half-life",
    href: "/half-life",
    name: "Half-Life Database",
    description:
      "Compare pharmacokinetic profiles and decay curves for 15+ research compounds.",
    status: "live",
    icon: "clock",
  },
  {
    slug: "coa-analyzer",
    href: "/coa",
    name: "COA Analyzer",
    description:
      "Upload any Certificate of Analysis. Check purity, lab accreditation, and red flags.",
    status: "live",
    icon: "shieldCheck",
  },
  {
    slug: "cost-calculator",
    href: "/cost-per-dose",
    name: "Cost-Per-Dose Calculator",
    description:
      "Calculate true cost per unit and compare individual compounds vs. bundled options.",
    status: "live",
    icon: "dollarSign",
  },
  {
    slug: "bloodwork",
    href: "/bloodwork",
    name: "Bloodwork Interpreter",
    description:
      "Visualize blood panel results against reference ranges. Plain-English explanations.",
    status: "live",
    icon: "activity",
  },
  {
    slug: "recomp",
    href: "/recomp",
    name: "Body Recomp Calculator",
    description:
      "TDEE, macros, and projected body composition changes over 8–24 weeks.",
    status: "live",
    icon: "trendingUp",
  },
  {
    slug: "research",
    href: "/research",
    name: "Research Database",
    description:
      "Search curated, peer-reviewed studies with plain-English summaries and PubMed links.",
    status: "live",
    icon: "bookOpen",
  },
  {
    slug: "tracker",
    href: "/tracker",
    name: "Stack Tracker",
    description:
      "Log your stack, track subjective metrics, and visualize trends over time.",
    status: "soon",
    icon: "clipboardList",
  },
];

/** Validation set used by the /api/notify-me endpoint. */
export const DIRECTORY_SLUGS = new Set(DIRECTORY_TOOLS.map((t) => t.slug));
