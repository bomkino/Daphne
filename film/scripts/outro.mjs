// Copies the intro/outro's outro into public/outro/, where the film ends on it:
// brand/motion/daphne-outro-<size>.mp4 → public/outro/sting-<size>.mp4.
//
//   npm run outro
//
// Without these files the film plays its own ending instead.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

mkdirSync(new URL("../public/outro/", import.meta.url), { recursive: true });
for (const size of ["1920x1080", "1080x1920"]) {
  const from = new URL(`../../brand/motion/daphne-outro-${size}.mp4`, import.meta.url);
  if (!existsSync(from)) {
    console.log(`brand/motion/daphne-outro-${size}.mp4 isn't here yet: the ${size} cut plays its own ending.`);
    continue;
  }
  copyFileSync(from, new URL(`../public/outro/sting-${size}.mp4`, import.meta.url));
  console.log(`public/outro/sting-${size}.mp4`);
}
