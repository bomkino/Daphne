// A contact sheet: stills of one composition at the moments you name, at half
// size, tiled into one image to look at before anyone else does.
//
//   npm run sheet -- EndCard-1080x1920 0.5 1.2 2 3.4      seconds
//   npm run sheet -- EndCard-1920x1080 --fps=24 1 2 3     another frame rate
//
// Writes out/sheets/<composition>.jpg. Seconds convert to frames at the
// timeline's fps unless --fps says otherwise.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { machine } from "./machine.mjs";

const timeline = JSON.parse(
  readFileSync(new URL("../src/timeline.json", import.meta.url), "utf8"),
);

const args = process.argv.slice(2);
const fpsArg = args.find((a) => a.startsWith("--fps="));
const fps = fpsArg ? Number(fpsArg.slice(6)) : timeline.fps;
const [id, ...secs] = args.filter((a) => !a.startsWith("--"));
if (!id || secs.length === 0) {
  console.error("Usage: npm run sheet -- <composition> <seconds...>");
  process.exit(1);
}

const frames = [...new Set(secs.map((s) => Math.round(Number(s) * fps)))];
const dims = /-(\d+)x(\d+)$/.exec(id);
const tall = dims ? Number(dims[2]) > Number(dims[1]) : true;
const cols = Math.min(frames.length, tall ? 6 : 3);
const rows = Math.ceil(frames.length / cols);

// One bundle and one browser for every frame. The folder name has no dot,
// because Remotion reads a dot as a file extension and refuses the sequence.
const tmp = `out/sheet-${id.replace(/\W/g, "-")}`;
rmSync(tmp, { recursive: true, force: true });
mkdirSync("out/sheets", { recursive: true });
execFileSync(
  "npx",
  [
    "remotion",
    "render",
    id,
    tmp,
    "--sequence",
    `--frames=${frames.join(",")}`,
    "--scale=0.5",
    "--image-format=jpeg",
    "--jpeg-quality=90",
    "--log=error",
    `--concurrency=${Math.min(machine().concurrency, frames.length)}`,
  ],
  { stdio: "inherit" },
);
execFileSync(
  "ffmpeg",
  [
    "-v",
    "error",
    "-y",
    "-pattern_type",
    "glob",
    "-i",
    `${tmp}/*.jpeg`,
    "-vf",
    `tile=${cols}x${rows}:padding=4:color=black`,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    `out/sheets/${id}.jpg`,
  ],
  { stdio: "inherit" },
);
rmSync(tmp, { recursive: true, force: true });
console.log(`out/sheets/${id}.jpg: frames ${frames.join(", ")}`);
