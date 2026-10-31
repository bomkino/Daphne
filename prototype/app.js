// app.js — Daphne prototype UI. Vanilla ES modules, no build step.
import { render, DEFAULT_DOC, FORMS, METALS, PROFILES, FAMILIES, FRAMES, FILLABLE_FRAMES, ASSETS, LOGO_SLOTS, merge, clone, applyForm, shuffleBranch, rngOf } from './engine.mjs';
import { FONTS, fontInfo, loadFont, embedFontCss, cssUrl } from './fonts.js';
import { PRESETS, GROUPS } from './presets.js';
import { LAYOUTS, LAYOUT_GROUPS, layoutFields, applyLayout } from './layouts.js';
import { checkLaurel } from './rules.js';
import { outlineSvg, svgToPdf, preloadOutlines } from './outline.js';
import { posterMode } from './poster.js';
import { rowMode } from './row.js';
import { motionMode } from './motion.js';

// ── measurement: real glyph widths from the browser ──
const mctx = document.createElement('canvas').getContext('2d');
const measure = (s, font, weight, italic, size) => { mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}", sans-serif`; return mctx.measureText(s).width; };

// ── state ──
const KIND_ROLE = { status: 'eyebrow', festival: 'hero', award: 'hero', category: 'sub', location: 'sub', year: 'sub', edition: 'eyebrow', custom: 'sub', icon: 'eyebrow', logo: 'hero' };
const KINDS = Object.keys(KIND_ROLE);
const SLOTS = [['inside', 'Inside'], ['above', 'Above'], ['below', 'Below'], ['arc-top', 'Arc top'], ['arc-bottom', 'Arc bottom'], ['arc-under', 'Arc under'], ['ribbon', 'Ribbon'], ['badge', 'Badge']];
const ROLES = [['eyebrow', 'Eyebrow'], ['hero', 'Hero'], ['sub', 'Sub'], ['big', 'Big']];
let doc = clone(DEFAULT_DOC);
let selected = null, uid = 10;
const undoStack = [], future = [];

// A preset changes the look. The words keep the layout the user chose, except for the few presets built around a
// layout of their own (ribbon, medallion, big year); leaving one of those returns to the user's layout.
const layoutById = (id) => LAYOUTS.find((L) => L.id === id);
const APP_KEYS = ['row', 'poster', 'motion', 'out']; // the app's own state, kept in the document so links and undo carry it
function applyPreset(p, keepText = true, newId = () => 'f' + ++uid) {
  let fields = clone(doc.fields);
  let d = merge(clone(DEFAULT_DOC), { roles: doc.roles });
  if (p.doc.form) d = applyForm(d, p.doc.form);
  d = merge(d, p.doc);
  d.seed = doc.seed;
  for (const k of APP_KEYS) if (doc[k]) d[k] = clone(doc[k]);
  // with auto ink on, the preset's own colours are what comes back when it's turned off
  if (d.poster && d.poster.autoInk) d.poster.saved = { paint: clone(d.paint), text: clone(d.text), roles: Object.fromEntries(Object.entries(d.roles).map(([k, r]) => [k, r && r.paint ? clone(r.paint) : null])) };
  for (const k of Object.keys(d.roles)) if (!(p.doc.roles && p.doc.roles[k] && 'paint' in p.doc.roles[k])) d.roles[k].paint = null;
  if (keepText) {
    const lay = p.layout || (doc.layoutBy === 'preset' ? doc.userLayoutId || 'year-below' : null);
    if (lay) fields = layoutFields(fields, layoutById(lay), newId);
    d.fields = fields;
    d.layoutId = lay || doc.layoutId; d.userLayoutId = doc.userLayoutId;
    d.layoutBy = p.layout ? 'preset' : doc.layoutBy === 'preset' ? (doc.userLayoutId ? 'user' : null) : doc.layoutBy;
  }
  return d;
}

// ── tiny path helpers ──
const get = (path, o = doc) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function set(path, v, o = doc) { const ks = path.split('.'); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; } a[ks[ks.length - 1]] = v; }
function commit(rebuild = false) { undoStack.push(JSON.stringify(doc)); if (undoStack.length > 200) undoStack.shift(); future.length = 0; schedule(); if (rebuild) buildPanel(); saveHash(); }
let lastSnap = JSON.stringify(doc);
function change(path, v, rebuild = false) { if (JSON.stringify(get(path)) === JSON.stringify(v)) return; undoStack.push(lastSnap); future.length = 0; set(path, v); if (doc.poster && doc.poster.autoInk && /^(paint\.(branch|inner|ornament)|text\.|roles\.\w+\.paint)/.test(path)) { doc.poster.autoInk = false; delete doc.poster.saved; toast('Auto ink is off: you chose a colour'); rebuild = true; } lastSnap = JSON.stringify(doc); schedule(); if (rebuild) buildPanel(); saveHash(); thumbsDirty = true; if (path === 'fields' || /^(row|poster)/.test(path)) saveAssets(); }
function replaceDoc(d, rebuild = true) { undoStack.push(lastSnap); future.length = 0; doc = d; lastSnap = JSON.stringify(doc); schedule(); if (rebuild) buildPanel(); saveHash(); thumbsDirty = true; saveAssets(); }

// ── logos: official artwork the user uploads. The image lives in ASSETS (and this browser's storage); the field keeps
// only its key and aspect ratio, so undo and share links stay small. A shared link's logo has to be uploaded again.
try { Object.assign(ASSETS, JSON.parse(localStorage.getItem('daphne.assets') || '{}')); } catch (e) { /* storage is a convenience */ }
const saveAssets = () => { const used = new Set([...doc.fields.filter((f) => f.kind === 'logo').map((f) => f.src), doc.poster && doc.poster.src, ...((doc.row && doc.row.items) || []).map((it) => it.src)].filter(Boolean)); try { localStorage.setItem('daphne.assets', JSON.stringify(Object.fromEntries(Object.entries(ASSETS).filter(([k]) => used.has(k))))); } catch (e) { /* too big for storage: it still works this session */ } };
async function readLogo(file) {
  if (file.size > 3 * 1024 * 1024) { alert('That file is over 3 MB. Export the logo smaller (an SVG, or a PNG about 1500 px wide) and try again.'); return null; }
  const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  let ar = 0;
  if (/svg/.test(file.type)) { // an SVG's shape comes from its viewBox (or width and height); browsers guess 300 × 150 without one
    const t = await file.text(), vb = t.match(/viewBox\s*=\s*["']\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)/i), w = t.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i), hh = t.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
    if (vb && +vb[2]) ar = +vb[1] / +vb[2]; else if (w && hh && +hh[1]) ar = +w[1] / +hh[1];
  }
  if (!ar) ar = await new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1); im.onerror = () => ok(1); im.src = url; });
  const key = 'asset:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ASSETS[key] = url;
  return { src: key, ar: Math.round(ar * 1000) / 1000, name: file.name };
}

// ── render loop ──
let raf = 0, last = null;
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
  last = render(doc, { measure, scale: 2 });
  MODES[mode].draw(last);
  document.getElementById('report').style.display = mode === 'row' || mode === 'motion' ? 'none' : '';
  showReport(last.report);
  if (mode !== 'row') showNotes(checkLaurel(doc));
  pending.then(() => { if (fontsReady === pending) { const r2 = render(doc, { measure, scale: 2 }); if (r2.svg !== last.svg) { last = r2; MODES[mode].draw(last); showReport(last.report); } } });
  if (thumbsDirty) { thumbsDirty = false; clearTimeout(thumbTimer); thumbTimer = setTimeout(drawThumbs, 350); }
}
const stage = document.getElementById('stage');
function showReport(r) {
  const el = document.getElementById('report');
  const tight = r.lines.filter((l) => l.margin < 0.5).length;
  const tracked = r.lines.filter((l, i) => l.track != null && l.track < 0.15 && /[A-Z]{3}/.test(l.s || '')).length;
  el.innerHTML = [
    `<span>Hero <b>${r.hero.toFixed(1)}</b></span>`,
    r.wrapped ? `<span>Wrapped ${r.wrapped} line${r.wrapped > 1 ? 's' : ''} for size</span>` : '',
    r.widened ? `<span>Widened the wreath to fit the name (${r.widened.rx.toFixed(2)})</span>` : '',
    tight ? `<span>Fitted tight: ${tight} line${tight > 1 ? 's' : ''}</span>` : '<span class="ok">Every line clears the leaves</span>',
    tracked ? `<span>Tracking tightened to fit</span>` : '',
    ...r.warnings.map((w) => `<span class="warn">${w}</span>`),
  ].filter(Boolean).join('');
}

// festival rules and honest-claim notes: gentle, never blocking
function showNotes(list) {
  const el = document.getElementById('notes');
  el.classList.toggle('on', !!list.length);
  el.innerHTML = '';
  for (const n of list) el.append(h('div', { class: 'note ' + n.level }, h('span', {}, n.level === 'rule' ? h('b', {}, 'Festival rule. ') : null, n.text, ' ', n.source ? h('a', { href: n.source.url, target: '_blank', rel: 'noopener', title: n.source.label }, 'Source') : null, n.fix && ctx.fixNote ? h('button', { class: 'btn small', onclick: () => ctx.fixNote(n.fix) }, 'Fix') : null)));
}

// drag a line to nudge it (stored as dx/dy on its field); double-click resets
function decorateStage() {
  const svg = stage.querySelector('svg'); if (!svg) return;
  svg.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-ids]'); if (!t || !t.dataset.ids) return;
    const ids = t.dataset.ids.split(' '), f0 = doc.fields.find((f) => f.id === ids[0]); if (!f0) return;
    selectField(f0.id);
    const m = svg.getScreenCTM().inverse(), p0 = new DOMPoint(e.clientX, e.clientY).matrixTransform(m), base = { dx: f0.dx || 0, dy: f0.dy || 0 };
    undoStack.push(lastSnap); future.length = 0;
    const move = (ev) => { const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m); f0.dx = Math.round((base.dx + p.x - p0.x) * 10) / 10; f0.dy = Math.round((base.dy + p.y - p0.y) * 10) / 10; schedule(); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); lastSnap = JSON.stringify(doc); saveHash(); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  });
  svg.addEventListener('dblclick', (e) => { const t = e.target.closest('[data-ids]'); if (!t || !t.dataset.ids) return; const f0 = doc.fields.find((f) => f.id === t.dataset.ids.split(' ')[0]); if (f0) { undoStack.push(lastSnap); f0.dx = 0; f0.dy = 0; lastSnap = JSON.stringify(doc); schedule(); } });
}
function selectField(id) { selected = id; document.querySelectorAll('.field').forEach((el) => el.classList.toggle('sel', el.dataset.id === id)); const el = document.querySelector(`.field[data-id="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

// ── UI builders ──
const h = (tag, attrs = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v); } for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); return el; };
const fmt = (v, step) => (step >= 1 ? Math.round(v) : (+v).toFixed(step >= 0.1 ? 1 : 2));
function range(label, path, min, max, step = 1, o = {}) {
  const v = get(path) ?? o.def ?? min, out = h('output', {}, fmt(v, step));
  const inp = h('input', { type: 'range', min, max, step, value: v, oninput: (e) => { out.textContent = fmt(e.target.value, step); change(path, +e.target.value); } });
  return h('div', { class: 'row' }, h('label', { title: label }, label), inp, out);
}
function select(label, path, options, o = {}) {
  const v = get(path);
  const s = h('select', { onchange: (e) => { const val = e.target.value; change(path, o.num ? +val : val === 'null' ? null : val === 'true' ? true : val === 'false' ? false : val, o.rebuild); } }, options.map(([val, lab]) => h('option', { value: String(val), selected: String(val) === String(v) }, lab)));
  return h('div', { class: 'row wide' }, h('label', {}, label), s);
}
function toggle(label, path, o = {}) { const cb = h('input', { type: 'checkbox', checked: !!get(path), onchange: (e) => change(path, e.target.checked, o.rebuild) }); return h('div', { class: 'row wide' }, h('label', {}, label), h('div', {}, cb)); }
function color(label, path) { const v = get(path); const c = h('input', { type: 'color', value: typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff', oninput: (e) => change(path, e.target.value) }); return h('div', { class: 'row wide' }, h('label', {}, label), h('div', {}, c)); }
const opt = (arr) => arr.map((x) => (Array.isArray(x) ? x : [x, x[0].toUpperCase() + x.slice(1)]));

// a paint: none / solid / linear / radial / metal, applied to the whole thing or per leaf
function paintEditor(label, path, o = {}) {
  const box = h('div', { class: 'paint' });
  const redraw = () => {
    box.innerHTML = '';
    let p = get(path);
    const typeOf = p == null ? 'none' : typeof p === 'string' ? 'solid' : p.type;
    const types = [...(o.nullable ? [['none', o.noneLabel || 'None']] : []), ['solid', 'Solid'], ['linear', 'Linear'], ['radial', 'Radial'], ['metal', 'Metal']];
    const sel = h('select', { onchange: (e) => {
      const t = e.target.value, base = typeof p === 'string' ? p : p && p.type === 'solid' ? p.color : '#e3c27a';
      const next = t === 'none' ? null : t === 'solid' ? base : t === 'metal' ? { type: 'metal', metal: 'gold', angle: 28, scope: o.leaf ? 'leaf' : 'whole' } : { type: t, angle: 0, scope: 'whole', stops: p && p.stops ? p.stops : [[0, '#6e4f1c'], [1, '#f4e3a8']] };
      change(path, next); redraw();
    } }, types.map(([v, l]) => h('option', { value: v, selected: v === typeOf }, l)));
    box.append(h('div', { class: 'head' }, h('span', { class: 'lbl' }, label), sel));
    if (typeOf === 'solid') { const c = typeof p === 'string' ? p : p.color; box.append(h('div', { class: 'head' }, h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(c) ? c : '#ffffff', oninput: (e) => change(path, e.target.value) }), h('input', { type: 'text', value: c, onchange: (e) => { change(path, e.target.value); redraw(); } }))); }
    if (typeOf === 'linear' || typeOf === 'radial') {
      const stops = h('div', { class: 'stops' });
      p.stops.forEach((st, i) => stops.append(h('div', { class: 'stop' },
        h('input', { type: 'color', value: st[1], oninput: (e) => { const s2 = clone(get(path).stops); s2[i][1] = e.target.value; change(path + '.stops', s2); } }),
        h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: st[0], oninput: (e) => { const s2 = clone(get(path).stops); s2[i][0] = +e.target.value; change(path + '.stops', s2); } }),
        h('button', { class: 'btn small', title: 'Remove stop', onclick: () => { const s2 = clone(get(path).stops); if (s2.length > 2) { s2.splice(i, 1); change(path + '.stops', s2); redraw(); } } }, '×'))));
      box.append(stops, h('button', { class: 'btn small', onclick: () => { const s2 = clone(get(path).stops); s2.push([1, s2[s2.length - 1][1]]); s2.sort((a, b) => a[0] - b[0]); change(path + '.stops', s2); redraw(); } }, '+ stop'));
    }
    if (typeOf === 'metal') box.append(h('div', { class: 'head' }, h('span', { class: 'lbl' }, 'Metal'), h('select', { onchange: (e) => change(path + '.metal', e.target.value) }, Object.keys(METALS).map((m) => h('option', { value: m, selected: m === p.metal }, m[0].toUpperCase() + m.slice(1))))));
    if (typeOf === 'linear' || typeOf === 'metal') box.append(range('Angle', path + '.angle', 0, 360, 1));
    if (typeOf === 'radial') box.append(range('Centre x', path + '.cx', 0, 1, 0.01, { def: 0.5 }), range('Centre y', path + '.cy', 0, 1, 0.01, { def: 0.5 }), range('Radius', path + '.r', 0.1, 1.5, 0.01, { def: 0.6 }));
    if (typeOf !== 'none' && typeOf !== 'solid' && o.leaf !== false) box.append(select('Applies to', path + '.scope', [['whole', 'Whole wreath'], ['leaf', 'Each leaf (foil)']]));
  };
  redraw();
  return box;
}

function fontSelect(path) {
  const v = get(path), cats = [...new Set(FONTS.map((x) => x.c))];
  const s = h('select', { onchange: async (e) => {
    let val = e.target.value;
    if (val === '__other') { val = prompt('Any Google Fonts family name (e.g. "Rubik Mono One")', ''); if (!val) { e.target.value = get(path); return; } }
    change(path, val, true);
  } }, cats.map((c) => h('optgroup', { label: c }, FONTS.filter((x) => x.c === c).map((x) => h('option', { value: x.f, selected: x.f === v }, x.f)))), !fontInfo(v) ? h('option', { value: v, selected: true }, v) : null, h('option', { value: '__other' }, 'Other Google font…'));
  return s;
}
function roleEditor(key, label) {
  const r = get('roles.' + key), info = fontInfo(r.font) || { w: [400, 900], v: 1 };
  const ws = info.v ? null : info.w, wmin = info.w[0], wmax = info.w[info.w.length - 1];
  return h('div', { class: 'role' },
    h('b', {}, label),
    h('div', { class: 'row wide' }, h('label', {}, 'Font'), fontSelect('roles.' + key + '.font')),
    ws && ws.length === 1 ? null : ws ? select('Weight', 'roles.' + key + '.weight', ws.map((w) => [w, String(w)]), { num: true }) : range('Weight', 'roles.' + key + '.weight', wmin, wmax, 50),
    info.it ? toggle('Italic', 'roles.' + key + '.italic') : null,
    select('Case', 'roles.' + key + '.case', [['upper', 'UPPERCASE'], ['asis', 'As typed'], ['title', 'Title Case'], ['lower', 'lowercase']]),
    range('Tracking', 'roles.' + key + '.track', -0.05, 0.6, 0.01),
    range(key === 'hero' ? 'Size' : 'Size vs hero', 'roles.' + key + '.ratio', key === 'hero' ? 0.5 : 0.15, key === 'big' ? 2.4 : 1.2, 0.01),
    paintEditor('Colour', 'roles.' + key + '.paint', { nullable: true, noneLabel: 'Default', leaf: false }));
}

// ── fields ──
function fieldRow(f, i) {
  const el = h('div', { class: 'field' + (selected === f.id ? ' sel' : '') + (f.show === false ? ' off' : ''), 'data-id': f.id, draggable: 'true' });
  el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(i)); el.style.opacity = 0.5; });
  el.addEventListener('dragend', () => (el.style.opacity = 1));
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drag-over'); const from = +e.dataTransfer.getData('text/plain'); if (from === i) return; const fs = clone(doc.fields); const [m] = fs.splice(from, 1); fs.splice(i, 0, m); change('fields', fs, true); });
  const upd = (k, v, rebuild = false) => { const fs = clone(doc.fields); fs[i][k] = v; if (k === 'text') delete fs[i].added; if (k === 'kind' && v === 'logo' && !LOGO_SLOTS.includes(fs[i].slot || 'inside')) fs[i].slot = 'inside'; change('fields', fs, rebuild); };
  const logoInput = () => {
    const file = h('input', { type: 'file', accept: 'image/svg+xml,image/png,image/webp,image/jpeg', style: 'display:none', onchange: async (e) => { const fl = e.target.files[0]; const a = fl && (await readLogo(fl)); if (a) { const fs = clone(doc.fields); Object.assign(fs[i], a); delete fs[i].added; change('fields', fs, true); } } });
    const has = !!(f.src && ASSETS[f.src]);
    return h('div', { class: 'logo-in' }, file,
      h('button', { class: 'btn small', onclick: () => file.click() }, has ? 'Replace logo' : 'Upload logo'),
      h('span', { class: 'logo-name' }, has ? f.name || 'Logo' : f.src ? 'Upload it again: logos stay on the device they were added on' : 'The festival’s official artwork, SVG or PNG'),
      h('label', { title: 'Colour the logo with this line’s paint (best for one-colour artwork: shapes knocked out in another colour fill in). Many festivals ask for their artwork unchanged: check their rules first.' }, h('input', { type: 'checkbox', checked: !!f.tint, onchange: (e) => upd('tint', e.target.checked) }), ' tint'));
  };
  const textInput = f.kind === 'logo' ? logoInput() : f.kind === 'icon'
    ? h('select', { onchange: (e) => upd('text', e.target.value) }, ['star', 'stars', 'crown', 'dot', 'diamond', 'rule'].map((x) => h('option', { value: x, selected: x === f.text }, x)))
    : h('input', { type: 'text', class: f.added ? 'example' : '', title: f.added ? 'Example text from the layout: type over it' : '', value: f.text, placeholder: f.kind, oninput: (e) => { e.target.classList.remove('example'); upd('text', e.target.value); } });
  el.append(
    h('div', { class: 'handle', title: 'Drag to reorder' }, '⋮⋮'),
    h('div', {},
      textInput,
      h('div', { class: 'meta' },
        h('select', { title: 'What it is', onchange: (e) => upd('kind', e.target.value, true) }, KINDS.map((k) => h('option', { value: k, selected: k === f.kind }, k))),
        h('select', { title: 'Size role', onchange: (e) => upd('role', e.target.value) }, ROLES.map(([k, l]) => h('option', { value: k, selected: k === f.role }, l))),
        h('select', { title: 'Where it sits', onchange: (e) => upd('slot', e.target.value) }, (f.kind === 'logo' ? SLOTS.filter(([k]) => LOGO_SLOTS.includes(k)) : SLOTS).map(([k, l]) => h('option', { value: k, selected: k === (f.slot || 'inside') }, l)))),
      h('div', { class: 'flags' },
        h('label', {}, h('input', { type: 'checkbox', checked: f.show !== false, onchange: (e) => upd('show', e.target.checked) }), ' show'),
        f.kind === 'logo' ? null : h('label', { title: 'Join onto the line above (e.g. TRIBECA 2026)' }, h('input', { type: 'checkbox', checked: !!f.join, onchange: (e) => upd('join', e.target.checked) }), ' join above'),
        f.dx || f.dy ? h('button', { class: 'btn small', onclick: () => { const fs = clone(doc.fields); fs[i].dx = 0; fs[i].dy = 0; change('fields', fs, true); } }, 'reset nudge') : null)),
    h('div', { class: 'tools' },
      h('button', { class: 'btn small', title: 'Move up', onclick: () => { if (!i) return; const fs = clone(doc.fields); [fs[i - 1], fs[i]] = [fs[i], fs[i - 1]]; change('fields', fs, true); } }, '↑'),
      h('button', { class: 'btn small', title: 'Remove', onclick: () => { const fs = clone(doc.fields); fs.splice(i, 1); change('fields', fs, true); } }, '×')));
  el.addEventListener('click', () => selectField(f.id));
  return el;
}

// ── panel ──
const sectionsEl = document.getElementById('sections');
const openState = { Presets: true, Text: true };
function sec(title, ...kids) { const d = h('details', { open: !!openState[title] }, h('summary', {}, title), h('div', { class: 'sec' }, ...kids)); d.addEventListener('toggle', () => (openState[title] = d.open)); return d; }
let thumbsDirty = true, thumbTimer = 0;
function buildPanel() {
  const scroll = document.getElementById('panel').scrollTop;
  sectionsEl.innerHTML = '';
  const L = 'layout.', B = 'branch.', LF = 'branch.leaf.', SP = 'branch.spine.', OR = 'branch.orn.';
  const presetBtn = (p) => h('button', { class: 'preset', title: p.name, onclick: () => replaceDoc(applyPreset(p)) }, h('div', { class: 'thumb', 'data-i': PRESETS.indexOf(p) }), h('span', {}, p.name));
  const presetGrid = h('div', { id: 'presets', style: 'display:grid;gap:6px' }, GROUPS.flatMap((g) => [h('div', { class: 'sub' }, `${g} · ${PRESETS.filter((p) => p.group === g).length}`), h('div', { class: 'presets' }, PRESETS.filter((p) => p.group === g).map(presetBtn))]));
  // the layout lit up is the one the words are actually in (so hand edits that land on a layout light it too)
  const sig = (x) => `${x.role || 'eyebrow'}:${x.slot || 'inside'}:${x.join ? 1 : 0}`, vis = doc.fields.filter((f) => f.show !== false && (f.text || f.kind === 'icon' || (f.kind === 'logo' && f.src)));
  const fits = (ln, f) => ln.kind.split('|').includes(f.kind) || (f.kind === 'logo' && ln.role === 'hero'); // a logo can be the name
  const activeId = (LAYOUTS.find((L) => L.lines.length === vis.length && L.lines.every((ln, i) => fits(ln, vis[i]) && sig(ln) === sig(vis[i]))) || {}).id;
  const layoutBtn = (L) => h('button', { class: 'preset' + (activeId === L.id ? ' on' : ''), title: L.note, onclick: () => replaceDoc({ ...applyLayout(doc, L, () => 'f' + ++uid), layoutBy: 'user', userLayoutId: L.id }) }, h('div', { class: 'thumb', 'data-l': LAYOUTS.indexOf(L) }), h('span', {}, L.name), h('small', {}, L.note));
  const layoutGrid = h('div', { id: 'layouts', style: 'display:grid;gap:6px' }, LAYOUT_GROUPS.flatMap((g) => [h('div', { class: 'sub' }, g), h('div', { class: 'presets' }, LAYOUTS.filter((L) => L.group === g).map(layoutBtn))]));
  const family = get(LF + 'family');
  const wreathControls = () => [
      range('Width', SP + 'rx', 0.4, 1.3, 0.01), range('Height', SP + 'ry', 0.4, 1.3, 0.01), range('Start angle', SP + 'a0', 60, 200, 1), range('End angle', SP + 'a1', 160, 300, 1), range('Curl tips', SP + 'curl', -80, 80, 1), range('Spiral', SP + 'spiral', -0.4, 0.6, 0.01), range('Cross stems', SP + 'cross', 0, 50, 1),
      select('Tip gap', SP + 'gap', [['auto', 'Smart'], ...[4, 8, 12, 18, 26, 36].map((g) => [g, String(g)])], { num: false }),
      range('Stem width', 'branch.stem.w', 0, 6, 0.1), range('Stem taper', 'branch.stem.taper', 0, 1, 0.01),
      select('Rows', B + 'rows', [[1, 'Single'], [2, 'Double']], { num: true }),
      h('div', { class: 'sub' }, 'Ornaments'),
      select('Tip', OR + 'tip', [['leaf', 'Leaf'], ['bud', 'Bud'], ['berry', 'Berry'], ['star', 'Star'], ['curl', 'Tendril'], ['none', 'None']]), range('Berries every', OR + 'berries', 0, 4, 1), select('Berries sit', OR + 'berryPos', [['inner', 'Inside'], ['outer', 'Outside'], ['axil', 'In the forks']]), select('Berry shape', OR + 'berryShape', [['dot', 'Round'], ['olive', 'Olive on a stalk'], ['cluster', 'Cluster of three']]), range('Berry size', OR + 'berrySize', 0.4, 2.5, 0.05), range('Flowers every', OR + 'flowers', 0, 5, 1),
      select('Tie at base', OR + 'tie', [['none', 'None'], ['band', 'Band'], ['knot', 'Knot'], ['rosette', 'Rosette'], ['bow', 'Bow'], ['streamers', 'Bow + streamers']]),
      h('div', { class: 'sub' }, 'Mixed wreath'),
      h('div', { class: 'seg' },
        h('button', { class: 'btn small' + (doc.branch.right ? ' on' : ''), onclick: () => { if (doc.branch.right) { const b = clone(doc.branch); delete b.right; change('branch', b, true); } else { const s = shuffleBranch(Date.now() % 100000); change('branch.right', { leaf: s.leaf, orn: { tip: s.orn.tip } }, true); } } }, doc.branch.right ? 'Same both sides' : 'Different right side'),
        doc.branch.right ? h('button', { class: 'btn small', onclick: () => { const s = shuffleBranch(Date.now() % 100000); change('branch.right', { leaf: s.leaf, orn: { tip: s.orn.tip } }, true); } }, 'Shuffle right side') : null)];
  // the badge form: a frame round the words instead of branches
  const FK = get('frame.kind') || 'none', fixed = ['ring', 'oval', 'scallop'].includes(FK);
  const frameControls = () => [
    h('div', { class: 'sub' }, 'Frame'),
    select('Frame', 'frame.kind', Object.entries(FRAMES), { rebuild: true }),
    FK !== 'none' ? [
      FILLABLE_FRAMES.includes(FK) ? toggle('Filled', 'frame.filled', { rebuild: true }) : null,
      FK !== 'corners' ? toggle(FK === 'rules' ? 'Heavy + fine rule' : 'Double line', 'frame.double') : null,
      range('Line weight', 'frame.w', 0.4, 5, 0.1, { def: 1.6 }), range('Line gap', 'frame.gap', 1, 10, 0.1, { def: 3 }),
      fixed || FK === 'rules' ? select('Ornament', 'frame.orn', [['star', 'Star'], ['dot', 'Dot'], ['diamond', 'Diamond'], ['none', 'None']]) : null,
      fixed ? [range('Size', 'frame.size', 0.6, 1.6, 0.01, { def: 1 }), range('Band for curved text', 'frame.band', 0.16, 0.4, 0.01, { def: 0.27 })] : null,
      FK === 'box' ? range('Corner radius', 'frame.radius', 0, 1, 0.01, { def: 0.25 }) : null,
      paintEditor('Frame colour', 'frame.paint', { nullable: true, noneLabel: 'Same as leaves' }),
      get('frame.filled') && FILLABLE_FRAMES.includes(FK) ? paintEditor('Text on the frame', 'frame.ink', { nullable: true, noneLabel: 'Auto (always readable)', leaf: false }) : null,
      h('div', { class: 'hint' }, fixed ? 'Seals carry curved text in their band: put the status on "Arc top" and the year on "Arc under" (or pick the Seal layout).' : 'The frame is sized round your words.'),
    ] : h('div', { class: 'hint' }, 'Text only. The top-tier festivals mostly look like this now: pick a frame for a seal, a medal, a ticket or a film strip.'),
  ];
  sectionsEl.append(
    sec('Presets', presetGrid, h('div', { class: 'hint' }, 'Presets change the look and keep your words.')),
    sec('Layout', layoutGrid, h('div', { class: 'hint' }, 'Layouts move your words and keep the look. Lines a layout leaves out are hidden, not deleted (they come back with the next layout that uses them); new lines arrive with example text to type over.')),
    sec('Text',
      h('div', { id: 'fields', style: 'display:grid;gap:6px' }, doc.fields.map(fieldRow)),
      h('div', { class: 'hint' }, 'Use the festival\'s current official name and the exact wording it gave you (Tribeca dropped "Film" in 2021; Sundance asks for "Sundance Film Festival" in full).'),
      h('div', { class: 'seg' }, ['status', 'festival', 'award', 'category', 'location', 'year', 'edition', 'custom', 'icon', 'logo'].map((k) => h('button', { class: 'btn small', onclick: () => { const fs = clone(doc.fields); fs.push({ id: 'f' + ++uid, kind: k, text: k === 'logo' ? '' : k === 'icon' ? 'star' : k === 'year' ? '2026' : k[0].toUpperCase() + k.slice(1), role: KIND_ROLE[k], slot: 'inside', show: true }); change('fields', fs, true); } }, '+ ' + k))),
      h('div', { class: 'sub' }, 'Fit & spacing'),
      select('Smallest use', L + 'targetPx', [[0, 'No floor'], [600, 'Big: 600 px and up'], [300, 'Medium: 300 px'], [160, 'Poster row: 160 px'], [100, 'Tiny: 100 px']], { num: true }),
      toggle('Auto-widen', L + 'autoWiden'), range('Max hero', L + 'heroMax', 10, 60, 0.5), range('Min small', L + 'minSmall', 3, 14, 0.1),
      range('Air to leaves', L + 'pad', 0, 16, 0.5), range('Air grows ×', L + 'padK', 0, 0.5, 0.01), range('Line spacing', L + 'spacing', 0.4, 2.5, 0.05), range('Wrapped lines', L + 'lineGap', 0, 0.8, 0.01),
      select('Vertical', L + 'dy', [['auto', 'Smart (best fit)'], ['-20', 'High'], ['-8', 'Slightly high'], ['2', 'Centre'], ['12', 'Slightly low'], ['24', 'Low']].map(([a, b]) => [a, b]), { rebuild: false }),
      select('Wrapping', L + 'wrap', [['auto', 'Smart'], ['off', 'Never wrap']]),
      range('Arc top radius', L + 'arcTopR', 0.6, 1.6, 0.01), range('Arc bottom r.', L + 'arcBottomR', 0.3, 1.2, 0.01), range('Arc under r.', L + 'arcUnderR', 0.9, 1.6, 0.01, { def: 1.04 }), range('Ribbon position', L + 'ribbonY', 0.3, 1.1, 0.01), range('Ribbon width', L + 'ribbonW', 0.5, 2, 0.01), range('Badge size', L + 'badgeR', 0.4, 2, 0.01), range('Outside gap', L + 'outerGap', 0, 30, 0.5), range('Flank fill', L + 'flankFill', 0.3, 0.9, 0.01, { def: 0.56 })),
    sec('Wreath',
      h('div', { class: 'seg' }, Object.keys(FORMS).map((k) => h('button', { class: 'btn small' + (doc.form === k ? ' on' : ''), onclick: () => replaceDoc(applyForm(doc, k)) }, { open: 'Open', wreath: 'Wreath', single: 'Single', crown: 'Crown', swoop: 'Swoop', flank: 'Flank', text: 'Badge (no branches)' }[k]))),
      doc.form === 'text' ? frameControls() : wreathControls()),
    doc.form === 'text' ? null : sec('Leaves',
      select('Family', LF + 'family', opt(Object.keys(FAMILIES)), { rebuild: true }),
      ['simple', 'twig', 'trefoil'].includes(family) ? select('Shape', LF + 'profile', opt(Object.keys(PROFILES).filter((k) => k !== 'rachis'))) : null,
      family === 'custom' ? h('div', { class: 'row wide' }, h('label', {}, 'Your shape'), h('textarea', { placeholder: 'Paste any SVG path (d="…"): a leaf, a star, a film frame. Base on the left, tip on the right.', onchange: (e) => change(LF + 'path', e.target.value) }, get(LF + 'path') || '')) : null,
      select('Style', LF + 'style', [['solid', 'Solid'], ['slit', 'Slit (hairline midrib)'], ['carved', 'Carved veins'], ['inline', 'Inline (engraved outline)'], ['engraved', 'Engraved (outline + veins)'], ['hatch', 'Hatched (etching)'], ['split', 'Split two-tone']]),
      range('Fold shading', LF + 'fold', 0, 0.6, 0.01), select('Shaded half', LF + 'foldSide', [[1, 'Lower half'], [-1, 'Upper half']], { num: true }),
      range('Line weight', LF + 'ring', 0.06, 0.3, 0.01),
      range('Count', LF + 'n', 2, 32, 1), range('Size at base', LF + 'L0', 8, 80, 0.5), range('Size at tip', LF + 'L1', 4, 60, 0.5), range('Width', LF + 'wr', 0.08, 1.2, 0.01), range('Swell (middle)', LF + 'bulge', -0.5, 1, 0.01),
      range('Bend', LF + 'bend', -0.4, 0.6, 0.01), range('S-curve', LF + 'scurve', -1, 1, 0.01), range('Fan out', LF + 'fan', -1, 1, 0.01), range('Big–small rhythm', LF + 'alt', 0, 0.6, 0.01), range('Lopsided', LF + 'asym', -0.6, 0.6, 0.01), range('Angle out', LF + 'aOut', 0, 90, 1), range('Angle in', LF + 'aIn', 0, 90, 1), range('Inner size', LF + 'inScale', 0.3, 1.3, 0.01),
      select('Arrangement', LF + 'arr', [['alternate', 'Alternate'], ['paired', 'Paired'], ['outer', 'Outer only'], ['inner', 'Inner only'], ['whorl', 'Whorled']]),
      range('Spacing', LF + 'gamma', 0.5, 1.8, 0.01), range('Stalks', LF + 'petiole', 0, 0.8, 0.01), range('Midrib', LF + 'vein', 0, 0.3, 0.01), range('Natural jitter', LF + 'jitter', 0, 1, 0.01), range('Hand-drawn', LF + 'wobble', 0, 1.5, 0.01),
      toggle('Point to base', LF + 'reverse'),
      h('div', { class: 'row' }, h('label', {}, 'Seed'), h('input', { type: 'number', value: doc.seed, onchange: (e) => change('seed', +e.target.value) }), h('button', { class: 'btn small', onclick: () => change('seed', Math.floor(Math.random() * 99999), true) }, '⚄'))),
    sec('Colour',
      paintEditor('Leaves', 'paint.branch', { leaf: true }),
      paintEditor('Inner leaves', 'paint.inner', { nullable: true, noneLabel: 'Same, dimmed', leaf: true }),
      range('Inner dimming', 'paint.depth', 0, 0.9, 0.01),
      paintEditor('Fold shade', 'paint.shade', { nullable: true, noneLabel: 'Black', leaf: false }),
      paintEditor('Berries & flowers', 'paint.ornament', { nullable: true, noneLabel: 'Same as leaves' }),
      select('Draw', 'paint.mode', [['fill', 'Filled'], ['outline', 'Outline'], ['both', 'Filled + outline']]),
      range('Outline width', 'paint.stroke.w', 0.2, 4, 0.05),
      paintEditor('Outline colour', 'paint.stroke.paint', { nullable: true, noneLabel: 'Same as leaves' }),
      paintEditor('Main text', 'text.paint', { leaf: false }),
      paintEditor('Small text', 'text.sub', { nullable: true, noneLabel: 'Same as main', leaf: false }),
      paintEditor('Ribbon & badge', 'ribbon.paint', { nullable: true, noneLabel: 'Same as leaves' }),
      paintEditor('Text on ribbon', 'ribbon.text', { nullable: true, noneLabel: 'Auto (always readable)', leaf: false }),
      paintEditor('Background', 'canvas.bg', { nullable: true, noneLabel: 'Transparent', leaf: false }),
      h('div', { class: 'sub' }, 'Effects'),
      h('div', { class: 'hint' }, 'Misprint: a second ink off register. Foil: stamped metal catching the light. Letterpress: pressed into the paper. Grain: worn ink.'),
      toggle('Shadow', 'paint.effects.shadow', { rebuild: true }),
      get('paint.effects.shadow') ? [range('Blur', 'paint.effects.shadow.blur', 0, 12, 0.1, { def: 3 }), range('Drop', 'paint.effects.shadow.dy', -6, 12, 0.1, { def: 2 }), range('Strength', 'paint.effects.shadow.opacity', 0, 1, 0.01, { def: 0.55 }), color('Shadow colour', 'paint.effects.shadow.color')] : null,
      toggle('Glow', 'paint.effects.glow', { rebuild: true }),
      get('paint.effects.glow') ? [range('Glow blur', 'paint.effects.glow.blur', 0, 16, 0.1, { def: 6 }), range('Glow strength', 'paint.effects.glow.opacity', 0, 1, 0.01, { def: 0.6 }), color('Glow colour', 'paint.effects.glow.color')] : null,
      toggle('Misprint', 'paint.effects.misreg', { rebuild: true }),
      get('paint.effects.misreg') ? [range('Shift across', 'paint.effects.misreg.dx', -4, 4, 0.1, { def: 1.4 }), range('Shift down', 'paint.effects.misreg.dy', -4, 4, 0.1, { def: 0.9 }), range('Ink strength', 'paint.effects.misreg.opacity', 0, 1, 0.01, { def: 0.8 }), color('Second ink', 'paint.effects.misreg.color')] : null,
      toggle('Foil', 'paint.effects.foil', { rebuild: true }),
      get('paint.effects.foil') ? [range('Shine', 'paint.effects.foil.strength', 0, 1.5, 0.01, { def: 0.75 }), range('Crinkle', 'paint.effects.foil.crinkle', 0, 1, 0.01, { def: 0.5 }), range('Crinkle size', 'paint.effects.foil.size', 0.5, 5, 0.1, { def: 1.6 }), range('Light from', 'paint.effects.foil.light', 0, 360, 1, { def: 235 })] : null,
      toggle('Letterpress', 'paint.effects.press', { rebuild: true }),
      get('paint.effects.press') ? [range('Depth', 'paint.effects.press.depth', 0.2, 2.5, 0.05, { def: 0.8 }), range('Press strength', 'paint.effects.press.strength', 0, 1, 0.01, { def: 0.5 })] : null,
      toggle('Grain', 'paint.effects.grain', { rebuild: true }),
      get('paint.effects.grain') ? [range('Amount', 'paint.effects.grain.amount', 0, 1, 0.01, { def: 0.35 }), range('Speck size', 'paint.effects.grain.size', 0.2, 3, 0.05, { def: 0.6 })] : null,
      toggle('Effects on text', 'paint.effects.text'),
      h('div', { class: 'hint' }, 'Effects are in the PNG and the video. SVG keeps them as filters; PDF leaves them out (printers add foil and letterpress as their own plates).')),
    sec('Type', roleEditor('hero', 'Hero (festival or award)'), roleEditor('eyebrow', 'Eyebrow (status)'), roleEditor('sub', 'Sub (year, location)'), roleEditor('big', 'Big (a big year)'), roleEditor('arc', 'Arc, ribbon & badge')),
    sec('Canvas & export',
      select('Shape', 'canvas.aspect', [[0, 'Fit the laurel'], [1, 'Square 1:1'], [0.8, 'Portrait 4:5'], [0.5625, 'Story 9:16'], [1.7778, 'Wide 16:9'], [0.6667, 'Poster 2:3']], { num: true }),
      range('Padding', 'canvas.pad', 0, 80, 1),
      h('div', { class: 'row wide' }, h('label', {}, 'PNG width'), h('select', { id: 'png-w' }, [1000, 2000, 3000, 4000, 6000].map((w) => h('option', { value: w, selected: w === 3000 }, w + ' px')))),
      h('div', { class: 'row wide' }, h('label', {}, 'Background'), h('select', { id: 'png-bg' }, h('option', { value: '1' }, 'Include'), h('option', { value: '0' }, 'Transparent'))),
      select('SVG text', 'out.svgText', [['outline', 'As shapes (no fonts needed)'], ['live', 'Live text (editable, needs the fonts)']]),
      select('PDF width', 'out.pdfMm', [[50, '50 mm (2 in)'], [75, '75 mm (3 in)'], [100, '100 mm (4 in)'], [150, '150 mm (6 in)'], [200, '200 mm (8 in)']], { num: true }),
      h('div', { class: 'hint' }, 'Vector files are the same at any size; the PDF width is the size it opens at. Outlining fetches the font files once from the Google Fonts library.'),
      h('div', { class: 'hint' }, 'Laurels are for promoting the film itself: some festivals forbid them on merchandise.'),
      h('div', { class: 'seg' }, h('button', { class: 'btn small', onclick: () => { if (confirm('Start over with the default laurel?')) replaceDoc(clone(DEFAULT_DOC)); } }, 'Reset everything'))),
  );
  // the wrapper selects coerce numbers for dy/gap
  sectionsEl.querySelectorAll('select').forEach((s) => s.addEventListener('change', () => { const v = get('layout.dy'); if (typeof v === 'string' && v !== 'auto') set('layout.dy', +v); const g = get('branch.spine.gap'); if (typeof g === 'string' && g !== 'auto') set('branch.spine.gap', +g); }));
  document.getElementById('panel').scrollTop = scroll;
  thumbsDirty = true; schedule();
}

// preset thumbnails: every preset rendered live with the user's own words
// drawn lazily: only the thumbnails scrolled into view are rendered
function drawThumb(el) {
  delete el.dataset.dirty;
  let k = 0; const tmp = () => 'tmp' + k++;
  const d = el.dataset.l != null ? applyLayout(clone(doc), LAYOUTS[+el.dataset.l], tmp) : applyPreset(PRESETS[+el.dataset.i], true, tmp);
  d.canvas.aspect = 1; d.canvas.pad = 10;
  el.innerHTML = render(d, { measure, scale: 1 }).svg; // draw now, sharpen when the fonts arrive
  ensureFonts(d).then(() => { el.innerHTML = render(d, { measure, scale: 1 }).svg; });
}
const thumbIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.target.dataset.dirty) drawThumb(e.target); }), { root: document.getElementById('panel'), rootMargin: '300px' });
function drawThumbs() {
  document.querySelectorAll('#presets .thumb, #layouts .thumb').forEach((el) => { el.dataset.dirty = 1; thumbIO.unobserve(el); thumbIO.observe(el); });
}

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
  }
  if (part === 'colour' || part === 'all') {
    const p = pick(PALETTES);
    d.paint.branch = clone(p.branch); d.paint.inner = p.inner || null; d.text.paint = p.text; d.text.sub = p.sub; d.canvas.bg = p.bg;
    d.paint.mode = r() < 0.12 ? 'outline' : 'fill'; d.paint.depth = +(0.1 + r() * 0.35).toFixed(2);
    for (const k of Object.keys(d.roles)) d.roles[k].paint = null;
  }
  if (part === 'type' || part === 'all') {
    const [hf, sf, hw, sw, hc] = pick(PAIRINGS);
    Object.assign(d.roles.hero, { font: hf, weight: hw, case: hc || 'upper', italic: false });
    Object.assign(d.roles.big, { font: hf, weight: hw });
    for (const k of ['eyebrow', 'sub', 'arc']) Object.assign(d.roles[k], { font: sf, weight: sw, case: 'upper' });
    d.roles.eyebrow.track = d.roles.sub.track = +(0.14 + r() * 0.16).toFixed(2);
  }
  replaceDoc(d);
}
document.getElementById('shuffle-all').onclick = () => shuffle('all');
document.querySelectorAll('[data-shuffle]').forEach((b) => (b.onclick = () => shuffle(b.dataset.shuffle)));

// ── undo / redo ──
function undo() { if (!undoStack.length) return; future.push(JSON.stringify(doc)); doc = JSON.parse(undoStack.pop()); lastSnap = JSON.stringify(doc); buildPanel(); refreshMode(); schedule(); saveHash(); }
function redo() { if (!future.length) return; undoStack.push(JSON.stringify(doc)); doc = JSON.parse(future.pop()); lastSnap = JSON.stringify(doc); buildPanel(); refreshMode(); schedule(); saveHash(); }
const refreshMode = () => { if (MODES[mode] && MODES[mode].refresh) MODES[mode].refresh(); };
document.getElementById('undo').onclick = undo; document.getElementById('redo').onclick = redo;
window.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); e.shiftKey ? redo() : undo(); } });

// ── share link: the whole document, deflated into the URL hash. No server, no account. ──
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pack(o) { const cs = new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(JSON.stringify(o))); w.close(); return b64u(await new Response(cs.readable).arrayBuffer()); }
async function unpack(s) { const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(unb64u(s)); w.close(); return JSON.parse(await new Response(ds.readable).text()); }
let hashTimer = 0;
function saveHash() { clearTimeout(hashTimer); hashTimer = setTimeout(async () => { try { window.history.replaceState(null, '', '#l=' + (await pack(doc))); } catch (e) { /* hash is a convenience */ } }, 500); }
document.getElementById('copy-link').onclick = async () => { const url = location.href.split('#')[0] + '#l=' + (await pack(doc)); try { await navigator.clipboard.writeText(url); toast('Link copied: it holds the whole laurel'); } catch { prompt('Copy this link', url); } };
function toast(msg) { const t = h('div', { style: 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#e3c27a;color:#1a1408;padding:8px 14px;border-radius:999px;font-weight:700;z-index:9' }, msg); document.body.append(t); setTimeout(() => t.remove(), 1800); }

// ── export ──
const download = (blob, name) => { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
const slug = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const fileName = (d = doc) => slug(((d.fields.find((f) => f.role === 'hero' && f.text && f.show !== false) || {}).text) || 'laurel') || 'laurel';
async function svgWithFonts(svg, embed, d = doc) {
  const fams = [...new Set(Object.values(d.roles).map((r) => r.font))];
  const css = embed ? await embedFontCss(fams) : fams.map((f) => `@import url('${cssUrl(f).replace(/&/g, '&amp;')}');`).join('');
  return svg.replace(/^<svg([^>]*)>/, `<svg$1><style>${css}</style>`);
}
// a disclaimer travels inside every vector file (research/01 §2.3, guardrail 9)
const stamp = (svg) => svg.replace(/^<svg([^>]*)>/, '<svg$1><!-- Made with Daphne, the free festival laurel maker by pitch.dog. Not affiliated with or endorsed by any festival: the claim on this laurel is the filmmaker\'s own. -->');
// outlined text when asked (the default), live text with the fonts linked otherwise; falls back to live text offline
async function exportSvgText(svg, d = doc) {
  if ((d.out && d.out.svgText) !== 'live') {
    try { const r = await outlineSvg(svg); if (r.notes.length) toast(`Drawn in ${r.notes.join(', ')} where the font has no glyphs`); return stamp(r.svg); }
    catch (e) { console.warn(e); toast('Couldn\'t fetch the fonts to outline the text: saved with live text'); }
  }
  return stamp(await svgWithFonts(svg, false, d));
}
async function toPng(svgText, vb, width, withBg, d = doc) {
  let svg = svgText;
  if (!withBg) svg = svg.replace(/<rect data-bg="1"[^>]*\/>/, '');
  svg = await svgWithFonts(svg.replace(/width="[^"]+" height="[^"]+"/, `width="${width}" height="${Math.round((width * vb[3]) / vb[2])}"`), true, d);
  const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const c = document.createElement('canvas'); c.width = width; c.height = Math.round((width * vb[3]) / vb[2]);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
async function toPdf(svg, d = doc, title = 'Laurel') {
  toast('Building the PDF…');
  let outl;
  try { outl = (await outlineSvg(svg)).svg; } catch (e) { toast('Couldn\'t fetch the fonts for the PDF: check your connection'); throw e; }
  return svgToPdf(stamp(outl), (d.out && d.out.pdfMm) || 100, { title, subject: 'Festival laurel. Not affiliated with or endorsed by any festival.' });
}
// what the export buttons save depends on the view: the row in Row, the laurel everywhere else
const exporter = () => (MODES[mode].exports || LAUREL_EXPORTS);
const LAUREL_EXPORTS = {
  svg: async () => { const r = render(doc, { measure, scale: 1 }); ctx.download(new Blob([await exportSvgText(r.svg)], { type: 'image/svg+xml' }), fileName() + '.svg'); },
  pdf: async () => { const r = render(doc, { measure, scale: 1 }); ctx.download(await toPdf(r.svg, doc, fileName()), fileName() + '.pdf'); },
  png: async () => { toast('Rendering PNG…'); const w = +(document.getElementById('png-w')?.value || 3000), bg = (document.getElementById('png-bg')?.value || '1') === '1'; const r = render(doc, { measure, scale: 1 }); ctx.download(await toPng(r.svg, r.viewBox, w, bg && !!doc.canvas.bg), fileName() + '.png'); },
};
document.getElementById('dl-svg').onclick = () => exporter().svg().catch((e) => console.warn(e));
document.getElementById('dl-pdf').onclick = () => exporter().pdf().catch((e) => console.warn(e));
document.getElementById('dl-png').onclick = () => exporter().png().catch((e) => console.warn(e));

// ── views: the laurel, on the poster, a row, motion ──
const modebar = document.getElementById('modebar'), modepanel = document.getElementById('modepanel');
const ctx = {
  get doc() { return doc; }, change, replaceDoc, schedule, clone, merge, h, toast, download, measure, render: (d, scale = 1) => render(d, { measure, scale }),
  ensureFonts, svgWithFonts, exportSvgText, toPng, toPdf, fileName, slug, stamp, ASSETS, saveAssets, stage, modebar, modepanel, showNotes, layoutFields, layoutById, LAYOUTS,
  pushUndo: () => { undoStack.push(lastSnap); future.length = 0; }, settle: () => { lastSnap = JSON.stringify(doc); saveHash(); }, rebuild: () => buildPanel(), get last() { return last; },
  fixNote: null,
  // size an SVG to the stage, keeping its shape (no letterboxing)
  fit: (svg, vb) => { stage.classList.add('fitted'); const sw = document.getElementById('stagewrap'), k = Math.min((sw.clientWidth - 48) / vb[2], (sw.clientHeight - 48) / vb[3]); Object.assign(svg.style, { width: Math.max(1, vb[2] * k) + 'px', height: Math.max(1, vb[3] * k) + 'px', maxWidth: 'none', maxHeight: 'none' }); },
};
const MODES = {
  laurel: { draw: (r) => { stage.className = 'stage'; stage.innerHTML = r.svg; decorateStage(); }, enter() { modebar.append(h('span', { class: 'hint' }, 'Drag any line to nudge it · double-click to reset')); } },
  poster: posterMode(ctx), row: rowMode(ctx), motion: motionMode(ctx),
};
let mode = 'laurel';
function setMode(m) {
  if (!MODES[m] || m === mode && modebar.childElementCount) { return; }
  if (MODES[mode].leave) MODES[mode].leave();
  mode = m; ctx.fixNote = null;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  modebar.innerHTML = ''; modepanel.innerHTML = '';
  if (MODES[m].enter) MODES[m].enter();
  modebar.classList.toggle('on', !!modebar.childElementCount); modepanel.classList.toggle('on', !!modepanel.childElementCount);
  showNotes([]); schedule();
  try { sessionStorage.setItem('daphne.mode', m); } catch (e) { /* a convenience */ }
}
document.querySelectorAll('#modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

// ── boot ──
(async () => {
  const m = location.hash.match(/#l=([\w-]+)/);
  if (m) { try { doc = merge(clone(DEFAULT_DOC), await unpack(m[1])); } catch { doc = applyPreset(PRESETS[0]); } }
  else doc = applyPreset(PRESETS[0]);
  lastSnap = JSON.stringify(doc);
  buildPanel();
  let m0 = 'laurel'; try { m0 = sessionStorage.getItem('daphne.mode') || 'laurel'; } catch (e) { /* a convenience */ }
  mode = ''; MODES[''] = {}; setMode(MODES[m0] ? m0 : 'laurel'); delete MODES[''];
  schedule();
  setTimeout(() => preloadOutlines(doc.roles).catch(() => null), 2500); // warm the shaper for the first SVG or PDF
  window.__laurel = { get doc() { return doc; }, render: (d) => render(d || doc, { measure }), PRESETS, applyPreset, measure, setMode, get mode() { return mode; }, ctx, MODES };
})();
