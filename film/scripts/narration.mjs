// Manali's script, timed: writes NARRATION.md from src/story.json, so a retime
// there (a line's beat) rewrites the script she reads from.
//
//   npm run narration
import { readFileSync, writeFileSync } from "node:fs";

const story = JSON.parse(readFileSync(new URL("../src/story.json", import.meta.url), "utf8"));
const spb = 60 / story.bpm;
const beat = (n) => story.firstBeat + n * spb;
// The same estimate the picture uses (src/story.ts): an unhurried, intimate pace.
const syl = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let n = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ee") && n > 1) n -= 1;
  return Math.max(1, n);
};
const say = (text) => 0.25 + text.split(/\s+/).reduce((t, w) => t + 0.2 * syl(w) + (/[.,:;?!]$/.test(w) ? 0.32 : 0.02), 0);
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

const table = (voice) => {
  const rows = story.lines.map((l, i) => {
    const from = beat(l.beat);
    const next = i + 1 < story.lines.length ? beat(story.lines[i + 1].beat) : beat(story.outro.lubBeat);
    const room = next - from, est = say(l[voice]);
    const tight = est > room - 0.25 ? " (tight)" : "";
    return `| ${l.id} | ${clock(from)} | ${room.toFixed(1)} s${tight} | ${est.toFixed(1)} s | ${l[voice]} |`;
  });
  return ["| Take | Starts | Room | About | Line |", "|---|---|---|---|---|", ...rows].join("\n");
};

const md = `# Narration

Manali can voice the film, or not: it's made to work both ways. Without a voice,
the words are on screen, timed as if spoken. With one, Manali's takes play over a
quieter bed of the same score and the words become captions.

There are two scripts, one picture. **Hers** is Daphne telling her own story
("You've seen me on a thousand film posters"), the lead. **Ours** is pitch.dog
telling it ("You've seen her..."), the alternate. Record either, or both.

## Reading it

- Unhurried and close, as if to one person in the dark: about 2.5 words a
  second, with real breaths at the full stops. "About" below is that pace.
- Each take starts on its beat and must end before the next one starts:
  "Room" is the time it has. A take can start up to half a second late, never early.
- "Daphne." (L03) is said once, softly, as her name rises on screen.
- L06, "I ran.", lands on the timpani hit. L08 to L10 are three short lines,
  each with a beat of quiet after it.
- Leave each take's breath in, trim the silence, no music under it.

## Files

One WAV per line, 48 kHz, mono or stereo, peaking around -3 dBFS, named by take:
\`public/vo/her/L01.wav\` ... \`L21.wav\` for hers, \`public/vo/us/L01.wav\` ... for ours.
Then render the narrated cut (\`npm run render -- DaphneNarrated\` or
\`DaphneUsNarrated\`). Each take plays from its line's beat; a missing take is
simply silent, so a partial set can be checked as it comes in.

If a take runs long, move that line's \`beat\` (and the next ones) in
\`src/story.json\` and run \`npm run narration\` to reprint this sheet; the
picture follows the beats. The score is fixed to the beats too, so rerun
\`npm run score\` after a retime.

## Hers (Daphne tells it)

${table("her")}

## Ours (pitch.dog tells it)

${table("us")}

Times are from the start of the film (${story.bpm} beats a minute, ${clock(story.end)} long).
The ending, from ${clock(beat(story.outro.lubBeat))}, has no words.
`;
writeFileSync(new URL("../NARRATION.md", import.meta.url), md);
console.log("NARRATION.md");
