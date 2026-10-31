// motion.js — the laurel (or the whole row) as an animated end card: the leaves grow in from the stem, the words rise
// in after them, then a shimmer crosses the metal. One timeline drives the preview and every export, so what plays is
// what you get: an MP4 (H.264, via WebCodecs), a PNG sequence with transparency for editors, or an animated SVG.
import { METALS } from './engine.mjs';
import { outlineSvg } from './outline.js';
import { zip } from './zip.js';

export const MOTION_DEFAULT = { what: 'laurel', entrance: 'grow', text: 'rise', shimmer: true, dur: 4, frame: '1920x1080', size: 0.62, bg: 'look', fps: 30 };
const FRAMES = [['1920x1080', 'HD 1920 × 1080'], ['3840x2160', '4K 3840 × 2160'], ['1080x1080', 'Square 1080'], ['1080x1350', 'Portrait 1080 × 1350'], ['1080x1920', 'Vertical 1080 × 1920']];
const NS = 'http://www.w3.org/2000/svg';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = { out: (p) => 1 - (1 - p) ** 3, inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2), sine: (p) => -(Math.cos(Math.PI * p) - 1) / 2 };
const solidOf = (p) => (!p ? null : typeof p === 'string' ? p : p.type === 'solid' ? p.color : p.type === 'metal' ? (METALS[p.metal] || METALS.gold)[2][1] : p.stops[Math.floor(p.stops.length / 2)][1]);
const n2 = (v) => Math.round(v * 100) / 100;

// the stem's path from base to tip, thinned out and stretched a little past both ends (so the tie and the tip are covered)
function spine(B, shift, sx, over) {
  const pts = B.pts.filter((_, i) => i % Math.max(1, Math.floor(B.pts.length / 80)) === 0).concat([B.pts[B.pts.length - 1]]);
  if (pts.length < 2) return '';
  const ext = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [a[0] + (dx / l) * over, a[1] + (dy / l) * over]; };
  const all = [ext(pts[0], pts[1]), ...pts, ext(pts[pts.length - 1], pts[pts.length - 2])];
  return 'M' + all.map(([x, y]) => `${n2(sx * (x + shift))} ${n2(y)}`).join('L');
}

export function motionMode(ctx) {
  const { h } = ctx;
  let playing = true, t0 = 0, tNow = 0, raf = 0, live = null, scrub = null, busy = false, built = '';
  const M = () => ({ ...MOTION_DEFAULT, ...(ctx.doc.motion || {}) });
  const dims = () => M().frame.split('x').map(Number);
  const bgColor = () => { const m = M(); return m.bg === 'transparent' ? null : m.bg === 'black' ? '#000000' : m.bg === 'white' ? '#ffffff' : solidOf(ctx.doc.canvas.bg) || '#000000'; };

  // what's in the frame: one laurel, or the row as the row builder places it
  function subjects() {
    if (M().what === 'row' && ctx.rowScene) {
      const sc = ctx.rowScene(); if (sc) return { vb: sc.vb, items: sc.parts.map((p) => (p.art ? { art: ctx.ASSETS[p.it.src], x: p.x, y: p.y, w: p.w, h: p.h } : { r: p.r, x: p.x, y: p.y, w: p.w, h: p.h })) };
    }
    const r = ctx.render(ctx.doc, 1), [vx, vy, vw, vh] = r.viewBox;
    return { vb: [vx, vy, vw, vh], items: [{ r, x: vx, y: vy, w: vw, h: vh }] };
  }

  // Build the scene as an SVG document. svgs: each laurel's SVG (outlined for exports). Returns { root, parts, W, H }.
  function buildScene(S, svgs, W, H, bg) {
    const m = M(), [cx, cy, cw, ch] = S.vb;
    const k = Math.min((W * 0.86) / cw, (H * m.size) / ch), ox = (W - cw * k) / 2 - cx * k, oy = (H - ch * k) / 2 - cy * k;
    const doc = document, root = doc.createElementNS(NS, 'svg'); // built in this page's document: the preview shows it, exports serialize it
    root.setAttribute('viewBox', `0 0 ${W} ${H}`); root.setAttribute('width', W); root.setAttribute('height', H);
    if (bg) { const r = doc.createElementNS(NS, 'rect'); r.setAttribute('width', W); r.setAttribute('height', H); r.setAttribute('fill', bg); root.append(r); }
    const parts = [];
    S.items.forEach((it, i) => {
      const id = 'mv' + i, x = ox + it.x * k, y = oy + it.y * k, w = it.w * k, hh = it.h * k;
      if (it.art) {
        const g = doc.createElementNS(NS, 'g'), im = doc.createElementNS(NS, 'image');
        im.setAttribute('href', it.art); im.setAttribute('x', x); im.setAttribute('y', y); im.setAttribute('width', w); im.setAttribute('height', hh); im.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        g.append(im); root.append(g); parts.push({ i, art: g, cx: x + w / 2, cy: y + hh / 2, texts: [], masks: [], band: null, vb: [x, y, w, hh] }); return;
      }
      const src = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
      src.querySelector('rect[data-bg]')?.remove();
      const sv = doc.importNode(src, true), vb = it.r.viewBox;
      sv.setAttribute('x', x); sv.setAttribute('y', y); sv.setAttribute('width', w); sv.setAttribute('height', hh); sv.setAttribute('overflow', 'visible');
      let defs = [...sv.children].find((c) => c.localName === 'defs'); if (!defs) { defs = doc.createElementNS(NS, 'defs'); sv.prepend(defs); }
      const gs = [...sv.children].filter((c) => c.localName === 'g'), artG = gs[0], txG = gs[1];
      // the wreath, revealed along the stem by a soft-edged stroke
      const wrapA = doc.createElementNS(NS, 'g'); wrapA.setAttribute('id', id + 'a'); artG.replaceWith(wrapA); wrapA.append(artG);
      const B = it.r.B, masks = [];
      if (B && B.pts && B.pts.length > 2) {
        const sh = +((svgs[i].match(/<g id="h\d+" transform="translate\(([-\d.]+) 0\)"/) || [, 0])[1]), L0 = (B.p && B.p.leaf && Math.max(B.p.leaf.L0, B.p.leaf.L1)) || 30;
        const sw = L0 * 2.7 + 10, mirror = ctx.doc.branch.mirror !== false;
        const mask = doc.createElementNS(NS, 'mask'); mask.setAttribute('id', id + 'k'); mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', vb[0] - vb[2]); mask.setAttribute('y', vb[1] - vb[3]); mask.setAttribute('width', vb[2] * 3); mask.setAttribute('height', vb[3] * 3);
        const blur = doc.createElementNS(NS, 'filter'); blur.setAttribute('id', id + 'f'); blur.setAttribute('x', '-20%'); blur.setAttribute('y', '-20%'); blur.setAttribute('width', '140%'); blur.setAttribute('height', '140%');
        blur.innerHTML = `<feGaussianBlur stdDeviation="${n2(sw * 0.1)}"/>`; defs.append(blur);
        const g = doc.createElementNS(NS, 'g'); g.setAttribute('filter', `url(#${id}f)`);
        for (const sx of mirror ? [1, -1] : [1]) {
          const p = doc.createElementNS(NS, 'path'); p.setAttribute('d', spine(B, sh, sx, sw * 0.6)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', n2(sw)); p.setAttribute('pathLength', '1'); p.setAttribute('stroke-dasharray', '1 1'); p.setAttribute('stroke-dashoffset', '0');
          g.append(p); masks.push(p);
        }
        // the tie and anything the stem doesn't reach (a badge frame, a ribbon) fade in over the first third
        mask.append(g); defs.append(mask);
        if (M().entrance === 'grow') wrapA.setAttribute('mask', `url(#${id}k)`);
      }
      // the words, one by one
      txG.setAttribute('id', id + 'x');
      const texts = [...txG.children].map((c) => { const g = doc.createElementNS(NS, 'g'); c.replaceWith(g); g.append(c); return g; });
      // the shimmer: a soft band of light, clipped to the wreath and the words
      let band = null;
      if (M().shimmer) {
        const gid = id + 'g', smask = doc.createElementNS(NS, 'mask'); smask.setAttribute('id', id + 's'); smask.setAttribute('maskUnits', 'userSpaceOnUse'); smask.setAttribute('style', 'mask-type:alpha'); smask.setAttribute('mask-type', 'alpha');
        smask.setAttribute('x', vb[0]); smask.setAttribute('y', vb[1]); smask.setAttribute('width', vb[2]); smask.setAttribute('height', vb[3]);
        smask.innerHTML = `<use href="#${id}a"/><use href="#${id}x"/>`; defs.append(smask);
        const bw = vb[2] * 0.22, grad = doc.createElementNS(NS, 'linearGradient'); grad.setAttribute('id', gid); grad.setAttribute('x1', '0'); grad.setAttribute('x2', '1'); grad.setAttribute('y1', '0'); grad.setAttribute('y2', '0');
        grad.innerHTML = '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>'; defs.append(grad);
        const sg = doc.createElementNS(NS, 'g'); sg.setAttribute('mask', `url(#${id}s)`);
        const rot = doc.createElementNS(NS, 'g'); rot.setAttribute('transform', `rotate(18 ${n2(vb[0] + vb[2] / 2)} ${n2(vb[1] + vb[3] / 2)})`);
        band = doc.createElementNS(NS, 'rect'); band.setAttribute('x', n2(vb[0] - bw)); band.setAttribute('y', n2(vb[1] - vb[3])); band.setAttribute('width', n2(bw)); band.setAttribute('height', n2(vb[3] * 3)); band.setAttribute('fill', `url(#${gid})`); band.setAttribute('opacity', '0');
        rot.append(band); sg.append(rot); sv.append(sg);
        band._range = [0, vb[2] + bw];
      }
      root.append(sv);
      parts.push({ i, art: wrapA, masks, texts, band, cx: vb[0] + vb[2] / 2, cy: vb[1] + vb[3] / 2, vb, rise: vb[3] * 0.035, grow: !!masks.length && M().entrance === 'grow' });
    });
    return { root, parts, W, H };
  }

  // the timeline: where everything is at time t (seconds)
  function timing(parts) {
    const m = M(), D = m.dur, n = parts.length, stagger = n > 1 ? Math.min(0.35, (D * 0.3) / (n - 1)) : 0, win = D - stagger * (n - 1);
    return parts.map((p, j) => ({ p, d: j * stagger, win }));
  }
  function apply(sc, t) {
    const m = M();
    for (const { p, d, win } of timing(sc.parts)) {
      const u = t - d, grow = clamp01(u / (win * 0.5)), fade = clamp01(u / (win * 0.18));
      if (p.grow) { const off = 1 - ease.inOut(grow); for (const mk of p.masks) mk.setAttribute('stroke-dashoffset', n2(off)); p.art.setAttribute('opacity', n2(fade)); }
      else if (m.entrance === 'fade' || (m.entrance === 'grow' && !p.grow)) { const e = ease.out(clamp01(u / (win * 0.4))), s = 0.94 + 0.06 * e; p.art.setAttribute('opacity', n2(e)); p.art.setAttribute('transform', `translate(${n2(p.cx * (1 - s))} ${n2(p.cy * (1 - s))}) scale(${n2(s)})`); }
      else { p.art.removeAttribute('opacity'); p.art.removeAttribute('transform'); }
      p.texts.forEach((g, k) => {
        if (m.text === 'none') { g.removeAttribute('opacity'); g.removeAttribute('transform'); return; }
        const start = win * (0.3 + Math.min(k, 6) * 0.07), e = ease.out(clamp01((u - start) / (win * 0.28)));
        g.setAttribute('opacity', n2(e));
        if (m.text === 'rise') g.setAttribute('transform', `translate(0 ${n2((1 - e) * p.rise)})`); else g.removeAttribute('transform');
      });
      if (p.band) {
        const s0 = win * 0.66, sp = clamp01((u - s0) / (win * 0.3));
        p.band.setAttribute('opacity', sp > 0 && sp < 1 ? '1' : '0');
        p.band.setAttribute('transform', `translate(${n2(p.band._range[0] + (p.band._range[1] - p.band._range[0]) * ease.sine(sp))} 0)`);
      }
    }
  }

  // ── preview ──
  function buildPreview() {
    const [W, H] = dims(), S = subjects();
    const key = JSON.stringify([M(), S.vb, S.items.map((it) => (it.r ? it.r.svg.length + ':' + it.r.viewBox.join() : it.art.length)), ctx.doc.canvas.bg]);
    if (key === built && live && ctx.stage.contains(live.root)) return;
    built = key;
    const sc = buildScene(S, S.items.map((it) => (it.r ? it.r.svg : '')), W, H, bgColor() || null);
    ctx.stage.className = 'stage motion-stage'; ctx.stage.innerHTML = ''; ctx.stage.append(sc.root); ctx.fit(sc.root, [0, 0, W, H]);
    live = sc;
  }
  function tick(now) {
    raf = 0; if (!live) return;
    const D = M().dur;
    if (playing) { tNow = ((now - t0) / 1000) % (D + 1); if (scrub) scrub.value = Math.min(D, tNow); }
    apply(live, Math.min(tNow, D));
    if (playing) raf = requestAnimationFrame(tick);
  }
  const play = () => { playing = true; t0 = performance.now() - tNow * 1000; if (!raf) raf = requestAnimationFrame(tick); bar(); };
  const pause = () => { playing = false; bar(); };

  // ── exports ──
  async function exportSvgs(S) {
    const out = [];
    for (const it of S.items) {
      if (!it.r) { out.push(''); continue; }
      try { out.push((await outlineSvg(it.r.svg)).svg); }
      catch (e) { out.push(await ctx.svgWithFonts(it.r.svg, true)); }
    }
    return out;
  }
  async function frames(onFrame, { transparent = false } = {}) {
    const m = M(), [W, H] = dims(), S = subjects(), svgs = await exportSvgs(S);
    const sc = buildScene(S, svgs, W, H, transparent ? null : bgColor() || '#000000');
    const n = Math.round(m.dur * m.fps), c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), ser = new XMLSerializer();
    for (let f = 0; f < n; f++) {
      apply(sc, f / m.fps);
      const url = URL.createObjectURL(new Blob([ser.serializeToString(sc.root)], { type: 'image/svg+xml' }));
      const img = new Image(); img.src = url; await img.decode(); URL.revokeObjectURL(url);
      x.clearRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H);
      await onFrame(c, f, n);
      progress(f / n);
    }
    progress(1);
    return { W, H, n };
  }
  async function exportMp4() {
    if (!('VideoEncoder' in window)) { alert('This browser can’t make video files. Try Chrome, Edge or Safari 17 or later, or export the PNG sequence.'); return; }
    const m = M(), [W, H] = dims(), { Muxer, ArrayBufferTarget } = await import('./vendor/mp4-muxer.mjs');
    const codecs = W * H > 1920 * 1088 ? ['avc1.640033', 'avc1.4d0033', 'avc1.42e033'] : ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];
    let cfg = null;
    for (const codec of codecs) { const c = { codec, width: W, height: H, bitrate: W * H > 1920 * 1088 ? 40e6 : 14e6, framerate: m.fps }; try { if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch (e) { /* try the next */ } }
    if (!cfg) { alert('This browser can’t encode H.264 video at this size. Try a smaller frame or the PNG sequence.'); return; }
    const target = new ArrayBufferTarget(), muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: m.fps }, fastStart: 'in-memory' });
    let err = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (err = e) });
    enc.configure(cfg);
    await frames(async (c, f) => {
      const vf = new VideoFrame(c, { timestamp: Math.round((f * 1e6) / m.fps), duration: Math.round(1e6 / m.fps) });
      enc.encode(vf, { keyFrame: f % (m.fps * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
      if (err) throw err;
    });
    await enc.flush(); enc.close(); muxer.finalize();
    ctx.download(new Blob([target.buffer], { type: 'video/mp4' }), `${name()}-${W}x${H}.mp4`);
  }
  async function exportPngSeq() {
    const files = [], m = M();
    await frames(async (c, f) => { files.push({ name: `${name()}_${String(f).padStart(4, '0')}.png`, data: await new Promise((r) => c.toBlob(r, 'image/png')) }); }, { transparent: true });
    const [W, H] = dims();
    files.push({ name: 'README.txt', data: `An animated laurel made with Daphne (pitch.dog/daphne).\n\n${files.length} frames, ${m.fps} fps, ${W} × ${H}, transparent background.\nImport as an image sequence: in Premiere Pro, File > Import, pick the first frame and tick "Image Sequence"; in DaVinci Resolve the frames appear as one clip in the Media Pool; in After Effects, File > Import > File with "PNG Sequence" ticked. Set the frame rate to ${m.fps}.\n\nNot affiliated with or endorsed by any festival: the claim is the filmmaker's own.\n` });
    ctx.download(await zip(files), `${name()}-png-sequence.zip`);
  }
  // an animated SVG: the same timeline written as SMIL animations, plays once and holds; for websites and EPKs
  async function exportAnimatedSvg() {
    const m = M(), [W, H] = dims(), S = subjects(), svgs = await exportSvgs(S), sc = buildScene(S, svgs, W, H, m.bg === 'transparent' ? null : bgColor());
    const D = m.dur, doc = sc.root.ownerDocument, kt = (v) => n2(clamp01(v / D));
    const anim = (el, attr, vals, times, splines) => { const a = doc.createElementNS(NS, 'animate'); a.setAttribute('attributeName', attr); a.setAttribute('values', vals.join(';')); a.setAttribute('keyTimes', times.join(';')); a.setAttribute('dur', D + 's'); a.setAttribute('fill', 'freeze'); if (splines) { a.setAttribute('calcMode', 'spline'); a.setAttribute('keySplines', splines.join(';')); } el.append(a); };
    const animT = (el, vals, times) => { const a = doc.createElementNS(NS, 'animateTransform'); a.setAttribute('attributeName', 'transform'); a.setAttribute('type', 'translate'); a.setAttribute('values', vals.join(';')); a.setAttribute('keyTimes', times.join(';')); a.setAttribute('dur', D + 's'); a.setAttribute('fill', 'freeze'); a.setAttribute('calcMode', 'spline'); a.setAttribute('keySplines', vals.slice(1).map(() => '0.2 0.7 0.3 1').join(';')); el.append(a); };
    apply(sc, D); // the resting state, for viewers without animation
    for (const { p, d, win } of timing(sc.parts)) {
      if (p.grow) {
        for (const mk of p.masks) anim(mk, 'stroke-dashoffset', [1, 1, 0, 0], [0, kt(d), kt(d + win * 0.5), 1], ['0 0 1 1', '0.65 0 0.35 1', '0 0 1 1']);
        anim(p.art, 'opacity', [0, 0, 1, 1], [0, kt(d), kt(d + win * 0.18), 1]);
      } else if (m.entrance !== 'none') anim(p.art, 'opacity', [0, 0, 1, 1], [0, kt(d), kt(d + win * 0.4), 1], ['0 0 1 1', '0.2 0.7 0.3 1', '0 0 1 1']);
      p.texts.forEach((g, k) => {
        if (m.text === 'none') return;
        const s = d + win * (0.3 + Math.min(k, 6) * 0.07), e = s + win * 0.28;
        anim(g, 'opacity', [0, 0, 1, 1], [0, kt(s), kt(e), 1], ['0 0 1 1', '0.2 0.7 0.3 1', '0 0 1 1']);
        if (m.text === 'rise') animT(g, [`0 ${n2(p.rise)}`, `0 ${n2(p.rise)}`, '0 0', '0 0'], [0, kt(s), kt(e), 1]);
      });
      if (p.band) {
        const s = d + win * 0.66, e = s + win * 0.3, [a0, a1] = p.band._range;
        const ks = [0, kt(s), Math.min(1, kt(s) + 0.002), kt(e), Math.min(1, kt(e) + 0.002), 1].map((v, i, arr) => Math.max(v, i ? arr[i - 1] : 0));
        anim(p.band, 'opacity', [0, 0, 1, 1, 0, 0], ks.map(n2));
        animT(p.band, [`${n2(a0)} 0`, `${n2(a0)} 0`, `${n2(a1)} 0`, `${n2(a1)} 0`], [0, kt(s), kt(e), 1]);
      }
    }
    const txt = ctx.stamp(new XMLSerializer().serializeToString(sc.root));
    ctx.download(new Blob([txt], { type: 'image/svg+xml' }), `${name()}-animated.svg`);
  }
  const name = () => (M().what === 'row' ? 'laurel-row' : ctx.fileName());
  let progEl = null;
  const progress = (p) => { if (progEl) progEl.firstChild.style.width = Math.round(p * 100) + '%'; };
  async function run(fn, label) {
    if (busy) return; busy = true; pause(); ctx.toast(label);
    try { await fn(); } catch (e) { console.warn(e); alert('The export stopped: ' + (e && e.message ? e.message : e)); }
    busy = false; progress(0); play();
  }

  // ── controls ──
  function bar() {
    const B = ctx.modebar; B.innerHTML = '';
    B.append(h('button', { class: 'btn small', onclick: () => (playing ? pause() : play()) }, playing ? 'Pause' : 'Play'),
      h('button', { class: 'btn small', onclick: () => { tNow = 0; play(); } }, 'From the start'),
      scrub = h('input', { type: 'range', min: 0, max: M().dur, step: 0.01, value: Math.min(tNow, M().dur), style: 'width:240px', oninput: (e) => { pause(); tNow = +e.target.value; if (!raf) raf = requestAnimationFrame(tick); } }),
      h('span', { class: 'hint' }, 'The leaves grow in from the stem, the words follow, then a shimmer crosses the metal.'));
    ctx.modebar.classList.add('on');
  }
  function panel() {
    const P = ctx.modepanel; P.innerHTML = '';
    const m = M(), sel = (label, key, opts, num) => h('label', {}, label, h('select', { onchange: (e) => { ctx.change('motion', { ...M(), [key]: num ? +e.target.value : e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value }); built = ''; bar(); } }, opts.map(([v, l]) => h('option', { value: String(v), selected: String(m[key]) === String(v) }, l))));
    P.append(
      h('div', { class: 'rowtools' },
        sel('Animate', 'what', [['laurel', 'This laurel'], ['row', 'The row']]),
        sel('Leaves', 'entrance', [['grow', 'Grow in'], ['fade', 'Fade in'], ['none', 'Already there']]),
        sel('Words', 'text', [['rise', 'Rise in'], ['fade', 'Fade in'], ['none', 'Already there']]),
        sel('Shimmer', 'shimmer', [[true, 'On'], [false, 'Off']]),
        sel('Length', 'dur', [3, 4, 5, 6, 8].map((s) => [s, s + ' s']), true),
        sel('Frame', 'frame', FRAMES),
        h('label', {}, 'Size', h('input', { type: 'range', min: 0.2, max: 0.95, step: 0.01, value: m.size, onchange: (e) => { ctx.change('motion', { ...M(), size: +e.target.value }); built = ''; } })),
        sel('Background', 'bg', [['look', 'The look’s'], ['black', 'Black'], ['white', 'White'], ['transparent', 'Transparent']])),
      h('div', { class: 'rowtools' },
        h('button', { class: 'btn small primary', title: 'H.264 video for editors and social. No transparency: the background is filled', onclick: () => run(exportMp4, 'Rendering the video…') }, 'MP4 video'),
        h('button', { class: 'btn small', title: 'Every frame as a PNG with transparency, for Premiere, Resolve or After Effects', onclick: () => run(exportPngSeq, 'Rendering the frames…') }, 'PNG sequence (transparent)'),
        h('button', { class: 'btn small', title: 'Plays once in any browser, then holds. Small, sharp at any size, for websites and EPKs', onclick: () => run(exportAnimatedSvg, 'Writing the animated SVG…') }, 'Animated SVG'),
        progEl = h('div', { class: 'progress', title: 'Export progress' }, h('i')),
        h('span', { class: 'hint' }, `${m.fps} fps · ${m.dur * m.fps} frames. Exports draw the text as shapes, so no fonts are needed.`)));
  }

  return {
    enter() { built = ''; live = null; bar(); panel(); tNow = 0; play(); },
    refresh() { built = ''; bar(); panel(); },
    leave() { cancelAnimationFrame(raf); raf = 0; live = null; built = ''; },
    draw() { buildPreview(); if (!raf) raf = requestAnimationFrame(tick); },
    _test: { frames, exportMp4, exportPngSeq, exportAnimatedSvg, apply, buildScene, subjects },
  };
}
