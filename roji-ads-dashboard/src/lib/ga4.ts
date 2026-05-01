/**
 * GA4 Data API client.
 *
 * Authentication: OAuth refresh token (NOT service-account JSON), so this
 * works under organizations that enforce
 * `iam.disableServiceAccountKeyCreation`. Reuses the same OAuth client
 * that powers Google Ads (GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_CLIENT_SECRET);
 * we just mint a separate refresh token scoped to GA4 read-only.
 *
 * Required env (set on Vercel for the `roji-ads` project):
 *
 *   GA4_PROPERTY_ID=...        # numeric, NOT the "G-XXX" measurement id
 *   GA4_REFRESH_TOKEN=...      # from `node scripts/get-ga4-refresh-token.js`
 *
 * Reused (already set for Google Ads):
 *
 *   GOOGLE_ADS_CLIENT_ID=...
 *   GOOGLE_ADS_CLIENT_SECRET=...
 *
 * Returns `null` for every metric while creds are missing so the funnel
 * page renders dashed placeholders instead of fabricated zeros.
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

const GA4_REQUIRED_ENV = [
  "GA4_PROPERTY_ID",
  "GA4_REFRESH_TOKEN",
  // Reuse the Google Ads OAuth client. If you somehow set GA4 creds
  // without Google Ads ones, the funnel page will detect this and show
  // a clear error instead of mock data.
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
] as const;

export function isGa4Configured(): boolean {
  return GA4_REQUIRED_ENV.every((k) => !!process.env[k]);
}

/**
 * Mint a short-lived access token from our long-lived refresh token.
 * Cached for ~50 min (access tokens last 60 min). No external dep —
 * just a POST to the OAuth token endpoint.
 */
let _cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedAccessToken && now < _cachedAccessToken.expiresAt - 60_000) {
    return _cachedAccessToken.token;
  }
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    refresh_token: process.env.GA4_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`GA4 OAuth refresh failed: ${resp.status} ${txt}`);
  }
  const json = (await resp.json()) as {
    access_token: string;
    expires_in: number;
  };
  _cachedAccessToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return json.access_token;
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

  // Direct REST call to the GA4 Data API. We avoid the
  // `@google-analytics/data` SDK because (a) it expects a service
  // account or ADC and (b) the REST endpoint is dead simple and
  // already authenticated via our existing OAuth refresh token.
  try {
    const accessToken = await getAccessToken();
    const propertyId = process.env.GA4_PROPERTY_ID!;
    const range = ga4DateRange(args.dateRange);

    // Paid-traffic filter. GA4 ideally tags paid clicks as
    // sessionMedium=cpc, but only AFTER the Google Ads ↔ GA4 link is
    // active in Admin. Until then, paid sessions land in (not set) /
    // (direct) / referral. To stay useful in both pre- and post-link
    // states we accept any of:
    //   - sessionMedium = cpc | ppc | paid
    //   - firstUserMedium = cpc | ppc | paid (some referrers downgrade)
    //   - sessionGoogleAdsCampaignName != "(not set)"  (gclid resolved)
    //
    // OR a wide-net mode: when no Ads link exists yet we don't filter
    // at all — that's strictly worse for organic-vs-paid attribution
    // but at least surfaces SOMETHING in the funnel mid-steps.
    // Controlled by GA4_PAID_FILTER env (default = "lenient" while the
    // Ads link is being wired; flip to "strict" once attribution works).
    const paidMode = process.env.GA4_PAID_FILTER ?? "lenient";

    const paidFilter =
      paidMode === "strict"
        ? {
            filter: {
              fieldName: "sessionMedium",
              stringFilter: { matchType: "EXACT", value: "cpc" },
            },
          }
        : {
            orGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: "sessionMedium",
                    inListFilter: { values: ["cpc", "ppc", "paid"] },
                  },
                },
                {
                  filter: {
                    fieldName: "firstUserMedium",
                    inListFilter: { values: ["cpc", "ppc", "paid"] },
                  },
                },
                {
                  filter: {
                    fieldName: "sessionGoogleAdsCampaignName",
                    stringFilter: {
                      matchType: "BEGINS_WITH",
                      value: "C",
                    },
                  },
                },
              ],
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

    // Use the realtime endpoint when caller asks for TODAY — GA4's
    // daily aggregate has a 24-48h lag for new properties, but
    // realtime is, well, real time.
    const useRealtime = args.dateRange === "TODAY";
    const reportUrl = useRealtime
      ? `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`
      : `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    // The realtime endpoint doesn't accept dateRanges (it's always
    // last 30 min) and DOES NOT support sessionMedium / paid filtering
    // (those dimensions only exist on the standard report). For
    // realtime we just fetch all events; the funnel will show "today
    // so far, all sources" rather than "today paid only". Acceptable
    // tradeoff for the mid-funnel — the Ad-click step is already
    // sourced from Google Ads (paid by definition).
    const reportBody = useRealtime
      ? {
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          // Realtime supports a path filter on `unifiedScreenName`
          // but not landingPagePlusQueryString, so skip the path
          // filter for realtime — the per-tool view will be slightly
          // over-attributed for TODAY only. Acceptable.
        }
      : {
          dateRanges: [range],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter,
        };

    const resp = await fetch(reportUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportBody),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`GA4 runReport failed: ${resp.status} ${txt}`);
    }

    const report = (await resp.json()) as {
      rows?: Array<{
        dimensionValues?: Array<{ value?: string }>;
        metricValues?: Array<{ value?: string }>;
      }>;
    };

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
