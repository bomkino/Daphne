// Writes every vector file in brand/ from mark.mjs: logos, symbols, favicon,
// the leaf brackets and the color tokens. Run from the repo root:
//   node brand/tools/build.mjs
// Then render the PNGs with `node brand/tools/render.mjs` (needs Playwright).
import { writeFileSync, mkdirSync } from 'node:fs';
import { COLORS as C, lockup, symbol, symbolSmall, bracketAlone, svgOpen, f, HERO_LEAF } from './mark.mjs';
import { revealSVG, revealScript, REVEAL } from './reveal.mjs';

const root = new URL('../', import.meta.url);
const put = (rel, s) => { const u = new URL(rel, root); mkdirSync(new URL('.', u), { recursive: true }); writeFileSync(u, s.trim() + '\n'); console.log('wrote', rel); };
const title = (t) => `<title>${t}</title>`;
const pad = (b, k) => [b[0] - k, b[1] - k, b[2] - b[0] + 2 * k, b[3] - b[1] + 2 * k];

// ── the logo: (Daphne) ─────────────────────────────────────────────────────
const LK = lockup();
const lkBox = pad(LK.box, 10);
const logo = (word, leaf, name) => `${svgOpen(lkBox, ` role="img" aria-label="Daphne"`)}${title('Daphne')}<g fill="${word}">${LK.word}</g><g fill="${leaf}">${LK.leaves}</g></svg>`;
put('logo/daphne-logo-on-dark.svg', logo(C.paper, C.newLeaf));
put('logo/daphne-logo-on-light.svg', logo(C.grove, C.bay));
put('logo/daphne-logo-mono.svg', logo('currentColor', 'currentColor'));
put('logo/daphne-logo-black.svg', logo('#000', '#000'));
put('logo/daphne-logo-white.svg', logo('#fff', '#fff'));
// the hero lockup: the same logo with veined leaves, for 400 px wide and up
const HK = lockup({ leaf: HERO_LEAF });
const hero = (word, leaf) => `${svgOpen(pad(HK.box, 10), ` role="img" aria-label="Daphne"`)}${title('Daphne')}<g fill="${word}">${HK.word}</g><g fill="${leaf}">${HK.leaves}</g></svg>`;
put('logo/daphne-logo-hero-on-dark.svg', hero(C.paper, C.newLeaf));
put('logo/daphne-logo-hero-on-light.svg', hero(C.grove, C.bay));

// ── the symbol: (D) ────────────────────────────────────────────────────────
const SY = symbol();
const syBox = pad(SY.box, 10);
const sym = (word, leaf) => `${svgOpen(syBox, ` role="img" aria-label="Daphne"`)}${title('Daphne')}<g fill="${word}">${SY.word}</g><g fill="${leaf}">${SY.leaves}</g></svg>`;
put('symbol/daphne-symbol-on-dark.svg', sym(C.paper, C.newLeaf));
put('symbol/daphne-symbol-on-light.svg', sym(C.grove, C.bay));
put('symbol/daphne-symbol-mono.svg', sym('currentColor', 'currentColor'));

// a square tile with the symbol centred. `k` is the symbol's height as a share of the tile.
function tile({ s = SY, bg = C.grove, word = C.paper, leaf = C.newLeaf, k = 0.62, rx = 0, label = 'Daphne' } = {}) {
  const h = Math.max(s.box[3] - s.box[1], s.box[2] - s.box[0]), size = h / k, x0 = (s.box[0] + s.box[2]) / 2 - size / 2, y0 = s.cy - size / 2;
  return `${svgOpen([x0, y0, size, size], ` role="img" aria-label="${label}"`)}${title(label)}<rect x="${f(x0)}" y="${f(y0)}" width="${f(size)}" height="${f(size)}" rx="${f(rx * size)}" fill="${bg}"/><g fill="${word}">${s.word}</g><g fill="${leaf}">${s.leaves}</g></svg>`;
}
// profile pictures are cropped to a circle: keep the symbol inside the middle 62%
put('symbol/daphne-avatar.svg', tile({ k: 0.64 }));
put('symbol/daphne-app-icon.svg', tile({ k: 0.66 }));
// Android crops maskable icons to as little as the middle 80% circle
put('favicon/icon-maskable.svg', tile({ k: 0.54 }));

// ── favicon: the small symbol on a rounded Grove tile ─────────────────────
const SM = symbolSmall();
put('symbol/daphne-symbol-small.svg', `${svgOpen(pad(SM.box, 10), ` role="img" aria-label="Daphne"`)}${title('Daphne')}<g fill="currentColor">${SM.word}${SM.leaves}</g></svg>`);
put('favicon/favicon.svg', tile({ s: SM, k: 0.76, rx: 0.22 }));
put('favicon/icon.svg', tile({ s: SY, k: 0.68 }));

// ── the leaf brackets, one em tall, for setting words in leaves ────────────
for (const [side, name] of [[-1, 'left'], [1, 'right']]) {
  const B = bracketAlone(side), b = B.bbox;
  // keep the font's vertical metrics so the bracket sits on the text's baseline at 1em:
  // ascender 1000 · 0.88, descender 0.30 of an em, like a parenthesis
  const box = [b[0] - 4, -940, b[2] - b[0] + 8, 1240];
  put(`bracket/leaf-${name}.svg`, `${svgOpen(box, ` aria-hidden="true"`)}<g fill="currentColor">${B.path}</g></svg>`);
}

// ── motion reference: the growth paths of the logo's two leaves ───────────
put('motion/logo-paths.json', JSON.stringify({ viewBox: lkBox, word: LK.word, leftLeaf: { grow: LK.L.grow }, rightLeaf: { grow: LK.R.grow } }));

// ── tokens ─────────────────────────────────────────────────────────────────
const tokens = {
  $description: 'Daphne brand tokens. Color names are the brand names; see brand/README.md for when to use each.',
  color: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, { $type: 'color', $value: v }])),
  font: {
    display: { $type: 'fontFamily', $value: ['PD Head', 'Georgia', 'serif'], $description: 'Wordmark (400), symbol (600), headlines.' },
    text: { $type: 'fontFamily', $value: ['PD Body', 'system-ui', 'sans-serif'], $description: 'Interface, captions, running text. 400; 600 for emphasis.' },
    lead: { $type: 'fontFamily', $value: ['PD Body Alt', 'system-ui', 'sans-serif'], $description: 'Taglines and large explanatory lines. 400.' },
    data: { $type: 'fontFamily', $value: ['PD Eyebrow', 'ui-monospace', 'monospace'], $description: 'Formats, sizes, dates, file names. 500.' },
  },
  motion: {
    frameRate: { $type: 'number', $value: 24, $description: 'One leaf per frame: a 24-leaf wreath grows in one second.' },
    grow: { $type: 'cubicBezier', $value: [0.2, 0.7, 0.1, 1], $description: 'Growth along a stem: quick to start, long to settle.' },
    settle: { $type: 'cubicBezier', $value: [0.33, 0, 0.15, 1], $description: 'Words arriving and settling.' },
  },
};
put('tokens/daphne.tokens.json', JSON.stringify(tokens, null, 2));
put('tokens/daphne.css', `/* Daphne brand tokens and faces. Fonts: brand/fonts (CC0). Paths are relative to brand/tokens/. */
@font-face { font-family: "PD Head"; src: url("../fonts/pd-head.woff2") format("woff2"); font-weight: 265 900; font-display: swap; }
@font-face { font-family: "PD Body"; src: url("../fonts/pd-body-roman.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "PD Body Alt"; src: url("../fonts/pd-body-alt-roman.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "PD Eyebrow"; src: url("../fonts/pd-eyebrow-site.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
:root {
${Object.entries(C).map(([k, v]) => `  --daphne-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`).join('\n')}
  --daphne-font-display: "PD Head", Georgia, serif;
  --daphne-font-text: "PD Body", system-ui, sans-serif;
  --daphne-font-lead: "PD Body Alt", system-ui, sans-serif;
  --daphne-font-data: "PD Eyebrow", ui-monospace, monospace;
  --daphne-ease-grow: cubic-bezier(.2, .7, .1, 1);
  --daphne-ease-settle: cubic-bezier(.33, 0, .15, 1);
}`);

// ── motion: the logo reveal, as a page you can open and scrub ─────────────
put('motion/reveal.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daphne logo reveal</title>
<style>html,body{margin:0;height:100%;background:${C.grove}}body{display:grid;place-items:center}.rv{width:min(86vw,1100px);height:auto}
.bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:12px;align-items:center;padding:12px 16px;font:14px system-ui;color:${C.paper}}
.bar input{flex:1;accent-color:${C.newLeaf}}.bar button{font:inherit;background:none;border:1px solid ${C.newLeaf};color:${C.paper};border-radius:4px;padding:4px 12px;cursor:pointer}
body.still .bar{display:none}</style>
${revealSVG({ id: 'rv' })}
<div class="bar"><button id="play" type="button">Play</button><input id="scrub" type="range" min="0" max="${Math.round(REVEAL.total * REVEAL.fps)}" value="0" aria-label="Frame"><span id="fr">0</span></div>
<script>${revealScript()}
const svg = document.querySelector('svg.rv'), anims = daphneReveal(svg, 'rv'), fps = ${REVEAL.fps};
const scrub = document.getElementById('scrub'), fr = document.getElementById('fr');
const seek = (n) => { anims.forEach((a) => { a.pause(); a.currentTime = n * 1000 / fps; }); scrub.value = n; fr.textContent = n + ' / ' + scrub.max; };
window.daphneSeek = seek; // used by brand/tools/render.mjs to step frame by frame
if (new URLSearchParams(location.search).has('still')) { document.body.classList.add('still'); seek(0); }
scrub.oninput = () => seek(+scrub.value);
document.getElementById('play').onclick = () => { anims.forEach((a) => { a.currentTime = 0; a.play(); }); };
</script>`);
