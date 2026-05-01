#!/usr/bin/env node
/**
 * "13 people clicked on the site — where did they go?"
 *
 * Pulls everything Google Ads knows about our recent clicks:
 *   1. Per-ad-group click + landing-page expanded URL summary
 *   2. Per-keyword breakdown (which keyword sent the click)
 *   3. Geographic + device breakdown
 *   4. Per-conversion-action event count (do we have purchases? add_to_carts?)
 *   5. Search-term-level click summary (what query did they actually type?)
 *
 * Note: Google Ads will tell us *that* a user clicked and *what* keyword
 * matched, but not what URL they navigated to AFTER the landing page.
 * That's a GA4 / server-side question. For now this is the GAds picture.
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

// All windows from "today only" up to "last 30 days" — the account is new
// so most data lives in the last 7 days, but be generous.
const DATE_RANGE = "DURING LAST_30_DAYS";

const fmtUsd = (micros) =>
  micros ? `$${(Number(micros) / 1_000_000).toFixed(2)}` : "$0.00";

const hr = (s) => {
  const w = 80;
  console.log("\n" + "─".repeat(w));
  console.log("  " + s);
  console.log("─".repeat(w));
};

(async () => {
  // 1. Per-campaign + per-ad-group summary
  hr("CLICKS BY CAMPAIGN + AD GROUP (last 30d)");
  const cgRows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.all_conversions
    FROM ad_group
    WHERE segments.date ${DATE_RANGE}
      AND ad_group.status = 'ENABLED'
      AND metrics.clicks > 0
    ORDER BY metrics.clicks DESC
  `);
  if (!cgRows.length) console.log("  (no clicked ad groups)");
  for (const r of cgRows) {
    console.log(
      `  ${r.campaign.name.padEnd(50).slice(0, 50)} | ${r.ad_group.name.padEnd(35).slice(0, 35)} | imps=${String(r.metrics.impressions).padStart(4)} clicks=${String(r.metrics.clicks).padStart(3)} cost=${fmtUsd(r.metrics.cost_micros).padStart(7)} conv=${r.metrics.conversions || 0}`,
    );
  }

  // 2. Per-keyword breakdown — which keyword carried the click?
  hr("CLICKS BY KEYWORD (last 30d, only keywords with clicks)");
  const MATCH = { 2: "EXACT", 3: "PHRASE", 4: "BROAD" };
  const kwRows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date ${DATE_RANGE}
      AND metrics.clicks > 0
    ORDER BY metrics.clicks DESC
  `);
  if (!kwRows.length) console.log("  (no clicked keywords)");
  for (const r of kwRows) {
    const k = r.ad_group_criterion;
    const text = k.keyword?.text ?? "?";
    const mt = MATCH[k.keyword?.match_type] ?? "?";
    console.log(
      `  ${(text + " (" + mt + ")").padEnd(45).slice(0, 45)} | ${r.ad_group.name.padEnd(30).slice(0, 30)} | clicks=${String(r.metrics.clicks).padStart(3)} cost=${fmtUsd(r.metrics.cost_micros)} ctr=${(Number(r.metrics.ctr) * 100).toFixed(2)}% conv=${r.metrics.conversions || 0}`,
    );
  }

  // 3. Search terms — what did they ACTUALLY type? (close-variant
  //    matching means search term ≠ keyword)
  hr("ACTUAL SEARCH TERMS (last 30d, with clicks)");
  const stRows = await customer.query(`
    SELECT
      campaign.name,
      ad_group.name,
      search_term_view.search_term,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date ${DATE_RANGE}
      AND metrics.clicks > 0
    ORDER BY metrics.clicks DESC
  `);
  if (!stRows.length) console.log("  (no clicked search terms)");
  for (const r of stRows) {
    console.log(
      `  "${r.search_term_view.search_term}"`.padEnd(45).slice(0, 45) +
        ` | ${r.ad_group.name.padEnd(28).slice(0, 28)} | clicks=${String(r.metrics.clicks).padStart(2)} cost=${fmtUsd(r.metrics.cost_micros)} conv=${r.metrics.conversions || 0}`,
    );
  }

  // 4. Landing page report — what URL did the click LAND on?
  hr("LANDING PAGES (where clickers arrived)");
  try {
    const lpRows = await customer.query(`
      SELECT
        landing_page_view.unexpanded_final_url,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM landing_page_view
      WHERE segments.date ${DATE_RANGE}
        AND metrics.clicks > 0
      ORDER BY metrics.clicks DESC
    `);
    if (!lpRows.length) console.log("  (no landing-page rows)");
    for (const r of lpRows) {
      console.log(
        `  ${r.landing_page_view.unexpanded_final_url.padEnd(50).slice(0, 50)} | clicks=${String(r.metrics.clicks).padStart(3)} cost=${fmtUsd(r.metrics.cost_micros)} conv=${r.metrics.conversions || 0}`,
      );
    }
  } catch (err) {
    console.log("  (landing_page_view unavailable):", err?.message || err);
  }

  // 5. Geographic + device breakdown
  hr("BY DEVICE (last 30d, with clicks)");
  const DEVICE = {
    2: "MOBILE",
    3: "TABLET",
    4: "DESKTOP",
    5: "OTHER",
    6: "CONNECTED_TV",
  };
  const dvRows = await customer.query(`
    SELECT
      segments.device,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM customer
    WHERE segments.date ${DATE_RANGE}
  `);
  for (const r of dvRows) {
    const d = DEVICE[r.segments.device] || r.segments.device;
    console.log(
      `  ${d.padEnd(15)} | imps=${String(r.metrics.impressions).padStart(5)} clicks=${String(r.metrics.clicks).padStart(3)} cost=${fmtUsd(r.metrics.cost_micros)} conv=${r.metrics.conversions || 0}`,
    );
  }

  // 6. Per-conversion-action breakdown — did ANY click convert?
  hr("CONVERSION EVENTS BY ACTION (last 30d)");
  const cvRows = await customer.query(`
    SELECT
      segments.conversion_action_name,
      segments.conversion_action_category,
      metrics.all_conversions,
      metrics.all_conversions_value
    FROM customer
    WHERE segments.date ${DATE_RANGE}
      AND metrics.all_conversions > 0
  `);
  if (!cvRows.length) {
    console.log(
      "  (zero conversions recorded — no purchase, no add_to_cart, nothing.)",
    );
  } else {
    for (const r of cvRows) {
      console.log(
        `  ${r.segments.conversion_action_name.padEnd(35)} | conv=${r.metrics.all_conversions} value=${r.metrics.all_conversions_value || 0}`,
      );
    }
  }

  // 7. Hour-of-day pattern (just out of curiosity)
  hr("BY HOUR OF DAY (last 7d, with clicks)");
  const hrRows = await customer.query(`
    SELECT
      segments.hour,
      metrics.clicks,
      metrics.impressions
    FROM customer
    WHERE segments.date DURING LAST_7_DAYS
      AND metrics.clicks > 0
    ORDER BY segments.hour
  `);
  for (const r of hrRows) {
    const h = String(r.segments.hour).padStart(2, "0");
    console.log(
      `  ${h}:00 | imps=${String(r.metrics.impressions).padStart(4)} clicks=${r.metrics.clicks}`,
    );
  }

  // 8. Cross-domain auto-tagging check — gclid presence is critical
  //    for GA4 to attribute the session as "Paid Search."
  hr("GCLID / AUTO-TAGGING STATUS");
  const cs = await customer.query(`
    SELECT customer.auto_tagging_enabled
    FROM customer
    LIMIT 1
  `);
  if (cs[0]) {
    console.log(
      `  auto_tagging_enabled = ${cs[0].customer.auto_tagging_enabled} (must be TRUE for GA4 attribution)`,
    );
  }
})().catch((e) => {
  console.error("FAILED:", e?.errors || e?.message || e);
  process.exit(1);
});
