# Extension Data Fields - Quick Reference

## Database Schema Mapping

This document shows EXACTLY what data the browser extension collects and where it's stored in your database.

---

## 1. Submission Data → `problem_submissions` table

| Extension Field     | Database Column     | Type      | Example                | Required |
| ------------------- | ------------------- | --------- | ---------------------- | -------- |
| `platform`          | `platform`          | text      | "codeforces"           | ✅       |
| `submission_id`     | `submission_id`     | text      | "123456789"            | ✅       |
| `problem_id`        | `problem_id`        | text      | "1850A"                | ✅       |
| `problem_name`      | `problem_name`      | text      | "Ten Words of Wisdom"  | ✅       |
| `problem_url`       | `problem_url`       | text      | "https://..."          | ✅       |
| `verdict`           | `verdict`           | text      | "AC" / "WA" / "TLE"    | ✅       |
| `language`          | `language`          | text      | "GNU C++20"            | ✅       |
| `execution_time_ms` | `execution_time_ms` | integer   | 156                    | ⚪       |
| `memory_kb`         | `memory_kb`         | integer   | 2048                   | ⚪       |
| `submitted_at`      | `submitted_at`      | timestamp | "2024-04-02T10:30:00Z" | ✅       |
| `user_id`           | `user_id`           | uuid      | (from auth)            | ✅       |

**Verdict Values:**

- `AC` - Accepted
- `WA` - Wrong Answer
- `TLE` - Time Limit Exceeded
- `MLE` - Memory Limit Exceeded
- `RE` - Runtime Error
- `CE` - Compilation Error
- `PE` - Presentation Error
- `SKIPPED` - Skipped
- `TESTING` - Testing
- `PARTIAL` - Partial Score

---

## 2. Source Code → `solutions` table

| Extension Field         | Database Column         | Type      | Example                | Required |
| ----------------------- | ----------------------- | --------- | ---------------------- | -------- |
| `source_code`           | `source_code`           | text      | "```cpp\n#include..."  | ✅       |
| `language`              | `language`              | text      | "GNU C++20"            | ✅       |
| `submission_id`         | `submission_id`         | text      | "123456789"            | ✅       |
| `user_problem_solve_id` | `user_problem_solve_id` | uuid      | (generated)            | ✅       |
| `version_number`        | `version_number`        | integer   | 1, 2, 3...             | ✅       |
| `submitted_at`          | `submitted_at`          | timestamp | "2024-04-02T10:30:00Z" | ⚪       |
| `ai_analysis_status`    | `ai_analysis_status`    | text      | "pending"              | ✅       |

---

## 3. Problem Metadata → `problems` table

| Extension Field       | Database Column       | Type    | Example                    | Required |
| --------------------- | --------------------- | ------- | -------------------------- | -------- |
| `problem_id`          | `problem_id`          | text    | "1850A"                    | ✅       |
| `problem_name`        | `problem_name`        | text    | "Ten Words of Wisdom"      | ✅       |
| `platform`            | `platform`            | text    | "codeforces"               | ✅       |
| `problem_url`         | `problem_url`         | text    | "https://..."              | ✅       |
| `problem_description` | `problem_description` | text    | "The problem statement..." | ⚪       |
| `difficulty_rating`   | `difficulty_rating`   | integer | 800, 1200, 1600...         | ⚪       |
| `tags`                | `tags`                | text[]  | ["greedy", "math"]         | ⚪       |
| `time_limit`          | `time_limit_ms`       | integer | 1000                       | ⚪       |
| `memory_limit`        | `memory_limit_mb`     | integer | 256                        | ⚪       |
| `input_format`        | `input_format`        | text    | "First line..."            | ⚪       |
| `output_format`       | `output_format`       | text    | "Print..."                 | ⚪       |
| `constraints`         | `constraints`         | text    | "1 ≤ n ≤ 10^5"             | ⚪       |
| `solved_count`        | `solved_count`        | integer | 5000                       | ⚪       |

---

## 4. User Problem Solve → `user_problem_solves` table

| Extension Field    | Database Column    | Type      | Example                | Required |
| ------------------ | ------------------ | --------- | ---------------------- | -------- |
| `user_id`          | `user_id`          | uuid      | (from auth)            | ✅       |
| `problem_id`       | `problem_id`       | text      | "1850A"                | ✅       |
| `platform`         | `platform`         | text      | "codeforces"           | ✅       |
| `solved_at`        | `solved_at`        | timestamp | "2024-04-02T10:30:00Z" | ✅       |
| `attempts`         | `attempts`         | integer   | 3                      | ✅       |
| `best_solution_id` | `best_solution_id` | uuid      | (from solutions)       | ⚪       |

---

## 5. Sample Test Cases (if available)

Stored as JSONB in `problems.sample_tests`:

```json
[
  {
    "input": "3\n5 1\n5 3\n2 100",
    "output": "100"
  },
  {
    "input": "2\n13 20\n10 15",
    "output": "20"
  }
]
```

---

## Extension Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SUBMITS CODE ON PLATFORM (e.g., Codeforces)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXTENSION CONTENT SCRIPT DETECTS SUBMISSION PAGE        │
│    - Extracts: submission_id, verdict, language, etc.      │
│    - Extracts: source code from <pre> tag                  │
│    - Extracts: problem metadata from page                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EXTENSION VALIDATES & NORMALIZES DATA                   │
│    - Normalizes verdict (WA → WA, Wrong Answer → WA)       │
│    - Normalizes language names                             │
│    - Converts dates to ISO 8601                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EXTENSION CHECKS CACHE                                  │
│    - If already synced → SKIP                              │
│    - If new → CONTINUE                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. EXTENSION SENDS TO BACKEND API                          │
│    POST /api/problem-solving/extension-sync                │
│    Authorization: Bearer <token>                           │
│    Body: { platform, problemId, submissionId, ... }        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. BACKEND PROCESSES REQUEST                               │
│    Step 1: Find or create problem in `problems` table      │
│    Step 2: Find or create user_problem_solve               │
│    Step 3: Insert submission into `problem_submissions`    │
│    Step 4: Insert source code into `solutions` table       │
│    Step 5: Trigger AI analysis (background job)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. EXTENSION RECEIVES RESPONSE                             │
│    - Success: Cache submission ID locally                  │
│    - Show notification: "Synced to NEUPC ✓"               │
│    - Update sync stats                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. USER SEES DATA IN NEUPC APP                            │
│    - Dashboard: Updated stats                              │
│    - Problem List: New submission appears                  │
│    - Analytics: Charts updated                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Platform-Specific Extraction Details

### Codeforces

**Submission Page:** `https://codeforces.com/contest/1850/submission/123456789`

```javascript
{
  submission_id: "123456789",                         // From URL
  problem_id: "1850A",                                 // From page header
  problem_name: "Ten Words of Wisdom",                 // From .problem-statement .title
  verdict: "AC",                                       // From .verdict-accepted / .verdict-rejected
  language: "GNU C++20 (64)",                          // From table row
  execution_time_ms: 156,                              // From "156 ms" text
  memory_kb: 2048,                                     // From "2048 KB" text
  source_code: "...",                                  // From <pre id="program-source-text">
  submitted_at: "2024-04-02 10:30:15",                // From submission time
  contest_id: "1850",                                  // From URL
  difficulty_rating: 800,                              // From problem page (separate fetch)
  tags: ["greedy", "constructive algorithms"],         // From problem page (separate fetch)
}
```

**CSS Selectors Used:**

```css
#program-source-text           /* Source code */
.verdict-accepted              /* Verdict */
.problem-statement .title      /* Problem name */
.time-consumed                 /* Execution time */
.memory-consumed               /* Memory used */
```

### AtCoder

**Submission Page:** `https://atcoder.jp/contests/abc300/submissions/41234567`

```javascript
{
  submission_id: "41234567",
  problem_id: "abc300_a",
  problem_name: "N-choice question",
  verdict: "AC",
  language: "C++ (GCC 9.2.1)",
  execution_time_ms: 6,
  memory_kb: 3064,
  source_code: "...",
  submitted_at: "2024-04-02 10:30:15",
  contest_id: "abc300",
}
```

**CSS Selectors:**

```css
#submission-code               /* Source code */
span.label-success             /* AC verdict */
span.label-warning             /* WA/TLE verdict */
```

### LeetCode

**Submission Page:** `https://leetcode.com/submissions/detail/123456789/`

```javascript
{
  submission_id: "123456789",
  problem_id: "two-sum",
  problem_name: "Two Sum",
  verdict: "Accepted",
  language: "C++",
  execution_time_ms: 12,
  memory_kb: 10240,
  source_code: "...",                        // From API call
  submitted_at: "2024-04-02 10:30:15",
  difficulty_rating: null,                   // Easy/Medium/Hard (not numeric)
  tags: ["array", "hash-table"],
}
```

**Data Source:** GraphQL API

```graphql
query submissionDetails($submissionId: Int!) {
  submissionDetail(submissionId: $submissionId) {
    code
    statusDisplay
    lang
    runtime
    memory
    timestamp
  }
}
```

---

## What is NOT Collected

❌ **Never Collected:**

- Passwords or credentials
- Email addresses
- Private messages
- Browser history (outside CP platforms)
- Payment information
- Personal identification
- Location data
- Webcam/microphone access
- File system access
- Other tabs/windows

❌ **Not Stored Long-Term:**

- Session cookies (only used for auth check)
- Platform tokens (if needed, only stored encrypted)

✅ **Only Collected:**

- Public competitive programming data
- Data you explicitly submit on CP platforms
- Data visible on your public profile

---

## Data Retention

### Local Storage (Browser Extension):

- **Submission cache:** Max 1000 per platform (FIFO)
- **Sync stats:** Last 30 days
- **Cleared when:** Extension removed or settings reset

### Backend Database:

- **Submissions:** Indefinite (user controls)
- **Source code:** Indefinite (user controls)
- **AI analysis:** Indefinite (can be regenerated)
- **User can:** Export, delete, or anonymize data anytime

---

## Privacy Controls

### Extension Settings:

```javascript
{
  // Master switches
  syncEnabled: true,              // Enable/disable all syncing
  autoSync: true,                 // Auto-sync on page visit

  // Data options
  captureSourceCode: true,        // Include source code
  captureProblemDescription: true,// Include problem text
  captureTestCases: false,        // Include test cases

  // Per-platform toggles
  platforms: {
    codeforces: true,
    atcoder: false,               // Disable specific platforms
    leetcode: true
  }
}
```

### User Rights:

- ✅ View all collected data
- ✅ Export data in JSON format
- ✅ Delete specific submissions
- ✅ Delete all data
- ✅ Disable extension completely

---

## Compliance

### GDPR Compliance:

- ✅ Data minimization (only CP data)
- ✅ Purpose limitation (only for tracking)
- ✅ Storage limitation (user controls)
- ✅ Data portability (export feature)
- ✅ Right to erasure (delete feature)

### Open Source:

- ✅ Full source code available
- ✅ No telemetry or tracking
- ✅ Self-hosted backend
- ✅ Community auditable

---

**Legend:**  
✅ Required field  
⚪ Optional field  
❌ Never collected
