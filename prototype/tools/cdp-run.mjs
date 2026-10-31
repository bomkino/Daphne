// Opens a page in headless Chrome on the real clock (no virtual time, which freezes performance.now()), waits until a
// condition holds, and prints an expression's value. Needs the dev server (python3 ../serve.py 5178) and Node 22+.
//   node tools/cdp-run.mjs "http://127.0.0.1:5178/perf.html?extra=30"
//   node tools/cdp-run.mjs "http://127.0.0.1:5178/stress.html?px=160" "JSON.stringify({ total: __stress.total, bad: __stress.bad })" "!!window.__stress"
// args: url, expression to print (default: #out's text), condition to wait for (default: document.title === 'done')
import { spawn } from 'node:child_process';
const url = process.argv[2], expr = process.argv[3] || "document.getElementById('out').textContent", until = process.argv[4] || "document.title === 'done'";
const port = 9333 + Math.floor(Math.random() * 500);
const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=' + (process.env.TMPDIR || '/tmp/') + 'daphne-cdp-' + port, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
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
const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
console.log(r.result?.result?.value ?? JSON.stringify(r.result?.exceptionDetails || r).slice(0, 2000));
sock.close(); ch.kill();
