/**
 * @file Solution Analyzer Service
 * @module solution-analyzer
 *
 * Analyzes programming solutions using LLM to extract:
 * - Problem summary
 * - Solution approach explanation
 * - Time/Space complexity analysis
 * - Alternative approaches
 * - Key concepts and learning notes
 */

import { supabaseAdmin } from './supabase.js';
import {
  generateCompletion,
  isLLMAvailable,
  getLLMProviderInfo,
} from './llm.js';
import {
  V2_TABLES,
  isV2SchemaAvailable,
} from './problem-solving-v2-helpers.js';

/**
 * Analyze a solution and update the database with LLM analysis
 * Supports V2 schema with fallback to legacy schema
 * @param {string} solutionId - UUID of the solution to analyze
 * @param {Object} solutionData - Optional solution data to avoid DB lookup
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeSolution(solutionId, solutionData = null) {
  if (!isLLMAvailable()) {
    throw new Error('No LLM provider available for analysis');
  }

  const useV2 = await isV2SchemaAvailable();
  const solutionsTable = useV2 ? V2_TABLES.SOLUTIONS : 'solutions';

  try {
    // Update status to 'analyzing'
    await supabaseAdmin
      .from(solutionsTable)
      .update({
        ai_analysis_status: 'analyzing',
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', solutionId);

    console.log(
      `[SOLUTION-ANALYZER] Starting analysis for solution ${solutionId} (schema: ${useV2 ? 'V2' : 'legacy'})`
    );

    // Get solution data if not provided
    let solution = solutionData;
    if (!solution) {
      // Different query structure for V2 vs legacy
      const selectQuery = useV2
        ? `
          *,
          user_solves_v2!inner(
            problems_v2!inner(name, description, tags)
          )
        `
        : `
          *,
          user_problem_solves!inner(
            problems!inner(problem_name, problem_description, tags)
          )
        `;

      const { data, error } = await supabaseAdmin
        .from(solutionsTable)
        .select(selectQuery)
        .eq('id', solutionId)
        .single();

      if (error || !data) {
        throw new Error(`Solution not found: ${solutionId}`);
      }

      // Normalize data structure for V2
      if (useV2 && data.user_solves_v2) {
        const problem = data.user_solves_v2.problems_v2;
        solution = {
          ...data,
          problem_name: problem?.name,
          problem_description: problem?.description,
          topics: problem?.tags || [],
        };
      } else {
        solution = data;
      }
    }

    // Prepare the analysis prompt
    const analysisPrompt = createAnalysisPrompt(solution);

    // Get LLM analysis
    const messages = [
      {
        role: 'system',
        content: `You are a competitive programming expert. Analyze the given solution and provide structured insights. Always respond with valid JSON in the exact format requested.`,
      },
      {
        role: 'user',
        content: analysisPrompt,
      },
    ];

    console.log(
      `[SOLUTION-ANALYZER] Sending analysis request to LLM for solution ${solutionId}`
    );

    const response = await generateCompletion(messages, {
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 2000,
    });

    if (!response || !response.content) {
      throw new Error('Empty response from LLM');
    }

    // Parse the LLM response
    let analysisData;
    try {
      analysisData = JSON.parse(response.content);
    } catch (parseError) {
      console.warn(
        `[SOLUTION-ANALYZER] JSON parse failed, attempting to extract JSON from response`
      );
      analysisData = extractJSONFromResponse(response.content);
    }

    // Validate required fields
    const requiredFields = [
      'problem_summary',
      'solution_approach',
      'time_complexity',
      'space_complexity',
    ];
    const missingFields = requiredFields.filter(
      (field) => !analysisData[field]
    );

    if (missingFields.length > 0) {
      console.warn(
        `[SOLUTION-ANALYZER] Missing required fields: ${missingFields.join(', ')}`
      );
      // Fill in missing fields with defaults
      if (!analysisData.problem_summary)
        analysisData.problem_summary = 'Problem summary not available';
      if (!analysisData.solution_approach)
        analysisData.solution_approach = 'Solution approach not available';
      if (!analysisData.time_complexity) analysisData.time_complexity = 'O(?)';
      if (!analysisData.space_complexity)
        analysisData.space_complexity = 'O(?)';
    }

    // Get provider info for attribution
    const providerInfo = getLLMProviderInfo();

    // Update the solution with analysis data using new schema field names
    const updateData = {
      ai_problem_summary: analysisData.problem_summary,
      ai_approach_explanation: analysisData.solution_approach,
      ai_time_complexity: analysisData.time_complexity,
      ai_space_complexity: analysisData.space_complexity,
      ai_alternative_approaches: analysisData.alternative_approaches || {},
      ai_key_concepts: analysisData.key_concepts || [],
      ai_learning_notes: analysisData.learning_notes || '',
      ai_analysis_status: 'completed',
      ai_analyzed_at: new Date().toISOString(),
      ai_model_used: providerInfo?.activeProvider
        ? `${providerInfo.activeProvider.name} (${providerInfo.activeProvider.model})`
        : 'Unknown',
    };

    const { error: updateError } = await supabaseAdmin
      .from(solutionsTable)
      .update(updateData)
      .eq('id', solutionId);

    if (updateError) {
      throw new Error(
        `Failed to update solution analysis: ${updateError.message}`
      );
    }

    console.log(
      `[SOLUTION-ANALYZER] Analysis completed for solution ${solutionId}`
    );

    return {
      success: true,
      solutionId,
      analysis: analysisData,
      provider: providerInfo?.activeProvider?.name || 'Unknown',
    };
  } catch (error) {
    console.error(
      `[SOLUTION-ANALYZER] Analysis failed for solution ${solutionId}:`,
      error
    );

    // Update status to 'failed'
    await supabaseAdmin
      .from(solutionsTable)
      .update({
        ai_analysis_status: 'failed',
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', solutionId)
      .catch((updateError) =>
        console.error(
          `[SOLUTION-ANALYZER] Failed to update error status:`,
          updateError
        )
      );

    throw error;
  }
}

/**
 * Re-analyze a solution (for failed or outdated analyses)
 * Supports V2 schema with fallback to legacy schema
 * @param {string} solutionId - UUID of the solution to re-analyze
 * @returns {Promise<Object>} Analysis result
 */
export async function reanalyzeSolution(solutionId) {
  console.log(`[SOLUTION-ANALYZER] Re-analyzing solution ${solutionId}`);
  return await analyzeSolution(solutionId);
}

/**
 * Batch analyze multiple solutions
 * @param {string[]} solutionIds - Array of solution UUIDs
 * @param {Object} options - Batch options
 * @returns {Promise<Object>} Batch analysis results
 */
export async function batchAnalyzeSolutions(solutionIds, options = {}) {
  const { concurrency = 3, delayMs = 1000 } = options;

  console.log(
    `[SOLUTION-ANALYZER] Starting batch analysis of ${solutionIds.length} solutions (concurrency: ${concurrency})`
  );

  const results = [];
  const errors = [];

  // Process in batches to avoid overwhelming the LLM API
  for (let i = 0; i < solutionIds.length; i += concurrency) {
    const batch = solutionIds.slice(i, i + concurrency);

    const batchPromises = batch.map(async (solutionId) => {
      try {
        const result = await analyzeSolution(solutionId);
        results.push(result);
        return result;
      } catch (error) {
        const errorResult = { solutionId, error: error.message };
        errors.push(errorResult);
        return errorResult;
      }
    });

    await Promise.all(batchPromises);

    // Add delay between batches to respect rate limits
    if (i + concurrency < solutionIds.length && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(
    `[SOLUTION-ANALYZER] Batch analysis completed: ${results.length} successful, ${errors.length} failed`
  );

  return {
    successful: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Get pending solutions that need analysis
 * Supports V2 schema with fallback to legacy schema
 * @param {number} limit - Maximum number of solutions to return
 * @returns {Promise<Array>} Array of solutions pending analysis
 */
export async function getPendingAnalyses(limit = 50) {
  const useV2 = await isV2SchemaAvailable();

  if (useV2) {
    // V2 schema query
    const { data, error } = await supabaseAdmin
      .from(V2_TABLES.SOLUTIONS)
      .select(
        `
        id, problem_name, language, created_at,
        user_solves_v2!inner(
          problems_v2!inner(
            cp_platforms!inner(code)
          )
        )
      `
      )
      .eq('ai_analysis_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pending analyses: ${error.message}`);
    }

    // Transform to include platform at top level
    return (data || []).map((item) => ({
      ...item,
      platform: item.user_solves_v2?.problems_v2?.cp_platforms?.code,
    }));
  }

  // Legacy schema query
  const { data, error } = await supabaseAdmin
    .from('problem_solutions')
    .select('id, problem_name, platform, language, created_at')
    .eq('llm_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get pending analyses: ${error.message}`);
  }

  return data || [];
}

/**
 * Create analysis prompt for the LLM
 * @param {Object} solution - Solution data
 * @returns {string} Formatted prompt
 */
function createAnalysisPrompt(solution) {
  const {
    problem_name,
    problem_description,
    source_code,
    language,
    platform,
    topics = [],
  } = solution;

  return `Analyze this competitive programming solution and provide insights in JSON format:

**Problem:** ${problem_name} (${platform})
${problem_description ? `**Description:** ${problem_description}` : ''}
${topics.length > 0 ? `**Tags:** ${topics.join(', ')}` : ''}

**Solution (${language}):**
\`\`\`${language.toLowerCase()}
${source_code}
\`\`\`

Please provide analysis in this EXACT JSON format:
{
  "problem_summary": "Brief 1-2 sentence summary of what the problem asks",
  "solution_approach": "Detailed explanation of the approach used in this solution (2-3 sentences)",
  "time_complexity": "Big O time complexity (e.g., 'O(n log n)')",
  "space_complexity": "Big O space complexity (e.g., 'O(1)')",
  "alternative_approaches": ["Approach 1 description", "Approach 2 description"],
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
  "learning_notes": "Key insights or patterns that can be applied to similar problems"
}

Focus on:
1. Accuracy of complexity analysis
2. Clear explanation of the algorithm
3. Practical learning insights
4. Alternative approaches when applicable

Respond with ONLY the JSON, no additional text.`;
}

/**
 * Extract JSON from LLM response that might have extra text
 * @param {string} response - Raw LLM response
 * @returns {Object} Parsed JSON object
 */
function extractJSONFromResponse(response) {
  // Try to find JSON in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('[SOLUTION-ANALYZER] Failed to parse extracted JSON');
    }
  }

  // Fallback: return minimal analysis structure
  return {
    problem_summary: 'Analysis parsing failed - summary not available',
    solution_approach: 'Analysis parsing failed - approach not available',
    time_complexity: 'O(?)',
    space_complexity: 'O(?)',
    alternative_approaches: [],
    key_concepts: [],
    learning_notes: 'Analysis failed due to parsing error',
  };
}

/**
 * Check if solution analyzer is available (LLM providers configured)
 * @returns {boolean} True if analyzer is available
 */
export function isSolutionAnalyzerAvailable() {
  return isLLMAvailable();
}

/**
 * Get analyzer status and stats
 * Supports V2 schema with fallback to legacy schema
 * @returns {Promise<Object>} Analyzer status
 */
export async function getAnalyzerStatus() {
  const useV2 = await isV2SchemaAvailable();
  const tableName = useV2 ? V2_TABLES.SOLUTIONS : 'problem_solutions';
  const statusField = useV2 ? 'ai_analysis_status' : 'llm_status';

  const { data: pendingCount } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq(statusField, 'pending');

  const { data: completedCount } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq(statusField, 'completed');

  const { data: failedCount } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq(statusField, 'failed');

  return {
    available: isLLMAvailable(),
    providerInfo: getLLMProviderInfo(),
    pending: pendingCount || 0,
    completed: completedCount || 0,
    failed: failedCount || 0,
    schemaVersion: useV2 ? 'v2' : 'legacy',
  };
}
