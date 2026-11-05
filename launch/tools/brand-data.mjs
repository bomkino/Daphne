// Takes the leaf the brand book's story draws from the brand's own mark code, so the carousels' leaves are the brand's.
//
//   node launch/tools/brand-data.mjs   → launch/src/brand.json
import { writeFileSync } from 'node:fs';
import { leafBracket } from '../../brand/tools/mark.mjs';

// the story's leaf, as in brand/tools/book.mjs: a single bay leaf pointing up, base at 0,0, 500 units long
const SL = leafBracket({ side: 1, x0: 0, yTop: -500, yBot: 0, sag: 26, W: 150, stalk: 0.1, stalkCurl: 0.4, slit: 0.07, wave: 0.03 });
writeFileSync(new URL('../src/brand.json', import.meta.url), JSON.stringify({ leaf: { d: SL.d, stalk: SL.stalk, len: 500 } }) + '\n');
console.log('wrote launch/src/brand.json', Object.keys(SL));
