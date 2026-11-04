#!/usr/bin/env python3
"""The recipe for Daphne's interface fonts (A18).

prototype/assets/fonts/ holds Latin subsets of pitch.dog's type system, cut from the full families in
brand/fonts/. This script is how they are made, so they can be made again:

  1. limit each family's variable axes to the weights the interface uses (fontTools varLib.instancer),
     pinning the axes it doesn't use (italic, width) at their upright, normal values;
  2. keep the characters in UNICODES that the family has, with every OpenType layout feature and the full
     name table (fontTools subset);
  3. save as WOFF2.

  python3 tools/subset-fonts.py                  # rebuild each font and check it against the shipped file
  python3 tools/subset-fonts.py --write NAME ... # write those fonts into prototype/assets/fonts/

The check compares what matters, not bytes: the glyph set, the character map, every outline and advance at
the lightest, regular and heaviest weights, and the layout, metrics and style tables. The bytes themselves
differ a little between fontTools versions (WOFF2 compression), so a byte-for-byte check would fail for no
visible reason. Needs: pip install fonttools brotli (made with fontTools 4.68).
"""
import hashlib, io, os, sys, tempfile
from fontTools import subset
from fontTools.misc import xmlWriter
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'prototype', 'assets', 'fonts')

# Basic Latin, Latin-1, Latin Extended-A and the Latin Extended-B letters Western European and Vietnamese-style
# names use, the combining accents, and the punctuation, arrows and symbols the interface draws.
UNICODES = (
    'U+0020-007E,U+00A0-00AB,U+00AE-00B1,U+00B4,U+00B6-00B8,U+00BA-017E,U+01A0-01A1,U+01AF-01B0,U+01CD-01DC,'
    'U+01DE-01DF,U+01E6-01ED,U+01FC-01FF,U+0218-021B,U+0237,U+02C6,U+02DA,U+02DC,U+0300-0308,U+1E9E,U+2009-200A,'
    'U+2010-2015,U+2018-2022,U+2026,U+202F-2030,U+2032-2033,U+2039-203A,U+2044,U+20AC,U+2116,U+2122,U+2190-2199,'
    'U+2212,U+2215'
)

# file in prototype/assets/fonts/ → source in brand/fonts/, and the axis limits: (min, default, max) keeps a range,
# a single number pins the axis there.
FONTS = {
    'pd-head': ('pd-head.woff2', {'wght': (300, 400, 700), 'ital': 0}),
    'pd-body': ('pd-body-roman.woff2', {'wght': (300, 400, 800)}),
    'pd-body-italic': ('pd-body-italic.woff2', {'wght': 400}),  # A17: one static weight, for the odd italic word
    'pd-body-alt': ('pd-body-alt-roman.woff2', {'wght': (300, 400, 700)}),
    'pd-eyebrow': ('pd-eyebrow-site.woff2', {'wght': (400, 400, 700), 'wdth': 100, 'ital': 0}),
}


def codepoints(spec):
    out = set()
    for part in spec.split(','):
        a, _, b = part.strip()[2:].partition('-')
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


def build(name):
    src, limits = FONTS[name]
    font = TTFont(os.path.join(ROOT, 'brand', 'fonts', src))
    font = instancer.instantiateVariableFont(font, {k: instancer.AxisTriple(*v) if isinstance(v, tuple) else v for k, v in limits.items()})
    buf = io.BytesIO(); font.flavor = None; font.save(buf); buf.seek(0); font = TTFont(buf)  # a fresh read before subsetting
    o = subset.Options()
    o.layout_features = ['*']; o.name_IDs = ['*']; o.name_languages = ['*']; o.notdef_outline = True; o.glyph_names = True
    s = subset.Subsetter(o); s.populate(unicodes=codepoints(UNICODES)); s.subset(font)
    font.flavor = 'woff2'
    out = io.BytesIO(); font.save(out)
    return out.getvalue()


def same(a_bytes, b_path):
    A, B = TTFont(io.BytesIO(a_bytes)), TTFont(b_path)
    problems = []
    if A.getGlyphOrder() != B.getGlyphOrder(): problems.append('glyph set')
    if A.getBestCmap() != B.getBestCmap(): problems.append('character map')
    for tag in ('GSUB', 'GPOS', 'GDEF', 'OS/2', 'hhea', 'STAT', 'post'):
        if (tag in A) != (tag in B): problems.append(tag); continue
        if tag not in A: continue
        xa, xb = io.StringIO(), io.StringIO()
        A[tag].toXML(xmlWriter.XMLWriter(xa), A); B[tag].toXML(xmlWriter.XMLWriter(xb), B)
        if xa.getvalue() != xb.getvalue(): problems.append(tag)
    weights = [None]
    if 'fvar' in A:
        ax = next(x for x in A['fvar'].axes if x.axisTag == 'wght')
        weights = sorted({ax.minValue, ax.defaultValue, ax.maxValue})
    for w in weights:
        a = instancer.instantiateVariableFont(TTFont(io.BytesIO(a_bytes)), {'wght': w}) if w else A
        b = instancer.instantiateVariableFont(TTFont(b_path), {'wght': w}) if w else B
        ga, gb = a.getGlyphSet(), b.getGlyphSet()
        for g in a.getGlyphOrder():
            p, q = RecordingPen(), RecordingPen(); ga[g].draw(p); gb[g].draw(q)
            if p.value != q.value or ga[g].width != gb[g].width: problems.append(f'outlines at weight {w}'); break
    return problems


def main(argv):
    write = argv[1:] if argv and argv[0] == '--write' else None
    if write is not None and not write: sys.exit('Name the fonts to write: ' + ', '.join(FONTS))
    bad = 0
    for name in (write or FONTS):
        data, path = build(name), os.path.join(OUT, name + '.woff2')
        if write is not None:
            with open(path, 'wb') as f: f.write(data)
            print(f'{name}.woff2  written  {len(data):,} bytes  sha256 {hashlib.sha256(data).hexdigest()}')
            continue
        if not os.path.exists(path): print(f'{name}.woff2  missing'); bad += 1; continue
        problems = same(data, path)
        shipped = open(path, 'rb').read()
        print(f'{name}.woff2  {"matches" if not problems else "DIFFERS in " + ", ".join(problems)}  shipped {len(shipped):,} bytes, sha256 {hashlib.sha256(shipped).hexdigest()[:16]}…')
        bad += bool(problems)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
