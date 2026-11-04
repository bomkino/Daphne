// Row: each laurel in the row says its own festival, whatever layout the base laurel is in (D21).
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup } from '../lib.mjs';

after(async () => (await setup()).close());

for (const layout of ['winner', 'award-detail', 'star-winner', 'award-festival-hero', 'year-below']) {
  test(`an award-led base in ${layout} keeps festival names on non-award row laurels`, async () => {
    const { page, errors, context } = await openApp();
    const shown = await page.evaluate((layout) => {
      const c = window.__laurel.ctx, L = c.layoutById(layout);
      let d = c.clone(c.doc);
      d.fields = [
        { id: 'a', kind: 'status', text: 'Winner', role: 'eyebrow', slot: 'inside', show: true },
        { id: 'b', kind: 'award', text: 'Best Documentary', role: 'hero', slot: 'inside', show: true },
        { id: 'c', kind: 'festival', text: 'Halcyon Film Festival', role: 'sub', slot: 'inside', show: true },
        { id: 'e', kind: 'year', text: '2026', role: 'sub', slot: 'inside', show: true },
      ];
      let n = 0; d.fields = c.layoutFields(d.fields, L, () => 'x' + n++); Object.assign(d, { layoutId: layout, layoutBy: 'user', userLayoutId: layout });
      d.row = { ...(d.row || {}), items: [
        { id: 'r1', status: 'Official Selection', festival: 'Northlight', award: '', year: '2026' },
        { id: 'r2', status: 'Winner', festival: 'Halcyon Film Festival', award: 'Best Documentary', year: '2026' },
        { id: 'r3', status: 'World Premiere', festival: 'Atlas Film Festival', award: '', year: '2026' },
      ], order: 'manual', arrange: 'row', perRow: 4, uniform: true, gap: 0.14, lead: 1.3 };
      c.replaceDoc(d);
      const sc = c.rowScene();
      return sc.parts.map((p) => p.d.fields.filter((f) => f.show !== false && f.text).map((f) => f.text).join(' / '));
    }, layout);
    assert.match(shown[0], /Northlight/, shown[0]);
    if (layout !== 'year-below') assert.match(shown[1], /Halcyon Film Festival/, shown[1]);
    assert.match(shown[2], /Atlas Film Festival/, shown[2]);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
