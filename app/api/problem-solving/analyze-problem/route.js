import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { createClient } from '@/app/_lib/supabase';
import { generateCompletion } from '@/app/_lib/llm';

/**
 * POST /api/problem-solving/analyze-problem
 * AI-powered comprehensive problem analysis for recommendation system
 *
 * Extracts:
 * - Algorithmic concepts
 * - Data structures
 * - Problem type
 * - Solving techniques
 * - Difficulty metrics
 * - Learning objectives
 * - Prerequisites
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
      problem_id,
      platform,
      problem_description,
      tags,
      difficulty_rating,
      user_solution, // Optional: analyze user's solution too
      force_reanalyze = false,
    } = body;

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get problem from database
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('problem_id', problem_id)
      .eq('platform', platform.toLowerCase())
      .single();

    if (problemError || !problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if already analyzed
    const { data: existingEmbedding } = await supabase
      .from('problem_embeddings')
      .select('*')
      .eq('problem_uuid', problem.id)
      .single();

    if (existingEmbedding && !force_reanalyze) {
      return NextResponse.json({
        message: 'Problem already analyzed',
        embedding: existingEmbedding,
        cached: true,
      });
    }

    // Analyze problem with AI
    const analysis = await analyzeProblemWithAI(
      problem.problem_description || problem_description,
      problem.tags || tags,
      problem.difficulty_rating || difficulty_rating,
      user_solution
    );

    // Store embedding
    const embeddingData = {
      problem_uuid: problem.id,
      ...analysis,
      ai_analyzed_at: new Date().toISOString(),
    };

    const { data: savedEmbedding, error: saveError } = await supabase
      .from('problem_embeddings')
      .upsert(embeddingData, {
        onConflict: 'problem_uuid',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving embedding:', saveError);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Problem analyzed successfully',
      embedding: savedEmbedding,
      cached: false,
    });
  } catch (error) {
    console.error('Problem analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * AI-powered problem analysis
 */
async function analyzeProblemWithAI(
  description,
  tags = [],
  difficulty_rating,
  userSolution = null
) {
  const prompt = `You are an expert competitive programming coach and data scientist. Analyze this problem comprehensively for a recommendation system.

PROBLEM DESCRIPTION:
${description}

GIVEN TAGS: ${tags.join(', ')}
DIFFICULTY RATING: ${difficulty_rating || 'Unknown'}

${userSolution ? `USER'S SOLUTION:\n${userSolution}\n` : ''}

Provide a comprehensive analysis in the following JSON format:

{
  "algorithmic_concepts": ["array"],
  "data_structures_used": ["array", "hashmap"],
  "problem_type": "string",
  "solving_techniques": ["array"],
  "difficulty_tier": "string",
  "complexity_score": number,
  "math_intensity": number,
  "creativity_score": number,
  "main_category": "string",
  "sub_categories": ["array"],
  "prerequisite_concepts": ["array"],
  "teaches_concepts": ["array"],
  "ai_summary": "string",
  "ai_learning_value": "string",
  "feature_vector": {
    "has_greedy": boolean,
    "has_dp": boolean,
    "has_graph": boolean,
    "has_math": boolean,
    "has_implementation": boolean,
    "has_data_structures": boolean,
    "requires_observation": boolean,
    "requires_proof": boolean,
    "is_adhoc": boolean,
    "difficulty_percentile": number
  }
}

FIELD DESCRIPTIONS:

1. **algorithmic_concepts**: Core algorithmic paradigms (e.g., "dynamic_programming", "greedy", "divide_and_conquer", "graph_traversal", "binary_search", "two_pointers", "sliding_window")

2. **data_structures_used**: Data structures needed (e.g., "segment_tree", "fenwick_tree", "trie", "disjoint_set", "priority_queue", "stack", "deque")

3. **problem_type**: One of: "optimization", "counting", "construction", "interactive", "game_theory", "simulation", "query"

4. **solving_techniques**: Specific techniques (e.g., "prefix_sum", "difference_array", "coordinate_compression", "meet_in_middle", "sqrt_decomposition")

5. **difficulty_tier**: "beginner" (800-1200), "intermediate" (1200-1800), "advanced" (1800-2400), "expert" (2400+)

6. **complexity_score**: 0-10, how complex is the implementation (0=trivial, 10=very complex)

7. **math_intensity**: 0-10, how math-heavy (0=no math, 10=pure math)

8. **creativity_score**: 0-10, how much creative insight needed (0=standard, 10=very creative)

9. **main_category**: Primary topic (e.g., "Dynamic Programming", "Graph Theory", "Number Theory")

10. **sub_categories**: Specific sub-topics

11. **prerequisite_concepts**: What you must know before attempting this

12. **teaches_concepts**: What you'll learn by solving this

13. **ai_summary**: 2-3 sentence summary of the problem

14. **ai_learning_value**: Why this problem is valuable for learning

15. **feature_vector**: Boolean and numeric features for similarity matching

IMPORTANT:
- Be precise and comprehensive
- Consider both explicit and implicit concepts
- Think about what makes this problem unique
- Consider the learning journey (prerequisites → teaches)
- Use standard competitive programming terminology

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await generateCompletion([
      {
        role: 'system',
        content:
          'You are an expert at analyzing competitive programming problems. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const content = response.content || response;

    // Extract JSON from response (in case there's extra text)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return getDefaultAnalysis();
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and set defaults
    return {
      algorithmic_concepts: analysis.algorithmic_concepts || [],
      data_structures_used: analysis.data_structures_used || [],
      problem_type: analysis.problem_type || 'optimization',
      solving_techniques: analysis.solving_techniques || [],
      difficulty_tier: analysis.difficulty_tier || 'intermediate',
      complexity_score: analysis.complexity_score || 5,
      math_intensity: analysis.math_intensity || 0,
      creativity_score: analysis.creativity_score || 5,
      main_category: analysis.main_category || 'General',
      sub_categories: analysis.sub_categories || [],
      prerequisite_concepts: analysis.prerequisite_concepts || [],
      teaches_concepts: analysis.teaches_concepts || [],
      ai_summary: analysis.ai_summary || '',
      ai_learning_value: analysis.ai_learning_value || '',
      feature_vector: analysis.feature_vector || {},
    };
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return getDefaultAnalysis();
  }
}

/**
 * Default analysis if AI fails
 */
function getDefaultAnalysis() {
  return {
    algorithmic_concepts: [],
    data_structures_used: [],
    problem_type: 'optimization',
    solving_techniques: [],
    difficulty_tier: 'intermediate',
    complexity_score: 5,
    math_intensity: 0,
    creativity_score: 5,
    main_category: 'General',
    sub_categories: [],
    prerequisite_concepts: [],
    teaches_concepts: [],
    ai_summary: 'Problem analysis pending',
    ai_learning_value: 'Educational value to be determined',
    feature_vector: {},
  };
}
