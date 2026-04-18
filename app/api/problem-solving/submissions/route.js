/**
 * Problem Solving API - Submissions Endpoint
 * GET /api/problem-solving/submissions - Fetch all submissions for a user/problem
 * POST /api/problem-solving/submissions - Store a new submission
 *
 * Supports filtering by:
 * - problemId: Filter submissions for a specific problem
 * - platform: Filter by platform (codeforces, etc.)
 * - verdict: Filter by verdict (AC, WA, TLE, etc.)
 * - startDate/endDate: Filter by date range
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers.js';

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

const MIN_REASONABLE_SUBMISSION_MS = Date.parse('2005-01-01T00:00:00.000Z');
const MAX_SUBMISSION_FUTURE_DRIFT_MS = 24 * 60 * 60 * 1000;

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

function isSyntheticLeetCodeSubmissionId(value) {
  const id = (value || '').toString().trim().toLowerCase();
  if (!id) return false;

  return (
    id.startsWith('lc_contest_') ||
    id.startsWith('lc_inferred_') ||
    id.startsWith('lc_synthetic_') ||
    id.startsWith('clist_')
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query params
    const userId = searchParams.get('userId');
    const problemId = searchParams.get('problemId');
    const problemName = searchParams.get('problemName');
    const platform = searchParams.get('platform');
    const verdict = searchParams.get('verdict');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeCode = searchParams.get('includeCode') !== 'false';

    // If no userId provided, use current authenticated user
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (session?.user?.email) {
        const dbUser = await getCachedUserByEmail(session.user.email);
        if (dbUser) {
          targetUserId = dbUser.id;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Build query with platform join
    let query = supabaseAdmin
      .from(V2_TABLES.SUBMISSIONS)
      .select(
        `
        *,
        platforms!inner(code, name),
        languages(code, name)
      `,
        { count: 'exact' }
      )
      .eq('user_id', targetUserId);

    // Filter by problem name or external ID
    if (problemName) {
      query = query.eq('problem_name', problemName);
    } else if (problemId) {
      // Back-compat: some callers pass problem_name in the problemId param.
      const looksLikeName = /\s/.test(problemId) || problemId.includes('.');
      query = looksLikeName
        ? query.eq('problem_name', problemId)
        : query.eq('external_problem_id', problemId);
    }

    // Filter by platform
    if (platform) {
      const platformId = await getPlatformId(platform);
      if (platformId) {
        query = query.eq('platform_id', platformId);
      }
    }

    if (verdict) {
      query = query.eq('verdict', verdict);
    }

    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }

    if (endDate) {
      query = query.lte('submitted_at', endDate);
    }

    const {
      data: submissions,
      error,
      count,
    } = await query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Transform to include platform code at top level
    const transformedSubmissions = (submissions || []).map((sub) => ({
      ...sub,
      platform: sub.platforms?.code,
      platform_name: sub.platforms?.name,
      language: sub.languages?.code,
      language_name: sub.languages?.name,
      problem_id: sub.external_problem_id,
      submission_uuid: sub.id,
      submission_id: sub.external_submission_id,
    }));

    // If includeCode is true, fetch source code from solutions table
    if (includeCode && transformedSubmissions.length > 0) {
      const submissionIds = transformedSubmissions.map((s) => s.id);

      const [solutionsResult, unsolvedAttemptsResult] = await Promise.all([
        supabaseAdmin
          .from(V2_TABLES.SOLUTIONS)
          .select(
            `
            id,
            submission_id,
            source_code,
            verdict,
            languages(code, name),
            solution_analysis(
              approach_name,
              approach_explanation,
              time_complexity,
              space_complexity,
              techniques_used,
              optimization_tips,
              learning_notes,
              analyzed_at,
              model_version
            )
          `
          )
          .in('submission_id', submissionIds),
        supabaseAdmin
          .from(V2_TABLES.UNSOLVED_ATTEMPTS)
          .select(
            `
            id,
            submission_id,
            source_code,
            verdict,
            languages(code, name)
          `
          )
          .eq('user_id', targetUserId)
          .in('submission_id', submissionIds),
      ]);

      const solutions = solutionsResult.data || [];
      const unsolvedAttempts = unsolvedAttemptsResult.data || [];

      if (solutionsResult.error) {
        console.warn(
          '[SUBMISSIONS] Failed to load solution code:',
          solutionsResult.error.message
        );
      }

      if (unsolvedAttemptsResult.error) {
        if (isMissingUnsolvedAttemptsTableError(unsolvedAttemptsResult.error)) {
          console.warn(
            '[SUBMISSIONS] unsolved_attempts table not available; apply latest migrations to include dedicated unsolved attempt code.'
          );
        } else {
          console.warn(
            '[SUBMISSIONS] Failed to load dedicated unsolved attempts:',
            unsolvedAttemptsResult.error.message
          );
        }
      }

      const solutionMap = {};
      solutions.forEach((sol) => {
        solutionMap[sol.submission_id] = sol;
      });

      const unsolvedAttemptMap = {};
      unsolvedAttempts.forEach((attempt) => {
        unsolvedAttemptMap[attempt.submission_id] = attempt;
      });

      transformedSubmissions.forEach((sub) => {
        const solution = solutionMap[sub.id];
        if (solution) {
          const analysis = Array.isArray(solution.solution_analysis)
            ? solution.solution_analysis[0] || null
            : solution.solution_analysis || null;

          sub.solution_id = solution.id;
          sub.source_code = solution.source_code;
          sub.language =
            sub.language ||
            solution.languages?.code ||
            solution.languages?.name;

          // Legacy-friendly analysis fields expected by UI
          sub.ai_analysis_status = analysis ? 'completed' : 'pending';
          sub.ai_time_complexity = analysis?.time_complexity || null;
          sub.ai_space_complexity = analysis?.space_complexity || null;
          sub.ai_approach_name = analysis?.approach_name || null;
          sub.ai_approach_explanation = analysis?.approach_explanation || null;

          // Best-effort mapping: store failure reasons in learning_notes.
          const isAccepted =
            sub.verdict === 'AC' ||
            sub.verdict === 'OK' ||
            sub.verdict === 'Accepted';
          sub.ai_why_failed = !isAccepted
            ? analysis?.learning_notes || null
            : null;

          sub.ai_analysis = analysis;
          sub.code_origin = 'solution';
          sub.is_unsolved_attempt = false;
          return;
        }

        const unsolvedAttempt = unsolvedAttemptMap[sub.id];
        if (unsolvedAttempt) {
          sub.unsolved_attempt_id = unsolvedAttempt.id;
          sub.source_code = unsolvedAttempt.source_code;
          sub.language =
            sub.language ||
            unsolvedAttempt.languages?.code ||
            unsolvedAttempt.languages?.name;
          sub.ai_analysis_status = sub.ai_analysis_status || 'pending';
          sub.code_origin = 'unsolved_attempt';
          sub.is_unsolved_attempt = true;
        }
      });
    }

    // Group submissions by verdict for stats
    const verdictStats = {};
    transformedSubmissions.forEach((s) => {
      verdictStats[s.verdict] = (verdictStats[s.verdict] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        submissions: transformedSubmissions,
        verdictStats,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: offset + limit < (count || 0),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

/**
 * POST - Store a new submission
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getCachedUserByEmail(session.user.email);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      platform,
      problem_id,
      submission_id,
      problem_name,
      verdict,
      language_id,
      execution_time_ms,
      memory_kb,
      submitted_at,
    } = body;

    if (!platform || !problem_id || !submission_id || !verdict) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: platform, problem_id, submission_id, verdict',
        },
        { status: 400 }
      );
    }

    const platformCode = platform.toLowerCase();
    const normalizedSubmissionId = String(submission_id).trim();
    const normalizedTimestamp = normalizeSubmissionTimestamp(submitted_at);
    const normalizedProblemId =
      platformCode === 'leetcode'
        ? normalizeLeetCodeProblemSlug(problem_id)
        : String(problem_id).trim();

    if (!normalizedSubmissionId || !normalizedProblemId) {
      return NextResponse.json(
        { error: 'Invalid submission_id or problem_id' },
        { status: 400 }
      );
    }

    if (platformCode === 'leetcode') {
      if (isSyntheticLeetCodeSubmissionId(normalizedSubmissionId)) {
        return NextResponse.json(
          {
            error:
              'Rejected synthetic LeetCode submission. Please sync only real Practice History submissions.',
          },
          { status: 400 }
        );
      }

      if (!normalizedTimestamp) {
        return NextResponse.json(
          {
            error:
              'LeetCode submissions require a valid submitted_at timestamp from Practice History.',
          },
          { status: 400 }
        );
      }
    }

    const platformId = await getPlatformId(platformCode);
    if (!platformId) {
      return NextResponse.json(
        { error: `Unknown platform: ${platformCode}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from(V2_TABLES.SUBMISSIONS)
      .upsert(
        {
          user_id: dbUser.id,
          platform_id: platformId,
          external_submission_id: normalizedSubmissionId,
          external_problem_id: normalizedProblemId,
          problem_name,
          verdict,
          language_id,
          execution_time_ms,
          memory_kb,
          submitted_at: normalizedTimestamp || new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform_id,external_submission_id',
        }
      )
      .select(
        `
        *,
        platforms!inner(code, name)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...data,
        platform: data.platforms?.code,
      },
    });
  } catch (error) {
    console.error('Error storing submission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store submission' },
      { status: 500 }
    );
  }
}
