"""Print a clean Remotion render (the negative) to film, one frame at a time.

    npm run render:cine        # renders each size's frames, then prints them
    python3 scripts/print_film.py out/frames/Explainer-1080x1920 out/Explainer-1080x1920-cine.mp4
    python3 scripts/print_film.py out/frames/Explainer-1080x1920 --stills 8,64   # PNGs in out/stills
    python3 scripts/print_film.py ... --look paper   # for bright, paper-like grounds

The negative is a PNG sequence of the design alone (`remotion render <id>
<dir> --sequence --image-format=png`), at any size. This script adds the look
in the order light travels, and every step is something a real lens, film
stock, print or monitor does:

    1. Lens: the focus finding its subject, corner softness, lateral color,
       vignette, and a picture a touch softer than its grain.
    2. Stock: halation, exposure flicker locked to the beat, dirt on the
       negative, the fade at the end of the reel.
    3. Print: an S-curve with warm, lifted blacks, grain grown from a Boolean
       model of dye clouds, fresh every frame, and dirt on the print.
    4. Monitor: a soft electron beam with a 6 px line pitch, and the
       faceplate's faint glow.

Optics and the monitor work in linear light; the print curve and the grain work
in display tones, where their curves are defined. Every random choice is seeded
by the frame number, so a frame always prints the same, and every size of a
cut gets the same flicker.

Timing comes from src/timeline.json: flicker steps on the beat grid, and from
the `end` event the card is at rest, so the look settles and dust stops. The
sound is one file, --audio (default public/audio/score.wav, already 20 ms behind the
picture). The negative is picture only, so a composition's own audio tracks aren't in
it; a voiced piece passes its clean master's mix (scripts/render.mjs --audio master).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from functools import lru_cache
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Look:
    # From the timeline's `end` event, each look value eases from its first
    # number to its second (its resting value) over `calm_frames`, and dust stops.
    calm_frames: int = 30
    # The lens finds focus on the first frames: blur in px, over n frames.
    open_blur: float = 2.2
    open_frames: int = 7
    corner: tuple[float, float] = (1.6, 0.4)  # px of softness at the corners
    lateral: tuple[float, float] = (0.0010, 0.0003)  # red up, blue down
    vignette: tuple[float, float] = (0.20, 0.09)
    halation: tuple[float, float] = (0.075, 0.075)
    flicker: tuple[float, float] = (0.014, 0.007)
    dust_rate: float = 1 / 7  # frames with a speck, before the end card
    dust_pale: float = 0.8  # share of specks that are dirt on the negative
    dust_avoid: str = "bright"  # keep specks off the type: it's bright or dark
    hairs: int = 2
    # Grain strength against the tone curve below, and the share of it that is
    # color. On a dark ground a print shows grain mostly in the glows and
    # mid-tones; boiling blacks read as video noise, not film.
    grain: float = 1.0
    mottle: float = 0.16
    curve: float = 0.10  # S-curve blend
    lift: tuple[float, float, float] = (0.018, 0.0155, 0.012)
    cap: float = 0.985
    monitor: bool = False
    fade_frames: int = 6  # down to black at the end of the reel
    crf: int = 15  # x264 with grain tuning: fine grain needs the bits


LOOKS = {
    # Type on a dark ground, shown on a broadcast monitor. Grain stays quiet on
    # dark grounds: boiling blacks read as video noise on a phone, not film.
    "dark": Look(grain=0.4, mottle=0.08, monitor=True),
    # Bright paper under a rostrum camera, printed to 35 mm, on the same monitor.
    "paper": Look(
        open_blur=2.6,
        corner=(1.8, 0.4),
        lateral=(0.0016, 0.0006),
        vignette=(0.18, 0.10),
        halation=(0.05, 0.035),
        dust_rate=1 / 5,
        dust_pale=0.35,
        dust_avoid="dark",
        hairs=3,
        grain=0.65,
        mottle=0.12,
        curve=0.08,
        lift=(0.012, 0.010, 0.008),
        cap=0.99,
        monitor=True,
        crf=17,  # bright paper is all grain; this keeps the master near 70 Mbps
    ),
}
SEED = 1
TIMELINE = json.loads((ROOT / "src/timeline.json").read_text())


# ------------------------------------------------------------------ helpers

def to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_display(c: np.ndarray) -> np.ndarray:
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def luma(img: np.ndarray) -> np.ndarray:
    return img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def smoothstep(e0: float, e1: float, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def blur(img: np.ndarray, sigma: float) -> np.ndarray:
    """Gaussian blur of an (H, W) or (H, W, 3) image. Wide blurs run at half size."""
    if sigma <= 0.05:
        return img
    axes = (sigma, sigma) + ((0,) if img.ndim == 3 else ())
    if sigma < 6:
        return ndimage.gaussian_filter(img, axes, mode="nearest")
    small = img[::2, ::2] if img.ndim == 2 else img[::2, ::2, :]
    small = ndimage.gaussian_filter(small, (sigma / 2, sigma / 2) + axes[2:], mode="nearest")
    zoom = (2, 2) + ((1,) if img.ndim == 3 else ())
    return ndimage.zoom(small, zoom, order=1, mode="nearest", grid_mode=True)[: img.shape[0], : img.shape[1]]


def disc_blur(img: np.ndarray, radius: float) -> np.ndarray:
    """Defocus through a round aperture, rather than a Gaussian."""
    if radius < 0.25:
        return img
    r = int(np.ceil(radius)) + 1
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    k = np.clip(radius + 0.5 - np.hypot(x, y), 0, 1).astype(np.float32)
    k /= k.sum()
    return np.stack([ndimage.convolve(img[..., c], k, mode="nearest") for c in range(3)], axis=-1)


def scale_about_centre(chan: np.ndarray, s: float) -> np.ndarray:
    if abs(s - 1) < 1e-6:
        return chan
    H, W = chan.shape
    c = np.array([(H - 1) / 2, (W - 1) / 2])
    return ndimage.affine_transform(chan, [1 / s, 1 / s], offset=c - c / s, order=1, mode="nearest")


@lru_cache(maxsize=None)
def geometry(H: int, W: int) -> tuple[np.ndarray, np.ndarray]:
    """Each pixel's row, and its distance from the center (1 at the corners)."""
    YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
    return YY, np.hypot(XX - (W - 1) / 2, YY - (H - 1) / 2) / np.hypot(W / 2, H / 2)


# ------------------------------------------------------------------ grain

# Dye clouds: three sizes in px, by share of clouds.
CLOUDS = ((0.46, 0.50), (0.71, 0.33), (1.09, 0.17))
SUPER = 3  # clouds land on a grid three times finer than the frame
COVERAGE = 0.5
# Grain strength (display units) by tone, 0 = black: dense everywhere, set by a
# tone curve the way AV1's film-grain synthesis does.
TONE = np.array([0, 0.06, 0.2, 0.45, 0.7, 0.9, 1.0])
SIGMA = np.array([0.008, 0.0105, 0.021, 0.029, 0.025, 0.016, 0.012])

_OFFSETS = []
for _r, _ in CLOUDS:
    R = _r * SUPER
    n = int(np.ceil(R))
    _OFFSETS.append([(dy, dx) for dy in range(-n, n + 1) for dx in range(-n, n + 1) if dy * dy + dx * dx <= R * R])


def boolean_grain(rng: np.random.Generator, H: int, W: int) -> np.ndarray:
    """Zero-mean, unit-variance grain from the Boolean model (Newson et al. 2017)."""
    h, w = H * SUPER, W * SUPER
    mean_area = sum(share * len(offs) for (_, share), offs in zip(CLOUDS, _OFFSETS))
    total = -np.log(1 - COVERAGE) / mean_area * h * w
    field = np.zeros(h * w, dtype=bool)
    for (_, share), offs in zip(CLOUDS, _OFFSETS):
        count = rng.poisson(total * share)
        ys = rng.integers(0, h, count)
        xs = rng.integers(0, w, count)
        for dy, dx in offs:
            field[((ys + dy) % h) * w + (xs + dx) % w] = True
    g = field.reshape(H, SUPER, W, SUPER).mean(axis=(1, 3), dtype=np.float32)
    g = ndimage.gaussian_filter(g, 0.58)  # the optical print
    return (g - g.mean()) / g.std()


def mottle(rng: np.random.Generator, H: int, W: int) -> np.ndarray:
    n = rng.standard_normal((H, W, 3), dtype=np.float32)
    n = ndimage.gaussian_filter(n, (0.9, 0.9, 0))
    return n / n.std()


# ------------------------------------------------------------------ dust

def speck(rng: np.random.Generator) -> np.ndarray:
    """A small irregular fleck: a few overlapping soft ellipses."""
    size = 15
    y, x = np.mgrid[-size:size + 1, -size:size + 1].astype(np.float32)
    out = np.zeros_like(x)
    for _ in range(rng.integers(1, 4)):
        cx, cy = rng.normal(0, 1.4, 2)
        rx, ry = rng.uniform(0.8, 3.2), rng.uniform(0.7, 2.2)
        a = rng.uniform(0, np.pi)
        u = (x - cx) * np.cos(a) + (y - cy) * np.sin(a)
        v = -(x - cx) * np.sin(a) + (y - cy) * np.cos(a)
        out = np.maximum(out, np.clip(1.5 - np.hypot(u / rx, v / ry), 0, 1))
    return ndimage.gaussian_filter(out, 0.5)


def hair(rng: np.random.Generator) -> np.ndarray:
    size = 70
    canvas = np.zeros((2 * size + 1, 2 * size + 1), np.float32)
    t = np.linspace(0, 1, 400)
    ang = rng.uniform(0, 2 * np.pi)
    bend = rng.uniform(-2.5, 2.5)
    length = rng.uniform(70, 120)
    theta = ang + bend * (t - 0.5) + 0.6 * np.sin(t * rng.uniform(4, 9))
    dx = np.cumsum(np.cos(theta)) * length / len(t)
    dy = np.cumsum(np.sin(theta)) * length / len(t)
    xs = np.clip((size + dx - dx.mean()).astype(int), 0, 2 * size)
    ys = np.clip((size + dy - dy.mean()).astype(int), 0, 2 * size)
    canvas[ys, xs] = 1
    return np.clip(ndimage.gaussian_filter(canvas, 0.7) * 2.2, 0, 1) * 0.6


def place(layer: np.ndarray, mark: np.ndarray, y: int, x: int, amount: float) -> None:
    h, w = mark.shape
    H, W = layer.shape
    y0, x0 = y - h // 2, x - w // 2
    ys, xs = slice(max(0, y0), min(H, y0 + h)), slice(max(0, x0), min(W, x0 + w))
    my, mx = slice(ys.start - y0, ys.stop - y0), slice(xs.start - x0, xs.stop - x0)
    layer[ys, xs] = np.maximum(layer[ys, xs], mark[my, mx] * amount)


def dirt(look: Look, frame: int, calm_at: int, negative_luma: np.ndarray, seed: int):
    """Pale dirt (on the negative, it blocks light) and dark dirt (on the print)."""
    H, W = negative_luma.shape
    pale = np.zeros((H, W), np.float32)
    dark = np.zeros((H, W), np.float32)
    if frame >= calm_at:
        return pale, dark
    rng = np.random.default_rng([seed, 7, frame])
    film = np.random.default_rng([seed, 11])
    # A few hairs in the whole film, one in each stretch of it.
    edges = np.linspace(4, calm_at - 4, look.hairs + 1).astype(int)
    hair_frames = {int(film.integers(a, b)) for a, b in zip(edges, edges[1:])}
    marks = []
    if rng.random() < look.dust_rate:
        marks += [speck(rng) for _ in range(1 if rng.random() < 0.8 else 2)]
    if frame in hair_frames:
        marks.append(hair(rng))
    for m in marks:
        for _ in range(40):  # find a spot clear of the type
            y, x = int(rng.uniform(60, H - 60)), int(rng.uniform(60, W - 60))
            win = negative_luma[max(0, y - 40) : y + 40, max(0, x - 40) : x + 40]
            if look.dust_avoid == "bright" and win.max() < 0.35:
                break
            if look.dust_avoid == "dark" and win.min() > 0.3:
                break
        else:
            continue
        target = pale if rng.random() < look.dust_pale else dark
        place(target, m, y, x, rng.uniform(0.5, 0.8))
    return pale, dark


# ------------------------------------------------------------------ timing

def end_frame() -> int:
    """The frame of the `end` event (the card at rest), rounded like timeline.ts."""
    tl = TIMELINE
    beat = tl["events"].get("end")
    if beat is None:
        return tl["durationInFrames"]
    return int(np.floor(tl["firstBeat"] + (beat - 1) * tl["framesPerBeat"] + 0.5))


@lru_cache(maxsize=None)
def beat_steps(fps_beat: int, first: int, total: int) -> np.ndarray:
    """The frame each flicker step starts on: every gap between beats split
    into steps of about 2.5 frames, so a change lands on every beat."""
    beats = [0] + list(range(first, total + fps_beat, fps_beat))
    beats = sorted(set(b for b in beats if b <= total) | {total})
    starts = np.zeros(total, int)
    for a, b in zip(beats, beats[1:]):
        n = max(1, int(np.floor((b - a) / 2.5 + 0.5)))
        edges = [a + int(np.floor(k * (b - a) / n + 0.5)) for k in range(n + 1)]
        for e0, e1 in zip(edges, edges[1:]):
            starts[e0:e1] = e0
    return starts


# ------------------------------------------------------------------ the print

def print_frame(args) -> np.ndarray:
    look, frame, path = args
    tl = TIMELINE
    total = tl["durationInFrames"]
    calm_at = end_frame()
    calm = float(smoothstep(calm_at, calm_at + look.calm_frames, frame))
    lerp = lambda pair: pair[0] + (pair[1] - pair[0]) * calm  # noqa: E731
    seed = SEED

    neg = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255
    H, W = neg.shape[:2]
    YY, RADIUS = geometry(H, W)
    neg_luma = luma(neg)
    img = to_linear(neg)

    # 1. Lens. The focus finds its subject on the first frames, and the lens
    # breathes as it does: a touch large, settling with the focus.
    if frame < look.open_frames:
        p = (1 - frame / look.open_frames) ** 2
        img = disc_blur(img, look.open_blur * p)
        img = np.stack([scale_about_centre(img[..., c], 1 + 0.012 * p) for c in range(3)], axis=-1)
    # Glass is softest at its edge.
    soft = blur(img, lerp(look.corner))
    w = np.clip(RADIUS, 0, 1)[..., None] ** 2
    img = img * (1 - w) + soft * w
    # Glass bends red and blue differently.
    s = lerp(look.lateral)
    img = np.stack([scale_about_centre(img[..., 0], 1 + s), img[..., 1], scale_about_centre(img[..., 2], 1 - s)], axis=-1)
    # Light falls off toward the corners of the frame.
    img *= (1 - lerp(look.vignette) * np.clip(RADIUS, 0, 1) ** 2.5)[..., None]
    # The picture sits 0.4 px softer than its grain.
    img = blur(img, 0.4)

    # 2. Stock. Halation: bright light passes the emulsion, bounces off the
    # film base and re-exposes it from behind, red layer deepest.
    y = luma(img)
    bright = smoothstep(0.32, 0.48, y)
    source = y * bright
    halo = np.stack(
        [tint * (0.55 * blur(source, 3 * k) + 0.45 * blur(source, 11 * k))
         for tint, k in ((1.0, 1.4), (0.36, 1.0), (0.13, 0.7))],
        axis=-1,
    )
    img += lerp(look.halation) * halo * (1 - 0.85 * bright)[..., None]
    # Exposure flicker, stepped on the beat grid.
    step = beat_steps(tl["framesPerBeat"], tl["firstBeat"], total)[min(frame, total - 1)]
    r = np.random.default_rng([seed, 3, step]).random()
    wobble = 0.55 * np.sin(step * 0.57) + 0.45 * np.sin(step * 1.31 + 1.1) + (r - 0.5)
    img *= 1 + lerp(look.flicker) * wobble / 1.2
    pale, dark = dirt(look, frame, calm_at, neg_luma, seed)
    img += pale[..., None] * np.array([0.42, 0.40, 0.36], np.float32)
    # The end of the reel.
    start = total - look.fade_frames
    if frame >= start:
        img *= (1 - (frame - start + 1) / look.fade_frames) ** 1.5

    # 3. Print. A gentle S-curve, warm blacks that never reach zero.
    d = np.clip(to_display(img), 0, 1)
    d = d * (1 - look.curve) + smoothstep(0, 1, d) * look.curve
    lift = np.array(look.lift, np.float32)
    d = lift + d * (look.cap - lift)
    d *= 1 - 0.8 * dark[..., None]
    # Grain, dense everywhere, mostly monochrome, with a faint color mottle
    # that fades out in the blacks.
    rng = np.random.default_rng([seed, 5, frame])
    tone = luma(d)
    sigma = np.interp(tone, TONE, SIGMA).astype(np.float32)[..., None]
    sigma *= look.grain
    d = d + sigma * boolean_grain(rng, H, W)[..., None] + look.mottle * sigma * smoothstep(0.0, 0.2, tone)[..., None] * mottle(rng, H, W)

    # 4. Monitor. A soft beam rather than stripes: each line is a sine, and a
    # bright beam widens to fill its gap. Then the faceplate's faint glow.
    if look.monitor:
        lin = to_linear(np.clip(d, 0, 1))
        b = np.clip(luma(lin), 0, 1)
        depth = 0.15 * (1 - 0.55 * np.sqrt(b))
        beam = 0.5 + 0.5 * np.cos(2 * np.pi * (YY + 0.5) / 6)
        lin *= ((1 - depth * beam) / (1 - 0.5 * depth))[..., None]
        lin += 0.02 * blur(lin, 28) * np.array([1.0, 0.97, 0.9], np.float32)
        d = to_display(lin)

    return np.clip(d * 255 + 0.5, 0, 255).astype(np.uint8)


# ------------------------------------------------------------------ main

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("negative", help="folder of PNG frames from `remotion render --sequence`")
    ap.add_argument("out", nargs="?", help="the film to write, e.g. out/Explainer-1080x1920-cine.mp4")
    ap.add_argument("--look", choices=sorted(LOOKS), default="dark")
    ap.add_argument("--audio", default="public/audio/score.wav")
    ap.add_argument("--stills", help="comma-separated frames to print as PNGs instead of a film")
    ap.add_argument("--workers", type=int, default=min(os.cpu_count() or 4, 8))
    a = ap.parse_args()
    look = LOOKS[a.look]

    negative = ROOT / a.negative
    frames = sorted(negative.glob("*.png"))
    if not frames:
        sys.exit(f"No PNG frames in {a.negative}. Render them first (see README).")
    jobs = [(look, i, str(p)) for i, p in enumerate(frames)]

    if a.stills:
        wanted = [int(f) for f in a.stills.split(",")]
        outdir = ROOT / "out" / "stills" / f"{negative.name}-cine"
        outdir.mkdir(parents=True, exist_ok=True)
        with Pool(a.workers) as pool:
            for f, img in zip(wanted, pool.imap(print_frame, [jobs[f] for f in wanted])):
                Image.fromarray(img).save(outdir / f"f{f:03d}.png")
                print(f"printed frame {f} to {(outdir / f'f{f:03d}.png').relative_to(ROOT)}")
        return
    if not a.out:
        sys.exit("Name the film to write, or pass --stills.")

    tl = TIMELINE
    out = ROOT / a.out
    out.parent.mkdir(parents=True, exist_ok=True)
    seconds = tl["durationInFrames"] / tl["fps"]
    W, H = Image.open(frames[0]).size
    audio = ROOT / a.audio
    sound = (["-i", str(audio), "-filter:a", f"atrim=0:{seconds}", "-c:a", "aac", "-b:a", "320k"]
             if audio.exists() else [])
    ffmpeg = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(tl["fps"]), "-i", "-",
         *sound[:2],
         "-filter:v", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
         *sound[2:],
         "-c:v", "libx264", "-preset", "slow", "-tune", "grain", "-crf", str(look.crf),
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
         "-t", f"{seconds}", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE,
    )
    with Pool(a.workers) as pool:
        for i, img in enumerate(pool.imap(print_frame, jobs)):
            ffmpeg.stdin.write(img.tobytes())
            if i % 15 == 0:
                print(f"printed frame {i}/{len(jobs)}", flush=True)
    ffmpeg.stdin.close()
    if ffmpeg.wait():
        sys.exit("ffmpeg failed")
    print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
