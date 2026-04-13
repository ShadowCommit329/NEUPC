/**
 * API endpoint to re-analyze a specific solution with the new LLM format
 *
 * This is called lazily when a user expands a problem card to view details.
 * It checks if the solution needs re-analysis (old format or missing fields)
 * and updates it if needed.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { analyzeProblem, isLLMAvailable } from '@/app/_lib/llm';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformCode,
  getLanguageCode,
} from '@/app/_lib/problem-solving-v2-helpers';

/**
 * Check if a solution needs re-analysis
 */
function needsReanalysis(solutionAnalysis) {
  if (!solutionAnalysis) return true;
  if (!solutionAnalysis.analyzed_at) return true;

  // If we have at least *some* meaningful analysis fields, treat as analyzed.
  if (
    solutionAnalysis.approach_name ||
    solutionAnalysis.time_complexity ||
    solutionAnalysis.space_complexity
  ) {
    return false;
  }

  return true;
}

export async function POST(request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    const { solutionId, forceReanalyze = false } = await request.json();

    if (!solutionId) {
      return NextResponse.json(
        { error: 'Solution ID is required' },
        { status: 400 }
      );
    }

    // Check for normalized schema availability
    const useV2 = await isV2SchemaAvailable();
    if (!useV2) {
      return NextResponse.json(
        {
          error:
            'Problem Solving schema is not available. Apply docs/database/schema.sql first.',
        },
        { status: 500 }
      );
    }

    if (!isLLMAvailable()) {
      return NextResponse.json(
        { error: 'LLM analysis is not available' },
        { status: 503 }
      );
    }

    // Fetch the solution (normalized schema)
    const { data: solution, error: fetchError } = await supabase
      .from(V2_TABLES.SOLUTIONS)
      .select(
        `
        id,
        source_code,
        language_id,
        verdict,
        user_solves!inner (
          id,
          user_id,
          problem_id,
          problems!inner (
            id,
            external_id,
            name,
            platform_id
          )
        ),
        solution_analysis (
          approach_name,
          approach_explanation,
          time_complexity,
          space_complexity,
          techniques_used,
          optimization_tips,
          learning_notes,
          analyzed_at,
          model_version
        )
      `
      )
      .eq('id', solutionId)
      .single();

    if (fetchError || !solution) {
      return NextResponse.json(
        { error: 'Solution not found' },
        { status: 404 }
      );
    }

    const userSolve = Array.isArray(solution.user_solves)
      ? solution.user_solves[0] || null
      : solution.user_solves || null;
    const problem = userSolve?.problems || null;

    if (!userSolve || !problem) {
      return NextResponse.json(
        { error: 'Solution is missing problem linkage' },
        { status: 500 }
      );
    }

    // Verify ownership
    if (userSolve.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - not your solution' },
        { status: 403 }
      );
    }

    const existingAnalysis = Array.isArray(solution.solution_analysis)
      ? solution.solution_analysis[0] || null
      : solution.solution_analysis || null;

    // Check if re-analysis is needed
    if (!forceReanalyze && !needsReanalysis(existingAnalysis)) {
      return NextResponse.json({
        success: true,
        message: 'Solution already has up-to-date analysis',
        alreadyUpdated: true,
      });
    }

    // Check if source code exists
    if (!solution.source_code) {
      return NextResponse.json(
        { error: 'Solution has no source code to analyze' },
        { status: 400 }
      );
    }

    const platformCode =
      (await getPlatformCode(problem.platform_id)) || 'unknown';

    const languageCode = await getLanguageCode(solution.language_id);

    const { data: problemTagLinks } = await supabase
      .from(V2_TABLES.PROBLEM_TAGS)
      .select('tags(name)')
      .eq('problem_id', problem.id);

    const existingTopics = (problemTagLinks || [])
      .map((row) => {
        const tag = row.tags;
        if (Array.isArray(tag)) return tag[0]?.name;
        return tag?.name;
      })
      .filter(Boolean);

    // Perform re-analysis
    console.log(
      `[Re-analyze] Analyzing ${platformCode}/${solution.problem_id}...`
    );

    const analysisResult = await analyzeProblem({
      sourceCode: solution.source_code,
      language: languageCode,
      problemName: problem.name || problem.external_id,
      problemDescription: null, // Let LLM infer from code
      existingTopics,
    });

    const analyzedAt = analysisResult.analyzedAt
      ? new Date(analysisResult.analyzedAt).toISOString()
      : new Date().toISOString();
    const analyzedBy = analysisResult.analyzedBy || 'llm';

    const optimizationTips = Array.isArray(analysisResult.optimizationTips)
      ? analysisResult.optimizationTips
      : Array.isArray(analysisResult.optimization_tips)
        ? analysisResult.optimization_tips
        : [];

    const { error: solutionAnalysisError } = await supabase
      .from(V2_TABLES.SOLUTION_ANALYSIS)
      .upsert(
        {
          solution_id: solutionId,
          approach_name:
            analysisResult.userApproach?.name ||
            analysisResult.approach ||
            null,
          approach_explanation:
            analysisResult.userApproach?.explanation || null,
          time_complexity: analysisResult.timeComplexity || null,
          space_complexity: analysisResult.spaceComplexity || null,
          techniques_used: Array.isArray(analysisResult.topics)
            ? analysisResult.topics
            : null,
          optimization_tips: optimizationTips.length ? optimizationTips : null,
          learning_notes: Array.isArray(analysisResult.keyInsights)
            ? analysisResult.keyInsights.join('\n')
            : null,
          analyzed_at: analyzedAt,
          model_version: analyzedBy,
        },
        { onConflict: 'solution_id' }
      );

    if (solutionAnalysisError) {
      console.error(
        '[Re-analyze] Failed to upsert solution_analysis:',
        solutionAnalysisError
      );
      return NextResponse.json(
        { error: 'Failed to save solution analysis' },
        { status: 500 }
      );
    }

    const { error: problemAnalysisError } = await supabase
      .from(V2_TABLES.PROBLEM_ANALYSIS)
      .upsert(
        {
          problem_id: problem.id,
          summary:
            analysisResult.problemSummary || analysisResult.summary || null,
          key_concepts: Array.isArray(analysisResult.keyInsights)
            ? analysisResult.keyInsights
            : null,
          hints: Array.isArray(analysisResult.edgeCases)
            ? analysisResult.edgeCases
            : null,
          common_mistakes: Array.isArray(analysisResult.commonMistakes)
            ? analysisResult.commonMistakes
            : null,
          time_complexity: analysisResult.timeComplexity || null,
          space_complexity: analysisResult.spaceComplexity || null,
          analyzed_at: analyzedAt,
          model_version: analyzedBy,
        },
        { onConflict: 'problem_id' }
      );

    if (problemAnalysisError) {
      console.warn(
        '[Re-analyze] Failed to upsert problem_analysis:',
        problemAnalysisError
      );
    }

    console.log(
      `[Re-analyze] ✓ Success (analyzed by ${analysisResult.analyzedBy})`
    );

    return NextResponse.json({
      success: true,
      message: 'Solution re-analyzed successfully',
      analyzedBy: analysisResult.analyzedBy,
      timestamp: analysisResult.analyzedAt,
    });
  } catch (error) {
    console.error('[Re-analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to re-analyze solution' },
      { status: 500 }
    );
  }
}
