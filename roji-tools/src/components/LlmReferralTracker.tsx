"use client";

/**
 * LlmReferralTracker — fires `llm_referral` once per session whenever a
 * visitor arrives via a known LLM product (ChatGPT, Perplexity, Claude,
 * Gemini, Copilot, etc.).
 *
 * Why a separate event?
 * ---------------------
 * GA4 lets us filter by `sessionSource`, but treating LLM traffic as a
 * first-class channel requires:
 *   1. Stable event-level signal we can build a funnel report off of,
 *      independent of GA4's source-attribution heuristics.
 *   2. A reliable way to count LLM-referred visitors who use the
 *      tools / convert in the store, so we can size the channel.
 *   3. A signal we can also import as a Google Ads-side audience or
 *      conversion (LLM → tool → store is a real conversion path).
 *
 * Detection
 * ---------
 * We try TWO signals, in order:
 *
 *   1. document.referrer — works when the LLM client sends a Referer
 *      header (older clients, web-side GPTs without no-referrer).
 *
 *   2. ?utm_source=… — works when the LLM client strips Referer (which
 *      is most modern AI clients, including ChatGPT desktop/iOS/Android
 *      and recent ChatGPT web). ChatGPT appends utm_source=chatgpt.com,
 *      Claude appends utm_source=claude.ai, etc.
 *
 * 2026-05-20 root-cause note
 * --------------------------
 * Original v1 only looked at document.referrer and silently bailed
 * when it was empty. GA4 saw 14 chatgpt.com sessions in 30 days but
 * fired 0 llm_referral events — the referrer was being stripped by
 * ChatGPT's outbound-link policy. Adding the utm_source fallback
 * unblocks the event for all modern LLM clients.
 *
 * Once-per-session
 * ----------------
 * sessionStorage flag prevents double-firing on SPA route changes.
 * If sessionStorage is unavailable (private mode / sandboxed iframe),
 * we fall through to "fire once per page mount" — acceptable noise.
 *
 * Event payload
 * -------------
 *   llm_source        canonical LLM host (e.g. "chatgpt.com")
 *   detection_method  "referrer" or "utm_source" — useful for
 *                     debugging which signal is actually catching
 *                     traffic in production.
 *   landing_path      window.location.pathname
 *   landing_host      window.location.hostname
 */

import { useEffect } from "react";

const LLM_HOSTS = new Set([
  "chatgpt.com",
  "chat.openai.com",
  "openai.com",
  "perplexity.ai",
  "www.perplexity.ai",
  "claude.ai",
  "anthropic.com",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
  "kagi.com",
  "duckduckgo.com",
  "poe.com",
  "character.ai",
  "groq.com",
  "mistral.ai",
  "huggingface.co",
]);

/**
 * Map of utm_source aliases → canonical host.
 *
 * Most LLM products tag outbound links with utm_source=<host>
 * (e.g. utm_source=chatgpt.com), in which case LLM_HOSTS already
 * matches. This table only handles the short-form aliases we've
 * actually observed in the wild.
 */
const UTM_ALIAS: Record<string, string> = {
  chatgpt: "chatgpt.com",
  openai: "openai.com",
  perplexity: "perplexity.ai",
  claude: "claude.ai",
  anthropic: "anthropic.com",
  gemini: "gemini.google.com",
  bard: "bard.google.com",
  copilot: "copilot.microsoft.com",
  "bing-chat": "copilot.microsoft.com",
};

const FLAG_KEY = "roji_llm_referral_fired_v1";

type Detection = { source: string; method: "referrer" | "utm_source" };

function detectLlmReferral(): Detection | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  // 1) Try document.referrer first.
  const ref = document.referrer;
  if (ref) {
    try {
      const host = new URL(ref).hostname.toLowerCase();
      if (LLM_HOSTS.has(host)) return { source: host, method: "referrer" };
    } catch {
      // malformed referrer, fall through
    }
  }

  // 2) Fall back to utm_source — covers Referer-stripping clients
  //    (ChatGPT desktop/iOS/Android, recent ChatGPT web, etc.).
  try {
    const raw = new URLSearchParams(window.location.search)
      .get("utm_source")
      ?.toLowerCase()
      .trim();
    if (raw) {
      if (LLM_HOSTS.has(raw)) return { source: raw, method: "utm_source" };
      if (UTM_ALIAS[raw]) return { source: UTM_ALIAS[raw], method: "utm_source" };
    }
  } catch {
    // querystring parse failed — give up
  }

  return null;
}

export function LlmReferralTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let alreadyFired = false;
    try {
      alreadyFired = window.sessionStorage.getItem(FLAG_KEY) === "1";
    } catch {
      // sessionStorage unavailable (e.g. iframe sandbox). Fall through.
    }
    if (alreadyFired) return;

    const detected = detectLlmReferral();
    if (!detected) return;

    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;

    gtag("event", "llm_referral", {
      llm_source: detected.source,
      detection_method: detected.method,
      landing_path: window.location.pathname,
      landing_host: window.location.hostname,
    });

    try {
      window.sessionStorage.setItem(FLAG_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  return null;
}
