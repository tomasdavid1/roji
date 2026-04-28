"use client";

interface Props {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: Props) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const active = stepNum === currentStep;
        const done = stepNum < currentStep;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-start gap-1.5 flex-1 min-w-0">
              <div
                className={[
                  "h-1 w-full rounded-full transition-colors",
                  done || active
                    ? "bg-roji-accent"
                    : "bg-white/[0.06]",
                ].join(" ")}
              />
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "text-[10px] font-mono uppercase tracking-widest",
                    active
                      ? "text-roji-accent"
                      : done
                        ? "text-roji-muted"
                        : "text-roji-dim",
                  ].join(" ")}
                >
                  {String(stepNum).padStart(2, "0")}
                </span>
                <span
                  className={[
                    "text-xs hidden sm:inline",
                    active ? "text-roji-text" : "text-roji-muted",
                  ].join(" ")}
                >
                  {labels[i]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
