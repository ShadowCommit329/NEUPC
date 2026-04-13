/**
 * @file Daily Tasks Cron Job
 * @module DailyTasksCron
 *
 * Runs daily maintenance tasks:
 * - Reset weekly/monthly counters
 * - Award badges
 * - Clean up old data
 * - Update streaks
 *
 * Runs once daily at midnight UTC.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/_lib/supabase';
import {
  isV2SchemaAvailable,
  V2_TABLES,
} from '@/app/_lib/problem-solving-v2-helpers';

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

// Badge definitions with conditions
const BADGE_DEFINITIONS = [
  { id: 'first_solve', condition: (s) => s.total_solved >= 1 },
  { id: 'solved_10', condition: (s) => s.total_solved >= 10 },
  { id: 'solved_50', condition: (s) => s.total_solved >= 50 },
  { id: 'solved_100', condition: (s) => s.total_solved >= 100 },
  { id: 'solved_500', condition: (s) => s.total_solved >= 500 },
  { id: 'solved_1000', condition: (s) => s.total_solved >= 1000 },
  { id: 'streak_7', condition: (s) => s.longest_streak >= 7 },
  { id: 'streak_30', condition: (s) => s.longest_streak >= 30 },
  { id: 'streak_100', condition: (s) => s.longest_streak >= 100 },
  { id: 'hard_10', condition: (s) => s.hard_solved >= 10 },
  { id: 'hard_50', condition: (s) => s.hard_solved >= 50 },
  { id: 'expert_10', condition: (s) => s.expert_solved >= 10 },
];

async function updateStreaks() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Get all users with their yesterday's activity
  const { data: users } = await supabaseAdmin
    .from('user_statistics')
    .select('user_id, current_streak, longest_streak');

  if (!users) return { updated: 0, broken: 0 };

  let updated = 0;
  let broken = 0;

  for (const user of users) {
    // Check if user solved anything yesterday
    const { data: activity } = await supabaseAdmin
      .from('daily_activity')
      .select('problems_solved')
      .eq('user_id', user.user_id)
      .eq('activity_date', yesterdayStr)
      .single();

    if (activity && activity.problems_solved > 0) {
      // Streak continues or increments (handled by sync)
      updated++;
    } else if (user.current_streak > 0) {
      // Streak broken - reset current streak
      await supabaseAdmin
        .from('user_statistics')
        .update({ current_streak: 0 })
        .eq('user_id', user.user_id);
      broken++;
    }
  }

  return { updated, broken };
}

async function awardBadges() {
  // Check if V2 schema is available, otherwise use V1
  const useV2 = await isV2SchemaAvailable();
  const statsTable = useV2 ? V2_TABLES.USER_STATS : 'user_statistics';

  // Get all user statistics
  const { data: allStats } = await supabaseAdmin.from(statsTable).select('*');

  if (!allStats) return { awarded: 0 };

  let awarded = 0;

  for (const stats of allStats) {
    // Get existing badges for this user
    const { data: existingBadges } = await supabaseAdmin
      .from('user_badges')
      .select('badge')
      .eq('user_id', stats.user_id);

    const existingBadgeIds = new Set(
      (existingBadges || []).map((b) => b.badge)
    );

    // Check each badge definition
    for (const badgeDef of BADGE_DEFINITIONS) {
      if (!existingBadgeIds.has(badgeDef.id) && badgeDef.condition(stats)) {
        // Award badge
        await supabaseAdmin.from('user_badges').insert({
          user_id: stats.user_id,
          badge: badgeDef.id,
          earned_at: new Date().toISOString(),
        });
        awarded++;
      }
    }
  }

  return { awarded };
}

async function resetWeeklyCounters() {
  const today = new Date();
  // Reset on Monday (day 1)
  if (today.getDay() !== 1) return { reset: false };

  const { error } = await supabaseAdmin
    .from('user_statistics')
    .update({ solved_this_week: 0 });

  return { reset: !error };
}

async function resetMonthlyCounters() {
  const today = new Date();
  // Reset on 1st of month
  if (today.getDate() !== 1) return { reset: false };

  const { error } = await supabaseAdmin
    .from('user_statistics')
    .update({ solved_this_month: 0 });

  return { reset: !error };
}

async function cleanupOldData() {
  // Clean up API cache older than 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('api_cache')
    .delete()
    .lt('cached_at', weekAgo);

  return { cacheDeleted: count || 0 };
}

export async function GET(request) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {};

    // Run all daily tasks
    results.streaks = await updateStreaks();
    results.badges = await awardBadges();
    results.weeklyReset = await resetWeeklyCounters();
    results.monthlyReset = await resetMonthlyCounters();
    results.cleanup = await cleanupOldData();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Daily tasks completed',
      results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Cron daily-tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
