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
 * We use `document.referrer` because GA4's source-detection sometimes
 * misses LLM-driven referrals (especially when the user opens links
 * in a new tab from a desktop ChatGPT app, where the referrer is
 * preserved but UTMs aren't). Set is union of every public LLM product
 * known to send referer headers as of 2026-05.
 *
 * Once-per-session
 * ----------------
 * We use sessionStorage to avoid double-firing on SPA route changes.
 * If the session storage is unavailable (e.g. private mode), we fall
 * back to "fire once per page mount" which is acceptable noise.
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

const FLAG_KEY = "roji_llm_referral_fired_v1";

export function LlmReferralTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;

    let alreadyFired = false;
    try {
      alreadyFired = window.sessionStorage.getItem(FLAG_KEY) === "1";
    } catch {
      // sessionStorage unavailable (e.g. iframe sandbox). Fall through.
    }
    if (alreadyFired) return;

    const ref = document.referrer;
    if (!ref) return;
    let host = "";
    try {
      host = new URL(ref).hostname.toLowerCase();
    } catch {
      return;
    }
    if (!LLM_HOSTS.has(host)) return;

    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;

    gtag("event", "llm_referral", {
      llm_source: host,
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
