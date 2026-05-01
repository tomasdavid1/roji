"use client";

import { useEffect, useState } from "react";

import { track } from "@/lib/track";
import { PostResultCTA } from "./PostResultCTA";

interface Row {
  id: string;
  vendor: string;
  vialMg: number;
  priceUsd: number;
  shippingUsd: number;
  /** Optional purity %. If supplied, real peptide content = vialMg * purity/100. */
  purity?: number;
}

export function CostPerDoseCalculator() {
  const [doseMcg, setDoseMcg] = useState(250);
  const [rows, setRows] = useState<Row[]>([
    { id: rid(), vendor: "Vendor A", vialMg: 5, priceUsd: 54, shippingUsd: 10, purity: 99 },
    { id: rid(), vendor: "Vendor B", vialMg: 5, priceUsd: 45, shippingUsd: 12, purity: 96 },
    { id: rid(), vendor: "Roji", vialMg: 5, priceUsd: 49, shippingUsd: 0, purity: 99.5 },
  ]);
  const [hasInteracted, setHasInteracted] = useState(false);
  useEffect(() => {
    if (hasInteracted) return;
    if (doseMcg !== 250 || rows.length !== 3) {
      setHasInteracted(true);
    }
  }, [doseMcg, rows, hasInteracted]);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  const add = () => {
    setRows((rs) => [
      ...rs,
      { id: rid(), vendor: `Vendor ${String.fromCharCode(65 + rs.length)}`, vialMg: 5, priceUsd: 50, shippingUsd: 10, purity: 99 },
    ]);
    track("cost_add_row", {});
  };

  const computed = rows.map((r) => {
    const totalCost = r.priceUsd + r.shippingUsd;
    const effectiveMg = r.vialMg * ((r.purity ?? 100) / 100);
    const effectiveMcg = effectiveMg * 1000;
    const dosesPerVial = doseMcg > 0 ? effectiveMcg / doseMcg : 0;
    const costPerMg = effectiveMg > 0 ? totalCost / effectiveMg : 0;
    const costPerDose = dosesPerVial > 0 ? totalCost / dosesPerVial : 0;
    return { ...r, totalCost, effectiveMg, dosesPerVial, costPerMg, costPerDose };
  });

  const cheapest = [...computed].sort((a, b) => a.costPerDose - b.costPerDose)[0];

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="roji-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-roji-muted">Target dose (mcg)</span>
            <input
              type="number"
              className="roji-input w-40"
              min={1}
              step={1}
              value={doseMcg}
              onChange={(e) => setDoseMcg(Number(e.target.value))}
            />
          </label>
          <button onClick={add} className="roji-btn">
            + Add vendor
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-roji border border-roji-border bg-roji-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-roji-border text-left text-[11px] font-mono uppercase tracking-wider text-roji-muted">
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Vial mg</th>
              <th className="px-4 py-3">Purity %</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Ship</th>
              <th className="px-4 py-3 text-right">$ / mg</th>
              <th className="px-4 py-3 text-right">$ / dose</th>
              <th className="px-4 py-3 text-right">Doses</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {computed.map((r) => {
              const isBest = cheapest && r.id === cheapest.id;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-roji-border last:border-b-0 ${
                    isBest ? "bg-roji-accent/5" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <input
                      className="roji-input text-sm"
                      value={r.vendor}
                      onChange={(e) => update(r.id, { vendor: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.5"
                      className="roji-input w-24 text-sm"
                      value={r.vialMg}
                      onChange={(e) =>
                        update(r.id, { vialMg: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.1"
                      min={50}
                      max={100}
                      className="roji-input w-24 text-sm"
                      value={r.purity ?? ""}
                      onChange={(e) =>
                        update(r.id, {
                          purity: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      className="roji-input w-28 text-sm"
                      value={r.priceUsd}
                      onChange={(e) => update(r.id, { priceUsd: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      className="roji-input w-24 text-sm"
                      value={r.shippingUsd}
                      onChange={(e) => update(r.id, { shippingUsd: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    ${r.costPerMg.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-roji-accent">
                    ${r.costPerDose.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-roji-muted">
                    {r.dosesPerVial.toFixed(0)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(r.id)}
                      className="text-roji-dim hover:text-roji-danger"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cheapest && (
        <div className="mt-6 rounded-roji border border-roji-success/40 bg-roji-success/5 p-4 text-sm">
          <span className="font-mono uppercase tracking-wider text-roji-success">
            Best $/dose:
          </span>{" "}
          <span className="text-roji-text">{cheapest.vendor}</span> at{" "}
          <span className="font-mono text-roji-success">
            ${cheapest.costPerDose.toFixed(2)} / dose
          </span>{" "}
          (
          <span className="font-mono">{cheapest.dosesPerVial.toFixed(0)}</span>{" "}
          doses per vial after adjusting for purity).
        </div>
      )}

      {hasInteracted && (
        <PostResultCTA
          toolSlug="cost-per-dose"
          title="Compare Roji's actual pricing — Janoshik-verified, ≥99% purity, transparent COAs."
          buttonLabel="See our pricing →"
        />
      )}

      <p className="mt-4 text-[12px] text-roji-dim leading-relaxed">
        Real cost = (price + shipping) ÷ effective peptide mass. We multiply
        vial mg by reported purity to get effective peptide content. If a
        vendor doesn't disclose purity, set it to 100% — and treat that as
        a red flag in our COA Verifier.
      </p>
    </section>
  );
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}
