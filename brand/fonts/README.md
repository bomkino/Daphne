# Fonts

PD Head, PD Body, PD Body Alt and PD Eyebrow, from the [pitch.dog type system](https://github.com/bomkino/pitchdog-type-system).

- The four roman `.woff2` files are unmodified copies of `assets/fonts/` at release v3.0.0 (commit `54207202fbb557758ad7851941d8944e722c4af6`). `pd-body-italic.woff2` is the same system's PD Body italic at release v13.1.1, whose romans have the same outlines as v3.0.0's.
- `../../tools/subset-fonts.py` cuts the app's interface fonts from these files (`../../notes/fonts.md`).
- They're dedicated to the public domain under CC0 1.0. `FONT-LICENSE.md` is that release's own notice, kept with the files as it asks; the paths it names are in the type system's repository.
- `../tools/book/` holds subsets cut from these files, so the brand book can carry its fonts inside one file.
- The type system's code, tokens and docs aren't CC0, so they stay in their own repository.
