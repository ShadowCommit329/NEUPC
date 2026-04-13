-- Increase varchar length for problem and contest IDs to prevent overflow
-- This affects problems.external_id, problems.contest_id, and contest_history.external_contest_id

-- Problems table: external_id and contest_id
ALTER TABLE public.problems 
  ALTER COLUMN external_id TYPE character varying(200);

ALTER TABLE public.problems 
  ALTER COLUMN contest_id TYPE character varying(200);

-- Contest history table: external_contest_id
ALTER TABLE public.contest_history 
  ALTER COLUMN external_contest_id TYPE character varying(200);
