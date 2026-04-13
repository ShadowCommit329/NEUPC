# NEUPC Browser Extension - Architecture v2.0

## Overview

This browser extension automatically syncs competitive programming solutions from **41 platforms** to the NEUPC app. It uses a modular architecture with platform-specific extractors that inherit from a common base class.

## Directory Structure

```
browser-extension/
├── manifest.json              # Extension manifest (v3) with all 41 platforms
├── background.js              # Service worker
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup controller
├── common/                    # Shared utilities
│   ├── utils.js              # DOM helpers, parsing, normalization
│   ├── api.js                # Backend communication layer
│   └── storage.js            # Chrome storage helpers
├── content-scripts/           # Platform extractors
│   ├── _base.js              # Base extractor class (all platforms inherit this)
│   ├── group1/               # Core platforms (17)
│   │   ├── codeforces.js
│   │   ├── atcoder.js
│   │   ├── leetcode.js
│   │   ├── toph.js
│   │   ├── cses.js
│   │   ├── codechef.js
│   │   ├── topcoder.js
│   │   ├── hackerrank.js
│   │   ├── kattis.js
│   │   ├── lightoj.js
│   │   ├── uva.js
│   │   ├── spoj.js
│   │   ├── vjudge.js
│   │   ├── csacademy.js
│   │   ├── eolymp.js
│   │   ├── usaco.js
│   │   └── dmoj.js
│   ├── group2/               # Global platforms (5)
│   │   ├── hackerearth.js
│   │   ├── googlecodejam.js
│   │   ├── facebookhackercup.js
│   │   ├── geeksforgeeks.js
│   │   ├── codingame.js
│   │   └── beecrowd.js
│   ├── group3/               # Regional platforms (10)
│   │   ├── luogu.js
│   │   ├── nowcoder.js
│   │   ├── codedrills.js
│   │   ├── yandex.js
│   │   ├── nerc.js
│   │   ├── tlx.js
│   │   ├── yukicoder.js
│   │   ├── acmp.js
│   │   ├── timus.js
│   │   └── hsin.js
│   └── group4/               # Classic/Archive platforms (7)
│       ├── ioi.js
│       ├── algotester.js
│       ├── cphof.js
│       ├── opencup.js
│       ├── robocontest.js
│       ├── ucup.js
│       └── acmu.js
└── icons/                     # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Architecture

### Base Extractor Class (`content-scripts/_base.js`)

All platform extractors inherit from `BaseExtractor` which provides:

**Abstract Methods (must be implemented by child classes):**

- `getPlatformId()` - Returns platform identifier (e.g., 'codeforces')
- `detectPageType()` - Detects page type ('submission', 'submissions', 'status', 'problem', 'unknown')
- `extractSubmission()` - Extracts single submission from current page

**Optional Override Methods:**

- `extractSubmissions()` - Extract multiple submissions from status/submissions page
- `getUserHandle()` - Get user handle from page or settings
- `extractSourceCode()` - Extract source code from submission page
- `observeSubmissionSuccess()` - Watch for new submissions on problem pages

**Provided Functionality:**

- Auto-initialization and page detection
- Submission validation and normalization
- Backend communication with retry logic
- Caching and sync statistics
- Mutation observer setup for dynamic content

### Example Platform Extractor

```javascript
import { BaseExtractor, autoInit } from '../_base.js';
import { extractText, extractAttr, parseDate } from '../../common/utils.js';

class CodeforcesExtractor extends BaseExtractor {
  getPlatformId() {
    return 'codeforces';
  }

  detectPageType() {
    if (window.location.pathname.includes('/submission/')) {
      return 'submission';
    }
    if (
      window.location.pathname.includes('/my') ||
      window.location.pathname.includes('/status')
    ) {
      return 'submissions';
    }
    if (window.location.pathname.includes('/problem/')) {
      return 'problem';
    }
    return 'unknown';
  }

  async extractSubmission() {
    const submissionId =
      window.location.pathname.match(/\/submission\/(\d+)/)?.[1];
    if (!submissionId) return null;

    return {
      platform: this.platform,
      submissionId,
      problemId: extractText('.problem-statement .title'),
      verdict: extractText('.verdict'),
      language: extractText('.lang'),
      executionTime: parseInt(extractText('.time-consumed')),
      memoryUsed: parseInt(extractText('.memory-consumed')),
      submittedAt: parseDate(extractText('.submission-time')),
    };
  }

  async extractSourceCode() {
    return extractText('pre.prettyprint');
  }
}

// Auto-initialize when DOM loads
autoInit(CodeforcesExtractor);
```

## Common Utilities

### `common/utils.js`

- DOM querying with fallbacks
- Date/time parsing (absolute and relative)
- Verdict normalization (AC, WA, TLE, etc.)
- Language normalization
- Text sanitization
- Debouncing and throttling

### `common/api.js`

- Authenticated API requests to NEUPC backend
- Token management
- Request queue with retry logic
- Batch submission handling
- Handle syncing
- Authentication verification

### `common/storage.js`

- Chrome storage wrappers
- Settings management with defaults
- Submission caching (max 1000 per platform)
- Sync statistics tracking
- Last sync timestamp tracking
- Auto-sync configuration

## Data Flow

1. **User visits a submission page** on any supported platform
2. **Content script loads** and detects page type
3. **Extractor extracts** submission data from DOM
4. **Data is validated** and normalized
5. **Submission is cached** locally (prevents duplicates)
6. **Submission is sent** to NEUPC backend with retry logic
7. **Sync statistics updated** in storage
8. **User can view** progress in extension popup

## Configuration

Extension settings (stored in `chrome.storage.sync`):

```javascript
{
  apiUrl: 'http://localhost:3000',      // NEUPC backend URL
  autoSync: true,                        // Auto-sync on page load
  syncEnabled: true,                     // Sync feature enabled
  captureSourceCode: true,               // Capture source code
  showNotifications: true,               // Show sync notifications
  syncInterval: 300000,                  // 5 minutes
  batchSize: 50,                         // Max submissions per batch
  retryAttempts: 3                       // Retry failed requests
}
```

## Platform Groups

### Group 1: Core Platforms (17)

Codeforces, AtCoder, LeetCode, Toph, CSES, CodeChef, TopCoder, HackerRank, Kattis, LightOJ, UVA, SPOJ, VJudge, CF Gym, CS Academy, E-Olymp, USACO, DMOJ

### Group 2: Global Platforms (6)

HackerEarth, Google Code Jam, Facebook Hacker Cup, GeeksforGeeks, CodinGame, Beecrowd

### Group 3: Regional Platforms (10)

Luogu, NowCoder, CodeDrills, Yandex, NERC/ITMO, TLX/TOKI, Yukicoder, ACMP, Timus, COCI

### Group 4: Classic/Archive Platforms (7)

IOI, Algotester, CP Hall of Fame, Open Cup, Robocontest, Universal Cup, ACM.U

## Development

### Adding a New Platform

1. Create new file in appropriate group folder (e.g., `content-scripts/group1/platform.js`)
2. Extend `BaseExtractor` and implement required methods
3. Add URL patterns to `manifest.json`
4. Add platform to `app/_lib/problem-solving-platforms.js` (if not already there)
5. Test extraction on platform pages

### Testing

1. Load extension in Chrome: `chrome://extensions` → "Load unpacked"
2. Navigate to platform submission pages
3. Check console for `[NEUPC:platform]` logs
4. Verify submissions appear in NEUPC app

### Building for Production

The extension uses ES modules (Manifest V3) and requires no build step. To package:

```bash
cd browser-extension
zip -r neupc-extension.zip . -x "*.git*" -x "node_modules/*"
```

## Browser Compatibility

- **Chrome/Edge**: Full support (Manifest V3)
- **Firefox**: Supported with minor adjustments (use `browser` API instead of `chrome`)
- **Safari**: Not supported (different extension format)

## Phase 1 Complete ✅

### What's Been Built:

- ✅ Common utilities (`utils.js`, `api.js`, `storage.js`)
- ✅ Base extractor class with full lifecycle management
- ✅ Updated manifest.json with all 41 platforms
- ✅ Directory structure for all platform groups

### Next Steps (Phase 2-7):

- Implement 41 platform-specific extractors
- Update backend API endpoints
- Test all platforms
- Firefox compatibility testing
- Documentation and deployment
