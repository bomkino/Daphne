"""Fetches the orchestra the score is played on: a few instruments from VS Chamber
Orchestra: Community Edition (Versilian Studios / Sam Gossner, and Ivy Audio /
Simon Dalzell for the upright piano), CC0 1.0. They land in vendor/vsco/, which
git ignores; the score's render (public/audio) is what the repo keeps.

    npm run samples        (git and network; about 150 MB)
"""
import os, subprocess, sys

REPO = "https://github.com/sgossner/VSCO-2-CE"
COMMIT = "440300901dfe9275fd84e0b7763af1f8443ae62e"  # pinned, so the score always plays the same samples
PATHS = [
    "Keys/Upright Piano",
    "Strings/Cello Section/susvib",
    "Strings/Cello Section/spic",
    "Strings/Cello Section/trem",
    "Strings/Viola Section/susvib",
    "Strings/Viola Section/trem",
    "Strings/Violin Section/susVib",
    "Strings/Violin Section/Trem",
    "Strings/Solo Violin/Arco Vib",
    "Strings/Solo Contrabass/SusNV",
    "Strings/Harp",
    "Brass/F Horn/sus",
    "Woodwinds/Flute/susNV",
    "Percussion/Timpani",
    "Percussion/Glock",
    "LICENSE",
    "Readme.txt",
]

here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(here, "..", "..", "vendor", "vsco")

def git(*args, cwd=None):
    subprocess.run(["git", *args], cwd=cwd, check=True)

if not os.path.isdir(os.path.join(dest, ".git")):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    git("clone", "--filter=blob:none", "--no-checkout", "--quiet", REPO, dest)
git("sparse-checkout", "init", "--no-cone", cwd=dest)
git("sparse-checkout", "set", "--no-cone", *[f"/{p}" if p in ("LICENSE", "Readme.txt") else f"/{p}/" for p in PATHS], cwd=dest)
git("checkout", "--quiet", COMMIT, cwd=dest)
n = sum(len(f) for _, _, f in os.walk(dest) if ".git" not in _)
print(f"vendor/vsco at {COMMIT[:8]}: {n} files")
