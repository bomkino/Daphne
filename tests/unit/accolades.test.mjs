// D22: the Accolades text says only what the laurels claim. Ranking orders them; it never decides what happened.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accoladesOf, outcomeOf, statusRank } from '../../prototype/rules.js';

const doc = (self = {}, row = []) => ({
  fields: Object.entries(self).map(([kind, text]) => ({ kind, text })),
  row: { items: row.map((it, i) => ({ id: 'r' + i, ...it })) },
});

test('a nomination for an award is never a win', () => {
  const a = accoladesOf(doc({ status: 'Audience Award Nominee', award: 'Audience Award', festival: 'Daphne Test Festival', year: '2026' }));
  assert.doesNotMatch(a.sentence, /winner/i);
  assert.match(a.sentence, /Audience Award Nominee at Daphne Test Festival 2026/);
});

test('a finalist for a jury prize is never a win', () => {
  const a = accoladesOf(doc({ status: 'Jury Prize Finalist', festival: 'Daphne Test Festival', year: '2026' }));
  assert.doesNotMatch(a.sentence, /winner/i);
});

test('a festival and year with no status is not a selection', () => {
  const a = accoladesOf(doc({ festival: 'Daphne Test Festival', year: '2026' }));
  assert.equal(a.list.length, 1);
  assert.doesNotMatch(a.sentence, /selection|selected/i);
});

test('submissions are not selections', () => {
  const a = accoladesOf(doc({}, [{ status: 'Submitted', festival: 'Festival A', year: 2026 }, { status: 'Official Submission', festival: 'Festival B', year: 2026 }]));
  assert.doesNotMatch(a.sentence, /selected|selection/i);
});

test('row artwork with only festival and year is not a selection', () => {
  const a = accoladesOf(doc({}, [{ src: 'asset1', festival: 'Festival A', year: 2026 }]));
  assert.doesNotMatch(a.sentence, /selection|selected/i);
});

test('explicit winners keep their prose', () => {
  const a = accoladesOf(doc({ status: 'Winner', award: 'Best Short Film', festival: 'Daphne Test Festival', year: '2026' }));
  assert.match(a.sentence, /Winner of Best Short Film at Daphne Test Festival 2026\./);
  const b = accoladesOf(doc({ status: 'Grand Jury Prize Winner', festival: 'Daphne Test Festival', year: '2026' }));
  assert.match(b.sentence, /Winner of Grand Jury Prize at Daphne Test Festival 2026\./);
});

test('selections at two festivals still count', () => {
  const a = accoladesOf(doc({ status: 'Official Selection', festival: 'Festival A', year: '2026' }, [{ status: 'World Premiere', festival: 'Festival B', year: 2025 }]));
  assert.match(a.sentence, /World Premiere at Festival B 2025\./);
  assert.match(a.sentence, /Selected for 2 festivals/);
});

test('an award line with no status is said as written, not strengthened', () => {
  const a = accoladesOf(doc({ award: 'Best Editing', festival: 'Daphne Test Festival', year: '2026' }));
  assert.match(a.sentence, /^Best Editing at Daphne Test Festival 2026\.$/);
});

test('hidden row laurels are left out', () => {
  const a = accoladesOf(doc({}, [{ status: 'Official Selection', festival: 'Festival A', year: 2026 }, { status: 'Winner', award: 'Best Film', festival: 'Festival B', year: 2026, show: false }]));
  assert.equal(a.count, 1);
  assert.doesNotMatch(a.sentence, /Festival B/);
});

test('semi-finalist ranks below finalist, and a nominee below a selection', () => {
  assert.ok(statusRank('Semi-Finalist') < statusRank('Finalist'));
  assert.ok(statusRank('Audience Award Nominee') < statusRank('Official Selection'));
  assert.ok(statusRank('Winner') > statusRank('Special Mention'));
});

test('outcomes are read from qualifiers first', () => {
  assert.equal(outcomeOf('Audience Award Nominee', 'Audience Award'), 'nomination');
  assert.equal(outcomeOf('Honorable Mention', 'Best Director'), 'mention');
  assert.equal(outcomeOf('Official Submission', ''), 'submitted');
  assert.equal(outcomeOf('', 'Best Editing'), 'honor');
  assert.equal(outcomeOf('', ''), 'none');
  assert.equal(outcomeOf('Award Winner', ''), 'win');
  assert.equal(outcomeOf('In Competition', ''), 'selection');
});
