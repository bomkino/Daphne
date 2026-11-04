#!/usr/bin/env node
// Builds Daphne for https://pitch.dog/daphne/ into dist-pitchdog/.
//
// The app in prototype/ has no build step and works under any base path, so this
// copies it as it is, minus the test and QA pages, and adds what only pitch.dog
// needs: the canonical link, pitch.dog's page-view analytics (no session replay)
// and BUILD.json, which names the commit it came from. It stops on an inline
// <script>, which pitch.dog's Content-Security-Policy would block.
//
// pitch.dog/daphne/story/ is Daphne's story, told as you scroll (prototype/story/), and
// this build ships it from there, with the story film as a section of it (film.js, daphne-story-*.mp4).
//
//   node tools/build-pitchdog.mjs
//
// Run it from a clean checkout of main, then copy dist-pitchdog/ into the
// website as apps/main-site/daphne/ (see the README, "Publish to pitch.dog").
import { execFileSync } from 'node:child_process'
import { cp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const app = join(root, 'prototype')
const out = join(root, 'dist-pitchdog')
const base = '/daphne/'

// Development-only pages and tools: the stress suite, QA sheets, timing, specimens and the headless runners.
const devOnly = (name) => ['tools', 'stress.html', 'stress.js', 'lab.html', 'perf.html', '.DS_Store'].includes(name) || /^qa.*\.html$/.test(name)

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const commit = git('rev-parse', 'HEAD')
const dirty = git('status', '--porcelain', '--untracked-files=normal').split('\n').filter((line) => line && !line.endsWith('dist-pitchdog/')).length > 0

await rm(out, { recursive: true, force: true })
await cp(app, out, { recursive: true, filter: (src) => src === app || !devOnly(relative(app, src).split('/')[0]) && !src.endsWith('.DS_Store') })
await cp(join(root, 'LICENSE'), join(out, 'LICENSE.txt'))
await cp(join(root, 'LICENSE-CC0.md'), join(out, 'LICENSE-CC0.md'))

function replaceOnce(text, from, to, file = 'index.html') {
  const at = text.indexOf(from)
  if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`${file}: expected exactly one ${from}`)
  return text.slice(0, at) + to + text.slice(at + from.length)
}
// Page views only: the script drops the URL's #l= laurel link before anything is sent, and replay stays off.
const analytics = '<script src="/assets/site-analytics.js" data-analytics-replay="off" defer></script>\n</head>'
const indexPath = join(out, 'index.html')
let html = await readFile(indexPath, 'utf8')
html = replaceOnce(html, '<link rel="manifest"', `<link rel="canonical" href="https://pitch.dog${base}">\n<link rel="manifest"`)
html = replaceOnce(html, '</head>', analytics)
await writeFile(indexPath, html)
// The story page carries its own canonical link; it gets the same page-view count.
const storyPath = join(out, 'story', 'index.html')
await writeFile(storyPath, replaceOnce(await readFile(storyPath, 'utf8'), '</head>', analytics, 'story/index.html'))

// pitch.dog's Content-Security-Policy for /daphne/ runs scripts from files only, so an inline
// <script> would silently not run there. Catch it here instead of on the live site.
async function* pages(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* pages(path)
    else if (entry.name.endsWith('.html')) yield path
  }
}
const inline = /<script\b(?![^>]*\bsrc=)(?![^>]*type=["']application\/(?:ld\+)?json["'])[^>]*>/i
const blocked = []
for await (const path of pages(out)) if (inline.test(await readFile(path, 'utf8'))) blocked.push(relative(out, path))
if (blocked.length) {
  console.error(`Inline <script> in ${blocked.join(', ')}. pitch.dog's Content-Security-Policy blocks inline scripts, so move each one into a .js file next to its page.`)
  process.exit(1)
}

// D39: one release, one module graph. Every relative import and module script names the commit (?v=), so a browser
// holding an older cached app.js can never run it with a newer engine.mjs, or the other way round.
const v = commit.slice(0, 12)
const tag = (spec) => (spec.includes('?') ? spec : `${spec}?v=${v}`)
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'vendor') yield* walk(path) } else yield path
  }
}
for await (const path of walk(out)) {
  if (/\.m?js$/.test(path)) {
    const s = await readFile(path, 'utf8')
    await writeFile(path, s.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"?]+\.m?js)\2/g, (m, a, q, spec) => a + q + tag(spec) + q))
  } else if (path.endsWith('.html')) {
    const s = await readFile(path, 'utf8')
    await writeFile(path, s.replace(/(<script\b[^>]*\bsrc=|<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=)(["'])((?!https?:|\/)[^"'?]+\.m?js)\2/g, (m, a, q, spec) => a + q + tag(spec) + q))
  }
}

const build = {
  name: 'Daphne',
  source: 'https://github.com/bomkino/Daphne',
  commit,
  dirty,
  base,
  builtAt: new Date().toISOString(),
  built_with: 'node tools/build-pitchdog.mjs',
}
await writeFile(join(out, 'BUILD.json'), JSON.stringify(build, null, 2) + '\n')

let files = 0, bytes = 0
async function count(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await count(path)
    else { files++; bytes += (await stat(path)).size }
  }
}
await count(out)
console.log(`dist-pitchdog/: ${files} files, ${(bytes / 1048576).toFixed(1)} MB, from ${commit.slice(0, 7)}${dirty ? ' with uncommitted changes (commit first; the website check refuses a dirty build)' : ''}.`)
