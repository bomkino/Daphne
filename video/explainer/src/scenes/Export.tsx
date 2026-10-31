import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { Poster, Signature, Story, Trailer, Web } from "../components/Mocks";
import { Words } from "../components/Words";
import { type, useLayout } from "../lib/layout";
import { beatFrame, T } from "../timeline";

// The export studio, by where the laurel is going. One camera move travels along the places a laurel
// lives, landing on each on its beat; then the formats.
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const STOPS = [
  { at: "poster", label: "Poster · vector PDF, 300 dpi PNG" },
  { at: "trailer", label: "Trailer · transparent 4K end card" },
  { at: "social", label: "Socials · square, portrait and story" },
  { at: "web", label: "Website · SVG with alt text" },
  { at: "sig", label: "Email signature" },
] as const;
const FORMATS = ["PNG", "SVG", "PDF", "MP4"];

export const Export: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  const Z = L.stage.size;
  // each place, sized to the stage
  const box = (i: number) => {
    const k = L.tall ? 1 : L.wide ? 1.12 : 0.95;
    return [
      { w: Z * (L.tall ? 0.7 : 0.62) * k, h: 0 },
      { w: Z * (L.tall ? 1.08 : 1.25) * k, h: 0 },
      { w: Z * (L.tall ? 0.56 : 0.5) * k, h: 0 },
      { w: Z * (L.tall ? 1.05 : 1.2) * k, h: 0 },
      { w: Z * (L.tall ? 0.95 : 1.0) * k, h: 0 },
    ][i];
  };
  const gap = Z * 0.35;
  const xs: number[] = [];
  let x = 0;
  for (let i = 0; i < STOPS.length; i++) {
    const w = box(i).w;
    xs.push(x + w / 2);
    x += w + gap;
  }
  // the camera: on each stop from its beat
  const cues = STOPS.map((st) => T[st.at as keyof typeof T] as number);
  let camX = xs[0];
  for (let i = 1; i < cues.length; i++) camX += (xs[i] - xs[i - 1]) * interpolate(f, [cues[i] - 8, cues[i] + 6], [0, 1], { ...cl, easing: glide });
  const enter = interpolate(f, [T.export - 4, T.poster + 6], [0, 1], { ...cl, easing: settle });
  const toFormats = interpolate(f, [T.formats - 6, T.formats + 6], [0, 1], { ...cl, easing: glide });
  const leave = interpolate(f, [T.fixer - 8, T.fixer], [0, 1], { ...cl, easing: settle });
  const stageY = L.stage.cy - (L.tall ? 30 : 30) * s;
  let cur = 0;
  for (let i = 0; i < cues.length; i++) if (f >= cues[i] - 6) cur = i;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - leave }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: L.W, height: L.H, transform: `translate(${L.cx - camX - toFormats * L.W * 0.6}px, ${(1 - enter) * 120 * s}px)`, opacity: enter * (1 - toFormats) }}>
        {STOPS.map((st, i) => {
          const b = box(i);
          const near = Math.max(0, 1 - Math.abs(camX - xs[i]) / (b.w / 2 + gap));
          const Comp = [Poster, Trailer, Story, Web, Signature][i];
          return (
            <div key={st.at} style={{ position: "absolute", left: xs[i], top: stageY, transform: `translate(-50%, -50%) scale(${0.86 + 0.14 * near})`, opacity: 0.35 + 0.65 * near }}>
              <Comp w={b.w} />
            </div>
          );
        })}
      </div>
      {/* what each place gets */}
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.tall ? 1100 * s : L.wide ? 760 * s : 790 * s, textAlign: "center", opacity: enter * (1 - toFormats) }}>
        <div key={cur} style={{ fontFamily: FONT.data, fontWeight: 500, fontSize: ty.eyebrow, letterSpacing: "0.14em", textTransform: "uppercase", color: C.newLeaf, opacity: interpolate(f, [cues[cur] - 4, cues[cur] + 4], [0, 1], { ...cl, easing: settle }) }}>
          {STOPS[cur].label}
        </div>
      </div>
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.tall ? 1170 * s : L.wide ? 830 * s : 860 * s, textAlign: "center" }}>
        <Words text="Export for wherever it's going." f={f - T.export} out={T.formats - 6 - T.export} size={ty.lead} font={FONT.lead} color={C.paper} />
      </div>
      {/* the formats */}
      {f >= T.formats - 6 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: L.stage.cy - 70 * s, display: "flex", justifyContent: "center", gap: 22 * s }}>
          {FORMATS.map((t, i) => {
            const p = interpolate(f, [beatFrame(53 + i * 0.5), beatFrame(53 + i * 0.5) + 6], [0, 1], { ...cl, easing: settle });
            return (
              <div key={t} style={{ fontFamily: FONT.data, fontWeight: 500, fontSize: ty.headline * 0.62, letterSpacing: "0.08em", color: C.grove, background: C.newLeaf, borderRadius: 999, padding: `${16 * s}px ${34 * s}px`, opacity: p, transform: `translateY(${(1 - p) * 30 * s}px)` }}>
                {t}
              </div>
            );
          })}
        </div>
      ) : null}
      {f >= T.formats ? (
        <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.stage.cy + 90 * s, textAlign: "center" }}>
          <Words text="Every size it needs, in one go." f={f - T.formats - 8} out={T.fixer - 8 - T.formats - 8} size={ty.lead} font={FONT.lead} color={C.paper} />
        </div>
      ) : null}
    </div>
  );
};
