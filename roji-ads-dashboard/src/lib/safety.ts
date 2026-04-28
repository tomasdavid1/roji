/**
 * Ad-copy safety validator.
 *
 * Google Ads will disapprove any ad referencing peptides, compound names,
 * health claims, or human-use language. This validator runs before any
 * createCampaign / createAd call and short-circuits with a clear error.
 *
 * Update this list when policies change or you discover new flagged terms.
 */

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bpeptide(s)?\b/i, reason: "References 'peptide' (pharma policy trigger)" },
  { pattern: /\bbpc[\s-]?157\b/i, reason: "References compound name BPC-157" },
  { pattern: /\btb[\s-]?500\b/i, reason: "References compound name TB-500" },
  { pattern: /\bcjc[\s-]?1295\b/i, reason: "References compound name CJC-1295" },
  { pattern: /\bipamorelin\b/i, reason: "References compound name Ipamorelin" },
  { pattern: /\bmk[\s-]?677\b/i, reason: "References compound name MK-677" },
  { pattern: /\bibutamoren\b/i, reason: "References compound name Ibutamoren" },
  { pattern: /\bsermorelin\b/i, reason: "References compound name Sermorelin" },
  { pattern: /\bghrh\b/i, reason: "References compound class GHRH" },

  { pattern: /\binject(ion|ions|ing|ed)?\b/i, reason: "Implies human injection" },
  { pattern: /\bdosing\b/i, reason: "Implies human dosing" },
  { pattern: /\bheal(s|ing|ed)?\b/i, reason: "Therapeutic claim ('heal')" },
  { pattern: /\bcure(s|d)?\b/i, reason: "Therapeutic claim ('cure')" },
  { pattern: /\btreat(s|ing|ed|ment)?\b/i, reason: "Therapeutic claim ('treat')" },
  { pattern: /\btherap(y|eutic)\b/i, reason: "Therapeutic language" },
  { pattern: /\bprescription\b/i, reason: "References prescription" },
  { pattern: /\b(weight[\s-]?loss|fat[\s-]?loss)\b/i, reason: "Weight/fat-loss claim" },
  { pattern: /\bmuscle gain(s)?\b/i, reason: "Body-modification claim" },
  { pattern: /\b(anti[\s-]?aging|anti[\s-]?ageing)\b/i, reason: "Anti-aging claim" },
];

export interface SafetyIssue {
  match: string;
  reason: string;
}

export interface SafetyResult {
  ok: boolean;
  issues: SafetyIssue[];
}

/**
 * Validate a single piece of ad copy (headline, description, callout, etc.).
 */
export function validateAdCopy(text: string): SafetyResult {
  const issues: SafetyIssue[] = [];
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      issues.push({ match: m[0], reason });
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Validate any number of fields at once. Returns issues per field that has them.
 */
export function validateAdCopyBatch(
  fields: Record<string, string>,
): Record<string, SafetyResult> {
  const out: Record<string, SafetyResult> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = validateAdCopy(v);
  }
  return out;
}

/**
 * Convenience helper: throw if any field is unsafe.
 * Used by API routes to short-circuit before hitting Google Ads.
 */
export function assertSafeAdCopy(fields: Record<string, string>): void {
  const result = validateAdCopyBatch(fields);
  const failures = Object.entries(result).filter(([, r]) => !r.ok);
  if (failures.length === 0) return;
  const summary = failures
    .map(
      ([field, r]) =>
        `${field}: ${r.issues.map((i) => `"${i.match}" (${i.reason})`).join("; ")}`,
    )
    .join(" | ");
  throw new Error(`Ad copy failed safety validation: ${summary}`);
}
