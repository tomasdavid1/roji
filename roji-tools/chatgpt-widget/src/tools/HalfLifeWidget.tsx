import { useMemo, useState } from "react";
import {
  COMPOUNDS,
  CATEGORIES,
  decayCurve,
  type Compound,
  type Route,
} from "../data/compounds";

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

const ROUTE_LABEL: Record<Route, string> = {
  subq: "Subcut.",
  im: "IM",
  iv: "IV",
  intranasal: "Intranasal",
  oral: "Oral",
};

export function HalfLifeWidget({ data }: { data: ToolData }) {
  const initial = data as ToolData & { compound?: string };
  const initialSlug = initial.compound ?? COMPOUNDS[0].slug;

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug);

  const filtered = useMemo(() => {
    return COMPOUNDS.filter((c) => {
      if (activeCat !== "All" && c.category !== activeCat) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q)) ||
        c.oneLiner.toLowerCase().includes(q)
      );
    });
  }, [query, activeCat]);

  const active = COMPOUNDS.find((c) => c.slug === activeSlug) ?? COMPOUNDS[0];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* Sidebar */}
        <div>
          <input
            placeholder="Search compounds..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 9999,
                  border: `1px solid ${activeCat === c ? "var(--roji-accent)" : "var(--roji-border)"}`,
                  background: activeCat === c ? "rgba(79,109,245,0.1)" : "var(--roji-dark)",
                  color: activeCat === c ? "var(--roji-accent)" : "var(--roji-text-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{
            maxHeight: 350,
            overflowY: "auto",
            borderRadius: "var(--roji-radius)",
            border: "1px solid var(--roji-border)",
            background: "var(--roji-dark)",
          }}>
            {filtered.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveSlug(c.slug)}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  background: activeSlug === c.slug ? "rgba(79,109,245,0.1)" : "transparent",
                  color: "var(--roji-text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--roji-text-muted)" }}>{c.category}</div>
                </div>
                {Object.values(c.halfLifeHoursByRoute)[0] && (
                  <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)" }}>
                    {hrRangeLabel(Object.values(c.halfLifeHoursByRoute)[0] as [number, number])}
                  </div>
                )}
              </button>
            ))}
            {!filtered.length && (
              <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "var(--roji-text-muted)" }}>
                No compounds match.
              </div>
            )}
          </div>
        </div>

        {/* Detail */}
        <CompoundDetail compound={active} />
      </div>
    </div>
  );
}

function hrRangeLabel(r: [number, number]) {
  const [lo, hi] = r;
  if (lo < 1 && hi < 1) return `${(lo * 60).toFixed(0)}-${(hi * 60).toFixed(0)} min`;
  if (lo === hi) return `${lo} h`;
  return `${lo}-${hi} h`;
}

function CompoundDetail({ compound }: { compound: Compound }) {
  const routes = Object.keys(compound.halfLifeHoursByRoute) as Route[];
  const [route, setRoute] = useState<Route>(routes[0]);
  const range = compound.halfLifeHoursByRoute[route] ?? [0, 0];
  const middle = (range[0] + range[1]) / 2 || 1;
  const window = Math.max(8, Math.min(240, middle * 6));
  const curve = decayCurve(middle, window, 80);

  return (
    <div>
      <div className="roji-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="roji-label">{compound.category}</div>
            <h2 style={{ fontSize: 22, margin: "4px 0 0", fontWeight: 600 }}>{compound.name}</h2>
            {compound.aliases.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--roji-text-muted)", marginTop: 4 }}>
                Also: {compound.aliases.join(" · ")}
              </div>
            )}
          </div>
          {compound.molecularWeightDa && (
            <div style={{ textAlign: "right" }}>
              <div className="roji-label">Molecular weight</div>
              <div style={{ fontFamily: "var(--roji-font-mono)", fontSize: 18 }}>
                {compound.molecularWeightDa.toFixed(2)}
                <span style={{ fontSize: 11, color: "var(--roji-text-muted)", marginLeft: 4 }}>Da</span>
              </div>
            </div>
          )}
        </div>
        <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--roji-text-muted)" }}>
          {compound.oneLiner}
        </p>
      </div>

      <div className="roji-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="roji-label">Half-life by route</div>
          <div style={{ display: "flex", gap: 4 }}>
            {routes.map((r) => (
              <button
                key={r}
                onClick={() => setRoute(r)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 9999,
                  border: `1px solid ${route === r ? "var(--roji-accent)" : "var(--roji-border)"}`,
                  background: route === r ? "rgba(79,109,245,0.1)" : "transparent",
                  color: route === r ? "var(--roji-accent)" : "var(--roji-text-muted)",
                  fontSize: 11,
                  fontFamily: "var(--roji-font-mono)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {ROUTE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Half-life
            </div>
            <div style={{ marginTop: 4, fontFamily: "var(--roji-font-mono)", fontSize: 20, fontWeight: 600, color: "var(--roji-accent)" }}>
              {hrRangeLabel(range)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Falls to 25%
            </div>
            <div style={{ marginTop: 4, fontFamily: "var(--roji-font-mono)", fontSize: 20, fontWeight: 600 }}>
              ~{(middle * 2).toFixed(1)} h
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Cleared
            </div>
            <div style={{ marginTop: 4, fontFamily: "var(--roji-font-mono)", fontSize: 20, fontWeight: 600 }}>
              ~{(middle * 5).toFixed(1)} h
            </div>
          </div>
        </div>

        {compound.bioavailabilityNotes?.[route] && (
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--roji-text-muted)", lineHeight: 1.5 }}>
            <span style={{ fontFamily: "var(--roji-font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--roji-text-muted)" }}>Notes · </span>
            {compound.bioavailabilityNotes[route]}
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <DecayChart curve={curve} halfLifeHours={middle} windowHours={window} />
        </div>
      </div>

      {(compound.storageNotes || compound.solubilityNotes) && (
        <div className="roji-card" style={{ marginBottom: 12 }}>
          <div className="roji-label" style={{ marginBottom: 8 }}>Lab handling</div>
          {compound.storageNotes && (
            <p style={{ fontSize: 13, color: "var(--roji-text-muted)", marginBottom: 6 }}>
              <span style={{ fontWeight: 500, color: "var(--roji-text-primary)" }}>Storage: </span>
              {compound.storageNotes}
            </p>
          )}
          {compound.solubilityNotes && (
            <p style={{ fontSize: 13, color: "var(--roji-text-muted)" }}>
              <span style={{ fontWeight: 500, color: "var(--roji-text-primary)" }}>Solubility: </span>
              {compound.solubilityNotes}
            </p>
          )}
        </div>
      )}

      <div className="roji-card">
        <div className="roji-label" style={{ marginBottom: 8 }}>References</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {compound.references.map((r) => (
            <li key={r.url} style={{ marginBottom: 4 }}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--roji-accent)", textDecoration: "none" }}>
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DecayChart({
  curve,
  halfLifeHours,
  windowHours,
}: {
  curve: { t: number; pct: number }[];
  halfLifeHours: number;
  windowHours: number;
}) {
  const W = 600;
  const H = 180;
  const PAD = 30;
  const xScale = (t: number) => PAD + (t / windowHours) * (W - PAD * 2);
  const yScale = (pct: number) => H - PAD - (pct / 100) * (H - PAD * 2);
  const path = curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.t)} ${yScale(p.pct)}`)
    .join(" ");
  const area =
    `${path} L ${xScale(curve[curve.length - 1].t)} ${yScale(0)} ` +
    `L ${xScale(curve[0].t)} ${yScale(0)} Z`;
  const grid = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }} preserveAspectRatio="xMidYMid meet">
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD} x2={W - PAD} y1={yScale(g)} y2={yScale(g)} stroke="rgba(255,255,255,0.06)" />
          <text x={PAD - 6} y={yScale(g) + 3} textAnchor="end" fill="var(--roji-text-muted)" fontFamily="var(--roji-font-mono)" fontSize="10">{g}%</text>
        </g>
      ))}
      <path d={area} fill="rgba(79,109,245,0.12)" />
      <path d={path} fill="none" stroke="var(--roji-accent)" strokeWidth="2" />
      <line x1={xScale(halfLifeHours)} x2={xScale(halfLifeHours)} y1={yScale(0)} y2={yScale(50)} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
      <text x={xScale(halfLifeHours) + 4} y={yScale(50) - 4} fill="var(--roji-text-primary)" fontFamily="var(--roji-font-mono)" fontSize="11">
        t1/2 {halfLifeHours.toFixed(1)} h
      </text>
      <text x={W - PAD} y={H - 6} textAnchor="end" fill="var(--roji-text-muted)" fontFamily="var(--roji-font-mono)" fontSize="10">{windowHours.toFixed(0)} h</text>
      <text x={PAD} y={H - 6} fill="var(--roji-text-muted)" fontFamily="var(--roji-font-mono)" fontSize="10">0 h</text>
    </svg>
  );
}
