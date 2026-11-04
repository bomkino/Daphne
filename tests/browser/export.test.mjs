// Export says what it will make: the kit counts the files it builds and needs a format (D34); the PNG says whether
// its background is transparent before Download (J07).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

async function exportWith(bg, dest) {
  const o = await openApp();
  await o.page.evaluate((bg) => {
    const c = window.__laurel.ctx, d = c.clone(c.doc); d.canvas.bg = bg; c.replaceDoc(d);
    window.__files = null; c.zip = async (files) => { window.__files = files.map((f) => f.name); return new Blob(['x']); }; c.download = () => {};
    window.__laurel.openExport();
  }, bg);
  await settle(o.page, 400);
  await o.page.locator('button.dest', { hasText: dest }).click();
  await settle(o.page, 300);
  return o;
}

test('the kit counts exactly the files it makes', async () => {
  const { page, errors, context } = await exportWith('#101418', 'Laurel kit');
  const said = +/(\d+) files/.exec(await page.locator('.pv .cap').innerText())[1];
  await page.getByRole('button', { name: 'Download the laurel kit' }).click();
  await page.waitForFunction(() => window.__files, null, { timeout: 60000 });
  const files = await page.evaluate(() => window.__files);
  assert.equal(files.length, said, files.join('\n'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('no formats picked means no download, and says so', async () => {
  const { page, errors, context } = await exportWith(null, 'Laurel kit');
  for (const f of ['SVG', 'PNG', 'PDF']) await page.locator('.opts .checks label', { hasText: f }).locator('input').uncheck();
  await settle(page, 300);
  assert.ok(await page.getByRole('button', { name: 'Download the laurel kit' }).isDisabled());
  assert.match(await page.locator('.pv .cap').innerText(), /Pick at least one colorway and one format/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the PNG says whether its background is kept, next to Download', async () => {
  const { page, errors, context } = await exportWith('#101418', 'PNG');
  const go = page.locator('.opts .go');
  assert.match(await go.innerText(), /Background included/);
  await page.locator('.opts label', { hasText: 'Keep the background color' }).click();
  await settle(page, 300);
  assert.match(await page.locator('.opts .go').innerText(), /Transparent background/);
  assert.doesNotMatch(await page.locator('button.dest', { hasText: 'PNG' }).innerText(), /Transparent/);
  assert.deepEqual(errors, []);
  await context.close();
});
