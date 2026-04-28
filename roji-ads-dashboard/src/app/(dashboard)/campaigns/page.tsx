import { getCampaignPerformance } from "@/lib/google-ads";
import { CreateCampaignForm } from "@/components/CreateCampaignForm";
import { fmtInt, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const rows = await getCampaignPerformance("LAST_30_DAYS");

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-roji-muted text-sm mt-1">
          Manage Google Ads search campaigns. New campaigns are created paused.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section>
          <div className="roji-card !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Spend (30d)</th>
                  <th className="px-4 py-3 text-right">Conv. (30d)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-roji-muted text-sm"
                    >
                      No campaigns yet. Create one with the form on the right.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-roji-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="text-roji-text">{r.name}</div>
                      <div className="text-[10px] font-mono text-roji-dim mt-0.5">
                        {r.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.status === "ENABLED"
                            ? "roji-pill-success"
                            : r.status === "PAUSED"
                              ? "roji-pill-warning"
                              : "roji-pill-muted"
                        }
                      >
                        {r.status}
                      </span>
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
        </section>

        <aside>
          <h2 className="text-sm font-mono uppercase tracking-widest text-roji-muted mb-3">
            New campaign
          </h2>
          <CreateCampaignForm />
        </aside>
      </div>
    </div>
  );
}
