/**
 * Problem Solving Data Extraction Utility
 *
 * This module provides functions to extract all-time problem solving statistics
 * from all supported platforms for users in the system.
 */

import { supabaseAdmin } from './supabase.js';
import ProblemSolvingAggregator from './problem-solving-services.js';
import {
  V2_TABLES,
  getUserSolvesV2,
  getUserSubmissionsV2,
  getUserStatsV2,
  getUserHandlesV2,
  getPlatformId,
} from './problem-solving-v2-helpers.js';

const aggregator = new ProblemSolvingAggregator();

/**
 * Helper function to get student IDs for multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Map>} Map of userId to student_id
 */
async function getStudentIds(userIds) {
  if (!userIds || userIds.length === 0) return new Map();

  const { data } = await supabaseAdmin
    .from('member_profiles')
    .select('user_id, student_id')
    .in('user_id', userIds);

  return new Map((data || []).map((p) => [p.user_id, p.student_id]));
}

/**
 * Extract all-time problem solving data for a single user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete user problem solving data
 */
export async function extractUserAllTimeData(userId) {
  try {
    // Fetch user info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Fetch member profile (for student_id)
    const { data: memberProfile } = await supabaseAdmin
      .from('member_profiles')
      .select('student_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch user statistics
    const stats = await getUserStatsV2(userId);

    // Fetch connected handles
    const handles = await getUserHandlesV2(userId);

    // Fetch all submissions
    const submissions = await getUserSubmissionsV2(userId, { limit: 10000 });

    // Fetch all unique solves
    const solves = await getUserSolvesV2(userId, { limit: 10000 });

    // Fetch daily activity
    let dailyActivity = [];
    try {
      const { data, error: activityError } = await supabaseAdmin
        .from(V2_TABLES.USER_DAILY_ACTIVITY)
        .select('*')
        .eq('user_id', userId)
        .order('activity_date', { ascending: false });
      dailyActivity = data || [];
    } catch (e) {
      console.log('Activity table may not exist:', e.message);
    }

    // Fetch platform stats (live from APIs)
    let platformStats = stats?.platform_stats || {};
    try {
      // Refresh platform stats from live APIs
      platformStats = await aggregator.getPlatformStats(userId);
    } catch (error) {
      console.error('Error fetching live platform stats:', error.message);
      // Use cached stats from database
      platformStats = stats?.platform_stats || {};
    }

    // Calculate aggregate statistics
    const aggregateStats = calculateAggregateStats(submissions, solves);

    // Group data by platform
    const platformBreakdown = groupByPlatform(submissions, solves, handles);

    return {
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        student_id: memberProfile?.student_id || null,
      },
      summary: {
        total_solved: stats?.total_solved || 0,
        total_submissions: stats?.total_submissions || 0,
        acceptance_rate: stats?.acceptance_rate || 0,
        current_streak: stats?.current_streak || 0,
        longest_streak: stats?.longest_streak || 0,
        weighted_score: stats?.weighted_score || 0,
        difficulty_breakdown: {
          easy: stats?.easy_solved || 0,
          medium: stats?.medium_solved || 0,
          hard: stats?.hard_solved || 0,
          expert: stats?.expert_solved || 0,
        },
        last_updated: stats?.last_updated || stats?.updated_at || null,
      },
      platform_stats: platformStats,
      connected_handles: handles || [],
      aggregate_stats: aggregateStats,
      platform_breakdown: platformBreakdown,
      submissions: submissions || [],
      unique_solves: solves || [],
      daily_activity: dailyActivity || [],
      metadata: {
        extracted_at: new Date().toISOString(),
        total_platforms: handles?.length || 0,
        verified_platforms: handles?.filter((h) => h.is_verified)?.length || 0,
      },
    };
  } catch (error) {
    console.error('Error extracting user data:', error);
    throw error;
  }
}

/**
 * Extract all-time data for all users in the system
 * @param {Object} options - Extraction options
 * @returns {Promise<Array>} Array of user data
 */
export async function extractAllUsersData(options = {}) {
  const {
    includeInactive = false,
    minSolved = 0,
    platforms = null, // Filter by specific platforms
    limit = null,
  } = options;

  try {
    // Build query for users with problem solving activity
    let query = supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select(
        'user_id, total_solved, users(id, full_name, email, account_status)'
      )
      .gt('total_solved', minSolved)
      .order('total_solved', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: userStats, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const results = [];
    const errors = [];

    for (const userStat of userStats || []) {
      // Skip inactive users if not included
      if (!includeInactive && userStat.users?.account_status !== 'active') {
        continue;
      }

      try {
        const userData = await extractUserAllTimeData(userStat.user_id);

        // Filter by platforms if specified
        if (platforms && platforms.length > 0) {
          const userPlatforms = userData.connected_handles.map(
            (h) => h.platform
          );
          const hasMatchingPlatform = platforms.some((p) =>
            userPlatforms.includes(p)
          );
          if (!hasMatchingPlatform) {
            continue;
          }
        }

        results.push(userData);
      } catch (err) {
        console.error(
          `Error extracting data for user ${userStat.user_id}:`,
          err.message
        );
        errors.push({
          user_id: userStat.user_id,
          error: err.message,
        });
      }
    }

    return {
      success: true,
      extracted_at: new Date().toISOString(),
      total_users: results.length,
      errors: errors.length > 0 ? errors : null,
      data: results,
    };
  } catch (error) {
    console.error('Error extracting all users data:', error);
    throw error;
  }
}

/**
 * Extract data for specific platform across all users
 * @param {string} platform - Platform ID (e.g., 'codeforces', 'leetcode')
 * @returns {Promise<Array>} Array of users with their platform data
 */
export async function extractPlatformData(platform) {
  try {
    // Get all users with handles for this platform
    const platformId = await getPlatformId(platform);
    if (!platformId) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const { data, error: handlesError } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select(`*, users(id, full_name, email), platforms(code, name)`)
      .eq('platform_id', platformId)
      .eq('is_verified', true)
      .order('created_at', { ascending: true });

    if (handlesError) {
      throw new Error(`Failed to fetch handles: ${handlesError.message}`);
    }

    // Transform to include platform code
    const handles = (data || []).map((h) => ({
      ...h,
      platform: h.platforms?.code,
    }));

    // Get student IDs for all users
    const userIds = (handles || []).map((h) => h.user_id);
    const studentIds = await getStudentIds(userIds);

    const results = [];

    for (const handle of handles || []) {
      try {
        // Get user statistics
        const { data: stats } = await supabaseAdmin
          .from(V2_TABLES.USER_STATS)
          .select('*')
          .eq('user_id', handle.user_id)
          .single();

        // Get submissions for this platform
        const submissions = await getUserSubmissionsV2(handle.user_id, {
          platformCode: platform,
          limit: 10000,
        });

        // Get solves for this platform
        const allSolves = await getUserSolvesV2(handle.user_id, {
          limit: 10000,
        });
        const solves = allSolves.filter((s) => s.platform === platform);

        // Get platform-specific stats
        const platformStats = stats?.platform_stats?.[platform] || {};

        results.push({
          user: {
            id: handle.users.id,
            name: handle.users.full_name,
            email: handle.users.email,
            student_id: studentIds.get(handle.user_id) || null,
          },
          handle: handle.handle,
          verified: handle.is_verified,
          connected_at: handle.connected_at || handle.created_at,
          platform_stats: platformStats,
          total_submissions: submissions?.length || 0,
          total_solved: solves?.length || 0,
          submissions: submissions || [],
          solves: solves || [],
        });
      } catch (err) {
        console.error(
          `Error extracting ${platform} data for user ${handle.user_id}:`,
          err.message
        );
      }
    }

    return {
      success: true,
      platform,
      extracted_at: new Date().toISOString(),
      total_users: results.length,
      data: results,
    };
  } catch (error) {
    console.error(`Error extracting ${platform} data:`, error);
    throw error;
  }
}

/**
 * Extract leaderboard data with all-time statistics
 * @param {Object} options - Leaderboard options
 * @returns {Promise<Array>} Sorted leaderboard data
 */
export async function extractLeaderboardData(options = {}) {
  const {
    type = 'overall', // 'overall', 'weekly', 'monthly'
    limit = 100,
  } = options;

  try {
    let query = supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select(`*, users(id, full_name, email, avatar_url)`)
      .gt('total_solved', 0);

    // Sort based on type
    if (type === 'weekly') {
      query = query.order('solved_this_week', { ascending: false });
    } else if (type === 'monthly') {
      query = query.order('solved_this_month', { ascending: false });
    } else {
      query = query.order('weighted_score', { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    // Get student IDs for all users
    const userIds = data.map((item) => item.user_id);
    const studentIds = await getStudentIds(userIds);

    const leaderboard = data.map((item, index) => ({
      rank: index + 1,
      user: {
        id: item.users.id,
        name: item.users.full_name,
        email: item.users.email,
        student_id: studentIds.get(item.user_id) || null,
        avatar_url: item.users.avatar_url,
      },
      stats: {
        total_solved: item.total_solved,
        total_submissions: item.total_submissions,
        acceptance_rate: item.acceptance_rate,
        current_streak: item.current_streak,
        longest_streak: item.longest_streak,
        weighted_score: item.weighted_score,
        difficulty_breakdown: {
          easy: item.easy_solved,
          medium: item.medium_solved,
          hard: item.hard_solved,
          expert: item.expert_solved,
        },
        platform_stats: item.platform_stats || {},
      },
      type_specific_score:
        type === 'weekly'
          ? item.solved_this_week
          : type === 'monthly'
            ? item.solved_this_month
            : item.weighted_score,
    }));

    return {
      success: true,
      type,
      extracted_at: new Date().toISOString(),
      total_entries: leaderboard.length,
      data: leaderboard,
    };
  } catch (error) {
    console.error('Error extracting leaderboard data:', error);
    throw error;
  }
}

/**
 * Calculate aggregate statistics from submissions and solves
 */
function calculateAggregateStats(submissions, solves) {
  const stats = {
    total_submissions: submissions?.length || 0,
    total_solved: solves?.length || 0,
    languages: {},
    verdicts: {},
    tags: {},
    platforms: {},
    difficulty_distribution: {
      easy: 0,
      medium: 0,
      hard: 0,
      expert: 0,
    },
  };

  // Analyze submissions
  submissions?.forEach((sub) => {
    // Count languages
    if (sub.language) {
      stats.languages[sub.language] = (stats.languages[sub.language] || 0) + 1;
    }

    // Count verdicts
    if (sub.verdict) {
      stats.verdicts[sub.verdict] = (stats.verdicts[sub.verdict] || 0) + 1;
    }

    // Count tags
    if (Array.isArray(sub.tags)) {
      sub.tags.forEach((tag) => {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      });
    }

    // Count platforms
    if (sub.platform) {
      stats.platforms[sub.platform] = (stats.platforms[sub.platform] || 0) + 1;
    }
  });

  // Analyze solves
  solves?.forEach((solve) => {
    if (solve.difficulty_tier) {
      stats.difficulty_distribution[solve.difficulty_tier]++;
    }
  });

  return stats;
}

/**
 * Group submissions and solves by platform
 */
function groupByPlatform(submissions, solves, handles) {
  const platformData = {};

  handles?.forEach((handle) => {
    const platform = handle.platform;

    const platformSubmissions =
      submissions?.filter((s) => s.platform === platform) || [];
    const platformSolves = solves?.filter((s) => s.platform === platform) || [];

    platformData[platform] = {
      handle: handle.handle,
      verified: handle.is_verified,
      connected_at: handle.connected_at,
      total_submissions: platformSubmissions.length,
      total_solved: platformSolves.length,
      acceptance_rate:
        platformSubmissions.length > 0
          ? (
              (platformSolves.length / platformSubmissions.length) *
              100
            ).toFixed(2)
          : 0,
      first_submission:
        platformSubmissions[platformSubmissions.length - 1]?.submitted_at ||
        null,
      last_submission: platformSubmissions[0]?.submitted_at || null,
      difficulty_breakdown: {
        easy: platformSolves.filter((s) => s.difficulty_tier === 'easy').length,
        medium: platformSolves.filter((s) => s.difficulty_tier === 'medium')
          .length,
        hard: platformSolves.filter((s) => s.difficulty_tier === 'hard').length,
        expert: platformSolves.filter((s) => s.difficulty_tier === 'expert')
          .length,
      },
    };
  });

  return platformData;
}

/**
 * Export data to CSV format
 * @param {Array} data - Array of user data
 * @param {string} type - Export type ('summary', 'detailed', 'leaderboard')
 * @returns {string} CSV string
 */
export function exportToCSV(data, type = 'summary') {
  if (!data || data.length === 0) {
    return '';
  }

  let headers = [];
  let rows = [];

  if (type === 'leaderboard') {
    headers = [
      'Rank',
      'Name',
      'Email',
      'Student ID',
      'Total Solved',
      'Weighted Score',
      'Acceptance Rate',
      'Current Streak',
      'Longest Streak',
      'Easy',
      'Medium',
      'Hard',
      'Expert',
    ];

    rows = data.map((item) => [
      item.rank,
      item.user.name,
      item.user.email,
      item.user.student_id || '',
      item.stats.total_solved,
      item.stats.weighted_score,
      item.stats.acceptance_rate,
      item.stats.current_streak,
      item.stats.longest_streak,
      item.stats.difficulty_breakdown.easy,
      item.stats.difficulty_breakdown.medium,
      item.stats.difficulty_breakdown.hard,
      item.stats.difficulty_breakdown.expert,
    ]);
  } else if (type === 'summary') {
    headers = [
      'User ID',
      'Name',
      'Email',
      'Student ID',
      'Total Solved',
      'Total Submissions',
      'Acceptance Rate',
      'Current Streak',
      'Longest Streak',
      'Weighted Score',
      'Easy',
      'Medium',
      'Hard',
      'Expert',
      'Connected Platforms',
    ];

    rows = data.map((item) => [
      item.user.id,
      item.user.name,
      item.user.email,
      item.user.student_id || '',
      item.summary.total_solved,
      item.summary.total_submissions,
      item.summary.acceptance_rate,
      item.summary.current_streak,
      item.summary.longest_streak,
      item.summary.weighted_score,
      item.summary.difficulty_breakdown.easy,
      item.summary.difficulty_breakdown.medium,
      item.summary.difficulty_breakdown.hard,
      item.summary.difficulty_breakdown.expert,
      item.connected_handles.map((h) => h.platform).join(', '),
    ]);
  }

  // Escape and quote CSV values
  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  return csvContent;
}
