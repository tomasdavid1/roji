import { NextRequest, NextResponse } from "next/server";

import { classifyHit, searchPubmed } from "@/lib/pubmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pubmed?q=...&limit=20&sort=relevance|date
 *
 * Wraps PubMed E-utilities so the browser doesn't hit them directly
 * (CORS) and so we can cache + classify hits server-side.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "Missing 'q' param" }, { status: 400 });
  }
  const limit = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")),
  );
  const sort = (req.nextUrl.searchParams.get("sort") ?? "relevance") as
    | "relevance"
    | "date";

  try {
    const hits = await searchPubmed(q, { limit, sort });
    return NextResponse.json(
      {
        query: q,
        count: hits.length,
        hits: hits.map((h) => ({ ...h, studyType: classifyHit(h) })),
      },
      {
        // Cache at the edge for 30 minutes — PubMed updates daily.
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400" },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 },
    );
  }
}
