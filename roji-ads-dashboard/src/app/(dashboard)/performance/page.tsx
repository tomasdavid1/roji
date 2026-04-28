import { getCampaignPerformance } from "@/lib/google-ads";
import { MetricCard } from "@/components/MetricCard";
import { fmtInt, fmtPct, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const rows = await getCampaignPerformance("LAST_30_DAYS");

  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.clicks += r.clicks;
      acc.cost_usd += r.cost_usd;
      acc.conversions += r.conversions;
      return acc;
    },
    { impressions: 0, clicks: 0, cost_usd: 0, conversions: 0 },
  );
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const cpa =
    totals.conversions > 0 ? totals.cost_usd / totals.conversions : 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="text-roji-muted text-sm mt-1">
          Last 30 days · all campaigns
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
        <MetricCard label="Impressions" value={fmtInt(totals.impressions)} />
        <MetricCard label="Clicks" value={fmtInt(totals.clicks)} hint={`${fmtPct(ctr)} CTR`} />
        <MetricCard label="Spend" value={fmtUsd(totals.cost_usd)} />
        <MetricCard label="Conversions" value={fmtInt(totals.conversions)} />
        <MetricCard label="CPA" value={fmtUsd(cpa)} />
      </section>

      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
          Per campaign
        </h2>
        <div className="roji-card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3 text-right">Impr.</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3 text-right">CPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-roji-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="text-roji-text">{r.name}</div>
                    <div className="text-[10px] font-mono text-roji-dim mt-0.5">
                      {r.id} · {r.status}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {fmtInt(r.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {fmtInt(r.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-text">
                    {fmtUsd(r.cost_usd)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-muted">
                    {fmtInt(r.conversions)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-roji-text">
                    {fmtUsd(r.cost_per_conversion_usd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
