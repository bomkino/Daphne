// J01: a layout arranges the user's facts. It never writes an award, a place, an edition or a year, and it never
// drops the status that qualifies an award.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS, layoutFields } from '../../prototype/layouts.js';
import { checkLaurel } from '../../prototype/rules.js';

const F = (pairs) => pairs.map(([kind, text, role = 'sub'], i) => ({ id: 'u' + i, kind, text, role, slot: 'inside', show: true }));
const DOCS = {
  selection: F([['status', 'Official Selection', 'eyebrow'], ['festival', 'Northlight Film Festival', 'hero'], ['year', '2026']]),
  nomination: F([['status', 'Nominee', 'eyebrow'], ['award', 'Best Documentary', 'hero'], ['festival', 'Northlight Film Festival'], ['year', '2026']]),
  award: F([['status', 'Winner', 'eyebrow'], ['award', 'Best Documentary', 'hero'], ['festival', 'Northlight Film Festival'], ['year', '2026']]),
};
const shown = (fs) => fs.filter((f) => f.show !== false && f.text && f.kind !== 'icon');
let n = 0; const id = () => 'n' + n++;

for (const [name, fields] of Object.entries(DOCS)) {
  test(`every layout keeps to the facts of a ${name} laurel`, () => {
    const facts = new Set(fields.map((f) => f.text));
    for (const L of LAYOUTS) {
      const out = layoutFields(fields, L, id);
      for (const f of shown(out)) assert.ok(facts.has(f.text), `${L.name} wrote "${f.text}" (${f.kind})`);
    }
  });
}

test('a qualifying status stays with its award in every layout', () => {
  for (const L of LAYOUTS) {
    const out = shown(layoutFields(DOCS.nomination, L, id));
    if (out.some((f) => f.kind === 'award')) assert.ok(out.some((f) => f.kind === 'status' && f.text === 'Nominee'), `${L.name} showed the award without "Nominee"`);
  }
});

test('Star winner on a selection keeps Official Selection and asks for the award', () => {
  const out = layoutFields(DOCS.selection, LAYOUTS.find((L) => L.id === 'star-winner'), id);
  assert.ok(shown(out).some((f) => f.kind === 'status' && f.text === 'Official Selection'));
  const aw = out.find((f) => f.kind === 'award');
  assert.equal(aw.text, '');
  assert.equal(aw.added, true);
});

test('a winner may drop the status line in an award layout', () => {
  const out = shown(layoutFields(DOCS.award, LAYOUTS.find((L) => L.id === 'star-winner'), id));
  assert.ok(!out.some((f) => f.kind === 'status'));
  assert.ok(out.some((f) => f.text === 'Best Documentary'));
});

test('thumbnails can still show examples', () => {
  const out = layoutFields(DOCS.selection, LAYOUTS.find((L) => L.id === 'winner'), id, { examples: true });
  assert.ok(out.some((f) => f.kind === 'award' && f.text === 'Best Documentary'));
});

test('an older document with untouched example text is flagged', () => {
  const fields = [...DOCS.selection, { id: 'x', kind: 'award', text: 'Best Documentary', role: 'hero', slot: 'inside', show: true, added: true }];
  const notes = checkLaurel({ fields });
  assert.ok(notes.some((n) => /"Best Documentary" is example text/.test(n.text)), JSON.stringify(notes));
  assert.ok(!checkLaurel({ fields: DOCS.selection }).some((n) => /example text/.test(n.text)));
});
