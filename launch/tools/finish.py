"""Finishes the launch carousels from the 2x renders in launch/out/:

  python3 launch/tools/finish.py

- Instagram: each slide at 1080 x 1350 PNG (Lanczos from 2x), launch/carousels/<nn>-<set>/<set>-<nn>.png
- LinkedIn: one PDF per carousel from the 2x renders (JPEG 92 inside), launch/carousels/<nn>-<set>/daphne-<set>-linkedin.pdf
- A contact sheet per carousel for review, launch/carousels/sheets/<nn>-<set>.png (kept in the repo; the slides
  and PDFs are not, since they rebuild from source)
- Alt text for every slide, launch/carousels/alt-text.md, from the alt lines in src/sets.js
- The edge check: nothing bright in the outer 3 px of any slide. Only the myth's hairlines may cross the seams
  between its first six slides, so those inner edges are measured and reported, not failed.
The folders are numbered in the suggested posting order (captions.md).
Needs Pillow."""
import json, shutil, sys
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
out, dest = here.parent / 'out', here.parent / 'carousels'
meta = json.loads((out / 'meta.json').read_text())
ORDER = ['launch', 'myth', 'email', 'six', 'festivals']  # the suggested posting order
SEAMS = {'myth': 6}  # slides 1..6 of the myth are one panorama
BRIGHT = 92  # luma; the darkest grounds sit near 20, type and leaves well above 150
bad = []
for old in dest.glob('[0-9][0-9]-*'):  # folders from an earlier order
    if old.is_dir() and old.name.split('-', 1)[1] in ORDER and old.name != f'{ORDER.index(old.name.split("-", 1)[1]) + 1:02d}-{old.name.split("-", 1)[1]}': shutil.rmtree(old)
(dest / 'sheets').mkdir(parents=True, exist_ok=True)
alt = ['# Alt text, slide by slide', '', 'Generated from `launch/src/sets.js` by `launch/tools/finish.py`. On Instagram, write it per image before posting; on LinkedIn, paste a carousel\'s lines where a field allows it.', '']

def edge_report(im, sid, i, n):
    g = im.convert('L'); w, h = g.size; r = 3
    edges = {'top': (0, 0, w, r), 'bottom': (0, h - r, w, h), 'left': (0, 0, r, h), 'right': (w - r, 0, w, h)}
    res = {}
    for name, box in edges.items():
        m = g.crop(box).getextrema()[1]
        seam = sid in SEAMS and ((name == 'right' and i < SEAMS[sid]) or (name == 'left' and 1 < i <= SEAMS[sid]))
        res[name] = m
        if m > BRIGHT and not seam: bad.append(f'{sid} slide {i}: something bright touches the {name} edge (luma {m})')
    return res

for k, sid in enumerate(ORDER):
    if sid not in meta: continue
    n = meta[sid]['n']; d = dest / f'{k + 1:02d}-{sid}'; d.mkdir(parents=True, exist_ok=True)
    for old in d.glob('*.png'): old.unlink()
    pages = []
    for i in range(1, n + 1):
        big = Image.open(out / sid / f'{i:02d}@2x.png').convert('RGB')
        small = big.resize((1080, 1350), Image.LANCZOS)
        small.save(d / f'{sid}-{i:02d}.png', optimize=True)
        e = edge_report(small, sid, i, n)
        pages.append(big)
    # contact sheet: four across, a third of full size
    cols, tw, th, gap = 4, 360, 450, 12
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw + (cols + 1) * gap, rows * th + (rows + 1) * gap), (24, 24, 24))
    for j, big in enumerate(pages):
        sheet.paste(big.resize((tw, th), Image.LANCZOS), (gap + (j % cols) * (tw + gap), gap + (j // cols) * (th + gap)))
    sheet.save(dest / 'sheets' / f'{k + 1:02d}-{sid}.png', optimize=True)
    alt += [f'## {k + 1:02d} · {sid}: {meta[sid]["title"]}', ''] + [f'{i}. {a}' for i, a in enumerate(meta[sid]['alt'], 1)] + ['']
    pdf = d / f'daphne-{sid}-linkedin.pdf'
    pages[0].save(pdf, save_all=True, append_images=pages[1:], resolution=144, quality=92, title=meta[sid]['title'], author='pitch.dog')
    print(f'{sid}: {n} slides, {pdf.name} {pdf.stat().st_size / 1e6:.1f} MB')
(dest / 'alt-text.md').write_text('\n'.join(alt))
if bad:
    print('EDGE CHECK FAILED:\n  ' + '\n  '.join(bad)); sys.exit(1)
print('edges: nothing bright touches an outer edge of any slide')
