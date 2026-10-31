import { useVideoConfig } from "remotion";
import { sizeOf } from "../sizes";

// Each size is laid out from its own frame, not cropped from another: a stage for the picture and a
// caption line under it, kept above Instagram's caption zone on 9:16 (key words above y 1248).
export const useLayout = () => {
  const { width: W, height: H } = useVideoConfig();
  const size = sizeOf(W, H);
  const tall = size.canvas === "story";
  const wide = size.canvas === "landscape";
  const s = Math.min(W, H) / 1080;
  const cx = W / 2;
  // the stage: where the picture sits
  const stage = tall
    ? { cx, cy: 800, size: 820 }
    : wide
      ? { cx, cy: 430, size: 600 }
      : { cx, cy: 450, size: 610 };
  // the caption's first line (its top), and the eyebrow line above the stage
  const capY = tall ? 1170 : wide ? 820 : 850;
  const topY = tall ? 290 : wide ? 110 : 100;
  return { W, H, s, cx, tall, wide, square: size.canvas === "square", safe: size.safe, stage, capY, topY, id: size.id };
};
export type Layout = ReturnType<typeof useLayout>;

// type sizes, in px at this frame
export const type = (L: Layout) => ({
  headline: (L.tall ? 92 : 84) * L.s,
  lead: (L.tall ? 54 : L.wide ? 48 : 50) * L.s,
  small: 38 * L.s,
  eyebrow: (L.tall ? 28 : 24) * L.s,
});
