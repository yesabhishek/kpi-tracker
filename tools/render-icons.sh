#!/usr/bin/env bash
# Renders icons/icon{16,32,48,128}.png from tools/icon*.svg using headless Chrome + Pillow.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
mkdir -p store/icon
render() { # svg size out
  printf '<html><body style="margin:0;background:transparent"><img src="file://%s" width="%s" height="%s"></body></html>' "$PWD/$1" "$2" "$2" > "$TMP/i.html"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$2,$2" --screenshot="$3" "file://$TMP/i.html" >/dev/null 2>&1
}
render tools/icon.svg 1024 "$TMP/big.png"
render tools/icon-small.svg 1024 "$TMP/small.png"
python3 - "$TMP" <<'PY'
import sys
from PIL import Image
tmp = sys.argv[1]
big = Image.open(f"{tmp}/big.png").convert("RGBA")
small = Image.open(f"{tmp}/small.png").convert("RGBA")
for size, src in ((16, small), (32, small), (48, big), (128, big)):
    src.resize((size, size), Image.LANCZOS).save(f"icons/icon{size}.png", optimize=True)
big.resize((512, 512), Image.LANCZOS).save("store/icon/icon-512.png", optimize=True)
big.resize((128, 128), Image.LANCZOS).save("store/icon/store-icon-128.png", optimize=True)
PY
rm -rf "$TMP"
echo "icons rendered"
