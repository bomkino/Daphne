// D31: a logo that arrives late lands on the line it was chosen for. D43: a file the cleaner can't read leaves the last one whole.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const svg = (fill) => ({ mimeType: 'image/svg+xml', buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect width="40" height="20" fill="${fill}"/></svg>`) });
const doc = { fields: [
  { id: 'la', kind: 'logo', role: 'hero', slot: 'inside', show: true },
  { id: 'lb', kind: 'logo', role: 'hero', slot: 'inside', show: true },
  { id: 'fe', kind: 'festival', text: 'Quillfeather Film Festival', role: 'hero', slot: 'inside', show: true },
] };
// file reads wait until the test lets each one go, so uploads can finish late and out of order
const hold = (page) => page.evaluate(() => { const q = []; window.__reads = q; const read = FileReader.prototype.readAsDataURL; FileReader.prototype.readAsDataURL = function (f) { q.push(() => read.call(this, f)); }; });
const release = (page, k) => page.evaluate((k) => window.__reads[k](), k);
const field = (page, id) => page.evaluate((id) => { const f = window.__laurel.doc.fields.find((x) => x.id === id); return f && { name: f.name || null, src: f.src || null }; }, id);
const upload = (page, id, name, fill) => page.locator(`.field[data-id="${id}"] input[type=file]`).setInputFiles({ name, ...svg(fill) });

test('a late logo still lands on its own line after the lines move', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400); await hold(a.page);
  await upload(a.page, 'la', 'alpha.svg', '#c00'); await settle(a.page, 100);
  await a.page.evaluate(() => { const { ctx } = window.__laurel; ctx.change('fields', [...ctx.doc.fields].reverse(), true); });
  await settle(a.page, 200); await release(a.page, 0); await settle(a.page);
  assert.equal((await field(a.page, 'la')).name, 'alpha.svg');
  assert.equal((await field(a.page, 'lb')).name, null);
  assert.equal(await a.page.evaluate(() => window.__laurel.doc.fields.find((x) => x.id === 'fe').src || null), null);
  assert.deepEqual(a.errors, []); await a.context.close();
});

test('the newer of two logos wins, whichever finishes first', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400); await hold(a.page);
  await upload(a.page, 'la', 'first.svg', '#c00'); await settle(a.page, 100);
  await upload(a.page, 'la', 'second.svg', '#00c'); await settle(a.page, 100);
  await release(a.page, 1); await settle(a.page); await release(a.page, 0); await settle(a.page);
  assert.equal((await field(a.page, 'la')).name, 'second.svg');
  assert.deepEqual(a.errors, []); await a.context.close();
});

test('a logo for a removed line goes nowhere', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400); await hold(a.page);
  await upload(a.page, 'lb', 'beta.svg', '#0c0'); await settle(a.page, 100);
  await a.page.evaluate(() => { const { ctx } = window.__laurel; ctx.change('fields', ctx.doc.fields.filter((x) => x.id !== 'lb'), true); });
  await settle(a.page, 200); await release(a.page, 0); await settle(a.page);
  const fs = await a.page.evaluate(() => window.__laurel.doc.fields.map((x) => [x.id, x.name || null]));
  assert.deepEqual(fs, [['la', null], ['fe', null]]);
  assert.deepEqual(a.errors, []); await a.context.close();
});

test('an unreadable logo is refused, not added', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400);
  await a.page.locator('.field[data-id="la"] input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a png at all') });
  await a.page.locator('.toast', { hasText: 'Couldn’t read that image' }).waitFor({ timeout: 3000 });
  assert.equal((await field(a.page, 'la')).src, null);
  assert.deepEqual(a.errors, []); await a.context.close();
});

test('the cleaner keeps the last good file whole when the next one is unreadable', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400);
  await a.page.evaluate(() => { document.querySelector('.field[data-id="la"]').closest('details').open = true; });
  await a.page.locator('.field[data-id="la"] button', { hasText: 'Clean up a file' }).click();
  const input = a.page.locator('.modal input[type=file]');
  const mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect width="40" height="20" fill="#fff"/><circle cx="20" cy="10" r="6" fill="#111"/></svg>';
  await input.setInputFiles({ name: 'alpha.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(mark) }); await settle(a.page);
  await a.page.locator('.modal h3', { hasText: 'alpha' }).waitFor();
  await input.setInputFiles({ name: 'beta.png', mimeType: 'image/png', buffer: Buffer.from('not a png at all') });
  await a.page.locator('.toast', { hasText: 'Couldn’t read that image' }).waitFor({ timeout: 3000 });
  assert.equal(await a.page.locator('.modal h3').first().innerText(), 'alpha');
  const [dl] = await Promise.all([a.page.waitForEvent('download', { timeout: 5000 }), a.page.locator('.modal button', { hasText: 'Download PNG' }).click()]);
  assert.equal(dl.suggestedFilename(), 'alpha-clean.png');
  await a.page.locator('.modal button', { hasText: 'Use it in the laurel' }).click(); await settle(a.page);
  assert.equal((await field(a.page, 'la')).name, 'alpha (cleaned)');
  assert.deepEqual(a.errors, []); await a.context.close();
});
