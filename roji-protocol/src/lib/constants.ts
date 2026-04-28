/**
 * Roji Protocol Engine — compound and stack data tables.
 *
 * IMPORTANT: All language in this file is framed as research-reference only.
 * Dosing values are drawn from published literature and presented for
 * laboratory/research purposes. Nothing here is medical advice.
 */

export type StackSlug = "wolverine" | "recomp" | "full";

export type GoalKey = "healing" | "recomp" | "comprehensive";

export type Sex = "male" | "female";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PeptideExperience = "none" | "some" | "experienced";

export interface Reference {
  title: string;
  source: string;
  url: string;
  year?: number;
}

export interface CompoundDefinition {
  id: string;
  name: string;
  short: string;
  /** Suggested dose per administration as expressed in research literature. */
  baseDoseMcg?: number;
  baseDoseMg?: number;
  /** Per-kg scaling factor (mcg/kg) when relevant; otherwise omitted. */
  perKgMcg?: number;
  /** Default frequency phrasing. */
  frequency: string;
  timing: string;
  route: string;
  /** Default cycle length in weeks if used standalone. */
  cycleWeeks: number;
  notes: string;
  references: Reference[];
}

export interface StackDefinition {
  slug: StackSlug;
  name: string;
  tagline: string;
  priceUsd: number;
  sku: string;
  category: string;
  compoundIds: string[];
  supplyDurationWeeks: number;
  description: string;
}

/**
 * Compound dosing tables. Values are research-literature midpoints; the
 * recommendation engine adjusts them by weight, sex, and experience.
 */
export const COMPOUNDS: Record<string, CompoundDefinition> = {
  "bpc-157": {
    id: "bpc-157",
    name: "BPC-157",
    short: "Body Protection Compound 157",
    baseDoseMcg: 250,
    perKgMcg: 2.5,
    frequency: "Twice daily",
    timing: "AM and PM, away from training",
    route: "Subcutaneous, near area of interest",
    cycleWeeks: 4,
    notes:
      "Literature commonly references 200–500mcg per administration. Cycle and re-evaluate.",
    references: [
      {
        title:
          "Stable gastric pentadecapeptide BPC 157 in clinical trials as a therapy for inflammatory bowel disease",
        source: "Sikiric P. et al., Curr Pharm Des",
        url: "https://pubmed.ncbi.nlm.nih.gov/22950504/",
        year: 2012,
      },
      {
        title:
          "Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts",
        source: "Chang CH. et al., Molecules",
        url: "https://pubmed.ncbi.nlm.nih.gov/24686573/",
        year: 2014,
      },
    ],
  },

  "tb-500": {
    id: "tb-500",
    name: "TB-500",
    short: "Thymosin Beta-4 fragment",
    baseDoseMg: 2,
    perKgMcg: 25,
    frequency: "Loading: twice weekly · Maintenance: once weekly",
    timing: "Spaced at least 72h apart",
    route: "Subcutaneous",
    cycleWeeks: 6,
    notes:
      "Literature loading: 2–2.5mg twice weekly for 4 weeks, then maintenance 2mg weekly.",
    references: [
      {
        title:
          "Thymosin beta-4: a multi-functional regenerative peptide. Basic properties and clinical applications",
        source: "Goldstein AL. et al., Expert Opin Biol Ther",
        url: "https://pubmed.ncbi.nlm.nih.gov/22394215/",
        year: 2012,
      },
    ],
  },

  "cjc-1295-dac": {
    id: "cjc-1295-dac",
    name: "CJC-1295 (DAC)",
    short: "GHRH analog with Drug Affinity Complex",
    baseDoseMg: 2,
    frequency: "Twice weekly",
    timing: "Same days each week",
    route: "Subcutaneous",
    cycleWeeks: 12,
    notes:
      "DAC variant has ~8-day half-life; pulses GH release across multiple days per dose.",
    references: [
      {
        title:
          "A phase I, open-label, ascending-dose study of CJC-1295, a long-acting GHRH analog",
        source: "Teichman SL. et al., J Clin Endocrinol Metab",
        url: "https://pubmed.ncbi.nlm.nih.gov/16352683/",
        year: 2006,
      },
    ],
  },

  ipamorelin: {
    id: "ipamorelin",
    name: "Ipamorelin",
    short: "Selective GH secretagogue",
    baseDoseMcg: 250,
    perKgMcg: 3,
    frequency: "Two to three times daily",
    timing: "AM fasted, post-training, pre-bed",
    route: "Subcutaneous",
    cycleWeeks: 12,
    notes:
      "Selective ghrelin receptor agonist. Pairs with CJC-1295 for synergistic GH pulse.",
    references: [
      {
        title:
          "Ipamorelin, the first selective growth hormone secretagogue",
        source: "Raun K. et al., Eur J Endocrinol",
        url: "https://pubmed.ncbi.nlm.nih.gov/9849822/",
        year: 1998,
      },
    ],
  },

  "mk-677": {
    id: "mk-677",
    name: "MK-677",
    short: "Ibutamoren — oral ghrelin mimetic",
    baseDoseMg: 15,
    frequency: "Once daily",
    timing: "Before bed (or AM if sleep is disturbed)",
    route: "Oral",
    cycleWeeks: 12,
    notes:
      "Literature range 10–25mg/day. Long half-life; expect transient water retention and appetite increase.",
    references: [
      {
        title:
          "Two-year treatment with the oral growth hormone secretagogue MK-677 in older adults",
        source: "Nass R. et al., Ann Intern Med",
        url: "https://pubmed.ncbi.nlm.nih.gov/19075081/",
        year: 2008,
      },
    ],
  },
};

/**
 * Stack definitions — must match the WooCommerce SKUs and product slugs.
 * The store URL is constructed at runtime in lib/recommend.ts.
 */
export const STACKS: Record<StackSlug, StackDefinition> = {
  wolverine: {
    slug: "wolverine",
    name: "Wolverine Stack",
    tagline: "Healing & recovery research stack",
    priceUsd: 149,
    sku: "ROJI-WOLF-001",
    category: "Healing & Recovery",
    compoundIds: ["bpc-157", "tb-500"],
    supplyDurationWeeks: 4,
    description:
      "BPC-157 10mg + TB-500 10mg research stack. Tendon, ligament, and tissue research applications.",
  },
  recomp: {
    slug: "recomp",
    name: "Recomp Stack",
    tagline: "GH-axis recomposition research stack",
    priceUsd: 199,
    sku: "ROJI-RECOMP-001",
    category: "Body Recomposition",
    compoundIds: ["cjc-1295-dac", "ipamorelin", "mk-677"],
    supplyDurationWeeks: 4,
    description:
      "CJC-1295 (DAC) 5mg + Ipamorelin 5mg + MK-677 30-day oral. Comprehensive GH-axis research stack.",
  },
  full: {
    slug: "full",
    name: "Full Protocol",
    tagline: "Comprehensive 12-week research protocol",
    priceUsd: 399,
    sku: "ROJI-FULL-001",
    category: "Full Protocols",
    compoundIds: ["bpc-157", "tb-500", "cjc-1295-dac", "ipamorelin", "mk-677"],
    supplyDurationWeeks: 12,
    description:
      "Wolverine + Recomp stacks across 12 weeks (ships monthly). Includes printed research protocol guide and dosing calendar.",
  },
};

export const GOAL_TO_STACK: Record<GoalKey, StackSlug> = {
  healing: "wolverine",
  recomp: "recomp",
  comprehensive: "full",
};

/** Sex-based dose multiplier applied to mcg/kg compounds. */
export const SEX_MULTIPLIER: Record<Sex, number> = {
  male: 1.0,
  female: 0.85,
};

/** Maximum cycle weeks based on prior peptide-research experience. */
export const EXPERIENCE_CYCLE_CAP: Record<PeptideExperience, number> = {
  none: 6,
  some: 8,
  experienced: 12,
};

export const LBS_TO_KG = 0.453592;
