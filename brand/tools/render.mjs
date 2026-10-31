// Renders every PNG in brand/ from the SVGs and HTML sources, in headless Chromium.
//   node brand/tools/build.mjs && node brand/tools/render.mjs
// Needs Playwright (any recent version) and, for favicon.ico, ImageMagick's `convert`.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const repo = normalize(join(new URL('.', import.meta.url).pathname, '../..'));
const B = (p) => join(repo, 'brand', p);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css', '.wasm': 'application/wasm' };
const server = createServer((req, res) => {
  const p = normalize(join(repo, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(repo) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();

// an SVG file drawn at an exact pixel size, transparent around it
async function svgToPng(src, out, w, h = null) {
  await page.setViewportSize({ width: w, height: h || w });
  await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${w}px;height:${h ? h + 'px' : 'auto'}}</style><img src="${base}/brand/${src}">`);
  await page.waitForFunction(() => document.images[0].complete);
  const el = await page.$('img'); mkdirSync(join(B(out), '..'), { recursive: true });
  await el.screenshot({ path: B(out), omitBackground: true }); console.log('wrote', out);
}
for (const v of ['on-dark', 'on-light', 'black', 'white']) { await svgToPng(`logo/daphne-logo-${v}.svg`, `logo/png/daphne-logo-${v}-2400.png`, 2400); await svgToPng(`logo/daphne-logo-${v}.svg`, `logo/png/daphne-logo-${v}-800.png`, 800); }
for (const v of ['on-dark', 'on-light']) await svgToPng(`symbol/daphne-symbol-${v}.svg`, `symbol/png/daphne-symbol-${v}-1024.png`, 1024);
await svgToPng('symbol/daphne-avatar.svg', 'symbol/png/daphne-avatar-1080.png', 1080);
await svgToPng('symbol/daphne-avatar.svg', 'symbol/png/daphne-avatar-400.png', 400);
await svgToPng('symbol/daphne-app-icon.svg', 'symbol/png/daphne-app-icon-1024.png', 1024);
await svgToPng('favicon/icon.svg', 'favicon/icon-512.png', 512);
await svgToPng('favicon/icon.svg', 'favicon/icon-192.png', 192);
await svgToPng('favicon/icon.svg', 'favicon/apple-touch-icon.png', 180);
await svgToPng('favicon/icon-maskable.svg', 'favicon/icon-maskable-512.png', 512);
for (const s of [16, 32, 48]) await svgToPng('favicon/favicon.svg', `favicon/favicon-${s}.png`, s);
try { execFileSync('convert', [B('favicon/favicon-16.png'), B('favicon/favicon-32.png'), B('favicon/favicon-48.png'), B('favicon/favicon.ico')]); console.log('wrote favicon/favicon.ico'); } catch { console.log('skipped favicon.ico (no ImageMagick)'); }

// the sample laurels, made with Daphne's own engine and presets
await page.setViewportSize({ width: 1200, height: 800 });
await page.goto(`${base}/brand/tools/laurels.html`);
await page.waitForFunction(() => window.__done, null, { timeout: 60000 });
for (const id of await page.evaluate(() => window.__done)) { const el = await page.$('#' + id + ' svg'); await el.screenshot({ path: B(`laurels/${id}.png`), omitBackground: true }); console.log('wrote', `laurels/${id}.png`); }

// social cards: HTML sources in brand/social/src, one PNG each at the size in its <meta name="size">
for (const name of ['og-card', 'github-preview', 'linkedin-banner']) {
  const url = `${base}/brand/social/src/${name}.html`; await page.goto(url);
  const [w, h] = (await page.$eval('meta[name=size]', (m) => m.content)).split('x').map(Number);
  await page.setViewportSize({ width: w, height: h }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  await page.screenshot({ path: B(`social/${name}.png`) }); console.log('wrote', `social/${name}.png`);
}
// the logo reveal, frame by frame at 24 fps, as an MP4 and a GIF (needs ffmpeg)
import { REVEAL } from './reveal.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  const dir = mkdtempSync(join(tmpdir(), 'daphne-reveal-')), n = Math.round(REVEAL.total * REVEAL.fps);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/brand/motion/reveal.html?still`); await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i <= n; i++) { await page.evaluate((k) => window.daphneSeek(k), i); await page.screenshot({ path: join(dir, `f${String(i).padStart(3, '0')}.png`) }); }
  // hold the last frame for a second so the logo can be read
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(REVEAL.fps), '-i', join(dir, 'f%03d.png'), '-vf', `tpad=stop_mode=clone:stop_duration=1,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-movflags', '+faststart', B('motion/daphne-reveal.mp4')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', B('motion/daphne-reveal.mp4'), '-vf', 'fps=24,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none', B('motion/daphne-reveal.gif')]);
  rmSync(dir, { recursive: true }); console.log('wrote motion/daphne-reveal.mp4 and .gif');
} catch (e) { console.log('skipped the reveal video:', e.message); }
await browser.close(); server.close();
