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
