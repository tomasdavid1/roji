import { NextResponse } from "next/server";
import {
  createCampaign,
  getCampaignPerformance,
  type DateRange,
} from "@/lib/google-ads";
import { assertSafeAdCopy } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RANGES: DateRange[] = [
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "LAST_MONTH",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") ?? "LAST_30_DAYS") as DateRange;
  const dateRange = VALID_RANGES.includes(range) ? range : "LAST_30_DAYS";
  try {
    const rows = await getCampaignPerformance(dateRange);
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const budget = Number(b.daily_budget_usd);

  if (!name || name.length < 3) {
    return NextResponse.json(
      { error: "name is required (min 3 chars)" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(budget) || budget <= 0) {
    return NextResponse.json(
      { error: "daily_budget_usd must be > 0" },
      { status: 400 },
    );
  }

  try {
    assertSafeAdCopy({ name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Safety validation failed" },
      { status: 422 },
    );
  }

  try {
    const result = await createCampaign({ name, daily_budget_usd: budget });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create campaign" },
      { status: 500 },
    );
  }
}
