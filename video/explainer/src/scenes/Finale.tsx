import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, glide, grow, MARK, settle } from "../brand/daphne";
import { textWidth } from "../brand/fonts";
import { GrowLeaf, LeafShape } from "../components/Leaf";
import { Words } from "../components/Words";
import { type, useLayout } from "../lib/layout";
import { beatFrame, T } from "../timeline";

// The freedoms, set between the logo's two leaves, the way the brand says anything worth honoring can
// be: (free), (no account), (no watermark), (open source). Then the words make way, the leaves glide out
// to the logo's own places and her name rises between them. One continuous move from the last idea to us.
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WORDS = [
  { t: "free", at: "free", color: C.bloom }, // the one Bloom
  { t: "no account", at: "noAccount", color: C.paper },
  { t: "no watermark", at: "noWatermark", color: C.paper },
  { t: "open source", at: "openSource", color: C.paper },
] as const;
const LK = MARK.lockup;
const GAP_L = 85, GAP_R = 66; // the logo's own optical gaps, in font units

export const Finale: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  // two states of one group, in font units (1000 per em): the word in brackets, and the logo
  const kWord = (ty.headline * 1.45) / 1000;
  const logoW = L.tall ? 880 * s : L.wide ? 1120 * s : 780 * s; // the outro's logo is 1120 px wide at 16:9
  const kLogo = logoW / (LK.box[2] - LK.box[0]);
  const yWord = L.stage.cy + 40 * s;
  const yLogo = L.tall ? 830 * s : L.wide ? 470 * s : 500 * s;
  const toLogo = interpolate(f, [T.logo - 4, T.logo + 14], [0, 1], { ...cl, easing: glide });
  const k = kWord + (kLogo - kWord) * toLogo;
  const base = yWord + (yLogo - yWord) * toLogo;
  // the logo's box center sits on the frame's center line
  const logoCx = (LK.box[0] + LK.box[2]) / 2;

  // which word is between the leaves, and how wide it is
  const widthOf = (i: number) => (i < 0 ? 300 : textWidth(WORDS[i].t, `400 1000px "PD Head"`));
  // the leaves move to fit each new word over a few frames
  let half = widthOf(0) / 2;
  for (let i = 1; i < WORDS.length; i++) {
    const t0 = T[WORDS[i].at as keyof typeof T] as number;
    half += ((widthOf(i) - widthOf(i - 1)) / 2) * interpolate(f, [t0 - 6, t0 + 2], [0, 1], { ...cl, easing: glide });
  }
  // in the logo, the word starts at 0 and the leaves sit at their own gaps
  const halfLogo = LK.wordW / 2;
  const h = half + (halfLogo - half) * toLogo;
  const shift = -logoCx + LK.wordW / 2; // centers the logo's box rather than its word
  const xL = -h - GAP_L + shift * toLogo, xR = h + GAP_R + shift * toLogo;
  const leafP = interpolate(f, [T.free - 9, T.free + 10], [0, 1], { ...cl, easing: grow });
  const leafP2 = interpolate(f, [T.free - 7, T.free + 12], [0, 1], { ...cl, easing: grow });
  const hero = interpolate(f, [T.logo + 6, T.logo + 14], [0, 1], cl); // the hero leaves, with their veins, take over once in place

  // the heartbeat in the hold: lub-dub at 52 a minute (every two beats at 104), under half a percent
  const beatsIn = (f - T.tagline) / (beatFrame(3) - beatFrame(1));
  const pulse = (x: number) => (x < 0 ? 0 : Math.exp(-x * 9) * (1 - Math.exp(-x * 60)));
  const ph = beatsIn - Math.floor(beatsIn);
  const breath = f > T.tagline ? 1 + 0.004 * (pulse(ph) + 0.6 * pulse(ph - 0.24 / 1.1538)) : 1;

  const sw = L.W, shh = L.H;
  const wordOut = interpolate(f, [T.logo - 6, T.logo + 2], [0, 1], { ...cl, easing: settle });
  const fallT = Math.max(0, f - T.leafFall);
  const fallDur = T.end - T.leafFall; // gone by T.end, so the last frame holds still for over a second
  const tagY = base + (LK.box[3] + 260) * kLogo;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* one leaf falls: the only exit, behind the words so they stay clear */}
      {f >= T.leafFall && fallT <= fallDur ? (
        <LeafShape
          size={150 * s}
          fill={C.newLeaf}
          style={{
            position: "absolute",
            left: L.W * 0.7 + Math.sin(fallT / 16) * 90 * s - fallT * 1.2 * s,
            // it appears inside the frame and fades before the bottom, so no edge ever cuts it (as in the sting)
            top: L.H * 0.04 + (fallT / fallDur) * L.H * 0.82,
            transform: `rotate(${30 + Math.sin(fallT / 12) * 40}deg)`,
            opacity: 0.85 * interpolate(fallT, [0, 10, fallDur - 18, fallDur], [0, 1, 1, 0], cl),
          }}
        />
      ) : null}
      <svg width={sw} height={shh} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`translate(${L.cx} ${base}) scale(${k * breath})`}>
          <g transform={`translate(${xL} 0)`} opacity={1 - hero}>
            <GrowLeaf id="bl" leaf={MARK.bracket.L} p={leafP} fill={C.newLeaf} />
          </g>
          <g transform={`translate(${xR} 0)`} opacity={1 - hero}>
            <GrowLeaf id="br" leaf={MARK.bracket.R} p={leafP2} fill={C.newLeaf} />
          </g>
          {hero > 0 ? (
            <g transform={`translate(${-LK.wordW / 2 + shift} 0)`} opacity={hero}>
              <g fill={C.newLeaf}>
                <path fillRule="evenodd" d={LK.L.d} />
                <path d={LK.L.stalk} />
                <path fillRule="evenodd" d={LK.R.d} />
                <path d={LK.R.stalk} />
              </g>
            </g>
          ) : null}
          {/* the words between the leaves */}
          {WORDS.map((w, i) => {
            const t0 = T[w.at as keyof typeof T] as number;
            const next = i < WORDS.length - 1 ? (T[WORDS[i + 1].at as keyof typeof T] as number) : T.logo;
            const inP = interpolate(f, [t0, t0 + 8], [0, 1], { ...cl, easing: settle });
            const outP = interpolate(f, [next - 7, next - 1], [0, 1], { ...cl, easing: settle });
            if (inP <= 0 || outP >= 1) return null;
            return (
              <text key={w.t} x={0} y={(1 - inP) * 120 - outP * 120} textAnchor="middle" fontFamily='"PD Head"' fontWeight={400} fontSize={1000} fill={w.color} opacity={inP * (1 - outP) * (i === WORDS.length - 1 ? 1 - wordOut : 1)} style={{ letterSpacing: "-0.01em" }}>
                {w.t}
              </text>
            );
          })}
          {/* her name, a letter every two frames */}
          <g transform={`translate(${-LK.wordW / 2 + shift} 0)`} fill={C.paper}>
            {LK.letters.map((l, i) => {
              const p = interpolate(f, [T.logo + 6 + i * 2, T.logo + 6 + i * 2 + 13], [0, 1], { ...cl, easing: settle });
              return <path key={i} d={l.d} transform={`translate(${l.x} ${l.y + (1 - p) * 70})`} opacity={p} />;
            })}
          </g>
        </g>
      </svg>
      {/* the words under the logo */}
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: tagY, textAlign: "center" }}>
        {f >= T.tagline - 2 ? (
          <>
            <Words text="Make festival laurels for your film." f={f - T.tagline} size={(L.wide ? 54 : 52) * s} font={FONT.lead} color={C.paper} stagger={1.5} />
            <Words text="It's free." f={f - T.tagline - 9} size={(L.wide ? 54 : 52) * s} font={FONT.lead} color={C.paper} stagger={1.5} />
          </>
        ) : null}
        <div style={{ marginTop: 34 * s, fontFamily: FONT.data, fontWeight: 500, fontSize: (L.wide ? 34 : 36) * s, letterSpacing: "0.04em", color: C.newLeaf, opacity: interpolate(f, [T.url, T.url + 10], [0, 1], { ...cl, easing: settle }), transform: `translateY(${(1 - interpolate(f, [T.url, T.url + 10], [0, 1], { ...cl, easing: settle })) * 12 * s}px)` }}>
          pitch.dog/daphne
        </div>
        <div style={{ marginTop: (L.tall ? 64 : 46) * s, fontFamily: FONT.text, fontSize: 32 * s, color: "rgba(243,246,239,0.72)", opacity: interpolate(f, [T.madeBy, T.madeBy + 12], [0, 1], { ...cl, easing: settle }) }}>
          Made by pitch.dog
        </div>
      </div>
      {/* the freedoms' last line: what happens to what you make */}
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: yWord + (L.tall ? 200 : 170) * s, textAlign: "center", opacity: 1 - wordOut }}>
        {f >= T.noWatermark ? <Words text="Nothing you make leaves your device unless you share it." f={f - T.noWatermark - 4} size={ty.lead * 0.9} font={FONT.lead} color={C.paper} /> : null}
      </div>
    </div>
  );
};
