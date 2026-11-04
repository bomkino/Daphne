// engine.mjs — laurel engine v2 (prototype). Pure ES module, no dependencies; runs in the browser and in Node.
//
// A laurel is a document: { seed, branch, paint, fields, roles, layout, canvas }.
//   branch  – the procedural wreath: spine × stem × leaf family/profile × arrangement × ornaments
//   paint   – every color is a Paint: solid, linear, radial or metal, applied to the whole wreath or per leaf
//   fields  – any number of text lines (status, festival, award, year, …), each with a role and a slot
//   roles   – type styles (font, weight, case, tracking, size ratio, paint) shared by fields
//   layout  – how the slots are arranged; the inside stack is auto-fitted to the free space between branches
// render(doc, env) returns a standalone SVG plus a report (fit margins, collisions) used by the stress tests.
// env.measure(text, font, weight, italic, size) gives real advance widths in the browser (canvas measureText);
// without it a rough per-family estimate is used.

// ── utilities ─────────────────────────────────────────────────────────────
export const rngOf = (seed) => { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const rad = (d) => (d * Math.PI) / 180;
const f = (v) => Math.round(v * 100) / 100; // two decimals, as a number (the hot path of every outline)
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const merge = (a, b) => { const o = Array.isArray(a) ? [...a] : { ...a }; for (const k of Object.keys(b || {})) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k]; return o; };
const X = (ox, oy, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return ([x, y]) => [ox + x * c - y * s, oy + x * s + y * c]; };
const comp = (outer, inner) => (p) => outer(inner(p));

let SINK = null; // outline points of the branch being built: used for collisions and free space
const sink = (pt) => { if (SINK) SINK.push(pt); return pt; };

function smoothOpen(pts, move = true) {
  let d = move ? `M${f(pts[0][0])} ${f(pts[0][1])}` : `L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
const polyD = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
const circleD = (x, y, r) => `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x + r)} ${f(y)}A${f(r)} ${f(r)} 0 1 0 ${f(x - r)} ${f(y)}Z`;
const dotD = (x, y, r) => { for (let k = 0; k < 8; k++) sink([x + r * Math.cos(k * 0.785), y + r * Math.sin(k * 0.785)]); return circleD(x, y, r); };
const starPts = (x, y, r, n = 5, inner = 0.42, rot = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, k) => { const rr = k % 2 ? r * inner : r, a = rot + (k * Math.PI) / n; return [x + rr * Math.cos(a), y + rr * Math.sin(a)]; });

// ── badge frames: the branchless look of the top-tier festivals. Every frame is drawn as filled outlines (evenodd
// rings, not strokes), so metals, gradients and effects behave exactly as they do on leaves. Fixed frames (ring, oval,
// scallop) hold the text inside a shape and can carry curved text in a band; hugging frames (box, rules, ticket, film,
// corners) are sized around the words. Each returns its paths, the points along its lines (for collision checks) and
// its outer box.
const ellD = (a, b, cx = 0, cy = 0) => `M${f(cx - a)} ${f(cy)}A${f(a)} ${f(b)} 0 1 0 ${f(cx + a)} ${f(cy)}A${f(a)} ${f(b)} 0 1 0 ${f(cx - a)} ${f(cy)}Z`;
const ellPts = (a, b, n = 72) => Array.from({ length: n }, (_, k) => [a * Math.cos((k * 2 * Math.PI) / n), b * Math.sin((k * 2 * Math.PI) / n)]);
const rrD = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); return r < 0.01 ? `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z` : `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`; };
// a ticket: a rectangle with a concave bite out of each corner
const ticketD = (x, y, w, h, r) => { r = Math.max(0.5, Math.min(r, w / 2 - 0.5, h / 2 - 0.5)); return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 0 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 0 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 0 ${f(x + r)} ${f(y)}Z`; };
const rectPts = (x, y, w, h, step = 3) => { const out = []; for (let t = 0; t <= w; t += step) out.push([x + t, y], [x + t, y + h]); for (let t = 0; t <= h; t += step) out.push([x, y + t], [x + w, y + t]); return out; };
// scalloped edge: round bumps between sharp notches, like a rosette sticker or a wax-seal stamp
const scallopPts = (R, amp, n) => Array.from({ length: n * 14 }, (_, k) => { const t = (k * 2 * Math.PI) / (n * 14), r = R - amp + 2 * amp * Math.pow(Math.abs(Math.cos((n * t) / 2)), 0.7); return [r * Math.cos(t), r * Math.sin(t)]; });
const ornD = (kind, x, y, s) => kind === 'dot' ? circleD(x, y, s * 0.42) : kind === 'diamond' ? polyD([[x, y - s * 0.62], [x + s * 0.42, y], [x, y + s * 0.62], [x - s * 0.42, y]]) : polyD(starPts(x, y, s * 0.62));
export const FRAMES = { none: 'No frame', ring: 'Seal ring', oval: 'Oval', scallop: 'Scalloped medal', box: 'Box', rules: 'Double rules', ticket: 'Ticket', film: 'Film strip', corners: 'Corner marks' };
const FIXED_FRAMES = ['ring', 'oval', 'scallop'];
export const FILLABLE_FRAMES = ['ring', 'oval', 'scallop', 'box', 'ticket', 'film']; // rules and corner marks are lines only

// fixed frames: the geometry is known before the text is fitted (the words fit the shape)
function fixedFrame(FR, hasBand) {
  const S = 100 * (FR.size || 1), w = FR.w ?? 1.6, gap = FR.gap ?? 3, oval = FR.kind === 'oval', sc = FR.kind === 'scallop';
  const ax = oval ? 1.22 : 1, ay = oval ? 0.84 : 1, oa = S * ax, ob = S * ay;
  const bt = hasBand ? S * (FR.band ?? 0.27) : 0, deco = sc ? S * 0.1 : 0; // band for curved text; a scallop's inner ring
  let kIn = hasBand ? bt : FR.double ? gap + w : deco;
  if (FR.filled && !hasBand) kIn = Math.max(kIn, sc ? deco : w * 2.8); // keep the words inside the engraved edge line
  const ta = oa - kIn - w * 0.5 - (sc && !hasBand && FR.double ? gap + w : 0), tb = ob - kIn - w * 0.5 - (sc && !hasBand && FR.double ? gap + w : 0);
  return { S, w, gap, oval, sc, ax, ay, oa, ob, bt, hasBand, deco, kIn, ta, tb, amp: S * 0.045 };
}
function drawFixedFrame(G, FR) {
  const { w, gap, oa, ob, bt, hasBand, sc, deco, amp } = G, filled = !!FR.filled;
  const ring = (k, ww = w) => `${ellD(oa - k + ww / 2, ob - k + ww / 2)}${ellD(oa - k - ww / 2, ob - k - ww / 2)}`;
  const paint = [], ink = [], pts = [];
  const edge = sc ? scallopPts(oa + amp, amp, Math.round(26 * (G.S / 100))) : null;
  if (filled) {
    paint.push(sc ? polyD(edge) : ellD(oa + w / 2, ob + w / 2));
    // engraved detail on the struck face: a fine line just inside the edge, and the band's inner line
    ink.push(ring(sc ? (hasBand ? w * 1.6 : deco) : w * 2.2, w * 0.55));
    if (hasBand) ink.push(ring(bt, w * 0.7));
    if (FR.double && hasBand) ink.push(ring(bt + gap + w * 0.5, w * 0.4));
  } else {
    if (sc) { const inner = scallopPts(oa + amp - w * 1.3, amp, Math.round(26 * (G.S / 100))); paint.push(polyD(edge) + polyD(inner.reverse())); if (!hasBand) paint.push(ring(deco, w * 0.8)); }
    else paint.push(ring(0));
    if (FR.double && !sc) paint.push(ring(gap + w, w * 0.55));
    if (hasBand) { paint.push(ring(bt)); if (FR.double) paint.push(ring(bt - gap - w * 0.6, w * 0.55)); }
  }
  for (const [x, y] of sc ? edge : ellPts(oa + w / 2, ob + w / 2)) pts.push([x, y]);
  if (G.kIn > 0) for (const [x, y] of ellPts(oa - G.kIn, ob - G.kIn)) pts.push([x, y]);
  return { paint, ink, pts, box: [-oa - w - amp, -ob - w - amp, 2 * (oa + w + amp), 2 * (ob + w + amp)] };
}
// hugging frames: drawn around the block of words, [x0, y0, x1, y1]
function drawHugFrame(FR, blk, m) {
  const w = FR.w ?? 1.6, gap = FR.gap ?? 3, filled = !!FR.filled, k = FR.kind, paint = [], ink = [];
  let X0 = blk[0] - m * 1.5, X1 = blk[2] + m * 1.5, Y0 = blk[1] - m, Y1 = blk[3] + m;
  const minW = (Y1 - Y0) * 1.15; if (X1 - X0 < minW) { const d = (minW - (X1 - X0)) / 2; X0 -= d; X1 += d; }
  if (k === 'ticket') { const rb = Math.min(X1 - X0, Y1 - Y0) * 0.16; X0 -= rb * 0.9; X1 += rb * 0.9; } // the corner bites must clear the words
  let W = X1 - X0, Hh = Y1 - Y0, pts = [], box;
  if (k === 'box' || k === 'ticket') {
    const shape = k === 'box' ? (x, y, ww, hh, r) => rrD(x, y, ww, hh, r) : ticketD;
    const r0 = k === 'box' ? (FR.radius ?? 0.25) * Math.min(W, Hh) * 0.5 : Math.min(W, Hh) * 0.16;
    const line = (i, ww = w) => `${shape(X0 - i - ww / 2, Y0 - i - ww / 2, W + 2 * i + ww, Hh + 2 * i + ww, k === 'box' ? r0 + i + ww / 2 : r0 - i - ww / 2)}${shape(X0 - i + ww / 2, Y0 - i + ww / 2, W + 2 * i - ww, Hh + 2 * i - ww, k === 'box' ? Math.max(0, r0 + i - ww / 2) : r0 - i + ww / 2)}`;
    if (filled) { paint.push(shape(X0 - w / 2, Y0 - w / 2, W + w, Hh + w, k === 'box' ? r0 + w / 2 : r0 - w / 2)); if (FR.double) ink.push(line(-(gap + w * 0.6), w * 0.5)); }
    else { paint.push(line(0)); if (FR.double) paint.push(line(-(gap + w * 0.8), w * 0.55)); }
    pts = rectPts(X0, Y0, W, Hh); box = [X0 - w, Y0 - w, W + 2 * w, Hh + 2 * w];
  } else if (k === 'rules') {
    // a heavy rule outside a fine one, above and below; an ornament can break each rule at its center
    const o = FR.orn && FR.orn !== 'none' ? FR.orn : null, os = Math.max(4, m * 0.9), og = o ? os * 1.1 : 0;
    const seg = (y, h) => o ? [rrD(X0, y - h / 2, W / 2 - og, h, 0), rrD(X1 - (W / 2 - og), y - h / 2, W / 2 - og, h, 0)].join('') : rrD(X0, y - h / 2, W, h, 0);
    const heavy = FR.double ? w * 1.7 : w, fine = w * 0.55;
    for (const [y, sg] of [[Y0, -1], [Y1, 1]]) {
      paint.push(seg(y + sg * (FR.double ? gap * 0.5 + fine : 0), heavy));
      if (FR.double) paint.push(seg(y - sg * (gap * 0.5), fine));
      if (o) paint.push(ornD(o, 0, y, os));
      for (let x = X0; x <= X1; x += 3) pts.push([x, y]);
    }
    box = [X0, Y0 - gap - heavy * 2, W, Hh + 2 * (gap + heavy * 2)];
  } else if (k === 'film') {
    // a strip of 35 mm stock: perforations along both edges (taller than wide, at 2.4× their width), image area between
    const hs = clamp(m * 0.7, 3, 9), hh = hs * 1.41, pitch = hs * 2.4, edge = hs * 0.55, row = hh + edge * 2;
    const n = Math.max(3, Math.floor((W + pitch * 0.3) / pitch)), x0 = -((n - 1) * pitch) / 2;
    const holes = []; for (const yc of [Y0 - row / 2, Y1 + row / 2]) for (let i = 0; i < n; i++) holes.push(rrD(x0 + i * pitch - hs / 2, yc - hh / 2, hs, hh, hs * 0.22));
    if (filled) paint.push(rrD(X0, Y0 - row, W, Hh + 2 * row, w) + holes.join(''));
    else { paint.push(rrD(X0 - w / 2, Y0 - row - w / 2, W + w, Hh + 2 * row + w, w) + rrD(X0 + w / 2, Y0 - row + w / 2, W - w, Hh + 2 * row - w, 0)); paint.push(holes.join('')); for (const y of [Y0, Y1]) paint.push(rrD(X0, y - w * 0.3, W, w * 0.6, 0)); }
    pts = rectPts(X0, Y0 - row, W, Hh + 2 * row).concat(rectPts(X0, Y0, W, Hh)); box = [X0 - w, Y0 - row - w, W + 2 * w, Hh + 2 * row + 2 * w];
  } else { // corners: four brackets, like the crop marks of a frame
    const lb = Math.min(W, Hh) * 0.24, t = w * 1.3;
    for (const [cx, cy, sx, sy] of [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]]) {
      paint.push(rrD(Math.min(cx, cx + sx * lb), cy - (sy > 0 ? 0 : t), lb, t, 0) + rrD(cx - (sx > 0 ? 0 : t), Math.min(cy, cy + sy * lb), t, lb, 0));
      for (let s2 = 0; s2 <= lb; s2 += 2) pts.push([cx + sx * s2, cy], [cx, cy + sy * s2]);
    }
    box = [X0 - t, Y0 - t, W + 2 * t, Hh + 2 * t];
  }
  return { paint, ink, pts, box };
}

// ── leaf profiles: half-width (0..1) along the leaf axis u ∈ [0,1] (base → tip) ──
const S = (u) => Math.sin(Math.PI * clamp(u, 0, 1));
export const PROFILES = {
  almond: (u) => Math.pow(S(u), 0.85) * (1 - 0.2 * u),
  lance: (u) => Math.pow(S(u), 1.35),
  willow: (u) => Math.pow(S(u), 1.9),
  round: (u) => Math.pow(S(Math.pow(u, 0.75)), 0.6),
  spoon: (u) => Math.pow(S(Math.pow(u, 1.45)), 0.7),
  heart: (u) => Math.pow(S(Math.pow(u, 0.5)), 0.75) * (1 - 0.15 * u),
  teardrop: (u) => Math.pow(S(Math.pow(u, 0.62)), 0.9),
  oak: (u) => Math.pow(S(u), 0.7) * (0.55 + 0.45 * Math.pow(Math.abs(Math.sin(4.5 * Math.PI * u)), 0.6)),
  serrate: (u) => Math.pow(S(u), 0.9) * (1 - 0.2 * Math.abs(Math.sin(10 * Math.PI * u))),
  feather: (u) => Math.pow(S(Math.pow(u, 0.85)), 1.1) * (1 - 0.32 * Math.pow(Math.abs(Math.sin(14 * Math.PI * u)), 3)),
  diamond: (u) => (u < 0.42 ? u / 0.42 : (1 - u) / 0.58),
  blade: (u) => (u < 0.85 ? 1 - 0.25 * u : (1 - u) / 0.15 * 0.79),
  rachis: (u) => 1 - 0.85 * u,
  laurel: (u) => Math.pow(S(Math.pow(u, 0.85)), 1.05),
  flame: (u) => Math.pow(S(Math.pow(u, 1.35)), 0.8),
  fan: (u) => (u < 0.62 ? Math.pow(u / 0.62, 0.9) : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.62) / 0.38, 2)))),
  stepped: (u) => Math.ceil(PROFILES.diamond(u) * 3 - 1e-6) / 3,
};
const SHARP = { diamond: true, blade: true, stepped: true };

// one leaf. Options (all optional): asym – one half fuller than the other (real bay leaves are lopsided);
// wobble – hand-drawn irregularity; scurve – an S-shaped midline (the tip flicks back); style – 'solid' |
// 'slit' (a hairline cut down the middle, the classic vector laurel) | 'carved' (slit + side veins cut out) |
// 'inline' (engraved outline ring) | 'split' (outline + one half filled) | 'engraved' (ring + midrib + veins) |
// 'hatch' (ring + midrib + engraver's hatching on the shaded half); vein – a midrib cut-out on solid leaves;
// fold – the leaf is folded along its midrib: one half is pushed to SHADE and painted darker (or lighter) on top.
// Every cut-out is a sub-path drawn with fill-rule evenodd, so a leaf stays a single path.
let SHADE = null; // shaded halves of folded leaves, collected while a branch is built
let PROBE = false; // true while buildBranch searches for the tip gap: outline points only, no path strings
let LOCAL = null; // leaf outlines in their own frame, traced in the first probe and reused by the rest
function profileD(prof, L, W, bend, xf, o = {}) {
  const h = PROFILES[prof] || PROFILES.almond, N = o.res || (prof === 'stepped' ? 80 : clamp(Math.round(L * 0.5 + W * 1.2), 5, 30)), n2 = Math.max(6, Math.round(N * 0.8)), top = [], bot = [], wob = o.wobble || 0, ph = o.phase || 0, as = clamp(o.asym || 0, -0.6, 0.6), sc = o.scurve || 0;
  const mid = (u) => L * (bend * u * u + sc * 0.11 * Math.sin(2 * Math.PI * u) * u);
  const edge = (u, s, k = 1, w0 = W) => { const w = (h(u) * w0 * k * (1 + wob * Math.sin(u * 9 + ph) * 0.35)) / 2; return [u * L, mid(u) + s * w * (1 + s * as)]; };
  for (let i = 0; i <= N; i++) { const u = i / N; top.push(sink(xf(edge(u, -1)))); bot.push(sink(xf(edge(u, 1)))); }
  if (PROBE) return '';
  bot.reverse();
  const flat = SHARP[prof] || N <= 9; // tiny shapes (veins, barbs, hatching) are polygons: same look, a fraction of the bytes
  const closed = (a, b) => (flat ? polyD(a.concat(b.slice(1))) : smoothOpen(a) + smoothOpen(b, false) + 'Z');
  let d = closed(top, bot);
  const style = prof === 'rachis' ? 'solid' : o.style || 'solid', ring = o.ring || 0.16, hollow = style === 'inline' || style === 'engraved' || style === 'split' || style === 'hatch';
  const ss = o.shadeSide || 1, holes = []; // holes on the shaded half (cut out of the shade too)
  const hwAt = (u, s) => (h(u) * W) / 2 * (1 + s * as);
  // inset outline: the same leaf, narrower and shorter, as a hole
  const ik = 1 - ring * 2.2;
  const inset = (k, u0, u1) => { const t = [], b = []; for (let i = 0; i <= n2; i++) { const u = u0 + (u1 - u0) * (i / n2), v = (u - u0) / (u1 - u0), c = mid(u); const e = (s) => xf([u * L, c + (s * h(v) * W * k * (1 + s * as)) / 2]); t.push(e(-1)); b.push(e(1)); } b.reverse(); return closed(t, b); };
  const midrib = (k) => { const vt = [], vb = []; for (let i = 0; i <= n2; i++) { const u = 0.07 + 0.82 * (i / n2), w = (PROFILES.willow((u - 0.07) / 0.82) * W * k) / 2; vt.push(xf([u * L, mid(u) - w])); vb.push(xf([u * L, mid(u) + w])); } vb.reverse(); return smoothOpen(vt) + smoothOpen(vb, false) + 'Z'; };
  // a hairline down the middle, widest at the base, vanishing before the tip
  const slitW = (u) => W * ring * 0.2 * Math.pow(1 - u, 0.7) * Math.sqrt(clamp((u - 0.02) / 0.08, 0, 1));
  const slit = () => { const vt = [], vb = []; for (let i = 0; i <= n2; i++) { const u = 0.02 + 0.92 * (i / n2), w = slitW(u); vt.push(xf([u * L, mid(u) - w])); vb.push(xf([u * L, mid(u) + w])); } vb.reverse(); return smoothOpen(vt) + smoothOpen(vb, false) + 'Z'; };
  const veinD = (u, s, len, wid, ang) => profileD('willow', len, wid, 0, comp(xf, X(u * L, mid(u) + s * hwAt(u, s) * 0.16, s * rad(ang))));
  if (hollow) d += inset(ik, 0.06, 0.94);
  if (style === 'engraved' || style === 'hatch') d += midrib(0.09); // the midrib comes back as a solid line inside the hollow
  if (style === 'engraved') for (let j = 1; j <= 4; j++) for (const s of [-1, 1]) { const u = 0.12 + j * 0.15; d += veinD(u, s, hwAt(u, s) * 0.55, Math.max(0.4, W * 0.045), 52); }
  if (style === 'hatch') { // engraver's hatching: tapered strokes across the shaded half, thick at the midrib
    const m = Math.max(5, Math.round(L / Math.max(1.6, W * 0.18)));
    for (let j = 0; j < m; j++) { const u = 0.13 + 0.74 * (j / (m - 1)), len = hwAt(u, ss) * ik * 0.82; if (len < 0.8) continue; d += profileD('rachis', len, Math.max(0.35, W * 0.05), 0, comp(xf, X(u * L, mid(u) + ss * W * 0.05, ss * rad(64)))); }
  }
  if (style === 'slit' || style === 'carved') d += slit();
  if (style === 'carved') for (let j = 1; j <= 4; j++) for (const s of [-1, 1]) { const u = 0.1 + j * 0.16, v = veinD(u, s, hwAt(u, s) * 0.62, Math.max(0.35, W * 0.05), 48); d += v; if (s === ss) holes.push(v); }
  if (style === 'split') { // fill the half facing the stem: edge → midline
    const half = [], mm = [];
    for (let i = 0; i <= n2; i++) { const u = 0.06 + 0.88 * (i / n2); const [x, y] = edge(u, 1, ik); half.push(xf([x, y])); mm.push(xf([u * L, mid(u)])); }
    mm.reverse(); d += smoothOpen(half) + smoothOpen(mm, false) + 'Z';
  }
  if (style === 'solid' && o.vein > 0) d += midrib(o.vein);
  // fold: the shaded half, from the edge back along the midrib (just clear of a slit)
  if (o.fold > 0 && SHADE && !hollow) {
    const hp = [], mp = [], gap = style === 'slit' || style === 'carved' ? slitW : () => 0;
    for (let i = 0; i <= N; i++) { const u = i / N; hp.push(xf(edge(u, ss))); mp.push(xf([u * L, mid(u) + ss * gap(u)])); }
    mp.reverse();
    SHADE.push((flat ? polyD(hp.concat(mp.slice(1))) : smoothOpen(hp) + smoothOpen(mp, false) + 'Z') + holes.join(''));
  }
  return d;
}

// a user's own leaf: any SVG path (M L H V C S Q T Z, absolute or relative). Fitted base→tip along +x.
export function parsePath(d) {
  const toks = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null;
  const n = () => +toks[i++];
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out.push(['Z']); x = sx; y = sy; lc = null; continue; }
    if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; lc = null; }
    else if (C === 'L') { x = ox + n(); y = oy + n(); out.push(['L', x, y]); lc = null; }
    else if (C === 'H') { x = ox + n(); out.push(['L', x, y]); lc = null; }
    else if (C === 'V') { y = (rel ? y : 0) + n(); out.push(['L', x, y]); lc = null; }
    else if (C === 'C') { const a = [ox + n(), oy + n(), ox + n(), oy + n()]; x = ox + n(); y = oy + n(); out.push(['C', ...a, x, y]); lc = [a[2], a[3]]; }
    else if (C === 'S') { const r = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y], a = [ox + n(), oy + n()]; const px = x, py = y; x = ox + n(); y = oy + n(); out.push(['C', r[0], r[1], a[0], a[1], x, y]); lc = a; void px; void py; }
    else if (C === 'Q') { const a = [ox + n(), oy + n()]; x = ox + n(); y = oy + n(); out.push(['Q', ...a, x, y]); lc = null; }
    else { i++; }
  }
  return out;
}
function customD(cmds, L, W, xf) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of cmds) for (let k = 1; k < c.length; k += 2) { x0 = Math.min(x0, c[k]); x1 = Math.max(x1, c[k]); y0 = Math.min(y0, c[k + 1]); y1 = Math.max(y1, c[k + 1]); }
  const sx = L / (x1 - x0 || 1), sy = W / (y1 - y0 || 1), cy = (y0 + y1) / 2;
  const P = (px, py) => { const q = sink(xf([(px - x0) * sx, (py - cy) * sy])); return `${f(q[0])} ${f(q[1])}`; };
  return cmds.map((c) => c[0] === 'Z' ? 'Z' : c[0] + Array.from({ length: (c.length - 1) / 2 }, (_, k) => P(c[1 + 2 * k], c[2 + 2 * k])).join(' ')).join('');
}

// ── leaf families ──
export const FAMILIES = {
  simple: (L, W, o, xf) => [profileD(o.profile, L, W, o.bend, xf, o)],
  fern: (L, W, o, xf) => {
    const out = [profileD('rachis', L, W * 0.07, o.bend, xf)], m = 11;
    for (let j = 0; j < m; j++) { const u = 0.1 + 0.86 * (j / (m - 1)), side = j % 2 ? 1 : -1, ll = W * (1.1 - 0.8 * u), b = o.bend * L * u * u; out.push(profileD('lance', ll, ll * 0.34, 0.12 * side, comp(xf, X(u * L, b, side * rad(56 - 18 * u))))); }
    return out;
  },
  palm: (L, W, o, xf) => {
    const out = [profileD('rachis', L, W * 0.06, o.bend, xf)], m = 10;
    for (let j = 0; j < m; j++) { const u = 0.12 + 0.84 * (j / (m - 1)), ll = W * (1.35 - 0.7 * u), b = o.bend * L * u * u; for (const side of [-1, 1]) out.push(profileD('willow', ll, ll * 0.13, -0.18 * side, comp(xf, X(u * L, b, side * rad(32))))); }
    return out;
  },
  wheat: (L, W, o, xf) => {
    const out = [profileD('rachis', L * 0.9, W * 0.06, o.bend, xf)], m = 6;
    for (let j = 0; j < m; j++) {
      const u = 0.22 + 0.7 * (j / (m - 1)), gl = W * 0.62 * (1 - 0.3 * u), b = o.bend * L * u * u;
      for (const side of [-1, 1]) { const g = comp(xf, X(u * L, b, side * rad(24))); out.push(profileD('almond', gl, gl * 0.52, 0, g)); out.push(profileD('willow', gl * 1.25, gl * 0.06, 0.05 * side, comp(g, X(gl * 0.85, 0, side * rad(6))))); }
    }
    out.push(profileD('almond', W * 0.5, W * 0.26, 0, comp(xf, X(L * 0.88, o.bend * L * 0.77, 0))));
    return out;
  },
  needle: (L, W, o, xf) => { const out = [profileD('rachis', L, Math.max(0.7, W * 0.06), o.bend, xf)], m = 14; for (let j = 0; j < m; j++) { const u = 0.08 + 0.88 * (j / (m - 1)), b = o.bend * L * u * u, nl = W * (0.95 - 0.45 * u); for (const s of [-1, 1]) out.push(profileD('willow', nl, Math.max(0.5, nl * 0.07), 0.04 * s, comp(xf, X(u * L, b, s * rad(38))), { res: 8 })); } return out; },
  trefoil: (L, W, o, xf) => [-1, 0, 1].map((k) => profileD('teardrop', L * (k ? 0.72 : 1), W * 0.62, o.bend, comp(xf, X(0, 0, rad(k * 34))), o)),
  // a twig ending in a pair of leaves and a terminal leaf (hand-drawn botanical sets)
  twig: (L, W, o, xf) => {
    const out = [profileD('rachis', L * 0.55, Math.max(0.8, W * 0.08), o.bend, xf)], e = comp(xf, X(L * 0.5, o.bend * L * 0.25, 0));
    out.push(profileD(o.profile, L * 0.5, W * 0.62, o.bend, e, o));
    for (const s of [-1, 1]) out.push(profileD(o.profile, L * 0.4, W * 0.5, 0.1 * s, comp(xf, X(L * 0.3, o.bend * L * 0.09, s * rad(48))), o));
    return out;
  },
  // berries on short stalks (wild sprigs)
  sprig: (L, W, o, xf) => {
    const out = [profileD('rachis', L, Math.max(0.8, W * 0.07), o.bend, xf)], m = 5, r = Math.max(1.2, W * 0.13);
    for (let j = 0; j < m; j++) { const u = 0.25 + 0.75 * (j / (m - 1)), s = j % 2 ? 1 : -1, b = o.bend * L * u * u, sl = j === m - 1 ? 0 : W * 0.45, g = comp(xf, X(u * L, b, s * rad(42))); if (sl) out.push(profileD('rachis', sl, Math.max(0.6, W * 0.05), 0, g)); const [px, py] = g([sl + r * 0.8, 0]); out.push(dotD(px, py, r)); }
    return out;
  },
  // a quill: hairline barbs sweeping to the tip (Deco plumes, Victorian quills)
  plume: (L, W, o, xf) => {
    const out = [profileD('rachis', L, Math.max(0.6, W * 0.05), o.bend, xf)], m = 24;
    for (let j = 0; j < m; j++) { const u = 0.06 + 0.92 * (j / (m - 1)), bl = W * 0.62 * Math.pow(S(Math.pow(u, 0.7)), 0.8), b = o.bend * L * u * u; if (bl < 0.6) continue; for (const s of [-1, 1]) out.push(profileD('willow', bl, Math.max(0.45, bl * 0.1), -0.16 * s, comp(xf, X(u * L, b, s * rad(30))), { res: 8 })); }
    return out;
  },
  // a spike of buds (lavender, rosemary in flower): bare stalk, then paired buds to a single tip bud
  spike: (L, W, o, xf) => {
    const out = [profileD('rachis', L * 0.92, Math.max(0.6, W * 0.06), o.bend, xf)], m = 8;
    for (let j = 0; j < m; j++) { const u = 0.36 + 0.56 * (j / (m - 1)), bl = W * 0.36 * (1 - 0.35 * (j / (m - 1))), b = o.bend * L * u * u; for (const s of [-1, 1]) out.push(profileD('almond', bl, bl * 0.5, 0, comp(xf, X(u * L, b, s * rad(30))))); }
    out.push(profileD('almond', W * 0.3, W * 0.15, 0, comp(xf, X(L * 0.92, o.bend * L * 0.85, 0))));
    return out;
  },
  // a pearl: one bead per leaf (Deco and modern minimal)
  bead: (L, W, o, xf) => { const [x, y] = xf([L * 0.55, 0]); return [dotD(x, y, Math.max(0.8, Math.min(L * 0.45, W * 0.5)))]; },
  // a small five-petal flower on a short stalk
  bloom: (L, W, o, xf) => {
    const r = W * 0.5, st = Math.max(0.5, L - r * 1.9), out = [profileD('rachis', st + r * 0.3, Math.max(0.6, W * 0.07), o.bend, xf)];
    const [cx, cy] = xf([st + r, o.bend * st]), base = Math.atan2(xf([1, 0])[1] - xf([0, 0])[1], xf([1, 0])[0] - xf([0, 0])[0]) + (o.phase || 0);
    for (let k = 0; k < 5; k++) { const a = base + (k * 2 * Math.PI) / 5; out.push(profileD('round', r, r * 0.82, 0, X(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2, a))); }
    out.push(dotD(cx, cy, r * 0.16));
    return out;
  },
  star: (L, W, o, xf) => [polyD(starPts(L * 0.55, 0, L * 0.45, 5, 0.45, o.phase || 0).map((p) => sink(xf(p))))],
  custom: (L, W, o, xf) => { if (!o._cmds) o._cmds = parsePath(o.path || 'M0 0C30 -20 70 -20 100 0C70 20 30 20 0 0Z'); return [customD(o._cmds, L, W, xf)]; },
};

// ── spine ──
function spineAt(sp, t) {
  const th = rad(sp.a0 + (sp.a1 - sp.a0) * t + sp.curl * Math.pow(Math.max(t, 0), 3));
  const r = 100 * (1 + sp.spiral * (t - 0.5));
  return [sp.rx * r * Math.cos(th), sp.ry * r * Math.sin(th)];
}
function sampleSpine(sp, t0, t1, N = 260) {
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = t0 + ((t1 - t0) * i) / N; pts.push({ t, p: spineAt(sp, t) }); }
  pts.forEach((q, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(N, i + 1)].p;
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let nx = ty, ny = -tx; if (nx * q.p[0] + ny * q.p[1] < 0) { nx = -nx; ny = -ny; }
    q.T = [tx, ty]; q.N = [nx, ny];
  });
  return { pts };
}
const atT = (sp, t) => { const pts = sp.pts; let i = pts.findIndex((q) => q.t >= t); if (i < 0) i = pts.length - 1; return pts[i]; };
const maxX = (pts, keep) => { let m = -Infinity; for (const q of pts) if (keep(q) && q[0] > m) m = q[0]; return m; };

// The gap between the two tips scales with the leaves: heavy leaves need more air than hairline ones.
export const autoGap = (p) => Math.max(6, p.leaf.L1 * 0.7 * (0.6 + p.leaf.wr) + p.stem.w * 1.5);

// families made of single leaves keep one size along the branch (sizeCurve); fronds, sprays and beads keep the even taper
const LEAFY = { simple: 1, twig: 1, trefoil: 1, custom: 1 };
// left branch; the right is its mirror. Shortens the arc until the two halves keep `gap` apart.
export function buildBranch(branch, seed = 1) {
  // a tie needs the stems to meet: give tied wreaths a small crossing
  const p = branch.mirror !== false && !branch.flank && branch.orn && branch.orn.tie && branch.orn.tie !== 'none' && !branch.spine.cross ? { ...branch, spine: { ...branch.spine, cross: 9 } } : branch;
  let a0 = p.spine.a0, a1 = p.spine.a1, B;
  const gap = p.spine.gap === 'auto' || p.spine.gap == null ? autoGap(p) : p.spine.gap;
  const once = (a0, a1) => {
    const B = buildOnce({ ...p, spine: { ...p.spine, a0, a1 } }, seed);
    if (p.rows > 1) { // a second, inner row of smaller leaves (double wreaths)
      const C = buildOnce({ ...p, stem: { ...p.stem, w: 0 }, spine: { ...p.spine, a0: a0 + 4, a1: a1 - 4, rx: p.spine.rx * 0.84, ry: p.spine.ry * 0.84, cross: 0 }, leaf: { ...p.leaf, L0: p.leaf.L0 * 0.68, L1: p.leaf.L1 * 0.68, arr: 'outer', n: Math.round(p.leaf.n * 0.9) }, orn: { ...p.orn, tip: 'none', berries: 0, flowers: 0 } }, seed + 1);
      B.inner.push(...C.outer); B.shadeIn.push(...C.shadeOut); B.pts.push(...C.pts); B.leaves.push(...C.leaves.map((l) => ({ ...l, side: -1 })));
    }
    return B;
  };
  // search with outline points only (fast), then draw once. The tips are shortened until they keep `gap` apart:
  // doubling steps, then bisection to 1.25° (a handful of probes instead of dozens)
  PROBE = true; LOCAL = new Map();
  try {
    if (p.mirror && !p.flank) {
      const g = -gap / 2;
      const topBad = (s) => { B = once(a0, a1 - s); return maxX(B.pts, (q) => q[1] < -15) > g; };
      const botBad = (s) => { if (p.spine.cross) return false; B = once(a0 + s, a1); return maxX(B.pts, (q) => q[1] > 15) > g; };
      const shorten = (bad) => {
        const room = Math.max(0, a1 - a0 - 60); if (!bad(0)) return 0;
        let lo = 0, hi = Math.min(2.5, room); while (hi < room && bad(hi)) { lo = hi; hi = Math.min(room, hi * 2); }
        while (hi - lo > 1.25) { const m = (lo + hi) / 2; if (bad(m)) lo = m; else hi = m; }
        return hi;
      };
      a1 -= shorten(topBad);
      a0 += shorten(botBad);
    }
  } finally { PROBE = false; LOCAL = null; }
  B = once(a0, a1);
  B.arc = [a0, a1];
  return B;
}
function freeOf(pts, mirror) {
  const bins = new Map();
  for (const [x, y] of pts) { const b = Math.round(y / 2); if (!bins.has(b) || x > bins.get(b)) bins.set(b, x); }
  return (y0, y1) => { let m = Infinity; for (let b = Math.floor(y0 / 2); b <= Math.ceil(y1 / 2); b++) { const x = bins.get(b); if (x !== undefined) m = Math.min(m, -x); } return mirror ? m : Infinity; };
}

function buildOnce(p, seed) {
  const rnd = rngOf(seed), J = (amt) => (rnd() * 2 - 1) * amt;
  const sp = p.spine, lf = { ...p.leaf }, orn = p.orn;
  // the crossing tail, as a share of the arc; an arc with no length (start = end) gets a one-degree span, not a NaN
  const span = Math.abs(sp.a1 - sp.a0) < 1 ? (sp.a1 < sp.a0 ? -1 : 1) : sp.a1 - sp.a0, tail = sp.cross ? (sp.a0 - 90 + sp.cross) / span : 0;
  const S0 = sampleSpine(sp, -tail, 1);
  const pts = (SINK = []);
  SHADE = [];
  const inner = [], outer = [], orns = [], shadeIn = [], shadeOut = [];
  let lastSb = 1, curlBox = null, curlPts = null;
  const hw = (t) => (p.stem.w / 2) * (1 - p.stem.taper * clamp(t, 0, 1)) * (sp.cross ? 1 : 0.2 + 0.8 * Math.sqrt(clamp(t / 0.08, 0, 1)));
  const left = S0.pts.map((q) => sink([q.p[0] + q.N[0] * hw(q.t), q.p[1] + q.N[1] * hw(q.t)]));
  const right = S0.pts.map((q) => sink([q.p[0] - q.N[0] * hw(q.t), q.p[1] - q.N[1] * hw(q.t)])).reverse();
  if (sp.cross) pts.length = 0; // a crossed stem is meant to cross
  const stemD = p.stem.w > 0 ? smoothOpen(left) + smoothOpen(right, false) + 'Z' : '';
  const stemLine = smoothOpen(S0.pts.map((q) => q.p));
  const n = Math.max(1, Math.round(lf.n)), half = 0.5 / Math.max(1, n - 1), fam = FAMILIES[lf.family] || FAMILIES.simple;
  const leaves = []; // {d, side, t} — t drives the draw-on animation order
  let pk = 0; // place() calls, in order: the key for a leaf's traced outline across probes
  const place = (t, side, scale) => {
    const q = atT(S0, t), u = clamp(t, 0, 1), T = lf.reverse ? [-q.T[0], -q.T[1]] : q.T;
    // size along the branch: base → tip taper, plus an optional swell in the middle
    const L = lerp(lf.L0, lf.L1, Math.pow(u, LEAFY[lf.family || 'simple'] ? lf.sizeCurve ?? 0.9 : 0.9)) * (1 + (lf.bulge || 0) * Math.sin(Math.PI * u)) * scale * (1 + J(lf.jitter * 0.22));
    const a = rad((side > 0 ? lf.aOut : lf.aIn) * (1 + (lf.fan || 0) * (0.5 - u)) + J(lf.jitter * 14)); // fan: wider at the base, tighter at the tip
    const dir = [T[0] * Math.cos(a) + side * q.N[0] * Math.sin(a), T[1] * Math.cos(a) + side * q.N[1] * Math.sin(a)];
    const ang = Math.atan2(dir[1], dir[0]);
    const ly = [-Math.sin(ang), Math.cos(ang)], sb = Math.sign(ly[0] * T[0] + ly[1] * T[1]) || 1;
    const pet = (lf.petiole || 0) * L, base = [q.p[0] + dir[0] * pet, q.p[1] + dir[1] * pet];
    const lo = { ...lf, bend: (lf.bend + J(lf.jitter * 0.12)) * sb, scurve: (lf.scurve || 0) * sb, asym: (lf.asym || 0) * sb, phase: rnd() * 6.28, shadeSide: -sb * (lf.foldSide || 1) }, xf = X(base[0], base[1], ang);
    let ds;
    if (PROBE && LOCAL) { // a leaf's own outline is the same in every probe (only where it sits changes): trace it once, then just move it
      const key = seed + ':' + pk++ + ':' + sb;
      let loc = LOCAL.get(key);
      if (!loc) { const keep = SINK; SINK = []; fam(L, L * lf.wr, lo, (q) => q); loc = SINK; SINK = keep; LOCAL.set(key, loc); }
      for (const q of loc) SINK.push(xf(q));
      ds = [];
    } else ds = fam(L, L * lf.wr, lo, xf);
    (side > 0 ? shadeOut : shadeIn).push(...SHADE.splice(0)); if (side > 0) lastSb = sb;
    if (pet > 0.5) ds.unshift(profileD('rachis', pet + 0.5, Math.max(0.7, p.stem.w * 0.55), 0, X(q.p[0], q.p[1], ang)));
    for (const d of ds) leaves.push({ d, side, t });
    (side > 0 ? outer : inner).push(...ds);
  };
  for (let i = 0; i < n; i++) {
    const t = 0.03 + 0.93 * Math.pow(i / Math.max(1, n - 1), lf.gamma);
    if (lf.arr !== 'inner') place(t, +1, lf.alt && i % 2 ? 1 - lf.alt : 1); // alt: every other outer leaf smaller (layered rhythm)
    if (lf.arr === 'paired' || lf.arr === 'inner') place(t, -1, lf.inScale);
    else if (lf.arr === 'alternate' && i < n - 1) place(t + half * 0.93, -1, lf.inScale);
    else if (lf.arr === 'whorl') { place(t, -1, lf.inScale); place(t + half * 0.5, 1, 0.7); }
    if (orn.berries && orn.berryPos === 'axil' && i % orn.berries === 0 && i < n - 1) { // Empire style: a dot in the fork of each pair
      const q = atT(S0, t), Lh = lerp(lf.L0, lf.L1, t), r = (Lh * 0.09 + 0.8) * (orn.berrySize || 1), T = lf.reverse ? -1 : 1;
      orns.push(dotD(q.p[0] + q.T[0] * T * Lh * 0.36, q.p[1] + q.T[1] * T * Lh * 0.36, r));
    } else if (orn.berries && i % orn.berries === 1 && i < n - 2) {
      const q = atT(S0, t + half * 0.5), r = Math.min(lerp(lf.L0, lf.L1, t) * 0.13 + 1, 3.4) * (orn.berrySize || 1), s = orn.berryPos === 'outer' ? -1 : 1, shape = orn.berryShape || 'dot';
      const cx = q.p[0] - s * q.N[0] * r * 3, cy = q.p[1] - s * q.N[1] * r * 3;
      if (shape === 'olive') { // an olive on a short stalk, hanging toward the tip
        const ang = Math.atan2(-s * q.N[1] + q.T[1] * 0.7, -s * q.N[0] + q.T[0] * 0.7), dx = Math.cos(ang), dy = Math.sin(ang);
        orns.push(profileD('rachis', r * 1.5, Math.max(0.6, r * 0.32), 0, X(q.p[0], q.p[1], ang)), profileD('almond', r * 2.7, r * 1.65, 0, X(q.p[0] + dx * r * 1.3, q.p[1] + dy * r * 1.3, ang)));
      } else if (shape === 'cluster') { for (let k = 0; k < 3; k++) { const a = rnd() * 0.4 + (k * 2 * Math.PI) / 3; orns.push(dotD(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, r * 0.72)); } }
      else orns.push(dotD(cx, cy, r));
    }
    if (orn.flowers && i % orn.flowers === 2 && i < n - 1) { const q = atT(S0, t + half * 0.5), r = lerp(lf.L0, lf.L1, t) * 0.32; const cx = q.p[0] - q.N[0] * r * 1.6, cy = q.p[1] - q.N[1] * r * 1.6, rot = rnd() * 6; for (let k = 0; k < 5; k++) orns.push(profileD('round', r, r * 0.85, 0, X(cx, cy, rot + (k * 2 * Math.PI) / 5))); orns.push(dotD(cx, cy, r * 0.22)); }
  }
  const qt = S0.pts[S0.pts.length - 1], tang = Math.atan2(qt.T[1], qt.T[0]);
  if (orn.tip === 'leaf') { const ds = fam(lf.L1 * 1.05, lf.L1 * 1.05 * lf.wr, { ...lf, shadeSide: -lastSb * (lf.foldSide || 1) }, X(qt.p[0], qt.p[1], tang)); outer.push(...ds); shadeOut.push(...SHADE.splice(0)); ds.forEach((d) => leaves.push({ d, side: 1, t: 1 })); }
  if (orn.tip === 'curl') { // a tendril: the stem runs on past the last leaf and rolls inwards
    const T1 = S0.pts[Math.max(0, S0.pts.length - 14)].T, sg = Math.sign(T1[0] * qt.T[1] - T1[1] * qt.T[0]) || 1;
    let x = qt.p[0], y = qt.p[1], a = tang, step = clamp(lf.L1 * 0.16, 1.2, 2.6); const c = [];
    for (let k = 0; k < 46; k++) { c.push([x, y]); a += sg * (0.05 + k * 0.011); x += Math.cos(a) * step; y += Math.sin(a) * step; step *= 0.975; }
    const w0 = Math.max(0.5, hw(1)), L2 = [], R2 = [];
    c.forEach((pt, k) => { const nb = c[Math.min(c.length - 1, k + 1)], pb = c[Math.max(0, k - 1)], dx = nb[0] - pb[0], dy = nb[1] - pb[1], l = Math.hypot(dx, dy) || 1, w = w0 * (1 - 0.75 * (k / (c.length - 1))); L2.push(sink([pt[0] - (dy / l) * w, pt[1] + (dx / l) * w])); R2.push(sink([pt[0] + (dy / l) * w, pt[1] - (dx / l) * w])); });
    outer.push(smoothOpen(L2) + smoothOpen(R2.reverse(), false) + 'Z');
    const xs = L2.concat(R2).map((q) => q[0]), ys = L2.concat(R2).map((q) => q[1]);
    curlBox = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    curlPts = L2.concat(R2).filter((_, k) => k % 2 === 0);
  }
  if (orn.tip === 'bud') outer.push(profileD('almond', lf.L1 * 0.75, lf.L1 * 0.4, 0, X(qt.p[0], qt.p[1], tang)));
  if (orn.tip === 'berry') orns.push(dotD(qt.p[0] + qt.T[0] * 3, qt.p[1] + qt.T[1] * 3, 3));
  if (orn.tip === 'star') orns.push(polyD(starPts(qt.p[0] + qt.T[0] * 7, qt.p[1] + qt.T[1] * 7, 7).map(sink)));
  SINK = null; SHADE = null;
  let top = Infinity, bottom = -Infinity, halfW = 0, innerX = -Infinity;
  // where a tie would sit: the lowest point where the stems come closest to the center line
  let tieAt = S0.pts[0].p; for (const q of S0.pts) if (q.p[1] > 0 && Math.abs(q.p[0]) < Math.abs(tieAt[0])) tieAt = q.p;
  for (const [x, y] of pts) { if (y < top) top = y; if (y > bottom) bottom = y; if (-x > halfW) halfW = -x; if (x > innerX) innerX = x; }
  if (sp.cross) for (const q of S0.pts) { bottom = Math.max(bottom, q.p[1]); top = Math.min(top, q.p[1]); halfW = Math.max(halfW, -q.p[0]); }
  return { p, pts, stemD, stemLine, inner, outer, orns, shadeIn, shadeOut, leaves, top, bottom, halfW, innerX, tieAt, curlBox, curlPts };
}

// ── paint ─────────────────────────────────────────────────────────────────
export const METALS = {
  gold: [[0, '#5e4112'], [0.22, '#b8882f'], [0.48, '#f6e3a1'], [0.62, '#d4a748'], [0.85, '#8a6220'], [1, '#c99a42']],
  silver: [[0, '#5d6168'], [0.3, '#b9bec5'], [0.5, '#ffffff'], [0.68, '#a9aeb6'], [1, '#e4e7eb']],
  bronze: [[0, '#4a2a12'], [0.3, '#9c5f2e'], [0.52, '#e7b07a'], [0.75, '#8a4f22'], [1, '#c07c45']],
  rose: [[0, '#6e3b33'], [0.3, '#c47f6e'], [0.52, '#fbd9cc'], [0.75, '#b06c5c'], [1, '#e2a693']],
  platinum: [[0, '#8b9097'], [0.35, '#dde1e6'], [0.5, '#ffffff'], [0.7, '#c9ced5'], [1, '#f2f4f6']],
  copper: [[0, '#5a2312'], [0.35, '#b85a33'], [0.52, '#f5a77e'], [0.75, '#a2492a'], [1, '#d77d55']],
  champagne: [[0, '#7a6447'], [0.3, '#cdb894'], [0.5, '#fbf1dc'], [0.7, '#c2ab84'], [1, '#e8d9bb']],
  antique: [[0, '#4a2e0e'], [0.3, '#a07a34'], [0.5, '#ecd08a'], [0.72, '#8c6526'], [1, '#bf9850']],
  brass: [[0, '#4f3b0e'], [0.3, '#a8862a'], [0.5, '#efd77a'], [0.7, '#9c7a22'], [1, '#c9a646']],
  chrome: [[0, '#2b2f36'], [0.44, '#e9eef5'], [0.5, '#596270'], [0.64, '#c2cad4'], [1, '#ffffff']],
  pewter: [[0, '#3f4347'], [0.35, '#8e9499'], [0.52, '#c9cdd0'], [0.75, '#7d8388'], [1, '#a7adb2']],
  onyx: [[0, '#050505'], [0.4, '#2a2a2a'], [0.52, '#6b6b6b'], [0.62, '#1d1d1d'], [1, '#3a3a3a']],
  patina: [[0, '#1f4a42'], [0.35, '#4f9384'], [0.52, '#a9dccb'], [0.75, '#3f7d70'], [1, '#7bb9a8']],
  iridescent: [[0, '#7fd3ff'], [0.25, '#c7a6ff'], [0.5, '#ffd1ec'], [0.75, '#fff0b8'], [1, '#9effd9']],
};
let PID = 0;
// returns a fill value; pushes any gradient into defs. bbox = [x, y, w, h] of what is painted (user space)
// a color as it may appear in an attribute: anything else (a stray quote, markup) becomes black
const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%deg]+\)|[a-z]{3,20})$/i;
const colorOf = (c) => (typeof c === 'string' && COLOR_RE.test(c.trim()) ? c.trim() : '#000000');
const num01 = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' ? +v : d);
export function paintRef(paint, defs, bbox) {
  if (!paint) return 'none';
  if (typeof paint === 'string') return paint === 'none' ? 'none' : colorOf(paint);
  if (paint.type === 'solid') return colorOf(paint.color);
  const id = 'p' + ++PID;
  const stops = (paint.type === 'metal' ? METALS[paint.metal] || METALS.gold : Array.isArray(paint.stops) ? paint.stops : METALS.gold).map(([o, c, a]) => `<stop offset="${f(num01(o, 0))}" stop-color="${colorOf(c)}"${a != null && num01(a, 1) < 1 ? ` stop-opacity="${f(num01(a, 1))}"` : ''}/>`).join('');
  if (paint.type === 'radial') {
    const [x, y, w, h] = bbox, cx = x + w * (paint.cx ?? 0.5), cy = y + h * (paint.cy ?? 0.5), r = Math.max(w, h) * (paint.r ?? 0.6);
    defs.push(paint.scope === 'leaf' ? `<radialGradient id="${id}" cx="${f(num01(paint.cx, 0.5))}" cy="${f(num01(paint.cy, 0.5))}" r="${f(num01(paint.r, 0.6))}">${stops}</radialGradient>` : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}">${stops}</radialGradient>`);
    return `url(#${id})`;
  }
  const a = rad(paint.angle ?? (paint.type === 'metal' ? 20 : 0)), sx = Math.sin(a), sy = -Math.cos(a); // CSS angles: 0 = to top
  if (paint.scope === 'leaf') defs.push(`<linearGradient id="${id}" x1="${f(0.5 - sx / 2)}" y1="${f(0.5 - sy / 2)}" x2="${f(0.5 + sx / 2)}" y2="${f(0.5 + sy / 2)}">${stops}</linearGradient>`);
  else { const [x, y, w, h] = bbox, cx = x + w / 2, cy = y + h / 2, l = (Math.abs(w * sx) + Math.abs(h * sy)) / 2; defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(cx - sx * l)}" y1="${f(cy - sy * l)}" x2="${f(cx + sx * l)}" y2="${f(cy + sy * l)}">${stops}</linearGradient>`); }
  return `url(#${id})`;
}
const lumOf = (c) => { const m = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(String(c).trim()); if (!m) return 0.5; let h = m[1]; if (h.length === 3) h = [...h].map((x) => x + x).join(''); const n = parseInt(h, 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const solidOf = (paint) => (!paint ? '#000' : typeof paint === 'string' ? paint : paint.type === 'solid' ? paint.color : paint.type === 'metal' ? (METALS[paint.metal] || METALS.gold)[2][1] : paint.stops[Math.floor(paint.stops.length / 2)][1]);

function effectFilter(fx, defs, seed = 7) {
  if (!fx) return '';
  const parts = [], id = 'fx' + ++PID, sd = (seed % 97) + 1;
  // the ink itself first: foil, letterpress and grain change the body; shadow, glow and misprint sit underneath it
  let body = 'SourceGraphic';
  // foil: hot-foil stamping. A crinkled surface (noise over a soft bevel of the shapes) catches a light
  if (fx.foil) {
    const o = fx.foil, sz = o.size ?? 1.6, cr = o.crinkle ?? 0.5;
    parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${f(0.55 / sz)}" numOctaves="3" seed="${sd}" result="fn"/><feGaussianBlur in="SourceAlpha" stdDeviation="${f(sz * 0.55)}" result="fb"/><feComposite in="fn" in2="fb" operator="arithmetic" k2="${f(cr * 0.9)}" k3="1" result="fbump"/><feSpecularLighting in="fbump" surfaceScale="${f(1.5 + cr * 3)}" specularConstant="1.1" specularExponent="${f(14 + (1 - cr) * 18)}" lighting-color="#ffffff" result="fs"><feDistantLight azimuth="${o.light ?? 235}" elevation="38"/></feSpecularLighting><feComposite in="fs" in2="SourceAlpha" operator="in" result="fsi"/><feComposite in="${body}" in2="fsi" operator="arithmetic" k2="1" k3="${f(o.strength ?? 0.75)}" result="foil"/>`);
    body = 'foil';
  }
  // letterpress: the shapes pressed into the paper, a shadow inside the top-left edge and a light inside the bottom-right
  if (fx.press) {
    const o = fx.press, dp = o.depth ?? 0.8, k = o.strength ?? 0.5;
    parts.push(`<feComponentTransfer in="SourceAlpha" result="pinv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feOffset in="pinv" dx="${f(dp * 0.5)}" dy="${f(dp * 0.5)}" result="po"/><feGaussianBlur in="po" stdDeviation="${f(dp * 0.4)}" result="pb"/><feFlood flood-color="#000000" flood-opacity="${f(Math.min(1, k * 0.9))}"/><feComposite in2="pb" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="psh"/><feOffset in="pinv" dx="${f(-dp * 0.4)}" dy="${f(-dp * 0.4)}" result="po2"/><feGaussianBlur in="po2" stdDeviation="${f(dp * 0.35)}" result="pb2"/><feFlood flood-color="#ffffff" flood-opacity="${f(k * 0.55)}"/><feComposite in2="pb2" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="phl"/><feTurbulence type="fractalNoise" baseFrequency="${f(0.32 / Math.max(0.3, dp))}" numOctaves="3" seed="${sd + 5}" result="pn"/><feColorMatrix in="pn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${f(k * 1.3)} 0 0 0 ${f(-k * 0.64)}" result="pm"/><feComposite in="${body}" in2="pm" operator="out" result="pink"/><feOffset in="SourceAlpha" dx="${f(dp * 0.6)}" dy="${f(dp * 0.6)}" result="ro"/><feGaussianBlur in="ro" stdDeviation="${f(dp * 0.35)}" result="rb"/><feComposite in="rb" in2="SourceAlpha" operator="out" result="rr"/><feFlood flood-color="#ffffff" flood-opacity="${f(k * 0.7)}"/><feComposite in2="rr" operator="in" result="prim"/><feMerge result="press"><feMergeNode in="prim"/><feMergeNode in="pink"/><feMergeNode in="psh"/><feMergeNode in="phl"/></feMerge>`);
    body = 'press';
  }
  // grain: worn ink. Specks of paper show through, more of them as the amount rises
  if (fx.grain) {
    const o = fx.grain, a = clamp(o.amount ?? 0.35, 0, 1), sz = o.size ?? 0.6, t = 0.8 - a * 0.24;
    parts.push(`<feTurbulence type="fractalNoise" baseFrequency="${f(1 / sz)}" numOctaves="2" seed="${sd + 11}" result="gn"/><feColorMatrix in="gn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 ${f(-14 * t)}" result="gh"/><feComposite in="${body}" in2="gh" operator="out" result="grain"/>`);
    body = 'grain';
  }
  if (fx.shadow) { const s = fx.shadow; parts.push(`<feGaussianBlur in="SourceAlpha" stdDeviation="${s.blur ?? 3}" result="sb"/><feOffset in="sb" dx="${s.dx ?? 0}" dy="${s.dy ?? 2}" result="so"/><feFlood flood-color="${s.color || '#000'}" flood-opacity="${s.opacity ?? 0.55}"/><feComposite in2="so" operator="in" result="sh"/>`); }
  if (fx.glow) { const g = fx.glow; parts.push(`<feGaussianBlur in="SourceAlpha" stdDeviation="${g.blur ?? 6}" result="gb"/><feFlood flood-color="${g.color || '#fff'}" flood-opacity="${g.opacity ?? 0.6}"/><feComposite in2="gb" operator="in" result="gl"/>`); }
  // misprint: a second ink printed underneath, slightly off register, so a crisp sliver shows at one side (Riso, cheap litho)
  if (fx.misreg) { const m = fx.misreg; parts.push(`<feOffset in="SourceAlpha" dx="${m.dx ?? 1.4}" dy="${m.dy ?? 0.9}" result="mo"/><feFlood flood-color="${m.color || '#2b59ff'}" flood-opacity="${m.opacity ?? 0.8}"/><feComposite in2="mo" operator="in" result="mr"/>`); }
  if (!parts.length) return '';
  defs.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"${body !== 'SourceGraphic' ? ' color-interpolation-filters="sRGB"' : ''}>${parts.join('')}<feMerge>${fx.glow ? '<feMergeNode in="gl"/>' : ''}${fx.shadow ? '<feMergeNode in="sh"/>' : ''}${fx.misreg ? '<feMergeNode in="mr"/>' : ''}<feMergeNode in="${body}"/></feMerge></filter>`);
  return ` filter="url(#${id})"`;
}
export const EFFECT_KEYS = ['shadow', 'glow', 'misreg', 'foil', 'press', 'grain'];

// ── type ──────────────────────────────────────────────────────────────────
const CAPW = { Figtree: 0.7, 'Avenir Next': 0.68, Futura: 0.66, 'Bodoni 72': 0.72, Baskerville: 0.72, 'Gill Sans': 0.64 };
function roughMeasure(s, font, weight, italic, size) {
  const capW = (CAPW[font] || 0.68) * (0.85 + weight / 2600);
  let w = 0;
  for (const ch of s) w += ch === ' ' ? 0.28 : /[IJ1.,'’:;!|]/.test(ch) ? 0.34 : /[MW]/.test(ch) ? 0.92 : /[a-z]/.test(ch) ? capW * 0.74 : /[　-鿿가-힯]/.test(ch) ? 1 : capW;
  return w * size;
}
export const caseOf = (s, c) => (c === 'upper' ? s.toLocaleUpperCase() : c === 'lower' ? s.toLocaleLowerCase() : c === 'title' ? s.toLocaleLowerCase().replace(/(^|[\s\-–])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase()) : s);
const splitTwo = (s) => { const w = s.split(' '); if (w.length < 2) return null; let best = null; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { a, b, d }; } return [best.a, best.b]; };
const ICONS = ['star', 'stars', 'crown', 'dot', 'diamond', 'rule', 'none'];
// an uploaded logo (official artwork, SVG or PNG): a line of its own, as tall as LOGO_H × its role's size, as wide as its aspect ratio makes it.
// field.src is a data: URL, or an 'asset:…' key into ASSETS / env.assets (the app keeps big images out of the doc, its undo
// stack and share links; a key nobody has, as in a shared link, draws nothing)
const LOGO_H = 2;
export const LOGO_SLOTS = ['inside', 'above', 'below'];
export const ASSETS = {};

// ── defaults ──────────────────────────────────────────────────────────────
export const FONT_DEFAULT = 'Figtree';
export const DEFAULT_DOC = {
  seed: 7,
  form: 'open',
  branch: {
    mirror: true, flank: false, rows: 1,
    spine: { rx: 1.3, ry: 0.78, a0: 112, a1: 238, curl: 0, spiral: 0, cross: 0, gap: 'auto' },
    stem: { w: 1, taper: 0.7 },
    leaf: { family: 'simple', profile: 'lance', n: 15, L0: 24, L1: 20, sizeCurve: 2.5, wr: 0.42, bend: 0.08, aOut: 34, aIn: 30, inScale: 0.95, arr: 'alternate', gamma: 1, jitter: 0, vein: 0, wobble: 0, asym: 0, petiole: 0, bulge: 0, reverse: false, style: 'solid', ring: 0.16, path: '', scurve: 0, fan: 0, alt: 0, fold: 0, foldSide: 1 },
    orn: { tip: 'leaf', berries: 0, berrySize: 1, berryShape: 'dot', flowers: 0, tie: 'none' },
  },
  paint: {
    branch: '#d6b56a', // one flat ink, as festivals issue them
    inner: null,          // null = same as branch, dimmed by depth
    ornament: null,       // null = same as branch
    depth: 0,             
    shade: null,          // color of the folded (shaded) half of each leaf; null = black
    mode: 'fill',         // fill | outline | both
    stroke: { w: 1.2, paint: null },
    effects: { shadow: null, glow: null, misreg: null, foil: null, press: null, grain: null, text: true },
  },
  roles: {
    eyebrow: { font: FONT_DEFAULT, weight: 700, italic: false, case: 'upper', track: 0.08, ratio: 0.5, paint: null },
    hero: { font: FONT_DEFAULT, weight: 800, italic: false, case: 'upper', track: 0.01, ratio: 1, paint: null },
    sub: { font: FONT_DEFAULT, weight: 700, italic: false, case: 'upper', track: 0.06, ratio: 0.55, paint: null },
    big: { font: FONT_DEFAULT, weight: 800, italic: false, case: 'asis', track: -0.01, ratio: 1.5, paint: null },
    arc: { font: FONT_DEFAULT, weight: 700, italic: false, case: 'upper', track: 0.28, ratio: 0.34, paint: null },
  },
  text: { paint: '#f4e3a8', sub: null }, // default paints: hero/big use text.paint, small roles use text.sub (or text.paint)
  fields: [
    { id: 'f1', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
    { id: 'f2', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: true },
    { id: 'f3', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
  ],
  layout: { arcUnderR: 1.04, heroMax: 34, hug: true, minSmall: 5.5, minPx: 6, targetPx: 300, autoWiden: true, pad: 3, padK: 0.14, dy: 'auto', wrap: 'auto', spacing: 1, lineGap: 0.28, joinSep: '  ', arcTopR: 1.18, arcBottomR: 0.66, ribbonR: 1.0, ribbonW: 1, ribbonY: 0.7, badgeR: 1, outerGap: 8 },
  ribbon: { paint: null, text: null, tails: true }, // text null = auto: dark on light ribbons, light on dark ones
  // badge frame (Badge form only): kind from FRAMES; filled frames set the words in auto-contrast ink (or `ink`)
  frame: { kind: 'none', w: 1.6, double: false, gap: 3, filled: false, orn: 'star', size: 1, radius: 0.25, band: 0.27, paint: null, ink: null },
  canvas: { aspect: 0, pad: 14, bg: null },
};

// form presets: what each wreath form changes in the document
export const FORMS = {
  open: { branch: { mirror: true, flank: false, spine: { a0: 112, a1: 238, cross: 0 } }, layout: { heroMax: 46 } },
  wreath: { branch: { mirror: true, flank: false, spine: { a0: 100, a1: 266, cross: 26, rx: 1.1, ry: 1 } }, layout: { heroMax: 34 } },
  single: { branch: { mirror: false, flank: false, spine: { a0: 100, a1: 262, cross: 0 } }, layout: { heroMax: 34 } },
  crown: { branch: { mirror: true, flank: false, spine: { a0: 182, a1: 262, cross: 0, ry: 0.75 } }, layout: { heroMax: 34 } },
  swoop: { branch: { mirror: true, flank: false, spine: { a0: 96, a1: 182, cross: 0, ry: 0.75 } }, layout: { heroMax: 34 } },
  flank: { branch: { mirror: true, flank: true, spine: { a0: 128, a1: 232, cross: 0, rx: 0.55, ry: 0.55 } }, layout: { heroMax: 34 } },
  text: { branch: { mirror: true, flank: false }, layout: { heroMax: 34 }, _noBranch: true }, // a badge's frame sets the scale; the open form lets the name grow
};
export function applyForm(doc, form) { const d = merge(doc, FORMS[form] || {}); delete d._noBranch; d.form = form; return d; }

// ── layout + render ───────────────────────────────────────────────────────
const MCACHE = new WeakMap(); // measured widths, kept per measure function across renders
// built branches, keyed by their parameters: typing, recoloring and re-layout passes reuse the leaves
const BCACHE = new Map();
function branchOf(br, seed) {
  const k = seed + JSON.stringify(br);
  let b = BCACHE.get(k);
  if (!b) { b = buildBranch(br, seed); BCACHE.set(k, b); if (BCACHE.size > 16) BCACHE.delete(BCACHE.keys().next().value); }
  return { ...b }; // render adjusts top/bottom/halfW on its own copy
}
export function render(docIn, env = {}) {
  const doc = merge(DEFAULT_DOC, docIn || {});
  const measure = env.measure || roughMeasure;
  const defs = [], report = { lines: [], warnings: [], ornaments: [] }; // ornaments: boxes of ties and tendrils, for collision checks
  const noBranch = doc.form === 'text';
  const br = merge(DEFAULT_DOC.branch, doc.branch);
  // the badge form can carry a frame; a fixed frame (ring, oval, scallop) is the shape the words fit, like a wreath
  const FR = noBranch && doc.frame && doc.frame.kind && doc.frame.kind !== 'none' && FRAMES[doc.frame.kind] ? doc.frame : null;
  const hasBand = !!FR && FIXED_FRAMES.includes(FR.kind) && doc.fields.some((x) => x.show !== false && /^arc-/.test(x.slot || '') && x.text && x.kind !== 'logo');
  const FG = FR && FIXED_FRAMES.includes(FR.kind) ? fixedFrame(FR, hasBand) : null;
  const B = noBranch ? { pts: [], top: FG ? -FG.ob : FR ? 0 : -40, bottom: FG ? FG.ob : FR ? 0 : 40, halfW: FG ? FG.oa + FG.w : 90, innerX: FG ? -FG.ta : -90, leaves: [], inner: [], outer: [], orns: [], shadeIn: [], shadeOut: [], stemD: '', stemLine: '' } : branchOf(br, doc.seed);
  const mirror = br.mirror !== false;
  // mixed wreaths: the right side can be a different branch (oak left, palm right…)
  let BR = !noBranch && mirror && !br.flank && br.right ? branchOf(merge(br, br.right), doc.seed + 17) : null;
  if (BR) { // balance: the second side's leaves are scaled so both sides reach equally far out from the spine
    const spineR = (P) => Math.abs(spineAt(P.spine, 0.5)[0]);
    const reachL = B.halfW - spineR(br), rb = merge(br, br.right), reachR = BR.halfW - spineR(rb);
    const k = reachR > 1 ? reachL / reachR : 1;
    if (k < 0.85 || k > 1.18) BR = branchOf(merge(rb, { leaf: { L0: rb.leaf.L0 * k, L1: rb.leaf.L1 * k } }), doc.seed + 17);
  }
  if (BR) { B.top = Math.min(B.top, BR.top); B.bottom = Math.max(B.bottom, BR.bottom); B.halfW = Math.max(B.halfW, BR.halfW); }
  const freeL = FG ? (a, b) => { const y = Math.max(Math.abs(a), Math.abs(b)); return y >= FG.tb ? 0 : FG.ta * Math.sqrt(1 - (y / FG.tb) ** 2); } : noBranch ? () => Infinity : freeOf(B.pts, !br.flank), freeR = BR ? freeOf(BR.pts, true) : null;
  const free = freeR ? (a, b) => Math.min(freeL(a, b), freeR(a, b)) : freeL;
  const L = doc.layout, R = doc.roles;
  // legibility floor: small text must stay >= minPx when the laurel is shown targetPx tall (its smallest use)
  // ties that hang below the wreath (bow, streamers) make the laurel taller, so the type must be bigger
  const tieS = Math.max(9, br.leaf.L0 * 0.45), hang = noBranch || !mirror || br.flank ? 0 : br.orn.tie === 'streamers' ? tieS * 3.9 : br.orn.tie === 'bow' ? tieS * 1.25 : 0;
  const approxH = (FG ? 2 * (FG.ob + FG.w + FG.amp) : noBranch ? 90 : Math.max(B.bottom, hang ? B.tieAt[1] + hang : -Infinity) - B.top) + 2 * doc.canvas.pad;
  let MS = Math.max(L.minSmall, L.targetPx ? ((L.minPx || 6) * approxH * 1.04) / L.targetPx : 0);
  report.minSmall = MS;
  const roleOf = (k) => merge(DEFAULT_DOC.roles.eyebrow, R[k] || R.eyebrow);
  const smallRole = (k) => !['hero', 'big'].includes(k);
  const textPaint = (k) => (R[k] && R[k].paint) || (smallRole(k) ? doc.text.sub || doc.text.paint : doc.text.paint);
  // words set on a filled frame take its auto-contrast ink: dark on light metal, light (or the background) on dark
  const framePaint = FR ? FR.paint || doc.paint.branch : null, bgSolid0 = doc.canvas.bg ? solidOf(doc.canvas.bg) : null;
  const frameInk = FR && FR.filled && FILLABLE_FRAMES.includes(FR.kind) ? (FR.ink && FR.ink !== 'auto' ? FR.ink : lumOf(solidOf(framePaint)) > 0.5 ? '#1a1206' : bgSolid0 && lumOf(bgSolid0) > 0.6 ? bgSolid0 : '#ffffff') : null;
  let mcache = MCACHE.get(measure); if (!mcache || mcache.size > 20000) MCACHE.set(measure, (mcache = new Map())); // width at size 1, per string/font: widths scale linearly with size
  const unitW = (s, r) => { const k = `${s}\u0000${r.font}\u0000${r.weight}\u0000${r.italic}`; if (!mcache.has(k)) mcache.set(k, measure(s, r.font, r.weight, r.italic, 100) / 100); return mcache.get(k); };
  const sizeOf = (role, H) => { const r = roleOf(role); return role === 'hero' || role === 'big' ? H * r.ratio : Math.max(MS, H * r.ratio); };
  const iconW = (l) => (l.icon === 'logo' ? l.h * l.ar : l.icon === 'stars' ? l.size * 3.2 : l.icon === 'rule' ? l.size * 4 : l.icon === 'crown' ? l.size * 1.3 : l.size);
  const padOf = (H) => L.pad + (L.padK ?? 0.14) * H; // air between text and leaves grows with the type
  // set lines at hero size H: sizes, cap-height boxes (+ descenders), optical gaps, widths
  const stack = (lines, H) => {
    const small = Math.max(MS, H * roleOf('eyebrow').ratio);
    const out = lines.map((l) => { const r = roleOf(l.role); return { ...l, size: l.icon ? H * r.ratio : sizeOf(l.role, H), track: r.track }; });
    let y = 0;
    out.forEach((l, i) => {
      const r = roleOf(l.role);
      if (l.icon) { l.h = l.icon === 'logo' ? l.size * LOGO_H : l.icon === 'rule' ? Math.max(1, l.size * 0.1) : l.size * (l.icon === 'stars' ? 0.62 : 0.9); l.desc = 0; l.w = iconW(l); }
      else { l.text = caseOf(l.s, r.case); l.n = [...l.text].length; l.glyph = unitW(l.text, r) * l.size; l.w = l.glyph + l.track * l.size * Math.max(0, l.n - 1); l.h = l.size * 0.72; l.desc = /[gjpqy,;]/.test(l.text) ? l.size * 0.2 : 0; }
      // leading: a wrapped line's own continuation sits tight; separate fields in the same role a little looser; tracked
      // small caps need more air than the name to read as lines rather than texture
      if (i) {
        const p = out[i - 1], same = p.role === l.role && !l.icon && !p.icon, cont = same && p.ids.join() === l.ids.join(), sm = smallRole(l.role);
        const g = cont ? (sm ? Math.max(L.lineGap, 0.4) : L.lineGap) : sm ? Math.max(L.lineGap, 0.55) : L.lineGap * 1.3;
        y += (same ? l.size * g : Math.max(Math.min(p.size, l.size) * 0.85, small * 0.9) * L.spacing) + p.desc;
      }
      l.top = y; y += l.h;
    });
    if (out.length) y += out[out.length - 1].desc;
    return { out, h: y };
  };
  const fieldsIn = (slot) => doc.fields.filter((x) => x.show !== false && (x.slot || 'inside') === slot && (x.kind === 'logo' ? !!x.src && LOGO_SLOTS.includes(slot) : x.text || x.kind === 'icon'));
  const toLines = (fs) => { const out = []; for (const x of fs) { if (x.kind === 'logo') { const src = ASSETS[x.src] || (env.assets && env.assets[x.src]) || x.src; if (/^asset:/.test(src)) continue; out.push({ role: x.role || 'hero', icon: 'logo', src, ar: clamp(+x.ar || 1, 0.15, 8), tint: !!x.tint, ids: [x.id], dx: x.dx || 0, dy: x.dy || 0 }); continue; } if (x.kind === 'icon') { if (x.text !== 'none') out.push({ role: x.role || 'eyebrow', icon: ICONS.includes(x.text) ? x.text : 'star', ids: [x.id], dx: x.dx || 0, dy: x.dy || 0 }); continue; } if (x.join && out.length && !out[out.length - 1].icon) { const p = out[out.length - 1]; p.joinWords = (p.joinWords || []).concat(p.s.split(/\s+/).filter(Boolean).length); p.s += L.joinSep + x.text; p.ids.push(x.id); } else out.push({ role: x.role || 'eyebrow', s: x.text, ids: [x.id], dx: x.dx || 0, dy: x.dy || 0 }); } return out; };

  // ── inside stack: the smart part ──
  // For every way of wrapping the lines (none; any split of a multi-word line into 2, or 3 for long heroes) and
  // every vertical position of the block, find the largest hero size at which each line fits the free width at
  // its own height, with padding that grows with the type. Tight small-caps lines give up tracking (down to
  // trackMin) before anything shrinks. The winner is the biggest type, nudged toward the optical center and
  // toward fewer, balanced wraps.
  const flank = br.flank && !noBranch;
  const insideBase = toLines(fieldsIn('inside'));
  const maxW = (FG ? 2 * FG.ta : noBranch ? 200 : 2 * B.halfW) * 0.98;
  // enclosing forms keep the block between the tips and the base; crown, swoop and flank let it sit outside
  const contain = !!FG || (!noBranch && !flank && (br.contain ?? ['open', 'wreath', 'single'].includes(doc.form || 'open')));
  const yMin = FG ? -FG.tb * 0.92 : B.top + (B.bottom - B.top) * 0.12, yMax = FG ? FG.tb * 0.92 : B.bottom - (B.bottom - B.top) * 0.1;
  const hasRibbon = doc.fields.some((x) => x.show !== false && x.slot === 'ribbon' && x.text && x.kind !== 'logo'), ribbonY = 100 * br.spine.ry * (L.ribbonY ?? 0.7);
  const yMax2 = hasRibbon ? Math.min(yMax, ribbonY - MS * 2.2) : yMax;
  const fits = (lines, H, dy) => {
    const { out, h } = stack(lines, H), off = dy - h / 2, pad = padOf(H);
    if (contain && (off < yMin || off + h > yMax2)) return null;
    // branches stand ~1.8× the block, and the block stays within ~2.4× their height wide (a long name wraps rather than
    // pushing the branches out into a thin strip)
    if (flank) return h <= (B.bottom - B.top) * (L.flankFill ?? 0.56) && !(hasRibbon && off + h > yMax2) && !out.some((l) => l.w > (B.bottom - B.top) * (L.flankW ?? 2.4)) ? { out, off } : null;
    for (const l of out) {
      const top = l.top + off, bot = top + l.h + l.desc, room = Math.min(free(top - pad * 0.6, bot + pad * 0.6) - pad, maxW / 2);
      if (l.w / 2 <= room) { l.margin = room - l.w / 2; continue; }
      const r = roleOf(l.role), tmin = r.trackMin ?? r.track * 0.35;
      if (l.icon || l.n < 2 || r.track <= tmin) return null;
      const t = (2 * room - l.glyph) / (l.size * (l.n - 1));
      if (t < tmin) return null;
      l.track = t; l.w = 2 * room; l.margin = 0;
    }
    return { out, off };
  };
  const words = (s) => s.split(/\s+/).filter(Boolean);
  const splitsOf = (s, k) => { const w = words(s), res = []; if (w.length < k || w.length > 10) return res; const rec = (i, parts) => { if (parts.length === k - 1) { res.push([...parts, w.slice(i).join(' ')]); return; } for (let j = i + 1; j <= w.length - (k - 1 - parts.length); j++) rec(j, [...parts, w.slice(i, j).join(' ')]); }; rec(0, []); return res; };
  // the ways one line can wrap: into 2 (3 for heroes and long small lines), never starting a line on a separator or
  // ending one on a separator or an ampersand; balanced splits cost less
  const wrapsOf = (l) => {
    const res = []; if (l.icon || L.wrap === 'off') return res;
    for (const k of l.role === 'hero' || l.role === 'big' || words(l.s).length >= 5 ? [2, 3] : [2]) for (const parts of splitsOf(l.s, k)) {
      if (parts.some((p, j) => (j && /^[·•|–—,:&+\/]/.test(p)) || (j < parts.length - 1 && /[·•|–—&+\/]$/.test(p)))) continue;
      const lens = parts.map((p) => p.length), imb = (Math.max(...lens) - Math.min(...lens)) / l.s.length;
      // breaking exactly where two fields were joined undoes the join the user (or the layout) asked for: allowed, but only
      // when it buys a lot of size
      let at = 0, atJoin = false; for (const p of parts.slice(0, -1)) { at += words(p).length; if ((l.joinWords || []).includes(at)) atJoin = true; }
      res.push({ parts, cost: Math.pow(0.86, k - 1) * (1 - 0.18 * imb) * (atJoin ? 0.72 : 1), imb });
    }
    return res;
  };
  // a variant = a choice of wrap (or none) per line; its lines and cost follow from the choices
  const linesOf = (ch) => insideBase.flatMap((l, i) => (ch[i] ? ch[i].parts.map((s) => ({ ...l, s })) : [l]));
  const costOf = (ch) => ch.reduce((c, w) => c * (w ? w.cost : 1), 1);
  const WR = insideBase.map(wrapsOf);
  const dy0 = typeof L.dy === 'number' ? L.dy : 2, dys = typeof L.dy === 'number' ? [L.dy] : [0, -5, 5, -10, 10, -16, 16, -24, 24].map((d) => dy0 + d);
  // widest free half-width anywhere the block can sit: a small line wider than this can never fit unwrapped
  let roomMax = maxW / 2;
  if ((!noBranch || FG) && !flank) { roomMax = 0; for (let y = yMin; y <= yMax; y += 4) roomMax = Math.max(roomMax, Math.min(free(y - 3, y + 3), maxW / 2)); }
  const searchInside = () => {
    // small lines that cannot fit at the smallest size, even with their tracking given up, start wrapped
    const ch0 = insideBase.map((l, i) => {
      if (l.icon || l.role === 'hero' || l.role === 'big' || !WR[i].length) return null;
      const r = roleOf(l.role), need = (s) => { const t = caseOf(s, r.case); return unitW(t, r) * MS + (r.trackMin ?? r.track * 0.35) * MS * Math.max(0, [...t].length - 1); };
      if (need(l.s) <= 2 * (roomMax - padOf(MS * 2)) * 0.96) return null;
      return WR[i].slice().sort((a, b) => Math.max(...a.parts.map(need)) - Math.max(...b.parts.map(need)) || a.parts.length - b.parts.length)[0];
    });
    let best = null; const seen = new Set();
    const evalV = (ch) => {
      const key = ch.map((w) => (w ? w.parts.join('|') : '')).join('¦'); if (seen.has(key)) return null; seen.add(key);
      const lines = linesOf(ch), cost = costOf(ch); let top = null;
      for (const dy of dys) {
        const dyk = 1 - 0.009 * Math.abs(dy - dy0);
        let lo = 2, hi = L.heroMax;
        if (best) { // it must fit at the size that would beat the leader, or it can't win: one try instead of a search
          const need = best.score / (cost * dyk); if (need >= hi || !fits(lines, need, dy)) continue; lo = need;
        } else if (!fits(lines, lo, dy)) continue;
        for (let k = 0; k < 12; k++) { const m = (lo + hi) / 2; if (fits(lines, m, dy)) lo = m; else hi = m; }
        const score = lo * cost * dyk, cand = { score, H: lo, dy, v: { lines }, ch };
        if (!top || score > top.score) top = cand;
        if (!best || score > best.score) best = cand;
      }
      return top;
    };
    // round 1: as set, plus every single extra wrap (the old search); then greedily add one more wrap to the three
    // leaders, while that keeps paying (or until something fits), up to three more wraps
    evalV(ch0);
    let front = [ch0];
    for (let round = 0; round < 4 && front.length; round++) {
      const before = best ? best.score : 0, next = [];
      // cheapest wraps first, so the leader rises early and prunes the rest
      const cands = []; for (const ch of front) ch.forEach((w, i) => { if (!w) for (const wr of WR[i]) { const c2 = ch.slice(); c2[i] = wr; cands.push(c2); } });
      cands.sort((a, b) => costOf(b) - costOf(a));
      for (const c2 of cands) { const t = evalV(c2); next.push({ ch: c2, score: t ? t.score : 0 }); }
      if (before > 0 && !(best.score > before + 1e-6)) break;
      next.sort((a, b) => b.score - a.score);
      front = next.slice(0, 3).filter((x) => x.score > 0 || !best).map((x) => x.ch);
    }
    return best;
  };
  const minSizeOf = (b) => Math.min(...stack(b.v.lines, b.H).out.filter((l) => !l.icon).map((l) => l.size));
  let best = null;
  if (insideBase.length) {
    best = searchInside();
    // too much text for the smallest use: lower the small-line floor step by step and keep the arrangement whose
    // smallest text (name included) is biggest, rather than a giant name over unreadable lines, or nothing at all
    if (L.targetPx && (!best || minSizeOf(best) < MS - 0.01)) {
      const MS0 = MS; let pick = best ? { best, m: minSizeOf(best), MS: MS0 } : null;
      for (const k of [0.9, 0.8, 0.7, 0.6, 0.5]) {
        MS = Math.max(2, MS0 * k); const b = searchInside();
        if (b) { const m = minSizeOf(b); if (!pick || m > pick.m + 0.05) pick = { best: b, m, MS }; if (m >= MS - 0.01) break; }
      }
      MS = pick ? pick.MS : MS0; best = pick ? pick.best : null; report.minSmall = MS;
      // still below the floor (a long word in a wide font, too many lines): say so, rather than fail quietly
      report.relaxed = !!best && minSizeOf(best) < MS0 - 0.01;
      if (report.relaxed) report.warnings.push(`There is a lot of text for a laurel shown ${L.targetPx} px tall: some text is set below the readable size. Drop a line, move one outside, try a narrower font, or plan for a bigger use.`);
    }
    if (!best) {
      // nothing fits even at the smallest size: shrink each line to its own room, so nothing runs into the leaves
      MS = Math.max(2, MS * 0.5); report.minSmall = MS; report.relaxed = true;
      best = { H: 2, dy: dy0, v: { lines: insideBase } };
      const { out, h } = stack(best.v.lines, best.H), off = best.dy - h / 2, pad = padOf(2);
      for (const l of out) { const top = l.top + off, room = Math.max(4, Math.min(free(top - pad * 0.6, top + l.h + pad * 0.6) - pad, maxW / 2)); if (l.w / 2 > room) { const k = (2 * room) / l.w; l.size *= k; l.w *= k; l.glyph = (l.glyph || 0) * k; } l.margin = 0; }
      best.set = { out, off };
      report.warnings.push('The text does not fit inside, even at the smallest size: shorten it, or move a line outside.');
    }
    best.set = best.set || fits(best.v.lines, best.H, best.dy) || (() => { const { out, h } = stack(best.v.lines, best.H); return { out, off: best.dy - h / 2 }; })();
  }
  const H = best ? best.H : Math.min(L.heroMax, 18);
  report.hero = H; report.wrapped = best ? best.v.lines.length - insideBase.length : 0;
  // smart widening: a long name in a narrow wreath gets a wider wreath before it gets tiny type
  const widen = doc._widen || 0;
  if (L.autoWiden !== false && best && !flank && !noBranch && H < Math.min(L.heroMax, 24) * 0.62 && widen < 3 && br.spine.rx < 1.55) {
    // jump by about what the name needs (each step is a fresh build of the leaves), 13–30% at a time
    const kw = clamp(Math.pow((Math.min(L.heroMax, 24) * 0.62) / Math.max(H, 1), 0.9), 1.13, 1.3);
    const next = merge(docIn || {}, { branch: { spine: { rx: +Math.min(1.6, br.spine.rx * kw).toFixed(3) } } }); next._widen = widen + 1;
    return render(next, env);
  }
  if (widen) report.widened = { times: widen, rx: br.spine.rx };
  const hug = doc._hug || 0;
  if (L.hug !== false && best && contain && !FG && !noBranch && mirror && (doc.form || 'open') === 'open' && hug < 2 && !doc.fields.some((x) => x.show !== false && x.slot && x.slot !== 'inside')) {
    const fill = stack(best.v.lines, best.H).h / Math.max(1, B.bottom - B.top);
    if (fill < (L.hugMin ?? 0.4) && br.spine.ry > 0.56) {
      const next = merge(docIn || {}, { branch: { spine: { ry: +Math.max(0.55, br.spine.ry * clamp(Math.pow(fill / 0.5, 0.8), 0.7, 0.94)).toFixed(3) } } });
      next._hug = hug + 1; next._widen = widen;
      return render(next, env);
    }
  }
  if (hug) report.hugged = { times: hug, ry: br.spine.ry };
  const orFlank = flank ? '' : ', or use the Flank form';
  // when an uploaded logo is the name, the advice is about the artwork, not the font
  const logoHero = insideBase.some((l) => l.icon === 'logo' && l.role === 'hero') && !insideBase.some((l) => !l.icon && l.role === 'hero');
  if (best && MS > H * 0.62) report.warnings.push(`Shown ${L.targetPx} px tall, the small lines need to be almost as big as the ${logoHero ? 'logo' : 'name'} to stay readable: drop a line${flank ? ' or move it outside' : ', move it outside'}${orFlank}.`);
  if (best && H < L.heroMax * 0.35) report.warnings.push(logoHero ? `The logo is small for this wreath: it is very wide. Use a stacked version of the artwork if the festival has one${flank ? '' : ', or try the Flank form'}.` : `The hero line is small for this wreath: try a shorter name${flank ? ' or' : ','} a narrower font${orFlank}.`);

  // flank: push the branches out to clear the text
  let shift = 0;
  if (flank) { const out = best ? best.set.out : [], w = Math.max(0, ...out.map((l) => l.w)); shift = -(w / 2 + padOf(H) * 1.4) - B.innerX; }

  const texts = [], shapes = [], items = [];
  const drawLine = (l, x, base, cls) => {
    const r = roleOf(l.role), fill = paintRef(frameInk && cls === 'inside' ? frameInk : textPaint(l.role), defs, [x - l.w / 2, base - l.size, l.w, l.size]);
    if (l.icon === 'logo') {
      const bb = [x - l.w / 2, base - l.h, l.w, l.h], at = `x="${f(bb[0])}" y="${f(bb[1])}" width="${f(bb[2])}" height="${f(bb[3])}"`, img = `<image href="${esc(l.src)}" ${at} preserveAspectRatio="xMidYMid meet"`;
      // with the words, not the wreath: wreath effects (glow, misprint) reach the artwork only when "effects on text" is on
      if (!l.tint) texts.push(`${img} data-ids="${l.ids.join(' ')}"/>`);
      else { const id = 'lg' + ++PID; defs.push(`<mask id="${id}" mask-type="alpha" maskUnits="userSpaceOnUse" ${at}>${img}/></mask>`); texts.push(`<rect ${at} fill="${paintRef(frameInk && cls === 'inside' ? frameInk : textPaint(l.role), defs, bb)}" mask="url(#${id})" data-ids="${l.ids.join(' ')}"/>`); }
      items.push({ ids: l.ids, slot: cls, bbox: bb });
      return;
    }
    if (l.icon) {
      const cy = base - l.h / 2, s = l.size;
      if (l.icon === 'star') shapes.push(`<path d="${polyD(starPts(x, cy, s / 2))}" fill="${fill}"/>`);
      if (l.icon === 'stars') for (const k of [-1, 0, 1]) shapes.push(`<path d="${polyD(starPts(x + k * s * 1.1, cy + (k ? s * 0.12 : 0), s * (k ? 0.4 : 0.5)))}" fill="${fill}"/>`);
      if (l.icon === 'dot') shapes.push(`<path d="${circleD(x, cy, s * 0.22)}" fill="${fill}"/>`);
      if (l.icon === 'diamond') shapes.push(`<path d="${polyD([[x, cy - s * 0.4], [x + s * 0.28, cy], [x, cy + s * 0.4], [x - s * 0.28, cy]])}" fill="${fill}"/>`);
      if (l.icon === 'crown') { const C = [[-0.62, 0.36], [-0.62, -0.12], [-0.33, 0.1], [0, -0.42], [0.33, 0.1], [0.62, -0.12], [0.62, 0.36]].map(([a, b]) => [x + a * s, cy + b * s]); shapes.push(`<path d="${polyD(C)}${circleD(x - 0.62 * s, cy - 0.2 * s, s * 0.09)}${circleD(x, cy - 0.5 * s, s * 0.1)}${circleD(x + 0.62 * s, cy - 0.2 * s, s * 0.09)}" fill="${fill}"/>`); }
      if (l.icon === 'rule') shapes.push(`<rect x="${f(x - s * 2)}" y="${f(cy - Math.max(0.5, s * 0.04))}" width="${f(s * 4)}" height="${f(Math.max(1, s * 0.08))}" fill="${fill}"/>`);
      items.push({ ids: l.ids, slot: cls, bbox: [x - l.w / 2, base - l.h, l.w, l.h] });
      return;
    }
    const s = l.text ?? caseOf(l.s, r.case), tr = (l.track ?? r.track) * l.size;
    texts.push(`<text x="${f(x + tr / 2)}" y="${f(base)}" text-anchor="middle" font-family="${esc(r.font)}" font-weight="${r.weight}"${r.italic ? ' font-style="italic"' : ''} font-size="${f(l.size)}"${tr ? ` letter-spacing="${f(tr)}"` : ''} fill="${fill}" data-ids="${l.ids.join(' ')}">${esc(s)}</text>`);
    items.push({ ids: l.ids, slot: cls, bbox: [x - l.w / 2, base - l.size * 0.72, l.w, l.size * 0.72] });
  };

  // inside
  if (best) {
    const { out, off } = best.set, pad = padOf(H);
    for (const l of out) {
      const top = l.top + off + l.dy, base = top + l.h;
      drawLine(l, l.dx, base, 'inside');
      if (!flank) report.lines.push({ s: l.text || l.icon, icon: !!l.icon, margin: Math.min(free(top - pad * 0.6, base + l.desc + pad * 0.6) - pad, maxW / 2) - l.w / 2, w: l.w, size: l.size, track: l.track });
    }
  }
  let top = flank ? Math.min(B.top, -H) : B.top, bottom = B.bottom;
  for (const it of items) { top = Math.min(top, it.bbox[1] - padOf(H) * 0.5); bottom = Math.max(bottom, it.bbox[1] + it.bbox[3] + padOf(H) * 0.6); }
  if (!noBranch && mirror && !flank && br.orn.tie === 'bow') bottom = Math.max(bottom, B.tieAt[1] + Math.max(9, br.leaf.L0 * 0.45) * 1.25);
  if (!noBranch && mirror && !flank && br.orn.tie === 'streamers') bottom = Math.max(bottom, B.tieAt[1] + Math.max(9, br.leaf.L0 * 0.45) * 3.9);
  let halfWExtra = 0;
  const halfW0 = flank ? B.halfW + Math.abs(shift) : B.halfW;

  let badgeTop = Infinity;
  // ink for text and icons sitting on the ribbon or badge: always readable against it
  const bgSolid = doc.canvas.bg ? solidOf(doc.canvas.bg) : null;
  const ribbonPaint = doc.ribbon.paint || (FG && frameInk) || doc.paint.branch; // across a filled seal the ribbon takes its ink, so it reads against the face
  const ribbonInk = doc.ribbon.text && doc.ribbon.text !== 'auto' ? doc.ribbon.text : lumOf(solidOf(ribbonPaint)) > 0.5 ? '#1a1206' : bgSolid && lumOf(bgSolid) > 0.6 ? bgSolid : '#ffffff';
  // badge: a medallion in the top gap holding an icon or a short text (a year, "1st")
  // several lines in the medallion share it, joined like a ribbon's ("1st · 2026"), so none goes missing
  const badgeF = toLines(fieldsIn('badge'));
  if (badgeF.length) {
    const words = badgeF.filter((x) => !x.icon), l = words.length ? { s: words.map((x) => x.s).join(L.joinSep), ids: badgeF.flatMap((x) => x.ids) } : badgeF[0];
    if (words.length && words.length < badgeF.length) report.warnings.push('The medallion holds words or a star, not both: the star is left out. Move one of them out of the medallion.');
    const rb = Math.max(8, H * 0.62) * L.badgeR; let cy = B.top + rb * 0.15;
    const inside = FR && (!FG || (FG.hasBand && fieldsIn('arc-top').length));
    if (FG) cy = inside ? -FG.tb + rb + padOf(H) * 0.5 : -FG.ob;
    // tendrils curl into the top gap: the medallion rises clear of them
    const curls = noBranch ? [] : [B.curlBox, mirror && !flank ? (BR || B).curlBox : null].map((c, i) => c && (i ? [-c[0] - c[2], c[1], c[2], c[3]] : c)).filter(Boolean);
    for (const c of curls) if (c[0] < rb + 1.5 && c[0] + c[2] > -rb - 1.5) cy = Math.min(cy, c[1] - rb - 1.5);
    // …and above the inside text, in forms whose top is open (swoop, flank, crown)
    for (const it of items) if (it.slot === 'inside' && it.bbox[0] < rb && it.bbox[0] + it.bbox[2] > -rb) cy = Math.min(cy, it.bbox[1] - rb - padOf(H) * 0.7);
    badgeTop = cy - rb;
    // on a filled frame's face the medallion is struck in the ink, its star in the metal
    const onFace = inside && frameInk, bInk = onFace ? framePaint : ribbonInk;
    const bfill = paintRef(onFace ? frameInk : doc.ribbon.paint || doc.paint.branch, defs, [-rb, cy - rb, 2 * rb, 2 * rb]);
    shapes.push(`<path d="${circleD(0, cy, rb)}" fill="${bfill}"/>`);
    if (l.icon) shapes.push(`<path d="${polyD(starPts(0, cy, rb * 0.62))}" fill="${paintRef(bInk, defs, [-rb, cy - rb, 2 * rb, 2 * rb])}"/>`);
    else { const r = roleOf('arc'), s = caseOf(l.s, r.case); let size = rb * 0.62; while (measure(s, r.font, r.weight, r.italic, size) > rb * 1.6 && size > 3) size *= 0.92; if (size < MS * 0.8) report.warnings.push(`"${l.s}" is too long for the medallion to read: keep it to a year or a short word like "1st".`); texts.push(`<text x="0" y="${f(cy + size * 0.36)}" text-anchor="middle" font-family="${esc(r.font)}" font-weight="${r.weight}" font-size="${f(size)}" fill="${paintRef(bInk, defs, [-rb, cy - rb, 2 * rb, 2 * rb])}">${esc(s)}</text>`); }
    items.push({ ids: l.ids, slot: 'badge', bbox: [-rb, cy - rb, 2 * rb, 2 * rb] });
    top = Math.min(top, cy - rb);
  }

  // the badge frame: a fixed frame was fitted already; a hugging one is drawn round the words (and medallion) now
  let frameSvg = '', framePts = [], frameArea = [], frameBox = null;
  if (FR) {
    let G;
    if (FG) G = drawFixedFrame(FG, FR);
    else {
      const bi = items.filter((it) => it.slot === 'inside' || it.slot === 'badge');
      const blk = bi.length ? [Math.min(...bi.map((it) => it.bbox[0])), Math.min(...bi.map((it) => it.bbox[1])), Math.max(...bi.map((it) => it.bbox[0] + it.bbox[2])), Math.max(...bi.map((it) => it.bbox[1] + it.bbox[3]))] : [-30, -10, 30, 10];
      G = drawHugFrame(FR, blk, padOf(H) * 1.3 + (FR.w ?? 1.6));
    }
    const bb = G.box, fp = paintRef(framePaint, defs, bb); frameBox = bb;
    // ornaments in the ring's band, at three and nine o'clock, between the top and bottom lines of text
    if (FG && FG.hasBand && FR.orn && FR.orn !== 'none') { const ma = FG.oa - FG.bt / 2, os = FG.bt * 0.3; (FR.filled ? G.ink : G.paint).push(ornD(FR.orn, -ma, 0, os) + ornD(FR.orn, ma, 0, os)); }
    frameSvg = `<g fill="${fp}" fill-rule="evenodd">${G.paint.map((d) => `<path d="${d}"/>`).join('')}</g>` + (G.ink.length ? `<g fill="${paintRef(frameInk || doc.text.paint, defs, bb)}" fill-rule="evenodd">${G.ink.map((d) => `<path d="${d}"/>`).join('')}</g>` : '');
    // the medallion covers the line it sits on: those points are not obstacles
    const bIt = items.find((it) => it.slot === 'badge');
    framePts = G.pts.filter(([x, y]) => !bIt || !(x > bIt.bbox[0] - 1.2 && x < bIt.bbox[0] + bIt.bbox[2] + 1.2 && y > bIt.bbox[1] - 1.2 && y < bIt.bbox[1] + bIt.bbox[3] + 1.2));
    report.ornaments.push({ part: 'frame', bbox: bb, pts: framePts });
    // arcs go round the whole frame, not through it: a hugging frame's area (and its medallion) are obstacles too
    if (!FG) { for (let x = bb[0]; x <= bb[0] + bb[2] + 0.01; x += 5) for (let y = bb[1]; y <= bb[1] + bb[3] + 0.01; y += 5) frameArea.push([x, y]); if (bIt) frameArea.push(...rectPts(...bIt.bbox, 4)); }
    top = Math.min(top, bb[1]); bottom = Math.max(bottom, bb[1] + bb[3]); halfWExtra = Math.max(halfWExtra, -bb[0], bb[0] + bb[2]);
  }

  // ribbon: a banner across the lower wreath, gently curved, with folded tails that reach past the leaves
  const ribbonF = toLines(fieldsIn('ribbon'));
  if (ribbonF.length) {
    const r = roleOf('arc'), s = ribbonF.map((l) => caseOf(l.s || '', r.case)).join(L.joinSep);
    const size = Math.max(MS, H * r.ratio * 1.45), hh = size * 0.92;
    const tw = measure(s, r.font, r.weight, r.italic, size) + r.track * size * [...s].length;
    const halfW = Math.max(tw / 2 + hh * 1.6, Math.min(B.halfW * 0.86, 100) * L.ribbonW);
    const Rc = Math.max(100 * br.spine.ry * 2.4, halfW * 2.6), rise = (x) => Rc - Math.sqrt(Math.max(0, Rc * Rc - x * x)); // big circle, center above: a soft smile
    // the banner's ends rise: slide it down until it clears every inside line along their whole width
    let y0 = ribbonY;
    for (const it of items) if (it.slot === 'inside') { const xe = Math.min(halfW, Math.max(Math.abs(it.bbox[0]), Math.abs(it.bbox[0] + it.bbox[2]))); y0 = Math.max(y0, it.bbox[1] + it.bbox[3] + size * 0.45 + hh + rise(xe)); }
    // under a hugging frame, the banner hangs below it rather than across it
    if (FR && !FG && frameBox) y0 = Math.max(y0, frameBox[1] + frameBox[3] + size * 0.35 + hh + rise(Math.min(halfW, Math.max(-frameBox[0], frameBox[0] + frameBox[2]))));
    const cy = y0 - Rc;
    const ha = Math.asin(Math.min(0.9, halfW / Rc)), A0 = Math.PI / 2 + ha, A1 = Math.PI / 2 - ha;
    const P = (rr, a, dx = 0, dy = 0) => [rr * Math.cos(a) + dx, cy + rr * Math.sin(a) + dy];
    const arc = (rr, a, b, sw) => `A${f(rr)} ${f(rr)} 0 0 ${sw} ${f(P(rr, b)[0])} ${f(P(rr, b)[1])}`;
    const band = `M${f(P(Rc - hh, A0)[0])} ${f(P(Rc - hh, A0)[1])}${arc(Rc - hh, A0, A1, 0)}L${f(P(Rc + hh, A1)[0])} ${f(P(Rc + hh, A1)[1])}${arc(Rc + hh, A1, A0, 1)}Z`;
    const rp = ribbonPaint, rfill = paintRef(rp, defs, [-halfW, y0 - hh, 2 * halfW, 2 * hh]);
    if (doc.ribbon.tails !== false) for (const sg of [-1, 1]) {
      const a = sg < 0 ? A0 : A1, [ex, ey] = P(Rc, a), ox = sg * hh * 2.6, oy = hh * 0.9;
      const tail = [[ex - sg * hh * 0.2, ey - hh * 0.9 + oy], [ex + ox, ey - hh * 0.9 + oy], [ex + ox - sg * hh * 0.9, ey + oy], [ex + ox, ey + hh * 0.9 + oy], [ex - sg * hh * 0.2, ey + hh * 0.9 + oy]];
      const fold = [[ex, ey + hh], [ex - sg * hh * 0.2, ey + hh * 0.9 + oy], [ex - sg * hh * 0.2, ey + hh * 0.9 + oy - hh * 0.6]];
      shapes.push(`<path data-part="ribbon" d="${polyD(tail)}" fill="${rfill}" opacity="0.82"/><path d="${polyD(fold)}" fill="#000" opacity="0.35"/>`);
    }
    shapes.push(`<path data-part="ribbon" d="${band}" fill="${rfill}"/>`);
    const pid = 'rp' + ++PID, rm = Rc - size * 0.36;
    defs.push(`<path id="${pid}" d="M${f(P(rm, A0 + 0.2)[0])} ${f(P(rm, A0 + 0.2)[1])}${arc(rm, A0 + 0.2, A1 - 0.2, 0)}"/>`);
    texts.push(`<text font-family="${esc(r.font)}" font-weight="${r.weight}" font-size="${f(size)}" letter-spacing="${f(r.track * size)}" fill="${paintRef(ribbonInk, defs, [0, 0, 1, 1])}" text-anchor="middle"><textPath href="#${pid}" startOffset="50%">${esc(s)}</textPath></text>`);
    items.push({ ids: ribbonF.flatMap((l) => l.ids), slot: 'ribbon', bbox: [-halfW, y0 - hh, 2 * halfW, 2 * hh] });
    bottom = Math.max(bottom, y0 + hh * 2.2); halfWExtra = Math.max(halfWExtra, halfW + hh * 2.8);
  }

  // arcs: text on a circle — top (outside, reading over the wreath), bottom (inside, reading along the base) and
  // under (outside, curving under the base like the lower half of a seal)
  for (const [slot, Rm, sweep] of [['arc-top', L.arcTopR, 1], ['arc-bottom', L.arcBottomR, 0], ['arc-under', L.arcUnderR ?? 1.04, 0]]) {
    const ls = toLines(fieldsIn(slot)); if (!ls.length) continue;
    const r = roleOf('arc'), s = ls.map((l) => caseOf(l.s || '', r.case)).join(L.joinSep);
    if (FG && FG.hasBand) { // a seal: the words run round the ring's band, centered in it, over the top and under the base
      const under = slot !== 'arc-top', ma = FG.oa - FG.bt / 2, mb = FG.ob - FG.bt / 2, n = [...s].length;
      let size = FG.bt * 0.5; const len = () => measure(s, r.font, r.weight, r.italic, size) + r.track * size * n;
      const room = Math.PI * Math.sqrt((ma * ma + mb * mb) / 2) * (under ? 0.58 : 0.84);
      while (len() > room && size > MS * 0.6) size *= 0.95;
      const d = 0.36 * size, A = under ? ma + d : ma - d, Bv = under ? mb + d : mb - d, pid = 'ap' + ++PID;
      defs.push(`<path id="${pid}" d="M${f(-A)} 0A${f(A)} ${f(Bv)} 0 0 ${under ? 0 : 1} ${f(A)} 0"/>`);
      texts.push(`<text data-part="${slot}" font-family="${esc(r.font)}" font-weight="${r.weight}"${r.italic ? ' font-style="italic"' : ''} font-size="${f(size)}" letter-spacing="${f(r.track * size)}" fill="${paintRef(frameInk || textPaint('arc'), defs, [-A, -Bv, 2 * A, 2 * Bv])}" text-anchor="middle"><textPath href="#${pid}" startOffset="50%">${esc(s)}</textPath></text>`);
      items.push({ ids: ls.flatMap((l) => l.ids), slot, bbox: [-A, under ? Bv - size : -Bv, 2 * A, size], band: true });
      continue;
    }
    let size = Math.max(MS, H * r.ratio);
    let Rr = 100 * Math.min(br.spine.rx, br.spine.ry) * Rm;
    if (slot === 'arc-under') { // just under what really sits at the base: leaves in the text's sector, stems, tie, inside lines
      let ext = 0;
      if (!noBranch || framePts.length) { const pts = noBranch ? framePts.concat(frameArea) : BR ? B.pts.concat(BR.pts) : B.pts, half = Math.min(1.3, (measure(s, r.font, r.weight, r.italic, size) + r.track * size * [...s].length) / Math.max(40, bottom) / 2 + 0.25); for (const [px, py] of pts) { const x = Math.abs(px + shift); if (py > 0 && Math.atan2(x, py) < half) ext = Math.max(ext, Math.hypot(x, py)); } }
      Rr = Math.max(ext * Rm + size * 1.05, (bottom + size * 1.25) * Rm / 1.04);
    }
    if (slot === 'arc-top' && badgeTop < 0) Rr = Math.max(Rr, -badgeTop + size * 0.8); // ride over the badge, not through it
    // keep the whole line of letters off the leaves: grow (top) or shrink (bottom) the circle until its band is clear
    // (the top and under arcs also keep clear of the text inside: on a flank the name block stands between the branches)
    const itemPts = [];
    for (const it of items) if (it.slot === 'inside') { const [x, y, w, h] = it.bbox, n = clamp(Math.ceil(w / 6), 4, 48); for (let i = 0; i <= n; i++) for (let j = 0; j <= 2; j++) itemPts.push([x + (w * i) / n - shift, y + (h * j) / 2]); }
    {
      const leafPts = noBranch ? framePts.concat(frameArea) : BR ? B.pts.concat(BR.pts) : B.pts, top0 = slot === 'arc-top';
      const hits1 = (R, P, m, rp = 0) => { const half = (measure(s, r.font, r.weight, r.italic, size) + r.track * size * [...s].length) / R / 2 + 0.06 + m / R, r0 = (top0 ? R - size * 0.35 : R - size * 1.05) - rp, r1 = (top0 ? R + size * 1.05 : R + size * 0.35) + rp; for (const [px, py] of P) { const x = Math.abs(px + shift), d = Math.hypot(x, py); if (d < r0 || d > r1) continue; const ang = Math.atan2(x, top0 ? -py : py); if (ang < half) return true; } return false; };
      // text keeps a little more air at the ends of the arc than leaves do
      const tp = padOf(H) * 0.7, hits = (R, P) => (P === itemPts ? hits1(R, itemPts, size * 0.6, tp) : P === leafPts ? hits1(R, leafPts, 0) : hits1(R, leafPts, 0) || hits1(R, itemPts, size * 0.6, tp));
      if (slot === 'arc-bottom') {
        for (let k = 0; k < 24 && hits(Rr, leafPts); k++) Rr *= 0.96;
        // no room between the text and the base: go round the outside instead, like the lower half of a seal
        if (hits(Rr, itemPts)) { for (let k = 0; k < 40 && hits(Rr, null); k++) Rr *= 1.04; }
      } else for (let k = 0; k < 24 && hits(Rr, null); k++) Rr *= 1.04;
    }
    const span = slot === 'arc-top' ? Math.PI * 0.9 : Math.PI * 0.62, len = () => measure(s, r.font, r.weight, r.italic, size) + r.track * size * [...s].length;
    while (len() > Rr * span && size > MS * 0.7) size *= 0.95;
    const pid = 'ap' + ++PID;
    defs.push(`<path id="${pid}" d="M${f(-Rr)} 0A${f(Rr)} ${f(Rr)} 0 0 ${sweep} ${f(Rr)} 0"/>`);
    texts.push(`<text data-part="${slot}" font-family="${esc(r.font)}" font-weight="${r.weight}"${r.italic ? ' font-style="italic"' : ''} font-size="${f(size)}" letter-spacing="${f(r.track * size)}" fill="${paintRef(textPaint('arc'), defs, [-Rr, -Rr, 2 * Rr, 2 * Rr])}" text-anchor="middle"><textPath href="#${pid}" startOffset="50%">${esc(s)}</textPath></text>`);
    items.push({ ids: ls.flatMap((l) => l.ids), slot, bbox: [-Rr, slot === 'arc-top' ? -Rr - size : Rr - size, 2 * Rr, size] });
    if (slot === 'arc-top') top = Math.min(top, -Rr - size * 1.1); else bottom = Math.max(bottom, Rr + size * 0.4);
  }

  // above / below: stacks outside the wreath
  for (const slot of ['above', 'below']) {
    const ls = toLines(fieldsIn(slot)); if (!ls.length) continue;
    const { out, h } = stack(ls, H);
    const maxW = 2 * halfW0;
    for (const l of out) { if (l.w > maxW && (!l.icon || l.icon === 'logo')) { const k = maxW / l.w; l.size *= k; l.w = maxW; l.h *= k; } }
    const og = L.outerGap + H * 0.18, y0 = slot === 'above' ? top - og - h : bottom + og;
    for (const l of out) drawLine(l, l.dx, y0 + l.top + l.h + l.dy, slot);
    if (slot === 'above') top = y0; else bottom = y0 + h;
  }

  // the wreath itself
  let wreath = '';
  if (!noBranch) {
    const bb = [-B.halfW, B.top, 2 * B.halfW, B.bottom - B.top];
    const P = doc.paint, mode = P.mode, outline = mode === 'outline';
    const main = paintRef(P.branch, defs, bb);
    const innerFill = P.inner ? paintRef(P.inner, defs, bb) : main;
    const ornFill = P.ornament ? paintRef(P.ornament, defs, bb) : main;
    const strokeP = P.stroke && (P.stroke.paint ? paintRef(P.stroke.paint, defs, bb) : main);
    const veinRule = ' fill-rule="evenodd"'; // cut-outs (veins, inline rings, split halves) are evenodd sub-paths
    const look = (fill) => outline ? `fill="none" stroke="${fill}" stroke-width="${P.stroke.w}" stroke-linejoin="round"` : mode === 'both' ? `fill="${fill}" stroke="${strokeP}" stroke-width="${P.stroke.w}" stroke-linejoin="round"` : `fill="${fill}"`;
    const group = (ds, fill, extra = '') => ds.length ? `<g ${look(fill)}${extra}>${ds.map((d) => `<path d="${d}"${veinRule}/>`).join('')}</g>` : '';
    const shadeFill = paintRef(P.shade || '#000', defs, bb);
    const shadeG = (ds, k) => !outline && ds && ds.length && k > 0 ? `<g fill="${shadeFill}" opacity="${f(k)}">${ds.map((d) => `<path d="${d}"${veinRule}/>`).join('')}</g>` : '';
    const halfOf = (H2) => { const k = (H2.p && H2.p.leaf.fold) || 0, dim = P.inner ? 1 : 1 - P.depth; return [
      `<g${dim < 1 ? ` opacity="${f(dim)}"` : ''}>${group(H2.inner, innerFill)}${shadeG(H2.shadeIn, k)}</g>`,
      outline ? `<path d="${H2.stemLine}" fill="none" stroke="${main}" stroke-width="${P.stroke.w}"/>` : H2.stemD ? `<path d="${H2.stemD}" fill="${main}"/>` : '',
      group(H2.outer, main), shadeG(H2.shadeOut, k),
      group(H2.orns, ornFill),
    ].join(''); };
    const hid = 'h' + ++PID;
    wreath = `<g id="${hid}" transform="translate(${f(shift)} 0)">${halfOf(B)}</g>` + (BR ? `<g transform="scale(-1 1)">${halfOf(BR)}</g>` : mirror ? `<use href="#${hid}" transform="scale(-1 1)"/>` : '');
    // a tie where the stems meet: a band, or a band with a bow
    const tie = br.orn.tie;
    if (mirror && !flank && tie && tie !== 'none') {
      const [tx, ty] = B.tieAt, bw = 2 * Math.abs(tx) + br.stem.w * 3 + 5, bh = Math.max(3, br.stem.w * 2.4), parts = [];
      parts.push(`<rect x="${f(-bw / 2)}" y="${f(ty - bh / 2)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bh * 0.3)}"/>`);
      if (tie === 'rosette' || tie === 'knot') { parts.length = 0; const s = Math.max(5, br.leaf.L0 * 0.24); if (tie === 'rosette') { for (let k = 0; k < 6; k++) parts.push(`<path d="${profileD('round', s, s * 0.78, 0, X(0, ty, (k * Math.PI) / 3 + 0.26))}"/>`); parts.push(`<path d="${circleD(0, ty, s * 0.3)}" fill-opacity="0.55"/>`); } else parts.push(`<path d="${polyD([[0, ty - s], [s * 0.8, ty], [0, ty + s], [-s * 0.8, ty]])}"/>`, `<rect x="${f(-bw / 2)}" y="${f(ty - bh / 2)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bh * 0.3)}"/>`); }
      if (tie === 'streamers') { // a bow whose two ribbons fall and flutter outwards, with swallow-tail ends
        parts.length = 0; const s = Math.max(9, br.leaf.L0 * 0.45), N2 = 28;
        for (const sg of [-1, 1]) {
          const c = Array.from({ length: N2 + 1 }, (_, i) => { const v = i / N2; return [sg * (s * 0.2 + v * s * 1.9 + Math.sin(v * Math.PI * 2) * s * 0.42), ty + s * 0.25 + v * s * 3.4]; });
          const Lp = [], Rp = []; c.forEach((pt, i) => { const nb = c[Math.min(N2, i + 1)], pb = c[Math.max(0, i - 1)], dx = nb[0] - pb[0], dy = nb[1] - pb[1], l = Math.hypot(dx, dy) || 1, w = s * 0.32 * (1 - 0.1 * (i / N2)); Lp.push([pt[0] - (dy / l) * w, pt[1] + (dx / l) * w]); Rp.push([pt[0] + (dy / l) * w, pt[1] - (dx / l) * w]); });
          const e = c[N2], e2 = c[N2 - 2], tl = Math.hypot(e[0] - e2[0], e[1] - e2[1]) || 1, notch = [e[0] - ((e[0] - e2[0]) / tl) * s * 0.34, e[1] - ((e[1] - e2[1]) / tl) * s * 0.34];
          parts.push(`<path d="${smoothOpen(Lp)}L${f(notch[0])} ${f(notch[1])}${smoothOpen(Rp.reverse(), false)}Z"/>`);
        }
        parts.push(...[profileD('round', s, s * 0.7, 0.1, X(0, ty, rad(200))), profileD('round', s, s * 0.7, -0.1, X(0, ty, rad(-20)))].map((d) => `<path d="${d}"/>`), `<path d="${circleD(0, ty, s * 0.26)}"/>`);
        bottom = Math.max(bottom, ty + s * 3.9);
      }
      if (tie === 'bow') { const s = Math.max(9, br.leaf.L0 * 0.45); parts.push(...[profileD('round', s, s * 0.7, 0.1, X(0, ty, rad(200))), profileD('round', s, s * 0.7, -0.1, X(0, ty, rad(-20))), profileD('willow', s * 1.25, s * 0.36, 0.12, X(0, ty, rad(112))), profileD('willow', s * 1.25, s * 0.36, -0.12, X(0, ty, rad(68)))].map((d) => `<path d="${d}"/>`)); bottom = Math.max(bottom, ty + s * 1.25); }
      wreath += `<g fill="${ornFill}">${parts.join('')}</g>`;
      const s = Math.max(9, br.leaf.L0 * 0.45), s2 = Math.max(5, br.leaf.L0 * 0.24);
      const box = tie === 'streamers' ? [-s * 2.5, ty - s * 0.8, s * 5, s * 4.7] : tie === 'bow' ? [-s * 1.1, ty - s * 0.8, s * 2.2, s * 2.05] : tie === 'rosette' ? [-s2 * 1.2, ty - s2 * 1.2, s2 * 2.4, s2 * 2.4] : tie === 'knot' ? [-Math.max(bw / 2, s2 * 0.8), ty - s2, Math.max(bw, s2 * 1.6), s2 * 2] : [-bw / 2, ty - bh / 2, bw, bh];
      report.ornaments.push({ part: 'tie', bbox: box });
      if (tie === 'streamers') halfWExtra = Math.max(halfWExtra, s * 2.5);
    }
    // tendrils at the tips (mirrored for the right side)
    for (const [H2, sx] of [[B, 1], [BR || (mirror ? B : null), -1]]) if (H2 && H2.curlBox && (sx > 0 || mirror)) { const [x, y, w, h] = H2.curlBox; report.ornaments.push({ part: 'tendril', bbox: sx > 0 ? [x + shift, y, w, h] : [-(x + shift) - w, y, w, h], pts: H2.curlPts.map(([px, py]) => [sx * (px + shift), py]) }); }
  }

  const fxAttr = effectFilter(doc.paint.effects && EFFECT_KEYS.some((k) => doc.paint.effects[k]) ? doc.paint.effects : null, defs, doc.seed);
  const textFx = doc.paint.effects && doc.paint.effects.text ? fxAttr : '';
  const fragment = `<g${fxAttr}>${frameSvg}${wreath}${shapes.join('')}</g><g${textFx}>${texts.join('')}</g>`;

  // canvas
  const pad = doc.canvas.pad;
  const halfW = Math.max(halfW0, halfWExtra);
  let vx = -halfW - pad, vy = top - pad, vw = 2 * (halfW + pad), vh = bottom - top + 2 * pad;
  // legibility, measured on the real result: lines placed outside (ribbon, arcs, below…) make the laurel taller than
  // the estimate, so if the smallest line would fall under minPx at targetPx, lay it out once more with a higher floor
  const smallest = Math.min(...report.lines.filter((l) => !l.icon).map((l) => l.size), Infinity);
  if (L.targetPx && isFinite(smallest) && !report.relaxed && (doc._msFix || 0) < 2 && smallest < ((L.minPx || 6) * vh) / L.targetPx - 0.05) {
    const next = merge(docIn || {}, { layout: { minSmall: Math.max(MS, ((L.minPx || 6) * vh * 1.03) / L.targetPx) } }); next._msFix = (doc._msFix || 0) + 1;
    return render(next, env);
  }
  if (doc.canvas.aspect) { const a = doc.canvas.aspect; if (vw / vh > a) { const nh = vw / a; vy -= (nh - vh) / 2; vh = nh; } else { const nw = vh * a; vx -= (nw - vw) / 2; vw = nw; } }
  const bgFill = doc.canvas.bg ? paintRef(doc.canvas.bg, defs, [vx, vy, vw, vh]) : null;
  const bg = bgFill ? `<rect data-bg="1" x="${f(vx)}" y="${f(vy)}" width="${f(vw)}" height="${f(vh)}" fill="${bgFill}"/>` : '';
  const defsS = defs.length ? `<defs>${defs.join('')}</defs>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}" width="${f(vw * (env.scale || 2))}" height="${f(vh * (env.scale || 2))}">${defsS}${bg}${fragment}</svg>`;
  report.minMargin = report.lines.length ? Math.min(...report.lines.map((l) => l.margin)) : null;
  report.fonts = [...new Set(Object.values(doc.roles).map((r) => r && r.font).filter(Boolean))];
  return { svg, defs: defsS, fragment, viewBox: [vx, vy, vw, vh], items, report, leaves: B.leaves, B };
}

// ── shuffle: a coherent random look inside guardrails ──
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
export function shuffleBranch(seed) {
  const r = rngOf(seed * 7919 + 13), R = (a, b) => lerp(a, b, r());
  const family = pick(r, ['simple', 'simple', 'simple', 'simple', 'simple', 'simple', 'fern', 'wheat', 'palm', 'needle', 'trefoil', 'plume', 'spike']);
  const profile = pick(r, ['almond', 'laurel', 'laurel', 'lance', 'willow', 'round', 'spoon', 'heart', 'teardrop', 'oak', 'serrate', 'feather', 'diamond', 'blade', 'flame']);
  const n = family === 'simple' ? Math.round(R(['round', 'heart', 'oak', 'teardrop'].includes(profile) ? 6 : 8, ['willow', 'lance', 'feather'].includes(profile) ? 22 : 15)) : Math.round(R(4, 8));
  const L0 = family === 'simple' ? R(220, 420) / n + 8 : R(40, 62), L1 = L0 * R(0.45, 0.85);
  return {
    spine: { rx: R(0.68, 0.92), a0: R(96, 112), a1: R(240, 262), curl: r() < 0.25 ? R(10, 40) : 0, spiral: r() < 0.2 ? R(0.1, 0.3) : 0, cross: r() < 0.25 ? R(14, 30) : 0 },
    stem: { w: R(0.8, 3.6), taper: R(0.2, 0.8) },
    leaf: { family, profile, n, L0, L1, wr: family === 'simple' ? (['round', 'heart', 'teardrop'].includes(profile) ? R(0.65, 0.95) : profile === 'willow' ? R(0.16, 0.26) : R(0.26, 0.5)) : R(0.55, 0.9), bend: R(-0.05, 0.3), aOut: R(18, profile === 'round' ? 70 : 48), aIn: R(14, 40), inScale: R(0.65, 1), arr: pick(r, ['alternate', 'alternate', 'paired', 'outer']), gamma: R(0.85, 1.25), jitter: r() < 0.25 ? R(0.1, 0.4) : 0, vein: r() < 0.2 && family === 'simple' ? R(0.12, 0.22) : 0, scurve: r() < 0.2 ? R(-0.5, 0.6) : 0, fan: r() < 0.2 ? R(-0.4, 0.7) : 0, alt: r() < 0.15 ? R(0.2, 0.4) : 0 },
    orn: { tip: pick(r, ['leaf', 'leaf', 'bud', 'berry', 'none']), berries: r() < 0.2 ? 2 : 0, flowers: r() < 0.1 ? 3 : 0 },
  };
}

// the smallest type in a rendered laurel, in viewBox units, read from the SVG itself so every slot counts (inside,
// flank, outside, arcs, ribbon, medallion); Infinity when the laurel has no words (a logo on its own)
export function smallestText(svg) {
  let m = Infinity;
  for (const [, attrs, body] of String(svg).matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const fs = /\bfont-size="([\d.]+)"/.exec(attrs);
    if (fs && body.replace(/<[^>]*>/g, '').trim()) m = Math.min(m, +fs[1]);
  }
  return m;
}

// an uploaded image lives on the device it was added on: a reference without its bytes here is missing
export const assetMissing = (src) => /^asset:/.test(src || '') && !ASSETS[src];

// A document from outside (a share link, an autosave, a back-button entry) is checked before it replaces anything:
// numbers are finite, switches are switches, lists are lists, and no string outside the words people type carries a
// quote or markup into an SVG attribute. Throws when it isn't a laurel at all.
const TEXT_KEYS = new Set(['text', 'title', 'line', 'status', 'festival', 'award', 'year', 'name', 'presetName', 'font', 'label', 'awards', 'winner', 'note']);
export function sanitizeDoc(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not a laurel');
  let budget = 50000;
  const clean = (v, def, key, depth) => {
    if (--budget < 0) throw new Error('too big to be a laurel');
    if (v === null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'boolean') return typeof def === 'number' ? undefined : v;
    if (typeof v === 'string') {
      if (typeof def === 'number') return v === 'auto' ? v : /^-?\d+(\.\d+)?$/.test(v) ? +v : undefined;
      if (typeof def === 'boolean') return undefined;
      if (!TEXT_KEYS.has(key) && /["<>]/.test(v)) return undefined;
      return v.length > 4000 && !/^data:image\//.test(v) ? v.slice(0, 4000) : v;
    }
    if (depth > 12 || typeof v !== 'object') return undefined;
    if (Array.isArray(v)) return v.slice(0, 500).map((x) => clean(x, Array.isArray(def) ? def[0] : undefined, key, depth + 1)).filter((x) => x !== undefined);
    const o = {};
    for (const k of Object.keys(v).slice(0, 500)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const c = clean(v[k], def && typeof def === 'object' && !Array.isArray(def) ? def[k] : undefined, k, depth + 1);
      if (c !== undefined) o[k] = c;
    }
    return o;
  };
  const obj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  // the shape itself must be right: a laurel whose lines or settings aren't lists and objects is refused, not guessed at
  if ('fields' in raw && (!Array.isArray(raw.fields) || raw.fields.some((f) => !obj(f) || typeof f.kind !== 'string'))) throw new Error('its lines are damaged');
  for (const k of Object.keys(DEFAULT_DOC)) if (obj(DEFAULT_DOC[k]) && k in raw && !obj(raw[k])) throw new Error(`its ${k} settings are damaged`);
  if ('row' in raw && raw.row !== null && (!obj(raw.row) || ('items' in raw.row && !Array.isArray(raw.row.items)))) throw new Error('its row is damaged');
  const d = clean(raw, DEFAULT_DOC, '', 0);
  const okSrc = (s) => typeof s === 'string' && (/^asset:[\w-]{1,60}$/.test(s) || /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s));
  const seen = new Set();
  if ('fields' in d) {
    d.fields = (Array.isArray(d.fields) ? d.fields : []).filter((f) => obj(f) && typeof f.kind === 'string').slice(0, 80).map((f, i) => {
      let id = typeof f.id === 'string' && /^[\w-]{1,40}$/.test(f.id) && !seen.has(f.id) ? f.id : 'i' + i + 'x'; seen.add(id);
      const g = { ...f, id, text: typeof f.text === 'string' ? f.text : '' };
      for (const k of ['dx', 'dy']) if (k in g && typeof g[k] !== 'number') delete g[k];
      if ('src' in g && !okSrc(g.src)) delete g.src;
      return g;
    });
    if (!d.fields.length) delete d.fields;
  }
  for (const k of Object.keys(DEFAULT_DOC)) if (obj(DEFAULT_DOC[k]) && k in d && !obj(d[k])) delete d[k];
  if (obj(d.roles)) for (const r of Object.keys(d.roles)) { const x = d.roles[r]; if (!obj(x)) { delete d.roles[r]; continue; } if ('weight' in x && typeof x.weight !== 'number') delete x.weight; }
  if ('row' in d) {
    if (!obj(d.row)) delete d.row;
    else d.row.items = (Array.isArray(d.row.items) ? d.row.items : []).filter(obj).slice(0, 60).map((it, i) => { const g = { ...it, id: typeof it.id === 'string' && /^[\w-]{1,60}$/.test(it.id) ? it.id : 'r' + i + 'x' }; if ('src' in g && !okSrc(g.src)) delete g.src; return g; });
  }
  if (obj(d.poster) && 'src' in d.poster && !okSrc(d.poster.src)) delete d.poster.src;
  return d;
}
