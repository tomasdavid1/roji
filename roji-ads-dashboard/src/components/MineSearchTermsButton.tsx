"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MineSearchTermsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/ads/search-terms", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; total_added?: number; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(`Added ${json.total_added ?? 0} new negative keyword(s).`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        type="button"
        disabled={pending}
        onClick={run}
        className="roji-btn"
      >
        {pending ? "Mining…" : "Run mining now"}
      </button>
      {result && <span className="text-xs text-roji-success">{result}</span>}
      {error && <span className="text-xs text-roji-warning">{error}</span>}
    </div>
  );
}
