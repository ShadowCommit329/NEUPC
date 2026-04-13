import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { createClient } from '@/app/_lib/supabase';
import { generateCompletion } from '@/app/_lib/llm';

/**
 * POST /api/problem-solving/analyze-submission
 *
 * Comprehensive AI-powered analysis of a single code submission
 * Extracts:
 * - Algorithms & techniques used
 * - Data structures
 * - Code patterns & style
 * - Time/space complexity
 * - Quality assessment
 * - Learning points
 * - Improvement suggestions
 * - Verdict analysis (for failed submissions)
 */
export async function POST(request) {
  try {
    // Check for internal API key for background jobs
    const authHeader = request.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;

    let isAuthorized = false;

    // Allow requests with valid internal API key (for background scripts)
    if (internalApiKey && authHeader === `Bearer ${internalApiKey}`) {
      isAuthorized = true;
    } else {
      // Otherwise require session authentication
      const session = await auth();
      if (session?.user?.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      solution_id,
      source_code,
      language,
      problem_description,
      problem_tags,
      verdict, // 'AC', 'WA', 'TLE', 'MLE', 'RE', etc.
      force_reanalyze = false,
    } = body;

    if (!solution_id && !source_code) {
      return NextResponse.json(
        { error: 'Either solution_id or source_code is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    let solution = null;
    let code = source_code;
    let lang = language;
    let solutionVerdict = verdict;
    let validSolutionId = null; // Track if we found a valid solution to save to

    // If solution_id provided, try to fetch from database
    if (solution_id) {
      const { data, error } = await supabase
        .from('solutions')
        .select(
          `
          *,
          user_problem_solve:user_problem_solves (
            user_id,
            problem_id,
            problem:problems (
              platform,
              problem_id,
              problem_name,
              problem_description,
              tags,
              difficulty_rating
            )
          )
        `
        )
        .eq('id', solution_id)
        .single();

      if (error || !data) {
        // Solution not found in database - fall back to using provided source_code
        console.log(
          `Solution ${solution_id} not found, using provided source_code`
        );
        if (!source_code) {
          return NextResponse.json(
            { error: 'Solution not found and no source_code provided' },
            { status: 404 }
          );
        }
        // Continue with provided source_code (don't return 404)
      } else {
        // Verify ownership
        if (data.user_problem_solve?.user_id !== session.user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if already analyzed
        if (
          data.code_patterns &&
          Object.keys(data.code_patterns).length > 0 &&
          !force_reanalyze
        ) {
          return NextResponse.json({
            message: 'Submission already analyzed',
            analysis: extractAnalysisFromSolution(data),
            cached: true,
          });
        }

        solution = data;
        code = data.source_code || source_code;
        lang = data.language || language;
        validSolutionId = solution_id; // We can save to this solution
      }
    }

    if (!code) {
      return NextResponse.json(
        { error: 'No source code found' },
        { status: 400 }
      );
    }

    // Analyze the submission with AI
    const analysis = await analyzeSubmissionWithAI(
      code,
      lang || 'cpp',
      problem_description ||
        solution?.user_problem_solve?.problem?.problem_description,
      problem_tags || solution?.user_problem_solve?.problem?.tags,
      solutionVerdict || (solution?.submission_id ? 'AC' : 'unknown')
    );

    // If we have a valid solution_id, save analysis to database
    if (validSolutionId) {
      const updateData = {
        code_patterns: analysis.code_patterns,
        code_metrics: analysis.code_metrics,
        techniques_used: analysis.techniques_used,
        algorithms_detected: analysis.algorithms_detected,
        data_structures_used: analysis.data_structures_used,
        code_style: analysis.code_style,
        solution_signature: analysis.solution_signature,
        estimated_time_complexity: analysis.estimated_time_complexity,
        estimated_space_complexity: analysis.estimated_space_complexity,
        key_insights: analysis.key_insights,
        learning_points: analysis.learning_points,
        improvement_suggestions: analysis.improvement_suggestions,
        verdict_analysis: analysis.verdict_analysis,
        quality_score: analysis.quality_score,
        difficulty_match: analysis.difficulty_match,
        submission_embedding: analysis.submission_embedding,
        analysis_version: 'v1',
        analysis_model: 'claude',
        analysis_confidence: analysis.confidence,
        ai_analysis_status: 'completed',
        ai_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('solutions')
        .update(updateData)
        .eq('id', validSolutionId);

      if (updateError) {
        console.error('Error saving analysis:', updateError);
        // Continue anyway - return analysis even if save fails
      }

      // Also update the solution embeddings table
      await saveSolutionEmbedding(supabase, validSolutionId, analysis);
    }

    return NextResponse.json({
      message: 'Submission analyzed successfully',
      analysis,
      cached: false,
    });
  } catch (error) {
    console.error('Submission analysis error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Comprehensive AI analysis of submission
 */
async function analyzeSubmissionWithAI(
  sourceCode,
  language,
  problemDescription,
  problemTags,
  verdict
) {
  const prompt = `You are an expert competitive programmer and code analyst. Analyze this submission comprehensively.

LANGUAGE: ${language}
VERDICT: ${verdict}
${problemDescription ? `PROBLEM DESCRIPTION:\n${problemDescription}\n` : ''}
${problemTags?.length ? `PROBLEM TAGS: ${problemTags.join(', ')}\n` : ''}

SOURCE CODE:
\`\`\`${language}
${sourceCode}
\`\`\`

Provide a comprehensive analysis in the following JSON format:

{
  "code_patterns": {
    "algorithms_used": ["string"],
    "data_structures": ["string"],
    "coding_patterns": ["string"],
    "input_parsing": "string",
    "output_format": "string",
    "template_used": boolean,
    "macros_used": ["string"]
  },
  
  "code_metrics": {
    "lines_of_code": number,
    "cyclomatic_complexity": number,
    "nesting_depth": number,
    "function_count": number,
    "variable_count": number,
    "comment_ratio": number,
    "code_density": number
  },
  
  "techniques_used": ["string"],
  "algorithms_detected": ["string"],
  "data_structures_used": ["string"],
  
  "code_style": {
    "readability": number,
    "maintainability": number,
    "efficiency": number,
    "idiomaticity": number,
    "naming_quality": number,
    "structure_quality": number,
    "overall_score": number
  },
  
  "solution_signature": "string",
  "estimated_time_complexity": "string",
  "estimated_space_complexity": "string",
  
  "key_insights": ["string"],
  
  "learning_points": [
    {
      "concept": "string",
      "application": "string",
      "importance": "high|medium|low"
    }
  ],
  
  "improvement_suggestions": [
    {
      "type": "performance|readability|safety|style",
      "suggestion": "string",
      "impact": "high|moderate|low",
      "line_numbers": [number]
    }
  ],
  
  "verdict_analysis": {
    "verdict": "string",
    "likely_cause": "string",
    "problematic_lines": [number],
    "fix_suggestion": "string",
    "test_case_hint": "string"
  },
  
  "quality_score": number,
  "difficulty_match": "under_engineered|appropriate|over_engineered",
  
  "submission_embedding": {
    "has_recursion": boolean,
    "has_iteration": boolean,
    "has_dp": boolean,
    "has_greedy": boolean,
    "has_graph": boolean,
    "has_math": boolean,
    "has_string_processing": boolean,
    "has_binary_search": boolean,
    "has_sorting": boolean,
    "has_two_pointers": boolean,
    "complexity_tier": number,
    "code_length_tier": number,
    "technique_count": number
  },
  
  "confidence": number
}

FIELD GUIDELINES:

1. **code_patterns**: 
   - algorithms_used: Specific algorithms like "dijkstra", "binary_search", "dfs"
   - data_structures: Language-level structures like "vector", "map", "set"
   - coding_patterns: Patterns like "recursion", "memoization", "iterative_dp"
   - input_parsing: "standard", "fast_io", "getline", "custom"

2. **code_metrics**:
   - cyclomatic_complexity: Estimate based on conditionals/loops (1-20+)
   - nesting_depth: Maximum nesting level
   - code_density: Non-empty lines / total lines

3. **techniques_used**: High-level techniques like:
   - "prefix_sum", "two_pointers", "sliding_window"
   - "coordinate_compression", "sweep_line"
   - "binary_search_on_answer", "meet_in_middle"

4. **algorithms_detected**: Specific named algorithms:
   - "bfs", "dfs", "dijkstra", "bellman_ford"
   - "knapsack_01", "lis", "lcs"
   - "segment_tree_point_update", "fenwick_tree_range"

5. **solution_signature**: A concise description like:
   - "greedy_sorting_two_pointers"
   - "dp_2d_bottom_up_with_space_optimization"
   - "graph_bfs_level_order"

6. **code_style scores**: 0-10 scale
   - readability: Variable names, comments, structure
   - efficiency: Algorithm choice, unnecessary operations
   - idiomaticity: Language-specific best practices

7. **verdict_analysis** (if NOT AC):
   - likely_cause: "Off-by-one error", "Integer overflow", "Wrong algorithm"
   - problematic_lines: Line numbers with issues
   - fix_suggestion: Specific fix

8. **quality_score**: Overall 0-100 combining all factors

9. **difficulty_match**:
   - under_engineered: Too simple for the problem
   - appropriate: Good match
   - over_engineered: Unnecessarily complex

10. **submission_embedding**: Boolean features for similarity matching
    - complexity_tier: 1-5 (1=trivial, 5=complex)
    - code_length_tier: 1-5 based on LOC

11. **confidence**: 0-1 how confident you are in the analysis

IMPORTANT:
- Be thorough but accurate
- Identify ALL techniques and algorithms
- For non-AC solutions, be specific about likely causes
- Learning points should be actionable
- Improvement suggestions should be practical

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await generateCompletion([
      {
        role: 'system',
        content:
          'You are an expert competitive programming analyst. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const content = response.content || response;

    // Extract JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return getDefaultAnalysis();
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return validateAndNormalizeAnalysis(analysis);
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return getDefaultAnalysis();
  }
}

/**
 * Validate and normalize analysis data
 */
function validateAndNormalizeAnalysis(analysis) {
  return {
    code_patterns: analysis.code_patterns || {},
    code_metrics: analysis.code_metrics || {},
    techniques_used: analysis.techniques_used || [],
    algorithms_detected: analysis.algorithms_detected || [],
    data_structures_used: analysis.data_structures_used || [],
    code_style: analysis.code_style || {},
    solution_signature: analysis.solution_signature || 'unknown',
    estimated_time_complexity: analysis.estimated_time_complexity || 'unknown',
    estimated_space_complexity:
      analysis.estimated_space_complexity || 'unknown',
    key_insights: analysis.key_insights || [],
    learning_points: analysis.learning_points || [],
    improvement_suggestions: analysis.improvement_suggestions || [],
    verdict_analysis: analysis.verdict_analysis || {},
    quality_score: Math.min(100, Math.max(0, analysis.quality_score || 50)),
    difficulty_match: analysis.difficulty_match || 'appropriate',
    submission_embedding: analysis.submission_embedding || {},
    confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
  };
}

/**
 * Default analysis if AI fails
 */
function getDefaultAnalysis() {
  return {
    code_patterns: {},
    code_metrics: { lines_of_code: 0 },
    techniques_used: [],
    algorithms_detected: [],
    data_structures_used: [],
    code_style: { overall_score: 5 },
    solution_signature: 'unknown',
    estimated_time_complexity: 'unknown',
    estimated_space_complexity: 'unknown',
    key_insights: [],
    learning_points: [],
    improvement_suggestions: [],
    verdict_analysis: {},
    quality_score: 50,
    difficulty_match: 'appropriate',
    submission_embedding: {},
    confidence: 0,
  };
}

/**
 * Extract existing analysis from solution record
 */
function extractAnalysisFromSolution(solution) {
  return {
    code_patterns: solution.code_patterns,
    code_metrics: solution.code_metrics,
    techniques_used: solution.techniques_used,
    algorithms_detected: solution.algorithms_detected,
    data_structures_used: solution.data_structures_used,
    code_style: solution.code_style,
    solution_signature: solution.solution_signature,
    estimated_time_complexity: solution.estimated_time_complexity,
    estimated_space_complexity: solution.estimated_space_complexity,
    key_insights: solution.key_insights,
    learning_points: solution.learning_points,
    improvement_suggestions: solution.improvement_suggestions,
    verdict_analysis: solution.verdict_analysis,
    quality_score: solution.quality_score,
    difficulty_match: solution.difficulty_match,
    submission_embedding: solution.submission_embedding,
    confidence: solution.analysis_confidence,
  };
}

/**
 * Save solution embedding to separate table
 */
async function saveSolutionEmbedding(supabase, solutionId, analysis) {
  try {
    const embeddingData = {
      solution_id: solutionId,
      feature_vector: analysis.submission_embedding,
      code_embedding: null, // Can add actual embedding later
      approach_embedding: null,
    };

    await supabase
      .from('solution_embeddings')
      .upsert(embeddingData, { onConflict: 'solution_id' });
  } catch (error) {
    console.error('Error saving solution embedding:', error);
    // Non-critical, continue
  }
}
