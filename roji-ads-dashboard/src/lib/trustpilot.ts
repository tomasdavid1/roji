/**
 * Trustpilot Business API client.
 *
 * Read-only summary fetcher for the dashboard. AFS invitations live on the
 * WordPress side (theme module) where the order data is — we don't try to
 * dual-source review sending.
 *
 * Falls back to mock data when env vars are missing, same pattern as
 * lib/google-ads.ts, so the dashboard runs out of the box.
 *
 * Endpoints used:
 *   - POST /v1/oauth/oauth-business-users-for-applications/accesstoken (auth)
 *   - GET  /v1/business-units/{id} (basic info)
 *   - GET  /v1/private/business-units/{id}/reviews (recent reviews)
 *
 * Server-only.
 */

import "server-only";

const REQUIRED_ENV = [
  "TRUSTPILOT_API_KEY",
  "TRUSTPILOT_API_SECRET",
  "TRUSTPILOT_BUSINESS_UNIT_ID",
] as const;

const PUBLIC_REQUIRED = ["TRUSTPILOT_BUSINESS_UNIT_ID"] as const;

export function isTrustpilotLive(): boolean {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}

/**
 * "Public" mode = we have the BU id but not API creds. We can still render
 * widget HTML and link to the public profile, but can't fetch reviews.
 */
export function isTrustpilotPublic(): boolean {
  return (
    PUBLIC_REQUIRED.every((k) => !!process.env[k]) && !isTrustpilotLive()
  );
}

export type TrustpilotMode = "mock" | "public" | "live";
export function trustpilotMode(): TrustpilotMode {
  if (isTrustpilotLive()) return "live";
  if (isTrustpilotPublic()) return "public";
  return "mock";
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface TrustpilotSummary {
  business_unit_id: string;
  display_name: string;
  trust_score: number; // 0–5
  number_of_reviews: number;
  stars: 1 | 2 | 3 | 4 | 5;
  profile_url: string;
}

export interface TrustpilotReview {
  id: string;
  stars: number;
  title: string;
  text: string;
  consumer_name: string;
  created_at: string; // ISO
  url: string;
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                   */
/* -------------------------------------------------------------------------- */

const MOCK_SUMMARY: TrustpilotSummary = {
  business_unit_id: "mock-bu-id",
  display_name: "Roji Peptides",
  trust_score: 4.6,
  number_of_reviews: 0,
  stars: 5,
  profile_url: "https://www.trustpilot.com/review/rojipeptides.com",
};

const MOCK_REVIEWS: TrustpilotReview[] = [];

/* -------------------------------------------------------------------------- */
/* OAuth — client credentials                                                  */
/* -------------------------------------------------------------------------- */

let _cachedToken: { token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && _cachedToken.expires_at > Date.now() + 30_000) {
    return _cachedToken.token;
  }
  const key = process.env.TRUSTPILOT_API_KEY!;
  const secret = process.env.TRUSTPILOT_API_SECRET!;
  const basic = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(
    "https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trustpilot OAuth failed (HTTP ${res.status}): ${body}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  _cachedToken = {
    token: data.access_token,
    expires_at: Date.now() + ttlMs,
  };
  return data.access_token;
}

async function authedGet(path: string): Promise<Response> {
  const token = await getAccessToken();
  const businessUserId = process.env.TRUSTPILOT_BUSINESS_USER_ID;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (businessUserId) {
    headers["x-business-user-id"] = businessUserId;
  }
  return fetch(`https://api.trustpilot.com${path}`, {
    headers,
    cache: "no-store",
  });
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export async function getReviewsSummary(): Promise<TrustpilotSummary> {
  if (!isTrustpilotLive()) return MOCK_SUMMARY;
  const buId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID!;
  const res = await authedGet(`/v1/business-units/${encodeURIComponent(buId)}`);
  if (!res.ok) {
    throw new Error(
      `[trustpilot] getReviewsSummary HTTP ${res.status}: ${await res.text()}`,
    );
  }
  const data = (await res.json()) as {
    id: string;
    displayName: string;
    name?: { identifying?: string };
    trustScore?: number;
    score?: { trustScore?: number; stars?: number };
    numberOfReviews?: { total?: number; usedForTrustScoreCalculation?: number };
    stars?: number;
    websiteUrl?: string;
    profileUrl?: string;
    links?: Array<{ rel?: string; href?: string }>;
  };
  const trustScore = data.score?.trustScore ?? data.trustScore ?? 0;
  const stars = (data.score?.stars ?? data.stars ?? 5) as 1 | 2 | 3 | 4 | 5;
  const numberOfReviews =
    data.numberOfReviews?.total ?? data.numberOfReviews?.usedForTrustScoreCalculation ?? 0;
  const profileUrl =
    data.profileUrl ??
    `https://www.trustpilot.com/review/${data.name?.identifying ?? ""}`;
  return {
    business_unit_id: data.id,
    display_name: data.displayName,
    trust_score: trustScore,
    number_of_reviews: numberOfReviews,
    stars,
    profile_url: profileUrl,
  };
}

export async function getRecentReviews(limit = 5): Promise<TrustpilotReview[]> {
  if (!isTrustpilotLive()) return MOCK_REVIEWS;
  const buId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID!;
  const res = await authedGet(
    `/v1/private/business-units/${encodeURIComponent(buId)}/reviews?perPage=${limit}&orderBy=createdat.desc`,
  );
  if (!res.ok) {
    throw new Error(
      `[trustpilot] getRecentReviews HTTP ${res.status}: ${await res.text()}`,
    );
  }
  const data = (await res.json()) as {
    reviews?: Array<{
      id: string;
      stars: number;
      title?: string;
      text?: string;
      consumer?: { displayName?: string };
      createdAt?: string;
      url?: string;
      links?: Array<{ rel?: string; href?: string }>;
    }>;
  };
  return (data.reviews ?? []).map((r) => ({
    id: r.id,
    stars: r.stars,
    title: r.title ?? "",
    text: r.text ?? "",
    consumer_name: r.consumer?.displayName ?? "Anonymous",
    created_at: r.createdAt ?? "",
    url:
      r.url ??
      r.links?.find((l) => l.rel === "self")?.href ??
      `https://www.trustpilot.com/reviews/${r.id}`,
  }));
}
