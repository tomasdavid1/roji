/**
 * llm-referral-diagnose.ts — what are LLMs sending us?
 *
 * Reads GA4 for the trailing 30 days and surfaces:
 *   - which LLM products refer traffic (chatgpt.com, perplexity.ai, etc.)
 *   - which landing pages they recommend
 *   - which subdomain (tools vs store) gets the traffic
 *   - whether those visitors do anything (engagement / events)
 *
 * Self-traffic (Rio) excluded.
 *
 * Usage:
 *   node --require ./scripts/_cli-bootstrap.cjs --import tsx ./scripts/llm-referral-diagnose.ts
 */

import { ga4WithoutSelfTraffic } from "../src/lib/ga4-self-filter";

const LLM_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "www.perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
  "kagi.com",
  "duckduckgo.com",
];

async function ga4Token(): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    refresh_token: process.env.GA4_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`GA4 token: ${r.status} ${await r.text()}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

type Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

async function ga4Run(token: string, body: unknown): Promise<Row[]> {
  const r = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!r.ok) throw new Error(`GA4 runReport: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { rows?: Row[] };
  return j.rows ?? [];
}

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);
const padN = (s: string, n: number) => s.padStart(n);

async function main() {
  const token = await ga4Token();
  const dateRange = { startDate: "30daysAgo", endDate: "today" };
  const selfFilter = ga4WithoutSelfTraffic();
  const llmFilter = {
    filter: {
      fieldName: "sessionSource",
      inListFilter: { values: LLM_HOSTS },
    },
  };

  const baseFilters = {
    andGroup: {
      expressions: [llmFilter, ...(selfFilter ? [selfFilter] : [])],
    },
  };

  console.log(`\n=== LLM referral diagnostic — last 30 days ===\n`);

  // 1. Which LLMs send us traffic?
  console.log("--- Source breakdown ---\n");
  const sources = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }, { name: "country" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "averageSessionDuration" },
      { name: "screenPageViewsPerSession" },
    ],
    dimensionFilter: baseFilters,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 50,
  });

  console.log(
    `  ${pad("source", 22)} ${pad("country", 18)} ${padN("sess", 6)} ${padN("users", 6)} ${padN("avg dur", 9)} ${padN("PV/sess", 9)}`,
  );
  console.log(
    `  ${"-".repeat(22)} ${"-".repeat(18)} ${"-".repeat(6)} ${"-".repeat(6)} ${"-".repeat(9)} ${"-".repeat(9)}`,
  );
  let totalSessions = 0;
  for (const r of sources) {
    const src = r.dimensionValues?.[0]?.value ?? "?";
    const country = r.dimensionValues?.[1]?.value ?? "?";
    const sess = Number(r.metricValues?.[0]?.value ?? 0);
    const users = Number(r.metricValues?.[1]?.value ?? 0);
    const dur = Number(r.metricValues?.[2]?.value ?? 0);
    const pv = Number(r.metricValues?.[3]?.value ?? 0);
    totalSessions += sess;
    console.log(
      `  ${pad(src, 22)} ${pad(country, 18)} ${padN(String(sess), 6)} ${padN(String(users), 6)} ${padN(`${dur.toFixed(0)}s`, 9)} ${padN(pv.toFixed(2), 9)}`,
    );
  }
  console.log(`\n  Total LLM-referred sessions (30d): ${totalSessions}\n`);

  // 2. Which LANDING PAGES do they hit?
  console.log("--- Landing pages (where the LLM points users) ---\n");
  const landings = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }, { name: "landingPage" }, { name: "hostName" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    dimensionFilter: baseFilters,
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 100,
  });

  console.log(
    `  ${pad("source", 18)} ${pad("host", 26)} ${pad("landing path", 40)} ${padN("sess", 6)}`,
  );
  console.log(
    `  ${"-".repeat(18)} ${"-".repeat(26)} ${"-".repeat(40)} ${"-".repeat(6)}`,
  );
  for (const r of landings.slice(0, 30)) {
    const src = r.dimensionValues?.[0]?.value ?? "?";
    const path = r.dimensionValues?.[1]?.value ?? "?";
    const host = r.dimensionValues?.[2]?.value ?? "?";
    const sess = Number(r.metricValues?.[0]?.value ?? 0);
    console.log(
      `  ${pad(src, 18)} ${pad(host, 26)} ${pad(path, 40)} ${padN(String(sess), 6)}`,
    );
  }

  // 3. What do they DO once they arrive?
  console.log("\n--- Engagement events from LLM-referred sessions ---\n");
  const events = await ga4Run(token, {
    dateRanges: [dateRange],
    dimensions: [{ name: "sessionSource" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          llmFilter,
          ...(selfFilter ? [selfFilter] : []),
          {
            filter: {
              fieldName: "eventName",
              inListFilter: {
                values: [
                  "tool_view",
                  "tool_engagement",
                  "tool_complete",
                  "tool_result_rendered",
                  "store_outbound_click",
                  "hero_shop_cta_click",
                  "view_item",
                  "product_view",
                  "add_to_cart",
                  "view_cart",
                  "begin_checkout",
                  "purchase",
                ],
              },
            },
          },
        ],
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 100,
  });

  console.log(`  ${pad("source", 22)} ${pad("event", 30)} ${padN("count", 7)}`);
  console.log(`  ${"-".repeat(22)} ${"-".repeat(30)} ${"-".repeat(7)}`);
  for (const r of events) {
    const src = r.dimensionValues?.[0]?.value ?? "?";
    const ev = r.dimensionValues?.[1]?.value ?? "?";
    const n = Number(r.metricValues?.[0]?.value ?? 0);
    console.log(`  ${pad(src, 22)} ${pad(ev, 30)} ${padN(String(n), 7)}`);
  }

  console.log("\n=== end ===\n");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message || e);
  process.exit(1);
});
