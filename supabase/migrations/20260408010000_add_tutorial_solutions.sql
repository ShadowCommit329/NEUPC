-- Migration: Add tutorial solutions and time/memory limits
-- Description: Adds tutorial_solutions JSONB array, time_limit_ms, and memory_limit_kb to problems table

-- Add tutorial solutions and limits columns
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS tutorial_solutions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER,
  ADD COLUMN IF NOT EXISTS memory_limit_kb INTEGER;

-- Add index for problems with tutorial solutions
CREATE INDEX IF NOT EXISTS idx_problems_with_tutorial_solutions 
  ON public.problems USING GIN(tutorial_solutions) 
  WHERE jsonb_array_length(tutorial_solutions) > 0;

-- Add comments
COMMENT ON COLUMN public.problems.tutorial_solutions IS 'Array of solution code from tutorial [{code: string, language: string, approach_name: string, explanation?: string, order: number}]';
COMMENT ON COLUMN public.problems.time_limit_ms IS 'Time limit in milliseconds';
COMMENT ON COLUMN public.problems.memory_limit_kb IS 'Memory limit in kilobytes';
