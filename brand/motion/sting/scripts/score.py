"""Daphne's score, synthesised in code from src/timeline.json, the file the picture reads.

Every sound is made here, with no samples, loops or licences, and the seed is fixed.
The clock is her heartbeat, 52 a minute, lub-dub. The harmony goes from D minor to
D major: a drone of D and A under everything, a glass cascade as the life runs up
the branches, wind and a sighing felt piano as the leaves fall, Bbmaj7 as her name
rises, and D major on the tagline, the moment the piece turns from loss to free.

    python3 -m pip install numpy scipy
    npm run score      # writes public/audio/daphne-intro.wav and daphne-outro.wav (needs ffmpeg)

Both mixes start soundDelayMs (20 ms) behind the picture: a cut a hair ahead of its
note reads as on it.
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
TL = json.loads((ROOT / "src/timeline.json").read_text())
EV = TL["events"]
SR = 48_000
FPS = TL["fps"]
DURATION = TL["durationInFrames"] / FPS
N = int(round(DURATION * SR))
PERIOD = 60 / TL["heart"]["bpm"]
LUBS = [TL["heart"]["first"] + n * PERIOD for n in range(4)]
DUB = TL["heart"]["dub"]
TARGET_LUFS = -14.0
CEILING_DBTP = -1.5


def note(name: str) -> float:
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6,
             "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((12 * (octave + 1) + names[pitch] - 69) / 12)


def bezier(x1: float, y1: float, x2: float, y2: float):
    """CSS cubic-bezier, the same curve src/paint.ts uses."""
    ax, bx, cx = 3 * x1 - 3 * x2 + 1, 3 * x2 - 6 * x1, 3 * x1
    ay, by, cy = 3 * y1 - 3 * y2 + 1, 3 * y2 - 6 * y1, 3 * y1

    def f(x: float) -> float:
        if x <= 0:
            return 0.0
        if x >= 1:
            return 1.0
        u = x
        for _ in range(8):
            fx = ((ax * u + bx) * u + cx) * u - x
            d = (3 * ax * u + 2 * bx) * u + cx
            if abs(d) < 1e-6:
                break
            u -= fx / d
        u = min(1.0, max(0.0, u))
        return ((ay * u + by) * u + cy) * u
    return f


in_out = bezier(0.45, 0, 0.25, 1)


def when(progress: float, a: float, b: float, curve=in_out) -> float:
    """The time at which an eased span reaches a given progress."""
    lo, hi = a, b
    for _ in range(40):
        m = (lo + hi) / 2
        if curve((m - a) / (b - a)) < progress:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


# ---------------------------------------------------------------- buses

class Bus:
    def __init__(self, n: int) -> None:
        self.dry = np.zeros((2, n))
        self.send = np.zeros((2, n))

    def add(self, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0, verb: float = 0.0) -> None:
        start = int(round(at * SR))
        if start >= self.dry.shape[1] or start < 0:
            return
        x = x[: self.dry.shape[1] - start] * gain
        ramp = min(len(x), 24)
        x[:ramp] *= np.linspace(0, 1, ramp)
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        seg = slice(start, start + len(x))
        self.dry[0, seg] += x * left
        self.dry[1, seg] += x * right
        if verb:
            self.send[0, seg] += x * left * verb
            self.send[1, seg] += x * right * verb


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def lowpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def highpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def envelope(n: int, attack: float, release: float, hold_to: float | None = None) -> np.ndarray:
    t = np.arange(n) / SR
    env = np.clip(t / max(attack, 1e-4), 0, 1) ** 1.6
    end = n / SR if hold_to is None else hold_to
    env *= np.clip((end - t) / max(release, 1e-4), 0, 1) ** 1.4
    return env


# ---------------------------------------------------------------- instruments

def felt_piano(f0: float, length: float, vel: float, rng: np.random.Generator) -> np.ndarray:
    """A piano with felt between hammer and string: three slightly detuned strings,
    stretched partials, a dark tone and a soft thump."""
    t = t_axis(length)
    out = np.zeros_like(t)
    B = 0.00035
    cutoff = 900 + 2200 * vel
    tau0 = 2.8 * (261.6 / f0) ** 0.45
    for n in range(1, 18):
        fn = n * f0 * math.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        amp = n ** -1.15 * math.exp(-fn / cutoff)
        if amp < 1e-4:
            continue
        tau = tau0 / (1 + 0.32 * (n - 1))
        decay = 0.45 * np.exp(-t / (tau * 0.22)) + 0.55 * np.exp(-t / tau)
        for cents in (-0.9, 0.0, 1.1):
            ph = rng.uniform(0, 2 * np.pi)
            out += amp / 3 * np.sin(2 * np.pi * fn * 2 ** (cents / 1200) * t + ph) * decay
    thump = lowpass(rng.standard_normal(len(t)), 260) * np.exp(-t / 0.018) * 0.6 * vel
    out = out + thump
    attack = min(len(out), int(0.004 * SR))
    out[:attack] *= np.linspace(0, 1, attack)
    out[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return out * (0.5 + 0.5 * vel)


def glass(f0: float, length: float = 2.2) -> np.ndarray:
    """A small bell of glass: a pure tone with two quick inharmonic partials."""
    t = t_axis(length)
    out = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 1.1)
    out += 0.22 * np.sin(2 * np.pi * f0 * 2.76 * t) * np.exp(-t / 0.18)
    out += 0.08 * np.sin(2 * np.pi * f0 * 5.4 * t) * np.exp(-t / 0.06)
    a = int(0.003 * SR)
    out[:a] *= np.linspace(0, 1, a)
    out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
    return out


def pad(freqs: list[float], length: float, attack: float, release: float, rng: np.random.Generator, bright: float = 1.0) -> np.ndarray:
    """Soft strings: detuned saws drawn partial by partial, dark, with a slow vibrato."""
    t = t_axis(length)
    out = np.zeros_like(t)
    vib = 1 + 0.0018 * np.sin(2 * np.pi * 4.6 * t) * np.clip((t - 0.4) / 0.6, 0, 1)
    for f0 in freqs:
        for cents in (-7, -2.5, 0, 3, 7.5):
            f = f0 * 2 ** (cents / 1200)
            phase = 2 * np.pi * np.cumsum(f * vib) / SR + rng.uniform(0, 2 * np.pi)
            for n in range(1, 30):
                fn = f * n
                if fn > 5000:
                    break
                out += (1 / n) * math.exp(-fn / (900 * bright)) * np.sin(n * phase) / 5
    return out * envelope(len(t), attack, release)


def drone(length: float, rng: np.random.Generator) -> np.ndarray:
    """D and A, low and slow, breathing a little."""
    t = t_axis(length)
    out = np.zeros_like(t)
    for f0, g in ((note("D2"), 1.0), (note("A2"), 0.55), (note("D3"), 0.3)):
        for cents in (-4, 0, 5):
            ph = 2 * np.pi * f0 * 2 ** (cents / 1200) * t + rng.uniform(0, 6.28)
            out += g * (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) / 3
    out *= 1 + 0.12 * np.sin(2 * np.pi * 0.23 * t)
    return lowpass(out, 700)


def heartbeat(strength: float, rng: np.random.Generator) -> np.ndarray:
    """Lub-dub: two soft, low thumps, felt more than heard, with enough body to reach a phone."""
    def thump(f_end: float, f_add: float, decay: float, gain: float) -> np.ndarray:
        t = t_axis(0.45)
        phase = 2 * np.pi * np.cumsum(f_end + f_add * np.exp(-t / 0.028)) / SR
        body = np.sin(phase) * np.exp(-t / decay)
        click = lowpass(rng.standard_normal(len(t)), 380) * np.exp(-t / 0.008) * 0.25
        return np.tanh(1.8 * (body + click)) * gain
    lub = thump(46, 34, 0.085, 1.0)
    dub = thump(52, 28, 0.065, 0.62)
    out = np.zeros(int((DUB + 0.5) * SR))
    out[: len(lub)] += lub
    s = int(DUB * SR)
    out[s: s + len(dub)] += dub[: len(out) - s]
    return out * strength


def wind(length: float, rng: np.random.Generator, center_from: float, center_to: float) -> np.ndarray:
    """Air moving through the grove: noise in a band that moves."""
    n = rng.standard_normal(int(length * SR))
    hop, out, zi = 512, np.zeros_like(n), None
    centers = np.geomspace(center_from, center_to, len(n) // hop + 1)
    for i, c in enumerate(centers):
        seg = n[i * hop:(i + 1) * hop]
        if len(seg) == 0:
            break
        sos = signal.butter(2, [c * 0.6, min(c * 1.7, SR / 2 - 100)], btype="band", fs=SR, output="sos")
        zi = np.zeros((sos.shape[0], 2)) if zi is None else zi
        out[i * hop:i * hop + len(seg)], zi = signal.sosfilt(sos, seg, zi=zi)
    return out


def rustle(length: float, density: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Leaves brushing past each other: many tiny dry grains, as dense as the fall."""
    out = np.zeros((2, int(length * SR)))
    step = int(0.004 * SR)
    for i in range(0, out.shape[1] - int(0.04 * SR), step):
        if rng.random() < density[min(i, len(density) - 1)] * 0.5:
            L = int(rng.uniform(0.004, 0.022) * SR)
            g = highpass(rng.standard_normal(L), rng.uniform(1800, 4200)) * np.exp(-np.arange(L) / (L * 0.3))
            pan = rng.uniform(-0.8, 0.8)
            amp = rng.uniform(0.2, 1.0)
            out[0, i:i + L] += g * amp * np.cos((pan + 1) * np.pi / 4)
            out[1, i:i + L] += g * amp * np.sin((pan + 1) * np.pi / 4)
    return out


# ---------------------------------------------------------------- the cue

def cue(ending: str) -> np.ndarray:
    rng = np.random.default_rng(20261031)
    music, low, fx = Bus(N), Bus(N), Bus(N)

    # the ground: a drone of D and A, rising out of silence
    d = drone(DURATION + 0.5, rng)[:N]
    d *= np.clip(np.arange(N) / SR / 0.9, 0, 1) ** 1.5
    low.add(d, 0.0, 0.16)

    # the gold: light crossing metal, a few high glass partials and a breath of air
    for f0, at, pan in ((note("A6"), 0.05, -0.4), (note("E7"), 0.28, 0.35), (note("D7"), 0.55, -0.1)):
        music.add(glass(f0, 1.6), at, 0.035, pan=pan, verb=0.6)
    sweep = wind(1.0, rng, 3000, 9000) * np.sin(np.pi * np.clip(t_axis(1.0) / 1.0, 0, 1)) ** 2
    fx.add(sweep, 0.02, 0.03, pan=0.2, verb=0.3)

    # her heart: four beats, the first and second strongest
    for at, strength in zip(LUBS, (1.0, 0.9, 0.62, 0.42)):
        low.add(heartbeat(strength, rng), at, 0.5)

    # the life running up the branches: a cascade of glass, one note a leaf or so,
    # alternating branches, placed where the picture's life front reaches
    scale = ["D4", "E4", "F4", "A4", "C5", "D5", "E5", "F5", "A5", "C6", "D6", "E6", "F6", "A6"]
    a, b = EV["life"]
    for i, name in enumerate(scale):
        at = when(0.06 + 0.9 * i / (len(scale) - 1), a, b)
        music.add(glass(note(name), 1.8), at, 0.05 * (0.75 + 0.25 * i / len(scale)), pan=-0.55 if i % 2 == 0 else 0.55, verb=0.55)
    # a soft pad of D minor underneath it
    music.add(pad([note("D3"), note("F3"), note("A3")], 2.0, 0.7, 0.6, rng), LUBS[0], 0.05, verb=0.4)

    # the release: wind through the grove, and the rustle of the leaves letting go
    r0, r1 = EV["release"]
    wlen = DURATION - r0 + 0.2
    w = wind(wlen, rng, 380, 1400)
    tt = t_axis(wlen)
    w *= np.exp(-((tt - 0.45) / 0.55) ** 2) * 0.9 + 0.1 * np.exp(-tt / 2)
    fx.add(w, r0 - 0.15, 0.22, pan=-0.15, verb=0.25)
    dens = np.exp(-((tt - 0.35) / 0.45) ** 2)
    ru = rustle(wlen, dens, rng)
    start = int(round((r0 - 0.05) * SR))
    seg = min(ru.shape[1], N - start)
    for ch in range(2):
        fx.dry[ch, start:start + seg] += ru[ch, :seg] * 0.05
        fx.send[ch, start:start + seg] += ru[ch, :seg] * 0.02

    # the fall: a felt piano sighs downward, D minor
    p = lambda name, at, vel, gain, pan=0.0, length=3.2: music.add(felt_piano(note(name), length, vel, rng), at, gain, pan=pan, verb=0.5)
    p("D3", LUBS[1], 0.5, 0.2, -0.2)
    p("A4", LUBS[1], 0.55, 0.16, -0.05)
    p("D5", LUBS[1] + 0.02, 0.6, 0.18, 0.1)
    p("C5", 1.94, 0.45, 0.14, 0.15)
    p("A4", 2.2, 0.4, 0.13, -0.1)

    # her name rises: Bbmaj7 over the D, the strings opening out
    n0 = EV["name"][0]
    music.add(pad([note("Bb2"), note("F3"), note("A3"), note("D4")], DURATION - n0 + 0.4, 0.55, 0.9, rng), n0, 0.055, verb=0.45)
    p("Bb2", n0 + 0.04, 0.45, 0.16, -0.25, 3.0)
    p("F3", n0 + 0.1, 0.4, 0.12, -0.05, 3.0)
    # the name lands with the third beat: E, the ninth, held in the air
    p("E5", LUBS[2] - 0.02, 0.55, 0.16, 0.1, 3.0)

    # the tagline: D major. The F sharp is the turn, from loss to free.
    tg = EV["tagline"][0]
    music.add(pad([note("D3"), note("F#3"), note("A3"), note("E4")], DURATION - tg + 0.4, 0.4, 0.8, rng, bright=1.2), tg, 0.06, verb=0.5)
    p("D3", tg + 0.02, 0.5, 0.18, -0.2, 2.6)
    p("A3", tg + 0.07, 0.45, 0.13, -0.05, 2.6)
    p("F#4", tg + 0.12, 0.5, 0.14, 0.1, 2.6)
    p("F#5", tg + 0.2, 0.55, 0.15, 0.2, 2.6)

    if ending == "outro":
        # the address arrives with a single high glass note, and the last beat has one more
        music.add(glass(note("A6"), 2.0), EV["url"][0] + 0.05, 0.04, pan=0.3, verb=0.7)
        p("D6", LUBS[3] + 0.04, 0.35, 0.07, -0.15, 1.6)
    else:
        p("A5", LUBS[3] + 0.04, 0.3, 0.06, -0.15, 1.6)

    # ---------------------------------------------------------- mixdown
    ir = reverb_ir(3.4, rng)
    mix = music.dry + low.dry + fx.dry
    for bus, g in ((music, 0.9), (fx, 0.5), (low, 0.25)):
        for ch in range(2):
            mix[ch] += g * signal.fftconvolve(bus.send[ch], ir[ch])[:N]
    mix = highpass(mix, 30)
    # a phone speaker starts around 100 Hz: lift the presence a touch
    mix = mix + 0.18 * bandpass(mix, 2500, 7000)

    if ending == "intro":
        # it fades into the dark with the picture
        t = np.arange(N) / SR
        a, b = EV["fadeOut"]
        mix *= 1 - np.clip((t - a) / (b - a), 0, 1) ** 1.3
    # the last 0.35 s fades, so the end is silent
    tail = int(0.35 * SR)
    mix[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5

    # the picture leads: the whole mix starts soundDelayMs late
    delay = int(round(TL["soundDelayMs"] / 1000 * SR))
    mix = np.concatenate([np.zeros((2, delay)), mix[:, : N - delay]], axis=1)
    return mix


def reverb_ir(seconds: float, rng: np.random.Generator) -> np.ndarray:
    """A dark, wide hall: decaying noise, darker as it fades, with a short pre-delay."""
    t = t_axis(seconds)
    ir = np.zeros((2, len(t)))
    for ch in range(2):
        n = rng.standard_normal(len(t)) * np.exp(-t / (seconds / 6.9))
        early, late = lowpass(n, 6500), lowpass(n, 2200)
        mixk = np.clip(t / 1.2, 0, 1)
        n = early * (1 - mixk) + late * mixk
        n[: int(0.022 * SR)] = 0
        ir[ch] = n
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


# ---------------------------------------------------------------- loudness

def loudness(x: np.ndarray) -> float:
    """Integrated loudness (LUFS) by ffmpeg's EBU R128 meter."""
    tmp = ROOT / "out/_measure.wav"
    tmp.parent.mkdir(exist_ok=True)
    wavfile.write(tmp, SR, x.T.astype(np.float32))
    res = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         check=True, capture_output=True, text=True).stderr
    tmp.unlink()
    summary = res[res.rindex("Summary:"):]
    return float(summary.split("I:")[1].split("LUFS")[0])


def true_peak_db(x: np.ndarray) -> float:
    up = signal.resample_poly(x, 4, 1, axis=1)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limit(x: np.ndarray, ceiling_db: float) -> np.ndarray:
    """A look-ahead limiter on the 4x oversampled peak, so true peaks stay under the ceiling."""
    thr = 10 ** (ceiling_db / 20)
    up = np.max(np.abs(signal.resample_poly(x, 4, 1, axis=1)), axis=0)
    peak = up.reshape(-1, 4).max(axis=1)[: x.shape[1]]
    need = np.minimum(1, thr / np.maximum(peak, 1e-9))
    look = int(0.003 * SR)
    need = signal.order_filter(np.pad(need, (look, look), mode="edge"), np.ones(2 * look + 1), 0)[look:-look]
    # smooth: fast attack (already looked ahead), slow release
    g = np.empty_like(need)
    rel = math.exp(-1 / (0.08 * SR))
    cur = 1.0
    for i, v in enumerate(need):
        cur = v if v < cur else v + (cur - v) * rel
        g[i] = cur
    return x * g


def main() -> None:
    for ending in ("intro", "outro"):
        mix = cue(ending)
        gain_db = TARGET_LUFS - loudness(mix)
        mix *= 10 ** (gain_db / 20)
        before = true_peak_db(mix)
        mix = limit(mix, CEILING_DBTP - 0.3)
        lufs, tp = loudness(mix), true_peak_db(mix)
        out = ROOT / f"public/audio/daphne-{ending}.wav"
        out.parent.mkdir(parents=True, exist_ok=True)
        wavfile.write(out, SR, (np.clip(mix, -1, 1).T * 32767).astype(np.int16))
        print(f"{out.relative_to(ROOT)}: {lufs:.1f} LUFS, true peak {tp:.1f} dBTP "
              f"(limited by up to {max(0.0, before - (CEILING_DBTP - 0.3)):.1f} dB), {DURATION:.2f} s, "
              f"{TL['soundDelayMs']} ms behind the picture")


if __name__ == "__main__":
    sys.exit(main())
