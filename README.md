# Daphne · Free festival laurel maker for filmmakers

**Make festival laurels for your film. It's free.**

Daphne makes festival laurels, the wreaths on a film's poster that say it was selected for, or won at, a festival. Type the festival, your selection and the year, pick a look, and download it for your poster, trailer and socials as a PNG, SVG, PDF or video. It's free and works in your browser, with no account and no watermark. Nothing you make leaves your device unless you share it. Made by pitch.dog, and open source. It lives at https://pitch.dog/daphne/.

This repository holds the working prototype, the product plan and the research behind it.

## Run it

```
python3 serve.py 5178
```

Then open http://127.0.0.1:5178/. `serve.py` is a small static server for `prototype/` that tells the browser never to cache, so an edited file is always the one that runs. There's no build step. The app works under any base path, including `/daphne/`.

## What it does

- **From the email.** Paste the festival's acceptance email and Daphne picks out the status, the festival, the year, the award, the edition, the section and the film's title (for the social card). It's read in the browser and recognizes a decline.
- **Words first.** Pick what the festival gave you (Official Selection, Winner, premieres, mentions, and the common statuses in French, Spanish, Italian, German and Portuguese), then the festival, the award and the year (2026, MMXXVI or '26). Every line stays editable underneath.
- **A festival list, text only.** 268 real festivals with their official names, cities, months, focus, sections, official sites and recent renames or moves. Picking one spells the name right and offers its city, short name, own-language name and sections. Where a festival publishes laurel rules, Daphne shows them with a link to the source.
- **Looks:** a procedural engine for wreaths, leaves, ties and badges, with a layout engine that fits the words. 78 looks and 18 layouts preview live on the stage as you hover. Foil, letterpress, grain, misprint, shadow and glow.
- **Export, by where it's going:**
  - **Laurel kit:** one ZIP with SVG, PNG and PDF in the original colors, black and white, plus a README with the alt text, fonts and readable sizes;
  - **Poster and print:** an exact size in inches or millimeters, a vector PDF and a 300 dpi PNG, with a warning when the smallest words would print under 6 pt;
  - **Social post:** square, portrait, story and landscape cards with the film's title, a detail line and an optional photo, plus a starter caption;
  - **Trailer and video:** a transparent HD or 4K end-card frame, with the laurel centered, in the lower third or in a corner;
  - **Website and email signature:** files and HTML snippets with alt text, previewed in light and dark inboxes;
  - **Accolades text:** your laurels as a list, a sentence or HTML, ordered by prestige;
  - **Festival pack:** for festivals, one laurel for every status and award they give, in every colorway, with guidelines to send to filmmakers.
- **Official-laurel fixer:** drop in a festival's own file and Daphne takes out a white or black background with clean edges, can set it in one ink, trims it and evens its margins, then adds it to the laurel or the row.
- **On poster:** place the laurel on your poster, with a contrast score, auto ink, colors taken from the poster, a view at 160 px and a mockup PNG.
- **Row:** a table of laurels. Paste rows from a spreadsheet, order them by prestige, lay them out as one row, tiered or a grid with one type size, and export separate files at one shared scale.
- **Motion:** a trailer end card, exported as MP4, a transparent PNG sequence or an animated SVG.
- **Small sizes:** see the laurel at 160, 100 and 64 px on dark and light, the sizes it will really be seen at.
- **Autosave and share links:** the laurel is kept in the browser and the whole design fits in a link.

## Files

| Path | What it is |
|---|---|
| `LICENSE`, `LICENSE-CC0.md`, `CONTRIBUTING.md` | MIT for the code, CC0 for everything else, and how to help |
| `00 — Product plan.md` | The full plan: principles, the laurel document, the layout engine, export, motion, rules, roadmap |
| `02 — Overhaul plan.md` | The blindspot check and milestones for the October 2026 overhaul |
| `research/` | Laurel anatomy, festival rules, rival tools, fonts and export needs |
| `prototype/engine.mjs` | The engine: pure functions with no dependencies, which run in Node and the browser |
| `prototype/index.html`, `app.js` | The app shell |
| `prototype/words.js`, `festivals.js`, `email.js` | The Words tab, the festival list and the email reader |
| `prototype/studio.js`, `fixer.js` | The Export studio (kit, print, social, video, web, email, accolades, festival pack) and the official-laurel fixer |
| `prototype/poster.js`, `row.js`, `motion.js` | The On poster, Row and Motion views |
| `prototype/outline.js`, `zip.js` | Outlined SVG, PDF and ZIP |
| `prototype/presets.js`, `layouts.js`, `rules.js`, `fonts.js` | Looks, layouts, the festival rules registry and the font list |
| `prototype/assets/`, `manifest.webmanifest` | Daphne's logo, favicons, app icons, social card and leaf brackets, and the PD fonts (CC0) trimmed to Latin and to the weights the app uses. Copied from the identity in `brand/` |
| `prototype/vendor/` | harfbuzzjs, jsPDF, svg2pdf.js and mp4-muxer, copied unchanged with their MIT licenses |
| `prototype/stress.html`, `qa*.html`, `perf.html`, `lab.html` | The stress suite, visual QA pages, timing and leaf-craft specimens |
| `prototype/tools/` | Headless Chrome runners for the stress suite and screenshots, and a feature sheet |
| `spike/` | The engine's first draft, kept for reference |

## Tests

The stress suite renders 1,702 cases and checks each real SVG for overlaps, clipping and text below a legibility floor. It needs `serve.py` running and Node 22 or later:

```
cd prototype
node tools/cdp-run.mjs "http://127.0.0.1:5178/stress.html?px=160" "JSON.stringify({ total: __stress.total, bad: __stress.bad })" "!!window.__stress"
```

`cdp-run.mjs` looks for Chrome at its macOS path. Anywhere else, open the same page in any browser, or with Playwright, and read `window.__stress` once it appears.

## Publish to pitch.dog

Daphne is served at https://pitch.dog/daphne/ from pitch.dog's website repository, which holds a copy of a build from here. To publish a new version:

1. From a clean checkout of `main`, run `node tools/build-pitchdog.mjs`. It copies the app from `prototype/` into `dist-pitchdog/` without the stress suite, QA pages and tools, adds the canonical link, pitch.dog's page-view analytics (no session replay; the `#l=` laurel link is never sent) and the licenses, and writes `BUILD.json` with the commit.
2. In the website repository, replace `apps/main-site/daphne/` with `dist-pitchdog/`, run its checks and open a pull request. The pull request gets a preview, and merging it puts the new version live.

**https://pitch.dog/daphne/story/ is kept for the story film.** Its page goes in `prototype/story/`, and the build ships it from there. Keep each file under 25 MiB, the website host's limit per file, so a long film needs a smaller encode or a video host.

pitch.dog serves scripts with up to four hours of browser caching, so for a while after a release a returning visitor can run an older module beside a newer one. Keep what each module exports backward compatible from one release to the next.

## Notes

- No festival logos ship with Daphne, and no lookalikes. Official artwork is something the user adds, and it stays on their device.
- Laurels made with Daphne are the filmmaker's own claims. Daphne isn't affiliated with or endorsed by any festival.
- Outlining fetches font files from jsDelivr's mirror of the Google Fonts repository, and from GitHub's raw host when jsDelivr is blocked. The public version will host pinned copies itself.
- The festival list was compiled in October 2026 from the festivals' own sites and press. Names, cities and sections change, so the app always points to each festival's site. Corrections are one line each in `prototype/festivals.js`.

## Open source

Daphne is as open as we can make it.

- **The code is MIT**; see `LICENSE`. The vendored libraries keep their own MIT licenses.
- **Everything else we made is public domain (CC0):** the looks and layouts, the festival list, the laurel rules, the status words, the brand in `brand/` and its copies in `prototype/assets/` (the PD fonts included), and the plans and research. See `LICENSE-CC0.md`.
- **What you make is yours.** Daphne claims no rights in the laurels people make and asks for no credit.
- Festival names and artwork belong to the festivals, and the fonts inside laurels keep their own open licenses.

Corrections and additions are welcome, a festival's name or city as much as a new feature: see `CONTRIBUTING.md`.
