-- Migration: V3 Schema Normalization
-- Date: 2026-04-10
-- Description:
--   Implements the V3 ER diagram normalization:
--   1. Add user_tier_stats table (replaces flat solved_800..2500 columns)
--   2. Add problem_editorials table (1:1 with problems)
--   3. Add rank_title to user_platform_stats
--   4. Add submitted_at to solutions for version ordering
--   5. Add contest_end_date, problems_data, total_problems to contest_history
--   6. Add user_language_stats table
--   7. Populate user_tier_stats from existing user_stats flat columns

-- ============================================================
-- 1. user_tier_stats
--    Replaces flat solved_800..2500 columns in user_stats.
--    Keeps user_stats flat columns too for backward compatibility
--    until all sync code is updated.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."user_tier_stats" (
  "id"                 uuid         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"            uuid         NOT NULL,
  "difficulty_tier_id" smallint     NOT NULL,
  "solved_count"       integer      NOT NULL DEFAULT 0,
  "attempt_count"      integer      NOT NULL DEFAULT 0,
  "updated_at"         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "user_tier_stats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_tier_stats_user_tier_unique" UNIQUE ("user_id", "difficulty_tier_id"),
  CONSTRAINT "user_tier_stats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_tier_stats_tier_id_fkey"
    FOREIGN KEY ("difficulty_tier_id") REFERENCES "public"."difficulty_tiers"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."user_tier_stats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tier_stats_select_own"
  ON "public"."user_tier_stats" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_tier_stats_select_all_authenticated"
  ON "public"."user_tier_stats" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS "idx_user_tier_stats_user_id"
  ON "public"."user_tier_stats" ("user_id");

COMMENT ON TABLE "public"."user_tier_stats"
  IS 'V3: Per-user difficulty tier solve counts. Replaces flat solved_NNN columns in user_stats.';

-- ============================================================
-- 2. problem_editorials  (1:1 with problems)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."problem_editorials" (
  "id"                       uuid         NOT NULL DEFAULT gen_random_uuid(),
  "problem_id"               uuid         NOT NULL,
  "tutorial_url"             text,
  "tutorial_content"         text,
  "tutorial_solutions"       jsonb        DEFAULT '[]'::jsonb,
  "tutorial_extracted_at"    timestamptz,
  "created_at"               timestamptz  NOT NULL DEFAULT now(),
  "updated_at"               timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "problem_editorials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "problem_editorials_problem_id_unique" UNIQUE ("problem_id"),
  CONSTRAINT "problem_editorials_problem_id_fkey"
    FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."problem_editorials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "problem_editorials_select_authenticated"
  ON "public"."problem_editorials" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS "idx_problem_editorials_problem_id"
  ON "public"."problem_editorials" ("problem_id");

COMMENT ON TABLE "public"."problem_editorials"
  IS 'V3: Editorial/tutorial content for problems. 1:1 with problems.';

-- ============================================================
-- 3. user_language_stats
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."user_language_stats" (
  "id"           uuid         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid         NOT NULL,
  "language_id"  smallint     NOT NULL,
  "solved_count" integer      NOT NULL DEFAULT 0,
  "updated_at"   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "user_language_stats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_language_stats_user_lang_unique" UNIQUE ("user_id", "language_id"),
  CONSTRAINT "user_language_stats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_language_stats_language_id_fkey"
    FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."user_language_stats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_language_stats_select_own"
  ON "public"."user_language_stats" FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS "idx_user_language_stats_user_id"
  ON "public"."user_language_stats" ("user_id");

COMMENT ON TABLE "public"."user_language_stats"
  IS 'V3: Per-user programming language solve counts.';

-- ============================================================
-- 4. Add missing columns to existing tables
-- ============================================================

-- user_platform_stats: add rank_title, total_submissions
ALTER TABLE "public"."user_platform_stats"
  ADD COLUMN IF NOT EXISTS "rank_title"         varchar(100),
  ADD COLUMN IF NOT EXISTS "total_submissions"  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contest_count"      integer DEFAULT 0;

-- solutions: add submitted_at for version ordering
ALTER TABLE "public"."solutions"
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;

-- contest_history: add V3 fields
ALTER TABLE "public"."contest_history"
  ADD COLUMN IF NOT EXISTS "contest_end_date"   timestamptz,
  ADD COLUMN IF NOT EXISTS "problems_data"      jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "total_problems"     smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_score"          numeric(10,2),
  ADD COLUMN IF NOT EXISTS "penalty"            integer  DEFAULT 0;

-- user_stats: add solved_2000_plus breakdown columns if missing
ALTER TABLE "public"."user_stats"
  ADD COLUMN IF NOT EXISTS "solved_2000" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solved_2100" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solved_2200" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solved_2300" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solved_2400" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solved_2500_plus" integer DEFAULT 0;

-- ============================================================
-- 5. Backfill user_tier_stats from existing user_stats flat cols
--    Runs only if difficulty_tiers table has the expected tiers.
--    This is idempotent (ON CONFLICT DO NOTHING).
-- ============================================================

DO $$
DECLARE
  tier_record RECORD;
  col_name TEXT;
BEGIN
  -- Map tier min_rating to column name in user_stats
  FOR tier_record IN
    SELECT id, min_rating FROM public.difficulty_tiers ORDER BY min_rating
  LOOP
    CASE tier_record.min_rating
      WHEN 800  THEN col_name := 'solved_800';
      WHEN 900  THEN col_name := 'solved_900';
      WHEN 1000 THEN col_name := 'solved_1000';
      WHEN 1100 THEN col_name := 'solved_1100';
      WHEN 1200 THEN col_name := 'solved_1200';
      WHEN 1300 THEN col_name := 'solved_1300';
      WHEN 1400 THEN col_name := 'solved_1400';
      WHEN 1500 THEN col_name := 'solved_1500';
      WHEN 1600 THEN col_name := 'solved_1600';
      WHEN 1700 THEN col_name := 'solved_1700';
      WHEN 1800 THEN col_name := 'solved_1800';
      WHEN 1900 THEN col_name := 'solved_1900';
      WHEN 2000 THEN col_name := 'solved_2000';
      WHEN 2100 THEN col_name := 'solved_2100';
      WHEN 2200 THEN col_name := 'solved_2200';
      WHEN 2300 THEN col_name := 'solved_2300';
      WHEN 2400 THEN col_name := 'solved_2400';
      ELSE col_name := 'solved_2500_plus';
    END CASE;

    -- Only backfill if that column exists in user_stats
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_stats'
        AND column_name = col_name
    ) THEN
      EXECUTE format(
        'INSERT INTO public.user_tier_stats (user_id, difficulty_tier_id, solved_count, updated_at)
         SELECT user_id, %L::smallint, COALESCE(%I, 0), now()
         FROM public.user_stats
         WHERE COALESCE(%I, 0) > 0
         ON CONFLICT (user_id, difficulty_tier_id) DO UPDATE
           SET solved_count = EXCLUDED.solved_count,
               updated_at   = EXCLUDED.updated_at',
        tier_record.id, col_name, col_name
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 6. Migrate existing problem editorials data from problems table
--    (tutorial_url, tutorial_solutions columns → problem_editorials)
-- ============================================================

INSERT INTO public.problem_editorials (problem_id, tutorial_url, tutorial_solutions, tutorial_extracted_at, created_at, updated_at)
SELECT
  id,
  NULL AS tutorial_url,
  COALESCE(tutorial_solutions, '[]'::jsonb),
  NULL AS tutorial_extracted_at,
  now(),
  now()
FROM public.problems
WHERE
  tutorial_solutions IS NOT NULL
  AND jsonb_array_length(tutorial_solutions) > 0
ON CONFLICT (problem_id) DO NOTHING;

-- ============================================================
-- 7. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_user_platform_stats_user_platform"
  ON "public"."user_platform_stats" ("user_id", "platform_id");

CREATE INDEX IF NOT EXISTS "idx_solutions_submitted_at"
  ON "public"."solutions" ("submitted_at" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "idx_contest_history_user_platform_date"
  ON "public"."contest_history" ("user_id", "platform_id", "contest_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_rating_history_user_platform_date"
  ON "public"."rating_history" ("user_id", "platform_id", "recorded_at" DESC);

-- ============================================================
-- Done
-- ============================================================

COMMENT ON SCHEMA public IS 'V3 normalization applied: user_tier_stats, problem_editorials, user_language_stats added.';
