"""Measures each heartbeat's sound against the moment the picture puts it, in the files that ship.

    python3 scripts/sync.py out/*.mp4

The picture's heart is a continuous pulse that peaks at the exact lub time in
src/timeline.json, so the sound should start about 20 ms after it (soundDelayMs).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

TL = json.loads((Path(__file__).resolve().parent.parent / "src/timeline.json").read_text())
LUBS = [TL["heart"]["first"] + n * 60 / TL["heart"]["bpm"] for n in range(3)]
SR = 48000

worst = 0.0
for f in sys.argv[1:]:
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,start_time", "-of", "json", f], capture_output=True, text=True, check=True).stdout)
    starts = {s["codec_type"]: float(s.get("start_time", 0)) for s in info["streams"]}
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    env = np.abs(signal.hilbert(signal.sosfilt(signal.butter(4, 150, "low", fs=SR, output="sos"), x)))
    offs = []
    for lub in LUBS:
        a, b = int((lub - 0.2) * SR), int((lub + 0.15) * SR)
        seg = env[a:b]
        base = np.median(env[int((lub - 0.25) * SR):int((lub - 0.05) * SR)])
        on = a + int(np.argmax(seg > base + 0.25 * (seg.max() - base)))
        offs.append(1000 * (on / SR + starts.get("audio", 0) - starts.get("video", 0) - lub))
    worst = max(worst, max(abs(o - TL["soundDelayMs"]) for o in offs))
    print(f"{f}: sound after picture " + ", ".join(f"{o:+.0f} ms" for o in offs))
print(f"furthest from the intended {TL['soundDelayMs']} ms: {worst:.0f} ms")
sys.exit(1 if worst > 15 else 0)
