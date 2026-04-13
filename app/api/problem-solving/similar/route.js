import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

/**
 * GET /api/problem-solving/similar?problem_id=xxx&platform=xxx
 * Find similar problems based on tags, difficulty, and user's solved problems
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const problem_id = searchParams.get('problem_id');
    const platform = searchParams.get('platform');

    if (!problem_id || !platform) {
      return NextResponse.json(
        { error: 'Missing problem_id or platform' },
        { status: 400 }
      );
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platform}` },
        { status: 400 }
      );
    }

    // Resolve current problem (normalized schema)
    const { data: currentProblem, error: currentProblemError } = await supabase
      .from(V2_TABLES.PROBLEMS)
      .select(
        `
        id,
        platform_id,
        external_id,
        name,
        url,
        difficulty_rating,
        difficulty_tiers(code),
        platforms(code)
      `
      )
      .eq('platform_id', platformId)
      .eq('external_id', problem_id)
      .single();

    if (currentProblemError || !currentProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Fetch tags for current problem
    const { data: currentProblemTags } = await supabase
      .from(V2_TABLES.PROBLEM_TAGS)
      .select(
        `
        problem_id,
        tags!inner(code)
      `
      )
      .eq('problem_id', currentProblem.id);

    const currentTags = (currentProblemTags || [])
      .map((row) => row.tags?.code)
      .filter(Boolean);

    const normalizedProblem = {
      problem_id: currentProblem.external_id,
      problem_name: currentProblem.name,
      problem_url: currentProblem.url,
      difficulty_rating: currentProblem.difficulty_rating,
      difficulty_tier: currentProblem.difficulty_tiers?.code || null,
      tags: currentTags,
      platform: currentProblem.platforms?.code || platform.toLowerCase(),
    };

    const tags = normalizedProblem.tags || [];
    const difficulty = normalizedProblem.difficulty_tier;
    const rating = normalizedProblem.difficulty_rating;

    // Find similar problems from user's solved problems (normalized schema)
    const { data: allUserSolves, error: userProblemsError } = await supabase
      .from(V2_TABLES.USER_SOLVES)
      .select(
        `
        id,
        problem_id,
        problems!inner(
          id,
          external_id,
          name,
          url,
          difficulty_rating,
          difficulty_tiers(code),
          platforms(code)
        )
      `
      )
      .eq('user_id', session.user.id)
      .neq('problem_id', currentProblem.id)
      .limit(100);

    if (userProblemsError) {
      console.error('Error fetching user problems:', userProblemsError);
      return NextResponse.json(
        { error: 'Failed to fetch similar problems' },
        { status: 500 }
      );
    }

    const problemUuids = (allUserSolves || [])
      .map((s) => s.problems?.id)
      .filter(Boolean);

    // Fetch tags for candidate problems
    const { data: candidateTags } = problemUuids.length
      ? await supabase
          .from(V2_TABLES.PROBLEM_TAGS)
          .select(
            `
            problem_id,
            tags!inner(code)
          `
          )
          .in('problem_id', problemUuids)
      : { data: [] };

    const tagsByProblem = {};
    (candidateTags || []).forEach((row) => {
      if (!tagsByProblem[row.problem_id]) tagsByProblem[row.problem_id] = [];
      if (row.tags?.code) tagsByProblem[row.problem_id].push(row.tags.code);
    });

    // Normalize all user problems
    const normalizedUserProblems = (allUserSolves || [])
      .map((solve) => {
        const p = solve.problems;
        if (!p) return null;
        return {
          problem_id: p.external_id,
          problem_name: p.name,
          problem_url: p.url,
          difficulty_rating: p.difficulty_rating,
          difficulty_tier: p.difficulty_tiers?.code || null,
          tags: tagsByProblem[p.id] || [],
          platform: p.platforms?.code || null,
        };
      })
      .filter(Boolean);

    // Score and rank similar problems
    const scoredProblems = normalizedUserProblems.map((p) => {
      let score = 0;

      // Tag similarity (most important)
      const problemTags = p.tags || [];
      const commonTags = tags.filter((t) => problemTags.includes(t));
      score += commonTags.length * 30;

      // Difficulty tier match
      if (p.difficulty_tier === difficulty) {
        score += 20;
      }

      // Rating proximity (within 200)
      if (rating && p.difficulty_rating) {
        const ratingDiff = Math.abs(rating - p.difficulty_rating);
        if (ratingDiff <= 100) score += 15;
        else if (ratingDiff <= 200) score += 10;
        else if (ratingDiff <= 300) score += 5;
      }

      // Same platform bonus
      if (p.platform === platform.toLowerCase()) {
        score += 5;
      }

      return {
        ...p,
        similarity_score: score,
        common_tags: commonTags,
      };
    });

    // Sort by score and take top 10
    const similarProblems = scoredProblems
      .filter((p) => p.similarity_score > 0)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10);

    // Generate suggestions based on tags (problems you might want to solve next)
    const suggestions = generateSuggestions(normalizedProblem, tags);

    return NextResponse.json({
      similar: similarProblems,
      suggestions,
      currentProblem: {
        problem_id: normalizedProblem.problem_id,
        problem_name: normalizedProblem.problem_name,
        tags,
        difficulty_tier: difficulty,
        difficulty_rating: rating,
      },
    });
  } catch (error) {
    console.error('Similar problems error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate suggestions for problems to solve next
 * This is a simplified version - in production, you might use
 * a recommendation engine or external API
 */
function generateSuggestions(currentProblem, tags) {
  const rating = currentProblem.difficulty_rating || 1200;

  // Generate suggested problem areas based on tags
  const suggestions = [];

  // Suggest slightly harder problems
  const nextRating = Math.min(rating + 100, 3500);

  // Map common tags to suggested topics
  const tagSuggestions = {
    dp: ['bitmask dp', 'digit dp', 'tree dp'],
    'dynamic programming': ['bitmask dp', 'digit dp', 'tree dp'],
    graphs: ['shortest paths', 'flow', 'bipartite matching'],
    greedy: ['exchange argument', 'interval scheduling'],
    'binary search': ['ternary search', 'parallel binary search'],
    strings: ['suffix array', 'z-function', 'aho-corasick'],
    trees: ['heavy-light decomposition', 'centroid decomposition'],
    math: ['number theory', 'combinatorics', 'probability'],
  };

  // Find relevant suggestions based on tags
  tags.forEach((tag) => {
    const lowerTag = tag.toLowerCase();
    Object.keys(tagSuggestions).forEach((key) => {
      if (lowerTag.includes(key)) {
        suggestions.push(...tagSuggestions[key]);
      }
    });
  });

  // Dedupe and limit
  const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);

  return {
    nextDifficulty: nextRating,
    relatedTopics: uniqueSuggestions,
    tip:
      tags.length > 0
        ? `Based on "${tags[0]}", try exploring related techniques`
        : 'Try solving problems with similar difficulty rating',
  };
}
