/**
 * Vertical funnel visualization. Each step is a horizontal bar whose width
 * is proportional to its count vs. the top-of-funnel count. Steps with
 * `count === null` (data source not connected) render as a dashed
 * placeholder bar with an inline note.
 *
 * Drop-off rates between consecutive defined steps render between the bars.
 */

import type { FunnelData, FunnelStep } from "@/lib/funnel";
import { fmtInt, fmtPct, fmtUsd } from "@/lib/format";

function srcLabel(s: FunnelStep["source"]): string {
  if (s === "google_ads") return "Google Ads";
  if (s === "ga4") return "GA4";
  if (s === "woocommerce") return "WooCommerce";
  return s;
}

function srcColor(s: FunnelStep["source"]): string {
  if (s === "google_ads") return "bg-roji-accent/20 border-roji-accent/40";
  if (s === "ga4") return "bg-blue-500/15 border-blue-500/30";
  if (s === "woocommerce") return "bg-amber-500/15 border-amber-500/30";
  return "bg-white/[0.04] border-roji-border";
}

interface Props {
  funnel: FunnelData;
}

export function FunnelChart({ funnel }: Props) {
  // Top-of-funnel reference (first step with a real number) to scale bars.
  const top =
    funnel.steps.find((s) => s.count !== null && s.count > 0)?.count ?? 0;

  return (
    <div>
      <div className="space-y-1">
        {funnel.steps.map((step, i) => {
          const width =
            top > 0 && step.count !== null
              ? Math.max(2, (step.count / top) * 100)
              : 0;
          const isMissing = step.count === null;
          const drop = funnel.drop_offs[i - 1];

          return (
            <div key={step.id}>
              {/* Drop-off pill between steps */}
              {i > 0 && drop && (
                <div className="flex items-center justify-center my-1">
                  <span
                    className={[
                      "font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-roji",
                      drop.retention === null
                        ? "bg-white/[0.02] text-roji-dim border border-dashed border-roji-border"
                        : drop.retention >= 0.5
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : drop.retention >= 0.1
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-300 border border-rose-500/30",
                    ].join(" ")}
                    title={
                      drop.retention === null
                        ? "Drop-off unknown — one or both steps lack data"
                        : `${fmtPct(drop.retention)} of users continue past this point`
                    }
                  >
                    {drop.retention === null
                      ? "↓ ?"
                      : `↓ ${fmtPct(drop.retention)} keep`}
                  </span>
                </div>
              )}

              <div
                className={[
                  "roji-card !p-3 border-l-4",
                  isMissing
                    ? "!bg-white/[0.02] border-l-roji-border border-dashed"
                    : "border-l-roji-accent/60",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-roji-dim">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-roji-text">{step.label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-roji-dim">
                      via {srcLabel(step.source)}
                    </span>
                  </div>
                  <div className="text-right">
                    {isMissing ? (
                      <span className="font-mono text-sm text-roji-dim italic">
                        not connected
                      </span>
                    ) : (
                      <span className="font-mono text-lg text-roji-text">
                        {fmtInt(step.count!)}
                      </span>
                    )}
                    {step.cost_usd !== undefined && step.cost_usd > 0 && (
                      <span className="font-mono text-[10px] text-roji-muted ml-2">
                        {fmtUsd(step.cost_usd)} spent
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div className="h-2 bg-white/[0.02] rounded-roji overflow-hidden">
                  {!isMissing ? (
                    <div
                      className={[
                        "h-full border-r",
                        srcColor(step.source),
                      ].join(" ")}
                      style={{ width: `${width}%` }}
                    />
                  ) : (
                    <div className="h-full border border-dashed border-roji-border rounded-roji w-full" />
                  )}
                </div>

                {step.note && (
                  <div className="text-[11px] text-roji-muted mt-2">
                    {step.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
