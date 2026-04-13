-- Migration: Create sync_checkpoints table
-- Created: 2026-04-05
-- Purpose: Track incremental sync progress for each user-platform combination

CREATE TABLE IF NOT EXISTS "public"."sync_checkpoints" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "platform" character varying(50) NOT NULL,
    "sync_status" character varying(20) DEFAULT 'pending',
    "sync_started_at" timestamp with time zone,
    "sync_completed_at" timestamp with time zone,
    "last_checkpoint_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "last_submission_id" character varying(200),
    "last_submission_date" timestamp with time zone,
    "last_contest_id" character varying(200),
    "last_rating_date" timestamp with time zone,
    "total_inserted" integer DEFAULT 0,
    "sync_count" integer DEFAULT 0,
    "error_message" text,
    "error_details" jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "sync_checkpoints_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sync_checkpoints_user_platform_unique" UNIQUE ("user_id", "platform")
);

-- Add foreign keys
ALTER TABLE "public"."sync_checkpoints" 
ADD CONSTRAINT "sync_checkpoints_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "sync_checkpoints_user_id_idx" 
ON "public"."sync_checkpoints" ("user_id");

CREATE INDEX IF NOT EXISTS "sync_checkpoints_platform_idx" 
ON "public"."sync_checkpoints" ("platform");

CREATE INDEX IF NOT EXISTS "sync_checkpoints_sync_status_idx" 
ON "public"."sync_checkpoints" ("sync_status");

CREATE INDEX IF NOT EXISTS "sync_checkpoints_last_synced_at_idx" 
ON "public"."sync_checkpoints" ("last_synced_at");

-- Enable Row Level Security
ALTER TABLE "public"."sync_checkpoints" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync checkpoints"
ON "public"."sync_checkpoints"
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync checkpoints"
ON "public"."sync_checkpoints"
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync checkpoints"
ON "public"."sync_checkpoints"
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync checkpoints"
ON "public"."sync_checkpoints"
FOR DELETE
USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE "public"."sync_checkpoints" IS 'Tracks incremental sync progress for each user-platform combination';
COMMENT ON COLUMN "public"."sync_checkpoints"."last_synced_at" IS 'Timestamp of last successful sync';
COMMENT ON COLUMN "public"."sync_checkpoints"."last_submission_id" IS 'Last processed submission ID (platform-specific)';
COMMENT ON COLUMN "public"."sync_checkpoints"."last_submission_date" IS 'Date of last processed submission';
COMMENT ON COLUMN "public"."sync_checkpoints"."last_contest_id" IS 'Last processed contest ID (platform-specific)';
COMMENT ON COLUMN "public"."sync_checkpoints"."last_rating_date" IS 'Date of last processed rating change';
COMMENT ON COLUMN "public"."sync_checkpoints"."sync_count" IS 'Total number of syncs performed';
