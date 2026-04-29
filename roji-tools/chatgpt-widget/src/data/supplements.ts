/**
 * OTC Supplement Interaction Database.
 *
 * Scope: vitamins, minerals, common amino-acid / extract supplements,
 * fish oil, creatine, etc. NO prescription drugs. The data here is
 * sourced from absorption / pharmacology textbooks and well-cited
 * monographs (Examine, NIH ODS).
 *
 * Each interaction has:
 *   - severity:
 *       "synergy"     : taking together is better than apart (informational)
 *       "timing"      : take separately for proper absorption
 *       "redundant"   : overlap in mechanism or pathway
 *       "caution"     : known interaction worth knowing
 *   - explainer
 */

export interface Supp {
  slug: string;
  label: string;
  category:
    | "Vitamin"
    | "Mineral"
    | "Amino acid"
    | "Fatty acid"
    | "Botanical"
    | "Probiotic"
    | "Other";
  /** Common formulation notes useful in interaction analysis. */
  notes?: string;
}

export type Severity = "synergy" | "timing" | "redundant" | "caution";

export interface Interaction {
  pair: [string, string];
  severity: Severity;
  /** Suggested action: "Take together", "Separate by 2+ hours", etc. */
  action: string;
  explainer: string;
}

export const SUPPS: Supp[] = [
  // Vitamins
  { slug: "vit-a", label: "Vitamin A", category: "Vitamin" },
  { slug: "vit-d3", label: "Vitamin D3", category: "Vitamin", notes: "Fat-soluble. Take with a fatty meal." },
  { slug: "vit-e", label: "Vitamin E", category: "Vitamin" },
  { slug: "vit-k2", label: "Vitamin K2 (MK-7)", category: "Vitamin", notes: "Synergistic with D3." },
  { slug: "vit-c", label: "Vitamin C", category: "Vitamin" },
  { slug: "vit-b1", label: "Vitamin B1 (Thiamine)", category: "Vitamin" },
  { slug: "vit-b2", label: "Vitamin B2 (Riboflavin)", category: "Vitamin" },
  { slug: "vit-b3", label: "Vitamin B3 (Niacin)", category: "Vitamin" },
  { slug: "vit-b6", label: "Vitamin B6 (P5P)", category: "Vitamin" },
  { slug: "vit-b9", label: "Folate (Methylfolate)", category: "Vitamin" },
  { slug: "vit-b12", label: "Vitamin B12 (Methylcobalamin)", category: "Vitamin" },
  { slug: "b-complex", label: "B-Complex", category: "Vitamin" },

  // Minerals
  { slug: "calcium", label: "Calcium", category: "Mineral" },
  { slug: "magnesium", label: "Magnesium (Glycinate)", category: "Mineral" },
  { slug: "magnesium-citrate", label: "Magnesium Citrate", category: "Mineral" },
  { slug: "zinc", label: "Zinc", category: "Mineral" },
  { slug: "copper", label: "Copper", category: "Mineral" },
  { slug: "iron", label: "Iron", category: "Mineral" },
  { slug: "iodine", label: "Iodine", category: "Mineral" },
  { slug: "selenium", label: "Selenium", category: "Mineral" },
  { slug: "boron", label: "Boron", category: "Mineral" },
  { slug: "chromium", label: "Chromium", category: "Mineral" },

  // Amino / proteins
  { slug: "creatine", label: "Creatine Monohydrate", category: "Amino acid" },
  { slug: "l-arginine", label: "L-Arginine", category: "Amino acid" },
  { slug: "l-citrulline", label: "L-Citrulline", category: "Amino acid" },
  { slug: "l-carnitine", label: "L-Carnitine", category: "Amino acid" },
  { slug: "taurine", label: "Taurine", category: "Amino acid" },
  { slug: "glycine", label: "Glycine", category: "Amino acid" },
  { slug: "l-theanine", label: "L-Theanine", category: "Amino acid" },
  { slug: "tyrosine", label: "L-Tyrosine", category: "Amino acid" },
  { slug: "5-htp", label: "5-HTP", category: "Amino acid" },
  { slug: "glutamine", label: "L-Glutamine", category: "Amino acid" },

  // Fatty acids
  { slug: "omega-3", label: "Fish oil (Omega-3)", category: "Fatty acid" },
  { slug: "krill-oil", label: "Krill oil", category: "Fatty acid" },

  // Botanicals
  { slug: "ashwagandha", label: "Ashwagandha", category: "Botanical" },
  { slug: "rhodiola", label: "Rhodiola Rosea", category: "Botanical" },
  { slug: "tongkat", label: "Tongkat Ali", category: "Botanical" },
  { slug: "maca", label: "Maca", category: "Botanical" },
  { slug: "curcumin", label: "Curcumin", category: "Botanical" },
  { slug: "berberine", label: "Berberine", category: "Botanical" },
  { slug: "ginseng", label: "Panax Ginseng", category: "Botanical" },
  { slug: "ginkgo", label: "Ginkgo Biloba", category: "Botanical" },
  { slug: "green-tea", label: "Green Tea Extract (EGCG)", category: "Botanical" },
  { slug: "garlic", label: "Garlic Extract", category: "Botanical" },

  // Other
  { slug: "melatonin", label: "Melatonin", category: "Other" },
  { slug: "probiotic", label: "Probiotic", category: "Probiotic" },
  { slug: "coq10", label: "CoQ10 (Ubiquinol)", category: "Other" },
  { slug: "alpha-lipoic", label: "Alpha-Lipoic Acid", category: "Other" },
  { slug: "nac", label: "NAC", category: "Amino acid" },
  { slug: "glycine-mag", label: "Magnesium Threonate", category: "Mineral" },
  { slug: "caffeine", label: "Caffeine", category: "Other" },
  { slug: "yohimbine", label: "Yohimbine HCl", category: "Botanical" },
];

export const INTERACTIONS: Interaction[] = [
  // Synergies
  {
    pair: ["vit-d3", "vit-k2"],
    severity: "synergy",
    action: "Take together — ideally with a fatty meal.",
    explainer:
      "K2 directs the calcium that D3 helps absorb to bones rather than soft tissue. Both fat-soluble; need dietary fat for absorption.",
  },
  {
    pair: ["vit-d3", "magnesium"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "Magnesium is required as a cofactor for vitamin D activation. Low magnesium status blunts D3's effectiveness.",
  },
  {
    pair: ["zinc", "copper"],
    severity: "redundant",
    action: "Don't supplement zinc long-term without copper (15:1 ratio max).",
    explainer:
      "High-dose zinc (>50 mg/day) for >2 weeks depletes copper and can cause anemia. If supplementing zinc, include copper or rotate cycles.",
  },
  {
    pair: ["zinc", "iron"],
    severity: "timing",
    action: "Separate by 2+ hours.",
    explainer:
      "Zinc and iron compete for the same intestinal transporters. Taking together significantly reduces absorption of both.",
  },
  {
    pair: ["calcium", "iron"],
    severity: "timing",
    action: "Separate by 2+ hours.",
    explainer:
      "Calcium reduces non-heme iron absorption by 50–60%. If iron status matters, never co-administer.",
  },
  {
    pair: ["calcium", "magnesium"],
    severity: "timing",
    action: "Take separately for full benefit.",
    explainer:
      "Calcium + magnesium share transporters in the gut. High-dose calcium reduces magnesium absorption ~30%.",
  },
  {
    pair: ["calcium", "zinc"],
    severity: "timing",
    action: "Separate by 2+ hours.",
    explainer:
      "Calcium impairs zinc absorption. If you need both, dose at different times.",
  },
  {
    pair: ["iron", "vit-c"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "Vitamin C reduces ferric to ferrous iron, doubling non-heme iron absorption. Take 200 mg vit C with iron.",
  },
  {
    pair: ["iron", "vit-e"],
    severity: "timing",
    action: "Separate by 8+ hours.",
    explainer:
      "Iron oxidizes vitamin E. Take iron in the morning, vit E in the evening.",
  },
  {
    pair: ["caffeine", "iron"],
    severity: "timing",
    action: "Don't drink coffee/tea with iron supplements.",
    explainer:
      "Polyphenols in coffee and tea reduce iron absorption by 50–80%. Wait 2 hours either side.",
  },
  {
    pair: ["caffeine", "calcium"],
    severity: "caution",
    action: "Limit caffeine if calcium status matters.",
    explainer:
      "Caffeine modestly increases urinary calcium excretion. Not significant unless intake is very high (>400 mg/day).",
  },
  {
    pair: ["vit-c", "b-complex"],
    severity: "synergy",
    action: "Take together with food.",
    explainer:
      "Vitamin C improves stability and absorption of several B-vitamins, especially B12.",
  },
  {
    pair: ["omega-3", "vit-d3"],
    severity: "synergy",
    action: "Take together (both fat-soluble).",
    explainer:
      "Both require dietary fat for absorption. Pairing is convenient and may reduce inflammation synergistically.",
  },
  {
    pair: ["omega-3", "vit-e"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "Vitamin E protects polyunsaturated omega-3 fatty acids from oxidation in the body.",
  },
  {
    pair: ["magnesium", "magnesium-citrate"],
    severity: "redundant",
    action: "Pick one form.",
    explainer:
      "Multiple magnesium forms double-dose the same mineral. Glycinate (calm/sleep) and citrate (laxative) are best taken at different times if at all.",
  },
  {
    pair: ["b-complex", "vit-b12"],
    severity: "redundant",
    action: "B-complex usually contains B12 — don't double up unless deficient.",
    explainer:
      "Most B-complex supplements include 100–500 mcg B12. Adding standalone B12 is only needed if you're a known non-absorber (PPIs, age) or vegan.",
  },
  {
    pair: ["b-complex", "vit-b6"],
    severity: "redundant",
    action: "B-complex contains B6 — avoid double-dosing.",
    explainer:
      "Chronic high-dose B6 (>100 mg/day) causes peripheral neuropathy. Check that combined intake is <50 mg/day.",
  },
  {
    pair: ["5-htp", "tyrosine"],
    severity: "caution",
    action: "Separate by hours; consider not stacking.",
    explainer:
      "Both are precursors to monoamine neurotransmitters (serotonin from 5-HTP, dopamine/NE from tyrosine). Stacking can be unbalanced.",
  },
  {
    pair: ["melatonin", "magnesium"],
    severity: "synergy",
    action: "Take together at bedtime.",
    explainer:
      "Magnesium glycinate enhances GABA signaling; melatonin sets circadian timing. Common synergistic sleep stack.",
  },
  {
    pair: ["melatonin", "5-htp"],
    severity: "synergy",
    action: "Take together at bedtime.",
    explainer:
      "5-HTP is a serotonin precursor (and serotonin → melatonin pathway), so the pair is mechanistically aligned.",
  },
  {
    pair: ["caffeine", "l-theanine"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "L-Theanine smooths the alpha-wave/jitter profile of caffeine. Common 1:2 caffeine:theanine ratio for focus.",
  },
  {
    pair: ["creatine", "l-arginine"],
    severity: "redundant",
    action: "Pick one — both are nitric oxide / performance angles.",
    explainer:
      "Different mechanisms but overlapping use case. L-citrulline is generally a better NO precursor than arginine.",
  },
  {
    pair: ["l-arginine", "l-citrulline"],
    severity: "redundant",
    action: "Pick L-citrulline.",
    explainer:
      "L-citrulline is converted to arginine in the kidneys with much higher bioavailability than oral arginine.",
  },
  {
    pair: ["nac", "vit-c"],
    severity: "synergy",
    action: "Take together (with food).",
    explainer:
      "Both regenerate antioxidant systems (NAC → glutathione, vit C → recycled by glutathione). Common antioxidant stack.",
  },
  {
    pair: ["alpha-lipoic", "coq10"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "Common mitochondrial-support pair. ALA recycles other antioxidants (incl. CoQ10) and is both water- and fat-soluble.",
  },
  {
    pair: ["berberine", "curcumin"],
    severity: "synergy",
    action: "Take together with a fatty meal (curcumin needs fat or piperine).",
    explainer:
      "Both modulate AMPK and have anti-inflammatory effects. Curcumin requires fat or piperine for absorption.",
  },
  {
    pair: ["ashwagandha", "rhodiola"],
    severity: "redundant",
    action: "Pick one — same time-frame.",
    explainer:
      "Both are adaptogens with stress/cortisol axis effects. Stacking offers diminishing returns and ashwagandha is often sedating while rhodiola is stimulating.",
  },
  {
    pair: ["ashwagandha", "tongkat"],
    severity: "synergy",
    action: "Take together (different mechanisms).",
    explainer:
      "Ashwagandha lowers cortisol; tongkat improves free testosterone via SHBG modulation. Complementary mechanisms.",
  },
  {
    pair: ["caffeine", "yohimbine"],
    severity: "caution",
    action: "Use cautiously, never on an empty stomach.",
    explainer:
      "Both are stimulants. Stacking sharply increases anxiety, blood pressure, and heart rate. Tolerance to caffeine ≠ tolerance to yohimbine.",
  },
  {
    pair: ["yohimbine", "5-htp"],
    severity: "caution",
    action: "Don't stack.",
    explainer:
      "Yohimbine is an alpha-2 antagonist (raises NE); 5-HTP raises serotonin. Combined effect on monoamines is unpredictable.",
  },
  {
    pair: ["green-tea", "iron"],
    severity: "timing",
    action: "Separate by 2+ hours.",
    explainer:
      "EGCG and other catechins inhibit non-heme iron absorption strongly. Big issue for those at risk of iron deficiency.",
  },
  {
    pair: ["probiotic", "garlic"],
    severity: "caution",
    action: "Separate by hours.",
    explainer:
      "Garlic has antimicrobial activity and can blunt some probiotic strains. Take probiotics on an empty stomach away from antimicrobials.",
  },
  {
    pair: ["zinc", "probiotic"],
    severity: "timing",
    action: "Separate by 2+ hours.",
    explainer:
      "Zinc has mild antimicrobial effects in the gut. Take probiotics first thing in the morning, zinc with food later.",
  },
  {
    pair: ["selenium", "vit-e"],
    severity: "synergy",
    action: "Take together.",
    explainer:
      "Selenium is required for glutathione peroxidase, which works alongside vitamin E in the antioxidant system.",
  },
  {
    pair: ["iodine", "selenium"],
    severity: "synergy",
    action: "Take together for thyroid support.",
    explainer:
      "Selenium is required for deiodinase enzymes that convert T4 → T3. High iodine without selenium can stress the thyroid.",
  },
  {
    pair: ["maca", "ashwagandha"],
    severity: "synergy",
    action: "Often stacked.",
    explainer:
      "Maca for libido/energy, ashwagandha for stress and sleep. Different mechanisms, common in 'male performance' formulations.",
  },
  {
    pair: ["chromium", "berberine"],
    severity: "redundant",
    action: "Pick one for insulin support.",
    explainer:
      "Both are used for glucose / insulin support. Berberine is the much stronger of the two. Stack rarely worth the cost.",
  },
];

/** Bidirectional lookup: returns interactions involving any of the slugs. */
export function findInteractions(slugs: string[]): Interaction[] {
  const set = new Set(slugs);
  return INTERACTIONS.filter(
    (i) => set.has(i.pair[0]) && set.has(i.pair[1]),
  );
}
