import { NextResponse } from "next/server";
import { setCampaignBudget, setCampaignStatus } from "@/lib/google-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const updates: { status?: "ENABLED" | "PAUSED"; daily_budget_usd?: number } = {};

  if (b.status === "ENABLED" || b.status === "PAUSED") {
    updates.status = b.status;
  }
  if (typeof b.daily_budget_usd === "number" && b.daily_budget_usd > 0) {
    updates.daily_budget_usd = b.daily_budget_usd;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid updates supplied (status | daily_budget_usd)" },
      { status: 400 },
    );
  }

  try {
    if (updates.status) {
      await setCampaignStatus(id, updates.status);
    }
    if (updates.daily_budget_usd !== undefined) {
      await setCampaignBudget(id, updates.daily_budget_usd);
    }
    return NextResponse.json({ ok: true, id, updates });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}
