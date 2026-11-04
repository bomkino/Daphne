// D03: Motion shows the edit just made, even when the drawing keeps its length (2026 → 2027, one color for another)
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('Motion follows same-length year and color edits', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('fields', c.doc.fields.map((f) => (f.kind === 'year' ? { ...f, text: '2026' } : f)), true); c.change('paint.branch', '#aa0000'); });
  await page.evaluate(() => window.__laurel.setMode('motion')); await settle(page, 900);
  const stage = () => page.locator('#stage').innerHTML();
  assert.match(await stage(), /2026/); assert.match(await stage(), /#aa0000/i);
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('fields', c.doc.fields.map((f) => (f.kind === 'year' ? { ...f, text: '2027' } : f)), true); });
  await settle(page, 900);
  assert.match(await stage(), /2027/); assert.doesNotMatch(await stage(), />2026</);
  await page.evaluate(() => window.__laurel.ctx.change('paint.branch', '#00aa00')); await settle(page, 900);
  assert.match(await stage(), /#00aa00/i); assert.doesNotMatch(await stage(), /#aa0000/i);
  assert.deepEqual(errors, []);
  await context.close();
});

// D37: when Grow in has finished, the laurel is whole: a long ribbon's tails aren't cut off by the growth mask
test('Grow in ends on the whole laurel, ribbon tails included', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = [
      { id: 'a', kind: 'status', text: 'Winner', role: 'eyebrow', slot: 'inside', show: true },
      { id: 'b', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: true },
      { id: 'c', kind: 'award', text: 'Best International Documentary', role: 'arc', slot: 'ribbon', show: true },
    ];
    d.motion = { ...(d.motion || {}), entrance: 'grow', shimmer: false, text: 'none' };
    c.replaceDoc(d);
  });
  await page.evaluate(() => window.__laurel.setMode('motion')); await settle(page, 900);
  const end = async () => {
    await page.getByRole('slider', { name: 'Time' }).evaluate((el) => { el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await settle(page, 400);
    return page.locator('#stage svg').first().screenshot();
  };
  const grown = await end();
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('motion', { ...c.doc.motion, entrance: 'none' }); }); await settle(page, 900);
  const there = await end();
  const diff = await page.evaluate(async ([a, b]) => {
    const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const A = await load(a), B = await load(b);
    const im = new Image(); im.src = 'data:image/png;base64,' + a; await im.decode(); const w = im.width, hh = im.height;
    const off = (x, y) => { const i = (y * w + x) * 4; return Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 60; };
    // count solid differences only: a pixel whose neighbors differ too (a missing tail), not a 1 px antialiased edge
    let n = 0; for (let y = 1; y < hh - 1; y++) for (let x = 1; x < w - 1; x++) if (off(x, y) && off(x - 1, y) && off(x + 1, y) && off(x, y - 1) && off(x, y + 1)) n++;
    return n / (w * hh);
  }, [grown.toString('base64'), there.toString('base64')]);
  assert.ok(diff < 0.0005, `the finished Grow in differs from Already there on ${(diff * 100).toFixed(2)}% of the stage`);
  assert.deepEqual(errors, []);
  await context.close();
});

// D09, V05: the Time slider keeps focus through arrows, Home and End, and its track shows where it is
test('Time keeps focus and its fill follows the thumb', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.__laurel.setMode('motion')); await settle(page, 900);
  const time = page.getByRole('slider', { name: 'Time' });
  await time.focus();
  const state = () => page.evaluate(() => { const el = document.activeElement; return { label: el.getAttribute('aria-label'), v: +el.value, max: +el.max, p: el.style.getPropertyValue('--p') }; });
  await page.keyboard.press('Home'); await settle(page, 150);
  let s = await state(); assert.equal(s.label, 'Time'); assert.equal(s.v, 0); assert.equal(parseFloat(s.p), 0);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await settle(page, 120); }
  s = await state(); assert.equal(s.label, 'Time', 'focus stays on Time after arrows'); assert.ok(s.v > 0);
  await page.keyboard.press('End'); await settle(page, 150);
  s = await state(); assert.equal(s.label, 'Time'); assert.equal(s.v, s.max); assert.equal(parseFloat(s.p), 100);
  assert.deepEqual(errors, []);
  await context.close();
});

test('every slider’s track ends where its thumb is (Row gap)', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 600);
  const gap = page.locator('#modepanel label', { hasText: 'Gap' }).locator('input[type=range]');
  const p0 = await gap.evaluate((el) => [el.value, el.min, el.max, el.style.getPropertyValue('--p')]);
  assert.ok(Math.abs(parseFloat(p0[3]) - ((p0[0] - p0[1]) / (p0[2] - p0[1])) * 100) < 0.5, `initial fill ${p0}`);
  await gap.focus(); await page.keyboard.press('End'); await settle(page, 300);
  const g = page.locator('#modepanel label', { hasText: 'Gap' }).locator('input[type=range]');
  assert.equal(parseFloat(await g.evaluate((el) => el.style.getPropertyValue('--p'))), 100);
  assert.deepEqual(errors, []);
  await context.close();
});

// D16: reduced motion opens Motion on its finished frame, still, with Play there to start it
test('with reduced motion, Motion holds its last frame until Play', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.__laurel.setMode('motion')); await settle(page, 900);
  const time = page.getByRole('slider', { name: 'Time' });
  const a = await time.inputValue(); await settle(page, 600); const b = await time.inputValue();
  assert.equal(a, b, 'nothing plays'); assert.equal(+a, +(await time.getAttribute('max')));
  assert.equal(await page.locator('#modebar button').first().innerText(), 'Play');
  await page.locator('#modebar button', { hasText: 'Play' }).click(); await settle(page, 400);
  assert.equal(await page.locator('#modebar button').first().innerText(), 'Pause');
  assert.deepEqual(errors, []);
  await context.close();
});
