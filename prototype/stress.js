// stress.js — renders hard cases with real fonts and checks them automatically. ?px=160 sets the smallest use.
// A case fails when:
//   · a line overlaps the leaves (margin < -0.5);
//   · two text items from different places overlap (inside vs ribbon, badge vs arc…);
//   · text touches an ornament (a bow, streamers, a tendril);
//   · anything is drawn outside the canvas (measured on the real rendered SVG with getBBox);
//   · small text would fall below 6 px at the smallest use;
//   · the engine warns (advisory; counted separately);
//   · a render takes over 250 ms or the SVG is over 700 KB.
// Only failing cards are drawn for the big groups, to keep the page light on an 8 GB machine.
import { render, DEFAULT_DOC, merge, clone, applyForm, shuffleBranch, rngOf, FRAMES } from './engine.mjs';
import { loadFont } from './fonts.js';
import { PRESETS } from './presets.js';
import { LAYOUTS, layoutFields } from './layouts.js';
const LAY = Object.fromEntries(LAYOUTS.map((L) => [L.id, L])); let lid = 0; const newId = () => 'L' + ++lid;

const mctx = document.createElement('canvas').getContext('2d');
const measure = (s, font, weight, italic, size) => { mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}", "Noto Sans", sans-serif`; return mctx.measureText(s).width; };
const F = (status, hero, year, extra = []) => [status && { id: 's', kind: 'status', text: status, role: 'eyebrow', slot: 'inside' }, hero && { id: 'h', kind: 'festival', text: hero, role: 'hero', slot: 'inside' }, year && { id: 'y', kind: 'year', text: year, role: 'sub', slot: 'inside' }, ...extra].filter(Boolean);
const PX = +(new URLSearchParams(location.search).get('px') || 160), MINPX = 6, TARGET = PX;
const base = (over = {}) => { let d = merge(clone(DEFAULT_DOC), over); if (over.form) d = merge(applyForm(d, over.form), over); d.canvas.bg = d.canvas.bg || '#101217'; d.canvas.aspect = 0; d.layout.targetPx = TARGET; return d; };
const fromPreset = (p) => { const d = merge(clone(DEFAULT_DOC), p.doc); const pd = merge(p.doc.form ? applyForm(d, p.doc.form) : d, p.doc); pd.layout.targetPx = TARGET; pd.canvas.aspect = 0; return pd; };

// a hidden SVG host: real glyph boxes, real transforms
const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;width:800px'; document.body.append(host);
const overlap = (a, b, tol = 0.5) => a[0] + a[2] - tol > b[0] && b[0] + b[2] - tol > a[0] && a[1] + a[3] - tol > b[1] && b[1] + b[3] - tol > a[1];

function check(d, name) {
  const t0 = performance.now(), r = render(d, { measure, scale: 1 }), ms = performance.now() - t0;
  window.__relaxed = (window.__relaxed || 0) + (r.report.relaxed ? 1 : 0);
  const px = d.layout.targetPx || PX, [vx, vy, vw, vh] = r.viewBox, k = px / vh;
  const issues = [], adv = [];
  for (const l of r.report.lines) if (l.margin < -0.5) issues.push(`“${l.s}” overlaps leaves by ${(-l.margin).toFixed(1)}`);
  const smallest = Math.min(...r.report.lines.filter((l) => !l.icon).map((l) => l.size).filter(Boolean), Infinity);
  // below the floor is a failure, unless the engine traded it knowingly and told the user (too much text for the size)
  if (isFinite(smallest) && smallest * k < MINPX - 0.15) (r.report.relaxed ? adv : issues).push(`smallest text ${(smallest * k).toFixed(1)} px at ${px} px tall${r.report.relaxed ? ' (warned: too much text)' : ''}`);
  // text items from different places must not touch; arcs are judged by the DOM pass below
  // (the ribbon is judged on its real curved shape in the DOM pass below)
  const its = r.items.filter((it) => !it.slot.startsWith('arc'));
  for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) if (its[i].slot !== its[j].slot && its[i].slot !== 'ribbon' && its[j].slot !== 'ribbon' && overlap(its[i].bbox, its[j].bbox)) issues.push(`${its[i].slot} text touches ${its[j].slot}`);
  const inBox = (b, [x, y], m = 0.3) => x > b[0] - m && x < b[0] + b[2] + m && y > b[1] - m && y < b[1] + b[3] + m;
  for (const it of its) for (const o of r.report.ornaments) if (it.slot !== 'ribbon' && (o.pts ? o.pts.some((q) => inBox(it.bbox, q)) : overlap(it.bbox, o.bbox, 1))) issues.push(`${it.slot} text touches the ${o.part}`);
  // the real thing: nothing outside the canvas; arc text clear of the badge
  host.innerHTML = r.svg; const svg = host.firstChild;
  for (const g of svg.querySelectorAll(':scope > g')) { const b = g.getBBox(); if (b.width && (b.x < vx - 0.6 || b.y < vy - 0.6 || b.x + b.width > vx + vw + 0.6 || b.y + b.height > vy + vh + 0.6)) { issues.push(`drawn outside the canvas (${g.querySelector('text') ? 'text' : 'artwork'})`); break; } }
  // arc text vs the badge, letter by letter (a curved line's overall box would cover the badge even when clear)
  // (and the same, letter by letter, against every other line of text: the name block, the ribbon, above and below)
  const others = r.items.filter((it) => !it.slot.startsWith('arc'));
  const orPts = r.report.ornaments.filter((o) => o.pts).flatMap((o) => o.pts);
  for (const t of svg.querySelectorAll('text[data-part^="arc"]')) { for (let i = 0; i < t.getNumberOfChars(); i++) { const e = t.getExtentOfChar(i), b = [e.x, e.y + e.height * 0.2, e.width, e.height * 0.6]; if (orPts.some((q) => inBox(b, q, -0.3))) { issues.push('arc text runs into a frame line or tendril'); break; } } }
  for (const t of svg.querySelectorAll('text[data-part^="arc"]')) { let hit = null; for (let i = 0; i < t.getNumberOfChars() && !hit; i++) { const e = t.getExtentOfChar(i); hit = others.find((it) => overlap([e.x, e.y + e.height * 0.2, e.width, e.height * 0.6], it.bbox, 1)); } if (hit) issues.push(`arc text runs into the ${hit.slot === 'inside' ? 'text inside' : hit.slot}`); }
  // the curved ribbon vs every other line of text: sample each line's box against the real band
  const bands = [...svg.querySelectorAll('[data-part="ribbon"]')];
  if (bands.length) for (const it of its) { if (it.slot === 'ribbon') continue; const [x, y, w, h] = it.bbox; let hit = false; for (let i = 0; i <= 8 && !hit; i++) for (let j = 0; j <= 2 && !hit; j++) { const p = svg.createSVGPoint(); p.x = x + (w * i) / 8; p.y = y + (h * j) / 2; hit = bands.some((b) => b.isPointInFill(p)); } if (hit) issues.push(`${it.slot} text is under the ribbon`); }
  host.innerHTML = '';
  if (ms > 250) issues.push(`slow: ${ms.toFixed(0)} ms`);
  if (r.svg.length > 700 * 1024) issues.push(`heavy: ${(r.svg.length / 1024).toFixed(0)} KB`);
  adv.push(...r.report.warnings);
  window.__docs = window.__docs || {}; if (issues.length) window.__docs[name] = d;
  return { name, r, issues, adv, ms, kb: r.svg.length / 1024 };
}

const groups = []; // [title, cases, drawAll]
// 1. names
const NAMES = [['Shortest', 'SXSW'], ['Long one word', 'Kinderfilmfestspiele'], ['Long name', 'International Documentary Film Festival Amsterdam'], ['Award', 'Best Achievement in Cinematography'], ['Diacritics', 'Göteborg · Cinéma du Réel'], ['Ampersand', 'Film & Video Festival'], ['Lowercase', 'nightfall'], ['Numbers', '75th Annual'], ['Cyrillic', 'Московский кинофестиваль'], ['Greek', 'Φεστιβάλ Θεσσαλονίκης'], ['Japanese', '東京国際映画祭'], ['Korean', '부산국제영화제'], ['Arabic (RTL)', 'مهرجان البحر الأحمر'], ['Hindi', 'अंतर्राष्ट्रीय फ़िल्म महोत्सव'], ['Emoji', 'Shorts 🎬 Fest'], ['Empty hero', '']];
groups.push(['Names and scripts', NAMES.map(([n, s]) => [n, base({}), F('Official Selection', s, '2026')]), true]);
// 2. line counts and slots
const OUTSIDE = [{ id: 'a', kind: 'status', text: 'Official Selection', slot: 'arc-top' }, { id: 'h', kind: 'festival', text: 'Atlas', role: 'hero', slot: 'inside' }, { id: 'y', kind: 'year', text: '2026', slot: 'ribbon' }, { id: 'l', kind: 'location', text: 'Lisbon', role: 'sub', slot: 'below' }, { id: 'b', kind: 'icon', text: 'star', slot: 'badge' }];
const LINES = [
  ['1 line', F('', 'Tribeca', '')],
  ['2 lines', F('Winner', 'Sundance', '')],
  ['3 lines', F('Official Selection', 'Berlinale', '2026')],
  ['4 + icon', [{ id: 'i', kind: 'icon', text: 'star', role: 'eyebrow', slot: 'inside' }, ...F('Winner', 'Best Short Film', '2026')]],
  ['5 lines', [{ id: 'i', kind: 'icon', text: 'stars', role: 'eyebrow', slot: 'inside' }, ...F('Winner', 'Best Documentary', ''), { id: 'c', kind: 'category', text: 'Feature Competition', role: 'sub', slot: 'inside' }, { id: 'y', kind: 'year', text: 'Hot Docs 2026', role: 'sub', slot: 'inside' }]],
  ['7 lines', [{ id: 'i', kind: 'icon', text: 'crown', role: 'eyebrow', slot: 'inside' }, { id: 's', kind: 'status', text: 'Winner', role: 'eyebrow', slot: 'inside' }, { id: 'a', kind: 'award', text: 'Grand Jury Prize', role: 'hero', slot: 'inside' }, { id: 'c', kind: 'category', text: 'International Competition', role: 'sub', slot: 'inside' }, { id: 'f', kind: 'festival', text: 'Rotterdam', role: 'sub', slot: 'inside' }, { id: 'l', kind: 'location', text: 'The Netherlands', role: 'sub', slot: 'inside' }, { id: 'y', kind: 'year', text: '2026', role: 'sub', slot: 'inside' }]],
  ['Joined line', [...F('Official Selection', 'Tribeca', ''), { id: 'y', kind: 'year', text: '2026', role: 'hero', slot: 'inside', join: true }]],
  ['Everything outside', OUTSIDE],
];
groups.push(['Line counts and slots', LINES.map(([n, f]) => [n, base({ form: n === 'Everything outside' ? 'wreath' : 'open' }), f]), true]);
// 3. forms × a demanding text
const FORMS = ['open', 'wreath', 'single', 'crown', 'swoop', 'flank', 'text'];
groups.push(['Forms (North American Premiere / Documentary Fortnight)', FORMS.map((fm) => [fm, base({ form: fm, layout: fm === 'crown' ? { dy: 16 } : fm === 'swoop' ? { dy: -24 } : {} }), F('North American Premiere', 'Documentary Fortnight', '2026')]), true]);
// 4. every preset × six texts: short, long award, long name, five lines, Japanese, everything outside
const TEXTS = [
  ['short', F('Official Selection', 'SXSW', '2026')],
  ['long award', F('Winner', 'Best Animated Short Film', 'Annecy 2026')],
  ['long name', F('Official Selection', 'International Documentary Film Festival Amsterdam', '2026')],
  ['5 lines', LINES[4][1]],
  ['Japanese', F('公式出品', '東京国際映画祭', '2026')],
  ['outside', OUTSIDE],
];
groups.push([`Every preset × ${TEXTS.length} texts`, PRESETS.flatMap((p) => TEXTS.map(([t, f]) => [`${p.name} · ${t}`, fromPreset(p), p.layout && t !== 'outside' ? layoutFields(f, LAY[p.layout], newId) : f])), false]);
// 4b. every layout × a third of the presets (rotating, so every preset meets six layouts), short and long words
const RICH = (long) => [{ id: 's', kind: 'status', text: long ? 'North American Premiere' : 'Official Selection' }, { id: 'f', kind: 'festival', text: long ? 'International Documentary Festival Amsterdam' : 'Northlight' }, { id: 'a', kind: 'award', text: long ? 'Best Achievement in Cinematography' : 'Best Short' }, { id: 'c', kind: 'category', text: long ? 'International Feature Competition' : 'Shorts' }, { id: 'l', kind: 'location', text: long ? 'Rio de Janeiro' : 'Lisbon' }, { id: 'e', kind: 'edition', text: long ? '75th Anniversary Edition' : '12th Edition' }, { id: 'y', kind: 'year', text: '2026' }].map((x) => ({ ...x, role: 'sub', slot: 'inside', show: true }));
const LXP = [];
LAYOUTS.forEach((L, li) => PRESETS.forEach((p, pi) => { if ((pi + li) % 3) return; const long = (pi + li) % 2 === 1; LXP.push([`${L.name} · ${p.name} · ${long ? 'long' : 'short'}`, fromPreset(p), layoutFields(RICH(long), L, newId)]); }));
groups.push([`Every layout × a third of the presets (${LXP.length})`, LXP, false]);
// 5. extreme wreath parameters, old and new
const EXT = [['Few huge leaves', { branch: { leaf: { n: 3, L0: 70, L1: 50, wr: 0.6 } } }], ['40 tiny leaves', { branch: { leaf: { n: 32, L0: 10, L1: 6, wr: 0.4 } } }], ['Very wide leaves', { branch: { leaf: { wr: 1.2, profile: 'round', n: 8 } } }], ['Hairline', { branch: { leaf: { wr: 0.1, profile: 'willow', n: 20 }, stem: { w: 0.3 } } }], ['Narrow wreath', { branch: { spine: { rx: 0.42 } } }], ['Wide wreath', { branch: { spine: { rx: 1.3, ry: 0.6 } } }], ['Max curl', { branch: { spine: { curl: 80 } } }], ['Max outward curl', { branch: { spine: { curl: -80 } } }], ['Spiral', { branch: { spine: { spiral: 0.6 } } }], ['Full circle', { branch: { spine: { a0: 60, a1: 300, cross: 40 } } }], ['Inward leaves only', { branch: { leaf: { arr: 'inner', n: 12 } } }], ['Double row heavy', { branch: { rows: 2, leaf: { n: 18, L0: 34, L1: 20, wr: 0.5 } } }],
  ['Max S-curve', { branch: { leaf: { scurve: 1, n: 14 } } }], ['Max fan', { branch: { leaf: { fan: 1, aOut: 70 } } }], ['Max rhythm', { branch: { leaf: { alt: 0.6, n: 20 } } }], ['Hatch on huge leaves', { branch: { leaf: { style: 'hatch', n: 4, L0: 70, L1: 50, wr: 0.6 } } }], ['Carved + max fold', { branch: { leaf: { style: 'carved', fold: 0.6 } } }],
  ['Plume, big', { branch: { leaf: { family: 'plume', n: 8, L0: 70, L1: 50, wr: 0.7 } } }], ['Bloom, many', { branch: { leaf: { family: 'bloom', n: 20, L0: 20, L1: 14, wr: 0.9 } } }], ['Bead, huge', { branch: { leaf: { family: 'bead', n: 10, L0: 30, L1: 20, wr: 1.2 } } }],
  ['Tendrils + badge', { form: 'wreath', branch: { orn: { tip: 'curl' } } }], ['Streamers + ribbon', { form: 'wreath', branch: { orn: { tie: 'streamers' } } }], ['Streamers, tiny leaves', { form: 'wreath', branch: { leaf: { L0: 8, L1: 5, n: 30 }, orn: { tie: 'streamers' } } }], ['Streamers, huge leaves', { form: 'wreath', branch: { leaf: { L0: 60, L1: 40, n: 5 }, orn: { tie: 'streamers' } } }], ['Olives every leaf', { branch: { orn: { berries: 1, berryShape: 'olive', berrySize: 2.5 } } }]];
groups.push(['Extreme wreaths', EXT.map(([n, o]) => [n, base(o), n === 'Tendrils + badge' ? [...F('Official Selection', 'Northlight', '2026'), { id: 'b', kind: 'icon', text: 'star', slot: 'badge' }] : n === 'Streamers + ribbon' ? [...F('Official Selection', 'Northlight', ''), { id: 'y', kind: 'year', text: '2026', slot: 'ribbon' }] : F('Official Selection', 'Northlight', '2026')]), true]);

// 5b. uploaded logos (original test marks: square, wide, tall, a raster): in every form and slot, with words round them
const svgUrl = (vb, body) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`);
const MARKS = [['square', 1, svgUrl('0 0 100 100', '<circle cx="50" cy="50" r="44" fill="none" stroke="#eee" stroke-width="6"/><circle cx="50" cy="50" r="12" fill="#eee"/>')],
  ['wide', 3.4, svgUrl('0 0 340 100', '<circle cx="50" cy="50" r="40" fill="#d8452f"/><rect x="110" y="18" width="210" height="26" fill="#eee"/><rect x="110" y="60" width="170" height="14" fill="#eee"/>')],
  ['tall', 0.72, svgUrl('0 0 72 100', '<path d="M4 6H68V52C68 76 52 90 36 96 20 90 4 76 4 52Z" fill="#eee"/>')],
  ['very wide', 6, svgUrl('0 0 600 100', '<rect width="600" height="100" rx="20" fill="#eee"/>')]];
const LOGO_TEXTS = [['alone', () => []], ['status + year', () => F('Official Selection', '', '2026')], ['winner + award', () => F('Winner', '', 'Best Documentary Feature')], ['arc + under', () => [{ id: 'a', kind: 'status', text: 'Official Selection', slot: 'arc-top' }, { id: 'y', kind: 'year', text: '2026', slot: 'arc-under' }]]];
const LOGOS = [];
FORMS.forEach((fm, fi) => MARKS.forEach(([mn, ar, src], mi) => LOGO_TEXTS.forEach(([tn, tf], ti) => {
  const slot = (fi + mi + ti) % 5 === 4 ? 'below' : (fi + mi + ti) % 7 === 6 ? 'above' : 'inside';
  const d = base({ form: fm }); if (fm === 'text') d.frame = { ...d.frame, kind: ['ring', 'box', 'ticket', 'oval'][(mi + ti) % 4] };
  LOGOS.push([`${fm} · ${mn} logo ${slot} · ${tn}`, d, [...tf().slice(0, 1), { id: 'g', kind: 'logo', src, ar, role: slot === 'inside' ? 'hero' : 'sub', slot, tint: (fi + ti) % 3 === 0 }, ...tf().slice(1)]]);
})));
// every layout with a logo as the name (the festival name hidden, as when artwork replaces it), in a rotating look
LAYOUTS.forEach((L, li) => { const p = PRESETS[(li * 7) % PRESETS.length], [mn, ar, src] = MARKS[li % 3];
  LOGOS.push([`${L.name} · ${p.name} · ${mn} logo as the name`, fromPreset(p), layoutFields([...F('Official Selection', 'Northlight', '2026').map((f) => (f.kind === 'festival' ? { ...f, show: false } : f)), { id: 'g', kind: 'logo', src, ar, role: 'hero', slot: 'inside' }], L, newId)]); });
groups.push([`Logos (${LOGOS.length})`, LOGOS, false]);

// 6. fuzz: random looks (every style, shading, tip and tie) × random texts and slots
const POOL = { status: ['Official Selection', 'Winner', 'Nominee', 'World Premiere', 'North American Premiere', 'Special Mention', 'Audience Award', 'Finalist', ''], hero: ['SXSW', 'Tribeca', 'Berlinale', 'Best Documentary', 'Grand Jury Prize', 'Palm Springs ShortFest', 'Sheffield DocFest', 'Best Director', 'International Film Festival Rotterdam', 'Hot Docs'], year: ['2026', '2025', 'Park City 2026', 'MMXXVI', ''] };
const FUZZ_FONTS = ['Figtree', 'Cinzel', 'Playfair Display', 'Bebas Neue', 'Jost', 'Cormorant Garamond', 'Bodoni Moda', 'Syne', 'Anton', 'Gilda Display', 'Josefin Sans', 'Big Shoulders Display'];
const fuzz = [];
for (let i = 0; i < 400; i++) {
  const r = rngOf(i * 977 + 3), pick = (a) => a[Math.floor(r() * a.length)];
  const s = shuffleBranch(i + 1);
  const form = pick(['open', 'open', 'open', 'wreath', 'wreath', 'single', 'flank', 'crown', 'swoop']);
  let d = base({ form }); d.branch = merge(d.branch, s); if (form !== 'open') d = applyForm(d, form);
  const style = pick(['solid', 'slit', 'carved', 'inline', 'engraved', 'hatch', 'split']);
  d.branch = merge(d.branch, { rows: r() < 0.12 ? 2 : 1, leaf: { style, asym: r() * 0.4, fold: ['solid', 'slit', 'carved'].includes(style) && r() < 0.6 ? 0.3 : 0 }, orn: { tip: pick(['leaf', 'leaf', 'bud', 'berry', 'star', 'curl', 'none']), berries: r() < 0.3 ? pick([1, 2, 3]) : 0, berryShape: pick(['dot', 'olive', 'cluster']), tie: form === 'wreath' ? pick(['none', 'band', 'knot', 'rosette', 'bow', 'streamers']) : 'none' } });
  d.seed = i;
  const fnt = pick(FUZZ_FONTS);
  for (const k of Object.keys(d.roles)) d.roles[k].font = fnt;
  const fields = F(pick(POOL.status), pick(POOL.hero), pick(POOL.year));
  const y = fields.find((x) => x.kind === 'year'); if (y && r() < 0.2) y.slot = pick(['ribbon', 'below', 'arc-bottom']);
  const st = fields.find((x) => x.kind === 'status'); if (st && r() < 0.15) st.slot = pick(['arc-top', 'above']);
  if (form === 'wreath' && r() < 0.15) fields.push({ id: 'b', kind: 'icon', text: 'star', slot: 'badge' });
  fuzz.push([`#${i} ${form} ${fnt} ${style}`, d, fields]);
}

// 7. badges: every frame, outlined or filled, single or double, random words, slots, sizes and fonts
const bfuzz = [];
for (let i = 0; i < 180; i++) {
  const r = rngOf(i * 613 + 7), pick = (a) => a[Math.floor(r() * a.length)];
  const kind = pick(Object.keys(FRAMES)), fixed = ['ring', 'oval', 'scallop'].includes(kind);
  const d = applyForm(base({}), 'text');
  d.frame = { ...d.frame, kind, filled: r() < 0.5, double: r() < 0.5, w: 0.6 + r() * 3, gap: 1.5 + r() * 6, size: fixed ? 0.7 + r() * 0.8 : 1, band: 0.18 + r() * 0.18, radius: r(), orn: pick(['star', 'dot', 'diamond', 'none']) };
  d.paint.branch = pick([{ type: 'metal', metal: 'gold', scope: 'leaf', angle: 28 }, '#d7262e', '#141414', '#f2c14e', '#ffffff']);
  d.canvas.bg = pick(['#0f1116', '#ffffff', '#f1ebdf', '#1d1a2b']); d.seed = i;
  const fnt = pick(FUZZ_FONTS); for (const k of Object.keys(d.roles)) d.roles[k].font = fnt;
  const fields = F(pick(POOL.status), pick(POOL.hero), pick(POOL.year));
  const st = fields.find((x) => x.kind === 'status'), y = fields.find((x) => x.kind === 'year');
  if (fixed && st && r() < 0.6) st.slot = 'arc-top';
  if (fixed && y && r() < 0.6) y.slot = pick(['arc-under', 'arc-bottom']);
  if (!fixed && st && r() < 0.2) st.slot = pick(['arc-top', 'above']);
  if (!fixed && y && r() < 0.2) y.slot = pick(['below', 'ribbon', 'arc-under']);
  if (r() < 0.15) fields.push({ id: 'b', kind: 'icon', text: 'star', slot: 'badge' });
  bfuzz.push([`B${i} ${kind}${d.frame.filled ? ' filled' : ''}${d.frame.double ? ' double' : ''} ${fnt}`, d, fields]);
}

const card = (res) => `<div class="card${res.issues.length ? ' bad' : ''}">${res.r.svg}<p>${res.name} · hero ${res.r.report.hero.toFixed(1)}${res.r.report.wrapped ? ' · wrapped' : ''} · ${res.ms.toFixed(0)} ms · ${res.kb.toFixed(0)} KB</p>${res.issues.length ? `<p class="w">${res.issues.join('<br>')}</p>` : ''}${res.adv.length ? `<p>${res.adv.join('<br>')}</p>` : ''}</div>`;
(async () => {
  const fonts = new Set(['Noto Sans', ...FUZZ_FONTS]); PRESETS.forEach((p) => Object.values(p.doc.roles || {}).forEach((r) => r && r.font && fonts.add(r.font)));
  await Promise.all([...fonts].map((f) => loadFont(f, [300, 400, 500, 600, 700, 800, 900])));
  await document.fonts.ready;
  const out = document.getElementById('out'), table = [], all = { total: 0, bad: 0, adv: 0, ms: 0, maxMs: 0, maxKb: 0, kinds: {} };
  const kind = (x) => x.replace(/“.*”/, '“…”').replace(/[\d.]+ (px|ms|KB)/, 'N $1').replace(/by [\d.]+/, '').trim();
  const run = (title, cases, drawAll, limit = 40) => {
    let bad = 0, adv = 0, ms = 0, shown = 0; const grid = document.createElement('div'); grid.className = 'grid';
    for (const [name, d, fields] of cases) {
      d.fields = clone(fields); const res = check(d, name);
      all.total++; ms += res.ms; all.maxMs = Math.max(all.maxMs, res.ms); all.maxKb = Math.max(all.maxKb, res.kb);
      if (res.issues.length) { bad++; res.issues.forEach((x) => (all.kinds[kind(x)] = (all.kinds[kind(x)] || 0) + 1)); }
      if (res.adv.length) adv++;
      if (drawAll || (res.issues.length && shown++ < limit)) grid.insertAdjacentHTML('beforeend', card(res));
    }
    all.bad += bad; all.adv += adv; all.ms += ms;
    table.push(`<tr><td>${title}</td><td>${cases.length - bad}/${cases.length}</td><td>${adv}</td><td>${(ms / cases.length).toFixed(1)} ms</td></tr>`);
    out.insertAdjacentHTML('beforeend', `<h2>${title} — ${cases.length - bad}/${cases.length} clean${drawAll ? '' : ` (failures only, first ${limit})`}</h2>`); out.append(grid);
  };
  for (const [title, cases, drawAll] of groups) run(title, cases, drawAll);
  run(`Random laurels (${fuzz.length})`, fuzz, false);
  run(`Random badges (${bfuzz.length})`, bfuzz, false);
  const kinds = Object.entries(all.kinds).sort((a, b) => b[1] - a[1]);
  document.getElementById('sum').innerHTML = `<div><b>${all.total - all.bad}/${all.total}</b>clean at ${PX} px</div><div><b>${all.adv}</b>with advisory warnings</div><div><b>${(all.ms / all.total).toFixed(1)} ms</b>average render (max ${all.maxMs.toFixed(0)})</div><div><b>${all.maxKb.toFixed(0)} KB</b>heaviest SVG</div>`
    + `<table><tr><th>Group</th><th>Clean</th><th>Advisories</th><th>Avg</th></tr>${table.join('')}</table>`
    + `<table><tr><th>Failure kind</th><th>Cases</th></tr>${kinds.map(([k, n]) => `<tr><td>${k}</td><td>${n}</td></tr>`).join('') || '<tr><td>none</td><td>0</td></tr>'}</table>`;
  window.__stress = { ...all, kinds };
})();
