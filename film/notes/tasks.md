# Daphne's story film: tasks

*The living task sheet. Read `handover.md` first. One step in progress at a time.*

## Now


## Next

- [ ] Someone listens to the score on headphones and a phone speaker
- [ ] If Manali records: takes into `public/vo/<voice>/L01.wav`..., render the narrated cut (NARRATION.md)
- [ ] When PR #5 (the intro/outro) merges, run `npm run outro` in a fresh checkout before rendering
- [ ] Covers and captions for posting (guides/packaging.md in the kit)

## Blocked

- Nothing.

## Done

- [x] DaphneUs with the festival-grade laurel and new outro, live on pitch.dog/daphne/story/ (Daphne #14, site #46, 2026-11-02)
- [x] The user picked pitch.dog's voice, DaphneUs, and said go live (2026-11-01)
- [x] Script in both voices, timed on a 52 bpm heartbeat (2026-10-31)
- [x] Laurels rendered with Daphne's engine (2026-10-31)
- [x] Picture: river, chase, roots, tree, heart, kiss, crown, field, poster, (free), the made laurel (2026-10-31)
- [x] Score on CC0 samples, mixed for phones, cut to silence when she stops (2026-10-31)
- [x] Retimed: rests added so every line can be said and read; film 1:50 (2026-10-31)
- [x] Ending cuts into the intro/outro's outro on its first frame (2026-10-31)
- [x] NARRATION.md for Manali, README with credits (2026-10-31)
- [x] Story page in prototype/story/ with 21 MiB encodes of the lead cut at both sizes (2026-11-01)
- [x] Folded the film into the scroll story page from PR #10: "Watch her story as a film" after the scroll story, `film.js` for the player, the film's words in a details below it, score credit in the footer (2026-11-01)

## Log

- 2026-10-31 23:20 UTC: previews of Daphne and DaphneUs at both sizes rendering; masters and the story page next.
- 2026-11-01 00:05 UTC: previews in /mnt/project-files/daphne-film/ with REVIEW.md; story page pushed with its films; PR #4 ready for review.
- 2026-11-01 12:10 UTC: story.js moved out of index.html for the CSP (82ac436). The story-page thread's PR #10 makes /daphne/story/ a scroll page and conflicts with PR #4's prototype/story/ files; the film folds into it once #10 merges.
- 2026-11-01 12:25 UTC: PR #10 merged; PR #4 rebased onto main (backup branch backup/pre-fold-9k7rum, local only), its own index.html, story.js and og-story.png dropped, the film added to #10's page as a section. Tested under the CSP at six sizes.
- 2026-11-01 13:15 UTC: the user picked DaphneUs and said go live. DaphneUs encodes (21.1 MiB each, -16.2 LUFS) on the story page with our words; posters unchanged (rendered with words off, so they fit either voice). Tested under a 56 px bar stand-in at six sizes: the film fits below the bar and plays, no errors. Merging PR #4; the launch thread ships it.
- 2026-11-02 19:20 UTC: new festival-grade laurel (Daphne #12/#13) and new outro (#5, 349773e). Classic Gold now built from brand/motion/sting/src/data/laurel.json; ending matched (cut within 3 px at both sizes); upright laurel at 80% width. DaphneUs re-rendering. The Daphne (her) previews in project files still show the old laurel.
- 2026-11-02 19:32 UTC: live. Site #46 (Daphne f2c48b2) deployed; the launch thread's live check passed. Next: covers and captions for posting; the Daphne (her) previews would need a re-render if that voice is ever used.
