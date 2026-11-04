# Daphne launch fixes: goal and plan

Started November 3, 2026. This file is the working plan and the record. Update the status column as fixes land; a new session starts here.

## The goal

**Before pitch.dog shares Daphne, it has no known bugs.** Every issue in the November 3 outside audit (67 groups) is fixed, or shown not to be a bug with a test that proves it. The ribbon year sits in the middle of its ribbon, and text can be centered, snapped, guided and gridded. The source is public.

How we'll know:

1. Every fix has a regression test in `tests/` that fails on the code before the fix and passes after it.
2. The 1,702-case stress suite passes with zero failures (K01, the one known badge case, passes since D04, November 4, 2026).
3. No look changes by accident: all 78 presets and the default laurel are rendered before and after each wave and compared. Intended changes are inspected by eye for clipping.
4. Each wave is checked in a real browser at 1440, 390 and 320 px wide, with a keyboard.
5. CI runs all of it on every push once the repository is public.

## Ground rules

- Smallest change that fixes the cause. Keep the vanilla modules, the look, local-first storage and the no-account model. No framework, no cloud storage.
- Truth first: Daphne never puts a claim on a laurel that the filmmaker didn't make. When in doubt, ask the user and keep their words.
- Never lose work: a design, an upload or an edit survives Undo, reload, a second tab and a failed save, or the user is told plainly.
- Old share links keep opening.
- Tests live in `tests/` at the repository root, outside `prototype/`, so they never ship.
- The website's shared nav and its CI belong to the site; Daphne's fixes are made here and copied there by the existing build.

## Tests

| Command | What it does |
| --- | --- |
| `node tests/run.mjs` | Unit tests for the pure modules (engine, rules, email, layouts) and browser tests of the real UI with Playwright against `serve.py` |
| `node tests/stress.mjs` | The 1,702-case stress suite, headless, failing on any new bad case |
| `node tests/looks.mjs` | Renders every preset to PNG and compares with the saved baseline |

## Waves, most valuable first

Each wave is one group of commits on the working branch, verified before the next starts.

**Wave 0 · Foundations.** Public repo (D17), the test harness above, CI in this repository (Daphne's part of D40).

**Wave 1 · Never state a false claim.** Email reading (D01), Accolades prose (D22), layouts adding example facts (J01), Row hiding festival names (D21), a hidden second medallion field (L04), a stale festival card (D32), a city from the wrong year (J08), invented 99 pt print advice (D20), Row captions describing the base laurel (D33), a missing logo described as present (J06), PNG promising transparency it won't have (J07), zero formats still downloading and wrong file counts (D34), a stale Social caption (D08), Social cards ignoring Title Case and Italic (V03).

**Wave 2 · Never lose work.** Row edits not saving (D18), uploads lost on Undo/reload and across tabs (D12), silent and out-of-order saves (D13), Undo restoring half an action (J02), broken or hostile share links (D05, D38), a second link in the same tab (D44), Social text leaking between films (J03), returning from Story to the wrong design (J04), a late logo landing on the wrong line (D31), the Fixer renaming the old result (D43), "Open this set again" losing the pack (D35), dropped text treated as a reorder (L05), invalid geometry at equal angles (D19), a custom path that hangs (D26).

**Wave 3 · Every file matches its preview.** Re-clicking a unit changes the size (D02), Motion showing old text (D03), Row ignoring the colorway (D07), an empty Row turning into the base laurel (V04, J05), Export not isolated and jobs mixing settings (D06, D29), font measurements not refreshing (D14), fonts failing silently or never retrying (D15, D30), text leaving the canvas while the check says clear (D04), "same size in every laurel" not the same (D36), Grow-in clipping ribbon tails (D37), poster replacement and late poster previews (D27, D28), tinted logos in PDF (D25), Arabic and Hindi shaping and 2026 reversed to 6202 (D23, D24), mixed module versions after a deploy (D39, in the build).

**Wave 4 · Works on every screen and keyboard.** Focus lost after an arrow step or a rebuild (D09, D10), the font picker at 320 px (D11), stacked Kit and Email previews overlapping (D45), Small sizes covering the art (V01), stale Export preview after a resize (V02), Motion ignoring reduced motion (D16), half-filled sliders (V05), clipped size labels (V06), the Mixed wreath button (V07), inherited and transparent swatches (V08), Story's lead paragraph width (V09), slow dense leaves (D42).

**Wave 5 · Placement.** The ribbon year centered (L01), ribbon, medallion and curved text editable like other text (L02), selecting text keeps the artwork in view and Reset appears at once (L03). Then Center and Reset per text group, keyboard nudges, snapping on by default with a bypass, sparse guides, and an optional grid that starts hidden. None of it ever enters an exported file.

**Wave 6 · Journey polish.** The smaller audit items (A01 to A24, C01 to C08, K01, K02), each fixed or closed with a reason here.

**Wave 7 · The rest (November 4, 2026).** The journey improvements left after launch (A01, A03, A04, A16, A17, C06), the font recipe (A18), and the site's half of D40 and D41, done in the site's repository (bomkino/pitchdog-cloudflare-sites#49) without touching its nav.

## Shipping

All work goes on the branch `claude/project-thread-tx7lhm` with one draft PR. Merging and publishing to pitch.dog/daphne happen once, when every wave is done (pitch.dog's choice, November 4, 2026), through the existing build (`node tools/build-pitchdog.mjs`) and a website PR.

## Status

| ID | Wave | Status | Test / note |
| --- | --- | --- | --- |
| D17 | 0 | fixed | Repo public (November 4, 2026), MIT detected by GitHub; tests and CI in the open |
| D40 | 0 | fixed | CI runs unit, browser, stress (no allowance) and looks on every push and PR, on the same Playwright as local runs. Site half: bomkino/pitchdog-cloudflare-sites#49 runs Daphne's browser checks on every Daphne release (JS-only ones too), always compares Daphne's build record, page and core modules live, and checks production serves the exact release commit |
| D01 | 1 | fixed | Status read per sentence about this film; unsure results unticked; tests/unit/email.test.mjs (6 of 12 fail on main) |
| D08 | 1 | fixed | Social caption and its Copy follow the title as typed; tests/browser/social.test.mjs (fails on main) |
| D20 | 1 | fixed | Smallest words read from the drawn SVG in every slot (flank, arcs, ribbon, medallion); no words means no size claim; pack guidelines use the variant that needs the most room; tests/browser/print.test.mjs (main says 99.0 pt), tests/unit/engine.test.mjs |
| D21 | 1 | fixed | Each row laurel's own words go in before its layout is chosen, so an inherited award no longer takes the festival's line; tests/browser/row.test.mjs (4 of 5 layouts fail on main) |
| D22 | 1 | fixed | Outcome read from qualifiers before award words; ranking is order only; no status, a submission or artwork metadata is never a selection; hidden row laurels left out; tests/unit/accolades.test.mjs (10 of 11 fail on main) |
| D32 | 1 | fixed | The card follows the name as it reads now; Every line and email edits drop a stale festival id; tests/browser/festival.test.mjs (fails on main) |
| D33 | 1 | fixed | Social and end-card caption, alt text, row count and file name describe the row as drawn (hidden and missing artwork left out); tests/browser/social.test.mjs (fails on main) |
| D34 | 1 | fixed | Kit and pack build from one plan: the count matches the files (on-background PNG and README included), zero colorways or formats disables Download and says why, no hidden fallback; tests/browser/export.test.mjs (fails on main) |
| J01 | 1 | fixed | Layouts and added lines arrive empty with a placeholder and a prompt; a status that qualifies an award stays shown; old untouched examples flagged; thumbnails keep examples as demos; tests/unit/layouts.test.mjs (6 of 8 fail on main), tests/browser/layouts.test.mjs (fails on main: "Best Documentary" in stage and alt text) |
| J06 | 1 | fixed | A logo missing on this device is not in the alt text, gets a note on the stage and at Export; missing row artwork is named when the output shows the row; Share says uploads stay on the device; tests/browser/social.test.mjs (fails on main) |
| J07 | 1 | fixed | PNG destination no longer promises transparency; the Download area says Background included or Transparent background, also on phones; tests/browser/export.test.mjs (fails on main) |
| J08 | 1 | fixed | Festivals that moved (Sundance, Slamdance) carry dated cities; the city offered follows the year (2026, MMXXVI, ’26), an unread year offers none, and a city from another year gets a note; tests/unit/festivals.test.mjs, tests/browser/festival.test.mjs (fails on main) |
| L04 | 1 | fixed | The medallion shows every line assigned to it, joined like a ribbon; warns when the text is too long to read or a star and words compete; the slot picker names who is already in it; tests/unit/engine.test.mjs (2 of 3 new fail on main) |
| V03 | 1 | fixed | Social card uses the laurel's casing (Title Case included) and italics for title and detail; tests/browser/social.test.mjs (fails on main) |
| D05 | 2 | fixed | Links are checked before use (sanitizeDoc): a damaged shape is refused and your last laurel stays, with a message; tests/unit/engine.test.mjs, tests/browser/links.test.mjs (fails on main) |
| D12 | 2 | fixed | Saved images are only added to (another tab's upload and Undo's logo stay); unused ones go after 30 days, oldest first when storage is full; tests/browser/saving.test.mjs (fails on main) |
| D13 | 2 | fixed | Saves carry a number and a late older one is dropped; an edit made as the page closes is kept and restored; a 'Not saved' badge and one toast when storage refuses; tests/browser/saving.test.mjs (fails on main). Reverse-order completion is guarded in code, not reproduced in a test |
| D18 | 2 | fixed | Row edits work on a fresh copy, so every edit redraws, saves to the link and undoes; tests/browser/history.test.mjs (fails on main) |
| D19 | 2 | fixed | A zero-length arc gets a one-degree span (6,496-case sweep finite); a drawing with no size never replaces the stage and says so; tests/unit/engine.test.mjs |
| D26 | 2 | fixed | bounded parser reads M L H V C S Q T A Z, exponents and packed arc flags; an unreadable paste keeps the last shape (tests: unit engine D26, browser shape) |
| D31 | 2 | fixed | a late logo finds its line by id; a newer upload wins; a removed line gets nothing; unreadable files are refused (tests: browser logos) |
| D35 | 2 | fixed | the pack recipe (statuses, awards, winner line, colorways, formats, sizes) travels in the laurel and its README link (test: browser pack) |
| D38 | 2 | fixed | Non-text strings can't carry quotes or markup, colors and gradient values are validated in paintRef, ids are sanitized, decompression is capped at 4 MB; tests/unit/engine.test.mjs, tests/browser/links.test.mjs (fails on main) |
| D43 | 2 | fixed | the cleaner swaps name, image and result together, only after a file is read (test: browser logos) |
| D44 | 2 | fixed | Opening another link in the same tab, or Back and Forward between links, loads that laurel (Undo returns); a broken one leaves the design and restores the address; tests/browser/links.test.mjs (fails on main) |
| J02 | 2 | fixed | A status choice and an email import are one Undo step each (film title included); a click on the stage selects without touching Redo, a drag is one step and pointercancel ends it; menu numbers stored as numbers; Undo/Redo show when unavailable; tests/browser/history.test.mjs (fails on main). Typing stays one step per edit by choice |
| J03 | 2 | fixed | The Social film title and detail live in the laurel's document (link and autosave), not device prefs; an email's film title goes there too; tests/browser/film.test.mjs (fails on main) |
| J04 | 2 | fixed | Leaving for the story remembers this tab's laurel; Make a laurel comes back to it, not the last autosave; tests/browser/links.test.mjs (fails on main) |
| L05 | 2 | fixed | Lines and Row entries reorder only from their own drag, by id; dropped text (numbers, words, empty, out of range) never moves or empties a list; tests/browser/history.test.mjs (fails on main) |
| D02 | 3 | fixed | one physical width; the unit only changes how it's shown (test: browser print, unit) |
| D03 | 3 | fixed | Motion keys its preview on what's drawn, not its length (test: browser motion) |
| D04 | 3 | fixed | every line's painted box, nudges and ink room included, sits in the canvas; a nudged line is judged where it's drawn (tests: unit engine D04) |
| D06 | 3 | fixed | one dialog at a time owns the keyboard: the page behind is inert, Undo and shortcuts wait, Escape closes the top dialog (test: browser dialog, 1440 and 390 px) |
| D07 | 3 | fixed | the row is composed from Export's colorway (test: browser rowexport) |
| D14 | 3 | fixed | A font that finishes loading forgets the widths measured with its stand-in and redraws (laurel, row, Export); tests/browser/fonts.test.mjs (fails on main) |
| D15 | 3 | fixed | Outlining never drops text: a run no font can draw, or a fallback that can't load, is an error; SVG falls back to live text and says why, PDF says why; tests/browser/outline.test.mjs (fails on main) |
| D23 | 3 | fixed | Text is shaped in whole runs of one script and direction; marked Arabic and Devanagari keep every glyph at any weight and tracking; tests/browser/outline.test.mjs (fails on main) |
| D24 | 3 | fixed | Bidi order (UAX #9, base left to right) before shaping, checked against the browser's own order; مهرجان 2026 stays 2026; tests/unit/outline.test.mjs, tests/browser/outline.test.mjs (fail on main) |
| D25 | 3 | fixed | Masked shapes (tinted logos) are drawn into a 600 dpi image before the PDF; tests/browser/pdf.test.mjs (fails on main) |
| D27 | 3 | fixed | Poster image swaps decode first and keep the old poster on failure, with a toast; tests/browser/poster.test.mjs (fails on main) |
| D28 | 3 | fixed | Poster's actual-size and normal drawings can't overwrite each other or a newer mode; tests/browser/poster.test.mjs (fails on main) |
| D29 | 3 | fixed | One download at a time; the kit and pack keep the sizes and link they started with; Motion exports keep their settings; tests/browser/export.test.mjs (fails on main) |
| D30 | 3 | fixed | Failed outline lookups and font stylesheets are asked for again (after 15 s); a PNG whose font can't be fetched says so instead of using a stand-in; tests/browser/fonts.test.mjs, outline.test.mjs (fail on main) |
| D36 | 3 | fixed | Same size in every laurel repeats the fit until every laurel lands on one size; tests/browser/row.test.mjs (fails on main) |
| D37 | 3 | fixed | Grow in fades in what the stem doesn't reach (ribbon tails, frames) as the growth ends; the last frame matches Already there; tests/browser/motion.test.mjs (fails on main) |
| D39 | 3 | fixed | The pitch.dog build tags every module, module script and modulepreload with the commit (?v=), so one release is one module graph; tests/browser/build.test.mjs |
| J05 | 3 | fixed | one rule for the row everywhere: examples are marked, shown on the stage, never exported; Your row is always in Export with an empty state and disabled downloads; Start with this laurel and Clear the examples (test: browser rowexport) |
| V04 | 3 | fixed | Motion, Social and Trailer say the row is empty instead of drawing this laurel; exports disabled (test: browser rowexport) |
| D09 | 4 | fixed | Motion's bar is built once and updated; Time keeps focus through arrows, Home and End; tests/browser/motion.test.mjs (fails on main) |
| D10 | 4 | fixed | Panel, rail, Export destinations and options rebuild with focus put back on the same control; More/Fewer updates aria-expanded; tests/browser/focus.test.mjs (fails on main) |
| D11 | 4 | fixed | Font picker fits the screen at any width, 8 px from each edge; tests/browser/narrow.test.mjs (fails on main) |
| D16 | 4 | fixed | Reduced motion opens Motion on its last frame, paused; an export never starts playback; tests/browser/motion.test.mjs (fails on main) |
| D42 | 4 | fixed | One edit draws once (the second draw only when a font arrived); dragging a slider over a slow wreath draws when the hand pauses; tests/browser/speed.test.mjs |
| D45 | 4 | fixed | On a phone the Export preview grows with stacked previews instead of covering the options; Email proofs keep their actual size and scroll if wider; tests/browser/narrow.test.mjs (Email fails on main) |
| V01 | 4 | fixed | Small sizes sits beside the laurel when both fit (the stage gives up its real width), else along the bottom in one scrolling row; phones stack it under the stage; proofs stay 160/100/64 px tall and say when to scroll; tests/browser/narrow.test.mjs (fails on main) |
| V02 | 4 | fixed | Export previews keep their ratio and refit on every resize; tests/browser/narrow.test.mjs (fails on main) |
| V05 | 4 | fixed | Every slider made by the app shows its fill on first draw, on input and during playback; tests/browser/motion.test.mjs (fails on main) |
| V06 | 4 | fixed | Every line's selects size to their longest choice and wrap instead of cutting labels; tests/browser/narrow.test.mjs (fails on main) |
| V07 | 4 | fixed | Mixed wreath is a switch (role=switch, aria-checked) reading ✓ Different right side when on; tests/browser/focus.test.mjs (fails on main) |
| V08 | 4 | fixed | An inherited paint's swatch shows the paint it inherits with a dashed ring; only a transparent background is a checkerboard; tests/browser/focus.test.mjs (fails on main) |
| V09 | 4 | fixed | Story's body rule no longer overrides the lead's 40ch measure; tests/browser/narrow.test.mjs (fails on main) |
| L01 | 5 | fixed | The ribbon's words sit on the band's middle line (baseline half a cap height below it) and are centered without the trailing letter-space, at any tracking; curved top and under text centered the same way; tests/browser/place.test.mjs (fails on main by 11 units) |
| L02 | 5 | fixed | Ribbon, medallion and curved words carry their fields' ids and move with the first field's nudge (band and tails with them); Every line shows Curved size, disabled, pointing to Type › Curved and ribbon text; italic applies to ribbon and medallion; tests/browser/place.test.mjs (fails on main). Join/unjoin keeps the first field's offset: the moved group is the joined line |
| L03 | 5 | fixed | Picking words glows them on the stage without a redraw and opens a placing strip (arrows, Center, Reset, Edit words, Done); Reset is there right after a drag, on the strip and the line; on a phone the panel no longer scrolls the laurel away and the strip sits under the laurel; tests/browser/place.test.mjs (fails on main) |
| Placement | 5 | built | Snapping to the center line and the line's own row, Alt (Option) to place freely, pink guides while snapped, an optional grid (off by default, snaps when on), arrow keys (Shift ×10, a held key is one undo step), Esc lets go; none of it reaches a file; tests/browser/place.test.mjs |
| Nudge undo | 5 | fixed | Found by CI: an arrow press in the page's first 0.7 s joined no undo step, so Undo had nothing to take back. Each run of presses now starts its own step and joins only presses on the same words with nothing in between; tests/browser/place.test.mjs (fails before the fix) |
| D41 | site | fixed | The site README said CI blocks merging; `main` has no protection or rulesets. Corrected the README (site #49) rather than requiring checks: a required check would block worker-only PRs, which never run that workflow |
| K01 | 6 | fixed | the words-only badge (stress B37) now fits its canvas through D04; the stress suite runs with no allowance |
| A02 | 6 | fixed | The Looks hint says Hover only with a hovering pointer on the laurel; touch screens read "Tap a look to use it; Undo takes it back"; tests/browser/wave6.test.mjs (fails on main) |
| A05 | 6 | fixed | Accolades list and sentence wrap as prose (HTML stays code); Copy names what it copies and is disabled when there is nothing; tests/browser/wave6.test.mjs (fails on main) |
| A06 | 6 | fixed | Dark, Light and Clear stay in the stage bar in Row, as preview settings only; tests/browser/wave6.test.mjs (fails on main) |
| A07 | 6 | fixed | The placing strip names the Type role styling the picked words (Type: Details) and opens Type; tests/browser/wave6.test.mjs (fails on main) |
| A08 | 6 | fixed | About stays at the end of the phone rail after the intro is closed; tests/browser/wave6.test.mjs (fails on main) |
| A09 | 6 | fixed | "Make your laurel · free, no account" right under the Story film's words; tests/browser/wave6.test.mjs (fails on main) |
| A11 | 6 | fixed | The Row's Show column has a heading; each Show box and Remove button names its laurel; tests/browser/wave6.test.mjs (fails on main) |
| A12 | 6 | fixed | The Website preview says it is enlarged to fit, apart from the width it shows on the page; tests/browser/wave6.test.mjs (fails on main) |
| A15 | 6 | fixed | Outline width and color show only when Draw has an outline; their values wait for it; tests/browser/wave6.test.mjs (fails on main) |
| A18 | 6 | fixed | `tools/subset-fonts.py` is the recipe (axis limits, one Latin character set, every layout feature, WOFF2); it rebuilds all four original files with identical glyphs, outlines at every weight, cmaps and layout tables. Hashes, sources and the character set in notes/fonts.md; CI checks the recipe on every push |
| A19 | 6 | fixed | README and the build describe the site analytics as they are: page views plus the site's scroll-depth and contact-link events, no replay, the #l= link never sent |
| A20 | 6 | closed | Already true: the Accolades list leaves hidden Row laurels out and says so; tests/unit/accolades.test.mjs "hidden row laurels are left out" |
| A21 | 6 | fixed | Start over asks "Start this laurel over from the default? Your Row of laurels stays as it is, and Undo brings this one back."; tests/browser/wave6.test.mjs (fails on main) |
| A22 | 6 | closed | Covered by J05 (wave 3): examples are marked, never exported, with Start with this laurel and Clear the examples |
| A23 | 6 | closed | Covered by J01 and J05: a layout never adds example facts, and examples can't reach an export |
| A24 | 6 | closed | Already true: Copy link says when uploaded logos and artwork stay on this device |
| C01 | 6 | fixed | Curved words longer than their curve (wreath or seal) get a warning in the notes instead of losing letters silently; tests/unit/wave6.test.mjs (fails on main) |
| C02 | 6 | fixed | Text in the artwork escapes ">" (so "]]>" is safe) and drops characters XML forbids; tests/unit/wave6.test.mjs (fails on main) |
| C03 | 6 | fixed | Pack folders are unique even when labels slug alike (Best Film, Best-Film); the README maps folders to laurels; tests/browser/wave6.test.mjs (fails on main) |
| C04 | 6 | fixed | Choosing a family resolves a face it has: italic off if it has none, the nearest weight; one undo step; tests/browser/wave6.test.mjs (fails on main) |
| C05 | 6 | fixed | One pointer owns a placement: other pointers and right clicks are ignored; cancel, a lost window or a swapped document put the line back with no undo step; tests/browser/wave6.test.mjs (fails on main). Physical touch stays with B04 |
| C07 | 6 | fixed | While a look is previewed, the stage report, Small sizes and the placing strip hide and the notes dim, so no advice describes the wrong laurel; tests/browser/wave6.test.mjs (fails on main) |
| C08 | 6 | fixed | Clean up loads its tool on demand and says so if it can't; tests/browser/wave6.test.mjs (fails on main) |
| K02 | 6 | closed | Verified: the PDF leaves effects out on purpose, said in Color › Effects and in Export › PDF when effects are on; D25 (tinted logos) was fixed separately |
| A13 | 6 | closed | Kept as is: at 861 px the side panel keeps the options beside the preview; stacking (≤860 px) was reviewed with D45 and offers no clear gain |
| A14 | 6 | closed | Kept as is for launch: the pinned type roles already separate actions, values and hints; no root-size change |
| A01 | 7 | fixed | On a phone, once the laurel is scrolled away a dock shows it as it is now (tap to go back to it) and Export, when Daphne's own bar has scrolled away (on pitch.dog). It steps aside while a text field has the keyboard and while a dialog is open; the panel and toasts make room for it. tests/browser/wave7.test.mjs |
| A03 | 7 | fixed | Export opened from Motion starts on This animation (its last frame, its settings and the same MP4, PNG sequence and animated SVG the Motion bar makes); from On poster, on This poster mockup. The laurel's destinations follow; the choice isn't remembered. tests/browser/wave7.test.mjs |
| A04 | 7 | fixed | A row of three or more on a social card can sit as built, in two lines or in three, for the card only (the row is untouched). A thin band on a tall card is offered Stack it in two lines or Landscape; nothing changes until chosen. tests/browser/wave7.test.mjs |
| A10 | 6 | fixed | Labels sit 6 px from their selects and sliders in the Row and Motion bars; on a phone the Row's notes and controls wrap and only its table scrolls sideways; checked at 1440/390/320; tests/browser/wave6.test.mjs (Row at 390/320) |
| A16 | 7 | fixed | Long exports (Motion's three files, the poster mockup, any Export job that takes a moment) keep a card in the corner, outside the panels: phase, frame count or progress, Stop (nothing downloads), and Try again with the reason when one fails. Screen readers hear phases, not frames. Leaving Motion mid-export no longer puts Motion's controls in another view's bar. tests/browser/wave7.test.mjs |
| A17 | 7 | fixed | Inspected: the italic was a slanted upright. PD Body now has a real italic (31 KB, one weight) for the Story footer and the Row's example rows. All interface weights sit inside the font files' ranges; Story's uppercase labels are kept as its title cards and documented; the footer's source line follows the metadata role. notes/fonts.md; tests/browser/wave7.test.mjs |
| C06 | 7 | fixed | Reproduced: at Laurel size 1.25 a wide row on a square card was 1161 px wide on a 1080 px card, 40 px off each side. The card now keeps it inside its safe width (92%) and says when it's as big as the card allows. tests/browser/wave7.test.mjs (fails on the old code) |
