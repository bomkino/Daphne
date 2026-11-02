// Where the laurel, the logo and the words sit in each size. The logo is set big:
// 80% of a portrait frame's width, more than half of a landscape one's, because
// on a phone a 16:9 frame is about 390 px wide.
import laurel from "./data/laurel.json";
import logo from "./data/logo.json";
import type { Size } from "./sizes";

export type Layout = {
  W: number;
  H: number;
  laurel: { cx: number; cy: number; s: number };
  logo: { cx: number; cy: number; s: number; w: number; h: number };
  words: { tagline: number; url: number; madeBy: number; size: number; urlSize: number; madeBySize: number };
};

const LOGO_W = logo.box[2] - logo.box[0];
const LOGO_H = logo.box[3] - logo.box[1];
const LAUREL_H = laurel.viewBox[3];

export function layoutOf(size: Size): Layout {
  const { width: W, height: H } = size;
  // per size: the laurel's height, the logo's width, the logo's center, and the type
  const spec =
    W < H
      ? { laurelH: 400, laurelY: 860, logoW: 860, logoY: 850, gap: 96, size: 46, urlSize: 36, madeBySize: 32 }
      : W === H
        ? { laurelH: 400, laurelY: 470, logoW: 780, logoY: 455, gap: 88, size: 42, urlSize: 33, madeBySize: 30 }
        : { laurelH: 540, laurelY: 450, logoW: 1120, logoY: 440, gap: 112, size: 54, urlSize: 38, madeBySize: 34 };
  const s = spec.logoW / LOGO_W;
  const h = LOGO_H * s;
  const tagline = spec.logoY + h / 2 + spec.gap;
  // A gate, not a guideline: the finished logo sits inside the safe area, with
  // a leaf's width to spare from the frame (the brand's clear space), or nothing renders.
  const left = W / 2 - spec.logoW / 2, right = W / 2 + spec.logoW / 2, top = spec.logoY - h / 2, bottom = spec.logoY + h / 2;
  const sa = size.safe;
  if (left < sa.left || right > W - sa.right || top < sa.top || bottom > H - sa.bottom)
    throw new Error(`The logo leaves the safe area at ${size.id}: ${left.toFixed(0)}–${right.toFixed(0)} × ${top.toFixed(0)}–${bottom.toFixed(0)}`);
  // and the laurel, pushed in by the camera, keeps clear of every edge: 40 px above and
  // below, and 90 px at the sides, so its outer leaves can fall and fade before the edge
  const lh = spec.laurelH * 1.06, lw = (laurel.viewBox[2] / LAUREL_H) * lh;
  if (spec.laurelY - lh / 2 < 40 || spec.laurelY + lh / 2 > H - 40 || lw > W - 180)
    throw new Error(`The laurel comes within 40 px of the frame's top or bottom, or 90 px of a side, at ${size.id}`);
  return {
    W,
    H,
    laurel: { cx: W / 2, cy: spec.laurelY, s: spec.laurelH / LAUREL_H },
    logo: { cx: W / 2, cy: spec.logoY, s, w: spec.logoW, h },
    words: {
      tagline,
      url: tagline + spec.size * 2.1,
      madeBy: tagline + spec.size * 2.1 + spec.urlSize * 1.55,
      size: spec.size,
      urlSize: spec.urlSize,
      madeBySize: spec.madeBySize,
    },
  };
}
