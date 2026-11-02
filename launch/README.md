# Daphne's carousels

Fifteen carousels for Instagram and LinkedIn that launch Daphne and give it away, one idea each: 93 slides at 1080 × 1350 (4:5),
the size both feeds show tallest. Captions, the posting order and how to post them are in
[carousels/captions.md](carousels/captions.md); alt text for every slide is in [carousels/alt-text.md](carousels/alt-text.md);
a contact sheet of each carousel is in [carousels/sheets/](carousels/sheets/).

| # | Carousel | Slides | Opens on |
|---|---|---|---|
| 01 | launch | 7 | (Your film) did the hard part. |
| 02 | myth | 7 | The first laurel was a woman named Daphne. |
| 03 | email | 6 | This email is a laurel. |
| 04 | six | 8 | Six things to know before a laurel goes on your poster. |
| 05 | festivals | 5 | Every laurel your festival gives, made in one go. |
| 06 | read | 5 | Can you read this laurel? |
| 07 | tonight | 6 | You’re in. You can’t tell anyone yet. |
| 08 | films | 8 | Your film isn’t gold. |
| 09 | fixer | 6 | Your festival sent a JPEG. |
| 10 | herbarium | 7 | No one drew these leaves. |
| 11 | announce | 5 | The lineup is out. Say it. |
| 12 | leafless | 6 | A laurel doesn’t need leaves. |
| 13 | anatomy | 6 | Anatomy of a festival laurel. |
| 14 | endcard | 6 | The last four seconds of your trailer. |
| 15 | link | 5 | Send your designer a link, not a file. |

The slides themselves (PNG for Instagram, a PDF per carousel for LinkedIn) are not kept in the repo, since they rebuild
from source in a few minutes. Like the rest of `brand/`, everything here is public domain (CC0).

## How it's made

Every laurel on a slide is drawn by Daphne's own engine, and every panel of the app is a capture of the real thing,
with the festival set to "Your Festival". No real festival is named or shown. The faces, colors and leaf brackets
come from `brand/`.

Each slide is HTML in [src/sets.js](src/sets.js) (01 to 05) or [src/sets-more.js](src/sets-more.js) (06 to 15), with its alt text beside it. The film posters in 06 to 15 are made up, drawn for the slides in [src/art/](src/art/); the laurels on them are Daphne's own looks. Herbarium is the one light set, on Paper. The myth's line of light is drawn on one
canvas across its slides by [src/myth.js](src/myth.js). Before anything renders, [src/slides.js](src/slides.js) checks every
slide and refuses to render a carousel when:

- a block, or an image inside it, leaves the safe box, 60 px in from every edge (Instagram's grid crops a 4:5 cover
  to 3:4, and LinkedIn draws over a corner);
- a line of words overflows its box or the safe box;
- words are set under 26 px;
- two blocks overlap, or a block crowds the slide counter;
- a slide carries more than one pink (Bloom) accent, or sets Bloom as text on a light slide.

The myth also checks that its lines and leaves stay in frame and off the words. After rendering, `finish.py` checks
that nothing bright touches an outer edge of any slide (nothing dark, on the light set).

## Rebuild

Needs Node with Playwright (and its Chromium) and Python with Pillow. From the repo root:

```sh
node launch/tools/laurels.mjs      # draws the laurels with the app's engine → launch/src/laurels/, laurels.json
node launch/tools/brand-data.mjs   # the brand's leaf path for the myth → launch/src/brand.json
node launch/tools/capture.mjs      # captures the app's panels at 4× → launch/src/captures/
node launch/tools/capture-more.mjs # the panels 06 to 15 show: On poster, the clean-up, the social card, motion → captures/more.json
node launch/tools/render.mjs       # renders every carousel at 2× after the checks → launch/out/ (or name sets: launch myth)
python3 launch/tools/finish.py     # Instagram PNGs, LinkedIn PDFs, contact sheets, alt text, edge check → launch/carousels/
```

The first four only need running again when the app, the brand or the words in the laurels change. To look at one
carousel in a browser, serve the repo root and open `launch/src/index.html?set=myth`.
