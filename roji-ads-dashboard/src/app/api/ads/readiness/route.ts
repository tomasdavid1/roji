import { NextResponse } from "next/server";

import { apiMode, isLive } from "@/lib/google-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  detail: string;
}

interface ReadinessReport {
  api_mode: ReturnType<typeof apiMode>;
  ready_to_provision: boolean;
  /** True if the protocol engine is running in test/lead-capture mode. */
  protocol_test_mode: boolean;
  checks: Record<string, CheckResult>;
}

/**
 * Pre-flight check the dashboard renders before letting you press
 * "Provision blueprint live." Saves a Google-side error round-trip.
 *
 * We deliberately do NOT call the Ads API here — readiness should be
 * fast and not consume API quota. Callers can hit the conversion
 * actions / customer endpoints separately if they want richer data.
 */
export async function GET() {
  const env = process.env;

  const checks: Record<string, CheckResult> = {
    developer_token: boolish(
      !!env.GOOGLE_ADS_DEVELOPER_TOKEN,
      "GOOGLE_ADS_DEVELOPER_TOKEN is set.",
      "GOOGLE_ADS_DEVELOPER_TOKEN missing — set this in Vercel + .env.local.",
    ),
    oauth_credentials: boolish(
      !!env.GOOGLE_ADS_CLIENT_ID && !!env.GOOGLE_ADS_CLIENT_SECRET,
      "OAuth client ID + secret present.",
      "GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET missing.",
    ),
    refresh_token: boolish(
      !!env.GOOGLE_ADS_REFRESH_TOKEN,
      "Refresh token present.",
      "GOOGLE_ADS_REFRESH_TOKEN missing — re-run scripts/get-refresh-token.js.",
    ),
    customer_id: boolish(
      !!env.GOOGLE_ADS_CUSTOMER_ID,
      `Operating customer ID: ${env.GOOGLE_ADS_CUSTOMER_ID}`,
      "GOOGLE_ADS_CUSTOMER_ID missing.",
    ),
    mcc_link: boolish(
      !!env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      `Manager (MCC) login_customer_id: ${env.GOOGLE_ADS_LOGIN_CUSTOMER_ID}`,
      "GOOGLE_ADS_LOGIN_CUSTOMER_ID missing — recommended even if your operating account isn't under an MCC yet.",
    ),
    protocol_url: boolish(
      true,
      `Lands on ${env.NEXT_PUBLIC_PROTOCOL_URL ?? "https://protocol.rojipeptides.com"} (override with NEXT_PUBLIC_PROTOCOL_URL).`,
      "n/a",
    ),
  };

  const protocolTestMode = env.NEXT_PUBLIC_PROTOCOL_TEST_MODE === "1";
  checks.protocol_test_mode = boolish(
    protocolTestMode,
    "Protocol engine is in TEST mode — buy buttons are hidden, lead-capture is active. Safe to advertise pre-store.",
    "Protocol engine is in LIVE mode — buy buttons are visible. If you don't have products listed yet, set NEXT_PUBLIC_PROTOCOL_TEST_MODE=1 on the protocol app before launching ads.",
  );

  const ready =
    !!env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    !!env.GOOGLE_ADS_CLIENT_ID &&
    !!env.GOOGLE_ADS_CLIENT_SECRET &&
    !!env.GOOGLE_ADS_REFRESH_TOKEN &&
    !!env.GOOGLE_ADS_CUSTOMER_ID;

  const report: ReadinessReport = {
    api_mode: apiMode(),
    ready_to_provision: ready && isLive(),
    protocol_test_mode: protocolTestMode,
    checks,
  };
  return NextResponse.json(report);
}

function boolish(ok: boolean, okMsg: string, failMsg: string): CheckResult {
  return { ok, detail: ok ? okMsg : failMsg };
}
