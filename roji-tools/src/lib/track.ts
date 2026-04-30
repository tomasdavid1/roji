/**
 * Tiny gtag wrapper. Fires custom events to GA4 + Google Ads.
 * No-op on the server and when no measurement IDs are configured.
 *
 * Conventions
 * -----------
 * - Event names are snake_case, prefixed with the tool/feature name.
 * - Param keys are short and stable (we filter on them in GA4).
 * - We never send PII. Email captures, free-text inputs, and addresses
 *   are NOT included in event params — only counts, lengths, slugs.
 *
 * Funnel taxonomy (the events we track, in flow order)
 * -----------------------------------------------------
 *   1. tool_view              — any tool page mounted              (auto via <ToolView/>)
 *   2. <tool>_<action>        — meaningful in-tool action           (manual, per tool)
 *   3. tool_complete          — UNIFIED conversion event for Google Ads
 *                               optimization. Fired once per session per tool
 *                               at the moment the user "did the thing"
 *                               (calculator computed, panel saved, COA
 *                               analyzed, etc.). See toolComplete() below.
 *   4. notify_me_submit       — Coming Soon email captured
 *   5. more_tools_click       — cross-tool navigation
 *   6. store_outbound_click   — click on a StoreCTA going to the WP shop
 *   7. ai_message_sent        — AI Research Assistant interactions
 *   8. fake_order_started     — fake-checkout funnel kickoff
 *   9. fake_order_submitted   — fake-checkout funnel conversion
 *
 * Anything new should follow that <surface>_<verb> shape.
 */
type GtagEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params: GtagEventParams = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  // Strip undefined values so GA4 doesn't see them as "(not set)".
  const clean: GtagEventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v;
  }
  window.gtag("event", event, clean);
}

/**
 * Fire a Google Ads conversion. Reads NEXT_PUBLIC_GADS_ID + a label.
 * No-op if either is missing — handy until Google Ads is approved.
 */
export function conversion(
  label: string | undefined,
  params: GtagEventParams = {},
) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  const adsId = process.env.NEXT_PUBLIC_GADS_ID;
  if (!adsId || !label) return;
  window.gtag("event", "conversion", {
    send_to: `${adsId}/${label}`,
    ...params,
  });
}

/**
 * Resolve the tool-completion conversion label.
 *
 * Reads NEXT_PUBLIC_GADS_TOOL_COMPLETE_LABEL and falls back to the legacy
 * NEXT_PUBLIC_GADS_PROTOCOL_LABEL so existing Vercel envs keep working
 * during the rename. See roji-ads-dashboard/src/lib/env.ts for the
 * matching helper on the dashboard side.
 */
function toolCompleteLabel(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GADS_TOOL_COMPLETE_LABEL ||
    process.env.NEXT_PUBLIC_GADS_PROTOCOL_LABEL ||
    undefined
  );
}

/**
 * Fire the unified `tool_complete` macro-event AND the matching Google
 * Ads conversion in one call.
 *
 * NOT CURRENTLY WIRED. The Google Ads campaign optimizes against the
 * `purchase` event on the WooCommerce thank-you page (reserve-order
 * funnel), not against tool completion — tool engagement is a poor
 * proxy for buying intent. This helper exists for future use if we
 * ever want a softer mid-funnel optimization signal (e.g. a separate
 * lead-gen campaign).
 *
 * If you wire it in, call once per session per tool at the moment the
 * user clearly "did the thing" (calculator computed, panel saved, COA
 * analyzed, etc.). Per-tool detail events (`recomp_calculated`, etc.)
 * stay as the GA4 funnel-analysis layer.
 *
 * @param toolSlug e.g. "recomp", "bloodwork", "coa". Recorded as `tool`
 *                 param so GA4 can break it down.
 * @param extra    Optional non-PII params (counts, slugs, scores).
 */
export function toolComplete(
  toolSlug: string,
  extra: GtagEventParams = {},
) {
  track("tool_complete", { tool: toolSlug, ...extra });
  conversion(toolCompleteLabel(), { tool: toolSlug });
}
