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
