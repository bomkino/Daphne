// The grove: everything in the film that is drawn rather than set. One pure
// function of time, so any frame can be rendered alone and every render is the
// same. It grows out of the brand book's story (brand/tools/book.mjs): her hair
// and the river as nine hairlines of light, the tree with raised arms, her heart
// under the bark, the laurel worn as a crown. The film adds what a scroll can't
// hold: the chase, the roots, the god's light, the kiss the wood refused, and
// every laurel since.
import paths from "../brand/paths.json";
import { RGB } from "../brand/colors";
import { at, beat, clamp, END, HEART_BEATS, mix, pulse, sm, span } from "../story";

export type Frame = { W: number; H: number; tall: boolean; t: number; ownEnding: boolean };

// ── shared shapes ──────────────────────────────────────────────────────────
const LEAF = new Path2D(paths.storyLeaf.d);
const STALK = new Path2D(paths.storyLeaf.stalk);
const LEN = paths.storyLeaf.length;
const LOGO = {
  box: paths.logo.box,
  letters: paths.logo.letters.map((l) => ({ x: l.x, p: new Path2D(l.d) })),
  L: new Path2D(paths.logo.left.d),
  LS: new Path2D(paths.logo.left.stalk),
  R: new Path2D(paths.logo.right.d),
  RS: new Path2D(paths.logo.right.stalk),
  A0: paths.logo.left.base,
  A1: paths.logo.left.tip,
  Z0: paths.logo.right.base,
};
const GOLD = ["#5e4112", "#b8882f", "#f6e3a1", "#d4a748", "#8a6220"]; // the Classic Gold preset's metal

// seeded, so it's the same grove in every frame and every render
const rngOf = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const TAU = Math.PI * 2;
const angOf = (dx: number, dy: number) => Math.atan2(dx, -dy);
const mixA = (a: number, b: number, t: number) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
};
type P = [number, number];

// ── the cast, made once ────────────────────────────────────────────────────
const rnd = rngOf(11);
// her strands: nine hairlines of light (and six fainter ones, further off, for the river)
const strands = Array.from({ length: 9 }, (_, k) => ({
  k,
  off: (k - 4) / 4,
  ph: rnd() * TAU,
  fq: 1.3 + rnd() * 1.1,
  j: 0.82 + rnd() * 0.36,
  side: k < 4 ? -1 : k > 4 ? 1 : 0,
  lane: Math.abs(k - 4),
}));
const far = Array.from({ length: 7 }, (_, k) => ({ off: (k - 3) / 3, ph: rnd() * TAU, fq: 0.9 + rnd() * 0.8, y: rnd() }));
// her leaves: 24 a side; one grows each frame, bottom to top
const NL = 30;
const leaves: {
  side: number; j: number; t: number; out: number; k: number; ut: number; seed: number; sway: number; chosen: boolean; order: number;
}[] = [];
for (let j = 0; j < NL; j++)
  for (const side of [-1, 1])
    leaves.push({
      side, j, t: j / (NL - 1), out: j % 2 ? 1 : -1,
      k: j % 7 === 3 ? 4 : side < 0 ? 3 - (j % 4) : 5 + (j % 4),
      ut: 0.26 + 0.74 * (j / (NL - 1)) + (rnd() - 0.5) * 0.04,
      seed: rnd(), sway: rnd() * TAU, chosen: j === 12, order: leaves.length,
    });
// her roots: they find their way down, and branch
const roots: { pts: P[]; delay: number; w: number }[] = [];
{
  const r = rngOf(7);
  const grow = (x: number, y: number, a: number, len: number, w: number, delay: number, depth: number) => {
    const pts: P[] = [[x, y]];
    const n = 22;
    for (let i = 1; i <= n; i++) {
      a += (r() - 0.5) * 0.32;
      a = mix(a, Math.PI / 2, 0.06); // gravity: always back toward down
      x += (Math.cos(a) * len) / n;
      y += (Math.sin(a) * len) / n;
      pts.push([x, y]);
      if (depth < 2 && i > 6 && r() < 0.09) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * 0.5, w * 0.6, delay + i / n * 0.6, depth + 1);
    }
    roots.push({ pts, delay, w });
  };
  for (let i = 0; i < 9; i++) {
    const a = Math.PI / 2 + ((i - 4) / 4) * 1.05 + (r() - 0.5) * 0.2;
    grow((i - 4) * 0.006, 0, a, 0.16 + r() * 0.14, 1 - Math.abs(i - 4) * 0.12, Math.abs(i - 4) * 0.08 + r() * 0.1, 0);
  }
}
// the night around her
const motes = Array.from({ length: 140 }, () => ({ x: rnd(), y: rnd(), z: rnd(), ph: rnd() * TAU, sp: 0.2 + rnd() * 0.8 }));
const drift = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), z: rnd(), r: rnd() * TAU, vr: rnd() - 0.5, sw: rnd() * TAU, sp: 0.4 + rnd() * 0.6 }));
// every laurel since: a field of crowns, far into the dark
const field = Array.from({ length: 30 }, (_, i) => {
  const a = rnd() * TAU, r = 0.5 + rnd() * 0.9;
  return { X: Math.cos(a) * r, Y: Math.sin(a) * r * 0.62, z0: rnd(), rot: (rnd() - 0.5) * 0.7, s: 0.8 + rnd() * 0.4, gold: i / 30 + rnd() * 0.08 };
});

// ── how fast the river runs ────────────────────────────────────────────────
const chaseOf = (t: number) => sm(at("god") + 0.6, at("chase") + 1.2, t) * (1 - sm(at("still") - 0.35, at("still") + 0.05, t));
const ranOf = (t: number) => Math.exp(-(((t - at("ran") - 0.5) / 0.9) ** 2));
const speedOf = (t: number) => (0.5 + chaseOf(t) * 3.2 + ranOf(t) * 2.4) * (1 - sm(at("still") - 0.2, at("still") + 0.2, t) * (1 - sm(at("crown"), at("since"), t) * 0.4));
const FLOW: number[] = [];
{
  const dt = 1 / 240;
  let f = 0;
  for (let i = 0; i <= (END + 1) * 240; i++) {
    FLOW.push(f);
    f += speedOf(i * dt) * dt;
  }
}
const flowAt = (t: number) => {
  const i = clamp(t * 240, 0, FLOW.length - 2), i0 = Math.floor(i);
  return mix(FLOW[i0], FLOW[i0 + 1], i - i0);
};

// ── the god: a hot pale light that never touches gold ──────────────────────
// keys: [seconds, x, y, intensity] with x, y in units of U from the frame's centre
type Key = [number, number, number, number];
const godKeys = (heart: P, crownTop: P): Key[] => [
  [at("god") - 0.8, -1.25, 0.2, 0],
  [at("chase"), -1.0, 0.18, 0.55],
  [at("ran"), -0.86, 0.14, 0.72],
  [at("ran") + 3, -0.66, 0.12, 0.82],
  [at("still") - 0.3, -0.44, 0.08, 1],
  [at("still") + 0.4, -0.5, 0.02, 0.22],
  [at("hand") - 0.6, -0.5, -0.02, 0.32],
  [at("hand") + 1.0, heart[0] - 0.13, heart[1] - 0.03, 0.42],
  [at("kiss") - 0.2, heart[0] - 0.11, heart[1] - 0.05, 0.4],
  [at("kiss") + 0.9, crownTop[0] - 0.07, crownTop[1] + 0.02, 0.8],
  [at("kiss") + 2.3, -0.36, -0.26, 0.42],
  [at("crown") + 1.8, 0, -0.34, 0.9],
  [at("since") + 0.4, 0, -0.34, 0.55],
  [at("chosen") - 0.4, 0, -0.36, 0],
];
const keyed = (keys: Key[], t: number): Key => {
  if (t <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = sm(a[0], b[0], t);
      return [t, mix(a[1], b[1], u), mix(a[2], b[2], u), mix(a[3], b[3], u)];
    }
  }
  return keys[keys.length - 1];
};

// ── sprites and grain, made once per frame size ────────────────────────────
type Kit = { grain: CanvasPattern[]; leafSpr: HTMLCanvasElement[]; wreath: { green: HTMLCanvasElement[]; gold: HTMLCanvasElement[] } };
const kits = new Map<string, Kit>();
const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const goldFill = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const lg = g.createLinearGradient(x0, y0, x1, y1);
  [0, 0.22, 0.48, 0.62, 0.85].forEach((o, i) => lg.addColorStop(o, GOLD[i]));
  return lg;
};
// a crown of her leaves, drawn once and reused through the field
const wreathSprite = (gold: boolean, blur: number) => {
  const S = 360, c = canvas(S, S), g = c.getContext("2d")!;
  if (blur) g.filter = `blur(${blur}px)`;
  const R = S * 0.36, n = 15;
  for (const side of [-1, 1])
    for (let j = 0; j < n; j++) {
      const u = 0.06 + (0.9 * j) / (n - 1);
      const a = ((side < 0 ? 78 + u * 150 : 102 - u * 150) * Math.PI) / 180;
      const x = S / 2 + Math.cos(a) * R, y = S / 2 + 10 + Math.sin(a) * R;
      const a2 = ((side < 0 ? 78 + (u + 0.01) * 150 : 102 - (u + 0.01) * 150) * Math.PI) / 180;
      const tx = Math.cos(a2) * R - Math.cos(a) * R, ty = Math.sin(a2) * R - Math.sin(a) * R;
      const out = j % 2 ? 1 : -1, lean = 0.55, m = Math.hypot(tx, ty) || 1;
      const nx = (-ty / m) * out * side, ny = (tx / m) * out * side;
      const ang = angOf((tx / m) * Math.cos(lean) + nx * Math.sin(lean), (ty / m) * Math.cos(lean) + ny * Math.sin(lean));
      const k = ((S * 0.15) / LEN) * (1 - 0.4 * u);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.scale(k * out * side, k);
      g.fillStyle = gold ? goldFill(g, -60, 0, 60, -500) : "#B8E59A";
      g.fill(LEAF, "evenodd");
      g.fill(STALK);
      g.restore();
    }
  return c;
};
const kitFor = (ctx: CanvasRenderingContext2D, W: number, H: number): Kit => {
  const key = `${W}x${H}`;
  const have = kits.get(key);
  if (have) return have;
  const r = rngOf(3);
  const grain = Array.from({ length: 4 }, () => {
    const c = canvas(256, 256), g = c.getContext("2d")!, im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = r() * 255;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return ctx.createPattern(c, "repeat")!;
  });
  const leafSpr = [0, 1.6, 3.5, 6.5].map((blur) => {
    const c = canvas(90, 150), g = c.getContext("2d")!;
    if (blur) g.filter = `blur(${blur}px)`;
    g.translate(45, 132);
    g.scale(0.22, 0.22);
    g.fillStyle = "#B8E59A";
    g.fill(LEAF, "evenodd");
    g.fill(STALK);
    return c;
  });
  const wreath = { green: [0, 2, 5, 10].map((b) => wreathSprite(false, b)), gold: [0, 2, 5, 10].map((b) => wreathSprite(true, b)) };
  const k = { grain, leafSpr, wreath };
  kits.set(key, k);
  return k;
};

// ── the frame ──────────────────────────────────────────────────────────────
export function drawGrove(ctx: CanvasRenderingContext2D, f: Frame) {
  const { W, H, tall, t } = f;
  const kit = kitFor(ctx, W, H);
  const U = tall ? Math.min(W * 1.1, H * 0.62) : Math.min(W * 1.1, H * 0.95);
  const cx = W / 2, cy = tall ? H * 0.47 : H * 0.42;
  const riverY = cy + U * (tall ? 0.16 : 0.2), baseY = cy + U * 0.34;
  const flow = flowAt(t), chase = chaseOf(t), ran = ranOf(t);

  // the acts, as 0..1 envelopes
  const fadeIn = sm(0.1, 1.6, t);
  const emerge = span(at("dive") + 1.9, at("river") + 0.4, t); // the midrib line grows out of the blur
  const spread = sm(at("dive") + 2.8, at("river") + 2.2, t); // and opens into nine strands
  const hand = sm(at("hand") + 0.5, at("hand") + 1.3, t) * (1 - sm(at("kiss") + 1.0, at("kiss") + 2.6, t));
  const lean = sm(at("kiss") + 0.7, at("kiss") + 1.4, t) * (1 - sm(at("kiss") + 2.2, at("crown") + 1.2, t));
  const crownM = (u: number) => sm(at("crown") + 0.5 + u * 0.7, at("crown") + 1.6 + u * 0.7, t);
  const crown = sm(at("crown") + 1.4, at("crown") + 3.2, t);
  const strandsOut = 1 - sm(at("since") + 1.6, at("chosen") - 0.4, t);
  const beatV = pulse(t, HEART_BEATS);

  // the wreath the branches bend into, worn as a crown
  const R = U * 0.245, sq = mix(1, 0.4, crown), lift = -U * 0.16 * crown;
  const arc = (side: number, u: number, ro: number): P => {
    const a = ((side < 0 ? 72 + u * 162 : 108 - u * 162) * Math.PI) / 180, r = R + ro;
    return [cx + Math.cos(a) * r, cy + lift + Math.sin(a) * r * sq];
  };

  // her strands' three shapes: the river, the tree, the crown
  const river = (s: (typeof strands)[0], u: number): P => {
    const amp = spread * (1 + chase * 0.6);
    const run = Math.sin(u * 9 - flow * 6 + s.ph) * U * 0.012 * chase; // running: a fast wave down her hair
    return [
      mix(-0.22 * W, 1.22 * W, u),
      riverY - U * 0.05 * chase * Math.sin(u * Math.PI) +
        amp * (s.off * U * (0.026 + 0.012 * chase) + Math.sin(u * s.fq * TAU + flow * 1.5 + s.ph) * U * (0.016 + chase * 0.02) + Math.sin(u * 2.2 - flow * 0.6 + s.ph * 2) * U * 0.022 + run),
    ];
  };
  // she stops: the river goes still and dark, and a stem of light grows up out of the ground where she stands
  const riverA = 1 - sm(at("still") - 0.05, at("still") + 1.1, t);
  // the tree grows up out of the ground: first the trunk, where the strands are still one,
  // then her arms, opening as they climb. How far up each strand has reached, 0..1:
  const TRUNK = 0.2;
  const reach =
    TRUNK * span(at("roots") - 0.1, at("roots") + 1.3, t) +
    (1 - TRUNK) * span(at("branches") - 0.35, at("branches") + 1.75, t, (q) => 1 - Math.pow(1 - q, 2.2));
  const tree = (s: (typeof strands)[0], u: number): P => {
    const fan = Math.pow(sm(0.2, 1, u), 1.2);
    const sway = Math.sin(t * 0.5 + u * 2.4 + s.k) * U * 0.007 * u;
    const tremble = lean * Math.sin(t * 31 + s.k * 1.7 + u * 9) * U * 0.004 * u;
    return [
      cx + s.off * U * (0.01 + 0.3 * fan * s.j) + s.off * U * 0.035 * sm(0.72, 1, u) + s.off * U * 0.025 * Math.sin(u * Math.PI * 1.5) + Math.sin(u * 5 + s.ph) * U * 0.006 * u + sway + lean * U * 0.07 * Math.pow(u, 1.6) + tremble,
      baseY - u * U * 0.68 * (0.94 + 0.06 * s.j) + Math.abs(s.off) ** 1.5 * U * 0.11 * fan,
    ];
  };
  const treeBlend = (s: (typeof strands)[0], u: number): P => (t < at("still") ? river(s, u) : tree(s, u));
  const wreathPt = (s: (typeof strands)[0], u: number): P =>
    s.side ? arc(s.side, u, (s.lane - 2.5) * U * 0.0045 * Math.sin(Math.PI * u)) : [cx, cy + lift + R * sq];
  const strandPt = (s: (typeof strands)[0], u: number): P => {
    const p = treeBlend(s, u), m = crownM(u);
    if (m <= 0) return p;
    const q = wreathPt(s, u);
    return [mix(p[0], q[0], m), mix(p[1], q[1], m)];
  };

  const heartPt = treeBlend(strands[4], 0.2);
  const crownTop = tree(strands[4], 0.92);
  const god = keyed(godKeys([(heartPt[0] - cx) / U, (heartPt[1] - cy) / U], [(crownTop[0] - cx) / U, (crownTop[1] - cy) / U]), t);
  const gx = cx + god[1] * U, gy = cy + god[2] * U, gI = god[3] * fadeIn;

  // ── drawing helpers ──
  const glow = (x: number, y: number, r: number, rgb: string, a: number) => {
    if (a <= 0.003 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };
  const line = (pts: P[]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const e = pts[pts.length - 1];
    ctx.lineTo(e[0], e[1]);
  };
  const pose = (p: P, q: P, out: number, leanA: number) => {
    let tx = q[0] - p[0], ty = q[1] - p[1];
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    const nx = -ty * out, ny = tx * out;
    return angOf(tx * Math.cos(leanA) + nx * Math.sin(leanA), ty * Math.cos(leanA) + ny * Math.sin(leanA));
  };
  const leafAt = (x: number, y: number, a: number, k: number, flip: number, alpha: number, g = 1) => {
    if (alpha <= 0.004 || k <= 0 || g <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    // grows from its stalk to its tip: length first, width close behind
    ctx.scale(k * flip * Math.min(1, 0.25 + g * 0.9), k * g);
    ctx.globalAlpha = alpha * Math.min(1, g * 2.5);
    ctx.fill(LEAF, "evenodd");
    ctx.fill(STALK);
    ctx.restore();
  };

  // ── night ──
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#09160F";
  ctx.fillRect(0, 0, W, H);
  const pool = fadeIn * (1 - 0.5 * sm(at("today"), at("today") + 2, t) * (1 - sm(at("free"), at("make"), t)));
  glow(cx, cy, Math.max(W, H) * 0.75, "28,62,43", 0.62 * pool);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++)
    glow(W * (0.5 + 0.36 * Math.sin(t * 0.031 + i * 2.1)), H * (0.5 + 0.26 * Math.cos(t * 0.023 + i * 1.3)), Math.max(W, H) * 0.5, RGB.leaf, 0.026 * fadeIn);
  // the chase warms the dark from the side he comes from
  glow(gx, gy, U * 1.6, RGB.sunHalo, gI * 0.05);

  // motes over the water: in the chase they streak
  for (const m of motes) {
    const tw = Math.pow(Math.max(0, Math.sin(t * 0.7 * m.sp + m.ph)), 4);
    const a = (0.04 + 0.42 * tw) * (0.25 + 0.75 * m.z) * fadeIn;
    if (a < 0.01) continue;
    const px = (((m.x - flow * 0.012 * (0.3 + m.z) + Math.sin(t * 0.2 * m.sp + m.ph) * 0.012) % 1) + 1) % 1;
    const py = (((m.y - t * 0.006 * m.sp) % 1) + 1) % 1;
    const x = px * W, y = py * H, rr = 0.6 + m.z * 1.5;
    const streak = (chase * 0.8 + ran * 1.2) * (0.3 + m.z) * U * 0.04;
    ctx.fillStyle = ctx.strokeStyle = `rgba(${RGB.leaf},${(a * (streak > 2 ? 0.55 : 1)).toFixed(3)})`;
    if (streak > 2) {
      ctx.lineWidth = rr * 0.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + streak, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // the grove's own leaves, falling out of focus
  const groveA = sm(at("leaves") + 0.6, at("leaves") + 3, t) * (1 - 0.6 * sm(at("chosen"), at("today"), t)) + 0.6 * sm(at("outro"), at("outro") + 2, t) * (f.ownEnding ? 1 : 0);
  if (groveA > 0.01)
    for (const d of drift) {
      const fall = ((d.y + t * 0.011 * d.sp) % 1.2) - 0.1;
      const x = (d.x + Math.sin(t * 0.33 * d.sp + d.sw) * 0.03) * W, y = fall * H, k = ((0.45 + d.z * 0.95) * U) / 820;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.r + t * d.vr * 0.25);
      ctx.globalAlpha = (0.05 + d.z * 0.16) * groveA;
      ctx.drawImage(kit.leafSpr[Math.min(3, Math.floor(Math.abs(d.z - 0.45) * 7.5))], -45 * k, -132 * k, 90 * k, 150 * k);
      ctx.restore();
    }
  ctx.globalAlpha = 1;

  // ── her roots, finding their way down ──
  const rootsA = sm(at("roots") - 0.2, at("roots") + 0.4, t) * (1 - sm(at("crown") + 0.4, at("crown") + 2.4, t));
  if (rootsA > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const r of roots) {
      const g = span(at("roots") + r.delay * 1.4, at("roots") + 1.6 + r.delay * 1.4, t);
      const n = Math.floor(g * (r.pts.length - 1));
      if (n < 1) continue;
      for (let i = 0; i < n; i++) {
        const a0 = r.pts[i], a1 = r.pts[i + 1], d = i / (r.pts.length - 1);
        ctx.strokeStyle = `rgba(${RGB.leaf},${(rootsA * 0.5 * (1 - d * 0.85)).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.6, r.w * 2.4 * (1 - d * 0.8));
        ctx.beginPath();
        ctx.moveTo(cx + a0[0] * U, baseY + a0[1] * U);
        ctx.lineTo(cx + a1[0] * U, baseY + a1[1] * U);
        ctx.stroke();
      }
    }
    // where she stands: a faint pool where her feet went into the ground
    glow(cx, baseY, U * 0.18, RGB.leaf, rootsA * 0.06);
    ctx.globalCompositeOperation = "source-over";
  }

  // ── her heart, under the bark: Bloom, the film's only pink ──
  if (hand > 0.005) {
    ctx.globalCompositeOperation = "lighter";
    glow(heartPt[0], heartPt[1], U * 0.45, RGB.bloom, hand * (0.08 + 0.16 * beatV));
    glow(heartPt[0], heartPt[1], U * (0.075 + 0.035 * beatV), RGB.bloom, hand * (0.34 + 0.5 * beatV));
    ctx.globalCompositeOperation = "source-over";
  }

  // ── her strands ──
  const lineA = fadeIn * strandsOut * Math.min(1, emerge * 1.6);
  if (lineA > 0.005) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    // the far river, fainter and slower, only while she is water
    const farA = spread * riverA * lineA;
    if (farA > 0.01)
      for (const s of far) {
        const pts: P[] = [];
        for (let i = 0; i <= 48; i++) {
          const u = i / 48;
          pts.push([mix(-0.22 * W, 1.22 * W, u), riverY - U * (0.1 + s.y * 0.14) + Math.sin(u * s.fq * TAU + flow * 0.9 + s.ph) * U * 0.02 + s.off * U * 0.01]);
        }
        line(pts);
        ctx.strokeStyle = `rgba(${RGB.leaf},${(farA * 0.05).toFixed(3)})`;
        ctx.lineWidth = Math.max(4, U * 0.012);
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.strokeStyle = `rgba(${RGB.leaf},${(farA * 0.16).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    const lo = 0.5 - emerge * 0.74, hi = 0.5 + emerge * 0.74;
    const NP = 72;
    const sets: { tree: boolean; a: number }[] = [];
    if (t < at("still") + 1.2) sets.push({ tree: false, a: riverA });
    if (t > at("roots") - 0.1) sets.push({ tree: true, a: 1 });
    for (const set of sets)
    for (const s of strands) {
      const a = set.a * (0.36 + 0.26 * (1 - s.lane / 4)) * lineA * (s.side ? 1 : 1 - sm(at("crown") + 0.6, at("crown") + 1.6, t)) * (1 + hand * beatV * 0.35) * (1 + chase * 0.25);
      if (a <= 0.005) continue;
      const pts: P[] = [];
      for (let i = 0; i <= NP; i++) {
        const u = i / NP;
        if (set.tree) {
          if (u > reach) {
            pts.push(strandPt(s, reach));
            break;
          }
          pts.push(strandPt(s, u));
        } else {
          if (u < lo - 0.02 || u > hi + 0.02) continue;
          pts.push(river(s, u));
        }
      }
      if (pts.length < 3) continue;
      line(pts);
      const rv = set.tree ? 0 : 1; // the river glows a little more than the tree
      ctx.strokeStyle = `rgba(${RGB.leaf},${(a * (0.07 + 0.05 * rv)).toFixed(3)})`;
      ctx.lineWidth = Math.max(5, U * (0.014 + 0.008 * rv));
      ctx.lineCap = "round";
      ctx.stroke();
      // the hairline, lit by the god's light where he is near, and by her heart
      let core: string | CanvasGradient = `rgba(${RGB.leaf},${Math.min(1, a * 0.78).toFixed(3)})`;
      if (gI > 0.02) {
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, U * 0.55);
        rg.addColorStop(0, `rgba(${RGB.sun},${Math.min(1, a * 1.1 * gI).toFixed(3)})`);
        rg.addColorStop(1, core);
        core = rg;
      }
      if (hand > 0.01) {
        const rg = ctx.createRadialGradient(heartPt[0], heartPt[1], 0, heartPt[0], heartPt[1], U * (0.14 + 0.18 * beatV));
        rg.addColorStop(0, `rgba(${RGB.bloom},${Math.min(1, a * 0.9 * hand * (0.7 + 0.3 * beatV)).toFixed(3)})`);
        rg.addColorStop(1, typeof core === "string" ? core : `rgba(${RGB.leaf},${Math.min(1, a * 0.78).toFixed(3)})`);
        core = rg;
      }
      ctx.strokeStyle = core;
      ctx.lineWidth = 0.9 + (1 - s.lane / 4) * 0.8 + emerge * 0 + (1 - spread) * 1.2;
      ctx.lineCap = "butt";
      ctx.stroke();
    }
    // where her arms are still climbing, a little light at each tip
    // (softer while the tips are still bundled in the trunk, so they read as a bud, not a lamp)
    const climbing = t > at("roots") - 0.1 ? (1 - sm(0.9, 1, reach)) * mix(0.45, 1, sm(TRUNK, TRUNK + 0.15, reach)) : 0;
    if (climbing > 0.01)
      for (const s of strands) {
        const p = strandPt(s, reach);
        glow(p[0], p[1], U * 0.035, RGB.leaf, climbing * 0.22 * (1 - s.lane / 6));
        glow(p[0], p[1], U * 0.008, RGB.sun, climbing * 0.5 * (1 - s.lane / 6));
      }
    // the line's birth: where the midrib comes out of the blur, a little light
    glow(cx, riverY, U * 0.3, RGB.leaf, (emerge > 0 && emerge < 1 ? Math.sin(emerge * Math.PI) : 0) * 0.16);
    ctx.globalCompositeOperation = "source-over";
  }

  // ── her leaves: one a frame, from the stalk; they bend into the crown ──
  ctx.fillStyle = "#B8E59A";
  const echo: [number, number, number, number, number][] = [];
  const leavesOut = 1 - sm(at("since") + 1.6, at("chosen") + 0.4, t);
  if (t > at("leaves") - 0.1 && leavesOut > 0.005)
    for (const l of leaves) {
      const start = at("leaves") + l.order / 24;
      const g = span(start, start + 0.45, t);
      if (g <= 0) continue;
      const s = strands[l.k];
      const p1 = treeBlend(s, l.ut), p2 = treeBlend(s, Math.min(1, l.ut + 0.012));
      let x = p1[0], y = p1[1], a = pose(p1, p2, l.out, 0.72), k = ((U * 0.07) / LEN) * (1 - 0.32 * l.t);
      const flip = l.out;
      const uw = 0.05 + 0.93 * l.t, mw = crownM(uw);
      if (mw > 0) {
        const q1 = arc(l.side, uw, 0), q2 = arc(l.side, Math.min(1, uw + 0.01), 0);
        x = mix(x, q1[0], mw);
        y = mix(y, q1[1], mw);
        a = mixA(a, pose(q1, q2, l.out * l.side, 0.52), mw);
        k = mix(k, ((U * 0.088) / LEN) * (1 - 0.45 * l.t), mw);
      }
      k *= 1 + hand * beatV * 0.025;
      a += Math.sin(t * 1.1 + l.sway) * 0.035 * (1 - mw * 0.6) + lean * Math.sin(t * 27 + l.sway * 3) * 0.12;
      if (mw > 0.5) echo.push([x, y, a, k, flip]);
      leafAt(x, y, a, k, flip, 0.94 * leavesOut, g);
    }
  // her heart shows through the leaves too
  if (hand > 0.005) {
    ctx.globalCompositeOperation = "lighter";
    glow(heartPt[0], heartPt[1], U * (0.05 + 0.03 * beatV), RGB.bloom, hand * (0.25 + 0.45 * beatV));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#B8E59A";
  }
  // every laurel since: the crown's echoes, rippling out through time
  for (let e = 0; e < 5; e++) {
    const q = sm(at("since") - 0.4 + e * 0.32, at("since") + 1.6 + e * 0.32, t);
    if (q <= 0 || q >= 1) continue;
    const s2 = 1 + q * 2.3, al = 0.22 * (1 - q) * sm(0, 0.1, q), oy = cy + lift;
    for (const [x, y, a, k, flip] of echo) leafAt(cx + (x - cx) * s2, oy + (y - oy) * s2, a, k * (1 + q * 0.5), flip, al);
  }
  ctx.globalAlpha = 1;

  // ── the field of crowns, receding through two thousand years of dark ──
  const fieldA = sm(at("since") + 0.8, at("since") + 2.6, t) * (1 - sm(at("today") + 1.4, at("today") + 3.4, t));
  if (fieldA > 0.005) {
    const t0 = at("since") + 0.8;
    // the camera drifts forward through them, slowing as they turn to gold
    const travel = (t - t0) * 0.075 - sm(at("today"), at("today") + 3, t) * 0.08;
    const sorted = field.map((w) => ({ w, z: (((w.z0 - travel) % 1) + 1) % 1 })).sort((a, b) => b.z - a.z);
    for (const { w, z } of sorted) {
      const d = 0.25 + z * 2.6;
      const x = cx + (w.X * U * 0.8) / d, y = cy - U * 0.05 + (w.Y * U * 0.55) / d;
      const size = (U * 0.3 * w.s) / d;
      const near = sm(0.0, 0.12, z), farF = 1 - sm(0.7, 1, z);
      const blurI = Math.min(3, Math.floor(z < 0.18 ? (0.18 - z) * 18 : (z - 0.45) * 5.5 > 0 ? (z - 0.45) * 5.5 : 0));
      const goldT = sm(at("today") + w.gold * 1.8, at("today") + 0.5 + w.gold * 1.8, t);
      const al = fieldA * near * farF * (0.6 - z * 0.45);
      if (al < 0.01) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(w.rot);
      if (goldT < 1) {
        ctx.globalAlpha = al * (1 - goldT);
        ctx.drawImage(kit.wreath.green[blurI], -size / 2, -size / 2, size, size);
      }
      if (goldT > 0) {
        ctx.globalAlpha = al * goldT;
        ctx.drawImage(kit.wreath.gold[blurI], -size / 2, -size / 2, size, size);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ── the god's light ──
  if (gI > 0.005) {
    ctx.globalCompositeOperation = "lighter";
    const flick = 1 + 0.04 * Math.sin(t * 13.1) + 0.03 * Math.sin(t * 7.3 + 1);
    glow(gx, gy, U * 0.95, RGB.sunHalo, gI * 0.09 * flick);
    glow(gx, gy, U * 0.34, RGB.sunHalo, gI * 0.2 * flick);
    glow(gx, gy, U * 0.075, RGB.sun, gI * 0.8 * (1 - hand * 0.55));
    glow(gx, gy, U * 0.022, "255,255,255", gI * (1 - hand * 0.6));
    // an anamorphic streak, as a lens draws a bright light in the dark
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, 0.03);
    glow(0, 0, U * 0.8, RGB.sun, gI * 0.3);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  // ── the ending we draw ourselves, until the sting takes over ──
  if (f.ownEnding && t > at("outro") - 0.6) drawEnding(ctx, f, U, cx, cy, leafAt, glow);

  // ── the edges of the frame, and grain ──
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(cx, H * 0.44, U * 0.2, cx, H * 0.44, Math.hypot(W, H) * 0.6);
  vg.addColorStop(0, "rgba(4,11,7,0)");
  vg.addColorStop(1, "rgba(4,11,7,.9)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = kit.grain[Math.floor(t * 12) % 4];
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  // from black
  if (t < 0.6) {
    ctx.fillStyle = `rgba(9,22,15,${(1 - sm(0, 0.6, t)).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// The film's own last five seconds: her heart beats once in the gold, the leaves
// come alive and fall, all but two, and the two hold her name. The intro/outro
// sting tells the same moment; once it's rendered, the film cuts to it instead.
export const endingTimes = () => {
  const lub = beat(84);
  return { lub, fall: lub + 0.25, travel: lub + 0.7, letters: lub + 1.45, tagline: lub + 2.25, url: lub + 2.9, leaf: lub + 2.6 };
};
export const logoBox = (W: number, H: number, tall: boolean) => {
  const w = tall ? W * 0.8 : Math.min(W * 0.5, 980);
  const sc = w / (LOGO.box[2] - LOGO.box[0]);
  const cy = tall ? H * 0.43 : H * 0.44;
  const lx = W / 2 - ((LOGO.box[0] + LOGO.box[2]) / 2) * sc, ly = cy - ((LOGO.box[1] + LOGO.box[3]) / 2) * sc;
  return { sc, lx, ly, bottom: ly + LOGO.box[3] * sc, w };
};
function drawEnding(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  U: number,
  cx: number,
  cy: number,
  leafAt: (x: number, y: number, a: number, k: number, flip: number, alpha: number, g?: number) => void,
  glow: (x: number, y: number, r: number, rgb: string, a: number) => void,
) {
  const { W, H, tall, t } = f;
  const E = endingTimes();
  const lubs = [0, 1, 2, 3, 4].map((i) => beat(84 + i));
  const bt = pulse(t, lubs);
  const alive = sm(E.lub - 0.04, E.lub + 0.2, t);
  if (alive <= 0) return;
  // the wreath, where the gold laurel was (the laurel on screen is about this size)
  const lh = tall ? W * 0.66 : H * 0.62;
  const R = lh * 0.42, ox = cx, oy = (tall ? H * 0.47 : H * 0.46) + lh * 0.03;
  const arc = (side: number, u: number): P => {
    const a = ((side < 0 ? 80 + u * 152 : 100 - u * 152) * Math.PI) / 180;
    return [ox + Math.cos(a) * R * 0.86, oy + Math.sin(a) * R];
  };
  const { sc, lx, ly } = logoBox(W, H, tall);
  const target = (side: number) => {
    const P0 = side < 0 ? LOGO.A0 : LOGO.Z0;
    return { x: lx + P0[0] * sc, y: ly + P0[1] * sc, a: 0, k: ((LOGO.A0[1] - LOGO.A1[1]) * sc) / LEN, flip: side < 0 ? -1 : 1 };
  };
  const logoOn = sm(E.travel + 0.75, E.travel + 0.95, t);
  ctx.fillStyle = "#B8E59A";
  const n = 13;
  const r = rngOf(29);
  for (const side of [-1, 1])
    for (let j = 0; j < n; j++) {
      const seed = r(), u = 0.04 + (0.92 * j) / (n - 1);
      const p1 = arc(side, u), p2 = arc(side, Math.min(1, u + 0.01));
      const out = j % 2 ? 1 : -1;
      let tx = p2[0] - p1[0], ty = p2[1] - p1[1];
      const m = Math.hypot(tx, ty) || 1;
      tx /= m;
      ty /= m;
      const nx = -ty * out * side, ny = tx * out * side, lean = 0.55;
      let a = angOf(tx * Math.cos(lean) + nx * Math.sin(lean), ty * Math.cos(lean) + ny * Math.sin(lean));
      let x = p1[0], y = p1[1], k = ((lh * 0.15) / LEN) * (1 - 0.4 * u) * (1 + bt * 0.03), flip = out * side, alpha = alive;
      if (j === 6) {
        const c = sm(E.travel, E.travel + 0.95, t);
        const tg = target(side);
        x = mix(x, tg.x, c);
        y = mix(y, tg.y, c);
        a = mixA(a, tg.a, c);
        k = mix(k, tg.k, c);
        flip = mix(flip, tg.flip, c);
        alpha *= 1 - logoOn;
      } else {
        const fp = sm(E.fall + seed * 0.55, E.fall + 0.75 + seed * 0.55, t);
        if (fp > 0) {
          y += fp * fp * H * 0.85;
          x += Math.sin(t * 0.9 + seed * 9) * fp * U * 0.08;
          a += fp * (seed - 0.5) * 5;
          alpha *= 1 - sm(0.45, 1, fp);
        }
      }
      leafAt(x, y, a, k, flip, alpha);
    }
  // her name, held in the two leaves that stayed. It keeps her heartbeat, barely.
  if (logoOn > 0) {
    const br = 1 + bt * 0.0045;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(br, br);
    ctx.translate(-W / 2, -cy);
    ctx.translate(lx, ly);
    ctx.scale(sc, sc);
    ctx.globalAlpha = logoOn;
    ctx.fillStyle = "#B8E59A";
    ctx.fill(LOGO.L, "evenodd");
    ctx.fill(LOGO.LS);
    ctx.fill(LOGO.R, "evenodd");
    ctx.fill(LOGO.RS);
    ctx.fillStyle = "#F3F6EF";
    LOGO.letters.forEach((L, i) => {
      const q = sm(E.letters + i * (2 / 24), E.letters + i * (2 / 24) + 0.32, t);
      if (q <= 0) return;
      ctx.globalAlpha = q;
      ctx.save();
      ctx.translate(L.x, (1 - q) * 70);
      ctx.fill(L.p);
      ctx.restore();
    });
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // one leaf lets go, the only exit we use
  const lf = clamp((t - E.leaf) / 3.2);
  if (lf > 0 && lf < 1) {
    const x = W * 0.68 + Math.sin(lf * 5.2) * U * 0.05, y = -H * 0.05 + lf * H * 1.1;
    leafAt(x, y, 0.6 + Math.sin(lf * 4.1) * 0.9, (U * 0.05) / LEN, 1, 0.55 * sm(0, 0.1, lf));
  }
  void glow;
}
