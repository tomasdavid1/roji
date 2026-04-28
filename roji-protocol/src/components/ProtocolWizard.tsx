"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWizard } from "@/lib/store";
import { GoalSelector } from "./GoalSelector";
import { StatsInput } from "./StatsInput";
import { ExperienceLevel } from "./ExperienceLevel";
import { GoalsDetail } from "./GoalsDetail";
import { ProtocolOutput } from "./ProtocolOutput";
import { StepIndicator } from "./ui/StepIndicator";

const LABELS = ["Goal", "Stats", "Experience", "Detail", "Protocol"];

export function ProtocolWizard() {
  const { step, next, back, isStepValid } = useWizard();
  const valid = isStepValid(step);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 sm:py-16">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs uppercase tracking-widest text-roji-accent">
            Roji Peptides
          </span>
          <span className="text-roji-dim">·</span>
          <span className="font-mono text-xs uppercase tracking-widest text-roji-muted">
            Protocol Engine
          </span>
        </div>
        <h1 className="text-xl font-semibold">
          Build your research protocol
        </h1>
      </header>

      <StepIndicator currentStep={step} totalSteps={5} labels={LABELS} />

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === 1 && <GoalSelector />}
            {step === 2 && <StatsInput />}
            {step === 3 && <ExperienceLevel />}
            {step === 4 && <GoalsDetail />}
            {step === 5 && <ProtocolOutput />}
          </motion.div>
        </AnimatePresence>
      </div>

      {step < 5 && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-roji-border">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="roji-btn disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!valid}
            className="roji-btn-primary"
          >
            {step === 4 ? "Generate protocol →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}
