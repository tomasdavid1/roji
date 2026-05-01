#!/usr/bin/env node
/**
 * One-shot helper to obtain a GA4 Data API refresh token using the
 * SAME OAuth client as Google Ads.
 *
 * This avoids needing a Google Cloud service-account key (which your
 * org may forbid via the `iam.disableServiceAccountKeyCreation` org
 * policy). Instead, the dashboard authenticates against GA4 as you
 * personally — same as it already does for Google Ads.
 *
 * Usage:
 *   1. Make sure GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET
 *      are set in roji-ads-dashboard/.env.local.
 *      (Already done if you've used the Google Ads dashboard.)
 *   2. Run from `roji-ads-dashboard/`:
 *        node scripts/get-ga4-refresh-token.js
 *   3. Open the printed URL in your browser, sign in with the Google
 *      account that has access to the Roji GA4 property.
 *   4. After granting access you'll be redirected back to localhost;
 *      the script prints the refresh token.
 *   5. Paste the printed token into Vercel as GA4_REFRESH_TOKEN, plus
 *      paste your numeric GA4 Property ID as GA4_PROPERTY_ID.
 *      Redeploy. Done.
 *
 * Note: this reuses the existing Desktop OAuth client. If you ever
 * revoke its consent at https://myaccount.google.com/permissions
 * you'll need to re-run BOTH this script AND get-refresh-token.js.
 */

/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET in .env.local",
  );
  process.exit(1);
}

const PORT = 8766; // different from Google Ads helper's 8765
const REDIRECT = `http://127.0.0.1:${PORT}/`;

// Read-only access to GA4 property data. NO write scopes — this token
// can only run reports, never modify configuration.
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  }).toString();

console.log("\nOpen this URL in your browser (sign in with the Google account that has Viewer access to the GA4 property):\n");
console.log(authUrl + "\n");
console.log(`Waiting for redirect on ${REDIRECT} ...\n`);
console.log("If you see 'redirect_uri_mismatch', the OAuth client needs http://127.0.0.1:8766/ added as an authorized redirect URI in Google Cloud Console → APIs & Services → Credentials.\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");

  if (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Auth error: " + err);
    console.error("Auth error:", err);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing ?code");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<html><body style='font-family:Inter,sans-serif;padding:40px;background:#0a0a0f;color:#f0f0f5;'>" +
      "<h2>Roji: GA4 refresh token captured.</h2>" +
      "<p>Check the terminal for your token. You can close this tab.</p>" +
      "</body></html>",
  );

  try {
    const body = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }).toString();

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error("Token exchange failed:", json);
      process.exit(1);
    }
    if (!json.refresh_token) {
      console.error(
        "\nNo refresh_token in response. This usually means you have already authorized this client for the analytics scope; revoke at https://myaccount.google.com/permissions and try again.\n",
      );
      console.error(json);
      process.exit(1);
    }

    console.log("\n=== SUCCESS ===\n");
    console.log("Refresh token (set as GA4_REFRESH_TOKEN on Vercel):\n");
    console.log(json.refresh_token);
    console.log("\nNext steps:");
    console.log("  1. Find your GA4 Property ID (Admin → Property details — the numeric one, not G-XXX).");
    console.log("  2. On Vercel, set:");
    console.log("       GA4_PROPERTY_ID=<numeric id>");
    console.log("       GA4_REFRESH_TOKEN=<the token above>");
    console.log("  3. Redeploy — the funnel page mid-steps will go live.");
    console.log("");
    server.close();
    process.exit(0);
  } catch (e) {
    console.error("Token exchange error:", e);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1");

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use. Either:\n` +
        `  - Kill the process using it: lsof -ti tcp:${PORT} | xargs kill\n` +
        `  - Or edit PORT in scripts/get-ga4-refresh-token.js to a free port\n`,
    );
    process.exit(1);
  }
  console.error("Server error:", err);
  process.exit(1);
});
