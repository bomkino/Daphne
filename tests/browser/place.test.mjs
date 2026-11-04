// Wave 5, placement. L01: the ribbon's year sits in the middle of its band, at any letter spacing. L02: ribbon,
// medallion and curved words are text like any other: they can be picked, moved and reset, show the size that governs
// them, and take italic. L03: picking words keeps the laurel in view and puts Center and Reset in reach at once. Then
// the placing aids: snapping with an Alt bypass, arrow keys, an optional grid, and none of it in an exported file.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

// the doc with a layout applied (and any changes), through the app's own undoable path
const withLayout = (page, id, edit = '') => page.evaluate(([id, edit]) => {
  const c = window.__laurel.ctx; let n = 900;
  const d = c.clone(c.doc); d.fields = c.layoutFields(d.fields, c.layoutById(id), () => 'f' + ++n); d.layoutId = id;
  if (edit) new Function('d', edit)(d);
  c.replaceDoc(d);
}, [id, edit]);
const yearField = (page) => page.evaluate(() => { const f = window.__laurel.doc.fields.find((x) => x.kind === 'year'); return { id: f.id, dx: f.dx || 0, dy: f.dy || 0, slot: f.slot }; });
const yearOnStage = (page) => page.locator('#stage svg [data-ids]').filter({ hasText: /2026/ }).last();

// the year's outlined ink against the band's middle line, in the artwork's units
const ribbonInk = (page) => page.evaluate(async () => {
  const live = document.querySelector('#stage svg'), t = [...live.querySelectorAll('text')].find((x) => x.querySelector('textPath') && /2026/.test(x.textContent));
  const size = +t.getAttribute('font-size');
  const { outlineSvg } = await import('/outline.js');
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px';
  host.innerHTML = (await outlineSvg(live.outerHTML)).svg; document.body.append(host);
  const svg = host.querySelector('svg'), ink = [...svg.querySelectorAll('path[aria-label]')].find((p) => /2026/.test(p.getAttribute('aria-label'))).getBBox();
  const band = [...svg.querySelectorAll('path[data-part=ribbon]')].find((p) => !p.hasAttribute('opacity')).getBBox();
  host.remove();
  const mid = band.y + band.height - size * 0.92; // the band's middle line where it is lowest, under the year
  return { size, dx: ink.x + ink.width / 2 - (band.x + band.width / 2), dy: ink.y + ink.height / 2 - mid, inkH: ink.height };
});

for (const track of [0, 0.6]) {
  test(`L01: the ribbon year sits in the middle of the band (letter spacing ${track})`, async () => {
    const { page, errors, context } = await openApp();
    await withLayout(page, 'ribbon', `d.roles = { ...d.roles, arc: { ...(d.roles.arc || {}), track: ${track} } };`);
    await settle(page, 900);
    const r = await ribbonInk(page);
    assert.ok(Math.abs(r.dy) < r.size * 0.12, `ink center ${r.dy.toFixed(2)} units off the band's middle (size ${r.size.toFixed(1)})`);
    assert.ok(Math.abs(r.dx) < r.size * 0.05, `ink center ${r.dx.toFixed(2)} units off the band's center (size ${r.size.toFixed(1)})`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('L02: the ribbon year can be picked, dragged and reset like any line', async () => {
  const { page, errors, context } = await openApp();
  await withLayout(page, 'ribbon'); await settle(page, 900);
  const t = yearOnStage(page); await t.waitFor();
  const b = await t.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 30, { steps: 6 }); await page.mouse.up();
  await settle(page, 500);
  const moved = await yearField(page);
  assert.equal(moved.slot, 'ribbon');
  assert.ok(moved.dx > 0 && moved.dy > 0, `after the drag: ${JSON.stringify(moved)}`);
  assert.match(await page.locator('#stage svg path[data-part=ribbon]').last().getAttribute('transform') || '', /translate/, 'the band moves with its words');
  const b2 = await yearOnStage(page).boundingBox();
  await page.mouse.dblclick(b2.x + b2.width / 2, b2.y + b2.height / 2); await settle(page, 500);
  const back = await yearField(page);
  assert.deepEqual([back.dx, back.dy], [0, 0]);
  assert.deepEqual(errors, []);
  await context.close();
});

test('L02: curved words show the size that governs them, and take italic', async () => {
  const { page, errors, context } = await openApp();
  await withLayout(page, 'ribbon', 'd.roles = { ...d.roles, arc: { ...(d.roles.arc || {}), italic: true } };'); await settle(page, 700);
  await page.evaluate(() => window.__laurel.setTab('words')); await settle(page, 300);
  const id = (await yearField(page)).id;
  await yearOnStage(page).click(); await settle(page, 400); // picking it opens its line under Every line
  const size = page.locator(`.field[data-id="${id}"] select[aria-label=Size]`);
  assert.equal(await size.inputValue(), 'arc');
  assert.ok(await size.isDisabled(), 'one shared size, changed under Type');
  assert.match(await size.getAttribute('title'), /Curved and ribbon text/);
  assert.equal(await yearOnStage(page).getAttribute('font-style'), 'italic', 'the ribbon year is italic');
  // the medallion's words too
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); d.fields.find((f) => f.kind === 'year').slot = 'badge'; c.replaceDoc(d); }); await settle(page, 700);
  assert.equal(await yearOnStage(page).getAttribute('font-style'), 'italic', 'the medallion year is italic');
  assert.deepEqual(errors, []);
  await context.close();
});

test('L03: right after a drag, Reset is there, on the stage strip and on the line', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setTab('words')); await settle(page, 400);
  const t = yearOnStage(page), b = await t.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 20, { steps: 6 }); await page.mouse.up();
  await settle(page, 500);
  const strip = page.getByRole('toolbar', { name: 'Place the selected words' });
  assert.ok(await strip.isVisible(), 'the placing strip is open');
  assert.ok(await strip.getByRole('button', { name: 'Reset' }).isEnabled());
  const id = (await yearField(page)).id;
  assert.ok(await page.locator(`.field[data-id="${id}"] button`, { hasText: 'Reset nudge' }).isVisible(), 'the line offers Reset without switching tabs');
  await strip.getByRole('button', { name: 'Reset' }).click(); await settle(page, 400);
  assert.deepEqual(Object.values(await yearField(page)).slice(1, 3), [0, 0]);
  assert.match(await yearOnStage(page).textContent(), /2026/, 'words kept');
  await page.locator('#undo').click(); await settle(page, 400);
  assert.ok((await yearField(page)).dx > 0, 'Reset is one undoable step');
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [w, hgt] of [[390, 844], [320, 568]]) {
  test(`L03: at ${w} px picking the year keeps the laurel in view, and the strip covers none of it`, async () => {
    const { page, errors, context } = await openApp({ viewport: { width: w, height: hgt } });
    await page.evaluate(() => window.__laurel.setTab('words')); await settle(page, 400);
    const y0 = await page.evaluate(() => scrollY);
    await yearOnStage(page).click(); await settle(page, 800);
    const r = await page.evaluate(() => {
      const pb = document.querySelector('.placebar').getBoundingClientRect(), sv = document.querySelector('#stage svg').getBoundingClientRect();
      return { y: scrollY, pbTop: pb.top, pbBottom: pb.bottom, pbL: pb.left, pbR: pb.right, svTop: sv.top, svBottom: sv.bottom, sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight };
    });
    assert.equal(r.y, y0, 'the page did not scroll');
    assert.ok(r.svTop >= 0 && r.svBottom <= r.vh, `laurel ${r.svTop}..${r.svBottom} in a ${r.vh} px view`);
    assert.ok(r.pbTop >= r.svBottom - 1 || r.pbBottom <= r.svTop + 1, `strip ${r.pbTop}..${r.pbBottom} over the laurel ${r.svTop}..${r.svBottom}`);
    assert.ok(r.pbL >= 0 && r.pbR <= r.vw && r.sw <= r.vw, `strip ${r.pbL}..${r.pbR}, page ${r.sw} wide on ${r.vw}`);
    // Edit words takes you to the line when you ask
    if (w > 380) { await page.getByRole('button', { name: 'Edit words' }).click(); await settle(page, 900); assert.ok(await page.evaluate(() => scrollY) > y0, 'Edit words scrolls to the line'); }
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('a drag snaps to the center line; Alt places freely', async () => {
  const { page, errors, context } = await openApp();
  await settle(page, 300);
  const drag = async (alt) => {
    const b = await yearOnStage(page).boundingBox();
    if (alt) await page.keyboard.down('Alt');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 5, b.y + b.height / 2 + 40, { steps: 8 }); await page.mouse.up();
    if (alt) await page.keyboard.up('Alt');
    await settle(page, 400);
    return yearField(page);
  };
  const snapped = await drag(false);
  assert.equal(snapped.dx, 0, 'a near-miss lands on the center line');
  assert.ok(snapped.dy > 0);
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); for (const f of d.fields) { f.dx = 0; f.dy = 0; } c.replaceDoc(d); }); await settle(page, 400);
  const free = await drag(true);
  assert.ok(free.dx > 0, `with Alt the line goes where it's put: ${free.dx}`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('arrow keys move the picked words, Shift by ten, a held key is one undo step; Esc lets go', async () => {
  const { page, errors, context } = await openApp();
  await yearOnStage(page).click(); await settle(page, 300);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowDown'); await settle(page, 300);
  assert.deepEqual(Object.values(await yearField(page)).slice(1, 3), [2, 10]);
  await page.keyboard.press('Control+z'); await settle(page, 300);
  assert.deepEqual(Object.values(await yearField(page)).slice(1, 3), [0, 0], 'one quick run of nudges, one undo');
  await yearOnStage(page).click(); await settle(page, 200);
  await page.keyboard.press('Escape'); await settle(page, 200);
  assert.ok(!(await page.getByRole('toolbar', { name: 'Place the selected words' }).isVisible()), 'Esc closes the strip');
  await page.keyboard.press('ArrowLeft'); await settle(page, 200);
  assert.equal((await yearField(page)).dx, 0, 'with nothing picked, arrows move nothing');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the grid starts hidden; the glow, guides and grid never reach a file', async () => {
  const { page, errors, context } = await openApp();
  assert.equal(await page.locator('#stage svg .grid').count(), 0, 'no grid until asked');
  await page.locator('.stagebar button', { hasText: 'Grid' }).click(); await settle(page, 400);
  assert.ok(await page.locator('#stage svg .grid line').count() > 4, 'the grid shows');
  await yearOnStage(page).click(); await settle(page, 300);
  assert.equal(await page.locator('#stage svg .picked').count() > 0, true, 'the picked words glow on the stage');
  await page.evaluate(() => { const c = window.__laurel.ctx; window.__svg = null; c.download = async (blob) => { window.__svg = await blob.text(); }; window.__laurel.openExport(); });
  await settle(page, 400);
  await page.locator('button.dest', { hasText: 'SVG' }).first().click(); await settle(page, 300);
  await page.getByRole('button', { name: 'Download SVG' }).click();
  await page.waitForFunction(() => window.__svg, null, { timeout: 30000 });
  const svg = await page.evaluate(() => window.__svg);
  assert.doesNotMatch(svg, /class="(grid|guides|picked)"|class="[^"]*\bpicked\b/);
  assert.deepEqual(errors, []);
  await context.close();
});
