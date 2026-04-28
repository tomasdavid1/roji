import {
  getReviewsSummary,
  trustpilotMode,
  type TrustpilotSummary,
} from "@/lib/trustpilot";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-roji-warning tracking-tight" aria-label={`${value} stars`}>
      {"★".repeat(full)}
      <span className="text-roji-dim">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}

export async function TrustpilotSummaryCard() {
  const mode = trustpilotMode();
  let summary: TrustpilotSummary | null = null;
  let error: string | null = null;
  try {
    summary = await getReviewsSummary();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (mode === "mock") {
    return (
      <div className="roji-card">
        <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
          Trustpilot
        </div>
        <p className="text-sm text-roji-muted">
          Not configured. Set <code className="font-mono text-xs">TRUSTPILOT_*</code> env
          vars to surface review summary here.
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="roji-card border border-roji-warning/40 bg-roji-warning/5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-roji-warning mb-2">
          Trustpilot — error
        </div>
        <p className="text-xs text-roji-muted leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <a
      href={summary.profile_url}
      target="_blank"
      rel="noopener nofollow"
      className="roji-card hover:bg-white/[0.02] transition-colors block"
    >
      <div className="text-[10px] font-mono uppercase tracking-widest text-roji-dim mb-2">
        Trustpilot
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">
          {summary.trust_score.toFixed(1)}
        </span>
        <Stars value={summary.stars} />
      </div>
      <div className="text-xs text-roji-muted mt-1">
        {summary.number_of_reviews.toLocaleString()} review
        {summary.number_of_reviews === 1 ? "" : "s"} · {summary.display_name}
      </div>
    </a>
  );
}
