# Daphne's story film: tasks

*The living task sheet. Read `handover.md` first. One step in progress at a time.*

## Now

- [ ] Review previews in /mnt/project-files/daphne-film/ and the film's section of the story page

## Next

- [ ] Someone listens to the score on headphones and a phone speaker
- [ ] Kay picks the lead voice from the two previews (hers or ours)
- [ ] If Manali records: takes into `public/vo/<voice>/L01.wav`..., render the narrated cut (NARRATION.md)
- [ ] When PR #5 (the intro/outro) merges, run `npm run outro` in a fresh checkout before rendering
- [ ] Ship the page with the next pitch.dog build once the film is approved (the launch thread does the publishing)
- [ ] Covers and captions for posting (guides/packaging.md in the kit)

## Blocked

- Nothing.

## Done

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
