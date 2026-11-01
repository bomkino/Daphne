// Captures the real app for the slides: the panels people will use, at 4× so the slides never enlarge them.
//
//   node launch/tools/capture.mjs   → launch/src/captures/*.png
//
// Serves prototype/ itself, sets the words to placeholders ("Your Festival", "Your Film"), and never captures an
// empty festival field: its placeholder names real festivals, and brand material never shows a real festival's name.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = new URL('.', import.meta.url).pathname;
const app = resolve(here, '../../prototype'), outDir = resolve(here, '../src/captures');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  let u = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (u.endsWith('/')) u += 'index.html';
  try { const b = await readFile(join(app, u)); res.writeHead(200, { 'content-type': TYPES[extname(u)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
await mkdir(outDir, { recursive: true });

const SELECTED = `Dear filmmaker,

Congratulations! We're delighted to tell you that your film "Your Film" has been selected for Your Festival 2026. It will screen in the Shorts Competition as part of our Official Selection.

See you in October,
The programming team`;
const DECLINED = `Dear filmmaker,

Thank you for sending us "Your Film". Unfortunately, we're unable to include it in this year's program.

We hope to see your next film.
The programming team`;

const browser = await chromium.launch();
const sizes = {};
const fresh = async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 4 });
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) console.log('page:', m.text()); });
  await p.goto(URL0, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  // the placeholder festival, typed the way a person would
  await p.locator('input[aria-label="Festival name"]').fill('Your Festival');
  await p.keyboard.press('Tab');
  await p.waitForTimeout(600);
  await p.mouse.move(0, 999); // no hover states in the captures
  return p;
};
const shot = async (p, name, box, pad = 0) => {
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  await p.screenshot({ path: join(outDir, name + '.png'), clip });
  sizes[name] = [Math.round(clip.width), Math.round(clip.height)];
  console.log(name, Math.round(clip.width) + '×' + Math.round(clip.height), 'css px');
};
// the whole email shows: a box that scrolls would cut a line of it in half
const openUp = async (p) => { await p.locator('section.emailq textarea').evaluate((t) => { t.blur(); t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; t.scrollTop = 0; }); await p.mouse.move(0, 999); await p.waitForTimeout(250); };
const rectOf = (p, sel) => p.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const textRect = (p, text) => p.evaluate((t) => { const all = [...document.querySelectorAll('body *')].filter((e) => e.offsetParent && e.textContent.trim().startsWith(t)); all.sort((a, b) => a.textContent.length - b.textContent.length); const r = all[0].getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, text);

try {
  // 1. the email, pasted: the panel down to the end of the email, before what Daphne found in it
  let p = await fresh();
  await p.click('text=Got the festival’s email?'); await p.waitForTimeout(300);
  await p.locator('section.emailq textarea').fill(SELECTED); await p.waitForTimeout(700);
  await openUp(p);
  const eq = await rectOf(p, 'section.emailq'), ta = await rectOf(p, 'section.emailq textarea');
  await shot(p, 'email-paste', { x: eq.x, y: eq.y, width: eq.width, height: ta.y + ta.height - eq.y + 8 });
  // 2. the email, a no, and Daphne's answer
  await p.locator('section.emailq textarea').fill(DECLINED); await p.waitForTimeout(700);
  await openUp(p);
  await shot(p, 'email-decline', await rectOf(p, 'section.emailq'));
  await p.close();

  // 3. small sizes, without the panel's one-line caption, which a phone would show at about 4 pt
  p = await fresh();
  await p.click('button:has-text("Small sizes")'); await p.waitForTimeout(1200); await p.mouse.move(0, 999);
  const ss = await rectOf(p, '.small-sizes'), ssc = await textRect(p, 'Real size on a standard screen');
  await shot(p, 'small-sizes-tiles', { x: ss.x, y: ssc.y + ssc.height + 2, width: ss.width, height: ss.y + ss.height - (ssc.y + ssc.height + 2) });
  await p.close();

  // 4. print: a size too small for the words, so Daphne warns
  p = await fresh();
  await p.click('button:has-text("Export")'); await p.waitForTimeout(1000);
  await p.click('text=Poster and print'); await p.waitForTimeout(800);
  await p.click('text=Blu-ray cover'); await p.waitForTimeout(800); await p.mouse.move(0, 999);
  const note = await p.evaluate(() => { const e = [...document.querySelectorAll('.note')].find((n) => n.textContent.includes('The smallest words print at')); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await shot(p, 'print-note', note, 10);
  // 5. the festival pack's choices: statuses ticked, awards typed one per line
  await p.click('text=Festival pack'); await p.waitForTimeout(2500); await p.mouse.move(0, 999);
  const st = await textRect(p, 'Statuses'), over = await rectOf(p, 'input[aria-label="Line over each award"]');
  await shot(p, 'pack-choices', { x: st.x, y: st.y, width: over.x + over.width - st.x, height: over.y + over.height - st.y }, 14);
  await p.close();
  await writeFile(join(outDir, 'captures.json'), JSON.stringify(sizes, null, 1) + '\n');
} finally { await browser.close(); server.close(); }
