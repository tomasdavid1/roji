"use client";

import { useMemo, useState } from "react";

import { SUPPS, findInteractions, type Severity } from "@/data/supplements";
import { track } from "@/lib/track";

const SEVERITY_LABEL: Record<Severity, string> = {
  synergy: "Synergy",
  timing: "Timing conflict",
  redundant: "Redundant",
  caution: "Caution",
};

const SEVERITY_TONE: Record<Severity, { fg: string; bg: string; border: string }> = {
  synergy: { fg: "text-roji-success", bg: "bg-roji-success/5", border: "border-roji-success/40" },
  timing: { fg: "text-roji-warning", bg: "bg-roji-warning/5", border: "border-roji-warning/40" },
  redundant: { fg: "text-roji-warning", bg: "bg-roji-warning/5", border: "border-roji-warning/40" },
  caution: { fg: "text-roji-danger", bg: "bg-roji-danger/5", border: "border-roji-danger/40" },
};

export function InteractionChecker() {
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const out: Record<string, typeof SUPPS> = {};
    SUPPS.filter((s) =>
      search.trim()
        ? s.label.toLowerCase().includes(search.trim().toLowerCase())
        : true,
    ).forEach((s) => {
      (out[s.category] = out[s.category] || []).push(s);
    });
    return out;
  }, [search]);

  const findings = useMemo(() => findInteractions(picked), [picked]);

  const toggle = (slug: string) => {
    setPicked((p) => {
      const next = p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug];
      track("interactions_toggle", { count: next.length });
      return next;
    });
  };

  const grouped = findings.reduce<Record<Severity, typeof findings>>(
    (acc, f) => {
      (acc[f.severity] = acc[f.severity] || []).push(f);
      return acc;
    },
    { synergy: [], timing: [], redundant: [], caution: [] },
  );

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <input
            className="roji-input mb-4"
            placeholder="Search supplements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[64vh] overflow-y-auto rounded-roji border border-roji-border bg-roji-darker">
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat}>
                <div className="sticky top-0 border-b border-roji-border bg-roji-darker px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-roji-muted">
                  {cat}
                </div>
                {items.map((s) => {
                  const checked = picked.includes(s.slug);
                  return (
                    <label
                      key={s.slug}
                      className="flex cursor-pointer items-center gap-3 border-b border-roji-border/60 px-4 py-2 text-sm hover:bg-roji-card last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.slug)}
                        className="h-4 w-4 accent-roji-accent"
                      />
                      <span className={checked ? "text-roji-text" : "text-roji-text/85"}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
            {!Object.keys(groups).length && (
              <div className="p-6 text-center text-sm text-roji-muted">
                No matches.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="roji-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="roji-mono-label">Your stack</div>
                <div className="mt-1 text-sm text-roji-text">
                  {picked.length === 0
                    ? "Pick supplements on the left to start."
                    : `${picked.length} item${picked.length === 1 ? "" : "s"} selected · ${findings.length} interaction${findings.length === 1 ? "" : "s"} found`}
                </div>
              </div>
              {picked.length > 0 && (
                <button
                  onClick={() => setPicked([])}
                  className="text-xs text-roji-dim hover:text-roji-danger"
                >
                  Clear
                </button>
              )}
            </div>
            {picked.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {picked.map((slug) => {
                  const supp = SUPPS.find((s) => s.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-2 rounded-full bg-roji-accent/10 px-3 py-1 text-xs text-roji-accent"
                    >
                      {supp?.label ?? slug}
                      <button
                        onClick={() => toggle(slug)}
                        className="text-roji-accent/60 hover:text-roji-accent"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {findings.length === 0 && picked.length > 1 && (
            <div className="rounded-roji border border-roji-border bg-roji-card p-5 text-sm text-roji-muted">
              No known interactions among these supplements in our database.
              That doesn't mean none exist — talk to a pharmacist or trusted
              source for anything beyond OTC supplements.
            </div>
          )}

          {(["caution", "timing", "redundant", "synergy"] as Severity[]).map((sev) =>
            grouped[sev]?.length ? (
              <div
                key={sev}
                className={`rounded-roji border p-5 ${SEVERITY_TONE[sev].border} ${SEVERITY_TONE[sev].bg}`}
              >
                <div
                  className={`mb-3 text-xs font-mono uppercase tracking-wider ${SEVERITY_TONE[sev].fg}`}
                >
                  {SEVERITY_LABEL[sev]} ({grouped[sev].length})
                </div>
                <div className="grid gap-3">
                  {grouped[sev].map((i, idx) => {
                    const a = SUPPS.find((s) => s.slug === i.pair[0]);
                    const b = SUPPS.find((s) => s.slug === i.pair[1]);
                    return (
                      <div
                        key={idx}
                        className="rounded-roji border border-roji-border bg-roji-card p-4"
                      >
                        <div className="mb-1 text-sm font-medium">
                          {a?.label} + {b?.label}
                        </div>
                        <div className={`text-xs font-medium ${SEVERITY_TONE[sev].fg}`}>
                          {i.action}
                        </div>
                        <p className="mt-2 text-sm text-roji-muted leading-relaxed">
                          {i.explainer}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}
