import { Nav } from "@/components/Nav";
import { apiMode } from "@/lib/google-ads";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = apiMode();
  return (
    <>
      <Nav mode={mode} />
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      {mode === "mock" && (
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
      {mode === "test" && (
        <div className="max-w-6xl mx-auto px-6 pb-10">
          <div className="roji-card border-roji-warning/20 bg-roji-warning/[0.03] text-xs text-roji-muted">
            <strong className="text-roji-warning block mb-1 text-sm font-mono uppercase tracking-widest">
              Test mode
            </strong>
            Your developer token is enabled for Test Account Access only.
            Production calls (e.g. customer 667-978-0942) will fail until you
            apply for Basic Access at{" "}
            <a
              href="https://ads.google.com/aw/apicenter"
              target="_blank"
              rel="noreferrer"
              className="text-roji-accent"
            >
              ads.google.com/aw/apicenter
            </a>
            .
          </div>
        </div>
      )}
    </>
  );
}
