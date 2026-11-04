// D06: Export owns the keyboard while it's open: one dialog, focus kept inside, Undo and shortcuts wait, Escape closes the top one
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Export keeps the keyboard at ${viewport.width} px`, async () => {
    const { page, errors, context } = await openApp({ viewport });
    await page.evaluate(() => { const c = window.__laurel.ctx; c.change('fields', c.doc.fields.map((f) => (f.kind === 'year' ? { ...f, text: '2031' } : f)), true); });
    await settle(page, 300);
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+e`); await settle(page, 300);
    await page.keyboard.press(`${mod}+e`); await settle(page, 200);
    assert.equal(await page.locator('.scrim').count(), 1, 'one Export dialog');
    await page.keyboard.press(`${mod}+z`); await settle(page, 200);
    assert.equal(await page.evaluate(() => window.__laurel.doc.fields.find((f) => f.kind === 'year').text), '2031', 'Undo waits while Export is open');
    await page.keyboard.press('s'); await settle(page, 100);
    const inside = () => page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.scrim'));
    for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => document.activeElement === document.body))) assert.ok(await inside(), `Tab ${i} left Export`); }
    for (let i = 0; i < 20; i++) { await page.keyboard.press('Shift+Tab'); if (!(await page.evaluate(() => document.activeElement === document.body))) assert.ok(await inside(), `Shift+Tab ${i} left Export`); }
    await page.keyboard.press('Escape'); await settle(page, 200);
    assert.equal(await page.locator('.scrim').count(), 0);
    assert.equal(await page.evaluate(() => document.querySelector('.shell').inert), false, 'the page works again');
    await page.keyboard.press(`${mod}+z`); await settle(page, 200);
    assert.notEqual(await page.evaluate(() => window.__laurel.doc.fields.find((f) => f.kind === 'year').text), '2031', 'Undo works after');
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Escape closes the cleaner first, then Export', async () => {
  const doc = { fields: [{ id: 'la', kind: 'logo', role: 'hero', slot: 'inside', show: true }, { id: 'fe', kind: 'festival', text: 'Quillfeather Film Festival', role: 'hero', slot: 'inside', show: true }] };
  const { page, errors, context } = await openApp({ doc }); await settle(page, 300);
  await page.evaluate(() => { window.__laurel.openExport(); window.__laurel.ctx.openFixer(() => null); }); await settle(page, 300);
  assert.equal(await page.locator('.scrim').count(), 2);
  await page.keyboard.press('Escape'); await settle(page, 200);
  assert.equal(await page.locator('.scrim').count(), 1);
  assert.equal(await page.locator('.scrim h2').innerText(), 'Export');
  await page.keyboard.press('Escape'); await settle(page, 200);
  assert.equal(await page.locator('.scrim').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});
