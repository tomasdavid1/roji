import { getAffiliateMetrics } from "@/lib/affiliates";
import { MetricCard } from "@/components/MetricCard";
import { fmtInt, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage() {
  let metrics;
  let fetchError: string | null = null;
  try {
    metrics = await getAffiliateMetrics();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <header className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Affiliates</h1>
          <p className="text-roji-muted text-sm mt-1">
            Influencer + creator referrals · tiered commissions · 30d attribution
          </p>
        </div>
        {metrics?.mode === "test" && (
          <span className="roji-pill-warning">Test mode · payouts manual</span>
        )}
      </header>

      {fetchError ? (
        <div className="roji-card border border-roji-warning/40 bg-roji-warning/5">
          <div className="text-xs font-mono uppercase tracking-widest text-roji-warning mb-2">
            Could not reach the WP endpoint
          </div>
          <pre className="text-xs text-roji-muted whitespace-pre-wrap break-all mt-2">
            {fetchError}
          </pre>
        </div>
      ) : !metrics?.enabled ? (
        <div className="roji-card">
          <div className="text-xs font-mono uppercase tracking-widest text-roji-dim mb-2">
            Not configured
          </div>
          <p className="text-sm text-roji-muted">
            Set <code className="font-mono text-xs">ROJI_STORE_URL</code> and{" "}
            <code className="font-mono text-xs">ROJI_INTERNAL_API_TOKEN</code>{" "}
            in this app, and matching{" "}
            <code className="font-mono text-xs">
              define( &apos;ROJI_INTERNAL_API_TOKEN&apos;, &apos;...&apos; );
            </code>{" "}
            in WP <code className="font-mono text-xs">wp-config.php</code>.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              label="Affiliates"
              value={fmtInt(metrics.affiliate_counts.approved)}
              hint={`${metrics.affiliate_counts.pending} pending review`}
            />
            <MetricCard
              label="GMV (30d)"
              value={fmtUsd(metrics.gmv_30d)}
              hint="referred sales"
            />
            <MetricCard
              label="Owed (approved)"
              value={fmtUsd(metrics.commission_amounts.approved)}
              hint={`${metrics.commission_counts.approved} commissions`}
            />
            <MetricCard
              label="Pending lock"
              value={fmtUsd(metrics.commission_amounts.pending)}
              hint={`${metrics.commission_counts.pending} within ${metrics.lock_days}d window`}
            />
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
              Tier ladder
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <TierCard
                label="Default"
                pct={metrics.tier_default_pct}
                hint={`< ${fmtUsd(metrics.tier_2_threshold)} lifetime`}
              />
              <TierCard
                label="Tier 2"
                pct={metrics.tier_2_pct}
                hint={`≥ ${fmtUsd(metrics.tier_2_threshold)} lifetime`}
              />
              <TierCard
                label="Tier 3"
                pct={metrics.tier_3_pct}
                hint={`≥ ${fmtUsd(metrics.tier_3_threshold)} lifetime`}
              />
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
              Commission status breakdown
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(["pending", "approved", "paid", "reversed"] as const).map((s) => (
                <div key={s} className="roji-card">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-1">
                    {s}
                  </div>
                  <div className="text-2xl font-semibold">
                    {fmtUsd(metrics.commission_amounts[s])}
                  </div>
                  <div className="text-xs text-roji-muted mt-1">
                    {fmtInt(metrics.commission_counts[s])} row
                    {metrics.commission_counts[s] === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
              Top performers (lifetime gross)
            </h2>
            {metrics.top_affiliates.length === 0 ? (
              <div className="roji-card text-sm text-roji-muted">
                No approved affiliates yet. Send influencers to{" "}
                <code className="font-mono text-xs">/become-an-affiliate</code>.
              </div>
            ) : (
              <div className="roji-card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Lifetime gross</th>
                      <th className="px-4 py-3 text-right">Commission paid</th>
                      <th className="px-4 py-3 text-right">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_affiliates.map((a) => (
                      <tr
                        key={a.id}
                        className="border-t border-white/[0.04] hover:bg-white/[0.01]"
                      >
                        <td className="px-4 py-2">{a.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                        <td className="px-4 py-2 text-right">
                          {fmtInt(a.clicks)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {fmtUsd(a.lifetime_gross)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {fmtUsd(a.lifetime_commission)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {a.tier_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-[10px] text-roji-dim mt-6 font-mono">
            Source: {metrics.source} · Cookie window: {metrics.cookie_days}d ·
            Lock window: {metrics.lock_days}d · Updated:{" "}
            {new Date(metrics.as_of).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function TierCard({
  label,
  pct,
  hint,
}: {
  label: string;
  pct: number;
  hint: string;
}) {
  return (
    <div className="roji-card">
      <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold">{pct}%</div>
      <div className="text-xs text-roji-muted mt-1">{hint}</div>
    </div>
  );
}
