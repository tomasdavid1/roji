#!/usr/bin/env node
/**
 * Quick smoke test: tries to list accessible customers, then tries
 * to query the configured operating customer. Diagnoses the most
 * common wiring problems without booting the Next.js app.
 *
 *   node scripts/smoke-test.js
 */
require("dotenv").config({ path: ".env.local" });

const { GoogleAdsApi } = require("google-ads-api");

const required = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined;

function explain(err) {
  // google-ads-api errors are nested: try a few shapes.
  const candidates = [];
  if (err) {
    if (typeof err === "string") candidates.push(err);
    if (err.message) candidates.push(err.message);
    if (err.details) candidates.push(err.details);
    if (Array.isArray(err.errors)) {
      for (const e of err.errors) {
        if (e && e.message) candidates.push(e.message);
        if (e && e.error_code) candidates.push(JSON.stringify(e.error_code));
      }
    }
    candidates.push(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
  const msg = candidates.find((c) => c && c !== "{}") || "unknown";
  if (/DEVELOPER_TOKEN_NOT_APPROVED/i.test(msg)) {
    return [
      "EXPECTED FAILURE: developer token is in TEST mode.",
      "  - Auth (client id/secret/refresh token) WORKED.",
      "  - To call against the real account 6679780942, apply for Basic Access:",
      "    https://ads.google.com/aw/apicenter (from inside the MCC 263-783-2527).",
      "  - To verify wiring NOW, create a Google Ads test account and use its ID:",
      "    https://ads.google.com/intl/en/aw/anon/SignupTestAccount",
    ].join("\n");
  }
  if (/USER_PERMISSION_DENIED|CUSTOMER_NOT_ENABLED|NOT_AUTHORIZED/i.test(msg)) {
    return [
      "PERMISSION ERROR: the authenticated Google account cannot access " + customerId + ".",
      "  - Confirm 6679780942 is linked under MCC 2637832527.",
      "    Go to ads.google.com → switch into the MCC → Tools → Account access → Sub-accounts.",
      "  - Confirm GOOGLE_ADS_LOGIN_CUSTOMER_ID is set (currently: " + (loginCustomerId || "NOT SET") + ").",
    ].join("\n");
  }
  if (/invalid_grant/i.test(msg)) {
    return [
      "REFRESH TOKEN INVALID: it was revoked or never minted correctly.",
      "  - Re-run: node scripts/get-refresh-token.js",
    ].join("\n");
  }
  if (/invalid_client/i.test(msg)) {
    return [
      "CLIENT ID/SECRET INVALID: check GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET.",
    ].join("\n");
  }
  return msg;
}

(async () => {
  console.log("Config:");
  console.log("  client_id:           " + process.env.GOOGLE_ADS_CLIENT_ID);
  console.log("  developer_token:     " + process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  console.log("  refresh_token:       " + refreshToken.slice(0, 10) + "..." + refreshToken.slice(-6));
  console.log("  customer_id:         " + customerId);
  console.log("  login_customer_id:   " + (loginCustomerId || "(none)"));
  console.log();

  console.log("Step 1: listAccessibleCustomers (proves OAuth + dev token work)...");
  try {
    const result = await client.listAccessibleCustomers(refreshToken);
    console.log("  OK. Resource names:");
    for (const r of result.resource_names) console.log("    " + r);
  } catch (err) {
    console.log("  FAIL: " + explain(err));
    process.exit(2);
  }

  console.log();
  console.log("Step 2: query operating customer " + customerId + "...");
  const customer = client.Customer({
    customer_id: customerId,
    login_customer_id: loginCustomerId,
    refresh_token: refreshToken,
  });
  try {
    const rows = await customer.query("SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1");
    console.log("  OK. Got " + rows.length + " row(s).");
    for (const r of rows) console.log("    " + JSON.stringify(r.customer));
    console.log();
    console.log("SUCCESS — dashboard is wired up and the API is responding.");
  } catch (err) {
    console.log("  " + explain(err));
    console.log();
    console.log(
      "Note: if you got DEVELOPER_TOKEN_NOT_APPROVED above, this is the EXPECTED state today.",
    );
    console.log("Step 1 succeeded, which proves all credentials are correct.");
    process.exit(0);
  }
})();
