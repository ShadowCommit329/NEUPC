/**
 * Problem Solving API - Existing Submissions Endpoint
 * GET /api/problem-solving/existing-submissions
 *
 * Returns list of submission IDs that have already been imported
 * Used by browser extension to skip already imported submissions
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
} from '@/app/_lib/problem-solving-v2-helpers';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const CORE_PROBLEM_DETAIL_FIELDS = [
  'description',
  'input_format',
  'output_format',
  'constraints',
  'examples',
];

const OPTIONAL_PROBLEM_DETAIL_FIELDS = [
  'notes',
  'tutorial_content',
  'tutorial_url',
  'tutorial_solutions',
  'time_limit_ms',
  'memory_limit_kb',
];

const VJUDGE_CORE_PROBLEM_DETAIL_FIELDS = ['description'];

function normalizeProblemIds(problemIds) {
  if (!Array.isArray(problemIds)) return [];

  const seen = new Set();
  const normalized = [];

  for (const value of problemIds) {
    const id = String(value || '')
      .trim()
      .toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function normalizeVJudgeSubmissionId(submissionId) {
  const raw = String(submissionId || '').trim();
  if (!raw) return null;

  const normalized = raw.replace(/^vj_/i, '');
  return normalized ? `vj_${normalized}` : null;
}

function getVJudgeSubmissionIdVariants(submissionId) {
  const canonical = normalizeVJudgeSubmissionId(submissionId);
  if (!canonical) return [];

  const raw = canonical.replace(/^vj_/i, '');
  if (!raw) return [canonical];

  return [canonical, raw];
}

function normalizeSubmissionIdForPlatform(
  submissionId,
  platform = 'codeforces'
) {
  const raw = String(submissionId || '').trim();
  if (!raw) return null;

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  if (normalizedPlatform === 'vjudge') {
    return normalizeVJudgeSubmissionId(raw);
  }

  return raw;
}

function normalizeSubmissionIds(submissionIds, platform = 'codeforces') {
  if (!Array.isArray(submissionIds)) return [];

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  const seen = new Set();
  const normalized = [];

  for (const value of submissionIds) {
    let id = String(value || '').trim();

    if (normalizedPlatform === 'vjudge') {
      id = normalizeVJudgeSubmissionId(id) || '';
    }

    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function normalizePageSignature(pageSignature) {
  const normalized = String(pageSignature || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '');

  return normalized.slice(0, 48);
}

function buildPageOptimizationCacheKey(platform, pageNumber, pageSignature) {
  const normalizedPlatform = String(platform || 'unknown')
    .trim()
    .toLowerCase()
    .slice(0, 24);

  const parsedPage = Number(pageNumber);
  const normalizedPage = Number.isFinite(parsedPage)
    ? Math.max(1, Math.floor(parsedPage))
    : 0;

  const normalizedSignature = normalizePageSignature(pageSignature);
  if (!normalizedSignature) return null;

  return `ext_page:${normalizedPlatform}:${normalizedPage}:${normalizedSignature}`.slice(
    0,
    100
  );
}

function hasTextValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArrayValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.length > 0;
      }
    } catch {
      // Keep backward compatibility with legacy non-empty text values.
    }

    return true;
  }

  return false;
}

function hasNumericValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function isLikelyVJudgeNoiseDescriptionText(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;

  const noiseHits = [
    /discover more/i,
    /leave a comment/i,
    /all copyright reserved/i,
    /server time:/i,
    /submit\s+solutions?/i,
    /\bleaderboard\b/i,
    /\brecrawl\b/i,
    /\btranslation\b/i,
  ].filter((pattern) => pattern.test(normalized)).length;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return noiseHits >= 2 || (noiseHits >= 1 && wordCount < 30);
}

function hasVJudgeDescriptionValue(value) {
  if (typeof value !== 'string') return false;

  const description = value.trim();
  if (description.length < 20) return false;
  if (isLikelyVJudgeNoiseDescriptionText(description)) return false;

  const markerHits = [
    /input\s+format/i,
    /output\s+format/i,
    /constraints?/i,
    /sample\s+input/i,
    /sample\s+output/i,
    /problem\s+statement/i,
    /\bgiven\b/i,
    /\bfind\b/i,
  ].filter((pattern) => pattern.test(description)).length;
  const wordCount = description.split(/\s+/).filter(Boolean).length;

  return markerHits >= 1 || wordCount >= 40;
}

function hasProblemFieldValue(problem, field, useV2, platform = 'codeforces') {
  if (!problem || typeof problem !== 'object') return false;

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  switch (field) {
    case 'description': {
      const description = useV2
        ? problem.description
        : problem.problem_description;

      if (normalizedPlatform === 'vjudge') {
        return hasVJudgeDescriptionValue(description);
      }

      return hasTextValue(description);
    }
    case 'input_format':
      return hasTextValue(problem.input_format);
    case 'output_format':
      return hasTextValue(problem.output_format);
    case 'constraints':
      return hasTextValue(problem.constraints);
    case 'examples':
      return hasArrayValue(problem.examples);
    case 'notes':
      return hasTextValue(problem.notes);
    case 'tutorial_content':
      return hasTextValue(problem.tutorial_content);
    case 'tutorial_url':
      return hasTextValue(problem.tutorial_url);
    case 'tutorial_solutions':
      return hasArrayValue(problem.tutorial_solutions);
    case 'time_limit_ms':
      return hasNumericValue(problem.time_limit_ms);
    case 'memory_limit_kb':
      return hasNumericValue(problem.memory_limit_kb);
    default:
      return false;
  }
}

function getCoreProblemDetailFields(platform = 'codeforces') {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  if (normalizedPlatform === 'vjudge') {
    return VJUDGE_CORE_PROBLEM_DETAIL_FIELDS;
  }

  return CORE_PROBLEM_DETAIL_FIELDS;
}

function shouldRequireOptionalProblemDetails(platform = 'codeforces') {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  // VJudge commonly lacks stable optional fields (tutorial/time/memory/examples).
  // Treat description as sufficient completion signal for cache/skip optimization.
  return normalizedPlatform !== 'vjudge';
}

function buildProblemDetailStatus(problem, useV2, platform = 'codeforces') {
  const coreFields = getCoreProblemDetailFields(platform);
  const missingCoreFields = coreFields.filter(
    (field) => !hasProblemFieldValue(problem, field, useV2, platform)
  );
  const missingOptionalFields = OPTIONAL_PROBLEM_DETAIL_FIELDS.filter(
    (field) => !hasProblemFieldValue(problem, field, useV2, platform)
  );
  const requireOptional = shouldRequireOptionalProblemDetails(platform);

  return {
    exists: !!problem,
    isComplete:
      missingCoreFields.length === 0 &&
      (!requireOptional || missingOptionalFields.length === 0),
    missingCoreFields,
    missingOptionalFields,
    missingFields: [...missingCoreFields, ...missingOptionalFields],
  };
}

function buildFullyCompleteProblemDetailStatus(problemIds) {
  const normalizedProblemIds = Array.isArray(problemIds) ? problemIds : [];
  const statusByProblemId = {};

  normalizedProblemIds.forEach((problemId) => {
    statusByProblemId[problemId] = {
      exists: true,
      isComplete: true,
      missingCoreFields: [],
      missingOptionalFields: [],
      missingFields: [],
    };
  });

  return {
    checked: normalizedProblemIds.length,
    completeProblemIds: normalizedProblemIds,
    incompleteProblemIds: [],
    statusByProblemId,
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request) {
  console.log('[EXISTING-SUBMISSIONS] GET request received');

  try {
    let userId = null;

    // Check for extension token in Authorization header
    const authHeader = request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();

      // Try database token lookup
      if (token.startsWith('neupc_') && token.length >= 70) {
        const { data: tokenUser, error: dbError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', token)
          .maybeSingle();

        if (!dbError && tokenUser) {
          userId = tokenUser.id;
          console.log('[EXISTING-SUBMISSIONS] Token verified, userId:', userId);
        }
      }
    }

    // Fallback to NextAuth session
    if (!userId) {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      userId = dbUser.id;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'codeforces';
    const normalizedPlatform = String(platform || '')
      .trim()
      .toLowerCase();
    const withSourceCode = searchParams.get('withSourceCode') === 'true';

    console.log(
      `[EXISTING-SUBMISSIONS] Fetching for user ${userId}, platform: ${platform}, withSourceCode: ${withSourceCode}`
    );

    // Check for V2 schema availability
    const useV2 = await isV2SchemaAvailable();
    const submissionsTable = useV2
      ? V2_TABLES.SUBMISSIONS
      : 'problem_submissions';

    // Get platform_id for V2 queries
    let platformId = null;
    if (useV2) {
      platformId = await getPlatformId(normalizedPlatform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${normalizedPlatform}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build query based on whether we want only those with source code
    let query;
    if (useV2) {
      // V2 schema: submissions table doesn't have source_code column
      // Source code is stored in separate solutions table
      query = supabaseAdmin
        .from(submissionsTable)
        .select('id, external_submission_id')
        .eq('user_id', userId);

      query = query.eq('platform_id', platformId);

      // Note: withSourceCode filter not applicable for V2 - source code in solutions table
      // For now, return all submissions since we can't filter by source code presence
    } else {
      query = supabaseAdmin
        .from(submissionsTable)
        .select('submission_id')
        .eq('user_id', userId)
        .eq('platform', normalizedPlatform);

      // If withSourceCode is true, only return submissions that have source code (legacy only)
      if (withSourceCode) {
        query = query.not('source_code', 'is', null).neq('source_code', '');
      }
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('[EXISTING-SUBMISSIONS] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Extract submission IDs as a Set for fast lookup
    let submissionIds = [];
    if (useV2) {
      const rows = submissions || [];

      if (withSourceCode && rows.length > 0) {
        const submissionDbIds = rows
          .map((row) => row.id)
          .filter((value) => value != null);

        if (submissionDbIds.length > 0) {
          const [solutionSourceResult, unsolvedAttemptSourceResult] =
            await Promise.allSettled([
              supabaseAdmin
                .from(V2_TABLES.SOLUTIONS)
                .select('submission_id')
                .in('submission_id', submissionDbIds)
                .not('source_code', 'is', null)
                .neq('source_code', ''),
              supabaseAdmin
                .from(V2_TABLES.UNSOLVED_ATTEMPTS)
                .select('submission_id')
                .in('submission_id', submissionDbIds)
                .not('source_code', 'is', null)
                .neq('source_code', ''),
            ]);

          const withCodeDbIds = new Set();

          if (solutionSourceResult.status === 'fulfilled') {
            const { data: sourceRows, error: sourceError } =
              solutionSourceResult.value;

            if (sourceError) {
              console.warn(
                '[EXISTING-SUBMISSIONS] V2 solution source-code lookup failed:',
                sourceError.message
              );
            } else {
              (sourceRows || []).forEach((row) => {
                if (row?.submission_id != null) {
                  withCodeDbIds.add(row.submission_id);
                }
              });
            }
          }

          if (unsolvedAttemptSourceResult.status === 'fulfilled') {
            const { data: attemptRows, error: attemptError } =
              unsolvedAttemptSourceResult.value;

            if (attemptError) {
              console.warn(
                '[EXISTING-SUBMISSIONS] V2 unsolved-attempt source-code lookup failed:',
                attemptError.message
              );
            } else {
              (attemptRows || []).forEach((row) => {
                if (row?.submission_id != null) {
                  withCodeDbIds.add(row.submission_id);
                }
              });
            }
          }

          submissionIds = rows
            .filter((row) => withCodeDbIds.has(row.id))
            .map((row) => row.external_submission_id)
            .filter(Boolean);
        }
      } else {
        submissionIds = rows
          .map((row) => row.external_submission_id)
          .filter(Boolean);
      }
    } else {
      submissionIds = submissions
        ? submissions.map((s) => s.submission_id).filter(Boolean)
        : [];
    }

    submissionIds = [
      ...new Set(
        submissionIds
          .map((submissionId) =>
            normalizeSubmissionIdForPlatform(submissionId, normalizedPlatform)
          )
          .filter(Boolean)
      ),
    ];

    console.log(
      `[EXISTING-SUBMISSIONS] Found ${submissionIds.length} existing submissions`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          platform: normalizedPlatform,
          count: submissionIds.length,
          submissionIds,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EXISTING-SUBMISSIONS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST endpoint to check specific submission IDs
export async function POST(request) {
  console.log('[EXISTING-SUBMISSIONS] POST request received');

  try {
    let userId = null;

    // Check for extension token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.startsWith('neupc_') && token.length >= 70) {
        const { data: tokenUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', token)
          .maybeSingle();

        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    // Parse body for token fallback
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try extension token from body
    if (!userId && body.extensionToken) {
      const { data: tokenUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('extension_token', body.extensionToken)
        .maybeSingle();

      if (tokenUser) {
        userId = tokenUser.id;
      }
    }

    // Fallback to session
    if (!userId) {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders }
        );
      }
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }
      userId = dbUser.id;
    }

    const {
      submissionIds = [],
      problemIds = [],
      platform = 'codeforces',
      includeProblemDetails = false,
      includePageOptimization = false,
      pageNumber = null,
      pageSignature = '',
    } = body;
    const normalizedPlatform = String(platform || '')
      .trim()
      .toLowerCase();

    const normalizedSubmissionIds = normalizeSubmissionIds(
      submissionIds,
      normalizedPlatform
    );
    const submissionIdsForLookup =
      normalizedPlatform === 'vjudge'
        ? [
            ...new Set(
              normalizedSubmissionIds.flatMap((submissionId) =>
                getVJudgeSubmissionIdVariants(submissionId)
              )
            ),
          ]
        : normalizedSubmissionIds;
    const normalizedProblemIds = normalizeProblemIds(problemIds);
    const shouldCheckSubmissions = normalizedSubmissionIds.length > 0;
    const shouldCheckProblemDetails =
      includeProblemDetails || normalizedProblemIds.length > 0;

    if (!shouldCheckSubmissions && !shouldCheckProblemDetails) {
      return NextResponse.json(
        { error: 'submissionIds or problemIds are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for V2 schema availability
    const useV2 = await isV2SchemaAvailable();
    const submissionsTable = useV2
      ? V2_TABLES.SUBMISSIONS
      : 'problem_submissions';

    // Get platform_id for V2 queries
    let platformId = null;
    if (useV2) {
      platformId = await getPlatformId(normalizedPlatform);
      if (!platformId) {
        return NextResponse.json(
          { error: `Unknown platform: ${normalizedPlatform}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const pageOptimizationCacheKey =
      includePageOptimization && platformId
        ? buildPageOptimizationCacheKey(
            normalizedPlatform,
            pageNumber,
            pageSignature
          )
        : null;

    if (
      includePageOptimization &&
      useV2 &&
      platformId &&
      pageOptimizationCacheKey
    ) {
      const { data: cachedPageOptimization, error: cachedOptimizationError } =
        await supabaseAdmin
          .from(V2_TABLES.SYNC_JOBS)
          .select('id, last_processed_at')
          .eq('user_id', userId)
          .eq('platform_id', platformId)
          .eq('job_type', 'extension_page_cache')
          .eq('status', 'completed')
          .eq('last_processed_id', pageOptimizationCacheKey)
          .order('last_processed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (cachedOptimizationError) {
        console.warn(
          '[EXISTING-SUBMISSIONS] Page optimization cache lookup failed:',
          cachedOptimizationError.message
        );
      } else if (cachedPageOptimization) {
        const cachedProblemDetails =
          buildFullyCompleteProblemDetailStatus(normalizedProblemIds);

        return NextResponse.json(
          {
            success: true,
            data: {
              platform: normalizedPlatform,
              checked: normalizedSubmissionIds.length,
              existingWithCode: normalizedSubmissionIds,
              existingWithoutCode: [],
              problemDetails: cachedProblemDetails,
              pageOptimization: {
                pageNumber:
                  Number.isFinite(Number(pageNumber)) && Number(pageNumber) > 0
                    ? Math.floor(Number(pageNumber))
                    : null,
                cacheKey: pageOptimizationCacheKey,
                allComplete: true,
                allSubmissionsComplete: true,
                allProblemDetailsComplete: true,
                fromSyncJobs: true,
                cachedAt: cachedPageOptimization.last_processed_at || null,
              },
            },
          },
          { headers: corsHeaders }
        );
      }
    }

    const existingWithCode = new Set();
    const existingWithoutCode = new Set();

    if (shouldCheckSubmissions) {
      let existingQuery;
      if (useV2) {
        // V2 schema: no source_code in submissions table, check solutions table separately
        existingQuery = supabaseAdmin
          .from(submissionsTable)
          .select('id, external_submission_id')
          .eq('user_id', userId)
          .in('external_submission_id', submissionIdsForLookup);

        existingQuery = existingQuery.eq('platform_id', platformId);
      } else {
        existingQuery = supabaseAdmin
          .from(submissionsTable)
          .select('submission_id, source_code')
          .eq('user_id', userId)
          .eq('platform', normalizedPlatform)
          .in('submission_id', submissionIdsForLookup);
      }

      const { data: existing, error } = await existingQuery;

      if (error) {
        console.error('[EXISTING-SUBMISSIONS] Query error:', error);
        return NextResponse.json(
          { error: 'Failed to check submissions' },
          { status: 500, headers: corsHeaders }
        );
      }

      if (existing) {
        if (useV2) {
          const submissionDbIds = existing
            .map((sub) => sub.id)
            .filter((value) => value != null);

          let submissionIdsWithCode = new Set();

          if (submissionDbIds.length > 0) {
            const [solutionSourceResult, unsolvedAttemptSourceResult] =
              await Promise.allSettled([
                supabaseAdmin
                  .from(V2_TABLES.SOLUTIONS)
                  .select('submission_id')
                  .in('submission_id', submissionDbIds)
                  .not('source_code', 'is', null)
                  .neq('source_code', ''),
                supabaseAdmin
                  .from(V2_TABLES.UNSOLVED_ATTEMPTS)
                  .select('submission_id')
                  .in('submission_id', submissionDbIds)
                  .not('source_code', 'is', null)
                  .neq('source_code', ''),
              ]);

            if (solutionSourceResult.status === 'fulfilled') {
              const { data: sourceRows, error: sourceError } =
                solutionSourceResult.value;

              if (sourceError) {
                console.warn(
                  '[EXISTING-SUBMISSIONS] V2 solution source lookup failed:',
                  sourceError.message
                );
              } else {
                (sourceRows || []).forEach((row) => {
                  if (row?.submission_id != null) {
                    submissionIdsWithCode.add(row.submission_id);
                  }
                });
              }
            }

            if (unsolvedAttemptSourceResult.status === 'fulfilled') {
              const { data: attemptRows, error: attemptError } =
                unsolvedAttemptSourceResult.value;

              if (attemptError) {
                console.warn(
                  '[EXISTING-SUBMISSIONS] V2 unsolved-attempt source lookup failed:',
                  attemptError.message
                );
              } else {
                (attemptRows || []).forEach((row) => {
                  if (row?.submission_id != null) {
                    submissionIdsWithCode.add(row.submission_id);
                  }
                });
              }
            }
          }

          for (const sub of existing) {
            const normalizedSubId = normalizeSubmissionIdForPlatform(
              sub.external_submission_id,
              normalizedPlatform
            );
            if (!normalizedSubId) {
              continue;
            }

            if (submissionIdsWithCode.has(sub.id)) {
              existingWithCode.add(normalizedSubId);
            } else {
              existingWithoutCode.add(normalizedSubId);
            }
          }
        } else {
          for (const sub of existing) {
            const subId = normalizeSubmissionIdForPlatform(
              sub.submission_id,
              normalizedPlatform
            );
            if (!subId) {
              continue;
            }

            if (sub.source_code) {
              existingWithCode.add(subId);
            } else {
              existingWithoutCode.add(subId);
            }
          }
        }
      }

      console.log(
        `[EXISTING-SUBMISSIONS] Checked ${normalizedSubmissionIds.length} IDs: ${existingWithCode.size} with code, ${existingWithoutCode.size} without code`
      );
    }

    let problemDetails = null;
    let statusByProblemId = {};

    if (shouldCheckProblemDetails && normalizedProblemIds.length > 0) {
      const problemsTable = useV2 ? V2_TABLES.PROBLEMS : 'problems';
      let problemQuery;

      if (useV2) {
        problemQuery = supabaseAdmin
          .from(problemsTable)
          .select(
            'external_id, description, input_format, output_format, constraints, examples, notes, tutorial_url, tutorial_content, tutorial_solutions, time_limit_ms, memory_limit_kb'
          )
          .in('external_id', normalizedProblemIds);

        if (platformId) {
          problemQuery = problemQuery.eq('platform_id', platformId);
        }
      } else {
        problemQuery = supabaseAdmin
          .from(problemsTable)
          .select(
            'problem_id, problem_description, input_format, output_format, constraints, examples, notes, tutorial_url, tutorial_content, tutorial_solutions, time_limit_ms, memory_limit_kb'
          )
          .eq('platform', normalizedPlatform)
          .in('problem_id', normalizedProblemIds);
      }

      const { data: existingProblems, error: problemError } =
        await problemQuery;

      if (problemError) {
        console.error(
          '[EXISTING-SUBMISSIONS] Problem detail query error:',
          problemError
        );
        return NextResponse.json(
          { error: 'Failed to check problem details' },
          { status: 500, headers: corsHeaders }
        );
      }

      const problemMap = new Map();
      (existingProblems || []).forEach((problem) => {
        const key = String(useV2 ? problem.external_id : problem.problem_id)
          .trim()
          .toLowerCase();
        if (key) {
          problemMap.set(key, problem);
        }
      });

      statusByProblemId = {};
      const completeProblemIds = [];
      const incompleteProblemIds = [];

      normalizedProblemIds.forEach((problemId) => {
        const problem = problemMap.get(problemId) || null;
        const status = buildProblemDetailStatus(
          problem,
          useV2,
          normalizedPlatform
        );

        statusByProblemId[problemId] = status;
        if (status.isComplete) {
          completeProblemIds.push(problemId);
        } else {
          incompleteProblemIds.push(problemId);
        }
      });

      problemDetails = {
        checked: normalizedProblemIds.length,
        completeProblemIds,
        incompleteProblemIds,
        statusByProblemId,
      };
    } else if (shouldCheckProblemDetails) {
      problemDetails = {
        checked: 0,
        completeProblemIds: [],
        incompleteProblemIds: [],
        statusByProblemId: {},
      };
    }

    let pageOptimization = null;

    if (includePageOptimization) {
      const allSubmissionsComplete = shouldCheckSubmissions
        ? normalizedSubmissionIds.every((submissionId) =>
            existingWithCode.has(submissionId)
          )
        : true;

      const allProblemDetailsComplete = shouldCheckProblemDetails
        ? normalizedProblemIds.every(
            (problemId) => statusByProblemId?.[problemId]?.isComplete === true
          )
        : true;

      const allComplete = allSubmissionsComplete && allProblemDetailsComplete;

      pageOptimization = {
        pageNumber:
          Number.isFinite(Number(pageNumber)) && Number(pageNumber) > 0
            ? Math.floor(Number(pageNumber))
            : null,
        cacheKey: pageOptimizationCacheKey,
        allComplete,
        allSubmissionsComplete,
        allProblemDetailsComplete,
        fromSyncJobs: false,
      };

      if (allComplete && useV2 && platformId && pageOptimizationCacheKey) {
        const nowIso = new Date().toISOString();
        const { data: existingCacheRow, error: existingCacheRowError } =
          await supabaseAdmin
            .from(V2_TABLES.SYNC_JOBS)
            .select('id')
            .eq('user_id', userId)
            .eq('platform_id', platformId)
            .eq('job_type', 'extension_page_cache')
            .eq('last_processed_id', pageOptimizationCacheKey)
            .order('last_processed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingCacheRowError) {
          console.warn(
            '[EXISTING-SUBMISSIONS] Page optimization cache pre-update lookup failed:',
            existingCacheRowError.message
          );
        }

        let cacheWriteError = null;

        if (existingCacheRow?.id) {
          const { error } = await supabaseAdmin
            .from(V2_TABLES.SYNC_JOBS)
            .update({
              status: 'completed',
              completed_at: nowIso,
              last_processed_at: nowIso,
              total_items: normalizedSubmissionIds.length,
              processed_items: normalizedSubmissionIds.length,
              inserted_items: 0,
              error_message: 'all_complete',
            })
            .eq('id', existingCacheRow.id);

          cacheWriteError = error;
        } else {
          const { error } = await supabaseAdmin
            .from(V2_TABLES.SYNC_JOBS)
            .insert({
              user_id: userId,
              platform_id: platformId,
              job_type: 'extension_page_cache',
              status: 'completed',
              scheduled_at: nowIso,
              started_at: nowIso,
              completed_at: nowIso,
              total_items: normalizedSubmissionIds.length,
              processed_items: normalizedSubmissionIds.length,
              inserted_items: 0,
              last_processed_id: pageOptimizationCacheKey,
              last_processed_at: nowIso,
              error_message: 'all_complete',
            });

          cacheWriteError = error;
        }

        if (cacheWriteError) {
          console.warn(
            '[EXISTING-SUBMISSIONS] Page optimization cache write failed:',
            cacheWriteError.message
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          platform: normalizedPlatform,
          checked: normalizedSubmissionIds.length,
          existingWithCode: Array.from(existingWithCode),
          existingWithoutCode: Array.from(existingWithoutCode),
          ...(problemDetails ? { problemDetails } : {}),
          ...(pageOptimization ? { pageOptimization } : {}),
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[EXISTING-SUBMISSIONS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
