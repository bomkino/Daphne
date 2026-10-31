// The logo reveal: the two leaves grow up from their stalks, then the name rises
// in between them, one letter every two frames. Used by the brand book and by
// brand/motion/reveal.html; brand/tools/render.mjs turns it into an MP4 and a GIF.
import { COLORS as C, lockup, f } from './mark.mjs';

export const REVEAL = { fps: 24, total: 2.6, leaf: 1.05, leafStagger: 2 / 24, wordAt: 0.5, letter: 0.55, letterStagger: 2 / 24, rise: 70 };

export function revealSVG({ word = C.paper, leaf = C.newLeaf, id = 'rv' } = {}) {
  const LK = lockup(), b = LK.box, pad = 40, vb = [b[0] - pad, b[1] - pad, b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad];
  // each glyph in its own group so it can move on its own.
  // The soft mask's blur works in the frame's own units: a filter sized to the growth path's
  // bounding box would cut the leaves' outer edges, since a leaf is wider than its spine's box.
  const letters = LK.word.split('/>').filter((p) => p.trim()).map((p, i) => `<g class="${id}-l" data-i="${i}">${p}/></g>`).join('');
  const mask = (side, L) => `<mask id="${id}-m${side}" maskUnits="userSpaceOnUse" x="${f(vb[0])}" y="${f(vb[1])}" width="${f(vb[2])}" height="${f(vb[3])}"><path class="${id}-g" d="${L.grow}" pathLength="1" fill="none" stroke="#fff" stroke-width="360" stroke-linecap="butt" stroke-dasharray="1 2" stroke-dashoffset="1" filter="url(#${id}-soft)"/></mask>`;
  const leafPaths = (L) => `<path fill-rule="evenodd" d="${L.d}"/><path d="${L.stalk}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}" role="img" aria-label="Daphne" class="${id}">
<defs><filter id="${id}-soft" filterUnits="userSpaceOnUse" x="${f(vb[0])}" y="${f(vb[1])}" width="${f(vb[2])}" height="${f(vb[3])}"><feGaussianBlur stdDeviation="14"/></filter>${mask('L', LK.L)}${mask('R', LK.R)}</defs>
<g fill="${leaf}"><g mask="url(#${id}-mL)">${leafPaths(LK.L)}</g><g mask="url(#${id}-mR)">${leafPaths(LK.R)}</g></g>
<g fill="${word}">${letters}</g></svg>`;
}

// Builds the timeline with the Web Animations API, so it can be played, scrubbed or stepped frame by frame.
// Returns the animations; call it with the svg element. Reduced motion shows the last frame.
export const revealScript = (R = REVEAL) => `function daphneReveal(svg, id) {
  const R = ${JSON.stringify(R)}, ms = (s) => s * 1000, grow = 'cubic-bezier(.2,.7,.1,1)', settle = 'cubic-bezier(.33,0,.15,1)';
  const anims = [];
  svg.querySelectorAll('.' + id + '-g').forEach((p, i) => anims.push(p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms(R.leaf), delay: ms(i * R.leafStagger), easing: grow, fill: 'both' })));
  svg.querySelectorAll('.' + id + '-l').forEach((g, i) => anims.push(g.animate([{ opacity: 0, transform: 'translateY(' + R.rise + 'px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: ms(R.letter), delay: ms(R.wordAt + i * R.letterStagger), easing: settle, fill: 'both' })));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) anims.forEach((a) => a.finish());
  return anims;
}`;
