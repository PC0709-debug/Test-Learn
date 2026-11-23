// art.js — hand-drawn SVG artwork (owl mentor and the panics).
//
// Big picture: SVG is a drawing described in text (circles, paths, etc.).
// Inline SVG needs no image downloads, scales sharply on any screen, and
// takes its colours from CSS variables, so it flips with dark mode.

const ART = (() => {
  const G = 'var(--gold)', INK = 'var(--ink)', PAPER = 'var(--paper)', ACC = 'var(--accent)';

  const owl = `
  <svg viewBox="0 0 120 140" class="art owl" role="img" aria-label="Augustus the owl">
    <!-- top hat -->
    <rect x="38" y="6" width="44" height="30" rx="3" fill="${INK}"/>
    <rect x="38" y="28" width="44" height="6" fill="${G}"/>
    <rect x="28" y="34" width="64" height="6" rx="3" fill="${INK}"/>
    <!-- body -->
    <path d="M24 70 Q24 40 60 40 Q96 40 96 70 L96 112 Q96 132 60 132 Q24 132 24 112 Z" fill="${ACC}" stroke="${G}" stroke-width="2"/>
    <!-- chest chevrons (art deco) -->
    <path d="M44 96 L60 106 L76 96 M44 106 L60 116 L76 106 M48 116 L60 123 L72 116" fill="none" stroke="${G}" stroke-width="2"/>
    <!-- eyes -->
    <circle cx="45" cy="66" r="14" fill="${PAPER}" stroke="${G}" stroke-width="2"/>
    <circle cx="75" cy="66" r="14" fill="${PAPER}" stroke="${G}" stroke-width="3"/>
    <circle cx="45" cy="67" r="5" fill="${INK}"/><circle cx="75" cy="67" r="5" fill="${INK}"/>
    <!-- monocle chain -->
    <path d="M89 70 Q98 92 90 104" fill="none" stroke="${G}" stroke-width="1.5"/>
    <!-- calm, half-closed lids -->
    <path d="M31 60 Q45 52 59 60" fill="${ACC}"/><path d="M61 60 Q75 52 89 60" fill="${ACC}"/>
    <!-- beak -->
    <path d="M56 76 L64 76 L60 86 Z" fill="${G}"/>
    <!-- ear tufts -->
    <path d="M30 48 L36 38 L42 46 Z M78 46 L84 38 L90 48 Z" fill="${ACC}" stroke="${G}" stroke-width="1"/>
  </svg>`;

  const monsters = {
    gremlin: `<svg viewBox="0 0 120 120" class="art"><circle cx="60" cy="64" r="34" fill="${ACC}" stroke="${G}" stroke-width="3"/>
      <path d="M30 40 L22 14 L44 32 M90 40 L98 14 L76 32" fill="${ACC}" stroke="${G}" stroke-width="3"/>
      <circle cx="48" cy="58" r="7" fill="${G}"/><circle cx="72" cy="58" r="7" fill="${G}"/>
      <path d="M40 80 L48 74 L54 82 L60 74 L66 82 L72 74 L80 80" fill="none" stroke="${PAPER}" stroke-width="3"/>
      <path d="M4 104 H116" stroke="${G}" stroke-width="6" stroke-dasharray="3 5"/></svg>`,
    swindler: `<svg viewBox="0 0 120 120" class="art"><rect x="36" y="8" width="48" height="10" fill="${INK}"/><path d="M26 22 H94 L84 18 H36 Z" fill="${INK}"/>
      <rect x="40" y="18" width="40" height="6" fill="${G}"/>
      <circle cx="60" cy="48" r="22" fill="${ACC}" stroke="${G}" stroke-width="2"/>
      <path d="M44 46 H56 M64 46 H76" stroke="${PAPER}" stroke-width="4"/>
      <path d="M46 60 Q60 52 74 60" fill="none" stroke="${G}" stroke-width="2"/>
      <path d="M28 116 L36 76 H84 L92 116 Z" fill="${INK}" stroke="${G}" stroke-width="2"/>
      <path d="M60 76 L52 96 L60 116 L68 96 Z" fill="${G}"/></svg>`,
    phone: `<svg viewBox="0 0 120 120" class="art"><rect x="50" y="34" width="20" height="60" fill="${INK}" stroke="${G}" stroke-width="2"/>
      <ellipse cx="60" cy="104" rx="30" ry="10" fill="${INK}" stroke="${G}" stroke-width="2"/>
      <circle cx="60" cy="28" r="14" fill="${ACC}" stroke="${G}" stroke-width="3"/>
      <path d="M74 48 Q100 46 98 70" fill="none" stroke="${G}" stroke-width="3"/><rect x="88" y="66" width="18" height="10" rx="4" fill="${ACC}" stroke="${G}" stroke-width="2"/>
      <path d="M18 18 L30 26 M12 34 L26 36 M22 6 L32 18 M98 8 L90 20 M106 22 L94 28" stroke="${G}" stroke-width="3"/></svg>`,
    bubble: `<svg viewBox="0 0 120 120" class="art"><circle cx="60" cy="54" r="44" fill="none" stroke="${G}" stroke-width="3"/>
      <circle cx="60" cy="54" r="40" fill="${ACC}" opacity=".35"/>
      <path d="M36 34 Q44 24 56 22" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round"/>
      <path d="M40 70 L52 58 L62 64 L80 40" fill="none" stroke="${G}" stroke-width="4"/><path d="M72 40 H80 V48" fill="none" stroke="${G}" stroke-width="4"/>
      <path d="M60 98 L56 116 M60 98 L64 116" stroke="${G}" stroke-width="2"/></svg>`,
    crowd: `<svg viewBox="0 0 120 120" class="art">${[16, 40, 64, 88].map((x, i) =>
      `<circle cx="${x + 8}" cy="${50 + (i % 2) * 6}" r="11" fill="${ACC}" stroke="${G}" stroke-width="2"/>
       <rect x="${x - 2}" y="${36 + (i % 2) * 6}" width="20" height="5" fill="${INK}"/>
       <path d="M${x - 4} ${116} L${x} ${66 + (i % 2) * 6} H${x + 16} L${x + 20} 116 Z" fill="${INK}" stroke="${G}" stroke-width="1.5"/>`).join('')}
      <path d="M6 22 H114" stroke="${G}" stroke-width="2"/><text x="60" y="16" text-anchor="middle" font-size="11" fill="${G}" font-family="Limelight, serif">BANK</text></svg>`,
    bear: `<svg viewBox="0 0 120 120" class="art"><circle cx="30" cy="30" r="14" fill="${ACC}" stroke="${G}" stroke-width="3"/><circle cx="90" cy="30" r="14" fill="${ACC}" stroke="${G}" stroke-width="3"/>
      <circle cx="60" cy="62" r="40" fill="${ACC}" stroke="${G}" stroke-width="3"/>
      <path d="M40 52 L52 58 M80 52 L68 58" stroke="${PAPER}" stroke-width="4"/><circle cx="48" cy="62" r="4" fill="${G}"/><circle cx="72" cy="62" r="4" fill="${G}"/>
      <ellipse cx="60" cy="82" rx="16" ry="12" fill="${PAPER}"/><path d="M54 78 H66 L60 86 Z" fill="${INK}"/>
      <path d="M8 96 L30 104 L46 100 L66 110 L84 108 L112 118" fill="none" stroke="${G}" stroke-width="3"/></svg>`,
    boss: `<svg viewBox="0 0 120 120" class="art"><rect x="14" y="10" width="92" height="100" fill="${INK}" stroke="${G}" stroke-width="3"/>
      <path d="M14 30 H106 M14 92 H106" stroke="${G}" stroke-width="2"/>
      <text x="60" y="25" text-anchor="middle" font-size="12" fill="${G}" font-family="Limelight, serif">EXTRA</text>
      <text x="60" y="56" text-anchor="middle" font-size="16" fill="${PAPER}" font-family="Limelight, serif">WALL ST.</text>
      <text x="60" y="78" text-anchor="middle" font-size="16" fill="${PAPER}" font-family="Limelight, serif">LAYS AN EGG</text>
      <path d="M22 104 L40 98 L58 103 L76 96 L98 106" fill="none" stroke="${G}" stroke-width="2"/></svg>`,
  };

  // Art-deco sunburst used behind headings.
  const sunburst = `<svg viewBox="0 0 200 60" class="sunburst" aria-hidden="true">${Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (i / 12); const x = 100 - Math.cos(a) * 95, y = 60 - Math.sin(a) * 55;
    return `<line x1="100" y1="60" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--gold)" stroke-width="1"/>`; }).join('')}</svg>`;

  return { owl, monsters, sunburst };
})();
