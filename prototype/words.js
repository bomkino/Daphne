// words.js — the Words tab: the first thing anyone does, made the easiest. What the film got (real statuses, in six
// languages), which festival (its official name, city and rules from festivals.js), the award, the year, and every line
// underneath for full control. It edits the same fields the layout engine reads, so nothing here is a separate mode.
import { searchFestivals, festivalFromText, festivalById, countryName, FOCUS } from './festivals.js';
import { checkLaurel } from './rules.js';
import { readEmail } from './email.js';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// what festivals actually grant (research/01 §2.3): no "Submitted", no "Official Submission"
export const STATUS_COMMON = ['Official Selection', 'Winner', 'Nominee', 'Finalist', 'Semi-Finalist', 'Special Mention', 'Honorable Mention', 'World Premiere'];
export const STATUS_MORE = ['International Premiere', 'North American Premiere', 'European Premiere', 'US Premiere', 'UK Premiere', 'Canadian Premiere', 'Asian Premiere', 'In Competition', 'Audience Award', 'Jury Award', 'Grand Jury Prize', 'Award Winner', 'Opening Night', 'Closing Night', 'Shortlist', 'Best of Fest'];
export const STATUS_LANG = {
  Français: ['Sélection officielle', 'En compétition', 'Mention spéciale', 'Prix du public', 'Prix du jury', 'Première mondiale'],
  Español: ['Selección oficial', 'En competición', 'Mención especial', 'Premio del público', 'Premio del jurado', 'Estreno mundial'],
  Italiano: ['Selezione ufficiale', 'In concorso', 'Menzione speciale', 'Premio del pubblico', 'Premio della giuria', 'Anteprima mondiale'],
  Deutsch: ['Offizielle Auswahl', 'Im Wettbewerb', 'Lobende Erwähnung', 'Publikumspreis', 'Preis der Jury', 'Weltpremiere'],
  Português: ['Seleção Oficial', 'Em Competição', 'Menção Honrosa', 'Estreia Mundial'],
};
export const AWARDS = ['Best Film', 'Best Feature Film', 'Best Short Film', 'Best Documentary', 'Best Documentary Feature', 'Best Documentary Short', 'Best Narrative Feature', 'Best Narrative Short', 'Best Animated Film', 'Best Animated Short', 'Best International Feature', 'Best First Feature', 'Best Debut', 'Best Director', 'Best Screenplay', 'Best Actress', 'Best Actor', 'Best Performance', 'Best Ensemble', 'Best Cinematography', 'Best Editing', 'Best Original Score', 'Best Sound Design', 'Best Production Design', 'Best Costume Design', 'Best Visual Effects', 'Best Experimental Film', 'Best Student Film', 'Best Music Video', 'Best Comedy', 'Best Horror', 'Best Sci-Fi', 'Grand Jury Prize', 'Grand Prix', 'Special Jury Prize', 'Jury Prize', 'Audience Award', 'Audience Choice Award', 'Best of Fest', 'Emerging Filmmaker Award', 'Spirit of the Festival'];
// a status that names a result someone won or was up for: an award line belongs with it
const WANTS_AWARD = /^(winner|award winner|nominee|finalist|grand jury prize)$/i;
const AWARD_LAYOUTS = ['winner', 'award-detail', 'award-festival-hero', 'star-winner'];
const roman = (n) => { let s = ''; for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
const fromRoman = (s) => { const m = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 }; let n = 0; const t = String(s).toUpperCase(); for (let i = 0; i < t.length; i++) { const a = m[t[i]], b = m[t[i + 1]] || 0; if (!a) return null; n += a < b ? -a : a; } return n; };
const yearOf = (t) => { const s = String(t || '').trim(); if (/^(19|20)\d\d$/.test(s)) return +s; if (/^['’]\d\d$/.test(s)) return 2000 + +s.slice(1); const r = fromRoman(s); return r && r > 1900 && r < 2200 ? r : null; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function wordsTab(ui) {
  const { h } = ui, doc = ui.doc;
  const vis = (f) => f.show !== false;
  const find = (kind) => doc.fields.find((f) => f.kind === kind && vis(f)) || doc.fields.find((f) => f.kind === kind);
  const text = (kind) => { const f = find(kind); return f && vis(f) ? f.text || '' : ''; };

  // set a kind's text, adding the line where a designer would put it when there isn't one
  function setKind(kind, value, o = {}) {
    const fs = ui.clone(ui.doc.fields); let f = fs.find((x) => x.kind === kind && vis(x)) || fs.find((x) => x.kind === kind);
    if (!f) {
      if (!value) return;
      f = { id: ui.newId(), kind, text: value, role: kind === 'status' || kind === 'edition' ? 'eyebrow' : kind === 'festival' && fs.some((x) => x.kind === 'award' && x.role === 'hero' && vis(x)) ? 'sub' : kind === 'festival' || kind === 'award' ? 'hero' : 'sub', slot: 'inside', show: true };
      const at = kind === 'status' ? 0 : kind === 'location' || kind === 'category' ? fs.findIndex((x) => x.kind === 'festival') + 1 || fs.length : fs.length;
      fs.splice(at, 0, f);
    } else { f.text = value; delete f.added; if (value && !vis(f) && !o.keepHidden) f.show = true; }
    Object.assign(f, o.extra || {});
    ui.change('fields', fs, o.rebuild);
  }
  const applyLayoutId = (id) => { const L = ui.layoutById(id); if (L) ui.replaceDoc({ ...ui.applyLayout(ui.doc, L, ui.newId), layoutBy: 'user', userLayoutId: id }); };

  function pickStatus(s) {
    setKind('status', s);
    const hasAward = ui.doc.fields.some((f) => f.kind === 'award' && vis(f) && f.text);
    if (WANTS_AWARD.test(s) && !hasAward) applyLayoutId('winner');
    else if (!WANTS_AWARD.test(s) && AWARD_LAYOUTS.includes(ui.doc.layoutId)) {
      const aw = ui.doc.fields.find((f) => f.kind === 'award' && vis(f));
      if (aw && aw.added) applyLayoutId(ui.doc.userLayoutId && !AWARD_LAYOUTS.includes(ui.doc.userLayoutId) ? ui.doc.userLayoutId : 'year-below');
      else ui.rebuild();
    } else ui.rebuild();
  }

  // ── 1. what did the film get ──
  const status = text('status');
  const chip = (s, extra = '') => h('button', { class: 'chip' + (status.toLowerCase() === s.toLowerCase() ? ' on' : '') + extra, onclick: () => pickStatus(s) }, s);
  const more = h('div', { class: 'group', style: ui.state.moreStatus ? '' : 'display:none' },
    h('div', { class: 'chips' }, STATUS_MORE.map((s) => chip(s))),
    ...Object.entries(STATUS_LANG).map(([lang, list]) => h('div', { class: 'group' }, h('div', { class: 'label' }, lang, h('span', { class: 'grow' })), h('div', { class: 'chips' }, list.map((s) => chip(s))))));
  const statusInput = h('input', { type: 'text', value: status, placeholder: 'Or type the exact wording the festival used', list: 'w-statuses', 'aria-label': 'Status', oninput: (e) => setKind('status', e.target.value), onchange: () => ui.rebuild() });
  const q1 = h('section', { class: 'q' },
    h('h3', {}, h('span', { class: 'num' }, '1'), 'What did your film ', h('em', {}, 'get'), '?'),
    h('div', { class: 'chips' }, STATUS_COMMON.map((s) => chip(s)), h('button', { class: 'chip quiet', 'aria-expanded': String(!!ui.state.moreStatus), onclick: (e) => { ui.state.moreStatus = !ui.state.moreStatus; more.style.display = ui.state.moreStatus ? '' : 'none'; e.currentTarget.textContent = ui.state.moreStatus ? 'Fewer' : 'More, and other languages'; } }, ui.state.moreStatus ? 'Fewer' : 'More, and other languages')),
    more, statusInput,
    h('datalist', { id: 'w-statuses' }, [...STATUS_COMMON, ...STATUS_MORE, ...Object.values(STATUS_LANG).flat()].map((s) => h('option', { value: s }))));

  // ── 2. which festival ──
  const festF = find('festival');
  const fest = festF && vis(festF) ? festF.text || '' : '';
  const known = (festF && festF.fid && festivalById(festF.fid)) || festivalFromText(fest);
  const combo = h('div', { class: 'combo' });
  const list = h('div', { class: 'list', role: 'listbox', id: 'fest-list' });
  let results = [], act = -1;
  const input = h('input', { type: 'search', class: 'bigin', value: fest, placeholder: 'Start typing: Sundance, Berlinale, Hot Docs…', autocomplete: 'off', spellcheck: 'false', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'fest-list', 'aria-label': 'Festival name',
    oninput: (e) => { setKind('festival', e.target.value, { extra: { fid: null } }); suggest(e.target.value); },
    onkeydown: (e) => {
      if (!combo.classList.contains('open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(results.length - 1, act + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); paint(); }
      else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); choose(results[act]); }
      else if (e.key === 'Escape') close();
    },
    onchange: () => setTimeout(() => { if (!document.activeElement || !combo.contains(document.activeElement)) ui.rebuild(); }, 200),
    onblur: () => setTimeout(close, 160), onfocus: (e) => suggest(e.target.value) });
  const mark = (s, q) => { const i = s.toLowerCase().indexOf(q.toLowerCase()); return i < 0 || !q ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length)); };
  function paint() {
    list.innerHTML = '';
    results.forEach((f, i) => {
      const o = h('div', { class: 'opt' + (i === act ? ' act' : ''), role: 'option', 'aria-selected': String(i === act), onmousedown: (e) => { e.preventDefault(); choose(f); } });
      o.innerHTML = `<b>${mark(f.name, input.value)}</b><span>${esc([f.city, countryName(f.country)].join(' · '))}${f.month ? ' · ' + MONTHS[f.month] : ''}${f.short && f.short !== f.name ? ' · ' + esc(f.short) : ''}</span>`;
      list.append(o);
    });
  }
  function suggest(q) { results = searchFestivals(q, 7); act = results.length ? 0 : -1; paint(); const open = !!results.length && !(results.length === 1 && results[0].name === q); combo.classList.toggle('open', open); input.setAttribute('aria-expanded', String(open)); }
  function close() { combo.classList.remove('open'); input.setAttribute('aria-expanded', 'false'); }
  function choose(f) {
    close();
    const fs = ui.clone(ui.doc.fields);
    let ff = fs.find((x) => x.kind === 'festival' && vis(x)) || fs.find((x) => x.kind === 'festival');
    if (!ff) { ff = { id: ui.newId(), kind: 'festival', role: fs.some((x) => x.kind === 'award' && x.role === 'hero' && vis(x)) ? 'sub' : 'hero', slot: 'inside', show: true }; fs.splice(fs.findIndex((x) => x.kind === 'status') + 1, 0, ff); }
    Object.assign(ff, { text: f.name, fid: f.id, show: true }); delete ff.added;
    const loc = fs.find((x) => x.kind === 'location');
    if (loc) { loc.text = f.city.split(',')[0]; delete loc.added; }
    ui.change('fields', fs, true);
    ui.toast(`${f.name}: name${loc ? ' and city' : ''} filled in`);
  }
  combo.append(input, list);

  let card = null;
  if (known) {
    const f = known, usingShort = f.short && fest.trim().toLowerCase() === f.short.toLowerCase();
    const loc = find('location'), locOn = loc && vis(loc) && loc.text;
    const notes = checkLaurel(ui.doc).filter((n) => n.level === 'rule' || /current name|renamed|since/.test(n.text));
    const acts = [];
    if (f.short && f.short !== f.name) acts.push(h('button', { class: 'btn small', title: usingShort ? 'Use the full official name' : `Use the short form the festival itself uses${f.id === 'sundance' ? ' (Sundance asks for the full name)' : ''}`, onclick: () => setKind('festival', usingShort ? f.name : f.short, { rebuild: true, extra: { fid: f.id } }) }, usingShort ? 'Full name' : `Short: ${f.short}`));
    acts.push(h('button', { class: 'btn small' + (locOn ? ' on' : ''), onclick: () => { if (locOn) { const fs = ui.clone(ui.doc.fields); fs.find((x) => x.id === loc.id).show = false; ui.change('fields', fs, true); } else setKind('location', f.city.split(',')[0], { rebuild: true }); } }, locOn ? '✓ City line' : `+ ${f.city.split(',')[0]}`));
    if (f.local) acts.push(h('button', { class: 'btn small', title: f.local, onclick: () => { const fs = ui.clone(ui.doc.fields); const at = fs.findIndex((x) => x.kind === 'festival') + 1; fs.splice(at, 0, { id: ui.newId(), kind: 'custom', text: f.local.split(' · ')[0], role: 'sub', slot: 'inside', show: true }); ui.change('fields', fs, true); } }, '+ Own-language name'));
    const secs = f.sections ? h('div', { class: 'group' }, h('div', { class: 'label' }, 'Sections', h('span', { class: 'opt' }, 'add one as a line'), h('span', { class: 'grow' })), h('div', { class: 'chips' }, f.sections.map((s) => h('button', { class: 'chip', onclick: () => setKind('category', s.replace(/ \(Competition\)$/, ''), { rebuild: true }) }, s)))) : null;
    card = h('div', { class: 'fcard' },
      h('div', { class: 't' }, h('div', {}, h('b', {}, f.name), h('div', { class: 'meta' }, [f.city, countryName(f.country)].join(' · '), f.month ? ` · usually ${MONTHS[f.month]}` : '', f.founded ? ` · since ${f.founded}` : '')),
        f.site ? h('a', { class: 'site', href: f.site, target: '_blank', rel: 'noopener', title: 'The festival’s official site' }, 'Official site ↗') : null),
      h('div', { class: 'tags' }, f.focus.map((k) => h('span', { class: 'tag' }, FOCUS[k] || k)), f.tier === 1 ? h('span', { class: 'tag major' }, 'Major') : null),
      f.local ? h('div', { class: 'meta' }, 'In its own language: ', h('i', {}, f.local)) : null,
      f.note ? h('div', { class: 'rules' }, h('div', { class: 'rule tip' }, f.note)) : null,
      notes.length ? h('div', { class: 'rules' }, notes.map((n) => h('div', { class: 'rule' + (n.level === 'rule' ? '' : ' tip') }, n.text, n.source ? [' ', h('a', { href: n.source.url, target: '_blank', rel: 'noopener', class: 'site' }, 'Source')] : null))) : null,
      h('div', { class: 'acts' }, acts),
      secs,
      h('div', { class: 'official' }, h('div', { class: 'hint' }, 'Festivals send official laurels to selected films, and where a festival asks you to use its own, use theirs. Daphne draws text-only laurels and no festival marks.'),
        h('button', { class: 'btn small', title: 'Take a white or black background out of the festival’s file, trim it, and add it to your laurel or your row', onclick: () => ui.openFixer((a) => ui.addLogo(a), { row: true, festival: f.name }) }, 'Got their file? Clean it up…')));
  } else if (fest.trim().length > 2) {
    card = h('div', { class: 'hint' }, 'Not in Daphne’s festival list, and that’s fine: most festivals aren’t. Check the spelling against the festival’s own site and the wording it sent you.');
  }
  const q2 = h('section', { class: 'q' }, h('h3', {}, h('span', { class: 'num' }, '2'), 'Which ', h('em', {}, 'festival'), '?'), combo, card);

  // ── 3. the award ──
  const awF = find('award'), award = awF && vis(awF) ? awF.text || '' : '';
  const showAward = !!awF && vis(awF) || WANTS_AWARD.test(status) || /award|prize|mention/i.test(status);
  const q3 = showAward ? h('section', { class: 'q' },
    h('h3', {}, h('span', { class: 'num' }, '3'), 'What was the ', h('em', {}, 'award'), '?'),
    awF && vis(awF)
      ? h('input', { type: 'text', class: 'bigin' + (awF.added ? ' example' : ''), value: award, placeholder: 'Best Documentary', list: 'w-awards', 'aria-label': 'Award', oninput: (e) => setKind('award', e.target.value), onfocus: (e) => { if (awF.added) e.target.select(); } })
      : h('button', { class: 'btn', onclick: () => applyLayoutId('winner') }, '+ Add the award line'),
    awF && awF.added ? h('div', { class: 'hint' }, 'Example text: type the award exactly as the festival named it.') : null,
    h('datalist', { id: 'w-awards' }, AWARDS.map((s) => h('option', { value: s })))) : null;

  // ── 4. the year ──
  const yF = find('year'), yText = yF && vis(yF) ? yF.text || '' : '', yNum = yearOf(yText) || new Date().getFullYear();
  const yFmt = (t) => setKind('year', t, { rebuild: true });
  const q4 = h('section', { class: 'q' },
    h('h3', {}, h('span', { class: 'num' }, showAward ? '4' : '3'), 'Which ', h('em', {}, 'year'), '?'),
    h('div', { class: 'yearrow' },
      h('input', { type: 'text', value: yText, placeholder: String(new Date().getFullYear()), inputmode: 'numeric', 'aria-label': 'Year', oninput: (e) => setKind('year', e.target.value) }),
      h('div', { class: 'chips' },
        h('button', { class: 'chip' + (yText === String(yNum) ? ' on' : ''), title: 'Four digits', onclick: () => yFmt(String(yNum)) }, String(yNum)),
        h('button', { class: 'chip' + (yText === roman(yNum) ? ' on' : ''), title: 'Roman numerals', onclick: () => yFmt(roman(yNum)) }, roman(yNum)),
        h('button', { class: 'chip' + (/^['’]\d\d$/.test(yText) ? ' on' : ''), title: 'Short', onclick: () => yFmt('’' + String(yNum).slice(2)) }, '’' + String(yNum).slice(2)),
        yF && vis(yF) ? h('button', { class: 'chip quiet', title: 'No year on this laurel (10% of festival laurels have none)', onclick: () => { const fs = ui.clone(ui.doc.fields); fs.find((x) => x.id === yF.id).show = false; ui.change('fields', fs, true); } }, 'None') : null)));

  // ── every line ──
  const addKinds = [['status', 'Status'], ['festival', 'Festival'], ['award', 'Award'], ['category', 'Section'], ['location', 'Place'], ['year', 'Year'], ['edition', 'Edition'], ['custom', 'Your own line'], ['icon', 'Ornament'], ['logo', 'Official logo']];
  const every = h('details', { class: 'fold', open: !!ui.state.everyOpen, ontoggle: (e) => (ui.state.everyOpen = e.currentTarget.open) },
    h('summary', {}, h('span', {}, 'Every line', h('small', {}, `${ui.doc.fields.filter(vis).length} showing · size, place, order`))),
    h('div', { class: 'body' },
      h('div', { class: 'lines', id: 'fields' }, ui.doc.fields.map(ui.fieldRow)),
      h('div', { class: 'label' }, 'Add a line', h('span', { class: 'grow' })),
      h('div', { class: 'chips' }, addKinds.map(([k, l]) => h('button', { class: 'chip', onclick: () => ui.addField(k) }, '+ ' + l))),
      h('div', { class: 'hint' }, 'Drag a line on the laurel to nudge it; double-click to put it back. Lines a layout leaves out are hidden, not deleted.')));

  // ── 0. or paste the festival's email and let Daphne read it ──
  const st = ui.state;
  const KLABEL = { status: 'Status', festival: 'Festival', award: 'Award', year: 'Year', edition: 'Edition', category: 'Section', film: 'Film title' };
  const OPTIONAL = ['edition', 'category'];
  const found = h('div', { class: 'found' });
  function showFound() {
    found.innerHTML = '';
    const r = readEmail(st.emailText || '');
    if (!st.emailText || !st.emailText.trim()) return;
    if (!r) { found.append(h('div', { class: 'hint' }, 'Nothing to go on yet: paste the whole email, including the festival’s name.')); return; }
    if (r.declined) { found.append(h('div', { class: 'hint' }, 'This reads like a decline, so there’s no laurel to make from it. It happens to every film; the next email is the one.')); return; }
    st.emailPick = st.emailPick || {};
    const keys = Object.keys(KLABEL).filter((k) => r[k]);
    found.append(h('div', { class: 'foundlist' }, keys.map((k) => {
      const on = st.emailPick[k] ?? !OPTIONAL.includes(k);
      return h('label', { class: 'frow' }, h('input', { type: 'checkbox', checked: on, onchange: (e) => { st.emailPick[k] = e.target.checked; } }), h('span', { class: 'k' }, KLABEL[k]), h('span', { class: 'v' }, r[k]));
    })),
      h('div', { class: 'acts' }, h('button', { class: 'btn small primary', onclick: () => applyEmail(r) }, 'Use these'), h('button', { class: 'btn small ghost', onclick: () => { st.emailText = ''; st.emailOpen = false; st.emailPick = null; ui.rebuild(); } }, 'Clear')),
      h('div', { class: 'hint' }, 'Read in your browser; nothing is sent anywhere. Check each line against the email.'));
  }
  function applyEmail(r) {
    const chosen = { ...(st.emailPick || {}) }, pick = (k) => !!r[k] && (chosen[k] ?? !OPTIONAL.includes(k));
    if (pick('award') && !ui.doc.fields.some((f) => f.kind === 'award' && vis(f))) applyLayoutId('winner');
    if (pick('festival')) setKind('festival', r.festival, { extra: r.fid ? { fid: r.fid } : {} });
    if (pick('year')) setKind('year', r.year);
    if (pick('award')) setKind('award', r.award);
    if (pick('category')) setKind('category', r.category);
    if (pick('edition')) { const fs = ui.clone(ui.doc.fields), at = Math.max(0, fs.findIndex((x) => x.kind === 'status' && vis(x)) + 1); if (!fs.some((x) => x.kind === 'edition' && vis(x))) { fs.splice(at, 0, { id: ui.newId(), kind: 'edition', text: r.edition, role: 'eyebrow', slot: 'inside', show: true }); ui.change('fields', fs); } else setKind('edition', r.edition); }
    if (pick('film')) { try { const p = JSON.parse(localStorage.getItem('daphne.studio') || '{}'); p.social = { ...(p.social || {}), title: r.film }; localStorage.setItem('daphne.studio', JSON.stringify(p)); } catch (e) { /* a convenience */ } }
    st.emailOpen = false; st.emailText = ''; st.emailPick = null;
    if (pick('status')) pickStatus(r.status); else ui.rebuild();
    ui.toast(pick('film') ? 'Filled in from the email. The film’s title is ready for your social card.' : 'Filled in from the email: check each line');
  }
  const emailArea = h('textarea', { rows: 5, class: 'emailin', placeholder: 'Paste the email the festival sent you. Daphne picks out the status, the festival, the year, the award and the section.', 'aria-label': 'The festival’s email', oninput: (e) => { st.emailText = e.target.value; st.emailPick = null; showFound(); } }, st.emailText || '');
  const q0 = h('section', { class: 'q emailq' + (st.emailOpen ? ' open' : '') },
    st.emailOpen ? [h('div', { class: 'qh' }, h('h3', {}, 'From the ', h('em', {}, 'email')), h('button', { class: 'btn ghost small', 'aria-label': 'Close', onclick: () => { st.emailOpen = false; ui.rebuild(); } }, '✕')), emailArea, found]
      : h('button', { class: 'emailbtn', onclick: () => { st.emailOpen = true; ui.rebuild(); setTimeout(() => document.querySelector('.emailin')?.focus(), 30); } }, h('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/></svg>' }), h('span', {}, h('b', {}, 'Got the festival’s email?'), h('small', {}, 'Paste it and Daphne fills this in'))));
  if (st.emailOpen) showFound();

  return h('div', { class: 'pane' }, q0, q1, q2, q3, q4,
    h('div', { class: 'hint' }, 'Use the festival’s current official name and the exact wording it gave you. Laurels mark a result: a selection, a premiere, an award.'),
    every);
}
