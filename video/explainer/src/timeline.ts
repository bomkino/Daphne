import timeline from "./timeline.json";

// The beat grid. Every move and every sound is placed on it in timeline.json,
// which both the picture and the score (scripts/make_score.py) read, so moving
// an event moves its sound with it.
export const { fps, framesPerBeat, firstBeat, durationInFrames } = timeline;

// The frame a beat lands on. Beats count from 1, and 2.5 is the and-of-2.
// make_score.py rounds the same way, so a sound starts on its picture's frame.
export const beatFrame = (beat: number) =>
  Math.round(firstBeat + (beat - 1) * framesPerBeat);

type Events = typeof timeline.events;

// Each event's frame, by name: T.title, T.hit, ...
export const T = Object.fromEntries(
  Object.entries(timeline.events).map(([name, beat]) => [
    name,
    beatFrame(beat),
  ]),
) as { [K in keyof Events]: number };
