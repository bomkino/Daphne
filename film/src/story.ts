// The film's one clock. Everything is placed on the music's beat (52 a minute,
// her heartbeat), in beats from src/story.json; picture and score both read
// that file, so a retime moves both. Times are seconds unless named frames.
import story from "./story.json";

export type Voice = "her" | "us";
export type Line = { id: string; beat: number; kind?: string; words?: number[]; her: string; us: string };

export const FPS = story.fps;
export const SPB = 60 / story.bpm; // seconds a beat
export const DUB = story.dub; // the dub after each lub
export const beat = (n: number) => story.firstBeat + n * SPB;
export const frameOf = (sec: number) => Math.round(sec * FPS);
export const END = story.end;
export const DURATION = frameOf(END);
export const LINES = story.lines as Line[];

type Act = keyof typeof story.acts;
export const at = (act: Act) => beat(story.acts[act]);

// The outro sting (brand/motion/sting) starts so its first lub lands on our beat.
export const OUTRO_FRAME = frameOf(beat(story.outro.lubBeat)) - story.outro.firstLubFrame;
export const OUTRO_FRAMES = story.outro.frames;

export const HEART_BEATS = story.heart.map(beat);
// Lub-dub at 52 a minute, as a 0..1 pulse. `beats` are the lubs' times.
export const pulse = (t: number, beats: number[]) => {
  let v = 0;
  for (const b of beats) {
    const d = t - b;
    if (d < -0.2 || d > 0.8) continue;
    v = Math.max(v, Math.exp(-((d / 0.06) ** 2)) + 0.55 * Math.exp(-(((d - DUB) / 0.075) ** 2)));
  }
  return v;
};

// ── how long a line takes to say, before anyone has said it ────────────────
// Typecast timed graphics to a voice from syllables before the session
// (remotion-starter-kit, learnings/typecast/motion-and-timing.md); this is the
// same idea at a slower, intimate pace. Retime to the real take in story.json.
const syllables = (word: string) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let n = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ee") && n > 1) n -= 1;
  return Math.max(1, n);
};
const PACE = { base: 0.25, perSyllable: 0.2, perBreak: 0.32 };

// Each word's start, in seconds from the line's start, at speaking pace.
export const wordTimes = (text: string) => {
  const words = text.split(/\s+/);
  const out: number[] = [];
  let t = 0;
  for (const w of words) {
    out.push(t);
    t += PACE.perSyllable * syllables(w) + (/[.,:;?!]$/.test(w) ? PACE.perBreak : 0.02);
  }
  return { words, starts: out, length: PACE.base + t };
};

// Words on screen with no voice arrive a little faster than they'd be said:
// reading runs ahead of speech, and it leaves each line time to be read whole.
export const READ = 0.8;

// When a line is on screen: from its beat until it has been said and read,
// and always gone before the next one starts. `pace` scales the speaking time.
export const lineSpan = (i: number, voice: Voice, pace = 1) => {
  const l = LINES[i];
  const from = beat(l.beat);
  // a line set in phrases on beats ("Poets. Athletes. Artists.") is said when its last phrase is
  const said = Math.max(from + wordTimes(l[voice]).length * pace, l.words ? beat(l.words[l.words.length - 1]) + 0.9 : 0);
  const next = i + 1 < LINES.length ? beat(LINES[i + 1].beat) : END;
  const to = Math.min(next - 0.15, said + 1.5);
  return { from, said, to, next };
};

// ── easing ─────────────────────────────────────────────────────────────────
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// The brand's growth curve, cubic-bezier(.2, .7, .1, 1): quick to start, long to settle.
const bez = (p1x: number, p1y: number, p2x: number, p2y: number) => (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1, u = x;
  for (let i = 0; i < 24; i++) {
    u = (lo + hi) / 2;
    const bx = 3 * (1 - u) ** 2 * u * p1x + 3 * (1 - u) * u * u * p2x + u ** 3;
    if (bx < x) lo = u; else hi = u;
  }
  return 3 * (1 - u) ** 2 * u * p1y + 3 * (1 - u) * u * u * p2y + u ** 3;
};
export const growEase = bez(0.2, 0.7, 0.1, 1);
export const wordEase = bez(0.33, 0, 0.15, 1);
export const span = (a: number, b: number, x: number, ease = growEase) => ease(clamp((x - a) / (b - a)));
