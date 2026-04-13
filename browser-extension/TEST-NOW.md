# 🧪 NEUPC Extension - Ready for Testing

**Status**: ✅ Extension validated and ready for manual browser testing  
**Group 1 Platforms**: 17/17 implemented and included in manifest  
**Compatibility**: Chrome, Firefox, Edge  
**Latest Fix**: ✅ Firefox compatibility issue resolved (changed `service_worker` to `scripts`)

---

## Quick Start

### Step 1: Load the Extension

#### Chrome/Edge:

```bash
1. Open chrome://extensions (or edge://extensions)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select: /home/eyasir329/Documents/GitHub/neupc/browser-extension
5. Extension should load successfully ✓
```

#### Firefox:

```bash
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Navigate to: /home/eyasir329/Documents/GitHub/neupc/browser-extension
4. Select manifest.json
5. Extension should load successfully ✓
```

### Step 2: Test on Live Platforms

Visit these test URLs and check browser console (F12) for logs:

#### Codeforces (Primary Test)

- **Submission**: https://codeforces.com/contest/1/submission/1
- **Expected**: `[NEUPC:codeforces] Extracted submission: {...}`
- **Check**: Problem ID, verdict, language, time, memory, source code

#### AtCoder

- **Submission**: https://atcoder.jp/contests/abc001/submissions/1
- **Expected**: `[NEUPC:atcoder] Extracted submission: {...}`

#### LeetCode

- **Submission**: https://leetcode.com/submissions/detail/1/
- **Expected**: `[NEUPC:leetcode] Extracted submission: {...}`
- **Note**: May require login

#### DMOJ

- **Submission**: https://dmoj.ca/submission/1
- **Expected**: `[NEUPC:dmoj] Extracted submission: {...}`

---

## What to Check

### ✅ Success Indicators

1. **Console Logs**: `[NEUPC:platform] Initialized` on page load
2. **Data Extraction**: `[NEUPC:platform] Extracted submission: {...}`
3. **No Errors**: No red errors in console
4. **Data Completeness**: All fields populated (problemId, verdict, language, etc.)

### ❌ Failure Indicators

1. **No Logs**: Extension not loading on the page
2. **Red Errors**: JavaScript errors in console
3. **Missing Data**: Required fields (problemId, verdict) are null/undefined
4. **Wrong Data**: Extracted data doesn't match what's on the page

---

## Testing Checklist

```
Chrome:
[ ] Extension loads without errors
[ ] Codeforces submission page extracts data
[ ] Console shows correct submission details
[ ] No JavaScript errors

Firefox:
[ ] Extension loads without errors
[ ] Codeforces submission page extracts data
[ ] Console shows correct submission details
[ ] No JavaScript errors

Edge (Optional):
[ ] Extension loads without errors
[ ] Basic extraction works
```

---

## Console Commands for Testing

Open browser console (F12) on a submission page and try:

```javascript
// Check if extension loaded
console.log('Extension active:', typeof window.neupcExtractor !== 'undefined');

// Manually trigger extraction (if implemented)
window.neupcExtractor?.extractSubmission();

// Check storage
chrome.storage.local.get(null, (data) => console.log('Stored data:', data));
```

---

## Expected Console Output

```
[NEUPC:codeforces] CodeForces extractor initialized
[NEUPC:codeforces] Detected page type: submission
[NEUPC:codeforces] Extracted submission: {
  platformId: 'codeforces',
  problemId: '1A',
  verdict: 'AC',
  language: 'GNU C++17',
  executionTime: 15,
  memoryUsed: 256,
  submittedAt: '2024-03-27T10:30:00Z',
  sourceCode: 'int main() { ... }',
  url: 'https://codeforces.com/contest/1/submission/1'
}
```

---

## Troubleshooting

### Extension won't load

- Check manifest.json is valid JSON
- Ensure all file paths are correct
- Look for errors in chrome://extensions

### No console logs

- Refresh the page after loading extension
- Check if URL matches manifest patterns
- Verify content script is injecting (check Sources tab)

### Data extraction fails

- Open console and look for error messages
- Check if page structure changed
- Verify selectors in extractor code

### Source code not extracted

- Some platforms require clicking "Show code" button first
- Check if code is in an iframe
- Verify extractor waits for code to load

---

## Next Steps After Testing

1. **Document Results**: Note which platforms work/fail
2. **Report Issues**: Create list of any errors or bugs found
3. **Test Additional Platforms**: Try other Group 1 platforms
4. **Backend Integration**: Once extraction works, connect to NEUPC backend
5. **Implement Groups 2-4**: Add remaining 24 platforms

---

## Platform Status

### Group 1 (17 platforms) - ✅ IMPLEMENTED

- ✅ Codeforces
- ✅ AtCoder
- ✅ LeetCode
- ✅ Toph
- ✅ CSES
- ✅ CodeChef
- ✅ TopCoder
- ✅ HackerRank
- ✅ Kattis
- ✅ LightOJ
- ✅ UVA Online Judge
- ✅ SPOJ
- ✅ Virtual Judge
- ✅ CS Academy
- ✅ E-Olymp
- ✅ USACO
- ✅ DMOJ

### Groups 2-4 (24 platforms) - ⏸️ PENDING

- Not yet implemented
- Will be added after Group 1 testing completes

---

## Questions?

If you encounter issues:

1. Check browser console for errors
2. Verify extension is loaded in chrome://extensions
3. Try a different test URL
4. Test in a different browser
5. Document the issue and share console logs
