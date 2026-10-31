// features.mjs — renders a sheet of engine features (Node + rsvg-convert). Usage: node tools/features.mjs out.svg
import { writeFileSync } from 'node:fs';
import { render, applyForm, merge, DEFAULT_DOC } from '../engine.mjs';

const F = (status, hero, year, extra = []) => [
  status && { id: 's', kind: 'status', text: status, role: 'eyebrow', slot: 'inside' },
  hero && { id: 'h', kind: 'festival', text: hero, role: 'hero', slot: 'inside' },
  year && { id: 'y', kind: 'year', text: year, role: 'sub', slot: 'inside' },
  ...extra,
].filter(Boolean);
const gold = { type: 'metal', metal: 'gold', scope: 'leaf', angle: 30 };
const CASES = [
  ['Engraved leaves', { branch: { leaf: { style: 'engraved', n: 10, L0: 34, L1: 18, wr: 0.42 } }, paint: { branch: '#2b4a3a' }, text: { paint: '#2b4a3a' }, canvas: { bg: '#efe7d6' } }, F('Official Selection', 'Meridian', '2026')],
  ['Inline leaves', { branch: { leaf: { style: 'inline', n: 11, L0: 32, L1: 16, wr: 0.4 } }, paint: { branch: gold } }, F('Winner', 'Best Short', '2026')],
  ['Split two-tone', { branch: { leaf: { style: 'split', profile: 'almond', n: 9, L0: 34, L1: 20, wr: 0.45, asym: 0.25 }, stem: { w: 1.4 } }, paint: { branch: '#111' }, text: { paint: '#111' }, canvas: { bg: '#f6f1e7' } }, F('World Premiere', 'Lumen', '2026')],
  ['Lopsided bay', { branch: { leaf: { profile: 'almond', asym: 0.45, n: 12, L0: 30, L1: 16, wr: 0.42, bend: 0.18 } }, paint: { branch: gold } }, F('Official Selection', 'Northlight', '2026')],
  ['Stalked leaves', { branch: { leaf: { profile: 'teardrop', petiole: 0.35, n: 9, L0: 26, L1: 15, wr: 0.6, aOut: 50, aIn: 42, arr: 'paired' }, stem: { w: 1.6 } }, paint: { branch: '#e9dfc8' }, canvas: { bg: '#1b1f1a' }, text: { paint: '#e9dfc8' } }, F('Special Mention', 'Kestrel', '2026')],
  ['Twigs', { branch: { leaf: { family: 'twig', profile: 'almond', n: 7, L0: 46, L1: 30, wr: 0.42, aOut: 40, aIn: 36 }, stem: { w: 1.4 } }, paint: { branch: '#3d2b1f' }, text: { paint: '#3d2b1f' }, canvas: { bg: '#f3eadb' } }, F('Audience Award', 'Orchard', '2026')],
  ['Berry sprigs', { branch: { leaf: { family: 'sprig', n: 9, L0: 34, L1: 22, wr: 0.5, aOut: 34, aIn: 30 }, stem: { w: 1.3 } }, paint: { branch: '#1d1d1b' }, text: { paint: '#1d1d1b' }, canvas: { bg: '#f7f4ee' } }, F('Nominee', 'Wildwood', '2026')],
  ['Double row', { branch: { rows: 2, leaf: { n: 14, L0: 26, L1: 14, wr: 0.38 }, spine: { rx: 0.9 } }, paint: { branch: gold } }, F('Grand Jury Prize', 'Atlas', '2026')],
  ['Crossed + band', { form: 'wreath', branch: { orn: { tie: 'band' }, leaf: { n: 14, L0: 26, L1: 14 } }, paint: { branch: { type: 'metal', metal: 'silver', scope: 'leaf' } }, text: { paint: '#f2f4f7' } }, F('Official Selection', 'Solstice', '2026')],
  ['Bow', { form: 'wreath', branch: { orn: { tie: 'bow' }, leaf: { profile: 'lance', n: 16, L0: 24, L1: 12, wr: 0.3 } }, paint: { branch: '#7a1f2b' }, text: { paint: '#7a1f2b' }, canvas: { bg: '#f5ece4' } }, F('Winner', 'Velvet', '2026')],
  ['Rosette base', { branch: { orn: { tie: 'rosette' }, spine: { a0: 92 }, leaf: { n: 12, wr: 0.38 } }, paint: { branch: { type: 'metal', metal: 'bronze', scope: 'leaf' } }, text: { paint: '#f0c9a0' } }, F('Best Documentary', 'Harbour', '2026')],
  ['Empire', { branch: { leaf: { profile: 'almond', arr: 'paired', n: 13, L0: 22, L1: 13, wr: 0.42, aOut: 34, aIn: 34, inScale: 1 }, orn: { berries: 1, berryPos: 'axil', berrySize: 1.1, tie: 'knot' }, stem: { w: 1.2 } }, paint: { branch: '#21483a' }, text: { paint: '#21483a' }, canvas: { bg: '#ece6dc' } }, F('Official Selection', 'Empire', 'MMXXVI')],
  ['Mixed: oak + palm', { form: 'wreath', branch: { orn: { tie: 'bow' }, leaf: { profile: 'oak', n: 8, L0: 36, L1: 22, wr: 0.62 }, right: { leaf: { family: 'palm', n: 5, L0: 58, L1: 38, wr: 0.7, arr: 'outer' }, orn: { tip: 'none' } } }, paint: { branch: '#244636' }, text: { paint: '#244636' }, canvas: { bg: '#ebe2d0' } }, F('Winner', 'Arcadia', '2026')],
  ['Lyre', { branch: { spine: { curl: -46, a1: 236, rx: 0.7 }, leaf: { profile: 'lance', n: 14, L0: 28, L1: 14, wr: 0.32 }, orn: { tie: 'knot' } }, paint: { branch: gold } }, F('Opening Night', 'Lyric', '2026')],
  ['Flank (inline)', { form: 'flank', branch: { leaf: { n: 7, L0: 26, L1: 14, wr: 0.42 } }, paint: { branch: gold } }, F('Official Selection', 'Tribeca-ish', '2026')],
  ['Crown', { form: 'crown', branch: { leaf: { n: 9, L0: 26, L1: 14 } }, paint: { branch: gold }, layout: { dy: 14 } }, F('Winner', 'Coral Bay', '2026')],
  ['Swoop', { form: 'swoop', branch: { leaf: { n: 9, L0: 28, L1: 14 } }, paint: { branch: gold }, layout: { dy: -22 } }, F('Nominee', 'Ember', '2026')],
  ['Text only + rules', { form: 'text', paint: { branch: gold } }, [{ id: 'r1', kind: 'icon', text: 'stars', role: 'eyebrow', slot: 'inside' }, ...F('Official Selection', 'Halcyon', '2026')]],
  ['Year on ribbon', { form: 'wreath', branch: { leaf: { n: 14 } }, paint: { branch: gold }, ribbon: { text: '#1a1206' } }, [...F('Official Selection', 'Tidemark', ''), { id: 'r', kind: 'year', text: '2026', slot: 'ribbon' }]],
  ['Arc top + badge', { branch: { leaf: { n: 12 } }, paint: { branch: gold } }, [{ id: 'a', kind: 'status', text: 'Official Selection', slot: 'arc-top' }, { id: 'h', kind: 'festival', text: 'Glasshouse', role: 'hero', slot: 'inside' }, { id: 'y', kind: 'year', text: '2026', role: 'sub', slot: 'inside' }, { id: 'b', kind: 'icon', text: 'star', slot: 'badge' }]],
  ['Big year', { branch: { leaf: { n: 13 } }, paint: { branch: gold } }, [{ id: 'h', kind: 'festival', text: 'Atlas', role: 'hero', slot: 'inside' }, { id: 'y', kind: 'year', text: '2026', role: 'big', slot: 'inside' }, { id: 's', kind: 'status', text: 'Winner', role: 'eyebrow', slot: 'inside' }]],
  ['Crown icon + below', { branch: { leaf: { n: 12, profile: 'lance' } }, paint: { branch: '#ffffff' }, text: { paint: '#ffffff' }, canvas: { bg: '#20263a' } }, [{ id: 'c', kind: 'icon', text: 'crown', role: 'eyebrow', slot: 'inside' }, ...F('Best Director', 'Northwind', ''), { id: 'y', kind: 'year', text: 'Berlin · 2026', role: 'sub', slot: 'below' }]],
  ['Long name, 3 lines', { branch: { leaf: { n: 12 } }, paint: { branch: gold } }, F('Official Selection', 'International Documentary Film Festival Amsterdam', '2026')],
  ['Long eyebrow', { branch: { leaf: { n: 12 } }, paint: { branch: gold } }, F('North American Premiere', 'SXSW', '2026')],
];

const CW = 320, CH = 340, COLS = 6;
let body = '';
CASES.forEach(([name, over, fields], i) => {
  let doc = merge(DEFAULT_DOC, over);
  if (over.form) doc = applyForm(doc, over.form);
  doc = merge(doc, over); doc.fields = fields;
  if (!doc.canvas.bg) doc.canvas.bg = '#101217';
  doc.canvas.aspect = CW / CH;
  const r = render(doc);
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  body += `<svg x="${x}" y="${y}" width="${CW}" height="${CH}" viewBox="${r.viewBox.join(' ')}">${r.defs}${r.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<defs>[\s\S]*?<\/defs>/, '')}</svg>`;
  const warn = r.report.warnings.length ? ' ⚠' : '';
  body += `<text x="${x + 10}" y="${y + CH - 10}" font-family="Figtree" font-size="11" font-weight="600" fill="#888">${name}${warn} · H ${r.report.hero.toFixed(1)}</text>`;
});
const W = CW * COLS, Ht = CH * Math.ceil(CASES.length / COLS);
writeFileSync(process.argv[2] || 'features.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Ht}">${body}</svg>`);
console.log('ok', CASES.length);
