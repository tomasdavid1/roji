import { NextResponse } from "next/server";
import { getKeywordPerformance, type DateRange } from "@/lib/google-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ??
    "LAST_30_DAYS") as DateRange;
  try {
    const rows = await getKeywordPerformance(range);
    return NextResponse.json({ range, rows });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
