#!/usr/bin/env node
/**
 * Peptide-keyword expansion via Google's Keyword Plan Ideas API.
 *
 * Why this exists:
 *   The C2 "peptide research experiment" campaign is working —
 *   `peptide calculator` + `research peptide` are serving, getting
 *   clicks at reasonable CPCs ($1.55–$2.11), and Google's search-
 *   term report shows Spanish/German/Portuguese close variants
 *   matching organically (`calculadora peptideo`, `peptidrechner`).
 *   That tells us peptide-as-a-keyword does NOT trip Google Ads
 *   policy review (it's keywords/targeting, not ad copy claims).
 *
 *   So we want to harvest more peptide-containing seed keywords
 *   that:
 *     1. Have meaningful monthly search volume in the US.
 *     2. Have low-to-medium competition (cheap CPC bids).
 *     3. Match research/calculation/comparison intent (NOT buy /
 *        dose / prescription intent that would trigger our own
 *        ad copy compliance issues downstream).
 *
 * What this script does:
 *   1. Calls KeywordPlanIdeaService.GenerateKeywordIdeas using
 *      our top-performing keywords as seeds.
 *   2. Filters out clearly bad matches (compound names that
 *      Google bans for ads, therapeutic claims, prescription
 *      terms, anything implying personal use).
 *   3. Buckets the rest by search-intent: calculator, COA,
 *      research, reconstitution, comparison/cost, generic.
 *   4. Ranks each bucket by avg monthly searches × low competition
 *      and prints the top 15 per bucket.
 *
 * What this script does NOT do:
 *   - Does NOT add keywords to the live account. We print
 *     recommendations; you decide what to ship via the
 *     blueprint.
 *   - Does NOT validate ad-copy safety on the seed keyword list.
 *     We're only recommending **keywords**, not ad copy.
 *
 * Run:
 *   node scripts/keyword-research.js
 *   node scripts/keyword-research.js --json > keyword-ideas.json
 */

require("dotenv").config({ path: ".env.local" });
const { GoogleAdsApi, enums } = require("google-ads-api");

const ROJI_CID = "6573032286";
const LOCATION_US = "geoTargetConstants/2840"; // United States
const LANGUAGE_EN = "languageConstants/1000"; // English

// Seeds: our top-performing peptide keywords + the user-added ones,
// plus a handful of close variants Google's search-term report
// already proved match real intent.
const SEED_KEYWORDS = [
  "peptide calculator",
  "research peptide",
  "peptide quality",
  "peptide coa",
  "peptide reconstitution",
  "peptide research calculator",
  "peptide research tools",
  "peptide reconstitution calculator",
  "peptide dosage calculator",
  "peptide concentration calculator",
  "peptide half life",
  "peptide half-life calculator",
  "peptide cost calculator",
  "research peptide vendors",
  "peptide purity",
  "peptide vendor comparison",
];

// --- Filtering rules ---
//
// Google Ads bans certain compound names for ads. We don't want to
// build a campaign on keywords whose ads will get auto-disapproved.
// Even if a compound shows up in search-term reports as a close
// variant, we don't want to *bid* on it in C2 (we'd trigger
// disapproval cascades).
//
// Compound names: drop any keyword that contains a known compound.
const COMPOUND_BLOCKLIST = [
  /\bbpc[\s-]?157\b/i,
  /\btb[\s-]?500\b/i,
  /\bcjc[\s-]?1295\b/i,
  /\bipamorelin\b/i,
  /\bsermorelin\b/i,
  /\bmk[\s-]?677\b/i,
  /\bibutamoren\b/i,
  /\btirzepatide\b/i,
  /\bsemaglutide\b/i,
  /\bretatrutide\b/i,
  /\bghrp[\s-]?[26]\b/i,
  /\bghk[\s-]?cu\b/i,
  /\boxytocin\b/i,
  /\bmelanotan\b/i,
  /\bpt[\s-]?141\b/i,
  /\bdsip\b/i,
  /\bigf[\s-]?1\b/i,
  /\bhgh\b/i,
  /\bhcg\b/i,
  /\btestosterone\b/i,
  /\bsteroid(s)?\b/i,
  /\bsarms?\b/i,
];

// Therapeutic / personal-use intent. These keywords, even if cheap,
// would force our ad copy into a corner where compliance is hard.
const PERSONAL_USE_BLOCKLIST = [
  /\binject(ion|ions|able)?\b/i,
  /\bsyringe\b/i,
  /\bprescription\b/i,
  /\brx\b/i,
  /\bbuy\b/i,
  /\border\b/i,
  /\bcheap(est)?\b/i,
  /\bonline\b/i,
  /\b(weight|fat)[\s-]?loss\b/i,
  /\bmuscle gain\b/i,
  /\banti[\s-]?aging\b/i,
  /\bheal(ing)?\b/i,
  /\bcure\b/i,
  /\btreatment\b/i,
  /\btherapy\b/i,
  /\bdose(s|d)?\b/i, // drop "peptide dose [whatever]" variants — we already
  // bid on `peptide dosage calculator` and that's a calculation framing.
  // Bare "peptide dose" leans personal-use.
];

// Bucket classification — purely cosmetic; helps the report be
// readable.
const BUCKETS = {
  calculator: /\b(calculator|calc|reconstit|concentration|conversion)\b/i,
  comparison: /\b(compar|cost|price|vendor|review|ranking|best)\b/i,
  research: /\b(research|study|database|reference|literature|pubmed)\b/i,
  coa: /\b(coa|certificate|purity|quality|test|verif)\b/i,
  pharmacology: /\b(half[\s-]?life|kinetics|stability|storage)\b/i,
};

function classify(text) {
  for (const [name, re] of Object.entries(BUCKETS)) {
    if (re.test(text)) return name;
  }
  return "generic";
}

function isAllowed(text) {
  const t = text.toLowerCase();
  if (!/\bpeptid/i.test(t)) {
    // We only care about peptide-containing keywords for C2.
    return { ok: false, reason: "no peptide root" };
  }
  for (const re of COMPOUND_BLOCKLIST) {
    if (re.test(t))
      return { ok: false, reason: `compound match: ${re.source}` };
  }
  for (const re of PERSONAL_USE_BLOCKLIST) {
    if (re.test(t))
      return { ok: false, reason: `personal-use match: ${re.source}` };
  }
  return { ok: true };
}

// Competition enums → numeric weights so we can rank.
const COMPETITION_WEIGHT = {
  UNKNOWN: 1,
  LOW: 1.5,
  MEDIUM: 1.0,
  HIGH: 0.5,
};

function score(idea) {
  const monthly = Number(idea.avg_monthly_searches ?? 0);
  const competition =
    enums.KeywordPlanCompetitionLevel?.[idea.competition] ?? "UNKNOWN";
  const weight = COMPETITION_WEIGHT[competition] ?? 1.0;
  return monthly * weight;
}

function formatUsd(micros) {
  if (micros == null) return "—";
  return `$${(Number(micros) / 1_000_000).toFixed(2)}`;
}

function competitionLabel(idea) {
  const lvl =
    enums.KeywordPlanCompetitionLevel?.[idea.competition] ?? "UNKNOWN";
  return lvl;
}

async function main() {
  const wantJson = process.argv.includes("--json");

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const customer = client.Customer({
    customer_id: ROJI_CID,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });

  if (!wantJson) {
    console.log("=== Roji peptide keyword expansion ===");
    console.log(`Customer: ${ROJI_CID}`);
    console.log(`Seeds (${SEED_KEYWORDS.length}):`);
    for (const s of SEED_KEYWORDS) console.log(`  - ${s}`);
    console.log("");
  }

  // The API takes up to 20 seed keywords per call. We have 16, so a
  // single call works.
  let response;
  try {
    // The KeywordPlanIdeaService expects `customer_id` as a top-level
    // field on the request (it isn't bound to the `customer` wrapper
    // the way query() is). The service is *call-only* — there is no
    // resource owned by a customer to look up — so the customer_id
    // here is purely auth scope.
    response = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: ROJI_CID,
      keyword_seed: { keywords: SEED_KEYWORDS },
      language: LANGUAGE_EN,
      geo_target_constants: [LOCATION_US],
      include_adult_keywords: false,
      keyword_plan_network:
        enums.KeywordPlanNetwork?.GOOGLE_SEARCH ?? "GOOGLE_SEARCH",
      page_size: 1000,
    });
  } catch (err) {
    console.error("[error] keyword ideas request failed:");
    console.error(err.errors ?? err.message ?? err);
    process.exit(1);
  }

  const ideas = response ?? [];
  if (!wantJson) console.log(`Got ${ideas.length} ideas from Google.\n`);

  const filtered = [];
  const dropped = { compound: 0, personal: 0, no_peptide: 0 };
  for (const idea of ideas) {
    const text = idea.text ?? "";
    const allow = isAllowed(text);
    if (!allow.ok) {
      if (allow.reason.startsWith("compound match")) dropped.compound++;
      else if (allow.reason.startsWith("personal-use")) dropped.personal++;
      else dropped.no_peptide++;
      continue;
    }
    const monthly = Number(idea.keyword_idea_metrics?.avg_monthly_searches ?? 0);
    const competition = idea.keyword_idea_metrics?.competition;
    const lowBidMicros = idea.keyword_idea_metrics?.low_top_of_page_bid_micros;
    const highBidMicros = idea.keyword_idea_metrics?.high_top_of_page_bid_micros;
    filtered.push({
      text,
      bucket: classify(text),
      avg_monthly_searches: monthly,
      competition: competitionLabel({ competition }),
      low_bid: formatUsd(lowBidMicros),
      high_bid: formatUsd(highBidMicros),
      score: score({
        avg_monthly_searches: monthly,
        competition,
      }),
    });
  }

  filtered.sort((a, b) => b.score - a.score);

  if (wantJson) {
    console.log(
      JSON.stringify(
        {
          seeds: SEED_KEYWORDS,
          total_ideas: ideas.length,
          filtered: filtered.length,
          dropped,
          top_recommendations: filtered.slice(0, 50),
          all: filtered,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`=== Filter summary ===`);
  console.log(`  total ideas:           ${ideas.length}`);
  console.log(`  dropped (no peptide):  ${dropped.no_peptide}`);
  console.log(`  dropped (compound):    ${dropped.compound}`);
  console.log(`  dropped (personal):    ${dropped.personal}`);
  console.log(`  kept (peptide-safe):   ${filtered.length}`);
  console.log("");

  // Group + print top 15 per bucket.
  const byBucket = {};
  for (const k of filtered) {
    (byBucket[k.bucket] ??= []).push(k);
  }

  const bucketOrder = [
    "calculator",
    "research",
    "coa",
    "comparison",
    "pharmacology",
    "generic",
  ];
  for (const bucket of bucketOrder) {
    const list = byBucket[bucket] ?? [];
    if (list.length === 0) continue;
    console.log(`=== ${bucket.toUpperCase()} (${list.length} ideas) ===`);
    console.log(
      "  " +
        ["keyword", "monthly", "comp", "low_bid", "high_bid"]
          .map((s, i) => s.padEnd([42, 8, 8, 8, 8][i]))
          .join(""),
    );
    for (const k of list.slice(0, 15)) {
      console.log(
        "  " +
          [
            k.text.length > 40 ? k.text.slice(0, 39) + "…" : k.text,
            String(k.avg_monthly_searches),
            k.competition,
            k.low_bid,
            k.high_bid,
          ]
            .map((s, i) => String(s).padEnd([42, 8, 8, 8, 8][i]))
            .join(""),
      );
    }
    console.log("");
  }

  // Also surface any high-volume hits we might want to consider
  // even if they didn't bucket cleanly.
  console.log("=== TOP 20 OVERALL (across all buckets) ===");
  console.log(
    "  " +
      ["keyword", "bucket", "monthly", "comp", "low_bid"]
        .map((s, i) => s.padEnd([42, 14, 8, 8, 8][i]))
        .join(""),
  );
  for (const k of filtered.slice(0, 20)) {
    console.log(
      "  " +
        [
          k.text.length > 40 ? k.text.slice(0, 39) + "…" : k.text,
          k.bucket,
          String(k.avg_monthly_searches),
          k.competition,
          k.low_bid,
        ]
          .map((s, i) => String(s).padEnd([42, 14, 8, 8, 8][i]))
          .join(""),
    );
  }
  console.log("");

  console.log("=== Next steps ===");
  console.log(
    "  1. Review the top recommendations above.\n" +
      "  2. Pick 8–12 to add to C2 — favor PHRASE match for the higher-volume\n" +
      "     ones, EXACT match for the cheapest/closest-intent ones.\n" +
      "  3. Add them to peptideExperimentAdGroup() in\n" +
      "     roji-ads-dashboard/src/lib/ads-blueprint.ts and re-run\n" +
      "     `npm run blueprint:dryrun` then `npm run blueprint:live`.\n" +
      "  4. Wait 2–3 days for impression/click data before culling losers.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
