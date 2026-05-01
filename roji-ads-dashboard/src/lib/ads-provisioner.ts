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
 *   - RSAs: existing responsive search ads in a reused ad group are
 *     **synced** to the blueprint — we update the oldest unmatched RSA
 *     in place (via `adGroupAds.update`) when copy differs, and only
 *     `create` when the group needs more ads than exist. This avoids
 *     piling up duplicate RSAs and lets operators iterate copy from
 *     `ads-blueprint.ts` + `--live` without hand-editing the Google Ads UI.
 *   - Sitelinks: campaign sitelink **assets** are matched by link text;
 *     descriptions / URLs are updated in place when the blueprint changes.
 *     New sitelink rows in the blueprint still create new assets + links.
 *   - Keywords are still additive (not deduped) on re-provision.
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
      ads_updated: number;
      /**
       * RSAs that were live in the ad group but not in the current
       * blueprint — typically stale copy from a previous run. Removed by
       * the orphan-RSA sweep so disapproved old creatives don't sit
       * around dragging the campaign down.
       */
      ads_removed: number;
    }>;
    negatives_added: number;
    sitelinks_added: number;
    sitelinks_updated: number;
    /**
     * Sitelink **assets** that were linked to the campaign but do not
     * map to any blueprint sitelink (matched by final URL). Unlinked
     * by the sitelink sweep; the underlying assets are also removed
     * if they are not linked anywhere else.
     */
    sitelinks_removed: number;
    callouts_added: number;
    demographics_excluded: number;
    /** Country-level location targets added this run. */
    geo_targets_added: number;
    /** Country-level location targets removed this run (e.g. an old GB
     *  target the blueprint no longer wants). */
    geo_targets_removed: number;
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
    sitelinks_updated: 0,
    sitelinks_removed: 0,
    callouts_added: 0,
    demographics_excluded: 0,
    geo_targets_added: 0,
    geo_targets_removed: 0,
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

  // Geo targeting — sync the country-level criteria so the live
  // campaign matches `c.geoTargets`. Idempotent: missing targets are
  // added, surplus positive targets are removed, negatives are left
  // alone. This is the protection layer that prevents a recreated or
  // newly-spun-up campaign from defaulting to "all countries."
  //
  // The geo *mode* (PRESENCE vs PRESENCE_OR_INTEREST) is set on
  // CampaignOperation.create — see `createCampaignShell`. We don't
  // re-mutate it here because changing it on a live campaign mid-flight
  // can cause Google's bid ML to relearn from scratch.
  {
    const geoTargets = c.geoTargets ?? [];
    if (geoTargets.length === 0) {
      warnings.push(
        `[${c.name}] no geoTargets in blueprint — campaign will serve to ALL COUNTRIES.`,
      );
    } else if (!live) {
      summary.geo_targets_added = geoTargets.length;
    } else {
      try {
        const { added, removed } = await syncCampaignGeoTargets(
          summary.campaign_id,
          geoTargets,
        );
        summary.geo_targets_added = added;
        summary.geo_targets_removed = removed;
      } catch (err) {
        warnings.push(
          `[${c.name}] geo targeting failed: ${fmtErr(err)}`,
        );
      }
    }
  }

  // Sitelink extensions — sync is true bidirectional:
  //   - Create blueprint sitelinks that aren't live yet.
  //   - Update existing sitelinks whose copy or URL drifted.
  //   - Remove (unlink) live sitelinks that are not in the blueprint
  //     (incl. duplicates pointing at the same URL) so disapproved old
  //     assets can't keep impressing.
  // We always run the sync — even when the blueprint has no sitelinks —
  // so removing a sitelink from the blueprint also removes it live.
  {
    const blueprintSitelinks = c.sitelinks ?? [];
    if (!live) {
      summary.sitelinks_added = blueprintSitelinks.length;
      summary.sitelinks_updated = 0;
      summary.sitelinks_removed = 0;
    } else {
      try {
        const { added, updated, removed } = await syncCampaignSitelinks(
          summary.campaign_id,
          blueprintSitelinks,
        );
        summary.sitelinks_added = added;
        summary.sitelinks_updated = updated;
        summary.sitelinks_removed = removed;
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
    ads_updated: 0,
    ads_removed: 0,
  };

  if (!live) {
    out.ad_group_id = "mock-ag-" + slug(g.name);
    out.keywords_added = g.keywords.length;
    out.ads_created = g.ads.length;
    out.ads_updated = 0;
    out.ads_removed = 0;
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

  try {
    const { created, updated, removed, note } = await syncResponsiveSearchAdsInGroup(
      out.ad_group_id,
      g.ads,
      g.finalUrl,
      g.name,
    );
    out.ads_created = created;
    out.ads_updated = updated;
    out.ads_removed = removed;
    if (note) warnings.push(note);
  } catch (err) {
    warnings.push(`[${g.name}] RSA sync failed: ${fmtErr(err)}`);
  }

  return out;
}

/** Order-insensitive compare of RSA text slots (headlines / descriptions). */
function rsaMultisetEqual(a: string[], b: string[]): boolean {
  const na = [...a].map((s) => s.trim()).filter(Boolean).sort();
  const nb = [...b].map((s) => s.trim()).filter(Boolean).sort();
  if (na.length !== nb.length) return false;
  return na.every((v, i) => v === nb[i]);
}

function rsaMatchesBlueprint(
  ad: BlueprintRSA,
  finalUrl: string,
  row: {
    headlines: Array<{ text?: string }>;
    descriptions: Array<{ text?: string }>;
    final_urls?: string[];
    path1?: string;
    path2?: string;
  },
): boolean {
  const h = (row.headlines ?? []).map((x) => (x.text ?? "").trim()).filter(Boolean);
  const d = (row.descriptions ?? []).map((x) => (x.text ?? "").trim()).filter(Boolean);
  const url = (row.final_urls?.[0] ?? "").trim();
  const p1 = (row.path1 ?? "").trim();
  const p2 = (row.path2 ?? "").trim();
  const bp1 = (ad.path1 ?? "").trim();
  const bp2 = (ad.path2 ?? "").trim();
  return (
    url === finalUrl.trim() &&
    p1 === bp1 &&
    p2 === bp2 &&
    rsaMultisetEqual(ad.headlines, h) &&
    rsaMultisetEqual(ad.descriptions, d)
  );
}

type RsaRow = {
  resource_name: string;
  ad_id: string;
  status: number;
  headlines: Array<{ text?: string }>;
  descriptions: Array<{ text?: string }>;
  final_urls?: string[];
  path1?: string;
  path2?: string;
};

async function listRsasInAdGroup(adGroupId: string): Promise<RsaRow[]> {
  const cust = await getCustomer();
  const rows = (await cust.query(
    `SELECT
       ad_group_ad.resource_name,
       ad_group_ad.status,
       ad_group_ad.ad.id,
       ad_group_ad.ad.final_urls,
       ad_group_ad.ad.responsive_search_ad.headlines,
       ad_group_ad.ad.responsive_search_ad.descriptions,
       ad_group_ad.ad.responsive_search_ad.path1,
       ad_group_ad.ad.responsive_search_ad.path2
     FROM ad_group_ad
     WHERE ad_group.id = ${adGroupId}
       AND ad_group_ad.status != REMOVED
       AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD`,
  )) as Array<{
    ad_group_ad?: {
      resource_name?: string;
      status?: number;
      ad?: {
        id?: string | number;
        final_urls?: string[];
        responsive_search_ad?: {
          headlines?: Array<{ text?: string }>;
          descriptions?: Array<{ text?: string }>;
          path1?: string;
          path2?: string;
        };
      };
    };
  }>;
  const out: RsaRow[] = [];
  for (const r of rows) {
    const aga = r.ad_group_ad;
    const ad = aga?.ad;
    const rsa = ad?.responsive_search_ad;
    if (!aga?.resource_name || ad?.id == null || !rsa) continue;
    out.push({
      resource_name: aga.resource_name,
      ad_id: String(ad.id),
      status: Number(aga.status ?? enums.AdGroupAdStatus.ENABLED),
      headlines: rsa.headlines ?? [],
      descriptions: rsa.descriptions ?? [],
      final_urls: ad.final_urls,
      path1: rsa.path1,
      path2: rsa.path2,
    });
  }
  out.sort((a, b) => Number(a.ad_id) - Number(b.ad_id));
  return out;
}

/**
 * RSA creative fields are immutable on UPDATE — swap copy by remove + create.
 * Preserves the prior ad's ENABLED/PAUSED status on the replacement.
 */
async function replaceRsaCreative(
  resourceName: string,
  adGroupId: string,
  ad: BlueprintRSA,
  finalUrl: string,
  priorStatus: number,
): Promise<void> {
  const cust = await getCustomer();
  await cust.adGroupAds.remove([resourceName]);
  await createResponsiveSearchAd(adGroupId, ad, finalUrl, priorStatus);
}

async function syncResponsiveSearchAdsInGroup(
  adGroupId: string,
  ads: BlueprintRSA[],
  finalUrl: string,
  adGroupName: string,
): Promise<{ created: number; updated: number; removed: number; note?: string }> {
  // Note: we still run the sweep even when ads.length === 0, so a
  // blueprint that drops all RSAs in an ad group will clean live ones.

  const pool = await listRsasInAdGroup(adGroupId);
  const used = new Set<string>();
  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const ad of ads) {
    const matchIdx = pool.findIndex(
      (r) => !used.has(r.resource_name) && rsaMatchesBlueprint(ad, finalUrl, r),
    );
    if (matchIdx >= 0) {
      used.add(pool[matchIdx].resource_name);
      continue;
    }
    const freeIdx = pool.findIndex((r) => !used.has(r.resource_name));
    if (freeIdx >= 0) {
      const target = pool[freeIdx];
      used.add(target.resource_name);
      await replaceRsaCreative(
        target.resource_name,
        adGroupId,
        ad,
        finalUrl,
        target.status,
      );
      updated += 1;
    } else {
      await createResponsiveSearchAd(adGroupId, ad, finalUrl);
      created += 1;
    }
  }

  // Orphans: live RSAs not referenced by the current blueprint. We
  // remove them so disapproved old creatives stop dragging the ad
  // group's policy and quality scores. Removal preserves history in
  // Google Ads' "Removed" filter — this is reversible from the UI.
  const orphans = pool.filter((r) => !used.has(r.resource_name));
  let note: string | undefined;
  if (orphans.length > 0) {
    const cust = await getCustomer();
    const orphanResources = orphans.map((o) => o.resource_name);
    try {
      await cust.adGroupAds.remove(orphanResources);
      removed = orphans.length;
      note = `[${adGroupName}] removed ${orphans.length} orphan RSA(s) (ad id(s): ${orphans.map((o) => o.ad_id).join(", ")}) — old/unused creatives swept by the blueprint sync.`;
    } catch (err) {
      note = `[${adGroupName}] failed to remove ${orphans.length} orphan RSA(s) (ad id(s): ${orphans.map((o) => o.ad_id).join(", ")}): ${fmtErr(err)}. Remove manually in the Google Ads UI.`;
    }
  }
  return { created, updated, removed, note };
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
    // Geo-targeting MODE — "PRESENCE" means we only serve to people
    // physically in our targeted countries. The default
    // ("PRESENCE_OR_INTEREST") would also serve to e.g. someone in
    // Mexico Googling "US peptides," which is exactly what we don't
    // want for a US-only research vendor. The actual *country list*
    // is configured separately via campaign_criterion (see
    // `setCampaignGeoTargets` below).
    geo_target_type_setting: {
      positive_geo_target_type:
        enums.PositiveGeoTargetType?.PRESENCE ?? 5,
      negative_geo_target_type:
        enums.NegativeGeoTargetType?.PRESENCE ?? 2,
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

/**
 * ISO country code → Google Ads geoTargetConstant ID.
 *
 * Reference: <https://developers.google.com/google-ads/api/data/geotargets>
 *
 * We only list what we currently use. Add more here if you want to
 * expand a campaign's geo footprint via the blueprint instead of the
 * UI. Country-level constants are stable and don't change.
 */
const GEO_TARGET_CONSTANTS: Record<string, string> = {
  US: "geoTargetConstants/2840",
  GB: "geoTargetConstants/2826",
  CA: "geoTargetConstants/2124",
  AU: "geoTargetConstants/2036",
  IE: "geoTargetConstants/2372",
  NZ: "geoTargetConstants/2554",
};

interface LocationCriterionRow {
  resource_name: string;
  geo_target_constant: string;
  negative: boolean;
}

/** Pull every LOCATION criterion currently on the campaign. */
async function listCampaignLocations(
  campaignId: string,
): Promise<LocationCriterionRow[]> {
  const cust = await getCustomer();
  const rows = (await cust.query(
    `SELECT
       campaign.id,
       campaign_criterion.resource_name,
       campaign_criterion.location.geo_target_constant,
       campaign_criterion.negative
     FROM campaign_criterion
     WHERE campaign.id = ${campaignId}
       AND campaign_criterion.type = 'LOCATION'
       AND campaign_criterion.status != 'REMOVED'`,
  )) as Array<{
    campaign_criterion?: {
      resource_name?: string;
      negative?: boolean;
      location?: { geo_target_constant?: string };
    };
  }>;
  const out: LocationCriterionRow[] = [];
  for (const r of rows) {
    const c = r.campaign_criterion;
    if (!c?.resource_name || !c?.location?.geo_target_constant) continue;
    out.push({
      resource_name: c.resource_name,
      geo_target_constant: c.location.geo_target_constant,
      negative: !!c.negative,
    });
  }
  return out;
}

/**
 * Sync a campaign's positive location-targeting criteria to match
 * the blueprint's `geoTargets` list.
 *
 * Idempotent and bidirectional:
 *   - Creates missing target countries.
 *   - Removes positive-targeting criteria for countries NOT in the
 *     blueprint (so deleting "GB" from `geoTargets` actually unmasks
 *     the GB-targeting on Google's side).
 *   - Leaves negative-targeting criteria alone (handled separately).
 *
 * Returns `{ added, removed }` for the report. We DON'T return
 * "kept" because the user only cares about deltas.
 */
async function syncCampaignGeoTargets(
  campaignId: string,
  geoTargets: readonly string[],
): Promise<{ added: number; removed: number }> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  const wantConstants = new Set(
    geoTargets
      .map((iso) => GEO_TARGET_CONSTANTS[iso])
      .filter((v): v is string => !!v),
  );

  const live = await listCampaignLocations(campaignId);
  const liveConstants = new Set(
    live.filter((l) => !l.negative).map((l) => l.geo_target_constant),
  );

  // Add anything wanted but not live.
  const toAdd = [...wantConstants].filter((c) => !liveConstants.has(c));
  // Remove anything live (positive) but not wanted. We deliberately
  // leave negatives untouched — those are managed elsewhere.
  const toRemove = live.filter(
    (l) => !l.negative && !wantConstants.has(l.geo_target_constant),
  );

  if (toAdd.length > 0) {
    const ops = toAdd.map((constant) => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      location: { geo_target_constant: constant },
    }));
    await cust.campaignCriteria.create(ops as never);
  }
  if (toRemove.length > 0) {
    await cust.campaignCriteria.remove(
      toRemove.map((l) => l.resource_name) as never,
    );
  }
  return { added: toAdd.length, removed: toRemove.length };
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

type LinkedSitelinkRow = {
  asset_resource_name: string;
  campaign_asset_resource_name: string;
  link_text: string;
  description1: string;
  description2: string;
  final_urls: string[];
};

async function listLinkedSitelinksForCampaign(
  campaignId: string,
): Promise<LinkedSitelinkRow[]> {
  const cust = await getCustomer();
  const rows = (await cust.query(
    `SELECT
       campaign.id,
       campaign_asset.resource_name,
       asset.resource_name,
       asset.sitelink_asset.link_text,
       asset.sitelink_asset.description1,
       asset.sitelink_asset.description2,
       asset.final_urls
     FROM campaign_asset
     WHERE campaign.id = ${campaignId}
       AND campaign_asset.field_type = SITELINK
       AND campaign_asset.status != REMOVED`,
  )) as Array<{
    campaign?: { id?: string | number };
    campaign_asset?: { resource_name?: string };
    asset?: {
      resource_name?: string;
      sitelink_asset?: {
        link_text?: string;
        description1?: string;
        description2?: string;
      };
      final_urls?: string[];
    };
  }>;
  const out: LinkedSitelinkRow[] = [];
  for (const r of rows) {
    const a = r.asset;
    const sl = a?.sitelink_asset;
    if (!a?.resource_name || !r.campaign_asset?.resource_name) continue;
    out.push({
      asset_resource_name: a.resource_name,
      campaign_asset_resource_name: r.campaign_asset.resource_name,
      link_text: (sl?.link_text ?? "").trim(),
      description1: sl?.description1 ?? "",
      description2: sl?.description2 ?? "",
      final_urls: a.final_urls ?? [],
    });
  }
  return out;
}

async function createOneSitelinkAndLink(
  campaignId: string,
  sl: BlueprintSitelink,
): Promise<void> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

  const assetResp = await cust.assets.create([
    {
      sitelink_asset: {
        link_text: sl.text,
        description1: sl.description1 ?? "",
        description2: sl.description2 ?? "",
      },
      final_urls: [sl.finalUrl],
    },
  ] as never);
  const assetResource =
    (assetResp as { results?: Array<{ resource_name?: string }> }).results?.[0]
      ?.resource_name ?? "";

  await cust.campaignAssets.create([
    {
      asset: assetResource,
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      field_type: enums.AssetFieldType.SITELINK,
    },
  ] as never);
}

async function updateSitelinkAsset(
  assetResourceName: string,
  sl: BlueprintSitelink,
): Promise<void> {
  const cust = await getCustomer();
  await cust.assets.update([
    {
      resource_name: assetResourceName,
      sitelink_asset: {
        link_text: sl.text,
        description1: sl.description1 ?? "",
        description2: sl.description2 ?? "",
      },
      final_urls: [sl.finalUrl],
    },
  ] as never);
}

function sitelinkPrimaryUrl(row: LinkedSitelinkRow): string {
  return (row.final_urls[0] ?? "").trim();
}

/**
 * Bidirectional sitelink sync. The blueprint is the source of truth.
 *
 *   - For each blueprint sitelink, match by **final URL** (URL-keyed,
 *     so renaming link text updates the same asset). If multiple live
 *     assets share the URL (duplicates from earlier runs), keep the
 *     first match and unlink the rest.
 *   - Update copy in place when the matching asset's link text or
 *     descriptions drift.
 *   - Create the asset + link if no live asset exists at that URL.
 *   - Unlink every live sitelink that isn't in the blueprint
 *     (orphans). The underlying asset is left in the account but
 *     no longer impresses on this campaign.
 *
 * Removal granularity: we remove the *campaign_asset link*, not the
 * underlying asset, because assets can be linked from multiple
 * campaigns and Google rejects asset removals while still linked.
 */
async function syncCampaignSitelinks(
  campaignId: string,
  sitelinks: BlueprintSitelink[],
): Promise<{ added: number; updated: number; removed: number }> {
  const cust = await getCustomer();
  const existing = await listLinkedSitelinksForCampaign(campaignId);
  const used = new Set<string>(); // asset_resource_name set
  let added = 0;
  let updated = 0;
  let removed = 0;

  // First pass: ensure every blueprint sitelink is present and current.
  for (const sl of sitelinks) {
    const wantUrl = sl.finalUrl.trim();
    const wantText = sl.text.trim();
    const d1 = sl.description1 ?? "";
    const d2 = sl.description2 ?? "";

    // URL-keyed lookup; "live" duplicates are picked off into the orphan
    // set below.
    const byUrl = existing.filter(
      (e) => sitelinkPrimaryUrl(e) === wantUrl && !used.has(e.asset_resource_name),
    );

    if (byUrl.length === 0) {
      await createOneSitelinkAndLink(campaignId, sl);
      added += 1;
      continue;
    }

    // Keep the first match; mark the others as orphans (unlinked below).
    const [keep, ...dupes] = byUrl;
    used.add(keep.asset_resource_name);
    if (
      keep.link_text !== wantText ||
      (keep.description1 ?? "") !== d1 ||
      (keep.description2 ?? "") !== d2
    ) {
      await updateSitelinkAsset(keep.asset_resource_name, sl);
      updated += 1;
    }
    if (dupes.length > 0) {
      const dupeLinks = dupes.map((d) => d.campaign_asset_resource_name);
      try {
        await cust.campaignAssets.remove(dupeLinks);
        removed += dupes.length;
      } catch (err) {
        throw new Error(
          `failed to unlink ${dupes.length} duplicate sitelink(s) for ${wantUrl}: ${fmtErr(err)}`,
        );
      }
    }
  }

  // Second pass: unlink any remaining live sitelink assets that aren't
  // referenced by the blueprint at all (e.g. assets we just dropped
  // from the blueprint, like the disapproved /reconstitution and
  // /half-life sitelinks on 2026-05-01).
  const stragglers = existing.filter((e) => !used.has(e.asset_resource_name));
  if (stragglers.length > 0) {
    const stragglerLinks = stragglers.map((s) => s.campaign_asset_resource_name);
    try {
      await cust.campaignAssets.remove(stragglerLinks);
      removed += stragglers.length;
    } catch (err) {
      throw new Error(
        `failed to unlink ${stragglers.length} sitelink(s) not in blueprint (urls: ${stragglers
          .map((s) => sitelinkPrimaryUrl(s))
          .join(", ")}): ${fmtErr(err)}`,
      );
    }
  }

  return { added, updated, removed };
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
  status: number = enums.AdGroupAdStatus.PAUSED,
): Promise<void> {
  const cust = await getCustomer();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  await cust.adGroupAds.create([
    {
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      status,
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
