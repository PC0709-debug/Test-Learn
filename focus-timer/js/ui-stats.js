// ui-stats.js — the Stats screen (swipe right from Focus): heatmap, streaks, personal bests.

import { minutesByDay, currentStreak, bestStreak, dayKey, fmtDuration, STREAK_MIN } from './storage.js';

const WEEKS = 18;

function level(min) {
  if (min <= 0) return 0;
  if (min < 15) return 1;
  if (min < 30) return 2;
  if (min < 60) return 3;
  return 4;
}

function heatmap(byDay) {
  // Grid runs Sunday → Saturday down each column, oldest week on the left.
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (WEEKS - 1) * 7);
  const todayKey = dayKey(today);
  let cells = '';
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = dayKey(d);
    const future = d > today;
    const min = byDay.get(k) || 0;
    const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    cells += `<button class="cell l${future ? 'x' : level(min)}${k === todayKey ? ' today' : ''}"
      data-label="${label}" data-min="${Math.round(min)}" ${future ? 'disabled' : ''}
      aria-label="${label}: ${Math.round(min)} clean minutes"></button>`;
  }
  return `<div class="heatmap" style="--weeks:${WEEKS}">${cells}</div>`;
}

export function renderStats(data, el) {
  const s = data.sessions;
  const byDay = minutesByDay(s);
  const todayMin = byDay.get(dayKey(Date.now())) || 0;
  const best = s.reduce((m, x) => Math.max(m, x.longestMs), 0);
  const total = s.reduce((m, x) => m + x.cleanMs, 0);
  const recent = s.slice(-5).reverse();

  el.innerHTML = `
    <h1>Stats</h1>
    <div class="tiles">
      <div class="tile"><div class="tile-num">${Math.round(todayMin)}<span>m</span></div><div class="tile-label">Clean focus today</div></div>
      <div class="tile"><div class="tile-num">${currentStreak(byDay)}<span>d</span></div><div class="tile-label">Streak (${STREAK_MIN}m+/day)</div></div>
      <div class="tile"><div class="tile-num">${fmtDuration(best)}</div><div class="tile-label">Longest unbroken</div></div>
      <div class="tile"><div class="tile-num">${bestStreak(byDay)}<span>d</span></div><div class="tile-label">Best streak</div></div>
    </div>

    <section class="card">
      <div class="card-head"><h2>Phone-free focus</h2><span class="muted">${WEEKS} weeks</span></div>
      ${heatmap(byDay)}
      <div class="heat-foot">
        <span class="muted" id="heat-detail">Tap a day</span>
        <span class="legend">Less <i class="cell l0"></i><i class="cell l1"></i><i class="cell l2"></i><i class="cell l3"></i><i class="cell l4"></i> More</span>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Recent sessions</h2><span class="muted">${fmtDuration(total)} total</span></div>
      ${recent.length ? `<ul class="list">${recent.map(r => `
        <li>
          <span>${new Date(r.start).toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            <small class="muted">${r.mode === 'trained' ? `Trained ${r.targetMin}m` : 'Pure focus'}${r.completed ? '' : ' · ended early'}</small></span>
          <span class="right">${fmtDuration(r.cleanMs)}<small class="muted">${r.interruptions.length} interruption${r.interruptions.length === 1 ? '' : 's'}</small></span>
        </li>`).join('')}</ul>` : `<p class="muted">Your sessions will show up here.</p>`}
    </section>

    <section class="card">
      <div class="card-head"><h2>Trained level</h2><span class="muted">${data.ladder.minutes} min</span></div>
      <div class="ladder"><div style="width:${((data.ladder.minutes - 10) / 80) * 100}%"></div></div>
      <p class="muted small">Finish a trained session with no interruptions to add 5 minutes. Two early ends in a row steps back 5. Range: 10–90 min.</p>
    </section>
  `;

  el.querySelector('.heatmap').addEventListener('click', (e) => {
    const c = e.target.closest('.cell');
    if (!c || c.disabled) return;
    el.querySelector('#heat-detail').textContent = `${c.dataset.label} · ${c.dataset.min} clean min`;
  });
}
