"use client";

import { useState } from "react";

import type { ProtocolRecommendation } from "@/lib/recommend";

interface Props {
  recommendation: ProtocolRecommendation;
  onGetStack: () => void;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Test-only mode is enabled by `NEXT_PUBLIC_PROTOCOL_TEST_MODE=1`.
 *
 * When on:
 *   - We hide the live "Get this stack" buy button (no products yet, and
 *     Google Ads policy is much happier when the landing page contains no
 *     commerce surface at all).
 *   - We surface an email-capture lead-gen card instead. Submissions fire a
 *     `lead_capture` GA4 event and (if the Google Ads conversion label is
 *     configured) a `conversion` event so we can measure ad performance
 *     against a real intent signal.
 *
 * To launch the live store integration, simply unset the env var.
 */
const TEST_MODE = process.env.NEXT_PUBLIC_PROTOCOL_TEST_MODE === "1";

export function StackCard({ recommendation, onGetStack }: Props) {
  // Round per-week price to nearest dollar — we sell the weekly framing as
  // the headline number. Anything tighter than $1 reads as fake-precise.
  const weeklyRounded = Math.round(recommendation.weekly_price);
  const totalRounded = recommendation.stack_price.toFixed(2);
  const weeks = recommendation.cycle_length_weeks;
  return (
    <div className="roji-card !p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="roji-pill mb-3">Recommended stack</span>
          <h3 className="text-2xl font-semibold mt-2">
            {recommendation.stack_name}
          </h3>
          <p className="text-sm text-roji-muted mt-1">
            {weeks}-week research cycle · SKU {recommendation.stack_sku}
          </p>
        </div>
        <div className="text-right shrink-0">
          {TEST_MODE ? (
            <>
              <div className="font-mono text-2xl text-roji-text">
                <span className="text-roji-muted text-base">Coming soon</span>
              </div>
              <div className="text-xs text-roji-dim mt-1">Stack</div>
            </>
          ) : (
            <>
              <div className="font-mono text-3xl text-roji-text leading-none">
                ${weeklyRounded}
                <span className="text-base text-roji-muted font-normal">
                  /week
                </span>
              </div>
              <div className="text-[11px] text-roji-dim mt-2 leading-snug max-w-[180px]">
                Billed once · ${totalRounded} for {weeks} weeks of protocol
              </div>
            </>
          )}
        </div>
      </div>

      {TEST_MODE ? (
        <LeadCapture stackSlug={recommendation.stack} />
      ) : (
        <>
          <button
            type="button"
            onClick={onGetStack}
            className="roji-btn-primary w-full !py-4 mt-2 text-base"
          >
            Get this stack →
          </button>
          <p className="text-[11px] text-roji-dim text-center mt-3 leading-relaxed">
            Redirects to the secure store. Research use only. Must be 21+.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Email-capture card shown in TEST_MODE. Fires a lead_capture GA4 event +
 * a Google Ads conversion (if NEXT_PUBLIC_GADS_LEAD_LABEL is set) so the
 * ads dashboard can attribute spend to actual research-engine intent
 * signals while we wait for the store + payment processor to be live.
 */
function LeadCapture({ stackSlug }: { stackSlug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, stack: stackSlug }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save your email. Try again.");
      }
      if (typeof window !== "undefined" && window.gtag) {
        const adsId = process.env.NEXT_PUBLIC_GADS_ID;
        const leadLabel = process.env.NEXT_PUBLIC_GADS_LEAD_LABEL;
        if (adsId && leadLabel) {
          window.gtag("event", "conversion", {
            send_to: `${adsId}/${leadLabel}`,
            value: 0,
            currency: "USD",
          });
        }
        window.gtag("event", "lead_capture", {
          event_category: "protocol_engine",
          event_label: stackSlug,
        });
      }
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-roji border border-roji-accent/40 bg-roji-accent/5 p-5 mt-2 text-center">
        <div className="text-sm font-semibold text-roji-text">
          You&apos;re on the list.
        </div>
        <p className="text-xs text-roji-muted mt-1.5 leading-relaxed">
          We&apos;ll email you the moment this stack is back in stock with
          third-party COA results attached.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-3">
      <label htmlFor="lead-email" className="block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
          Email me when this stack is in stock
        </span>
        <div className="flex gap-2 mt-2">
          <input
            id="lead-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="researcher@lab.com"
            disabled={state === "submitting"}
            className="flex-1 rounded-roji bg-roji-card border border-roji-border px-3 py-3 text-sm text-roji-text placeholder:text-roji-dim focus:border-roji-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={state === "submitting"}
            className="roji-btn-primary !py-3 !px-5 text-sm whitespace-nowrap"
          >
            {state === "submitting" ? "Saving…" : "Notify me"}
          </button>
        </div>
        {state === "error" && (
          <p className="text-xs text-roji-danger mt-2">{errorMsg}</p>
        )}
      </label>
      <p className="text-[11px] text-roji-dim leading-relaxed">
        We&apos;ll email you once and only once when this stack is available.
        No spam. Research use only.
      </p>
    </form>
  );
}
