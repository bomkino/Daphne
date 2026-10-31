// fixer.js — clean up a festival's own laurel file. Festivals send official artwork as JPGs on white, PNGs on black,
// screenshots from a PDF. This makes it usable: takes the background out (with clean, anti-aliased edges, no white
// fringe), sets it in one ink if asked, trims it and gives it even margins. Everything happens in the browser.
// It doesn't redraw anything: the festival's artwork stays the festival's artwork.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hexRgb = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const L = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// what's behind the artwork: the border pixels' typical color, how uniform they are, and whether they're already clear
function readBackground(px, w, h) {
  const pts = [], step = Math.max(1, Math.round((w + h) / 400));
  for (let x = 0; x < w; x += step) pts.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += step) pts.push(y * w, y * w + w - 1);
  let clear = 0; const cols = [];
  for (const i of pts) { const o = i * 4; if (px[o + 3] < 24) clear++; else cols.push([px[o], px[o + 1], px[o + 2]]); }
  if (clear > pts.length * 0.6 || !cols.length) return { clear: true, rgb: [255, 255, 255], uniform: 1 };
  const med = [0, 1, 2].map((k) => cols.map((c) => c[k]).sort((a, b) => a - b)[cols.length >> 1]);
  const near = cols.filter((c) => Math.hypot(c[0] - med[0], c[1] - med[1], c[2] - med[2]) < 36).length / cols.length;
  return { clear: false, rgb: med, uniform: near };
}
// how colorful the artwork is (mean saturation of the pixels that aren't background)
function colorfulness(px, bg) {
  let s = 0, n = 0;
  for (let o = 0; o < px.length; o += 16) {
    if (px[o + 3] < 40) continue; const r = px[o], g = px[o + 1], b = px[o + 2];
    if (!bg.clear && Math.hypot(r - bg.rgb[0], g - bg.rgb[1], b - bg.rgb[2]) < 40) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); s += mx ? (mx - mn) / mx : 0; n++;
  }
  return n ? s / n : 0;
}

// the clean-up itself. mode: 'keep' (take out the background color, keep the artwork's colors),
// 'dark' (dark artwork on a light ground: darkness becomes ink), 'light' (light artwork on a dark ground).
function process(src, w, h, o) {
  const out = new ImageData(w, h), px = src.data, q = out.data, bg = o.bg.rgb, bgL = L(...bg), ink = o.ink ? hexRgb(o.ink) : null;
  const t0 = o.tol * 0.55, t1 = o.tol * 1.45;
  let ext = o.mode === 'dark' ? 1 : 0;
  if (o.mode === 'dark' || o.mode === 'light') for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 128) continue; const l = L(px[i], px[i + 1], px[i + 2]); ext = o.mode === 'dark' ? Math.min(ext, l) : Math.max(ext, l); }
  const span = Math.max(0.08, Math.abs(bgL - ext));
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2], a0 = px[i + 3] / 255;
    let a;
    if (o.bg.clear && o.mode === 'keep') a = 1;
    else if (o.mode === 'keep') { const d = Math.hypot(r - bg[0], g - bg[1], b - bg[2]); a = clamp((d - t0) / Math.max(1, t1 - t0)); }
    else { const l = L(r, g, b), v = o.mode === 'dark' ? (bgL - l) / span : (l - bgL) / span; a = clamp((v - o.tol / 400) / (1 - o.tol / 400)); }
    a *= a0;
    if (a <= 0.002) { q[i + 3] = 0; continue; }
    let rr, gg, bb;
    if (ink) [rr, gg, bb] = ink;
    else if (o.bg.clear) [rr, gg, bb] = [r, g, b];
    else { const k = 1 / Math.max(a / a0, 0.05); rr = clamp(bg[0] + (r - bg[0]) * k, 0, 255); gg = clamp(bg[1] + (g - bg[1]) * k, 0, 255); bb = clamp(bg[2] + (b - bg[2]) * k, 0, 255); } // the fringe's background color taken back out
    q[i] = rr; q[i + 1] = gg; q[i + 2] = bb; q[i + 3] = Math.round(a * 255);
  }
  // trim to the artwork and give it even margins
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (q[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, pad = Math.round(Math.max(cw, ch) * o.pad);
  const c = document.createElement('canvas'); c.width = cw + pad * 2; c.height = ch + pad * 2;
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(out, 0, 0);
  c.getContext('2d').drawImage(tmp, x0, y0, cw, ch, pad, pad, cw, ch);
  return c;
}

export function openFixer(ctx, onDone, opt = {}) {
  const { h } = ctx;
  let img = null, src = null, W = 0, H = 0, bg = null, name = 'official-laurel', result = null, timer = 0;
  const o = { mode: 'keep', tol: 40, ink: null, pad: 0.04, view: 'dark' };
  const preview = h('div', { class: 'preview' }), opts = h('div', { class: 'opts' });
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', hidden: true, onchange: (e) => e.target.files[0] && load(e.target.files[0]) });
  const close = () => { scrim.remove(); window.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const modal = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fixer-title' },
    h('header', {}, h('div', {}, h('h2', { id: 'fixer-title' }, 'Clean up a festival file'), h('p', {}, 'Take out a white or black background, set it in one ink, trim it. It stays on your computer.')),
      h('button', { class: 'btn ghost x', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'studio fixer' }, preview, opts), file);
  const scrim = h('div', { class: 'scrim', onmousedown: (e) => { if (e.target === scrim) close(); } }, modal);
  document.body.append(scrim); window.addEventListener('keydown', onKey, true);
  for (const ev of ['dragover', 'drop']) modal.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'drop' && e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); });

  async function load(f) {
    if (f.size > 20e6) { ctx.toast('That file is over 20 MB'); return; }
    name = f.name.replace(/\.[^.]+$/, '') || name;
    const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    img = new Image(); img.src = url; await img.decode().catch(() => null);
    if (!img.naturalWidth) { ctx.toast('Couldn’t read that image'); return; }
    let w = img.naturalWidth, hh = img.naturalHeight; const k = Math.min(1, 3000 / Math.max(w, hh)), up = /svg/.test(f.type) ? Math.max(1, 2400 / Math.max(w, hh)) : 1;
    w = Math.round(w * k * up); hh = Math.round(hh * k * up);
    const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, hh);
    src = g.getImageData(0, 0, w, hh); W = w; H = hh;
    bg = readBackground(src.data, w, hh);
    const mono = colorfulness(src.data, bg) < 0.14;
    o.mode = bg.clear ? 'keep' : mono ? (L(...bg.rgb) > 0.5 ? 'dark' : 'light') : 'keep';
    o.tol = 40; o.view = bg.clear ? (mono && L(...bg.rgb) > 0.5 ? 'light' : 'dark') : L(...bg.rgb) > 0.5 ? 'dark' : 'light';
    if (o.mode === 'dark') o.view = 'light';
    redo();
  }
  function redo() { clearTimeout(timer); timer = setTimeout(() => { result = src ? process(src, W, H, { ...o, bg }) : null; draw(); }, 30); }
  const seg = (items, cur, on) => h('div', { class: 'segctl' }, items.map(([v, l]) => h('button', { class: v === cur ? 'on' : '', onclick: () => on(v) }, l)));
  const lbl = (t) => h('div', { class: 'olabel' }, h('span', {}, t));

  function draw() {
    preview.innerHTML = ''; opts.innerHTML = '';
    const put = (...k) => opts.append(...k.flat(Infinity).filter((x) => x != null && x !== false));
    if (!src) {
      preview.append(h('button', { class: 'dropzone', onclick: () => file.click() }, h('b', {}, 'Drop the festival’s file here'), h('span', {}, 'or click to choose it. PNG, JPG, WebP or SVG.')));
      put(h('h3', {}, 'What it does'), h('div', { class: 'desc' }, 'Festivals often send laurels on a white or black background, or as a JPG. This makes a clean, transparent version that sits on any poster.'),
        h('div', { class: 'note rule' }, 'Festivals that send official artwork usually ask that it isn’t altered. Taking out a background and trimming is generally fine; recoloring may need their OK. Check their guidelines, and if they offer a version in the color you need, use that.'));
      return;
    }
    const fr = h('div', { class: 'frame ' + o.view });
    if (result) { const cv = result; cv.style.maxWidth = '100%'; cv.style.maxHeight = (preview.clientHeight - 120) + 'px'; cv.style.width = 'auto'; cv.style.height = 'auto'; fr.append(cv); }
    else fr.append(h('div', { class: 'hint', style: 'padding:40px' }, 'Nothing left: lower the tolerance.'));
    const before = h('img', { src: img.src, alt: 'The file as it came', class: 'before' });
    preview.append(h('div', { class: 'pv' }, fr, h('div', { class: 'cap' }, result ? `${result.width} × ${result.height} px, transparent` : ''), h('div', { class: 'beforewrap' }, h('span', {}, 'As it came'), before)));
    const bgName = bg.clear ? 'already clear' : L(...bg.rgb) > 0.8 ? 'white' : L(...bg.rgb) < 0.15 ? 'black' : 'a solid color';
    put(
      h('h3', {}, name), h('div', { class: 'desc' }, `The background is ${bgName}${!bg.clear && bg.uniform < 0.8 ? ', but not even: the edges may need a higher tolerance' : ''}.`),
      lbl('How to take it out'),
      seg([['keep', 'Keep its colors'], ['dark', 'Dark artwork'], ['light', 'Light artwork']], o.mode, (v) => { o.mode = v; redo(); }),
      h('div', { class: 'hint' }, { keep: 'Takes out the background color and keeps everything else as it is.', dark: 'For dark artwork on a light background: the darkness becomes the ink. The cleanest edges for one-color laurels.', light: 'For light artwork on a dark background: the lightness becomes the ink.' }[o.mode]),
      h('div', { class: 'row' }, h('label', {}, 'Tolerance'), h('input', { type: 'range', 'aria-label': 'Tolerance', min: 4, max: 140, step: 1, value: o.tol, oninput: (e) => { o.tol = +e.target.value; redo(); } }), h('span', {})),
      lbl('Ink'),
      h('div', { class: 'chips' }, [[null, 'As it is'], ['#000000', 'Black'], ['#ffffff', 'White']].map(([v, l]) => h('button', { class: 'chip' + (o.ink === v ? ' on' : ''), onclick: () => { o.ink = v; redo(); } }, l)),
        h('label', { class: 'chip' + (o.ink && !['#000000', '#ffffff'].includes(o.ink) ? ' on' : ''), style: 'display:inline-flex;gap:6px;align-items:center' }, 'Color', h('input', { type: 'color', value: o.ink && !['#000000', '#ffffff'].includes(o.ink) ? o.ink : '#e7c47e', style: 'width:20px;height:18px', oninput: (e) => { o.ink = e.target.value; redo(); } }))),
      h('div', { class: 'row' }, h('label', {}, 'Margin'), h('input', { type: 'range', 'aria-label': 'Margin', min: 0, max: 0.2, step: 0.01, value: o.pad, oninput: (e) => { o.pad = +e.target.value; redo(); } }), h('span', {})),
      lbl('Check it on'), seg([['dark', 'Dark'], ['light', 'Light']], o.view, (v) => { o.view = v; draw(); }),
      h('div', { class: 'go' },
        onDone ? h('button', { class: 'btn primary', disabled: !result, onclick: () => { const a = ctx.addAsset(result.toDataURL('image/png'), result.width / result.height, name + ' (cleaned)'); onDone(a); close(); ctx.toast('Added to the laurel'); } }, 'Use it in the laurel') : null,
        opt.row && ctx.addRowArt ? h('button', { class: 'btn', disabled: !result, title: 'Placed in your row of laurels at the same height as the others', onclick: () => { const a = ctx.addAsset(result.toDataURL('image/png'), result.width / result.height, name + ' (cleaned)'); ctx.addRowArt({ ...a, festival: opt.festival || '' }); close(); ctx.toast('Added to your row: open Row in the top bar to see it'); } }, 'Add it to my row') : null,
        h('button', { class: onDone ? 'btn' : 'btn primary', disabled: !result, onclick: () => result.toBlob((b) => ctx.download(b, ctx.slug(name) + '-clean.png'), 'image/png') }, 'Download PNG'),
        h('button', { class: 'btn ghost', onclick: () => file.click() }, 'Choose another file')),
      o.ink ? h('div', { class: 'note rule' }, 'Recoloring official artwork may need the festival’s OK. If they sent a one-color version, use theirs.') : null);
  }
  draw();
  return { close };
}
