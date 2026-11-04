// Every look, rendered with the default words, for before/after comparison (tests/looks.mjs).
// window.__looks = [{ name, hash }]: a hash of the SVG with its generated ids normalized, drawn with fixed text widths.
import { render, DEFAULT_DOC, merge, clone, applyForm } from '../engine.mjs';
import { loadFont } from '../fonts.js';
import { PRESETS } from '../presets.js';
import { LAYOUTS, layoutFields } from '../layouts.js';

const mctx = document.createElement('canvas').getContext('2d');
const measure = (s, font, weight, italic, size) => { mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}", sans-serif`; return mctx.measureText(s).width; };
// The hash uses widths worked out from the words alone, never from a browser's fonts: real text widths differ from one
// machine to the next (font hinting and rasterizer settings), which made the same look hash differently on CI. The
// sheet still draws every look with its real fonts. The made-up widths still depend on the font, weight, slant and
// letters, so changing any of them in a look still shows up as a change.
const fontFactor = (font) => { let h = 7; for (const c of String(font)) h = (h * 31 + c.charCodeAt(0)) % 1000; return 0.9 + h / 5000; };
const charWidth = (c) => (/[A-Z]/.test(c) ? 0.68 : /[a-z]/.test(c) ? 0.52 : /[0-9]/.test(c) ? 0.56 : c === ' ' ? 0.28 : 0.4);
const fixedMeasure = (s, font, weight, italic, size) => {
  let w = 0; for (const c of String(s)) w += charWidth(c);
  return w * size * fontFactor(font) * (1 + ((weight || 400) - 400) / 2000) * (italic ? 0.97 : 1);
};

// the app's applyPreset, for a fresh document (app.js)
let uid = 100; const newId = () => 'f' + ++uid;
function applyPreset(p, from) {
  let fields = clone(from.fields);
  let d = merge(clone(DEFAULT_DOC), { roles: from.roles });
  if (p.doc.form) d = applyForm(d, p.doc.form);
  d = merge(d, p.doc); d.seed = from.seed;
  for (const k of Object.keys(d.roles)) if (!(p.doc.roles && p.doc.roles[k] && 'paint' in p.doc.roles[k])) d.roles[k].paint = null;
  const lay = p.layout || (from.layoutBy === 'preset' ? from.userLayoutId || 'year-below' : null);
  if (lay) fields = layoutFields(fields, LAYOUTS.find((L) => L.id === lay), newId);
  d.fields = fields; d.layoutId = lay || from.layoutId; d.presetName = p.name;
  return d;
}

// generated ids (gradients, paths, masks) count up across renders: rename them in order of appearance
function normalize(svg) {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const map = new Map(ids.map((id, i) => [id, 'i' + i]));
  return svg.replace(/(\sid="|url\(#|href="#)([^")]+)/g, (m, a, id) => a + (map.get(id) || id));
}
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16); }

(async () => {
  const base = applyPreset(PRESETS[0], clone(DEFAULT_DOC));
  const docs = [['Default laurel', base], ...PRESETS.map((p) => [p.name, applyPreset(p, base)])];
  const fonts = new Set(); docs.forEach(([, d]) => Object.values(d.roles).forEach((r) => r && r.font && fonts.add(r.font)));
  await Promise.all([...fonts].map((f) => loadFont(f, [300, 400, 500, 600, 700, 800, 900]).catch(() => null)));
  await document.fonts.ready;
  const grid = document.getElementById('grid'), out = [];
  for (const [name, d] of docs) {
    out.push({ name, hash: await sha(normalize(render(d, { measure: fixedMeasure, scale: 1 }).svg)) });
    const r = render(d, { measure, scale: 1 });
    const fig = document.createElement('figure'); fig.innerHTML = r.svg; const cap = document.createElement('figcaption'); cap.textContent = name; fig.append(cap); grid.append(fig);
  }
  window.__looks = out;
})();
