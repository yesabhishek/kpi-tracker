#!/usr/bin/env bash
# Builds store/package/kpi-tracker-<version>.zip containing only the files the extension needs.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')"
# Chrome Web Store (MV3) rejects packages that reference remotely hosted code.
if grep -nE '["'"'"'`]https?://[^"'"'"'`]+\.(m?js)([?#][^"'"'"'`]*)?["'"'"'`]' popup.html popup.js libs/*.js; then
  echo "ERROR: remote script URL found in package files (MV3 remote-code policy)." >&2
  exit 1
fi
mkdir -p store/package
rm -f store/package/*.zip
OUT="store/package/kpi-tracker-$VERSION.zip"
zip -q -X "$OUT" manifest.json popup.html popup.css popup.js icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png libs/jspdf.umd.min.js
echo "$OUT"
