/**
 * Problem Solving API - User Profile Endpoint
 * GET /api/problem-solving/user/[id] - Get user's problem solving profile
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Validate user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user data in parallel
    const [
      handlesResult,
      statsResult,
      recentSolvesResult,
      dailyActivityResult,
      badgesResult,
      leaderboardResult,
      platformStatsResult,
      tagStatsResult,
      ratingHistoryResult,
      contestHistoryResult,
    ] = await Promise.all([
      // User handles with platform info
      supabaseAdmin
        .from(V2_TABLES.USER_HANDLES)
        .select(
          `
          id,
          handle,
          is_verified,
          current_rating,
          max_rating,
          rank_title,
          avatar_url,
          last_synced_at,
          platforms!inner(code, name)
        `
        )
        .eq('user_id', id),

      // User statistics
      supabaseAdmin
        .from(V2_TABLES.USER_STATS)
        .select('*')
        .eq('user_id', id)
        .single(),

      // Recent solves (last 10)
      supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select(
          `
          id,
          first_solved_at,
          solve_count,
          is_favorite,
          problems!inner(
            id, external_id, name, url, difficulty_rating,
            platforms!inner(code, name)
          )
        `
        )
        .eq('user_id', id)
        .order('first_solved_at', { ascending: false })
        .limit(10),

      // Daily activity (last 365 days)
      supabaseAdmin
        .from(V2_TABLES.USER_DAILY_ACTIVITY)
        .select('activity_date, problems_solved, submissions_count')
        .eq('user_id', id)
        .gte(
          'activity_date',
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        )
        .order('activity_date', { ascending: true }),

      // User badges
      supabaseAdmin
        .from(V2_TABLES.USER_BADGES)
        .select(
          `
          id,
          earned_at,
          metadata,
          badge_definitions!inner(code, name, description, icon, category, points)
        `
        )
        .eq('user_id', id)
        .order('earned_at', { ascending: false }),

      // Leaderboard position
      supabaseAdmin
        .from(V2_TABLES.LEADERBOARD_CACHE)
        .select(
          'global_rank, weekly_rank, monthly_rank, total_score, weekly_score, monthly_score'
        )
        .eq('user_id', id)
        .single(),

      // Platform-specific stats
      supabaseAdmin
        .from(V2_TABLES.USER_PLATFORM_STATS)
        .select(
          `
          problems_solved,
          submissions_count,
          current_rating,
          max_rating,
          contests_participated,
          platforms!inner(code, name)
        `
        )
        .eq('user_id', id),

      // Tag/topic stats (top 10 by problems solved)
      supabaseAdmin
        .from(V2_TABLES.USER_TAG_STATS)
        .select(
          `
          problems_solved,
          problems_attempted,
          avg_difficulty,
          mastery_level,
          tags!inner(code, name, category)
        `
        )
        .eq('user_id', id)
        .order('problems_solved', { ascending: false })
        .limit(10),

      // Rating history (last 50 entries)
      supabaseAdmin
        .from(V2_TABLES.RATING_HISTORY)
        .select(
          `
          rating,
          rating_change,
          recorded_at,
          platforms!inner(code, name)
        `
        )
        .eq('user_id', id)
        .order('recorded_at', { ascending: false })
        .limit(50),

      // Contest history (last 20)
      supabaseAdmin
        .from(V2_TABLES.CONTEST_HISTORY)
        .select('*')
        .eq('user_id', id)
        .order('contest_date', { ascending: false })
        .limit(20),
    ]);

    // Transform handles data
    const handles = (handlesResult.data || []).map((h) => ({
      id: h.id,
      platform: h.platforms?.code,
      platform_name: h.platforms?.name,
      handle: h.handle,
      is_verified: h.is_verified,
      current_rating: h.current_rating,
      max_rating: h.max_rating,
      rank_title: h.rank_title,
      avatar_url: h.avatar_url,
      last_synced_at: h.last_synced_at,
    }));

    // Transform recent solves
    const recentSolves = (recentSolvesResult.data || []).map((s) => ({
      id: s.id,
      platform: s.problems?.platforms?.code,
      platform_name: s.problems?.platforms?.name,
      problem_id: s.problems?.external_id,
      problem_name: s.problems?.name,
      problem_url: s.problems?.url,
      difficulty_rating: s.problems?.difficulty_rating,
      first_solved_at: s.first_solved_at,
      solve_count: s.solve_count,
      is_favorite: s.is_favorite,
    }));

    // Transform badges
    const badges = (badgesResult.data || []).map((b) => ({
      id: b.id,
      code: b.badge_definitions?.code,
      name: b.badge_definitions?.name,
      description: b.badge_definitions?.description,
      icon: b.badge_definitions?.icon,
      category: b.badge_definitions?.category,
      points: b.badge_definitions?.points,
      earned_at: b.earned_at,
      metadata: b.metadata,
    }));

    // Transform platform stats
    const platformStats = (platformStatsResult.data || []).map((ps) => ({
      platform: ps.platforms?.code,
      platform_name: ps.platforms?.name,
      problems_solved: ps.problems_solved,
      submissions_count: ps.submissions_count,
      current_rating: ps.current_rating,
      max_rating: ps.max_rating,
      contests_participated: ps.contests_participated,
    }));

    // Transform tag stats
    const tagStats = (tagStatsResult.data || []).map((ts) => ({
      tag: ts.tags?.code,
      name: ts.tags?.name,
      category: ts.tags?.category,
      problems_solved: ts.problems_solved,
      problems_attempted: ts.problems_attempted,
      avg_difficulty: ts.avg_difficulty,
      mastery_level: ts.mastery_level,
    }));

    // Transform rating history
    const ratingHistory = (ratingHistoryResult.data || []).map((rh) => ({
      platform: rh.platforms?.code,
      rating: rh.rating,
      rating_change: rh.rating_change,
      recorded_at: rh.recorded_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: user.id,
          name: user.name,
          avatar: user.avatar_url,
        },
        handles,
        statistics: statsResult.data || null,
        platformStats,
        tagStats,
        recentSolves,
        dailyActivity: dailyActivityResult.data || [],
        badges,
        leaderboard: leaderboardResult.data || null,
        ratingHistory,
        contestHistory: contestHistoryResult.data || [],
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}
