/**
 * Funnel dashboard.
 *
 * The single source of truth for "where did the clicks go?" Per-tool view
 * (one funnel per tool, switchable via the tabs at the top) plus an
 * "All tools" aggregate. Each step shows its data source inline so
 * un-connected sources don't pretend to be zero.
 *
 * URL params:
 *   ?tool=<id>      Tool id (see TOOLS in lib/funnel.ts). Defaults to "_all".
 *   ?range=<DateRange>   See DateRange in lib/google-ads.ts. Defaults to LAST_30_DAYS.
 */

import Link from "next/link";
import { ApiBlocked } from "@/components/ApiBlocked";
import { FunnelChart } from "@/components/FunnelChart";
import { MetricCard } from "@/components/MetricCard";
import { fmtInt, fmtUsd } from "@/lib/format";
import { TOOLS, getFunnelForTool, type FunnelData } from "@/lib/funnel";
import type { DateRange } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

const VALID_RANGES: DateRange[] = [
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "LAST_14_DAYS",
  "LAST_30_DAYS",
];

const RANGE_LABELS: Record<DateRange, string> = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  LAST_7_DAYS: "Last 7d",
  LAST_14_DAYS: "Last 14d",
  LAST_30_DAYS: "Last 30d",
  THIS_MONTH: "This month",
  LAST_MONTH: "Last month",
};

interface PageProps {
  searchParams: Promise<{ tool?: string; range?: string }>;
}

export default async function FunnelPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const toolId = sp.tool ?? "_all";
  const range = (
    VALID_RANGES.includes((sp.range ?? "LAST_30_DAYS") as DateRange)
      ? sp.range
      : "LAST_30_DAYS"
  ) as DateRange;

  let funnel: FunnelData;
  try {
    funnel = await getFunnelForTool(toolId, range);
  } catch (err) {
    return <ApiBlocked pageLabel="Funnel" error={err} showAuxiliary />;
  }

  const purchaseStep = funnel.steps.find((s) => s.id === "purchase");
  const adClickStep = funnel.steps.find((s) => s.id === "ad_click");

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Funnel</h1>
        <p className="text-roji-muted text-sm mt-1">
          Ad click → tool view → tool used → store CTA → cart → checkout →
          reserve order. Per ADS-PLAYBOOK.md.
        </p>
      </header>

      {/* Tool tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <ToolTab
          id="_all"
          label="All tools"
          range={range}
          activeId={toolId}
        />
        {TOOLS.map((t) => (
          <ToolTab
            key={t.id}
            id={t.id}
            label={t.label}
            range={range}
            activeId={toolId}
          />
        ))}
      </div>

      {/* Date range tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {VALID_RANGES.map((r) => {
          const active = r === range;
          const href = buildHref(toolId, r);
          return (
            <Link
              key={r}
              href={href}
              className={[
                "px-2.5 py-1 rounded-roji text-[11px] font-mono uppercase tracking-widest transition-colors",
                active
                  ? "bg-white/[0.06] text-roji-text"
                  : "bg-white/[0.02] text-roji-muted hover:text-roji-text",
              ].join(" ")}
            >
              {RANGE_LABELS[r]}
            </Link>
          );
        })}
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Ad spend"
          value={fmtUsd(funnel.total_spend_usd)}
          hint={`${RANGE_LABELS[range]} · ${funnel.tool_label}`}
        />
        <MetricCard
          label="Ad clicks"
          value={fmtInt(adClickStep?.count ?? 0)}
        />
        <MetricCard
          label="Reserve orders"
          value={fmtInt(purchaseStep?.count ?? 0)}
        />
        <MetricCard
          label="Implied CAC"
          value={
            funnel.implied_cac_usd === null
              ? "—"
              : fmtUsd(funnel.implied_cac_usd)
          }
          hint={
            funnel.implied_cac_usd === null
              ? "no purchases in window"
              : "spend ÷ reserve orders"
          }
        />
      </section>

      {/* Connectivity banner — show when any source is missing */}
      <ConnectivityBanner sources={funnel.data_sources} />

      {/* The funnel itself */}
      <section className="roji-card !p-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-4">
          Funnel — {funnel.tool_label}
        </h2>
        <FunnelChart funnel={funnel} />
      </section>

      {/* Footnote about sources */}
      <p className="text-[11px] text-roji-dim mt-6 leading-relaxed">
        Steps marked &quot;via Google Ads&quot; come from the Google Ads API
        (clicks, conversions). Steps marked &quot;via GA4&quot; come from the
        GA4 Data API (engagement events). Steps marked &quot;via
        WooCommerce&quot; come from the store REST API. Source connectivity
        is shown above; missing sources don&rsquo;t pretend to be zero.
      </p>
    </div>
  );
}

function ToolTab({
  id,
  label,
  range,
  activeId,
}: {
  id: string;
  label: string;
  range: DateRange;
  activeId: string;
}) {
  const active = id === activeId;
  const href = buildHref(id, range);
  return (
    <Link
      href={href}
      className={[
        "px-3 py-1.5 rounded-roji text-sm transition-colors",
        active
          ? "bg-roji-accent/15 text-roji-text border border-roji-accent/40"
          : "bg-white/[0.02] text-roji-muted hover:text-roji-text border border-roji-border",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function buildHref(tool: string, range: DateRange): string {
  const params = new URLSearchParams();
  if (tool && tool !== "_all") params.set("tool", tool);
  if (range && range !== "LAST_30_DAYS") params.set("range", range);
  const q = params.toString();
  return q ? `/funnel?${q}` : "/funnel";
}

function ConnectivityBanner({
  sources,
}: {
  sources: FunnelData["data_sources"];
}) {
  const missing: string[] = [];
  if (sources.google_ads === "mock")
    missing.push("Google Ads API (showing mock data)");
  if (sources.ga4 === "missing") missing.push("GA4 Data API (mid-funnel)");
  if (sources.woocommerce === "missing")
    missing.push("WooCommerce REST (purchase attribution)");

  if (missing.length === 0) return null;

  return (
    <div className="roji-card !p-3 mb-4 border-l-4 border-l-amber-500/50 bg-amber-500/5">
      <div className="text-xs font-mono uppercase tracking-widest text-amber-300 mb-1">
        Partial data
      </div>
      <div className="text-sm text-roji-text mb-2">
        {missing.length} source{missing.length === 1 ? "" : "s"} not connected
        — funnel steps fed by them show as &quot;not connected&quot; below.
      </div>
      <ul className="text-[11px] text-roji-muted list-disc list-inside leading-relaxed">
        {sources.ga4 === "missing" && (
          <li>
            <strong>GA4:</strong> set <code>GA4_PROPERTY_ID</code> +{" "}
            <code>GA4_SERVICE_ACCOUNT_JSON</code> on Vercel. The service
            account email needs Viewer role on the GA4 property.
          </li>
        )}
        {sources.woocommerce === "missing" && (
          <li>
            <strong>WooCommerce:</strong> set <code>WOO_API_BASE</code>,{" "}
            <code>WOO_CONSUMER_KEY</code>, <code>WOO_CONSUMER_SECRET</code>{" "}
            on Vercel (read-only REST key from WP-Admin → WooCommerce →
            Settings → Advanced → REST API).
          </li>
        )}
        {sources.google_ads === "mock" && (
          <li>
            <strong>Google Ads:</strong> set the <code>GOOGLE_ADS_*</code>{" "}
            env vars (see /tracking).
          </li>
        )}
      </ul>
    </div>
  );
}
