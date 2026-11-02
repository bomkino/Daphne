"""Measures the shipped file, not the WAV: where each hit's sound starts against its frame's presentation time.

    python3 scripts/check_sync.py out/Explainer-1080x1920.mp4

The hits are the kicks the score puts on cue beats (src/timeline.json). The sound should start a hair after
the picture (soundDelayMs, 20 ms), never before it. Prints one line per hit and exits 1 if any is early or
more than 50 ms late (the onset reading itself spreads by about 20 ms with each sound's attack).
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "src/timeline.json").read_text())
FPS = TL["fps"]
SR = 48000
# cue beats where the score lands a kick or an impact on the beat itself
HITS = ["looks", "looks8", "looks16", "grid", "export", "fix", "pack", "logo"]


def beat_frame(b):
    return round(TL["firstBeat"] + (b - 1) * TL["framesPerBeat"])


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def start_time(path, stream):
    """When a stream's first frame or sample is presented, so both clocks are read from the same zero."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", "stream=start_time",
         "-of", "csv=p=0", path],
        check=True, capture_output=True, text=True,
    ).stdout.strip().strip(",")
    return float(out) if out and out != "N/A" else 0.0


def onset(x, t, before=0.1, after=0.1):
    """Where the steepest rise in the 1 ms energy near t begins: the hit's attack, walked back to its start."""
    a, b = int((t - before) * SR), int((t + after) * SR)
    w = x[a:b]
    hop = SR // 1000
    e = np.sqrt(np.convolve(w * w, np.ones(hop) / hop, mode="same"))[::hop]
    rise = np.diff(e)
    peak = int(np.argmax(rise))
    k = peak
    while k > 0 and rise[k - 1] > 0.1 * rise[peak]:
        k -= 1
    return (a / SR) + k / 1000


def main(path):
    x = decode(path)
    v0, a0 = start_time(path, "v:0"), start_time(path, "a:0")
    worst = []
    for name in HITS:
        fr = beat_frame(TL["events"][name])
        pic = v0 + fr / FPS
        snd = a0 + onset(x, pic - a0)
        ms = (snd - pic) * 1000
        worst.append(ms)
        print(f"{name:10s} frame {fr:5d}  picture {pic:7.3f}s  sound {snd:7.3f}s  sound after picture {ms:+5.0f} ms")
    ok = all(0 <= m <= 50 for m in worst)
    print("ok: the sound follows the picture by a hair" if ok else "CHECK: a hit is early or late")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
