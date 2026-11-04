// layouts.js — where the words go, independent of the look. A layout arranges the user's own fields: which kind
// becomes the hero, what sits on which line or slot, and what joins onto what. It never deletes words:
//   · a field the layout uses is shown and given its role, slot and join;
//   · a kind the layout leaves out (say, the year in "No year") is hidden, so switching back brings it back;
//   · a kind the layout needs but the user hasn't added yet arrives empty, marked `added`, for the user to fill in:
//     a layout never writes a fact (an award, a place, an edition, a year). Thumbnails can ask for examples instead;
//   · a status that qualifies an award (Nominee, Official Selection) stays shown, even in a layout without a status
//     line, so "Nominee, Best Documentary" never turns into a bare "Best Documentary";
//   · custom lines stay where they are, unless the layout is `only` (name only).
//   · an uploaded logo can be the name: a hero line takes it when no name is showing.
// Order, shares and examples come from the research (68 laurels, research/01 §1.3): the year on its own line is the
// most common placement (41%), then after the name (21%), as the hero (13%), absent (10%), on the status line (9%).
import { LOGO_SLOTS } from './engine.mjs';
import { outcomeOf } from './rules.js';

export const LAYOUT_GROUPS = ['Where the year goes', 'Awards', 'Extras'];

// example text for a kind the user hasn't added yet: for thumbnails and input placeholders, never for the artwork
export const EXAMPLE = { status: 'Official Selection', festival: 'Northlight', award: 'Best Documentary', category: 'Feature Competition', location: 'Lisbon', edition: '75th Edition', year: '2026', custom: 'Your line', icon: 'star' };
const GOVERNED = ['status', 'festival', 'award', 'category', 'location', 'year', 'edition', 'icon'];

const line = (kind, role, o = {}) => ({ kind, role, slot: 'inside', ...o });
// the name line of a layout that isn't about an award: whichever the user leads with, the festival or the award
// (so an award laurel keeps its award as the hero when it moves into a seal, a ribbon or a big year)
const NAME = 'festival|award';
export const LAYOUTS = [
  // ── where the year goes ──
  { id: 'year-below', group: 'Where the year goes', name: 'Year below', note: 'The most common: 41% of laurels', lines: [line('status', 'eyebrow'), line(NAME, 'hero'), line('year', 'sub')] },
  { id: 'year-with-name', group: 'Where the year goes', name: 'Year with the name', note: 'On the name line: 21% (TIFF, Venice, SXSW)', lines: [line('status', 'eyebrow'), line(NAME, 'hero'), line('year', 'hero', { join: true })] },
  { id: 'big-year', group: 'Where the year goes', name: 'Big year', note: 'The year as the hero numeral: 13% (Tribeca, Sheffield)', lines: [line(NAME, 'hero'), line('year', 'big'), line('status', 'eyebrow')] },
  { id: 'year-with-status', group: 'Where the year goes', name: 'Year with the status', note: '"Official Selection 2026": 9% (BFI London, Sundance)', lines: [line('status', 'eyebrow'), line('year', 'eyebrow', { join: true }), line(NAME, 'hero')] },
  { id: 'year-with-place', group: 'Where the year goes', name: 'Year with the place', note: '"Cannes 2026" under the name (Quinzaine)', lines: [line('status', 'eyebrow'), line(NAME, 'hero'), line('location', 'sub'), line('year', 'sub', { join: true })] },
  { id: 'no-year', group: 'Where the year goes', name: 'No year', note: 'Name and status only: 10% (Cannes, Telluride)', lines: [line('status', 'eyebrow'), line(NAME, 'hero')] },
  { id: 'two-lines', group: 'Where the year goes', name: 'Name and year', note: 'Two lines, no status', lines: [line(NAME, 'hero'), line('year', 'sub')] },
  // ── awards ──
  { id: 'winner', group: 'Awards', name: 'Winner', note: 'Status, award, festival, year: the classic award laurel', lines: [line('status', 'eyebrow'), line('award', 'hero'), line('festival', 'sub'), line('year', 'sub')] },
  { id: 'award-detail', group: 'Awards', name: 'Award, in full', note: 'Five lines and stars: the most seen (SXSW, Woods Hole)', lines: [line('icon', 'eyebrow', { icon: 'stars' }), line('status', 'eyebrow'), line('award', 'hero'), line('category', 'sub'), line('festival', 'sub'), line('year', 'sub', { join: true })] },
  { id: 'award-festival-hero', group: 'Awards', name: 'Festival first', note: 'The festival leads, the award sits under it', lines: [line('festival', 'hero'), line('award', 'sub'), line('year', 'sub')] },
  { id: 'star-winner', group: 'Awards', name: 'Star winner', note: 'A star over the award (Lund, Woods Hole)', lines: [line('icon', 'eyebrow', { icon: 'star' }), line('award', 'hero'), line('festival', 'sub'), line('year', 'sub', { join: true })] },
  // ── extras ──
  { id: 'name-only', group: 'Extras', name: 'Name only', note: 'Brand-led, like the top-tier festivals', lines: [line(NAME, 'hero')], only: true },
  { id: 'edition', group: 'Extras', name: 'Edition', note: '"75th Edition" over the name (Venice, Berlinale)', lines: [line('edition', 'eyebrow'), line(NAME, 'hero'), line('year', 'sub')] },
  { id: 'status-arc', group: 'Extras', name: 'Status over the top', note: 'The status curves over the wreath', lines: [line('status', 'arc', { slot: 'arc-top' }), line(NAME, 'hero'), line('year', 'sub')] },
  { id: 'seal', group: 'Extras', name: 'Seal', note: 'Status over the top, year curving under the base (NYF)', lines: [line('status', 'arc', { slot: 'arc-top' }), line(NAME, 'hero'), line('year', 'arc', { slot: 'arc-under' })] },
  { id: 'medallion', group: 'Extras', name: 'Medallion', note: 'A star medallion in the top gap', lines: [line('icon', 'eyebrow', { slot: 'badge', icon: 'star' }), line('status', 'eyebrow'), line(NAME, 'hero'), line('year', 'sub')] },
  { id: 'ribbon', group: 'Extras', name: 'Year on a ribbon', note: 'Award-badge style (stock badges, not festivals)', lines: [line('status', 'eyebrow'), line(NAME, 'hero'), line('year', 'arc', { slot: 'ribbon' })] },
  { id: 'status-above', group: 'Extras', name: 'Status above', note: 'The status sits over the wreath (CPH:DOX)', lines: [line('status', 'eyebrow', { slot: 'above' }), line(NAME, 'hero'), line('year', 'sub')] },
];

// returns new fields (and the layout id) for doc.fields; newId() makes ids for fields the layout adds.
// o.examples fills new lines with example text, for a thumbnail that shows what the layout looks like.
export function layoutFields(fields, L, newId, o = {}) {
  const pool = fields.map((f) => ({ ...f })), used = new Set(), out = [];
  for (const s of L.lines) {
    // a line can accept several kinds ('festival|award'): the user's current hero first, then the kinds in order
    const kinds = s.kind.split('|'), free = pool.filter((x) => kinds.includes(x.kind) && !used.has(x.id) && x.text), vis = (x) => x.show !== false;
    // an uploaded logo stands in for the name: a hero line takes it when no name is showing (a hidden name stays hidden)
    const logo = s.role === 'hero' && pool.find((x) => x.kind === 'logo' && x.src && !used.has(x.id) && vis(x));
    let f = (s.role === 'hero' && free.find((x) => x.role === 'hero' && vis(x))) || kinds.map((k) => free.find((x) => x.kind === k && vis(x))).find(Boolean) || logo || kinds.map((k) => free.find((x) => x.kind === k)).find(Boolean);
    if (!f) f = { id: newId(), kind: kinds[0], text: s.icon || (o.examples && EXAMPLE[kinds[0]]) || '', added: true };
    used.add(f.id);
    out.push({ ...f, text: s.icon && f.kind === 'icon' ? s.icon : f.text, role: s.role, slot: f.kind === 'logo' && !LOGO_SLOTS.includes(s.slot || 'inside') ? 'inside' : s.slot || 'inside', join: !!s.join && f.kind !== 'logo', show: true, dx: 0, dy: 0 });
  }
  for (const f of pool) if (!used.has(f.id)) out.push({ ...f, show: L.only || GOVERNED.includes(f.kind) ? false : f.show, join: false });
  // an award line without the status that qualified it would claim a win: bring the status along, at the top
  const awardLine = out.find((f) => f.kind === 'award' && f.show !== false && (f.text || f.added));
  const st = awardLine && !out.some((f) => f.kind === 'status' && f.show !== false && f.text) && out.find((f) => f.kind === 'status' && f.text && fields.some((g) => g.id === f.id && g.show !== false));
  if (st && !['win', 'honor'].includes(outcomeOf(st.text, awardLine.text))) {
    out.splice(out.indexOf(st), 1);
    let at = 0; while (at < out.length && out[at].kind === 'icon' && out[at].show !== false) at++;
    out.splice(at, 0, { ...st, role: 'eyebrow', slot: 'inside', join: false, show: true, dx: 0, dy: 0 });
  }
  return out;
}
export function applyLayout(doc, L, newId, o) { return { ...doc, fields: layoutFields(doc.fields, L, newId, o), layoutId: L.id }; }
