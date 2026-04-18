/**
 * @file Problems API Route
 * @module api/problem-solving/problems
 * @access member
 *
 * Fetches all problems solved by the user with their solutions.
 * Supports filtering by platform, difficulty, tags, and search.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

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

function getDifficultyRange(difficulty) {
  if (!difficulty) return null;

  let minRating;
  let maxRating;

  switch (difficulty) {
    case 'newbie':
      minRating = 0;
      maxRating = 1199;
      break;
    case 'pupil':
      minRating = 1200;
      maxRating = 1399;
      break;
    case 'specialist':
      minRating = 1400;
      maxRating = 1599;
      break;
    case 'expert':
      minRating = 1600;
      maxRating = 1899;
      break;
    case 'candidate_master':
      minRating = 1900;
      maxRating = 2099;
      break;
    case 'master':
      minRating = 2100;
      maxRating = 2299;
      break;
    case 'international_master':
      minRating = 2300;
      maxRating = 2399;
      break;
    case 'grandmaster':
      minRating = 2400;
      maxRating = 2599;
      break;
    case 'international_grandmaster':
      minRating = 2600;
      maxRating = 2999;
      break;
    case 'legendary_grandmaster':
      minRating = 3000;
      maxRating = 9999;
      break;
    default: {
      const rating = parseInt(difficulty, 10);
      if (!isNaN(rating)) {
        minRating = rating;
        maxRating = rating;
      }
      break;
    }
  }

  if (minRating === undefined || maxRating === undefined) {
    return null;
  }

  return { min: minRating, max: maxRating };
}

function getProblemKey(platformId, externalProblemId) {
  if (!platformId || !externalProblemId) return null;
  return `${platformId}:${externalProblemId}`;
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = dbUser.id;
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const platform = searchParams.get('platform');
    const difficulty = searchParams.get('difficulty');
    const tag = searchParams.get('tag');
    const solvedDate = searchParams.get('solvedDate');
    const search = searchParams.get('search');
    const hasCode = searchParams.get('hasCode');
    const problemStatusParam = (
      searchParams.get('problemStatus') || 'solved'
    ).toLowerCase();
    const problemStatus =
      problemStatusParam === 'unsolved' ? 'unsolved' : 'solved';
    const favorite = searchParams.get('favorite');
    const sortBy = searchParams.get('sortBy') || 'date_desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const wantsHasCodeTrue = hasCode === 'true';
    const wantsHasCodeFalse = hasCode === 'false';

    const loadFilterMetadata = async () => {
      const [platformsResult, allTagsResult] = await Promise.all([
        supabaseAdmin
          .from(V2_TABLES.PLATFORMS)
          .select('code, name')
          .eq('is_active', true)
          .order('display_order'),
        supabaseAdmin
          .from(V2_TABLES.TAGS)
          .select('code, name, category')
          .order('display_order'),
      ]);

      return {
        platforms: platformsResult.data || [],
        tags: allTagsResult.data || [],
      };
    };

    if (problemStatus === 'unsolved') {
      if (wantsHasCodeFalse) {
        const metadata = await loadFilterMetadata();
        return NextResponse.json({
          success: true,
          problems: [],
          metadata: {
            total: 0,
            limit,
            offset,
            ...metadata,
          },
        });
      }

      let taggedProblemIds = null;

      if (tag) {
        const normalizedTag = tag.trim().toLowerCase();
        const slugifiedTag = normalizedTag
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        let tagRow = null;
        let tagError = null;

        const tagCodeCandidates = [...new Set([normalizedTag, slugifiedTag])]
          .map((value) => value.trim())
          .filter(Boolean);

        for (const candidateCode of tagCodeCandidates) {
          const { data, error } = await supabaseAdmin
            .from(V2_TABLES.TAGS)
            .select('id')
            .eq('code', candidateCode)
            .maybeSingle();

          if (error) {
            tagError = error;
            break;
          }

          if (data?.id) {
            tagRow = data;
            break;
          }
        }

        if (!tagRow && !tagError) {
          const { data, error } = await supabaseAdmin
            .from(V2_TABLES.TAGS)
            .select('id')
            .ilike('name', tag)
            .limit(1);

          if (error) {
            tagError = error;
          } else {
            tagRow = data?.[0] || null;
          }
        }

        if (tagError) {
          console.warn('Error resolving tag filter:', tagError.message);
        }

        if (!tagRow?.id) {
          const metadata = await loadFilterMetadata();
          return NextResponse.json({
            success: true,
            problems: [],
            metadata: {
              total: 0,
              limit,
              offset,
              ...metadata,
            },
          });
        }

        const { data: taggedProblems, error: taggedError } = await supabaseAdmin
          .from(V2_TABLES.PROBLEM_TAGS)
          .select('problem_id')
          .eq('tag_id', tagRow.id);

        if (taggedError) {
          console.warn('Error loading tagged problems:', taggedError.message);
        }

        taggedProblemIds = (taggedProblems || []).map((r) => r.problem_id);

        if (taggedProblemIds.length === 0) {
          const metadata = await loadFilterMetadata();
          return NextResponse.json({
            success: true,
            problems: [],
            metadata: {
              total: 0,
              limit,
              offset,
              ...metadata,
            },
          });
        }
      }

      const unsolvedSelect = `
        *,
        platforms!inner(code, name),
        problems(
          *,
          difficulty_tiers(code, name)
        )
      `;

      let unsolvedQuery = supabaseAdmin
        .from(V2_TABLES.UNSOLVED_ATTEMPTS)
        .select(unsolvedSelect)
        .eq('user_id', userId);

      if (platform) {
        const platformId = await getPlatformId(platform);
        if (platformId) {
          unsolvedQuery = unsolvedQuery.eq('platform_id', platformId);
        }
      }

      if (taggedProblemIds) {
        unsolvedQuery = unsolvedQuery.in('problem_id', taggedProblemIds);
      }

      const difficultyRange = getDifficultyRange(difficulty);
      if (difficultyRange) {
        unsolvedQuery = unsolvedQuery
          .gte('problems.difficulty_rating', difficultyRange.min)
          .lte('problems.difficulty_rating', difficultyRange.max);
      }

      if (solvedDate) {
        const start = new Date(`${solvedDate}T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        if (!Number.isNaN(start.getTime())) {
          unsolvedQuery = unsolvedQuery
            .gte('submitted_at', start.toISOString())
            .lt('submitted_at', end.toISOString());
        }
      }

      if (search) {
        unsolvedQuery = unsolvedQuery.or(
          `problem_name.ilike.%${search}%,external_problem_id.ilike.%${search}%`
        );
      }

      unsolvedQuery = unsolvedQuery.order('submitted_at', { ascending: false });

      const { data: unsolvedAttempts, error: unsolvedError } =
        await unsolvedQuery.range(0, 4999);

      if (unsolvedError) {
        if (isMissingUnsolvedAttemptsTableError(unsolvedError)) {
          console.warn(
            '[PROBLEMS] unsolved_attempts table not available; apply latest migrations to include unsolved problem filtering.'
          );

          const metadata = await loadFilterMetadata();
          return NextResponse.json({
            success: true,
            problems: [],
            metadata: {
              total: 0,
              limit,
              offset,
              ...metadata,
            },
            unsolvedAttemptStorageAvailable: false,
          });
        }

        console.error('Error fetching unsolved attempts:', unsolvedError);
        return NextResponse.json(
          { error: 'Failed to fetch unsolved problems' },
          { status: 500 }
        );
      }

      const { data: solvedRows, error: solvedRowsError } = await supabaseAdmin
        .from(V2_TABLES.USER_SOLVES)
        .select(
          `
          problem_id,
          solve_count,
          problems!inner(platform_id, external_id)
        `
        )
        .eq('user_id', userId)
        .gt('solve_count', 0);

      if (solvedRowsError) {
        console.warn(
          '[PROBLEMS] Failed to resolve solved problem keys for unsolved filter:',
          solvedRowsError.message
        );
      }

      const solvedProblemKeySet = new Set(
        (solvedRows || [])
          .map((row) => {
            const solvedProblem = Array.isArray(row.problems)
              ? row.problems[0] || null
              : row.problems || null;
            return getProblemKey(
              solvedProblem?.platform_id,
              solvedProblem?.external_id
            );
          })
          .filter(Boolean)
      );

      const latestAttemptByProblem = new Map();
      const unsolvedAttemptCountByProblem = new Map();

      (unsolvedAttempts || []).forEach((attempt) => {
        const linkedProblem = Array.isArray(attempt.problems)
          ? attempt.problems[0] || null
          : attempt.problems || null;

        const problemKey = getProblemKey(
          attempt.platform_id,
          attempt.external_problem_id || linkedProblem?.external_id
        );

        if (!problemKey) return;
        if (solvedProblemKeySet.has(problemKey)) return;

        unsolvedAttemptCountByProblem.set(
          problemKey,
          (unsolvedAttemptCountByProblem.get(problemKey) || 0) + 1
        );

        if (!latestAttemptByProblem.has(problemKey)) {
          latestAttemptByProblem.set(problemKey, attempt);
        }
      });

      let latestAttempts = Array.from(latestAttemptByProblem.entries()).map(
        ([problemKey, attempt]) => ({ problemKey, attempt })
      );

      if (favorite === 'true') {
        const { data: favorites, error: favoritesError } = await supabaseAdmin
          .from(V2_TABLES.USER_SOLVES)
          .select('problems!inner(platform_id, external_id)')
          .eq('user_id', userId)
          .eq('is_favorite', true);

        if (favoritesError) {
          console.warn(
            '[PROBLEMS] Failed to resolve favorites for unsolved filter:',
            favoritesError.message
          );
        } else {
          const favoriteKeySet = new Set(
            (favorites || [])
              .map((row) => {
                const favoriteProblem = Array.isArray(row.problems)
                  ? row.problems[0] || null
                  : row.problems || null;
                return getProblemKey(
                  favoriteProblem?.platform_id,
                  favoriteProblem?.external_id
                );
              })
              .filter(Boolean)
          );

          latestAttempts = latestAttempts.filter(({ problemKey }) =>
            favoriteKeySet.has(problemKey)
          );
        }
      }

      const unsolvedProblemIds = latestAttempts
        .map(({ attempt }) => attempt.problem_id)
        .filter(Boolean);

      const tagsResult =
        unsolvedProblemIds.length > 0
          ? await supabaseAdmin
              .from(V2_TABLES.PROBLEM_TAGS)
              .select(
                `
                problem_id,
                tags!inner(code, name, category)
              `
              )
              .in('problem_id', unsolvedProblemIds)
          : { data: [], error: null };

      if (tagsResult.error) {
        console.warn(
          'Error loading tags for unsolved problems:',
          tagsResult.error.message
        );
      }

      const tagsMap = {};
      (tagsResult.data || []).forEach((pt) => {
        if (!tagsMap[pt.problem_id]) {
          tagsMap[pt.problem_id] = [];
        }
        tagsMap[pt.problem_id].push({
          code: pt.tags.code,
          name: pt.tags.name,
          category: pt.tags.category,
        });
      });

      let unsolvedProblems = latestAttempts.map(({ problemKey, attempt }) => {
        const linkedProblem = Array.isArray(attempt.problems)
          ? attempt.problems[0] || null
          : attempt.problems || null;
        const platformInfo = Array.isArray(attempt.platforms)
          ? attempt.platforms[0] || null
          : attempt.platforms || null;
        const attemptRecord = { ...attempt };
        delete attemptRecord.problems;
        delete attemptRecord.platforms;

        const tagDetails = linkedProblem?.id
          ? tagsMap[linkedProblem.id] || []
          : [];

        return {
          id: attempt.id,
          user_id: userId,
          platform: platformInfo?.code,
          platform_name: platformInfo?.name,
          problem_id:
            attempt.external_problem_id || linkedProblem?.external_id || null,
          problem_name:
            linkedProblem?.name ||
            attempt.problem_name ||
            attempt.external_problem_id,
          problem_url: linkedProblem?.url || null,
          contest_id: linkedProblem?.contest_id || null,
          difficulty_rating: linkedProblem?.difficulty_rating || null,
          difficulty_tier: linkedProblem?.difficulty_tiers?.code || null,
          tags: tagDetails.map((t) => t.code),
          tag_details: tagDetails,
          problem_solutions: [],
          first_solved_at: null,
          solve_count: 0,
          attempt_count: unsolvedAttemptCountByProblem.get(problemKey) || 1,
          best_time_ms: attempt.execution_time_ms,
          best_memory_kb: attempt.memory_kb,
          is_favorite: false,
          personal_rating: null,
          notes: null,
          created_at: attempt.created_at,
          updated_at: attempt.updated_at,
          has_solution: false,
          solution_count: 0,
          problem_description: linkedProblem?.description || null,
          input_format: linkedProblem?.input_format || null,
          output_format: linkedProblem?.output_format || null,
          constraints: linkedProblem?.constraints || null,
          examples: linkedProblem?.examples || null,
          problem_notes: linkedProblem?.notes || null,
          tutorial_url: linkedProblem?.tutorial_url || null,
          tutorial_content: linkedProblem?.tutorial_content || null,
          tutorial_solutions: linkedProblem?.tutorial_solutions || null,
          time_limit_ms: linkedProblem?.time_limit_ms || null,
          memory_limit_kb: linkedProblem?.memory_limit_kb || null,
          latest_unsolved_submission_at: attempt.submitted_at,
          latest_unsolved_verdict: attempt.verdict,
          is_unsolved_problem: true,
          db_problem_fields: linkedProblem,
          db_platform_fields: platformInfo,
          db_difficulty_tier_fields: linkedProblem?.difficulty_tiers || null,
          db_user_solve_fields: null,
          db_latest_unsolved_attempt: attemptRecord,
          db_solution_records: [],
        };
      });

      switch (sortBy) {
        case 'date_asc':
          unsolvedProblems.sort(
            (a, b) =>
              new Date(a.latest_unsolved_submission_at || 0).getTime() -
              new Date(b.latest_unsolved_submission_at || 0).getTime()
          );
          break;
        case 'difficulty_asc':
          unsolvedProblems.sort((a, b) => {
            const aDifficulty =
              typeof a.difficulty_rating === 'number'
                ? a.difficulty_rating
                : Number.MAX_SAFE_INTEGER;
            const bDifficulty =
              typeof b.difficulty_rating === 'number'
                ? b.difficulty_rating
                : Number.MAX_SAFE_INTEGER;
            return aDifficulty - bDifficulty;
          });
          break;
        case 'difficulty_desc':
          unsolvedProblems.sort((a, b) => {
            const aDifficulty =
              typeof a.difficulty_rating === 'number'
                ? a.difficulty_rating
                : Number.MIN_SAFE_INTEGER;
            const bDifficulty =
              typeof b.difficulty_rating === 'number'
                ? b.difficulty_rating
                : Number.MIN_SAFE_INTEGER;
            return bDifficulty - aDifficulty;
          });
          break;
        case 'name_asc':
          unsolvedProblems.sort((a, b) =>
            String(a.problem_name || '').localeCompare(
              String(b.problem_name || '')
            )
          );
          break;
        case 'name_desc':
          unsolvedProblems.sort((a, b) =>
            String(b.problem_name || '').localeCompare(
              String(a.problem_name || '')
            )
          );
          break;
        case 'date_desc':
        default:
          unsolvedProblems.sort(
            (a, b) =>
              new Date(b.latest_unsolved_submission_at || 0).getTime() -
              new Date(a.latest_unsolved_submission_at || 0).getTime()
          );
          break;
      }

      const total = unsolvedProblems.length;
      const paginatedProblems = unsolvedProblems.slice(offset, offset + limit);
      const metadata = await loadFilterMetadata();

      return NextResponse.json({
        success: true,
        problems: paginatedProblems,
        metadata: {
          total,
          limit,
          offset,
          ...metadata,
        },
        unsolvedAttemptStorageAvailable: true,
      });
    }

    const solveSelect = `
        *,
        problems!inner(
          *,
          difficulty_tiers(code, name),
          platforms!inner(code, name)
        )
        ${wantsHasCodeTrue ? ', solutions!inner(id)' : wantsHasCodeFalse ? ', solutions(id)' : ''}
      `;

    // Build base query - join user_solves with problems and platforms
    let query = supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .select(solveSelect, { count: 'exact' })
      .eq('user_id', userId);

    // Filter by platform
    if (platform) {
      const platformId = await getPlatformId(platform);
      if (platformId) {
        query = query.eq('problems.platform_id', platformId);
      }
    }

    // Filter by tag (tag code)
    if (tag) {
      const normalizedTag = tag.trim().toLowerCase();
      const slugifiedTag = normalizedTag
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      let tagRow = null;
      let tagError = null;

      const tagCodeCandidates = [...new Set([normalizedTag, slugifiedTag])]
        .map((value) => value.trim())
        .filter(Boolean);

      for (const candidateCode of tagCodeCandidates) {
        const { data, error } = await supabaseAdmin
          .from(V2_TABLES.TAGS)
          .select('id')
          .eq('code', candidateCode)
          .maybeSingle();

        if (error) {
          tagError = error;
          break;
        }

        if (data?.id) {
          tagRow = data;
          break;
        }
      }

      if (!tagRow && !tagError) {
        const { data, error } = await supabaseAdmin
          .from(V2_TABLES.TAGS)
          .select('id')
          .ilike('name', tag)
          .limit(1);

        if (error) {
          tagError = error;
        } else {
          tagRow = data?.[0] || null;
        }
      }

      if (tagError) {
        console.warn('Error resolving tag filter:', tagError.message);
      } else if (!tagRow?.id) {
        // Tag doesn't exist -> empty result set
        const [platformsResult, allTagsResult] = await Promise.all([
          supabaseAdmin
            .from(V2_TABLES.PLATFORMS)
            .select('code, name')
            .eq('is_active', true)
            .order('display_order'),
          supabaseAdmin
            .from(V2_TABLES.TAGS)
            .select('code, name, category')
            .order('display_order'),
        ]);

        return NextResponse.json({
          success: true,
          problems: [],
          metadata: {
            total: 0,
            limit,
            offset,
            platforms: platformsResult.data || [],
            tags: allTagsResult.data || [],
          },
        });
      } else {
        const { data: taggedProblems, error: taggedError } = await supabaseAdmin
          .from(V2_TABLES.PROBLEM_TAGS)
          .select('problem_id')
          .eq('tag_id', tagRow.id);

        if (taggedError) {
          console.warn('Error loading tagged problems:', taggedError.message);
        } else {
          const taggedProblemIds = (taggedProblems || []).map(
            (r) => r.problem_id
          );

          if (taggedProblemIds.length === 0) {
            const [platformsResult, allTagsResult] = await Promise.all([
              supabaseAdmin
                .from(V2_TABLES.PLATFORMS)
                .select('code, name')
                .eq('is_active', true)
                .order('display_order'),
              supabaseAdmin
                .from(V2_TABLES.TAGS)
                .select('code, name, category')
                .order('display_order'),
            ]);

            return NextResponse.json({
              success: true,
              problems: [],
              metadata: {
                total: 0,
                limit,
                offset,
                platforms: platformsResult.data || [],
                tags: allTagsResult.data || [],
              },
            });
          }

          query = query.in('problem_id', taggedProblemIds);
        }
      }
    }

    // Filter by difficulty
    if (difficulty) {
      const difficultyRange = getDifficultyRange(difficulty);
      if (difficultyRange) {
        query = query
          .gte('problems.difficulty_rating', difficultyRange.min)
          .lte('problems.difficulty_rating', difficultyRange.max);
      }
    }

    // Filter by favorite
    if (favorite === 'true') {
      query = query.eq('is_favorite', true);
    }

    // Filter by solved date (UTC day window)
    if (solvedDate) {
      const start = new Date(`${solvedDate}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      if (!Number.isNaN(start.getTime())) {
        query = query
          .gte('first_solved_at', start.toISOString())
          .lt('first_solved_at', end.toISOString());
      }
    }

    // Search in problem name
    if (search) {
      query = query.ilike('problems.name', `%${search}%`);
    }

    // Filter by hasCode=false (no related solutions)
    if (wantsHasCodeFalse) {
      query = query.is('solutions.id', null);
    }

    // Apply sorting
    switch (sortBy) {
      case 'date_asc':
        query = query.order('first_solved_at', { ascending: true });
        break;
      case 'difficulty_asc':
        query = query.order('problems(difficulty_rating)', { ascending: true });
        break;
      case 'difficulty_desc':
        query = query.order('problems(difficulty_rating)', {
          ascending: false,
        });
        break;
      case 'name_asc':
        query = query.order('problems(name)', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('problems(name)', { ascending: false });
        break;
      case 'date_desc':
      default:
        query = query.order('first_solved_at', { ascending: false });
        break;
    }

    // Execute main query with pagination
    const {
      data: userSolves,
      error,
      count,
    } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching problems:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problems' },
        { status: 500 }
      );
    }

    // Get problem IDs for fetching tags and solutions
    const problemIds = (userSolves || []).map((us) => us.problems.id);
    const userSolveIds = (userSolves || []).map((us) => us.id);

    // Fetch tags + solutions in parallel
    const [tagsResult, solutionsResult, solutionPresenceResult] =
      await Promise.all([
        // Get tags for these problems
        problemIds.length > 0
          ? supabaseAdmin
              .from(V2_TABLES.PROBLEM_TAGS)
              .select(
                `
              problem_id,
              tags!inner(code, name, category)
            `
              )
              .in('problem_id', problemIds)
          : { data: [] },
        userSolveIds.length > 0
          ? supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .select(
                `
              *,
              submissions(*),
              languages(*),
              solution_analysis(*)
            `
              )
              .in('user_solve_id', userSolveIds)
              .order('created_at', { ascending: true })
          : { data: [] },
        // Minimal query used for reliable has_solution/solution_count values
        userSolveIds.length > 0
          ? supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .select('id, user_solve_id')
              .in('user_solve_id', userSolveIds)
          : { data: [] },
      ]);

    // Build tags map
    const tagsMap = {};
    (tagsResult.data || []).forEach((pt) => {
      if (!tagsMap[pt.problem_id]) {
        tagsMap[pt.problem_id] = [];
      }
      tagsMap[pt.problem_id].push({
        code: pt.tags.code,
        name: pt.tags.name,
        category: pt.tags.category,
      });
    });

    // Build solutions map (user_solve_id -> solutions[])
    const solutionsBySolve = {};
    (solutionsResult.data || []).forEach((sol) => {
      const key = sol.user_solve_id;
      if (!key) return;
      if (!solutionsBySolve[key]) solutionsBySolve[key] = [];
      solutionsBySolve[key].push(sol);
    });

    // Build solution presence map (user_solve_id -> count)
    const solutionCountBySolve = {};
    (solutionPresenceResult.data || []).forEach((sol) => {
      const key = sol.user_solve_id;
      if (!key) return;
      solutionCountBySolve[key] = (solutionCountBySolve[key] || 0) + 1;
    });

    // Transform data
    const problems = (userSolves || []).map((us) => {
      const problem = us.problems;
      const userSolveFields = { ...us };
      delete userSolveFields.problems;

      const tags = tagsMap[problem.id] || [];

      const rawSolutions = solutionsBySolve[us.id] || [];
      const solutionCount =
        solutionCountBySolve[us.id] ?? (rawSolutions ? rawSolutions.length : 0);
      const sortedSolutions = [...rawSolutions].sort((a, b) => {
        if (!!a.is_primary !== !!b.is_primary) return a.is_primary ? -1 : 1;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      const problemSolutions = sortedSolutions.map((sol, idx) => {
        const analysis = Array.isArray(sol.solution_analysis)
          ? sol.solution_analysis[0] || null
          : sol.solution_analysis || null;

        const submission = Array.isArray(sol.submissions)
          ? sol.submissions[0] || null
          : sol.submissions || null;

        return {
          id: sol.id,
          submission_uuid: sol.submission_id,
          submission_id:
            submission?.external_submission_id || sol.submission_id || null,
          source_code: sol.source_code || submission?.source_code || null,
          submission: submission || null,
          submissions: submission || null,
          language: sol.languages?.code || sol.languages?.name || null,
          verdict: sol.verdict || null,
          is_primary: !!sol.is_primary,
          notes: sol.personal_notes,
          personal_notes: sol.personal_notes,
          created_at: sol.created_at,
          updated_at: sol.created_at,
          solution_type: sol.submission_id ? 'auto_fetched' : 'manual_upload',
          ai_analysis_status: analysis ? 'completed' : 'pending',
          time_complexity: analysis?.time_complexity || null,
          space_complexity: analysis?.space_complexity || null,
          topics: analysis?.techniques_used || [],
          version_number: idx + 1,
        };
      });

      return {
        id: us.id,
        user_id: userId,
        platform: problem.platforms?.code,
        platform_name: problem.platforms?.name,
        problem_id: problem.external_id,
        problem_name: problem.name,
        problem_url: problem.url,
        contest_id: problem.contest_id,
        difficulty_rating: problem.difficulty_rating,
        difficulty_tier: problem.difficulty_tiers?.code || null,
        tags: tags.map((t) => t.code),
        tag_details: tags,
        problem_solutions: problemSolutions,
        first_solved_at: us.first_solved_at,
        solve_count: us.solve_count,
        attempt_count: us.attempt_count,
        best_time_ms: us.best_time_ms,
        best_memory_kb: us.best_memory_kb,
        is_favorite: us.is_favorite,
        personal_rating: us.personal_rating,
        notes: us.notes,
        created_at: us.created_at,
        updated_at: us.updated_at,
        has_solution: solutionCount > 0,
        solution_count: solutionCount,
        // Problem details
        problem_description: problem.description,
        input_format: problem.input_format,
        output_format: problem.output_format,
        constraints: problem.constraints,
        examples: problem.examples,
        problem_notes: problem.notes,
        tutorial_url: problem.tutorial_url,
        tutorial_content: problem.tutorial_content,
        tutorial_solutions: problem.tutorial_solutions,
        time_limit_ms: problem.time_limit_ms,
        memory_limit_kb: problem.memory_limit_kb,
        db_problem_fields: problem,
        db_platform_fields: problem.platforms || null,
        db_difficulty_tier_fields: problem.difficulty_tiers || null,
        db_user_solve_fields: userSolveFields,
        db_latest_unsolved_attempt: null,
        db_solution_records: rawSolutions,
      };
    });

    // Get metadata: unique platforms and tags for filter dropdowns
    const [platformsResult, allTagsResult] = await Promise.all([
      supabaseAdmin
        .from(V2_TABLES.PLATFORMS)
        .select('code, name')
        .eq('is_active', true)
        .order('display_order'),
      supabaseAdmin
        .from(V2_TABLES.TAGS)
        .select('code, name, category')
        .order('display_order'),
    ]);

    return NextResponse.json({
      success: true,
      problems,
      metadata: {
        total: count || 0,
        limit,
        offset,
        platforms: platformsResult.data || [],
        tags: allTagsResult.data || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in problems API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
