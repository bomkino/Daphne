"""Looks at every frame of the films that ship for anything bright touching the frame's edge.

    python3 scripts/edges.py out/*-post.mp4

A falling leaf may leave through the bottom, as the brand's one exit, but not in
the last second, which holds still; nothing else bright may touch an edge. Prints
each film's brightest edge pixel per side, and the frames where something crosses
the threshold.
"""
import json
import subprocess
import sys

import numpy as np

THRESHOLD = 0.42  # luma, 0-1: the night ground is about 0.08, a leaf in focus about 0.75
BAND = 3  # px
HOLD = 24  # frames: the last second

bad = 0
for f in sys.argv[1:]:
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", f], capture_output=True, text=True, check=True).stdout)
    w, h = info["streams"][0]["width"], info["streams"][0]["height"]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w) / 255.0
    sides = {"top": frames[:, :BAND, :], "left": frames[:, :, :BAND], "right": frames[:, :, -BAND:], "bottom": frames[:, -BAND:, :]}
    worst = {k: float(v.max()) for k, v in sides.items()}
    hits = {k: [int(i) for i in np.where(v.reshape(len(frames), -1).max(axis=1) > THRESHOLD)[0]] for k, v in sides.items()}
    flagged = {k: (v if k != "bottom" else [i for i in v if i >= len(frames) - HOLD]) for k, v in hits.items()}
    flagged = {k: v for k, v in flagged.items() if v}
    bad += len(flagged)
    print(f"{f}: brightest at each edge " + ", ".join(f"{k} {v:.2f}" for k, v in worst.items())
          + (f"; over {THRESHOLD} at frames {flagged}" if flagged else "; clear")
          + (f" (a leaf leaves by the bottom at frames {hits['bottom'][0]}-{hits['bottom'][-1]})" if hits["bottom"] else ""))
sys.exit(1 if bad else 0)
