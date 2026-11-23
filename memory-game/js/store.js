// store.js — saving and loading your progress.
//
// Big picture: the game runs fully in your browser with no server, so your
// progress is saved in localStorage, a small key-value store each website
// gets on your device. It survives closing the app and works offline.
// Caveat: deleting Safari website data (or the Home Screen app) erases it,
// which is why Settings has an export button.

const Store = (() => {
  const KEY = 'ticker.save.v1';

  const fresh = () => ({
    version: 1,
    progress: {},          // card id -> SRS record (see srs.js)
    reported: {},          // card id -> { at, note } cards you flagged ⚑
    streak: { count: 0, best: 0, lastDay: -1 },
    daily: { day: -1, done: 0 },   // Daily 5 progress for today
    // gold = spendable balance; lifetime = total ever earned (sets your rank)
    meta: { gold: 0, lifetime: 0, runs: 0, bestFloor: 0, wins: 0, unlocked: ['hint', 'hedge', 'dividend'] },
    settings: { theme: 'auto', sound: true, haptics: true, decks: null },
  });

  let data = fresh();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Merge onto defaults so new fields added in later versions exist.
        const base = fresh();
        data = { ...base, ...saved,
          meta: { ...base.meta, ...saved.meta },
          settings: { ...base.settings, ...saved.settings },
          streak: { ...base.streak, ...saved.streak },
          daily: { ...base.daily, ...saved.daily } };
      }
    } catch (e) {
      console.warn('Could not load save; starting fresh.', e);
      data = fresh();
    }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('Could not save progress.', e); }
  }

  function reset() { data = fresh(); save(); return data; }

  function exportText() { return JSON.stringify(data); }
  function importText(text) {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== 1) throw new Error('Not a Ticker save file');
    localStorage.setItem(KEY, text);
    return load();
  }

  return { load, save, reset, exportText, importText, get: () => data };
})();
