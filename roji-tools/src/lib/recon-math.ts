/**
 * Reconstitution math.
 *
 * U-100 insulin syringe convention: 100 units = 1 mL = 1 cc.
 * Some users have U-40 or U-50 syringes (mostly veterinary); the
 * calculator exposes that as a dropdown so we cover all cases.
 *
 * NOTE: This is chemistry math. Nothing here implies human use.
 */

export type SyringeKind = "u100" | "u50" | "u40";

export const SYRINGE_TOTAL_UNITS: Record<SyringeKind, number> = {
  u100: 100, // 1 mL
  u50: 50, // 0.5 mL
  u40: 40, // 0.4 mL — veterinary
};

/** Volume in mL that one "unit" tick on the syringe represents. */
export function mlPerUnit(syringe: SyringeKind): number {
  // U-100: 1 mL / 100 units = 0.01 mL/unit
  // U-50:  0.5 mL / 50 units = 0.01 mL/unit (same!)
  // U-40:  0.4 mL / 40 units = 0.01 mL/unit (same!)
  // The trick: insulin syringes are calibrated such that "units" align
  // with the insulin product they were designed for. For RESEARCH
  // peptides, the only thing that matters is the total mL of the
  // syringe. We expose total mL but keep U-100 default.
  if (syringe === "u100") return 0.01;
  if (syringe === "u50") return 0.01;
  return 0.01;
}

export interface ReconInput {
  vialMg: number; // peptide content in the vial (mg)
  waterMl: number; // BAC water volume added (mL)
  doseMcg: number; // target dose in mcg
  syringe: SyringeKind;
}

export interface ReconOutput {
  concentrationMcgPerMl: number;
  concentrationMcgPerUnit: number;
  unitsPerDose: number;
  mlPerDose: number;
  /**
   * Total doses obtainable from the vial assuming the requested target dose,
   * rounded down (no partial dose at the end).
   */
  totalDoses: number;
  /** Helpful preset suggestions: dose round-numbers near the requested. */
  alternativeDoses: { dose: number; units: number }[];
  warnings: string[];
}

export function compute(input: ReconInput): ReconOutput {
  const { vialMg, waterMl, doseMcg, syringe } = input;
  const warnings: string[] = [];

  if (vialMg <= 0) warnings.push("Vial size must be greater than zero.");
  if (waterMl <= 0) warnings.push("BAC water volume must be greater than zero.");
  if (doseMcg <= 0) warnings.push("Target dose must be greater than zero.");

  const totalMcg = vialMg * 1000;
  const concentrationMcgPerMl = waterMl > 0 ? totalMcg / waterMl : 0;
  const mlPer = mlPerUnit(syringe);
  const concentrationMcgPerUnit = concentrationMcgPerMl * mlPer;
  const unitsPerDose =
    concentrationMcgPerUnit > 0 ? doseMcg / concentrationMcgPerUnit : 0;
  const mlPerDose = unitsPerDose * mlPer;
  const totalDoses =
    doseMcg > 0 ? Math.floor(totalMcg / doseMcg) : 0;

  if (waterMl > 5) {
    warnings.push(
      "More than 5 mL of BAC water is unusual for a standard 5 mg vial; verify your vial size.",
    );
  }
  const total = SYRINGE_TOTAL_UNITS[syringe];
  if (unitsPerDose > total) {
    warnings.push(
      `One dose requires ${unitsPerDose.toFixed(0)} units, but a ${syringe.toUpperCase()} syringe only holds ${total}. Either lower the BAC water volume or use a larger syringe.`,
    );
  } else if (unitsPerDose > 0 && unitsPerDose < 2) {
    warnings.push(
      "Less than 2 units per dose is hard to measure precisely. Add more BAC water or use a larger syringe.",
    );
  }

  // Suggest a few "nicer" round-number dose alternatives so the user can
  // see how units would shift if they chose 200/250/500/750 mcg etc.
  const candidates = [100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000];
  const alternativeDoses = candidates
    .filter((d) => d !== doseMcg)
    .slice(0, 6)
    .map((d) => ({
      dose: d,
      units: concentrationMcgPerUnit > 0 ? d / concentrationMcgPerUnit : 0,
    }));

  return {
    concentrationMcgPerMl,
    concentrationMcgPerUnit,
    unitsPerDose,
    mlPerDose,
    totalDoses,
    alternativeDoses,
    warnings,
  };
}
