/**
 * Self-traffic exclusion for GA4 reports.
 *
 * Background: until GA4 Admin's "Internal Traffic" filter is wired
 * up (which requires UI work and can't be done via the Data API),
 * our reports include developer/QA traffic alongside real visitors.
 * This produces false positives like "first ATC today!" when in
 * fact the dev was clicking through their own deploy.
 *
 * This module returns a GA4 dimensionFilter expression that EXCLUDES
 * sessions matching any of the SELF_TRAFFIC_RULES. Each rule is an
 * AND-group of soft-fingerprint criteria — keep the rules tight so
 * we don't accidentally wipe legitimate traffic. The rules are
 * informed by the device × city × source/medium tuples we observe
 * during dev/QA passes.
 *
 * To use:
 *   const filter = ga4WithoutSelfTraffic({ baseFilter });
 *   // pass `filter` as the dimensionFilter on a runReport call
 *
 * Long-term: replicate these rules in GA4 Admin → Data Settings →
 * Data Filters as `traffic_type = internal` so the GA4 web UI is
 * also clean. See ADS-PLAYBOOK.md ("Self-traffic exclusion").
 */

type SelfRule = {
  /** Human-readable label for logs / debugging */
  label: string;
  /** Optional country (e.g. "Brazil"). Empty = any. */
  country?: string;
  /** Optional city (e.g. "Rio de Janeiro"). Empty = any. */
  city?: string;
  /** Optional sessionMedium values to scope to (e.g. ["hero_cta"]). */
  sessionMediums?: string[];
  /** Optional sessionSource values (e.g. ["tools"]). */
  sessionSources?: string[];
  /** Optional deviceCategory values. */
  deviceCategories?: ("mobile" | "desktop" | "tablet")[];
};

/**
 * Known self-traffic patterns. Keep this list narrow — each rule
 * should describe a SPECIFIC dev/QA fingerprint, not a broad pattern
 * that could swallow real traffic.
 */
export const SELF_TRAFFIC_RULES: SelfRule[] = [
  {
    // The blanket rule. The developer (Tomas) lives in Rio de Janeiro
    // and is the only known person who tests this site from there.
    // Both campaigns C1 (removed 2026-05-10) and C2 are geo-targeted
    // to US-only, so legitimate paid traffic from Rio is impossible
    // by configuration. The store is not advertised in Brazil, and
    // peptide regulation in Brazil makes organic Brazilian buyers
    // extremely unlikely. Therefore: ANY session originating in Rio
    // de Janeiro is treated as self-traffic, regardless of source/
    // medium/device.
    //
    // History of this rule:
    //   v1 (initial): Rio + mobile + sessionMedium=hero_cta + sessionSource=tools.
    //                 Missed sessions where medium was "hero" instead of "hero_cta".
    //   v2 (2026-05-09): Added "hero" to sessionMediums.
    //   v3 (2026-05-09): Added a second rule for direct/(not set)
    //                    Rio visits (typed URLs, bookmarks).
    //   v4 (2026-05-11): The day after C2 resumed, the dev clicked
    //                    their own Google Ads link from Rio to QA
    //                    the funnel. GA4 attributed those as
    //                    google/cpc, neither prior rule caught them,
    //                    and the 2 self-clicks produced 2 ATCs +
    //                    1 checkout_view that almost got celebrated
    //                    as "first conversions ever!". Replaced the
    //                    narrow per-source rules with this single
    //                    blanket "anything from Rio" rule.
    //
    // Risk of false-negatives (swallowing real traffic): essentially
    // zero given the targeting + business reality.
    label: "Tomas — any traffic from Rio de Janeiro (developer location)",
    country: "Brazil",
    city: "Rio de Janeiro",
  },
];

/* ── GA4 filter-expression builders ─────────────────────────────────── */

type Filter = Record<string, unknown>;

function ruleAsAndGroup(r: SelfRule): Filter {
  const exprs: Filter[] = [];
  if (r.country)
    exprs.push({ filter: { fieldName: "country", stringFilter: { matchType: "EXACT", value: r.country } } });
  if (r.city)
    exprs.push({ filter: { fieldName: "city", stringFilter: { matchType: "EXACT", value: r.city } } });
  if (r.sessionMediums?.length)
    exprs.push({ filter: { fieldName: "sessionMedium", inListFilter: { values: r.sessionMediums } } });
  if (r.sessionSources?.length)
    exprs.push({ filter: { fieldName: "sessionSource", inListFilter: { values: r.sessionSources } } });
  if (r.deviceCategories?.length)
    exprs.push({ filter: { fieldName: "deviceCategory", inListFilter: { values: r.deviceCategories } } });
  return exprs.length === 1 ? exprs[0] : { andGroup: { expressions: exprs } };
}

/**
 * Build an OR-group of all self-traffic rules. The result is the
 * "this session is internal" condition; wrap it with notExpression
 * to exclude.
 */
export function selfTrafficOrGroup(): Filter | null {
  if (SELF_TRAFFIC_RULES.length === 0) return null;
  if (SELF_TRAFFIC_RULES.length === 1) return ruleAsAndGroup(SELF_TRAFFIC_RULES[0]);
  return {
    orGroup: { expressions: SELF_TRAFFIC_RULES.map(ruleAsAndGroup) },
  };
}

/**
 * Wrap a base filter so the report excludes self-traffic. Pass `null`
 * (or omit) if the base report has no other filter.
 *
 *   const filter = ga4WithoutSelfTraffic({
 *     baseFilter: { filter: { fieldName: "eventName", ... } },
 *   });
 */
export function ga4WithoutSelfTraffic(args: { baseFilter?: Filter | null } = {}): Filter | null {
  const base = args.baseFilter ?? null;
  const self = selfTrafficOrGroup();
  if (!self) return base;
  const notSelf: Filter = { notExpression: self };
  if (!base) return notSelf;
  return { andGroup: { expressions: [base, notSelf] } };
}
