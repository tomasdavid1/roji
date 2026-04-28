/**
 * Google Ads API integration.
 *
 * - Real API calls when GOOGLE_ADS_* env vars are present.
 * - Mock data otherwise so the dashboard runs out-of-the-box.
 *
 * Server-only. Never import this from a client component.
 */

import "server-only";
import {
  GoogleAdsApi,
  Customer,
  enums,
  ResourceNames,
} from "google-ads-api";
import {
  classifySearchTerm,
  type NegativeKeywordSpec,
} from "./negative-keywords";

const REQUIRED_ENV = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
] as const;

export function isLive(): boolean {
  return REQUIRED_ENV.every((k) => !!process.env[k]);
}

export type ApiMode = "mock" | "test" | "live";

/**
 * Best-effort runtime mode detection. We can't ask Google "is my token in
 * test mode?" without making a call, so this is heuristic: if no creds, we
 * say "mock"; otherwise "live" until a real call returns a known test-mode
 * error (which `wrapApiCall` flips to "test"). This is purely for UI hints.
 */
let _modeHint: ApiMode | null = null;
export function apiMode(): ApiMode {
  if (!isLive()) return "mock";
  return _modeHint ?? "live";
}

function errMsg(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  return JSON.stringify(err).toLowerCase();
}

function isTestModeError(err: unknown): boolean {
  const msg = errMsg(err);
  return (
    msg.includes("developer_token_not_approved") ||
    msg.includes("test_accounts_only") ||
    msg.includes("not approved for production")
  );
}

function isPermissionError(err: unknown): boolean {
  const msg = errMsg(err);
  return (
    msg.includes("user_permission_denied") ||
    msg.includes("not_adwords_user") ||
    msg.includes("customer_not_enabled") ||
    msg.includes("customer_not_found")
  );
}

/**
 * Wrap a Google Ads call so failures become clear, actionable errors
 * and update the mode hint for the UI.
 */
async function wrapApiCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const mcc = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    if (isTestModeError(e)) {
      _modeHint = "test";
      throw new Error(
        `[${label}] Developer token is in TEST mode and customer ${customerId} is a production account. Apply for Basic Access at https://ads.google.com/aw/apicenter (apply from the manager account ${mcc ?? "<none set>"}).`,
      );
    }
    if (isPermissionError(e)) {
      throw new Error(
        `[${label}] Permission denied for customer ${customerId}${mcc ? ` via manager ${mcc}` : ""}. Check that (a) ${customerId} is linked under the MCC in Google Ads → Account access → Sub-accounts, and (b) the OAuth-authorized user has access to the MCC. Original: ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
    throw e;
  }
}

let _client: GoogleAdsApi | null = null;
let _customer: Customer | null = null;

function client(): GoogleAdsApi {
  if (_client) return _client;
  _client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  return _client;
}

function customer(): Customer {
  if (_customer) return _customer;
  _customer = client().Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  });
  return _customer;
}

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

export type DateRange =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_14_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH";

export interface CampaignRow {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
  impressions: number;
  clicks: number;
  cost_usd: number;
  conversions: number;
  cost_per_conversion_usd: number;
}

export interface KeywordRow {
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  keyword_text: string;
  match_type: string;
  impressions: number;
  clicks: number;
  cost_usd: number;
  conversions: number;
}

export interface CreateCampaignInput {
  name: string;
  daily_budget_usd: number;
}

/* -------------------------------------------------------------------------- */
/* Mock data                                                                  */
/* -------------------------------------------------------------------------- */

const MOCK_CAMPAIGNS: CampaignRow[] = [
  {
    id: "11111111111",
    name: "Protocol Engine — Search (US)",
    status: "ENABLED",
    impressions: 48210,
    clicks: 1932,
    cost_usd: 1247.55,
    conversions: 184,
    cost_per_conversion_usd: 6.78,
  },
  {
    id: "22222222222",
    name: "Brand Protect — roji peptides",
    status: "ENABLED",
    impressions: 5120,
    clicks: 412,
    cost_usd: 87.31,
    conversions: 38,
    cost_per_conversion_usd: 2.3,
  },
  {
    id: "33333333333",
    name: "Research Calculator — Phrase Match Test",
    status: "PAUSED",
    impressions: 12080,
    clicks: 245,
    cost_usd: 198.4,
    conversions: 9,
    cost_per_conversion_usd: 22.04,
  },
];

const MOCK_KEYWORDS: KeywordRow[] = [
  {
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    keyword_text: "research protocol calculator",
    match_type: "PHRASE",
    impressions: 14210,
    clicks: 612,
    cost_usd: 384.21,
    conversions: 71,
  },
  {
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    keyword_text: "compound research framework",
    match_type: "BROAD",
    impressions: 9120,
    clicks: 318,
    cost_usd: 245.65,
    conversions: 38,
  },
  {
    campaign_id: "22222222222",
    campaign_name: "Brand Protect — roji peptides",
    ad_group_id: "ag2",
    ad_group_name: "Brand",
    keyword_text: "roji peptides",
    match_type: "EXACT",
    impressions: 4012,
    clicks: 387,
    cost_usd: 78.12,
    conversions: 36,
  },
];

/* -------------------------------------------------------------------------- */
/* Read API                                                                   */
/* -------------------------------------------------------------------------- */

function microsToUsd(micros: number | string | null | undefined): number {
  if (!micros) return 0;
  return Number(micros) / 1_000_000;
}

function statusFromEnum(value: number | string | null | undefined): CampaignRow["status"] {
  if (value === enums.CampaignStatus.ENABLED || value === "ENABLED") return "ENABLED";
  if (value === enums.CampaignStatus.PAUSED || value === "PAUSED") return "PAUSED";
  if (value === enums.CampaignStatus.REMOVED || value === "REMOVED") return "REMOVED";
  return "UNKNOWN";
}

export async function getCampaignPerformance(
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<CampaignRow[]> {
  if (!isLive()) {
    return MOCK_CAMPAIGNS;
  }
  const c = customer();
  const rows = await wrapApiCall("getCampaignPerformance", () => c.report({
    entity: "campaign",
    attributes: ["campaign.id", "campaign.name", "campaign.status"],
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
      "metrics.cost_per_conversion",
    ],
    from_date: undefined,
    to_date: undefined,
    date_constant: dateRange,
  } as never));

  return rows.map((rawRow): CampaignRow => {
    const row = rawRow as unknown as Record<string, Record<string, unknown>>;
    const camp = row.campaign ?? {};
    const m = row.metrics ?? {};
    return {
      id: String(camp.id ?? ""),
      name: String(camp.name ?? ""),
      status: statusFromEnum(camp.status as number | string | undefined),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      cost_usd: microsToUsd(m.cost_micros as number),
      conversions: Number(m.conversions ?? 0),
      cost_per_conversion_usd: microsToUsd(m.cost_per_conversion as number),
    };
  });
}

export async function getKeywordPerformance(
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<KeywordRow[]> {
  if (!isLive()) {
    return MOCK_KEYWORDS;
  }
  const c = customer();
  const rows = await wrapApiCall("getKeywordPerformance", () => c.report({
    entity: "keyword_view",
    attributes: [
      "campaign.id",
      "campaign.name",
      "ad_group.id",
      "ad_group.name",
      "ad_group_criterion.keyword.text",
      "ad_group_criterion.keyword.match_type",
    ],
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
    ],
    date_constant: dateRange,
  } as never));

  return rows.map((rawRow): KeywordRow => {
    const row = rawRow as unknown as Record<string, Record<string, unknown>>;
    const camp = row.campaign ?? {};
    const ag = row.ad_group ?? {};
    const crit = (row.ad_group_criterion ?? {}) as Record<string, Record<string, unknown>>;
    const kw = (crit.keyword ?? {}) as Record<string, unknown>;
    const m = row.metrics ?? {};
    return {
      campaign_id: String(camp.id ?? ""),
      campaign_name: String(camp.name ?? ""),
      ad_group_id: String(ag.id ?? ""),
      ad_group_name: String(ag.name ?? ""),
      keyword_text: String(kw.text ?? ""),
      match_type: String(kw.match_type ?? ""),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      cost_usd: microsToUsd(m.cost_micros as number),
      conversions: Number(m.conversions ?? 0),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Write API                                                                  */
/* -------------------------------------------------------------------------- */

export async function setCampaignStatus(
  campaignId: string,
  status: "ENABLED" | "PAUSED",
): Promise<{ ok: true }> {
  if (!isLive()) {
    return { ok: true };
  }
  const c = customer();
  const resourceName = ResourceNames.campaign(
    process.env.GOOGLE_ADS_CUSTOMER_ID!,
    campaignId,
  );
  await wrapApiCall("setCampaignStatus", () => c.campaigns.update([
    {
      resource_name: resourceName,
      status:
        status === "ENABLED"
          ? enums.CampaignStatus.ENABLED
          : enums.CampaignStatus.PAUSED,
    },
  ]));
  return { ok: true };
}

export async function setCampaignBudget(
  campaignId: string,
  dailyBudgetUsd: number,
): Promise<{ ok: true }> {
  if (!isLive()) {
    return { ok: true };
  }
  const c = customer();

  // Look up the campaign to get its budget resource.
  const rows = await wrapApiCall("setCampaignBudget.query", () => c.query(`
	SELECT campaign.id, campaign_budget.resource_name
	FROM campaign
	WHERE campaign.id = ${Number(campaignId)}
	LIMIT 1
  `));
  const row = rows[0] as
    | { campaign_budget?: { resource_name?: string } }
    | undefined;
  const budgetResource = row?.campaign_budget?.resource_name;
  if (!budgetResource) {
    throw new Error(`No campaign budget found for campaign ${campaignId}`);
  }

  await wrapApiCall("setCampaignBudget.update", () => c.campaignBudgets.update([
    {
      resource_name: budgetResource,
      amount_micros: Math.round(dailyBudgetUsd * 1_000_000),
    },
  ]));
  return { ok: true };
}

/**
 * Create a Search-only campaign targeting US, with the Maximize Conversions
 * bid strategy and the supplied daily budget.
 *
 * Notes:
 * - This creates the budget + campaign. Ad groups, keywords, and ad copy
 *   are *not* created here — those should be added via the dashboard's
 *   keyword/ad-creation flows (which run validateAdCopy first).
 * - We intentionally do not enable the Display Network.
 */
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ ok: true; campaign_id?: string; budget_id?: string }> {
  if (!isLive()) {
    return { ok: true, campaign_id: "mock-" + Date.now() };
  }
  const c = customer();

  const budgetResp = await wrapApiCall("createCampaign.budget", () => c.campaignBudgets.create([
    {
      name: `${input.name} — budget`,
      amount_micros: Math.round(input.daily_budget_usd * 1_000_000),
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false,
    },
  ]));

  const budgetResource =
    (budgetResp as { results?: Array<{ resource_name?: string }> })
      .results?.[0]?.resource_name ?? "";

  const campaignResp = await wrapApiCall("createCampaign.campaign", () => c.campaigns.create([
    {
      name: input.name,
      status: enums.CampaignStatus.PAUSED,
      advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
      manual_cpc: undefined,
      maximize_conversions: {},
      campaign_budget: budgetResource,
      network_settings: {
        target_google_search: true,
        target_search_network: false,
        target_content_network: false,
        target_partner_search_network: false,
      },
    },
  ]));

  const campaignResource =
    (campaignResp as { results?: Array<{ resource_name?: string }> })
      .results?.[0]?.resource_name ?? "";

  return {
    ok: true,
    campaign_id: campaignResource.split("/").pop(),
    budget_id: budgetResource.split("/").pop(),
  };
}

/* -------------------------------------------------------------------------- */
/* Search-terms mining                                                        */
/* -------------------------------------------------------------------------- */

export interface SearchTermRow {
  search_term: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  cost_usd: number;
  conversions: number;
  /** Search-term match status: ADDED (became a keyword), EXCLUDED (already
   *  a negative), NONE (matched a broad/phrase keyword but not added). */
  status: "ADDED" | "EXCLUDED" | "NONE" | "UNKNOWN";
}

export interface RiskySearchTerm extends SearchTermRow {
  matched_negatives: NegativeKeywordSpec[];
  /** Already added as a campaign-level negative? Set true after adding. */
  already_negated: boolean;
}

const MOCK_SEARCH_TERMS: SearchTermRow[] = [
  // Safe terms — should NOT be flagged
  {
    search_term: "free research protocol builder",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    impressions: 432, clicks: 38, cost_usd: 24.18, conversions: 6, status: "NONE",
  },
  {
    search_term: "biohacking calculator online",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    impressions: 318, clicks: 21, cost_usd: 17.03, conversions: 3, status: "NONE",
  },
  // Risky terms — SHOULD be flagged
  {
    search_term: "buy bpc 157 online cheap",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    impressions: 89, clicks: 12, cost_usd: 18.40, conversions: 0, status: "NONE",
  },
  {
    search_term: "ozempic vs peptide stack",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag1",
    ad_group_name: "Calculator",
    impressions: 142, clicks: 8, cost_usd: 11.20, conversions: 0, status: "NONE",
  },
  {
    search_term: "tb 500 injection dosing for humans",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag2",
    ad_group_name: "Compound Education",
    impressions: 67, clicks: 4, cost_usd: 6.18, conversions: 0, status: "NONE",
  },
  {
    search_term: "research compound steroid stack",
    campaign_id: "11111111111",
    campaign_name: "Protocol Engine — Search (US)",
    ad_group_id: "ag2",
    ad_group_name: "Compound Education",
    impressions: 41, clicks: 2, cost_usd: 3.10, conversions: 0, status: "NONE",
  },
];

/**
 * Pull the search-terms report (what users actually typed that triggered
 * one of our keywords) for the given date range.
 *
 * Note: search_term_view excludes data older than 30 days per Google Ads policy.
 */
export async function getSearchTermsReport(
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<SearchTermRow[]> {
  if (!isLive()) return MOCK_SEARCH_TERMS;
  const c = customer();
  const rows = await wrapApiCall("getSearchTermsReport", () => c.report({
    entity: "search_term_view",
    attributes: [
      "search_term_view.search_term",
      "search_term_view.status",
      "campaign.id",
      "campaign.name",
      "ad_group.id",
      "ad_group.name",
    ],
    metrics: [
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
    ],
    date_constant: dateRange,
  } as never));

  return rows.map((rawRow): SearchTermRow => {
    const row = rawRow as unknown as Record<string, Record<string, unknown>>;
    const stv = row.search_term_view ?? {};
    const camp = row.campaign ?? {};
    const ag = row.ad_group ?? {};
    const m = row.metrics ?? {};
    return {
      search_term: String(stv.search_term ?? ""),
      campaign_id: String(camp.id ?? ""),
      campaign_name: String(camp.name ?? ""),
      ad_group_id: String(ag.id ?? ""),
      ad_group_name: String(ag.name ?? ""),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      cost_usd: microsToUsd(m.cost_micros as number),
      conversions: Number(m.conversions ?? 0),
      status: (String(stv.status ?? "UNKNOWN").toUpperCase() as SearchTermRow["status"]),
    };
  });
}

/**
 * Pull every campaign-level negative keyword currently on the account.
 * Used to dedupe before adding new negatives.
 */
export async function getCampaignNegativeKeywords(): Promise<
  Array<{ campaign_id: string; text: string; match_type: string }>
> {
  if (!isLive()) {
    return [
      { campaign_id: "11111111111", text: "weight loss", match_type: "PHRASE" },
    ];
  }
  const c = customer();
  const rows = await wrapApiCall("getCampaignNegativeKeywords", () => c.query(`
    SELECT
      campaign.id,
      campaign_criterion.keyword.text,
      campaign_criterion.keyword.match_type
    FROM campaign_criterion
    WHERE campaign_criterion.negative = TRUE
      AND campaign_criterion.type = KEYWORD
  `));
  return (rows as unknown as Array<Record<string, Record<string, unknown>>>).map(
    (row) => {
      const camp = row.campaign ?? {};
      const crit = (row.campaign_criterion ?? {}) as Record<string, Record<string, unknown>>;
      const kw = (crit.keyword ?? {}) as Record<string, unknown>;
      return {
        campaign_id: String(camp.id ?? ""),
        text: String(kw.text ?? ""),
        match_type: String(kw.match_type ?? ""),
      };
    },
  );
}

/**
 * Cross the search-terms report against the master negative-keyword list
 * and return only the risky ones, marked with whether they're already
 * negated on the matched campaign.
 */
export async function identifyRiskySearchTerms(
  dateRange: DateRange = "LAST_30_DAYS",
): Promise<RiskySearchTerm[]> {
  const [terms, existingNegatives] = await Promise.all([
    getSearchTermsReport(dateRange),
    getCampaignNegativeKeywords(),
  ]);
  // Build a quick lookup: campaign -> set of normalized negated terms
  const negByCampaign = new Map<string, Set<string>>();
  for (const n of existingNegatives) {
    const key = n.campaign_id;
    if (!negByCampaign.has(key)) negByCampaign.set(key, new Set());
    negByCampaign.get(key)!.add(n.text.toLowerCase().trim());
  }

  const out: RiskySearchTerm[] = [];
  for (const t of terms) {
    const { risky, matches } = classifySearchTerm(t.search_term);
    if (!risky) continue;
    const negated = negByCampaign.get(t.campaign_id);
    const alreadyNegated = matches.some(
      (m) => negated?.has(m.term.toLowerCase().trim()) ?? false,
    );
    out.push({
      ...t,
      matched_negatives: matches,
      already_negated: alreadyNegated,
    });
  }
  return out;
}

/**
 * Add the given negative keywords to a campaign as campaign-level
 * negative criteria. Idempotent: silently skips terms that already exist
 * on the campaign.
 *
 * Returns the number of negatives actually added.
 */
export async function addCampaignNegativeKeywords(
  campaignId: string,
  negatives: NegativeKeywordSpec[],
): Promise<{ added: number; skipped: number }> {
  if (negatives.length === 0) return { added: 0, skipped: 0 };
  if (!isLive()) {
    return { added: negatives.length, skipped: 0 };
  }
  const c = customer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  // Pull existing negatives for this campaign so we can dedupe.
  const existing = await getCampaignNegativeKeywords();
  const existingForCampaign = new Set(
    existing
      .filter((e) => e.campaign_id === campaignId)
      .map((e) => `${e.text.toLowerCase().trim()}|${e.match_type}`),
  );

  const matchTypeMap: Record<NegativeKeywordSpec["match"], number> = {
    broad: enums.KeywordMatchType.BROAD,
    phrase: enums.KeywordMatchType.PHRASE,
    exact: enums.KeywordMatchType.EXACT,
  };

  const operations: Array<Record<string, unknown>> = [];
  let skipped = 0;
  const campaignResource = ResourceNames.campaign(customerId, campaignId);

  for (const n of negatives) {
    const key = `${n.term.toLowerCase().trim()}|${n.match.toUpperCase()}`;
    if (existingForCampaign.has(key)) {
      skipped++;
      continue;
    }
    operations.push({
      campaign: campaignResource,
      negative: true,
      keyword: {
        text: n.term,
        match_type: matchTypeMap[n.match],
      },
    });
  }

  if (operations.length === 0) return { added: 0, skipped };

  await wrapApiCall("addCampaignNegativeKeywords", () =>
    c.campaignCriteria.create(operations as never),
  );
  return { added: operations.length, skipped };
}

/* -------------------------------------------------------------------------- */
/* Ad disapproval scan                                                        */
/* -------------------------------------------------------------------------- */

export interface DisapprovedAd {
  ad_id: string;
  ad_group_id: string;
  ad_group_name: string;
  campaign_id: string;
  campaign_name: string;
  approval_status: string;
  policy_topics: string[];
  ad_strength: string;
  type: string;
}

const MOCK_DISAPPROVED: DisapprovedAd[] = [
  // Empty by default — disapprovals are an alert state, not a steady state.
];

export async function getDisapprovedAds(): Promise<DisapprovedAd[]> {
  if (!isLive()) return MOCK_DISAPPROVED;
  const c = customer();
  const rows = await wrapApiCall("getDisapprovedAds", () => c.query(`
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.policy_topic_entries,
      ad_group_ad.ad_strength,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name
    FROM ad_group_ad
    WHERE ad_group_ad.policy_summary.approval_status IN (DISAPPROVED, AREA_OF_INTEREST_ONLY)
      AND ad_group_ad.status != REMOVED
  `));

  return (rows as unknown as Array<Record<string, Record<string, unknown>>>).map(
    (row) => {
      const adGroupAd = (row.ad_group_ad ?? {}) as Record<string, Record<string, unknown>>;
      const ad = (adGroupAd.ad ?? {}) as Record<string, unknown>;
      const policy = (adGroupAd.policy_summary ?? {}) as Record<string, unknown>;
      const ag = row.ad_group ?? {};
      const camp = row.campaign ?? {};
      const topics = (policy.policy_topic_entries as Array<Record<string, unknown>> | undefined) ?? [];
      return {
        ad_id: String(ad.id ?? ""),
        ad_group_id: String(ag.id ?? ""),
        ad_group_name: String(ag.name ?? ""),
        campaign_id: String(camp.id ?? ""),
        campaign_name: String(camp.name ?? ""),
        approval_status: String(policy.approval_status ?? "UNKNOWN"),
        policy_topics: topics.map((t) => String(t.topic ?? "unknown")),
        ad_strength: String(adGroupAd.ad_strength ?? ""),
        type: String(ad.type ?? ""),
      };
    },
  );
}

/**
 * Pause every disapproved ad. Per the strategy doc:
 *   "auto-pause disapproved ad to prevent account contamination"
 *
 * Returns how many were paused.
 */
export async function pauseDisapprovedAds(): Promise<{ paused: number }> {
  const disapproved = await getDisapprovedAds();
  if (disapproved.length === 0) return { paused: 0 };
  if (!isLive()) return { paused: disapproved.length };
  const c = customer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const operations = disapproved.map((d) => ({
    resource_name: ResourceNames.adGroupAd(customerId, d.ad_group_id, d.ad_id),
    status: enums.AdGroupAdStatus.PAUSED,
  }));
  await wrapApiCall("pauseDisapprovedAds", () =>
    c.adGroupAds.update(operations as never),
  );
  return { paused: operations.length };
}
