#!/usr/bin/env node
/**
 * Compare live C1 campaign sitelink assets to the current blueprint.
 *
 *   node scripts/verify-c1-sitelinks.js
 */
require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi } = require("google-ads-api");

const C1_NAME = "C1 — Research Tools — Calculators [roji-blueprint]";
const TOOLS = "https://tools.rojipeptides.com";

// Updated 2026-05-01: /reconstitution and /half-life sitelinks were
// pulled from the blueprint after Google disapproved them under
// "Unapproved substances" (twice — link-text rewrite didn't help).
// Only COA + Cost Comparison should remain on C1.
const EXPECTED = [
  {
    url: `${TOOLS}/coa`,
    text: "COA Analyzer",
    d1: "Score your COA for red flags",
    d2: "Third-party verification tool",
  },
  {
    url: `${TOOLS}/cost-per-dose`,
    text: "Cost Comparison Tool",
    d1: "Compare vendor research costs",
    d2: "Transparent cost math, free",
  },
];

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

function esc(s) {
  return String(s).replace(/'/g, "\\'");
}

(async () => {
  const camps = await customer.query(`
    SELECT campaign.id, campaign.name
    FROM campaign
    WHERE campaign.name = '${esc(C1_NAME)}'
      AND campaign.status != REMOVED
    LIMIT 1
  `);
  const cid = camps[0]?.campaign?.id;
  if (!cid) {
    console.error("C1 campaign not found:", C1_NAME);
    process.exit(2);
  }
  console.log("C1 campaign id:", cid, "\n");

  const rows = await customer.query(`
    SELECT
      campaign.id,
      asset.id,
      asset.sitelink_asset.link_text,
      asset.sitelink_asset.description1,
      asset.sitelink_asset.description2,
      asset.final_urls,
      asset.policy_summary.approval_status,
      campaign_asset.status
    FROM campaign_asset
    WHERE campaign.id = ${cid}
      AND campaign_asset.field_type = SITELINK
      AND campaign_asset.status != REMOVED
    ORDER BY asset.id
  `);

  const STATUS = {
    0: "UNSPECIFIED",
    1: "UNKNOWN",
    2: "DISAPPROVED",
    3: "APPROVED",
    4: "APPROVED_LIMITED",
    5: "AREA_OF_INTEREST_ONLY",
  };

  const live = rows.map((r) => {
    const sl = r.asset?.sitelink_asset ?? {};
    const urls = r.asset?.final_urls ?? [];
    return {
      asset_id: String(r.asset?.id ?? ""),
      link_text: String(sl.link_text ?? "").trim(),
      description1: String(sl.description1 ?? ""),
      description2: String(sl.description2 ?? ""),
      url: String(urls[0] ?? "").trim(),
      approval:
        STATUS[r.asset?.policy_summary?.approval_status] ??
        String(r.asset?.policy_summary?.approval_status ?? "?"),
    };
  });

  console.log(`Live sitelinks linked to C1: ${live.length}\n`);

  for (const e of live) {
    console.log(`  asset ${e.asset_id} | policy=${e.approval} | "${e.link_text}"`);
    console.log(`    URL: ${e.url}`);
    console.log(`    d1: ${e.description1}`);
    console.log(`    d2: ${e.description2}\n`);
  }

  console.log("— Match vs blueprint (by final URL) —\n");
  let ok = 0;
  let bad = 0;
  for (const want of EXPECTED) {
    const matches = live.filter((l) => l.url === want.url);
    if (matches.length === 0) {
      console.log(`✗ MISSING URL: ${want.url}`);
      bad += 1;
      continue;
    }
    for (const m of matches) {
      const textOk = m.link_text === want.text;
      const d1Ok = m.description1 === want.d1;
      const d2Ok = m.description2 === want.d2;
      if (textOk && d1Ok && d2Ok) {
        console.log(`✓ ${want.url}\n  → matches blueprint (${m.approval})`);
        ok += 1;
      } else {
        console.log(`△ ${want.url} — asset ${m.asset_id} (${m.approval})`);
        if (!textOk) console.log(`    text: got "${m.link_text}" want "${want.text}"`);
        if (!d1Ok) console.log(`    d1:   got "${m.description1}" want "${want.d1}"`);
        if (!d2Ok) console.log(`    d2:   got "${m.description2}" want "${want.d2}"`);
        bad += 1;
      }
    }
    if (matches.length > 1) {
      console.log(`  (note: ${matches.length} assets share this URL — duplicates from earlier runs)\n`);
    }
  }

  const extra = live.filter((l) => !EXPECTED.some((w) => w.url === l.url));
  if (extra.length) {
    console.log("\n○ Extra sitelinks (URL not in current blueprint list):");
    for (const x of extra) console.log(`    ${x.url} | "${x.link_text}"`);
  }

  console.log(`\nSummary: ${ok} exact blueprint match(es) on expected URL(s), ${bad} mismatch/missing (counting duplicates per row).`);
  process.exit(bad > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
