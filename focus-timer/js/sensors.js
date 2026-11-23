// sensors.js — talking to the phone's hardware: keeping the screen awake, and the
// motion sensor that powers "Flip to focus".

// ---------- Screen Wake Lock ----------
// Stops the phone auto-locking during a session. Auto-lock would look like
// "you left the app" and count as an interruption.
let lock = null;

export const hasWakeLock = 'wakeLock' in navigator;

export async function requestWakeLock() {
  if (!hasWakeLock || lock) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch { lock = null; }
}

export async function releaseWakeLock() {
  try { await lock?.release(); } catch { /* already released */ }
  lock = null;
}

// ---------- Motion permission ----------
// iOS asks the user before a web page can read motion. It must be called straight
// from a tap, so call this before any other `await` in a click handler.
export async function requestMotionPermission() {
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function') {
    try { return (await DOE.requestPermission()) === 'granted'; } catch { return false; }
  }
  return true;
}

// ---------- Flip detector ----------
// `beta` is the front/back tilt in degrees: ~0 when lying face up, ~±180 face down.
// Two thresholds (hysteresis) + a short delay stop small bumps from counting as pickups.
export function createFlipDetector(onChange, onUnavailable) {
  let faceDown = false;
  let candidate = null;
  let since = 0;
  let gotData = false;

  const handler = (e) => {
    if (e.beta == null) return;
    gotData = true;
    const tilt = Math.abs(e.beta);
    const raw = faceDown ? tilt > 110 : tilt > 140;
    const now = performance.now();
    if (raw === faceDown) { candidate = null; return; }
    if (candidate !== raw) { candidate = raw; since = now; return; }
    if (now - since > (raw ? 700 : 1000)) {
      faceDown = raw;
      candidate = null;
      onChange(faceDown);
    }
  };

  window.addEventListener('deviceorientation', handler);
  // Laptops often "support" the event but never send data. Give up after 2.5s.
  const timer = setTimeout(() => { if (!gotData) { stop(); onUnavailable(); } }, 2500);

  function stop() {
    window.removeEventListener('deviceorientation', handler);
    clearTimeout(timer);
  }
  return { stop, get faceDown() { return faceDown; } };
}
