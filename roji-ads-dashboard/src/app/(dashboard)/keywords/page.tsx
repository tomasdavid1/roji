import { getKeywordPerformance } from "@/lib/google-ads";
import { fmtInt, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const rows = await getKeywordPerformance("LAST_30_DAYS");

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Keywords</h1>
        <p className="text-roji-muted text-sm mt-1">
          Last 30 days · all enabled keywords
        </p>
      </header>

      <div className="roji-card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
              <th className="px-4 py-3">Keyword</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3 text-right">Impr.</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3 text-right">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.campaign_id}-${r.keyword_text}-${i}`}
                className="border-b border-roji-border last:border-0"
              >
                <td className="px-4 py-3 font-mono text-roji-text">
                  {r.keyword_text}
                </td>
                <td className="px-4 py-3">
                  <span className="roji-pill-muted">{r.match_type}</span>
                </td>
                <td className="px-4 py-3 text-roji-muted">
                  {r.campaign_name}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
