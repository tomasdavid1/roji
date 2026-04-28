/**
 * Cron / API auth helper.
 *
 * Vercel Cron jobs send a `Authorization: Bearer ${CRON_SECRET}` header
 * (when CRON_SECRET is set). We use the same secret for our cron-style
 * endpoints. If CRON_SECRET is not set, we allow requests through (so
 * local development works), but log a warning.
 */

import "server-only";

export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured -> permissive. OK for local dev.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[auth] CRON_SECRET is not set in production — cron routes are unauthenticated.",
      );
    }
    return true;
  }
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
