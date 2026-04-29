import { useState } from "react";

interface ToolData {
  toolName: string;
  [key: string]: unknown;
}

interface Row {
  id: string;
  vendor: string;
  vialMg: number;
  priceUsd: number;
  shippingUsd: number;
  purity?: number;
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CostPerDoseWidget({ data }: { data: ToolData }) {
  const initial = data as ToolData & { doseMcg?: number; vendors?: Row[] };

  const [doseMcg, setDoseMcg] = useState(initial.doseMcg ?? 250);
  const [rows, setRows] = useState<Row[]>(
    initial.vendors?.map((v) => ({ ...v, id: rid() })) ?? [
      { id: rid(), vendor: "Vendor A", vialMg: 5, priceUsd: 54, shippingUsd: 10, purity: 99 },
      { id: rid(), vendor: "Vendor B", vialMg: 5, priceUsd: 45, shippingUsd: 12, purity: 96 },
      { id: rid(), vendor: "Roji", vialMg: 5, priceUsd: 49, shippingUsd: 0, purity: 99.5 },
    ],
  );

  const update = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  const add = () =>
    setRows((rs) => [
      ...rs,
      { id: rid(), vendor: `Vendor ${String.fromCharCode(65 + rs.length)}`, vialMg: 5, priceUsd: 50, shippingUsd: 10, purity: 99 },
    ]);

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
    <div style={{ padding: 16 }}>
      <div className="roji-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <label>
            <span className="roji-label">Target dose (mcg)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={doseMcg}
              onChange={(e) => setDoseMcg(Number(e.target.value))}
              style={{ width: 140 }}
            />
          </label>
          <button onClick={add} className="roji-btn">+ Add vendor</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--roji-border)" }}>
              {["Vendor", "Vial mg", "Purity %", "Price", "Ship", "$/mg", "$/dose", "Doses", ""].map((h) => (
                <th key={h} style={{
                  padding: "8px 10px",
                  textAlign: h === "$/mg" || h === "$/dose" || h === "Doses" ? "right" : "left",
                  fontSize: 11,
                  fontFamily: "var(--roji-font-mono)",
                  color: "var(--roji-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {computed.map((r) => {
              const isBest = cheapest && r.id === cheapest.id;
              return (
                <tr key={r.id} style={{
                  borderBottom: "1px solid var(--roji-border)",
                  background: isBest ? "rgba(79,109,245,0.05)" : undefined,
                }}>
                  <td style={{ padding: "6px 10px" }}>
                    <input value={r.vendor} onChange={(e) => update(r.id, { vendor: e.target.value })} style={{ width: "100%" }} />
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input type="number" step="0.5" value={r.vialMg} onChange={(e) => update(r.id, { vialMg: Number(e.target.value) })} style={{ width: 70 }} />
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input type="number" step="0.1" min={50} max={100} value={r.purity ?? ""} onChange={(e) => update(r.id, { purity: e.target.value === "" ? undefined : Number(e.target.value) })} style={{ width: 70 }} />
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input type="number" step="0.01" value={r.priceUsd} onChange={(e) => update(r.id, { priceUsd: Number(e.target.value) })} style={{ width: 80 }} />
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input type="number" step="0.01" value={r.shippingUsd} onChange={(e) => update(r.id, { shippingUsd: Number(e.target.value) })} style={{ width: 70 }} />
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--roji-font-mono)" }}>
                    ${r.costPerMg.toFixed(2)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--roji-font-mono)", color: "var(--roji-accent)" }}>
                    ${r.costPerDose.toFixed(2)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--roji-font-mono)", color: "var(--roji-text-muted)" }}>
                    {r.dosesPerVial.toFixed(0)}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>
                    <button
                      onClick={() => remove(r.id)}
                      style={{ background: "none", border: "none", color: "var(--roji-text-muted)", cursor: "pointer", fontSize: 16 }}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cheapest && (
        <div style={{
          padding: 12,
          borderRadius: "var(--roji-radius)",
          border: "1px solid rgba(34,197,94,0.4)",
          background: "rgba(34,197,94,0.05)",
          fontSize: 13,
        }}>
          <span style={{ fontFamily: "var(--roji-font-mono)", color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Best $/dose:</span>{" "}
          <span style={{ color: "var(--roji-text-primary)" }}>{cheapest.vendor}</span> at{" "}
          <span style={{ fontFamily: "var(--roji-font-mono)", color: "#22c55e" }}>${cheapest.costPerDose.toFixed(2)}/dose</span>{" "}
          ({cheapest.dosesPerVial.toFixed(0)} doses per vial)
        </div>
      )}
    </div>
  );
}
