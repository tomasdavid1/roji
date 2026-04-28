/**
 * GET/POST /api/cron/check-disapprovals
 *
 * Hourly job that pulls all currently-disapproved ads and (per the
 * strategy doc) auto-pauses them to prevent account contamination
 * from a disapproval cascade.
 *
 * The response includes the list of paused ads so a downstream
 * notification step (Slack/email) can surface them; that's wired
 * later if/when you add a notification channel.
 */

import { NextResponse } from "next/server";
import { getDisapprovedAds, pauseDisapprovedAds, apiMode } from "@/lib/google-ads";
import { isAuthorizedCron, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run() {
  const startedAt = new Date().toISOString();
  const disapproved = await getDisapprovedAds();
  let pausedCount = 0;
  if (disapproved.length > 0) {
    const result = await pauseDisapprovedAds();
    pausedCount = result.paused;
  }
  return {
    ok: true,
    api_mode: apiMode(),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    disapproved_count: disapproved.length,
    paused_count: pausedCount,
    disapproved,
  };
}

export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) return unauthorizedResponse();
  try {
    return NextResponse.json(await run());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
