#!/usr/bin/env bash
# Renders Chrome Web Store assets into store/ using headless Chrome.
#   store/screenshots/*.png             1280x800
#   store/promo/small-tile-440x280.png  440x280
#   store/promo/marquee-1400x560.png    1400x560
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

mkdir -p store/screenshots store/promo
shoot 1 1280 800 store/screenshots/1-log-wins.png
shoot 2 1280 800 store/screenshots/2-search.png
shoot 3 1280 800 store/screenshots/3-export-reports.png
shoot 4 1280 800 store/screenshots/4-dark-mode.png
shoot 5 1280 800 store/screenshots/5-private.png
shoot tile 440 280 store/promo/small-tile-440x280.png
shoot marquee 1400 560 store/promo/marquee-1400x560.png
echo "store assets rendered"
