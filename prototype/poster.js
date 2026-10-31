// poster.js — the laurel on the filmmaker's own poster. Drag it into place, size it, read the contrast against what's
// actually behind it, let the ink follow the artwork (auto ink), take colors from the poster, and see it at 160 px.
// The poster stays in this browser (like logos): share links carry only where the laurel sits.
import { METALS } from './engine.mjs';

const DEFAULT = { x: 0.5, y: 0.2, w: 0.34, autoInk: false, actual: false };
const MAXSIDE = 2400;

// ── color math ──
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const rgbOf = (c) => { const m = /^#?([\da-f]{6})$/i.exec(String(c).trim()); if (!m) return [200, 200, 200]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
function hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function fromHsl(h, s, l) { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return hex(f(0) * 255, f(8) * 255, f(4) * 255); }
const withL = (c, l, sMul = 1) => { const [h, s] = hsl(rgbOf(c)); return fromHsl(h, Math.min(1, s * sMul), l); };
// the paint's typical color (what the eye reads at a distance)
const inkOf = (p) => (!p ? '#000000' : typeof p === 'string' ? p : p.type === 'solid' ? p.color : p.type === 'metal' ? (METALS[p.metal] || METALS.gold)[2][1] : p.stops[Math.floor(p.stops.length / 2)][1]);

// k-means on a small copy of the poster: the colors it's made of, most used first
function paletteOf(px, k = 6) {
  const pts = []; for (let i = 0; i < px.length; i += 4 * 3) if (px[i + 3] > 200) pts.push([px[i], px[i + 1], px[i + 2]]);
  if (!pts.length) return [];
  const cs = [pts[Math.floor(pts.length / 2)]];
  while (cs.length < k) { let best = null, bd = -1; for (let i = 0; i < pts.length; i += 7) { const p = pts[i]; const d = Math.min(...cs.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2)); if (d > bd) { bd = d; best = p; } } cs.push([...best]); }
  let as = new Array(pts.length).fill(0);
  for (let it = 0; it < 8; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => { let bi = 0, bd = Infinity; cs.forEach((c, j) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = j; } }); as[i] = bi; const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    sum.forEach((s, j) => { if (s[3]) cs[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  const counts = cs.map(() => 0); as.forEach((a) => counts[a]++);
  return cs.map((c, j) => ({ c: hex(...c), share: counts[j] / pts.length, sat: hsl(c)[1], l: hsl(c)[2] })).filter((x) => x.share > 0.01).sort((a, b) => b.share - a.share);
}

export function posterMode(ctx) {
  const { h } = ctx;
  let img = null, imgKey = '', data = null, layer = null, wrap = null, actualBusy = 0, suggestKey = '';
  const P = () => ({ ...DEFAULT, ...(ctx.doc.poster || {}) });
  const has = () => !!(P().src && ctx.ASSETS[P().src]);

  // a small copy of the poster to sample from
  async function load() {
    const src = P().src; if (!src || !ctx.ASSETS[src]) { img = null; data = null; imgKey = ''; return; }
    if (imgKey === src && img) return;
    img = new Image(); img.src = ctx.ASSETS[src]; await img.decode(); imgKey = src;
    const s = Math.min(1, 180 / Math.max(img.naturalWidth, img.naturalHeight)), sw = Math.max(1, Math.round(img.naturalWidth * s)), sh = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, sw, sh);
    const px = x.getImageData(0, 0, sw, sh).data;
    data = { sw, sh, px, palette: paletteOf(px) };
  }

  // where the laurel sits, as fractions of the poster
  const box = (vb) => { const p = P(), ar = img ? img.naturalWidth / img.naturalHeight : 0.67, hf = p.w * ar * (vb[3] / vb[2]); return { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - hf / 2, y1: p.y + hf / 2, hf }; };
  // what's behind the laurel: luminances (for contrast), mean color and how busy it is
  function behind(vb) {
    if (!data) return null;
    const b = box(vb), { sw, sh, px } = data, L = [], X0 = Math.max(0, Math.floor(b.x0 * sw)), X1 = Math.min(sw - 1, Math.ceil(b.x1 * sw)), Y0 = Math.max(0, Math.floor(b.y0 * sh)), Y1 = Math.min(sh - 1, Math.ceil(b.y1 * sh));
    let r = 0, g = 0, bl = 0;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = (y * sw + x) * 4; L.push(relLum([px[i], px[i + 1], px[i + 2]])); r += px[i]; g += px[i + 1]; bl += px[i + 2]; }
    if (!L.length) return null;
    const n = L.length, mean = L.reduce((a, v) => a + v, 0) / n, sd = Math.sqrt(L.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
    return { L, mean, sd, rgb: [r / n, g / n, bl / n] };
  }
  // contrast of an ink against what's behind: the worst tenth (what fails first) and the middle
  function contrastOf(ink, bh) {
    const li = relLum(rgbOf(ink)), rs = bh.L.map((l) => ratio(li, l)).sort((a, b) => a - b);
    return { worst: rs[Math.floor(rs.length * 0.1)], mid: rs[Math.floor(rs.length / 2)] };
  }
  const verdict = (c) => (c.worst >= 4.5 ? ['good', 'reads well'] : c.worst >= 3 ? ['', 'readable when large'] : ['bad', 'hard to read here']);

  // ── auto ink: the most readable ink, preferring the poster's own colors and the current metal ──
  function pickInk(bh) {
    const d = ctx.doc, cur = d.paint.branch, cands = [];
    const darkBg = bh.mean < 0.35;
    for (const sw of (data.palette || []).slice(0, 6)) { cands.push({ ink: withL(sw.c, darkBg ? 0.88 : 0.14, darkBg ? 0.7 : 1.1), poster: sw.share }); cands.push({ ink: withL(sw.c, darkBg ? 0.78 : 0.24, 0.9), poster: sw.share * 0.8 }); }
    cands.push({ ink: '#ffffff' }, { ink: '#f6eedd' }, { ink: '#121212' });
    if (cur && cur.type === 'metal') cands.push({ metal: cur.metal, keep: true });
    for (const m of darkBg ? ['gold', 'champagne', 'platinum', 'silver'] : ['onyx', 'bronze', 'antique']) cands.push({ metal: m });
    let best = null;
    for (const c of cands) {
      const ink = c.metal ? METALS[c.metal][2][1] : c.ink, k = contrastOf(ink, bh);
      const score = Math.min(k.worst, 7) + Math.min(k.mid, 12) * 0.08 + (c.poster ? 0.9 + c.poster : 0) + (c.keep ? 1.2 : 0) + (c.metal && !c.keep ? 0.3 : 0) - (k.worst < 3 ? 4 : 0);
      if (!best || score > best.score) best = { ...c, ink, k, score };
    }
    return best;
  }
  function inkPatch(best, bh) {
    const paint = best.metal ? { type: 'metal', metal: best.metal, scope: (ctx.doc.paint.branch && ctx.doc.paint.branch.scope) || 'leaf', angle: (ctx.doc.paint.branch && ctx.doc.paint.branch.angle) ?? 28 } : best.ink;
    const text = best.metal ? METALS[best.metal][2][1] : best.ink;
    const fx = { ...(ctx.doc.paint.effects || {}) };
    // a busy patch of poster gets a soft halo so the edges hold
    if (bh.sd > 0.16 && !fx.shadow && !fx.glow) { if (relLum(rgbOf(best.ink)) > 0.4) fx.shadow = { blur: 2.6, dy: 0.8, opacity: 0.7, color: '#000000' }; else fx.glow = { blur: 3, opacity: 0.6, color: '#ffffff' }; }
    return { branch: paint, text, fx };
  }
  function applyInk(patch) {
    const d = ctx.doc;
    d.paint.branch = patch.branch; d.paint.inner = null; d.paint.ornament = null; d.paint.effects = patch.fx;
    d.text.paint = patch.text; d.text.sub = patch.text;
    for (const r of Object.values(d.roles)) if (r) r.paint = null;
  }
  function autoInk(commit = true) {
    if (!P().autoInk || !data) return;
    const r = ctx.last; if (!r) return;
    const bh = behind(r.viewBox); if (!bh) return;
    const best = pickInk(bh), patch = inkPatch(best, bh);
    if (JSON.stringify(patch.branch) === JSON.stringify(ctx.doc.paint.branch) && patch.text === ctx.doc.text.paint) return;
    if (commit) ctx.pushUndo();
    applyInk(patch);
    if (commit) { ctx.settle(); ctx.rebuild(); }
    ctx.schedule();
  }
  function setAuto(on) {
    const d = ctx.doc; ctx.pushUndo();
    d.poster = { ...P(), ...(d.poster || {}) };
    if (on) { d.poster.saved = { paint: ctx.clone(d.paint), text: ctx.clone(d.text), roles: Object.fromEntries(Object.entries(d.roles).map(([k, r]) => [k, r && r.paint ? ctx.clone(r.paint) : null])) }; d.poster.autoInk = true; }
    else { const s = d.poster.saved; if (s) { d.paint = s.paint; d.text = s.text; for (const [k, p] of Object.entries(s.roles || {})) if (d.roles[k]) d.roles[k].paint = p; } d.poster.autoInk = false; delete d.poster.saved; }
    ctx.settle(); ctx.rebuild();
    if (on) autoInk(false);
    ctx.schedule(); buildBar();
  }

  // ── colors from the poster: four looks, each checked against what's behind the laurel ──
  function suggestions(bh) {
    const pal = (data.palette || []).filter((p) => p.share > 0.02);
    if (!pal.length) return [];
    const darkBg = bh.mean < 0.35, lightest = [...pal].sort((a, b) => b.l - a.l)[0], darkest = [...pal].sort((a, b) => a.l - b.l)[0];
    // the accent: a color that stands apart from what's behind the laurel (another hue, some saturation, not near black)
    const [bgH] = hsl(bh.rgb), hueGap = (c) => { const d = Math.abs(hsl(rgbOf(c))[0] - bgH) % 360; return Math.min(d, 360 - d); };
    const accScore = (p) => p.sat * (0.35 + p.share) * (hueGap(p.c) > 40 ? 1.6 : 0.5) * (p.l > 0.12 && p.l < 0.9 ? 1 : 0.3);
    const accent = [...pal].sort((a, b) => accScore(b) - accScore(a))[0];
    const tune = (c, want = 4.5) => { let l = hsl(rgbOf(c))[2]; for (let i = 0; i < 30 && contrastOf(withL(c, l), bh).worst < want; i++) l = darkBg ? Math.min(0.97, l + 0.03) : Math.max(0.04, l - 0.03); return withL(c, l); };
    const neutral = tune(darkBg ? lightest.c : darkest.c, 5);
    const acc = tune(accent.c, 3), [ah, as] = hsl(rgbOf(accent.c));
    const foil = { type: 'linear', angle: 28, scope: 'leaf', stops: [[0, fromHsl(ah, Math.min(1, as * 0.9), 0.2)], [0.3, fromHsl(ah, Math.min(1, as), 0.48)], [0.5, fromHsl(ah, Math.min(1, as * 0.6), 0.86)], [0.7, fromHsl(ah, Math.min(1, as), 0.42)], [1, fromHsl(ah, Math.min(1, as * 0.9), 0.62)]] };
    const warm = (ah < 70 || ah > 300) && as > 0.15;
    const metal = darkBg ? (warm ? 'gold' : 'platinum') : (warm ? 'bronze' : 'onyx');
    return [
      { name: 'Poster light', branch: neutral, text: neutral },
      { name: 'Poster accent', branch: acc, text: neutral },
      { name: 'Poster foil', branch: foil, text: darkBg ? withL(accent.c, 0.9, 0.5) : withL(accent.c, 0.16) },
      { name: metal[0].toUpperCase() + metal.slice(1), branch: { type: 'metal', metal, scope: 'leaf', angle: 28 }, text: METALS[metal][2][1] },
    ];
  }
  function applySuggestion(sg) {
    const d = ctx.doc; ctx.pushUndo();
    if (d.poster) { d.poster.autoInk = false; delete d.poster.saved; }
    d.paint.branch = ctx.clone(sg.branch); d.paint.inner = null; d.paint.ornament = null; d.text.paint = sg.text; d.text.sub = sg.text;
    for (const r of Object.values(d.roles)) if (r) r.paint = null;
    ctx.settle(); ctx.rebuild(); ctx.schedule(); buildBar();
  }
  function drawSuggestions(r) {
    const el = ctx.modepanel.querySelector('#poster-suggest'); if (!el || !data) return;
    const bh = behind(r.viewBox); if (!bh) return;
    const key = JSON.stringify([P().src, P().x, P().y, P().w, ctx.doc.fields, ctx.doc.branch, ctx.doc.form, ctx.doc.roles]);
    if (key === suggestKey) return; suggestKey = key;
    const b = box(r.viewBox), bgSize = `${100 / (b.x1 - b.x0)}% ${100 / (b.y1 - b.y0)}%`, bgPos = `${(b.x0 / (1 - (b.x1 - b.x0) || 1)) * 100}% ${(b.y0 / (1 - (b.y1 - b.y0) || 1)) * 100}%`;
    el.innerHTML = '';
    for (const sg of suggestions(bh)) {
      const d = ctx.clone(ctx.doc); d.paint.branch = sg.branch; d.paint.inner = null; d.paint.ornament = null; d.text.paint = sg.text; d.text.sub = sg.text; d.canvas.bg = null;
      for (const rr of Object.values(d.roles)) if (rr) rr.paint = null;
      const svg = ctx.render(d, 1).svg, k = contrastOf(inkOf(sg.text), bh);
      el.append(h('button', { title: `${sg.name}: contrast ${k.worst.toFixed(1)}:1 at its weakest`, style: `background-image:url("${ctx.ASSETS[P().src]}");background-size:${bgSize};background-position:${bgPos}`, onclick: () => applySuggestion(sg) }, h('div', { class: 'thumb', style: `aspect-ratio:${r.viewBox[2] / r.viewBox[3]}` }), h('span', {}, sg.name)));
      el.lastChild.querySelector('.thumb').innerHTML = svg;
    }
  }

  // ── upload ──
  async function upload(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert('That image is over 25 MB. Export the poster smaller (about 2000 px tall is plenty) and try again.'); return; }
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
    const im = new Image(); im.src = url; await im.decode();
    const s = Math.min(1, MAXSIDE / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    const key = 'asset:poster' + Date.now().toString(36);
    ctx.ASSETS[key] = c.toDataURL('image/jpeg', 0.9);
    ctx.change('poster', { ...P(), src: key, name: file.name });
    await load(); buildBar(); ctx.schedule();
  }
  const fileInput = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: (e) => upload(e.target.files[0]) });

  // ── the bar above the stage and the panel below it ──
  let contrastEl = null;
  function buildBar() {
    const bar = ctx.modebar; bar.innerHTML = ''; ctx.modepanel.innerHTML = ''; suggestKey = '';
    const p = P();
    bar.append(fileInput, h('button', { class: 'btn small', onclick: () => fileInput.click() }, has() ? 'Replace poster' : 'Upload poster'));
    if (has()) {
      bar.append(
        h('label', {}, 'Size', h('input', { type: 'range', min: 0.08, max: 0.95, step: 0.005, value: p.w, oninput: (e) => { setPlace({ w: +e.target.value }, false); }, onchange: () => { setPlace({}, true); } })),
        h('button', { class: 'btn small', title: 'Center it across the poster', onclick: () => setPlace({ x: 0.5 }, true) }, 'Center'),
        h('label', { title: 'Keep the leaves and text readable against the poster wherever the laurel sits. Your own colors come back when you turn it off.' }, h('input', { type: 'checkbox', checked: !!p.autoInk, onchange: (e) => setAuto(e.target.checked) }), 'Auto ink'),
        contrastEl = h('span', { class: 'contrast' }),
        h('span', { class: 'grow' }),
        h('label', { title: 'See it the size it will be in a poster row or a listing: 160 px tall, on a standard screen' }, h('input', { type: 'checkbox', checked: !!p.actual, onchange: (e) => { ctx.change('poster.actual', e.target.checked); } }), 'At 160 px'),
        h('button', { class: 'btn small', title: 'The poster with the laurel on it, as a PNG (for sharing a draft)', onclick: mockup }, 'Mockup PNG'));
      ctx.modepanel.append(
        h('div', { class: 'rowtools' }, h('b', { style: 'color:var(--text)' }, 'Colors from your poster'), h('span', { class: 'swatches' }, (data ? data.palette : []).map((sw) => h('i', { style: `background:${sw.c}`, title: sw.c }))), h('span', { class: 'hint' }, 'Each is checked against what’s behind the laurel. Click one to use it.')),
        h('div', { class: 'suggest', id: 'poster-suggest' }));
    } else bar.append(h('span', { class: 'hint' }, 'Your poster stays on this device: nothing is uploaded anywhere.'));
    ctx.modebar.classList.add('on'); ctx.modepanel.classList.toggle('on', has());
  }
  function setPlace(o, commit) {
    const d = ctx.doc, p = { ...P(), ...o };
    p.x = Math.min(1.2, Math.max(-0.2, p.x)); p.y = Math.min(1.2, Math.max(-0.2, p.y));
    if (commit) ctx.pushUndo();
    d.poster = p;
    if (commit) { autoInk(false); ctx.settle(); if (p.autoInk) ctx.rebuild(); }
    if (layer && ctx.last) placeLayer(ctx.last.viewBox);
    if (commit) ctx.schedule();
  }
  function placeLayer(vb) {
    if (!layer || !img) return;
    const im = wrap.querySelector('img'), sw = document.getElementById('stagewrap'), mh = Math.max(240, sw.clientHeight - 48) + 'px';
    if (im.style.maxHeight !== mh) im.style.maxHeight = mh;
    const dw = im.clientWidth, dh = im.clientHeight, b = box(vb);
    Object.assign(layer.style, { left: b.x0 * dw + 'px', top: b.y0 * dh + 'px', width: (b.x1 - b.x0) * dw + 'px', height: b.hf * dh + 'px' });
  }

  async function mockup() {
    if (!img) return;
    ctx.toast('Rendering mockup…');
    const r = ctx.render(ctx.doc, 1), W = img.naturalWidth, H = img.naturalHeight, b = box(r.viewBox);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const lw = Math.max(1, Math.round((b.x1 - b.x0) * W)), png = await ctx.toPng(r.svg, r.viewBox, lw, false);
    const li = new Image(); li.src = URL.createObjectURL(png); await li.decode();
    x.drawImage(li, b.x0 * W, b.y0 * H, lw, b.hf * H);
    c.toBlob((bl) => ctx.download(bl, ctx.fileName() + '-on-poster.png'), 'image/png');
  }

  // at 160 px: the laurel and the poster round it, drawn at the size a poster row shows them, on a 1× screen
  async function drawActual(r) {
    const my = ++actualBusy, b = box(r.viewBox), W = img.naturalWidth, H = img.naturalHeight;
    const lhPx = b.hf * H, k = 160 / lhPx, cw = Math.round(Math.min(W * k, 160 * (r.viewBox[2] / r.viewBox[3]) * 3)), chh = Math.round(Math.min(H * k, 160 * 2));
    const cx = (b.x0 + b.x1) / 2 * W * k, cy = (b.y0 + b.y1) / 2 * H * k, ox = Math.max(0, Math.min(W * k - cw, cx - cw / 2)), oy = Math.max(0, Math.min(H * k - chh, cy - chh / 2));
    const c = document.createElement('canvas'); c.width = cw; c.height = chh; const x = c.getContext('2d');
    x.drawImage(img, -ox, -oy, W * k, H * k);
    const lw = Math.max(1, Math.round((b.x1 - b.x0) * W * k)), png = await ctx.toPng(r.svg, r.viewBox, lw, false);
    if (my !== actualBusy) return;
    const li = new Image(); li.src = URL.createObjectURL(png); await li.decode();
    x.drawImage(li, b.x0 * W * k - ox, b.y0 * H * k - oy, lw, 160);
    c.style.width = cw + 'px'; c.style.height = chh + 'px';
    ctx.stage.className = 'stage poster'; ctx.stage.innerHTML = '';
    ctx.stage.append(h('div', { class: 'actual' }, c, h('div', { class: 'hint' }, `The laurel at 160 px tall, as a standard screen shows it. If the small lines blur into each other here, they'll blur in a poster row: try fewer words, a bolder small-text weight or the "Poster row" fit under Text.`)));
  }

  return {
    enter() { load().then(() => { buildBar(); ctx.schedule(); }); buildBar(); },
    refresh() { load().then(() => { buildBar(); ctx.schedule(); }); },
    leave() { layer = null; wrap = null; },
    async draw(r) {
      const st = ctx.stage;
      if (!has()) {
        layer = null;
        st.className = 'stage poster'; st.innerHTML = '';
        st.append(h('div', { class: 'poster-empty' }, h('b', {}, 'See the laurel on your poster'), h('div', {}, P().src ? 'This link’s poster stays on the device it was added on. Upload it again to see it here.' : 'Upload the poster or a still. Drag the laurel into place, check the contrast and try colors taken from the artwork.'), h('button', { class: 'btn primary', onclick: () => fileInput.click() }, 'Upload poster'), h('div', { class: 'hint' }, 'JPEG, PNG or WebP. It stays on this device.')));
        return;
      }
      if (imgKey !== P().src) { await load(); buildBar(); }
      if (P().actual) { drawActual(r); updateContrast(r); return; }
      st.className = 'stage poster';
      if (!wrap || !st.contains(wrap)) {
        st.innerHTML = '';
        wrap = h('div', { class: 'poster-wrap' }, h('img', { src: ctx.ASSETS[P().src], alt: 'Your poster', draggable: 'false' }));
        layer = h('div', { class: 'laurel-layer', title: 'Drag to move · scroll to resize' });
        wrap.append(layer); st.append(wrap);
        wrap.querySelector('img').addEventListener('load', () => ctx.last && placeLayer(ctx.last.viewBox));
        new ResizeObserver(() => ctx.last && placeLayer(ctx.last.viewBox)).observe(wrap);
        layer.addEventListener('pointerdown', (e) => {
          e.preventDefault(); layer.setPointerCapture(e.pointerId); layer.classList.add('picked');
          const im = wrap.querySelector('img'), p0 = P(), sx = e.clientX, sy = e.clientY;
          ctx.pushUndo();
          const move = (ev) => { ctx.doc.poster = { ...P(), x: p0.x + (ev.clientX - sx) / im.clientWidth, y: p0.y + (ev.clientY - sy) / im.clientHeight }; placeLayer(ctx.last.viewBox); updateContrast(ctx.last); };
          const up = () => { layer.removeEventListener('pointermove', move); layer.removeEventListener('pointerup', up); layer.classList.remove('picked'); autoInk(false); ctx.settle(); if (P().autoInk) ctx.rebuild(); ctx.schedule(); };
          layer.addEventListener('pointermove', move); layer.addEventListener('pointerup', up);
        });
        layer.addEventListener('wheel', (e) => { e.preventDefault(); if (!layer._t) ctx.pushUndo(); const w = Math.min(0.95, Math.max(0.08, P().w * (1 - e.deltaY * 0.0015))); ctx.doc.poster = { ...P(), w }; placeLayer(ctx.last.viewBox); clearTimeout(layer._t); layer._t = setTimeout(() => { layer._t = 0; autoInk(false); ctx.settle(); if (P().autoInk) ctx.rebuild(); ctx.schedule(); buildBar(); }, 250); }, { passive: false });
      }
      // a new preset or shuffle while auto ink is on: the ink follows the poster again
      if (P().autoInk) { const before = JSON.stringify([ctx.doc.paint.branch, ctx.doc.text.paint]); autoInk(false); if (JSON.stringify([ctx.doc.paint.branch, ctx.doc.text.paint]) !== before) return; }
      layer.innerHTML = r.svg.replace(/<rect data-bg="1"[^>]*\/>/, '');
      placeLayer(r.viewBox);
      updateContrast(r);
      drawSuggestions(r);
    },
  };
  function updateContrast(r) {
    if (!contrastEl || !data) return;
    const bh = behind(r.viewBox); if (!bh) { contrastEl.textContent = ''; return; }
    const ink = inkOf(ctx.doc.text.paint), k = contrastOf(ink, bh), [cls, word] = verdict(k);
    contrastEl.className = 'contrast ' + cls;
    contrastEl.innerHTML = '';
    contrastEl.append('Contrast ', h('b', {}, k.worst.toFixed(1) + ':1'), ` · ${word}`, bh.sd > 0.16 ? ' · busy background' : '');
    contrastEl.title = `Text color against what's behind the laurel: ${k.worst.toFixed(1)}:1 where it's weakest, ${k.mid.toFixed(1)}:1 typically. 4.5:1 reads well small; 3:1 is the floor for large text.`;
  }
}
