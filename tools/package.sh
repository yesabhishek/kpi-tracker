#!/usr/bin/env bash
# Builds store/package/kpi-tracker-<version>.zip containing only the files the extension needs.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')"
mkdir -p store/package
rm -f store/package/*.zip
OUT="store/package/kpi-tracker-$VERSION.zip"
zip -q -X "$OUT" manifest.json popup.html popup.css popup.js icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png libs/jspdf.umd.min.js
echo "$OUT"
