# Daphne

**Daphne: free festival laurels for filmmakers.** A free, open-source laurel maker from pitch.dog. It runs in the browser, with no account, no watermark and no server. It will live at pitch.dog/daphne.

This repository holds the working prototype, the product plan and the research behind it.

## Run it

```
python3 serve.py 5178
```

Then open http://127.0.0.1:5178/. `serve.py` is a small static server for `prototype/` that tells the browser never to cache, so an edited file is always the one that runs. There's no build step. The app works under any base path, including `/daphne/`.

## What it does

- **Laurel:**
  - a procedural engine for wreaths, leaves, ties and badges, with a layout engine that fits the words;
  - 78 looks and 18 layouts, with logo upload;
  - foil, letterpress, grain, misprint, shadow and glow;
  - share links and undo.
- **On poster:** place the laurel on your poster. You get a contrast score and auto ink, colours taken from the poster, a view at 160 px and a mockup PNG.
- **Row:** a table of laurels.
  - Paste rows from a spreadsheet.
  - Order them by prestige.
  - Lay them out as one row, tiered or a grid, with the same type size throughout.
  - Export a ZIP of separate files at one shared scale.
- **Motion:** a trailer end card, exported as MP4, a transparent PNG sequence or an animated SVG.
- **Export:**
  - SVG with the text outlined (HarfBuzz, with Noto for missing characters), or with live text;
  - vector PDF;
  - PNG at any width.
- **Festival rules:** gentle notes taken from festivals' published rules, each with a link to its source (`prototype/rules.js`).

## Files

| Path | What it is |
|---|---|
| `00 — Product plan.md` | The full plan: principles, the laurel document, the layout engine, export, motion, rules, roadmap |
| `research/` | Laurel anatomy, festival rules, rival tools, fonts and export needs |
| `prototype/engine.mjs` | The engine: pure functions with no dependencies, which run in Node and the browser |
| `prototype/index.html`, `app.js` | The app |
| `prototype/poster.js`, `row.js`, `motion.js` | The On poster, Row and Motion views |
| `prototype/outline.js`, `zip.js` | Outlined SVG, PDF and ZIP |
| `prototype/presets.js`, `layouts.js`, `rules.js`, `fonts.js` | Looks, layouts, the festival rules registry and the font list |
| `prototype/vendor/` | harfbuzzjs, jsPDF, svg2pdf.js and mp4-muxer, copied unchanged with their MIT licences |
| `prototype/stress.html`, `qa*.html`, `perf.html`, `lab.html` | The stress suite, visual QA pages, timing and leaf-craft specimens |
| `prototype/tools/` | Headless Chrome runners for the stress suite and screenshots, and a feature sheet |
| `spike/` | The engine's first draft, kept for reference |

## Tests

The stress suite renders 1,702 cases and checks each real SVG for overlaps, clipping and text below a legibility floor. It needs `serve.py` running and Node 22 or later:

```
cd prototype
node tools/cdp-run.mjs "http://127.0.0.1:5178/stress.html?px=160" "JSON.stringify({ total: __stress.total, bad: __stress.bad })" "!!window.__stress"
```

## Notes

- No festival logos ship with Daphne. Official artwork is something the user uploads, and it stays on their device.
- Laurels made with Daphne are the filmmaker's own claims. Daphne isn't affiliated with or endorsed by any festival.
- Outlining currently fetches font files from jsDelivr's mirror of the Google Fonts repository. The public version will host pinned copies itself.

## Licence

The code is MIT; see `LICENSE`. The vendored libraries keep their own MIT licences. The plan proposes CC0 for the presets, the rules data and everything people make with the tool; that's still to be confirmed.
