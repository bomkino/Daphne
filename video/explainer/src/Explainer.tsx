import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import "./brand/fonts";
import { Backdrop, Grain } from "./components/Backdrop";
import { Export } from "./scenes/Export";
import { Festivals } from "./scenes/Festivals";
import { Finale } from "./scenes/Finale";
import { Fixer } from "./scenes/Fixer";
import { Looks } from "./scenes/Looks";
import { Opening } from "./scenes/Opening";
import { Pack } from "./scenes/Pack";
import { T } from "./timeline";

// Scenes read the composition's own clock, so their cues are T.<event> as written in timeline.json and
// a retimed beat moves the picture and the sound together. A window only decides when a scene is on.
const Window: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const f = useCurrentFrame();
  return f >= from && f < to ? <>{children}</> : null;
};

// Daphne, explained in about 54 seconds: the email becomes the laurel, then what else Daphne does, on
// the beat, and the logo.
export const Explainer: React.FC = () => (
  <AbsoluteFill style={{ background: "#12291E", overflow: "hidden" }}>
    <Backdrop />
    <Window from={0} to={T.looks + 2}>
      <Opening />
    </Window>
    <Window from={T.looks - 6} to={T.festivals + 6}>
      <Looks />
    </Window>
    <Window from={T.festivals - 4} to={T.export + 4}>
      <Festivals />
    </Window>
    <Window from={T.export - 6} to={T.fixer + 2}>
      <Export />
    </Window>
    <Window from={T.fixer - 8} to={T.pack + 4}>
      <Fixer />
    </Window>
    <Window from={T.pack - 4} to={T.free}>
      <Pack />
    </Window>
    <Window from={T.free - 12} to={99999}>
      <Finale />
    </Window>
    <Grain />
    <Audio src={staticFile("audio/score.wav")} />
  </AbsoluteFill>
);
