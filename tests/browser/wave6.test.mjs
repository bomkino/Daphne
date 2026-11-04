// Wave 6, the journey's smaller repairs. A02: the Looks hint names what a touch screen can do. A05: Accolades reads as
// prose and never says Copied for nothing. A08: the guide stays one tap away on a phone. A09: the Story film has the way
// back to the maker beside it. A11: the Row's Show column is named. A15: outline settings show only with an outline.
// C03: pack folders never collide. C05: one pointer owns a placement; a cancel puts the line back.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

test('A02: on a touch screen the Looks hint says tap, not hover', async () => {
  const { browser } = await setup();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const { page, errors } = await openApp({ context });
  await page.evaluate(() => window.__laurel.setTab('looks')); await settle(page, 400);
  const hint = await page.locator('.tabhead p').first().innerText();
  assert.doesNotMatch(hint, /hover/i, hint);
  assert.match(hint, /tap/i, hint);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A05: Accolades wraps its words, names what Copy copies, and offers no Copy when empty', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx; window.__copied = []; c.toast = (m) => window.__copied.push(m); window.__laurel.openExport(); });
  await settle(page, 400);
  await page.locator('button.dest', { hasText: 'Accolades' }).first().click(); await settle(page, 300);
  assert.equal(await page.locator('.modal .prose').count(), 1, 'the list is prose, not code');
  assert.equal(await page.locator('.modal .prose').evaluate((e) => getComputedStyle(e).wordBreak), 'normal');
  assert.ok(await page.getByRole('button', { name: 'Copy list' }).isEnabled());
  await page.locator('.modal .segctl button', { hasText: 'Sentence' }).click(); await settle(page, 200);
  assert.ok(await page.getByRole('button', { name: 'Copy sentence' }).isVisible());
  await page.keyboard.press('Escape'); await settle(page, 200);
  // nothing to say: no festival, no status
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); for (const f of d.fields) f.text = ''; d.row = { ...(d.row || {}), items: [] }; c.replaceDoc(d); window.__laurel.openExport(); });
  await settle(page, 400);
  await page.locator('button.dest', { hasText: 'Accolades' }).first().click(); await settle(page, 300);
  assert.ok(await page.locator('.modal').getByRole('button', { name: /^Copy (list|sentence)$/ }).isDisabled(), 'an empty list cannot be copied');
  assert.deepEqual(errors, []);
  await context.close();
});

test('A08: with the intro closed, About is still in the phone rail', async () => {
  const { page, errors, context } = await openApp({ viewport: { width: 390, height: 844 } });
  const close = page.getByRole('button', { name: /close|dismiss/i }).first();
  if (await close.isVisible().catch(() => false)) { await close.click(); await settle(page, 300); }
  const about = page.locator('.rail button', { hasText: 'About' });
  assert.ok(await about.count() === 1 && await about.evaluate((e) => getComputedStyle(e).display !== 'none'), 'About is in the rail');
  await about.scrollIntoViewIfNeeded(); await about.click(); await settle(page, 300);
  assert.match(await page.locator('.tabhead h2').first().innerText(), /About/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A09: the way back to the maker sits right under the Story film', async () => {
  const { page, errors, context } = await openApp({ path: 'story/' });
  const link = page.locator('section.watch a[href="../"]');
  assert.equal(await link.count(), 1);
  assert.match(await link.innerText(), /Make your laurel/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A11: the Row names its Show column, and each Show box says which laurel', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 600);
  const heads = await page.locator('table.rowtable thead th').allInnerTexts();
  assert.ok(heads.includes('Show'), heads.join(' | '));
  const label = await page.locator('table.rowtable tbody input[type=checkbox]').last().getAttribute('aria-label');
  assert.match(label || '', /^Show .+ in the row$/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A15: outline width and color show only when the leaves have an outline, and keep their values', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); d.paint.mode = 'fill'; d.paint.stroke = { ...(d.paint.stroke || {}), w: 1.7 }; c.replaceDoc(d); window.__laurel.setTab('color'); });
  await settle(page, 400);
  assert.equal(await page.getByRole('slider', { name: 'Outline width' }).count(), 0, 'no outline, no width');
  await page.getByRole('combobox', { name: 'Draw' }).selectOption('both'); await settle(page, 400);
  const w = page.getByRole('slider', { name: 'Outline width' });
  assert.equal(await w.count(), 1);
  assert.equal(+(await w.inputValue()), 1.7, 'the width waited for the outline');
  assert.deepEqual(errors, []);
  await context.close();
});

test('C03: two awards that slug alike get their own folders in the pack', async () => {
  const { page, errors, context } = await openApp();
  const slugs = await page.evaluate(async () => {
    const { packVariants } = await import('/studio.js'), c = window.__laurel.ctx;
    return packVariants(c, c.clone(c.doc), { statuses: ['Official Selection'], awards: ['Best Film', 'Best-Film', 'Best Film 2'], winner: 'Winner' }).map((v) => v.slug);
  });
  assert.equal(new Set(slugs).size, slugs.length, slugs.join(', '));
  assert.deepEqual(errors, []);
  await context.close();
});

test('C05: a second pointer can’t take over a move, and a cancelled move puts the line back with no undo step', async () => {
  const { page, errors, context } = await openApp();
  // the stage redraws once its fonts arrive, so wait for that before measuring the year
  await settle(page, 900);
  const year = page.locator('#stage svg [data-ids]').filter({ hasText: /2026/ }).last();
  await year.waitFor();
  const b = await year.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  const fire = (type, id, dx, dy) => page.evaluate(([type, id, x, y]) => {
    const t = document.elementFromPoint(x, y) || window;
    (type === 'pointerdown' ? t : window).dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, button: 0, isPrimary: id === 1 }));
  }, [type, id, x + dx, y + dy]);
  const field = () => page.evaluate(() => { const f = window.__laurel.doc.fields.find((x) => x.kind === 'year'); return [f.dx || 0, f.dy || 0]; });
  await fire('pointerdown', 1, 0, 0);
  await fire('pointermove', 1, 30, 20); await settle(page, 150);
  const during = await field();
  assert.ok(during[0] > 0, `the owner moves it: ${during}`);
  await fire('pointermove', 2, -200, -100); await settle(page, 150);
  assert.deepEqual(await field(), during, 'another pointer is ignored');
  await fire('pointercancel', 1, 30, 20); await settle(page, 300);
  assert.deepEqual(await field(), [0, 0], 'a cancelled move puts the line back');
  assert.ok(await page.locator('#undo').isDisabled(), 'and leaves nothing to undo');
  assert.deepEqual(errors, []);
  await context.close();
});

test('A06: the Row keeps the Dark, Light and Clear backdrop', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 500);
  for (const b of ['Dark', 'Light', 'Clear']) assert.equal(await page.locator('.stagebar button', { hasText: b }).count(), 1, b);
  await page.locator('.stagebar button', { hasText: 'Light' }).click(); await settle(page, 200);
  await page.locator('.stagebar button', { hasText: 'Dark' }).click(); await settle(page, 200);
  assert.ok(!(await page.locator('main').evaluate((m) => m.classList.contains('light'))), 'back to Dark from the Row');
  assert.deepEqual(errors, []);
  await context.close();
});

test('A07: the placing strip names the Type role that styles the picked words, and opens it', async () => {
  const { page, errors, context } = await openApp();
  await page.locator('#stage svg [data-ids]').filter({ hasText: /2026/ }).last().click(); await settle(page, 300);
  const role = page.getByRole('toolbar', { name: 'Place the selected words' }).locator('button.role');
  assert.match(await role.innerText(), /Type: Details/);
  await role.click(); await settle(page, 300);
  assert.match(await page.locator('.tabhead h2').first().innerText(), /^Type/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A12: the Website preview says it is enlarged, apart from the size on the page', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 300);
  await page.locator('button.dest', { hasText: 'Website' }).first().click(); await settle(page, 300);
  assert.match(await page.locator('.pv .cap').last().innerText(), /Enlarged to fit here\. On your page it shows \d+ px wide/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A21: Start over says the Row stays', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { window.__asked = null; window.confirm = (m) => { window.__asked = m; return false; }; window.__laurel.setTab('canvas'); }); await settle(page, 300);
  await page.getByRole('button', { name: 'Start over' }).click();
  assert.match(await page.evaluate(() => window.__asked), /Row of laurels stays/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('C08: if the clean-up tool can’t load, Clean up says so instead of doing nothing', async () => {
  const { browser } = await setup();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route(/fixer\.js/, (r) => r.abort());
  const { page, errors } = await openApp({ context });
  await page.evaluate(() => { window.__toasts = []; const c = window.__laurel.ctx, t = c.toast; c.toast = (m, ...a) => { window.__toasts.push(m); return t(m, ...a); }; });
  await page.evaluate(() => window.__laurel.ctx.openFixer(() => {}));
  await settle(page, 400);
  assert.ok((await page.evaluate(() => window.__toasts)).some((m) => /clean-up tool/.test(m)) || await page.locator('.toast', { hasText: 'clean-up tool' }).count() > 0, 'a visible message');
  assert.deepEqual(errors, []);
  await context.close();
});

test('C04: a new font family takes a face it has: no italic it lacks, its nearest weight', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => { const c = window.__laurel.ctx, d = c.clone(c.doc); d.roles.sub = { ...d.roles.sub, font: 'Figtree', italic: true, weight: 900 }; c.replaceDoc(d); window.__laurel.setTab('type'); });
  await settle(page, 500);
  const pick = async (fam) => {
    await page.locator('.role', { hasText: 'Details' }).locator('.fontbtn').click(); await settle(page, 200);
    await page.getByRole('searchbox', { name: 'Search fonts' }).fill(fam); await settle(page, 200);
    await page.locator('.fontpop button.fopt', { hasText: new RegExp('^' + fam) }).first().click(); await settle(page, 500);
    return page.evaluate(() => { const r = window.__laurel.doc.roles.sub; return { font: r.font, italic: !!r.italic, weight: +r.weight }; });
  };
  const m = await pick('Manrope');
  assert.deepEqual(m, { font: 'Manrope', italic: false, weight: 800 });
  await page.locator('#undo').click(); await settle(page, 400);
  const back = await page.evaluate(() => { const r = window.__laurel.doc.roles.sub; return { font: r.font, italic: !!r.italic, weight: +r.weight }; });
  assert.deepEqual(back, { font: 'Figtree', italic: true, weight: 900 }, 'one undo step brings the old face back');
  assert.deepEqual(errors, []);
  await context.close();
});

test('C07: while a look is previewed, the advice about the laurel in use steps back', async () => {
  const { page, errors, context } = await openApp();
  await page.locator('button', { hasText: 'Small sizes' }).click(); await settle(page, 500);
  await page.evaluate(() => window.__laurel.setTab('looks')); await settle(page, 500);
  await page.locator('.preset').nth(3).hover(); await settle(page, 600);
  assert.ok(await page.locator('#stage.previewing').count() === 1, 'a preview is showing');
  const vis = await page.evaluate(() => ['.report', '.small-sizes'].map((q) => document.querySelector(q) && getComputedStyle(document.querySelector(q)).visibility));
  assert.deepEqual(vis.filter(Boolean), vis.filter(Boolean).map(() => 'hidden'));
  await page.mouse.move(5, 5); await settle(page, 400);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.small-sizes')).visibility), 'visible', 'back when the preview ends');
  assert.deepEqual(errors, []);
  await context.close();
});

for (const w of [390, 320]) test(`at ${w} px the Row's notes and controls fit the screen; only its table scrolls sideways`, async () => {
  const { page, errors, context } = await openApp({ viewport: { width: w, height: 844 } });
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 700);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, right = (q) => Math.max(...[...document.querySelectorAll(q)].map((e) => e.getBoundingClientRect().right));
    const sc = document.querySelector('.rowscroll');
    return { vw, examples: right('.row-examples button'), tools: right('.rowtools > *'), scrolls: sc.scrollWidth > sc.clientWidth, sw: document.documentElement.scrollWidth };
  });
  assert.ok(r.examples <= r.vw && r.tools <= r.vw, `buttons end at ${r.examples}, controls at ${r.tools}, on ${r.vw}`);
  assert.ok(r.scrolls, 'the table scrolls in its own box');
  assert.ok(r.sw <= r.vw);
  assert.deepEqual(errors, []);
  await context.close();
});
