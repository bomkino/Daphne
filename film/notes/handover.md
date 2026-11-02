# Daphne's story film: handover

*Read me first, every session and after every compaction. Keep it short and current: replace stale lines rather than adding below them. Write "verified" only against a check you ran in this session. The files in this folder win over any chat summary.*

## The project

- pitch.dog's own piece: a ~1:50 film that tells the myth of Daphne, the first laurel, and lands on Daphne, the free laurel maker at pitch.dog/daphne. Asked for October 31, 2026: "Incredibly well told. Polished." With music, working with or without Manali's narration, based on the brand book.
- The sentence: every festival laurel is a girl who ran so she could belong to no one, and now she's free for every filmmaker who earned one.
- Repo: bomkino/Daphne, folder `film/`, branch `claude/project-thread-9k7rum`, draft PR #4 (base main). PR only: no merge, publish or post. Kay posts.
- The page it will live on: https://pitch.dog/daphne/story/, served from `prototype/story/` by `tools/build-pitchdog.mjs`; each file under 25 MiB; the /daphne/* CSP allows media from the site itself only and scripts from files only (no inline). Since PR #10 (another thread, merged November 1) that page is Daphne's story told as you scroll; the film is a section of it. Its `story.js` and `marks.js` belong to that page: leave them; the film's player is `film.js`.
- Learnings read with this: bomkino/remotion-starter-kit (AGENTS.md, guides/check.md, learnings/typecast for timing words before a voice).

## Where things stand

- Picture, score and both voices run end to end at 1920×1080 and 1080×1920, ending on the intro/outro's outro (PR #5's `brand/motion/daphne-outro-*.mp4`; `npm run outro` copies it into `public/outro/`, which git ignores).
- On the story page (`prototype/story/index.html`), the section "Watch her story as a film" sits between the scroll story and the laurels chapter: the lead cut (DaphneUs) as 21 MiB H.264 encodes (`npm run render -- --web`), 16:9 for landscape screens and 9:16 for phones held upright (`film.js` picks, and loads nothing until the section is a screen away), posters from the heart frame (0:54), the film's words in a details below. The score credit is in the footer.
- Review copies: /mnt/project-files/daphne-film/ (half size, with REVIEW.md).
- Now, next and blocked: `tasks.md`.

## Rules that must survive

- Lead cut is `DaphneUs`, pitch.dog telling it ("You've seen her on a thousand film posters."), picked by the user November 1, 2026; Daphne in the first person is the alternate. Words are in `src/story.json`, both voices.
- The name Daphne appears with the tagline "Make festival laurels for your film. It's free." at the end (the outro carries it).
- Gold only for laurels people make; Bloom (pink) only for her heart, once.
- No real festival named or shown; placeholder words "Official Selection · Your Festival · 2026".
- Music only CC0 or our own: the score is ours, on CC0 samples.
- The final laurel must match the outro's first frame (16:9: 800 px tall at y 540; 9:16: 900 at y 880) and its words use the sting's sizes (`scripts/laurels.cjs`, STING_WORDS).

## Verified

- 2026-10-31: score.flac -16.2 LUFS, true peak -1.4 dBTP; score-bed.flac -23.0 LUFS (ffmpeg ebur128). No clicks found by a 9 kHz transient scan.
- 2026-10-31: heartbeat sound lands 35 ms after its picture beat in the rendered preview (20 ms by design plus detection).
- 2026-10-31: the cut into the outro: the laurel's gold bounding box matches the outro's first frame within 2 px at both sizes.
- 2026-11-01: web encodes SSIM 0.926 against the master. The film section on the scroll story page, under a script-src 'self' CSP at 1440×900, 1280×720, 768×1024, 390×844, 360×640 and 844×390: no CSP or script errors, no sideways scroll, the screen fits the viewport, each size fetches only its own cut and plays it.
- 2026-10-31: every line has room: NARRATION.md flags none as tight; on screen each line is fully visible at least 0.5 s before it fades.

## Only a person can check

- By ear: the score. Nobody has listened to it; it was checked with meters and spectrograms only.
- Kay's eye: the god's light, the field of crowns (busy for a moment around 1:16), the text size on a phone.
- A real phone: 9:16 words at the top (y 236) against Instagram's header.

## Read next

`tasks.md`, then `decisions.md`, then `kay-words.md`.
