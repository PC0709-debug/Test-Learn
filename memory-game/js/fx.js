// fx.js — sound and haptics.
//
// Big picture: no audio files are downloaded. Each sound is built in real
// time with the Web Audio API (oscillators = tiny synthesizers), so the game
// stays small and works offline.
//
// Haptics: iPhone Safari does not support navigator.vibrate(). iOS 18+ does
// buzz when you tap a native "switch" toggle, so on iPhone we quietly flip a
// hidden switch to get a tap of feedback. On Android navigator.vibrate works.

const FX = (() => {
  let ctx = null;
  let enabled = { sound: true, haptics: true };

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One note: frequency (Hz), length (s), waveform, volume, start delay (s).
  function tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slideTo = null) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // A short burst of noise, used for the ticker-tape "clack".
  function click(delay = 0, vol = 0.08) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * 0.02);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    const gain = a.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(a.destination);
    src.start(a.currentTime + delay);
  }

  const sounds = {
    tap:     () => click(0, 0.05),
    ticker:  () => { for (let i = 0; i < 6; i++) click(i * 0.05, 0.06); },
    right:   () => { tone(880, 0.12, 'triangle', 0.12); tone(1318, 0.25, 'triangle', 0.1, 0.08); }, // cash-register ding
    wrong:   () => { tone(196, 0.3, 'sawtooth', 0.07, 0, 110); },
    hit:     () => { tone(330, 0.08, 'square', 0.06); click(0.02, 0.08); },
    hurt:    () => { tone(120, 0.25, 'sine', 0.2, 0, 60); },
    victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.1)),
    bell:    () => { tone(1568, 1.2, 'sine', 0.08); tone(1175, 1.4, 'sine', 0.06, 0.02); }, // opening bell
    defeat:  () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.05, i * 0.18)),
  };

  // Haptics ----------------------------------------------------------------
  let hapticLabel = null;
  function setupHaptics() {
    const id = 'fx-haptic';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.id = id;
    input.setAttribute('switch', '');
    input.style.cssText = 'position:fixed;left:-9999px;opacity:0;pointer-events:none';
    input.tabIndex = -1; input.setAttribute('aria-hidden', 'true');
    hapticLabel = document.createElement('label');
    hapticLabel.htmlFor = id;
    hapticLabel.style.cssText = 'position:fixed;left:-9999px';
    hapticLabel.setAttribute('aria-hidden', 'true');
    document.body.append(input, hapticLabel);
  }

  function buzz(pattern = 15) {
    if (!enabled.haptics) return;
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    if (hapticLabel) {
      // Several pulses = several flips.
      const n = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
      for (let i = 0; i < n; i++) setTimeout(() => hapticLabel.click(), i * 90);
    }
  }

  function play(name) {
    if (enabled.sound && sounds[name]) {
      try { sounds[name](); } catch (e) { /* audio blocked; ignore */ }
    }
  }

  function configure(settings) { enabled = { sound: !!settings.sound, haptics: !!settings.haptics }; }

  return { play, buzz, configure, setupHaptics };
})();
