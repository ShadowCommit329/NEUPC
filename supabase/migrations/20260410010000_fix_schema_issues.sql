-- Migration: Fix Schema Issues — Professional Hardening
-- Date: 2026-04-10
-- Description:
--   Addresses all issues identified in the V3 schema audit:
--   1.  Add updated_at columns to contest_history, submissions
--   2.  Create updated_at triggers for all problem-solving tables that were missing them
--   3.  Fix FK ON DELETE actions (drop & recreate with proper clause)
--   4.  Backfill user_platform_stats V3 columns from old columns
--   5.  Drop redundant old columns in user_platform_stats
--   6.  Add RLS INSERT / UPDATE / DELETE policies for all problem-solving tables
--   7.  Validate all previously-unvalidated FK constraints
--   8.  Add missing composite indexes
--   9.  Add missing unique constraint on user_platform_stats(user_id, platform_id)

-- ============================================================
-- 1. Add missing updated_at columns
-- ============================================================

ALTER TABLE "public"."contest_history"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();

ALTER TABLE "public"."submissions"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- 2. updated_at triggers
--    All use the existing update_updated_at_column() function.
--    CREATE OR REPLACE makes this idempotent.
-- ============================================================

-- user_handles
DROP TRIGGER IF EXISTS update_user_handles_updated_at ON public.user_handles;
CREATE TRIGGER update_user_handles_updated_at
  BEFORE UPDATE ON public.user_handles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_solves
DROP TRIGGER IF EXISTS update_user_solves_updated_at ON public.user_solves;
CREATE TRIGGER update_user_solves_updated_at
  BEFORE UPDATE ON public.user_solves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_platform_stats
DROP TRIGGER IF EXISTS update_user_platform_stats_updated_at ON public.user_platform_stats;
CREATE TRIGGER update_user_platform_stats_updated_at
  BEFORE UPDATE ON public.user_platform_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_tag_stats
DROP TRIGGER IF EXISTS update_user_tag_stats_updated_at ON public.user_tag_stats;
CREATE TRIGGER update_user_tag_stats_updated_at
  BEFORE UPDATE ON public.user_tag_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_goals
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- leaderboard_cache
DROP TRIGGER IF EXISTS update_leaderboard_cache_updated_at ON public.leaderboard_cache;
CREATE TRIGGER update_leaderboard_cache_updated_at
  BEFORE UPDATE ON public.leaderboard_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- contest_history (column just added above)
DROP TRIGGER IF EXISTS update_contest_history_updated_at ON public.contest_history;
CREATE TRIGGER update_contest_history_updated_at
  BEFORE UPDATE ON public.contest_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- submissions (column just added above)
DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Fix FK ON DELETE actions
--    Strategy:
--      • → platforms  : RESTRICT   (platform data is immutable reference data)
--      • → tags       : CASCADE    (tag cleanup should remove stats)
--      • → languages  : SET NULL   (language removal shouldn't lose solutions)
--      • → badge_definitions : CASCADE (badge removal should remove user badges)
-- ============================================================

-- 3a. contest_history.platform_id → RESTRICT
ALTER TABLE "public"."contest_history"
  DROP CONSTRAINT IF EXISTS "contest_history_platform_id_fkey";
ALTER TABLE "public"."contest_history"
  ADD CONSTRAINT "contest_history_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE RESTRICT;

-- 3b. rating_history.platform_id → RESTRICT
ALTER TABLE "public"."rating_history"
  DROP CONSTRAINT IF EXISTS "rating_history_platform_id_fkey";
ALTER TABLE "public"."rating_history"
  ADD CONSTRAINT "rating_history_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE RESTRICT;

-- 3c. problems.platform_id → RESTRICT
ALTER TABLE "public"."problems"
  DROP CONSTRAINT IF EXISTS "problems_platform_id_fkey";
ALTER TABLE "public"."problems"
  ADD CONSTRAINT "problems_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE RESTRICT;

-- 3d. problems.difficulty_tier_id → SET NULL  (already exists but not validated — recreate cleanly)
ALTER TABLE "public"."problems"
  DROP CONSTRAINT IF EXISTS "problems_difficulty_tier_id_fkey";
ALTER TABLE "public"."problems"
  ADD CONSTRAINT "problems_difficulty_tier_id_fkey"
  FOREIGN KEY ("difficulty_tier_id") REFERENCES "public"."difficulty_tiers"("id")
  ON DELETE SET NULL;

-- 3e. user_handles.platform_id → RESTRICT
ALTER TABLE "public"."user_handles"
  DROP CONSTRAINT IF EXISTS "user_handles_platform_id_fkey";
ALTER TABLE "public"."user_handles"
  ADD CONSTRAINT "user_handles_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE RESTRICT;

-- 3f. user_platform_stats.platform_id → CASCADE
--     (stats are worthless without the platform row)
ALTER TABLE "public"."user_platform_stats"
  DROP CONSTRAINT IF EXISTS "user_platform_stats_platform_id_fkey";
ALTER TABLE "public"."user_platform_stats"
  ADD CONSTRAINT "user_platform_stats_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE CASCADE;

-- 3g. user_tag_stats.tag_id → CASCADE
ALTER TABLE "public"."user_tag_stats"
  DROP CONSTRAINT IF EXISTS "user_tag_stats_tag_id_fkey";
ALTER TABLE "public"."user_tag_stats"
  ADD CONSTRAINT "user_tag_stats_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id")
  ON DELETE CASCADE;

-- 3h. user_badges.badge_id → CASCADE
ALTER TABLE "public"."user_badges"
  DROP CONSTRAINT IF EXISTS "user_badges_badge_id_fkey";
ALTER TABLE "public"."user_badges"
  ADD CONSTRAINT "user_badges_badge_id_fkey"
  FOREIGN KEY ("badge_id") REFERENCES "public"."badge_definitions"("id")
  ON DELETE CASCADE;

-- 3i. solutions.language_id → SET NULL
ALTER TABLE "public"."solutions"
  DROP CONSTRAINT IF EXISTS "solutions_language_id_fkey";
ALTER TABLE "public"."solutions"
  ADD CONSTRAINT "solutions_language_id_fkey"
  FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id")
  ON DELETE SET NULL;

-- 3j. submissions.language_id → SET NULL
ALTER TABLE "public"."submissions"
  DROP CONSTRAINT IF EXISTS "submissions_language_id_fkey";
ALTER TABLE "public"."submissions"
  ADD CONSTRAINT "submissions_language_id_fkey"
  FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id")
  ON DELETE SET NULL;

-- 3k. submissions.platform_id → RESTRICT
ALTER TABLE "public"."submissions"
  DROP CONSTRAINT IF EXISTS "submissions_platform_id_fkey";
ALTER TABLE "public"."submissions"
  ADD CONSTRAINT "submissions_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id")
  ON DELETE RESTRICT;

-- ============================================================
-- 4. Backfill V3 columns from old columns in user_platform_stats
--    Old: contests_participated, submissions_count
--    New: contest_count, total_submissions  (added in v3_normalization)
-- ============================================================

UPDATE "public"."user_platform_stats"
SET
  contest_count    = COALESCE(contest_count, 0)    + COALESCE(contests_participated, 0),
  total_submissions = COALESCE(total_submissions, 0) + COALESCE(submissions_count, 0)
WHERE
  (contests_participated IS NOT NULL AND contests_participated > 0)
  OR (submissions_count IS NOT NULL AND submissions_count > 0);

-- ============================================================
-- 5. Drop redundant old columns (data preserved in V3 columns)
-- ============================================================

ALTER TABLE "public"."user_platform_stats"
  DROP COLUMN IF EXISTS "contests_participated",
  DROP COLUMN IF EXISTS "submissions_count";

-- ============================================================
-- 6. Add unique constraint on user_platform_stats(user_id, platform_id)
--    Required for ON CONFLICT upserts in services
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_user_platform_stats_user_platform'
      AND conrelid = 'public.user_platform_stats'::regclass
  ) THEN
    ALTER TABLE "public"."user_platform_stats"
      ADD CONSTRAINT "uq_user_platform_stats_user_platform"
      UNIQUE ("user_id", "platform_id");
  END IF;
END $$;

-- ============================================================
-- 7. RLS — Add INSERT / UPDATE / DELETE policies (idempotent)
--    Pattern: authenticated users own their data; service_role bypasses RLS.
--    Uses DO blocks so re-running is safe.
-- ============================================================

DO $policies$
DECLARE
  pol RECORD;
BEGIN
  -- Helper: create policy only if it doesn't exist
  -- (Postgres has no CREATE POLICY IF NOT EXISTS before pg16)

  -- ── user_handles ──────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_handles_insert_own' AND tablename = 'user_handles' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_handles_insert_own" ON public.user_handles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_handles_update_own' AND tablename = 'user_handles' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_handles_update_own" ON public.user_handles FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_handles_delete_own' AND tablename = 'user_handles' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_handles_delete_own" ON public.user_handles FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_solves ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_solves_insert_own' AND tablename = 'user_solves' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_solves_insert_own" ON public.user_solves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_solves_update_own' AND tablename = 'user_solves' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_solves_update_own" ON public.user_solves FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_solves_delete_own' AND tablename = 'user_solves' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_solves_delete_own" ON public.user_solves FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── solutions ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'solutions_insert_own' AND tablename = 'solutions' AND schemaname = 'public') THEN
    EXECUTE $q$CREATE POLICY "solutions_insert_own" ON public.solutions FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_solves us WHERE us.id = user_solve_id AND us.user_id = auth.uid()))$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'solutions_update_own' AND tablename = 'solutions' AND schemaname = 'public') THEN
    EXECUTE $q$CREATE POLICY "solutions_update_own" ON public.solutions FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_solves us WHERE us.id = user_solve_id AND us.user_id = auth.uid()))$q$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'solutions_delete_own' AND tablename = 'solutions' AND schemaname = 'public') THEN
    EXECUTE $q$CREATE POLICY "solutions_delete_own" ON public.solutions FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_solves us WHERE us.id = user_solve_id AND us.user_id = auth.uid()))$q$;
  END IF;

  -- ── submissions ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'submissions_select_own' AND tablename = 'submissions' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "submissions_select_own" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── contest_history ───────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contest_history_insert_own' AND tablename = 'contest_history' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "contest_history_insert_own" ON public.contest_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- ── rating_history ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rating_history_insert_own' AND tablename = 'rating_history' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "rating_history_insert_own" ON public.rating_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;

  -- ── user_platform_stats ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_platform_stats_insert_own' AND tablename = 'user_platform_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_platform_stats_insert_own" ON public.user_platform_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_platform_stats_update_own' AND tablename = 'user_platform_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_platform_stats_update_own" ON public.user_platform_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_stats ────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_stats_insert_own' AND tablename = 'user_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_stats_insert_own" ON public.user_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_stats_update_own' AND tablename = 'user_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_stats_update_own" ON public.user_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_tag_stats ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tag_stats_insert_own' AND tablename = 'user_tag_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_tag_stats_insert_own" ON public.user_tag_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tag_stats_update_own' AND tablename = 'user_tag_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_tag_stats_update_own" ON public.user_tag_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_badges ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_badges_delete_own' AND tablename = 'user_badges' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_badges_delete_own" ON public.user_badges FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_goals ────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_goals_insert_own' AND tablename = 'user_goals' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_goals_insert_own" ON public.user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_goals_update_own' AND tablename = 'user_goals' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_goals_update_own" ON public.user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_goals_delete_own' AND tablename = 'user_goals' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_goals_delete_own" ON public.user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── leaderboard_cache (public read) ───────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaderboard_cache_public_read' AND tablename = 'leaderboard_cache' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "leaderboard_cache_public_read" ON public.leaderboard_cache FOR SELECT TO public USING (true)';
  END IF;

  -- ── problem_editorials ────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'problem_editorials_select_authenticated' AND tablename = 'problem_editorials' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "problem_editorials_select_authenticated" ON public.problem_editorials FOR SELECT TO authenticated USING (true)';
  END IF;

  -- ── user_tier_stats (V3) ──────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tier_stats_insert_own' AND tablename = 'user_tier_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_tier_stats_insert_own" ON public.user_tier_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_tier_stats_update_own' AND tablename = 'user_tier_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_tier_stats_update_own" ON public.user_tier_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  -- ── user_language_stats (V3) ──────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_language_stats_insert_own' AND tablename = 'user_language_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_language_stats_insert_own" ON public.user_language_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_language_stats_update_own' AND tablename = 'user_language_stats' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "user_language_stats_update_own" ON public.user_language_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

END $policies$;

-- ============================================================
-- 8. Validate all previously-unvalidated FK constraints
--    (safe to run; only fails if data violates the constraint)
-- ============================================================

ALTER TABLE "public"."contest_history"
  VALIDATE CONSTRAINT "contest_history_platform_id_fkey",
  VALIDATE CONSTRAINT "contest_history_user_id_fkey";

ALTER TABLE "public"."rating_history"
  VALIDATE CONSTRAINT "rating_history_platform_id_fkey",
  VALIDATE CONSTRAINT "rating_history_user_id_fkey",
  VALIDATE CONSTRAINT "rating_history_contest_id_fkey";

ALTER TABLE "public"."problems"
  VALIDATE CONSTRAINT "problems_platform_id_fkey",
  VALIDATE CONSTRAINT "problems_difficulty_tier_id_fkey";

ALTER TABLE "public"."user_handles"
  VALIDATE CONSTRAINT "user_handles_platform_id_fkey",
  VALIDATE CONSTRAINT "user_handles_user_id_fkey";

ALTER TABLE "public"."user_platform_stats"
  VALIDATE CONSTRAINT "user_platform_stats_platform_id_fkey",
  VALIDATE CONSTRAINT "user_platform_stats_user_id_fkey";

ALTER TABLE "public"."user_tag_stats"
  VALIDATE CONSTRAINT "user_tag_stats_tag_id_fkey",
  VALIDATE CONSTRAINT "user_tag_stats_user_id_fkey";

ALTER TABLE "public"."user_badges"
  VALIDATE CONSTRAINT "user_badges_badge_id_fkey",
  VALIDATE CONSTRAINT "user_badges_user_id_fkey";

ALTER TABLE "public"."user_solves"
  VALIDATE CONSTRAINT "user_solves_problem_id_fkey",
  VALIDATE CONSTRAINT "user_solves_user_id_fkey";

ALTER TABLE "public"."solutions"
  VALIDATE CONSTRAINT "solutions_user_solve_id_fkey",
  VALIDATE CONSTRAINT "solutions_language_id_fkey",
  VALIDATE CONSTRAINT "solutions_submission_id_fkey";

ALTER TABLE "public"."submissions"
  VALIDATE CONSTRAINT "submissions_user_id_fkey",
  VALIDATE CONSTRAINT "submissions_problem_id_fkey",
  VALIDATE CONSTRAINT "submissions_platform_id_fkey",
  VALIDATE CONSTRAINT "submissions_language_id_fkey";

ALTER TABLE "public"."problem_analysis"
  VALIDATE CONSTRAINT "problem_analysis_problem_id_fkey";

ALTER TABLE "public"."problem_tags"
  VALIDATE CONSTRAINT "problem_tags_problem_id_fkey";

-- ============================================================
-- 9. Missing composite/covering indexes
-- ============================================================

-- user_platform_stats — already in v3_normalization but guard anyway
CREATE INDEX IF NOT EXISTS "idx_user_platform_stats_user_platform"
  ON "public"."user_platform_stats" ("user_id", "platform_id");

-- contest_history — for per-user-per-platform queries
CREATE INDEX IF NOT EXISTS "idx_contest_history_user_platform"
  ON "public"."contest_history" ("user_id", "platform_id");

-- user_badges — for per-user badge lookups
CREATE INDEX IF NOT EXISTS "idx_user_badges_user_id"
  ON "public"."user_badges" ("user_id");

-- user_solves — covering index for solve stats queries
CREATE INDEX IF NOT EXISTS "idx_user_solves_user_problem"
  ON "public"."user_solves" ("user_id", "problem_id");

-- solutions — for the joined solutions query (user_id via user_solves FK)
CREATE INDEX IF NOT EXISTS "idx_solutions_created_at"
  ON "public"."solutions" ("created_at" DESC);

-- submissions.submitted_at — already in v3_normalization as idx_solutions_submitted_at
-- but solutions table, not submissions. Add for submissions:
CREATE INDEX IF NOT EXISTS "idx_submissions_submitted_at_desc"
  ON "public"."submissions" ("submitted_at" DESC NULLS LAST);

-- leaderboard_cache — covering index for ranking pages
CREATE INDEX IF NOT EXISTS "idx_leaderboard_monthly_score"
  ON "public"."leaderboard_cache" ("monthly_score" DESC);

-- ============================================================
-- Done
-- ============================================================

COMMENT ON TABLE "public"."contest_history"
  IS 'Per-user contest participation history. updated_at trigger added in fix-schema migration.';

COMMENT ON TABLE "public"."submissions"
  IS 'All raw submissions from external platforms. updated_at trigger added in fix-schema migration.';

COMMENT ON TABLE "public"."user_platform_stats"
  IS 'V3: Per-user per-platform stats. contests_participated/submissions_count merged into contest_count/total_submissions.';
