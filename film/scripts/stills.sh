#!/usr/bin/env bash
# Quick stills while building, tiled into one sheet:
#   scripts/stills.sh <name> <composition> <seconds...>  →  out/stills/<name>/*.jpg and out/stills/<name>.jpg
set -e
name=$1; comp=$2; shift 2
dir="out/stills/$name"
mkdir -p "$dir"
frames=$(python3 -c "import sys; print(','.join(str(round(float(s)*24)) for s in sys.argv[1:]))" "$@")
npx remotion render "$comp" "$dir" --sequence --frames="$frames" --image-format=jpeg --jpeg-quality=88 --log=error --concurrency=4 ${BROWSER_EXECUTABLE:+--browser-executable=$BROWSER_EXECUTABLE}
tall=$(python3 -c "import re,sys; m=re.search(r'(\d+)x(\d+)$', sys.argv[1]); print(1 if int(m[2])>int(m[1]) else 0)" "$comp")
cols=$([ "$tall" = 1 ] && echo 5 || echo 3)
ffmpeg -v error -y -pattern_type glob -i "$dir/*.jpeg" -vf "scale=$([ "$tall" = 1 ] && echo 360 || echo 640):-1,tile=${cols}x3:padding=4" -frames:v 1 "out/stills/$name.jpg"
echo "out/stills/$name.jpg"
