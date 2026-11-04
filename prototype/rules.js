// rules.js — the festival rules check and the prestige order for rows. Gentle notes, never blocks: Daphne can't verify
// a selection and mustn't pretend to. The rules come from what festivals publish (research/01 §2); the sources are
// linked so anyone can check them. This file is open data on purpose: festivals and designers can add to it.
import { festivalFromText } from './festivals.js';
import { assetMissing } from './engine.mjs';

// Festivals that publish rules about laurels. `aliases` match the festival line (case-insensitive, whole words).
//   artwork: 'required' (the festival supplies official artwork and requires it), 'supplied' (it supplies artwork and
//            asks for it unaltered), 'prefer' (it would rather you didn't make your own);
//   fullName: the name may not be shortened; parity: its laurel must be at least as large as any other on the same piece;
//   renamed: an older name still seen on laurels.
export const FESTIVALS = [
  { id: 'sundance', name: 'Sundance Film Festival', aliases: ['sundance', 'sundance film festival', 'sundance ff'], tier: 1, artwork: 'supplied', fullName: true, parity: true,
    source: ['Sundance official laurel guidelines (2024)', 'https://www.sundance.org/wp-content/uploads/2023/10/Sundance-Film-Festival-Official-Selection-Laurels.pdf'] },
  { id: 'cannes', name: 'Festival de Cannes', aliases: ['cannes', 'festival de cannes', 'cannes film festival', 'festival international du film de cannes'], tier: 1, artwork: 'required', market: true,
    source: ['Festival de Cannes 2026 regulations, art. 9', 'https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_longs-metrages_2026_en.pdf'] },
  { id: 'berlinale', name: 'Berlinale', aliases: ['berlinale', 'berlin international film festival', 'internationale filmfestspiele berlin', 'berlin film festival'], tier: 1, artwork: 'required', perSection: true,
    source: ['Berlinale general guidelines §3.4', 'https://www.berlinale.de/en/film-entry/guidelines/general-guidelines.html'] },
  { id: 'giffoni', name: 'Giffoni Film Festival', aliases: ['giffoni', 'giffoni film festival', 'gff'], tier: 2, artwork: 'required',
    source: ['Giffoni Film Festival on FilmFreeway', 'https://filmfreeway.com/GiffoniFilmFestival'] },
  { id: 'tallahassee', name: 'Tallahassee Film Festival', aliases: ['tallahassee film festival', 'tallahassee'], tier: 3, artwork: 'prefer',
    source: ['Tallahassee Film Festival FAQ', 'https://tallahasseefilmfestival.com/ufaq-category/exhibiting-a-film/'] },
  { id: 'tribeca', name: 'Tribeca Festival', aliases: ['tribeca', 'tribeca festival', 'tribeca film festival'], tier: 2, renamed: { old: /tribeca film festival/i, now: 'Tribeca Festival', since: 2021 },
    source: ['Tribeca Festival (renamed 2021)', 'https://en.wikipedia.org/wiki/Tribeca_Festival'] },
  { id: 'clermont', name: 'Clermont-Ferrand International Short Film Festival', aliases: ['clermont-ferrand', 'clermont ferrand', 'clermont'], tier: 1, market: true,
    source: ['Clermont-Ferrand regulations 2025 (the market lists every entry)', 'https://clermont-filmfest.org/wp-content/uploads/2024/06/EN-Re%CC%80glement-international-2025.pdf'] },
];

// Prestige, for ordering a row. Not a judgment of any festival: a rough, widely shared sense of which names carry
// furthest on a poster. Festivals not listed sort by what they gave you. Add to it freely.
const TIER1 = ['venice', 'biennale', 'mostra', 'toronto', 'tiff', 'telluride', 'new york film festival', 'nyff', 'locarno', 'san sebastián', 'san sebastian', 'karlovy vary', 'kviff', 'rotterdam', 'iffr', 'annecy', 'idfa', 'sxsw', 'south by southwest'];
const TIER2 = ['bfi london', 'london film festival', 'busan', 'hot docs', 'cph:dox', 'cphdox', 'sheffield', 'docfest', 'sitges', 'fantastic fest', 'palm springs', 'afi fest', 'slamdance', 'tallinn', 'black nights', 'mar del plata', 'shanghai', 'tokyo international', 'edinburgh', 'melbourne international', 'sydney film', 'thessaloniki', 'sarajevo', 'oberhausen', 'tampere', 'doc nyc', 'true/false', 'full frame', 'visions du réel', 'visions du reel', 'hong kong international', 'göteborg', 'goteborg', 'gothenburg', 'raindance', 'encounters', 'glasgow film', 'dublin international', 'outfest', 'frameline', 'zurich film', 'zff', 'vienna', 'viennale', 'new directors', 'cinéma du réel', 'krakow', 'dok leipzig', 'ann arbor', 'aspen shortsfest', 'hollyshorts'];
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const hasWord = (hay, w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(hay);
export function festivalOf(name) {
  const n = norm(name); if (!n) return null;
  return FESTIVALS.find((F) => F.aliases.some((a) => hasWord(n, a))) || null;
}
export function tierOf(name) {
  const n = norm(name), F = festivalOf(name);
  if (F) return F.tier;
  const D = festivalFromText(name); if (D) return D.tier;
  if (TIER1.some((a) => hasWord(n, a))) return 1;
  if (TIER2.some((a) => hasWord(n, a))) return 2;
  return 3;
}

// what a status is worth on a poster: wins first, then premieres, then selections. Qualifiers come first, so
// "Audience Award Nominee" ranks as a nomination and "Semi-Finalist" below "Finalist". Ranking is for order only:
// what a status says happened is outcomeOf's job.
const STATUS_RANK = [
  [/\b(semi-?finalist|quarter-?finalist)\b/i, 4],
  [/\b(nominee|nominated|nomination|finalist|shortlist(ed)?)\b/i, 12],
  [/\b(special mention|honou?rable mention|mention)\b/i, 38],
  [/\b(grand prix|grand prize|golden|palme|winner|won|award|prize|best)\b/i, 50],
  [/\b(jury|audience)\b/i, 38],
  [/\bworld premiere\b/i, 32],
  [/\b(international|european|north american|us|u\.s\.|uk|asian|african|latin american|canadian|australian) premiere\b/i, 26],
  [/\bpremiere\b/i, 22],
  [/\b(in competition|competition|official selection|selection|selected|opening night|closing night|centrepiece|centerpiece|gala)\b/i, 16],
];
export const statusRank = (s) => { for (const [re, v] of STATUS_RANK) if (re.test(s || '')) return v; return s ? 10 : 8; };
// the status decides; an award name only counts when there's no status ("Best Editing" under "Nominee" isn't a win)
export const prestige = (it) => { const st = statusRank(it.status || it.award), won = st >= 50; return (it.src ? 140 : 0) + ({ 1: 100, 2: 65, 3: 30 }[tierOf(it.festival)] || 30) + st + (it.award ? (won ? 4 : 1) : 0); };

// the statuses festivals actually grant, for pickers (research/01 §2.3)
export const STATUSES = ['Official Selection', 'Winner', 'World Premiere', 'International Premiere', 'European Premiere', 'North American Premiere', 'Nominee', 'Finalist', 'Semi-Finalist', 'Special Mention', 'Honorable Mention', 'Audience Award', 'Jury Award', 'In Competition', 'Opening Night'];

const SUBMITTED = /\b(submitted|official submission|submission|accepted|entrant|entry)\b/i;
const MARKET = /\b(market|marché|marche|short film corner|film library|video library|industry screening)\b/i;
const SELECTION = /\b(official selection|selection|selected|in competition)\b/i;
const PREMIERE = /\b(world|international|european|north american|us|u\.s\.|uk|asian|african|latin american|canadian|australian) premiere\b/i;

// The laurel on its own: its words, its logo, its tint. `d` is the document; returns [{ level, text, source? }]
// (level 'rule' = a festival's published rule; 'tip' = advice).
export function checkLaurel(d) {
  const vis = (d.fields || []).filter((f) => f.show !== false);
  const text = (k) => vis.filter((f) => f.kind === k).map((f) => f.text || '').join(' ');
  const all = vis.map((f) => f.text || '').join(' ');
  const logo = vis.find((f) => f.kind === 'logo' && f.src && !assetMissing(f.src));
  // a logo uploaded on another device: the artwork goes out without it, so say so before anyone exports
  const lost = vis.some((f) => f.kind === 'logo' && f.src && assetMissing(f.src));
  // a line an older layout filled with example words the user never changed: it may say something the film didn't get
  const examples = vis.filter((f) => f.added && f.text && f.kind !== 'icon').map((f) => `"${f.text}"`);
  const out = lost ? [{ level: 'rule', check: true, text: 'The festival logo isn’t on this device: uploaded logos stay on the device they were added on. Upload it again in Every line, or the files go out without it.' }] : [];
  if (examples.length) out.push({ level: 'rule', check: true, text: `${examples.join(' and ')} ${examples.length > 1 ? 'are' : 'is'} example text a layout added. Type what the festival gave you, or hide the line.` });
  return out.concat(checkItem({ status: text('status'), festival: text('festival'), award: text('award'), all, logo: !!logo, tint: !!(logo && logo.tint) }));
}
function checkItem({ status = '', festival = '', award = '', all = '', logo = false, tint = false, row = false }) {
  const out = [], F = festivalOf(festival) || festivalOf(all), place = row ? 'add it to the row with "+ Official artwork"' : 'add it as a logo line';
  const src = F && F.source ? { label: F.source[0], url: F.source[1] } : null;
  if (F && !logo) {
    if (F.artwork === 'required') out.push({ level: 'rule', text: `${F.name} requires its own official ${F.perSection ? 'logo for each section' : 'logo'} on your publicity, poster included. Ask the festival for the file and ${place}.`, source: src });
    else if (F.artwork === 'supplied') out.push({ level: 'rule', text: `${F.name} sends official laurels and asks for them unaltered; a redrawn one needs its written approval. Use the file it sent you: ${place}.`, source: src });
    else if (F.artwork === 'prefer') out.push({ level: 'rule', text: `${F.name} has said it would rather films didn't make their own versions of its laurel. Ask for the official file first.`, source: src });
  }
  if (F && F.fullName && festival && !new RegExp(F.name.replace(/\s+/g, '\\s+'), 'i').test(festival)) out.push({ level: 'rule', text: `"${F.name}" is a trademark and may not be shortened. Write the name in full.`, source: src });
  if (F && F.renamed && F.renamed.old.test(festival)) out.push({ level: 'tip', text: `The festival has been called "${F.renamed.now}" since ${F.renamed.since}. Use its current name.`, source: src });
  if (F && tint && (F.artwork === 'required' || F.artwork === 'supplied')) out.push({ level: 'rule', text: `${F.name} asks for its artwork unaltered: turn off the logo's tint.`, source: src });
  if (SUBMITTED.test(status) || SUBMITTED.test(all)) out.push({ level: 'tip', text: 'Laurels usually mark a result the festival gave you: a selection, a premiere, an award. "Submitted" can read as overstating it.' });
  if (MARKET.test(all) && SELECTION.test(all)) out.push({ level: 'tip', text: 'Markets and libraries (Marché du Film, Short Film Corner, film libraries) aren\'t selections. Use the wording the festival gave you.', source: F && F.market ? src : null });
  if (/\bwinner\b/i.test(status) && !award.trim()) out.push({ level: 'tip', text: 'Say what it won ("Best Documentary"): "Winner" on its own reads as vague.' });
  if (!F && tierOf(festival) === 1 && !logo) out.push({ level: 'tip', text: `Major festivals usually send official artwork. Ask for it first, and ${place} if they do.` });
  return out;
}

// A row of laurels: each laurel's notes (labeled), plus what only shows up side by side.
// items: [{ status, festival, award, year, src, scale }] as placed (scale = drawn size relative to the row's base size)
export function checkRow(items) {
  const out = [];
  items.forEach((it, i) => { if (it.src) return; const label = it.festival || it.award || 'Laurel ' + (i + 1), F = festivalOf(it.festival); for (const n of checkItem({ ...it, all: `${it.status} ${it.festival} ${it.award}`, row: true })) out.push({ ...n, text: F && n.text.includes(F.name) ? n.text : `${label}: ${n.text}` }); });
  const prem = items.filter((it) => /\bworld premiere\b/i.test(it.status || '')); if (prem.length > 1) out.push({ level: 'tip', text: `${prem.length} laurels say "World Premiere". A film has one world premiere: check the wording each festival gave you.` });
  for (const kind of ['International', 'European', 'North American']) { const n = items.filter((it) => new RegExp(`\\b${kind} premiere\\b`, 'i').test(it.status || '')).length; if (n > 1) out.push({ level: 'tip', text: `${n} laurels say "${kind} Premiere". Only one festival can hold it.` }); }
  const big = Math.max(...items.map((it) => it.scale || 1));
  for (const it of items) { const F = festivalOf(it.festival); if (F && F.parity && (it.scale || 1) < big - 1e-6) out.push({ level: 'rule', text: `${F.name}'s laurel must be at least as large as any other festival's on the same piece. Make it the lead laurel, or use a layout where every laurel is the same size.`, source: { label: F.source[0], url: F.source[1] }, fix: 'lead:' + it.id }); }
  if (items.length > 8) out.push({ level: 'tip', text: 'Fewer, stronger laurels read better than a long row. Consider keeping the top few.' });
  return out;
}
export const PREMIERE_RE = PREMIERE;

// ── what a laurel says happened, in words: for press releases, IMDb, FilmFreeway, a website ──
// The status decides, read for its qualifiers before its award words, so "Audience Award Nominee" is a nomination
// and never a win. An award line with no status is the award itself, said as written. Nothing here strengthens a
// claim: no status means no selection, and only explicit winner wording becomes "Winner of".
const NOMINATION = /\b(nominee|nominated|nomination|semi-?finalist|quarter-?finalist|finalist|shortlist(ed)?|long-?list(ed)?|runner-?up|candidate|contender)\b/i;
const MENTION = /\bmention\b/i;
const WON = /\b(winner|won|wins|awarded|recipient)\b/i;
const SELECTED = /\b(official selection|selection|selected|in competition|competition|opening night|closing night|centrepiece|centerpiece|gala|screening)\b/i;
const HONOR = /\b(award|prize|grand prix|palme|golden|best|trophy|jury|audience)\b/i;
export function outcomeOf(status, award) {
  const s = (status || '').trim();
  if (!s) return award && award.trim() ? 'honor' : 'none';
  if (MARKET.test(s)) return 'market';
  if (SUBMITTED.test(s)) return 'submitted';
  if (NOMINATION.test(s)) return 'nomination';
  if (MENTION.test(s)) return 'mention';
  if (WON.test(s)) return 'win';
  if (/\bpremiere\b/i.test(s)) return 'premiere';
  if (SELECTED.test(s)) return 'selection';
  if (HONOR.test(s)) return 'honor';
  return 'other';
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const has = (a, b) => a.toLowerCase().includes(b.toLowerCase());

// The laurel and the row's shown laurels as text. `d` is the document. Returns { list, lines, sentence, html, count }.
export function accoladesOf(d) {
  const t = (k) => d.fields.filter((f) => f.kind === k && f.show !== false && f.text).map((f) => f.text.trim()).join(' ');
  const items = [];
  const self = { status: t('status'), festival: t('festival'), award: t('award'), year: (t('year').match(/\d{4}/) || [''])[0] };
  if (self.festival || self.award) items.push(self);
  for (const it of (d.row && d.row.items) || []) if (it.show !== false && (it.festival || it.award)) items.push({ status: (it.status || '').trim(), festival: (it.festival || '').trim(), award: (it.award || '').trim(), year: String(it.year || '').match(/\d{4}/)?.[0] || '' });
  const seen = new Set(), list = items.filter((it) => { const k = [it.status, it.festival, it.award, it.year].join('|').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  list.sort((a, b) => prestige(b) - prestige(a));
  for (const it of list) it.outcome = outcomeOf(it.status, it.award);
  const at = (it) => [it.festival, it.year].filter(Boolean).join(' ');
  const line = (it) => [it.status, it.award && !(it.status && has(it.status, it.award)) ? it.award : '', at(it)].filter(Boolean).join(', ');
  // one accolade as a phrase, in the filmmaker's own words: "Nominee for Best Editing at Raindance 2026"
  const phrase = (it) => {
    let w;
    if (!it.status) w = it.award;
    else if (!it.award || has(it.status, it.award) || has(it.award, it.status)) w = it.status.length >= (it.award || '').length ? it.status : it.award;
    else w = /^(nomination|mention|win)$/.test(it.outcome) || it.outcome === 'honor' ? `${it.status} for ${it.award}` : `${it.status}, ${it.award}`;
    return at(it) ? `${w} at ${at(it)}` : w;
  };
  const and = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const some = (a, n = 3) => and(a.slice(0, n)) + (a.length > n ? `, and ${a.length - n} more` : '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const of = (...k) => list.filter((it) => k.includes(it.outcome));
  const s = [];
  const prem = of('premiere')[0];
  if (prem) s.push(`${phrase(prem)}.`);
  // a festival counts as a selection only when a laurel there says the film played: selected, premiered, won or honored
  const fests = [...new Set(of('selection', 'premiere', 'win', 'honor', 'mention').map((it) => it.festival).filter(Boolean))];
  const sel = of('selection');
  if (fests.length > 1) s.push(`Selected for ${fests.length} festivals, including ${and(fests.slice(0, 3))}.`);
  else if (sel.length && !prem) s.push(`${[sel[0].status, at(sel[0])].filter(Boolean).join(', ')}.`);
  const wins = of('win');
  // "Grand Jury Prize Winner" won the Grand Jury Prize; a bare "Winner" or "Award Winner" won an award
  const prize = (w) => { if (w.award) return w.award; const r = w.status.replace(/\b(award[- ])?(winner|won|wins|awarded|recipient)( of)?\b/gi, '').replace(/^[\s,:–—-]+|[\s,:–—-]+$/g, ''); return !r || /^(an? )?award$/i.test(r) ? 'an award' : r; };
  if (wins.length) s.push(`Winner of ${some(wins.map((w) => prize(w) + (at(w) ? ` at ${at(w)}` : '')))}.`);
  const honors = of('honor', 'mention');
  if (honors.length) s.push(cap(`${some(honors.map(phrase))}.`));
  const noms = of('nomination', 'other');
  if (noms.length) s.push(cap(`${some(noms.map(phrase))}.`));
  return { list, lines: list.map(line), sentence: s.join(' '), html: `<ul class="laurels">\n${list.map((it) => `  <li>${escHtml(line(it))}</li>`).join('\n')}\n</ul>`, count: list.length };
}
