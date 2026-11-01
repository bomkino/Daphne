// Builds one carousel as a strip of 1080 × 1350 slides, then checks it before anything is rendered:
// every block sits inside its slide's safe box, no line of words overflows its box, no two blocks overlap,
// and no words are set smaller than 26 px. tools/render.mjs reads window.__ready and refuses to render a carousel
// with problems. Open index.html?set=launch (or myth, six, email, festivals) in a browser to look at one.
import { SETS } from './sets.js';

export const W = 1080, H = 1350;
// The safe box: 60 px in from every edge. Instagram's grid crops a 4:5 cover to 3:4, about 34 px off each side,
// and LinkedIn draws its page counter over a corner of a document, so nothing that matters goes nearer than 60.
export const SAFE = 60;
const MIN_TYPE = 26;

const id = new URLSearchParams(location.search).get('set') || 'launch';
const set = SETS[id];
const problems = [];
const strip = document.createElement('div');
strip.className = 'strip';
strip.style.width = set.slides.length * W + 'px';
document.body.append(strip);

// film grain, seeded so every render is the same, laid under the words
const grainUrl = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), im = g.createImageData(256, 256); let s = 7;
  for (let i = 0; i < im.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = (s / 2147483647) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c.toDataURL();
})();

set.slides.forEach((s, i) => {
  const el = document.createElement('section');
  el.className = 'slide';
  el.dataset.i = i;
  el.style.left = i * W + 'px';
  const ground = set.paint ? '' : `<div class="ground" style="background:${s.ground || set.ground || defaultGround()}"></div><div class="grain" style="background-image:url(${grainUrl})"></div>`;
  const count = set.count === false || s.count === false ? '' : `<div class="blk count" data-under data-name="count" style="left:${SAFE + 30}px;top:${H - SAFE - 54}px">${i + 1} / ${set.slides.length}</div>`;
  el.innerHTML = ground + s.html + count;
  strip.append(el);
});

function defaultGround(x = 50, y = 46) {
  return `radial-gradient(ellipse 85% 70% at ${x}% ${y}%, #1B3A2A 0%, #12291E 52%, #0B1B13 100%)`;
}

await document.fonts.ready;
await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((ok) => { im.onload = im.onerror = ok; }))));
await document.fonts.ready;
if (set.paint) await set.paint(strip, { W, H, SAFE, problems, grainUrl });

// ── the checks ──
const R = (e) => e.getBoundingClientRect();
const sr = R(strip);
document.querySelectorAll('.slide').forEach((slide) => {
  const i = +slide.dataset.i, x0 = sr.left + i * W, y0 = sr.top;
  const name = `slide ${i + 1}`;
  const blocks = [...slide.querySelectorAll('.blk')];
  for (const b of blocks) {
    const r = R(b), label = (b.dataset.name || b.textContent.trim().slice(0, 40) || b.className);
    // the block's own box, and everything drawn inside it (an image can overflow its box)
    const boxes = [r, ...[...b.querySelectorAll('img, svg, canvas')].map(R)];
    for (const q of boxes) {
      if (q.width === 0 && q.height === 0) continue;
      if (q.left < x0 + SAFE - 0.5 || q.right > x0 + W - SAFE + 0.5 || q.top < y0 + SAFE - 0.5 || q.bottom > y0 + H - SAFE + 0.5)
        problems.push(`${name}: "${label}" leaves the safe box (${Math.round(q.left - x0)}, ${Math.round(q.top - y0)} to ${Math.round(q.right - x0)}, ${Math.round(q.bottom - y0)})`);
    }
  }
  // words: no line wider than its box, nothing smaller than the floor
  for (const e of slide.querySelectorAll('.blk, .blk *')) {
    if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e);
    if (parseFloat(cs.fontSize) < MIN_TYPE) problems.push(`${name}: "${e.textContent.trim().slice(0, 30)}" is set at ${cs.fontSize}, under ${MIN_TYPE} px`);
    if (cs.display !== 'inline' && e.scrollWidth > e.clientWidth + 1) problems.push(`${name}: "${e.textContent.trim().slice(0, 30)}" overflows its box by ${e.scrollWidth - e.clientWidth} px`);
    // the lines themselves, measured with a range, so a long word that spills past a fixed width is caught too
    const rg = document.createRange(); rg.selectNodeContents(e);
    for (const lr of rg.getClientRects()) if (lr.width && (lr.left < x0 + SAFE - 0.5 || lr.right > x0 + W - SAFE + 0.5)) { problems.push(`${name}: a line of "${e.textContent.trim().slice(0, 30)}" leaves the safe box`); break; }
  }
  // blocks don't overlap, unless one says it sits under the others
  const solid = blocks.filter((b) => !('under' in b.dataset));
  for (let a = 0; a < solid.length; a++) for (let c = a + 1; c < solid.length; c++) {
    const p = R(solid[a]), q = R(solid[c]);
    const ix = Math.min(p.right, q.right) - Math.max(p.left, q.left), iy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (ix > 1 && iy > 1) problems.push(`${name}: "${(solid[a].dataset.name || solid[a].textContent.trim()).slice(0, 30)}" overlaps "${(solid[c].dataset.name || solid[c].textContent.trim()).slice(0, 30)}"`);
  }
  // the slide counter keeps its own air
  const cnt = slide.querySelector('[data-name="count"]');
  if (cnt) { const q = R(cnt); for (const b of solid) { const p = R(b); if (p.left < q.right + 16 && p.right > q.left - 16 && p.bottom > q.top - 20 && p.top < q.bottom + 16) problems.push(`${name}: "${(b.dataset.name || b.textContent.trim()).slice(0, 30)}" crowds the slide counter`); } }
  // one Bloom per slide
  const blooms = [...slide.querySelectorAll('.bloom')].length + (slide.dataset.bloom ? +slide.dataset.bloom : 0);
  if (blooms > 1) problems.push(`${name}: ${blooms} Bloom accents; the brand allows one`);
});

window.__ready = { id, title: set.title, n: set.slides.length, problems, slides: set.slides.map((s) => ({ alt: s.alt })) };
if (problems.length) console.warn(problems.join('\n'));
