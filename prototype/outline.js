// outline.js — live text into shapes, so a printer or an editor needs no fonts, and the PDF built from it.
// Font files come from the Google Fonts repository (the same OFL fonts the app shows) and are shaped with HarfBuzz:
// kerning, ligatures and every script. Characters the chosen font lacks are drawn in the matching Noto font.
// Everything runs in the browser; nothing is uploaded.

// two mirrors of the same repository: jsDelivr first (fast, cached), GitHub's raw host if a network blocks it
const MIRRORS = ['https://cdn.jsdelivr.net/gh/google/fonts@main/', 'https://raw.githubusercontent.com/google/fonts/main/'];
let GF = MIRRORS[0];
async function gfFetch(path) {
  for (const base of [GF, ...MIRRORS.filter((m) => m !== GF)]) {
    const r = await fetch(base + path).catch(() => null);
    if (r && (r.ok || r.status === 404)) { GF = base; return r; }
  }
  return null;
}
let HBP = null;
const hb = () => HBP || (HBP = import('./vendor/hb-index.mjs'));
const metaCache = new Map(), blobCache = new Map();
// D30: a lookup that failed (offline, a blocked mirror) is forgotten, so the next export asks again
const forgetOnFail = (cache, key, fn) => { const p = fn(); p.catch(() => { if (cache.get(key) === p) cache.delete(key); }); return p; };
const dirOf = (fam) => fam.toLowerCase().replace(/[^a-z0-9]/g, '');
const fileUrl = (u) => u.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

// the family's METADATA.pb lists its files (static weights or one variable file per style) and its axes
function meta(fam) {
  if (!metaCache.has(fam)) metaCache.set(fam, forgetOnFail(metaCache, fam, async () => {
    for (const lic of ['ofl', 'apache', 'ufl']) {
      const r = await gfFetch(`${lic}/${dirOf(fam)}/METADATA.pb`);
      if (!r || !r.ok) continue;
      const t = await r.text();
      const fonts = [...t.matchAll(/\nfonts \{([\s\S]*?)\n\}/g)].map((m) => ({ style: (/style: "(\w+)"/.exec(m[1]) || [, 'normal'])[1], weight: +(/weight: (\d+)/.exec(m[1]) || [, 400])[1], file: /filename: "([^"]+)"/.exec(m[1])[1] }));
      const axes = [...t.matchAll(/axes \{\s*tag: "(\w+)"\s*min_value: ([-\d.]+)\s*max_value: ([-\d.]+)/g)].map((m) => ({ tag: m[1], min: +m[2], max: +m[3] }));
      if (fonts.length) return { base: `${lic}/${dirOf(fam)}/`, fonts, axes };
    }
    throw new Error(`Couldn’t find the font files for ${fam}`);
  }));
  return metaCache.get(fam);
}

// a HarfBuzz font for a family at a weight and style (variable files get the weight as a wght axis value)
async function fontFor(fam, weight = 400, italic = false) {
  const H = await hb(), m = await meta(fam), style = italic ? 'italic' : 'normal';
  const same = m.fonts.filter((x) => x.style === style), cands = same.length ? same : m.fonts;
  const vf = cands.find((x) => x.file.includes('['));
  const pick = vf || cands.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
  const url = m.base + pick.file;
  if (!blobCache.has(url)) blobCache.set(url, forgetOnFail(blobCache, url, async () => { const r = await gfFetch(fileUrl(url)); if (!r || !r.ok) throw new Error(`Couldn’t load ${pick.file}`); const face = new H.Face(new H.Blob(await r.arrayBuffer())); return face; }));
  const face = await blobCache.get(url), font = new H.Font(face);
  if (vf) { const wa = m.axes.find((a) => a.tag === 'wght'); if (wa) font.setVariations([new H.Variation('wght', Math.min(wa.max, Math.max(wa.min, weight)))]); }
  return { H, font, upem: face.upem, fam };
}

// scripts the curated fonts don't cover fall back to Noto
const FALLBACK = [
  [/[぀-ヿㇰ-ㇿ]/, 'Noto Sans JP'], [/[가-힯ᄀ-ᇿ㄰-㆏]/, 'Noto Sans KR'], [/[一-鿿㐀-䶿＀-￯　-〿]/, 'Noto Sans JP'],
  [/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/, 'Noto Sans Arabic'], [/[֐-׿]/, 'Noto Sans Hebrew'], [/[ऀ-ॿ]/, 'Noto Sans Devanagari'],
  [/[ঀ-৿]/, 'Noto Sans Bengali'], [/[฀-๿]/, 'Noto Sans Thai'], [/[԰-֏]/, 'Noto Sans Armenian'], [/[Ⴀ-ჿ]/, 'Noto Sans Georgian'],
  [/[☀-➿⭐⭕✀-➿]/, 'Noto Sans Symbols 2'], [/[\s\S]/, 'Noto Sans'],
];
const fallbackFor = (s) => FALLBACK.find(([re]) => re.test(s))[1];

// ── bidi: the visual order a browser gives an SVG <text> (base direction left to right), simplified from Unicode's
// bidi algorithm (UAX #9): Hebrew and Arabic read right to left, numbers inside them stay left to right, and spaces
// and punctuation take the direction of what's around them. Marks go with the letter before them.
const isMark = (c) => /\p{M}/u.test(c);
function bidiType(c) {
  const u = c.codePointAt(0);
  if (u >= 0x30 && u <= 0x39) return 'EN';
  if (u >= 0x660 && u <= 0x669) return 'AN';
  if (u >= 0x6f0 && u <= 0x6f9) return 'EN';
  if ((u >= 0x590 && u <= 0x5ff) || (u >= 0xfb1d && u <= 0xfb4f) || (u >= 0x7c0 && u <= 0x85f)) return 'R';
  if ((u >= 0x600 && u <= 0x6ff) || (u >= 0x750 && u <= 0x77f) || (u >= 0x8a0 && u <= 0x8ff) || (u >= 0xfb50 && u <= 0xfdff) || (u >= 0xfe70 && u <= 0xfeff)) return 'AL';
  if (/\p{L}/u.test(c)) return 'L';
  return 'ON';
}
export function bidiLevels(chars) {
  const t = chars.map(bidiType);
  for (let i = 0; i < t.length; i++) if (isMark(chars[i])) t[i] = i ? t[i - 1] : 'ON'; // W1
  let strong = 'L'; for (let i = 0; i < t.length; i++) { if (t[i] === 'EN' && strong === 'AL') t[i] = 'AN'; if (['L', 'R', 'AL'].includes(t[i])) strong = t[i]; } // W2
  for (let i = 0; i < t.length; i++) if (t[i] === 'AL') t[i] = 'R'; // W3
  for (let i = 1; i < t.length - 1; i++) if (/^[.,:/]$/.test(chars[i]) && t[i - 1] === t[i + 1] && (t[i - 1] === 'EN' || t[i - 1] === 'AN')) t[i] = t[i - 1]; // W4
  for (let i = 0; i < t.length; i++) if (/^[%$€£¥#+\-°]$/.test(chars[i]) && (t[i - 1] === 'EN' || t[i + 1] === 'EN')) t[i] = 'EN'; // W5
  strong = 'L'; for (let i = 0; i < t.length; i++) { if (t[i] === 'EN' && strong === 'L') t[i] = 'L'; if (t[i] === 'L' || t[i] === 'R') strong = t[i]; } // W7
  const dir = (x) => (x === 'L' ? 'L' : x === 'R' || x === 'EN' || x === 'AN' ? 'R' : null);
  for (let i = 0; i < t.length; ) { // N1, N2
    if (t[i] !== 'ON') { i++; continue; }
    let j = i; while (j < t.length && t[j] === 'ON') j++;
    const a = i ? dir(t[i - 1]) : 'L', b = j < t.length ? dir(t[j]) : 'L', v = a === b ? a : 'L';
    for (let k = i; k < j; k++) t[k] = v; i = j;
  }
  return t.map((x) => (x === 'L' ? 0 : x === 'R' ? 1 : 2)); // I1
}
// L2: reverse, from the highest level down to 1, every stretch at that level or higher
export function visualOrder(items, levelOf) {
  const out = [...items], max = Math.max(0, ...out.map(levelOf));
  for (let lv = max; lv >= 1; lv--) for (let i = 0; i < out.length; ) {
    if (levelOf(out[i]) < lv) { i++; continue; }
    let j = i; while (j < out.length && levelOf(out[j]) >= lv) j++;
    out.splice(i, j - i, ...out.slice(i, j).reverse()); i = j;
  }
  return out;
}

// the script a character belongs to, for choosing a fallback font; marks, spaces, digits and punctuation go with
// their neighbours, so a word and its marks are always shaped together, in one font
const SCRIPTS = FALLBACK.slice(0, -1);
const scriptOf = (c) => { const k = SCRIPTS.findIndex(([re]) => re.test(c)); return k < 0 ? (/[\p{L}]/u.test(c) ? 'base' : null) : k; };

// D23, D24, D15: shape a string into glyphs in visual order. The text is split into runs of one direction and one
// script; each run is shaped whole, in the chosen font or, when that font can't draw it, in the script's Noto font.
// A run no font here can draw, or a fallback font that can't be loaded, is an error: nothing is silently left out.
export async function shapeRun(fam, weight, italic, text, size, ls, notes = new Set()) {
  const F = await fontFor(fam, weight, italic), chars = [...text];
  const plain = shapeWith(F, text, size, ls);
  if (!plain.some((g) => g.id === 0) && chars.every((c) => bidiType(c) !== 'R' && bidiType(c) !== 'AL')) return plain; // the common case: one font, left to right
  const lv = bidiLevels(chars), sc = chars.map(scriptOf);
  for (let i = 0; i < sc.length; i++) if (sc[i] === null || isMark(chars[i])) sc[i] = i && sc[i - 1] !== null ? sc[i - 1] : null;
  for (let i = sc.length - 1; i >= 0; i--) if (sc[i] === null) sc[i] = i < sc.length - 1 ? sc[i + 1] : 'base';
  const runs = [];
  chars.forEach((c, i) => { const last = runs[runs.length - 1]; if (last && last.level === lv[i] && last.script === sc[i]) last.s += c; else runs.push({ s: c, level: lv[i], script: sc[i] }); });
  const glyphs = [];
  for (const run of visualOrder(runs, (r) => r.level)) {
    const dirn = run.level % 2 ? 5 : 4; // HarfBuzz: 5 right to left, 4 left to right
    let gs = shapeWith(F, run.s, size, ls, dirn);
    if (gs.some((g) => g.id === 0)) {
      const fb = run.script === 'base' ? 'Noto Sans' : SCRIPTS[run.script][1];
      const G = await fontFor(fb, weight, false).catch(() => null);
      if (!G) throw new Error(`Couldn’t load ${fb} to draw “${run.s.trim()}” as shapes`);
      notes.add(fb); gs = shapeWith(G, run.s, size, ls, dirn);
    }
    const lost = gs.find((g) => g.id === 0);
    if (lost) throw new Error(`No font here can draw “${run.s.trim()}” as shapes`);
    glyphs.push(...gs);
  }
  return glyphs;
}
function shapeWith(F, text, size, ls, dirn) {
  const { H, font, upem } = F, buf = new H.Buffer();
  buf.addText(text); buf.guessSegmentProperties(); if (dirn) buf.setDirection(dirn);
  // browsers drop ligatures from letter-spaced text; match them
  H.shape(font, buf, ls ? ['liga=0', 'clig=0', 'dlig=0'].map((x) => H.Feature.fromString(x)).filter(Boolean) : []);
  const gs = buf.getGlyphInfosAndPositions(), s = size / upem;
  return gs.map((g, i) => ({
    id: g.codepoint, cluster: g.cluster, s,
    adv: (g.xAdvance || 0) * s + (ls && (i === gs.length - 1 || gs[i + 1].cluster !== g.cluster) ? ls : 0),
    gadv: (g.xAdvance || 0) * s, dx: (g.xOffset || 0) * s, dy: (g.yOffset || 0) * s,
    cmds: font.glyphToJson(g.codepoint),
  }));
}

// glyph commands (font units, y up) through an affine matrix into path data
const n2 = (v) => Math.round(v * 100) / 100;
function cmdsToD(cmds, m) {
  const [a, b, c, d, e, f] = m, P = (x, y) => `${n2(a * x + c * y + e)} ${n2(b * x + d * y + f)}`;
  let out = '';
  for (const { type, values: v } of cmds) {
    if (type === 'Z') out += 'Z';
    else if (type === 'M' || type === 'L') out += type + P(v[0], v[1]);
    else if (type === 'Q') out += 'Q' + P(v[0], v[1]) + ' ' + P(v[2], v[3]);
    else if (type === 'C') out += 'C' + P(v[0], v[1]) + ' ' + P(v[2], v[3]) + ' ' + P(v[4], v[5]);
  }
  return out;
}

const KEEP = (name) => !/^(x|y|text-anchor|font-family|font-weight|font-style|font-size|letter-spacing|dominant-baseline)$/.test(name);
const NS = 'http://www.w3.org/2000/svg';

// Replace every <text> in an SVG string with a <path> of its glyphs. Returns { svg, notes } where notes lists any
// fallback fonts used. Throws if a font can't be fetched (offline): callers fall back to live text.
export async function outlineSvg(svgText) {
  const docX = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = docX.documentElement, texts = [...root.querySelectorAll('text')];
  if (!texts.length) return { svg: svgText, notes: [] };
  const notes = new Set();
  // a live, hidden SVG to measure textPath curves
  const probe = document.createElementNS(NS, 'svg'); probe.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'); document.body.append(probe);
  try {
    for (const t of texts) {
      const fam = (t.getAttribute('font-family') || 'Figtree').replace(/^["']|["']$/g, ''), weight = +(t.getAttribute('font-weight') || 400), italic = t.getAttribute('font-style') === 'italic';
      const size = +(t.getAttribute('font-size') || 16), ls = +(t.getAttribute('letter-spacing') || 0), anchor = t.getAttribute('text-anchor') || 'start';
      const tp = t.querySelector('textPath'), str = t.textContent;
      if (!str.trim()) { t.remove(); continue; }
      const glyphs = await shapeRun(fam, weight, italic, str, size, ls, notes);
      const total = glyphs.reduce((s, g) => s + g.adv, 0);
      let d = '';
      if (!tp) {
        const x0 = +(t.getAttribute('x') || 0), y0 = +(t.getAttribute('y') || 0);
        let pen = anchor === 'middle' ? x0 - total / 2 : anchor === 'end' ? x0 - total : x0;
        for (const g of glyphs) { d += cmdsToD(g.cmds, [g.s, 0, 0, -g.s, pen + g.dx, y0 - g.dy]); pen += g.adv; }
      } else {
        // along a path: each glyph's middle sits on the curve, turned to its tangent (as SVG lays out textPath)
        const ref = (tp.getAttribute('href') || tp.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '').slice(1);
        const src = root.querySelector(`[id="${CSS.escape(ref)}"]`); if (!src) continue;
        const pe = document.createElementNS(NS, 'path'); pe.setAttribute('d', src.getAttribute('d')); probe.append(pe);
        const L = pe.getTotalLength(), so = tp.getAttribute('startOffset') || '0', off = /%$/.test(so) ? (parseFloat(so) / 100) * L : +so;
        let pen = anchor === 'middle' ? off - total / 2 : anchor === 'end' ? off - total : off;
        for (const g of glyphs) {
          const mid = pen + g.gadv / 2;
          if (mid >= 0 && mid <= L) {
            const p = pe.getPointAtLength(mid), p1 = pe.getPointAtLength(Math.max(0, mid - 0.25)), p2 = pe.getPointAtLength(Math.min(L, mid + 0.25));
            const th = Math.atan2(p2.y - p1.y, p2.x - p1.x), co = Math.cos(th), si = Math.sin(th);
            // local glyph frame: x along the tangent from the glyph's middle, y down; font units scaled and flipped
            const lx = -g.gadv / 2 + g.dx, ly = -g.dy;
            d += cmdsToD(g.cmds, [g.s * co, g.s * si, g.s * si, -g.s * co, p.x + lx * co - ly * si, p.y + lx * si + ly * co]);
          }
          pen += g.adv;
        }
        pe.remove();
      }
      const path = docX.createElementNS(NS, 'path');
      for (const a of [...t.attributes]) if (KEEP(a.name)) path.setAttribute(a.name, a.value);
      path.setAttribute('d', d || 'M0 0');
      path.setAttribute('aria-label', str);
      t.replaceWith(path);
    }
  } finally { probe.remove(); }
  // the textPath curves in <defs> are no longer referenced by anything: leave them, they draw nothing
  return { svg: new XMLSerializer().serializeToString(root), notes: [...notes] };
}

// warm the shaper and the fonts a document uses (so the first export doesn't wait on the network)
export async function preloadOutlines(roles) {
  await hb();
  await Promise.all(Object.values(roles || {}).filter((r) => r && r.font).map((r) => fontFor(r.font, r.weight || 400, !!r.italic).catch(() => null)));
}

// ── PDF ──
let PDFP = null;
const script = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Couldn\'t load ' + src)); document.head.append(s); });
const pdfLibs = () => PDFP || (PDFP = (async () => { await script(new URL('./vendor/jspdf.umd.min.js', import.meta.url).href); await script(new URL('./vendor/svg2pdf.umd.min.js', import.meta.url).href); return window.jspdf; })());

// D25: the PDF converter ignores SVG masks, so a tinted logo (the artwork as a mask over a color) would print as a
// solid block. Each masked shape is drawn into an image first, at 600 dpi, and the image goes in its place.
export async function flattenMasks(root, pxPerUnit) {
  const ser = new XMLSerializer(), byId = (v) => { const id = (/url\(#([^)]+)\)/.exec(v || '') || [])[1]; return id ? root.querySelector(`[id="${CSS.escape(id)}"]`) : null; };
  for (const el of [...root.querySelectorAll('[mask]')]) {
    const mk = byId(el.getAttribute('mask')), [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => +el.getAttribute(a));
    if (!mk || el.localName !== 'rect' || !(w > 0 && h > 0)) continue;
    const paint = byId(el.getAttribute('fill')), k = Math.min(pxPerUnit, 4096 / Math.max(w, h)), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    const one = el.cloneNode(false); one.removeAttribute('transform');
    const svg = `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${W}" height="${H}"><defs>${ser.serializeToString(mk)}${paint ? ser.serializeToString(paint) : ''}</defs>${ser.serializeToString(one)}</svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
    const out = root.ownerDocument.createElementNS(NS, 'image');
    for (const a of ['x', 'y', 'width', 'height', 'transform', 'opacity', 'data-ids']) if (el.hasAttribute(a)) out.setAttribute(a, el.getAttribute(a));
    out.setAttribute('preserveAspectRatio', 'none'); out.setAttribute('href', c.toDataURL('image/png'));
    el.replaceWith(out);
  }
}

// An outlined SVG into a vector PDF `widthMm` wide. Soft effects (SVG filters) don't exist in PDF and are left out;
// the caller says so. Returns a Blob.
export async function svgToPdf(svgText, widthMm = 100, meta = {}) {
  const { jsPDF } = await pdfLibs();
  const el = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  const vb = (el.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
  const w = widthMm * 72 / 25.4, h = (w * vb[3]) / vb[2];
  el.setAttribute('width', w); el.setAttribute('height', h);
  await flattenMasks(el, (w / vb[2]) * 600 / 72);
  // svg2pdf reads the live DOM, so mount the SVG off-screen while it draws
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden'; host.append(el); document.body.append(host);
  try {
    const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'pt', format: [w, h], compress: true });
    pdf.setProperties({ title: meta.title || 'Laurel', subject: meta.subject || '', creator: 'Daphne, the free festival laurel maker by pitch.dog', keywords: 'laurel' });
    await pdf.svg(el, { x: 0, y: 0, width: w, height: h });
    return pdf.output('blob');
  } finally { host.remove(); }
}
