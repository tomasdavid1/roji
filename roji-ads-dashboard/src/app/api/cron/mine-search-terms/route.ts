/**
 * POST/GET /api/cron/mine-search-terms
 *
 * Daily job that:
 *   1. Pulls the last-7-days search-terms report.
 *   2. Cross-references each term against the master negative-keyword list
 *      (lib/negative-keywords.ts).
 *   3. Auto-adds any matched negatives to the campaign(s) where they appeared,
 *      skipping ones already negated.
 *
 * Vercel Cron schedules this — see vercel.json.
 *
 * Manual trigger: `POST /api/ads/search-terms/mine` (different route, see
 * neighboring file).
 */

import { NextResponse } from "next/server";
import {
  identifyRiskySearchTerms,
  addCampaignNegativeKeywords,
  apiMode,
} from "@/lib/google-ads";
import { isAuthorizedCron, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run() {
  const startedAt = new Date().toISOString();
  const risky = await identifyRiskySearchTerms("LAST_7_DAYS");
  // Group new (not-already-negated) risky terms by campaign.
  const byCampaign = new Map<string, typeof risky>();
  for (const t of risky) {
    if (t.already_negated) continue;
    const arr = byCampaign.get(t.campaign_id) ?? [];
    arr.push(t);
    byCampaign.set(t.campaign_id, arr);
  }
  const results: Array<{
    campaign_id: string;
    campaign_name: string;
    added: number;
    skipped: number;
    terms: Array<{ term: string; matched: string[] }>;
  }> = [];
  let totalAdded = 0;
  for (const [campaignId, terms] of byCampaign) {
    // Dedupe negative specs (same negative can match multiple search terms).
    const uniqueNegs = new Map<string, (typeof terms)[number]["matched_negatives"][number]>();
    for (const t of terms) {
      for (const n of t.matched_negatives) {
        uniqueNegs.set(`${n.term}|${n.match}`, n);
      }
    }
    const result = await addCampaignNegativeKeywords(
      campaignId,
      Array.from(uniqueNegs.values()),
    );
    totalAdded += result.added;
    results.push({
      campaign_id: campaignId,
      campaign_name: terms[0].campaign_name,
      added: result.added,
      skipped: result.skipped,
      terms: terms.map((t) => ({
        term: t.search_term,
        matched: t.matched_negatives.map((n) => `${n.term} (${n.match})`),
      })),
    });
  }

  return {
    ok: true,
    api_mode: apiMode(),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    risky_terms_found: risky.length,
    total_negatives_added: totalAdded,
    by_campaign: results,
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

// Vercel Cron currently issues GET. Mirror the handler so the same job
// works whether it's invoked manually (POST) or by the platform (GET).
export async function GET(req: Request) {
  return POST(req);
}
