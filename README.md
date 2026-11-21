# KPI Tracker

A calm, minimalist Chrome extension for logging your daily wins and turning them into review-ready reports.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-green) ![License](https://img.shields.io/badge/License-MIT-blue)

![KPI Tracker](store/screenshot-1.png)

## Features

- **Log in seconds**: type a win, press Enter. Tag it as Work, Leadership, Learning, Personal, Health or Other.
- **Edit inline**: click any entry to edit it, change its tag from the pill, and undo deletes.
- **Stats at a glance**: wins this week, your current streak, and your all-time total.
- **Search everything**: full-text search across your history with category filters. Click a result to jump to that day.
- **Reports**: export a day, week, month, quarter, year or all time as **PDF**, **CSV** or **Markdown**, or copy it as Markdown for docs, Slack and review forms.
- **Backup & restore**: download a JSON backup and restore it on any machine. Restores merge and never overwrite.
- **Light & dark**: follows your system theme, or you can pick one.
- **Keyboard-first**: `Alt+Shift+K` opens the popup, `/` opens search, `←`/`→` change day, `T` jumps to today, `N` focuses the input.
- **Private**: no account, no network requests, no analytics. Data lives in `chrome.storage.local`.

## Install (development)

1. Clone the repo: `git clone https://github.com/yesabhishek/kpi-tracker.git`
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `kpi-tracker` folder.

## Project structure

```
manifest.json         Extension config (MV3, strict CSP, storage permission only)
popup.html/.css/.js   The whole app. No framework, no build step
libs/jspdf.umd.min.js jsPDF 4.2.1, lazy-loaded only when exporting a PDF
icons/                Toolbar and store icons (16/32/48/128)
store/                Chrome Web Store screenshots, promo tiles, 512px icon
tools/                Scripts to render icons and store assets and package the zip
```

## Releasing

```bash
./tools/package.sh         # -> dist/kpi-tracker-<version>.zip (only runtime files)
./tools/render-icons.sh    # regenerate icons from tools/icon*.svg
./tools/render-store.sh    # regenerate store/ screenshots (needs Google Chrome)
```

Upload the zip in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) and use the images in `store/`:

| Asset | File | Size |
| --- | --- | --- |
| Screenshots | `store/screenshot-1.png` … `screenshot-5.png` | 1280×800 |
| Small promo tile | `store/promo-small.png` | 440×280 |
| Marquee promo tile | `store/promo-marquee.png` | 1400×560 |
| Store icon | `icons/icon128.png` | 128×128 |

**Privacy practices answers:** single purpose is "log personal achievements and export reports". The `storage` permission saves entries locally. No user data is collected or transmitted, and no remote code is used.

## Security notes

- Strict Content Security Policy: `script-src 'self'`, `connect-src 'none'`, `object-src 'none'`.
- All user text is rendered with `textContent`, never `innerHTML`.
- Backups are size-limited, schema-validated and sanitised before import.
- CSV exports neutralise spreadsheet formula injection.

## License

MIT
