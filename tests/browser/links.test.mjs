// Links open safely and the design follows the address: a broken link keeps your work (D05), a hostile one can't add
// attributes (D38), another link in the same tab opens (D44), and the story's way back returns to this laurel (J04).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle, pack } from '../lib.mjs';

after(async () => (await setup()).close());
const F = (name) => ({ fields: [{ id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true }, { id: 'b', kind: 'festival', text: name, role: 'hero', slot: 'inside', show: true }] });
const festival = (page) => page.evaluate(() => window.__laurel.doc.fields.find((f) => f.kind === 'festival').text);
const ready = (page) => page.waitForFunction(() => window.__laurel && document.querySelector('#stage svg'));

const edit = (page, name) => page.evaluate((name) => { const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs.find((f) => f.kind === 'festival').text = name; c.change('fields', fs, true); }, name);

test('a link with a broken document keeps your last laurel', async () => {
  const { page, errors, context } = await openApp();
  await edit(page, 'Quillfeather'); await settle(page);
  const { url } = await setup();
  await page.goto('about:blank');
  await page.goto(url + '#l=' + pack({ fields: null, roles: null }));
  await ready(page);
  assert.equal(await festival(page), 'Quillfeather');
  assert.match(await page.locator('#toasts').innerText(), /couldn’t be opened/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a hostile paint value adds no attributes', async () => {
  const { page, errors, context } = await openApp({ doc: { ...F('Quillfeather'), paint: { branch: '#fff" data-audit-marker="harmless' }, text: { paint: '#000" data-audit-marker="harmless' } } });
  assert.equal(await page.locator('#stage [data-audit-marker]').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('another link opened in the same tab replaces the design, and Back returns', async () => {
  const { page, errors, context } = await openApp({ doc: F('Quillfeather') });
  await settle(page);
  await page.evaluate((h) => { location.hash = h; }, '#l=' + pack(F('Harbour Documentary Festival')));
  await page.waitForFunction(() => window.__laurel.doc.fields.some((f) => f.text === 'Harbour Documentary Festival'));
  await settle(page, 300);
  assert.match((await page.$$eval('#stage svg text', (ts) => ts.map((t) => t.textContent).join(' '))), /harbour/i);
  await settle(page);
  await page.goBack();
  await page.waitForFunction(() => window.__laurel.doc.fields.some((f) => f.text === 'Quillfeather'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('Make a laurel in the story comes back to the laurel you left', async () => {
  const { page, errors, context } = await openApp();
  await edit(page, 'Quillfeather'); await settle(page); // Quillfeather is now the autosave
  const { url } = await setup();
  await page.goto(url + '#l=' + pack(F('Harbour Documentary Festival'))); await ready(page);
  await page.locator('a.her', { hasText: 'Why Daphne?' }).click();
  await page.waitForURL(/story\//);
  await page.locator('a', { hasText: 'Make a laurel' }).first().click();
  await ready(page);
  assert.equal(await festival(page), 'Harbour Documentary Festival');
  assert.deepEqual(errors, []);
  await context.close();
});
