# Daphne — overhaul plan

pitch.dog · October 31, 2026 · the plan behind the overhaul branch

The prototype already has the best laurel engine anyone has built: real leaf craft, a layout engine that measures the space between the leaves, rows, poster checks, motion and outlined export. What it lacks is everything around the engine. A filmmaker who just got the email has to scroll past 78 preset tiles to type their festival's name, learns about export settings from a collapsed panel, and leaves with one file when they needed six. This plan turns the engine into a product.

## The goal

**From the email to everything you need, in two minutes, and it looks like a designer made it.** A filmmaker types the festival's name and gets its correct official name, city and rules. They pick what they got from a list of real statuses. They leave with a kit: the laurel in its look, in black and in white, as transparent PNG, SVG and PDF, an Instagram post, alt text and a note on how to use it. A festival makes the whole year's laurel pack in one go. A filmmaker who already has the festival's black-on-white PNG makes it transparent and the right colour without Photoshop.

## Blindspot check: what a user hits today

| # | What happens | Why it matters | Fix |
|---|---|---|---|
| 1 | The words sit under 78 preset tiles and three technical selects (kind, role, slot) | The first thing everyone does is the hardest to find | Words first: a guided panel that opens the app |
| 2 | The festival name is free text | People shorten "Sundance Film Festival", keep "Tribeca Film Festival", misspell names | A festival database with autocomplete, official names, city, country, site and rules |
| 3 | Close the tab without copying the link and the laurel is gone | Losing work is the fastest way to lose trust | Autosave in the browser, restored on return |
| 4 | Export is three buttons, with sizes hidden under "Canvas & export" | People don't know which file a poster, a trailer or Instagram needs | An export studio organised by where the laurel is going |
| 5 | One file per click, one colourway | Posters, EPKs and trailers need black, white and the look, transparent and solid | A one-click laurel kit (ZIP) with every format, colourway and a README |
| 6 | The most-shared thing is the announcement post, and Daphne doesn't make it | "We're selected!" goes up the day the email arrives | Social cards: the laurel on the look, a still or the poster, in 1:1, 4:5 and 9:16 |
| 7 | Festivals hand out black-on-white PNGs | The most common complaint in the research: making them transparent and recolouring them | An official-laurel fixer: remove the background, recolour, trim, even padding |
| 8 | Festivals make laurels one at a time in FilmFreeway's generic tool | Thousands of small festivals, every selected film | A festival pack: every status and award in every colourway, one ZIP |
| 9 | No alt text, no SVG title | Websites and press pages need it; accessibility is part of the job | Alt text written from the words, in the SVG and copyable |
| 10 | Statuses only in English | Laurels for European festivals are often in the festival's language | Status chips in French, Spanish, Italian, German and Portuguese |
| 11 | Outlined export depends on one CDN | Blocked networks fall back to live text silently | A second mirror for the font files |
| 12 | Press kits, websites and IMDb want the accolades as text: "3 wins, 6 nominations", then the list | People retype them by hand, and get the wording wrong | Accolades text from the row: counts and a clean list, copyable |
| 13 | Print sizes are guesses: a 400 px laurel at 5 inches prints at 80 dpi | Blurry laurels on a one-sheet | Print sizes in inches and millimetres at 300 dpi, and a warning below that |
| 14 | The UI looks like a dev tool | It should feel like a $99 product | A new shell: editorial identity, a stage with backdrops, hover previews, real-size previews, a command palette |

Fresh reading for this pass (Shooting People, FilmFreeway's "Festing on your laurels", IndieTalk, Tools for Film, Laurel Designer Pro, Stareable) added three needs the first research didn't stress: the accolades as text for press kits and IMDb, one laurel per announcement with the festival tagged, and lobby cards or posts that carry the screening time and place. It also confirmed the top complaint: festival files arrive as low-res JPEGs on white that clash with dark key art.

## Festival logos

Real festival logos and laurels are trademarked artwork, so Daphne ships none. In their place:

- **A festival database** (`prototype/festivals.js`): about 200 festivals with their official name as used on laurels, short name, aliases, city, country, the month they usually run, focus (features, shorts, documentary, animation, genre, LGBTQ+, kids, student), a rough tier for row ordering and the official site. Picking one fills the festival line and the location line.
- **Their rules** stay in `rules.js`, joined by id: who requires or supplies official artwork, who forbids shortening, who changed name.
- **Official artwork** comes from the festival. The festival card links to the official site (and to the laurel guidelines where we know them) with one line: "Festivals send their official laurels to selected films. Use theirs where they ask you to." The fixer then helps with the file they sent.
- The data is open: one file, plain objects, corrections welcome.

## Milestones

1. **The new shell and Words first.** Top bar with the wordmark, views, undo, share and Export. A left rail: Words, Looks, Wreath, Type, Colour, Canvas. Words opens the app: what you got (status chips), the festival (autocomplete from the database), the award, the year, the place; all lines below for full control. Looks: the preset gallery with group filters and a live preview on the stage when you hover a tile. A stage with backdrops (dark, light, checker, poster colours) and real-size previews. Autosave. Labels and focus for every control.
2. **The festival database**, wired into the autocomplete, the rules notes and the prestige order in rows.
3. **The export studio.** Destinations: quick files, social, poster and print, trailer, web, email signature. Colourways: as designed, black, white. Alt text and an HTML snippet. The laurel kit ZIP. Social cards.
4. **The official-laurel fixer.** Upload a PNG or JPEG: key out the background, recolour, trim, even padding. Use it as a logo line or in a row.
5. **The festival pack.** One festival, every status and award, every colourway, one ZIP with a README.
6. **Craft and robustness.** Review every preset large and fix what's weak. Second font mirror. One-colour exports that are truly one colour.
7. **Phone, QA and docs.** The editor on a phone, the stress suite green, README and plan updated, PR.

## Progress (October 31, 2026)

Milestones 1 to 5 are built and tested in the browser: the shell and Words tab, the festival database (268 festivals), the export studio with the laurel kit, the fixer and the festival pack. From milestone 6, the second font mirror and true one-color exports are done (colorways turn metals, gradients, depth and effects into one ink). Milestone 7: the export studio and editor work on a phone; the stress suite passes 1,701 of 1,702 cases, and the one flag (a words-only badge case drawn slightly outside its canvas) was there before the overhaul. Copy follows the identity work: the tagline "Make festival laurels for your film. It's free." and US spelling in the interface. The interface accent moves from gold to the new identity palette once those assets are final, since gold belongs to the laurels people make.

## What stays the same

The engine's document, the share links (old links keep working), the stress suite, the views (poster, row, motion), the honesty guardrails, MIT for the code. No accounts, no server, no tracking, no watermark.
