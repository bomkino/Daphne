// Daphne's story, told as you scroll: one continuous line of light moves through six beats.
//   0 her hair and the river, one stream of light; 1 the chase, and the stream rises into a tree with raised arms;
//   2 the tree, with her heart still beating under the bark; 3 the branches bend into a laurel, worn as a crown,
//   and every laurel since ripples out from it; 4 the leaves fall, all but two; 5 the two leaves hold her name.
// Adapted from the opening of the brand book (brand/tools/book.mjs) for pitch.dog/daphne/story/, where the
// frame sits under the site's bar. Without JavaScript the page shows the story as plain text.
import M from './marks.js';

const story = document.querySelector('.story'), stage = story && story.querySelector('.stage'), cv = document.getElementById('grove');
const ctx = cv && cv.getContext && cv.getContext('2d');
if (ctx) run();

// the five laurels after the story rise in together when they come into view
const row = document.querySelector('.laurels');
if (row && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  row.classList.add('wait');
  new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { row.classList.add('in'); o.disconnect(); } }, { threshold: .2 }).observe(row);
}

function run() {
  story.classList.add('live');
  const caps = Array.from(story.querySelectorAll('.caps .cap')), endCap = story.querySelector('.cap.end'), hint = story.querySelector('.hint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LEAF = new Path2D(M.LEAF), STALK = new Path2D(M.STALK), LEN = M.LEN;
  const LETTERS = M.LETTERS.map((l) => [l[0], new Path2D(l[1])]);
  const BL = new Path2D(M.BL), BLS = new Path2D(M.BLS), BR = new Path2D(M.BR), BRS = new Path2D(M.BRS);
  const NB = M.NB, A0 = M.A0, A1 = M.A1, Z0 = M.Z0;
  const G = '184,229,154', PK = '245,156,192', LEAFC = '#B8E59A', PAPER = '#F3F6EF';
  let W = 0, H = 0, dpr = 1, U = 1, cx = 0, cy = 0;
  // The art lives between the frame's top labels and the subtitles, so a line never runs through a word:
  // the tree spans about .76 U, and it's centered in the room the tallest subtitle leaves above it.
  const capsEl = story.querySelector('.caps'), headEl = story.querySelector('.head');
  let headB = 0, cardH = 100;
  const size = () => { headB = headEl.offsetTop + headEl.offsetHeight; cardH = endCap.offsetHeight || cardH; dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const top = headEl.offsetTop + headEl.offsetHeight + 10, bottom = Math.max(top + 120, capsEl.offsetTop - 18);
    U = Math.min(W * 1.1, H * .95, (bottom - top) / .76); cx = W / 2; cy = (top + bottom) / 2; };
  size(); addEventListener('resize', size);
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(size); ro.observe(cv); ro.observe(capsEl); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  // seeded, so it's the same grove every visit
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cl = (x) => Math.min(1, Math.max(0, x));
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const mixA = (a, b, t) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
  const angOf = (dx, dy) => Math.atan2(dx, -dy);

  // her strands: nine hairlines of light
  const NS = 9, NP = 64;
  const strands = Array.from({ length: NS }, (_, k) => ({ k, off: (k - 4) / 4, ph: rnd() * 6.283, fq: 1.3 + rnd() * 1.1, j: .82 + rnd() * .36, side: k < 4 ? -1 : k > 4 ? 1 : 0, lane: Math.abs(k - 4) }));
  // her leaves: 17 a side
  const NL = 17, leaves = [];
  for (const side of [-1, 1]) for (let j = 0; j < NL; j++) leaves.push({ side, j, t: j / (NL - 1), out: j % 2 ? 1 : -1, k: side < 0 ? 3 - (j % 4) : 5 + (j % 4), ut: .3 + .66 * (j / (NL - 1)) + (rnd() - .5) * .04, seed: rnd(), sway: rnd() * 6.283, chosen: j === 7 });
  // the night around her
  const motes = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), z: rnd(), ph: rnd() * 6.283, sp: .2 + rnd() * .8 }));
  const drift = Array.from({ length: 24 }, () => ({ x: rnd(), y: rnd(), z: rnd(), r: rnd() * 6.283, vr: rnd() - .5, sw: rnd() * 6.283, sp: .4 + rnd() * .6 }));
  const sprite = (blur) => { const c = document.createElement('canvas'); c.width = 90; c.height = 150; const g = c.getContext('2d'); if ('filter' in g) g.filter = 'blur(' + blur + 'px)'; g.translate(45, 132); g.scale(.22, .22); g.fillStyle = LEAFC; g.fill(LEAF, 'evenodd'); g.fill(STALK); return c; };
  const SPR = [sprite(0), sprite(1.6), sprite(3.5), sprite(6.5)];
  const grain = Array.from({ length: 4 }, () => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), im = g.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return ctx.createPattern(c, 'repeat'); });

  let T = reduce ? 4 : 0, B = 0, last = performance.now(), flow = 0, sq = 1, lift = 0, R = 1, beat = 0;
  // the three shapes her strands take
  const river = (s, u, chase) => [mix(-.22 * W, 1.22 * W, u), cy + U * .2 + s.off * U * .026 + Math.sin(u * s.fq * 6.283 + flow * 1.5 + s.ph) * U * (.016 + chase * .022) + Math.sin(u * 2.2 - flow * .6 + s.ph * 2) * U * .022];
  const tree = (s, u) => { const fan = Math.pow(sm(.2, 1, u), 1.2), sway = Math.sin(T * .5 + u * 2.4 + s.k) * U * .007 * u;
    return [cx + s.off * U * (.01 + .32 * fan * s.j) - s.off * U * .07 * sm(.74, 1, u) + s.off * U * .025 * Math.sin(u * Math.PI * 1.5) + Math.sin(u * 5 + s.ph) * U * .006 * u + sway, cy + U * .34 - u * U * .68 + Math.abs(s.off) * U * .025 * fan]; };
  const arc = (side, u, ro) => { const a = (side < 0 ? 72 + u * 162 : 108 - u * 162) * Math.PI / 180, r = R + ro; return [cx + Math.cos(a) * r, cy + lift + Math.sin(a) * r * sq]; };
  const wreathPt = (s, u) => s.side ? arc(s.side, u, (s.lane - 2.5) * U * .0045 * Math.sin(Math.PI * u)) : [cx, cy + lift + R * sq];
  const treeBlend = (s, u, chase) => { const p = river(s, u, chase), m = sm(1.12 + u * .42, 1.55 + u * .42, B); if (m <= 0) return p; const q = tree(s, u); return [mix(p[0], q[0], m), mix(p[1], q[1], m)]; };
  const strandPt = (s, u, chase) => { const p = treeBlend(s, u, chase), m = sm(3.0 + u * .3, 3.4 + u * .3, B); if (m <= 0) return p; const q = wreathPt(s, u); return [mix(p[0], q[0], m), mix(p[1], q[1], m)]; };
  // a leaf's pose from where it sits and which way its stem runs
  const pose = (p, q, out, lean) => { let tx = q[0] - p[0], ty = q[1] - p[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m; const nx = -ty * out, ny = tx * out; return angOf(tx * Math.cos(lean) + nx * Math.sin(lean), ty * Math.cos(lean) + ny * Math.sin(lean)); };
  const leafAt = (x, y, a, k, flip, alpha) => { if (alpha <= .004 || k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k * flip, k); ctx.globalAlpha = alpha; ctx.fill(LEAF, 'evenodd'); ctx.fill(STALK); ctx.restore(); };
  const line = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const e = pts[pts.length - 1]; ctx.lineTo(e[0], e[1]); };
  const glow = (x, y, r, rgb, a) => { if (a <= .003) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); };

  // How far through the story, 0 to 6. The frame sticks below the site's bar, so the scroll it
  // travels is the story's height less the frame's own, measured from where the frame sticks.
  const progress = () => { const r = story.getBoundingClientRect(), top = parseFloat(getComputedStyle(stage).top) || 0, span = r.height - stage.offsetHeight;
    return Math.min(6, Math.max(0, ((top - r.top) / Math.max(1, span)) * 6.25)); };
  let endShown = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const target = progress(); B = reduce ? target : B + (target - B) * Math.min(1, dt * 4.5);
    const rect = story.getBoundingClientRect(); if (rect.bottom < 0 || rect.top > innerHeight) return;
    if (!reduce) T += dt;
    // the subtitles
    caps.forEach((c, i) => { const inn = i === 0 ? 1 : sm(i - .14, i + .1, B), out = sm(i + .66, i + .86, B), o = inn * (1 - out); c.style.opacity = o.toFixed(3); c.style.transform = 'translateY(' + ((1 - inn) * 14 - out * 10).toFixed(1) + 'px)'; });
    const endIn = sm(5.3, 5.6, B); endCap.style.opacity = endIn.toFixed(3); endCap.style.transform = 'translateY(' + ((1 - endIn) * 12).toFixed(1) + 'px)';
    // the end card's link can be clicked only once it can be seen
    const shown = endIn > .5; if (shown !== endShown) { endShown = shown; endCap.classList.toggle('on', shown); }
    if (hint) hint.style.opacity = (.75 * (1 - sm(.02, .2, B))).toFixed(3);

    // timings
    const chase = sm(.82, 1.12, B) * (1 - sm(1.35, 1.7, B));
    flow += dt * (reduce ? 0 : .55 + chase * 3.2);
    const crown = sm(3.38, 3.68, B) * (1 - sm(4.0, 4.3, B)), heart = sm(2.0, 2.3, B) * (1 - sm(2.9, 3.15, B)), fade = 1 - sm(4.3, 4.85, B), logoOn = sm(4.92, 5.1, B);
    R = U * .245; sq = mix(1, .36, crown); lift = -U * .09 * crown;
    const per = 60 / 52, ph = T % per; beat = reduce ? 0 : Math.exp(-Math.pow(ph / .06, 2)) + .55 * Math.exp(-Math.pow((ph - .27) / .075, 2));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // night, and a faint pool of light where she stands
    ctx.fillStyle = '#09160F'; ctx.fillRect(0, 0, W, H);
    glow(cx, cy, Math.max(W, H) * .72, '28,62,43', .62);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) glow(W * (.5 + .36 * Math.sin(T * .031 + i * 2.1)), H * (.5 + .26 * Math.cos(T * .023 + i * 1.3)), Math.max(W, H) * .5, G, .028);
    // motes over the water
    const moteFade = 1 - .55 * sm(4.8, 5.3, B);
    for (const m of motes) { const tw = Math.pow(Math.max(0, Math.sin(T * .7 * m.sp + m.ph)), 4), a = (.04 + .42 * tw) * (.25 + .75 * m.z) * moteFade; if (a < .01) continue;
      const y = (((m.y - T * .006 * m.sp) % 1) + 1) % 1 * H, x = (m.x + Math.sin(T * .2 * m.sp + m.ph) * .012) * W; ctx.fillStyle = 'rgba(' + G + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, .5 + m.z * 1.3, 0, 6.283); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    // the grove's own leaves, falling out of focus
    const grove = sm(1.75, 2.6, B) * (1 - .45 * sm(4.9, 5.3, B));
    if (grove > 0) for (const d of drift) { const fall = (d.y + T * .011 * d.sp) % 1.2 - .1, x = (d.x + Math.sin(T * .33 * d.sp + d.sw) * .03) * W, y = fall * H, k = (.45 + d.z * .95) * U / 820;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.r + T * d.vr * .25); ctx.globalAlpha = (.05 + d.z * .16) * grove; ctx.drawImage(SPR[Math.min(3, Math.floor(Math.abs(d.z - .45) * 7.5))], -45 * k, -132 * k, 90 * k, 150 * k); ctx.restore(); }
    ctx.globalAlpha = 1;

    // her heart, under the bark
    if (heart > .005) { const hp = strandPt(strands[4], .3, chase); ctx.globalCompositeOperation = 'lighter';
      glow(hp[0], hp[1], U * .4, PK, heart * (.07 + .1 * beat)); glow(hp[0], hp[1], U * (.07 + .025 * beat), PK, heart * (.24 + .3 * beat)); }

    // her strands
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strands) { const a = (.36 + .26 * (1 - s.lane / 4)) * fade * (s.side ? 1 : 1 - sm(3.0, 3.3, B)) * (1 + heart * beat * .35); if (a <= .005) continue;
      const pts = []; for (let i = 0; i <= NP; i++) pts.push(strandPt(s, i / NP, chase)); line(pts);
      const rv = 1 - sm(1.2, 1.8, B);  // the river glows a little more than the tree
      ctx.strokeStyle = 'rgba(' + G + ',' + (a * (.07 + .05 * rv)).toFixed(3) + ')'; ctx.lineWidth = Math.max(5, U * (.014 + .008 * rv)); ctx.stroke();
      let core = 'rgba(' + G + ',' + Math.min(1, a * .75).toFixed(3) + ')';
      if (heart > .01) { const hp = strandPt(strands[4], .3, chase), rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], U * (.14 + .18 * beat)), pk = heart * (.7 + .3 * beat);
        rg.addColorStop(0, 'rgba(' + PK + ',' + Math.min(1, a * .9 * pk).toFixed(3) + ')'); rg.addColorStop(1, core); core = rg; }
      // the hairline itself, thinning out toward its growing tip
      ctx.strokeStyle = core; ctx.lineWidth = .9 + (1 - s.lane / 4) * .7; ctx.lineCap = 'butt';
      const cut = [0, Math.round(NP * .72), Math.round(NP * .86), NP], fadeTip = [1, .55, .22];
      for (let c = 0; c < 3; c++) { ctx.globalAlpha = fadeTip[c]; line(pts.slice(cut[c], cut[c + 1] + 1)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.lineCap = 'round'; }
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = LEAFC;

    // the logo's frame, which the last two leaves travel to. On a short, wide screen it's sized by the height.
    // The name and the end card under it sit together a little above the middle of the frame.
    const w = Math.min(W * .8, 880, H * 1.3), sc = w / (NB[2] - NB[0]), logoH = (NB[3] - NB[1]) * sc, gap = Math.max(22, U * .045);
    const cyL = headB + Math.max(0, (H - headB - (logoH + gap + cardH)) * .46) + logoH / 2, lx = cx - (NB[0] + NB[2]) / 2 * sc, ly = cyL - (NB[1] + NB[3]) / 2 * sc;
    const target2 = (side) => { const P0 = side < 0 ? A0 : Z0; return { x: lx + P0[0] * sc, y: ly + P0[1] * sc, a: 0, k: (A0[1] - A1[1]) * sc / LEN, flip: side < 0 ? -1 : 1 }; };
    // her leaves: they grow from the stalk, one after another; bend with the branches into a laurel; fall
    const echo = [];
    for (const l of leaves) {
      const grow = sm(1.48 + l.t * .5, 1.6 + l.t * .5, B); if (grow <= 0) continue;
      const s = strands[l.k], p1 = treeBlend(s, l.ut, chase), p2 = treeBlend(s, Math.min(1, l.ut + .012), chase);
      let x = p1[0], y = p1[1], a = pose(p1, p2, l.out, .72), k = U * .07 / LEN * (1 - .32 * l.t), flip = l.out;
      const uw = .05 + .93 * l.t, mw = sm(3.0 + uw * .3, 3.4 + uw * .3, B);
      if (mw > 0) { const q1 = arc(l.side, uw, 0), q2 = arc(l.side, Math.min(1, uw + .01), 0); x = mix(x, q1[0], mw); y = mix(y, q1[1], mw); a = mixA(a, pose(q1, q2, l.out * l.side, .52), mw); k = mix(k, U * .088 / LEN * (1 - .45 * l.t), mw); }
      k *= grow * (1 + heart * beat * .025);
      if (!reduce) a += Math.sin(T * 1.1 + l.sway) * .035 * (1 - mw * .6);
      if (mw > .5 && fade > 0) echo.push([x, y, a, k, flip]);
      let alpha = .94;
      if (l.chosen) {
        // one of the two that stay: on its way to the logo it turns into the logo's own leaf, so the handoff has no seam
        const c = sm(4.45, 4.95, B), t2 = target2(l.side), shape = sm(0, .45, c);
        if (c > 0) { x = mix(x, t2.x, c); y = mix(y, t2.y, c); a = mixA(a, t2.a, c); }
        leafAt(x, y, a, k, flip, alpha * (1 - shape));
        if (shape > 0) { const P0 = l.side < 0 ? A0 : Z0, kb = mix(k * LEN / (A0[1] - A1[1]), sc, c), br = 1 + beat * .0045;
          ctx.save(); ctx.translate(cx, cyL); ctx.scale(br, br); ctx.translate(-cx, -cyL); ctx.translate(x, y); ctx.rotate(a); ctx.scale(kb, kb); ctx.translate(-P0[0], -P0[1]);
          ctx.globalAlpha = alpha * shape * (1 - logoOn); ctx.fill(l.side < 0 ? BL : BR, 'evenodd'); ctx.fill(l.side < 0 ? BLS : BRS); ctx.restore(); }
        continue;
      } else { const fp = sm(4.28 + l.seed * .42, 4.62 + l.seed * .42, B); if (fp > 0) { y += fp * fp * H * .8; x += Math.sin(T * .9 + l.sway) * fp * U * .08; a += fp * (l.seed - .5) * 5; alpha *= 1 - sm(.5, 1, fp); } }
      leafAt(x, y, a, k, flip, alpha);
    }
    // every laurel since: the crown's echoes, rippling out through time
    for (let e = 0; e < 4; e++) { const q = sm(3.55 + e * .16, 4.25 + e * .16, B); if (q <= 0 || q >= 1) continue; const s2 = 1 + q * 2.1, al = .2 * (1 - q) * sm(0, .1, q), oy = cy + lift;
      for (const [x, y, a, k, flip] of echo) leafAt(cx + (x - cx) * s2, oy + (y - oy) * s2, a, k * (1 + q * .5), flip, al); }
    ctx.globalAlpha = 1;

    // her name, held in the two leaves that stayed. It keeps her heartbeat, barely.
    if (logoOn > 0) { const br = 1 + beat * .0045;
      ctx.save(); ctx.translate(cx, cyL); ctx.scale(br, br); ctx.translate(-cx, -cyL); ctx.translate(lx, ly); ctx.scale(sc, sc);
      ctx.globalAlpha = logoOn; ctx.fillStyle = LEAFC; ctx.fill(BL, 'evenodd'); ctx.fill(BLS); ctx.fill(BR, 'evenodd'); ctx.fill(BRS);
      ctx.fillStyle = PAPER; LETTERS.forEach((L, i) => { const q = sm(5.0 + i * .07, 5.28 + i * .07, B); if (q <= 0) return; ctx.globalAlpha = q; ctx.save(); ctx.translate(L[0], (1 - q) * 70); ctx.fill(L[1]); ctx.restore(); });
      ctx.restore(); ctx.globalAlpha = 1; }
    // the end card sits under the name, wherever the name lands
    endCap.style.top = Math.round(cyL + logoH / 2 + gap) + 'px';

    // the edges of the frame, and film grain
    const vg = ctx.createRadialGradient(cx, H * .44, U * .2, cx, H * .44, Math.hypot(W, H) * .6); vg.addColorStop(0, 'rgba(4,11,7,0)'); vg.addColorStop(1, 'rgba(4,11,7,.9)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .045; ctx.fillStyle = grain[Math.floor(T * 12) % 4]; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
}
