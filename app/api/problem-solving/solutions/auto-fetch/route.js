/**
 * @file Auto-Fetch Solution API Route
 * @module api/problem-solving/solutions/auto-fetch
 * @access member
 *
 * Receives auto-fetched solutions from the browser extension.
 * Validates submission data and stores solutions with 'auto_fetched' type.
 * Optionally triggers LLM analysis for problem insights.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { verifyExtensionToken } from '@/app/_lib/extension-auth';
import { analyzeProblem, isLLMAvailable } from '@/app/_lib/llm';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
  recordSubmissionV2,
  getLanguageId,
} from '@/app/_lib/problem-solving-v2-helpers';

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
    console.warn('[Auto-fetch] Failed to upsert tags:', tagError.message);
    return;
  }

  const tagIdByCode = new Map((upsertedTags || []).map((t) => [t.code, t.id]));

  const problemTagRows = tagRows
    .map((t) => ({
      problem_id: problemUuid,
      tag_id: tagIdByCode.get(t.code),
      source: 'extension',
    }))
    .filter((r) => r.tag_id);

  if (problemTagRows.length === 0) return;

  const { error: linkError } = await supabaseAdmin
    .from(V2_TABLES.PROBLEM_TAGS)
    .upsert(problemTagRows, { onConflict: 'problem_id,tag_id' });

  if (linkError) {
    console.warn(
      '[Auto-fetch] Failed to link problem tags:',
      linkError.message
    );
  }
}

function normalizeVerdict(input) {
  const raw = (input || '').toString().trim();
  if (!raw) return 'AC';
  const upper = raw.toUpperCase();
  if (upper === 'OK' || upper === 'ACCEPTED') return 'AC';
  return upper;
}

// CORS headers for browser extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Token',
};

// Helper to create response with CORS headers
function jsonResponse(data, options = {}) {
  const { status = 200 } = options;
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return jsonResponse({});
}

export async function POST(request) {
  try {
    // Support both session auth and extension token auth
    const session = await auth();
    const extensionToken = request.headers.get('X-Extension-Token');

    let userId = null;

    // Try session auth first
    if (session?.user?.id) {
      userId = session.user.id;
    }
    // Fall back to extension token auth
    else if (extensionToken) {
      userId = verifyExtensionToken(extensionToken);
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS (we've already verified the user)
    const supabase = supabaseAdmin;
    const body = await request.json();

    const {
      problemId,
      platform,
      problemName,
      problemUrl,
      sourceCode,
      language,
      submissionId,
      // contestId, // Reserved for future use
      // problemIndex, // Reserved for future use
      difficultyRating,
      difficultyTier,
      topics,
      verdict,
      // New fields for analysis
      problemDescription,
      // executionTime, // Reserved for future use
      // memoryUsed, // Reserved for future use
      runAnalysis = true, // Enable LLM analysis by default
    } = body;

    // Validate required fields
    if (!problemId || !platform || !sourceCode) {
      return jsonResponse(
        { error: 'Problem ID, platform, and source code are required' },
        { status: 400 }
      );
    }

    // Only accept accepted solutions for auto-fetch
    if (verdict && normalizeVerdict(verdict) !== 'AC') {
      return jsonResponse(
        { error: 'Only accepted solutions can be auto-fetched' },
        { status: 400 }
      );
    }

    // Check for normalized schema availability
    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return jsonResponse(
        {
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return jsonResponse(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    const submittedAt = body.submissionTime
      ? new Date(body.submissionTime).toISOString()
      : new Date().toISOString();
    const normalizedVerdict = normalizeVerdict(verdict);

    // Upsert problem
    const { data: existingProblem } = await supabase
      .from(V2_TABLES.PROBLEMS)
      .select('id')
      .eq('platform_id', platformId)
      .eq('external_id', problemId)
      .maybeSingle();

    let problemRow = null;
    if (existingProblem) {
      const updateData = { updated_at: new Date().toISOString() };
      if (problemName) updateData.name = problemName;
      if (problemUrl) updateData.url = problemUrl;
      if (difficultyRating) {
        updateData.difficulty_rating = Math.round(Number(difficultyRating));
      }

      const { data: updatedProblem, error: updateError } = await supabase
        .from(V2_TABLES.PROBLEMS)
        .update(updateData)
        .eq('id', existingProblem.id)
        .select()
        .single();

      if (updateError) {
        return jsonResponse(
          { error: `Failed to update problem: ${updateError.message}` },
          { status: 500 }
        );
      }
      problemRow = updatedProblem;
    } else {
      const { data: newProblem, error: createError } = await supabase
        .from(V2_TABLES.PROBLEMS)
        .insert({
          platform_id: platformId,
          external_id: problemId,
          name: problemName || problemId,
          url: problemUrl || null,
          difficulty_rating: difficultyRating
            ? Math.round(Number(difficultyRating))
            : null,
        })
        .select()
        .single();

      if (createError) {
        return jsonResponse(
          { error: `Failed to create problem: ${createError.message}` },
          { status: 500 }
        );
      }
      problemRow = newProblem;
    }

    // Parse topics if provided as array or string
    let topicsArray = [];
    if (topics) {
      if (Array.isArray(topics)) {
        topicsArray = topics;
      } else if (typeof topics === 'string') {
        try {
          topicsArray = JSON.parse(topics);
        } catch {
          topicsArray = topics.split(',').map((t) => t.trim());
        }
      }
    }

    // Upsert tags for the problem
    await upsertProblemTags(problemRow.id, topicsArray);

    // Run LLM analysis if available and enabled
    let analysisResult = null;
    if (runAnalysis && isLLMAvailable()) {
      try {
        analysisResult = await analyzeProblem({
          problemDescription: problemDescription || '',
          sourceCode,
          language,
          problemName,
          existingTopics: topicsArray,
        });

        if (analysisResult?.topics?.length && topicsArray.length === 0) {
          await upsertProblemTags(problemRow.id, analysisResult.topics);
        }
      } catch (analysisError) {
        console.error('[Auto-fetch] LLM analysis failed:', analysisError);
        // Continue without analysis - don't fail the whole request
      }
    }

    // Record submission (optional) and dedupe by submission_id
    let submissionRow = null;
    if (submissionId) {
      try {
        submissionRow = await recordSubmissionV2(userId, platform, {
          external_submission_id: submissionId,
          external_problem_id: problemId,
          problem_name: problemName,
          verdict: normalizedVerdict,
          language,
          submitted_at: submittedAt,
          problem_uuid: problemRow.id,
        });

        if (submissionRow?.user_id && submissionRow.user_id !== userId) {
          return jsonResponse(
            { error: 'Submission ownership mismatch' },
            { status: 403 }
          );
        }
      } catch (e) {
        console.warn('[Auto-fetch] Failed to record submission:', e.message);
      }

      if (submissionRow?.id) {
        const { data: existingSolution } = await supabase
          .from(V2_TABLES.SOLUTIONS)
          .select('id')
          .eq('submission_id', submissionRow.id)
          .limit(1)
          .maybeSingle();

        if (existingSolution) {
          return jsonResponse({
            success: true,
            message: 'Solution for this submission already exists',
            skipped: true,
            existingId: existingSolution.id,
          });
        }
      }
    }

    // Ensure user_solve exists
    const { data: existingSolve } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .select('id')
      .eq('user_id', userId)
      .eq('problem_id', problemRow.id)
      .maybeSingle();

    let userSolveRow = existingSolve;
    if (!userSolveRow) {
      const { data: newSolve, error: solveError } = await supabase
        .from(V2_TABLES.USER_SOLVES)
        .insert({
          user_id: userId,
          problem_id: problemRow.id,
          first_solved_at: submittedAt,
          solve_count: 1,
          attempt_count: 1,
        })
        .select('id')
        .single();

      if (solveError) {
        return jsonResponse(
          { error: `Failed to create solve: ${solveError.message}` },
          { status: 500 }
        );
      }
      userSolveRow = newSolve;
    }

    // Compute version number
    const { count: existingSolutionsCount } = await supabase
      .from(V2_TABLES.SOLUTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('user_solve_id', userSolveRow.id);

    const nextVersionNumber = (existingSolutionsCount || 0) + 1;
    const isPrimary = nextVersionNumber === 1;
    const languageId = await getLanguageId(language);

    const { data, error } = await supabase
      .from(V2_TABLES.SOLUTIONS)
      .insert({
        user_solve_id: userSolveRow.id,
        submission_id: submissionRow?.id || null,
        source_code: sourceCode,
        language_id: languageId,
        verdict: 'AC',
        is_primary: isPrimary,
        created_at: submittedAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[Auto-fetch] Database error:', error);
      console.error('[Auto-fetch] Request body:', body);
      return jsonResponse(
        {
          success: false,
          error: 'Failed to save solution',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Store analysis if available
    if (analysisResult?.timeComplexity || analysisResult?.spaceComplexity) {
      const { error: analysisError } = await supabase
        .from(V2_TABLES.SOLUTION_ANALYSIS)
        .upsert(
          {
            solution_id: data.id,
            time_complexity: analysisResult.timeComplexity || null,
            space_complexity: analysisResult.spaceComplexity || null,
            analyzed_at: new Date().toISOString(),
            model_version: 'llm',
          },
          { onConflict: 'solution_id' }
        );

      if (analysisError) {
        console.warn(
          '[Auto-fetch] Failed to save analysis:',
          analysisError.message
        );
      }
    }

    return jsonResponse({
      success: true,
      solution: data,
      message: 'Solution auto-fetched successfully',
      analyzed: !!analysisResult,
      analysis: analysisResult
        ? {
            timeComplexity: analysisResult.timeComplexity,
            spaceComplexity: analysisResult.spaceComplexity,
            topics: analysisResult.topics,
            summary: analysisResult.summary,
          }
        : null,
    });
  } catch (error) {
    console.error('[Auto-fetch] Unexpected error:', error);
    console.error('[Auto-fetch] Error stack:', error.stack);
    return jsonResponse(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
