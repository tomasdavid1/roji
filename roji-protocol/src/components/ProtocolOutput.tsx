"use client";

import { useEffect, useMemo, useState } from "react";
import { useWizard } from "@/lib/store";
import { generateProtocol } from "@/lib/recommend";
import { StackCard } from "./StackCard";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function ProtocolOutput() {
  const toUserInput = useWizard((s) => s.toUserInput);
  const reset = useWizard((s) => s.reset);
  const [autoship, setAutoship] = useState(false);

  const recommendation = useMemo(() => {
    const input = toUserInput();
    if (!input) return null;
    return generateProtocol(input);
  }, [toUserInput]);

  useEffect(() => {
    if (!recommendation) return;
    const adsId = process.env.NEXT_PUBLIC_GADS_ID;
    const label = process.env.NEXT_PUBLIC_GADS_PROTOCOL_LABEL;
    if (typeof window === "undefined" || !window.gtag) return;
    if (adsId && label) {
      window.gtag("event", "conversion", {
        send_to: `${adsId}/${label}`,
        value: 0,
        currency: "USD",
      });
    }
    window.gtag("event", "protocol_complete", {
      event_category: "protocol_engine",
      event_label: recommendation.stack,
      value: recommendation.stack_price,
    });
  }, [recommendation]);

  if (!recommendation) {
    return (
      <div className="text-center py-12">
        <p className="text-roji-muted">
          Missing inputs. Please go back and complete each step.
        </p>
      </div>
    );
  }

  const handleGetStack = () => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "stack_click", {
        event_category: "protocol_engine",
        event_label: recommendation.stack,
        value: recommendation.stack_price,
        autoship: autoship ? "yes" : "no",
      });
    }
    // Pass through ?ref=CODE if the user landed on the protocol engine via
    // an affiliate link. The store reads it on first request and drops a
    // 30-day cookie, so attribution survives even if they bounce and come
    // back later.
    let target = autoship
      ? recommendation.shopUrlAutoship
      : recommendation.shopUrl;
    if (typeof window !== "undefined") {
      const incomingRef = new URLSearchParams(window.location.search).get(
        "ref",
      );
      if (incomingRef) {
        const sep = target.includes("?") ? "&" : "?";
        target = `${target}${sep}ref=${encodeURIComponent(incomingRef)}`;
      }
    }
    window.location.href = target;
  };

  const autoshipPrice = (
    recommendation.stack_price *
    (1 - recommendation.autoshipDiscountPct / 100)
  ).toFixed(0);

  return (
    <div className="space-y-8">
      <div>
        <span className="roji-pill mb-4">Protocol generated</span>
        <h2 className="text-3xl font-semibold mt-3 mb-3">
          Your personalized research protocol
        </h2>
        <p className="text-roji-muted text-sm leading-relaxed max-w-2xl">
          {recommendation.rationale}
        </p>
      </div>

      <StackCard
        recommendation={recommendation}
        onGetStack={handleGetStack}
      />

      <div
        className="roji-card !p-4 flex items-center justify-between gap-3 border"
        style={{
          borderColor: autoship
            ? "rgba(0,255,178,0.45)"
            : "rgba(255,255,255,0.08)",
          background: autoship ? "rgba(0,255,178,0.06)" : "transparent",
        }}
      >
        <label
          htmlFor="autoship-toggle"
          className="flex items-center gap-3 cursor-pointer flex-1"
        >
          <input
            id="autoship-toggle"
            type="checkbox"
            checked={autoship}
            onChange={(e) => setAutoship(e.target.checked)}
            className="h-4 w-4 accent-roji-accent"
          />
          <div>
            <div className="text-sm font-semibold text-roji-text">
              Save {recommendation.autoshipDiscountPct}% with monthly autoship
            </div>
            <div className="text-xs text-roji-muted mt-0.5">
              ${autoshipPrice}/mo · free shipping · cancel anytime in your account
            </div>
          </div>
        </label>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Compound schedule</h3>
        <div className="space-y-3">
          {recommendation.compounds.map((c) => (
            <div
              key={c.compoundId}
              className="roji-card !p-5"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <h4 className="text-base font-semibold text-roji-text">
                  {c.name}
                </h4>
                <span className="font-mono text-sm text-roji-accent">
                  {c.amountPerDose}
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs mt-3">
                <DataRow label="Frequency" value={c.frequency} />
                <DataRow label="Timing" value={c.timing} />
                <DataRow label="Route" value={c.route} />
                <DataRow label="Duration" value={`${c.duration_weeks} weeks`} />
              </dl>
              <p className="text-xs text-roji-dim mt-3 leading-relaxed">
                {c.notes}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Cycle timeline</h3>
        <Timeline weeks={recommendation.cycle_length_weeks} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Published references</h3>
        <p className="text-xs text-roji-muted mb-4 leading-relaxed">
          Peer-reviewed literature referenced for educational purposes only.
          Not medical advice.
        </p>
        <ul className="space-y-2">
          {recommendation.references.map((ref) => (
            <li key={ref.url}>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block roji-card !p-4 hover:border-roji-border-hover transition-colors"
              >
                <div className="text-sm text-roji-text">{ref.title}</div>
                <div className="text-xs text-roji-muted mt-1 font-mono">
                  {ref.source}
                  {ref.year ? ` · ${ref.year}` : ""}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-roji-border pt-6">
        <button
          type="button"
          onClick={reset}
          className="roji-btn"
        >
          Start a new protocol
        </button>
      </div>

      <div className="text-[11px] text-roji-dim leading-relaxed border border-roji-border rounded-roji p-4">
        <strong className="text-roji-muted">Research Use Only.</strong> All
        compounds referenced are sold by Roji Peptides for research and
        laboratory use only. Not intended for human dosing, injection,
        ingestion, or any form of bodily introduction. Not evaluated by the
        FDA. Must be 21+ to purchase.
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-roji-dim font-mono uppercase tracking-widest text-[10px] shrink-0 w-20">
        {label}
      </dt>
      <dd className="text-roji-text">{value}</dd>
    </div>
  );
}

function Timeline({ weeks }: { weeks: number }) {
  return (
    <div className="roji-card !p-5">
      <div className="flex items-center gap-1">
        {Array.from({ length: weeks }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-8 rounded-sm bg-gradient-to-b from-roji-accent/40 to-roji-accent/10 border border-roji-accent/30"
            title={`Week ${i + 1}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] font-mono uppercase tracking-widest text-roji-dim">
        <span>Week 01</span>
        <span>Week {String(weeks).padStart(2, "0")}</span>
      </div>
    </div>
  );
}
