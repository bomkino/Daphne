import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup } from '../lib.mjs';

after(async () => (await setup()).close());

test('the app opens on the default laurel with no errors', async () => {
  const { page, errors, context } = await openApp();
  const words = await page.$$eval('#stage svg text', (ts) => ts.map((t) => t.textContent));
  assert.ok(words.includes('2026'), words.join('|'));
  assert.deepEqual(errors, []);
  await context.close();
});
