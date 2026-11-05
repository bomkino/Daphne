// The ten carousels after the launch (06 to 15, November 2, 2026): one idea each. Same rules as sets.js: every laurel
// is drawn by Daphne's own engine (tools/laurels.mjs), every panel of the app is a capture of the real thing
// (tools/capture-more.mjs), the posters are art made for these slides (art/), and every festival is a placeholder.
// Numbers come from the app's code or from research/01 (the 42 festival-issued and 68 laurels we studied).
import { L, LOOK, PACK, aspect, blk, laurel, logo, center, tagline, poster } from './sets.js';

const M = await (await fetch('./captures/more.json')).json();
const SZ = M.sizes, F = M.facts;
const ar = (name) => SZ[name][1] / SZ[name][0];
const LOGO_LIGHT = '../../brand/logo/daphne-logo-hero-on-light.svg', LOGO_AR = 1195.25 / 4208.46;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Bloom is never text on a light ground, so the light sets set the tagline in one color
const taglineLight = 'Make festival laurels for your film. It’s free.';

// a capture or art image in a block, at width w
const pic = (src, x, y, w, h, style = '', name = src) => blk(x, y, w, `<img src="${src}" alt="" style="display:block;width:${w}px;height:${h}px;${style}">`, '', `data-name="${name}"`);
const cap = (name, x, y, w, style = 'border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5)') => pic(`captures/${name}.png`, x, y, w, Math.round(w * ar(name)), style, name);
// part of a capture, enlarged: drawn as a background so nothing spills out of its block
function crop(name, x, y, w, [fx0, fy0, fx1, fy1], style = '') {
  const iw = w / (fx1 - fx0), ih = iw * ar(name), h = Math.round((fy1 - fy0) * ih);
  return blk(x, y, w, `<div style="width:${w}px;height:${h}px;background:url(captures/${name}.png) ${-fx0 * iw}px ${-fy0 * ih}px / ${iw}px ${ih}px no-repeat;${style}"></div>`, '', `data-name="crop ${name}"`);
}
const named = (key, x, y, w, style = '') => { const l = L.named[key]; return pic(l.file, x, y, w, Math.round(w * aspect(l.viewBox)), style, 'laurel ' + key); };
const logoOn = (x, y, w, light) => light ? blk(x, y, w, `<img src="${LOGO_LIGHT}" alt="" style="display:block;width:${w}px;height:${Math.round(w * LOGO_AR)}px">`, '', 'data-name="logo"') : logo(x, y, w);
// the last slide of every set: a line of its own, then the name with the tagline, the address and who made it
function end(head, sub, { light = false } = {}) {
  return blk(90, 108, 900, `<div class="h2">${head}</div>${sub ? `<div class="lead" style="margin-top:26px">${sub}</div>` : ''}`, '', 'data-name="end words"')
    + logoOn(220, 560, 640, light)
    + blk(90, 800, 900, `<div class="lead paper" ${center}>${light ? taglineLight : tagline}</div>`)
    + blk(90, 910, 900, `<div class="url c" style="font-size:48px">pitch.dog/daphne</div>`)
    + blk(90, 1172, 900, `<div class="data" ${center}>Made by pitch.dog</div>`);
}
const endAlt = (said) => `The Daphne logo, the name between two bay leaves drawn as brackets. Text: ${said} Make festival laurels for your film. It’s free. pitch.dog/daphne. Made by pitch.dog.`;
const list = (items, size = 40) => `<div style="font:400 ${size}px/1.3 var(--lead)">${items.map((t, i) => `<div style="padding:26px 0;${i ? 'border-top:1px solid var(--rule)' : ''}">${t}</div>`).join('')}</div>`;
const num = (s) => (s.match(/[\d.]+:1/) || [''])[0];

// ── 06 read: a gold laurel on a gold poster, the contrast Daphne reads, and the inks it offers ──
const sg = F.suggest.map((t) => ({ name: t.split(':')[0], k: num(t) }));
const read = {
  title: 'Can you read this laurel?',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">Can you read this laurel?</div>`)
        + cap('read-gold', 230, 350, 620, 'border-radius:12px;box-shadow:0 40px 90px rgba(0,0,0,.55)'),
      alt: 'A film poster of a wheat field at sunset, a lone figure walking toward the sun, titled Your Film. At the top, a gold laurel almost disappears into the golden sky: its words can’t be read. Text: Can you read this laurel?' },
    { html: blk(90, 108, 900, `<div class="h2">Neither can anyone else.</div>`)
        + crop('read-gold', 190, 290, 700, [0.28, 0.1, 0.72, 0.32], 'border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.45)')
        + blk(90, 880, 900, `<div class="h1 leafc" style="font-size:120px;line-height:1">${num(F.readGold)}</div><div class="lead" style="margin-top:20px">Gold on a gold sky. Daphne measures it on your poster: <span class="paper">hard to read here.</span></div>`, '', 'data-name="contrast"'),
      alt: `A close-up of the gold laurel on the golden sky: Official Selection, Your Festival, 2026, barely visible. Text: Neither can anyone else. ${num(F.readGold)}. Gold on a gold sky. Daphne measures it on your poster: hard to read here.` },
    { html: blk(90, 108, 900, `<div class="h2">Auto ink finds one that reads.</div>`)
        + cap('read-gold', 120, 300, 400, 'border-radius:10px;box-shadow:0 30px 70px rgba(0,0,0,.5)')
        + cap('read-auto', 560, 300, 400, 'border-radius:10px;box-shadow:0 30px 70px rgba(0,0,0,.5)')
        + blk(120, 926, 400, `<div class="data">Gold</div><div class="h3" style="font-size:56px;margin-top:8px">${num(F.readGold)}</div>`, '', 'data-name="before"')
        + blk(560, 926, 400, `<div class="data leafc">Auto ink</div><div class="h3" style="font-size:56px;margin-top:8px">${num(F.readAuto)}</div>`, '', 'data-name="after"')
        + blk(90, 1076, 900, `<div class="lead">It tries the poster’s own colors first, and checks each one against what’s behind the laurel.</div>`),
      alt: `The wheat-field poster twice. Left, labeled Gold, ${num(F.readGold)}: the gold laurel lost in the sky. Right, labeled Auto ink, ${num(F.readAuto)}: the same laurel in a deep brown taken from the poster, easy to read. Text: Auto ink finds one that reads. It tries the poster’s own colors first, and checks each one against what’s behind the laurel.` },
    { html: blk(90, 108, 900, `<div class="h2">Or pick a look made from your poster.</div>`)
        + sg.map((s, i) => cap('read-suggest-' + i, [110, 570][i % 2], [330, 720][i >> 1], 400, 'border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.45)')
          + blk([110, 570][i % 2], [330, 720][i >> 1] + Math.round(400 * ar('read-suggest-' + i)) + 16, 400, `<div class="data">${s.name}</div><div class="h3${parseFloat(s.k) >= 4.5 ? ' leafc' : ''}" style="font-size:44px;line-height:1;margin-top:6px">${s.k}</div>`, '', `data-name="suggest ${i}"`)).join(''),
      alt: `Four versions of the laurel on the poster’s sky, each in colors taken from the poster, with the contrast Daphne measured: ${sg.map((s) => `${s.name}, ${s.k}`).join('; ')}. Text: Or pick a look made from your poster.` },
    { html: end('Try it on your poster.', 'Upload it in On poster. It stays on your device: nothing is uploaded anywhere.'),
      alt: endAlt('Try it on your poster. Upload it in On poster. It stays on your device: nothing is uploaded anywhere.') },
  ],
};

// ── 07 tonight: the email comes at night, the laurel is made at once, and nothing leaves the device ──
const NIGHT = 'radial-gradient(ellipse 75% 55% at 50% 66%, #15301F 0%, #0B1B13 52%, #040A07 100%)';
const phone = (inner, w = 380, h = 760) => `<div style="position:relative;width:${w}px;height:${h}px;border-radius:62px;background:linear-gradient(170deg,#11241A,#060E0A);box-shadow:0 0 0 3px #26402F,0 0 0 11px #07100B,0 50px 120px rgba(0,0,0,.7),0 0 180px rgba(184,229,154,.10);overflow:hidden">${inner}</div>`;
const envelope = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#12291E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 L12 13 L20.5 6.5"/></svg>`;
const lockScreen = phone(`
  <div style="text-align:center;margin-top:86px;font:300 128px/1 var(--head);letter-spacing:-.02em;color:var(--paper)">11:48</div>
  <div style="margin:64px 18px 0;padding:22px 22px 24px;border-radius:30px;background:rgba(243,246,239,.12);box-shadow:inset 0 0 0 1px rgba(243,246,239,.10)">
    <div style="display:flex;align-items:center;gap:14px"><div style="width:46px;height:46px;border-radius:12px;background:var(--leaf);display:grid;place-items:center">${envelope}</div>
      <div style="font:600 28px/1.1 var(--text);color:var(--paper)">Your Festival</div><div class="data" style="margin-left:auto;font-size:26px">now</div></div>
    <div style="font:600 30px/1.25 var(--text);color:var(--paper);margin-top:16px">Your Film: Official Selection</div>
    <div style="font:400 27px/1.3 var(--text);color:var(--dim);margin-top:6px">Dear filmmaker, congratulations! We’re delighted…</div></div>`);
const browser = (inner, url, w = 860, h = 560) => `<div style="width:${w}px;height:${h}px;border-radius:22px;background:#0A1611;box-shadow:0 0 0 1px rgba(184,229,154,.18),0 40px 100px rgba(0,0,0,.55);overflow:hidden">
  <div style="height:76px;display:flex;align-items:center;gap:18px;padding:0 26px;background:#10231A;border-bottom:1px solid rgba(184,229,154,.14)">
    <div style="display:flex;gap:10px">${'<i style="width:16px;height:16px;border-radius:50%;background:rgba(243,246,239,.22);display:block"></i>'.repeat(3)}</div>
    <div class="data" style="flex:1;font-size:26px;padding:10px 20px;border-radius:12px;background:rgba(243,246,239,.07);color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${url}</div></div>
  <div style="height:${h - 76}px;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 45%,#1B3A2A,#0B1B13)">${inner}</div></div>`;
const heroImg = (w) => `<img src="${L.named.hero.file}" alt="" style="display:block;width:${w}px;height:${Math.round(w * aspect(L.named.hero.viewBox))}px">`;
const tonight = {
  title: 'You’re in. You can’t tell anyone yet.',
  ground: NIGHT,
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">You’re in.<br>You can’t tell<br>anyone yet.</div>`)
        + blk(350, 470, 380, lockScreen, '', 'data-name="phone"'),
      alt: 'A phone glowing in the dark at 11:48. A notification from Your Festival: Your Film: Official Selection. Dear filmmaker, congratulations! We’re delighted… Text: You’re in. You can’t tell anyone yet.' },
    { html: blk(90, 108, 900, `<div class="h2">Make the laurel tonight anyway.</div>`)
        + laurel('hero', 160, 400, 760)
        + blk(90, 1000, 900, `<div class="lead" ${center}>So it’s ready the moment you can post it.</div>`),
      alt: 'A gold laurel on dark green: Official Selection, Your Festival, 2026. Text: Make the laurel tonight anyway. So it’s ready the moment you can post it.' },
    { html: blk(90, 108, 900, `<div class="h2">It stays between you and your laptop.</div>`)
        + blk(150, 330, 780, `<div style="position:relative;width:780px;height:470px;border-radius:34px;border:2px dashed rgba(184,229,154,.45)">
            <div class="data leafc" style="position:absolute;left:30px;top:24px">Your device</div>
            <svg viewBox="0 0 520 330" width="520" height="330" style="position:absolute;left:130px;top:96px" aria-hidden="true"><rect x="60" y="10" width="400" height="250" rx="16" fill="#0B1B13" stroke="#B8E59A" stroke-opacity=".55" stroke-width="2.5"/><path d="M14 276 h492 l-26 32 h-440 z" fill="#0B1B13" stroke="#B8E59A" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round"/></svg>
            <img src="${L.named.hero.file}" alt="" style="position:absolute;left:${390 - 140}px;top:${Math.round(96 + 135 - 140 * aspect(L.named.hero.viewBox))}px;width:280px;height:${Math.round(280 * aspect(L.named.hero.viewBox))}px"></div>`, '', 'data-name="device"')
        + blk(90, 850, 900, list(['No account.', 'No upload: the email you paste is read in your browser.', 'Nothing you make leaves your device unless you share it.'], 34), '', 'data-name="pledge"'),
      alt: 'A laptop with the gold laurel on its screen, inside a dashed line labeled Your device. Then: No account. No upload: the email you paste is read in your browser. Nothing you make leaves your device unless you share it. Text: It stays between you and your laptop.' },
    { html: blk(90, 108, 900, `<div class="h2">It keeps until the lineup.</div><div class="lead" style="margin-top:26px">Daphne saves it in this browser as you go. Close the tab, and it’s there when you come back.</div>`, '', 'data-name="keeps"')
        + blk(110, 430, 860, browser(heroImg(560), 'pitch.dog/daphne', 860, 680), '', 'data-name="browser"'),
      alt: 'A browser window at pitch.dog/daphne with the gold laurel in it. Text: It keeps until the lineup. Daphne saves it in this browser as you go. Close the tab, and it’s there when you come back.' },
    { html: blk(90, 108, 900, `<div class="h2">Then the lineup is out.</div>`)
        + poster(310, 300, 460, [['heroWhite', 0.21, 0.05, 0.58]])
        + blk(90, 1036, 900, `<div class="lead paper" ${center}>Post it the minute it’s public.</div>`),
      alt: 'A night-sky film poster titled Your Film, with a white laurel at the top: Official Selection, Your Festival, 2026. Text: Then the lineup is out. Post it the minute it’s public.' },
    { html: end('Make it tonight.', 'Free, with no account. It stays on your device until you share it.'),
      alt: endAlt('Make it tonight. Free, with no account. It stays on your device until you share it.') },
  ],
};

// ── 08 films: six films nobody made, each with the look that belongs to it ──
const FILMS = [
  { art: 'period', laurel: 'gPeriod', title: 'tPeriod', lw: 0.48, tw: 0.62, genre: 'A period drama', look: 'Engraved', why: 'Ink on cream, like the letters in it.', sees: 'a woman in profile in a cameo, on cream paper, with an engraved black ink laurel' },
  { art: 'sea', laurel: 'gSea', title: 'tSea', lw: 0.48, tw: 0.66, genre: 'A documentary about the sea', look: 'Ocean', why: 'Deep water, with the light coming up.', sees: 'dawn on open water and a small sailboat, with a teal laurel' },
  { art: 'night', laurel: 'gNight', title: 'tNight', lw: 0.48, tw: 0.5, genre: 'A thriller', look: 'Neon Midnight', why: 'Pink neon, and a glow in the rain.', sees: 'a figure in a hat under a ring of pink neon in the rain, with a glowing pink laurel' },
  { art: 'spring', laurel: 'gSpring', title: 'tSpring', lw: 0.48, tw: 0.6, genre: 'A love story', look: 'Cherry Blossom', why: 'Blossom, for the spring it’s set in.', sees: 'two people under a cherry tree at dusk, with a laurel of pink blossoms' },
  { art: 'space', laurel: 'gSpace', title: 'tSpace', lw: 0.48, tw: 0.62, genre: 'Science fiction', look: 'Chrome', why: 'Cold metal, a long way from home.', sees: 'a figure on a small moon before a ringed planet, with a chrome laurel' },
  { art: 'summer', laurel: 'gSummer', title: 'tSummer', lw: 0.48, tw: 0.56, genre: 'A summer comedy', look: 'Sorbet', why: 'Pink and peach, like the sun on the pool.', sees: 'a big sun in rings over a pool with a pink float, with a pink and peach laurel' },
];
function film(f, x, y, w) {
  const h = Math.round(w * 1.5), l = L.named[f.laurel], t = L.named[f.title], lw = f.lw * w, tw = f.tw * w, th = tw * aspect(t.viewBox);
  return blk(x, y, w, `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${Math.round(w * 0.02)}px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5)">
    <img src="art/${f.art}.svg" alt="" style="position:absolute;inset:0;width:${w}px;height:${h}px">
    <img src="${l.file}" alt="" style="position:absolute;left:${(w - lw) / 2}px;top:${0.035 * h}px;width:${lw}px;height:${lw * aspect(l.viewBox)}px">
    <img src="${t.file}" alt="" style="position:absolute;left:${(w - tw) / 2}px;top:${0.918 * h - th}px;width:${tw}px;height:${th}px"></div>`, '', `data-name="film ${f.art}"`);
}
const films = {
  title: 'Your film isn’t gold',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">Your film isn’t gold.</div>`)
        + FILMS.map((f, i) => film(f, 110 + (i % 3) * 294, 270 + Math.floor(i / 3) * 432, 272)).join('')
        + blk(90, 1170, 900, `<div class="lead" ${center}>Six films. Six laurels that belong to them.</div>`),
      alt: `Six film posters, each with a laurel in its own colors: ${FILMS.map((f) => `${f.genre.toLowerCase()} (${f.look})`).join(', ')}. Text: Your film isn’t gold. Six films. Six laurels that belong to them.` },
    ...FILMS.map((f) => ({
      html: blk(90, 100, 900, `<div class="data leafc" ${center}>${f.genre}</div><div class="h2" style="margin-top:14px" ${center}>${f.look}.</div>`, '', 'data-name="look"')
        + film(f, 280, 300, 520)
        + blk(90, 1124, 900, `<div class="lead paper" ${center}>${f.why}</div>`),
      alt: `A poster for ${f.genre.toLowerCase()} titled Your Film: ${f.sees}, reading Official Selection, Your Festival, 2026. Text: ${f.genre}. ${f.look}. ${f.why}` })),
    { html: end('78 looks. One of them is your film’s.', 'Or let Daphne take the colors from your poster.'),
      alt: endAlt('78 looks. One of them is your film’s. Or let Daphne take the colors from your poster.') },
  ],
};

// ── 09 fixer: the festival's file comes as a JPEG on white; Daphne takes the box away ──
const ASIS = { file: 'captures/box-asis.png', viewBox: [0, 0, SZ['box-asis'][0], SZ['box-asis'][1]] };
const CLEAN = { file: 'captures/box-clean.png', viewBox: [0, 0, SZ['box-clean'][0], SZ['box-clean'][1]] };
// the same leaves in both files: the clean one is trimmed, so its box is the JPEG's moved by the trim (measured)
const box = (name, x0, y0, x1, y1, dx = 0, dy = 0) => { const [w, h] = SZ[name]; return [(x0 - dx) / w, (y0 - dy) / h, (x1 - dx) / w, (y1 - dy) / h]; };
const BOXA = box('box-asis', 36, 300, 196, 484), BOXC = box('box-clean', 36, 300, 196, 484, 9, 8);
const tile = (inner, w, h, bg) => `<div style="width:${w}px;height:${h}px;border-radius:20px;background:${bg};display:grid;place-items:center;box-shadow:0 24px 60px rgba(0,0,0,.4)">${inner}</div>`;
const fixer = {
  title: 'Your festival sent a JPEG',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">Your festival sent a JPEG.</div>`)
        + poster(260, 360, 560, [[ASIS, 0.2, 0.05, 0.6]]),
      alt: 'A night-sky film poster titled Your Film. At the top sits a gold laurel, Official Selection, Your Festival, 2026, stuck inside a hard white rectangle. Text: Your festival sent a JPEG.' },
    { html: blk(90, 108, 900, `<div class="h2">Drop it into Daphne.</div>`)
        + cap('box-ui', 160, 270, 760, 'border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(184,229,154,.16)')
        + blk(90, 1000, 900, `<div class="lead">The fixer takes out the white, in your browser. The file stays on your computer.</div>`),
      alt: 'Daphne’s clean-up panel: the festival’s laurel with its white taken out, gold on a transparent background, and a small thumbnail of the file as it came. Text: Drop it into Daphne. The fixer takes out the white, in your browser. The file stays on your computer.' },
    { html: blk(90, 108, 900, `<div class="h2">The white goes. The edges stay soft.</div>`)
        + crop('box-asis', 90, 320, 420, BOXA, 'border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.4)')
        + crop('box-clean', 570, 320, 420, BOXC, 'border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.4);background-color:#1D3550')
        + blk(90, 826, 420, `<div class="data">As it came</div>`)
        + blk(570, 826, 420, `<div class="data leafc">After, on a dark poster</div>`)
        + blk(90, 912, 900, `<div class="lead">No white fringe round the leaves. Then it’s trimmed to the laurel, with even margins.</div>`),
      alt: 'Two close-ups of the same gold leaves. As it came: on white, with the blur of a compressed JPEG. After, on a dark poster: the white gone and the edges smooth. Text: The white goes. The edges stay soft. No white fringe round the leaves. Then it’s trimmed to the laurel, with even margins.' },
    { html: blk(90, 108, 900, `<div class="h2">One ink, when the poster needs it.</div>`)
        + blk(110, 320, 400, tile(`<img src="captures/box-white.png" alt="" style="width:330px;height:${Math.round(330 * ar('box-white'))}px">`, 400, 520, 'linear-gradient(#0B1524,#1D3550 70%,#3B5670)'), '', 'data-name="white"')
        + blk(570, 320, 400, tile(`<img src="captures/box-black.png" alt="" style="width:330px;height:${Math.round(330 * ar('box-black'))}px">`, 400, 520, '#F3F6EF'), '', 'data-name="black"')
        + blk(110, 860, 400, `<div class="data">White, for dark posters</div>`)
        + blk(570, 860, 400, `<div class="data">Black, for light ones</div>`)
        + blk(90, 960, 900, `<div class="panel" style="padding:34px 40px"><div class="body">Recoloring official artwork may need the festival’s OK. If they sent a one-color version, use theirs.</div></div>`, '', 'data-name="note"'),
      alt: 'The cleaned laurel twice: in white on a dark night sky, and in black on pale paper. Labels: White, for dark posters. Black, for light ones. A note: Recoloring official artwork may need the festival’s OK. If they sent a one-color version, use theirs. Text: One ink, when the poster needs it.' },
    { html: blk(90, 108, 900, `<div class="h2">Their laurel. No box.</div>`)
        + poster(280, 270, 520, [[CLEAN, 0.21, 0.05, 0.58]])
        + blk(90, 1086, 900, `<div class="lead" ${center}>Daphne doesn’t redraw anything. <span class="paper">The festival’s art stays the festival’s.</span></div>`),
      alt: 'The night-sky poster again, the festival’s gold laurel now sitting cleanly on the sky with no white box. Text: Their laurel. No box. Daphne doesn’t redraw anything. The festival’s art stays the festival’s.' },
    { html: end('Clean up a festival file.', 'Free, in your browser, with no account.'),
      alt: endAlt('Clean up a festival file. Free, in your browser, with no account.') },
  ],
};

// ── 10 herbarium: Daphne's leaves as specimens on a plate (a light set) ──
const SPEC = (look) => L.named['spec' + look.toLowerCase().replace(/[^a-z0-9]+/g, '')];
const tape = (x, y, r) => `<i style="position:absolute;left:${x - 32}px;top:${y - 11}px;width:64px;height:22px;background:rgba(214,222,203,.78);transform:rotate(${r}deg);box-shadow:0 1px 2px rgba(18,41,30,.12)"></i>`;
// one branch, fitted to its box and centered in it, with strips of tape across the stem (at fractions of the branch)
const specimen = (look, x, y, w, h, tapes = [[0.34, 0.88, -6]]) => { const l = SPEC(look), k = Math.min(w / l.viewBox[2], h / l.viewBox[3]), iw = l.viewBox[2] * k, ih = l.viewBox[3] * k, ix = x + (w - iw) / 2, iy = y + (h - ih) / 2;
  return `<img src="${l.file}" alt="" style="position:absolute;left:${ix}px;top:${iy}px;width:${iw}px;height:${ih}px">` + tapes.map(([fx, fy, r]) => tape(ix + fx * iw, iy + fy * ih, r)).join(''); };
// a plate of four: each leaf with its number, its name and the look it comes from
function plate(items, n0) {
  return items.map(([name, look], i) => blk(90 + i * 230, 360, 210, `<div style="position:relative;width:210px;height:712px">
      <div style="position:absolute;left:0;top:0;width:210px;height:560px;border-radius:6px;background:#FBFCF8;box-shadow:0 1px 0 rgba(18,41,30,.06),0 16px 40px rgba(18,41,30,.10)"></div>
      ${specimen(look, 16, 26, 178, 508)}
      <div style="position:absolute;left:0;right:0;top:584px">
        <div class="data" style="font-size:26px">No. ${String(n0 + i).padStart(2, '0')}</div>
        <div style="font:400 40px/1.05 var(--head);margin-top:8px">${name}</div>
        <div class="data" style="font-size:26px;margin-top:8px">${look}</div></div></div>`, '', `data-name="specimen ${look}"`)).join('');
}
const plateAlt = (items) => items.map(([n, look]) => `${n} (from the look ${look})`).join(', ');
const P1 = [['Laurel', 'Classic Gold'], ['Lance', 'Black Tie'], ['Willow', 'Olive Grove'], ['Almond', 'Herbarium']];
const P2 = [['Oak', 'Old World'], ['Ivy', 'Ivy'], ['Eucalyptus', 'Eucalyptus'], ['Ginkgo', 'Ginkgo']];
const P3 = [['Fern', 'Fern Silver'], ['Palm', 'Riviera Palm'], ['Wheat', 'Harvest'], ['Lavender', 'Lavender']];
const P4 = [['Pearl', 'Pearl'], ['Plume', 'Gatsby'], ['Flame', 'Ember'], ['Diamond', 'Deco']];
const herbarium = {
  title: 'No one drew these leaves',
  light: true,
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">No one drew these leaves.</div>`)
        + blk(230, 360, 620, `<div style="position:relative;width:620px;height:860px;border-radius:8px;background:#FBFCF8;box-shadow:0 2px 0 rgba(18,41,30,.05),0 30px 70px rgba(18,41,30,.16)">
            ${specimen('Classic Gold', 60, 50, 440, 640, [[0.34, 0.88, -8], [0.3, 0.52, 7]])}
            <div style="position:absolute;right:30px;bottom:30px;width:340px;padding:20px 22px;border:1.5px solid rgba(31,92,59,.45);background:#F6F8F2">
              <div class="data" style="font-size:26px;color:var(--bay)">Daphne herbarium</div>
              <div style="font:400 40px/1.05 var(--head);margin-top:10px">No. 01, Laurel</div>
              <div class="data" style="font-size:26px;margin-top:10px">From the look Classic Gold</div></div></div>`, '', 'data-name="sheet"'),
      alt: 'A herbarium sheet on pale paper: one branch of bay leaves in deep green ink, taped down, with a label: Daphne herbarium, No. 01, Laurel, from the look Classic Gold. Text: No one drew these leaves.' },
    { html: blk(90, 108, 900, `<div class="h2">Daphne grows them.</div><div class="lead" style="margin-top:22px">Each branch sets its leaves’ length, width, bend and fold.</div>`, '', 'data-name="words"') + plate(P1, 1),
      alt: `Four branches on a plate, each with its number and the look it comes from: ${plateAlt(P1)}. Text: Daphne grows them. Each branch sets its leaves’ length, width, bend and fold.` },
    { html: blk(90, 108, 900, `<div class="h2">Not only laurel.</div>`) + plate(P2, 5),
      alt: `Four more branches: ${plateAlt(P2)}. Text: Not only laurel.` },
    { html: blk(90, 108, 900, `<div class="h2">Fronds and grasses.</div>`) + plate(P3, 9),
      alt: `Four more branches: ${plateAlt(P3)}. Text: Fronds and grasses.` },
    { html: blk(90, 108, 900, `<div class="h2">And a few no garden grows.</div>`) + plate(P4, 13),
      alt: `Four more branches, made-up plants: ${plateAlt(P4)}. Text: And a few no garden grows.` },
    { html: blk(90, 108, 900, `<div class="h2">Then it wraps them around your words.</div>`)
        + named('bayHero', 130, 420, 820)
        + blk(90, 1050, 900, `<div class="lead" ${center}>Any leaf, any ink, around what the festival gave you.</div>`),
      alt: 'A full laurel in deep green ink on pale paper, reading Official Selection, Your Festival, 2026. Text: Then it wraps them around your words. Any leaf, any ink, around what the festival gave you.' },
    { html: end('Grow yours.', '78 looks, every one drawn by code. Free, with no account.', { light: true }),
      alt: endAlt('Grow yours. 78 looks, every one drawn by code. Free, with no account.') },
  ],
};

// ── 11 announce: the lineup is out, and the card says it ──
const announcePhone = phone(`
  <div style="display:flex;align-items:center;gap:14px;padding:44px 26px 18px"><div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#3F5F86,#0B1422)"></div><div style="font:600 28px/1 var(--text);color:var(--paper)">yourfilm</div></div>
  <img src="captures/announce-photo.png" alt="" style="display:block;width:420px;height:${Math.round(420 * ar('announce-photo'))}px">
  <div style="padding:22px 26px;font:400 27px/1.32 var(--text);color:var(--paper)"><b style="font-weight:600">yourfilm</b> ${esc(F.caption)}</div>`, 420, 880);
// the three upright shapes stand on one line, the landscape one below them
const SHAPES = [['announce-story', 90, 220, 'Story 9:16'], ['announce-portrait', 335, 300, 'Portrait 4:5'], ['announce-square', 660, 330, 'Square 1:1']];
const announce = {
  title: 'The lineup is out. Say it.',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">The lineup is out. Say it.</div>`)
        + blk(330, 350, 420, announcePhone, '', 'data-name="phone"'),
      alt: `A phone showing a post from yourfilm: a card with a gold laurel, Official Selection, Your Festival, 2026, and the title Your Film, over a still of a lighthouse at night. The caption reads: ${F.caption} Text: The lineup is out. Say it.` },
    { html: blk(90, 108, 900, `<div class="h2">Four shapes, from one laurel.</div>`)
        + SHAPES.map(([n, x, w, label]) => cap(n, x, 711 - Math.round(w * ar(n)), w, 'border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.45)')
          + blk(x, 727, w, `<div class="data">${label}</div>`, '', `data-name="label ${n}"`)).join('')
        + cap('announce-landscape', 240, 820, 600, 'border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.45)')
        + blk(240, 1166, 600, `<div class="data">Landscape 16:9</div>`, '', 'data-name="label landscape"'),
      alt: 'The same announcement card in four shapes, each with the gold laurel and the title Your Film: Story 9:16, Portrait 4:5, Square 1:1 and Landscape 16:9. Text: Four shapes, from one laurel.' },
    { html: blk(90, 108, 900, `<div class="h2">Put your still behind it.</div>`)
        + cap('announce-photo', 260, 290, 560, 'border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5)')
        + blk(90, 1036, 900, `<div class="lead" ${center}>A still or your poster, darkened until the laurel reads.</div>`),
      alt: 'The portrait card over a still of a lighthouse on a cliff at night, its beam across the sky: the gold laurel, Official Selection, Your Festival, 2026, and Your Film. Text: Put your still behind it. A still or your poster, darkened until the laurel reads.' },
    { html: blk(90, 108, 900, `<div class="h2">And the first line, written for you.</div>`)
        + blk(90, 360, 900, `<div class="panel" style="padding:56px 60px"><div class="data leafc">A first line for the post</div><div class="story" style="margin-top:26px;font-size:62px">${esc(F.caption)}</div></div>`, '', 'data-name="caption"')
        + blk(90, 790, 900, `<div class="lead">It changes with what you got: a win, a premiere, a mention. <span class="paper">Make it yours, and tag the festival: they often share.</span></div>`),
      alt: `A panel labeled A first line for the post: ${F.caption} Text: And the first line, written for you. It changes with what you got: a win, a premiere, a mention. Make it yours, and tag the festival: they often share.` },
    { html: end('Post it the day it’s public.', 'Export, then Social post. No watermark, nothing added.'),
      alt: endAlt('Post it the day it’s public. Export, then Social post. No watermark, nothing added.') },
  ],
};

// ── 12 leafless: a laurel doesn't need leaves ──
const LEAVES = [[12, 46, 55], [7.5, 35, 25], [7, 23, -5], [11, 13, -30]];
const glyph = (ring, on) => { const c = on ? '#B8E59A' : 'rgba(243,246,239,.32)'; return ring
  ? `<svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="21" fill="none" stroke="${c}" stroke-width="3"/><circle cx="30" cy="30" r="15" fill="none" stroke="${c}" stroke-width="1.4"/></svg>`
  : `<svg viewBox="0 0 60 60" width="60" height="60"><g fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M27 52 C12 46 6 28 16 10"/><path d="M33 52 C48 46 54 28 44 10"/></g><g fill="${c}">${LEAVES.map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="5.6" transform="rotate(${r} ${x} ${y})"/><ellipse cx="${60 - x}" cy="${y}" rx="2.6" ry="5.6" transform="rotate(${-r} ${60 - x} ${y})"/>`).join('')}</g></svg>`; };
// the 42 festival-issued laurels in research/01: 16 with no branches, 26 with them (20 open, 4 wide, 2 joined)
const GRID = Array.from({ length: 42 }, (_, i) => i < 16);
const lookCard = (name, w, h) => { const l = LOOK[name]; return `<div style="width:${w}px;height:${h}px;border-radius:18px;background:${l.bg || '#0f1116'};display:grid;place-items:center;box-shadow:0 24px 60px rgba(0,0,0,.4)"><img src="${l.file}" alt="" style="display:block;width:${w - 30}px;height:${h - 30}px;object-fit:contain"></div>`; };
const leafless = {
  title: 'A laurel doesn’t need leaves',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">A laurel doesn’t need <span class="bk">leaves</span>.</div>`)
        + named('seal', 250, 410, 580),
      alt: 'A gold seal with no leaves at all: a double gold ring with a star at each side, reading Official Selection around the top, Your Festival in the middle and 2026 at the bottom. Text: A laurel doesn’t need leaves, with the word leaves between two green bay leaves drawn as brackets.' },
    { html: blk(90, 100, 900, `<div class="h1 leafc" style="font-size:180px;line-height:1">16 of 42</div><div class="lead" style="margin-top:30px">festival laurels we studied had no branches at all. <span class="paper">Many of the biggest festivals now use a logo badge with no wreath.</span></div>`, '', 'data-name="number"')
        + blk(150, 560, 780, `<div style="display:grid;grid-template-columns:repeat(7,60px);gap:40px 60px">${GRID.map((r) => glyph(r, r)).join('')}</div>`, '', 'data-name="grid"'),
      alt: 'Forty-two small marks in a grid: sixteen plain rings in green, then twenty-six faint wreaths. Text: 16 of 42 festival laurels we studied had no branches at all. Many of the biggest festivals now use a logo badge with no wreath.' },
    { html: blk(90, 108, 900, `<div class="h2">Seals and medals.</div>`)
        + ['Gala Seal', 'Gold Medal', 'Wax Seal', 'Notary'].map((n, i) => blk([110, 570][i % 2], [290, 730][i >> 1], 400, lookCard(n, 400, 380) + `<div class="data" style="margin-top:14px">${n}</div>`, '', `data-name="look ${n}"`)).join(''),
      alt: 'Four badges with no leaves, each reading Official Selection, Your Festival, 2026: Gala Seal, a gold double ring; Gold Medal, a scalloped gold medal; Wax Seal, a red wax seal on cream; Notary, an ink ring on cream. Text: Seals and medals.' },
    { html: blk(90, 108, 900, `<div class="h2">Marquees and tickets.</div>`)
        + ['Marquee', 'Admit One', 'Film Strip'].map((n, i) => blk(240, 290 + i * 320, 600, lookCard(n, 600, 250) + `<div class="data" style="margin-top:12px">${n}</div>`, '', `data-name="look ${n}"`)).join(''),
      alt: 'Three badges, each reading Official Selection, Your Festival, 2026: Marquee, white on a red sign; Admit One, gold on a ticket; Film Strip, black between rows of sprocket holes. Text: Marquees and tickets.' },
    { html: blk(90, 108, 900, `<div class="h2">Frames and rules.</div>`)
        + ['Première', 'Cartouche', 'Viewfinder'].map((n, i) => blk(240, 290 + i * 320, 600, lookCard(n, 600, 250) + `<div class="data" style="margin-top:12px">${n}</div>`, '', `data-name="look ${n}"`)).join(''),
      alt: 'Three more badges, each reading Official Selection, Your Festival, 2026: Première, black between double rules with stars on white; Cartouche, champagne in an oval frame; Viewfinder, white inside camera corners. Text: Frames and rules.' },
    { html: end('Ten badges, all in Daphne.', 'The same words in a seal, a marquee or a frame. Free, with no account.'),
      alt: endAlt('Ten badges, all in Daphne. The same words in a seal, a marquee or a frame. Free, with no account.') },
  ],
};

// ── 13 anatomy: what 68 laurels taught us ──
const DEEP = 'radial-gradient(ellipse 80% 65% at 40% 52%, #173524 0%, #0E2318 50%, #08140E 100%)';
// the cover: the wide hero laurel, with its parts labeled above and below it, the leader lines running through the
// open gaps at the top and bottom of the wreath so they never cross a leaf or a letter
const A = { x: 110, y: 470, w: 860 };
A.h = Math.round(A.w * aspect(L.named.hero.viewBox));
// fractions of the hero's box, measured on a render: each line of words [top, bottom], and a branch tip
const ROW = { status: [0.325, 0.381], name: [0.454, 0.567], year: [0.639, 0.701] }, TIP = [0.72, 0.1];
const O = { x: 90, y: 320 }, px = (fx) => A.x - O.x + fx * A.w, py = (fy) => A.y - O.y + fy * A.h;
const LBL = { top: 330, bottom: 1010 };
const callouts = `<svg viewBox="0 0 900 700" width="900" height="700" style="display:block" aria-hidden="true" fill="none" stroke="#B8E59A" stroke-width="2" stroke-opacity=".75">
  <path d="M440 ${LBL.top - O.y + 36} H${px(0.5)} V${py(ROW.status[0]) - 10}"/><circle cx="${px(0.5)}" cy="${py(ROW.status[0]) - 10}" r="5" fill="#B8E59A" stroke="none"/>
  <path d="M${px(TIP[0]) + 22} ${LBL.top - O.y + 92} L${px(TIP[0])} ${py(TIP[1]) - 4}"/><circle cx="${px(TIP[0])}" cy="${py(TIP[1])}" r="5" fill="#B8E59A" stroke="none"/>
  <path d="M${px(0.62)} ${py(ROW.name[1]) + 10} V${LBL.bottom - O.y - 6}"/><circle cx="${px(0.62)}" cy="${py(ROW.name[1]) + 10}" r="5" fill="#B8E59A" stroke="none"/>
  <path d="M${px(0.5)} ${py(ROW.year[1]) + 10} V${LBL.bottom - O.y + 36} H440"/><circle cx="${px(0.5)}" cy="${py(ROW.year[1]) + 10}" r="5" fill="#B8E59A" stroke="none"/></svg>`;
const part = (t, sub, x, y, w, right = false) => blk(x, y, w, `<div style="text-align:${right ? 'right' : 'left'}"><div class="data leafc">${t}</div><div class="body" style="font-size:30px;line-height:1.1;margin-top:6px">${sub}</div></div>`, '', `data-name="part ${t}"`);
const YEAR = [['Its own line, at the bottom', 28], ['After the festival’s name', 14], ['Inside the name, big', 9], ['Left off', 7], ['On the status line', 6], ['Somewhere else', 4]];
const STATUSES = ['Official Selection', 'Winner', 'Nominee', 'Finalist', 'Semi-Finalist', 'Special Mention', 'Honorable Mention', 'World Premiere'];
const anatomy = {
  title: 'Anatomy of a festival laurel',
  ground: DEEP,
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">Anatomy of a festival laurel.</div>`)
        + blk(O.x, O.y, 900, callouts, '', 'data-under data-name="callouts"')
        + named('hero', A.x, A.y, A.w)
        + part('Status', 'What you got', 110, LBL.top, 320, true)
        + part('Branches', 'Two, open at the top', 700, LBL.top, 290)
        + part('Year', 'On its own line', 110, LBL.bottom, 320, true)
        + part('Festival', 'The biggest line', Math.round(A.x + 0.62 * A.w) + 20, LBL.bottom, 300)
        + blk(90, 1160, 900, `<div class="lead">What 68 festival laurels taught us.</div>`),
      alt: 'A gold laurel, Official Selection, Your Festival, 2026, with its parts marked and labeled. Branches: two, open at the top. Status: what you got. Festival: the biggest line. Year: on its own line. Text: Anatomy of a festival laurel. What 68 festival laurels taught us.' },
    { html: blk(90, 108, 900, `<div class="h2">The status sits on top: small, in capitals, spaced wide.</div>`)
        + blk(90, 400, 900, `<div>${STATUSES.map((s, i) => `<div style="font:500 34px/1 var(--data);letter-spacing:.24em;text-transform:uppercase;padding:22px 0;${i ? 'border-top:1px solid var(--rule)' : ''}${i ? ';color:var(--dim)' : ';color:var(--leaf)'}">${s}</div>`).join('')}</div>`, '', 'data-name="statuses"')
        + blk(90, 1150, 900, `<div class="lead paper">Use the festival’s exact words.</div>`),
      alt: `Eight statuses in spaced capitals, one per line: ${STATUSES.join(', ')}. Text: The status sits on top: small, in capitals, spaced wide. Use the festival’s exact words.` },
    { html: blk(90, 108, 900, `<div class="h2">The biggest line is the festival.</div><div class="lead" style="margin-top:22px">Unless it’s a win: then the award can take the middle.</div>`, '', 'data-name="words"')
        + laurel('hero', 90, 540, 420) + laurel('award', 570, 540, 420)
        + blk(90, 830, 420, `<div class="data" ${center}>A selection: the festival leads</div>`)
        + blk(570, 830, 420, `<div class="data leafc" ${center}>A win: the award leads</div>`),
      alt: 'Two gold laurels. A selection: Official Selection, Your Festival, 2026, with the festival’s name biggest. A win: Winner, Best Short Film, Your Festival, 2026, with the award biggest. Text: The biggest line is the festival. Unless it’s a win: then the award can take the middle.' },
    { html: blk(90, 108, 900, `<div class="h2">The year gets its own line, at the bottom.</div><div class="lead" style="margin-top:22px">On 28 of the 68 laurels we studied.</div>`, '', 'data-name="words"')
        + blk(90, 470, 900, `<div>${YEAR.map(([t, n], i) => `<div style="display:grid;grid-template-columns:330px 1fr 60px;align-items:center;gap:20px;padding:20px 0;${i ? 'border-top:1px solid var(--rule)' : ''}"><div class="data" style="${i ? '' : 'color:var(--leaf)'}">${t}</div><div style="height:30px;width:${n * 16}px;border-radius:4px;background:${i ? 'rgba(243,246,239,.28)' : 'var(--leaf)'}"></div><div class="data" style="text-align:right;${i ? '' : 'color:var(--leaf)'}">${n}</div></div>`).join('')}</div>`, '', 'data-name="chart"'),
      alt: `A bar chart of where the year goes on 68 festival laurels: ${YEAR.map(([t, n]) => `${t.toLowerCase()}, ${n}`).join('; ')}. Text: The year gets its own line, at the bottom. On 28 of the 68 laurels we studied.` },
    { html: blk(90, 108, 900, `<div class="h2">One award, one laurel.</div><div class="lead" style="margin-top:22px">We never saw two awards in one wreath. A film that wins twice shows two laurels.</div>`, '', 'data-name="words"')
        + [['Best Short Film', 90], ['Audience Award', 570]].map(([a, x]) => { const p = PACK(a, 'color'); return blk(x, 600, 420, `<img src="${p.file}" alt="" style="display:block;width:420px;height:${Math.round(420 * aspect(p.viewBox))}px">`, '', `data-name="award ${a}"`); }).join(''),
      alt: 'Two gold award laurels side by side: Winner, Best Short Film, Your Festival, 2026, and Winner, Audience Award, Your Festival, 2026. Text: One award, one laurel. We never saw two awards in one wreath. A film that wins twice shows two laurels.' },
    { html: end('Daphne lays it out for you.', '18 layouts that fit your words, and keep the small lines readable.'),
      alt: endAlt('Daphne lays it out for you. 18 layouts that fit your words, and keep the small lines readable.') },
  ],
};

// ── 14 endcard: the motion end card, frame by frame ──
const CINEMA = 'radial-gradient(ellipse 80% 60% at 50% 48%, #0F1D16 0%, #070E0A 60%, #030605 100%)';
const tc = (t) => { const f = Math.round(t * 30), s = Math.floor(f / 30); return `00:00:${String(s).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`; };
const frame = (i, x, y, w) => cap('end-' + i, x, y, w, 'border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(243,246,239,.08)');
const MOMENTS = [[1, 'The leaves grow in from the stem.', 'Each branch grows from its stalk to its tip.'], [3, 'Then the words rise in.', 'One line after another, once the leaves have made room.'], [4, 'Then a shimmer crosses the gold.', 'Once, before it settles.']];
const endcard = {
  title: 'The last four seconds of your trailer',
  ground: CINEMA,
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">The last four seconds of your trailer.</div>`)
        + frame(5, 90, 360, 900)
        + [1, 2, 3, 4].map((i, k) => frame(i, 90 + k * 230, 920, 210) + blk(90 + k * 230, 1044, 210, `<div class="data" style="font-size:26px">${(F.frames[i]).toFixed(1)} s</div>`, '', `data-name="tc ${i}"`)).join(''),
      alt: 'A black trailer frame with a gold laurel in the middle: Official Selection, Your Festival, 2026. Below, four small frames from the first seconds: the branches growing in, then the words rising, then a shimmer. Text: The last four seconds of your trailer.' },
    ...MOMENTS.map(([i, h, s]) => ({
      html: blk(90, 100, 900, `<div class="data leafc">${tc(F.frames[i])}</div><div class="h2" style="margin-top:14px">${h}</div>`, '', 'data-name="moment"')
        + frame(i, 90, 420, 900)
        + blk(90, 990, 900, `<div class="lead">${s}</div>`),
      alt: `A trailer frame at ${tc(F.frames[i])}: ${['the two gold branches grown, with no words yet', 'the gold laurel with its words rising into place', 'the gold laurel with a shimmer of light crossing its leaves'][MOMENTS.findIndex((m) => m[0] === i)]}. Text: ${h} ${s}` })),
    { html: blk(90, 108, 900, `<div class="h2">For your editor.</div>`)
        + blk(90, 300, 900, list(['MP4 video', 'PNG sequence, transparent', 'Animated SVG']), '', 'data-name="formats"')
        + blk(90, 760, 900, `<div class="data leafc">Frames</div><div class="lead paper" style="margin-top:14px">HD and 4K, square, portrait and vertical.</div><div class="data" style="margin-top:40px">30 fps · 120 frames · 4 seconds</div>`, '', 'data-name="frames"'),
      alt: 'Text: For your editor. MP4 video. PNG sequence, transparent. Animated SVG. Frames: HD and 4K, square, portrait and vertical. 30 fps, 120 frames, 4 seconds.' },
    { html: end('End on it.', 'Motion, in Daphne. Free, with no watermark.'),
      alt: endAlt('End on it. Motion, in Daphne. Free, with no watermark.') },
  ],
};

// ── 15 link: the whole laurel in a link ──
const LINK = 'pitch.dog/daphne/' + F.link;
// the link's own characters, set in rings like a wreath's branches, around the laurel they describe
function linkWreath(size) {
  const c = size / 2, rings = [214, 246, 278, 310, 342], fs = 26, adv = fs * 0.6;
  let at = 0, defs = '', text = '';
  rings.forEach((r, k) => {
    for (const side of [0, 1]) {
      const a0 = side ? -68 : 112, a1 = side ? 68 : 248, rad = (d) => (d * Math.PI) / 180;
      const p = (d) => `${(c + r * Math.cos(rad(d))).toFixed(1)} ${(c + r * Math.sin(rad(d))).toFixed(1)}`;
      const id = `lk${k}${side}`, len = (r * rad(a1 - a0)), n = Math.floor(len / adv);
      // the left branch runs up from the bottom; the right one runs down, so the letters on both face out
      defs += `<path id="${id}" d="M${side ? p(a0) : p(a0)} A${r} ${r} 0 0 1 ${p(a1)}"/>`;
      text += `<text font-family="PD Eyebrow" font-size="${fs}px" fill="#B8E59A" fill-opacity="${(0.95 - k * 0.15).toFixed(2)}"><textPath href="#${id}">${esc(LINK.slice(at, at + n))}</textPath></text>`;
      at += n;
    }
  });
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><defs>${defs}</defs>${text}</svg>`;
}
const link = {
  title: 'Send your designer a link, not a file',
  slides: [
    { count: false,
      html: blk(90, 100, 900, `<div class="h1">Send your designer a link, not a file.</div>`)
        + blk(170, 400, 740, `<div style="position:relative;width:740px;height:740px">${linkWreath(740)}<img src="${L.named.hero.file}" alt="" style="position:absolute;left:${370 - 180}px;top:${Math.round(370 - 180 * aspect(L.named.hero.viewBox))}px;width:360px;height:${Math.round(360 * aspect(L.named.hero.viewBox))}px"></div>`, '', 'data-name="wreath"'),
      alt: 'The characters of a long web link, pitch.dog/daphne/#l= and a run of letters and numbers, set in green rings like the two branches of a wreath, around a small gold laurel: Official Selection, Your Festival, 2026. Text: Send your designer a link, not a file.' },
    { html: blk(90, 108, 900, `<div class="h2">Everything is in it.</div><div class="lead" style="margin-top:18px">The words, the look, the layout, the colors.</div>`, '', 'data-name="words"')
        + blk(90, 300, 900, `<div class="panel" style="padding:24px 26px"><div style="font:500 26px/1.3 var(--data);letter-spacing:-.02em;word-break:break-all;color:rgba(184,229,154,.72)"><span class="paper">pitch.dog/daphne/</span>${esc(F.link)}</div></div>`, '', 'data-name="the link"'),
      alt: `The whole share link for the laurel, ${LINK.length} characters long: pitch.dog/daphne/#l= followed by letters, numbers and dashes. Text: Everything is in it. The words, the look, the layout, the colors.` },
    { html: blk(90, 108, 900, `<div class="h2">They open it, and it’s your laurel.</div><div class="lead" style="margin-top:22px">Ready to change. Nothing to download, no account to make.</div>`, '', 'data-name="words"')
        + blk(110, 480, 860, browser(heroImg(520), esc(LINK.slice(0, 34)) + '…', 860, 600), '', 'data-name="browser"'),
      alt: 'A browser window opened at the link, pitch.dog/daphne/#l=…, showing the gold laurel: Official Selection, Your Festival, 2026. Text: They open it, and it’s your laurel. Ready to change. Nothing to download, no account to make.' },
    { html: blk(90, 330, 900, `<div class="h1" style="font-size:150px;line-height:1.02" ${center}>The <span class="bk">link</span><br>is the laurel.</div>`, '', 'data-name="line"')
        + blk(140, 760, 800, `<div class="lead" ${center}>There’s no copy on our server to point to. Logos and posters you add stay on your device, so a link never carries them.</div>`),
      alt: 'Text, large: The link is the laurel, with the word link between two green bay leaves drawn as brackets. Below: There’s no copy on our server to point to. Logos and posters you add stay on your device, so a link never carries them.' },
    { html: end('Make one. Send the link.', 'Share link, top right in Daphne. Free, with no account.'),
      alt: endAlt('Make one. Send the link. Share link, top right in Daphne. Free, with no account.') },
  ],
};

// in posting order (finish.py numbers the folders 06 to 15)
export const MORE = { read, tonight, films, fixer, herbarium, announce, leafless, anatomy, endcard, link };
