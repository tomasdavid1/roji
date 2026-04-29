/**
 * Body recomposition math.
 *
 * Standard formulas:
 *   - Mifflin-St Jeor for BMR
 *   - Activity multiplier for TDEE
 *   - Macro split: protein 1.0 g/lb LBM, fat ~0.4 g/lb BW, rest from carbs
 *   - Recomp model: small surplus on training days, deficit on rest days,
 *     converging on net 0–250 kcal/day surplus or deficit depending on
 *     focus.
 *
 * NOTE: This is education math. We don't predict individual outcomes.
 */

export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Focus = "lean" | "fat" | "both";

export const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface RecompInput {
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
  bodyFatPct: number;
  activity: Activity;
  focus: Focus;
  proteinPerLbLbm: number; // default 1.0
  trainingFreq: number; // 0–7 sessions/week
}

export interface RecompOutput {
  weightKg: number;
  heightCm: number;
  lbmLb: number;
  fmLb: number;
  bmrKcal: number;
  tdeeKcal: number;
  /** target daily kcal */
  targetKcal: number;
  /** Macro grams. */
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** projection. */
  projection: { weeks: 8 | 12 | 16; weightLb: number; lbmLb: number; fmLb: number; bfPct: number }[];
  warnings: string[];
}

export function compute(input: RecompInput): RecompOutput {
  const warnings: string[] = [];
  const weightKg = input.weightLb / 2.2046226218;
  const heightCm = input.heightIn * 2.54;
  const fmLb = input.weightLb * (input.bodyFatPct / 100);
  const lbmLb = input.weightLb - fmLb;
  const lbmKg = lbmLb / 2.2046226218;

  // Mifflin-St Jeor (uses total weight, not LBM — both are accepted).
  const bmrKcal =
    input.sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * input.age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * input.age - 161;

  const tdeeKcal = bmrKcal * ACTIVITY_MULTIPLIER[input.activity];

  // Calorie target by focus:
  //   lean (build muscle): +250 kcal
  //   fat  (lose fat):     -500 kcal
  //   both (recomp):       -100 kcal (slow, with high protein)
  const adjustment =
    input.focus === "lean" ? 250 : input.focus === "fat" ? -500 : -100;
  const targetKcal = Math.max(1200, Math.round(tdeeKcal + adjustment));

  // Macros
  const proteinG = Math.round(input.proteinPerLbLbm * lbmLb);
  const fatG = Math.round(input.weightLb * 0.4);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, Math.round((targetKcal - proteinKcal - fatKcal) / 4));

  if (proteinKcal + fatKcal > targetKcal) {
    warnings.push(
      "Protein + fat alone exceed your calorie target. Consider lowering fat or raising calories.",
    );
  }
  if (input.bodyFatPct > 35) {
    warnings.push(
      "Body fat ≥35% — focus on aggressive fat-loss protocols and protein, recomp is harder at this composition.",
    );
  }
  if (input.trainingFreq < 3 && input.focus !== "fat") {
    warnings.push(
      "<3 training sessions per week limits LBM gain. Consider raising training frequency for muscle-building goals.",
    );
  }

  // Project body comp over 8/12/16 weeks.
  // Heuristic — based on commonly cited rates:
  //   - LBM gain: ~0.5 lb/week if surplus, ~0.25 if recomp, ~0.1 if cut
  //   - Fat loss: ~1 lb/week per 500 kcal/day deficit (approx)
  const lbmRate =
    input.focus === "lean"
      ? 0.5
      : input.focus === "both"
        ? 0.25
        : 0.05;
  const trainingFactor = Math.min(1, input.trainingFreq / 4);
  const lbmDelta = lbmRate * trainingFactor;
  const fatDelta = (adjustment / 500) * 1.0; // roughly lb/week
  const projection = ([8, 12, 16] as const).map((wk) => {
    const newLbm = +(lbmLb + lbmDelta * wk).toFixed(1);
    const newFm = Math.max(0, +(fmLb + fatDelta * wk).toFixed(1));
    const newWeight = +(newLbm + newFm).toFixed(1);
    const newBf = +((newFm / newWeight) * 100).toFixed(1);
    return { weeks: wk, weightLb: newWeight, lbmLb: newLbm, fmLb: newFm, bfPct: newBf };
  });

  return {
    weightKg: +weightKg.toFixed(1),
    heightCm: +heightCm.toFixed(1),
    lbmLb: +lbmLb.toFixed(1),
    fmLb: +fmLb.toFixed(1),
    bmrKcal: Math.round(bmrKcal),
    tdeeKcal: Math.round(tdeeKcal),
    targetKcal,
    proteinG,
    fatG,
    carbsG,
    projection,
    warnings,
  };
}
