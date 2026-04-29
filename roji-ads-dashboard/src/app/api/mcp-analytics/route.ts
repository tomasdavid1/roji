import { NextResponse } from "next/server";

const MCP_URL = process.env.MCP_ANALYTICS_URL ?? "https://mcp.rojipeptides.com/api/analytics";
const MCP_TOKEN = process.env.MCP_ANALYTICS_TOKEN ?? "";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "100";
  const since = searchParams.get("since") ?? "";

  const url = new URL(MCP_URL);
  url.searchParams.set("limit", limit);
  if (since) url.searchParams.set("since", since);

  try {
    const headers: Record<string, string> = {};
    if (MCP_TOKEN) headers["Authorization"] = `Bearer ${MCP_TOKEN}`;

    const resp = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `MCP server returned ${resp.status}` },
        { status: resp.status },
      );
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach MCP server: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}
