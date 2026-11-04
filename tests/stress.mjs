#!/usr/bin/env node
// The 1,702-case stress suite (prototype/stress.html), headless. Fails on any bad case.
//   node tests/stress.mjs             fails on any bad case
//   node tests/stress.mjs --allow 1   tolerates N known bad cases
import { setup } from './lib.mjs';

const { url, browser, close } = await setup();
const page = await browser.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url + 'stress.html?px=160');
await page.waitForFunction('!!window.__stress', null, { timeout: 600000 });
const s = await page.evaluate(() => window.__stress);
console.log(`stress: ${s.total - s.bad}/${s.total} clean, ${s.adv} advisories, max ${s.maxMs.toFixed(0)} ms, max ${s.maxKb.toFixed(0)} KB`);
for (const [k, n] of Object.entries(s.kinds)) console.log(`  ${n} × ${k}`);
if (s.bad) { for (const f of s.fails) console.log('  ✗ ' + f); console.log('  failing documents: window.__docs on the stress page'); }
if (errors.length) console.log('page errors:', errors);
await close();
const allow = process.argv.includes('--allow') ? +process.argv[process.argv.indexOf('--allow') + 1] : 0;
process.exit(s.bad > allow || errors.length ? 1 : 0);
