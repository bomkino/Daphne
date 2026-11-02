// Daphne's story film. One picture, set three ways: her words on screen and the
// score (the lead cut), the same in pitch.dog's voice (the alternate), and a
// narrated cut that plays Manali's takes over a quieter bed of the same score.
import React from "react";
import { AbsoluteFill, Audio, getStaticFiles, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import "../brand/fonts";
import { at, beat, FPS, frameOf, LINES, mix, OUTRO_FRAME, OUTRO_FRAMES, sm, span, Voice } from "../story";
import { classicGold } from "./laurels.gen";
import { EndWords, Grove, Held, Laurel, TextMode, Title, useSize, useT, Words } from "./layers";
import { endingTimes } from "./grove";

export type FilmProps = { voice: Voice; text: TextMode; narrated: boolean; sting: boolean };

const has = (name: string) => getStaticFiles().some((f) => f.name === name);

// The laurels on screen: one Classic Gold laurel made with Daphne, the same one
// the intro/outro sting opens on. It opens the film, comes back as the poster
// she sits on now, and is made again, from two leaves, at the end.
// Where the sting's laurel stands on its first frame (brand/motion/sting/src/layout.ts): its height,
// and where the laurel's own origin sits. The film's last laurel moves there, so the cut into the
// sting is the same laurel.
const STING_LAUREL = { tall: { h: 400, y: 860 }, wide: { h: 540, y: 450 } };
// our Laurel centers its box; the sting centers the laurel's origin, which sits this far below the box's middle
const ORIGIN_DY = -(classicGold.viewBox[1] + classicGold.viewBox[3] / 2) / classicGold.viewBox[3];
const DISSOLVE = 6; // frames: the sting's dark comes up over ours

const Laurels: React.FC<{ stingOn: boolean }> = ({ stingOn }) => {
  const t = useT();
  const { W, H, tall } = useSize();
  // the wide festival laurel (about 2:1): upright it fills 80% of the width, wide it's 54% of the height
  const h = tall ? (W * 0.8 * classicGold.viewBox[3]) / classicGold.viewBox[2] : H * 0.54;
  const x = W / 2, y = tall ? H * 0.47 : H * 0.44;
  // the slow push from our framing to the sting's, ending at rest on its first frame
  const cutT = OUTRO_FRAME / FPS;
  const push = stingOn ? sm(cutT - 1.8, cutT, t) : 0;
  const end = STING_LAUREL[tall ? "tall" : "wide"];
  const dive = at("dive");
  const E = endingTimes();
  const glint = (c: number) => 0.16 * Math.exp(-(((t - c) / 0.5) ** 2));
  return (
    <>
      {t < dive + 3.2 && (
        <Laurel
          art={classicGold}
          x={x}
          y={y}
          height={h}
          opacity={sm(0.4, 3.2, t) * (1 - sm(dive + 1.5, dive + 3.0, t))}
          scale={mix(0.93, 1, sm(0.4, dive, t)) * mix(1, 4.4, span(dive, dive + 3.1, t, (q) => q * q * q))}
          origin={[0.19, 0.3]}
          blur={sm(dive + 0.5, dive + 2.7, t) * 28}
          hue={sm(dive + 0.3, dive + 2.4, t) * 64}
          bright={1 + glint(4.2) + glint(8.6) - sm(dive + 1.6, dive + 2.9, t) * 0.4}
          words={span(1.4, 3.2, t, (q) => q)}
        />
      )}
      {t > at("today") && t < at("free") + 0.4 && (
        <Laurel
          art={classicGold}
          x={x}
          y={y}
          height={h}
          opacity={sm(at("today") + 0.8, at("today") + 3.0, t) * (1 - sm(at("ask") + 2.4, at("free") + 0.2, t))}
          scale={mix(0.92, 1.0, sm(at("today"), at("free"), t))}
          bright={mix(1, 0.62, sm(at("ask") + 0.4, at("ask") + 2.6, t)) + glint(at("today") + 3.2)}
        />
      )}
      {t > at("make") - 0.1 && !(stingOn && t >= (OUTRO_FRAME + DISSOLVE) / FPS) && (
        <Laurel
          art={classicGold}
          x={x}
          y={mix(y, ((end.y - ORIGIN_DY * end.h) * H) / (tall ? 1920 : 1080), push)}
          height={mix(h, (end.h * H) / (tall ? 1920 : 1080), push)}
          grow={span(at("make") + 0.15, at("make") + 1.55, t, (q) => q)}
          words={span(at("make") + 1.1, at("make") + 2.3, t, (q) => q)}
          opacity={stingOn ? 1 : 1 - sm(E.lub - 0.02, E.lub + 0.24, t)}
          scale={stingOn ? mix(1, 1.025, sm(at("facts"), cutT - 1.8, t)) * (1 - push) + push : mix(1, 1.025, sm(at("facts"), E.lub, t))}
          bright={1 + glint(at("facts") + 1.2)}
        />
      )}
    </>
  );
};

// The intro/outro sting's outro, played as our ending. Its first frame is our last laurel,
// so it dissolves in over a few frames and only the dark around the laurel changes.
const Sting: React.FC<{ src: string }> = ({ src }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, DISSOLVE], [0, 1], { extrapolateRight: "clamp" }) }}>
      {/* the sting is mixed at -14 LUFS, the score at -16: meet it there */}
      <OffthreadVideo src={src} volume={0.8} />
    </AbsoluteFill>
  );
};

export const Film: React.FC<FilmProps> = ({ voice, text, narrated, sting }) => {
  const { W, H } = useSize();
  const stingFile = `outro/sting-${W}x${H}.mp4`;
  const stingOn = sting && has(stingFile);
  const score = narrated ? "audio/score-bed.flac" : "audio/score.flac";
  return (
    <AbsoluteFill style={{ background: "#09160F", overflow: "hidden" }}>
      <Grove ownEnding={!stingOn} />
      <Laurels stingOn={stingOn} />
      <Title />
      <Held />
      <Words voice={voice} mode={text} />
      {!stingOn && <EndWords />}
      {stingOn && (
        <Sequence from={OUTRO_FRAME} durationInFrames={OUTRO_FRAMES}>
          {/* the sting is mixed at -14 LUFS, the score at -16: meet it there */}
          <Sting src={staticFile(stingFile)} />
        </Sequence>
      )}
      {/* with the sting on, the score hands over to the sting's own sound in half a second */}
      {has(score) && (
        <Audio
          src={staticFile(score)}
          volume={(f) => (stingOn ? interpolate(f, [OUTRO_FRAME - 2, OUTRO_FRAME + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)}
        />
      )}
      {/* Manali's takes: public/vo/<voice>/L04.wav plays from its line's beat */}
      {narrated &&
        LINES.map((l) => {
          const file = `vo/${voice}/${l.id}.wav`;
          return has(file) ? (
            <Sequence key={l.id} from={frameOf(beat(l.beat))}>
              <Audio src={staticFile(file)} />
            </Sequence>
          ) : null;
        })}
    </AbsoluteFill>
  );
};

