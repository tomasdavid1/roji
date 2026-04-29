import { useMemo, useState } from "react";
import {
  compute,
  type Activity,
  type Focus,
  type Sex,
} from "../lib/recomp-math";

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

export function RecompWidget({ data }: { data: ToolData }) {
  const d = data as ToolData & {
    sex?: Sex; age?: number; heightIn?: number; weightLb?: number;
    bodyFatPct?: number; activity?: Activity; focus?: Focus; trainingFreq?: number;
  };

  const [sex, setSex] = useState<Sex>(d.sex ?? "male");
  const [age, setAge] = useState(d.age ?? 32);
  const [heightIn, setHeightIn] = useState(d.heightIn ?? 70);
  const [weightLb, setWeightLb] = useState(d.weightLb ?? 180);
  const [bodyFatPct, setBodyFatPct] = useState(d.bodyFatPct ?? 18);
  const [activity, setActivity] = useState<Activity>(d.activity ?? "moderate");
  const [focus, setFocus] = useState<Focus>(d.focus ?? "both");
  const [trainingFreq, setTrainingFreq] = useState(d.trainingFreq ?? 4);

  const out = useMemo(
    () => compute({ sex, age, heightIn, weightLb, bodyFatPct, activity, focus, proteinPerLbLbm: 1.0, trainingFreq }),
    [sex, age, heightIn, weightLb, bodyFatPct, activity, focus, trainingFreq],
  );

  return (
    <div style={{ padding: 16 }}>
      <div className="roji-card" style={{ marginBottom: 16 }}>
        <div className="roji-label" style={{ marginBottom: 12 }}>Inputs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Sex">
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Age">
            <input type="number" min={18} max={100} value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </Field>
          <Field label="Height (in)">
            <input type="number" min={50} max={84} value={heightIn} onChange={(e) => setHeightIn(Number(e.target.value))} />
          </Field>
          <Field label="Weight (lb)">
            <input type="number" min={80} max={400} value={weightLb} onChange={(e) => setWeightLb(Number(e.target.value))} />
          </Field>
          <Field label={`Body fat: ${bodyFatPct}%`}>
            <input type="range" min={5} max={45} step={0.5} value={bodyFatPct} onChange={(e) => setBodyFatPct(Number(e.target.value))} />
          </Field>
          <Field label="Training (days/wk)">
            <input type="number" min={0} max={7} value={trainingFreq} onChange={(e) => setTrainingFreq(Number(e.target.value))} />
          </Field>
          <Field label="Activity">
            <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
              <option value="sedentary">Sedentary (1.2x)</option>
              <option value="light">Light (1.375x)</option>
              <option value="moderate">Moderate (1.55x)</option>
              <option value="active">Active (1.725x)</option>
              <option value="very_active">Very active (1.9x)</option>
            </select>
          </Field>
          <Field label="Goal">
            <select value={focus} onChange={(e) => setFocus(e.target.value as Focus)}>
              <option value="both">Recomp (slow, both)</option>
              <option value="lean">Build lean mass</option>
              <option value="fat">Lose fat</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="roji-card" style={{ marginBottom: 16 }}>
        <div className="roji-label" style={{ marginBottom: 12 }}>Daily Targets</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Stat label="BMR" value={out.bmrKcal} unit="kcal" />
          <Stat label="TDEE" value={out.tdeeKcal} unit="kcal" />
          <Stat label="Target" value={out.targetKcal} unit="kcal" accent />
        </div>
        <hr className="roji-divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Stat label="Protein" value={out.proteinG} unit="g" />
          <Stat label="Fat" value={out.fatG} unit="g" />
          <Stat label="Carbs" value={out.carbsG} unit="g" />
        </div>
        <hr className="roji-divider" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Stat label="Lean mass" value={out.lbmLb} unit="lb" />
          <Stat label="Fat mass" value={out.fmLb} unit="lb" />
        </div>
      </div>

      <div className="roji-card">
        <div className="roji-label" style={{ marginBottom: 8 }}>Projection</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--roji-border)" }}>
              {["In...", "Weight", "Lean", "Fat", "BF%"].map((h) => (
                <th key={h} style={{
                  padding: "6px 8px",
                  textAlign: h === "In..." ? "left" : "right",
                  fontSize: 11,
                  fontFamily: "var(--roji-font-mono)",
                  color: "var(--roji-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {out.projection.map((p) => (
              <tr key={p.weeks} style={{ borderBottom: "1px solid var(--roji-border)" }}>
                <td style={{ padding: "6px 8px", fontFamily: "var(--roji-font-mono)" }}>{p.weeks} wk</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--roji-font-mono)" }}>{p.weightLb}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--roji-font-mono)", color: "#22c55e" }}>{p.lbmLb}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--roji-font-mono)", color: "#eab308" }}>{p.fmLb}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--roji-font-mono)" }}>{p.bfPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            Notes
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--roji-text-primary)" }}>
            {out.warnings.map((w) => <li key={w} style={{ marginBottom: 4 }}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 13 }}>
      <span className="roji-label">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: number | string; unit?: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontFamily: "var(--roji-font-mono)", fontSize: accent ? 20 : 16, fontWeight: 600, color: accent ? "var(--roji-accent)" : "var(--roji-text-primary)" }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: "var(--roji-text-muted)", marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}
