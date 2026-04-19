# NEUPC Browser Extension

A Chrome/Firefox browser extension that automatically syncs your competitive programming submissions from **41+ platforms** to your NEUPC account.

---

## Features

- Auto-detects and extracts submissions when you visit a submission page
- Supports 41+ competitive programming platforms
- Captures verdict, language, execution time, memory, and source code
- Bulk import past submissions via the popup
- Works with both local development and production (neupc.vercel.app)
- Retry logic for failed syncs, with local caching to prevent duplicates

---

## Supported Platforms

| Group | Platforms |
|-------|-----------|
| **Core** | Codeforces, AtCoder, LeetCode, Toph, CSES, CodeChef, TopCoder, HackerRank, Kattis, LightOJ, UVA, SPOJ, VJudge, CS Academy, E-Olymp, USACO, DMOJ |
| **Global** | HackerEarth, Google Code Jam, Facebook Hacker Cup, Beecrowd, BAPSOJ, DimiKOJ, LOJ, COJ, Timus, ACMP |
| **Regional** | Codewars, Exercism, Project Euler, LeetCode CN, Luogu, ACWing, POJ, HDU, ZOJ, BZOJ, 51NOD, AIZU, Yosupo Judge |

---

## Installation

### Chrome / Edge

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `browser-extension/manifest.json`

---

## Setup

1. Install the extension (see above)
2. Click the extension icon in your browser toolbar
3. Enter your **NEUPC API token** (found in your NEUPC account settings)
4. Set the **API URL**:
   - Local dev: `http://localhost:3000`
   - Production: `https://neupc.vercel.app`
5. Click **Save**

---

## How It Works

```
User visits submission page
        ↓
Content script detects page type
        ↓
Platform extractor scrapes submission data from DOM
        ↓
Data validated & normalized
        ↓
Cached locally (prevents duplicate syncs)
        ↓
Sent to NEUPC backend API
        ↓
Appears in your NEUPC problem-solving dashboard
```

---

## Project Structure

```
browser-extension/
├── manifest.json               # Extension manifest (MV3)
├── background.js               # Service worker — handles API calls & alarms
├── popup.html / popup.js       # Extension popup UI
├── bulk-import-ui.html         # Bulk import page
├── bulk-import-logic.js        # Bulk import controller
├── bulk-history-collector.js   # Fetches submission history per platform
├── content.js                  # Generic content script entry
├── common/
│   ├── api.js                  # NEUPC backend communication
│   ├── storage.js              # Chrome storage wrappers & settings
│   ├── utils.js                # DOM helpers, date parsing, normalization
│   └── constants.js            # Shared constants
├── content-scripts/
│   ├── _base.js                # Base extractor class (all platforms extend this)
│   ├── group1/                 # Core platforms (17)
│   ├── group2/                 # Global/regional platforms (8)
│   ├── group3/                 # Competition platforms (6)
│   └── group4/                 # Classic/archive platforms (11)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Adding a New Platform

1. Create a file in the appropriate group folder:
   ```
   content-scripts/group1/neupc-myplatform.js
   ```

2. Extend `BaseExtractor`:
   ```javascript
   import { BaseExtractor, autoInit } from '../_base.js';

   class MyPlatformExtractor extends BaseExtractor {
     getPlatformId() { return 'myplatform'; }

     detectPageType() {
       if (location.pathname.includes('/submission/')) return 'submission';
       return 'unknown';
     }

     async extractSubmission() {
       return {
         submissionId: '...',
         problemId: '...',
         problemName: '...',
         verdict: 'AC',
         language: 'C++',
         submittedAt: new Date().toISOString(),
       };
     }
   }

   autoInit(MyPlatformExtractor);
   ```

3. Add URL patterns to `manifest.json` under `content_scripts`.

---

## Data Collected

| Field | Description |
|-------|-------------|
| `platform` | Platform identifier (e.g. `codeforces`) |
| `submissionId` | Unique submission ID on the platform |
| `problemId` | Problem identifier |
| `problemName` | Problem title |
| `verdict` | `AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`, etc. |
| `language` | Programming language used |
| `executionTime` | Runtime in milliseconds |
| `memoryUsed` | Memory in KB |
| `submittedAt` | Submission timestamp (ISO 8601) |
| `sourceCode` | Solution source code (optional) |

---

## Extension Settings

Stored in `chrome.storage.sync`:

| Key | Default | Description |
|-----|---------|-------------|
| `apiUrl` | `http://localhost:3000` | NEUPC backend URL |
| `autoSync` | `true` | Auto-sync on page load |
| `syncEnabled` | `true` | Enable/disable syncing |
| `captureSourceCode` | `true` | Capture source code |
| `showNotifications` | `true` | Show sync notifications |
| `batchSize` | `50` | Max submissions per batch request |
| `retryAttempts` | `3` | Retry count for failed requests |

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 109+ | Full (Manifest V3) |
| Edge 109+ | Full (Manifest V3) |
| Firefox 109+ | Supported (`gecko` settings included) |
| Safari | Not supported |

---

## Packaging for Release

```bash
cd browser-extension
zip -r neupc-extension.zip . \
  --exclude "*.git*" \
  --exclude "node_modules/*" \
  --exclude "*.md"
```
