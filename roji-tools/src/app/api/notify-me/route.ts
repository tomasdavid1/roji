import { NextResponse } from "next/server";

import { promises as fs } from "fs";
import path from "path";

import { DIRECTORY_SLUGS } from "@/lib/directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email capture for "Coming Soon" tools on the directory page.
 *
 * Writes leads to /tmp/roji-notify-me/leads.jsonl (Vercel function tmp
 * is per-invocation but persists for the function lifetime; the
 * canonical source of truth is whatever ESP we wire in later — see
 * FOLLOWUPS.md).
 *
 * Dependency-free on purpose: this endpoint must work the moment
 * the page ships. Once you have Brevo / Mailchimp / Resend keys,
 * forward each capture to that provider here and remove the file
 * write.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NotifyMeBody {
  email?: unknown;
  toolSlug?: unknown;
}

export async function POST(request: Request) {
  let body: NotifyMeBody;
  try {
    body = (await request.json()) as NotifyMeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const toolSlug =
    typeof body.toolSlug === "string" ? body.toolSlug.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }
  if (!toolSlug || !DIRECTORY_SLUGS.has(toolSlug)) {
    return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
  }

  const record = {
    email,
    toolSlug,
    capturedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") ?? null,
  };

  // Best-effort file write. We don't fail the request if disk is
  // unavailable — the user's intent has been received and a real
  // ESP integration will replace this anyway.
  try {
    const dir = path.join("/tmp", "roji-notify-me");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "leads.jsonl");
    await fs.appendFile(file, JSON.stringify(record) + "\n", "utf8");
  } catch {
    /* swallow — see comment above */
  }

  // Log to stdout so it shows up in Vercel logs and can be forwarded
  // to a logging sink without code changes.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event: "notify_me_capture", ...record }));

  return NextResponse.json({ ok: true });
}
