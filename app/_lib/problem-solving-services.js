/**
 * @file Problem Solving - Data Fetching Services
 * @module problem-solving-services
 *
 * Services for fetching data from online judges
 * Supports: Codeforces, AtCoder, LeetCode, Toph, CSES, CodeChef, TopCoder,
 * HackerRank, Kattis, LightOJ, UVA, SPOJ, VJudge, CF Gym, CS Academy, E-Olymp, USACO
 */

import { supabaseAdmin } from './supabase.js';
import { PROBLEM_SOLVING_PLATFORM_IDS } from './problem-solving-platforms.js';
import {
  V2_TABLES,
  getPlatformCode,
  getPlatformId,
  isV2SchemaAvailable,
} from './problem-solving-v2-helpers.js';

// ============================================
// CONSTANTS
// ============================================

export const PLATFORMS = PROBLEM_SOLVING_PLATFORM_IDS.reduce((acc, id) => {
  acc[id.toUpperCase()] = id;
  return acc;
}, {});

export const API_ENDPOINTS = {
  codeforces: {
    userInfo: 'https://codeforces.com/api/user.info',
    userStatus: 'https://codeforces.com/api/user.status',
    userRating: 'https://codeforces.com/api/user.rating',
  },
  atcoder: {
    submissions: 'https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions',
  },
  leetcode: {
    graphql: 'https://leetcode.com/graphql',
  },
  toph: {
    profile: 'https://toph.co/u/',
    api: 'https://toph.co/api',
  },
  cses: {
    user: 'https://cses.fi/user/',
  },
  codechef: {
    api: 'https://www.codechef.com/api',
  },
  topcoder: {
    api: 'https://api.topcoder.com/v5',
  },
  hackerrank: {
    api: 'https://www.hackerrank.com/rest/contests/master/hackers/',
  },
  kattis: {
    profile: 'https://open.kattis.com/users/',
  },
  lightoj: {
    profile: 'https://lightoj.com/user/',
  },
  uva: {
    api: 'https://uhunt.onlinejudge.org/api',
  },
  spoj: {
    profile: 'https://www.spoj.com/users/',
  },
  vjudge: {
    api: 'https://vjudge.net/user/solveDetail/',
  },
  cfgym: {
    // Uses Codeforces API for gym contests
    userStatus: 'https://codeforces.com/api/user.status',
  },
  csacademy: {
    profile: 'https://csacademy.com/user/',
  },
  eolymp: {
    api: 'https://www.eolymp.com/api',
  },
  usaco: {
    // USACO doesn't have a public API
    profile: 'https://usaco.org/',
  },
};

// Rate limits per platform (requests per minute)
export const RATE_LIMITS = {
  codeforces: 5,
  atcoder: 10,
  leetcode: 3,
  toph: 10,
  cses: 10,
  codechef: 5,
  topcoder: 5,
  hackerrank: 5,
  kattis: 10,
  lightoj: 10,
  uva: 10,
  spoj: 10,
  vjudge: 10,
  cfgym: 5,
  csacademy: 10,
  eolymp: 10,
  usaco: 10,
  clist: 10, // CLIST API: 10 requests per minute
};

const MIN_REASONABLE_SUBMISSION_MS = Date.parse('2005-01-01T00:00:00.000Z');
const MAX_SUBMISSION_FUTURE_DRIFT_MS = 24 * 60 * 60 * 1000;

function normalizeSubmissionVerdict(rawVerdict) {
  const normalized = (rawVerdict || '').toString().trim().toUpperCase();
  if (!normalized) return 'UNKNOWN';
  if (normalized === 'OK' || normalized === 'ACCEPTED') return 'AC';
  return normalized;
}

function normalizeSubmissionTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;

  let timestampMs = Number.NaN;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    timestampMs = value < 1e12 ? value * 1000 : value;
  } else {
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const numeric = Number.parseInt(raw, 10);
      if (!Number.isFinite(numeric)) return null;
      timestampMs = raw.length <= 10 ? numeric * 1000 : numeric;
    } else {
      const parsed = Date.parse(raw);
      if (!Number.isFinite(parsed)) return null;
      timestampMs = parsed;
    }
  }

  if (
    !Number.isFinite(timestampMs) ||
    timestampMs < MIN_REASONABLE_SUBMISSION_MS ||
    timestampMs > Date.now() + MAX_SUBMISSION_FUTURE_DRIFT_MS
  ) {
    return null;
  }

  return new Date(timestampMs).toISOString();
}

function isHeuristicLeetCodeSubmissionId(submissionId) {
  const id = (submissionId || '').toString().trim().toLowerCase();
  if (!id) return false;

  return (
    id.startsWith('lc_contest_') ||
    id.startsWith('lc_inferred_') ||
    id.startsWith('lc_synthetic_') ||
    id.startsWith('clist_')
  );
}

function normalizeLeetCodeProblemSlug(value) {
  if (value === null || value === undefined) return null;

  let slug = String(value).trim().toLowerCase();
  if (!slug) return null;

  slug = slug.replace(
    /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\/problems\//,
    ''
  );
  slug = slug.split(/[/?#]/)[0].trim();

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

// ============================================
// CLIST RATE LIMITER (Singleton)
// ============================================

/**
 * Rate limiter for CLIST API to enforce 10 requests/minute limit
 * Uses a sliding window approach with proper delays
 */
class ClistRateLimiter {
  constructor() {
    this.maxRequests = 10; // 10 requests per minute as per clist.by limits
    this.windowMs = 60000; // 1 minute window
    this.minDelayMs = 6500; // Minimum 6.5 seconds between requests (conservative, allows ~9 req/min)
    this.requestTimestamps = [];
    this.lastRequestTime = 0;

    // Request queue for handling concurrent requests from multiple users
    this.requestQueue = [];
    this.processingQueue = false;
  }

  /**
   * Add a request to the queue and wait for execution
   */
  async enqueueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Start processing queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests one at a time
   */
  async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();

      try {
        // Wait for slot before executing
        await this.waitForSlot();
        this.recordRequest();

        // Execute the request
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Wait until it's safe to make a new request
   * This ensures we never exceed the rate limit
   */
  async waitForSlot() {
    const now = Date.now();

    // Clean up old timestamps outside the window
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    // If we've hit the limit, wait until the oldest request exits the window
    if (this.requestTimestamps.length >= this.maxRequests) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 1000; // Add 1s buffer
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Also ensure minimum delay between consecutive requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayMs && this.lastRequestTime > 0) {
      const additionalWait = this.minDelayMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, additionalWait));
    }
  }

  /**
   * Record that a request was made
   */
  recordRequest() {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.lastRequestTime = now;
  }

  /**
   * Get current request count in window (for debugging)
   */
  getCurrentCount() {
    const now = Date.now();
    return this.requestTimestamps.filter((ts) => now - ts < this.windowMs)
      .length;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queued: this.requestQueue.length,
      processing: this.processingQueue,
      inWindow: this.getCurrentCount(),
      maxRequests: this.maxRequests,
    };
  }
}

// Singleton instance for global rate limiting across all ClistService instances
const clistRateLimiter = new ClistRateLimiter();
const CLIST_NETWORK_COOLDOWN_MS = 5 * 60 * 1000;
let clistNetworkUnavailableUntil = 0;
let clistLastCooldownWarnAt = 0;

// ============================================
// ERROR TYPES AND HELPERS
// ============================================

/**
 * Custom error types for better error handling
 */
class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.retryable = true;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter; // seconds to wait
    this.retryable = true;
  }
}

class APIError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
    this.retryable = statusCode >= 500; // Only retry on server errors
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
    this.retryable = true;
  }
}

/**
 * Categorize fetch errors for better handling
 */
function categorizeError(error, response = null) {
  // Timeout errors
  if (
    error.name === 'AbortError' ||
    error.code === 'ETIMEDOUT' ||
    error.cause?.code === 'ETIMEDOUT'
  ) {
    return new TimeoutError('Request timeout');
  }

  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.cause?.code === 'ECONNRESET' ||
    error.name === 'TypeError'
  ) {
    return new NetworkError('Network connection failed', error);
  }

  // Rate limit errors (from response)
  if (response) {
    if (response.status === 429) {
      const retryAfter =
        response.headers.get('Retry-After') ||
        response.headers.get('X-RateLimit-Reset');
      return new RateLimitError('Rate limit exceeded', retryAfter);
    }

    // API errors
    if (!response.ok) {
      return new APIError(
        `API returned ${response.status}: ${response.statusText}`,
        response.status,
        response
      );
    }
  }

  return error;
}

// ============================================
// FETCH HELPER WITH TIMEOUT AND RETRY
// ============================================

/**
 * Fetch with timeout and retry logic with exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in ms (default 60000)
 * @param {number} retries - Number of retries (default 3)
 * @param {number} retryDelay - Initial delay between retries in ms (default 2000)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(
  url,
  options = {},
  timeout = 60000,
  retries = 3,
  retryDelay = 2000
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Check for rate limiting or API errors
      if (!response.ok) {
        const error = categorizeError(null, response);

        // Handle rate limiting with special backoff
        if (error.name === 'RateLimitError') {
          clearTimeout(timeoutId);
          lastError = error;

          if (attempt < retries) {
            const waitTime = error.retryAfter
              ? parseInt(error.retryAfter) * 1000
              : retryDelay * Math.pow(2, attempt); // Exponential backoff

            console.warn(
              `[RATE_LIMIT] Attempt ${attempt}/${retries} - ${url.substring(0, 100)}... Rate limited, waiting ${waitTime}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          throw error;
        }

        // For server errors (5xx), retry
        if (error.retryable && attempt < retries) {
          clearTimeout(timeoutId);
          lastError = error;
          const waitTime = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(
            `[API_ERROR] Attempt ${attempt}/${retries} - ${url.substring(0, 100)}... ${error.message}, retrying in ${waitTime}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // For client errors (4xx), don't retry
        throw error;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Categorize the error
      const categorizedError = categorizeError(error);
      lastError = categorizedError;

      // Don't retry on non-retryable errors
      if (!categorizedError.retryable) {
        console.error(
          `[FETCH_ERROR] Non-retryable error for ${url.substring(0, 100)}...: ${categorizedError.message}`
        );
        throw categorizedError;
      }

      // Log retry attempt
      const waitTime = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(
        `[${categorizedError.name}] Attempt ${attempt}/${retries} - ${url.substring(0, 100)}... ${categorizedError.message}`
      );

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        console.warn(`[RETRY] Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  const errorType = lastError?.name || 'UNKNOWN';
  throw new Error(
    `[${errorType}] Fetch failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

// ============================================
// CODEFORCES SERVICE
// ============================================

export class CodeforcesService {
  constructor() {
    this.baseUrl = 'https://codeforces.com/api';
  }

  async getUserInfo(handle) {
    const cacheKey = `cf_user_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const response = await fetchWithTimeout(
      `${this.baseUrl}/user.info?handles=${handle}`
    );
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }

    await this.setCache(cacheKey, data.result[0], 300);
    return data.result[0];
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `cf_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch ALL submissions by paginating (Codeforces API returns max 10000 per call)
    let allSubmissions = [];
    let from = 1;
    let hasMore = true;
    let iterations = 0;
    const MAX_ITERATIONS = 100; // Safety limit to prevent infinite loops (1M submissions max)
    const BATCH_SIZE = 10000; // Fetch 10000 per request for efficiency

    while (hasMore && iterations < MAX_ITERATIONS) {
      iterations++;
      const url = `${this.baseUrl}/user.status?handle=${handle}&from=${from}&count=${BATCH_SIZE}`;
      try {
        const response = await fetchWithTimeout(url, {}, 60000, 3, 3000);
        const data = await response.json();

        if (data.status !== 'OK') {
          console.warn(`[CF] API error for ${handle}: ${data.comment}`);
          hasMore = false;
          break;
        }

        if (!data.result || data.result.length === 0) {
          hasMore = false;
          break;
        }
        const submissions = data.result.map((sub) => ({
          submission_id: sub.id.toString(),
          problem_id: `${sub.problem.contestId}${sub.problem.index}`,
          problem_name: sub.problem.name,
          problem_url: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
          contest_id: sub.problem.contestId?.toString(),
          verdict: this.mapVerdict(sub.verdict),
          language: sub.programmingLanguage,
          execution_time_ms: sub.timeConsumedMillis,
          memory_kb: Math.round(sub.memoryConsumedBytes / 1024),
          submitted_at: new Date(sub.creationTimeSeconds * 1000).toISOString(),
          difficulty_rating: sub.problem.rating,
          tags: sub.problem.tags,
        }));

        allSubmissions = allSubmissions.concat(submissions);

        // Check if we fetched older submissions than fromTimestamp to break early
        if (fromTimestamp && submissions.length > 0) {
          const oldestSub = submissions[submissions.length - 1];
          if (new Date(oldestSub.submitted_at) <= new Date(fromTimestamp)) {
            hasMore = false;
            break;
          }
        }

        // If we got less than BATCH_SIZE, we've reached the end
        if (data.result.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          from += BATCH_SIZE;
          // Add delay to respect Codeforces rate limits (5 requests per minute)
          await new Promise((resolve) => setTimeout(resolve, 12000)); // 12 seconds between requests
        }
      } catch (error) {
        console.error(
          `[CF] Error fetching submissions from ${from}:`,
          error.message
        );
        // If we've already fetched some submissions, return what we have
        // Otherwise, throw the error
        if (allSubmissions.length > 0) {
          console.warn(
            `[CF] Returning ${allSubmissions.length} submissions fetched before error`
          );
          hasMore = false;
        } else {
          throw error;
        }
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(
        `[CF] Reached maximum iterations (${MAX_ITERATIONS}) for ${handle}, returning ${allSubmissions.length} submissions`
      );
    }

    const filtered = fromTimestamp
      ? allSubmissions.filter(
          (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
        )
      : allSubmissions;
    await this.setCache(cacheKey, filtered, 60);
    return filtered;
  }

  async getRatingHistory(handle) {
    const cacheKey = `cf_rating_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const response = await fetchWithTimeout(
      `${this.baseUrl}/user.rating?handle=${handle}`
    );
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }

    const contests = data.result.map((contest) => ({
      contest_id: contest.contestId.toString(),
      contest_name: contest.contestName,
      contest_url: `https://codeforces.com/contest/${contest.contestId}`,
      rank: contest.rank,
      old_rating: contest.oldRating,
      new_rating: contest.newRating,
      rating_change: contest.newRating - contest.oldRating,
      contest_date: new Date(
        contest.ratingUpdateTimeSeconds * 1000
      ).toISOString(),
    }));

    await this.setCache(cacheKey, contests, 3600);
    return contests;
  }

  mapVerdict(verdict) {
    const map = {
      OK: 'AC',
      WRONG_ANSWER: 'WA',
      TIME_LIMIT_EXCEEDED: 'TLE',
      MEMORY_LIMIT_EXCEEDED: 'MLE',
      RUNTIME_ERROR: 'RE',
      COMPILATION_ERROR: 'CE',
      PARTIAL: 'PARTIAL',
    };
    return map[verdict] || 'PENDING';
  }

  /**
   * Fetch contest problems from Codeforces API
   * @param {string} contestId - Codeforces contest ID
   * @returns {Array} - Array of problem objects with index, name, url
   */
  async getContestProblems(contestId) {
    const cacheKey = `cf_contest_problems_${contestId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseUrl}/contest.standings?contestId=${contestId}&from=1&count=1`;
      const response = await fetchWithTimeout(url, {}, 30000, 2, 3000);
      const data = await response.json();

      if (data.status !== 'OK' || !data.result?.problems) {
        console.warn(`[CF] Could not fetch problems for contest ${contestId}`);
        return [];
      }

      const problems = data.result.problems.map((p) => ({
        index: p.index,
        name: p.name,
        url: `https://codeforces.com/contest/${contestId}/problem/${p.index}`,
        rating: p.rating,
        tags: p.tags,
      }));

      // Cache for 7 days (contest problems don't change)
      await this.setCache(cacheKey, problems, 7 * 24 * 60 * 60);
      return problems;
    } catch (error) {
      console.error(
        `[CF] Error fetching contest problems for ${contestId}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * Get contest timing info from Codeforces API
   * Returns startTimeSeconds and durationSeconds for accurate upsolve detection
   * @param {string} contestId - Codeforces contest ID
   * @returns {Object|null} - { startTime: Date, endTime: Date, durationMinutes: number } or null
   */
  async getContestTiming(contestId) {
    const cacheKey = `cf_contest_timing_${contestId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return {
        startTime: new Date(cached.startTime),
        endTime: new Date(cached.endTime),
        durationMinutes: cached.durationMinutes,
      };
    }

    try {
      const url = `${this.baseUrl}/contest.standings?contestId=${contestId}&from=1&count=1`;
      const response = await fetchWithTimeout(url, {}, 30000, 2, 3000);
      const data = await response.json();

      if (data.status !== 'OK' || !data.result?.contest) {
        console.warn(`[CF] Could not fetch timing for contest ${contestId}`);
        return null;
      }

      const contest = data.result.contest;
      const startTime = new Date(contest.startTimeSeconds * 1000);
      const durationMinutes = Math.floor(contest.durationSeconds / 60);
      const endTime = new Date(
        startTime.getTime() + contest.durationSeconds * 1000
      );

      const result = {
        startTime,
        endTime,
        durationMinutes,
      };

      // Cache for 30 days (contest timing doesn't change)
      await this.setCache(
        cacheKey,
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMinutes,
        },
        30 * 24 * 60 * 60
      );
      return result;
    } catch (error) {
      console.error(
        `[CF] Error fetching contest timing for ${contestId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Get total participants for a Codeforces contest
   * First tries contest.ratingChanges API (for rated contests)
   * Falls back to contest.standings API (for unrated/educational contests)
   * @param {string} contestId - Codeforces contest ID
   * @returns {number|null} - Total participants count or null if unavailable
   */
  async getContestParticipantCount(contestId) {
    const cacheKey = `cf_contest_participants_${contestId}`;
    const cached = await this.getCache(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      // First try ratingChanges API (faster, works for rated contests)
      const ratingUrl = `${this.baseUrl}/contest.ratingChanges?contestId=${contestId}`;
      const ratingResponse = await fetchWithTimeout(
        ratingUrl,
        {},
        30000,
        2,
        3000
      );
      const ratingData = await ratingResponse.json();

      if (ratingData.status === 'OK' && ratingData.result) {
        const count = ratingData.result.length;
        // Cache for 7 days (historical contest data doesn't change)
        await this.setCache(cacheKey, count, 7 * 24 * 60 * 60);
        return count;
      }

      // Fallback to standings API for unrated contests (educational, div3/4, etc.)
      const standingsUrl = `${this.baseUrl}/contest.standings?contestId=${contestId}&from=1&count=100000&showUnofficial=false`;
      const standingsResponse = await fetchWithTimeout(
        standingsUrl,
        {},
        60000,
        2,
        3000
      );
      const standingsData = await standingsResponse.json();

      if (standingsData.status === 'OK' && standingsData.result?.rows) {
        const count = standingsData.result.rows.length;
        // Cache for 7 days
        await this.setCache(cacheKey, count, 7 * 24 * 60 * 60);
        return count;
      }

      console.warn(
        `[CF] Could not fetch participant count for contest ${contestId} from any API`
      );
      return null;
    } catch (error) {
      console.error(
        `[CF] Error fetching participant count for ${contestId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Get total participants for multiple Codeforces contests in batch
   * @param {Array<string>} contestIds - Array of Codeforces contest IDs
   * @returns {Object} - Map of contestId -> participantCount
   */
  async getContestParticipantCounts(contestIds) {
    const results = {};
    const uncachedIds = [];

    // Check cache first
    for (const contestId of contestIds) {
      const cacheKey = `cf_contest_participants_${contestId}`;
      const cached = await this.getCache(cacheKey);
      if (cached !== null && cached !== undefined) {
        results[contestId] = cached;
      } else {
        uncachedIds.push(contestId);
      }
    }

    // Fetch uncached contest participant counts
    // Note: We need to fetch one at a time due to CF API limitations
    // Add delays to respect rate limits (may make 2 API calls per contest for unrated ones)
    for (let i = 0; i < uncachedIds.length; i++) {
      const contestId = uncachedIds[i];
      const count = await this.getContestParticipantCount(contestId);
      if (count !== null) {
        results[contestId] = count;
      }
      // Add delay between contests to respect CF rate limits
      // Longer delay since getContestParticipantCount may make up to 2 requests
      if (i < uncachedIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Enrich contests with problem-level data from submissions
   * Includes ALL problems (solved, attempted, unattempted) and tracks upsolves
   * @param {Array} contests - Array of contest objects from CLIST
   * @param {string} handle - Codeforces handle
   * @returns {Array} - Contests enriched with problems array
   */
  async enrichContestsWithProblems(contests, handle) {
    if (!contests || contests.length === 0) return contests;
    // Fetch all submissions for this user
    const submissions = await this.getSubmissions(handle);
    // Group submissions by contest_id
    const submissionsByContest = {};
    submissions.forEach((sub) => {
      if (!sub.contest_id) return;
      if (!submissionsByContest[sub.contest_id]) {
        submissionsByContest[sub.contest_id] = [];
      }
      submissionsByContest[sub.contest_id].push(sub);
    });
    // Debug: Log sample of submission contest IDs
    const submissionContestIds = Object.keys(submissionsByContest).slice(0, 10);
    // Debug: Log sample of contest IDs we're trying to match
    const contestIds = contests
      .slice(0, 5)
      .map((c) => `${c.contestId}(p:${c.platformContestId})`);
    // Enrich each contest (process sequentially to respect rate limits)
    const enrichedContests = [];
    for (const contest of contests) {
      // Use platformContestId for matching with submissions (falls back to contestId if not set)
      const matchId = contest.platformContestId || contest.contestId;
      const contestSubs = submissionsByContest[matchId] || [];

      // Debug: Log contest ID matching info
      // Get accurate contest timing from Codeforces API
      // This is critical for correctly detecting solvedDuringContest vs upsolve
      const contestTiming = await this.getContestTiming(matchId);

      let contestStart, contestEnd;
      if (contestTiming) {
        // Use accurate timing from Codeforces API
        contestStart = contestTiming.startTime;
        contestEnd = contestTiming.endTime;
      } else if (contest.endDate) {
        // Fallback: Use explicit end date from CLIST if available
        contestStart = new Date(contest.date);
        contestEnd = new Date(contest.endDate);
      } else {
        // Last fallback: Use durationMinutes from CLIST, or duration field, or default 3 hours
        contestStart = new Date(contest.date);
        const durationMs =
          (contest.durationMinutes || contest.duration || 180) * 60 * 1000;
        contestEnd = new Date(contestStart.getTime() + durationMs);
      }

      // Fetch ALL problems for this contest from Codeforces API
      const contestProblems = await this.getContestProblems(matchId);

      // Build problem map from user's submissions
      const problemMap = {};
      contestSubs.forEach((sub) => {
        const problemIndex = sub.problem_id.replace(matchId, '');
        const subTime = new Date(sub.submitted_at);

        if (!problemMap[problemIndex]) {
          problemMap[problemIndex] = {
            label: problemIndex,
            name: sub.problem_name,
            url: sub.problem_url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            attemptedDuringContest: false,
            submissions: [],
          };
        }

        problemMap[problemIndex].submissions.push(sub);
        problemMap[problemIndex].attempted = true;

        // Check if this attempt was during the contest
        if (subTime <= contestEnd) {
          problemMap[problemIndex].attemptedDuringContest = true;
        }

        if (sub.verdict === 'AC') {
          problemMap[problemIndex].solved = true;
          // Check if solved during contest or after (upsolve)
          // Priority: solvedDuringContest > upsolve (if solved during contest, don't mark as upsolve)
          if (subTime <= contestEnd) {
            problemMap[problemIndex].solvedDuringContest = true;
            // If we already marked it as upsolve but now found an earlier AC during contest, remove upsolve flag
            problemMap[problemIndex].upsolve = false;
          } else if (!problemMap[problemIndex].solvedDuringContest) {
            // Only mark as upsolve if not already solved during contest
            problemMap[problemIndex].upsolve = true;
          }
        }
      });

      // Add unattempted problems from the contest problem list
      contestProblems.forEach((cp) => {
        if (!problemMap[cp.index]) {
          problemMap[cp.index] = {
            label: cp.index,
            name: cp.name,
            url: cp.url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            attemptedDuringContest: false,
            submissions: [],
            rating: cp.rating,
            tags: cp.tags,
          };
        } else {
          // Update existing problem with additional data
          problemMap[cp.index].rating = cp.rating;
          problemMap[cp.index].tags = cp.tags;
        }
      });

      // Convert to array and sort by label (A, B, C, ...)
      const problems = Object.values(problemMap).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      const solvedCount = problems.filter((p) => p.solvedDuringContest).length;
      const upsolveCount = problems.filter(
        (p) => p.upsolve && !p.solvedDuringContest
      ).length;
      const attemptedCount = problems.filter((p) => p.attempted).length;
      const totalProblems = problems.length;
      // Add delay between contests to respect Codeforces rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));

      enrichedContests.push({
        ...contest,
        problems,
        solved: solvedCount,
        upsolves: upsolveCount,
        totalProblems,
        // Include accurate timing data for database storage
        endDate: contestEnd.toISOString(),
        durationMinutes:
          contestTiming?.durationMinutes ||
          contest.durationMinutes ||
          Math.round((contestEnd - contestStart) / 60000),
      });
    }

    return enrichedContests;
  }

  mapDifficultyTier(rating) {
    if (!rating) return 'medium';
    if (rating < 1200) return 'easy';
    if (rating < 1600) return 'medium';
    if (rating < 2100) return 'hard';
    return 'expert';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// ATCODER SERVICE
// ============================================

export class AtCoderService {
  constructor() {
    this.apiBase = 'https://kenkoooo.com/atcoder/atcoder-api/v3';
    this.officialBase = 'https://atcoder.jp';
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `ac_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    let submissions = [];

    // Try Kenkoooo API first
    try {
      // v3 API requires from_second parameter — use 0 for "all submissions"
      const fromSeconds = fromTimestamp
        ? Math.floor(new Date(fromTimestamp).getTime() / 1000)
        : 0;
      const url = `${this.apiBase}/user/submissions?user=${handle}&from_second=${fromSeconds}`;

      const response = await fetchWithTimeout(url);

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          // Pre-fetch problem catalog for name resolution
          const allProblems = await this.getAllProblems();

          submissions = data.map((sub) => ({
            submission_id: sub.id.toString(),
            problem_id: sub.problem_id,
            problem_name: allProblems[sub.problem_id]?.name || sub.problem_id,
            problem_url: `https://atcoder.jp/contests/${sub.contest_id}/tasks/${sub.problem_id}`,
            contest_id: sub.contest_id,
            verdict: sub.result === 'AC' ? 'AC' : this.mapVerdict(sub.result),
            language: sub.language,
            execution_time_ms: sub.execution_time,
            submitted_at: new Date(sub.epoch_second * 1000).toISOString(),
            difficulty_rating: sub.point,
          }));
        }
      } else {
        console.warn(
          `[AC] Kenkoooo API returned ${response.status} for ${handle}, will try CLIST fallback`
        );
      }
    } catch (error) {
      console.warn(
        `[AC] Kenkoooo API error for ${handle}: ${error.message}, will try CLIST fallback`
      );
    }

    // FALLBACK: Use CLIST contest statistics to extract solved problems
    if (submissions.length === 0) {
      try {
        const clistService = new ClistService();
        if (clistService.isConfigured()) {
          // Get account first
          const account = await clistService.findAccount('atcoder', handle);
          if (account?.id) {
            const data = await clistService.fetchApi('statistics', {
              account_id: account.id,
              order_by: '-date',
              with_problems: true,
              limit: 10000,
            });

            if (data?.objects) {
              const allProblems = await this.getAllProblems();

              for (const stat of data.objects) {
                if (
                  !stat.addition?.problems ||
                  typeof stat.addition.problems !== 'object'
                )
                  continue;

                const contestUrl = stat.contest?.url;
                let contestId = null;
                if (contestUrl) {
                  const match = contestUrl.match(/\/contests\/([^/]+)/);
                  if (match) contestId = match[1];
                }

                const contestDate = stat.contest?.start || stat.date;

                // Apply fromTimestamp filter
                if (fromTimestamp && contestDate) {
                  if (
                    new Date(contestDate).getTime() <=
                    new Date(fromTimestamp).getTime()
                  ) {
                    continue;
                  }
                }

                for (const [label, value] of Object.entries(
                  stat.addition.problems
                )) {
                  const isSolved =
                    value?.result?.includes('+') || value?.result === 'AC';
                  if (!isSolved) continue;

                  // Try to derive problem_id from contest_id and label
                  const problemId = contestId
                    ? `${contestId}_${label.toLowerCase()}`
                    : `${stat.contest_id}_${label}`;

                  submissions.push({
                    submission_id: `clist_ac_${stat.contest_id}_${label}`,
                    problem_id: problemId,
                    problem_name:
                      value?.name ||
                      allProblems[problemId]?.name ||
                      `${stat.contest?.title || 'Contest'} - ${label}`,
                    problem_url:
                      value?.url ||
                      (contestId
                        ? `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`
                        : null),
                    contest_id: contestId || stat.contest_id?.toString(),
                    verdict: 'AC',
                    language: 'Unknown',
                    submitted_at: contestDate || new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      } catch (clistError) {
        console.error('[AC] CLIST fallback error:', clistError.message);
      }
    }

    if (submissions.length > 0) {
      await this.setCache(cacheKey, submissions, 120);
    }
    return submissions;
  }

  async getUserStats(handle) {
    const cacheKey = `ac_stats_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Get rating history from official AtCoder API (this still works)
      const ratingHistory = await fetchWithTimeout(
        `${this.officialBase}/users/${handle}/history/json`
      )
        .then((r) => {
          if (!r.ok) throw new Error('User not found');
          return r.json();
        })
        .catch(() => []);

      // Count unique AC'd problems from submissions API (reliable)
      // The old ac_count endpoint was deprecated and returns 404
      const submissions = await this.getSubmissions(handle);
      const acProblems = new Set();
      submissions.forEach((sub) => {
        if (sub.verdict === 'AC') acProblems.add(sub.problem_id);
      });
      const acCount = acProblems.size;

      const stats = {
        ac_count: acCount,
        rating:
          ratingHistory.length > 0
            ? ratingHistory[ratingHistory.length - 1].NewRating
            : 0,
        max_rating:
          ratingHistory.length > 0
            ? Math.max(...ratingHistory.map((r) => r.NewRating))
            : 0,
        contests: ratingHistory.filter((r) => r.IsRated).length,
        total_contests: ratingHistory.length,
        // Extract total participants from each contest's Place field
        // Place = user's rank, so the contest had at least that many participants
        total_participants:
          ratingHistory.length > 0
            ? ratingHistory.reduce((sum, r) => sum + (r.Place || 0), 0)
            : 0,
        rating_history: ratingHistory.slice(-20), // Last 20 contests
      };

      await this.setCache(cacheKey, stats, 3600);
      return stats;
    } catch (error) {
      console.error('AtCoder stats error:', error.message);
      return {
        ac_count: 0,
        rating: 0,
        max_rating: 0,
        contests: 0,
        total_contests: 0,
      };
    }
  }

  /**
   * Get rating history for a user (standalone method for sync)
   * @param {string} handle - AtCoder handle
   * @returns {Array} - Rating history entries
   */
  async getRatingHistory(handle) {
    const cacheKey = `ac_rating_history_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(
        `${this.officialBase}/users/${handle}/history/json`
      );

      if (!response.ok) {
        console.warn(`[AC] Rating history not found for ${handle}`);
        return [];
      }

      const ratingHistory = await response.json();

      // Transform to standard format
      const history = ratingHistory.map((entry) => ({
        contest_id: entry.ContestScreenName || entry.ContestName,
        contest_name: entry.ContestName,
        rank: entry.Place,
        old_rating: entry.OldRating,
        new_rating: entry.NewRating,
        rating_change: entry.NewRating - entry.OldRating,
        is_rated: entry.IsRated,
        date: entry.EndTime,
      }));

      await this.setCache(cacheKey, history, 3600);
      return history;
    } catch (error) {
      console.error('[AC] Rating history error:', error.message);
      return [];
    }
  }

  /**
   * Fetch all AtCoder problems (cached)
   * @returns {Object} - Map of problem_id -> problem data
   */
  async getAllProblems() {
    const cacheKey = 'atcoder_all_problems';
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = 'https://kenkoooo.com/atcoder/resources/problems.json';
      const response = await fetchWithTimeout(url, {}, 60000, 2, 3000);
      const problems = await response.json();

      // Convert to map for faster lookup
      const problemMap = {};
      problems.forEach((p) => {
        problemMap[p.id] = {
          id: p.id,
          contest_id: p.contest_id,
          name: p.title,
          url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`,
        };
      });

      // Cache for 1 day
      await this.setCache(cacheKey, problemMap, 24 * 60 * 60);
      return problemMap;
    } catch (error) {
      console.error('[AC] Error fetching all problems:', error.message);
      return {};
    }
  }

  /**
   * Get problems for a specific contest
   * @param {string} contestId - AtCoder contest ID (e.g., "abc123")
   * @returns {Array} - Array of problem objects
   */
  async getContestProblems(contestId) {
    const allProblems = await this.getAllProblems();

    // Filter problems for this contest
    const contestProblems = Object.values(allProblems).filter(
      (p) => p.contest_id === contestId
    );

    // Sort by problem ID (which typically gives correct order)
    return contestProblems.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Enrich contests with problem-level data from submissions
   * Includes ALL problems (solved, attempted, unattempted) and tracks upsolves
   * @param {Array} contests - Array of contest objects from CLIST
   * @param {string} handle - AtCoder handle
   * @returns {Array} - Contests enriched with problems array
   */
  async enrichContestsWithProblems(contests, handle) {
    if (!contests || contests.length === 0) return contests;
    // Fetch all submissions for this user
    const submissions = await this.getSubmissions(handle);
    // Pre-fetch all problems (single API call, cached)
    await this.getAllProblems();

    // Group submissions by contest_id
    const submissionsByContest = {};
    submissions.forEach((sub) => {
      if (!sub.contest_id) return;
      if (!submissionsByContest[sub.contest_id]) {
        submissionsByContest[sub.contest_id] = [];
      }
      submissionsByContest[sub.contest_id].push(sub);
    });
    // Enrich each contest
    const enrichedContests = [];
    for (const contest of contests) {
      // Use platformContestId for matching with submissions (falls back to contestId if not set)
      const matchId = contest.platformContestId || contest.contestId;
      const contestSubs = submissionsByContest[matchId] || [];

      // Calculate contest end time using endDate if available, otherwise estimate from duration
      const contestStart = new Date(contest.date);
      let contestEnd;
      if (contest.endDate) {
        contestEnd = new Date(contest.endDate);
      } else {
        // Fallback: Use durationMinutes from CLIST, or duration field, or default 120 minutes
        const durationMs =
          (contest.durationMinutes || contest.duration || 120) * 60 * 1000;
        contestEnd = new Date(contestStart.getTime() + durationMs);
      }
      // Fetch ALL problems for this contest
      const contestProblems = await this.getContestProblems(matchId);

      // Build problem map from user's submissions
      const problemMap = {};
      contestSubs.forEach((sub) => {
        const problemId = sub.problem_id;
        const subTime = new Date(sub.submitted_at);

        if (!problemMap[problemId]) {
          // Extract problem label from problem_id (e.g., "abc123_a" -> "A")
          const label = problemId.split('_').pop().toUpperCase();

          problemMap[problemId] = {
            label,
            name: sub.problem_name,
            url: sub.problem_url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            attemptedDuringContest: false,
            submissions: [],
          };
        }

        problemMap[problemId].submissions.push(sub);
        problemMap[problemId].attempted = true;

        // Check if this attempt was during the contest
        if (subTime <= contestEnd) {
          problemMap[problemId].attemptedDuringContest = true;
        }

        if (sub.verdict === 'AC') {
          problemMap[problemId].solved = true;
          // Check if solved during contest or after (upsolve)
          // Priority: solvedDuringContest > upsolve (if solved during contest, don't mark as upsolve)
          if (subTime <= contestEnd) {
            problemMap[problemId].solvedDuringContest = true;
            // If we already marked it as upsolve but now found an earlier AC during contest, remove upsolve flag
            problemMap[problemId].upsolve = false;
          } else if (!problemMap[problemId].solvedDuringContest) {
            // Only mark as upsolve if not already solved during contest
            problemMap[problemId].upsolve = true;
          }
        }
      });

      // Add unattempted problems from the contest problem list
      contestProblems.forEach((cp) => {
        if (!problemMap[cp.id]) {
          const label = cp.id.split('_').pop().toUpperCase();
          problemMap[cp.id] = {
            label,
            name: cp.name,
            url: cp.url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            attemptedDuringContest: false,
            submissions: [],
          };
        }
      });

      // Convert to array and sort by label (A, B, C, ...)
      const problems = Object.values(problemMap).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      const solvedCount = problems.filter((p) => p.solvedDuringContest).length;
      const upsolveCount = problems.filter(
        (p) => p.upsolve && !p.solvedDuringContest
      ).length;
      const attemptedCount = problems.filter((p) => p.attempted).length;
      const totalProblems = problems.length;
      enrichedContests.push({
        ...contest,
        problems,
        solved: solvedCount,
        upsolves: upsolveCount,
        totalProblems,
      });
    }

    return enrichedContests;
  }

  mapVerdict(result) {
    const map = {
      AC: 'AC',
      WA: 'WA',
      TLE: 'TLE',
      MLE: 'MLE',
      RE: 'RE',
      CE: 'CE',
    };
    return map[result] || 'WA';
  }

  mapDifficultyTier(point) {
    if (point <= 100) return 'easy';
    if (point <= 300) return 'medium';
    if (point <= 500) return 'hard';
    return 'expert';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// LEETCODE SERVICE
// ============================================

export class LeetCodeService {
  constructor() {
    this.graphqlEndpoint = 'https://leetcode.com/graphql';
  }

  /**
   * Build fetch options for GraphQL requests, optionally injecting a session cookie.
   */
  _buildHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Referer: 'https://leetcode.com/',
      ...extra,
    };

    // LeetCode's GraphQL requires CSRF Double Submit protection.
    // If we pass an auth cookie, we MUST also provide a matching csrftoken
    // cookie and X-CSRFToken header, otherwise the API drops our auth state silently.
    if (headers.Cookie && headers.Cookie.includes('LEETCODE_SESSION=')) {
      let csrfToken = 'neupc_sync_dummy_csrf_9999';
      const csrfMatch = headers.Cookie.match(/csrftoken=([^;]+)/);

      if (csrfMatch) {
        csrfToken = csrfMatch[1];
      } else {
        headers.Cookie = `${headers.Cookie}; csrftoken=${csrfToken}`;
      }
      headers['X-CSRFToken'] = csrfToken;
    }

    return headers;
  }

  async getUserProfile(username) {
    username = this._normalizeUsername(username);
    if (!username) {
      throw new Error('LeetCode username is required');
    }

    const cacheKey = `lc_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const query = `
      query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats: submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          profile {
            ranking
            reputation
          }
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
      }
    `;

    const response = await fetchWithTimeout(this.graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username } }),
    });

    const data = await response.json();

    if (!data.data?.matchedUser) {
      throw new Error('LeetCode user not found');
    }

    const user = data.data.matchedUser;
    const stats = user.submitStats.acSubmissionNum.reduce((acc, item) => {
      acc[item.difficulty.toLowerCase()] = item.count;
      return acc;
    }, {});

    const contestRanking = data.data.userContestRanking;

    const profile = {
      username: user.username,
      ranking: user.profile.ranking,
      total_solved: Object.values(stats).reduce((a, b) => a + b, 0),
      easy: stats.easy || 0,
      medium: stats.medium || 0,
      hard: stats.hard || 0,
      // Contest data
      contest_rating: contestRanking?.rating || 0,
      contests_attended: contestRanking?.attendedContestsCount || 0,
      total_participants: contestRanking?.totalParticipants || 0,
      global_ranking: contestRanking?.globalRanking || 0,
      top_percentage: contestRanking?.topPercentage || 0,
    };

    await this.setCache(cacheKey, profile, 600);
    return profile;
  }

  /**
   * Get contest ranking history (public API, no auth needed)
   * Returns per-contest details: title, problemsSolved, ranking, timestamp, totalParticipants
   */
  async getContestRanking(username) {
    username = this._normalizeUsername(username);
    if (!username) {
      return { rating: 0, attendedContests: 0, contests: [] };
    }

    const cacheKey = `lc_contest_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const query = `
      query userContestRankingInfo($username: String!) {
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
        userContestRankingHistory(username: $username) {
          attended
          trendDirection
          problemsSolved
          totalProblems
          ranking
          rating
          contest {
            title
            startTime
          }
        }
      }
    `;

    try {
      const response = await fetchWithTimeout(this.graphqlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { username } }),
      });

      const data = await response.json();

      const ranking = data.data?.userContestRanking || {};
      const history = data.data?.userContestRankingHistory || [];

      const result = {
        rating: ranking.rating || 0,
        attendedContests: ranking.attendedContestsCount || 0,
        globalRanking: ranking.globalRanking || 0,
        totalParticipants: ranking.totalParticipants || 0,
        topPercentage: ranking.topPercentage || 0,
        contests: history
          .filter((entry) => entry.attended)
          .map((entry) => ({
            title: entry.contest?.title || 'Unknown Contest',
            problemsSolved: entry.problemsSolved || 0,
            totalProblems: entry.totalProblems || 4,
            ranking: entry.ranking || 0,
            rating: entry.rating || 0,
            startTime: this._unixTimestampToIsoOrNull(entry.contest?.startTime),
          })),
      };

      await this.setCache(cacheKey, result, 600);
      return result;
    } catch (error) {
      console.error('[LC] Contest ranking error:', error.message);
      return { rating: 0, attendedContests: 0, contests: [] };
    }
  }

  _unixTimestampToIsoOrNull(timestamp) {
    const seconds = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    const parsed = new Date(seconds * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  _dateLikeToIsoOrNull(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  _normalizeUsername(rawUsername) {
    if (rawUsername == null) return '';

    let username = String(rawUsername).trim();
    if (!username) return '';

    username = username.replace(/^@+/, '');
    username = username.replace(
      /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\//i,
      ''
    );
    username = username.replace(/^(?:u|profile)\//i, '');
    username = username.split(/[/?#]/)[0].replace(/^@+/, '').trim();

    return username;
  }

  _getUsernameCandidates(rawUsername) {
    const normalized = this._normalizeUsername(rawUsername);
    if (!normalized) return [];

    const candidates = [normalized];
    const lower = normalized.toLowerCase();
    if (lower !== normalized) {
      candidates.push(lower);
    }

    return candidates;
  }

  async getRecentSubmissions(username, limit = 20) {
    username = this._normalizeUsername(username);
    if (!username) return [];

    const cacheKey = `lc_recent_${username}_${limit}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
          lang
        }
      }
    `;

    const response = await fetchWithTimeout(this.graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { username, limit } }),
    });

    const data = await response.json();

    if (!data.data?.recentAcSubmissionList) {
      return [];
    }

    const submissions = data.data.recentAcSubmissionList.map((sub) => ({
      submission_id: sub.id,
      problem_id: sub.titleSlug,
      problem_name: sub.title,
      problem_url: `https://leetcode.com/problems/${sub.titleSlug}/`,
      verdict: 'AC',
      language: sub.lang,
      submitted_at: this._unixTimestampToIsoOrNull(sub.timestamp),
    }));

    await this.setCache(cacheKey, submissions, 120);
    return submissions;
  }

  /**
   * Fetch problem metadata (tags + difficulty) for a list of problem slugs
   * Uses LeetCode's questionData GraphQL query
   * @param {Array<string>} slugs - Array of problem titleSlugs
   * @returns {Map<string, Object>} Map of slug -> { difficulty, tags, questionId }
   */
  async getProblemMetadataBatch(slugs) {
    if (!slugs || slugs.length === 0) return new Map();

    const cacheKey = `lc_prob_meta_batch_${slugs.sort().join('_').substring(0, 200)}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return new Map(Object.entries(cached));

    const metadataMap = new Map();

    // Process in batches of 10 to avoid overloading LC API
    const batchSize = 10;
    for (let i = 0; i < slugs.length; i += batchSize) {
      const batch = slugs.slice(i, i + batchSize);

      const promises = batch.map(async (slug) => {
        try {
          const meta = await this.getProblemMetadata(slug);
          if (meta) {
            metadataMap.set(slug, meta);
          }
        } catch (err) {
          // Silently skip problems we can't fetch metadata for
          console.warn(
            `[LC] Could not fetch metadata for ${slug}: ${err.message}`
          );
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < slugs.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Cache the results
    if (metadataMap.size > 0) {
      const cacheObj = {};
      metadataMap.forEach((v, k) => {
        cacheObj[k] = v;
      });
      await this.setCache(cacheKey, cacheObj, 86400); // Cache 24 hours
    }

    return metadataMap;
  }

  /**
   * Fetch metadata for a single problem (tags, difficulty, questionId)
   * @param {string} titleSlug - Problem slug
   * @returns {Object|null} { difficulty, difficultyRating, tags, questionId, title }
   */
  async getProblemMetadata(titleSlug) {
    if (!titleSlug) return null;

    const cacheKey = `lc_prob_${titleSlug}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          titleSlug
          difficulty
          topicTags {
            name
            slug
          }
        }
      }
    `;

    try {
      const response = await fetchWithTimeout(this.graphqlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { titleSlug } }),
      });

      const data = await response.json();
      const q = data.data?.question;
      if (!q) return null;

      const result = {
        questionId: q.questionId,
        title: q.title,
        titleSlug: q.titleSlug,
        difficulty: q.difficulty, // "Easy", "Medium", "Hard"
        difficultyRating:
          q.difficulty === 'Easy' ? 1 : q.difficulty === 'Medium' ? 2 : 3,
        tags: (q.topicTags || []).map((t) => t.name),
      };

      await this.setCache(cacheKey, result, 604800); // Cache 7 days
      return result;
    } catch (error) {
      console.warn(
        `[LC] Error fetching metadata for ${titleSlug}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Get contest problems for a specific contest
   * @param {string} contestSlug - Contest slug (e.g. "weekly-contest-393")
   * @returns {Array|null} Array of problem objects or null
   */
  async getContestProblems(contestSlug) {
    const cacheKey = `lc_contest_problems_${contestSlug}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const query = `
        query contestInfo($titleSlug: String!) {
          contest(titleSlug: $titleSlug) {
            title
            titleSlug
            startTime
            duration
            questions {
              credit
              title
              titleSlug
            }
          }
        }
      `;

      const response = await fetchWithTimeout(this.graphqlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { titleSlug: contestSlug } }),
      });

      const data = await response.json();
      const contest = data.data?.contest;
      if (!contest?.questions || contest.questions.length === 0) return null;

      // Sort by credit ascending (Q1=easiest, Q4=hardest)
      const problems = contest.questions
        .sort((a, b) => (a.credit || 0) - (b.credit || 0))
        .map((q, index) => ({
          label: `Q${index + 1}`,
          index: String.fromCharCode(65 + index), // A, B, C, D
          title: q.title,
          titleSlug: q.titleSlug,
          credit: q.credit,
          url: `https://leetcode.com/problems/${q.titleSlug}/`,
        }));

      await this.setCache(cacheKey, problems, 604800); // Cache 7 days
      return problems;
    } catch (error) {
      console.warn(
        `[LC] Error fetching contest problems for ${contestSlug}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Enrich contests with per-problem data (solved/attempted/unattempted)
   * Similar to CodeforcesService.enrichContestsWithProblems
   * @param {Array} contests - Array of contest objects from CLIST or getContestRanking
   * @param {string} username - LeetCode username
   * @returns {Array} Enriched contests with problems array
   */
  async enrichContestsWithProblems(contests, username) {
    if (!contests || contests.length === 0) return contests;
    // Get all recent AC submissions to match against contests
    let allSubs = [];
    try {
      allSubs = await this.getRecentSubmissions(username, 500);
    } catch (err) {
      console.warn(
        `[LC] Could not fetch submissions for enrichment: ${err.message}`
      );
    }

    // Build a set of solved problem slugs from submissions
    const solvedSlugs = new Set(allSubs.map((s) => s.problem_id));

    const enrichedContests = [];

    for (const contest of contests) {
      // Derive contest slug from title or use provided one
      const contestSlug =
        contest.contestSlug ||
        contest.contestId ||
        (contest.name || contest.contestName || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+$/, '');

      // Fetch contest problems from LeetCode API
      const contestProblems = await this.getContestProblems(contestSlug);

      let problems = [];
      const totalSolvedFromContest =
        contest.solved || contest.problemsSolved || 0;

      if (contestProblems && contestProblems.length > 0) {
        // We have actual contest problem data
        problems = contestProblems.map((cp, index) => {
          const isSolvedInContest = index < totalSolvedFromContest;
          const isSolvedEver = solvedSlugs.has(cp.titleSlug);

          return {
            label: cp.index || String.fromCharCode(65 + index),
            name: cp.title,
            url: cp.url,
            solved: isSolvedInContest || isSolvedEver,
            solvedDuringContest: isSolvedInContest,
            upsolve: !isSolvedInContest && isSolvedEver,
            attempted: isSolvedInContest || isSolvedEver,
            result: isSolvedInContest ? '+' : isSolvedEver ? '+' : null,
          };
        });
      } else {
        // Fallback: generate generic problem labels
        const totalProblems = contest.totalProblems || 4;
        for (let i = 0; i < totalProblems; i++) {
          const isSolved = i < totalSolvedFromContest;
          problems.push({
            label: String.fromCharCode(65 + i),
            name: `${contest.name || contest.contestName || 'Contest'} - Q${i + 1}`,
            url: `https://leetcode.com/contest/${contestSlug}/`,
            solved: isSolved,
            solvedDuringContest: isSolved,
            upsolve: false,
            attempted: isSolved,
            result: isSolved ? '+' : null,
          });
        }
      }

      const solvedCount = problems.filter((p) => p.solvedDuringContest).length;
      const upsolveCount = problems.filter(
        (p) => p.upsolve && !p.solvedDuringContest
      ).length;

      enrichedContests.push({
        ...contest,
        problems,
        solved: solvedCount,
        upsolves: upsolveCount,
        totalProblems: problems.length,
      });

      // Small delay between contest API calls
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return enrichedContests;
  }

  /**
   * Get ALL accepted submissions for a user (for full sync)
   * Uses MULTI-SOURCE MERGE strategy:
   * 1. recentAcSubmissionList (max 500 most recent AC submissions)
   * 2. Contest ranking history + contest problems API (all contest-solved problems)
   * 3. CLIST fallback for additional contest data
   * All sources are merged and deduplicated by problem_id
   */
  async getAllSubmissions(username, fromTimestamp = null, authToken = null) {
    username = this._normalizeUsername(username);
    if (!username) return [];

    const effectiveAuthToken = authToken || null;
    const enableExternalFallbacks =
      process.env.ENABLE_LEETCODE_EXTERNAL_FALLBACKS === 'true';
    const enableHeuristicSources =
      process.env.ENABLE_LEETCODE_HEURISTIC_SOURCES === 'true';

    const cacheKey = `lc_all_${username}_${fromTimestamp || 'all'}_${effectiveAuthToken ? 'auth' : 'noauth'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Map to deduplicate by problem_id (titleSlug)
    const submissionMap = new Map();

    const addSubmission = (sub) => {
      const key = sub.problem_id;
      if (!submissionMap.has(key)) {
        submissionMap.set(key, sub);
      } else {
        // Keep the entry with more complete data or more recent timestamp
        const existing = submissionMap.get(key);
        // Prefer entries with real submission IDs over synthetic ones
        if (
          (sub.submission_id &&
            !sub.submission_id.startsWith('lc_contest_') &&
            !sub.submission_id.startsWith('clist_')) ||
          (sub.language &&
            sub.language !== 'Unknown' &&
            (!existing.language || existing.language === 'Unknown')) ||
          (!existing.tags && sub.tags)
        ) {
          submissionMap.set(key, { ...existing, ...sub });
        }
      }
    };

    // ============================
    // SOURCE 1: Submissions via GraphQL
    //   - WITH auth token: paginated submissionList (ALL accepted submissions)
    //   - WITHOUT auth token: recentAcSubmissionList (public, limited to ~20)
    // ============================
    let leetcodeStats = null;
    let submissionCalendar = null;
    let source1AuthSuccess = false; // true when we got full data via session cookie

    try {
      // Always fetch profile stats & calendar (these are public)
      const profileQuery = `
        query userProfile($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
            submissionCalendar
          }
        }
      `;

      const profileResp = await fetchWithTimeout(this.graphqlEndpoint, {
        method: 'POST',
        headers: this._buildHeaders(
          effectiveAuthToken
            ? { Cookie: `LEETCODE_SESSION=${effectiveAuthToken}` }
            : {}
        ),
        body: JSON.stringify({ query: profileQuery, variables: { username } }),
      });
      const profileData = await profileResp.json();

      if (profileData.data?.matchedUser) {
        leetcodeStats =
          profileData.data.matchedUser.submitStatsGlobal?.acSubmissionNum;
        if (profileData.data.matchedUser.submissionCalendar) {
          try {
            submissionCalendar = JSON.parse(
              profileData.data.matchedUser.submissionCalendar
            );
          } catch (e) {}
        }
      }

      if (effectiveAuthToken) {
        // ── AUTHENTICATED PATH: paginated submissionList ──────────────────────
        // Fetches every accepted submission in batches of 20 until done.
        const subListQuery = `
          query submissionList($offset: Int!, $limit: Int!, $questionSlug: String!) {
            submissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
              hasNext
              submissions {
                id
                title
                titleSlug
                statusDisplay
                lang
                timestamp
              }
            }
          }
        `;

        let offset = 0;
        const pageSize = 20;
        let hasNext = true;
        let authSubCount = 0;

        while (hasNext) {
          const pageResp = await fetchWithTimeout(this.graphqlEndpoint, {
            method: 'POST',
            headers: this._buildHeaders({
              Cookie: `LEETCODE_SESSION=${effectiveAuthToken}`,
            }),
            body: JSON.stringify({
              query: subListQuery,
              variables: { offset, limit: pageSize, questionSlug: '' },
            }),
          });

          const pageData = await pageResp.json();

          // Detect auth failure (cookie invalid/expired)
          if (pageData.errors || !pageData.data?.submissionList) {
            console.warn(
              `[LC] Auth submissionList failed (invalid/expired cookie?): ${JSON.stringify(pageData.errors || 'no data')}`
            );
            break;
          }

          const { submissions, hasNext: nextPage } =
            pageData.data.submissionList;
          hasNext = nextPage;

          for (const sub of submissions || []) {
            const submittedAt = this._unixTimestampToIsoOrNull(sub.timestamp);
            if (!submittedAt) continue;

            // Check chronological checkpoint for early break to optimize sync
            if (
              fromTimestamp &&
              new Date(submittedAt) <= new Date(fromTimestamp)
            ) {
              hasNext = false; // Set flag to break the outer while loop
              break; // Break inner loop; remaining entries are older
            }

            if (sub.statusDisplay !== 'Accepted') continue;
            addSubmission({
              submission_id: sub.id,
              problem_id: sub.titleSlug,
              problem_name: sub.title,
              problem_url: `https://leetcode.com/problems/${sub.titleSlug}/`,
              verdict: 'AC',
              language: sub.lang,
              submitted_at: submittedAt,
            });
            authSubCount++;
          }

          offset += pageSize;

          // Safety cap: stop at 50000 submissions
          if (offset > 50000) {
            console.warn(
              `[LC] Auth submissionList: hit 50000 submission cap, stopping`
            );
            break;
          }

          // Small delay between pages
          if (hasNext) await new Promise((r) => setTimeout(r, 150));
        }

        if (authSubCount > 0) {
          source1AuthSuccess = true;
        } else {
          console.warn(
            `[LC] Source 1 (auth): Got 0 submissions — cookie may be expired or username mismatch`
          );
        }
      } else {
        // ── PUBLIC PATH: LeetCode GraphQL only (no third-party proxy required) ─
        const usernameCandidates = this._getUsernameCandidates(username);

        const recentAcQuery = `
          query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id title titleSlug timestamp lang
            }
          }
        `;

        const recentSubmissionQuery = `
          query recentSubmissions($username: String!, $limit: Int!) {
            recentSubmissionList(username: $username, limit: $limit) {
              id title titleSlug timestamp statusDisplay lang
            }
          }
        `;

        let source1PublicCount = 0;

        for (const candidate of usernameCandidates) {
          const recentResp = await fetchWithTimeout(this.graphqlEndpoint, {
            method: 'POST',
            headers: this._buildHeaders(),
            body: JSON.stringify({
              query: recentAcQuery,
              variables: { username: candidate, limit: 100 },
            }),
          });

          const recentData = await recentResp.json();
          const recentSubs = recentData.data?.recentAcSubmissionList || [];

          for (const sub of recentSubs) {
            addSubmission({
              submission_id: sub.id,
              problem_id: sub.titleSlug,
              problem_name: sub.title,
              problem_url: `https://leetcode.com/problems/${sub.titleSlug}/`,
              verdict: 'AC',
              language: sub.lang,
              submitted_at: this._unixTimestampToIsoOrNull(sub.timestamp),
            });
            source1PublicCount++;
          }

          if (source1PublicCount > 0) {
            if (candidate !== username) {
              console.log(
                `[LC] Source 1: Using normalized username candidate '${candidate}'`
              );
            }
            break;
          }
        }

        if (source1PublicCount === 0) {
          for (const candidate of usernameCandidates) {
            try {
              const altResp = await fetchWithTimeout(this.graphqlEndpoint, {
                method: 'POST',
                headers: this._buildHeaders(),
                body: JSON.stringify({
                  query: recentSubmissionQuery,
                  variables: { username: candidate, limit: 100 },
                }),
              });

              const altData = await altResp.json();
              const recentSubs = altData.data?.recentSubmissionList || [];

              for (const sub of recentSubs) {
                const verdict = normalizeSubmissionVerdict(
                  sub.statusDisplay || ''
                );
                if (verdict !== 'AC') continue;

                addSubmission({
                  submission_id: sub.id,
                  problem_id: sub.titleSlug,
                  problem_name: sub.title,
                  problem_url: `https://leetcode.com/problems/${sub.titleSlug}/`,
                  verdict: 'AC',
                  language: sub.lang,
                  submitted_at: this._unixTimestampToIsoOrNull(sub.timestamp),
                });
                source1PublicCount++;
              }

              if (source1PublicCount > 0) {
                console.log(
                  `[LC] Source 1: Populated ${source1PublicCount} submissions from recentSubmissionList fallback`
                );
                break;
              }
            } catch (altError) {
              console.warn(
                `[LC] Source 1 recentSubmissionList fallback error for ${candidate}: ${altError.message}`
              );
            }
          }
        }

        if (source1PublicCount === 0) {
          const externalFallbackMessage = enableExternalFallbacks
            ? '[LC] Source 1: No submissions from official GraphQL sources. External fallbacks are enabled but unavailable or returned nothing.'
            : '[LC] Source 1: No submissions from official GraphQL sources. External fallbacks are disabled.';
          console.warn(externalFallbackMessage);
        }
      }
    } catch (error) {
      console.warn(`[LC] Source 1 error for ${username}: ${error.message}`);
    }

    // ============================
    // SOURCE 2: Contest ranking history + contest problems API
    // Gets ALL contest-solved problems with real problem slugs
    // ============================
    if (enableHeuristicSources) {
      try {
        const contestData = await this.getContestRanking(username);

        if (contestData?.contests?.length > 0) {
          let contestSubmissions = 0;

          for (const contest of contestData.contests) {
            if (contest.problemsSolved <= 0) continue;

            const contestDate = this._dateLikeToIsoOrNull(contest.startTime);

            // Derive contest slug
            const contestSlug = contest.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-+$/, '');

            // Fetch actual problem names from the contest page
            const contestProblems = await this.getContestProblems(contestSlug);

            if (contestProblems && contestProblems.length > 0) {
              const solvedCount = Math.min(
                contest.problemsSolved,
                contestProblems.length
              );

              for (let i = 0; i < solvedCount; i++) {
                const prob = contestProblems[i];
                addSubmission({
                  submission_id: `lc_contest_${contestSlug}_${prob.titleSlug}`,
                  problem_id: prob.titleSlug,
                  problem_name: prob.title,
                  problem_url: `https://leetcode.com/problems/${prob.titleSlug}/`,
                  contest_id: contestSlug,
                  verdict: 'AC',
                  language: 'Unknown',
                  submitted_at: contestDate,
                });
                contestSubmissions++;
              }
            } else {
              // Fallback: generate generic entries
              for (let i = 0; i < contest.problemsSolved; i++) {
                const problemLabel = String.fromCharCode(65 + i);
                addSubmission({
                  submission_id: `lc_contest_${contestSlug}_${problemLabel}`,
                  problem_id: `${contestSlug}-q${i + 1}`,
                  problem_name: `${contest.title} - Q${i + 1}`,
                  problem_url: `https://leetcode.com/contest/${contestSlug}/`,
                  contest_id: contestSlug,
                  verdict: 'AC',
                  language: 'Unknown',
                  submitted_at: contestDate,
                });
                contestSubmissions++;
              }
            }

            // Small delay between contest API calls
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      } catch (contestError) {
        console.error('[LC] Source 2 error:', contestError.message);
      }
    }

    // ============================
    // SOURCE 3: CLIST statistics (optional external fallback)
    // ============================
    if (enableHeuristicSources && enableExternalFallbacks) {
      try {
        const clistService = new ClistService();
        if (clistService.isConfigured()) {
          const account = await clistService.findAccount('leetcode', username);
          if (account?.id) {
            const data = await clistService.fetchApi('statistics', {
              account_id: account.id,
              order_by: '-date',
              limit: 10000,
            });

            if (data?.objects) {
              let clistSubmissions = 0;

              for (const stat of data.objects) {
                if (
                  !stat.addition?.problems ||
                  typeof stat.addition.problems !== 'object'
                )
                  continue;

                const contestDate = this._dateLikeToIsoOrNull(
                  stat.contest?.start || stat.date
                );

                for (const [label, value] of Object.entries(
                  stat.addition.problems
                )) {
                  const isSolved =
                    value?.result?.includes('+') || value?.result === 'AC';
                  if (!isSolved) continue;

                  const titleSlug =
                    value?.short ||
                    value?.name?.toLowerCase().replace(/\s+/g, '-') ||
                    label;

                  addSubmission({
                    submission_id: `clist_lc_${stat.contest_id}_${label}`,
                    problem_id: titleSlug,
                    problem_name:
                      value?.name ||
                      `${stat.contest?.title || 'Contest'} - ${label}`,
                    problem_url: value?.url
                      ? `https://leetcode.com${value.url}`
                      : `https://leetcode.com/problems/${titleSlug}/`,
                    contest_id: stat.contest_id?.toString(),
                    verdict: 'AC',
                    language: 'Unknown',
                    submitted_at: contestDate,
                  });
                  clistSubmissions++;
                }
              }
            }
          }
        }
      } catch (clistError) {
        console.error('[LC] Source 3 error:', clistError.message);
      }
    }

    // ============================
    // SOURCE 4: Tag-intersection problem recovery (no auth required)
    // Skipped when Source 1 (authenticated) successfully retrieved all submissions.
    // ============================
    let leetcodeTagStats = null;

    if (enableHeuristicSources && !source1AuthSuccess)
      try {
        // Step 4a: Get per-tag solve counts (public)
        const tagQuery = `
        query getUserTagStats($username: String!) {
          matchedUser(username: $username) {
            tagProblemCounts {
              advanced { tagName tagSlug problemsSolved }
              intermediate { tagName tagSlug problemsSolved }
              fundamental { tagName tagSlug problemsSolved }
            }
            submitStatsGlobal {
              acSubmissionNum { difficulty count }
            }
          }
        }
      `;

        const tagResp = await fetchWithTimeout(this.graphqlEndpoint, {
          method: 'POST',
          headers: this._buildHeaders(),
          body: JSON.stringify({ query: tagQuery, variables: { username } }),
        });
        const tagData = await tagResp.json();

        if (!tagData.data?.matchedUser) throw new Error('No matchedUser');

        // Build tag score map: slug → solve count (only tags user has solved)
        const allTagGroups = [
          ...(tagData.data.matchedUser.tagProblemCounts?.fundamental || []),
          ...(tagData.data.matchedUser.tagProblemCounts?.intermediate || []),
          ...(tagData.data.matchedUser.tagProblemCounts?.advanced || []),
        ];
        const userTagMap = new Map(); // tagSlug → count solved
        for (const t of allTagGroups) {
          if (t.problemsSolved > 0) {
            userTagMap.set(t.tagSlug, t.problemsSolved);
          }
        }

        // Extract difficulty targets from submitStats
        const acStats =
          tagData.data.matchedUser.submitStatsGlobal?.acSubmissionNum || [];
        const targetCounts = {
          EASY: acStats.find((s) => s.difficulty === 'Easy')?.count || 0,
          MEDIUM: acStats.find((s) => s.difficulty === 'Medium')?.count || 0,
          HARD: acStats.find((s) => s.difficulty === 'Hard')?.count || 0,
        };

        leetcodeTagStats = targetCounts;

        if (userTagMap.size === 0) throw new Error('No tag data available');
        // Step 4b: Fetch ALL LeetCode free problems using the public REST endpoint
        const allProblemsResp = await fetchWithTimeout(
          'https://leetcode.com/api/problems/all/',
          { headers: this._buildHeaders() },
          30000,
          2,
          2000
        );
        const allProblemsData = await allProblemsResp.json();
        const allFreeProblems = (
          allProblemsData.stat_status_pairs || []
        ).filter((p) => !p.paid_only);

        const difficultyMap = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' };
        for (const [lcDiff, tierStr] of Object.entries(difficultyMap)) {
          const target = targetCounts[lcDiff] || 0;
          if (target === 0) continue;

          // Count how many we already have for this difficulty from other sources
          const alreadyHave = Array.from(submissionMap.values()).filter((s) => {
            const d =
              s.difficulty_tier ||
              (s.difficulty_rating === 1
                ? 'easy'
                : s.difficulty_rating === 3
                  ? 'hard'
                  : 'medium');
            return d === tierStr;
          }).length;

          const needed = target - alreadyHave;
          if (needed <= 0) continue;

          // Filter the pre-fetched list by difficulty level
          const levelNum = lcDiff === 'EASY' ? 1 : lcDiff === 'MEDIUM' ? 2 : 3;
          const problems = allFreeProblems
            .filter((p) => p.difficulty?.level === levelNum)
            .map((p) => ({
              title: p.stat.question__title,
              titleSlug: p.stat.question__title_slug,
            }));

          // Pick top-N candidates (first `needed` problems of that difficulty)
          const picks = problems
            .filter((p) => !submissionMap.has(p.titleSlug))
            .slice(0, needed);

          for (const p of picks) {
            addSubmission({
              submission_id: `lc_inferred_${tierStr}_${p.titleSlug}`,
              problem_id: p.titleSlug,
              problem_name: p.title,
              problem_url: `https://leetcode.com/problems/${p.titleSlug}/`,
              verdict: 'AC',
              language: 'Unknown',
              submitted_at: null,
              difficulty_rating: levelNum,
              difficulty_tier: tierStr,
              tags: [], // Tags can be left empty for inferred problems
            });
          }
        }
      } catch (s4Error) {
        console.warn(`[LC] Source 4 error (non-fatal): ${s4Error.message}`);
      }

    // Convert map to array
    let submissions = Array.from(submissionMap.values());
    // ============================
    // ENRICH with tags and difficulty metadata
    // ============================
    try {
      // Filter slugs that look like real problem slugs (not contest-q1 style IDs)
      const realSlugs = submissions
        .map((s) => s.problem_id)
        .filter(
          (slug) =>
            slug &&
            !slug.includes('-q') &&
            !slug.match(/^[a-z]+-contest-\d+-q\d+$/)
        );

      if (realSlugs.length > 0) {
        // Batch-fetch metadata (processes in batches of 10)
        const metadataMap = await this.getProblemMetadataBatch(
          realSlugs.slice(0, 200)
        ); // Cap at 200 to avoid excessive API calls

        let enrichedCount = 0;
        submissions = submissions.map((sub) => {
          const meta = metadataMap.get(sub.problem_id);
          if (meta) {
            enrichedCount++;
            return {
              ...sub,
              difficulty_rating: meta.difficultyRating,
              tags: meta.tags || sub.tags,
              problem_name: meta.title || sub.problem_name,
              // Only override difficulty_tier if not already set by Source 4 inferred data
              difficulty_tier:
                sub.difficulty_tier ||
                (meta.difficultyRating === 1
                  ? 'easy'
                  : meta.difficultyRating === 3
                    ? 'hard'
                    : 'medium'),
            };
          }
          return sub;
        });
      }
    } catch (enrichError) {
      console.warn(
        `[LC] Metadata enrichment error (non-fatal): ${enrichError.message}`
      );
    }

    // Synthetic padding logic has been removed to prevent double-counting and "Unknown Problem" UI clutter.

    // Filter by timestamp if provided
    if (fromTimestamp && submissions.length > 0) {
      const cutoff = Date.parse(fromTimestamp);
      if (Number.isFinite(cutoff)) {
        submissions = submissions.filter((s) => {
          const submittedAt = Date.parse(s.submitted_at || '');
          return Number.isFinite(submittedAt) && submittedAt > cutoff;
        });
      }
    }

    if (submissions.length > 0) {
      await this.setCache(cacheKey, submissions, 300);
    }

    return submissions;
  }

  /**
   * LeetCode submissions are extension-only.
   * API sync intentionally returns no submissions.
   */
  async getSubmissions(_username, _fromTimestamp = null, _authToken = null) {
    // LeetCode submission ingestion is extension-only.
    return [];
  }

  /**
   * Map LeetCode difficulty string to numeric rating
   */
  mapDifficultyTier(difficulty) {
    if (!difficulty) return 'medium';
    if (typeof difficulty === 'number') {
      if (difficulty === 1) return 'easy';
      if (difficulty === 2) return 'medium';
      return 'hard';
    }
    const d = String(difficulty).toLowerCase();
    if (d === 'easy') return 'easy';
    if (d === 'medium') return 'medium';
    return 'hard';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// TOPH SERVICE
// ============================================

export class TophService {
  constructor() {
    this.baseUrl = 'https://toph.co';
  }

  async getUserProfile(handle) {
    const normalizedHandle = handle?.trim();
    const encodedHandle = encodeURIComponent(normalizedHandle || '');

    const cacheKey = `toph_profile_${normalizedHandle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    if (!normalizedHandle) {
      throw new Error('Toph user not found');
    }

    // First try Toph API for profile stats.
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/api/users/${encodedHandle}/stats`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'NEUPC-Handle-Verification/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (!this.isNotFoundApiPayload(data)) {
          await this.setCache(cacheKey, data, 600);
          return data;
        }
      }
    } catch {
      // Continue to HTML profile fallback below.
    }

    // Fallback to public profile page to avoid false negatives from API issues.
    const profile = await this.getUserProfileFromWeb(normalizedHandle);
    if (!profile) {
      throw new Error('Toph user not found');
    }

    await this.setCache(cacheKey, profile, 600);
    return profile;
  }

  async getUserProfileFromWeb(handle) {
    try {
      const encodedHandle = encodeURIComponent(handle);
      const response = await fetchWithTimeout(
        `${this.baseUrl}/u/${encodedHandle}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NEUPC/1.0)',
            Accept: 'text/html',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const lowerHtml = html.toLowerCase();

      // Check for 404 page
      if (
        lowerHtml.includes('page not found') ||
        html.includes('<title>Page Not Found')
      ) {
        return null;
      }

      // Extract solutions count from dashlet
      // Format: dashlet__stat>18 / 2121< followed by "Problems Solved"
      // The pattern is: <div class=dashlet__stat>X / Y</div>...Problems Solved
      const solvedMatch = html.match(/dashlet__stat>(\d+)\s*\/\s*(\d+)</);

      // Extract rating - first dashlet__stat is usually rating or "Unrated"
      const ratingMatch = html.match(/dashlet__stat>(\d+)</);
      const isUnrated = html.includes('dashlet__stat>Unrated<');

      // Extract username from title - format: "handle (Full Name) | Toph"
      const usernameMatch = html.match(/<title>([^|]+)\|/);
      const username = usernameMatch ? usernameMatch[1].trim() : handle;

      // Extract full name if available
      const fullNameMatch = html.match(/<title>[^(]+\(([^)]+)\)/);
      const fullName = fullNameMatch ? fullNameMatch[1].trim() : null;

      const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;
      const totalProblems = solvedMatch ? parseInt(solvedMatch[2], 10) : null;

      return {
        handle,
        username,
        fullName,
        totalSolved,
        totalProblems,
        rating: isUnrated
          ? null
          : ratingMatch
            ? parseInt(ratingMatch[1], 10)
            : null,
        isUnrated,
      };
    } catch (error) {
      console.error('Toph scraping error:', error.message);
      return null;
    }
  }

  isNotFoundApiPayload(payload) {
    const errorText =
      payload?.error || payload?.message || payload?.detail || payload?.status;
    return typeof errorText === 'string' && /not\s*found/i.test(errorText);
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `toph_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Fetch solved problems via API - no limit to get all submissions
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/users/${handle}/submissions?limit=100000`
    );

    if (!response.ok) {
      // Try scraping profile page as fallback
      const scraped = await this.scrapeSubmissions(handle);
      // scrapeSubmissions returns { totalSolved, submissions: [] }
      // We need to return just the submissions array
      return scraped?.submissions || [];
    }

    const data = await response.json();
    const submissions = (data.submissions || []).map((sub) => ({
      submission_id:
        sub.id?.toString() || `toph_${sub.problem_id}_${Date.now()}`,
      problem_id: sub.problem_id || sub.problemId,
      problem_name: sub.problem_name || sub.problemName,
      problem_url: `${this.baseUrl}/p/${sub.problem_id || sub.problemId}`,
      verdict: sub.verdict === 'Accepted' ? 'AC' : this.mapVerdict(sub.verdict),
      language: sub.language,
      submitted_at: sub.submitted_at || new Date().toISOString(),
    }));

    const filtered = fromTimestamp
      ? submissions.filter(
          (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
        )
      : submissions;

    await this.setCache(cacheKey, filtered, 120);
    return filtered;
  }

  async scrapeSubmissions(handle) {
    // Fallback: parse profile page for solve count
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/u/${handle}`);
      const html = await response.text();

      // Extract solved problems count from profile
      const solvedMatch = html.match(/Solved[:\s]*(\d+)/i);
      const solved = solvedMatch ? parseInt(solvedMatch[1]) : 0;

      return {
        totalSolved: solved,
        submissions: [],
      };
    } catch {
      return { totalSolved: 0, submissions: [] };
    }
  }

  mapVerdict(verdict) {
    const map = {
      Accepted: 'AC',
      'Wrong Answer': 'WA',
      'Time Limit Exceeded': 'TLE',
      'Memory Limit Exceeded': 'MLE',
      'Runtime Error': 'RE',
      'Compilation Error': 'CE',
    };
    return map[verdict] || 'WA';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// CSES SERVICE
// ============================================

export class CSESService {
  constructor() {
    this.baseUrl = 'https://cses.fi';
  }

  async getUserProfile(userId) {
    const cacheKey = `cses_profile_${userId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // CSES requires scraping the user page
      const response = await fetchWithTimeout(
        `${this.baseUrl}/user/${userId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NEUPC/1.0)',
            Accept: 'text/html',
          },
        }
      );

      if (!response.ok) {
        throw new Error('CSES user not found');
      }

      const html = await response.text();

      // Check for 404 or invalid user
      if (
        html.includes('Page not found') ||
        html.includes('User not found') ||
        html.includes('Invalid user')
      ) {
        throw new Error('CSES user not found');
      }

      const profile = this.parseProfile(html, userId);

      if (profile.submissionCount === 0 && !profile.username) {
        throw new Error('CSES user not found');
      }

      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch (error) {
      if (error.message === 'CSES user not found') {
        throw error;
      }
      throw new Error(`CSES error: ${error.message}`);
    }
  }

  async getSubmissions(userId, fromTimestamp = null) {
    const cacheKey = `cses_subs_${userId}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // CSES doesn't expose solved problems list publicly without login
    // We can only get submission count from the profile
    // Return empty array as we can't get individual submissions
    return [];
  }

  parseProfile(html, userId) {
    // Extract username from page title
    const titleMatch = html.match(/<title>CSES - User ([^<]+)<\/title>/i);
    const username = titleMatch ? titleMatch[1].trim() : userId;

    // Extract submission count from summary table
    const submissionMatch = html.match(
      /Submission count:<\/td>\s*<td[^>]*>(\d+)/i
    );
    const submissionCount = submissionMatch
      ? parseInt(submissionMatch[1], 10)
      : 0;

    // Extract first and last submission dates
    const firstSubMatch = html.match(
      /First submission:<\/td>\s*<td[^>]*>([^<]+)/i
    );
    const lastSubMatch = html.match(
      /Last submission:<\/td>\s*<td[^>]*>([^<]+)/i
    );

    return {
      userId,
      username,
      submissionCount,
      totalSolved: 0, // Cannot determine without login
      firstSubmission: firstSubMatch ? firstSubMatch[1].trim() : null,
      lastSubmission: lastSubMatch ? lastSubMatch[1].trim() : null,
      note: 'CSES does not expose solved problems count publicly. Only submission count is available.',
    };
  }

  parseSolvedProblems(html) {
    // CSES requires login to see solved problems
    // This method is kept for compatibility but returns empty
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// CODECHEF SERVICE
// ============================================

export class CodeChefService {
  constructor() {
    this.baseUrl = 'https://www.codechef.com';
  }

  async getUserProfile(handle) {
    const cacheKey = `cc_profile_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Try API first, then fallback to scraping
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/users/${handle}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json, text/html',
          },
        },
        15000,
        2,
        2000
      );

      if (!response.ok) {
        throw new Error('CodeChef user not found');
      }

      // Try to get JSON data
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const profile = {
          handle: data.username || handle,
          rating: data.rating || 0,
          maxRating: data.highest_rating || data.max_rating || 0,
          globalRank: data.global_rank,
          countryRank: data.country_rank,
          stars: data.stars,
          totalSolved: data.fully_solved?.count || 0,
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      } else {
        // HTML response, try scraping
        const html = await response.text();
        return this.parseProfileFromHtml(handle, html);
      }
    } catch (error) {
      console.warn(
        `[CodeChef] API failed for profile ${handle}: ${error.message}`
      );
      // Try scraping as fallback
      try {
        return await this.scrapeProfile(handle);
      } catch (scrapeError) {
        console.warn(
          `[CodeChef] Scraping also failed for ${handle}: ${scrapeError.message}`
        );
        // Return minimal profile to prevent sync failure
        return {
          handle,
          rating: 0,
          maxRating: 0,
          totalSolved: 0,
          note: 'Profile data unavailable - CodeChef API access restricted',
        };
      }
    }
  }

  parseProfileFromHtml(handle, html) {
    const ratingMatch =
      html.match(/Rating[:\s]*(\d+)/i) || html.match(/"rating"\s*:\s*(\d+)/i);
    const maxRatingMatch =
      html.match(/Highest Rating[:\s]*(\d+)/i) ||
      html.match(/"highest_rating"\s*:\s*(\d+)/i);
    const solvedMatch =
      html.match(/Fully Solved[:\s]*\((\d+)\)/i) ||
      html.match(/Problems Solved[:\s]*(\d+)/i) ||
      html.match(/"fully_solved"\s*:\s*\{\s*"count"\s*:\s*(\d+)/i);

    return {
      handle,
      rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
      maxRating: maxRatingMatch ? parseInt(maxRatingMatch[1]) : 0,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
    };
  }

  async scrapeProfile(handle) {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/users/${handle}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        },
        15000,
        2
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseProfileFromHtml(handle, html);
    } catch (error) {
      console.warn(
        `[CodeChef] Scrape profile failed for ${handle}: ${error.message}`
      );
      return {
        handle,
        rating: 0,
        maxRating: 0,
        totalSolved: 0,
      };
    }
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `cc_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Try multiple approaches since CodeChef API is often blocked

    // Approach 1: Try CodeChef's new API endpoint with proper headers
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/api/list/submission?userHandle=${handle}&result=AC&limit=100`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'application/json',
            Referer: 'https://www.codechef.com/',
          },
        },
        15000, // 15 second timeout
        2, // Only 2 retries for this approach
        2000
      );

      if (response.ok) {
        const data = await response.json();
        const submissions = (data.data || []).map((sub) => ({
          submission_id: sub.id?.toString(),
          problem_id: sub.problemCode,
          problem_name: sub.problemName || sub.problemCode,
          problem_url: `${this.baseUrl}/problems/${sub.problemCode}`,
          contest_id: sub.contestCode,
          verdict: 'AC',
          language: sub.language,
          submitted_at: sub.date || new Date().toISOString(),
        }));

        const filtered = fromTimestamp
          ? submissions.filter(
              (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
            )
          : submissions;

        await this.setCache(cacheKey, filtered, 120);
        return filtered;
      }
    } catch (error) {
      console.warn(
        `[CodeChef] Primary API failed for ${handle}: ${error.message}`
      );
    }

    // Approach 2: Try scraping the user's recent activity page
    try {
      const submissions = await this.scrapeSubmissions(handle);
      if (submissions.length > 0) {
        const filtered = fromTimestamp
          ? submissions.filter(
              (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
            )
          : submissions;
        await this.setCache(cacheKey, filtered, 120);
        return filtered;
      }
    } catch (error) {
      console.warn(
        `[CodeChef] Scraping failed for ${handle}: ${error.message}`
      );
    }

    // Approach 3: Return empty array but log that sync is not available
    console.warn(
      `[CodeChef] Could not fetch submissions for ${handle}. CodeChef API access may be restricted. ` +
        `Please use the browser extension to sync CodeChef data.`
    );
    return [];
  }

  /**
   * Scrape submissions from CodeChef user profile page
   * This is a fallback when API access is blocked
   */
  async scrapeSubmissions(handle) {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/users/${handle}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        30000,
        2
      );

      if (!response.ok) {
        return [];
      }

      const html = await response.text();

      // Extract solved problem codes from the profile page
      // CodeChef shows fully solved problems in a specific section
      const submissions = [];

      // Try to find problem codes in the "Fully Solved" section
      // The pattern looks for problem links like /problems/PROBLEMCODE
      const problemPattern = /\/problems\/([A-Z0-9_]+)/gi;
      const matches = html.matchAll(problemPattern);
      const seenProblems = new Set();

      for (const match of matches) {
        const problemCode = match[1];
        // Skip common non-problem patterns
        if (
          problemCode === 'school' ||
          problemCode === 'easy' ||
          problemCode === 'medium' ||
          problemCode === 'hard' ||
          problemCode === 'challenge' ||
          problemCode === 'extcontest' ||
          seenProblems.has(problemCode)
        ) {
          continue;
        }
        seenProblems.add(problemCode);

        submissions.push({
          submission_id: `cc_${handle}_${problemCode}`,
          problem_id: problemCode,
          problem_name: problemCode,
          problem_url: `${this.baseUrl}/problems/${problemCode}`,
          contest_id: null,
          verdict: 'AC',
          language: 'unknown',
          submitted_at: new Date().toISOString(), // We don't have exact timestamps
        });
      }
      return submissions;
    } catch (error) {
      console.error(`[CodeChef] Scrape error: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch contest problems from CodeChef API
   * @param {string} contestCode - CodeChef contest code
   * @returns {Array} - Array of problem objects
   */
  async getContestProblems(contestCode) {
    const cacheKey = `cc_contest_problems_${contestCode}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/api/contests/${contestCode}`,
        {},
        30000
      );

      if (!response.ok) {
        console.warn(
          `[CodeChef] Could not fetch problems for contest ${contestCode}`
        );
        return [];
      }

      const data = await response.json();
      const problems = (data.problemsList || []).map((p) => ({
        code: p.problemCode || p,
        name: p.problemName || p.problemCode || p,
        url: `${this.baseUrl}/problems/${p.problemCode || p}`,
      }));

      // Cache for 7 days
      await this.setCache(cacheKey, problems, 7 * 24 * 60 * 60);
      return problems;
    } catch (error) {
      console.error(
        `[CodeChef] Error fetching contest problems for ${contestCode}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * Enrich contests with problem-level data from submissions
   * @param {Array} contests - Array of contest objects
   * @param {string} handle - CodeChef handle
   * @returns {Array} - Enriched contests with problems array
   */
  async enrichContestsWithProblems(contests, handle) {
    if (!contests || contests.length === 0) return contests;
    // Fetch all submissions for this user
    const submissions = await this.getSubmissions(handle);
    // Debug: Log sample submissions to see contest_id
    if (submissions.length > 0) {
    }

    // Group submissions by contest_id
    const submissionsByContest = {};
    submissions.forEach((sub) => {
      if (!sub.contest_id) return;
      if (!submissionsByContest[sub.contest_id]) {
        submissionsByContest[sub.contest_id] = [];
      }
      submissionsByContest[sub.contest_id].push(sub);
    });
    // Debug: Log contest IDs we're trying to match
    // Enrich each contest
    const enrichedContests = [];
    for (const contest of contests) {
      const matchId = contest.platformContestId || contest.contestId;
      const contestSubs = submissionsByContest[matchId] || [];

      // Calculate contest end time using endDate if available, otherwise estimate from duration
      const contestStart = new Date(contest.date);
      let contestEnd;
      if (contest.endDate) {
        contestEnd = new Date(contest.endDate);
      } else {
        // Fallback: Use durationMinutes from CLIST, or duration field, or default 180 minutes
        const durationMs =
          (contest.durationMinutes || contest.duration || 180) * 60 * 1000;
        contestEnd = new Date(contestStart.getTime() + durationMs);
      }
      // Fetch problems for this contest
      const contestProblems = await this.getContestProblems(matchId);

      // Build problem map from submissions
      const problemMap = {};
      contestSubs.forEach((sub) => {
        const subTime = new Date(sub.submitted_at);

        if (!problemMap[sub.problem_id]) {
          problemMap[sub.problem_id] = {
            label: sub.problem_id,
            name: sub.problem_name,
            url: sub.problem_url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            submissions: [],
          };
        }

        problemMap[sub.problem_id].submissions.push(sub);
        problemMap[sub.problem_id].attempted = true;

        if (sub.verdict === 'AC') {
          problemMap[sub.problem_id].solved = true;
          if (subTime <= contestEnd) {
            problemMap[sub.problem_id].solvedDuringContest = true;
            problemMap[sub.problem_id].upsolve = false;
          } else if (!problemMap[sub.problem_id].solvedDuringContest) {
            problemMap[sub.problem_id].upsolve = true;
          }
        }
      });

      // Add unattempted problems
      contestProblems.forEach((cp) => {
        if (!problemMap[cp.code]) {
          problemMap[cp.code] = {
            label: cp.code,
            name: cp.name,
            url: cp.url,
            solved: false,
            solvedDuringContest: false,
            upsolve: false,
            attempted: false,
            submissions: [],
          };
        }
      });

      const problems = Object.values(problemMap).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      const solvedCount = problems.filter((p) => p.solvedDuringContest).length;
      const upsolveCount = problems.filter(
        (p) => p.upsolve && !p.solvedDuringContest
      ).length;
      // Small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));

      // If we found problems from submissions, use them. Otherwise, preserve any existing CLIST data
      const finalProblems =
        problems.length > 0 ? problems : contest.problems || [];

      enrichedContests.push({
        ...contest,
        problems: finalProblems,
        solved: solvedCount > 0 ? solvedCount : contest.solved || 0,
        upsolves: upsolveCount,
        totalProblems:
          finalProblems.length > 0
            ? finalProblems.length
            : contest.totalProblems || 0,
      });
    }

    return enrichedContests;
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// TOPCODER SERVICE
// ============================================

export class TopCoderService {
  constructor() {
    this.apiBase = 'https://api.topcoder.com/v5';
    this.profilesBase = 'https://profiles.topcoder.com';
  }

  async getUserProfile(handle) {
    const cacheKey = `tc_profile_${handle}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Try the API first
    try {
      const response = await fetchWithTimeout(
        `${this.apiBase}/members/${handle}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const profile = {
          handle: data.handle || handle,
          rating: data.maxRating?.rating || 0,
          competitions: data.competitionStats?.algorithm?.challenges || 0,
        };

        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
    } catch {
      // API failed, try fallback
    }

    // Fallback: Check if profile page exists (returns 200 for valid users)
    try {
      const profileResponse = await fetchWithTimeout(
        `${this.profilesBase}/${handle}`,
        {
          method: 'HEAD',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (profileResponse.ok) {
        // Profile page exists, user is valid
        const profile = {
          handle: handle,
          rating: 0,
          competitions: 0,
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
    } catch {
      // Fallback also failed
    }

    throw new Error(
      'TopCoder user not found or service temporarily unavailable'
    );
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `tc_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // TopCoder API for challenge history
    const response = await fetchWithTimeout(
      `${this.apiBase}/members/${handle}/challenges?status=completed&perPage=100`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const submissions = (data || []).map((challenge) => ({
      submission_id: challenge.challengeId?.toString(),
      problem_id: challenge.challengeId?.toString(),
      problem_name: challenge.challengeName || challenge.name,
      problem_url: `https://www.topcoder.com/challenges/${challenge.challengeId}`,
      verdict: 'AC',
      submitted_at: challenge.endDate || new Date().toISOString(),
    }));

    await this.setCache(cacheKey, submissions, 300);
    return submissions;
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// HACKERRANK SERVICE
// ============================================

export class HackerRankService {
  constructor() {
    this.baseUrl = 'https://www.hackerrank.com';
  }

  async getUserProfile(username) {
    const cacheKey = `hr_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    let userExists = false;
    let profileSolvedCount = 0;

    // First, try to verify user exists via profile page
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/profile/${username}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        }
      );

      if (response.ok) {
        const html = await response.text();
        // Check if user exists
        if (
          !html.includes('Page Not Found') &&
          !html.includes('profile not found')
        ) {
          userExists = true;
          // Try to extract solved count from profile page
          const solvedMatch = html.match(/(\d+)\s*problems?\s*solved/i);
          if (solvedMatch) {
            profileSolvedCount = parseInt(solvedMatch[1]);
          }
        }
      }
    } catch {
      // Profile fetch failed, continue to try badges API
    }

    // Always try badges API to get accurate solved count
    let totalSolved = profileSolvedCount;
    let badgesCount = 0;
    try {
      const badgesRes = await fetchWithTimeout(
        `${this.baseUrl}/rest/hackers/${username}/badges`
      );
      if (badgesRes.ok) {
        const badges = await badgesRes.json();
        userExists = true; // API worked, user exists
        badgesCount = badges.models?.length || 0;

        // Sum up solved counts from all badge models
        // Each badge model has a 'solved' field indicating problems solved in that domain
        if (badges.models && Array.isArray(badges.models)) {
          let apiSolvedCount = 0;
          for (const badge of badges.models) {
            if (badge.solved && typeof badge.solved === 'number') {
              apiSolvedCount += badge.solved;
            }
          }
          // Use API count if it's higher (more accurate)
          if (apiSolvedCount > totalSolved) {
            totalSolved = apiSolvedCount;
          }
        }
      }
    } catch {
      // Badges API failed, continue with profile data
    }

    if (userExists) {
      const profile = {
        username,
        totalSolved,
        badges: badgesCount,
        verified: true,
      };
      await this.setCache(cacheKey, profile, 600);
      return profile;
    }

    // Final fallback - just validate the username format
    if (/^[a-zA-Z0-9_]+$/.test(username)) {
      const profile = {
        username,
        totalSolved: 0,
        badges: 0,
        verified: false,
        note: 'HackerRank API restricted - profile format validated only',
      };
      await this.setCache(cacheKey, profile, 600);
      return profile;
    }

    throw new Error('HackerRank user not found');
  }

  async getSubmissions(username, _fromTimestamp = null) {
    const cacheKey = `hr_subs_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // HackerRank doesn't have a public submissions API anymore
    // Return empty array - users can manually track or we rely on profile scraping
    await this.setCache(cacheKey, [], 300);
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// KATTIS SERVICE
// ============================================

export class KattisService {
  constructor() {
    this.baseUrl = 'https://open.kattis.com';
  }

  async getUserProfile(username) {
    const cacheKey = `kattis_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/users/${username}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Kattis user not found');
      }

      const html = await response.text();

      // Check for user not found
      if (
        html.includes('User not found') ||
        html.includes('404') ||
        html.includes('Page not found')
      ) {
        throw new Error('Kattis user not found');
      }

      const profile = this.parseProfile(html, username);
      profile.verified = true;

      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch {
      // Fallback - validate username format
      if (/^[a-zA-Z0-9_.-]+$/.test(username)) {
        const profile = {
          username,
          score: 0,
          rank: 0,
          totalSolved: 0,
          verified: false,
          note: 'Kattis profile could not be fetched - format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
      throw new Error('Kattis user not found');
    }
  }

  parseProfile(html, username) {
    // Kattis HTML structure uses: <span class="info_label">Score</span><span class="important_text">1.0</span>
    // Try multiple patterns for score
    const scoreMatch =
      html.match(
        /class="info_label"[^>]*>Score<\/span>\s*<span[^>]*class="important_text"[^>]*>([0-9.]+)/i
      ) ||
      html.match(/>Score<\/span>\s*<span[^>]*>([0-9.]+)/i) ||
      html.match(/Score[:\s]*<\/[^>]+>\s*([0-9.]+)/i) ||
      html.match(/score[:\s]*([0-9.]+)/i);

    // Try multiple patterns for rank
    const rankMatch =
      html.match(
        /class="info_label"[^>]*>Rank<\/span>\s*<span[^>]*class="important_text"[^>]*>(\d+)/i
      ) ||
      html.match(/>Rank<\/span>\s*<span[^>]*>(\d+)/i) ||
      html.match(/Rank[:\s]*<\/[^>]+>\s*(\d+)/i) ||
      html.match(/rank[:\s]*#?(\d+)/i);

    // Try multiple patterns for solved count
    const solvedMatch =
      html.match(/(\d+)\s*problems?\s*solved/i) ||
      html.match(/Solved[:\s]*(\d+)/i) ||
      html.match(/solved[:\s]*<[^>]*>(\d+)/i);

    return {
      username,
      score: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      rank: rankMatch ? parseInt(rankMatch[1]) : 0,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
    };
  }

  async getSubmissions(username, _fromTimestamp = null) {
    const cacheKey = `kattis_subs_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch user's profile page to get solved problems
      const response = await fetchWithTimeout(
        `${this.baseUrl}/users/${username}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const submissions = this.parseSolvedProblems(html);

      await this.setCache(cacheKey, submissions, 300);
      return submissions;
    } catch {
      return [];
    }
  }

  parseSolvedProblems(html) {
    const submissions = [];
    // Parse solved problem links
    const problemRegex = /<a[^>]*href="\/problems\/([^"]+)"[^>]*>/gi;
    const seen = new Set();
    let match;

    while ((match = problemRegex.exec(html)) !== null) {
      const problemId = match[1];
      if (!seen.has(problemId) && !problemId.includes('page')) {
        seen.add(problemId);
        submissions.push({
          submission_id: `kattis_${problemId}`,
          problem_id: problemId,
          problem_name: problemId,
          problem_url: `${this.baseUrl}/problems/${problemId}`,
          verdict: 'AC',
          submitted_at: new Date().toISOString(),
        });
      }
    }

    return submissions;
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// LIGHTOJ SERVICE
// ============================================

export class LightOJService {
  constructor() {
    this.baseUrl = 'https://lightoj.com';
  }

  async getUserProfile(username) {
    const cacheKey = `loj_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/user/${username}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        }
      );

      if (!response.ok) {
        throw new Error('LightOJ user not found');
      }

      const html = await response.text();

      // Check for user not found
      if (
        html.includes('User not found') ||
        html.includes('404') ||
        html.includes('Page not found')
      ) {
        throw new Error('LightOJ user not found');
      }

      const profile = this.parseProfile(html, username);
      profile.verified = true;
      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch {
      // If scraping fails, check username format and return placeholder
      if (/^[a-zA-Z0-9_]+$/.test(username)) {
        const profile = {
          username,
          totalSolved: 0,
          verified: false,
          note: 'LightOJ requires authentication - profile format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
      throw new Error('LightOJ user not found');
    }
  }

  parseProfile(html, username) {
    // Try multiple patterns for solved count
    const solvedMatch =
      html.match(/Solved[:\s]*(\d+)/i) ||
      html.match(/(\d+)\s*problems?\s*solved/i) ||
      html.match(/Total Solved[:\s]*(\d+)/i) ||
      html.match(/"solved"\s*:\s*(\d+)/i);

    return {
      username,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
    };
  }

  async getSubmissions(username, _fromTimestamp = null) {
    const cacheKey = `loj_subs_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // LightOJ API requires authentication
    // Return empty array - submissions need to be tracked manually or via logged-in session
    await this.setCache(cacheKey, [], 300);
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// UVA SERVICE (using uHunt API)
// ============================================

export class UVAService {
  constructor() {
    this.apiBase = 'https://uhunt.onlinejudge.org/api';
  }

  async getUserProfile(userId) {
    const cacheKey = `uva_profile_${userId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // First get user ID if username provided
    let numericId = userId;
    if (isNaN(userId)) {
      const idRes = await fetchWithTimeout(
        `${this.apiBase}/uname2uid/${userId}`
      );
      numericId = await idRes.text();
      if (numericId === '0') {
        throw new Error('UVA user not found');
      }
    }

    const response = await fetchWithTimeout(
      `${this.apiBase}/subs-user/${numericId}`
    );

    if (!response.ok) {
      throw new Error('UVA user not found');
    }

    const data = await response.json();
    const solved = new Set();

    // Count unique accepted problems
    (data.subs || []).forEach((sub) => {
      if (sub[2] === 90) {
        // 90 = Accepted
        solved.add(sub[1]);
      }
    });

    const profile = {
      userId: numericId,
      totalSolved: solved.size,
      totalSubmissions: data.subs?.length || 0,
    };

    await this.setCache(cacheKey, profile, 600);
    return profile;
  }

  async getSubmissions(userId, fromTimestamp = null) {
    const cacheKey = `uva_subs_${userId}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Get numeric user ID
    let numericId = userId;
    if (isNaN(userId)) {
      const idRes = await fetchWithTimeout(
        `${this.apiBase}/uname2uid/${userId}`
      );
      numericId = await idRes.text();
    }

    const response = await fetchWithTimeout(
      `${this.apiBase}/subs-user/${numericId}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    // Get problem info for names
    const pResponse = await fetchWithTimeout(`${this.apiBase}/p`);
    const problems = pResponse.ok ? await pResponse.json() : [];
    const problemMap = {};
    problems.forEach((p) => {
      problemMap[p[0]] = { num: p[1], title: p[2] };
    });

    const submissions = (data.subs || [])
      .filter((sub) => sub[2] === 90) // Accepted
      .map((sub) => {
        const prob = problemMap[sub[1]] || {};
        return {
          submission_id: sub[0]?.toString(),
          problem_id: prob.num?.toString() || sub[1]?.toString(),
          problem_name: prob.title || `Problem ${sub[1]}`,
          problem_url: `https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=${sub[1]}`,
          verdict: 'AC',
          language: this.mapLanguage(sub[5]),
          submitted_at: new Date(sub[4] * 1000).toISOString(),
        };
      });

    const filtered = fromTimestamp
      ? submissions.filter(
          (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
        )
      : submissions;

    await this.setCache(cacheKey, filtered, 120);
    return filtered;
  }

  mapLanguage(code) {
    const langs = {
      1: 'ANSI C',
      2: 'Java',
      3: 'C++',
      4: 'Pascal',
      5: 'C++11',
      6: 'Python',
    };
    return langs[code] || 'Unknown';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// SPOJ SERVICE
// ============================================

export class SPOJService {
  constructor() {
    this.baseUrl = 'https://www.spoj.com';
  }

  async getUserProfile(username) {
    const cacheKey = `spoj_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Validate username format (alphanumeric and underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Invalid SPOJ username format');
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${username}/`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      // Get HTML content regardless of status code (Cloudflare returns 403 but with content)
      const html = await response.text();

      // Check if we got a Cloudflare challenge page (can happen with 403 or 200)
      if (
        html.includes('Just a moment...') ||
        html.includes('cf_chl_opt') ||
        html.includes('Enable JavaScript and cookies') ||
        html.includes('challenge-platform')
      ) {
        // Cloudflare is blocking - accept the handle with basic validation only
        // Username format was already validated above
        const profile = {
          username,
          totalSolved: 0,
          points: 0,
          verified: false,
          note: 'SPOJ verification limited due to Cloudflare protection - handle format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }

      // If we got actual content but response was not ok (and not Cloudflare), user not found
      if (!response.ok) {
        throw new Error('SPOJ user not found');
      }

      const profile = this.parseProfile(html, username);
      profile.verified = true;
      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch (error) {
      // If fetch fails due to network issues, do basic validation
      if (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      ) {
        const profile = {
          username,
          totalSolved: 0,
          points: 0,
          verified: false,
          note: 'SPOJ verification limited - handle format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
      throw error;
    }
  }

  parseProfile(html, username) {
    const solvedMatch =
      html.match(/Problems solved[:\s]*(\d+)/i) ||
      html.match(/Solved problems[:\s]*(\d+)/i);
    const pointsMatch = html.match(/Points[:\s]*([0-9.]+)/i);

    return {
      username,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
      points: pointsMatch ? parseFloat(pointsMatch[1]) : 0,
    };
  }

  async getSubmissions(username, fromTimestamp = null) {
    const cacheKey = `spoj_subs_${username}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Invalid SPOJ username format');
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/${username}/`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      const html = await response.text();

      // Cloudflare challenge pages are not parseable server-side.
      if (
        html.includes('Just a moment...') ||
        html.includes('cf_chl_opt') ||
        html.includes('Enable JavaScript and cookies') ||
        html.includes('challenge-platform')
      ) {
        await this.setCache(cacheKey, [], 120);
        return [];
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('SPOJ user not found');
        }

        await this.setCache(cacheKey, [], 120);
        return [];
      }

      const parsed = this.parseSolvedProblems(html);

      // SPOJ solved lists don't include submit timestamps. Keep timestamps stable
      // across incremental syncs to avoid drifting solve dates on re-sync.
      const syntheticSubmittedAt =
        normalizeSubmissionTimestamp(fromTimestamp) || new Date().toISOString();

      const submissions = parsed.map((submission) => ({
        ...submission,
        submitted_at: syntheticSubmittedAt,
      }));

      await this.setCache(cacheKey, submissions, 120);
      return submissions;
    } catch (error) {
      if (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT')
      ) {
        await this.setCache(cacheKey, [], 120);
        return [];
      }

      throw error;
    }
  }

  parseSolvedProblems(input) {
    const submissions = [];
    const seen = new Set();

    const addProblem = (problemId) => {
      const id = problemId.trim();
      if (!id || seen.has(id)) return;
      // SPOJ problem IDs are alphanumeric with possible underscores, 2-20 chars
      if (!/^[A-Z0-9_]{2,20}$/i.test(id)) return;
      // Filter out common false positives from page chrome
      const NOISE = new Set([
        'AC',
        'WA',
        'RE',
        'TLE',
        'MLE',
        'CE',
        'PE',
        'OK',
        'SPOJ',
        'HTML',
        'CSS',
        'PDF',
        'FAQ',
        'API',
        'RSS',
        'URL',
        'YES',
        'NO',
        'OR',
        'AND',
        'IF',
        'ID',
        'BY',
        'TO',
        'OF',
        'IN',
        'ON',
        'AT',
        'UP',
      ]);
      if (NOISE.has(id.toUpperCase())) return;

      seen.add(id);
      submissions.push({
        submission_id: `spoj_${id}`,
        problem_id: id,
        problem_name: id,
        problem_url: `${this.baseUrl}/problems/${id}/`,
        verdict: 'AC',
        submitted_at: new Date().toISOString(),
      });
    };

    // Strategy 1: Extract from HTML anchor tags (href="/problems/CODE")
    const linkRegex = /href=["']\/problems\/([^"'/]+)/gi;
    let match;
    while ((match = linkRegex.exec(input)) !== null) {
      addProblem(match[1]);
    }

    if (submissions.length > 0) {
      return submissions;
    }

    // Strategy 2: Plain-text extraction (Ctrl+A copy-paste from SPOJ profile)
    // SPOJ profiles list solved problems after a heading like
    // "List of solved problems" or "solved classical problems", with codes
    // separated by pipes, commas, spaces, or newlines.
    const text = input.replace(/<[^>]+>/g, ' '); // strip any residual tags

    // Try to isolate the solved-problems section
    const sectionMatch = text.match(
      /(?:list\s+of\s+solved|solved\s+(?:classical\s+)?problems?)[:\s]*([\s\S]*?)(?:todo|to\s*solve|unsolved|list\s+of\s+todo|$)/i
    );
    const section = sectionMatch ? sectionMatch[1] : text;

    // Split on common delimiters: pipe, comma, whitespace, parentheses
    const tokens = section.split(/[|,\s()[\]{}]+/).filter(Boolean);
    for (const token of tokens) {
      // SPOJ classical problem codes are typically all-uppercase, 2-20 chars
      if (/^[A-Z][A-Z0-9_]{1,19}$/.test(token)) {
        addProblem(token);
      }
    }

    return submissions;
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// VJUDGE SERVICE
// ============================================

export class VJudgeService {
  constructor() {
    this.baseUrl = 'https://vjudge.net';
    // Rate limit: be gentle with VJudge servers
    this.requestDelay = 600; // ms between requests
    // Cache for problem details to avoid repeated fetches
    this.problemDetailsCache = new Map();
  }

  /**
   * Mapping of OJ names to their base URLs for constructing original problem links
   */
  getOriginalOJUrl(oj, probNum) {
    const ojUrls = {
      CodeForces: `https://codeforces.com/problemset/problem/${probNum.replace(/([A-Za-z]+)$/, '/$1')}`,
      AtCoder: this.getAtCoderUrl(probNum),
      SPOJ: `https://www.spoj.com/problems/${probNum}/`,
      UVA: `https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=${probNum}`,
      LightOJ: `https://lightoj.com/problem/${probNum}`,
      CodeChef: `https://www.codechef.com/problems/${probNum}`,
      HackerRank: `https://www.hackerrank.com/challenges/${probNum}`,
      Toph: `https://toph.co/p/${probNum}`,
      CSES: `https://cses.fi/problemset/task/${probNum}`,
      Kattis: `https://open.kattis.com/problems/${probNum}`,
      POJ: `http://poj.org/problem?id=${probNum}`,
      HDU: `http://acm.hdu.edu.cn/showproblem.php?pid=${probNum}`,
      Aizu: `https://judge.u-aizu.ac.jp/onlinejudge/description.jsp?id=${probNum}`,
      URAL: `https://acm.timus.ru/problem.aspx?num=${probNum}`,
      EOlymp: `https://www.eolymp.com/en/problems/${probNum}`,
      Gym: `https://codeforces.com/gym/${probNum.replace(/([A-Za-z]+)$/, '/problem/$1')}`,
      TopCoder: null, // TopCoder URLs are complex
      HackerEarth: `https://www.hackerearth.com/problem/algorithm/${probNum}/`,
      CSAcademy: `https://csacademy.com/contest/archive/task/${probNum}/`,
    };

    return ojUrls[oj] || null;
  }

  /**
   * AtCoder URL construction (handles contest_problem format)
   */
  getAtCoderUrl(probNum) {
    // AtCoder problem numbers are like "abc337_c" -> https://atcoder.jp/contests/abc337/tasks/abc337_c
    const match = probNum.match(/^([a-z]+\d+)_([a-z])$/i);
    if (match) {
      const contest = match[1].toLowerCase();
      return `https://atcoder.jp/contests/${contest}/tasks/${probNum.toLowerCase()}`;
    }
    return `https://atcoder.jp/contests/${probNum}`;
  }

  /**
   * Get user profile with solve statistics
   */
  async getUserProfile(username) {
    const cacheKey = `vj_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${this.baseUrl}/user/solveDetail/${username}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('VJudge user not found');
    }

    const data = await response.json();

    // Count solved and attempted across all OJs
    let totalSolved = 0;
    let totalAttempted = 0;
    const ojStats = {};

    // Process AC records
    if (data.acRecords) {
      Object.entries(data.acRecords).forEach(([oj, problems]) => {
        if (Array.isArray(problems)) {
          const count = problems.length;
          totalSolved += count;
          ojStats[oj] = { solved: count, attempted: 0 };
        }
      });
    }

    // Process failed records
    if (data.failRecords) {
      Object.entries(data.failRecords).forEach(([oj, problems]) => {
        if (Array.isArray(problems)) {
          const count = problems.length;
          totalAttempted += count;
          if (ojStats[oj]) {
            ojStats[oj].attempted = count;
          } else {
            ojStats[oj] = { solved: 0, attempted: count };
          }
        }
      });
    }

    const profile = {
      username,
      totalSolved,
      totalAttempted,
      ojStats,
      ojs: Object.keys(ojStats),
    };

    await this.setCache(cacheKey, profile, 600);
    return profile;
  }

  /**
   * Get detailed submission history with timestamps, language, etc.
   * Uses the /status/data API for full submission details
   * Enhanced to fetch problem names and details
   */
  async getSubmissions(username, fromTimestamp = null) {
    const cacheKey = `vj_subs_${username}_${fromTimestamp || 'all'}_v3`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const allSubmissions = [];
    let start = 0;
    // VJudge API caps max length at 20 - requesting more still returns only 20
    const batchSize = 20;
    let hasMore = true;

    // Collect unique problems to fetch details for
    const problemsToFetch = new Map();

    // Fetch all AC submissions with pagination
    while (hasMore) {
      const url = `${this.baseUrl}/status/data?un=${encodeURIComponent(username)}&OJId=All&res=1&start=${start}&length=${batchSize}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`VJudge API error: ${response.status}`);
        break;
      }

      const result = await response.json();

      if (!result.data || result.data.length === 0) {
        hasMore = false;
        break;
      }

      // Process submissions
      for (const sub of result.data) {
        // Filter by timestamp if provided
        if (fromTimestamp) {
          const subTime = new Date(sub.time);
          const fromTime = new Date(fromTimestamp);
          if (subTime <= fromTime) {
            hasMore = false;
            break;
          }
        }

        const problemKey = `${sub.oj}-${sub.probNum}`;

        // Track this problem for detail fetching
        if (!problemsToFetch.has(problemKey)) {
          problemsToFetch.set(problemKey, {
            oj: sub.oj,
            probNum: sub.probNum,
            problemId: sub.problemId,
          });
        }

        // Get original OJ URL if available
        const originalUrl = this.getOriginalOJUrl(sub.oj, sub.probNum);

        const submission = {
          submission_id: `vj_${sub.runId}`,
          problem_id: problemKey,
          // Will be enriched with actual name later
          problem_name: null,
          problem_url: `${this.baseUrl}/problem/${problemKey}`,
          original_url: originalUrl,
          contest_id: sub.contestId?.toString() || null,
          contest_num: sub.contestNum || null,
          verdict: this.mapVerdict(sub.status),
          language: sub.language || sub.languageCanonical || 'Unknown',
          language_canonical: sub.languageCanonical || null,
          runtime_ms: sub.runtime != null ? sub.runtime : null,
          memory_kb: sub.memory != null ? sub.memory : null,
          source_length: sub.sourceLength || null,
          submitted_at: new Date(sub.time).toISOString(),
          // Store original OJ info for reference
          original_oj: sub.oj,
          original_problem_num: sub.probNum,
          vjudge_problem_id: sub.problemId,
          vjudge_run_id: sub.runId,
          // Placeholders for enrichment
          difficulty: null,
          tags: [],
        };

        allSubmissions.push(submission);
      }

      // Check if we got a full batch (might be more)
      if (result.data.length < batchSize) {
        hasMore = false;
      } else {
        start += batchSize;
        // Rate limiting - wait between requests
        await this.delay(this.requestDelay);
      }

      // Safety limit to prevent infinite loops (reasonable limit for any user)
      if (start > 50000) {
        console.warn('VJudge: Hit safety limit of 50000 submissions');
        hasMore = false;
      }
    }

    // Fetch problem details for unique problems (batch with rate limiting)
    // Limit problem detail fetches to avoid very long sync times
    // At 600ms per request, 100 problems = 60 seconds just for problem details
    const maxProblemDetailFetches = Math.min(problemsToFetch.size, 100);
    const problemsArray = Array.from(problemsToFetch.entries()).slice(
      0,
      maxProblemDetailFetches
    );
    const problemDetails = new Map();
    for (const [problemKey, problemInfo] of problemsArray) {
      try {
        const details = await this.getProblemDetails(
          problemInfo.oj,
          problemInfo.probNum
        );
        if (details) {
          problemDetails.set(problemKey, details);
        }
        // Rate limiting between problem fetches
        await this.delay(this.requestDelay);
      } catch (error) {
        console.error(`Error fetching details for ${problemKey}:`, error);
      }
    }

    // Enrich submissions with problem details
    for (const submission of allSubmissions) {
      const details = problemDetails.get(submission.problem_id);
      if (details) {
        submission.problem_name = details.problemName || submission.problem_id;
        submission.difficulty = details.difficulty;
        submission.tags = details.tags || [];
        submission.time_limit = details.timeLimit;
        submission.memory_limit = details.memoryLimit;
        submission.source_contest = details.source;
      } else {
        // Fallback: use OJ and problem number as name
        submission.problem_name = `${submission.original_oj} - ${submission.original_problem_num}`;
      }
    }

    await this.setCache(cacheKey, allSubmissions, 300);
    return allSubmissions;
  }

  /**
   * Get solve summary (quick method using solveDetail API)
   * Returns list of solved problems grouped by OJ
   */
  async getSolveSummary(username) {
    const cacheKey = `vj_solve_summary_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const response = await fetch(
      `${this.baseUrl}/user/solveDetail/${username}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { acRecords: {}, failRecords: {} };
    }

    const data = await response.json();
    await this.setCache(cacheKey, data, 300);
    return data;
  }

  /**
   * Get problem details including name, difficulty, and tags
   * Fetches the problem page and parses embedded JSON from dataJson textarea
   */
  async getProblemDetails(oj, problemNum) {
    const cacheKey = `vj_problem_${oj}_${problemNum}_v2`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.baseUrl}/problem/${oj}-${problemNum}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      // Extract problem name from <h2> tag
      const problemName = this.extractProblemName(html);

      // Extract the embedded JSON data from dataJson textarea
      const problemData = this.extractDataJsonFromHtml(html);

      const details = {
        oj,
        problemNum,
        problemId: problemData?.problemId || null,
        problemName: problemName || `${oj} - ${problemNum}`,
        difficulty: null,
        tags: [],
        timeLimit: null,
        memoryLimit: null,
        source: null,
      };

      // Parse properties from embedded JSON
      if (problemData?.properties && Array.isArray(problemData.properties)) {
        for (const prop of problemData.properties) {
          switch (prop.title) {
            case 'difficulty':
              details.difficulty = parseInt(prop.content) || null;
              break;
            case 'tags':
              details.tags = this.parseTags(prop.content);
              break;
            case 'time_limit':
              details.timeLimit = prop.content;
              break;
            case 'mem_limit':
              details.memoryLimit = prop.content;
              break;
            case 'source':
              // Extract text from HTML, removing tags
              details.source = prop.content
                .replace(/<[^>]*>/g, '')
                .replace(/&[^;]+;/g, ' ')
                .trim();
              break;
          }
        }
      }

      await this.setCache(cacheKey, details, 3600); // Cache for 1 hour
      return details;
    } catch (error) {
      console.error(
        `Error fetching problem details for ${oj}-${problemNum}:`,
        error
      );
      return null;
    }
  }

  /**
   * Extract problem name from HTML page
   * VJudge puts the problem name in <h2> tag like: <h2><i id="btn-fav"></i> Problem Name</h2>
   */
  extractProblemName(html) {
    try {
      // Match <h2> tag content and extract the problem name
      const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/is);
      if (h2Match) {
        // Remove any HTML tags inside and clean up
        let name = h2Match[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&[^;]+;/g, ' ') // Remove HTML entities
          .trim();
        if (name && name.length > 0 && name.length < 200) {
          return name;
        }
      }

      // Fallback: try to extract from title tag
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        // Title format: "Problem Name - OJ ProbNum - Virtual Judge"
        const parts = titleMatch[1].split(' - ');
        if (parts.length >= 2) {
          return parts[0].trim();
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting problem name:', error);
      return null;
    }
  }

  /**
   * Extract JSON data from the dataJson textarea in VJudge problem pages
   * The textarea contains a full JSON object with problem properties
   */
  extractDataJsonFromHtml(html) {
    try {
      // Look for the dataJson textarea
      const textareaMatch = html.match(
        /<textarea[^>]*name="dataJson"[^>]*>([\s\S]*?)<\/textarea>/i
      );
      if (textareaMatch) {
        // Decode HTML entities in the JSON string
        const jsonStr = textareaMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/\\u003c/g, '<')
          .replace(/\\u003e/g, '>')
          .replace(/\\u003d/g, '=')
          .replace(/\\u0027/g, "'");

        try {
          return JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('Error parsing dataJson:', parseError);
        }
      }

      // Fallback: try to find JSON in script tags or inline
      const jsonPatterns = [
        /"problemId"\s*:\s*(\d+).*?"properties"\s*:\s*(\[[\s\S]*?\])/,
      ];

      for (const pattern of jsonPatterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            // Try to construct a valid JSON object
            const problemId = match[1];
            const properties = match[2];
            return JSON.parse(
              `{"problemId":${problemId},"properties":${properties}}`
            );
          } catch {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting dataJson from HTML:', error);
      return null;
    }
  }

  /**
   * Parse tags from VJudge tag content (may contain HTML and whitespace)
   */
  parseTags(tagContent) {
    if (!tagContent) return [];

    // Remove HTML tags and normalize whitespace
    const cleanContent = tagContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanContent) return [];

    // Split by newlines first, then by commas if needed
    const tags = cleanContent
      .split(/[\n,]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && tag.length < 50);

    // If we got a single long string, try splitting by spaces for common tags
    if (tags.length === 1 && tags[0].includes(' ')) {
      const spaceSplit = tags[0].split(/\s+/).filter((t) => t.length > 2);
      if (spaceSplit.length > 1) {
        return spaceSplit;
      }
    }

    return tags;
  }

  /**
   * Map VJudge verdict to standard format
   */
  mapVerdict(status) {
    if (!status) return 'PENDING';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('accepted') || statusLower === 'ac') {
      return 'AC';
    }
    if (statusLower.includes('wrong') || statusLower === 'wa') {
      return 'WA';
    }
    if (statusLower.includes('time') || statusLower === 'tle') {
      return 'TLE';
    }
    if (statusLower.includes('memory') || statusLower === 'mle') {
      return 'MLE';
    }
    if (statusLower.includes('runtime') || statusLower === 're') {
      return 'RE';
    }
    if (statusLower.includes('compilation') || statusLower === 'ce') {
      return 'CE';
    }
    if (statusLower.includes('presentation') || statusLower === 'pe') {
      return 'PE';
    }

    return 'PENDING';
  }

  /**
   * Utility delay function for rate limiting
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getCache(key) {
    try {
      const { data } = await supabaseAdmin
        .from('api_cache')
        .select('cache_value')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();
      return data?.cache_value;
    } catch {
      return null;
    }
  }

  async setCache(key, value, ttlSeconds) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      await supabaseAdmin.from('api_cache').upsert({
        cache_key: key,
        cache_value: value,
        expires_at: expiresAt,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

// ============================================
// CF GYM SERVICE (uses Codeforces API)
// ============================================

export class CFGymService {
  constructor() {
    this.baseUrl = 'https://codeforces.com/api';
  }

  async getUserInfo(handle) {
    // Reuse Codeforces user info
    const cf = new CodeforcesService();
    return cf.getUserInfo(handle);
  }

  async getUserProfile(handle) {
    // CF Gym uses the same handle as Codeforces, so verify via Codeforces API
    return this.getUserInfo(handle);
  }

  async getSubmissions(handle, fromTimestamp = null) {
    const cacheKey = `cfgym_subs_${handle}_${fromTimestamp || 'all'}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Get gym submissions only (contest ID >= 100000)
    const response = await fetch(
      `${this.baseUrl}/user.status?handle=${handle}&count=100000`
    );
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }

    const submissions = data.result
      .filter((sub) => sub.problem.contestId >= 100000) // Gym contests
      .map((sub) => ({
        submission_id: `gym_${sub.id}`,
        problem_id: `${sub.problem.contestId}${sub.problem.index}`,
        problem_name: sub.problem.name,
        problem_url: `https://codeforces.com/gym/${sub.problem.contestId}/problem/${sub.problem.index}`,
        contest_id: sub.problem.contestId?.toString(),
        verdict: this.mapVerdict(sub.verdict),
        language: sub.programmingLanguage,
        submitted_at: new Date(sub.creationTimeSeconds * 1000).toISOString(),
      }));

    const filtered = fromTimestamp
      ? submissions.filter(
          (s) => new Date(s.submitted_at) > new Date(fromTimestamp)
        )
      : submissions;

    await this.setCache(cacheKey, filtered, 60);
    return filtered;
  }

  mapVerdict(verdict) {
    const map = {
      OK: 'AC',
      WRONG_ANSWER: 'WA',
      TIME_LIMIT_EXCEEDED: 'TLE',
      MEMORY_LIMIT_EXCEEDED: 'MLE',
      RUNTIME_ERROR: 'RE',
      COMPILATION_ERROR: 'CE',
    };
    return map[verdict] || 'PENDING';
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// CS ACADEMY SERVICE
// ============================================

export class CSAcademyService {
  constructor() {
    this.baseUrl = 'https://csacademy.com';
  }

  async getUserProfile(username) {
    const cacheKey = `csa_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // CS Academy requires API calls with specific headers
      const response = await fetch(`${this.baseUrl}/user/${username}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        throw new Error('CS Academy user not found');
      }

      const html = await response.text();

      // Check for user not found
      if (
        html.includes('User not found') ||
        html.includes('404') ||
        html.includes('Page not found')
      ) {
        throw new Error('CS Academy user not found');
      }

      const profile = this.parseProfile(html, username);
      profile.verified = true;
      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch {
      // Fallback - validate username format
      if (/^[a-zA-Z0-9_]+$/.test(username)) {
        const profile = {
          username,
          totalSolved: 0,
          rating: 0,
          verified: false,
          note: 'CS Academy profile could not be fetched - format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
      throw new Error('CS Academy user not found');
    }
  }

  parseProfile(html, username) {
    const solvedMatch =
      html.match(/Solved[:\s]*(\d+)/i) ||
      html.match(/(\d+)\s*problems?\s*solved/i) ||
      html.match(/tasks[:\s]*(\d+)/i);

    const ratingMatch = html.match(/Rating[:\s]*(\d+)/i);

    return {
      username,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
      rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
    };
  }

  async getSubmissions(username, _fromTimestamp = null) {
    const cacheKey = `csa_subs_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // CS Academy API requires authentication for submissions
    // Return empty array
    await this.setCache(cacheKey, [], 300);
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// E-OLYMP SERVICE
// ============================================

export class EOlympService {
  constructor() {
    this.baseUrl = 'https://www.eolymp.com';
  }

  async getUserProfile(username) {
    const cacheKey = `eo_profile_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/en/users/${username}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        throw new Error('E-Olymp user not found');
      }

      const html = await response.text();

      // Check for user not found
      if (
        html.includes('User not found') ||
        html.includes('404') ||
        html.includes('Page not found')
      ) {
        throw new Error('E-Olymp user not found');
      }

      const profile = this.parseProfile(html, username);
      profile.verified = true;
      await this.setCache(cacheKey, profile, 600);
      return profile;
    } catch {
      // Fallback - validate username format
      if (/^[a-zA-Z0-9_]+$/.test(username)) {
        const profile = {
          username,
          totalSolved: 0,
          rating: 0,
          verified: false,
          note: 'E-Olymp profile could not be fetched - format validated only',
        };
        await this.setCache(cacheKey, profile, 600);
        return profile;
      }
      throw new Error('E-Olymp user not found');
    }
  }

  parseProfile(html, username) {
    const solvedMatch =
      html.match(/Solved[:\s]*(\d+)/i) ||
      html.match(/Problems solved[:\s]*(\d+)/i) ||
      html.match(/(\d+)\s*problems?\s*solved/i);
    const ratingMatch = html.match(/Rating[:\s]*(\d+)/i);

    return {
      username,
      totalSolved: solvedMatch ? parseInt(solvedMatch[1]) : 0,
      rating: ratingMatch ? parseInt(ratingMatch[1]) : 0,
    };
  }

  async getSubmissions(username, _fromTimestamp = null) {
    const cacheKey = `eo_subs_${username}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // E-Olymp API requires authentication for submissions
    // Return empty array
    await this.setCache(cacheKey, [], 300);
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// USACO SERVICE
// ============================================

export class USACOService {
  constructor() {
    this.baseUrl = 'https://usaco.org';
  }

  async getUserProfile(username) {
    // USACO doesn't have a public API - return placeholder
    return {
      username,
      totalSolved: 0,
      note: 'USACO does not provide a public API. Manual entry or scraping required.',
    };
  }

  async getSubmissions(_username, _fromTimestamp = null) {
    // USACO requires authentication - return empty
    return [];
  }

  async getCache(key) {
    const { data } = await supabaseAdmin
      .from('api_cache')
      .select('cache_value')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    return data?.cache_value;
  }

  async setCache(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabaseAdmin.from('api_cache').upsert({
      cache_key: key,
      cache_value: value,
      expires_at: expiresAt,
    });
  }
}

// ============================================
// UNIFIED DATA AGGREGATOR
// ============================================

export class ProblemSolvingAggregator {
  constructor() {
    // Core platforms
    this.codeforces = new CodeforcesService();
    this.atcoder = new AtCoderService();
    this.leetcode = new LeetCodeService();

    // Additional platforms
    this.toph = new TophService();
    this.cses = new CSESService();
    this.codechef = new CodeChefService();
    this.topcoder = new TopCoderService();
    this.hackerrank = new HackerRankService();
    this.kattis = new KattisService();
    this.lightoj = new LightOJService();
    this.uva = new UVAService();
    this.spoj = new SPOJService();
    this.vjudge = new VJudgeService();
    this.cfgym = new CFGymService();
    this.csacademy = new CSAcademyService();
    this.eolymp = new EOlympService();
    this.usaco = new USACOService();

    // Sync lock to prevent concurrent syncs for the same user
    this.activeSyncs = new Map(); // userId -> Set<platform>
  }

  // ============================================
  // SYNC LOCK MANAGEMENT
  // ============================================

  /**
   * Acquire a sync lock for a user+platform combination
   * Returns true if lock acquired, false if already locked
   */
  acquireSyncLock(userId, platform) {
    if (!this.activeSyncs.has(userId)) {
      this.activeSyncs.set(userId, new Set());
    }

    const userLocks = this.activeSyncs.get(userId);
    if (userLocks.has(platform)) {
      return false; // Already locked
    }

    userLocks.add(platform);
    return true; // Lock acquired
  }

  /**
   * Release a sync lock for a user+platform combination
   */
  releaseSyncLock(userId, platform) {
    const userLocks = this.activeSyncs.get(userId);
    if (userLocks) {
      userLocks.delete(platform);
      if (userLocks.size === 0) {
        this.activeSyncs.delete(userId);
      }
    }
  }

  /**
   * Check if a sync is already in progress
   */
  isSyncInProgress(userId, platform) {
    const userLocks = this.activeSyncs.get(userId);
    return userLocks ? userLocks.has(platform) : false;
  }

  // ============================================
  // SYNC CHECKPOINT MANAGEMENT
  // ============================================

  /**
   * Create or get existing sync checkpoint for a platform
   * Uses upsert to handle unique constraint on (user_id, platform)
   */
  async getOrCreateCheckpoint(userId, platform, forceNew = false) {
    try {
      const platformId = await getPlatformId(platform);
      if (!platformId) {
        console.error(`[CHECKPOINT] Unknown platform code: ${platform}`);
        return null;
      }

      // sync_checkpoints was merged into sync_jobs; fetch the latest submissions job.
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .select('*')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('job_type', 'submissions')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const toLegacyCheckpoint = (job) => {
        if (!job) return null;
        return {
          id: job.id,
          user_id: job.user_id,
          platform,
          sync_status: job.status,
          sync_started_at: job.started_at,
          sync_completed_at: job.completed_at,
          total_inserted: job.inserted_items,
          last_submission_date: job.last_processed_id,
          last_synced_at: job.last_processed_at || job.completed_at,
          error_message: job.error_message,
        };
      };

      // If existing checkpoint found
      if (existing && !fetchError) {
        // If it's in_progress and we're not forcing new, just resume it
        if (existing.status === 'in_progress' && !forceNew) {
          return toLegacyCheckpoint(existing);
        }

        // Otherwise, update the existing checkpoint to start a new sync
        const { data: updated, error: updateError } = await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            completed_at: null,
            error_message: null,
            last_processed_id: null,
            last_processed_at: null,
            inserted_items: 0,
            processed_items: 0,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error(
            `[CHECKPOINT] Error updating existing checkpoint:`,
            updateError
          );
          return toLegacyCheckpoint(existing); // Return existing checkpoint even if update failed
        }
        return toLegacyCheckpoint(updated);
      }

      // No existing checkpoint found, create new one
      const { data: checkpoint, error } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .insert({
          user_id: userId,
          platform_id: platformId,
          job_type: 'submissions',
          status: 'in_progress',
          scheduled_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Handle race condition - another request may have created checkpoint
        if (error.code === '23505') {
          // Unique constraint violation
          const { data: raceCheckpoint } = await supabaseAdmin
            .from(V2_TABLES.SYNC_JOBS)
            .select('*')
            .eq('user_id', userId)
            .eq('platform_id', platformId)
            .eq('job_type', 'submissions')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          return toLegacyCheckpoint(raceCheckpoint);
        }
        console.error(`[CHECKPOINT] Error creating checkpoint:`, error);
        return null;
      }
      return toLegacyCheckpoint(checkpoint);
    } catch (error) {
      console.error(`[CHECKPOINT] Error in getOrCreateCheckpoint:`, error);
      return null;
    }
  }

  /**
   * Update checkpoint with progress
   */
  async updateCheckpoint(checkpointId, updates) {
    try {
      const mappedUpdates = {
        last_processed_at: new Date().toISOString(),
      };

      if (updates?.total_inserted != null) {
        mappedUpdates.inserted_items = updates.total_inserted;
        mappedUpdates.processed_items = updates.total_inserted;
      }

      if (updates?.last_submission_date) {
        mappedUpdates.last_processed_id = updates.last_submission_date;
      }

      const { error } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .update(mappedUpdates)
        .eq('id', checkpointId);

      if (error) {
        console.error(`[CHECKPOINT] Error updating checkpoint:`, error);
      }
    } catch (error) {
      console.error(`[CHECKPOINT] Exception updating checkpoint:`, error);
    }
  }

  /**
   * Mark checkpoint as completed
   */
  async completeCheckpoint(checkpointId, totalInserted) {
    try {
      const { error } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          last_processed_at: new Date().toISOString(),
          inserted_items: totalInserted,
          processed_items: totalInserted,
        })
        .eq('id', checkpointId);

      if (error) {
        console.error(`[CHECKPOINT] Error completing checkpoint:`, error);
      }
    } catch (error) {
      console.error(`[CHECKPOINT] Exception completing checkpoint:`, error);
    }
  }

  /**
   * Mark checkpoint as failed
   */
  async failCheckpoint(checkpointId, errorMessage, errorDetails = null) {
    try {
      const { error } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          last_processed_at: new Date().toISOString(),
          error_message: errorMessage,
          // Keep short, stable identifier in merged schema field.
          last_processed_id: errorDetails?.name || null,
        })
        .eq('id', checkpointId);

      if (error) {
        console.error(`[CHECKPOINT] Error failing checkpoint:`, error);
      }
    } catch (error) {
      console.error(`[CHECKPOINT] Exception failing checkpoint:`, error);
    }
  }

  /**
   * Clean up old completed/failed checkpoints (keep last 10 per platform)
   */
  async cleanupOldCheckpoints(userId, platform) {
    try {
      const platformId = await getPlatformId(platform);
      if (!platformId) return;

      const { data: checkpoints } = await supabaseAdmin
        .from(V2_TABLES.SYNC_JOBS)
        .select('id')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('job_type', 'submissions')
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false });

      if (checkpoints && checkpoints.length > 10) {
        const toDelete = checkpoints.slice(10).map((c) => c.id);
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .delete()
          .in('id', toDelete);
      }
    } catch (error) {
      console.error(`[CHECKPOINT] Error cleaning up checkpoints:`, error);
    }
  }

  /**
   * SPOJ fallback via VJudge's public solved-problems API.
   * Used when native SPOJ sync is blocked by Cloudflare.
   */
  async getSpojSubmissionsFromVJudge(
    userId,
    fromTimestamp = null,
    useV2 = null
  ) {
    try {
      const resolvedUseV2 =
        typeof useV2 === 'boolean' ? useV2 : await isV2SchemaAvailable();

      let vjHandle = null;

      if (resolvedUseV2) {
        const vjPlatformId = await getPlatformId('vjudge');
        if (vjPlatformId) {
          const { data } = await supabaseAdmin
            .from(V2_TABLES.USER_HANDLES)
            .select('handle')
            .eq('user_id', userId)
            .eq('platform_id', vjPlatformId)
            .maybeSingle();
          vjHandle = data?.handle || null;
        }
      } else {
        const { data } = await supabaseAdmin
          .from('user_handles')
          .select('handle')
          .eq('user_id', userId)
          .eq('platform', 'vjudge')
          .maybeSingle();
        vjHandle = data?.handle || null;
      }

      if (!vjHandle) {
        return [];
      }

      const response = await fetch(
        `https://vjudge.net/user/solveDetail/${encodeURIComponent(vjHandle)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      const spojSolves = Array.isArray(payload?.acRecords?.SPOJ)
        ? payload.acRecords.SPOJ
        : [];

      if (spojSolves.length === 0) {
        return [];
      }

      // VJudge solve details don't include actual submission timestamps.
      const syntheticSubmittedAt =
        normalizeSubmissionTimestamp(fromTimestamp) || new Date().toISOString();

      return spojSolves
        .map((code) => String(code || '').trim())
        .filter(Boolean)
        .map((problemCode) => ({
          submission_id: `vj_spoj_${problemCode}`,
          problem_id: problemCode,
          problem_name: problemCode,
          problem_url: `https://www.spoj.com/problems/${problemCode}/`,
          verdict: 'AC',
          language: 'Unknown',
          submitted_at: syntheticSubmittedAt,
        }));
    } catch (error) {
      console.warn(`[SPOJ] VJudge fallback failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Universal fallback to fetch submissions/solved problems using Clist API's contest statistics.
   * This handles platforms that don't have a dedicated scraper/API client.
   */
  async getSubmissionsFromClist(platform, handle, fromTimestamp = null) {
    const clistService = new ClistService();
    if (!clistService.isConfigured()) {
      console.warn(`[Clist Fallback] Clist API not configured.`);
      return [];
    }
    // Fetch all contests for this user on this platform
    const contests = await clistService.getContestStatistics(
      platform,
      handle,
      10000
    );
    if (!contests || contests.length === 0) return [];

    let submissions = [];

    for (const contest of contests) {
      if (!contest.problems || !Array.isArray(contest.problems)) continue;

      const contestTime = contest.date
        ? new Date(contest.date).getTime()
        : new Date().getTime();
      const fromTime = fromTimestamp ? new Date(fromTimestamp).getTime() : 0;

      // If the contest happened before our fromTimestamp, we can skip it
      if (fromTimestamp && contestTime <= fromTime) {
        continue;
      }

      for (const prob of contest.problems) {
        if (prob.solved || prob.result?.includes('+') || prob.result === 'AC') {
          submissions.push({
            submission_id: `clist_${contest.contestId}_${prob.label}`,
            problem_id:
              prob.name || prob.label || `${contest.contestId}_${prob.label}`,
            problem_name:
              prob.name ||
              `${contest.contestName || 'Contest'} - ${prob.label}`,
            problem_url: prob.url || null,
            contest_id: contest.contestId?.toString(),
            verdict: 'AC',
            language: 'Unknown',
            // Use contest date as an approximation of submission date
            submitted_at: contest.date || new Date().toISOString(),
          });
        }
      }
    }

    return submissions;
  }

  async syncUserSubmissions(userId, forceFullSync = false, manualHtml = null) {
    // Add timeout protection for the entire sync operation
    const SYNC_TIMEOUT_MS = 600000; // 10 minutes timeout
    const syncPromise = this._syncUserSubmissionsInternal(
      userId,
      forceFullSync,
      manualHtml
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Sync operation timed out after 10 minutes')),
        SYNC_TIMEOUT_MS
      );
    });

    try {
      return await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Sync timeout or error for user ${userId}:`, error);
      return {
        synced: 0,
        platforms: [],
        error: error.message,
      };
    }
  }

  async _syncUserSubmissionsInternal(
    userId,
    forceFullSync = false,
    manualHtml = null
  ) {
    // Fetch user handles from new schema
    const { data: v2Handles, error: handlesError } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select('*, platforms(code)')
      .eq('user_id', userId);

    if (handlesError) {
      console.error(
        `[SYNC] Error fetching handles for user ${userId}:`,
        handlesError
      );
      return { synced: 0, platforms: [], error: handlesError.message };
    }

    // Transform handles to include platform code for compatibility
    const handles =
      v2Handles?.map((h) => ({
        ...h,
        platform: h.platforms?.code || '',
      })) || [];

    if (!handles || handles.length === 0) {
      return { synced: 0, platforms: [] };
    }
    const results = [];

    for (const handle of handles) {
      // Check if sync is already in progress for this platform
      if (this.isSyncInProgress(userId, handle.platform)) {
        console.warn(
          `[SYNC] ${handle.platform}: Sync already in progress, skipping`
        );
        results.push({
          platform: handle.platform,
          handle: handle.handle,
          skipped: true,
          error: 'Sync already in progress for this platform',
        });
        continue;
      }

      // Acquire sync lock
      if (!this.acquireSyncLock(userId, handle.platform)) {
        console.warn(
          `[SYNC] ${handle.platform}: Failed to acquire sync lock, skipping`
        );
        results.push({
          platform: handle.platform,
          handle: handle.handle,
          skipped: true,
          error: 'Failed to acquire sync lock',
        });
        continue;
      }

      // Create or get checkpoint for this sync
      let checkpoint = null;
      try {
        checkpoint = await this.getOrCreateCheckpoint(
          userId,
          handle.platform,
          forceFullSync
        );
      } catch (checkpointError) {
        console.error(
          `[SYNC] ${handle.platform}: Error creating checkpoint:`,
          checkpointError
        );
      }

      try {
        // Add per-platform timeout (5 minutes per platform)
        const PLATFORM_TIMEOUT_MS = 300000; // 5 minutes

        const platformSyncPromise = (async () => {
          // If forceFullSync is true, fetch all submissions (don't use fromTimestamp)
          // Otherwise, check checkpoint for resume point or get last submission
          let fromTimestamp = null;
          if (!forceFullSync) {
            // Try to resume from checkpoint if it exists
            if (checkpoint?.last_submission_date) {
              fromTimestamp = checkpoint.last_submission_date;
            } else {
              const lastSubmission = await this.getLastSubmission(
                userId,
                handle.platform
              );
              fromTimestamp = lastSubmission?.submitted_at;
            }
          } else {
          }

          let submissions = [];
          let extensionRequired = false;
          switch (handle.platform) {
            case 'codeforces':
              submissions = await this.codeforces.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'atcoder':
              submissions = await this.atcoder.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'leetcode':
              // LeetCode submission ingestion is extension-only.
              // API extraction is intentionally disabled to avoid mismatches.
              submissions = [];
              break;
            case 'toph':
              submissions = await this.toph.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'cses':
              submissions = await this.cses.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'codechef':
              submissions = await this.codechef.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'topcoder':
              submissions = await this.topcoder.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'hackerrank':
              submissions = await this.hackerrank.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'kattis':
              submissions = await this.kattis.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'lightoj':
              submissions = await this.lightoj.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'uva':
              submissions = await this.uva.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'spoj':
              if (manualHtml) {
                submissions = this.spoj.parseSolvedProblems(manualHtml);
                if (!submissions || submissions.length === 0) {
                  return {
                    platform: handle.platform,
                    synced: 0,
                    handle: handle.handle,
                    success: false,
                    error:
                      'Could not parse any solved problems from the pasted content. Make sure you copied from your SPOJ profile page.',
                  };
                }
              } else {
                try {
                  submissions = await this.spoj.getSubmissions(
                    handle.handle,
                    fromTimestamp
                  );
                } catch (spojError) {
                  console.warn(
                    `[SPOJ] Native sync unavailable: ${spojError.message}`
                  );
                  submissions = [];
                }
                if (!submissions || submissions.length === 0) {
                  extensionRequired = true;
                  submissions = [];
                  console.warn(
                    '[SPOJ] No reliable server-side submissions due to Cloudflare. Use browser extension import.'
                  );
                }
              }
              break;
            case 'facebookhackercup':
              // Try CLIST contest statistics first; fall back to extension guidance if empty.
              try {
                submissions = await this.getSubmissionsFromClist(
                  handle.platform,
                  handle.handle,
                  fromTimestamp
                );
              } catch (fbhcError) {
                console.warn(`[FBHC] CLIST sync failed: ${fbhcError.message}`);
                submissions = [];
              }

              if (!submissions || submissions.length === 0) {
                extensionRequired = true;
                submissions = [];
                console.warn(
                  '[FBHC] No submissions from CLIST. Use browser extension import.'
                );
              }
              break;
            case 'vjudge':
              submissions = await this.vjudge.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'cfgym':
              submissions = await this.cfgym.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'csacademy':
              submissions = await this.csacademy.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'eolymp':
              submissions = await this.eolymp.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            case 'usaco':
              submissions = await this.usaco.getSubmissions(
                handle.handle,
                fromTimestamp
              );
              break;
            default:
              submissions = await this.getSubmissionsFromClist(
                handle.platform,
                handle.handle,
                fromTimestamp
              );
              break;
          }
          if (!submissions || !Array.isArray(submissions)) {
            console.warn(
              `[SYNC] ${handle.platform}: Invalid submissions response:`,
              typeof submissions
            );
            submissions = [];
          }

          const insertResult = await this.insertSubmissions(
            userId,
            handle.platform,
            submissions
          );
          if (!insertResult.success) {
            console.error(
              `[SYNC] ${handle.platform}: Insert had errors:`,
              insertResult.errors
            );
          }

          // Update checkpoint with progress
          if (checkpoint) {
            const lastProcessedTimestamp =
              submissions.length > 0
                ? submissions[submissions.length - 1]?.submitted_at
                : null;

            await this.updateCheckpoint(checkpoint.id, {
              total_inserted: insertResult.inserted,
              last_submission_date: lastProcessedTimestamp,
              error_details: {
                total_fetched: submissions.length,
                success: insertResult.success,
                extension_required: extensionRequired,
                errors: insertResult.errors,
                batches: insertResult.batches,
              },
            });
          }

          // Only update solves if we successfully inserted some data
          if (insertResult.inserted > 0) {
            await this.updateSolves(userId, handle.platform);
            await this.updateDailyActivity(userId);

            // Backfill tags for any existing solves that might be missing tags
            await this.backfillTagsForUser(userId);
          }

          // Mark checkpoint as completed
          if (checkpoint) {
            await this.completeCheckpoint(checkpoint.id, insertResult.inserted);
            await this.cleanupOldCheckpoints(userId, handle.platform);
          }
          return {
            platform: handle.platform,
            synced: insertResult.inserted,
            total: insertResult.total,
            handle: handle.handle,
            success: insertResult.success,
            extensionRequired,
            errors: insertResult.errors,
            batches: insertResult.batches,
          };
        })();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Platform ${handle.platform} sync timed out after 5 minutes`
                )
              ),
            PLATFORM_TIMEOUT_MS
          );
        });

        const result = await Promise.race([
          platformSyncPromise,
          timeoutPromise,
        ]);
        results.push(result);

        // Release sync lock on success
        this.releaseSyncLock(userId, handle.platform);
      } catch (error) {
        console.error(
          `[SYNC] Error syncing ${handle.platform} for user ${userId}:`,
          error.message
        );

        // Mark checkpoint as failed
        if (checkpoint) {
          await this.failCheckpoint(checkpoint.id, error.message, {
            stack: error.stack,
            name: error.name,
          });
        }

        results.push({
          platform: handle.platform,
          error: error.message,
          handle: handle.handle,
        });

        // Release sync lock on error
        this.releaseSyncLock(userId, handle.platform);
      } finally {
        // Ensure lock is always released
        if (this.isSyncInProgress(userId, handle.platform)) {
          console.warn(
            `[SYNC] ${handle.platform}: Cleaning up stuck lock in finally block`
          );
          this.releaseSyncLock(userId, handle.platform);
        }
      }
    }

    // Update user statistics
    await this.updateUserStatistics(userId, true);

    const totalSynced = results.reduce((acc, r) => acc + (r.synced || 0), 0);
    return {
      synced: totalSynced,
      platforms: results,
    };
  }

  /**
   * Sync submissions for a specific platform only
   * @param {string} userId - User ID
   * @param {string} platform - Platform ID to sync
   * @param {boolean} forceFullSync - If true, fetch ALL submissions
   */
  async syncPlatformSubmissions(
    userId,
    platform,
    forceFullSync = false,
    manualHtml = null
  ) {
    const useV2 = await isV2SchemaAvailable();

    // Get the handle for this platform
    const platformId = await getPlatformId(platform);
    const { data } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select('*, platforms(code)')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .single();

    const handle = data
      ? { ...data, platform: data.platforms?.code || platform }
      : null;

    if (!handle) {
      return { synced: 0, error: `No handle connected for ${platform}` };
    }

    try {
      // Get last submission timestamp if not full sync
      let fromTimestamp = null;
      if (!forceFullSync) {
        const lastSubmission = await this.getLastSubmission(userId, platform);
        fromTimestamp = lastSubmission?.submitted_at;
      }

      let submissions = [];
      let extensionRequired = false;

      // Fetch submissions based on platform
      switch (platform) {
        case 'codeforces':
          submissions = await this.codeforces.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'atcoder':
          submissions = await this.atcoder.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'leetcode':
          // LeetCode submission ingestion is extension-only.
          // API extraction is intentionally disabled to avoid mismatches.
          submissions = [];
          break;
        case 'toph':
          submissions = await this.toph.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'cses':
          submissions = await this.cses.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'codechef':
          submissions = await this.codechef.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          if (!submissions || submissions.length === 0) {
            try {
              const clistService = new ClistService();
              if (clistService.isConfigured()) {
                const account = await clistService.findAccount(
                  'codechef',
                  handle.handle
                );
                if (account) {
                  const data = await clistService.fetchApi('statistics', {
                    account_id: account.id,
                    with_problems: true,
                    limit: 100000,
                  });
                  if (data && data.objects) {
                    submissions = [];
                    let ccClistCount = 0;
                    for (const stat of data.objects) {
                      if (stat.problems && typeof stat.problems === 'object') {
                        for (const [probCode, probData] of Object.entries(
                          stat.problems
                        )) {
                          const solveContext = probData.upsolving || probData;
                          if (
                            solveContext &&
                            (solveContext.result === 100 ||
                              solveContext.verdict === 'AC' ||
                              solveContext.verdict === 'OK')
                          ) {
                            const subTime = solveContext.submission_time
                              ? new Date(
                                  solveContext.submission_time * 1000
                                ).toISOString()
                              : stat.date || new Date().toISOString();

                            // Filter logic (if fromTimestamp is provided)
                            if (
                              fromTimestamp &&
                              new Date(subTime) < new Date(fromTimestamp)
                            ) {
                              continue;
                            }

                            submissions.push({
                              submission_id: `clist_cc_${stat.contest_id}_${probCode}`,
                              problem_id: probCode,
                              problem_name: probCode,
                              problem_url: `https://www.codechef.com/problems/${probCode}`,
                              contest_id: `clist_${stat.contest_id}`,
                              verdict: 'AC',
                              language: solveContext.language || 'Unknown',
                              submitted_at: subTime,
                            });
                            ccClistCount++;
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (fallbackError) {
              console.warn(
                `[CodeChef] CLIST fallback failed: ${fallbackError.message}`
              );
            }
          }
          break;
        case 'topcoder':
          submissions = await this.topcoder.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'hackerrank':
          submissions = await this.hackerrank.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'kattis':
          submissions = await this.kattis.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'lightoj':
          submissions = await this.lightoj.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'uva':
          submissions = await this.uva.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'spoj':
          if (manualHtml) {
            submissions = this.spoj.parseSolvedProblems(manualHtml);
            if (!submissions || submissions.length === 0) {
              return {
                platform: handle.platform,
                synced: 0,
                handle: handle.handle,
                success: false,
                error:
                  'Could not parse any solved problems from the pasted content. Make sure you copied from your SPOJ profile page.',
              };
            }
          } else {
            try {
              submissions = await this.spoj.getSubmissions(
                handle.handle,
                fromTimestamp
              );
            } catch (spojError) {
              console.warn(
                `[SPOJ] Native sync unavailable: ${spojError.message}`
              );
              submissions = [];
            }
            if (!submissions || submissions.length === 0) {
              extensionRequired = true;
              submissions = [];
              console.warn(
                '[SPOJ] No reliable server-side submissions due to Cloudflare. Use browser extension import.'
              );
            }
          }
          break;
        case 'facebookhackercup':
          // Try CLIST contest statistics first; fall back to extension guidance if empty.
          try {
            submissions = await this.getSubmissionsFromClist(
              platform,
              handle.handle,
              fromTimestamp
            );
          } catch (fbhcError) {
            console.warn(`[FBHC] CLIST sync failed: ${fbhcError.message}`);
            submissions = [];
          }

          if (!submissions || submissions.length === 0) {
            extensionRequired = true;
            submissions = [];
            console.warn(
              '[FBHC] No submissions from CLIST. Use browser extension import.'
            );
          }
          break;
        case 'vjudge':
          submissions = await this.vjudge.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'cfgym':
          submissions = await this.cfgym.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'csacademy':
          submissions = await this.csacademy.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'eolymp':
          submissions = await this.eolymp.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        case 'usaco':
          submissions = await this.usaco.getSubmissions(
            handle.handle,
            fromTimestamp
          );
          break;
        default:
          submissions = await this.getSubmissionsFromClist(
            platform,
            handle.handle,
            fromTimestamp
          );
          if (!submissions || submissions.length === 0) {
            console.warn(
              `[SYNC] Unknown platform or no submissions from Clist: ${platform}`
            );
          }
          break;
      }

      const insertResult = await this.insertSubmissions(
        userId,
        platform,
        submissions
      );

      if (!insertResult.success) {
        console.warn(
          `[SYNC] ${platform}: insert completed with errors`,
          insertResult.errors
        );
      }

      const insertedCount = insertResult.inserted || 0;

      await this.updateSolves(userId, platform);
      await this.updateDailyActivity(userId);
      await this.updateUserStatistics(userId);

      // Backfill tags for any existing solves that might be missing tags
      await this.backfillTagsForUser(userId);

      return {
        synced: insertedCount,
        total: insertResult.total || submissions.length,
        success: insertResult.success,
        extensionRequired,
        errors: insertResult.errors,
        platform,
        handle: handle.handle,
      };
    } catch (error) {
      console.error(`Error syncing ${platform} for user ${userId}:`, error);
      return {
        synced: 0,
        platform,
        error: error.message,
      };
    }
  }

  async getLastSubmission(userId, platform) {
    const platformId = await getPlatformId(platform);

    if (!platformId) return null;

    const { data } = await supabaseAdmin
      .from(V2_TABLES.SUBMISSIONS)
      .select('submitted_at')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  }

  async insertSubmissions(userId, platform, submissions) {
    // Defensive check: ensure submissions is an array
    if (!submissions) return { success: true, inserted: 0, errors: [] };
    if (!Array.isArray(submissions)) {
      console.warn(
        `insertSubmissions received non-array for ${platform}:`,
        typeof submissions
      );
      // Try to extract submissions array if it's an object with submissions property
      if (submissions.submissions && Array.isArray(submissions.submissions)) {
        submissions = submissions.submissions;
      } else {
        return { success: true, inserted: 0, errors: [] };
      }
    }
    if (submissions.length === 0)
      return { success: true, inserted: 0, errors: [] };

    const errors = [];
    let totalInserted = 0;

    // Check for V2 schema
    const useV2 = await isV2SchemaAvailable();

    try {
      // ── CLEANUP: Delete stale synthetic/inferred placeholder rows ──────────────
      // Old syncs may have persisted `lc_synthetic_*` (Unknown LeetCode Problem) or
      // `lc_inferred_*` problem rows. If the new Source 4 provides real guesses,
      // we need to remove these old entries first so they don't persist on the UI.
      if (platform === 'leetcode') {
        const submissionsTable = useV2
          ? V2_TABLES.SUBMISSIONS
          : 'problem_submissions';

        let cleanupQuery;
        if (useV2) {
          const { getPlatformId } =
            await import('./problem-solving-v2-helpers.js');
          const platformId = await getPlatformId('leetcode');
          // V2 schema uses external_submission_id and external_problem_id
          cleanupQuery = supabaseAdmin
            .from(submissionsTable)
            .delete()
            .eq('user_id', userId)
            .eq('platform_id', platformId)
            .or(
              'external_submission_id.like.lc_synthetic_%,external_submission_id.like.lc_inferred_%,external_problem_id.like.lc-unknown-%'
            );
        } else {
          cleanupQuery = supabaseAdmin
            .from(submissionsTable)
            .delete()
            .eq('user_id', userId)
            .eq('platform', 'leetcode')
            .or(
              'submission_id.like.lc_synthetic_%,submission_id.like.lc_inferred_%,problem_id.like.lc-unknown-%'
            );
        }

        const { error: cleanupError } = await cleanupQuery;

        if (cleanupError) {
          console.warn(
            '[LC] Cleanup of old synthetic rows failed (non-fatal):',
            cleanupError.message
          );
          errors.push({ type: 'cleanup', message: cleanupError.message });
        }
      }
      // ──────────────────────────────────────────────────────────────────────────

      // Filter out invalid submissions (bad data protection)
      const validSubmissions = submissions
        .map((sub) => {
          const submissionId = sub.submission_id
            ? String(sub.submission_id).trim()
            : '';

          if (!submissionId) return null;

          const problemIdRaw = sub.problem_id
            ? String(sub.problem_id).trim()
            : '';
          if (!problemIdRaw) return null;

          const submittedAt = normalizeSubmissionTimestamp(sub.submitted_at);
          if (!submittedAt) return null;

          if (platform === 'leetcode') {
            if (isHeuristicLeetCodeSubmissionId(submissionId)) {
              return null;
            }

            const normalizedProblemSlug =
              normalizeLeetCodeProblemSlug(problemIdRaw);
            if (!normalizedProblemSlug) {
              return null;
            }

            return {
              ...sub,
              submission_id: submissionId,
              problem_id: normalizedProblemSlug,
              submitted_at: submittedAt,
            };
          }

          return {
            ...sub,
            submission_id: submissionId,
            problem_id: problemIdRaw,
            submitted_at: submittedAt,
          };
        })
        .filter(Boolean)
        .filter((sub) => {
          // Reject submissions with acRecords/failRecords patterns (bad data from old buggy code)
          if (
            sub.submission_id.includes('acRecords') ||
            sub.submission_id.includes('failRecords') ||
            sub.problem_id?.includes('acRecords') ||
            sub.problem_id?.includes('failRecords')
          ) {
            console.warn(
              `Skipping invalid submission with bad pattern: ${sub.submission_id}`
            );
            return false;
          }

          return true;
        });

      if (validSubmissions.length === 0) {
        return { success: true, inserted: 0, errors };
      }

      // Get platform_id for V2
      let platformId = null;
      if (useV2) {
        const { getPlatformId } =
          await import('./problem-solving-v2-helpers.js');
        platformId = await getPlatformId(platform);
        if (!platformId) {
          console.error(
            `[${platform}] Could not find platform_id for V2 insert`
          );
          return {
            success: false,
            inserted: 0,
            errors: [
              {
                type: 'platform_not_found',
                message: `Platform ${platform} not found in cp_platforms`,
              },
            ],
          };
        }
      }

      // Normalize submission data to match database schema
      // For V2 schema, we need to lookup language_id from language string
      const { getLanguageId, ensureLanguageCacheLoaded } =
        await import('./problem-solving-v2-helpers.js');

      // Pre-load language cache once before processing all submissions
      // This prevents many concurrent fetch requests
      if (useV2) {
        await ensureLanguageCacheLoaded();
      }

      const toInsert = await Promise.all(
        validSubmissions.map(async (sub) => {
          const normalizedVerdict = normalizeSubmissionVerdict(
            sub.verdict || 'PENDING'
          );

          if (useV2) {
            // V2 schema: submissions table has specific columns
            // id, user_id, problem_id (uuid FK), platform_id, external_submission_id,
            // external_problem_id, problem_name, verdict, language_id, execution_time_ms,
            // memory_kb, submitted_at, created_at
            const languageId = await getLanguageId(sub.language);

            return {
              user_id: userId,
              platform_id: platformId,
              external_submission_id: sub.submission_id,
              external_problem_id: sub.problem_id,
              problem_name: sub.problem_name || null,
              verdict: normalizedVerdict,
              language_id: languageId,
              execution_time_ms:
                sub.runtime_ms || sub.execution_time_ms || null,
              memory_kb: sub.memory_kb || null,
              submitted_at: sub.submitted_at,
            };
          } else {
            // Legacy schema
            return {
              user_id: userId,
              platform,
              submission_id: sub.submission_id,
              problem_id: sub.problem_id,
              problem_name: sub.problem_name || null,
              problem_url: sub.problem_url || sub.original_url || null,
              contest_id: sub.contest_id || null,
              verdict: normalizedVerdict,
              language: sub.language || null,
              execution_time_ms:
                sub.runtime_ms || sub.execution_time_ms || null,
              memory_kb: sub.memory_kb || null,
              difficulty_rating:
                sub.difficulty || sub.difficulty_rating || null,
              tags: sub.tags && sub.tags.length > 0 ? sub.tags : null,
              submitted_at: sub.submitted_at,
            };
          }
        })
      );

      // Batch upserts to avoid statement timeout (100 records per batch)
      const BATCH_SIZE = 100;
      const batches = [];

      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        batches.push(toInsert.slice(i, i + BATCH_SIZE));
      }
      // Track successful batches for potential rollback
      const successfulBatches = [];
      const submissionsTable = useV2
        ? V2_TABLES.SUBMISSIONS
        : 'problem_submissions';
      const conflictColumn = useV2
        ? 'user_id,platform_id,external_submission_id'
        : 'user_id,platform,submission_id';

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        try {
          const { data, error } = await supabaseAdmin
            .from(submissionsTable)
            .upsert(batch, {
              onConflict: conflictColumn,
              ignoreDuplicates: false, // Update existing records with new data
            })
            .select();

          if (error) {
            // Schema fallback: some local databases may not yet have the expected
            // composite unique constraint for ON CONFLICT.
            if (error.code === '42P10') {
              console.warn(
                `[${platform}] Missing ON CONFLICT constraint (${conflictColumn}); falling back to manual dedupe + insert for batch ${i + 1}/${batches.length}`
              );

              try {
                let rowsToInsert = batch;

                if (useV2) {
                  const candidateIds = [
                    ...new Set(
                      batch
                        .map((row) => row.external_submission_id)
                        .filter(Boolean)
                    ),
                  ];

                  if (candidateIds.length > 0) {
                    const { data: existingRows, error: existingError } =
                      await supabaseAdmin
                        .from(submissionsTable)
                        .select('external_submission_id')
                        .eq('user_id', userId)
                        .eq('platform_id', platformId)
                        .in('external_submission_id', candidateIds);

                    if (existingError) {
                      throw existingError;
                    }

                    const existingSet = new Set(
                      (existingRows || [])
                        .map((row) => row.external_submission_id)
                        .filter(Boolean)
                    );

                    rowsToInsert = batch.filter(
                      (row) => !existingSet.has(row.external_submission_id)
                    );
                  }
                } else {
                  const candidateIds = [
                    ...new Set(
                      batch.map((row) => row.submission_id).filter(Boolean)
                    ),
                  ];

                  if (candidateIds.length > 0) {
                    const { data: existingRows, error: existingError } =
                      await supabaseAdmin
                        .from(submissionsTable)
                        .select('submission_id')
                        .eq('user_id', userId)
                        .eq('platform', platform)
                        .in('submission_id', candidateIds);

                    if (existingError) {
                      throw existingError;
                    }

                    const existingSet = new Set(
                      (existingRows || [])
                        .map((row) => row.submission_id)
                        .filter(Boolean)
                    );

                    rowsToInsert = batch.filter(
                      (row) => !existingSet.has(row.submission_id)
                    );
                  }
                }

                if (rowsToInsert.length === 0) {
                  successfulBatches.push(i);
                  continue;
                }

                const { data: insertedRows, error: insertError } =
                  await supabaseAdmin
                    .from(submissionsTable)
                    .insert(rowsToInsert)
                    .select();

                if (insertError) {
                  throw insertError;
                }

                const insertedCount =
                  insertedRows?.length || rowsToInsert.length;
                totalInserted += insertedCount;
                successfulBatches.push(i);
                continue;
              } catch (fallbackError) {
                console.error(
                  `[${platform}] Fallback insert failed for batch ${i + 1}/${batches.length}: ${fallbackError.message}`
                );
                errors.push({
                  type: 'batch_insert_fallback',
                  batch: i + 1,
                  message: fallbackError.message,
                });
                continue;
              }
            }

            const errorMsg = `Batch ${i + 1}/${batches.length} failed: ${error.message}`;
            console.error(`[${platform}] ${errorMsg}`);
            errors.push({
              type: 'batch_insert',
              batch: i + 1,
              message: error.message,
              code: error.code,
              details: error.details,
            });

            // If this is a critical error (not a constraint violation), attempt rollback
            if (error.code !== '23505' && successfulBatches.length > 0) {
              console.warn(
                `[${platform}] Critical error detected, considering rollback...`
              );
              // Note: Supabase doesn't support transactions across multiple calls,
              // so we log this for manual intervention if needed
              errors.push({
                type: 'rollback_needed',
                message: `Failed at batch ${i + 1}/${batches.length}, ${successfulBatches.length} batches were successful`,
                successfulBatches: successfulBatches.length,
              });
            }

            // Continue with remaining batches (partial success is better than total failure)
            continue;
          }

          const insertedCount = data?.length || 0;
          totalInserted += insertedCount;
          successfulBatches.push(i);
        } catch (batchError) {
          const errorMsg = `Batch ${i + 1}/${batches.length} exception: ${batchError.message}`;
          console.error(`[${platform}] ${errorMsg}`);
          errors.push({
            type: 'batch_exception',
            batch: i + 1,
            message: batchError.message,
          });
        }
      }

      const success =
        errors.length === 0 ||
        (totalInserted > 0 &&
          !errors.some((e) => e.type === 'rollback_needed'));
      return {
        success,
        inserted: totalInserted,
        total: toInsert.length,
        errors,
        batches: {
          total: batches.length,
          successful: successfulBatches.length,
          failed: batches.length - successfulBatches.length,
        },
      };
    } catch (error) {
      console.error(
        `[${platform}] Critical error in insertSubmissions:`,
        error
      );
      return {
        success: false,
        inserted: totalInserted,
        errors: [
          {
            type: 'critical',
            message: error.message,
            stack: error.stack,
          },
        ],
      };
    }
  }

  async updateSolves(userId, platform) {
    // Check for V2 schema
    const useV2 = await isV2SchemaAvailable();

    let submissions = [];
    let platformId = null;

    if (useV2) {
      // V2: Get platform_id and query from submissions_v2
      const { getPlatformId } = await import('./problem-solving-v2-helpers.js');
      platformId = await getPlatformId(platform);

      if (!platformId) {
        console.error(
          `[${platform}] Could not find platform_id for V2 updateSolves`
        );
        return;
      }

      const { data } = await supabaseAdmin
        .from(V2_TABLES.SUBMISSIONS)
        .select('*')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .order('submitted_at', { ascending: true });

      submissions = (data || []).filter(
        (sub) => normalizeSubmissionVerdict(sub.verdict) === 'AC'
      );
    } else {
      // Legacy: Query from problem_submissions
      const { data } = await supabaseAdmin
        .from('problem_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .order('submitted_at', { ascending: true });

      submissions = (data || []).filter(
        (sub) => normalizeSubmissionVerdict(sub.verdict) === 'AC'
      );
    }

    // Build solves map - use external_problem_id for V2, problem_id for legacy
    const solvesByProblem = {};
    for (const sub of submissions) {
      // V2 schema uses external_problem_id, legacy uses problem_id
      const rawProblemKey = useV2 ? sub.external_problem_id : sub.problem_id;
      const problemKey = rawProblemKey ? String(rawProblemKey).trim() : '';
      const submittedAt =
        sub.submitted_at && Number.isFinite(Date.parse(sub.submitted_at))
          ? sub.submitted_at
          : null;

      if (!problemKey) {
        continue;
      }

      // Skip bad data with acRecords/failRecords patterns
      if (
        problemKey?.includes('acRecords') ||
        problemKey?.includes('failRecords')
      ) {
        continue;
      }

      if (!solvesByProblem[problemKey]) {
        solvesByProblem[problemKey] = {
          user_id: userId,
          platform,
          platform_id: platformId,
          problem_id: problemKey,
          problem_name: sub.problem_name,
          // V2 submissions table doesn't have these fields; they're on the problems table
          // For V2, these will be fetched/set separately when creating problem records
          problem_url: useV2 ? null : sub.problem_url,
          contest_id: useV2 ? null : sub.contest_id,
          difficulty_rating: useV2 ? null : sub.difficulty_rating,
          difficulty_tier: useV2
            ? null
            : this.mapDifficultyTier(platform, sub.difficulty_rating),
          first_solved_at: submittedAt,
          attempt_count: 1,
          tags: useV2
            ? null
            : sub.tags && sub.tags.length > 0
              ? sub.tags
              : null,
        };
      } else {
        solvesByProblem[problemKey].attempt_count++;
        if (
          submittedAt &&
          (!solvesByProblem[problemKey].first_solved_at ||
            !Number.isFinite(
              Date.parse(solvesByProblem[problemKey].first_solved_at)
            ) ||
            Date.parse(submittedAt) <
              Date.parse(solvesByProblem[problemKey].first_solved_at))
        ) {
          solvesByProblem[problemKey].first_solved_at = submittedAt;
        }
        if (
          !useV2 &&
          sub.tags &&
          sub.tags.length > 0 &&
          !solvesByProblem[problemKey].tags
        ) {
          solvesByProblem[problemKey].tags = sub.tags;
        }
      }
    }

    // V2 cleanup: remove stale solves (and linked solutions) for this platform
    // so verdict corrections cannot leave orphaned solved-problem entries.
    if (useV2) {
      const validProblemKeys = new Set(Object.keys(solvesByProblem));

      try {
        const { data: existingSolveRows, error: existingSolveError } =
          await supabaseAdmin
            .from(V2_TABLES.USER_SOLVES)
            .select('id, problems!inner(external_id, platform_id)')
            .eq('user_id', userId)
            .eq('problems.platform_id', platformId);

        if (existingSolveError) {
          console.warn(
            `[${platform.toUpperCase()}] V2 stale solve lookup failed:`,
            existingSolveError.message
          );
        } else {
          const orphanSolveIds = (existingSolveRows || [])
            .filter((row) => {
              const joinedProblem = Array.isArray(row.problems)
                ? row.problems[0]
                : row.problems;
              const externalId = String(
                joinedProblem?.external_id || ''
              ).trim();
              return !externalId || !validProblemKeys.has(externalId);
            })
            .map((row) => row.id)
            .filter(Boolean);

          if (orphanSolveIds.length > 0) {
            const { error: deleteSolutionsError } = await supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .delete()
              .in('user_solve_id', orphanSolveIds);

            if (deleteSolutionsError) {
              console.warn(
                `[${platform.toUpperCase()}] V2 stale solution cleanup failed:`,
                deleteSolutionsError.message
              );
            }

            const { error: deleteSolvesError } = await supabaseAdmin
              .from(V2_TABLES.USER_SOLVES)
              .delete()
              .in('id', orphanSolveIds);

            if (deleteSolvesError) {
              console.warn(
                `[${platform.toUpperCase()}] V2 stale solve cleanup failed:`,
                deleteSolvesError.message
              );
            }
          }
        }
      } catch (cleanupError) {
        console.warn(
          `[${platform.toUpperCase()}] V2 stale solve cleanup exception:`,
          cleanupError.message
        );
      }
    }

    if (!submissions || submissions.length === 0) return;

    const solves = Object.values(solvesByProblem);
    const BATCH_SIZE = 100;

    if (useV2) {
      // ═══════════════════════════════════════════════════════════════════════
      // V2 SCHEMA: Sync to problems_v2 + user_solves_v2
      // ═══════════════════════════════════════════════════════════════════════
      for (let i = 0; i < solves.length; i += BATCH_SIZE) {
        const batch = solves.slice(i, i + BATCH_SIZE);

        for (const solve of batch) {
          try {
            const difficultyRating = solve.difficulty_rating
              ? Math.round(Number(solve.difficulty_rating))
              : null;

            // Step 1: Upsert into problems table (V2 schema uses 'external_id' not 'problem_id')
            const { data: existingProblem } = await supabaseAdmin
              .from(V2_TABLES.PROBLEMS)
              .select('id')
              .eq('platform_id', platformId)
              .eq('external_id', solve.problem_id)
              .maybeSingle();

            let problemDbId = existingProblem?.id;

            if (!problemDbId) {
              // Create new problem record in V2
              // V2 problems table: id, platform_id, external_id, contest_id, name, url,
              // difficulty_rating, difficulty_tier_id, time_limit_ms, memory_limit_kb, created_at, updated_at
              const problemData = {
                platform_id: platformId,
                external_id: solve.problem_id,
                name: solve.problem_name || `Problem ${solve.problem_id}`,
                url: solve.problem_url || null,
                contest_id: solve.contest_id || null,
                difficulty_rating: difficultyRating,
              };

              const { data: newProblem, error: createError } =
                await supabaseAdmin
                  .from(V2_TABLES.PROBLEMS)
                  .insert(problemData)
                  .select('id')
                  .single();

              if (createError) {
                if (createError.code === '23505') {
                  // Race condition - fetch existing
                  const { data: existingAfterConflict } = await supabaseAdmin
                    .from(V2_TABLES.PROBLEMS)
                    .select('id')
                    .eq('platform_id', platformId)
                    .eq('external_id', solve.problem_id)
                    .maybeSingle();
                  problemDbId = existingAfterConflict?.id;
                } else {
                  console.warn(
                    `[${platform.toUpperCase()}] V2 Error creating problem ${solve.problem_id}:`,
                    createError.message
                  );
                  continue;
                }
              } else {
                problemDbId = newProblem?.id;
              }
            } else {
              // Update existing problem with latest info
              const updateData = { updated_at: new Date().toISOString() };
              if (solve.problem_name) updateData.name = solve.problem_name;
              if (solve.problem_url) updateData.url = solve.problem_url;
              if (solve.contest_id) updateData.contest_id = solve.contest_id;
              if (difficultyRating !== null)
                updateData.difficulty_rating = difficultyRating;

              await supabaseAdmin
                .from(V2_TABLES.PROBLEMS)
                .update(updateData)
                .eq('id', problemDbId);
            }

            if (!problemDbId) {
              console.warn(
                `[${platform.toUpperCase()}] V2 Could not get problem ID for ${solve.problem_id}`
              );
              continue;
            }

            // Step 2: Upsert into user_solves_v2 table
            const { data: existingSolve } = await supabaseAdmin
              .from(V2_TABLES.USER_SOLVES)
              .select('id, solve_count')
              .eq('user_id', userId)
              .eq('problem_id', problemDbId)
              .maybeSingle();

            const solveCount = solve.attempt_count || 1;

            if (existingSolve) {
              await supabaseAdmin
                .from(V2_TABLES.USER_SOLVES)
                .update({
                  solve_count: solveCount,
                  attempt_count: solveCount,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingSolve.id);
            } else {
              const { error: solveError } = await supabaseAdmin
                .from(V2_TABLES.USER_SOLVES)
                .insert({
                  user_id: userId,
                  problem_id: problemDbId,
                  first_solved_at: solve.first_solved_at,
                  solve_count: solveCount,
                  attempt_count: solveCount,
                });

              if (solveError && solveError.code !== '23505') {
                console.warn(
                  `[${platform.toUpperCase()}] V2 Error creating user_solve for ${solve.problem_id}:`,
                  solveError.message
                );
              }
            }
          } catch (syncError) {
            console.warn(
              `[${platform.toUpperCase()}] V2 Error syncing solve ${solve.problem_id}:`,
              syncError.message
            );
          }
        }
      }
    } else {
      // ═══════════════════════════════════════════════════════════════════════
      // LEGACY SCHEMA: Sync to problem_solves + problems + user_problem_solves
      // ═══════════════════════════════════════════════════════════════════════

      // ── CLEANUP ORPHANED SOLVES ──────────────────────────────────────────────
      const { data: existingSolves } = await supabaseAdmin
        .from('problem_solves')
        .select('problem_id')
        .eq('user_id', userId)
        .eq('platform', platform);

      if (existingSolves) {
        const validProblemIds = new Set(Object.keys(solvesByProblem));
        const orphanedIds = existingSolves
          .map((s) => s.problem_id)
          .filter((id) => !validProblemIds.has(id));

        if (orphanedIds.length > 0) {
          for (let i = 0; i < orphanedIds.length; i += 100) {
            const batch = orphanedIds.slice(i, i + 100);
            await supabaseAdmin
              .from('problem_solves')
              .delete()
              .eq('user_id', userId)
              .eq('platform', platform)
              .in('problem_id', batch);
          }
        }
      }

      if (solves.length > 0) {
        // Upsert to problem_solves (legacy)
        for (let i = 0; i < solves.length; i += BATCH_SIZE) {
          const batch = solves.slice(i, i + BATCH_SIZE);
          const { error } = await supabaseAdmin
            .from('problem_solves')
            .upsert(batch, {
              onConflict: 'user_id,platform,problem_id',
              ignoreDuplicates: false,
            });

          if (error) {
            if (error.code === 'PGRST204' && error.message?.includes('tags')) {
              const batchWithoutTags = batch.map(({ tags, ...rest }) => rest);
              await supabaseAdmin
                .from('problem_solves')
                .upsert(batchWithoutTags, {
                  onConflict: 'user_id,platform,problem_id',
                  ignoreDuplicates: false,
                });
            } else {
              console.error(`Error upserting solves batch:`, error);
            }
          }
        }

        // Also sync to problems + user_problem_solves (intermediate schema)
        for (let i = 0; i < solves.length; i += BATCH_SIZE) {
          const batch = solves.slice(i, i + BATCH_SIZE);

          for (const solve of batch) {
            try {
              const difficultyRating = solve.difficulty_rating
                ? Math.round(Number(solve.difficulty_rating))
                : null;
              const tags =
                solve.tags && Array.isArray(solve.tags) && solve.tags.length > 0
                  ? solve.tags
                  : null;

              // Step 1: Upsert into problems table
              const { data: existingProblem } = await supabaseAdmin
                .from('problems')
                .select('id')
                .eq('platform', solve.platform)
                .eq('problem_id', solve.problem_id)
                .maybeSingle();

              let problemDbId = existingProblem?.id;

              if (!problemDbId) {
                const problemData = {
                  platform: solve.platform,
                  problem_id: solve.problem_id,
                  problem_name:
                    solve.problem_name || `Problem ${solve.problem_id}`,
                  problem_url: solve.problem_url || null,
                  contest_id: solve.contest_id || null,
                  difficulty_rating: difficultyRating,
                  tags: tags,
                };

                const { data: newProblem, error: createError } =
                  await supabaseAdmin
                    .from('problems')
                    .insert(problemData)
                    .select('id')
                    .single();

                if (createError) {
                  if (createError.code === '23505') {
                    const { data: existingAfterConflict } = await supabaseAdmin
                      .from('problems')
                      .select('id')
                      .eq('platform', solve.platform)
                      .eq('problem_id', solve.problem_id)
                      .maybeSingle();
                    problemDbId = existingAfterConflict?.id;
                  } else {
                    continue;
                  }
                } else {
                  problemDbId = newProblem?.id;
                }
              } else {
                const updateData = { updated_at: new Date().toISOString() };
                if (solve.problem_name)
                  updateData.problem_name = solve.problem_name;
                if (solve.problem_url)
                  updateData.problem_url = solve.problem_url;
                if (solve.contest_id) updateData.contest_id = solve.contest_id;
                if (difficultyRating !== null)
                  updateData.difficulty_rating = difficultyRating;
                if (tags) updateData.tags = tags;

                await supabaseAdmin
                  .from('problems')
                  .update(updateData)
                  .eq('id', problemDbId);
              }

              if (!problemDbId) continue;

              // Step 2: Upsert into user_problem_solves table
              const { data: existingSolve } = await supabaseAdmin
                .from('user_problem_solves')
                .select('id, solve_count')
                .eq('user_id', userId)
                .eq('problem_id', problemDbId)
                .maybeSingle();

              const solveCount = solve.attempt_count || 1;

              if (existingSolve) {
                await supabaseAdmin
                  .from('user_problem_solves')
                  .update({
                    solve_count: solveCount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingSolve.id);
              } else {
                const { error: solveError } = await supabaseAdmin
                  .from('user_problem_solves')
                  .insert({
                    user_id: userId,
                    problem_id: problemDbId,
                    first_solved_at: solve.first_solved_at,
                    solve_count: solveCount,
                  });

                if (solveError && solveError.code !== '23505') {
                  console.warn(
                    `[${platform.toUpperCase()}] Error creating user_problem_solve:`,
                    solveError.message
                  );
                }
              }
            } catch (syncError) {
              console.warn(
                `[${platform.toUpperCase()}] Error syncing solve to new schema:`,
                syncError.message
              );
            }
          }
        }
      }
    }
  }

  /**
   * Backfill tags from problem_submissions to problem_solves
   * Call this to update existing solves with tags from their submissions
   */
  async backfillTagsForUser(userId) {
    try {
      // Get all submissions with tags
      const { data: submissions } = await supabaseAdmin
        .from('problem_submissions')
        .select('platform, problem_id, tags')
        .eq('user_id', userId)
        .not('tags', 'is', null);

      if (!submissions || submissions.length === 0) return 0;

      // Group tags by problem (use latest non-empty tags)
      const tagsByProblem = {};
      for (const sub of submissions) {
        if (sub.tags && sub.tags.length > 0) {
          const key = `${sub.platform}-${sub.problem_id}`;
          tagsByProblem[key] = {
            platform: sub.platform,
            problem_id: sub.problem_id,
            tags: sub.tags,
          };
        }
      }

      // Update problem_solves with tags
      let updatedCount = 0;
      for (const data of Object.values(tagsByProblem)) {
        const { error } = await supabaseAdmin
          .from('problem_solves')
          .update({ tags: data.tags })
          .eq('user_id', userId)
          .eq('platform', data.platform)
          .eq('problem_id', data.problem_id);

        if (error) {
          // If tags column doesn't exist, skip backfill silently
          if (error.code === 'PGRST204' && error.message?.includes('tags')) {
            console.warn(
              'Tags column not found in problem_solves, skipping backfill. Run the migration: scripts/sql/problem-tags-migration.sql'
            );
            return 0;
          }
        } else {
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error in backfillTagsForUser:', error);
      return 0;
    }
  }

  async updateDailyActivity(userId) {
    const { data: solves } = await supabaseAdmin
      .from('problem_solves')
      .select('first_solved_at, platform')
      .eq('user_id', userId);

    if (!solves) return;

    const byDate = {};
    for (const solve of solves) {
      if (!solve.first_solved_at) continue;
      const date = solve.first_solved_at.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { count: 0, platforms: new Set() };
      }
      byDate[date].count++;
      byDate[date].platforms.add(solve.platform);
    }

    const activities = Object.entries(byDate).map(([date, data]) => ({
      user_id: userId,
      activity_date: date,
      problems_solved: data.count,
      platforms_active: Array.from(data.platforms),
    }));

    if (activities.length > 0) {
      await supabaseAdmin
        .from('daily_activity')
        .upsert(activities, { onConflict: 'user_id,activity_date' });
    }
  }

  async updateUserStatistics(userId, fetchPlatformStats = false) {
    const statsTable = V2_TABLES.USER_STATS;

    // V2/V3: join user_solves → problems → difficulty_tiers for proper tier counts
    const { data: solves } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select(
        `first_solved_at,
         problems(
           difficulty_rating,
           difficulty_tier_id,
           platform_id,
           difficulty_tiers(id, min_rating, max_rating),
           platforms(code)
         )`
      )
      .eq('user_id', userId);

    if (!solves) return;

    const totalSolved = solves.length;
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const solvedThisWeek = solves.filter(
      (s) => new Date(s.first_solved_at) >= weekAgo
    ).length;
    const solvedThisMonth = solves.filter(
      (s) => new Date(s.first_solved_at) >= monthAgo
    ).length;

    // Per-tier counts keyed by min_rating (e.g. 800, 900, …)
    const tierCounts = {};
    // Per-tier counts keyed by tier id (for user_tier_stats upsert)
    const tierIdCounts = {};
    // Per-platform counts
    const platformCounts = {};

    solves.forEach((s) => {
      const minRating = s.problems?.difficulty_tiers?.min_rating;
      const tierId = s.problems?.difficulty_tier_id;
      const platCode = s.problems?.platforms?.code;

      if (minRating != null) {
        tierCounts[minRating] = (tierCounts[minRating] || 0) + 1;
      }
      if (tierId != null) {
        tierIdCounts[tierId] = (tierIdCounts[tierId] || 0) + 1;
      }
      if (platCode) {
        platformCounts[platCode] = (platformCounts[platCode] || 0) + 1;
      }
    });

    // Helper: solved for a specific rating bracket (inclusive lower bound)
    const sc = (r) => tierCounts[r] || 0;

    // Flat columns in user_stats (kept for backward compat)
    const easy_solved = sc(800) + sc(900);
    const medium_solved = sc(1000) + sc(1100) + sc(1200) + sc(1300);
    const hard_solved = sc(1400) + sc(1500) + sc(1600) + sc(1700);
    const expert_solved =
      sc(1800) +
      sc(1900) +
      sc(2000) +
      sc(2100) +
      sc(2200) +
      sc(2300) +
      sc(2400) +
      (tierCounts[2500] || 0);

    // Calculate weighted score from per-rating tier counts
    const ratingWeights = {
      800: 1,
      900: 1.2,
      1000: 1.5,
      1100: 1.8,
      1200: 2,
      1300: 2.5,
      1400: 3,
      1500: 3.5,
      1600: 4,
      1700: 4.5,
      1800: 5,
      1900: 6,
      2000: 7,
      2100: 8,
      2200: 9,
      2300: 10,
      2400: 12,
      2500: 15,
    };
    const weightedScore = Object.entries(ratingWeights).reduce(
      (sum, [rating, w]) => sum + (tierCounts[Number(rating)] || 0) * w,
      0
    );

    // Calculate streak
    const currentStreak = await this.calculateStreak(userId);

    // --- 1. Update user_stats ---
    const updateData = {
      user_id: userId,
      total_solved: totalSolved,
      easy_solved,
      medium_solved,
      hard_solved,
      expert_solved,
      // Flat rating-bracket columns (V2 compat)
      solved_800: sc(800),
      solved_900: sc(900),
      solved_1000: sc(1000),
      solved_1100: sc(1100),
      solved_1200: sc(1200),
      solved_1300: sc(1300),
      solved_1400: sc(1400),
      solved_1500: sc(1500),
      solved_1600: sc(1600),
      solved_1700: sc(1700),
      solved_1800: sc(1800),
      solved_1900: sc(1900),
      solved_2000: sc(2000),
      solved_2100: sc(2100),
      solved_2200: sc(2200),
      solved_2300: sc(2300),
      solved_2400: sc(2400),
      solved_2500_plus: tierCounts[2500] || 0,
      current_streak: currentStreak,
      solved_this_week: solvedThisWeek,
      solved_this_month: solvedThisMonth,
      weighted_score: weightedScore,
      updated_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from(statsTable)
      .upsert(updateData, { onConflict: 'user_id' });

    // --- 2. Populate user_tier_stats (V3) ---
    const tierRows = Object.entries(tierIdCounts).map(([tierId, count]) => ({
      user_id: userId,
      difficulty_tier_id: parseInt(tierId, 10),
      solved_count: count,
      updated_at: new Date().toISOString(),
    }));

    if (tierRows.length > 0) {
      await supabaseAdmin
        .from(V2_TABLES.USER_TIER_STATS)
        .upsert(tierRows, { onConflict: 'user_id,difficulty_tier_id' });
    }

    // --- 3. Update user_platform_stats (V3) ---
    // Fetch per-platform handle data for rating info
    const { data: handles } = await supabaseAdmin
      .from(V2_TABLES.USER_HANDLES)
      .select(
        'platform_id, current_rating, max_rating, rank_title, platforms!inner(code)'
      )
      .eq('user_id', userId);

    if (handles && handles.length > 0) {
      const parseNonNegativeNumber = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return parsed;
      };

      const parseProblemsPayload = (value) => {
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
      };

      const hasAttemptInProblemEntry = (problem) => {
        if (!problem || typeof problem !== 'object') return false;

        if (problem.attempted === true) return true;
        if (problem.solved === true || problem.solvedDuringContest === true) {
          return true;
        }

        if (problem.time !== null && problem.time !== undefined) return true;

        if (
          Array.isArray(problem.submissions) &&
          problem.submissions.length > 0
        ) {
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
      };

      const hasAttemptInProblemsPayload = (value) => {
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
      };

      const isActiveContestParticipation = (contest) => {
        if (!contest || contest.is_virtual === true) return false;

        const attempted = parseNonNegativeNumber(contest.problems_attempted);
        if (attempted > 0) return true;

        const solved = parseNonNegativeNumber(contest.problems_solved);
        if (solved > 0) return true;

        const score = parseNonNegativeNumber(contest.score);
        if (score > 0) return true;

        return hasAttemptInProblemsPayload(contest.problems_data);
      };

      // Count active contests per platform (submission attempt during contest time)
      const { data: contests } = await supabaseAdmin
        .from(V2_TABLES.CONTEST_HISTORY)
        .select(
          'platform_id, is_virtual, problems_attempted, problems_solved, score, problems_data'
        )
        .eq('user_id', userId);

      const contestsByPlatform = {};
      (contests || []).forEach((contest) => {
        if (!isActiveContestParticipation(contest)) return;

        contestsByPlatform[contest.platform_id] =
          (contestsByPlatform[contest.platform_id] || 0) + 1;
      });

      // Count total submissions per platform.
      // Supabase/PostgREST returns paged results; fetch all pages to avoid
      // under-counting users with >1000 submissions.
      const subsByPlatform = {};
      const SUBMISSIONS_PAGE_SIZE = 1000;
      for (let offset = 0; ; offset += SUBMISSIONS_PAGE_SIZE) {
        const { data: subsPage, error: subsPageError } = await supabaseAdmin
          .from(V2_TABLES.SUBMISSIONS)
          .select('platform_id')
          .eq('user_id', userId)
          .range(offset, offset + SUBMISSIONS_PAGE_SIZE - 1);

        if (subsPageError) {
          console.warn(
            `[STATS] Failed to fetch submissions page at offset ${offset}:`,
            subsPageError.message
          );
          break;
        }

        if (!subsPage || subsPage.length === 0) {
          break;
        }

        subsPage.forEach((s) => {
          subsByPlatform[s.platform_id] =
            (subsByPlatform[s.platform_id] || 0) + 1;
        });

        if (subsPage.length < SUBMISSIONS_PAGE_SIZE) {
          break;
        }
      }

      const platformStatRows = handles.map((h) => ({
        user_id: userId,
        platform_id: h.platform_id,
        problems_solved: platformCounts[h.platforms?.code] || 0,
        current_rating: h.current_rating,
        max_rating: h.max_rating,
        rank_title: h.rank_title,
        contest_count: contestsByPlatform[h.platform_id] || 0,
        total_submissions: subsByPlatform[h.platform_id] || 0,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await supabaseAdmin
        .from(V2_TABLES.USER_PLATFORM_STATS)
        .upsert(platformStatRows, { onConflict: 'user_id,platform_id' });
    }
  }

  async calculateStreak(userId) {
    const { data: activities } = await supabaseAdmin
      .from('daily_activity')
      .select('activity_date, problems_solved')
      .eq('user_id', userId)
      .gt('problems_solved', 0)
      .order('activity_date', { ascending: false })
      .limit(365);

    if (!activities || activities.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Check if most recent activity is today or yesterday
    const mostRecent = activities[0].activity_date;
    if (mostRecent !== today && mostRecent !== yesterday) {
      return 0;
    }

    let streak = 1;
    let currentDate = new Date(mostRecent);

    for (let i = 1; i < activities.length; i++) {
      const expectedDate = new Date(currentDate - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (activities[i].activity_date === expectedDate) {
        streak++;
        currentDate = new Date(expectedDate);
      } else {
        break;
      }
    }

    return streak;
  }

  mapDifficultyTier(platform, rating) {
    if (!rating) return 'medium';

    switch (platform) {
      case 'codeforces':
      case 'vjudge': // VJudge uses Codeforces-style ratings for most problems
      case 'cfgym':
        if (rating < 1200) return 'easy';
        if (rating < 1600) return 'medium';
        if (rating < 2100) return 'hard';
        return 'expert';
      case 'atcoder':
        if (rating <= 100) return 'easy';
        if (rating <= 300) return 'medium';
        if (rating <= 500) return 'hard';
        return 'expert';
      case 'leetcode':
        // LeetCode uses 1-3 difficulty scale
        if (rating === 1) return 'easy';
        if (rating === 2) return 'medium';
        return 'hard';
      case 'codechef':
        // CodeChef uses star-based rating
        if (rating < 1000) return 'easy';
        if (rating < 1500) return 'medium';
        if (rating < 2000) return 'hard';
        return 'expert';
      case 'spoj':
      case 'lightoj':
      case 'uva':
        // These use problem-specific difficulty numbers, normalize them
        if (rating < 3) return 'easy';
        if (rating < 5) return 'medium';
        if (rating < 7) return 'hard';
        return 'expert';
      default:
        return 'medium';
    }
  }

  /**
   * Fetch all-time platform statistics for a user from external APIs
   * Returns solved counts, ratings, and other platform-specific stats
   */
  async getPlatformStats(userId) {
    // Check for V2 schema
    const useV2 = await isV2SchemaAvailable();
    let handles = [];

    if (useV2) {
      const { data: v2Handles } = await supabaseAdmin
        .from(V2_TABLES.USER_HANDLES)
        .select('*, cp_platforms(code)')
        .eq('user_id', userId)
        .eq('is_verified', true);

      handles =
        v2Handles?.map((h) => ({
          ...h,
          platform: h.cp_platforms?.code || '',
        })) || [];
    } else {
      const { data: legacyHandles } = await supabaseAdmin
        .from('user_handles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', true);
      handles = legacyHandles || [];
    }

    if (!handles || handles.length === 0) {
      return {};
    }

    const platformStats = {};

    // Helper function to get solved count from database as fallback
    const solvesTable = useV2 ? V2_TABLES.USER_SOLVES : 'problem_solves';
    const getDbSolvedCount = async (platform) => {
      const { count } = await supabaseAdmin
        .from(solvesTable)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('platform', platform);
      return count || 0;
    };

    for (const handle of handles) {
      try {
        let stats = null;

        switch (handle.platform) {
          case 'codeforces': {
            const cfInfo = await this.codeforces.getUserInfo(handle.handle);
            const cfRating = await this.codeforces
              .getRatingHistory(handle.handle)
              .catch(() => []);
            const cfSolved = await getDbSolvedCount('codeforces');
            stats = {
              solved: cfSolved,
              rating: cfInfo?.rating || 0,
              max_rating: cfInfo?.maxRating || 0,
              contests: cfRating?.length || 0,
            };
            break;
          }

          case 'atcoder': {
            const acStats = await this.atcoder.getUserStats(handle.handle);
            const acDbSolvedCount = await getDbSolvedCount('atcoder');
            // Get total participants from contest_history DB (populated by CLIST sync)
            const { data: acContests } = await supabaseAdmin
              .from('contest_history')
              .select('total_participants')
              .eq('user_id', userId)
              .eq('platform', 'atcoder')
              .not('total_participants', 'is', null);
            const dbTotalParticipants = acContests
              ? acContests.reduce(
                  (sum, c) => sum + (c.total_participants || 0),
                  0
                )
              : 0;
            stats = {
              solved: Math.max(acStats?.ac_count || 0, acDbSolvedCount),
              rating: acStats?.rating || 0,
              max_rating: acStats?.max_rating || 0,
              contests: acStats?.contests || 0,
              total_participants: Math.max(
                acStats?.total_participants || 0,
                dbTotalParticipants
              ),
            };
            break;
          }

          case 'leetcode': {
            const lcProfile = await this.leetcode.getUserProfile(handle.handle);
            const lcDbSolvedCount = await getDbSolvedCount('leetcode');
            stats = {
              solved: Math.max(lcProfile?.total_solved || 0, lcDbSolvedCount),
              easy: lcProfile?.easy || 0,
              medium: lcProfile?.medium || 0,
              hard: lcProfile?.hard || 0,
              ranking: lcProfile?.ranking || 0,
              contest_rating: lcProfile?.contest_rating || 0,
              contests: lcProfile?.contests_attended || 0,
              total_participants: lcProfile?.total_participants || 0,
              global_ranking: lcProfile?.global_ranking || 0,
              top_percentage: lcProfile?.top_percentage || 0,
            };
            break;
          }

          case 'toph': {
            const tophProfile = await this.toph.getUserProfile(handle.handle);
            stats = {
              solved: tophProfile?.totalSolved || 0,
              rating: tophProfile?.rating || 0,
            };
            break;
          }

          case 'cses': {
            const csesProfile = await this.cses.getUserProfile(handle.handle);
            stats = {
              solved: csesProfile?.totalSolved || 0,
            };
            break;
          }

          case 'codechef': {
            const ccProfile = await this.codechef.getUserProfile(handle.handle);
            stats = {
              solved: ccProfile?.totalSolved || 0,
              rating: ccProfile?.rating || 0,
              max_rating: ccProfile?.maxRating || ccProfile?.highestRating || 0,
              stars: ccProfile?.stars || 0,
            };
            break;
          }

          case 'topcoder': {
            const tcProfile = await this.topcoder.getUserProfile(handle.handle);
            stats = {
              solved: tcProfile?.competitions || 0,
              rating: tcProfile?.rating || 0,
            };
            break;
          }

          case 'hackerrank': {
            const hrProfile = await this.hackerrank.getUserProfile(
              handle.handle
            );
            // badges is an array, count it
            const badgeCount = Array.isArray(hrProfile?.badges)
              ? hrProfile.badges.length
              : hrProfile?.badges || 0;
            stats = {
              solved: hrProfile?.totalSolved || 0,
              badges: badgeCount,
            };
            break;
          }

          case 'kattis': {
            const kattisProfile = await this.kattis.getUserProfile(
              handle.handle
            );
            stats = {
              solved: kattisProfile?.totalSolved || 0,
              score: kattisProfile?.score || 0,
              rank: kattisProfile?.rank || 0,
            };
            break;
          }

          case 'lightoj': {
            const lojProfile = await this.lightoj.getUserProfile(handle.handle);
            stats = {
              solved: lojProfile?.totalSolved || 0,
            };
            break;
          }

          case 'uva': {
            const uvaProfile = await this.uva.getUserProfile(handle.handle);
            stats = {
              solved: uvaProfile?.totalSolved || 0,
              submissions: uvaProfile?.totalSubmissions || 0,
            };
            break;
          }

          case 'spoj': {
            const spojProfile = await this.spoj.getUserProfile(handle.handle);
            stats = {
              solved: spojProfile?.totalSolved || 0,
              rank: spojProfile?.rank || 0,
            };
            break;
          }

          case 'vjudge': {
            const vjProfile = await this.vjudge.getUserProfile(handle.handle);
            // Don't include acRecords as it's too large - just count OJs
            stats = {
              solved: vjProfile?.totalSolved || 0,
              oj_count: Array.isArray(vjProfile?.ojs)
                ? vjProfile.ojs.length
                : 0,
            };
            break;
          }

          case 'cfgym': {
            const cfGymSolved = await getDbSolvedCount('cfgym');
            stats = {
              solved: cfGymSolved,
            };
            break;
          }

          case 'csacademy': {
            const csaProfile = await this.csacademy.getUserProfile(
              handle.handle
            );
            stats = {
              solved: csaProfile?.totalSolved || 0,
              rating: csaProfile?.rating || 0,
            };
            break;
          }

          case 'eolymp': {
            const eolympProfile = await this.eolymp.getUserProfile(
              handle.handle
            );
            stats = {
              solved: eolympProfile?.totalSolved || 0,
              rating: eolympProfile?.rating || 0,
            };
            break;
          }

          case 'usaco': {
            const usacoProfile = await this.usaco.getUserProfile(handle.handle);
            stats = {
              solved: usacoProfile?.totalSolved || 0,
              division: usacoProfile?.division || null,
            };
            break;
          }
        }

        if (stats) {
          platformStats[handle.platform] = stats;
        }
      } catch (error) {
        console.error(
          `Error fetching ${handle.platform} stats for ${handle.handle}:`,
          error.message
        );
        // Fallback: get solved count from database
        const dbSolved = await getDbSolvedCount(handle.platform);
        platformStats[handle.platform] = {
          solved: dbSolved,
          error: error.message,
        };
      }
    }

    return platformStats;
  }
}

// ============================================
// CLIST SERVICE - Unified API for all platforms
// ============================================

/**
 * ClistService fetches competitive programming stats from clist.by API
 * This provides unified access to rating history, contest stats, and account info
 * across multiple platforms (Codeforces, AtCoder, LeetCode, CodeChef, etc.)
 *
 * API Docs: https://clist.by/api/v4/doc/
 * Rate limit: 10 requests per minute (standard)
 */
export class ClistService {
  constructor() {
    this.baseUrl = 'https://clist.by/api/v4';
    this.apiKey = process.env.CLIST_API_KEY;
    this.apiUsername = process.env.CLIST_API_USERNAME;

    // Map our platform IDs to clist resource IDs/hosts
    this.platformMap = {
      codeforces: 'codeforces.com',
      atcoder: 'atcoder.jp',
      leetcode: 'leetcode.com',
      codechef: 'codechef.com',
      topcoder: 'topcoder.com',
      hackerrank: 'hackerrank.com',
      hackerearth: 'hackerearth.com',
      csacademy: 'csacademy.com',
      toph: 'toph.co',
      eolymp: 'eolymp.com',
      dmoj: 'dmoj.ca',
      kattis: 'open.kattis.com',
      spoj: 'spoj.com',
      cses: 'cses.fi',
      cfgym: 'codeforces.com/gyms',
      // Group 1: Fix existing platform definitions
      lightoj: 'lightoj.com',
      uva: 'uva.onlinejudge.org',
      usaco: 'usaco.org',
      // Group 2: Major global platforms
      googlecodejam: 'codingcompetitions.withgoogle.com',
      facebookhackercup: 'facebook.com/hackercup',
      geeksforgeeks: 'geeksforgeeks.org',
      codingame: 'codingame.com',
      beecrowd: 'beecrowd.com.br',
      // Group 3: Regional/national platforms
      luogu: 'luogu.com.cn',
      nowcoder: 'ac.nowcoder.com',
      codedrills: 'codedrills.io',
      yandex: 'contest.yandex.ru',
      nerc: 'nerc.itmo.ru/archive',
      tlx: 'tlx.toki.id',
      yukicoder: 'yukicoder.me',
      acmp: 'acmp.ru',
      timus: 'acm.timus.ru',
      hsin: 'hsin.hr/coci',
      // Group 4: Classic/educational platforms
      ioi: 'ioinformatics.org',
      algotester: 'algotester.com',
      cphof: 'cphof.org',
      opencup: 'opencup.ru',
      robocontest: 'robocontest.uz',
      ucup: 'ucup.ac',
      acmu: 'acm.university',
    };
  }

  /**
   * Check if clist API credentials are configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiUsername);
  }

  /**
   * Get authorization header for clist API
   */
  getAuthHeader() {
    if (!this.isConfigured()) {
      return {};
    }
    // clist.by uses ApiKey authorization format: "ApiKey username:api_key"
    return {
      Authorization: `ApiKey ${this.apiUsername}:${this.apiKey}`,
    };
  }

  /**
   * Make authenticated request to clist API with rate limiting and retry logic
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {number} maxRetries - Maximum retry attempts for rate limit errors (default 3)
   */
  async fetchApi(endpoint, params = {}, maxRetries = 3) {
    if (!this.isConfigured()) {
      console.warn(
        'CLIST API not configured. Set CLIST_API_KEY and CLIST_API_USERNAME'
      );
      return null;
    }

    const now = Date.now();
    if (clistNetworkUnavailableUntil > now) {
      if (now - clistLastCooldownWarnAt > 15000) {
        const remainingMs = clistNetworkUnavailableUntil - now;
        console.warn(
          `[CLIST] Skipping ${endpoint} call due to recent network outage (${Math.ceil(
            remainingMs / 1000
          )}s cooldown remaining)`
        );
        clistLastCooldownWarnAt = now;
      }
      return null;
    }

    const cacheKey = `clist_${endpoint}_${JSON.stringify(params)}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Add format=json to params
    const allParams = { ...params, format: 'json' };
    const queryParams = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}/${endpoint}/?${queryParams}`;

    // Use the request queue to handle concurrent requests properly
    return await clistRateLimiter.enqueueRequest(async () => {
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const queueStatus = clistRateLimiter.getQueueStatus();
          const isAccountLookup = endpoint === 'account';
          const response = await fetchWithTimeout(
            url,
            {
              headers: {
                ...this.getAuthHeader(),
                Accept: 'application/json',
              },
            },
            isAccountLookup ? 10000 : 30000, // Account lookup should fail fast on network issues
            isAccountLookup ? 1 : 3, // Avoid long blocks for account discovery
            isAccountLookup ? 1000 : 2000 // 2s delay between network retries
          );

          if (response.ok) {
            const data = await response.json();
            await this.setCache(cacheKey, data, 1800); // Cache for 30 minutes
            return data;
          }

          // Handle specific error codes
          if (response.status === 401) {
            console.error('CLIST API: Invalid credentials');
            throw new Error('CLIST API: Invalid credentials');
          }

          if (response.status === 429) {
            console.warn(
              `CLIST API: Rate limit hit on attempt ${attempt}/${maxRetries}`
            );
            lastError = new Error('CLIST API: Rate limit exceeded');

            if (attempt < maxRetries) {
              // Exponential backoff: 30s, 60s, 120s
              const backoffDelay = 30000 * Math.pow(2, attempt - 1);
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue;
            }
          } else {
            const errorText = await response
              .text()
              .catch(() => 'No error body');
            console.error(
              `CLIST API error: ${response.status} ${response.statusText}`
            );
            console.error(`CLIST API error body: ${errorText}`);
            throw new Error(`CLIST API error: ${response.status}`);
          }
        } catch (error) {
          lastError = error;
          const message = String(error?.message || '');
          const isNetworkFailure =
            /\[NetworkError\]|network connection failed|enotfound|econnreset|econnrefused|etimedout|request timeout/i.test(
              message
            );

          if (isNetworkFailure) {
            clistNetworkUnavailableUntil =
              Date.now() + CLIST_NETWORK_COOLDOWN_MS;
            clistLastCooldownWarnAt = 0;
            console.warn(
              `[CLIST] Network outage detected; entering cooldown for ${Math.round(
                CLIST_NETWORK_COOLDOWN_MS / 1000
              )}s`
            );
          }

          if (error.message.includes('Rate limit') && attempt < maxRetries) {
            // Already handled above, continue to next attempt
            continue;
          }
          console.error(
            `CLIST API fetch error for ${endpoint}:`,
            error.message
          );
          console.error('CLIST API params:', params);

          // Don't retry on non-rate-limit errors
          if (!error.message.includes('Rate limit')) {
            return null;
          }
        }
      }

      console.error(
        `CLIST API: All ${maxRetries} attempts failed for ${endpoint}`
      );
      return null;
    }); // End of enqueueRequest callback
  }

  /**
   * Get clist resource host for a platform
   */
  getClistHost(platform) {
    return this.platformMap[platform] || null;
  }

  /**
   * Get ordered CLIST resource host candidates for a platform.
   * FBHC can appear under multiple resource slugs depending on CLIST ingestion.
   */
  getClistHosts(platform) {
    const primary = this.getClistHost(platform);
    if (!primary) return [];

    if (platform !== 'facebookhackercup') {
      return [primary];
    }

    return Array.from(
      new Set([
        primary,
        'facebook.com/codingcompetitions/hacker-cup',
        'facebook.com/codingcompetitions',
        'www.facebook.com/codingcompetitions/hacker-cup',
        'www.facebook.com/codingcompetitions',
      ])
    );
  }

  /**
   * Find account ID on clist for a given handle and platform
   * Returns the account object with id, handle, rating, etc.
   * Tries multiple search methods to handle variations
   */
  async findAccount(platform, handle, userId = null) {
    const isFbhc = platform === 'facebookhackercup';
    const accountLookupRetries = isFbhc ? 1 : 2;

    // If userId provided, check cache first
    if (userId) {
      try {
        const { supabaseAdmin } = await import('./supabase');
        const { getPlatformId } =
          await import('./problem-solving-v2-helpers.js');

        const platformId = await getPlatformId(platform);
        if (platformId) {
          const { data: userHandle } = await supabaseAdmin
            .from('user_handles')
            .select('clist_account_id')
            .eq('user_id', userId)
            .eq('platform_id', platformId)
            .eq('handle', handle)
            .single();

          if (userHandle?.clist_account_id) {
            // Fetch the account details using the cached ID
            const data = await this.fetchApi(
              'account',
              {
                id: userHandle.clist_account_id,
                limit: 1,
              },
              accountLookupRetries
            );
            if (data?.objects?.length > 0) {
              return data.objects[0];
            }
          }
        }
      } catch (error) {
        console.warn(
          `CLIST: Cache lookup failed for ${handle}:`,
          error.message
        );
      }
    }

    const hosts = this.getClistHosts(platform);
    if (hosts.length === 0) {
      console.warn(`CLIST: No host mapping for platform ${platform}`);
      return null;
    }
    for (const host of hosts) {
      // Method 1: Exact handle match
      let data = await this.fetchApi(
        'account',
        {
          resource: host,
          handle: handle,
          limit: 1,
        },
        accountLookupRetries
      );

      if (data?.objects?.length > 0) {
        await this.cacheAccountId(userId, platform, handle, data.objects[0].id);
        return data.objects[0];
      }

      // Method 2 removed: CLIST account API does not support handle__icontains.
      // Keep lookups deterministic to avoid false-positive account matches.
    }

    // Method 3 removed: broad unfiltered scans are expensive and may cause false matches.

    console.warn(
      `CLIST: No account found for ${handle} on ${platform} after all search methods`
    );
    return null;
  }

  /**
   * Cache CLIST account ID in user_handles table
   * @private
   */
  async cacheAccountId(userId, platform, handle, accountId) {
    if (!userId || !accountId) return;

    try {
      const { supabaseAdmin } = await import('./supabase');
      const { getPlatformId } = await import('./problem-solving-v2-helpers.js');

      const platformId = await getPlatformId(platform);
      if (!platformId) return;

      const { error } = await supabaseAdmin
        .from('user_handles')
        .update({ clist_account_id: accountId })
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .eq('handle', handle);

      if (error) {
        console.warn(
          `CLIST: Failed to cache account ID for ${handle}:`,
          error.message
        );
      } else {
      }
    } catch (error) {
      console.warn(`CLIST: Cache update failed for ${handle}:`, error.message);
    }
  }

  /**
   * Get account statistics from clist
   * Returns rating, n_contests, last_activity, etc.
   */
  async getAccountStats(platform, handle, userId = null) {
    const account = await this.findAccount(platform, handle, userId);
    if (!account) return null;

    return {
      id: account.id,
      handle: account.handle,
      name: account.name,
      rating: account.rating,
      n_contests: account.n_contests,
      resource: account.resource,
      resource_id: account.resource_id,
      last_activity: account.last_activity,
      created: account.created,
      url: account.url,
    };
  }

  /**
   * Get contest statistics (participation history) for a handle
   * This is the key method for getting rating history
   * Note: Statistics endpoint requires account_id, so we first fetch the account
   * @param {string} platform - Platform name
   * @param {string} handle - User handle
   * @param {number} limit - Max results (default: 10000 to fetch ALL contests)
   * @param {string} userId - Optional user ID for caching CLIST account ID
   */
  async getContestStatistics(platform, handle, limit = 10000, userId = null) {
    const hosts = this.getClistHosts(platform);
    if (hosts.length === 0) {
      console.warn(`CLIST: No host mapping for platform ${platform}`);
      return [];
    }

    const baseStatsParams = {
      order_by: '-date',
      with_problems: true,
      limit: limit,
    };

    // First, get the account to obtain account_id (required by statistics endpoint)
    const account = await this.findAccount(platform, handle, userId);
    if (!account?.id) {
      console.warn(
        `CLIST: Could not find account for ${handle} on ${platform}`
      );
      return [];
    }

    const data = await this.fetchApi('statistics', {
      account_id: account.id,
      ...baseStatsParams,
    });

    if (!data?.objects) {
      console.warn(
        `CLIST: No contest statistics found for ${handle} on ${platform}`
      );
      return [];
    }

    return data.objects.map((stat) => {
      const contestId = stat.contest_id?.toString();
      const contestName =
        stat.contest?.title ||
        stat.contest_title ||
        (contestId ? `Contest #${contestId}` : null);

      // Extract total problems from CLIST problems field or contest data
      let totalProblems = null;
      if (stat.problems && typeof stat.problems === 'object') {
        totalProblems = Object.keys(stat.problems).length;
      } else if (stat.addition?.problems) {
        totalProblems = Object.keys(stat.addition.problems).length;
      } else if (stat.contest?.n_problems) {
        totalProblems = stat.contest.n_problems;
      }

      // Extract problems data. CLIST may return it either at top-level `problems`
      // or under `addition.problems` depending on resource/contest.
      let problems = null;
      const rawProblems =
        stat.problems && typeof stat.problems === 'object'
          ? stat.problems
          : stat.addition?.problems &&
              typeof stat.addition.problems === 'object'
            ? stat.addition.problems
            : null;

      if (rawProblems && typeof rawProblems === 'object') {
        problems = Object.entries(rawProblems).map(([key, value]) => {
          const isSolved = value?.result?.includes('+') || false;
          return {
            label: key,
            solved: isSolved,
            // CLIST data is from contest standings, so if solved, it was during contest
            solvedDuringContest: isSolved,
            upsolve: false, // CLIST doesn't track upsolves
            attempted: value?.result ? true : false,
            result: value?.result,
            time: value?.time,
            url: value?.url,
            name: value?.name || value?.short,
          };
        });
      }

      // If we have totalProblems but problems array is smaller, add unattempted placeholders
      // This ensures all problem badges are shown (green for solved, gray for unattempted)
      if (totalProblems && problems && problems.length < totalProblems) {
        const existingLabels = new Set(problems.map((p) => p.label));
        // Generate labels for missing problems (A, B, C, ... or 1, 2, 3, ...)
        const isNumeric =
          problems.length > 0 && /^\d+$/.test(problems[0].label);
        for (let i = problems.length; i < totalProblems; i++) {
          let label;
          if (isNumeric) {
            label = (i + 1).toString();
          } else {
            // Generate letter labels: A, B, C, ... Z, A1, B1, ...
            label =
              String.fromCharCode(65 + (i % 26)) +
              (i >= 26 ? Math.floor(i / 26).toString() : '');
          }
          if (!existingLabels.has(label)) {
            problems.push({
              label,
              solved: false,
              solvedDuringContest: false,
              upsolve: false,
              attempted: false,
            });
          }
        }
        // Sort problems by label
        problems.sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { numeric: true })
        );
      }

      // Debug: Log problem extraction for non-CF platforms
      if (platform !== 'codeforces') {
      }

      // Extract platform-specific contest ID from URL
      const contestUrl = stat.contest?.url;
      let platformContestId = null;
      if (contestUrl && platform === 'codeforces') {
        const match = contestUrl.match(/\/contests?\/(\d+)/);
        if (match) {
          platformContestId = match[1];
        }
      } else if (contestUrl && platform === 'atcoder') {
        const match = contestUrl.match(/\/contests\/([^/]+)/);
        if (match) {
          platformContestId = match[1];
        }
      } else if (contestUrl && platform === 'codechef') {
        // CodeChef URLs are like: https://www.codechef.com/START142 or https://www.codechef.com/APRIL20
        const match = contestUrl.match(/codechef\.com\/([A-Z0-9]+)/i);
        if (match) {
          platformContestId = match[1].toUpperCase();
        }
      }

      // Calculate contest duration in minutes from start/end times
      let durationMinutes = null;
      if (stat.contest?.start && stat.contest?.end) {
        const startTime = new Date(stat.contest.start).getTime();
        const endTime = new Date(stat.contest.end).getTime();
        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
          durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
        }
      }

      // Extract penalty from addition field (common in ICPC-style contests)
      const penalty = stat.addition?.penalty || stat.penalty || null;

      // Calculate problems attempted from problems data
      let problemsAttempted = null;
      if (problems && problems.length > 0) {
        problemsAttempted = problems.filter((p) => p.attempted).length;
      }

      // Determine if this is a virtual participation
      const isVirtual =
        stat.addition?.is_virtual ||
        stat.is_virtual ||
        stat.addition?.participationType === 'VIRTUAL' ||
        false;

      // Extract division info if available
      const division =
        stat.addition?.division ||
        stat.contest?.title?.match(/Div\.\s*(\d+)/i)?.[0] ||
        null;

      return {
        contestId,
        contestName,
        contestUrl,
        platformContestId,
        date: stat.contest?.start || stat.date,
        endDate: stat.contest?.end,
        platform: platform,
        rank: stat.place,
        totalParticipants: stat.contest?.n_statistics,
        score: stat.score || stat.solving || null,
        solved: stat.solved,
        totalProblems,
        problems,
        problemsAttempted,
        durationMinutes,
        penalty,
        oldRating: stat.old_rating,
        newRating: stat.new_rating || stat.rating,
        ratingChange:
          stat.new_rating && stat.old_rating
            ? stat.new_rating - stat.old_rating
            : stat.rating_change,
        isRated: stat.new_rating != null || stat.rating != null,
        isVirtual,
        division,
        addition: stat.addition, // Contains extra platform-specific data
      };
    });
  }

  /**
   * Get rating history derived from contest statistics
   * Falls back to platform-specific APIs when CLIST fails
   */
  async getRatingHistory(platform, handle, userId = null) {
    let stats = await this.getContestStatistics(
      platform,
      handle,
      10000,
      userId
    );
    // If CLIST returns no stats, try platform-specific APIs as fallback
    if (stats.length === 0) {
      try {
        // Codeforces fallback
        if (platform === 'codeforces') {
          const cfService = new CodeforcesService();
          const ratingHistory = await cfService.getRatingHistory(handle);

          if (ratingHistory.length > 0) {
            return ratingHistory.map((entry) => ({
              platform: 'codeforces',
              date: entry.contest_date,
              rating: entry.new_rating,
              change: entry.rating_change,
              contestId: entry.contest_id,
              contestName: entry.contest_name,
              url: entry.contest_url,
              rank: entry.rank,
            }));
          }
        }

        // AtCoder fallback
        if (platform === 'atcoder') {
          const atService = new AtCoderService();
          const ratingHistory = await atService.getRatingHistory(handle);

          if (ratingHistory.length > 0) {
            return ratingHistory.map((entry) => ({
              platform: 'atcoder',
              date: entry.date,
              rating: entry.new_rating,
              change: entry.rating_change,
              contestId: entry.contest_id,
              contestName: entry.contest_name,
              url: `https://atcoder.jp/contests/${entry.contest_id}`,
              rank: entry.rank,
            }));
          }
        }

        // LeetCode fallback
        if (platform === 'leetcode') {
          const leetcodeService = new LeetCodeService();
          const contestData = await leetcodeService.getContestRanking(handle);

          if (contestData.contests && contestData.contests.length > 0) {
            // Transform LeetCode contest data to match expected format
            return contestData.contests
              .filter((c) => c.rating && c.rating > 0)
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .map((c, idx, arr) => {
                const prevRating = idx > 0 ? arr[idx - 1].rating : 0;
                return {
                  platform: 'leetcode',
                  date: c.startTime,
                  rating: Math.round(c.rating),
                  change: idx > 0 ? Math.round(c.rating - prevRating) : 0,
                  contestId: c.title?.replace(/\s+/g, '-').toLowerCase(),
                  contestName: c.title,
                  url: `https://leetcode.com/contest/${c.title?.replace(/\s+/g, '-').toLowerCase()}`,
                  rank: c.ranking,
                };
              });
          }
        }
      } catch (error) {
        console.error(
          `[getRatingHistory] ${platform} direct API fallback failed:`,
          error.message
        );
      }
    }

    // Filter to only rated contests (where we have a rating value)
    const ratedContests = stats.filter((s) => {
      const hasRating =
        s.newRating !== null && s.newRating !== undefined && s.newRating !== 0;
      const hasOldRating =
        s.oldRating !== null && s.oldRating !== undefined && s.oldRating !== 0;
      return hasRating || hasOldRating;
    });
    // Sort by date and map to frontend format
    return ratedContests
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((s) => ({
        platform,
        date: s.date,
        rating: s.newRating || s.oldRating,
        change: s.ratingChange || 0,
        contestId: s.contestId,
        contestName: s.contestName,
        url: s.contestUrl,
        rank: s.rank,
      }));
  }

  /**
   * Get contest history with full details
   * Falls back to platform-specific APIs when CLIST fails
   * @param {string} platform - Platform name
   * @param {string} handle - User handle
   * @param {number} limit - Max results (default: 10000 to fetch ALL contests)
   */
  async getContestHistory(platform, handle, limit = 10000, userId = null) {
    let stats = await this.getContestStatistics(
      platform,
      handle,
      limit,
      userId
    );
    // If CLIST returns no stats, try platform-specific APIs as fallback
    if (stats.length === 0) {
      try {
        // Codeforces fallback
        if (platform === 'codeforces') {
          const cfService = new CodeforcesService();
          const ratingHistory = await cfService.getRatingHistory(handle);

          if (ratingHistory.length > 0) {
            return ratingHistory.slice(0, limit).map((entry) => ({
              platform: 'codeforces',
              contestId: entry.contest_id,
              platformContestId: entry.contest_id,
              name: entry.contest_name,
              url: entry.contest_url,
              date: entry.contest_date,
              endDate: null,
              rank: entry.rank,
              totalParticipants: null,
              score: null,
              solved: null,
              totalProblems: null,
              problems: null,
              problemsAttempted: null,
              durationMinutes: null,
              penalty: null,
              ratingChange: entry.rating_change,
              newRating: entry.new_rating,
              oldRating: entry.old_rating,
              isRated: true,
              isVirtual: false,
              division: null,
              addition: null,
            }));
          }
        }

        // AtCoder fallback
        if (platform === 'atcoder') {
          const atService = new AtCoderService();
          const ratingHistory = await atService.getRatingHistory(handle);

          if (ratingHistory.length > 0) {
            return ratingHistory.slice(0, limit).map((entry) => ({
              platform: 'atcoder',
              contestId: entry.contest_id,
              platformContestId: entry.contest_id,
              name: entry.contest_name,
              url: `https://atcoder.jp/contests/${entry.contest_id}`,
              date: entry.date,
              endDate: null,
              rank: entry.rank,
              totalParticipants: null,
              score: null,
              solved: null,
              totalProblems: null,
              problems: null,
              problemsAttempted: null,
              durationMinutes: null,
              penalty: null,
              ratingChange: entry.rating_change,
              newRating: entry.new_rating,
              oldRating: entry.old_rating,
              isRated: entry.is_rated,
              isVirtual: false,
              division: null,
              addition: null,
            }));
          }
        }

        // LeetCode fallback
        if (platform === 'leetcode') {
          const leetcodeService = new LeetCodeService();
          const contestData = await leetcodeService.getContestRanking(handle);
          if (contestData.contests && contestData.contests.length > 0) {
            // Transform LeetCode contest data to match expected format
            return contestData.contests
              .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
              .slice(0, limit)
              .map((c, idx, arr) => {
                const sortedByDate = [...arr].sort(
                  (x, y) => new Date(x.startTime) - new Date(y.startTime)
                );
                const idxInSorted = sortedByDate.findIndex(
                  (x) => x.title === c.title
                );
                const prevRating =
                  idxInSorted > 0 ? sortedByDate[idxInSorted - 1].rating : 0;

                return {
                  platform: 'leetcode',
                  contestId: c.title?.replace(/\s+/g, '-').toLowerCase(),
                  platformContestId: c.title
                    ?.replace(/\s+/g, '-')
                    .toLowerCase(),
                  name: c.title,
                  url: `https://leetcode.com/contest/${c.title?.replace(/\s+/g, '-').toLowerCase()}`,
                  date: c.startTime,
                  endDate: null,
                  rank: c.ranking,
                  totalParticipants: contestData.totalParticipants || null,
                  score: c.problemsSolved,
                  solved: c.problemsSolved,
                  totalProblems: c.totalProblems || 4,
                  problems: null,
                  problemsAttempted: null,
                  durationMinutes: 90, // LeetCode contests are typically 90 minutes
                  penalty: null,
                  ratingChange:
                    idxInSorted > 0 ? Math.round(c.rating - prevRating) : 0,
                  newRating: Math.round(c.rating),
                  oldRating: idxInSorted > 0 ? Math.round(prevRating) : null,
                  isRated: true,
                  isVirtual: false,
                  division: null,
                  addition: null,
                };
              });
          }
        }
      } catch (error) {
        console.error(
          `[getContestHistory] ${platform} direct API fallback failed:`,
          error.message
        );
      }
    }

    return stats.map((s) => ({
      platform,
      contestId: s.contestId,
      platformContestId: s.platformContestId,
      name: s.contestName,
      url: s.contestUrl,
      date: s.date,
      endDate: s.endDate,
      rank: s.rank,
      totalParticipants: s.totalParticipants,
      score: s.score,
      solved: s.solved,
      totalProblems: s.totalProblems,
      problems: s.problems,
      problemsAttempted: s.problemsAttempted,
      durationMinutes: s.durationMinutes,
      penalty: s.penalty,
      ratingChange: s.ratingChange || 0,
      newRating: s.newRating,
      oldRating: s.oldRating,
      isRated: s.isRated,
      isVirtual: s.isVirtual,
      division: s.division,
      addition: s.addition, // Include addition for raw problem data
    }));
  }

  /**
   * Get all available stats for a handle across a platform
   * Combines account info + contest stats
   */
  async getFullStats(platform, handle) {
    const [accountStats, contestStats] = await Promise.all([
      this.getAccountStats(platform, handle),
      this.getContestStatistics(platform, handle, 20),
    ]);

    if (!accountStats && contestStats.length === 0) {
      return null;
    }

    const ratingHistory = contestStats
      .filter((s) => s.newRating !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((s) => ({
        date: s.date,
        rating: s.newRating,
        change: s.ratingChange,
      }));

    return {
      ...accountStats,
      contests: accountStats?.n_contests || contestStats.length,
      rating:
        accountStats?.rating ||
        ratingHistory[ratingHistory.length - 1]?.rating ||
        0,
      max_rating: Math.max(0, ...ratingHistory.map((r) => r.rating)),
      rating_history: ratingHistory,
      recent_contests: contestStats.slice(0, 10),
    };
  }

  /**
   * Fetch stats for multiple platforms at once
   * @param {Array} handles - Array of {platform, handle} objects
   */
  async getMultiPlatformStats(handles) {
    const results = {};

    // Process sequentially to respect rate limits
    for (const { platform, handle } of handles) {
      try {
        const stats = await this.getFullStats(platform, handle);
        if (stats) {
          results[platform] = stats;
        }
      } catch (error) {
        console.error(
          `Error fetching clist stats for ${platform}/${handle}:`,
          error.message
        );
      }
      // Small delay between requests to respect rate limits
      await new Promise((r) => setTimeout(r, 100));
    }

    return results;
  }

  /**
   * Get aggregated rating history across all platforms
   */
  async getAggregatedRatingHistory(handles) {
    const allHistory = [];

    for (const { platform, handle } of handles) {
      try {
        const history = await this.getRatingHistory(platform, handle);
        allHistory.push(...history);
      } catch (error) {
        console.error(
          `[getAggregatedRatingHistory] Error fetching rating history for ${platform}/${handle}:`,
          error.message
        );
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return allHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get aggregated contest history across all platforms
   * @param {Array} handles - Array of {platform, handle} objects
   * @param {number} limitPerPlatform - Max contests per platform (default: 10000 for ALL)
   * @param {boolean} enrichWithProblems - Whether to enrich with problem data
   */
  async getAggregatedContestHistory(
    handles,
    limitPerPlatform = 10000,
    enrichWithProblems = true
  ) {
    const allContests = [];

    for (const { platform, handle } of handles) {
      try {
        let contests = await this.getContestHistory(
          platform,
          handle,
          limitPerPlatform
        );
        allContests.push(...contests);
      } catch (error) {
        console.error(
          `[getAggregatedContestHistory] Error fetching contest history for ${platform}/${handle}:`,
          error.message
        );
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    // STEP 1: Enrich contests with real names AND platform contest IDs (must be done first)
    const nameEnrichedContests = await this.enrichContestNames(allContests);
    // STEP 2: Enrich with problem-level data from native platform APIs (now that we have platform contest IDs)
    let finalContests = nameEnrichedContests;
    if (enrichWithProblems) {
      // Group by platform for problem enrichment
      const contestsByPlatform = nameEnrichedContests.reduce((acc, contest) => {
        if (!acc[contest.platform]) acc[contest.platform] = [];
        acc[contest.platform].push(contest);
        return acc;
      }, {});

      const problemEnrichedContests = [];
      for (const [platform, platformContests] of Object.entries(
        contestsByPlatform
      )) {
        try {
          // Find the handle for this platform
          const handle = handles.find((h) => h.platform === platform)?.handle;
          if (!handle) {
            console.warn(
              `[getAggregatedContestHistory] No handle found for ${platform}`
            );
            problemEnrichedContests.push(...platformContests);
            continue;
          }
          const enriched = await this.enrichContestsWithProblemsForPlatform(
            platformContests,
            platform,
            handle
          );
          problemEnrichedContests.push(...enriched);
        } catch (error) {
          console.error(
            `[getAggregatedContestHistory] Error enriching ${platform} contests with problems:`,
            error.message
          );
          // Continue with non-enriched contests
          problemEnrichedContests.push(...platformContests);
        }
      }
      finalContests = problemEnrichedContests;
    }
    // Sort by date, most recent first
    return finalContests.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Enrich contests with problem-level data using native platform APIs
   * @param {Array} contests - Contest objects
   * @param {string} platform - Platform name
   * @param {string} handle - User handle
   * @returns {Array} - Enriched contests
   */
  async enrichContestsWithProblemsForPlatform(contests, platform, handle) {
    if (platform === 'codeforces') {
      const cfService = new CodeforcesService();
      return await cfService.enrichContestsWithProblems(contests, handle);
    } else if (platform === 'atcoder') {
      const acService = new AtCoderService();
      return await acService.enrichContestsWithProblems(contests, handle);
    } else if (platform === 'leetcode') {
      const lcService = new LeetCodeService();
      return await lcService.enrichContestsWithProblems(contests, handle);
    } else if (platform === 'codechef') {
      const ccService = new CodeChefService();
      return await ccService.enrichContestsWithProblems(contests, handle);
    }
    // Add more platforms as needed
    return contests; // Return unchanged for unsupported platforms
  }

  /**
   * Enrich contest data with actual contest names from CLIST contests API
   * @param {Array} contests - Array of contest objects with contestId
   * @returns {Array} - Enriched contests with real names where available
   */
  async enrichContestNames(contests) {
    if (!contests || contests.length === 0) return contests;
    // Group contests by platform to optimize API calls
    const contestsByPlatform = contests.reduce((acc, contest) => {
      if (!acc[contest.platform]) acc[contest.platform] = [];
      acc[contest.platform].push(contest);
      return acc;
    }, {});

    const enrichedContests = [];

    for (const [platform, platformContests] of Object.entries(
      contestsByPlatform
    )) {
      const host = this.getClistHost(platform);
      if (!host) {
        console.warn(
          `[enrichContestNames] No CLIST host for platform ${platform}`
        );
        enrichedContests.push(...platformContests);
        continue;
      }

      // Extract unique contest IDs for this platform
      const contestIds = [...new Set(platformContests.map((c) => c.contestId))];

      // Check cache for existing contest data
      const contestNameMap = {};
      const uncachedIds = [];
      for (const contestId of contestIds) {
        const cacheKey = `contest_data:${platform}:${contestId}`;
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) {
          contestNameMap[contestId] = cachedData;
        } else {
          uncachedIds.push(contestId);
        }
      }

      // Fetch missing contest names from API
      if (uncachedIds.length > 0) {
        try {
          const data = await this.fetchApi('contest', {
            resource: host,
            id__in: uncachedIds.join(','),
            limit: uncachedIds.length,
          });

          if (data?.objects) {
            // Cache the results and extract platform-specific contest IDs
            for (const contest of data.objects) {
              const contestId = contest.id.toString();
              const contestName = contest.event;
              const totalProblems = contest.n_problems;
              const totalParticipants = contest.n_statistics;
              const contestUrl = contest.href;
              // Extract platform-specific contest ID from URL
              // Example: https://codeforces.com/contests/2193 -> 2193
              let platformContestId = null;
              if (contestUrl && platform === 'codeforces') {
                const match = contestUrl.match(/\/contests?\/(\d+)/);
                if (match) {
                  platformContestId = match[1];
                }
              } else if (contestUrl && platform === 'atcoder') {
                // Example: https://atcoder.jp/contests/abc123
                const match = contestUrl.match(/\/contests\/([^/]+)/);
                if (match) {
                  platformContestId = match[1];
                }
              } else if (contestUrl && platform === 'codechef') {
                // Example: https://www.codechef.com/START142 -> START142
                const match = contestUrl.match(/codechef\.com\/([A-Z0-9]+)/i);
                if (match) {
                  platformContestId = match[1].toUpperCase();
                }
              }

              if (contestName && contestName.trim()) {
                contestNameMap[contestId] = {
                  name: contestName,
                  platformContestId,
                  totalProblems,
                  totalParticipants,
                  url: contestUrl,
                };
                // Cache for 7 days (contest data doesn't change)
                const cacheKey = `contest_data:${platform}:${contestId}`;
                await this.setCache(
                  cacheKey,
                  contestNameMap[contestId],
                  7 * 24 * 60 * 60
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `[enrichContestNames] Error fetching contest names for ${platform}:`,
            error.message
          );
        }

        // Rate limiting - delay after API call
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Apply enriched data to contests
      let addedParticipantsCount = 0;
      let noEnrichedDataCount = 0;
      const contestsMissingParticipants = [];

      platformContests.forEach((contest) => {
        const enrichedData = contestNameMap[contest.contestId];
        if (enrichedData) {
          if (enrichedData.name && enrichedData.name.trim()) {
            contest.name = enrichedData.name;
            if (contest.contestName !== undefined) {
              contest.contestName = enrichedData.name;
            }
          }
          // Add platform-specific contest ID for matching with submissions (prefer enriched, fallback to existing)
          if (enrichedData.platformContestId && !contest.platformContestId) {
            contest.platformContestId = enrichedData.platformContestId;
          }
          // Add total problems if not already set
          if (enrichedData.totalProblems && !contest.totalProblems) {
            contest.totalProblems = enrichedData.totalProblems;
          }
          // Add total participants if not already set
          if (enrichedData.totalParticipants && !contest.totalParticipants) {
            contest.totalParticipants = enrichedData.totalParticipants;
            addedParticipantsCount++;
          } else if (
            !enrichedData.totalParticipants &&
            !contest.totalParticipants
          ) {
            // Track contests missing participant counts for fallback fetch
            contestsMissingParticipants.push(contest);
          }
          // Add contest URL if not already set
          if (enrichedData.url && !contest.url) {
            contest.url = enrichedData.url;
          }
        } else {
          // No enriched data from CLIST, but contest might still have platformContestId from URL
          // Track for fallback if missing totalParticipants
          if (!contest.totalParticipants) {
            contestsMissingParticipants.push(contest);
          }
          noEnrichedDataCount++;
        }
      });

      // For Codeforces contests missing participant counts, try fetching from native CF API
      if (platform === 'codeforces' && contestsMissingParticipants.length > 0) {
        const cfService = new CodeforcesService();
        let cfFetchedCount = 0;

        // Get unique platform contest IDs that need participant counts
        const cfContestIds = contestsMissingParticipants
          .map((c) => c.platformContestId)
          .filter((id) => id); // Filter out nulls

        const missingPlatformIds = contestsMissingParticipants.filter(
          (c) => !c.platformContestId
        ).length;
        if (missingPlatformIds > 0) {
        }

        if (cfContestIds.length > 0) {
          try {
            const participantCounts =
              await cfService.getContestParticipantCounts(cfContestIds);

            // Apply the fetched counts to contests
            for (const contest of contestsMissingParticipants) {
              if (
                contest.platformContestId &&
                participantCounts[contest.platformContestId]
              ) {
                contest.totalParticipants =
                  participantCounts[contest.platformContestId];
                cfFetchedCount++;

                // Update the cache with the new participant count
                const cacheKey = `contest_data:${platform}:${contest.contestId}`;
                const cachedData = contestNameMap[contest.contestId];
                if (cachedData) {
                  cachedData.totalParticipants = contest.totalParticipants;
                  await this.setCache(cacheKey, cachedData, 7 * 24 * 60 * 60);
                }
              }
            }

            if (cfFetchedCount > 0) {
            }
          } catch (error) {
            console.error(
              `[enrichContestNames] Error fetching participant counts from CF API:`,
              error.message
            );
          }
        }

        // Update count of still-missing contests
        const stillMissingCount = contestsMissingParticipants.filter(
          (c) => !c.totalParticipants
        ).length;
        if (stillMissingCount > 0) {
        }
      } else if (contestsMissingParticipants.length > 0) {
      }

      // Log summary
      if (addedParticipantsCount > 0) {
      }
      if (noEnrichedDataCount > 0) {
      }

      enrichedContests.push(...platformContests);
    }

    const enrichedCount = enrichedContests.filter(
      (c) => c.name && !c.name.startsWith('Contest #')
    ).length;
    return enrichedContests;
  }

  // Cache helpers (reuse from other services)
  async getCache(key) {
    try {
      const { data } = await supabaseAdmin
        .from('api_cache')
        .select('cache_value')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();
      return data?.cache_value;
    } catch {
      return null;
    }
  }

  async setCache(key, value, ttlSeconds) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      await supabaseAdmin.from('api_cache').upsert({
        cache_key: key,
        cache_value: value,
        expires_at: expiresAt,
      });
    } catch (error) {
      console.error('Cache set error:', error.message);
    }
  }

  // ============================================
  // DATABASE PERSISTENCE METHODS
  // ============================================

  /**
   * Save rating history entries to the database
   * @param {string} userId - User UUID
   * @param {Array} ratingHistory - Array of rating history objects
   * @param {string} dataSource - Source of data: 'clist', 'native', or 'manual'
   */
  async saveRatingHistory(userId, ratingHistory, dataSource = 'clist') {
    if (!ratingHistory || ratingHistory.length === 0) {
      return { saved: 0, updated: 0 };
    }

    // Filter out entries missing required fields (rating is NOT NULL in database)
    const validEntries = ratingHistory.filter((entry) => {
      const newRating = entry.rating || entry.newRating;
      if (newRating === null || newRating === undefined) {
        return false;
      }
      return true;
    });
    if (validEntries.length === 0) {
      return { saved: 0, updated: 0 };
    }

    // Check for V2 schema
    const useV2 = await isV2SchemaAvailable();

    try {
      if (useV2) {
        // V2 schema: rating_history table uses platform_id and different column names
        // Columns: id, user_id, platform_id, contest_id (uuid FK), rating, rating_change, recorded_at
        const { getPlatformId } =
          await import('./problem-solving-v2-helpers.js');

        // Group entries by platform and get platform IDs
        const platformGroups = {};
        for (const entry of validEntries) {
          const platform = entry.platform;
          if (!platformGroups[platform]) {
            platformGroups[platform] = {
              platformId: await getPlatformId(platform),
              entries: [],
            };
          }
          platformGroups[platform].entries.push(entry);
        }

        let totalSaved = 0;
        let totalUpdated = 0;

        for (const platform of Object.keys(platformGroups)) {
          const { platformId, entries } = platformGroups[platform];

          if (!platformId) {
            console.warn(`[saveRatingHistory] Unknown platform: ${platform}`);
            continue;
          }

          const records = entries.map((entry) => ({
            user_id: userId,
            platform_id: platformId,
            // V2 schema expects contest_id as UUID FK or null; we store external ID info elsewhere
            // For now, we'll skip contest_id FK since it requires a separate lookup
            rating: entry.rating || entry.newRating,
            rating_change: entry.change || entry.ratingChange || null,
            recorded_at: entry.date,
          }));

          // Get existing records for this user/platform
          const { data: existing } = await supabaseAdmin
            .from('rating_history')
            .select('id, recorded_at')
            .eq('user_id', userId)
            .eq('platform_id', platformId);

          const existingDates = new Set(
            (existing || []).map((e) => new Date(e.recorded_at).toISOString())
          );

          const newRecords = records.filter(
            (r) => !existingDates.has(new Date(r.recorded_at).toISOString())
          );

          if (newRecords.length > 0) {
            const { data, error } = await supabaseAdmin
              .from('rating_history')
              .insert(newRecords)
              .select();

            if (error) {
              // If still getting duplicate key errors despite pre-check, log but don't crash
              if (
                error.message?.includes('duplicate key') ||
                error.code === '23505'
              ) {
                // Silently ignore duplicate key violations (race condition or timestamp precision issue)
              } else {
                console.error(
                  `[saveRatingHistory] Error for ${platform}:`,
                  error.message
                );
              }
            } else {
              totalSaved += data?.length || newRecords.length;
            }
          }

          totalUpdated += records.length - newRecords.length;
        }
        return { saved: totalSaved, updated: totalUpdated };
      } else {
        // Legacy schema
        const records = validEntries.map((entry) => ({
          user_id: userId,
          platform: entry.platform,
          contest_id: entry.contestId?.toString() || null,
          contest_name: entry.contestName || null,
          contest_url: entry.url || null,
          contest_date: entry.date,
          old_rating: entry.oldRating || null,
          new_rating: entry.rating || entry.newRating,
          rating_change: entry.change || entry.ratingChange || null,
          rank: entry.rank || null,
          data_source: dataSource,
          raw_data: entry,
          updated_at: new Date().toISOString(),
        }));

        // Get existing contest_ids for this user to track what's new vs updated
        const { data: existing } = await supabaseAdmin
          .from('rating_history')
          .select('platform, contest_id')
          .eq('user_id', userId);

        const existingKeys = new Set(
          (existing || []).map((e) => `${e.platform}:${e.contest_id}`)
        );

        const newCount = records.filter(
          (r) => !existingKeys.has(`${r.platform}:${r.contest_id}`)
        ).length;
        const updateCount = records.length - newCount;

        // Use upsert to insert new records AND update existing ones with fresh data
        const { data, error } = await supabaseAdmin
          .from('rating_history')
          .upsert(records, {
            onConflict: 'user_id,platform,contest_id',
            ignoreDuplicates: false,
          })
          .select('id');

        if (error) {
          console.error('Error saving rating history:', error.message);
          return { saved: 0, updated: 0, error: error.message };
        }
        return {
          saved: newCount,
          updated: updateCount,
          total: data?.length || records.length,
        };
      }
    } catch (error) {
      console.error('Error saving rating history:', error.message);
      return { saved: 0, updated: 0, error: error.message };
    }
  }

  /**
   * Save contest history entries to the database
   * Uses upsert to update existing records with new data (e.g., totalParticipants fetched later)
   * @param {string} userId - User UUID
   * @param {Array} contestHistory - Array of contest history objects
   * @param {string} dataSource - Source of data: 'clist', 'native', or 'manual'
   */
  async saveContestHistory(userId, contestHistory, dataSource = 'clist') {
    if (!contestHistory || contestHistory.length === 0) {
      return { saved: 0, updated: 0 };
    }

    // Filter out entries missing required fields (contest_id and contest_name are NOT NULL in database)
    const validEntries = contestHistory.filter((entry) => {
      const contestId = entry.contestId?.toString();
      const contestName = entry.name || entry.contestName;

      if (!contestId) {
        return false;
      }

      if (!contestName) {
        return false;
      }

      return true;
    });
    if (validEntries.length === 0) {
      return { saved: 0, updated: 0 };
    }

    // Check for V2 schema
    const useV2 = await isV2SchemaAvailable();

    try {
      if (useV2) {
        // V2 schema: contest_history table uses platform_id and external_contest_id
        // Columns: id, user_id, platform_id, external_contest_id, contest_name, contest_url,
        // contest_date, duration_minutes, rank, total_participants, problems_solved,
        // problems_attempted, score, old_rating, new_rating, rating_change, is_rated,
        // is_virtual, division, created_at
        const { getPlatformId } =
          await import('./problem-solving-v2-helpers.js');

        // Group entries by platform and get platform IDs
        const platformGroups = {};
        for (const entry of validEntries) {
          const platform = entry.platform;
          if (!platformGroups[platform]) {
            platformGroups[platform] = {
              platformId: await getPlatformId(platform),
              entries: [],
            };
          }
          platformGroups[platform].entries.push(entry);
        }

        let totalSaved = 0;
        let totalUpdated = 0;

        for (const platform of Object.keys(platformGroups)) {
          const { platformId, entries } = platformGroups[platform];

          if (!platformId) {
            console.warn(`[saveContestHistory] Unknown platform: ${platform}`);
            continue;
          }

          const records = entries.map((entry) => ({
            user_id: userId,
            platform_id: platformId,
            external_contest_id: entry.contestId?.toString(),
            contest_name: entry.name || entry.contestName,
            contest_url: entry.url || entry.contestUrl || null,
            contest_date: entry.date,
            contest_end_date: entry.endDate || null,
            duration_minutes: entry.durationMinutes || entry.duration || null,
            rank: entry.rank || null,
            total_participants: entry.totalParticipants || null,
            problems_solved: entry.solved || entry.problemsSolved || 0,
            problems_attempted: entry.problemsAttempted || null,
            total_problems: entry.totalProblems || null,
            problems_data: entry.problems || null, // jsonb column - no need to stringify
            score: entry.score || null,
            max_score: entry.maxScore || null,
            penalty: entry.penalty || null,
            platform_contest_id: entry.platformContestId || null,
            old_rating: entry.oldRating || null,
            new_rating: entry.newRating || null,
            rating_change: entry.ratingChange || null,
            is_rated: entry.isRated === true,
            is_virtual: entry.isVirtual || false,
            division: entry.division || null,
          }));

          // Get existing records for this user/platform
          const { data: existing } = await supabaseAdmin
            .from('contest_history')
            .select('id, external_contest_id')
            .eq('user_id', userId)
            .eq('platform_id', platformId);

          const existingIds = new Set(
            (existing || []).map((e) => e.external_contest_id)
          );

          const newRecords = records.filter(
            (r) => !existingIds.has(r.external_contest_id)
          );
          const updateRecords = records.filter((r) =>
            existingIds.has(r.external_contest_id)
          );

          // Insert new records
          if (newRecords.length > 0) {
            const { error } = await supabaseAdmin
              .from('contest_history')
              .insert(newRecords);

            if (error) {
              console.error(
                `[saveContestHistory] Insert error for ${platform}:`,
                error.message
              );
            } else {
              totalSaved += newRecords.length;
            }
          }

          // Update existing records with fresh data
          for (const record of updateRecords) {
            const { error } = await supabaseAdmin
              .from('contest_history')
              .update({
                contest_name: record.contest_name,
                contest_url: record.contest_url,
                contest_end_date: record.contest_end_date,
                duration_minutes: record.duration_minutes,
                rank: record.rank,
                total_participants: record.total_participants,
                problems_solved: record.problems_solved,
                problems_attempted: record.problems_attempted,
                total_problems: record.total_problems,
                problems_data: record.problems_data,
                score: record.score,
                max_score: record.max_score,
                penalty: record.penalty,
                platform_contest_id: record.platform_contest_id,
                old_rating: record.old_rating,
                new_rating: record.new_rating,
                rating_change: record.rating_change,
                is_rated: record.is_rated,
                is_virtual: record.is_virtual,
                division: record.division,
              })
              .eq('user_id', userId)
              .eq('platform_id', platformId)
              .eq('external_contest_id', record.external_contest_id);

            if (!error) {
              totalUpdated++;
            }
          }
        }
        return { saved: totalSaved, updated: totalUpdated };
      } else {
        // Legacy schema
        const records = validEntries.map((entry) => ({
          user_id: userId,
          platform: entry.platform,
          contest_id: entry.contestId?.toString(),
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
          is_rated: entry.isRated === true,
          is_virtual: entry.isVirtual || false,
          division: entry.division || null,
          data_source: dataSource,
          raw_data: entry,
          updated_at: new Date().toISOString(),
        }));

        // Get existing records for this user to track what's new vs updated
        const { data: existing } = await supabaseAdmin
          .from('contest_history')
          .select('platform, contest_id')
          .eq('user_id', userId);

        const existingKeys = new Set(
          (existing || []).map((e) => `${e.platform}:${e.contest_id}`)
        );

        const newCount = records.filter(
          (r) => !existingKeys.has(`${r.platform}:${r.contest_id}`)
        ).length;
        const updateCount = records.length - newCount;

        // Use upsert to insert new records AND update existing ones with fresh data
        const { data, error } = await supabaseAdmin
          .from('contest_history')
          .upsert(records, {
            onConflict: 'user_id,platform,contest_id',
            ignoreDuplicates: false,
          })
          .select('id');

        if (error) {
          console.error('Error saving contest history:', error.message);
          return { saved: 0, updated: 0, error: error.message };
        }
        return {
          saved: newCount,
          updated: updateCount,
          total: data?.length || records.length,
        };
      }
    } catch (error) {
      console.error('Error saving contest history:', error.message);
      return { saved: 0, updated: 0, error: error.message };
    }
  }

  /**
   * Update user handle with clist account info
   * @param {string} userId - User UUID
   * @param {string} platform - Platform ID
   * @param {object} accountInfo - Account info from clist
   */
  async updateHandleWithClistInfo(userId, platform, accountInfo) {
    if (!accountInfo) return false;

    try {
      const useV2 = await isV2SchemaAvailable();

      if (useV2) {
        const { getPlatformId } =
          await import('./problem-solving-v2-helpers.js');
        const platformId = await getPlatformId(platform);
        const { error } = await supabaseAdmin
          .from(V2_TABLES.USER_HANDLES)
          .update({
            clist_account_id: accountInfo.id,
            clist_resource_id: accountInfo.resource_id,
            profile_url: accountInfo.url,
            last_synced_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform_id', platformId);

        if (error) {
          console.error(
            'Error updating V2 handle with clist info:',
            error.message
          );
          return false;
        }
      } else {
        const { error } = await supabaseAdmin
          .from('user_handles')
          .update({
            clist_account_id: accountInfo.id,
            clist_resource_id: accountInfo.resource_id,
            profile_url: accountInfo.url,
            last_synced_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform', platform);

        if (error) {
          console.error(
            'Error updating handle with clist info:',
            error.message
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating handle with clist info:', error.message);
      return false;
    }
  }

  /**
   * Fetch and persist all data for a user's handles
   * @param {string} userId - User UUID
   * @param {Array} handles - Array of {platform, handle} objects
   */
  async syncAllDataForUser(userId, handles) {
    const results = {
      ratingHistory: { total: 0, saved: 0 },
      contestHistory: { total: 0, saved: 0 },
      handlesUpdated: 0,
      errors: [],
    };

    for (const { platform, handle } of handles) {
      try {
        // Get account info and update handle
        const accountInfo = await this.getAccountStats(platform, handle);
        if (accountInfo) {
          const updated = await this.updateHandleWithClistInfo(
            userId,
            platform,
            accountInfo
          );
          if (updated) results.handlesUpdated++;
        }

        // Fetch and save rating history
        const ratingHistory = await this.getRatingHistory(platform, handle);
        if (ratingHistory.length > 0) {
          results.ratingHistory.total += ratingHistory.length;
          const ratingResult = await this.saveRatingHistory(
            userId,
            ratingHistory
          );
          results.ratingHistory.saved += ratingResult.saved;
          if (ratingResult.error) results.errors.push(ratingResult.error);
        }

        // Fetch and save contest history
        const contestHistory = await this.getContestHistory(platform, handle);
        if (contestHistory.length > 0) {
          results.contestHistory.total += contestHistory.length;
          const contestResult = await this.saveContestHistory(
            userId,
            contestHistory
          );
          results.contestHistory.saved += contestResult.saved;
          if (contestResult.error) results.errors.push(contestResult.error);
        }

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 200));
      } catch (error) {
        console.error(`Error syncing ${platform}/${handle}:`, error.message);
        results.errors.push(`${platform}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get rating history from database for a user
   * @param {string} userId - User UUID
   * @param {string} platform - Optional platform filter
   */
  async getRatingHistoryFromDb(userId, platform = null) {
    try {
      let query = supabaseAdmin
        .from('rating_history')
        .select('*')
        .eq('user_id', userId)
        .order('contest_date', { ascending: true });

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching rating history from DB:', error.message);
        return [];
      }

      return data.map((row) => ({
        platform: row.platform,
        date: row.contest_date,
        rating: row.new_rating,
        oldRating: row.old_rating,
        change: row.rating_change,
        contestId: row.contest_id,
        contestName: row.contest_name,
        url: row.contest_url,
        rank: row.rank,
      }));
    } catch (error) {
      console.error('Error fetching rating history from DB:', error.message);
      return [];
    }
  }

  /**
   * Get contest history from database for a user
   * @param {string} userId - User UUID
   * @param {string} platform - Optional platform filter
   * @param {number} limit - Max number of results (default: 10000 to fetch ALL)
   */
  async getContestHistoryFromDb(userId, platform = null, limit = 10000) {
    try {
      let query = supabaseAdmin
        .from('contest_history')
        .select('*')
        .eq('user_id', userId)
        .order('contest_date', { ascending: false });

      // Only apply limit if explicitly requested (for performance in specific cases)
      if (limit && limit < 10000) {
        query = query.limit(limit);
      }

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching contest history from DB:', error.message);
        return [];
      }

      return data.map((row) => ({
        platform: row.platform,
        contestId: row.contest_id,
        name: row.contest_name,
        url: row.contest_url,
        date: row.contest_date,
        rank: row.rank,
        totalParticipants: row.total_participants,
        score: row.score,
        solved: row.problems_solved,
        ratingChange: row.rating_change,
        newRating: row.new_rating,
        oldRating: row.old_rating,
        isRated: row.is_rated,
        isVirtual: row.is_virtual,
        division: row.division,
        // Extract enriched problem data from raw_data (includes upsolve flags)
        problems: row.raw_data?.problems || [],
        totalProblems: row.raw_data?.totalProblems,
        upsolves: row.raw_data?.upsolves,
      }));
    } catch (error) {
      console.error('Error fetching contest history from DB:', error.message);
      return [];
    }
  }

  /**
   * Get data with DB fallback - tries DB first, then fetches from API if empty
   * @param {string} userId - User UUID
   * @param {Array} handles - Array of {platform, handle} objects
   * @param {boolean} forceRefresh - Force fetch from API even if DB has data
   */
  async getDataWithDbFallback(userId, handles, forceRefresh = false) {
    // Try to get from database first (unless force refresh)
    if (!forceRefresh) {
      const [dbRatingHistory, dbContestHistory] = await Promise.all([
        this.getRatingHistoryFromDb(userId),
        this.getContestHistoryFromDb(userId),
      ]);

      // If we have data in DB, return it
      if (dbRatingHistory.length > 0 || dbContestHistory.length > 0) {
        return {
          ratingHistory: dbRatingHistory,
          contestHistory: dbContestHistory,
          source: 'database',
        };
      }
    }

    // Fetch from API
    const [ratingHistory, contestHistory] = await Promise.all([
      this.getAggregatedRatingHistory(handles),
      this.getAggregatedContestHistory(handles),
    ]);

    // Save to database in background (don't await)
    if (ratingHistory.length > 0 || contestHistory.length > 0) {
      this.saveRatingHistory(userId, ratingHistory).catch(console.error);
      this.saveContestHistory(userId, contestHistory).catch(console.error);
    }

    return {
      ratingHistory,
      contestHistory,
      source: 'api',
    };
  }

  /**
   * Update existing contest records with enriched contest names
   * @param {string} userId - User UUID (optional, if null updates all users)
   * @param {number} batchSize - Number of contests to update per batch (default: 100)
   * @returns {Promise<{updated: number, errors: number, remaining: number}>}
   */
  async updateContestNamesInDatabase(userId = null, batchSize = 100) {
    // Import getPlatformCode for converting platform_id to platform code
    const { getPlatformCode } = await import('./problem-solving-v2-helpers.js');

    try {
      // Get contests with generic names that need updating
      // Use correct column names: platform_id, external_contest_id
      let query = supabaseAdmin
        .from('contest_history')
        .select('id, user_id, platform_id, external_contest_id, contest_name')
        .like('contest_name', 'Contest #%');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: contestsToUpdate, error: queryError } =
        await query.limit(batchSize);

      if (queryError) {
        console.error(
          '[updateContestNamesInDatabase] Query error:',
          queryError.message
        );
        return { updated: 0, errors: 1, remaining: 0 };
      }

      if (!contestsToUpdate || contestsToUpdate.length === 0) {
        return { updated: 0, errors: 0, remaining: 0 };
      }
      // Group by platform_id for efficient API calls
      const contestsByPlatformId = contestsToUpdate.reduce((acc, contest) => {
        if (!acc[contest.platform_id]) acc[contest.platform_id] = [];
        acc[contest.platform_id].push(contest);
        return acc;
      }, {});

      let updated = 0;
      let errors = 0;

      for (const [platformId, contests] of Object.entries(
        contestsByPlatformId
      )) {
        // Convert platform_id to platform code
        const platformCode = await getPlatformCode(parseInt(platformId));
        if (!platformCode) {
          console.warn(
            `[updateContestNamesInDatabase] Unknown platform_id: ${platformId}`
          );
          continue;
        }

        const host = this.getClistHost(platformCode);
        if (!host) {
          console.warn(
            `[updateContestNamesInDatabase] No CLIST host for platform ${platformCode}`
          );
          continue;
        }

        // Extract contest IDs (external_contest_id contains CLIST contest ID)
        const contestIds = contests.map((c) => c.external_contest_id);

        try {
          const data = await this.fetchApi('contest', {
            resource: host,
            id__in: contestIds.join(','),
            limit: contestIds.length,
          });

          if (data?.objects) {
            // Create mapping of contest ID to name
            const nameMap = {};
            data.objects.forEach((contest) => {
              nameMap[contest.id.toString()] = contest.event;
            });

            // Update database records
            for (const contest of contests) {
              const realName = nameMap[contest.external_contest_id];
              if (
                realName &&
                realName.trim() &&
                realName !== contest.contest_name
              ) {
                try {
                  const { error } = await supabaseAdmin
                    .from('contest_history')
                    .update({ contest_name: realName })
                    .eq('id', contest.id);

                  if (error) {
                    console.error(
                      `[updateContestNamesInDatabase] Error updating contest ${contest.external_contest_id}:`,
                      error.message
                    );
                    errors++;
                  } else {
                    updated++;

                    // Cache the result
                    const cacheKey = `contest_name:${platformCode}:${contest.external_contest_id}`;
                    await this.setCache(cacheKey, realName, 7 * 24 * 60 * 60);
                  }
                } catch (error) {
                  console.error(
                    `[updateContestNamesInDatabase] Database error for contest ${contest.external_contest_id}:`,
                    error.message
                  );
                  errors++;
                }
              }
            }
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(
            `[updateContestNamesInDatabase] API error for platform ${platformCode}:`,
            error.message
          );
          errors += contests.length;
        }
      }

      // Check if there are more contests to update
      const { count: remainingCount } = await supabaseAdmin
        .from('contest_history')
        .select('id', { count: 'exact', head: true })
        .like('contest_name', 'Contest #%')
        .neq(
          'id',
          contestsToUpdate.map((c) => c.id)
        );
      return { updated, errors, remaining: remainingCount || 0 };
    } catch (error) {
      console.error(
        '[updateContestNamesInDatabase] General error:',
        error.message
      );
      return { updated: 0, errors: 1, remaining: 0 };
    }
  }
}

export default ProblemSolvingAggregator;
