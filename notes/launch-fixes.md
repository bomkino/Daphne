# Daphne launch fixes: goal and plan

Started November 3, 2026. This file is the working plan and the record. Update the status column as fixes land; a new session starts here.

## The goal

**Before pitch.dog shares Daphne, it has no known bugs.** Every issue in the November 3 outside audit (67 groups) is fixed, or shown not to be a bug with a test that proves it. The ribbon year sits in the middle of its ribbon, and text can be centered, snapped, guided and gridded. The source is public.

How we'll know:

1. Every fix has a regression test in `tests/` that fails on the code before the fix and passes after it.
2. The 1,702-case stress suite passes with zero failures (today: one known badge case, K01).
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

**Not in this repository.** The website README's merge-protection claim and the site's CI filter (D41, the site half of D40) belong to the site's owner. We hand them over with the exact changes; we don't touch the site nav.

## Shipping

All work goes on the branch `claude/project-thread-tx7lhm` with one draft PR. Merging and publishing to pitch.dog/daphne happen once, when every wave is done (pitch.dog's choice, November 4, 2026), through the existing build (`node tools/build-pitchdog.mjs`) and a website PR.

## Status

| ID | Wave | Status | Test / note |
| --- | --- | --- | --- |
| D17 | 0 | fixed | Repo public (November 4, 2026), MIT detected by GitHub; tests and CI in the open |
| D40 | 0 | todo | |
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
| D02 | 3 | todo | |
| D03 | 3 | todo | |
| D04 | 3 | todo | |
| D06 | 3 | todo | |
| D07 | 3 | todo | |
| D14 | 3 | todo | |
| D15 | 3 | todo | |
| D23 | 3 | todo | |
| D24 | 3 | todo | |
| D25 | 3 | todo | |
| D27 | 3 | todo | |
| D28 | 3 | todo | |
| D29 | 3 | todo | |
| D30 | 3 | todo | |
| D36 | 3 | todo | |
| D37 | 3 | todo | |
| D39 | 3 | todo | |
| J05 | 3 | todo | |
| V04 | 3 | todo | |
| D09 | 4 | todo | |
| D10 | 4 | todo | |
| D11 | 4 | todo | |
| D16 | 4 | todo | |
| D42 | 4 | todo | |
| D45 | 4 | todo | |
| V01 | 4 | todo | |
| V02 | 4 | todo | |
| V05 | 4 | todo | |
| V06 | 4 | todo | |
| V07 | 4 | todo | |
| V08 | 4 | todo | |
| V09 | 4 | todo | |
| L01 | 5 | todo | |
| L02 | 5 | todo | |
| L03 | 5 | todo | |
| D41 | site | todo | |
