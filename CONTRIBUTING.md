# Helping with Daphne

Daphne is open source: the code is MIT, and the looks, the festival data and the brand are public domain (see `LICENSE-CC0.md`). By sending a change, you agree it can be shared under the same terms. Fixes to a festival's name or city are as welcome as new features.

## Run it

```
python3 serve.py 5178
```

Then open http://127.0.0.1:5178/. There's no build step and nothing to install: the app is plain JavaScript modules in `prototype/`, and `serve.py` turns off caching so every edit shows on reload.

## Fix or add a festival

Festivals live in `prototype/festivals.js`, one line each:

```js
F('id', 'Official Name', 'City', 'CC', month, tier, 'focus', 'www.site.org', { short, aka, local, founded, note, sections }),
```

- **name** is the name exactly as the festival writes it on its own laurels and site, in its current form. Renames and moves go in `note`.
- **country** is the two-letter ISO code; **month** is when it usually runs (1 to 12).
- **tier** is only a rough guide for ordering a row of laurels (1 carries furthest on a poster, 3 is respected and regional). It's never a judgment of the festival.
- **site** is the festival's official site, without `https://`.
- Send a source for anything you change: a link to the festival's own page is best.

Text only, always. Don't add festival logos, laurel artwork or anything drawn to look like them: they're the festivals' trademarks, and Daphne links to the official site instead.

## Add a festival's laurel rules

When a festival publishes rules about laurels (official artwork required, the full name only, sizes), add it to `FESTIVALS` in `prototype/rules.js` with a `source` that links to where it says so. The rules show up as gentle notes, never blocks.

## Add a look

Looks are presets in `prototype/presets.js`. A preset sets only the style (wreath, paint, type, background), never the words. Draw them with the engine's own options rather than tracing anyone's artwork. Fonts must be open-licensed and on Google Fonts; the list is in `prototype/fonts.js`.

## Check your change

The stress suite renders 1,702 laurels and checks each one for overlaps, clipping and words too small to read. With `serve.py` running, open http://127.0.0.1:5178/stress.html?px=160 and wait for the result, or follow the command in `README.md`. A change to the engine, the layouts or the presets should leave it where it was.

For anything in the interface, try it at desktop width and at phone width (390 px), with the keyboard as well as the mouse.

## Writing

- Plain words, in US spelling, and dates like October 31, 2026.
- Say what the thing does for a filmmaker, not how it works inside.
- Laurels are claims. Never write anything that suggests a festival endorses Daphne or a film.
