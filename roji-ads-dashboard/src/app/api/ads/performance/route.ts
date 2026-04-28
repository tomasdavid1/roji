import { NextResponse } from "next/server";
import { getCampaignPerformance, type DateRange } from "@/lib/google-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ??
    "LAST_30_DAYS") as DateRange;
  try {
    const rows = await getCampaignPerformance(range);
    const totals = rows.reduce(
      (acc, r) => {
        acc.impressions += r.impressions;
        acc.clicks += r.clicks;
        acc.cost_usd += r.cost_usd;
        acc.conversions += r.conversions;
        return acc;
      },
      { impressions: 0, clicks: 0, cost_usd: 0, conversions: 0 },
    );
    const cpa =
      totals.conversions > 0 ? totals.cost_usd / totals.conversions : 0;
    return NextResponse.json({
      range,
      totals: { ...totals, cost_per_conversion_usd: cpa },
      rows,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
