/**
 * GA4 Data API client.
 *
 * Currently a stub: returns `null` for every metric until a service-account
 * JSON key and property id are provided via env vars. Once those are
 * configured, the real implementation queries the GA4 Data API for paid-
 * search-attributed funnel events, scoped to a specific landing page when
 * the funnel is per-tool.
 *
 * Required env (set on Vercel for the `roji-ads` project):
 *
 *   GA4_PROPERTY_ID=...                  # numeric, no "G-" prefix
 *   GA4_SERVICE_ACCOUNT_JSON=...         # full JSON key as a single env var
 *
 * The service account needs the **GA4 Viewer** role on the property
 * (Admin → Property Access Management → add the service account email
 * with Viewer permission).
 *
 * Server-only.
 */

import "server-only";
import type { DateRange } from "./google-ads";

export type Ga4FunnelStep =
  | "tool_view"
  | "tool_engagement"
  | "store_outbound_click"
  | "add_to_cart"
  | "checkout_view";

const GA4_REQUIRED_ENV = ["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_JSON"] as const;

export function isGa4Configured(): boolean {
  return GA4_REQUIRED_ENV.every((k) => !!process.env[k]);
}

/**
 * Map our DateRange enum to GA4 Data API date strings.
 * GA4 accepts `today`, `yesterday`, `NdaysAgo`, or `YYYY-MM-DD`.
 */
function ga4DateRange(d: DateRange): { startDate: string; endDate: string } {
  switch (d) {
    case "TODAY":
      return { startDate: "today", endDate: "today" };
    case "YESTERDAY":
      return { startDate: "yesterday", endDate: "yesterday" };
    case "LAST_7_DAYS":
      return { startDate: "7daysAgo", endDate: "today" };
    case "LAST_14_DAYS":
      return { startDate: "14daysAgo", endDate: "today" };
    case "LAST_30_DAYS":
      return { startDate: "30daysAgo", endDate: "today" };
    case "THIS_MONTH":
      return { startDate: "30daysAgo", endDate: "today" };
    case "LAST_MONTH":
      return { startDate: "60daysAgo", endDate: "30daysAgo" };
    default:
      return { startDate: "30daysAgo", endDate: "today" };
  }
}

/**
 * Per-tool engagement event names emitted by `roji-tools` via
 * `lib/track.ts`. Listed once here so the funnel can sum any of them
 * as "tool used."
 *
 * Source of truth: roji-tools/src/components/* — grep for `track(`.
 * Keep in sync. If a new tool fires a new engagement event, add it
 * here so the funnel attributes it correctly.
 */
const TOOL_ENGAGEMENT_EVENTS = [
  "recomp_calculated",
  "bloodwork_panel_saved",
  "coa_analyzed",
  "recon_preset_click",
  "research_search",
  "ai_message_sent",
  "notify_me_submit",
  "notify_me_open",
  "cost_add_row",
  "tracker_item_added",
  "tracker_dose_logged",
  "interactions_toggle",
  "tool_complete",
  // Funnel-specific actions that should count as "engaged" for the
  // first-click metric. A user who clicks the hero tool picker has
  // self-routed; that's engagement.
  "hero_tool_pick",
  "directory_card_click",
] as const;

interface FunnelQueryArgs {
  /**
   * Tool path on tools.rojipeptides.com (no leading slash). Empty string
   * = root/aggregate. `null` = no path filter (all tools combined).
   */
  landingPath: string | null;
  dateRange: DateRange;
}

/**
 * Returns paid-search-attributed event counts per funnel step, scoped to
 * a specific landing page when `landingPath` is provided.
 *
 * Stub today: returns `null` for every step. The skeleton below is the
 * reference implementation we'll un-comment once GA4 creds are populated;
 * keeping it in source so the credential setup is the only step left.
 */
export async function getGa4ToolFunnelEvents(
  args: FunnelQueryArgs,
): Promise<Record<Ga4FunnelStep, number | null>> {
  if (!isGa4Configured()) {
    return {
      tool_view: null,
      tool_engagement: null,
      store_outbound_click: null,
      add_to_cart: null,
      checkout_view: null,
    };
  }

  // Real implementation. Lazy import so the dependency only loads when
  // creds are present (avoids a hard runtime require when the lib is
  // missing on a fresh checkout that hasn't run `npm install` yet).
  try {
    const mod = await import("@google-analytics/data");
    const { BetaAnalyticsDataClient } = mod as unknown as {
      BetaAnalyticsDataClient: new (opts: {
        credentials?: Record<string, unknown>;
      }) => {
        runReport: (req: unknown) => Promise<unknown>;
      };
    };
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON!);
    const client = new BetaAnalyticsDataClient({ credentials });
    const propertyPath = `properties/${process.env.GA4_PROPERTY_ID}`;
    const range = ga4DateRange(args.dateRange);

    // Build a session-medium filter for paid search.
    // GA4 reports paid-ads sessions with sessionMedium=cpc.
    const paidFilter = {
      filter: {
        fieldName: "sessionMedium",
        stringFilter: { matchType: "EXACT", value: "cpc" },
      },
    };

    // Optional landing-page filter (path-prefix match).
    const pathFilter = args.landingPath
      ? {
          filter: {
            fieldName: "landingPagePlusQueryString",
            stringFilter: {
              matchType: "BEGINS_WITH",
              value: `/${args.landingPath}`,
            },
          },
        }
      : null;

    const dimensionFilter = pathFilter
      ? { andGroup: { expressions: [paidFilter, pathFilter] } }
      : paidFilter;

    // Fetch event counts grouped by event name in one report; we then
    // bucket the rows into our 5 funnel-step counters. This is one
    // report instead of five — cheaper on quota, simpler to reason about.
    const [report] = (await client.runReport({
      property: propertyPath,
      dateRanges: [range],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter,
    })) as unknown as [
      {
        rows?: Array<{
          dimensionValues?: Array<{ value?: string }>;
          metricValues?: Array<{ value?: string }>;
        }>;
      },
    ];

    const out: Record<Ga4FunnelStep, number | null> = {
      tool_view: 0,
      tool_engagement: 0,
      store_outbound_click: 0,
      add_to_cart: 0,
      checkout_view: 0,
    };

    for (const row of report.rows ?? []) {
      const ev = row.dimensionValues?.[0]?.value ?? "";
      const n = Number(row.metricValues?.[0]?.value ?? 0);
      if (ev === "tool_view") out.tool_view! += n;
      // Both the canonical `store_outbound_click` and the variant CTAs
      // we added 2026-05-01 (`header_shop_click`, `hero_shop_click`)
      // count as outbound-to-store. They're fired by separate components
      // in roji-tools but represent the same funnel step.
      else if (
        ev === "store_outbound_click" ||
        ev === "header_shop_click" ||
        ev === "hero_shop_click"
      )
        out.store_outbound_click! += n;
      else if (ev === "add_to_cart") out.add_to_cart! += n;
      else if (ev === "checkout_view" || ev === "begin_checkout")
        out.checkout_view! += n;
      else if ((TOOL_ENGAGEMENT_EVENTS as readonly string[]).includes(ev))
        out.tool_engagement! += n;
    }

    return out;
  } catch (err) {
    // Don't fail the page render — return nulls + log so the dashboard
    // still works while the operator fixes the GA4 connection.
    console.error("[ga4] runReport failed:", err);
    return {
      tool_view: null,
      tool_engagement: null,
      store_outbound_click: null,
      add_to_cart: null,
      checkout_view: null,
    };
  }
}
