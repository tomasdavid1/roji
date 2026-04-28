/**
 * Compound half-life + pharmacokinetics database.
 *
 * Each entry is sourced from peer-reviewed literature where possible.
 * The half-life ranges are intentionally interval-based because the
 * literature itself reports ranges (route of administration, species,
 * assay method, etc. all matter).
 *
 * IMPORTANT: This is a research database. We display data; we don't
 * recommend dosing. Every entry includes a citation back to its source.
 *
 * Half-life is in HOURS unless noted.
 */

export type Route = "subq" | "im" | "iv" | "intranasal" | "oral";

export interface CompoundRef {
  label: string;
  url: string;
}

export interface Compound {
  slug: string;
  name: string;
  aliases: string[];
  category:
    | "GH-axis"
    | "Healing"
    | "Cognitive"
    | "Metabolic"
    | "Immune"
    | "Structural"
    | "Sexual";
  /** Free-text one-liner. Avoid clinical claims; describe mechanism only. */
  oneLiner: string;
  molecularWeightDa?: number;
  /** Half-life range in HOURS by primary administration route. */
  halfLifeHoursByRoute: Partial<Record<Route, [number, number]>>;
  /** "Bioavailability" notes per route, % range or descriptor. */
  bioavailabilityNotes?: Partial<Record<Route, string>>;
  storageNotes?: string;
  solubilityNotes?: string;
  references: CompoundRef[];
}

export const COMPOUNDS: Compound[] = [
  {
    slug: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound 157", "PL-10"],
    category: "Healing",
    oneLiner:
      "Synthetic 15-amino-acid pentadecapeptide derived from a sequence in human gastric juice. Studied for tissue-healing effects in animal models.",
    molecularWeightDa: 1419.53,
    halfLifeHoursByRoute: {
      subq: [4, 6],
      oral: [0.5, 1],
    },
    bioavailabilityNotes: {
      oral: "Reported orally stable in animal studies (intact GI tract).",
      subq: "Standard delivery route in published animal experiments.",
    },
    storageNotes:
      "Lyophilized: 2–8 °C long-term, –20 °C for >30 days. After reconstitution: refrigerate, use within 14–30 days.",
    solubilityNotes: "Water-soluble. Reconstitute with bacteriostatic water.",
    references: [
      {
        label: "Sikiric et al. — pentadecapeptide BPC 157 review (2018)",
        url: "https://pubmed.ncbi.nlm.nih.gov/29705962/",
      },
      {
        label: "Vukojevic et al. — BPC 157 and tendon healing (2018)",
        url: "https://pubmed.ncbi.nlm.nih.gov/29852135/",
      },
    ],
  },
  {
    slug: "tb-500",
    name: "TB-500",
    aliases: ["Thymosin Beta-4 fragment", "Tβ4"],
    category: "Healing",
    oneLiner:
      "Synthetic peptide fragment of thymosin beta-4 studied for actin-binding and tissue repair properties in animal models.",
    molecularWeightDa: 4963.4,
    halfLifeHoursByRoute: {
      subq: [48, 72],
      iv: [12, 24],
    },
    bioavailabilityNotes: {
      subq: "Slow release, longer effective window.",
      iv: "Faster onset, shorter persistence.",
    },
    storageNotes:
      "Lyophilized: –20 °C long-term. Reconstituted: 2–8 °C, use within ~30 days.",
    references: [
      {
        label: "Goldstein et al. — thymosin beta-4 review (2012)",
        url: "https://pubmed.ncbi.nlm.nih.gov/22550036/",
      },
    ],
  },
  {
    slug: "cjc-1295-no-dac",
    name: "CJC-1295 (no DAC)",
    aliases: ["Mod GRF 1-29", "tetrasubstituted GRF 1-29"],
    category: "GH-axis",
    oneLiner:
      "Tetrasubstituted analog of GHRH(1-29). Without DAC, it has the same short half-life as native GHRH-related fragments.",
    molecularWeightDa: 3367.94,
    halfLifeHoursByRoute: {
      subq: [0.25, 0.5],
    },
    bioavailabilityNotes: {
      subq: "Pulsatile profile — half-life ~30 minutes.",
    },
    references: [
      {
        label: "Teichman et al. — CJC-1295 PK in human subjects (2006)",
        url: "https://pubmed.ncbi.nlm.nih.gov/16352695/",
      },
    ],
  },
  {
    slug: "cjc-1295-dac",
    name: "CJC-1295 with DAC",
    aliases: ["DAC:GRF", "CJC-1295 DAC"],
    category: "GH-axis",
    oneLiner:
      "GHRH analog with a Drug Affinity Complex (DAC) covalently bonding it to serum albumin. Greatly extended plasma half-life.",
    molecularWeightDa: 3647.16,
    halfLifeHoursByRoute: {
      subq: [144, 192],
    },
    bioavailabilityNotes: {
      subq: "Effective half-life 6–8 days due to albumin binding.",
    },
    references: [
      {
        label: "Teichman et al. — CJC-1295 PK in human subjects (2006)",
        url: "https://pubmed.ncbi.nlm.nih.gov/16352695/",
      },
    ],
  },
  {
    slug: "ipamorelin",
    name: "Ipamorelin",
    aliases: ["NNC 26-0161"],
    category: "GH-axis",
    oneLiner:
      "Selective ghrelin/GHS-R agonist. Studied for selective GH release without significant cortisol/prolactin effect.",
    molecularWeightDa: 711.86,
    halfLifeHoursByRoute: {
      subq: [2, 2.5],
      iv: [1.7, 2],
    },
    references: [
      {
        label: "Raun et al. — Ipamorelin PK and selectivity (1998)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9618673/",
      },
    ],
  },
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["Egrifta", "TH9507"],
    category: "GH-axis",
    oneLiner:
      "Stabilized GHRH analog. FDA-approved for HIV-associated lipodystrophy.",
    molecularWeightDa: 5135.85,
    halfLifeHoursByRoute: {
      subq: [0.4, 0.6],
    },
    references: [
      {
        label: "Falutz et al. — Tesamorelin clinical trial (2007)",
        url: "https://pubmed.ncbi.nlm.nih.gov/17684218/",
      },
    ],
  },
  {
    slug: "sermorelin",
    name: "Sermorelin",
    aliases: ["GRF 1-29"],
    category: "GH-axis",
    oneLiner:
      "Synthetic 29-amino-acid fragment of GHRH. Native GHRH-receptor agonist.",
    molecularWeightDa: 3357.88,
    halfLifeHoursByRoute: {
      subq: [0.1, 0.3],
    },
    references: [
      {
        label: "Walker — review of GHRH analogs (2000)",
        url: "https://pubmed.ncbi.nlm.nih.gov/10976944/",
      },
    ],
  },
  {
    slug: "ghrp-2",
    name: "GHRP-2",
    aliases: ["Pralmorelin"],
    category: "GH-axis",
    oneLiner: "Ghrelin/GHS-R agonist, more potent than GHRP-6 in animal models.",
    molecularWeightDa: 817.95,
    halfLifeHoursByRoute: {
      subq: [0.25, 0.6],
    },
    references: [
      {
        label: "Bowers — GHRPs as GH secretagogues (1996)",
        url: "https://pubmed.ncbi.nlm.nih.gov/8702398/",
      },
    ],
  },
  {
    slug: "ghrp-6",
    name: "GHRP-6",
    aliases: ["Growth Hormone Releasing Peptide 6"],
    category: "GH-axis",
    oneLiner: "First-generation ghrelin/GHS-R agonist. Potent appetite stimulant.",
    molecularWeightDa: 873.0,
    halfLifeHoursByRoute: {
      subq: [0.2, 0.5],
    },
    references: [
      {
        label: "Bowers — GHRPs as GH secretagogues (1996)",
        url: "https://pubmed.ncbi.nlm.nih.gov/8702398/",
      },
    ],
  },
  {
    slug: "mk-677",
    name: "MK-677",
    aliases: ["Ibutamoren", "Nutropin"],
    category: "GH-axis",
    oneLiner: "Orally active, non-peptide ghrelin receptor agonist.",
    molecularWeightDa: 528.66,
    halfLifeHoursByRoute: {
      oral: [4, 6],
    },
    bioavailabilityNotes: {
      oral: "Orally active (>60%). Once-daily dosing in trials.",
    },
    references: [
      {
        label: "Murphy et al. — MK-677 in elderly subjects (1998)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9709950/",
      },
    ],
  },
  {
    slug: "mots-c",
    name: "MOTS-c",
    aliases: ["Mitochondrial Open Reading frame of the Twelve S rRNA-c"],
    category: "Metabolic",
    oneLiner:
      "Mitochondrially-derived 16-amino-acid peptide studied for metabolic and AMPK-pathway effects.",
    molecularWeightDa: 2173.5,
    halfLifeHoursByRoute: {
      subq: [3, 5],
    },
    references: [
      {
        label: "Lee et al. — MOTS-c regulates muscle homeostasis (2015)",
        url: "https://pubmed.ncbi.nlm.nih.gov/25738459/",
      },
    ],
  },
  {
    slug: "epithalon",
    name: "Epithalon",
    aliases: ["Epitalon", "Epithalamin tetrapeptide"],
    category: "Metabolic",
    oneLiner:
      "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) studied for telomerase activation in cell models.",
    molecularWeightDa: 390.35,
    halfLifeHoursByRoute: {
      subq: [0.25, 0.5],
    },
    references: [
      {
        label: "Khavinson et al. — Epithalon and telomerase (2003)",
        url: "https://pubmed.ncbi.nlm.nih.gov/14523985/",
      },
    ],
  },
  {
    slug: "selank",
    name: "Selank",
    aliases: ["TP-7"],
    category: "Cognitive",
    oneLiner:
      "Synthetic heptapeptide derived from tuftsin. Studied for anxiolytic effects in rodent models.",
    molecularWeightDa: 751.85,
    halfLifeHoursByRoute: {
      intranasal: [0.5, 1],
    },
    bioavailabilityNotes: {
      intranasal: "Primary research route. Rapid onset, short duration.",
    },
    references: [
      {
        label: "Semenova et al. — Selank pharmacology review (2007)",
        url: "https://pubmed.ncbi.nlm.nih.gov/17936325/",
      },
    ],
  },
  {
    slug: "semax",
    name: "Semax",
    aliases: ["MEHFPGP"],
    category: "Cognitive",
    oneLiner:
      "Synthetic heptapeptide analog of ACTH(4-10). Studied for nootropic and BDNF-modulating effects.",
    molecularWeightDa: 813.93,
    halfLifeHoursByRoute: {
      intranasal: [0.5, 1.2],
    },
    references: [
      {
        label: "Levitskaya et al. — Semax effects on BDNF (2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18803017/",
      },
    ],
  },
  {
    slug: "thymalin",
    name: "Thymalin",
    aliases: ["Thymus extract peptide complex"],
    category: "Immune",
    oneLiner:
      "Polypeptide extract from calf thymus. Studied for immunomodulatory effects.",
    halfLifeHoursByRoute: {
      subq: [4, 8],
    },
    references: [
      {
        label: "Khavinson — peptide bioregulators review (2002)",
        url: "https://pubmed.ncbi.nlm.nih.gov/12152178/",
      },
    ],
  },
  {
    slug: "thymosin-alpha-1",
    name: "Thymosin Alpha-1",
    aliases: ["Tα1", "Zadaxin"],
    category: "Immune",
    oneLiner:
      "28-amino-acid peptide derived from thymosin fraction 5. FDA-approved overseas for hepatitis B/C adjuvant therapy.",
    molecularWeightDa: 3108.39,
    halfLifeHoursByRoute: {
      subq: [2, 4],
    },
    references: [
      {
        label: "Goldstein — thymosin alpha 1 review (2007)",
        url: "https://pubmed.ncbi.nlm.nih.gov/17889648/",
      },
    ],
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    aliases: ["Copper Tripeptide-1", "Glycyl-L-histidyl-L-lysine:copper"],
    category: "Structural",
    oneLiner:
      "Naturally-occurring tripeptide-copper complex studied for skin and tissue remodeling.",
    molecularWeightDa: 402.91,
    halfLifeHoursByRoute: {
      subq: [1, 2],
    },
    references: [
      {
        label: "Pickart — GHK-Cu and skin regeneration (2008)",
        url: "https://pubmed.ncbi.nlm.nih.gov/18830450/",
      },
    ],
  },
  {
    slug: "pt-141",
    name: "PT-141",
    aliases: ["Bremelanotide"],
    category: "Sexual",
    oneLiner:
      "Synthetic melanocortin receptor agonist. FDA-approved for HSDD in premenopausal women.",
    molecularWeightDa: 1025.18,
    halfLifeHoursByRoute: {
      subq: [1.9, 4],
    },
    references: [
      {
        label: "Diamond et al. — bremelanotide PK (2013)",
        url: "https://pubmed.ncbi.nlm.nih.gov/23437830/",
      },
    ],
  },
  {
    slug: "melanotan-ii",
    name: "Melanotan II",
    aliases: ["MT-II"],
    category: "Sexual",
    oneLiner:
      "Synthetic melanocortin receptor agonist. Originally developed as a sunless tanning research compound.",
    molecularWeightDa: 1024.18,
    halfLifeHoursByRoute: {
      subq: [1, 2.5],
    },
    references: [
      {
        label: "Wessells et al. — MT-II in male sexual dysfunction (1998)",
        url: "https://pubmed.ncbi.nlm.nih.gov/9628694/",
      },
    ],
  },
  {
    slug: "aod-9604",
    name: "AOD-9604",
    aliases: ["AOD"],
    category: "Metabolic",
    oneLiner:
      "Synthetic peptide fragment of human GH (residues 177-191). Studied for lipolysis without effect on IGF-1.",
    molecularWeightDa: 1815.1,
    halfLifeHoursByRoute: {
      subq: [0.4, 0.7],
    },
    references: [
      {
        label: "Heffernan et al. — AOD9604 metabolic effects (2001)",
        url: "https://pubmed.ncbi.nlm.nih.gov/11334411/",
      },
    ],
  },
];

/** Convenience: list of unique categories. */
export const CATEGORIES = Array.from(
  new Set(COMPOUNDS.map((c) => c.category)),
);

export function findCompound(slug: string): Compound | undefined {
  return COMPOUNDS.find((c) => c.slug === slug);
}

/**
 * Compute approximate plasma concentration as a fraction of Cmax across
 * a window of hours, given an exponential decay model with the supplied
 * half-life. This is a TEACHING visualization — real PK has absorption
 * phases, distribution, etc. We mark the chart as "exponential model
 * for illustration".
 */
export function decayCurve(halfLifeHours: number, hoursWindow: number, steps = 60) {
  const out: { t: number; pct: number }[] = [];
  const k = Math.log(2) / halfLifeHours;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * hoursWindow;
    out.push({ t, pct: Math.exp(-k * t) * 100 });
  }
  return out;
}
