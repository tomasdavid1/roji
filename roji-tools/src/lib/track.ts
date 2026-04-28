/**
 * Tiny gtag wrapper. Fires custom events to GA4 + Google Ads.
 * No-op on the server and when no measurement IDs are configured.
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
  window.gtag("event", event, params);
}
