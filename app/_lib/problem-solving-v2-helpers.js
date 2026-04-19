/**
 * @file Problem Solving - V2 Schema Helpers
 * @module problem-solving-v2-helpers
 *
 * Helper functions for working with the V2 database schema.
 * Provides platform ID lookups and common query patterns.
 */

import { supabaseAdmin } from './supabase.js';

// ============================================
// PLATFORM ID CACHE
// ============================================

// In-memory cache for platform lookups (populated on first use)
let platformCache = null;
let platformCacheExpiry = 0;
let platformCacheLoadingPromise = null; // Prevent concurrent loading
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const PLATFORM_CODE_ALIASES = {
  leetcodecn: 'leetcode',
  'leetcode-cn': 'leetcode',
  leetcodecom: 'leetcode',
  hackercup: 'facebookhackercup',
  'hacker-cup': 'facebookhackercup',
  'facebook-hacker-cup': 'facebookhackercup',
  metahackercup: 'facebookhackercup',
  'meta-hacker-cup': 'facebookhackercup',
};

function getPlatformCodeCandidates(code) {
  const normalized = String(code || '')
    .trim()
    .toLowerCase();
  if (!normalized) return [];

  const candidates = new Set([normalized]);

  const aliased = PLATFORM_CODE_ALIASES[normalized];
  if (aliased) {
    candidates.add(aliased);
  }

  Object.entries(PLATFORM_CODE_ALIASES).forEach(([alias, canonical]) => {
    if (canonical === normalized) {
      candidates.add(alias);
    }
  });

  return Array.from(candidates);
}

/**
 * Load all active platforms from platforms table into cache
 * @returns {Promise<Object>} Cache with byCode/byId maps
 */
async function loadPlatformCache() {
  const now = Date.now();

  // Return cached data if still valid
  if (platformCache && now < platformCacheExpiry) {
    return platformCache;
  }

  // If another load is in progress, wait for it
  if (platformCacheLoadingPromise) {
    return platformCacheLoadingPromise;
  }

  // Start loading with lock
  platformCacheLoadingPromise = (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('platforms')
        .select('id, code, name, is_active')
        .eq('is_active', true);

      if (error) {
        console.error(
          '[V2 Helpers] Failed to load platform cache:',
          error.message
        );
        // Return existing cache if available, even if expired
        if (platformCache) return platformCache;
        throw new Error(`Failed to load platforms: ${error.message}`);
      }

      // Build cache maps
      platformCache = {
        byCode: new Map(),
        byId: new Map(),
        all: data || [],
      };

      (data || []).forEach((platform) => {
        platformCache.byCode.set(platform.code, platform);
        platformCache.byId.set(platform.id, platform);
      });

      platformCacheExpiry = now + CACHE_TTL_MS;
      // Platform cache loaded successfully

      return platformCache;
    } catch (err) {
      console.error('[V2 Helpers] Failed to load platform cache:', err.message);
      if (platformCache) return platformCache;
      throw err;
    } finally {
      platformCacheLoadingPromise = null;
    }
  })();

  return platformCacheLoadingPromise;
}

/**
 * Invalidate the platform cache (call after platform updates)
 */
export function invalidatePlatformCache() {
  platformCache = null;
  platformCacheExpiry = 0;
  platformCacheLoadingPromise = null;
}

/**
 * Pre-load the platform cache before batch operations.
 * Call this once before processing many records.
 */
export async function ensurePlatformCacheLoaded() {
  await loadPlatformCache();
}

// ============================================
// LANGUAGE CACHE
// ============================================

let languageCache = null;
let languageCacheExpiry = 0;
let languageCacheLoadingPromise = null; // Prevent concurrent loading
const LANGUAGE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeLanguageCode(input) {
  const raw = (input || '').toString().trim().toLowerCase();
  if (!raw) return null;

  // Common competitive programming platform strings
  if (raw.includes('gnu c++') || raw.includes('g++') || raw.includes('c++')) {
    return 'cpp';
  }
  if (raw === 'c') return 'c';
  if (raw.includes('python')) return 'python';
  if (raw.includes('pypy')) return 'pypy';
  if (raw.includes('java')) return 'java';
  if (raw.includes('javascript') || raw === 'js' || raw.includes('node')) {
    return 'javascript';
  }
  if (raw.includes('typescript') || raw === 'ts') return 'typescript';
  if (raw.includes('c#') || raw.includes('csharp')) return 'csharp';
  if (raw.includes('go') || raw.includes('golang')) return 'go';
  if (raw.includes('rust')) return 'rust';
  if (raw.includes('kotlin')) return 'kotlin';
  if (raw.includes('swift')) return 'swift';
  if (raw.includes('php')) return 'php';
  if (raw.includes('ruby')) return 'ruby';

  // Fall back to raw token if it looks like a reasonable code
  return raw.replace(/\s+/g, '-');
}

async function loadLanguageCache() {
  const now = Date.now();

  // Return cached data if still valid
  if (languageCache && now < languageCacheExpiry) {
    return languageCache;
  }

  // If another load is in progress, wait for it
  if (languageCacheLoadingPromise) {
    return languageCacheLoadingPromise;
  }

  // Start loading with lock
  languageCacheLoadingPromise = (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('languages')
        .select('id, code, name');

      if (error) {
        console.error(
          '[V2 Helpers] Failed to load language cache:',
          error.message
        );
        // Return existing cache if available, even if expired
        if (languageCache) return languageCache;
        // Return empty cache as fallback to avoid blocking sync
        return {
          byCode: new Map(),
          byId: new Map(),
          all: [],
        };
      }

      languageCache = {
        byCode: new Map(),
        byId: new Map(),
        all: data || [],
      };

      (data || []).forEach((lang) => {
        if (lang.code) languageCache.byCode.set(lang.code.toLowerCase(), lang);
        languageCache.byId.set(lang.id, lang);
      });

      languageCacheExpiry = now + LANGUAGE_CACHE_TTL_MS;
      return languageCache;
    } catch (err) {
      console.error('[V2 Helpers] Failed to load language cache:', err.message);
      // Return existing cache if available, even if expired
      if (languageCache) return languageCache;
      // Return empty cache as fallback
      return {
        byCode: new Map(),
        byId: new Map(),
        all: [],
      };
    } finally {
      languageCacheLoadingPromise = null;
    }
  })();

  return languageCacheLoadingPromise;
}

export function invalidateLanguageCache() {
  languageCache = null;
  languageCacheExpiry = 0;
  languageCacheLoadingPromise = null;
}

/**
 * Pre-load the language cache before batch operations.
 * Call this once before processing many submissions.
 */
export async function ensureLanguageCacheLoaded() {
  await loadLanguageCache();
}

/**
 * Get language id from a code/name-like input.
 * Returns null if not found.
 */
export async function getLanguageId(input) {
  const normalized = normalizeLanguageCode(input);
  if (!normalized) return null;

  const cache = await loadLanguageCache();
  const lang = cache.byCode.get(normalized);
  return lang?.id || null;
}

/**
 * Get language code from a language id.
 */
export async function getLanguageCode(id) {
  if (!id) return null;
  const cache = await loadLanguageCache();
  const lang = cache.byId.get(id);
  return lang?.code || null;
}

// ============================================
// PLATFORM ID LOOKUPS
// ============================================

/**
 * Get platform ID from platform code
 * @param {string} code - Platform code (e.g., 'codeforces')
 * @returns {Promise<number|null>} Platform ID or null if not found
 */
export async function getPlatformId(code) {
  if (!code) return null;

  const cache = await loadPlatformCache();
  const candidates = getPlatformCodeCandidates(code);

  for (const candidate of candidates) {
    const platform = cache.byCode.get(candidate);
    if (platform?.id != null) {
      return platform.id;
    }
  }

  return null;
}

/**
 * Get platform code from platform ID
 * @param {number} id - Platform ID
 * @returns {Promise<string|null>} Platform code or null if not found
 */
export async function getPlatformCode(id) {
  if (!id) return null;

  const cache = await loadPlatformCache();
  const platform = cache.byId.get(id);
  return platform?.code || null;
}

/**
 * Get full platform info from code
 * @param {string} code - Platform code
 * @returns {Promise<Object|null>} Platform object or null
 */
export async function getPlatformByCode(code) {
  if (!code) return null;

  const cache = await loadPlatformCache();
  const candidates = getPlatformCodeCandidates(code);

  for (const candidate of candidates) {
    const platform = cache.byCode.get(candidate);
    if (platform) {
      return platform;
    }
  }

  return null;
}

/**
 * Get full platform info from ID
 * @param {number} id - Platform ID
 * @returns {Promise<Object|null>} Platform object or null
 */
export async function getPlatformById(id) {
  if (!id) return null;

  const cache = await loadPlatformCache();
  return cache.byId.get(id) || null;
}

/**
 * Get all active platforms
 * @returns {Promise<Array>} Array of platform objects
 */
export async function getAllPlatforms() {
  const cache = await loadPlatformCache();
  return cache.all;
}

/**
 * Get multiple platform IDs at once (batch lookup)
 * @param {Array<string>} codes - Array of platform codes
 * @returns {Promise<Map<string, number>>} Map of code -> id
 */
export async function getPlatformIds(codes) {
  const cache = await loadPlatformCache();
  const result = new Map();

  (codes || []).forEach((code) => {
    const candidates = getPlatformCodeCandidates(code);

    for (const candidate of candidates) {
      const platform = cache.byCode.get(candidate);
      if (platform) {
        result.set(code, platform.id);
        break;
      }
    }
  });

  return result;
}

/**
 * Get multiple platform codes at once (batch lookup)
 * @param {Array<number>} ids - Array of platform IDs
 * @returns {Promise<Map<number, string>>} Map of id -> code
 */
export async function getPlatformCodes(ids) {
  const cache = await loadPlatformCache();
  const result = new Map();

  (ids || []).forEach((id) => {
    const platform = cache.byId.get(id);
    if (platform) {
      result.set(id, platform.code);
    }
  });

  return result;
}

// ============================================
// TABLE NAMES (New Normalized Schema)
// ============================================

/**
 * Table name constants for the normalized problem-solving schema
 * Use these instead of hardcoded strings for easier updates
 */
export const V2_TABLES = {
  // Reference/Lookup tables
  PLATFORMS: 'platforms',
  DIFFICULTY_TIERS: 'difficulty_tiers',
  TAGS: 'tags',
  BADGE_DEFINITIONS: 'badge_definitions',
  LANGUAGES: 'languages',

  // Core problem data
  PROBLEMS: 'problems',
  PROBLEM_TAGS: 'problem_tags',
  PROBLEM_ANALYSIS: 'problem_analysis',
  PROBLEM_EDITORIALS: 'problem_editorials',

  // User connections
  USER_HANDLES: 'user_handles',

  // Submissions & Solves
  SUBMISSIONS: 'submissions',
  UNSOLVED_ATTEMPTS: 'unsolved_attempts',
  USER_SOLVES: 'user_solves',
  SOLUTIONS: 'solutions',
  SOLUTION_ANALYSIS: 'solution_analysis',

  // Contest & Rating
  CONTEST_HISTORY: 'contest_history',
  RATING_HISTORY: 'rating_history',

  // Statistics tables (V3)
  USER_STATS: 'user_stats',
  USER_PLATFORM_STATS: 'user_platform_stats',
  USER_TAG_STATS: 'user_tag_stats',
  USER_TIER_STATS: 'user_tier_stats',
  USER_LANGUAGE_STATS: 'user_language_stats',
  USER_DAILY_ACTIVITY: 'user_daily_activity',

  // Gamification
  USER_GOALS: 'user_goals',
  USER_BADGES: 'user_badges',
  LEADERBOARD_CACHE: 'leaderboard_cache',

  // Sync
  SYNC_JOBS: 'sync_jobs',
  SYNC_CHECKPOINTS: 'sync_checkpoints',
};

// ============================================
// HELPER QUERY FUNCTIONS
// ============================================

/**
 * Get user handles with platform details joined
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User handles with platform info
 */
export async function getUserHandlesV2(userId) {
  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.USER_HANDLES)
    .select(
      `
      *,
      platforms!inner(code, name, profile_url_template)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[V2 Helpers] Error fetching user handles:', error.message);
    throw error;
  }

  // Transform to include platform code at top level for compatibility
  return (data || []).map((handle) => ({
    ...handle,
    platform: handle.platforms?.code,
    platform_name: handle.platforms?.name,
    profile_url_template: handle.platforms?.profile_url_template,
    // Backward compatibility: map current_rating to rating
    rating: handle.current_rating,
  }));
}

/**
 * Get user statistics from V2 schema
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User statistics or null
 */
export async function getUserStatsV2(userId) {
  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.USER_STATS)
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows
    console.error('[V2 Helpers] Error fetching user stats:', error.message);
    throw error;
  }

  return data || null;
}

/**
 * Get user solves with problem details
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} User solves with problem info
 */
export async function getUserSolvesV2(userId, options = {}) {
  const {
    limit = 100,
    offset = 0,
    orderBy = 'first_solved_at',
    ascending = false,
  } = options;

  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.USER_SOLVES)
    .select(
      `
      *,
      problems!inner(
        id, external_id, name, url, difficulty_rating,
        platforms!inner(code, name)
      )
    `
    )
    .eq('user_id', userId)
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[V2 Helpers] Error fetching user solves:', error.message);
    throw error;
  }

  // Transform to include platform code at top level for compatibility
  return (data || []).map((solve) => ({
    ...solve,
    platform: solve.problems?.platforms?.code,
    problem_id: solve.problems?.external_id,
    problem_name: solve.problems?.name,
    problem_url: solve.problems?.url,
    difficulty_rating: solve.problems?.difficulty_rating,
  }));
}

/**
 * Get user submissions with platform info
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} User submissions
 */
export async function getUserSubmissionsV2(userId, options = {}) {
  const {
    limit = 100,
    offset = 0,
    platformCode = null,
    verdict = null,
  } = options;

  let query = supabaseAdmin
    .from(V2_TABLES.SUBMISSIONS)
    .select(
      `
      *,
      platforms!inner(code, name)
    `
    )
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  // Filter by platform if specified
  if (platformCode) {
    const platformId = await getPlatformId(platformCode);
    if (platformId) {
      query = query.eq('platform_id', platformId);
    }
  }

  // Filter by verdict if specified
  if (verdict) {
    query = query.eq('verdict', verdict);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('[V2 Helpers] Error fetching submissions:', error.message);
    throw error;
  }

  // Transform to include platform code at top level
  return (data || []).map((sub) => ({
    ...sub,
    platform: sub.platforms?.code,
  }));
}

/**
 * Upsert a user handle in V2 schema
 * @param {string} userId - User ID
 * @param {string} platformCode - Platform code (e.g., 'codeforces')
 * @param {string} handle - Handle on the platform
 * @param {Object} extraFields - Additional fields to set
 * @returns {Promise<Object>} Created/updated handle
 */
export async function upsertUserHandleV2(
  userId,
  platformCode,
  handle,
  extraFields = {}
) {
  const platformId = await getPlatformId(platformCode);

  if (!platformId) {
    throw new Error(`Unknown platform: ${platformCode}`);
  }

  const upsertHandle = async (payload) => {
    return supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .upsert(payload, { onConflict: 'user_id,platform_id' })
      .select(
        `
      *,
      platforms!inner(code, name)
    `
      )
      .single();
  };

  const basePayload = {
    user_id: userId,
    platform_id: platformId,
    handle,
    ...extraFields,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await upsertHandle(basePayload);

  const isMissingAuthTokenColumn =
    error &&
    (error.code === '42703' ||
      String(error.message || '')
        .toLowerCase()
        .includes('auth_token'));

  if (
    isMissingAuthTokenColumn &&
    Object.prototype.hasOwnProperty.call(basePayload, 'auth_token')
  ) {
    const { auth_token: _ignoredAuthToken, ...fallbackPayload } = basePayload;

    ({ data, error } = await upsertHandle(fallbackPayload));
  }

  if (error) {
    console.error('[V2 Helpers] Error upserting user handle:', error.message);
    throw error;
  }

  return {
    ...data,
    platform: data.platforms?.code,
    // Backward compatibility: map current_rating to rating
    rating: data.current_rating,
  };
}

/**
 * Upsert a problem in the schema
 * @param {string} platformCode - Platform code
 * @param {string} externalId - Platform-specific problem ID
 * @param {Object} problemData - Problem data
 * @returns {Promise<Object>} Created/updated problem
 */
export async function upsertProblemV2(platformCode, externalId, problemData) {
  const platformId = await getPlatformId(platformCode);

  if (!platformId) {
    throw new Error(`Unknown platform: ${platformCode}`);
  }

  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.PROBLEMS)
    .upsert(
      {
        platform_id: platformId,
        external_id: externalId,
        name: problemData.name || problemData.problem_name,
        url: problemData.url || problemData.problem_url,
        difficulty_rating: problemData.difficulty_rating,
        difficulty_tier_id: problemData.difficulty_tier_id || null,
        contest_id: problemData.contest_id,
        time_limit_ms: problemData.time_limit_ms,
        memory_limit_kb: problemData.memory_limit_kb,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'platform_id,external_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[V2 Helpers] Error upserting problem:', error.message);
    throw error;
  }

  return data;
}

/**
 * Record a user solve in the schema
 * @param {string} userId - User ID
 * @param {string} problemUuid - Problem UUID (from problems.id)
 * @param {Object} solveData - Solve data
 * @returns {Promise<Object>} Created/updated solve record
 */
export async function recordUserSolveV2(userId, problemUuid, solveData = {}) {
  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.USER_SOLVES)
    .upsert(
      {
        user_id: userId,
        problem_id: problemUuid,
        first_solved_at: solveData.first_solved_at || new Date().toISOString(),
        solve_count: solveData.solve_count || 1,
        attempt_count: solveData.attempt_count || 1,
        best_time_ms: solveData.best_time_ms,
        best_memory_kb: solveData.best_memory_kb,
        is_favorite: solveData.is_favorite || false,
        notes: solveData.notes || solveData.personal_notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,problem_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[V2 Helpers] Error recording user solve:', error.message);
    throw error;
  }

  return data;
}

/**
 * Record a solution (source code) linked to a user_solve
 * @param {string} userSolveId - user_solves.id UUID
 * @param {Object} solutionData - Solution data
 * @param {string} solutionData.source_code - The source code (required)
 * @param {string} [solutionData.language] - Language name/code (will be resolved to language_id)
 * @param {number} [solutionData.language_id] - Language ID (if already resolved)
 * @param {string} [solutionData.submission_id] - submissions.id UUID (optional link)
 * @param {string} [solutionData.verdict] - Verdict string
 * @param {boolean} [solutionData.is_primary] - Whether this is the primary solution
 * @param {string} [solutionData.personal_notes] - User notes
 * @returns {Promise<Object>} Created solution record
 */
export async function recordSolutionV2(userSolveId, solutionData) {
  if (!userSolveId) {
    throw new Error('userSolveId is required');
  }

  if (!solutionData?.source_code) {
    throw new Error('source_code is required');
  }

  // Resolve language_id if not provided
  const languageId =
    solutionData.language_id || (await getLanguageId(solutionData.language));

  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.SOLUTIONS)
    .insert({
      user_solve_id: userSolveId,
      submission_id: solutionData.submission_id || null,
      source_code: solutionData.source_code,
      language_id: languageId,
      verdict: solutionData.verdict || null,
      is_primary: solutionData.is_primary ?? true, // Default to primary for first solution
      personal_notes: solutionData.personal_notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[V2 Helpers] Error recording solution:', error.message);
    throw error;
  }

  return data;
}

/**
 * Upsert a solution - update if exists for user_solve, insert if not
 * Useful for bulk imports where we want to update source code if solve already exists
 * @param {string} userSolveId - user_solves.id UUID
 * @param {Object} solutionData - Solution data (same as recordSolutionV2)
 * @returns {Promise<Object>} Created/updated solution record
 */
export async function upsertSolutionV2(userSolveId, solutionData) {
  if (!userSolveId) {
    throw new Error('userSolveId is required');
  }

  if (!solutionData?.source_code) {
    // If no source code, nothing to do
    return null;
  }

  // Check if a solution already exists for this user_solve
  const { data: existing } = await supabaseAdmin
    .from(V2_TABLES.SOLUTIONS)
    .select('id')
    .eq('user_solve_id', userSolveId)
    .eq('is_primary', true)
    .maybeSingle();

  // Resolve language_id if not provided
  const languageId =
    solutionData.language_id || (await getLanguageId(solutionData.language));

  if (existing) {
    // Update existing primary solution
    const { data, error } = await supabaseAdmin
      .from(V2_TABLES.SOLUTIONS)
      .update({
        source_code: solutionData.source_code,
        language_id: languageId,
        submission_id: solutionData.submission_id || null,
        verdict: solutionData.verdict || null,
        personal_notes: solutionData.personal_notes || null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[V2 Helpers] Error updating solution:', error.message);
      throw error;
    }

    return data;
  } else {
    // Insert new solution
    return recordSolutionV2(userSolveId, solutionData);
  }
}

/**
 * Record a submission in the schema
 * @param {string} userId - User ID
 * @param {string} platformCode - Platform code
 * @param {Object} submissionData - Submission data
 * @returns {Promise<Object>} Created submission record
 */
export async function recordSubmissionV2(userId, platformCode, submissionData) {
  const platformId = await getPlatformId(platformCode);

  if (!platformId) {
    throw new Error(`Unknown platform: ${platformCode}`);
  }

  const externalSubmissionId =
    submissionData.submission_id || submissionData.external_submission_id;
  const externalProblemId =
    submissionData.problem_id || submissionData.external_problem_id;

  const languageId =
    submissionData.language_id ||
    (await getLanguageId(submissionData.language));

  const { data, error } = await supabaseAdmin
    .from(V2_TABLES.SUBMISSIONS)
    .upsert(
      {
        user_id: userId,
        platform_id: platformId,
        // Optional FK when caller already resolved/created the problem row
        problem_id: submissionData.problem_uuid || submissionData.problem_db_id,
        external_submission_id: externalSubmissionId,
        external_problem_id: externalProblemId,
        problem_name: submissionData.problem_name,
        verdict: submissionData.verdict,
        language_id: languageId,
        execution_time_ms: submissionData.execution_time_ms,
        memory_kb: submissionData.memory_kb,
        submitted_at: submissionData.submitted_at,
      },
      { onConflict: 'user_id,platform_id,external_submission_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[V2 Helpers] Error recording submission:', error.message);
    throw error;
  }

  return data;
}

// ============================================
// SCHEMA AVAILABILITY CHECK
// ============================================

/**
 * Check if the new schema is available
 * @returns {Promise<boolean>} True if new tables exist
 */
export async function isV2SchemaAvailable() {
  try {
    // V2 schema is identified by the normalized problems table shape.
    // Legacy schemas often have a `problems` table but without `external_id`.
    const { error } = await supabaseAdmin
      .from('problems')
      .select('external_id')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Transform old-style platform string to platform_id
 * For migration and backward compatibility
 * @param {Object} record - Record with 'platform' text field
 * @returns {Promise<Object>} Record with 'platform_id' field added
 */
export async function transformPlatformToId(record) {
  if (!record?.platform) return record;

  const platformId = await getPlatformId(record.platform);
  return {
    ...record,
    platform_id: platformId,
  };
}

/**
 * Transform records with platform_id back to platform code
 * For backward compatibility with existing code
 * @param {Array|Object} records - Record(s) with 'platform_id' field
 * @returns {Promise<Array|Object>} Record(s) with 'platform' field added
 */
export async function transformIdToPlatform(records) {
  const isArray = Array.isArray(records);
  const items = isArray ? records : [records];

  // Get all unique platform IDs
  const platformIds = [
    ...new Set(items.map((r) => r.platform_id).filter(Boolean)),
  ];
  const codeMap = await getPlatformCodes(platformIds);

  const transformed = items.map((record) => ({
    ...record,
    platform: codeMap.get(record.platform_id) || record.platform,
  }));

  return isArray ? transformed : transformed[0];
}

// ============================================
// DIFFICULTY TIER CACHE
// ============================================

let tierCache = null;
let tierCacheExpiry = 0;
const TIER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function loadTierCache() {
  const now = Date.now();
  if (tierCache && now < tierCacheExpiry) return tierCache;

  const { data, error } = await supabaseAdmin
    .from('difficulty_tiers')
    .select('id, min_rating, max_rating')
    .order('min_rating', { ascending: true });

  if (error || !data) return tierCache || [];
  tierCache = data;
  tierCacheExpiry = now + TIER_CACHE_TTL_MS;
  return tierCache;
}

/**
 * Get the difficulty_tier_id for a numeric rating.
 * Returns null if rating is null or no tier matches.
 */
export async function getTierIdForRating(rating) {
  if (rating == null) return null;
  const tiers = await loadTierCache();
  for (const tier of tiers) {
    const min = tier.min_rating ?? 0;
    if (
      rating >= min &&
      (tier.max_rating == null || rating <= tier.max_rating)
    ) {
      return tier.id;
    }
  }
  return tiers.length > 0 ? tiers[tiers.length - 1].id : null;
}

// ============================================
// USER DAILY ACTIVITY
// ============================================

/**
 * Upsert a user's daily activity record.
 * Increments counters for the given date.
 * @param {string} userId
 * @param {number} platformId - platform_id (smallint)
 * @param {Object} delta - { problemsSolved, submissionsCount, solutionsAdded }
 * @param {string|Date} [date] - ISO date string or Date (defaults to today UTC)
 */
export async function updateUserDailyActivity(
  userId,
  platformId,
  { problemsSolved = 0, submissionsCount = 0, solutionsAdded = 0 } = {},
  date = null
) {
  try {
    const activityDate = date
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabaseAdmin
      .from(V2_TABLES.USER_DAILY_ACTIVITY)
      .select(
        'id, problems_solved, submissions_count, solutions_added, active_platforms'
      )
      .eq('user_id', userId)
      .eq('activity_date', activityDate)
      .maybeSingle();

    if (existing) {
      const activePlatforms = existing.active_platforms || [];
      if (platformId && !activePlatforms.includes(platformId)) {
        activePlatforms.push(platformId);
      }
      await supabaseAdmin
        .from(V2_TABLES.USER_DAILY_ACTIVITY)
        .update({
          problems_solved: (existing.problems_solved || 0) + problemsSolved,
          submissions_count:
            (existing.submissions_count || 0) + submissionsCount,
          solutions_added: (existing.solutions_added || 0) + solutionsAdded,
          active_platforms: activePlatforms,
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from(V2_TABLES.USER_DAILY_ACTIVITY).insert({
        user_id: userId,
        activity_date: activityDate,
        problems_solved: problemsSolved,
        submissions_count: submissionsCount,
        solutions_added: solutionsAdded,
        active_platforms: platformId ? [platformId] : [],
      });
    }
  } catch (err) {
    console.warn('[V2 Helpers] updateUserDailyActivity failed:', err.message);
  }
}

// ============================================
// STREAK CALCULATION
// ============================================

/**
 * Recalculate current_streak and longest_streak for a user
 * from their solved dates (user_solves.first_solved_at). Updates user_stats in place.
 * @param {string} userId
 */
export async function recalcUserStreaks(userId) {
  try {
    const { data: solves } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select('first_solved_at')
      .eq('user_id', userId)
      .not('first_solved_at', 'is', null)
      .order('first_solved_at', { ascending: false });

    const solveDates = new Set();
    (solves || []).forEach((row) => {
      if (!row?.first_solved_at) return;
      const d = new Date(row.first_solved_at);
      if (Number.isNaN(d.getTime())) return;
      solveDates.add(d.toISOString().slice(0, 10));
    });

    const days = Array.from(solveDates).sort((a, b) => b.localeCompare(a));

    if (days.length === 0) {
      await supabaseAdmin.from(V2_TABLES.USER_STATS).upsert(
        {
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    const mostRecent = days[0];

    // current_streak: consecutive days ending today or yesterday
    let currentStreak = 0;
    if (mostRecent === todayStr || mostRecent === yesterdayStr) {
      let prev = new Date(mostRecent);
      for (const dateStr of days) {
        const d = new Date(dateStr);
        const diffDays = Math.round((prev - d) / 86400000);
        if (diffDays <= 1) {
          currentStreak++;
          prev = d;
        } else {
          break;
        }
      }
    }

    // longest_streak: longest run of consecutive days
    let longest = 0;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
      const d1 = new Date(days[i - 1]);
      const d2 = new Date(days[i]);
      const diff = Math.round((d1 - d2) / 86400000);
      if (diff === 1) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
    }
    if (run > longest) longest = run;
    if (days.length === 1) longest = 1;

    const lastSolveDate = days[0];

    await supabaseAdmin.from(V2_TABLES.USER_STATS).upsert(
      {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longest,
        last_solve_date: lastSolveDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[V2 Helpers] recalcUserStreaks failed:', err.message);
  }
}

// ============================================
// USER TAG STATS
// ============================================

/**
 * Increment user_tag_stats for a list of tag IDs.
 * @param {string} userId
 * @param {number[]} tagIds - array of tag.id (smallint)
 * @param {Object} delta - { solved, attempted, difficultyRating }
 */
export async function updateUserTagStats(
  userId,
  tagIds,
  { solved = 0, attempted = 0, difficultyRating = null } = {}
) {
  if (!tagIds || tagIds.length === 0) return;

  for (const tagId of tagIds) {
    try {
      const { data: existing } = await supabaseAdmin
        .from(V2_TABLES.USER_TAG_STATS)
        .select('id, problems_solved, problems_attempted, avg_difficulty')
        .eq('user_id', userId)
        .eq('tag_id', tagId)
        .maybeSingle();

      if (existing) {
        const newSolved = (existing.problems_solved || 0) + solved;
        const newAttempted = (existing.problems_attempted || 0) + attempted;
        let newAvg = existing.avg_difficulty;
        if (difficultyRating != null && solved > 0) {
          // Running average: weight by solved count
          const prevSolved = existing.problems_solved || 0;
          newAvg =
            prevSolved === 0
              ? difficultyRating
              : ((Number(existing.avg_difficulty) || difficultyRating) *
                  prevSolved +
                  difficultyRating) /
                (prevSolved + solved);
        }
        const mastery = getMasteryLevel(newSolved);
        await supabaseAdmin
          .from(V2_TABLES.USER_TAG_STATS)
          .update({
            problems_solved: newSolved,
            problems_attempted: newAttempted,
            avg_difficulty: newAvg != null ? Math.round(newAvg) : null,
            mastery_level: mastery,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin.from(V2_TABLES.USER_TAG_STATS).insert({
          user_id: userId,
          tag_id: tagId,
          problems_solved: solved,
          problems_attempted: attempted,
          avg_difficulty: difficultyRating,
          mastery_level: getMasteryLevel(solved),
        });
      }
    } catch (err) {
      console.warn(
        `[V2 Helpers] updateUserTagStats tag ${tagId} failed:`,
        err.message
      );
    }
  }
}

function getMasteryLevel(solvedCount) {
  if (solvedCount >= 50) return 'expert';
  if (solvedCount >= 20) return 'advanced';
  if (solvedCount >= 10) return 'intermediate';
  if (solvedCount >= 3) return 'beginner';
  return 'beginner';
}

/**
 * Look up tag IDs for a problem by its UUID.
 * Returns array of tag IDs (smallint).
 */
export async function getTagIdsForProblem(problemUuid) {
  if (!problemUuid) return [];
  try {
    const { data } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_TAGS)
      .select('tag_id')
      .eq('problem_id', problemUuid);
    return (data || []).map((r) => r.tag_id).filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================
// PROBLEM EDITORIALS
// ============================================

/**
 * Upsert a problem editorial record.
 * @param {string} problemUuid - problems.id UUID
 * @param {Object} data - { tutorialUrl, tutorialContent, tutorialSolutions, tutorialExtractedAt }
 */
export async function upsertProblemEditorial(
  problemUuid,
  {
    tutorialUrl = null,
    tutorialContent = null,
    tutorialSolutions = null,
    tutorialExtractedAt = null,
  } = {}
) {
  if (!problemUuid) return null;
  if (
    !tutorialUrl &&
    !tutorialContent &&
    (!tutorialSolutions || tutorialSolutions.length === 0)
  ) {
    return null; // nothing to store
  }

  try {
    const { data, error } = await supabaseAdmin
      .from(V2_TABLES.PROBLEM_EDITORIALS)
      .upsert(
        {
          problem_id: problemUuid,
          tutorial_url: tutorialUrl,
          tutorial_content: tutorialContent,
          tutorial_solutions: tutorialSolutions || [],
          tutorial_extracted_at:
            tutorialExtractedAt ||
            (tutorialContent ? new Date().toISOString() : null),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'problem_id' }
      )
      .select('id')
      .single();

    if (error) {
      console.warn(
        '[V2 Helpers] upsertProblemEditorial failed:',
        error.message
      );
    }
    return data;
  } catch (err) {
    console.warn('[V2 Helpers] upsertProblemEditorial error:', err.message);
    return null;
  }
}

// ============================================
// DELETE HANDLE
// ============================================

/**
 * Delete a user handle in V2 schema
 * @param {string} userId - User ID
 * @param {string} platformCode - Platform code (e.g., 'codeforces')
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteUserHandleV2(userId, platformCode) {
  const platformId = await getPlatformId(platformCode);

  if (!platformId) {
    console.warn(`[V2 Helpers] Unknown platform for delete: ${platformCode}`);
    return false;
  }

  const { error } = await supabaseAdmin
    .from(V2_TABLES.USER_HANDLES)
    .delete()
    .eq('user_id', userId)
    .eq('platform_id', platformId);

  if (error) {
    console.error('[V2 Helpers] Error deleting user handle:', error.message);
    throw error;
  }

  return true;
}
