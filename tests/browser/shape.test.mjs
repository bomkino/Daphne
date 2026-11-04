// D26: a shape that can't be read never replaces the last good one; a whole <path> pasted in is trimmed to its d
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('Your shape keeps the last good leaf', async () => {
  const a = await openApp();
  await a.page.evaluate(() => { const L = window.__laurel; L.ctx.change('branch.leaf.family', 'custom'); L.setTab('wreath'); });
  await settle(a.page, 400);
  const box = a.page.locator('textarea[placeholder^="Paste any SVG path"]');
  await box.fill('<path fill="red" d="M0 0 Q25 -20 50 0 T100 0 T0 0Z"/>'); await box.blur(); await settle(a.page);
  assert.equal(await a.page.evaluate(() => window.__laurel.doc.branch.leaf.path), 'M0 0 Q25 -20 50 0 T100 0 T0 0Z');
  assert.equal(await box.inputValue(), 'M0 0 Q25 -20 50 0 T100 0 T0 0Z');
  await box.fill('M0 0 L100 0 Z 0 hello'); await box.blur(); await settle(a.page);
  // whole commands still draw, so this one is taken
  assert.equal(await a.page.evaluate(() => window.__laurel.doc.branch.leaf.path), 'M0 0 L100 0 Z 0 hello');
  await box.fill('not a shape'); await box.blur(); await settle(a.page);
  assert.equal(await a.page.evaluate(() => window.__laurel.doc.branch.leaf.path), 'M0 0 L100 0 Z 0 hello');
  assert.equal(await box.inputValue(), 'M0 0 L100 0 Z 0 hello');
  await a.page.locator('.toast', { hasText: 'couldn’t be read' }).waitFor({ timeout: 2000 });
  assert.deepEqual(a.errors, []);
  await a.context.close();
});
