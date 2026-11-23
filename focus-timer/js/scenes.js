// scenes.js — the animated nature scenes, drawn on a <canvas> about 60 times a second.
//
// Each scene has two jobs:
//   resize(w, h)                  — set up stars, drops, trees for this screen size
//   draw(ctx, w, h, dt)           — paint one frame; dt = seconds since the last frame
//
// The renderer also applies the "fade": as a session goes on, the scene gets darker
// and slower, so the screen becomes boring and your attention moves to the work.

const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function skyGradient(ctx, h, top, bottom, end = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, h * end);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

function makeStars(w, h, n, maxY) {
  return Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h * maxY), r: rand(0.4, 1.3), p: rand(0, TAU) }));
}

function drawStars(ctx, stars, t) {
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 1.3 + s.p);
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- Rain: night window, distant warm light ----------
function rain() {
  let drops = [];
  return {
    resize(w, h) {
      drops = Array.from({ length: Math.round((w * h) / 2600) }, () => ({
        x: rand(0, w * 1.1), y: rand(0, h), l: rand(10, 26), v: rand(500, 900), a: rand(0.12, 0.4),
      }));
    },
    draw(ctx, w, h, dt) {
      ctx.fillStyle = skyGradient(ctx, h, '#09121d', '#18283a');
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.75, h * 0.35, 0, w * 0.75, h * 0.35, h * 0.5);
      glow.addColorStop(0, 'rgba(255,190,120,0.10)');
      glow.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      for (const d of drops) {
        d.y += d.v * dt;
        d.x -= d.v * dt * 0.08;
        if (d.y > h + d.l) { d.y = -d.l; d.x = rand(0, w * 1.1); }
        ctx.strokeStyle = `rgba(180,205,235,${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.l * 0.08, d.y - d.l);
        ctx.stroke();
      }
    },
  };
}

// ---------- Ocean: moonlit waves ----------
function ocean() {
  let stars = [];
  let t = 0;
  return {
    resize(w, h) { stars = makeStars(w, h, 70, 0.45); },
    draw(ctx, w, h, dt) {
      t += dt;
      const horizon = h * 0.55;
      ctx.fillStyle = skyGradient(ctx, h, '#060a18', '#1b2745', 0.55);
      ctx.fillRect(0, 0, w, horizon);
      drawStars(ctx, stars, t);
      // Moon + glow
      const mx = w * 0.7, my = h * 0.2, mr = Math.min(w, h) * 0.05;
      const glow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 6);
      glow.addColorStop(0, 'rgba(220,230,255,0.18)');
      glow.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, horizon);
      ctx.fillStyle = '#e8eefc';
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      // Sea
      ctx.fillStyle = '#0a1426';
      ctx.fillRect(0, horizon, w, h - horizon);
      for (let i = 0; i < 5; i++) {
        const base = h * (0.58 + i * 0.09);
        const amp = 4 + i * 4;
        ctx.fillStyle = `rgba(${18 + i * 6},${36 + i * 9},${64 + i * 10},0.85)`;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 8; x += 8) {
          const y = base + Math.sin(x * 0.012 / (1 + i * 0.3) + t * (0.5 + i * 0.15) + i) * amp
                         + Math.sin(x * 0.03 + t * 0.9) * amp * 0.3;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.fill();
      }
      // Moon's reflection shimmering on the water
      for (let k = 0; k < 14; k++) {
        const y = horizon + 8 + k * h * 0.028;
        const len = (20 + k * 6) * (0.6 + 0.4 * Math.sin(t * 2 + k * 1.7));
        ctx.fillStyle = `rgba(220,230,255,${0.12 - k * 0.006})`;
        ctx.fillRect(mx - len / 2, y, len, 2);
      }
    },
  };
}

// ---------- Forest night: stars, pine silhouettes, fireflies ----------
function forest() {
  let stars = [], far = [], near = [], flies = [];
  let t = 0;
  function pine(ctx, x, base, ht, wd) {
    for (let k = 0; k < 3; k++) {
      const top = base - ht * (0.45 + k * 0.275);
      const bw = wd * (1 - k * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - bw / 2, top + ht * 0.45);
      ctx.lineTo(x + bw / 2, top + ht * 0.45);
      ctx.fill();
    }
    ctx.fillRect(x - wd * 0.05, base - ht * 0.1, wd * 0.1, ht * 0.1);
  }
  return {
    resize(w, h) {
      stars = makeStars(w, h, 90, 0.6);
      const layer = (n, minH, maxH) => Array.from({ length: n }, (_, i) => ({
        x: (i + rand(-0.3, 0.3)) * (w / (n - 1)), ht: rand(minH, maxH) * h, wd: rand(0.1, 0.16) * w,
      }));
      far = layer(9, 0.18, 0.28);
      near = layer(6, 0.28, 0.42);
      flies = Array.from({ length: 14 }, () => ({ x: rand(0, w), y: rand(h * 0.55, h * 0.95), vx: rand(-10, 10), vy: rand(-6, 6), p: rand(0, TAU) }));
    },
    draw(ctx, w, h, dt) {
      t += dt;
      ctx.fillStyle = skyGradient(ctx, h, '#0a0a1c', '#1f2340', 0.8);
      ctx.fillRect(0, 0, w, h);
      drawStars(ctx, stars, t);
      const ground = h * 0.92;
      ctx.fillStyle = '#0e1426';
      for (const tr of far) pine(ctx, tr.x, ground - h * 0.03, tr.ht, tr.wd);
      ctx.fillStyle = '#04070d';
      for (const tr of near) pine(ctx, tr.x, ground + h * 0.02, tr.ht, tr.wd);
      ctx.fillRect(0, ground, w, h - ground);
      for (const f of flies) {
        f.vx = Math.max(-14, Math.min(14, f.vx + rand(-1, 1) * dt * 30));
        f.vy = Math.max(-8, Math.min(8, f.vy + rand(-1, 1) * dt * 20));
        f.x = (f.x + f.vx * dt + w) % w;
        f.y = Math.max(h * 0.5, Math.min(h * 0.97, f.y + f.vy * dt));
        const a = Math.max(0, Math.sin(t * 1.6 + f.p));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
        g.addColorStop(0, `rgba(230,255,150,${0.9 * a})`);
        g.addColorStop(1, 'rgba(230,255,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 10, f.y - 10, 20, 20);
      }
    },
  };
}

const SCENES = { rain, ocean, forest };

// ---------- Renderer ----------
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scene = null;
  let w = 0, h = 0;
  let dim = 1;     // 1 = full brightness, lower = darker
  let speed = 1;   // 1 = normal motion, lower = slower
  let last = performance.now();
  let lastDraw = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene?.resize(w, h);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    // Once the scene is dim, draw fewer frames per second to save battery.
    const minGap = dim < 0.45 ? 1000 / 20 : 0;
    if (now - lastDraw < minGap) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    lastDraw = now;
    if (!scene) return;
    scene.draw(ctx, w, h, dt * speed);
    if (dim < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - dim})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  return {
    setScene(name) { scene = (SCENES[name] || rain)(); scene.resize(w, h); },
    // progress 0..1 → how far into the fade we are
    setFade(progress) {
      const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 2); // ease-out
      dim = 1 - 0.8 * e;    // down to 20% brightness
      speed = 1 - 0.65 * e; // down to 35% speed
    },
  };
}
