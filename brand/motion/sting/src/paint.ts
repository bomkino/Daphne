// The sting, painted on two canvases a frame at a time. Everything is a pure
// function of the time in seconds, so Remotion can render frames in any order,
// in any tab, and get the same picture.
//
// The story: a gold festival laurel sits in the dark. Her heart beats once
// under it, and life runs up the branches: the metal turns to living leaves.
// On the next beat they let go and fall, all but two. Those two unbend into
// the logo's brackets, and her name rises between them.
import laurel from "./data/laurel.json";
import logo from "./data/logo.json";
import timeline from "./timeline.json";
import { leafBracket, type LeafOpts } from "./leaf";
import type { Layout } from "./layout";

export type Ending = "intro" | "outro";
type Pt = [number, number];

const EV = timeline.events as unknown as Record<string, [number, number]>;
const C = logo.colors;
const LEAF_BASE = { N: 64, ...logo.LEAF } as LeafOpts;

// ── small math ───────────────────────────────────────────────────────────────
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const span = (name: string, t: number) => clamp((t - EV[name][0]) / (EV[name][1] - EV[name][0]));

// CSS cubic-bezier, solved for x by Newton's method
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const fx = ((ax * u + bx) * u + cx) * u - x;
      const d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(d) < 1e-6) break;
      u -= fx / d;
    }
    u = clamp(u);
    return ((ay * u + by) * u + cy) * u;
  };
}
// The brand's two curves: growth is quick to start and long to settle; words settle.
const grow = bezier(0.2, 0.7, 0.1, 1);
const settle = bezier(0.33, 0, 0.15, 1);
const inOut = bezier(0.45, 0, 0.25, 1);

// seeded, so every render is the same grove
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── her heart ─────────────────────────────────────────────────────────────
// 52 beats a minute, lub-dub. beats() is 0 between beats and about 1 on a lub.
const PERIOD = 60 / timeline.heart.bpm;
export const lubs = [0, 1, 2, 3].map((n) => timeline.heart.first + n * PERIOD);
const pulse = (t: number, at: number) => {
  const p = t - at;
  if (p < -0.2 || p > 0.9) return 0;
  return Math.exp(-Math.pow(p / 0.06, 2)) + 0.55 * Math.exp(-Math.pow((p - timeline.heart.dub) / 0.075, 2));
};

// ── the shapes, built once per tab ──────────────────────────────────────────
type Leaf = (typeof laurel.leaves)[number];
type Faller = {
  leaf: Leaf;
  side: number; // -1 left branch, 1 its mirror
  release: number;
  vT: number; // terminal fall, in heights a second
  tau: number;
  vx: number; // the breath that pushes it out, in widths a second
  swayA: number;
  swayW: number;
  swayPh: number;
  rotA: number;
  spin: number;
  flipW: number;
  flipAmt: number;
  dz: number; // toward the lens (+) or away (-), a second
  r: number; // the farthest the leaf reaches from its middle, in laurel units
};
type Shapes = {
  leaf: Path2D[];
  shade: Path2D[];
  stem: Path2D;
  glyphs: Path2D[];
  fallers: Faller[];
  chosen: number;
  motes: { x: number; y: number; z: number; ph: number; sp: number }[];
  bokeh: { x: number; y: number; r: number; k: number; a: number; sp: number; ph: number }[];
  grain: HTMLCanvasElement[];
};
let shapes: Shapes | null = null;

// how far a leaf reaches from the middle of its spine, whichever way it turns
function reachOf(l: Leaf) {
  const c = [(l.base[0] + l.tip[0]) / 2, (l.base[1] + l.tip[1]) / 2];
  const [x0, y0, x1, y1] = l.bbox;
  return Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
}

function build(): Shapes {
  const R = rng(20261031);
  const L = laurel.leaves;
  // the two that stay: the outer leaf nearest the middle of each branch, standing
  // closest to upright, as the logo's leaves do
  let chosen = 0;
  let bestD = Infinity;
  L.forEach((l, i) => {
    if (l.row !== "outer") return;
    const d = Math.abs(l.t - 0.5);
    if (d < bestD) {
      bestD = d;
      chosen = i;
    }
  });
  const fallers: Faller[] = [];
  for (const side of [-1, 1])
    L.forEach((leaf, i) => {
      if (i === chosen) return;
      // the tips let go first; the last ones down near the stems
      const release = mix(EV.release[0], EV.release[1] - 0.12, 1 - leaf.t) + (R() - 0.5) * 0.12;
      const front = R() < 0.3;
      fallers.push({
        leaf,
        side,
        release,
        vT: mix(0.2, 0.36, R()),
        tau: mix(0.28, 0.5, R()),
        vx: side * mix(0.04, 0.2, R()) * (leaf.row === "outer" ? 1.2 : 0.8),
        swayA: mix(0.01, 0.032, R()),
        swayW: mix(1.8, 3.6, R()),
        swayPh: R() * 6.283,
        rotA: mix(0.25, 0.8, R()),
        spin: (R() - 0.5) * 1.8,
        flipW: mix(1.2, 3.4, R()),
        flipAmt: mix(0.35, 1, R()),
        dz: front ? mix(0.18, 0.42, R()) : -mix(0.02, 0.28, R()),
        r: reachOf(leaf),
      });
    });
  const motes = Array.from({ length: 80 }, () => ({ x: R(), y: R(), z: R(), ph: R() * 6.283, sp: 0.3 + R() * 0.7 }));
  const bokeh = Array.from({ length: 7 }, () => ({ x: R(), y: R(), r: R() * 6.283, k: mix(0.7, 1.4, R()), a: mix(0.05, 0.11, R()), sp: mix(0.6, 1.4, R()), ph: R() * 6.283 }));
  // four frames of film grain, seeded
  const grain = Array.from({ length: 4 }, (_, n) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const im = g.createImageData(256, 256);
    const r2 = rng(97 + n);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 128 + (r2() + r2() + r2() - 1.5) * 120;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  });
  return {
    leaf: L.map((l) => new Path2D(l.d)),
    shade: L.map((l) => new Path2D(l.shade)),
    stem: new Path2D(laurel.stem),
    glyphs: logo.glyphs.map((g) => new Path2D(g.d)),
    fallers,
    chosen,
    motes,
    bokeh,
    grain,
  };
}

// ── color ──────────────────────────────────────────────────────────────────
const NEW_LEAF = C.newLeaf;
const PAPER = C.paper;
const G = "184,229,154"; // New leaf, for light
const PK = "245,156,192"; // Bloom, her heart
const NIGHT = "#07130D";

function goldFill(ctx: CanvasRenderingContext2D, l: Leaf) {
  const [x0, y0, x1, y1] = l.bbox;
  const [ax, ay, bx, by] = laurel.goldAxis;
  const g = ctx.createLinearGradient(mix(x0, x1, ax), mix(y0, y1, ay), mix(x0, x1, bx), mix(y0, y1, by));
  for (const [o, c] of laurel.gold as [number, string][]) g.addColorStop(o, c);
  return g;
}
// where a point sits along the light's diagonal sweep, lower left to upper right (laurel units)
const shimmerProj = (x: number, y: number) => (x * 0.55 - y) / 115;
const DEEP = ["#7FBE68", "#8ECB76", "#76B562", "#88C672", "#93CF7B"];
function greenFill(ctx: CanvasRenderingContext2D, l: Leaf) {
  // living leaves, no two quite alike: deeper at the stalk, New leaf at the tip
  // (in the authored, left-branch coordinates)
  const g = ctx.createLinearGradient(l.base[0], l.base[1], l.tip[0], l.tip[1]);
  g.addColorStop(0, DEEP[Math.round(l.t * 37) % DEEP.length]);
  g.addColorStop(1, NEW_LEAF);
  return g;
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  if (a <= 0.003 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
  g.addColorStop(0.45, `rgba(${rgb},${(a * 0.35).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}

// ── where things sit ───────────────────────────────────────────────────────
// The camera eases in on the laurel while it lives, and stops before the name arrives.
const camera = (t: number) => 1 + 0.05 * inOut(clamp(t / 2.4));
const laurelToScreen = (Lo: Layout, t: number, p: Pt, side = -1): Pt => {
  const k = Lo.laurel.s * camera(t);
  const x = side < 0 ? p[0] : -p[0];
  return [Lo.laurel.cx + x * k, Lo.laurel.cy + p[1] * k];
};
const logoToScreen = (Lo: Layout, p: Pt): Pt => {
  const b = logo.box;
  return [Lo.logo.cx + (p[0] - (b[0] + b[2]) / 2) * Lo.logo.s, Lo.logo.cy + (p[1] - (b[1] + b[3]) / 2) * Lo.logo.s];
};

// The life front, in laurel units: it rises from under the stems to past the tips.
const lifeY = (t: number) => mix(laurel.viewBox[1] + laurel.viewBox[3] + 6, laurel.viewBox[1] - 10, inOut(span("life", t)));
const leafLife = (l: Leaf, t: number) => {
  const cy = (l.base[1] + l.tip[1]) / 2;
  return sm(cy + 10, cy - 10, lifeY(t));
};

// a breath of wind in each leaf once it's alive, about its stalk
const swayOf = (l: Leaf, i: number, side: number, t: number) => leafLife(l, t) * Math.sin(t * 2.1 + i * 0.7 + (side > 0 ? 1.3 : 0)) * 0.035;

// ── the frame ──────────────────────────────────────────────────────────────
export function paint(back: CanvasRenderingContext2D, front: CanvasRenderingContext2D, Lo: Layout, t: number, ending: Ending) {
  if (!shapes) shapes = build();
  const S = shapes;
  const { W, H } = Lo;
  const U = Math.min(W, H);
  const life = span("life", t);
  const wake = sm(0.4, 1.6, t); // the grove around her comes up with the life
  const heart = pulse(t, lubs[0]);

  for (const ctx of [back, front]) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
  }
  front.clearRect(0, 0, W, H);

  // night, and a pool of light where the laurel stands
  const ctx = back;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, Lo.laurel.cx, Lo.laurel.cy, Math.hypot(W, H) * 0.62, "26,58,40", mix(0.5, 0.85, wake));
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 3; i++)
    glow(ctx, W * (0.5 + 0.34 * Math.sin(t * 0.21 + i * 2.1)), H * (0.5 + 0.24 * Math.cos(t * 0.17 + i * 1.3)), Math.max(W, H) * 0.5, G, 0.02 * wake);
  ctx.globalCompositeOperation = "source-over";

  // one shaft of light from above, falling on the laurel
  {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = mix(0.66, 1, wake);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(shaftOf(Lo), Math.sin(t * 0.3) * U * 0.01, 0, W, H);
    ctx.restore();
  }
  // the metal's own warmth, while it's gold
  {
    const gold = 1 - life;
    if (gold > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, Lo.laurel.cx, Lo.laurel.cy, Lo.laurel.s * 150, "201,154,66", 0.075 * gold);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // the grove: big leaves far out of focus, drifting at the edges of the frame
  for (const b of S.bokeh) {
    const a = b.a * wake;
    if (a < 0.004) continue;
    const x = (b.x < 0.5 ? b.x * 0.3 : 0.7 + b.x * 0.3) * W + Math.sin(t * 0.4 * b.sp + b.ph) * U * 0.02;
    const y = ((b.y + t * 0.025 * b.sp) % 1.15 - 0.07) * H;
    drawLeafShape(ctx, S.leaf[3], laurel.leaves[3], x, y, b.r + t * 0.12 * (b.sp - 1), (U / 110) * b.k, 1, `rgba(${G},${a.toFixed(3)})`, Math.round(U * 0.018));
  }

  // motes, lit by the life
  ctx.globalCompositeOperation = "lighter";
  for (const m of S.motes) {
    const tw = Math.pow(Math.max(0, Math.sin(t * 1.3 * m.sp + m.ph)), 3);
    const a = (0.05 + 0.4 * tw) * (0.3 + 0.7 * m.z) * wake;
    if (a < 0.01) continue;
    const y = ((((m.y - t * 0.012 * m.sp) % 1) + 1) % 1) * H;
    const x = (m.x + Math.sin(t * 0.35 * m.sp + m.ph) * 0.01) * W;
    ctx.fillStyle = `rgba(${G},${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, (0.6 + m.z * 1.6) * (U / 1080), 0, 6.283);
    ctx.fill();
  }

  // her heart, under the bark: the only pink in the film, on the first beat
  const heartAt = laurelToScreen(Lo, t, [0, laurel.stemBox[3] + 4]);
  const heartIn = sm(lubs[0] - 0.3, lubs[0], t) * (1 - sm(lubs[0] + 0.3, lubs[0] + 0.75, t));
  if (heartIn > 0.01) {
    const k = Lo.laurel.s;
    // a faint ember first, then the beat: a wide bloom of light and a bright core
    glow(ctx, heartAt[0], heartAt[1], k * 95, PK, (0.05 + 0.13 * heart) * heartIn);
    glow(ctx, heartAt[0], heartAt[1], k * (22 + 8 * heart), PK, (0.12 + 0.5 * heart) * heartIn);
    glow(ctx, heartAt[0], heartAt[1], k * (7 + 3 * heart), "255,214,230", (0.06 + 0.32 * heart) * heartIn);
  }
  ctx.globalCompositeOperation = "source-over";

  // ── the laurel, while it's whole ──
  const k = Lo.laurel.s * camera(t);
  const yL = lifeY(t);
  const shimmerAt = mix(-1.3, 1.5, inOut(span("shimmer", t)));
  const stemGone = sm(EV.stemGone[0], EV.stemGone[1], t);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(Lo.laurel.cx, Lo.laurel.cy);
    ctx.scale(side < 0 ? k : -k, k); // the left branch as authored; the right is its mirror
    // the stem: gold above the life, green below it, then it fades as the leaves go
    if (stemGone < 1) {
      const a = 1 - stemGone;
      const vb = laurel.viewBox;
      ctx.save();
      ctx.beginPath();
      ctx.rect(vb[0] - 20, vb[1] - 20, vb[2] + 40, yL - vb[1] + 20);
      ctx.clip();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#c99a42";
      ctx.fill(S.stem);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(vb[0] - 20, yL, vb[2] + 40, vb[3] + 40);
      ctx.clip();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#8ECB76";
      ctx.fill(S.stem);
      ctx.restore();
    }
    laurel.leaves.forEach((l, i) => {
      const isChosen = i === S.chosen;
      const fl = S.fallers.find((f) => f.leaf === l && f.side === side);
      if (fl && t >= fl.release) return; // it's falling now; drawn below
      if (isChosen && t >= EV.chosen[0]) return;
      const g = leafLife(l, t);
      const dim = l.row === "inner" ? laurel.innerOpacity : 1;
      const sway = swayOf(l, i, side, t);
      ctx.save();
      ctx.translate(l.base[0], l.base[1]);
      ctx.rotate(sway);
      ctx.translate(-l.base[0], -l.base[1]);
      if (g < 1) {
        ctx.globalAlpha = dim;
        ctx.fillStyle = goldFill(ctx, l);
        ctx.fill(S.leaf[i], "evenodd");
        // light crossing the metal
        const band = Math.exp(-Math.pow((shimmerProj(l.base[0] * -side, l.base[1]) - shimmerAt) / 0.3, 2));
        if (band > 0.01) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.45 * band * dim;
          ctx.fillStyle = "#fff1c2";
          ctx.fill(S.leaf[i], "evenodd");
          ctx.globalCompositeOperation = "source-over";
        }
      }
      if (g > 0) {
        ctx.globalAlpha = g * dim;
        ctx.fillStyle = greenFill(ctx, l);
        ctx.fill(S.leaf[i], "evenodd");
        // the moment it turns, it catches the light
        const flash = Math.sin(Math.PI * g);
        if (flash > 0.02) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.32 * flash * dim;
          ctx.fillStyle = "#D8F7C4";
          ctx.fill(S.leaf[i], "evenodd");
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalAlpha = 0.3 * dim;
      ctx.fillStyle = "#000";
      ctx.fill(S.shade[i], "evenodd");
      ctx.restore();
    });
    ctx.restore();
  }

  // the sap: two points of light that climb the stems with the life
  if (life > 0 && life < 1) {
    ctx.globalCompositeOperation = "lighter";
    const a = Math.sin(Math.PI * life);
    for (const side of [-1, 1]) {
      const sx = stemXAt(yL);
      if (sx === null) continue;
      const p = laurelToScreen(Lo, t, [sx, yL], side);
      glow(ctx, p[0], p[1], k * 26, G, 0.32 * a);
      glow(ctx, p[0], p[1], k * 6, "236,255,224", 0.55 * a);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // the festival's words: the life passes them and they go, like breath on glass
  for (const w of laurel.texts) {
    const gone = sm(w.y + 8, w.y - 14, yL);
    const a = 1 - gone;
    if (a <= 0.003) continue;
    ctx.save();
    ctx.translate(Lo.laurel.cx, Lo.laurel.cy);
    ctx.scale(k, k);
    ctx.globalAlpha = a;
    ctx.filter = gone > 0.02 ? `blur(${(gone * 2.2 * k).toFixed(2)}px)` : "none";
    ctx.font = `${w.weight} ${w.size}px Figtree`;
    ctx.letterSpacing = `${w.spacing}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = w.fill;
    ctx.fillText(w.text, w.x, w.y - gone * 5);
    const band = Math.exp(-Math.pow((shimmerProj(w.x, w.y) - shimmerAt) / 0.3, 2));
    if (band > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.35 * band * a;
      ctx.fillStyle = "#fff1c2";
      ctx.fillText(w.text, w.x, w.y - gone * 5);
    }
    ctx.restore();
  }

  // ── the leaves that fall ──
  for (const f of S.fallers) {
    if (t < f.release) continue;
    const s = fallState(Lo, f, t);
    // A gate, not a guideline: in the last second's hold, nothing is still falling.
    if (t > EV.fallen[1] && s.a > 0.01 && s.y - f.r * s.k < H)
      throw new Error(`A leaf is still falling in the hold at ${t.toFixed(2)} s, at ${s.x.toFixed(0)}, ${s.y.toFixed(0)}`);
    const target = s.z > 0.06 ? front : back;
    drawFaller(target, S, f, s, Lo);
  }

  // ── light through the leaves: a soft bloom of everything bright so far ──
  bloom(ctx, Lo);

  // ── the lens: vignette and grain, under the logo so it stays clean ──
  {
    const vg = ctx.createRadialGradient(W / 2, H * 0.46, U * 0.25, W / 2, H * 0.46, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, "rgba(4,11,7,0)");
    vg.addColorStop(1, "rgba(4,11,7,0.78)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    const frame = Math.round(t * timeline.fps);
    const pat = ctx.createPattern(S.grain[frame % 4], "repeat");
    if (pat) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = pat;
      ctx.scale(2, 2);
      ctx.translate((frame * 37) % 256, (frame * 71) % 256);
      ctx.fillRect(-256, -256, W / 2 + 512, H / 2 + 512);
      ctx.restore();
    }
  }

  // ── the logo, drawn clean on top ──
  const breath = 1 + 0.0045 * (pulse(t, lubs[2]) + pulse(t, lubs[3]));
  const lc: Pt = [Lo.logo.cx, Lo.logo.cy];
  for (const side of [-1, 1]) drawChosen(ctx, S, Lo, t, side, breath, lc);
  drawName(ctx, S, Lo, t, breath, lc);

  // ── for the intro, the dark it hands over to, over everything ──
  if (ending === "intro") {
    const e = inOut(span("fadeOut", t));
    if (e > 0) {
      front.fillStyle = `rgba(7,19,13,${e.toFixed(3)})`;
      front.fillRect(0, 0, W, H);
    }
  }
}

// The bloom works at a quarter of the frame's size, where a blur is sixteen times
// cheaper, and is laid back on at full size: it's all soft light, so nothing is lost.
const BLOOM_SCALE = 4;
let bloomCanvas: HTMLCanvasElement | null = null;
function bloom(ctx: CanvasRenderingContext2D, Lo: Layout) {
  const { W, H } = Lo;
  const w = Math.ceil(W / BLOOM_SCALE), h = Math.ceil(H / BLOOM_SCALE);
  if (!bloomCanvas || bloomCanvas.width !== w || bloomCanvas.height !== h) {
    bloomCanvas = document.createElement("canvas");
    bloomCanvas.width = w;
    bloomCanvas.height = h;
  }
  const b = bloomCanvas.getContext("2d")!;
  b.globalCompositeOperation = "copy";
  b.filter = `blur(${((Math.min(W, H) * 0.014) / BLOOM_SCALE).toFixed(2)}px)`;
  b.imageSmoothingQuality = "high";
  b.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.32;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bloomCanvas, 0, 0, W, H);
  ctx.restore();
}

// One shaft of light from above, falling on the laurel: drawn once per size, small.
const shafts = new Map<string, HTMLCanvasElement>();
function shaftOf(Lo: Layout) {
  const key = `${Lo.W}x${Lo.H}`;
  const hit = shafts.get(key);
  if (hit) return hit;
  const k = 8, W = Lo.W / k, H = Lo.H / k, U = Math.min(W, H);
  const c = document.createElement("canvas");
  c.width = Math.ceil(W);
  c.height = Math.ceil(H);
  const g = c.getContext("2d")!;
  const a = 0.075;
  const top = -H * 0.05, w0 = U * 0.16, w1 = U * 0.62, cx = Lo.laurel.cx / k, bottom = Lo.laurel.cy / k + U * 0.5;
  const grad = g.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, `rgba(214,240,200,${a})`);
  grad.addColorStop(0.55, `rgba(184,229,154,${a * 0.55})`);
  grad.addColorStop(1, "rgba(184,229,154,0)");
  g.filter = `blur(${(U * 0.05).toFixed(2)}px)`;
  g.beginPath();
  g.moveTo(cx - w0 / 2, top);
  g.lineTo(cx + w0 / 2, top);
  g.lineTo(cx + w1 / 2, bottom);
  g.lineTo(cx - w1 / 2, bottom);
  g.closePath();
  g.fillStyle = grad;
  g.fill();
  shafts.set(key, c);
  return c;
}

// where the left stem crosses a height, in laurel units (null above its tip)
let stemSamples: Pt[] | null = null;
function stemXAt(y: number): number | null {
  if (!stemSamples) {
    const n = (laurel.stem.match(/-?\d*\.?\d+/g) || []).map(Number);
    const pts: Pt[] = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    // the stem is a filled ribbon; its center at a height is the middle of the points near it
    stemSamples = pts;
  }
  const near = stemSamples.filter((p) => Math.abs(p[1] - y) < 3);
  if (!near.length) return null;
  return near.reduce((s, p) => s + p[0], 0) / near.length;
}

// ── falling ──────────────────────────────────────────────────────────────
type FallState = { x: number; y: number; rot: number; flip: number; k: number; z: number; blur: number; a: number };
function fallState(Lo: Layout, f: Faller, t: number): FallState {
  const { W, H } = Lo;
  const tau = t - f.release;
  const ease = 1 - Math.exp(-tau / f.tau);
  const c: Pt = [(f.leaf.base[0] + f.leaf.tip[0]) / 2, (f.leaf.base[1] + f.leaf.tip[1]) / 2];
  // it starts where it hung, with the camera as it was then
  const p0 = laurelToScreen(Lo, f.release, c, f.side);
  const k0 = Lo.laurel.s * camera(f.release);
  const fall = f.vT * H * (tau - f.tau * ease);
  const sway = f.swayA * W * (Math.sin(f.swayW * tau + f.swayPh) - Math.sin(f.swayPh)) * ease;
  const x = p0[0] + f.vx * W * f.tau * ease + sway;
  const y = p0[1] + fall;
  const z = f.dz * tau;
  // depth: nearer leaves grow, pass faster and lose focus
  const depth = 1 / (1 - clamp(z, -0.6, 0.62));
  const cx = W / 2, cy = Lo.laurel.cy;
  const X = cx + (x - cx) * depth, Y = cy + (y - cy) * depth;
  const k = k0 * depth;
  const blur = Math.abs(z) * (z > 0 ? 22 : 9) * (Math.min(W, H) / 1080);
  // Nothing is cut by the frame: a leaf fades into the dark before any of it,
  // or its blur, reaches the top or the sides. Only the bottom lets it go.
  const reach = f.r * k + blur * 2 + 12;
  const edge = sm(0, Math.min(W, H) * 0.07, Math.min(X - reach, W - reach - X, Y - reach));
  // they sink into the dark as they fall, and the last of them are gone by the hold
  const floor = 1 - sm(Lo.laurel.cy + Lo.laurel.s * 70, H * 0.98, Y) * 0.92;
  const hold = 1 - sm(EV.fallen[0], EV.fallen[1], t);
  return {
    x: X,
    y: Y,
    rot: swayOf(f.leaf, laurel.leaves.indexOf(f.leaf), f.side, f.release) + f.rotA * (Math.sin(f.swayW * tau + f.swayPh + 1.1) - Math.sin(f.swayPh + 1.1)) * ease + f.spin * tau,
    // it turns over as it falls, from the face it showed on the branch
    flip: mix(1, Math.cos(f.flipW * tau * ease), f.flipAmt),
    k,
    z,
    blur,
    a: (z < 0 ? 1 - Math.min(0.6, -z * 1.8) : 1) * floor * edge * hold,
  };
}

function drawFaller(ctx: CanvasRenderingContext2D, S: Shapes, f: Faller, s: FallState, Lo: Layout) {
  const i = laurel.leaves.indexOf(f.leaf);
  if (s.y > Lo.H + 200 * s.k || s.x < -400 || s.x > Lo.W + 400) return;
  const dim = f.leaf.row === "inner" ? 0.82 : 1;
  ctx.save();
  if (s.blur > 0.4) ctx.filter = `blur(${s.blur.toFixed(1)}px)`;
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot * -f.side);
  ctx.scale(s.k * (f.side > 0 ? -1 : 1) * (Math.abs(s.flip) < 0.08 ? 0.08 * Math.sign(s.flip || 1) : s.flip), s.k);
  const c: Pt = [(f.leaf.base[0] + f.leaf.tip[0]) / 2, (f.leaf.base[1] + f.leaf.tip[1]) / 2];
  ctx.translate(-c[0], -c[1]);
  if (s.a < 0.01) {
    ctx.restore();
    return;
  }
  ctx.globalAlpha = s.a * dim;
  ctx.fillStyle = greenFill(ctx, f.leaf);
  ctx.fill(S.leaf[i], "evenodd");
  // crossing the shaft of light, it catches it
  const inShaft = Math.exp(-Math.pow((s.x - Lo.W / 2) / (Math.min(Lo.W, Lo.H) * 0.2), 2)) * (s.flip > 0 ? s.flip : 0);
  if (inShaft > 0.05) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.22 * inShaft * s.a;
    ctx.fillStyle = "#E6FAD8";
    ctx.fill(S.leaf[i], "evenodd");
    ctx.globalCompositeOperation = "source-over";
  }
  // its underside, as it turns over, is paler
  if (s.flip < 0) {
    ctx.globalAlpha = s.a * dim * 0.25 * -s.flip;
    ctx.fillStyle = "#E8F5DC";
    ctx.fill(S.leaf[i], "evenodd");
  }
  ctx.globalAlpha = 0.28 * s.a * dim;
  ctx.fillStyle = "#000";
  ctx.fill(S.shade[i], "evenodd");
  ctx.restore();
}

function drawLeafShape(ctx: CanvasRenderingContext2D, path: Path2D, l: Leaf, x: number, y: number, rot: number, k: number, flip: number, fill: string, blur: number) {
  ctx.save();
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(k * (Math.abs(flip) < 0.1 ? 0.1 * Math.sign(flip || 1) : flip), k);
  ctx.translate(-(l.base[0] + l.tip[0]) / 2, -(l.base[1] + l.tip[1]) / 2);
  ctx.fillStyle = fill;
  ctx.fill(path, "evenodd");
  ctx.restore();
}

// ── the two leaves that stay ─────────────────────────────────────────────────
// Each one leaves its branch, unbends from a laurel leaf into a bracket, grows its
// stalk, and lands exactly where the logo's leaf sits.
function drawChosen(ctx: CanvasRenderingContext2D, S: Shapes, Lo: Layout, t: number, side: number, breath: number, lc: Pt) {
  if (t < EV.chosen[0]) return;
  const l = laurel.leaves[S.chosen];
  const lag = side > 0 ? 0.05 : 0; // the right one a breath behind, so it's not a machine
  const u = grow(clamp((t - EV.chosen[0] - lag) / (EV.chosen[1] - EV.chosen[0])));
  // where it hung (the camera as it was when it let go) and where the logo needs it
  const b0 = laurelToScreen(Lo, EV.chosen[0], l.base as Pt, side);
  const t0 = laurelToScreen(Lo, EV.chosen[0], l.tip as Pt, side);
  const x0 = side < 0 ? -logo.gapL : logo.wordW + logo.gapR;
  const yBot = logo.LEAF.yBot, yTop = logo.LEAF.yTop, HL = yBot - yTop;
  const b1 = breathe(logoToScreen(Lo, [x0, yBot]), lc, breath);
  const t1 = breathe(logoToScreen(Lo, [x0, yTop]), lc, breath);
  // the path between: it lifts out and drifts up a little before it settles
  const lift: Pt = [side * Lo.W * 0.015, -Math.min(Lo.W, Lo.H) * 0.06];
  const q = (a: Pt, b: Pt): Pt => {
    const m: Pt = [mix(a[0], b[0], u), mix(a[1], b[1], u)];
    const arc = Math.sin(Math.PI * u);
    return [m[0] + lift[0] * arc, m[1] + lift[1] * arc];
  };
  const base = q(b0, b1);
  // its angle and length, eased between the two poses
  const a0 = Math.atan2(t0[0] - b0[0], -(t0[1] - b0[1]));
  const a1 = Math.atan2(t1[0] - b1[0], -(t1[1] - b1[1]));
  const ang = mix(a0, a1, u) + Math.sin(Math.PI * u) * 0.12 * -side;
  const len0 = Math.hypot(t0[0] - b0[0], t0[1] - b0[1]);
  const len1 = Math.hypot(t1[0] - b1[0], t1[1] - b1[1]);
  const len = mix(len0, len1, u);
  const k = len / HL;
  const W0 = (l.width / l.len) * HL;
  const veins = sm(EV.veins[0], EV.veins[1], t);
  const handover = sm(EV.chosen[0], EV.chosen[0] + 0.14, t);
  const opts: LeafOpts = {
    ...LEAF_BASE,
    side,
    x0: 0,
    sag: mix(36, logo.LEAF.sag, u),
    W: mix(W0, logo.LEAF.W, u),
    stalk: logo.LEAF.stalk * grow(span("stalk", t)),
    slit: mix(logo.LEAF.slit, logo.HERO_LEAF.slit, veins),
    veins: logo.HERO_LEAF.veins,
  };
  const L = leafBracket(opts);
  // A gate: a leaf of the logo is never cut by the frame, on its way or at rest.
  const cos = Math.cos(ang), sin = Math.sin(ang);
  for (const [px, py] of L.pts) {
    const lx = px * k, ly = (py - yBot) * k;
    const sx = base[0] + lx * cos - ly * sin, sy = base[1] + lx * sin + ly * cos;
    if (sx < 8 || sx > Lo.W - 8 || sy < 8 || sy > Lo.H - 8)
      throw new Error(`A logo leaf touches the frame edge at ${t.toFixed(3)} s (${Lo.W}x${Lo.H}): ${sx.toFixed(0)}, ${sy.toFixed(0)}`);
  }
  ctx.save();
  ctx.translate(base[0], base[1]);
  ctx.rotate(ang);
  ctx.scale(k, k);
  ctx.translate(0, -yBot);
  // a living green as it travels, New leaf by the time it lands
  // the hero logo's leaf, side veins cut out of it; while they come into focus,
  // the cuts are filled back in, less and less
  ctx.globalAlpha = handover;
  ctx.fillStyle = NEW_LEAF;
  ctx.fill(new Path2D(L.d), "evenodd");
  if (L.stalk) ctx.fill(new Path2D(L.stalk));
  if (veins < 1) {
    ctx.globalAlpha = (1 - veins) * handover;
    ctx.fill(new Path2D(L.veins));
  }
  ctx.restore();
  // for its first frames it's still the laurel's leaf, fading into the bracket
  if (handover < 1) {
    const i = S.chosen;
    ctx.save();
    ctx.translate(Lo.laurel.cx, Lo.laurel.cy);
    const kk = Lo.laurel.s * camera(EV.chosen[0]);
    ctx.scale(side < 0 ? kk : -kk, kk);
    ctx.globalAlpha = 1 - handover;
    ctx.fillStyle = greenFill(ctx, l);
    ctx.fill(S.leaf[i], "evenodd");
    ctx.globalAlpha = 0.3 * (1 - handover);
    ctx.fillStyle = "#000";
    ctx.fill(S.shade[i], "evenodd");
    ctx.restore();
  }
}

const breathe = (p: Pt, c: Pt, b: number): Pt => [c[0] + (p[0] - c[0]) * b, c[1] + (p[1] - c[1]) * b];

// Her name rises between the leaves, one letter every two frames.
function drawName(ctx: CanvasRenderingContext2D, S: Shapes, Lo: Layout, t: number, breath: number, lc: Pt) {
  const start = EV.name[0];
  const each = 0.55;
  const stagger = 2 / 24;
  logo.glyphs.forEach((g, i) => {
    const q = settle(clamp((t - start - i * stagger) / each));
    if (q <= 0) return;
    const at = breathe(logoToScreen(Lo, [g.x, (1 - q) * 70]), lc, breath);
    ctx.save();
    ctx.translate(at[0], at[1]);
    ctx.scale(Lo.logo.s * breath, Lo.logo.s * breath);
    ctx.globalAlpha = q;
    ctx.fillStyle = PAPER;
    ctx.fill(S.glyphs[i]);
    ctx.restore();
  });
}
