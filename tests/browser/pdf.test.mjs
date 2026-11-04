// D25: a tinted logo prints as the logo, in the line's color, not as a solid block of that color
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup } from '../lib.mjs';

after(async () => (await setup()).close());

// a round logo: a dark disc on transparency
const DISC = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#222"/></svg>').toString('base64');

test('a masked logo is drawn as the logo before it goes into the PDF', async () => {
  const { page, errors, context } = await openApp();
  const r = await page.evaluate(async (disc) => {
    const { flattenMasks } = await import('/outline.js');
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><image href="${disc}" x="0" y="0" width="100" height="100"/></mask></defs><rect x="0" y="0" width="100" height="100" fill="#ff0000" mask="url(#m)"/></svg>`;
    const root = new DOMParser().parseFromString(src, 'image/svg+xml').documentElement;
    await flattenMasks(root, 2);
    const im = root.querySelector('image:not(mask image)');
    if (!im || root.querySelector('[mask]')) return { left: root.outerHTML.slice(0, 200) };
    const pic = new Image(); pic.src = im.getAttribute('href'); await pic.decode();
    const c = document.createElement('canvas'); c.width = pic.width; c.height = pic.height; const x = c.getContext('2d'); x.drawImage(pic, 0, 0);
    const px = x.getImageData(0, 0, c.width, c.height).data; let red = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128 && px[i] > 200 && px[i + 1] < 60) red++;
    return { red: red / (px.length / 4) };
  }, DISC);
  assert.ok(r.red, `still masked: ${r.left}`);
  assert.ok(Math.abs(r.red - Math.PI / 4) < 0.04, `red covers ${(r.red * 100).toFixed(1)}%, a disc covers 78.5%`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the laurel PDF carries a tinted logo as an image', async () => {
  const { page, errors, context } = await openApp();
  const pdf = await page.evaluate(async (disc) => {
    const c = window.__laurel.ctx, a = c.addAsset(disc, 1, 'disc.svg'), d = c.clone(c.doc);
    d.fields = [{ id: 'lg', kind: 'logo', role: 'hero', slot: 'inside', show: true, tint: true, ...a }, { id: 'fe', kind: 'festival', text: 'Northlight', role: 'sub', slot: 'inside', show: true }];
    c.replaceDoc(d);
    const svg = c.render(c.doc).svg;
    if (!/mask=/.test(svg)) return 'no tinted logo drawn';
    const blob = await c.toPdf(svg, c.doc);
    return new TextDecoder('latin1').decode(await blob.arrayBuffer());
  }, DISC);
  assert.match(pdf, /\/Subtype\s*\/Image/);
  assert.deepEqual(errors, []);
  await context.close();
});
