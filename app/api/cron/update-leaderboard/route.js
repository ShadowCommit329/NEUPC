/**
 * @file Update Leaderboard Cron Job
 * @module UpdateLeaderboardCron
 *
 * Rebuilds the leaderboard cache with current rankings.
 * Runs every hour.
 *
 * Uses the new normalized schema (user_stats, leaderboard_cache).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { V2_TABLES } from '@/app/_lib/problem-solving-v2-helpers';

// Verify cron secret for security
function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Get all user statistics from the new schema
    const { data: users, error: usersError } = await supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select(
        'user_id, total_solved, weighted_score, solved_this_week, solved_this_month'
      )
      .gt('total_solved', 0)
      .order('weighted_score', { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to rank',
        updated: 0,
      });
    }

    // Calculate rankings
    const leaderboardEntries = users.map((user, index) => ({
      user_id: user.user_id,
      global_rank: index + 1,
      total_score: user.weighted_score || 0,
      total_solved: user.total_solved || 0,
      weekly_solved: user.solved_this_week || 0,
      monthly_solved: user.solved_this_month || 0,
      updated_at: new Date().toISOString(),
    }));

    // Sort by weekly and monthly for those ranks
    const weeklyRanked = [...users].sort(
      (a, b) => (b.solved_this_week || 0) - (a.solved_this_week || 0)
    );
    const monthlyRanked = [...users].sort(
      (a, b) => (b.solved_this_month || 0) - (a.solved_this_month || 0)
    );

    leaderboardEntries.forEach((entry) => {
      const weeklyIdx = weeklyRanked.findIndex(
        (u) => u.user_id === entry.user_id
      );
      const monthlyIdx = monthlyRanked.findIndex(
        (u) => u.user_id === entry.user_id
      );

      entry.weekly_rank = weeklyIdx >= 0 ? weeklyIdx + 1 : null;
      entry.monthly_rank = monthlyIdx >= 0 ? monthlyIdx + 1 : null;
      entry.weekly_score = weeklyRanked[weeklyIdx]?.solved_this_week || 0;
      entry.monthly_score = monthlyRanked[monthlyIdx]?.solved_this_month || 0;
    });

    // Upsert leaderboard entries using new table
    const { error: upsertError } = await supabaseAdmin
      .from(V2_TABLES.LEADERBOARD_CACHE)
      .upsert(leaderboardEntries, { onConflict: 'user_id' });

    if (upsertError) {
      throw new Error(`Failed to update leaderboard: ${upsertError.message}`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Leaderboard updated successfully',
      updated: leaderboardEntries.length,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Cron update-leaderboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
