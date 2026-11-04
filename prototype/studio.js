// studio.js — Export. Say where the laurel is going and get exactly the files that place needs.
// Nothing here changes the laurel: every destination re-dresses a copy of the document (a one-color version, a social
// card, an end-card frame) and packs it. The settings people pick are remembered on this device.
import { holdFocus, keepFocus } from './modal.js';
import { checkLaurel, accoladesOf } from './rules.js';
import { STATUS_COMMON } from './words.js';
import { smallestText, caseOf } from './engine.mjs';

const AWARD_LAYOUTS = ['winner', 'award-detail', 'award-festival-hero', 'star-winner'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r2 = (n) => Math.round(n * 100) / 100;
const hex = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
const lum = (c) => { const x = hex(c); if (!x) return 0; const [r, g, b] = [1, 3, 5].map((i) => { const v = parseInt(x.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const stripBg = (svg) => svg.replace(/<rect data-bg="1"[^>]*\/>/, '');

// ── colorways: the same laurel in one ink. Metals, gradients, depth and soft effects all become the one color. ──
export const WAYS = [
  { id: 'color', label: 'As designed', note: 'Your colors' },
  { id: 'black', label: 'Black', ink: '#000000', note: 'For light backgrounds and one-ink print' },
  { id: 'white', label: 'White', ink: '#ffffff', note: 'For dark posters, trailers and photos' },
];
export function colorway(d0, way, clone) {
  const W = WAYS.find((w) => w.id === way);
  if (!W || !W.ink) return d0;
  const d = clone(d0), ink = W.ink;
  Object.assign(d.paint, { branch: ink, inner: null, ornament: null, depth: 0, shade: ink, stroke: { ...(d.paint.stroke || {}), paint: null } });
  d.paint.effects = { shadow: null, glow: null, misreg: null, foil: null, press: null, grain: null, text: true };
  d.text = { paint: ink, sub: ink };
  for (const k of Object.keys(d.roles)) if (d.roles[k]) d.roles[k].paint = null;
  if (d.ribbon) d.ribbon = { ...d.ribbon, paint: ink, text: null };
  if (d.frame) d.frame = { ...d.frame, paint: ink, ink: null };
  d.canvas = { ...d.canvas, bg: null };
  return d;
}

// put one SVG inside another at a box, keeping its shape (and dropping its own background)
function nest(svg, x, y, w, h) {
  const m = /viewBox="([^"]+)"/.exec(svg), vb = m ? m[1].split(/[\s,]+/).map(Number) : [0, 0, 100, 100];
  const k = Math.min(w / vb[2], h / vb[3]), lw = vb[2] * k, lh = vb[3] * k;
  const inner = stripBg(svg).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return { el: `<svg x="${r2(x + (w - lw) / 2)}" y="${r2(y + (h - lh) / 2)}" width="${r2(lw)}" height="${r2(lh)}" viewBox="${vb.join(' ')}" overflow="visible">${inner}</svg>`, w: lw, h: lh, vb };
}
const root = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;

// PNGs from a canvas say 72 dpi; a print shop wants to see 300. Writes a pHYs chunk after the header.
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
async function withDpi(blob, dpi) {
  const src = new Uint8Array(await blob.arrayBuffer()), ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  return new Blob([src.subarray(0, 33), chunk, src.subarray(33)], { type: 'image/png' });
}

// what the laurels say, as text: rules.js accoladesOf keeps it to what the laurels claim
const accolades = (ctx) => accoladesOf(ctx.doc);
const NO_SENTENCE = 'No sentence yet: none of these laurels says what the festival gave the film. Add a status (Official Selection, a premiere, Winner) and it writes itself.';

// a first line for the post that goes with the card; the filmmaker makes it theirs
// for the row: what the shown laurels say, in one breath
function rowCaption(items, title) {
  const a = accoladesOf({ fields: [], row: { items } }), film = title || 'Our film';
  return a.sentence ? `${film}: ${a.sentence}` : `${film} at ${[...new Set(items.map((it) => it.festival).filter(Boolean))].join(', ') || 'festivals'}.`;
}
function caption(ctx, title) {
  const d = ctx.doc, t = (k) => d.fields.filter((f) => f.kind === k && f.show !== false && f.text).map((f) => f.text.trim()).join(' ');
  const film = title || 'Our film', st = t('status'), fest = [t('festival'), t('year')].filter(Boolean).join(' ') || 'the festival', aw = t('award');
  if (/winner|award winner|grand jury/i.test(st)) return `${film} won ${aw || 'an award'} at ${fest}.`;
  if (/premiere/i.test(st)) return `${film} will have its ${st.toLowerCase()} at ${fest}.`;
  if (/nominee|finalist|shortlist/i.test(st)) return `${film} is ${/^[aeiou]/i.test(st) ? 'an' : 'a'} ${st.toLowerCase()}${aw ? ` for ${aw}` : ''} at ${fest}.`;
  if (/mention/i.test(st)) return `${film} received a ${st.toLowerCase()} at ${fest}.`;
  if (st) return `${film} is ${/^(official|in competition)/i.test(st) ? 'an ' + st : st} at ${fest}.`.replace(/is an In Competition/, 'is in competition');
  return `${film} at ${fest}.`;
}

// ── the festival pack: one laurel for every status and award a festival gives, all in one look ──
export function packVariants(ctx, d, o) {
  let n = 0; const id = () => 'pk' + ++n;
  const vis = (f) => f.show !== false;
  const has = (doc, kind) => doc.fields.some((f) => f.kind === kind && vis(f) && f.text);
  const setText = (doc, kind, text) => { const f = doc.fields.find((x) => x.kind === kind && vis(x)) || doc.fields.find((x) => x.kind === kind); if (f) { f.text = text; f.show = !!text; delete f.added; } };
  const relayout = (doc, lid) => { const L = ctx.layoutById(lid); doc.fields = ctx.layoutFields(doc.fields, L, id); doc.layoutId = L.id; return doc; };
  // selections keep the festival's own layout, without an award line; awards use an award layout
  let sel = ctx.clone(d);
  if (AWARD_LAYOUTS.includes(sel.layoutId) || has(sel, 'award') || !sel.fields.some((f) => f.kind === 'status' && vis(f))) relayout(sel, sel.userLayoutId && !AWARD_LAYOUTS.includes(sel.userLayoutId) ? sel.userLayoutId : 'year-below');
  if (!sel.fields.some((f) => f.kind === 'status' && vis(f))) relayout(sel, 'year-below');
  let aw = ctx.clone(d);
  if (!has(aw, 'award')) relayout(aw, AWARD_LAYOUTS.includes(d.layoutId) ? d.layoutId : 'winner');
  const out = [];
  for (const st of o.statuses) { const v = ctx.clone(sel); setText(v, 'status', st); out.push({ label: st, slug: ctx.slug(st), doc: v }); }
  for (const a of o.awards) { const v = ctx.clone(aw); setText(v, 'award', a); setText(v, 'status', o.winner); out.push({ label: a, slug: ctx.slug(a), doc: v, award: true }); }
  return out;
}

// ── destinations ──
const I = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  kit: I('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'),
  png: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  svg: I('<path d="M4 20 20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/><path d="M4 20c0-9 7-16 16-16"/>'),
  pdf: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  print: I('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
  social: I('<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="10" r="3.2"/><path d="M8 17h8"/>'),
  video: I('<rect x="2.5" y="5" width="15" height="14" rx="2"/><path d="m17.5 10 4-2.5v9l-4-2.5"/>'),
  web: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
  deck: I('<rect x="3" y="3.5" width="18" height="12.5" rx="1.5"/><path d="M12 16v4.5M8.5 20.5h7M8 12.5v-3M12 12.5V7.5M16 12.5v-2"/>'),
  email: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>'),
  words: I('<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>'),
  row: I('<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>'),
  pack: I('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>'),
};
const DESTS = [
  { id: 'kit', t: 'Laurel kit', s: 'Everything, in one ZIP', kit: true },
  { g: 'Files' },
  { id: 'png', t: 'PNG', s: 'Any size, clear or on your color' },
  { id: 'svg', t: 'SVG', s: 'Vector, for designers and the web' },
  { id: 'pdf', t: 'PDF', s: 'Vector, for printers' },
  { g: 'Where it’s going' },
  { id: 'print', t: 'Poster and print', s: 'Exact size, 300 dpi' },
  { id: 'social', t: 'Social post', s: 'An announcement card' },
  { id: 'video', t: 'Trailer and video', s: 'End-card frame, HD or 4K' },
  { id: 'web', t: 'Website', s: 'SVG, HTML and alt text' },
  { id: 'deck', t: 'Pitch deck', s: 'Sales decks, press kits, slides' },
  { id: 'email', t: 'Email signature', s: 'Small, sharp, dark-mode safe' },
  { g: 'Words' },
  { id: 'words', t: 'Accolades text', s: 'For press, IMDb, FilmFreeway' },
  { id: 'row', t: 'Your row', s: 'Every laurel side by side', needsRow: true },
  { g: 'For festivals' },
  { id: 'pack', t: 'Festival pack', s: 'Every laurel your festival gives' },
];
const SOCIAL = { '1:1': [1080, 1080, 'Square'], '4:5': [1080, 1350, 'Portrait'], '9:16': [1080, 1920, 'Story'], '16:9': [1920, 1080, 'Landscape'] };
const PRINT_SIZES = [['Postcard', 1.5], ['Press kit page', 2], ['Festival program', 1.25], ['One-sheet poster', 5], ['Blu-ray cover', 1.1]];

const DEFAULTS = { dest: 'kit', way: 'color', pngW: 3000, svgText: 'outlined', pdfMm: 100, unit: 'in', printW: 2, words: 'list',
  social: { fmt: '4:5', title: '', line: '', bg: 'laurel', color: '#0b0b0d', size: 1, what: 'laurel', dim: 0.45 },
  video: { res: 1080, size: 0.32, pos: 'center', bg: 'none', what: 'laurel' }, web: { w: 240 }, email: { h: 80, bg: 'auto' },
  kit: { ways: ['color', 'black', 'white'], fmts: ['svg', 'png', 'pdf'] },
  pack: { statuses: ['Official Selection', 'Finalist', 'Semi-Finalist', 'Honorable Mention'], awards: 'Best Feature Film\nBest Short Film\nAudience Award', winner: 'Winner', ways: ['color', 'black', 'white'], fmts: ['svg', 'png'] } };
function loadPrefs() {
  let p = {}; try { p = JSON.parse(localStorage.getItem('daphne.studio') || '{}'); } catch (e) { /* a convenience */ }
  const o = { ...DEFAULTS, ...p };
  for (const k of ['social', 'video', 'web', 'email', 'kit', 'pack']) o[k] = { ...DEFAULTS[k], ...(p[k] || {}) };
  delete o.social.title; delete o.social.line; // a film's words belong to its laurel, not to this device (older prefs kept them)
  return o;
}
let photo = null; // a still or poster for the social card: this session only, never stored

export function openStudio(ctx) {
  const { h } = ctx, P = loadPrefs(), d0 = () => ctx.doc;
  // the film's title and detail line travel with this laurel (its link, its autosave), never to the next one
  P.social.title = (d0().film && d0().film.title) || ''; P.social.line = (d0().film && d0().film.line) || '';
  // D35: a festival pack's recipe travels with its laurel, so the link in its README opens the same set on any device
  const R = d0().pack, strs = (a, ok) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && (!ok || ok.includes(x))) : null);
  if (R && typeof R === 'object') {
    const st = strs(R.statuses), ws = strs(R.ways, WAYS.map((W) => W.id)), fs = strs(R.fmts, ['svg', 'png', 'pdf']);
    if (st) P.pack.statuses = st; if (ws) P.pack.ways = ws; if (fs) P.pack.fmts = fs;
    if (typeof R.awards === 'string') P.pack.awards = R.awards; if (typeof R.winner === 'string') P.pack.winner = R.winner;
    if (R.pngW > 0 && R.pngW <= 12000) P.pngW = Math.round(R.pngW); if (R.pdfMm > 0 && R.pdfMm <= 2000) P.pdfMm = R.pdfMm;
  }
  const keepPack = () => { const K = P.pack; d0().pack = { statuses: [...K.statuses], awards: K.awards, winner: K.winner, ways: [...K.ways], fmts: [...K.fmts], pngW: P.pngW, pdfMm: P.pdfMm }; ctx.settle(); };
  const save = () => { try { const { title, line, ...social } = P.social; localStorage.setItem('daphne.studio', JSON.stringify({ ...P, social })); } catch (e) { /* a convenience */ } };
  // J05: the row is always a place to export to; whether it has laurels of its own is one question, asked of the row (rowEmpty)
  const hasRow = () => !!ctx.rowScene, rowNone = () => (ctx.rowEmpty ? ctx.rowEmpty() : 'Your row is empty.');
  // the row as it's drawn: its laurels in order, without hidden ones or artwork missing on this device
  const rowShown = () => { const sc = hasRow() && ctx.rowScene({ bg: false, real: true }); return sc ? sc.parts.map((p) => p.it) : []; };
  const rowMissing = () => (d0().row && Array.isArray(d0().row.items) ? d0().row.items.filter((it) => it.show !== false && it.src && !ctx.ASSETS[it.src]) : []);
  const rowLine = (it) => (it.src && !it.status && !it.award ? `the official laurel of ${[it.festival, it.year].filter(Boolean).join(' ') || 'a festival'}` : [it.status, it.award, [it.festival, it.year].filter(Boolean).join(' ')].filter(Boolean).join(', '));
  const rowAlt = () => { const its = rowShown(); return its.length ? `Festival laurels: ${its.map(rowLine).join('; ')}.` : ctx.altText(d0()); };
  const showsRow = (what) => what === 'row' && rowShown().length > 0;
  const base = () => ctx.fileName();
  const docOf = (way) => colorway(d0(), way, ctx.clone);
  const cache = new Map();
  const rendered = (way) => { const k = way + (ctx.fontEpoch || 0); if (!cache.has(k)) cache.set(k, ctx.render(docOf(way))); return cache.get(k); }; // the laurel doesn't change while Export is open; a font arriving does (D14)
  const bgOn = () => P.way === 'color' && !!d0().canvas.bg && P.bg !== false;
  const smallest = (r) => smallestText(r.svg); // every word that's drawn, in any slot; Infinity when there are none

  // ── shell ──
  const dests = h('nav', { class: 'dests', 'aria-label': 'Where it’s going' });
  const preview = h('div', { class: 'preview', 'aria-live': 'polite' });
  const opts = h('div', { class: 'opts' });
  let release = () => {};
  const close = () => { scrim.remove(); release(); };
  const modeNote = ctx.mode === 'motion' ? 'Video files (MP4, PNG sequence, animated SVG) are in the Motion panel under the stage.' : ctx.mode === 'poster' ? 'The poster mockup downloads from the Poster panel under the stage.' : '';
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'studio-title' },
    h('header', {}, h('div', {}, h('h2', { id: 'studio-title' }, 'Export'), h('p', {}, modeNote || 'Pick where it’s going. Daphne makes the right files for it.')),
      h('button', { class: 'btn ghost x', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'studio' }, dests, preview, opts));
  const scrim = h('div', { class: 'scrim export-scrim', onmousedown: (e) => { if (e.target === scrim) close(); } }, modal);
  document.body.append(scrim);
  release = holdFocus(scrim, close);

  function buildDests() { keepFocus(dests, buildDestsNow); }
  function buildDestsNow() {
    dests.innerHTML = '';
    for (const D of DESTS) {
      if (D.g) { dests.append(h('div', { class: 'dgroup' }, D.g)); continue; }
      if (D.needsRow && !hasRow()) continue;
      dests.append(h('button', { class: 'dest' + (D.kit ? ' kit' : '') + (P.dest === D.id ? ' on' : ''), 'aria-pressed': String(P.dest === D.id), onclick: () => { P.dest = D.id; save(); buildDests(); show(); } },
        h('i', { class: 'ic', html: ICONS[D.id] }), h('div', {}, h('b', {}, D.t), h('span', {}, D.s))));
    }
  }

  // ── small controls ──
  const seg = (items, cur, on, label) => h('div', { class: 'segctl', role: 'radiogroup', 'aria-label': label || '' }, items.map(([v, l]) => h('button', { class: v === cur ? 'on' : '', role: 'radio', 'aria-checked': String(v === cur), onclick: () => on(v) }, l)));
  const chips = (items, cur, on) => h('div', { class: 'chips' }, items.map(([v, l]) => h('button', { class: 'chip' + (v === cur ? ' on' : ''), onclick: () => on(v) }, l)));
  const label = (t, ...kids) => h('div', { class: 'olabel' }, h('span', {}, t), ...kids);
  const toggle = (text, on, set) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!on, onchange: (e) => set(e.target.checked) }), text);
  const set = (k, v, o = {}) => {
    const path = k.split('.'); let t = P; while (path.length > 1) t = t[path.shift()]; t[path[0]] = v; save();
    if (k === 'social.title' || k === 'social.line') { const d = d0(); d.film = { ...(d.film || {}), [k.slice(7)]: v }; if (!d.film.title && !d.film.line) delete d.film; ctx.settle(); }
    if (k.startsWith('pack.')) keepPack();
    if (o.opts !== false) show(); else drawPreview();
  };
  const copy = async (text, what = 'Copied') => { try { await navigator.clipboard.writeText(text); ctx.toast(what); } catch (e) { window.prompt('Copy this', text); } };
  // D29: one download at a time; a job keeps the settings it started with, even if the panel is rebuilt meanwhile
  let job = null;
  const run = (label, fn, cls = 'btn primary') => { const b = h('button', { class: cls, onclick: async () => { if (b.disabled) return; if (job) { ctx.toast('One download at a time: the last one is still being made.'); return; } const was = b.textContent; b.disabled = true; b.textContent = 'Making…'; job = b; try { await fn((s) => (b.textContent = s)); } catch (e) { console.error(e); ctx.toast('That didn’t work: ' + (e.message || e)); } finally { job = null; b.disabled = false; b.textContent = was; } } }, label); return b; };
  function ways(cur = P.way, on = (v) => set('way', v)) {
    return h('div', { class: 'ways', role: 'radiogroup', 'aria-label': 'Colorway' }, WAYS.map((W) => {
      const r = rendered(W.id), sw = h('div', { class: 'sw ' + (W.id === 'black' ? 'light' : 'dark'), html: (W.id === 'color' ? r.svg : stripBg(r.svg)).replace(/width="[^"]+" height="[^"]+"/, '') });
      return h('button', { class: W.id === cur ? 'on' : '', role: 'radio', 'aria-checked': String(W.id === cur), title: W.note, onclick: () => on(W.id) }, sw, W.label);
    }));
  }
  const bgToggle = () => (P.way === 'color' && d0().canvas.bg ? toggle('Keep the background color', P.bg !== false, (v) => set('bg', v)) : null);
  const altBlock = (a = ctx.altText(d0())) => { return h('div', { class: 'oblock' }, label('Alt text', h('button', { class: 'btn small ghost', onclick: () => copy(a, 'Alt text copied') }, 'Copy')), h('div', { class: 'alt' }, a), h('div', { class: 'hint' }, 'Paste it wherever the image goes: it’s what screen readers say.')); };
  // the studio that made Daphne, said once, where a deck is already on the filmmaker's mind
  const pitchdog = () => h('aside', { class: 'pd-tie', 'aria-labelledby': 'pd-tie-title' },
    h('p', { class: 'pd-eyebrow' }, 'Made by pitch.dog'),
    h('h4', { id: 'pd-tie-title' }, 'The laurel’s ready. ', h('span', {}, 'Is the deck?')),
    h('p', {}, 'Decks are our day job. We write and design pitch decks, director’s treatments and show bibles for film and TV, and have for twelve years. If yours could use a sharper story or a better look, show us.'),
    h('div', { class: 'pd-links' },
      h('a', { class: 'btn', href: 'https://pitch.dog/work/', target: '_blank', rel: 'noopener' }, 'See our work ', h('span', { 'aria-hidden': 'true' }, '→')),
      h('a', { class: 'btn ghost', href: 'https://pitch.dog/#book', target: '_blank', rel: 'noopener' }, 'Book a call'),
      h('a', { class: 'btn ghost', href: 'mailto:hello@pitch.dog?subject=A%20deck%20for%20my%20film' }, 'Email us')),
    h('p', { class: 'pd-note' }, 'No pressure, no strings. Daphne stays free either way.'));
  function rulesBlock() {
    const notes = checkLaurel(d0()).filter((n) => n.level === 'rule'), gone = rowMissing();
    const rowOut = P.dest === 'row' || (P.dest === 'social' && P.social.what === 'row') || (P.dest === 'video' && P.video.what === 'row');
    if (rowOut && gone.length) notes.unshift({ level: 'rule', text: `${gone.length === 1 ? 'One official artwork' : gone.length + ' official artworks'} in your row (${gone.map((it) => it.festival || 'untitled').join(', ')}) ${gone.length === 1 ? 'isn’t' : 'aren’t'} on this device, so the row goes out without ${gone.length === 1 ? 'it' : 'them'}. Add ${gone.length === 1 ? 'it' : 'them'} again in Row.` });
    if (!notes.length) return null;
    return h('div', { class: 'oblock' }, notes.map((n) => h('div', { class: 'note rule' }, h('span', {}, n.text, n.source ? [' ', h('a', { href: n.source.url, target: '_blank', rel: 'noopener' }, 'Source')] : null))));
  }
  const info = (...t) => h('div', { class: 'ometa' }, t.filter(Boolean).map((x) => h('span', {}, x)));

  // ── files ──
  const svgOf = async (way, o = {}) => { const r = rendered(way), d = docOf(way); const svg = way === 'color' && (o.bg ?? bgOn()) ? r.svg : stripBg(r.svg); return ctx.exportSvgText(svg, { ...d, out: { ...(d.out || {}), svgText: o.text || P.svgText } }); };
  const pngOf = async (way, width, o = {}) => { const r = rendered(way); return ctx.toPng(r.svg, r.viewBox, Math.round(width), way === 'color' && (o.bg ?? bgOn()), docOf(way)); };
  const pdfOf = async (way, mm) => { const r = rendered(way); return ctx.toPdf(way === 'color' && bgOn() ? r.svg : stripBg(r.svg), docOf(way), 'Laurel', mm); };
  const suffix = (way) => (way === 'color' ? '' : '-' + way);
  const remember = (k, v) => { const d = d0(); d.out = { ...(d.out || {}), [k]: v }; ctx.settle(); };

  // ── composed pictures: the social card and the end-card frame ──
  function scene(what) {
    if (what === 'row' && hasRow()) { const sc = ctx.rowScene({ bg: false, base: docOf(P.way), real: true }); if (sc) return { svg: sc.svg, vb: sc.vb, row: true }; }
    const r = rendered(P.way); return { svg: P.way === 'color' ? r.svg : stripBg(r.svg), vb: r.viewBox, r };
  }
  function socialSvg() {
    const S = P.social, [W, H] = SOCIAL[S.fmt], d = d0(), sc = scene(S.what);
    const bg = S.bg === 'photo' && photo ? '#000000' : S.bg === 'laurel' ? (hex(d.canvas.bg) || '#0b0b0d') : S.bg === 'light' ? '#f4f1ea' : S.bg === 'custom' ? (hex(S.color) || '#0b0b0d') : '#0b0b0d';
    const dark = (S.bg === 'photo' && photo) || lum(bg) < 0.4;
    const tp = hex(d.text.paint), ink = P.way === 'color' && tp && contrast(tp, bg) > 3 ? tp : dark ? '#ffffff' : '#141414';
    const hero = d.roles.hero, sub = d.roles.sub, story = S.fmt === '9:16', wide = S.fmt === '16:9';
    const top = H * (story ? 0.15 : 0.08), bot = H * (story ? 0.8 : 0.92), maxW = W * 0.84;
    const cased = (s, r) => caseOf(s, r.case); // the laurel's own casing, Title Case included
    const title = cased(S.title.trim(), hero), line = cased(S.line.trim(), sub);
    let tS = Math.min(W, H) * (wide ? 0.07 : 0.088), lines = [];
    const width = (s, size) => ctx.measure(s, hero.font, hero.weight, hero.italic, size) + Math.max(0, s.length - 1) * hero.track * size;
    if (title) for (let i = 0; i < 30; i++) { // up to two lines, shrinking until they fit
      const words = title.split(/\s+/); lines = [''];
      for (const w of words) { const t2 = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (width(t2, tS) <= maxW || !lines[lines.length - 1]) lines[lines.length - 1] = t2; else lines.push(w); }
      if (lines.length <= 2 && lines.every((l) => width(l, tS) <= maxW)) break; tS *= 0.93;
    }
    let lS = Math.min(W, H) * 0.031; const lw = (s, size) => ctx.measure(s, sub.font, sub.weight, sub.italic, size) + Math.max(0, s.length - 1) * 0.16 * size;
    while (line && lw(line, lS) > maxW && lS > 10) lS *= 0.94;
    const textH = (lines.length ? tS * (0.78 + (lines.length - 1) * 1.08) : 0) + (line ? lS * 0.8 + (lines.length ? tS * 0.55 : 0) : 0);
    const gap = textH ? Math.min(W, H) * 0.065 : 0, avail = bot - top - textH - gap;
    const k = Math.min((W * (wide ? 0.56 : sc.row ? 0.86 : 0.7) * S.size) / sc.vb[2], (avail * Math.min(1, S.size)) / sc.vb[3]);
    const lwid = sc.vb[2] * k, lh = sc.vb[3] * k, block = lh + gap + textH, y0 = top + (bot - top - block) / 2;
    const n = nest(sc.svg, (W - lwid) / 2, y0, lwid, lh);
    let y = y0 + lh + gap, txt = '';
    lines.forEach((l, i) => { y += i ? tS * 1.08 : tS * 0.78; txt += `<text x="${W / 2}" y="${r2(y)}" text-anchor="middle" font-family="${esc(hero.font)}" font-weight="${hero.weight}"${hero.italic ? ' font-style="italic"' : ''} font-size="${r2(tS)}" letter-spacing="${r2(hero.track * tS)}" fill="${ink}">${esc(l)}</text>`; });
    if (line) { y += (lines.length ? tS * 0.55 : 0) + lS * 0.8; txt += `<text x="${W / 2}" y="${r2(y)}" text-anchor="middle" font-family="${esc(sub.font)}" font-weight="${sub.weight}"${sub.italic ? ' font-style="italic"' : ''} font-size="${r2(lS)}" letter-spacing="${r2(0.16 * lS)}" fill="${ink}" opacity="0.86">${esc(line)}</text>`; }
    const ph = S.bg === 'photo' && photo ? `<image href="${photo.url}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="${H}" fill="#000" opacity="${S.dim}"/>` : '';
    return { svg: root(W, H, `<rect width="${W}" height="${H}" fill="${bg}"/>${ph}${n.el}${txt}`), W, H, bg, light: !dark };
  }
  function videoSvg() {
    const V = P.video, H = V.res === 2160 ? 2160 : 1080, W = H * 16 / 9, sc = scene(V.what);
    let lh = H * V.size, lw = lh * sc.vb[2] / sc.vb[3];
    if (lw > W * 0.9) { lw = W * 0.9; lh = lw * sc.vb[3] / sc.vb[2]; }
    const m = H * 0.07, x = V.pos === 'corner' ? W - lw - m : (W - lw) / 2, y = V.pos === 'corner' ? m : V.pos === 'third' ? H * 0.74 - lh / 2 : (H - lh) / 2;
    const n = nest(sc.svg, x, y, lw, lh);
    return { svg: root(W, H, (V.bg === 'black' ? `<rect width="${W}" height="${H}" fill="#000"/>` : '') + n.el), W, H };
  }
  // a festival slide, to see the laurel where a deck will put it
  function deckSvg() {
    const W = 1600, H = 900, d = d0(), r = rendered(P.way), tp = hex(d.text.paint);
    const bg = P.way === 'black' ? '#f4f1ea' : P.way === 'white' ? '#141418' : (bgOn() && hex(d.canvas.bg)) || (tp && lum(tp) < 0.3 ? '#f4f1ea' : '#141418');
    const ink = lum(bg) < 0.4 ? '#f4f3ee' : '#17171a', title = (P.social.title || '').trim() || 'Your Film';
    let tS = 88; while (tS > 40 && ctx.measure(title, 'PD Head', 400, false, tS) > W * 0.8) tS *= 0.94;
    const n = nest(P.way === 'color' ? r.svg : stripBg(r.svg), W * 0.2, 400, W * 0.6, 330);
    return { svg: root(W, H, `<rect width="${W}" height="${H}" fill="${bg}"/><text x="${W / 2}" y="190" text-anchor="middle" font-family="PD Body, system-ui, sans-serif" font-weight="600" font-size="22" letter-spacing="5" fill="${ink}" opacity="0.6">FESTIVALS</text><text x="${W / 2}" y="${r2(190 + 30 + tS * 0.9)}" text-anchor="middle" font-family="PD Head, Georgia, serif" font-size="${r2(tS)}" fill="${ink}">${esc(title)}</text>${n.el}`), W, H };
  }
  const composedPng = async (c, dpi) => { const b = await ctx.toPng(c.svg, [0, 0, c.W, c.H], c.W, true, d0(), c.H); return dpi ? withDpi(b, dpi) : b; };

  // ── the preview ──
  // V02, D45: a preview keeps its own shape (width set, height from the ratio) and is fitted again whenever the
  // preview area changes size. On a phone the area grows with what's in it, so the fit uses a fixed share of the
  // screen instead of the area's own height. Actual-size proofs (Email) keep their exact height.
  const narrow = matchMedia('(max-width: 860px)'), fits = [];
  const area = () => ({ w: preview.clientWidth - 64, h: narrow.matches ? Math.max(220, innerHeight * 0.52 - 96) : preview.clientHeight - 96 });
  const refit = () => { for (const f of fits) if (preview.contains(f.el)) f(); };
  new ResizeObserver(() => requestAnimationFrame(refit)).observe(preview);
  function frameOf(svg, cls = '', maxW, maxH) {
    const vb = (/viewBox="([^"]+)"/.exec(svg) || [, '0 0 100 100'])[1].split(/[\s,]+/).map(Number);
    const el = h('div', { class: 'frame ' + cls, html: svg.replace(/width="[^"]+" height="[^"]+"/, '') });
    const s = el.querySelector('svg'), val = (v, d) => (typeof v === 'function' ? v() : v || d);
    s.style.aspectRatio = `${vb[2]} / ${vb[3]}`; s.style.height = 'auto';
    const fit = () => { const A = area(), bw = val(maxW, A.w), bh = val(maxH, A.h), k = Math.min(bw / vb[2], bh / vb[3]); s.style.width = Math.max(40, vb[2] * k) + 'px'; };
    fit.el = el; fits.push(fit); if (fits.length > 40) fits.splice(0, fits.length - 40);
    requestAnimationFrame(fit);
    return el;
  }
  const wayCls = (way) => (way === 'black' ? 'light' : way === 'white' ? 'dark' : '');
  const laurelPreview = (way = P.way) => { const r = rendered(way); return frameOf(way === 'color' && bgOn() ? r.svg : stripBg(r.svg), wayCls(way)); };
  function drawPreview() {
    preview.innerHTML = '';
    const pv = h('div', { class: 'pv' }), cap = (t) => h('div', { class: 'cap' }, t);
    const D = P.dest;
    if (D === 'kit') {
      const K = kitPlan(), ws = K.ways.length ? K.ways : ['color'], bw = () => Math.max(120, (preview.clientWidth - 90) / (narrow.matches ? 1 : ws.length) - 14);
      pv.append(h('div', { class: 'kitgrid' }, ws.map((w) => { const r = rendered(w); return h('figure', {}, frameOf(w === 'color' && d0().canvas.bg ? r.svg : stripBg(r.svg), wayCls(w), bw, () => area().h * (narrow.matches ? 0.6 : 0.5)), h('figcaption', {}, WAYS.find((x) => x.id === w).label)); })),
        cap(!K.ready ? 'Pick at least one colorway and one format.' : `${K.plan.length + 1} files: ${K.fmts.map((f) => f.toUpperCase()).join(', ')} in ${K.ways.length === 1 ? 'one colorway' : K.ways.length + ' colorways'}${K.plan.some((f) => /-on-background\.png$/.test(f.name)) ? ', a PNG on your background color' : ''}, and a README holding the alt text, the fonts and the sizes that stay readable.`));
    } else if ((D === 'social' && P.social.what === 'row') || (D === 'video' && P.video.what === 'row') || D === 'row') {
      const none = rowNone();
      if (none) pv.append(h('div', { class: 'stage-empty' }, h('p', {}, none)));
      else if (D === 'social') { const c = socialSvg(); pv.append(frameOf(c.svg, 'card'), cap(`${c.W} × ${c.H} px · ${SOCIAL[P.social.fmt][2]} · your row`)); }
      else if (D === 'video') { const c = videoSvg(); pv.append(frameOf(c.svg, P.video.bg === 'black' ? 'card' : 'footage'), cap(`${c.W} × ${c.H} px PNG · your row`)); }
      else { const sc = ctx.rowScene({ bg: true, real: true }); if (sc) pv.append(frameOf(sc.svg, ''), cap(`${sc.parts.length} laurel${sc.parts.length > 1 ? 's' : ''}, drawn at one scale so the type matches.`)); }
    } else if (D === 'social') {
      const c = socialSvg(); pv.append(frameOf(c.svg, 'card'), cap(`${c.W} × ${c.H} px · ${SOCIAL[P.social.fmt][2]}`));
    } else if (D === 'video') {
      const c = videoSvg(); pv.append(frameOf(c.svg, P.video.bg === 'black' ? 'card' : 'footage'), cap(`${c.W} × ${c.H} px PNG${P.video.bg === 'black' ? '' : ', transparent'} · place it at 100% on a ${P.video.res === 2160 ? '4K' : '1080p'} timeline and it lines up`));
    } else if (D === 'deck') {
      const c = deckSvg(); pv.append(frameOf(c.svg, 'card'), cap('How it sits on a 16:9 slide.'));
    } else if (D === 'email') {
      const r = rendered(P.way), hh = P.email.h, bgc = emailBg(), svg = bgc ? root(r.viewBox[2], r.viewBox[3], `<rect width="${r.viewBox[2]}" height="${r.viewBox[3]}" fill="${bgc}"/>` + nest(r.svg, 0, 0, r.viewBox[2], r.viewBox[3]).el) : stripBg(r.svg);
      const sig = (dark) => h('div', { class: 'sig' + (dark ? ' dark' : '') }, h('div', { class: 'who' }, h('b', {}, 'Your Name'), h('span', {}, 'Director, Your Film'), h('span', { class: 'lnk' }, 'yourfilm.com')), frameOf(svg, 'bare', 9999, hh));
      pv.append(h('div', { class: 'sigs' }, sig(false), sig(true)), cap('How it sits in a light and a dark inbox, at the size it’s shown.'));
    } else if (D === 'words') {
      const a = accolades(ctx);
      pv.append(h('div', { class: 'wordsheet' }, a.list.length ? [h('h4', {}, 'Laurels'), h('ul', {}, a.lines.map((l) => h('li', {}, l))), [h('h4', {}, 'In a sentence'), h('p', {}, a.sentence || NO_SENTENCE)]] : h('p', {}, 'Fill in the festival on the Words tab, or add laurels to the row, and the text writes itself.')));
    } else if (D === 'pack') {
      const vs = packList();
      pv.append(h('div', { class: 'packgrid' }, vs.slice(0, 24).map((v) => { const r = ctx.render(colorway(v.doc, 'color', ctx.clone)); return h('figure', {}, h('div', { class: 'pt', html: (d0().canvas.bg ? r.svg : stripBg(r.svg)).replace(/width="[^"]+" height="[^"]+"/, '') }), h('figcaption', {}, v.label)); })),
        cap(!vs.length ? 'Pick the statuses and awards your festival gives.' : !P.pack.ways.length || !P.pack.fmts.length ? 'Pick at least one colorway and one format.' : `${vs.length} laurels × ${P.pack.ways.length} colorway${P.pack.ways.length > 1 ? 's' : ''} × ${P.pack.fmts.length} format${P.pack.fmts.length > 1 ? 's' : ''} = ${vs.length * P.pack.ways.length * P.pack.fmts.length} files, plus a README and guidelines to send your filmmakers.`));
    } else {
      pv.append(laurelPreview());
      const r = rendered(P.way), vb = r.viewBox, sm = smallest(r);
      if (D === 'png') { const w = P.pngW, hh = Math.round(w * vb[3] / vb[2]); pv.append(cap(`${w} × ${hh} px${bgOn() ? '' : ', transparent'}`)); }
      if (D === 'print') { const wi = printIn(); pv.append(cap(`${fmtLen(wi)} × ${fmtLen(wi * vb[3] / vb[2])}${isFinite(sm) ? ` · smallest words ${(sm * wi * 72 / vb[2]).toFixed(1)} pt` : ' · no words to size'}`)); }
      if (D === 'web') pv.append(cap(`Shown ${P.web.w} px wide on the page; sharp at any size, on any screen.`));
    }
    preview.append(pv);
  }
  // D02: the printed width is one physical length (inches, unrounded); the unit only changes how it's shown
  const printIn = () => (P.printInch > 0 ? P.printInch : P.unit === 'mm' ? P.printW / 25.4 : P.printW);
  const setPrint = (v, unit = P.unit) => { P.printInch = unit === 'mm' ? v / 25.4 : v; set('printW', unit === P.unit ? v : P.unit === 'mm' ? Math.round(v * 25.4) : v); };
  const setUnit = (u) => { if (u === P.unit) return; const inch = printIn(); P.printInch = inch; P.printW = u === 'mm' ? Math.round(inch * 25.4) : r2(inch); set('unit', u); };
  const fmtLen = (inch) => (P.unit === 'mm' ? `${Math.round(inch * 25.4)} mm` : `${r2(inch)} in`);
  const emailBg = () => { const e = P.email.bg; if (e === 'auto') return P.way === 'color' ? hex(d0().canvas.bg) : null; return e === 'white' ? '#ffffff' : e === 'dark' ? '#1b1b1f' : null; };

  // ── the options for each destination ──
  function drawOpts() { keepFocus(opts, drawOptsNow); }
  function drawOptsNow() {
    opts.innerHTML = '';
    const put = (...k) => opts.append(...k.flat(Infinity).filter((x) => x != null && x !== false));
    const D = DESTS.find((x) => x.id === P.dest) || DESTS[0];
    put(h('h3', {}, D.t), h('div', { class: 'desc' }, ({
      kit: 'Every format in every colorway, named and foldered, with a README. Send it to your designer, editor or distributor and you’re done.',
      png: 'A picture file with a clear background. Works in video editors, slides, social posts and most apps.',
      svg: 'The laurel as vector shapes: crisp at any size. The text is drawn as shapes, so it opens anywhere without the fonts.',
      pdf: 'Vector, at the width you pick. The file printers and festivals ask for.',
      print: 'Pick the size it will print at. Daphne checks the small words will still read and makes a file at exactly that size.',
      social: 'A ready-to-post card: your laurel with the film’s title and a line of detail. No watermark, nothing added.',
      video: 'A full frame, transparent, with the laurel placed where it should sit. Drop it on the track above your end card.',
      web: 'For your film’s site: a vector file that stays sharp on every screen, the HTML to place it, and its alt text.',
      deck: 'For the festival slide in your sales deck or press kit, or the pitch for your next film. Pick the colorway that suits your slides.',
      email: 'A small, sharp image for your signature, made at twice the size so it’s crisp on high-resolution screens.',
      words: 'Your laurels written out, for press releases, IMDb trivia, FilmFreeway and your site.',
      row: 'All the laurels in your row, at one scale.',
      pack: 'Run a festival? Make every laurel you send your films in one go: one per status and award, in every colorway, with guidelines to send along.',
    })[D.id]));
    const rb = rulesBlock(); if (rb && !['words'].includes(D.id)) put(rb);
    const r = rendered(P.way), vb = r.viewBox, sm = smallest(r);
    const go = (...b) => h('div', { class: 'go' }, ...b);
    // a download that shows the row is offered only when the row has laurels of its own; otherwise it says what to do
    const rowGate = (what, b) => { const none = what === 'row' && rowNone(); if (none) b.disabled = true; return go(b, none ? h('div', { class: 'hint' }, none) : null); };

    if (D.id === 'kit') {
      put(label('Colorways'), h('div', { class: 'checks' }, WAYS.map((W) => h('label', {}, h('input', { type: 'checkbox', checked: P.kit.ways.includes(W.id), onchange: (e) => { P.kit.ways = WAYS.map((x) => x.id).filter((id) => (id === W.id ? e.target.checked : P.kit.ways.includes(id))); save(); show(); } }), W.label, h('small', {}, W.note)))),
        label('Formats'), h('div', { class: 'checks' }, [['svg', 'SVG', 'vector'], ['png', 'PNG', `${P.pngW} px wide`], ['pdf', 'PDF', `${P.pdfMm} mm wide`]].map(([f, l, n]) => h('label', {}, h('input', { type: 'checkbox', checked: P.kit.fmts.includes(f), onchange: (e) => { P.kit.fmts = ['svg', 'png', 'pdf'].filter((id) => (id === f ? e.target.checked : P.kit.fmts.includes(id))); save(); show(); } }), l, h('small', {}, n)))),
        (() => { const K = kitPlan(), b = run('Download the laurel kit', makeKit); b.disabled = !K.ready; return go(b, K.ready ? null : h('div', { class: 'hint' }, 'Pick at least one colorway and one format.')); })(), altBlock());
    } else if (D.id === 'png') {
      put(label('Colorway'), ways(), bgToggle(), label('Width'), chips([[1000, '1000'], [2000, '2000'], [3000, '3000'], [5000, '5000 px']], P.pngW, (v) => { set('pngW', v); remember('pngW', v); }),
        info(isFinite(sm) ? `Smallest words ${Math.round(sm * P.pngW / vb[2])} px tall` : null),
        go(run('Download PNG', async () => ctx.download(await pngOf(P.way, P.pngW), base() + suffix(P.way) + '.png')), h('div', { class: 'hint gostate' }, bgOn() ? `Background included: ${hex(d0().canvas.bg) || 'your color'}` : 'Transparent background')), altBlock());
    } else if (D.id === 'svg') {
      put(label('Colorway'), ways(), bgToggle(), label('Text'), seg([['outlined', 'Drawn as shapes'], ['live', 'Live, editable text']], P.svgText, (v) => set('svgText', v), 'Text in the SVG'),
        h('div', { class: 'hint' }, P.svgText === 'live' ? 'Editable in Illustrator or Figma if the fonts are installed. They’re all free on Google Fonts.' : 'Looks the same everywhere, with no fonts needed. Best for print and handing to others.'),
        go(run('Download SVG', async () => ctx.download(new Blob([await svgOf(P.way)], { type: 'image/svg+xml' }), base() + suffix(P.way) + '.svg')),
          run('Copy SVG code', async () => copy(await svgOf(P.way), 'SVG code copied'), 'btn')), altBlock());
    } else if (D.id === 'pdf') {
      const fx = Object.entries(d0().paint.effects || {}).some(([k, v]) => k !== 'text' && v);
      put(label('Colorway'), ways(), bgToggle(), label('Width'), chips([[50, '50 mm'], [100, '100 mm'], [200, '200 mm']], P.pdfMm, (v) => set('pdfMm', v)),
        fx && P.way === 'color' ? h('div', { class: 'note' }, 'Soft effects (glow, shadow, grain, foil) don’t exist in PDF and are left out. Use the PNG if you need them.') : null,
        go(run('Download PDF', async () => ctx.download(await pdfOf(P.way, P.pdfMm), base() + suffix(P.way) + '.pdf'))));
    } else if (D.id === 'print') {
      const wi = printIn(), pt = sm * wi * 72 / vb[2], minIn = 6 * vb[2] / (72 * sm), px = Math.round(wi * 300);
      const inp = h('input', { type: 'number', min: P.unit === 'mm' ? 10 : 0.4, max: P.unit === 'mm' ? 1000 : 40, step: P.unit === 'mm' ? 1 : 0.05, value: P.printW, 'aria-label': 'Printed width', onchange: (e) => setPrint(Math.max(+e.target.min, Math.min(+e.target.max, +e.target.value || 1))) });
      put(label('Colorway'), ways(), bgToggle(),
        label('Printed width'), h('div', { class: 'inrow' }, inp, seg([['in', 'in'], ['mm', 'mm']], P.unit, setUnit, 'Unit')),
        h('div', { class: 'chips' }, PRINT_SIZES.map(([n, w]) => h('button', { class: 'chip', onclick: () => setPrint(w, 'in') }, n, h('small', {}, P.unit === 'mm' ? Math.round(w * 25.4) + ' mm' : w + ' in')))),
        info(`${fmtLen(wi)} × ${fmtLen(wi * vb[3] / vb[2])}`, `${px} × ${Math.round(px * vb[3] / vb[2])} px at 300 dpi`),
        !isFinite(sm) ? h('div', { class: 'note' }, 'There are no words in this laurel to size: it’s all artwork. Check the logo’s own small details at this width.') : pt < 6 ? h('div', { class: 'note rule' }, `The smallest words print at ${pt.toFixed(1)} pt. Below about 6 pt they blur on most presses: print it at least ${fmtLen(minIn)} wide, or drop a line.`) : h('div', { class: 'note' }, `The smallest words print at ${pt.toFixed(1)} pt: comfortably readable.`),
        go(run('Download PDF at this size', async () => ctx.download(await pdfOf(P.way, wi * 25.4), `${base()}${suffix(P.way)}-${P.unit === 'mm' ? Math.round(P.printW) + 'mm' : r2(P.printW) + 'in'}.pdf`)),
          run('Download PNG at 300 dpi', async () => ctx.download(await withDpi(await pngOf(P.way, px), 300), `${base()}${suffix(P.way)}-${px}px-300dpi.png`), 'btn')),
        h('div', { class: 'hint' }, 'Hand the PDF to your printer or designer: it’s vector, the exact size, with the text outlined. It’s in RGB, which most printers convert for you; for a one-ink job, send the Black version and ask for it on the black plate only.'));
    } else if (D.id === 'social') {
      const S = P.social, file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const fl = e.target.files[0]; if (!fl) return; if (fl.size > 12e6) { ctx.toast('That image is over 12 MB: try a smaller one'); return; } photo = { url: await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(fl); }), name: fl.name }; set('social.bg', 'photo'); } });
      // the caption and alt text follow what the card shows, and the title as it's typed
      const capNow = () => (showsRow(S.what) ? rowCaption(rowShown(), S.title.trim()) : caption(ctx, S.title.trim())), capEl = h('div', { class: 'alt' }, capNow());
      const title = h('input', { type: 'text', value: S.title, placeholder: 'Your film’s title', 'aria-label': 'Film title', oninput: (e) => { set('social.title', e.target.value, { opts: false }); capEl.textContent = capNow(); } });
      const line = h('input', { type: 'text', value: S.line, placeholder: 'e.g. Screening June 12 · Park City', 'aria-label': 'Detail line', oninput: (e) => set('social.line', e.target.value, { opts: false }) });
      put(label('Format'), h('div', { class: 'fmtgrid' }, Object.entries(SOCIAL).map(([k, v]) => h('button', { class: 'chip' + (k === S.fmt ? ' on' : ''), onclick: () => set('social.fmt', k) }, v[2], h('small', {}, k)))),
        hasRow() ? seg([['laurel', 'This laurel'], ['row', `The row (${rowShown().length})`]], S.what, (v) => set('social.what', v), 'What to show') : null,
        label('Words'), title, line,
        label('Background'), chips([['laurel', 'The laurel’s'], ['dark', 'Dark'], ['light', 'Light'], ['custom', 'Color'], ['photo', photo ? 'Photo' : 'Photo…']], S.bg, (v) => { if (v === 'photo' && !photo) file.click(); else set('social.bg', v); }), file,
        S.bg === 'custom' ? h('div', { class: 'inrow' }, h('input', { type: 'color', value: hex(S.color) || '#0b0b0d', 'aria-label': 'Background color', oninput: (e) => set('social.color', e.target.value, { opts: false }) }), h('span', { class: 'hint' }, 'Any color')) : null,
        S.bg === 'photo' && photo ? h('div', { class: 'row' }, h('label', {}, 'Darken'), h('input', { type: 'range', 'aria-label': 'Darken the photo', min: 0, max: 0.85, step: 0.05, value: S.dim, oninput: (e) => set('social.dim', +e.target.value, { opts: false }) }), h('button', { class: 'btn small ghost', onclick: () => file.click() }, 'Change')) : null,
        h('div', { class: 'row' }, h('label', {}, 'Laurel size'), h('input', { type: 'range', 'aria-label': 'Laurel size', min: 0.5, max: 1.25, step: 0.05, value: S.size, oninput: (e) => set('social.size', +e.target.value, { opts: false }) }), h('span', {})),
        label('Colorway'), ways(),
        rowGate(S.what, run('Download the card', async () => { const c = socialSvg(); ctx.download(await composedPng(c), `${base()}${showsRow(S.what) ? '-row' : ''}-${S.fmt.replace(':', 'x')}.png`); })),
        h('div', { class: 'oblock' }, label('A first line for the post', h('button', { class: 'btn small ghost', onclick: () => copy(capNow(), 'Caption copied') }, 'Copy')), capEl, h('div', { class: 'hint' }, 'A starting point: make it yours. Tag the festival; they often share. Many festivals ask films to wait for the line-up announcement before posting.')),
        altBlock(showsRow(S.what) ? rowAlt() : undefined));
    } else if (D.id === 'video') {
      const V = P.video;
      put(label('Frame'), seg([[1080, 'HD 1920 × 1080'], [2160, '4K 3840 × 2160']], V.res, (v) => set('video.res', v), 'Resolution'),
        hasRow() ? seg([['laurel', 'This laurel'], ['row', `The row (${rowShown().length})`]], V.what, (v) => set('video.what', v), 'What to show') : null,
        label('Placement'), seg([['center', 'Center'], ['third', 'Lower third'], ['corner', 'Corner']], V.pos, (v) => set('video.pos', v), 'Placement'),
        h('div', { class: 'row' }, h('label', {}, 'Height'), h('input', { type: 'range', 'aria-label': 'Laurel height', min: 0.12, max: 0.7, step: 0.01, value: V.size, oninput: (e) => set('video.size', +e.target.value, { opts: false }) }), h('span', {})),
        label('Background'), seg([['none', 'Transparent'], ['black', 'Black']], V.bg, (v) => set('video.bg', v), 'Background'),
        label('Colorway'), ways(),
        rowGate(V.what, run('Download the frame', async () => { const c = videoSvg(); ctx.download(await composedPng(c), `${base()}${showsRow(V.what) ? '-row' : ''}-endcard-${c.W}x${c.H}.png`); })),
        h('div', { class: 'hint' }, 'For animated laurels (a reveal, a shimmer), use Motion in the top bar: it makes MP4s and PNG sequences.'), altBlock(showsRow(V.what) ? rowAlt() : undefined));
    } else if (D.id === 'web') {
      const ar = vb[3] / vb[2], wpx = P.web.w, hpx = Math.round(wpx * ar), alt = ctx.altText(d0());
      const html = `<img src="/images/${base()}${suffix(P.way)}.svg" alt="${esc(alt)}" width="${wpx}" height="${hpx}" loading="lazy">`;
      put(label('Colorway'), ways(), label('Shown on the page at'), chips([[120, '120'], [180, '180'], [240, '240'], [320, '320 px wide']], wpx, (v) => set('web.w', v)),
        go(run('Download SVG', async () => ctx.download(new Blob([await svgOf(P.way, { text: 'outlined' })], { type: 'image/svg+xml' }), base() + suffix(P.way) + '.svg')),
          run('Copy SVG code', async () => copy(await svgOf(P.way, { text: 'outlined' }), 'SVG code copied: paste it into an HTML or code block'), 'btn')),
        h('div', { class: 'oblock' }, label('HTML', h('button', { class: 'btn small ghost', onclick: () => copy(html, 'HTML copied') }, 'Copy')), h('pre', {}, html), h('div', { class: 'hint' }, 'Upload the SVG next to your site’s images and change the path to match. Squarespace, Wix or Webflow: paste the SVG code into a code block instead.')),
        altBlock());
    } else if (D.id === 'deck') {
      const svgFile = async () => ctx.download(new Blob([await svgOf(P.way, { text: 'outlined' })], { type: 'image/svg+xml' }), base() + suffix(P.way) + '.svg');
      put(label('Colorway'), ways(), bgToggle(),
        go(run('Download PNG for slides', async () => ctx.download(await pngOf(P.way, 2000), base() + suffix(P.way) + '.png')),
          h('div', { class: 'pair' }, run('SVG', svgFile, 'btn'), run('PDF', async () => ctx.download(await pdfOf(P.way, P.pdfMm), base() + suffix(P.way) + '.pdf'), 'btn'))),
        h('div', { class: 'hint' }, 'Google Slides takes the PNG. PowerPoint keeps the SVG sharp at any size, and Keynote does the same with the PDF. ', hasRow() ? 'Several laurels on one slide? Your row exports them at one scale, so the type matches.' : 'Several laurels on one slide? Keep them the same height.'),
        altBlock(), pitchdog());
    } else if (D.id === 'email') {
      const hh = P.email.h, W2 = Math.round(hh * 2 * vb[2] / vb[3]), Wd = Math.round(hh * vb[2] / vb[3]), alt = ctx.altText(d0());
      const snip = `<img src="PASTE-THE-IMAGE-LINK" alt="${esc(alt)}" width="${Wd}" height="${hh}" style="display:block;border:0;height:${hh}px;width:${Wd}px">`;
      put(label('Colorway'), ways(), label('Height in the signature'), chips([[60, '60'], [80, '80'], [100, '100 px']], hh, (v) => set('email.h', v)),
        label('Background'), chips([['auto', P.way === 'color' && d0().canvas.bg ? 'The laurel’s' : 'None'], ['white', 'White'], ['dark', 'Dark']], P.email.bg, (v) => set('email.bg', v)),
        !emailBg() ? h('div', { class: 'note' }, 'Clear backgrounds can vanish in dark-mode inboxes: check both previews, or give it a solid background.') : null,
        info(`${W2} × ${hh * 2} px file, shown at ${Wd} × ${hh}`),
        go(run('Download PNG', async () => { const r0 = rendered(P.way), bgc = emailBg(), c = { W: W2, H: hh * 2 }; c.svg = root(c.W, c.H, (bgc ? `<rect width="${c.W}" height="${c.H}" fill="${bgc}"/>` : '') + nest(r0.svg, 0, 0, c.W, c.H).el); ctx.download(await composedPng(c), `${base()}-signature.png`); })),
        h('div', { class: 'oblock' }, label('HTML for Gmail, Outlook or Apple Mail', h('button', { class: 'btn small ghost', onclick: () => copy(snip, 'HTML copied') }, 'Copy')), h('pre', {}, snip),
          h('div', { class: 'hint' }, 'Most mail apps let you paste the image straight into the signature editor. For the HTML, put the PNG online first (your site, or a public Drive or Dropbox link) and paste its link in.')));
    } else if (D.id === 'words') {
      const a = accolades(ctx), forms = { list: ['List', a.lines.join('\n')], sentence: ['Sentence', a.sentence], html: ['HTML', a.html] };
      const cur = forms[P.words] ? P.words : 'list';
      put(seg(Object.entries(forms).map(([k, v]) => [k, v[0]]), cur, (v) => set('words', v), 'Format'),
        h('pre', {}, forms[cur][1] || (a.list.length ? NO_SENTENCE : 'Nothing yet: fill in the festival first.')),
        go(h('button', { class: 'btn primary', onclick: () => copy(forms[cur][1], 'Copied') }, 'Copy')),
        h('div', { class: 'hint' }, a.list.length > 1 ? `${a.count} laurels, ordered by what carries furthest: wins, then premieres, then selections. Laurels hidden in the row are left out.` : 'Add laurels to the row (Row, in the top bar) and they all appear here, in order.'),
        altBlock());
    } else if (D.id === 'pack') {
      const K = P.pack, n = packList().length;
      const tick = (list, key, all) => h('div', { class: 'checks' }, all.map(([v, l, note]) => h('label', {}, h('input', { type: 'checkbox', checked: list.includes(v), onchange: (e) => { K[key] = all.map((x) => x[0]).filter((x) => (x === v ? e.target.checked : K[key].includes(x))); save(); keepPack(); show(); } }), l, note ? h('small', {}, note) : null)));
      put(h('div', { class: 'hint' }, 'The festival’s name, year and look come from your laurel: set them on the Words and Looks tabs first.'),
        label('Statuses'), tick(K.statuses, 'statuses', STATUS_COMMON.filter((x) => x !== 'Winner').map((x) => [x, x])),
        label('Awards', h('small', {}, 'one per line')), h('textarea', { rows: 5, 'aria-label': 'Awards, one per line', placeholder: 'Best Feature Film\nBest Short Film\nAudience Award', style: 'font-family:var(--sans);font-size:12.5px', oninput: (e) => set('pack.awards', e.target.value, { opts: false }) }, K.awards),
        h('div', { class: 'inrow' }, h('span', { class: 'hint', style: 'flex:none' }, 'Over each award:'), h('input', { type: 'text', value: K.winner, list: 'pk-winner', 'aria-label': 'Line over each award', oninput: (e) => set('pack.winner', e.target.value, { opts: false }) }), h('datalist', { id: 'pk-winner' }, ['Winner', 'Award Winner', 'Jury Award', ''].map((x) => h('option', { value: x })))),
        label('Colorways'), tick(K.ways, 'ways', WAYS.map((W) => [W.id, W.label])),
        label('Formats'), tick(K.fmts, 'fmts', [['svg', 'SVG', 'vector'], ['png', 'PNG', `${P.pngW} px wide`], ['pdf', 'PDF', `${P.pdfMm} mm wide`]]),
        (() => { const ok = n && P.pack.ways.length && P.pack.fmts.length, b = run(`Download the festival pack${n ? ` (${n} laurels)` : ''}`, makePack); b.disabled = !ok; return go(b, ok ? null : h('div', { class: 'hint' }, n ? 'Pick at least one colorway and one format.' : 'Pick the statuses and awards your festival gives.')); })(),
        h('div', { class: 'hint' }, 'Comes with a guidelines file to edit and send with the laurels: what each one may be used for, sizes, and who to ask.'));
    } else if (D.id === 'row') {
      const X = ctx.modes.row && ctx.modes.row.exports;
      const none = rowNone(), bs = [run('ZIP of separate files', async () => X.zip()), run('One PNG of the row', async () => X.png(), 'btn'), run('One SVG of the row', async () => X.svg(), 'btn'), run('One PDF of the row', async () => X.pdf(), 'btn')];
      if (none) bs.forEach((b) => (b.disabled = true));
      put(go(...bs, none ? h('div', { class: 'hint' }, none) : null),
        h('div', { class: 'hint' }, 'The separate files are all drawn at the same scale, so the type matches when you place them at 100%.'));
    }
  }

  // ── the laurel kit: every chosen format in every chosen colorway, with a README that answers the questions ──
  // the kit's files, planned once: the preview counts them, the button makes them, in the same order
  function kitPlan() {
    const ways = WAYS.map((W) => W.id).filter((w) => P.kit.ways.includes(w)), fmts = ['svg', 'png', 'pdf'].filter((f) => P.kit.fmts.includes(f)), b = base(), plan = [], pngW = P.pngW, pdfMm = P.pdfMm;
    for (const w of ways) {
      const dir = `${b}/${w}/`, name = `${b}-${w}`;
      if (fmts.includes('svg')) plan.push({ name: dir + name + '.svg', make: () => svgOf(w, { bg: false, text: 'outlined' }) });
      if (fmts.includes('png')) {
        plan.push({ name: dir + name + '.png', make: () => pngOf(w, pngW, { bg: false }) });
        if (w === 'color' && d0().canvas.bg) plan.push({ name: dir + name + '-on-background.png', make: () => pngOf(w, pngW, { bg: true }) });
      }
      if (fmts.includes('pdf')) plan.push({ name: dir + name + '.pdf', make: () => { const r = rendered(w); return ctx.toPdf(stripBg(r.svg), docOf(w), 'Laurel', pdfMm); } });
    }
    return { ways, fmts, b, plan, pngW, pdfMm, ready: ways.length > 0 && fmts.length > 0 };
  }
  async function makeKit(say) {
    const { ways, fmts, b, plan, ready, pngW, pdfMm } = kitPlan();
    if (!ready) { ctx.toast('Pick at least one colorway and one format'); return; }
    const files = [];
    for (const [i, f] of plan.entries()) { say(`Making ${i + 1} of ${plan.length}…`); files.push({ name: f.name, data: await f.make() }); }
    say('Packing…');
    files.push({ name: `${b}/README.txt`, data: readme(ways, fmts, ctx.shareLink ? await ctx.shareLink() : location.href, { pngW, pdfMm }) });
    ctx.download(await ctx.zip(files), `${b}-laurel-kit.zip`);
    ctx.toast('Laurel kit downloaded');
  }
  function packList() {
    const K = P.pack, awards = String(K.awards || '').split('\n').map((x) => x.trim()).filter(Boolean);
    return packVariants(ctx, d0(), { statuses: K.statuses, awards, winner: (K.winner || '').trim() });
  }
  async function makePack(say) {
    const vs = packList(); if (!vs.length) { ctx.toast('Pick at least one status or award'); return; }
    const ways = WAYS.map((W) => W.id).filter((w) => P.pack.ways.includes(w)), fmts = ['svg', 'png', 'pdf'].filter((f) => P.pack.fmts.includes(f)), pngW = P.pngW, pdfMm = P.pdfMm; // D29: this job's sizes, and its link
    keepPack(); const link = ctx.shareLink ? await ctx.shareLink() : location.href; // the README's link carries this recipe
    if (!ways.length || !fmts.length) { ctx.toast('Pick at least one colorway and one format'); return; }
    const t = (k) => d0().fields.filter((f) => f.kind === k && f.show !== false && f.text).map((f) => f.text.trim()).join(' ');
    const fest = t('festival') || 'festival', year = (t('year').match(/\d{4}/) || [''])[0], stem = ctx.slug([year, fest].filter(Boolean).join(' ')) || 'festival', rootDir = stem + '-laurels/';
    const files = [], total = vs.length * ways.length * fmts.length; let n = 0, minPx = 0, minIn = 0; // readable sizes for the variant that needs the most room
    for (const v of vs) for (const w of ways) {
      const dv = colorway(v.doc, w, ctx.clone), r = ctx.render(dv), name = `${rootDir}${v.slug}/${stem}-${v.slug}-${w}`, sv = smallest(r);
      if (isFinite(sv)) { minPx = Math.max(minPx, Math.ceil(6 * r.viewBox[3] / sv)); minIn = Math.max(minIn, 6 * r.viewBox[2] / (72 * sv)); }
      if (fmts.includes('svg')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.svg', data: await ctx.exportSvgText(stripBg(r.svg), { ...dv, out: { ...(dv.out || {}), svgText: 'outlined' } }) }); }
      if (fmts.includes('png')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.png', data: await ctx.toPng(r.svg, r.viewBox, pngW, false, dv) }); }
      if (fmts.includes('pdf')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.pdf', data: await ctx.toPdf(stripBg(r.svg), dv, v.label, pdfMm) }); }
    }
    say('Packing…');
    const fonts = [...new Set(Object.values(d0().roles).map((x) => x && x.font).filter(Boolean))];
    const title = [fest, year].filter(Boolean).join(' ');
    files.push({ name: rootDir + 'README.txt', data: [
      `${title}: laurels for selected films`, '', 'Made with Daphne, the free festival laurel maker by pitch.dog: https://pitch.dog/daphne', `Open this set again to edit it (then Export, Festival pack): ${link}`, '',
      'ONE FOLDER PER LAUREL', ...vs.map((v) => `  ${v.slug}/  ${ctx.altText(v.doc)}`), '',
      'IN EACH FOLDER', ...ways.map((w) => `  -${w}  ${{ color: 'as designed', black: 'one color, black, clear background', white: 'one color, white, clear background' }[w]}`),
      ...fmts.map((f) => `  .${f}  ${{ svg: 'vector, text drawn as shapes (opens anywhere without the fonts)', png: `${pngW} px wide, clear background`, pdf: `vector, ${pdfMm} mm wide, for print` }[f]}`), '',
      'FONTS', `  ${fonts.join(', ')}. From Google Fonts, under open licenses such as the SIL Open Font License: free to use, commercially too.`, '',
      'Send each film only the laurel for what it received, with GUIDELINES.txt.', '',
      'YOURS TO USE', '  Daphne claims no rights in these laurels. What Daphne drew is dedicated to the public domain (CC0 1.0).', '',
    ].join('\n') });
    files.push({ name: rootDir + 'GUIDELINES.txt', data: [
      `LAUREL GUIDELINES: ${title.toUpperCase()}`, '(A template from Daphne. Edit it, add your contact, and send it with the laurels.)', '',
      `Congratulations, and thank you for being part of ${title}. Please use our laurels like this:`, '',
      '1. Use the laurel for what your film received: Official Selection for a selection, the award laurel only for the award it won. A nomination or a finalist place is not a win.',
      '2. Use the files as they are. Please don’t redraw, re-letter or recolor them. The black and white versions are there for backgrounds where the color one doesn’t read.',
      minPx ? `3. Keep it readable: at least ${minPx} px tall on screen, and at least ${r2(minIn)} in (${Math.round(minIn * 25.4)} mm) wide in print.` : '3. Keep it readable: large enough that every detail of the artwork holds.',
      '4. Give it room: keep clear space around it of at least a tenth of its width, and don’t crop or overlap it.',
      '5. Alongside other festivals’ laurels, ours can sit at the same size as the rest.',
      '6. Name us as we are written on the laurel, in captions and press releases too.', '',
      'Questions, or need another format? Write to: [your email]', '',
    ].join('\n') });
    ctx.download(await ctx.zip(files), `${stem}-laurels.zip`);
    ctx.toast('Festival pack downloaded');
  }
  function readme(ways, fmts, link, Z = { pngW: P.pngW, pdfMm: P.pdfMm }) {
    const d = d0(), r = rendered('color'), vb = r.viewBox, sm = smallest(r), alt = ctx.altText(d);
    const minPx = Math.ceil(6 * vb[3] / sm), minIn = 6 * vb[2] / (72 * sm);
    const fonts = [...new Set(Object.values(d.roles).map((x) => x && x.font).filter(Boolean))];
    const notes = checkLaurel(d);
    const W = { color: 'The laurel as you designed it.', black: 'One color, pure black (#000000), clear background. For light posters, one-ink print and festival programs.', white: 'One color, pure white (#FFFFFF), clear background. For dark posters, trailers and over photos.' };
    const F = { svg: '.svg  Vector. The text is drawn as shapes, so it opens anywhere without the fonts. Best for print and the web.', png: `.png  ${Z.pngW} px wide, clear background. For video edits, social posts and slides.`, pdf: `.pdf  Vector, ${Z.pdfMm} mm wide. The one to send to printers.` };
    return [
      alt, '', 'Made with Daphne, the free festival laurel maker by pitch.dog: https://pitch.dog/daphne', `Open this laurel again to edit it: ${link}`, '',
      'WHAT’S HERE', ...ways.map((w) => `  ${w}/  ${W[w]}`), '', 'In each folder:', ...fmts.map((f) => '  ' + F[f]),
      ways.includes('color') && d.canvas.bg && fmts.includes('png') ? '  -on-background.png  The same, on your background color.' : null, '',
      'ALT TEXT', `  ${alt}`, '  Paste it wherever the image goes: it’s what screen readers say.', '',
      'SIZES THAT STAY READABLE', ...(isFinite(sm) ? [`  On screen: at least ${minPx} px tall.`, `  In print: at least ${r2(minIn)} in (${Math.round(minIn * 25.4)} mm) wide, so the smallest words are 6 pt.`] : ['  No words to size: the laurel is all artwork. Keep it large enough that its details hold.']), '',
      'FONTS', `  ${fonts.join(', ')}. From Google Fonts, under open licenses such as the SIL Open Font License: free to use, commercially too.`, '',
      notes.length ? 'BEFORE YOU USE IT' : null, ...notes.map((x) => `  - ${x.text}${x.source ? ` (${x.source.url})` : ''}`), notes.length ? '' : null,
      'Some festivals send official laurels and require them. If yours did, use theirs.',
      'This laurel is the filmmaker’s own claim. It isn’t affiliated with or endorsed by any festival.', '',
      'YOURS TO USE', '  Daphne asks for no credit and claims no rights in this laurel. What Daphne drew is dedicated to the public domain', '  (CC0 1.0), so use, change and share it however you like. The festival’s name and any artwork you added belong to their owners.', '',
    ].filter((x) => x !== null).join('\n');
  }

  function show() { drawOpts(); drawPreview(); }
  buildDests();
  show();
  requestAnimationFrame(() => (dests.querySelector('.dest.on') || modal.querySelector('.x')).focus());
  return { close };
}
