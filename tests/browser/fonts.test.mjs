// D14: when a font arrives after the first drawing, every width is measured again (the stand-in's widths aren't kept).
// D30: a font that failed to load is asked for again later; an image never ships in a stand-in font without a word.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const hero = (svg) => Math.max(...[...svg.matchAll(/<text\b[^>]*font-size="([\d.]+)"/g)].map((m) => +m[1]));

test('a font that arrives late is measured afresh: the drawing matches a fresh render', async () => {
  const { page, errors, context } = await openApp();
  await page.route(/fonts\.googleapis\.com.*Daphne\+Late/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const before = await page.evaluate(async () => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    for (const k of Object.keys(d.roles)) if (d.roles[k]) d.roles[k].font = 'Daphne Late';
    c.replaceDoc(d); await new Promise((r) => setTimeout(r, 600));
    return document.querySelector('#stage svg').outerHTML;
  });
  await page.evaluate(async () => { const f = new FontFace('Daphne Late', 'url(/assets/fonts/pd-head.woff2)'); document.fonts.add(f); await f.load(); });
  await settle(page, 800);
  const { now, fresh } = await page.evaluate(async () => {
    const { render } = await import('/engine.mjs');
    const cv = document.createElement('canvas').getContext('2d');
    const measure = (s, font, weight, italic, size) => { cv.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${font}", sans-serif`; return cv.measureText(s).width; };
    return { now: document.querySelector('#stage svg').outerHTML, fresh: render(window.__laurel.ctx.doc, { measure, scale: 2 }).svg };
  });
  assert.notEqual(hero(before), hero(fresh), 'the late font really measures differently');
  assert.ok(Math.abs(hero(now) - hero(fresh)) < 0.05, `stage ${hero(now)} vs fresh ${hero(fresh)}`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a PNG whose font can’t be fetched says so instead of using a stand-in', async () => {
  const { page, errors, context } = await openApp();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const msg = await page.evaluate(async () => {
    const c = window.__laurel.ctx, r = c.render(c.doc);
    try { await c.toPng(r.svg, r.viewBox, 400, false); return 'made'; } catch (e) { return e.message; }
  });
  assert.match(msg, /Couldn’t fetch .* for the image/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a font stylesheet that failed is asked for again later', async () => {
  const { page, errors, context } = await openApp();
  let asked = 0;
  await page.route(/fonts\.googleapis\.com\/css2\?family=Rye/, (r) => { asked++; r.abort(); });
  const load = () => page.evaluate(async () => { const { loadFont } = await import('/fonts.js'); await loadFont('Rye', [400]); });
  await load(); await load();
  assert.equal(asked, 1, 'not asked again straight away');
  await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 60000; });
  await load();
  assert.equal(asked, 2, 'asked again once some time has passed');
  assert.equal(await page.evaluate(() => document.querySelectorAll('link[href*="family=Rye"]').length), 1, 'the failed stylesheet was taken out');
  assert.deepEqual(errors, []);
  await context.close();
});
