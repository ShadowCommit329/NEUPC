# 🐛 Debug Guide - NEUPC Extension Not Working

If the extension loads but nothing happens on submission pages, follow these debugging steps:

---

## Step 1: Check Extension is Loaded

### Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Look for "NEUPC Problem Solving Sync" in the list
3. If not there, reload the extension

### Chrome:

1. Open `chrome://extensions`
2. Look for "NEUPC Problem Solving Sync"
3. Make sure it's enabled (toggle on)

---

## Step 2: Check Browser Console for Errors

1. Go to: https://codeforces.com/contest/2193/submission/359885689
2. Open Developer Tools (F12)
3. Click "Console" tab
4. Look for messages starting with `[NEUPC:codeforces]`

### Expected Output:

```
[NEUPC:codeforces] Initializing extractor
[NEUPC:codeforces] Page type detected: submission
[NEUPC:codeforces] Processing submission page
[NEUPC:codeforces] Extracted submission: {...}
```

### If You See Nothing:

The content script might not be loading. Check:

#### A. Check if content script is injected:

1. Open Developer Tools (F12)
2. Go to "Sources" or "Debugger" tab
3. Look for: `content-scripts/group1/codeforces.js`
4. If missing, the manifest pattern isn't matching

#### B. Check for JavaScript errors:

Look for red error messages in console like:

- `Failed to load module`
- `Unexpected token`
- `Cannot import`

---

## Step 3: Check Manifest Patterns

The URL `https://codeforces.com/contest/2193/submission/359885689` should match:

```json
"matches": [
  "https://codeforces.com/contest/*/submission/*"
]
```

This should work. If not, check if Firefox is blocking the script.

---

## Step 4: Manual Test in Console

Open browser console (F12) on the Codeforces page and run:

```javascript
// Check if chrome/browser API is available
console.log(
  'Browser API:',
  typeof chrome !== 'undefined'
    ? 'chrome'
    : typeof browser !== 'undefined'
      ? 'browser'
      : 'NONE'
);

// Check if storage API works
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get('settings', (result) => {
    console.log('Settings:', result);
  });
} else if (typeof browser !== 'undefined' && browser.storage) {
  browser.storage.local.get('settings').then((result) => {
    console.log('Settings:', result);
  });
}

// Check if script loaded
console.log('Window location:', window.location.href);
console.log('Document ready state:', document.readyState);
```

---

## Step 5: Test with Simple Alert

Let's modify the Codeforces extractor to add an alert for debugging.

### Temporary Debug Code:

1. Open: `browser-extension/content-scripts/group1/codeforces.js`
2. Add this at the TOP of the file (line 1):

```javascript
console.log('[DEBUG] Codeforces content script loaded!');
alert('NEUPC Extension loaded on Codeforces!');
```

3. Reload the extension
4. Refresh the Codeforces page
5. You should see an alert popup

If the alert shows → Script is loading ✓  
If no alert → Script isn't being injected ✗

---

## Step 6: Check Firefox Specific Issues

### Firefox may block ES modules in content scripts

If Firefox shows errors about ES modules:

1. Check Browser Console (not Page Console):
   - In Firefox: Menu → More Tools → Browser Console (Ctrl+Shift+J)
   - Look for extension-related errors

2. Common Firefox issues:
   - ES modules not supported in content scripts (older Firefox)
   - Service worker issues (we already fixed this)
   - CSP (Content Security Policy) blocking scripts

---

## Step 7: Verify Storage Initialization

The extension might be failing because storage isn't initialized. Run in console:

```javascript
// For Chrome
chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items);
});

// For Firefox
browser.storage.local.get(null).then((items) => {
  console.log('All storage:', items);
});
```

Expected output should include:

```javascript
{
  settings: {
    autoSync: true,
    syncEnabled: true,
    captureSourceCode: true,
    ...
  }
}
```

If empty → Storage not initialized, extension might be exiting early

---

## Step 8: Common Issues & Solutions

### Issue: "Nothing happened"

**Possible causes:**

1. Content script not injecting
2. JavaScript error preventing execution
3. Settings not initialized (autoSync disabled)
4. Module import failing

**Solutions:**

- Check console for errors
- Verify manifest pattern matches URL
- Check Browser Console (not Page Console) for extension errors
- Try the simple alert test (Step 5)

### Issue: Script loads but doesn't extract

**Possible causes:**

1. Page structure changed (Codeforces updated their HTML)
2. Selectors not matching elements
3. Async timing issue (elements not loaded yet)

**Solutions:**

- Inspect page elements and verify selectors
- Check if submission data is visible on page
- Add longer wait times in extractor

### Issue: ES module errors

**Possible causes:**

1. Firefox version too old (need 109+)
2. Import paths incorrect
3. Module not found

**Solutions:**

- Update Firefox to latest version
- Check import paths are correct (relative paths)
- Verify all files exist

---

## Step 9: Collect Debug Info

If still not working, collect this info:

```
Browser: Firefox/Chrome version X.X
Extension loaded: Yes/No
Console errors: [paste errors here]
Browser Console errors: [paste errors here]
Alert shown (Step 5): Yes/No
Storage data (Step 7): [paste output here]
```

---

## Quick Fixes to Try

### Fix 1: Disable Auto-Sync Check (for testing only)

Edit `content-scripts/_base.js` line 60-65 to skip the check:

```javascript
// Check if auto-sync is enabled
const autoSyncEnabled = true; // Force enable for testing
// const autoSyncEnabled = await isAutoSyncEnabled(); // Comment out

if (!autoSyncEnabled) {
  log(this.platform, 'Auto-sync is disabled');
  // return; // Comment out this return
}
```

### Fix 2: Add Debug Logs

Add this to top of `codeforces.js` after imports:

```javascript
console.log('[DEBUG] Script loaded at:', new Date().toISOString());
console.log('[DEBUG] URL:', window.location.href);
console.log(
  '[DEBUG] Browser API available:',
  typeof chrome !== 'undefined' || typeof browser !== 'undefined'
);
```

---

## Next Steps

After trying these debugging steps, report back with:

1. What you see in the console
2. Whether the alert (Step 5) appeared
3. Any error messages
4. Browser and version

This will help identify the exact issue!
