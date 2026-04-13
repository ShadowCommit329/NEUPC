# 🧪 NEUPC Extension - Browser Testing Guide (Chrome & Firefox)

## Prerequisites

- Chrome or Chromium browser (latest version)
- Firefox browser (latest version)
- The NEUPC repository cloned locally

## Part 1: Chrome Testing

### Step 1: Load Extension in Chrome

```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable "Developer mode" (toggle in top-right corner)

# 3. Click "Load unpacked"

# 4. Navigate to and select:
/path/to/neupc/browser-extension

# 5. Verify extension appears with icon and "NEUPC Problem Solving Sync v2.0.0"
```

### Step 2: Verify Installation

Check the extension card shows:

- ✅ Name: "NEUPC Problem Solving Sync"
- ✅ Version: 2.0.0
- ✅ Status: Enabled (toggle is blue)
- ✅ No errors shown

### Step 3: Check Background Worker

1. On the extension card, click **"Inspect views: service worker"**
2. Console should show:
   ```
   [NEUPC] Background service worker initialized
   [NEUPC] Default settings initialized
   [NEUPC] Background service worker ready
   ```

### Step 4: Test on Codeforces

1. **Open a Codeforces submission** (no login needed):

   ```
   https://codeforces.com/contest/1/submission/1
   ```

2. **Open DevTools** (F12 or Ctrl+Shift+I)

3. **Switch to Console tab**

4. **Look for logs** starting with `[NEUPC:codeforces]`:

   ```
   [NEUPC:codeforces] Initializing extractor
   [NEUPC:codeforces] Page type detected: submission
   [NEUPC:codeforces] Processing submission page
   [NEUPC:codeforces] Extracted submission: {submissionId: "1", ...}
   ```

5. **Expand the submission object** to verify:
   - `platform: "codeforces"`
   - `submissionId: "1"`
   - `problemId` is extracted
   - `verdict` shows result
   - `language` is detected

### Step 5: Test Popup

1. **Click the extension icon** in Chrome toolbar
2. Popup should open (showing popup.html)
3. No errors in console

### Step 6: Test Other Platforms (Quick Check)

Try 2-3 other platforms to verify detection:

**AtCoder** (requires login for submissions):

```
https://atcoder.jp/contests/abc100/submissions/me
```

Expected: `[NEUPC:atcoder] Initializing extractor`

**LeetCode**:

```
https://leetcode.com/submissions/
```

Expected: `[NEUPC:leetcode] Initializing extractor`

**DMOJ** (no login needed):

```
https://dmoj.ca/submissions/
```

Expected: `[NEUPC:dmoj] Initializing extractor`

---

## Part 2: Firefox Testing

### Step 1: Check Firefox Compatibility

Firefox uses `browser` API instead of `chrome` API. Our extension uses feature detection, so it should work in both.

### Step 2: Load Extension in Firefox

```bash
# Method 1: Temporary Installation (For Testing)

# 1. Open Firefox and navigate to:
about:debugging#/runtime/this-firefox

# 2. Click "Load Temporary Add-on..."

# 3. Navigate to browser-extension folder and select:
manifest.json

# 4. Extension loads temporarily (until Firefox restarts)
```

```bash
# Method 2: web-ext (Recommended for Development)

# Install web-ext if you haven't:
npm install -g web-ext

# Run from browser-extension directory:
cd browser-extension
web-ext run

# This will:
# - Open a new Firefox instance with extension loaded
# - Auto-reload on file changes
# - Show console output
```

### Step 3: Verify Installation in Firefox

Check that:

- ✅ Extension appears in about:addons
- ✅ No error notifications
- ✅ Icon appears in toolbar

### Step 4: Check Background Script (Firefox)

1. Navigate to: `about:debugging#/runtime/this-firefox`
2. Find NEUPC extension
3. Click **"Inspect"** button
4. Console should show same initialization messages:
   ```
   [NEUPC] Background service worker initialized
   [NEUPC] Default settings initialized
   [NEUPC] Background service worker ready
   ```

### Step 5: Test on Codeforces (Firefox)

Same as Chrome testing:

1. Visit: `https://codeforces.com/contest/1/submission/1`
2. Open DevTools (F12)
3. Check Console for `[NEUPC:codeforces]` logs
4. Verify extraction works

### Step 6: Test Popup (Firefox)

1. Click extension icon in Firefox toolbar
2. Popup should open
3. Check for any Firefox-specific console errors

---

## Part 3: Cross-Browser Compatibility Check

### Create Test Report

Test the **same submission URL** in both browsers and compare:

| Feature                  | Chrome | Firefox | Notes |
| ------------------------ | ------ | ------- | ----- |
| Extension loads          | ✓/✗    | ✓/✗     |       |
| Background worker starts | ✓/✗    | ✓/✗     |       |
| Codeforces detection     | ✓/✗    | ✓/✗     |       |
| Submission extraction    | ✓/✗    | ✓/✗     |       |
| Popup opens              | ✓/✗    | ✓/✗     |       |
| Console logs appear      | ✓/✗    | ✓/✗     |       |
| No errors                | ✓/✗    | ✓/✗     |       |

---

## Expected Results

### ✅ What Should Work

1. **Extension loads** without errors in both browsers
2. **Background worker** initializes successfully
3. **Content scripts inject** on matching URLs
4. **Page type detection** works (submission/submissions/problem)
5. **Data extraction** captures submission details
6. **Console logging** shows extractor activity
7. **Popup** opens and displays

### ⚠️ What Won't Work Yet

1. **Backend communication** - API not running
2. **Actual data sync** - Backend endpoints not implemented
3. **Authentication** - No auth flow yet
4. **Groups 2-4 platforms** - Not implemented yet

### ❌ Known Limitations

1. **UVA, TopCoder, USACO** - Limited extraction (noted in code)
2. **Source code capture** - May fail on some platforms
3. **Dynamic content** - Some SPAs may need additional wait time

---

## Troubleshooting

### Chrome Issues

**"Cannot use import statement outside a module"**

- Check manifest.json has `"type": "module"` in content_scripts
- ✅ Already configured in our manifest

**"Service worker registration failed"**

- Check background.js syntax
- Look for errors in service worker console

**No logs appear**

- Verify URL matches manifest patterns
- Check content script is injected (DevTools → Sources → Content Scripts)
- Try hard refresh (Ctrl+Shift+R)

### Firefox Issues

**"browser is not defined"**

- Our code uses feature detection: `const browser = chrome || browser`
- Should work automatically

**"addons.mozilla.org required"**

- Ignore for temporary testing
- Only matters for production submission

**Extension doesn't persist**

- Expected behavior with "Load Temporary Add-on"
- Use web-ext for development

### Both Browsers

**No console logs at all**

- Check if extension is enabled
- Verify URL pattern matches
- Look for JavaScript errors in console
- Check if content script file exists

**Extraction fails**

- Page structure may have changed
- Check CSS selectors in extractor
- Open issue with URL and error details

---

## Debugging Commands

### Check if content script loaded:

```javascript
// In page console
console.log('Extension loaded:', window.hasOwnProperty('BaseExtractor'));
```

### Manually trigger extraction:

```javascript
// This won't work yet since extractors auto-initialize
// But useful for debugging later
```

### Check storage:

```javascript
// Chrome
chrome.storage.local.get(null, console.log);
chrome.storage.sync.get(null, console.log);

// Firefox
browser.storage.local.get(null).then(console.log);
browser.storage.sync.get(null).then(console.log);
```

### Inspect background worker:

- **Chrome**: chrome://extensions → "Inspect views: service worker"
- **Firefox**: about:debugging#/runtime/this-firefox → "Inspect"

---

## Test Checklist

### Chrome ✓

- [ ] Extension loads
- [ ] No errors in extension card
- [ ] Background worker console shows initialization
- [ ] Codeforces page shows `[NEUPC:codeforces]` logs
- [ ] Submission data extracted correctly
- [ ] Popup opens without errors
- [ ] At least 2 other platforms detect correctly

### Firefox ✓

- [ ] Extension loads (temporary or web-ext)
- [ ] No error notifications
- [ ] Background script inspectable
- [ ] Same Codeforces URL works
- [ ] Same extraction results as Chrome
- [ ] Popup opens
- [ ] No Firefox-specific errors

### Cross-Browser ✓

- [ ] Both browsers extract same data
- [ ] No browser-specific console errors
- [ ] Performance is similar
- [ ] Both handle missing elements gracefully

---

## Recording Your Test

Please test and report results:

```markdown
## Test Results

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Chrome Version:** X.X.X
**Firefox Version:** X.X.X

### Chrome

- Extension loads: ✓/✗
- Codeforces extraction: ✓/✗
- Console logs: ✓/✗
- Issues: [describe any issues]

### Firefox

- Extension loads: ✓/✗
- Codeforces extraction: ✓/✗
- Console logs: ✓/✗
- Issues: [describe any issues]

### Comparison

- Both browsers work identically: Yes/No
- Differences noted: [list any differences]

### Screenshots

[Paste screenshots of console logs]
```

---

## Next Steps After Testing

Based on test results:

1. ✅ **If all tests pass**: Ready to implement Groups 2-4
2. 🔧 **If issues found**: Fix and re-test
3. 📝 **Document any quirks**: Update extractor code
4. 🚀 **Once stable**: Proceed with backend integration

---

## Quick Start Commands

```bash
# Chrome (Manual)
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked → select browser-extension/

# Firefox (web-ext)
cd browser-extension
web-ext run --verbose

# Firefox (Manual)
# 1. Open about:debugging#/runtime/this-firefox
# 2. Load Temporary Add-on → select manifest.json

# Run validator
cd browser-extension
node validate.js

# Test utilities
# Open in browser: file:///path/to/browser-extension/test.html
```

**Ready to test? Start with Chrome, then Firefox!** 🎯
