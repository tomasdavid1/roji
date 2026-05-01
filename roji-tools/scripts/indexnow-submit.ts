/**
 * IndexNow ping script for tools.rojipeptides.com.
 *
 * Why we need this:
 *   The LLM-VISIBILITY-AUDIT found that no pages from the tools
 *   subdomain are indexed by Google or Bing. Bing-grounded LLMs
 *   (ChatGPT, Perplexity, Copilot, DuckDuckGo) cannot cite us
 *   until Bing crawls and indexes the site. The IndexNow protocol
 *   lets us tell Bing "here are URLs you should crawl now"
 *   instead of waiting weeks for the natural crawler cycle.
 *
 *   See: https://www.indexnow.org/documentation
 *
 * How it works:
 *   1. We host a key file at /<key>.txt that echoes the key as
 *      its body. Bing fetches it once to verify we own the domain.
 *   2. We POST a JSON list of URLs to the IndexNow endpoint along
 *      with the same key. Bing then queues those URLs for crawl
 *      (typically within 24 hours, often within 2-4 hours).
 *
 * Idempotency / rate limits:
 *   IndexNow accepts the same URLs repeatedly without penalty.
 *   The recommended cadence is to ping when you publish or update
 *   a page; we run on every Vercel build (postbuild). That's
 *   ~2-3x/week today, which is well below the 10,000 URLs/day
 *   per-host soft limit.
 *
 * Failure mode:
 *   We log and exit 0 on any error. IndexNow being down should
 *   never block a deploy.
 *
 * Configuration:
 *   - INDEXNOW_KEY env var (required) — the same key as the file
 *     at public/<key>.txt. Defaults to the embedded key for
 *     convenience in CI but can be overridden.
 *   - INDEXNOW_HOST env var (optional) — the host to submit URLs
 *     for. Defaults to tools.rojipeptides.com.
 *   - DRY_RUN=1 — print what would be submitted, don't actually
 *     POST.
 *
 * Run:
 *   npx tsx scripts/indexnow-submit.ts
 *   DRY_RUN=1 npx tsx scripts/indexnow-submit.ts
 */

import sitemap from "../src/app/sitemap.js";

const DEFAULT_KEY = "04257466f2044d068e6d3e1dda4b19cb";
const DEFAULT_HOST = "tools.rojipeptides.com";
// Bing's IndexNow endpoint. Other search engines (Yandex, Seznam)
// also support IndexNow under the same protocol; pinging Bing is
// sufficient because IndexNow members share submitted URLs across
// each other.
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

function uniqueUrls(): string[] {
  const entries = sitemap();
  const seen = new Set<string>();
  for (const e of entries) {
    if (typeof e.url === "string") seen.add(e.url);
  }
  return [...seen];
}

async function main() {
  const key = process.env.INDEXNOW_KEY ?? DEFAULT_KEY;
  const host = process.env.INDEXNOW_HOST ?? DEFAULT_HOST;
  const dry = process.env.DRY_RUN === "1";

  const urlList = uniqueUrls();
  if (urlList.length === 0) {
    console.warn("[indexnow] sitemap returned 0 URLs — nothing to submit");
    return;
  }

  const payload: IndexNowPayload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList,
  };

  console.log(`[indexnow] host=${host} urls=${urlList.length}`);
  for (const u of urlList.slice(0, 5)) console.log(`           ${u}`);
  if (urlList.length > 5) console.log(`           …and ${urlList.length - 5} more`);

  if (dry) {
    console.log("[indexnow] DRY_RUN=1, skipping POST");
    return;
  }

  try {
    const r = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    // IndexNow returns 200 (accepted), 202 (received, async),
    // 422 (URLs don't match host), or 403 (key file mismatch).
    // Anything else is an unexpected protocol error.
    console.log(`[indexnow] status=${r.status} ${r.statusText}`);
    if (r.status >= 400) {
      const body = await r.text().catch(() => "");
      console.warn(`[indexnow] non-2xx body: ${body.slice(0, 500)}`);
    }
  } catch (err) {
    // Never fail the build because of IndexNow.
    console.warn(
      `[indexnow] submit failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

main().catch((err) => {
  console.warn(
    `[indexnow] fatal: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(0);
});
