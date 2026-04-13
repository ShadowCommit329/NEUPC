/**
 * @file AI-based Problem Tag Detection Service
 * @module problem-tag-service
 *
 * Uses AI to detect problem tags/topics when they're not available from the platform.
 * Supports Google Gemini and Pollinations (free GPT).
 */

import { supabaseAdmin } from './supabase.js';

// Common competitive programming tags
export const KNOWN_TAGS = [
  // Data Structures
  'arrays',
  'strings',
  'linked-list',
  'stack',
  'queue',
  'deque',
  'heap',
  'priority-queue',
  'hash-table',
  'hash-map',
  'set',
  'tree',
  'binary-tree',
  'binary-search-tree',
  'segment-tree',
  'fenwick-tree',
  'trie',
  'suffix-array',
  'suffix-tree',
  'disjoint-set',
  'union-find',
  'graph',
  'sparse-table',

  // Algorithms
  'sorting',
  'searching',
  'binary-search',
  'two-pointers',
  'sliding-window',
  'divide-and-conquer',
  'greedy',
  'dynamic-programming',
  'dp',
  'recursion',
  'backtracking',
  'bfs',
  'dfs',
  'shortest-path',
  'dijkstra',
  'bellman-ford',
  'floyd-warshall',
  'minimum-spanning-tree',
  'kruskal',
  'prim',
  'topological-sort',
  'strongly-connected-components',
  'bipartite',
  'matching',
  'flow',
  'max-flow',
  'min-cut',

  // Math & Number Theory
  'math',
  'number-theory',
  'prime',
  'sieve',
  'gcd',
  'lcm',
  'modular-arithmetic',
  'combinatorics',
  'probability',
  'geometry',
  'computational-geometry',
  'matrix',
  'matrix-exponentiation',
  'fft',
  'ntt',

  // Techniques
  'simulation',
  'implementation',
  'brute-force',
  'constructive',
  'interactive',
  'bitmask',
  'bit-manipulation',
  'meet-in-the-middle',
  'sqrt-decomposition',
  'mo-algorithm',
  'hashing',
  'string-hashing',
  'kmp',
  'z-algorithm',
  'aho-corasick',
  'manacher',

  // Problem Types
  'ad-hoc',
  'game-theory',
  'minimax',
  'ternary-search',
  'coordinate-compression',
  'offline-queries',
  'persistent-data-structure',
  'centroid-decomposition',
  'heavy-light-decomposition',
  'euler-tour',
  'lca',
  '2-sat',
  'expression-parsing',
  'schedules',
];

// Normalized tag mapping (for consistent tag names)
const TAG_NORMALIZATION = {
  // DP variations
  'dynamic programming': 'dp',
  'dynamic-programming': 'dp',
  dynamicprogramming: 'dp',
  memoization: 'dp',

  // Graph variations
  graphs: 'graph',
  'graph theory': 'graph',

  // Tree variations
  trees: 'tree',
  'binary trees': 'binary-tree',

  // BFS/DFS
  'breadth-first search': 'bfs',
  'breadth first search': 'bfs',
  'depth-first search': 'dfs',
  'depth first search': 'dfs',

  // Two pointers
  'two pointers': 'two-pointers',
  twopointers: 'two-pointers',

  // Binary search
  'binary search': 'binary-search',
  binarysearch: 'binary-search',

  // Sliding window
  'sliding window': 'sliding-window',
  slidingwindow: 'sliding-window',

  // Hash
  hashing: 'hash-table',
  hashmap: 'hash-map',
  hashtable: 'hash-table',

  // Union Find
  dsu: 'union-find',
  'disjoint set': 'disjoint-set',
  'disjoint-set-union': 'union-find',

  // Others
  greedy: 'greedy',
  implementation: 'implementation',
  simulation: 'simulation',
  math: 'math',
  'number theory': 'number-theory',
  numbertheory: 'number-theory',
  combinatorics: 'combinatorics',
  geometry: 'geometry',
  strings: 'strings',
  string: 'strings',
  sorting: 'sorting',
  sort: 'sorting',
  recursion: 'recursion',
  backtracking: 'backtracking',
  'brute force': 'brute-force',
  bruteforce: 'brute-force',
  'bit manipulation': 'bit-manipulation',
  bitmanipulation: 'bit-manipulation',
  bitmask: 'bitmask',
  bitmasks: 'bitmask',
};

// ============================================
// AI TAG DETECTION
// ============================================

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';
const POLLINATIONS_BASE = 'https://text.pollinations.ai';

const TAG_DETECTION_SYSTEM_PROMPT = `You are an expert competitive programming problem classifier. Given a problem description, identify the most relevant algorithm/data structure tags.

RULES:
1. Return ONLY a JSON array of tag strings, nothing else
2. Use lowercase tags with hyphens for multi-word tags (e.g., "binary-search", "dynamic-programming")
3. Return between 1-5 most relevant tags
4. Be specific - prefer "binary-search" over just "searching"
5. Common tags include: dp, greedy, binary-search, two-pointers, sliding-window, bfs, dfs, graph, tree, math, number-theory, strings, sorting, implementation, simulation, brute-force, backtracking, bit-manipulation, geometry, combinatorics, segment-tree, union-find, hash-table, stack, queue, heap

Example outputs:
["dp", "greedy"]
["binary-search", "two-pointers"]
["graph", "bfs", "shortest-path"]

Return ONLY the JSON array, no explanation.`;

/**
 * Detect tags using AI from problem description
 * @param {string} problemName - Problem name/title
 * @param {string} problemDescription - Problem description/statement
 * @param {string} platform - Platform name for context
 * @returns {Promise<string[]>} Array of detected tags
 */
async function detectTagsWithAI(problemName, problemDescription, platform) {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `Problem: ${problemName || 'Unknown'}
Platform: ${platform || 'Unknown'}
Description: ${problemDescription || 'No description available'}

Identify the algorithm/data structure tags for this problem.`;

  try {
    let response;

    if (apiKey) {
      // Use Gemini
      response = await detectWithGemini(prompt, apiKey);
    } else {
      // Fallback to Pollinations (free)
      response = await detectWithPollinations(prompt);
    }

    // Parse JSON response
    const tags = parseTagsFromResponse(response);
    return normalizeTags(tags);
  } catch (error) {
    console.error('AI tag detection error:', error.message);
    return [];
  }
}

async function detectWithGemini(prompt, apiKey) {
  const url = `${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: `${TAG_DETECTION_SYSTEM_PROMPT}\n\n${prompt}` }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 100,
      temperature: 0.3, // Low temperature for consistent results
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      `Gemini API error: ${res.status} - ${JSON.stringify(errData)}`
    );
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  );
}

async function detectWithPollinations(prompt) {
  const systemEncoded = encodeURIComponent(TAG_DETECTION_SYSTEM_PROMPT);
  const promptEncoded = encodeURIComponent(prompt);
  const url = `${POLLINATIONS_BASE}/${promptEncoded}?model=openai-fast&system=${systemEncoded}`;

  const res = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations API error: ${res.status}`);
  }

  return (await res.text()) || '';
}

function parseTagsFromResponse(response) {
  if (!response) return [];

  // Try to extract JSON array from response
  const jsonMatch = response.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => typeof t === 'string');
      }
    } catch {
      // Fall through to manual parsing
    }
  }

  // Manual parsing: extract comma-separated values
  const cleaned = response
    .replace(/[\[\]"']/g, '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length < 50);

  return cleaned;
}

/**
 * Normalize tags to consistent format
 * @param {string[]} tags - Raw tags
 * @returns {string[]} Normalized tags
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  const normalized = new Set();

  for (let tag of tags) {
    if (typeof tag !== 'string') continue;

    // Lowercase and trim
    tag = tag.toLowerCase().trim();

    // Apply normalization mapping
    if (TAG_NORMALIZATION[tag]) {
      tag = TAG_NORMALIZATION[tag];
    }

    // Convert spaces to hyphens
    tag = tag.replace(/\s+/g, '-');

    // Remove special characters except hyphens
    tag = tag.replace(/[^a-z0-9-]/g, '');

    // Skip empty or very short tags
    if (tag.length >= 2) {
      normalized.add(tag);
    }
  }

  return Array.from(normalized).slice(0, 10); // Max 10 tags
}

// ============================================
// FETCH TAGS FROM PLATFORMS
// ============================================

/**
 * Fetch problem tags from Codeforces API
 * @param {string} problemId - Problem ID (e.g., "1234A")
 * @returns {Promise<string[]>} Tags array
 */
export async function fetchCodeforcesProbleTags(problemId) {
  try {
    // Extract contest ID and problem index
    const match = problemId.match(/^(\d+)([A-Za-z]\d*)$/);
    if (!match) return [];

    const contestId = match[1];
    const problemIndex = match[2].toUpperCase();

    const response = await fetch(
      `https://codeforces.com/api/problemset.problems?tags=`
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== 'OK') return [];

    // Find the problem
    const problem = data.result.problems.find(
      (p) => p.contestId.toString() === contestId && p.index === problemIndex
    );

    return problem?.tags || [];
  } catch (error) {
    console.error('Error fetching Codeforces tags:', error.message);
    return [];
  }
}

/**
 * Fetch problem tags from LeetCode GraphQL API
 * @param {string} titleSlug - Problem slug (e.g., "two-sum")
 * @returns {Promise<string[]>} Tags array
 */
export async function fetchLeetCodeProblemTags(titleSlug) {
  try {
    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          topicTags {
            name
            slug
          }
        }
      }
    `;

    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { titleSlug },
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const tags = data?.data?.question?.topicTags || [];

    return tags.map((t) => t.slug || t.name.toLowerCase().replace(/\s+/g, '-'));
  } catch (error) {
    console.error('Error fetching LeetCode tags:', error.message);
    return [];
  }
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class ProblemTagService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Get tags for a problem, fetching from platform or using AI if needed
   * @param {object} problem - Problem object with platform, problem_id, problem_name, problem_url
   * @param {boolean} useAI - Whether to use AI for tag detection if not found
   * @returns {Promise<string[]>} Tags array
   */
  async getTagsForProblem(problem, useAI = true) {
    const cacheKey = `${problem.platform}-${problem.problem_id}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.tags;
    }

    let tags = [];

    // Try platform-specific tag fetching
    switch (problem.platform) {
      case 'codeforces':
      case 'cfgym':
        tags = await fetchCodeforcesProbleTags(problem.problem_id);
        break;

      case 'leetcode':
        tags = await fetchLeetCodeProblemTags(problem.problem_id);
        break;

      // VJudge already provides tags in submission data
      // Other platforms don't have easy tag APIs
    }

    // If no tags found and AI is enabled, try AI detection
    if (tags.length === 0 && useAI) {
      // Fetch problem description if we have a URL
      const description = await this.fetchProblemDescription(
        problem.problem_url,
        problem.platform
      );

      tags = await detectTagsWithAI(
        problem.problem_name,
        description,
        problem.platform
      );
    }

    // Normalize and cache
    tags = normalizeTags(tags);
    this.cache.set(cacheKey, { tags, timestamp: Date.now() });

    return tags;
  }

  /**
   * Fetch problem description from URL (basic scraping)
   * @param {string} url - Problem URL
   * @param {string} platform - Platform name
   * @returns {Promise<string>} Problem description
   */
  async fetchProblemDescription(url, platform) {
    if (!url) return '';

    try {
      // For now, return empty - full scraping would require more complex handling
      // The AI can still work with just the problem name
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Update tags for existing problems in database
   * @param {string} userId - User ID
   * @param {number} limit - Max problems to process
   * @returns {Promise<{updated: number, errors: number}>}
   */
  async updateMissingTags(userId, limit = 50) {
    // Get problems without tags
    const { data: problems } = await supabaseAdmin
      .from('problem_solves')
      .select('*')
      .eq('user_id', userId)
      .or('tags.is.null,tags.eq.{}')
      .limit(limit);

    if (!problems || problems.length === 0) {
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    for (const problem of problems) {
      try {
        const tags = await this.getTagsForProblem(problem, true);

        if (tags.length > 0) {
          await supabaseAdmin
            .from('problem_solves')
            .update({ tags })
            .eq('id', problem.id);

          updated++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error updating tags for ${problem.problem_id}:`, error);
        errors++;
      }
    }

    return { updated, errors };
  }

  /**
   * Get aggregated tag statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} Tag statistics { tagName: count, ... }
   */
  async getTagStatistics(userId) {
    const cacheKey = `tag_stats_${userId}`;
    const cached = await this.getDatabaseCache(cacheKey);
    if (cached) return cached;

    // Get all tags from solved problems
    const { data: solves } = await supabaseAdmin
      .from('problem_solves')
      .select('tags')
      .eq('user_id', userId);

    // Get tags from submissions (for AC submissions)
    const { data: submissions } = await supabaseAdmin
      .from('problem_submissions')
      .select('tags')
      .eq('user_id', userId)
      .eq('verdict', 'AC');

    const tagCounts = {};

    // Count from solves
    for (const solve of solves || []) {
      for (const tag of solve.tags || []) {
        const normalizedTag = tag.toLowerCase().trim();
        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
      }
    }

    // Count from submissions (may have duplicates, but provides more coverage)
    const seenProblems = new Set();
    for (const sub of submissions || []) {
      for (const tag of sub.tags || []) {
        const normalizedTag = tag.toLowerCase().trim();
        if (
          !seenProblems.has(
            `${sub.platform}-${sub.problem_id}-${normalizedTag}`
          )
        ) {
          tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
          seenProblems.add(
            `${sub.platform}-${sub.problem_id}-${normalizedTag}`
          );
        }
      }
    }

    // Sort by count and take top tags
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .reduce((obj, [tag, count]) => {
        obj[tag] = count;
        return obj;
      }, {});

    await this.setDatabaseCache(cacheKey, sortedTags, 3600);
    return sortedTags;
  }

  async getDatabaseCache(key) {
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

  async setDatabaseCache(key, value, ttlSeconds) {
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

export default ProblemTagService;
