import { useMemo, useState } from "react";
import { SUPPS, findInteractions, type Severity } from "../data/supplements";

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  synergy: "Synergy",
  timing: "Timing conflict",
  redundant: "Redundant",
  caution: "Caution",
};

const SEVERITY_STYLE: Record<Severity, { color: string; bg: string; border: string }> = {
  synergy: { color: "#22c55e", bg: "rgba(34,197,94,0.05)", border: "rgba(34,197,94,0.4)" },
  timing: { color: "#eab308", bg: "rgba(234,179,8,0.05)", border: "rgba(234,179,8,0.4)" },
  redundant: { color: "#8b5cf6", bg: "rgba(139,92,246,0.05)", border: "rgba(139,92,246,0.4)" },
  caution: { color: "#ef4444", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.4)" },
};

export function InteractionsWidget({ data }: { data: ToolData }) {
  const initial = data as ToolData & { selected?: string[] };

  const [picked, setPicked] = useState<string[]>(initial.selected ?? []);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const out: Record<string, typeof SUPPS> = {};
    SUPPS.filter((s) =>
      search.trim() ? s.label.toLowerCase().includes(search.trim().toLowerCase()) : true,
    ).forEach((s) => {
      (out[s.category] = out[s.category] || []).push(s);
    });
    return out;
  }, [search]);

  const findings = useMemo(() => findInteractions(picked), [picked]);

  const toggle = (slug: string) => {
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : [...p, slug]));
  };

  const grouped = findings.reduce<Record<Severity, typeof findings>>(
    (acc, f) => {
      (acc[f.severity] = acc[f.severity] || []).push(f);
      return acc;
    },
    { synergy: [], timing: [], redundant: [], caution: [] },
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* Supplement picker */}
        <div>
          <input
            placeholder="Search supplements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{
            maxHeight: 360,
            overflowY: "auto",
            borderRadius: "var(--roji-radius)",
            border: "1px solid var(--roji-border)",
            background: "var(--roji-dark)",
          }}>
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat}>
                <div style={{
                  position: "sticky",
                  top: 0,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontFamily: "var(--roji-font-mono)",
                  color: "var(--roji-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: "var(--roji-dark)",
                  borderBottom: "1px solid var(--roji-border)",
                }}>{cat}</div>
                {items.map((s) => {
                  const checked = picked.includes(s.slug);
                  return (
                    <label key={s.slug} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.slug)}
                        style={{ accentColor: "var(--roji-accent)" }}
                      />
                      <span style={{ color: checked ? "var(--roji-text-primary)" : "var(--roji-text-secondary)" }}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="roji-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="roji-label">Your stack</div>
                <div style={{ fontSize: 13, marginTop: 4, color: "var(--roji-text-secondary)" }}>
                  {picked.length === 0
                    ? "Pick supplements to start."
                    : `${picked.length} selected · ${findings.length} interaction${findings.length === 1 ? "" : "s"}`}
                </div>
              </div>
              {picked.length > 0 && (
                <button onClick={() => setPicked([])} style={{
                  background: "none", border: "none", color: "var(--roji-text-muted)",
                  cursor: "pointer", fontSize: 12,
                }}>Clear</button>
              )}
            </div>
            {picked.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {picked.map((slug) => {
                  const supp = SUPPS.find((s) => s.slug === slug);
                  return (
                    <span key={slug} className="roji-badge" style={{
                      background: "rgba(79,109,245,0.1)",
                      color: "var(--roji-accent)",
                    }}>
                      {supp?.label ?? slug}
                      <button onClick={() => toggle(slug)} style={{
                        background: "none", border: "none", color: "var(--roji-accent)",
                        cursor: "pointer", marginLeft: 4, fontSize: 14, padding: 0, lineHeight: 1,
                      }}>&times;</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {findings.length === 0 && picked.length > 1 && (
            <div className="roji-card" style={{ fontSize: 13, color: "var(--roji-text-muted)" }}>
              No known interactions in our database.
            </div>
          )}

          {(["caution", "timing", "redundant", "synergy"] as Severity[]).map((sev) =>
            grouped[sev]?.length ? (
              <div key={sev} style={{
                marginBottom: 12,
                padding: 14,
                borderRadius: "var(--roji-radius)",
                border: `1px solid ${SEVERITY_STYLE[sev].border}`,
                background: SEVERITY_STYLE[sev].bg,
              }}>
                <div style={{
                  fontSize: 11,
                  fontFamily: "var(--roji-font-mono)",
                  color: SEVERITY_STYLE[sev].color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}>
                  {SEVERITY_LABEL[sev]} ({grouped[sev].length})
                </div>
                {grouped[sev].map((i, idx) => {
                  const a = SUPPS.find((s) => s.slug === i.pair[0]);
                  const b = SUPPS.find((s) => s.slug === i.pair[1]);
                  return (
                    <div key={idx} className="roji-card" style={{ marginBottom: idx < grouped[sev].length - 1 ? 8 : 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{a?.label} + {b?.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: SEVERITY_STYLE[sev].color, marginTop: 2 }}>{i.action}</div>
                      <p style={{ fontSize: 13, color: "var(--roji-text-muted)", marginTop: 6, lineHeight: 1.5 }}>{i.explainer}</p>
                    </div>
                  );
                })}
              </div>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
