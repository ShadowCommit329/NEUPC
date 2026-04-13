/**
 * @file Problem Analysis API Route
 * @module api/problem-solving/analyze
 *
 * Analyzes a problem solution using LLM to extract:
 * - Problem summary
 * - Time/space complexity
 * - Algorithm topics
 * - Code quality insights
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { verifyExtensionToken } from '@/app/_lib/extension-auth';
import {
  analyzeProblem,
  isLLMAvailable,
  getLLMProviderInfo,
} from '@/app/_lib/llm';
import {
  isV2SchemaAvailable,
  V2_TABLES,
} from '@/app/_lib/problem-solving-v2-helpers';

// CORS headers for browser extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Token',
};

function jsonResponse(data, options = {}) {
  const { status = 200 } = options;
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return jsonResponse({});
}

export async function POST(request) {
  try {
    // Auth check
    const session = await auth();
    const extensionToken = request.headers.get('X-Extension-Token');

    let userId = null;
    if (session?.user?.id) {
      userId = session.user.id;
    } else if (extensionToken) {
      userId = verifyExtensionToken(extensionToken);
    }

    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if LLM is available
    if (!isLLMAvailable()) {
      return jsonResponse(
        {
          success: false,
          error: 'LLM not configured',
          message:
            'No LLM API key configured. Set GITHUB_TOKEN, GROQ_API_KEY, TOGETHER_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      solutionId, // Optional: update existing solution
      problemId,
      platform,
      sourceCode,
      language,
      problemName,
      problemDescription,
      existingTopics,
    } = body;

    // Validate required fields
    if (!sourceCode) {
      return jsonResponse(
        { error: 'Source code is required for analysis' },
        { status: 400 }
      );
    }

    console.log(`[Analyze] Starting analysis for ${problemId || 'unknown'}`);
    console.log(`[Analyze] LLM Provider:`, getLLMProviderInfo());

    // Perform LLM analysis
    const analysis = await analyzeProblem({
      problemDescription,
      sourceCode,
      language,
      problemName,
      existingTopics: existingTopics || [],
    });

    console.log(`[Analyze] Analysis complete:`, {
      timeComplexity: analysis.timeComplexity,
      spaceComplexity: analysis.spaceComplexity,
      topics: analysis.topics,
      difficulty: analysis.difficulty,
    });

    // If solutionId provided, update the solution in database
    if (solutionId) {
      // Check for V2 schema availability
      const useV2 = await isV2SchemaAvailable();
      const solutionsTable = useV2 ? V2_TABLES.SOLUTIONS : 'problem_solutions';

      const { error: updateError } = await supabaseAdmin
        .from(solutionsTable)
        .update({
          time_complexity: analysis.timeComplexity,
          space_complexity: analysis.spaceComplexity,
          topics: analysis.topics,
          difficulty_tier: analysis.difficulty,
          analysis_data: {
            summary: analysis.summary,
            approach: analysis.approach,
            keyInsights: analysis.keyInsights,
            similarProblems: analysis.similarProblems,
            codeQuality: analysis.codeQuality,
            analyzedBy: analysis.analyzedBy,
            analyzedAt: analysis.analyzedAt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', solutionId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Analyze] Failed to update solution:', updateError);
      } else {
        console.log('[Analyze] Solution updated with analysis');
      }
    }

    return jsonResponse({
      success: true,
      analysis,
      provider: getLLMProviderInfo(),
    });
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Analysis failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check LLM availability
 */
export async function GET() {
  const providerInfo = getLLMProviderInfo();
  return jsonResponse({
    success: true,
    llmAvailable: providerInfo.available,
    provider: providerInfo,
  });
}
