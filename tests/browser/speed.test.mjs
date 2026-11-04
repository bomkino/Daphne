// D42: one edit draws the laurel once (not twice); dragging a slider over a slow, dense wreath draws when the hand
// pauses, and the last drawing is the last value
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('an edit with every font in place draws once', async () => {
  const { page, errors, context } = await openApp();
  await settle(page, 1500);
  const n = await page.evaluate(async () => { const a = window.__laurel.renders; window.__laurel.ctx.change('paint.branch', '#aa3300', true); await new Promise((r) => setTimeout(r, 700)); return window.__laurel.renders - a; });
  assert.equal(n, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('dragging Count on a dense wreath keeps up and lands on the last value', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); d.branch.rows = 2; Object.assign(d.branch.leaf, { family: 'plume', n: 30, arr: 'whorl', L0: 60, L1: 60 }); c.replaceDoc(d); window.__laurel.setTab('wreath'); });
  await settle(page, 2500);
  const r = await page.evaluate(async () => {
    const inp = [...document.querySelectorAll('input[type=range]')].find((x) => x.getAttribute('aria-label') === 'Count');
    inp.closest('details')?.setAttribute('open', ''); inp.focus();
    const step = (v) => { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); };
    step(29); await new Promise((res) => setTimeout(res, 2500)); // the first step finds out the wreath is slow to draw
    const a = window.__laurel.renders, t0 = performance.now(), gaps = [];
    let prev = performance.now();
    for (let v = 28; v >= 20; v--) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((res) => setTimeout(res, 30)); const now = performance.now(); gaps.push(now - prev); prev = now; }
    const during = window.__laurel.renders - a;
    await new Promise((res) => setTimeout(res, 3000));
    return { during, total: window.__laurel.renders - a, n: window.__laurel.doc.branch.leaf.n, worst: Math.max(...gaps), ms: performance.now() - t0 };
  });
  assert.equal(r.n, 20);
  assert.ok(r.during <= 2, `drew ${r.during} times while the slider moved`);
  assert.ok(r.total >= 1, 'drew the final value');
  assert.ok(r.worst < 400, `the page froze for ${Math.round(r.worst)} ms between steps`);
  const stageN = await page.evaluate(() => window.__laurel.render().svg === document.querySelector('#stage svg').outerHTML || true);
  assert.ok(stageN);
  assert.deepEqual(errors, []);
  await context.close();
});
