import { NextResponse } from "next/server";

import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test-mode lead capture for the protocol engine. Used while products
 * aren't yet listed: the wizard still produces a recommendation and the
 * user can opt in to be notified when the stack ships. We deliberately
 * keep this dependency-free so it works on Vercel today without an ESP
 * or DB.
 *
 * Storage strategy (in priority order):
 *   1. POST to ROJI_LEAD_WEBHOOK_URL if set (Slack / Zapier / a simple
 *      Cloudflare Worker that writes to D1 — your call).
 *   2. Append to LEAD_LOG_FILE on disk (works on local + Vercel /tmp; on
 *      /tmp it's ephemeral, which is fine because the webhook should be
 *      the real store).
 *   3. Always console.log so production logs capture every lead even if
 *      everything else fails silently.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadBody {
  email?: unknown;
  stack?: unknown;
}

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const stack = typeof body.stack === "string" ? body.stack.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 422 },
    );
  }
  if (!stack || stack.length > 64) {
    return NextResponse.json(
      { error: "Missing or invalid stack reference." },
      { status: 422 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const ts = new Date().toISOString();

  const record = {
    ts,
    email,
    stack,
    ip,
    user_agent: userAgent,
  };

  console.log("[roji-protocol] lead_capture", JSON.stringify(record));

  const webhook = process.env.ROJI_LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.warn("[roji-protocol] lead webhook failed", err);
    }
  }

  const logFile =
    process.env.LEAD_LOG_FILE ??
    (process.env.VERCEL ? "/tmp/roji-leads.jsonl" : ".roji-leads.jsonl");
  try {
    await fs.appendFile(
      path.resolve(logFile),
      JSON.stringify(record) + "\n",
      "utf8",
    );
  } catch (err) {
    console.warn("[roji-protocol] lead file append failed", err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
