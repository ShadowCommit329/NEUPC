-- Store source code for non-accepted submissions when a problem is not solved yet.
-- This keeps failed attempt code queryable without creating synthetic user_solves rows.

CREATE TABLE IF NOT EXISTS "public"."unsolved_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "platform_id" smallint NOT NULL REFERENCES "public"."platforms"("id") ON DELETE CASCADE,
  "problem_id" uuid REFERENCES "public"."problems"("id") ON DELETE SET NULL,
  "submission_id" uuid NOT NULL UNIQUE REFERENCES "public"."submissions"("id") ON DELETE CASCADE,
  "external_problem_id" character varying(50) NOT NULL,
  "problem_name" character varying(255),
  "source_code" text NOT NULL,
  "language_id" smallint REFERENCES "public"."languages"("id") ON DELETE SET NULL,
  "verdict" character varying(30) NOT NULL,
  "execution_time_ms" integer,
  "memory_kb" integer,
  "submitted_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_unsolved_attempts_user_problem_submitted"
  ON "public"."unsolved_attempts" ("user_id", "platform_id", "external_problem_id", "submitted_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_unsolved_attempts_problem"
  ON "public"."unsolved_attempts" ("problem_id");

ALTER TABLE "public"."unsolved_attempts" ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS "update_unsolved_attempts_updated_at" ON "public"."unsolved_attempts";
CREATE TRIGGER "update_unsolved_attempts_updated_at"
  BEFORE UPDATE ON "public"."unsolved_attempts"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_updated_at_column"();
