import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// The laurels are SVG files drawn by Daphne's engine (scripts/laurels.mjs). A laurel that animates part by
// part is put into the page as markup, so this loads its text and holds the frame until it's in.
const cache = new Map<string, Promise<string>>();
const load = (file: string) => {
  if (!cache.has(file)) cache.set(file, fetch(staticFile(file)).then((r) => r.text()));
  return cache.get(file)!;
};

export const useSvgText = (file: string) => {
  const [text, setText] = useState<string | null>(null);
  const [handle] = useState(() => delayRender(`Loading ${file}`));
  useEffect(() => {
    load(file)
      .then((t) => {
        setText(t);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [file, handle]);
  return text;
};

// [x, y, w, h] of a viewBox, as a box on screen: where a point in the laurel lands
export type VB = number[];
export const fitBox = (vb: VB, cx: number, cy: number, height: number) => {
  const k = height / vb[3];
  return {
    k,
    left: cx - (vb[2] * k) / 2,
    top: cy - height / 2,
    width: vb[2] * k,
    height,
    // a point in viewBox units, on screen
    at: (x: number, y: number) => [cx + (x - (vb[0] + vb[2] / 2)) * k, cy + (y - (vb[1] + vb[3] / 2)) * k] as [number, number],
  };
};
