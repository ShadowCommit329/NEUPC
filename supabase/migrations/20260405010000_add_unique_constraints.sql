-- Add unique constraints for rating_history and contest_history to support upsert operations

-- Unique constraint on rating_history for (user_id, platform_id, recorded_at)
-- This allows tracking multiple rating changes per user per platform over time
CREATE UNIQUE INDEX IF NOT EXISTS idx_rating_history_user_platform_date 
ON public.rating_history (user_id, platform_id, recorded_at);

-- Unique constraint on contest_history for (user_id, platform_id, external_contest_id)
-- This allows tracking one entry per user per contest per platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_history_user_platform_contest 
ON public.contest_history (user_id, platform_id, external_contest_id);
