"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ACTIVITY_MULTIPLIER,
  compute,
  type Activity,
  type Focus,
  type Sex,
} from "@/lib/recomp-math";
import { track } from "@/lib/track";
import { PostResultCTA } from "./PostResultCTA";

export function RecompCalculator() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(32);
  const [heightIn, setHeightIn] = useState(70);
  const [weightLb, setWeightLb] = useState(180);
  const [bodyFatPct, setBodyFatPct] = useState(18);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [focus, setFocus] = useState<Focus>("both");
  const [trainingFreq, setTrainingFreq] = useState(4);
  const [proteinPerLbLbm] = useState(1.0);

  const out = useMemo(
    () =>
      compute({
        sex,
        age,
        heightIn,
        weightLb,
        bodyFatPct,
        activity,
        focus,
        proteinPerLbLbm,
        trainingFreq,
      }),
    [sex, age, heightIn, weightLb, bodyFatPct, activity, focus, proteinPerLbLbm, trainingFreq],
  );

  // Fire `recomp_calculated` once per session, on the first meaningful
  // user interaction (any input change away from defaults). Avoids
  // flooding GA with one event per keystroke. The state mirror also
  // gates the post-result store CTA.
  const firedRef = useRef(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    if (firedRef.current) return;
    const isDefault =
      sex === "male" &&
      age === 32 &&
      heightIn === 70 &&
      weightLb === 180 &&
      bodyFatPct === 18 &&
      activity === "moderate" &&
      focus === "both" &&
      trainingFreq === 4;
    if (isDefault) return;
    firedRef.current = true;
    setHasInteracted(true);
    track("recomp_calculated", { focus, activity });
  }, [sex, age, heightIn, weightLb, bodyFatPct, activity, focus, trainingFreq]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="roji-card">
          <div className="roji-mono-label mb-4">Inputs</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sex">
              <select
                className="roji-select"
                value={sex}
                onChange={(e) => setSex(e.target.value as Sex)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Age">
              <input
                type="number"
                className="roji-input"
                min={18}
                max={100}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </Field>
            <Field label="Height (in)">
              <input
                type="number"
                className="roji-input"
                min={50}
                max={84}
                value={heightIn}
                onChange={(e) => setHeightIn(Number(e.target.value))}
              />
            </Field>
            <Field label="Weight (lb)">
              <input
                type="number"
                className="roji-input"
                min={80}
                max={400}
                value={weightLb}
                onChange={(e) => setWeightLb(Number(e.target.value))}
              />
            </Field>
            <Field label={`Body fat: ${bodyFatPct}%`}>
              <input
                type="range"
                min={5}
                max={45}
                step={0.5}
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(Number(e.target.value))}
              />
              <p className="mt-1 text-[13px] text-roji-dim">
                Best estimate. DEXA, BodPod, or smart-scale all work.
              </p>
            </Field>
            <Field label="Training (sessions/wk)">
              <input
                type="number"
                className="roji-input"
                min={0}
                max={7}
                value={trainingFreq}
                onChange={(e) => setTrainingFreq(Number(e.target.value))}
              />
            </Field>
            <Field label="Activity">
              <select
                className="roji-select"
                value={activity}
                onChange={(e) => setActivity(e.target.value as Activity)}
              >
                <option value="sedentary">Sedentary (1.2×)</option>
                <option value="light">Light (1.375×)</option>
                <option value="moderate">Moderate (1.55×)</option>
                <option value="active">Active (1.725×)</option>
                <option value="very_active">Very active (1.9×)</option>
              </select>
            </Field>
            <Field label="Goal">
              <select
                className="roji-select"
                value={focus}
                onChange={(e) => setFocus(e.target.value as Focus)}
              >
                <option value="both">Recomp (slow, both directions)</option>
                <option value="lean">Build lean mass (small surplus)</option>
                <option value="fat">Lose fat (moderate deficit)</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="space-y-5">
          <div className="roji-card">
            <div className="roji-mono-label mb-3">Today's targets</div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="BMR" value={out.bmrKcal} suffix=" kcal" />
              <Stat label="TDEE" value={out.tdeeKcal} suffix=" kcal" />
              <Stat label="Target" value={out.targetKcal} suffix=" kcal" big />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Protein" value={out.proteinG} suffix=" g" />
              <Stat label="Fat" value={out.fatG} suffix=" g" />
              <Stat label="Carbs" value={out.carbsG} suffix=" g" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-roji-border pt-4">
              <Stat label="Lean mass" value={out.lbmLb} suffix=" lb" />
              <Stat label="Fat mass" value={out.fmLb} suffix=" lb" />
            </div>
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-3">Projection</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] font-mono uppercase tracking-wider text-roji-muted">
                  <th className="pb-2">In…</th>
                  <th className="pb-2 text-right">Weight</th>
                  <th className="pb-2 text-right">Lean</th>
                  <th className="pb-2 text-right">Fat</th>
                  <th className="pb-2 text-right">BF%</th>
                </tr>
              </thead>
              <tbody>
                {out.projection.map((p) => (
                  <tr key={p.weeks} className="border-t border-roji-border">
                    <td className="py-2 font-mono">{p.weeks} wk</td>
                    <td className="py-2 text-right font-mono">{p.weightLb}</td>
                    <td className="py-2 text-right font-mono text-roji-success">
                      {p.lbmLb}
                    </td>
                    <td className="py-2 text-right font-mono text-roji-warning">
                      {p.fmLb}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {p.bfPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[13px] text-roji-dim leading-relaxed">
              Projections assume consistent calorie + macro adherence and
              the training frequency you entered. Real-world variance is
              substantial — biology, sleep, and stress all matter.
            </p>
          </div>

          {!!out.warnings.length && (
            <div className="rounded-roji border border-roji-warning/40 bg-roji-warning/5 p-4 text-sm">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-roji-warning">
                Notes
              </div>
              <ul className="list-disc space-y-1 pl-5 text-roji-text/85">
                {out.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {hasInteracted && (
            <PostResultCTA
              toolSlug="recomp"
              title="Optimizing recomp? Roji's research stacks are calibrated for body-composition research."
              buttonLabel="Explore research stacks →"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="block mb-1 text-roji-muted">{label}</span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  suffix,
  big,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-[12px] font-mono uppercase tracking-wider text-roji-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-mono ${
          big ? "text-2xl text-roji-accent" : "text-lg text-roji-text"
        }`}
      >
        {value}
        <span className="text-xs text-roji-dim">{suffix}</span>
      </div>
    </div>
  );
}

// Touch the import so tree-shake doesn't drop it (used in inline labels).
void ACTIVITY_MULTIPLIER;
