# NEUPC Browser Extension - Data Collection Guide

## Overview

The NEUPC browser extension automatically collects competitive programming data from **41+ platforms** and syncs it to your NEUPC database. This document explains what data is collected and how.

## Supported Platforms (41+)

### Group 1: Core Platforms (17)

- **Codeforces** ✅ (Fully Implemented)
- **AtCoder** ✅
- **LeetCode** ✅
- **Toph** ✅
- **CSES** ✅
- **CodeChef** ✅
- **TopCoder** ✅
- **HackerRank** ✅
- **Kattis** ✅
- **LightOJ** ✅
- **UVA Online Judge** ✅
- **SPOJ** ✅
- **Virtual Judge** ✅
- **CS Academy** ✅
- **E-Olymp** ✅
- **USACO** ✅
- **DMOJ** ✅

### Group 2: Global Platforms (7)

- HackerEarth
- Beecrowd
- COJ
- Timus
- ACMP
- (More platforms...)

### Group 3: Regional Platforms (10)

- LeetCode China
- Luogu
- ACWing
- POJ
- HDU OJ
- ZOJ
- BZOJ/Hydro
- 51Nod
- Aizu Online Judge
- Yosupo Judge

### Group 4: Competition Platforms

- Google Code Jam
- Facebook Hacker Cup
- Project Euler
- Codewars
- Exercism

---

## Data Collected

### 1. **Submission Data**

For each submission, the extension collects:

```javascript
{
  // Platform & Identification
  platform: "codeforces",                    // Platform name
  submission_id: "123456789",                // Unique submission ID
  problem_id: "1850A",                       // Problem identifier
  problem_name: "Problem Title",             // Problem name
  problem_url: "https://...",                // Link to problem
  submission_url: "https://...",             // Link to submission
  contest_id: "1850",                        // Contest ID (if applicable)

  // Submission Details
  verdict: "AC",                             // AC, WA, TLE, MLE, RE, etc.
  language: "GNU C++20",                     // Programming language
  execution_time_ms: 156,                    // Execution time in milliseconds
  memory_kb: 2048,                           // Memory used in KB
  submitted_at: "2024-04-02T10:30:00Z",     // Timestamp (ISO 8601)

  // Source Code
  source_code: "...",                        // Full source code

  // Problem Metadata
  difficulty_rating: 1200,                   // Problem rating/difficulty
  tags: ["greedy", "math", "constructive"],  // Problem tags/topics

  // Problem Description (if available)
  problem_description: "...",                // Full problem statement
  input_format: "...",                       // Input specification
  output_format: "...",                      // Output specification
  constraints: "...",                        // Constraints
  time_limit: "1 second",                    // Time limit
  memory_limit: "256 megabytes",             // Memory limit
  sample_tests: [                            // Sample test cases
    {
      input: "...",
      output: "..."
    }
  ]
}
```

### 2. **User Profile Data**

```javascript
{
  platform: "codeforces",
  handle: "tourist",                         // Username/handle
  rating: 3800,                              // Current rating
  max_rating: 3900,                          // Peak rating
  rank: "legendary grandmaster",             // Rank/title
  solved_count: 2500,                        // Problems solved
  submission_count: 5000,                    // Total submissions
  country: "Belarus",                        // Country (if available)
  organization: "...",                       // Organization (if available)
}
```

### 3. **Problem Metadata**

```javascript
{
  problem_id: "1850A",
  problem_name: "Problem Title",
  platform: "codeforces",
  difficulty_rating: 1200,
  tags: ["greedy", "math"],
  contest_id: "1850",
  solved_count: 5000,                        // Number of solves
  accuracy: 0.65,                            // Acceptance rate
  editorial_url: "...",                      // Link to editorial
  discussion_url: "...",                     // Link to discussions
}
```

### 4. **Contest Data** (When applicable)

```javascript
{
  contest_id: "1850",
  contest_name: "Codeforces Round #885",
  platform: "codeforces",
  contest_url: "...",
  start_time: "2024-04-02T14:35:00Z",
  duration_seconds: 7200,
  type: "ICPC",                              // Contest type
  problems: ["A", "B", "C", "D", "E"],      // Problem list
}
```

---

## How Data is Collected

### Method 1: Real-Time Scraping (Content Scripts)

When you visit a submission page, the extension:

1. **Detects** the page type (submission, problem, status page)
2. **Extracts** data from the DOM using CSS selectors
3. **Normalizes** the data (verdicts, languages, dates)
4. **Validates** the extracted data
5. **Sends** to NEUPC backend API
6. **Caches** locally to prevent duplicates

**Triggers:**

- When you submit a solution ✅
- When you view a submission page ✅
- When you view your submissions list ✅

### Method 2: Bulk Import (Background Worker)

For large-scale syncing (e.g., Codeforces):

1. **Fetches** all submissions via platform API
2. **Opens** submission pages in background tabs (one by one)
3. **Extracts** source code from each page
4. **Batches** data (50 submissions per batch)
5. **Uploads** to NEUPC backend
6. **Tracks** progress in extension popup

**Triggers:**

- Manual trigger from extension popup ✅
- First-time setup ✅
- Periodic background sync (configurable) ⏳

### Method 3: Platform APIs

Some platforms provide official APIs:

**Codeforces API:**

```
GET https://codeforces.com/api/user.status?handle=tourist&from=1&count=10000
```

Returns: All submissions with metadata (no source code)

**AtCoder API:**

```
GET https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=tourist
```

Returns: Submission history

**LeetCode GraphQL:**

```graphql
query {
  submissionList(username: "tourist") {
    submission {
      id
      statusDisplay
      lang
      runtime
      timestamp
    }
  }
}
```

---

## Data Storage

### Local Storage (Chrome Extension)

```javascript
chrome.storage.local.set({
  // Cache to prevent duplicate syncs
  cached_submissions_codeforces: {
    123456: { synced: true, timestamp: 1712052600 },
    123457: { synced: true, timestamp: 1712052700 },
  },

  // Sync statistics
  sync_stats: {
    codeforces: {
      total_synced: 1250,
      last_sync: '2024-04-02T10:30:00Z',
      errors: 0,
    },
  },
});
```

### Backend Database (Supabase/PostgreSQL)

All collected data is sent to your NEUPC backend and stored in:

**Tables:**

- `problem_submissions` - All submissions with metadata
- `solutions` - Source code and AI analysis
- `problems` - Problem metadata and descriptions
- `user_problem_solves` - User's solved problems
- `problem_embeddings` - AI-generated features
- `user_problem_profiles` - User skill profiles

---

## Privacy & Security

### What is NOT Collected:

- ❌ Passwords or authentication tokens
- ❌ Personal messages or private communications
- ❌ Browser history outside of CP platforms
- ❌ Payment information
- ❌ Email or contact information
- ❌ Data from non-CP websites

### Security Measures:

- ✅ Data is sent over HTTPS only
- ✅ API tokens are stored securely in chrome.storage
- ✅ Source code is only accessed on submission pages you visit
- ✅ No background tracking or analytics
- ✅ All data stays in YOUR database (self-hosted)

### User Control:

- ✅ Enable/disable auto-sync per platform
- ✅ Choose what data to collect (source code, descriptions, etc.)
- ✅ Clear cached data anytime
- ✅ Disable extension completely
- ✅ Export all collected data

---

## Configuration

### Extension Settings

```javascript
{
  // Backend URL
  apiUrl: "http://localhost:3000",           // Your NEUPC backend
  apiToken: "...",                           // Authentication token

  // Sync Settings
  autoSync: true,                            // Auto-sync on page visit
  syncEnabled: true,                         // Master switch
  captureSourceCode: true,                   // Include source code
  captureProblemDescription: true,           // Include problem text
  showNotifications: true,                   // Show sync status

  // Performance
  syncInterval: 300000,                      // Background sync: 5 minutes
  batchSize: 50,                             // Max submissions per batch
  retryAttempts: 3,                          // Retry failed requests

  // Per-Platform Settings
  platforms: {
    codeforces: { enabled: true, autoSync: true },
    atcoder: { enabled: true, autoSync: true },
    leetcode: { enabled: false, autoSync: false }
  }
}
```

---

## API Endpoints

The extension communicates with your NEUPC backend:

### 1. Sync Submission

```
POST /api/problem-solving/extension-sync
```

**Body:**

```json
{
  "platform": "codeforces",
  "handle": "tourist",
  "problemId": "1850A",
  "problemName": "Problem Title",
  "submissionId": "123456789",
  "sourceCode": "...",
  "language": "GNU C++20",
  "verdict": "AC",
  "executionTime": 156,
  "memoryUsed": 2048,
  "submittedAt": "2024-04-02T10:30:00Z"
}
```

### 2. Bulk Import

```
POST /api/problem-solving/bulk-import
```

**Body:**

```json
{
  "platform": "codeforces",
  "submissions": [
    /* array of submissions */
  ]
}
```

### 3. Get Extension Token

```
POST /api/problem-solving/extension-token
```

Returns a secure token for authentication.

---

## Troubleshooting

### Extension Not Syncing?

1. **Check Token:**
   - Open extension popup
   - Click "Settings"
   - Verify API token is set

2. **Check Backend:**
   - Ensure NEUPC app is running
   - Check API URL is correct
   - Verify endpoint `/api/problem-solving/extension-sync` exists

3. **Check Console:**
   - Press F12 on submission page
   - Look for `[NEUPC:platform]` logs
   - Check for errors

4. **Check Permissions:**
   - Go to `chrome://extensions`
   - Verify extension has required permissions
   - Try reloading the extension

### Source Code Not Syncing?

1. **Enable in Settings:**

   ```
   captureSourceCode: true
   ```

2. **Check Page HTML:**
   - Some platforms require login to view source
   - Extension must be able to access `<pre>` or `<code>` tags

3. **Platform-Specific Issues:**
   - **Codeforces:** Requires being logged in
   - **AtCoder:** Source visible to problem owner only
   - **LeetCode:** Premium required for some submissions

---

## Development Guide

### Adding a New Platform

1. **Create Content Script:**

   ```bash
   touch browser-extension/content-scripts/group1/neupc-newplatform.js
   ```

2. **Implement Extractor:**

   ```javascript
   (function () {
     'use strict';

     async function extractSubmission() {
       return {
         platform: 'newplatform',
         submission_id: '...',
         problem_id: '...',
         problem_name: '...',
         verdict: '...',
         language: '...',
         source_code: '...',
         // ... more fields
       };
     }

     // Listen for page load
     if (document.readyState === 'loading') {
       document.addEventListener('DOMContentLoaded', extractAndSync);
     } else {
       extractAndSync();
     }
   })();
   ```

3. **Update Manifest:**

   ```json
   {
     "matches": ["https://newplatform.com/submissions/*"],
     "js": ["content-scripts/group1/neupc-newplatform.js"]
   }
   ```

4. **Add Platform to Backend:**
   - Update `app/_lib/problem-solving-platforms.js`
   - Add to platform list

### Testing

```bash
# 1. Load extension
chrome://extensions → Load unpacked

# 2. Navigate to platform submission page

# 3. Check console (F12)
# Look for: [NEUPC:platform] logs

# 4. Verify in database
SELECT * FROM problem_submissions
WHERE platform = 'newplatform'
ORDER BY submitted_at DESC
LIMIT 10;
```

---

## Future Enhancements

### Planned Features:

- [ ] Contest participation tracking
- [ ] Friends/Following tracking
- [ ] Problem recommendations based on history
- [ ] Streak tracking across platforms
- [ ] Virtual contest syncing
- [ ] Team contest results
- [ ] Editorial/tutorial syncing
- [ ] Discussion forum posts

### Platform Expansion:

- [ ] CodeSignal
- [ ] CodinGame
- [ ] Advent of Code
- [ ] USACO Training Pages
- [ ] Sphere Online Judge (SPOJ)
- [ ] Coderbyte
- [ ] HackerEarth Challenges

---

## Support

### Issues?

- Report bugs: GitHub Issues
- Feature requests: GitHub Discussions
- Documentation: `/docs/`

### Contributing

See `ARCHITECTURE.md` for development guidelines.

---

**Last Updated:** April 2024  
**Extension Version:** 2.0.0  
**Platforms Supported:** 41+
