# The interface fonts (A18)

Daphne's own interface uses four runtime subsets of pitch.dog's type system, in `prototype/assets/fonts/`. They are Latin subsets on purpose: the full families are much larger, and the interface only needs Latin. The fonts a filmmaker picks for a laurel are separate: they load from Google Fonts at run time (`prototype/fonts.js`).

| File | Family in CSS | Weights | Bytes | SHA-256 |
|---|---|---|---:|---|
| `pd-head.woff2` | PD Head | 300–700 | 162,628 | `6366f8d367ac5efdeb34b792d41e857a920389aa631cb8189e61a9058fa8aca4` |
| `pd-body.woff2` | PD Body | 300–800 | 129,888 | `ceed30b74dc4d42d105c08c8c86b1a85ef4d5706f59f2a6fc555ad9439fa9fac` |
| `pd-body-alt.woff2` | PD Body Alt | 300–700 | 93,764 | `65901cdd8501a6a160ee3736c71b00f0d9cff64ab1bca7d5b2805a2a52165ddd` |
| `pd-eyebrow.woff2` | PD Eyebrow | 400–700 | 74,328 | `71a960522c7157b05d0af4e5001d870c2cc54bb190a37f943afc487a689cb3d2` |

Hashes recorded on November 4, 2026. The launch audit found the full families match the type system's canonical v3.0.0.

**Still to record:** the source font files' hashes, their axes, and the exact subset command (unicode ranges and layout features). Until then, don't regenerate these files: if a subset must change, record that recipe here first, then compare the interface at 1440, 390 and 320 px before and after.
