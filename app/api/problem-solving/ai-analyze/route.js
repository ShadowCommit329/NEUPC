/**
 * @file AI Analysis API Route
 * @module api/problem-solving/ai-analyze
 *
 * Comprehensive AI-powered analysis for competitive programming solutions.
 *
 * Features:
 * - Problem summary generation (concise, actionable)
 * - Time/Space complexity analysis from code
 * - Alternative approaches with tradeoffs
 * - Tag generation if missing
 * - Failure analysis for non-AC submissions
 * - Code optimization suggestions
 * - Edge case identification
 *
 * Triggers:
 * 1. On first extraction via browser extension (async, background)
 * 2. When viewing problem in app (if not already analyzed)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  generateCompletion,
  isLLMAvailable,
  getLLMProviderInfo,
} from '@/app/_lib/llm';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
  getLanguageId,
  recordSubmissionV2,
} from '@/app/_lib/problem-solving-v2-helpers';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Extension-Token',
};

function jsonResponse(data, options = {}) {
  return NextResponse.json(data, {
    status: options.status || 200,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET - Check AI analysis availability and status
 */
export async function GET() {
  const providerInfo = getLLMProviderInfo();
  return jsonResponse({
    available: providerInfo.available,
    provider: providerInfo,
  });
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

async function upsertProblemTags(problemUuid, tagNames, source = 'ai') {
  const cleaned = (tagNames || [])
    .map((t) => (t || '').toString().trim())
    .filter(Boolean);

  if (!problemUuid || cleaned.length === 0) return;

  const tagRows = cleaned
    .map((name) => ({
      code: slugifyTagCode(name) || name.toLowerCase(),
      name,
      category: source,
    }))
    .filter((t) => t.code);

  if (tagRows.length === 0) return;

  const { data: upsertedTags, error: tagError } = await supabaseAdmin
    .from(V2_TABLES.TAGS)
    .upsert(tagRows, { onConflict: 'code' })
    .select('id, code');

  if (tagError) {
    console.warn('[AI-ANALYZE] Failed to upsert tags:', tagError.message);
    return;
  }

  const tagIdByCode = new Map((upsertedTags || []).map((t) => [t.code, t.id]));

  const linkRows = tagRows
    .map((t) => ({
      problem_id: problemUuid,
      tag_id: tagIdByCode.get(t.code),
      source,
      confidence: 0.8,
    }))
    .filter((r) => r.tag_id);

  if (linkRows.length === 0) return;

  const { error: linkError } = await supabaseAdmin
    .from(V2_TABLES.PROBLEM_TAGS)
    .upsert(linkRows, { onConflict: 'problem_id,tag_id' });

  if (linkError) {
    console.warn(
      '[AI-ANALYZE] Failed to link problem tags:',
      linkError.message
    );
  }
}

/**
 * POST - Trigger AI analysis for a problem/solution
 */
export async function POST(request) {
  try {
    // Authentication
    let userId = null;
    const session = await auth();

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Try extension token
      const authHeader = request.headers.get('Authorization');
      const extensionToken = authHeader?.replace('Bearer ', '');

      if (extensionToken) {
        const { data: tokenUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', extensionToken)
          .maybeSingle();

        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return jsonResponse(
        {
          success: false,
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    // Check LLM availability
    if (!isLLMAvailable()) {
      return jsonResponse(
        {
          success: false,
          error: 'AI analysis not available',
          message:
            'No LLM provider configured. Analysis will be queued for later.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      // For problem analysis
      problemId, // UUID of problem in problems table
      problemTextId, // Text ID like "1400A" (used to find problem)
      problemName,
      problemDescription,
      platform = 'codeforces',
      existingTags = [],
      difficultyRating,

      // For solution analysis
      solutionId, // UUID of solution in solutions table
      submissionId, // External submission id (platform-provided)
      sourceCode,
      language,
      verdict, // AC, WA, TLE, etc.

      // For combined analysis (array of all submissions)
      allSubmissions = [], // Array of {submissionId, sourceCode, language, verdict, submittedAt}

      // Control flags
      analyzeType = 'full', // 'problem', 'solution', 'submission', 'full', 'combined'

      // Custom prompt for analysis
      customPrompt = null,
    } = body;

    const platformCode = (platform || 'codeforces').toString().toLowerCase();
    const platformId = await getPlatformId(platformCode);
    if (!platformId) {
      return jsonResponse(
        { success: false, error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Find or verify problem (normalized schema)
    let problem = null;
    if (problemId) {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .select('id, platform_id, external_id, name, url, difficulty_rating')
        .eq('id', problemId)
        .maybeSingle();
      problem = data;
    } else if (problemTextId) {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.PROBLEMS)
        .select('id, platform_id, external_id, name, url, difficulty_rating')
        .eq('platform_id', platformId)
        .eq('external_id', problemTextId)
        .maybeSingle();
      problem = data;
    }

    const results = {
      problem: null,
      solution: null,
      submission: null,
    };

    async function getUserSolveRow(problemUuid) {
      if (!problemUuid) return null;

      const { data, error } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select('id, user_id, problem_id')
        .eq('user_id', userId)
        .eq('problem_id', problemUuid)
        .maybeSingle();

      if (error) {
        console.warn('[AI-ANALYZE] Failed to resolve user_solve:', error);
        return null;
      }

      return data;
    }

    async function getSubmissionRow(
      externalSubmissionId,
      submittedAtOverride = null
    ) {
      if (!externalSubmissionId) return null;

      const { data: existing, error } = await supabaseAdmin
        .from(V2_TABLES.SUBMISSIONS)
        .select(
          'id, user_id, platform_id, external_submission_id, external_problem_id, submitted_at'
        )
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('external_submission_id', externalSubmissionId)
        .maybeSingle();

      if (error) {
        console.warn('[AI-ANALYZE] Failed to resolve submission:', error);
      }

      if (existing) return existing;

      const externalProblemId = problemTextId || problem?.external_id;
      if (!externalProblemId) return null;

      try {
        return await recordSubmissionV2(userId, platformCode, {
          external_submission_id: externalSubmissionId,
          external_problem_id: externalProblemId,
          problem_name: problem?.name || problemName || null,
          verdict: verdict || 'AC',
          language,
          submitted_at: submittedAtOverride || new Date().toISOString(),
          problem_uuid: problem?.id || null,
        });
      } catch (e) {
        console.warn('[AI-ANALYZE] Failed to ensure submission row:', e);
        return null;
      }
    }

    function assertSolutionOwner(solutionRow) {
      const us = Array.isArray(solutionRow?.user_solves)
        ? solutionRow.user_solves[0] || null
        : solutionRow?.user_solves || null;

      if (!us?.user_id) {
        throw new Error('Solution is missing user linkage');
      }

      if (us.user_id !== userId) {
        const err = new Error('Unauthorized - not your solution');
        err.statusCode = 403;
        throw err;
      }
    }

    async function getExistingSolutionRow({
      preferredSolutionId,
      submissionRow,
      userSolveRow,
      allowSolveFallback = true,
    }) {
      const selectWithOwner = `
        id,
        user_solve_id,
        submission_id,
        source_code,
        language_id,
        verdict,
        user_solves!inner(
          user_id,
          problem_id
        )
      `;

      if (preferredSolutionId) {
        const { data: byId, error } = await supabaseAdmin
          .from(V2_TABLES.SOLUTIONS)
          .select(selectWithOwner)
          .eq('id', preferredSolutionId)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (byId) {
          assertSolutionOwner(byId);
          return byId;
        }
      }

      if (submissionRow?.id) {
        const { data: bySubmission, error } = await supabaseAdmin
          .from(V2_TABLES.SOLUTIONS)
          .select(selectWithOwner)
          .eq('submission_id', submissionRow.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (bySubmission) {
          assertSolutionOwner(bySubmission);
          return bySubmission;
        }
      }

      if (allowSolveFallback && userSolveRow?.id) {
        const { data: bySolve } = await supabaseAdmin
          .from(V2_TABLES.SOLUTIONS)
          .select(
            'id, user_solve_id, submission_id, source_code, language_id, verdict, is_primary, created_at'
          )
          .eq('user_solve_id', userSolveRow.id)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (bySolve) return bySolve;
      }

      return null;
    }

    async function ensureSolutionRow({
      preferredSolutionId,
      submissionRow,
      userSolveRow,
      code,
      lang,
      verdict: v,
      allowSolveFallback = true,
    }) {
      const existing = await getExistingSolutionRow({
        preferredSolutionId,
        submissionRow,
        userSolveRow,
        allowSolveFallback,
      });
      if (existing) return existing;

      if (!code || !userSolveRow?.id) return null;

      const languageId = await getLanguageId(lang);

      const { data: created, error } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .insert({
          user_solve_id: userSolveRow.id,
          submission_id: submissionRow?.id || null,
          source_code: code,
          language_id: languageId,
          verdict: v || null,
          is_primary: allowSolveFallback,
        })
        .select(
          'id, user_solve_id, submission_id, source_code, language_id, verdict'
        )
        .single();

      if (error) throw error;
      return created;
    }

    // ============================================
    // PROBLEM ANALYSIS
    // ============================================
    if (
      (analyzeType === 'problem' || analyzeType === 'full') &&
      (problem || problemDescription || sourceCode)
    ) {
      try {
        const problemAnalysis = await analyzeProblemWithAI({
          problemName: problem?.name || problemName,
          problemDescription,
          sourceCode,
          language,
          existingTags,
          difficultyRating: problem?.difficulty_rating || difficultyRating,
          customPrompt,
        });

        if (problem?.id) {
          await supabaseAdmin.from(V2_TABLES.PROBLEM_ANALYSIS).upsert(
            {
              problem_id: problem.id,
              summary: problemAnalysis.summary || null,
              key_concepts:
                Array.isArray(problemAnalysis.keyConcepts) &&
                problemAnalysis.keyConcepts.length
                  ? problemAnalysis.keyConcepts
                  : null,
              analyzed_at: problemAnalysis.analyzedAt,
              model_version: problemAnalysis.analyzedBy,
            },
            { onConflict: 'problem_id' }
          );

          await upsertProblemTags(
            problem.id,
            problemAnalysis.generatedTags,
            'ai'
          );
        }

        results.problem = {
          status: 'completed',
          analysis: problemAnalysis,
        };
      } catch (error) {
        console.error('[AI-ANALYZE] Problem analysis failed:', error);

        results.problem = {
          status: 'failed',
          error: error.message,
        };
      }
    }

    // ============================================
    // SUBMISSION ANALYSIS (persisted on solution_analysis)
    // ============================================
    if (analyzeType === 'submission' && submissionId && sourceCode) {
      try {
        const userSolveRow = await getUserSolveRow(problem?.id);
        const submissionRow = await getSubmissionRow(submissionId);
        const solutionRow = await ensureSolutionRow({
          preferredSolutionId: solutionId,
          submissionRow,
          userSolveRow,
          code: sourceCode,
          lang: language,
          verdict,
          allowSolveFallback: false,
        });

        const solutionAnalysis = await analyzeSolutionWithAI({
          problemName: problem?.name || problemName,
          problemDescription:
            problemDescription || results.problem?.analysis?.summary,
          sourceCode,
          language,
          verdict,
          existingTags,
          customPrompt,
        });

        if (solutionRow?.id) {
          const isAccepted =
            verdict === 'AC' || verdict === 'OK' || verdict === 'Accepted';
          const learningNotes = !isAccepted ? solutionAnalysis.whyFailed : null;

          await supabaseAdmin.from(V2_TABLES.SOLUTION_ANALYSIS).upsert(
            {
              solution_id: solutionRow.id,
              approach_name: solutionAnalysis.userApproach?.name || null,
              approach_explanation:
                solutionAnalysis.userApproach?.explanation || null,
              time_complexity: solutionAnalysis.timeComplexity || null,
              space_complexity: solutionAnalysis.spaceComplexity || null,
              techniques_used:
                Array.isArray(existingTags) && existingTags.length
                  ? existingTags
                  : null,
              optimization_tips:
                Array.isArray(solutionAnalysis.optimizationTips) &&
                solutionAnalysis.optimizationTips.length
                  ? solutionAnalysis.optimizationTips
                  : null,
              learning_notes: learningNotes,
              analyzed_at: solutionAnalysis.analyzedAt,
              model_version: solutionAnalysis.analyzedBy,
            },
            { onConflict: 'solution_id' }
          );

          if (problem?.id) {
            await supabaseAdmin.from(V2_TABLES.PROBLEM_ANALYSIS).upsert(
              {
                problem_id: problem.id,
                summary: solutionAnalysis.problemSummary || null,
                key_concepts:
                  Array.isArray(solutionAnalysis.keyConcepts) &&
                  solutionAnalysis.keyConcepts.length
                    ? solutionAnalysis.keyConcepts
                    : null,
                hints:
                  Array.isArray(solutionAnalysis.edgeCases) &&
                  solutionAnalysis.edgeCases.length
                    ? solutionAnalysis.edgeCases
                    : null,
                common_mistakes:
                  Array.isArray(solutionAnalysis.commonMistakes) &&
                  solutionAnalysis.commonMistakes.length
                    ? solutionAnalysis.commonMistakes
                    : null,
                time_complexity: solutionAnalysis.timeComplexity || null,
                space_complexity: solutionAnalysis.spaceComplexity || null,
                analyzed_at: solutionAnalysis.analyzedAt,
                model_version: solutionAnalysis.analyzedBy,
              },
              { onConflict: 'problem_id' }
            );
          }
        }

        results.submission = {
          status: 'completed',
          analysis: solutionAnalysis,
        };
      } catch (error) {
        console.error('[AI-ANALYZE] Submission analysis failed:', error);

        results.submission = {
          status: 'failed',
          error: error.message,
        };
      }
    }

    // ============================================
    // COMBINED ANALYSIS (all submissions for holistic view)
    // ============================================
    if (
      (analyzeType === 'combined' || analyzeType === 'full') &&
      allSubmissions.length > 0
    ) {
      try {
        const preferredExternalSubmissionId =
          submissionId ||
          allSubmissions.find(
            (s) =>
              s.verdict === 'AC' ||
              s.verdict === 'OK' ||
              s.verdict === 'Accepted'
          )?.submissionId ||
          allSubmissions[0]?.submissionId ||
          null;

        const chosenSubmission = preferredExternalSubmissionId
          ? allSubmissions.find(
              (s) => s.submissionId === preferredExternalSubmissionId
            ) || null
          : null;

        const userSolveRow = await getUserSolveRow(problem?.id);
        const submissionRow = preferredExternalSubmissionId
          ? await getSubmissionRow(
              preferredExternalSubmissionId,
              chosenSubmission?.submittedAt || null
            )
          : null;

        const solutionRow = await ensureSolutionRow({
          preferredSolutionId: solutionId,
          submissionRow,
          userSolveRow,
          code: sourceCode || chosenSubmission?.sourceCode || null,
          lang: language || chosenSubmission?.language || null,
          verdict: verdict || chosenSubmission?.verdict || null,
          allowSolveFallback: true,
        });

        const combinedAnalysis = await analyzeCombinedSubmissionsWithAI({
          problemName: problem?.name || problemName,
          problemDescription:
            problemDescription || results.problem?.analysis?.summary,
          submissions: allSubmissions,
          existingTags,
          customPrompt,
        });

        if (solutionRow?.id) {
          const learningNotesParts = [];
          if (combinedAnalysis.learningJourney?.progression) {
            learningNotesParts.push(
              combinedAnalysis.learningJourney.progression
            );
          }
          if (combinedAnalysis.learningJourney?.breakthroughMoment) {
            learningNotesParts.push(
              `Breakthrough: ${combinedAnalysis.learningJourney.breakthroughMoment}`
            );
          }
          if (
            Array.isArray(combinedAnalysis.learningJourney?.lessonsLearned) &&
            combinedAnalysis.learningJourney.lessonsLearned.length
          ) {
            learningNotesParts.push(
              `Lessons:\n${combinedAnalysis.learningJourney.lessonsLearned.join('\n')}`
            );
          }
          const learningNotes = learningNotesParts.length
            ? learningNotesParts.join('\n\n')
            : null;

          await supabaseAdmin.from(V2_TABLES.SOLUTION_ANALYSIS).upsert(
            {
              solution_id: solutionRow.id,
              approach_name: combinedAnalysis.userApproach?.name || null,
              approach_explanation:
                combinedAnalysis.userApproach?.explanation || null,
              time_complexity: combinedAnalysis.timeComplexity || null,
              space_complexity: combinedAnalysis.spaceComplexity || null,
              techniques_used:
                Array.isArray(existingTags) && existingTags.length
                  ? existingTags
                  : null,
              optimization_tips:
                Array.isArray(combinedAnalysis.optimizationTips) &&
                combinedAnalysis.optimizationTips.length
                  ? combinedAnalysis.optimizationTips
                  : null,
              learning_notes: learningNotes,
              analyzed_at: combinedAnalysis.analyzedAt,
              model_version: combinedAnalysis.analyzedBy,
            },
            { onConflict: 'solution_id' }
          );

          if (problem?.id) {
            await supabaseAdmin.from(V2_TABLES.PROBLEM_ANALYSIS).upsert(
              {
                problem_id: problem.id,
                summary: combinedAnalysis.problemSummary || null,
                key_concepts:
                  Array.isArray(combinedAnalysis.keyConcepts) &&
                  combinedAnalysis.keyConcepts.length
                    ? combinedAnalysis.keyConcepts
                    : null,
                hints:
                  Array.isArray(combinedAnalysis.edgeCases) &&
                  combinedAnalysis.edgeCases.length
                    ? combinedAnalysis.edgeCases
                    : null,
                common_mistakes:
                  Array.isArray(combinedAnalysis.commonMistakes) &&
                  combinedAnalysis.commonMistakes.length
                    ? combinedAnalysis.commonMistakes
                    : null,
                time_complexity: combinedAnalysis.timeComplexity || null,
                space_complexity: combinedAnalysis.spaceComplexity || null,
                analyzed_at: combinedAnalysis.analyzedAt,
                model_version: combinedAnalysis.analyzedBy,
              },
              { onConflict: 'problem_id' }
            );
          }
        }

        results.solution = {
          status: 'completed',
          analysis: combinedAnalysis,
        };
      } catch (error) {
        console.error('[AI-ANALYZE] Combined analysis failed:', error);

        results.solution = {
          status: 'failed',
          error: error.message,
        };
      }
    }

    // ============================================
    // SOLUTION ANALYSIS (for solutions table - single submission fallback)
    // ============================================
    if (
      (analyzeType === 'solution' || analyzeType === 'full') &&
      sourceCode &&
      allSubmissions.length === 0
    ) {
      try {
        const userSolveRow = await getUserSolveRow(problem?.id);
        const submissionRow = submissionId
          ? await getSubmissionRow(submissionId)
          : null;
        const solutionRow = await ensureSolutionRow({
          preferredSolutionId: solutionId,
          submissionRow,
          userSolveRow,
          code: sourceCode,
          lang: language,
          verdict,
          allowSolveFallback: true,
        });

        const solutionAnalysis = await analyzeSolutionWithAI({
          problemName: problem?.name || problemName,
          problemDescription:
            problemDescription || results.problem?.analysis?.summary,
          sourceCode,
          language,
          verdict,
          existingTags,
          customPrompt,
        });

        if (solutionRow?.id) {
          const isAccepted =
            verdict === 'AC' || verdict === 'OK' || verdict === 'Accepted';
          const learningNotes = !isAccepted ? solutionAnalysis.whyFailed : null;

          await supabaseAdmin.from(V2_TABLES.SOLUTION_ANALYSIS).upsert(
            {
              solution_id: solutionRow.id,
              approach_name: solutionAnalysis.userApproach?.name || null,
              approach_explanation:
                solutionAnalysis.userApproach?.explanation || null,
              time_complexity: solutionAnalysis.timeComplexity || null,
              space_complexity: solutionAnalysis.spaceComplexity || null,
              techniques_used:
                Array.isArray(existingTags) && existingTags.length
                  ? existingTags
                  : null,
              optimization_tips:
                Array.isArray(solutionAnalysis.optimizationTips) &&
                solutionAnalysis.optimizationTips.length
                  ? solutionAnalysis.optimizationTips
                  : null,
              learning_notes: learningNotes,
              analyzed_at: solutionAnalysis.analyzedAt,
              model_version: solutionAnalysis.analyzedBy,
            },
            { onConflict: 'solution_id' }
          );

          if (problem?.id) {
            await supabaseAdmin.from(V2_TABLES.PROBLEM_ANALYSIS).upsert(
              {
                problem_id: problem.id,
                summary: solutionAnalysis.problemSummary || null,
                key_concepts:
                  Array.isArray(solutionAnalysis.keyConcepts) &&
                  solutionAnalysis.keyConcepts.length
                    ? solutionAnalysis.keyConcepts
                    : null,
                hints:
                  Array.isArray(solutionAnalysis.edgeCases) &&
                  solutionAnalysis.edgeCases.length
                    ? solutionAnalysis.edgeCases
                    : null,
                common_mistakes:
                  Array.isArray(solutionAnalysis.commonMistakes) &&
                  solutionAnalysis.commonMistakes.length
                    ? solutionAnalysis.commonMistakes
                    : null,
                time_complexity: solutionAnalysis.timeComplexity || null,
                space_complexity: solutionAnalysis.spaceComplexity || null,
                analyzed_at: solutionAnalysis.analyzedAt,
                model_version: solutionAnalysis.analyzedBy,
              },
              { onConflict: 'problem_id' }
            );
          }
        }

        results.solution = {
          status: 'completed',
          analysis: solutionAnalysis,
        };
      } catch (error) {
        console.error('[AI-ANALYZE] Solution analysis failed:', error);

        results.solution = {
          status: 'failed',
          error: error.message,
        };
      }
    }

    return jsonResponse({
      success: true,
      results,
      provider: getLLMProviderInfo(),
    });
  } catch (error) {
    console.error('[AI-ANALYZE] Error:', error);
    return jsonResponse(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze a problem to generate summary, tags, and key concepts
 */
async function analyzeProblemWithAI({
  problemName,
  problemDescription,
  sourceCode,
  language,
  existingTags,
  difficultyRating,
  customPrompt,
}) {
  let prompt =
    customPrompt ||
    `You are an expert competitive programmer. Analyze this problem and provide insights.

## Problem: ${problemName || 'Unknown Problem'}

${problemDescription ? `### Full Description:\n${problemDescription.substring(0, 3000)}` : ''}

${sourceCode ? `### Solution Code (${language || 'Unknown'}):\n\`\`\`${language?.toLowerCase()?.split(' ')[0] || ''}\n${sourceCode.substring(0, 2000)}\n\`\`\`` : ''}

${existingTags?.length > 0 ? `### Existing Tags: ${existingTags.join(', ')}` : ''}
${difficultyRating ? `### Difficulty Rating: ${difficultyRating}` : ''}

Provide analysis in this exact JSON format:
{
  "summary": "2-3 sentence summary of what the problem asks. Include key constraints. Should be enough to understand the problem without reading the full description.",
  "generatedTags": ["tag1", "tag2", "tag3"],
  "keyConcepts": ["Key concept 1", "Key concept 2"],
  "difficultyEstimate": "easy|medium|hard|expert",
  "inputFormat": "Brief description of input",
  "outputFormat": "Brief description of output",
  "constraints": ["Key constraint 1", "Key constraint 2"]
}

Guidelines:
- summary should be actionable and concise
- generatedTags should be specific (e.g., "binary search on answer", not just "binary search")
- Include 3-6 tags covering: algorithm, data structure, technique
- keyConcepts should highlight the main insight needed

Return ONLY valid JSON.`;

  // If custom prompt, add JSON instruction
  if (customPrompt) {
    prompt = `${customPrompt}

Based on the above, provide your response in this exact JSON format:
{
  "summary": "Your summary here",
  "generatedTags": ["tag1", "tag2"],
  "keyConcepts": ["concept1", "concept2"],
  "difficultyEstimate": "easy|medium|hard|expert",
  "inputFormat": "Brief description of input",
  "outputFormat": "Brief description of output",
  "constraints": ["constraint1", "constraint2"]
}

Return ONLY valid JSON.`;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert competitive programmer. Respond with valid JSON only.',
    },
    { role: 'user', content: prompt },
  ];

  const { content, provider } = await generateCompletion(messages, {
    temperature: 0.2,
    maxTokens: 1000,
  });

  // Parse response
  let analysis;
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch (error) {
    console.error('[AI-ANALYZE] Problem analysis parse failed:', error);
    analysis = {
      summary: 'Analysis failed - summary not available',
      generatedTags: existingTags || [],
      keyConcepts: [],
      difficultyEstimate: 'medium',
    };
  }

  return {
    summary: analysis.summary || '',
    generatedTags: analysis.generatedTags || [],
    keyConcepts: analysis.keyConcepts || [],
    difficultyEstimate: analysis.difficultyEstimate || 'medium',
    inputFormat: analysis.inputFormat || '',
    outputFormat: analysis.outputFormat || '',
    constraints: analysis.constraints || [],
    analyzedBy: provider,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Comprehensive solution analysis
 */
async function analyzeSolutionWithAI({
  problemName,
  problemDescription,
  sourceCode,
  language,
  verdict,
  existingTags,
  customPrompt,
}) {
  const isAccepted =
    verdict === 'AC' || verdict === 'OK' || verdict === 'Accepted';

  let prompt =
    customPrompt ||
    `You are an expert competitive programmer. Analyze this ${isAccepted ? 'accepted' : 'failed'} solution thoroughly.

## Problem: ${problemName || 'Unknown'}

${problemDescription ? `### Description:\n${problemDescription.substring(0, 2000)}` : ''}

### Solution Code (${language || 'Unknown'}):
\`\`\`${language?.toLowerCase()?.split(' ')[0] || ''}
${sourceCode}
\`\`\`

### Verdict: ${verdict || 'Unknown'}
${existingTags?.length > 0 ? `### Tags: ${existingTags.join(', ')}` : ''}

Provide comprehensive analysis in this exact JSON format:
{
  "problemSummary": "2-3 sentence summary of what the problem asks",
  "userApproach": {
    "name": "Name of algorithm/technique used (e.g., 'Greedy with Sorting', 'DP with Bitmask')",
    "explanation": "3-5 sentence explanation of how this specific solution works step by step",
    "whyItWorks": "1-2 sentences explaining why this approach correctly solves the problem"
  },
  "alternativeApproaches": [
    {
      "name": "Alternative approach name",
      "explanation": "How this approach would work",
      "timeComplexity": "O(?)",
      "spaceComplexity": "O(?)",
      "tradeoffs": "When to prefer this approach"
    }
  ],
  "timeComplexity": "Big O time complexity of submitted solution",
  "spaceComplexity": "Big O space complexity of submitted solution",
  "keyConcepts": ["Key concept 1", "Key concept 2"],
  "optimizationTips": ["Tip 1 to make code faster/cleaner", "Tip 2"],
  "edgeCases": ["Edge case 1 to watch for", "Edge case 2"],
  "commonMistakes": ["Common mistake 1", "Common mistake 2"],
  "codeQuality": {
    "readability": "good|average|poor",
    "efficiency": "optimal|suboptimal|inefficient",
    "suggestions": ["Improvement suggestion 1"]
  }${
    !isAccepted
      ? `,
  "whyFailed": "Detailed explanation of why this solution likely failed. Analyze the code for bugs, edge cases, or algorithmic issues that could cause ${verdict}."`
      : ''
  }
}

Guidelines:
- userApproach must explain the ACTUAL submitted code, not a generic approach
- Include 1-3 meaningful alternative approaches
- Be specific with complexity (O(n²) not O(n^2))
- edgeCases should be problem-specific, not generic
${!isAccepted ? `- whyFailed must identify the likely bug or issue causing ${verdict}` : ''}

Return ONLY valid JSON.`;

  // If custom prompt provided, append context and JSON instruction
  if (customPrompt) {
    prompt = `## Context:
Problem: ${problemName || 'Unknown'}
${problemDescription ? `Description: ${problemDescription.substring(0, 1000)}` : ''}
Verdict: ${verdict || 'Unknown'}

## Solution Code (${language || 'Unknown'}):
\`\`\`${language?.toLowerCase()?.split(' ')[0] || ''}
${sourceCode}
\`\`\`

## Custom Question/Request:
${customPrompt}

Based on the above, provide your analysis in this JSON format:
{
  "problemSummary": "Summary if applicable",
  "userApproach": {
    "name": "Approach name",
    "explanation": "Your explanation based on the custom prompt",
    "whyItWorks": "Why it works"
  },
  "alternativeApproaches": [],
  "timeComplexity": "Time complexity",
  "spaceComplexity": "Space complexity",
  "keyConcepts": [],
  "optimizationTips": [],
  "edgeCases": [],
  "commonMistakes": [],
  "codeQuality": { "readability": "good", "efficiency": "optimal", "suggestions": [] },
  "customResponse": "Your detailed response to the custom prompt here"
  ${!isAccepted ? `,"whyFailed": "Why this solution failed"` : ''}
}

Return ONLY valid JSON.`;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert competitive programmer and code reviewer. Respond with valid JSON only.',
    },
    { role: 'user', content: prompt },
  ];

  const { content, provider } = await generateCompletion(messages, {
    temperature: 0.2,
    maxTokens: 2500,
  });

  // Parse response
  let analysis;
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch (error) {
    console.error('[AI-ANALYZE] Solution analysis parse failed:', error);
    analysis = {
      problemSummary: 'Analysis failed',
      userApproach: {
        name: 'Unknown',
        explanation: 'Analysis failed',
        whyItWorks: '',
      },
      alternativeApproaches: [],
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      keyConcepts: [],
    };
  }

  return {
    problemSummary: analysis.problemSummary || '',
    userApproach: analysis.userApproach || {
      name: 'Unknown',
      explanation: '',
      whyItWorks: '',
    },
    alternativeApproaches: analysis.alternativeApproaches || [],
    timeComplexity: analysis.timeComplexity || 'Unknown',
    spaceComplexity: analysis.spaceComplexity || 'Unknown',
    keyConcepts: analysis.keyConcepts || [],
    optimizationTips: analysis.optimizationTips || [],
    edgeCases: analysis.edgeCases || [],
    commonMistakes: analysis.commonMistakes || [],
    codeQuality: analysis.codeQuality || {
      readability: 'average',
      efficiency: 'unknown',
      suggestions: [],
    },
    whyFailed: analysis.whyFailed || null,
    analyzedBy: provider,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Combined analysis of ALL submissions for a problem
 * Provides holistic view including learning journey and progression
 */
async function analyzeCombinedSubmissionsWithAI({
  problemName,
  problemDescription,
  submissions, // Array of {submissionId, sourceCode, language, verdict, submittedAt}
  existingTags,
  customPrompt,
}) {
  // Separate accepted and failed submissions
  const acceptedSubmissions = submissions.filter(
    (s) => s.verdict === 'AC' || s.verdict === 'OK' || s.verdict === 'Accepted'
  );
  const failedSubmissions = submissions.filter(
    (s) => s.verdict !== 'AC' && s.verdict !== 'OK' && s.verdict !== 'Accepted'
  );

  // Sort by submission time
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0)
  );

  // Build submission history for context (limit code length to avoid token overflow)
  const submissionHistory = sortedSubmissions.map((s, idx) => {
    const codePreview = s.sourceCode
      ? s.sourceCode.substring(0, 800) +
        (s.sourceCode.length > 800 ? '\n// ... (truncated)' : '')
      : 'Code not available';
    return `### Submission ${idx + 1} - ${s.verdict} (${s.language || 'Unknown'})
\`\`\`${s.language?.toLowerCase()?.split(' ')[0] || ''}
${codePreview}
\`\`\``;
  });

  // Use the first accepted solution as the primary solution for detailed analysis
  const primarySolution =
    acceptedSubmissions[0] || sortedSubmissions[sortedSubmissions.length - 1];

  let prompt =
    customPrompt ||
    `You are an expert competitive programmer. Analyze this user's COMPLETE submission history for a problem, including both failed and successful attempts.

## Problem: ${problemName || 'Unknown Problem'}

${problemDescription ? `### Description:\n${problemDescription.substring(0, 2000)}` : ''}

### Submission History (${submissions.length} total: ${acceptedSubmissions.length} accepted, ${failedSubmissions.length} failed):

${submissionHistory.slice(0, 5).join('\n\n')}
${submissionHistory.length > 5 ? `\n\n... and ${submissionHistory.length - 5} more submissions` : ''}

${existingTags?.length > 0 ? `### Problem Tags: ${existingTags.join(', ')}` : ''}

Provide a COMPREHENSIVE analysis that considers ALL submissions. Focus on the user's learning journey and progression. Return this exact JSON format:

{
  "problemSummary": "2-3 sentence summary of the problem",
  "userApproach": {
    "name": "Name of the FINAL working approach (from accepted solution)",
    "explanation": "3-5 sentence explanation of how the accepted solution works",
    "whyItWorks": "Why this approach correctly solves the problem"
  },
  "timeComplexity": "Time complexity of the accepted solution",
  "spaceComplexity": "Space complexity of the accepted solution",
  "learningJourney": {
    "totalAttempts": ${submissions.length},
    "failedAttempts": ${failedSubmissions.length},
    "progression": "Describe how the user's approach evolved across submissions. What did they try first? How did they improve?",
    "breakthroughMoment": "What key insight or change led to the accepted solution?",
    "lessonsLearned": ["Lesson 1 from failed attempts", "Lesson 2"]
  },
  "failedAttemptsSummary": [
    ${failedSubmissions
      .slice(0, 3)
      .map(
        (s) => `{
      "verdict": "${s.verdict}",
      "likelyCause": "Brief explanation of why this attempt failed",
      "whatWasWrong": "Specific bug or issue"
    }`
      )
      .join(',\n    ')}
  ],
  "alternativeApproaches": [
    {
      "name": "Alternative approach name",
      "explanation": "How this approach would work",
      "timeComplexity": "O(?)",
      "spaceComplexity": "O(?)",
      "tradeoffs": "When to prefer this approach"
    }
  ],
  "keyConcepts": ["Key concept 1 needed to solve this", "Key concept 2"],
  "optimizationTips": ["How the solution could be improved", "Performance tip"],
  "edgeCases": ["Edge case 1 that caused issues", "Edge case 2"],
  "commonMistakes": ["Mistake the user made", "Another common pitfall"],
  "codeQuality": {
    "readability": "good|average|poor",
    "efficiency": "optimal|suboptimal|inefficient",
    "suggestions": ["Suggestion for improvement"]
  }
}

Guidelines:
- learningJourney.progression should tell a story of how the user improved
- failedAttemptsSummary should identify specific bugs/issues for each failed attempt
- If there are no failed attempts, set failedAttemptsSummary to empty array and note this in learningJourney
- Focus on what the user ACTUALLY learned from this problem
- Be encouraging about the learning process, even if there were many failed attempts

Return ONLY valid JSON.`;

  // If custom prompt provided, add context
  if (customPrompt) {
    prompt = `## Context:
Problem: ${problemName || 'Unknown'}
${problemDescription ? `Description: ${problemDescription.substring(0, 1000)}` : ''}
Total Submissions: ${submissions.length} (${acceptedSubmissions.length} accepted, ${failedSubmissions.length} failed)

## Custom Question/Request:
${customPrompt}

Based on the above submission history, provide your analysis in JSON format with fields:
problemSummary, userApproach, timeComplexity, spaceComplexity, learningJourney, failedAttemptsSummary, alternativeApproaches, keyConcepts, optimizationTips, edgeCases, commonMistakes, codeQuality, and customResponse.

Return ONLY valid JSON.`;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an expert competitive programmer and mentor. Analyze code submissions holistically and provide encouraging, educational feedback. Respond with valid JSON only.',
    },
    { role: 'user', content: prompt },
  ];

  const { content, provider } = await generateCompletion(messages, {
    temperature: 0.2,
    maxTokens: 3000,
  });

  // Parse response
  let analysis;
  try {
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch (error) {
    console.error('[AI-ANALYZE] Combined analysis parse failed:', error);
    analysis = {
      problemSummary: 'Analysis failed',
      userApproach: {
        name: 'Unknown',
        explanation: 'Analysis failed',
        whyItWorks: '',
      },
      learningJourney: {
        totalAttempts: submissions.length,
        failedAttempts: failedSubmissions.length,
        progression: 'Unable to analyze progression',
        breakthroughMoment: '',
        lessonsLearned: [],
      },
      failedAttemptsSummary: [],
      alternativeApproaches: [],
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      keyConcepts: [],
    };
  }

  return {
    problemSummary: analysis.problemSummary || '',
    userApproach: analysis.userApproach || {
      name: 'Unknown',
      explanation: '',
      whyItWorks: '',
    },
    alternativeApproaches: analysis.alternativeApproaches || [],
    timeComplexity: analysis.timeComplexity || 'Unknown',
    spaceComplexity: analysis.spaceComplexity || 'Unknown',
    keyConcepts: analysis.keyConcepts || [],
    optimizationTips: analysis.optimizationTips || [],
    edgeCases: analysis.edgeCases || [],
    commonMistakes: analysis.commonMistakes || [],
    codeQuality: analysis.codeQuality || {
      readability: 'average',
      efficiency: 'unknown',
      suggestions: [],
    },
    learningJourney: analysis.learningJourney || {
      totalAttempts: submissions.length,
      failedAttempts: failedSubmissions.length,
      progression: '',
      breakthroughMoment: '',
      lessonsLearned: [],
    },
    failedAttemptsSummary: analysis.failedAttemptsSummary || [],
    analyzedBy: provider,
    analyzedAt: new Date().toISOString(),
  };
}
