// laurelgen.mjs — procedural laurel engine (spike). Pure functions, no dependencies; runs in Node and the browser.
// A laurel = spine × leaf × arrangement × ornaments × render × type. Every look is a parameter set plus a seed,
// so the range is open-ended: change a number and you get a new, still-coherent laurel.
// Geometry is emitted in absolute coordinates (no transforms on leaves), so a later pass can union it into one path.
// Guardrails live in the engine, not in the presets: the two tips never collide, and text is fitted to the free
// space inside the branches (measured from the real geometry), wrapping a line only when that buys real size.

export const rngOf = (seed) => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const rad = (d) => (d * Math.PI) / 180;
const f = (v) => +v.toFixed(2);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ── transforms (functions on points, composable) ──
const X = (ox, oy, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return ([x, y]) => [ox + x * c - y * s, oy + x * s + y * c]; };
const comp = (outer, inner) => (p) => outer(inner(p));

// every outline point is also dropped in SINK while a branch is being built, to measure free space and collisions
let SINK = null;
const sink = (pt) => { if (SINK) SINK.push(pt); return pt; };

// ── smooth paths ──
function smoothOpen(pts, move = true) {
  let d = move ? `M${f(pts[0][0])} ${f(pts[0][1])}` : `L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const polyD = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
export const circleD = (x, y, r) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
const dotD = (x, y, r) => { for (let k = 0; k < 8; k++) sink([x + r * Math.cos(k * 0.785), y + r * Math.sin(k * 0.785)]); return circleD(x, y, r); };

// ── leaf profiles: half-width (0..1) along the leaf axis u ∈ [0,1] (base → tip) ──
const S = (u) => Math.sin(Math.PI * clamp(u, 0, 1));
export const PROFILES = {
  almond: (u) => Math.pow(S(u), 0.85) * (1 - 0.2 * u),
  lance: (u) => Math.pow(S(u), 1.35),
  willow: (u) => Math.pow(S(u), 1.9),
  round: (u) => Math.pow(S(Math.pow(u, 0.75)), 0.6),
  spoon: (u) => Math.pow(S(Math.pow(u, 1.45)), 0.7),
  heart: (u) => Math.pow(S(Math.pow(u, 0.5)), 0.75) * (1 - 0.15 * u),
  oak: (u) => Math.pow(S(u), 0.7) * (0.55 + 0.45 * Math.pow(Math.abs(Math.sin(4.5 * Math.PI * u)), 0.6)),
  serrate: (u) => Math.pow(S(u), 0.9) * (1 - 0.2 * Math.abs(Math.sin(10 * Math.PI * u))),
  diamond: (u) => (u < 0.42 ? u / 0.42 : (1 - u) / 0.58),
  rachis: (u) => 1 - 0.85 * u,
};
const SHARP = { diamond: true };

// one leaf from a profile; xf maps local (base at 0,0, axis +x) to output space
function profileD(prof, L, W, bend, xf, vein = 0, N = 36) {
  const h = PROFILES[prof], top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, b = bend * L * u * u, w = (h(u) * W) / 2;
    top.push(sink(xf([u * L, b - w]))); bot.push(sink(xf([u * L, b + w])));
  }
  bot.reverse();
  let d = SHARP[prof] ? polyD(top.concat(bot.slice(1))) : smoothOpen(top) + smoothOpen(bot, false) + 'Z';
  if (vein > 0) { // midrib cut-out (fill-rule evenodd)
    const vt = [], vb = [];
    for (let i = 0; i <= 20; i++) { const u = 0.07 + 0.82 * (i / 20), b = bend * L * u * u, w = (PROFILES.willow((u - 0.07) / 0.82) * W * vein) / 2; vt.push(xf([u * L, b - w])); vb.push(xf([u * L, b + w])); }
    vb.reverse(); d += ' ' + smoothOpen(vt) + smoothOpen(vb, false) + 'Z';
  }
  return d;
}

// ── leaf families: each returns path strings in output space ──
export const FAMILIES = {
  simple: (L, W, o, xf) => [profileD(o.profile, L, W, o.bend, xf, o.vein)],
  fern: (L, W, o, xf) => {
    const out = [profileD('rachis', L, W * 0.07, o.bend, xf)], m = 11;
    for (let j = 0; j < m; j++) {
      const u = 0.1 + 0.86 * (j / (m - 1)), side = j % 2 ? 1 : -1, ll = W * (1.1 - 0.8 * u), b = o.bend * L * u * u;
      out.push(profileD('lance', ll, ll * 0.34, 0.12 * side, comp(xf, X(u * L, b, side * rad(56 - 18 * u)))));
    }
    return out;
  },
  palm: (L, W, o, xf) => {
    const out = [profileD('rachis', L, W * 0.06, o.bend, xf)], m = 10;
    for (let j = 0; j < m; j++) {
      const u = 0.12 + 0.84 * (j / (m - 1)), ll = W * (1.35 - 0.7 * u), b = o.bend * L * u * u;
      for (const side of [-1, 1]) out.push(profileD('willow', ll, ll * 0.13, -0.18 * side, comp(xf, X(u * L, b, side * rad(32)))));
    }
    return out;
  },
  wheat: (L, W, o, xf) => {
    const out = [profileD('rachis', L * 0.9, W * 0.06, o.bend, xf)], m = 6;
    for (let j = 0; j < m; j++) {
      const u = 0.22 + 0.7 * (j / (m - 1)), gl = W * 0.62 * (1 - 0.3 * u), b = o.bend * L * u * u;
      for (const side of [-1, 1]) {
        const g = comp(xf, X(u * L, b, side * rad(24)));
        out.push(profileD('almond', gl, gl * 0.52, 0, g));
        out.push(profileD('willow', gl * 1.25, gl * 0.06, 0.05 * side, comp(g, X(gl * 0.85, 0, side * rad(6))))); // awn
      }
    }
    out.push(profileD('almond', W * 0.5, W * 0.26, 0, comp(xf, X(L * 0.88, o.bend * L * 0.77, 0))));
    return out;
  },
  needle: (L, W, o, xf) => { const out = []; for (let j = 0; j < 7; j++) { const a = rad(-26 + (52 * j) / 6); out.push(profileD('willow', L * (0.78 + 0.22 * Math.cos(a * 2)), W * 0.09, o.bend * 0.5, comp(xf, X(0, 0, a)))); } return out; },
};

// ornaments
const flowerD = (x, y, r, rot) => { const out = []; for (let k = 0; k < 5; k++) out.push(profileD('round', r, r * 0.85, 0, X(x, y, rot + (k * 2 * Math.PI) / 5))); out.push(dotD(x, y, r * 0.22)); return out; };

// ── spine: an elliptical arc (optionally spiral + curled tip), sampled with tangents and outward normals ──
function spineAt(sp, t) {
  const th = rad(sp.a0 + (sp.a1 - sp.a0) * t + sp.curl * Math.pow(Math.max(t, 0), 3));
  const r = 100 * (1 + sp.spiral * (t - 0.5));
  return [sp.rx * r * Math.cos(th), sp.ry * r * Math.sin(th)];
}
function sampleSpine(sp, t0, t1, N = 260) {
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = t0 + ((t1 - t0) * i) / N; pts.push({ t, p: spineAt(sp, t) }); }
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(N, i + 1)].p;
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = ty, ny = -tx; if (nx * q.p[0] + ny * q.p[1] < 0) { nx = -nx; ny = -ny; }
    q.T = [tx, ty]; q.N = [nx, ny];
  });
  return { pts };
}
function atT(sp, t) { const pts = sp.pts; let i = pts.findIndex((q) => q.t >= t); if (i < 0) i = pts.length - 1; return pts[i]; }

// ── the laurel ──
export const DEFAULTS = {
  spine: { rx: 0.8, ry: 1, a0: 100, a1: 252, curl: 0, spiral: 0, cross: 0, gap: 12 },
  stem: { w: 2.2, taper: 0.6 },
  leaf: { family: 'simple', profile: 'almond', n: 12, L0: 30, L1: 15, wr: 0.36, bend: 0.1, aOut: 32, aIn: 28, inScale: 0.85, arr: 'alternate', gamma: 1, jitter: 0, vein: 0 },
  orn: { tip: 'leaf', berries: 0, flowers: 0, ribbon: false },
  render: { mode: 'gradient', depth: 0.25, sw: 1.3, shadow: false },
};
const merge = (a, b) => { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return o; };
const maxX = (pts, keep) => { let m = -Infinity; for (const q of pts) if (keep(q) && q[0] > m) m = q[0]; return m; };

// left branch (the right one is its mirror). Shortens the arc until the tips keep `gap` apart.
export function buildBranch(params, seed = 1) {
  const p = merge(DEFAULTS, params);
  let a0 = p.spine.a0, a1 = p.spine.a1, B;
  for (let k = 0; k < 24; k++) {
    B = buildOnce({ ...p, spine: { ...p.spine, a0, a1 } }, seed);
    const g = -p.spine.gap / 2;
    const topBad = maxX(B.pts, (q) => q[1] < -15) > g, botBad = !p.spine.cross && maxX(B.pts, (q) => q[1] > 15) > g;
    if (!topBad && !botBad) break;
    if (topBad) a1 -= 3;
    if (botBad) a0 += 3;
    if (a1 - a0 < 100) break;
  }
  // free half-width inside the branches, per 2-unit band of y
  const bins = new Map();
  for (const [x, y] of B.pts) { const b = Math.round(y / 2); if (!bins.has(b) || x > bins.get(b)) bins.set(b, x); }
  B.free = (y0, y1) => { let m = Infinity; for (let b = Math.floor(y0 / 2); b <= Math.ceil(y1 / 2); b++) { const x = bins.get(b); if (x !== undefined) m = Math.min(m, -x); } return m; };
  return B;
}

function buildOnce(p, seed) {
  const rnd = rngOf(seed), J = (amt) => (rnd() * 2 - 1) * amt;
  const sp = p.spine, lf = p.leaf;
  const tail = sp.cross ? (sp.a0 - 90 + sp.cross) / (sp.a1 - sp.a0) : 0;
  const S0 = sampleSpine(sp, -tail, 1);
  const pts = (SINK = []);
  const inner = [], outer = [], orn = [];
  // stem: tapered ribbon along the spine
  const hw = (t) => (p.stem.w / 2) * (1 - p.stem.taper * clamp(t, 0, 1));
  const left = S0.pts.map((q) => sink([q.p[0] + q.N[0] * hw(q.t), q.p[1] + q.N[1] * hw(q.t)]));
  const right = S0.pts.map((q) => sink([q.p[0] - q.N[0] * hw(q.t), q.p[1] - q.N[1] * hw(q.t)])).reverse();
  if (sp.cross) pts.length = 0; // a crossed stem is meant to cross; don't let it count as a collision
  const stemD = p.stem.w > 0 ? smoothOpen(left) + smoothOpen(right, false) + 'Z' : '';
  const stemLine = smoothOpen(S0.pts.map((q) => q.p));
  // leaves
  const n = lf.n, half = 0.5 / Math.max(1, n - 1);
  const place = (t, side, scale) => {
    const q = atT(S0, t), u = clamp(t, 0, 1);
    const L = lerp(lf.L0, lf.L1, Math.pow(u, 0.9)) * scale * (1 + J(lf.jitter * 0.22));
    const a = rad((side > 0 ? lf.aOut : lf.aIn) + J(lf.jitter * 14));
    const dir = [q.T[0] * Math.cos(a) + side * q.N[0] * Math.sin(a), q.T[1] * Math.cos(a) + side * q.N[1] * Math.sin(a)];
    const ang = Math.atan2(dir[1], dir[0]);
    const ly = [-Math.sin(ang), Math.cos(ang)], sb = Math.sign(ly[0] * q.T[0] + ly[1] * q.T[1]) || 1; // bend towards the tip
    const ds = FAMILIES[lf.family](L, L * lf.wr, { ...lf, bend: (lf.bend + J(lf.jitter * 0.12)) * sb }, X(q.p[0], q.p[1], ang));
    (side > 0 ? outer : inner).push(...ds);
  };
  for (let i = 0; i < n; i++) {
    const t = 0.03 + 0.93 * Math.pow(i / Math.max(1, n - 1), lf.gamma);
    if (lf.arr !== 'inner') place(t, +1, 1);
    if (lf.arr === 'paired' || lf.arr === 'inner') place(t, -1, lf.inScale);
    else if (lf.arr === 'alternate' && i < n - 1) place(t + half * 0.93, -1, lf.inScale);
    if (p.orn.berries && i % p.orn.berries === 1 && i < n - 2) { const q = atT(S0, t + half * 0.5), r = lerp(lf.L0, lf.L1, t) * 0.13 + 1; orn.push(dotD(q.p[0] - q.N[0] * r * 3, q.p[1] - q.N[1] * r * 3, r)); }
    if (p.orn.flowers && i % p.orn.flowers === 2 && i < n - 1) { const q = atT(S0, t + half * 0.5), r = lerp(lf.L0, lf.L1, t) * 0.32; orn.push(...flowerD(q.p[0] - q.N[0] * r * 1.6, q.p[1] - q.N[1] * r * 1.6, r, rnd() * 6)); }
  }
  // tip
  const qt = S0.pts[S0.pts.length - 1], tang = Math.atan2(qt.T[1], qt.T[0]);
  if (p.orn.tip === 'leaf') outer.push(...FAMILIES[lf.family](lf.L1 * 1.05, lf.L1 * 1.05 * lf.wr, lf, X(qt.p[0], qt.p[1], tang)));
  if (p.orn.tip === 'bud') outer.push(profileD('almond', lf.L1 * 0.75, lf.L1 * 0.4, 0, X(qt.p[0], qt.p[1], tang)));
  if (p.orn.tip === 'berry') orn.push(dotD(qt.p[0] + qt.T[0] * 3, qt.p[1] + qt.T[1] * 3, 3));
  if (p.orn.tip === 'flower') orn.push(...flowerD(qt.p[0] + qt.T[0] * 6, qt.p[1] + qt.T[1] * 6, 7, tang));
  SINK = null;
  let top = Infinity, bottom = -Infinity, halfW = 0;
  for (const [x, y] of pts) { if (y < top) top = y; if (y > bottom) bottom = y; if (-x > halfW) halfW = -x; }
  if (sp.cross) for (const q of S0.pts) bottom = Math.max(bottom, q.p[1]);
  return { p, pts, stemD, stemLine, inner, outer, orn, top, bottom, halfW };
}

// ── type: rough advance widths per family (caps), until the app measures real glyphs (opentype.js) ──
const CAPW = { Figtree: 0.7, 'Avenir Next': 0.68, Futura: 0.66, 'Bodoni 72': 0.72, Baskerville: 0.72, 'Gill Sans': 0.64 };
function textW(txt, size, capW, track) {
  let w = 0;
  for (const ch of txt) w += ch === ' ' ? 0.28 : /[IJ1.,'’]/.test(ch) ? 0.34 : /[MW]/.test(ch) ? 0.92 : /[a-z]/.test(ch) ? capW * 0.74 : capW;
  return w * size + track * Math.max(0, [...txt].length - 1);
}
const splitTwo = (s) => { const w = s.split(' '); if (w.length < 2) return null; let best = null; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { a, b, d }; } return [best.a, best.b]; };

// Largest hero size H for which every line fits the free width at its own height. Tries wrapping a two-word line.
function layoutText(B, t, pal) {
  const font = t.font, sFont = t.smallFont || font, capW = t.capW || CAPW[font] || 0.68, sCapW = CAPW[sFont] || 0.68;
  const base = (t.layout === 'year' ? [['hero', t.hero], ['big', t.year], ['small', t.status]] : [['small', t.status], ['hero', t.hero], ['small', t.year]])
    .filter(([, s]) => s).map(([role, s]) => [role, role === 'small' ? String(s).toUpperCase() : String(s)]);
  const variants = [{ lines: base, wraps: 0 }];
  base.forEach(([role, s], i) => { const two = splitTwo(s); if (two) variants.push({ lines: [...base.slice(0, i), [role, two[0]], [role, two[1]], ...base.slice(i + 1)], wraps: 1 }); });
  const minSmall = t.minSmall || 5.5, pad = t.pad ?? 5, cy = t.dy ?? 2;
  const set = (lines, H) => {
    const small = Math.max(minSmall, H * (t.smallRatio || 0.36));
    const L = lines.map(([role, s]) => {
      const size = role === 'hero' ? H : role === 'big' ? H * 1.5 : small;
      const track = role === 'small' ? size * 0.2 : size * 0.01;
      return { role, s, size, track, w: textW(s, size, role === 'small' ? sCapW : capW, track), h: size * 0.72 };
    });
    let y = 0; L.forEach((l, i) => { if (i) y += L[i - 1].role === l.role ? l.size * 0.28 : small * 1.05; l.top = y; y += l.h; });
    const off = cy - y / 2; L.forEach((l) => { l.top += off; l.base = l.top + l.h; });
    const ok = L.every((l) => B.free(l.top - pad * 0.6, l.base + pad * 0.6) >= l.w / 2 + pad);
    return { L, ok, small };
  };
  let best = null;
  for (const v of variants) {
    let lo = 3, hi = t.heroMax || 34;
    if (!set(v.lines, lo).ok) continue;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (set(v.lines, m).ok) lo = m; else hi = m; }
    const score = lo * (v.wraps ? 0.8 : 1);
    if (!best || score > best.score) best = { score, H: lo, v };
  }
  if (!best) best = { H: 3, v: variants[0] };
  const { L } = set(best.v.lines, best.H);
  return L.map((l) => `<text x="0" y="${f(l.base)}" text-anchor="middle" font-family="${l.role === 'small' ? sFont : font}" font-weight="${l.role === 'small' ? t.smallWeight || 700 : t.weight || 800}" font-size="${f(l.size)}" letter-spacing="${f(l.track)}" fill="${l.role === 'small' ? pal.sub : pal.text}">${esc(l.s)}</text>`).join('');
}

// ── render one laurel as an SVG fragment centred on (0,0) ──
let UID = 0;
export function renderLaurel(params, seed, look) {
  const id = 'l' + ++UID, B = buildBranch(params, seed), r = B.p.render, pal = look.palette;
  const stops = pal.stops || [[0, pal.base], [1, pal.tip || pal.base]];
  let defs = `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${f(B.bottom)}" x2="0" y2="${f(B.top)}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  if (r.shadow) defs += `<filter id="${id}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="2"/><feComponentTransfer><feFuncA type="linear" slope="0.6"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const paint = r.mode === 'solid' ? pal.base : `url(#${id}g)`;
  const outline = r.mode === 'outline';
  const P = (d, extra = '') => `<path d="${d}"${extra}/>`;
  const veinRule = B.p.leaf.vein > 0 ? ' fill-rule="evenodd"' : '';
  const branch = [
    `<g opacity="${f(1 - r.depth)}">${B.inner.map((d) => P(d, veinRule)).join('')}</g>`,
    outline ? `<path d="${B.stemLine}" fill="none"/>` : P(B.stemD),
    B.outer.map((d) => P(d, veinRule)).join(''),
    B.orn.map((d) => P(d)).join(''),
  ].join('');
  const style = outline ? `fill="none" stroke="${paint}" stroke-width="${r.sw}" stroke-linejoin="round"` : `fill="${paint}"`;
  let body = `<g ${style}${r.shadow ? ` filter="url(#${id}s)"` : ''}><g id="${id}b">${branch}</g><use href="#${id}b" transform="scale(-1 1)"/>`;
  let bottom = B.bottom;
  if (B.p.orn.ribbon) {
    const y = B.bottom - 10; bottom = y + 26;
    body += [profileD('round', 26, 18, 0.1, X(0, y, rad(200))), profileD('round', 26, 18, -0.1, X(0, y, rad(-20))), profileD('willow', 30, 9, 0.1, X(0, y, rad(115))), profileD('willow', 30, 9, -0.1, X(0, y, rad(65))), circleD(0, y, 4)].map((d) => P(d)).join('');
  }
  body += '</g>';
  return { defs, body: body + layoutText(B, look.type, pal), top: B.top, bottom, halfW: B.halfW, p: B.p };
}

// ── shuffle: a coherent random look inside guardrails ──
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
export function shuffle(seed) {
  const r = rngOf(seed * 7919 + 13), R = (a, b) => lerp(a, b, r());
  const family = pick(r, ['simple', 'simple', 'simple', 'simple', 'fern', 'wheat', 'palm', 'needle']);
  const profile = pick(r, ['almond', 'lance', 'willow', 'round', 'spoon', 'heart', 'oak', 'serrate', 'diamond']);
  const n = family === 'simple' ? Math.round(R(profile === 'round' || profile === 'heart' || profile === 'oak' ? 6 : 8, profile === 'willow' || profile === 'lance' ? 22 : 15)) : Math.round(R(4, 8));
  const L0 = family === 'simple' ? R(220, 420) / n + 8 : R(40, 62), L1 = L0 * R(0.45, 0.85);
  return {
    spine: { rx: R(0.68, 0.92), ry: 1, a0: R(96, 112), a1: R(240, 262), curl: r() < 0.25 ? R(10, 40) : 0, spiral: r() < 0.2 ? R(0.1, 0.3) : 0, cross: r() < 0.3 ? R(14, 30) : 0 },
    stem: { w: R(0.8, 3.6), taper: R(0.2, 0.8) },
    leaf: { family, profile, n, L0, L1, wr: family === 'simple' ? (profile === 'round' || profile === 'heart' ? R(0.65, 0.95) : profile === 'willow' ? R(0.16, 0.26) : R(0.26, 0.5)) : R(0.55, 0.9), bend: R(-0.05, 0.3), aOut: R(18, profile === 'round' ? 70 : 48), aIn: R(14, 40), inScale: R(0.65, 1), arr: pick(r, ['alternate', 'alternate', 'paired', 'outer']), gamma: R(0.85, 1.25), jitter: r() < 0.25 ? R(0.1, 0.4) : 0, vein: r() < 0.2 && family === 'simple' ? R(0.12, 0.22) : 0 },
    orn: { tip: pick(r, ['leaf', 'leaf', 'bud', 'berry', 'none']), berries: r() < 0.2 ? 2 : 0, flowers: r() < 0.12 ? 3 : 0, ribbon: r() < 0.12 },
    render: { mode: pick(r, ['gradient', 'gradient', 'gradient', 'solid', 'outline']), depth: R(0.1, 0.45), sw: R(0.9, 1.8) },
  };
}
