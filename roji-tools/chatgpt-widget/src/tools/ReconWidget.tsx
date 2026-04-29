import { useMemo, useState } from "react";
import { compute, SYRINGE_TOTAL_UNITS, type SyringeKind } from "../lib/recon-math";

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

interface ReconResult {
  concentrationMcgPerMl: number;
  concentrationMcgPerUnit: number;
  unitsPerDose: number;
  mlPerDose: number;
  totalDoses: number;
  vialMg: number;
  waterMl: number;
  doseMcg: number;
  syringe?: SyringeKind;
}

const PRESETS = [
  { label: "BPC-157 5mg", vialMg: 5, waterMl: 2, doseMcg: 250 },
  { label: "TB-500 5mg", vialMg: 5, waterMl: 2, doseMcg: 500 },
  { label: "Ipamorelin 5mg", vialMg: 5, waterMl: 2, doseMcg: 200 },
  { label: "CJC-1295 DAC 2mg", vialMg: 2, waterMl: 2, doseMcg: 100 },
  { label: "MOTS-c 10mg", vialMg: 10, waterMl: 2, doseMcg: 5000 },
];

export function ReconWidget({ data }: { data: ToolData }) {
  const initial = data as unknown as ReconResult;

  const [vialMg, setVialMg] = useState(initial.vialMg ?? 5);
  const [waterMl, setWaterMl] = useState(initial.waterMl ?? 2);
  const [doseMcg, setDoseMcg] = useState(initial.doseMcg ?? 250);
  const [syringe, setSyringe] = useState<SyringeKind>(initial.syringe ?? "u100");

  const out = useMemo(
    () => compute({ vialMg, waterMl, doseMcg, syringe }),
    [vialMg, waterMl, doseMcg, syringe],
  );

  const totalUnits = SYRINGE_TOTAL_UNITS[syringe];
  const filledUnits = Math.max(0, Math.min(totalUnits, out.unitsPerDose));

  return (
    <div style={{ padding: 16 }}>
      <div className="roji-card" style={{ marginBottom: 16 }}>
        <div className="roji-label" style={{ marginBottom: 12 }}>Inputs</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="roji-label">Vial size (mg)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={0.5}
                max={20}
                step={0.5}
                value={vialMg}
                onChange={(e) => setVialMg(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={vialMg}
                onChange={(e) => setVialMg(Number(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ fontSize: 12, color: "var(--roji-text-muted)" }}>mg</span>
            </div>
          </div>
          <div>
            <label className="roji-label">BAC water (mL)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={waterMl}
                onChange={(e) => setWaterMl(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={waterMl}
                onChange={(e) => setWaterMl(Number(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ fontSize: 12, color: "var(--roji-text-muted)" }}>mL</span>
            </div>
          </div>
          <div>
            <label className="roji-label">Target dose (mcg)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={25}
                max={5000}
                step={25}
                value={doseMcg}
                onChange={(e) => setDoseMcg(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={1}
                step={1}
                value={doseMcg}
                onChange={(e) => setDoseMcg(Number(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ fontSize: 12, color: "var(--roji-text-muted)" }}>mcg</span>
            </div>
          </div>
          <div>
            <label className="roji-label">Syringe</label>
            <select
              value={syringe}
              onChange={(e) => setSyringe(e.target.value as SyringeKind)}
            >
              <option value="u100">U-100 insulin (1 mL)</option>
              <option value="u50">U-50 insulin (0.5 mL)</option>
              <option value="u40">U-40 veterinary (0.4 mL)</option>
            </select>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setVialMg(p.vialMg);
                  setWaterMl(p.waterMl);
                  setDoseMcg(p.doseMcg);
                }}
                className="roji-btn-ghost"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  borderRadius: 9999,
                  border: "1px solid var(--roji-border)",
                  background: "var(--roji-dark)",
                  color: "var(--roji-text-secondary)",
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="roji-card" style={{ marginBottom: 16 }}>
        <div className="roji-label" style={{ marginBottom: 12 }}>Results</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Metric label="Concentration" value={out.concentrationMcgPerMl.toFixed(0)} unit="mcg/mL" />
          <Metric label="Per syringe unit" value={out.concentrationMcgPerUnit.toFixed(1)} unit="mcg/unit" />
          <Metric label="Units for dose" value={out.unitsPerDose.toFixed(1)} unit="units" accent />
          <Metric label="Volume per dose" value={out.mlPerDose.toFixed(3)} unit="mL" />
          <Metric label="Total doses" value={String(out.totalDoses)} unit="doses" />
          <Metric label="Vial content" value={(vialMg * 1000).toLocaleString()} unit="mcg" />
        </div>
      </div>

      <div className="roji-card">
        <div className="roji-label" style={{ marginBottom: 8 }}>
          Syringe draw ({syringe.toUpperCase()})
        </div>
        <SyringeViz totalUnits={totalUnits} filledUnits={filledUnits} />
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--roji-text-muted)" }}>
          Draw to <span style={{ fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-primary)" }}>
            {filledUnits.toFixed(1)} units
          </span> ({((filledUnits / totalUnits) * 100).toFixed(1)}% of syringe)
        </p>
      </div>

      {!!out.warnings.length && (
        <div style={{
          marginTop: 16,
          padding: 12,
          borderRadius: "var(--roji-radius)",
          border: "1px solid rgba(234,179,8,0.4)",
          background: "rgba(234,179,8,0.05)",
        }}>
          <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "#eab308", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Heads up
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--roji-text-primary)" }}>
            {out.warnings.map((w) => <li key={w} style={{ marginBottom: 4 }}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--roji-font-mono)", fontSize: accent ? 20 : 16, fontWeight: 600, color: accent ? "var(--roji-accent)" : "var(--roji-text-primary)" }}>
        {value}
        <span style={{ fontSize: 11, color: "var(--roji-text-muted)", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function SyringeViz({ totalUnits, filledUnits }: { totalUnits: number; filledUnits: number }) {
  const overflow = filledUnits > totalUnits;
  const clamped = Math.max(0, Math.min(totalUnits, filledUnits));
  const fillPct = (clamped / totalUnits) * 100;
  const major = totalUnits >= 50 ? 10 : 5;
  const ticks: number[] = [];
  for (let i = 0; i <= totalUnits; i += major) ticks.push(i);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        <div style={{
          position: "relative",
          flex: 1,
          height: 24,
          borderRadius: 3,
          border: "1px solid var(--roji-border)",
          background: "var(--roji-dark)",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${fillPct}%`,
            background: "rgba(79,109,245,0.5)",
            transition: "width 0.2s",
          }} />
          {fillPct > 0 && (
            <div style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `calc(${fillPct}% - 1px)`,
              width: 2,
              background: "var(--roji-accent)",
            }} />
          )}
        </div>
        <div style={{ width: 10, height: 10, transform: "rotate(45deg)", background: "rgba(255,255,255,0.2)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", marginTop: 4 }}>
        {ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
      {overflow && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#eab308" }}>
          Exceeds syringe capacity. Add more water or use a larger syringe.
        </div>
      )}
    </div>
  );
}
