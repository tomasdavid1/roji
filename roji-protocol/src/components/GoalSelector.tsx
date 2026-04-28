"use client";

import { useWizard } from "@/lib/store";
import { SelectableCard } from "./ui/SelectableCard";

const GOALS = [
  {
    id: "healing" as const,
    title: "Healing & Recovery",
    description:
      "Tissue, tendon, and ligament research applications. Maps to the Wolverine stack.",
    meta: "Wolverine",
  },
  {
    id: "recomp" as const,
    title: "Body Recomposition",
    description:
      "GH-axis research stack for lean-mass and metabolic optimization studies.",
    meta: "Recomp",
  },
  {
    id: "comprehensive" as const,
    title: "Comprehensive Protocol",
    description:
      "Full 12-week protocol combining healing and recomposition compounds.",
    meta: "Full Protocol",
  },
];

export function GoalSelector() {
  const goal = useWizard((s) => s.goal);
  const setGoal = useWizard((s) => s.set);
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">
        What is your primary research objective?
      </h2>
      <p className="text-roji-muted mb-8 text-sm">
        Choose the area of focus. The recommendation engine will calibrate
        compound selection and dosing accordingly.
      </p>
      <div className="grid gap-3">
        {GOALS.map((g) => (
          <SelectableCard
            key={g.id}
            selected={goal === g.id}
            onClick={() => setGoal("goal", g.id)}
            title={g.title}
            description={g.description}
            meta={g.meta}
          />
        ))}
      </div>
    </div>
  );
}
