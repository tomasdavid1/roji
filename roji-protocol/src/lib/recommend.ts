/**
 * Roji Protocol Engine — recommendation logic.
 *
 * Pure function: takes user input, returns a personalized research
 * protocol with a deep-link to the WooCommerce store. Adjusts dosing
 * by weight (mcg/kg), sex (multiplier), and clamps cycle length by
 * prior peptide-research experience.
 */

import {
  COMPOUNDS,
  EXPERIENCE_CYCLE_CAP,
  GOAL_TO_STACK,
  LBS_TO_KG,
  Reference,
  SEX_MULTIPLIER,
  STACKS,
  type ExperienceLevel,
  type GoalKey,
  type PeptideExperience,
  type Sex,
  type StackSlug,
} from "./constants";

export type HealingArea = "tendon" | "muscle" | "joint" | "general";
export type Severity = "minor" | "moderate" | "significant";
export type RecompFocus = "lean" | "fat" | "both";

export interface UserInput {
  goal: GoalKey;
  weight_lbs: number;
  age: number;
  sex: Sex;
  training_experience: ExperienceLevel;
  peptide_experience: PeptideExperience;

  // Healing-specific
  healing_area?: HealingArea;
  healing_severity?: Severity;
  healing_timeline_weeks?: 4 | 8 | 12;

  // Recomp-specific
  recomp_focus?: RecompFocus;
  body_fat_pct?: number;
  training_freq?: 3 | 4 | 5 | 6;
}

export interface CompoundProtocol {
  compoundId: string;
  name: string;
  amountPerDose: string;
  frequency: string;
  timing: string;
  duration_weeks: number;
  route: string;
  notes: string;
}

export interface ProtocolRecommendation {
  stack: StackSlug;
  stack_name: string;
  /** Total billed once at checkout. */
  stack_price: number;
  /** Headline price we lead with on the results page. We sell the protocol
   *  by the week (much smaller, more digestible number) and reveal the
   *  full one-time charge in the cart, with a clarifying caption. */
  weekly_price: number;
  /** Number of supply periods the protocol requires (qty added to cart). */
  supply_periods: number;
  stack_sku: string;
  compounds: CompoundProtocol[];
  cycle_length_weeks: number;
  rationale: string;
  references: Reference[];
  shopUrl: string;
  /** Pre-built URL with `&autoship=1` so the storefront swaps to the
   *  autoship sibling automatically. Same destination as shopUrl, just
   *  with the discount + recurring billing applied at checkout. */
  shopUrlAutoship: string;
  autoshipDiscountPct: number;
}

const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, "") ||
  "https://rojipeptides.com";

// Mirrors ROJI_SUBS_DISCOUNT_PCT in the WP child theme. Hardcoded here to
// keep the Protocol Engine dependency-free; if you change one, change both.
const AUTOSHIP_DISCOUNT_PCT = 15;

/** Round to a sensible research-literature increment. */
function roundMcg(value: number): number {
  if (value < 100) return Math.round(value / 25) * 25;
  if (value < 500) return Math.round(value / 50) * 50;
  return Math.round(value / 100) * 100;
}

function roundMg(value: number): number {
  return Math.round(value * 4) / 4; // 0.25mg increments
}

function formatMcg(mcg: number): string {
  if (mcg >= 1000) return `${(mcg / 1000).toFixed(2).replace(/\.?0+$/, "")}mg`;
  return `${Math.round(mcg)}mcg`;
}

function formatMg(mg: number): string {
  return `${mg.toFixed(2).replace(/\.?0+$/, "")}mg`;
}

/** Compute a per-administration mcg amount from base + per-kg + sex. */
function computeMcgDose(
  base: number,
  perKg: number | undefined,
  weightKg: number,
  sex: Sex,
): number {
  const perKgComponent = perKg ? perKg * weightKg : 0;
  // Blend: take the larger of base or per-kg, then apply sex multiplier.
  const raw = Math.max(base, perKgComponent);
  return roundMcg(raw * SEX_MULTIPLIER[sex]);
}

/** Determine cycle length from goal, healing timeline, and experience cap. */
function determineCycleWeeks(input: UserInput): number {
  let target: number;
  if (input.goal === "comprehensive") {
    target = 12;
  } else if (input.goal === "healing") {
    target = input.healing_timeline_weeks ?? 8;
  } else {
    // recomp
    target = 8;
  }

  const cap = EXPERIENCE_CYCLE_CAP[input.peptide_experience];
  return Math.min(target, cap);
}

/** Build the per-compound protocol based on goal and input. */
function buildCompoundProtocols(
  input: UserInput,
  weightKg: number,
  cycleWeeks: number,
): CompoundProtocol[] {
  const stack = STACKS[GOAL_TO_STACK[input.goal]];
  const out: CompoundProtocol[] = [];

  for (const compoundId of stack.compoundIds) {
    const c = COMPOUNDS[compoundId];

    if (compoundId === "bpc-157") {
      const dose = computeMcgDose(
        c.baseDoseMcg ?? 250,
        c.perKgMcg,
        weightKg,
        input.sex,
      );
      // Severity bumps frequency / dose; tendon/joint focus prefers near-site.
      const severityBump =
        input.healing_severity === "significant"
          ? 1.25
          : input.healing_severity === "moderate"
            ? 1.0
            : 0.85;
      const finalDose = roundMcg(dose * severityBump);
      const route =
        input.healing_area === "tendon" || input.healing_area === "joint"
          ? "Subcutaneous, near area of interest"
          : "Subcutaneous (abdomen rotation)";
      out.push({
        compoundId,
        name: c.name,
        amountPerDose: formatMcg(finalDose),
        frequency: c.frequency,
        timing: c.timing,
        duration_weeks: cycleWeeks,
        route,
        notes: c.notes,
      });
      continue;
    }

    if (compoundId === "tb-500") {
      // Loading dose for first 4 weeks, then maintenance.
      const loadingMg = roundMg(
        Math.max(c.baseDoseMg ?? 2, ((c.perKgMcg ?? 25) * weightKg) / 1000) *
          SEX_MULTIPLIER[input.sex],
      );
      const loadingWeeks = Math.min(4, Math.ceil(cycleWeeks / 2));
      const maintenanceWeeks = cycleWeeks - loadingWeeks;
      out.push({
        compoundId,
        name: c.name,
        amountPerDose: `${formatMg(loadingMg)} loading · ${formatMg(roundMg(loadingMg * 0.75))} maintenance`,
        frequency:
          maintenanceWeeks > 0
            ? `Twice weekly × ${loadingWeeks}wk, then once weekly × ${maintenanceWeeks}wk`
            : `Twice weekly × ${loadingWeeks}wk`,
        timing: c.timing,
        duration_weeks: cycleWeeks,
        route: c.route,
        notes: c.notes,
      });
      continue;
    }

    if (compoundId === "cjc-1295-dac") {
      out.push({
        compoundId,
        name: c.name,
        amountPerDose: formatMg(c.baseDoseMg ?? 2),
        frequency: c.frequency,
        timing: c.timing,
        duration_weeks: cycleWeeks,
        route: c.route,
        notes: c.notes,
      });
      continue;
    }

    if (compoundId === "ipamorelin") {
      const dose = computeMcgDose(
        c.baseDoseMcg ?? 250,
        c.perKgMcg,
        weightKg,
        input.sex,
      );
      // Training frequency drives admin frequency for recomp goals.
      const freq =
        input.training_freq && input.training_freq >= 5
          ? "Three times daily"
          : "Two to three times daily";
      out.push({
        compoundId,
        name: c.name,
        amountPerDose: formatMcg(dose),
        frequency: freq,
        timing: c.timing,
        duration_weeks: cycleWeeks,
        route: c.route,
        notes: c.notes,
      });
      continue;
    }

    if (compoundId === "mk-677") {
      // Beginners: low end (10mg). Some experience: 15mg. Experienced: 20mg.
      const baseMg =
        input.peptide_experience === "experienced"
          ? 20
          : input.peptide_experience === "some"
            ? 15
            : 10;
      // Leaner subjects target a lower dose to limit water retention.
      const leanAdjust = (input.body_fat_pct ?? 18) < 12 ? -5 : 0;
      const finalMg = Math.max(10, baseMg + leanAdjust);
      out.push({
        compoundId,
        name: c.name,
        amountPerDose: formatMg(finalMg),
        frequency: c.frequency,
        timing: c.timing,
        duration_weeks: cycleWeeks,
        route: c.route,
        notes: c.notes,
      });
      continue;
    }
  }

  return out;
}

function buildRationale(input: UserInput, cycleWeeks: number): string {
  const sex = input.sex === "female" ? "female" : "male";
  const exp = {
    none: "first-time",
    some: "intermediate",
    experienced: "experienced",
  }[input.peptide_experience];

  const goalText = {
    healing:
      input.healing_area && input.healing_severity
        ? `${input.healing_severity} ${input.healing_area} recovery`
        : "tissue healing and recovery",
    recomp:
      input.recomp_focus === "lean"
        ? "lean-mass-focused recomposition"
        : input.recomp_focus === "fat"
          ? "fat-loss-focused recomposition"
          : "balanced body recomposition",
    comprehensive: "combined healing + recomposition over a full cycle",
  }[input.goal];

  return [
    `Calibrated for a ${input.weight_lbs}lb ${sex} subject (${exp} researcher) targeting ${goalText}.`,
    `Cycle length set to ${cycleWeeks} weeks based on experience level and goal timeline.`,
    `Dosing values are research-literature midpoints scaled by body weight (mcg/kg) and a sex multiplier of ${SEX_MULTIPLIER[input.sex]}x.`,
  ].join(" ");
}

function buildReferences(stackSlug: StackSlug): Reference[] {
  const stack = STACKS[stackSlug];
  const refs: Reference[] = [];
  const seen = new Set<string>();
  for (const cid of stack.compoundIds) {
    for (const ref of COMPOUNDS[cid].references) {
      if (!seen.has(ref.url)) {
        seen.add(ref.url);
        refs.push(ref);
      }
    }
  }
  return refs;
}

function buildShopUrl(
  stackSlug: StackSlug,
  qty: number,
  weeks: number,
  autoship = false,
): string {
  const params = new URLSearchParams({
    protocol_stack: stackSlug,
    qty: String(qty),
    weeks: String(weeks),
    utm_source: "protocol_engine",
    utm_medium: "referral",
    utm_campaign: "protocol_builder",
  });
  if (autoship) {
    params.set("autoship", "1");
  }
  return `${STORE_URL}/cart/?${params.toString()}`;
}

/**
 * Main entry point. Pure, deterministic.
 */
export function generateProtocol(input: UserInput): ProtocolRecommendation {
  const weightKg = input.weight_lbs * LBS_TO_KG;
  const cycleWeeks = determineCycleWeeks(input);
  const stackSlug = GOAL_TO_STACK[input.goal];
  const stack = STACKS[stackSlug];
  const compounds = buildCompoundProtocols(input, weightKg, cycleWeeks);

  // Number of supply periods (= qty added to cart). Full-protocol's base
  // supply is 4wk months; standard stacks are 4wk supply. Either way:
  // ceil(cycleWeeks / supplyDurationWeeks) gives the count we need to
  // ship to cover the entire cycle.
  const supplyPeriods =
    stack.slug === "full"
      ? Math.max(1, Math.ceil(cycleWeeks / 4))
      : Math.max(1, Math.ceil(cycleWeeks / stack.supplyDurationWeeks));
  const totalPrice = stack.priceUsd * supplyPeriods;
  const weeklyPrice = totalPrice / cycleWeeks;

  return {
    stack: stack.slug,
    stack_name: stack.name,
    stack_price: totalPrice,
    weekly_price: weeklyPrice,
    supply_periods: supplyPeriods,
    stack_sku: stack.sku,
    compounds,
    cycle_length_weeks: cycleWeeks,
    rationale: buildRationale(input, cycleWeeks),
    references: buildReferences(stack.slug),
    shopUrl: buildShopUrl(stack.slug, supplyPeriods, cycleWeeks),
    shopUrlAutoship: buildShopUrl(stack.slug, supplyPeriods, cycleWeeks, true),
    autoshipDiscountPct: AUTOSHIP_DISCOUNT_PCT,
  };
}
