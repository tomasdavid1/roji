"use client";

import { useMemo, useState } from "react";

import { compute, SYRINGE_TOTAL_UNITS, type SyringeKind } from "@/lib/recon-math";
import { track } from "@/lib/track";

const PRESETS = [
  { label: "BPC-157 5mg", vialMg: 5, waterMl: 2, doseMcg: 250 },
  { label: "TB-500 5mg", vialMg: 5, waterMl: 2, doseMcg: 500 },
  { label: "Ipamorelin 5mg", vialMg: 5, waterMl: 2, doseMcg: 200 },
  { label: "CJC-1295 DAC 2mg", vialMg: 2, waterMl: 2, doseMcg: 100 },
  { label: "MOTS-c 10mg", vialMg: 10, waterMl: 2, doseMcg: 5000 },
];

export function ReconCalculator() {
  const [vialMg, setVialMg] = useState(5);
  const [waterMl, setWaterMl] = useState(2);
  const [doseMcg, setDoseMcg] = useState(250);
  const [syringe, setSyringe] = useState<SyringeKind>("u100");
  const [trackedOnce, setTrackedOnce] = useState(false);

  const out = useMemo(
    () => compute({ vialMg, waterMl, doseMcg, syringe }),
    [vialMg, waterMl, doseMcg, syringe],
  );

  const fireOnce = (event: string, params: Record<string, string | number>) => {
    if (trackedOnce) return;
    setTrackedOnce(true);
    track(event, params);
  };

  const onPreset = (p: (typeof PRESETS)[number]) => {
    setVialMg(p.vialMg);
    setWaterMl(p.waterMl);
    setDoseMcg(p.doseMcg);
    track("recon_preset_click", { preset: p.label });
  };

  const drawTicks = () => {
    const total = SYRINGE_TOTAL_UNITS[syringe];
    const filled = Math.max(0, Math.min(total, out.unitsPerDose));
    return { total, filled };
  };
  const { total: totalUnits, filled: filledUnits } = drawTicks();

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="roji-card">
          <div className="roji-mono-label mb-4">Inputs</div>

          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm">Vial size (mg)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={vialMg}
                  onChange={(e) => {
                    setVialMg(Number(e.target.value));
                    fireOnce("recon_first_input", { input: "vial_mg" });
                  }}
                />
                <input
                  type="number"
                  className="roji-input w-28"
                  min={0.1}
                  step={0.1}
                  value={vialMg}
                  onChange={(e) => setVialMg(Number(e.target.value))}
                />
                <span className="text-sm text-roji-muted">mg</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm">BAC water (mL)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={waterMl}
                  onChange={(e) => {
                    setWaterMl(Number(e.target.value));
                    fireOnce("recon_first_input", { input: "water_ml" });
                  }}
                />
                <input
                  type="number"
                  className="roji-input w-28"
                  min={0.1}
                  step={0.1}
                  value={waterMl}
                  onChange={(e) => setWaterMl(Number(e.target.value))}
                />
                <span className="text-sm text-roji-muted">mL</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm">Target dose (mcg)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={25}
                  max={5000}
                  step={25}
                  value={doseMcg}
                  onChange={(e) => {
                    setDoseMcg(Number(e.target.value));
                    fireOnce("recon_first_input", { input: "dose_mcg" });
                  }}
                />
                <input
                  type="number"
                  className="roji-input w-28"
                  min={1}
                  step={1}
                  value={doseMcg}
                  onChange={(e) => setDoseMcg(Number(e.target.value))}
                />
                <span className="text-sm text-roji-muted">mcg</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm">Syringe</label>
              <select
                className="roji-select"
                value={syringe}
                onChange={(e) => setSyringe(e.target.value as SyringeKind)}
              >
                <option value="u100">U-100 insulin syringe (1 mL)</option>
                <option value="u50">U-50 insulin syringe (0.5 mL)</option>
                <option value="u40">U-40 syringe (veterinary, 0.4 mL)</option>
              </select>
            </div>

            <div>
              <div className="roji-mono-label mb-2">Common starting points</div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onPreset(p)}
                    className="rounded-full border border-roji-border bg-roji-dark px-3 py-1 text-xs text-roji-text/80 hover:border-roji-accent hover:text-roji-text transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-roji-dim">
                Compound names shown for convenience. The calculator does
                nothing different per compound — it's pure unit math.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="roji-card">
            <div className="roji-mono-label mb-4">Result</div>
            <div className="grid grid-cols-2 gap-4">
              <Metric
                label="Concentration"
                value={out.concentrationMcgPerMl.toFixed(0)}
                suffix=" mcg/mL"
              />
              <Metric
                label="Per syringe unit"
                value={out.concentrationMcgPerUnit.toFixed(1)}
                suffix=" mcg / unit"
              />
              <Metric
                label="Units for target dose"
                value={out.unitsPerDose.toFixed(1)}
                suffix=" units"
                emphasize
              />
              <Metric
                label="Volume per dose"
                value={out.mlPerDose.toFixed(3)}
                suffix=" mL"
              />
              <Metric
                label="Total doses in vial"
                value={String(out.totalDoses)}
                suffix=" doses"
              />
              <Metric
                label="Vial total content"
                value={(vialMg * 1000).toLocaleString()}
                suffix=" mcg"
              />
            </div>
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-4">
              Where to draw on a {syringe.toUpperCase()} syringe
            </div>
            <SyringeViz totalUnits={totalUnits} filledUnits={filledUnits} />
            <p className="mt-3 text-xs text-roji-muted">
              Draw to about{" "}
              <span className="font-mono text-roji-text">
                {filledUnits.toFixed(1)} units
              </span>{" "}
              ({((filledUnits / totalUnits) * 100).toFixed(1)}% of the
              syringe).
            </p>
          </div>

          {!!out.alternativeDoses.length && (
            <div className="roji-card">
              <div className="roji-mono-label mb-3">
                What if I dosed differently?
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {out.alternativeDoses.map((a) => (
                  <button
                    key={a.dose}
                    onClick={() => setDoseMcg(a.dose)}
                    className="flex items-center justify-between gap-2 rounded-roji border border-roji-border bg-roji-dark px-3 py-2 transition-colors hover:border-roji-accent"
                  >
                    <span className="text-roji-muted">{a.dose} mcg</span>
                    <span className="font-mono text-roji-text">
                      {a.units.toFixed(1)} u
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!!out.warnings.length && (
            <div className="rounded-roji border border-roji-warning/40 bg-roji-warning/5 p-4">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-roji-warning">
                Heads up
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-roji-text/85">
                {out.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  emphasize,
}: {
  label: string;
  value: string;
  suffix: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-mono ${
          emphasize ? "text-2xl text-roji-accent" : "text-lg text-roji-text"
        }`}
      >
        {value}
        <span className="text-xs text-roji-dim">{suffix}</span>
      </div>
    </div>
  );
}

function SyringeViz({
  totalUnits,
  filledUnits,
}: {
  totalUnits: number;
  filledUnits: number;
}) {
  // Render a horizontal syringe: barrel with N tick marks, plunger
  // and a fill region from 0 to filledUnits.
  const overflow = filledUnits > totalUnits;
  const clamped = Math.max(0, Math.min(totalUnits, filledUnits));
  const fillPct = (clamped / totalUnits) * 100;

  // Show major ticks every 10 (or every 5 for small totals) units.
  const major = totalUnits >= 50 ? 10 : 5;
  const ticks: number[] = [];
  for (let i = 0; i <= totalUnits; i += major) ticks.push(i);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-3 rounded-l-sm bg-roji-text/30" />
        <div className="relative h-7 flex-1 rounded-sm border border-roji-border bg-roji-dark overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-roji-accent/60 transition-all"
            style={{ width: `${fillPct}%` }}
          />
          {/* tick marks */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-y-0 w-px bg-roji-border"
              style={{ left: `${(t / totalUnits) * 100}%` }}
            />
          ))}
          {/* fill marker */}
          {fillPct > 0 && (
            <div
              className="absolute inset-y-0 w-[2px] bg-roji-accent"
              style={{ left: `calc(${fillPct}% - 1px)` }}
            />
          )}
        </div>
        <div className="h-3 w-3 rotate-45 bg-roji-text/30" />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-mono text-roji-dim">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {overflow && (
        <div className="mt-2 text-xs text-roji-warning">
          That's more than the syringe holds. Add more BAC water or use a
          larger syringe.
        </div>
      )}
    </div>
  );
}
