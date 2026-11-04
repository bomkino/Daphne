// email.js — read the festival's email and pull out what the laurel needs: the status, the festival's name, the year,
// the award, the edition, the section and the film's title. Heuristics only, all in the browser; the Words tab shows
// what it found and the filmmaker confirms it. Pure functions: they run in Node for the tests at the bottom of qa pages.
import { festivalFromText } from './festivals.js';

const CONNECT = new Set(['of', 'the', 'de', 'du', 'di', 'del', 'des', 'la', 'le', 'for', 'and', '&', 'in', 'da', 'do', 'dos', 'das', 'och', 'und', 'en']);
const LEAD_DROP = /^(the|our|annual|this|year's|years|international)$/i;
const isCap = (w) => /^[A-Z0-9À-Ý][\w'’.&:-]*$/u.test(w);
const title = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

// the status, most specific first. A win named for this film beats "finalist" ("won Best Short, chosen from five
// finalists"), and a mention beats "received the". Matched only in what the email says about this film (see below).
const STATUS = [
  [/\bsemi[- ]?finalist/i, 'Semi-Finalist'], [/\bquarter[- ]?finalist/i, 'Quarter-Finalist'],
  [/\bhonou?rable mention/i, 'Honorable Mention'], [/\bspecial (jury )?mention/i, 'Special Mention'],
  [/\b(won|wins|winner|winning|recipient of|has been awarded|have been awarded|is awarded|was awarded|received the)\b/i, 'Winner'],
  [/\bfinalist/i, 'Finalist'],
  [/\b(world|international|european|north american|u\.?s\.?|uk|canadian|asian|african|latin american|australian|national) premiere\b/i, (m) => title(m[1].toLowerCase().replace(/^u\.?s\.?$/, 'US').replace(/^uk$/, 'UK')) + ' Premiere'],
  [/\b(nominated|nominee|nomination)\b/i, 'Nominee'],
  [/\b(shortlist(ed)?)\b/i, 'Shortlist'],
  [/\b(official selection|selected|accepted|chosen|programmed|will screen|in competition)\b/i, 'Official Selection'],
];
// Words about other films, or results still to come, say nothing about this film's result: "Winning films will be
// announced on closing night", "Congratulations to the selected filmmakers", "eligible for the Audience Award".
const OTHERS = [
  /\bwinning (films?|projects?|entries|entry|titles?|works?|shorts?|features?|filmmakers?|directors?)\b/gi,
  /\bwinners\b/gi, /\b(the |a )?winner (will|is to|shall|would)\b/gi, /\b(last|previous|past) (year|edition)['’]?s? \w+/gi,
  /\b(selected|nominated|shortlisted|awarded|competing|participating|chosen|accepted|programmed|other) (films|filmmakers|titles|projects|works|entries|artists|shorts|features|directors)\b/gi,
  /\b(eligible|in the running|compete|competing|a chance|qualif\w*) (for|to)\b[^.;!?]*/gi,
  /\b(will|shall|to) be (announced|revealed|decided|presented|awarded|named)\b[^.;!?]*/gi,
];
const quiet = (s) => OTHERS.reduce((t, re) => t.replace(re, ' '), s);
// a sentence about this film: "your film", "you", "congratulations", or the film's own title
const MINE = /\b(your|you|congratulations|we are (pleased|delighted|happy|thrilled|excited|honou?red))\b/i;
// a decline, said plainly. "Unfortunately, travel isn't covered" is not one.
const DECLINE = /\b(regret to (inform|tell|let|say)|we['’]?re sorry to|we are sorry to|(has|have|was|were) not (been )?(selected|accepted|chosen)|not (able|been able) to (include|select|program|programme|offer|accept|screen)|unable to (include|select|program|programme|offer|accept|screen)|did not make (it|the)|didn['’]t make (it|the)|won['’]t be able to (include|select|program|programme|offer|screen)|was not among|were not among)\b/i;
// a positive result named for this film, which a decline elsewhere in the email can't cancel on its own
const MINE_POSITIVE = /\byour (film|short|project|documentary|feature|movie|work|series|pilot)\b[^.;!?]*\b(has been|have been|was|is|were)\s+(selected|accepted|chosen|nominated|awarded|named|shortlisted|programmed)\b|\b(your (film|short|project|documentary|feature|movie|work)|you)\b[^.;!?]*\b(won|wins|is the winner)\b/i;
const sentencesOf = (t) => t.split(/(?<=[.!?;])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
// the status this email gives this film: { status, sure } or { declined }
export function statusOf(text, film = '') {
  const ss = sentencesOf(text), mine = (x) => MINE.test(x) || (film && x.toLowerCase().includes(film.toLowerCase()));
  const pos = ss.some((x) => MINE_POSITIVE.test(quiet(x)));
  const dec = ss.some((x) => DECLINE.test(x));
  if (dec && !pos) return { declined: true };
  const hits = [];
  ss.forEach((x, i) => { const q = quiet(x); STATUS.forEach(([re, val], rank) => { const m = re.exec(q); if (m) hits.push({ status: typeof val === 'function' ? val(m) : val, rank, mine: mine(x), i }); }); });
  if (!hits.length) return dec ? { declined: true } : null;
  // what the email says about this film first; then the most specific
  const pool = hits.some((h) => h.mine) ? hits.filter((h) => h.mine) : hits;
  const best = pool.sort((a, b) => a.rank - b.rank || a.i - b.i)[0];
  // unsure: a decline as well as a result, or a win that isn't said of this film
  const sure = !dec && (best.status !== 'Winner' || best.mine);
  return { status: best.status, sure, sentence: ss[best.i] };
}
const AWARD = /\b((?:Grand |Special )?Jury (?:Prize|Award)|Audience (?:Choice )?Award|Grand Prix|Grand Prize|Best of Fest(?:ival)?|Golden [A-Z][a-z]+|(?:Special|Emerging|Spirit of the) [A-Z][a-z]+(?: [A-Z][a-z]+)* Award|Best(?: (?:[A-Z][\w'’/-]*|of|in|a|an|the|and|for|by))+)/g;

function festivalPhrases(text) {
  const words = text.replace(/[\r\n]+/g, ' \n ').split(/\s+/), out = [];
  words.forEach((w, i) => {
    const film = /^(Film|Movie|Screen|Short|Shorts|Cinema)$/.test((words[i - 1] || '').replace(/[“"(]/g, ''));
    if (!/^(Festival|Fest|Festivals|Filmfest|Filmfestival|Biennale|Berlinale|Mostra)[,.;:!?)’'"]*$/.test(w) && !(film && /^Awards[,.;:!?)’'"]*$/.test(w))) return;
    let a = i;
    while (a > 0 && a > i - 9) { const p = words[a - 1].replace(/[“"(]/g, ''); if (/[.!?;:,)]$/.test(p) && a < i) break; if (isCap(p) || (CONNECT.has(p.toLowerCase()) && a - 1 > 0 && isCap(words[a - 2]))) a--; else break; }
    let b = i; // "Festival de Cannes", "Festival of New Cinema"
    if (/^(Festival|Fest)$/.test(w) && words[i + 1] && CONNECT.has(words[i + 1].toLowerCase()) && words[i + 2] && isCap(words[i + 2])) { b = i + 2; while (words[b + 1] && isCap(words[b + 1].replace(/[,.;:!?)]+$/, '')) && b < i + 6) b++; }
    let ph = words.slice(a, b + 1).join(' ').replace(/[,.;:!?)’'"]+$/, '').replace(/^[“"(]+/, '');
    let parts = ph.split(' ');
    while (parts.length > 1 && (LEAD_DROP.test(parts[0]) || /^\d+(st|nd|rd|th)?$/i.test(parts[0]) || /^(19|20)\d\d$/.test(parts[0]) || CONNECT.has(parts[0].toLowerCase()))) parts.shift();
    while (parts.length > 1 && /^(19|20)\d\d$/.test(parts[parts.length - 1])) parts.pop();
    ph = parts.join(' ');
    if (parts.length >= 2 || /^(Berlinale|Biennale)$/.test(ph)) out.push({ text: ph, at: text.indexOf(ph) });
  });
  return out;
}

export function readEmail(raw) {
  const text = String(raw || '').replace(/ /g, ' ').trim();
  if (text.length < 12) return null;
  const found = {};
  // the film's title, for the social card and for telling this film's news from other films': "your film “The Quiet Hours”"
  const ft = /\b(?:your|the) (?:film|short|short film|feature|documentary|project|movie|series|pilot|animation)[,:]?\s+["“'‘]([^"”'’\n]{2,80})["”'’]/i.exec(text);
  if (ft) found.film = ft[1].trim();
  // status: what the email says about this film, never about other films or results still to come
  const st = statusOf(text, found.film);
  if (st && st.declined) return { declined: true };
  if (st) { found.status = st.status; if (!st.sure) found.unsure = true; }

  // festival: a "… Film Festival" phrase from the email, matched to the list when it's there
  const phrases = festivalPhrases(text);
  const counted = new Map(); for (const p of phrases) counted.set(p.text, (counted.get(p.text) || 0) + 1);
  const best = [...counted].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0];
  const known = best ? festivalFromText(best[0]) : festivalFromText(text);
  if (known) { found.festival = known.name; found.fid = known.id; found.city = known.city; }
  else if (best) found.festival = best[0];

  // year: the one nearest the festival's name, else the most common recent one
  const years = [...text.matchAll(/\b(20[2-4]\d)\b/g)].map((m) => ({ y: m[1], at: m.index }));
  if (years.length) {
    const at = found.festival ? text.indexOf(best ? best[0] : found.festival) : -1;
    found.year = (at >= 0 ? years.slice().sort((a, b) => Math.abs(a.at - at) - Math.abs(b.at - at))[0] : years[0]).y;
  }
  // edition: "the 12th Northlight Film Festival", "our 75th edition"
  const ed = /\b(\d{1,3})(st|nd|rd|th)\s+(?:annual|edition|(?=(?:[A-Z][\w'’-]*\s+){1,6}(?:Film\s+)?Festival))/i.exec(text);
  if (ed) found.edition = `${ed[1]}${ed[2].toLowerCase()} Edition`;

  // award: only when the status is about an award; otherwise "eligible for Best Short" would turn into a win.
  // Taken from the sentence that gave the status when it names one.
  if (/winner|nominee|finalist|mention|shortlist/i.test(found.status || '')) {
    const awards = (t) => [...quiet(t).matchAll(AWARD)].map((m) => m[1].replace(/\s+(of|in|a|an|the|and|for|by)$/i, '').trim()).filter((s) => s.split(' ').length <= 7 && !/^Best (wishes|regards)/i.test(s));
    const aw = [...(st && st.sentence ? awards(st.sentence) : []), ...awards(text)];
    if (aw.length) found.award = aw[0];
  }
  // section: "in the Short Documentary Competition", "selected for Midnight Madness" is too loose, so only named strands
  const sec = /\b(?:in|for|of|to) (?:the|our) ([A-Z][\w'’-]*(?:\s+(?:[A-Z&][\w'’-]*|of|and)){0,5}\s+(?:Competition|Section|Program|Programme|Showcase|Sidebar|Strand|Block|Shorts))\b/.exec(text);
  if (sec && !/^(Official|Festival)$/.test(sec[1].split(' ')[0])) found.category = sec[1];
  return Object.keys(found).length ? found : null;
}
