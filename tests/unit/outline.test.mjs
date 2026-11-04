// D23: outlined text keeps the order a browser shows; right-to-left words read right to left, numbers inside stay in order
import test from 'node:test';
import assert from 'node:assert/strict';
import { bidiLevels, visualOrder } from '../../prototype/outline.js';

const visual = (s) => { const cs = [...s], lv = bidiLevels(cs); return visualOrder(cs.map((c, i) => ({ c, l: lv[i] })), (x) => x.l).map((x) => x.c).join(''); };

test('Latin text is left alone', () => {
  assert.equal(visual('Winner 2026'), 'Winner 2026');
  assert.deepEqual(bidiLevels([...'Best Film']), Array(9).fill(0));
});

test('Arabic reads right to left and its year stays 2026', () => {
  const s = 'مهرجان 2026';
  const v = visual(s);
  assert.ok(v.startsWith('2026 '), v);
  assert.equal(v.slice(5), [...'مهرجان'].reverse().join(''));
});

test('Hebrew inside an English line: the Hebrew and the year after it read right to left, as a browser shows them', () => {
  assert.equal(visual('Festival פסטיבל 2026'), 'Festival 2026 ' + [...'פסטיבל'].reverse().join(''));
});

test('marks stay with their letter and nothing is lost', () => {
  const s = 'مُهرجان', lv = bidiLevels([...s]);
  assert.equal(lv[1], lv[0]);
  assert.equal([...visual(s)].sort().join(''), [...s].sort().join(''));
});
