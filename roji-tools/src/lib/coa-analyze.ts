/**
 * COA (Certificate of Analysis) parser + analyzer.
 *
 * The PDF text is provided by the client (via pdfjs-dist running in the
 * browser — never uploaded to our server). This module does the
 * post-extraction work:
 *
 *   - Find common analytical fields (HPLC purity, MS, water, peptide
 *     content) via regex heuristics tuned on real Janoshik / Pyrum /
 *     CDN Bio / Anresco / vendor-internal templates.
 *   - Identify the lab name (Janoshik, Anresco, Pyrum, etc.) and flag
 *     "no third-party lab" as a risk.
 *   - Score the COA on a 0–100 trust scale based on:
 *       + presence of HPLC purity result (≥98%)
 *       + presence of mass spectrometry confirmation
 *       + presence of water content
 *       + named third-party lab
 *       + lot/batch identifier
 *       + date within last 18 months
 *   - Return human-readable explanations of every line we matched
 *     (so users learn what to look for).
 *
 * This is heuristic. We surface every signal so the user can override
 * our judgement.
 */

export interface CoaField {
  key: string; // canonical key like "hplc_purity"
  label: string; // human label
  rawSnippet: string; // raw text snippet we matched
  value: string | null; // parsed value (e.g. "98.7%")
  numeric?: number; // numeric form when applicable
  good: boolean | null; // null = informational
  explainer: string; // plain-English what this means
}

export interface CoaAnalysis {
  fields: CoaField[];
  trustScore: number; // 0–100
  flags: string[]; // negative signals
  positives: string[]; // positive signals
  identifiedLab: string | null;
  identifiedCompound: string | null;
  identifiedDate: string | null;
}

const KNOWN_LABS = [
  "Janoshik",
  "Janoshik Analytical",
  "Anresco",
  "Pyrum",
  "Pyrum Lab",
  "CDN Bio",
  "Aplegen",
  "Eurofins",
  "Avitech",
  "Citizen Health",
];

const COMPOUND_HINTS = [
  "BPC-157",
  "BPC 157",
  "TB-500",
  "TB 500",
  "CJC-1295",
  "CJC 1295",
  "Ipamorelin",
  "Tesamorelin",
  "Sermorelin",
  "GHRP-2",
  "GHRP-6",
  "MK-677",
  "Ibutamoren",
  "MOTS-c",
  "Epithalon",
  "Selank",
  "Semax",
  "Thymalin",
  "Thymosin",
  "GHK-Cu",
  "PT-141",
  "Bremelanotide",
  "Melanotan",
  "AOD-9604",
  "AOD 9604",
];

export function analyzeCoaText(text: string): CoaAnalysis {
  const fields: CoaField[] = [];
  const flags: string[] = [];
  const positives: string[] = [];

  const lower = text.toLowerCase();

  // 1) HPLC purity
  const hplcMatch =
    text.match(/HPLC[^%]*?(\d{2,3}\.?\d?)\s*%/i) ||
    text.match(/(?:assay|purity)[^%]{0,30}(\d{2,3}\.?\d?)\s*%/i);
  if (hplcMatch) {
    const num = parseFloat(hplcMatch[1]);
    fields.push({
      key: "hplc_purity",
      label: "HPLC purity",
      rawSnippet: hplcMatch[0].trim(),
      value: `${num}%`,
      numeric: num,
      good: num >= 98,
      explainer:
        "High-Performance Liquid Chromatography measures how much of the sample is the target peptide. Research-grade peptides should report ≥98%. Below 95% is a red flag.",
    });
    if (num >= 99) positives.push(`HPLC purity ${num}% — excellent.`);
    else if (num >= 98) positives.push(`HPLC purity ${num}% — research-grade.`);
    else flags.push(`HPLC purity only ${num}% — below research-grade threshold.`);
  } else {
    flags.push("No HPLC purity result found. Without it, the COA is incomplete.");
  }

  // 2) Mass spectrometry confirmation
  if (/mass\s*spec|mass\s*spectrometry|MALDI|ESI|m\/z/i.test(text)) {
    const snip = text.match(/.{0,30}(mass\s*spec|MALDI|ESI|m\/z).{0,30}/i)?.[0];
    fields.push({
      key: "mass_spec",
      label: "Mass spectrometry",
      rawSnippet: (snip ?? "").trim(),
      value: "Confirmed",
      good: true,
      explainer:
        "MS confirms the molecular weight matches the expected sequence. Without MS, you can't be sure HPLC didn't just report a related impurity at the same retention time.",
    });
    positives.push("Mass spectrometry confirmation present.");
  } else {
    flags.push("No mass spectrometry confirmation. HPLC alone can be fooled by isomers.");
  }

  // 3) Water content (Karl Fischer)
  const waterMatch = text.match(
    /(?:water\s*content|karl\s*fischer)[^%]{0,30}(\d{1,2}\.?\d?)\s*%/i,
  );
  if (waterMatch) {
    const num = parseFloat(waterMatch[1]);
    fields.push({
      key: "water_content",
      label: "Water / moisture content",
      rawSnippet: waterMatch[0].trim(),
      value: `${num}%`,
      numeric: num,
      good: num <= 10,
      explainer:
        "How much of the dry weight is residual water. >10% is a sign of poor lyophilization and means you're paying for water by mass, not peptide.",
    });
    if (num > 10) flags.push(`Water content ${num}% — high (you're paying for water).`);
    else positives.push(`Water content ${num}% — normal.`);
  }

  // 4) Peptide content (true mg of peptide per vial after subtracting water/counter-ions)
  const pcMatch = text.match(
    /peptide\s*content[^%]{0,30}(\d{2,3}\.?\d?)\s*%/i,
  );
  if (pcMatch) {
    const num = parseFloat(pcMatch[1]);
    fields.push({
      key: "peptide_content",
      label: "Peptide content (true)",
      rawSnippet: pcMatch[0].trim(),
      value: `${num}%`,
      numeric: num,
      good: num >= 80,
      explainer:
        "After subtracting water and counter-ions, what fraction of the powder is actual peptide. A vial labelled '5 mg' might only contain ~4 mg of peptide if peptide content is 80%.",
    });
    if (num < 80) flags.push(`Peptide content only ${num}% — vial has less actual peptide than the label suggests.`);
    else positives.push(`Peptide content ${num}%.`);
  }

  // 5) Sequence printed
  if (/sequence\s*[:\-]/i.test(text)) {
    fields.push({
      key: "sequence",
      label: "Amino acid sequence printed",
      rawSnippet: "Sequence:",
      value: "Yes",
      good: true,
      explainer:
        "A COA that prints the actual amino acid sequence shows the lab knows what they tested. Worth verifying it matches the published sequence.",
    });
    positives.push("Amino acid sequence printed.");
  }

  // 6) Lab name detection
  let identifiedLab: string | null = null;
  for (const lab of KNOWN_LABS) {
    if (lower.includes(lab.toLowerCase())) {
      identifiedLab = lab;
      break;
    }
  }
  if (identifiedLab) {
    fields.push({
      key: "lab",
      label: "Testing laboratory",
      rawSnippet: identifiedLab,
      value: identifiedLab,
      good: true,
      explainer:
        "A named, third-party analytical lab. Independent testing is the strongest trust signal. Vendor-internal QC alone is much weaker.",
    });
    positives.push(`Tested by ${identifiedLab} (third-party).`);
  } else {
    flags.push("No recognized third-party lab name found. Vendor-internal QC is much weaker than independent testing.");
  }

  // 7) Lot / batch
  const lotMatch = text.match(/(?:lot|batch)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9-]{4,})/i);
  if (lotMatch) {
    fields.push({
      key: "lot",
      label: "Batch / lot number",
      rawSnippet: lotMatch[0].trim(),
      value: lotMatch[1],
      good: true,
      explainer:
        "A specific batch identifier ties this COA to a specific production run. Without one, you can't prove the COA matches the vial in your hand.",
    });
    positives.push(`Batch identifier: ${lotMatch[1]}.`);
  } else {
    flags.push("No batch / lot number — the COA can't be tied to a specific vial.");
  }

  // 8) Date
  let identifiedDate: string | null = null;
  const dateMatch =
    text.match(/(?:date|tested|issued|reported)[^\d]{0,15}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i) ||
    text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    identifiedDate = dateMatch[1];
    const ts = parseDateLoose(identifiedDate);
    const eighteenMonthsAgo = Date.now() - 18 * 30 * 24 * 3600 * 1000;
    const fresh: boolean | null = ts === null ? null : ts > eighteenMonthsAgo;
    fields.push({
      key: "date",
      label: "COA date",
      rawSnippet: dateMatch[0].trim(),
      value: identifiedDate,
      good: fresh,
      explainer:
        "Older COAs may not reflect the current batch. Look for a date within the last 18 months. Vendors often re-use COAs across batches — that's not OK.",
    });
    if (fresh) positives.push(`COA dated within the last 18 months.`);
    else flags.push(`COA appears older than 18 months — may not reflect your batch.`);
  }

  // 9) Compound identified
  let identifiedCompound: string | null = null;
  for (const c of COMPOUND_HINTS) {
    if (text.includes(c)) {
      identifiedCompound = c;
      break;
    }
  }

  // Trust score
  let score = 0;
  const hplc = fields.find((f) => f.key === "hplc_purity");
  if (hplc?.good) score += 25;
  else if (hplc) score += 10;
  if (fields.some((f) => f.key === "mass_spec")) score += 20;
  if (fields.some((f) => f.key === "water_content" && f.good)) score += 10;
  if (fields.some((f) => f.key === "peptide_content" && f.good)) score += 15;
  if (fields.some((f) => f.key === "sequence")) score += 5;
  if (fields.some((f) => f.key === "lab" && f.good)) score += 15;
  if (fields.some((f) => f.key === "lot")) score += 5;
  if (fields.some((f) => f.key === "date" && f.good)) score += 5;

  return {
    fields,
    trustScore: Math.min(100, score),
    flags,
    positives,
    identifiedLab,
    identifiedCompound,
    identifiedDate,
  };
}

function parseDateLoose(s: string): number | null {
  // Accept 2024-09-15 or 09/15/2024 or 15-09-2024 — best-effort.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);
  const us = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(s);
  if (us) {
    let yr = +us[3];
    if (yr < 100) yr += 2000;
    return Date.UTC(yr, +us[1] - 1, +us[2]);
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}
