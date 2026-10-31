// What render.mjs would run, checked without rendering anything:  npm test  (node --test scripts/*.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const dry = (...args) =>
  execFileSync("node", ["scripts/render.mjs", "--dry-run", ...args], {
    encoding: "utf8",
  }).split("\n");
const line = (lines, what) => lines.find((l) => l.includes(what)) ?? "";

test("the film print gets --audio when asked, and the kit's score by default", () => {
  const withAudio = line(
    dry("--cine", "Explainer", "1080x1920", "--audio", "out/mix.wav"),
    "print_film.py",
  );
  assert.match(withAudio, /--audio out\/mix\.wav/);
  const plain = line(dry("--cine", "Explainer", "1080x1920"), "print_film.py");
  assert.doesNotMatch(plain, /--audio/);
});

test("--audio master pulls the clean master's own mix first", () => {
  const lines = dry("--cine", "Explainer", "1080x1920", "--audio", "master");
  assert.match(
    line(lines, "ffmpeg"),
    /-i out\/Explainer-1080x1920\.mp4 .* out\/Explainer-1080x1920-mix\.wav/,
  );
  assert.match(
    line(lines, "print_film.py"),
    /--audio out\/Explainer-1080x1920-mix\.wav/,
  );
});

test("a flag's value is never read as a scene or a size", () => {
  const lines = dry("--cine", "--look", "paper", "Explainer", "1080x1920");
  assert.match(
    line(lines, "print_film.py"),
    /out\/frames\/Explainer-1080x1920 .*--look paper/,
  );
  assert.equal(lines.filter((l) => l.includes("print_film.py")).length, 1);
});
