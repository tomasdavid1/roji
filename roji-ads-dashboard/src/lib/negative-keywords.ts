/**
 * Master list of negative keywords for the Roji Google Ads account.
 *
 * Source: ROJI PEPTIDES — Google Ads Strategy & Campaign Blueprint
 * (Campaign 1, "Negative keywords (CRITICAL)" section).
 *
 * These are the search terms that:
 *   1. Imply a buying / pharmaceutical intent ("buy", "order", "pharmacy"),
 *      which conflicts with our "free tool, not a product" landing page
 *      framing and triggers Google Healthcare-policy review.
 *   2. Reference competing approved drugs (semaglutide, ozempic, etc.) that
 *      attract irrelevant high-CPC traffic.
 *   3. Reference scheduled / banned substances (steroid, HGH).
 *   4. Imply human use (inject, injection, dosing).
 *   5. Imply therapeutic claims (cure, treatment, side effects).
 *
 * The dashboard will:
 *   - On a daily cron, pull the search-terms report and flag any terms that
 *     match these patterns.
 *   - Auto-add flagged terms to each ad group's campaign-level negative list
 *     (only after manual or auto approval, depending on settings).
 *
 * Match types:
 *   - "broad"  → matches as a Google Ads broad-match negative (recommended
 *                for safety; matches close variants).
 *   - "phrase" → matches the exact phrase only.
 *   - "exact"  → matches the exact term only.
 *
 * Per Google Ads policy guidance, broad-match negatives can over-block;
 * use sparingly for ambiguous terms and prefer phrase for safety-critical
 * keywords.
 */

export type NegativeMatchType = "broad" | "phrase" | "exact";

export interface NegativeKeywordSpec {
  term: string;
  match: NegativeMatchType;
  /** Why this term is on the list — surfaced in the dashboard. */
  reason: string;
  /** Bucket for grouping in the UI. */
  category:
    | "purchase_intent"
    | "competing_drug"
    | "scheduled_substance"
    | "human_use"
    | "therapeutic_claim"
    | "irrelevant";
}

export const MASTER_NEGATIVE_KEYWORDS: NegativeKeywordSpec[] = [
  // ---- Purchase intent (anti-pattern: ad-clicker wants to buy NOW) ----
  { term: "buy", match: "broad", reason: "Purchase intent — landing page is a tool, not a product", category: "purchase_intent" },
  { term: "purchase", match: "broad", reason: "Purchase intent", category: "purchase_intent" },
  { term: "order", match: "broad", reason: "Purchase intent", category: "purchase_intent" },
  { term: "cheap", match: "broad", reason: "Discount-seeker, low-quality intent", category: "purchase_intent" },
  { term: "discount", match: "broad", reason: "Discount-seeker", category: "purchase_intent" },
  { term: "coupon", match: "broad", reason: "Discount-seeker", category: "purchase_intent" },
  { term: "for sale", match: "phrase", reason: "Purchase intent", category: "purchase_intent" },
  { term: "price", match: "broad", reason: "Purchase intent — landing page has no pricing", category: "purchase_intent" },
  { term: "cost", match: "broad", reason: "Purchase intent", category: "purchase_intent" },
  { term: "shop", match: "broad", reason: "Purchase intent", category: "purchase_intent" },
  { term: "store", match: "broad", reason: "Purchase intent", category: "purchase_intent" },
  { term: "pharmacy", match: "broad", reason: "Pharma-intent, triggers Healthcare policy", category: "purchase_intent" },

  // ---- Therapeutic / clinical context (Healthcare-policy triggers) ----
  { term: "prescription", match: "broad", reason: "Implies regulated drug use", category: "therapeutic_claim" },
  { term: "doctor", match: "broad", reason: "Medical context — Healthcare policy", category: "therapeutic_claim" },
  { term: "clinic", match: "broad", reason: "Medical context", category: "therapeutic_claim" },
  { term: "treatment", match: "broad", reason: "Therapeutic claim", category: "therapeutic_claim" },
  { term: "therapy", match: "broad", reason: "Therapeutic claim", category: "therapeutic_claim" },
  { term: "cure", match: "broad", reason: "Therapeutic claim", category: "therapeutic_claim" },
  { term: "heal", match: "broad", reason: "Therapeutic claim", category: "therapeutic_claim" },
  { term: "medicine", match: "broad", reason: "Pharma framing", category: "therapeutic_claim" },
  { term: "drug", match: "broad", reason: "Pharma framing", category: "therapeutic_claim" },
  { term: "side effects", match: "phrase", reason: "Implies pharmaceutical context", category: "therapeutic_claim" },
  { term: "safe", match: "broad", reason: "Implies medical-safety question", category: "therapeutic_claim" },
  { term: "dangerous", match: "broad", reason: "Implies medical-safety question", category: "therapeutic_claim" },

  // ---- Human use ----
  { term: "inject", match: "broad", reason: "Implies human injection", category: "human_use" },
  { term: "injection", match: "broad", reason: "Implies human injection", category: "human_use" },
  { term: "syringe", match: "broad", reason: "Implies human injection", category: "human_use" },
  { term: "human use", match: "phrase", reason: "Direct human-use intent — instant policy violation", category: "human_use" },

  // ---- Scheduled / banned substances ----
  { term: "fda approved", match: "phrase", reason: "We cannot claim FDA approval (peptides aren't approved)", category: "scheduled_substance" },
  { term: "steroid", match: "broad", reason: "Schedule III; triggers controlled-substance policy", category: "scheduled_substance" },
  { term: "testosterone", match: "broad", reason: "Schedule III", category: "scheduled_substance" },
  { term: "hgh", match: "broad", reason: "Banned non-prescription substance", category: "scheduled_substance" },
  { term: "growth hormone", match: "phrase", reason: "Banned non-prescription substance", category: "scheduled_substance" },
  { term: "illegal", match: "broad", reason: "Triggers policy review", category: "scheduled_substance" },

  // ---- Competing approved drugs (irrelevant traffic, expensive clicks) ----
  { term: "semaglutide", match: "broad", reason: "Competing drug, off-topic", category: "competing_drug" },
  { term: "ozempic", match: "broad", reason: "Competing drug, off-topic", category: "competing_drug" },
  { term: "wegovy", match: "broad", reason: "Competing drug, off-topic", category: "competing_drug" },
  { term: "tirzepatide", match: "broad", reason: "Competing drug, off-topic", category: "competing_drug" },

  // ---- Irrelevant verticals (avoid wasted spend) ----
  { term: "weight loss", match: "phrase", reason: "Off-topic intent + Healthcare policy", category: "irrelevant" },
  { term: "fat loss", match: "phrase", reason: "Off-topic intent", category: "irrelevant" },
];

/* -------------------------------------------------------------------------- */
/* Matching                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a term for comparison: lowercase + collapse internal whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * True if `searchTerm` would be matched by any of the given negative-keyword
 * specs. Used to identify risky search terms in a search-terms report.
 *
 * Matching semantics deliberately mirror Google Ads:
 *   - broad:  any token of the negative appears anywhere in the search term
 *             (we use word-boundary checks to avoid e.g. "store" matching
 *             "restorative")
 *   - phrase: the negative phrase appears contiguously in the search term
 *   - exact:  the search term equals the negative
 */
export function matchedNegatives(
  searchTerm: string,
  negatives: NegativeKeywordSpec[],
): NegativeKeywordSpec[] {
  const term = normalize(searchTerm);
  const tokens = new Set(term.split(/\s+/).filter(Boolean));
  const out: NegativeKeywordSpec[] = [];

  for (const neg of negatives) {
    const negTerm = normalize(neg.term);
    if (neg.match === "exact") {
      if (term === negTerm) out.push(neg);
      continue;
    }
    if (neg.match === "phrase") {
      // Contiguous-substring match with word boundaries
      const re = new RegExp(`\\b${escapeRegex(negTerm)}\\b`);
      if (re.test(term)) out.push(neg);
      continue;
    }
    // broad: every token of the negative must appear somewhere as a word
    const negTokens = negTerm.split(/\s+/).filter(Boolean);
    const allHit = negTokens.every((t) => tokens.has(t));
    if (allHit) out.push(neg);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convenience: classify a search term against the master list.
 */
export function classifySearchTerm(searchTerm: string): {
  risky: boolean;
  matches: NegativeKeywordSpec[];
} {
  const matches = matchedNegatives(searchTerm, MASTER_NEGATIVE_KEYWORDS);
  return { risky: matches.length > 0, matches };
}
