// storage.js — saving data on the device, plus helpers that turn raw sessions into stats.
//
// Everything lives in localStorage (a small key/value store built into the browser).
// It stays on your phone; nothing is sent anywhere.

const KEY = 'still-focus-v1';

const DEFAULTS = {
  sessions: [],
  active: null, // snapshot of an in-progress session, in case the app gets closed
  settings: {
    mode: 'trained',
    scene: 'rain',
    flip: true,
    volume: 0.7,
    shortcutsOn: false,
    startShortcut: 'Focus On',
    endShortcut: 'Focus Off',
  },
  ladder: { minutes: 10, earlyStreak: 0 },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const d = JSON.parse(raw);
    // Merge with defaults so new settings added later don't break old saves.
    return {
      ...structuredClone(DEFAULTS),
      ...d,
      settings: { ...DEFAULTS.settings, ...d.settings },
      ladder: { ...DEFAULTS.ladder, ...d.ladder },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
}

// ---------- Stats helpers ----------

export const STREAK_MIN = 10; // clean minutes needed for a day to count toward a streak

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minutesByDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const k = dayKey(s.start);
    map.set(k, (map.get(k) || 0) + s.cleanMs / 60000);
  }
  return map;
}

// Consecutive qualifying days ending today (or yesterday, so today isn't "lost" before you start).
export function currentStreak(byDay) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if ((byDay.get(dayKey(d)) || 0) < STREAK_MIN) d.setDate(d.getDate() - 1);
  let n = 0;
  while ((byDay.get(dayKey(d)) || 0) >= STREAK_MIN) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function bestStreak(byDay) {
  const days = [...byDay.entries()].filter(([, m]) => m >= STREAK_MIN).map(([k]) => k).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const t = new Date(k + 'T12:00:00').getTime();
    run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
