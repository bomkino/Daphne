// Captures the real app for the ten carousels after the launch (06 to 15), at 4× so the slides never enlarge them:
//
//   node launch/tools/capture-more.mjs   → launch/src/captures/ (PNGs and more.json)
//
// - read: the wheat-field poster (src/art/gold.svg) uploaded to On poster, with the gold laurel, then auto ink, then the
//   four colors Daphne takes from the poster, with the contrast the app reports for each
// - box: a stand-in for a festival's own file (dark gold on white, saved as a JPEG) cleaned up by the official-laurel
//   fixer, as it comes and in black and white
// - announce: the social card in four shapes, one over a still (src/art/still.svg), and the first line Daphne writes
// - endcard: the motion end card at six moments of its four seconds
// - link: the share link for the hero laurel
// Like capture.mjs, it sets the words to placeholders ("Your Festival", "Your Film") before anything is captured.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = new URL('.', import.meta.url).pathname, repo = resolve(here, '../..');
const outDir = resolve(here, '../src/captures'), tmp = resolve(here, '../out/inputs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (u.endsWith('/')) u += 'index.html';
  try { const b = await readFile(join(repo, u)); res.writeHead(200, { 'content-type': TYPES[extname(u)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const BASE = `http://127.0.0.1:${server.address().port}`, APP = BASE + '/prototype/';
await mkdir(outDir, { recursive: true }); await mkdir(tmp, { recursive: true });
const L = JSON.parse(await readFile(resolve(here, '../src/laurels.json'), 'utf8')).named;

const browser = await chromium.launch();
const sizes = {}, facts = {};
const fresh = async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 4 });
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) console.log('page:', m.text()); });
  await p.goto(APP, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.locator('input[aria-label="Festival name"]').fill('Your Festival');
  await p.keyboard.press('Tab');
  await p.waitForTimeout(600);
  await p.mouse.move(0, 999);
  return p;
};
const shot = async (target, name, pad = 0) => {
  const box = await target.boundingBox(), page = target.page();
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  await page.screenshot({ path: join(outDir, name + '.png'), clip });
  sizes[name] = [Math.round(clip.width), Math.round(clip.height)];
  console.log(name, sizes[name].join('×'), 'css px');
};
// an image the app is given, drawn here first: the art, with its title, at poster size
const drawInput = async (html, w, h, file, type = 'png', quality) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<body style="margin:0">${html}</body>`); await p.waitForTimeout(300);
  await p.screenshot({ path: file, type, quality, clip: { x: 0, y: 0, width: w, height: h } }); await p.close();
};

try {
  // ── read: the poster, then the laurel on it ──
  const t = L.tGold, tw = 1200 * 0.62, th = tw * t.viewBox[3] / t.viewBox[2];
  await drawInput(`<div style="position:relative;width:1200px;height:1800px"><img src="${BASE}/launch/src/art/gold.svg" style="position:absolute;inset:0;width:1200px;height:1800px"><img src="${BASE}/launch/src/${t.file}" style="position:absolute;left:${(1200 - tw) / 2}px;top:${1800 * 0.905 - th}px;width:${tw}px;height:${th}px"></div>`, 1200, 1800, join(tmp, 'wheat-field-poster.png'));
  let p = await fresh();
  await p.click('#modes button[data-mode="poster"]'); await p.waitForTimeout(600);
  await p.locator('#modebar input[type=file]').setInputFiles(join(tmp, 'wheat-field-poster.png'));
  await p.waitForTimeout(1500); await p.mouse.move(0, 999);
  const wrap = p.locator('.poster-wrap');
  await shot(wrap, 'read-gold');
  facts.readGold = (await p.locator('#modebar .contrast').innerText()).trim();
  await p.locator('#modebar label:has-text("Auto ink") input').check(); await p.waitForTimeout(1500); await p.mouse.move(0, 999);
  await shot(wrap, 'read-auto');
  facts.readAuto = (await p.locator('#modebar .contrast').innerText()).trim();
  facts.autoInk = await p.evaluate(() => { const d = window.__laurel.doc; return { text: d.text.paint, branch: d.paint.branch }; });
  const sg = p.locator('#poster-suggest button');
  facts.suggest = [];
  for (let i = 0; i < await sg.count(); i++) { await shot(sg.nth(i).locator('.thumb'), 'read-suggest-' + i); facts.suggest.push(await sg.nth(i).getAttribute('title')); }
  facts.palette = await p.locator('#modepanel .swatches i').evaluateAll((es) => es.map((e) => e.getAttribute('title')));
  await p.close();

  // ── box: the festival's file as a JPEG on white, through the fixer ──
  const o = L.officialOnWhite, ow = 900, oh = Math.round(ow * o.viewBox[3] / o.viewBox[2]);
  await drawInput(`<img src="${BASE}/launch/src/${o.file}" style="display:block;width:${ow}px;height:${oh}px">`, ow, oh, join(tmp, 'official-laurel.jpg'), 'jpeg', 55);
  p = await fresh();
  await p.waitForFunction(() => window.__laurel && window.__laurel.ctx.openFixer);
  await p.evaluate(() => window.__laurel.ctx.openFixer(null));
  await p.locator('.modal.fixer input[type=file], .modal input[type=file]').first().setInputFiles(join(tmp, 'official-laurel.jpg'));
  await p.waitForTimeout(1500); await p.mouse.move(0, 999);
  await shot(p.locator('.modal .preview'), 'box-ui');
  const grab = async (name) => { const url = await p.evaluate(() => document.querySelector('.modal .frame canvas').toDataURL('image/png')); await writeFile(join(outDir, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); const s = await p.evaluate(() => { const c = document.querySelector('.modal .frame canvas'); return [c.width, c.height]; }); sizes[name] = s; console.log(name, s.join('×'), 'px'); };
  await grab('box-clean');
  facts.boxNote = (await p.locator('.modal .opts .desc').first().innerText()).trim();
  for (const [ink, name] of [['White', 'box-white'], ['Black', 'box-black']]) { await p.locator('.modal .opts .chips button', { hasText: ink }).first().click(); await p.waitForTimeout(800); await grab(name); }
  // the file as it came, for the slides: the JPEG itself, kept as a PNG so its artifacts survive
  const jpg = await readFile(join(tmp, 'official-laurel.jpg'));
  await drawInput(`<img src="data:image/jpeg;base64,${jpg.toString('base64')}" style="display:block;width:${ow}px;height:${oh}px">`, ow, oh, join(outDir, 'box-asis.png'));
  sizes['box-asis'] = [ow, oh];
  await p.close();

  // ── announce: the social card ──
  await drawInput(`<img src="${BASE}/launch/src/art/still.svg" style="display:block;width:1080px;height:1350px">`, 1080, 1350, join(tmp, 'lighthouse-still.png'));
  p = await fresh();
  await p.click('header button:has-text("Export")'); await p.waitForTimeout(900);
  await p.click('.modal >> text=Social post'); await p.waitForTimeout(900);
  await p.locator('input[aria-label="Film title"]').fill('Your Film'); await p.waitForTimeout(600);
  const card = async (name) => { await p.mouse.move(0, 999); await p.waitForTimeout(900); await shot(p.locator('.modal .preview .frame svg').first(), name); };
  for (const [fmt, name] of [['Square', 'announce-square'], ['Portrait', 'announce-portrait'], ['Story', 'announce-story'], ['Landscape', 'announce-landscape']]) { await p.locator('.modal button', { hasText: fmt }).first().click(); await card(name); }
  await p.locator('.modal button', { hasText: 'Portrait' }).first().click(); await p.waitForTimeout(400);
  await p.locator('.modal input[type=file][accept="image/*"]').first().setInputFiles(join(tmp, 'lighthouse-still.png'));
  await p.waitForTimeout(1200);
  await card('announce-photo');
  facts.caption = (await p.locator('.modal .oblock:has-text("A first line for the post") .alt').innerText()).trim();
  await p.close();

  // ── end card: the motion, paused at six moments ──
  p = await fresh();
  await p.click('#modes button[data-mode="motion"]'); await p.waitForTimeout(1500);
  await p.locator('#modebar button', { hasText: 'Pause' }).click();
  facts.frames = [0.35, 0.8, 1.3, 1.9, 2.95, 4];
  for (const [i, tt] of facts.frames.entries()) {
    await p.locator('input[aria-label="Time"]').evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, tt);
    await p.waitForTimeout(350); await p.mouse.move(0, 999);
    await shot(p.locator('.stage.motion-stage > svg').first(), 'end-' + i);
  }
  facts.motionNote = (await p.locator('#modebar').innerText()).replace(/\s+/g, ' ').trim();
  await p.close();

  // ── link: the hero laurel's share link ──
  p = await fresh();
  await p.waitForTimeout(1500);
  facts.link = await p.evaluate(() => location.hash);
  await p.close();

  await writeFile(join(outDir, 'more.json'), JSON.stringify({ sizes, facts }, null, 1) + '\n');
  console.log(JSON.stringify(facts, null, 1));
} finally { await browser.close(); server.close(); }
