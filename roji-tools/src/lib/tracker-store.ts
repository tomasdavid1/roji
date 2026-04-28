/**
 * Stack Tracker — local-first storage + types.
 *
 * Everything lives in localStorage under a versioned key. We keep the
 * data shape stable so a future cloud sync (Supabase / KV) can pick up
 * the same JSON.
 *
 * Schema:
 *   StackItem: a compound, supplement, or other thing you're taking.
 *   LogEntry:  a per-day record with subjective metrics + which items
 *              were dosed that day.
 */

export type Frequency = "daily" | "eod" | "weekly" | "as-needed";

export interface StackItem {
  id: string;
  name: string;
  doseLabel: string; // free-text e.g. "250 mcg" or "5g"
  frequency: Frequency;
  startedOn: string; // YYYY-MM-DD
  notes?: string;
  archived?: boolean;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  energy: number; // 1–10
  sleepQuality: number; // 1–10
  recovery: number; // 1–10
  mood: number; // 1–10
  libido: number; // 1–10
  /** Which item ids were dosed that day. */
  dosedItemIds: string[];
  notes?: string;
}

export interface TrackerState {
  items: StackItem[];
  log: LogEntry[];
}

const KEY = "roji-tools.tracker.v1";

export function load(): TrackerState {
  if (typeof window === "undefined") return { items: [], log: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { items: [], log: [] };
    const parsed = JSON.parse(raw) as TrackerState;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      log: Array.isArray(parsed.log) ? parsed.log : [],
    };
  } catch {
    return { items: [], log: [] };
  }
}

export function save(state: TrackerState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota errors etc. */
  }
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compute simple per-metric trends across the last N entries.
 * Returns an object { energy: 7.4, sleep: 6.1, ... }.
 */
export function recentAverages(log: LogEntry[], lastN = 7) {
  const recent = [...log]
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, lastN);
  if (recent.length === 0)
    return { energy: 0, sleepQuality: 0, recovery: 0, mood: 0, libido: 0, n: 0 };
  const sum = recent.reduce(
    (acc, e) => ({
      energy: acc.energy + e.energy,
      sleepQuality: acc.sleepQuality + e.sleepQuality,
      recovery: acc.recovery + e.recovery,
      mood: acc.mood + e.mood,
      libido: acc.libido + e.libido,
    }),
    { energy: 0, sleepQuality: 0, recovery: 0, mood: 0, libido: 0 },
  );
  return {
    energy: sum.energy / recent.length,
    sleepQuality: sum.sleepQuality / recent.length,
    recovery: sum.recovery / recent.length,
    mood: sum.mood / recent.length,
    libido: sum.libido / recent.length,
    n: recent.length,
  };
}
