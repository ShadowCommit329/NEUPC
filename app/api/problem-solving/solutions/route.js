/**
 * @file Solution Upload API Route
 * @module api/problem-solving/solutions
 * @access member
 *
 * Handles manual solution uploads for problems.
 * Supports both direct code submission and file uploads.
 *
 * Uses the new normalized schema (problems, user_solves, solutions).
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  getPlatformId,
  getLanguageId,
} from '@/app/_lib/problem-solving-v2-helpers.js';

async function resolveCurrentUserId(session) {
  if (!session?.user?.email) return null;

  const dbUser = await getCachedUserByEmail(session.user.email);
  if (dbUser?.id) return dbUser.id;

  // Fallback for environments where users table may not be in sync yet
  return session.user.id || null;
}

function slugifyTagCode(tagName) {
  return (tagName || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function upsertProblemTags(problemUuid, tagNames) {
  const cleaned = (tagNames || [])
    .map((t) => (t || '').toString().trim())
    .filter(Boolean);

  if (cleaned.length === 0) return;

  const tagRows = cleaned
    .map((name) => ({
      code: slugifyTagCode(name) || name.toLowerCase(),
      name,
      category: 'platform',
    }))
    .filter((t) => t.code);

  if (tagRows.length === 0) return;

  const { data: upsertedTags, error: tagError } = await supabaseAdmin
    .from(V2_TABLES.TAGS)
    .upsert(tagRows, { onConflict: 'code' })
    .select('id, code');

  if (tagError) {
    console.warn('[solutions] Failed to upsert tags:', tagError.message);
    return;
  }

  const tagIdByCode = new Map((upsertedTags || []).map((t) => [t.code, t.id]));

  const problemTagRows = tagRows
    .map((t) => ({
      problem_id: problemUuid,
      tag_id: tagIdByCode.get(t.code),
      source: 'manual',
    }))
    .filter((r) => r.tag_id);

  if (problemTagRows.length === 0) return;

  const { error: linkError } = await supabaseAdmin
    .from(V2_TABLES.PROBLEM_TAGS)
    .upsert(problemTagRows, { onConflict: 'problem_id,tag_id' });

  if (linkError) {
    console.warn('[solutions] Failed to link problem tags:', linkError.message);
  }
}

async function getDifficultyTierId(code) {
  if (!code) return null;
  const normalized = code.toString().trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.DIFFICULTY_TIERS)
    .select('id')
    .eq('code', normalized)
    .maybeSingle();

  if (error) {
    console.warn(
      '[solutions] Failed to resolve difficulty tier:',
      error.message
    );
    return null;
  }

  return data?.id || null;
}

function withCompatibilityFields(solution, { versionNumber } = {}) {
  if (!solution) return solution;

  const language = solution.languages?.code || solution.languages?.name || null;
  const sourceCode = extractSolutionCode(solution);
  const analysis = Array.isArray(solution.solution_analysis)
    ? solution.solution_analysis[0] || null
    : solution.solution_analysis || null;
  const aiAnalysisStatus = analysis ? 'completed' : 'pending';

  return {
    ...solution,
    source_code: sourceCode,
    sourceCode,
    code: sourceCode,
    language,
    notes: solution.personal_notes,
    updated_at: solution.created_at,
    solution_type: solution.submission_id ? 'auto_fetched' : 'manual_upload',
    ai_analysis_status: aiAnalysisStatus,
    time_complexity: analysis?.time_complexity || null,
    space_complexity: analysis?.space_complexity || null,
    version_number: versionNumber ?? null,
  };
}

function normalizeLinkedSubmission(solution) {
  if (!solution) return null;

  if (Array.isArray(solution.submissions)) {
    return solution.submissions[0] || null;
  }

  return solution.submissions || solution.submission || null;
}

function extractSolutionCode(solution) {
  if (!solution) return null;

  const linkedSubmission = normalizeLinkedSubmission(solution);

  return (
    solution.source_code ||
    solution.sourceCode ||
    solution.code ||
    solution.submission?.source_code ||
    solution.submissions?.source_code ||
    linkedSubmission?.source_code ||
    null
  );
}

function normalizeSolutionRecord(solution) {
  if (!solution) return solution;

  const linkedSubmission = normalizeLinkedSubmission(solution);

  return {
    ...solution,
    submission: linkedSubmission,
    submissions: linkedSubmission,
    external_submission_id: linkedSubmission?.external_submission_id || null,
    source_code: extractSolutionCode({
      ...solution,
      submission: linkedSubmission,
      submissions: linkedSubmission,
    }),
  };
}

function hasNonEmptySourceCode(solution) {
  const sourceCode = extractSolutionCode(solution);
  return typeof sourceCode === 'string' && sourceCode.trim().length > 0;
}

async function loadUnsolvedAttemptSolutions({
  userId,
  platformId,
  problemUuid,
  externalProblemId,
}) {
  let query = supabaseAdmin
    .from(V2_TABLES.UNSOLVED_ATTEMPTS)
    .select('*, languages(code, name), submissions(*)')
    .eq('user_id', userId)
    .eq('platform_id', platformId);

  if (problemUuid) {
    query = query.eq('problem_id', problemUuid);
  } else if (externalProblemId) {
    query = query.eq('external_problem_id', externalProblemId);
  } else {
    return [];
  }

  const { data, error } = await query
    .order('submitted_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(
      '[solutions] Failed to load unsolved attempt source fallback:',
      error.message
    );
    return [];
  }

  const attempts = data || [];

  return attempts.map((attempt, idx) => {
    const normalized = normalizeSolutionRecord({
      ...attempt,
      // Keep unresolved attempts distinguishable in UI metadata.
      solution_type: 'unsolved_attempt',
      is_primary: false,
      created_at: attempt.submitted_at || attempt.created_at,
      updated_at:
        attempt.updated_at || attempt.submitted_at || attempt.created_at,
    });

    return withCompatibilityFields(normalized, {
      versionNumber: attempts.length - idx,
    });
  });
}

export async function POST(request) {
  try {
    const session = await auth();
    const userId = await resolveCurrentUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const formData = await request.formData();

    const problemId = formData.get('problemId'); // TEXT like "1A"
    const platform = formData.get('platform');
    const problemName = formData.get('problemName');
    const problemUrl = formData.get('problemUrl');
    const sourceCode = formData.get('sourceCode');
    const language = formData.get('language');
    const difficultyRating = formData.get('difficultyRating');
    const contestId = formData.get('contestId');
    const topics = formData.get('topics');
    const difficultyTier = formData.get('difficultyTier');
    const timeComplexity = formData.get('timeComplexity');
    const spaceComplexity = formData.get('spaceComplexity');
    const notes = formData.get('notes');
    const file = formData.get('file');

    if (!problemId || !platform || !problemName) {
      return NextResponse.json(
        { error: 'Problem ID, platform, and problem name are required' },
        { status: 400 }
      );
    }

    if (!sourceCode && (!file || file.size === 0)) {
      return NextResponse.json(
        { error: 'Either source code or file is required' },
        { status: 400 }
      );
    }

    // If user uploaded a file, store its contents in source_code
    let resolvedSourceCode = sourceCode;
    if (!resolvedSourceCode && file && file.size > 0) {
      resolvedSourceCode = await file.text();
    }

    // Parse topics/tags if provided as JSON string
    let tagsArray = [];
    if (topics) {
      try {
        tagsArray = JSON.parse(topics);
      } catch {
        tagsArray = topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    // Convert difficulty_rating to integer
    const difficultyRatingInt = difficultyRating
      ? Math.round(Number(difficultyRating))
      : null;

    const difficultyTierId = await getDifficultyTierId(difficultyTier);

    // Get platform_id
    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Step 1: Upsert into problems table
    const { data: existingProblem } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .maybeSingle();

    let problem = null;

    if (existingProblem) {
      // Update existing problem with new info if provided
      const updateData = { updated_at: new Date().toISOString() };
      if (problemName) updateData.name = problemName;
      if (problemUrl) updateData.url = problemUrl;
      if (contestId) updateData.contest_id = contestId;
      if (difficultyRatingInt !== null)
        updateData.difficulty_rating = difficultyRatingInt;
      if (difficultyTierId) updateData.difficulty_tier_id = difficultyTierId;

      const { data: updatedProblem, error: updateError } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .update(updateData)
        .eq('id', existingProblem.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update problem: ${updateError.message}`);
      }
      problem = updatedProblem;
    } else {
      // Create new problem
      const { data: newProblem, error: createError } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .insert({
          platform_id: platformId,
          external_id: problemId,
          name: problemName,
          url: problemUrl,
          contest_id: contestId,
          difficulty_rating: difficultyRatingInt,
          difficulty_tier_id: difficultyTierId,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create problem: ${createError.message}`);
      }
      problem = newProblem;
    }

    // Step 2: Handle tags via tags/problem_tags
    await upsertProblemTags(problem.id, tagsArray);

    // Step 3: Ensure user_solves row exists (do not treat solution uploads as new solves)
    const { data: existingSolve } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select('*')
      .eq('user_id', userId)
      .eq('problem_id', problem.id)
      .maybeSingle();

    let userSolve = null;

    if (existingSolve) {
      userSolve = existingSolve;
    } else {
      // Create new solve record
      const { data: newSolve, error: createError } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .insert({
          user_id: userId,
          problem_id: problem.id,
          first_solved_at: new Date().toISOString(),
          solve_count: 1,
          attempt_count: 1,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(
          `Failed to create solve record: ${createError.message}`
        );
      }
      userSolve = newSolve;
    }

    // Step 4: Compute version number (schema has no version column)
    const { count: existingSolutionsCount, error: countError } =
      await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select('id', { count: 'exact', head: true })
        .eq('user_solve_id', userSolve.id);

    if (countError) {
      console.warn(
        '[solutions] Failed to count existing solutions:',
        countError.message
      );
    }

    const nextVersionNumber = (existingSolutionsCount || 0) + 1;
    const isPrimary = nextVersionNumber === 1;

    // Step 5: Insert into solutions table
    const languageId = await getLanguageId(language);
    const { data: newSolution, error: solutionError } = await supabaseAdmin
      .from(V2_TABLES.SOLUTIONS)
      .insert({
        user_solve_id: userSolve.id,
        source_code: resolvedSourceCode,
        language_id: languageId,
        verdict: 'AC',
        is_primary: isPrimary,
        personal_notes: notes || null,
      })
      .select()
      .single();

    if (solutionError) {
      throw new Error(`Failed to save solution: ${solutionError.message}`);
    }

    // Step 6: Store manual analysis fields (if provided)
    if (timeComplexity || spaceComplexity) {
      const { error: analysisError } = await supabaseAdmin
        .from(V2_TABLES.SOLUTION_ANALYSIS)
        .upsert(
          {
            solution_id: newSolution.id,
            time_complexity: timeComplexity || null,
            space_complexity: spaceComplexity || null,
            analyzed_at: new Date().toISOString(),
            model_version: 'manual',
          },
          { onConflict: 'solution_id' }
        );

      if (analysisError) {
        console.warn(
          '[solutions] Failed to save solution analysis:',
          analysisError.message
        );
      }
    }

    const transformedSolution = withCompatibilityFields(
      {
        ...newSolution,
        languages: languageId
          ? { code: language || null, name: language || null }
          : null,
        solution_analysis:
          timeComplexity || spaceComplexity
            ? {
                time_complexity: timeComplexity || null,
                space_complexity: spaceComplexity || null,
              }
            : null,
      },
      { versionNumber: nextVersionNumber }
    );

    return NextResponse.json({
      success: true,
      solution: transformedSolution,
      problem,
      message: `Solution v${nextVersionNumber} uploaded successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    const userId = await resolveCurrentUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    const platform = searchParams.get('platform');
    const solutionId = searchParams.get('solutionId');

    // Fetch specific solution by ID
    if (solutionId) {
      const { data, error } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select(
          `
          *,
          submissions(*),
          languages(code, name),
          solution_analysis(*),
          user_solves!inner(
            user_id,
            problem_id,
            first_solved_at,
            solve_count,
            problems!inner(
              id, platform_id, external_id, name, url,
              contest_id, difficulty_rating,
              platforms!inner(code, name)
            )
          )
        `
        )
        .eq('id', solutionId)
        .eq('user_solves.user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Transform to include platform at top level for compatibility
      const transformedData = data
        ? withCompatibilityFields({
            ...normalizeSolutionRecord(data),
            user_solves: data.user_solves
              ? {
                  ...data.user_solves,
                  problems: data.user_solves.problems
                    ? {
                        ...data.user_solves.problems,
                        platform: data.user_solves.problems.platforms?.code,
                        problem_id: data.user_solves.problems.external_id,
                        problem_name: data.user_solves.problems.name,
                        problem_url: data.user_solves.problems.url,
                      }
                    : null,
                }
              : null,
          })
        : null;

      return NextResponse.json({
        success: true,
        solution: transformedData,
      });
    }

    // Fetch solutions for specific problem
    if (problemId && platform) {
      // Get platform_id
      const platformId = await getPlatformId(platform);
      if (!platformId) {
        return NextResponse.json({
          success: true,
          solutions: [],
          solution: null,
        });
      }

      // Find the problem
      const { data: problem } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .select('id')
        .eq('platform_id', platformId)
        .eq('external_id', problemId)
        .maybeSingle();

      if (!problem) {
        const attemptFallback = await loadUnsolvedAttemptSolutions({
          userId,
          platformId,
          problemUuid: null,
          externalProblemId: problemId,
        });

        const preferredAttemptFallback =
          attemptFallback.find(hasNonEmptySourceCode) ||
          attemptFallback[0] ||
          null;

        return NextResponse.json({
          success: true,
          solutions: attemptFallback,
          solution: preferredAttemptFallback,
        });
      }

      // Find user's solve for this problem
      const { data: userSolve } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select('id')
        .eq('user_id', userId)
        .eq('problem_id', problem.id)
        .maybeSingle();

      if (!userSolve) {
        const attemptFallback = await loadUnsolvedAttemptSolutions({
          userId,
          platformId,
          problemUuid: problem.id,
          externalProblemId: problemId,
        });

        const preferredAttemptFallback =
          attemptFallback.find(hasNonEmptySourceCode) ||
          attemptFallback[0] ||
          null;

        return NextResponse.json({
          success: true,
          solutions: attemptFallback,
          solution: preferredAttemptFallback,
        });
      }

      // Fetch all solutions for this solve
      const { data, error } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select(
          '*, submissions(*), languages(code, name), solution_analysis(*)'
        )
        .eq('user_solve_id', userSolve.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const list = (data || []).map((sol, idx) =>
        withCompatibilityFields(normalizeSolutionRecord(sol), {
          versionNumber: (data?.length || 0) - idx,
        })
      );

      let combinedSolutions = list;
      if (!combinedSolutions.some(hasNonEmptySourceCode)) {
        const attemptFallback = await loadUnsolvedAttemptSolutions({
          userId,
          platformId,
          problemUuid: problem.id,
          externalProblemId: problemId,
        });

        if (attemptFallback.length > 0) {
          combinedSolutions = [...combinedSolutions, ...attemptFallback];
        }
      }

      const preferredSolution =
        combinedSolutions.find(hasNonEmptySourceCode) ||
        combinedSolutions[0] ||
        null;

      return NextResponse.json({
        success: true,
        solutions: combinedSolutions,
        solution: preferredSolution,
      });
    }

    return NextResponse.json(
      { error: 'Either solutionId or (problemId and platform) are required' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    const userId = await resolveCurrentUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const solutionId = searchParams.get('solutionId');
    const problemId = searchParams.get('problemId');
    const platform = searchParams.get('platform');

    // Branch 1: delete a specific solution by id
    if (solutionId) {
      const { data: solution } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select(
          `
          id,
          user_solves!inner(user_id)
        `
        )
        .eq('id', solutionId)
        .eq('user_solves.user_id', userId)
        .maybeSingle();

      if (!solution) {
        return NextResponse.json(
          { error: 'Solution not found or unauthorized' },
          { status: 404 }
        );
      }

      const { error } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .delete()
        .eq('id', solutionId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Solution deleted successfully',
      });
    }

    // Branch 2: delete all solutions for a problem (used by the UI)
    if (!problemId || !platform) {
      return NextResponse.json(
        { error: 'Either solutionId or (problemId and platform) are required' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const { data: problem } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .maybeSingle();

    if (!problem) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const { data: userSolve } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select('id')
      .eq('user_id', userId)
      .eq('problem_id', problem.id)
      .maybeSingle();

    if (!userSolve) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const { error } = await supabaseAdmin
      .from(V2_TABLES.SOLUTIONS)
      .delete()
      .eq('user_solve_id', userSolve.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Solutions deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
