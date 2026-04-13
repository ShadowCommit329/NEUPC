-- Migration: Remove invalid default value from users.status_changed_by
-- Created: 2026-04-05
-- Issue: Default value points to a specific user UUID that may not exist in fresh database
-- Fix: Remove default, allow NULL (which is already allowed by is_nullable = YES)

-- Remove the default value for status_changed_by
ALTER TABLE "public"."users" 
ALTER COLUMN "status_changed_by" DROP DEFAULT;

-- Add comment explaining the column
COMMENT ON COLUMN "public"."users"."status_changed_by" IS 'UUID of user/admin who last changed the account_status. NULL for self-signup or system changes.';
