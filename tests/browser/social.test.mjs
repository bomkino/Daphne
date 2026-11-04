// Social and other descriptions say what the output shows: the title as typed (D08), the row when the row is
// shown (D33), the laurel's casing and italics (V03), and no logo that isn't there (J06).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const FIELDS = [
  { id: 'a', kind: 'status', text: 'Audience Award Nominee', role: 'eyebrow', slot: 'inside', show: true },
  { id: 'b', kind: 'festival', text: 'Daphne Test Festival', role: 'hero', slot: 'inside', show: true },
  { id: 'c', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
];
const ROW = [
  { id: 'r1', status: 'Official Selection', festival: 'Northlight', award: '', year: '2026' },
  { id: 'r2', status: 'World Premiere', festival: 'Atlas Film Festival', award: '', year: '2026' },
  { id: 'r3', status: 'Winner', festival: 'Hidden Fest', award: 'Best Film', year: '2026', show: false },
];
async function social(extra = {}) {
  const o = await openApp();
  await o.page.evaluate(({ FIELDS, ROW, extra }) => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = FIELDS; d.row = { ...(d.row || {}), items: ROW, order: 'manual', arrange: 'row', perRow: 4, uniform: true, gap: 0.14, lead: 1.3 };
    if (extra.roles) for (const [k, v] of Object.entries(extra.roles)) Object.assign(d.roles[k], v);
    c.replaceDoc(d);
    window.__laurel.openExport();
  }, { FIELDS, ROW, extra });
  await settle(o.page, 400);
  await o.page.locator('button.dest', { hasText: 'Social post' }).click();
  await settle(o.page, 300);
  return o;
}

test('the caption follows the title as it is typed', async () => {
  const { page, errors, context } = await social();
  const cap = page.locator('.oblock', { hasText: 'A first line for the post' }).locator('.alt');
  await page.getByRole('textbox', { name: 'Film title' }).fill('Old Title');
  await page.getByRole('textbox', { name: 'Film title' }).fill('New Title');
  await settle(page, 200);
  assert.match(await cap.innerText(), /New Title/);
  assert.doesNotMatch(await cap.innerText(), /Old Title/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('showing the row describes the row, not the base laurel', async () => {
  const { page, errors, context } = await social();
  await page.getByRole('radio', { name: /^The row/ }).click();
  await settle(page, 300);
  assert.equal(await page.getByRole('radio', { name: /^The row/ }).innerText(), 'The row (2)');
  const cap = await page.locator('.oblock', { hasText: 'A first line for the post' }).locator('.alt').innerText();
  const alt = await page.locator('.oblock', { hasText: 'Alt text' }).locator('.alt').innerText();
  for (const t of [cap, alt]) { assert.match(t, /Northlight/); assert.match(t, /Atlas Film Festival/); assert.doesNotMatch(t, /Daphne Test Festival|Hidden Fest/); }
  assert.deepEqual(errors, []);
  await context.close();
});

test('the card uses the laurel’s Title Case and italics', async () => {
  const { page, errors, context } = await social({ roles: { hero: { case: 'title', italic: true }, sub: { case: 'title', italic: true } } });
  await page.getByRole('textbox', { name: 'Film title' }).fill('my first film');
  await page.getByRole('textbox', { name: 'Detail line' }).fill('screening june 12');
  await settle(page, 400);
  const texts = await page.$$eval('.pv svg > text', (ts) => ts.map((t) => ({ s: t.textContent, it: t.getAttribute('font-style') })));
  assert.ok(texts.some((t) => t.s === 'My First Film' && t.it === 'italic'), JSON.stringify(texts));
  assert.ok(texts.some((t) => t.s === 'Screening June 12' && t.it === 'italic'), JSON.stringify(texts));
  assert.deepEqual(errors, []);
  await context.close();
});

test('a logo missing on this device is not described as present', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = [
      { id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
      { id: 'b', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: false },
      { id: 'g', kind: 'logo', src: 'asset:not-here', ar: 2, role: 'hero', slot: 'inside', show: true },
      { id: 'c', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
    ];
    c.replaceDoc(d);
  });
  await settle(page, 700);
  const r = await page.evaluate(() => ({ alt: window.__laurel.altText(), notes: document.getElementById('notes').innerText }));
  assert.doesNotMatch(r.alt, /logo/);
  assert.match(r.notes, /logo isn’t on this device/);
  assert.deepEqual(errors, []);
  await context.close();
});
