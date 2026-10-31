import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { Words } from "../components/Words";
import laurels from "../data/laurels.json";
import { type, useLayout } from "../lib/layout";
import { beatFrame, T } from "../timeline";

// The festival pack, with the app's own defaults: four statuses and three awards (prototype/studio.js),
// in color, black and white, landing one per sixteenth note.
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const PACK = laurels.pack;
const LABELS = [...new Set(PACK.map((p) => p.label))];
const ORDER = ["Official Selection", "Finalist", "Semi-Finalist", "Honorable Mention", "Best Feature Film", "Best Short Film", "Audience Award"].filter((l) => LABELS.includes(l));
const WAYS = ["color", "black", "white"] as const;
const GROUND = { color: "#0B1B13", black: C.paper, white: "#2C4A3A" };

export const Pack: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  // tall: a row per laurel, a column per colorway, big, with the camera riding down the rows as they
  // land and pulling back to the whole pack; wider frames turn it on its side and see it all at once
  const byRow = L.tall;
  const cols = byRow ? 3 : ORDER.length, rows = byRow ? ORDER.length : 3;
  const gap = 14 * s;
  const viewTop = L.tall ? 230 * s : L.wide ? 110 * s : 150 * s;
  const viewH = L.tall ? 860 * s : L.wide ? 600 * s : 560 * s;
  const areaW = L.W - (L.tall ? 180 : L.wide ? 260 : 180) * s; // inside the 80 px margin on every size
  const cw = byRow ? (areaW - gap * (cols - 1)) / cols : Math.min((areaW - gap * (cols - 1)) / cols, (viewH - gap * (rows - 1)) / rows / 1.1);
  const ch = cw * (byRow ? 0.86 : 1.1);
  const gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap;
  const land = (n: number) => beatFrame(65.5 + n / 4);
  let k = 1, top = viewTop;
  if (byRow) {
    const scroll = (gh - viewH) * interpolate(f, [land(3), land(ORDER.length * 3 - 2)], [0, 1], { ...cl, easing: settle });
    const z = interpolate(f, [beatFrame(70.5), beatFrame(71.5)], [0, 1], { ...cl, easing: glide });
    k = 1 + (viewH / gh - 1) * z;
    top = (viewTop - scroll) * (1 - z) + viewTop * z;
  }
  const gx = L.cx - (gw * k) / 2, gy = top;
  const leave = interpolate(f, [T.free - 10, T.free - 2], [0, 1], { ...cl, easing: settle });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - leave, transform: `scale(${1 - leave * 0.04})`, maskImage: L.tall ? `linear-gradient(180deg, transparent ${60 * s}px, #000 ${viewTop}px)` : undefined }}>
      {ORDER.flatMap((label, li) =>
        WAYS.map((way, wi) => {
          const p = PACK.find((q) => q.label === label && q.way === way)!;
          const n = li * 3 + wi;
          const t = land(n);
          const on = interpolate(f, [t - 1, t + 5], [0, 1], { ...cl, easing: settle });
          const c = byRow ? wi : li, r = byRow ? li : wi;
          return (
            <div key={`${label}-${way}`} style={{ position: "absolute", left: gx + c * (cw + gap) * k, top: gy + r * (ch + gap) * k, width: cw * k, height: ch * k, borderRadius: 14 * s * k, background: GROUND[way], opacity: on, transform: `translateY(${(1 - on) * 24 * s}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile(p.file)} style={{ width: "84%", height: "84%", objectFit: "contain" }} />
            </div>
          );
        }),
      )}
      <div style={{ position: "absolute", left: L.safe.left, right: L.safe.right, top: L.tall ? L.capY : viewTop + Math.min(gh, viewH) + 34 * s, textAlign: "center" }}>
        <Words text="Running a festival?" f={f - T.pack} size={ty.lead} font={FONT.lead} color={C.paper} />
        <Words text="Make the whole pack." f={f - T.pack - 6} size={ty.lead} font={FONT.lead} color={C.paper} />
        {f >= T.capPack ? (
          <Words text="Every status and award, in every colorway, with guidelines." f={f - T.capPack} size={ty.eyebrow} font={FONT.data} color={C.newLeaf} upper track={0.1} style={{ marginTop: 16 * s, lineHeight: 1.5 }} />
        ) : null}
      </div>
    </div>
  );
};
