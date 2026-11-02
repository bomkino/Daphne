import sizes from "./sizes.json";

// Instagram's three video sizes, each with the safe area that keeps type and
// the logo clear of the app's buttons and captions. 9:16 is the pitch.dog type
// system's story canvas. Type system v3.0.0 has no 3:4 or 16:9 social canvas,
// so those borrow the nearest governed safe areas: the 4:5 feed portrait, and
// YouTube's 1920x1080 end screen. A phone shows a 16:9 frame about 390 px
// wide, so only the big roles (display, headline, quote, metric) stay legible.
export type Size = {
  id: string;
  width: number;
  height: number;
  canvas: "story" | "square" | "landscape";
  safe: { top: number; right: number; bottom: number; left: number };
};

export const SIZES = sizes as Size[];

export const sizeOf = (width: number, height: number): Size => {
  const size = SIZES.find((s) => s.width === width && s.height === height);
  if (!size)
    throw new Error(`No safe area for ${width}x${height} in sizes.json`);
  return size;
};
