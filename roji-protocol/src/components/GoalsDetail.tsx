"use client";

import { useWizard } from "@/lib/store";
import { SelectableCard } from "./ui/SelectableCard";

const HEALING_AREAS = [
  { id: "tendon", label: "Tendon / Ligament" },
  { id: "muscle", label: "Muscle" },
  { id: "joint", label: "Joint" },
  { id: "general", label: "General recovery" },
] as const;

const SEVERITIES = [
  { id: "minor", label: "Minor" },
  { id: "moderate", label: "Moderate" },
  { id: "significant", label: "Significant" },
] as const;

const TIMELINES = [4, 8, 12] as const;

const RECOMP_FOCUS = [
  { id: "lean", label: "Lean mass" },
  { id: "fat", label: "Fat loss" },
  { id: "both", label: "Both" },
] as const;

const TRAINING_FREQ = [3, 4, 5, 6] as const;

export function GoalsDetail() {
  const {
    goal,
    healingArea,
    healingSeverity,
    healingTimelineWeeks,
    recompFocus,
    bodyFatPct,
    trainingFreq,
    set,
  } = useWizard();

  const showHealing = goal === "healing" || goal === "comprehensive";
  const showRecomp = goal === "recomp" || goal === "comprehensive";

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          Specific research parameters
        </h2>
        <p className="text-roji-muted text-sm">
          Final calibration for the protocol output.
        </p>
      </div>

      {showHealing && (
        <div className="space-y-6">
          <h3 className="text-sm font-mono uppercase tracking-widest text-roji-muted">
            Healing parameters
          </h3>

          <div>
            <label className="roji-label">Target area</label>
            <div className="grid sm:grid-cols-4 gap-3">
              {HEALING_AREAS.map((a) => (
                <SelectableCard
                  key={a.id}
                  selected={healingArea === a.id}
                  onClick={() => set("healingArea", a.id)}
                  title={a.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="roji-label">Severity</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {SEVERITIES.map((s) => (
                <SelectableCard
                  key={s.id}
                  selected={healingSeverity === s.id}
                  onClick={() => set("healingSeverity", s.id)}
                  title={s.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="roji-label">Target timeline</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {TIMELINES.map((t) => (
                <SelectableCard
                  key={t}
                  selected={healingTimelineWeeks === t}
                  onClick={() => set("healingTimelineWeeks", t)}
                  title={`${t} weeks`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showRecomp && (
        <div className="space-y-6">
          <h3 className="text-sm font-mono uppercase tracking-widest text-roji-muted">
            Recomposition parameters
          </h3>

          <div>
            <label className="roji-label">Primary goal</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {RECOMP_FOCUS.map((r) => (
                <SelectableCard
                  key={r.id}
                  selected={recompFocus === r.id}
                  onClick={() => set("recompFocus", r.id)}
                  title={r.label}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="roji-label !mb-0">
                Estimated body fat
              </label>
              <span className="font-mono text-sm text-roji-text">
                {bodyFatPct}%
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={35}
              value={bodyFatPct}
              onChange={(e) => set("bodyFatPct", Number(e.target.value))}
              className="w-full accent-roji-accent"
            />
          </div>

          <div>
            <label className="roji-label">Training frequency</label>
            <div className="grid grid-cols-4 gap-3">
              {TRAINING_FREQ.map((f) => (
                <SelectableCard
                  key={f}
                  selected={trainingFreq === f}
                  onClick={() => set("trainingFreq", f)}
                  title={`${f} d/wk`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
