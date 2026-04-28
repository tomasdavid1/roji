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
 *   3. notify_me_submit       — Coming Soon email captured
 *   4. more_tools_click       — cross-tool navigation
 *   5. store_outbound_click   — click on a StoreCTA going to the WP shop
 *   6. ai_message_sent        — AI Research Assistant interactions
 *   7. fake_order_started     — fake-checkout funnel kickoff
 *   8. fake_order_submitted   — fake-checkout funnel conversion
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
