# Quick Test Guide - NEUPC Browser Extension

## ⚡ Quick Start (2 minutes)

### 1. Load Extension

```bash
# In Chrome, go to:
chrome://extensions

# Enable "Developer mode" (top right)
# Click "Load unpacked"
# Select: /path/to/neupc/browser-extension
```

### 2. Verify Installation

```bash
# Run validator
cd browser-extension
node validate.js

# Expected: ✓ 17 Group 1 extractors found
```

### 3. Test Utilities (Local)

```bash
# Open test page in Chrome
# Navigate to: chrome-extension://[extension-id]/test.html
# Or: file:///path/to/browser-extension/test.html

# Click each "Run Tests" button
# All tests should pass ✓
```

### 4. Test on Real Platform

**Easiest: Codeforces (no login required for viewing)**

1. Visit any Codeforces submission:

   ```
   https://codeforces.com/contest/1/submission/1
   ```

2. Open DevTools (F12) → Console tab

3. Look for logs:

   ```
   [NEUPC:codeforces] Initializing extractor
   [NEUPC:codeforces] Page type detected: submission
   [NEUPC:codeforces] Extracted submission: Object
   ```

4. Expand the object to verify:
   - ✓ submissionId is extracted
   - ✓ problemId is extracted
   - ✓ verdict is normalized
   - ✓ language is detected

## 🧪 Testing Checklist

### Phase 1: Installation ✓

- [ ] Extension loads without errors
- [ ] Background worker initializes
- [ ] Popup opens successfully
- [ ] No console errors

### Phase 2: Unit Tests ✓

- [ ] Open `test.html` in browser
- [ ] All verdict normalization tests pass
- [ ] All language normalization tests pass
- [ ] Date parsing works
- [ ] Text sanitization works
- [ ] DOM queries work

### Phase 3: Integration Tests

Pick ONE platform to test thoroughly:

**Recommended: Codeforces** (most complete)

- [ ] Single submission page works
- [ ] Status page detection works
- [ ] Problem page detection works
- [ ] User handle extracted (when logged in)
- [ ] Source code captured
- [ ] Submission sent to backend (if running)

### Phase 4: Multi-Platform Spot Check

Quickly verify 2-3 other platforms:

- [ ] AtCoder: https://atcoder.jp/contests/abc123/submissions/12345678
- [ ] LeetCode: https://leetcode.com/submissions/detail/123456/
- [ ] DMOJ: https://dmoj.ca/submission/123456

## 🐛 Common Issues

### "Cannot use import statement outside module"

**Fix:** Content scripts in manifest.json need `"type": "module"`
✓ Already configured in our manifest

### "Failed to fetch"

**Expected:** Backend not running yet
**Later:** Check API URL in settings

### No console logs

**Check:**

1. URL matches manifest pattern
2. Extension is enabled
3. Try refreshing page

## 📊 Current Status

### Implemented ✅

- **Core Architecture** (Phase 1) - 100%
  - Base extractor class
  - Common utilities
  - API communication layer
  - Storage helpers
  - Manifest v3 config

- **Group 1 Extractors** (Phase 2) - 100%
  - 17/17 platforms implemented
  - Codeforces, AtCoder, LeetCode, Toph
  - CSES, CodeChef, HackerRank, Kattis
  - LightOJ, SPOJ, VJudge, CS Academy
  - E-Olymp, DMOJ, TopCoder, UVA, USACO

### Pending 🚧

- **Group 2 Extractors** (Phase 3) - 0/6
  - HackerEarth, Google Code Jam, Facebook Hacker Cup
  - GeeksforGeeks, CodinGame, Beecrowd

- **Group 3 Extractors** (Phase 4) - 0/10
  - Regional platforms (China, India, Russia, etc.)

- **Group 4 Extractors** (Phase 5) - 0/7
  - Classic/archive platforms (IOI, etc.)

- **Backend Integration** (Phase 6) - 0%
  - API endpoints need implementation
  - Auth flow needs setup
  - Handle syncing

- **Production Build** (Phase 7) - 0%
  - Firefox compatibility
  - Production packaging
  - Store submission

## 📝 Test Results Template

```
Tester: [Your Name]
Date: YYYY-MM-DD
Chrome Version: [e.g., 120.0.6099.109]

✓ Extension loads
✓ Validator passes
✓ Unit tests pass (test.html)
✓ Codeforces extraction works
✓ AtCoder detection works
_ LeetCode (not tested)
_ Backend integration (backend not running)

Issues Found:
- None / [List any issues]

Notes:
[Any additional observations]
```

## 🚀 Next Steps

After testing Group 1:

1. **Fix any issues** found during testing
2. **Implement Groups 2-4** (23 more platforms)
3. **Backend API** implementation
4. **Full integration** testing with live backend
5. **Firefox** compatibility
6. **Production** deployment

## 📚 Documentation

- **ARCHITECTURE.md** - Technical architecture details
- **TESTING.md** - Comprehensive testing guide
- **validate.js** - Automated validation script
- **test.html** - Unit test page

## 💡 Tips

- Use `chrome://extensions` → "Inspect views: service worker" for background logs
- Use F12 on any page to see content script logs
- Look for `[NEUPC:platform]` prefixed logs
- Extractor objects are logged - expand them to inspect data
- Test with real submission URLs (any public submission works)

---

**Ready to test?** Start with step 1-4 above! 🎯
