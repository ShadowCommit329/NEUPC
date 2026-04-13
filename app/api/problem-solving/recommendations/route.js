import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { createClient } from '@/app/_lib/supabase';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

/**
 * GET /api/problem-solving/recommendations?user_id=xxx&limit=10&type=next_challenge
 *
 * Advanced problem recommendation system using:
 * 1. Content-based filtering (problem features)
 * 2. Collaborative filtering (similar users)
 * 3. User skill profile
 * 4. Learning objectives
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '10');
    const recommendationType = searchParams.get('type') || 'mixed';
    const category = searchParams.get('category');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const userId = session.user.id;

    // Check if we have cached recommendations
    if (!forceRefresh) {
      const cached = await getCachedRecommendations(
        supabase,
        userId,
        limit,
        recommendationType,
        category
      );

      if (cached.length > 0) {
        return NextResponse.json({
          recommendations: cached,
          cached: true,
          generated_at: cached[0]?.generated_at,
        });
      }
    }

    // Generate fresh recommendations
    const recommendations = await generateRecommendations(
      supabase,
      userId,
      limit,
      recommendationType,
      category
    );

    // Cache recommendations
    await cacheRecommendations(supabase, userId, recommendations);

    return NextResponse.json({
      recommendations,
      cached: false,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get cached recommendations
 */
async function getCachedRecommendations(
  supabase,
  userId,
  limit,
  type,
  category
) {
  // Note: recommendations table may not exist in new schema yet
  // Using a try-catch to handle gracefully
  try {
    const { data, error } = await supabaseAdmin
      .from('problem_recommendations')
      .select(
        `
        *,
        problem:problems!problem_recommendations_problem_id_fkey (
          id,
          platform_id,
          external_id,
          name,
          url,
          difficulty_rating,
          platforms!inner(code, name)
        )
      `
      )
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .eq('is_viewed', false)
      .order('recommendation_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching cached recommendations:', error.message);
      return [];
    }

    // Normalize data to include platform at top level for compatibility
    return (data || []).map((rec) => ({
      ...rec,
      problem: rec.problem
        ? {
            ...rec.problem,
            platform: rec.problem.platforms?.code,
            problem_id: rec.problem.external_id,
            problem_name: rec.problem.name,
            problem_url: rec.problem.url,
          }
        : null,
    }));
  } catch {
    return [];
  }
}

/**
 * Generate fresh recommendations using hybrid approach
 */
async function generateRecommendations(
  supabase,
  userId,
  limit,
  type,
  category
) {
  // 1. Get user's solved problems
  const { data: solvedProblems } = await supabaseAdmin
    .from(V2_TABLES.USER_SOLVES)
    .select(
      `
      problem_id, first_solved_at,
      problems!inner(
        external_id,
        platforms!inner(code)
      )
    `
    )
    .eq('user_id', userId);

  // Normalize solved problems
  const normalizedSolved = (solvedProblems || []).map((p) => ({
    problem_id: p.problems?.external_id,
    platform: p.problems?.platforms?.code,
    solved_at: p.first_solved_at,
  }));

  const solvedProblemIds = new Set(
    normalizedSolved.map((p) => `${p.platform}:${p.problem_id}`)
  );

  // 2. Get user profile
  let { data: userProfile } = await supabase
    .from('user_problem_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Create profile if doesn't exist
  if (!userProfile) {
    userProfile = await createUserProfile(supabase, userId, normalizedSolved);
  }

  // 3. Get candidate problems (not solved yet)
  const { data: allProblems } = await supabaseAdmin
    .from(V2_TABLES.PROBLEMS)
    .select(
      `
      *,
      platforms!inner(code, name),
      problem_analysis(*)
    `
    )
    .limit(500);

  if (!allProblems) {
    return [];
  }

  // Normalize and filter out solved problems
  const candidateProblems = allProblems
    .map((p) => ({
      ...p,
      platform: p.platforms?.code,
      problem_id: p.external_id,
      problem_name: p.name,
      problem_url: p.url,
      embedding: p.problem_analysis,
    }))
    .filter((p) => {
      const key = `${p.platform}:${p.problem_id}`;
      return !solvedProblemIds.has(key);
    });

  // 4. Score each problem
  const scoredProblems = candidateProblems
    .map((problem) => {
      const scores = calculateProblemScore(
        problem,
        userProfile,
        solvedProblems,
        type
      );
      return {
        problem,
        ...scores,
      };
    })
    .filter((p) => p.recommendation_score > 20);

  // 5. Sort by score and apply diversity
  const recommendations = applyDiversityFilter(
    scoredProblems.sort(
      (a, b) => b.recommendation_score - a.recommendation_score
    ),
    limit
  );

  // 6. Format results
  return recommendations.map((rec) => ({
    problem_uuid: rec.problem.id,
    problem: rec.problem,
    recommendation_score: rec.recommendation_score,
    confidence_score: rec.confidence_score,
    content_score: rec.content_score,
    collaborative_score: rec.collaborative_score,
    skill_match_score: rec.skill_match_score,
    learning_value_score: rec.learning_value_score,
    recommendation_reason: rec.recommendation_reason,
    key_benefits: rec.key_benefits,
    recommendation_type: rec.recommendation_type,
    priority: rec.priority,
  }));
}

/**
 * Calculate comprehensive score for a problem
 */
function calculateProblemScore(
  problem,
  userProfile,
  solvedProblems,
  requestedType
) {
  const embedding = problem.embedding?.[0] || problem.problem_analysis?.[0];

  if (!embedding) {
    return calculateBasicScore(problem, userProfile);
  }

  let scores = {
    content_score: 0,
    collaborative_score: 0,
    skill_match_score: 0,
    learning_value_score: 0,
  };

  // 1. Content-based score
  scores.content_score = calculateContentScore(
    embedding,
    userProfile,
    solvedProblems
  );

  // 2. Skill match score
  scores.skill_match_score = calculateSkillMatchScore(embedding, userProfile);

  // 3. Learning value score
  scores.learning_value_score = calculateLearningValueScore(
    embedding,
    userProfile
  );

  // 4. Collaborative score
  scores.collaborative_score = calculateCollaborativeScore(
    problem,
    userProfile
  );

  // Weighted combination
  const weights = getTypeWeights(requestedType);
  const recommendation_score =
    scores.content_score * weights.content +
    scores.collaborative_score * weights.collaborative +
    scores.skill_match_score * weights.skill +
    scores.learning_value_score * weights.learning;

  // Generate reason
  const reason = generateRecommendationReason(scores, embedding, userProfile);
  const benefits = generateKeyBenefits(embedding, userProfile);
  const recType = determineRecommendationType(scores, embedding, userProfile);

  return {
    ...scores,
    recommendation_score: Math.min(100, Math.max(0, recommendation_score)),
    confidence_score: calculateConfidence(scores),
    recommendation_reason: reason,
    key_benefits: benefits,
    recommendation_type: recType,
    priority: calculatePriority(recommendation_score, recType),
  };
}

/**
 * Content-based scoring
 */
function calculateContentScore(embedding, userProfile, solvedProblems) {
  let score = 0;

  const strongConcepts = userProfile.strong_concepts || [];
  const problemConcepts = embedding.algorithmic_concepts || [];
  const conceptOverlap = problemConcepts.filter((c) =>
    strongConcepts.includes(c)
  ).length;
  score += conceptOverlap * 10;

  const preferredCategories = userProfile.preferred_categories || [];
  if (preferredCategories.includes(embedding.main_category)) {
    score += 15;
  }

  const weakConcepts = userProfile.weak_concepts || [];
  const hasWeakConcept = problemConcepts.some((c) => weakConcepts.includes(c));
  if (hasWeakConcept) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Skill match scoring
 */
function calculateSkillMatchScore(embedding, userProfile) {
  const problemDifficulty = embedding.difficulty_rating || 1200;
  const userRange = userProfile.preferred_difficulty_range || [1200, 1600];

  let minDiff, maxDiff;
  if (typeof userRange === 'string') {
    const match = userRange.match(/\[(\d+),(\d+)\]/);
    if (match) {
      minDiff = parseInt(match[1]);
      maxDiff = parseInt(match[2]);
    } else {
      minDiff = 1200;
      maxDiff = 1600;
    }
  } else if (Array.isArray(userRange)) {
    [minDiff, maxDiff] = userRange;
  } else {
    minDiff = 1200;
    maxDiff = 1600;
  }

  if (problemDifficulty >= minDiff && problemDifficulty <= maxDiff) {
    return 100;
  }

  if (
    problemDifficulty >= minDiff - 200 &&
    problemDifficulty <= maxDiff + 200
  ) {
    return 70;
  }

  if (problemDifficulty < minDiff - 400 || problemDifficulty > maxDiff + 400) {
    return 20;
  }

  return 50;
}

/**
 * Learning value scoring
 */
function calculateLearningValueScore(embedding, userProfile) {
  let score = 0;

  const teaches = embedding.teaches_concepts || [];
  const improving = userProfile.improving_concepts || [];
  const currentFocus = userProfile.current_focus_areas || [];

  const teachesImproving = teaches.filter((c) => improving.includes(c)).length;
  score += teachesImproving * 25;

  const matchesFocus = teaches.filter((c) => currentFocus.includes(c)).length;
  score += matchesFocus * 20;

  const complexityScore = embedding.complexity_score || 5;
  if (complexityScore >= 3 && complexityScore <= 7) {
    score += 15;
  }

  return Math.min(100, score);
}

/**
 * Collaborative filtering score (simplified)
 */
function calculateCollaborativeScore(problem, userProfile) {
  const totalSolvers = problem.embedding?.[0]?.total_solvers || 0;

  if (totalSolvers > 100) return 80;
  if (totalSolvers > 50) return 60;
  if (totalSolvers > 10) return 40;
  return 20;
}

/**
 * Basic scoring when no embedding available
 */
function calculateBasicScore(problem, userProfile) {
  return {
    content_score: 50,
    collaborative_score: 30,
    skill_match_score: 40,
    learning_value_score: 40,
    recommendation_score: 40,
    confidence_score: 30,
    recommendation_reason: 'Basic recommendation based on limited data',
    key_benefits: ['Practice problem'],
    recommendation_type: 'practice',
    priority: 1,
  };
}

/**
 * Get weights based on recommendation type
 */
function getTypeWeights(type) {
  const weights = {
    next_challenge: {
      content: 0.2,
      collaborative: 0.3,
      skill: 0.4,
      learning: 0.1,
    },
    practice: { content: 0.4, collaborative: 0.2, skill: 0.3, learning: 0.1 },
    learning: { content: 0.1, collaborative: 0.1, skill: 0.2, learning: 0.6 },
    review: { content: 0.5, collaborative: 0.1, skill: 0.3, learning: 0.1 },
    mixed: { content: 0.25, collaborative: 0.25, skill: 0.25, learning: 0.25 },
  };
  return weights[type] || weights.mixed;
}

/**
 * Generate human-readable recommendation reason
 */
function generateRecommendationReason(scores, embedding, userProfile) {
  const reasons = [];

  if (scores.skill_match_score > 80) {
    reasons.push('Perfect difficulty match for your current level');
  }

  if (scores.learning_value_score > 70) {
    reasons.push("Teaches concepts you're currently improving");
  }

  if (scores.content_score > 70) {
    reasons.push("Similar to problems you've excelled at");
  }

  if (scores.collaborative_score > 70) {
    reasons.push('Popular among users with similar progress');
  }

  return reasons.join('. ') || 'Recommended based on your profile';
}

/**
 * Generate key benefits
 */
function generateKeyBenefits(embedding, userProfile) {
  const benefits = [];

  if (embedding?.teaches_concepts?.length > 0) {
    benefits.push(
      `Learn: ${embedding.teaches_concepts.slice(0, 2).join(', ')}`
    );
  }

  if (embedding?.main_category) {
    benefits.push(`Category: ${embedding.main_category}`);
  }

  if (embedding?.creativity_score > 7) {
    benefits.push('Requires creative thinking');
  }

  return benefits.slice(0, 3);
}

/**
 * Determine recommendation type
 */
function determineRecommendationType(scores, embedding, userProfile) {
  if (scores.skill_match_score > 80 && scores.learning_value_score > 70) {
    return 'next_challenge';
  }
  if (scores.learning_value_score > 80) {
    return 'learning';
  }
  if (scores.content_score > 80) {
    return 'practice';
  }
  return 'practice';
}

/**
 * Calculate confidence
 */
function calculateConfidence(scores) {
  const avg =
    (scores.content_score +
      scores.collaborative_score +
      scores.skill_match_score +
      scores.learning_value_score) /
    4;
  return Math.min(100, avg);
}

/**
 * Calculate priority
 */
function calculatePriority(score, type) {
  const typePriority = {
    next_challenge: 3,
    learning: 2,
    practice: 1,
    review: 0,
  };
  return Math.floor((score / 100) * 10) + (typePriority[type] || 0);
}

/**
 * Apply diversity filter to avoid recommending too similar problems
 */
function applyDiversityFilter(scoredProblems, limit) {
  const selected = [];
  const categoryCounts = {};
  const maxPerCategory = Math.ceil(limit / 3);

  for (const problem of scoredProblems) {
    if (selected.length >= limit) break;

    const category = problem.problem.embedding?.[0]?.main_category || 'General';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    if (categoryCounts[category] <= maxPerCategory) {
      selected.push(problem);
    }
  }

  for (const problem of scoredProblems) {
    if (selected.length >= limit) break;
    if (!selected.includes(problem)) {
      selected.push(problem);
    }
  }

  return selected;
}

/**
 * Cache recommendations
 */
async function cacheRecommendations(supabase, userId, recommendations) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const cacheData = recommendations.map((rec) => ({
      user_id: userId,
      problem_id: rec.problem_uuid,
      recommendation_score: rec.recommendation_score,
      confidence_score: rec.confidence_score,
      content_score: rec.content_score,
      collaborative_score: rec.collaborative_score,
      skill_match_score: rec.skill_match_score,
      learning_value_score: rec.learning_value_score,
      recommendation_reason: rec.recommendation_reason,
      key_benefits: rec.key_benefits,
      recommendation_type: rec.recommendation_type,
      priority: rec.priority,
      expires_at: expiresAt.toISOString(),
    }));

    await supabaseAdmin.from('problem_recommendations').upsert(cacheData, {
      onConflict: 'user_id,problem_id',
    });
  } catch (error) {
    console.warn('Error caching recommendations:', error.message);
  }
}

/**
 * Create user profile
 */
async function createUserProfile(supabase, userId, solvedProblems) {
  const profile = {
    user_id: userId,
    total_problems_solved: solvedProblems?.length || 0,
    preferred_difficulty_range: '[1200,1600]',
    strong_concepts: [],
    weak_concepts: [],
    improving_concepts: [],
    preferred_categories: [],
    current_focus_areas: [],
  };

  const { data } = await supabase
    .from('user_problem_profiles')
    .insert(profile)
    .select()
    .single();

  return data || profile;
}
