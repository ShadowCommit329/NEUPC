# NEUPC Submission Import Workflow Documentation

This document provides comprehensive documentation of the NEUPC browser extension's submission import workflow, covering data flow, API integrations, transformations, and database schema.

## Table of Contents

1. [Data Flow Overview](#1-data-flow-overview)
2. [Data Sources](#2-data-sources)
3. [Data Transformation](#3-data-transformation)
4. [Backend Processing](#4-backend-processing)
5. [Database Schema (V2)](#5-database-schema-v2)

---

## 1. Data Flow Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Browser Extension                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  popup.html/js  ──────►  background.js  ──────►  content-scripts/*          │
│  (UI Controls)           (Orchestrator)          (Source Extraction)        │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          External APIs                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Codeforces API          AtCoder Kenkoooo API         (Future platforms)    │
│  user.status             /v3/user/submissions                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEUPC Backend                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/problem-solving/bulk-import      (Batch import)                       │
│  /api/problem-solving/extension-sync   (Single sync + AI analysis)          │
│  /api/problem-solving/sync-status      (User handles)                       │
│  /api/problem-solving/existing-submissions (Deduplication check)            │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Supabase PostgreSQL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  V2 Schema: platforms, problems, submissions, user_solves, solutions, etc.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Import Flow: "Start Import" Button Click

When a user clicks "Start Import", the following sequence occurs:

#### Step 1: Initialization (popup.js)

```
User clicks "Start Import"
       │
       ▼
popup.js sends message: { action: "startImport", platforms, mode }
       │
       ▼
background.js receives message and begins orchestration
```

#### Step 2: Fetch Existing Submissions (background.js:582-620)

```javascript
// Deduplication check - avoid re-importing existing submissions
const existingResponse = await fetch(
  `${baseUrl}/api/problem-solving/existing-submissions`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-extension-token': extensionToken,
    },
    body: JSON.stringify({ platform }),
  }
);
// Returns: { existingSubmissionIds: ["123456", "789012", ...] }
```

#### Step 3: Fetch Submissions from External APIs (background.js:622-750)

**For Codeforces:**

```javascript
const cfResponse = await fetch(
  `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`
);
// Filter out already-imported submissions
const newSubmissions = submissions.filter(
  (sub) => !existingIds.has(String(sub.id))
);
```

**For AtCoder:**

```javascript
const acResponse = await fetch(
  `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${handle}&from_second=0`
);
```

#### Step 4: Import Mode Branching

```
                    ┌─────────────────┐
                    │  Import Mode?   │
                    └────────┬────────┘
                             │
           ┌─────────────────┴─────────────────┐
           │                                   │
           ▼                                   ▼
┌──────────────────────┐           ┌──────────────────────┐
│    Quick Import      │           │     Full Import      │
│  (Metadata Only)     │           │  (With Source Code)  │
├──────────────────────┤           ├──────────────────────┤
│ • Fast (seconds)     │           │ • Slow (minutes)     │
│ • No source code     │           │ • Opens browser tabs │
│ • Bulk API call      │           │ • Extracts code      │
│ • No AI analysis     │           │ • AI analysis ready  │
└──────────────────────┘           └──────────────────────┘
```

#### Step 5a: Quick Import Path (background.js:752-850)

```javascript
// Transform and send to bulk-import endpoint
const transformedSubmissions = submissions.map((sub) => ({
  platform: 'codeforces',
  submissionId: String(sub.id),
  problemId: `${sub.problem.contestId}${sub.problem.index}`,
  problemName: sub.problem.name,
  verdict: sub.verdict === 'OK' ? 'AC' : sub.verdict,
  language: sub.programmingLanguage,
  runtime: sub.timeConsumedMillis,
  memory: Math.round(sub.memoryConsumedBytes / 1024),
  submittedAt: new Date(sub.creationTimeSeconds * 1000).toISOString(),
  rating: sub.problem.rating,
  tags: sub.problem.tags,
  contestId: sub.problem.contestId,
}));

await fetch(`${baseUrl}/api/problem-solving/bulk-import`, {
  method: 'POST',
  body: JSON.stringify({ submissions: transformedSubmissions }),
});
```

#### Step 5b: Full Import Path (background.js:852-1050)

```javascript
// Process submissions one by one with source code extraction
for (const submission of submissions) {
  // 1. Open submission page in new tab
  const tab = await chrome.tabs.create({
    url: `https://codeforces.com/contest/${contestId}/submission/${submissionId}`,
    active: false,
  });

  // 2. Wait for content script to extract source code
  const sourceCode = await waitForSourceCodeExtraction(tab.id);

  // 3. Send to extension-sync endpoint (includes AI analysis)
  await fetch(`${baseUrl}/api/problem-solving/extension-sync`, {
    method: 'POST',
    body: JSON.stringify({
      ...transformedSubmission,
      sourceCode: sourceCode,
    }),
  });

  // 4. Close tab and continue
  await chrome.tabs.remove(tab.id);
}
```

#### Step 6: Content Script Source Extraction

**Codeforces (neupc-codeforces.js:150-300):**

```javascript
// Extracts from submission page DOM
function extractSourceCode() {
  // Try multiple selectors for different page layouts
  const codeElement =
    document.querySelector('#program-source-text') ||
    document.querySelector('.source-code') ||
    document.querySelector('pre#program-source-text');

  return codeElement?.textContent || null;
}
```

**AtCoder (neupc-atcoder.js:120-250):**

```javascript
function extractSourceCode() {
  const codeElement = document.querySelector('#submission-code');
  return codeElement?.textContent || null;
}
```

---

## 2. Data Sources

### 2.1 Codeforces API

**Endpoint:** `https://codeforces.com/api/user.status`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `handle` | string | Codeforces username |
| `from` | integer | 1-based index of first submission |
| `count` | integer | Number of submissions to fetch (max 10000) |

**Sample Request:**

```
GET https://codeforces.com/api/user.status?handle=tourist&from=1&count=100
```

**Sample Response:**

```json
{
  "status": "OK",
  "result": [
    {
      "id": 234567890,
      "contestId": 1900,
      "creationTimeSeconds": 1699123456,
      "relativeTimeSeconds": 2147483647,
      "problem": {
        "contestId": 1900,
        "index": "A",
        "name": "Cover in Water",
        "type": "PROGRAMMING",
        "points": 500.0,
        "rating": 800,
        "tags": ["constructive algorithms", "greedy", "implementation"]
      },
      "author": {
        "contestId": 1900,
        "members": [{ "handle": "tourist" }],
        "participantType": "CONTESTANT",
        "ghost": false,
        "startTimeSeconds": 1699120000
      },
      "programmingLanguage": "GNU C++20 (64)",
      "verdict": "OK",
      "testset": "TESTS",
      "passedTestCount": 10,
      "timeConsumedMillis": 31,
      "memoryConsumedBytes": 262144
    }
  ]
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique submission ID |
| `contestId` | integer | Contest ID |
| `creationTimeSeconds` | integer | Unix timestamp |
| `problem.index` | string | Problem letter (A, B, C...) |
| `problem.name` | string | Problem title |
| `problem.rating` | integer | Difficulty rating (800-3500) |
| `problem.tags` | array | Problem categories |
| `programmingLanguage` | string | Language used |
| `verdict` | string | Result (OK, WRONG_ANSWER, etc.) |
| `timeConsumedMillis` | integer | Runtime in milliseconds |
| `memoryConsumedBytes` | integer | Memory usage in bytes |

**Verdict Values:**

- `OK` - Accepted
- `WRONG_ANSWER` - Wrong Answer
- `TIME_LIMIT_EXCEEDED` - TLE
- `MEMORY_LIMIT_EXCEEDED` - MLE
- `RUNTIME_ERROR` - RE
- `COMPILATION_ERROR` - CE
- `SKIPPED` - Skipped
- `TESTING` - Still being judged

---

### 2.2 AtCoder Kenkoooo API

**Endpoint:** `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions`

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | string | AtCoder username |
| `from_second` | integer | Unix timestamp to fetch from |

**Sample Request:**

```
GET https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=tourist&from_second=0
```

**Sample Response:**

```json
[
  {
    "id": 45678901,
    "epoch_second": 1699123456,
    "problem_id": "abc320_a",
    "contest_id": "abc320",
    "user_id": "tourist",
    "language": "C++ 20 (gcc 12.2)",
    "point": 100.0,
    "length": 234,
    "result": "AC",
    "execution_time": 1
  },
  {
    "id": 45678900,
    "epoch_second": 1699123400,
    "problem_id": "abc320_b",
    "contest_id": "abc320",
    "user_id": "tourist",
    "language": "C++ 20 (gcc 12.2)",
    "point": 200.0,
    "length": 456,
    "result": "WA",
    "execution_time": 2
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique submission ID |
| `epoch_second` | integer | Unix timestamp |
| `problem_id` | string | Problem identifier (e.g., "abc320_a") |
| `contest_id` | string | Contest identifier |
| `user_id` | string | Username |
| `language` | string | Programming language |
| `point` | float | Points earned |
| `length` | integer | Code length in bytes |
| `result` | string | Verdict (AC, WA, TLE, etc.) |
| `execution_time` | integer | Runtime in milliseconds |

**Note:** AtCoder Kenkoooo API does NOT include:

- Problem names (must be fetched separately or stored)
- Problem difficulty ratings
- Memory usage
- Problem tags

---

### 2.3 Authentication: Extension Token

The extension authenticates with the backend using a token stored in the user's profile.

**Token Format:**

```
neupc_[a-zA-Z0-9]{64+}
```

**Example:**

```
neupc_a7b3c9d2e4f6g8h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6
```

**Storage Location:**

- Browser extension: `chrome.storage.local`
- Database: `users.extension_token` column

**Header Usage:**

```javascript
headers: {
  "Content-Type": "application/json",
  "x-extension-token": extensionToken
}
```

---

## 3. Data Transformation

### 3.1 Codeforces Transformations

**Source:** `background.js:752-850`

```javascript
function transformCodeforcesSubmission(cfSubmission) {
  return {
    // Identity
    platform: 'codeforces',
    submissionId: String(cfSubmission.id),

    // Problem identification
    problemId: `${cfSubmission.problem.contestId}${cfSubmission.problem.index}`,
    problemName: cfSubmission.problem.name,
    contestId: cfSubmission.problem.contestId,

    // Verdict normalization
    verdict: cfSubmission.verdict === 'OK' ? 'AC' : cfSubmission.verdict,

    // Language (passed through)
    language: cfSubmission.programmingLanguage,

    // Performance metrics
    runtime: cfSubmission.timeConsumedMillis,
    memory: Math.round(cfSubmission.memoryConsumedBytes / 1024), // bytes → KB

    // Timestamp conversion
    submittedAt: new Date(
      cfSubmission.creationTimeSeconds * 1000
    ).toISOString(),

    // Problem metadata
    rating: cfSubmission.problem.rating || null,
    tags: cfSubmission.problem.tags || [],
  };
}
```

**Field Mapping Table:**

| Codeforces Field                      | NEUPC Field    | Transformation                |
| ------------------------------------- | -------------- | ----------------------------- |
| `id`                                  | `submissionId` | Convert to string             |
| `problem.contestId` + `problem.index` | `problemId`    | Concatenate (e.g., "1900A")   |
| `problem.name`                        | `problemName`  | Direct copy                   |
| `problem.contestId`                   | `contestId`    | Direct copy                   |
| `verdict`                             | `verdict`      | "OK" → "AC", others unchanged |
| `programmingLanguage`                 | `language`     | Direct copy                   |
| `timeConsumedMillis`                  | `runtime`      | Direct copy (ms)              |
| `memoryConsumedBytes`                 | `memory`       | Divide by 1024, round (→ KB)  |
| `creationTimeSeconds`                 | `submittedAt`  | Unix seconds → ISO 8601       |
| `problem.rating`                      | `rating`       | Direct copy or null           |
| `problem.tags`                        | `tags`         | Direct copy or empty array    |

---

### 3.2 AtCoder Transformations

**Source:** `background.js:650-750`

```javascript
function transformAtCoderSubmission(acSubmission) {
  return {
    // Identity
    platform: 'atcoder',
    submissionId: String(acSubmission.id),

    // Problem identification
    problemId: acSubmission.problem_id,
    problemName: null, // Not available in API
    contestId: acSubmission.contest_id,

    // Verdict (already normalized in API)
    verdict: acSubmission.result,

    // Language
    language: acSubmission.language,

    // Performance metrics
    runtime: acSubmission.execution_time,
    memory: null, // Not available in API

    // Timestamp conversion
    submittedAt: new Date(acSubmission.epoch_second * 1000).toISOString(),

    // Problem metadata (not available)
    rating: null,
    tags: [],
  };
}
```

**Field Mapping Table:**

| AtCoder Field    | NEUPC Field    | Transformation          |
| ---------------- | -------------- | ----------------------- |
| `id`             | `submissionId` | Convert to string       |
| `problem_id`     | `problemId`    | Direct copy             |
| N/A              | `problemName`  | null (not in API)       |
| `contest_id`     | `contestId`    | Direct copy             |
| `result`         | `verdict`      | Direct copy             |
| `language`       | `language`     | Direct copy             |
| `execution_time` | `runtime`      | Direct copy (ms)        |
| N/A              | `memory`       | null (not in API)       |
| `epoch_second`   | `submittedAt`  | Unix seconds → ISO 8601 |
| N/A              | `rating`       | null (not in API)       |
| N/A              | `tags`         | Empty array             |

---

### 3.3 Language Normalization

**Source:** `app/_lib/problem-solving-v2-helpers.js:200-350`

The backend normalizes language strings to standardized IDs:

```javascript
const LANGUAGE_MAP = {
  // C++
  'GNU C++': 'cpp',
  'GNU C++11': 'cpp',
  'GNU C++14': 'cpp',
  'GNU C++17': 'cpp',
  'GNU C++17 (64)': 'cpp',
  'GNU C++20 (64)': 'cpp',
  'C++ 20 (gcc 12.2)': 'cpp',
  'C++ (GCC 9.2.1)': 'cpp',

  // Python
  'Python 2': 'python',
  'Python 3': 'python',
  'PyPy 2': 'python',
  'PyPy 3': 'python',
  'PyPy 3-64': 'python',

  // Java
  'Java 8': 'java',
  'Java 11': 'java',
  'Java 17': 'java',
  'Java (OpenJDK 11.0.6)': 'java',

  // Others
  Rust: 'rust',
  Go: 'go',
  Kotlin: 'kotlin',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
};

function getLanguageId(rawLanguage) {
  // Exact match
  if (LANGUAGE_MAP[rawLanguage]) {
    return LANGUAGE_MAP[rawLanguage];
  }

  // Partial match
  const lower = rawLanguage.toLowerCase();
  if (lower.includes('c++') || lower.includes('cpp')) return 'cpp';
  if (lower.includes('python') || lower.includes('pypy')) return 'python';
  if (lower.includes('java')) return 'java';
  if (lower.includes('rust')) return 'rust';

  return 'other';
}
```

---

### 3.4 Verdict Normalization

**Standardized Verdict Codes:**

| External Verdict        | Internal Code | Description           |
| ----------------------- | ------------- | --------------------- |
| `OK` (CF)               | `AC`          | Accepted              |
| `AC` (AC)               | `AC`          | Accepted              |
| `WRONG_ANSWER`          | `WA`          | Wrong Answer          |
| `WA`                    | `WA`          | Wrong Answer          |
| `TIME_LIMIT_EXCEEDED`   | `TLE`         | Time Limit Exceeded   |
| `TLE`                   | `TLE`         | Time Limit Exceeded   |
| `MEMORY_LIMIT_EXCEEDED` | `MLE`         | Memory Limit Exceeded |
| `MLE`                   | `MLE`         | Memory Limit Exceeded |
| `RUNTIME_ERROR`         | `RE`          | Runtime Error         |
| `RE`                    | `RE`          | Runtime Error         |
| `COMPILATION_ERROR`     | `CE`          | Compilation Error     |
| `CE`                    | `CE`          | Compilation Error     |

---

## 4. Backend Processing

### 4.1 Endpoint: `/api/problem-solving/bulk-import`

**Source:** `app/api/problem-solving/bulk-import/route.js`

**Purpose:** Batch import multiple submissions without source code.

**Request:**

```http
POST /api/problem-solving/bulk-import
Content-Type: application/json
x-extension-token: neupc_...

{
  "submissions": [
    {
      "platform": "codeforces",
      "submissionId": "234567890",
      "problemId": "1900A",
      "problemName": "Cover in Water",
      "verdict": "AC",
      "language": "GNU C++20 (64)",
      "runtime": 31,
      "memory": 256,
      "submittedAt": "2023-11-04T12:30:56.000Z",
      "rating": 800,
      "tags": ["constructive algorithms", "greedy"],
      "contestId": 1900
    }
  ]
}
```

**Processing Flow:**

```
Request Received
       │
       ▼
┌──────────────────┐
│ 1. Authenticate  │ Validate extension token
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Get Platform  │ Cache lookup: "codeforces" → platform_id: 1
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Upsert        │ For each unique problem:
│    Problems      │ INSERT INTO problems ON CONFLICT DO UPDATE
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Upsert Tags   │ INSERT INTO tags, problem_tags
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Insert        │ INSERT INTO submissions
│    Submissions   │ ON CONFLICT (external_submission_id) DO NOTHING
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Update        │ For each problem with AC:
│    user_solves   │ INSERT/UPDATE user_solves (first_ac, best times)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. Return        │ { imported: 50, skipped: 10, errors: [] }
│    Summary       │
└──────────────────┘
```

**Key SQL Operations:**

```sql
-- Upsert problem
INSERT INTO problems (platform_id, external_id, name, difficulty, url)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (platform_id, external_id)
DO UPDATE SET name = EXCLUDED.name, difficulty = EXCLUDED.difficulty
RETURNING id;

-- Insert submission (skip duplicates)
INSERT INTO submissions (
  user_id, problem_id, external_submission_id,
  verdict, language_id, runtime_ms, memory_kb, submitted_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (user_id, external_submission_id) DO NOTHING;

-- Update user_solves on AC
INSERT INTO user_solves (user_id, problem_id, solved, first_ac_at, best_runtime_ms, best_memory_kb)
VALUES ($1, $2, true, $3, $4, $5)
ON CONFLICT (user_id, problem_id) DO UPDATE SET
  solved = true,
  first_ac_at = LEAST(user_solves.first_ac_at, EXCLUDED.first_ac_at),
  best_runtime_ms = LEAST(user_solves.best_runtime_ms, EXCLUDED.best_runtime_ms),
  best_memory_kb = LEAST(user_solves.best_memory_kb, EXCLUDED.best_memory_kb);
```

**Response:**

```json
{
  "success": true,
  "imported": 50,
  "skipped": 10,
  "errors": []
}
```

---

### 4.2 Endpoint: `/api/problem-solving/extension-sync`

**Source:** `app/api/problem-solving/extension-sync/route.js`

**Purpose:** Sync single submission with source code; triggers AI analysis.

**Request:**

```http
POST /api/problem-solving/extension-sync
Content-Type: application/json
x-extension-token: neupc_...

{
  "platform": "codeforces",
  "submissionId": "234567890",
  "problemId": "1900A",
  "problemName": "Cover in Water",
  "verdict": "AC",
  "language": "GNU C++20 (64)",
  "runtime": 31,
  "memory": 256,
  "submittedAt": "2023-11-04T12:30:56.000Z",
  "sourceCode": "#include <bits/stdc++.h>\nusing namespace std;\n...",
  "rating": 800,
  "tags": ["constructive algorithms", "greedy"]
}
```

**Processing Flow:**

```
Request Received
       │
       ▼
┌──────────────────┐
│ 1. Authenticate  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Upsert        │
│    Problem       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Insert        │
│    Submission    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Update        │ If verdict === "AC"
│    user_solves   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Store         │ INSERT INTO solutions
│    Source Code   │ (user_solve_id, code, language_id)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Queue AI      │ Async: analyze code complexity,
│    Analysis      │ patterns, suggestions
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. Return        │
│    Result        │
└──────────────────┘
```

**Response:**

```json
{
  "success": true,
  "submissionId": "234567890",
  "problemId": 12345,
  "userSolveId": 67890,
  "analysisQueued": true
}
```

---

### 4.3 Endpoint: `/api/problem-solving/existing-submissions`

**Source:** `app/api/problem-solving/existing-submissions/route.js`

**Purpose:** Return submission IDs already imported for deduplication.

**Request:**

```http
POST /api/problem-solving/existing-submissions
Content-Type: application/json
x-extension-token: neupc_...

{
  "platform": "codeforces"
}
```

**Processing:**

```sql
SELECT external_submission_id
FROM submissions s
JOIN problems p ON s.problem_id = p.id
WHERE s.user_id = $1 AND p.platform_id = $2;
```

**Response:**

```json
{
  "existingSubmissionIds": ["234567890", "234567891", "234567892"]
}
```

---

### 4.4 Endpoint: `/api/problem-solving/sync-status`

**Source:** `app/api/problem-solving/sync-status/route.js`

**Purpose:** Get user's platform handles and last sync timestamps.

**Request:**

```http
GET /api/problem-solving/sync-status
x-extension-token: neupc_...
```

**Response:**

```json
{
  "handles": {
    "codeforces": {
      "handle": "tourist",
      "lastSync": "2023-11-04T12:30:56.000Z",
      "totalSubmissions": 5432
    },
    "atcoder": {
      "handle": "tourist",
      "lastSync": "2023-11-03T10:00:00.000Z",
      "totalSubmissions": 2100
    }
  }
}
```

---

### 4.5 Error Handling

**Authentication Errors:**

```json
{
  "error": "Invalid or expired extension token",
  "code": "AUTH_FAILED",
  "status": 401
}
```

**Rate Limiting:**

```json
{
  "error": "Rate limit exceeded. Please wait before retrying.",
  "code": "RATE_LIMITED",
  "retryAfter": 60,
  "status": 429
}
```

**Validation Errors:**

```json
{
  "error": "Invalid submission data",
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "problemId", "message": "Required field missing" }],
  "status": 400
}
```

**Partial Success (Bulk Import):**

```json
{
  "success": true,
  "imported": 45,
  "skipped": 5,
  "errors": [{ "submissionId": "123", "error": "Invalid verdict value" }]
}
```

---

## 5. Database Schema (V2)

### 5.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  platforms  │       │    users    │       │  languages  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ code        │       │ email       │       │ code        │
│ name        │       │ ext_token   │       │ name        │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │    ┌────────────────┼────────────────┐    │
       │    │                │                │    │
       ▼    ▼                ▼                ▼    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    problems     │   │  user_handles   │   │  submissions    │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ id (PK)         │   │ id (PK)         │   │ id (PK)         │
│ platform_id(FK) │◄──│ user_id (FK)    │   │ user_id (FK)    │
│ external_id     │   │ platform_id(FK) │   │ problem_id (FK) │
│ name            │   │ handle          │   │ language_id(FK) │
│ difficulty      │   │ verified        │   │ ext_sub_id      │
│ url             │   └─────────────────┘   │ verdict         │
└────────┬────────┘                         │ runtime_ms      │
         │                                  │ memory_kb       │
         │         ┌─────────────────┐      │ submitted_at    │
         │         │   user_solves   │      └─────────────────┘
         │         ├─────────────────┤
         └────────►│ id (PK)         │
                   │ user_id (FK)    │
                   │ problem_id (FK) │
                   │ solved          │
                   │ first_ac_at     │
                   │ best_runtime    │
                   │ best_memory     │
                   │ attempt_count   │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   solutions     │
                   ├─────────────────┤
                   │ id (PK)         │
                   │ user_solve_id   │
                   │ code            │
                   │ language_id     │
                   │ ai_analysis     │
                   └─────────────────┘

┌─────────────┐       ┌─────────────────┐
│    tags     │       │  problem_tags   │
├─────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ tag_id (FK)     │
│ name        │       │ problem_id (FK) │
│ slug        │       └─────────────────┘
└─────────────┘
```

---

### 5.2 Table Definitions

#### `platforms`

Stores supported competitive programming platforms.

```sql
CREATE TABLE platforms (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code VARCHAR(20) NOT NULL UNIQUE,      -- "codeforces", "atcoder"
  name VARCHAR(100) NOT NULL,            -- "Codeforces", "AtCoder"
  base_url VARCHAR(255),                 -- "https://codeforces.com"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO platforms (code, name, base_url) VALUES
  ('codeforces', 'Codeforces', 'https://codeforces.com'),
  ('atcoder', 'AtCoder', 'https://atcoder.jp'),
  ('leetcode', 'LeetCode', 'https://leetcode.com');
```

| Column       | Type         | Constraints        | Description         |
| ------------ | ------------ | ------------------ | ------------------- |
| `id`         | SMALLINT     | PK, auto-increment | Platform identifier |
| `code`       | VARCHAR(20)  | NOT NULL, UNIQUE   | URL-safe slug       |
| `name`       | VARCHAR(100) | NOT NULL           | Display name        |
| `base_url`   | VARCHAR(255) |                    | Platform URL        |
| `created_at` | TIMESTAMPTZ  | DEFAULT NOW()      | Creation timestamp  |

---

#### `problems`

Stores problem metadata from all platforms.

```sql
CREATE TABLE problems (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  platform_id SMALLINT NOT NULL REFERENCES platforms(id),
  external_id VARCHAR(50) NOT NULL,      -- "1900A", "abc320_a"
  name VARCHAR(500),                     -- Problem title
  difficulty INTEGER,                    -- Rating/difficulty score
  url VARCHAR(500),                      -- Direct link to problem
  contest_id VARCHAR(50),                -- "1900", "abc320"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform_id, external_id)
);

CREATE INDEX idx_problems_platform ON problems(platform_id);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_contest ON problems(contest_id);
```

| Column        | Type         | Constraints        | Description              |
| ------------- | ------------ | ------------------ | ------------------------ |
| `id`          | BIGINT       | PK, auto-increment | Internal problem ID      |
| `platform_id` | SMALLINT     | FK → platforms     | Source platform          |
| `external_id` | VARCHAR(50)  | NOT NULL           | Platform's problem ID    |
| `name`        | VARCHAR(500) |                    | Problem title            |
| `difficulty`  | INTEGER      |                    | Rating (800-3500 for CF) |
| `url`         | VARCHAR(500) |                    | Direct problem link      |
| `contest_id`  | VARCHAR(50)  |                    | Parent contest ID        |
| `created_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | First import time        |
| `updated_at`  | TIMESTAMPTZ  | DEFAULT NOW()      | Last metadata update     |

---

#### `languages`

Programming language lookup table.

```sql
CREATE TABLE languages (
  id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code VARCHAR(30) NOT NULL UNIQUE,      -- "cpp", "python", "java"
  name VARCHAR(100) NOT NULL,            -- "C++", "Python", "Java"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO languages (code, name) VALUES
  ('cpp', 'C++'),
  ('python', 'Python'),
  ('java', 'Java'),
  ('javascript', 'JavaScript'),
  ('rust', 'Rust'),
  ('go', 'Go'),
  ('kotlin', 'Kotlin'),
  ('other', 'Other');
```

| Column | Type         | Constraints        | Description         |
| ------ | ------------ | ------------------ | ------------------- |
| `id`   | SMALLINT     | PK, auto-increment | Language identifier |
| `code` | VARCHAR(30)  | NOT NULL, UNIQUE   | Normalized code     |
| `name` | VARCHAR(100) | NOT NULL           | Display name        |

---

#### `tags`

Problem categories and topics.

```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL,            -- "Dynamic Programming"
  slug VARCHAR(100) NOT NULL UNIQUE,     -- "dynamic-programming"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
```

| Column | Type         | Constraints        | Description         |
| ------ | ------------ | ------------------ | ------------------- |
| `id`   | INTEGER      | PK, auto-increment | Tag identifier      |
| `name` | VARCHAR(100) | NOT NULL           | Display name        |
| `slug` | VARCHAR(100) | NOT NULL, UNIQUE   | URL-safe identifier |

---

#### `problem_tags`

Many-to-many relationship between problems and tags.

```sql
CREATE TABLE problem_tags (
  problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  PRIMARY KEY (problem_id, tag_id)
);

CREATE INDEX idx_problem_tags_tag ON problem_tags(tag_id);
```

| Column       | Type    | Constraints       | Description       |
| ------------ | ------- | ----------------- | ----------------- |
| `problem_id` | BIGINT  | FK → problems, PK | Problem reference |
| `tag_id`     | INTEGER | FK → tags, PK     | Tag reference     |

---

#### `user_handles`

Links users to their platform accounts.

```sql
CREATE TABLE user_handles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id SMALLINT NOT NULL REFERENCES platforms(id),
  handle VARCHAR(100) NOT NULL,          -- "tourist"
  verified BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform_id)
);

CREATE INDEX idx_user_handles_user ON user_handles(user_id);
CREATE INDEX idx_user_handles_platform ON user_handles(platform_id);
```

| Column         | Type         | Constraints        | Description           |
| -------------- | ------------ | ------------------ | --------------------- |
| `id`           | BIGINT       | PK, auto-increment | Handle record ID      |
| `user_id`      | UUID         | FK → auth.users    | NEUPC user            |
| `platform_id`  | SMALLINT     | FK → platforms     | Platform reference    |
| `handle`       | VARCHAR(100) | NOT NULL           | Platform username     |
| `verified`     | BOOLEAN      | DEFAULT FALSE      | Ownership verified    |
| `last_sync_at` | TIMESTAMPTZ  |                    | Last import timestamp |

---

#### `submissions`

Raw submission records from all platforms.

```sql
CREATE TABLE submissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id BIGINT NOT NULL REFERENCES problems(id),
  external_submission_id VARCHAR(50) NOT NULL,  -- Platform's submission ID
  language_id SMALLINT REFERENCES languages(id),
  verdict VARCHAR(20) NOT NULL,          -- "AC", "WA", "TLE", etc.
  runtime_ms INTEGER,                    -- Execution time in milliseconds
  memory_kb INTEGER,                     -- Memory usage in KB
  submitted_at TIMESTAMPTZ NOT NULL,     -- When submitted on platform
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- When imported to NEUPC

  UNIQUE(user_id, external_submission_id)
);

CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);
CREATE INDEX idx_submissions_submitted ON submissions(submitted_at);
```

| Column                   | Type        | Constraints        | Description              |
| ------------------------ | ----------- | ------------------ | ------------------------ |
| `id`                     | BIGINT      | PK, auto-increment | Internal submission ID   |
| `user_id`                | UUID        | FK → auth.users    | Submitting user          |
| `problem_id`             | BIGINT      | FK → problems      | Problem reference        |
| `external_submission_id` | VARCHAR(50) | NOT NULL           | Platform's ID            |
| `language_id`            | SMALLINT    | FK → languages     | Programming language     |
| `verdict`                | VARCHAR(20) | NOT NULL           | Result code              |
| `runtime_ms`             | INTEGER     |                    | Execution time           |
| `memory_kb`              | INTEGER     |                    | Memory usage             |
| `submitted_at`           | TIMESTAMPTZ | NOT NULL           | Original submission time |
| `created_at`             | TIMESTAMPTZ | DEFAULT NOW()      | Import timestamp         |

---

#### `user_solves`

Tracks per-user, per-problem solve status and best metrics.

```sql
CREATE TABLE user_solves (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id BIGINT NOT NULL REFERENCES problems(id),
  solved BOOLEAN DEFAULT FALSE,
  first_ac_at TIMESTAMPTZ,               -- First accepted submission
  best_runtime_ms INTEGER,               -- Best execution time
  best_memory_kb INTEGER,                -- Best memory usage
  attempt_count INTEGER DEFAULT 0,       -- Total submission count
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, problem_id)
);

CREATE INDEX idx_user_solves_user ON user_solves(user_id);
CREATE INDEX idx_user_solves_problem ON user_solves(problem_id);
CREATE INDEX idx_user_solves_solved ON user_solves(solved);
```

| Column            | Type        | Constraints        | Description        |
| ----------------- | ----------- | ------------------ | ------------------ |
| `id`              | BIGINT      | PK, auto-increment | Solve record ID    |
| `user_id`         | UUID        | FK → auth.users    | User reference     |
| `problem_id`      | BIGINT      | FK → problems      | Problem reference  |
| `solved`          | BOOLEAN     | DEFAULT FALSE      | Has AC submission  |
| `first_ac_at`     | TIMESTAMPTZ |                    | First AC timestamp |
| `best_runtime_ms` | INTEGER     |                    | Fastest AC runtime |
| `best_memory_kb`  | INTEGER     |                    | Lowest AC memory   |
| `attempt_count`   | INTEGER     | DEFAULT 0          | Total attempts     |

---

#### `solutions`

Stores source code for AC submissions.

```sql
CREATE TABLE solutions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_solve_id BIGINT NOT NULL REFERENCES user_solves(id) ON DELETE CASCADE,
  submission_id BIGINT REFERENCES submissions(id),
  code TEXT NOT NULL,                    -- Source code
  language_id SMALLINT REFERENCES languages(id),
  ai_analysis JSONB,                     -- AI-generated insights
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solutions_user_solve ON solutions(user_solve_id);
CREATE INDEX idx_solutions_submission ON solutions(submission_id);
```

| Column          | Type     | Constraints        | Description         |
| --------------- | -------- | ------------------ | ------------------- |
| `id`            | BIGINT   | PK, auto-increment | Solution ID         |
| `user_solve_id` | BIGINT   | FK → user_solves   | Parent solve record |
| `submission_id` | BIGINT   | FK → submissions   | Source submission   |
| `code`          | TEXT     | NOT NULL           | Source code content |
| `language_id`   | SMALLINT | FK → languages     | Code language       |
| `ai_analysis`   | JSONB    |                    | AI insights         |

**AI Analysis Schema:**

```json
{
  "complexity": {
    "time": "O(n log n)",
    "space": "O(n)"
  },
  "patterns": ["sorting", "binary-search", "two-pointers"],
  "suggestions": ["Consider using a hash map for O(1) lookups"],
  "analyzedAt": "2023-11-04T12:35:00.000Z"
}
```

---

### 5.3 Users Table Extension

The existing `auth.users` table is extended with:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  extension_token VARCHAR(100) UNIQUE;

CREATE INDEX idx_users_extension_token ON users(extension_token);
```

| Column            | Type         | Constraints | Description            |
| ----------------- | ------------ | ----------- | ---------------------- |
| `extension_token` | VARCHAR(100) | UNIQUE      | Browser extension auth |

---

### 5.4 Useful Queries

**Get user's solve statistics:**

```sql
SELECT
  p.platform_id,
  pl.name as platform_name,
  COUNT(*) as total_solved,
  AVG(us.best_runtime_ms) as avg_runtime,
  MIN(us.first_ac_at) as first_solve,
  MAX(us.first_ac_at) as last_solve
FROM user_solves us
JOIN problems p ON us.problem_id = p.id
JOIN platforms pl ON p.platform_id = pl.id
WHERE us.user_id = $1 AND us.solved = true
GROUP BY p.platform_id, pl.name;
```

**Get problems by difficulty with solve status:**

```sql
SELECT
  p.external_id,
  p.name,
  p.difficulty,
  COALESCE(us.solved, false) as solved,
  array_agg(t.name) as tags
FROM problems p
LEFT JOIN user_solves us ON p.id = us.problem_id AND us.user_id = $1
LEFT JOIN problem_tags pt ON p.id = pt.problem_id
LEFT JOIN tags t ON pt.tag_id = t.id
WHERE p.platform_id = $2
GROUP BY p.id, us.solved
ORDER BY p.difficulty;
```

**Get submission history for a problem:**

```sql
SELECT
  s.external_submission_id,
  s.verdict,
  s.runtime_ms,
  s.memory_kb,
  s.submitted_at,
  l.name as language
FROM submissions s
JOIN languages l ON s.language_id = l.id
WHERE s.user_id = $1 AND s.problem_id = $2
ORDER BY s.submitted_at DESC;
```

---

## Appendix A: File Reference

| File                                                           | Purpose                         |
| -------------------------------------------------------------- | ------------------------------- |
| `browser-extension/background.js`                              | Import orchestration, API calls |
| `browser-extension/popup.html`                                 | Import UI                       |
| `browser-extension/popup.js`                                   | UI interaction                  |
| `browser-extension/content-scripts/group1/neupc-codeforces.js` | CF source extraction            |
| `browser-extension/content-scripts/group1/neupc-atcoder.js`    | AC source extraction            |
| `app/api/problem-solving/bulk-import/route.js`                 | Batch import endpoint           |
| `app/api/problem-solving/extension-sync/route.js`              | Single sync + AI                |
| `app/api/problem-solving/sync-status/route.js`                 | User handles                    |
| `app/api/problem-solving/existing-submissions/route.js`        | Deduplication                   |
| `app/_lib/problem-solving-v2-helpers.js`                       | Schema helpers                  |

---

## Appendix B: Glossary

| Term             | Definition                                             |
| ---------------- | ------------------------------------------------------ |
| **AC**           | Accepted - submission passed all test cases            |
| **External ID**  | Problem/submission identifier from source platform     |
| **Handle**       | Username on competitive programming platform           |
| **Quick Import** | Metadata-only import (no source code)                  |
| **Full Import**  | Import with source code extraction via browser tabs    |
| **User Solve**   | Record tracking a user's attempts/success on a problem |
| **V2 Schema**    | Normalized database schema with proper relationships   |
