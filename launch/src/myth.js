// Daphne's myth as one line of light that runs across six slides, so swiping plays it like the brand book's scrolled
// story: nine hairlines spring from her (her hair, and the river), quicken as she's chased, dip and rise into a tree
// with raised arms and her heart beating under the bark, reach across into a laurel crown, and trail away into a
// festival laurel made with Daphne, where the light turns to gold. The seventh slide is her name between two leaves.
//
// Only the hairlines cross from one slide to the next. Every leaf is checked to sit wholly inside one slide's safe box,
// and every leaf and line is checked against the words, so nothing is cut at a slide's edge or drawn under a sentence.
const brand = await (await fetch('./brand.json')).json();

export async function paintMyth(strip, { W, H, SAFE, problems, grainUrl }) {
  const slides = [...strip.querySelectorAll('.slide')], N = slides.length, SW = N * W, dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.className = 'paint'; cv.width = Math.round(SW * dpr); cv.height = Math.round(H * dpr); cv.style.width = SW + 'px';
  strip.prepend(cv);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const G = '184,229,154', PK = '245,156,192', LEAFC = '#B8E59A';
  const LEAF = new Path2D(brand.leaf.d), STALK = new Path2D(brand.leaf.stalk), LEN = brand.leaf.len;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cl = (x) => Math.min(1, Math.max(0, x)), sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // where the words are on each slide, in strip coordinates, so the art can stay out of them
  const sr = strip.getBoundingClientRect();
  const words = slides.flatMap((s) => [...s.querySelectorAll('.blk')].map((b) => { const r = b.getBoundingClientRect(); return { x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top, end: 'end' in b.dataset, name: b.dataset.name || b.textContent.trim().slice(0, 30), slide: +s.dataset.i }; }));
  const inWords = (x, y, pad = 14) => words.find((w) => !w.end && x > w.x0 - pad && x < w.x1 + pad && y > w.y0 - pad && y < w.y1 + pad);

  // ── the night ──
  ctx.fillStyle = '#09160F'; ctx.fillRect(0, 0, SW, H);
  const glow = (x, y, r, rgb, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); };
  for (const [x, y, r] of [[300, 930, 760], [1560, 900, 820], [2700, 860, 800], [3780, 860, 760], [4860, 980, 760], [5940, 760, 760], [7020, 660, 800]]) glow(x, y, r, '28,62,43', 0.62);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) glow(400 + i * 820, 500 + 300 * Math.sin(i * 1.7), 640, G, 0.022);
  ctx.globalCompositeOperation = 'source-over';
  // grain, under everything that's drawn after it
  const gi = new Image(); gi.src = grainUrl; await gi.decode();
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.05; ctx.fillStyle = ctx.createPattern(gi, 'repeat'); ctx.fillRect(0, 0, SW, H); ctx.restore();
  // motes over the water, kept off the words
  for (let i = 0; i < 340; i++) {
    const x = 70 + rnd() * (SW - 140), y = 70 + rnd() * (H - 140), z = rnd(), a = (0.05 + 0.35 * Math.pow(rnd(), 3)) * (0.3 + 0.7 * z);
    if (inWords(x, y, 30)) continue;
    ctx.fillStyle = `rgba(${G},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 0.6 + z * 1.4, 0, 6.283); ctx.fill();
  }

  // ── her strands ──
  // Catmull-Rom through key points, sampled densely
  const spline = (pts, per = 14) => {
    const out = [], P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < per; s++) {
      const t = s / per, p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
    out.push(pts[pts.length - 1]); return out;
  };
  const X0 = 2700, CX = 3780, CY = 880, CR = 300; // the tree's trunk, the crown's center and radius
  const strands = [];
  for (let k = 0; k < 9; k++) {
    const o = (k - 4) / 4, keys = [];
    // the river: from her, a single point of light, spreading and quickening as she's chased
    for (let x = 250; x <= 2330; x += 34) {
      const s = sm(250, 820, x), chase = sm(1250, 2150, x);
      keys.push([x, 930 + o * 40 * s + s * (9 + 24 * chase) * Math.sin(x * 0.0102 + chase * (x - 1250) * 0.0042 + k * 0.62) + 15 * s * Math.sin(x / 650 + 1.3)]);
    }
    // she dips to the roots and rises: a trunk, then arms raised high, the way Bernini carved her
    keys.push([2452, 1010 + o * 18], [2590, 1160 + o * 8], [2672 + o * 16, 1204], [X0 + o * 15, 1128], [X0 + o * 13, 1030], [X0 + o * 11, 930], [X0 + o * 9, 860]);
    const armFrom = keys.length - 1, ao = Math.abs(o);
    keys.push([X0 + o * 120, 742 - 26 * (1 - ao)], [X0 + o * 260, 640 - 10 * ao - 40 * (1 - ao)], [X0 + o * 400, 560 + 40 * o * o - 20 * (1 - ao)]);
    const goes = k >= 6; // three strands reach across and become the crown
    if (goes) {
      const b = k - 7;
      keys.push([3150, 572 + b * 8], [3280, 560 + b * 8], [3440, 556 + b * 8], [3610, 554 + b * 8], [3800, 568 + b * 8], [3925, 610 + b * 7]);
      // the crown: over the top, down the right side, round the bottom, up the left side to its tip
      for (let a = 308; a <= 232 + 360; a += 6) { const r = CR + b * 7, t = (a * Math.PI) / 180; keys.push([CX + r * Math.cos(t), CY + r * Math.sin(t)]); }
    }
    const pts = spline(keys);
    strands.push({ k, o, pts, goes, armStart: armFrom * 14, armEnd: (armFrom + 3) * 14 });
  }
  // the stems' tail, from the crown's foot across two slides into the festival laurel
  const end = (() => { const lb = words.find((w) => w.end); return [(lb.x0 + lb.x1) / 2, lb.y1 - 8]; })();
  for (let b = -1; b <= 1; b++) {
    const keys = [[CX + 30, CY + CR - 6 + b * 5], [CX + 160, CY + CR + 26 + b * 6], [4320, 1200 + b * 7], [4640, 1180 + b * 7], [4960, 1166 + b * 7], [5280, 1146 + b * 6], [5560, 1130 + b * 5], [end[0] - 170, end[1] + 34 + b * 4], [end[0] - 50, end[1] + 10 + b * 2], end];
    strands.push({ k: 9 + b, o: b, pts: spline(keys), tail: true });
  }

  // her heart, under the bark: the one Bloom on its slide
  const HX = X0, HY = 1062;
  slides[Math.floor(HX / W)].dataset.bloom = 1;
  ctx.globalCompositeOperation = 'lighter';
  glow(HX, HY, 230, PK, 0.11); glow(HX, HY, 70, PK, 0.42);
  ctx.globalCompositeOperation = 'source-over';

  // the lines: a soft glow, then the hairline, fading in from her and out at each tip
  const checkPts = (s) => { for (const [x, y] of s.pts) { if (y < SAFE || y > H - SAFE || x < SAFE || x > SW - SAFE) { problems.push(`myth: a line leaves the frame near ${Math.round(x)}, ${Math.round(y)}`); return; } const w = inWords(x, y, 8); if (w && !(s.tail && w.end)) { problems.push(`myth: a line runs under the words "${w.name}" on slide ${w.slide + 1}`); return; } } };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of strands) {
    checkPts(s);
    const lane = Math.abs(s.o), n = s.pts.length;
    const path = (a, b) => { ctx.beginPath(); ctx.moveTo(...s.pts[a]); for (let i = a + 1; i <= b; i++) ctx.lineTo(...s.pts[i]); };
    ctx.globalCompositeOperation = 'lighter';
    path(0, n - 1); ctx.strokeStyle = `rgba(${G},${s.tail ? 0.06 : 0.07})`; ctx.lineWidth = s.tail ? 8 : 12; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'butt';
    const chunk = 6;
    for (let a = 0; a < n - 1; a += chunk) {
      const b = Math.min(n - 1, a + chunk), u = (a + b) / 2 / (n - 1), [mx, my] = s.pts[Math.round((a + b) / 2)];
      const fadeIn = s.tail ? sm(0, 0.04, u) : sm(0, 0.035, u), fadeOut = 1 - sm(0.93, 1, u) * (s.tail ? 0.3 : 0.85);
      let col = G, al = (0.5 + 0.38 * (1 - lane)) * fadeIn * fadeOut;
      const dh = Math.hypot(mx - HX, my - HY); if (dh < 200) { const m = 1 - dh / 200; col = [0, 1, 2].map((i) => Math.round(+G.split(',')[i] * (1 - m) + +PK.split(',')[i] * m)).join(','); al = Math.min(1, al * (1 + m * 0.6)); }
      path(a, b); ctx.strokeStyle = `rgba(${col},${al.toFixed(3)})`; ctx.lineWidth = s.tail ? 1.6 : 1.35 + (1 - lane) * 0.9; ctx.stroke();
    }
    ctx.lineCap = 'round';
  }
  // where her light meets the gold
  ctx.globalCompositeOperation = 'lighter'; glow(end[0], end[1], 90, '244,227,168', 0.22); glow(end[0], end[1], 26, '255,246,220', 0.5); ctx.globalCompositeOperation = 'source-over';

  // ── her leaves ──
  const box = [[-80, -505], [80, -505], [80, 60], [-80, 60]];
  const leafAt = (x, y, ang, k, alpha = 0.92) => {
    // the leaf's corners in the strip, so it can be checked against its slide's safe box and the words
    const c = Math.cos(ang), s = Math.sin(ang), pts = box.map(([u, v]) => [x + (u * c - v * s) * k, y + (u * s + v * c) * k]);
    const i = Math.floor(x / W), x0 = i * W;
    if (pts.some(([px, py]) => px < x0 + SAFE || px > x0 + W - SAFE || py < SAFE || py > H - SAFE)) problems.push(`myth: a leaf on slide ${i + 1} crosses the edge of its safe box near ${Math.round(x - x0)}, ${Math.round(y)}`);
    for (const [px, py] of [...pts, [x, y]]) { const w = inWords(px, py, 6); if (w) { problems.push(`myth: a leaf on slide ${i + 1} sits under the words "${w.name}"`); break; } }
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(k, k); ctx.globalAlpha = alpha; ctx.fillStyle = LEAFC; ctx.fill(LEAF, 'evenodd'); ctx.fill(STALK); ctx.restore();
  };
  const tangent = (pts, i) => { const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)]; return Math.atan2(b[0] - a[0], -(b[1] - a[1])); };
  // the tree: leaves grow along every arm, alternating sides, and a leaf at each tip that doesn't reach on
  for (const s of strands.filter((t) => !t.tail)) {
    const fr = s.goes ? [0.22, 0.36, 0.5, 0.64, 0.78] : [0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.93];
    fr.forEach((f, j) => {
      const i = Math.round(s.armStart + f * (s.armEnd - s.armStart)), [x, y] = s.pts[i], side = (j + s.k) % 2 ? 1 : -1;
      leafAt(x, y, tangent(s.pts, i) + side * 0.74, (50 + 20 * Math.sin(Math.PI * f)) / LEN * (1 - 0.12 * Math.abs(s.o)), 0.86 + 0.1 * Math.sin(j * 2.1 + s.k));
    });
    if (!s.goes) { const i = s.armEnd, [x, y] = s.pts[i]; leafAt(x, y, tangent(s.pts, i), 58 / LEN); }
  }
  // the crown: leaves along both sides, larger at the foot, every one pointing up toward the crown's open top
  for (let a = 318, j = 0; a <= 582; a += 8.5, j++) {
    const t = (a * Math.PI) / 180, x = CX + CR * Math.cos(t), y = CY + CR * Math.sin(t);
    // along the arc toward the open top: angle t on the right side, t + π on the left; leaves splay in and out
    const right = a < 450, foot = 1 - Math.abs(a - 450) / 132, side = j % 2 ? 1 : -1;
    leafAt(x, y, (right ? t : t + Math.PI) + side * 0.6, (58 + 26 * foot) / LEN);
  }
  { const t = (590 * Math.PI) / 180; leafAt(CX + CR * Math.cos(t), CY + CR * Math.sin(t), t + Math.PI + 0.1, 60 / LEN); }

  // the edges of the whole strip, darkened a little, like the brand book's frame
  const vt = ctx.createLinearGradient(0, 0, 0, H); vt.addColorStop(0, 'rgba(4,11,7,.55)'); vt.addColorStop(0.2, 'rgba(4,11,7,0)'); vt.addColorStop(0.82, 'rgba(4,11,7,0)'); vt.addColorStop(1, 'rgba(4,11,7,.7)');
  ctx.fillStyle = vt; ctx.fillRect(0, 0, SW, H);
  for (const [x0, x1] of [[0, 260], [SW, SW - 260]]) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(4,11,7,.6)'); g.addColorStop(1, 'rgba(4,11,7,0)'); ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, 260, H); }
}
