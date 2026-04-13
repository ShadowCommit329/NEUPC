/**
 * Codeforces Data Scraper
 *
 * Scrapes historical competitive programming data from Codeforces API:
 * - Submission history (AC + attempts)
 * - Contest history (ratings, ranks, problems solved per contest)
 * - User profile data (avatar, rating, rank)
 * - Daily activity, tag stats, tier stats, streak tracking
 */

import { supabaseAdmin } from './supabase';
import {
  V2_TABLES,
  isV2SchemaAvailable,
  getPlatformId,
  upsertProblemV2,
  recordUserSolveV2,
  upsertUserHandleV2,
  getTierIdForRating,
  updateUserDailyActivity,
  recalcUserStreaks,
  updateUserTagStats,
  getTagIdsForProblem,
} from './problem-solving-v2-helpers.js';

const CODEFORCES_API_BASE = 'https://codeforces.com/api';
const REQUEST_DELAY_MS = 1000;
const MAX_RETRIES = 3;

class CodeforcesError extends Error {
  constructor(message, status = 'FAILED', comment = '') {
    super(message);
    this.name = 'CodeforcesError';
    this.status = status;
    this.comment = comment;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function makeCodeforcesRequest(endpoint, retries = 0) {
  try {
    console.log(`[CF-SCRAPER] Requesting: ${endpoint}`);
    await delay(REQUEST_DELAY_MS);

    const response = await fetch(`${CODEFORCES_API_BASE}${endpoint}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new CodeforcesError(
        `Codeforces API error: ${data.comment || 'Unknown error'}`,
        data.status,
        data.comment
      );
    }

    return data.result;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.warn(
        `[CF-SCRAPER] Request failed, retrying... (${retries + 1}/${MAX_RETRIES})`
      );
      await delay(REQUEST_DELAY_MS * (retries + 1));
      return makeCodeforcesRequest(endpoint, retries + 1);
    }
    throw error;
  }
}

function buildCfProblemUrl(contestId, index) {
  if (contestId == null)
    return `https://codeforces.com/problemset/problem//${index}`;
  const isGym = contestId >= 100000;
  return `https://codeforces.com/${isGym ? 'gym' : 'contest'}/${contestId}/problem/${index}`;
}

function buildCfContestUrl(contestId) {
  if (contestId == null) return null;
  const isGym = contestId >= 100000;
  return `https://codeforces.com/${isGym ? 'gym' : 'contest'}/${contestId}`;
}

/**
 * Parse Codeforces contest type/name to extract division string.
 * e.g. "Codeforces Round 900 (Div. 2)" → "Div. 2"
 */
function parseDivision(contestName = '') {
  const m = contestName.match(/Div\.\s*[1-4]/i);
  return m ? m[0] : null;
}

export class CodeforcesScraper {
  constructor(userId) {
    this.userId = userId;
    this.handle = null;
  }

  /**
   * Verify handle, update user_handles and user_platform_stats with CF profile data.
   */
  async setHandle(handle) {
    this.handle = handle;

    try {
      const userInfo = await makeCodeforcesRequest(
        `/user.info?handles=${handle}`
      );
      const user = userInfo[0];

      const useV2 = await isV2SchemaAvailable();

      if (useV2) {
        await upsertUserHandleV2(this.userId, 'codeforces', handle, {
          current_rating: user.rating || null,
          max_rating: user.maxRating || null,
          rank_title: user.rank || null,
          avatar_url: user.titlePhoto || user.avatar || null,
          is_verified: true,
          verified_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        });

        const platformId = await getPlatformId('codeforces');
        if (platformId) {
          await supabaseAdmin.from(V2_TABLES.USER_PLATFORM_STATS).upsert(
            {
              user_id: this.userId,
              platform_id: platformId,
              current_rating: user.rating || null,
              max_rating: user.maxRating || null,
              rank_title: user.rank || null,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform_id' }
          );

          // Initialize user_goals if not exists
          await supabaseAdmin
            .from(V2_TABLES.USER_GOALS)
            .upsert(
              { user_id: this.userId },
              { onConflict: 'user_id', ignoreDuplicates: true }
            );
        }
      } else {
        const { data: existingHandle } = await supabaseAdmin
          .from('user_handles')
          .select('id')
          .eq('user_id', this.userId)
          .eq('platform', 'codeforces')
          .single();

        if (existingHandle) {
          await supabaseAdmin
            .from('user_handles')
            .update({
              handle,
              rating: user.rating || null,
              max_rating: user.maxRating || null,
              is_verified: true,
              verified_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHandle.id);
        } else {
          await supabaseAdmin.from('user_handles').insert({
            user_id: this.userId,
            platform: 'codeforces',
            handle,
            rating: user.rating || null,
            max_rating: user.maxRating || null,
            is_verified: true,
            verified_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          });
        }
      }

      console.log(
        `[CF-SCRAPER] Verified handle: ${handle} (rating: ${user.rating}, rank: ${user.rank})`
      );
      return user;
    } catch (error) {
      throw new CodeforcesError(
        `Failed to verify handle: ${handle}. ${error.message}`
      );
    }
  }

  /**
   * Scrape all submissions. Returns AC groupings and attempt counts.
   * Also populates daily activity for each solve date.
   */
  async scrapeSubmissions() {
    if (!this.handle)
      throw new Error('Handle must be set before scraping submissions');

    console.log(`[CF-SCRAPER] Scraping submissions for ${this.handle}...`);

    const allSubmissions = await makeCodeforcesRequest(
      `/user.status?handle=${this.handle}&from=1`
    );

    const acceptedSubmissions = allSubmissions.filter(
      (s) => s.verdict === 'OK'
    );

    console.log(
      `[CF-SCRAPER] ${acceptedSubmissions.length} accepted / ${allSubmissions.length} total submissions`
    );

    // Count total attempts per problem
    const attemptCounts = new Map();
    for (const sub of allSubmissions) {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      attemptCounts.set(key, (attemptCounts.get(key) || 0) + 1);
    }

    // Group AC by problem — keep earliest solve
    const problemSolves = new Map();
    for (const sub of acceptedSubmissions) {
      const { problem } = sub;
      const key = `${problem.contestId}-${problem.index}`;
      if (
        !problemSolves.has(key) ||
        sub.creationTimeSeconds < problemSolves.get(key).sub.creationTimeSeconds
      ) {
        problemSolves.set(key, {
          sub,
          problem,
          solveTime: new Date(sub.creationTimeSeconds * 1000),
          attemptCount: attemptCounts.get(key) || 1,
        });
      }
    }

    console.log(
      `[CF-SCRAPER] Processing ${problemSolves.size} unique solved problems...`
    );

    // Daily solve count map for bulk daily-activity update: dateStr → count
    const dailySolveCounts = new Map();

    let processed = 0;
    for (const [, { sub, problem, solveTime, attemptCount }] of problemSolves) {
      await this.processProblemSolve(problem, sub, solveTime, attemptCount);
      processed++;

      const dateStr = solveTime.toISOString().slice(0, 10);
      dailySolveCounts.set(dateStr, (dailySolveCounts.get(dateStr) || 0) + 1);

      if (processed % 10 === 0) {
        console.log(
          `[CF-SCRAPER] Processed ${processed}/${problemSolves.size} problems...`
        );
      }
    }

    // Bulk-update daily activity
    const useV2 = await isV2SchemaAvailable();
    if (useV2) {
      const platformId = await getPlatformId('codeforces');
      for (const [dateStr, count] of dailySolveCounts) {
        await updateUserDailyActivity(
          this.userId,
          platformId,
          { problemsSolved: count, submissionsCount: count },
          dateStr
        );
      }
      await recalcUserStreaks(this.userId);
    }

    await this.updateUserStatistics(problemSolves.size, allSubmissions.length);

    console.log(`[CF-SCRAPER] Done. Imported ${problemSolves.size} problems.`);

    return {
      totalSubmissions: allSubmissions.length,
      acceptedSubmissions: acceptedSubmissions.length,
      uniqueProblems: problemSolves.size,
      importedAt: new Date().toISOString(),
      // Expose AC map for contest history cross-reference
      _problemSolves: problemSolves,
    };
  }

  /**
   * Upsert a single problem solve into the database.
   */
  async processProblemSolve(problem, submission, solveTime, attemptCount = 1) {
    const problemId = `${problem.contestId}${problem.index}`;
    const contestId = problem.contestId?.toString();
    const problemUrl = buildCfProblemUrl(problem.contestId, problem.index);

    try {
      const useV2 = await isV2SchemaAvailable();

      if (useV2) {
        // Resolve difficulty tier before upsert
        const difficultyTierId = await getTierIdForRating(
          problem.rating || null
        );

        const dbProblem = await upsertProblemV2('codeforces', problemId, {
          name: problem.name,
          url: problemUrl,
          difficulty_rating: problem.rating || null,
          difficulty_tier_id: difficultyTierId,
          tags: problem.tags || [],
          contest_id: contestId,
          time_limit_ms: problem.timeLimit || null,
          memory_limit_kb: problem.memoryLimit
            ? problem.memoryLimit * 1024
            : null,
        });

        await recordUserSolveV2(this.userId, dbProblem.id, {
          first_solved_at: solveTime.toISOString(),
          solve_count: 1,
          attempt_count: attemptCount,
        });

        // Update tag stats for this problem's tags
        if (problem.tags && problem.tags.length > 0) {
          const tagIds = await getTagIdsForProblem(dbProblem.id);
          if (tagIds.length > 0) {
            await updateUserTagStats(this.userId, tagIds, {
              solved: 1,
              attempted: 1,
              difficultyRating: problem.rating || null,
            });
          }
        }

        console.log(
          `[CF-SCRAPER] Imported (V2): ${problem.name} (${problemId})`
        );
      } else {
        let dbProblem = null;
        const { data: existing } = await supabaseAdmin
          .from('problems')
          .select('*')
          .eq('platform', 'codeforces')
          .eq('problem_id', problemId)
          .single();

        if (existing) {
          dbProblem = existing;
        } else {
          const { data: newP, error: pe } = await supabaseAdmin
            .from('problems')
            .insert({
              platform: 'codeforces',
              problem_id: problemId,
              contest_id: contestId,
              problem_name: problem.name,
              problem_url: problemUrl,
              difficulty_rating: problem.rating || null,
              tags: problem.tags || [],
            })
            .select()
            .single();
          if (pe) {
            console.error(
              `[CF-SCRAPER] Problem insert error ${problemId}:`,
              pe
            );
            return;
          }
          dbProblem = newP;
        }

        const { data: existingSolve } = await supabaseAdmin
          .from('user_problem_solves')
          .select('id')
          .eq('user_id', this.userId)
          .eq('problem_id', dbProblem.id)
          .single();

        if (!existingSolve) {
          await supabaseAdmin.from('user_problem_solves').insert({
            user_id: this.userId,
            problem_id: dbProblem.id,
            first_solved_at: solveTime.toISOString(),
            solve_count: 1,
          });
          console.log(`[CF-SCRAPER] Imported: ${problem.name} (${problemId})`);
        }
      }
    } catch (error) {
      console.error(`[CF-SCRAPER] Error processing ${problemId}:`, error);
    }
  }

  /**
   * Scrape contest history: ratings, ranks, per-contest details.
   * Uses contest.list for metadata. Counts problems_solved from AC submissions.
   * @param {Map} [problemSolvesMap] - optional map from scrapeSubmissions for cross-ref
   */
  async scrapeContestHistory(problemSolvesMap = null) {
    if (!this.handle)
      throw new Error('Handle must be set before scraping contest history');

    console.log(`[CF-SCRAPER] Scraping contest history for ${this.handle}...`);

    let ratingHistory;
    try {
      ratingHistory = await makeCodeforcesRequest(
        `/user.rating?handle=${this.handle}`
      );
    } catch (error) {
      if (
        error instanceof CodeforcesError &&
        error.comment?.includes('not participated')
      ) {
        console.log(`[CF-SCRAPER] No contest history for ${this.handle}`);
        return { contestsImported: 0, importedAt: new Date().toISOString() };
      }
      throw error;
    }

    if (ratingHistory.length === 0) {
      return { contestsImported: 0, importedAt: new Date().toISOString() };
    }

    // Fetch contest list for metadata (single call, all contests)
    let contestListMap = new Map();
    try {
      const contestList = await makeCodeforcesRequest(
        '/contest.list?gym=false'
      );
      for (const c of contestList) {
        contestListMap.set(c.id, c);
      }
    } catch (err) {
      console.warn(
        '[CF-SCRAPER] contest.list fetch failed, proceeding without metadata:',
        err.message
      );
    }

    // Build per-contest AC problem count from problemSolvesMap
    const contestAcCounts = new Map(); // contestId(int) → count of AC problems
    if (problemSolvesMap) {
      for (const [, { problem }] of problemSolvesMap) {
        if (problem.contestId != null) {
          contestAcCounts.set(
            problem.contestId,
            (contestAcCounts.get(problem.contestId) || 0) + 1
          );
        }
      }
    }

    console.log(
      `[CF-SCRAPER] Processing ${ratingHistory.length} rated contests...`
    );

    for (const contest of ratingHistory) {
      const meta = contestListMap.get(contest.contestId);
      const problemsSolved = contestAcCounts.get(contest.contestId) || null;

      // Fetch standings for additional contest details
      let standingsData = null;
      try {
        standingsData = await makeCodeforcesRequest(
          `/contest.standings?contestId=${contest.contestId}&handles=${this.handle}`
        );
      } catch (err) {
        console.warn(
          `[CF-SCRAPER] contest.standings fetch failed for contest ${contest.contestId}:`,
          err.message
        );
      }

      await this.processContestParticipation(
        contest,
        meta,
        problemsSolved,
        standingsData
      );
    }

    // Update user_platform_stats.contests_participated
    const useV2 = await isV2SchemaAvailable();
    if (useV2) {
      const platformId = await getPlatformId('codeforces');
      if (platformId) {
        await supabaseAdmin.from(V2_TABLES.USER_PLATFORM_STATS).upsert(
          {
            user_id: this.userId,
            platform_id: platformId,
            contests_participated: ratingHistory.length,
            contest_count: ratingHistory.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform_id' }
        );
      }
    }

    console.log(`[CF-SCRAPER] Imported ${ratingHistory.length} contests.`);

    return {
      contestsImported: ratingHistory.length,
      importedAt: new Date().toISOString(),
    };
  }

  /**
   * Upsert one contest into contest_history and rating_history.
   * @param {Object} contest - From user.rating API
   * @param {Object|null} meta - From contest.list API (may be null)
   * @param {number|null} problemsSolved - AC count for this contest
   * @param {Object|null} standingsData - From contest.standings API (may be null)
   */
  async processContestParticipation(
    contest,
    meta = null,
    problemsSolved = null,
    standingsData = null
  ) {
    try {
      const useV2 = await isV2SchemaAvailable();

      if (useV2) {
        const platformId = await getPlatformId('codeforces');
        if (!platformId) {
          console.warn('[CF-SCRAPER] codeforces platform_id not found');
          return;
        }

        const contestDate = new Date(
          contest.ratingUpdateTimeSeconds * 1000
        ).toISOString();
        const ratingChange = contest.newRating - contest.oldRating;
        const durationMinutes = meta?.durationSeconds
          ? Math.round(meta.durationSeconds / 60)
          : null;
        const division = parseDivision(contest.contestName);

        // Extract standings data if available
        let userStandingsRow = null;
        let totalParticipants = null;
        if (standingsData?.result) {
          const { rows, contest: contestInfo } = standingsData.result;
          if (contestInfo) {
            totalParticipants = contestInfo.participantsCount;
          }
          if (rows && rows.length > 0) {
            userStandingsRow = rows.find((r) =>
              r.party?.members?.some((m) => m.handle === this.handle)
            );
          }
        }

        // Extract user-specific standings info
        const problemsAttempted = userStandingsRow?.problems
          ? userStandingsRow.problems.filter(
              (p) => p.result?.type && p.result.type !== 'FINAL'
            ).length
          : null;
        const score = userStandingsRow?.points || null;
        const isVirtual = contest.participantType === 'VIRTUAL' || false;

        const { data: contestRecord, error: contestError } = await supabaseAdmin
          .from(V2_TABLES.CONTEST_HISTORY)
          .upsert(
            {
              user_id: this.userId,
              platform_id: platformId,
              external_contest_id: contest.contestId.toString(),
              contest_name: contest.contestName,
              contest_url: buildCfContestUrl(contest.contestId),
              contest_date: contestDate,
              duration_minutes: durationMinutes,
              rank: contest.rank,
              total_participants: totalParticipants,
              problems_solved: problemsSolved,
              problems_attempted: problemsAttempted,
              score,
              old_rating: contest.oldRating,
              new_rating: contest.newRating,
              rating_change: ratingChange,
              is_rated: true,
              is_virtual: isVirtual,
              division,
            },
            { onConflict: 'user_id,platform_id,external_contest_id' }
          )
          .select('id')
          .single();

        if (contestError) {
          console.error(
            `[CF-SCRAPER] contest_history upsert error ${contest.contestId}:`,
            contestError
          );
          return;
        }

        await supabaseAdmin.from(V2_TABLES.RATING_HISTORY).upsert(
          {
            user_id: this.userId,
            platform_id: platformId,
            contest_id: contestRecord?.id || null,
            rating: contest.newRating,
            rating_change: ratingChange,
            recorded_at: contestDate,
          },
          { onConflict: 'user_id,platform_id,recorded_at' }
        );
      } else {
        const { error } = await supabaseAdmin
          .from('contest_participations')
          .upsert(
            {
              user_id: this.userId,
              contest_id: contest.contestId.toString(),
              contest_name: contest.contestName,
              platform: 'codeforces',
              participated_at: new Date(
                contest.ratingUpdateTimeSeconds * 1000
              ).toISOString(),
              rank: contest.rank,
              rating_change: contest.newRating - contest.oldRating,
              new_rating: contest.newRating,
            },
            { onConflict: 'user_id,platform,contest_id' }
          );
        if (error) {
          console.error(
            `[CF-SCRAPER] Legacy contest upsert error ${contest.contestId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `[CF-SCRAPER] processContestParticipation error ${contest.contestId}:`,
        error
      );
    }
  }

  /**
   * Update user_stats, user_platform_stats, and user_tier_stats after import.
   */
  async updateUserStatistics(totalSolved, totalSubmissions = 0) {
    try {
      const useV2 = await isV2SchemaAvailable();

      if (useV2) {
        const { data: difficultyStats } = await supabaseAdmin
          .from(V2_TABLES.USER_SOLVES)
          .select('problems!inner(difficulty_rating, difficulty_tier_id)')
          .eq('user_id', this.userId);

        const diffCounts = this.calculateDifficultyCounts(
          difficultyStats || []
        );
        const weightedScore = this.calculateWeightedScore(diffCounts);

        await supabaseAdmin.from(V2_TABLES.USER_STATS).upsert(
          {
            user_id: this.userId,
            total_solved: totalSolved,
            total_solutions: 0,
            weighted_score: weightedScore,
            ...diffCounts,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        const platformId = await getPlatformId('codeforces');
        if (platformId) {
          await supabaseAdmin.from(V2_TABLES.USER_PLATFORM_STATS).upsert(
            {
              user_id: this.userId,
              platform_id: platformId,
              problems_solved: totalSolved,
              submissions_count: totalSubmissions,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,platform_id' }
          );
        }

        await this.updateUserTierStats(difficultyStats || []);

        console.log(
          `[CF-SCRAPER] Updated statistics: ${totalSolved} solved, ${totalSubmissions} submissions, weighted_score: ${weightedScore}`
        );
      } else {
        const { data: difficultyStats } = await supabaseAdmin
          .from('user_problem_solves')
          .select('problems!inner(difficulty_rating)')
          .eq('user_id', this.userId);

        const diffCounts = this.calculateDifficultyCounts(
          difficultyStats || []
        );

        await supabaseAdmin.from('user_problem_stats').upsert(
          {
            user_id: this.userId,
            total_solved: totalSolved,
            total_solutions: 0,
            ...diffCounts,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
    } catch (error) {
      console.error('[CF-SCRAPER] updateUserStatistics error:', error);
    }
  }

  async updateUserTierStats(difficultyStats) {
    try {
      // Group by difficulty_tier_id if already present; fall back to rating lookup
      const tierCounts = new Map();

      for (const stat of difficultyStats) {
        const tierId =
          stat.problems?.difficulty_tier_id ||
          (await getTierIdForRating(stat.problems?.difficulty_rating));
        if (tierId != null) {
          tierCounts.set(tierId, (tierCounts.get(tierId) || 0) + 1);
        }
      }

      if (tierCounts.size === 0) return;

      const rows = Array.from(tierCounts.entries()).map(([tierId, count]) => ({
        user_id: this.userId,
        difficulty_tier_id: tierId,
        solved_count: count,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin
        .from(V2_TABLES.USER_TIER_STATS)
        .upsert(rows, { onConflict: 'user_id,difficulty_tier_id' });

      if (error)
        console.error('[CF-SCRAPER] user_tier_stats upsert error:', error);
      else
        console.log(
          `[CF-SCRAPER] Updated user_tier_stats: ${rows.length} tiers`
        );
    } catch (error) {
      console.error('[CF-SCRAPER] updateUserTierStats error:', error);
    }
  }

  calculateDifficultyCounts(stats) {
    const d = {
      solved_800: 0,
      solved_900: 0,
      solved_1000: 0,
      solved_1100: 0,
      solved_1200: 0,
      solved_1300: 0,
      solved_1400: 0,
      solved_1500: 0,
      solved_1600: 0,
      solved_1700: 0,
      solved_1800: 0,
      solved_1900: 0,
      solved_2000: 0,
      solved_2100: 0,
      solved_2200: 0,
      solved_2300: 0,
      solved_2400: 0,
      solved_2500_plus: 0,
    };

    for (const stat of stats) {
      const r = stat.problems?.difficulty_rating;
      if (!r) continue;
      if (r >= 2500) d.solved_2500_plus++;
      else if (r >= 2400) d.solved_2400++;
      else if (r >= 2300) d.solved_2300++;
      else if (r >= 2200) d.solved_2200++;
      else if (r >= 2100) d.solved_2100++;
      else if (r >= 2000) d.solved_2000++;
      else if (r >= 1900) d.solved_1900++;
      else if (r >= 1800) d.solved_1800++;
      else if (r >= 1700) d.solved_1700++;
      else if (r >= 1600) d.solved_1600++;
      else if (r >= 1500) d.solved_1500++;
      else if (r >= 1400) d.solved_1400++;
      else if (r >= 1300) d.solved_1300++;
      else if (r >= 1200) d.solved_1200++;
      else if (r >= 1100) d.solved_1100++;
      else if (r >= 1000) d.solved_1000++;
      else if (r >= 900) d.solved_900++;
      else if (r >= 800) d.solved_800++;
    }

    return d;
  }

  /**
   * Calculate weighted score based on difficulty-bucketed solve counts.
   */
  calculateWeightedScore(diffCounts) {
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
      totalScore += (diffCounts[key] || 0) * weight;
    });

    return totalScore;
  }

  /**
   * Full import: submissions → contest history.
   * Passes problemSolves map to contest history for AC-per-contest counts.
   */
  async importAllData() {
    if (!this.handle)
      throw new Error('Handle must be set before importing data');

    console.log(`[CF-SCRAPER] Starting full import for ${this.handle}...`);

    const results = {
      handle: this.handle,
      userId: this.userId,
      startTime: new Date().toISOString(),
    };

    // Create sync job record
    let syncJobId = null;
    try {
      const platformId = await getPlatformId('codeforces');
      if (platformId) {
        const { data: syncJob, error: jobError } = await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .insert({
            user_id: this.userId,
            platform_id: platformId,
            job_type: 'full_import',
            status: 'pending',
            scheduled_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!jobError && syncJob) {
          syncJobId = syncJob.id;
        }
      }
    } catch (err) {
      console.warn('[CF-SCRAPER] Failed to create sync_job:', err.message);
    }

    try {
      // Update sync job to started
      if (syncJobId) {
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({ status: 'started', started_at: new Date().toISOString() })
          .eq('id', syncJobId);
      }

      const submissionResults = await this.scrapeSubmissions();
      results.submissions = submissionResults;

      // Update sync job with submission counts
      if (syncJobId && submissionResults) {
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            processed_items: submissionResults.totalSubmissions || 0,
            inserted_items: submissionResults.acceptedSubmissions || 0,
          })
          .eq('id', syncJobId);
      }

      // Pass the AC map so contest history can count problems_solved
      const contestResults = await this.scrapeContestHistory(
        submissionResults._problemSolves
      );
      results.contests = contestResults;

      results.endTime = new Date().toISOString();
      results.success = true;

      // Update sync job to completed
      if (syncJobId) {
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_items:
              (submissionResults?.totalSubmissions || 0) +
              (contestResults?.contestsImported || 0),
            processed_items: submissionResults?.acceptedSubmissions || 0,
            inserted_items:
              (submissionResults?.uniqueProblems || 0) +
              (contestResults?.contestsImported || 0),
          })
          .eq('id', syncJobId);
      }

      console.log(`[CF-SCRAPER] Full import completed:`, results);
      return results;
    } catch (error) {
      results.endTime = new Date().toISOString();
      results.success = false;
      results.error = error.message;

      // Update sync job to failed
      if (syncJobId) {
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message,
          })
          .eq('id', syncJobId);
      }

      console.error('[CF-SCRAPER] Full import failed:', error);
      throw error;
    }
  }
}

export async function scrapeUserData(userId, codeforcesHandle) {
  const scraper = new CodeforcesScraper(userId);
  await scraper.setHandle(codeforcesHandle);
  return await scraper.importAllData();
}
