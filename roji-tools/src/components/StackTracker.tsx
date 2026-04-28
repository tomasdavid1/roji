"use client";

import { useEffect, useMemo, useState } from "react";

import {
  load,
  newId,
  recentAverages,
  save,
  todayIso,
  type Frequency,
  type LogEntry,
  type StackItem,
  type TrackerState,
} from "@/lib/tracker-store";
import { track } from "@/lib/track";

const METRIC_KEYS = [
  ["energy", "Energy"],
  ["sleepQuality", "Sleep"],
  ["recovery", "Recovery"],
  ["mood", "Mood"],
  ["libido", "Libido"],
] as const;

export function StackTracker() {
  const [state, setState] = useState<TrackerState>({ items: [], log: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  // ─── Items ───────────────────────────────────────────────────
  const [newItem, setNewItem] = useState({
    name: "",
    doseLabel: "",
    frequency: "daily" as Frequency,
  });

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const item: StackItem = {
      id: newId(),
      name: newItem.name.trim(),
      doseLabel: newItem.doseLabel.trim(),
      frequency: newItem.frequency,
      startedOn: todayIso(),
    };
    setState((s) => ({ ...s, items: [...s.items, item] }));
    setNewItem({ name: "", doseLabel: "", frequency: "daily" });
    track("tracker_item_added", {});
  };

  const archiveItem = (id: string) =>
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === id ? { ...i, archived: !i.archived } : i,
      ),
    }));

  const removeItem = (id: string) =>
    setState((s) => ({
      ...s,
      items: s.items.filter((i) => i.id !== id),
      log: s.log.map((e) => ({
        ...e,
        dosedItemIds: e.dosedItemIds.filter((x) => x !== id),
      })),
    }));

  // ─── Log ─────────────────────────────────────────────────────
  const today = todayIso();
  const todayEntry = state.log.find((e) => e.date === today);

  const upsertLog = (patch: Partial<LogEntry>) => {
    setState((s) => {
      const idx = s.log.findIndex((e) => e.date === today);
      if (idx >= 0) {
        const next = [...s.log];
        next[idx] = { ...next[idx], ...patch };
        return { ...s, log: next };
      }
      const fresh: LogEntry = {
        id: newId(),
        date: today,
        energy: 5,
        sleepQuality: 5,
        recovery: 5,
        mood: 5,
        libido: 5,
        dosedItemIds: [],
        ...patch,
      };
      return { ...s, log: [...s.log, fresh] };
    });
  };

  const toggleDosed = (itemId: string) => {
    const cur = todayEntry?.dosedItemIds ?? [];
    upsertLog({
      dosedItemIds: cur.includes(itemId)
        ? cur.filter((x) => x !== itemId)
        : [...cur, itemId],
    });
    track("tracker_dose_logged", {});
  };

  const averages = useMemo(() => recentAverages(state.log, 7), [state.log]);

  // ─── Trend chart data: last 30 days, energy + sleep ─────────
  const trend = useMemo(() => {
    return [...state.log]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(-30);
  }, [state.log]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <div className="roji-card">
            <div className="roji-mono-label mb-3">Your stack</div>
            <div className="grid grid-cols-[1fr_120px_120px_auto] gap-2 mb-3">
              <input
                className="roji-input text-sm"
                placeholder="Compound or supplement"
                value={newItem.name}
                onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                className="roji-input text-sm"
                placeholder="Dose"
                value={newItem.doseLabel}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, doseLabel: e.target.value }))
                }
              />
              <select
                className="roji-select text-sm"
                value={newItem.frequency}
                onChange={(e) =>
                  setNewItem((p) => ({
                    ...p,
                    frequency: e.target.value as Frequency,
                  }))
                }
              >
                <option value="daily">Daily</option>
                <option value="eod">EOD</option>
                <option value="weekly">Weekly</option>
                <option value="as-needed">As needed</option>
              </select>
              <button onClick={addItem} className="roji-btn-primary">
                +
              </button>
            </div>
            <div className="space-y-2">
              {state.items
                .filter((i) => !i.archived)
                .map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    dosed={!!todayEntry?.dosedItemIds.includes(item.id)}
                    onToggleDose={() => toggleDosed(item.id)}
                    onArchive={() => archiveItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              {state.items.filter((i) => !i.archived).length === 0 && (
                <p className="py-2 text-sm text-roji-muted">
                  No items yet. Add what you're currently taking.
                </p>
              )}
              {state.items.some((i) => i.archived) && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-roji-muted">
                    Archived ({state.items.filter((i) => i.archived).length})
                  </summary>
                  <div className="mt-3 space-y-2 opacity-70">
                    {state.items
                      .filter((i) => i.archived)
                      .map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          dosed={false}
                          onToggleDose={() => toggleDosed(item.id)}
                          onArchive={() => archiveItem(item.id)}
                          onRemove={() => removeItem(item.id)}
                        />
                      ))}
                  </div>
                </details>
              )}
            </div>
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-3">Today — {today}</div>
            <div className="grid gap-3">
              {METRIC_KEYS.map(([key, label]) => (
                <SliderRow
                  key={key}
                  label={label}
                  value={(todayEntry?.[key] as number) ?? 5}
                  onChange={(v) => upsertLog({ [key]: v } as Partial<LogEntry>)}
                />
              ))}
              <textarea
                className="roji-input min-h-[64px] text-sm"
                placeholder="Notes (optional) — what changed, side effects, training, etc."
                value={todayEntry?.notes ?? ""}
                onChange={(e) => upsertLog({ notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="roji-card">
            <div className="roji-mono-label mb-3">7-day averages</div>
            {averages.n === 0 ? (
              <p className="text-sm text-roji-muted">
                No log entries yet. Today's first save populates this panel.
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {METRIC_KEYS.map(([key, label]) => (
                  <div key={key}>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-roji-muted">
                      {label}
                    </div>
                    <div className="mt-1 font-mono text-2xl text-roji-accent">
                      {averages[key].toFixed(1)}
                    </div>
                    <div className="text-[11px] text-roji-dim">/ 10</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-3">Trend (last 30 days)</div>
            {trend.length < 2 ? (
              <p className="text-sm text-roji-muted">
                Need 2+ daily entries to draw a trend. Keep at it.
              </p>
            ) : (
              <TrendChart entries={trend} />
            )}
          </div>

          <div className="roji-card">
            <div className="roji-mono-label mb-3">Storage</div>
            <p className="text-sm text-roji-muted leading-relaxed">
              Everything you log is stored only in this browser. No account,
              no upload. To back up or move: export JSON below.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => exportJson(state)}
                className="roji-btn text-sm"
              >
                Export JSON
              </button>
              <ImportJsonButton onImport={(s) => setState(s)} />
              <button
                onClick={() => {
                  if (
                    confirm(
                      "This will delete all tracker data on this browser. Continue?",
                    )
                  ) {
                    setState({ items: [], log: [] });
                  }
                }}
                className="roji-btn text-sm text-roji-danger hover:border-roji-danger"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ItemRow({
  item,
  dosed,
  onToggleDose,
  onArchive,
  onRemove,
}: {
  item: StackItem;
  dosed: boolean;
  onToggleDose: () => void;
  onArchive: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-roji border border-roji-border bg-roji-dark px-3 py-2">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={dosed}
          onChange={onToggleDose}
          className="h-4 w-4 accent-roji-accent"
        />
        <div className="flex-1">
          <div className="text-sm font-medium">{item.name}</div>
          <div className="text-[12px] text-roji-muted">
            {item.doseLabel || "—"} · {item.frequency}
          </div>
        </div>
      </label>
      <button
        onClick={onArchive}
        className="text-xs text-roji-dim hover:text-roji-text"
        title={item.archived ? "Restore" : "Archive"}
      >
        {item.archived ? "Restore" : "Archive"}
      </button>
      <button
        onClick={onRemove}
        className="text-xs text-roji-dim hover:text-roji-danger"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_36px] items-center gap-3">
      <div className="text-sm text-roji-text">{label}</div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="text-right font-mono text-sm text-roji-accent">{value}</div>
    </div>
  );
}

function TrendChart({ entries }: { entries: LogEntry[] }) {
  const W = 600;
  const H = 160;
  const PAD = 24;
  const xs = entries.map((_, i) => i);
  const yEnergy = entries.map((e) => e.energy);
  const ySleep = entries.map((e) => e.sleepQuality);
  const yMood = entries.map((e) => e.mood);

  const xScale = (i: number) =>
    PAD + (i / Math.max(1, xs.length - 1)) * (W - PAD * 2);
  const yScale = (v: number) => H - PAD - ((v - 0) / 10) * (H - PAD * 2);
  const path = (ys: number[]) =>
    ys
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[2, 4, 6, 8, 10].map((g) => (
        <line
          key={g}
          x1={PAD}
          x2={W - PAD}
          y1={yScale(g)}
          y2={yScale(g)}
          stroke="rgba(255,255,255,0.05)"
        />
      ))}
      <path d={path(yEnergy)} fill="none" stroke="var(--roji-accent)" strokeWidth="2" />
      <path d={path(ySleep)} fill="none" stroke="var(--roji-success)" strokeWidth="2" />
      <path d={path(yMood)} fill="none" stroke="var(--roji-warning)" strokeWidth="2" />
      <g className="text-[10px] font-mono">
        <text x={PAD} y={14} className="fill-roji-accent">
          Energy
        </text>
        <text x={PAD + 50} y={14} className="fill-roji-success">
          Sleep
        </text>
        <text x={PAD + 100} y={14} className="fill-roji-warning">
          Mood
        </text>
      </g>
    </svg>
  );
}

function exportJson(state: TrackerState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roji-tracker-${todayIso()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function ImportJsonButton({
  onImport,
}: {
  onImport: (s: TrackerState) => void;
}) {
  return (
    <label className="roji-btn cursor-pointer text-sm">
      <input
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const text = await f.text();
            const parsed = JSON.parse(text);
            if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.log)) {
              onImport(parsed as TrackerState);
            } else {
              alert("That doesn't look like a valid Roji Tracker export.");
            }
          } catch {
            alert("Couldn't parse that file.");
          }
        }}
      />
      Import JSON
    </label>
  );
}
