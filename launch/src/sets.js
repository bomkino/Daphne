// The five launch carousels: what each slide says and shows, and its alt text. Every laurel is drawn by Daphne's own
// engine (tools/laurels.mjs) and every panel of the app is a capture of the real thing (tools/capture.mjs).
// Words a viewer reads are public: US spelling, one voice ("we", pitch.dog), placeholders for every festival.
import { paintMyth } from './myth.js';

const L = await (await fetch('./laurels.json')).json();
const LOOK = Object.fromEntries(L.looks.map((l) => [l.name, l]));
const PACK = (label, way) => L.pack.find((p) => p.label === label && p.way === way);
const aspect = (vb) => vb[3] / vb[2];
const LOGO = '../../brand/logo/daphne-logo-hero-on-dark.svg', LOGO_AR = 1195.25 / 4208.46;

// a block at x, y, w on its slide; the render checks it against the safe box and the other blocks
const blk = (x, y, w, html, cls = '', more = '') => `<div class="blk ${cls}" style="left:${x}px;top:${y}px;width:${w}px" ${more}>${html}</div>`;
const laurel = (key, x, y, w, more = '') => { const l = L.named[key]; return blk(x, y, w, `<img class="laurel" src="${l.file}" alt="" style="height:${Math.round(w * aspect(l.viewBox))}px">`, 'laurel', `data-name="laurel ${key}" ${more}`); };
const capture = (name, x, y, w, ar) => blk(x, y, w, `<img class="cap" src="captures/${name}.png" alt="" style="width:${w}px;height:${Math.round(w * ar)}px">`, '', `data-name="capture ${name}"`);
const logo = (x, y, w) => blk(x, y, w, `<img src="${LOGO}" alt="" style="display:block;width:${w}px;height:${Math.round(w * LOGO_AR)}px">`, '', 'data-name="logo"');
const center = 'data-c';
const tagline = `Make festival laurels for your film. <span class="bloom">It’s free.</span>`;
// each capture's shape, from tools/capture.mjs (css px; the files are 4×)
const CAP = Object.fromEntries(Object.entries(await (await fetch('./captures/captures.json')).json()).map(([k, [w, h]]) => [k, h / w]));

// A film poster nobody made: a night sky, a moon, a figure on a hill, the title "Your Film". Laurels go on top
// (a key in laurels.json, or any image as { file, viewBox }).
let posterN = 0;
function poster(x, y, w, laurels = [], more = '') {
  const h = Math.round(w * 1.5), n = ++posterN, t = L.named.posterTitle;
  const art = `<svg viewBox="0 0 400 600" width="${w}" height="${h}" style="position:absolute;inset:0;display:block" aria-hidden="true">
    <defs><linearGradient id="sky${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1524"/><stop offset=".55" stop-color="#1D3550"/><stop offset=".8" stop-color="#6F8A9C"/><stop offset=".9" stop-color="#B5C3CA"/></linearGradient>
    <radialGradient id="moon${n}"><stop offset="0" stop-color="#F1F3F0" stop-opacity=".55"/><stop offset="1" stop-color="#F1F3F0" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade${n}" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#05090D" stop-opacity="0"/><stop offset="1" stop-color="#05090D" stop-opacity=".9"/></linearGradient></defs>
    <rect width="400" height="600" fill="url(#sky${n})"/>
    <circle cx="282" cy="330" r="90" fill="url(#moon${n})"/><circle cx="282" cy="330" r="27" fill="#EEF1EE"/>
    <path d="M0 470 C70 440 120 452 180 430 C240 410 300 438 400 420 L400 600 L0 600Z" fill="#1A2836"/>
    <path d="M0 520 C60 488 130 470 190 476 C250 482 330 506 400 498 L400 600 L0 600Z" fill="#0A121A"/>
    <path d="M186 476 l3 -26 l4 0 l3 26 z M189.5 446 a4 4 0 1 0 0.1 0z" fill="#0A121A"/>
    <rect width="400" height="600" fill="url(#fade${n})"/>
    <g fill="#E8ECEE" opacity=".34"><rect x="70" y="560" width="260" height="3"/><rect x="100" y="568" width="200" height="3"/><rect x="130" y="576" width="140" height="3"/></g>
  </svg>`;
  const tw = w * 0.62, title = `<img src="${t.file}" alt="" style="position:absolute;left:${(w - tw) / 2}px;top:${h * 0.80}px;width:${tw}px;height:${tw * aspect(t.viewBox)}px">`;
  const ls = laurels.map(([key, lx, ly, lw, op = 1]) => { const l = L.named[key] || key; return `<img src="${l.file}" alt="" style="position:absolute;left:${lx * w}px;top:${ly * w}px;width:${lw * w}px;height:${lw * w * aspect(l.viewBox)}px;opacity:${op}">`; }).join('');
  return blk(x, y, w, `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${w * 0.02}px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5)">${art}${title}${ls}</div>`, '', `data-name="poster" ${more}`);
}
// eight laurels fighting for a poster, and three that agree
const CLUTTER = [['clutter0', 0.04, 0.03, 0.24], ['clutter1', 0.29, 0.02, 0.21], ['clutter2', 0.52, 0.04, 0.2], ['clutter3', 0.74, 0.02, 0.23],
  ['clutter4', 0.03, 0.31, 0.19], ['clutter5', 0.78, 0.33, 0.19], ['clutter6', 0.16, 0.58, 0.17], ['clutter7', 0.67, 0.6, 0.18]];
const ROW = [['rowWin', 0.075, 0.06, 0.27], ['rowPremiere', 0.365, 0.06, 0.27], ['rowSelection', 0.655, 0.06, 0.27]];

const num = (n) => blk(90, 96, 200, `<div class="h1 leafc" style="font-size:150px;line-height:1">${n}</div>`, '', 'data-name="number"');
const tip = (n, title, body) => num(n) + blk(90, 262, 900, `<div class="h2">${title}</div><div class="body" style="margin-top:26px">${body}</div>`, '', `data-name="tip ${n}"`);

export const SETS = {
  // ── 1. the launch ──
  launch: {
    title: 'Daphne: free festival laurels for your film',
    slides: [
      { count: false, ground: 'radial-gradient(ellipse 70% 52% at 50% 50%, #21452F 0%, #142E21 50%, #0B1B13 100%)',
        html: blk(90, 108, 900, `<div class="h1"><span class="bk">Your film</span> did the hard part.</div>`)
          + laurel('hero', 240, 338, 600)
          + blk(90, 1050, 900, `<div class="h2">Now make the laurel. <span class="bloom">It’s free.</span></div>`),
        alt: 'A gold festival laurel on dark green, reading Official Selection, Your Festival, 2026. Above it: (Your film) did the hard part. Below it: Now make the laurel. It’s free.' },
      { html: blk(90, 108, 900, `<div class="h2">In the festival’s own words.</div>`)
          + blk(90, 330, 900, `<div>${[['Official Selection', 'English'], ['Sélection officielle', 'Français'], ['Selección oficial', 'Español'], ['Selezione ufficiale', 'Italiano'], ['Offizielle Auswahl', 'Deutsch'], ['Seleção Oficial', 'Português']].map(([w, lang], i) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:20px 0;${i ? 'border-top:1px solid var(--rule)' : ''}"><span class="h3" style="font-size:58px${i ? ';color:var(--dim)' : ''}">${w}</span><span class="data">${lang}</span></div>`).join('')}</div>`, '', 'data-name="six languages"')
          + blk(90, 1000, 900, `<div class="lead">The common statuses in six languages, and 268 festivals from 60 countries, spelled the way they spell themselves.</div>`),
        alt: 'Official Selection in six languages, one per line: Official Selection, English. Sélection officielle, Français. Selección oficial, Español. Selezione ufficiale, Italiano. Offizielle Auswahl, Deutsch. Seleção Oficial, Português. Text: In the festival’s own words. The common statuses in six languages, and 268 festivals from 60 countries, spelled the way they spell themselves.' },
      { html: blk(90, 108, 900, `<div class="h1">78 looks.</div>`)
          + blk(90, 232, 860, `<div class="lead">Festival gold, engraved, botanical, deco, seals. Your words stay put while you try them on.</div>`)
          + ['Classic Gold', 'Black Tie', 'Herbarium', 'Neon Midnight', 'Rose Gold', 'Letterpress', 'Gala Seal', 'Cherry Blossom', 'Engraved', 'Riso', 'Deco', 'Eucalyptus'].map((n, i) => {
            const l = LOOK[n], cw = 200, ch = 226, x = 110 + (i % 4) * (cw + 20), y = 430 + Math.floor(i / 4) * (ch + 20);
            return blk(x, y, cw, `<div style="width:${cw}px;height:${ch}px;border-radius:14px;background:${l.bg || '#0f1116'};box-shadow:0 14px 34px rgba(0,0,0,.35);display:grid;place-items:center"><img src="${l.file}" alt="" style="display:block;width:${cw - 8}px;height:${ch - 8}px;object-fit:contain"></div>`, '', `data-name="look ${n}"`);
          }).join(''),
        alt: 'Twelve laurels in a grid, each reading Official Selection, Your Festival, 2026, in different looks: gold, silver, botanical ink, neon pink, rose gold, red letterpress, a gold seal, cherry blossom, engraving, riso print, deco silver and eucalyptus. Text: 78 looks. Festival gold, engraved, botanical, deco, seals. Your words stay put while you try them on.' },
      { html: blk(90, 108, 900, `<div class="h2">One laurel, every place it goes.</div>`)
          + poster(90, 320, 400, [['heroWhite', 0.33, 0.05, 0.34]])
          + blk(90, 940, 400, `<div class="data">Poster and print</div>`)
          + blk(530, 320, 460, `<div style="width:460px;height:259px;background:#000;border-radius:10px;box-shadow:0 30px 70px rgba(0,0,0,.5);display:grid;place-items:center"><img src="${L.named.hero.file}" alt="" style="width:150px;height:${Math.round(150 * aspect(L.named.hero.viewBox))}px"></div>`, '', 'data-name="trailer"')
          + blk(530, 596, 460, `<div class="data">Trailer end card</div>`)
          + poster(530, 672, 200, [['heroWhite', 0.24, 0.06, 0.52]], '')
          + blk(530, 990, 220, `<div class="data">Social post</div>`)
          + blk(780, 672, 210, `<div class="data leafc" style="font-size:32px;line-height:1.7">PNG<br>SVG<br>PDF<br>Video</div>`, '', 'data-name="formats"')
          + blk(90, 1068, 900, `<div class="lead">Print it at an exact size, end your trailer on it, post it, and sign your emails with it.</div>`),
        alt: 'The same laurel in three places: in white at the top of a night-sky film poster titled Your Film, in gold on a black trailer end card, and on a social post. Beside them: PNG, SVG, PDF, Video. Text: One laurel, every place it goes. Print it at an exact size, end your trailer on it, post it, and sign your emails with it.' },
      { html: blk(90, 108, 900, `<div class="h2">See it at real size before you export.</div>`)
          + capture('small-sizes-tiles', 90, 330, 420, CAP['small-sizes-tiles'])
          + blk(570, 340, 420, `<div class="data leafc">On screen</div><div class="lead paper" style="margin-top:16px">Your laurel at 160, 100 and 64 px, on dark and light: the sizes people really see it at.</div>`, '', 'data-name="on screen"')
          + blk(90, 912, 900, `<div class="data leafc">In print</div>`)
          + capture('print-note', 90, 966, 900, CAP['print-note']),
        alt: 'Two parts of Daphne. On screen: the laurel shown at 160, 100 and 64 pixels, on dark and light. In print: a warning that reads The smallest words print at 3.7 pt. Below about 6 pt they blur on most presses: print it at least 1.77 in wide, or drop a line. Text: See it at real size before you export.' },
      { html: blk(90, 120, 900, `<div class="h1" style="font-size:190px;line-height:1"><span class="bk">free</span></div>`, '', 'data-name="free"')
          + blk(90, 440, 900, `<div style="font:400 40px/1.3 var(--lead)">${[
            'No account, no paid tier, no limits.',
            'No watermark on anything you make.',
            'Nothing you make leaves your device unless you share it.',
            'Everything you make is yours to use however you like.',
            'Open source. The code is MIT, and the looks, the festival list and the brand are public domain.',
          ].map((t, i) => `<div style="padding:30px 0;${i ? 'border-top:1px solid var(--rule)' : ''}">${t}</div>`).join('')}</div>`, '', 'data-name="pledge"'),
        alt: 'The word free between two green bay leaves drawn as brackets, then a list: No account, no paid tier, no limits. No watermark on anything you make. Nothing you make leaves your device unless you share it. Everything you make is yours to use however you like. Open source. The code is MIT, and the looks, the festival list and the brand are public domain.' },
      { html: logo(140, 300, 800)
          + blk(90, 600, 900, `<div class="lead paper c" style="font-size:44px">${tagline}</div>`)
          + blk(90, 742, 900, `<div class="url c" style="font-size:44px">pitch.dog/daphne</div>`)
          + blk(160, 930, 760, `<div class="body c" style="font-size:32px;color:var(--faint)">Why Daphne? In Greek myth, Daphne turned into the first laurel tree. Every laurel since comes from her.</div>`)
          + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`),
        alt: 'The Daphne logo: the name between two bay leaves drawn as brackets. Below: Make festival laurels for your film. It’s free. pitch.dog/daphne. Why Daphne? In Greek myth, Daphne turned into the first laurel tree. Every laurel since comes from her. Made by pitch.dog.' },
    ],
  },

  // ── 2. the myth, as one line of light that runs across six slides ──
  myth: {
    title: 'The first laurel was a woman named Daphne',
    count: false,
    paint: paintMyth,
    slides: [
      { html: blk(90, 150, 900, `<div class="story" style="font-size:96px;line-height:1.04">The first laurel was a woman named Daphne.</div>`),
        alt: 'Nine fine lines of green light spring from a glow near the bottom of a dark frame and flow to the right like a river. Text: The first laurel was a woman named Daphne.' },
      { html: blk(90, 150, 900, `<div class="story">Daphne was a river nymph who wanted to belong to no one. When Apollo chased her, she begged to be changed.</div>`),
        alt: 'The river of light runs on and quickens, its lines rippling. Text: Daphne was a river nymph who wanted to belong to no one. When Apollo chased her, she begged to be changed.' },
      { html: blk(90, 150, 900, `<div class="story">Her arms became branches. Her hair became leaves. Her heart, the story goes, still beat under the bark.</div>`),
        alt: 'The lines of light dip down and rise into a tree with raised arms, green leaves along every branch, and a pink glow at the heart of the trunk. Text: Her arms became branches. Her hair became leaves. Her heart, the story goes, still beat under the bark.' },
      { html: blk(90, 150, 900, `<div class="story">Apollo wore her leaves as a crown. In Greek, her name is simply the word for laurel.</div>`),
        alt: 'From the tree, three lines of light reach across and curve into a laurel crown of green leaves. Text: Apollo wore her leaves as a crown. In Greek, her name is simply the word for laurel.' },
      { html: blk(90, 150, 900, `<div class="story">At his games in Delphi, singers and poets competed, and the winners were crowned with laurel.</div>`)
          + blk(90, 560, 900, `<div class="h1 leafc" style="font-size:112px;line-height:1">laureate</div><div class="data" style="margin-top:22px;font-size:32px;color:var(--dim)">from Latin laureātus, crowned with laurel</div><div class="lead" style="margin-top:38px">That’s why we still call the people we honor laureates.</div>`, '', 'data-name="laureate"'),
        alt: 'A line of light trails low across the dark. Text: At his games in Delphi, singers and poets competed, and the winners were crowned with laurel. Then, in green: laureate, from Latin laureātus, crowned with laurel. That’s why we still call the people we honor laureates.' },
      { html: blk(90, 150, 900, `<div class="story">Today, a laurel on a film poster still says the same thing: someone chose this.</div>`)
          + laurel('hero', 270, 450, 540, 'data-end'),
        alt: 'The line of light rises into the base of a gold festival laurel reading Official Selection, Your Festival, 2026. Text: Today, a laurel on a film poster still says the same thing: someone chose this.' },
      { html: blk(90, 150, 900, `<div class="story">We named our laurel maker after her, and we’re giving it away.</div>`)
          + logo(140, 470, 800)
          + blk(90, 770, 900, `<div class="lead paper c" style="font-size:44px">${tagline}</div>`)
          + blk(90, 900, 900, `<div class="url c" style="font-size:44px">pitch.dog/daphne</div>`)
          + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`),
        alt: 'The Daphne logo, the name between two bay leaves drawn as brackets. Text: We named our laurel maker after her, and we’re giving it away. Make festival laurels for your film. It’s free. pitch.dog/daphne. Made by pitch.dog.' },
    ],
  },

  // ── 3. six things to know, from the app's own guide ──
  six: {
    title: 'Six things to know before a laurel goes on your poster',
    count: false,
    slides: [
      { count: false,
        html: blk(90, 108, 900, `<div class="data leafc">Using laurels well</div>`)
          + blk(90, 160, 900, `<div class="h1">Six things to know before a laurel goes on your poster.</div>`)
          + poster(290, 520, 500, CLUTTER),
        alt: 'A night-sky film poster titled Your Film, crowded by eight mismatched laurels in gold, silver, neon and holographic looks, from festivals called Another Festival, Some Monthly Awards and A Festival Somewhere. Text: Using laurels well. Six things to know before a laurel goes on your poster.' },
      { html: tip(1, 'Ask the festival first.', 'Most festivals send official laurels to selected films, and some require you to use theirs. Make your own when they don’t send one, or to match the rest of your row.')
          + blk(140, 640, 800, `<div class="panel" style="padding:40px 44px">
              <div class="data">From: Your Festival</div>
              <div class="lead paper" style="margin-top:14px">Your official laurel</div>
              <div class="rule" style="margin:26px 0"></div>
              <div class="body">Congratulations again. Your laurel is attached, with a note on how we’d like it used.</div>
              <div style="display:flex;align-items:center;gap:26px;margin-top:30px;padding:18px 22px;border-radius:16px;background:rgba(243,246,239,.06);box-shadow:0 0 0 1px var(--rule)">
                <img src="${L.named.hero.file}" alt="" style="width:96px;height:${Math.round(96 * aspect(L.named.hero.viewBox))}px">
                <div class="data paper" style="font-size:28px">official-selection.png</div></div></div>`, '', 'data-name="email card"'),
        alt: 'An email from Your Festival with the subject Your official laurel: Congratulations again. Your laurel is attached, with a note on how we’d like it used. The attachment, official-selection.png, is a gold laurel. Text: 1. Ask the festival first. Most festivals send official laurels to selected films, and some require you to use theirs. Make your own when they don’t send one, or to match the rest of your row.' },
      { html: tip(2, 'Say exactly what you got.', 'Use the festival’s current name and its own wording. Turning a semi-finalist place into a selection reads as overstating it.')
          + blk(130, 640, 360, `<div style="position:relative"><img src="${L.named.hero.file}" alt="" style="display:block;width:360px;height:${Math.round(360 * aspect(L.named.hero.viewBox))}px;opacity:.32"><svg viewBox="0 0 360 403" width="360" height="403" style="position:absolute;inset:0"><path d="M40 360 L320 44" stroke="#F3F6EF" stroke-width="5" stroke-linecap="round" opacity=".8"/></svg></div>`, '', 'data-name="wrong laurel"')
          + blk(590, 640, 360, `<img src="${L.named.semi.file}" alt="" style="display:block;width:360px;height:${Math.round(360 * aspect(L.named.semi.viewBox))}px">`, '', 'data-name="right laurel"')
          + blk(130, 1072, 360, `<div class="data" ${center}>What you’d like it to say</div>`)
          + blk(590, 1072, 360, `<div class="data leafc" ${center}>What the festival said</div>`),
        alt: 'Two gold laurels. The left one, faded and struck through, says Official Selection, labeled What you’d like it to say. The right one says Semi-Finalist, Your Festival, 2026, labeled What the festival said. Text: 2. Say exactly what you got. Use the festival’s current name and its own wording. Turning a semi-finalist place into a selection reads as overstating it.' },
      { html: tip(3, 'Wait for the announcement.', 'Many festivals ask selected films to keep it private until the lineup is out. Check before you post.')
          + poster(130, 620, 380, [['heroWhite', 0.3, 0.05, 0.4]])
          + blk(570, 700, 420, `<div style="position:relative;padding-left:56px">
              <div style="position:absolute;left:14px;top:22px;bottom:30px;width:2px;background:var(--rule)"></div>
              <div style="position:relative"><div style="position:absolute;left:-52px;top:10px;width:30px;height:30px;border-radius:50%;box-shadow:0 0 0 2px var(--faint)"></div><div class="data">The email</div><div class="lead paper" style="margin-top:10px">You’re in. Keep it quiet.</div></div>
              <div style="position:relative;margin-top:110px"><div style="position:absolute;left:-52px;top:10px;width:30px;height:30px;border-radius:50%;background:var(--leaf)"></div><div class="data leafc">The lineup</div><div class="lead paper" style="margin-top:10px">Now post the laurel.</div></div></div>`, '', 'data-name="timeline"'),
        alt: 'A film poster with a white laurel at the top, beside a two-step timeline: The email, You’re in. Keep it quiet. The lineup, Now post the laurel. Text: 3. Wait for the announcement. Many festivals ask selected films to keep it private until the lineup is out. Check before you post.' },
      { html: tip(4, 'Fewer, stronger laurels.', 'One per award. Lead with wins, then premieres, then selections. Daphne lines them up in that order, at one size.')
          + poster(110, 566, 390, CLUTTER)
          + poster(580, 566, 390, ROW)
          + blk(110, 1164, 390, `<div class="data" ${center}>Before</div>`)
          + blk(580, 1164, 390, `<div class="data leafc" ${center}>After</div>`),
        alt: 'Two versions of the same film poster. Before: eight mismatched laurels crowd the sky. After: three laurels in a row at one size, a win for Best Short Film, then a World Premiere, then an Official Selection. Text: 4. Fewer, stronger laurels. One per award. Lead with wins, then premieres, then selections. Daphne lines them up in that order, at one size.' },
      { html: tip(5, 'Keep them readable.', 'One size across a row, and big enough to read where people will see it. Daphne shows you yours at 160, 100 and 64 px before you export.')
          + blk(90, 676, 160, `<div class="data">Before</div>`)
          + blk(270, 640, 720, `<div style="display:flex;align-items:flex-start;gap:30px">${[['rowWin', 230, 0], ['rowPremiere', 120, 70], ['rowSelection', 170, 30]].map(([k, w, dy]) => `<img src="${L.named[k].file}" alt="" style="width:${w}px;height:${Math.round(w * aspect(L.named[k].viewBox))}px;margin-top:${dy}px">`).join('')}</div>`, '', 'data-name="row before"')
          + blk(90, 1004, 160, `<div class="data leafc">After</div>`)
          + blk(270, 966, 720, `<div style="display:flex;align-items:flex-start;gap:30px">${['rowWin', 'rowPremiere', 'rowSelection'].map((k) => `<img src="${L.named[k].file}" alt="" style="width:220px;height:${Math.round(220 * aspect(L.named[k].viewBox))}px">`).join('')}</div>`, '', 'data-name="row after"'),
        alt: 'Three laurels shown twice. Before: at three different sizes and heights. After: the same three at one size, in a straight row: Winner, Best Short Film; World Premiere; Official Selection. Text: 5. Keep them readable. One size across a row, and big enough to read where people will see it. Daphne shows you yours at 160, 100 and 64 px before you export.' },
      { html: tip(6, 'Watch for look-alikes.', 'A laurel can come from a laurel mill: an event that exists to sell them. These are the signs.')
          + laurel('clutter1', 110, 630, 380)
          + blk(540, 640, 450, `<div style="font:400 38px/1.25 var(--lead)">${['A name that echoes a famous festival', 'Awards only, or online only', 'Calls for entry open all year'].map((t, i) => `<div style="padding:24px 0;${i ? 'border-top:1px solid var(--rule)' : ''}">${t}</div>`).join('')}</div>`, '', 'data-name="signs"'),
        alt: 'A neon laurel reading Semi-Finalist, Some Monthly Awards, 2026, beside three signs of a laurel mill: A name that echoes a famous festival. Awards only, or online only. Calls for entry open all year. Text: 6. Watch for look-alikes. A laurel can come from a laurel mill: an event that exists to sell them. These are the signs.' },
      { html: blk(90, 108, 900, `<div class="h2">All six are in Daphne’s guide.</div>`)
          + blk(90, 300, 900, `<div class="lead">And three are tools: the festival’s own wording, a row in the right order, and the small-size check. Free, with no account.</div>`)
          + logo(220, 560, 640)
          + blk(90, 800, 900, `<div class="lead paper" ${center}>${tagline}</div>`)
          + blk(90, 900, 900, `<div class="url" ${center}>pitch.dog/daphne</div>`)
          + blk(90, 1050, 900, `<div class="body paper" ${center}>Send this to a filmmaker with a festival run ahead.</div>`)
          + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`),
        alt: 'The Daphne logo, the name between two bay leaves drawn as brackets. Text: All six are in Daphne’s guide. And three are tools: the festival’s own wording, a row in the right order, and the small-size check. Free, with no account. Make festival laurels for your film. It’s free. pitch.dog/daphne. Send this to a filmmaker with a festival run ahead. Made by pitch.dog.' },
    ],
  },

  // ── 4. the email becomes the laurel ──
  email: {
    title: 'This email is a laurel',
    slides: [
      { count: false,
        html: blk(90, 108, 900, `<div class="h1">This email is a laurel.</div>`)
          + blk(90, 360, 900, `<div class="panel" style="padding:44px 50px 50px">
              <div style="display:grid;grid-template-columns:150px 1fr;row-gap:14px;align-items:baseline">
                <div class="data">From</div><div class="lead paper" style="font-size:36px">Your Festival</div>
                <div class="data">Subject</div><div class="lead paper" style="font-size:36px">Your Film: Official Selection</div></div>
              <div class="rule" style="margin:32px 0"></div>
              <div style="font:400 36px/1.42 var(--text);color:var(--paper)"><p>Dear filmmaker,</p><p style="margin-top:28px">Congratulations! We’re delighted to tell you that your film “Your Film” has been selected for Your Festival 2026. It will screen in the Shorts Competition as part of our Official Selection.</p><p style="margin-top:28px">See you in October,<br>The programming team</p></div></div>`, '', 'data-name="email"'),
        alt: 'An email from Your Festival, subject Your Film: Official Selection. Dear filmmaker, Congratulations! We’re delighted to tell you that your film “Your Film” has been selected for Your Festival 2026. It will screen in the Shorts Competition as part of our Official Selection. See you in October, The programming team. Above it: This email is a laurel.' },
      { html: blk(90, 108, 900, `<div class="h2">Paste it into Daphne.</div>`)
          + capture('email-paste', 140, 300, 800, CAP['email-paste'])
          + blk(90, 970, 900, `<div class="lead">It reads the email in your browser and fills in what the festival gave you.</div>`),
        alt: 'Daphne’s From the email panel with the festival’s email pasted in: Dear filmmaker, Congratulations! We’re delighted to tell you that your film “Your Film” has been selected for Your Festival 2026. It will screen in the Shorts Competition as part of our Official Selection. See you in October, The programming team. Text: Paste it into Daphne. It reads the email in your browser and fills in what the festival gave you.' },
      { html: blk(90, 108, 900, `<div class="h2">It finds the words.</div>`)
          + blk(90, 290, 900, `<div>${[['Status', 'Official Selection'], ['Festival', 'Your Festival'], ['Year', '2026'], ['Section', 'Shorts Competition'], ['Film title', 'Your Film']].map(([k, v], i) => `<div style="display:grid;grid-template-columns:240px 1fr;align-items:baseline;padding:24px 0;${i ? 'border-top:1px solid var(--rule)' : ''}"><div class="data">${k}</div><div class="h3" style="font-size:56px">${v}</div></div>`).join('')}</div>`, '', 'data-name="fields"')
          + blk(90, 1010, 900, `<div class="lead">You check each line, and it’s on your laurel. The email never leaves your browser.</div>`),
        alt: 'Five lines found in the email: Status, Official Selection. Festival, Your Festival. Year, 2026. Section, Shorts Competition. Film title, Your Film. Text: It finds the words. You check each line, and it’s on your laurel. The email never leaves your browser.' },
      { ground: 'radial-gradient(ellipse 70% 52% at 50% 48%, #21452F 0%, #142E21 50%, #0B1B13 100%)',
        html: blk(90, 108, 900, `<div class="h2">Pick a look. Download it.</div>`)
          + ['Herbarium', 'Classic Gold', 'Deco'].map((n, i) => { const l = LOOK[n], cw = i === 1 ? 370 : 250, ch = Math.round(cw * 1.13), x = [90, 355, 740][i], y = i === 1 ? 320 : 388; return blk(x, y, cw, `<div style="width:${cw}px;height:${ch}px;border-radius:18px;background:${l.bg};display:grid;place-items:center;box-shadow:0 24px 60px rgba(0,0,0,.4)${i === 1 ? ',0 0 0 3px var(--leaf)' : ';opacity:.55'}"><img src="${l.file}" alt="" style="display:block;width:${cw - 10}px;height:${ch - 10}px;object-fit:contain"></div>`, '', `data-name="look ${n}"`); }).join('')
          + blk(90, 850, 900, `<div class="data leafc c" style="font-size:32px">PNG · SVG · PDF · video</div>`)
          + blk(90, 930, 900, `<div class="lead" ${center}>For your poster, trailer, socials and site. Free, with no account and no watermark.</div>`),
        alt: 'Three laurels reading Official Selection, Your Festival, 2026: a botanical ink one on cream, a gold one on black, picked and outlined in green, and a silver deco one. Text: Pick a look. Download it. PNG, SVG, PDF, video. For your poster, trailer, socials and site. Free, with no account and no watermark.' },
      { html: blk(90, 108, 900, `<div class="h2">And if it’s a no?</div>`)
          + capture('email-decline', 220, 300, 640, CAP['email-decline'])
          + blk(90, 950, 900, `<div class="lead">No laurel for a no, and no pretending. <span class="paper">The next email is the one.</span></div>`),
        alt: 'Daphne’s From the email panel with a decline pasted in: Thank you for sending us “Your Film”. Unfortunately, we’re unable to include it in this year’s program. We hope to see your next film. Daphne answers: This reads like a decline, so there’s no laurel to make from it. It happens to every film; the next email is the one. Text: And if it’s a no? No laurel for a no, and no pretending. The next email is the one.' },
      { html: blk(90, 200, 900, `<div class="h1" ${center}>Paste yours.</div>`)
          + blk(90, 400, 900, `<div class="url c" style="font-size:64px">pitch.dog/daphne</div>`)
          + logo(250, 640, 580)
          + blk(90, 860, 900, `<div class="lead paper" ${center}>${tagline}</div>`)
          + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`),
        alt: 'Paste yours. pitch.dog/daphne. Below, the Daphne logo, the name between two bay leaves drawn as brackets, and: Make festival laurels for your film. It’s free. Made by pitch.dog.' },
    ],
  },

  // ── 5. for festivals ──
  festivals: {
    title: 'For festivals: every laurel you send, in one go',
    slides: [
      { count: false,
        html: blk(90, 108, 900, `<div class="data leafc">For festivals</div>`)
          + blk(90, 160, 900, `<div class="h1">Every laurel your festival gives, made in one go.</div>`)
          + [['Official Selection', 95, 520], ['Finalist', 325, 520], ['Semi-Finalist', 555, 520], ['Honorable Mention', 785, 520], ['Best Feature Film', 210, 784], ['Best Short Film', 440, 784], ['Audience Award', 670, 784]].map(([label, x, y]) => {
            const p = PACK(label, 'color'); return blk(x, y, 200, `<img src="${p.file}" alt="" style="display:block;width:200px;height:${Math.round(200 * aspect(p.viewBox))}px">`, '', `data-name="pack ${label}"`);
          }).join('')
          + blk(90, 1086, 900, `<div class="lead" ${center}>One per status and award, in your festival’s look.</div>`),
        alt: 'Seven gold laurels for Your Festival 2026: Official Selection, Finalist, Semi-Finalist, Honorable Mention, and Winner laurels for Best Feature Film, Best Short Film and Audience Award. Text: For festivals. Every laurel your festival gives, made in one go. One per status and award, in your festival’s look.' },
      { html: blk(90, 108, 900, `<div class="h2">Pick the statuses. Name the awards.</div>`)
          + capture('pack-choices', 250, 310, 580, CAP['pack-choices'])
          + blk(90, 1060, 900, `<div class="lead" ${center}>Then download the whole set at once.</div>`),
        alt: 'Daphne’s Festival pack choices: Statuses, with Official Selection, Finalist, Semi-Finalist and Honorable Mention ticked and Nominee, Special Mention and World Premiere not. Awards, one per line: Best Feature Film, Best Short Film, Audience Award. Over each award: Winner. Text: Pick the statuses. Name the awards. Then download the whole set at once.' },
      { html: blk(90, 108, 900, `<div class="h2">In color, black and white.</div>`)
          + [['color', '#0B1B13', 'As designed', 90], ['black', '#F3F6EF', 'Black', 400], ['white', null, 'White', 710]].map(([way, bg, label, x]) => {
            const p = PACK('Official Selection', way), lw = 220;
            const ground = bg ? `background:${bg}` : 'background:linear-gradient(#0B1524,#1D3550 60%,#6F8A9C)';
            return blk(x, 300, 280, `<div style="width:280px;height:400px;border-radius:18px;${ground};display:grid;place-items:center;box-shadow:0 24px 60px rgba(0,0,0,.4)"><img src="${p.file}" alt="" style="width:${lw}px;height:${Math.round(lw * aspect(p.viewBox))}px"></div><div class="data c" style="margin-top:22px">${label}</div>`, '', `data-name="${way}"`);
          }).join('')
          + blk(90, 840, 900, `<div class="lead">Black for light backgrounds and one-ink print. White for dark posters, trailers and photos. Every file in SVG and PNG.</div>`),
        alt: 'The Official Selection laurel three ways: in gold on dark green, in black on pale paper, and in white on a night-sky photo. Labels: As designed, Black, White. Text: In color, black and white. Black for light backgrounds and one-ink print. White for dark posters, trailers and photos. Every file in SVG and PNG.' },
      { html: blk(90, 108, 900, `<div class="h2">With guidelines your filmmakers can follow.</div>`)
          + blk(130, 330, 820, `<div style="background:var(--paper);color:var(--grove);border-radius:18px;padding:46px 52px;box-shadow:0 30px 80px rgba(0,0,0,.45);font:500 27px/1.42 var(--data)">
              <div style="font-weight:600">LAUREL GUIDELINES: YOUR FESTIVAL 2026</div>
              <div style="margin-top:24px">Congratulations, and thank you for being part of Your Festival 2026. Please use our laurels like this:</div>
              <div style="margin-top:24px">1. Use the laurel for what your film received: Official Selection for a selection, the award laurel only for the award it won. A nomination or a finalist place is not a win.</div>
              <div style="margin-top:20px">2. Use the files as they are. Please don’t redraw, re-letter or recolor them.</div>
              <div style="margin-top:20px;opacity:.6">3. Keep it readable …</div></div>`, '', 'data-name="guidelines"')
          + blk(90, 1050, 900, `<div class="lead">Every pack comes with this template. Add your contact and send it along with the laurels.</div>`),
        alt: 'A pale document: Laurel guidelines, Your Festival 2026. Congratulations, and thank you for being part of Your Festival 2026. Please use our laurels like this: 1. Use the laurel for what your film received: Official Selection for a selection, the award laurel only for the award it won. A nomination or a finalist place is not a win. 2. Use the files as they are. Please don’t redraw, re-letter or recolor them. 3. Keep it readable, and more. Text: With guidelines your filmmakers can follow. Every pack comes with this template. Add your contact and send it along with the laurels.' },
      { html: blk(90, 108, 900, `<div class="h2">Free for festivals too.</div>`)
          + blk(90, 216, 900, `<div class="lead">No account, no watermark, nothing to sign. Make the pack for your films, or send them the link.</div>`)
          + logo(220, 520, 640)
          + blk(90, 760, 900, `<div class="lead paper" ${center}>${tagline}</div>`)
          + blk(90, 880, 900, `<div class="url c" style="font-size:48px">pitch.dog/daphne</div>`)
          + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`),
        alt: 'The Daphne logo, the name between two bay leaves drawn as brackets. Text: Free for festivals too. No account, no watermark, nothing to sign. Make the pack for your films, or send them the link. Make festival laurels for your film. It’s free. pitch.dog/daphne. Made by pitch.dog.' },
    ],
  },
};

// the pieces the carousels after the launch share (sets-more.js)
export { L, LOOK, PACK, aspect, blk, laurel, capture, logo, center, tagline, CAP, poster };
