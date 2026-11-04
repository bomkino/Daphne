// D35: the link in a festival pack's README opens the same set (statuses, awards, winner line, colorways, formats, sizes) on any device
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const doc = { fields: [
  { id: 'st', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
  { id: 'fe', kind: 'festival', text: 'Quillfeather Film Festival', role: 'hero', slot: 'inside', show: true },
  { id: 'yr', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
] };
const packView = async (page) => { await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300); await page.locator('button.dest', { hasText: 'Festival pack' }).click(); await settle(page, 200); };
const state = (page) => page.evaluate(() => {
  const box = (t) => [...document.querySelectorAll('.modal .checks label')].filter((l) => l.textContent.trim().startsWith(t)).map((l) => l.querySelector('input').checked)[0];
  const note = (t) => [...document.querySelectorAll('.modal .checks label')].find((l) => l.textContent.trim().startsWith(t)).textContent.trim();
  return { png: note('PNG'), pdfNote: note('PDF'), finalist: box('Finalist'), mention: box('Honorable Mention'), white: box('White'), pdf: box('PDF'), awards: document.querySelector('.modal textarea[aria-label="Awards, one per line"]').value, winner: document.querySelector('.modal input[aria-label="Line over each award"]').value };
});

test('the README link brings the whole pack back in a fresh browser', async () => {
  const a = await openApp({ doc }); await settle(a.page, 400);
  await a.page.evaluate(() => localStorage.setItem('daphne.studio', JSON.stringify({ pngW: 2400, pdfMm: 150 }))); // this device's sizes
  await packView(a.page);
  const tick = (t) => a.page.locator('.modal .checks label', { hasText: new RegExp(`^${t}`) }).first().locator('input').click();
  await tick('Finalist'); await tick('White'); await tick('PDF');
  await a.page.locator('.modal textarea[aria-label="Awards, one per line"]').fill('Best Animation\nJury Prize');
  await a.page.locator('.modal input[aria-label="Line over each award"]').fill('Prize Winner'); await settle(a.page, 300);
  const want = await state(a.page);
  assert.deepEqual([want.finalist, want.white, want.pdf, want.awards, want.winner], [false, false, true, 'Best Animation\nJury Prize', 'Prize Winner']);
  assert.match(want.png, /2400 px/); assert.match(want.pdfNote, /150 mm/);
  const [dl] = await Promise.all([a.page.waitForEvent('download', { timeout: 60000 }), a.page.locator('.modal button', { hasText: 'Download the festival pack' }).click()]);
  const dir = mkdtempSync(join(tmpdir(), 'pack-')), z = join(dir, 'p.zip'); await dl.saveAs(z);
  const readme = execFileSync('unzip', ['-p', z, '*/README.txt']).toString();
  const link = (readme.match(/Open this set again[^:]*: (\S+)/) || [])[1];
  assert.ok(link && link.includes('#l='), readme.slice(0, 400));
  assert.match(execFileSync('unzip', ['-l', z]).toString(), /\.pdf/);
  assert.deepEqual(a.errors, []); await a.context.close();

  const b = await openApp({ hash: '#' + link.split('#')[1] }); await settle(b.page, 400); await packView(b.page);
  assert.deepEqual(await state(b.page), want);
  assert.deepEqual(b.errors, []); await b.context.close();
});
