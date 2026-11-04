// D39: the pitch.dog build is one module graph: every module the page loads names the same release
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setup } from '../lib.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

test('every module in the build carries the release, and the built app runs', async () => {
  execFileSync('node', ['tools/build-pitchdog.mjs'], { cwd: ROOT, stdio: 'ignore' });
  const v = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().slice(0, 12);
  const port = await freePort(), srv = spawn('python3', ['-m', 'http.server', String(port), '--directory', 'dist-pitchdog'], { cwd: ROOT, stdio: 'ignore' });
  const { browser } = await setup();
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
    const context = await browser.newContext(), page = await context.newPage(), errors = [], modules = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { const u = new URL(r.url()); if (u.port === String(port) && /\.m?js$/.test(u.pathname) && !u.pathname.includes('/vendor/') && !u.pathname.startsWith('/assets/site-')) modules.push(u.pathname + u.search); });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForFunction(() => document.querySelector('#stage svg'));
    await page.goto(`http://localhost:${port}/story/`); await page.waitForTimeout(500);
    assert.ok(modules.length > 10, modules.join('\n'));
    assert.deepEqual(modules.filter((m) => !m.endsWith(`?v=${v}`)), [], 'every app module names this release');
    assert.deepEqual(errors, []);
    await context.close();
  } finally { srv.kill(); await (await setup()).close(); }
});
