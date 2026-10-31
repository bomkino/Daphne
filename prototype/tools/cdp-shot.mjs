// Full-page screenshot of a page in headless Chrome, once a condition holds. Needs the dev server and Node 22+.
//   node tools/cdp-shot.mjs "http://127.0.0.1:5178/qa-outline.html" out.png [until] [width] [scale] [setup.js] [height]
// until defaults to document.title === 'done'; width is the window width (default 1400); scale the device pixel ratio;
// setup.js is evaluated in the page (awaited) once `until` holds, then the page settles for a second before the shot;
// height (default: the whole page) shoots just the window.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const [url, file, until = "document.title === 'done'", width = '1400', scale = '1', setup = '', height = ''] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=' + (process.env.TMPDIR || '/tmp/') + 'daphne-cdp-' + port, `--window-size=${width},${height || 1000}`, `--force-device-scale-factor=${scale}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50; i++) { try { const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const pg = j.find((t) => t.type === 'page'); if (pg) { ws = pg.webSocketDebuggerUrl; break; } } catch {} await sleep(200); }
const sock = new WebSocket(ws); await new Promise((r) => (sock.onopen = r));
let id = 0; const pend = new Map();
sock.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
await send('Page.navigate', { url });
const t0 = Date.now();
while (Date.now() - t0 < 600000) { const r = await send('Runtime.evaluate', { expression: until }); if (r.result?.result?.value === true) break; await sleep(250); }
await sleep(300);
if (setup) { const r = await send('Runtime.evaluate', { expression: readFileSync(setup, 'utf8'), awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log('setup error', JSON.stringify(r.result.exceptionDetails).slice(0, 600)); else console.log('setup:', JSON.stringify(r.result?.result?.value ?? null).slice(0, 400)); await sleep(1200); }
const m = await send('Page.getLayoutMetrics');
const { width: cw, height: chh } = m.result.cssContentSize;
const shot = await send('Page.captureScreenshot', height ? { format: 'png' } : { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cw, height: Math.min(chh, 16000), scale: 1 } });
writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
console.log(file, Math.round(cw), Math.round(chh));
sock.close(); ch.kill();
