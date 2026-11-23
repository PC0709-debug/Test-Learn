// app.js — the conductor. Wires the screens, buttons, sensors, sound and storage together.
//
// The app is a small "state machine": it's always in exactly one state, and each
// event (tap, flip, leaving the app) moves it to the next one.
//
//   idle ──Begin──► [prepped] ──► arming ──face down──► running ──finished──► done ──► idle
//                   (shortcut)    (flip on)               │  ▲
//                                             interruption │  │ back to focus
//                                                          ▼  │
//                                                      interrupted (breathing sheet)

import { load, save, fmtDuration } from './storage.js';
import * as sound from './sound.js';
import { createRenderer } from './scenes.js';
import { hasWakeLock, requestWakeLock, releaseWakeLock, requestMotionPermission, createFlipDetector } from './sensors.js';
import { Session } from './session.js';
import { renderStats } from './ui-stats.js';
import { renderInsights } from './ui-insights.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const FADE_MS = 8 * 60000; // the scene fully dims over the first 8 clean minutes
const BREATHE_MS = 60000;
const SKIP_AFTER_MS = 10000;

const data = load();
const renderer = createRenderer($('#scene'));
renderer.setScene(data.settings.scene);
sound.setVolume(data.settings.volume);

let state = 'idle';
let session = null;
let flip = null;
let pendingLeft = false;   // left the app mid-session; show the sheet when back
let revealTimer = null;

// If the app was closed mid-session last time, save what was done.
if (data.active) {
  if (data.active.cleanMs >= 60000) data.sessions.push({ ...data.active, completed: false });
  data.active = null;
  save(data);
}

// ---------- Helpers ----------

function setState(s) {
  state = s;
  document.body.dataset.state = s;
  const view = { idle: 'idle', prepped: 'prepped', arming: 'arming', running: 'run', interrupted: 'run', done: 'done' }[s];
  $$('.view').forEach(v => { v.hidden = v.id !== `view-${view}`; });
  lockPager(s !== 'idle');
}

function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
}

function runShortcut(name) {
  if (name) location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(name);
}

function renderAll() {
  renderStats(data, $('#stats-body'));
  renderInsights(data, $('#insights-body'));
}

// ---------- Pager (swipe between screens) ----------

const pager = $('#pager');
let page = 1;

function goTo(i, smooth = true) {
  pager.scrollTo({ left: i * pager.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
}

function lockPager(on) {
  document.body.classList.toggle('locked', on);
  if (on && page !== 1) goTo(1, false);
}

pager.addEventListener('scroll', () => {
  const i = Math.round(pager.scrollLeft / pager.clientWidth);
  if (i === page) return;
  page = i;
  $$('#dots button').forEach((b, j) => b.classList.toggle('on', j === i));
}, { passive: true });

$$('#dots button').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.page)));
window.addEventListener('resize', () => goTo(page, false));

// ---------- Idle screen controls ----------

function updateIdle() {
  const { mode, scene, flip: flipOn } = data.settings;
  $$('[data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === mode));
  $$('[data-scene]').forEach(b => b.setAttribute('aria-checked', b.dataset.scene === scene));
  $('#flip-toggle').checked = flipOn;
  if (mode === 'trained') {
    $('#big-time').textContent = `${data.ladder.minutes}:00`;
    $('#big-caption').textContent = 'Finish with no interruptions to level up';
  } else {
    $('#big-time').textContent = 'Untimed';
    $('#big-caption').textContent = 'Stop whenever you’re done';
  }
}

$$('[data-mode]').forEach(b => b.addEventListener('click', () => {
  data.settings.mode = b.dataset.mode; save(data); updateIdle();
}));
$$('[data-scene]').forEach(b => b.addEventListener('click', () => {
  data.settings.scene = b.dataset.scene; save(data); renderer.setScene(b.dataset.scene); updateIdle();
}));
$('#flip-toggle').addEventListener('change', (e) => {
  data.settings.flip = e.target.checked; save(data);
});

// ---------- Starting a session ----------

$('#start-btn').addEventListener('click', () => {
  sound.unlock(); // audio must be switched on during a tap
  if (data.settings.shortcutsOn && data.settings.startShortcut) {
    setState('prepped');
    runShortcut(data.settings.startShortcut);
    return;
  }
  begin();
});

$('#begin-btn').addEventListener('click', () => { sound.unlock(); begin(); });

async function begin() {
  const target = data.settings.mode === 'trained' ? data.ladder.minutes : null;
  session = new Session(data.settings.mode, target);
  sound.play(data.settings.scene);
  requestWakeLock();
  if (!hasWakeLock) toast('Tip: set Auto-Lock to Never during sessions');
  if (data.settings.flip) {
    const ok = await requestMotionPermission(); // must be the first await after the tap
    if (ok) {
      armFlip('Place your phone face down to begin');
      return;
    }
    toast('Motion access is off — starting without flip');
  }
  startRunning();
}

function armFlip(text) {
  $('#arming-text').textContent = text;
  $('#arming-cancel').textContent = session && session.clean() > 0 ? 'End session' : 'Cancel';
  setState('arming');
  if (!flip) {
    flip = createFlipDetector(onFlip, () => {
      flip = null;
      toast('No motion sensor found — starting without flip');
      if (state === 'arming') startRunning();
    });
  }
}

function onFlip(faceDown) {
  if (faceDown && state === 'arming') { sound.chime([659.25]); startRunning(); }
  else if (faceDown && state === 'interrupted') { closeSheet(); startRunning(); }
  else if (!faceDown && state === 'running') interrupt('pickup');
}

function startRunning() {
  session.resume();
  setState('running');
}

$$('[data-cancel]').forEach(b => b.addEventListener('click', () => {
  if (session && session.clean() > 0) return finish(false);
  stopEverything();
  session = null;
  setState('idle');
}));

function stopEverything() {
  flip?.stop(); flip = null;
  releaseWakeLock();
  sound.stop();
}

// ---------- During a session ----------

// Tap anywhere to briefly show the timer and End button.
$('#view-run').addEventListener('click', (e) => {
  if (e.target.closest('#end-btn') || state !== 'running') return;
  document.body.classList.add('reveal');
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => document.body.classList.remove('reveal'), 4000);
});

$('#end-btn').addEventListener('click', () => {
  document.body.classList.remove('reveal');
  if (session.mode === 'trained' && session.remaining() > 0) interrupt('end');
  else finish(true);
});

function tick() {
  requestAnimationFrame(tick);
  if (!session || (state !== 'running' && state !== 'interrupted')) {
    renderer.setFade(0);
    return;
  }
  const clean = session.clean();
  const progress = clean / FADE_MS;
  renderer.setFade(progress);
  // The clock fades too, so you're not tempted to watch it.
  document.body.style.setProperty('--clock', Math.max(0.12, 1 - 0.88 * Math.min(1, progress * 1.5)).toFixed(3));
  if (session.mode === 'trained') {
    const left = session.remaining();
    $('#run-time').textContent = fmtClock(left + 999);
    $('#run-caption').textContent = `Trained · ${session.targetMs / 60000} min`;
    if (left <= 0 && state === 'running') finish(true);
  } else {
    $('#run-time').textContent = fmtClock(clean);
    $('#run-caption').textContent = 'Pure focus';
  }
  // Save a snapshot every few seconds in case the app gets closed.
  if (!tick.lastSnap || Date.now() - tick.lastSnap > 5000) {
    tick.lastSnap = Date.now();
    data.active = session.toRecord(false);
    save(data);
  }
}
requestAnimationFrame(tick);

// ---------- Interruptions + urge surfing ----------

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'running') {
      session.pause('left');
      state = 'interrupted';
      document.body.dataset.state = state;
      pendingLeft = true;
    }
  } else {
    sound.resume();
    if (session) requestWakeLock();
    if (pendingLeft) { pendingLeft = false; openSheet('left'); }
  }
});

function interrupt(kind) {
  session.pause(kind);
  setState('interrupted');
  openSheet(kind);
}

const SHEET_TEXT = {
  left: ['You left the app', 'That’s okay. Take a breath before deciding.'],
  pickup: ['Phone picked up', 'Notice the urge. Breathe with the circle — it usually passes.'],
  end: ['Ending early?', 'Breathe for a minute first. If you still want to stop, that’s fine.'],
};

let sheetTimer = null;

function openSheet(kind) {
  setState('interrupted');
  const [title, sub] = SHEET_TEXT[kind];
  $('#sheet-title').textContent = title;
  $('#sheet-sub').textContent = data.settings.flip && flip ? `${sub} Put it face down to continue.` : sub;
  $$('#reason-chips button').forEach(b => b.classList.remove('on'));
  $('#end-session-btn').hidden = true;
  const circle = $('.breath-circle');
  circle.style.animation = 'none';
  void circle.offsetWidth; // restart the CSS animation from the beginning
  circle.style.animation = '';
  $('#sheet').hidden = false;

  const opened = Date.now();
  clearInterval(sheetTimer);
  const update = () => {
    const t = Date.now() - opened;
    const left = Math.max(0, BREATHE_MS - t);
    $('#breath-label').textContent = left === 0 ? 'Ready' : (t % 10000 < 4000 ? 'Breathe in' : 'Breathe out');
    $('#breath-count').textContent = left === 0 ? 'Ready when you are' : fmtClock(left + 999);
    if (t >= SKIP_AFTER_MS) $('#end-session-btn').hidden = false;
  };
  update();
  sheetTimer = setInterval(update, 250);
}

function closeSheet() {
  clearInterval(sheetTimer);
  $('#sheet').hidden = true;
}

$('#reason-chips').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  session?.setReason(b.dataset.reason);
  $$('#reason-chips button').forEach(x => x.classList.toggle('on', x === b));
});

$('#back-btn').addEventListener('click', () => {
  closeSheet();
  if (data.settings.flip && flip) armFlip('Place your phone face down to continue');
  else startRunning();
});

$('#end-session-btn').addEventListener('click', () => finish(false));

// ---------- Finishing ----------

function finish(completed) {
  closeSheet();
  const rec = session.toRecord(completed);
  session = null;
  data.active = null;
  stopEverything();
  if (completed && rec.mode === 'trained') sound.chime();

  if (rec.cleanMs >= 60000) data.sessions.push(rec);

  let ladderMsg = '';
  if (rec.mode === 'trained') {
    const L = data.ladder;
    if (completed) {
      L.earlyStreak = 0;
      if (rec.interruptions.length === 0) {
        L.minutes = Math.min(90, L.minutes + 5);
        ladderMsg = `Clean run — level up! Next session: ${L.minutes} min.`;
      } else {
        ladderMsg = `Next session stays at ${L.minutes} min. Finish one with no interruptions to level up.`;
      }
    } else {
      L.earlyStreak++;
      if (L.earlyStreak >= 2 && L.minutes > 10) {
        L.minutes -= 5;
        L.earlyStreak = 0;
        ladderMsg = `Stepping back to ${L.minutes} min. Build back up from here.`;
      } else {
        ladderMsg = 'Ended early. Two early ends in a row steps the level down.';
      }
    }
  }
  save(data);

  const n = rec.interruptions.length;
  $('#done-title').textContent = completed ? 'Session complete' : 'Session ended';
  $('#done-detail').textContent = `${fmtDuration(rec.cleanMs)} clean focus · ${n} interruption${n === 1 ? '' : 's'} · longest stretch ${fmtDuration(rec.longestMs)}`
    + (rec.cleanMs < 60000 ? ' (under a minute, not saved)' : '');
  $('#done-ladder').textContent = ladderMsg;
  document.body.style.setProperty('--clock', 1);
  setState('done');
  renderAll();
}

$('#done-btn').addEventListener('click', () => {
  setState('idle');
  updateIdle();
  if (data.settings.shortcutsOn) runShortcut(data.settings.endShortcut);
});

// ---------- Insights screen settings ----------

$('#sc-toggle').checked = data.settings.shortcutsOn;
$('#sc-start').value = data.settings.startShortcut;
$('#sc-end').value = data.settings.endShortcut;
$('#volume').value = data.settings.volume;

$('#sc-toggle').addEventListener('change', e => { data.settings.shortcutsOn = e.target.checked; save(data); });
$('#sc-start').addEventListener('change', e => { data.settings.startShortcut = e.target.value.trim(); save(data); });
$('#sc-end').addEventListener('change', e => { data.settings.endShortcut = e.target.value.trim(); save(data); });
$('#sc-test').addEventListener('click', () => runShortcut(data.settings.startShortcut));
$('#volume').addEventListener('input', e => {
  data.settings.volume = +e.target.value; sound.setVolume(+e.target.value); save(data);
});

$('#export-btn').addEventListener('click', async () => {
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], `still-export-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { /* cancelled */ }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
  }
});

$('#reset-btn').addEventListener('click', () => {
  if (!confirm('Delete all sessions, streaks and settings?')) return;
  data.sessions = [];
  data.ladder = { minutes: 10, earlyStreak: 0 };
  save(data);
  updateIdle();
  renderAll();
  toast('All data reset');
});

// ---------- Start up ----------

updateIdle();
renderAll();
setState('idle');
requestAnimationFrame(() => goTo(1, false));
$$('#dots button')[1].classList.add('on');

// Offline support: a service worker caches the app so it opens without internet.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
