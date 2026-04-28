/**
 * Bloodwork reference range database.
 *
 * Reference ranges follow standard US clinical lab conventions
 * (LabCorp / Quest). Some markers have sex-specific or age-specific
 * ranges; we encode those as separate "ranges" entries.
 *
 * IMPORTANT: This is informational. We're not diagnosing — we're
 * showing where your number falls relative to standard reference
 * intervals.
 */

export type Sex = "male" | "female" | "any";

export interface Range {
  /** Optional age cutoff (years). e.g. age >= 50 */
  ageMin?: number;
  ageMax?: number;
  sex: Sex;
  low: number;
  high: number;
}

export interface Marker {
  slug: string;
  label: string;
  unit: string;
  group:
    | "Hormones"
    | "Lipids"
    | "Liver"
    | "Kidney"
    | "Metabolic"
    | "Hematology"
    | "Inflammation"
    | "Thyroid"
    | "Vitamins";
  description: string;
  /** What it means if value is high. */
  highMeans: string;
  /** What it means if value is low. */
  lowMeans: string;
  ranges: Range[];
}

/**
 * Standard adult reference intervals. When the answer to "is X normal"
 * actually depends on age/sex, we encode multiple ranges.
 */
export const MARKERS: Marker[] = [
  // ─── Hormones ─────────────────────────────────────────────────
  {
    slug: "total-testosterone",
    label: "Total Testosterone",
    unit: "ng/dL",
    group: "Hormones",
    description: "Total bound + free testosterone in serum.",
    highMeans:
      "May indicate exogenous androgen exposure, certain tumors, or PCOS in women.",
    lowMeans:
      "May indicate hypogonadism (primary or secondary), sleep deprivation, chronic stress, or aging.",
    ranges: [
      { sex: "male", ageMin: 18, ageMax: 49, low: 264, high: 916 },
      { sex: "male", ageMin: 50, low: 220, high: 700 },
      { sex: "female", low: 8, high: 60 },
    ],
  },
  {
    slug: "free-testosterone",
    label: "Free Testosterone",
    unit: "pg/mL",
    group: "Hormones",
    description: "Bioavailable, unbound testosterone — often more clinically meaningful than total.",
    highMeans: "Usually mirrors total testosterone elevation.",
    lowMeans:
      "Often reflects elevated SHBG with normal total T. Common cause of hypogonadal symptoms despite 'normal' total.",
    ranges: [
      { sex: "male", ageMin: 18, ageMax: 49, low: 8.7, high: 25.1 },
      { sex: "male", ageMin: 50, low: 6.8, high: 21.5 },
      { sex: "female", low: 0.6, high: 6.8 },
    ],
  },
  {
    slug: "estradiol",
    label: "Estradiol (E2)",
    unit: "pg/mL",
    group: "Hormones",
    description: "Primary form of estrogen in adult humans.",
    highMeans:
      "In men: typically aromatization of high T, weight gain, alcohol. In women: depends heavily on menstrual cycle phase.",
    lowMeans:
      "In men: associated with low libido, low bone density. In women: post-menopausal range or follicular phase early in cycle.",
    ranges: [
      { sex: "male", low: 7.6, high: 42.6 },
      { sex: "female", low: 12.5, high: 498 }, // wide because of cycle variation
    ],
  },
  {
    slug: "shbg",
    label: "SHBG",
    unit: "nmol/L",
    group: "Hormones",
    description:
      "Sex hormone binding globulin. Binds testosterone and estradiol; high SHBG reduces bioavailability.",
    highMeans: "Hyperthyroidism, liver dysfunction, anorexia, aging.",
    lowMeans:
      "Insulin resistance, obesity, hypothyroidism, exogenous androgens.",
    ranges: [
      { sex: "male", low: 14.5, high: 48.4 },
      { sex: "female", low: 24.6, high: 122 },
    ],
  },
  {
    slug: "lh",
    label: "LH",
    unit: "mIU/mL",
    group: "Hormones",
    description: "Luteinizing hormone. Drives Leydig cell testosterone production.",
    highMeans: "Primary hypogonadism (testes can't respond) or post-menopausal.",
    lowMeans: "Secondary hypogonadism (pituitary not signaling) or HPTA suppression from exogenous androgens.",
    ranges: [
      { sex: "male", low: 1.7, high: 8.6 },
      { sex: "female", low: 1.9, high: 12.5 },
    ],
  },
  {
    slug: "fsh",
    label: "FSH",
    unit: "mIU/mL",
    group: "Hormones",
    description: "Follicle stimulating hormone.",
    highMeans: "Primary gonadal failure or post-menopausal.",
    lowMeans: "Pituitary suppression.",
    ranges: [
      { sex: "male", low: 1.5, high: 12.4 },
      { sex: "female", low: 2.5, high: 10.2 },
    ],
  },
  {
    slug: "prolactin",
    label: "Prolactin",
    unit: "ng/mL",
    group: "Hormones",
    description: "Pituitary hormone; chronically elevated levels suppress LH/FSH.",
    highMeans: "Prolactinoma, certain medications, hypothyroidism, or stress.",
    lowMeans: "Rarely clinically significant.",
    ranges: [
      { sex: "male", low: 4, high: 15.2 },
      { sex: "female", low: 4.8, high: 23.3 },
    ],
  },
  {
    slug: "igf-1",
    label: "IGF-1",
    unit: "ng/mL",
    group: "Hormones",
    description:
      "Insulin-like growth factor 1. Downstream marker of growth hormone activity.",
    highMeans:
      "Acromegaly, exogenous GH or potent GH secretagogues. Also elevated in adolescents.",
    lowMeans:
      "GH deficiency, chronic illness, malnutrition, or normal aging.",
    ranges: [
      { sex: "any", ageMin: 18, ageMax: 30, low: 117, high: 329 },
      { sex: "any", ageMin: 31, ageMax: 50, low: 94, high: 252 },
      { sex: "any", ageMin: 51, low: 71, high: 263 },
    ],
  },
  {
    slug: "cortisol",
    label: "Cortisol (AM)",
    unit: "mcg/dL",
    group: "Hormones",
    description: "Morning cortisol; ideally drawn between 7-9am.",
    highMeans: "Cushing's syndrome, chronic stress, depression, certain medications.",
    lowMeans: "Adrenal insufficiency or pituitary dysfunction.",
    ranges: [{ sex: "any", low: 6.2, high: 19.4 }],
  },

  // ─── Lipids ───────────────────────────────────────────────────
  {
    slug: "total-cholesterol",
    label: "Total Cholesterol",
    unit: "mg/dL",
    group: "Lipids",
    description: "Sum of HDL + LDL + 20% triglycerides.",
    highMeans: "Cardiovascular risk factor, especially when LDL drives the elevation.",
    lowMeans: "Generally favorable, occasionally indicates malabsorption or hyperthyroidism.",
    ranges: [{ sex: "any", low: 100, high: 199 }],
  },
  {
    slug: "ldl",
    label: "LDL Cholesterol",
    unit: "mg/dL",
    group: "Lipids",
    description: "Low-density lipoprotein. The main atherogenic lipoprotein particle carrier.",
    highMeans: "Increased cardiovascular risk; aggressive lifestyle/medication intervention often warranted.",
    lowMeans: "Favorable for cardiovascular risk.",
    ranges: [{ sex: "any", low: 0, high: 99 }],
  },
  {
    slug: "hdl",
    label: "HDL Cholesterol",
    unit: "mg/dL",
    group: "Lipids",
    description: "High-density lipoprotein. Inversely associated with cardiovascular risk.",
    highMeans: "Generally favorable, though very high HDL (>90) loses protective association.",
    lowMeans: "Cardiovascular risk factor.",
    ranges: [
      { sex: "male", low: 40, high: 90 },
      { sex: "female", low: 50, high: 90 },
    ],
  },
  {
    slug: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    group: "Lipids",
    description: "Stored fat circulating in plasma.",
    highMeans: "Associated with insulin resistance, alcohol use, high carb intake.",
    lowMeans: "Generally favorable.",
    ranges: [{ sex: "any", low: 0, high: 149 }],
  },
  {
    slug: "apob",
    label: "ApoB",
    unit: "mg/dL",
    group: "Lipids",
    description: "Apolipoprotein B. Direct count of atherogenic particles. Often more predictive than LDL-C.",
    highMeans: "Strong cardiovascular risk factor.",
    lowMeans: "Favorable.",
    ranges: [{ sex: "any", low: 40, high: 100 }],
  },

  // ─── Liver ────────────────────────────────────────────────────
  {
    slug: "alt",
    label: "ALT",
    unit: "U/L",
    group: "Liver",
    description: "Alanine aminotransferase. Elevated when liver cells are damaged.",
    highMeans: "Liver injury, NAFLD, alcohol, hepatitis, certain medications, intense training (transient).",
    lowMeans: "Generally not clinically significant.",
    ranges: [
      { sex: "male", low: 0, high: 44 },
      { sex: "female", low: 0, high: 32 },
    ],
  },
  {
    slug: "ast",
    label: "AST",
    unit: "U/L",
    group: "Liver",
    description: "Aspartate aminotransferase. Found in liver, heart, and skeletal muscle.",
    highMeans: "Liver damage, muscle injury, heart issues. Can be elevated post-workout.",
    lowMeans: "Generally not clinically significant.",
    ranges: [
      { sex: "male", low: 0, high: 40 },
      { sex: "female", low: 0, high: 32 },
    ],
  },
  {
    slug: "ggt",
    label: "GGT",
    unit: "U/L",
    group: "Liver",
    description: "Gamma-glutamyl transferase. Sensitive to alcohol and biliary issues.",
    highMeans: "Alcohol use, biliary obstruction, certain medications.",
    lowMeans: "Generally not clinically significant.",
    ranges: [
      { sex: "male", low: 8, high: 61 },
      { sex: "female", low: 5, high: 36 },
    ],
  },

  // ─── Metabolic ────────────────────────────────────────────────
  {
    slug: "fasting-glucose",
    label: "Fasting Glucose",
    unit: "mg/dL",
    group: "Metabolic",
    description: "Blood sugar after 8+ hour fast.",
    highMeans: "Pre-diabetes (100-125) or diabetes (≥126).",
    lowMeans: "Hypoglycemia, possibly indicating endocrine issues or fasting protocol effects.",
    ranges: [{ sex: "any", low: 70, high: 99 }],
  },
  {
    slug: "hba1c",
    label: "HbA1c",
    unit: "%",
    group: "Metabolic",
    description: "Average blood glucose over ~3 months. Reflects glycemic control.",
    highMeans: "Pre-diabetes (5.7-6.4) or diabetes (≥6.5).",
    lowMeans: "Generally favorable. Very low could suggest hemolytic conditions.",
    ranges: [{ sex: "any", low: 4, high: 5.6 }],
  },
  {
    slug: "fasting-insulin",
    label: "Fasting Insulin",
    unit: "uIU/mL",
    group: "Metabolic",
    description: "Insulin level after fasting. High = early insulin resistance.",
    highMeans: "Insulin resistance, even with normal glucose.",
    lowMeans: "Beta-cell exhaustion (concerning if glucose elevated) or normal in lean fasted individuals.",
    ranges: [{ sex: "any", low: 2.6, high: 24.9 }],
  },

  // ─── Thyroid ──────────────────────────────────────────────────
  {
    slug: "tsh",
    label: "TSH",
    unit: "mIU/L",
    group: "Thyroid",
    description: "Thyroid stimulating hormone. Pituitary signal to the thyroid.",
    highMeans: "Hypothyroidism (thyroid not responding adequately).",
    lowMeans: "Hyperthyroidism (thyroid overactive) or pituitary suppression.",
    ranges: [{ sex: "any", low: 0.45, high: 4.5 }],
  },
  {
    slug: "free-t4",
    label: "Free T4",
    unit: "ng/dL",
    group: "Thyroid",
    description: "Unbound thyroxine; the thyroid's primary output.",
    highMeans: "Hyperthyroidism.",
    lowMeans: "Hypothyroidism.",
    ranges: [{ sex: "any", low: 0.82, high: 1.77 }],
  },
  {
    slug: "free-t3",
    label: "Free T3",
    unit: "pg/mL",
    group: "Thyroid",
    description: "Active form of thyroid hormone, converted from T4 in tissues.",
    highMeans: "Hyperthyroidism or excessive T3 supplementation.",
    lowMeans: "Poor T4-to-T3 conversion (often despite normal TSH/T4).",
    ranges: [{ sex: "any", low: 2.0, high: 4.4 }],
  },

  // ─── Hematology ──────────────────────────────────────────────
  {
    slug: "hematocrit",
    label: "Hematocrit",
    unit: "%",
    group: "Hematology",
    description: "Volume percentage of red blood cells in blood.",
    highMeans: "Polycythemia (often from TRT or sleep apnea), dehydration, or smoking.",
    lowMeans: "Anemia.",
    ranges: [
      { sex: "male", low: 38.3, high: 48.6 },
      { sex: "female", low: 35.5, high: 44.9 },
    ],
  },
  {
    slug: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    group: "Hematology",
    description: "Oxygen-carrying protein in red blood cells.",
    highMeans: "Mirrors hematocrit elevation.",
    lowMeans: "Anemia.",
    ranges: [
      { sex: "male", low: 13.2, high: 16.6 },
      { sex: "female", low: 11.6, high: 15 },
    ],
  },

  // ─── Inflammation ────────────────────────────────────────────
  {
    slug: "hs-crp",
    label: "hs-CRP",
    unit: "mg/L",
    group: "Inflammation",
    description: "High-sensitivity C-reactive protein. Marker of systemic inflammation and CV risk.",
    highMeans: ">3 = high CV risk; >10 = acute inflammation/infection.",
    lowMeans: "Favorable.",
    ranges: [{ sex: "any", low: 0, high: 1 }],
  },

  // ─── Vitamins ────────────────────────────────────────────────
  {
    slug: "vitamin-d",
    label: "Vitamin D (25-OH)",
    unit: "ng/mL",
    group: "Vitamins",
    description: "Best marker of vitamin D status.",
    highMeans: "Generally only from very high supplementation. >100 risks hypercalcemia.",
    lowMeans:
      "Deficiency. Linked to bone, immune, and mood issues. Common in northern latitudes.",
    ranges: [{ sex: "any", low: 30, high: 100 }],
  },
  {
    slug: "vitamin-b12",
    label: "Vitamin B12",
    unit: "pg/mL",
    group: "Vitamins",
    description: "Cobalamin status.",
    highMeans: "Usually from supplementation. Rare causes include liver disease.",
    lowMeans: "Deficiency. Common in vegans, older adults, those on metformin or PPIs.",
    ranges: [{ sex: "any", low: 232, high: 1245 }],
  },
  {
    slug: "ferritin",
    label: "Ferritin",
    unit: "ng/mL",
    group: "Vitamins",
    description: "Iron storage protein. High sensitivity for iron status.",
    highMeans: "Iron overload, hemochromatosis, chronic inflammation, or NAFLD.",
    lowMeans: "Iron deficiency, often before anemia is evident on hemoglobin.",
    ranges: [
      { sex: "male", low: 30, high: 400 },
      { sex: "female", low: 13, high: 150 },
    ],
  },
];

export function findRange(
  marker: Marker,
  sex: Sex,
  age: number,
): Range | undefined {
  // Exact sex match first, with age in range.
  const exact = marker.ranges.find(
    (r) =>
      (r.sex === sex || r.sex === "any") &&
      (r.ageMin === undefined || age >= r.ageMin) &&
      (r.ageMax === undefined || age <= r.ageMax),
  );
  return exact ?? marker.ranges[0];
}

export type FlagLevel = "ok" | "low" | "high" | "critical-low" | "critical-high";

export function flag(value: number, range: Range): FlagLevel {
  if (value < range.low * 0.7) return "critical-low";
  if (value < range.low) return "low";
  if (value > range.high * 1.5) return "critical-high";
  if (value > range.high) return "high";
  return "ok";
}
