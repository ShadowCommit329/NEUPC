-- Migration: Add problem details and tutorials
-- Description: Adds columns for problem description, I/O format, examples, tutorial content, and tutorial solutions

-- Add problem content columns to problems table
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS input_format TEXT,
  ADD COLUMN IF NOT EXISTS output_format TEXT,
  ADD COLUMN IF NOT EXISTS constraints TEXT,
  ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS tutorial_url TEXT,
  ADD COLUMN IF NOT EXISTS tutorial_content TEXT,
  ADD COLUMN IF NOT EXISTS tutorial_extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tutorial_solutions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_limit_ms INTEGER,
  ADD COLUMN IF NOT EXISTS memory_limit_kb INTEGER;

-- Add index for faster tutorial lookups
CREATE INDEX IF NOT EXISTS idx_problems_tutorial_url ON public.problems(tutorial_url) WHERE tutorial_url IS NOT NULL;

-- Add index for problems with examples
CREATE INDEX IF NOT EXISTS idx_problems_with_examples ON public.problems USING GIN(examples) WHERE jsonb_array_length(examples) > 0;

-- Add index for problems with tutorial solutions
CREATE INDEX IF NOT EXISTS idx_problems_with_tutorial_solutions ON public.problems USING GIN(tutorial_solutions) WHERE jsonb_array_length(tutorial_solutions) > 0;

COMMENT ON COLUMN public.problems.description IS 'Full problem statement/description';
COMMENT ON COLUMN public.problems.input_format IS 'Input format specification';
COMMENT ON COLUMN public.problems.output_format IS 'Output format specification';
COMMENT ON COLUMN public.problems.constraints IS 'Problem constraints';
COMMENT ON COLUMN public.problems.examples IS 'Array of example test cases [{input: string, output: string, explanation?: string}]';
COMMENT ON COLUMN public.problems.notes IS 'Additional notes from problem statement';
COMMENT ON COLUMN public.problems.tutorial_url IS 'URL to the official tutorial/editorial';
COMMENT ON COLUMN public.problems.tutorial_content IS 'Extracted tutorial/editorial content';
COMMENT ON COLUMN public.problems.tutorial_extracted_at IS 'When the tutorial was last extracted';
COMMENT ON COLUMN public.problems.tutorial_solutions IS 'Array of solution code from tutorial [{code: string, language: string, approach_name: string, explanation?: string, order: number}]';
COMMENT ON COLUMN public.problems.time_limit_ms IS 'Time limit in milliseconds';
COMMENT ON COLUMN public.problems.memory_limit_kb IS 'Memory limit in kilobytes';
