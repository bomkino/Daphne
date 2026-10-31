// Daphne speaks in the pitch.dog type system's faces, PD Head, PD Body, PD Body Alt and PD Eyebrow,
// whose font files are CC0 (public/fonts/FONT-LICENSE.md). The render waits until every face is in.
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

const FACES: [string, string][] = [
  ["PD Head", "pd-head.woff2"],
  ["PD Body", "pd-body-roman.woff2"],
  ["PD Body Alt", "pd-body-alt-roman.woff2"],
  ["PD Eyebrow", "pd-eyebrow-site.woff2"],
];

const handle = delayRender("Loading Daphne's fonts");
Promise.all(
  FACES.map(async ([family, file]) => {
    const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format("woff2")`, { weight: "100 900" });
    await face.load();
    document.fonts.add(face);
  }),
)
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));

// Text width with the real faces, for fitting brackets around a word.
let ctx: CanvasRenderingContext2D | null = null;
export const textWidth = (text: string, font: string) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = font;
  return ctx!.measureText(text).width;
};
