// Export says what it will make: the kit counts the files it builds and needs a format (D34); the PNG says whether
// its background is transparent before Download (J07).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

async function exportWith(bg, dest) {
  const o = await openApp();
  await o.page.evaluate((bg) => {
    const c = window.__laurel.ctx, d = c.clone(c.doc); d.canvas.bg = bg; c.replaceDoc(d);
    window.__files = null; c.zip = async (files) => { window.__files = files.map((f) => f.name); return new Blob(['x']); }; c.download = () => {};
    window.__laurel.openExport();
  }, bg);
  await settle(o.page, 400);
  await o.page.locator('button.dest', { hasText: dest }).click();
  await settle(o.page, 300);
  return o;
}

test('the kit counts exactly the files it makes', async () => {
  const { page, errors, context } = await exportWith('#101418', 'Laurel kit');
  const said = +/(\d+) files/.exec(await page.locator('.pv .cap').innerText())[1];
  await page.getByRole('button', { name: 'Download the laurel kit' }).click();
  await page.waitForFunction(() => window.__files, null, { timeout: 60000 });
  const files = await page.evaluate(() => window.__files);
  assert.equal(files.length, said, files.join('\n'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('no formats picked means no download, and says so', async () => {
  const { page, errors, context } = await exportWith(null, 'Laurel kit');
  for (const f of ['SVG', 'PNG', 'PDF']) await page.locator('.opts .checks label', { hasText: f }).locator('input').uncheck();
  await settle(page, 300);
  assert.ok(await page.getByRole('button', { name: 'Download the laurel kit' }).isDisabled());
  assert.match(await page.locator('.pv .cap').innerText(), /Pick at least one colorway and one format/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the PNG says whether its background is kept, next to Download', async () => {
  const { page, errors, context } = await exportWith('#101418', 'PNG');
  const go = page.locator('.opts .go');
  assert.match(await go.innerText(), /Background included/);
  await page.locator('.opts label', { hasText: 'Keep the background color' }).click();
  await settle(page, 300);
  assert.match(await page.locator('.opts .go').innerText(), /Transparent background/);
  assert.doesNotMatch(await page.locator('button.dest', { hasText: 'PNG' }).innerText(), /Transparent/);
  assert.deepEqual(errors, []);
  await context.close();
});

// D29: a job keeps the settings it started with; a second job waits
test('changing the PNG width mid-kit changes neither the kit’s PNGs nor its README', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx, png = c.toPng; window.__widths = []; window.__held = []; c.toPng = (svg, vb, w, ...a) => { window.__widths.push(w); if (window.__go) return png(svg, vb, w, ...a); return new Promise((ok) => window.__held.push(() => ok(png(svg, vb, w, ...a)))); }; });
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
  await page.locator('button.dest', { hasText: 'Laurel kit' }).click(); await settle(page, 200);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    (async () => {
      await page.locator('.modal button', { hasText: 'Download the laurel kit' }).click();
      await page.waitForFunction(() => window.__held.length > 0);
      await page.locator('button.dest', { hasText: 'PNG' }).click(); await settle(page, 200);
      await page.locator('.modal .chip', { hasText: /^1000$/ }).click(); await settle(page, 200);
      await page.locator('.modal button', { hasText: 'Download PNG' }).click(); // a second job, while the first is still running
      await page.locator('.toast', { hasText: 'One download at a time' }).waitFor({ timeout: 3000 });
      await page.evaluate(() => { window.__go = true; window.__held.splice(0).forEach((f) => f()); });
    })(),
  ]);
  const widths = await page.evaluate(() => window.__widths);
  assert.ok(widths.length >= 3 && widths.every((w) => w === 3000), JSON.stringify(widths));
  const { execFileSync } = await import('node:child_process'), { mkdtempSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path');
  const z = join(mkdtempSync(join(tmpdir(), 'kit-')), 'k.zip'); await dl.saveAs(z);
  const readme = execFileSync('unzip', ['-p', z, '*/README.txt']).toString();
  assert.match(readme, /\.png {2}3000 px wide/); assert.doesNotMatch(readme, /1000 px/);
  assert.deepEqual(errors, []);
  await context.close();
});
