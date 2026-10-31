import React, { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { GrowLaurel } from "../components/GrowLaurel";
import { Words } from "../components/Words";
import laurels from "../data/laurels.json";
import { type, useLayout } from "../lib/layout";
import { fitBox } from "../lib/svg";
import { T } from "../timeline";

// The hook: the email every filmmaker waits for. Three phrases light up, lift off the page and become the
// words of a laurel, which grows around them. It's the product's whole trick, shown in its first seconds.
const HERO = laurels.hero;
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The email. Words in [brackets] are the three the laurel takes.
const BODY = "We're delighted to tell you that your film has been selected as an [Official Selection] of [Your Festival] [2026].";

export const laurelPlace = (L: ReturnType<typeof useLayout>) => ({ cx: L.stage.cx, cy: L.stage.cy, height: L.stage.size * (L.tall ? 0.92 : 0.95) });

export const Opening: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  // the card
  const cw = L.tall ? 900 * s : L.wide ? 1040 * s : 880 * s;
  const fs = (L.tall ? 47 : L.wide ? 42 : 40) * s;
  const pad = (L.tall ? 64 : 54) * s;
  const cardLeft = L.cx - cw / 2;
  const cardTop0 = L.tall ? 300 * s : L.wide ? 130 * s : 110 * s;

  // measure where the three phrases sit in the card, once
  const textRef = useRef<HTMLDivElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const [rects, setRects] = useState<number[][] | null>(null);
  const [cardH, setCardH] = useState(0);
  const [origin, setOrigin] = useState([0, 0]);
  const [handle] = useState(() => delayRender("Measuring the email"));
  useLayoutEffect(() => {
    if (rects) return;
    const r = spans.current.map((el) => (el ? [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight] : [0, 0, 0, 0]));
    setRects(r);
    setCardH(textRef.current?.parentElement?.offsetHeight ?? 0);
    setOrigin([textRef.current?.offsetLeft ?? 0, textRef.current?.offsetTop ?? 0]);
    continueRender(handle);
  }, [rects, handle]);

  // the card sits on the stage, where the laurel will grow
  const cardTop = cardH ? Math.max(cardTop0, L.stage.cy - cardH / 2 - (L.tall ? 60 : 20) * s) : cardTop0;
  // time
  const tLift = T.lift, flight = 15;
  const q = interpolate(f, [tLift, tLift + flight], [0, 1], { ...cl, easing: glide });
  const away = interpolate(f, [tLift - 2, tLift + 10], [0, 1], { ...cl, easing: settle });
  const push = interpolate(f, [0, tLift], [1, 1.035], cl);
  const cardIn = 1;

  // the laurel and where each of its lines is on screen
  const place = laurelPlace(L);
  const box = fitBox(HERO.viewBox, place.cx, place.cy, place.height);
  const items = HERO.items.map((it) => it.bbox);
  const union = (a: number[], b: number[]) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0] + a[2], b[0] + b[2]) - Math.min(a[0], b[0]), Math.max(a[1] + a[3], b[1] + b[3]) - Math.min(a[1], b[1])];
  const targets = [items[0], union(items[1], items[2]), items[3]].map((b) => {
    const [x0, y0] = box.at(b[0], b[1]);
    return [x0, y0, b[2] * box.k, b[3] * box.k];
  });
  // card space <-> screen: the card is scaled by `push` about its center
  const ch = cardH || 600 * s;
  const ccx = cardLeft + cw / 2, ccy = cardTop + ch / 2;
  const toLocal = (x: number, y: number) => [cw / 2 + (x - ccx) / push, ch / 2 + (y - ccy) / push];

  const growP = interpolate(f, [T.grow, T.grow + 28], [0, 1], cl);
  const arrive = interpolate(f, [tLift + flight - 4, tLift + flight + 1], [0, 1], cl);
  const lines = [arrive, arrive, arrive, arrive];
  const hl = [T.hl1, T.hl2, T.hl3].map((t) => interpolate(f, [t, t + 6], [0, 1], { ...cl, easing: settle }));

  let k = 0;
  const parts = BODY.split(/(\[[^\]]+\])/).filter(Boolean);
  let wordIndex = 0;
  // the email writes itself in from the first frame, a word every 0.7 frames
  const wordIn = (i: number) => interpolate(f, [i * 0.7 - 4, i * 0.7 + 2], [0, 1], { ...cl, easing: settle });

  return (
    <>
      {/* the email */}
      <div
        style={{
          position: "absolute",
          left: cardLeft,
          top: cardTop,
          width: cw,
          transform: `scale(${push}) translateY(${(1 - cardIn) * 40 * s}px)`,
          transformOrigin: "50% 50%",
          opacity: cardIn,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: C.paper,
            borderRadius: 30 * s,
            boxShadow: `0 ${30 * s}px ${90 * s}px rgba(0,0,0,0.45)`,
            opacity: 1 - away,
            transform: `scale(${1 - away * 0.04})`,
          }}
        />
        <div style={{ position: "relative", padding: pad, opacity: 1 }}>
          <div style={{ opacity: 1 - away }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 * s, marginBottom: 30 * s }}>
              <div style={{ width: 64 * s, height: 64 * s, borderRadius: "50%", background: C.bay, color: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 34 * s }}>Y</div>
              <div>
                <div style={{ fontFamily: FONT.text, fontWeight: 600, fontSize: fs * 0.62, color: C.grove }}>Your Festival</div>
                <div style={{ fontFamily: FONT.data, fontSize: fs * 0.48, color: "#5d6e64", letterSpacing: "0.04em" }}>to me</div>
              </div>
            </div>
            <div style={{ fontFamily: FONT.text, fontWeight: 600, fontSize: fs * 1.02, color: C.grove, lineHeight: 1.2, marginBottom: 26 * s, letterSpacing: "-0.01em" }}>
              Your film has been selected
            </div>
            <div style={{ height: 2 * s, background: "#d9e0d5", marginBottom: 30 * s }} />
            <div style={{ fontFamily: FONT.text, fontSize: fs, color: "#2c3d33", marginBottom: 22 * s, opacity: wordIn(0) }}>Dear filmmaker,</div>
          </div>
          <div ref={textRef} style={{ position: "relative", fontFamily: FONT.text, fontSize: fs, lineHeight: 1.5, color: "#2c3d33" }}>
            {parts.map((part, pi) => {
              if (part.startsWith("[")) {
                const i = k++;
                const w = part.slice(1, -1);
                const r = rects?.[i];
                const tg = targets[i];
                let tf = "";
                if (r && q > 0) {
                  const [lx, ly] = toLocal(tg[0] + tg[2] / 2, tg[1] + tg[3] / 2);
                  const dx = lx - (origin[0] + r[0] + r[2] / 2), dy = ly - (origin[1] + r[1] + r[3] / 2);
                  const sc = tg[2] / push / r[2];
                  tf = `translate(${dx * q}px, ${dy * q}px) scale(${1 + (sc - 1) * q})`;
                }
                const wi = wordIndex;
                wordIndex += w.split(" ").length;
                return (
                  <span
                    key={pi}
                    ref={(el) => {
                      spans.current[i] = el;
                    }}
                    style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", transform: tf, transformOrigin: "50% 50%", opacity: wordIn(wi) * (1 - arrive), zIndex: 2 }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: -6 * s,
                        right: -6 * s,
                        top: "8%",
                        bottom: "4%",
                        background: C.newLeaf,
                        borderRadius: 6 * s,
                        transform: `scaleX(${hl[i]})`,
                        transformOrigin: "0 50%",
                        opacity: 1 - q,
                      }}
                    />
                    <span style={{ position: "relative", color: q > 0 ? `color-mix(in srgb, ${C.grove} ${100 - q * 100}%, #f4e3a8)` : C.grove, fontWeight: hl[i] > 0 ? 600 : 400 }}>{w}</span>
                  </span>
                );
              }
              return (
                <span key={pi} style={{ opacity: 1 - away }}>
                  {part.split(/(\s+)/).map((tok, ti) => {
                    if (!tok.trim()) return tok;
                    const o = wordIn(wordIndex++);
                    return (
                      <span key={ti} style={{ opacity: o }}>
                        {tok}
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </div>
          <div style={{ opacity: 1 - away, fontFamily: FONT.text, fontSize: fs, color: "#2c3d33", marginTop: 22 * s }}>
            <span style={{ opacity: wordIn(wordIndex + 1) }}>Congratulations, and see you there.</span>
          </div>
        </div>
      </div>

      {/* the laurel it becomes */}
      {f >= tLift ? <GrowLaurel id="hero" file={HERO.file} vb={HERO.viewBox} {...place} p={growP} lines={lines} sheen={interpolate(f, [T.sheen, T.sheen + 22], [-0.3, 1.3], cl)} /> : null}

      {/* captions */}
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: f < T.lift + 12 && L.tall ? cardTop + ch * push + 56 * s : L.capY, textAlign: "center" }}>
        {f < T.lift + 12 ? (
          <Words text="Paste the festival's email." f={f - T.capEmail} out={T.lift - T.capEmail} size={ty.lead} font={FONT.lead} color={C.paper} />
        ) : (
          <Words text="Daphne makes the laurel." f={f - T.capLaurel} out={T.looks - 6 - T.capLaurel} size={ty.lead} font={FONT.lead} color={C.paper} />
        )}
      </div>
    </>
  );
};
