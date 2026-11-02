"""Synthesises the score from src/timeline.json, the file the picture reads.

Every sound is generated in code, so there are no samples, loops or music
licenses to clear, and the seed is fixed, so a timeline always renders the same
file. Each hit lands on its event's frame, and the finished mix is written
`soundDelayMs` (20 ms) behind the picture: light arrives before sound in life,
and a cut a hair ahead of its note reads as on it.

    python3 -m pip install -r scripts/requirements.txt
    npm run score          # writes public/audio/score.wav, -14 LUFS (needs ffmpeg)

Write your own cue in `score()`: place sounds at EV["event"] for named events
and at beat(n) for the grid in between.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
TIMELINE = json.loads((ROOT / "src/timeline.json").read_text())
OUT = ROOT / "public/audio/score.wav"

SR = 48_000
FPS = TIMELINE["fps"]
DURATION = TIMELINE["durationInFrames"] / FPS
N = int(round(DURATION * SR))
BEAT = TIMELINE["framesPerBeat"] / FPS  # seconds per beat
RNG = np.random.default_rng(7)


def beat(n: float) -> float:
    """The time of beat n in seconds. Beats count from 1; 2.5 is the and-of-2."""
    return (TIMELINE["firstBeat"] + (n - 1) * TIMELINE["framesPerBeat"]) / FPS


def beat_frame(n: float) -> int:
    """The frame beat n lands on, rounded half up like Math.round in timeline.ts."""
    return math.floor(TIMELINE["firstBeat"] + (n - 1) * TIMELINE["framesPerBeat"] + 0.5)


# Each event's time in seconds, on the frame the picture puts it.
EV = {name: beat_frame(n) / FPS for name, n in TIMELINE["events"].items()}


def note(name: str) -> float:
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6,
             "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((12 * (octave + 1) + names[pitch] - 69) / 12)


# ---------------------------------------------------------------- mix buses

class Bus:
    def __init__(self) -> None:
        self.dry = np.zeros((2, N))
        self.verb = np.zeros((2, N))

    def add(self, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0, send: float = 0.0) -> None:
        start = int(round(at * SR))
        if start >= N:
            return
        x = x[: N - start] * gain
        ramp = min(len(x), 24)  # half a millisecond, so no hit starts with a step
        x[:ramp] *= np.linspace(0, 1, ramp)
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        seg = slice(start, start + len(x))
        self.dry[0, seg] += x * left
        self.dry[1, seg] += x * right
        if send:
            self.verb[0, seg] += x * left * send
            self.verb[1, seg] += x * right * send


music, drums, sfx = Bus(), Bus(), Bus()


# ---------------------------------------------------------------- building blocks

def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def noise(seconds: float) -> np.ndarray:
    return RNG.standard_normal(int(seconds * SR))


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def highpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def lowpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def fade(x: np.ndarray, attack: float = 0.002, release: float = 0.01) -> np.ndarray:
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    x = x.copy()
    x[:a] *= np.linspace(0, 1, a)
    x[-r:] *= np.linspace(1, 0, r)
    return x


# ---------------------------------------------------------------- instruments

def marimba(f0: float, length: float = 1.2, bright: float = 1.0) -> np.ndarray:
    """Modal bar: tuned partials at roughly 1 : 4 : 10, plus a soft mallet."""
    t = t_axis(length)
    tau = 0.42 * (440 / f0) ** 0.35
    out = np.sin(2 * np.pi * f0 * t) * np.exp(-t / tau)
    out += 0.32 * bright * np.sin(2 * np.pi * f0 * 3.99 * t) * np.exp(-t / (tau * 0.22))
    out += 0.09 * bright * np.sin(2 * np.pi * f0 * 10.6 * t) * np.exp(-t / (tau * 0.07))
    out += 0.12 * np.sin(2 * np.pi * f0 * 2 * t) * np.exp(-t / (tau * 0.5))
    mallet = lowpass(noise(0.006), 3500) * np.exp(-t_axis(0.006) / 0.0015)
    out[: len(mallet)] += 0.25 * mallet
    return fade(out, 0.0008, 0.05)


def epiano(f0: float, length: float = 1.6, velocity: float = 1.0) -> np.ndarray:
    """Two-operator FM, the classic tine-piano recipe."""
    t = t_axis(length)
    index = (0.6 + 2.2 * velocity) * np.exp(-t / 0.25) + 0.15
    out = np.sin(2 * np.pi * f0 * t + index * np.sin(2 * np.pi * f0 * t))
    out += 0.25 * np.sin(2 * np.pi * f0 * 14 * t) * np.exp(-t / 0.012)  # tine ping
    return fade(out * np.exp(-t / (0.9 * (261 / f0) ** 0.25)), 0.002, 0.08)


def bell(f0: float, length: float = 2.6) -> np.ndarray:
    t = t_axis(length)
    index = 3.2 * np.exp(-t / 0.5) + 0.4
    out = np.sin(2 * np.pi * f0 * t + index * np.sin(2 * np.pi * f0 * 1.4 * t))
    out += 0.35 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t / 0.35)
    out += 0.2 * np.sin(2 * np.pi * f0 * 5.4 * t) * np.exp(-t / 0.15)
    return fade(out * np.exp(-t / 1.1), 0.001, 0.2)


def bass(f0: float, length: float = 0.42, open_: float = 1.0) -> np.ndarray:
    """Round synth bass: a saw through a closing low-pass, over a sine sub."""
    t = t_axis(length)
    saw = signal.sawtooth(2 * np.pi * f0 * t)
    coef = 1 - np.exp(-2 * np.pi * (280 + 1600 * open_ * np.exp(-t / 0.05)) / SR)
    y, acc = np.zeros_like(saw), 0.0
    for i in range(len(saw)):  # a one-pole filter whose cutoff moves
        acc += coef[i] * (saw[i] - acc)
        y[i] = acc
    out = (0.55 * y + 0.8 * np.sin(2 * np.pi * f0 * t)) * np.exp(-t / 0.28)
    return fade(np.tanh(1.4 * out), 0.003, 0.04)


def kick(power: float = 1.0) -> np.ndarray:
    t = t_axis(0.5)
    phase = 2 * np.pi * np.cumsum(46 + 110 * np.exp(-t / 0.035)) / SR
    out = np.sin(phase) * np.exp(-t / (0.22 * power))
    click = highpass(noise(0.004), 2000) * np.exp(-t_axis(0.004) / 0.0008)
    out[: len(click)] += 0.35 * click
    return np.tanh(1.6 * out)


def clap() -> np.ndarray:
    n = noise(0.3)
    env = np.zeros_like(n)
    for k, offset in enumerate([0.0, 0.009, 0.017, 0.026]):
        s = int(offset * SR)
        tau = 0.006 if k < 3 else 0.09
        env[s:] += np.exp(-np.arange(len(n) - s) / (tau * SR)) * (0.8 if k < 3 else 1.0)
    return bandpass(n * env, 900, 2600) * 1.4


def hat(open_: bool = False) -> np.ndarray:
    n = highpass(noise(0.25 if open_ else 0.06), 7500, 4)
    return n * np.exp(-np.arange(len(n)) / ((0.07 if open_ else 0.012) * SR))


def sweep(length: float, f_from: float, f_to: float, rise: bool = True) -> np.ndarray:
    """A band of noise gliding between two center frequencies: whooshes and risers."""
    n = noise(length)
    hop, out, zi = 256, np.zeros_like(n), None
    for i, c in enumerate(np.geomspace(f_from, f_to, len(n) // hop + 1)):
        seg = n[i * hop:(i + 1) * hop]
        if len(seg) == 0:
            break
        sos = signal.butter(2, [c * 0.7, min(c * 1.4, SR / 2 - 100)], btype="band", fs=SR, output="sos")
        zi = np.zeros((sos.shape[0], 2)) if zi is None else zi
        out[i * hop:i * hop + len(seg)], zi = signal.sosfilt(sos, seg, zi=zi)
    shape = np.linspace(0, 1, len(n))
    return fade(out * (shape ** 2.2 if rise else (1 - shape) ** 1.5), 0.01, 0.01)


def sub_drop(f0: float = 55, length: float = 1.0) -> np.ndarray:
    t = t_axis(length)
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t / 0.05))) / SR) * np.exp(-t / 0.35)


# ---------------------------------------------------------------- more voices for Daphne

def pad(freqs: list[float], length: float, cutoff: float = 1400, attack: float = 0.5, release: float = 0.9) -> np.ndarray:
    """A soft string-like pad: three detuned saws a note, through a low-pass, swelling in and out."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for f0 in freqs:
        for d in (-0.07, 0.0, 0.06):
            out += signal.sawtooth(2 * np.pi * f0 * (1 + d / 100 * 12 / 12) * 2 ** (d / 12) * t + RNG.uniform(0, 6.28))
    out = lowpass(lowpass(out / (3 * len(freqs)), cutoff), cutoff)
    env = np.minimum(1, t / attack) * np.minimum(1, (length - t) / release).clip(0, 1)
    return out * env


def pluck(f0: float, length: float = 0.9, bright: float = 1.0) -> np.ndarray:
    """A plucked string, additively: upper partials die first."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for k in range(1, 9):
        out += (0.8 ** k) * np.sin(2 * np.pi * f0 * k * t + k) * np.exp(-t * (3 + 6 * k * bright) * (f0 / 440) ** 0.3)
    return fade(out, 0.0015, 0.05)


def heart(strength: float = 1.0) -> np.ndarray:
    """One beat of a heart: a low, soft thump."""
    t = t_axis(0.35)
    phase = 2 * np.pi * np.cumsum(48 + 30 * np.exp(-t / 0.03)) / SR
    return np.sin(phase) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.006)) * strength


def tick(f0: float = 3200) -> np.ndarray:
    t = t_axis(0.03)
    return np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.004) + 0.3 * highpass(noise(0.03), 5000) * np.exp(-t / 0.002)


def crash(length: float = 2.2) -> np.ndarray:
    n = highpass(noise(length), 3500, 2)
    t = t_axis(length)
    return n * np.exp(-t / 0.7) * (1 - np.exp(-t / 0.003))


def shaker() -> np.ndarray:
    n = bandpass(noise(0.07), 5000, 11000)
    t = t_axis(0.07)
    return n * (1 - np.exp(-t / 0.008)) * np.exp(-t / 0.02)


CHORDS = {  # D major, voiced for the pad and the plucks
    "D": ["D3", "A3", "D4", "F#4", "A4"], "Bm": ["B2", "F#3", "B3", "D4", "F#4"], "G": ["G2", "D3", "G3", "B3", "D4"],
    "A": ["A2", "E3", "A3", "C#4", "E4"], "Em": ["E3", "B3", "E4", "G4", "B4"], "Dadd9": ["D3", "A3", "E4", "F#4", "A4"],
}
ROOT_OF = {"D": "D2", "Bm": "B1", "G": "G1", "A": "A1", "Em": "E2", "Dadd9": "D2"}
ARP = {c: [note(n) * m for m in (2, 4) for n in CHORDS[c][1:]] for c in CHORDS}


# ---------------------------------------------------------------- the cue

def score() -> list[float]:
    """Places every sound on the picture's beats, and returns the kick times for the sidechain."""
    E, B = EV, beat
    kicks: list[float] = []

    def k(at: float, g: float = 0.6, power: float = 1.0) -> None:
        drums.add(kick(power), at, g)
        kicks.append(at)

    def heartbeat(at: float, g: float = 0.5) -> None:  # lub-dub, the dub 0.24 s after
        drums.add(heart(1.0), at, g)
        drums.add(heart(0.6), at + 0.24, g)

    def groove(b0: float, b1: float, chord_at, full: bool = True, half: bool = False) -> None:
        """Four-on-the-floor (or half time), claps on 2 and 4, offbeat hats, sixteenth shakers, eighth-note bass."""
        b = b0
        while b < b1 - 1e-6:
            if not half or (b - b0) % 2 == 0:
                k(B(b), 0.62 if full else 0.45)
            if (b - b0) % 2 == 1:
                drums.add(clap(), B(b), 0.26 if full else 0.16, pan=0.05, send=0.3)
            drums.add(lowpass(hat(open_=full and (b - b0) % 4 == 3), 12000), B(b + 0.5), 0.07, pan=0.3)
            for q in range(4):
                drums.add(shaker(), B(b + q / 4) + (0.012 if q % 2 else 0), 0.05 if q % 2 else 0.035, pan=-0.35)
            ch = chord_at(b)
            root = note(ROOT_OF[ch])
            for e in range(2):
                music.add(bass(root * (2 if e == 1 and (b - b0) % 2 == 1 else 1), 0.26, 0.7 if e == 0 else 0.45), B(b + e / 2), 0.26)
            b += 1

    def chord_pad(ch: str, b0: float, b1: float, g: float = 0.07, cutoff: float = 1600) -> None:
        music.add(pad([note(n) for n in CHORDS[ch]], B(b1) - B(b0) + 0.9, cutoff), B(b0), g, send=0.35)

    # ── the email (beats 1–8): her heartbeat, a drone, the page writing itself
    music.add(pad([note("D2"), note("A2"), note("D3"), note("A3"), note("F#4")], B(9) - 0.0, 1100, attack=1.2), 0.0, 0.08, send=0.4)
    for b in range(1, 17, 2):
        heartbeat(B(b), 0.42)
    for i in range(30):  # one tiny key per word as the email writes itself in
        sfx.add(tick(2600 + 400 * RNG.uniform()), (i * 0.7 + 1) / FPS, 0.025, pan=RNG.uniform(-0.3, 0.3))
    for ev, n in (("hl1", "F#5"), ("hl2", "A5"), ("hl3", "D6")):
        music.add(marimba(note(n), 1.4), E[ev], 0.22, pan=0.15, send=0.35)
        music.add(bell(note(n) * 2, 1.6), E[ev], 0.03, pan=-0.2, send=0.5)
    for i, n in enumerate(["A4", "D5", "F#5", "A5", "F#5", "D5"]):
        music.add(epiano(note(n), 1.2, 0.4), B(5.5 + i * 0.5), 0.06, pan=-0.2 + 0.08 * i, send=0.4)

    # ── lift and growth (beats 9–16)
    sfx.add(sweep(0.55, 400, 3000), E["lift"] - 0.55, 0.09, send=0.3)
    sfx.add(sweep(0.7, 2600, 500, rise=False), E["lift"], 0.08, pan=0.1, send=0.3)
    grow0 = E["grow"]
    scale = [note(n) for n in ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5", "B5", "D6", "E6", "F#6", "A6"]]
    for i in range(26):  # one note a leaf, a leaf a frame
        f0 = scale[min(len(scale) - 1, int(i * len(scale) / 26))]
        music.add(pluck(f0, 0.7, 0.6), grow0 + i / FPS, 0.045 * (0.6 + 0.4 * i / 26), pan=0.4 if i % 2 else -0.4, send=0.45)
    for n in ("D6", "F#6", "A6", "D7"):
        music.add(bell(note(n), 2.4), E["sheen"] + RNG.uniform(0, 0.03), 0.018, pan=RNG.uniform(-0.5, 0.5), send=0.6)
    music.add(bass(note("D2"), 1.6, 0.3), B(13), 0.22)
    chord_pad("Dadd9", 13, 17, 0.06)
    for b in (13, 14, 15, 16):
        k(B(b), 0.32, 0.8)
    for i in range(12):  # a roll into the drop
        drums.add(clap(), B(15.75 + i / 4 * 1.0 / 3 * 1.0) if False else B(14 + i / 4), 0.04 + 0.16 * (i / 11) ** 2, pan=0.05, send=0.25)
    sfx.add(sweep(B(17) - B(14.5), 300, 6000), B(14.5), 0.08, send=0.3)

    # ── 78 looks (beats 17–32): the drop, and a pluck on every new look
    sfx.add(crash(), E["looks"], 0.12, send=0.3)
    sfx.add(sub_drop(55, 0.9), E["looks"], 0.35)
    looks_chord = lambda b: "D" if b < 21 else "G" if b < 25 else "A" if b < 29 else "D"
    groove(17, 33, looks_chord)
    for b0, ch in ((17, "D"), (21, "G"), (25, "A"), (29, "D")):
        chord_pad(ch, b0, b0 + 4, 0.05)
    run = [17 + n for n in range(4)] + [21 + n / 2 for n in range(8)] + [25 + n / 4 for n in range(16)]
    for i, b in enumerate(run):
        arp = ARP[looks_chord(b)]
        music.add(pluck(arp[i % len(arp)], 0.6), B(b), 0.1, pan=0.25 if i % 2 else -0.25, send=0.3)
    sfx.add(crash(), E["grid"], 0.13, send=0.35)
    sfx.add(sub_drop(52, 1.0), E["grid"], 0.4)
    sfx.add(sweep(0.8, 5000, 600, rise=False), E["grid"], 0.07, send=0.3)
    for n in CHORDS["D"][1:]:
        music.add(epiano(note(n) * 2, 1.8, 0.8), E["grid"], 0.07, pan=RNG.uniform(-0.3, 0.3), send=0.4)

    # ── 268 festivals (beats 33–40): the groove thins, the count ticks, the search types
    fest_chord = lambda b: "Bm" if b < 37 else "G"
    groove(33, 41, fest_chord, full=False, half=True)
    chord_pad("Bm", 33, 37, 0.05)
    chord_pad("G", 37, 41, 0.05)
    for i in range(26):  # the counter, slowing as it lands on 268
        x = i / 25
        at = E["count"] + (1 - (1 - x) ** 0.5) * 20 / FPS
        sfx.add(tick(3000 + 900 * x), at, 0.04, pan=0.1)
    for i in range(8):
        sfx.add(tick(1900 + 200 * RNG.uniform()), E["capFest"] + (2 * i + 1) / FPS, 0.05, pan=-0.15)
    music.add(marimba(note("B5"), 1.0), E["pick"], 0.16, send=0.35)
    for i in range(4):
        music.add(pluck(note(["D6", "F#6", "A6", "B6"][i]), 0.4), E["pick"] + (3 + i * 3) / FPS, 0.04, pan=0.2, send=0.4)
    sfx.add(sweep(B(41) - B(40), 400, 5000), B(40), 0.07, send=0.3)

    # ── export (beats 41–56): full groove, a whoosh for every move of the camera
    export_chord = lambda b: "D" if b < 45 else "A" if b < 49 else "Bm" if b < 53 else "G"
    sfx.add(crash(1.6), E["export"], 0.09, send=0.3)
    groove(41, 56.5, export_chord)
    for b0, ch in ((41, "D"), (45, "A"), (49, "Bm"), (53, "G")):
        chord_pad(ch, b0, b0 + 4, 0.05)
    for ev in ("trailer", "social", "web", "sig"):
        sfx.add(sweep(14 / FPS, 700, 4200), E[ev] - 10 / FPS, 0.07, pan=-0.3, send=0.2)
    for i, n in enumerate(["D5", "F#5", "A5", "D6"]):
        music.add(marimba(note(n), 1.0), B(53 + i * 0.5), 0.2, pan=-0.3 + 0.2 * i, send=0.3)

    # ── the fixer (beats 57–64): the drums stop for the problem; the scan cleans it up
    sfx.add(sweep(0.6, 3000, 300, rise=False), E["fixer"] - 0.1, 0.06, send=0.3)
    chord_pad("Em", 57, 61, 0.07, 1100)
    music.add(bass(note("E2"), 1.4, 0.3), E["fixer"], 0.22)
    for b in (57, 59):
        heartbeat(B(b), 0.4)
    music.add(epiano(note("G4"), 1.5, 0.5), B(58), 0.06, send=0.4)
    music.add(epiano(note("B4"), 1.5, 0.5), B(59), 0.06, send=0.4)
    sfx.add(sweep(0.5, 800, 9000), E["fix"], 0.09, pan=0.2, send=0.3)
    chord_pad("D", 61, 65, 0.06)
    music.add(bell(note("A5"), 2.0), E["fix"] + 0.45, 0.05, send=0.5)
    music.add(bass(note("D2"), 1.2, 0.5), E["fix"], 0.24)
    for i, n in enumerate(["F#5", "A5", "D6"]):
        music.add(marimba(note(n), 0.9), B(62 + i * 0.5), 0.15, pan=-0.2 + 0.2 * i, send=0.3)
    k(B(61), 0.4, 0.9)
    k(B(63), 0.4, 0.9)
    sfx.add(sweep(B(65) - B(63.5), 300, 5000), B(63.5), 0.07, send=0.3)

    # ── the pack (beats 65–72): the groove back, a pluck as each laurel lands
    pack_chord = lambda b: "G" if b < 69 else "A"
    sfx.add(crash(1.6), E["pack"], 0.09, send=0.3)
    groove(65, 72.5, pack_chord)
    chord_pad("G", 65, 69, 0.05)
    chord_pad("A", 69, 73, 0.05)
    for i in range(21):
        b = 65.5 + i / 4
        arp = ARP[pack_chord(b)]
        music.add(pluck(arp[i % len(arp)], 0.5), B(b), 0.08, pan=-0.3 + 0.3 * (i % 3), send=0.3)
    sfx.add(sweep(0.6, 4000, 700, rise=False), B(70.5), 0.06, send=0.3)

    # ── the freedoms (beats 73–80): half time, a falling bell line, D C# B A
    free = [("free", "G", "D6"), ("noAccount", "A", "C#6"), ("noWatermark", "Bm", "B5"), ("openSource", "A", "A5")]
    for ev, ch, n in free:
        t0 = E[ev]
        k(t0, 0.55)
        music.add(bass(note(ROOT_OF[ch]), 1.0, 0.4), t0, 0.26)
        music.add(pad([note(x) for x in CHORDS[ch]], B(2.2) - B(0) + 0.6, 1800), t0, 0.07, send=0.35)
        music.add(bell(note(n), 2.2), t0, 0.07, pan=0.1, send=0.5)
        music.add(marimba(note(n), 1.0), t0, 0.12, send=0.3)
        drums.add(clap(), t0 + B(2) - B(1), 0.14, send=0.35)
        drums.add(lowpass(hat(), 11000), t0 + (B(2) - B(1)) * 0.5, 0.05, pan=0.3)
        drums.add(lowpass(hat(), 11000), t0 + (B(2) - B(1)) * 1.5, 0.05, pan=0.3)
    sfx.add(sub_drop(55, 1.0), E["free"], 0.3)

    # ── the logo (beats 81–end): home in D, the name in bells, her heart in the hold
    sfx.add(sweep(0.7, 500, 4000), E["logo"] - 0.7, 0.05, send=0.3)
    tail = DURATION - E["logo"]
    music.add(pad([note(n) for n in ["D2", "A2", "D3", "F#3", "E4", "A4"]], tail, 1500, attack=0.4, release=2.5), E["logo"], 0.11, send=0.45)
    music.add(bass(note("D2"), 2.4, 0.3), E["logo"], 0.26)
    k(E["logo"], 0.45)
    for i, n in enumerate(["A5", "B5", "D6", "E6", "F#6", "A6"]):
        music.add(bell(note(n), 2.4), E["logo"] + (6 + i * 2) / FPS, 0.035, pan=-0.4 + 0.16 * i, send=0.55)
    hb = E["tagline"]
    while hb < DURATION - 0.5:
        heartbeat(hb, 0.5)
        hb += B(3) - B(1)
    music.add(marimba(note("D6"), 1.4), E["url"], 0.1, send=0.4)
    sfx.add(sweep(2.6, 3500, 700, rise=False), E["leafFall"], 0.035, pan=0.3, send=0.5)
    return kicks


# ---------------------------------------------------------------- mixdown

def reverb_ir(seconds: float = 1.6) -> np.ndarray:
    t = t_axis(seconds)
    ir = np.zeros((2, len(t)))
    for ch in range(2):
        n = lowpass(RNG.standard_normal(len(t)) * np.exp(-t / (seconds / 6.9)), 6500)
        n[: int(0.012 * SR)] = 0  # pre-delay
        ir[ch] = n
    for at, gain in [(0.013, 0.6), (0.021, 0.45), (0.034, 0.35), (0.047, 0.25)]:
        ir[0, int(at * SR)] += gain
        ir[1, int((at + 0.004) * SR)] += gain
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def sidechain(x: np.ndarray, kicks: list[float], depth: float = 0.45) -> np.ndarray:
    gain = np.ones(N)
    for at in kicks:
        s = int(at * SR)
        k = np.arange(N - s) / SR
        gain[s:] *= 1 - depth * np.exp(-k / 0.09) * (1 - np.exp(-k / 0.004))
    return x * gain


def compress(x: np.ndarray, threshold_db: float = -16, ratio: float = 2.5) -> np.ndarray:
    level = np.sqrt(signal.sosfilt(signal.butter(1, 12, fs=SR, output="sos"), np.mean(x ** 2, axis=0)) + 1e-12)
    over = np.maximum(0, 20 * np.log10(level) - threshold_db)
    return x * 10 ** (-(over - over / ratio) / 20)


def main() -> None:
    kicks = score()
    ir = reverb_ir()
    wet = np.zeros((2, N))
    for bus in (music, drums, sfx):
        for ch in range(2):
            wet[ch] += signal.fftconvolve(bus.verb[ch], ir[ch])[:N]
    mix = sidechain(music.dry, kicks) + drums.dry + sfx.dry + 0.5 * sidechain(wet, kicks, 0.3)
    mix = compress(highpass(mix, 28))

    # The picture leads: the whole mix starts soundDelayMs late.
    delay = int(round(TIMELINE["soundDelayMs"] / 1000 * SR))
    mix = np.concatenate([np.zeros((2, delay)), mix[:, : N - delay]], axis=1)
    # The last 0.35 s fades, so the end (and any loop point) is silent.
    tail = int(0.35 * SR)
    mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
    mix = np.tanh(1.1 * mix / np.max(np.abs(mix))) * 0.9

    OUT.parent.mkdir(parents=True, exist_ok=True)
    raw = OUT.with_suffix(".raw.wav")
    wavfile.write(raw, SR, (mix.T * 32767).astype(np.int16))

    # Loudness for Instagram: -14 LUFS integrated, true peak under -1 dBTP.
    # Two passes, so the gain change is linear and the dynamics stay intact.
    target = "I=-14:TP=-1.2:LRA=11"
    probe = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(raw), "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
        check=True, capture_output=True, text=True,
    ).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    measured = (f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    result = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-i", str(raw),
         "-af", f"loudnorm={target}:{measured}:linear=true:print_format=json",
         "-ar", str(SR), "-c:a", "pcm_s16le", str(OUT)],
        check=True, capture_output=True, text=True,
    ).stderr
    raw.unlink()
    # When a linear gain would push the peaks past TP, ffmpeg quietly switches
    # to dynamic normalization and lands short of -14. Say so.
    r = json.loads(result[result.rindex("{"):result.rindex("}") + 1])
    if r["normalization_type"] != "linear" or abs(float(r["output_i"]) + 14) > 0.5:
        print(f"Warning: the mix came out at {r['output_i']} LUFS ({r['normalization_type']} normalization), "
              "not -14. Its peaks sit too far above the rest for a clean gain: tame the loudest hits and run it again.",
              file=sys.stderr)
    print(f"Wrote {OUT.relative_to(ROOT)} ({DURATION:.2f}s at {SR} Hz, {TIMELINE['soundDelayMs']} ms behind picture)")


if __name__ == "__main__":
    sys.exit(main())
