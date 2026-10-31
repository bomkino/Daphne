// Daphne's leaf bracket, ported line for line from brand/tools/mark.mjs so the
// film can redraw it every frame: a leaf that starts as one of the laurel's and
// unbends into one of the logo's. scripts/check-leaf.ts proves the two agree.
//
// Units are PD Head's (1000 per em), y pointing down, baseline at 0.

export type LeafOpts = {
  side: number;
  x0: number;
  yTop: number;
  yBot: number;
  sag: number;
  W: number;
  asym: number;
  p: number;
  q: number;
  taper: number;
  slit: number;
  slitTo: number;
  stalk: number;
  stalkCurl: number;
  stalkW: number;
  wave: number;
  waves: number;
  veins: number;
  veinW: number;
  N: number;
};

type Pt = [number, number];

const f = (n: number) => (Math.round(n * 100) / 100).toString();

// Catmull-Rom through the points, as cubic Béziers
export function smooth(pts: Pt[], closed = true): string {
  const n = pts.length;
  const P = (i: number) =>
    pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1),
      p1 = P(i),
      p2 = P(i + 1),
      p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

export function leafBracket(o: LeafOpts) {
  const { side, x0, yTop, yBot, sag, W, asym, p, q, taper, slit, slitTo, stalk, stalkCurl, stalkW, N, wave, waves, veins, veinW } = o;
  const H = yBot - yTop,
    c = H / 2,
    R = (c * c + sag * sag) / (2 * sag);
  const cy = (yTop + yBot) / 2,
    cx = x0 - side * (R - sag),
    th = Math.asin(c / R);
  const P = (u: number): Pt => {
    const a = -th + 2 * th * u,
      ang = side < 0 ? Math.PI - a : a;
    return [cx + R * Math.cos(ang), cy - R * Math.sin(ang)];
  };
  const frame = (u: number): [number, number, number, number] => {
    const e = 1e-4,
      a = P(Math.max(0, u - e)),
      b = P(Math.min(1, u + e));
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const m = Math.hypot(dx, dy);
    dx /= m;
    dy /= m;
    let nx = -dy,
      ny = dx;
    const [px, py] = P(u);
    if ((px - cx) * nx + (py - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [nx, ny, dx, dy];
  };
  const prof = (uIn: number) => {
    const u = Math.min(1, Math.max(0, uIn));
    return Math.pow(Math.sin(Math.PI * Math.pow(u, p)), q) * (1 - taper * u) * (1 - Math.pow(u, 6));
  };
  const wv = (u: number, ph: number) => 1 + wave * Math.sin(2 * Math.PI * waves * u + ph) * Math.sin(Math.PI * u);
  const out: Pt[] = [],
    inn: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N,
      [x, y] = P(u),
      [nx, ny] = frame(u),
      w = (W * prof(u)) / 2;
    out.push([x + nx * w * (1 + asym) * wv(u, 0), y + ny * w * (1 + asym) * wv(u, 0)]);
    inn.push([x - nx * w * (1 - asym) * wv(u, 2.1), y - ny * w * (1 - asym) * wv(u, 2.1)]);
  }
  const leaf = smooth(out.concat(inn.slice().reverse().slice(1, -1)));
  let cut = "";
  if (slit > 0) {
    const a: Pt[] = [],
      b: Pt[] = [],
      M = 36,
      off = W * asym * 0.25;
    for (let i = 0; i <= M; i++) {
      const t = i / M,
        u = 0.03 + (slitTo - 0.03) * t,
        [x, y] = P(u),
        [nx, ny] = frame(u);
      const w = ((W * slit) / 2) * Math.pow(1 - t, 0.9) * Math.min(1, 0.35 + t * 6);
      a.push([x + nx * (off + w), y + ny * (off + w)]);
      b.push([x + nx * (off - w), y + ny * (off - w)]);
    }
    cut = smooth(a.concat(b.reverse()), true);
  }
  let veinCut = "";
  if (veins > 0) {
    for (let k = 0; k < veins; k++)
      for (const sgn of [1, -1]) {
        const u0 = 0.12 + (0.68 * (k + (sgn > 0 ? 0 : 0.45))) / veins;
        if (u0 > 0.82) continue;
        const a: Pt[] = [],
          b: Pt[] = [],
          M = 14,
          du = 0.13;
        for (let i = 0; i <= M; i++) {
          const t = i / M,
            u = u0 + du * Math.pow(t, 1.4),
            [x, y] = P(u),
            [nx, ny, tx, ty] = frame(u);
          const hw = ((W * prof(u)) / 2) * (1 + sgn * asym),
            r = sgn * hw * (0.08 + 0.7 * t),
            w = ((W * veinW) / 2) * (1 - t) + 0.4;
          const cx2 = x + nx * r,
            cy2 = y + ny * r;
          a.push([cx2 + tx * w, cy2 + ty * w]);
          b.push([cx2 - tx * w, cy2 - ty * w]);
        }
        veinCut += smooth(a.concat(b.reverse()), true);
      }
  }
  let stalkD = "";
  const stalkPts: Pt[] = [];
  if (stalk > 0) {
    const L = H * stalk,
      M = 24,
      [bx, by] = P(0.02),
      [, , tx, ty] = frame(0.02),
      ang = Math.atan2(-ty, -tx);
    let x = bx,
      y = by;
    stalkPts.push([x, y]);
    for (let i = 1; i <= M; i++) {
      const t = i / M,
        a = ang + side * stalkCurl * t * t;
      x += (Math.cos(a) * L) / M;
      y += (Math.sin(a) * L) / M;
      stalkPts.push([x, y]);
    }
    const Lp: Pt[] = [],
      Rp: Pt[] = [];
    for (let i = 0; i < stalkPts.length; i++) {
      const a = stalkPts[Math.max(0, i - 1)],
        b = stalkPts[Math.min(stalkPts.length - 1, i + 1)];
      let dx = b[0] - a[0],
        dy = b[1] - a[1];
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
      const t = i / (stalkPts.length - 1),
        w = W * stalkW * (1 - 0.55 * t) * (t > 0.9 ? Math.sqrt(1 - ((t - 0.9) / 0.1) * 0.6) : 1);
      Lp.push([stalkPts[i][0] - dy * w, stalkPts[i][1] + dx * w]);
      Rp.push([stalkPts[i][0] + dy * w, stalkPts[i][1] - dx * w]);
    }
    stalkD = smooth(Lp.concat(Rp.reverse()), true);
  }
  // the outline, the midrib, and the veins apart, so a frame can fade the veins in
  return { outline: leaf, slit: cut, veins: veinCut, d: leaf + cut + veinCut, stalk: stalkD, P, pts: out.concat(inn, stalkPts) };
}
