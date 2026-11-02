import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, glide, settle } from "../brand/daphne";
import { Words } from "../components/Words";
import { type, useLayout } from "../lib/layout";
import { T } from "../timeline";

// 268 festivals from 60 countries in the app's list (prototype/festivals.js, October 2026). The brand never
// shows a real festival's name, so the list is the count, and the search finds "Your Festival".
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const QUERY = "your fes";

export const Festivals: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const ty = type(L);
  const s = L.s;
  const enter = interpolate(f, [T.festivals - 2, T.festivals + 10], [0, 1], { ...cl, easing: settle });
  const leave = interpolate(f, [T.export - 6, T.export + 2], [0, 1], { ...cl, easing: settle });
  const n = Math.round(268 * interpolate(f, [T.count, T.count + 20], [0, 1], { ...cl, easing: glide }));
  const typed = QUERY.slice(0, Math.max(0, Math.floor((f - T.capFest) / 2)));
  const caret = Math.floor(f / 6) % 2 === 0 || (f - T.capFest) / 2 < QUERY.length;
  const drop = interpolate(f, [T.capFest + 12, T.capFest + 20], [0, 1], { ...cl, easing: settle });
  const pick = interpolate(f, [T.pick, T.pick + 8], [0, 1], { ...cl, easing: settle });
  const pw = Math.min(L.W - (L.tall ? 160 : 240) * s, 840 * s);
  const numY = L.tall ? 330 * s : L.wide ? 70 * s : 60 * s;
  const panelY = L.tall ? 720 * s : L.wide ? 470 * s : 450 * s;
  const fs = (L.tall ? 42 : 36) * s;
  const rowH = fs * 2.3;
  const facts = ["Its official name", "City and country", "Official site", "Laurel rules, where published"];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter * (1 - leave), transform: `translateY(${(1 - enter) * 30 * s - leave * 30 * s}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: numY, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.display, fontSize: ty.headline * 2.6, color: C.paper, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{n}</div>
        <Words text="festivals from 60 countries." f={f - T.count - 6} size={ty.lead} font={FONT.lead} color={C.paper} style={{ marginTop: 10 * s }} />
      </div>
      {/* the search, as in the Words tab */}
      <div
        style={{
          position: "absolute",
          left: L.cx - pw / 2,
          top: panelY,
          width: pw,
          borderRadius: 26 * s,
          background: "rgba(243,246,239,0.07)",
          border: `${1.5 * s}px solid rgba(243,246,239,0.16)`,
          boxShadow: `0 ${20 * s}px ${60 * s}px rgba(0,0,0,0.35)`,
          overflow: "hidden",
          opacity: interpolate(f, [T.capFest - 6, T.capFest + 2], [0, 1], { ...cl, easing: settle }),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 * s, padding: `${22 * s}px ${28 * s}px` }}>
          <svg width={fs} height={fs} viewBox="0 0 24 24" fill="none" stroke={C.newLeaf} strokeWidth={2.2} strokeLinecap="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
          <div style={{ fontFamily: FONT.text, fontSize: fs, color: C.paper }}>
            {typed}
            <span style={{ display: "inline-block", width: 3 * s, height: fs * 1.05, marginLeft: 3 * s, background: C.newLeaf, verticalAlign: "-0.15em", opacity: caret ? 1 : 0 }} />
          </div>
        </div>
        <div style={{ height: (rowH + (rowH * 0.9 + 14 * s) * facts.length * pick) * drop, overflow: "hidden" }}>
          <div style={{ borderTop: `${1.5 * s}px solid rgba(243,246,239,0.12)`, padding: `${16 * s}px ${28 * s}px`, background: `rgba(184,229,154,${0.1 + 0.06 * pick})` }}>
            <div style={{ fontFamily: FONT.text, fontWeight: 600, fontSize: fs, color: C.paper }}>Your Festival</div>
          </div>
          <div style={{ padding: `${8 * s}px ${28 * s}px ${20 * s}px` }}>
            {facts.map((t, i) => {
              const p = interpolate(f, [T.pick + 3 + i * 3, T.pick + 11 + i * 3], [0, 1], { ...cl, easing: settle });
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 18 * s, height: rowH * 0.9, opacity: p, transform: `translateY(${(1 - p) * 12 * s}px)` }}>
                  <svg width={fs * 0.8} height={fs * 0.8} viewBox="0 0 24 24" fill="none" stroke={C.newLeaf} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4 12.5 5 5L20 6.5" />
                  </svg>
                  <div style={{ fontFamily: FONT.text, fontSize: fs * 0.9, color: "rgba(243,246,239,0.86)" }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
