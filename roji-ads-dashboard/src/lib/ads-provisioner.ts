/**
 * Roji Google Ads blueprint provisioner.
 *
 * Walks a `ResolvedBlueprint` (see ads-blueprint.ts) and creates the
 * matching campaign tree in Google Ads. All resources start PAUSED so a
 * human reviews them in the Ads UI before going live.
 *
 * Idempotency:
 *   - Campaigns and ad groups are looked up by name (with a
 *     `[roji-blueprint]` suffix). If a name already exists, we reuse it
 *     instead of creating a duplicate.
 *   - Keywords / ad-copy variants are *not* deduped within an existing
 *     ad group — the assumption is "if you re-provisioned, you wanted
 *     fresh copy" — but the campaign shell + budget survive.
 *
 * Mock mode:
 *   - When env vars are missing, every call returns deterministic mock
 *     IDs and the dry-run summary still reports realistic counts.
 *
 * Server-only.
 */

import "server-only";

import { enums } from "google-ads-api";

/**
 * Format an error from google-ads-api into a useful string. The library
 * throws plain objects (not Error instances) with an `errors` array of
 * `{ error_code, message, location }` entries — naive `String(err)` on
 * those returns "[object Object]" which is useless in operator logs.
 */
function fmtErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as {
      errors?: Array<{ message?: string; error_code?: unknown; location?: unknown }>;
      message?: string;
    };
    if (Array.isArray(e.errors) && e.errors.length > 0) {
      return e.errors
        .map((sub) => {
          const code = sub.error_code ? JSON.stringify(sub.error_code) : "";
          const loc = sub.location ? ` @ ${JSON.stringify(sub.location)}` : "";
          return `${sub.message ?? "Google Ads error"}${code ? ` [${code}]` : ""}${loc}`;
        })
        .join(" | ");
    }
    if (typeof e.message === "string") return e.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

import {
  type BlueprintAdGroup,
  type BlueprintCampaign,
  type BlueprintSitelink,
  type BlueprintCallout,
  type ResolvedBlueprint,
  type BlueprintRSA,
  type BlueprintKeyword,
  validateBlueprint,
  blueprintStats,
} from "./ads-blueprint";
import { isLive, apiMode } from "./google-ads";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface ProvisionResult {
  mode: "mock" | "live";
  apiMode: "mock" | "test" | "live";
  blueprint: ResolvedBlueprint;
  validation_issues: ReturnType<typeof validateBlueprint>;
  stats: ReturnType<typeof blueprintStats>;
  /** Per-campaign provisioning summary. */
  campaigns: Array<{
    name: string;
    campaign_id: string;
    budget_id: string;
    reused: boolean;
    ad_groups: Array<{
      name: string;
      ad_group_id: string;
      reused: boolean;
      keywords_added: number;
      ads_created: number;
    }>;
    negatives_added: number;
    sitelinks_added: number;
    callouts_added: number;
    demographics_excluded: number;
  }>;
  /** Errors that didn't abort the whole provision (per-resource). */
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Provisioner                                                                 */
/* -------------------------------------------------------------------------- */

export async function provisionBlueprint(
  blueprint: ResolvedBlueprint,
  opts: { dryRun?: boolean } = {},
): Promise<ProvisionResult> {
  const issues = validateBlueprint(blueprint);
  // Only hard errors block provisioning. Warnings (e.g. "protocol", "cycle")
  // are surfaced in the result + dashboard UI but don't abort. Otherwise a
  // single soft-warning term in copy/keywords would brick the provisioner.
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      "Blueprint failed safety validation. Refusing to provision: " +
        errors.map((i) => `${i.field}: "${i.text}" (${i.reason})`).join(" | "),
    );
  }

  const live = isLive() && !opts.dryRun;
  const mode: ProvisionResult["mode"] = live ? "live" : "mock";

  // Surface warnings to the result so the dashboard UI can show them
  // alongside provisioning warnings without conflating the two.
  const warningStrings = issues
    .filter((i) => i.severity === "warning")
    .map((i) => `[validation] ${i.adGroup ?? "?"} / ${i.field}: "${i.text}" — ${i.reason}`);

  const result: ProvisionResult = {
    mode,
    apiMode: apiMode(),
    blueprint,
    validation_issues: issues,
    stats: blueprintStats(blueprint),
    campaigns: [],
    warnings: [...warningStrings],
  };

  for (const c of blueprint.campaigns) {
    try {
      const summary = await provisionCampaign(c, live, result.warnings);
      result.campaigns.push(summary);
    } catch (err) {
      result.warnings.push(
        `[${c.name}] aborted: ${fmtErr(err)}`,
      );
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Campaign-level                                                              */
/* -------------------------------------------------------------------------- */

async function provisionCampaign(
  c: BlueprintCampaign,
  live: boolean,
  warnings: string[],
): Promise<ProvisionResult["campaigns"][number]> {
  const summary: ProvisionResult["campaigns"][number] = {
    name: c.name,
    campaign_id: "",
    budget_id: "",
    reused: false,
    ad_groups: [],
    negatives_added: 0,
    sitelinks_added: 0,
    callouts_added: 0,
    demographics_excluded: 0,
  };

  if (!live) {
    // Deterministic mock IDs from the campaign name so the dry-run UI
    // can show stable identifiers.
    summary.campaign_id = "mock-c-" + slug(c.name);
    summary.budget_id = "mock-b-" + slug(c.name);
  } else {
    const found = await findCampaignByName(c.name);
    if (found) {
      summary.campaign_id = found.id;
      summary.budget_id = found.budget_id;
      summary.reused = true;
    } else {
      const created = await createCampaignShell(c);
      summary.campaign_id = created.campaign_id;
      summary.budget_id = created.budget_id;
    }
  }

  // Negatives at the campaign level
  if (c.negativeKeywords.length > 0) {
    if (!live) {
      summary.negatives_added = c.negativeKeywords.length;
    } else {
      try {
        const added = await addCampaignNegatives(
          summary.campaign_id,
          c.negativeKeywords,
        );
        summary.negatives_added = added;
      } catch (err) {
        warnings.push(
          `[${c.name}] negatives partial failure: ${fmtErr(err)}`,
        );
      }
    }
  }

  // Sitelink extensions
  if (c.sitelinks && c.sitelinks.length > 0) {
    if (!live) {
      summary.sitelinks_added = c.sitelinks.length;
    } else {
      try {
        summary.sitelinks_added = await addCampaignSitelinks(summary.campaign_id, c.sitelinks);
      } catch (err) {
        warnings.push(`[${c.name}] sitelinks failed: ${fmtErr(err)}`);
      }
    }
  }

  // Callout extensions
  if (c.callouts && c.callouts.length > 0) {
    if (!live) {
      summary.callouts_added = c.callouts.length;
    } else {
      try {
        summary.callouts_added = await addCampaignCallouts(summary.campaign_id, c.callouts);
      } catch (err) {
        warnings.push(`[${c.name}] callouts failed: ${fmtErr(err)}`);
      }
    }
  }

  // Demographic exclusion (18-24 age range)
  if (c.excludeAge18to24) {
    if (!live) {
      summary.demographics_excluded = 1;
    } else {
      try {
        summary.demographics_excluded = await excludeAge18to24(summary.campaign_id);
      } catch (err) {
        warnings.push(`[${c.name}] age exclusion failed: ${fmtErr(err)}`);
      }
    }
  }

  // Ad groups
  for (const g of c.adGroups) {
    try {
      const agSummary = await provisionAdGroup(
        summary.campaign_id,
        g,
        live,
        warnings,
      );
      summary.ad_groups.push(agSummary);
    } catch (err) {
      warnings.push(
        `[${c.name} > ${g.name}] aborted: ${fmtErr(err)}`,
      );
    }
  }

  return summary;
}

async function provisionAdGroup(
  campaignId: string,
  g: BlueprintAdGroup,
  live: boolean,
  warnings: string[],
): Promise<ProvisionResult["campaigns"][number]["ad_groups"][number]> {
  const out: ProvisionResult["campaigns"][number]["ad_groups"][number] = {
    name: g.name,
    ad_group_id: "",
    reused: false,
    keywords_added: 0,
    ads_created: 0,
  };

  if (!live) {
    out.ad_group_id = "mock-ag-" + slug(g.name);
    out.keywords_added = g.keywords.length;
    out.ads_created = g.ads.length;
    return out;
  }

  const existing = await findAdGroupByName(campaignId, g.name);
  if (existing) {
    out.ad_group_id = existing;
    out.reused = true;
  } else {
    out.ad_group_id = await createAdGroupShell(campaignId, g);
  }

  try {
    out.keywords_added = await addKeywords(out.ad_group_id, g.keywords);
  } catch (err) {
    warnings.push(
      `[${g.name}] keywords partial failure: ${fmtErr(err)}`,
    );
  }

  // Idempotency for RSAs: dedup against existing ads in the group by
  // matching on the first headline + first description signature. Without
  // this, every re-provision adds another RSA and we hit Google's hard
  // limit of 3 enabled RSAs per ad group after a few iterations.
  const existingSigs = live
    ? await findExistingRsaSignatures(out.ad_group_id)
    : new Set<string>();

  for (const ad of g.ads) {
    const sig = rsaSignature(ad);
    if (live && existingSigs.has(sig)) {
      // Already provisioned with identical first-headline + first-description.
      // Skip to avoid duplicate. (We deliberately don't update existing RSAs
      // — Google requires removing + recreating, which resets the ad's
      // learning. Operators who want to refresh copy should use
      // scripts/remove-ad.js then re-provision.)
      continue;
    }
    try {
      await createResponsiveSearchAd(out.ad_group_id, ad, g.finalUrl);
      out.ads_created += 1;
    } catch (err) {
      warnings.push(`[${g.name}] RSA failed: ${fmtErr(err)}`);
    }
  }

  return out;
}

function rsaSignature(ad: BlueprintRSA): string {
  const h = ad.headlines[0] ?? "";
  const d = ad.descriptions[0] ?? "";
  return `${h}|${d}`;
}

async function findExistingRsaSignatures(
  adGroupId: string,
): Promise<Set<string>> {
  const cust = await getCustomer();
  const rows = (await cust.query(
    `SELECT
       ad_group_ad.ad.responsive_search_ad.headlines,
       ad_group_ad.ad.responsive_search_ad.descriptions
     FROM ad_group_ad
     WHERE ad_group_ad.status != 'REMOVED'
       AND ad_group.id = ${adGroupId}`,
  )) as Array<{
    ad_group_ad?: {
      ad?: {
        responsive_search_ad?: {
          headlines?: Array<{ text?: string }>;
          descriptions?: Array<{ text?: string }>;
        };
      };
    };
  }>;
  const sigs = new Set<string>();
  for (const r of rows) {
    const rsa = r.ad_group_ad?.ad?.responsive_search_ad;
    const h = rsa?.headlines?.[0]?.text ?? "";
    const d = rsa?.descriptions?.[0]?.text ?? "";
    sigs.add(`${h}|${d}`);
  }
  return sigs;
}

/* -------------------------------------------------------------------------- */
/* Live API helpers — only invoked when isLive() === true                      */
/* -------------------------------------------------------------------------- */

async function findCampaignByName(
  name: string,
): Promise<{ id: string; budget_id: string } | null> {
  const c = await getCustomer();
  const rows = (await c.query(
    `SELECT campaign.id, campaign.campaign_budget
     FROM campaign
     WHERE campaign.name = '${escapeGaql(name)}'
     LIMIT 1`,
  )) as Array<{
    campaign?: { id?: string | number; campaign_budget?: string };
  }>;
  const row = rows[0];
  if (!row?.campaign?.id) return null;
  const budgetResource = row.campaign.campaign_budget ?? "";
  const budgetId = budgetResource.split("/").pop() ?? "";
  return { id: String(row.campaign.id), budget_id: budgetId };
}

async function findAdGroupByName(
  campaignId: string,
  name: string,
): Promise<string | null> {
  const c = await getCustomer();
  const rows = (await c.query(
    `SELECT ad_group.id
     FROM ad_group
     WHERE campaign.id = ${campaignId}
       AND ad_group.name = '${escapeGaql(name)}'
     LIMIT 1`,
  )) as Array<{ ad_group?: { id?: string | number } }>;
  const id = rows[0]?.ad_group?.id;
  return id ? String(id) : null;
}

async function createCampaignShell(
  c: BlueprintCampaign,
): Promise<{ campaign_id: string; budget_id: string }> {
  const cust = await getCustomer();
  const budgetResp = await cust.campaignBudgets.create([
    {
      name: `${c.name} — budget`,
      amount_micros: Math.round(c.dailyBudgetUsd * 1_000_000),
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false,
    },
  ] as never);
  const budgetResource =
    (budgetResp as { results?: Array<{ resource_name?: string }> }).results?.[0]
      ?.resource_name ?? "";

  const bid = c.bidStrategy;
  const campaignFields: Record<string, unknown> = {
    name: c.name,
    status: enums.CampaignStatus.PAUSED,
    advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
    campaign_budget: budgetResource,
    network_settings: {
      target_google_search: true,
      target_search_network: false,
      target_content_network: false,
      target_partner_search_network: false,
    },
    // EU advertising compliance flag added by Google late 2025. Required
    // on every CampaignOperation.create regardless of advertiser geo.
    // We don't run political ads, so this is always false.
    contains_eu_political_advertising:
      enums.EuPoliticalAdvertisingStatus.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
  };
  if (bid === "MAXIMIZE_CLICKS") {
    campaignFields.target_spend = {};
  } else if (bid === "MAXIMIZE_CONVERSIONS") {
    campaignFields.maximize_conversions = {};
  } else if (bid === "TARGET_IMPRESSION_SHARE") {
    campaignFields.target_impression_share = {
      location: enums.TargetImpressionShareLocation.TOP_OF_PAGE,
      location_fraction_micros: 900_000, // 90%
      cpc_bid_ceiling_micros: 5_000_000, // $5
    };
  }

  const campResp = await cust.campaigns.create([campaignFields] as never);
  const campResource =
    (campResp as { results?: Array<{ resource_name?: string }> }).results?.[0]
      ?.resource_name ?? "";
  return {
    campaign_id: campResource.split("/").pop() ?? "",
    budget_id: budgetResource.split("/").pop() ?? "",
  };
}

async function addCampaignNegatives(
  campaignId: string,
  negatives: string[],
): Promise<number> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const operations = negatives.map((kw) => ({
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    negative: true,
    keyword: {
      text: kw,
      match_type: enums.KeywordMatchType.BROAD,
    },
  }));
  await cust.campaignCriteria.create(operations as never);
  return operations.length;
}

async function addCampaignSitelinks(
  campaignId: string,
  sitelinks: BlueprintSitelink[],
): Promise<number> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  const assetOps = sitelinks.map((sl) => ({
    sitelink_asset: {
      link_text: sl.text,
      description1: sl.description1 ?? "",
      description2: sl.description2 ?? "",
    },
    final_urls: [sl.finalUrl],
  }));

  const assetResp = await cust.assets.create(assetOps as never);
  const assetResources = (assetResp as { results?: Array<{ resource_name?: string }> })
    .results?.map((r) => r.resource_name ?? "") ?? [];

  const linkOps = assetResources.map((resource) => ({
    asset: resource,
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    field_type: enums.AssetFieldType.SITELINK,
  }));

  await cust.campaignAssets.create(linkOps as never);
  return sitelinks.length;
}

async function addCampaignCallouts(
  campaignId: string,
  callouts: BlueprintCallout[],
): Promise<number> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  const assetOps = callouts.map((co) => ({
    callout_asset: {
      callout_text: co.text,
    },
  }));

  const assetResp = await cust.assets.create(assetOps as never);
  const assetResources = (assetResp as { results?: Array<{ resource_name?: string }> })
    .results?.map((r) => r.resource_name ?? "") ?? [];

  const linkOps = assetResources.map((resource) => ({
    asset: resource,
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    field_type: enums.AssetFieldType.CALLOUT,
  }));

  await cust.campaignAssets.create(linkOps as never);
  return callouts.length;
}

async function excludeAge18to24(campaignId: string): Promise<number> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  await cust.campaignCriteria.create([{
    campaign: `customers/${customerId}/campaigns/${campaignId}`,
    negative: true,
    age_range: {
      type: enums.AgeRangeType.AGE_RANGE_18_24,
    },
  }] as never);
  return 1;
}

async function createAdGroupShell(
  campaignId: string,
  g: BlueprintAdGroup,
): Promise<string> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const resp = await cust.adGroups.create([
    {
      name: g.name,
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      status: enums.AdGroupStatus.PAUSED,
      type: enums.AdGroupType.SEARCH_STANDARD,
      cpc_bid_micros: Math.round(g.cpcBidCeilingUsd * 1_000_000),
    },
  ] as never);
  const resource =
    (resp as { results?: Array<{ resource_name?: string }> }).results?.[0]
      ?.resource_name ?? "";
  return resource.split("/").pop() ?? "";
}

async function addKeywords(
  adGroupId: string,
  keywords: BlueprintKeyword[],
): Promise<number> {
  if (keywords.length === 0) return 0;
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const operations = keywords.map((k) => ({
    ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
    status: enums.AdGroupCriterionStatus.ENABLED,
    keyword: {
      text: k.text,
      match_type:
        k.match === "EXACT"
          ? enums.KeywordMatchType.EXACT
          : k.match === "PHRASE"
            ? enums.KeywordMatchType.PHRASE
            : enums.KeywordMatchType.BROAD,
    },
  }));
  await cust.adGroupCriteria.create(operations as never);
  return operations.length;
}

async function createResponsiveSearchAd(
  adGroupId: string,
  ad: BlueprintRSA,
  finalUrl: string,
): Promise<void> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  await cust.adGroupAds.create([
    {
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      status: enums.AdGroupAdStatus.PAUSED,
      ad: {
        final_urls: [finalUrl],
        responsive_search_ad: {
          headlines: ad.headlines.slice(0, 15).map((h) => ({ text: h })),
          descriptions: ad.descriptions.slice(0, 4).map((d) => ({ text: d })),
          ...(ad.path1 ? { path1: ad.path1 } : {}),
          ...(ad.path2 ? { path2: ad.path2 } : {}),
        },
      },
    },
  ] as never);
}

/* -------------------------------------------------------------------------- */
/* Misc helpers                                                                */
/* -------------------------------------------------------------------------- */

async function getCustomer() {
  // Imported lazily so that mock-mode unit tests don't trigger the
  // top-level customer() initialization (which validates env vars).
  const { _internalCustomer } = await import("./google-ads-internal");
  return _internalCustomer();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function escapeGaql(s: string): string {
  return s.replace(/'/g, "\\'");
}
