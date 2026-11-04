// J03: a film's title and detail belong to its laurel; another laurel opened on the same device doesn't inherit them.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('Social words stay with their laurel', async () => {
  const a = await openApp();
  await a.page.evaluate(() => window.__laurel.openExport()); await settle(a.page, 300);
  await a.page.locator('button.dest', { hasText: 'Social post' }).click();
  await a.page.getByRole('textbox', { name: 'Film title' }).fill('The Quiet Hours');
  await a.page.getByRole('textbox', { name: 'Detail line' }).fill('Northlight screening · June 12');
  await settle(a.page);
  assert.equal(await a.page.evaluate(() => window.__laurel.doc.film.title), 'The Quiet Hours');
  const b = await openApp({ context: a.context, doc: { fields: [{ id: 'x', kind: 'festival', text: 'Harbour Documentary Festival', role: 'hero', slot: 'inside', show: true }] } });
  await b.page.evaluate(() => window.__laurel.openExport()); await settle(b.page, 300);
  await b.page.locator('button.dest', { hasText: 'Social post' }).click(); await settle(b.page, 300);
  assert.equal(await b.page.getByRole('textbox', { name: 'Film title' }).inputValue(), '');
  assert.doesNotMatch(await b.page.locator('.oblock', { hasText: 'A first line for the post' }).innerText(), /Quiet Hours/);
  assert.deepEqual([...a.errors, ...b.errors], []);
  await a.context.close();
});
