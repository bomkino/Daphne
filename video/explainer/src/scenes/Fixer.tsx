import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { Poster } from "../components/Mocks";
import { Words } from "../components/Words";
import laurels from "../data/laurels.json";
import { type, useLayout } from "../lib/layout";
import { beatFrame, T } from "../timeline";

// The official-laurel fixer. A festival's own file usually arrives as a JPEG on a white box; on a dark
// poster that's a white rectangle. Daphne takes the background out, sets it in one ink and trims it.
// The "festival's file" here is a Daphne laurel saved the way festivals send them (scripts/laurels.mjs).
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const X = laurels.extra;
const STEPS = ["Background out", "One ink", "Trimmed"];

export const Fixer: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  const enter = interpolate(f, [T.fixer - 6, T.fixer + 6], [0, 1], { ...cl, easing: settle });
  const leave = interpolate(f, [T.pack - 6, T.pack + 2], [0, 1], { ...cl, easing: settle });
  const pw = L.stage.size * (L.tall ? 0.72 : L.wide ? 0.74 : 0.62);
  const ph = pw * 1.5;
  // the file, pasted on the poster: a box the size it came in
  const boxW = pw * 0.5, boxH = boxW * 1.25;
  const scan = interpolate(f, [T.fix, T.fix + 12], [0, 1], { ...cl, easing: glide });
  const settleIn = interpolate(f, [T.fix + 10, T.fix + 22], [0, 1], { ...cl, easing: settle });
  // after the fix, it shrinks to its own size and takes the slot
  const fit = 1 - 0.18 * settleIn;
  const top = ph * 0.05;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter * (1 - leave) }}>
      <div style={{ position: "absolute", left: L.stage.cx - pw / 2, top: L.stage.cy - ph / 2 + (L.tall ? 40 : 20) * s, transform: `scale(${0.96 + 0.04 * enter})` }}>
        <Poster
          w={pw}
          showLaurels={false}
          slot={
            <div style={{ position: "absolute", left: (pw - boxW) / 2, top, width: boxW, height: boxH, transform: `scale(${fit})`, transformOrigin: "50% 0" }}>
              {/* before: the festival's JPEG, white box and all */}
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${scan * 100}%)`, boxShadow: "0 4px 18px rgba(0,0,0,0.35)" }}>
                <Img src={staticFile("laurels/fixer-before.jpg")} style={{ width: "100%", height: "100%", objectFit: "fill" }} />
              </div>
              {/* after: clean edges, one ink, trimmed */}
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${(1 - scan) * 100}% 0 0)` }}>
                <Img src={staticFile(X.fixerClean.file)} style={{ position: "absolute", left: "7%", top: "8%", width: "86%", height: "84%", objectFit: "contain" }} />
              </div>
              {scan > 0 && scan < 1 ? <div style={{ position: "absolute", top: -10 * s, bottom: -10 * s, left: `${scan * 100}%`, width: 4 * s, marginLeft: -2 * s, background: C.newLeaf, boxShadow: `0 0 ${24 * s}px ${6 * s}px rgba(184,229,154,0.6)` }} /> : null}
            </div>
          }
        />
      </div>
      {/* what it did */}
      <div style={{ position: "absolute", left: 0, right: 0, top: L.stage.cy + ph / 2 + (L.tall ? 70 : 40) * s, display: "flex", justifyContent: "center", gap: 30 * s }}>
        {STEPS.map((t, i) => {
          const p = interpolate(f, [beatFrame(62 + i * 0.5), beatFrame(62 + i * 0.5) + 6], [0, 1], { ...cl, easing: settle });
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 * s, fontFamily: FONT.data, fontWeight: 500, fontSize: ty.eyebrow, letterSpacing: "0.12em", textTransform: "uppercase", color: C.newLeaf, opacity: p, transform: `translateY(${(1 - p) * 10 * s}px)` }}>
              <svg width={ty.eyebrow} height={ty.eyebrow} viewBox="0 0 24 24" fill="none" stroke={C.newLeaf} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="m4 12.5 5 5L20 6.5" />
              </svg>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.tall ? L.safe.top + 20 * s : L.wide ? 40 * s : 30 * s, textAlign: "center" }}>
        <Words text="The festival sent its own laurel?" f={f - T.fixer} out={T.fix - 2 - T.fixer} size={ty.lead} font={FONT.lead} color={C.paper} />
      </div>
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.tall ? L.safe.top + 20 * s : L.wide ? 40 * s : 30 * s, textAlign: "center" }}>
        {f >= T.fix ? <Words text="Daphne cleans it up." f={f - T.fix - 2} out={T.pack - 6 - T.fix - 2} size={ty.lead} font={FONT.lead} color={C.paper} /> : null}
      </div>
    </div>
  );
};
