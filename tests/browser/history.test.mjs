// Edits are kept: Row edits redraw, save and undo (D18); only a line's own drag reorders a list (L05).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());
const stageText = (page) => page.$$eval('#stage svg text', (ts) => ts.map((t) => t.textContent).join(' '));

test('a Row edit after another Row edit redraws, saves and undoes', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('row'));
  await settle(page, 600);
  const gap = page.locator('label', { hasText: 'Gap' }).locator('input[type=range]');
  await gap.evaluate((el) => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await settle(page, 900);
  const hash0 = await page.evaluate(() => location.hash);
  const fest = page.locator('table.rowtable input[data-k=festival]').first();
  await fest.fill('Quillfeather Festival');
  await settle(page, 1200);
  assert.match(await stageText(page), /quillfeather/i);
  assert.notEqual(await page.evaluate(() => location.hash), hash0, 'the edit is saved to the link');
  assert.ok(await page.evaluate(() => window.__laurel.doc.row.items.some((it) => it.festival === 'Quillfeather Festival')));
  await page.locator('#undo').click(); await settle(page, 600);
  assert.ok(!(await page.evaluate(() => window.__laurel.doc.row.items.some((it) => it.festival === 'Quillfeather Festival'))));
  assert.deepEqual(errors, []);
  await context.close();
});

test('text dropped on a line never moves a line; a line dragged by itself does', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setTab('words')); await settle(page, 300);
  const before = await page.evaluate(() => window.__laurel.doc.fields.map((f) => f.id));
  const after1 = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.field')];
    for (const payload of ['2026', 'Harbour', '', '1.5', '99']) {
      const dt = new DataTransfer(); dt.setData('text/plain', payload);
      els[els.length - 1].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
      els[els.length - 1].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }
    return window.__laurel.doc.fields.map((f) => f.id);
  });
  assert.deepEqual(after1, before);
  const after2 = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.field')], dt = new DataTransfer();
    els[0].dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true }));
    els[1].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    els[1].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    els[0].dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true }));
    return window.__laurel.doc.fields.map((f) => f.id);
  });
  assert.deepEqual(after2, [before[1], before[0], ...before.slice(2)]);
  assert.deepEqual(errors, []);
  await context.close();
});

// J02: one user action is one step of history
const fieldsOf = (page) => page.evaluate(() => JSON.stringify(window.__laurel.doc.fields));
const setFields = (page, fields) => page.evaluate((fields) => { const c = window.__laurel.ctx, d = c.clone(c.doc); d.fields = fields; c.replaceDoc(d); window.__laurel.setTab('words'); }, fields);
const SELECTION = [
  { id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
  { id: 'b', kind: 'festival', text: 'Northlight Film Festival', role: 'hero', slot: 'inside', show: true },
  { id: 'c', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
];

test('Undo is off with nothing to undo', async () => {
  const { page, context } = await openApp();
  assert.ok(await page.locator('#undo').isDisabled());
  assert.ok(await page.locator('#redo').isDisabled());
  await context.close();
});

test('choosing Winner is one step: one Undo brings the selection back', async () => {
  const { page, errors, context } = await openApp();
  await setFields(page, SELECTION); await settle(page, 300);
  const before = await fieldsOf(page);
  await page.locator('.chip', { hasText: /^Winner$/ }).first().click(); await settle(page, 300);
  assert.notEqual(await fieldsOf(page), before);
  await page.locator('#undo').click(); await settle(page, 300);
  assert.equal(await fieldsOf(page), before);
  assert.deepEqual(errors, []);
  await context.close();
});

test('clicking a line on the stage keeps Redo', async () => {
  const { page, errors, context } = await openApp();
  await setFields(page, SELECTION); await settle(page, 300);
  await page.evaluate(() => { const c = window.__laurel.ctx, fs = c.clone(c.doc.fields); fs.find((f) => f.kind === 'year').text = '2027'; c.change('fields', fs, true); });
  await page.locator('#undo').click(); await settle(page, 300);
  const t = page.locator('#stage svg [data-ids]').first(), box = await t.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await settle(page, 300);
  await page.locator('#redo').click(); await settle(page, 300);
  assert.ok(await page.evaluate(() => window.__laurel.doc.fields.some((f) => f.text === '2027')));
  assert.deepEqual(errors, []);
  await context.close();
});

test('a menu number comes back as a number after Undo', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx; c.change('layout.dy', '-20'); c.change('layout.dy', '24'); });
  await page.locator('#undo').click(); await settle(page, 300);
  assert.strictEqual(await page.evaluate(() => window.__laurel.doc.layout.dy), -20);
  assert.deepEqual(errors, []);
  await context.close();
});

test('an email import is one step, film title included', async () => {
  const { page, errors, context } = await openApp();
  await setFields(page, SELECTION); await settle(page, 300);
  const before = await page.evaluate(() => JSON.stringify({ f: window.__laurel.doc.fields, film: window.__laurel.doc.film || null }));
  await page.locator('.emailq').getByRole('button').first().click().catch(() => {});
  await page.evaluate(() => { const ta = document.querySelector('textarea.emailin'); ta.value = 'Dear Maya,\n\nCongratulations! Your film "The Quiet Hours" has been selected as a Finalist for Best Documentary at the Harbour Documentary Festival 2027.\n\nBest,\nThe team'; ta.dispatchEvent(new Event('input', { bubbles: true })); });
  await settle(page, 400);
  await page.getByRole('button', { name: 'Use these' }).click(); await settle(page, 400);
  assert.equal(await page.evaluate(() => (window.__laurel.doc.film || {}).title), 'The Quiet Hours');
  await page.locator('#undo').click(); await settle(page, 300);
  assert.equal(await page.evaluate(() => JSON.stringify({ f: window.__laurel.doc.fields, film: window.__laurel.doc.film || null })), before);
  assert.deepEqual(errors, []);
  await context.close();
});
