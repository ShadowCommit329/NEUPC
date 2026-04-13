## 🚀 NEUPC Extension: Complete Initial Sync Guide

### Prerequisites:

1. **NEUPC Account**: Have an active NEUPC account
2. **Session Token**: Get your `auth-token` from browser cookies
3. **Platform Handles**: Know your usernames on various platforms

---

## 📥 Method 1: Automated Import (Recommended)

### Step 1: Setup Extension

1. Load the browser extension (Chrome/Firefox)
2. Click extension icon → Go to Settings
3. Paste your NEUPC session token
4. Select API endpoint (local/production)
5. Click "Save Settings"

### Step 2: Bulk Import via API

1. Click "Import Submission History" section
2. Select platform: **Codeforces**, **AtCoder**, or **LeetCode**
3. Enter your handle (e.g., `tourist`, `jiangly`)
4. Click "Import All AC Submissions"
5. Wait for automatic collection and sync

**Supported API Platforms:**

- ✅ **Codeforces**: Up to 10,000 submissions via API
- ✅ **AtCoder**: All submissions via Kenkoooo API
- ✅ **LeetCode**: All AC submissions via GraphQL

---

## 📝 Method 2: Manual Collection

### For Non-API Platforms:

**Step 1: Enable Auto-Sync**

- Toggle "Auto-Sync on Visit" to ON
- Ensure session token is configured

**Step 2: Visit Your Submissions**
Navigate to your profile/submissions on each platform:

```
CodeChef      → https://www.codechef.com/users/{handle}
HackerRank    → https://www.hackerrank.com/profile/{handle}
Toph          → https://toph.co/u/{handle}/submissions
CSES          → https://cses.fi/ (login required)
SPOJ          → https://www.spoj.com/users/{handle}
VJudge        → https://vjudge.net/user/{handle}
DMOJ          → https://dmoj.ca/user/{handle}
Luogu         → https://www.luogu.com.cn/user/{uid}
```

**Step 3: Browse AC Submissions**

- Click through your accepted submissions
- Extension automatically caches each one
- Continue until you've covered your history

**Step 4: Bulk Sync**

- Return to extension popup
- See cached submissions count
- Click "Sync All to NEUPC"

---

## 🤖 Method 3: Browser Automation (Advanced)

### Using Puppeteer/Selenium:

```javascript
const puppeteer = require('puppeteer');

async function collectAllSubmissions(platform, handle) {
  const browser = await puppeteer.launch({
    headless: false, // Keep extension visible
    args: ['--load-extension=./browser-extension'],
  });

  const page = await browser.newPage();

  // Navigate to submission pages
  const platforms = {
    codeforces: `https://codeforces.com/submissions/${handle}`,
    codechef: `https://www.codechef.com/users/${handle}`,
    atcoder: `https://atcoder.jp/users/${handle}/history`,
    // Add more platforms...
  };

  const baseUrl = platforms[platform];

  // Visit multiple pages
  for (let page = 1; page <= 50; page++) {
    await page.goto(`${baseUrl}/page/${page}`);
    await page.waitForTimeout(2000); // Let extension process

    // Check if more submissions exist
    const hasMore = await page.$('.pagination .next');
    if (!hasMore) break;
  }

  await browser.close();
}
```

---

## 📊 Expected Results:

### After Complete Collection:

- **Codeforces**: 100-5000+ submissions (depending on your activity)
- **LeetCode**: 50-2000+ problems solved
- **AtCoder**: 50-1000+ submissions from contests
- **Regional OJs**: 10-500+ submissions each
- **Total**: Potentially 1000-10000+ submissions across all platforms

### Sync Performance:

- **API Import**: 100-500 submissions/minute
- **Manual Collection**: 10-50 submissions/minute
- **Auto-Sync**: Real-time as you browse

---

## 🔧 Troubleshooting:

### Common Issues:

1. **"No Auth Token"** → Get fresh token from browser cookies
2. **"Rate Limited"** → Wait and retry, APIs have limits
3. **"Handle Not Found"** → Verify username spelling
4. **"Sync Failed"** → Check NEUPC server connection

### Platform-Specific Notes:

- **Codeforces**: Public API, works instantly
- **LeetCode**: May need login for full history
- **AtCoder**: Uses third-party API, very reliable
- **Chinese OJs**: Some require VPN/proxy

---

## 🎯 Pro Tips:

1. **Start with API platforms** (Codeforces, AtCoder, LeetCode) first
2. **Use auto-sync** for ongoing submissions
3. **Clear cache periodically** to avoid storage limits
4. **Verify sync results** in your NEUPC dashboard
5. **Collect gradually** to avoid overwhelming the system

This approach will comprehensively sync your entire competitive programming history into NEUPC! 🚀
