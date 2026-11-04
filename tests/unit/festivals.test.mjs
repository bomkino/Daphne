// J08: a festival that moved gets the city of the edition's year, never a guess.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivalById, festivalFromText, cityFor, yearOf } from '../../prototype/festivals.js';

test('Sundance 2026 was in Park City; 2027 is in Boulder', () => {
  const f = festivalById('sundance');
  assert.equal(cityFor(f, '2026'), 'Park City');
  assert.equal(cityFor(f, 'MMXXVI'), 'Park City');
  assert.equal(cityFor(f, '’26'), 'Park City');
  assert.equal(cityFor(f, '2027'), 'Boulder');
  assert.equal(cityFor(f, 'MMXXVII'), 'Boulder');
});

test('an unread year gives no city for a festival that moved', () => {
  assert.equal(cityFor(festivalById('sundance'), ''), null);
  assert.equal(cityFor(festivalById('sundance'), 'next year'), null);
});

test('a festival that never moved keeps its city', () => {
  const f = festivalFromText('Berlinale');
  assert.equal(cityFor(f, ''), 'Berlin');
  assert.equal(yearOf("'26"), 2026);
});
