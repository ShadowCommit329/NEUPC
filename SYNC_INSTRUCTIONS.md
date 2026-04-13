# Contest History Data Population - Action Required

## Current Status

Your contest history database has **474 contests** with:

- ✅ Real contest names (e.g., "Codeforces Round 1076 (Div. 3)")
- ✅ Rank and rating data
- ❌ Missing `total_participants` (only 2 of 474 have this)
- ❌ Missing `problems_data` (0 of 474 have this)
- ❌ Missing `score` (only 2 of 474 have this)
- ❌ Missing `contest_url` for most contests

## Why Data is Missing

The contests were synced before the enhancements were implemented. The old sync code didn't fetch or save:

- Total participants count
- Problem-level data (solved, upsolve, attempts, time)
- Score and max score
- Contest URLs

## What Will Happen After Sync

When you click **"Sync All Platforms"**, the enhanced sync will:

1. **Fetch comprehensive data from CLIST API** including:
   - `total_participants` (from `stat.contest.n_statistics`)
   - `score` (from `stat.solving`)
   - `total_problems` and `problems_data` (from `stat.addition.problems`)
   - `contest_url`, `penalty`, `duration`, etc.

2. **Update all 474 existing contests** with the new data (using the update logic in `saveContestHistory`)

3. **Enrich with platform-specific upsolve detection**:
   - Codeforces: Query native API to check if problems solved after contest
   - AtCoder: Check submission timestamps vs contest end time
   - LeetCode: Contest problem sets vs total solves

4. **Update contest names** (already done, but will re-verify)

## Expected UI Changes After Sync

### Before Sync (Current State)

```
Contest Card:
┌────────────────────────────────────┐
│ Rank: 11174                        │
│ Score: —                           │
│ Codeforces Round 1076 (Div. 3)     │
│ (No problem badges shown)          │
└────────────────────────────────────┘
```

### After Sync (Enhanced State)

```
Contest Card:
┌────────────────────────────────────┐
│ Rank: 11174                        │
│ Percentage: 12.5% (top percentile) │
│ Score: 1250/2000                   │
│ Codeforces Round 1076 (Div. 3)     │
│ 🟢 A  🟢 B  🟡 C  ⚪ D  🔴 E        │
│                                    │
│ Legend:                            │
│ 🟢 = Solved during contest         │
│ 🟡 = Upsolve (after contest)       │
│ 🔴 = Failed attempts               │
│ ⚪ = Not attempted (gray dashed)   │
└────────────────────────────────────┘
```

## How to Trigger Sync

### Option 1: UI (Recommended)

1. Navigate to `/account/member/problem-solving`
2. Click the **"Sync All Platforms"** button in the hero section
3. Wait for sync to complete (~30-60 seconds)
4. Refresh the page to see updated contest cards

### Option 2: Development Server Test

```bash
# Start the development server
npm run dev

# Open browser to http://localhost:3000
# Login and navigate to Problem Solving page
# Click "Sync All Platforms"
```

## What the Sync Will Do (Technical Details)

The `fullSyncAction` (lines 1991-2045 in `problem-solving-actions.js`) will:

```javascript
// STEP 1-3: Sync submissions, ratings, contests per platform
for (const platform of platforms) {
  await syncPlatformSubmissions(...)
  await syncRatingHistory(...)
  await syncContestHistory(...) // Gets basic data
}

// STEP 4: Aggregated enriched sync (NEW!)
const aggregatedContests = await clistService.getAggregatedContestHistory(
  handlesList,
  10000,  // Fetch ALL contests
  true    // Enable problem enrichment
);

// This updates all 474 existing contests with:
await clistService.saveContestHistory(user.id, aggregatedContests);

// STEP 5: Update contest names (already done, but re-verifies)
await clistService.updateContestNamesInDatabase(user.id);
```

## Expected Results

### Database After Sync

```sql
SELECT
  COUNT(*) as total,
  COUNT(total_participants) as with_participants,
  COUNT(problems_data) as with_problems,
  COUNT(score) as with_score
FROM contest_history
WHERE user_id = '4d4f226e-3324-4680-936e-25c8e4aa41df';
```

**Before:**

```
 total | with_participants | with_problems | with_score
-------+-------------------+---------------+------------
   474 |                 2 |             0 |          2
```

**After (Expected):**

```
 total | with_participants | with_problems | with_score
-------+-------------------+---------------+------------
   474 |               474 |           474 |        474
```

### UI Changes Checklist

After sync, verify:

- [ ] **Rank Column**: Shows rank number + percentage (e.g., "11174" with "12.5%" below it)
- [ ] **Score Column**: Shows score/max (e.g., "1250/2000") instead of just solved count
- [ ] **Problem Badges**:
  - [ ] Green badges for problems solved during contest
  - [ ] Yellow badges for upsolves
  - [ ] Red badges for failed attempts
  - [ ] Gray dashed badges for unattempted problems
- [ ] **Hover Tooltips**: Detailed problem info (name, status, time, attempts)
- [ ] **Contest Names**: Real names like "Codeforces Round 1076 (Div. 3)"
- [ ] **Platform Stats**: Only count rated contests (exclude virtual/unrated)

## Files Modified for This Feature

### Database Schema

- `supabase/migrations/20260405080000_enhance_contest_history.sql`
  - Added `total_problems`, `problems_data`, `penalty`, etc.

### Server Actions

- `/app/_lib/problem-solving-actions.js`
  - Fixed column name mismatches (lines 1531-1590)
  - Enhanced `fullSyncAction` with aggregated sync (lines 1991-2045)

### Services

- `/app/_lib/problem-solving-services.js`
  - `getContestStatistics()`: Extracts problem data from CLIST
  - `saveContestHistory()`: Saves all new fields including updates
  - `getAggregatedContestHistory()`: Enriches with upsolve detection

### UI Components

- `/app/account/member/problem-solving/_components/ContestHistory.js`
  - Problem badge colors (lines 219-266)
  - Percentage display (lines 520-531)
  - Contest name display (lines 469-494)

## Troubleshooting

### If sync fails with "Could not find the table" error:

The migration may not have been applied. Run:

```bash
npx supabase migration up
```

### If percentage still doesn't show:

Check if `total_participants` is populated:

```sql
SELECT rank, total_participants
FROM contest_history
WHERE user_id = '4d4f226e-3324-4680-936e-25c8e4aa41df'
LIMIT 5;
```

If still NULL, CLIST may not be providing this data. The UI will gracefully handle missing data.

### If problem badges don't show:

Check if `problems_data` is populated:

```sql
SELECT
  contest_name,
  problems_data
FROM contest_history
WHERE user_id = '4d4f226e-3324-4680-936e-25c8e4aa41df'
  AND problems_data IS NOT NULL
LIMIT 1;
```

## CLIST API Data Structure

What CLIST returns in `stat.addition.problems`:

```json
{
  "A": {
    "result": "+2", // "+2" means solved with 2 wrong attempts
    "time": 1234, // Time in seconds
    "url": "https://...",
    "name": "Two Sum"
  },
  "B": {
    "result": "-3", // "-3" means 3 failed attempts, not solved
    "time": null
  },
  "C": {
    "result": null // Not attempted
  }
}
```

This gets transformed to:

```json
[
  {
    "label": "A",
    "solved": true,
    "solvedDuringContest": true,
    "upsolve": false, // Set by enrichContestsWithProblemsForPlatform
    "wrongAttempts": 2,
    "time": 1234,
    "url": "https://...",
    "name": "Two Sum"
  },
  {
    "label": "B",
    "solved": false,
    "attempted": true,
    "wrongAttempts": 3
  },
  {
    "label": "C",
    "solved": false,
    "attempted": false
  }
]
```

## Next Steps

1. **Trigger the sync** using "Sync All Platforms" button
2. **Wait ~30-60 seconds** for the sync to complete
3. **Refresh the page** to see the updated contest cards
4. **Verify** that problem badges, percentages, and scores are showing

If you encounter any issues, check the browser console and server logs for error messages.

---

**Last Updated:** April 6, 2026  
**Status:** Ready for Sync ✅
