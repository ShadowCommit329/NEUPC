/**
 * @file Community Solutions API
 * @description Fetch other members' solutions for a specific problem
 *
 * GET /api/problem-solving/community?problemId=xxx&platform=xxx
 * Returns solutions from other members who solved the same problem
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

function firstOf(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function buildCommunityResponse(flatSolutions, totalSolutions, limit, offset) {
  const uniqueMemberCount = new Set(flatSolutions.map((s) => s.user_id)).size;

  const solutionsByUser = {};
  const approachStats = {};
  const complexityStats = {
    time: {},
    space: {},
  };

  flatSolutions.forEach((solution) => {
    if (!solutionsByUser[solution.user_id]) {
      solutionsByUser[solution.user_id] = {
        user_id: solution.user_id,
        username: solution.username,
        avatar: solution.avatar,
        solutions: [],
      };
    }

    solutionsByUser[solution.user_id].solutions.push({
      id: solution.id,
      language: solution.language,
      time_complexity: solution.time_complexity,
      space_complexity: solution.space_complexity,
      topics: solution.topics,
      approach: solution.approach,
      submission_time: solution.submission_time,
      created_at: solution.created_at,
    });

    const approach = solution.approach || 'Unknown';
    approachStats[approach] = (approachStats[approach] || 0) + 1;

    if (solution.time_complexity) {
      complexityStats.time[solution.time_complexity] =
        (complexityStats.time[solution.time_complexity] || 0) + 1;
    }

    if (solution.space_complexity) {
      complexityStats.space[solution.space_complexity] =
        (complexityStats.space[solution.space_complexity] || 0) + 1;
    }
  });

  const sortedApproaches = Object.entries(approachStats)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return {
    success: true,
    data: {
      members: Object.values(solutionsByUser),
      stats: {
        totalSolutions,
        uniqueMembers: uniqueMemberCount,
        approaches: sortedApproaches,
        complexityDistribution: complexityStats,
      },
      pagination: {
        limit,
        offset,
        total: totalSolutions,
        hasMore: offset + limit < totalSolutions,
      },
    },
  };
}

export async function GET(request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    const platform = searchParams.get('platform');
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '10'), 1),
      100
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    if (!problemId || !platform) {
      return NextResponse.json(
        { error: 'problemId and platform are required' },
        { status: 400 }
      );
    }

    const useV2 = await isV2SchemaAvailable();

    if (useV2) {
      const platformId = await getPlatformId(platform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${platform}` },
          { status: 400 }
        );
      }

      const { data: targetProblem, error: problemError } = await supabase
        .from(V2_TABLES.PROBLEMS)
        .select('id')
        .eq('platform_id', platformId)
        .eq('external_id', problemId)
        .maybeSingle();

      if (problemError) {
        console.error(
          'Error resolving problem for community query:',
          problemError
        );
        return NextResponse.json(
          { error: 'Failed to fetch community solutions' },
          { status: 500 }
        );
      }

      if (!targetProblem?.id) {
        return NextResponse.json(buildCommunityResponse([], 0, limit, offset));
      }

      const { data: solutions, error: solutionsError } = await supabase
        .from(V2_TABLES.SOLUTIONS)
        .select(
          `
          id,
          created_at,
          languages(code, name),
          submissions(submitted_at),
          solution_analysis(
            approach_name,
            approach_explanation,
            time_complexity,
            space_complexity,
            techniques_used
          ),
          user_solves!inner(
            user_id,
            problem_id,
            users!inner(
              id,
              name,
              image,
              email
            )
          )
        `
        )
        .eq('user_solves.problem_id', targetProblem.id)
        .neq('user_solves.user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (solutionsError) {
        console.error('Error fetching community solutions:', solutionsError);
        return NextResponse.json(
          { error: 'Failed to fetch community solutions' },
          { status: 500 }
        );
      }

      const { count, error: countError } = await supabase
        .from(V2_TABLES.SOLUTIONS)
        .select('id, user_solves!inner(user_id, problem_id)', {
          count: 'exact',
          head: true,
        })
        .eq('user_solves.problem_id', targetProblem.id)
        .neq('user_solves.user_id', session.user.id);

      if (countError) {
        console.error('Error counting community solutions:', countError);
      }

      const flatSolutions = (solutions || [])
        .map((solution) => {
          const userSolve = firstOf(solution.user_solves);
          const user = firstOf(userSolve?.users);
          const analysis = firstOf(solution.solution_analysis);
          const submission = firstOf(solution.submissions);

          const userId = user?.id || userSolve?.user_id;
          if (!userId) return null;

          return {
            user_id: userId,
            username: user?.name || 'Anonymous',
            avatar: user?.image || null,
            id: solution.id,
            language:
              solution.languages?.code || solution.languages?.name || null,
            time_complexity: analysis?.time_complexity || null,
            space_complexity: analysis?.space_complexity || null,
            topics: analysis?.techniques_used || [],
            approach:
              analysis?.approach_name || analysis?.approach_explanation || null,
            submission_time: submission?.submitted_at || null,
            created_at: solution.created_at,
          };
        })
        .filter(Boolean);

      return NextResponse.json(
        buildCommunityResponse(flatSolutions, count || 0, limit, offset)
      );
    }

    // Legacy fallback
    const { data: solutions, error: solutionsError } = await supabase
      .from('problem_solutions')
      .select(
        `
        id,
        user_id,
        problem_id,
        platform,
        problem_name,
        language,
        time_complexity,
        space_complexity,
        topics,
        analysis_data,
        submission_time,
        created_at,
        users!inner (
          id,
          name,
          image,
          email
        )
      `
      )
      .eq('problem_id', problemId)
      .eq('platform', platform)
      .neq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (solutionsError) {
      console.error(
        'Error fetching legacy community solutions:',
        solutionsError
      );
      return NextResponse.json(
        { error: 'Failed to fetch community solutions' },
        { status: 500 }
      );
    }

    const { count, error: countError } = await supabase
      .from('problem_solutions')
      .select('id', { count: 'exact', head: true })
      .eq('problem_id', problemId)
      .eq('platform', platform)
      .neq('user_id', session.user.id);

    if (countError) {
      console.error('Error counting legacy community solutions:', countError);
    }

    const flatSolutions = (solutions || [])
      .map((solution) => ({
        user_id: solution.users?.id || solution.user_id,
        username: solution.users?.name || 'Anonymous',
        avatar: solution.users?.image || null,
        id: solution.id,
        language: solution.language || null,
        time_complexity: solution.time_complexity || null,
        space_complexity: solution.space_complexity || null,
        topics: solution.topics || [],
        approach:
          solution.analysis_data?.approach ||
          solution.analysis_data?.userApproach?.name ||
          null,
        submission_time: solution.submission_time || null,
        created_at: solution.created_at,
      }))
      .filter((solution) => !!solution.user_id);

    return NextResponse.json(
      buildCommunityResponse(flatSolutions, count || 0, limit, offset)
    );
  } catch (error) {
    console.error('Community solutions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
