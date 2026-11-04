// D01: the email reader must never invent or strengthen a result. Cases from the November 3 audit, plus controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readEmail } from '../../prototype/email.js';

const sel = 'Dear filmmaker, congratulations! We are delighted to inform you that your film "The Quiet Hours" has been selected for the 12th Northlight Film Festival 2026.';

test('a selection stays a selection when the email mentions winners still to come', () => {
  const r = readEmail(sel + ' Winning films will be announced on closing night.');
  assert.equal(r.status, 'Official Selection'); assert.ok(!r.unsure);
});
test('a rejection stays a rejection when it congratulates the selected filmmakers', () => {
  const r = readEmail('Dear filmmaker, we regret to inform you that your film was not selected for the Northlight Film Festival 2026. Congratulations to the selected filmmakers, and thank you for submitting.');
  assert.deepEqual(r, { declined: true });
});
test('a win stays a win when it was chosen from finalists', () => {
  const r = readEmail('Congratulations! Your film "The Quiet Hours" won Best Documentary at the Northlight Film Festival 2026, chosen from among five finalists.');
  assert.equal(r.status, 'Winner'); assert.equal(r.award, 'Best Documentary'); assert.ok(!r.unsure);
});
test('an acceptance is not a decline because travel is not covered', () => {
  const r = readEmail('Your film has been accepted into the Northlight Film Festival 2026. Unfortunately, travel and accommodation are not covered.');
  assert.equal(r.status, 'Official Selection');
});
test('a nomination is not a win when the email says winners will be announced', () => {
  const r = readEmail('We are pleased to tell you that your film has been nominated for the Audience Award at the Northlight Film Festival 2026. The winner will be announced at the closing gala.');
  assert.equal(r.status, 'Nominee'); assert.equal(r.award, 'Audience Award');
});
test('eligibility is not a result', () => {
  const r = readEmail(sel + ' All films in competition are eligible for the Audience Award.');
  assert.equal(r.status, 'Official Selection'); assert.equal(r.award, undefined);
});
test('a finalist stays a finalist', () => {
  const r = readEmail('Congratulations, your film is a finalist for Best Short Film at the Northlight Film Festival 2026.');
  assert.equal(r.status, 'Finalist');
});
test('a plain decline is still recognized', () => {
  assert.deepEqual(readEmail('Thank you for submitting to the Northlight Film Festival. Unfortunately your film has not been selected this year.'), { declined: true });
});
test('a decline and a result together are left for the filmmaker to check', () => {
  const r = readEmail('We regret to inform you that your film was not selected for the competition. However, your film has been selected for the Panorama section of the Northlight Film Festival 2026.');
  assert.equal(r.status, 'Official Selection'); assert.equal(r.unsure, true);
});
test('a win said of someone else is not this film’s win', () => {
  const r = readEmail('The Northlight Film Festival 2026 Best Documentary winner is announced today.');
  assert.ok(!r || r.status !== 'Winner' || r.unsure, JSON.stringify(r));
});
test('an explicit award is read with its festival and year', () => {
  const r = readEmail('Congratulations! Your film has been awarded the Grand Jury Prize at the Northlight Film Festival 2026.');
  assert.equal(r.status, 'Winner'); assert.equal(r.award, 'Grand Jury Prize'); assert.equal(r.year, '2026');
});
test('a world premiere is read', () => {
  assert.equal(readEmail('We are delighted that your film will have its World Premiere at the Northlight Film Festival 2026.').status, 'World Premiere');
});
