import { Nav } from "@/components/Nav";
import { isLive } from "@/lib/google-ads";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = isLive();
  return (
    <>
      <Nav live={live} />
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      {!live && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="roji-card border-roji-warning/20 bg-roji-warning/[0.03] text-xs text-roji-muted">
            <strong className="text-roji-warning block mb-1 text-sm font-mono uppercase tracking-widest">
              Mock data
            </strong>
            Google Ads API credentials are missing. The dashboard is rendering
            sample data so you can develop the UI. To go live, fill in
            GOOGLE_ADS_* in <code>.env.local</code> and restart the dev server.
          </div>
        </div>
      )}
    </>
  );
}
