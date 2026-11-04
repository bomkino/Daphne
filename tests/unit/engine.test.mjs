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

// D19: an arc with no length still draws a finite laurel, with any crossing
import { FORMS } from '../../prototype/engine.mjs';
test('start and end at the same angle stay finite in every form', () => {
  for (const form of Object.keys(FORMS)) for (const a of [160, 200]) for (const cross of [0, 1, 26, 50]) {
    const d = applyForm(clone(DEFAULT_DOC), form); Object.assign(d.branch.spine, { a0: a, a1: a, cross });
    const r = render(d, { measure });
    assert.ok(r.viewBox.every(Number.isFinite) && !/NaN/.test(r.svg), `${form} ${a} cross ${cross}: ${r.viewBox}`);
  }
});

// D05, D38: a document from a link is checked before it is used
import { sanitizeDoc } from '../../prototype/engine.mjs';
test('a broken or hostile document is cleaned or refused', () => {
  assert.throws(() => sanitizeDoc(null)); assert.throws(() => sanitizeDoc([1])); assert.throws(() => sanitizeDoc('x'));
  assert.throws(() => sanitizeDoc({ fields: null })); assert.throws(() => sanitizeDoc({ canvas: 5 })); assert.throws(() => sanitizeDoc({ fields: ['x'] })); assert.throws(() => sanitizeDoc({ roles: null }));
  const d = sanitizeDoc({ roles: { hero: { weight: '800" data-x="1' } }, paint: { branch: '#fff" data-audit-marker="harmless' }, layout: { dy: Infinity } });
  assert.ok(!('dy' in d.layout));
  const r = render({ ...clone(DEFAULT_DOC), ...d, roles: { ...clone(DEFAULT_DOC).roles, ...d.roles }, paint: { ...clone(DEFAULT_DOC).paint, ...d.paint } }, { measure });
  assert.doesNotMatch(r.svg, /data-x|data-audit-marker/);
  const g = sanitizeDoc({ fields: [{ id: 'a" b', kind: 'festival', text: 'Fest "<b>"' }] });
  assert.equal(g.fields.length, 1); assert.match(g.fields[0].id, /^[\w-]+$/); assert.equal(g.fields[0].text, 'Fest "<b>"');
});

// D26: any pasted leaf shape is read in bounded time, with every SVG command, and never draws NaN
import { parsePath } from '../../prototype/engine.mjs';
const leafDoc = (path) => { const d = clone(DEFAULT_DOC); d.branch.leaf.family = 'custom'; d.branch.leaf.path = path; return d; };
test('a number after a closed path does not hang', () => {
  const t = Date.now();
  assert.deepEqual(parsePath('M0 0 L100 0 Z 0'), [['M', 0, 0], ['L', 100, 0], ['Z']]);
  assert.ok(Date.now() - t < 200);
});
test('smooth curves and arcs are drawn, not dropped', () => {
  const q = parsePath('M0 0 Q25 -20 50 0 T100 0');
  assert.deepEqual(q.map((c) => c[0]), ['M', 'Q', 'Q']);
  assert.deepEqual(q[2], ['Q', 75, 20, 100, 0]);
  const a = parsePath('M0 0 A50 25 0 0 1 100 0');
  assert.ok(a.length >= 3 && a.slice(1).every((c) => c[0] === 'C'), JSON.stringify(a));
  assert.deepEqual(a.at(-1).slice(-2), [100, 0]);
  assert.ok(a.slice(1).some((c) => c[2] < -10 || c[4] < -10), 'the arc bows away from the line');
  assert.deepEqual(parsePath('M0 0a5 5 0 1020 0').at(-1).slice(-2), [20, 0], 'arc flags written together');
});
test('exponent forms are numbers', () => {
  assert.deepEqual(parsePath('M1E2 0 L2e-1 3'), [['M', 100, 0], ['L', 0.2, 3]]);
});
test('a cut-off or broken shape keeps only whole commands', () => {
  assert.deepEqual(parsePath('M0 0 L10'), [['M', 0, 0]]);
  assert.deepEqual(parsePath(''), []);
  assert.deepEqual(parsePath('hello'), []);
  assert.deepEqual(parsePath('M0 0 L1e308 0 l1e308 0'), [['M', 0, 0], ['L', 1e308, 0]]);
  assert.deepEqual(parsePath('<path d="M0 0 L5 5"/>'), [['M', 0, 0], ['L', 5, 5]]);
  const big = 'M0 0' + ' L1 1'.repeat(50000), t = Date.now();
  assert.ok(parsePath(big).length <= 4001 && Date.now() - t < 500);
});
test('every pasted shape draws a finite laurel', () => {
  for (const p of ['M0 0 L100 0 Z 0', 'M0 0 A50 25 0 0 1 100 0 A50 25 0 0 1 0 0Z', 'M0 0 Q25 -20 50 0 T100 0 T0 0', 'M0 0 L10', 'garbage', 'M0 0', 'M1E2 0 L2E1 3 L0 0Z']) {
    const r = render(leafDoc(p), { measure });
    assert.ok(r.viewBox.every(Number.isFinite) && !/NaN|Infinity/.test(r.svg), p);
    assert.match(r.svg, /<path[^>]+d="M[\d.-]+ [\d.-]+[CQL]/, `${p} draws leaves`);
  }
});
