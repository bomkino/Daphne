#!/usr/bin/env node
// Runs Daphne's tests: unit tests of the pure modules, then browser tests of the real UI.
//   node tests/run.mjs                 everything
//   node tests/run.mjs unit            unit tests only (no browser)
//   node tests/run.mjs browser/row     files whose path contains "browser/row"
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, startServer } from './lib.mjs';

const filter = process.argv.slice(2);
const files = ['unit', 'browser'].flatMap((dir) => readdirSync(join(ROOT, 'tests', dir)).filter((f) => f.endsWith('.test.mjs')).map((f) => `tests/${dir}/${f}`))
  .filter((f) => !filter.length || filter.some((x) => f.includes(x)));
if (!files.length) { console.error('No test files match', filter.join(' ')); process.exit(1); }
const needsBrowser = files.some((f) => f.startsWith('tests/browser/'));
const server = needsBrowser ? await startServer() : null;
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...(server ? { DAPHNE_URL: server.url } : {}) } });
server?.stop();
process.exit(r.status ?? 1);
