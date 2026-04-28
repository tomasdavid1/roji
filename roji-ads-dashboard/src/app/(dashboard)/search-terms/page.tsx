import { identifyRiskySearchTerms } from "@/lib/google-ads";
import { MASTER_NEGATIVE_KEYWORDS } from "@/lib/negative-keywords";
import { ApiBlocked } from "@/components/ApiBlocked";
import { MineSearchTermsButton } from "@/components/MineSearchTermsButton";
import { fmtInt, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchTermsPage() {
  let risky;
  try {
    risky = await identifyRiskySearchTerms("LAST_7_DAYS");
  } catch (err) {
    return <ApiBlocked pageLabel="Search terms" error={err} />;
  }

  // Group by campaign for display
  const byCampaign = new Map<string, typeof risky>();
  for (const t of risky) {
    const arr = byCampaign.get(t.campaign_id) ?? [];
    arr.push(t);
    byCampaign.set(t.campaign_id, arr);
  }

  const totalRisky = risky.length;
  const alreadyNegated = risky.filter((r) => r.already_negated).length;
  const actionable = totalRisky - alreadyNegated;
  const wastedSpend = risky
    .filter((r) => !r.already_negated)
    .reduce((sum, r) => sum + r.cost_usd, 0);

  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Search terms</h1>
          <p className="text-roji-muted text-sm mt-1 max-w-2xl">
            Search terms from the last 7 days that match the master
            negative-keyword list (
            <span className="font-mono">{MASTER_NEGATIVE_KEYWORDS.length}</span>{" "}
            patterns). New matches are auto-added as campaign negatives by a
            daily cron — you can also trigger it manually.
          </p>
        </div>
        <MineSearchTermsButton />
      </header>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <div className="roji-card">
          <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
            Risky terms found
          </div>
          <div className="text-2xl font-semibold mt-1">{fmtInt(totalRisky)}</div>
        </div>
        <div className="roji-card">
          <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
            Already negated
          </div>
          <div className="text-2xl font-semibold mt-1 text-roji-success">
            {fmtInt(alreadyNegated)}
          </div>
        </div>
        <div className="roji-card">
          <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim">
            Actionable / wasted spend
          </div>
          <div className="text-2xl font-semibold mt-1 text-roji-warning">
            {fmtInt(actionable)}{" "}
            <span className="text-sm font-normal text-roji-muted">
              · {fmtUsd(wastedSpend)}
            </span>
          </div>
        </div>
      </section>

      {totalRisky === 0 && (
        <div className="roji-card text-center text-sm text-roji-muted py-12">
          No risky search terms in the last 7 days. Account is clean.
        </div>
      )}

      {Array.from(byCampaign.entries()).map(([campId, terms]) => (
        <section key={campId} className="mb-8">
          <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
            {terms[0].campaign_name}
          </h2>
          <div className="roji-card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                  <th className="px-4 py-3">Search term</th>
                  <th className="px-4 py-3">Triggered by</th>
                  <th className="px-4 py-3 text-right">Impr.</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr
                    key={`${t.campaign_id}-${t.search_term}`}
                    className="border-b border-roji-border last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-roji-text">
                      {t.search_term}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.matched_negatives.map((n) => (
                          <span
                            key={n.term}
                            title={n.reason}
                            className="roji-pill-warning"
                          >
                            {n.term}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-roji-muted">
                      {fmtInt(t.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-roji-muted">
                      {fmtInt(t.clicks)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-roji-text">
                      {fmtUsd(t.cost_usd)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.already_negated ? (
                        <span className="roji-pill-success">Negated</span>
                      ) : (
                        <span className="roji-pill-warning">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
