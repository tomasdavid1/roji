"use client";

import { useEffect, useState } from "react";

import { fmtUsd } from "@/lib/format";

interface ProvisionResult {
  mode: "mock" | "live";
  apiMode: "mock" | "test" | "live";
  blueprint: {
    mode: "tool-only" | "full";
    protocolUrl: string;
    storeUrl: string;
    campaigns: Array<{
      name: string;
      dailyBudgetUsd: number;
      bidStrategy: string;
      rationale: string;
      adGroups: Array<{
        name: string;
        cpcBidCeilingUsd: number;
        finalUrl: string;
        notes?: string;
        keywords: Array<{ text: string; match: string; risk?: string }>;
        ads: Array<{ headlines: string[]; descriptions: string[] }>;
      }>;
      negativeKeywords: string[];
    }>;
  };
  validation_issues: Array<{ field: string; text: string; reason: string }>;
  stats: {
    campaigns: number;
    adGroups: number;
    ads: number;
    keywords: number;
    negatives: number;
    totalDailyBudgetUsd: number;
  };
  campaigns: Array<{
    name: string;
    campaign_id: string;
    reused: boolean;
    ad_groups: Array<{
      name: string;
      keywords_added: number;
      ads_created: number;
    }>;
    negatives_added: number;
  }>;
  warnings: string[];
}

interface ReadinessReport {
  api_mode: "mock" | "test" | "live";
  ready_to_provision: boolean;
  protocol_test_mode: boolean;
  checks: Record<string, { ok: boolean; detail: string }>;
}

export function BlueprintCard() {
  const [mode, setMode] = useState<"tool-only" | "full">("tool-only");
  const [preview, setPreview] = useState<ProvisionResult | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(
    null,
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`/api/ads/blueprint/provision?mode=${mode}`).then((r) =>
            r.json(),
          ),
          fetch("/api/ads/readiness").then((r) => r.json()),
        ]);
        if (!cancelled) {
          if (pRes.error) setError(pRes.error);
          else setPreview(pRes as ProvisionResult);
          setReadiness(rRes as ReadinessReport);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function provision(dryRun: boolean) {
    setProvisioning(true);
    setError("");
    setProvisionResult(null);
    try {
      const res = await fetch("/api/ads/blueprint/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, dry_run: dryRun }),
      });
      const json = (await res.json()) as ProvisionResult & { error?: string };
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Provision failed.");
      }
      setProvisionResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provision failed.");
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <div className="roji-card !p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-roji-text">
            Provision from Blueprint
          </h2>
          <p className="text-xs text-roji-muted mt-1 leading-relaxed">
            Build the launch campaigns from the strategy doc with one click.
            Everything is created PAUSED so you review in Google Ads UI before
            going live.
          </p>
        </div>
        <ApiModeBadge mode={readiness?.api_mode ?? "mock"} />
      </div>

      {/* Mode selector */}
      <fieldset className="space-y-2 mb-5">
        <legend className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
          Mode
        </legend>
        <ModeOption
          checked={mode === "tool-only"}
          onClick={() => setMode("tool-only")}
          name="Tool-only (recommended pre-launch)"
          desc="Campaign 1 only · Ad Group 3 (Biohacker) · ~$30/day · lands on the protocol engine in TEST mode (lead-capture, no commerce)."
        />
        <ModeOption
          checked={mode === "full"}
          onClick={() => setMode("full")}
          name="Full blueprint"
          desc="Campaign 1 (Protocol + Biohacker ad groups, 3 RSAs) + Campaign 3 (Brand Defense). ~$47/day. Compound-specific Ad Group 2 omitted by design."
        />
      </fieldset>

      {/* Preview */}
      {loading && (
        <div className="text-xs font-mono text-roji-dim">Building preview…</div>
      )}
      {!loading && preview && (
        <div className="mb-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
            What will be created
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Daily budget" value={fmtUsd(preview.stats.totalDailyBudgetUsd)} />
            <Stat label="Ad groups" value={String(preview.stats.adGroups)} />
            <Stat label="Keywords" value={String(preview.stats.keywords)} />
            <Stat label="RSAs" value={String(preview.stats.ads)} />
            <Stat label="Negatives" value={String(preview.stats.negatives)} />
            <Stat
              label="Validation"
              value={
                preview.validation_issues.length === 0
                  ? "✓ clean"
                  : `${preview.validation_issues.length} issues`
              }
              ok={preview.validation_issues.length === 0}
            />
          </div>

          {preview.blueprint.campaigns.map((c) => (
            <div key={c.name} className="mb-4">
              <div className="text-sm font-semibold text-roji-text">
                {c.name.replace(" [roji-blueprint]", "")}
              </div>
              <div className="text-[11px] text-roji-dim mt-0.5">
                {fmtUsd(c.dailyBudgetUsd)}/day · {c.bidStrategy.replace(/_/g, " ").toLowerCase()}
              </div>
              <p className="text-xs text-roji-muted mt-2 leading-relaxed">
                {c.rationale}
              </p>
              <ul className="text-[11px] text-roji-dim mt-2 space-y-1">
                {c.adGroups.map((g) => (
                  <li key={g.name}>
                    <span className="text-roji-text">↳ {g.name}</span>{" "}
                    — {g.keywords.length} kw, {g.ads.length} RSA
                    {g.ads.length === 1 ? "" : "s"}, max CPC ${g.cpcBidCeilingUsd.toFixed(2)}
                  </li>
                ))}
                {c.negativeKeywords.length > 0 && (
                  <li className="text-roji-dim">
                    ↳ {c.negativeKeywords.length} campaign-level negative keywords
                    (policy-protection list)
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Readiness */}
      {readiness && readiness.api_mode !== "live" && (
        <div className="rounded-roji border border-roji-border bg-roji-card-subtle p-3 mb-4 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-roji-warning">
            ⚠ Not ready for live provisioning
          </div>
          {Object.entries(readiness.checks)
            .filter(([, v]) => !v.ok)
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} className="text-[11px] text-roji-muted leading-relaxed">
                • <span className="font-mono text-roji-dim">{k}:</span> {v.detail}
              </div>
            ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => provision(true)}
          disabled={provisioning}
          className="roji-btn text-sm"
        >
          {provisioning ? "Working…" : "Re-run dry preview"}
        </button>
        <button
          type="button"
          onClick={() => provision(false)}
          disabled={provisioning || !readiness?.ready_to_provision}
          className="roji-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !readiness?.ready_to_provision
              ? "Live provisioning is gated by the readiness checks above."
              : "Creates the campaigns in Google Ads (PAUSED)."
          }
        >
          {provisioning ? "Provisioning…" : "Provision live (PAUSED)"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-roji-danger mt-3 leading-relaxed">{error}</p>
      )}

      {/* Result */}
      {provisionResult && (
        <div className="mt-5 border-t border-roji-border pt-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
            Run summary ({provisionResult.mode})
          </div>
          {provisionResult.campaigns.map((c) => (
            <div key={c.name} className="text-xs mb-3 last:mb-0">
              <div className="text-roji-text font-semibold">
                {c.reused ? "Reused" : "Created"} · {c.name.replace(" [roji-blueprint]", "")}{" "}
                <span className="text-roji-dim font-mono">#{c.campaign_id}</span>
              </div>
              <ul className="text-[11px] text-roji-muted mt-1 space-y-0.5">
                <li>↳ {c.negatives_added} negatives added</li>
                {c.ad_groups.map((g) => (
                  <li key={g.name}>
                    ↳ <span className="text-roji-text">{g.name}</span>:{" "}
                    {g.keywords_added} kw, {g.ads_created} ads
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {provisionResult.warnings.length > 0 && (
            <div className="text-[11px] text-roji-warning mt-2">
              {provisionResult.warnings.length} warning(s):
              <ul className="mt-1 space-y-0.5">
                {provisionResult.warnings.slice(0, 5).map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ApiModeBadge({ mode }: { mode: "mock" | "test" | "live" }) {
  const cls =
    mode === "live"
      ? "roji-pill-success"
      : mode === "test"
        ? "roji-pill-warning"
        : "roji-pill-muted";
  const label = mode === "live" ? "Live API" : mode === "test" ? "Test API" : "Mock";
  return <span className={cls + " text-[10px] whitespace-nowrap"}>{label}</span>;
}

function ModeOption({
  checked,
  onClick,
  name,
  desc,
}: {
  checked: boolean;
  onClick: () => void;
  name: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "block w-full text-left rounded-roji border px-3 py-2.5 transition-colors " +
        (checked
          ? "border-roji-accent bg-roji-accent/5"
          : "border-roji-border hover:border-roji-border-hover")
      }
    >
      <div className="flex items-start gap-2">
        <div
          className={
            "mt-1 h-3 w-3 rounded-full border " +
            (checked
              ? "border-roji-accent bg-roji-accent"
              : "border-roji-border")
          }
        />
        <div className="flex-1">
          <div className="text-sm text-roji-text">{name}</div>
          <div className="text-[11px] text-roji-muted mt-0.5 leading-relaxed">
            {desc}
          </div>
        </div>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-roji border border-roji-border bg-roji-card-subtle px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
        {label}
      </div>
      <div
        className={
          "text-sm font-mono mt-0.5 " +
          (ok === false
            ? "text-roji-danger"
            : ok === true
              ? "text-roji-success"
              : "text-roji-text")
        }
      >
        {value}
      </div>
    </div>
  );
}
