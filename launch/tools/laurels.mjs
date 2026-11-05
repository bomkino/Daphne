// Draws the laurels the launch carousels show with Daphne's own engine, so every laurel on a slide is one Daphne makes.
//
//   node launch/tools/laurels.mjs
//
// Serves the app (prototype/) and tools/laurels.html, opens the page in headless Chromium (Playwright), and writes
// launch/src/laurels/*.svg and launch/src/laurels.json. Fonts for the laurels come from the Google Fonts repository,
// as in the app, so it needs the network. Adapted from video/explainer/scripts/laurels.mjs.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = new URL('.', import.meta.url).pathname;
const app = resolve(here, '../../prototype');
const src = resolve(here, '../src');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = u.startsWith('/app/') ? join(app, u.slice(5)) : u.startsWith('/gen/') ? join(here, u.slice(5)) : null;
  try { if (!file) throw 0; const b = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('page:', m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/gen/laurels.html`);
await page.waitForFunction(() => window.__out, null, { timeout: 600000 });
const out = await page.evaluate(() => window.__out);
await browser.close(); server.close();

// every laurel gets its own id prefix, so gradients and filters don't collide when several share a slide
const scope = (svg, p) => svg.replace(/\bid="([^"]+)"/g, `id="${p}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`).replace(/href="#([^"]+)"/g, `href="#${p}-$1"`)
  .replace(/^(<svg[^>]*?)\s+width="[^"]*"/, '$1').replace(/^(<svg[^>]*?)\s+height="[^"]*"/, '$1');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dir = join(src, 'laurels');
await rm(dir, { recursive: true, force: true });
for (const d of ['looks', 'pack']) await mkdir(join(dir, d), { recursive: true });
const index = { named: {}, looks: [], pack: [] };
const put = async (rel, item, p) => { await writeFile(join(dir, rel), scope(item.svg, p)); return { file: `laurels/${rel}`, name: item.name, viewBox: item.viewBox, words: item.words, bg: (item.svg.match(/data-bg="1"[^>]*fill="([^"]+)"/) || [])[1] || null }; };
for (const [k, v] of Object.entries(out.named)) index.named[k] = await put(`${slug(k)}.svg`, v, slug(k));
for (const l of out.looks) index.looks.push({ ...(await put(`looks/${String(l.i).padStart(2, '0')}-${slug(l.name)}.svg`, l, 'lk' + l.i)), group: l.group });
for (const [i, l] of out.pack.entries()) index.pack.push({ ...(await put(`pack/${slug(l.label)}-${l.way}.svg`, l, 'pk' + i)), label: l.label, way: l.way });
await writeFile(join(src, 'laurels.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`${Object.keys(index.named).length} named, ${index.looks.length} looks, ${index.pack.length} pack laurels`);
if (out.errors.length) { console.log('errors:\n' + out.errors.join('\n')); process.exitCode = 1; }
const notes = [...new Set([...Object.values(out.named), ...out.looks].flatMap((l) => l.notes || []))];
if (notes.length) console.log('outline notes:', notes.join('; '));
const warns = Object.entries(out.named).filter(([, v]) => v.warnings && v.warnings.length).map(([k, v]) => k + ': ' + v.warnings.join(', '));
if (warns.length) console.log('engine warnings:\n' + warns.join('\n'));
