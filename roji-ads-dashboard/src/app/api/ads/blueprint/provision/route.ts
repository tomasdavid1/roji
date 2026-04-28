import { NextResponse } from "next/server";

import {
  resolveBlueprint,
  type BlueprintMode,
} from "@/lib/ads-blueprint";
import { provisionBlueprint } from "@/lib/ads-provisioner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReqBody {
  mode?: unknown;
  dry_run?: unknown;
  protocol_url?: unknown;
  store_url?: unknown;
  campaign1_budget?: unknown;
  brand_budget?: unknown;
}

const VALID_MODES: BlueprintMode[] = ["tool-only", "full"];

export async function POST(req: Request) {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = (typeof body.mode === "string" ? body.mode : "tool-only") as BlueprintMode;
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${VALID_MODES.join(", ")}` },
      { status: 400 },
    );
  }

  const dryRun = body.dry_run !== false; // default to dry-run for safety

  const blueprint = resolveBlueprint({
    mode,
    protocolUrl: typeof body.protocol_url === "string" ? body.protocol_url : undefined,
    storeUrl: typeof body.store_url === "string" ? body.store_url : undefined,
    campaign1Budget:
      typeof body.campaign1_budget === "number" && body.campaign1_budget > 0
        ? body.campaign1_budget
        : undefined,
    brandBudget:
      typeof body.brand_budget === "number" && body.brand_budget > 0
        ? body.brand_budget
        : undefined,
  });

  try {
    const result = await provisionBlueprint(blueprint, { dryRun });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provision failed." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  // Convenience: ?mode=tool-only returns a dry-run preview without
  // requiring a POST body. Useful for the campaigns-page UI.
  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") ?? "tool-only") as BlueprintMode;
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${VALID_MODES.join(", ")}` },
      { status: 400 },
    );
  }
  const blueprint = resolveBlueprint({ mode });
  try {
    const result = await provisionBlueprint(blueprint, { dryRun: true });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Preview failed." },
      { status: 500 },
    );
  }
}
