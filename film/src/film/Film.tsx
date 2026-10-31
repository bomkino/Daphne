// Daphne's story film. One picture, set three ways: her words on screen and the
// score (the lead cut), the same in pitch.dog's voice (the alternate), and a
// narrated cut that plays Manali's takes over a quieter bed of the same score.
import React from "react";
import { AbsoluteFill, Audio, getStaticFiles, interpolate, OffthreadVideo, Sequence, staticFile } from "remotion";
import "../brand/fonts";
import { at, beat, frameOf, LINES, mix, OUTRO_FRAME, OUTRO_FRAMES, sm, span, Voice } from "../story";
import { classicGold } from "./laurels.gen";
import { EndWords, Grove, Held, Laurel, TextMode, Title, useSize, useT, Words } from "./layers";
import { endingTimes } from "./grove";

export type FilmProps = { voice: Voice; text: TextMode; narrated: boolean; sting: boolean };

const has = (name: string) => getStaticFiles().some((f) => f.name === name);

// The laurels on screen: one Classic Gold laurel made with Daphne, the same one
// the intro/outro sting opens on. It opens the film, comes back as the poster
// she sits on now, and is made again, from two leaves, at the end.
const Laurels: React.FC<{ stingOn: boolean }> = ({ stingOn }) => {
  const t = useT();
  const { W, H, tall } = useSize();
  const h = tall ? (W * 0.66 * classicGold.viewBox[3]) / classicGold.viewBox[2] : H * 0.62;
  const x = W / 2, y = tall ? H * 0.47 : H * 0.46;
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
      {t > at("make") - 0.1 && !(stingOn && t >= OUTRO_FRAME / 24) && (
        <Laurel
          art={classicGold}
          x={x}
          y={y}
          height={h}
          grow={span(at("make") + 0.15, at("make") + 1.55, t, (q) => q)}
          words={span(at("make") + 1.1, at("make") + 2.3, t, (q) => q)}
          opacity={1 - sm(E.lub - 0.02, E.lub + 0.24, t)}
          scale={mix(1, 1.025, sm(at("facts"), E.lub, t))}
          bright={1 + glint(at("facts") + 1.2)}
        />
      )}
    </>
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
          <OffthreadVideo src={staticFile(stingFile)} />
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

