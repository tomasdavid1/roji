/**
 * Affiliates metrics client.
 *
 * Reads from /wp-json/roji/v1/affiliates/metrics on the WP store, same
 * shared-secret auth as lib/subscriptions.ts.
 *
 * Server-only.
 */

import "server-only";

const REQUIRED_ENV = ["ROJI_STORE_URL", "ROJI_INTERNAL_API_TOKEN"] as const;

export function isAffLive(): boolean {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}

export interface TopAffiliate {
  id: number;
  name: string;
  code: string;
  clicks: number;
  lifetime_gross: number;
  lifetime_commission: number;
  tier_pct: number;
}

export interface AffiliateMetrics {
  enabled: boolean;
  currency: string;
  mode: "test" | "live";
  tier_default_pct: number;
  tier_2_pct: number;
  tier_2_threshold: number;
  tier_3_pct: number;
  tier_3_threshold: number;
  cookie_days: number;
  lock_days: number;
  affiliate_counts: {
    approved: number;
    pending: number;
  };
  commission_counts: {
    pending: number;
    approved: number;
    paid: number;
    reversed: number;
  };
  commission_amounts: {
    pending: number;
    approved: number;
    paid: number;
    reversed: number;
  };
  gmv_30d: number;
  top_affiliates: TopAffiliate[];
  as_of: string;
  source: "live" | "mock";
}

const MOCK: AffiliateMetrics = {
  enabled: false,
  currency: "USD",
  mode: "test",
  tier_default_pct: 10,
  tier_2_pct: 15,
  tier_2_threshold: 10000,
  tier_3_pct: 20,
  tier_3_threshold: 50000,
  cookie_days: 30,
  lock_days: 30,
  affiliate_counts: { approved: 0, pending: 0 },
  commission_counts: { pending: 0, approved: 0, paid: 0, reversed: 0 },
  commission_amounts: { pending: 0, approved: 0, paid: 0, reversed: 0 },
  gmv_30d: 0,
  top_affiliates: [],
  as_of: new Date().toISOString(),
  source: "mock",
};

export async function getAffiliateMetrics(): Promise<AffiliateMetrics> {
  if (!isAffLive()) return MOCK;
  const base = (process.env.ROJI_STORE_URL ?? "").replace(/\/$/, "");
  const token = process.env.ROJI_INTERNAL_API_TOKEN!;
  const url = `${base}/wp-json/roji/v1/affiliates/metrics`;
  const res = await fetch(url, {
    headers: {
      "X-Roji-Token": token,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `[affiliates] GET ${url} -> HTTP ${res.status}: ${await res.text()}`,
    );
  }
  const data = (await res.json()) as Omit<AffiliateMetrics, "source">;
  return { ...data, source: "live" };
}
