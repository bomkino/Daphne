// Copies Daphne's mark into the video as data, drawn by the brand's own code (brand/tools/mark.mjs), so the
// logo and the leaves on screen are the brand's, never redrawn by hand.
//
//   node scripts/brand.mjs [path to brand/tools]     default: ../../brand/tools (the identity's folder)
//
// Writes src/data/brand.json: the hero lockup (each letter of the name, both leaves with their growth paths),
// a lone leaf bracket for setting a word between leaves, and the plain leaf used for falling leaves.
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = new URL('.', import.meta.url).pathname;
const tools = resolve(process.argv[2] || join(here, '../../../brand/tools'));
const M = await import(pathToFileURL(join(tools, 'mark.mjs')).href);
const letters = (svg) => [...svg.matchAll(/<path transform="translate\(([-\d.]+) ([-\d.]+)\)" d="([^"]+)"\/>/g)].map((m) => ({ x: +m[1], y: +m[2], d: m[3] }));
const leaf = (L) => ({ d: L.d, stalk: L.stalk, grow: L.grow, bbox: L.bbox });
const hero = M.lockup({ leaf: M.HERO_LEAF });
const plain = M.leafBracket({ side: 1, x0: 0 });
const out = {
  colors: M.COLORS,
  lockup: { letters: letters(hero.word), wordW: hero.wordW, box: hero.box, L: leaf(hero.L), R: leaf(hero.R) },
  bracket: { L: leaf(M.leafBracket({ side: -1, x0: 0 })), R: leaf(M.leafBracket({ side: 1, x0: 0 })) },
  leaf: leaf(plain),
};
await mkdir(join(here, '../src/data'), { recursive: true });
await writeFile(join(here, '../src/data/brand.json'), JSON.stringify(out) + '\n');
console.log('letters', out.lockup.letters.length, 'box', out.lockup.box.map(Math.round), 'leaf bbox', plain.bbox.map(Math.round));
