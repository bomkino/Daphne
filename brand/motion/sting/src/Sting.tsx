import "./fonts";
import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import logo from "./data/logo.json";
import { layoutOf } from "./layout";
import { type Ending, paint } from "./paint";
import { sizeOf } from "./sizes";
import timeline from "./timeline.json";

const TAGLINE = "Make festival laurels for your film. It’s free.";
const URL = "pitch.dog/daphne";
const MADE_BY = "Made by pitch.dog";
const EV = timeline.events as unknown as Record<string, [number, number]>;
const C = logo.colors;

// a line of words that settles in: rises a little and fades up, on the brand's word curve
const settleIn = (t: number, [a, b]: [number, number]) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  const e = 1 - Math.pow(1 - x, 3);
  return { opacity: e, transform: `translateY(${((1 - e) * 14).toFixed(2)}px)` };
};

export const Sting: React.FC<{ ending: Ending }> = ({ ending }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const size = sizeOf(width, height);
  const L = layoutOf(size);
  const t = frame / fps;
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const b = back.current?.getContext("2d");
    const f = front.current?.getContext("2d");
    if (b && f) paint(b, f, L, t, ending);
  }, [t, ending, L]);

  // A gate: each line of words fits inside the safe area, or nothing renders.
  useLayoutEffect(() => {
    const m = document.createElement("canvas").getContext("2d")!;
    const room = width - size.safe.left - size.safe.right;
    const lines: [string, string][] = [[`400 ${L.words.size}px "PD Body Alt"`, TAGLINE]];
    if (ending === "outro") lines.push([`500 ${L.words.urlSize}px "PD Eyebrow"`, URL], [`400 ${L.words.madeBySize}px "PD Body"`, MADE_BY]);
    for (const [font, text] of lines) {
      m.font = font;
      const w = m.measureText(text).width;
      if (w > room) throw new Error(`"${text}" is ${w.toFixed(0)} px wide at ${size.id}; the safe area has ${room}`);
    }
  }, [L, ending, size, width]);

  const line = (y: number, px: number): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: y,
    fontSize: px,
    lineHeight: 1,
    textAlign: "center",
    transform: "translateY(-0.8em)",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#07130D" }}>
      <canvas ref={back} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
      <div style={{ ...line(L.words.tagline, L.words.size), fontFamily: "PD Body Alt", fontWeight: 400, color: C.paper, ...settleIn(t, EV.tagline) }}>
        {TAGLINE}
      </div>
      {ending === "outro" && (
        <>
          <div style={{ ...line(L.words.url, L.words.urlSize), fontFamily: "PD Eyebrow", fontWeight: 500, letterSpacing: "0.02em", color: C.newLeaf, ...settleIn(t, EV.url) }}>
            {URL}
          </div>
          <div style={{ ...line(L.words.madeBy, L.words.madeBySize), fontFamily: "PD Body", fontWeight: 400, color: C.paper, ...settleIn(t, EV.madeBy), opacity: 0.62 * settleIn(t, EV.madeBy).opacity }}>
            {MADE_BY}
          </div>
        </>
      )}
      <canvas ref={front} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
      <Audio src={staticFile(`audio/daphne-${ending}.wav`)} />
    </AbsoluteFill>
  );
};
