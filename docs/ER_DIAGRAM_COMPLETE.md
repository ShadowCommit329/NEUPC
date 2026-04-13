# Problem Solving Module - Complete ER Diagram Documentation

**Last Updated:** April 8, 2026  
**Schema Version:** V2 (Normalized)  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Visual ER Diagram](#visual-er-diagram)
3. [Entity Descriptions](#entity-descriptions)
4. [Relationships](#relationships)
5. [Data Flow](#data-flow)
6. [Indexing Strategy](#indexing-strategy)
7. [Sample Queries](#sample-queries)
8. [Schema Evolution](#schema-evolution)

---

## Overview

The Problem Solving module uses a **normalized V2 schema** designed to track competitive programming activity across 41+ platforms. The schema supports:

- ✅ Multi-platform submission tracking
- ✅ Contest participation and rating history
- ✅ Solution versioning with source code storage
- ✅ AI-powered code analysis
- ✅ User statistics and leaderboards
- ✅ Incremental sync with checkpointing

### Design Principles

1. **Normalization**: Foreign keys to `platforms`, `users`, `problems` to avoid data duplication
2. **Unique Constraints**: Prevent duplicate submissions, solves, and contest records
3. **Soft References**: Some denormalized fields (e.g., `problem_name` in `submissions`) for performance
4. **JSONB Flexibility**: Use JSONB for semi-structured data (tags, problem examples, tutorial solutions)
5. **Timestamps**: All tables track `created_at` and `updated_at` for auditing

---

## Visual ER Diagram

```
┌─────────────────────┐
│      users          │
│─────────────────────│
│ id (PK)            │◄────────────┐
│ email              │             │
│ full_name          │             │
│ avatar_url         │             │
│ role               │             │
└─────────────────────┘             │
                                    │
                                    │ 1:N
                                    │
┌─────────────────────┐             │
│    platforms        │             │
│─────────────────────│             │
│ id (PK)            │◄────┐       │
│ code (UNIQUE)      │     │       │
│ name               │     │       │
│ url                │     │       │
│ api_available      │     │       │
│ icon_url           │     │       │
└─────────────────────┘     │       │
         │                  │       │
         │ 1:N              │       │
         │                  │       │
         ▼                  │       │
┌─────────────────────┐     │       │
│   user_handles      │     │       │
│─────────────────────│     │       │
│ id (PK)            │     │       │
│ user_id (FK)       │─────┼───────┘
│ platform_id (FK)   │─────┘
│ handle             │
│ current_rating     │
│ max_rating         │
│ is_primary         │
│ is_verified        │
│ last_synced_at     │
│ UNIQUE(user_id,    │
│   platform_id)     │
└─────────────────────┘
         │
         │ 1:1 (per platform)
         │
         ▼
┌─────────────────────┐
│  sync_checkpoints   │
│─────────────────────│
│ id (PK)            │
│ user_id (FK)       │
│ platform (varchar) │  ← Note: Uses platform code, not FK
│ sync_status        │
│ sync_started_at    │
│ sync_completed_at  │
│ last_checkpoint_at │
│ total_inserted     │
│ error_message      │
│ error_details      │
│ UNIQUE(user_id,    │
│   platform)        │
└─────────────────────┘


┌─────────────────────┐
│     problems        │
│─────────────────────│
│ id (PK)            │◄────────────┐
│ platform_id (FK)   │─────┐       │
│ external_id        │     │       │
│ contest_id         │     │       │
│ name               │     │       │
│ url                │     │       │
│ difficulty_rating  │     │       │
│ difficulty_tier_id │     │       │
│ time_limit_ms      │     │       │
│ memory_limit_kb    │     │       │
│ examples (JSONB)   │     │       │  ← NEW: GIN indexed
│ tutorial_solutions │     │       │
│   (JSONB)          │     │       │  ← NEW: GIN indexed
│ UNIQUE(platform_id,│     │       │
│   external_id)     │     │       │
└─────────────────────┘     │       │
         │                  │       │
         │ 1:N              │       │
         │                  │       │
         ▼                  │       │
┌─────────────────────┐     │       │
│   submissions       │     │       │
│─────────────────────│     │       │
│ id (PK)            │     │       │
│ user_id (FK)       │─────┼───────┼────┐
│ problem_id (FK)    │─────┘       │    │
│ platform_id (FK)   │─────────────┘    │
│ external_submission│                  │
│   _id (varchar200) │                  │
│ external_problem_id│                  │
│   (varchar200)     │                  │
│ problem_name       │  ← denormalized  │
│ verdict            │                  │
│ language_id (FK)   │                  │
│ execution_time_ms  │                  │
│ memory_kb          │                  │
│ submitted_at       │                  │
│ UNIQUE(platform_id,│                  │
│   external_        │                  │
│   submission_id)   │                  │
└─────────────────────┘                  │
         │                               │
         │ N:1 (if verdict=AC)           │
         │                               │
         ▼                               │
┌─────────────────────┐                  │
│   user_solves       │                  │
│─────────────────────│                  │
│ id (PK)            │◄─────────────────┘
│ user_id (FK)       │
│ problem_id (FK)    │─────┐
│ first_solved_at    │     │
│ solve_count        │     │
│ attempt_count      │     │
│ best_time_ms       │     │
│ best_memory_kb     │     │
│ difficulty_tier    │     │  ← NEW: For stats calculation
│ is_favorite        │     │
│ personal_rating    │     │
│ notes              │     │
│ UNIQUE(user_id,    │     │
│   problem_id)      │     │
└─────────────────────┘     │
         │                  │
         │ 1:N              │
         │                  │
         ▼                  │
┌─────────────────────┐     │
│     solutions       │     │
│─────────────────────│     │
│ id (PK)            │     │
│ user_solve_id (FK) │─────┘
│ submission_id (FK) │
│ source_code        │
│ language_id (FK)   │
│ verdict            │
│ is_primary         │
│ ai_analysis_status │
│ ai_complexity_time │
│ ai_complexity_space│
│ ai_score           │
│ ai_feedback        │
│ ai_analyzed_at     │
│ submitted_at       │  ← NEW: For version ordering
└─────────────────────┘


┌─────────────────────┐
│  rating_history     │
│─────────────────────│
│ id (PK)            │
│ user_id (FK)       │─────┐
│ platform_id (FK)   │     │
│ contest_id (FK)    │     │
│ rating             │     │
│ rating_change      │     │
│ recorded_at        │     │
│ UNIQUE(user_id,    │     │
│   platform_id,     │     │
│   recorded_at)     │     │
└─────────────────────┘     │
                            │
                            │
┌─────────────────────┐     │
│  contest_history    │     │
│─────────────────────│     │
│ id (PK)            │     │
│ user_id (FK)       │─────┘
│ platform_id (FK)   │
│ external_contest_id│
│   (varchar200)     │
│ contest_name       │
│ contest_url        │
│ contest_date       │
│ contest_end_date   │  ← NEW: For duration calculation
│ duration_minutes   │
│ rank               │
│ total_participants │
│ problems_solved    │
│ problems_attempted │
│ total_problems     │  ← NEW: For completion tracking
│ problems_data      │  ← NEW: JSONB array of problem details
│   (JSONB)          │
│ score              │
│ max_score          │  ← NEW: For percentage calculation
│ penalty            │  ← NEW: For ACM-style contests
│ old_rating         │
│ new_rating         │
│ rating_change      │
│ is_rated           │
│ is_virtual         │
│ division           │
│ UNIQUE(user_id,    │
│   platform_id,     │
│   external_        │
│   contest_id)      │
└─────────────────────┘


┌─────────────────────┐
│    user_stats       │
│─────────────────────│
│ id (PK)            │
│ user_id (FK)       │◄─────┐
│ total_solved       │      │
│ total_solutions    │      │
│ current_streak     │      │
│ longest_streak     │      │
│ solved_800         │      │
│ solved_900         │      │
│ solved_1000        │      │
│ ... (by rating)    │      │
│ solved_2500_plus   │      │
│ week_1_solved      │      │
│ week_2_solved      │      │
│ week_3_solved      │      │
│ week_4_solved      │      │
│ solved_this_week   │  ← FIXED: Added in migration
│ solved_this_month  │  ← FIXED: Added in migration
│ weighted_score     │      │
│ last_updated       │      │
│ UNIQUE(user_id)    │      │
└─────────────────────┘      │
                             │
                             │
┌─────────────────────┐      │
│  difficulty_tiers   │      │
│─────────────────────│      │
│ id (PK)            │      │
│ tier_code (UNIQUE) │      │
│ tier_name          │      │
│ min_rating         │      │
│ max_rating         │      │
│ color_hex          │      │
└─────────────────────┘      │


┌─────────────────────┐      │
│      tags           │      │
│─────────────────────│      │
│ id (PK)            │      │
│ code (UNIQUE)      │      │
│ name               │      │
│ category           │      │
└─────────────────────┘      │
         │                   │
         │ N:M               │
         │                   │
         ▼                   │
┌─────────────────────┐      │
│   problem_tags      │      │
│─────────────────────│      │
│ problem_id (FK)    │      │
│ tag_id (FK)        │      │
│ source             │      │
│ PRIMARY KEY(       │      │
│   problem_id,      │      │
│   tag_id)          │      │
└─────────────────────┘      │


┌─────────────────────┐      │
│    languages        │      │
│─────────────────────│      │
│ id (PK)            │      │
│ name (UNIQUE)      │      │
│ code               │      │
│ extension          │  ← NEW: File extension
└─────────────────────┘
```

---

## Entity Descriptions

### Core Entities

#### 1. `platforms`

**Purpose**: Master table of all supported competitive programming platforms.

**Key Points**:

- 41 platforms currently seeded
- `code` is the primary identifier used in application logic
- `api_available` indicates if platform has a public API for syncing

**Sample Data**:

```sql
| id   | code       | name       | url                        | api_available |
|------|------------|------------|----------------------------|---------------|
| uuid | codeforces | Codeforces | https://codeforces.com     | true          |
| uuid | spoj       | SPOJ       | https://www.spoj.com       | false         |
| uuid | cses       | CSES       | https://cses.fi            | false         |
```

**Relationships**:

- **1:N** with `problems` (one platform has many problems)
- **1:N** with `user_handles` (one platform has many user handles)
- **1:N** with `submissions` (one platform has many submissions)
- **1:N** with `rating_history` (one platform has many rating records)
- **1:N** with `contest_history` (one platform has many contest participations)

---

#### 2. `problems`

**Purpose**: Stores problem metadata from all platforms.

**Key Points**:

- `external_id` is the platform-specific problem identifier (e.g., "1234A" for CF)
- `external_id` varchar(200) to support long LeetCode problem IDs
- **NEW**: `examples` JSONB field stores problem input/output examples with GIN index
- **NEW**: `tutorial_solutions` JSONB field stores editorial/tutorial with GIN index
- `difficulty_rating` is platform-specific (e.g., 800-3500 for Codeforces, 1-3 for LeetCode)
- `difficulty_tier_id` normalizes ratings into tiers (easy, medium, hard, expert)

**JSONB Structure**:

```javascript
// examples field
[
  {
    input: '3\n1 2 3',
    output: '6',
    explanation: 'Sum of all numbers',
  },
][
  // tutorial_solutions field
  {
    title: 'Editorial',
    author: 'tourist',
    language: 'C++',
    code: '#include <iostream>\n...',
    explanation: 'The key insight is...',
  }
];
```

**Unique Constraint**: `(platform_id, external_id)`

**Relationships**:

- **N:1** with `platforms` (many problems belong to one platform)
- **1:N** with `submissions` (one problem has many submissions)
- **1:N** with `user_solves` (one problem can be solved by many users)
- **N:M** with `tags` via `problem_tags` junction table

---

#### 3. `user_handles`

**Purpose**: Links users to their accounts on various platforms.

**Key Points**:

- A user can have only ONE handle per platform (unique constraint)
- `current_rating` and `max_rating` track user's rating on that platform
- `is_verified` indicates if the handle ownership has been verified
- `is_primary` allows user to designate a primary handle (for display purposes)
- `last_synced_at` tracks when submissions were last fetched for this handle

**Unique Constraint**: `(user_id, platform_id)`

**Relationships**:

- **N:1** with `users` (many handles belong to one user)
- **N:1** with `platforms` (many handles belong to one platform)
- **1:1** with `sync_checkpoints` (one handle has one checkpoint per platform)

---

#### 4. `submissions`

**Purpose**: Tracks ALL user submissions (accepted and non-accepted).

**Key Points**:

- `external_submission_id` varchar(200) for long platform-specific IDs
- `external_problem_id` varchar(200) denormalized for quick lookups
- `problem_name` denormalized to avoid joins in submission lists
- `verdict` standardized across platforms: AC, WA, TLE, MLE, RE, CE, RTE, PE, etc.
- `submitted_at` indexed for timeline queries
- Does NOT store source code (only accepted submissions store code in `solutions`)

**Unique Constraint**: `(platform_id, external_submission_id)`

**Relationships**:

- **N:1** with `users` (many submissions belong to one user)
- **N:1** with `problems` (many submissions belong to one problem)
- **N:1** with `platforms` (many submissions belong to one platform)
- **N:1** with `languages` (many submissions use one language)
- **1:1** with `solutions` (one AC submission may have one solution record)

---

#### 5. `user_solves`

**Purpose**: Tracks which problems a user has solved (AC submissions only).

**Key Points**:

- Created when user gets first AC on a problem
- `solve_count` tracks number of AC submissions (for problems solved multiple times)
- `attempt_count` tracks total submissions before first AC
- `best_time_ms` and `best_memory_kb` track personal best metrics
- **NEW**: `difficulty_tier` (easy/medium/hard/expert) for quick stats calculation
- `is_favorite` allows users to bookmark problems
- `personal_rating` allows users to rate problem difficulty themselves

**Unique Constraint**: `(user_id, problem_id)`

**Relationships**:

- **N:1** with `users` (many solves belong to one user)
- **N:1** with `problems` (many users can solve one problem)
- **1:N** with `solutions` (one solve can have multiple solution versions)

---

#### 6. `solutions`

**Purpose**: Stores source code for accepted submissions with versioning.

**Key Points**:

- Only stores code for AC (accepted) submissions
- Multiple versions can exist for same solve (user submits different approaches)
- **NEW**: `submitted_at` used for ordering versions (replaced `version_number`)
- `is_primary` marks the user's preferred/best solution
- `ai_analysis_status`: pending, completed, failed
- AI fields: `ai_complexity_time`, `ai_complexity_space`, `ai_score` (0-100), `ai_feedback`

**Relationships**:

- **N:1** with `user_solves` (many solutions belong to one solve)
- **1:1** with `submissions` (one solution may reference one submission)
- **N:1** with `languages` (many solutions use one language)

---

#### 7. `rating_history`

**Purpose**: Tracks rating changes over time for rated contests.

**Key Points**:

- One record per rated contest participation
- `rating` is the new rating after the contest
- `rating_change` is the delta from previous rating
- `contest_id` FK to `contest_history` (nullable for old records)
- `recorded_at` is the contest end time

**Unique Constraint**: `(user_id, platform_id, recorded_at)`

**Relationships**:

- **N:1** with `users` (many rating records belong to one user)
- **N:1** with `platforms` (many rating records belong to one platform)
- **N:1** with `contest_history` (many rating records belong to one contest)

---

#### 8. `contest_history`

**Purpose**: Tracks user participation in contests.

**Key Points**:

- `external_contest_id` varchar(200) for long contest identifiers
- **NEW**: `contest_end_date` for duration calculation
- **NEW**: `total_problems` for completion percentage tracking
- **NEW**: `problems_data` JSONB array storing per-problem results:

  ```javascript
  [
    {
      label: 'A',
      problemId: '1234A',
      problemName: 'Two Sum',
      solved: true,
      attempts: 1,
      time: '00:05:23',
      points: 500,
    },
  ];
  ```

- **NEW**: `max_score` for percentage calculation
- **NEW**: `penalty` for ACM-style contests (time penalty)
- `is_rated` indicates if contest affected user's rating
- `is_virtual` indicates if user participated virtually (after contest ended)

**Unique Constraint**: `(user_id, platform_id, external_contest_id)`

**Relationships**:

- **N:1** with `users` (many contest participations belong to one user)
- **N:1** with `platforms` (many contest participations belong to one platform)
- **1:N** with `rating_history` (one contest can have many rating updates for different users)

---

#### 9. `user_stats`

**Purpose**: Aggregated statistics for user's problem-solving activity.

**Key Points**:

- One record per user
- Calculated by aggregating data from `user_solves`, `submissions`, and `contest_history`
- **Difficulty breakdown**: `solved_800`, `solved_900`, ..., `solved_2500_plus` (Codeforces-style ratings)
- **Weekly breakdown**: `week_1_solved`, `week_2_solved`, `week_3_solved`, `week_4_solved`
- **FIXED**: `solved_this_week` and `solved_this_month` added in migration `20260405040000`
- `weighted_score` calculated using difficulty weights (easy=1, medium=2.5, hard=5, expert=10)
- `current_streak` and `longest_streak` track daily solving streaks
- Updated by `updateUserStatistics()` function after each sync

**Unique Constraint**: `(user_id)`

**Relationships**:

- **1:1** with `users` (one user has one stats record)

---

#### 10. `sync_checkpoints`

**Purpose**: Tracks sync progress for incremental syncing.

**Key Points**:

- **FIXED**: Created in migration `20260405050000`
- Uses `platform` varchar (platform code) instead of `platform_id` FK (for backwards compatibility)
- `sync_status`: pending, in_progress, completed, failed
- `total_inserted` tracks number of submissions synced in current session
- `last_checkpoint_at` timestamp for resuming interrupted syncs
- `error_message` and `error_details` for debugging failed syncs

**Unique Constraint**: `(user_id, platform)`

**Relationships**:

- **N:1** with `users` (many checkpoints belong to one user)
- **Soft reference** to `platforms` via `platform` varchar (not a true FK)

---

### Supporting Entities

#### 11. `languages`

**Purpose**: Programming languages used across platforms.

**Key Points**:

- Normalized to avoid storing language names repeatedly
- `name` examples: "C++17 (GCC 9.2)", "Python 3.9", "Java 11"
- `code` examples: "cpp17", "py3", "java11"
- **NEW**: `extension` field stores file extension (e.g., ".cpp", ".py", ".java")

**Sample Data**:

```sql
| id   | name       | code   | extension |
|------|------------|--------|-----------|
| uuid | C++17      | cpp17  | .cpp      |
| uuid | Python 3   | py3    | .py       |
| uuid | Java 11    | java11 | .java     |
```

---

#### 12. `tags`

**Purpose**: Problem tags/topics for categorization and search.

**Key Points**:

- `code` is slugified (e.g., "dynamic-programming", "graph-theory")
- `name` is display name (e.g., "Dynamic Programming", "Graph Theory")
- `category` groups tags: "platform" (CF-specific), "topic" (algorithmic concepts), "difficulty"

**Sample Data**:

```sql
| id   | code                  | name                  | category |
|------|-----------------------|-----------------------|----------|
| uuid | dynamic-programming   | Dynamic Programming   | topic    |
| uuid | graphs                | Graph Theory          | topic    |
| uuid | implementation        | Implementation        | topic    |
```

---

#### 13. `problem_tags` (Junction Table)

**Purpose**: Many-to-many relationship between problems and tags.

**Key Points**:

- `source` indicates where tag came from: "platform" (from CF API), "extension" (from user via extension), "user" (manually added), "ai" (from AI analysis)
- Allows same tag to be applied to problems across different platforms

**Composite Primary Key**: `(problem_id, tag_id)`

---

#### 14. `difficulty_tiers`

**Purpose**: Normalizes platform-specific difficulty ratings into universal tiers.

**Key Points**:

- Maps platform ratings to tiers: easy, medium, hard, expert
- Each tier has `min_rating` and `max_rating` boundaries
- `color_hex` for UI display (e.g., green for easy, red for expert)

**Sample Data**:

```sql
| id   | tier_code | tier_name | min_rating | max_rating | color_hex |
|------|-----------|-----------|------------|------------|-----------|
| uuid | easy      | Easy      | 0          | 1199       | #10b981   |
| uuid | medium    | Medium    | 1200       | 1599       | #3b82f6   |
| uuid | hard      | Hard      | 1600       | 2099       | #f59e0b   |
| uuid | expert    | Expert    | 2100       | NULL       | #ef4444   |
```

---

## Relationships

### Relationship Summary Table

| From Entity      | To Entity        | Type | Cardinality  | Foreign Key        | Constraint Type |
| ---------------- | ---------------- | ---- | ------------ | ------------------ | --------------- |
| user_handles     | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| user_handles     | platforms        | N:1  | Many-to-One  | platform_id        | RESTRICT        |
| problems         | platforms        | N:1  | Many-to-One  | platform_id        | RESTRICT        |
| problems         | difficulty_tiers | N:1  | Many-to-One  | difficulty_tier_id | SET NULL        |
| submissions      | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| submissions      | problems         | N:1  | Many-to-One  | problem_id         | CASCADE         |
| submissions      | platforms        | N:1  | Many-to-One  | platform_id        | RESTRICT        |
| submissions      | languages        | N:1  | Many-to-One  | language_id        | SET NULL        |
| user_solves      | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| user_solves      | problems         | N:1  | Many-to-One  | problem_id         | CASCADE         |
| solutions        | user_solves      | N:1  | Many-to-One  | user_solve_id      | CASCADE         |
| solutions        | submissions      | N:1  | Many-to-One  | submission_id      | SET NULL        |
| solutions        | languages        | N:1  | Many-to-One  | language_id        | SET NULL        |
| rating_history   | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| rating_history   | platforms        | N:1  | Many-to-One  | platform_id        | RESTRICT        |
| rating_history   | contest_history  | N:1  | Many-to-One  | contest_id         | SET NULL        |
| contest_history  | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| contest_history  | platforms        | N:1  | Many-to-One  | platform_id        | RESTRICT        |
| user_stats       | users            | 1:1  | One-to-One   | user_id            | CASCADE         |
| sync_checkpoints | users            | N:1  | Many-to-One  | user_id            | CASCADE         |
| problem_tags     | problems         | N:M  | Many-to-Many | problem_id         | CASCADE         |
| problem_tags     | tags             | N:M  | Many-to-Many | tag_id             | CASCADE         |

### Cascade Behavior

**ON DELETE CASCADE** (child records deleted when parent deleted):

- `user_handles`, `submissions`, `user_solves`, `solutions`, `rating_history`, `contest_history`, `user_stats`, `sync_checkpoints` → when `users` deleted
- `submissions`, `user_solves` → when `problems` deleted
- `solutions` → when `user_solves` deleted
- `problem_tags` → when `problems` or `tags` deleted

**ON DELETE RESTRICT** (prevent deletion if child records exist):

- `problems`, `submissions`, `user_handles`, `rating_history`, `contest_history` → when `platforms` deleted

**ON DELETE SET NULL** (set FK to NULL when parent deleted):

- `problems.difficulty_tier_id` → when `difficulty_tiers` deleted
- `submissions.language_id`, `solutions.language_id` → when `languages` deleted
- `solutions.submission_id` → when `submissions` deleted
- `rating_history.contest_id` → when `contest_history` deleted

---

## Data Flow

### Sync Flow (API-based)

```
1. User clicks "Sync" for Codeforces
   ↓
2. Frontend → POST /api/problem-solving/sync
   ↓
3. Backend checks sync_checkpoints for last sync timestamp
   ↓
4. Call Codeforces API: /api/user.status?handle=tourist&from=1
   ↓
5. For each submission batch (10,000 per request):
   ↓
6. Upsert into problems table (if not exists)
   ↓
7. Insert into submissions table (unique: platform_id + external_submission_id)
   ↓
8. If verdict = AC:
   ↓
9. Upsert into user_solves table (unique: user_id + problem_id)
   ↓
10. Fetch source code (if available)
    ↓
11. Insert into solutions table
    ↓
12. Trigger AI analysis (non-blocking)
    ↓
13. Update sync_checkpoints with new timestamp and total_inserted
    ↓
14. Update user_stats by aggregating from user_solves
    ↓
15. Return sync results to frontend
```

### Extension Sync Flow

```
1. User navigates to SPOJ submission page
   ↓
2. Content script (neupc-spoj.js) injects into page
   ↓
3. Script extracts submission data from DOM table
   ↓
4. Script stores in browser local storage cache
   ↓
5. If auto-sync enabled and verdict = AC:
   ↓
6. Background worker → POST /api/problem-solving/extension-sync
   ↓
7. Backend validates extension token
   ↓
8. Backend follows same upsert logic as API sync (steps 6-14 above)
   ↓
9. Return success response to extension
   ↓
10. Extension shows notification
```

### Contest Sync Flow

```
1. Backend fetches contest history from platform API or CLIST
   ↓
2. For each contest:
   ↓
3. Upsert into contest_history table
   ↓
4. If is_rated = true and rating_change exists:
   ↓
5. Insert into rating_history table
   ↓
6. Update user_handles.current_rating and max_rating
   ↓
7. Return contest history to frontend
```

### Stats Calculation Flow

```
1. After sync completes, call updateUserStatistics(userId)
   ↓
2. Query user_solves for all solved problems (V2 uses user_solves table)
   ↓
3. Count by difficulty_tier: easy, medium, hard, expert
   ↓
4. Count by rating buckets: 800, 900, 1000, ..., 2500+
   ↓
5. Count by time period: this week, this month, week 1-4
   ↓
6. Calculate current_streak from daily_activity table
   ↓
7. Calculate weighted_score using difficulty weights
   ↓
8. Upsert into user_stats table (unique: user_id)
```

---

## Indexing Strategy

### Primary Indexes (Created by Schema)

```sql
-- Primary Keys (automatically indexed)
CREATE INDEX ON platforms(id);
CREATE INDEX ON problems(id);
CREATE INDEX ON user_handles(id);
CREATE INDEX ON submissions(id);
CREATE INDEX ON user_solves(id);
CREATE INDEX ON solutions(id);
CREATE INDEX ON rating_history(id);
CREATE INDEX ON contest_history(id);
CREATE INDEX ON user_stats(id);
CREATE INDEX ON sync_checkpoints(id);
CREATE INDEX ON languages(id);
CREATE INDEX ON tags(id);
CREATE INDEX ON difficulty_tiers(id);
```

### Unique Constraints (Automatically Indexed)

```sql
-- Unique constraints create unique indexes
CREATE UNIQUE INDEX ON platforms(code);
CREATE UNIQUE INDEX ON problems(platform_id, external_id);
CREATE UNIQUE INDEX ON user_handles(user_id, platform_id);
CREATE UNIQUE INDEX ON submissions(platform_id, external_submission_id);
CREATE UNIQUE INDEX ON user_solves(user_id, problem_id);
CREATE UNIQUE INDEX ON rating_history(user_id, platform_id, recorded_at);
CREATE UNIQUE INDEX ON contest_history(user_id, platform_id, external_contest_id);
CREATE UNIQUE INDEX ON user_stats(user_id);
CREATE UNIQUE INDEX ON sync_checkpoints(user_id, platform);
CREATE UNIQUE INDEX ON languages(name);
CREATE UNIQUE INDEX ON tags(code);
CREATE UNIQUE INDEX ON difficulty_tiers(tier_code);
```

### Foreign Key Indexes

```sql
-- Foreign keys should be indexed for join performance
CREATE INDEX ON user_handles(user_id);
CREATE INDEX ON user_handles(platform_id);
CREATE INDEX ON problems(platform_id);
CREATE INDEX ON problems(difficulty_tier_id);
CREATE INDEX ON submissions(user_id);
CREATE INDEX ON submissions(problem_id);
CREATE INDEX ON submissions(platform_id);
CREATE INDEX ON submissions(language_id);
CREATE INDEX ON user_solves(user_id);
CREATE INDEX ON user_solves(problem_id);
CREATE INDEX ON solutions(user_solve_id);
CREATE INDEX ON solutions(submission_id);
CREATE INDEX ON solutions(language_id);
CREATE INDEX ON rating_history(user_id);
CREATE INDEX ON rating_history(platform_id);
CREATE INDEX ON rating_history(contest_id);
CREATE INDEX ON contest_history(user_id);
CREATE INDEX ON contest_history(platform_id);
CREATE INDEX ON sync_checkpoints(user_id);
CREATE INDEX ON problem_tags(problem_id);
CREATE INDEX ON problem_tags(tag_id);
```

### Query-Specific Indexes

```sql
-- Submissions timeline query
CREATE INDEX ON submissions(user_id, submitted_at DESC);

-- Platform-specific submissions
CREATE INDEX ON submissions(user_id, platform_id, submitted_at DESC);

-- Verdict filtering
CREATE INDEX ON submissions(user_id, verdict, submitted_at DESC);

-- Recent solves
CREATE INDEX ON user_solves(user_id, first_solved_at DESC);

-- Rating timeline
CREATE INDEX ON rating_history(user_id, platform_id, recorded_at DESC);

-- Contest participation
CREATE INDEX ON contest_history(user_id, contest_date DESC);

-- Sync status tracking
CREATE INDEX ON sync_checkpoints(user_id, platform, sync_status);
CREATE INDEX ON sync_checkpoints(sync_status, last_checkpoint_at);

-- Solution lookup by timestamp (for versioning)
CREATE INDEX ON solutions(user_solve_id, submitted_at DESC);
```

### JSONB Indexes (GIN)

```sql
-- Problem examples search (FIXED: Added in migration)
CREATE INDEX idx_problems_examples ON problems USING GIN (examples);

-- Tutorial solutions search (FIXED: Added in migration)
CREATE INDEX idx_problems_tutorial_solutions ON problems USING GIN (tutorial_solutions);

-- Contest problems data search (NEW)
CREATE INDEX idx_contest_problems_data ON contest_history USING GIN (problems_data);
```

### Full-Text Search Indexes (Optional)

```sql
-- Problem name search
CREATE INDEX idx_problems_name_trgm ON problems USING gin (name gin_trgm_ops);

-- Contest name search
CREATE INDEX idx_contests_name_trgm ON contest_history USING gin (contest_name gin_trgm_ops);
```

---

## Sample Queries

### Query 1: Get User's Submission Statistics by Platform

```sql
SELECT
  p.code AS platform,
  p.name AS platform_name,
  COUNT(DISTINCT CASE WHEN s.verdict = 'AC' THEN s.problem_id END) AS solved,
  COUNT(*) AS total_submissions,
  ROUND(
    COUNT(DISTINCT CASE WHEN s.verdict = 'AC' THEN s.problem_id END)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS acceptance_rate
FROM submissions s
INNER JOIN platforms p ON s.platform_id = p.id
WHERE s.user_id = $1
GROUP BY p.code, p.name
ORDER BY solved DESC;
```

### Query 2: Get User's Recent Solutions with AI Analysis

```sql
SELECT
  sol.id,
  sol.source_code,
  sol.submitted_at,
  sol.ai_complexity_time,
  sol.ai_complexity_space,
  sol.ai_score,
  sol.ai_feedback,
  prob.name AS problem_name,
  prob.url AS problem_url,
  plat.name AS platform_name,
  lang.name AS language
FROM solutions sol
INNER JOIN user_solves us ON sol.user_solve_id = us.id
INNER JOIN problems prob ON us.problem_id = prob.id
INNER JOIN platforms plat ON prob.platform_id = plat.id
LEFT JOIN languages lang ON sol.language_id = lang.id
WHERE us.user_id = $1
  AND sol.ai_analysis_status = 'completed'
ORDER BY sol.submitted_at DESC
LIMIT 20;
```

### Query 3: Get User's Rating Timeline for a Platform

```sql
SELECT
  rh.rating,
  rh.rating_change,
  rh.recorded_at,
  ch.contest_name,
  ch.rank,
  ch.total_participants
FROM rating_history rh
LEFT JOIN contest_history ch ON rh.contest_id = ch.id
WHERE rh.user_id = $1
  AND rh.platform_id = $2
ORDER BY rh.recorded_at ASC;
```

### Query 4: Get Leaderboard (Top Solvers)

```sql
SELECT
  u.id,
  u.full_name,
  u.avatar_url,
  us.total_solved,
  us.weighted_score,
  us.current_streak,
  us.longest_streak
FROM user_stats us
INNER JOIN users u ON us.user_id = u.id
WHERE us.total_solved > 0
ORDER BY us.weighted_score DESC, us.total_solved DESC
LIMIT 50;
```

### Query 5: Get Problems Solved by Tag

```sql
SELECT
  prob.name,
  prob.difficulty_rating,
  plat.name AS platform,
  us.first_solved_at,
  us.attempt_count
FROM user_solves us
INNER JOIN problems prob ON us.problem_id = prob.id
INNER JOIN platforms plat ON prob.platform_id = plat.id
INNER JOIN problem_tags pt ON prob.id = pt.problem_id
INNER JOIN tags t ON pt.tag_id = t.id
WHERE us.user_id = $1
  AND t.code = 'dynamic-programming'
ORDER BY us.first_solved_at DESC;
```

### Query 6: Get Sync Status for All Connected Platforms

```sql
SELECT
  p.code AS platform,
  p.name AS platform_name,
  uh.handle,
  uh.current_rating,
  uh.max_rating,
  sc.sync_status,
  sc.sync_completed_at,
  sc.total_inserted AS submissions_synced,
  sc.error_message
FROM user_handles uh
INNER JOIN platforms p ON uh.platform_id = p.id
LEFT JOIN sync_checkpoints sc ON uh.user_id = sc.user_id AND p.code = sc.platform
WHERE uh.user_id = $1
ORDER BY sc.sync_completed_at DESC NULLS LAST;
```

### Query 7: Get Platform Stats for Dashboard Cards (FIXED)

```sql
-- This query is now handled by getProblemSolvingData() function
-- which properly queries V2 tables: user_solves, submissions, user_stats

SELECT
  p.code AS platform,
  uh.handle,
  uh.current_rating,
  uh.max_rating,
  COUNT(DISTINCT us.problem_id) AS solved_count,
  COUNT(DISTINCT sub.id) AS total_submissions,
  COUNT(DISTINCT ch.id) FILTER (
    WHERE ch.is_rated = true
    AND (ch.rating_change IS NOT NULL OR ch.new_rating IS NOT NULL)
  ) AS contest_count,
  sc.sync_status,
  sc.sync_completed_at AS last_synced_at
FROM user_handles uh
INNER JOIN platforms p ON uh.platform_id = p.id
LEFT JOIN user_solves us ON us.user_id = uh.user_id
  AND us.problem_id IN (
    SELECT id FROM problems WHERE platform_id = p.id
  )
LEFT JOIN submissions sub ON sub.user_id = uh.user_id
  AND sub.platform_id = p.id
LEFT JOIN contest_history ch ON ch.user_id = uh.user_id
  AND ch.platform_id = p.id
LEFT JOIN sync_checkpoints sc ON sc.user_id = uh.user_id
  AND sc.platform = p.code
WHERE uh.user_id = $1
GROUP BY p.code, uh.handle, uh.current_rating, uh.max_rating,
         sc.sync_status, sc.sync_completed_at;
```

### Query 8: Search Problems with Examples (Using GIN Index)

```sql
SELECT
  prob.name,
  prob.difficulty_rating,
  plat.name AS platform,
  prob.examples
FROM problems prob
INNER JOIN platforms plat ON prob.platform_id = plat.id
WHERE prob.examples @> '[{"input": "3"}]'::jsonb
LIMIT 20;
```

---

## Schema Evolution

### Migration History

#### Phase 1: Initial V2 Schema (April 4, 2026)

- `20260404194136_remote_schema.sql` - Base V2 normalized schema

#### Phase 2: Platform Seeding (April 5, 2026)

- `20260405000000_seed_platforms.sql` - Seeded 41 platforms

#### Phase 3: Constraints & Limits (April 5, 2026)

- `20260405010000_add_unique_constraints.sql` - Added unique constraints
- `20260405020000_increase_submission_id_length.sql` - varchar(50) → varchar(200)
- `20260405030000_increase_problem_contest_id_length.sql` - varchar(50) → varchar(200)

#### Phase 4: Stats & Checkpoints (April 5, 2026)

- `20260405040000_add_user_stats_columns.sql` - Added `solved_this_week`, `solved_this_month`
- `20260405045000_drop_sync_checkpoints.sql` - Safety migration to drop incorrect table
- `20260405050000_create_sync_checkpoints.sql` - Created correct sync_checkpoints table

#### Phase 5: JSONB Enhancements (April 8, 2026 - CURRENT)

- **FIXED**: Added `examples` and `tutorial_solutions` JSONB columns to `problems` table
- **FIXED**: Added GIN indexes on JSONB columns for search performance
- **FIXED**: Added `contest_end_date`, `total_problems`, `max_score`, `penalty` to `contest_history`
- **FIXED**: Added `problems_data` JSONB array to `contest_history` for per-problem results
- **FIXED**: Added `difficulty_tier` to `user_solves` for quick stats calculation
- **FIXED**: Replaced `version_number` with `submitted_at` ordering in `solutions`

### Schema Compatibility

**V1 → V2 Migration Strategy**:

- V2 schema is **backwards compatible** with V1 for reads
- V1 tables still exist (`problem_solves`, `user_statistics`) for legacy code
- New code detects schema version using `isV2SchemaAvailable()` function
- Transition period: Both schemas coexist, code adapts using `useV2` flag

**Schema Detection**:

```javascript
// Check if V2 schema is available
const useV2 = await isV2SchemaAvailable();
// Returns true if problems table has external_id column

// Use appropriate table name
const solvesTable = useV2 ? 'user_solves' : 'problem_solves';
const statsTable = useV2 ? 'user_stats' : 'user_statistics';
```

### Breaking Changes

**None** - V2 is additive, not destructive. V1 tables remain functional.

### Future Schema Plans

1. **Add full-text search columns** for problem descriptions
2. **Add problem_difficulty_votes table** for community difficulty ratings
3. **Add user_achievements table** for gamification
4. **Add team_memberships table** for group features
5. **Add contest_registrations table** to track upcoming contest signups
6. **Add submission_testcases table** to store per-testcase results
7. **Add code_similarity_index table** for plagiarism detection

---

## Best Practices

### 1. Querying

**DO**:

- Use prepared statements with parameterized queries to prevent SQL injection
- Use appropriate indexes for WHERE, JOIN, and ORDER BY clauses
- Use `LIMIT` and `OFFSET` for pagination
- Use `COUNT(*) OVER()` for total count with pagination
- Use `EXPLAIN ANALYZE` to optimize slow queries

**DON'T**:

- Don't use `SELECT *` in production queries (specify columns)
- Don't query JSONB columns without GIN indexes
- Don't perform full table scans on large tables
- Don't use OR conditions across multiple columns (use UNION instead)

### 2. Inserting

**DO**:

- Use `UPSERT` (INSERT ... ON CONFLICT ... DO UPDATE) to handle duplicates
- Use batch inserts for multiple rows (up to 100 per batch)
- Use transactions for multi-table inserts
- Validate foreign keys before inserting

**DON'T**:

- Don't insert without checking unique constraints
- Don't insert without validating required fields
- Don't ignore duplicate key errors (log and handle gracefully)

### 3. Updating

**DO**:

- Use `updated_at = now()` trigger for automatic timestamp updates
- Use optimistic locking for concurrent updates (check version numbers)
- Use transactions for multi-table updates

**DON'T**:

- Don't update without WHERE clause (accidental full table update)
- Don't update foreign keys without CASCADE/SET NULL handling

### 4. Deleting

**DO**:

- Use soft deletes for important data (add `deleted_at` column)
- Use CASCADE deletes for child records
- Use transactions for multi-table deletes
- Archive old data before deleting (e.g., submissions older than 5 years)

**DON'T**:

- Don't delete without backup
- Don't delete parent records with RESTRICT constraints (will fail)

---

## Conclusion

This ER diagram documentation provides a comprehensive overview of the Problem Solving module's database schema. The V2 normalized design ensures:

✅ **Data Integrity**: Foreign keys, unique constraints, and proper normalization  
✅ **Performance**: Strategic indexing (B-tree, GIN for JSONB, full-text search)  
✅ **Scalability**: Handles millions of submissions across 41+ platforms  
✅ **Flexibility**: JSONB columns for semi-structured data (examples, tutorials, contest problems)  
✅ **Maintainability**: Clear entity relationships and well-documented schema

For implementation details, see:

- [PROBLEM_SOLVING.md](./PROBLEM_SOLVING.md) - Full feature documentation
- [/supabase/migrations/](../supabase/migrations/) - SQL migration files
- [/app/\_lib/problem-solving-services.js](../app/_lib/problem-solving-services.js) - Service layer
- [/app/\_lib/problem-solving-v2-helpers.js](../app/_lib/problem-solving-v2-helpers.js) - V2 helpers

---

**Last Updated:** April 8, 2026  
**Schema Version:** V2.1 (with JSONB enhancements and stats fixes)  
**Maintained by:** NEUPC Development Team
