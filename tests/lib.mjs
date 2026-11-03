// Shared helpers for Daphne's tests. Nothing in tests/ ships: the pitch.dog build copies prototype/ only.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);

// Playwright from the repository's node_modules, or a global install (NODE_PATH)
export function playwright() {
  try { return require('playwright'); } catch (e) { throw new Error('Playwright is needed for browser tests: npm install --no-save playwright && npx playwright install chromium'); }
}

// serve.py on a free port; resolves to { url, stop }
export async function startServer(port = 5100 + Math.floor(Math.random() * 800)) {
  const proc = spawn('python3', ['serve.py', String(port)], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url); if (r.ok) return { url, stop: () => proc.kill() }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill(); throw new Error('serve.py did not start');
}

// the app's share link: the document, deflated and base64url'd into #l=
export const pack = (doc) => deflateRawSync(Buffer.from(JSON.stringify(doc))).toString('base64url');
export const unpack = (s) => JSON.parse(inflateRawSync(Buffer.from(s, 'base64url')).toString());

let shared = null;
// one browser and one server per test file
export async function setup() {
  if (shared) return shared;
  const server = process.env.DAPHNE_URL ? { url: process.env.DAPHNE_URL, stop() {} } : await startServer();
  const browser = await playwright().chromium.launch();
  shared = { url: server.url, browser, async close() { await browser.close(); server.stop(); shared = null; } };
  return shared;
}

// a fresh browser profile (empty storage) with the app open, optionally on a given document
export async function openApp({ doc, hash, path = '', viewport = { width: 1440, height: 900 }, context, reducedMotion } = {}) {
  const { url, browser } = await setup();
  const ctx = context || (await browser.newContext({ viewport, reducedMotion }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const h = hash ?? (doc ? '#l=' + pack(doc) : '');
  await page.goto(url + path + h);
  if (!path) await page.waitForFunction(() => window.__laurel && document.querySelector('#stage svg'));
  return { page, context: ctx, errors };
}

// wait for the debounced share link / autosave (500 ms) to settle
export const settle = (page, ms = 700) => page.waitForTimeout(ms);
