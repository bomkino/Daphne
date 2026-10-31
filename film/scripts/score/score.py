"""Daphne's score, written in code and played on a CC0 chamber orchestra.

Everything sits on the film's clock (src/story.json): 52 beats a minute, her
heartbeat. The harmony follows the story. D minor and a lament bass (D, C, Bb, A)
for the myth; the river is a harp; the chase is cellos running in sixteenths
and stops dead when she does; her heart is a heartbeat and nothing else; the
crown gets the theme in full. D minor turns to D major for the first time on the
word "free". It ends on G minor, so the outro's D drone can take the last five
seconds.

    npm run samples     once: fetches the instruments into vendor/vsco
    npm run score       writes public/audio/score.flac (the lead mix) and
                        public/audio/score-bed.flac (the bed under a narrator)

Instruments: VS Chamber Orchestra: Community Edition, CC0 (Versilian Studios /
Sam Gossner; upright piano by Ivy Audio / Simon Dalzell). The heartbeat, wind,
water and the god's tone are synthesized here.
"""
import glob, json, os, re, subprocess, sys, tempfile
from functools import lru_cache

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
VSCO = os.path.join(ROOT, "vendor", "vsco")
STORY = json.load(open(os.path.join(ROOT, "src", "story.json")))
SR = 48000
SPB = 60 / STORY["bpm"]
END = STORY["end"]
N = int((END + 1.0) * SR)
rng = np.random.default_rng(52)


def secs(n):
    """A beat of the film (as src/story.json counts them) in seconds."""
    return STORY["firstBeat"] + n * SPB


# The cue below was written before the film took its breaths: a few rests were
# added later so every line has time to be said and read. W moves a beat of the
# cue, as written, to the film's beat; a note held across a rest is held through
# it. To retime the film, add the rest here and to story.json together: the
# check below refuses to score a film whose acts no longer match.
RESTS = [(37.5, 0.5), (48.75, 0.5), (50, 1.5), (56, 0.5), (67.5, 1), (76.5, 1), (79.5, 1), (83.5, 1)]
WRITTEN = {"prologue": 0, "dive": 8, "river": 12, "god": 23, "chase": 24, "ran": 28, "still": 36, "roots": 36.5, "branches": 38, "leaves": 40,
           "hand": 44, "kiss": 49, "crown": 52, "since": 56.5, "chosen": 60, "today": 64, "ask": 68, "free": 72, "make": 74, "facts": 77, "earned": 80, "outro": 84}


def W(n):
    return n + sum(extra for at, extra in RESTS if at <= n)


def B(n):
    """A beat of the cue, as written, in seconds of the film."""
    return secs(W(n))


off = {k: (v, W(WRITTEN[k])) for k, v in STORY["acts"].items() if abs(W(WRITTEN[k]) - v) > 1e-6}
if off:
    sys.exit(f"story.json's acts and the score's rests disagree (act: film beat, scored beat): {off}")
ACT = {k: secs(v) for k, v in STORY["acts"].items()}
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name):
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", name)
    n = NOTE[m[1]] + (1 if m[2] == "#" else -1 if m[2] == "b" else 0)
    return 12 * (int(m[3]) + 1) + n


# ── the orchestra ──────────────────────────────────────────────────────────
# Each instrument: its sample files, the pitch each file sounds (VSCO names most
# strings, brass and winds an octave below what they sound; measured), and a
# dynamic layer per file.
def scan(pattern, rx, octave_shift=0, dyn_of=lambda m: 1):
    out = []
    for p in sorted(glob.glob(os.path.join(VSCO, pattern))):
        m = re.search(rx, os.path.basename(p))
        if not m:
            continue
        out.append((midi(m["n"]) + 12 * octave_shift, dyn_of(m), p))
    return out


def piano():
    out = []
    for p in sorted(glob.glob(os.path.join(VSCO, "Keys/Upright Piano/Player_dyn*_rr1_*.wav"))):
        m = re.search(r"dyn(\d)_rr1_(\d+)", p)
        out.append((21 + 2 * int(m[2]), int(m[1]), p))
    return out


NOTE_RX = r"(?P<n>[A-G]#?-?\d)"
INST = {
    "piano": piano(),
    "cello": scan("Strings/Cello Section/susvib/*.wav", r"susvib_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "cello_spic": scan("Strings/Cello Section/spic/*.wav", r"spic_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "cello_trem": scan("Strings/Cello Section/trem/*.wav", r"trem_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "viola": scan("Strings/Viola Section/susvib/*.wav", r"susvib_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "viola_trem": scan("Strings/Viola Section/trem/*.wav", r"trem_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "violins": scan("Strings/Violin Section/susVib/*.wav", r"susVib_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "violins_trem": scan("Strings/Violin Section/Trem/*.wav", r"Trem_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "violin": scan("Strings/Solo Violin/Arco Vib/*.wav", r"ArcoVib_" + NOTE_RX + r"_(?P<v>[pf])", 1, lambda m: 1 if m["v"] == "p" else 3),
    "bass": scan("Strings/Solo Contrabass/SusNV/*.wav", r"SusNV_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "harp": scan("Strings/Harp/*.wav", r"KSHarp_" + NOTE_RX + r"_", 0),
    "horn": scan("Brass/F Horn/sus/*.wav", r"sus_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "flute": scan("Woodwinds/Flute/susNV/*.wav", r"susNV_" + NOTE_RX + r"_v(?P<v>\d)", 1, lambda m: int(m["v"])),
    "glock": scan("Percussion/Glock/*.wav", r"glock_medium_" + NOTE_RX, 1),
}
TIMP = sorted(glob.glob(os.path.join(VSCO, "Percussion/Timpani/Timpani*_Hit_v*_rr1_Sum.wav")))
TIMP_ROLL = sorted(glob.glob(os.path.join(VSCO, "Percussion/Timpani/Rolls/*.wav")))


@lru_cache(maxsize=None)
def load(path):
    x, sr = sf.read(path, always_2d=True, dtype="float32")
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    # trim the silence before the attack, so notes start on their time
    env = np.abs(x).max(axis=1)
    thr = env.max() * 0.02
    start = max(0, int(np.argmax(env > thr)) - int(0.004 * sr))
    return x[start:], sr


@lru_cache(maxsize=None)
def sustain_end(path):
    """Where the recorded note stops being held (the player lifts the bow)."""
    x, sr = load(path)
    e = np.abs(x).max(axis=1)
    k = int(0.05 * sr)
    e = np.convolve(e, np.ones(k) / k, mode="same")
    return int(np.nonzero(e > e.max() * 0.45)[0][-1])


@lru_cache(maxsize=None)
def held(path, need):
    """The note held as long as it's needed: its steady middle repeated, crossfaded."""
    x, sr = load(path)
    se = sustain_end(path)
    a, b = int(se * 0.35), int(se * 0.92)
    seg = x[a:b]
    xf = min(int(0.35 * sr), len(seg) // 3)
    fo = np.sqrt(np.linspace(1, 0, xf))[:, None]
    fi = np.sqrt(np.linspace(0, 1, xf))[:, None]
    parts = [x[:b].copy()]
    total = b
    while total < need + 2:
        tail = parts[-1]
        tail[-xf:] = tail[-xf:] * fo + seg[:xf] * fi
        parts.append(seg[xf:].copy())
        total += len(seg) - xf
    return np.concatenate(parts)


def pick(inst, m, vel):
    want = 1 if vel < 0.45 else 3 if vel > 0.8 else 2
    cands = INST[inst]
    dyns = sorted({d for _, d, _ in cands})
    dyn = min(dyns, key=lambda d: abs(d - want))
    pool = [c for c in cands if c[1] == dyn]
    return min(pool, key=lambda c: (abs(c[0] - m), c[0] < m))


# ── buses ──────────────────────────────────────────────────────────────────
BUSES = {k: np.zeros((N, 2), np.float32) for k in ("keys", "strings", "harp", "perc", "fx", "solo", "brass")}
SEND = {"keys": 0.42, "strings": 0.5, "harp": 0.55, "perc": 0.38, "fx": 0.35, "solo": 0.55, "brass": 0.6}


STILL = ACT["still"]
CUT_FADE = 0.1


def add(bus, sig, t, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), N - i)
    # "silence as the drop": anything sounding when she stops is cut there
    c = int(round(STILL * SR))
    if i < c < i + n:
        k = c - i
        f = int(CUT_FADE * SR)
        sig = sig[: k + f].copy()
        sig[k:] *= np.linspace(1, 0, len(sig) - k)[:, None] if sig.ndim == 2 else np.linspace(1, 0, len(sig) - k)
        n = len(sig)
    l = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
    r = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    if sig.ndim == 1:
        BUSES[bus][i : i + n, 0] += sig[:n] * gain * l
        BUSES[bus][i : i + n, 1] += sig[:n] * gain * r
    else:
        BUSES[bus][i : i + n, 0] += sig[:n, 0] * gain * l
        BUSES[bus][i : i + n, 1] += sig[:n, 1] * gain * r


def note(inst, name, beat, beats, vel=0.5, pan=0.0, attack=0.02, release=0.6, bus="strings", gain=1.0, at=None):
    """Plays one note. beat and beats are in beats; `at` (seconds) overrides beat."""
    m = midi(name) if isinstance(name, str) else name
    root, _, path = pick(inst, m, vel)
    x, sr = load(path)
    ratio = 2 ** ((m - root) / 12) * sr / SR
    t0 = B(beat) if at is None else at
    dur = beats * SPB if at is not None else (W(beat + beats) - W(beat)) * SPB
    n_out = int((dur + release) * SR)
    src = np.arange(n_out) * ratio
    if src[-1] + 2 >= sustain_end(path):  # held past the recording's sustain: loop it smoothly
        x = held(path, int(src[-1] + 2 + sr))
    i0 = src.astype(np.int64)
    fr = (src - i0)[:, None]
    y = x[i0] * (1 - fr) + x[i0 + 1] * fr
    env = np.ones(n_out, np.float32)
    a = max(1, int(attack * SR))
    env[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    d = int(dur * SR)
    if d < n_out:
        env[d:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n_out - d))
    y = y * env[:, None] * (0.25 + 0.75 * vel) * gain
    add(bus, y, t0, pan)


def chord(inst, names, beat, beats, vel=0.4, spread=0.6, roll=0.0, **kw):
    for i, nm in enumerate(names):
        pan = (i / max(1, len(names) - 1) - 0.5) * spread
        note(inst, nm, beat + i * roll, beats - i * roll, vel, pan, **kw)


# ── synthesized sounds ─────────────────────────────────────────────────────
def lowpass(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def thump(f0=62, f1=40, decay=0.11, click=0.15):
    """One beat of a heart: a low body you feel, and enough of a knock in it
    (saturation harmonics, a muffled thud) to be heard on a phone's speaker."""
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / decay) * (1 - np.exp(-t / 0.004))
    knock = np.tanh(body * 3.2) / np.tanh(3.2)  # odd harmonics: 120-400 Hz
    knock = bandpass(knock, 110, 700)
    thud = bandpass(rng.standard_normal(n) * np.exp(-t / 0.035), 120, 480) * 0.35
    c = lowpass(rng.standard_normal(n) * np.exp(-t / 0.006), 900) * click
    y = lowpass(body * 0.75 + knock * 0.55 + thud + c, 1600)
    y[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR)) ** 2  # no click where it ends
    return y.astype(np.float32)


def heartbeat(t, strength=1.0, pan=0.0):
    """Lub, and the dub 0.24 s after, as the brand moves (and the sting) beat."""
    add("perc", thump(64, 41, 0.12), t, pan, 0.55 * strength)
    add("perc", thump(70, 46, 0.09, 0.1), t + STORY["dub"], pan, 0.38 * strength)


def noise_bed(t0, t1, lo, hi, gain, shape):
    n = int((t1 - t0) * SR)
    if n <= 0:
        return
    x = bandpass(rng.standard_normal((n, 2)).astype(np.float32), lo, hi)
    tt = np.linspace(0, 1, n)
    x *= shape(tt, t0 + tt * (t1 - t0))[:, None]
    add("fx", x.astype(np.float32), t0, 0, gain)


def god_tone(t0, t1, gain, env_fn):
    """The god's light as a sound: a pale, high interval that beats slowly against itself."""
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    tt = t0 + t
    y = np.zeros((n, 2), np.float32)
    for f, a, p in ((880.0, 1.0, -0.3), (882.6, 0.9, 0.3), (1318.5, 0.45, 0.1), (1760.0, 0.18, -0.1)):
        s = np.sin(2 * np.pi * f * t + p) * a
        y[:, 0] += s * (0.6 - p)
        y[:, 1] += s * (0.6 + p)
    y *= env_fn(tt)[:, None]
    add("fx", y, t0, 0, gain)


# ── the cue ────────────────────────────────────────────────────────────────
def score():
    P, S, H = "keys", "strings", "harp"

    # PROLOGUE: a gold laurel in the dark. A piano and a low D, nothing else.
    note("bass", "D2", 0, 11.5, 0.3, -0.1, attack=2.5, release=2.0, gain=0.55)
    note("cello", "A2", 0.5, 11, 0.25, 0.15, attack=3.0, release=2.0, gain=0.4)
    chord("piano", ["D3", "A3"], 0, 4, 0.32, bus=P, release=3.5)
    # her theme, a falling line, between the words
    for nm, b, d in (("A4", 2, 2), ("D5", 4, 1.5), ("C5", 5.5, 0.5), ("A4", 6, 2)):
        note("piano", nm, b, d, 0.36, 0.1, bus=P, release=3)
    chord("piano", ["Bb2", "F3", "D4"], 4, 4, 0.26, bus=P, roll=0.12, release=3)
    # THE DIVE: the laurel melts into a single line of light. A rises, the harp climbs.
    chord("violins", ["E4", "A4"], 8, 4, 0.3, attack=3.5, release=0.8, gain=0.7)
    note("viola", "C#4", 8.5, 3.5, 0.25, -0.2, attack=3.0, release=0.8, gain=0.6)
    note("cello", "A2", 8, 4, 0.35, 0.1, attack=2.0, release=0.8, gain=0.6)
    note("piano", "A1", 8, 4, 0.35, -0.2, bus=P, release=2)
    gl = ["D4", "E4", "F4", "G4", "A4", "Bb4", "C#5", "D5", "E5", "F5", "G5", "A5", "C#6", "D6"]
    for i, nm in enumerate(gl):
        note("harp", nm, 10.4 + i * 0.105, 2.0, 0.35 + i * 0.02, -0.4 + i * 0.06, bus=H, release=2.5)
    TR = TIMP_ROLL[0] if TIMP_ROLL else None
    if TR:
        x, sr = load(TR)
        n = int(1.9 * SPB * SR)
        r = x[:n] * np.linspace(0, 1, n)[:, None] ** 2
        add("perc", r, B(10.1), 0, 0.35)

    # RIVER: her name, and the river she was born of. A harp runs like water.
    prog = [(12, ["D3", "A3", "D4", "F4", "A4", "F4", "D4", "A3"], ["D2"], ["D3", "A3"], ["F4"], ["A4", "D5"]),
            (16, ["Bb2", "F3", "Bb3", "D4", "F4", "D4", "Bb3", "F3"], ["Bb1"], ["Bb2", "F3"], ["D4"], ["F4", "Bb4"]),
            (18, ["F2", "C3", "F3", "A3", "C4", "A3", "F3", "C3"], ["F2"], ["F2", "C3"], ["A3"], ["F4", "A4"]),
            (20, ["C3", "G3", "C4", "E4", "G4", "E4", "C4", "G3"], ["C2"], ["C3", "G3"], ["E4"], ["E4", "G4"]),
            (22, ["A2", "E3", "A3", "C#4", "E4", "C#4", "A3", "E3"], ["A1"], ["A2", "E3"], ["C#4"], ["E4", "A4"])]
    for k, (b, arp, bass, cel, vla, vln) in enumerate(prog):
        length = 4 if b in (12, 16) and False else (4 if b == 12 else 2)
        if b == 16:
            length = 2
        for i in range(int(length * 4)):
            nm = arp[i % len(arp)]
            note("harp", nm, b + i * 0.25, 1.2, 0.3 + 0.08 * (i % 4 == 0), -0.25 + 0.5 * ((i % 8) / 7), bus=H, release=1.6)
        note("bass", bass[0], b, length, 0.35, -0.1, attack=0.8, release=1.5, gain=0.6)
        for j, nm in enumerate(cel):
            note("cello", nm, b, length, 0.32, -0.2 + 0.3 * j, attack=0.9, release=1.2, gain=0.55)
        note("viola", vla[0], b, length, 0.28, 0.25, attack=1.0, release=1.2, gain=0.45)
        for j, nm in enumerate(vln):
            note("violins", nm, b, length, 0.26, 0.3 - 0.4 * j, attack=1.2, release=1.2, gain=0.45)
    # the theme on piano as she's named, then the solo violin (her voice) between the lines
    for nm, b, d in (("D5", 12.25, 1), ("C5", 13.25, 0.5), ("A4", 13.75, 2.25)):
        note("piano", nm, b, d, 0.4, 0.1, bus=P, release=3)
    for nm, b, d in (("Bb4", 20.5, 1.5), ("A4", 22, 1), ("G4", 23, 1), ("A4", 24, 2.5)):
        note("violin", nm, b, d, 0.42, 0.15, attack=0.25, release=1.2, bus="solo", gain=0.55)
    noise_bed(ACT["river"] - 1, ACT["still"], 180, 2400, 0.022, lambda u, tt: np.clip((tt - ACT["river"] + 1) / 2, 0, 1) * (1 - np.clip((tt - ACT["still"] + 1.5) / 1.5, 0, 1)) * (0.7 + 0.3 * np.sin(tt * 1.3)))

    # CHASE: a god saw her. The light hums; the cellos run; it stops dead when she does.
    god_env = lambda tt: np.clip((tt - ACT["god"] + 0.8) / 3.0, 0, 1) * np.clip((ACT["still"] - tt) / 0.08, 0, 1) * (0.5 + 0.5 * np.clip((tt - ACT["chase"]) / 12, 0, 1))
    god_tone(ACT["god"] - 1, ACT["still"] + 0.05, 0.009, god_env)
    chase = [(24, "D", ["D2", "A2"], ["D4", "A4"]), (28, "Bb", ["Bb1", "F2"], ["F4", "D5"]), (30, "G", ["G1", "D2"], ["G4", "D5"]),
             (32, "Eb", ["Eb2", "Bb2"], ["G4", "Eb5"]), (34, "A", ["A1", "E2"], ["A4", "E5", "C#5"])]
    ost = {"D": ["D3", "D3", "A2", "D3"], "Bb": ["Bb2", "Bb2", "F2", "Bb2"], "G": ["G2", "G2", "D3", "G2"], "Eb": ["Eb3", "Eb3", "Bb2", "Eb3"], "A": ["A2", "A2", "E3", "A2"]}
    for k, (b, key, low, high) in enumerate(chase):
        nb = chase[k + 1][0] if k + 1 < len(chase) else 36
        cres = 0.35 + 0.5 * (b - 24) / 12
        for j, nm in enumerate(low):
            note("bass" if j == 0 else "cello", nm, b, nb - b, cres, -0.15, attack=0.15, release=0.05, gain=0.75)
        for j, nm in enumerate(high):
            note("violins_trem", nm, b, nb - b, cres, 0.35 - 0.3 * j, attack=0.25 if b > 24 else 2.5, release=0.05, gain=0.5)
        note("viola_trem", high[0][:-1] + str(int(high[0][-1]) - 1), b, nb - b, cres * 0.9, 0.2, attack=0.3, release=0.05, gain=0.45)
        if b >= 26 or b == 24:
            start = max(b, 26)
            for i in range(int((nb - start) * 4)):
                bb = start + i * 0.25
                note("cello_spic", ost[key][i % 4], bb, 0.25, min(1, cres + 0.15 * (i % 4 == 0)), -0.3, attack=0.004, release=0.12, gain=0.7)
    # the running pulse of her heart under it all, twice as fast
    for i in range(int((36 - 24.5) * 2)):
        bb = 24.5 + i * 0.5
        heartbeat(B(bb), 0.25 + 0.5 * (bb - 24) / 12)
    # "I ran."
    if TIMP:
        x, sr = load(TIMP[-1])
        add("perc", x, ACT["ran"], 0, 0.9)
        add("perc", x, B(32), 0, 0.6)
        add("perc", x, B(34), 0, 0.7)
    noise_bed(ACT["god"], ACT["still"], 300, 1600, 0.06, lambda u, tt: np.clip((tt - ACT["chase"]) / 8, 0, 1) ** 1.5 * np.clip((ACT["still"] - tt) / 0.05, 0, 1) * (0.6 + 0.4 * np.sin(tt * 2.1) ** 2) + 0.8 * np.exp(-(((tt - ACT["ran"] - 0.3) / 0.6) ** 2)))
    if TR:
        x, sr = load(TIMP_ROLL[-1])
        n = int(2 * SPB * SR)
        add("perc", x[:n] * np.linspace(0.2, 1, n)[:, None] ** 2, B(34), 0, 0.6)

    # STILL: silence. Then roots, branches, leaves.
    note("bass", "D2", 36.5, 8, 0.3, 0, attack=1.2, release=1.0, gain=0.6)
    note("piano", "D2", 36.5, 4, 0.3, -0.1, bus=P, release=4)
    note("violin", "A5", 37, 7, 0.25, 0.2, attack=2.0, release=2.0, bus="solo", gain=0.35)
    chord("cello", ["D3", "A3"], 38, 6, 0.28, attack=1.6, release=1.5, gain=0.5)
    note("viola", "F4", 38.5, 5.5, 0.25, 0.2, attack=1.6, release=1.5, gain=0.4)
    # her leaves: a climb on the harp, a little light on the glockenspiel
    leaves = ["D4", "F4", "A4", "C5", "D5", "F5", "A5", "C6", "D6", "F5", "A5", "C6", "D6", "F6", "A6", "D7"]
    for i, nm in enumerate(leaves):
        note("harp", nm, 40 + i * 0.135, 1.5, 0.28 + 0.02 * i, -0.5 + i / 15, bus=H, release=2)
    for i, nm in enumerate(["A6", "D7", "F7", "A7"]):
        note("glock", nm, 40.6 + i * 0.4, 1, 0.15, 0.3 - i * 0.15, bus=H, release=2, gain=0.25)
    chord("violins", ["Bb3", "D4", "F4", "A4"], 40, 2, 0.24, attack=1.0, release=1.2, gain=0.45)
    chord("violins", ["A3", "C4", "F4", "A4"], 42, 2, 0.24, attack=0.8, release=1.6, gain=0.45)

    # HER HEART: under the bark, still beating. Nothing else but a held fifth and one violin.
    chord("cello", ["D3", "A3"], 44, 5, 0.22, attack=1.0, release=2.0, gain=0.42)
    note("violin", "F5", 45, 4, 0.28, 0.1, attack=1.4, release=1.0, bus="solo", gain=0.42)
    note("violin", "E5", 49, 2.5, 0.3, 0.1, attack=0.3, release=1.5, bus="solo", gain=0.42)
    for b in STORY["heart"]:
        heartbeat(secs(b), 0.8)
    god_tone(ACT["hand"] - 0.5, ACT["crown"] + 3, 0.006, lambda tt: np.clip((tt - ACT["hand"]) / 1.5, 0, 1) * np.clip((ACT["since"] - tt) / 2, 0, 1))
    # THE KISS: the wood pulls away. A shiver of a semitone.
    note("viola_trem", "Eb4", 50.75, 1.25, 0.5, -0.2, attack=0.05, release=1.0, gain=0.4)
    note("viola_trem", "D4", 50.75, 1.25, 0.5, 0.2, attack=0.05, release=1.0, gain=0.4)
    note("violins_trem", "A4", 50.8, 1.2, 0.45, 0.3, attack=0.05, release=1.0, gain=0.3)

    # THE CROWN: he wears her leaves. The theme in full, low in the cellos, the horn behind.
    crown = [(52, ["D2", "A2"], ["D3", "A3", "F4"], ["A4", "D5"]), (54, ["C2", "G2"], ["C3", "G3", "E4"], ["G4", "C5"]),
             (56, ["Bb1", "F2"], ["Bb2", "F3", "D4"], ["F4", "Bb4"]), (58, ["A1", "E2"], ["A2", "E3", "C#4"], ["E4", "A4"])]
    for k, (b, low, mid, high) in enumerate(crown):
        v = 0.35 + 0.08 * k
        note("bass", low[0], b, 2, v, -0.1, attack=0.5, release=1.0, gain=0.6)
        for j, nm in enumerate(mid):
            note("viola" if j == 2 else "cello", nm, b, 2, v, -0.25 + 0.25 * j, attack=0.5, release=1.0, gain=0.5)
        for j, nm in enumerate(high):
            note("violins", nm, b, 2, v, 0.3 - 0.3 * j, attack=0.6, release=1.0, gain=0.5)
        note("horn", low[0][:-1] + str(int(low[0][-1]) + 2), b + 0.5, 1.5, 0.3 + 0.06 * k, 0.3, attack=0.6, release=1.2, bus="brass", gain=0.35)
    theme = [("F4", 52, 2), ("E4", 54, 1), ("D4", 55, 1), ("C4", 56, 1.5), ("D4", 57.5, 0.5), ("A3", 58, 2)]
    for nm, b, d in theme:
        note("cello", nm, b, d, 0.55, -0.1, attack=0.25, release=0.8, gain=0.8)
        note("piano", nm[:-1] + str(int(nm[-1]) + 1), b, d, 0.42, 0.15, bus=P, release=2.5)
    # EVERY LAUREL SINCE: echoes. Then a chord for each of the chosen.
    for nm, b, d in (("Bb4", 56.5, 1.5), ("A4", 58, 1), ("G4", 59, 1)):
        note("violin", nm, b, d, 0.45, 0.2, attack=0.2, release=1.0, bus="solo", gain=0.45)
    chosen = [(60, ["Bb1", "Bb2", "F3", "D4", "F4", "Bb4", "D5"]), (61, ["F2", "A2", "F3", "C4", "F4", "A4", "C5"]),
              (62, ["G2", "G3", "D4", "G4", "Bb4", "D5"]), (63, ["A1", "A2", "E3", "C#4", "E4", "A4", "C#5"])]
    for k, (b, names) in enumerate(chosen):
        v = 0.6 - 0.05 * k
        note("bass", names[0], b, 1, v, -0.1, attack=0.05, release=1.6, gain=0.7)
        chord("cello", names[1:3], b, 1, v, attack=0.05, release=1.6, gain=0.55)
        chord("violins", names[3:], b, 1, v * 0.9, attack=0.08, release=1.8, gain=0.5)
        chord("piano", names[1:], b, 1, v * 0.8, bus=P, release=3, roll=0.03)
        note("horn", names[3], b, 1, v * 0.7, 0.25, attack=0.08, release=1.5, bus="brass", gain=0.4)
        if TIMP:
            x, sr = load(TIMP[0])
            add("perc", x, B(b), 0, 0.35)

    # TODAY: the laurel on a poster. The piano's theme again, as at the start.
    note("bass", "D2", 64, 4, 0.3, -0.1, attack=1.0, release=1.5, gain=0.5)
    chord("cello", ["D3", "A3"], 64, 4, 0.25, attack=1.2, release=1.5, gain=0.4)
    chord("piano", ["D3", "A3"], 64, 4, 0.3, bus=P, release=3.5)
    for nm, b, d in (("A4", 64.5, 1.5), ("D5", 66, 1.5), ("C5", 67.5, 0.5)):
        note("piano", nm, b, d, 0.36, 0.1, bus=P, release=3)
    # ASK: she only ever asked to belong to no one. The music holds its breath.
    chord("violins", ["Bb3", "D4", "E4"], 68, 2, 0.22, attack=1.5, release=1.0, gain=0.4)
    note("cello", "G2", 68, 2, 0.25, -0.2, attack=1.2, release=1.0, gain=0.45)
    chord("violins", ["A3", "D4", "E4"], 70, 2, 0.22, attack=0.8, release=0.6, gain=0.4)
    note("cello", "A2", 70, 2, 0.25, -0.2, attack=0.8, release=0.6, gain=0.45)
    note("piano", "A4", 68.5, 1.5, 0.3, 0.1, bus=P, release=3)
    note("piano", "E5", 70.5, 1.5, 0.28, 0.1, bus=P, release=3)

    # FREE: D minor turns to D major, for the first time.
    note("bass", "D2", 72, 2, 0.45, -0.1, attack=0.6, release=1.0, gain=0.65)
    chord("cello", ["D3", "A3"], 72, 2, 0.45, attack=0.7, release=1.0, gain=0.55)
    note("viola", "F#4", 72, 2, 0.42, 0.2, attack=0.8, release=1.0, gain=0.5)
    chord("violins", ["A4", "D5", "F#5"], 72, 2, 0.4, attack=0.9, release=1.0, gain=0.5)
    chord("piano", ["D3", "A3", "D4", "F#4", "A4"], 72, 2, 0.4, bus=P, release=3, roll=0.06)
    chord("harp", ["D3", "A3", "D4", "F#4", "A4", "D5", "F#5", "A5"], 72, 2, 0.35, bus=H, roll=0.05, release=2.5)
    # MAKE: the laurel grows from the two leaves, one leaf a frame. Gold, so a little shimmer.
    make = [(74, ["G1", "G2"], ["D3", "B3"], ["G4", "B4", "D5"]), (75, ["F#2", "D3"], ["A3", "D4"], ["F#4", "A4", "D5"]),
            (76, ["E2", "B2"], ["G3", "D4"], ["E4", "G4", "B4"]), (76.5, ["A1", "A2"], ["E3", "C#4"], ["E4", "A4", "C#5"])]
    for k, (b, low, mid, high) in enumerate(make):
        nb = make[k + 1][0] if k + 1 < len(make) else 77
        note("bass", low[0], b, nb - b, 0.4, -0.1, attack=0.3, release=0.8, gain=0.55)
        chord("cello", mid, b, nb - b, 0.38, attack=0.35, release=0.8, gain=0.5)
        chord("violins", high, b, nb - b, 0.36, attack=0.4, release=0.8, gain=0.45)
    for i in range(18):
        nm = ["D5", "F#5", "A5", "D6", "F#6", "A6"][i % 6]
        note("harp", nm, 74.15 + i * (1.4 / SPB / 18), 1.2, 0.25 + 0.02 * (i % 6), -0.5 + (i % 9) / 8, bus=H, release=1.8)
    for i, nm in enumerate(["D7", "F#7", "A7", "D7"]):
        note("glock", nm, 74.6 + i * 0.35, 1, 0.12, 0.2, bus=H, release=2, gain=0.22)
    # FACTS: no account, no watermark, she keeps nothing. A chord for each.
    facts = [(77, ["D2", "D3", "A3", "D4", "F#4", "A4"]), (78, ["B1", "B2", "F#3", "D4", "F#4", "B4"]), (79, ["G1", "G2", "D3", "B3", "D4", "G4"])]
    for b, names in facts:
        note("bass", names[0], b, 1, 0.38, -0.1, attack=0.2, release=1.2, gain=0.55)
        chord("cello", names[1:3], b, 1, 0.36, attack=0.25, release=1.2, gain=0.45)
        chord("violins", names[3:], b, 1, 0.34, attack=0.3, release=1.2, gain=0.42)
        chord("piano", names[2:], b, 1, 0.32, bus=P, release=2.5, roll=0.04)
    for nm, b, d in (("F#5", 77.25, 0.75), ("D5", 78.25, 0.75), ("B4", 79.25, 0.75)):
        note("piano", nm, b, d, 0.34, 0.15, bus=P, release=2.5)
    # EARNED: your film was chosen. G, then G minor, the turn that hurts, into the outro's D.
    note("bass", "G1", 80, 2, 0.38, -0.1, attack=0.4, release=0.8, gain=0.55)
    chord("cello", ["G2", "D3"], 80, 2, 0.36, attack=0.4, release=0.8, gain=0.45)
    chord("violins", ["B3", "D4", "G4", "B4"], 80, 2, 0.34, attack=0.5, release=0.8, gain=0.42)
    note("bass", "G1", 82, 2.4, 0.3, -0.1, attack=0.3, release=1.2, gain=0.5)
    chord("cello", ["G2", "D3"], 82, 2.4, 0.3, attack=0.3, release=1.2, gain=0.4)
    chord("violins", ["Bb3", "D4", "G4", "Bb4"], 82, 2.4, 0.28, attack=0.4, release=1.2, gain=0.4)
    chord("piano", ["G3", "Bb3", "D4"], 82, 2, 0.3, bus=P, release=3, roll=0.08)
    note("piano", "A4", 83, 1.2, 0.3, 0.1, bus=P, release=3)

    # THE ENDING we play ourselves (the sting's score takes over when it's on):
    # her heart once in the gold, the D minor drone, Bbmaj7 as her name rises, D major add9 on the tagline.
    lub = B(84)
    heartbeat(lub, 0.8)
    for i in range(1, 4):
        heartbeat(B(84 + i), 0.35 / i)
    note("bass", "D2", 84, 4.6, 0.35, -0.1, attack=0.3, release=2.0, gain=0.55)
    note("cello", "A2", 84, 4.6, 0.3, 0.1, attack=0.4, release=2.0, gain=0.45)
    t_name = lub + 1.45
    t_tag = lub + 2.25
    for j, nm in enumerate(["Bb3", "D4", "F4", "A4"]):
        note("violins", nm, 0, (t_tag - t_name + 0.1) / SPB, 0.3, 0.3 - 0.2 * j, attack=0.5, release=0.6, gain=0.42, at=t_name - 0.1)
    for j, nm in enumerate(["D2", "A2", "D3", "F#3", "A3", "E4", "F#4", "A4", "D5"]):
        inst = "bass" if j == 0 else "cello" if j < 3 else "viola" if j < 5 else "violins"
        note(inst, nm, 0, (END - t_tag) / SPB, 0.32, -0.4 + j * 0.1, attack=0.9, release=2.5, gain=0.45, at=t_tag)
    for nm, dt in (("D4", 0), ("A4", 0.08), ("E5", 0.16), ("F#5", 0.24)):
        note("piano", nm, 0, 2.5, 0.32, 0.1, bus=P, release=4, at=t_tag + dt)


# ── the room ───────────────────────────────────────────────────────────────
def impulse(seconds=3.6, predelay=0.022):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n + int(predelay * SR), 2), np.float32)
    for c in range(2):
        x = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        x = lowpass(x * (1 - np.exp(-t / 0.012)), 6500)
        # the room darkens as it decays
        dark = lowpass(x, 2200)
        mixk = np.clip(t / seconds * 2, 0, 1)
        ir[int(predelay * SR):, c] = (x * (1 - mixk) + dark * mixk).astype(np.float32)
    # a few early reflections
    for d, g in ((0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.22)):
        ir[int(d * SR), 0] += g
        ir[int((d + 0.003) * SR), 1] += g
    return ir / np.sqrt((ir ** 2).sum() / 2)


def render():
    for k in BUSES:
        BUSES[k][:] = 0
    score()
    gains = {"keys": 0.9, "strings": 1.0, "harp": 0.75, "perc": 0.8, "fx": 1.0, "solo": 0.85, "brass": 0.8}
    dry = sum(BUSES[k] * gains[k] for k in BUSES)
    send = sum(BUSES[k] * gains[k] * SEND[k] for k in BUSES)
    ir = impulse()

    def room(x):
        return np.stack([fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], axis=1).astype(np.float32)

    # when she stops, even the room stops: the chase's reverb is cut with it,
    # and the room starts again from nothing with the roots
    c = int(round((STILL + CUT_FADE) * SR))
    before, after = send.copy(), send.copy()
    before[c:] = 0
    after[:c] = 0
    t = np.arange(N) / SR
    cut = np.clip(1 - (t - STILL) / CUT_FADE, 0, 1)[:, None]
    wet = room(before) * cut + room(after)
    mix = dry * 0.82 + wet * 0.42
    return level(mix).astype(np.float32)


def level(mix, ratio=0.5, window=2.5, most=9.0):
    """A slow hand on the fader: halves the distance between the quiet and the
    loud sections (so the prologue is heard on a phone and the chase doesn't
    shout), keeping their shape. It never reaches across her stop."""
    mono = sosfilt(butter(2, 150, "high", fs=SR, output="sos"), mix.mean(axis=1))
    p = mono.astype(np.float64) ** 2
    k = int(window * SR)
    c = int(round(STILL * SR))
    db = np.full(N, -120.0)
    for a, b in ((0, c), (c, N)):
        seg = p[a:b]
        cs = np.concatenate([[0], np.cumsum(seg)])
        i = np.arange(len(seg))
        lo, hi = np.clip(i - k // 2, 0, len(seg)), np.clip(i + k // 2, 0, len(seg))
        db[a:b] = 10 * np.log10((cs[hi] - cs[lo]) / np.maximum(hi - lo, 1) + 1e-12)
    heard = db > -70
    target = np.median(db[heard])
    g = np.where(heard, np.clip((target - db) * (1 - ratio), -most, most), 0.0)
    g = np.convolve(g, np.ones(SR) / SR, mode="same")  # a second to move the fader
    return mix * (10 ** (g / 20))[:, None]


def master(mix, out, target, peak=-1.5, duck=None):
    """Gain to the target loudness, a gentle limiter for the peaks, 20 ms behind the picture."""
    x = mix.copy()
    if duck is not None:
        x *= duck[:, None]
    with tempfile.TemporaryDirectory() as d:
        raw = os.path.join(d, "raw.wav")
        sf.write(raw, x, SR, subtype="FLOAT")
        meas = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", raw, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", meas)[-1])
        g = target - I
        delay = STORY["soundDelayMs"]
        for _ in range(3):  # the limiter takes some loudness back: nudge until it lands
            af = f"volume={g:.2f}dB,alimiter=limit={10 ** (peak / 20):.4f}:attack=5:release=80:level=false,adelay={delay}:all=1"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af", af, "-t", f"{END + 0.5:.3f}", "-ar", str(SR), "-c:a", "flac", "-sample_fmt", "s16", out], check=True)
            meas = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
            I2 = re.findall(r"I:\s+(-?[\d.]+) LUFS", meas)[-1]
            tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", meas)[-1]
            if abs(float(I2) - target) < 0.4:
                break
            g += target - float(I2)
        print(f"{os.path.relpath(out, ROOT)}: {I2} LUFS integrated, true peak {tp} dBTP (gain {g:+.1f} dB)")


def vo_windows():
    """Where a narrator speaks: from each line's beat for about as long as it takes to say."""
    sys.path.insert(0, HERE)
    w = np.ones(N, np.float32)
    t = np.arange(N) / SR
    for i, l in enumerate(STORY["lines"]):
        a = secs(l["beat"])
        words = l["her"].split()
        dur = 0.25 + sum(0.2 * max(1, len(re.findall(r"[aeiouy]+", re.sub(r"[^a-z]", "", x.lower())))) + (0.32 if re.search(r"[.,:;?!]$", x) else 0.02) for x in words)
        b = a + dur
        on = np.clip((t - a + 0.15) / 0.15, 0, 1) * np.clip((b + 0.35 - t) / 0.35, 0, 1)
        w = np.minimum(w, 1 - on * (1 - 10 ** (-5 / 20)))  # 5 dB down while she speaks
    return w


if __name__ == "__main__":
    if not os.path.isdir(VSCO):
        sys.exit("vendor/vsco is missing: run npm run samples first")
    missing = [k for k, v in INST.items() if not v]
    if missing:
        sys.exit(f"no samples found for {missing}: run npm run samples")
    mix = render()
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    master(mix, os.path.join(ROOT, "public", "audio", "score.flac"), -16)
    master(mix, os.path.join(ROOT, "public", "audio", "score-bed.flac"), -23, duck=vo_windows())
