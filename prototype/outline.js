// outline.js — live text into shapes, so a printer or an editor needs no fonts, and the PDF built from it.
// Font files come from the Google Fonts repository (the same OFL fonts the app shows) and are shaped with HarfBuzz:
// kerning, ligatures and every script. Characters the chosen font lacks are drawn in the matching Noto font.
// Everything runs in the browser; nothing is uploaded.

const GF = 'https://cdn.jsdelivr.net/gh/google/fonts@main/';
let HBP = null;
const hb = () => HBP || (HBP = import('./vendor/hb-index.mjs'));
const metaCache = new Map(), blobCache = new Map();
const dirOf = (fam) => fam.toLowerCase().replace(/[^a-z0-9]/g, '');
const fileUrl = (u) => u.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

// the family's METADATA.pb lists its files (static weights or one variable file per style) and its axes
function meta(fam) {
  if (!metaCache.has(fam)) metaCache.set(fam, (async () => {
    for (const lic of ['ofl', 'apache', 'ufl']) {
      const r = await fetch(`${GF}${lic}/${dirOf(fam)}/METADATA.pb`).catch(() => null);
      if (!r || !r.ok) continue;
      const t = await r.text();
      const fonts = [...t.matchAll(/\nfonts \{([\s\S]*?)\n\}/g)].map((m) => ({ style: (/style: "(\w+)"/.exec(m[1]) || [, 'normal'])[1], weight: +(/weight: (\d+)/.exec(m[1]) || [, 400])[1], file: /filename: "([^"]+)"/.exec(m[1])[1] }));
      const axes = [...t.matchAll(/axes \{\s*tag: "(\w+)"\s*min_value: ([-\d.]+)\s*max_value: ([-\d.]+)/g)].map((m) => ({ tag: m[1], min: +m[2], max: +m[3] }));
      if (fonts.length) return { base: `${GF}${lic}/${dirOf(fam)}/`, fonts, axes };
    }
    throw new Error(`Couldn't find the font files for ${fam}`);
  })());
  return metaCache.get(fam);
}

// a HarfBuzz font for a family at a weight and style (variable files get the weight as a wght axis value)
async function fontFor(fam, weight = 400, italic = false) {
  const H = await hb(), m = await meta(fam), style = italic ? 'italic' : 'normal';
  const same = m.fonts.filter((x) => x.style === style), cands = same.length ? same : m.fonts;
  const vf = cands.find((x) => x.file.includes('['));
  const pick = vf || cands.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
  const url = m.base + pick.file;
  if (!blobCache.has(url)) blobCache.set(url, (async () => { const r = await fetch(fileUrl(url)); if (!r.ok) throw new Error(`Couldn't load ${pick.file}`); const face = new H.Face(new H.Blob(await r.arrayBuffer())); return face; })());
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

// shape a string: glyphs in visual order with their outline, advance and offsets, in px at `size`
async function shapeRun(fam, weight, italic, text, size, ls, notes) {
  const F = await fontFor(fam, weight, italic);
  const out = shapeWith(F, text, size, ls);
  if (!out.some((g) => g.id === 0)) return out;
  // split the text into stretches the font covers and stretches it doesn't, and shape the missing ones in Noto
  const miss = new Set(out.filter((g) => g.id === 0).map((g) => g.cluster)), segs = [];
  const chars = [...text]; let i16 = 0;
  for (const ch of chars) { const bad = miss.has(i16) || /\s/.test(ch) && segs.length && segs[segs.length - 1].bad; const last = segs[segs.length - 1]; if (last && last.bad === bad) last.s += ch; else segs.push({ s: ch, bad }); i16 += ch.length; }
  const glyphs = [];
  for (const sg of segs) {
    const fb = sg.bad ? fallbackFor(sg.s) : null;
    if (fb) notes.add(fb);
    const G = sg.bad ? await fontFor(fb, weight, false).catch(() => null) : F;
    glyphs.push(...(G ? shapeWith(G, sg.s, size, ls) : []));
  }
  return glyphs;
}
function shapeWith(F, text, size, ls) {
  const { H, font, upem } = F, buf = new H.Buffer();
  buf.addText(text); buf.guessSegmentProperties();
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

// An outlined SVG into a vector PDF `widthMm` wide. Soft effects (SVG filters) don't exist in PDF and are left out;
// the caller says so. Returns a Blob.
export async function svgToPdf(svgText, widthMm = 100, meta = {}) {
  const { jsPDF } = await pdfLibs();
  const el = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  const vb = (el.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
  const w = widthMm * 72 / 25.4, h = (w * vb[3]) / vb[2];
  el.setAttribute('width', w); el.setAttribute('height', h);
  // svg2pdf reads the live DOM, so mount the SVG off-screen while it draws
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden'; host.append(el); document.body.append(host);
  try {
    const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'pt', format: [w, h], compress: true });
    pdf.setProperties({ title: meta.title || 'Laurel', subject: meta.subject || '', creator: 'Daphne, the free festival laurel maker by pitch.dog', keywords: 'laurel' });
    await pdf.svg(el, { x: 0, y: 0, width: w, height: h });
    return pdf.output('blob');
  } finally { host.remove(); }
}
