# The interface fonts (A18)

Daphne's own interface uses five runtime subsets of pitch.dog's type system, in `prototype/assets/fonts/`. They are Latin subsets on purpose: the full families are much larger, and the interface only needs Latin. The fonts a filmmaker picks for a laurel are separate: they load from Google Fonts at run time (`prototype/fonts.js`).

| File | Family in CSS | Weights | Bytes | SHA-256 |
|---|---|---|---:|---|
| `pd-head.woff2` | PD Head | 300–700 | 162,628 | `6366f8d367ac5efdeb34b792d41e857a920389aa631cb8189e61a9058fa8aca4` |
| `pd-body.woff2` | PD Body | 300–800 | 129,888 | `ceed30b74dc4d42d105c08c8c86b1a85ef4d5706f59f2a6fc555ad9439fa9fac` |
| `pd-body-italic.woff2` | PD Body, italic | 400 | 31,336 | `dd33331f16b916c2b6669ced66154144b6f44b7b28990ec7025ea73153abad41` |
| `pd-body-alt.woff2` | PD Body Alt | 300–700 | 93,764 | `65901cdd8501a6a160ee3736c71b00f0d9cff64ab1bca7d5b2805a2a52165ddd` |
| `pd-eyebrow.woff2` | PD Eyebrow | 400–700 | 74,328 | `71a960522c7157b05d0af4e5001d870c2cc54bb190a37f943afc487a689cb3d2` |

Hashes recorded on November 4, 2026. The launch audit found the full families match the type system's canonical v3.0.0.

## The recipe

`tools/subset-fonts.py` is the recipe, and running it checks it: it rebuilds each file from the full family in `brand/fonts/` and compares it with the shipped one (glyph set, character map, every outline and advance at the lightest, regular and heaviest weights, and the layout, metrics and style tables). On November 4, 2026 all four original files matched exactly, so the recipe below is how they were made.

```sh
pip install fonttools brotli          # made with fontTools 4.68
python3 tools/subset-fonts.py         # check: every file matches its recipe
python3 tools/subset-fonts.py --write pd-body   # remake one, after changing its recipe
```

| File | Source in `brand/fonts/` | Source SHA-256 | Source axes | Kept |
|---|---|---|---|---|
| `pd-head.woff2` | `pd-head.woff2` | `7d0a93a8048fa4110e26b27fac1915f8fd88129a8ba19df7bdbc1ac651a46115` | wght 265–900, ital 0–1 | wght 300–700, ital pinned at 0 |
| `pd-body.woff2` | `pd-body-roman.woff2` | `bcc637d10ce2008d2766030ed6a27e3bdaf20ee76f1085fe5883f738c7b51292` | wght 100–900 | wght 300–800 |
| `pd-body-italic.woff2` | `pd-body-italic.woff2` | `6bd35c9ad364e585ca5667c1df74f892eebbe32237005ba926b54ffa61df8a78` | wght 100–900 | wght pinned at 400 |
| `pd-body-alt.woff2` | `pd-body-alt-roman.woff2` | `fcd54ec46040e568fb75180309119f587aebf53cb4368b8a7471aa3a1b819d52` | wght 100–900 | wght 300–700 |
| `pd-eyebrow.woff2` | `pd-eyebrow-site.woff2` | `438c490e109237906a342c533f5a7acf4ed678ce5daf938de21048b23246f29e` | wght 100–900, wdth 87.5–100, ital 0–1 | wght 400–700, wdth pinned at 100, ital at 0 |

Every file keeps the same characters, where the family has them: `U+0020-007E, U+00A0-00AB, U+00AE-00B1, U+00B4, U+00B6-00B8, U+00BA-017E, U+01A0-01A1, U+01AF-01B0, U+01CD-01DC, U+01DE-01DF, U+01E6-01ED, U+01FC-01FF, U+0218-021B, U+0237, U+02C6, U+02DA, U+02DC, U+0300-0308, U+1E9E, U+2009-200A, U+2010-2015, U+2018-2022, U+2026, U+202F-2030, U+2032-2033, U+2039-203A, U+2044, U+20AC, U+2116, U+2122, U+2190-2199, U+2212, U+2215`. It keeps every OpenType layout feature and the whole name table, and saves WOFF2.

The italic (A17) came later: the Story footer sets *Metamorphoses* in italic and the Row's example rows are italic, and with only upright faces the browser slanted the upright letters. `brand/fonts/pd-body-italic.woff2` is the type system's v13.1.1 italic (CC0, like the rest); its romans are the same outlines as v3.0.0's, checked glyph by glyph. One static weight is enough for the odd italic word, at 31 KB.

## Type roles (A17)

The interface's weights all sit inside the ranges above (300 to 800; nothing asks for a weight a file doesn't have). The Story page's section labels (the eyebrows, "Free, no account", the transcript's summary, the film's hint) are uppercase on purpose: they're the film's title cards, a cinematic exception to the type system's metadata role, which has no case change. The footer's source line follows that role as written: mixed case, PD Eyebrow 500, 0.052em tracking.

If a subset must change: change its line in `FONTS` or `UNICODES`, remake it with `--write`, update the table above, and compare the interface at 1440, 390 and 320 px before and after.
