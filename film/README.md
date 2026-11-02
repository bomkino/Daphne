# Daphne's story

A film of about a minute and fifty seconds that tells the myth of Daphne, the first laurel, and lands on [pitch.dog/daphne](https://pitch.dog/daphne/). Made in [Remotion](https://www.remotion.dev), started from pitch.dog's Remotion kit, and drawn from Daphne's own brand and engine.

**What it says:** every festival laurel is a girl who ran so she could belong to no one, and now she's free for every filmmaker who earned one.

## What you see

| Time | Picture | Sound |
|---|---|---|
| 0:00 | A gold laurel in the dark, the one Daphne makes. "You've seen her on a thousand film posters. You just never knew her name." | A low D, a piano, her theme falling. |
| 0:10 | The camera dives into one leaf; it melts into a single line of light. Her name. | A harp climbs; a timpani roll. |
| 0:14 | The line opens into nine strands: her hair, a river. "She was a river's daughter." | Harp running like water, strings, a solo violin. |
| 0:27 | A god's light comes up from the side. The river runs. "She ran." | Cellos in sixteenths, tremolo strings, her heart at double time. |
| 0:42 | She stops, and so does everything, the room included. | Half a second of silence. |
| 0:42 | Roots go down. A trunk, then her arms climb and open into branches; her hair becomes leaves, one a frame. | A held low D, a high violin, the harp and a glockenspiel. |
| 0:52 | His hand on the bark: her heart beats under it, the film's only pink. | The heartbeat, a held fifth and one violin. |
| 0:58 | He kisses the wood. Even as wood, she pulls away: the tree leans from him. | A semitone shiver in the strings. |
| 1:03 | He wears her leaves as a crown. It echoes out through time into a field of crowns, which turn gold. "Poets. Athletes. Artists." | The theme in full in the cellos, the horn; a chord for each of the chosen. |
| 1:18 | The laurel on a poster. "But she only ever asked to belong to no one." | The piano theme again; the music holds its breath. |
| 1:28 | (free), between the two leaves of the logo. | D minor turns to D major, for the first time. |
| 1:30 | The brackets part and a laurel grows from them, one leaf a frame: Daphne's facts. "No account. No watermark. Nothing leaves your device. For every filmmaker who's earned one." | G, D, E minor, A; then a chord for each fact. |
| 1:45 | The laurel settles into the intro/outro's first frame and the outro plays: the leaves turn green and fall, two stay as the brackets of (Daphne), the tagline, pitch.dog/daphne. | The outro's own sound. |

## Cuts

One picture, set four ways, each at 1920×1080 and 1080×1920 (compositions are named `<Cut>-<size>`):

| Cut | Voice | Words | Sound |
|---|---|---|---|
| `DaphneUs` | **The lead** (picked November 1, 2026): pitch.dog tells it | On screen, arriving at reading pace | The score |
| `Daphne` | Daphne tells it herself | On screen | The score |
| `DaphneNarrated` | Manali as Daphne | Captions | Manali's takes over a quieter bed of the score |
| `DaphneUsNarrated` | Manali as pitch.dog | Captions | The same |

Every cut ends on the intro/outro's outro, cut in on its first frame: `npm run outro` copies `brand/motion/daphne-outro-<size>.mp4` into `public/outro/` (the intro/outro is in PR #5 until it merges). Without that file, the film plays its own ending: the laurel comes alive, its leaves fall, two of them become (Daphne)'s brackets.

The narration is optional and planned: [`NARRATION.md`](NARRATION.md) is Manali's script, timed, with file names.

## Build it

Node 20+, Python 3 with numpy, scipy and soundfile, and ffmpeg.

```sh
npm install
npm run samples     # once: the CC0 orchestra into vendor/ (git, about 150 MB; not committed)
npm run outro       # the intro/outro's outro, which the film ends on
npm run score       # public/audio/score.flac and score-bed.flac
npm run dev         # Remotion Studio
npm run preview     # half-size review copies: out/previews/
npm run render      # the lead cut at both sizes: out/DaphneUs-<size>.mp4 (--all for every cut)
npm run render -- --web   # the story page's encodes, under 25 MiB a file: out/web/
npm run narration   # reprints NARRATION.md from src/story.json
npm run sheet -- Daphne-1080x1920 2 14 44 53 66 90 104   # a contact sheet
```

`npm run brand` redraws `src/brand/paths.json` from `brand/tools/mark.mjs`, and `npm run laurels` (Playwright) redraws the laurels with Daphne's engine. In a cloud container, set `BROWSER_EXECUTABLE` to the installed headless Chrome.

## How it's made

- **One clock.** `src/story.json` puts every act and line on a beat of 52 a minute, her heartbeat. The picture reads it, and so does the score, which refuses to render if the two disagree. Retime a line there and both follow.
- **The picture** is painted on a canvas a frame at a time as a pure function of time (`src/film/grove.ts`): the strands, river, roots, tree, heart, crown and field. The leaf is the brand's story leaf and the logo is the hero lockup, both drawn by `brand/tools/mark.mjs`; the gold laurel is Daphne's festival-grade Classic Gold (the engine's default since November 2, 2026), taken leaf for leaf from the intro/outro's own laurel data (`brand/motion/sting/src/data/laurel.json`, `npm run laurels -- --no-render`), so the cut into the outro doesn't move a leaf; its words are placeholders nobody could take for a real selection.
- **The score** is written in code (`scripts/score/score.py`): D minor and a lament bass for the myth, and D major for the first time on the word "free". It's played on VS Chamber Orchestra: Community Edition samples through a small sampler, a synthetic room and a slow leveler, and mastered to -16 LUFS (the bed under a narrator to -23, ducked 5 dB while she speaks). The heartbeat, wind, water and the god's tone are synthesized. Nobody has listened to it yet: it was checked with meters, spectrograms and onset measurements only.
- **The brand's motion rules** (`brand/README.md`, Motion): things grow from where they're attached, one leaf a frame at 24 fps, leaves before words, one Bloom, and the outro's one exit, the falling leaves.

## Words to check before it's posted

- The myth follows Ovid, *Metamorphoses* I. Apollo feels her heart still trembling under the new bark, and the wood shrinks from his kisses (lines 553–556 in most editions). "Daphne" is never claimed as a historical fact.
- "I keep nothing of yours" (hers) and "Nothing leaves your device" (ours) are true only while the app works as its README says: no account, nothing sent anywhere unless you share it. Recheck before posting if the app changes.
- No real festival is named or shown.

## Credits and licenses

- **Instruments:** VS Chamber Orchestra 2: Community Edition, CC0, by Versilian Studios / Sam Gossner, with the upright piano by Ivy Audio / Simon Dalzell ([github.com/sgossner/VSCO-2-CE](https://github.com/sgossner/VSCO-2-CE)). The score and its renders are pitch.dog's, CC0 like the brand.
- **Type:** PD Head, PD Body Alt and PD Eyebrow from the pitch.dog type system (CC0, `public/fonts/FONT-LICENSE.md`). Figtree and Cinzel, the laurel presets' faces, under the SIL Open Font License (`public/fonts/laurels/`).
- **The outro** is the intro/outro sting from `brand/motion/` (CC0).
- **Code:** MIT, like the rest of the repository. Remotion has its own license: free for individuals and companies of up to three people ([remotion.dev/license](https://www.remotion.dev/license)).
