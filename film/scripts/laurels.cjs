// Renders the laurels the film shows with Daphne's own engine and presets
// (prototype/engine.mjs), so every laurel on screen is one Daphne really makes.
// Writes public/laurels/<id>.svg with live text in the preset's own face; the
// film loads that face from @fontsource so the text renders the same.
//
//   node scripts/laurels.cjs      (needs Playwright and network for Google Fonts)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const repo = path.resolve(__dirname, "../..");
const outDir = path.resolve(__dirname, "../public/laurels");
fs.mkdirSync(outDir, { recursive: true });

// Placeholder words nobody could mistake for a real selection (brand/README.md, Laurels in the brand).
const SAMPLES = [
  { id: "classic-gold", preset: "Classic Gold", words: ["Official Selection", "Your Festival", "2026"] },
  { id: "black-tie", preset: "Black Tie", words: ["World Premiere", "Your Festival", "2026"] },
  { id: "laureate", preset: "Laureate", words: ["Winner", "Best Short Film", "Your Festival 2026"] },
];

const page = `<!doctype html><meta charset="utf-8"><body><script type="module">
import { render, DEFAULT_DOC, clone, merge, applyForm } from '/prototype/engine.mjs';
import { PRESETS } from '/prototype/presets.js';
import { loadFont } from '/prototype/fonts.js';
const SAMPLES = ${JSON.stringify(SAMPLES)};
const mctx = document.createElement('canvas').getContext('2d');
const measure = (s, font, weight, italic, size) => { mctx.font = (italic ? 'italic ' : '') + weight + ' ' + size + 'px "' + font + '", sans-serif'; return mctx.measureText(s).width; };
const out = {};
for (const s of SAMPLES) {
  const p = PRESETS.find((q) => q.name === s.preset);
  let d = clone(DEFAULT_DOC); if (p.doc.form) d = applyForm(d, p.doc.form); d = merge(d, p.doc);
  d.fields = d.fields.map((f, i) => ({ ...f, text: s.words[i] ?? f.text, show: i < s.words.length }));
  d.canvas = { ...d.canvas, bg: null };
  const fonts = new Map(); for (const r of Object.values(d.roles)) if (r && r.font) { if (!fonts.has(r.font)) fonts.set(r.font, new Set()); fonts.get(r.font).add(r.weight || 400); }
  await Promise.all([...fonts].map(([f, ws]) => loadFont(f, [...ws])));
  await document.fonts.ready;
  const r = render(d, { measure, scale: 1 });
  out[s.id] = { svg: r.svg, viewBox: r.viewBox, fonts: [...fonts].map(([f, ws]) => [f, [...ws]]) };
}
window.__out = out;
</script>`;

const types = { ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/__laurels") { res.writeHead(200, { "content-type": "text/html" }); return res.end(page); }
  const file = path.join(repo, url);
  if (!file.startsWith(repo) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const p = await browser.newPage();
  p.on("pageerror", (e) => console.error("page error:", e.message));
  await p.goto(`http://localhost:${server.address().port}/__laurels`);
  await p.waitForFunction(() => window.__out, null, { timeout: 60000 });
  const out = await p.evaluate(() => window.__out);
  const gen = ["// Written by scripts/laurels.cjs from Daphne's engine: don't edit by hand.", ""];
  for (const [id, o] of Object.entries(out)) {
    fs.writeFileSync(path.join(outDir, `${id}.svg`), o.svg);
    gen.push(`export const ${id.replace(/-(\w)/g, (_, c) => c.toUpperCase())} = { viewBox: ${JSON.stringify(o.viewBox)}, svg: ${JSON.stringify(o.svg)} };`);
    console.log(`public/laurels/${id}.svg  viewBox ${o.viewBox.map((n) => Math.round(n)).join(" ")}  fonts ${JSON.stringify(o.fonts)}`);
  }
  fs.writeFileSync(path.resolve(__dirname, "../src/film/laurels.gen.ts"), gen.join("\n") + "\n");
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
