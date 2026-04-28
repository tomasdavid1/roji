import { getSubsMetrics } from "@/lib/subscriptions";
import { MetricCard } from "@/components/MetricCard";
import { fmtInt, fmtUsd, fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  let metrics;
  let fetchError: string | null = null;
  try {
    metrics = await getSubsMetrics();
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-roji-muted text-sm mt-1">
          Recurring revenue · autoship customers · churn
        </p>
      </header>

      {fetchError ? (
        <div className="roji-card border border-roji-warning/40 bg-roji-warning/5">
          <div className="text-xs font-mono uppercase tracking-widest text-roji-warning mb-2">
            Could not reach the WP endpoint
          </div>
          <p className="text-sm text-roji-text leading-relaxed mb-2">
            The dashboard expected{" "}
            <code className="font-mono text-xs">
              {process.env.ROJI_STORE_URL}/wp-json/roji/v1/subscriptions/metrics
            </code>{" "}
            to respond.
          </p>
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
            to surface live subscription metrics here. The same token must be
            defined as <code className="font-mono text-xs">ROJI_INTERNAL_API_TOKEN</code>{" "}
            in the WordPress <code className="font-mono text-xs">wp-config.php</code>.
          </p>
          {metrics?.provider === "none" && (
            <p className="text-xs text-roji-muted mt-3">
              Note: no subscription plugin is active on the WordPress side
              either. Install &quot;Subscriptions for WooCommerce&quot; (free)
              or WooCommerce Subscriptions (paid) to start.
            </p>
          )}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              label="MRR"
              value={fmtUsd(metrics.mrr)}
              hint={`${metrics.counts.active} active`}
            />
            <MetricCard
              label="Active"
              value={fmtInt(metrics.counts.active)}
              hint={`${metrics.counts["on-hold"]} on hold`}
            />
            <MetricCard
              label="ARPU"
              value={fmtUsd(metrics.arpu)}
              hint="per active sub"
            />
            <MetricCard
              label="Churn (30d)"
              value={fmtPct(metrics.churn_pct_30d / 100)}
              hint={`${metrics.counts.cancelled} cancelled all-time`}
            />
          </section>

          <section className="mb-10">
            <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
              Status breakdown
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {(
                ["active", "on-hold", "pending", "cancelled", "expired"] as const
              ).map((s) => (
                <div key={s} className="roji-card">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-1">
                    {s}
                  </div>
                  <div className="text-2xl font-semibold">
                    {fmtInt(metrics.counts[s] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
              Recent cancellations
            </h2>
            {metrics.recent_cancellations.length === 0 ? (
              <div className="roji-card text-sm text-roji-muted">
                No cancellations on record. Healthy.
              </div>
            ) : (
              <div className="roji-card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim">
                      <th className="px-4 py-3">Sub ID</th>
                      <th className="px-4 py-3">Cancelled at</th>
                      <th className="px-4 py-3 text-right">Recurring amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent_cancellations.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-white/[0.04] hover:bg-white/[0.01]"
                      >
                        <td className="px-4 py-2 font-mono text-xs">#{c.id}</td>
                        <td className="px-4 py-2 text-roji-muted">
                          {new Date(c.cancelled_at + "Z").toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {fmtUsd(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-[10px] text-roji-dim mt-6 font-mono">
            Provider: {metrics.provider} · Source: {metrics.source} · Updated:{" "}
            {new Date(metrics.as_of).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
