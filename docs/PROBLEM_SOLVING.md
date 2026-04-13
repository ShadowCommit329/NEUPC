# Problem Solving Page - A to Z Technical Documentation

Last Updated: April 9, 2026  
Owner: NEUPC Engineering  
Status: Active and Maintained

---

## 1) Purpose and Scope

This document is the single source of truth for the Problem Solving page implementation:

- Page route and UI orchestration
- Client hooks and component-level data access
- Server actions and API routes
- Sync and ingestion pipelines
- Database schema mapping (ER V3 aligned)
- Operational troubleshooting and maintenance

Primary scope:

- `/account/member/problem-solving`
- `app/account/member/problem-solving/page.js`
- `app/account/member/problem-solving/_components/*`
- `app/_hooks/useProblemSolving.js`
- `app/_hooks/useProblems.js`
- `app/_lib/problem-solving-actions.js`
- `app/api/problem-solving/*`
- Browser extension integration paths for ingestion

---

## 2) High-Level Architecture

The page is built in layered form:

1. Presentation layer
- `page.js` performs role-gated page entry.
- `ProblemSolvingClient` drives tab/view orchestration and user interactions.

2. Client data layer
- `useProblemSolving` for dashboard data and sync actions.
- `useProblems` for problem list and filters.
- `useLeaderboard` for rank data.
- `useConnectHandle` for account-handle linking.

3. Server action layer
- Action facade for fetch, sync, connect/disconnect, leaderboard access.

4. API route layer
- Specialized REST routes for problems, solutions, tags, notes, goals, recommendations, extension sync, and status/token operations.

5. Sync and integration layer
- `ProblemSolvingAggregator` and platform services.
- CLIST-backed enrichment for contest/rating data where applicable.
- Browser extension for data extraction on protected/no-API platforms.

6. Data layer
- Normalized problem-solving entities with FK links and denormalized stats stores for read performance.

---

## 3) Entry Flow (Page Load)

When user visits `/account/member/problem-solving`:

1. `page.js` executes `requireRole('member')`.
2. Authorized user ID is passed to `ProblemSolvingClient`.
3. Client hook `useProblemSolving()` triggers initial fetch via `getProblemSolvingData()`.
4. Server action aggregates data from multiple tables.
5. Client renders:
- platform account cards
- stats widgets
- heatmap
- rating/contest blocks
- problems tab
- leaderboard tab

---

## 4) UI Structure and Interaction Model

Core tabs:

1. Overview
- account and sync controls
- extension guide
- stats overview
- heatmap
- recent submissions
- rating history
- contest history

2. Problems
- searchable/filterable solved/attempted problem inventory
- linked detail modal and solution operations

3. Leaderboard
- global/weekly/monthly ranks

Primary user actions:

- sync all platforms
- sync single platform
- connect/disconnect platform handle
- click heatmap day or tag to pivot into filtered problem list
- open problem details and related actions (notes/tags/favorites/analysis)

---

## 5) Client State Contracts

`ProblemSolvingClient` maintains:

- active tab selection
- sync modal state and stage
- selected filters (tag/date/problem)
- selected contest highlight
- toast notifications

`useProblemSolving()` exposes:

- `data`, `loading`, `error`
- `syncing`, `syncingPlatform`
- `refetch()`
- `sync(forceFullSync?)`
- `syncPlatform(platform, forceFullSync?, manualHtml?)`
- `syncContestHistory(forceUpdate?)`

`useConnectHandle()` exposes:

- `connect(platform, handle, authToken?)`
- `disconnect(platform)`
- `loading`, `error`

`useProblems()` exposes:

- paginated/filtered problems dataset
- filter update and pagination controls
- `refetch()`

---

## 6) Server Actions (Primary)

Main server actions in `app/_lib/problem-solving-actions.js`:

1. `getProblemSolvingData()`
- aggregates profile, handles, submissions, solves, solutions, rating history, contest history, platform stats

2. `getMemberProblemSolvingData(targetUserId)`
- user profile problem-solving data (member profile view)

3. `connectHandleAction(platform, handle, authToken?)`
- validates platform/handle
- verifies ownership and uniqueness
- upserts connected handle
- schedules/maintains sync tracking records

4. `disconnectHandleAction(platform)`
- removes platform handle association
- cleans related pending sync tracker state

5. `syncPlatformAction(platform, forceFullSync?, manualHtml?)`
- runs platform-specific submission sync
- enrichment for rating/contest where available
- updates aggregates and cache revalidation

6. `fullSyncAction(forceFullSync?)`
- multi-platform orchestration over connected handles
- updates submissions, ratings, contests, and statistics

7. `getLeaderboardAction(type, limit, offset)`
- leaderboard cache query and formatting for UI

---

## 7) API Surface Used by Problem Solving Page

Frequently consumed route groups:

1. Data retrieval and list management
- `/api/problem-solving/problems`
- `/api/problem-solving/submissions`
- `/api/problem-solving/solutions`
- `/api/problem-solving/leaderboard`

2. Problem detail and metadata
- `/api/problem-solving/tags`
- `/api/problem-solving/notes`
- `/api/problem-solving/favorites`
- `/api/problem-solving/similar`

3. Sync and integration
- `/api/problem-solving/sync`
- `/api/problem-solving/sync-status`
- `/api/problem-solving/existing-submissions`

4. Recommendations and analysis
- `/api/problem-solving/recommendations`
- `/api/problem-solving/ai-analyze`
- `/api/problem-solving/analyze-submission`
- `/api/problem-solving/solutions/reanalyze`

5. Extension pair and ingest
- `/api/problem-solving/extension-token`
- `/api/problem-solving/extension-sync`
- `/api/problem-solving/bulk-import`

---

## 8) Database Mapping (ER V3 Aligned)

Authoritative stores used by page data and workflows:

Reference:
- `platforms`
- `languages`
- `tags`
- `difficulty_tiers`
- `badge_definitions`

Problem domain:
- `problems`
- `problem_tags`
- `problem_analysis`
- `problem_editorials`

User and sync:
- `users`
- `user_handles`
- sync tracking store (`sync_jobs` in ER V3; compatibility paths may still use `sync_checkpoints` in some runtime branches)

Activity:
- `user_solves`
- `submissions`
- `solutions`
- `solution_analysis`

Contest and rating:
- `contest_history`
- `rating_history`

Stats/read models:
- `user_stats`
- `user_platform_stats`
- `user_tier_stats`
- `user_tag_stats`
- `user_daily_activity`
- `user_goals`
- `user_badges`
- `leaderboard_cache`

Design note:
- Transactional entities are normalized.
- Read-heavy widgets rely on pre-aggregated stats tables for performance.

---

## 9) Sync Pipeline Behavior

### 9.1 Incremental sync

Default strategy:

1. load connected handle(s)
2. resolve platform service
3. read checkpoint/tracker state
4. fetch delta submissions
5. dedupe using unique constraints and existing IDs
6. upsert problems/submissions/solves/solutions
7. update tracker and aggregate stats

### 9.2 Full sync

Force mode:

- rehydrates platform history where feasible
- re-enriches contest/rating timeline
- rebuilds or refreshes derived stats

### 9.3 Enrichment

- CLIST and/or platform-specific sources enrich contest/rating entries
- optional AI analysis enriches stored solution metadata

---

## 10) Browser Extension Integration

Extension is required/critical for platforms where:

- no stable public API exists
- login-protected pages are required
- anti-bot or Cloudflare protections block backend scraping

Flow:

1. user pairs extension via `extension-token`
2. extension extracts submission payloads from platform pages
3. extension posts to `extension-sync` or `bulk-import`
4. backend validates, dedupes, persists, and refreshes page-visible aggregates

---

## 11) Caching and Revalidation

After mutating operations:

- server action/API revalidates relevant page/data paths
- client follows with `refetch()` where needed
- leaderboard and stats views are refreshed from updated stores

This ensures user-visible consistency after:

- sync
- connect/disconnect
- solution edits
- notes/tags/favorites changes

---

## 12) Security and Access Control

1. Page entry requires member role.
2. Server actions and API routes enforce authenticated user context.
3. Handle linking prevents duplicate ownership collisions.
4. Extension ingestion is token-gated and user-scoped.
5. Data reads/writes are constrained to requesting user scope unless route explicitly exposes public ranking/profile views.

---

## 13) Performance Characteristics

Current optimizations:

- incremental sync with checkpoints
- batch processing for ingestion
- server-side aggregation before client rendering
- denormalized stats tables for dashboard reads
- selective component-level API fetches for heavy tabs/modals

Operational advice:

- keep sync frequency bounded (cooldown/rate limit paths)
- prefer incremental over full sync in normal operation
- monitor large response payloads from full history fetches

---

## 14) Error Handling and Recovery

Expected error classes:

1. platform network/API failures
2. handle verification failures
3. schema compatibility mismatches between migration states
4. extension auth/payload validation failures
5. external enrichment partial failures

Recovery behavior:

- partial progress persisted where safe
- sync tracker captures status/error details
- user-facing toasts/error blocks display recoverable messages
- manual retry and per-platform sync remain available

---

## 15) Troubleshooting Playbook

### A) Data missing after sync

1. verify handle connection exists
2. check platform-specific sync status/tracker
3. run platform sync again
4. run full sync only if incremental path is stale

### B) Extension not syncing

1. verify token is valid and current
2. verify extension API base URL
3. verify user is logged into target OJ site
4. inspect extension console logs and backend route logs

### C) Leaderboard or stats stale

1. trigger sync for at least one connected platform
2. confirm aggregator stats update completed
3. verify leaderboard cache write and refresh path

---

## 16) Recent Updates (April 2026)

1. Professional data flow diagram finalized:
- `docs/PROBLEM_SOLVING_PAGE_DATA_FLOW.drawio`

2. ER V3 relationship quality pass completed:
- all FK connectors validated and repaired
- broken/duplicate connectors removed

3. Documentation consolidation:
- this file is now the primary A-to-Z technical guide
- redundant point-in-time summary docs removed

---

## 17) Source of Truth References

Core docs and diagrams to use going forward:

- `docs/PROBLEM_SOLVING.md` (this file)
- `docs/PROBLEM_SOLVING_PAGE_DATA_FLOW.drawio`
- `docs/ER_DIAGRAM_V3_REDESIGNED.drawio`

Implementation anchors:

- `app/account/member/problem-solving/page.js`
- `app/account/member/problem-solving/_components/ProblemSolvingClient.js`
- `app/_hooks/useProblemSolving.js`
- `app/_hooks/useProblems.js`
- `app/_lib/problem-solving-actions.js`
- `app/api/problem-solving/`

---

## 18) Maintenance Rules

1. Update this document whenever new endpoints/tables/flows are added.
2. Keep drawio diagrams in sync with runtime behavior and schema.
3. Avoid creating one-off summary markdown files for temporary fixes.
4. Keep historical troubleshooting notes inside this document under dated sections instead of separate ad-hoc files.

