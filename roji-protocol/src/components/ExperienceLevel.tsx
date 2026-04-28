"use client";

import { useWizard } from "@/lib/store";
import { SelectableCard } from "./ui/SelectableCard";

const PRIOR_COMPOUNDS = [
  { id: "bpc-157", label: "BPC-157" },
  { id: "tb-500", label: "TB-500" },
  { id: "cjc-1295-dac", label: "CJC-1295 (DAC)" },
  { id: "ipamorelin", label: "Ipamorelin" },
  { id: "mk-677", label: "MK-677" },
  { id: "other", label: "Other" },
];

export function ExperienceLevel() {
  const {
    peptideExperience,
    priorCompounds,
    adverseObservations,
    set,
    togglePriorCompound,
  } = useWizard();

  const showFollowUp =
    peptideExperience === "some" || peptideExperience === "experienced";

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">
        Prior research compound experience
      </h2>
      <p className="text-roji-muted mb-8 text-sm">
        Cycle length is clamped based on prior research history to keep first
        protocols conservative.
      </p>

      <div className="grid gap-3 mb-8">
        <SelectableCard
          selected={peptideExperience === "none"}
          onClick={() => set("peptideExperience", "none")}
          title="First time with research peptides"
          description="Cycle capped at 6 weeks. Conservative dosing applied."
        />
        <SelectableCard
          selected={peptideExperience === "some"}
          onClick={() => set("peptideExperience", "some")}
          title="Used 1–2 compounds before"
          description="Cycle capped at 8 weeks."
        />
        <SelectableCard
          selected={peptideExperience === "experienced"}
          onClick={() => set("peptideExperience", "experienced")}
          title="Experienced researcher (3+ compounds)"
          description="Full 12-week cycle available for comprehensive protocols."
        />
      </div>

      {showFollowUp && (
        <div className="space-y-6 border-t border-roji-border pt-6">
          <div>
            <label className="roji-label">Compounds previously used</label>
            <div className="flex flex-wrap gap-2">
              {PRIOR_COMPOUNDS.map((c) => {
                const active = priorCompounds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => togglePriorCompound(c.id)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-mono border transition-colors",
                      active
                        ? "bg-roji-accent text-white border-roji-accent"
                        : "bg-roji-card text-roji-muted border-roji-border hover:border-roji-border-hover",
                    ].join(" ")}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="roji-label">
              Any adverse observations? (optional)
            </label>
            <textarea
              rows={3}
              value={adverseObservations}
              onChange={(e) => set("adverseObservations", e.target.value)}
              className="roji-input resize-none"
              placeholder="e.g. mild lethargy on MK-677 above 20mg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
