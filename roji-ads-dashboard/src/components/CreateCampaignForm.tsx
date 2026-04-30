"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState(20);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const r = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, daily_budget_usd: budget }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Request failed");
        setStatus("err");
        return;
      }
      setStatus("ok");
      setName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setStatus("err");
    }
  }

  return (
    <form onSubmit={submit} className="roji-card space-y-4">
      <div>
        <label className="block text-[10px] font-mono uppercase tracking-widest text-roji-muted mb-2">
          Campaign name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Research Tools — Search (US)"
          className="roji-input"
          required
          minLength={3}
        />
        <p className="text-[11px] text-roji-dim mt-1.5">
          Avoid: peptide, compound names, dosing, healing, injection,
          &quot;protocol&quot;.
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-widest text-roji-muted mb-2">
          Daily budget (USD)
        </label>
        <input
          type="number"
          min={1}
          step={1}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value) || 0)}
          className="roji-input"
          required
        />
      </div>

      {error && (
        <div className="text-xs text-roji-danger border border-roji-danger/30 rounded-roji p-3">
          {error}
        </div>
      )}
      {status === "ok" && (
        <div className="text-xs text-roji-success border border-roji-success/30 rounded-roji p-3">
          Campaign created (paused). Add ad groups + keywords next.
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="roji-btn-primary"
      >
        {status === "loading" ? "Creating…" : "Create campaign (paused)"}
      </button>
    </form>
  );
}
