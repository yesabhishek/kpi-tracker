# Chrome Web Store: everything to upload

Copy-paste values for each tab of the Developer Dashboard, in the order to do them.

```
store/
├── LISTING.md                         ← this file
├── package/kpi-tracker-2.0.0.zip      ← Package tab
├── icon/store-icon-128.png            ← Store listing → Store icon
├── screenshots/                       ← Store listing → Screenshots (upload in order 1→5)
│   ├── 1-log-wins.png                 1280×800
│   ├── 2-search.png                   1280×800
│   ├── 3-export-reports.png           1280×800
│   ├── 4-dark-mode.png                1280×800
│   └── 5-private.png                  1280×800
└── promo/
    ├── small-tile-440x280.png         ← Store listing → Small promo tile
    └── marquee-1400x560.png           ← Store listing → Marquee promo tile
```

---

## 1. Package tab (do this first)

**Upload new package** → `store/package/kpi-tracker-2.0.0.zip`

The title and summary on the Store listing tab come from the package, so they only update after this upload.

| Field | Value (from `manifest.json`) |
| --- | --- |
| Title from package | KPI Tracker |
| Summary from package | Log your daily wins in seconds and turn them into clean reports for reviews, 1:1s and promotions. Private, offline, no account. |
| Version | 2.0.0 |

The update adds no new permissions (still only `storage`), so existing users get it silently with no re-approval prompt.

---

## 2. Store listing tab

### Description

```
Log your daily wins in seconds, and walk into every performance review, 1:1 or promotion conversation with proof of your impact.

KPI Tracker lives in your toolbar. Press Alt+Shift+K, type what you shipped, fixed, learned or led, press Enter. That's it. When review season comes, export a clean report of everything you did — no more trying to remember what happened in March.

WHY PEOPLE USE IT
• Self-reviews and promotion packets — never forget a win again
• Weekly updates and 1:1s — copy a week of wins straight into Slack or a doc
• Brag documents and career journals
• Building a daily habit of noticing progress

FEATURES
• Log in seconds — type, press Enter, done
• Tags: Work, Leadership, Learning, Personal, Health, Other
• Edit any entry inline, change its tag, and undo deletes
• Stats at a glance — wins this week, current streak, all-time total
• Search your entire history with highlighted results and category filters
• Browse any day with arrows or the date picker
• Export a day, week, month, quarter, year or all time
• PDF reports grouped by category — ready to attach to a review
• CSV for Excel and Google Sheets, Markdown for docs and wikis
• One-click "Copy as Markdown" for Slack, email and review forms
• Light and dark themes (or follow your system)
• Keyboard-first: Alt+Shift+K to open, / to search, ← → to change day, T for today
• Backup to a file and restore on any computer

PRIVATE BY DESIGN
• No account, no sign-up
• No servers, no analytics, no tracking — the extension makes zero network requests
• Everything is stored locally in your browser
• Works fully offline
• Open source: https://github.com/yesabhishek/kpi-tracker

WHAT'S NEW IN 2.0
• Brand-new calm, minimal design with dark mode
• Search, streaks, inline editing and undo
• Quarter and year reports, Markdown export and copy
• Backup and restore
• Keyboard shortcut to open (Alt+Shift+K)
• Fixed entries being saved under the wrong day in some time zones
• Faster and more secure
```

### Other fields

| Field | Value |
| --- | --- |
| Category | **Productivity → Workflow & Planning** (currently set to Developer Tools; change it) |
| Language | English |
| Store icon | `store/icon/store-icon-128.png` |
| Global promo video | leave empty |
| Screenshots | `store/screenshots/1-log-wins.png` … `5-private.png`, in order. Delete the old ones first. |
| Small promo tile | `store/promo/small-tile-440x280.png` |
| Marquee promo tile | `store/promo/marquee-1400x560.png` |
| Official URL | leave as none |
| Homepage URL | https://github.com/yesabhishek/kpi-tracker |
| Support URL | https://github.com/yesabhishek/kpi-tracker/issues |
| Mature content | No |

---

## 3. Privacy tab

**Single purpose description**

```
KPI Tracker lets users log their daily achievements and export them as reports (PDF, CSV or Markdown) for performance reviews and personal tracking.
```

**Permission justification: `storage`**

```
Used to save the user's logged achievements and display preferences locally on their device with chrome.storage.local. No data is transmitted anywhere.
```

**Are you using remote code?** No, I am not using remote code.
(Every script is bundled in the package, and the CSP blocks everything else.)

**Data usage: what user data do you collect?** Leave every box **unchecked**. The extension collects none of the listed data types; entries never leave the device.

**Certify all three disclosures** (tick each):
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**

```
https://github.com/yesabhishek/kpi-tracker/blob/main/PRIVACY_POLICY.md
```

---

## 4. Distribution tab

| Field | Value |
| --- | --- |
| Payments | Free of charge |
| Visibility | Public |
| Distribution | All regions |

---

## 5. Test instructions tab

```
No account or login is required. Click the toolbar icon (or press Alt+Shift+K), type an achievement and press Enter. Use the search icon to search entries, the ⋯ menu for theme and backup/restore, and Export for PDF, CSV or Markdown reports. All data is stored locally; the extension makes no network requests.
```

---

## 6. Submit

**Save draft** → **Submit for review**. Updates usually clear review in 1–3 business days.
