// Renders a scene at every size in src/sizes.json.
//
//   npm run render                            clean masters: out/Explainer-<size>.mp4
//   npm run render:cine                       printed to film: out/Explainer-<size>-cine.mp4
//   npm run render -- 1080x1440               just the sizes you name
//   npm run render -- MyScene                 another scene's <Scene>-<size> compositions
//   npm run render:cine -- --look paper       the film look for bright grounds
//   npm run render:cine -- --audio master     print with the clean master's own mix (render it first)
//   npm run render:cine -- --audio mix.wav    print with that file
//   npm run render -- --preview               half size and quick, for review: out/previews/
//   … --dry-run                               print the commands and run nothing (npm test uses it)
//
// The film print hears one sound file. Without --audio it is public/audio/score.wav, the
// kit's score: the negative is picture only, so a composition's own <Audio> tracks never
// reach the print by themselves. A voiced or multitrack piece passes its mix with --audio
// (found in the 26 October 2026 review; until then the wrapper had no way to pass a sound).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { describe, machine } from "./machine.mjs";

const sizes = JSON.parse(
  readFileSync(new URL("../src/sizes.json", import.meta.url), "utf8"),
).map((size) => size.id);

const args = process.argv.slice(2);
const VALUED = ["--look", "--audio"]; // flags that take the next argument
const value = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at === -1 ? fallback : args[at + 1];
};
const cine = args.includes("--cine");
const preview = args.includes("--preview");
const dryRun = args.includes("--dry-run");
const look = value("--look", "dark");
const audio = value("--audio", null);
// Names are what is left once flags and their values are out. Without the
// second test, --look's value once dropped the first name.
const names = args.filter(
  (a, i) => !a.startsWith("--") && !VALUED.includes(args[i - 1]),
);
const picked = names.filter((a) => sizes.includes(a));
const scene = names.find((a) => !sizes.includes(a)) ?? "Explainer";

if (audio && !cine) {
  console.log(
    "--audio only changes the film print; a clean master carries the composition's own sound.",
  );
}

const run = (cmd, argv) => {
  if (dryRun) {
    console.log([cmd, ...argv].join(" "));
    return;
  }
  execFileSync(cmd, argv, { stdio: "inherit" });
};

// What the film print hears: a file, or the clean master's own mix, pulled out losslessly.
const printAudio = (id) => {
  if (!audio) return [];
  if (audio !== "master") return ["--audio", audio];
  const master = `out/${id}.mp4`;
  const mix = `out/${id}-mix.wav`;
  if (!dryRun && !existsSync(master)) {
    throw new Error(
      `${master} is missing: render the clean master first (npm run render -- ${scene} ${id.slice(scene.length + 1)}).`,
    );
  }
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    master,
    "-vn",
    "-c:a",
    "pcm_s24le",
    mix,
  ]);
  return ["--audio", mix];
};

// Sized to this machine rather than assumed: see scripts/machine.mjs.
const m = machine();
console.log(`Rendering with ${describe(m)}`);
const concurrency = `--concurrency=${m.concurrency}`;

for (const size of picked.length > 0 ? picked : sizes) {
  const id = `${scene}-${size}`;
  if (preview) {
    // Half size at a lighter quality: fast to render and small to share
    // for review. Never a master.
    run("npx", [
      "remotion",
      "render",
      id,
      `out/previews/${id}.mp4`,
      concurrency,
      "--scale=0.5",
      "--codec=h264",
      "--crf=22",
      "--pixel-format=yuv420p",
    ]);
  } else if (cine) {
    // The negative: the design alone as PNG frames, which the lab prints.
    const frames = `out/frames/${id}`;
    if (!dryRun) rmSync(frames, { recursive: true, force: true });
    run("npx", [
      "remotion",
      "render",
      id,
      frames,
      concurrency,
      "--sequence",
      "--image-format=png",
    ]);
    run("python3", [
      "scripts/print_film.py",
      frames,
      `out/${id}-cine.mp4`,
      "--look",
      look,
      ...printAudio(id),
    ]);
  } else {
    run("npx", [
      "remotion",
      "render",
      id,
      `out/${id}.mp4`,
      concurrency,
      "--codec=h264",
      "--crf=16",
      "--x264-preset=slow",
      "--pixel-format=yuv420p",
      "--color-space=bt709",
      "--audio-codec=aac",
      "--audio-bitrate=320k",
    ]);
  }
}
