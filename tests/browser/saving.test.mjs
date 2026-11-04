// Work is kept: images survive Undo, reload and a second tab (D12); saves land in order, survive closing the page
// and say when the browser isn't keeping them (D13).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const addLogo = (page) => page.evaluate((url) => {
  const c = window.__laurel.ctx, a = c.addAsset(url, 1, 'logo.png'), fs = c.clone(c.doc.fields);
  fs.push({ id: 'logo1', kind: 'logo', src: a.src, ar: a.ar, role: 'eyebrow', slot: 'inside', show: true }); c.change('fields', fs, true);
  return a.src;
}, PNG);
const stored = (page) => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('daphne.assets') || '{}')));

test('a logo removed, brought back with Undo and reloaded is still there', async () => {
  const { page, errors, context } = await openApp();
  const key = await addLogo(page); await settle(page);
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('fields', c.doc.fields.filter((f) => f.kind !== 'logo'), true); });
  await settle(page);
  await page.locator('#undo').click(); await settle(page);
  await page.reload(); await page.waitForFunction(() => window.__laurel && document.querySelector('#stage svg'));
  assert.ok(await page.evaluate((k) => window.__laurel.doc.fields.some((f) => f.src === k) && !!window.__laurel.ctx.ASSETS[k], key));
  assert.deepEqual(errors, []);
  await context.close();
});

test('a second tab’s edit keeps the first tab’s new logo', async () => {
  const a = await openApp();
  const b = await openApp({ context: a.context });
  const key = await addLogo(a.page); await settle(a.page);
  await b.page.evaluate(() => { const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs[0].text = 'Edited in tab B'; c.change('fields', fs, true); });
  await settle(b.page);
  assert.ok((await stored(a.page)).includes(key));
  assert.deepEqual([...a.errors, ...b.errors], []);
  await a.context.close();
});

test('an edit made just before the page closes comes back', async () => {
  const { page, errors, context } = await openApp();
  await settle(page);
  await page.evaluate(() => { const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs[0].text = 'Last-second edit'; c.change('fields', fs, true); });
  await page.goto('about:blank'); // leave at once, before the half-second save
  await page.goBack(); await page.waitForFunction(() => window.__laurel && document.querySelector('#stage svg'));
  assert.ok(await page.evaluate(() => window.__laurel.doc.fields.some((f) => f.text === 'Last-second edit')));
  assert.deepEqual(errors, []);
  await context.close();
});

test('when storage refuses, the page says the laurel is not saved', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs[0].text = 'Unsaved'; c.change('fields', fs, true); });
  await settle(page, 900);
  assert.ok(await page.locator('#savestate').isVisible());
  assert.match(await page.locator('#toasts').innerText(), /isn’t saving your laurel/);
  assert.deepEqual(errors, []);
  await context.close();
});
