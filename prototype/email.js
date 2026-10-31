// email.js — read the festival's email and pull out what the laurel needs: the status, the festival's name, the year,
// the award, the edition, the section and the film's title. Heuristics only, all in the browser; the Words tab shows
// what it found and the filmmaker confirms it. Pure functions: they run in Node for the tests at the bottom of qa pages.
import { festivalFromText } from './festivals.js';

const CONNECT = new Set(['of', 'the', 'de', 'du', 'di', 'del', 'des', 'la', 'le', 'for', 'and', '&', 'in', 'da', 'do', 'dos', 'das', 'och', 'und', 'en']);
const LEAD_DROP = /^(the|our|annual|this|year's|years|international)$/i;
const isCap = (w) => /^[A-Z0-9À-Ý][\w'’.&:-]*$/u.test(w);
const title = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

// the status, most specific first; a decline is recognized so nobody makes a laurel from one
const STATUS = [
  [/\bsemi[- ]?finalist/i, 'Semi-Finalist'], [/\bquarter[- ]?finalist/i, 'Quarter-Finalist'], [/\bfinalist/i, 'Finalist'],
  [/\bhonou?rable mention/i, 'Honorable Mention'], [/\bspecial (jury )?mention/i, 'Special Mention'],
  [/\b(world|international|european|north american|u\.?s\.?|uk|canadian|asian|african|latin american|australian|national) premiere\b/i, (m) => title(m[1].toLowerCase().replace(/^u\.?s\.?$/, 'US').replace(/^uk$/, 'UK')) + ' Premiere'],
  [/\b(nominated|nominee|nomination)\b/i, 'Nominee'],
  [/\b(won|winner|winning|recipient of|has been awarded|have been awarded|is awarded|received the)\b/i, 'Winner'],
  [/\b(shortlist(ed)?)\b/i, 'Shortlist'],
  [/\b(official selection|selected|accepted|chosen|programmed|will screen|in competition)\b/i, 'Official Selection'],
];
const DECLINE = /\b(regret to|unfortunately|not (been )?(selected|able to)|unable to (include|select|program|offer)|did not make|won['’]t be able to)\b/i;
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
  if (DECLINE.test(text) && !/\b(congratulations|pleased|delighted|happy to)\b/i.test(text)) return { declined: true };

  // status: the first rule that matches anywhere, but a win named in the email beats a selection
  for (const [re, val] of STATUS) { const m = re.exec(text); if (m) { found.status = typeof val === 'function' ? val(m) : val; break; } }

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

  // award: only when the status is about an award; otherwise "eligible for Best Short" would turn into a win
  if (/winner|nominee|finalist|mention|shortlist/i.test(found.status || '')) {
    const aw = [...text.matchAll(AWARD)].map((m) => m[1].replace(/\s+(of|in|a|an|the|and|for|by)$/i, '').trim()).filter((s) => s.split(' ').length <= 7 && !/^Best (wishes|regards)/i.test(s));
    if (aw.length) found.award = aw[0];
  }
  // section: "in the Short Documentary Competition", "selected for Midnight Madness" is too loose, so only named strands
  const sec = /\b(?:in|for|of|to) (?:the|our) ([A-Z][\w'’-]*(?:\s+(?:[A-Z&][\w'’-]*|of|and)){0,5}\s+(?:Competition|Section|Program|Programme|Showcase|Sidebar|Strand|Block|Shorts))\b/.exec(text);
  if (sec && !/^(Official|Festival)$/.test(sec[1].split(' ')[0])) found.category = sec[1];
  // the film's title, for the social card: "your film “The Quiet Hours”"
  const ft = /\b(?:your|the) (?:film|short|short film|feature|documentary|project|movie|series|pilot|animation)[,:]?\s+["“'‘]([^"”'’\n]{2,80})["”'’]/i.exec(text);
  if (ft) found.film = ft[1].trim();
  return Object.keys(found).length ? found : null;
}
