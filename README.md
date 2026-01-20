# KPI Tracker (Achievement Logger)

A minimalist Chrome extension to log your daily achievements and export them as professional PDF reports.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Daily Achievement Logging** — Quickly capture your wins and accomplishments
- **Category Organization** — Organize achievements by Work, Personal, Learning, Health, or Other
- **Date Navigation** — Browse achievements across different days
- **PDF Export** — Generate beautifully formatted PDF reports
- **Local Storage** — All data stays private on your device
- **Minimalist Design** — Clean, distraction-free interface

## Installation (Development)

1. Clone the repository:
   ```bash
   git clone https://github.com/yesabhishek/kpi-tracker.git
   cd kpi-tracker
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked** and select the `kpi-tracker` folder

5. The extension icon will appear in your browser toolbar

## Usage

1. Click the extension icon to open the popup
2. Enter your achievement in the text field
3. Select a category (Work, Personal, Learning, Health, Other)
4. Click **Add** or press Enter
5. Navigate between days using the arrow buttons
6. Click **Export PDF** to download a formatted report

## Project Structure

```
kpi-tracker/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Main popup interface
├── popup.css          # Styles
├── popup.js           # Application logic
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── libs/
    └── jspdf.umd.min.js   # PDF generation library
```

## Permissions

- **storage** — To save your achievements locally using Chrome's storage API

---

## Publishing to Chrome Web Store

Follow these steps to publish the extension to the [Chrome Web Store](https://chrome.google.com/webstore).

### Prerequisites

- A Google account
- One-time developer registration fee of $5 USD
- Extension icons in 128x128 px format
- Screenshots (1280x800 or 640x400 px recommended)
- A promotional tile image (440x280 px)

### Step 1: Register as a Developer

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay the one-time $5 registration fee
3. Complete your developer profile

### Step 2: Prepare Your Extension Package

1. Ensure your `manifest.json` is properly configured:
   - Version number is set correctly
   - Name and description are finalized
   - All required icons are present

2. Create a ZIP file of your extension:
   ```bash
   cd /path/to/kpi-tracker
   zip -r kpi-tracker.zip . -x "*.git*" -x "*.DS_Store" -x "README.md"
   ```

3. Prepare promotional assets:
   - **Icon**: 128x128 px PNG
   - **Screenshots**: At least 1 screenshot (1280x800 or 640x400 px)
   - **Promotional tile**: 440x280 px (optional but recommended)

### Step 3: Upload to Chrome Web Store

1. Navigate to [Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

2. Click **New Item**

3. Upload your ZIP file

4. Fill in the store listing details:
   - **Name**: KPI Tracker - Achievement Logger
   - **Summary**: Log your daily achievements and export them as PDF reports
   - **Description**: A detailed description of features and benefits
   - **Category**: Productivity
   - **Language**: English

5. Upload promotional assets:
   - Store icon (128x128)
   - At least 1 screenshot
   - Promotional images (optional)

6. Set **Visibility**:
   - **Public** — Available to everyone
   - **Unlisted** — Only accessible via direct link

7. Set distribution regions (or keep worldwide)

### Step 4: Privacy Practices

1. Fill in the **Privacy practices** section:
   - Data usage disclosures
   - Single purpose description
   - Permissions justification

2. For this extension:
   - **Storage permission**: Required to save achievements locally
   - No data is collected or transmitted externally
   - All data remains on the user's device

### Step 5: Submit for Review

1. Review all entered information

2. Click **Submit for Review**

3. Wait for Google's review (typically 1-3 business days)

4. You'll receive an email notification when approved

### Post-Publication

- **Updates**: Upload a new ZIP with an incremented version number
- **Analytics**: Monitor installs and uninstalls in the dashboard
- **User Reviews**: Respond to user feedback and reviews

---

## Troubleshooting

### Extension Not Loading
- Ensure all files are present in the directory
- Check for syntax errors in `manifest.json`
- Verify icon paths are correct

### PDF Export Issues
- Ensure `jspdf.umd.min.js` is present in the `libs` folder
- Check browser console for JavaScript errors

### Data Not Saving
- Verify the `storage` permission is in the manifest
- Check Chrome's storage quota limits

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation library
- Chrome Extensions documentation
