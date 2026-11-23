// ui-insights.js — the Insights screen (swipe left from Focus): what pulls you away, and when.

import { fmtDuration } from './storage.js';

const DAY = 86400000;
const REASONS = { bored: 'Bored', notification: 'Notification', needed: 'Needed something', other: 'Other', none: 'Not logged' };
const KINDS = { left: 'Left the app', pickup: 'Picked up phone', end: 'Tried to end early' };
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

function timeOfDay(ts) {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 22) return 'Evening';
  return 'Night';
}

function countBy(items, keyFn) {
  const m = {};
  for (const i of items) { const k = keyFn(i); m[k] = (m[k] || 0) + 1; }
  return m;
}

function bars(counts, labels) {
  const max = Math.max(1, ...Object.values(counts));
  const rows = Object.keys(labels).filter(k => counts[k]);
  if (!rows.length) return '<p class="muted small">Nothing yet.</p>';
  return `<div class="bars">${rows.map(k => `
    <div class="bar-row"><span>${labels[k]}</span><div class="bar"><div style="width:${(counts[k] / max) * 100}%"></div></div><b>${counts[k]}</b></div>`).join('')}</div>`;
}

const TIPS = {
  bored: 'Boredom is your main pull. Try a shorter trained session, or start with the hardest part of the task while you\'re fresh.',
  notification: 'Notifications are pulling you away. Set up the Focus Mode shortcut below so they\'re silenced automatically.',
  needed: 'You often need something mid-session. Keep a paper note nearby to park thoughts and deal with them after.',
  other: 'Try logging a reason each time — patterns get clearer with a few more sessions.',
};

export function renderInsights(data, el) {
  const now = Date.now();
  const week = data.sessions.filter(s => s.start > now - 7 * DAY);
  const prev = data.sessions.filter(s => s.start <= now - 7 * DAY && s.start > now - 14 * DAY);
  const clean = week.reduce((m, s) => m + s.cleanMs, 0);
  const prevClean = prev.reduce((m, s) => m + s.cleanMs, 0);
  const ints = week.flatMap(s => s.interruptions);
  const perHour = clean > 0 ? ints.length / (clean / 3600000) : 0;
  const trained = week.filter(s => s.mode === 'trained');
  const completion = trained.length ? Math.round((trained.filter(s => s.completed).length / trained.length) * 100) : null;
  const change = prevClean > 0 ? Math.round(((clean - prevClean) / prevClean) * 100) : null;

  const byReason = countBy(ints, i => i.reason || 'none');
  const byTime = countBy(ints, i => timeOfDay(i.t));
  const byKind = countBy(ints, i => i.kind);

  let insight = 'Do a few sessions and your patterns will show up here.';
  if (week.length && !ints.length) {
    insight = 'No interruptions this week. Your attention is holding — try raising your trained level.';
  } else if (ints.length) {
    const topTime = TIMES.reduce((a, b) => ((byTime[b] || 0) > (byTime[a] || 0) ? b : a));
    const logged = Object.entries(byReason).filter(([k]) => k !== 'none').sort((a, b) => b[1] - a[1]);
    const top = logged[0]?.[0] || 'other';
    const PHRASE = { bored: 'from boredom', notification: 'from notifications', needed: 'when you need something', other: 'for other reasons' };
    insight = `Most interruptions happen in the <b>${topTime.toLowerCase()}</b>${logged.length ? `, usually <b>${PHRASE[top]}</b>` : ''}. ${TIPS[top]}`;
  }

  el.innerHTML = `
    <h1>Insights</h1>
    <section class="card insight"><p>${insight}</p></section>

    <div class="tiles">
      <div class="tile"><div class="tile-num">${fmtDuration(clean)}</div><div class="tile-label">Clean focus, last 7 days${change !== null ? ` <span class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}%</span>` : ''}</div></div>
      <div class="tile"><div class="tile-num">${perHour.toFixed(1)}</div><div class="tile-label">Interruptions per focus hour</div></div>
      <div class="tile"><div class="tile-num">${week.length}</div><div class="tile-label">Sessions</div></div>
      <div class="tile"><div class="tile-num">${completion === null ? '–' : completion + '%'}</div><div class="tile-label">Trained sessions finished</div></div>
    </div>

    <section class="card"><div class="card-head"><h2>What pulled you</h2></div>${bars(byReason, REASONS)}</section>
    <section class="card"><div class="card-head"><h2>When</h2></div>${bars(byTime, Object.fromEntries(TIMES.map(t => [t, t])))}</section>
    <section class="card"><div class="card-head"><h2>How</h2></div>${bars(byKind, KINDS)}</section>
  `;
}
