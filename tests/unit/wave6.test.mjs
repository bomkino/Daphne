// Wave 6. C01: curved words too long for their curve say so, instead of losing letters off the ends. C02: any text
// the filmmaker types stays valid XML in the artwork: "]]>" is escaped and characters XML forbids are dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { render, DEFAULT_DOC, clone, applyForm } from '../../prototype/engine.mjs';

const measure = (s, font, weight, italic, size) => String(s).length * size * 0.55;
const withFields = (fields, form) => { let d = clone(DEFAULT_DOC); if (form) d = applyForm(d, form); d.fields = fields; return d; };
const LONG = 'Official Selection of the International Festival of Very Long Names for Films and Their Makers '.repeat(4).trim();

test('C01: curved words longer than the wreath’s curve come with a warning', () => {
  const r = render(withFields([
    { id: 'a', kind: 'status', text: LONG, role: 'arc', slot: 'arc-top', show: true },
    { id: 'b', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: true },
  ]), { measure });
  assert.ok(r.report.warnings.some((w) => /too long to curve/.test(w)), r.report.warnings.join('\n'));
});

test('C01: short curved words carry no such warning', () => {
  const r = render(withFields([
    { id: 'a', kind: 'status', text: 'Official Selection', role: 'arc', slot: 'arc-top', show: true },
    { id: 'b', kind: 'festival', text: 'Northlight', role: 'hero', slot: 'inside', show: true },
  ]), { measure });
  assert.ok(!r.report.warnings.some((w) => /too long to curve/.test(w)), r.report.warnings.join('\n'));
});

test('C02: "]]>" and forbidden control characters never reach the artwork’s XML', () => {
  const r = render(withFields([
    { id: 'a', kind: 'status', text: 'Selection ]]> Here', role: 'eyebrow', slot: 'inside', show: true },
    { id: 'b', kind: 'festival', text: 'North\u0001light\u000B\uD800Fest', role: 'hero', slot: 'inside', show: true },
    { id: 'c', kind: 'year', text: '2026', role: 'arc', slot: 'arc-under', show: true },
  ]), { measure });
  assert.doesNotMatch(r.svg, /\]\]>/, 'the literal "]]>" is escaped');
  assert.doesNotMatch(r.svg, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, 'no control characters');
  assert.doesNotMatch(r.svg, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/, 'no broken surrogate halves');
  assert.match(r.svg, /Northlight/i, 'the words themselves are kept');
  assert.match(r.svg, /Selection \]\]&gt; Here/i);
});
