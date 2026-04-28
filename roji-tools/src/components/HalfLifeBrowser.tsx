"use client";

import { useMemo, useState } from "react";

import {
  COMPOUNDS,
  CATEGORIES,
  decayCurve,
  type Compound,
  type Route,
} from "@/data/compounds";

const ROUTE_LABEL: Record<Route, string> = {
  subq: "Subcut.",
  im: "IM",
  iv: "IV",
  intranasal: "Intranasal",
  oral: "Oral",
};

export function HalfLifeBrowser() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [activeSlug, setActiveSlug] = useState<string>(COMPOUNDS[0].slug);

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
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex items-center gap-2">
            <input
              className="roji-input flex-1 text-sm"
              placeholder="Search compounds…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  activeCat === c
                    ? "border-roji-accent bg-roji-accent/10 text-roji-accent"
                    : "border-roji-border bg-roji-dark text-roji-muted hover:border-roji-border-hover hover:text-roji-text"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-roji border border-roji-border bg-roji-darker">
            {filtered.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveSlug(c.slug)}
                className={`flex w-full items-center justify-between gap-3 border-b border-roji-border/60 px-4 py-3 text-left last:border-b-0 transition-colors ${
                  activeSlug === c.slug
                    ? "bg-roji-accent/10"
                    : "hover:bg-roji-card"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] text-roji-muted">
                    {c.category}
                  </div>
                </div>
                {Object.entries(c.halfLifeHoursByRoute)[0] && (
                  <div className="text-right text-[11px] font-mono text-roji-dim">
                    {hrRangeLabel(
                      (Object.values(c.halfLifeHoursByRoute)[0] as [
                        number,
                        number,
                      ]) ?? [0, 0],
                    )}
                  </div>
                )}
              </button>
            ))}
            {!filtered.length && (
              <div className="p-6 text-center text-sm text-roji-muted">
                No compounds match.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6">
          <CompoundDetail compound={active} />
        </div>
      </div>
    </section>
  );
}

function hrRangeLabel(r: [number, number]) {
  const [lo, hi] = r;
  if (lo < 1 && hi < 1) return `${(lo * 60).toFixed(0)}–${(hi * 60).toFixed(0)} min`;
  if (lo === hi) return `${lo} h`;
  return `${lo}–${hi} h`;
}

function CompoundDetail({ compound }: { compound: Compound }) {
  const routes = Object.keys(compound.halfLifeHoursByRoute) as Route[];
  const [route, setRoute] = useState<Route>(routes[0]);
  const range = compound.halfLifeHoursByRoute[route] ?? [0, 0];
  const middle = (range[0] + range[1]) / 2 || 1;
  const window = Math.max(8, Math.min(240, middle * 6));
  const curve = decayCurve(middle, window, 80);

  return (
    <>
      <div className="roji-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="roji-mono-label">{compound.category}</div>
            <h2 className="text-2xl">{compound.name}</h2>
            {compound.aliases.length > 0 && (
              <div className="mt-1 text-xs text-roji-muted">
                Also: {compound.aliases.join(" · ")}
              </div>
            )}
          </div>
          {compound.molecularWeightDa && (
            <div className="text-right">
              <div className="roji-mono-label">Molecular weight</div>
              <div className="font-mono text-lg">
                {compound.molecularWeightDa.toFixed(2)}{" "}
                <span className="text-xs text-roji-dim">Da</span>
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-roji-muted">
          {compound.oneLiner}
        </p>
      </div>

      <div className="roji-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="roji-mono-label">Half-life by route</div>
          <div className="flex gap-1">
            {routes.map((r) => (
              <button
                key={r}
                onClick={() => setRoute(r)}
                className={`rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                  route === r
                    ? "border-roji-accent bg-roji-accent/10 text-roji-accent"
                    : "border-roji-border text-roji-muted hover:border-roji-border-hover hover:text-roji-text"
                }`}
              >
                {ROUTE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-roji-muted">
              Half-life
            </div>
            <div className="mt-1 font-mono text-2xl text-roji-accent">
              {hrRangeLabel(range)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-roji-muted">
              Falls to 25%
            </div>
            <div className="mt-1 font-mono text-2xl text-roji-text">
              ~{(middle * 2).toFixed(1)} h
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-roji-muted">
              Effectively cleared
            </div>
            <div className="mt-1 font-mono text-2xl text-roji-text">
              ~{(middle * 5).toFixed(1)} h
            </div>
          </div>
        </div>

        {compound.bioavailabilityNotes?.[route] && (
          <p className="mt-4 text-xs leading-relaxed text-roji-muted">
            <span className="font-mono uppercase tracking-wider text-roji-dim">
              Notes ·{" "}
            </span>
            {compound.bioavailabilityNotes[route]}
          </p>
        )}

        <div className="mt-6">
          <DecayChart
            curve={curve}
            halfLifeHours={middle}
            windowHours={window}
          />
          <p className="mt-2 text-[11px] text-roji-dim">
            Single-compartment exponential decay model — for illustration.
            Real plasma curves include absorption, distribution, and
            elimination phases.
          </p>
        </div>
      </div>

      {(compound.storageNotes || compound.solubilityNotes) && (
        <div className="roji-card">
          <div className="roji-mono-label mb-3">Lab handling</div>
          {compound.storageNotes && (
            <p className="mb-2 text-sm text-roji-muted">
              <span className="font-medium text-roji-text">Storage: </span>
              {compound.storageNotes}
            </p>
          )}
          {compound.solubilityNotes && (
            <p className="text-sm text-roji-muted">
              <span className="font-medium text-roji-text">Solubility: </span>
              {compound.solubilityNotes}
            </p>
          )}
        </div>
      )}

      <div className="roji-card">
        <div className="roji-mono-label mb-3">References</div>
        <ul className="space-y-2 text-sm">
          {compound.references.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-roji-accent hover:text-roji-accent-hover"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {grid.map((g) => (
        <g key={g}>
          <line
            x1={PAD}
            x2={W - PAD}
            y1={yScale(g)}
            y2={yScale(g)}
            stroke="rgba(255,255,255,0.06)"
          />
          <text
            x={PAD - 6}
            y={yScale(g) + 3}
            textAnchor="end"
            className="fill-roji-dim font-mono text-[9px]"
          >
            {g}%
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(79,109,245,0.12)" />
      <path d={path} fill="none" stroke="var(--roji-accent)" strokeWidth="2" />
      <line
        x1={xScale(halfLifeHours)}
        x2={xScale(halfLifeHours)}
        y1={yScale(0)}
        y2={yScale(50)}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 3"
      />
      <text
        x={xScale(halfLifeHours) + 4}
        y={yScale(50) - 4}
        className="fill-roji-text font-mono text-[10px]"
      >
        t½ {halfLifeHours.toFixed(1)} h
      </text>
      <text
        x={W - PAD}
        y={H - 6}
        textAnchor="end"
        className="fill-roji-dim font-mono text-[9px]"
      >
        {windowHours.toFixed(0)} h
      </text>
      <text x={PAD} y={H - 6} className="fill-roji-dim font-mono text-[9px]">
        0 h
      </text>
    </svg>
  );
}
