// Daphne's mark, as code. A laurel is two leaves around a name, so the logo is the
// name set between two bay leaves drawn as brackets. Everything here is plain
// geometry: no dependencies, no randomness, the same output every time.
//
// Units are font units of PD Head (1000 per em), y pointing down, baseline at 0.

import { readFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
export const glyphRun = (name) => JSON.parse(readFileSync(new URL(`glyphs/${name}.json`, here), 'utf8'));

// ── palette ────────────────────────────────────────────────────────────────
export const COLORS = {
  grove: '#12291E', // the ground: a laurel grove at night
  groveDeep: '#0B1B13', // the grove's shadow, for vignettes and depth
  paper: '#F3F6EF', // words on Grove; the light ground
  newLeaf: '#B8E59A', // the leaves on Grove
  bay: '#1F5C3B', // the leaves on Paper and white
  bloom: '#F59CC0', // the Daphne flower: one accent, used once
};

const f = (n) => (Math.round(n * 100) / 100).toString();

// Catmull-Rom through the points, as cubic Béziers
function smooth(pts, closed = true) {
  const n = pts.length, P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

// ── the leaf bracket ───────────────────────────────────────────────────────
// One bay leaf set as a bracket: side -1 is "(", side +1 is ")". The spine is a
// circular arc through (x0, yBot) and (x0, yTop) that bulges outward by `sag`.
// The base sits at the bottom with a short stalk that bends in under the words;
// the tip points up. A hairline midrib (the slit) is cut out of the leaf, so the
// leaf stays one path drawn with fill-rule evenodd and works in one colour.
export const LEAF = { yTop: -880, yBot: 240, sag: 205, W: 220, asym: 0.05, p: 0.92, q: 0.72, taper: 0.18, slit: 0.075, slitTo: 0.8, stalk: 0.11, stalkCurl: 0.85, stalkW: 0.075, wave: 0.025, waves: 3.5, veins: 0, veinW: 0.016 };

export function leafBracket(opts = {}) {
  const o = { ...LEAF, side: -1, x0: 0, N: 64, ...opts };
  const { side, x0, yTop, yBot, sag, W, asym, p, q, taper, slit, slitTo, stalk, stalkCurl, stalkW, N, wave, waves, veins, veinW } = o;
  const H = yBot - yTop, c = H / 2, R = (c * c + sag * sag) / (2 * sag);
  const cy = (yTop + yBot) / 2, cx = x0 - side * (R - sag), th = Math.asin(c / R);
  // spine point at u (0 = base, 1 = tip)
  const P = (u) => { const a = -th + 2 * th * u, ang = side < 0 ? Math.PI - a : a; return [cx + R * Math.cos(ang), cy - R * Math.sin(ang)]; };
  // outward normal and tangent at u
  const frame = (u) => {
    const e = 1e-4, a = P(Math.max(0, u - e)), b = P(Math.min(1, u + e));
    let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy); dx /= m; dy /= m;
    let nx = -dy, ny = dx; const [px, py] = P(u); if ((px - cx) * nx + (py - cy) * ny < 0) { nx = -nx; ny = -ny; }
    return [nx, ny, dx, dy];
  };
  // a bay leaf's half-width along its length: a rounded base, widest a little
  // below the middle, a long acute tip
  const prof = (u) => { u = Math.min(1, Math.max(0, u)); return Math.pow(Math.sin(Math.PI * Math.pow(u, p)), q) * (1 - taper * u) * (1 - Math.pow(u, 6)); };
  // bay leaves have gently wavy margins: the edge rises and falls a few times along the leaf
  const wv = (u, ph) => 1 + wave * Math.sin(2 * Math.PI * waves * u + ph) * Math.sin(Math.PI * u);
  const out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, [x, y] = P(u), [nx, ny] = frame(u), w = (W * prof(u)) / 2;
    out.push([x + nx * w * (1 + asym) * wv(u, 0), y + ny * w * (1 + asym) * wv(u, 0)]);
    inn.push([x - nx * w * (1 - asym) * wv(u, 2.1), y - ny * w * (1 - asym) * wv(u, 2.1)]);
  }
  const leaf = smooth(out.concat(inn.reverse().slice(1, -1)));
  let cut = '';
  if (slit > 0) { // the midrib: widest at the base, gone before the tip
    const a = [], b = [], M = 36, off = W * asym * 0.25;
    for (let i = 0; i <= M; i++) {
      const t = i / M, u = 0.03 + (slitTo - 0.03) * t, [x, y] = P(u), [nx, ny] = frame(u);
      const w = ((W * slit) / 2) * Math.pow(1 - t, 0.9) * Math.min(1, 0.35 + t * 6);
      a.push([x + nx * (off + w), y + ny * (off + w)]); b.push([x + nx * (off - w), y + ny * (off - w)]);
    }
    cut = smooth(a.concat(b.reverse()), true);
  }
  // side veins, for large sizes: hairlines that leave the midrib toward the tip and fade before the margin
  if (veins > 0) {
    for (let k = 0; k < veins; k++) for (const sgn of [1, -1]) {
      const u0 = 0.12 + (0.68 * (k + (sgn > 0 ? 0 : 0.45))) / veins; if (u0 > 0.82) continue;
      const a = [], b = [], M = 14, du = 0.13;
      for (let i = 0; i <= M; i++) {
        const t = i / M, u = u0 + du * Math.pow(t, 1.4), [x, y] = P(u), [nx, ny] = frame(u), [, , tx, ty] = frame(u);
        const hw = ((W * prof(u)) / 2) * (1 + sgn * asym), r = sgn * hw * (0.08 + 0.7 * t), w = ((W * veinW) / 2) * (1 - t) + 0.4;
        const cx2 = x + nx * r, cy2 = y + ny * r;
        a.push([cx2 + tx * w, cy2 + ty * w]); b.push([cx2 - tx * w, cy2 - ty * w]);
      }
      cut += smooth(a.concat(b.reverse()), true);
    }
  }
  let stalkD = '', stalkPts = [];
  if (stalk > 0) { // carries on from the base, then bends in under the words
    const L = H * stalk, M = 24, [bx, by] = P(0.02), [, , tx, ty] = frame(0.02), ang = Math.atan2(-ty, -tx);
    let x = bx, y = by; stalkPts.push([x, y]);
    for (let i = 1; i <= M; i++) { const t = i / M, a = ang + side * stalkCurl * t * t; x += (Math.cos(a) * L) / M; y += (Math.sin(a) * L) / M; stalkPts.push([x, y]); }
    const Lp = [], Rp = [];
    for (let i = 0; i < stalkPts.length; i++) {
      const a = stalkPts[Math.max(0, i - 1)], b = stalkPts[Math.min(stalkPts.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const t = i / (stalkPts.length - 1), w = W * stalkW * (1 - 0.55 * t) * (t > 0.9 ? Math.sqrt(1 - ((t - 0.9) / 0.1) * 0.6) : 1);
      Lp.push([stalkPts[i][0] - dy * w, stalkPts[i][1] + dx * w]); Rp.push([stalkPts[i][0] + dy * w, stalkPts[i][1] - dx * w]);
    }
    stalkD = smooth(Lp.concat(Rp.reverse()), true);
  }
  // the growth path for motion: from the stalk's end, up the spine, to the tip
  // (it runs a little past both ends, so a soft-edged reveal leaves no faded tip)
  const spine = Array.from({ length: 41 }, (_, i) => P(0.02 + (0.98 * i) / 40));
  const ext = (a, b, k) => { const dx = a[0] - b[0], dy = a[1] - b[1], m = Math.hypot(dx, dy) || 1; return [a[0] + (dx / m) * k, a[1] + (dy / m) * k]; };
  const startPts = stalkPts.length ? stalkPts.slice().reverse() : [P(0)];
  const grow = [ext(startPts[0], startPts[1] || spine[1], 60)].concat(startPts, spine, [ext(spine[40], spine[39], 90)]);
  const xs = out.concat(inn, stalkPts).map((q) => q[0]), ys = out.concat(inn, stalkPts).map((q) => q[1]);
  return { d: leaf + cut, stalk: stalkD, grow: smooth(grow, false), bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], P, frame, stalkEnd: stalkPts[stalkPts.length - 1] || P(0), out, inn };
}

// ── compositions ───────────────────────────────────────────────────────────
const run = (g, dx = 0, track = 0) => g.glyphs.map((gl, i) => `<path transform="translate(${f(gl.x + dx + i * track)} 0)" d="${gl.d}"/>`).join('');
const leafPaths = (L) => `<path fill-rule="evenodd" d="${L.d}"/><path d="${L.stalk}"/>`;

// The logo: (Daphne). Gaps are optical: the D's flat side wants more air than the e's round one.
// The name is PD Head 400: light enough to feel classical, heavy enough to hold at 96 px.
export const LOCKUP = { word: 'Daphne-400', track: -6, gapL: 85, gapR: 66, leaf: {} };
// The hero lockup, for 400 px wide and up: the leaves carry their side veins.
export const HERO_LEAF = { veins: 7, slit: 0.06 };
export function lockup(opts = {}) {
  const o = { ...LOCKUP, ...opts }, g = glyphRun(o.word), n = g.glyphs.length;
  const wordW = g.width + o.track * (n - 1);
  const L = leafBracket({ side: -1, x0: -o.gapL, ...o.leaf }), R = leafBracket({ side: 1, x0: wordW + o.gapR, ...o.leaf });
  const box = [Math.min(L.bbox[0], 0), Math.min(L.bbox[1], R.bbox[1]), Math.max(R.bbox[2], wordW), Math.max(L.bbox[3], R.bbox[3])];
  return { word: run(g, 0, o.track), leaves: leafPaths(L) + leafPaths(R), L, R, wordW, box };
}

// The symbol: (D), for avatars, app icons and anywhere square. Fuller leaves, a
// heavier D, stalks that nearly meet under the letter like a wreath's crossed stems.
export const SYMBOL = { word: 'D-600', gap: 62, leaf: { W: 270, sag: 200, yTop: -850, yBot: 205, stalk: 0.15, stalkCurl: 1.45 } };
export function symbol(opts = {}) {
  const o = { ...SYMBOL, ...opts, leaf: { ...SYMBOL.leaf, ...(opts.leaf || {}) } }, g = glyphRun(o.word), dw = g.width;
  const L = leafBracket({ side: -1, x0: -o.gap, ...o.leaf }), R = leafBracket({ side: 1, x0: dw + o.gap, ...o.leaf });
  const box = [L.bbox[0], Math.min(L.bbox[1], R.bbox[1]), R.bbox[2], Math.max(L.bbox[3], R.bbox[3])];
  return { word: run(g), leaves: leafPaths(L) + leafPaths(R), L, R, box, cx: dw / 2, cy: (box[1] + box[3]) / 2 };
}

// The small symbol, for 16–32 px: no midrib (it fills in), heavier leaves, no stalks.
export function symbolSmall() {
  return symbol({ word: 'D-700', gap: 95, leaf: { W: 250, sag: 215, slit: 0, stalk: 0, wave: 0, yTop: -840, yBot: 150, q: 0.66 } });
}

// One leaf bracket on its own, in em units of PD Head, for setting a word in
// leaves inside a headline: place it at 1em font-size on the text's baseline.
export function bracketAlone(side) {
  const L = leafBracket({ side, x0: 0 });
  return { path: leafPaths(L), bbox: L.bbox, grow: L.grow };
}

export const svgOpen = (vb, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}"${extra}>`;
export { f, smooth };
