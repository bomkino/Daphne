// Draws the laurels the explainer shows with Daphne's own engine, so every laurel on screen is one Daphne makes.
//
//   node scripts/laurels.mjs [path to the app's prototype/ folder]
//
// The default is ../../prototype, the app in this repository. It serves the app and scripts/laurels/gen.html,
// opens the page in headless Chromium (Playwright), and writes public/laurels/*.svg and src/data/laurels.json.
// Fonts for the laurels come from the Google Fonts repository, as in the app, so it needs the network.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed, or npm i -D playwright

const here = new URL('.', import.meta.url).pathname;
const app = resolve(process.argv[2] || join(here, '../../../prototype'));
const root = resolve(here, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = u.startsWith('/app/') ? join(app, u.slice(5)) : u.startsWith('/gen/') ? join(here, 'laurels', u.slice(5)) : null;
  try { if (!file) throw 0; const b = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('page:', m.text()); });
await page.goto(`http://127.0.0.1:${port}/gen/gen.html`);
await page.waitForFunction(() => window.__out, null, { timeout: 600000 });
const out = await page.evaluate(() => window.__out);
await browser.close(); server.close();

// every laurel gets its own id prefix, so gradients and filters don't collide when several share a frame
const scope = (svg, p) => svg.replace(/\bid="([^"]+)"/g, `id="${p}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}-$1)`).replace(/href="#([^"]+)"/g, `href="#${p}-$1"`)
  .replace(/\s(width|height)="[^"]*"(?=[^>]*>)/, '').replace(/\s(width|height)="[^"]*"(?=[^<]*?>)/, '');
const dir = join(root, 'public/laurels');
await rm(dir, { recursive: true, force: true });
await mkdir(join(dir, 'looks'), { recursive: true }); await mkdir(join(dir, 'pack'), { recursive: true });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const index = { hero: null, extra: {}, looks: [], pack: [] };
// the look's own ground: a solid color, or the first stop of a gradient
const ground = (svg) => { const m = /data-bg="1"[^>]*fill="([^"]+)"/.exec(svg); if (!m) return null; if (m[1].startsWith('#')) return m[1]; const id = /url\(#([^)]+)\)/.exec(m[1]); const g = id && new RegExp(`id="${id[1]}"[\\s\\S]*?stop-color="(#[0-9a-fA-F]+)"`).exec(svg); return g ? g[1] : null; };
const put = async (rel, item, p) => { await writeFile(join(dir, rel), scope(item.svg, p)); return { file: `laurels/${rel}`, name: item.name, viewBox: item.viewBox, items: item.items, bg: ground(item.svg) }; };
index.hero = await put('hero.svg', out.hero, 'hero');
for (const [k, v] of Object.entries(out.extra)) index.extra[k] = await put(`${slug(k)}.svg`, v, slug(k));
for (const l of out.looks) index.looks.push({ ...(await put(`looks/${String(l.i).padStart(2, '0')}-${slug(l.name)}.svg`, l, 'lk' + l.i)), group: l.group });
for (const [i, l] of out.pack.entries()) index.pack.push({ ...(await put(`pack/${slug(l.label)}-${l.way}.svg`, l, 'pk' + i)), label: l.label, way: l.way });
if (out.fixerJpeg) await writeFile(join(dir, 'fixer-before.jpg'), Buffer.from(out.fixerJpeg.split(',')[1], 'base64'));
await mkdir(join(root, 'src/data'), { recursive: true });
await writeFile(join(root, 'src/data/laurels.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`${index.looks.length} looks, ${index.pack.length} pack laurels, ${Object.keys(index.extra).length} extras`);
if (out.errors.length) console.log('errors:\n' + out.errors.join('\n'));
const notes = [...new Set([out.hero, ...out.looks].flatMap((l) => l.notes || []))];
if (notes.length) console.log('outline notes:', notes.join('; '));
