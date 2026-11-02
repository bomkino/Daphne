// Pulls the two shapes the sting is made of out of Daphne's own code, so the film
// can't drift from the product or the brand:
//
//   the laurel  a Classic Gold laurel drawn by Daphne's engine (prototype/engine.mjs), in
//               its festival-grade default shape and flat ink, leaf by leaf, with placeholder words nobody could take for a real selection
//   the logo    the hero lockup from brand/tools/mark.mjs: PD Head 400 outlines and the
//               leaf-bracket parameters, which src/leaf.ts redraws frame by frame
//
//   node scripts/data.mjs      writes src/data/laurel.json and src/data/logo.json, and copies
//                              brand/fonts into public/fonts for the render
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { render, DEFAULT_DOC, clone, merge, applyForm, METALS } from '../../../../prototype/engine.mjs';
import { PRESETS } from '../../../../prototype/presets.js';
import { lockup, LOCKUP, LEAF, HERO_LEAF, glyphRun, COLORS } from '../../../tools/mark.mjs';

const out = (name, data) => {
  writeFileSync(new URL(`../src/data/${name}.json`, import.meta.url), JSON.stringify(data));
  console.log(`src/data/${name}.json`);
};
const nums = (d) => (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
const ptsOf = (d) => { const n = nums(d), p = []; for (let i = 0; i + 1 < n.length; i += 2) p.push([n[i], n[i + 1]]); return p; };

// ── the laurel ──────────────────────────────────────────────────────────────
const preset = PRESETS.find((q) => q.name === 'Classic Gold');
let doc = clone(DEFAULT_DOC);
if (preset.doc.form) doc = applyForm(doc, preset.doc.form);
doc = merge(doc, preset.doc);
const words = ['Official Selection', 'Your Festival', '2026'];
doc.fields = doc.fields.map((f, i) => ({ ...f, text: words[i] ?? f.text, show: i < words.length }));
doc.canvas = { ...doc.canvas, bg: null };
const r = render(doc, { scale: 1 });
const B = r.B;
const stemPts = ptsOf(B.stemD);
const leaves = r.leaves.map((l) => {
  const inner = B.inner.indexOf(l.d), outer = B.outer.indexOf(l.d);
  if (inner < 0 && outer < 0) throw new Error('a leaf that is in neither row');
  const shade = inner >= 0 ? B.shadeIn[inner] : B.shadeOut[outer];
  const p = ptsOf(l.d);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  // the leaf's long axis: its two farthest points; the one nearer the stem is its base
  let best = 0, a = p[0], b = p[0];
  for (let i = 0; i < p.length; i += 2) for (let j = i + 1; j < p.length; j += 2) {
    const dd = (p[i][0] - p[j][0]) ** 2 + (p[i][1] - p[j][1]) ** 2;
    if (dd > best) { best = dd; a = p[i]; b = p[j]; }
  }
  const near = (q) => Math.min(...stemPts.map((s) => (s[0] - q[0]) ** 2 + (s[1] - q[1]) ** 2));
  const [base, tip] = near(a) <= near(b) ? [a, b] : [b, a];
  const len = Math.sqrt(best);
  // its width across the long axis
  const ux = (tip[0] - base[0]) / len, uy = (tip[1] - base[1]) / len;
  const across = p.map((q) => (q[0] - base[0]) * -uy + (q[1] - base[1]) * ux);
  return { d: l.d, shade: shade || '', row: inner >= 0 ? 'inner' : 'outer', t: l.t, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], base, tip, len, width: Math.max(...across) - Math.min(...across) };
});
const texts = [...r.svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)" text-anchor="middle" font-family="([^"]+)" font-weight="(\d+)" font-size="([\d.]+)" letter-spacing="([\d.]+)" fill="([^"]+)"[^>]*>([^<]+)<\/text>/g)]
  .map((m) => ({ x: +m[1], y: +m[2], family: m[3], weight: +m[4], size: +m[5], spacing: +m[6], fill: m[7], text: m[8] }));
if (texts.length < 3 || texts.length !== (r.svg.match(/<text /g) || []).length) throw new Error(`expected every line of words to parse, found ${texts.length}`);
const innerOpacity = /<g opacity="([\d.]+)">/.exec(r.svg);
// the default laurel is one flat ink now; a metal preset still brings its gradient
const ink = typeof doc.paint.branch === 'string' ? doc.paint.branch : null;
out('laurel', {
  viewBox: r.viewBox,
  ink: ink ?? METALS.gold[3][1],
  gold: ink ? [[0, ink], [1, ink]] : METALS.gold,
  // each leaf carries its own gradient across its box, at the engine's 20 degrees
  goldAxis: [0.27, 0.94, 0.73, 0.06],
  innerOpacity: innerOpacity ? +innerOpacity[1] : 1,
  stem: B.stemD,
  stemBox: [Math.min(...stemPts.map((q) => q[0])), Math.min(...stemPts.map((q) => q[1])), Math.max(...stemPts.map((q) => q[0])), Math.max(...stemPts.map((q) => q[1]))],
  leaves,
  texts,
});

// ── the logo ────────────────────────────────────────────────────────────────
const LK = lockup({ leaf: HERO_LEAF });
const g = glyphRun(LOCKUP.word);
const glyphs = g.glyphs.map((gl, i) => ({ x: gl.x + i * LOCKUP.track, d: gl.d }));
out('logo', {
  colors: COLORS,
  LEAF,
  HERO_LEAF,
  gapL: LOCKUP.gapL,
  gapR: LOCKUP.gapR,
  wordW: LK.wordW,
  box: LK.box,
  glyphs,
  // for checking src/leaf.ts against mark.mjs
  check: { left: LK.L.d, right: LK.R.d, leftStalk: LK.L.stalk },
});

// ── the faces ───────────────────────────────────────────────────────────────
// brand/fonts is the one copy in the repository; the render serves these from public/.
mkdirSync(new URL('../public/fonts/', import.meta.url), { recursive: true });
for (const f of ['pd-head.woff2', 'pd-body-roman.woff2', 'pd-body-alt-roman.woff2', 'pd-eyebrow-site.woff2'])
  copyFileSync(new URL(`../../../fonts/${f}`, import.meta.url), new URL(`../public/fonts/${f}`, import.meta.url));
console.log('public/fonts/ (from brand/fonts)');
