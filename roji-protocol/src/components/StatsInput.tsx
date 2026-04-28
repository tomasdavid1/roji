"use client";

import { useWizard } from "@/lib/store";
import { SelectableCard } from "./ui/SelectableCard";

export function StatsInput() {
  const {
    weightUnit,
    weightValue,
    age,
    sex,
    trainingExperience,
    set,
  } = useWizard();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Subject parameters</h2>
      <p className="text-roji-muted mb-8 text-sm">
        Used to scale dosing by body weight and biological sex per published
        literature.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="roji-label !mb-0">Body weight</label>
            <div className="inline-flex rounded-roji border border-roji-border overflow-hidden text-[11px] font-mono">
              <button
                type="button"
                onClick={() => set("weightUnit", "lbs")}
                className={[
                  "px-3 py-1 transition-colors",
                  weightUnit === "lbs"
                    ? "bg-roji-accent text-white"
                    : "bg-transparent text-roji-muted hover:text-roji-text",
                ].join(" ")}
              >
                LBS
              </button>
              <button
                type="button"
                onClick={() => set("weightUnit", "kg")}
                className={[
                  "px-3 py-1 transition-colors",
                  weightUnit === "kg"
                    ? "bg-roji-accent text-white"
                    : "bg-transparent text-roji-muted hover:text-roji-text",
                ].join(" ")}
              >
                KG
              </button>
            </div>
          </div>
          <input
            type="number"
            min={70}
            max={500}
            value={weightValue}
            onChange={(e) =>
              set("weightValue", Number(e.target.value) || 0)
            }
            className="roji-input"
          />
        </div>

        <div>
          <label className="roji-label">Age</label>
          <input
            type="number"
            min={21}
            max={100}
            value={age}
            onChange={(e) => set("age", Number(e.target.value) || 0)}
            className="roji-input"
          />
          {age < 21 && (
            <p className="text-xs text-roji-danger mt-2">
              Subjects must be at least 21 years of age.
            </p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <label className="roji-label">Biological sex</label>
        <div className="grid grid-cols-2 gap-3">
          <SelectableCard
            selected={sex === "male"}
            onClick={() => set("sex", "male")}
            title="Male"
          />
          <SelectableCard
            selected={sex === "female"}
            onClick={() => set("sex", "female")}
            title="Female"
            description="Dosing scaled by ~0.85x"
          />
        </div>
      </div>

      <div>
        <label className="roji-label">Training experience</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {(
            [
              { id: "beginner", label: "Beginner", meta: "0–2 yr" },
              { id: "intermediate", label: "Intermediate", meta: "2–5 yr" },
              { id: "advanced", label: "Advanced", meta: "5+ yr" },
            ] as const
          ).map((opt) => (
            <SelectableCard
              key={opt.id}
              selected={trainingExperience === opt.id}
              onClick={() => set("trainingExperience", opt.id)}
              title={opt.label}
              meta={opt.meta}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
