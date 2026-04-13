# NEUPC Browser Extension - Testing Guide

## Quick Start

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` directory
5. Verify extension appears with NEUPC icon

### 2. Verify Installation

Run the validation script:

```bash
cd browser-extension
node validate.js
```

Expected output:

- ✓ 17 Group 1 extractors found
- ✓ All required files present
- ✓ Manifest.json valid

### 3. Check Console Logs

After loading the extension:

1. Click on the extension in `chrome://extensions`
2. Click "Inspect views: service worker" (background page)
3. You should see:
   ```
   [NEUPC] Background service worker initialized
   [NEUPC] Default settings initialized
   [NEUPC] Background service worker ready
   ```

## Manual Testing by Platform

### Testing Codeforces (Most Complete Implementation)

**Test Pages:**

1. **Single Submission**: https://codeforces.com/contest/1234/submission/123456789
2. **My Submissions**: https://codeforces.com/contest/1234/my
3. **Status Page**: https://codeforces.com/problemset/status

**Steps:**

1. Navigate to a Codeforces submission page
2. Open DevTools Console (F12)
3. Look for logs starting with `[NEUPC:codeforces]`
4. Expected logs:
   ```
   [NEUPC:codeforces] Initializing extractor
   [NEUPC:codeforces] Page type detected: submission
   [NEUPC:codeforces] Processing submission page
   [NEUPC:codeforces] Extracted submission: {submissionId: "...", ...}
   ```

**What to Check:**

- [ ] Extension detects page type correctly
- [ ] Submission data is extracted (check console object)
- [ ] User handle is detected
- [ ] Problem ID and name are extracted
- [ ] Verdict is normalized (AC, WA, TLE, etc.)
- [ ] Execution time and memory are captured
- [ ] Source code is extracted (if viewing source)

### Testing AtCoder

**Test Page:** https://atcoder.jp/contests/abc123/submissions/me

**Expected Behavior:**

- Detects "submissions" page type
- Extracts multiple submissions from table
- Captures problem links and contest ID

### Testing LeetCode

**Test Page:** https://leetcode.com/submissions/detail/123456789/

**Expected Behavior:**

- Handles SPA (Single Page Application) loading
- Waits for dynamic content
- Extracts from React-rendered DOM

### Testing Other Platforms

For each platform in Group 1:

- Toph, CSES, CodeChef, HackerRank, Kattis, LightOJ, SPOJ, VJudge, CS Academy, E-Olymp, DMOJ

**Basic Check:**

1. Visit a submission page
2. Check console for `[NEUPC:platform]` logs
3. Verify no JavaScript errors

## Common Issues & Fixes

### Issue: No console logs appear

**Causes:**

- Content script not injected
- URL pattern doesn't match in manifest.json
- ES module import errors

**Fix:**

1. Check manifest.json `content_scripts` section
2. Verify file path is correct
3. Check browser console for import errors

### Issue: "Uncaught SyntaxError: Cannot use import statement outside a module"

**Cause:** Content script not declared as ES module in manifest

**Fix:** Ensure manifest.json has `"type": "module"` in content_scripts:

```json
{
  "matches": ["https://example.com/*"],
  "js": ["content-scripts/example.js"],
  "type": "module"
}
```

### Issue: "Failed to fetch" errors

**Cause:** Backend API not running or CORS issues

**Fix:**

1. Ensure NEUPC backend is running on http://localhost:3000
2. Check API endpoint in settings
3. Verify auth token is set

### Issue: Extractor initializes but doesn't extract data

**Cause:** DOM selectors don't match actual page structure

**Fix:**

1. Inspect page HTML
2. Update selectors in extractor file
3. Use `safeQuery()` for fallback selectors

## Testing Checklist

### Phase 1: Installation & Setup

- [ ] Extension loads without errors
- [ ] Background service worker starts
- [ ] Default settings are initialized
- [ ] Popup opens and displays correctly

### Phase 2: Group 1 Platforms (17 extractors)

#### Core Functionality

- [ ] Codeforces - Single submission extraction
- [ ] Codeforces - Multiple submissions extraction
- [ ] Codeforces - Source code extraction
- [ ] AtCoder - Submission details
- [ ] LeetCode - SPA handling
- [ ] Toph - Submission tracking
- [ ] CSES - Problem set tracking
- [ ] CodeChef - Contest submissions
- [ ] HackerRank - Challenge submissions
- [ ] Kattis - Problem submissions
- [ ] LightOJ - Full tracking
- [ ] SPOJ - Status extraction
- [ ] VJudge - Virtual judge
- [ ] CS Academy - Contests
- [ ] E-Olymp - Problems
- [ ] DMOJ - Modern judge

#### Edge Cases

- [ ] Handles missing data gracefully
- [ ] Works when user not logged in
- [ ] Handles partially loaded pages
- [ ] Doesn't break on page navigation

### Phase 3: Backend Integration

- [ ] API authentication works
- [ ] Submissions POST to backend successfully
- [ ] Retry logic works on failure
- [ ] Batch submissions handled correctly
- [ ] Cache prevents duplicate submissions

### Phase 4: Storage & Sync

- [ ] Settings persist across sessions
- [ ] Auth token stored securely
- [ ] Sync statistics update correctly
- [ ] Last sync timestamp accurate
- [ ] Cached submissions limited to 1000/platform

### Phase 5: User Experience

- [ ] Popup shows sync status
- [ ] Notifications display on sync (if enabled)
- [ ] Badge shows sync count
- [ ] Settings can be updated
- [ ] Extension doesn't slow down pages

## Automated Testing (Future)

To be implemented:

- Unit tests for common utilities
- Integration tests for extractors
- E2E tests with Puppeteer
- CI/CD pipeline validation

## Performance Testing

### Memory Usage

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Check "Memory" column
4. Extension should use < 50MB

### Page Load Impact

1. Use Chrome DevTools Performance tab
2. Record page load with/without extension
3. Extension should add < 100ms to load time

## Security Checklist

- [ ] No sensitive data logged to console
- [ ] Auth tokens not exposed in DOM
- [ ] HTTPS used for API calls
- [ ] Content scripts isolated from page scripts
- [ ] No eval() or unsafe innerHTML usage
- [ ] CSP (Content Security Policy) compliant

## Debugging Tips

### Enable Verbose Logging

Add to top of any extractor:

```javascript
const DEBUG = true;
if (DEBUG) console.log('[DEBUG]', ...);
```

### Inspect Content Script Context

In DevTools Console:

```javascript
// Check if extractor loaded
console.log('NEUPC loaded:', typeof BaseExtractor !== 'undefined');

// Check storage
chrome.storage.local.get(null, (data) => console.log('Local storage:', data));
chrome.storage.sync.get(null, (data) => console.log('Sync storage:', data));
```

### Monitor Network Requests

1. Open DevTools Network tab
2. Filter by "Fetch/XHR"
3. Look for requests to NEUPC backend
4. Check request/response payloads

### Test Specific Functions

Extractors expose functions you can test:

```javascript
// In console on a submission page
const extractor = new CodeforcesExtractor();
extractor.init();
extractor.extractSubmission().then(console.log);
```

## Test Results Template

```
Date: YYYY-MM-DD
Tester: [Name]
Chrome Version: [Version]
Extension Version: 2.0.0

Platform          | Status | Issues Found
------------------|--------|-------------
Codeforces        | ✓ Pass | None
AtCoder           | ✓ Pass | None
LeetCode          | ✗ Fail | Source code not extracted
...

Notes:
- List any specific issues
- Performance observations
- Browser-specific problems
```

## Reporting Issues

When reporting bugs, include:

1. Platform name
2. URL where issue occurs
3. Console logs (F12 → Console)
4. Expected vs actual behavior
5. Steps to reproduce
6. Screenshots if applicable

## Next Steps

After Group 1 testing:

1. Fix any discovered issues
2. Implement Group 2 extractors (6 platforms)
3. Implement Group 3 extractors (10 platforms)
4. Implement Group 4 extractors (7 platforms)
5. Backend API endpoint implementation
6. Firefox compatibility testing
7. Production build and deployment
