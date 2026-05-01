/**
 * Funnel data layer.
 *
 * Aggregates the conversion funnel defined in ADS-PLAYBOOK.md into a single
 * normalized shape per tool (and an "all tools" aggregate). Designed to
 * survive missing data sources gracefully — if GA4 isn't connected, the
 * mid-funnel steps come back as `null` rather than fabricating numbers.
 *
 * Funnel steps (per ADS-PLAYBOOK.md, lines 26-50):
 *
 *   1. Ad click            → Google Ads API           ✓ wired
 *   2. tool_view           → GA4 event                 ⚠ needs GA4 creds
 *   3. tool engagement     → GA4 event (per-tool)      ⚠ needs GA4 creds
 *   4. store_outbound_click→ GA4 event                 ⚠ needs GA4 creds
 *   5. add_to_cart         → Google Ads conversion     ✓ wired (if labels set)
 *   6. checkout_view       → GA4 event                 ⚠ needs GA4 creds
 *   7. purchase            → Google Ads conversion     ✓ wired
 *
 * Mid-funnel steps that depend on GA4 will return `null` until GA4 service
 * account credentials (`GA4_SERVICE_ACCOUNT_JSON` and `GA4_PROPERTY_ID`)
 * are configured. The UI is expected to render those steps as
 * "GA4 not connected" with a clear setup CTA.
 *
 * Server-only.
 */

import "server-only";
import {
  getCampaignPerformance,
  getKeywordPerformance,
  isLive as gadsIsLive,
  type DateRange,
} from "./google-ads";
import {
  isGa4Configured,
  getGa4ToolFunnelEvents,
  type Ga4FunnelStep,
} from "./ga4";

/* -------------------------------------------------------------------------- */
/* Tool registry                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The single source of truth for which tools exist, what URL slug they live
 * at, and which Google Ads ad-group routes traffic to them. If you rename
 * an ad group in `ads-blueprint.ts`, update the corresponding entry here.
 *
 * `adGroupNames` is a list (not a single name) because some tools have
 * historical ad groups that still hold conversion attribution we want to
 * include (e.g. AG3 paused but its clicks are part of the historical record).
 */
export interface ToolDefinition {
  /** Stable id used as the URL parameter for the funnel page. */
  id: string;
  /** Human-readable label shown in the dashboard selector. */
  label: string;
  /**
   * Path on tools.rojipeptides.com (no leading slash, no trailing slash).
   * Empty string for the root/homepage.
   */
  toolsPath: string;
  /**
   * Names of ad groups that route paid traffic into this tool. First name
   * is the canonical/current one; later names are historical aliases we
   * still want to roll up under this tool.
   */
  adGroupNames: string[];
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "reconstitution",
    label: "Reconstitution",
    toolsPath: "reconstitution",
    adGroupNames: ["AG-Reconstitution"],
  },
  {
    id: "half-life",
    label: "Half-Life",
    toolsPath: "half-life",
    adGroupNames: ["AG-HalfLife"],
  },
  {
    id: "coa",
    label: "COA Analyzer",
    toolsPath: "coa",
    adGroupNames: ["AG-COA"],
  },
  {
    id: "cost-per-dose",
    label: "Cost Compare",
    toolsPath: "cost-per-dose",
    adGroupNames: ["AG-CostCompare"],
  },
  {
    id: "recomp",
    label: "Body Recomp",
    toolsPath: "recomp",
    adGroupNames: ["AG-Recomp", "AG5 — Fitness Calculator Intent"],
  },
  {
    id: "generic",
    label: "Generic / Homepage",
    toolsPath: "",
    adGroupNames: [
      "AG-Generic",
      "AG3 — Biohacker Intent",
      "AG4 — Peptide Research Intent (experiment)",
    ],
  },
  {
    id: "brand",
    label: "Brand Defense",
    toolsPath: "",
    adGroupNames: ["AG-Brand — Defense"],
  },
];

export function findTool(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}

/* -------------------------------------------------------------------------- */
/* Funnel shape                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One funnel step. `null` count means the data source for this step is not
 * yet wired (e.g. GA4 service account missing). Distinct from `0`, which
 * means "wired and confirmed zero."
 */
export interface FunnelStep {
  id: string;
  label: string;
  /** Where the data comes from — shown to users in tooltips. */
  source: "google_ads" | "ga4" | "woocommerce";
  /** `null` = source not connected. `0` = confirmed zero. */
  count: number | null;
  /** Spend attributed to this step, if applicable. */
  cost_usd?: number;
  /** Helpful note shown on the step (e.g. "GA4 not connected"). */
  note?: string;
}

export interface FunnelData {
  /** Tool id this funnel is scoped to, or `"_all"` for the aggregate view. */
  tool_id: string;
  tool_label: string;
  date_range: DateRange;
  steps: FunnelStep[];
  /** Drop-off rates between consecutive defined steps. */
  drop_offs: Array<{
    from_step: string;
    to_step: string;
    /** Fraction kept (0..1). null when either side is null. */
    retention: number | null;
  }>;
  /** Total ad spend that fed into this funnel during the window. */
  total_spend_usd: number;
  /** Implied CAC = total_spend / purchase_count (null if no purchases). */
  implied_cac_usd: number | null;
  /** Source connectivity hints for the UI. */
  data_sources: {
    google_ads: "live" | "mock" | "missing";
    ga4: "live" | "missing";
    woocommerce: "live" | "missing";
  };
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Build the funnel for a single tool (or the aggregate when toolId omitted).
 *
 * Phase 1: paid steps come from Google Ads. Mid-funnel comes from GA4.
 * If GA4 isn't configured, the mid-funnel steps are `null` with a note.
 */
export async function getFunnelForTool(
  toolId: string,
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<FunnelData> {
  const tool = toolId === "_all" ? null : findTool(toolId);
  if (toolId !== "_all" && !tool) {
    throw new Error(`Unknown tool id: ${toolId}`);
  }

  const data_sources: FunnelData["data_sources"] = {
    google_ads: gadsIsLive() ? "live" : "mock",
    ga4: isGa4Configured() ? "live" : "missing",
    // No WooCommerce REST API wiring yet; reserve-order purchases come
    // through the Google Ads `purchase` conversion count for now.
    woocommerce: "missing",
  };

  /* ---- Step 1: ad clicks (Google Ads, ad-group level) ---------------- */
  // We use keyword_view rather than ad_group_view because keyword_view
  // returns granular per-keyword spend AND rolls up cleanly to ad_group.
  // Get all keyword rows once, then filter per tool.
  const kwRows = await getKeywordPerformance(dateRange);

  const matchAdGroup = (adGroupName: string): boolean => {
    if (!tool) return true;
    return tool.adGroupNames.includes(adGroupName);
  };

  const filtered = kwRows.filter((r) => matchAdGroup(r.ad_group_name));

  const ad_clicks = filtered.reduce((sum, r) => sum + r.clicks, 0);
  const ad_impressions = filtered.reduce((sum, r) => sum + r.impressions, 0);
  const ad_spend = filtered.reduce((sum, r) => sum + r.cost_usd, 0);
  const ad_conversions = filtered.reduce((sum, r) => sum + r.conversions, 0);

  /* ---- Steps 2-6: GA4 mid-funnel ------------------------------------- */
  // GA4 returns null per step if not configured. When configured, it
  // returns the count of each event for users whose session source
  // matched paid search AND whose landing page matches the tool's path.
  let ga4: Record<Ga4FunnelStep, number | null> = {
    tool_view: null,
    tool_engagement: null,
    store_outbound_click: null,
    add_to_cart: null,
    checkout_view: null,
  };
  if (isGa4Configured()) {
    try {
      ga4 = await getGa4ToolFunnelEvents({
        landingPath: tool ? tool.toolsPath : null,
        dateRange,
      });
    } catch (err) {
      // GA4 query failed — treat as missing so the UI flags it but
      // doesn't crash the page.
      console.error("[funnel] GA4 query failed:", err);
    }
  }

  /* ---- Step 7: purchase (Google Ads conversion count) ---------------- */
  // The `purchase` conversion fires on every reserve-order thank-you
  // page (per ADS-PLAYBOOK.md). Conversion count from Google Ads is
  // our best paid-attribution number until WC REST is wired.
  const purchases = ad_conversions; // already includes purchase conv

  /* ---- Compose steps ------------------------------------------------- */
  const steps: FunnelStep[] = [
    {
      id: "ad_click",
      label: "Ad click",
      source: "google_ads",
      count: ad_clicks,
      cost_usd: ad_spend,
      note:
        ad_impressions > 0 && ad_clicks > 0
          ? `${ad_impressions.toLocaleString()} impressions, ${(ad_clicks / ad_impressions * 100).toFixed(2)}% CTR`
          : ad_impressions > 0
            ? `${ad_impressions.toLocaleString()} impressions, 0% CTR`
            : undefined,
    },
    {
      id: "tool_view",
      label: "Tool view",
      source: "ga4",
      count: ga4.tool_view,
      note: ga4.tool_view === null ? "GA4 not connected" : undefined,
    },
    {
      id: "tool_engagement",
      label: "Tool used",
      source: "ga4",
      count: ga4.tool_engagement,
      note:
        ga4.tool_engagement === null
          ? "GA4 not connected"
          : "Any per-tool engagement event",
    },
    {
      id: "store_outbound",
      label: "Store CTA click",
      source: "ga4",
      count: ga4.store_outbound_click,
      note: ga4.store_outbound_click === null ? "GA4 not connected" : undefined,
    },
    {
      id: "add_to_cart",
      label: "Add to cart",
      source: "ga4",
      count: ga4.add_to_cart,
      note: ga4.add_to_cart === null ? "GA4 not connected" : undefined,
    },
    {
      id: "checkout_view",
      label: "Checkout view",
      source: "ga4",
      count: ga4.checkout_view,
      note: ga4.checkout_view === null ? "GA4 not connected" : undefined,
    },
    {
      id: "purchase",
      label: "Reserve order",
      source: "google_ads",
      count: purchases,
      note:
        purchases === 0
          ? "Zero conversions on this tool/window"
          : "Google Ads `purchase` conversion count",
    },
  ];

  /* ---- Drop-offs (only between defined steps) ------------------------ */
  const drop_offs: FunnelData["drop_offs"] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    drop_offs.push({
      from_step: a.id,
      to_step: b.id,
      retention:
        a.count === null || b.count === null
          ? null
          : a.count === 0
            ? 0
            : b.count / a.count,
    });
  }

  return {
    tool_id: toolId,
    tool_label: tool?.label ?? "All tools",
    date_range: dateRange,
    steps,
    drop_offs,
    total_spend_usd: ad_spend,
    implied_cac_usd: purchases > 0 ? ad_spend / purchases : null,
    data_sources,
  };
}

/**
 * Convenience: surface campaign-level totals for the funnel-page header
 * regardless of tool selection (you usually want both views available).
 */
export async function getCampaignTotalsForFunnel(
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<{
  campaigns: number;
  total_spend_usd: number;
  total_clicks: number;
  total_impressions: number;
  total_conversions: number;
}> {
  const rows = await getCampaignPerformance(dateRange);
  return {
    campaigns: rows.length,
    total_spend_usd: rows.reduce((s, r) => s + r.cost_usd, 0),
    total_clicks: rows.reduce((s, r) => s + r.clicks, 0),
    total_impressions: rows.reduce((s, r) => s + r.impressions, 0),
    total_conversions: rows.reduce((s, r) => s + r.conversions, 0),
  };
}
