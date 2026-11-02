// Renders the sting at every size in src/sizes.json, from pitch.dog's Remotion kit.
//
//   npm run render                            both endings, every size: out/Daphne<Ending>-<size>.mp4
//   npm run render -- DaphneOutro             one ending
//   npm run render -- DaphneOutro 1080x1920   one ending, the sizes you name
//   npm run preview                           half size and quick, for review: out/previews/
//   … --dry-run                               print the commands and run nothing
//
// Each master is H.264 at CRF 16 with AAC at 320 kbps. Beside it, a post copy inside
// Meta's spec (H.264 high profile, no B-frames, under 25 Mbps, AAC 128 kbps, fast start),
// which is the file to upload. With no edit list, the AAC encoder's 1024 samples of
// priming would play before the sound and push it 21 ms late, so the post copy trims
// the same 1024 samples off the front of the (silent) start.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, machine } from "./machine.mjs";

const sizes = JSON.parse(readFileSync(new URL("../src/sizes.json", import.meta.url), "utf8")).map((s) => s.id);
const args = process.argv.slice(2);
const preview = args.includes("--preview");
const dryRun = args.includes("--dry-run");
const names = args.filter((a) => !a.startsWith("--"));
const picked = names.filter((a) => sizes.includes(a));
const scenes = names.filter((a) => !sizes.includes(a));

const run = (cmd, argv) => {
  if (dryRun) return console.log([cmd, ...argv].join(" "));
  execFileSync(cmd, argv, { stdio: "inherit" });
};

const m = machine();
console.log(`Rendering with ${describe(m)}`);
const concurrency = `--concurrency=${m.concurrency}`;

for (const scene of scenes.length ? scenes : ["DaphneIntro", "DaphneOutro"]) {
  for (const size of picked.length ? picked : sizes) {
    const id = `${scene}-${size}`;
    if (preview) {
      run("npx", ["remotion", "render", id, `out/previews/${id}.mp4`, concurrency, "--scale=0.5", "--codec=h264", "--crf=22", "--pixel-format=yuv420p"]);
      continue;
    }
    run("npx", ["remotion", "render", id, `out/${id}.mp4`, concurrency, "--codec=h264", "--crf=16", "--x264-preset=slow", "--pixel-format=yuv420p", "--color-space=bt709", "--audio-codec=aac", "--audio-bitrate=320k"]);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", `out/${id}.mp4`, "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18", "-maxrate", "20M", "-bufsize", "40M", "-bf", "0", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-af", "atrim=start_sample=1024,asetpts=PTS-STARTPTS", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart", "-use_editlist", "0", `out/${id}-post.mp4`]);
  }
}
