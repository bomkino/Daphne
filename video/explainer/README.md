# Daphne: the explainer

A 54-second video for social that shows what Daphne does, built in [Remotion](https://www.remotion.dev). It renders at 1080 × 1920 (stories and Reels), 1080 × 1080 (feed) and 1920 × 1080 (YouTube, LinkedIn, the site), from one composition that lays itself out for each.

**What it says:** you paste the festival's email, and Daphne makes the laurel, free.

## What happens

| Time | Scene | On screen |
|---|---|---|
| 0:00 | The email | A festival's acceptance email writes itself in. "Official Selection", "Your Festival" and "2026" light up, lift off the page, and become the words of a laurel that grows around them. |
| 0:09 | Looks | The laurel changes look on the beat, then twice as fast, then pulls back to all 78. |
| 0:18 | Festivals | 268 festivals from 60 countries, and a search that fills in the festival. |
| 0:23 | Export | One laurel goes onto a poster, a trailer end card, a story, a website and an email signature. |
| 0:32 | Fixer | A festival's own laurel arrives on a white box and comes out clean. |
| 0:37 | The pack | For festivals: every status and award, in every colorway. |
| 0:41 | Free | Free, no account, no watermark, open source, each set between the logo's two leaves. |
| 0:46 | Logo | The leaves become (Daphne), with the tagline, pitch.dog/daphne and "Made by pitch.dog". One leaf falls, and the last frame holds. |

Every laurel on screen is made by Daphne's own engine (`scripts/laurels.mjs`), and the logo and leaves are drawn by the brand's own code (`scripts/brand.mjs`), so nothing is redrawn by hand. Samples say "Your Festival", "Your Film" and "Your Name": no real festival's name or artwork appears.

## Words on screen

All in US spelling, checked against the app on its overhaul branch (October 31, 2026):

- The email: "Your Festival", "to me", "Your film has been selected", "Dear filmmaker,", "We're delighted to tell you that your film has been selected as an Official Selection of Your Festival 2026.", "Congratulations, and see you there."
- "Paste the festival's email." / "Daphne makes the laurel."
- The look's name under each look, then "78 looks." / "Your words stay put."
- "268" / "festivals from 60 countries." / "Your Festival": "Its official name", "City and country", "Official site", "Laurel rules, where published"
- "Export for wherever it's going.": "Poster · vector PDF, 300 dpi PNG", "Trailer · transparent 4K end card", "Socials · square, portrait and story", "Website · SVG with alt text", "Email signature"; mockups say "Your Film", "Coming soon", "Premieres at Your Festival", "yourfilm.com", "See you at the screening,", "Your Name", "Director, Your Film"
- "PNG", "SVG", "PDF", "MP4" / "Every size it needs, in one go."
- "The festival sent its own laurel?" / "Daphne cleans it up." / "Background out", "One ink", "Trimmed"
- "Running a festival?" / "Make the whole pack." / "Every status and award, in every colorway, with guidelines."
- "free", "no account", "no watermark", "open source" / "Nothing you make leaves your device unless you share it."
- "(Daphne)" / "Make festival laurels for your film." / "It's free." / "pitch.dog/daphne" / "Made by pitch.dog"

The counts come from the app's code: 78 presets in `presets.js`, 268 festivals from 60 countries in `festivals.js`. Laurel rules exist for the festivals that publish them (`rules.js`), so the line says "where published".

## Sound

The score is original and written as code (`scripts/make_score.py`): 104 BPM in D major, twice Daphne's 52 bpm heartbeat, so each cut lands on a beat and the logo breathes on the heartbeat in the hold. No samples or third-party recordings are used, so it carries the same license as the rest of the repository. It is mixed to -14 LUFS with true peaks under -1 dBTP, and sits 20 ms behind the picture so hits never arrive early. There is no voiceover; the words on screen carry it.

## Make it

Needs Node 20 or later, Python 3 with `scripts/requirements.txt`, and ffmpeg.

```sh
npm install
npm run score                     # public/audio/score.wav, from src/timeline.json
npm run preview                   # half size, quick: out/previews/Explainer-<size>.mp4
npm run render                    # masters: out/Explainer-<size>.mp4 (H.264, AAC 320k)
npm run dev                       # Remotion Studio, to scrub it
```

`src/timeline.json` holds every cue as a beat. The picture and the score both read it, so moving a cue moves the hit with it; run `npm run score` after changing it.

The laurels and the brand data are already in the repository. To draw them again, after the app or the identity changes:

```sh
node scripts/laurels.mjs ../../prototype    # public/laurels/ and src/data/laurels.json (needs the network for fonts)
node scripts/brand.mjs ../../brand/tools    # src/data/brand.json, from the identity's mark code
```

Remotion renders with a Chromium it downloads. Where that download is blocked, set `BROWSER` to a local Chrome or headless shell (`remotion.config.ts` also finds Playwright's).

## Credits

The type is pitch.dog's PD Head, PD Body Alt, PD Body and PD Eyebrow, whose font files are CC0 (`public/fonts/FONT-LICENSE.md`). The pitch.dog name appears only as text.

Remotion has its own license: free for teams of up to three people, with a company license for larger teams ([remotion.dev/license](https://www.remotion.dev/license)). The MIT license here covers this folder's code, the score and the drawings, not Remotion itself.
