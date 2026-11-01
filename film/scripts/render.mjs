// Renders the film's cuts at both sizes.
//
//   npm run render                         the lead cut, both sizes: out/Daphne-<size>.mp4
//   npm run render -- DaphneUs             another cut (Daphne, DaphneUs, DaphneNarrated, DaphneUsNarrated)
//   npm run render -- Daphne 1080x1920     just the sizes you name
//   npm run render -- --all                every cut, both sizes
//   npm run preview                        half size and quick, for review: out/previews/
//   npm run render -- --web                the story page's encode, under the site's 25 MiB a file:
//                                          out/web/<cut>-<size>.mp4 (render the master first)
//   … --dry-run                            print the commands and run nothing
//
// Masters carry the composition's own sound: the score (and Manali's takes in the
// narrated cuts). BROWSER_EXECUTABLE points Remotion at a Chrome (remotion.config.ts).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { describe, machine } from "./machine.mjs";

const SIZES = ["1920x1080", "1080x1920"];
const CUTS = ["Daphne", "DaphneUs", "DaphneNarrated", "DaphneUsNarrated"];
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const names = args.filter((a) => !a.startsWith("--"));
const sizes = names.filter((a) => SIZES.includes(a));
const cuts = flag("--all") ? CUTS : names.filter((a) => CUTS.includes(a));
const unknown = names.filter((a) => !SIZES.includes(a) && !CUTS.includes(a));
if (unknown.length) {
  console.error(`Unknown: ${unknown.join(", ")}. Cuts: ${CUTS.join(", ")}. Sizes: ${SIZES.join(", ")}.`);
  process.exit(1);
}

const run = (cmd, argv) => {
  if (flag("--dry-run")) return console.log([cmd, ...argv].join(" "));
  execFileSync(cmd, argv, { stdio: "inherit" });
};
const m = machine();
console.log(`Rendering with ${describe(m)}`);

for (const cut of cuts.length ? cuts : ["Daphne"])
  for (const size of sizes.length ? sizes : SIZES) {
    const id = `${cut}-${size}`;
    if (flag("--web")) {
      // The story page plays this. Two passes at a set bitrate land the size;
      // the film is dark and grainy, so it gets more than its share of bits in the darks.
      const master = `out/${id}.mp4`;
      if (!flag("--dry-run") && !existsSync(master)) throw new Error(`${master} is missing: npm run render -- ${cut} ${size}`);
      mkdirSync("out/web", { recursive: true });
      const out = `out/web/${id}.mp4`;
      const v = ["-c:v", "libx264", "-preset", "slow", "-b:v", "1450k", "-maxrate", "2800k", "-bufsize", "5600k", "-tune", "grain", "-pix_fmt", "yuv420p"];
      run("ffmpeg", ["-y", "-v", "error", "-i", master, ...v, "-pass", "1", "-passlogfile", `out/web/${id}`, "-an", "-f", "mp4", "/dev/null"]);
      run("ffmpeg", ["-y", "-v", "error", "-i", master, ...v, "-pass", "2", "-passlogfile", `out/web/${id}`, "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]);
      if (!flag("--dry-run")) console.log(`${out}: ${(statSync(out).size / 2 ** 20).toFixed(1)} MiB`);
      continue;
    }
    const preview = flag("--preview");
    run("npx", [
      "remotion", "render", id, preview ? `out/previews/${id}.mp4` : `out/${id}.mp4`,
      `--concurrency=${m.concurrency}`, "--codec=h264", "--pixel-format=yuv420p", "--audio-codec=aac", "--audio-bitrate=256k",
      ...(preview ? ["--scale=0.5", "--crf=22"] : ["--crf=14"]),
    ]);
  }
