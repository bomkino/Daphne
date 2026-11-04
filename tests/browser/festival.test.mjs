// The festival card follows the name as it reads now (D32), and offers the city of the edition's year (J08).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const start = async (year) => {
  const o = await openApp();
  await o.page.evaluate((year) => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = [
      { id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
      { id: 'b', kind: 'festival', text: '', role: 'hero', slot: 'inside', show: true },
      { id: 'c', kind: 'year', text: year, role: 'sub', slot: 'inside', show: true },
    ];
    c.replaceDoc(d); window.__laurel.setTab('words');
  }, year);
  return o;
};
const pick = async (page, q) => {
  const input = page.getByRole('combobox', { name: 'Festival name' });
  await input.fill(q); await settle(page, 300);
  await input.press('Enter'); await settle(page, 500);
};

test('a festival renamed through Every line drops the old card', async () => {
  const { page, errors, context } = await start('2026');
  await pick(page, 'Cannes');
  assert.match(await page.locator('.fcard').innerText(), /Cannes/);
  await page.locator('details.fold summary', { hasText: 'Every line' }).click();
  const adv = page.getByRole('textbox', { name: 'Festival text' });
  await adv.fill('Northlight Film Festival'); await settle(page);
  await page.evaluate(() => window.__laurel.setTab('words')); await settle(page, 300);
  const cards = await page.locator('.fcard').allInnerTexts();
  assert.ok(!cards.some((t) => /Cannes/.test(t)), cards.join(' | '));
  assert.deepEqual(errors, []);
  await context.close();
});

test('Sundance 2026 offers Park City, and a 2027 laurel notices it', async () => {
  const { page, errors, context } = await start('2026');
  await pick(page, 'Sundance');
  const card = page.locator('.fcard');
  assert.ok(await card.getByRole('button', { name: '+ Park City' }).count(), await card.innerText());
  assert.equal(await card.getByRole('button', { name: '+ Boulder' }).count(), 0);
  await card.getByRole('button', { name: '+ Park City' }).click(); await settle(page);
  const stage = (await page.$$eval('#stage svg text', (ts) => ts.map((t) => t.textContent))).join(' ');
  assert.match(stage, /park city/i); assert.doesNotMatch(stage, /boulder/i);
  await page.evaluate(() => { const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs.find((f) => f.kind === 'year').text = '2027'; c.change('fields', fs, true); window.__laurel.setTab('words'); });
  await settle(page);
  assert.match(await page.locator('.fcard').innerText(), /For 2027, Sundance Film Festival is held in Boulder; your city line says Park City/);
  assert.deepEqual(errors, []);
  await context.close();
});
