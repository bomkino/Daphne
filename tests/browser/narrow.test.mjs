// D11, D45, V01: at phone widths nothing hangs off the screen or covers its neighbor
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('the font picker fits a 320 px screen', async () => {
  const { page, errors, context } = await openApp({ viewport: { width: 320, height: 568 } });
  await page.evaluate(() => window.__laurel.setTab('type')); await settle(page, 300);
  await page.locator('.fontbtn').first().click(); await settle(page, 200);
  const box = await page.locator('.fontpop').boundingBox(), vw = await page.evaluate(() => document.documentElement.clientWidth);
  assert.ok(box.x >= 0 && box.x + box.width <= vw, `picker ${box.x}..${box.x + box.width} on a ${vw} px page`);
  assert.ok(await page.getByRole('searchbox', { name: 'Search fonts' }).isVisible());
  assert.deepEqual(errors, []);
  await context.close();
});

// D45: on a phone the stacked previews push the options down instead of covering them
for (const dest of ['Laurel kit', 'Email signature']) {
  test(`${dest} previews don’t overlap the options at 320 px`, async () => {
    const { page, errors, context } = await openApp({ viewport: { width: 320, height: 568 } });
    await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
    await page.locator('button.dest', { hasText: dest }).click(); await settle(page, 500);
    if (dest === 'Laurel kit') { for (const box of await page.locator('.modal .opts .checks').first().locator('input[type=checkbox]').all()) if (!(await box.isChecked())) await box.check(); await settle(page, 500); } // every colorway: three stacked previews
    const r = await page.evaluate(() => {
      const pv = document.querySelector('.modal .preview'), opts = document.querySelector('.modal .opts');
      const kids = [...pv.querySelectorAll('.pv > *, .frame, .cap')].map((e) => e.getBoundingClientRect().bottom);
      return { pvBottom: pv.getBoundingClientRect().bottom, contentBottom: Math.max(...kids), optsTop: opts.getBoundingClientRect().top, scrollW: document.documentElement.scrollWidth, vw: innerWidth };
    });
    assert.ok(r.contentBottom <= r.pvBottom + 1, `preview content ends at ${r.contentBottom}, its area at ${r.pvBottom}`);
    assert.ok(r.pvBottom <= r.optsTop + 1, `options start at ${r.optsTop}, above the preview's end ${r.pvBottom}`);
    assert.ok(r.scrollW <= r.vw, `page ${r.scrollW} px wide on a ${r.vw} px screen`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

// V02: an open preview follows the window: no stale letterbox after a resize
test('the Pitch deck preview keeps its 16:9 shape when the window changes', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
  await page.locator('button.dest', { hasText: 'Pitch deck' }).click(); await settle(page, 400);
  for (const [w, hh] of [[861, 700], [860, 700], [1440, 900], [700, 1000]]) {
    await page.setViewportSize({ width: w, height: hh }); await settle(page, 400);
    const b = await page.locator('.modal .preview .frame svg').first().boundingBox();
    assert.ok(Math.abs(b.width / b.height - 16 / 9) < 0.02, `${w}×${hh}: ${b.width.toFixed(1)}×${b.height.toFixed(1)}`);
    const pv = await page.locator('.modal .preview').boundingBox();
    assert.ok(b.width <= pv.width + 1, `${w}×${hh}: preview ${b.width} wider than its area ${pv.width}`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

// V01: Small sizes never covers the laurel or widens the page; its proofs stay exactly 160, 100 and 64 px tall
const FLANK = async (page) => page.evaluate(async () => {
  const { applyForm } = await import('/engine.mjs'); const c = window.__laurel.ctx;
  const d = applyForm(c.clone(c.doc), 'flank'); d.fields = d.fields.map((f) => (f.kind === 'festival' ? { ...f, text: 'International Documentary Film Festival' } : f)); c.replaceDoc(d);
});
for (const [w, hh] of [[1440, 900], [1024, 768], [390, 844], [320, 568]]) for (const wide of [false, true]) {
  test(`Small sizes at ${w} px${wide ? ', a wide flank laurel' : ''}`, async () => {
    const { page, errors, context } = await openApp({ viewport: { width: w, height: hh } });
    if (wide) await FLANK(page);
    await page.locator('button', { hasText: 'Small sizes' }).click(); await settle(page, 700);
    const r = await page.evaluate(() => {
      const box = document.querySelector('.small-sizes').getBoundingClientRect(), art = document.querySelector('#stage svg').getBoundingClientRect();
      const overlap = Math.max(0, Math.min(box.right, art.right) - Math.max(box.left, art.left)) * Math.max(0, Math.min(box.bottom, art.bottom) - Math.max(box.top, art.top));
      const heights = [...document.querySelectorAll('.small-sizes .pair svg')].map((s) => Math.round(s.getBoundingClientRect().height));
      return { overlap, scrollW: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, heights };
    });
    assert.equal(r.overlap, 0, 'the panel covers the laurel');
    assert.ok(r.scrollW <= r.vw, `page ${r.scrollW} px wide on a ${r.vw} px screen`);
    assert.deepEqual(r.heights, [160, 160, 100, 100, 64, 64]);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

// V06: the chosen size and place of every line read in full, on a desktop and a phone
for (const [w, hh] of [[1440, 900], [390, 844]]) {
  test(`Every line labels fit at ${w} px`, async () => {
    const { page, errors, context } = await openApp({ viewport: { width: w, height: hh } });
    await page.evaluate(() => { const c = window.__laurel.ctx; c.change('fields', c.doc.fields.map((f, i) => (i === 0 ? { ...f, slot: 'arc-bottom', role: 'eyebrow' } : f)), true); });
    await page.locator('summary', { hasText: /Every line/ }).first().click(); await settle(page, 300);
    const cut = await page.evaluate(() => { const c = document.createElement('canvas').getContext('2d'); return [...document.querySelectorAll('.field .meta select')].map((s) => { const cs = getComputedStyle(s); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const t = s.options[s.selectedIndex].text; return { t, need: c.measureText(t).width, room: s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) }; }).filter((x) => x.need > x.room + 0.5); });
    assert.deepEqual(cut, []);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

// V09: Story's lead keeps its own, shorter measure; the body copy's rule doesn't override it
test('Story’s lead is narrower than the paragraph under it', async () => {
  const { page, errors, context } = await openApp({ path: 'story/' });
  await settle(page, 500);
  const r = await page.evaluate(() => { const l = document.querySelector('.after .lede'); return { lede: l.getBoundingClientRect().width, next: l.nextElementSibling.getBoundingClientRect().width }; });
  assert.ok(r.lede < r.next - 40, JSON.stringify(r));
  assert.deepEqual(errors, []);
  await context.close();
});
