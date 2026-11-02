# Daphne's sting

Daphne's five-second intro and outro, made in [Remotion](https://www.remotion.dev) from pitch.dog's Remotion starter kit. The finished films are in `../` as `daphne-intro-*.mp4` and `daphne-outro-*.mp4`, at 1080×1920, 1080×1080 and 1920×1080.

**What it says:** strip away the gold and the ceremony, and a laurel is two leaves around a name.

## What you see

| Time | Picture | Sound |
|---|---|---|
| 0.0 s | A gold Classic Gold laurel made with Daphne, "Official Selection · Your Festival · 2026", in the dark. A light crosses the metal. | A drone of D and A rises out of silence; glass catches the light. |
| 0.46 s | Her heart beats once under the laurel: the only pink in the film. | Lub-dub, low and soft, at 52 beats a minute. |
| 0.5–1.35 s | Life runs up the branches from the stems: leaf by leaf, the gold turns to living green, and the festival's words go like breath on glass. | A cascade of glass climbs D minor, one note a leaf or so, from branch to branch. |
| 1.61 s | On the second beat the leaves let go, the tips first, and fall through the dark, turning as they go. Two stay. | Wind through the grove, the rustle of the leaves, and a felt piano sighing down. |
| 1.7–2.5 s | The two leaves leave the branch, unbend into the logo's brackets and grow their stalks. | |
| 2.06–3.0 s | Daphne rises between them, a letter every two frames. | The strings open into Bbmaj7; on the third beat a high E hangs in the air. |
| 2.86 s | "Make festival laurels for your film. It's free." | D major. The F sharp is the turn, from loss to free. |
| 3.3 s | **Outro:** `pitch.dog/daphne` and "Made by pitch.dog". The last of the falling leaves sink into the dark. | A single glass note; the chord rings out. |
| 3.9–5.0 s | **Outro:** the frame holds still for the last second, so the name can be read. The logo breathes once, on the last beat. | |
| 4.4–5.0 s | **Intro:** the frame goes to the dark, so the film it opens can cut in. | The music fades with it. |

It follows the brand's motion rules (`../../README.md`, Motion): things grow from where they're attached, leaves before words, letters two frames apart rising 70 units, the growth and word curves, the heartbeat at 52 a minute, one Bloom, one falling leaf as the exit, and at least a second's hold on the outro's last frame. Its one exit is the falling laurel: the leaves fall into the dark, and nothing enters from off screen.

## How it's made

Everything is drawn from Daphne's own code, so the film can't drift from the product or the brand:

- **The laurel** is drawn by Daphne's engine (`prototype/engine.mjs`) with the Classic Gold preset in its festival-grade default (wide, flat gold), leaf by leaf. Its words are placeholders nobody could take for a real selection.
- **The logo** is the hero lockup from `brand/tools/mark.mjs`. `src/leaf.ts` is a line-for-line port of its leaf bracket, so the two leaves that stay can be redrawn every frame as they unbend from a laurel leaf into a bracket. `npm run check` proves the port draws exactly the logo's leaves.
- **The picture** is painted on two canvases a frame at a time (`src/paint.ts`), as a pure function of time, so frames can render in any order.
- **The sound** is synthesized in `scripts/score.py` from `src/timeline.json`, the same file the picture reads. There are no samples to license. The mix is -14 LUFS with true peaks under -1.5 dBTP, and starts 20 ms behind the picture.

Gates that refuse to render, so nothing is ever cut off:

- At every frame, each point of the two logo leaves stays inside the frame, on its way and at rest (`src/paint.ts`).
- A falling leaf fades into the dark before any of it, or its blur, reaches the top or a side of the frame, and in the last second's hold nothing is still falling (`src/paint.ts`).
- The finished logo sits inside each size's safe area, and the gold laurel stays at least 40 px clear of the top and bottom and 90 px clear of the sides with the camera pushed in (`src/layout.ts`).
- Each line of words fits inside the safe area (`src/Sting.tsx`).

## Build it

Node 20 or newer, Python 3 with numpy and scipy, and ffmpeg.

```sh
npm install
npm run data       # the laurel and logo from Daphne's code, and the brand fonts into public/
npm run check      # src/leaf.ts draws exactly the logo's leaves
npm run score      # public/audio/daphne-intro.wav and daphne-outro.wav
npm run dev        # Remotion Studio
npm run render     # out/Daphne<Ending>-<size>.mp4, and a -post.mp4 copy inside Meta's upload spec
npm run sheet -- DaphneOutro-1080x1920 0 0.5 1.2 1.9 2.4 3 4.95   # a contact sheet
python3 scripts/edges.py out/*.mp4   # every frame: nothing bright touches an edge
python3 scripts/sync.py out/*.mp4    # the sound lands 20 ms behind the picture
```

In a cloud container, `remotion.config.ts` points Remotion at the installed headless Chrome; set `BROWSER` to use another.

## Licenses

- The code, the timeline, the score and the films are CC0, like the rest of `brand/`.
- The PD fonts are copied from `brand/fonts` at build time (CC0).
- Figtree, the Classic Gold preset's face, is in `public/fonts/` under the SIL Open Font License (`public/fonts/OFL-Figtree.txt`).
- Remotion has its own license: free for individuals and companies of up to three people, with a company license above that ([remotion.dev/license](https://www.remotion.dev/license)).
