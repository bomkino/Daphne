import React from "react";
import { interpolate } from "remotion";
import { settle } from "../brand/daphne";

// Words that arrive one at a time, rising a tenth of their size as they fade in, two frames apart
// (brand rule 4, set for letters; here for words, which read faster at this pace). `out` fades the
// whole line away from that frame, drifting up a little, so lines leave the way they came.
export const Words: React.FC<{
  text: string;
  f: number; // frames since the line's cue
  size: number;
  font: string;
  color: string;
  weight?: number;
  stagger?: number;
  dur?: number;
  out?: number; // local frame the line starts to leave
  outDur?: number;
  style?: React.CSSProperties;
  track?: number;
  upper?: boolean;
  colors?: Record<string, string>; // a word's own color, by the word
}> = ({ text, f, size, font, color, weight = 400, stagger = 2, dur = 12, out, outDur = 8, style, track = 0, upper, colors }) => {
  const words = text.split(" ");
  const leave = out === undefined ? 0 : interpolate(f, [out, out + outDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: settle });
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.18,
        letterSpacing: `${track}em`,
        textTransform: upper ? "uppercase" : undefined,
        opacity: 1 - leave,
        transform: `translateY(${-leave * size * 0.25}px)`,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const p = interpolate(f - i * stagger, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: settle });
        return (
          <React.Fragment key={i}>
            <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * size * 0.32}px)`, color: colors?.[w] }}>{w}</span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
