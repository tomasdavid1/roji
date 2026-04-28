/**
 * Subscriptions metrics client.
 *
 * Reads aggregate subscription data from the Roji WordPress site via the
 * custom REST endpoint at `/wp-json/roji/v1/subscriptions/metrics`.
 *
 * Endpoint is auth'd via shared secret (ROJI_INTERNAL_API_TOKEN), set on
 * both ends as env vars / wp-config constants.
 *
 * Falls back to mock data when env vars are missing, same pattern as
 * lib/google-ads.ts / lib/trustpilot.ts.
 *
 * Server-only.
 */

import "server-only";

const REQUIRED_ENV = ["ROJI_STORE_URL", "ROJI_INTERNAL_API_TOKEN"] as const;

export function isSubsLive(): boolean {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}

export type SubsProvider = "wps_sfw" | "woocommerce_subscriptions" | "none";

export interface SubsCounts {
  active: number;
  "on-hold": number;
  cancelled: number;
  expired: number;
  pending: number;
}

export interface SubsCancellation {
  id: number;
  cancelled_at: string;
  amount: number;
}

export interface SubsMetrics {
  provider: SubsProvider;
  enabled: boolean;
  currency: string;
  mrr: number;
  arpu: number;
  churn_pct_30d: number;
  counts: SubsCounts;
  recent_cancellations: SubsCancellation[];
  as_of: string;
  /** Convenience: derived non-API fields. */
  source: "live" | "mock";
}

const MOCK: SubsMetrics = {
  provider: "wps_sfw",
  enabled: false,
  currency: "USD",
  mrr: 0,
  arpu: 0,
  churn_pct_30d: 0,
  counts: {
    active: 0,
    "on-hold": 0,
    cancelled: 0,
    expired: 0,
    pending: 0,
  },
  recent_cancellations: [],
  as_of: new Date().toISOString(),
  source: "mock",
};

/**
 * Fetch fresh metrics. Cached at the route level via Next.js
 * `revalidate` — call this from a server component with `dynamic = 'force-dynamic'`
 * if you want every load to be fresh.
 */
export async function getSubsMetrics(): Promise<SubsMetrics> {
  if (!isSubsLive()) return MOCK;
  const base = (process.env.ROJI_STORE_URL ?? "").replace(/\/$/, "");
  const token = process.env.ROJI_INTERNAL_API_TOKEN!;
  const url = `${base}/wp-json/roji/v1/subscriptions/metrics`;
  const res = await fetch(url, {
    headers: {
      "X-Roji-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `[subs] GET ${url} -> HTTP ${res.status}: ${await res.text()}`,
    );
  }
  const data = (await res.json()) as Omit<SubsMetrics, "source">;
  return { ...data, source: "live" };
}
