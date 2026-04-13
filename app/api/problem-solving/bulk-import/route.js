/**
 * Problem Solving API - Bulk Import Endpoint (Optimized)
 * POST /api/problem-solving/bulk-import
 *
 * Receives bulk submission data from browser extension
 * Uses batch database operations for speed
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  isV2SchemaAvailable,
  V2_TABLES,
  getPlatformId,
  getLanguageId,
  getTierIdForRating,
  updateUserDailyActivity,
  recalcUserStreaks,
  updateUserTagStats,
  upsertProblemEditorial,
} from '@/app/_lib/problem-solving-v2-helpers';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function logBulkImportTest(event, payload = {}) {
  console.warn(`[BULK-IMPORT][TEST] ${event}`, payload);
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

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request) {
  const startTime = Date.now();

  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    let userId = null;
    const session = await auth();

    logBulkImportTest('request_received', {
      url: request.url,
      hasSessionEmail: !!session?.user?.email,
    });

    if (session?.user?.email) {
      const dbUser = await getCachedUserByEmail(session.user.email);
      if (dbUser) {
        userId = dbUser.id;
      }
    }

    // If no session, try extension token
    if (!userId) {
      let bodyData;
      try {
        const bodyText = await request.text();
        bodyData = JSON.parse(bodyText);
        request.bodyData = bodyData;
      } catch (parseError) {
        console.error('[BULK-IMPORT] Body parse error:', parseError);
        return NextResponse.json(
          { success: false, error: 'Invalid request body' },
          { status: 400, headers: corsHeaders }
        );
      }

      const extensionToken = bodyData.extensionToken;
      if (extensionToken) {
        const { data: tokenUser, error: tokenError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', extensionToken)
          .maybeSingle();

        if (!tokenError && tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
      logBulkImportTest('request_unauthorized', {
        reason: 'missing session and extension token user',
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // ============================================================
    // PARSE REQUEST
    // ============================================================
    const body = request.bodyData || (await request.json());
    const { submissions: incomingSubmissions = [], platform = 'codeforces' } =
      body;

    // Normalize platform name
    const normalizedPlatform = platform.toLowerCase();

    logBulkImportTest('payload_summary', {
      userId,
      platform: normalizedPlatform,
      submissionsReceived: Array.isArray(incomingSubmissions)
        ? incomingSubmissions.length
        : 0,
    });

    if (
      !Array.isArray(incomingSubmissions) ||
      incomingSubmissions.length === 0
    ) {
      logBulkImportTest('validation_failed_no_submissions', {
        receivedType: Array.isArray(incomingSubmissions)
          ? 'array'
          : typeof incomingSubmissions,
        receivedCount: Array.isArray(incomingSubmissions)
          ? incomingSubmissions.length
          : 0,
      });
      return NextResponse.json(
        { success: false, error: 'No submissions provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    const submissionsReceived = incomingSubmissions.length;
    let rejectedLeetCodeSubmissions = 0;

    const submissions = incomingSubmissions
      .map((rawSubmission) => {
        if (!rawSubmission || typeof rawSubmission !== 'object') {
          return null;
        }

        const normalizedSubmission = { ...rawSubmission };
        const normalizedSubmissionId = rawSubmission.submission_id
          ? String(rawSubmission.submission_id).trim()
          : '';
        const normalizedTimestamp = normalizeSubmissionTimestamp(
          rawSubmission.submitted_at ??
            rawSubmission.submission_time ??
            rawSubmission.submissionTime ??
            rawSubmission.timestamp
        );

        if (normalizedSubmissionId) {
          normalizedSubmission.submission_id = normalizedSubmissionId;
        }

        if (normalizedTimestamp) {
          normalizedSubmission.submitted_at = normalizedTimestamp;
        }

        if (normalizedPlatform === 'leetcode') {
          const normalizedProblemId = normalizeLeetCodeProblemSlug(
            rawSubmission.problem_id
          );

          if (
            !normalizedSubmissionId ||
            !normalizedProblemId ||
            !normalizedTimestamp ||
            isSyntheticLeetCodeSubmissionId(normalizedSubmissionId)
          ) {
            rejectedLeetCodeSubmissions++;
            return null;
          }

          normalizedSubmission.problem_id = normalizedProblemId;
          normalizedSubmission.submitted_at = normalizedTimestamp;
        }

        return normalizedSubmission;
      })
      .filter(Boolean);

    logBulkImportTest('validation_summary', {
      platform: normalizedPlatform,
      submissionsReceived,
      submissionsAccepted: submissions.length,
      submissionsRejected: submissionsReceived - submissions.length,
      rejectedLeetCodeSubmissions,
    });

    if (submissions.length === 0) {
      logBulkImportTest('validation_failed_all_rejected', {
        platform: normalizedPlatform,
        submissionsReceived,
        rejectedLeetCodeSubmissions,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No valid submissions to import after validation',
          data: {
            submissionsReceived,
            submissionsAccepted: 0,
            submissionsRejected: submissionsReceived,
            rejectedLeetCodeSubmissions,
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for V2 schema availability
    const useV2 = await isV2SchemaAvailable();
    const handlesTable = useV2 ? V2_TABLES.USER_HANDLES : 'user_handles';
    const submissionsTable = useV2
      ? V2_TABLES.SUBMISSIONS
      : 'problem_submissions';

    // Get platform_id for V2 queries
    let platformId = null;
    if (useV2) {
      platformId = await getPlatformId(normalizedPlatform);
      if (!platformId) {
        logBulkImportTest('validation_failed_unknown_platform', {
          platform: normalizedPlatform,
        });
        return NextResponse.json(
          { success: false, error: `Unknown platform: ${normalizedPlatform}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // ============================================================
    // VERIFY USER HAS PLATFORM HANDLE
    // ============================================================
    let userHandleQuery;
    if (useV2) {
      userHandleQuery = supabaseAdmin
        .from(handlesTable)
        .select('handle')
        .eq('user_id', userId);
      if (platformId) {
        userHandleQuery = userHandleQuery.eq('platform_id', platformId);
      }
    } else {
      userHandleQuery = supabaseAdmin
        .from(handlesTable)
        .select('handle')
        .eq('user_id', userId)
        .eq('platform', normalizedPlatform);
    }

    const { data: userHandle } = await userHandleQuery.maybeSingle();

    if (!userHandle) {
      logBulkImportTest('validation_failed_missing_handle', {
        platform: normalizedPlatform,
        userId,
        useV2,
      });
      return NextResponse.json(
        {
          success: false,
          error: `No ${normalizedPlatform} handle connected. Please connect your handle first.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // ============================================================
    // STEP 1: GET EXISTING SUBMISSIONS (single query)
    // ============================================================
    const submissionIds = submissions
      .map((s) => s.submission_id?.toString())
      .filter(Boolean);

    let existingQuery;
    if (useV2) {
      // V2 schema: submissions table doesn't have source_code column
      existingQuery = supabaseAdmin
        .from(submissionsTable)
        .select('id, external_submission_id')
        .eq('user_id', userId)
        .in('external_submission_id', submissionIds);
      if (platformId) {
        existingQuery = existingQuery.eq('platform_id', platformId);
      }
    } else {
      existingQuery = supabaseAdmin
        .from(submissionsTable)
        .select('submission_id, source_code')
        .eq('user_id', userId)
        .eq('platform', normalizedPlatform)
        .in('submission_id', submissionIds);
    }

    const { data: existingSubmissions } = await existingQuery;

    const existingSubMap = new Map();
    if (existingSubmissions) {
      for (const sub of existingSubmissions) {
        const subId = useV2 ? sub.external_submission_id : sub.submission_id;
        existingSubMap.set(subId, sub);
      }
    }

    // ============================================================
    // STEP 2: SEPARATE NEW vs UPDATE submissions
    // ============================================================
    const newSubmissions = [];
    const updateSubmissions = [];

    // For V2, pre-resolve language IDs to avoid many individual lookups
    const languageMap = new Map();
    if (useV2) {
      const uniqueLanguages = [
        ...new Set(submissions.map((s) => s.language).filter(Boolean)),
      ];
      for (const lang of uniqueLanguages) {
        const langId = await getLanguageId(lang);
        if (langId) languageMap.set(lang, langId);
      }
    }

    for (const sub of submissions) {
      const subId = sub.submission_id?.toString();
      if (!subId) continue;

      const existing = existingSubMap.get(subId);

      if (existing) {
        if (useV2) {
          const updatePayload = {};

          if (sub.problem_id) {
            updatePayload.external_problem_id = sub.problem_id;
          }

          if (sub.problem_name) {
            updatePayload.problem_name = sub.problem_name;
          }

          if (sub.verdict) {
            updatePayload.verdict = sub.verdict;
          }

          const langId = languageMap.get(sub.language);
          if (langId != null) {
            updatePayload.language_id = langId;
          }

          if (sub.execution_time_ms != null) {
            updatePayload.execution_time_ms = sub.execution_time_ms;
          }

          if (sub.memory_kb != null) {
            updatePayload.memory_kb = sub.memory_kb;
          }

          if (sub.submitted_at) {
            const submittedAt = new Date(sub.submitted_at);
            if (!Number.isNaN(submittedAt.getTime())) {
              updatePayload.submitted_at = submittedAt.toISOString();
            }
          }

          if (Object.keys(updatePayload).length > 0) {
            updateSubmissions.push({
              id: existing.id,
              updates: updatePayload,
            });
          }
        } else if (sub.source_code && !existing.source_code) {
          // Legacy schema: update source_code directly
          updateSubmissions.push({
            submission_id: subId,
            source_code: sub.source_code,
            language: sub.language,
            execution_time_ms: sub.execution_time_ms,
            memory_kb: sub.memory_kb,
          });
        }
      } else {
        // New submission
        const submittedAt = sub.submitted_at
          ? new Date(sub.submitted_at).toISOString()
          : new Date().toISOString();

        const newSub = useV2
          ? {
              // V2 schema columns - matches actual database schema
              user_id: userId,
              platform_id: platformId,
              external_submission_id: subId,
              external_problem_id: sub.problem_id,
              problem_name: sub.problem_name || sub.problem_id,
              verdict: sub.verdict || 'UNKNOWN',
              language_id: languageMap.get(sub.language) || null,
              execution_time_ms: sub.execution_time_ms || null,
              memory_kb: sub.memory_kb || null,
              submitted_at: submittedAt,
              // Note: source_code, contest_id, difficulty_rating, tags, problem_url
              // are NOT in V2 submissions table - they go elsewhere
            }
          : {
              user_id: userId,
              platform: normalizedPlatform,
              submission_id: subId,
              problem_id: sub.problem_id,
              problem_name: sub.problem_name || sub.problem_id,
              problem_url: sub.problem_url || null,
              contest_id: sub.contest_id?.toString() || null,
              verdict: sub.verdict || 'UNKNOWN',
              language: sub.language || 'Unknown',
              execution_time_ms: sub.execution_time_ms || null,
              memory_kb: sub.memory_kb || null,
              difficulty_rating: sub.difficulty_rating
                ? Number(sub.difficulty_rating)
                : null,
              tags: sub.tags || [],
              submitted_at: submittedAt,
              source_code: sub.source_code || null,
            };

        newSubmissions.push(newSub);
      }
    }

    // ============================================================
    // STEP 3: BULK INSERT NEW SUBMISSIONS
    // ============================================================
    let submissionsCreated = 0;
    let submissionsUpdated = 0;

    if (newSubmissions.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from(submissionsTable)
        .insert(newSubmissions)
        .select('id');

      if (insertError) {
        console.error('[BULK-IMPORT] Bulk insert error:', insertError.message);
        // Try inserting one by one as fallback
        for (const sub of newSubmissions) {
          const { error } = await supabaseAdmin
            .from(submissionsTable)
            .insert(sub);
          if (!error) submissionsCreated++;
        }
      } else {
        submissionsCreated = inserted?.length || newSubmissions.length;
      }
    }

    // ============================================================
    // STEP 4: UPDATE EXISTING SUBMISSIONS (metadata for V2, source for legacy)
    // ============================================================
    if (updateSubmissions.length > 0) {
      // Update in parallel batches of 10
      const updateBatches = [];
      for (let i = 0; i < updateSubmissions.length; i += 10) {
        updateBatches.push(updateSubmissions.slice(i, i + 10));
      }

      for (const batch of updateBatches) {
        await Promise.all(
          batch.map(async (sub) => {
            let error;

            if (useV2) {
              const { error: updateError } = await supabaseAdmin
                .from(submissionsTable)
                .update(sub.updates)
                .eq('id', sub.id)
                .eq('user_id', userId);
              error = updateError;
            } else {
              const { error: updateError } = await supabaseAdmin
                .from(submissionsTable)
                .update({
                  source_code: sub.source_code,
                  language: sub.language,
                  execution_time_ms: sub.execution_time_ms,
                  memory_kb: sub.memory_kb,
                })
                .eq('user_id', userId)
                .eq('platform', normalizedPlatform)
                .eq('submission_id', sub.submission_id);
              error = updateError;
            }

            if (!error) submissionsUpdated++;
          })
        );
      }
    }

    // Build lookup map for submission UUIDs so solutions can be linked back to submissions.
    const submissionRecordByExternalId = new Map();
    if (useV2 && submissionIds.length > 0) {
      const { data: submissionRecords, error: submissionRecordError } =
        await supabaseAdmin
          .from(submissionsTable)
          .select(
            'id, external_submission_id, external_problem_id, problem_name, verdict, language_id, execution_time_ms, memory_kb, submitted_at'
          )
          .eq('user_id', userId)
          .eq('platform_id', platformId)
          .in('external_submission_id', submissionIds);

      if (submissionRecordError) {
        console.warn(
          '[BULK-IMPORT] Failed to fetch submission record map:',
          submissionRecordError.message
        );
      } else {
        (submissionRecords || []).forEach((row) => {
          submissionRecordByExternalId.set(row.external_submission_id, row);
        });
      }
    }

    // ============================================================
    // STEP 5: HANDLE PROBLEMS TABLE (batch)
    // ============================================================
    // Get unique problem IDs
    const problemIds = [
      ...new Set(submissions.map((s) => s.problem_id).filter(Boolean)),
    ];

    // Get existing problems
    const problemsTable = useV2 ? V2_TABLES.PROBLEMS : 'problems';

    let existingProblemsQuery;
    if (useV2) {
      // V2 schema: uses 'external_id' not 'problem_id'
      existingProblemsQuery = supabaseAdmin
        .from(problemsTable)
        .select('id, external_id')
        .eq('platform_id', platformId)
        .in('external_id', problemIds);
    } else {
      existingProblemsQuery = supabaseAdmin
        .from(problemsTable)
        .select('id, problem_id')
        .eq('platform', normalizedPlatform)
        .in('problem_id', problemIds);
    }

    const { data: existingProblems } = await existingProblemsQuery;

    const existingProblemIds = new Set(
      existingProblems?.map((p) => (useV2 ? p.external_id : p.problem_id)) || []
    );
    const problemIdToDbId = new Map();
    existingProblems?.forEach((p) =>
      problemIdToDbId.set(useV2 ? p.external_id : p.problem_id, p.id)
    );

    // Collect problems to upsert (both new and existing with details)
    const problemsToUpsert = [];
    const seenProblemIds = new Set();

    for (const sub of submissions) {
      if (!sub.problem_id || seenProblemIds.has(sub.problem_id)) {
        continue;
      }
      seenProblemIds.add(sub.problem_id);

      // Only upsert if we have detailed information to add
      // (not just basic problem_id and name from API)
      const hasDetails =
        Boolean(sub.description) ||
        Boolean(sub.input_format || sub.inputFormat) ||
        Boolean(sub.output_format || sub.outputFormat) ||
        Boolean(sub.constraints) ||
        (Array.isArray(sub.examples) && sub.examples.length > 0) ||
        Boolean(sub.notes) ||
        Boolean(sub.tutorial_url || sub.tutorialUrl) ||
        Boolean(sub.tutorial_content || sub.tutorialContent) ||
        (Array.isArray(sub.tutorial_solutions) &&
          sub.tutorial_solutions.length > 0) ||
        (Array.isArray(sub.tutorialSolutions) &&
          sub.tutorialSolutions.length > 0) ||
        sub.time_limit_ms != null ||
        sub.timeLimitMs != null ||
        sub.timeLimit != null ||
        sub.memory_limit_kb != null ||
        sub.memoryLimitKb != null ||
        sub.memoryLimit != null;

      // Always upsert new problems, or existing ones with new details
      if (!existingProblemIds.has(sub.problem_id) || hasDetails) {
        const normalizedRating = sub.difficulty_rating
          ? Math.round(Number(sub.difficulty_rating))
          : null;

        const problem = useV2
          ? {
              // V2 schema columns
              platform_id: platformId,
              external_id: sub.problem_id,
              name: sub.problem_name || sub.problem_id,
              url: sub.problem_url || null,
              contest_id: sub.contest_id?.toString() || null,
              difficulty_rating: normalizedRating,
              // difficulty_tier_id resolved below after upsert (async, skip here)
              // New problem details fields
              description: sub.description || null,
              input_format: sub.input_format || sub.inputFormat || null,
              output_format: sub.output_format || sub.outputFormat || null,
              constraints: sub.constraints || null,
              examples: sub.examples || [],
              notes: sub.notes || null,
              tutorial_url: sub.tutorial_url || sub.tutorialUrl || null,
              tutorial_content:
                sub.tutorial_content || sub.tutorialContent || null,
              tutorial_solutions:
                sub.tutorial_solutions || sub.tutorialSolutions || [],
              time_limit_ms:
                sub.time_limit_ms ?? sub.timeLimitMs ?? sub.timeLimit ?? null,
              memory_limit_kb:
                sub.memory_limit_kb ??
                sub.memoryLimitKb ??
                sub.memoryLimit ??
                null,
            }
          : {
              platform: normalizedPlatform,
              problem_id: sub.problem_id,
              problem_name: sub.problem_name || sub.problem_id,
              problem_url: sub.problem_url || null,
              problem_description: sub.description || null,
              input_format: sub.input_format || sub.inputFormat || null,
              output_format: sub.output_format || sub.outputFormat || null,
              constraints: sub.constraints || null,
              examples: sub.examples || [],
              notes: sub.notes || null,
              tutorial_url: sub.tutorial_url || sub.tutorialUrl || null,
              tutorial_content:
                sub.tutorial_content || sub.tutorialContent || null,
              tutorial_solutions:
                sub.tutorial_solutions || sub.tutorialSolutions || [],
              time_limit_ms:
                sub.time_limit_ms ?? sub.timeLimitMs ?? sub.timeLimit ?? null,
              memory_limit_kb:
                sub.memory_limit_kb ??
                sub.memoryLimitKb ??
                sub.memoryLimit ??
                null,
              contest_id: sub.contest_id?.toString() || null,
              difficulty_rating: sub.difficulty_rating
                ? Math.round(Number(sub.difficulty_rating))
                : null,
              tags: sub.tags || [],
            };

        problemsToUpsert.push(problem);
      }
    }

    let problemsCreated = 0;

    if (problemsToUpsert.length > 0) {
      const problemsTableForUpsert = useV2 ? V2_TABLES.PROBLEMS : 'problems';
      const selectColumns = useV2 ? 'id, external_id' : 'id, problem_id';

      // Use upsert to insert new or update existing problems with full details
      const { data: upsertedProblems, error: problemError } =
        await supabaseAdmin
          .from(problemsTableForUpsert)
          .upsert(problemsToUpsert, {
            onConflict: useV2
              ? 'platform_id,external_id'
              : 'platform,problem_id',
            ignoreDuplicates: false, // We want to update with new details
          })
          .select(selectColumns);

      if (problemError) {
        console.error(
          '[BULK-IMPORT] Problem upsert error:',
          problemError.message,
          problemError
        );
      }

      if (!problemError && upsertedProblems) {
        problemsCreated = upsertedProblems.length;
        upsertedProblems.forEach((p) =>
          problemIdToDbId.set(useV2 ? p.external_id : p.problem_id, p.id)
        );
      }

      // Backfill difficulty_tier_id and write problem_editorials (V2 only)
      if (useV2) {
        for (const sub of problemsToUpsert) {
          if (!sub.external_id) continue;
          const dbId = problemIdToDbId.get(sub.external_id);
          if (!dbId) continue;

          // Set difficulty_tier_id
          if (sub.difficulty_rating != null) {
            const tierId = await getTierIdForRating(sub.difficulty_rating);
            if (tierId != null) {
              await supabaseAdmin
                .from(V2_TABLES.PROBLEMS)
                .update({ difficulty_tier_id: tierId })
                .eq('id', dbId)
                .is('difficulty_tier_id', null); // only if not already set
            }
          }

          // Write editorial if tutorial data present
          const tutUrl = sub.tutorial_url || null;
          const tutContent = sub.tutorial_content || null;
          const tutSols =
            sub.tutorial_solutions?.length > 0 ? sub.tutorial_solutions : null;
          if (tutUrl || tutContent || tutSols) {
            await upsertProblemEditorial(dbId, {
              tutorialUrl: tutUrl,
              tutorialContent: tutContent,
              tutorialSolutions: tutSols,
            });
          }
        }
      }
    }

    // Link submissions.problem_id FK for V2 (batch update)
    if (useV2 && newSubmissions.length > 0) {
      for (const sub of newSubmissions) {
        const dbProblemId = problemIdToDbId.get(sub.external_problem_id);
        if (!dbProblemId || !sub.external_submission_id) continue;
        // Fire-and-forget; non-critical
        supabaseAdmin
          .from(V2_TABLES.SUBMISSIONS)
          .update({ problem_id: dbProblemId })
          .eq('external_submission_id', sub.external_submission_id)
          .eq('platform_id', platformId)
          .then(({ error }) => {
            if (error)
              console.warn(
                '[BULK-IMPORT] submission problem_id link failed:',
                error.message
              );
          });
      }
    }

    // ============================================================
    // STEP 6: HANDLE USER_PROBLEM_SOLVES (batch) - only for AC
    // ============================================================
    // Normalize verdict check to be case-insensitive
    const isAccepted = (verdict) => {
      if (!verdict) return false;
      const v = verdict.toUpperCase().trim();
      return v === 'AC' || v === 'OK' || v === 'ACCEPTED';
    };

    const acSubmissions = submissions.filter((s) => isAccepted(s.verdict));

    let solvesCreated = 0;
    let solutionsCreated = 0;
    let unsolvedAttemptsStored = 0;
    let unsolvedAttemptStorageAvailable = true;
    const problemToSolveId = new Map();
    const newlySolvedSubmissions = [];

    // Build a map from problem_id to the best AC submission with source code
    // (for storing solutions later)
    const problemToAcSubmission = new Map();
    for (const sub of acSubmissions) {
      if (sub.problem_id) {
        // Prefer submissions with source code
        const existing = problemToAcSubmission.get(sub.problem_id);
        if (!existing || (sub.source_code && !existing.source_code)) {
          problemToAcSubmission.set(sub.problem_id, sub);
        }
      }
    }

    if (useV2) {
      const allDbProblemIds = [
        ...new Set(
          problemIds.map((pid) => problemIdToDbId.get(pid)).filter(Boolean)
        ),
      ];

      if (allDbProblemIds.length > 0) {
        const { data: existingSolves, error: existingSolveError } =
          await supabaseAdmin
            .from(V2_TABLES.USER_SOLVES)
            .select('id, problem_id')
            .eq('user_id', userId)
            .in('problem_id', allDbProblemIds);

        if (existingSolveError) {
          console.warn(
            '[BULK-IMPORT] Existing solve lookup failed:',
            existingSolveError.message
          );
        } else {
          (existingSolves || []).forEach((s) =>
            problemToSolveId.set(s.problem_id, s.id)
          );
        }
      }
    }

    if (acSubmissions.length > 0) {
      // Get problems that were solved
      const solvedProblemIds = [
        ...new Set(acSubmissions.map((s) => s.problem_id).filter(Boolean)),
      ];

      // Get DB IDs for these problems
      const dbProblemIds = solvedProblemIds
        .map((pid) => problemIdToDbId.get(pid))
        .filter(Boolean);

      if (dbProblemIds.length > 0) {
        // Get existing solves
        const solvesTable = useV2
          ? V2_TABLES.USER_SOLVES
          : 'user_problem_solves';

        let existingSolves = [];
        if (useV2) {
          existingSolves = dbProblemIds
            .map((problemId) => ({
              problem_id: problemId,
              id: problemToSolveId.get(problemId),
            }))
            .filter((s) => s.id);
        } else {
          const { data } = await supabaseAdmin
            .from(solvesTable)
            .select('id, problem_id')
            .eq('user_id', userId)
            .in('problem_id', dbProblemIds);
          existingSolves = data || [];
          existingSolves.forEach((s) =>
            problemToSolveId.set(s.problem_id, s.id)
          );
        }

        const existingSolveIds = new Set(
          existingSolves.map((s) => s.problem_id)
        );

        // Create new solves - include problem_id in return for mapping
        const newSolves = [];
        const seenSolveIds = new Set();

        for (const sub of acSubmissions) {
          const dbProblemId = problemIdToDbId.get(sub.problem_id);
          if (
            !dbProblemId ||
            existingSolveIds.has(dbProblemId) ||
            seenSolveIds.has(dbProblemId)
          ) {
            continue;
          }
          seenSolveIds.add(dbProblemId);

          const submittedAt = sub.submitted_at
            ? new Date(sub.submitted_at).toISOString()
            : new Date().toISOString();

          newSolves.push({
            user_id: userId,
            problem_id: dbProblemId,
            first_solved_at: submittedAt,
            solve_count: 1,
          });
          newlySolvedSubmissions.push(sub);
        }

        if (newSolves.length > 0) {
          const { data: insertedSolves, error: solveError } =
            await supabaseAdmin
              .from(solvesTable)
              .insert(newSolves)
              .select('id, problem_id');

          if (solveError) {
            console.error(
              '[BULK-IMPORT] Solve insert error:',
              solveError.message
            );
          }

          if (!solveError && insertedSolves) {
            solvesCreated = insertedSolves.length;

            // Map newly created solves to their solve IDs
            insertedSolves.forEach((s) =>
              problemToSolveId.set(s.problem_id, s.id)
            );
          }
        }

        // ============================================================
        // STEP 6b: STORE SOLUTIONS (source code) for V2 schema
        // ============================================================
        if (useV2) {
          // Step 6b.1: Ensure each solved problem has a primary AC solution when possible.
          const primarySolutionsToStore = [];

          for (const [externalProblemId, sub] of problemToAcSubmission) {
            if (!sub.source_code) continue;

            const dbProblemId = problemIdToDbId.get(externalProblemId);
            if (!dbProblemId) continue;

            const userSolveId = problemToSolveId.get(dbProblemId);
            if (!userSolveId) continue;

            const submissionRecord = submissionRecordByExternalId.get(
              sub.submission_id?.toString()
            );
            if (!submissionRecord?.id) continue;

            const submittedAt = submissionRecord.submitted_at
              ? new Date(submissionRecord.submitted_at).toISOString()
              : sub.submitted_at
                ? new Date(sub.submitted_at).toISOString()
                : new Date().toISOString();

            primarySolutionsToStore.push({
              user_solve_id: userSolveId,
              submission_id: submissionRecord.id,
              source_code: sub.source_code,
              language_id:
                submissionRecord.language_id ||
                languageMap.get(sub.language) ||
                null,
              verdict: submissionRecord.verdict || sub.verdict || 'AC',
              is_primary: true,
              submitted_at: submittedAt,
              created_at: submittedAt,
            });
          }

          if (primarySolutionsToStore.length > 0) {
            const solveIdsWithCode = primarySolutionsToStore.map(
              (s) => s.user_solve_id
            );
            const { data: existingPrimarySolutions } = await supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .select('user_solve_id')
              .in('user_solve_id', solveIdsWithCode)
              .eq('is_primary', true);

            const solvesWithPrimary = new Set(
              existingPrimarySolutions?.map((s) => s.user_solve_id) || []
            );

            const newPrimarySolutions = primarySolutionsToStore.filter(
              (s) => !solvesWithPrimary.has(s.user_solve_id)
            );

            if (newPrimarySolutions.length > 0) {
              const { data: insertedPrimarySolutions, error: solutionError } =
                await supabaseAdmin
                  .from(V2_TABLES.SOLUTIONS)
                  .insert(newPrimarySolutions)
                  .select('id');

              if (solutionError) {
                console.error(
                  '[BULK-IMPORT] Primary solution insert error:',
                  solutionError.message
                );
              } else {
                solutionsCreated +=
                  insertedPrimarySolutions?.length ||
                  newPrimarySolutions.length;
              }
            }
          }
        }
      }
    }

    // Step 6b.2 + 6c: Store source code for all submissions
    // - If problem is solved, link into solutions.
    // - Otherwise, keep a dedicated unsolved attempt record.
    if (useV2) {
      const additionalBySubmissionId = new Map();
      const unsolvedAttemptBySubmissionId = new Map();

      for (const sub of submissions) {
        if (!sub.source_code || !sub.problem_id) continue;

        const dbProblemId = problemIdToDbId.get(sub.problem_id);
        if (!dbProblemId) continue;

        const submissionRecord = submissionRecordByExternalId.get(
          sub.submission_id?.toString()
        );
        if (!submissionRecord?.id) continue;

        const submittedAt = submissionRecord.submitted_at
          ? new Date(submissionRecord.submitted_at).toISOString()
          : sub.submitted_at
            ? new Date(sub.submitted_at).toISOString()
            : new Date().toISOString();

        const userSolveId = problemToSolveId.get(dbProblemId);

        if (userSolveId) {
          if (!additionalBySubmissionId.has(submissionRecord.id)) {
            additionalBySubmissionId.set(submissionRecord.id, {
              user_solve_id: userSolveId,
              submission_id: submissionRecord.id,
              source_code: sub.source_code,
              language_id:
                submissionRecord.language_id ||
                languageMap.get(sub.language) ||
                null,
              verdict: submissionRecord.verdict || sub.verdict || null,
              is_primary: false,
              submitted_at: submittedAt,
              created_at: submittedAt,
            });
          }
          continue;
        }

        const verdictValue =
          submissionRecord.verdict || sub.verdict || 'UNKNOWN';
        if (isAccepted(verdictValue)) {
          continue;
        }

        if (!unsolvedAttemptBySubmissionId.has(submissionRecord.id)) {
          unsolvedAttemptBySubmissionId.set(submissionRecord.id, {
            user_id: userId,
            platform_id: platformId,
            problem_id: dbProblemId,
            submission_id: submissionRecord.id,
            external_problem_id:
              submissionRecord.external_problem_id || sub.problem_id,
            problem_name:
              submissionRecord.problem_name ||
              sub.problem_name ||
              sub.problem_id ||
              null,
            source_code: sub.source_code,
            language_id:
              submissionRecord.language_id ||
              languageMap.get(sub.language) ||
              null,
            verdict: verdictValue,
            execution_time_ms:
              submissionRecord.execution_time_ms ??
              sub.execution_time_ms ??
              null,
            memory_kb: submissionRecord.memory_kb ?? sub.memory_kb ?? null,
            submitted_at: submittedAt,
            updated_at: new Date().toISOString(),
          });
        }
      }

      const additionalSolutions = Array.from(additionalBySubmissionId.values());

      if (additionalSolutions.length > 0) {
        const submissionIdsWithCode = additionalSolutions.map(
          (s) => s.submission_id
        );

        const { data: existingSubmissionLinkedSolutions } = await supabaseAdmin
          .from(V2_TABLES.SOLUTIONS)
          .select('submission_id')
          .in('submission_id', submissionIdsWithCode);

        const existingSubmissionIds = new Set(
          (existingSubmissionLinkedSolutions || [])
            .map((s) => s.submission_id)
            .filter(Boolean)
        );

        const newAdditionalSolutions = additionalSolutions.filter(
          (s) => !existingSubmissionIds.has(s.submission_id)
        );

        if (newAdditionalSolutions.length > 0) {
          const { data: insertedAdditionalSolutions, error: additionalError } =
            await supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .insert(newAdditionalSolutions)
              .select('id');

          if (additionalError) {
            console.error(
              '[BULK-IMPORT] Additional solution insert error:',
              additionalError.message
            );
          } else {
            solutionsCreated +=
              insertedAdditionalSolutions?.length ||
              newAdditionalSolutions.length;
          }
        }
      }

      const unsolvedAttempts = Array.from(
        unsolvedAttemptBySubmissionId.values()
      );
      if (unsolvedAttempts.length > 0) {
        const { data: upsertedAttempts, error: unsolvedAttemptError } =
          await supabaseAdmin
            .from(V2_TABLES.UNSOLVED_ATTEMPTS)
            .upsert(unsolvedAttempts, { onConflict: 'submission_id' })
            .select('id');

        if (unsolvedAttemptError) {
          if (isMissingUnsolvedAttemptsTableError(unsolvedAttemptError)) {
            unsolvedAttemptStorageAvailable = false;
            console.warn(
              '[BULK-IMPORT] unsolved_attempts table not available; apply latest migrations to enable dedicated unsolved attempt storage.'
            );
          } else {
            console.error(
              '[BULK-IMPORT] Unsolved attempt upsert error:',
              unsolvedAttemptError.message
            );
          }
        } else {
          unsolvedAttemptsStored +=
            upsertedAttempts?.length || unsolvedAttempts.length;
        }
      }
    }

    // ============================================================
    // STEP 7: UPDATE AGGREGATE STATISTICS (V2 only)
    // ============================================================
    if (
      useV2 &&
      (submissionsCreated > 0 ||
        submissionsUpdated > 0 ||
        solvesCreated > 0 ||
        solutionsCreated > 0)
    ) {
      if (solvesCreated > 0 || solutionsCreated > 0) {
        try {
          // user_stats: increment total_solved and total_solutions
          const { data: currentStats } = await supabaseAdmin
            .from(V2_TABLES.USER_STATS)
            .select('total_solved, total_solutions')
            .eq('user_id', userId)
            .single();

          if (currentStats) {
            await supabaseAdmin
              .from(V2_TABLES.USER_STATS)
              .update({
                total_solved: (currentStats.total_solved || 0) + solvesCreated,
                total_solutions:
                  (currentStats.total_solutions || 0) + solutionsCreated,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
          } else {
            await supabaseAdmin.from(V2_TABLES.USER_STATS).insert({
              user_id: userId,
              total_solved: solvesCreated,
              total_solutions: solutionsCreated,
            });
          }
        } catch (statsErr) {
          console.warn(
            '[BULK-IMPORT] user_stats update failed:',
            statsErr.message
          );
        }
      }

      // user_platform_stats: increment problems_solved
      try {
        const { data: platStats } = await supabaseAdmin
          .from(V2_TABLES.USER_PLATFORM_STATS)
          .select('problems_solved, submissions_count')
          .eq('user_id', userId)
          .eq('platform_id', platformId)
          .single();

        if (platStats) {
          await supabaseAdmin
            .from(V2_TABLES.USER_PLATFORM_STATS)
            .update({
              problems_solved: (platStats.problems_solved || 0) + solvesCreated,
              submissions_count:
                (platStats.submissions_count || 0) + submissionsCreated,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('platform_id', platformId);
        } else {
          await supabaseAdmin.from(V2_TABLES.USER_PLATFORM_STATS).insert({
            user_id: userId,
            platform_id: platformId,
            problems_solved: solvesCreated,
            submissions_count: submissionsCreated,
            last_synced_at: new Date().toISOString(),
          });
        }
      } catch (platErr) {
        console.warn(
          '[BULK-IMPORT] user_platform_stats update failed:',
          platErr.message
        );
      }

      // user_tier_stats, user_language_stats, user_tag_stats, user_daily_activity
      // Compute deltas from newly created solves only.
      if (solvesCreated > 0) {
        const tierCountDeltas = new Map(); // tierId → count
        const langCountDeltas = new Map(); // langId → count
        const tagCountDeltas = new Map(); // tagId  → count
        const dailyDeltas = new Map(); // dateStr → { solved, submissions }

        for (const sub of newlySolvedSubmissions) {
          if (!sub.problem_id) continue;
          const dbProblemId = problemIdToDbId.get(sub.problem_id);
          if (!dbProblemId) continue;

          // Tier delta
          if (sub.difficulty_rating != null) {
            const tierId = await getTierIdForRating(
              Number(sub.difficulty_rating)
            );
            if (tierId != null)
              tierCountDeltas.set(
                tierId,
                (tierCountDeltas.get(tierId) || 0) + 1
              );
          }

          // Language delta
          const langId = languageMap.get(sub.language);
          if (langId != null)
            langCountDeltas.set(langId, (langCountDeltas.get(langId) || 0) + 1);

          // Tag deltas (from problem_tags joined)
          try {
            const { data: ptRows } = await supabaseAdmin
              .from(V2_TABLES.PROBLEM_TAGS)
              .select('tag_id')
              .eq('problem_id', dbProblemId);
            for (const pt of ptRows || []) {
              if (pt.tag_id)
                tagCountDeltas.set(
                  pt.tag_id,
                  (tagCountDeltas.get(pt.tag_id) || 0) + 1
                );
            }
          } catch {}

          // Daily delta
          const dateStr = sub.submitted_at
            ? new Date(sub.submitted_at).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
          const existing = dailyDeltas.get(dateStr) || {
            solved: 0,
            submissions: 0,
          };
          existing.solved++;
          existing.submissions++;
          dailyDeltas.set(dateStr, existing);
        }

        // Upsert user_tier_stats deltas
        for (const [tierId, delta] of tierCountDeltas) {
          try {
            const { data: row } = await supabaseAdmin
              .from(V2_TABLES.USER_TIER_STATS)
              .select('solved_count')
              .eq('user_id', userId)
              .eq('difficulty_tier_id', tierId)
              .single();

            if (row) {
              await supabaseAdmin
                .from(V2_TABLES.USER_TIER_STATS)
                .update({
                  solved_count: (row.solved_count || 0) + delta,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('difficulty_tier_id', tierId);
            } else {
              await supabaseAdmin.from(V2_TABLES.USER_TIER_STATS).insert({
                user_id: userId,
                difficulty_tier_id: tierId,
                solved_count: delta,
              });
            }
          } catch (e) {
            console.warn(
              '[BULK-IMPORT] user_tier_stats delta failed:',
              e.message
            );
          }
        }

        // Upsert user_language_stats deltas
        for (const [langId, delta] of langCountDeltas) {
          try {
            const { data: row } = await supabaseAdmin
              .from(V2_TABLES.USER_LANGUAGE_STATS)
              .select('solved_count')
              .eq('user_id', userId)
              .eq('language_id', langId)
              .single();

            if (row) {
              await supabaseAdmin
                .from(V2_TABLES.USER_LANGUAGE_STATS)
                .update({
                  solved_count: (row.solved_count || 0) + delta,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('language_id', langId);
            } else {
              await supabaseAdmin.from(V2_TABLES.USER_LANGUAGE_STATS).insert({
                user_id: userId,
                language_id: langId,
                solved_count: delta,
              });
            }
          } catch (e) {
            console.warn(
              '[BULK-IMPORT] user_language_stats delta failed:',
              e.message
            );
          }
        }

        // Upsert user_tag_stats deltas
        if (tagCountDeltas.size > 0) {
          const tagIds = Array.from(tagCountDeltas.keys());
          await updateUserTagStats(userId, tagIds, {
            solved: 1,
            attempted: 1,
          });
        }

        // Upsert user_daily_activity per date
        for (const [dateStr, delta] of dailyDeltas) {
          await updateUserDailyActivity(
            userId,
            platformId,
            {
              problemsSolved: delta.solved,
              submissionsCount: delta.submissions,
            },
            dateStr
          );
        }

        // Recalculate streaks after daily activity bulk-write
        if (dailyDeltas.size > 0) {
          await recalcUserStreaks(userId);
        }
      }
    }

    // ============================================================
    // STEP 7B: CALCULATE AND PERSIST WEIGHTED SCORE (V2 only)
    // ============================================================
    if (useV2) {
      try {
        // Fetch all problems the user has solved to calculate weighted score
        const { data: difficultyStats } = await supabaseAdmin
          .from(V2_TABLES.USER_SOLVES)
          .select('problems!inner(difficulty_rating)')
          .eq('user_id', userId);

        // Calculate difficulty counts
        const diffCounts = {
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

        for (const stat of difficultyStats || []) {
          const r = stat.problems?.difficulty_rating;
          if (!r) continue;
          if (r >= 2500) diffCounts.solved_2500_plus++;
          else if (r >= 2400) diffCounts.solved_2400++;
          else if (r >= 2300) diffCounts.solved_2300++;
          else if (r >= 2200) diffCounts.solved_2200++;
          else if (r >= 2100) diffCounts.solved_2100++;
          else if (r >= 2000) diffCounts.solved_2000++;
          else if (r >= 1900) diffCounts.solved_1900++;
          else if (r >= 1800) diffCounts.solved_1800++;
          else if (r >= 1700) diffCounts.solved_1700++;
          else if (r >= 1600) diffCounts.solved_1600++;
          else if (r >= 1500) diffCounts.solved_1500++;
          else if (r >= 1400) diffCounts.solved_1400++;
          else if (r >= 1300) diffCounts.solved_1300++;
          else if (r >= 1200) diffCounts.solved_1200++;
          else if (r >= 1100) diffCounts.solved_1100++;
          else if (r >= 1000) diffCounts.solved_1000++;
          else if (r >= 900) diffCounts.solved_900++;
          else if (r >= 800) diffCounts.solved_800++;
        }

        // Calculate weighted score
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

        let weightedScore = 0;
        Object.entries(weights).forEach(([key, weight]) => {
          weightedScore += (diffCounts[key] || 0) * weight;
        });

        // Update user_stats with weighted_score
        await supabaseAdmin.from(V2_TABLES.USER_STATS).upsert(
          {
            user_id: userId,
            weighted_score: weightedScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        console.log(`[BULK-IMPORT] Updated weighted_score: ${weightedScore}`);
      } catch (e) {
        console.warn(
          '[BULK-IMPORT] weighted_score calculation failed:',
          e.message
        );
      }
    }

    // ============================================================
    // STEP 8: UPDATE SYNC TIMESTAMP
    // ============================================================
    // useV2 already available from earlier in the function
    if (useV2) {
      if (platformId) {
        await supabaseAdmin
          .from(V2_TABLES.USER_HANDLES)
          .update({ last_synced_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('platform_id', platformId);
      }
    } else {
      await supabaseAdmin
        .from('user_handles')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('platform', normalizedPlatform);
    }

    const duration = Date.now() - startTime;

    logBulkImportTest('request_success', {
      userId,
      platform: normalizedPlatform,
      useV2,
      submissionsReceived,
      submissionsAccepted: submissions.length,
      submissionsRejected: submissionsReceived - submissions.length,
      submissionsCreated,
      submissionsUpdated,
      problemsCreated,
      solvesCreated,
      solutionsCreated,
      unsolvedAttemptsStored,
      durationMs: duration,
    });

    // Revalidate the problem-solving pages so UI shows latest data
    revalidatePath('/account/member/problem-solving');
    revalidatePath('/account/member/problem-solving/[userId]', 'page');

    return NextResponse.json(
      {
        success: true,
        data: {
          submissionsReceived,
          submissionsAccepted: submissions.length,
          submissionsRejected: submissionsReceived - submissions.length,
          rejectedLeetCodeSubmissions,
          submissionsCreated,
          submissionsUpdated,
          problemsCreated,
          solvesCreated,
          solutionsCreated,
          unsolvedAttemptsStored,
          unsolvedAttemptStorageAvailable,
          duration: `${duration}ms`,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logBulkImportTest('request_error', {
      message: error?.message || String(error),
    });
    console.error('[BULK-IMPORT] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
