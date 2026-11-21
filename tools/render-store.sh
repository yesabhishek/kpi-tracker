#!/usr/bin/env bash
# Renders Chrome Web Store assets into store/ using headless Chrome.
#   store/screenshot-{1..5}.png   1280x800
#   store/promo-small.png         440x280
#   store/promo-marquee.png       1400x560
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8765}"

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

shoot() { # shot width height out
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=4000 --window-size="$2,$3" --screenshot="$4" \
    "http://127.0.0.1:$PORT/tools/shots.html?shot=$1" >/dev/null 2>&1
}

mkdir -p store
for i in 1 2 3 4 5; do shoot "$i" 1280 800 "store/screenshot-$i.png"; done
shoot tile 440 280 store/promo-small.png
shoot marquee 1400 560 store/promo-marquee.png
echo "store assets rendered"
