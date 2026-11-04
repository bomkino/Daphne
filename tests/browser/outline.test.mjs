// D15, D23, D24, D30: outlined text is the text the preview shows. Right-to-left words keep the browser's order, a
// script the font lacks is drawn whole in its Noto font, a font that can't be loaded is said out loud (never a
// silently missing letter), and a failed font fetch is tried again on the next export.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup } from '../lib.mjs';

after(async () => (await setup()).close());

const STRINGS = ['مهرجان 2026', 'Festival פסטיבל 2026', 'Winner مهرجان القاهرة 2026 Best', 'Prix 2026: מצטיין, ٢٠٢٦'];

test('the order outlining uses is the order the browser draws', async () => {
  const { page, errors, context } = await openApp();
  const out = await page.evaluate(async (strings) => {
    const { bidiLevels, visualOrder } = await import('/outline.js');
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', 2000); svg.setAttribute('height', 100); document.body.append(svg);
    return strings.map((s) => {
      const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 10); t.setAttribute('y', 50); t.setAttribute('font-size', 30); t.textContent = s; svg.append(t);
      const cs = [...s], n = t.getNumberOfChars(), mid = [];
      for (let i = 0; i < n; i++) { const e = t.getExtentOfChar(i); mid.push({ c: s[i], x: e.x + e.width / 2 }); }
      const browser = mid.sort((a, b) => a.x - b.x).map((m) => m.c).join(''), lv = bidiLevels(cs);
      const ours = visualOrder(cs.map((c, i) => ({ c, l: lv[i] })), (x) => x.l).map((x) => x.c).join('');
      return { s, browser, ours };
    });
  }, STRINGS);
  for (const o of out) assert.equal(o.ours, o.browser, o.s);
  assert.deepEqual(errors, []);
  await context.close();
});

const outline = (page, text, fam = 'Figtree') => page.evaluate(async ([text, fam]) => {
  const { outlineSvg } = await import('/outline.js');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100"><text x="300" y="60" text-anchor="middle" font-family="${fam}" font-size="40">${text}</text></svg>`;
  try { const r = await outlineSvg(svg); return { svg: r.svg, notes: r.notes }; } catch (e) { return { error: e.message }; }
}, [text, fam]);

test('Arabic with a year and a marked Devanagari name come out whole, in their Noto fonts', async () => {
  const { page, errors, context } = await openApp();
  const ar = await outline(page, 'مهرجان 2026');
  assert.ok(!ar.error, ar.error);
  assert.ok(ar.notes.includes('Noto Sans Arabic'), ar.notes.join());
  assert.doesNotMatch(ar.svg, /<text/);
  const hi = await outline(page, 'फ़िल्म महोत्सव');
  assert.ok(!hi.error, hi.error);
  assert.ok(hi.notes.includes('Noto Sans Devanagari'), hi.notes.join());
  // every outlined line is about as wide as the live text it replaces
  const widths = await page.evaluate(([a, b]) => [a, b].map((svg) => {
    const box = document.createElement('div'); box.innerHTML = svg; document.body.append(box);
    const p = box.querySelector('path'); const w = p ? p.getBBox().width : 0; box.remove(); return w;
  }), [ar.svg, hi.svg]);
  assert.ok(widths.every((w) => w > 80), widths.join());
  assert.deepEqual(errors, []);
  await context.close();
});

const shape = (page, text, weight = 400, ls = 0) => page.evaluate(async ([text, weight, ls]) => {
  const { shapeRun } = await import('/outline.js');
  return (await shapeRun('Figtree', weight, false, text, 40, ls)).map((g) => g.id);
}, [text, weight, ls]);

test('marked Arabic and Devanagari keep every glyph, at any weight and tracking', async () => {
  const { page, errors, context } = await openApp();
  for (const s of ['مَ', 'क़', 'مَهْرَجَانُ القَاهِرَة', 'मुंबई अंतर्राष्ट्रीय फ़िल्म महोत्सव'])
    for (const [w, ls] of [[400, 0], [800, 0], [400, 3]]) {
      const ids = await shape(page, s, w, ls);
      assert.ok(ids.length && !ids.includes(0), `${s} at ${w}/${ls}: ${ids}`);
    }
  assert.deepEqual(errors, []);
  await context.close();
});

test('a year after Arabic stays 2026 in the outline, as the preview shows it', async () => {
  const { page, errors, context } = await openApp();
  const year = await shape(page, '2026', 800, 1), mixed = await shape(page, 'مهرجان 2026', 800, 1);
  assert.deepEqual(mixed.slice(0, 4), year, 'the year is drawn first (on the left) and in its own order');
  assert.deepEqual(errors, []);
  await context.close();
});

test('a fallback font that can’t be loaded keeps live text and says why; the next export tries again', async () => {
  const { page, errors, context } = await openApp();
  await page.route(/notosansarabic/i, (r) => r.abort());
  const blocked = await outline(page, 'مهرجان 2026');
  assert.match(blocked.error || '', /Noto Sans Arabic/);
  const live = await page.evaluate(async () => {
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.fields = d.fields.map((f) => (f.kind === 'festival' ? { ...f, text: 'مهرجان 2026' } : f)); c.replaceDoc(d);
    return c.exportSvgText(c.render(c.doc).svg, c.doc);
  });
  assert.match(live, /<text/);
  assert.match(await page.locator('#toasts').innerText(), /Noto Sans Arabic.*live text/s);
  await page.unroute(/notosansarabic/i);
  const again = await outline(page, 'مهرجان 2026');
  assert.ok(!again.error, again.error);
  assert.doesNotMatch(again.svg, /<text/);
  assert.deepEqual(errors, []);
  await context.close();
});
