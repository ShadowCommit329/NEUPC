/**
 * @file Problem Solving - Server Actions
 * @module problem-solving-actions
 *
 * Server actions for problem solving tracking
 */

'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from './supabase';
import { requireRole } from './auth-guard';
import {
  ProblemSolvingAggregator,
  CodeforcesService,
  AtCoderService,
  LeetCodeService,
  TophService,
  CSESService,
  CodeChefService,
  TopCoderService,
  HackerRankService,
  KattisService,
  LightOJService,
  UVAService,
  SPOJService,
  VJudgeService,
  CFGymService,
  CSAcademyService,
  EOlympService,
  USACOService,
  ClistService,
} from './problem-solving-services';
import { ProblemTagService } from './problem-tag-service';
import {
  PROBLEM_SOLVING_PLATFORM_IDS,
  PROBLEM_SOLVING_SYNC_PLATFORM_IDS,
} from './problem-solving-platforms';
import {
  V2_TABLES,
  getPlatformId,
  getUserHandlesV2,
  getUserStatsV2,
  getUserSolvesV2,
  getUserSubmissionsV2,
  upsertUserHandleV2,
  isV2SchemaAvailable,
} from './problem-solving-v2-helpers';

// Use platform registry as the single source of truth
const SUPPORTED_PLATFORMS = PROBLEM_SOLVING_SYNC_PLATFORM_IDS;

// ============================================
// HELPER FUNCTIONS FOR NEW SCHEMA
// ============================================

/**
 * Calculate weighted score based on difficulty distribution
 */
function calculateWeightedScore(stats) {
  if (!stats) return 0;

  const weights = {
    solved_800: 1,
    solved_900: 1.2,
    solved_1000: 1.5,
    solved_1100: 1.8,
    solved_1200: 2,
    solved_1300: 2.5,
    solved_1400: 3,
    solved_1500: 3.5,
    solved_1600: 4,
    solved_1700: 4.5,
    solved_1800: 5,
    solved_1900: 6,
    solved_2000: 7,
    solved_2100: 8,
    solved_2200: 9,
    solved_2300: 10,
    solved_2400: 12,
    solved_2500_plus: 15,
  };

  let totalScore = 0;
  Object.entries(weights).forEach(([key, weight]) => {
    totalScore += (stats[key] || 0) * weight;
  });

  return totalScore;
}

/**
 * Generate daily activity from problem solves
 */
function generateDailyActivity(problemSolves) {
  const activityMap = new Map();

  // Initialize last 365 days with 0
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    activityMap.set(dateKey, {
      activity_date: dateKey,
      problems_solved: 0,
      platforms_active: new Set(),
    });
  }

  // Count solves by date
  problemSolves.forEach((solve) => {
    const solveDate = new Date(solve.first_solved_at);
    const dateKey = solveDate.toISOString().split('T')[0];

    if (activityMap.has(dateKey)) {
      const activity = activityMap.get(dateKey);
      activity.problems_solved += 1;
      const platformCode = solve.problems?.platform;
      if (platformCode) activity.platforms_active.add(platformCode);
    }
  });

  // Convert to array and transform platforms_active to count
  return Array.from(activityMap.values())
    .map((activity) => ({
      ...activity,
      platforms_active: activity.platforms_active.size,
    }))
    .sort((a, b) => a.activity_date.localeCompare(b.activity_date));
}

function parseContestNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return null;

    const rankPart = raw.includes('/') ? raw.split('/')[0].trim() : raw;
    const numeric = rankPart.replace(/[^0-9.-]/g, '');
    if (!numeric) return null;

    const parsed = Number(numeric);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseProblemsPayload(value) {
  if (!value) return null;

  let parsed = value;

  if (typeof parsed === 'string') {
    const raw = parsed.trim();
    if (!raw || raw === '[]' || raw === '{}') return null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  return parsed;
}

function hasAttemptInProblemEntry(problem) {
  if (!problem || typeof problem !== 'object') return false;

  if (problem.attempted === true) return true;
  if (problem.solved === true || problem.solvedDuringContest === true) {
    return true;
  }

  if (problem.time !== null && problem.time !== undefined) return true;

  if (Array.isArray(problem.submissions) && problem.submissions.length > 0) {
    return true;
  }

  const result = problem.result;
  if (typeof result === 'string') {
    const normalized = result.trim();
    if (
      normalized &&
      normalized !== '-' &&
      normalized !== '?' &&
      normalized.toLowerCase() !== 'n/a'
    ) {
      return true;
    }
  } else if (typeof result === 'number' && Number.isFinite(result)) {
    return true;
  }

  return false;
}

function hasAttemptInProblemsPayload(value) {
  const payload = parseProblemsPayload(value);
  if (!payload) return false;

  if (Array.isArray(payload)) {
    return payload.some((problem) => hasAttemptInProblemEntry(problem));
  }

  if (typeof payload === 'object') {
    return Object.values(payload).some((problem) =>
      hasAttemptInProblemEntry(problem)
    );
  }

  return false;
}

function hasContestParticipation(record) {
  if (!record) return false;

  const attempted = parseContestNumber(
    record.problems_attempted ?? record.problemsAttempted
  );
  const solved = parseContestNumber(record.problems_solved ?? record.solved);
  const score = parseContestNumber(record.score);
  const problemsPayload = record.problems_data ?? record.problems;

  return (
    (attempted !== null && attempted > 0) ||
    (solved !== null && solved > 0) ||
    (score !== null && score > 0) ||
    hasAttemptInProblemsPayload(problemsPayload)
  );
}

function isLiveContestParticipation(record) {
  if (!record) return false;

  const isVirtual = record.is_virtual === true || record.isVirtual === true;
  return !isVirtual && hasContestParticipation(record);
}

function getMaxNonNegativeCount(...values) {
  return values.reduce((max, value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return max;
    }

    return Math.max(max, Math.floor(parsed));
  }, 0);
}

function isMissingUnsolvedAttemptsTableError(error) {
  if (!error) return false;

  const code = (error.code || '').toString();
  const message =
    `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();

  if (code === '42P01' || code === 'PGRST205') {
    return true;
  }

  return (
    message.includes('unsolved_attempts') &&
    (message.includes('does not exist') ||
      message.includes('could not find the table') ||
      message.includes('relation'))
  );
}

async function purgePlatformDataForUser({ userId, platformId }) {
  if (!userId || !platformId) {
    throw new Error('userId and platformId are required for platform cleanup');
  }

  const { data: existingSubmissions, error: existingSubmissionsError } =
    await supabaseAdmin
      .from(V2_TABLES.SUBMISSIONS)
      .select('id')
      .eq('user_id', userId)
      .eq('platform_id', platformId);

  if (existingSubmissionsError) throw existingSubmissionsError;
  const submissionIds = (existingSubmissions || []).map((row) => row.id);

  const { data: existingSolves, error: existingSolvesError } =
    await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select('id, problems!inner(platform_id)')
      .eq('user_id', userId)
      .eq('problems.platform_id', platformId);

  if (existingSolvesError) throw existingSolvesError;
  const solveIds = (existingSolves || []).map((row) => row.id);

  let existingAttempts = [];
  let unsolvedAttemptStorageAvailable = true;

  const { data: existingAttemptsData, error: existingAttemptsError } =
    await supabaseAdmin
      .from(V2_TABLES.UNSOLVED_ATTEMPTS)
      .select('id, external_problem_id')
      .eq('user_id', userId)
      .eq('platform_id', platformId);

  if (existingAttemptsError) {
    if (isMissingUnsolvedAttemptsTableError(existingAttemptsError)) {
      unsolvedAttemptStorageAvailable = false;
      console.warn(
        '[CLEANUP] unsolved_attempts table not available; apply latest migrations to enable unsolved attempt cleanup.'
      );
    } else {
      throw existingAttemptsError;
    }
  } else {
    existingAttempts = existingAttemptsData || [];
  }

  const attemptIds = (existingAttempts || []).map((row) => row.id);

  const deleteByIds = async (table, ids) => {
    if (!ids || ids.length === 0) return 0;
    const CHUNK_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .in('id', chunk);
      if (error) throw error;
      deleted += chunk.length;
    }

    return deleted;
  };

  const collectSolutionIdsByColumn = async (column, ids) => {
    if (!ids || ids.length === 0) return [];

    const CHUNK_SIZE = 500;
    const collected = [];

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select('id')
        .in(column, chunk);

      if (error) throw error;
      if (data?.length) {
        for (const row of data) {
          if (row?.id) collected.push(row.id);
        }
      }
    }

    return collected;
  };

  const relatedSolutionIdsSet = new Set([
    ...(await collectSolutionIdsByColumn('submission_id', submissionIds)),
    ...(await collectSolutionIdsByColumn('user_solve_id', solveIds)),
  ]);

  const deletedSolutionCount = await deleteByIds(V2_TABLES.SOLUTIONS, [
    ...relatedSolutionIdsSet,
  ]);
  const deletedSubmissionCount = await deleteByIds(
    V2_TABLES.SUBMISSIONS,
    submissionIds
  );
  const deletedSolveCount = await deleteByIds(V2_TABLES.USER_SOLVES, solveIds);
  const deletedAttemptCount = unsolvedAttemptStorageAvailable
    ? await deleteByIds(V2_TABLES.UNSOLVED_ATTEMPTS, attemptIds)
    : 0;

  let deletedPlatformStats = false;
  const { error: platformStatsDeleteError } = await supabaseAdmin
    .from(V2_TABLES.USER_PLATFORM_STATS)
    .delete()
    .eq('user_id', userId)
    .eq('platform_id', platformId);

  if (platformStatsDeleteError) throw platformStatsDeleteError;
  deletedPlatformStats = true;

  // Refresh aggregate stats and leaderboard after cleanup.
  const aggregator = new ProblemSolvingAggregator();
  await aggregator.updateUserStatistics(userId, true);
  await rebuildLeaderboard();

  const totalDeleted =
    deletedSolutionCount +
    deletedSubmissionCount +
    deletedSolveCount +
    deletedAttemptCount +
    (deletedPlatformStats ? 1 : 0);

  return {
    deletedSolutions: deletedSolutionCount,
    deletedSubmissions: deletedSubmissionCount,
    deletedSolves: deletedSolveCount,
    deletedAttempts: deletedAttemptCount,
    deletedPlatformStats,
    unsolvedAttemptStorageAvailable,
    totalDeleted,
  };
}

const PLATFORM_CANONICAL_ALIASES = {
  codeforces: 'codeforces',
  atcoder: 'atcoder',
  leetcode: 'leetcode',
  codechef: 'codechef',
  spoj: 'spoj',
  uva: 'uva',
  vjudge: 'vjudge',
  cses: 'cses',
  toph: 'toph',
  hackerrank: 'hackerrank',
  kattis: 'kattis',
  lightoj: 'lightoj',
  topcoder: 'topcoder',
  ural: 'ural',
  timus: 'ural',
  poj: 'poj',
};

const VJUDGE_ORIGIN_ALIASES = {
  codeforces: 'codeforces',
  codeforce: 'codeforces',
  cf: 'codeforces',
  atcoder: 'atcoder',
  ac: 'atcoder',
  leetcode: 'leetcode',
  lc: 'leetcode',
  codechef: 'codechef',
  cc: 'codechef',
  spoj: 'spoj',
  uva: 'uva',
  ural: 'ural',
  timus: 'ural',
  poj: 'poj',
  cses: 'cses',
  toph: 'toph',
  hackerrank: 'hackerrank',
  kattis: 'kattis',
  lightoj: 'lightoj',
  topcoder: 'topcoder',
};

function unpackSingleRelation(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeIdentifierToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function normalizeProblemUrlForKey(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname
      .toLowerCase()
      .replace(/\/+$/, '')}`;
  } catch {
    return raw
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '');
  }
}

function getCanonicalPlatformAlias(platformCode) {
  const normalized = normalizeIdentifierToken(platformCode);
  return PLATFORM_CANONICAL_ALIASES[normalized] || normalized || 'unknown';
}

function getCanonicalProblemKey({
  platformCode,
  externalId,
  problemUrl,
  name,
}) {
  const platformAlias = getCanonicalPlatformAlias(platformCode);
  const normalizedExternalId = normalizeIdentifierToken(externalId);

  if (platformAlias === 'vjudge' && normalizedExternalId.includes('-')) {
    const [originRaw, ...restParts] = normalizedExternalId.split('-');
    const origin = VJUDGE_ORIGIN_ALIASES[normalizeIdentifierToken(originRaw)];
    const normalizedOriginId = normalizeIdentifierToken(restParts.join('-'));

    if (origin && normalizedOriginId) {
      return `${origin}:${normalizedOriginId}`;
    }
  }

  if (normalizedExternalId) {
    return `${platformAlias}:${normalizedExternalId}`;
  }

  const normalizedUrl = normalizeProblemUrlForKey(problemUrl);
  if (normalizedUrl) {
    return `url:${normalizedUrl}`;
  }

  const normalizedName = normalizeIdentifierToken(name);
  if (normalizedName) {
    return `${platformAlias}:name:${normalizedName}`;
  }

  return null;
}

function getUtcDateKey(dateValue) {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function calculateCurrentStreak(dateKeys) {
  if (!dateKeys || dateKeys.size === 0) return 0;

  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const yesterdayUtc = new Date(todayUtc);
  yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1);

  const todayKey = todayUtc.toISOString().slice(0, 10);
  const yesterdayKey = yesterdayUtc.toISOString().slice(0, 10);

  let cursor = null;
  if (dateKeys.has(todayKey)) {
    cursor = todayUtc;
  } else if (dateKeys.has(yesterdayKey)) {
    cursor = yesterdayUtc;
  } else {
    return 0;
  }

  let streak = 0;
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dateKeys.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function getDifficultyWeight(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 1;
  if (value >= 2500) return 15;
  if (value >= 2400) return 12;
  if (value >= 2300) return 10;
  if (value >= 2200) return 9;
  if (value >= 2100) return 8;
  if (value >= 2000) return 7;
  if (value >= 1900) return 6;
  if (value >= 1800) return 5;
  if (value >= 1700) return 4.5;
  if (value >= 1600) return 4;
  if (value >= 1500) return 3.5;
  if (value >= 1400) return 3;
  if (value >= 1300) return 2.5;
  if (value >= 1200) return 2;
  if (value >= 1100) return 1.8;
  if (value >= 1000) return 1.5;
  if (value >= 900) return 1.2;
  return 1;
}

function computeDashboardStatMetrics(
  solvedRows,
  effectiveTotalSubmissions,
  fallbackStats
) {
  const uniqueByCanonicalProblem = new Map();

  (solvedRows || []).forEach((solve) => {
    const problem = unpackSingleRelation(solve.problems);
    const platform = unpackSingleRelation(problem?.platforms);

    const canonicalProblemKey = getCanonicalProblemKey({
      platformCode: platform?.code,
      externalId: problem?.external_id || problem?.problem_id,
      problemUrl: problem?.url || problem?.problem_url,
      name: problem?.name || problem?.problem_name,
    });

    if (!canonicalProblemKey) return;

    const existing = uniqueByCanonicalProblem.get(canonicalProblemKey);
    const candidateTimestamp = Date.parse(solve.first_solved_at || '');
    const existingTimestamp = Date.parse(existing?.first_solved_at || '');
    const candidateIsValid = Number.isFinite(candidateTimestamp);
    const existingIsValid = Number.isFinite(existingTimestamp);

    if (!existing) {
      uniqueByCanonicalProblem.set(canonicalProblemKey, {
        first_solved_at: solve.first_solved_at,
        difficulty_rating: problem?.difficulty_rating,
      });
      return;
    }

    if (
      candidateIsValid &&
      (!existingIsValid || candidateTimestamp < existingTimestamp)
    ) {
      uniqueByCanonicalProblem.set(canonicalProblemKey, {
        first_solved_at: solve.first_solved_at,
        difficulty_rating: problem?.difficulty_rating,
      });
    }
  });

  const fallbackSolved = getMaxNonNegativeCount(fallbackStats?.total_solved);
  const fallbackSubmissions = getMaxNonNegativeCount(
    effectiveTotalSubmissions,
    fallbackStats?.total_submissions,
    fallbackStats?.total_solutions
  );
  const fallbackAcceptanceRate =
    fallbackSolved > 0
      ? Math.round(
          (fallbackSolved / Math.max(fallbackSubmissions || 1, 1)) * 100
        )
      : 0;
  const fallbackWeightedScore = Math.round(
    Number.isFinite(Number(fallbackStats?.weighted_score))
      ? Number(fallbackStats?.weighted_score)
      : calculateWeightedScore(fallbackStats || {})
  );

  if (uniqueByCanonicalProblem.size === 0) {
    return {
      total_solved: fallbackSolved,
      current_streak: getMaxNonNegativeCount(fallbackStats?.current_streak),
      acceptance_rate: fallbackAcceptanceRate,
      weighted_score: fallbackWeightedScore,
    };
  }

  const solvedDateKeys = new Set(
    Array.from(uniqueByCanonicalProblem.values())
      .map((entry) => getUtcDateKey(entry.first_solved_at))
      .filter(Boolean)
  );

  let weightedScore = 0;
  uniqueByCanonicalProblem.forEach((entry) => {
    weightedScore += getDifficultyWeight(entry.difficulty_rating);
  });

  const uniqueSolvedCount = uniqueByCanonicalProblem.size;
  const acceptanceRate =
    uniqueSolvedCount > 0
      ? Math.round(
          (uniqueSolvedCount /
            Math.max(
              getMaxNonNegativeCount(effectiveTotalSubmissions) || 1,
              1
            )) *
            100
        )
      : 0;

  return {
    total_solved: uniqueSolvedCount,
    current_streak: calculateCurrentStreak(solvedDateKeys),
    acceptance_rate: acceptanceRate,
    weighted_score: Math.round(weightedScore),
  };
}

/**
 * Get latest sync status per platform from merged sync_jobs table.
 * Provides a backward-compatible shape used by existing UI logic.
 */
async function getUserSyncStatusByPlatform(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .select(
        'platform_id, status, inserted_items, completed_at, last_processed_at, error_message, created_at, platforms!inner(code)'
      )
      .eq('user_id', userId)
      .eq('job_type', 'submissions')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const byPlatform = new Map();
    (data || []).forEach((job) => {
      const platform = job.platforms?.code;
      if (!platform || byPlatform.has(platform)) return;

      byPlatform.set(platform, {
        platform,
        sync_status: job.status || 'pending',
        total_inserted: job.inserted_items || 0,
        sync_completed_at: job.completed_at || null,
        last_synced_at: job.last_processed_at || job.completed_at || null,
        error_message: job.error_message || null,
      });
    });

    return Array.from(byPlatform.values());
  } catch (e) {
    console.error('Error fetching sync jobs:', e.message);
    return [];
  }
}

/**
 * Transform contest history to the format expected by components
 * Maps contest_history table columns to component-expected field names
 */
function transformContestHistory(contestHistoryData) {
  return (contestHistoryData || []).map((ch) => {
    // Parse problems_data - handle both direct objects and double-stringified data
    let problems = null;
    if (ch.problems_data) {
      try {
        let data = ch.problems_data;
        // If it's a string, parse it
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        // Handle double-stringified case (jsonb stored as JSON string)
        // This happens when the data looks like: "[{\"label\":\"A\"...}]" (starts with quote)
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        problems = Array.isArray(data) ? data : null;
      } catch (e) {
        console.warn('Failed to parse problems_data:', e);
      }
    }

    return {
      ...ch,
      // Map database fields to component-expected fields
      // contest_history uses platform code from join, not platform_id directly
      platform: ch.platform || ch.platforms?.code,
      date: ch.contest_date,
      endDate: ch.contest_end_date,
      name: ch.contest_name,
      contestId: ch.external_contest_id,
      platformContestId: ch.platform_contest_id,
      ratingChange: ch.rating_change,
      newRating: ch.new_rating,
      oldRating: ch.old_rating,
      solved: ch.problems_solved,
      problemsAttempted: ch.problems_attempted,
      totalProblems: ch.total_problems || ch.problems_attempted,
      problems: problems,
      rank: ch.rank,
      totalParticipants: ch.total_participants,
      score: ch.score,
      maxScore: ch.max_score,
      penalty: ch.penalty,
      isRated: ch.is_rated,
      isVirtual: ch.is_virtual,
      division: ch.division,
      duration: ch.duration_minutes,
      // Construct contest URL based on platform
      url:
        ch.contest_url ||
        getContestUrl(
          ch.platform || ch.platforms?.code,
          ch.platform_contest_id || ch.external_contest_id
        ),
    };
  });
}

/**
 * Transform rating history to the format expected by RatingChart component
 * Maps rating_history table columns to component-expected field names
 */
function transformRatingHistory(ratingHistoryData) {
  return (ratingHistoryData || []).map((rh) => ({
    ...rh,
    // Map database fields to component-expected fields
    platform: rh.platform || rh.platforms?.code,
    date: rh.recorded_at,
    rating: rh.rating,
    change: rh.rating_change,
    // Contest info from joined contest_history if available
    contestName: rh.contest_history?.contest_name,
    contestId: rh.contest_history?.external_contest_id,
  }));
}

/**
 * Get contest URL based on platform and contest ID
 */
function getContestUrl(platform, contestId) {
  if (!contestId) return null;

  const urlTemplates = {
    codeforces: `https://codeforces.com/contest/${contestId}`,
    atcoder: `https://atcoder.jp/contests/${contestId}`,
    codechef: `https://www.codechef.com/${contestId}`,
    leetcode: `https://leetcode.com/contest/${contestId}`,
    topcoder: `https://www.topcoder.com/challenges/${contestId}`,
    hackerrank: `https://www.hackerrank.com/contests/${contestId}`,
  };

  return urlTemplates[platform] || null;
}

// ============================================
// SMART MERGE HELPERS FOR CONTEST SYNC
// ============================================

/**
 * Determine if a new value is "better" than an existing value
 * Returns true if newVal should replace existingVal
 *
 * Rules:
 * - If existing is null/undefined/0 and new has a value, use new
 * - If new is null/undefined, keep existing
 * - For numbers: prefer non-zero values, then prefer larger values for counts
 * - For strings: prefer non-empty values
 * - For booleans: prefer true (rated contests, etc.)
 */
function isValueBetter(existingVal, newVal, fieldName) {
  // If new value is null/undefined, keep existing
  if (newVal === null || newVal === undefined) {
    return false;
  }

  // If existing is null/undefined/empty, new is better
  if (existingVal === null || existingVal === undefined) {
    return true;
  }

  // For strings, prefer non-empty
  if (typeof newVal === 'string') {
    if (!existingVal || existingVal.trim() === '') {
      return newVal.trim() !== '';
    }
    // Don't overwrite existing non-empty strings unless it's a generic name
    if (
      fieldName === 'contest_name' &&
      existingVal.match(/^Contest #\d+$/) &&
      !newVal.match(/^Contest #\d+$/)
    ) {
      return true; // Replace generic "Contest #123" with real name
    }
    return false; // Keep existing string
  }

  // For numbers
  if (typeof newVal === 'number') {
    // If existing is 0 and new is non-zero, use new
    if (existingVal === 0 && newVal !== 0) {
      return true;
    }
    // For participant counts, ranks - keep existing non-zero values
    if (
      fieldName === 'total_participants' ||
      fieldName === 'rank' ||
      fieldName === 'problems_solved'
    ) {
      // Only update if existing is 0 or null-ish
      return existingVal === 0 || !existingVal;
    }
    // For scores, prefer higher
    if (fieldName === 'score' || fieldName === 'max_score') {
      return newVal > existingVal;
    }
    // For other numbers, don't overwrite existing
    return false;
  }

  // For booleans - don't change existing
  if (typeof newVal === 'boolean') {
    return false;
  }

  // Default: don't overwrite
  return false;
}

/**
 * Merge problems_data arrays intelligently
 * - Preserves upsolve status from existing data
 * - Adds any new problems from new data
 * - Updates status if new data shows solved (during contest)
 *
 * @param {Array|null} existingProblems - Existing problems_data from DB
 * @param {Array|null} newProblems - New problems_data from API
 * @returns {Array|null} - Merged problems array
 */
function mergeProblemsData(existingProblems, newProblems) {
  // If no existing data, use new data
  if (!existingProblems || !Array.isArray(existingProblems)) {
    return newProblems;
  }

  // If no new data, keep existing
  if (!newProblems || !Array.isArray(newProblems)) {
    return existingProblems;
  }

  // Create a map of existing problems by label (A, B, C, etc.)
  const existingMap = new Map();
  existingProblems.forEach((p) => {
    const key = p.label || p.index || p.name;
    if (key) {
      existingMap.set(key, { ...p });
    }
  });

  // Merge in new problems
  newProblems.forEach((newP) => {
    const key = newP.label || newP.index || newP.name;
    if (!key) return;

    const existing = existingMap.get(key);

    if (!existing) {
      // New problem not in existing data - add it
      existingMap.set(key, { ...newP });
    } else {
      // Problem exists - merge intelligently
      const merged = { ...existing };

      // If existing shows upsolve, preserve it
      if (existing.upsolve || existing.isUpsolve) {
        merged.upsolve = true;
        merged.isUpsolve = true;
      }

      // If new shows solved during contest, update
      if (newP.solved && !newP.upsolve && !newP.isUpsolve) {
        merged.solved = true;
        // If it was marked as upsolve but now shows contest solve, keep as contest solve
        if (merged.upsolve || merged.isUpsolve) {
          // This is rare - keep as solved during contest if API says so
          merged.upsolve = false;
          merged.isUpsolve = false;
        }
      }

      // If new shows upsolve and existing doesn't have solve status
      if (
        (newP.upsolve || newP.isUpsolve) &&
        !existing.solved &&
        !existing.upsolve
      ) {
        merged.upsolve = true;
        merged.isUpsolve = true;
        merged.solved = true;
      }

      // Preserve attempted status
      if (newP.attempted || existing.attempted) {
        merged.attempted = true;
      }

      // Copy over any other useful fields from new data
      if (newP.problemId && !merged.problemId) {
        merged.problemId = newP.problemId;
      }
      if (newP.url && !merged.url) {
        merged.url = newP.url;
      }
      if (newP.name && !merged.name) {
        merged.name = newP.name;
      }
      if (newP.rating && !merged.rating) {
        merged.rating = newP.rating;
      }

      existingMap.set(key, merged);
    }
  });

  // Convert back to array and sort by label
  return Array.from(existingMap.values()).sort((a, b) => {
    const labelA = a.label || a.index || '';
    const labelB = b.label || b.index || '';
    return labelA.localeCompare(labelB);
  });
}

/**
 * Build a smart update object that only includes fields that should be updated
 * @param {Object} existingRecord - Full existing record from DB
 * @param {Object} newData - New data from API
 * @returns {Object|null} - Update object or null if no updates needed
 */
function buildSmartUpdate(existingRecord, newData) {
  const updates = {};
  let hasUpdates = false;

  // Fields to check for smart update
  const fieldsToCheck = [
    'contest_name',
    'contest_url',
    'contest_end_date',
    'duration_minutes',
    'rank',
    'total_participants',
    'score',
    'max_score',
    'problems_solved',
    'problems_attempted',
    'total_problems',
    'penalty',
    'platform_contest_id',
    'old_rating',
    'new_rating',
    'rating_change',
    'is_rated',
    'is_virtual',
    'division',
  ];

  // Check each field
  for (const field of fieldsToCheck) {
    if (isValueBetter(existingRecord[field], newData[field], field)) {
      updates[field] = newData[field];
      hasUpdates = true;
    }
  }

  // Special handling for problems_data - merge arrays
  const mergedProblems = mergeProblemsData(
    existingRecord.problems_data,
    newData.problems_data
  );

  // Check if problems_data actually changed
  const existingJson = JSON.stringify(existingRecord.problems_data || []);
  const mergedJson = JSON.stringify(mergedProblems || []);

  if (mergedJson !== existingJson && mergedProblems) {
    updates.problems_data = mergedProblems;
    hasUpdates = true;
  }

  return hasUpdates ? updates : null;
}

// ============================================
// GET USER DATA
// ============================================

/**
 * Get current user's problem solving data (NEW SCHEMA)
 *
 * Updated to work with robust schema:
 * - user_handles (simplified for Codeforces)
 * - user_problem_stats (aggregated statistics)
 * - user_problem_solves (solve history)
 * - solutions (solution versions)
 * - problem_submissions (ALL submissions with any verdict)
 * - contest_participations (contest history)
 */
export async function getProblemSolvingData() {
  try {
    const { user } = await requireRole('member');

    // Check if V2 schema is available
    const useV2 = await isV2SchemaAvailable();

    // Fetch data with individual error handling for missing tables
    let profile = null;
    let handles = [];
    let statistics = null;
    let recentSolutions = [];
    let problemSolves = [];
    let recentSubmissions = [];

    // Get user profile (this table should always exist)
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url, role')
        .eq('id', user.id)
        .single();
      profile = data;
    } catch (e) {
      console.error('Error fetching user profile:', e.message);
    }

    // Get user handles (ALL platforms) - V2 or legacy
    try {
      if (useV2) {
        handles = await getUserHandlesV2(user.id);
      } else {
        const { data } = await supabaseAdmin
          .from('user_handles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        handles = data || [];
      }
    } catch (e) {
      console.error('Error fetching user handles:', e.message);
    }

    // Get user statistics - V2 or legacy
    try {
      if (useV2) {
        statistics = await getUserStatsV2(user.id);
      } else {
        const { data } = await supabaseAdmin
          .from('user_problem_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();
        statistics = data;
      }
    } catch (e) {
      // Table may not exist yet - this is expected before migration
      console.error(
        'Error fetching user stats (table may not exist):',
        e.message
      );
    }

    // Get recent solutions (V2 schema with correct table names)
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.SOLUTIONS)
        .select(
          `
          id, source_code, verdict, is_primary, submitted_at, created_at,
          languages(code, name),
          user_solves!inner(
            id, first_solved_at,
            problems!inner(
              id, external_id, name, url, difficulty_rating,
              platforms!inner(code, name)
            )
          )
        `
        )
        .eq('user_solves.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      recentSolutions = (data || []).map((sol) => ({
        id: sol.id,
        source_code: sol.source_code,
        verdict: sol.verdict,
        is_primary: sol.is_primary,
        submitted_at: sol.submitted_at || sol.created_at,
        language: sol.languages?.code,
        language_name: sol.languages?.name,
        user_problem_solves: sol.user_solves
          ? {
              id: sol.user_solves.id,
              first_solved_at: sol.user_solves.first_solved_at,
              problems: sol.user_solves.problems
                ? {
                    platform: sol.user_solves.problems.platforms?.code,
                    problem_id: sol.user_solves.problems.external_id,
                    problem_name: sol.user_solves.problems.name,
                    problem_url: sol.user_solves.problems.url,
                    difficulty_rating:
                      sol.user_solves.problems.difficulty_rating,
                  }
                : null,
            }
          : null,
      }));
    } catch (e) {
      console.error('Error fetching solutions:', e.message);
    }

    // Get recent problem solves for activity data - V2 or legacy
    try {
      if (useV2) {
        problemSolves = await getUserSolvesV2(user.id, { limit: 100 });
        // Transform to match expected shape with nested problems object
        problemSolves = problemSolves.map((solve) => ({
          id: solve.id,
          first_solved_at: solve.first_solved_at,
          solve_count: solve.solve_count,
          problems: {
            platform: solve.platform,
            problem_id: solve.problem_id,
            problem_name: solve.problem_name,
            difficulty_rating: solve.difficulty_rating,
            tags: solve.tags,
          },
        }));
      } else {
        const { data } = await supabaseAdmin
          .from('user_problem_solves')
          .select(
            `
            id, first_solved_at, solve_count,
            problems!inner(platform, problem_id, problem_name, difficulty_rating, tags)
          `
          )
          .eq('user_id', user.id)
          .order('first_solved_at', { ascending: false })
          .limit(100);
        problemSolves = data || [];
      }
    } catch (e) {
      console.error(
        'Error fetching problem solves (table may not exist):',
        e.message
      );
    }

    // Get recent submissions (ALL verdicts) - V2 or legacy
    try {
      if (useV2) {
        recentSubmissions = await getUserSubmissionsV2(user.id, { limit: 100 });
      } else {
        const { data } = await supabaseAdmin
          .from('problem_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(100);
        recentSubmissions = data || [];
      }
    } catch (e) {
      console.error(
        'Error fetching problem submissions (table may not exist):',
        e.message
      );
    }

    // Get contest history (from contest_history table, joined with platforms)
    // NOTE: No limit - fetch ALL contests so older platform data (like LeetCode from 2024) isn't cut off
    let contestHistoryData = [];
    let contestHistoryLoaded = false;
    try {
      const { data, error: contestError } = await supabaseAdmin
        .from('contest_history')
        .select(
          `
          *,
          platforms!inner(code, name)
        `
        )
        .eq('user_id', user.id)
        .order('contest_date', { ascending: false });

      if (contestError) {
        console.error(
          '[getProblemSolvingData] Contest history query error:',
          contestError
        );
      } else {
        contestHistoryLoaded = true;
      }

      contestHistoryData = data || [];
    } catch (e) {
      console.error(
        'Error fetching contest history (table may not exist):',
        e.message
      );
    }

    // Get rating history (from rating_history table, joined with platforms and contest_history)
    let ratingHistoryData = [];
    try {
      const { data } = await supabaseAdmin
        .from('rating_history')
        .select(
          `
          *,
          platforms!inner(code, name),
          contest_history(contest_name, external_contest_id, contest_url)
        `
        )
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(200);
      ratingHistoryData = data || [];
    } catch (e) {
      console.error(
        'Error fetching rating history (table may not exist):',
        e.message
      );
    }

    // Get latest sync status per platform from merged sync_jobs table.
    const syncCheckpoints = await getUserSyncStatusByPlatform(user.id);

    // Get solved counts per platform from user_solves table (unique problems solved)
    // This joins user_solves -> problems -> platforms to get accurate counts
    let platformSolvedCounts = {};
    let platformSolvedCountsLoaded = false;
    let solvedRowsForDashboard = [];
    try {
      if (useV2) {
        // V2 schema: user_solves -> problems -> platforms
        const { data } = await supabaseAdmin
          .from(V2_TABLES.USER_SOLVES)
          .select(
            'first_solved_at, problem_id, problems!inner(external_id, name, url, difficulty_rating, platform_id, platforms!inner(code))'
          )
          .eq('user_id', user.id);

        solvedRowsForDashboard = data || [];

        // Count unique solved problems per platform code
        const solvedByPlatform = {};
        solvedRowsForDashboard.forEach((solve) => {
          const platformCode = solve.problems?.platforms?.code;
          if (platformCode) {
            solvedByPlatform[platformCode] =
              (solvedByPlatform[platformCode] || 0) + 1;
          }
        });
        platformSolvedCounts = solvedByPlatform;
        platformSolvedCountsLoaded = true;
      } else {
        // V1 schema: user_solves -> problems -> platforms
        const { data } = await supabaseAdmin
          .from('user_solves')
          .select(
            'first_solved_at, problem_id, problems!inner(problem_id, problem_name, problem_url, difficulty_rating, platform_id, platforms!inner(code))'
          )
          .eq('user_id', user.id);

        solvedRowsForDashboard = data || [];

        // Count unique solved problems per platform code
        const solvedByPlatform = {};
        solvedRowsForDashboard.forEach((solve) => {
          const platformCode = solve.problems?.platforms?.code;
          if (platformCode) {
            solvedByPlatform[platformCode] =
              (solvedByPlatform[platformCode] || 0) + 1;
          }
        });
        platformSolvedCounts = solvedByPlatform;
        platformSolvedCountsLoaded = true;
      }
    } catch (e) {
      console.error('Error fetching platform solved counts:', e.message);
    }

    // Get total submissions per platform
    let platformSubmissionCounts = {};
    let platformSubmissionCountsLoaded = false;
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.SUBMISSIONS)
        .select('platform_id, platforms!inner(code)')
        .eq('user_id', user.id);

      (data || []).forEach((sub) => {
        const platformCode = sub.platforms?.code;
        if (platformCode) {
          platformSubmissionCounts[platformCode] =
            (platformSubmissionCounts[platformCode] || 0) + 1;
        }
      });
      platformSubmissionCountsLoaded = true;
    } catch (e) {
      console.error('Error fetching platform submission counts:', e.message);
    }

    const liveContestCountsByPlatform = {};
    (contestHistoryData || []).forEach((contest) => {
      const platformCode = contest.platforms?.code || contest.platform;
      if (!platformCode || !isLiveContestParticipation(contest)) return;

      liveContestCountsByPlatform[platformCode] =
        (liveContestCountsByPlatform[platformCode] || 0) + 1;
    });

    const summedPlatformSubmissions = Object.values(
      platformSubmissionCounts
    ).reduce((sum, count) => sum + getMaxNonNegativeCount(count), 0);

    const effectiveTotalSubmissions = getMaxNonNegativeCount(
      statistics?.total_submissions,
      statistics?.total_solutions,
      summedPlatformSubmissions
    );

    const dashboardMetrics = computeDashboardStatMetrics(
      solvedRowsForDashboard,
      effectiveTotalSubmissions,
      statistics
    );

    // Get user_platform_stats for per-platform rating/rank data (V3)
    let platformStatsMap = {};
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.USER_PLATFORM_STATS)
        .select(
          'platform_id, current_rating, max_rating, rank_title, total_submissions, contest_count, problems_solved, last_synced_at, platforms!inner(code)'
        )
        .eq('user_id', user.id);

      (data || []).forEach((ps) => {
        const code = ps.platforms?.code;
        if (code) platformStatsMap[code] = ps;
      });
    } catch (e) {
      console.error('Error fetching user_platform_stats:', e.message);
    }

    // Get user badges
    let userBadges = [];
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.USER_BADGES)
        .select(
          'id, earned_at, badge_definitions!inner(code, name, description, icon, category)'
        )
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      userBadges = (data || []).map((ub) => ({
        id: ub.id,
        earned_at: ub.earned_at,
        code: ub.badge_definitions?.code,
        name: ub.badge_definitions?.name,
        description: ub.badge_definitions?.description,
        icon_url: ub.badge_definitions?.icon,
        category: ub.badge_definitions?.category,
      }));
    } catch (e) {
      console.error('Error fetching user badges:', e.message);
    }

    // Get user tier stats (V3)
    let tierStatsMap = {};
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.USER_TIER_STATS)
        .select(
          'solved_count, difficulty_tiers!inner(min_rating, max_rating, tier_name)'
        )
        .eq('user_id', user.id);

      (data || []).forEach((ts) => {
        const minRating = ts.difficulty_tiers?.min_rating;
        if (minRating != null) tierStatsMap[minRating] = ts.solved_count || 0;
      });
    } catch (e) {
      console.error('Error fetching user_tier_stats:', e.message);
    }

    // Get user's leaderboard rank
    let userRank = null;
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.LEADERBOARD_CACHE)
        .select(
          'global_rank, weekly_rank, monthly_rank, total_score, weekly_score, monthly_score, total_solved, weekly_solved, monthly_solved'
        )
        .eq('user_id', user.id)
        .maybeSingle();
      userRank = data || null;
    } catch (e) {
      console.error('Error fetching user leaderboard rank:', e.message);
    }

    // Build tier-based difficulty breakdown
    // Prefer tier stats (V3), fall back to flat columns in user_stats
    const getSolvedForRating = (minRating) =>
      tierStatsMap[minRating] ?? statistics?.[`solved_${minRating}`] ?? 0;

    const easySolved = getSolvedForRating(800) + getSolvedForRating(900);
    const mediumSolved =
      getSolvedForRating(1000) +
      getSolvedForRating(1100) +
      getSolvedForRating(1200) +
      getSolvedForRating(1300);
    const hardSolved =
      getSolvedForRating(1400) +
      getSolvedForRating(1500) +
      getSolvedForRating(1600) +
      getSolvedForRating(1700);
    const expertSolved =
      getSolvedForRating(1800) +
      getSolvedForRating(1900) +
      getSolvedForRating(2000) +
      getSolvedForRating(2100) +
      getSolvedForRating(2200) +
      getSolvedForRating(2300) +
      getSolvedForRating(2400) +
      (tierStatsMap[2500] ??
        statistics?.solved_2500_plus ??
        statistics?.solved_2000_plus ??
        0);

    // Transform statistics to expected format
    const transformedStatistics = statistics
      ? {
          total_solved: dashboardMetrics.total_solved,
          total_solutions: statistics.total_solutions || 0,
          total_submissions: effectiveTotalSubmissions,
          acceptance_rate: dashboardMetrics.acceptance_rate,
          current_streak: dashboardMetrics.current_streak,
          longest_streak: statistics.longest_streak || 0,

          // Difficulty breakdown (V3: from tier stats; fallback: flat columns)
          easy_solved: easySolved,
          medium_solved: mediumSolved,
          hard_solved: hardSolved,
          expert_solved: expertSolved,

          // Weekly/monthly — use direct columns added in migration 20260405040000
          solved_this_week: statistics.solved_this_week || 0,
          solved_this_month: statistics.solved_this_month || 0,
          weighted_score: dashboardMetrics.weighted_score,

          // Raw tier breakdown for detailed charts
          tier_breakdown: tierStatsMap,

          // Platform stats — use authoritative per-platform tables for counts;
          // checkpoints are status/timing only.
          platform_stats: (handles || []).reduce((acc, handle) => {
            const checkpoint = syncCheckpoints.find(
              (cp) => cp.platform === handle.platform
            );
            const ps = platformStatsMap[handle.platform];
            const solvedCount = platformSolvedCountsLoaded
              ? getMaxNonNegativeCount(platformSolvedCounts[handle.platform])
              : getMaxNonNegativeCount(
                  platformSolvedCounts[handle.platform],
                  ps?.problems_solved
                );
            const totalSubmissions = platformSubmissionCountsLoaded
              ? getMaxNonNegativeCount(
                  platformSubmissionCounts[handle.platform]
                )
              : getMaxNonNegativeCount(
                  platformSubmissionCounts[handle.platform],
                  ps?.total_submissions
                );

            acc[handle.platform] = {
              rating:
                ps?.current_rating ??
                handle.current_rating ??
                handle.rating ??
                0,
              max_rating: ps?.max_rating ?? handle.max_rating ?? 0,
              rank_title: ps?.rank_title ?? handle.rank_title ?? null,
              handle: handle.handle,
              is_verified: handle.is_verified || false,
              last_synced_at:
                ps?.last_synced_at ||
                checkpoint?.sync_completed_at ||
                checkpoint?.last_synced_at ||
                handle.last_synced_at,
              contest_count: contestHistoryLoaded
                ? liveContestCountsByPlatform[handle.platform] || 0
                : getMaxNonNegativeCount(ps?.contest_count),
              sync_status: checkpoint?.sync_status || 'pending',
              total_submissions: totalSubmissions,
              solved_count: solvedCount,
              error_message: checkpoint?.error_message || null,
            };
            return acc;
          }, {}),

          // Leaderboard rank
          global_rank: userRank?.global_rank || null,
          weekly_rank: userRank?.weekly_rank || null,
          monthly_rank: userRank?.monthly_rank || null,
        }
      : {
          total_solved: dashboardMetrics.total_solved,
          total_submissions: effectiveTotalSubmissions,
          acceptance_rate: dashboardMetrics.acceptance_rate,
          current_streak: dashboardMetrics.current_streak,
          weighted_score: dashboardMetrics.weighted_score,
          platform_stats: {},
        };

    // Generate daily activity from recent solves
    const dailyActivity = generateDailyActivity(problemSolves || []);

    // Transform submissions: resolve platform code + problem name via JOIN
    const transformedSubmissions = (recentSubmissions || []).map((sub) => ({
      id: sub.id,
      platform: sub.platform || 'unknown',
      problem_id: sub.external_problem_id || sub.problem_id || '',
      problem_name: sub.problems?.name || sub.problem_name || '',
      problem_url: sub.problems?.url || sub.problem_url || '',
      submission_id: sub.external_submission_id || sub.submission_id || '',
      verdict: sub.verdict || 'UNKNOWN',
      language: sub.languages?.code || sub.language || '',
      submitted_at: sub.submitted_at,
      execution_time_ms: sub.execution_time_ms,
      memory_kb: sub.memory_kb,
      difficulty_rating:
        sub.problems?.difficulty_rating || sub.difficulty_rating,
      tags: sub.tags || [],
    }));

    // Transform contest history for ContestHistory component
    const transformedContests = transformContestHistory(contestHistoryData);

    // Transform rating history for RatingChart component
    const ratingHistory = transformRatingHistory(ratingHistoryData);

    return {
      success: true,
      data: {
        profile: profile || null,
        handles: handles || [],
        statistics: transformedStatistics,
        recentSolves: problemSolves || [],
        recentSolutions: recentSolutions || [],
        recentSubmissions: transformedSubmissions,
        dailyActivity,
        badges: userBadges,
        leaderboard: userRank,
        ratingHistory,
        contestHistory: transformedContests,
      },
    };
  } catch (error) {
    console.error('Error fetching member problem solving data:', error);
    return {
      success: false,
      error:
        error.message ||
        'Failed to fetch problem solving data. Please try again.',
    };
  }
}

/**
 * Get member's problem solving data (for viewing other users)
 */
export async function getMemberProblemSolvingDataByUsername(username) {
  try {
    // Get user by username
    const { data: user } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Use getMemberProblemSolvingData with the found user's ID
    const result = await getMemberProblemSolvingData(user.id);
    return result;
  } catch (error) {
    console.error('Error in getMemberProblemSolvingData:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch member problem solving data',
    };
  }
}

/**
 * Get member's problem solving data by user ID (NEW SCHEMA)
 */
export async function getMemberProblemSolvingData(targetUserId) {
  try {
    await requireRole('member');

    // Check if V2 schema is available
    const useV2 = await isV2SchemaAvailable();

    // Fetch data with individual error handling for missing tables
    let profile = null;
    let handles = [];
    let statistics = null;
    let recentSolves = [];
    let recentSubmissions = [];

    // Get user profile
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url, role')
        .eq('id', targetUserId)
        .single();
      profile = data;
    } catch (e) {
      console.error('Error fetching user profile:', e.message);
    }

    // Get user handles (ALL platforms) - V2 or legacy
    try {
      if (useV2) {
        handles = await getUserHandlesV2(targetUserId);
      } else {
        const { data } = await supabaseAdmin
          .from('user_handles')
          .select(
            'platform, handle, is_verified, rating, max_rating, last_synced_at'
          )
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: true });
        handles = data || [];
      }
    } catch (e) {
      console.error('Error fetching user handles:', e.message);
    }

    // Get user statistics - V2 or legacy
    try {
      if (useV2) {
        statistics = await getUserStatsV2(targetUserId);
      } else {
        const { data } = await supabaseAdmin
          .from('user_problem_stats')
          .select('*')
          .eq('user_id', targetUserId)
          .single();
        statistics = data;
      }
    } catch (e) {
      console.error(
        'Error fetching user stats (table may not exist):',
        e.message
      );
    }

    // Get recent problem solves - V2 or legacy
    try {
      if (useV2) {
        const solves = await getUserSolvesV2(targetUserId, { limit: 10 });
        // Transform to match expected shape with nested problems object
        recentSolves = solves.map((solve) => ({
          first_solved_at: solve.first_solved_at,
          problems: {
            platform: solve.platform,
            problem_id: solve.problem_id,
            problem_name: solve.problem_name,
            difficulty_rating: solve.difficulty_rating,
          },
        }));
      } else {
        const { data } = await supabaseAdmin
          .from('user_problem_solves')
          .select(
            `
            first_solved_at,
            problems!inner(platform, problem_id, problem_name, difficulty_rating)
          `
          )
          .eq('user_id', targetUserId)
          .order('first_solved_at', { ascending: false })
          .limit(10);
        recentSolves = data || [];
      }
    } catch (e) {
      console.error(
        'Error fetching problem solves (table may not exist):',
        e.message
      );
    }

    // Get recent submissions (ALL verdicts) - V2 or legacy
    try {
      if (useV2) {
        recentSubmissions = await getUserSubmissionsV2(targetUserId, {
          limit: 100,
        });
      } else {
        const { data } = await supabaseAdmin
          .from('problem_submissions')
          .select('*')
          .eq('user_id', targetUserId)
          .order('submitted_at', { ascending: false })
          .limit(100);
        recentSubmissions = data || [];
      }
    } catch (e) {
      console.error(
        'Error fetching problem submissions (table may not exist):',
        e.message
      );
    }

    // Get user badges
    let userBadges = [];
    try {
      const { data } = await supabaseAdmin
        .from(V2_TABLES.USER_BADGES)
        .select(
          'id, earned_at, badge_definitions!inner(code, name, description, icon, category)'
        )
        .eq('user_id', targetUserId)
        .order('earned_at', { ascending: false });

      userBadges = (data || []).map((ub) => ({
        id: ub.id,
        earned_at: ub.earned_at,
        code: ub.badge_definitions?.code,
        name: ub.badge_definitions?.name,
        description: ub.badge_definitions?.description,
        icon_url: ub.badge_definitions?.icon,
        category: ub.badge_definitions?.category,
      }));
    } catch (e) {
      console.error('Error fetching user badges:', e.message);
    }

    // Get contest history (from contest_history table, joined with platforms)
    // NOTE: No limit - fetch ALL contests so older platform data isn't cut off
    let contestHistoryData = [];
    let contestHistoryLoaded = false;
    try {
      const { data } = await supabaseAdmin
        .from('contest_history')
        .select(
          `
          *,
          platforms!inner(code, name)
        `
        )
        .eq('user_id', targetUserId)
        .order('contest_date', { ascending: false });
      contestHistoryData = data || [];
      contestHistoryLoaded = true;
    } catch (e) {
      console.error(
        'Error fetching contest history (table may not exist):',
        e.message
      );
    }

    // Get rating history (from rating_history table, joined with platforms and contest_history)
    let ratingHistoryData = [];
    try {
      const { data } = await supabaseAdmin
        .from('rating_history')
        .select(
          `
          *,
          platforms!inner(code, name),
          contest_history(contest_name, external_contest_id, contest_url)
        `
        )
        .eq('user_id', targetUserId)
        .order('recorded_at', { ascending: false })
        .limit(200);
      ratingHistoryData = data || [];
    } catch (e) {
      console.error(
        'Error fetching rating history (table may not exist):',
        e.message
      );
    }

    // Get latest sync status per platform from merged sync_jobs table.
    const syncCheckpoints = await getUserSyncStatusByPlatform(targetUserId);

    // Get solved counts per platform from user_solves table (unique problems solved)
    // This joins user_solves -> problems -> platforms to get accurate counts
    let platformSolvedCounts = {};
    let platformSolvedCountsLoaded = false;
    try {
      const { data } = await supabaseAdmin
        .from('user_solves')
        .select(
          'problem_id, problems!inner(platform_id, platforms!inner(code))'
        )
        .eq('user_id', targetUserId);

      // Count unique solved problems per platform code
      const solvedByPlatform = {};
      (data || []).forEach((solve) => {
        const platformCode = solve.problems?.platforms?.code;
        if (platformCode) {
          solvedByPlatform[platformCode] =
            (solvedByPlatform[platformCode] || 0) + 1;
        }
      });
      platformSolvedCounts = solvedByPlatform;
      platformSolvedCountsLoaded = true;
    } catch (e) {
      console.error('Error fetching platform solved counts:', e.message);
    }

    // Get total submissions per platform (joined with platforms)
    let platformSubmissionCounts = {};
    let platformSubmissionCountsLoaded = false;
    try {
      const { data } = await supabaseAdmin
        .from('submissions')
        .select('platform_id, platforms!inner(code)')
        .eq('user_id', targetUserId);

      const countsByPlatform = {};
      (data || []).forEach((sub) => {
        const platformCode = sub.platforms?.code;
        if (platformCode) {
          countsByPlatform[platformCode] =
            (countsByPlatform[platformCode] || 0) + 1;
        }
      });
      platformSubmissionCounts = countsByPlatform;
      platformSubmissionCountsLoaded = true;
    } catch (e) {
      console.error('Error fetching platform submission counts:', e.message);
    }

    const liveContestCountsByPlatform = {};
    (contestHistoryData || []).forEach((contest) => {
      const platformCode = contest.platforms?.code || contest.platform;
      if (!platformCode || !isLiveContestParticipation(contest)) return;

      liveContestCountsByPlatform[platformCode] =
        (liveContestCountsByPlatform[platformCode] || 0) + 1;
    });

    const summedPlatformSubmissions = Object.values(
      platformSubmissionCounts
    ).reduce((sum, count) => sum + getMaxNonNegativeCount(count), 0);

    const effectiveTotalSubmissions = getMaxNonNegativeCount(
      statistics?.total_submissions,
      statistics?.total_solutions,
      summedPlatformSubmissions
    );

    // Transform statistics (same shape as getProblemSolvingData)
    const transformedStatistics = statistics
      ? {
          total_solved: statistics.total_solved || 0,
          total_solutions: statistics.total_solutions || 0,
          total_submissions: effectiveTotalSubmissions,
          acceptance_rate:
            statistics.total_solved > 0
              ? Math.round(
                  (statistics.total_solved /
                    Math.max(effectiveTotalSubmissions || 1, 1)) *
                    100
                )
              : 0,
          current_streak: statistics.current_streak || 0,
          longest_streak: statistics.longest_streak || 0,

          // Map difficulty ratings to names
          easy_solved:
            (statistics.solved_800 || 0) + (statistics.solved_900 || 0),
          medium_solved:
            (statistics.solved_1000 || 0) +
            (statistics.solved_1100 || 0) +
            (statistics.solved_1200 || 0) +
            (statistics.solved_1300 || 0),
          hard_solved:
            (statistics.solved_1400 || 0) +
            (statistics.solved_1500 || 0) +
            (statistics.solved_1600 || 0) +
            (statistics.solved_1700 || 0),
          expert_solved:
            (statistics.solved_1800 || 0) +
            (statistics.solved_1900 || 0) +
            (statistics.solved_2000 || 0) +
            (statistics.solved_2100 || 0) +
            (statistics.solved_2200 || 0) +
            (statistics.solved_2300 || 0) +
            (statistics.solved_2400 || 0) +
            (statistics.solved_2500_plus || statistics.solved_2000_plus || 0),

          solved_this_week: statistics.solved_this_week || 0,
          solved_this_month: statistics.solved_this_month || 0,
          weighted_score:
            statistics.weighted_score || calculateWeightedScore(statistics),

          // Raw tier breakdown (no V3 tier stats fetched for member view — use flat columns)
          tier_breakdown: {},

          // Platform stats (dynamically generated for ALL connected platforms)
          platform_stats: (handles || []).reduce((acc, handle) => {
            const checkpoint = syncCheckpoints.find(
              (cp) => cp.platform === handle.platform
            );

            acc[handle.platform] = {
              rating: handle.current_rating || handle.rating || 0,
              max_rating: handle.max_rating || 0,
              rank_title: handle.rank_title || null,
              handle: handle.handle,
              is_verified: handle.is_verified || false,
              last_synced_at:
                checkpoint?.sync_completed_at ||
                checkpoint?.last_synced_at ||
                handle.last_synced_at,
              contest_count: contestHistoryLoaded
                ? liveContestCountsByPlatform[handle.platform] || 0
                : 0,
              sync_status: checkpoint?.sync_status || 'pending',
              total_submissions: platformSubmissionCountsLoaded
                ? getMaxNonNegativeCount(
                    platformSubmissionCounts[handle.platform]
                  )
                : 0,
              solved_count: platformSolvedCountsLoaded
                ? getMaxNonNegativeCount(platformSolvedCounts[handle.platform])
                : 0,
              error_message: checkpoint?.error_message || null,
            };
            return acc;
          }, {}),

          global_rank: null,
          weekly_rank: null,
          monthly_rank: null,
        }
      : {
          total_solved: 0,
          platform_stats: {},
        };

    // Generate daily activity from recent solves
    const dailyActivity = generateDailyActivity(recentSolves || []);

    // Transform recentSubmissions from problem_submissions table (ALL verdicts)
    // V2 uses problem_external_id, legacy uses problem_id - support both
    const transformedSubmissions = (recentSubmissions || []).map((sub) => ({
      id: sub.id,
      platform: sub.platform || 'unknown',
      problem_id: sub.problem_external_id || sub.problem_id || '',
      problem_name: sub.problem_name || '',
      problem_url: sub.problem_url || '',
      submission_id: sub.submission_id || '',
      verdict: sub.verdict || 'UNKNOWN',
      language: sub.language || '',
      submitted_at: sub.submitted_at,
      execution_time_ms: sub.execution_time_ms,
      memory_kb: sub.memory_kb,
      difficulty_rating: sub.difficulty_rating,
      tags: sub.tags || [],
    }));

    // Transform contest history for ContestHistory component
    const transformedContests = transformContestHistory(contestHistoryData);

    // Transform rating history for RatingChart component
    const ratingHistory = transformRatingHistory(ratingHistoryData);

    return {
      success: true,
      data: {
        profile: profile || null,
        handles: handles || [],
        statistics: transformedStatistics,
        recentSolves: recentSolves || [],
        recentSubmissions: transformedSubmissions, // All submissions with any verdict
        dailyActivity,
        badges: userBadges,
        leaderboard: null,
        ratingHistory,
        contestHistory: transformedContests,
      },
    };
  } catch (error) {
    console.error('Error fetching member problem solving data:', error);
    return {
      success: false,
      error:
        error.message ||
        'Failed to fetch problem solving data. Please try again.',
    };
  }
}

/**
 * Connect an online judge handle
 */
export async function connectHandleAction(platform, handle, authToken = null) {
  try {
    const { user } = await requireRole('member');
    const normalizedHandle = normalizeHandleForPlatform(platform, handle);

    // Validate input
    if (!platform || !normalizedHandle) {
      return { success: false, error: 'Platform and handle are required' };
    }

    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return {
        success: false,
        error: `Unsupported platform. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`,
      };
    }

    if (normalizedHandle.length < 1 || normalizedHandle.length > 100) {
      return {
        success: false,
        error: 'Handle must be between 1 and 100 characters',
      };
    }

    if (
      platform === 'leetcode' &&
      !/^[A-Za-z0-9._-]{1,100}$/.test(normalizedHandle)
    ) {
      return {
        success: false,
        error:
          'Invalid LeetCode handle format. Use username, @username, or profile URL.',
      };
    }

    // Get platform ID
    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return {
        success: false,
        error: `Unknown platform: ${platform}`,
      };
    }

    // Check if handle is already connected to another user
    const { data: existingHandle } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select('user_id')
      .eq('platform_id', platformId)
      .eq('handle', normalizedHandle)
      .neq('user_id', user.id)
      .maybeSingle();

    if (existingHandle) {
      return {
        success: false,
        error: 'This handle is already connected to another account',
      };
    }

    // Verify handle exists on the platform
    let verificationResult = null;
    try {
      verificationResult = await verifyHandle(platform, normalizedHandle);
    } catch (verifyError) {
      return {
        success: false,
        error: `Could not verify handle on ${platform}: ${verifyError.message}`,
      };
    }

    // Handle is considered verified if we successfully fetched user info from the platform
    const canonicalHandle =
      verificationResult?.username ||
      verificationResult?.handle ||
      normalizedHandle;
    const isVerified = Boolean(verificationResult);

    // Upsert handle (include auth_token if provided)
    const extraFields = {
      is_verified: isVerified,
      verified_at: isVerified ? new Date().toISOString() : null,
      current_rating: verificationResult?.rating,
      max_rating: verificationResult?.maxRating,
      rank_title: verificationResult?.rank,
      avatar_url: verificationResult?.avatar,
    };
    if (authToken) {
      extraFields.auth_token = authToken;
    }

    const savedHandle = await upsertUserHandleV2(
      user.id,
      platform,
      canonicalHandle,
      extraFields
    );

    // Create fetch job - check if exists first to avoid constraint issues
    const { data: existingJob } = await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .select('id')
      .eq('user_id', user.id)
      .eq('platform_id', platformId)
      .eq('job_type', 'submissions')
      .maybeSingle();

    if (!existingJob) {
      await supabaseAdmin.from(V2_TABLES.SYNC_JOBS).insert({
        user_id: user.id,
        platform_id: platformId,
        job_type: 'submissions',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });
    }

    // Revalidate to show updated handle connection
    revalidatePath('/account/member/problem-solving', 'page');

    return {
      success: true,
      data: {
        handle: savedHandle,
        message: `Successfully connected ${savedHandle} on ${platform}`,
        verified: isVerified,
      },
    };
  } catch (error) {
    console.error('Error connecting handle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect an online judge handle
 */
export async function disconnectHandleAction(platform) {
  try {
    const { user } = await requireRole('member');

    if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
      return { success: false, error: 'Valid platform is required' };
    }

    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return { success: false, error: `Unknown platform: ${platform}` };
    }

    let cleanupData = null;
    if (platform === 'spoj') {
      cleanupData = await purgePlatformDataForUser({
        userId: user.id,
        platformId,
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .delete()
      .eq('user_id', user.id)
      .eq('platform_id', platformId);

    if (deleteError) throw deleteError;

    // Also delete any pending sync jobs
    await supabaseAdmin
      .from(V2_TABLES.SYNC_JOBS)
      .delete()
      .eq('user_id', user.id)
      .eq('platform_id', platformId);

    // Revalidate to show updated handle disconnection
    revalidatePath('/account/member/problem-solving', 'page');

    if (cleanupData) {
      return {
        success: true,
        message:
          'Disconnected SPOJ handle and removed previous SPOJ track data',
        data: cleanupData,
      };
    }

    return { success: true, message: `Disconnected ${platform} handle` };
  } catch (error) {
    console.error('Error disconnecting handle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove all previously stored LeetCode data for the current user.
 *
 * LeetCode syncing is extension-only, so this action performs a full
 * user-scoped purge to let the user re-import clean data from the browser
 * extension.
 */
export async function cleanupLeetCodeDataAction() {
  try {
    const { user } = await requireRole('member');

    const platform = 'leetcode';
    const platformId = await getPlatformId(platform);
    if (!platformId) {
      return { success: false, error: 'LeetCode platform is not configured' };
    }

    const { data: handleRecord, error: handleError } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select('handle')
      .eq('user_id', user.id)
      .eq('platform_id', platformId)
      .maybeSingle();

    if (handleError) throw handleError;

    const connectedHandle = normalizeHandleForPlatform(
      platform,
      handleRecord?.handle
    );

    if (!connectedHandle) {
      return {
        success: false,
        error: 'No connected LeetCode handle found for this account',
      };
    }

    const cleanupData = await purgePlatformDataForUser({
      userId: user.id,
      platformId,
    });

    revalidatePath('/account/member/problem-solving', 'page');
    revalidatePath('/api/problem-solving/problems', 'page');
    revalidatePath('/api/problem-solving/stats', 'page');

    return {
      success: true,
      data: {
        handle: connectedHandle,
        cleanupMode: 'full_purge',
        ...cleanupData,
        message:
          cleanupData.totalDeleted > 0
            ? 'Removed previous LeetCode data. Use the browser extension to extract fresh history.'
            : 'No previous LeetCode data found. Use the browser extension to extract data.',
      },
    };
  } catch (error) {
    console.error('Error cleaning LeetCode data:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SYNC DATA
// ============================================

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sync user's submissions from all connected platforms
 * @param {boolean} forceFullSync - If true, fetches ALL submissions (not just new ones)
 */
export async function syncSubmissionsAction(forceFullSync = false) {
  try {
    const { user } = await requireRole('member');

    // Check rate limit (less strict for incremental syncs)
    const cooldown = forceFullSync ? SYNC_COOLDOWN_MS : 60 * 1000; // 1 min for incremental
    const { data: lastSync } = await supabaseAdmin
      .from('user_statistics')
      .select('last_updated')
      .eq('user_id', user.id)
      .single();

    if (lastSync?.last_updated) {
      const timeSinceSync =
        Date.now() - new Date(lastSync.last_updated).getTime();
      if (timeSinceSync < cooldown) {
        const waitTime = Math.ceil((cooldown - timeSinceSync) / 1000);
        return {
          success: false,
          error: `Please wait ${waitTime} seconds before syncing again`,
        };
      }
    }

    // Run sync (with or without full sync flag)
    const aggregator = new ProblemSolvingAggregator();
    const result = await aggregator.syncUserSubmissions(user.id, forceFullSync);

    // Update leaderboard
    await rebuildLeaderboard();

    return {
      success: true,
      data: {
        synced: result.synced,
        platforms: result.platforms,
        message: forceFullSync
          ? `Full sync completed: ${result.synced} total submissions`
          : `Synced ${result.synced} new submissions`,
      },
    };
  } catch (error) {
    console.error('Error syncing submissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync submissions for a specific platform only
 * Syncs submissions, rating history, and contest history via CLIST with caching
 * @param {string} platform - Platform ID to sync
 * @param {boolean} forceFullSync - If true, fetches ALL submissions
 */
export async function syncPlatformAction(
  platform,
  forceFullSync = false,
  manualHtml = null
) {
  try {
    const { user } = await requireRole('member');

    // Validate platform
    if (!PROBLEM_SOLVING_PLATFORM_IDS.includes(platform)) {
      return { success: false, error: 'Invalid platform' };
    }

    const isLeetCode = platform === 'leetcode';

    // Check if V2 schema is available
    const useV2 = await isV2SchemaAvailable();
    const handlesTable = useV2 ? V2_TABLES.USER_HANDLES : 'user_handles';

    // Check if user has this platform connected
    let handle = null;
    if (useV2) {
      const platformId = await getPlatformId(platform);
      const { data } = await supabaseAdmin
        .from(handlesTable)
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform_id', platformId)
        .single();
      handle = data;
    } else {
      const { data } = await supabaseAdmin
        .from(handlesTable)
        .select('handle')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .single();
      handle = data;
    }

    if (!handle) {
      return { success: false, error: `No ${platform} handle connected` };
    }
    // Initialize aggregator and CLIST service
    const aggregator = new ProblemSolvingAggregator();
    const clistService = new ClistService();
    const clistConfigured = clistService.isConfigured();

    // STEP 1: Sync submissions
    const submissionsResult = await aggregator.syncPlatformSubmissions(
      user.id,
      platform,
      forceFullSync,
      manualHtml
    );

    // Check for errors - syncPlatformSubmissions may return 'error' (string) or 'errors' (array)
    if (submissionsResult.error) {
      return { success: false, error: submissionsResult.error };
    }

    // For SPOJ: if Cloudflare blocked the sync and no manual HTML was provided,
    // return a clear error instead of silently succeeding with 0 submissions
    if (
      platform === 'spoj' &&
      !manualHtml &&
      submissionsResult.extensionRequired &&
      (submissionsResult.synced || 0) === 0
    ) {
      return {
        success: false,
        error:
          'SPOJ is protected by Cloudflare and cannot be synced automatically. Use the "Manual Import" button on the SPOJ card — visit your SPOJ profile, Select All (Ctrl+A), Copy (Ctrl+C), then paste it in.',
      };
    }

    // Facebook Hacker Cup currently depends on browser-extension extraction.
    if (
      platform === 'facebookhackercup' &&
      submissionsResult.extensionRequired &&
      (submissionsResult.synced || 0) === 0
    ) {
      return {
        success: false,
        error:
          'Facebook Hacker Cup sync tried CLIST first, but CLIST could not map your connected handle to an account. CLIST usually stores FBHC account handles as numeric IDs (not username aliases). Update your connected FBHC handle to the CLIST account handle if available, or use browser extension import from your Hacker Cup profile/competition history page, then refresh this dashboard.',
      };
    }

    const submissionsSynced = submissionsResult.synced || 0;

    // STEP 2: Sync rating history via CLIST with fallback
    let ratingHistorySynced = 0;
    if (clistConfigured) {
      try {
        const ratingHistory = await clistService.getRatingHistory(
          platform,
          handle.handle,
          user.id // Pass userId for caching
        );

        if (ratingHistory && ratingHistory.length > 0) {
          const ratingResult = await clistService.saveRatingHistory(
            user.id,
            ratingHistory,
            'clist'
          );
          ratingHistorySynced = ratingResult.saved || 0;
        }
      } catch (ratingError) {
        console.warn(
          `[syncPlatformAction] Rating sync failed for ${platform}:`,
          ratingError.message
        );
      }
    }

    // STEP 3: Sync contest history via CLIST with fallback
    let contestHistorySynced = 0;
    if (clistConfigured) {
      try {
        const contestHistory = await clistService.getContestHistory(
          platform,
          handle.handle,
          10000, // Fetch all contests
          user.id // Pass userId for caching
        );

        if (contestHistory && contestHistory.length > 0) {
          const contestResult = await clistService.saveContestHistory(
            user.id,
            contestHistory,
            'clist'
          );
          contestHistorySynced = contestResult.saved || 0;
        }
      } catch (contestError) {
        console.warn(
          `[syncPlatformAction] Contest sync failed for ${platform}:`,
          contestError.message
        );
      }
    }

    // Update user statistics with platform stats (this updates the platform card data)
    await aggregator.updateUserStatistics(user.id, true);

    // Update last_synced_at for this platform handle
    if (useV2) {
      const platformId = await getPlatformId(platform);
      await supabaseAdmin
        .from(V2_TABLES.USER_HANDLES)
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('platform_id', platformId);
    } else {
      await supabaseAdmin
        .from('user_handles')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('platform', platform);
    }

    // Update leaderboard
    await rebuildLeaderboard();

    // Revalidate all problem-solving related paths to clear Next.js cache
    revalidatePath('/account/member/problem-solving', 'page');
    revalidatePath('/api/problem-solving/problems', 'page');
    revalidatePath('/api/problem-solving/stats', 'page');

    let message = `Synced ${submissionsSynced} submissions, ${ratingHistorySynced} rating entries, ${contestHistorySynced} contest entries from ${platform}`;
    if (isLeetCode) {
      message +=
        ' For full LeetCode submission history, use the browser extension extractor.';
    }

    return {
      success: true,
      data: {
        synced: submissionsSynced,
        platform,
        ratingHistorySynced,
        contestHistorySynced,
        extensionRequired: submissionsResult.extensionRequired || false,
        message,
      },
    };
  } catch (error) {
    console.error(`Error syncing ${platform}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync contest history specifically (with force update to get problem badges)
 * This will update existing records with new problem data from CLIST
 */
export async function syncContestHistoryAction(forceUpdate = true) {
  try {
    const { user } = await requireRole('member');

    // Get user's connected handles
    const { data: handles } = await supabaseAdmin
      .from('user_handles')
      .select('platform, handle')
      .eq('user_id', user.id);

    if (!handles || handles.length === 0) {
      return {
        success: false,
        error: 'No handles connected. Connect a platform first.',
      };
    }

    const clistService = new ClistService();

    if (!clistService.isConfigured()) {
      return {
        success: false,
        error: 'Contest history service is not configured.',
      };
    }

    // Starting contest history sync

    const handlesList = handles.map((h) => ({
      platform: h.platform,
      handle: h.handle,
    }));

    // Fetch contest history from CLIST
    const contestHistory = await clistService.getAggregatedContestHistory(
      handlesList,
      10000 // Fetch ALL contests
    );

    if (!contestHistory || contestHistory.length === 0) {
      return {
        success: true,
        data: {
          synced: 0,
          message: 'No contest history found for your handles.',
        },
      };
    }

    // Contests fetched successfully

    // If forceUpdate is true, update existing records with new problem data
    let saved = 0;
    let updated = 0;

    if (forceUpdate) {
      // Get existing contest history for this user - fetch FULL records for smart merge
      const { data: existingContests } = await supabaseAdmin
        .from('contest_history')
        .select('*')
        .eq('user_id', user.id);

      // Map by composite key, storing full record for smart merge comparison
      const existingMap = new Map(
        (existingContests || []).map((c) => [
          `${c.platform_id}:${c.external_contest_id}`,
          c, // Store full record, not just id
        ])
      );

      // Separate new and existing records
      const newRecords = [];
      const updateRecords = [];

      for (const entry of contestHistory) {
        // Get platform_id from platform code
        const platformId = await getPlatformId(entry.platform);
        if (!platformId) {
          console.warn(
            `[syncContestHistoryAction] Unknown platform: ${entry.platform}`
          );
          continue;
        }

        const key = `${platformId}:${entry.contestId}`;

        const record = {
          user_id: user.id,
          platform_id: platformId,
          external_contest_id: entry.contestId?.toString(),
          contest_name: entry.name || entry.contestName,
          contest_url: entry.url || entry.contestUrl || null,
          contest_date: entry.date,
          contest_end_date: entry.endDate || null,
          duration_minutes: entry.durationMinutes || entry.duration || null,
          rank: entry.rank || null,
          total_participants: entry.totalParticipants || null,
          score: entry.score || null,
          max_score: entry.maxScore || null,
          problems_solved: entry.solved || entry.problemsSolved || 0,
          problems_attempted: entry.problemsAttempted || null,
          total_problems: entry.totalProblems || null,
          problems_data: entry.problems || null, // jsonb column - no need to stringify
          penalty: entry.penalty || null,
          platform_contest_id: entry.platformContestId || null,
          old_rating: entry.oldRating || null,
          new_rating: entry.newRating || null,
          rating_change: entry.ratingChange || null,
          is_rated: entry.isRated !== false,
          is_virtual: entry.isVirtual || false,
          division: entry.division || null,
        };

        // Check if totalParticipants is missing
        if (!record.total_participants && record.rank) {
          // Contest has rank but no totalParticipants
        } else if (record.total_participants && record.rank) {
          // Contest has both rank and totalParticipants
        }

        const existingRecord = existingMap.get(key);

        if (existingRecord) {
          // Store existing record with new data for smart merge
          updateRecords.push({ existingRecord, newData: record });
        } else {
          newRecords.push(record);
        }
      }

      // Insert new records
      if (newRecords.length > 0) {
        const { data, error: insertError } = await supabaseAdmin
          .from('contest_history')
          .insert(newRecords)
          .select('id');

        if (insertError) {
          console.error(
            '[syncContestHistoryAction] Insert error:',
            insertError.message
          );
        } else {
          saved = data?.length || newRecords.length;
        }
      }

      // Update existing records using SMART MERGE
      // Only update fields where new data is "better" than existing
      let updateErrors = 0;
      let _skippedUpdates = 0; // Tracked but not reported (smart merge optimization)

      for (const { existingRecord, newData } of updateRecords) {
        // Use smart merge to determine what actually needs updating
        const smartUpdate = buildSmartUpdate(existingRecord, newData);

        if (!smartUpdate) {
          // No updates needed - existing data is already good
          _skippedUpdates++;
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from('contest_history')
          .update(smartUpdate)
          .eq('id', existingRecord.id);

        if (updateError) {
          updateErrors++;
          console.error(
            `[syncContestHistoryAction] Update error for contest ${existingRecord.id}:`,
            updateError.message
          );
        } else {
          updated++;
        }
      }

      if (updateErrors > 0) {
        console.warn(
          `[syncContestHistoryAction] ${updateErrors} update errors occurred`
        );
      }

      // Records saved and updated successfully
    } else {
      // Just save new records (default behavior)
      const result = await clistService.saveContestHistory(
        user.id,
        contestHistory,
        'clist'
      );
      saved = result.saved || 0;
    }

    // Update contest names with real names from CLIST API
    // This fixes any contests saved with generic "Contest #ID" names
    const nameUpdateResult = await clistService.updateContestNamesInDatabase(
      user.id
    );
    const namesUpdated = nameUpdateResult.updated || 0;

    // Update user statistics with platform stats after contest sync
    const aggregator = new ProblemSolvingAggregator();
    await aggregator.updateUserStatistics(user.id, true);

    // Revalidate problem-solving pages to show updated contest data
    revalidatePath('/account/member/problem-solving', 'page');
    revalidatePath('/api/problem-solving/stats', 'page');

    return {
      success: true,
      data: {
        synced: saved,
        updated: updated,
        namesUpdated: namesUpdated,
        total: contestHistory.length,
        message: `Synced ${saved} new, updated ${updated} existing contest${saved + updated !== 1 ? 's' : ''}${namesUpdated > 0 ? `, enriched ${namesUpdated} contest name${namesUpdated !== 1 ? 's' : ''}` : ''}`,
      },
    };
  } catch (error) {
    console.error('[syncContestHistoryAction] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update contest names in database with real names from CLIST API
 * This fixes contests that were saved with generic "Contest #ID" names
 * @param {boolean} allUsers - If true, update for all users; if false, only current user
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateContestNamesAction(allUsers = false) {
  'use server';
  try {
    const { user } = await requireRole('member');

    const clistService = new ClistService();

    if (!clistService.isConfigured()) {
      return {
        success: false,
        error: 'CLIST service is not configured.',
      };
    }

    // Only admins can update for all users
    let targetUserId = user.id;
    if (allUsers) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        targetUserId = user.id; // Non-admins can only update their own
      } else {
        targetUserId = null; // null means all users
      }
    }

    const result =
      await clistService.updateContestNamesInDatabase(targetUserId);

    // Revalidate problem-solving pages to show updated contest data
    revalidatePath('/account/member/problem-solving', 'page');

    return {
      success: true,
      data: {
        updated: result.updated,
        errors: result.errors,
        remaining: result.remaining,
        message: `Updated ${result.updated} contest name${result.updated !== 1 ? 's' : ''}${result.remaining > 0 ? `, ${result.remaining} remaining` : ''}`,
      },
    };
  } catch (error) {
    console.error('[updateContestNamesAction] Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LEADERBOARD
// ============================================

/**
 * Fetch platform statistics from external APIs and update user_problem_stats (NEW SCHEMA)
 * This function is deprecated in the Codeforces-only approach but kept for compatibility
 */
export async function fetchPlatformStatsAction() {
  try {
    const { user } = await requireRole('member');

    // In new schema, stats are calculated from actual problem solves
    // This function could trigger a recalculation instead of fetching from external APIs

    console.warn(
      'fetchPlatformStatsAction: This function is deprecated in new schema. Use Codeforces scraper instead.'
    );

    // Get current user stats
    const { data: currentStats } = await supabaseAdmin
      .from('user_problem_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!currentStats) {
      // Create empty stats record
      await supabaseAdmin
        .from('user_problem_stats')
        .insert({ user_id: user.id });
    }

    return {
      success: true,
      data: {
        message:
          'Use /api/problem-solving/import-codeforces for data import in new schema',
        stats: currentStats || {},
      },
    };
  } catch (error) {
    console.error('Error in fetchPlatformStatsAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync submissions AND fetch platform stats in one action
 * Use this for a full refresh of user data
 * @param {boolean} forceFullSync - If true, fetches ALL submissions (not just new ones)
 */
/**
 * Full sync action - syncs ALL platforms with submissions, rating history, and contest history
 * Uses CLIST API with fallbacks and caching for comprehensive data sync
 */
export async function fullSyncAction(forceFullSync = false) {
  try {
    const { user } = await requireRole('member');

    // Check rate limit using user_problem_stats table
    const { data: userStats } = await supabaseAdmin
      .from('user_problem_stats')
      .select('updated_at')
      .eq('user_id', user.id)
      .single();

    if (userStats?.updated_at) {
      const timeSinceSync =
        Date.now() - new Date(userStats.updated_at).getTime();
      const SYNC_COOLDOWN_MS = 60000; // 1 minute cooldown

      if (timeSinceSync < SYNC_COOLDOWN_MS && !forceFullSync) {
        const waitTime = Math.ceil((SYNC_COOLDOWN_MS - timeSinceSync) / 1000);
        return {
          success: false,
          error: `Please wait ${waitTime} seconds before syncing again.`,
        };
      }
    }

    // Get user handles for ALL platforms
    const useV2 = await isV2SchemaAvailable();
    let handles = [];

    if (useV2) {
      handles = await getUserHandlesV2(user.id);
    } else {
      const { data: legacyHandles } = await supabaseAdmin
        .from('user_handles')
        .select('platform, handle')
        .eq('user_id', user.id);
      handles = legacyHandles || [];
    }

    if (!handles || handles.length === 0) {
      return {
        success: false,
        error:
          'No platform handles connected. Please connect at least one platform handle first.',
      };
    }
    // Initialize aggregator and CLIST service
    const aggregator = new ProblemSolvingAggregator();
    const clistService = new ClistService();
    const clistConfigured = clistService.isConfigured();

    // Track results from all platforms
    let totalSubmissions = 0;
    let totalRatingHistorySynced = 0;
    let totalContestHistorySynced = 0;
    const platformResults = [];

    // Sync each platform
    for (const handleRecord of handles) {
      const { platform, handle } = handleRecord;

      try {
        // STEP 1: Sync submissions
        const submissionsResult = await aggregator.syncPlatformSubmissions(
          user.id,
          platform,
          forceFullSync
        );

        const submissionsSynced = submissionsResult.synced || 0;
        totalSubmissions += submissionsSynced;

        // STEP 2: Sync rating history via CLIST with fallback
        let ratingHistorySynced = 0;
        if (clistConfigured) {
          try {
            const ratingHistory = await clistService.getRatingHistory(
              platform,
              handle,
              user.id // Pass userId for caching
            );

            if (ratingHistory && ratingHistory.length > 0) {
              const ratingResult = await clistService.saveRatingHistory(
                user.id,
                ratingHistory,
                'clist'
              );
              ratingHistorySynced = ratingResult.saved || 0;
              totalRatingHistorySynced += ratingHistorySynced;
            }
          } catch (ratingError) {
            console.warn(
              `[fullSyncAction] Rating sync failed for ${platform}:`,
              ratingError.message
            );
          }
        }

        // STEP 3: Sync contest history via CLIST with fallback
        let contestHistorySynced = 0;
        if (clistConfigured) {
          try {
            const contestHistory = await clistService.getContestHistory(
              platform,
              handle,
              10000, // Fetch all contests
              user.id // Pass userId for caching
            );
            if (contestHistory && contestHistory.length > 0) {
              const contestResult = await clistService.saveContestHistory(
                user.id,
                contestHistory,
                'clist'
              );
              contestHistorySynced =
                (contestResult.saved || 0) + (contestResult.updated || 0);
              totalContestHistorySynced += contestHistorySynced;
            }
          } catch (contestError) {
            console.warn(
              `[fullSyncAction] Contest sync failed for ${platform}:`,
              contestError.message
            );
          }
        }

        platformResults.push({
          platform,
          synced: submissionsSynced,
          ratingHistorySynced,
          contestHistorySynced,
        });
      } catch (platformError) {
        console.error(
          `[fullSyncAction] Platform sync failed for ${platform}:`,
          platformError.message
        );
        platformResults.push({
          platform,
          synced: 0,
          error: platformError.message,
        });
      }
    }

    // Update user statistics with platform stats
    await aggregator.updateUserStatistics(user.id, true);

    // STEP 4: Run aggregated contest history sync with problem data enrichment
    // This fetches all contests across all platforms with comprehensive data
    let contestNamesUpdated = 0;
    if (clistConfigured) {
      try {
        // Format handles for getAggregatedContestHistory
        const handlesList = handles.map((h) => ({
          platform: h.platform,
          handle: h.handle,
        }));

        // Fetch aggregated contest history with problem data enrichment
        const aggregatedContests =
          await clistService.getAggregatedContestHistory(
            handlesList,
            10000, // Fetch ALL contests
            true // Enable problem enrichment
          );

        if (aggregatedContests && aggregatedContests.length > 0) {
          // Save with comprehensive data (problems_data, total_problems, etc.)
          const aggregatedResult = await clistService.saveContestHistory(
            user.id,
            aggregatedContests,
            'clist'
          );
        }

        // Update contest names with real names from CLIST API
        const nameUpdateResult =
          await clistService.updateContestNamesInDatabase(user.id);
        contestNamesUpdated = nameUpdateResult.updated || 0;

        if (contestNamesUpdated > 0) {
        }
      } catch (aggregateError) {
        console.warn(
          '[fullSyncAction] Aggregated contest sync failed:',
          aggregateError.message
        );
      }
    }

    // Update last_synced_at for all synced platform handles
    if (useV2) {
      const platformIds = handles.map((h) => h.platform_id).filter(Boolean);
      if (platformIds.length > 0) {
        await supabaseAdmin
          .from(V2_TABLES.USER_HANDLES)
          .update({ last_synced_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('platform_id', platformIds);
      }
    } else {
      const platforms = handles.map((h) => h.platform);
      await supabaseAdmin
        .from('user_handles')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('platform', platforms);
    }

    // Update leaderboard
    await rebuildLeaderboard();

    // Revalidate all problem-solving related paths to clear Next.js cache
    revalidatePath('/account/member/problem-solving', 'page');
    revalidatePath('/api/problem-solving/problems', 'page');
    revalidatePath('/api/problem-solving/stats', 'page');

    const message = `Sync completed: ${totalSubmissions} submissions, ${totalRatingHistorySynced} rating entries, ${totalContestHistorySynced} contest entries from ${handles.length} platform(s)${contestNamesUpdated > 0 ? `, ${contestNamesUpdated} contest names enriched` : ''}`;
    return {
      success: true,
      data: {
        synced: totalSubmissions,
        platforms: platformResults,
        ratingHistorySynced: totalRatingHistorySynced,
        contestHistorySynced: totalContestHistorySynced,
        contestNamesUpdated,
        message,
      },
    };
  } catch (error) {
    console.error('Error in full sync:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboardAction(
  type = 'global',
  limit = 50,
  offset = 0
) {
  try {
    await requireRole('member');

    const sortColumn =
      {
        global: 'global_rank',
        weekly: 'weekly_rank',
        monthly: 'monthly_rank',
      }[type] || 'global_rank';

    const {
      data: leaderboard,
      error,
      count,
    } = await supabaseAdmin
      .from('leaderboard_cache')
      .select(
        `
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .order(sortColumn, { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const formattedLeaderboard = (leaderboard || []).map((entry) => ({
      rank: entry[sortColumn],
      userId: entry.user_id,
      name: entry.users?.full_name || 'Unknown',
      avatar: entry.users?.avatar_url,
      score:
        type === 'global'
          ? entry.total_score
          : type === 'weekly'
            ? entry.weekly_score
            : entry.monthly_score,
      totalSolved: entry.total_solved,
      weeklySolved: entry.weekly_solved,
      monthlySolved: entry.monthly_solved,
    }));

    return {
      success: true,
      data: {
        type,
        leaderboard: formattedLeaderboard,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch leaderboard. Please try again.',
    };
  }
}

// ============================================
// TAG STATISTICS
// ============================================

/**
 * Get tag statistics for the current user
 * Returns aggregated counts of problems solved by tag
 */
export async function getTagStatisticsAction() {
  try {
    const { user } = await requireRole('member');

    const tagService = new ProblemTagService();
    const tagStats = await tagService.getTagStatistics(user.id);

    return {
      success: true,
      data: {
        tag_stats: tagStats,
        total_tags: Object.keys(tagStats).length,
      },
    };
  } catch (error) {
    console.error('Error fetching tag statistics:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch tag statistics',
    };
  }
}

/**
 * Update missing tags for problems that don't have tags
 * Uses AI detection when platform tags aren't available
 */
export async function updateMissingTagsAction(limit = 50) {
  try {
    const { user } = await requireRole('member');

    const tagService = new ProblemTagService();
    const result = await tagService.updateMissingTags(user.id, limit);

    return {
      success: true,
      data: {
        updated: result.updated,
        errors: result.errors,
        message: `Updated tags for ${result.updated} problems`,
      },
    };
  } catch (error) {
    console.error('Error updating missing tags:', error);
    return {
      success: false,
      error: error.message || 'Failed to update missing tags',
    };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Normalize platform handle input (supports LeetCode URL/@ formats)
 */
function normalizeHandleForPlatform(platform, rawHandle) {
  const trimmed = String(rawHandle || '').trim();
  if (!trimmed) return '';

  if (platform !== 'leetcode') {
    return trimmed;
  }

  let normalized = trimmed.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\//i,
    ''
  );
  normalized = normalized.replace(/^(?:u|profile)\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();
  return normalized;
}

/**
 * Verify that a handle exists on a platform
 * @param {string} platform - Platform ID
 * @param {string} handle - Handle to verify
 */
async function verifyHandle(platform, handle) {
  switch (platform) {
    case 'codeforces': {
      const service = new CodeforcesService();
      return await service.getUserInfo(handle);
    }
    case 'atcoder': {
      const service = new AtCoderService();
      return await service.getUserStats(handle);
    }
    case 'leetcode': {
      const service = new LeetCodeService();
      return await service.getUserProfile(handle);
    }
    case 'toph': {
      const service = new TophService();
      return await service.getUserProfile(handle);
    }
    case 'codechef': {
      const service = new CodeChefService();
      return await service.getUserProfile(handle);
    }
    case 'topcoder': {
      const service = new TopCoderService();
      return await service.getUserProfile(handle);
    }
    case 'hackerrank': {
      const service = new HackerRankService();
      return await service.getUserProfile(handle);
    }
    case 'kattis': {
      const service = new KattisService();
      return await service.getUserProfile(handle);
    }
    case 'lightoj': {
      const service = new LightOJService();
      return await service.getUserProfile(handle);
    }
    case 'uva': {
      const service = new UVAService();
      return await service.getUserProfile(handle);
    }
    case 'spoj': {
      const service = new SPOJService();
      return await service.getUserProfile(handle);
    }
    case 'vjudge': {
      const service = new VJudgeService();
      return await service.getUserProfile(handle);
    }
    case 'cfgym': {
      const service = new CFGymService();
      return await service.getUserInfo(handle);
    }
    case 'csacademy': {
      const service = new CSAcademyService();
      return await service.getUserProfile(handle);
    }
    case 'eolymp': {
      const service = new EOlympService();
      return await service.getUserProfile(handle);
    }
    case 'usaco': {
      const service = new USACOService();
      return await service.getUserProfile(handle);
    }
    case 'cses': {
      const service = new CSESService();
      return await service.getUserProfile(handle);
    }
    default:
      // For platforms without verification, just accept the handle
      return { handle };
  }
}

/**
 * Rebuild the leaderboard cache with current rankings (NEW SCHEMA)
 * This is called after sync operations to update user rankings
 */
async function rebuildLeaderboard() {
  try {
    // Check if V2 schema is available
    const useV2 = await isV2SchemaAvailable();
    const statsTable = useV2 ? V2_TABLES.USER_STATS : 'user_problem_stats';

    // Get all user statistics from stats table
    const { data: users, error: usersError } = await supabaseAdmin
      .from(statsTable)
      .select(
        'user_id, total_solved, total_solutions, current_streak, solved_this_week, solved_this_month, weighted_score'
      )
      .gt('total_solved', 0)
      .order('total_solved', { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return { success: true, updated: 0 };
    }

    // Calculate ranked leaderboards for global, weekly, and monthly
    const globalRanked = [...users]
      .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0))
      .map((user, index) => ({ ...user, global_rank: index + 1 }));

    const weeklyRanked = [...users]
      .sort((a, b) => (b.solved_this_week || 0) - (a.solved_this_week || 0))
      .map((user, index) => ({ ...user, weekly_rank: index + 1 }));

    const monthlyRanked = [...users]
      .sort((a, b) => (b.solved_this_month || 0) - (a.solved_this_month || 0))
      .map((user, index) => ({ ...user, monthly_rank: index + 1 }));

    // Map ranks back to user_id
    const globalRankMap = new Map(
      globalRanked.map((u) => [u.user_id, u.global_rank])
    );
    const weeklyRankMap = new Map(
      weeklyRanked.map((u) => [u.user_id, u.weekly_rank])
    );
    const monthlyRankMap = new Map(
      monthlyRanked.map((u) => [u.user_id, u.monthly_rank])
    );

    // Build leaderboard cache records
    const leaderboardRecords = users.map((user) => ({
      user_id: user.user_id,
      global_rank: globalRankMap.get(user.user_id) || null,
      weekly_rank: weeklyRankMap.get(user.user_id) || null,
      monthly_rank: monthlyRankMap.get(user.user_id) || null,
      total_score: user.weighted_score || 0,
      weekly_score: (user.solved_this_week || 0) * 1, // Simple multiplier for weekly
      monthly_score: (user.solved_this_month || 0) * 1, // Simple multiplier for monthly
      total_solved: user.total_solved,
      weekly_solved: user.solved_this_week || 0,
      monthly_solved: user.solved_this_month || 0,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert to leaderboard_cache
    if (leaderboardRecords.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('leaderboard_cache')
        .upsert(leaderboardRecords, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.warn('leaderboard_cache upsert error:', upsertError.message);
      } else {
        console.log(`[LEADERBOARD] Updated ${leaderboardRecords.length} users`);
      }
    }

    return { success: true, updated: users.length };
  } catch (error) {
    // Error rebuilding leaderboard
    throw error;
  }
}

function _getDefaultStatistics() {
  return {
    total_solved: 0,
    total_submissions: 0,
    acceptance_rate: 0,
    current_streak: 0,
    longest_streak: 0,
    easy_solved: 0,
    medium_solved: 0,
    hard_solved: 0,
    expert_solved: 0,
    solved_this_week: 0,
    solved_this_month: 0,
    weighted_score: 0,
    platform_stats: {
      codeforces: { solved: 0, rating: 0, max_rating: 0, contests: 0 },
      atcoder: { solved: 0, rating: 0, max_rating: 0, contests: 0 },
      leetcode: { solved: 0, easy: 0, medium: 0, hard: 0 },
      toph: { solved: 0, rating: 0, contests: 0 },
      cses: { solved: 0 },
      codechef: { solved: 0, rating: 0, max_rating: 0, stars: 0, contests: 0 },
      topcoder: { solved: 0, rating: 0, max_rating: 0 },
      hackerrank: { solved: 0, badges: 0, certificates: 0 },
      kattis: { solved: 0, score: 0, rank: 0 },
      lightoj: { solved: 0 },
      uva: { solved: 0, submissions: 0 },
      spoj: { solved: 0, rank: 0 },
      vjudge: { solved: 0, acRecords: {} },
      cfgym: { solved: 0, contests: 0 },
      csacademy: { solved: 0, rating: 0 },
      eolymp: { solved: 0, rating: 0 },
      usaco: { solved: 0, division: null },
    },
  };
}
