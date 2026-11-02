import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C } from "../brand/daphne";
import { useLayout } from "../lib/layout";
import { rng } from "../lib/rand";
import { LeafShape } from "./Leaf";

// The grove at night: Grove with a lift of light at its center, a few out-of-focus leaves drifting
// through, and a fine grain so the dark never sits flat. It runs under every scene, so the film is one place.
const LEAVES = (() => {
  const r = rng(11);
  return Array.from({ length: 11 }, (_, i) => ({
    x: r(),
    y: r(),
    size: 90 + r() * 260,
    speed: 0.35 + r() * 0.8,
    sway: 20 + r() * 60,
    phase: r() * Math.PI * 2,
    spin: (r() - 0.5) * 0.6,
    rot: r() * 360,
    depth: i % 3,
  }));
})();

export const Backdrop: React.FC<{ dim?: number }> = ({ dim = 0 }) => {
  const f = useCurrentFrame();
  const L = useLayout();
  return (
    <AbsoluteFill style={{ background: C.grove }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${L.wide ? "70% 85%" : "95% 60%"} at 50% ${L.tall ? 40 : 45}%, ${C.groveLift} 0%, ${C.grove} 52%, ${C.groveDeep} 100%)`,
        }}
      />
      {LEAVES.map((l, i) => {
        const span = L.H + 600;
        const size = l.size * L.s;
        const y = ((l.y * span + f * l.speed * L.s * 1.4) % span) - 300;
        const x =
          (0.1 + 0.8 * l.x) * L.W -
          size / 2 +
          Math.sin(f / 70 + l.phase) * l.sway * L.s;
        const blur = [3, 7, 14][l.depth] * L.s;
        // a leaf fades out before any edge of the frame can cut it
        const cx = x + size / 2,
          cy = y + size / 2;
        const edge = Math.min(cx, L.W - cx, cy, L.H - cy);
        const away = Math.min(
          1,
          Math.max(0, (edge - size * 0.75) / (size * 0.6)),
        );
        const op = [0.09, 0.07, 0.05][l.depth] * (1 - dim) * away;
        return (
          <LeafShape
            key={i}
            size={size}
            style={{
              position: "absolute",
              left: x,
              top: y,
              opacity: op,
              filter: `blur(${blur}px)`,
              transform: `rotate(${l.rot + f * l.spin}deg)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, ${C.groveDeep}cc 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// grain on top of everything, fresh each frame: a 512 px noise tile laid as <Img> tiles (so the render waits
// for it), shifted by a new offset every frame.
export const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const r = rng(f * 7 + 3);
  const src = staticFile("grain.png");
  const T = 512;
  const ox = Math.round(r() * T),
    oy = Math.round(r() * T);
  const nx = Math.ceil(L.W / T) + 1,
    ny = Math.ceil(L.H / T) + 1;
  return (
    <AbsoluteFill
      style={{
        opacity: 0.06,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: nx * ny }, (_, i) => (
        <Img
          key={i}
          src={src}
          style={{
            position: "absolute",
            width: T,
            height: T,
            left: (i % nx) * T - ox,
            top: Math.floor(i / nx) * T - oy,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
