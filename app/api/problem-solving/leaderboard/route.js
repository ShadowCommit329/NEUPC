/**
 * Problem Solving API - Leaderboard Endpoint
 * GET /api/problem-solving/leaderboard
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const type = searchParams.get('type') || 'global'; // global, weekly, monthly
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Determine sort column based on type
    const sortColumn =
      {
        global: 'global_rank',
        weekly: 'weekly_rank',
        monthly: 'monthly_rank',
      }[type] || 'global_rank';

    const scoreColumn =
      {
        global: 'total_score',
        weekly: 'weekly_score',
        monthly: 'monthly_score',
      }[type] || 'total_score';

    // Fetch leaderboard with user profiles
    const {
      data: leaderboard,
      error,
      count,
    } = await supabaseAdmin
      .from(V2_TABLES.LEADERBOARD_CACHE)
      .select(
        `
        *,
        users!inner(
          id,
          name,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .not(sortColumn, 'is', null)
      .order(sortColumn, { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get current user's rank if authenticated
    let currentUserRank = null;
    const session = await auth();

    if (session?.user?.email) {
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (dbUser) {
        const { data: userRank } = await supabaseAdmin
          .from(V2_TABLES.LEADERBOARD_CACHE)
          .select('*')
          .eq('user_id', dbUser.id)
          .single();

        currentUserRank = userRank;
      }
    }

    // Format response
    const formattedLeaderboard = (leaderboard || []).map((entry) => ({
      rank: entry[sortColumn],
      userId: entry.user_id,
      name: entry.users?.name || 'Unknown',
      avatar: entry.users?.avatar_url,
      score: entry[scoreColumn],
      totalSolved: entry.total_solved,
      weeklySolved: entry.weekly_solved,
      monthlySolved: entry.monthly_solved,
    }));

    return NextResponse.json({
      success: true,
      data: {
        type,
        leaderboard: formattedLeaderboard,
        currentUser: currentUserRank
          ? {
              rank: currentUserRank[sortColumn],
              score: currentUserRank[scoreColumn],
              totalSolved: currentUserRank.total_solved,
            }
          : null,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: offset + limit < (count || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
