// D27: a new poster replaces the old one on the stage at once; an unreadable one leaves it. D28: a 160 px drawing that
// arrives after leaving Poster never lands on another mode's stage.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const svg = (fill, w, h) => ({ mimeType: 'image/svg+xml', buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${fill}"/></svg>`) });
const posterIn = (page) => page.locator('#modebar input[type=file]');
const stageSrc = (page) => page.evaluate(() => { const im = document.querySelector('#stage .poster-wrap img'); return im && im.getAttribute('src') === window.__laurel.ctx.ASSETS[window.__laurel.doc.poster.src]; });

test('replacing the poster shows the new one; an unreadable file keeps it', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('poster')); await settle(page, 500);
  await posterIn(page).setInputFiles({ name: 'red.svg', ...svg('#d00000', 600, 900) }); await settle(page, 900);
  const a = await page.evaluate(() => window.__laurel.doc.poster.src);
  assert.ok(a && (await stageSrc(page)));
  await posterIn(page).setInputFiles({ name: 'blue.svg', ...svg('#0030d0', 900, 600) }); await settle(page, 900);
  const b = await page.evaluate(() => window.__laurel.doc.poster.src);
  assert.notEqual(a, b); assert.ok(await stageSrc(page), 'the stage shows the new poster');
  await posterIn(page).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await page.locator('.toast', { hasText: 'Couldn’t read that image' }).waitFor({ timeout: 3000 });
  assert.equal(await page.evaluate(() => window.__laurel.doc.poster.src), b); assert.ok(await stageSrc(page));
  assert.deepEqual(errors, []);
  await context.close();
});

test('a late 160 px drawing stays out of Laurel mode', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('poster')); await settle(page, 500);
  await posterIn(page).setInputFiles({ name: 'red.svg', ...svg('#d00000', 600, 900) }); await settle(page, 900);
  await page.evaluate(() => { const c = window.__laurel.ctx, png = c.toPng; window.__held = []; c.toPng = (...a) => new Promise((ok) => window.__held.push(() => ok(png(...a)))); });
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('poster', { ...c.doc.poster, actual: true }); }); await settle(page, 600);
  assert.ok(await page.evaluate(() => window.__held.length > 0), 'the 160 px drawing is on its way');
  await page.evaluate(() => window.__laurel.setMode('laurel')); await settle(page, 500);
  await page.evaluate(() => window.__held.forEach((f) => f())); await settle(page, 800);
  assert.equal(await page.locator('#stage .actual').count(), 0, 'Laurel mode keeps its stage');
  assert.ok(await page.locator('#stage > svg, #stage svg').count() > 0);
  assert.deepEqual(errors, []);
  await context.close();
});
