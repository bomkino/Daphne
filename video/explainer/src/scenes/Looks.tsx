import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { GrowLaurel } from "../components/GrowLaurel";
import { Words } from "../components/Words";
import laurels from "../data/laurels.json";
import { type, useLayout } from "../lib/layout";
import { hit } from "../lib/motion";
import { beatFrame, T } from "../timeline";
import { laurelPlace } from "./Opening";

// Same words, another look, on every beat: quarters, then eighths, then sixteenths, then the camera pulls
// back to all 78 at once. Every card is a real preset from the app, drawn by its engine. The sixteenths
// stay on dark grounds, so the cuts never flash light and dark faster than three times a second.
const LOOKS = laurels.looks;
const RUN = [
  ...[1, 15, 29, 14].map((i, n) => ({ i, beat: 17 + n })),
  ...[7, 16, 20, 26, 4, 30, 12, 61].map((i, n) => ({ i, beat: 21 + n / 2 })),
  ...[2, 3, 5, 8, 10, 32, 36, 37, 49, 50, 52, 56, 57, 59, 60, 64].map((i, n) => ({ i, beat: 25 + n / 4 })),
];
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Card: React.FC<{ look: (typeof LOOKS)[number]; w: number; h: number; r: number; style?: React.CSSProperties }> = ({ look, w, h, r, style }) => (
  <div style={{ position: "absolute", width: w, height: h, borderRadius: r, background: look.bg ?? "#111", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
    <Img src={staticFile(look.file)} style={{ width: "86%", height: "86%", objectFit: "contain" }} />
  </div>
);

export const Looks: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  const place = laurelPlace(L);
  // the card on stage
  const ch = L.stage.size * (L.tall ? 0.86 : 0.9);
  const cw = ch * 0.9;
  const cr = 26 * s;
  // which look is on stage now
  let cur = -1;
  for (let n = 0; n < RUN.length; n++) if (f >= beatFrame(RUN[n].beat)) cur = n;
  const kick = cur >= 0 ? hit(f, beatFrame(RUN[cur].beat), 5) : 0;
  // the card arrives behind the grown laurel on the first beat
  const cardIn = interpolate(f, [T.looks - 4, T.looks + 3], [0, 1], { ...cl, easing: settle });

  // the grid of all 78
  const cols = L.tall ? 8 : L.wide ? 13 : 10;
  const rows = Math.ceil(LOOKS.length / cols);
  const gap = 10 * s;
  const areaW = L.W - (L.tall ? 70 : 140) * s;
  const areaH = L.H - (L.tall ? 480 : 220) * s;
  const cellW = Math.min((areaW - gap * (cols - 1)) / cols, ((areaH - gap * (rows - 1)) / rows) / 1.11);
  const cellH = cellW * 1.11;
  const gridW = cols * cellW + (cols - 1) * gap, gridH = rows * cellH + (rows - 1) * gap;
  const gx = L.cx - gridW / 2, gy = L.stage.cy - gridH / 2 + (L.tall ? -40 : 0) * s;
  const cellAt = (i: number) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = r === rows - 1 ? LOOKS.length - r * cols : cols;
    const off = ((cols - inRow) * (cellW + gap)) / 2;
    return [gx + off + c * (cellW + gap), gy + r * (cellH + gap)];
  };
  const last = RUN[RUN.length - 1].i;
  const zoom = interpolate(f, [T.grid, T.grid + 20], [0, 1], { ...cl, easing: glide });
  // camera: from the last card filling the stage to the whole grid
  const [lx, ly] = cellAt(last);
  const kA = cw / cellW;
  const camK = kA + (1 - kA) * zoom;
  const fx = lx + cellW / 2, fy = ly + cellH / 2;
  // the camera looks at a point that travels from the card to the grid's center, so the move stays centered
  const gcx = gx + gridW / 2, gcy = gy + gridH / 2;
  const px = fx + (gcx - fx) * zoom, py = fy + (gcy - fy) * zoom;
  const ox = L.stage.cx + (gcx - L.stage.cx) * zoom, oy = L.stage.cy + (gcy - L.stage.cy) * zoom;
  const tx = ox - px * camK;
  const tyy = oy - py * camK;
  const dimGrid = interpolate(f, [T.capLooks + 4, T.capLooks + 14], [1, 0.3], { ...cl, easing: settle });
  const leave = interpolate(f, [T.festivals - 6, T.festivals + 4], [0, 1], { ...cl, easing: settle });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - leave }}>
      {f < T.grid ? (
        <>
          {/* the laurel that was just grown keeps its place until the first card covers it */}
          {f < T.looks + 1 ? <GrowLaurel id="hero2" file={laurels.hero.file} vb={laurels.hero.viewBox} {...place} p={1} /> : null}
          {cur >= 0 ? (
            <Card
              look={LOOKS[RUN[cur].i]}
              w={cw}
              h={ch}
              r={cr}
              style={{ left: L.stage.cx - cw / 2, top: L.stage.cy - ch / 2, transform: `scale(${(0.94 + 0.06 * cardIn) * (1 + kick * 0.018)})`, opacity: cardIn, boxShadow: `0 ${24 * s}px ${70 * s}px rgba(0,0,0,0.5)` }}
            />
          ) : null}
          {cur >= 0 ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: L.stage.cy + ch / 2 + 34 * s, textAlign: "center", fontFamily: FONT.data, fontWeight: 500, fontSize: ty.eyebrow, letterSpacing: "0.16em", textTransform: "uppercase", color: C.newLeaf, opacity: cardIn }}>
              {LOOKS[RUN[cur].i].name}
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, width: L.W, height: L.H, transform: `translate(${tx}px, ${tyy}px) scale(${camK})`, transformOrigin: "0 0" }}>
          {LOOKS.map((look, i) => {
            const [x, y] = cellAt(i);
            // the others light up outward from the card we pulled back from
            const d = Math.hypot((x - lx) / cellW, (y - ly) / cellH);
            const on = i === last ? 1 : interpolate(f, [T.grid + 3 + d * 1.6, T.grid + 9 + d * 1.6], [0, 1], { ...cl, easing: settle });
            return <Card key={i} look={look} w={cellW} h={cellH} r={cr / kA + 4 * s} style={{ left: x, top: y, opacity: on * dimGrid, transform: `scale(${0.9 + 0.1 * on})` }} />;
          })}
        </div>
      )}
      {f >= T.capLooks ? (
        <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.stage.cy - 150 * s, textAlign: "center", textShadow: "0 0 40px rgba(11,27,19,0.9)" }}>
          <Words text="78 looks." f={f - T.capLooks} size={ty.headline * 1.9} font={FONT.display} color={C.paper} style={{ letterSpacing: "-0.02em" }} />
          <Words text="Your words stay put." f={f - T.capLooks - 10} size={ty.lead} font={FONT.lead} color={C.paper} style={{ marginTop: 18 * s }} />
        </div>
      ) : null}
    </div>
  );
};
