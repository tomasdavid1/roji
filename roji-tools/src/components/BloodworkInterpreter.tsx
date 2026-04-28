"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MARKERS,
  findRange,
  flag,
  type FlagLevel,
  type Marker,
  type Sex,
} from "@/data/blood-markers";
import { track } from "@/lib/track";

interface PanelSnapshot {
  id: string;
  date: string;
  sex: Sex;
  age: number;
  values: Record<string, number>;
}

const STORAGE_KEY = "roji-tools.bloodwork.v1";

export function BloodworkInterpreter() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(35);
  const [values, setValues] = useState<Record<string, string>>({});
  const [panels, setPanels] = useState<PanelSnapshot[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPanels(JSON.parse(raw) as PanelSnapshot[]);
    } catch {
      /* noop */
    }
  }, []);

  const grouped = useMemo(() => {
    return MARKERS.reduce<Record<string, Marker[]>>((acc, m) => {
      (acc[m.group] = acc[m.group] || []).push(m);
      return acc;
    }, {});
  }, []);

  const numericValues = useMemo(() => {
    const out: Record<string, number> = {};
    Object.entries(values).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (Number.isFinite(n)) out[k] = n;
    });
    return out;
  }, [values]);

  const filledCount = Object.keys(numericValues).length;

  const savePanel = () => {
    if (filledCount === 0) return;
    const snap: PanelSnapshot = {
      id: Math.random().toString(36).slice(2, 10),
      date: new Date().toISOString().slice(0, 10),
      sex,
      age,
      values: numericValues,
    };
    const next = [snap, ...panels].slice(0, 12);
    setPanels(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    track("bloodwork_panel_saved", { markers: filledCount });
  };

  const loadPanel = (id: string) => {
    const p = panels.find((x) => x.id === id);
    if (!p) return;
    setSex(p.sex);
    setAge(p.age);
    setValues(
      Object.fromEntries(
        Object.entries(p.values).map(([k, v]) => [k, String(v)]),
      ),
    );
  };

  const removePanel = (id: string) => {
    const next = panels.filter((p) => p.id !== id);
    setPanels(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const summaryFlags = useMemo(() => {
    const issues: { marker: Marker; level: FlagLevel; value: number }[] = [];
    for (const [slug, value] of Object.entries(numericValues)) {
      const m = MARKERS.find((mm) => mm.slug === slug);
      if (!m) continue;
      const r = findRange(m, sex, age);
      if (!r) continue;
      const f = flag(value, r);
      if (f !== "ok") issues.push({ marker: m, level: f, value });
    }
    return issues;
  }, [numericValues, sex, age]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="roji-card">
            <div className="roji-mono-label mb-3">About you</div>
            <div className="grid gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-roji-muted">Sex</span>
                <select
                  className="roji-select"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-roji-muted">Age</span>
                <input
                  type="number"
                  min={18}
                  max={100}
                  className="roji-input"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="mt-4 text-xs text-roji-dim">
              Reference ranges adjust automatically based on sex and age.
            </div>
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-3">Save / load panels</div>
            <button
              onClick={savePanel}
              disabled={filledCount === 0}
              className="roji-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save current panel ({filledCount})
            </button>
            <p className="mt-2 text-[11px] text-roji-dim">
              Panels are stored locally in your browser. Nothing is uploaded.
            </p>
            {!!panels.length && (
              <div className="mt-4 grid gap-2">
                {panels.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-roji border border-roji-border bg-roji-dark px-3 py-2 text-xs"
                  >
                    <button
                      onClick={() => loadPanel(p.id)}
                      className="text-left text-roji-text hover:text-roji-accent"
                    >
                      {p.date} ·{" "}
                      <span className="text-roji-muted">
                        {Object.keys(p.values).length} markers
                      </span>
                    </button>
                    <button
                      onClick={() => removePanel(p.id)}
                      className="text-roji-dim hover:text-roji-danger"
                      aria-label="Remove panel"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summaryFlags.length > 0 && (
            <div className="rounded-roji border border-roji-warning/40 bg-roji-warning/5 p-4">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-roji-warning">
                Out of range ({summaryFlags.length})
              </div>
              <ul className="space-y-1 text-xs">
                {summaryFlags.map((s) => (
                  <li key={s.marker.slug} className="flex justify-between gap-2">
                    <span>{s.marker.label}</span>
                    <span
                      className="font-mono"
                      style={{ color: levelColor(s.level) }}
                    >
                      {s.value} {s.marker.unit} · {labelForLevel(s.level)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          {Object.entries(grouped).map(([group, markers]) => (
            <div key={group} className="roji-card">
              <div className="roji-mono-label mb-3">{group}</div>
              <div className="grid gap-4">
                {markers.map((m) => (
                  <MarkerRow
                    key={m.slug}
                    marker={m}
                    sex={sex}
                    age={age}
                    raw={values[m.slug] ?? ""}
                    onChange={(v) =>
                      setValues((prev) => ({ ...prev, [m.slug]: v }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarkerRow({
  marker,
  sex,
  age,
  raw,
  onChange,
}: {
  marker: Marker;
  sex: Sex;
  age: number;
  raw: string;
  onChange: (v: string) => void;
}) {
  const range = findRange(marker, sex, age);
  const num = parseFloat(raw);
  const haveNum = Number.isFinite(num);
  const level: FlagLevel | null = haveNum && range ? flag(num, range) : null;

  return (
    <div className="grid grid-cols-[1.5fr_1fr_2fr] items-center gap-3 border-b border-roji-border pb-3 last:border-b-0 last:pb-0">
      <div>
        <div className="text-sm font-medium" title={marker.description}>
          {marker.label}
        </div>
        <div className="text-[11px] text-roji-muted">{marker.unit}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          className="roji-input text-sm"
          value={raw}
          placeholder={range ? `${range.low}–${range.high}` : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        {range && <RangeBar range={range} value={haveNum ? num : null} />}
        {level && level !== "ok" && (
          <div
            className="text-[11px] font-mono uppercase tracking-wider"
            style={{ color: levelColor(level) }}
          >
            {labelForLevel(level)} ·{" "}
            <span className="text-roji-muted normal-case tracking-normal">
              {level.includes("low") ? marker.lowMeans : marker.highMeans}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RangeBar({
  range,
  value,
}: {
  range: { low: number; high: number };
  value: number | null;
}) {
  // Visual scale extends 30% below low and 30% above high so values out of
  // range still position visibly.
  const span = range.high - range.low;
  const scaleLo = range.low - span * 0.3;
  const scaleHi = range.high + span * 0.3;
  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - scaleLo) / (scaleHi - scaleLo)) * 100));
  return (
    <div className="relative h-3 rounded-full bg-white/5">
      <div
        className="absolute inset-y-0 rounded-full bg-roji-success/30"
        style={{
          left: `${pct(range.low)}%`,
          width: `${pct(range.high) - pct(range.low)}%`,
        }}
      />
      {value !== null && (
        <div
          className="absolute -top-[3px] h-[18px] w-[3px] rounded bg-roji-text shadow"
          style={{ left: `calc(${pct(value)}% - 1.5px)` }}
        />
      )}
      <div className="absolute -bottom-4 left-0 text-[9px] font-mono text-roji-dim">
        {range.low}
      </div>
      <div className="absolute -bottom-4 right-0 text-[9px] font-mono text-roji-dim">
        {range.high}
      </div>
    </div>
  );
}

function levelColor(level: FlagLevel): string {
  switch (level) {
    case "critical-low":
    case "critical-high":
      return "var(--roji-danger)";
    case "low":
    case "high":
      return "var(--roji-warning)";
    default:
      return "var(--roji-success)";
  }
}

function labelForLevel(level: FlagLevel): string {
  switch (level) {
    case "critical-low":
      return "Critically low";
    case "critical-high":
      return "Critically high";
    case "low":
      return "Below range";
    case "high":
      return "Above range";
    default:
      return "In range";
  }
}
