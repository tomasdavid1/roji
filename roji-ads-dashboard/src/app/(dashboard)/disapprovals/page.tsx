import { getDisapprovedAds } from "@/lib/google-ads";
import { ApiBlocked } from "@/components/ApiBlocked";

export const dynamic = "force-dynamic";

export default async function DisapprovalsPage() {
  let disapproved;
  try {
    disapproved = await getDisapprovedAds();
  } catch (err) {
    return <ApiBlocked pageLabel="Disapprovals" error={err} />;
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Ad disapprovals</h1>
        <p className="text-roji-muted text-sm mt-1 max-w-2xl">
          Ads currently disapproved or limited by Google. The hourly cron
          auto-pauses these to prevent account-level review (per the
          strategy doc: &quot;multiple disapprovals can trigger account-level
          review&quot;).
        </p>
      </header>

      {disapproved.length === 0 ? (
        <div className="roji-card text-center text-sm text-roji-success py-12">
          No disapproved ads. Account is clean.
        </div>
      ) : (
        <div className="roji-card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-roji-dim border-b border-roji-border">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Ad group</th>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Policy topics</th>
              </tr>
            </thead>
            <tbody>
              {disapproved.map((d) => (
                <tr
                  key={d.ad_id}
                  className="border-b border-roji-border last:border-0"
                >
                  <td className="px-4 py-3 text-roji-text">{d.campaign_name}</td>
                  <td className="px-4 py-3 text-roji-muted">{d.ad_group_name}</td>
                  <td className="px-4 py-3 font-mono text-roji-dim">{d.ad_id}</td>
                  <td className="px-4 py-3">
                    <span className="roji-pill-warning">{d.approval_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {d.policy_topics.length === 0 ? (
                        <span className="text-roji-dim text-xs">—</span>
                      ) : (
                        d.policy_topics.map((t) => (
                          <span key={t} className="roji-pill-muted">
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
