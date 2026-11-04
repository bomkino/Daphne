// row.js — the row builder: several laurels in the current look, the way a poster carries them. The same type size in
// every laurel, a shared center line, prestige order (wins, then premieres, then selections, biggest names first), a
// tiered layout with a lead laurel, official artwork placed alongside, and the festival rules checked across the row.
import { STATUSES, prestige, checkRow } from './rules.js';
import { zip } from './zip.js';

export const ROW_DEFAULT = {
  items: [
    { id: 'r1', status: 'Official Selection', festival: 'Northlight', award: '', year: '2026' },
    { id: 'r2', status: 'Winner', festival: 'Halcyon Film Festival', award: 'Best Documentary', year: '2026' },
    { id: 'r3', status: 'World Premiere', festival: 'Atlas Film Festival', award: '', year: '2026' },
    { id: 'r4', status: 'Nominee', festival: 'Meridian', award: 'Best Editing', year: '2026' },
  ],
  arrange: 'row', perRow: 4, order: 'prestige', uniform: true, gap: 0.14, lead: 1.3,
};
const AWARD_LAYOUTS = ['winner', 'award-detail', 'award-festival-hero', 'star-winner'];

// pasted rows from a spreadsheet: tabs, commas, semicolons or pipes; each cell is recognized by what it looks like
const YEAR = /^(19|20)\d\d$/, AWARDISH = /\b(best|award|prize|jury|audience|mention|grand|golden|silver|bronze|honou?rable)\b/i;
const STATUSISH = /\b(official selection|selection|selected|winner|won|nominee|nominated|finalist|semi-?finalist|premiere|in competition|competition|opening night|closing night|special mention|honou?rable mention|official submission|submitted|laureate)\b/i;
export function parsePaste(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const sep = ['\t', '|', ';', ','].find((c) => lines.every((l) => l.includes(c))) || (lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',');
  const rows = lines.map((l) => splitRow(l, sep));
  // a header row names the columns
  const head = rows[0].map((c) => c.toLowerCase());
  const named = head.some((c) => /^(status|festival|award|year|category|prize|name)$/.test(c));
  if (named) {
    const col = (re) => head.findIndex((c) => re.test(c));
    const ci = { status: col(/status|laurel|result/), festival: col(/festival|name|event/), award: col(/award|prize|category/), year: col(/year|date/) };
    return rows.slice(1).map((r) => ({ status: r[ci.status] || '', festival: r[ci.festival] || '', award: r[ci.award] || '', year: (r[ci.year] || '').match(/(19|20)\d\d/)?.[0] || '' }));
  }
  return rows.map((cells) => {
    const it = { status: '', festival: '', award: '', year: '' }, rest = [];
    for (const c of cells.map((x) => x.trim()).filter(Boolean)) {
      if (!it.year && YEAR.test(c)) it.year = c;
      else if (!it.status && STATUSISH.test(c) && !AWARDISH.test(c.replace(STATUSISH, ''))) it.status = c;
      else if (!it.award && AWARDISH.test(c) && !/festival|film fest|\bff\b/i.test(c)) it.award = c;
      else rest.push(c);
    }
    it.festival = rest.shift() || ''; if (rest.length && !it.award) it.award = rest.shift();
    // "Festival 2026" in one cell
    const m = it.festival.match(/^(.*?)\s+((?:19|20)\d\d)$/); if (m && !it.year) { it.festival = m[1]; it.year = m[2]; }
    return it;
  });
}
function splitRow(l, sep) {
  if (sep !== ',') return l.split(sep).map((c) => c.trim());
  const out = []; let cur = '', q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim()); return out;
}

export function rowMode(ctx) {
  const { h, clone } = ctx;
  let uid = 100, lastScene = null, tableEl = null, cache = new Map();
  // a fresh copy every time: edits change the copy, and change() sees the difference, so they redraw, save and undo
  const R = () => clone({ ...ROW_DEFAULT, ...(ctx.doc.row || {}) });
  const setRow = (r, rebuild = false) => { ctx.change('row', r); if (rebuild) buildPanel(); };

  // one laurel of the row: the current look with this row's words. Award rows use an award layout (the user's, if the
  // look is already in one); other rows use the user's own layout. Lines the row doesn't fill (a logo, a category) are hidden.
  function itemDoc(base, it) {
    const d = clone(base); for (const k of ['row', 'poster', 'motion']) delete d[k];
    let k = 0; const nid = () => 'rw' + k++;
    const lay = (id) => ctx.layoutById(id);
    const inAward = AWARD_LAYOUTS.includes(base.userLayoutId || base.layoutId), logoIsName = base.fields.some((f) => f.kind === 'logo' && f.src && f.show !== false && f.role === 'hero');
    // this laurel's own words go in first, so a layout chooses from them: an award the base had and this laurel
    // doesn't must not take the name line from the festival
    const vals = { status: it.status, festival: it.festival, award: it.award, year: it.year };
    const fill = (fs) => fs.map((f) => {
      // a row has no logos, so a name the look hid behind a logo comes back
      if (f.kind in vals) { const v = String(vals[f.kind] || '').trim(), { added, ...g } = f; return { ...g, text: v, show: (f.show !== false || added || (logoIsName && f.kind === 'festival')) && !!v }; }
      if (f.kind === 'icon') return f;
      return { ...f, show: false };
    });
    const baseAward = d.fields.some((f) => f.kind === 'award' && f.show !== false);
    let fields = fill(d.fields);
    if (it.award && !baseAward) fields = ctx.layoutFields(fields, lay(inAward ? base.userLayoutId || base.layoutId : 'winner'), nid);
    if (!it.award && baseAward) fields = ctx.layoutFields(fields, lay(!inAward && base.userLayoutId ? base.userLayoutId : 'year-below'), nid);
    d.fields = fill(fields);
    return d;
  }
  const renderCached = (d) => { const key = JSON.stringify(d); let r = cache.get(key); if (!r) { r = ctx.render(d, 1); cache.set(key, r); if (cache.size > 64) cache.delete(cache.keys().next().value); } return r; };

  // the row as placed laurels: { parts: [{ it, r?, x, y, w, h, s }], vb, svg }
  function scene(opts = {}) {
    const row = R(), base = ctx.doc;
    let items = row.items.filter((it) => it.show !== false && (it.src ? ctx.ASSETS[it.src] : it.festival || it.award || it.status));
    if (row.order === 'prestige') items = [...items].sort((a, b) => prestige(b) - prestige(a));
    items = [...items.filter((it) => it.lead), ...items.filter((it) => !it.lead)];
    if (!items.length) return null;
    // laurels first, at the same type size if asked
    let docs = items.map((it) => (it.src ? null : itemDoc(base, it)));
    let rs = docs.map((d) => (d ? renderCached(d) : null));
    if (row.uniform) { const H = Math.min(...rs.filter(Boolean).map((r) => r.report.hero)); if (isFinite(H)) { docs = docs.map((d) => { if (!d) return d; d.layout = { ...d.layout, heroMax: H }; return d; }); rs = docs.map((d) => (d ? renderCached(d) : null)); } }
    const hs = rs.filter(Boolean).map((r) => r.viewBox[3]).sort((a, b) => a - b), unitH = hs.length ? hs[Math.floor(hs.length / 2)] : 200;
    const tiered = row.arrange === 'tiered' && items.length > 1;
    const parts = items.map((it, i) => {
      const s = tiered && i === 0 ? row.lead : 1;
      if (it.src) { const hh = unitH * 0.78 * s * (it.scale || 1), ww = hh * (it.ar || 1); return { it, art: true, w: ww, h: hh, top: -hh / 2, s }; }
      const [vx, vy, vw, vh] = rs[i].viewBox; return { it, r: rs[i], d: docs[i], w: vw * s, h: vh * s, top: vy * s, s };
    });
    // lines: a single row, or wrapped every perRow (the lead takes a line of its own when tiered)
    const per = row.arrange === 'row' ? parts.length : Math.max(1, row.perRow | 0), lines = [];
    let rest = parts; if (tiered) { lines.push([parts[0]]); rest = parts.slice(1); }
    for (let i = 0; i < rest.length; i += per) lines.push(rest.slice(i, i + per));
    const gap = unitH * row.gap, lineW = lines.map((ln) => ln.reduce((a, p) => a + p.w, 0) + gap * (ln.length - 1)), W = Math.max(...lineW);
    let y = 0;
    for (const [li, ln] of lines.entries()) {
      const top = Math.min(...ln.map((p) => p.top)), bot = Math.max(...ln.map((p) => p.top + p.h));
      let x = (W - lineW[li]) / 2;
      for (const p of ln) { p.x = x; p.y = y - top + p.top; x += p.w + gap; }
      y += bot - top + gap * 0.9;
    }
    const H = y - gap * 0.9, pad = unitH * 0.06, vb = [-pad, -pad, W + 2 * pad, H + 2 * pad];
    const bg = opts.bg && base.canvas.bg ? (typeof base.canvas.bg === 'string' ? base.canvas.bg : null) : null;
    const strip = (svg) => svg.replace(/<rect data-bg="1"[^>]*\/>/, '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const inner = parts.map((p) => p.art
      ? `<image href="${ctx.ASSETS[p.it.src]}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="xMidYMid meet"/>`
      : `<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${p.r.viewBox.join(' ')}" overflow="visible">${strip(p.r.svg)}</svg>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${bg ? `<rect data-bg="1" x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${bg}"/>` : ''}${inner}</svg>`;
    return { parts, vb, svg, unitH };
  }
  ctx.rowScene = scene;
  // official artwork from elsewhere (the laurel fixer): joins the row at the same height as the rest
  ctx.addRowArt = (a) => { const r = R(); r.items.push({ id: 'r' + ++uid + Date.now().toString(36), ...a }); ctx.change('row', r); };

  // ── the panel ──
  const fileInput = h('input', { type: 'file', accept: 'image/svg+xml,image/png,image/webp,image/jpeg', style: 'display:none', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; const a = await readArt(f); if (a) { const r = R(); r.items.push({ id: 'r' + ++uid + Date.now().toString(36), ...a, festival: '', status: '', award: '', year: '' }); setRow(r, true); } e.target.value = ''; } });
  async function readArt(file) {
    if (file.size > 3 * 1024 * 1024) { alert('That file is over 3 MB. Export the artwork smaller (an SVG, or a PNG about 1500 px wide) and try again.'); return null; }
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
    let ar = 0;
    if (/svg/.test(file.type)) { const t = await file.text(), vb = t.match(/viewBox\s*=\s*["']\s*[-\d.e]+[\s,]+[-\d.e]+[\s,]+([\d.e]+)[\s,]+([\d.e]+)/i); if (vb && +vb[2]) ar = +vb[1] / +vb[2]; }
    if (!ar) ar = await new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth / im.naturalHeight || 1); im.onerror = () => ok(1); im.src = url; });
    const key = 'asset:art' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    ctx.ASSETS[key] = url;
    return { src: key, ar: Math.round(ar * 1000) / 1000, name: file.name };
  }
  function buildPanel() {
    const P = ctx.modepanel; P.innerHTML = '';
    const row = R();
    const seg = (label, key, opts) => h('label', {}, label, h('select', { onchange: (e) => { const r = R(); r[key] = /^(perRow)$/.test(key) ? +e.target.value : e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value; setRow(r, true); } }, opts.map(([v, l]) => h('option', { value: String(v), selected: String(row[key]) === String(v) }, l))));
    const pasteBox = h('div', { class: 'paste', style: 'display:none' },
      h('div', { class: 'hint' }, 'Paste rows from a spreadsheet or type one laurel per line: status, festival, award, year in any order (tabs, commas or | between them). A header row (Status, Festival, Award, Year) is used if there is one.'),
      h('textarea', { rows: 5, placeholder: 'Official Selection | Northlight | 2026\nWinner | Best Documentary | Halcyon Film Festival | 2026' }),
      h('div', { class: 'rowtools' },
        h('button', { class: 'btn small primary', onclick: () => { const t = pasteBox.querySelector('textarea').value, got = parsePaste(t); if (!got.length) return; const r = R(); r.items = r.items.filter((it) => it.src).concat(got.map((g) => ({ id: 'r' + ++uid + Date.now().toString(36), ...g }))); setRow(r, true); } }, 'Replace the row'),
        h('button', { class: 'btn small', onclick: () => { const t = pasteBox.querySelector('textarea').value, got = parsePaste(t); if (!got.length) return; const r = R(); r.items.push(...got.map((g) => ({ id: 'r' + ++uid + Date.now().toString(36), ...g }))); setRow(r, true); } }, 'Add to the row'),
        h('button', { class: 'btn small', onclick: () => (pasteBox.style.display = 'none') }, 'Close')));
    P.append(
      h('div', { class: 'rowtools' },
        seg('Arrange', 'arrange', [['row', 'One row'], ['tiered', 'Tiered: lead on top'], ['grid', 'Grid']]),
        row.arrange !== 'row' ? seg('Per row', 'perRow', [2, 3, 4, 5, 6].map((n) => [n, String(n)])) : null,
        seg('Order', 'order', [['prestige', 'By prestige'], ['manual', 'As listed']]),
        seg('Type', 'uniform', [[true, 'Same size in every laurel'], [false, 'Fit each one']]),
        h('label', {}, 'Gap', h('input', { type: 'range', min: 0, max: 0.6, step: 0.01, value: row.gap, oninput: (e) => { const r = R(); r.gap = +e.target.value; ctx.change('row', r); } })),
        row.arrange === 'tiered' ? h('label', {}, 'Lead size', h('input', { type: 'range', min: 1, max: 1.8, step: 0.01, value: row.lead, oninput: (e) => { const r = R(); r.lead = +e.target.value; ctx.change('row', r); } })) : null),
      tableEl = table(row),
      h('div', { class: 'rowtools' },
        h('button', { class: 'btn small', onclick: () => { const r = R(); r.items.push({ id: 'r' + ++uid + Date.now().toString(36), status: 'Official Selection', festival: '', award: '', year: String(new Date().getFullYear()) }); setRow(r, true); setTimeout(() => { const ins = P.querySelectorAll('tr.item input[data-k="festival"]'); ins[ins.length - 1]?.focus(); }, 30); } }, '+ Laurel'),
        h('button', { class: 'btn small', title: 'A festival’s own laurel file, placed in the row at the same height', onclick: () => fileInput.click() }, '+ Official artwork'),
        h('button', { class: 'btn small', onclick: () => { pasteBox.style.display = pasteBox.style.display === 'none' ? 'grid' : 'none'; } }, 'Paste from a spreadsheet'),
        h('span', { class: 'grow', style: 'flex:1' }),
        h('button', { class: 'btn small', title: 'Every laurel as its own SVG and PNG, drawn at the same scale so the type matches when placed', onclick: zipAll }, 'ZIP of separate files'), fileInput),
      pasteBox);
  }
  let rowDrag = null;
  function table(row) {
    const order = row.order === 'prestige' ? new Map([...row.items].sort((a, b) => prestige(b) - prestige(a)).map((it, i) => [it.id, i + 1])) : null;
    const tb = h('tbody');
    row.items.forEach((it, i) => {
      const upd = (k, v, rebuild = false) => { const r = R(); r.items[i] = { ...r.items[i], [k]: v }; setRow(r, rebuild); };
      const inp = (k, ph, w) => h('input', { type: 'text', value: it[k] || '', placeholder: ph, 'data-k': k, style: w ? `width:${w}` : '', list: k === 'status' ? 'row-statuses' : null, oninput: (e) => upd(k, e.target.value) });
      const tr = h('tr', { class: 'item' + (it.show === false ? ' off' : ''), draggable: 'true' },
        h('td', { class: 'handle', title: order ? `Prestige order: ${order.get(it.id)}. Drag to set your own order` : 'Drag to reorder' }, '⋮⋮'),
        it.src
          ? [h('td', { colspan: 2 }, h('div', { class: 'art' }, h('img', { src: ctx.ASSETS[it.src] || '', alt: '' }), h('span', {}, ctx.ASSETS[it.src] ? (it.name || 'Official artwork') : 'Upload it again: artwork stays on the device it was added on'))),
             h('td', {}, inp('festival', 'Which festival? (for the rules check)')), h('td', {}, inp('year', 'Year', '64px'))]
          : [h('td', {}, inp('status', 'Status')), h('td', {}, inp('festival', 'Festival')), h('td', {}, inp('award', 'Award (if it won)')), h('td', {}, inp('year', 'Year', '64px'))],
        h('td', {}, h('label', { title: 'Lead laurel: first in the row, and on top when tiered' }, h('input', { type: 'checkbox', checked: !!it.lead, onchange: (e) => upd('lead', e.target.checked, true) }), ' lead')),
        h('td', {}, h('input', { type: 'checkbox', title: 'Show', checked: it.show !== false, onchange: (e) => upd('show', e.target.checked, true) })),
        h('td', {}, h('button', { class: 'btn small', title: 'Remove', onclick: () => { const r = R(); r.items.splice(i, 1); setRow(r, true); } }, '×')));
      // only a row's own drag reorders: text dropped from anywhere stays text
      tr.addEventListener('dragstart', (e) => { if (e.target !== tr) return; rowDrag = it.id; e.dataTransfer.setData('application/x-daphne-row', it.id); e.dataTransfer.effectAllowed = 'move'; });
      tr.addEventListener('dragend', () => { rowDrag = null; });
      tr.addEventListener('dragover', (e) => { if (!rowDrag) return; e.preventDefault(); tr.classList.add('drag-over'); });
      tr.addEventListener('dragleave', () => tr.classList.remove('drag-over'));
      tr.addEventListener('drop', (e) => {
        tr.classList.remove('drag-over'); if (!rowDrag) return; e.preventDefault();
        const r = R(), from = r.items.findIndex((x) => x.id === rowDrag), to = r.items.findIndex((x) => x.id === it.id); rowDrag = null;
        if (from < 0 || to < 0 || from === to) return;
        const [m] = r.items.splice(from, 1); r.items.splice(to, 0, m); r.order = 'manual'; setRow(r, true);
      });
      tb.append(tr);
    });
    return h('table', { class: 'rowtable' }, h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Status'), h('th', {}, 'Festival'), h('th', {}, 'Award'), h('th', {}, 'Year'), h('th', {}), h('th', {}), h('th', {}))), tb,
      h('datalist', { id: 'row-statuses' }, STATUSES.map((s) => h('option', { value: s }))));
  }

  // ── exports ──
  const withBg = () => (ctx.prefs ? ctx.prefs().bg : true) !== false;
  async function zipAll() {
    const sc = scene(); if (!sc) return;
    ctx.toast('Packing the row…');
    const files = [], pxPerUnit = 1200 / sc.unitH;
    let n = 0;
    for (const p of sc.parts) {
      const name = String(++n).padStart(2, '0') + '-' + (ctx.slug(p.it.festival || p.it.award || p.it.name || 'laurel') || 'laurel');
      if (p.art) { const m = /^data:([^;]+);/.exec(ctx.ASSETS[p.it.src]); const ext = m ? { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }[m[1]] || 'png' : 'png'; files.push({ name: `${name}-official.${ext}`, data: await (await fetch(ctx.ASSETS[p.it.src])).blob() }); continue; }
      const svg = withBg() ? p.r.svg : p.r.svg.replace(/<rect data-bg="1"[^>]*\/>/, '');
      files.push({ name: name + '.svg', data: await ctx.exportSvgText(svg, p.d) });
      files.push({ name: name + '.png', data: await ctx.toPng(p.r.svg, p.r.viewBox, Math.round(p.r.viewBox[2] * pxPerUnit * p.s), withBg() && !!ctx.doc.canvas.bg, p.d) });
    }
    files.push({ name: 'README.txt', data: `A row of festival laurels made with Daphne (pitch.dog/daphne).\n\nEvery PNG here is drawn at the same scale (${pxPerUnit.toFixed(2)} px per unit), so the type is the same size in each: place them at 100% and they match. The SVGs share one coordinate system for the same reason.\n\nOrder: ${R().order === 'prestige' ? 'by prestige (wins, then premieres, then selections)' : 'as you listed them'}.\n\nNot affiliated with or endorsed by any festival: each claim is the filmmaker's own. Where a festival supplies official artwork, use it.\n` });
    ctx.download(await zip(files), 'laurel-row.zip');
  }
  const exports = {
    zip: zipAll,
    svg: async () => { const sc = scene({ bg: withBg() }); if (!sc) return; ctx.download(new Blob([await ctx.exportSvgText(sc.svg)], { type: 'image/svg+xml' }), 'laurel-row.svg'); },
    pdf: async () => { const sc = scene({ bg: withBg() }); if (!sc) return; ctx.download(await ctx.toPdf(sc.svg, ctx.doc, 'Laurel row'), 'laurel-row.pdf'); },
    png: async () => { const sc = scene({ bg: withBg() }); if (!sc) return; ctx.toast('Rendering the row…'); const w = +((ctx.prefs && ctx.prefs().pngW) || 3000); ctx.download(await ctx.toPng(sc.svg, sc.vb, Math.max(w, 2000), withBg() && !!ctx.doc.canvas.bg), 'laurel-row.png'); },
  };

  return {
    exports,
    refresh() { buildPanel(); },
    enter() { buildPanel(); ctx.fixNote = (fix) => { const [k, id] = fix.split(':'); if (k === 'lead') { const r = R(); r.items = r.items.map((it) => ({ ...it, lead: it.id === id })); setRow(r, true); } }; },
    leave() { ctx.fixNote = null; tableEl = null; },
    draw() {
      const sc = scene({ bg: true }); lastScene = sc;
      ctx.stage.className = 'stage';
      ctx.stage.innerHTML = sc ? sc.svg : '<div class="poster-empty"><b>The row is empty</b><div>Add a laurel or paste a list from a spreadsheet below.</div></div>';
      if (sc) ctx.fit(ctx.stage.querySelector('svg'), sc.vb);
      ctx.showNotes(sc ? checkRow(sc.parts.map((p) => ({ ...p.it, scale: p.s }))) : []);
    },
  };
}
