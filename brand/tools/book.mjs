// Builds brand/index.html, the brand book: Daphne's story told in her own leaves,
// then the system. Self-contained (fonts, images and SVG inlined), so the one file
// can be opened from disk, sent, or published as it is.
//   node brand/tools/book.mjs            (after build.mjs and render.mjs)
// Also writes a copy without the document wrapper to $BOOK_FRAGMENT, if set.
import { readFileSync, writeFileSync } from 'node:fs';
import { COLORS as C, lockup, symbol, symbolSmall, leafBracket, HERO_LEAF, LOCKUP, f } from './mark.mjs';
import { revealSVG, revealScript } from './reveal.mjs';

const root = new URL('../', import.meta.url);
const bin = (rel) => readFileSync(new URL(rel, root));
const data = (rel, type) => `data:${type};base64,${bin(rel).toString('base64')}`;
const font = (file) => data(`tools/book/${file}`, 'font/woff2');
const png = (rel) => data(rel, 'image/png');

// ── marks, inline ──────────────────────────────────────────────────────────
const HK = lockup({ leaf: HERO_LEAF }), LK = lockup(), SY = symbol(), SM = symbolSmall();
const box = (b, k = 0) => [b[0] - k, b[1] - k, b[2] - b[0] + 2 * k, b[3] - b[1] + 2 * k].map(f).join(' ');
const logoSVG = (K, word, leaf, extra = '') => `<svg viewBox="${box(K.box, 10)}" role="img" aria-label="Daphne"${extra}><g fill="${word}">${K.word}</g><g fill="${leaf}">${K.leaves}</g></svg>`;
const symSVG = (S, word, leaf, label = 'Daphne') => `<svg viewBox="${box(S.box, 10)}" role="img" aria-label="${label}"><g fill="${word}">${S.word}</g><g fill="${leaf}">${S.leaves}</g></svg>`;
const tileSVG = (S, k, rx = 0, cls = '') => { const h = Math.max(S.box[3] - S.box[1], S.box[2] - S.box[0]) / k, x0 = (S.box[0] + S.box[2]) / 2 - h / 2, y0 = S.cy - h / 2;
  return `<svg class="${cls}" viewBox="${[x0, y0, h, h].map(f).join(' ')}" role="img" aria-label="Daphne"><rect x="${f(x0)}" y="${f(y0)}" width="${f(h)}" height="${f(h)}" rx="${f(rx * h)}" fill="${C.grove}"/><g fill="${C.paper}">${S.word}</g><g fill="${C.newLeaf}">${S.leaves}</g></svg>`; };

// the leaf brackets for display type (see README, The leaf brackets)
const BL = leafBracket({ side: -1, x0: 0 }), BR = leafBracket({ side: 1, x0: 0 });
const brk = (B) => `<svg class="lb" viewBox="${f(B.bbox[0] - 4)} -940 ${f(B.bbox[2] - B.bbox[0] + 8)} 1240" aria-hidden="true"><path fill-rule="evenodd" d="${B.d}"/><path d="${B.stalk}"/></svg>`;
const held = (words) => `<span class="held">${brk(BL)}${words}${brk(BR)}</span>`;

// anatomy: the hero logo with its parts named
function anatomy() {
  const L = HK.L, R = HK.R, vb = [HK.box[0] - 1250, HK.box[1] - 200, HK.box[2] - HK.box[0] + 1250 + 900, HK.box[3] - HK.box[1] + 440];
  const tip = L.P(1), mid = L.P(0.55), [nx, ny] = L.frame(0.55), vein = L.P(0.42), stalkEnd = L.stalkEnd, rTip = R.P(0.75), [rnx, rny] = R.frame(0.75);
  const lab = (x, y, tx, ty, text, anchor = 'end') => `<path d="M${f(x)} ${f(y)}L${f(tx)} ${f(ty)}" class="ld"/><circle cx="${f(x)}" cy="${f(y)}" r="9" class="ldot"/><text x="${f(tx + (anchor === 'end' ? -16 : 16))}" y="${f(ty + 28)}" text-anchor="${anchor}" class="lt">${text}</text>`;
  const gw = LOCKUP.gapL, wordW = HK.wordW;
  return `<svg viewBox="${vb.map(f).join(' ')}" class="anat" role="img" aria-label="The logo's parts: tip, midrib, side veins, stalk, wavy margin, and the gaps to the name">
  <g fill="${C.grove}">${HK.word}</g><g fill="${C.bay}">${HK.leaves}</g>
  ${lab(tip[0], tip[1], tip[0] - 300, tip[1] - 40, 'tip')}
  ${lab(mid[0] + nx * 4, mid[1] + ny * 4, mid[0] - 330, mid[1] - 120, 'hairline midrib')}
  ${lab(vein[0] + nx * 52, vein[1] + ny * 52, vein[0] - 330, vein[1] + 90, 'veins (hero only)')}
  ${lab(stalkEnd[0], stalkEnd[1], stalkEnd[0] - 330, stalkEnd[1] + 60, 'stalk, bent in')}
  ${lab(rTip[0] + rnx * 70, rTip[1] + rny * 70, rTip[0] + 300, rTip[1] - 80, 'wavy margin', 'start')}
  <path d="M${f(-gw)} 340H0" class="gap"/><text x="${f(-gw / 2)}" y="440" text-anchor="middle" class="lt">85</text>
  <path d="M${f(wordW)} 340H${f(wordW + LOCKUP.gapR)}" class="gap"/><text x="${f(wordW + LOCKUP.gapR / 2)}" y="440" text-anchor="middle" class="lt">66</text>
  </svg>`;
}

// the story's leaf, for the canvas: a single bay leaf pointing up, base at 0,0
const SL = leafBracket({ side: 1, x0: 0, yTop: -500, yBot: 0, sag: 26, W: 150, stalk: 0.1, stalkCurl: 0.4, slit: 0.07, wave: 0.03 });
// the hero logo's letters, one path each, so the name can rise a letter at a time
const LETTERS = [...HK.word.matchAll(/<path transform="translate\(([-\d.]+) 0\)" d="([^"]+)"\/>/g)].map((m) => [+m[1], m[2]]);

// ── the page ───────────────────────────────────────────────────────────────
const STORY = [
  'Daphne was a river nymph who wanted to belong to no one.',
  'When a god chased her, she begged to be changed. Her arms became branches. Her hair became leaves.',
  'She became the first laurel tree. Her heart, the story goes, still beat under the bark.',
  'The god wore her leaves as a crown. Since then, laurels have gone to the poets, athletes and artists who were chosen.',
  'Every laurel since is hers. She still belongs to no one, so now she’s free to every filmmaker who’s earned one.',
];

const page = `<title>Daphne Brand Book</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Daphne's brand: the story, the logo, color, type, motion and words.">
<style>
@font-face { font-family: "PD Head"; src: url("${font('pd-head.sub.woff2')}") format("woff2"); font-weight: 265 900; font-display: block; }
@font-face { font-family: "PD Body Alt"; src: url("${font('pd-body-alt-roman.sub.woff2')}") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "PD Body"; src: url("${font('pd-body-roman.sub.woff2')}") format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "PD Eyebrow"; src: url("${font('pd-eyebrow.sub.woff2')}") format("woff2"); font-weight: 500; font-display: swap; }
/* Layout: a story told full-bleed over a night grove, like a film's subtitles; then the system, one quiet chapter after another on the same ground. */
:root {
  --grove: ${C.grove}; --deep: ${C.groveDeep}; --paper: ${C.paper}; --leaf: ${C.newLeaf}; --bay: ${C.bay}; --bloom: ${C.bloom};
  --mist: rgba(243, 246, 239, .66); --hair: rgba(184, 229, 154, .16); --plate: #18342A;
  --display: "PD Head", Georgia, serif; --lead: "PD Body Alt", system-ui, sans-serif; --text: "PD Body", system-ui, sans-serif; --data: "PD Eyebrow", ui-monospace, monospace;
  --gut: max(16px, env(safe-area-inset-left, 0px)); --gutR: max(16px, env(safe-area-inset-right, 0px));
  color-scheme: dark;
}
html { background: var(--deep); }
body { background: var(--grove); color: var(--paper); font: 400 17px/1.55 var(--text); -webkit-font-smoothing: antialiased; }
::selection { background: var(--leaf); color: var(--grove); }
a { color: var(--leaf); text-underline-offset: .2em; }
:focus-visible { outline: 2px solid var(--leaf); outline-offset: 3px; }
.wrap { max-width: 1120px; margin: 0 auto; padding-left: calc(var(--gut) + 8px); padding-right: calc(var(--gutR) + 8px); }

/* the story: one sticky frame, scrolled like a film, with its lines set as subtitles */
.story { position: relative; background: var(--deep); }
.story.live { height: 720vh; height: 720svh; }
.stage { position: relative; }
.live .stage { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; }
.stage canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.shade { position: absolute; inset: auto 0 0 0; height: 40%; background: linear-gradient(to top, rgba(8, 20, 14, .8), rgba(8, 20, 14, 0)); pointer-events: none; }
.top { position: absolute; top: 0; left: 0; right: 0; z-index: 2; display: flex; justify-content: space-between; gap: 16px; padding: calc(env(safe-area-inset-top, 0px) + 22px) calc(var(--gutR) + 8px) 0 calc(var(--gut) + 8px); font: 500 11.5px/1.2 var(--data); letter-spacing: .1em; text-transform: uppercase; color: var(--mist); }
.top a { color: inherit; text-decoration: none; }
.top a:hover { color: var(--paper); }
.caps { display: grid; gap: 28px; padding: 140px var(--gutR) 120px var(--gut); }
.cap { margin: 0 auto; max-width: 28ch; text-align: center; font: 300 clamp(24px, 3.1vw, 42px)/1.26 var(--display); font-variation-settings: "wght" 300; color: var(--paper); text-wrap: balance; text-shadow: 0 1px 26px rgba(8, 20, 14, .95), 0 0 2px rgba(8, 20, 14, .6); }
.cap.end { display: grid; gap: 14px; justify-items: center; max-width: none; }
.cap.end .tag { font: 400 clamp(19px, 2vw, 26px)/1.3 var(--lead); margin: 0; text-wrap: balance; }
.cap.end .url { font: 500 13px var(--data); letter-spacing: .08em; color: var(--leaf); }
.live .caps { position: absolute; inset: auto 0 max(10vh, 60px) 0; padding: 0 var(--gutR) 0 var(--gut); display: grid; }
.live .cap { grid-area: 1 / 1; align-self: end; opacity: 0; will-change: opacity, transform; }
.live .cap.end { position: absolute; left: 0; right: 0; bottom: auto; top: 70%; }
.hint { display: none; }
.live .hint { display: block; position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%); font: 500 10.5px var(--data); letter-spacing: .16em; text-transform: uppercase; color: var(--mist); }

/* chapters */
main { background: var(--grove); }
.ch { padding-block: clamp(72px, 10vw, 136px) 0; }
.ch:last-child { padding-bottom: clamp(72px, 10vw, 136px); }
.eyebrow { font: 500 12px/1.2 var(--data); letter-spacing: .1em; text-transform: uppercase; color: var(--leaf); margin: 0 0 18px; }
h2 { font: 400 clamp(34px, 4.6vw, 60px)/1.04 var(--display); font-variation-settings: "wght" 400; margin: 0 0 22px; max-width: 18ch; text-wrap: balance; letter-spacing: -.01em; }
h3 { font: 500 22px/1.2 var(--display); font-variation-settings: "wght" 500; margin: 0 0 8px; }
.lede { font: 400 clamp(19px, 1.8vw, 23px)/1.45 var(--lead); color: var(--paper); max-width: 40ch; margin: 0 0 28px; text-wrap: pretty; }
p { max-width: 62ch; text-wrap: pretty; }
.mist { color: var(--mist); }
.data { font: 500 13px/1.4 var(--data); letter-spacing: .04em; color: var(--mist); }
.grid { display: grid; gap: 20px; }
.g2 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
.g3 { grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
.plate { border-radius: 6px; padding: clamp(24px, 4vw, 56px); display: grid; place-items: center; min-width: 0; }
.plate.dark { background: var(--deep); }
.plate.light { background: var(--paper); color: var(--grove); }
.plate.white { background: #fff; color: #000; }
.plate svg:not(.lb), .plate img { width: 100%; height: auto; display: block; }
figure { margin: 0; display: grid; gap: 10px; min-width: 0; }
figcaption { font: 500 12.5px/1.45 var(--data); letter-spacing: .03em; color: var(--mist); }
.rules { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 16px; max-width: 70ch; }
.rules li { padding-left: 22px; position: relative; }
.rules li::before { content: ""; position: absolute; left: 0; top: .62em; width: 9px; height: 9px; border-radius: 50% 0; background: var(--leaf); transform: rotate(-45deg); }
.rules b { font-weight: 600; }

/* the idea */
.idea .plate { padding: clamp(36px, 8vw, 110px) clamp(20px, 6vw, 90px); }

/* anatomy: on a phone it keeps a readable size and scrolls sideways */
.anat-wrap { overflow-x: auto; place-items: stretch; }
.anat-wrap > div { min-width: 760px; }
.anat { width: 100%; height: auto; }
.anat .ld { stroke: ${C.bay}; stroke-width: 4; fill: none; }
.anat .ldot { fill: var(--paper); stroke: ${C.bay}; stroke-width: 4; }
.anat .lt { font: 500 84px var(--data); fill: ${C.grove}; letter-spacing: .02em; }
.anat .gap { stroke: ${C.bloom}; stroke-width: 10; }

/* sizes */
.sizes { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 28px; }
.sizes figure { justify-items: start; }

/* don'ts */
.dont .plate { aspect-ratio: 16 / 9; max-width: 100%; position: relative; overflow: hidden; }
.dont figcaption b { color: var(--paper); font-weight: 500; }

/* symbol */
.avatar { border-radius: 50%; width: min(100%, 260px); height: auto; display: block; }
.appicon { border-radius: 22.5%; width: min(100%, 180px); height: auto; display: block; }
.tab { display: flex; align-items: center; gap: 10px; background: #202124; color: #e8eaed; border-radius: 10px 10px 0 0; padding: 10px 14px; font: 13px system-ui, sans-serif; max-width: 320px; }
.tab svg { width: 16px; height: 16px; flex: none; }
.tiny { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }

/* color */
.chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 14px; }
.chip { border-radius: 6px; padding: 16px; min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--hair); }
.chip b { font: 500 22px/1.1 var(--display); font-variation-settings: "wght" 500; }
.chip .data { color: inherit; opacity: .8; }
.chip small { font: 400 14px/1.4 var(--text); opacity: .86; }
.contrast { overflow-x: auto; margin-top: 24px; }
table { border-collapse: collapse; font: 500 13px/1.4 var(--data); letter-spacing: .03em; min-width: 520px; }
td, th { text-align: left; padding: 10px 18px 10px 0; border-bottom: 1px solid var(--hair); font-variant-numeric: tabular-nums; }
th { color: var(--mist); font-weight: 500; }
.sw { display: inline-block; width: 12px; height: 12px; border-radius: 2px; vertical-align: -1px; margin-right: 8px; border: 1px solid var(--hair); }

/* type */
.spec { display: grid; gap: 34px; }
.spec .s { border-top: 1px solid var(--hair); padding-top: 16px; display: grid; grid-template-columns: minmax(0, 180px) minmax(0, 1fr); gap: 20px; }
.spec .s > .data { padding-top: 6px; }
.s-head { font: 400 clamp(36px, 5vw, 68px)/1.04 var(--display); font-variation-settings: "wght" 400; letter-spacing: -.01em; }
.s-lead { font: 400 clamp(20px, 2vw, 26px)/1.35 var(--lead); }
.s-text { font: 400 17px/1.55 var(--text); max-width: 56ch; }
.s-data { font: 500 15px/1.5 var(--data); letter-spacing: .05em; color: var(--leaf); }
@media (max-width: 600px) { .spec .s { grid-template-columns: 1fr; gap: 6px; } }

/* leaf brackets */
.held { white-space: nowrap; color: inherit; }
.lb { height: 1.24em; width: auto; vertical-align: -.30em; fill: var(--leaf); }
.held .lb:first-child { margin-right: .04em; }
.held .lb:last-child { margin-left: .02em; }
.plate.light .lb { fill: var(--bay); }
.heads { display: grid; gap: 20px; }
.heads .plate { place-items: start; }
.heads .h { font: 400 clamp(30px, 4.4vw, 56px)/1.15 var(--display); font-variation-settings: "wght" 400; letter-spacing: -.01em; text-wrap: balance; }

/* laurels */
.laurels { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 16px; }
.laurels figure { background: var(--deep); border-radius: 6px; padding: 18px; }
.laurels img { width: 100%; height: auto; }

/* motion */
.reveal { background: var(--deep); border-radius: 6px; padding: clamp(28px, 6vw, 80px); display: grid; gap: 22px; justify-items: center; }
.reveal svg { width: min(100%, 760px); height: auto; }
.btn { font: 500 13px var(--data); letter-spacing: .06em; text-transform: uppercase; color: var(--paper); background: none; border: 1px solid var(--leaf); border-radius: 4px; padding: 9px 16px; cursor: pointer; }
.btn:hover { background: rgba(184, 229, 154, .12); }
.beats-table { overflow-x: auto; }

/* words */
.words dl { display: grid; grid-template-columns: minmax(0, 170px) minmax(0, 1fr); gap: 0; margin: 0; max-width: 900px; }
.words dt, .words dd { border-top: 1px solid var(--hair); padding: 16px 0; margin: 0; }
.words dt { font: 500 12px/1.6 var(--data); letter-spacing: .08em; text-transform: uppercase; color: var(--leaf); padding-right: 16px; }
.words dd { font: 400 18px/1.5 var(--lead); }
@media (max-width: 600px) { .words dl { grid-template-columns: 1fr; } .words dd { border-top: 0; padding-top: 0; } }

/* applications */
.apps img { width: 100%; height: auto; display: block; border-radius: 6px; }
.files { overflow-x: auto; }
.files table { min-width: 560px; }
footer { padding-block: 40px 56px; color: var(--mist); font: 500 12px var(--data); letter-spacing: .06em; }

@media (prefers-reduced-motion: reduce) { .hint { display: none; } }
/* the stamped laurel sits whole inside its 16:9 plate */
.dont .stamp { padding: 12px; }
.dont .stamp svg { width: auto; height: 100%; max-width: 100%; }
/* phones: tables wrap instead of running off the side */
@media (max-width: 600px) { .contrast table, .beats-table table, .files table { min-width: 0; width: 100%; } td, th { padding-right: 12px; vertical-align: top; } }
</style>

<section class="story" aria-label="Daphne’s story">
  <div class="stage"><canvas id="grove" aria-hidden="true"></canvas><div class="shade"></div>
    <div class="top"><span>Daphne</span><a href="#system">The brand book ↓</a></div>
    <div class="caps">
${STORY.map((s) => `      <p class="cap">${s}</p>`).join('\n')}
    </div>
    <div class="cap end"><p class="tag">Make festival laurels for your film. It’s free.</p><div class="url">pitch.dog/daphne</div></div>
    <div class="hint">Scroll</div>
  </div>
</section>

<main id="system">
<section class="ch idea"><div class="wrap">
  <p class="eyebrow">The idea</p>
  <h2>A laurel is two leaves around a name.</h2>
  <p class="lede">Strip away the gold and the ceremony, and that’s what a festival laurel does: it holds a film’s name between two branches and says someone chose it. So our logo holds Daphne’s name inside the leaves she became.</p>
  <div class="plate dark">${logoSVG(HK, C.paper, C.newLeaf)}</div>
  <p class="mist" style="margin-top:22px">The leaves are brackets, so they can hold anything worth honoring: ${held('your film')}, ${held('Official Selection')}, ${held('free')}. The logo shows the whole job in one shape.</p>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">The logo</p>
  <h2>Her name, held in two bay leaves.</h2>
  <p class="lede">The name is PD Head at 400, light enough to feel classical. Each leaf is a bay leaf on a curved spine, slightly lopsided, with a wavy margin, a hairline midrib and a stalk that bends in under the name.</p>
  <div class="plate light anat-wrap"><div>${anatomy()}</div></div>
  <div class="grid g2" style="margin-top:20px">
    <figure><div class="plate dark">${logoSVG(LK, C.paper, C.newLeaf)}</div><figcaption>On Grove: Paper name, New leaf leaves. daphne-logo-on-dark.svg</figcaption></figure>
    <figure><div class="plate light">${logoSVG(LK, C.grove, C.bay)}</div><figcaption>On Paper or white: Grove name, Bay leaves. daphne-logo-on-light.svg</figcaption></figure>
    <figure><div class="plate white">${logoSVG(LK, '#000', '#000')}</div><figcaption>One color, where two aren’t possible. daphne-logo-black.svg, -white.svg, -mono.svg</figcaption></figure>
    <figure><div class="plate dark">${logoSVG(HK, C.paper, C.newLeaf)}</div><figcaption>Hero, 400 px wide and up: the leaves carry their veins. daphne-logo-hero-on-dark.svg</figcaption></figure>
  </div>
  <ul class="rules">
    <li><b>Clear space:</b> one leaf’s width on every side, about a fifth of the logo’s height.</li>
    <li><b>Smallest:</b> 96 px wide on screen, 20 mm in print. Smaller than that, the leaves read as plain parentheses, so use the symbol.</li>
    <li><b>The gaps are optical:</b> 85 units to the D’s flat side, 66 to the e’s round one.</li>
  </ul>
  <div class="sizes" style="margin-top:28px">
    <figure><div style="width:240px">${logoSVG(LK, C.paper, C.newLeaf)}</div><figcaption>240 px</figcaption></figure>
    <figure><div style="width:140px">${logoSVG(LK, C.paper, C.newLeaf)}</div><figcaption>140 px</figcaption></figure>
    <figure><div style="width:96px">${logoSVG(LK, C.paper, C.newLeaf)}</div><figcaption>96 px, the floor</figcaption></figure>
  </div>
  <h3 style="margin-top:56px">Don’t</h3>
  <div class="grid g3 dont" style="margin-top:14px">
    <figure><div class="plate dark"><svg viewBox="${box(LK.box, 10)}" role="img" aria-label="Gold leaves, wrong"><defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d27a"/><stop offset="1" stop-color="#9a6b1f"/></linearGradient></defs><g fill="${C.paper}">${LK.word}</g><g fill="url(#dg)">${LK.leaves}</g></svg></div><figcaption><b>Gold leaves.</b> Gold belongs to the laurels people make.</figcaption></figure>
    <figure><div class="plate dark"><svg viewBox="${box(LK.box, 10)}" role="img" aria-label="Typed parentheses, wrong"><text x="${f(LK.box[0] + 40)}" y="0" fill="${C.paper}" style="font: 400 1000px var(--display); font-variation-settings: 'wght' 400">(Daphne)</text></svg></div><figcaption><b>Typed parentheses.</b> The leaves are the logo.</figcaption></figure>
    <figure><div class="plate dark"><svg viewBox="${box(LK.box, 10)}" style="transform:scale(1,.55)" role="img" aria-label="Stretched, wrong"><g fill="${C.paper}">${LK.word}</g><g fill="${C.newLeaf}">${LK.leaves}</g></svg></div><figcaption><b>Stretched, outlined or shadowed.</b> Scale it whole.</figcaption></figure>
    <figure><div class="plate dark stamp"><svg viewBox="0 0 520 584" role="img" aria-label="A laurel with the Daphne logo stamped on it, wrong"><image href="${png('laurels/classic-gold.png')}" width="520" height="584"/><svg x="135" y="440" width="250" height="${f(250 * (LK.box[3] - LK.box[1] + 20) / (LK.box[2] - LK.box[0] + 20))}" viewBox="${box(LK.box, 10)}"><g fill="${C.paper}">${LK.word}</g><g fill="${C.newLeaf}">${LK.leaves}</g></svg></svg></div><figcaption><b>On someone’s laurel.</b> No watermark, ever.</figcaption></figure>
    <figure><div class="plate dark"><svg viewBox="${box(LK.box, 10)}" role="img" aria-label="Bloom leaves, wrong"><g fill="${C.paper}">${LK.word}</g><g fill="${C.bloom}">${LK.leaves}</g></svg></div><figcaption><b>Bloom leaves.</b> Bloom is used once, and never on the logo.</figcaption></figure>
    <figure><div class="plate dark"><svg viewBox="${box(LK.box, 10)}" role="img" aria-label="Name alone, wrong"><g fill="${C.paper}">${LK.word}</g></svg></div><figcaption><b>The name without its leaves.</b> In type, it travels with the tagline instead.</figcaption></figure>
  </div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">The symbol</p>
  <h2>(D), for anywhere square.</h2>
  <p class="lede">A heavier D between fuller leaves whose stalks nearly meet under the letter, like a wreath’s crossed stems. Avatars, app icons, the browser tab.</p>
  <div class="grid g3" style="align-items:end">
    <figure>${tileSVG(SY, 0.64, 0, 'avatar')}<figcaption>Profile picture, cropped to a circle. daphne-avatar.svg, 1080 and 400 px PNGs</figcaption></figure>
    <figure>${tileSVG(SY, 0.66, 0, 'appicon')}<figcaption>App icon. daphne-app-icon.svg, 1024 px PNG</figcaption></figure>
    <figure><div class="plate light" style="padding:36px">${symSVG(SY, C.grove, C.bay)}</div><figcaption>On Paper. daphne-symbol-on-light.svg</figcaption></figure>
  </div>
  <div class="grid g2" style="margin-top:28px;align-items:end">
    <figure><div class="tab">${tileSVG(SM, 0.76, 0.22)}<span>Daphne · Free festival laurel maker</span></div><figcaption>The tab, at its real 16 px. Below 40 px the small symbol drops the midrib and stalks, which fill in.</figcaption></figure>
    <figure><div class="tiny">${[64, 32, 16].map((s) => `<div style="width:${s}px">${tileSVG(SM, 0.76, 0.22)}</div>`).join('')}</div><figcaption>favicon.svg at 64, 32 and 16 px</figcaption></figure>
  </div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">Color</p>
  <h2>A grove at night, one flower, and no gold.</h2>
  <p class="lede">Festival laurels are gold or silver, so we never are. Green is the living tree; gold is the honor someone earned. When a laurel appears in our frames, it’s the only metal there.</p>
  <div class="chips">
    <div class="chip" style="background:${C.grove};color:${C.paper}"><b>Grove</b><div><div class="data">${C.grove}</div><small>The ground. Dark enough for cinema, green enough to be ours.</small></div></div>
    <div class="chip" style="background:${C.groveDeep};color:${C.paper}"><b>Grove deep</b><div><div class="data">${C.groveDeep}</div><small>The grove’s shadow: vignettes and the edges of a frame.</small></div></div>
    <div class="chip" style="background:${C.paper};color:${C.grove}"><b>Paper</b><div><div class="data">${C.paper}</div><small>Words on Grove, and the light ground. Cool and leafy, never cream.</small></div></div>
    <div class="chip" style="background:${C.newLeaf};color:${C.grove}"><b>New leaf</b><div><div class="data">${C.newLeaf}</div><small>The leaves on Grove. Young bay leaves are this color.</small></div></div>
    <div class="chip" style="background:${C.bay};color:${C.paper}"><b>Bay</b><div><div class="data">${C.bay}</div><small>The leaves on Paper and white.</small></div></div>
    <div class="chip" style="background:${C.bloom};color:${C.grove}"><b>Bloom</b><div><div class="data">${C.bloom}</div><small>Her heart. The Daphne flower blooms pink. Used once a frame.</small></div></div>
  </div>
  <div class="contrast"><table><thead><tr><th>Pair</th><th>Contrast</th><th>Use</th></tr></thead><tbody>
    <tr><td><span class="sw" style="background:${C.paper}"></span>Paper on Grove</td><td>14.1</td><td>All text</td></tr>
    <tr><td><span class="sw" style="background:${C.newLeaf}"></span>New leaf on Grove</td><td>10.8</td><td>Leaves, links, data</td></tr>
    <tr><td><span class="sw" style="background:${C.bloom}"></span>Bloom on Grove</td><td>7.6</td><td>One highlighted word</td></tr>
    <tr><td><span class="sw" style="background:${C.bay}"></span>Bay on Paper</td><td>7.3</td><td>Leaves, links on light</td></tr>
    <tr><td><span class="sw" style="background:${C.bloom}"></span>Bloom on Paper</td><td>1.9</td><td>Never as text. A fill behind Grove text only.</td></tr>
  </tbody></table></div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">Type</p>
  <h2>pitch.dog’s voice, in Daphne’s colors.</h2>
  <p class="lede">Daphne is made by pitch.dog, so it speaks in the pitch.dog type system. The font files are CC0 and ship with Daphne; the laurels themselves use whatever face the filmmaker picks.</p>
  <div class="spec">
    <div class="s"><div class="data">PD Head · 400<br>Display: the name, headlines</div><div class="s-head">Every laurel since is hers.</div></div>
    <div class="s"><div class="data">PD Body Alt · 400<br>Lead: taglines, big lines</div><div class="s-lead">Make festival laurels for your film. It’s free.</div></div>
    <div class="s"><div class="data">PD Body · 400, 600<br>Text: interface, captions</div><div class="s-text">Type the festival, your selection and the year, pick a look, and download it for your poster, trailer and socials. <b style="font-weight:600">No account, no watermark.</b></div></div>
    <div class="s"><div class="data">PD Eyebrow · 500<br>Data: formats, sizes, URLs</div><div class="s-data">PNG · 4000 px &nbsp; SVG · outlined &nbsp; MP4 · 24 fps &nbsp; pitch.dog/daphne</div></div>
  </div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">The leaf brackets</p>
  <h2>Hold one thing.</h2>
  <p class="lede">The logo’s leaves work on their own beside display type. One bracketed phrase a frame, around the thing being honored or given.</p>
  <div class="heads">
    <div class="plate dark"><div class="h">Your film got in. Now give it ${held('a laurel')}.</div></div>
    <div class="plate light"><div class="h" style="color:${C.grove}">${held('Free')} for every filmmaker who’s earned one.</div></div>
  </div>
  <ul class="rules">
    <li>New leaf on Grove, Bay on Paper. Never Bloom, never gold.</li>
    <li>Set them at <span class="data">height: 1.24em; vertical-align: -0.30em</span> beside PD Head. Files: bracket/leaf-left.svg, leaf-right.svg.</li>
    <li>In running text, ordinary parentheses stay ordinary.</li>
  </ul>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">Laurels in the brand</p>
  <h2>Show what she makes.</h2>
  <p class="lede">Every laurel in our material is made with Daphne’s own looks, with words no one could mistake for a real selection. No real festival’s name, logo or artwork, ever.</p>
  <div class="laurels">
    ${[['classic-gold', 'Classic Gold'], ['black-tie', 'Black Tie'], ['laureate', 'Laureate'], ['gala-seal', 'Gala Seal'], ['hot-foil', 'Hot Foil']].map(([id, n]) => `<figure><img src="${png(`laurels/${id}.png`)}" alt="A ${n} laurel made with Daphne"><figcaption>${n}</figcaption></figure>`).join('\n    ')}
  </div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">Motion</p>
  <h2>Things grow from where they’re attached.</h2>
  <p class="lede">The leaves grow up from their stalks, then the name rises into the room they made, one letter every two frames.</p>
  <div class="reveal">${revealSVG({ id: 'bk' })}<button class="btn" id="replay" type="button">Play again</button></div>
  <ul class="rules">
    <li><b>Grow, don’t pop.</b> A leaf grows from stalk to tip along its own spine, with a soft growing edge. Nothing scales from its center or slides in from off screen.</li>
    <li><b>Leaves first, then words.</b> The leaves grow for 1.05 s; the name starts at 0.5 s.</li>
    <li><b>One leaf per frame.</b> A full wreath grows one leaf per frame at 24 fps, so 24 leaves take exactly one second of film.</li>
    <li><b>Her heart still beats.</b> In a long hold, the leaves breathe once every 1.2 s, barely. If anything glows Bloom, it’s that beat, and only once.</li>
    <li><b>Let one leaf fall.</b> When a piece ends, a single leaf can drift down through the frame. It’s the only exit we use.</li>
    <li><b>Easing:</b> growth <span class="data">cubic-bezier(.2,.7,.1,1)</span>, words <span class="data">cubic-bezier(.33,0,.15,1)</span>. No bounce, no overshoot. Hold the last frame at least a second. Reduced motion shows the last frame.</li>
  </ul>
  <h3 style="margin-top:48px">A 5-second intro or outro, as a starting point</h3>
  <div class="beats-table"><table><thead><tr><th>Time</th><th>What happens</th></tr></thead><tbody>
    <tr><td>0.0–1.1 s</td><td>The leaves grow from their stalks, the right one two frames behind the left</td></tr>
    <tr><td>0.5–1.2 s</td><td>Daphne rises in, a letter every two frames</td></tr>
    <tr><td>1.4–2.0 s</td><td>The tagline arrives under it: Make festival laurels for your film. It’s free.</td></tr>
    <tr><td>3.6 s</td><td>pitch.dog/daphne and Made by pitch.dog</td></tr>
    <tr><td>to 5.0 s</td><td>Hold. The leaves breathe once; one leaf may fall.</td></tr>
  </tbody></table></div>
</div></section>

<section class="ch words"><div class="wrap">
  <p class="eyebrow">Words</p>
  <h2>Plain first. The story is for when there’s room.</h2>
  <p class="lede">Daphne is a person’s name, so it never travels alone: a title, a card, a bio or an end card carries the tagline or the descriptor beside it.</p>
  <dl>
    <dt>Tagline</dt><dd>Make festival laurels for your film. It’s free.</dd>
    <dt>Descriptor</dt><dd>Daphne · Free festival laurel maker for filmmakers</dd>
    <dt>Headline</dt><dd>Your film did the hard part. Now make the laurel.</dd>
    <dt>About</dt><dd>Daphne makes festival laurels, the wreaths on a film’s poster that say it was selected for, or won at, a festival. Type the festival, your selection and the year, pick a look, and download it for your poster, trailer and socials as a PNG, SVG, PDF or video. It’s free and works in your browser, with no account and no watermark. Nothing you make leaves your device unless you share it. Made by pitch.dog, and open source.</dd>
    <dt>Why the name</dt><dd>In Greek myth, Daphne turned into the first laurel tree. Every laurel since comes from her.</dd>
    <dt>Credit line</dt><dd>Made with Daphne. Optional, text only, never a logo on someone’s laurel.</dd>
    <dt>Voice</dt><dd>We’re pitch.dog, in the plural. Say what it makes, who it’s for and what it costs, then name the freedoms: no account, no watermark, nothing uploaded. US spelling.</dd>
  </dl>
</div></section>

<section class="ch apps"><div class="wrap">
  <p class="eyebrow">At work</p>
  <h2>The first places people will meet her.</h2>
  <div class="grid g2">
    <figure><img src="${png('social/og-card.png')}" alt="Link preview card: the Daphne logo, the tagline and a gold laurel"><figcaption>Link preview, 1200 × 630. social/og-card.png</figcaption></figure>
    <figure><img src="${png('social/linkedin-banner.png')}" alt="LinkedIn banner: the logo, the tagline and three laurels"><figcaption>LinkedIn banner, 1584 × 396. social/linkedin-banner.png</figcaption></figure>
  </div>
</div></section>

<section class="ch"><div class="wrap">
  <p class="eyebrow">Files</p>
  <h2>Everything is drawn by code.</h2>
  <p class="lede">The marks are geometry in brand/tools/mark.mjs, so a change to the logo is a change to the code, never a hand edit to an SVG. All of it is in the public domain (CC0): take it, change it, use it.</p>
  <div class="files"><table><tbody>
    <tr><td>logo/</td><td>(Daphne) on dark, on light, mono, black, white, hero; PNGs at 800 and 2400 px</td></tr>
    <tr><td>symbol/</td><td>(D), avatar, app icon, small symbol; PNGs</td></tr>
    <tr><td>favicon/</td><td>favicon.svg, .ico, 16–48 px, apple-touch-icon, 192, 512, maskable</td></tr>
    <tr><td>bracket/</td><td>The leaf brackets, one em tall</td></tr>
    <tr><td>social/</td><td>Link preview, GitHub preview, LinkedIn banner, with sources</td></tr>
    <tr><td>laurels/</td><td>Sample laurels made with Daphne</td></tr>
    <tr><td>motion/</td><td>The logo reveal: page, MP4, GIF, growth paths</td></tr>
    <tr><td>tokens/</td><td>Colors, faces and easing as design tokens and CSS</td></tr>
    <tr><td>fonts/</td><td>PD Head, PD Body, PD Body Alt, PD Eyebrow (CC0)</td></tr>
    <tr><td>tools/</td><td>build.mjs, render.mjs, book.mjs</td></tr>
    <tr><td>LICENSE.md</td><td>CC0 1.0 for everything here. The fonts are CC0 too; the Daphne app is MIT.</td></tr>
  </tbody></table></div>
</div></section>
<footer><div class="wrap">Daphne · Made by pitch.dog · Public domain, CC0 · October 31, 2026</div></footer>
</main>

<script>
${revealScript()}
(() => {
  // the logo reveal in Motion: plays when it scrolls into view, and again on request
  const svg = document.querySelector('svg.bk'), anims = daphneReveal(svg, 'bk');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) { anims.forEach((a) => { a.pause(); a.currentTime = 0; }); }
  const play = () => anims.forEach((a) => { a.currentTime = 0; a.play(); });
  document.getElementById('replay').addEventListener('click', play);
  if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { play(); o.disconnect(); } }, { threshold: .35 }).observe(svg);
  else anims.forEach((a) => a.finish());
})();

(() => {
  // Daphne's story, in one continuous line. Scroll moves it through six beats:
  // 0 her hair and the river, one stream of light; 1 the chase, and the stream rises into a tree with raised arms;
  // 2 the tree, with her heart still beating under the bark; 3 the branches bend into a laurel, worn as a crown,
  // and every laurel since ripples out from it; 4 the leaves fall, all but two; 5 the two leaves hold her name.
  const cv = document.getElementById('grove'), story = document.querySelector('.story'), ctx = cv && cv.getContext && cv.getContext('2d');
  if (!ctx) return;
  story.classList.add('live');
  const caps = Array.from(story.querySelectorAll('.caps .cap')), endCap = story.querySelector('.cap.end'), hint = story.querySelector('.hint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LEAF = new Path2D(${JSON.stringify(SL.d)}), STALK = new Path2D(${JSON.stringify(SL.stalk)}), LEN = 500;
  const LETTERS = ${JSON.stringify(LETTERS)}.map((l) => [l[0], new Path2D(l[1])]);
  const BL = new Path2D(${JSON.stringify(HK.L.d)}), BLS = new Path2D(${JSON.stringify(HK.L.stalk)}), BR = new Path2D(${JSON.stringify(HK.R.d)}), BRS = new Path2D(${JSON.stringify(HK.R.stalk)});
  const NB = ${JSON.stringify(HK.box)}, A0 = ${JSON.stringify(HK.L.P(0))}, A1 = ${JSON.stringify(HK.L.P(1))}, Z0 = ${JSON.stringify(HK.R.P(0))};
  const G = '184,229,154', PK = '245,156,192', LEAFC = '#B8E59A', PAPER = '#F3F6EF';
  let W = 0, H = 0, dpr = 1, U = 1, cx = 0, cy = 0;
  const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); U = Math.min(W * 1.1, H * .95); cx = W / 2; cy = H * .41; };
  size(); addEventListener('resize', size);
  // seeded, so it's the same grove every visit
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cl = (x) => Math.min(1, Math.max(0, x));
  const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const mixA = (a, b, t) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
  const angOf = (dx, dy) => Math.atan2(dx, -dy);

  // her strands: nine hairlines of light
  const NS = 9, NP = 64;
  const strands = Array.from({ length: NS }, (_, k) => ({ k, off: (k - 4) / 4, ph: rnd() * 6.283, fq: 1.3 + rnd() * 1.1, j: .82 + rnd() * .36, side: k < 4 ? -1 : k > 4 ? 1 : 0, lane: Math.abs(k - 4) }));
  // her leaves: 17 a side
  const NL = 17, leaves = [];
  for (const side of [-1, 1]) for (let j = 0; j < NL; j++) leaves.push({ side, j, t: j / (NL - 1), out: j % 2 ? 1 : -1, k: side < 0 ? 3 - (j % 4) : 5 + (j % 4), ut: .3 + .66 * (j / (NL - 1)) + (rnd() - .5) * .04, seed: rnd(), sway: rnd() * 6.283, chosen: j === 7 });
  // the night around her
  const motes = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), z: rnd(), ph: rnd() * 6.283, sp: .2 + rnd() * .8 }));
  const drift = Array.from({ length: 24 }, () => ({ x: rnd(), y: rnd(), z: rnd(), r: rnd() * 6.283, vr: rnd() - .5, sw: rnd() * 6.283, sp: .4 + rnd() * .6 }));
  const sprite = (blur) => { const c = document.createElement('canvas'); c.width = 90; c.height = 150; const g = c.getContext('2d'); if ('filter' in g) g.filter = 'blur(' + blur + 'px)'; g.translate(45, 132); g.scale(.22, .22); g.fillStyle = LEAFC; g.fill(LEAF, 'evenodd'); g.fill(STALK); return c; };
  const SPR = [sprite(0), sprite(1.6), sprite(3.5), sprite(6.5)];
  const grain = Array.from({ length: 4 }, () => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), im = g.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return ctx.createPattern(c, 'repeat'); });

  let T = reduce ? 4 : 0, B = 0, last = performance.now(), flow = 0, sq = 1, lift = 0, R = 1, beat = 0;
  // the three shapes her strands take
  const river = (s, u, chase) => [mix(-.22 * W, 1.22 * W, u), cy + U * .2 + s.off * U * .026 + Math.sin(u * s.fq * 6.283 + flow * 1.5 + s.ph) * U * (.016 + chase * .022) + Math.sin(u * 2.2 - flow * .6 + s.ph * 2) * U * .022];
  const tree = (s, u) => { const fan = Math.pow(sm(.2, 1, u), 1.2), sway = Math.sin(T * .5 + u * 2.4 + s.k) * U * .007 * u;
    return [cx + s.off * U * (.01 + .32 * fan * s.j) - s.off * U * .07 * sm(.74, 1, u) + s.off * U * .025 * Math.sin(u * Math.PI * 1.5) + Math.sin(u * 5 + s.ph) * U * .006 * u + sway, cy + U * .34 - u * U * .68 + Math.abs(s.off) * U * .025 * fan]; };
  const arc = (side, u, ro) => { const a = (side < 0 ? 72 + u * 162 : 108 - u * 162) * Math.PI / 180, r = R + ro; return [cx + Math.cos(a) * r, cy + lift + Math.sin(a) * r * sq]; };
  const wreathPt = (s, u) => s.side ? arc(s.side, u, (s.lane - 2.5) * U * .0045 * Math.sin(Math.PI * u)) : [cx, cy + lift + R * sq];
  const treeBlend = (s, u, chase) => { const p = river(s, u, chase), m = sm(1.12 + u * .42, 1.55 + u * .42, B); if (m <= 0) return p; const q = tree(s, u); return [mix(p[0], q[0], m), mix(p[1], q[1], m)]; };
  const strandPt = (s, u, chase) => { const p = treeBlend(s, u, chase), m = sm(3.0 + u * .3, 3.4 + u * .3, B); if (m <= 0) return p; const q = wreathPt(s, u); return [mix(p[0], q[0], m), mix(p[1], q[1], m)]; };
  // a leaf's pose from where it sits and which way its stem runs
  const pose = (p, q, out, lean) => { let tx = q[0] - p[0], ty = q[1] - p[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m; const nx = -ty * out, ny = tx * out; return angOf(tx * Math.cos(lean) + nx * Math.sin(lean), ty * Math.cos(lean) + ny * Math.sin(lean)); };
  const leafAt = (x, y, a, k, flip, alpha) => { if (alpha <= .004 || k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k * flip, k); ctx.globalAlpha = alpha; ctx.fill(LEAF, 'evenodd'); ctx.fill(STALK); ctx.restore(); };
  const line = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const e = pts[pts.length - 1]; ctx.lineTo(e[0], e[1]); };
  const glow = (x, y, r, rgb, a) => { if (a <= .003) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); };

  const progress = () => { const r = story.getBoundingClientRect(), span = r.height - innerHeight; return Math.min(6, Math.max(0, (-r.top / Math.max(1, span)) * 6.25)); };
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const target = progress(); B = reduce ? target : B + (target - B) * Math.min(1, dt * 4.5);
    const rect = story.getBoundingClientRect(); if (rect.bottom < 0 || rect.top > innerHeight) return;
    if (!reduce) T += dt;
    // the subtitles
    caps.forEach((c, i) => { const inn = i === 0 ? 1 : sm(i - .14, i + .1, B), out = sm(i + .66, i + .86, B), o = inn * (1 - out); c.style.opacity = o.toFixed(3); c.style.transform = 'translateY(' + ((1 - inn) * 14 - out * 10).toFixed(1) + 'px)'; });
    const endIn = sm(5.3, 5.6, B); endCap.style.opacity = endIn.toFixed(3); endCap.style.transform = 'translateY(' + ((1 - endIn) * 12).toFixed(1) + 'px)';
    if (hint) hint.style.opacity = (.75 * (1 - sm(.02, .2, B))).toFixed(3);

    // timings
    const chase = sm(.82, 1.12, B) * (1 - sm(1.35, 1.7, B));
    flow += dt * (reduce ? 0 : .55 + chase * 3.2);
    const crown = sm(3.38, 3.68, B) * (1 - sm(4.0, 4.3, B)), heart = sm(2.0, 2.3, B) * (1 - sm(2.9, 3.15, B)), fade = 1 - sm(4.3, 4.85, B), logoOn = sm(4.92, 5.1, B);
    R = U * .245; sq = mix(1, .36, crown); lift = -U * .09 * crown;
    const per = 60 / 52, ph = T % per; beat = reduce ? 0 : Math.exp(-Math.pow(ph / .06, 2)) + .55 * Math.exp(-Math.pow((ph - .27) / .075, 2));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // night, and a faint pool of light where she stands
    ctx.fillStyle = '#09160F'; ctx.fillRect(0, 0, W, H);
    glow(cx, cy, Math.max(W, H) * .72, '28,62,43', .62);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) glow(W * (.5 + .36 * Math.sin(T * .031 + i * 2.1)), H * (.5 + .26 * Math.cos(T * .023 + i * 1.3)), Math.max(W, H) * .5, G, .028);
    // motes over the water
    const moteFade = 1 - .55 * sm(4.8, 5.3, B);
    for (const m of motes) { const tw = Math.pow(Math.max(0, Math.sin(T * .7 * m.sp + m.ph)), 4), a = (.04 + .42 * tw) * (.25 + .75 * m.z) * moteFade; if (a < .01) continue;
      const y = (((m.y - T * .006 * m.sp) % 1) + 1) % 1 * H, x = (m.x + Math.sin(T * .2 * m.sp + m.ph) * .012) * W; ctx.fillStyle = 'rgba(' + G + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, .5 + m.z * 1.3, 0, 6.283); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    // the grove's own leaves, falling out of focus
    const grove = sm(1.75, 2.6, B) * (1 - .45 * sm(4.9, 5.3, B));
    if (grove > 0) for (const d of drift) { const fall = (d.y + T * .011 * d.sp) % 1.2 - .1, x = (d.x + Math.sin(T * .33 * d.sp + d.sw) * .03) * W, y = fall * H, k = (.45 + d.z * .95) * U / 820;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.r + T * d.vr * .25); ctx.globalAlpha = (.05 + d.z * .16) * grove; ctx.drawImage(SPR[Math.min(3, Math.floor(Math.abs(d.z - .45) * 7.5))], -45 * k, -132 * k, 90 * k, 150 * k); ctx.restore(); }
    ctx.globalAlpha = 1;

    // her heart, under the bark
    if (heart > .005) { const hp = strandPt(strands[4], .3, chase); ctx.globalCompositeOperation = 'lighter';
      glow(hp[0], hp[1], U * .4, PK, heart * (.07 + .1 * beat)); glow(hp[0], hp[1], U * (.07 + .025 * beat), PK, heart * (.24 + .3 * beat)); }

    // her strands
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of strands) { const a = (.36 + .26 * (1 - s.lane / 4)) * fade * (s.side ? 1 : 1 - sm(3.0, 3.3, B)) * (1 + heart * beat * .35); if (a <= .005) continue;
      const pts = []; for (let i = 0; i <= NP; i++) pts.push(strandPt(s, i / NP, chase)); line(pts);
      const rv = 1 - sm(1.2, 1.8, B);  // the river glows a little more than the tree
      ctx.strokeStyle = 'rgba(' + G + ',' + (a * (.07 + .05 * rv)).toFixed(3) + ')'; ctx.lineWidth = Math.max(5, U * (.014 + .008 * rv)); ctx.stroke();
      let core = 'rgba(' + G + ',' + Math.min(1, a * .75).toFixed(3) + ')';
      if (heart > .01) { const hp = strandPt(strands[4], .3, chase), rg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], U * (.14 + .18 * beat)), pk = heart * (.7 + .3 * beat);
        rg.addColorStop(0, 'rgba(' + PK + ',' + Math.min(1, a * .9 * pk).toFixed(3) + ')'); rg.addColorStop(1, core); core = rg; }
      // the hairline itself, thinning out toward its growing tip
      ctx.strokeStyle = core; ctx.lineWidth = .9 + (1 - s.lane / 4) * .7; ctx.lineCap = 'butt';
      const cut = [0, Math.round(NP * .72), Math.round(NP * .86), NP], fadeTip = [1, .55, .22];
      for (let c = 0; c < 3; c++) { ctx.globalAlpha = fadeTip[c]; line(pts.slice(cut[c], cut[c + 1] + 1)); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.lineCap = 'round'; }
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = LEAFC;

    // the logo's frame, which the last two leaves travel to
    const w = Math.min(W * .8, 880), sc = w / (NB[2] - NB[0]), lx = cx - (NB[0] + NB[2]) / 2 * sc, ly = cy - (NB[1] + NB[3]) / 2 * sc;
    const target2 = (side) => { const P0 = side < 0 ? A0 : Z0; return { x: lx + P0[0] * sc, y: ly + P0[1] * sc, a: 0, k: (A0[1] - A1[1]) * sc / LEN, flip: side < 0 ? -1 : 1 }; };
    // her leaves: they grow from the stalk, one after another; bend with the branches into a laurel; fall
    const echo = [];
    for (const l of leaves) {
      const grow = sm(1.48 + l.t * .5, 1.6 + l.t * .5, B); if (grow <= 0) continue;
      const s = strands[l.k], p1 = treeBlend(s, l.ut, chase), p2 = treeBlend(s, Math.min(1, l.ut + .012), chase);
      let x = p1[0], y = p1[1], a = pose(p1, p2, l.out, .72), k = U * .07 / LEN * (1 - .32 * l.t), flip = l.out;
      const uw = .05 + .93 * l.t, mw = sm(3.0 + uw * .3, 3.4 + uw * .3, B);
      if (mw > 0) { const q1 = arc(l.side, uw, 0), q2 = arc(l.side, Math.min(1, uw + .01), 0); x = mix(x, q1[0], mw); y = mix(y, q1[1], mw); a = mixA(a, pose(q1, q2, l.out * l.side, .52), mw); k = mix(k, U * .088 / LEN * (1 - .45 * l.t), mw); }
      k *= grow * (1 + heart * beat * .025);
      if (!reduce) a += Math.sin(T * 1.1 + l.sway) * .035 * (1 - mw * .6);
      if (mw > .5 && fade > 0) echo.push([x, y, a, k, flip]);
      let alpha = .94;
      if (l.chosen) {
        // one of the two that stay: on its way to the logo it turns into the logo's own leaf, so the handoff has no seam
        const c = sm(4.45, 4.95, B), t2 = target2(l.side), shape = sm(0, .45, c);
        if (c > 0) { x = mix(x, t2.x, c); y = mix(y, t2.y, c); a = mixA(a, t2.a, c); }
        leafAt(x, y, a, k, flip, alpha * (1 - shape));
        if (shape > 0) { const P0 = l.side < 0 ? A0 : Z0, kb = mix(k * LEN / (A0[1] - A1[1]), sc, c), br = 1 + beat * .0045;
          ctx.save(); ctx.translate(cx, cy); ctx.scale(br, br); ctx.translate(-cx, -cy); ctx.translate(x, y); ctx.rotate(a); ctx.scale(kb, kb); ctx.translate(-P0[0], -P0[1]);
          ctx.globalAlpha = alpha * shape * (1 - logoOn); ctx.fill(l.side < 0 ? BL : BR, 'evenodd'); ctx.fill(l.side < 0 ? BLS : BRS); ctx.restore(); }
        continue;
      } else { const fp = sm(4.28 + l.seed * .42, 4.62 + l.seed * .42, B); if (fp > 0) { y += fp * fp * H * .8; x += Math.sin(T * .9 + l.sway) * fp * U * .08; a += fp * (l.seed - .5) * 5; alpha *= 1 - sm(.5, 1, fp); } }
      leafAt(x, y, a, k, flip, alpha);
    }
    // every laurel since: the crown's echoes, rippling out through time
    for (let e = 0; e < 4; e++) { const q = sm(3.55 + e * .16, 4.25 + e * .16, B); if (q <= 0 || q >= 1) continue; const s2 = 1 + q * 2.1, al = .2 * (1 - q) * sm(0, .1, q), oy = cy + lift;
      for (const [x, y, a, k, flip] of echo) leafAt(cx + (x - cx) * s2, oy + (y - oy) * s2, a, k * (1 + q * .5), flip, al); }
    ctx.globalAlpha = 1;

    // her name, held in the two leaves that stayed. It keeps her heartbeat, barely.
    if (logoOn > 0) { const br = 1 + beat * .0045;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(br, br); ctx.translate(-cx, -cy); ctx.translate(lx, ly); ctx.scale(sc, sc);
      ctx.globalAlpha = logoOn; ctx.fillStyle = LEAFC; ctx.fill(BL, 'evenodd'); ctx.fill(BLS); ctx.fill(BR, 'evenodd'); ctx.fill(BRS);
      ctx.fillStyle = PAPER; LETTERS.forEach((L, i) => { const q = sm(5.0 + i * .07, 5.28 + i * .07, B); if (q <= 0) return; ctx.globalAlpha = q; ctx.save(); ctx.translate(L[0], (1 - q) * 70); ctx.fill(L[1]); ctx.restore(); });
      ctx.restore(); ctx.globalAlpha = 1;
      endCap.style.top = Math.round(cy + (NB[3] - (NB[1] + NB[3]) / 2) * sc + Math.max(26, U * .05)) + 'px'; }

    // the edges of the frame, and film grain
    const vg = ctx.createRadialGradient(cx, H * .44, U * .2, cx, H * .44, Math.hypot(W, H) * .6); vg.addColorStop(0, 'rgba(4,11,7,0)'); vg.addColorStop(1, 'rgba(4,11,7,.9)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .045; ctx.fillStyle = grain[Math.floor(T * 12) % 4]; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();
</script>`;

const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" href="favicon/favicon.svg">
</head><body>
${page}
</body></html>
`;
writeFileSync(new URL('index.html', root), doc);
console.log('wrote index.html', (doc.length / 1024).toFixed(0), 'KB');
if (process.env.BOOK_FRAGMENT) { writeFileSync(process.env.BOOK_FRAGMENT, page); console.log('wrote', process.env.BOOK_FRAGMENT); }
