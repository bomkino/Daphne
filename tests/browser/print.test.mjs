// D20: print advice never invents a size. A flank laurel at 2 in is measured from what is drawn.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('a flank laurel at press-kit size reports its real smallest words', async () => {
  const { page, errors, context } = await openApp();
  const expected = await page.evaluate(async () => {
    const { applyForm } = await import('/engine.mjs');
    const c = window.__laurel.ctx, d = applyForm(c.clone(c.doc), 'flank');
    d.fields = d.fields.map((f) => (f.kind === 'festival' ? { ...f, text: 'Daphne Test Festival' } : f));
    c.replaceDoc(d);
    const r = c.render(c.doc);
    const sizes = [...r.svg.matchAll(/<text\b[^>]*font-size="([\d.]+)"/g)].map((m) => +m[1]);
    return Math.min(...sizes) * 2 * 72 / r.viewBox[2];
  });
  await page.evaluate(() => window.__laurel.openExport());
  await settle(page, 400);
  await page.locator('button.dest', { hasText: 'Poster and print' }).click();
  await page.locator('.chip', { hasText: 'Press kit page' }).click();
  await settle(page, 400);
  const note = await page.locator('.note', { hasText: 'smallest words print at' }).first().innerText();
  const pt = +/at ([\d.]+) pt/.exec(note)[1];
  assert.ok(pt < 20, note);
  assert.ok(Math.abs(pt - expected) < 0.6, `${note} vs ${expected.toFixed(2)}`);
  assert.deepEqual(errors, []);
  await context.close();
});

// D02: the unit only changes how the width is shown
test('clicking the unit in use changes nothing; in, mm, in comes back to the same size', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
  await page.locator('button.dest', { hasText: 'Poster and print' }).click();
  await page.locator('.chip', { hasText: 'Press kit page' }).click(); await settle(page, 200);
  const width = page.getByRole('spinbutton', { name: 'Printed width' }), unit = (u) => page.getByRole('radiogroup', { name: 'Unit' }).getByRole('radio', { name: u, exact: true });
  const px = async () => +/(\d+) × \d+ px at 300 dpi/.exec(await page.locator('.modal').innerText())[1];
  assert.equal(await width.inputValue(), '2'); const p0 = await px(); assert.equal(p0, 600);
  for (let i = 0; i < 3; i++) await unit('in').click();
  assert.equal(await width.inputValue(), '2'); assert.equal(await px(), 600);
  await unit('mm').click(); assert.equal(await width.inputValue(), '51'); assert.equal(await px(), 600);
  await unit('mm').click(); assert.equal(await width.inputValue(), '51');
  await unit('in').click(); assert.equal(await width.inputValue(), '2'); assert.equal(await px(), 600);
  assert.deepEqual(errors, []);
  await context.close();
});
