#!/usr/bin/env node
// Renders the default laurel and every preset and compares them with tests/looks-baseline.json,
// so no look changes by accident. An intended change: inspect the sheet, then --update.
//   node tests/looks.mjs                compare (exit 1 on any change)
//   node tests/looks.mjs --update       rewrite the baseline
//   node tests/looks.mjs --sheet x.png  also save a contact sheet of every look
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, setup } from './lib.mjs';

const args = process.argv.slice(2), file = join(ROOT, 'tests', 'looks-baseline.json');
const { url, browser, close } = await setup();
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
await page.goto(url + 'tools/looks.html');
await page.waitForFunction('!!window.__looks', null, { timeout: 300000 });
const looks = await page.evaluate(() => window.__looks);
const sheet = args[args.indexOf('--sheet') + 1];
if (args.includes('--sheet') && sheet) { await page.screenshot({ path: sheet, fullPage: true }); console.log('sheet:', sheet); }
await close();
const now = Object.fromEntries(looks.map((l) => [l.name, l.hash]));
if (args.includes('--update') || !existsSync(file)) { writeFileSync(file, JSON.stringify(now, null, 1) + '\n'); console.log(`looks: baseline written (${looks.length})`); process.exit(0); }
const was = JSON.parse(readFileSync(file, 'utf8'));
const changed = Object.keys({ ...was, ...now }).filter((k) => was[k] !== now[k]);
console.log(`looks: ${looks.length - changed.length}/${looks.length} unchanged`);
for (const k of changed) console.log('  changed:', k);
process.exit(changed.length ? 1 : 0);
