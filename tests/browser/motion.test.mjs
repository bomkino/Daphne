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
