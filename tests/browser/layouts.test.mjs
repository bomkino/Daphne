// J01 in the real UI: choosing Star winner on a selection never puts an award into the artwork or its alt text.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('Star winner on a selection asks for the award instead of inventing one', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = [
      { id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
      { id: 'b', kind: 'festival', text: 'Northlight Film Festival', role: 'hero', slot: 'inside', show: true },
      { id: 'c', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
    ];
    c.replaceDoc(d);
    window.__laurel.setTab('looks');
  });
  await page.getByRole('tab', { name: /^Layouts/ }).click();
  await page.locator('button.preset', { hasText: 'Star winner' }).click();
  await settle(page);
  const stage = (await page.$$eval('#stage svg text', (ts) => ts.map((t) => t.textContent))).join(' ');
  const alt = await page.evaluate(() => window.__laurel.altText());
  assert.doesNotMatch(stage + ' ' + alt, /Best Documentary/);
  assert.match(stage, /Official Selection/i);
  assert.match(await page.locator('#toasts').innerText(), /line for the award/);
  assert.deepEqual(errors, []);
  await context.close();
});
