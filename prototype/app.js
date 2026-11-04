// app.js — Daphne's editor. Vanilla ES modules, no build step.
// The shell: a rail of tabs (Words first, because the words are the first thing anyone does), a panel, and the stage.
// The engine (engine.mjs) turns one JSON document into the laurel; everything here edits that document.
import { render, DEFAULT_DOC, FORMS, METALS, PROFILES, FAMILIES, FRAMES, FILLABLE_FRAMES, ASSETS, LOGO_SLOTS, merge, clone, applyForm, shuffleBranch, rngOf, assetMissing, sanitizeDoc } from './engine.mjs';
import { FONTS, fontInfo, loadFont, embedFontCss, cssUrl, loadPreviewFonts } from './fonts.js';
import { PRESETS, GROUPS } from './presets.js';
import { LAYOUTS, LAYOUT_GROUPS, layoutFields, applyLayout, EXAMPLE } from './layouts.js';
import { checkLaurel } from './rules.js';
import { outlineSvg, svgToPdf, preloadOutlines } from './outline.js';
import { posterMode } from './poster.js';
import { rowMode } from './row.js';
import { motionMode } from './motion.js';
import { wordsTab } from './words.js';
import { openStudio } from './studio.js';
import { zip } from './zip.js';

// ── measurement: real glyph widths from the browser ──
const mctx = document.createElement('canvas').getContext('2d');
const measure = (s, font, weight, italic, size) => { mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}", sans-serif`; return mctx.measureText(s).width; };

// ── state ──
const KIND_ROLE = { status: 'eyebrow', festival: 'hero', award: 'hero', category: 'sub', location: 'sub', year: 'sub', edition: 'eyebrow', custom: 'sub', icon: 'eyebrow', logo: 'hero' };
const KIND_LABEL = { status: 'Status', festival: 'Festival', award: 'Award', category: 'Section', location: 'Place', year: 'Year', edition: 'Edition', custom: 'Own line', icon: 'Ornament', logo: 'Official logo' };
const KINDS = Object.keys(KIND_ROLE);
const SLOTS = [['inside', 'Inside'], ['above', 'Above'], ['below', 'Below'], ['arc-top', 'Curved, top'], ['arc-bottom', 'Curved, inside base'], ['arc-under', 'Curved, under'], ['ribbon', 'On a ribbon'], ['badge', 'In a medallion']];
const ROLES = [['hero', 'Name size'], ['eyebrow', 'Status size'], ['sub', 'Detail size'], ['big', 'Big numeral']];
let doc = clone(DEFAULT_DOC);
let selected = null, uid = 10;
const undoStack = [], future = [];
const state = { tab: 'words', looksView: 'looks', group: 'All', backdrop: 'dark', smallSizes: false }; // UI state, not part of the laurel
try { Object.assign(state, JSON.parse(localStorage.getItem('daphne.ui') || '{}')); } catch (e) { /* a convenience */ }
const saveUi = () => { try { localStorage.setItem('daphne.ui', JSON.stringify({ tab: state.tab, looksView: state.looksView, group: state.group, backdrop: state.backdrop })); } catch (e) { /* a convenience */ } };

// A preset changes the look. The words keep the layout the user chose, except for the few presets built around a
// layout of their own (ribbon, medallion, big year); leaving one of those returns to the user's layout.
const layoutById = (id) => LAYOUTS.find((L) => L.id === id);
const APP_KEYS = ['row', 'poster', 'motion', 'out']; // the app's own state, kept in the document so links and undo carry it
function applyPreset(p, keepText = true, newId = () => 'f' + ++uid, from = doc, o = {}) {
  let fields = clone(from.fields);
  let d = merge(clone(DEFAULT_DOC), { roles: from.roles });
  if (p.doc.form) d = applyForm(d, p.doc.form);
  d = merge(d, p.doc);
  d.seed = from.seed;
  for (const k of APP_KEYS) if (from[k]) d[k] = clone(from[k]);
  // with auto ink on, the preset's own colors are what comes back when it's turned off
  if (d.poster && d.poster.autoInk) d.poster.saved = { paint: clone(d.paint), text: clone(d.text), roles: Object.fromEntries(Object.entries(d.roles).map(([k, r]) => [k, r && r.paint ? clone(r.paint) : null])) };
  for (const k of Object.keys(d.roles)) if (!(p.doc.roles && p.doc.roles[k] && 'paint' in p.doc.roles[k])) d.roles[k].paint = null;
  if (keepText) {
    const lay = p.layout || (from.layoutBy === 'preset' ? from.userLayoutId || 'year-below' : null);
    if (lay) fields = layoutFields(fields, layoutById(lay), newId, o);
    d.fields = fields;
    d.layoutId = lay || from.layoutId; d.userLayoutId = from.userLayoutId;
    d.layoutBy = p.layout ? 'preset' : from.layoutBy === 'preset' ? (from.userLayoutId ? 'user' : null) : from.layoutBy;
  }
  d.presetName = p.name;
  return d;
}

// ── tiny path helpers ──
const get = (path, o = doc) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function set(path, v, o = doc) { const ks = path.split('.'); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; } a[ks[ks.length - 1]] = v; }
let lastSnap = JSON.stringify(doc);
// one user action is one step of history: a batch (a status with its layout, an email import) records its start once
let batching = 0, batchPushed = false;
function remember() { if (batching && batchPushed) return; undoStack.push(lastSnap); if (undoStack.length > 200) undoStack.shift(); future.length = 0; if (batching) batchPushed = true; historyButtons(); }
function batch(fn) { batching++; try { return fn(); } finally { if (--batching === 0) batchPushed = false; } }
// numbers chosen from a menu are stored as numbers, so history and the renderer agree on them ("-20", not a string)
function normalize(d) {
  const num = (o, k) => { if (o && typeof o[k] === 'string' && o[k] !== 'auto' && /^-?\d+(\.\d+)?$/.test(o[k])) o[k] = +o[k]; };
  num(d.layout, 'dy'); num(d.branch && d.branch.spine, 'gap');
  return d;
}
function historyButtons() { const u = document.getElementById('undo'), r = document.getElementById('redo'); if (u) u.disabled = !undoStack.length; if (r) r.disabled = !future.length; }
function change(path, v, rebuild = false) {
  if (JSON.stringify(get(path)) === JSON.stringify(v)) { if (rebuild) buildPanel(); return; }
  remember(); set(path, v); normalize(doc);
  if (doc.poster && doc.poster.autoInk && /^(paint\.(branch|inner|ornament)|text\.|roles\.\w+\.paint)/.test(path)) { doc.poster.autoInk = false; delete doc.poster.saved; toast('Auto ink is off: you chose a color'); rebuild = true; }
  if (/^(branch|paint|roles|text|canvas|frame|ribbon|form)/.test(path)) delete doc.presetName; // hand-tuned: no longer exactly the preset
  lastSnap = JSON.stringify(doc); schedule(); if (rebuild) buildPanel(); saveHash(); thumbsDirty = true; if (path === 'fields' || /^(row|poster)/.test(path)) saveAssets();
}
function replaceDoc(d, rebuild = true) { remember(); doc = normalize(d); lastSnap = JSON.stringify(doc); schedule(); if (rebuild) buildPanel(); saveHash(); thumbsDirty = true; saveAssets(); refreshMode(); }

// ── logos: official artwork the user uploads. The image lives in ASSETS (and this browser's storage); the field keeps
// only its key and aspect ratio, so undo and share links stay small. A shared link's logo has to be uploaded again.
try { Object.assign(ASSETS, JSON.parse(localStorage.getItem('daphne.assets') || '{}')); } catch (e) { /* storage is a convenience */ }
// Saved images are only ever added to, never swapped for this tab's view: another tab's upload, or a logo that Undo
// can bring back, stays. One that no open laurel has used for 30 days is let go; when storage is full, the oldest
// unused ones go first, and if even the current laurel's images don't fit, the person is told.
const ASSET_KEY = 'daphne.assets', SEEN_KEY = 'daphne.assets.seen', KEEP_MS = 30 * 864e5, sessionRefs = new Set();
const refsOf = (d) => [...(d.fields || []).filter((f) => f.kind === 'logo').map((f) => f.src), d.poster && d.poster.src, ...((d.row && d.row.items) || []).map((it) => it.src)].filter((k) => k && /^asset:/.test(k));
const saveAssets = () => {
  for (const k of refsOf(doc)) sessionRefs.add(k);
  let stored = {}, seen = {};
  try { stored = JSON.parse(localStorage.getItem(ASSET_KEY) || '{}'); seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (e) { /* unreadable: start from this tab's */ }
  const now = Date.now(), out = { ...stored };
  for (const k of Object.keys(out)) if (!(k in seen)) seen[k] = now; // saved before dates were kept: start the clock today
  for (const k of sessionRefs) { seen[k] = now; if (ASSETS[k]) out[k] = ASSETS[k]; }
  for (const k of Object.keys(out)) if (!sessionRefs.has(k) && now - seen[k] > KEEP_MS) { delete out[k]; delete seen[k]; }
  const cur = new Set(refsOf(doc)), spare = Object.keys(out).filter((k) => !cur.has(k)).sort((x, y) => seen[x] - seen[y]);
  for (;;) {
    try { localStorage.setItem(ASSET_KEY, JSON.stringify(out)); localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); return saveState(true, 'images'); }
    catch (e) { if (!spare.length) return saveState(false, cur.size ? 'images' : 'laurel'); const k = spare.shift(); delete out[k]; delete seen[k]; }
  }
};
// whether this browser is keeping the work: quiet when it is, said once and shown in the bar when it isn't
const saveFailed = { laurel: false, images: false };
function saveState(ok, what = 'laurel') {
  const el = document.getElementById('savestate');
  if (ok) { saveFailed[what] = false; if (el && !saveFailed.laurel && !saveFailed.images) el.hidden = true; return true; }
  if (!saveFailed[what]) toast(what === 'images' ? 'This browser has no room to keep your uploaded images: they stay until you close the tab. Keep the files to add them again.' : 'This browser isn’t saving your laurel (storage is full or blocked). Use Share link to keep it.', 6000);
  saveFailed[what] = true; if (el) el.hidden = false;
  return false;
}
async function readLogo(file) {
  if (file.size > 3 * 1024 * 1024) { toast('That file is over 3 MB: export it smaller (an SVG, or a PNG about 1500 px wide)'); return null; }
  const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  let ar = 0;
  if (/svg/.test(file.type)) { // an SVG's shape comes from its viewBox (or width and height); browsers guess 300 × 150 without one
    const t = await file.text(), vb = t.match(/viewBox\s*=\s*["']\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)/i), w = t.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i), hh = t.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
    if (vb && +vb[2]) ar = +vb[1] / +vb[2]; else if (w && hh && +hh[1]) ar = +w[1] / +hh[1];
  }
  if (!ar) ar = await new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1); im.onerror = () => ok(1); im.src = url; });
  return addAsset(url, ar, file.name);
}
function addAsset(url, ar, name) { const key = 'asset:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); ASSETS[key] = url; return { src: key, ar: Math.round(ar * 1000) / 1000, name }; }

// ── render loop ──
let raf = 0, last = null, peeking = null;
const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
async function ensureFonts(d) {
  const need = new Map();
  for (const r of Object.values(d.roles)) { if (!r || !r.font) continue; if (!need.has(r.font)) need.set(r.font, new Set()); need.get(r.font).add(r.weight || 400); }
  await Promise.all([...need].map(([f, ws]) => loadFont(f, [...ws])));
}
let fontsReady = Promise.resolve();
async function draw() {
  raf = 0;
  const pending = ensureFonts(doc); fontsReady = pending;
  // a drawing that came out broken (no size) never replaces the last good one, and says so
  let r; try { r = render(doc, { measure, scale: 2 }); } catch (e) { console.error(e); r = null; }
  if (!r || !r.viewBox.every(Number.isFinite)) { const el = document.getElementById('report'); if (el) el.innerHTML = '<span class="warn">These settings don’t draw a laurel: Undo, or change the last setting.</span>'; return; }
  last = r;
  if (!peeking) MODES[mode].draw(last);
  showReport(last.report);
  if (mode !== 'row') showNotes(checkLaurel(doc));
  pending.then(() => { if (fontsReady === pending) { const r2 = render(doc, { measure, scale: 2 }); if (r2.svg !== last.svg) { last = r2; if (!peeking) MODES[mode].draw(last); showReport(last.report); } } });
  if (thumbsDirty) { thumbsDirty = false; clearTimeout(thumbTimer); thumbTimer = setTimeout(drawThumbs, 350); }
  if (state.smallSizes && mode === 'laurel') drawSmallSizes();
}
const stage = document.getElementById('stage');
const mainEl = document.getElementById('main');
function showReport(r) {
  const el = document.getElementById('report');
  if (mode === 'row' || mode === 'motion' || mode === 'poster') { el.innerHTML = ''; return; }
  const tight = r.lines.filter((l) => l.margin < -0.5).length; // margin 0 still keeps the full air gap (padOf), so only a line inside that gap is snug
  el.innerHTML = [
    r.wrapped ? `<span>Wrapped ${r.wrapped} line${r.wrapped > 1 ? 's' : ''} for size</span>` : '',
    r.widened ? `<span>Widened the wreath to fit the name</span>` : '',
    tight ? `<span>Snug: ${tight} line${tight > 1 ? 's' : ''} close to the leaves</span>` : '<span class="ok">✓ Every line clears the leaves</span>',
    ...r.warnings.map((w) => `<span class="warn">${w}</span>`),
  ].filter(Boolean).join('');
}

// festival rules and honest-claim notes: gentle, never blocking
function showNotes(list) {
  const el = document.getElementById('notes');
  el.classList.toggle('on', !!list.length);
  el.innerHTML = '';
  for (const n of list) el.append(h('div', { class: 'note ' + n.level }, h('span', {}, n.level === 'rule' && !n.check ? h('b', {}, 'Festival rule. ') : null, n.text, ' ', n.source ? h('a', { href: n.source.url, target: '_blank', rel: 'noopener', title: n.source.label }, 'Source') : null, n.fix && ctx.fixNote ? h('button', { class: 'btn small', onclick: () => ctx.fixNote(n.fix) }, 'Fix') : null)));
}

// drag a line to nudge it (stored as dx/dy on its field); double-click resets
function decorateStage() {
  const svg = stage.querySelector('svg'); if (!svg) return;
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', altText(doc));
  svg.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-ids]'); if (!t || !t.dataset.ids) return;
    const ids = t.dataset.ids.split(' '), f0 = doc.fields.find((f) => f.id === ids[0]); if (!f0) return;
    selectField(f0.id);
    const m = svg.getScreenCTM().inverse(), p0 = new DOMPoint(e.clientX, e.clientY).matrixTransform(m), base = { dx: f0.dx || 0, dy: f0.dy || 0 };
    let moved = false;
    const move = (ev) => { const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m); if (!moved) { if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 3) return; moved = true; remember(); } f0.dx = Math.round((base.dx + p.x - p0.x) * 10) / 10; f0.dy = Math.round((base.dy + p.y - p0.y) * 10) / 10; schedule(); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (!moved) return; lastSnap = JSON.stringify(doc); saveHash(); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
  svg.addEventListener('dblclick', (e) => { const t = e.target.closest('[data-ids]'); if (!t || !t.dataset.ids) return; const f0 = doc.fields.find((f) => f.id === t.dataset.ids.split(' ')[0]); if (f0 && (f0.dx || f0.dy)) { remember(); f0.dx = 0; f0.dy = 0; lastSnap = JSON.stringify(doc); schedule(); saveHash(); } });
}
function selectField(id) {
  selected = id;
  if (state.tab !== 'words') return;
  state.everyOpen = true;
  const det = document.querySelector('#fields')?.closest('details'); if (det && !det.open) det.open = true;
  document.querySelectorAll('.field').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  const el = document.querySelector(`.field[data-id="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// the claim in words, for alt text, SVG titles and file metadata: "Winner, Best Documentary, Northlight Film Festival 2026"
function altText(d = doc) {
  const vis = d.fields.filter((f) => f.show !== false && f.text && f.kind !== 'icon' && f.kind !== 'logo');
  const by = (k) => vis.filter((f) => f.kind === k).map((f) => f.text.trim()).filter(Boolean);
  const parts = [...by('status'), ...by('award'), ...by('category'), [...by('festival'), ...by('edition')].join(' '), [...by('location'), ...by('year')].join(' '), ...by('custom')].filter((s) => s && s.trim());
  const logo = d.fields.some((f) => f.kind === 'logo' && f.show !== false && f.src && !assetMissing(f.src)); // only a logo that's drawn
  return (parts.join(', ') || 'Festival laurel') + (logo ? ' (with the festival’s logo)' : '') + '.';
}

// ── UI builders ──
const h = (tag, attrs = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v); } for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); return el; };
const fmt = (v, step) => (step >= 1 ? Math.round(v) : (+v).toFixed(step >= 0.1 ? 1 : 2));
const fill = (inp) => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min)) * 100 + '%');
function range(label, path, min, max, step = 1, o = {}) {
  const v = get(path) ?? o.def ?? min, out = h('output', {}, fmt(v, step));
  const inp = h('input', { type: 'range', min, max, step, value: v, 'aria-label': label, oninput: (e) => { out.textContent = fmt(e.target.value, step); fill(e.target); change(path, +e.target.value); } });
  fill(inp);
  return h('div', { class: 'row' }, h('label', { title: o.tip || label }, label), inp, out);
}
function select(label, path, options, o = {}) {
  const v = get(path);
  const s = h('select', { 'aria-label': label, onchange: (e) => { const val = e.target.value; change(path, o.num ? +val : val === 'null' ? null : val === 'true' ? true : val === 'false' ? false : /^-?\d+(\.\d+)?$/.test(val) && o.numeric ? +val : val, o.rebuild); } }, options.map(([val, lab]) => h('option', { value: String(val), selected: String(val) === String(v) }, lab)));
  return h('div', { class: 'row wide' }, h('label', { title: o.tip || label }, label), s);
}
const sw = (label, checked, onchange, tip, name) => h('label', { class: 'switch', title: tip || '' }, h('input', { type: 'checkbox', role: 'switch', checked: !!checked, onchange, ...(name ? { 'aria-label': name } : {}) }), label);
function toggle(label, path, o = {}) { return h('div', { class: 'row wide' }, h('label', { title: o.tip || label }, label), h('div', {}, sw('', get(path), (e) => change(path, e.target.checked ? (o.on ?? true) : (o.off ?? false), o.rebuild), '', label))); }
function color(label, path) { const v = get(path); const c = h('input', { type: 'color', 'aria-label': label, value: typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff', oninput: (e) => change(path, e.target.value) }); return h('div', { class: 'row wide' }, h('label', {}, label), h('div', {}, c)); }
const opt = (arr) => arr.map((x) => (Array.isArray(x) ? x : [x, x[0].toUpperCase() + x.slice(1)]));
const segctl = (opts, cur, on) => h('div', { class: 'segctl', role: 'tablist' }, opts.map(([v, l]) => h('button', { class: v === cur ? 'on' : '', role: 'tab', 'aria-selected': String(v === cur), onclick: () => on(v) }, l)));
const fold = (title, note, open, ...kids) => { const key = 'fold:' + title; const d = h('details', { class: 'fold', open: state[key] ?? open }, h('summary', {}, h('span', {}, title, note ? h('small', {}, note) : null)), h('div', { class: 'body' }, ...kids)); d.addEventListener('toggle', () => (state[key] = d.open)); return d; };

// a paint's look in one swatch (for labels and palettes)
const paintCss = (p) => { if (!p) return 'transparent'; if (typeof p === 'string') return p; if (p.type === 'solid') return p.color; if (p.type === 'metal') { const m = METALS[p.metal] || METALS.gold; return `linear-gradient(135deg, ${m.map((s) => s[1]).join(', ')})`; } return `linear-gradient(90deg, ${p.stops.map((s) => `${s[1]} ${s[0] * 100}%`).join(', ')})`; };

// a paint: none / solid / linear / radial / metal, applied to the whole thing or per leaf
function paintEditor(label, path, o = {}) {
  const box = h('div', { class: 'paint' });
  const redraw = () => {
    box.innerHTML = '';
    let p = get(path);
    const typeOf = p == null ? 'none' : typeof p === 'string' ? 'solid' : p.type;
    const types = [...(o.nullable ? [['none', o.noneLabel || 'None']] : []), ['solid', 'Solid'], ['linear', 'Gradient'], ['radial', 'Radial'], ['metal', 'Metal']];
    const sel = h('select', { 'aria-label': label + ' paint', onchange: (e) => {
      const t = e.target.value, base = typeof p === 'string' ? p : p && p.type === 'solid' ? p.color : '#e3c27a';
      const next = t === 'none' ? null : t === 'solid' ? base : t === 'metal' ? { type: 'metal', metal: 'gold', angle: 28, scope: o.leaf ? 'leaf' : 'whole' } : { type: t, angle: 0, scope: 'whole', stops: p && p.stops ? p.stops : [[0, '#6e4f1c'], [1, '#f4e3a8']] };
      change(path, next); redraw();
    } }, types.map(([v, l]) => h('option', { value: v, selected: v === typeOf }, l)));
    box.append(h('div', { class: 'head' }, h('span', { class: 'sw', style: `background:${paintCss(p)}` }), h('span', { class: 'lbl' }, label), sel));
    if (typeOf === 'solid') { const c = typeof p === 'string' ? p : p.color; box.append(h('div', { class: 'head' }, h('input', { type: 'color', 'aria-label': label + ' color', value: /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff', oninput: (e) => { change(path, e.target.value); box.querySelector('.sw').style.background = e.target.value; } }), h('input', { type: 'text', value: c, 'aria-label': label + ' hex', onchange: (e) => { change(path, e.target.value); redraw(); } }))); }
    if (typeOf === 'linear' || typeOf === 'radial') {
      const stops = h('div', { class: 'stops' });
      p.stops.forEach((st, i) => stops.append(h('div', { class: 'stop' },
        h('input', { type: 'color', value: st[1], 'aria-label': `Stop ${i + 1} color`, oninput: (e) => { const s2 = clone(get(path).stops); s2[i][1] = e.target.value; change(path + '.stops', s2); } }),
        h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: st[0], 'aria-label': `Stop ${i + 1} position`, oninput: (e) => { fill(e.target); const s2 = clone(get(path).stops); s2[i][0] = +e.target.value; change(path + '.stops', s2); } }),
        h('button', { class: 'btn small', title: 'Remove stop', 'aria-label': 'Remove stop', onclick: () => { const s2 = clone(get(path).stops); if (s2.length > 2) { s2.splice(i, 1); change(path + '.stops', s2); redraw(); } } }, '×'))));
      stops.querySelectorAll('input[type=range]').forEach(fill);
      box.append(stops, h('button', { class: 'btn small', onclick: () => { const s2 = clone(get(path).stops); s2.push([1, s2[s2.length - 1][1]]); s2.sort((a, b) => a[0] - b[0]); change(path + '.stops', s2); redraw(); } }, '+ stop'));
    }
    if (typeOf === 'metal') box.append(h('div', { class: 'head' }, h('span', { class: 'lbl', style: 'font-weight:500;color:var(--mute)' }, 'Metal'), h('select', { style: 'width:auto', onchange: (e) => { change(path + '.metal', e.target.value); redraw(); } }, Object.keys(METALS).map((m) => h('option', { value: m, selected: m === p.metal }, m[0].toUpperCase() + m.slice(1))))));
    if (typeOf === 'linear' || typeOf === 'metal') box.append(range('Angle', path + '.angle', 0, 360, 1));
    if (typeOf === 'radial') box.append(range('Center x', path + '.cx', 0, 1, 0.01, { def: 0.5 }), range('Center y', path + '.cy', 0, 1, 0.01, { def: 0.5 }), range('Radius', path + '.r', 0.1, 1.5, 0.01, { def: 0.6 }));
    if (typeOf !== 'none' && typeOf !== 'solid' && o.leaf !== false) box.append(select('Applies to', path + '.scope', [['whole', 'Whole wreath'], ['leaf', 'Each leaf (foil)']]));
  };
  redraw();
  return box;
}

// a font picker that shows every font in its own face (only the letters of its name are fetched for the preview)
let fontPop = null;
function closeFontPop() { if (fontPop) { fontPop.remove(); fontPop = null; } }
function fontPicker(path) {
  const v = get(path), info = fontInfo(v);
  const btn = h('button', { class: 'fontbtn', type: 'button', 'aria-haspopup': 'listbox', style: `font-family:"pv ${v}","${v}",serif`, onclick: (e) => { e.stopPropagation(); openFontPop(btn, path); } }, h('span', {}, v), h('small', {}, info ? info.c : 'Google font'));
  return btn;
}
function openFontPop(anchor, path) {
  closeFontPop();
  loadPreviewFonts(FONTS.map((x) => x.f));
  const cur = get(path), cats = [...new Set(FONTS.map((x) => x.c))];
  const listEl = h('div', { class: 'flist', role: 'listbox' });
  const fill2 = (q = '') => {
    listEl.innerHTML = '';
    const qq = q.trim().toLowerCase();
    for (const c of cats) {
      const fs = FONTS.filter((x) => x.c === c && (!qq || x.f.toLowerCase().includes(qq)));
      if (!fs.length) continue;
      listEl.append(h('div', { class: 'fcat' }, c));
      for (const x of fs) listEl.append(h('button', { class: 'fopt' + (x.f === cur ? ' on' : ''), role: 'option', style: `font-family:"pv ${x.f}","${x.f}",serif`, onclick: () => { closeFontPop(); change(path, x.f, true); } }, x.f, h('small', {}, x.v ? 'variable' : x.w.length > 1 ? `${x.w.length} weights` : '')));
    }
    if (qq && !FONTS.some((x) => x.f.toLowerCase() === qq)) listEl.append(h('div', { class: 'fcat' }, 'Any Google font'), h('button', { class: 'fopt', onclick: () => { closeFontPop(); change(path, q.trim().replace(/\b\w/g, (m) => m.toUpperCase()), true); } }, `Use “${q.trim()}”`, h('small', {}, 'from Google Fonts')));
  };
  const search = h('input', { type: 'search', placeholder: 'Search fonts, or name any Google font', 'aria-label': 'Search fonts', oninput: (e) => fill2(e.target.value), onkeydown: (e) => { if (e.key === 'Escape') closeFontPop(); } });
  fontPop = h('div', { class: 'fontpop', onclick: (e) => e.stopPropagation() }, h('div', { class: 'fhead' }, search, h('div', { class: 'hint' }, 'All open-license fonts: free to use in anything you make.')), listEl);
  document.body.append(fontPop);
  const r = anchor.getBoundingClientRect(), H = Math.min(520, innerHeight * 0.7);
  fontPop.style.left = Math.min(innerWidth - 340, r.left) + 'px';
  fontPop.style.top = Math.max(10, Math.min(innerHeight - H - 10, r.bottom + 6)) + 'px';
  fill2(); search.focus();
  const on = listEl.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
}
document.addEventListener('click', closeFontPop);

function roleEditor(key, label, note) {
  const r = get('roles.' + key), info = fontInfo(r.font) || { w: [400, 900], v: 1 };
  const ws = info.v ? null : info.w, wmin = info.w[0], wmax = info.w[info.w.length - 1];
  return h('div', { class: 'role' },
    h('b', {}, label, note ? h('small', {}, note) : null),
    fontPicker('roles.' + key + '.font'),
    ws && ws.length === 1 ? null : ws ? select('Weight', 'roles.' + key + '.weight', ws.map((w) => [w, String(w)]), { num: true }) : range('Weight', 'roles.' + key + '.weight', wmin, wmax, 50),
    info.it ? toggle('Italic', 'roles.' + key + '.italic') : null,
    select('Case', 'roles.' + key + '.case', [['upper', 'UPPERCASE'], ['asis', 'As typed'], ['title', 'Title Case'], ['lower', 'lowercase']]),
    range('Letter spacing', 'roles.' + key + '.track', -0.05, 0.6, 0.01),
    range(key === 'hero' ? 'Size' : 'Size vs name', 'roles.' + key + '.ratio', key === 'hero' ? 0.5 : 0.15, key === 'big' ? 2.4 : 1.2, 0.01),
    paintEditor('Color', 'roles.' + key + '.paint', { nullable: true, noneLabel: 'Default', leaf: false }));
}

// ── fields: every line of the laurel ──
// the medallion takes several lines, joined; its option says who is already in it
const sharedBadge = (f) => { const o = doc.fields.filter((x) => x.id !== f.id && x.slot === 'badge' && x.show !== false && (x.text || x.kind === 'icon')).map((x) => (x.kind === 'icon' ? 'the star' : x.text)); return o.length ? ` (with ${o.join(', ')})` : ''; };
function addField(k) {
  const fs = clone(doc.fields);
  const f = { id: 'f' + ++uid, kind: k, text: k === 'logo' ? '' : k === 'icon' ? 'star' : k === 'year' ? String(new Date().getFullYear()) : '', role: KIND_ROLE[k], slot: 'inside', show: true };
  if (k !== 'logo' && k !== 'icon' && k !== 'year') f.added = true; // arrives empty: the example is only a placeholder
  fs.push(f); selected = f.id; state.everyOpen = true;
  change('fields', fs, true);
  setTimeout(() => { const el = document.querySelector(`.field[data-id="${f.id}"] input[type=text]`); if (el) { el.focus(); el.select(); } }, 30);
}
// the line being dragged to a new place: set only by a line's own drag, so text dropped from anywhere never moves one
let lineDrag = null;
function fieldRow(f, i) {
  const el = h('div', { class: 'field' + (selected === f.id ? ' sel' : '') + (f.show === false ? ' off' : ''), 'data-id': f.id, draggable: 'true' });
  el.addEventListener('dragstart', (e) => { if (e.target !== el) return; lineDrag = f.id; e.dataTransfer.setData('application/x-daphne-line', f.id); e.dataTransfer.effectAllowed = 'move'; el.style.opacity = 0.5; });
  el.addEventListener('dragend', () => { lineDrag = null; el.style.opacity = 1; });
  el.addEventListener('dragover', (e) => { if (!lineDrag) return; e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    el.classList.remove('drag-over'); if (!lineDrag) return; e.preventDefault();
    const from = doc.fields.findIndex((x) => x.id === lineDrag), to = doc.fields.findIndex((x) => x.id === f.id); lineDrag = null;
    if (from < 0 || to < 0 || from === to) return;
    const fs = clone(doc.fields); const [m] = fs.splice(from, 1); fs.splice(to, 0, m); change('fields', fs, true);
  });
  const upd = (k, v, rebuild = false) => { const fs = clone(doc.fields); fs[i][k] = v; if (k === 'text') { delete fs[i].added; if (fs[i].kind === 'festival') delete fs[i].fid; } if (k === 'kind' && v === 'logo' && !LOGO_SLOTS.includes(fs[i].slot || 'inside')) fs[i].slot = 'inside'; change('fields', fs, rebuild); };
  const logoInput = () => {
    const file = h('input', { type: 'file', accept: 'image/svg+xml,image/png,image/webp,image/jpeg', style: 'display:none', onchange: async (e) => { const fl = e.target.files[0]; const a = fl && (await readLogo(fl)); if (a) { const fs = clone(doc.fields); Object.assign(fs[i], a); delete fs[i].added; change('fields', fs, true); } } });
    const has = !!(f.src && ASSETS[f.src]);
    return h('div', { class: 'logo-in' }, file,
      h('button', { class: 'btn small', onclick: () => file.click() }, has ? 'Replace logo' : 'Upload logo'),
      h('button', { class: 'btn small', title: 'A festival file on white or black? Make it transparent and recolor it first', onclick: () => ctx.openFixer && ctx.openFixer((a) => { const fs = clone(doc.fields); Object.assign(fs[i], a); delete fs[i].added; change('fields', fs, true); }) }, 'Clean up a file…'),
      h('span', { class: 'logo-name' }, has ? f.name || 'Logo' : f.src ? 'Upload it again: logos stay on the device they were added on' : 'The festival’s official artwork, SVG or PNG'),
      h('label', { title: 'Color the logo with this line’s paint (best for one-color artwork). Many festivals ask for their artwork unchanged: check their rules first.' }, h('input', { type: 'checkbox', checked: !!f.tint, onchange: (e) => upd('tint', e.target.checked) }), ' tint'));
  };
  const textInput = f.kind === 'logo' ? logoInput() : f.kind === 'icon'
    ? h('select', { 'aria-label': 'Ornament', onchange: (e) => upd('text', e.target.value) }, [['star', '★ Star'], ['stars', '★★★ Three stars'], ['crown', '♛ Crown'], ['dot', '• Dot'], ['diamond', '◆ Diamond'], ['rule', '— Rule']].map(([x, l]) => h('option', { value: x, selected: x === f.text }, l)))
    : h('input', { type: 'text', class: f.added && f.text ? 'example' : '', title: f.added && f.text ? 'Example text: type over it' : '', value: f.text, placeholder: f.added && EXAMPLE[f.kind] && f.kind !== 'icon' ? 'e.g. ' + EXAMPLE[f.kind] : KIND_LABEL[f.kind], 'aria-label': KIND_LABEL[f.kind] + ' text', oninput: (e) => { e.target.classList.remove('example'); upd('text', e.target.value); }, onfocus: (e) => { if (f.added) e.target.select(); } });
  el.append(
    h('div', { class: 'handle', title: 'Drag to reorder' }, '⋮⋮'),
    h('div', {},
      textInput,
      h('div', { class: 'meta' },
        h('select', { title: 'What it is', 'aria-label': 'What it is', onchange: (e) => upd('kind', e.target.value, true) }, KINDS.map((k) => h('option', { value: k, selected: k === f.kind }, KIND_LABEL[k]))),
        h('select', { title: 'How big', 'aria-label': 'Size', onchange: (e) => upd('role', e.target.value) }, ROLES.map(([k, l]) => h('option', { value: k, selected: k === f.role }, l))),
        h('select', { title: 'Where it sits', 'aria-label': 'Where it sits', onchange: (e) => upd('slot', e.target.value) }, (f.kind === 'logo' ? SLOTS.filter(([k]) => LOGO_SLOTS.includes(k)) : SLOTS).map(([k, l]) => h('option', { value: k, selected: k === (f.slot || 'inside') }, k === 'badge' ? l + sharedBadge(f) : l)))),
      h('div', { class: 'flags' },
        h('label', {}, h('input', { type: 'checkbox', checked: f.show !== false, onchange: (e) => upd('show', e.target.checked, true) }), 'Show'),
        f.kind === 'logo' ? null : h('label', { title: 'Join onto the line above (e.g. TRIBECA 2026)' }, h('input', { type: 'checkbox', checked: !!f.join, onchange: (e) => upd('join', e.target.checked) }), 'Join line above'),
        f.dx || f.dy ? h('button', { class: 'btn small', onclick: () => { const fs = clone(doc.fields); fs[i].dx = 0; fs[i].dy = 0; change('fields', fs, true); } }, 'Reset nudge') : null)),
    h('div', { class: 'tools' },
      h('button', { class: 'btn small', title: 'Move up', 'aria-label': 'Move up', onclick: (e) => { e.stopPropagation(); if (!i) return; const fs = clone(doc.fields); [fs[i - 1], fs[i]] = [fs[i], fs[i - 1]]; change('fields', fs, true); } }, '↑'),
      h('button', { class: 'btn small', title: 'Remove', 'aria-label': 'Remove line', onclick: (e) => { e.stopPropagation(); const fs = clone(doc.fields); fs.splice(i, 1); change('fields', fs, true); } }, '×')));
  el.addEventListener('click', () => selectField(f.id));
  return el;
}

// ── the rail and the tabs ──
const ICON = {
  words: '<path d="M4 7V5h11v2"/><path d="M9.5 5v14"/><path d="M7 19h5"/><path d="M14 12h6M14 16h6M14 20h4"/>',
  looks: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><path d="M17 13.5v7M13.5 17h7"/>',
  wreath: '<path d="M8 21C3.5 17 2.5 10 5 4"/><path d="M16 21c4.5-4 5.5-11 3-17"/><path d="M5.2 15.5c-2-.2-3-1.4-3.2-3 2 .1 3 1.3 3.2 3Z"/><path d="M4.4 10c-1.8-.6-2.5-2-2.4-3.6 1.8.6 2.6 2 2.4 3.6Z"/><path d="M18.8 15.5c2-.2 3-1.4 3.2-3-2 .1-3 1.3-3.2 3Z"/><path d="M19.6 10c1.8-.6 2.5-2 2.4-3.6-1.8.6-2.6 2-2.4 3.6Z"/>',
  type: '<path d="M5 20 11 4h2l6 16"/><path d="M7.5 14h9"/>',
  color: '<path d="M12 3.5c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 2.5-6.3 6-10.5Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  canvas: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 5.5v-2M16 5.5v-2"/>',
  about: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.6v.4"/>',
};
const TABS = [['words', 'Words'], ['looks', 'Looks'], ['wreath', 'Wreath'], ['type', 'Type'], ['color', 'Color'], ['canvas', 'Canvas']];
// remembered UI state from an older version can name a tab or group that's since been renamed
if (state.tab === 'colour') state.tab = 'color';
if (![...TABS.map((t) => t[0]), 'about'].includes(state.tab)) state.tab = 'words';
if (state.group !== 'All' && !GROUPS.includes(state.group)) state.group = 'All';
const railEl = document.getElementById('rail');
function buildRail() {
  railEl.innerHTML = '';
  const btn = ([k, l], cls = '') => { const b = h('button', { class: (state.tab === k ? 'on ' : '') + cls, role: 'tab', 'aria-selected': String(state.tab === k), title: l, onclick: () => setTab(k) }); b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`; b.append(h('span', {}, l)); return b; };
  railEl.append(...TABS.map((t) => btn(t)), h('div', { class: 'grow' }), btn(['about', 'About'], 'about'));
}
function setTab(k) { state.tab = k; saveUi(); buildRail(); buildPanel(); document.getElementById('panel').scrollTop = 0; }

const sectionsEl = document.getElementById('sections');
let thumbsDirty = true, thumbTimer = 0;
const head = (title, sub, ...actions) => h('div', { class: 'tabhead' }, h('h2', {}, title), sub ? h('p', {}, sub) : null, actions.length ? h('div', { class: 'actions' }, ...actions) : null);
const ui = {
  get doc() { return doc; }, state, h, clone, change, replaceDoc, batch, schedule, toast, layoutById, applyLayout, LAYOUTS, fieldRow, addField, selectField,
  newId: () => 'f' + ++uid, rebuild: () => buildPanel(),
  openFixer: (cb, o) => ctx.openFixer && ctx.openFixer(cb, o),
  addLogo: (a) => { const fs = clone(doc.fields); fs.push({ id: 'f' + ++uid, kind: 'logo', text: '', role: 'hero', slot: 'inside', show: true, ...a }); change('fields', fs, true); },
};
// the first visit: what this is, in two lines, until it's closed or something is made
let seen = false; try { seen = !!localStorage.getItem('daphne.seen'); } catch (e) { /* a convenience */ }
const markSeen = () => { if (seen) return; seen = true; try { localStorage.setItem('daphne.seen', '1'); } catch (e) { /* a convenience */ } };
// a phrase held between the logo's two leaves, the way the identity honors one thing per screen
const held = (t) => h('span', { class: 'held' }, h('i', { class: 'leafb', 'aria-hidden': 'true' }), t, h('i', { class: 'leafb r', 'aria-hidden': 'true' }));
function intro() {
  if (seen) return null;
  return h('div', { class: 'intro' }, h('h3', {}, held('Your film'), ' did the hard part. Now make the laurel.'),
    h('p', {}, 'Paste the festival’s email or type what it gave you, pick a look, then Export for your poster, trailer and socials. Free, with no account and no watermark. ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); setTab('about'); setTimeout(() => document.getElementById('guide')?.scrollIntoView({ block: 'start' }), 50); } }, 'New to laurels? Six things to know.')),
    h('button', { class: 'btn ghost small x', 'aria-label': 'Close the introduction', onclick: () => { markSeen(); buildPanel(); } }, '✕'));
}
function buildPanel() {
  const scroll = document.getElementById('panel').scrollTop;
  sectionsEl.innerHTML = '';
  const T = state.tab;
  if (T === 'words') sectionsEl.append(...[intro()].filter(Boolean), head('Your words', 'What the festival gave your film, exactly as it gave it.'), wordsTab(ui));
  else if (T === 'looks') sectionsEl.append(...looksTab());
  else if (T === 'wreath') sectionsEl.append(...wreathTab());
  else if (T === 'type') sectionsEl.append(head('Type', 'Five roles, each with its own font. Every font here is open-license.'), h('div', { class: 'pane' }, roleEditor('hero', 'The name', 'festival or award'), roleEditor('eyebrow', 'Status line', 'Official Selection'), roleEditor('sub', 'Details', 'year, place, section'), roleEditor('big', 'Big numeral', 'a hero year or edition'), roleEditor('arc', 'Curved and ribbon text', 'seals, ribbons, medallions')));
  else if (T === 'color') sectionsEl.append(...colorTab());
  else if (T === 'canvas') sectionsEl.append(...canvasTab());
  else if (T === 'about') sectionsEl.append(...aboutTab());
  // the wrapper selects coerce numbers for dy/gap
  document.getElementById('panel').scrollTop = scroll;
  thumbsDirty = true; schedule();
}

// ── Looks: presets and layouts, previewed on the stage as you hover ──
function looksTab() {
  const shuffles = [h('button', { class: 'btn primary small', title: 'A new look from curated pools. Keeps your words.', onclick: () => shuffle('all') }, '✦ Surprise me'), h('button', { class: 'btn small', onclick: () => shuffle('wreath') }, 'Wreath'), h('button', { class: 'btn small', onclick: () => shuffle('color') }, 'Color'), h('button', { class: 'btn small', onclick: () => shuffle('type') }, 'Type')];
  const top = head('Looks', 'Hover to preview on the stage, click to use. Your words stay.', ...shuffles);
  const view = segctl([['looks', `Looks · ${PRESETS.length}`], ['layouts', `Layouts · ${LAYOUTS.length}`]], state.looksView, (v) => { state.looksView = v; saveUi(); buildPanel(); });
  const pane = h('div', { class: 'pane' }, view);
  if (state.looksView === 'looks') {
    const groups = ['All', ...GROUPS];
    pane.append(h('div', { class: 'filter' }, groups.map((g) => h('button', { class: 'chip' + (state.group === g ? ' on' : ''), onclick: () => { state.group = g; saveUi(); buildPanel(); } }, g))));
    const list = PRESETS.filter((p) => state.group === 'All' || p.group === state.group);
    const tile = (p) => h('button', { class: 'preset' + (doc.presetName === p.name ? ' on' : ''), title: p.name, onclick: () => { endPeek(); replaceDoc(applyPreset(p)); if (!askFor(p, 'look')) toast(`${p.name}: your words kept`); }, onpointerenter: (e) => { if (e.pointerType === 'mouse') peek(() => applyPreset(p, true, tmpId)); }, onpointerleave: endPeek, onfocus: (e) => { if (e.target.matches(':focus-visible')) peek(() => applyPreset(p, true, tmpId)); }, onblur: endPeek },
      h('div', { class: 'thumb', 'data-i': PRESETS.indexOf(p) }), h('span', {}, p.name));
    if (state.group === 'All') for (const g of GROUPS) { const ps = list.filter((p) => p.group === g); pane.append(h('div', { class: 'label' }, g, h('span', { class: 'opt' }, String(ps.length)), h('span', { class: 'grow' })), h('div', { class: 'presets', id: 'presets-' + GROUPS.indexOf(g) }, ps.map(tile))); }
    else pane.append(h('div', { class: 'presets' }, list.map(tile)));
  } else {
    // the layout lit up is the one the words are actually in (so hand edits that land on a layout light it too)
    const sig = (x) => `${x.role || 'eyebrow'}:${x.slot || 'inside'}:${x.join ? 1 : 0}`, vis = doc.fields.filter((f) => f.show !== false && (f.text || f.added || f.kind === 'icon' || (f.kind === 'logo' && f.src)));
    const fits = (ln, f) => ln.kind.split('|').includes(f.kind) || (f.kind === 'logo' && ln.role === 'hero');
    const shown = (L) => (L.lines.some((ln) => ln.kind === 'status') ? vis : vis.filter((f) => !(f.kind === 'status' && f.role === 'eyebrow')));
    const activeId = (LAYOUTS.find((L) => { const v = shown(L); return L.lines.length === v.length && L.lines.every((ln, i) => fits(ln, v[i]) && sig(ln) === sig(v[i])); }) || {}).id;
    const apply = (L, d = doc, idf = () => 'f' + ++uid) => ({ ...applyLayout(d, L, idf), layoutBy: 'user', userLayoutId: L.id });
    const tile = (L) => h('button', { class: 'preset' + (activeId === L.id ? ' on' : ''), title: L.note, onclick: () => { endPeek(); replaceDoc(apply(L)); askFor(L); }, onpointerenter: (e) => { if (e.pointerType === 'mouse') peek(() => apply(L, clone(doc), tmpId)); }, onpointerleave: endPeek, onfocus: (e) => { if (e.target.matches(':focus-visible')) peek(() => apply(L, clone(doc), tmpId)); }, onblur: endPeek },
      h('div', { class: 'thumb', 'data-l': LAYOUTS.indexOf(L) }), h('span', {}, L.name), h('small', {}, L.note));
    pane.append(h('div', { class: 'hint' }, 'Layouts move your words and keep the look. Lines a layout leaves out are hidden, not deleted; new lines arrive empty, for you to fill in.'));
    for (const g of LAYOUT_GROUPS) pane.append(h('div', { class: 'label' }, g, h('span', { class: 'grow' })), h('div', { class: 'presets' }, LAYOUTS.filter((L) => L.group === g).map(tile)));
  }
  return [top, pane];
}
let tmpK = 0; const tmpId = () => 'tmp' + tmpK++;
// a layout that adds a line asks for its words, rather than writing a fact the film may not have
function askFor(L, what = 'layout') {
  const need = [...new Set(doc.fields.filter((f) => f.added && !f.text && f.show !== false && f.kind !== 'icon').map((f) => KIND_LABEL[f.kind].toLowerCase()))];
  if (need.length) toast(`The ${L.name} ${what} has a line for the ${need.join(' and the ')}: type ${need.length > 1 ? 'them' : 'it'} on the Words tab.`, 4200);
  return need.length > 0;
}
// preview a look on the stage without changing anything
let peekTimer = 0;
function peek(make) {
  if (mode !== 'laurel') return;
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    const d = make(); peeking = d;
    const r = render(d, { measure, scale: 2 });
    stage.innerHTML = r.svg; stage.classList.add('previewing');
    stage.append(h('div', { class: 'peek' }, 'Preview · click to use'));
    ensureFonts(d).then(() => { if (peeking === d) { stage.innerHTML = render(d, { measure, scale: 2 }).svg; stage.append(h('div', { class: 'peek' }, 'Preview · click to use')); } });
  }, 70);
}
function endPeek() { clearTimeout(peekTimer); if (!peeking) return; peeking = null; stage.classList.remove('previewing'); if (last) MODES[mode].draw(last); }

// ── Wreath ──
function wreathTab() {
  const L = 'layout.', B = 'branch.', LF = 'branch.leaf.', SP = 'branch.spine.', OR = 'branch.orn.';
  const family = get(LF + 'family');
  const FORM_LABEL = { open: 'Open', wreath: 'Closed', single: 'Single', crown: 'Crown', swoop: 'Swoop', flank: 'Flank', text: 'No branches' };
  const forms = h('div', { class: 'chips' }, Object.keys(FORMS).map((k) => h('button', { class: 'chip' + (doc.form === k ? ' on' : ''), onclick: () => replaceDoc(applyForm(doc, k)) }, FORM_LABEL[k])));
  const top = head('Wreath', doc.form === 'text' ? 'No branches: type and a frame, the way most top-tier festivals look now.' : 'Every part of the branch, from the arc to each leaf.');
  const pane = h('div', { class: 'pane' }, h('div', { class: 'group' }, h('div', { class: 'label' }, 'Form', h('span', { class: 'grow' })), forms));
  if (doc.form === 'text') {
    const FK = get('frame.kind') || 'none', fixed = ['ring', 'oval', 'scallop'].includes(FK);
    pane.append(
      h('div', { class: 'group' }, h('div', { class: 'label' }, 'Frame', h('span', { class: 'grow' })), h('div', { class: 'chips' }, Object.entries(FRAMES).map(([k, l]) => h('button', { class: 'chip' + (FK === k ? ' on' : ''), onclick: () => change('frame.kind', k, true) }, l)))),
      FK !== 'none' ? h('div', { class: 'group' },
        FILLABLE_FRAMES.includes(FK) ? toggle('Filled', 'frame.filled', { rebuild: true }) : null,
        FK !== 'corners' ? toggle(FK === 'rules' ? 'Heavy + fine rule' : 'Double line', 'frame.double') : null,
        range('Line weight', 'frame.w', 0.4, 5, 0.1, { def: 1.6 }), range('Line gap', 'frame.gap', 1, 10, 0.1, { def: 3 }),
        fixed || FK === 'rules' ? select('Ornament', 'frame.orn', [['star', 'Star'], ['dot', 'Dot'], ['diamond', 'Diamond'], ['none', 'None']]) : null,
        fixed ? [range('Size', 'frame.size', 0.6, 1.6, 0.01, { def: 1 }), range('Band for text', 'frame.band', 0.16, 0.4, 0.01, { def: 0.27 })] : null,
        FK === 'box' ? range('Corner radius', 'frame.radius', 0, 1, 0.01, { def: 0.25 }) : null,
        paintEditor('Frame color', 'frame.paint', { nullable: true, noneLabel: 'Same as leaves' }),
        get('frame.filled') && FILLABLE_FRAMES.includes(FK) ? paintEditor('Text on the frame', 'frame.ink', { nullable: true, noneLabel: 'Auto (always readable)', leaf: false }) : null,
        h('div', { class: 'hint' }, fixed ? 'Seals carry curved text in their band: put the status on "Curved, top" and the year on "Curved, under" (or pick the Seal layout).' : 'The frame is sized round your words.'))
        : h('div', { class: 'hint' }, 'Text only. Pick a frame for a seal, a medal, a ticket or a film strip.'));
    return [top, pane];
  }
  pane.append(
    fold('Shape', 'the arc', true,
      range('Width', SP + 'rx', 0.4, 1.3, 0.01), range('Height', SP + 'ry', 0.4, 1.3, 0.01), range('Start angle', SP + 'a0', 60, 200, 1), range('End angle', SP + 'a1', 160, 300, 1), range('Curl tips', SP + 'curl', -80, 80, 1), range('Spiral', SP + 'spiral', -0.4, 0.6, 0.01), range('Cross stems', SP + 'cross', 0, 50, 1),
      select('Tip gap', SP + 'gap', [['auto', 'Smart'], ...[4, 8, 12, 18, 26, 36].map((g) => [g, String(g)])]),
      range('Stem width', 'branch.stem.w', 0, 6, 0.1), range('Stem taper', 'branch.stem.taper', 0, 1, 0.01),
      select('Rows', B + 'rows', [[1, 'Single'], [2, 'Double (nested)']], { num: true })),
    fold('Leaves', `${family} · ${get(LF + 'n')} a side`, true,
      select('Family', LF + 'family', opt(Object.keys(FAMILIES)), { rebuild: true }),
      ['simple', 'twig', 'trefoil'].includes(family) ? select('Shape', LF + 'profile', opt(Object.keys(PROFILES).filter((k) => k !== 'rachis'))) : null,
      family === 'custom' ? h('div', { class: 'row wide' }, h('label', {}, 'Your shape'), h('textarea', { placeholder: 'Paste any SVG path (d="…"): a leaf, a star, a film frame. Base on the left, tip on the right.', onchange: (e) => change(LF + 'path', e.target.value) }, get(LF + 'path') || '')) : null,
      select('Style', LF + 'style', [['solid', 'Solid'], ['slit', 'Slit (hairline midrib)'], ['carved', 'Carved veins'], ['inline', 'Inline (engraved outline)'], ['engraved', 'Engraved (outline + veins)'], ['hatch', 'Hatched (etching)'], ['split', 'Split two-tone']]),
      range('Fold shading', LF + 'fold', 0, 0.6, 0.01), select('Shaded half', LF + 'foldSide', [[1, 'Lower half'], [-1, 'Upper half']], { num: true }),
      range('Line weight', LF + 'ring', 0.06, 0.3, 0.01),
      range('Count', LF + 'n', 2, 32, 1), range('Size at base', LF + 'L0', 8, 80, 0.5), range('Size at tip', LF + 'L1', 4, 60, 0.5), range('Width', LF + 'wr', 0.08, 1.2, 0.01), range('Swell', LF + 'bulge', -0.5, 1, 0.01)),
    fold('Leaf rhythm', 'angles, bend, spacing', false,
      range('Bend', LF + 'bend', -0.4, 0.6, 0.01), range('S-curve', LF + 'scurve', -1, 1, 0.01), range('Fan out', LF + 'fan', -1, 1, 0.01), range('Big–small', LF + 'alt', 0, 0.6, 0.01), range('Lopsided', LF + 'asym', -0.6, 0.6, 0.01), range('Angle out', LF + 'aOut', 0, 90, 1), range('Angle in', LF + 'aIn', 0, 90, 1), range('Inner size', LF + 'inScale', 0.3, 1.3, 0.01),
      select('Arrangement', LF + 'arr', [['alternate', 'Alternate'], ['paired', 'Paired'], ['outer', 'Outer only'], ['inner', 'Inner only'], ['whorl', 'Whorled']]),
      range('Spacing', LF + 'gamma', 0.5, 1.8, 0.01), range('Stalks', LF + 'petiole', 0, 0.8, 0.01), range('Midrib', LF + 'vein', 0, 0.3, 0.01), range('Natural jitter', LF + 'jitter', 0, 1, 0.01), range('Hand-drawn', LF + 'wobble', 0, 1.5, 0.01),
      toggle('Point to base', LF + 'reverse'),
      h('div', { class: 'row' }, h('label', {}, 'Seed'), h('input', { type: 'number', value: doc.seed, 'aria-label': 'Seed', onchange: (e) => change('seed', +e.target.value) }), h('button', { class: 'btn small', title: 'New natural variation', onclick: () => change('seed', Math.floor(Math.random() * 99999), true) }, '⚄'))),
    fold('Ornaments', 'tips, berries, ties', false,
      select('Tip', OR + 'tip', [['leaf', 'Leaf'], ['bud', 'Bud'], ['berry', 'Berry'], ['star', 'Star'], ['curl', 'Tendril'], ['none', 'None']]), range('Berries every', OR + 'berries', 0, 4, 1), select('Berries sit', OR + 'berryPos', [['inner', 'Inside'], ['outer', 'Outside'], ['axil', 'In the forks']]), select('Berry shape', OR + 'berryShape', [['dot', 'Round'], ['olive', 'Olive on a stalk'], ['cluster', 'Cluster of three']]), range('Berry size', OR + 'berrySize', 0.4, 2.5, 0.05), range('Flowers every', OR + 'flowers', 0, 5, 1),
      select('Tie at base', OR + 'tie', [['none', 'None'], ['band', 'Band'], ['knot', 'Knot'], ['rosette', 'Rosette'], ['bow', 'Bow'], ['streamers', 'Bow + streamers']])),
    fold('Mixed wreath', doc.branch.right ? 'on' : 'off', false,
      h('div', { class: 'hint' }, 'A different branch on the right: oak and palm, laurel and olive.'),
      h('div', { class: 'seg' },
        h('button', { class: 'btn small' + (doc.branch.right ? ' on' : ''), onclick: () => { if (doc.branch.right) { const b = clone(doc.branch); delete b.right; change('branch', b, true); } else { const s = shuffleBranch(Date.now() % 100000); change('branch.right', { leaf: s.leaf, orn: { tip: s.orn.tip } }, true); } } }, doc.branch.right ? 'Same both sides' : 'Different right side'),
        doc.branch.right ? h('button', { class: 'btn small', onclick: () => { const s = shuffleBranch(Date.now() % 100000); change('branch.right', { leaf: s.leaf, orn: { tip: s.orn.tip } }, true); } }, 'Shuffle right side') : null)));
  return [top, pane];
}

// ── Color ──
function colorTab() {
  const top = head('Color', 'Metals, inks and gradients. Click a palette for a starting point.');
  const pal = h('div', { class: 'palettes' }, PALETTES.map((p, i) => h('button', { title: 'Palette ' + (i + 1), 'aria-label': 'Palette ' + (i + 1), style: `background:${p.bg}`, onclick: () => applyPalette(p) }, h('i', { style: `background:${paintCss(p.branch)}` }))));
  const fx = (k) => !!get('paint.effects.' + k);
  return [top, h('div', { class: 'pane' },
    h('div', { class: 'group' }, h('div', { class: 'label' }, 'Palettes', h('span', { class: 'grow' })), pal),
    fold('Leaves', null, true,
      paintEditor('Leaves', 'paint.branch', { leaf: true }),
      paintEditor('Inner leaves', 'paint.inner', { nullable: true, noneLabel: 'Same, dimmed', leaf: true }),
      range('Inner dimming', 'paint.depth', 0, 0.9, 0.01),
      paintEditor('Fold shade', 'paint.shade', { nullable: true, noneLabel: 'Black', leaf: false }),
      paintEditor('Berries & flowers', 'paint.ornament', { nullable: true, noneLabel: 'Same as leaves' }),
      select('Draw', 'paint.mode', [['fill', 'Filled'], ['outline', 'Outline'], ['both', 'Filled + outline']]),
      range('Outline width', 'paint.stroke.w', 0.2, 4, 0.05),
      paintEditor('Outline color', 'paint.stroke.paint', { nullable: true, noneLabel: 'Same as leaves' })),
    fold('Text', null, true,
      paintEditor('Main text', 'text.paint', { leaf: false }),
      paintEditor('Small text', 'text.sub', { nullable: true, noneLabel: 'Same as main', leaf: false })),
    fold('Ribbon, badge and background', null, false,
      paintEditor('Ribbon & badge', 'ribbon.paint', { nullable: true, noneLabel: 'Same as leaves' }),
      paintEditor('Text on ribbon', 'ribbon.text', { nullable: true, noneLabel: 'Auto (always readable)', leaf: false }),
      paintEditor('Background', 'canvas.bg', { nullable: true, noneLabel: 'Transparent', leaf: false })),
    fold('Effects', ['shadow', 'glow', 'misreg', 'foil', 'press', 'grain'].filter(fx).length + ' on', false,
      h('div', { class: 'hint' }, 'Foil: stamped metal catching the light. Letterpress: pressed into the paper. Misprint: a second ink off register. Grain: worn ink.'),
      toggle('Foil', 'paint.effects.foil', { rebuild: true, on: { strength: 0.75, crinkle: 0.5, size: 1.6, light: 235 }, off: null }),
      fx('foil') ? [range('Shine', 'paint.effects.foil.strength', 0, 1.5, 0.01, { def: 0.75 }), range('Crinkle', 'paint.effects.foil.crinkle', 0, 1, 0.01, { def: 0.5 }), range('Crinkle size', 'paint.effects.foil.size', 0.5, 5, 0.1, { def: 1.6 }), range('Light from', 'paint.effects.foil.light', 0, 360, 1, { def: 235 })] : null,
      toggle('Letterpress', 'paint.effects.press', { rebuild: true, on: { depth: 0.8, strength: 0.5 }, off: null }),
      fx('press') ? [range('Depth', 'paint.effects.press.depth', 0.2, 2.5, 0.05, { def: 0.8 }), range('Press strength', 'paint.effects.press.strength', 0, 1, 0.01, { def: 0.5 })] : null,
      toggle('Shadow', 'paint.effects.shadow', { rebuild: true, on: { blur: 3, dy: 2, opacity: 0.55, color: '#000000' }, off: null }),
      fx('shadow') ? [range('Blur', 'paint.effects.shadow.blur', 0, 12, 0.1, { def: 3 }), range('Drop', 'paint.effects.shadow.dy', -6, 12, 0.1, { def: 2 }), range('Strength', 'paint.effects.shadow.opacity', 0, 1, 0.01, { def: 0.55 }), color('Shadow color', 'paint.effects.shadow.color')] : null,
      toggle('Glow', 'paint.effects.glow', { rebuild: true, on: { blur: 6, opacity: 0.6, color: '#ffe8a8' }, off: null }),
      fx('glow') ? [range('Glow blur', 'paint.effects.glow.blur', 0, 16, 0.1, { def: 6 }), range('Glow strength', 'paint.effects.glow.opacity', 0, 1, 0.01, { def: 0.6 }), color('Glow color', 'paint.effects.glow.color')] : null,
      toggle('Misprint', 'paint.effects.misreg', { rebuild: true, on: { dx: 1.4, dy: 0.9, opacity: 0.8, color: '#ff4f79' }, off: null }),
      fx('misreg') ? [range('Shift across', 'paint.effects.misreg.dx', -4, 4, 0.1, { def: 1.4 }), range('Shift down', 'paint.effects.misreg.dy', -4, 4, 0.1, { def: 0.9 }), range('Ink strength', 'paint.effects.misreg.opacity', 0, 1, 0.01, { def: 0.8 }), color('Second ink', 'paint.effects.misreg.color')] : null,
      toggle('Grain', 'paint.effects.grain', { rebuild: true, on: { amount: 0.35, size: 0.6 }, off: null }),
      fx('grain') ? [range('Amount', 'paint.effects.grain.amount', 0, 1, 0.01, { def: 0.35 }), range('Speck size', 'paint.effects.grain.size', 0.2, 3, 0.05, { def: 0.6 })] : null,
      toggle('Effects on text', 'paint.effects.text'),
      h('div', { class: 'hint' }, 'Effects are in the PNG, the video and the SVG. The PDF leaves them out: printers add foil and letterpress as their own plates.')))];
}
function applyPalette(p) { const d = clone(doc); d.paint.branch = clone(p.branch); d.paint.inner = p.inner || null; d.text.paint = p.text; d.text.sub = p.sub; d.canvas.bg = p.bg; for (const k of Object.keys(d.roles)) d.roles[k].paint = null; delete d.presetName; replaceDoc(d); }

// ── Canvas ──
function canvasTab() {
  const L = 'layout.';
  const top = head('Canvas', 'Shape, margins and how small it will be seen.');
  return [top, h('div', { class: 'pane' },
    select('Shape', 'canvas.aspect', [[0, 'Fit the laurel'], [1, 'Square 1:1'], [0.8, 'Portrait 4:5'], [0.5625, 'Story 9:16'], [1.7778, 'Wide 16:9'], [0.6667, 'Poster 2:3']], { num: true }),
    range('Padding', 'canvas.pad', 0, 80, 1),
    paintEditor('Background', 'canvas.bg', { nullable: true, noneLabel: 'Transparent', leaf: false }),
    h('div', { class: 'group' }, h('div', { class: 'label' }, 'Smallest use', h('span', { class: 'grow' })),
      h('div', { class: 'hint' }, 'How small will people see it? Daphne keeps the small lines readable at that size: 6 px or more.'),
      h('div', { class: 'chips' }, [[0, 'No floor'], [600, 'Big · 600 px'], [300, 'Medium · 300 px'], [160, 'Poster row · 160 px'], [100, 'Tiny · 100 px']].map(([v, l]) => h('button', { class: 'chip' + (get(L + 'targetPx') === v ? ' on' : ''), onclick: () => change(L + 'targetPx', v, true) }, l)))),
    fold('Fit and spacing', null, false,
      toggle('Auto-widen', L + 'autoWiden', { tip: 'Widen the wreath when a long name would otherwise get small' }), range('Max name size', L + 'heroMax', 10, 60, 0.5), range('Min small size', L + 'minSmall', 3, 14, 0.1),
      range('Air to leaves', L + 'pad', 0, 16, 0.5), range('Air grows ×', L + 'padK', 0, 0.5, 0.01), range('Line spacing', L + 'spacing', 0.4, 2.5, 0.05), range('Wrapped lines', L + 'lineGap', 0, 0.8, 0.01),
      select('Vertical', L + 'dy', [['auto', 'Smart (best fit)'], ['-20', 'High'], ['-8', 'Slightly high'], ['2', 'Center'], ['12', 'Slightly low'], ['24', 'Low']]),
      select('Wrapping', L + 'wrap', [['auto', 'Smart'], ['off', 'Never wrap']])),
    fold('Outside text', 'arcs, ribbon, medallion', false,
      range('Arc top radius', L + 'arcTopR', 0.6, 1.6, 0.01), range('Arc base radius', L + 'arcBottomR', 0.3, 1.2, 0.01), range('Arc under radius', L + 'arcUnderR', 0.9, 1.6, 0.01, { def: 1.04 }), range('Ribbon position', L + 'ribbonY', 0.3, 1.1, 0.01), range('Ribbon width', L + 'ribbonW', 0.5, 2, 0.01), range('Medallion size', L + 'badgeR', 0.4, 2, 0.01), range('Outside gap', L + 'outerGap', 0, 30, 0.5), range('Flank fill', L + 'flankFill', 0.3, 0.9, 0.01, { def: 0.56 })),
    h('div', { class: 'seg' }, h('button', { class: 'btn small', onclick: () => { if (confirm('Start over with the default laurel? (Undo brings this one back.)')) replaceDoc(applyPreset(PRESETS[0], true, undefined, merge(clone(DEFAULT_DOC), { row: doc.row }))); } }, 'Start over')))];
}

// ── About ──
function aboutTab() {
  return [head('About Daphne', 'Make festival laurels for your film. It’s free.'), h('div', { class: 'pane about-pane' },
    h('p', { class: 'lead' }, held('Your film'), ' did the hard part. Now make the laurel.'),
    h('p', {}, 'Daphne makes festival laurels, the wreaths on a film’s poster that say it was selected for, or won at, a festival. Type the festival, your selection and the year, pick a look, and download it for your poster, trailer and socials as a PNG, SVG, PDF or video. It’s free and works in your browser, with no account and no watermark. Nothing you make leaves your device unless you share it. Made by pitch.dog, and open source.'),
    h('div', { class: 'guide', id: 'guide' }, h('div', { class: 'label' }, 'Using laurels well', h('span', { class: 'grow' })),
      [['Ask the festival first.', 'Most send official laurels to selected films, often through FilmFreeway. Some, like Cannes and the Berlinale, require their own. Make one here when they send none, or to match a row.'],
        ['Say exactly what you got.', 'Use the festival’s current name and its wording. “Submitted”, market listings and semi-finalist places can read as overstating it.'],
        ['Wait for the announcement.', 'Many festivals ask films to keep a selection private until the line-up is out. Check before you post.'],
        ['Fewer, stronger laurels.', 'One per award. Order them by what carries furthest: wins, then premieres, then selections. Row does this for you.'],
        ['Keep them readable.', 'Same size in a row, and big enough to read where they’ll be seen: check Small sizes under the stage.'],
        ['Watch for look-alikes.', 'Names that echo famous festivals, awards-only or online-only events and calls open all year are signs of a laurel mill.']].map(([t, d]) => h('div', { class: 'tip' }, h('b', {}, t), ' ', d))),
    h('div', { class: 'pledge' }, ['No account, no watermark, no paid tier, no limits.', 'Everything you make is yours to use however you like.', 'No festival logos ship with Daphne, and no lookalikes. Use the official files festivals send you.', 'Open source: the code is MIT, and the looks, the festival list and the brand are public domain (CC0). Corrections welcome.'].map((t) => h('div', {}, t))),
    h('p', { class: 'hint' }, 'Daphne isn’t affiliated with or endorsed by any festival. A laurel is the filmmaker’s own claim: use the wording the festival gave you.'),
    h('div', { class: 'group' }, h('div', { class: 'label' }, 'Keyboard', h('span', { class: 'grow' })), h('div', { class: 'hint' }, h('span', { class: 'kbd' }, '⌘Z'), ' undo  ', h('span', { class: 'kbd' }, '⇧⌘Z'), ' redo  ', h('span', { class: 'kbd' }, '⌘E'), ' export  ', h('span', { class: 'kbd' }, 'S'), ' surprise me')),
    h('p', { class: 'why' }, h('b', {}, 'Why Daphne? '), 'In Greek myth, Daphne turned into the first laurel tree. Every laurel since comes from her. ', h('a', { href: 'story/' }, 'Read her story')),
    h('div', { class: 'hint' }, 'Made by ', h('a', { href: 'https://pitch.dog/', target: '_blank', rel: 'noopener' }, 'pitch.dog'), '. We write and design pitch decks for film and TV. ', h('a', { href: 'https://pitch.dog/work/', target: '_blank', rel: 'noopener' }, 'See our work'), ' · ', h('a', { href: 'https://github.com/bomkino/Daphne', target: '_blank', rel: 'noopener' }, 'Source on GitHub')))];
}

// preset and layout thumbnails, rendered live with the user's own words, lazily as they scroll into view
function drawThumb(el) {
  delete el.dataset.dirty;
  let k = 0; const tmp = () => 'tmp' + k++;
  const d = el.dataset.l != null ? applyLayout(clone(doc), LAYOUTS[+el.dataset.l], tmp, { examples: true }) : applyPreset(PRESETS[+el.dataset.i], true, tmp, doc, { examples: true });
  d.canvas.aspect = 1; d.canvas.pad = 10;
  el.innerHTML = render(d, { measure, scale: 1 }).svg; // draw now, sharpen when the fonts arrive
  ensureFonts(d).then(() => { el.innerHTML = render(d, { measure, scale: 1 }).svg; });
}
const thumbIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.target.dataset.dirty) drawThumb(e.target); }), { root: matchMedia('(max-width: 860px)').matches ? null : document.getElementById('panel'), rootMargin: '300px' });
function drawThumbs() { document.querySelectorAll('.preset .thumb').forEach((el) => { el.dataset.dirty = 1; thumbIO.unobserve(el); thumbIO.observe(el); }); }

// ── shuffle: coherent looks from curated pools ──
const PALETTES = [
  { bg: '#0f1116', branch: { type: 'metal', metal: 'gold', scope: 'leaf', angle: 28 }, text: '#f4e3a8', sub: '#d8b866' },
  { bg: '#0b0b0c', branch: { type: 'metal', metal: 'silver', scope: 'leaf', angle: 20 }, text: '#ffffff', sub: '#b9bec5' },
  { bg: '#15100c', branch: { type: 'metal', metal: 'bronze', scope: 'leaf', angle: 30 }, text: '#f0c9a0', sub: '#c98b55' },
  { bg: '#1d1220', branch: { type: 'metal', metal: 'rose', scope: 'leaf', angle: 30 }, text: '#fbd9cc', sub: '#c47f6e' },
  { bg: '#f4efe6', branch: '#141414', text: '#141414', sub: '#3a3a3a' },
  { bg: '#ece6dc', branch: '#21483a', text: '#21483a', sub: '#3d6b58' },
  { bg: '#efe8da', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#173d2e'], [1, '#4d8a68']] }, text: '#173d2e', sub: '#2a5c45' },
  { bg: '#3a0f19', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#8f4f43'], [1, '#f2c4b2']] }, text: '#f6d8cc', sub: '#d9937f' },
  { bg: '#101a33', branch: { type: 'metal', metal: 'gold', scope: 'whole', angle: 0 }, text: '#f4e3a8', sub: '#cfae62' },
  { bg: '#0b0716', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#ff2e88'], [1, '#ffb45e']] }, text: '#fff1f6', sub: '#ffb3cf' },
  { bg: '#0f2a20', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#2f6f63'], [1, '#bfe8d5']] }, text: '#e9fbf2', sub: '#7fc2a8' },
  { bg: '#f7f1e3', branch: '#ff4f79', inner: '#2b59ff', text: '#2b59ff', sub: '#ff4f79' },
  { bg: '#121212', branch: '#ffffff', text: '#ffffff', sub: '#cfcfcf' },
  { bg: '#f6e6e1', branch: '#5a2d5f', text: '#3b1d3f', sub: '#7a4a7f' },
  { bg: '#1a2034', branch: { type: 'metal', metal: 'platinum', scope: 'leaf', angle: 24 }, text: '#ffffff', sub: '#c9ced5' },
  { bg: '#2e0d14', branch: { type: 'metal', metal: 'copper', scope: 'leaf', angle: 24 }, text: '#ffd9c2', sub: '#d77d55' },
  { bg: '#14110d', branch: { type: 'metal', metal: 'champagne', scope: 'leaf', angle: 28 }, text: '#f6ecd6', sub: '#cdb894' },
  { bg: '#120e08', branch: { type: 'metal', metal: 'antique', scope: 'leaf', angle: 28 }, text: '#e9d39a', sub: '#b59a5c' },
  { bg: '#07080a', branch: { type: 'metal', metal: 'chrome', scope: 'whole', angle: 0 }, text: '#ffffff', sub: '#c2cad4' },
  { bg: '#0f1d1a', branch: { type: 'metal', metal: 'patina', scope: 'leaf', angle: 28 }, text: '#e3f5ee', sub: '#7bb9a8' },
  { bg: '#0a0a12', branch: { type: 'metal', metal: 'iridescent', scope: 'leaf', angle: 28 }, text: '#ffffff', sub: '#c7a6ff' },
  { bg: '#101f1c', branch: { type: 'metal', metal: 'brass', scope: 'leaf', angle: 28 }, text: '#efd77a', sub: '#c9a646' },
  { bg: '#f2efe4', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#4f6446'], [1, '#a3b58a']] }, text: '#3a4a2f', sub: '#6b7d55' },
  { bg: '#1b1630', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#7c67c4'], [1, '#c9b8f2']] }, text: '#efe9ff', sub: '#b7a6e6' },
  { bg: '#fff6ef', branch: { type: 'linear', angle: 0, scope: 'whole', stops: [[0, '#ff6a88'], [0.55, '#ff9a8b'], [1, '#ffd56b']] }, text: '#d6336c', sub: '#f0758f' },
  { bg: null, branch: { type: 'metal', metal: 'gold', scope: 'leaf', angle: 28 }, text: '#f4e3a8', sub: '#d8b866' },
  { bg: null, branch: '#ffffff', text: '#ffffff', sub: '#ffffff' },
  { bg: null, branch: '#111111', text: '#111111', sub: '#111111' },
];
const PAIRINGS = [['Figtree', 'Figtree', 800, 700], ['Cinzel', 'Cinzel', 700, 600], ['Cormorant Garamond', 'Cormorant SC', 600, 600, 'asis'], ['Playfair Display', 'Playfair Display', 700, 600, 'asis'], ['Bodoni Moda', 'Bodoni Moda', 800, 600], ['Jost', 'Jost', 600, 500], ['Bebas Neue', 'Figtree', 400, 700], ['Syne', 'Syne', 800, 700], ['Libre Baskerville', 'Libre Baskerville', 700, 400, 'asis'], ['Marcellus', 'Marcellus', 400, 400], ['Italiana', 'Italiana', 400, 400], ['Fraunces', 'Inter Tight', 700, 600, 'asis'], ['Instrument Serif', 'Inter Tight', 400, 600, 'asis'], ['Archivo', 'Archivo', 900, 700], ['Poiret One', 'Poiret One', 400, 400], ['Montserrat', 'Montserrat', 800, 600], ['IM Fell English SC', 'IM Fell English SC', 400, 400], ['Space Grotesk', 'Space Grotesk', 700, 500], ['Big Shoulders Display', 'Big Shoulders Display', 800, 600], ['Gloock', 'Inter Tight', 400, 600, 'asis']];
function shuffle(part) {
  const r = rngOf((Date.now() % 1e9) ^ (Math.random() * 1e9)), pick = (a) => a[Math.floor(r() * a.length)];
  const d = clone(doc);
  if (part === 'wreath' || part === 'all') {
    const s = shuffleBranch(Math.floor(r() * 1e6));
    d.branch = merge(d.branch, s); delete d.branch.right;
    d.branch.leaf.style = pick(['solid', 'solid', 'slit', 'slit', 'carved', 'inline', 'engraved', 'hatch', 'split']);
    d.branch.leaf.fold = ['solid', 'slit', 'carved'].includes(d.branch.leaf.style) && r() < 0.7 ? +(0.18 + r() * 0.14).toFixed(2) : 0;
    d.branch.leaf.asym = r() < 0.5 ? +(r() * 0.4).toFixed(2) : 0;
    d.branch.orn.tie = d.branch.spine.cross ? pick(['none', 'band', 'bow', 'rosette', 'streamers']) : pick(['none', 'none', 'knot']);
    if (r() < 0.12) d.branch.orn.tip = 'curl';
    d.branch.rows = r() < 0.12 ? 2 : 1;
    d.seed = Math.floor(r() * 99999);
    if (d.form === 'text') d.form = 'open';
  }
  if (part === 'color' || part === 'all') {
    const p = pick(PALETTES.filter((x) => x.bg));
    d.paint.branch = clone(p.branch); d.paint.inner = p.inner || null; d.text.paint = p.text; d.text.sub = p.sub; d.canvas.bg = p.bg;
    d.paint.mode = r() < 0.12 ? 'outline' : 'fill'; d.paint.depth = +(0.1 + r() * 0.35).toFixed(2);
    for (const k of Object.keys(d.roles)) d.roles[k].paint = null;
  }
  if (part === 'type' || part === 'all') {
    const [hf, sf, hw, sw2, hc] = pick(PAIRINGS);
    Object.assign(d.roles.hero, { font: hf, weight: hw, case: hc || 'upper', italic: false });
    Object.assign(d.roles.big, { font: hf, weight: hw });
    for (const k of ['eyebrow', 'sub', 'arc']) Object.assign(d.roles[k], { font: sf, weight: sw2, case: 'upper' });
    d.roles.eyebrow.track = d.roles.sub.track = +(0.14 + r() * 0.16).toFixed(2);
  }
  delete d.presetName;
  replaceDoc(d);
}

// ── undo / redo ──
function undo() { if (!undoStack.length) return; future.push(JSON.stringify(doc)); doc = normalize(JSON.parse(undoStack.pop())); lastSnap = JSON.stringify(doc); buildPanel(); refreshMode(); schedule(); saveHash(); historyButtons(); }
function redo() { if (!future.length) return; undoStack.push(JSON.stringify(doc)); doc = normalize(JSON.parse(future.pop())); lastSnap = JSON.stringify(doc); buildPanel(); refreshMode(); schedule(); saveHash(); historyButtons(); }
const refreshMode = () => { if (MODES[mode] && MODES[mode].refresh) MODES[mode].refresh(); };
document.getElementById('undo').onclick = undo; document.getElementById('redo').onclick = redo;
window.addEventListener('keydown', (e) => {
  const typing = /input|textarea|select/i.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'range';
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); openExport(); }
  else if (!mod && !typing && e.key.toLowerCase() === 's' && !document.querySelector('.scrim')) shuffle('all');
  else if (e.key === 'Escape') { closeFontPop(); endPeek(); }
});

// ── share link and autosave: the whole document, deflated into the URL hash. No server, no account. ──
const b64u = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pack(o) { const cs = new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(JSON.stringify(o))); w.close(); return b64u(await new Response(cs.readable).arrayBuffer()); }
// a link's laurel, checked before it's used: bounded in size, and through sanitizeDoc
async function unpack(s) {
  const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(unb64u(s)).catch(() => null); w.close().catch(() => null);
  const rd = ds.readable.getReader(), parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > 4e6) { rd.cancel().catch(() => null); throw new Error('too big to be a laurel'); } parts.push(value); }
  const all = new Uint8Array(n); let o = 0; for (const x of parts) { all.set(x, o); o += x.length; }
  return sanitizeDoc(JSON.parse(new TextDecoder().decode(all)));
}
const bumpUid = (d) => { for (const f of d.fields || []) { const n = +String(f.id).replace(/\D/g, ''); if (n >= uid) uid = n + 1; } };
let hashTimer = 0;
// The link and the autosave follow the laurel half a second after an edit. Each save carries a number, and one that
// finishes after a newer one started is dropped, so an older laurel never overwrites a newer one. If the page is
// closed before a save finishes, the laurel is kept as plain JSON and picked up next time.
let saveRev = 0, lastPacked = null;
function saveHash() {
  clearTimeout(hashTimer); const my = ++saveRev;
  hashTimer = setTimeout(async () => {
    hashTimer = 0;
    let p; try { p = await pack(doc); } catch (e) { return; }
    if (my !== saveRev) return; // a newer save is on its way
    try { window.history.replaceState(null, '', '#l=' + p); } catch (e) { /* the link is a convenience */ }
    lastPacked = p;
    try { localStorage.setItem('daphne.autosave', p); localStorage.removeItem('daphne.pending'); saveState(true); } catch (e) { saveState(false); }
  }, 500);
}
function flushSave() {
  if (!hashTimer) return;
  try { localStorage.setItem('daphne.pending', JSON.stringify({ from: lastPacked, doc })); } catch (e) { /* nothing more can be done as the page closes */ }
}
addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
document.getElementById('copy-link').onclick = async () => { const url = location.href.split('#')[0] + '#l=' + (await pack(doc)); try { await navigator.clipboard.writeText(url); toast(JSON.stringify([doc.fields, doc.row && doc.row.items, doc.poster]).includes('"asset:') ? 'Link copied: it holds the words and the look. Uploaded logos and artwork stay on this device.' : 'Link copied: it holds the whole laurel', 3600); } catch { prompt('Copy this link', url); } };
function toast(msg, ms = 2200) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.getElementById('toasts').append(t); setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 320); }, ms); }

// ── export ──
const download = (blob, name) => { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
// file names say what the laurel is: 2026-northlight-official-selection
const fileName = (d = doc) => {
  const t = (k) => ((d.fields.find((f) => f.kind === k && f.text && f.show !== false) || {}).text || '');
  const parts = [t('year').match(/\d{4}/)?.[0], t('festival'), t('award') || t('status')].filter(Boolean);
  return (slug(parts.join(' ')) || slug((d.fields.find((f) => f.role === 'hero' && f.text && f.show !== false) || {}).text) || 'laurel').slice(0, 80);
};
async function svgWithFonts(svg, embed, d = doc) {
  const fams = [...new Set(Object.values(d.roles).map((r) => r.font))];
  const css = embed ? await embedFontCss(fams) : fams.map((f) => `@import url('${cssUrl(f).replace(/&/g, '&amp;')}');`).join('');
  return svg.replace(/^<svg([^>]*)>/, `<svg$1><style>${css}</style>`);
}
const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// every vector file says what it is (for screen readers and search) and carries the not-affiliated note (research/01 §2.3)
const stamp = (svg, d = doc) => svg.replace(/^<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(role|aria-labelledby)="[^"]*"/g, '')} role="img" aria-labelledby="daphne-title"><title id="daphne-title">${xmlEsc(altText(d))}</title><desc>Festival laurel made with Daphne, the free laurel maker by pitch.dog. Not affiliated with or endorsed by any festival: the claim is the filmmaker's own.</desc>`);
// outlined text when asked (the default), live text with the fonts linked otherwise; falls back to live text offline
async function exportSvgText(svg, d = doc) {
  if ((d.out && d.out.svgText) !== 'live') {
    try { const r = await outlineSvg(svg); if (r.notes.length) toast(`Drawn in ${r.notes.join(', ')} where the font has no glyphs`); return stamp(r.svg, d); }
    catch (e) { console.warn(e); toast('Couldn’t fetch the fonts to outline the text: saved with live text'); }
  }
  return stamp(await svgWithFonts(svg, false, d), d);
}
async function toPng(svgText, vb, width, withBg, d = doc, height) {
  let svg = svgText;
  if (!withBg) svg = svg.replace(/<rect data-bg="1"[^>]*\/>/, '');
  const H = height || Math.round((width * vb[3]) / vb[2]);
  svg = await svgWithFonts(svg.replace(/width="[^"]+" height="[^"]+"/, `width="${width}" height="${H}"`), true, d);
  const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const c = document.createElement('canvas'); c.width = width; c.height = H;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
async function toPdf(svg, d = doc, title = 'Laurel', mm) {
  let outl;
  try { outl = (await outlineSvg(svg)).svg; } catch (e) { toast('Couldn’t fetch the fonts for the PDF: check your connection'); throw e; }
  return svgToPdf(stamp(outl, d), mm || (d.out && d.out.pdfMm) || 100, { title: altText(d).replace(/\.$/, '') || title, subject: 'Festival laurel. Not affiliated with or endorsed by any festival.' });
}
function openExport() { endPeek(); markSeen(); openStudio(ctx); }
document.getElementById('open-export').onclick = openExport;

// ── views: the laurel, on the poster, a row, motion ──
const modebar = document.getElementById('modebar'), modepanel = document.getElementById('modepanel');
const ctx = {
  get doc() { return doc; }, change, replaceDoc, schedule, clone, merge, h, toast, download, measure, render: (d, scale = 1) => render(d, { measure, scale }),
  ensureFonts, svgWithFonts, exportSvgText, toPng, toPdf, fileName, slug, stamp, altText, ASSETS, saveAssets, addAsset, readLogo, stage, modebar, modepanel, showNotes, layoutFields, layoutById, LAYOUTS, PRESETS, applyPreset, zip,
  pushUndo: () => remember(), batch, settle: () => { lastSnap = JSON.stringify(doc); saveHash(); }, rebuild: () => buildPanel(), get last() { return last; }, get mode() { return mode; }, get modes() { return MODES; },
  prefs: () => ({ pngW: (doc.out && doc.out.pngW) || 3000, bg: !(doc.out && doc.out.pngBg === false) }),
  fixNote: null, openFixer: null, shareLink: async () => location.href.split('#')[0] + '#l=' + (await pack(doc)),
  // size an SVG to the stage, keeping its shape (no letterboxing)
  fit: (svg, vb) => { stage.classList.add('fitted'); const sw2 = document.getElementById('stagewrap'), k = Math.min((sw2.clientWidth - 56) / vb[2], (sw2.clientHeight - 92) / vb[3]); Object.assign(svg.style, { width: Math.max(1, vb[2] * k) + 'px', height: Math.max(1, vb[3] * k) + 'px', maxWidth: 'none', maxHeight: 'none' }); },
};
const MODES = {
  laurel: { draw: (r) => { stage.className = 'stage'; stage.innerHTML = r.svg; decorateStage(); }, enter() {} },
  poster: posterMode(ctx), row: rowMode(ctx), motion: motionMode(ctx),
};
let mode = 'laurel';
function setMode(m) {
  if (!MODES[m] || m === mode && modebar.childElementCount) { return; }
  endPeek();
  if (MODES[mode] && MODES[mode].leave) MODES[mode].leave();
  mode = m; ctx.fixNote = null;
  document.querySelectorAll('#modes button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-selected', String(b.dataset.mode === m)); });
  modebar.innerHTML = ''; modepanel.innerHTML = '';
  if (MODES[m].enter) MODES[m].enter();
  modebar.classList.toggle('on', !!modebar.childElementCount); modepanel.classList.toggle('on', !!modepanel.childElementCount);
  showNotes([]); buildStagebar(); schedule();
  try { sessionStorage.setItem('daphne.mode', m); } catch (e) { /* a convenience */ }
}
document.querySelectorAll('#modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

// ── the stage bar: backdrop, and the laurel at the sizes it will really be seen ──
const stagebar = document.getElementById('stagebar');
function buildStagebar() {
  stagebar.innerHTML = '';
  mainEl.classList.toggle('light', state.backdrop === 'light'); mainEl.classList.toggle('check', state.backdrop === 'check');
  if (mode !== 'laurel') { document.querySelector('.small-sizes')?.remove(); return; }
  stagebar.append(
    segctl([['dark', h('span', {}, h('i', { class: 'bd', style: 'background:#12291E' }), ' Dark')], ['light', h('span', {}, h('i', { class: 'bd', style: 'background:#F3F6EF' }), ' Light')], ['check', h('span', {}, h('i', { class: 'bd', style: 'background:repeating-conic-gradient(#999 0 25%,#ddd 0 50%) 0 0/7px 7px' }), ' Clear')]], state.backdrop, (v) => { state.backdrop = v; saveUi(); buildStagebar(); }),
    h('span', { class: 'grow' }),
    segctl([[true, state.smallSizes ? '✓ Small sizes' : 'Small sizes']], state.smallSizes ? true : null, () => { state.smallSizes = !state.smallSizes; buildStagebar(); if (state.smallSizes) drawSmallSizes(); else document.querySelector('.small-sizes')?.remove(); }));
}
// the laurel at 160, 100 and 64 px tall, on dark and light: how a poster row, a listing and a thumbnail show it
function drawSmallSizes() {
  if (!last) return;
  let box = document.querySelector('.small-sizes');
  if (!box) { box = h('div', { class: 'small-sizes', 'aria-label': 'The laurel at small sizes' }); document.getElementById('stagearea').append(box); }
  const svg = last.svg.replace(/<rect data-bg="1"[^>]*\/>/, ''), vb = last.viewBox, ar = vb[2] / vb[3];
  const fig = (px) => { const w = Math.round(px * ar); const mk = (bg) => h('div', { style: `background:${bg}`, html: svg.replace(/width="[^"]+" height="[^"]+"/, `width="${w}" height="${px}"`) }); return h('figure', {}, h('div', { class: 'pair' }, mk('#0a0a0a'), mk('#f2efe8')), h('figcaption', {}, `${px} px`)); };
  box.innerHTML = '';
  box.append(h('div', { class: 'hint', style: 'font-size:11px' }, 'Real size on a standard screen: a poster row, a festival listing, a thumbnail.'), h('div', { class: 'ss-row' }, fig(160), fig(100), fig(64)));
}


// the phone layout keeps the rail just under the header, however tall the header wraps
{ const top = document.querySelector('header.top'); new ResizeObserver(() => document.documentElement.style.setProperty('--hh', top.offsetHeight + 'px')).observe(top); }

// ── boot ──
(async () => {
  const m = location.hash.match(/#l=([\w-]+)/);
  let restored = false;
  let saved = null, pending = null;
  try { saved = localStorage.getItem('daphne.autosave'); pending = JSON.parse(localStorage.getItem('daphne.pending') || 'null'); } catch (e) { /* a convenience */ }
  // back from Daphne's story: the laurel this tab left with, not whichever one was autosaved last
  let ret = null; try { ret = sessionStorage.getItem('daphne.return'); sessionStorage.removeItem('daphne.return'); } catch (e) { /* a convenience */ }
  let from = null, badLink = false;
  if (m) { try { doc = merge(clone(DEFAULT_DOC), await unpack(m[1])); from = m[1]; } catch { badLink = true; } }
  else if (ret) { try { doc = merge(clone(DEFAULT_DOC), await unpack(ret)); from = ret; history.replaceState(null, '', '#l=' + ret); } catch { /* fall through to the autosave */ } }
  if (!from) {
    if (saved) { try { doc = merge(clone(DEFAULT_DOC), await unpack(saved)); from = saved; restored = !badLink; } catch { doc = applyPreset(PRESETS[0]); } }
    else doc = applyPreset(PRESETS[0]);
  }
  lastPacked = from;
  // an edit made just before the page closed, on top of this same laurel: bring it back
  if (pending && pending.doc && pending.from === lastPacked) { try { doc = merge(clone(DEFAULT_DOC), sanitizeDoc(pending.doc)); restored = !ret && !m; } catch (e) { /* keep the saved one */ } }
  bumpUid(doc);
  normalize(doc); lastSnap = JSON.stringify(doc);
  buildRail(); buildPanel(); historyButtons();
  let m0 = 'laurel'; try { m0 = sessionStorage.getItem('daphne.mode') || 'laurel'; } catch (e) { /* a convenience */ }
  mode = ''; MODES[''] = {}; setMode(MODES[m0] ? m0 : 'laurel'); delete MODES[''];
  schedule();
  if (badLink) toast('That link couldn’t be opened: it’s damaged or incomplete. ' + (saved ? 'Here’s your last laurel instead.' : 'Here’s a fresh one.'), 6000);
  else if (restored) toast('Welcome back: here’s the laurel you were working on');
  // another link opened in this tab, or Back and Forward between links: the design follows the address
  addEventListener('hashchange', async () => {
    const h2 = location.hash.match(/#l=([\w-]+)/); if (!h2 || h2[1] === lastPacked) return;
    try { const d = merge(clone(DEFAULT_DOC), await unpack(h2[1])); bumpUid(d); lastPacked = h2[1]; replaceDoc(d); toast('Opened the laurel in the link. Undo goes back to the one before.'); }
    catch { toast('That link couldn’t be opened: it’s damaged or incomplete. Your laurel is unchanged.', 6000); try { if (lastPacked) history.replaceState(null, '', '#l=' + lastPacked); } catch (e) { /* the address is a convenience */ } }
  });
  // leaving for the story: remember this laurel for this tab, so "Make a laurel" comes back to it
  document.addEventListener('click', async (e) => {
    const a = e.target.closest && e.target.closest('a[href="story/"]'); if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    try { const p = await pack(doc); sessionStorage.setItem('daphne.return', p); } catch (err) { /* the story still opens */ }
    location.href = a.href;
  });
  setTimeout(() => preloadOutlines(doc.roles).catch(() => null), 2500); // warm the shaper for the first SVG or PDF
  import('./fixer.js').then((mod) => { ctx.openFixer = (onDone, o) => mod.openFixer(ctx, onDone, o); }).catch(() => null);
  window.__laurel = { get doc() { return doc; }, render: (d) => render(d || doc, { measure }), PRESETS, applyPreset, measure, setMode, get mode() { return mode; }, ctx, MODES, setTab, altText, openExport };
})();
