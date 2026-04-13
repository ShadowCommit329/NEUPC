-- Add CLIST account ID to user_handles for caching CLIST account lookups
-- This avoids repeated searches for the same account on CLIST API

ALTER TABLE "public"."user_handles"
ADD COLUMN "clist_account_id" integer;

COMMENT ON COLUMN "public"."user_handles"."clist_account_id" IS 'Cached CLIST account ID from CLIST API to avoid repeated searches';
