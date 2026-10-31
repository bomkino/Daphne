// sheet.mjs — renders a contact sheet of curated presets + shuffles to out/sheet.svg (then rsvg-convert → PNG).
import { writeFileSync, mkdirSync } from 'node:fs';
import { renderLaurel, shuffle } from './laurelgen.mjs';

const PAL = {
  gold: { stops: [[0, '#6e4f1c'], [0.55, '#c9a24a'], [1, '#f4e3a8']], base: '#c9a24a', text: '#f4e3a8', sub: '#c9a24a' },
  goldLight: { stops: [[0, '#7a5a22'], [1, '#b8913d']], base: '#8a6a2a', text: '#3b2c10', sub: '#8a6a2a' },
  silver: { stops: [[0, '#7d838c'], [1, '#f5f7fa']], base: '#c8ccd2', text: '#ffffff', sub: '#aab0b8' },
  ink: { base: '#141414', tip: '#141414', text: '#141414', sub: '#141414' },
  cream: { base: '#efe6d2', tip: '#efe6d2', text: '#efe6d2', sub: '#cfc4ab' },
  rose: { stops: [[0, '#8f4f43'], [1, '#f2c4b2']], base: '#d9937f', text: '#f6d8cc', sub: '#d9937f' },
  emerald: { stops: [[0, '#173d2e'], [1, '#4d8a68']], base: '#2a5c45', text: '#173d2e', sub: '#2a5c45' },
  white: { base: '#ffffff', tip: '#ffffff', text: '#ffffff', sub: '#ffffff' },
  ember: { stops: [[0, '#d2401f'], [1, '#ffb45e']], base: '#f07a3a', text: '#fff1e2', sub: '#ffb45e' },
  mint: { stops: [[0, '#2f6f63'], [1, '#bfe8d5']], base: '#7fc2a8', text: '#e9fbf2', sub: '#7fc2a8' },
  plum: { stops: [[0, '#3b1d3f'], [1, '#7a4a7f']], base: '#5a2d5f', text: '#3b1d3f', sub: '#7a4a7f' },
};
const BG = {
  night: '#0f1218', black: '#0a0a0a', paper: '#f4efe6', cream: '#efe8da', navy: '#101a33', wine: '#3a0f19',
  forest: '#0f2a20', sand: '#e8dcc4', plum: '#1d1220', blush: '#f6e6e1',
  photo: 'url(#photo)', dusk: 'url(#dusk)',
};
const FONTS = { figtree: 'Figtree', avenir: 'Avenir Next', futura: 'Futura', bodoni: 'Bodoni 72', bask: 'Baskerville', gill: 'Gill Sans' };

const t = (font, hero, status, year, o = {}) => ({ font: FONTS[font], hero, status, year, weight: 800, ...o });
const CELLS = [
  ['Almond', {}, 'gold', 'night', t('figtree', 'NORTHLIGHT', 'OFFICIAL SELECTION', '2026')],
  ['Olive fine', { stem: { w: 1 }, leaf: { profile: 'lance', n: 20, L0: 22, L1: 12, wr: 0.27, aOut: 26, aIn: 22 }, orn: { berries: 2 } }, 'goldLight', 'paper', t('bodoni', 'Meridian', 'OFFICIAL SELECTION', '2026', { weight: 700, capW: 0.6 })],
  ['Bay', { leaf: { profile: 'round', n: 8, L0: 36, L1: 20, wr: 0.78, aOut: 40, aIn: 30, arr: 'paired' }, stem: { w: 2.6 } }, 'emerald', 'cream', t('futura', 'LUMEN', 'WINNER', 'BEST DOCUMENTARY', { weight: 700, smallFont: 'Futura' })],
  ['Fern', { leaf: { family: 'fern', n: 6, L0: 58, L1: 34, wr: 0.62, bend: 0.12, aOut: 30, aIn: 22 } }, 'silver', 'black', t('avenir', 'KESTREL', 'WORLD PREMIERE', '2026', { weight: 700 })],
  ['Wheat', { leaf: { family: 'wheat', n: 5, L0: 62, L1: 44, wr: 0.62, aOut: 22, aIn: 16, arr: 'outer' }, stem: { w: 1.6 }, orn: { tip: 'none' } }, 'gold', 'wine', t('bask', 'Harvest', 'AUDIENCE AWARD', '2026', { weight: 700, capW: 0.6 })],
  ['Palm', { leaf: { family: 'palm', n: 5, L0: 64, L1: 40, wr: 0.7, aOut: 24, aIn: 16, bend: 0.18, arr: 'outer' }, orn: { tip: 'none' } }, 'ink', 'paper', t('figtree', 'CORAL BAY', 'NOMINEE', '2026')],
  ['Oak', { leaf: { profile: 'oak', n: 8, L0: 40, L1: 24, wr: 0.62, aOut: 36, aIn: 26, bend: 0.06 }, stem: { w: 2.8 }, orn: { berries: 2 } }, 'rose', 'plum', t('gill', 'ORCHARD', 'SPECIAL MENTION', '2026', { weight: 600 })],
  ['Willow', { spine: { curl: 24 }, leaf: { profile: 'willow', n: 13, L0: 44, L1: 22, wr: 0.2, bend: 0.3, aOut: 26, aIn: 22 }, stem: { w: 1.2 }, render: { shadow: true } }, 'white', 'photo', t('avenir', 'TIDEMARK', 'OFFICIAL SELECTION', '2026', { weight: 700 })],
  ['Outline', { leaf: { n: 11, L0: 32, L1: 16, wr: 0.38 }, render: { mode: 'outline', sw: 1.1 } }, 'gold', 'navy', t('figtree', 'SOLSTICE', 'OFFICIAL SELECTION', '2026')],
  ['Veined', { leaf: { n: 10, L0: 34, L1: 17, wr: 0.42, vein: 0.16 }, stem: { w: 2.4 } }, 'cream', 'forest', t('bodoni', 'Velvet', 'GRAND JURY PRIZE', '2026', { weight: 700, capW: 0.6 })],
  ['Crossed wreath', { spine: { cross: 26, a1: 266 }, leaf: { n: 14, L0: 28, L1: 14, wr: 0.34 }, orn: { ribbon: true } }, 'gold', 'black', t('figtree', 'ATLAS', '', '2026', { layout: 'year', status: 'WINNER' })],
  ['Deco', { leaf: { profile: 'diamond', n: 11, L0: 30, L1: 18, wr: 0.44, arr: 'paired', aOut: 34, aIn: 34, inScale: 1 }, stem: { w: 3 } }, 'silver', 'night', t('futura', 'EMBER', 'OFFICIAL SELECTION', '2026', { weight: 700 })],
  ['Pine', { leaf: { family: 'needle', n: 9, L0: 30, L1: 20, wr: 1, aOut: 30, aIn: 30, arr: 'alternate' }, stem: { w: 2 }, orn: { tip: 'berry', berries: 3 } }, 'emerald', 'sand', t('gill', 'NORTHWOOD', 'BEST SHORT', '2026', { weight: 600 })],
  ['Ivy', { leaf: { profile: 'heart', n: 8, L0: 34, L1: 20, wr: 0.86, jitter: 0.35, aOut: 40, aIn: 30, bend: 0.04 }, spine: { curl: 20 } }, 'plum', 'blush', t('bask', 'Ivywood', 'OFFICIAL SELECTION', '2026', { weight: 700, capW: 0.6 })],
  ['Spiral', { spine: { spiral: 0.32, curl: 26, a1: 262 }, leaf: { profile: 'lance', n: 16, L0: 34, L1: 12, wr: 0.3 } }, 'ember', 'night', t('avenir', 'FLARE', 'BEST CINEMATOGRAPHY', '2026', { weight: 700 })],
  ['Serrate', { leaf: { profile: 'serrate', n: 10, L0: 34, L1: 18, wr: 0.4, bend: 0.14 } }, 'mint', 'forest', t('figtree', 'GLASSHOUSE', 'WINNER', '2026')],
  ['Blossom', { leaf: { profile: 'almond', n: 9, L0: 30, L1: 16, wr: 0.4 }, orn: { flowers: 3, tip: 'flower' } }, 'rose', 'wine', t('bodoni', 'Sakura', 'OFFICIAL SELECTION', '2026', { weight: 700, capW: 0.6 })],
  ['Spoon', { leaf: { profile: 'spoon', n: 13, L0: 26, L1: 16, wr: 0.48, arr: 'outer', aOut: 44 }, stem: { w: 2 } }, 'gold', 'dusk', t('futura', 'HALCYON', 'WORLD PREMIERE', '2026', { weight: 700 })],
];
for (let s = 1; s <= 6; s++) {
  const P = shuffle(s * 31 + 7), pals = Object.keys(PAL), bgs = ['night', 'black', 'navy', 'wine', 'forest', 'plum'];
  CELLS.push([`Shuffle #${s * 31 + 7}`, P, pals[(s * 5) % pals.length], ['ink', 'goldLight', 'emerald', 'plum'].includes(pals[(s * 5) % pals.length]) ? 'paper' : bgs[s % bgs.length], t(['figtree', 'avenir', 'futura', 'bodoni', 'bask', 'gill'][s % 6], ['MERIDIAN', 'LUMEN', 'ATLAS', 'KESTREL', 'EMBER', 'TIDEMARK'][s - 1], ['OFFICIAL SELECTION', 'WINNER', 'NOMINEE'][s % 3], '2026', { weight: 700 }), s]);
}

const CW = 320, CH = 360, COLS = 6, ROWS = Math.ceil(CELLS.length / COLS);
let defs = `<radialGradient id="photo" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#d79a6a"/><stop offset="0.45" stop-color="#6d4b52"/><stop offset="1" stop-color="#1c2335"/></radialGradient>
<linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2140"/><stop offset="1" stop-color="#5a3550"/></linearGradient>`;
let body = '';
CELLS.forEach(([name, params, pal, bg, type, seed = 1], i) => {
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  const L = renderLaurel(params, seed, { palette: PAL[pal], type });
  const h = L.bottom - L.top, w = L.halfW * 2, sc = Math.min((CW * 0.84) / w, ((CH - 40) * 0.86) / h);
  const cy = y + (CH - 34) / 2 - ((L.top + L.bottom) / 2) * sc;
  const light = ['paper', 'cream', 'sand', 'blush'].includes(bg);
  defs += L.defs;
  body += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${BG[bg]}"/>`;
  body += `<g transform="translate(${x + CW / 2} ${cy.toFixed(1)}) scale(${sc.toFixed(3)})">${L.body}</g>`;
  body += `<text x="${x + 14}" y="${y + CH - 14}" font-family="Figtree" font-size="11" font-weight="600" fill="${light ? '#00000088' : '#ffffff77'}">${name}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW * COLS}" height="${CH * ROWS}" viewBox="0 0 ${CW * COLS} ${CH * ROWS}"><defs>${defs}</defs>${body}</svg>`;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/sheet.svg', import.meta.url), svg);
console.log('cells', CELLS.length, 'bytes', svg.length);
