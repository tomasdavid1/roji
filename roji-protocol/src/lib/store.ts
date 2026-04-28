"use client";

import { create } from "zustand";
import type {
  HealingArea,
  RecompFocus,
  Severity,
  UserInput,
} from "./recommend";
import type {
  ExperienceLevel,
  GoalKey,
  PeptideExperience,
  Sex,
} from "./constants";

export type WeightUnit = "lbs" | "kg";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  step: WizardStep;
  weightUnit: WeightUnit;

  goal: GoalKey | null;
  weightValue: number;
  age: number;
  sex: Sex | null;
  trainingExperience: ExperienceLevel | null;
  peptideExperience: PeptideExperience | null;
  priorCompounds: string[];
  adverseObservations: string;

  // Healing
  healingArea: HealingArea | null;
  healingSeverity: Severity | null;
  healingTimelineWeeks: 4 | 8 | 12 | null;

  // Recomp
  recompFocus: RecompFocus | null;
  bodyFatPct: number;
  trainingFreq: 3 | 4 | 5 | 6 | null;

  setStep: (step: WizardStep) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
  set: <K extends keyof Omit<WizardState, "set" | "next" | "back" | "reset" | "setStep" | "toUserInput" | "isStepValid">>(
    key: K,
    value: WizardState[K],
  ) => void;
  togglePriorCompound: (id: string) => void;
  toUserInput: () => UserInput | null;
  isStepValid: (step: WizardStep) => boolean;
}

const INITIAL: Omit<
  WizardState,
  "setStep" | "next" | "back" | "reset" | "set" | "togglePriorCompound" | "toUserInput" | "isStepValid"
> = {
  step: 1,
  weightUnit: "lbs",
  goal: null,
  weightValue: 180,
  age: 30,
  sex: null,
  trainingExperience: null,
  peptideExperience: null,
  priorCompounds: [],
  adverseObservations: "",
  healingArea: null,
  healingSeverity: null,
  healingTimelineWeeks: null,
  recompFocus: null,
  bodyFatPct: 18,
  trainingFreq: null,
};

export const useWizard = create<WizardState>((setState, get) => ({
  ...INITIAL,
  setStep: (step) => setState({ step }),
  next: () =>
    setState((s) => ({
      step: Math.min(5, s.step + 1) as WizardStep,
    })),
  back: () =>
    setState((s) => ({
      step: Math.max(1, s.step - 1) as WizardStep,
    })),
  reset: () => setState({ ...INITIAL }),
  set: (key, value) => setState({ [key]: value } as Partial<WizardState>),
  togglePriorCompound: (id) =>
    setState((s) => ({
      priorCompounds: s.priorCompounds.includes(id)
        ? s.priorCompounds.filter((c) => c !== id)
        : [...s.priorCompounds, id],
    })),
  toUserInput: () => {
    const s = get();
    if (
      !s.goal ||
      !s.sex ||
      !s.trainingExperience ||
      !s.peptideExperience
    ) {
      return null;
    }
    const weight_lbs =
      s.weightUnit === "lbs" ? s.weightValue : s.weightValue / 0.453592;
    return {
      goal: s.goal,
      weight_lbs: Math.round(weight_lbs),
      age: s.age,
      sex: s.sex,
      training_experience: s.trainingExperience,
      peptide_experience: s.peptideExperience,
      healing_area: s.healingArea ?? undefined,
      healing_severity: s.healingSeverity ?? undefined,
      healing_timeline_weeks: s.healingTimelineWeeks ?? undefined,
      recomp_focus: s.recompFocus ?? undefined,
      body_fat_pct: s.bodyFatPct,
      training_freq: s.trainingFreq ?? undefined,
    };
  },
  isStepValid: (step) => {
    const s = get();
    switch (step) {
      case 1:
        return s.goal !== null;
      case 2:
        return (
          s.weightValue > 0 &&
          s.age >= 21 &&
          s.sex !== null &&
          s.trainingExperience !== null
        );
      case 3:
        return s.peptideExperience !== null;
      case 4:
        if (s.goal === "healing") {
          return (
            s.healingArea !== null &&
            s.healingSeverity !== null &&
            s.healingTimelineWeeks !== null
          );
        }
        if (s.goal === "recomp") {
          return s.recompFocus !== null && s.trainingFreq !== null;
        }
        if (s.goal === "comprehensive") {
          return (
            s.healingArea !== null &&
            s.recompFocus !== null &&
            s.trainingFreq !== null
          );
        }
        return false;
      case 5:
        return true;
      default:
        return false;
    }
  },
}));
