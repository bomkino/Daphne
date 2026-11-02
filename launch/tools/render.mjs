// Renders the launch carousels: every slide at 2× (2160 × 2700) into launch/out/, after the page's own checks pass.
//
//   node launch/tools/render.mjs [launch myth six email festivals read tonight …]
//
// Then `python3 launch/tools/finish.py` makes the 1080 × 1350 slides, the LinkedIn PDFs and the edge check.
// A carousel with a problem (a block outside the safe box, words overflowing, two blocks overlapping, a leaf at a
// slide's edge, two Blooms) isn't rendered; the problems are printed and the run fails.
import { createServer } from 'node:http';
import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = new URL('.', import.meta.url).pathname, repo = resolve(here, '../..'), out = resolve(here, '../out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try { const b = await readFile(join(repo, u)); res.writeHead(200, { 'content-type': TYPES[extname(u)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const ALL = ['launch', 'myth', 'six', 'email', 'festivals', 'read', 'tonight', 'films', 'fixer', 'herbarium', 'announce', 'leafless', 'anatomy', 'endcard', 'link'];
const sets = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const browser = await chromium.launch();
let failed = false;
const meta = {};
for (const id of sets) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') console.log(`${id}: page: ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`${id}: error: ${e.message}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/launch/src/index.html?set=${id}`);
  const ready = await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).then((h) => h.jsonValue());
  if (ready.problems.length) { failed = true; console.log(`\n${id}: ${ready.problems.length} problem(s), not rendered:\n  ` + ready.problems.join('\n  ')); await page.close(); continue; }
  const dir = join(out, id); await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  for (let i = 0; i < ready.n; i++) {
    await page.evaluate((x) => { document.querySelector('.strip').style.transform = `translateX(${-x}px)`; }, i * 1080);
    await page.screenshot({ path: join(dir, `${String(i + 1).padStart(2, '0')}@2x.png`), clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  }
  meta[id] = { title: ready.title, n: ready.n, alt: ready.slides.map((s) => s.alt) };
  console.log(`${id}: ${ready.n} slides, checks passed`);
  await page.close();
}
await browser.close(); server.close();
await mkdir(out, { recursive: true });
let prev = {}; try { prev = JSON.parse(await readFile(join(out, 'meta.json'), 'utf8')); } catch { /* first run */ }
await writeFile(join(out, 'meta.json'), JSON.stringify({ ...prev, ...meta }, null, 1) + '\n');
if (failed) process.exitCode = 1;
