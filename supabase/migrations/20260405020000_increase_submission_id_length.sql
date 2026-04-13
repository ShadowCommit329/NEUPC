-- Increase varchar length for external_submission_id and external_problem_id
-- to accommodate longer IDs from platforms like LeetCode
-- Example: "lc_contest_weekly-contest-123_longest-substring-with-at-least-k-repeating-characters"

ALTER TABLE public.submissions 
  ALTER COLUMN external_submission_id TYPE character varying(200);

ALTER TABLE public.submissions 
  ALTER COLUMN external_problem_id TYPE character varying(200);
