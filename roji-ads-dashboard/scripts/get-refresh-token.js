#!/usr/bin/env node
/**
 * One-shot helper to obtain a Google Ads API refresh token.
 *
 * Usage:
 *   1. Make sure GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET are set
 *      in .env.local (already done if you ran the wiring step).
 *   2. Run from the project root:
 *        node scripts/get-refresh-token.js
 *   3. Open the printed URL in your browser, sign in with the Google
 *      account that owns the Ads account, and grant access.
 *   4. Copy the code from the redirect URL (it will redirect to
 *      http://localhost:8765/?code=... — the script catches it).
 *   5. The script prints the refresh token. Paste it into .env.local
 *      as GOOGLE_ADS_REFRESH_TOKEN and re-run `npm run dev`.
 *
 * The refresh token does NOT expire and is what google-ads-api uses
 * to mint short-lived access tokens on every API call.
 */

/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { URL } = require("url");

// Lightweight .env.local loader (no extra deps).
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

const REDIRECT = "http://localhost:8765/";
const SCOPE = "https://www.googleapis.com/auth/adwords";

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

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl + "\n");
console.log("Waiting for redirect on http://localhost:8765/ ...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8765");
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
      "<h2>Roji: refresh token captured.</h2>" +
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
        "\nNo refresh_token in response. This usually means you have already authorized this client; revoke at https://myaccount.google.com/permissions and try again.\n",
      );
      console.error(json);
      process.exit(1);
    }

    console.log("\n=== SUCCESS ===\n");
    console.log("Refresh token (paste into .env.local as GOOGLE_ADS_REFRESH_TOKEN):\n");
    console.log(json.refresh_token);
    console.log("\nAccess token (short-lived, FYI only):");
    console.log(json.access_token);
    console.log("\nDone. You can close the browser tab.\n");
    server.close();
    process.exit(0);
  } catch (e) {
    console.error("Token exchange error:", e);
    process.exit(1);
  }
});

server.listen(8765, "127.0.0.1");
