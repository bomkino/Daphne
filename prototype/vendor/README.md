# Vendored libraries

Copied unchanged from npm (via jsDelivr) on 31 Oct 2026, so Daphne runs with no third-party scripts at runtime. All MIT.

| File | Package | Used for |
|---|---|---|
| `harfbuzz.js`, `harfbuzz.wasm`, `hb-index.mjs` | harfbuzzjs 1.6.3 (`dist/`) | Shaping text and reading glyph outlines for outlined SVG and PDF |
| `jspdf.umd.min.js` | jspdf 4.2.1 | Writing the PDF |
| `svg2pdf.umd.min.js` | svg2pdf.js 2.8.1 | Drawing the outlined SVG into the PDF |
| `mp4-muxer.mjs` | mp4-muxer 5.2.2 (`build/`) | Packing H.264 frames into an MP4 |

`hb-index.mjs` is the package's `dist/index.mjs`, renamed. Licences are alongside as `LICENSE-*`.
