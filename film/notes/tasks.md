# Daphne's story film: tasks

*The living task sheet. Read `handover.md` first. One step in progress at a time.*

## Now

- [ ] Review previews in /mnt/project-files/daphne-film/ and the story page

## Next

- [ ] Someone listens to the score on headphones and a phone speaker
- [ ] Kay picks the lead voice from the two previews (hers or ours)
- [ ] If Manali records: takes into `public/vo/<voice>/L01.wav`..., render the narrated cut (NARRATION.md)
- [ ] When PR #5 (the intro/outro) merges, run `npm run outro` in a fresh checkout before rendering
- [ ] When PR #10 (the scroll story page) merges: rebase PR #4 onto main and fold the film into that page as a "Watch it as a film" section after the scroll story, before the laurels chapter. Videos and posters beside it in `prototype/story/`; player code in its own file (not story.js, which stays as #10 wrote it; no inline scripts). Drop PR #4's own index.html and story.js.
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

## Log

- 2026-10-31 23:20 UTC: previews of Daphne and DaphneUs at both sizes rendering; masters and the story page next.
- 2026-11-01 00:05 UTC: previews in /mnt/project-files/daphne-film/ with REVIEW.md; story page pushed with its films; PR #4 ready for review.
- 2026-11-01 12:10 UTC: story.js moved out of index.html for the CSP (82ac436). The story-page thread's PR #10 makes /daphne/story/ a scroll page and conflicts with PR #4's prototype/story/ files; the film folds into it once #10 merges.
