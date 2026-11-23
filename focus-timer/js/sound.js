// sound.js — ambient soundscapes, generated live with the Web Audio API.
//
// There are no audio files. Every sound starts as random noise and gets shaped
// with filters (which cut high or low frequencies) and LFOs (slow oscillators that
// make something rise and fall). Because it's random, it never loops noticeably.
//
//   noise ──► filter ──► gain ──► scene bus ──► master (volume) ──► speakers

let ctx = null;
let master = null;
let bus = null;         // the current soundscape's output, so we can fade it
let nodes = [];         // things to stop when switching scenes
let timers = [];        // scheduled raindrops / crickets
let volume = 0.7;
const buffers = {};

const rand = (a, b) => a + Math.random() * (b - a);

// Must be called from a tap — browsers block audio that starts without one.
export function unlock() {
  if (!ctx) {
    // Lets audio play even when the iPhone's silent switch is on (Safari 16.4+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  if (ctx.state !== 'running') ctx.resume();
}

export function resume() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

// ---------- Building blocks ----------

function makeNoise(kind) {
  const len = ctx.sampleRate * 8;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else if (kind === 'pink') {          // softer, like rain or wind
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;    b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;    b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {                              // brown: deep rumble, like waves
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function noise(kind) {
  const s = ctx.createBufferSource();
  s.buffer = buffers[kind] ||= makeNoise(kind);
  s.loop = true;
  s.start();
  nodes.push(s);
  return s;
}

function filter(type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function gain(v) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

function chain(...ns) {
  for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]);
}

// Slowly push `param` up and down by `depth`, `freq` times per second.
function lfo(freq, depth, param) {
  const o = ctx.createOscillator();
  o.frequency.value = freq;
  const g = gain(depth);
  o.connect(g).connect(param);
  o.start();
  nodes.push(o);
}

// Repeat `fn` at random intervals (ms) until the scene stops.
function every(min, max, fn) {
  const tick = () => { fn(); timers.push(setTimeout(tick, rand(min, max))); };
  timers.push(setTimeout(tick, rand(min, max)));
}

// ---------- Soundscapes ----------

const SCAPES = {
  rain() {
    chain(noise('pink'), filter('highpass', 500), filter('lowpass', 7000), gain(0.5), bus);
    chain(noise('brown'), filter('lowpass', 400), gain(0.35), bus);
    // Individual drops: tiny bursts of noise at random pitches.
    every(40, 110, () => {
      const t = ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = buffers.white ||= makeNoise('white');
      const bp = filter('bandpass', rand(1500, 5000), rand(2, 8));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rand(0.03, 0.1), t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.03, 0.08));
      chain(s, bp, g, bus);
      s.start(t, Math.random() * 7, 0.1);
    });
  },

  ocean() {
    // Waves: deep noise whose loudness and brightness swell together every ~13s.
    const lp = filter('lowpass', 500);
    const g = gain(0.5);
    chain(noise('brown'), lp, g, bus);
    lfo(0.075, 350, lp.frequency);
    lfo(0.075, 0.35, g.gain);
    lfo(0.031, 0.12, g.gain); // a second, slower swell so no two waves match
    // Foam hiss on the crest.
    const foam = gain(0.05);
    chain(noise('pink'), filter('highpass', 1500), foam, bus);
    lfo(0.075, 0.05, foam.gain);
  },

  forest() {
    // Wind through trees.
    const bp = filter('bandpass', 600, 0.5);
    const g = gain(0.25);
    chain(noise('pink'), bp, g, bus);
    lfo(0.05, 0.15, g.gain);
    lfo(0.07, 250, bp.frequency);
    // Crickets: three quick high pulses, near and far.
    const chirp = (level) => {
      const t = ctx.currentTime + 0.01;
      const o = ctx.createOscillator();
      o.frequency.value = 4300 + rand(-150, 150);
      const env = gain(0);
      for (let k = 0; k < 3; k++) {
        const st = t + k * 0.07;
        env.gain.setValueAtTime(0, st);
        env.gain.linearRampToValueAtTime(level, st + 0.01);
        env.gain.linearRampToValueAtTime(0, st + 0.045);
      }
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1);
      if (pan.pan) pan.pan.value = rand(-0.8, 0.8);
      chain(o, env, pan, bus);
      o.start(t);
      o.stop(t + 0.3);
    };
    every(800, 1300, () => chirp(0.012));
    every(1500, 3000, () => chirp(0.005));
  },
};

// ---------- Public controls ----------

function stopScene() {
  timers.forEach(clearTimeout);
  timers = [];
  nodes.forEach(n => { try { n.stop(); } catch {} });
  nodes = [];
  if (bus) bus.disconnect();
  bus = null;
}

export function play(name) {
  unlock();
  stopScene();
  bus = gain(0);
  bus.connect(master);
  SCAPES[name]();
  const t = ctx.currentTime;
  bus.gain.linearRampToValueAtTime(1, t + 2);
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(volume, t + 2);
}

export function stop() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 2);
  // Stop scheduling new drops/chirps now; let the rest fade out, then clean up.
  timers.forEach(clearTimeout);
  const old = { nodes, bus };
  timers = []; nodes = []; bus = null;
  setTimeout(() => {
    old.nodes.forEach(n => { try { n.stop(); } catch {} });
    old.bus?.disconnect();
  }, 2200);
}

export function setVolume(v) {
  volume = v;
  if (ctx && bus) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
}

// A soft rising chord: session finished, or phone detected face down.
export function chime(notes = [523.25, 659.25, 783.99]) {
  unlock();
  const t = ctx.currentTime;
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = gain(0);
    const st = t + i * 0.18;
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(0.12, st + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, st + 2.2);
    o.connect(g).connect(ctx.destination);
    o.start(st);
    o.stop(st + 2.3);
  });
}
