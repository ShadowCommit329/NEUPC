/**
 * Problem Solving API - Extension Sync Endpoint
 * POST /api/problem-solving/extension-sync
 * Receives rich submission data from browser extension and processes it
 *
 * Supports V2 schema with fallback to legacy schema.
 *
 * This endpoint:
 * 1. Upserts problem data into problems table
 * 2. Upserts user solve data into user_solves table
 * 3. Creates new solution record with versioning
 * 4. Records submission data
 * 5. Triggers AI analysis and updates statistics
 * 6. Supports multiple platforms via browser extension
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/app/_lib/auth';
import { supabaseAdmin } from '@/app/_lib/supabase';
import { getCachedUserByEmail } from '@/app/_lib/data-service';
import {
  V2_TABLES,
  isV2SchemaAvailable,
  getPlatformId,
  recordSubmissionV2,
  getLanguageId,
  getTierIdForRating,
  updateUserDailyActivity,
  recalcUserStreaks,
  updateUserTagStats,
  upsertProblemEditorial,
} from '@/app/_lib/problem-solving-v2-helpers.js';

// Platforms supported by browser extension
// These are platforms where direct API doesn't work well or requires authentication
const EXTENSION_SUPPORTED_PLATFORMS = [
  'codeforces', // Primary - full support
  'atcoder', // Extension can capture submissions
  'leetcode', // Extension can capture submissions (GraphQL limited)
  'toph', // Extension can capture submissions
  'cses', // Extension can capture (login required for full data)
  'codechef', // Extension can capture submissions
  'hackerrank', // Extension can capture submissions
  'kattis', // Extension can capture submissions
  'spoj', // Extension needed due to Cloudflare blocking
  'uva', // Extension can capture submissions
  'lightoj', // Extension can capture submissions
  'vjudge', // Extension can capture submissions
  'cfgym', // Extension can capture gym submissions
  'beecrowd', // Extension can capture submissions
  'dmoj', // Extension can capture submissions
];

// Rate limit: 1 second between submissions
const SUBMISSION_COOLDOWN_MS = 1000;

const MIN_REASONABLE_SUBMISSION_MS = Date.parse('2005-01-01T00:00:00.000Z');
const MAX_SUBMISSION_FUTURE_DRIFT_MS = 24 * 60 * 60 * 1000;
const ACCEPTED_SOURCE_PLACEHOLDER =
  '// Source code unavailable from extension capture. Run full import to attach source code.';

function logExtensionSyncTest(event, payload = {}) {
  console.warn(`[EXTENSION-SYNC][TEST] ${event}`, payload);
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

function normalizeVJudgeSubmissionId(value) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.replace(/^vj_/i, '');
  return normalized ? `vj_${normalized}` : null;
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

function normalizeVerdict(input) {
  const raw = (input || '').toString().trim();
  if (!raw) return 'AC';

  const upper = raw.toUpperCase();
  if (upper === 'OK' || upper === 'ACCEPTED') return 'AC';
  return upper;
}

function isAcceptedVerdict(verdict) {
  return verdict === 'AC';
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

function slugifyTagCode(tagName) {
  return (tagName || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

async function upsertProblemTags(problemUuid, tagNames) {
  const cleaned = (tagNames || [])
    .map((t) => (t || '').toString().trim())
    .filter(Boolean);

  if (cleaned.length === 0) return;

  const tagRows = cleaned
    .map((name) => ({
      code: slugifyTagCode(name) || name.toLowerCase(),
      name,
      category: 'platform',
    }))
    .filter((t) => t.code);

  if (tagRows.length === 0) return;

  const { data: upsertedTags, error: tagError } = await supabaseAdmin
    .from(V2_TABLES.TAGS)
    .upsert(tagRows, { onConflict: 'code' })
    .select('id, code');

  if (tagError) {
    console.warn('[EXTENSION-SYNC] Failed to upsert tags:', tagError.message);
    return;
  }

  const tagIdByCode = new Map((upsertedTags || []).map((t) => [t.code, t.id]));

  const problemTagRows = tagRows
    .map((t) => ({
      problem_id: problemUuid,
      tag_id: tagIdByCode.get(t.code),
      source: 'extension',
    }))
    .filter((r) => r.tag_id);

  if (problemTagRows.length === 0) return;

  const { error: linkError } = await supabaseAdmin
    .from(V2_TABLES.PROBLEM_TAGS)
    .upsert(problemTagRows, { onConflict: 'problem_id,tag_id' });

  if (linkError) {
    console.warn(
      '[EXTENSION-SYNC] Failed to link problem tags:',
      linkError.message
    );
  }
}

export async function POST(request) {
  try {
    // Authenticate user via session or extension token
    let userId = null;
    const session = await auth();

    logExtensionSyncTest('request_received', {
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
      const body = await request.clone().json();
      const extensionToken = body.extensionToken;

      if (extensionToken) {
        const { data: tokenUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('extension_token', extensionToken)
          .single();

        if (tokenUser) {
          userId = tokenUser.id;
        }
      }
    }

    if (!userId) {
      logExtensionSyncTest('request_unauthorized', {
        reason: 'missing session and extension token user',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      platform,
      problemId,
      problemName,
      problemUrl,
      problemDescription,
      problemCategory,
      contestId,
      difficultyRating,
      tags = [],
      solutionCode,
      language,
      submissionId,
      submissionTime,
      verdict,
      executionTime,
      memoryUsage,
      // Tutorial / editorial data (optional, captured by extension)
      tutorialUrl,
      tutorialContent,
      tutorialSolutions,
    } = body;

    const normalizedVerdict = normalizeVerdict(verdict);
    const hasSolutionCode =
      typeof solutionCode === 'string' && solutionCode.trim().length > 0;
    const normalizedLanguage =
      typeof language === 'string' && language.trim().length > 0
        ? language.trim()
        : null;
    const requiresAcceptedSourceFallback =
      isAcceptedVerdict(normalizedVerdict) && !hasSolutionCode;
    const effectiveSolutionCode = hasSolutionCode
      ? solutionCode
      : requiresAcceptedSourceFallback
        ? ACCEPTED_SOURCE_PLACEHOLDER
        : null;
    const effectiveLanguage = normalizedLanguage || 'Unknown';

    const normalizedProblemDescription =
      problemDescription ??
      body.problem_description ??
      body.description ??
      null;

    const inputFormat = body.inputFormat ?? body.input_format ?? null;
    const outputFormat = body.outputFormat ?? body.output_format ?? null;
    const constraints = body.constraints ?? null;
    const examples = Array.isArray(body.examples)
      ? body.examples
      : Array.isArray(body.sample_tests)
        ? body.sample_tests
        : [];
    const notes = body.notes ?? null;
    const timeLimitMs =
      body.timeLimitMs ?? body.time_limit_ms ?? body.timeLimit ?? null;
    const memoryLimitKb =
      body.memoryLimitKb ?? body.memory_limit_kb ?? body.memoryLimit ?? null;

    logExtensionSyncTest('payload_summary', {
      platform: platform || null,
      problemId: problemId || null,
      submissionId: submissionId || null,
      verdict: normalizedVerdict || null,
      language: effectiveLanguage || null,
      hasSolutionCode,
      codeLength: hasSolutionCode ? solutionCode.length : 0,
      usedSourcePlaceholder: requiresAcceptedSourceFallback,
      tagsCount: Array.isArray(tags) ? tags.length : 0,
      examplesCount: Array.isArray(examples) ? examples.length : 0,
      hasTutorial:
        !!tutorialUrl ||
        !!tutorialContent ||
        (Array.isArray(tutorialSolutions) && tutorialSolutions.length > 0),
    });

    // Validate required fields
    if (!platform || !problemId || !problemName) {
      logExtensionSyncTest('validation_failed_missing_required', {
        hasPlatform: !!platform,
        hasProblemId: !!problemId,
        hasProblemName: !!problemName,
        hasSolutionCode,
        hasLanguage: !!normalizedLanguage,
      });
      return NextResponse.json(
        {
          error: 'Missing required fields: platform, problemId, problemName',
        },
        { status: 400 }
      );
    }

    // Validate platform - check if supported by extension
    const normalizedPlatform = platform.toLowerCase();
    if (!EXTENSION_SUPPORTED_PLATFORMS.includes(normalizedPlatform)) {
      logExtensionSyncTest('validation_failed_unsupported_platform', {
        platform,
      });
      return NextResponse.json(
        {
          error: `Unsupported platform: ${platform}. Supported platforms: ${EXTENSION_SUPPORTED_PLATFORMS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const useV2 = await isV2SchemaAvailable();
    logExtensionSyncTest('schema_selected', {
      useV2,
      userId,
      platform: normalizedPlatform,
    });

    // Verify user has this platform handle connected
    if (useV2) {
      const platformId = await getPlatformId(normalizedPlatform);
      const { data: userHandle } = await supabaseAdmin
        .from(V2_TABLES.USER_HANDLES)
        .select('handle')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .single();

      if (!userHandle) {
        logExtensionSyncTest('validation_failed_missing_handle', {
          schema: 'v2',
          platform: normalizedPlatform,
          userId,
        });
        return NextResponse.json(
          {
            error: `No ${normalizedPlatform} handle connected. Please connect your handle first.`,
          },
          { status: 400 }
        );
      }
    } else {
      const { data: userHandle } = await supabaseAdmin
        .from('user_handles')
        .select('handle')
        .eq('user_id', userId)
        .eq('platform', normalizedPlatform)
        .single();

      if (!userHandle) {
        logExtensionSyncTest('validation_failed_missing_handle', {
          schema: 'legacy',
          platform: normalizedPlatform,
          userId,
        });
        return NextResponse.json(
          {
            error: `No ${normalizedPlatform} handle connected. Please connect your handle first.`,
          },
          { status: 400 }
        );
      }
    }

    if (useV2) {
      logExtensionSyncTest('dispatch_handler', {
        handler: 'v2',
        platform: normalizedPlatform,
        problemId,
        submissionId: submissionId || null,
      });
      return await handleV2Sync(userId, {
        platform: normalizedPlatform,
        problemId,
        problemName,
        problemUrl,
        problemDescription: normalizedProblemDescription,
        contestId,
        difficultyRating,
        tags,
        solutionCode: effectiveSolutionCode,
        language: effectiveLanguage,
        sourceCodeCaptured: hasSolutionCode,
        submissionId,
        submissionTime,
        verdict: normalizedVerdict,
        executionTime,
        memoryUsage,
        inputFormat,
        outputFormat,
        constraints,
        examples,
        notes,
        timeLimitMs,
        memoryLimitKb,
        tutorialUrl,
        tutorialContent,
        tutorialSolutions,
      });
    } else {
      logExtensionSyncTest('dispatch_handler', {
        handler: 'legacy',
        platform: normalizedPlatform,
        problemId,
        submissionId: submissionId || null,
      });
      return await handleLegacySync(userId, {
        platform: normalizedPlatform,
        problemId,
        problemName,
        problemUrl,
        problemDescription: normalizedProblemDescription,
        contestId,
        difficultyRating,
        tags,
        solutionCode: effectiveSolutionCode,
        language: effectiveLanguage,
        submissionId,
        submissionTime,
        verdict: normalizedVerdict,
        executionTime,
        memoryUsage,
        inputFormat,
        outputFormat,
        constraints,
        examples,
        notes,
        timeLimitMs,
        memoryLimitKb,
        tutorialUrl,
        tutorialContent,
        tutorialSolutions,
      });
    }
  } catch (error) {
    logExtensionSyncTest('request_error', {
      message: error?.message || String(error),
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleV2Sync(userId, data) {
  const {
    platform,
    problemId,
    problemName,
    problemUrl,
    problemDescription,
    contestId,
    difficultyRating,
    tags,
    solutionCode,
    language,
    sourceCodeCaptured = true,
    submissionId,
    submissionTime,
    verdict,
    executionTime,
    memoryUsage,
    inputFormat,
    outputFormat,
    constraints,
    examples,
    notes,
    timeLimitMs,
    memoryLimitKb,
    tutorialUrl,
    tutorialContent,
    tutorialSolutions,
  } = data;

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  const normalizedProblemId =
    normalizedPlatform === 'leetcode'
      ? normalizeLeetCodeProblemSlug(problemId)
      : String(problemId || '').trim();
  const normalizedSubmissionIdRaw = submissionId
    ? String(submissionId).trim()
    : null;
  const normalizedSubmissionId =
    normalizedPlatform === 'vjudge'
      ? normalizeVJudgeSubmissionId(normalizedSubmissionIdRaw)
      : normalizedSubmissionIdRaw;
  const normalizedSubmittedAt = normalizeSubmissionTimestamp(submissionTime);

  logExtensionSyncTest('v2_input_normalized', {
    userId,
    platform,
    problemId: normalizedProblemId,
    submissionId: normalizedSubmissionId,
    submittedAt: normalizedSubmittedAt,
    verdict: normalizeVerdict(verdict),
    codeLength: typeof solutionCode === 'string' ? solutionCode.length : 0,
    sourceCodeCaptured,
    tagsCount: Array.isArray(tags) ? tags.length : 0,
    examplesCount: Array.isArray(examples) ? examples.length : 0,
  });

  if (!normalizedProblemId) {
    return NextResponse.json(
      { error: 'Invalid problemId format' },
      { status: 400 }
    );
  }

  if (normalizedPlatform === 'leetcode') {
    if (!normalizedSubmissionId) {
      return NextResponse.json(
        {
          error:
            'LeetCode submissions require a valid submissionId from Practice History.',
        },
        { status: 400 }
      );
    }

    if (
      normalizedSubmissionId &&
      isSyntheticLeetCodeSubmissionId(normalizedSubmissionId)
    ) {
      return NextResponse.json(
        {
          error:
            'Rejected synthetic LeetCode submission. Please sync only real Practice History submissions.',
        },
        { status: 400 }
      );
    }

    if (!normalizedSubmittedAt) {
      return NextResponse.json(
        {
          error:
            'LeetCode submissions require a valid submissionTime from Practice History.',
        },
        { status: 400 }
      );
    }
  }

  if (normalizedPlatform === 'cses') {
    if (!normalizedSubmissionId || !/^\d+$/.test(normalizedSubmissionId)) {
      return NextResponse.json(
        {
          error:
            'CSES submissions require a numeric submissionId from the status/result page.',
        },
        { status: 400 }
      );
    }

    if (!normalizedSubmittedAt) {
      return NextResponse.json(
        {
          error:
            'CSES submissions require a valid submissionTime from the CSES status/result page.',
        },
        { status: 400 }
      );
    }
  }

  // Get platform_id
  const platformId = await getPlatformId(normalizedPlatform);
  if (!platformId) {
    throw new Error(`Unknown platform: ${normalizedPlatform}`);
  }

  // Apply rate limit
  const { data: lastSolution } = await supabaseAdmin
    .from(V2_TABLES.SOLUTIONS)
    .select(
      `
      created_at,
      user_solves!inner(user_id)
    `
    )
    .eq('user_solves.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastSolution?.created_at) {
    const timeSinceSubmission =
      Date.now() - new Date(lastSolution.created_at).getTime();
    if (timeSinceSubmission < SUBMISSION_COOLDOWN_MS) {
      const waitTime = Math.ceil(
        (SUBMISSION_COOLDOWN_MS - timeSinceSubmission) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${waitTime} second(s) before submitting again`,
        },
        { status: 429 }
      );
    }
  }

  const submittedAt =
    normalizedPlatform === 'cses'
      ? normalizedSubmittedAt
      : normalizedSubmittedAt || new Date().toISOString();
  const normalizedVerdict = normalizeVerdict(verdict);

  // Step 1: Upsert problem data (normalized schema)
  const normalizedRating =
    difficultyRating !== undefined && difficultyRating !== null
      ? Math.round(Number(difficultyRating))
      : null;
  const difficultyTierId = await getTierIdForRating(normalizedRating);

  const { data: existingProblem } = await supabaseAdmin
    .from(V2_TABLES.PROBLEMS)
    .select('id, url, contest_id, difficulty_rating')
    .eq('platform_id', platformId)
    .eq('external_id', normalizedProblemId)
    .single();

  let problem = null;

  if (existingProblem) {
    const updatePayload = {
      name: problemName,
      updated_at: new Date().toISOString(),
    };

    if (problemUrl) updatePayload.url = problemUrl;
    if (contestId) updatePayload.contest_id = contestId;
    if (problemDescription) updatePayload.description = problemDescription;
    if (inputFormat) updatePayload.input_format = inputFormat;
    if (outputFormat) updatePayload.output_format = outputFormat;
    if (constraints) updatePayload.constraints = constraints;
    if (Array.isArray(examples) && examples.length > 0) {
      updatePayload.examples = examples;
    }
    if (notes) updatePayload.notes = notes;
    if (tutorialUrl) updatePayload.tutorial_url = tutorialUrl;
    if (tutorialContent) updatePayload.tutorial_content = tutorialContent;
    if (Array.isArray(tutorialSolutions) && tutorialSolutions.length > 0) {
      updatePayload.tutorial_solutions = tutorialSolutions;
    }

    const normalizedTimeLimitMs = Number(timeLimitMs);
    if (Number.isFinite(normalizedTimeLimitMs)) {
      updatePayload.time_limit_ms = Math.round(normalizedTimeLimitMs);
    }

    const normalizedMemoryLimitKb = Number(memoryLimitKb);
    if (Number.isFinite(normalizedMemoryLimitKb)) {
      updatePayload.memory_limit_kb = Math.round(normalizedMemoryLimitKb);
    }

    if (normalizedRating !== null) {
      updatePayload.difficulty_rating = normalizedRating;
      updatePayload.difficulty_tier_id = difficultyTierId;
    }

    const { data: updatedProblem, error: updateError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .update(updatePayload)
      .eq('id', existingProblem.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update problem: ${updateError.message}`);
    }
    problem = updatedProblem;
  } else {
    const { data: newProblem, error: createError } = await supabaseAdmin
      .from(V2_TABLES.PROBLEMS)
      .insert({
        platform_id: platformId,
        external_id: normalizedProblemId,
        contest_id: contestId || null,
        name: problemName,
        url: problemUrl || null,
        description: problemDescription || null,
        input_format: inputFormat || null,
        output_format: outputFormat || null,
        constraints: constraints || null,
        examples: Array.isArray(examples) ? examples : [],
        notes: notes || null,
        tutorial_url: tutorialUrl || null,
        tutorial_content: tutorialContent || null,
        tutorial_solutions: Array.isArray(tutorialSolutions)
          ? tutorialSolutions
          : [],
        time_limit_ms: Number.isFinite(Number(timeLimitMs))
          ? Math.round(Number(timeLimitMs))
          : null,
        memory_limit_kb: Number.isFinite(Number(memoryLimitKb))
          ? Math.round(Number(memoryLimitKb))
          : null,
        difficulty_rating: normalizedRating,
        difficulty_tier_id: difficultyTierId,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create problem: ${createError.message}`);
    }
    problem = newProblem;
  }

  // Link tags for filtering & topic mastery
  await upsertProblemTags(problem.id, tags);

  // Step 1.5: Record submission (normalized schema)
  let submission = null;
  if (normalizedSubmissionId) {
    try {
      submission = await recordSubmissionV2(userId, normalizedPlatform, {
        external_submission_id: normalizedSubmissionId,
        external_problem_id: normalizedProblemId,
        problem_name: problemName,
        verdict: normalizedVerdict,
        language,
        execution_time_ms: executionTime ? parseInt(executionTime) : null,
        memory_kb: memoryUsage ? parseInt(memoryUsage) : null,
        submitted_at: submittedAt,
        problem_uuid: problem.id,
      });
    } catch (submissionRecordError) {
      console.warn(
        '[EXTENSION-SYNC] Failed to record submission:',
        submissionRecordError.message
      );
    }
  }

  // Only create solve records for accepted submissions.
  // For non-AC submissions, still persist code when this problem was solved before.
  if (!isAcceptedVerdict(normalizedVerdict)) {
    let codeLinked = false;
    let unsolvedAttemptRecorded = false;
    let unsolvedAttemptStorageAvailable = true;

    if (sourceCodeCaptured && solutionCode && submission?.id) {
      try {
        const { data: existingSolveForProblem } = await supabaseAdmin
          .from(V2_TABLES.USER_SOLVES)
          .select('id')
          .eq('user_id', userId)
          .eq('problem_id', problem.id)
          .maybeSingle();

        if (existingSolveForProblem?.id) {
          const { data: existingSubmissionSolution } = await supabaseAdmin
            .from(V2_TABLES.SOLUTIONS)
            .select('id')
            .eq('submission_id', submission.id)
            .maybeSingle();

          if (!existingSubmissionSolution) {
            const attemptLanguageId = await getLanguageId(language);
            const { error: attemptSolutionError } = await supabaseAdmin
              .from(V2_TABLES.SOLUTIONS)
              .insert({
                user_solve_id: existingSolveForProblem.id,
                submission_id: submission.id,
                source_code: solutionCode,
                language_id: attemptLanguageId,
                verdict: normalizedVerdict,
                is_primary: false,
                submitted_at: submittedAt,
                created_at: submittedAt,
              });

            if (attemptSolutionError) {
              console.warn(
                '[EXTENSION-SYNC] Failed to store non-AC code:',
                attemptSolutionError.message
              );
            } else {
              codeLinked = true;
            }
          } else {
            codeLinked = true;
          }
        } else {
          const attemptLanguageId = await getLanguageId(language);
          const { error: unsolvedAttemptError } = await supabaseAdmin
            .from(V2_TABLES.UNSOLVED_ATTEMPTS)
            .upsert(
              {
                user_id: userId,
                platform_id: platformId,
                problem_id: problem.id,
                submission_id: submission.id,
                external_problem_id: normalizedProblemId,
                problem_name: problemName,
                source_code: solutionCode,
                language_id: attemptLanguageId,
                verdict: normalizedVerdict,
                execution_time_ms: executionTime
                  ? parseInt(executionTime)
                  : null,
                memory_kb: memoryUsage ? parseInt(memoryUsage) : null,
                submitted_at: submittedAt,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'submission_id' }
            );

          if (unsolvedAttemptError) {
            if (isMissingUnsolvedAttemptsTableError(unsolvedAttemptError)) {
              unsolvedAttemptStorageAvailable = false;
              console.warn(
                '[EXTENSION-SYNC] unsolved_attempts table not available; apply latest migrations to enable dedicated unsolved attempt storage.'
              );
            } else {
              console.warn(
                '[EXTENSION-SYNC] Failed to store dedicated unsolved attempt:',
                unsolvedAttemptError.message
              );
            }
          } else {
            unsolvedAttemptRecorded = true;
          }
        }
      } catch (attemptLinkError) {
        console.warn(
          '[EXTENSION-SYNC] Non-AC code linking failed:',
          attemptLinkError.message
        );
      }
    }

    if (codeLinked || unsolvedAttemptRecorded) {
      revalidatePath('/account/member/problem-solving');
      revalidatePath('/account/member/problem-solving/[userId]', 'page');
    }

    let submissionMessage = `Submission recorded with verdict ${normalizedVerdict}. Not marked as solved.`;
    if (codeLinked) {
      submissionMessage = `Submission recorded with verdict ${normalizedVerdict}. Code linked to existing solve history.`;
    } else if (unsolvedAttemptRecorded) {
      submissionMessage = `Submission recorded with verdict ${normalizedVerdict}. Stored as dedicated unsolved attempt.`;
    } else if (!unsolvedAttemptStorageAvailable) {
      submissionMessage = `Submission recorded with verdict ${normalizedVerdict}. Apply latest database migrations to store dedicated unsolved attempts.`;
    }

    logExtensionSyncTest('v2_non_ac_recorded', {
      platform,
      problemId: problem.external_id,
      submissionId: normalizedSubmissionId || submissionId || null,
      verdict: normalizedVerdict,
      codeLinked,
      unsolvedAttemptRecorded,
      unsolvedAttemptStorageAvailable,
    });

    return NextResponse.json({
      success: true,
      schemaVersion: 'v2',
      data: {
        problem: {
          id: problem.id,
          platform,
          problemId: problem.external_id,
          problemName: problem.name,
        },
        submission: {
          submissionId,
          verdict: normalizedVerdict,
          recorded: !!submission,
          codeLinked,
          unsolvedAttemptRecorded,
          unsolvedAttemptStorageAvailable,
        },
        message: submissionMessage,
      },
    });
  }

  // Step 2: Upsert user solve entry (normalized schema)
  const { data: existingSolve } = await supabaseAdmin
    .from(V2_TABLES.USER_SOLVES)
    .select('id, solve_count, first_solved_at, best_time_ms, best_memory_kb')
    .eq('user_id', userId)
    .eq('problem_id', problem.id)
    .single();

  let userSolve = null;
  let isFirstSolve = false;

  if (existingSolve) {
    const bestTimeMs =
      executionTime && parseInt(executionTime)
        ? Math.min(
            existingSolve.best_time_ms ?? Number.POSITIVE_INFINITY,
            parseInt(executionTime)
          )
        : existingSolve.best_time_ms;
    const bestMemoryKb =
      memoryUsage && parseInt(memoryUsage)
        ? Math.min(
            existingSolve.best_memory_kb ?? Number.POSITIVE_INFINITY,
            parseInt(memoryUsage)
          )
        : existingSolve.best_memory_kb;

    const submittedAtMs = Date.parse(submittedAt);
    const existingFirstSolvedAtMs = existingSolve.first_solved_at
      ? Date.parse(existingSolve.first_solved_at)
      : Number.NaN;
    const shouldUpdateFirstSolvedAt =
      Number.isFinite(submittedAtMs) &&
      (!Number.isFinite(existingFirstSolvedAtMs) ||
        submittedAtMs < existingFirstSolvedAtMs);

    const solveUpdatePayload = {
      solve_count: (existingSolve.solve_count || 0) + 1,
      best_time_ms:
        bestTimeMs === Number.POSITIVE_INFINITY ? null : bestTimeMs,
      best_memory_kb:
        bestMemoryKb === Number.POSITIVE_INFINITY ? null : bestMemoryKb,
      updated_at: new Date().toISOString(),
    };

    if (shouldUpdateFirstSolvedAt) {
      solveUpdatePayload.first_solved_at = submittedAt;
    }

    const { data: updatedSolve, error: updateError } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .update(solveUpdatePayload)
      .eq('id', existingSolve.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update solve: ${updateError.message}`);
    }
    userSolve = updatedSolve;
  } else {
    isFirstSolve = true;
    const { data: newSolve, error: createError } = await supabaseAdmin
      .from(V2_TABLES.USER_SOLVES)
      .insert({
        user_id: userId,
        problem_id: problem.id,
        first_solved_at: submittedAt,
        solve_count: 1,
        attempt_count: 1,
        best_time_ms: executionTime ? parseInt(executionTime) : null,
        best_memory_kb: memoryUsage ? parseInt(memoryUsage) : null,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create solve: ${createError.message}`);
    }
    userSolve = newSolve;
  }

  // Step 3: Compute version number (schema has no version column)
  const { count: existingSolutionsCount, error: countError } =
    await supabaseAdmin
      .from(V2_TABLES.SOLUTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('user_solve_id', userSolve.id);

  if (countError) {
    console.warn(
      '[EXTENSION-SYNC] Failed to count existing solutions:',
      countError.message
    );
  }

  const nextVersionNumber = (existingSolutionsCount || 0) + 1;
  const isPrimary = nextVersionNumber === 1;

  // Step 4: Create solution entry (normalized schema)
  const languageId = await getLanguageId(language);
  const { data: newSolution, error: solutionError } = await supabaseAdmin
    .from(V2_TABLES.SOLUTIONS)
    .insert({
      user_solve_id: userSolve.id,
      submission_id: submission?.id || null,
      source_code: solutionCode,
      language_id: languageId,
      verdict: normalizedVerdict,
      is_primary: isPrimary,
      submitted_at: submittedAt,
      created_at: submittedAt,
    })
    .select()
    .single();

  if (solutionError) {
    throw new Error(`Failed to create solution: ${solutionError.message}`);
  }

  // Step 5: Update aggregate statistics (non-blocking — failures are warnings)
  try {
    // user_stats: increment total_solved (first solve) and total_solutions
    const { data: currentStats } = await supabaseAdmin
      .from(V2_TABLES.USER_STATS)
      .select('total_solved, total_solutions')
      .eq('user_id', userId)
      .single();

    if (currentStats) {
      await supabaseAdmin
        .from(V2_TABLES.USER_STATS)
        .update({
          total_solved: isFirstSolve
            ? (currentStats.total_solved || 0) + 1
            : currentStats.total_solved,
          total_solutions: (currentStats.total_solutions || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await supabaseAdmin.from(V2_TABLES.USER_STATS).insert({
        user_id: userId,
        total_solved: 1,
        total_solutions: 1,
      });
    }
  } catch (statsErr) {
    console.warn(
      '[EXTENSION-SYNC] user_stats update failed:',
      statsErr.message
    );
  }

  // user_platform_stats: increment problems_solved on first solve
  if (isFirstSolve) {
    try {
      const { data: platStats } = await supabaseAdmin
        .from(V2_TABLES.USER_PLATFORM_STATS)
        .select('problems_solved')
        .eq('user_id', userId)
        .eq('platform_id', platformId)
        .single();

      if (platStats) {
        await supabaseAdmin
          .from(V2_TABLES.USER_PLATFORM_STATS)
          .update({
            problems_solved: (platStats.problems_solved || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform_id', platformId);
      } else {
        await supabaseAdmin.from(V2_TABLES.USER_PLATFORM_STATS).insert({
          user_id: userId,
          platform_id: platformId,
          problems_solved: 1,
        });
      }
    } catch (platErr) {
      console.warn(
        '[EXTENSION-SYNC] user_platform_stats update failed:',
        platErr.message
      );
    }

    // user_tier_stats: use the tier we already resolved
    if (difficultyTierId != null) {
      try {
        const { data: tierRow } = await supabaseAdmin
          .from(V2_TABLES.USER_TIER_STATS)
          .select('solved_count')
          .eq('user_id', userId)
          .eq('difficulty_tier_id', difficultyTierId)
          .single();

        if (tierRow) {
          await supabaseAdmin
            .from(V2_TABLES.USER_TIER_STATS)
            .update({
              solved_count: (tierRow.solved_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('difficulty_tier_id', difficultyTierId);
        } else {
          await supabaseAdmin.from(V2_TABLES.USER_TIER_STATS).insert({
            user_id: userId,
            difficulty_tier_id: difficultyTierId,
            solved_count: 1,
          });
        }
      } catch (tierErr) {
        console.warn(
          '[EXTENSION-SYNC] user_tier_stats update failed:',
          tierErr.message
        );
      }
    }

    // user_language_stats: increment solved_count for this language
    if (languageId != null) {
      try {
        const { data: langRow } = await supabaseAdmin
          .from(V2_TABLES.USER_LANGUAGE_STATS)
          .select('solved_count')
          .eq('user_id', userId)
          .eq('language_id', languageId)
          .single();

        if (langRow) {
          await supabaseAdmin
            .from(V2_TABLES.USER_LANGUAGE_STATS)
            .update({
              solved_count: (langRow.solved_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('language_id', languageId);
        } else {
          await supabaseAdmin.from(V2_TABLES.USER_LANGUAGE_STATS).insert({
            user_id: userId,
            language_id: languageId,
            solved_count: 1,
          });
        }
      } catch (langErr) {
        console.warn(
          '[EXTENSION-SYNC] user_language_stats update failed:',
          langErr.message
        );
      }
    }

    // user_tag_stats: increment for each tag on this problem
    try {
      const { data: problemTagRows } = await supabaseAdmin
        .from(V2_TABLES.PROBLEM_TAGS)
        .select('tag_id')
        .eq('problem_id', problem.id);
      const tagIds = (problemTagRows || [])
        .map((r) => r.tag_id)
        .filter(Boolean);
      if (tagIds.length > 0) {
        await updateUserTagStats(userId, tagIds, {
          solved: 1,
          attempted: 1,
          difficultyRating: problem.difficulty_rating,
        });
      }
    } catch (tagErr) {
      console.warn(
        '[EXTENSION-SYNC] user_tag_stats update failed:',
        tagErr.message
      );
    }
  }

  // user_daily_activity: always update on AC (submission + solve + solution counters)
  try {
    await updateUserDailyActivity(
      userId,
      platformId,
      {
        problemsSolved: isFirstSolve ? 1 : 0,
        submissionsCount: 1,
        solutionsAdded: 1,
      },
      submittedAt
    );
    // Recalculate streaks after daily activity update
    await recalcUserStreaks(userId);
  } catch (dailyErr) {
    console.warn(
      '[EXTENSION-SYNC] user_daily_activity update failed:',
      dailyErr.message
    );
  }

  // problem_editorials: persist tutorial data if the extension captured it
  try {
    const tutorialUrl = data.tutorialUrl || data.tutorial_url || null;
    const tutorialContent =
      data.tutorialContent || data.tutorial_content || null;
    const tutorialSolutions =
      data.tutorialSolutions || data.tutorial_solutions || null;
    if (
      tutorialUrl ||
      tutorialContent ||
      (tutorialSolutions && tutorialSolutions.length > 0)
    ) {
      await upsertProblemEditorial(problem.id, {
        tutorialUrl,
        tutorialContent,
        tutorialSolutions,
      });
    }
  } catch (editorialErr) {
    console.warn(
      '[EXTENSION-SYNC] problem_editorials update failed:',
      editorialErr.message
    );
  }

  const shouldRunAnalysis =
    sourceCodeCaptured &&
    typeof solutionCode === 'string' &&
    solutionCode.trim().length > 0 &&
    solutionCode !== ACCEPTED_SOURCE_PLACEHOLDER;

  // Step 6: Trigger AI analysis (non-blocking)
  if (shouldRunAnalysis) {
    try {
      const { analyzeSolution } = await import('@/app/_lib/solution-analyzer');

      analyzeSolution(newSolution.id, {
        problem_name: problemName,
        problem_description: problemDescription,
        source_code: solutionCode,
        language,
        platform,
        tags,
      }).catch((analysisError) => {
        console.warn('[EXTENSION-SYNC] Analysis failed:', analysisError.message);
      });
    } catch (analyzerError) {
      console.warn(
        '[EXTENSION-SYNC] Analyzer unavailable:',
        analyzerError.message
      );
    }
  }

  revalidatePath('/account/member/problem-solving');
  revalidatePath('/account/member/problem-solving/[userId]', 'page');

  logExtensionSyncTest('v2_sync_success', {
    platform,
    problemId: problem.external_id,
    submissionId: normalizedSubmissionId || submissionId || null,
    verdict: normalizedVerdict,
    sourceCodeCaptured,
    solutionId: newSolution.id,
    versionNumber: newSolution.version_number,
  });

  const successMessage = sourceCodeCaptured
    ? `Solution v${nextVersionNumber} added for ${problem.name}. AI analysis pending.`
    : `Accepted submission synced for ${problem.name}. Source code was unavailable; run full import to attach code.`;

  return NextResponse.json({
    success: true,
    schemaVersion: 'v2',
    data: {
      problem: {
        id: problem.id,
        platform,
        problemId: problem.external_id,
        problemName: problem.name,
      },
      userSolve: {
        id: userSolve.id,
        solveCount: userSolve.solve_count,
        isFirstSolve,
      },
      solution: {
        id: newSolution.id,
        versionNumber: nextVersionNumber,
        isPrimary,
        aiAnalysisStatus: shouldRunAnalysis ? 'pending' : 'skipped_no_source',
      },
      message: successMessage,
    },
  });
}

async function handleLegacySync(userId, data) {
  const {
    platform,
    problemId,
    problemName,
    problemUrl,
    problemDescription,
    contestId,
    difficultyRating,
    tags,
    solutionCode,
    language,
    submissionId,
    submissionTime,
    verdict,
    executionTime,
    memoryUsage,
    inputFormat,
    outputFormat,
    constraints,
    examples,
    notes,
    timeLimitMs,
    memoryLimitKb,
    tutorialUrl,
    tutorialContent,
    tutorialSolutions,
  } = data;

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  const normalizedProblemId =
    normalizedPlatform === 'leetcode'
      ? normalizeLeetCodeProblemSlug(problemId)
      : String(problemId || '').trim();
  const normalizedSubmissionIdRaw = submissionId
    ? String(submissionId).trim()
    : null;
  const normalizedSubmissionId =
    normalizedPlatform === 'vjudge'
      ? normalizeVJudgeSubmissionId(normalizedSubmissionIdRaw)
      : normalizedSubmissionIdRaw;
  const normalizedSubmittedAt = normalizeSubmissionTimestamp(submissionTime);

  logExtensionSyncTest('legacy_input_normalized', {
    userId,
    platform,
    problemId: normalizedProblemId,
    submissionId: normalizedSubmissionId,
    submittedAt: normalizedSubmittedAt,
    verdict: normalizeVerdict(verdict),
    codeLength: typeof solutionCode === 'string' ? solutionCode.length : 0,
  });

  if (!normalizedProblemId) {
    return NextResponse.json(
      { error: 'Invalid problemId format' },
      { status: 400 }
    );
  }

  if (normalizedPlatform === 'leetcode') {
    if (!normalizedSubmissionId) {
      return NextResponse.json(
        {
          error:
            'LeetCode submissions require a valid submissionId from Practice History.',
        },
        { status: 400 }
      );
    }

    if (
      normalizedSubmissionId &&
      isSyntheticLeetCodeSubmissionId(normalizedSubmissionId)
    ) {
      return NextResponse.json(
        {
          error:
            'Rejected synthetic LeetCode submission. Please sync only real Practice History submissions.',
        },
        { status: 400 }
      );
    }

    if (!normalizedSubmittedAt) {
      return NextResponse.json(
        {
          error:
            'LeetCode submissions require a valid submissionTime from Practice History.',
        },
        { status: 400 }
      );
    }
  }

  if (normalizedPlatform === 'cses') {
    if (!normalizedSubmissionId || !/^\d+$/.test(normalizedSubmissionId)) {
      return NextResponse.json(
        {
          error:
            'CSES submissions require a numeric submissionId from the status/result page.',
        },
        { status: 400 }
      );
    }

    if (!normalizedSubmittedAt) {
      return NextResponse.json(
        {
          error:
            'CSES submissions require a valid submissionTime from the CSES status/result page.',
        },
        { status: 400 }
      );
    }
  }

  const submittedAt =
    normalizedPlatform === 'cses'
      ? normalizedSubmittedAt
      : normalizedSubmittedAt || new Date().toISOString();

  // Apply rate limit
  const { data: lastSolution } = await supabaseAdmin
    .from('solutions')
    .select(
      `
      created_at,
      user_problem_solves!inner(user_id)
    `
    )
    .eq('user_problem_solves.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastSolution?.created_at) {
    const timeSinceSubmission =
      Date.now() - new Date(lastSolution.created_at).getTime();
    if (timeSinceSubmission < SUBMISSION_COOLDOWN_MS) {
      const waitTime = Math.ceil(
        (SUBMISSION_COOLDOWN_MS - timeSinceSubmission) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${waitTime} second(s) before submitting again`,
        },
        { status: 429 }
      );
    }
  }

  // Step 1: Upsert problem
  const { data: existingProblem } = await supabaseAdmin
    .from('problems')
    .select('*')
    .eq('platform', platform)
    .eq('problem_id', normalizedProblemId)
    .single();

  let problem = null;

  if (existingProblem) {
    const { data: updatedProblem, error: updateError } = await supabaseAdmin
      .from('problems')
      .update({
        problem_name: problemName,
        problem_url: problemUrl || existingProblem.problem_url,
        problem_description:
          problemDescription || existingProblem.problem_description,
        input_format: inputFormat || existingProblem.input_format,
        output_format: outputFormat || existingProblem.output_format,
        constraints: constraints || existingProblem.constraints,
        examples:
          Array.isArray(examples) && examples.length > 0
            ? examples
            : existingProblem.examples,
        notes: notes || existingProblem.notes,
        tutorial_url: tutorialUrl || existingProblem.tutorial_url,
        tutorial_content: tutorialContent || existingProblem.tutorial_content,
        tutorial_solutions:
          Array.isArray(tutorialSolutions) && tutorialSolutions.length > 0
            ? tutorialSolutions
            : existingProblem.tutorial_solutions,
        time_limit_ms: Number.isFinite(Number(timeLimitMs))
          ? Math.round(Number(timeLimitMs))
          : existingProblem.time_limit_ms,
        memory_limit_kb: Number.isFinite(Number(memoryLimitKb))
          ? Math.round(Number(memoryLimitKb))
          : existingProblem.memory_limit_kb,
        contest_id: contestId || existingProblem.contest_id,
        difficulty_rating: difficultyRating
          ? Math.round(Number(difficultyRating))
          : existingProblem.difficulty_rating,
        tags: tags.length > 0 ? tags : existingProblem.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProblem.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update problem: ${updateError.message}`);
    }
    problem = updatedProblem;
  } else {
    const { data: newProblem, error: createError } = await supabaseAdmin
      .from('problems')
      .insert({
        platform,
        problem_id: normalizedProblemId,
        contest_id: contestId,
        problem_name: problemName,
        problem_url: problemUrl,
        problem_description: problemDescription,
        input_format: inputFormat || null,
        output_format: outputFormat || null,
        constraints: constraints || null,
        examples: Array.isArray(examples) ? examples : [],
        notes: notes || null,
        tutorial_url: tutorialUrl || null,
        tutorial_content: tutorialContent || null,
        tutorial_solutions: Array.isArray(tutorialSolutions)
          ? tutorialSolutions
          : [],
        time_limit_ms: Number.isFinite(Number(timeLimitMs))
          ? Math.round(Number(timeLimitMs))
          : null,
        memory_limit_kb: Number.isFinite(Number(memoryLimitKb))
          ? Math.round(Number(memoryLimitKb))
          : null,
        difficulty_rating: difficultyRating
          ? Math.round(Number(difficultyRating))
          : null,
        tags,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create problem: ${createError.message}`);
    }
    problem = newProblem;
  }

  // Step 1.5: Record submission
  try {
    const { error: submissionError } = await supabaseAdmin
      .from('problem_submissions')
      .insert({
        user_id: userId,
        problem_id: normalizedProblemId,
        platform,
        submission_id: normalizedSubmissionId || submissionId,
        problem_name: problemName,
        problem_url: problemUrl,
        contest_id: contestId,
        verdict: verdict || 'AC',
        language,
        execution_time_ms: executionTime ? parseInt(executionTime) : null,
        memory_kb: memoryUsage ? parseInt(memoryUsage) : null,
        difficulty_rating: difficultyRating ? Number(difficultyRating) : null,
        tags: tags && tags.length > 0 ? tags : null,
        submitted_at: submittedAt,
        source_code: solutionCode,
      });

    if (submissionError && submissionError.code !== '23505') {
      console.error(
        '[EXTENSION-SYNC] Error recording submission:',
        submissionError
      );
    }
  } catch (submissionRecordError) {
    console.warn(
      '[EXTENSION-SYNC] Failed to record submission:',
      submissionRecordError.message
    );
  }

  // Only create solve records for AC
  if (verdict && verdict !== 'AC' && verdict !== 'OK') {
    logExtensionSyncTest('legacy_non_ac_recorded', {
      platform,
      problemId: normalizedProblemId,
      submissionId: normalizedSubmissionId || submissionId || null,
      verdict: verdict || 'UNKNOWN',
    });
    return NextResponse.json({
      success: true,
      schemaVersion: 'legacy',
      data: {
        problem: {
          id: problem.id,
          platform,
          problemId: problem.problem_id,
          problemName: problem.problem_name,
        },
        submission: {
          submissionId,
          verdict: verdict || 'AC',
          recorded: true,
        },
        message: `Submission recorded with verdict ${verdict}. Not marked as solved.`,
      },
    });
  }

  // Step 2: Upsert user solve
  const { data: existingSolve } = await supabaseAdmin
    .from('user_problem_solves')
    .select('*')
    .eq('user_id', userId)
    .eq('problem_id', problem.id)
    .single();

  let userProblemSolve = null;

  if (existingSolve) {
    const submittedAtMs = Date.parse(submittedAt);
    const existingFirstSolvedAtMs = existingSolve.first_solved_at
      ? Date.parse(existingSolve.first_solved_at)
      : Number.NaN;
    const shouldUpdateFirstSolvedAt =
      Number.isFinite(submittedAtMs) &&
      (!Number.isFinite(existingFirstSolvedAtMs) ||
        submittedAtMs < existingFirstSolvedAtMs);

    const solveUpdatePayload = {
      solve_count: existingSolve.solve_count + 1,
      updated_at: new Date().toISOString(),
    };

    if (shouldUpdateFirstSolvedAt) {
      solveUpdatePayload.first_solved_at = submittedAt;
    }

    const { data: updatedSolve, error: updateError } = await supabaseAdmin
      .from('user_problem_solves')
      .update(solveUpdatePayload)
      .eq('id', existingSolve.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update solve: ${updateError.message}`);
    }
    userProblemSolve = updatedSolve;
  } else {
    const { data: newSolve, error: createError } = await supabaseAdmin
      .from('user_problem_solves')
      .insert({
        user_id: userId,
        problem_id: problem.id,
        first_solved_at: submittedAt,
        solve_count: 1,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create solve: ${createError.message}`);
    }
    userProblemSolve = newSolve;
  }

  // Step 3: Get next version number
  const { data: lastVersionSolution } = await supabaseAdmin
    .from('solutions')
    .select('version_number')
    .eq('user_problem_solve_id', userProblemSolve.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersionNumber = (lastVersionSolution?.version_number || 0) + 1;

  // Step 4: Create solution
  const { data: newSolution, error: solutionError } = await supabaseAdmin
    .from('solutions')
    .insert({
      user_problem_solve_id: userProblemSolve.id,
      version_number: nextVersionNumber,
      source_code: solutionCode,
      language,
      submission_id: normalizedSubmissionId || submissionId,
      submitted_at: submittedAt,
      ai_analysis_status: 'pending',
      is_primary: nextVersionNumber === 1,
    })
    .select()
    .single();

  if (solutionError) {
    throw new Error(`Failed to create solution: ${solutionError.message}`);
  }

  // Step 5: Update best_solution_id
  if (!userProblemSolve.best_solution_id || nextVersionNumber === 1) {
    await supabaseAdmin
      .from('user_problem_solves')
      .update({
        best_solution_id: newSolution.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProblemSolve.id);
  }

  // Step 6: Trigger AI analysis
  try {
    const { analyzeSolution } = await import('@/app/_lib/solution-analyzer');

    analyzeSolution(newSolution.id, {
      problem_name: problemName,
      problem_description: problemDescription,
      source_code: solutionCode,
      language,
      platform,
      tags,
    }).catch((analysisError) => {
      supabaseAdmin
        .from('solutions')
        .update({ ai_analysis_status: 'failed' })
        .eq('id', newSolution.id);
    });
  } catch (analyzerError) {
    await supabaseAdmin
      .from('solutions')
      .update({
        ai_analysis_status: 'failed',
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', newSolution.id);
  }

  // Step 7: Update statistics
  try {
    const { data: currentStats } = await supabaseAdmin
      .from('user_problem_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (currentStats) {
      const updates = {
        total_solutions: currentStats.total_solutions + 1,
        updated_at: new Date().toISOString(),
      };

      if (nextVersionNumber === 1) {
        updates.total_solved = currentStats.total_solved + 1;
      }

      await supabaseAdmin
        .from('user_problem_stats')
        .update(updates)
        .eq('user_id', userId);
    } else {
      await supabaseAdmin.from('user_problem_stats').insert({
        user_id: userId,
        total_solved: 1,
        total_solutions: 1,
      });
    }
  } catch (statsError) {
    console.warn(
      `[EXTENSION-SYNC] Statistics update failed:`,
      statsError.message
    );
  }

  revalidatePath('/account/member/problem-solving');
  revalidatePath('/account/member/problem-solving/[userId]', 'page');

  logExtensionSyncTest('legacy_sync_success', {
    platform,
    problemId: problem.problem_id,
    submissionId: normalizedSubmissionId || submissionId || null,
    verdict: verdict || 'AC',
    solutionId: newSolution.id,
    versionNumber: newSolution.version_number,
  });

  return NextResponse.json({
    success: true,
    schemaVersion: 'legacy',
    data: {
      problem: {
        id: problem.id,
        platform,
        problemId: problem.problem_id,
        problemName: problem.problem_name,
      },
      userProblemSolve: {
        id: userProblemSolve.id,
        solveCount: userProblemSolve.solve_count,
        isFirstSolve: nextVersionNumber === 1,
      },
      solution: {
        id: newSolution.id,
        versionNumber: newSolution.version_number,
        isPrimary: newSolution.is_primary,
        aiAnalysisStatus: newSolution.ai_analysis_status,
      },
      message: `Solution v${newSolution.version_number} added for ${problem.problem_name}. AI analysis ${newSolution.ai_analysis_status}.`,
    },
  });
}
