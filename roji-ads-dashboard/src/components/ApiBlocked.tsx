import { apiMode } from "@/lib/google-ads";

/**
 * Shown on dashboard pages when the Google Ads API call throws.
 *
 * Most common cause today: developer token in TEST mode being called
 * against a production customer. Once Basic Access is approved, this
 * should never appear again (unless Google has an outage or credentials
 * are wrong).
 */
export function ApiBlocked({
  pageLabel,
  error,
}: {
  pageLabel: string;
  error: unknown;
}) {
  const message =
    error instanceof Error ? error.message : "Unknown error from Google Ads API.";
  const mode = apiMode();

  // Heuristic: pull the "actionable" sentence out of our wrapApiCall messages.
  // They're formatted "[label] <human message> Apply for ... at <url>."
  const cleanMessage = message.replace(/^\[[^\]]+]\s*/, "");

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">{pageLabel}</h1>
      </header>
      <div className="roji-card border border-roji-warning/40 bg-roji-warning/5">
        <div className="text-xs font-mono uppercase tracking-widest text-roji-warning mb-2">
          {mode === "test" ? "Test mode" : "API call failed"}
        </div>
        <p className="text-sm text-roji-text leading-relaxed">{cleanMessage}</p>
        <p className="text-xs text-roji-muted mt-4">
          The dashboard will populate automatically once Google Ads accepts the
          request. No code changes needed.
        </p>
      </div>
    </div>
  );
}
