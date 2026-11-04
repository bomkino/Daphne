// D10: redrawing the editor never drops keyboard focus to the page body; More/Fewer says whether it's open
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const focused = (page) => page.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : `${a.tagName}|${a.getAttribute('aria-label') || a.title || a.textContent.trim().slice(0, 30)}`; });

test('a tab opened from the keyboard keeps focus', async () => {
  const { page, errors, context } = await openApp();
  for (const name of ['Type', 'Color', 'Words']) {
    await page.locator(`#rail button[title="${name}"]`).focus();
    await page.keyboard.press('Enter'); await settle(page, 200);
    assert.equal(await focused(page), `BUTTON|${name}`);
    assert.equal(await page.locator(`#rail button[title="${name}"]`).getAttribute('aria-selected'), 'true');
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('typing a festival and tabbing on leaves focus on the next field after the redraw', async () => {
  const { page, errors, context } = await openApp({ viewport: { width: 390, height: 844 } });
  const fest = page.getByRole('combobox', { name: 'Festival name' });
  await fest.click(); await fest.fill(''); await page.keyboard.type('Northlight Film Festival', { delay: 10 });
  await page.keyboard.press('Escape'); await page.keyboard.press('Tab');
  const next = await focused(page);
  assert.notEqual(next, 'BODY');
  await settle(page, 900);
  assert.equal(await focused(page), next);
  assert.deepEqual(errors, []);
  await context.close();
});

test('More and Fewer say whether the extra statuses are showing', async () => {
  const { page, errors, context } = await openApp();
  const more = page.locator('button.chip.quiet', { hasText: /More, and other languages|Fewer/ });
  assert.equal(await more.getAttribute('aria-expanded'), 'false');
  await more.click(); assert.equal(await more.getAttribute('aria-expanded'), 'true');
  await more.click(); assert.equal(await more.getAttribute('aria-expanded'), 'false');
  assert.deepEqual(errors, []);
  await context.close();
});

test('choosing an Export destination from the keyboard keeps focus on it', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
  for (const name of ['Pitch deck', 'Poster and print', 'Laurel kit']) {
    const b = page.locator('button.dest', { hasText: name });
    await b.focus(); await page.keyboard.press('Enter'); await settle(page, 300);
    assert.match(await focused(page), new RegExp(`^BUTTON\\|${name}`));
  }
  assert.deepEqual(errors, []);
  await context.close();
});

// V07, V08: a lit control names the state that's on; an inherited paint shows what it inherits, unlike transparency
test('Mixed wreath is a switch, and inherited paints show their color', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setTab('wreath')); await settle(page, 300);
  await page.locator('button[role=switch]').evaluate((el) => el.closest('details')?.setAttribute('open', ''));
  const sw = page.getByRole('switch', { name: /Different right side/ });
  assert.equal(await sw.getAttribute('aria-checked'), 'false');
  await sw.click(); await settle(page, 300);
  await page.locator('button[role=switch]').evaluate((el) => el.closest('details')?.setAttribute('open', ''));
  const on = page.getByRole('switch', { name: /Different right side/ });
  assert.equal(await on.getAttribute('aria-checked'), 'true');
  assert.doesNotMatch(await on.innerText(), /Same both sides/);
  await page.evaluate(() => { window.__laurel.ctx.change('text.sub', null, true); window.__laurel.ctx.change('canvas.bg', null, true); window.__laurel.setTab('color'); }); await settle(page, 300);
  const sw2 = await page.evaluate(() => [...document.querySelectorAll('.paint')].map((p) => ({ l: p.querySelector('.lbl')?.textContent, bg: getComputedStyle(p.querySelector('.sw')).backgroundImage + getComputedStyle(p.querySelector('.sw')).backgroundColor, inh: p.querySelector('.sw').classList.contains('inherit') })));
  const by = (l) => sw2.find((x) => x.l === l);
  const small = by('Small text'), back = by('Background');
  assert.ok(small.inh, 'Small text is marked as inherited');
  assert.ok(/gradient/.test(small.bg) || !/rgba\(0, 0, 0, 0\)$/.test(small.bg), `Small text shows the main text's paint: ${small.bg}`);
  assert.ok(!back.inh && /conic/.test(back.bg), `no background shows as transparency: ${back.bg}`);
  assert.deepEqual(errors, []);
  await context.close();
});
