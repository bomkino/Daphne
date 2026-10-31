import React from "react";
import { Img, staticFile } from "remotion";
import { C, FONT } from "../brand/daphne";
import laurels from "../data/laurels.json";

// Where a laurel goes: a poster, a trailer's end card, a story, a website, an email signature. Every
// film here is "Your Film", every person "Your Name": nobody's real work, and no real festival.
const X = laurels.extra;
const L = (file: string, style: React.CSSProperties) => <Img src={staticFile(file)} style={{ position: "absolute", objectFit: "contain", ...style }} />;

const Title: React.FC<{ w: number; style?: React.CSSProperties }> = ({ w, style }) => (
  <Img src={staticFile(X.posterTitle.file)} style={{ position: "absolute", width: w, left: "50%", transform: "translateX(-50%)", ...style }} />
);

const credits = (w: number, n: number, k: number) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: w * 0.012 }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ width: w * (0.62 - (i % 2) * 0.1) * k, height: w * 0.008, borderRadius: 2, background: "rgba(243,246,239,0.28)" }} />
    ))}
  </div>
);

// a night poster: a moon over dark hills, the title low, laurels at the top
export const Poster: React.FC<{ w: number; slot?: React.ReactNode; showLaurels?: boolean }> = ({ w, slot, showLaurels = true }) => {
  const h = w * 1.5;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.012, overflow: "hidden", background: "linear-gradient(180deg, #0c2230 0%, #10283a 38%, #1d3a44 62%, #0a1418 100%)", boxShadow: `0 ${w * 0.05}px ${w * 0.14}px rgba(0,0,0,0.55)` }}>
      <div style={{ position: "absolute", left: "58%", top: "33%", width: w * 0.3, height: w * 0.3, borderRadius: "50%", background: "radial-gradient(circle at 42% 40%, #f6f1df 0%, #e6dcc0 55%, #c9bd9b 100%)", boxShadow: `0 0 ${w * 0.18}px rgba(246,241,223,0.35)` }} />
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: "44%" }}>
        <path d="M0 30 C 14 22 24 26 36 20 C 50 13 62 24 74 19 C 86 14 94 18 100 16 L100 60 L0 60Z" fill="#0b1c22" />
        <path d="M0 40 C 18 34 30 38 46 33 C 62 28 78 37 100 31 L100 60 L0 60Z" fill="#071114" />
      </svg>
      {showLaurels ? (
        <>
          {L(X.whiteInk.file, { left: "12%", top: "4.5%", width: "34%", height: "23%" })}
          {L(X.blackTie.file, { right: "12%", top: "4.5%", width: "34%", height: "23%" })}
        </>
      ) : null}
      {slot}
      <Title w={w * 0.62} style={{ top: "70%" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "84%" }}>{credits(w, 3, 1)}</div>
    </div>
  );
};

// a trailer's last frame: laurels over black, then the title
export const Trailer: React.FC<{ w: number }> = ({ w }) => {
  const h = (w * 9) / 16;
  return (
    <div style={{ position: "relative", width: w, height: h, background: "#000", borderRadius: w * 0.01, overflow: "hidden", boxShadow: `0 ${w * 0.04}px ${w * 0.1}px rgba(0,0,0,0.6)` }}>
      {L(X.whiteInk.file, { left: "22%", top: "12%", width: "26%", height: "50%" })}
      {L(X.winner.file, { right: "22%", top: "12%", width: "26%", height: "50%" })}
      <Title w={w * 0.34} style={{ top: "68%" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "86%", textAlign: "center", fontFamily: FONT.data, fontSize: w * 0.018, letterSpacing: "0.3em", color: "rgba(243,246,239,0.6)" }}>COMING SOON</div>
    </div>
  );
};

// a story card: a dusk still, the laurel, the title
export const Story: React.FC<{ w: number }> = ({ w }) => {
  const h = (w * 16) / 9;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.07, overflow: "hidden", background: "#0b0b0b", boxShadow: `0 ${w * 0.06}px ${w * 0.16}px rgba(0,0,0,0.6)`, border: `${w * 0.018}px solid #0a0a0a` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #2a2440 0%, #6b3f4f 42%, #c7765a 66%, #2b1a1c 100%)" }} />
      <div style={{ position: "absolute", left: "-10%", right: "-10%", bottom: "-4%", height: "40%", background: "#120c0e", borderRadius: "50% 50% 0 0" }} />
      {L(X.whiteInk.file, { left: "22%", top: "10%", width: "56%", height: "30%" })}
      <Title w={w * 0.7} style={{ top: "64%" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "75%", textAlign: "center", fontFamily: FONT.text, fontSize: w * 0.045, color: "rgba(243,246,239,0.85)" }}>Premieres at Your Festival</div>
    </div>
  );
};

// a film's website: the title and its laurels in a row
export const Web: React.FC<{ w: number }> = ({ w }) => {
  const h = w * 0.66;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.02, overflow: "hidden", background: "#0e1113", boxShadow: `0 ${w * 0.04}px ${w * 0.1}px rgba(0,0,0,0.55)` }}>
      <div style={{ height: h * 0.09, background: "#1b1f22", display: "flex", alignItems: "center", gap: w * 0.012, padding: `0 ${w * 0.025}px` }}>
        {["#5a5f63", "#5a5f63", "#5a5f63"].map((c, i) => (
          <div key={i} style={{ width: w * 0.016, height: w * 0.016, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ marginLeft: w * 0.03, flex: 1, height: h * 0.05, borderRadius: h, background: "#2a2f33", display: "flex", alignItems: "center", paddingLeft: w * 0.02, fontFamily: FONT.data, fontSize: w * 0.022, color: "rgba(243,246,239,0.7)" }}>yourfilm.com</div>
      </div>
      <div style={{ position: "absolute", inset: `${h * 0.09}px 0 0 0`, background: "radial-gradient(ellipse at 70% 30%, #26323a 0%, #0e1113 70%)" }} />
      <Title w={w * 0.46} style={{ top: "22%" }} />
      {[laurels.hero.file, X.blackTie.file, X.winner.file].map((file, i) => L(file, { left: `${18 + i * 22}%`, top: "52%", width: "20%", height: "34%" }))}
    </div>
  );
};

// an email signature, light inbox
export const Signature: React.FC<{ w: number }> = ({ w }) => {
  const h = w * 0.62;
  const pack = laurels.pack;
  const black = (label: string) => pack.find((p) => p.label === label && p.way === "black")!.file;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: w * 0.025, background: C.paper, overflow: "hidden", boxShadow: `0 ${w * 0.04}px ${w * 0.1}px rgba(0,0,0,0.45)`, padding: w * 0.07, boxSizing: "border-box", fontFamily: FONT.text, color: "#24302a" }}>
      <div style={{ fontSize: w * 0.045, marginBottom: w * 0.04 }}>See you at the screening,</div>
      <div style={{ height: 2, width: w * 0.12, background: "#c9d1c4", marginBottom: w * 0.04 }} />
      <div style={{ fontSize: w * 0.05, fontWeight: 600 }}>Your Name</div>
      <div style={{ fontSize: w * 0.04, color: "#5d6e64", marginBottom: w * 0.04 }}>Director, Your Film</div>
      <div style={{ position: "relative", height: h * 0.3 }}>
        {[black("Official Selection"), black("Best Short Film")].map((file, i) => L(file, { left: `${i * 24}%`, top: 0, width: "22%", height: "100%" }))}
      </div>
    </div>
  );
};
