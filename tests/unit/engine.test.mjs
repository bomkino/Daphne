import test from 'node:test';
import assert from 'node:assert/strict';
import { render, DEFAULT_DOC, clone } from '../../prototype/engine.mjs';

// a fixed-width measure, so engine tests don't need a browser
export const measure = (s, font, weight, italic, size) => String(s).length * size * 0.55;

test('the default laurel renders with a finite canvas', () => {
  const r = render(clone(DEFAULT_DOC), { measure });
  assert.equal(r.viewBox.length, 4);
  assert.ok(r.viewBox.every(Number.isFinite), `viewBox ${r.viewBox}`);
  assert.ok(r.viewBox[2] > 0 && r.viewBox[3] > 0);
});

// L04: two lines in the medallion both show; nothing marked Show goes missing from the artwork
const badgeDoc = (extra) => {
  const d = clone(DEFAULT_DOC);
  d.fields = [
    { id: 'a', kind: 'status', text: 'Official Selection', role: 'eyebrow', slot: 'inside', show: true },
    { id: 'b', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: true },
    { id: 'c', kind: 'year', text: '2026', role: 'sub', slot: 'badge', show: true },
    ...extra,
  ];
  return d;
};
const textOf = (svg) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' | ');

test('a second line in the medallion is shown, not dropped', () => {
  const r = render(badgeDoc([{ id: 'd', kind: 'edition', text: '75th', role: 'sub', slot: 'badge', show: true }]), { measure });
  const t = textOf(r.svg);
  assert.match(t, /2026/, t);
  assert.match(t, /75TH|75th/, t);
});

test('a long medallion line comes with a warning', () => {
  const d = badgeDoc([]); d.fields[0].slot = 'badge';
  const r = render(d, { measure });
  assert.match(textOf(r.svg), /official selection/i);
  assert.ok(r.report.warnings.some((w) => /medallion/.test(w)), r.report.warnings.join(' | '));
});

test('a year alone in the medallion reads without a warning', () => {
  const r = render(badgeDoc([]), { measure });
  assert.ok(!r.report.warnings.some((w) => /medallion/.test(w)), r.report.warnings.join(' | '));
});

// D20: print advice reads the smallest words from what is drawn, in every slot
import { smallestText, applyForm } from '../../prototype/engine.mjs';

test('the smallest words are measured in a flank laurel too', () => {
  const d = applyForm(clone(DEFAULT_DOC), 'flank');
  d.fields = d.fields.map((f) => (f.kind === 'festival' ? { ...f, text: 'Daphne Test Festival' } : f));
  const r = render(d, { measure });
  const sizes = [...r.svg.matchAll(/<text\b[^>]*font-size="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(sizes.length, 'flank draws text');
  assert.equal(smallestText(r.svg), Math.min(...sizes));
});

test('a laurel with no words has no smallest size', () => {
  assert.equal(smallestText('<svg><path d="M0 0"/><text font-size="4"> </text></svg>'), Infinity);
});
