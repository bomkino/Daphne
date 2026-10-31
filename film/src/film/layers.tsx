// The parts of the film that are set rather than drawn: the canvas that holds
// the grove, the laurels Daphne makes, her words, the leaf brackets, the end card.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import paths from "../brand/paths.json";
import { C } from "../brand/colors";
import { at, beat, clamp, FPS, LINES, lineSpan, mix, sm, span, Voice, wordEase, wordTimes } from "../story";
import { drawGrove, endingTimes, logoBox } from "./grove";

export const useT = () => useCurrentFrame() / FPS;
export const useSize = () => {
  const { width: W, height: H } = useVideoConfig();
  return { W, H, tall: H > W };
};

// ── the grove ──────────────────────────────────────────────────────────────
export const Grove: React.FC<{ ownEnding: boolean }> = ({ ownEnding }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useT();
  const { W, H, tall } = useSize();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawGrove(ctx, { W, H, tall, t, ownEnding });
  }, [t, W, H, tall, ownEnding]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ── a laurel made with Daphne's engine ─────────────────────────────────────
// The SVG is the engine's own output, inlined so its text renders in the preset's
// face. `grow` reveals the leaves from the base up both branches, as the app's own
// motion grows them; `words` raises the lines one after another.
let uid = 0;
export const Laurel: React.FC<{
  art: { viewBox: number[]; svg: string };
  x: number;
  y: number;
  height: number;
  opacity?: number;
  scale?: number;
  origin?: [number, number];
  blur?: number;
  hue?: number;
  bright?: number;
  grow?: number;
  words?: number;
}> = ({ art, x, y, height, opacity = 1, scale = 1, origin = [0.5, 0.5], blur = 0, hue = 0, bright = 1, grow = 1, words = 1 }) => {
  const id = useMemo(() => `lr${uid++}`, []);
  // ids are made unique per instance and per layer, so copies on screen don't share gradients.
  // The leaves and the words are two layers: the leaves grow, the words rise after them.
  const [leavesSvg, wordsSvg] = useMemo(() => {
    const uniq = (svg: string, p: string) =>
      svg
        .replace(/id="([^"]+)"/g, `id="${p}-$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`)
        .replace(/href="#([^"]+)"/g, `href="#${p}-$1"`)
        .replace(/ width="[\d.]+" height="[\d.]+"/, ' width="100%" height="100%"');
    const open = art.svg.slice(0, art.svg.indexOf(">") + 1);
    const texts = art.svg.match(/<text [\s\S]*?<\/text>/g) || [];
    let n = 0;
    const words = open + texts.map((x) => x.replace("<text ", () => `<text data-i="${n++}" `)).join("") + "</svg>";
    const leavesOnly = art.svg.replace(/<text [\s\S]*?<\/text>/g, "");
    return [uniq(leavesOnly, `${id}l`), uniq(words, `${id}w`)];
  }, [art.svg, id]);
  const nText = (art.svg.match(/<text /g) || []).length;
  const w = (height * art.viewBox[2]) / art.viewBox[3];
  if (opacity <= 0.002) return null;
  const a = mix(-8, 196, grow); // the reveal's leading edge, in degrees from the bottom
  const mask =
    grow >= 1
      ? undefined
      : `conic-gradient(from 180deg at 50% 50%, #000 0deg, #000 ${Math.max(0, a - 16)}deg, transparent ${a}deg, transparent ${360 - a}deg, #000 ${Math.min(360, 376 - a)}deg)`;
  const textStyle = Array.from({ length: nText }, (_, i) => {
    const q = clamp(words * (nText + 1.5) - i * 1.0 - 0.5);
    const e = wordEase(q);
    return `#${id}-w text[data-i="${i}"]{opacity:${e.toFixed(3)};transform:translateY(${((1 - e) * 6).toFixed(2)}px)}`;
  }).join("");
  const box: React.CSSProperties = {
    position: "absolute",
    left: x - w / 2,
    top: y - height / 2,
    width: w,
    height,
    opacity,
    transform: `scale(${scale})`,
    transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%`,
    filter: blur || hue || bright !== 1 ? `blur(${blur.toFixed(2)}px) hue-rotate(${hue.toFixed(1)}deg) brightness(${bright.toFixed(3)})` : undefined,
  };
  return (
    <div style={box}>
      <style>{`#${id}-w svg, #${id}-l svg{overflow:visible} ${textStyle}`}</style>
      <div id={`${id}-l`} style={{ position: "absolute", inset: 0, WebkitMaskImage: mask, maskImage: mask }} dangerouslySetInnerHTML={{ __html: leavesSvg }} />
      <div id={`${id}-w`} style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: wordsSvg }} />
    </div>
  );
};

// ── her words ──────────────────────────────────────────────────────────────
// mode "story": each word arrives at speaking pace, so the text cut reads as told.
// mode "captions": the narrated cut's subtitles, a line at a time, smaller.
export type TextMode = "story" | "captions" | "off";
const shadow = "0 0 28px rgba(9,22,15,.85), 0 0 2px rgba(9,22,15,.6)";
export const Words: React.FC<{ voice: Voice; mode: TextMode }> = ({ voice, mode }) => {
  const t = useT();
  const { H, tall } = useSize();
  if (mode === "off") return null;
  const story = mode === "story";
  const size = story ? (tall ? 60 : 50) : tall ? 44 : 38;
  const box: React.CSSProperties = tall
    ? { position: "absolute", left: 80, right: 80, top: story ? 236 : 1180, height: story ? 300 : 200, display: "flex", alignItems: story ? "flex-start" : "center", justifyContent: "center" }
    : { position: "absolute", left: 0, right: 0, top: H * (story ? 0.755 : 0.8), height: H * 0.16, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <>
      {LINES.map((l, i) => {
        if (l.kind === "title") return null;
        const sp = lineSpan(i, voice);
        if (t < sp.from - 0.05 || t > sp.to + 0.05) return null;
        const out = sm(sp.to - 0.55, sp.to, t);
        const text = l[voice];
        const wt = wordTimes(text);
        // phrases set on beats ("Poets. Athletes. Artists.") arrive on their beats
        const phrases = l.words ? text.split(/(?<=\.)\s+/) : null;
        let wi = 0;
        const starts = phrases
          ? phrases.flatMap((ph, pi) => ph.split(/\s+/).map((_, k) => beat(l.words![pi]) - sp.from + k * 0.12))
          : wt.starts;
        return (
          <div key={l.id} style={box}>
            <div
              style={{
                fontFamily: "PD Head",
                fontWeight: 300,
                fontSize: size,
                lineHeight: 1.26,
                letterSpacing: "-0.005em",
                color: C.paper,
                textAlign: "center",
                maxWidth: tall ? 880 : story ? 1180 : 1300,
                textWrap: "balance",
                opacity: 1 - out,
                transform: `translateY(${(-out * 8).toFixed(2)}px)`,
                textShadow: shadow,
              }}
            >
              {wt.words.map((w, k) => {
                const s0 = sp.from + (story ? starts[wi++] : 0);
                const q = story ? span(s0, s0 + 0.5, t, wordEase) : sm(sp.from, sp.from + 0.35, t);
                return (
                  <span key={k} style={{ display: "inline-block", opacity: q, transform: `translateY(${((1 - q) * 10).toFixed(2)}px)`, filter: q < 1 ? `blur(${((1 - q) * 5).toFixed(2)}px)` : undefined, whiteSpace: "pre" }}>
                    {w}
                    {k < wt.words.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

// ── her name, the title ────────────────────────────────────────────────────
export const Title: React.FC = () => {
  const t = useT();
  const { H, tall } = useSize();
  const from = at("river"), to = at("river") + 4.2;
  if (t < from - 0.05 || t > to + 0.05) return null;
  const out = sm(to - 0.9, to, t);
  const letters = "Daphne".split("");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: tall ? H * 0.3 : H * 0.27, textAlign: "center", fontFamily: "PD Head", fontWeight: 300, fontSize: tall ? 210 : 230, color: C.paper, letterSpacing: "-0.01em", opacity: 1 - out, textShadow: shadow, filter: out > 0 ? `blur(${(out * 6).toFixed(2)}px)` : undefined }}>
      {letters.map((c, i) => {
        // letters arrive one at a time, two frames apart, rising a tenth of the cap height
        const q = span(from + 0.15 + (i * 2) / FPS, from + 0.15 + (i * 2) / FPS + 0.55, t, wordEase);
        return (
          <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${((1 - q) * 0.07 * 230).toFixed(1)}px)` }}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

// ── the leaf brackets, holding one word ────────────────────────────────────
const Bracket: React.FC<{ side: "left" | "right"; grow: number; color: string }> = ({ side, grow, color }) => {
  const b = paths.bracket[side];
  const [x0, , x1] = b.bbox;
  return (
    <svg viewBox={`${x0 - 4} -940 ${x1 - x0 + 8} 1240`} style={{ height: "1.24em", verticalAlign: "-0.30em", overflow: "visible" }}>
      <g fill={color} style={{ transform: `scaleY(${grow.toFixed(4)})`, transformOrigin: "0px 240px", opacity: Math.min(1, grow * 3) }}>
        <path fillRule="evenodd" d={b.d} />
        <path d={b.stalk} />
      </g>
    </svg>
  );
};
export const Held: React.FC = () => {
  const t = useT();
  const { H, tall } = useSize();
  const from = at("free"), to = at("make") + 1.0;
  if (t < from - 0.05 || t > to + 0.05) return null;
  const grow = span(from, from + 1.05, t);
  const word = span(from + 0.5, from + 1.2, t, wordEase) * (1 - sm(at("make") - 0.3, at("make") + 0.3, t));
  const part = sm(at("make") - 0.2, at("make") + 0.9, t); // the brackets make room for the laurel, and give way to it
  const size = tall ? 200 : 210;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: (tall ? H * 0.47 : H * 0.43) - size * 0.62, textAlign: "center", fontFamily: "PD Head", fontWeight: 300, fontSize: size, color: C.paper, whiteSpace: "nowrap", textShadow: shadow }}>
      <span style={{ display: "inline-block", transform: `translateX(${(-part * size * 1.4).toFixed(1)}px)`, opacity: 1 - part }}>
        <Bracket side="left" grow={grow} color={C.newLeaf} />
      </span>
      <span style={{ display: "inline-block", padding: "0 0.06em", opacity: word, transform: `translateY(${((1 - word) * 16).toFixed(1)}px)`, minWidth: "1.9em" }}>free</span>
      <span style={{ display: "inline-block", transform: `translateX(${(part * size * 1.4).toFixed(1)}px)`, opacity: 1 - part }}>
        <Bracket side="right" grow={grow} color={C.newLeaf} />
      </span>
    </div>
  );
};

// ── the end card's words, under the logo the grove draws ───────────────────
export const EndWords: React.FC = () => {
  const t = useT();
  const { W, H, tall } = useSize();
  const E = endingTimes();
  if (t < E.tagline - 0.05) return null;
  const { bottom } = logoBox(W, H, tall);
  const tag = span(E.tagline, E.tagline + 0.6, t, wordEase), url = span(E.url, E.url + 0.6, t, wordEase);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: bottom + (tall ? 70 : 54), textAlign: "center" }}>
      <div style={{ fontFamily: "PD Body Alt", fontWeight: 400, fontSize: tall ? 46 : 40, color: C.paper, opacity: tag, transform: `translateY(${((1 - tag) * 10).toFixed(1)}px)` }}>
        Make festival laurels for your film. It’s free.
      </div>
      <div style={{ marginTop: tall ? 44 : 34, fontFamily: "PD Eyebrow", fontWeight: 500, fontSize: tall ? 30 : 26, letterSpacing: "0.04em", opacity: url }}>
        <span style={{ color: C.newLeaf }}>pitch.dog/daphne</span>
        <span style={{ color: C.paper, opacity: 0.55 }}>{"   ·   "}Made by pitch.dog</span>
      </div>
    </div>
  );
};

export { beat, clamp, mix };
