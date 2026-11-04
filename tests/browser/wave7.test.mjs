// Wave 7, the last of the launch list. A01: on a phone a dock keeps the laurel and Export in reach while editing
// below it. A03: Export opened from Motion or On poster starts on that scene's own files. A04/C06: a wide row on a
// social card never runs off its edges, and a thin band is offered a stack or Landscape. A16: long exports keep a
// card in view with progress, Stop and Try again. A17: italic words use a real italic face.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openApp, setup, settle } from '../lib.mjs';

after(async () => (await setup()).close());

const phone = async () => {
  const { browser } = await setup();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  return { context, ...(await openApp({ context })) };
};

test('A01: on a phone the dock appears once the laurel is scrolled away, and steps aside for typing and dialogs', async () => {
  const { page, errors, context } = await phone();
  const dock = page.locator('.dock');
  assert.equal(await dock.isVisible(), false, 'hidden while the laurel is in view');
  await page.evaluate(() => window.scrollTo(0, document.getElementById('panel').offsetTop + 400)); await settle(page, 400);
  assert.equal(await dock.isVisible(), true, 'shown once the laurel is away');
  assert.match(await dock.locator('.art').innerHTML(), /<svg/, 'the dock shows the laurel as it is now');
  assert.equal(await dock.locator('.dock-export').isVisible(), false, 'Daphne’s own bar is still in view here, with its Export');
  // on pitch.dog, Daphne's bar scrolls away under the site's bar (the site's daphne.css): then the dock carries Export
  await page.addStyleTag({ content: 'header.top { position: relative !important; }' });
  await page.evaluate(() => window.scrollTo(0, document.getElementById('panel').offsetTop + 420)); await settle(page, 400);
  assert.equal(await dock.locator('.dock-export').isVisible(), true, 'Export in reach once the bar is gone');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways overflow');
  // typing in a text field: the dock steps aside for the keyboard
  await page.evaluate(() => { const i = document.querySelector('#panel input[type="text"]'); i.scrollIntoView({ block: 'center' }); i.focus(); }); await settle(page, 300);
  assert.equal(await dock.isVisible(), false, 'hidden while a text field has focus');
  await page.evaluate(() => document.activeElement.blur()); await page.evaluate(() => window.scrollTo(0, document.getElementById('panel').offsetTop + 400)); await settle(page, 300);
  assert.equal(await dock.isVisible(), true);
  // Export from the dock opens Export, and the dock is gone while it's open
  await dock.getByRole('button', { name: 'Export' }).click(); await settle(page, 400);
  assert.equal(await page.locator('.export-scrim').count(), 1, 'Export opened');
  assert.equal(await dock.isVisible(), false, 'no dock over a dialog');
  await page.keyboard.press('Escape'); await settle(page, 300);
  // the laurel button scrolls back to it
  await dock.locator('.dock-peek').click(); await settle(page, 900);
  const top = await page.evaluate(() => document.getElementById('stagewrap').getBoundingClientRect().top);
  assert.ok(top < 400, `scrolled back to the laurel (${top})`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A01: no dock on a wide screen', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.scrollTo(0, 99999)); await settle(page, 300);
  assert.equal(await page.locator('.dock').isVisible(), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A03: Export from Motion starts on this animation, with its three files, and isn’t remembered for next time', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.__got = []; window.__laurel.ctx.download = (b, n) => window.__got.push(n); window.__laurel.setMode('motion'); }); await settle(page, 900);
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 600);
  const on = page.locator('button.dest.on');
  assert.match(await on.innerText(), /This animation/);
  assert.match(await page.locator('.studio .preview').innerHTML(), /<svg/, 'its last frame is previewed');
  for (const b of ['MP4 video', 'PNG sequence (transparent)', 'Animated SVG']) assert.equal(await page.locator('.studio .opts button', { hasText: b }).count(), 1, b);
  await page.locator('.studio .opts button', { hasText: 'Animated SVG' }).click();
  await page.waitForFunction(() => window.__got.length > 0, null, { timeout: 30000 });
  assert.match(await page.evaluate(() => window.__got[0]), /-animated\.svg$/);
  await page.keyboard.press('Escape'); await settle(page, 300);
  await page.evaluate(() => window.__laurel.setMode('laurel')); await settle(page, 400);
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 500);
  assert.equal(await page.locator('button.dest', { hasText: 'This animation' }).count(), 0, 'only from Motion');
  assert.doesNotMatch(await page.locator('button.dest.on').innerText(), /animation/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A03: Export from On poster with no poster says where to add one', async () => {
  const { page, errors, context } = await openApp();
  await page.evaluate(() => window.__laurel.setMode('poster')); await settle(page, 500);
  await page.evaluate(() => window.__laurel.openExport()); await settle(page, 500);
  assert.match(await page.locator('button.dest.on').innerText(), /This poster mockup/);
  assert.match(await page.locator('.studio .preview').innerText(), /Upload your poster/);
  assert.ok(await page.locator('.studio .opts button', { hasText: 'Mockup PNG' }).isDisabled());
  assert.deepEqual(errors, []);
  await context.close();
});

const slowMotion = async (page) => page.evaluate(() => {
  const c = window.__laurel.ctx; c.change('motion', { ...(c.doc.motion || {}), dur: 8, frame: '1920x1080' }); window.__laurel.setMode('motion');
});

test('A16: a long export shows its progress in the corner, and Stop ends it with nothing downloaded', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.__got = []; window.__laurel.ctx.download = (b, n) => window.__got.push(n); });
  await slowMotion(page); await settle(page, 900);
  await page.locator('#modepanel button', { hasText: 'PNG sequence' }).click();
  const card = page.locator('.jobs .job');
  await card.waitFor({ timeout: 10000 });
  await page.waitForFunction(() => +(document.querySelector('.jobs .meter')?.getAttribute('aria-valuenow') || 0) > 0, null, { timeout: 30000 });
  assert.match(await card.innerText(), /PNG sequence/);
  assert.match(await card.innerText(), /Frame \d+ of 240/);
  assert.ok(await page.locator('#modepanel button', { hasText: 'MP4 video' }).isDisabled(), 'one export at a time');
  // leaving Motion doesn't stop it, and its controls never land in another view's bar
  await page.evaluate(() => window.__laurel.setMode('row')); await settle(page, 300);
  await card.getByRole('button', { name: 'Stop' }).click();
  await page.waitForFunction(() => /Stopped/.test(document.querySelector('.jobs .job')?.textContent || ''), null, { timeout: 30000 });
  await settle(page, 300);
  assert.deepEqual(await page.evaluate(() => window.__got), [], 'nothing downloaded');
  assert.equal(await page.locator('#modebar button', { hasText: /^(Play|Pause)$/ }).count(), 0, 'Motion’s bar stays in Motion');
  await page.evaluate(() => window.__laurel.setMode('motion')); await settle(page, 600);
  assert.equal(await page.locator('#modepanel button', { hasText: 'MP4 video' }).isDisabled(), false, 'ready again');
  assert.deepEqual(errors, []);
  await context.close();
});

test('A16: a failed export says why and offers Try again, which works', async () => {
  const { page, errors, context } = await openApp({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    window.__got = []; let first = true;
    window.__laurel.ctx.download = (b, n) => { if (first) { first = false; throw new Error('the disk is full'); } window.__got.push(n); };
    window.__laurel.setMode('motion');
  });
  await settle(page, 900);
  // a failure shows however quickly it comes (a quick job that succeeds never shows at all)
  await page.evaluate(() => { const J = window.__laurel.ctx.jobs; J.start('Quick one').done(); J.start('Quick fail').fail(new Error('at once')); });
  assert.equal(await page.locator('.jobs .job', { hasText: 'Quick one' }).count(), 0);
  assert.match(await page.locator('.jobs .job.failed', { hasText: 'Quick fail' }).innerText(), /at once/);
  await page.locator('.jobs .job.failed', { hasText: 'Quick fail' }).getByRole('button', { name: 'Dismiss' }).click();
  await page.locator('#modepanel button', { hasText: 'Animated SVG' }).click();
  const card = page.locator('.jobs .job.failed');
  await card.waitFor({ timeout: 30000 });
  assert.match(await card.innerText(), /the disk is full/);
  await card.getByRole('button', { name: 'Try again' }).click();
  await page.waitForFunction(() => window.__got.length === 1, null, { timeout: 30000 });
  assert.match(await page.evaluate(() => window.__got[0]), /-animated\.svg$/);
  assert.deepEqual(errors, []);
  await context.close();
});

const ROW6 = ['Northlight', 'Atlas Film Festival', 'Harbor Lights', 'Cinema Nord', 'Riverbend', 'Open Sky'].map((festival, i) => ({ id: 'u' + i, status: 'Official Selection', festival, award: '', year: '2026' }));
async function socialRow(page, social) {
  await page.evaluate(({ ROW6, social }) => {
    try { localStorage.setItem('daphne.studio', JSON.stringify({ dest: 'social', social })); } catch (e) { /* none */ }
    const c = window.__laurel.ctx, d = c.clone(c.doc);
    d.row = { ...(d.row || {}), items: ROW6, order: 'manual', arrange: 'row', perRow: 6, uniform: true, gap: 0.14, lead: 1.3 };
    c.replaceDoc(d); window.__laurel.openExport();
  }, { ROW6, social });
  await settle(page, 700);
}
// where the row sits on the card: the nested <svg> the card draws it in
const placed = (page) => page.evaluate(() => {
  const card = document.querySelector('.studio .preview .frame.card svg'), vb = card.getAttribute('viewBox').split(' ').map(Number), inner = card.querySelector('svg');
  return { W: vb[2], H: vb[3], x: +inner.getAttribute('x'), w: +inner.getAttribute('width'), h: +inner.getAttribute('height') };
});

test('C06: at the largest size a wide row stays inside the card, and says it’s as big as the card allows', async () => {
  const { page, errors, context } = await openApp();
  await socialRow(page, { fmt: '1:1', what: 'row', size: 1.25 });
  const p = await placed(page);
  assert.ok(p.x >= 0 && p.x + p.w <= p.W, `inside the card: x ${p.x}, width ${p.w} of ${p.W}`);
  assert.ok(p.w <= p.W * 0.92 + 0.5, 'within the safe width');
  assert.match(await page.locator('.studio .opts').innerText(), /As big as this card allows/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A04: a thin row on a tall card is offered a stack, and stacking is a choice that changes only the card', async () => {
  const { page, errors, context } = await openApp();
  await socialRow(page, { fmt: '9:16', what: 'row', size: 1 });
  const before = await placed(page);
  const opts = page.locator('.studio .opts');
  assert.match(await opts.innerText(), /thin band/);
  await opts.getByRole('button', { name: 'Stack it in two lines' }).click(); await settle(page, 500);
  const after2 = await placed(page);
  assert.ok(after2.h > before.h * 1.5, `taller once stacked: ${before.h} → ${after2.h}`);
  assert.equal(await opts.getByRole('radio', { name: 'Two lines' }).getAttribute('aria-checked'), 'true');
  assert.doesNotMatch(await opts.innerText(), /thin band/);
  const row = await page.evaluate(() => window.__laurel.doc.row);
  assert.equal(row.arrange, 'row', 'the row itself is untouched'); assert.equal(row.perRow, 6);
  assert.deepEqual(errors, []);
  await context.close();
});

test('A17: the story footer’s italic word uses PD Body’s real italic', async () => {
  const { page, errors, context } = await openApp({ path: 'story/' });
  await page.locator('footer i').scrollIntoViewIfNeeded(); await settle(page, 800);
  const faces = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'PD Body').map((f) => f.style + ':' + f.status); });
  assert.ok(faces.includes('italic:loaded'), faces.join(', '));
  assert.deepEqual(errors, []);
  await context.close();
});
