/**
 * GET  /api/ads/search-terms        — list risky search terms (read-only)
 * POST /api/ads/search-terms/mine   — manually trigger the mining job
 *
 * Both go through the dashboard's basic-auth middleware, so no separate
 * auth here.
 */

import { NextResponse } from "next/server";
import {
  identifyRiskySearchTerms,
  addCampaignNegativeKeywords,
} from "@/lib/google-ads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateRange =
    (url.searchParams.get("date_range") as
      | "LAST_7_DAYS"
      | "LAST_14_DAYS"
      | "LAST_30_DAYS"
      | null) ?? "LAST_7_DAYS";
  try {
    const risky = await identifyRiskySearchTerms(dateRange);
    return NextResponse.json({ ok: true, risky });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const risky = await identifyRiskySearchTerms("LAST_7_DAYS");
    const byCampaign = new Map<string, typeof risky>();
    for (const t of risky) {
      if (t.already_negated) continue;
      const arr = byCampaign.get(t.campaign_id) ?? [];
      arr.push(t);
      byCampaign.set(t.campaign_id, arr);
    }
    let totalAdded = 0;
    for (const [campaignId, terms] of byCampaign) {
      const unique = new Map<string, (typeof terms)[number]["matched_negatives"][number]>();
      for (const t of terms) {
        for (const n of t.matched_negatives) {
          unique.set(`${n.term}|${n.match}`, n);
        }
      }
      const r = await addCampaignNegativeKeywords(
        campaignId,
        Array.from(unique.values()),
      );
      totalAdded += r.added;
    }
    return NextResponse.json({ ok: true, total_added: totalAdded });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
