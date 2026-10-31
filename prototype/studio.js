// studio.js — Export. Say where the laurel is going and get exactly the files that place needs.
// Nothing here changes the laurel: every destination re-dresses a copy of the document (a one-color version, a social
// card, an end-card frame) and packs it. The settings people pick are remembered on this device.
import { checkLaurel, statusRank, prestige } from './rules.js';
import { STATUS_COMMON } from './words.js';

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

// ── what the laurels say, as text: for press releases, IMDb, FilmFreeway, a website ──
function accolades(ctx) {
  const d = ctx.doc, t = (k) => d.fields.filter((f) => f.kind === k && f.show !== false && f.text).map((f) => f.text.trim()).join(' ');
  const items = [];
  const self = { status: t('status'), festival: t('festival'), award: t('award'), year: (t('year').match(/\d{4}/) || [''])[0] };
  if (self.festival || self.award) items.push(self);
  for (const it of (d.row && d.row.items) || []) if (it.festival || it.award) items.push({ status: it.status || '', festival: it.festival || '', award: it.award || '', year: String(it.year || '').match(/\d{4}/)?.[0] || '' });
  const seen = new Set(), list = items.filter((it) => { const k = [it.status, it.festival, it.award, it.year].join('|').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  list.sort((a, b) => prestige(b) - prestige(a));
  const line = (it) => [it.status, it.award, [it.festival, it.year].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const wins = list.filter((it) => statusRank(it.status || it.award) >= 50), fests = [...new Set(list.map((it) => it.festival).filter(Boolean))];
  const prem = list.find((it) => /premiere/i.test(it.status));
  const and = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const s = [];
  if (prem) s.push(`${prem.status} at ${[prem.festival, prem.year].filter(Boolean).join(' ')}.`);
  if (fests.length > 1) s.push(`Selected for ${fests.length} festivals, including ${and(fests.slice(0, 3))}.`);
  else if (fests.length === 1 && !prem) s.push(`${list[0].status || 'Official Selection'}, ${fests[0]}${list[0].year ? ' ' + list[0].year : ''}.`);
  if (wins.length) s.push(`Winner of ${and(wins.slice(0, 3).map((w) => (w.award || 'an award') + (w.festival ? ` at ${w.festival}${w.year ? ' ' + w.year : ''}` : '')))}${wins.length > 3 ? `, and ${wins.length - 3} more` : ''}.`);
  return { list, lines: list.map(line), sentence: s.join(' '), html: `<ul class="laurels">\n${list.map((it) => `  <li>${esc(line(it))}</li>`).join('\n')}\n</ul>` };
}

// a first line for the post that goes with the card; the filmmaker makes it theirs
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
  email: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>'),
  words: I('<path d="M5 6h14M5 10h14M5 14h9M5 18h6"/>'),
  row: I('<circle cx="6" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="12" r="3"/>'),
  pack: I('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>'),
};
const DESTS = [
  { id: 'kit', t: 'Laurel kit', s: 'Everything, in one ZIP', kit: true },
  { g: 'Files' },
  { id: 'png', t: 'PNG', s: 'Transparent, any size' },
  { id: 'svg', t: 'SVG', s: 'Vector, for designers and the web' },
  { id: 'pdf', t: 'PDF', s: 'Vector, for printers' },
  { g: 'Where it’s going' },
  { id: 'print', t: 'Poster and print', s: 'Exact size, 300 dpi' },
  { id: 'social', t: 'Social post', s: 'An announcement card' },
  { id: 'video', t: 'Trailer and video', s: 'End-card frame, HD or 4K' },
  { id: 'web', t: 'Website', s: 'SVG, HTML and alt text' },
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
  o.social.title = o.social.title || ''; return o;
}
let photo = null; // a still or poster for the social card: this session only, never stored

export function openStudio(ctx) {
  const { h } = ctx, P = loadPrefs();
  const save = () => { try { localStorage.setItem('daphne.studio', JSON.stringify(P)); } catch (e) { /* a convenience */ } };
  const d0 = () => ctx.doc;
  const hasRow = () => !!(d0().row && d0().row.items && d0().row.items.length && ctx.rowScene);
  const base = () => ctx.fileName();
  const docOf = (way) => colorway(d0(), way, ctx.clone);
  const cache = new Map();
  const rendered = (way) => { if (!cache.has(way)) cache.set(way, ctx.render(docOf(way))); return cache.get(way); }; // the laurel doesn't change while Export is open
  const bgOn = () => P.way === 'color' && !!d0().canvas.bg && P.bg !== false;
  const smallest = (r) => Math.min(...r.report.lines.filter((l) => !l.icon).map((l) => l.size), Infinity);
  const prevFocus = document.activeElement;

  // ── shell ──
  const dests = h('nav', { class: 'dests', 'aria-label': 'Where it’s going' });
  const preview = h('div', { class: 'preview', 'aria-live': 'polite' });
  const opts = h('div', { class: 'opts' });
  const close = () => { scrim.remove(); window.removeEventListener('keydown', onKey, true); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const modeNote = ctx.mode === 'motion' ? 'Video files (MP4, PNG sequence, animated SVG) are in the Motion panel under the stage.' : ctx.mode === 'poster' ? 'The poster mockup downloads from the Poster panel under the stage.' : '';
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'studio-title' },
    h('header', {}, h('div', {}, h('h2', { id: 'studio-title' }, 'Export'), h('p', {}, modeNote || 'Pick where it’s going. Daphne makes the right files for it.')),
      h('button', { class: 'btn ghost x', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'studio' }, dests, preview, opts));
  const scrim = h('div', { class: 'scrim', onmousedown: (e) => { if (e.target === scrim) close(); } }, modal);
  document.body.append(scrim);
  window.addEventListener('keydown', onKey, true);

  function buildDests() {
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
  const set = (k, v, o = {}) => { const path = k.split('.'); let t = P; while (path.length > 1) t = t[path.shift()]; t[path[0]] = v; save(); if (o.opts !== false) show(); else drawPreview(); };
  const copy = async (text, what = 'Copied') => { try { await navigator.clipboard.writeText(text); ctx.toast(what); } catch (e) { window.prompt('Copy this', text); } };
  const run = (label, fn, cls = 'btn gold') => { const b = h('button', { class: cls, onclick: async () => { if (b.disabled) return; const was = b.textContent; b.disabled = true; b.textContent = 'Making…'; try { await fn((s) => (b.textContent = s)); } catch (e) { console.error(e); ctx.toast('That didn’t work: ' + (e.message || e)); } finally { b.disabled = false; b.textContent = was; } } }, label); return b; };
  function ways(cur = P.way, on = (v) => set('way', v)) {
    return h('div', { class: 'ways', role: 'radiogroup', 'aria-label': 'Colorway' }, WAYS.map((W) => {
      const r = rendered(W.id), sw = h('div', { class: 'sw ' + (W.id === 'black' ? 'light' : 'dark'), html: (W.id === 'color' ? r.svg : stripBg(r.svg)).replace(/width="[^"]+" height="[^"]+"/, '') });
      return h('button', { class: W.id === cur ? 'on' : '', role: 'radio', 'aria-checked': String(W.id === cur), title: W.note, onclick: () => on(W.id) }, sw, W.label);
    }));
  }
  const bgToggle = () => (P.way === 'color' && d0().canvas.bg ? toggle('Keep the background color', P.bg !== false, (v) => set('bg', v)) : null);
  const altBlock = () => { const a = ctx.altText(d0()); return h('div', { class: 'oblock' }, label('Alt text', h('button', { class: 'btn small ghost', onclick: () => copy(a, 'Alt text copied') }, 'Copy')), h('div', { class: 'alt' }, a), h('div', { class: 'hint' }, 'Paste it wherever the image goes: it’s what screen readers say.')); };
  function rulesBlock() {
    const notes = checkLaurel(d0()).filter((n) => n.level === 'rule');
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
    if (what === 'row' && hasRow()) { const sc = ctx.rowScene({ bg: false }); if (sc) return { svg: sc.svg, vb: sc.vb, row: true }; }
    const r = rendered(P.way); return { svg: P.way === 'color' ? r.svg : stripBg(r.svg), vb: r.viewBox, r };
  }
  function socialSvg() {
    const S = P.social, [W, H] = SOCIAL[S.fmt], d = d0(), sc = scene(S.what);
    const bg = S.bg === 'photo' && photo ? '#000000' : S.bg === 'laurel' ? (hex(d.canvas.bg) || '#0b0b0d') : S.bg === 'light' ? '#f4f1ea' : S.bg === 'custom' ? (hex(S.color) || '#0b0b0d') : '#0b0b0d';
    const dark = (S.bg === 'photo' && photo) || lum(bg) < 0.4;
    const tp = hex(d.text.paint), ink = P.way === 'color' && tp && contrast(tp, bg) > 3 ? tp : dark ? '#ffffff' : '#141414';
    const hero = d.roles.hero, sub = d.roles.sub, story = S.fmt === '9:16', wide = S.fmt === '16:9';
    const top = H * (story ? 0.15 : 0.08), bot = H * (story ? 0.8 : 0.92), maxW = W * 0.84;
    const cased = (s, r) => (r.case === 'upper' ? s.toUpperCase() : r.case === 'lower' ? s.toLowerCase() : s);
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
    if (line) { y += (lines.length ? tS * 0.55 : 0) + lS * 0.8; txt += `<text x="${W / 2}" y="${r2(y)}" text-anchor="middle" font-family="${esc(sub.font)}" font-weight="${sub.weight}" font-size="${r2(lS)}" letter-spacing="${r2(0.16 * lS)}" fill="${ink}" opacity="0.86">${esc(line)}</text>`; }
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
  const composedPng = async (c, dpi) => { const b = await ctx.toPng(c.svg, [0, 0, c.W, c.H], c.W, true, d0(), c.H); return dpi ? withDpi(b, dpi) : b; };

  // ── the preview ──
  function frameOf(svg, cls = '', maxW, maxH) {
    const vb = (/viewBox="([^"]+)"/.exec(svg) || [, '0 0 100 100'])[1].split(/[\s,]+/).map(Number);
    const el = h('div', { class: 'frame ' + cls, html: svg.replace(/width="[^"]+" height="[^"]+"/, '') });
    const s = el.querySelector('svg');
    requestAnimationFrame(() => { const bw = maxW || preview.clientWidth - 64, bh = maxH || preview.clientHeight - 96, k = Math.min(bw / vb[2], bh / vb[3]); s.style.width = Math.max(40, vb[2] * k) + 'px'; s.style.height = Math.max(40, vb[3] * k) + 'px'; });
    return el;
  }
  const wayCls = (way) => (way === 'black' ? 'light' : way === 'white' ? 'dark' : '');
  const laurelPreview = (way = P.way) => { const r = rendered(way); return frameOf(way === 'color' && bgOn() ? r.svg : stripBg(r.svg), wayCls(way)); };
  function drawPreview() {
    preview.innerHTML = '';
    const pv = h('div', { class: 'pv' }), cap = (t) => h('div', { class: 'cap' }, t);
    const D = P.dest;
    if (D === 'kit') {
      const ws = P.kit.ways.length ? P.kit.ways : ['color'], bw = Math.max(120, (preview.clientWidth - 90) / ws.length - 14);
      pv.append(h('div', { class: 'kitgrid' }, ws.map((w) => { const r = rendered(w); return h('figure', {}, frameOf(w === 'color' && d0().canvas.bg ? r.svg : stripBg(r.svg), wayCls(w), bw, preview.clientHeight * 0.5), h('figcaption', {}, WAYS.find((x) => x.id === w).label)); })),
        cap(`${ws.length * P.kit.fmts.length + 1} files: ${P.kit.fmts.map((f) => f.toUpperCase()).join(', ')} in ${ws.length === 1 ? 'one colorway' : ws.length + ' colorways'}, with a README holding the alt text, the fonts and the sizes that stay readable.`));
    } else if (D === 'social') {
      const c = socialSvg(); pv.append(frameOf(c.svg, 'card'), cap(`${c.W} × ${c.H} px · ${SOCIAL[P.social.fmt][2]}`));
    } else if (D === 'video') {
      const c = videoSvg(); pv.append(frameOf(c.svg, P.video.bg === 'black' ? 'card' : 'footage'), cap(`${c.W} × ${c.H} px PNG${P.video.bg === 'black' ? '' : ', transparent'} · place it at 100% on a ${P.video.res === 2160 ? '4K' : '1080p'} timeline and it lines up`));
    } else if (D === 'email') {
      const r = rendered(P.way), hh = P.email.h, bgc = emailBg(), svg = bgc ? root(r.viewBox[2], r.viewBox[3], `<rect width="${r.viewBox[2]}" height="${r.viewBox[3]}" fill="${bgc}"/>` + nest(r.svg, 0, 0, r.viewBox[2], r.viewBox[3]).el) : stripBg(r.svg);
      const sig = (dark) => h('div', { class: 'sig' + (dark ? ' dark' : '') }, h('div', { class: 'who' }, h('b', {}, 'Your Name'), h('span', {}, 'Director, Your Film'), h('span', { class: 'lnk' }, 'yourfilm.com')), frameOf(svg, 'bare', 9999, hh));
      pv.append(h('div', { class: 'sigs' }, sig(false), sig(true)), cap('How it sits in a light and a dark inbox, at the size it’s shown.'));
    } else if (D === 'words') {
      const a = accolades(ctx);
      pv.append(h('div', { class: 'wordsheet' }, a.list.length ? [h('h4', {}, 'Laurels'), h('ul', {}, a.lines.map((l) => h('li', {}, l))), a.sentence ? [h('h4', {}, 'In a sentence'), h('p', {}, a.sentence)] : null] : h('p', {}, 'Fill in the festival on the Words tab, or add laurels to the row, and the text writes itself.')));
    } else if (D === 'pack') {
      const vs = packList();
      pv.append(h('div', { class: 'packgrid' }, vs.slice(0, 24).map((v) => { const r = ctx.render(colorway(v.doc, 'color', ctx.clone)); return h('figure', {}, h('div', { class: 'pt', html: (d0().canvas.bg ? r.svg : stripBg(r.svg)).replace(/width="[^"]+" height="[^"]+"/, '') }), h('figcaption', {}, v.label)); })),
        cap(vs.length ? `${vs.length} laurels × ${P.pack.ways.length || 1} colorways × ${P.pack.fmts.length || 1} formats = ${vs.length * (P.pack.ways.length || 1) * (P.pack.fmts.length || 1)} files, plus guidelines to send your filmmakers.` : 'Pick the statuses and awards your festival gives.'));
    } else if (D === 'row') {
      const sc = ctx.rowScene({ bg: true }); if (sc) pv.append(frameOf(sc.svg, ''), cap(`${d0().row.items.length} laurels, drawn at one scale so the type matches.`));
    } else {
      pv.append(laurelPreview());
      const r = rendered(P.way), vb = r.viewBox, sm = smallest(r);
      if (D === 'png') { const w = P.pngW, hh = Math.round(w * vb[3] / vb[2]); pv.append(cap(`${w} × ${hh} px${bgOn() ? '' : ', transparent'}`)); }
      if (D === 'print') { const wi = printIn(), pt = isFinite(sm) ? sm * wi * 72 / vb[2] : 99; pv.append(cap(`${fmtLen(wi)} × ${fmtLen(wi * vb[3] / vb[2])} · smallest words ${pt.toFixed(1)} pt`)); }
      if (D === 'web') pv.append(cap(`Shown ${P.web.w} px wide on the page; sharp at any size, on any screen.`));
    }
    preview.append(pv);
  }
  const printIn = () => (P.unit === 'mm' ? P.printW / 25.4 : P.printW);
  const fmtLen = (inch) => (P.unit === 'mm' ? `${Math.round(inch * 25.4)} mm` : `${r2(inch)} in`);
  const emailBg = () => { const e = P.email.bg; if (e === 'auto') return P.way === 'color' ? hex(d0().canvas.bg) : null; return e === 'white' ? '#ffffff' : e === 'dark' ? '#1b1b1f' : null; };

  // ── the options for each destination ──
  function drawOpts() {
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
      email: 'A small, sharp image for your signature, made at twice the size so it’s crisp on high-resolution screens.',
      words: 'Your laurels written out, for press releases, IMDb trivia, FilmFreeway and your site.',
      row: 'All the laurels in your row, at one scale.',
      pack: 'Run a festival? Make every laurel you send your films in one go: one per status and award, in every colorway, with guidelines to send along.',
    })[D.id]));
    const rb = rulesBlock(); if (rb && !['words'].includes(D.id)) put(rb);
    const r = rendered(P.way), vb = r.viewBox, sm = smallest(r);
    const go = (...b) => h('div', { class: 'go' }, ...b);

    if (D.id === 'kit') {
      put(label('Colorways'), h('div', { class: 'checks' }, WAYS.map((W) => h('label', {}, h('input', { type: 'checkbox', checked: P.kit.ways.includes(W.id), onchange: (e) => { P.kit.ways = WAYS.map((x) => x.id).filter((id) => (id === W.id ? e.target.checked : P.kit.ways.includes(id))); save(); show(); } }), W.label, h('small', {}, W.note)))),
        label('Formats'), h('div', { class: 'checks' }, [['svg', 'SVG', 'vector'], ['png', 'PNG', `${P.pngW} px wide`], ['pdf', 'PDF', `${P.pdfMm} mm wide`]].map(([f, l, n]) => h('label', {}, h('input', { type: 'checkbox', checked: P.kit.fmts.includes(f), onchange: (e) => { P.kit.fmts = ['svg', 'png', 'pdf'].filter((id) => (id === f ? e.target.checked : P.kit.fmts.includes(id))); save(); show(); } }), l, h('small', {}, n)))),
        go(run('Download the laurel kit', makeKit)), altBlock());
    } else if (D.id === 'png') {
      put(label('Colorway'), ways(), bgToggle(), label('Width'), chips([[1000, '1000'], [2000, '2000'], [3000, '3000'], [5000, '5000 px']], P.pngW, (v) => { set('pngW', v); remember('pngW', v); }),
        info(isFinite(sm) ? `Smallest words ${Math.round(sm * P.pngW / vb[2])} px tall` : null),
        go(run('Download PNG', async () => ctx.download(await pngOf(P.way, P.pngW), base() + suffix(P.way) + '.png'))), altBlock());
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
      const wi = printIn(), pt = isFinite(sm) ? sm * wi * 72 / vb[2] : 99, minIn = isFinite(sm) ? 6 * vb[2] / (72 * sm) : 0, px = Math.round(wi * 300);
      const inp = h('input', { type: 'number', min: P.unit === 'mm' ? 10 : 0.4, max: P.unit === 'mm' ? 1000 : 40, step: P.unit === 'mm' ? 1 : 0.05, value: P.printW, 'aria-label': 'Printed width', onchange: (e) => set('printW', Math.max(+e.target.min, +e.target.value || 1)) });
      put(label('Colorway'), ways(), bgToggle(),
        label('Printed width'), h('div', { class: 'inrow' }, inp, seg([['in', 'in'], ['mm', 'mm']], P.unit, (u) => { P.printW = u === 'mm' ? Math.round(printIn() * 25.4) : r2(P.printW / 25.4); set('unit', u); }, 'Unit')),
        h('div', { class: 'chips' }, PRINT_SIZES.map(([n, w]) => h('button', { class: 'chip', onclick: () => set('printW', P.unit === 'mm' ? Math.round(w * 25.4) : w) }, n, h('small', {}, P.unit === 'mm' ? Math.round(w * 25.4) + ' mm' : w + ' in')))),
        info(`${fmtLen(wi)} × ${fmtLen(wi * vb[3] / vb[2])}`, `${px} × ${Math.round(px * vb[3] / vb[2])} px at 300 dpi`),
        pt < 6 ? h('div', { class: 'note rule' }, `The smallest words print at ${pt.toFixed(1)} pt. Below about 6 pt they blur on most presses: print it at least ${fmtLen(minIn)} wide, or drop a line.`) : h('div', { class: 'note' }, `The smallest words print at ${pt.toFixed(1)} pt: comfortably readable.`),
        go(run('Download PDF at this size', async () => ctx.download(await pdfOf(P.way, wi * 25.4), `${base()}${suffix(P.way)}-${P.unit === 'mm' ? Math.round(P.printW) + 'mm' : r2(P.printW) + 'in'}.pdf`)),
          run('Download PNG at 300 dpi', async () => ctx.download(await withDpi(await pngOf(P.way, px), 300), `${base()}${suffix(P.way)}-${px}px-300dpi.png`), 'btn')),
        h('div', { class: 'hint' }, 'Hand the PDF to your printer or designer: it’s vector, the exact size, with the text outlined.'));
    } else if (D.id === 'social') {
      const S = P.social, file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async (e) => { const fl = e.target.files[0]; if (!fl) return; if (fl.size > 12e6) { ctx.toast('That image is over 12 MB: try a smaller one'); return; } photo = { url: await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(fl); }), name: fl.name }; set('social.bg', 'photo'); } });
      const title = h('input', { type: 'text', value: S.title, placeholder: 'Your film’s title', 'aria-label': 'Film title', oninput: (e) => set('social.title', e.target.value, { opts: false }) });
      const line = h('input', { type: 'text', value: S.line, placeholder: 'e.g. Screening June 12 · Park City', 'aria-label': 'Detail line', oninput: (e) => set('social.line', e.target.value, { opts: false }) });
      const cap = caption(ctx, S.title.trim());
      put(label('Format'), h('div', { class: 'fmtgrid' }, Object.entries(SOCIAL).map(([k, v]) => h('button', { class: 'chip' + (k === S.fmt ? ' on' : ''), onclick: () => set('social.fmt', k) }, v[2], h('small', {}, k)))),
        hasRow() ? seg([['laurel', 'This laurel'], ['row', `The row (${d0().row.items.length})`]], S.what, (v) => set('social.what', v), 'What to show') : null,
        label('Words'), title, line,
        label('Background'), chips([['laurel', 'The laurel’s'], ['dark', 'Dark'], ['light', 'Light'], ['custom', 'Color'], ['photo', photo ? 'Photo' : 'Photo…']], S.bg, (v) => { if (v === 'photo' && !photo) file.click(); else set('social.bg', v); }), file,
        S.bg === 'custom' ? h('div', { class: 'inrow' }, h('input', { type: 'color', value: hex(S.color) || '#0b0b0d', 'aria-label': 'Background color', oninput: (e) => set('social.color', e.target.value, { opts: false }) }), h('span', { class: 'hint' }, 'Any color')) : null,
        S.bg === 'photo' && photo ? h('div', { class: 'row' }, h('label', {}, 'Darken'), h('input', { type: 'range', min: 0, max: 0.85, step: 0.05, value: S.dim, oninput: (e) => set('social.dim', +e.target.value, { opts: false }) }), h('button', { class: 'btn small ghost', onclick: () => file.click() }, 'Change')) : null,
        h('div', { class: 'row' }, h('label', {}, 'Laurel size'), h('input', { type: 'range', min: 0.5, max: 1.25, step: 0.05, value: S.size, oninput: (e) => set('social.size', +e.target.value, { opts: false }) }), h('span', {})),
        label('Colorway'), ways(),
        go(run('Download the card', async () => { const c = socialSvg(); ctx.download(await composedPng(c), `${base()}-${S.fmt.replace(':', 'x')}.png`); })),
        h('div', { class: 'oblock' }, label('A first line for the post', h('button', { class: 'btn small ghost', onclick: () => copy(cap, 'Caption copied') }, 'Copy')), h('div', { class: 'alt' }, cap), h('div', { class: 'hint' }, 'A starting point: make it yours. Tag the festival; they often share. Many festivals ask films to wait for the line-up announcement before posting.')),
        altBlock());
    } else if (D.id === 'video') {
      const V = P.video;
      put(label('Frame'), seg([[1080, 'HD 1920 × 1080'], [2160, '4K 3840 × 2160']], V.res, (v) => set('video.res', v), 'Resolution'),
        hasRow() ? seg([['laurel', 'This laurel'], ['row', `The row (${d0().row.items.length})`]], V.what, (v) => set('video.what', v), 'What to show') : null,
        label('Placement'), seg([['center', 'Center'], ['third', 'Lower third'], ['corner', 'Corner']], V.pos, (v) => set('video.pos', v), 'Placement'),
        h('div', { class: 'row' }, h('label', {}, 'Height'), h('input', { type: 'range', min: 0.12, max: 0.7, step: 0.01, value: V.size, oninput: (e) => set('video.size', +e.target.value, { opts: false }) }), h('span', {})),
        label('Background'), seg([['none', 'Transparent'], ['black', 'Black']], V.bg, (v) => set('video.bg', v), 'Background'),
        label('Colorway'), ways(),
        go(run('Download the frame', async () => { const c = videoSvg(); ctx.download(await composedPng(c), `${base()}-endcard-${c.W}x${c.H}.png`); })),
        h('div', { class: 'hint' }, 'For animated laurels (a reveal, a shimmer), use Motion in the top bar: it makes MP4s and PNG sequences.'));
    } else if (D.id === 'web') {
      const ar = vb[3] / vb[2], wpx = P.web.w, hpx = Math.round(wpx * ar), alt = ctx.altText(d0());
      const html = `<img src="/images/${base()}${suffix(P.way)}.svg" alt="${esc(alt)}" width="${wpx}" height="${hpx}" loading="lazy">`;
      put(label('Colorway'), ways(), label('Shown on the page at'), chips([[120, '120'], [180, '180'], [240, '240'], [320, '320 px wide']], wpx, (v) => set('web.w', v)),
        go(run('Download SVG', async () => ctx.download(new Blob([await svgOf(P.way, { text: 'outlined' })], { type: 'image/svg+xml' }), base() + suffix(P.way) + '.svg')),
          run('Copy SVG code', async () => copy(await svgOf(P.way, { text: 'outlined' }), 'SVG code copied: paste it into an HTML or code block'), 'btn')),
        h('div', { class: 'oblock' }, label('HTML', h('button', { class: 'btn small ghost', onclick: () => copy(html, 'HTML copied') }, 'Copy')), h('pre', {}, html), h('div', { class: 'hint' }, 'Upload the SVG next to your site’s images and change the path to match. Squarespace, Wix or Webflow: paste the SVG code into a code block instead.')),
        altBlock());
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
        h('pre', {}, forms[cur][1] || 'Nothing yet: fill in the festival first.'),
        go(h('button', { class: 'btn gold', onclick: () => copy(forms[cur][1], 'Copied') }, 'Copy')),
        h('div', { class: 'hint' }, a.list.length > 1 ? 'Ordered by what carries furthest: wins, then premieres, then selections.' : 'Add laurels to the row (Row, in the top bar) and they all appear here, in order.'),
        altBlock());
    } else if (D.id === 'pack') {
      const K = P.pack, n = packList().length;
      const tick = (list, key, all) => h('div', { class: 'checks' }, all.map(([v, l, note]) => h('label', {}, h('input', { type: 'checkbox', checked: list.includes(v), onchange: (e) => { K[key] = all.map((x) => x[0]).filter((x) => (x === v ? e.target.checked : K[key].includes(x))); save(); show(); } }), l, note ? h('small', {}, note) : null)));
      put(h('div', { class: 'hint' }, 'The festival’s name, year and look come from your laurel: set them on the Words and Looks tabs first.'),
        label('Statuses'), tick(K.statuses, 'statuses', STATUS_COMMON.filter((x) => x !== 'Winner').map((x) => [x, x])),
        label('Awards', h('small', {}, 'one per line')), h('textarea', { rows: 5, 'aria-label': 'Awards, one per line', placeholder: 'Best Feature Film\nBest Short Film\nAudience Award', style: 'font-family:var(--sans);font-size:12.5px', oninput: (e) => set('pack.awards', e.target.value, { opts: false }) }, K.awards),
        h('div', { class: 'inrow' }, h('span', { class: 'hint', style: 'flex:none' }, 'Over each award:'), h('input', { type: 'text', value: K.winner, list: 'pk-winner', 'aria-label': 'Line over each award', oninput: (e) => set('pack.winner', e.target.value, { opts: false }) }), h('datalist', { id: 'pk-winner' }, ['Winner', 'Award Winner', 'Jury Award', ''].map((x) => h('option', { value: x })))),
        label('Colorways'), tick(K.ways, 'ways', WAYS.map((W) => [W.id, W.label])),
        label('Formats'), tick(K.fmts, 'fmts', [['svg', 'SVG', 'vector'], ['png', 'PNG', `${P.pngW} px wide`], ['pdf', 'PDF', `${P.pdfMm} mm wide`]]),
        go(run(`Download the festival pack${n ? ` (${n} laurels)` : ''}`, makePack)),
        h('div', { class: 'hint' }, 'Comes with a guidelines file to edit and send with the laurels: what each one may be used for, sizes, and who to ask.'));
    } else if (D.id === 'row') {
      const X = ctx.modes.row && ctx.modes.row.exports;
      put(go(run('ZIP of separate files', async () => X.zip()), run('One PNG of the row', async () => X.png(), 'btn'), run('One SVG of the row', async () => X.svg(), 'btn'), run('One PDF of the row', async () => X.pdf(), 'btn')),
        h('div', { class: 'hint' }, 'The separate files are all drawn at the same scale, so the type matches when you place them at 100%.'));
    }
  }

  // ── the laurel kit: every chosen format in every chosen colorway, with a README that answers the questions ──
  async function makeKit(say) {
    const ways = P.kit.ways.length ? P.kit.ways : ['color'], fmts = P.kit.fmts.length ? P.kit.fmts : ['svg', 'png'];
    const b = base(), files = [], total = ways.length * fmts.length + (ways.includes('color') && d0().canvas.bg && fmts.includes('png') ? 1 : 0);
    let n = 0; const tick = () => say(`Making ${++n} of ${total}…`);
    for (const w of ways) {
      const dir = `${b}/${w}/`, name = `${b}-${w}`;
      if (fmts.includes('svg')) { tick(); files.push({ name: dir + name + '.svg', data: await svgOf(w, { bg: false, text: 'outlined' }) }); }
      if (fmts.includes('png')) {
        tick(); files.push({ name: dir + name + '.png', data: await pngOf(w, P.pngW, { bg: false }) });
        if (w === 'color' && d0().canvas.bg) { tick(); files.push({ name: dir + name + '-on-background.png', data: await pngOf(w, P.pngW, { bg: true }) }); }
      }
      if (fmts.includes('pdf')) { tick(); const r = rendered(w); files.push({ name: dir + name + '.pdf', data: await ctx.toPdf(stripBg(r.svg), docOf(w), 'Laurel', P.pdfMm) }); }
    }
    say('Packing…');
    files.push({ name: `${b}/README.txt`, data: readme(ways, fmts, ctx.shareLink ? await ctx.shareLink() : location.href) });
    ctx.download(await ctx.zip(files), `${b}-laurel-kit.zip`);
    ctx.toast('Laurel kit downloaded');
  }
  function packList() {
    const K = P.pack, awards = String(K.awards || '').split('\n').map((x) => x.trim()).filter(Boolean);
    return packVariants(ctx, d0(), { statuses: K.statuses, awards, winner: (K.winner || '').trim() });
  }
  async function makePack(say) {
    const vs = packList(); if (!vs.length) { ctx.toast('Pick at least one status or award'); return; }
    const ways = P.pack.ways.length ? P.pack.ways : ['color'], fmts = P.pack.fmts.length ? P.pack.fmts : ['svg', 'png'];
    const t = (k) => d0().fields.filter((f) => f.kind === k && f.show !== false && f.text).map((f) => f.text.trim()).join(' ');
    const fest = t('festival') || 'festival', year = (t('year').match(/\d{4}/) || [''])[0], stem = ctx.slug([year, fest].filter(Boolean).join(' ')) || 'festival', rootDir = stem + '-laurels/';
    const files = [], total = vs.length * ways.length * fmts.length; let n = 0;
    for (const v of vs) for (const w of ways) {
      const dv = colorway(v.doc, w, ctx.clone), r = ctx.render(dv), name = `${rootDir}${v.slug}/${stem}-${v.slug}-${w}`;
      if (fmts.includes('svg')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.svg', data: await ctx.exportSvgText(stripBg(r.svg), { ...dv, out: { ...(dv.out || {}), svgText: 'outlined' } }) }); }
      if (fmts.includes('png')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.png', data: await ctx.toPng(r.svg, r.viewBox, P.pngW, false, dv) }); }
      if (fmts.includes('pdf')) { say(`Making ${++n} of ${total}…`); files.push({ name: name + '.pdf', data: await ctx.toPdf(stripBg(r.svg), dv, v.label, P.pdfMm) }); }
    }
    say('Packing…');
    const r0 = rendered('color'), sm = smallest(r0), vb = r0.viewBox, minPx = isFinite(sm) ? Math.ceil(6 * vb[3] / sm) : 120, minIn = isFinite(sm) ? 6 * vb[2] / (72 * sm) : 1;
    const fonts = [...new Set(Object.values(d0().roles).map((x) => x && x.font).filter(Boolean))];
    const title = [fest, year].filter(Boolean).join(' ');
    files.push({ name: rootDir + 'README.txt', data: [
      `${title}: laurels for selected films`, '', 'Made with Daphne, the free festival laurel maker by pitch.dog: https://pitch.dog/daphne', `Open this set again to edit it: ${ctx.shareLink ? await ctx.shareLink() : location.href}`, '',
      'ONE FOLDER PER LAUREL', ...vs.map((v) => `  ${v.slug}/  ${ctx.altText(v.doc)}`), '',
      'IN EACH FOLDER', ...ways.map((w) => `  -${w}  ${{ color: 'as designed', black: 'one color, black, clear background', white: 'one color, white, clear background' }[w]}`),
      ...fmts.map((f) => `  .${f}  ${{ svg: 'vector, text drawn as shapes (opens anywhere without the fonts)', png: `${P.pngW} px wide, clear background`, pdf: `vector, ${P.pdfMm} mm wide, for print` }[f]}`), '',
      'FONTS', `  ${fonts.join(', ')}. From Google Fonts, under the SIL Open Font License: free to use, commercially too.`, '',
      'Send each film only the laurel for what it received, with GUIDELINES.txt.', '',
    ].join('\n') });
    files.push({ name: rootDir + 'GUIDELINES.txt', data: [
      `LAUREL GUIDELINES: ${title.toUpperCase()}`, '(A template from Daphne. Edit it, add your contact, and send it with the laurels.)', '',
      `Congratulations, and thank you for being part of ${title}. Please use our laurels like this:`, '',
      '1. Use the laurel for what your film received: Official Selection for a selection, the award laurel only for the award it won. A nomination or a finalist place is not a win.',
      '2. Use the files as they are. Please don’t redraw, re-letter or recolor them. The black and white versions are there for backgrounds where the color one doesn’t read.',
      `3. Keep it readable: at least ${minPx} px tall on screen, and at least ${r2(minIn)} in (${Math.round(minIn * 25.4)} mm) wide in print.`,
      '4. Give it room: keep clear space around it of at least a tenth of its width, and don’t crop or overlap it.',
      '5. Alongside other festivals’ laurels, ours can sit at the same size as the rest.',
      '6. Name us as we are written on the laurel, in captions and press releases too.', '',
      'Questions, or need another format? Write to: [your email]', '',
    ].join('\n') });
    ctx.download(await ctx.zip(files), `${stem}-laurels.zip`);
    ctx.toast('Festival pack downloaded');
  }
  function readme(ways, fmts, link) {
    const d = d0(), r = rendered('color'), vb = r.viewBox, sm = smallest(r), alt = ctx.altText(d);
    const minPx = isFinite(sm) ? Math.ceil(6 * vb[3] / sm) : 120, minIn = isFinite(sm) ? 6 * vb[2] / (72 * sm) : 1;
    const fonts = [...new Set(Object.values(d.roles).map((x) => x && x.font).filter(Boolean))];
    const notes = checkLaurel(d);
    const W = { color: 'The laurel as you designed it.', black: 'One color, pure black (#000000), clear background. For light posters, one-ink print and festival programs.', white: 'One color, pure white (#FFFFFF), clear background. For dark posters, trailers and over photos.' };
    const F = { svg: '.svg  Vector. The text is drawn as shapes, so it opens anywhere without the fonts. Best for print and the web.', png: `.png  ${P.pngW} px wide, clear background. For video edits, social posts and slides.`, pdf: `.pdf  Vector, ${P.pdfMm} mm wide. The one to send to printers.` };
    return [
      alt, '', 'Made with Daphne, the free festival laurel maker by pitch.dog: https://pitch.dog/daphne', `Open this laurel again to edit it: ${link}`, '',
      'WHAT’S HERE', ...ways.map((w) => `  ${w}/  ${W[w]}`), '', 'In each folder:', ...fmts.map((f) => '  ' + F[f]),
      ways.includes('color') && d.canvas.bg && fmts.includes('png') ? '  -on-background.png  The same, on your background color.' : null, '',
      'ALT TEXT', `  ${alt}`, '  Paste it wherever the image goes: it’s what screen readers say.', '',
      'SIZES THAT STAY READABLE', `  On screen: at least ${minPx} px tall.`, `  In print: at least ${r2(minIn)} in (${Math.round(minIn * 25.4)} mm) wide, so the smallest words are 6 pt.`, '',
      'FONTS', `  ${fonts.join(', ')}. From Google Fonts, under the SIL Open Font License: free to use, commercially too.`, '',
      notes.length ? 'BEFORE YOU USE IT' : null, ...notes.map((x) => `  - ${x.text}${x.source ? ` (${x.source.url})` : ''}`), notes.length ? '' : null,
      'Some festivals send official laurels and require them. If yours did, use theirs.',
      'This laurel is the filmmaker’s own claim. It isn’t affiliated with or endorsed by any festival.', '',
    ].filter((x) => x !== null).join('\n');
  }

  function show() { drawOpts(); drawPreview(); }
  buildDests();
  show();
  requestAnimationFrame(() => (dests.querySelector('.dest.on') || modal.querySelector('.x')).focus());
  return { close };
}
