"""Looks at every frame of a shipped file for anything bright touching the frame's edge: a card, a word or a
leaf cut by the border instead of fading before it.

    python3 scripts/check_edges.py out/Explainer-1080x1920.mp4

Reads a 4 px band around each frame (at half size) and prints the frames whose band holds pixels brighter than
the grove ever is. Exits 1 if it finds any.
"""

import json
import subprocess
import sys

import numpy as np

LIMIT = 70  # luma 0-255; the grove's edge sits near 15-30 and a dimmed card fades to it


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "json", path], check=True, capture_output=True, text=True).stdout
    s = json.loads(out)["streams"][0]
    return s["width"], s["height"]


def main(path):
    w, h = probe(path)
    w2, h2 = w // 2, h // 2
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w2}:{h2}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE)
    size = w2 * h2
    bad, n, peak = [], 0, 0
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        a = np.frombuffer(buf, dtype=np.uint8).reshape(h2, w2)
        band = np.concatenate([a[:2].ravel(), a[-2:].ravel(), a[:, :2].ravel(), a[:, -2:].ravel()])
        m = int(band.max())
        peak = max(peak, m)
        if m > LIMIT:
            bad.append((n, m))
        n += 1
    proc.wait()
    print(f"{path}: {n} frames, brightest edge pixel {peak}")
    if bad:
        runs, start, prev = [], bad[0][0], bad[0][0]
        for f, _ in bad[1:]:
            if f != prev + 1:
                runs.append((start, prev))
                start = f
            prev = f
        runs.append((start, prev))
        print("bright at the edge in frames:", ", ".join(f"{a}-{b}" if a != b else f"{a}" for a, b in runs))
        return 1
    print("ok: nothing bright touches an edge")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
