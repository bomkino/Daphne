import { Easing, interpolate } from "remotion";

// Curves for animating on the beat grid. Everything here is continuous, which
// matters under motion blur: the blur samples between frames, and a value that
// jumps at a frame splits into two ghost copies across those samples.

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

type EasingFn = (t: number) => number;

export const ease = {
  inOut: Easing.bezier(0.45, 0, 0.2, 1),
  // The same out-curve Remotion's skill and other kits ship; a piece that wants
  // its own hand changes it (learnings/remotion-with-claude/motion.md).
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.4),
  // Lands past the target and settles back, for things that arrive on a beat.
  overshoot: Easing.bezier(0.2, 1.5, 0.4, 1),
  linear: Easing.linear,
};

// 0 before `range[0]`, 1 after `range[1]`, eased in between.
export const mix = (
  frame: number,
  range: [number, number],
  easing: EasingFn = ease.inOut,
) => interpolate(frame, range, [0, 1], { ...clamp, easing });

// A keyframed channel with per-segment easing. Each key's easing describes how
// the value travels into that key.
export type Key = { f: number; v: number; e?: EasingFn };

export const track = (frame: number, keys: Key[]): number => {
  if (frame <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.f) {
      const p = (frame - a.f) / (b.f - a.f);
      return a.v + (b.v - a.v) * (b.e ?? ease.inOut)(p);
    }
  }
  return keys[keys.length - 1].v;
};

// A decaying kick for a hit on the beat: 0 before `start`, 1 on it, fading
// over `decayFrames`. It ramps up over the half frame before the hit, so whole
// frames read as a hard kick while the blur's sub-frames see a smooth curve.
export const hit = (frame: number, start: number, decayFrames: number) => {
  const t = frame - start;
  if (t <= -0.5) return 0;
  if (t < 0) {
    const p = (t + 0.5) / 0.5;
    return p * p * (3 - 2 * p);
  }
  return Math.exp(-t / decayFrames);
};
