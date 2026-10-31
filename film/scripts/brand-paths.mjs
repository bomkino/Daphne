// Pulls the marks the film draws out of the brand's own code, so the film's
// leaves and logo are the brand's, not copies: brand/tools/mark.mjs draws every
// one of them. Writes src/brand/paths.json. Run it again if the mark changes.
//
//   npm run brand
import { writeFileSync } from "node:fs";
import { lockup, leafBracket, HERO_LEAF, COLORS } from "../../brand/tools/mark.mjs";

const r = (n) => Math.round(n * 100) / 100;
const pt = (p) => [r(p[0]), r(p[1])];

// The hero logo: the name as one path per letter, so it can rise a letter at a time.
const HK = lockup({ leaf: HERO_LEAF });
const letters = [...HK.word.matchAll(/<path transform="translate\(([-\d.]+) 0\)" d="([^"]+)"\/>/g)].map(
  (m) => ({ x: Number(m[1]), d: m[2] }),
);

// The story's leaf, as the brand book draws it: one bay leaf pointing up, base at 0,0, 500 units long.
const SL = leafBracket({ side: 1, x0: 0, yTop: -500, yBot: 0, sag: 26, W: 150, stalk: 0.1, stalkCurl: 0.4, slit: 0.07, wave: 0.03 });

// The leaf brackets for display type, on PD Head's em (1000 units).
const BL = leafBracket({ side: -1, x0: 0 }), BR = leafBracket({ side: 1, x0: 0 });

const out = {
  source: "brand/tools/mark.mjs",
  colors: COLORS,
  logo: {
    box: HK.box.map(r),
    wordW: r(HK.wordW),
    letters,
    left: { d: HK.L.d, stalk: HK.L.stalk, base: pt(HK.L.P(0)), tip: pt(HK.L.P(1)) },
    right: { d: HK.R.d, stalk: HK.R.stalk, base: pt(HK.R.P(0)), tip: pt(HK.R.P(1)) },
  },
  storyLeaf: { d: SL.d, stalk: SL.stalk, length: 500 },
  bracket: {
    left: { d: BL.d, stalk: BL.stalk, bbox: BL.bbox.map(r) },
    right: { d: BR.d, stalk: BR.stalk, bbox: BR.bbox.map(r) },
  },
};
writeFileSync(new URL("../src/brand/paths.json", import.meta.url), JSON.stringify(out));
console.log(`src/brand/paths.json: ${letters.length} letters, logo box ${out.logo.box.join(" ")}`);
