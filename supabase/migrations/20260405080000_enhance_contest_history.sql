-- Migration: Enhance contest_history table with additional fields for richer data storage
-- This adds columns for: total_problems, problems_data (JSON), penalty, platform_contest_id, max_score

-- Add total_problems column (total number of problems in the contest)
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS total_problems smallint DEFAULT NULL;

-- Add problems_data column (JSONB for per-problem details: solved, upsolve, wrong attempts, time, etc.)
-- Structure: [{ "label": "A", "solved": true, "solvedDuringContest": true, "upsolve": false, 
--               "attempted": true, "wrongAttempts": 2, "time": "01:23", "result": "+2" }, ...]
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS problems_data jsonb DEFAULT NULL;

-- Add penalty column (for ICPC-style contests with time penalty)
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS penalty integer DEFAULT NULL;

-- Add platform_contest_id column (the actual contest ID on the platform, e.g., "1956" for CF round 1956)
-- This is different from external_contest_id which is CLIST's internal ID
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS platform_contest_id varchar(100) DEFAULT NULL;

-- Add max_score column (maximum possible score in the contest)
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS max_score numeric(10,2) DEFAULT NULL;

-- Add contest_end_date column (for calculating duration and virtual participation timing)
ALTER TABLE contest_history
ADD COLUMN IF NOT EXISTS contest_end_date timestamp with time zone DEFAULT NULL;

-- Add index on platform_contest_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_contest_history_platform_contest_id 
ON contest_history(platform_id, platform_contest_id) 
WHERE platform_contest_id IS NOT NULL;

-- Add comment explaining the problems_data structure
COMMENT ON COLUMN contest_history.problems_data IS 
'JSON array of problem-level data. Each element: { label, solved, solvedDuringContest, upsolve, attempted, wrongAttempts, time, result, url, name }';

COMMENT ON COLUMN contest_history.platform_contest_id IS 
'Native platform contest ID (e.g., CF "1956", AtCoder "abc372"). Different from external_contest_id which is CLIST internal ID.';
