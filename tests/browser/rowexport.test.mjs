// J05, V04, D07: the row is one thing everywhere. Examples show on the stage and never go into a file, a caption or Motion;
// an empty row says what to do instead of exporting this laurel; Export draws the row in the colorway picked.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const dest = async (page, name) => { await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300); await page.locator('button.dest', { hasText: name }).click(); await settle(page, 300); };
const close = async (page) => { await page.keyboard.press('Escape'); await settle(page, 200); };
const rowButtons = (page) => page.locator('.modal .go button');

test('a laurel with no row of its own offers no example row to download', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 500);
  assert.equal(await page.locator('#stage svg').count() > 0, true, 'the stage shows what a row looks like');
  assert.match(await page.locator('.row-examples').innerText(), /examples/);
  // an incidental change doesn't turn the examples into the user's laurels
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('row', { ...(c.doc.row || {}), gap: 0.3 }); }); await settle(page, 300);
  await dest(page, 'Your row');
  assert.match(await page.locator('.modal .preview').innerText(), /only has the example laurels/);
  for (const b of await rowButtons(page).all()) assert.equal(await b.isDisabled(), true);
  await page.locator('button.dest', { hasText: 'Accolades' }).click().catch(() => null); await settle(page, 200);
  assert.doesNotMatch(await page.locator('.modal').innerText(), /Halcyon|Atlas Film Festival|Meridian/);
  await close(page);
  // starting with this laurel makes a real row of one
  await page.locator('.row-examples button', { hasText: 'Start with this laurel' }).click(); await settle(page, 300);
  const items = await page.evaluate(() => window.__laurel.doc.row.items.map((it) => it.festival));
  assert.equal(items.length, 1); assert.doesNotMatch(items[0], /Halcyon|Atlas|Meridian/);
  await dest(page, 'Your row');
  assert.match(await page.locator('.modal .preview').innerText(), /1 laurel, drawn at one scale/);
  for (const b of await rowButtons(page).all()) assert.equal(await b.isDisabled(), false);
  await close(page);
  // and a row emptied out says so, everywhere
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('row', { ...c.doc.row, items: [] }); }); await settle(page, 300);
  await dest(page, 'Your row');
  assert.match(await page.locator('.modal .preview').innerText(), /Your row is empty/);
  for (const b of await rowButtons(page).all()) assert.equal(await b.isDisabled(), true);
  await page.locator('button.dest', { hasText: 'Social post' }).click(); await settle(page, 200);
  await page.getByRole('radio', { name: /^The row/ }).click(); await settle(page, 300);
  assert.match(await page.locator('.modal .preview').innerText(), /Your row is empty/);
  assert.equal(await page.locator('.modal button', { hasText: 'Download the card' }).isDisabled(), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Motion never animates this laurel under the row’s name', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('motion', { what: 'row' }); window.__laurel.setMode('motion'); }); await settle(page, 700);
  assert.match(await page.locator('#stage').innerText(), /only has the example laurels/);
  assert.equal(await page.locator('#stage svg').count(), 0);
  assert.equal(await page.locator('#modepanel button', { hasText: 'MP4 video' }).isDisabled(), true);
  await page.locator('#stage button', { hasText: 'Animate this laurel instead' }).click(); await settle(page, 700);
  assert.equal(await page.evaluate(() => window.__laurel.doc.motion.what), 'laurel');
  assert.ok(await page.locator('#stage svg').count() > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the row is drawn in the colorway Export picked', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('row', { items: [{ id: 'u1', status: 'Official Selection', festival: 'Quillfeather', award: '', year: '2026' }, { id: 'u2', status: 'World Premiere', festival: 'Atlas Film Festival', award: '', year: '2026' }] }); }); await settle(page, 300);
  await dest(page, 'Social post');
  await page.getByRole('radio', { name: /^The row/ }).click(); await settle(page, 300);
  const gold = async () => /#d6b56a/i.test(await page.locator('.modal .preview').innerHTML());
  assert.equal(await gold(), true, 'as designed, the row is in the look’s gold');
  await page.getByRole('radio', { name: 'White' }).click(); await settle(page, 300);
  assert.equal(await gold(), false, 'in White the row is white');
  assert.deepEqual(errors, []);
  await context.close();
});
