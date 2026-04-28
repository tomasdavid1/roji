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

import {
  type BlueprintAdGroup,
  type BlueprintCampaign,
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
  if (issues.length > 0) {
    throw new Error(
      "Blueprint failed safety validation. Refusing to provision: " +
        issues.map((i) => `${i.field}: "${i.text}" (${i.reason})`).join(" | "),
    );
  }

  const live = isLive() && !opts.dryRun;
  const mode: ProvisionResult["mode"] = live ? "live" : "mock";

  const result: ProvisionResult = {
    mode,
    apiMode: apiMode(),
    blueprint,
    validation_issues: issues,
    stats: blueprintStats(blueprint),
    campaigns: [],
    warnings: [],
  };

  for (const c of blueprint.campaigns) {
    try {
      const summary = await provisionCampaign(c, live, result.warnings);
      result.campaigns.push(summary);
    } catch (err) {
      result.warnings.push(
        `[${c.name}] aborted: ${err instanceof Error ? err.message : String(err)}`,
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
          `[${c.name}] negatives partial failure: ${err instanceof Error ? err.message : String(err)}`,
        );
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
        `[${c.name} > ${g.name}] aborted: ${err instanceof Error ? err.message : String(err)}`,
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
      `[${g.name}] keywords partial failure: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  for (const ad of g.ads) {
    try {
      await createResponsiveSearchAd(out.ad_group_id, ad, g.finalUrl);
      out.ads_created += 1;
    } catch (err) {
      warnings.push(
        `[${g.name}] RSA failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return out;
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
