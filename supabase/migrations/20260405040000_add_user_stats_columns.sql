-- Migration: Add missing columns to user_stats table
-- Created: 2026-04-05
-- Purpose: Add solved_this_week and solved_this_month columns for leaderboard tracking

-- Add solved_this_week column
ALTER TABLE "public"."user_stats" 
ADD COLUMN IF NOT EXISTS "solved_this_week" integer DEFAULT 0;

-- Add solved_this_month column
ALTER TABLE "public"."user_stats" 
ADD COLUMN IF NOT EXISTS "solved_this_month" integer DEFAULT 0;

-- Add comment
COMMENT ON COLUMN "public"."user_stats"."solved_this_week" IS 'Number of problems solved in the current week';
COMMENT ON COLUMN "public"."user_stats"."solved_this_month" IS 'Number of problems solved in the current month';
