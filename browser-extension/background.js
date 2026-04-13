/**
 * NEUPC Extension - Background Service Worker
 * Multi-Platform Submission Syncing
 *
 * Features:
 * 1. Message routing from content scripts
 * 2. Single submission sync via extension-sync endpoint
 * 3. Bulk import with page-by-page processing
 * 4. Source code extraction via tab injection
 * 5. Platform API fetching (Codeforces, AtCoder)
 * 6. Sync queue management
 */

// ============================================================
// BROWSER API COMPATIBILITY
// ============================================================

const browserAPI = globalThis.chrome || globalThis.browser;

console.log('[NEUPC] Background service worker initialized');

// ============================================================
// CONSTANTS (inline for service worker compatibility)
// ============================================================

const API_CONFIG = {
  defaultApiUrl: 'http://localhost:3000',
  endpoints: {
    extensionSync: '/api/problem-solving/extension-sync',
    bulkImport: '/api/problem-solving/bulk-import',
    syncStatus: '/api/problem-solving/sync-status',
    existingSubmissions: '/api/problem-solving/existing-submissions',
  },
  requestTimeout: 120000,
  batchSize: 10,
  rateLimitDelay: 1000,
};

const PLATFORMS_CONFIG = {
  codeforces: {
    id: 'codeforces',
    name: 'Codeforces',
    apiUrl: 'https://codeforces.com/api',
    submissionsPerPage: 10,
    contentScript: 'content-scripts/group1/neupc-codeforces.js',
  },
  atcoder: {
    id: 'atcoder',
    name: 'AtCoder',
    apiUrl: 'https://kenkoooo.com/atcoder/atcoder-api/v3',
    contentScript: 'content-scripts/group1/neupc-atcoder.js',
  },
  leetcode: {
    id: 'leetcode',
    name: 'LeetCode',
    apiUrl: 'https://leetcode.com/graphql',
    contentScript: 'content-scripts/group1/neupc-leetcode.js',
  },
  toph: {
    id: 'toph',
    name: 'Toph',
    contentScript: 'content-scripts/group1/neupc-toph.js',
  },
};

const VERDICT_MAP = {
  OK: 'AC',
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'RE',
  COMPILATION_ERROR: 'CE',
  IDLENESS_LIMIT_EXCEEDED: 'ILE',
  CHALLENGED: 'WA',
  SKIPPED: 'UNKNOWN',
  TESTING: 'PENDING',
  PARTIAL: 'PC',
};

// ============================================================
// STORAGE HELPERS
// ============================================================

async function getStorageData(keys) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.storage.sync.get(keys);
    } else {
      return new Promise((resolve) => {
        browserAPI.storage.sync.get(keys, resolve);
      });
    }
  } catch (error) {
    console.error('[NEUPC] Storage get error:', error);
    return {};
  }
}

async function setStorageData(items) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.storage.sync.set(items);
    } else {
      return new Promise((resolve) => {
        browserAPI.storage.sync.set(items, resolve);
      });
    }
  } catch (error) {
    console.error('[NEUPC] Storage set error:', error);
  }
}

async function getLocalStorageData(keys) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.storage.local.get(keys);
    } else {
      return new Promise((resolve) => {
        browserAPI.storage.local.get(keys, resolve);
      });
    }
  } catch (error) {
    console.error('[NEUPC] Local storage get error:', error);
    return {};
  }
}

async function setLocalStorageData(items) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.storage.local.set(items);
    } else {
      return new Promise((resolve) => {
        browserAPI.storage.local.set(items, resolve);
      });
    }
  } catch (error) {
    console.error('[NEUPC] Local storage set error:', error);
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeVerdict(verdict) {
  if (!verdict) return 'UNKNOWN';
  const upper = verdict.toUpperCase().replace(/[_\s]+/g, '_');
  return VERDICT_MAP[upper] || verdict;
}

const SUPPORTED_VERDICT_FILTERS = new Set([
  'all',
  'ac',
  'wa',
  'tle',
  'mle',
  're',
  'ce',
  'pe',
  'ile',
  'pc',
  'pending',
  'unknown',
]);

function normalizeVerdictFilter(verdictFilter, onlyAC = false) {
  if (typeof verdictFilter === 'string') {
    const normalized = verdictFilter.trim().toLowerCase();
    if (normalized === 'accepted' || normalized === 'ok') {
      return 'ac';
    }
    if (SUPPORTED_VERDICT_FILTERS.has(normalized)) {
      return normalized;
    }
  }
  return onlyAC ? 'ac' : 'all';
}

function matchesVerdictFilter(verdict, verdictFilter = 'all') {
  const normalizedFilter = normalizeVerdictFilter(verdictFilter);
  if (normalizedFilter === 'all') {
    return true;
  }
  return normalizeVerdict(verdict).toLowerCase() === normalizedFilter;
}

function sanitizeApiUrl(url) {
  if (!url) return API_CONFIG.defaultApiUrl;
  url = url.replace(/\/+$/, '');
  if (url.includes('/api/')) {
    url = url.split('/api/')[0];
  }
  return url;
}

// ============================================================
// IMPORT STATE MANAGEMENT
// ============================================================

let importState = {
  isRunning: false,
  stopRequested: false,
  phase: 'idle',
  platform: null,
  handle: null,
  fetchCodes: false,
  verdictFilter: 'all',
  currentPage: 0,
  totalPages: 0,
  lastCompletedPage: 0,
  totalSubmissions: 0,
  processedSubmissions: 0,
  codesFetched: 0,
  codesSkipped: 0,
  imported: 0,
  submissionsCreated: 0,
  submissionsUpdated: 0,
  errors: [],
};

let currentFetchTabId = null;
let existingSubmissionIds = new Set();
let problemDetailsCache = new Map();
let problemDetailStatusCache = new Map();
const IMPORT_CHECKPOINT_KEY = 'importCheckpoint';

function resetImportState() {
  importState = {
    isRunning: false,
    stopRequested: false,
    phase: 'idle',
    platform: null,
    handle: null,
    fetchCodes: false,
    verdictFilter: 'all',
    currentPage: 0,
    totalPages: 0,
    lastCompletedPage: 0,
    totalSubmissions: 0,
    processedSubmissions: 0,
    codesFetched: 0,
    codesSkipped: 0,
    imported: 0,
    submissionsCreated: 0,
    submissionsUpdated: 0,
    errors: [],
  };
  existingSubmissionIds = new Set();
  problemDetailsCache = new Map();
  problemDetailStatusCache = new Map();
}

function toSafeCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function buildImportCheckpoint(overrides = {}) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    platform: importState.platform,
    handle: importState.handle,
    fetchCodes: Boolean(importState.fetchCodes),
    verdictFilter: normalizeVerdictFilter(importState.verdictFilter),
    currentPage: toSafeCount(importState.currentPage),
    totalPages: toSafeCount(importState.totalPages),
    lastCompletedPage: toSafeCount(importState.lastCompletedPage),
    totalSubmissions: toSafeCount(importState.totalSubmissions),
    processedSubmissions: toSafeCount(importState.processedSubmissions),
    codesFetched: toSafeCount(importState.codesFetched),
    codesSkipped: toSafeCount(importState.codesSkipped),
    imported: toSafeCount(importState.imported),
    submissionsCreated: toSafeCount(importState.submissionsCreated),
    submissionsUpdated: toSafeCount(importState.submissionsUpdated),
    phase: importState.phase,
    ...overrides,
  };
}

async function loadImportCheckpoint() {
  const data = await getLocalStorageData([IMPORT_CHECKPOINT_KEY]);
  return data?.[IMPORT_CHECKPOINT_KEY] || null;
}

async function saveImportCheckpoint(overrides = {}) {
  const checkpoint = buildImportCheckpoint(overrides);
  await setLocalStorageData({ [IMPORT_CHECKPOINT_KEY]: checkpoint });
  return checkpoint;
}

async function clearImportCheckpoint() {
  await setLocalStorageData({ [IMPORT_CHECKPOINT_KEY]: null });
}

function isCheckpointCompatible(checkpoint, context) {
  if (!checkpoint) {
    return false;
  }

  return (
    checkpoint.platform === context.platform &&
    checkpoint.handle === context.handle &&
    Boolean(checkpoint.fetchCodes) === Boolean(context.fetchCodes) &&
    normalizeVerdictFilter(checkpoint.verdictFilter) ===
      normalizeVerdictFilter(context.verdictFilter)
  );
}

function restoreCountersFromCheckpoint(checkpoint) {
  importState.processedSubmissions = toSafeCount(
    checkpoint.processedSubmissions
  );
  importState.codesFetched = toSafeCount(checkpoint.codesFetched);
  importState.codesSkipped = toSafeCount(checkpoint.codesSkipped);
  importState.imported = toSafeCount(checkpoint.imported);
  importState.submissionsCreated = toSafeCount(checkpoint.submissionsCreated);
  importState.submissionsUpdated = toSafeCount(checkpoint.submissionsUpdated);
  importState.lastCompletedPage = toSafeCount(checkpoint.lastCompletedPage);
}

function sendProgress(data) {
  browserAPI.runtime
    .sendMessage({
      action: 'importProgress',
      ...importState,
      ...data,
    })
    .catch(() => {});
}

// ============================================================
// API COMMUNICATION
// ============================================================

async function getApiCredentials() {
  const settings = await getStorageData(['apiEndpoint', 'extensionToken']);
  return {
    apiUrl: sanitizeApiUrl(settings.apiEndpoint),
    token: settings.extensionToken,
  };
}

async function testBackendConnection(apiUrl, token) {
  try {
    const url = sanitizeApiUrl(apiUrl);
    const response = await fetch(`${url}${API_CONFIG.endpoints.syncStatus}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchExistingSubmissionIds(platform, withSourceCode = true) {
  try {
    const { apiUrl, token } = await getApiCredentials();

    if (!token) {
      console.log('[NEUPC] No token, cannot fetch existing submissions');
      return new Set();
    }

    const queryParams = new URLSearchParams({
      platform,
      ...(withSourceCode && { withSourceCode: 'true' }),
    });

    const response = await fetch(
      `${apiUrl}${API_CONFIG.endpoints.existingSubmissions}?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        '[NEUPC] Failed to fetch existing submissions:',
        response.status
      );
      return new Set();
    }

    const data = await response.json();
    if (data.success && data.data?.submissionIds) {
      const ids = new Set(data.data.submissionIds.map(String));
      console.log(`[NEUPC] Found ${ids.size} existing submissions`);
      return ids;
    }

    return new Set();
  } catch (error) {
    console.error('[NEUPC] Error fetching existing submissions:', error);
    return new Set();
  }
}

function normalizeProblemIdForCache(problemId) {
  const normalized = String(problemId || '')
    .trim()
    .toLowerCase();
  return normalized || null;
}

function buildProblemDetailStatusCacheKey(platform, problemId) {
  const normalizedProblemId = normalizeProblemIdForCache(problemId);
  if (!normalizedProblemId) return null;

  return `${String(platform || 'unknown')
    .trim()
    .toLowerCase()}:${normalizedProblemId}`;
}

function getCachedProblemDetailStatus(platform, problemId) {
  const cacheKey = buildProblemDetailStatusCacheKey(platform, problemId);
  if (!cacheKey) return null;
  return problemDetailStatusCache.get(cacheKey) || null;
}

function cacheProblemDetailStatus(platform, problemId, status) {
  const cacheKey = buildProblemDetailStatusCacheKey(platform, problemId);
  if (!cacheKey || !status || typeof status !== 'object') return;

  const missingFields = Array.isArray(status.missingFields)
    ? status.missingFields
        .map((field) => String(field || '').trim())
        .filter(Boolean)
    : [];

  problemDetailStatusCache.set(cacheKey, {
    exists: status.exists !== false,
    isComplete: status.isComplete === true,
    missingFields,
  });
}

async function fetchProblemDetailStatusForProblems(platform, problemIds = []) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  const uniqueProblemIds = [
    ...new Set(problemIds.map(normalizeProblemIdForCache).filter(Boolean)),
  ];
  if (!normalizedPlatform || uniqueProblemIds.length === 0) {
    return;
  }

  const unresolvedProblemIds = uniqueProblemIds.filter(
    (problemId) => !getCachedProblemDetailStatus(normalizedPlatform, problemId)
  );

  if (unresolvedProblemIds.length === 0) {
    return;
  }

  try {
    const { apiUrl, token } = await getApiCredentials();
    if (!token) {
      return;
    }

    const CHUNK_SIZE = 250;
    let checked = 0;
    let complete = 0;

    for (let i = 0; i < unresolvedProblemIds.length; i += CHUNK_SIZE) {
      const chunk = unresolvedProblemIds.slice(i, i + CHUNK_SIZE);
      const response = await fetch(
        `${apiUrl}${API_CONFIG.endpoints.existingSubmissions}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform: normalizedPlatform,
            problemIds: chunk,
            includeProblemDetails: true,
          }),
        }
      );

      if (!response.ok) {
        console.warn('[NEUPC][TEST] problem detail status prefetch failed', {
          platform: normalizedPlatform,
          status: response.status,
          chunkSize: chunk.length,
        });
        continue;
      }

      const payload = await response.json();
      const statusCandidates = [
        payload?.data?.problemDetails?.statusByProblemId,
        payload?.problemDetails?.statusByProblemId,
        payload?.data?.statusByProblemId,
        payload?.statusByProblemId,
      ];
      const statusByProblemId =
        statusCandidates.find(
          (candidate) => candidate && typeof candidate === 'object'
        ) || {};

      chunk.forEach((problemId) => {
        const status = statusByProblemId?.[problemId];
        if (status && typeof status === 'object') {
          cacheProblemDetailStatus(normalizedPlatform, problemId, status);
          if (status.isComplete) {
            complete += 1;
          }
          return;
        }

        cacheProblemDetailStatus(normalizedPlatform, problemId, {
          exists: false,
          isComplete: false,
          missingFields: [],
        });
      });

      checked += chunk.length;
    }

    console.warn('[NEUPC][TEST] problem detail status prefetched', {
      platform: normalizedPlatform,
      checked,
      complete,
      incomplete: checked - complete,
    });
  } catch (error) {
    console.warn('[NEUPC][TEST] problem detail status prefetch error', {
      platform: normalizedPlatform,
      message: error?.message || String(error),
    });
  }
}

async function prefetchProblemDetailStatusForSubmissions(
  submissions,
  platform
) {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return;
  }

  const problemIds = submissions
    .map((submission) =>
      firstDefinedValue(submission?.problem_id, submission?.problemId)
    )
    .filter(Boolean);

  await fetchProblemDetailStatusForProblems(platform, problemIds);
}

function normalizeSubmissionIdForLookup(submissionId) {
  const normalized = String(submissionId || '').trim();
  return normalized || null;
}

function buildPageOptimizationSignature({
  submissions,
  platform,
  pageNumber,
  verdictFilter = 'all',
  fetchCodes = true,
}) {
  const normalizedPlatform = String(platform || 'unknown')
    .trim()
    .toLowerCase();
  const normalizedPage = Number.isFinite(Number(pageNumber))
    ? Math.max(1, Math.floor(Number(pageNumber)))
    : 0;
  const normalizedVerdict = normalizeVerdictFilter(verdictFilter);

  const submissionIds = [
    ...new Set(
      (Array.isArray(submissions) ? submissions : [])
        .map((submission) =>
          normalizeSubmissionIdForLookup(
            firstDefinedValue(
              submission?.submission_id,
              submission?.submissionId
            )
          )
        )
        .filter(Boolean)
    ),
  ];

  const problemIds = [
    ...new Set(
      (Array.isArray(submissions) ? submissions : [])
        .map((submission) =>
          normalizeProblemIdForCache(
            firstDefinedValue(submission?.problem_id, submission?.problemId)
          )
        )
        .filter(Boolean)
    ),
  ];

  const source = `${normalizedPlatform}|${normalizedPage}|${fetchCodes ? 1 : 0}|${normalizedVerdict}|${submissionIds.join(',')}|${problemIds.join(',')}`;

  // Lightweight stable hash (FNV-1a variant) to avoid sending huge signatures.
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return `p${normalizedPage}-${(hash >>> 0).toString(36)}`;
}

function hydrateProblemDetailStatusCacheFromPayload(platform, payload) {
  const statusCandidates = [
    payload?.data?.problemDetails?.statusByProblemId,
    payload?.problemDetails?.statusByProblemId,
    payload?.data?.statusByProblemId,
    payload?.statusByProblemId,
  ];

  const statusByProblemId =
    statusCandidates.find(
      (candidate) => candidate && typeof candidate === 'object'
    ) || {};

  Object.entries(statusByProblemId).forEach(([problemId, status]) => {
    if (!problemId || !status || typeof status !== 'object') return;
    cacheProblemDetailStatus(platform, problemId, status);
  });

  return statusByProblemId;
}

async function fetchPageOptimizationStatusForSubmissions(
  submissions,
  platform,
  context = {}
) {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return null;
  }

  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  if (!normalizedPlatform) {
    return null;
  }

  const submissionIds = [
    ...new Set(
      submissions
        .map((submission) =>
          normalizeSubmissionIdForLookup(
            firstDefinedValue(
              submission?.submission_id,
              submission?.submissionId
            )
          )
        )
        .filter(Boolean)
    ),
  ];

  const problemIds = [
    ...new Set(
      submissions
        .map((submission) =>
          normalizeProblemIdForCache(
            firstDefinedValue(submission?.problem_id, submission?.problemId)
          )
        )
        .filter(Boolean)
    ),
  ];

  if (submissionIds.length === 0 && problemIds.length === 0) {
    return null;
  }

  const pageSignature = buildPageOptimizationSignature({
    submissions,
    platform: normalizedPlatform,
    pageNumber: context.pageNumber,
    verdictFilter: context.verdictFilter,
    fetchCodes: context.fetchCodes,
  });

  try {
    const { apiUrl, token } = await getApiCredentials();
    if (!token) {
      return null;
    }

    const response = await fetch(
      `${apiUrl}${API_CONFIG.endpoints.existingSubmissions}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: normalizedPlatform,
          submissionIds,
          problemIds,
          includeProblemDetails: true,
          includePageOptimization: true,
          pageNumber: context.pageNumber,
          pageSignature,
        }),
      }
    );

    if (!response.ok) {
      console.warn('[NEUPC][TEST] page optimization status fetch failed', {
        platform: normalizedPlatform,
        pageNumber: context.pageNumber,
        status: response.status,
      });
      return null;
    }

    const payload = await response.json();
    const data = payload?.data || payload || {};

    hydrateProblemDetailStatusCacheFromPayload(normalizedPlatform, payload);

    const pageOptimization =
      data?.pageOptimization || payload?.pageOptimization || null;

    return {
      allComplete: pageOptimization?.allComplete === true,
      allSubmissionsComplete: pageOptimization?.allSubmissionsComplete === true,
      allProblemDetailsComplete:
        pageOptimization?.allProblemDetailsComplete === true,
      fromSyncJobs: pageOptimization?.fromSyncJobs === true,
      cacheKey: pageOptimization?.cacheKey || null,
      checkedSubmissions: submissionIds.length,
      checkedProblems: problemIds.length,
    };
  } catch (error) {
    console.warn('[NEUPC][TEST] page optimization status fetch error', {
      platform: normalizedPlatform,
      pageNumber: context.pageNumber,
      message: error?.message || String(error),
    });
    return null;
  }
}

// ============================================================
// SINGLE SUBMISSION SYNC
// ============================================================

async function syncSingleSubmission(submission) {
  const { apiUrl, token } = await getApiCredentials();

  console.warn('[NEUPC][TEST] syncSingleSubmission credentials', {
    apiUrl,
    hasToken: !!token,
    platform: submission?.platform || null,
    submissionId: submission?.submissionId || submission?.submission_id || null,
  });

  if (!token) {
    console.warn('[NEUPC][TEST] syncSingleSubmission blocked: missing token');
    throw new Error('No extension token configured');
  }

  const normalizedPlatform = String(submission?.platform || '')
    .trim()
    .toLowerCase();
  const enrichedSubmission = {
    ...submission,
  };

  const problemUrl = firstDefinedValue(
    submission?.problemUrl,
    submission?.problem_url
  );
  const problemId = firstDefinedValue(
    submission?.problemId,
    submission?.problem_id
  );

  let problemDetailStatus = null;
  if (normalizedPlatform && problemId) {
    await fetchProblemDetailStatusForProblems(normalizedPlatform, [problemId]);
    problemDetailStatus = getCachedProblemDetailStatus(
      normalizedPlatform,
      problemId
    );
  }

  // Best-effort enrichment to include full problem metadata on single sync.
  if (problemDetailStatus?.isComplete) {
    console.warn(
      '[NEUPC][TEST] syncSingleSubmission skipped problem extraction',
      {
        platform: normalizedPlatform,
        problemId,
        reason: 'already_complete_in_db',
      }
    );
  } else if (normalizedPlatform && problemUrl) {
    const problemDetailsResult = await extractProblemDetails(
      problemUrl,
      normalizedPlatform
    );

    if (problemDetailsResult?.success && problemDetailsResult.data) {
      mergeExtractedSubmissionData(
        enrichedSubmission,
        problemDetailsResult.data
      );
      applyProblemDetailsToImportCandidate(
        enrichedSubmission,
        problemDetailsResult.data,
        problemDetailStatus?.missingFields
      );
    }
  }

  const payload = {
    extensionToken: token,
    platform: normalizedPlatform || submission?.platform,
    problemId: firstDefinedValue(
      enrichedSubmission.problemId,
      enrichedSubmission.problem_id
    ),
    problemName: firstDefinedValue(
      enrichedSubmission.problemName,
      enrichedSubmission.problem_name
    ),
    problemUrl: firstDefinedValue(
      enrichedSubmission.problemUrl,
      enrichedSubmission.problem_url
    ),
    problemDescription:
      firstDefinedValue(
        enrichedSubmission.problemDescription,
        enrichedSubmission.problem_description,
        enrichedSubmission.description
      ) || '',
    contestId: firstDefinedValue(
      enrichedSubmission.contestId,
      enrichedSubmission.contest_id
    ),
    difficultyRating: firstDefinedValue(
      enrichedSubmission.problemRating,
      enrichedSubmission.difficultyRating,
      enrichedSubmission.difficulty_rating,
      enrichedSubmission.difficulty
    ),
    tags: Array.isArray(enrichedSubmission.tags) ? enrichedSubmission.tags : [],
    solutionCode: firstDefinedValue(
      enrichedSubmission.sourceCode,
      enrichedSubmission.source_code
    ),
    language: firstDefinedValue(
      enrichedSubmission.language,
      enrichedSubmission.lang
    ),
    submissionId: firstDefinedValue(
      enrichedSubmission.submissionId,
      enrichedSubmission.submission_id
    ),
    submissionTime: firstDefinedValue(
      enrichedSubmission.submittedAt,
      enrichedSubmission.submitted_at
    ),
    verdict: firstDefinedValue(enrichedSubmission.verdict),
    executionTime: firstDefinedValue(
      enrichedSubmission.executionTime,
      enrichedSubmission.execution_time_ms
    ),
    memoryUsage: firstDefinedValue(
      enrichedSubmission.memoryUsed,
      enrichedSubmission.memory_kb
    ),
    inputFormat: firstDefinedValue(
      enrichedSubmission.inputFormat,
      enrichedSubmission.input_format
    ),
    outputFormat: firstDefinedValue(
      enrichedSubmission.outputFormat,
      enrichedSubmission.output_format
    ),
    constraints: firstDefinedValue(enrichedSubmission.constraints),
    examples: Array.isArray(enrichedSubmission.examples)
      ? enrichedSubmission.examples
      : [],
    notes: firstDefinedValue(enrichedSubmission.notes),
    tutorialUrl: firstDefinedValue(
      enrichedSubmission.tutorialUrl,
      enrichedSubmission.tutorial_url
    ),
    tutorialContent: firstDefinedValue(
      enrichedSubmission.tutorialContent,
      enrichedSubmission.tutorial_content
    ),
    tutorialSolutions: Array.isArray(enrichedSubmission.tutorialSolutions)
      ? enrichedSubmission.tutorialSolutions
      : Array.isArray(enrichedSubmission.tutorial_solutions)
        ? enrichedSubmission.tutorial_solutions
        : [],
    timeLimitMs: firstDefinedValue(
      enrichedSubmission.timeLimitMs,
      enrichedSubmission.time_limit_ms,
      enrichedSubmission.timeLimit
    ),
    memoryLimitKb: firstDefinedValue(
      enrichedSubmission.memoryLimitKb,
      enrichedSubmission.memory_limit_kb,
      enrichedSubmission.memoryLimit
    ),
  };

  console.log(
    '[NEUPC] Syncing submission:',
    payload.platform,
    payload.submissionId
  );

  const syncUrl = `${apiUrl}${API_CONFIG.endpoints.extensionSync}`;
  console.warn('[NEUPC][TEST] syncSingleSubmission request', {
    url: syncUrl,
    platform: payload.platform,
    submissionId: payload.submissionId,
  });

  const response = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.warn('[NEUPC][TEST] syncSingleSubmission response', {
    url: syncUrl,
    status: response.status,
    ok: response.ok,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Sync failed');
  }

  console.log('[NEUPC] Submission synced:', result);
  return result;
}

// ============================================================
// BULK IMPORT TO BACKEND
// ============================================================

async function importSubmissionsToBackend(
  submissions,
  platform,
  verdictFilter = 'all'
) {
  const { apiUrl, token } = await getApiCredentials();

  console.warn('[NEUPC][TEST] importSubmissionsToBackend credentials', {
    apiUrl,
    hasToken: !!token,
    platform,
    submissions: Array.isArray(submissions) ? submissions.length : 0,
    verdictFilter: normalizeVerdictFilter(verdictFilter),
  });

  if (!token) {
    console.warn(
      '[NEUPC][TEST] importSubmissionsToBackend blocked: missing token'
    );
    throw new Error('No extension token configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    API_CONFIG.requestTimeout
  );

  try {
    const bulkUrl = `${apiUrl}${API_CONFIG.endpoints.bulkImport}`;
    console.warn('[NEUPC][TEST] importSubmissionsToBackend request', {
      url: bulkUrl,
      platform,
      submissions: Array.isArray(submissions) ? submissions.length : 0,
      verdictFilter: normalizeVerdictFilter(verdictFilter),
    });

    const response = await fetch(bulkUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extensionToken: token,
        handle: importState.handle,
        platform: platform,
        submissions: submissions,
        verdictFilter: normalizeVerdictFilter(verdictFilter),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.warn('[NEUPC][TEST] importSubmissionsToBackend response', {
      url: bulkUrl,
      status: response.status,
      ok: response.ok,
    });

    const result = await response.json();

    console.log('[NEUPC] Import response:', {
      status: response.status,
      success: result.success,
      submissionsCreated: result.data?.submissionsCreated,
      submissionsUpdated: result.data?.submissionsUpdated,
      error: result.error,
    });

    if (response.ok && result.success) {
      return {
        success: true,
        solvesCreated: result.data?.solvesCreated || 0,
        submissionsCreated: result.data?.submissionsCreated || 0,
        submissionsUpdated: result.data?.submissionsUpdated || 0,
      };
    } else {
      return { success: false, error: result.error || 'Import failed' };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out' };
    }
    return { success: false, error: error.message };
  }
}

// ============================================================
// SOURCE CODE EXTRACTION
// ============================================================

async function injectContentScript(tabId, platform) {
  const config = PLATFORMS_CONFIG[platform];
  if (!config?.contentScript) {
    console.error('[NEUPC] No content script for platform:', platform);
    return false;
  }

  try {
    if (browserAPI.scripting?.executeScript) {
      await browserAPI.scripting.executeScript({
        target: { tabId },
        files: [config.contentScript],
      });
      console.log('[NEUPC] Script injected via scripting API');
      return true;
    } else if (browserAPI.tabs?.executeScript) {
      return new Promise((resolve) => {
        browserAPI.tabs.executeScript(
          tabId,
          { file: config.contentScript },
          () => {
            if (browserAPI.runtime.lastError) {
              console.error(
                '[NEUPC] tabs.executeScript error:',
                browserAPI.runtime.lastError
              );
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    }
    return false;
  } catch (error) {
    console.error('[NEUPC] Script injection error:', error.message);
    return false;
  }
}

async function getTabInfo(tabId) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.tabs.get(tabId);
    } else {
      return new Promise((resolve, reject) => {
        browserAPI.tabs.get(tabId, (info) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(info);
          }
        });
      });
    }
  } catch {
    return null;
  }
}

async function sendMessageToTab(tabId, message) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.tabs.sendMessage(tabId, message);
    } else {
      return new Promise((resolve, reject) => {
        browserAPI.tabs.sendMessage(tabId, message, (response) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
  } catch {
    return null;
  }
}

async function createTab(url) {
  try {
    if (typeof browser !== 'undefined') {
      return await browserAPI.tabs.create({ url, active: false });
    } else {
      return new Promise((resolve, reject) => {
        browserAPI.tabs.create({ url, active: false }, (tab) => {
          if (browserAPI.runtime.lastError) {
            reject(new Error(browserAPI.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      });
    }
  } catch (error) {
    throw error;
  }
}

async function removeTab(tabId) {
  try {
    if (typeof browser !== 'undefined') {
      await browserAPI.tabs.remove(tabId);
    } else {
      browserAPI.tabs.remove(tabId, () => {});
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function fetchLeetCodeSubmissionDetailsFromApi(submission) {
  const rawSubmissionId =
    submission?.submission_id ?? submission?.submissionId ?? null;
  const submissionId = Number.parseInt(String(rawSubmissionId || ''), 10);

  if (!Number.isFinite(submissionId) || submissionId <= 0) {
    return {
      success: false,
      error: 'Invalid LeetCode submission id',
    };
  }

  const queryAttempts = [
    {
      field: 'submissionDetails',
      query: `
        query submissionDetails($submissionId: Int!) {
          submissionDetails(submissionId: $submissionId) {
            runtime
            runtimeDisplay
            memory
            memoryDisplay
            code
            timestamp
            statusDisplay
            lang
            question {
              title
              titleSlug
              difficulty
              topicTags {
                name
              }
            }
          }
        }
      `,
    },
    {
      field: 'submissionDetail',
      query: `
        query submissionDetail($submissionId: Int!) {
          submissionDetail(submissionId: $submissionId) {
            runtime
            memory
            code
            timestamp
            statusDisplay
            lang
            question {
              title
              titleSlug
              difficulty
              topicTags {
                name
              }
            }
          }
        }
      `,
    },
  ];

  let details = null;
  let lastError = null;

  for (const attempt of queryAttempts) {
    try {
      const response = await fetch(PLATFORMS_CONFIG.leetcode.apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          query: attempt.query,
          variables: {
            submissionId,
          },
        }),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const payload = await response.json();
      if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
        lastError = payload.errors[0]?.message || 'GraphQL query failed';
        continue;
      }

      const candidate = payload?.data?.[attempt.field];
      if (candidate && typeof candidate === 'object') {
        details = candidate;
        break;
      }
    } catch (error) {
      lastError = error.message;
    }
  }

  if (!details) {
    return {
      success: false,
      error: lastError || 'LeetCode submission details unavailable',
    };
  }

  const question = details.question || {};
  const problemId =
    question.titleSlug ||
    submission?.problem_id ||
    submission?.problemId ||
    null;
  const topicTags = Array.isArray(question.topicTags)
    ? question.topicTags.map((tag) => tag?.name).filter(Boolean)
    : [];

  const runtimeValue =
    details.runtimeDisplay ?? details.runtime ?? submission?.execution_time_ms;
  const memoryValue =
    details.memoryDisplay ?? details.memory ?? submission?.memory_kb;
  const submittedAt =
    unixTimestampToIsoOrNull(details.timestamp) ||
    submission?.submitted_at ||
    null;

  return {
    success: true,
    data: {
      platform: 'leetcode',
      submission_id: String(submissionId),
      submission_url:
        submission?.submission_url ||
        `https://leetcode.com/submissions/detail/${submissionId}/`,
      problem_id: problemId,
      problem_name: question.title || submission?.problem_name || problemId,
      problem_url:
        problemId != null
          ? `https://leetcode.com/problems/${problemId}/`
          : submission?.problem_url || null,
      verdict: normalizeVerdict(details.statusDisplay || submission?.verdict),
      language: details.lang || submission?.language || 'Unknown',
      execution_time_ms: parseLeetCodeRuntimeToMs(runtimeValue),
      memory_kb: parseLeetCodeMemoryToKb(memoryValue),
      submitted_at: submittedAt,
      difficulty_rating: mapLeetCodeDifficultyToRating(question.difficulty),
      tags: topicTags,
      source_code: typeof details.code === 'string' ? details.code : null,
    },
  };
}

async function extractSourceCode(submission, platform) {
  let tabId = null;
  let leetcodeApiData = null;

  try {
    if (platform === 'leetcode') {
      const apiResult = await fetchLeetCodeSubmissionDetailsFromApi(submission);
      if (apiResult.success && apiResult.data) {
        leetcodeApiData = apiResult.data;
        if (apiResult.data.source_code) {
          return { success: true, data: apiResult.data };
        }
      }
    }

    if (!submission?.submission_url) {
      if (leetcodeApiData?.source_code) {
        return { success: true, data: leetcodeApiData };
      }
      throw new Error('Missing submission URL');
    }

    const tab = await createTab(submission.submission_url);
    tabId = tab.id;
    currentFetchTabId = tabId;

    let retryCount = 0;
    let scriptInjected = false;
    const maxRetries = 20;
    const startTime = Date.now();
    const timeout = 60000;

    while (retryCount < maxRetries && Date.now() - startTime < timeout) {
      if (importState.stopRequested) {
        throw new Error('Stopped');
      }

      retryCount++;

      const tabInfo = await getTabInfo(tabId);
      if (!tabInfo) {
        throw new Error('Tab closed');
      }

      if (tabInfo.status === 'loading') {
        await sleep(1500);
        continue;
      }

      if (!scriptInjected) {
        const injected = await injectContentScript(tabId, platform);
        if (injected) {
          scriptInjected = true;
          await sleep(2000);
        } else {
          await sleep(1000);
          continue;
        }
      }

      try {
        const response = await sendMessageToTab(tabId, {
          action: 'extractSubmission',
        });

        if (response?.success && response?.data) {
          const mergedData = leetcodeApiData
            ? { ...response.data, ...leetcodeApiData }
            : response.data;
          return { success: true, data: mergedData };
        } else if (response?.pending) {
          await sleep(1500);
          continue;
        } else {
          if (retryCount >= maxRetries) {
            throw new Error(response?.error || 'Extraction failed');
          }
          if (retryCount > 5) {
            scriptInjected = false;
          }
          await sleep(1000 + retryCount * 200);
        }
      } catch {
        if (retryCount > 5) {
          scriptInjected = false;
        }
        await sleep(1000 + retryCount * 200);
      }
    }

    throw new Error('Max retries exceeded');
  } catch (error) {
    console.error('[NEUPC] Extract error:', error.message);
    return { success: false, error: error.message };
  } finally {
    currentFetchTabId = null;
    if (tabId) {
      await removeTab(tabId);
    }
  }
}

// Extract problem details from problem page
function normalizeProblemDetailsUrl(problemUrl, platform) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  if (normalizedPlatform !== 'leetcode') {
    return problemUrl;
  }

  try {
    const parsed = new URL(problemUrl);
    const match = parsed.pathname.match(/^\/problems\/([^/]+)\/?$/);
    if (match?.[1]) {
      parsed.pathname = `/problems/${match[1]}/description/`;
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    }
  } catch {
    // Fall through to original URL when URL parsing fails.
  }

  return problemUrl;
}

function hasMeaningfulProblemDetails(details) {
  if (!details || typeof details !== 'object') return false;

  const description = firstDefinedValue(
    details.description,
    details.problemDescription,
    details.problem_description
  );
  const inputFormat = firstDefinedValue(
    details.inputFormat,
    details.input_format
  );
  const outputFormat = firstDefinedValue(
    details.outputFormat,
    details.output_format
  );

  const hasDescription =
    typeof description === 'string' && description.trim().length >= 20;
  const hasInputOutput =
    typeof inputFormat === 'string' &&
    inputFormat.trim().length > 0 &&
    typeof outputFormat === 'string' &&
    outputFormat.trim().length > 0;
  const hasExamples =
    Array.isArray(details.examples) && details.examples.length > 0;
  const hasConstraints =
    typeof details.constraints === 'string' &&
    details.constraints.trim().length > 0;

  return hasDescription || hasInputOutput || hasExamples || hasConstraints;
}

async function extractProblemDetails(problemUrl, platform) {
  let tabId = null;

  try {
    const detailsUrl = normalizeProblemDetailsUrl(problemUrl, platform);
    const tab = await createTab(detailsUrl);
    tabId = tab.id;

    let retryCount = 0;
    let scriptInjected = false;
    const maxRetries = 15;
    const startTime = Date.now();
    const timeout = 45000;

    while (retryCount < maxRetries && Date.now() - startTime < timeout) {
      if (importState.stopRequested) {
        throw new Error('Stopped');
      }

      retryCount++;

      const tabInfo = await getTabInfo(tabId);
      if (!tabInfo) {
        throw new Error('Tab closed');
      }

      if (tabInfo.status === 'loading') {
        await sleep(1000);
        continue;
      }

      if (!scriptInjected) {
        const injected = await injectContentScript(tabId, platform);
        if (injected) {
          scriptInjected = true;
          await sleep(1500);
        } else {
          await sleep(800);
          continue;
        }
      }

      try {
        const response = await sendMessageToTab(tabId, {
          action: 'extractProblemDetails',
        });

        if (response?.success && response?.data) {
          const qualityOk = hasMeaningfulProblemDetails(response.data);

          if (!qualityOk && retryCount < maxRetries) {
            console.warn(
              '[NEUPC][TEST] extractProblemDetails incomplete payload, retrying',
              {
                problemUrl: detailsUrl,
                retryCount,
                hasDescription:
                  typeof firstDefinedValue(
                    response.data.description,
                    response.data.problemDescription,
                    response.data.problem_description
                  ) === 'string',
                examplesCount: Array.isArray(response.data.examples)
                  ? response.data.examples.length
                  : 0,
                hasConstraints:
                  typeof response.data.constraints === 'string' &&
                  response.data.constraints.trim().length > 0,
              }
            );
            await sleep(800 + retryCount * 150);
            continue;
          }

          return { success: true, data: response.data };
        } else if (response?.pending) {
          await sleep(1000);
          continue;
        } else {
          if (retryCount >= maxRetries) {
            throw new Error(response?.error || 'Problem extraction failed');
          }
          if (retryCount > 4) {
            scriptInjected = false;
          }
          await sleep(800 + retryCount * 150);
        }
      } catch {
        if (retryCount > 4) {
          scriptInjected = false;
        }
        await sleep(800 + retryCount * 150);
      }
    }

    throw new Error('Max retries exceeded for problem extraction');
  } catch (error) {
    console.error('[NEUPC] Problem extraction error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (tabId) {
      await removeTab(tabId);
    }
  }
}

// ============================================================
// CODEFORCES API
// ============================================================

async function fetchCodeforcesSubmissionsPage(handle, page) {
  const perPage = PLATFORMS_CONFIG.codeforces.submissionsPerPage;
  const from = (page - 1) * perPage + 1;

  console.log(`[NEUPC] Fetching CF page ${page} (from=${from})`);

  const response = await fetch(
    `${PLATFORMS_CONFIG.codeforces.apiUrl}/user.status?handle=${handle}&from=${from}&count=${perPage}`
  );
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.comment || 'Codeforces API error');
  }

  return data.result.map((sub) => {
    const contestId = sub.problem.contestId;
    // Gym contest IDs on Codeforces are >= 100000; regular contests are lower.
    const isGym = contestId != null && contestId >= 100000;
    const contestType = isGym ? 'gym' : 'contest';
    const baseUrl = `https://codeforces.com/${contestType}/${contestId}`;

    // Build problem ID: fall back gracefully when contestId is missing
    const problemId =
      contestId != null
        ? `${contestId}${sub.problem.index}`
        : sub.problem.index;

    return {
      submission_id: sub.id.toString(),
      problem_id: problemId,
      problem_name: sub.problem.name,
      problem_url:
        contestId != null ? `${baseUrl}/problem/${sub.problem.index}` : null,
      contest_id: contestId?.toString() || null,
      verdict: normalizeVerdict(sub.verdict),
      language: sub.programmingLanguage,
      execution_time_ms: sub.timeConsumedMillis || null,
      memory_kb: sub.memoryConsumedBytes
        ? Math.floor(sub.memoryConsumedBytes / 1024)
        : null,
      submitted_at: new Date(sub.creationTimeSeconds * 1000).toISOString(),
      difficulty_rating: sub.problem.rating || null,
      tags: sub.problem.tags || [],
      source_code: null,
      submission_url:
        contestId != null ? `${baseUrl}/submission/${sub.id}` : null,
    };
  });
}

async function getCodeforcesTotalSubmissions(handle) {
  // Fetch with a very large count to get actual total
  // Codeforces API returns all submissions if count is large enough
  const response = await fetch(
    `${PLATFORMS_CONFIG.codeforces.apiUrl}/user.status?handle=${handle}&from=1&count=100000`
  );
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.comment || 'Codeforces API error');
  }

  return data.result.length;
}

// ============================================================
// ATCODER API (via Kenkoooo API)
// ============================================================

const ATCODER_METADATA_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const atcoderProblemMetadataCache = {
  expiresAt: 0,
  byProblemId: new Map(),
  loadingPromise: null,
};

async function getAtCoderProblemMetadataMap() {
  if (
    atcoderProblemMetadataCache.byProblemId.size > 0 &&
    Date.now() < atcoderProblemMetadataCache.expiresAt
  ) {
    return atcoderProblemMetadataCache.byProblemId;
  }

  if (atcoderProblemMetadataCache.loadingPromise) {
    return atcoderProblemMetadataCache.loadingPromise;
  }

  atcoderProblemMetadataCache.loadingPromise = (async () => {
    const [problemsResult, modelsResult] = await Promise.allSettled([
      fetch('https://kenkoooo.com/atcoder/resources/problems.json'),
      fetch('https://kenkoooo.com/atcoder/resources/problem-models.json'),
    ]);

    const metadataById = new Map();

    if (problemsResult.status === 'fulfilled' && problemsResult.value.ok) {
      const problems = await problemsResult.value.json();
      if (Array.isArray(problems)) {
        for (const problem of problems) {
          if (!problem?.id) continue;
          metadataById.set(problem.id, {
            title: problem.title || problem.id,
            contestId: problem.contest_id || null,
            tags: Array.isArray(problem.tags) ? problem.tags : [],
            difficulty: null,
          });
        }
      }
    }

    if (modelsResult.status === 'fulfilled' && modelsResult.value.ok) {
      const models = await modelsResult.value.json();
      if (models && typeof models === 'object') {
        for (const [problemId, model] of Object.entries(models)) {
          if (!problemId) continue;
          const existing = metadataById.get(problemId) || {
            title: problemId,
            contestId: null,
            tags: [],
            difficulty: null,
          };

          const rawDifficulty = model?.difficulty;
          const normalizedDifficulty = Number.isFinite(rawDifficulty)
            ? Math.round(rawDifficulty)
            : null;

          metadataById.set(problemId, {
            ...existing,
            difficulty: normalizedDifficulty,
          });
        }
      }
    }

    if (metadataById.size > 0) {
      atcoderProblemMetadataCache.byProblemId = metadataById;
      atcoderProblemMetadataCache.expiresAt =
        Date.now() + ATCODER_METADATA_CACHE_TTL_MS;
    }

    return atcoderProblemMetadataCache.byProblemId;
  })()
    .catch((error) => {
      console.warn('[NEUPC] AtCoder metadata enrichment unavailable:', error);
      return atcoderProblemMetadataCache.byProblemId;
    })
    .finally(() => {
      atcoderProblemMetadataCache.loadingPromise = null;
    });

  return atcoderProblemMetadataCache.loadingPromise;
}

async function fetchAtCoderSubmissions(handle) {
  console.log(`[NEUPC] Fetching AtCoder submissions for ${handle}`);

  let problemMetadataById = new Map();
  try {
    problemMetadataById = await getAtCoderProblemMetadataMap();
  } catch (error) {
    console.warn(
      '[NEUPC] Continuing AtCoder fetch without metadata enrichment:',
      error
    );
  }

  const response = await fetch(
    `${PLATFORMS_CONFIG.atcoder.apiUrl}/user/submissions?user=${handle}`
  );

  if (!response.ok) {
    throw new Error('AtCoder API error');
  }

  const submissions = await response.json();

  return submissions.map((sub) => {
    const metadata = problemMetadataById.get(sub.problem_id);

    return {
      submission_id: sub.id.toString(),
      problem_id: sub.problem_id,
      problem_name: metadata?.title || sub.problem_id,
      problem_url: `https://atcoder.jp/contests/${sub.contest_id}/tasks/${sub.problem_id}`,
      contest_id: sub.contest_id,
      verdict: sub.result === 'AC' ? 'AC' : normalizeVerdict(sub.result),
      language: sub.language,
      execution_time_ms: sub.execution_time,
      memory_kb: Math.floor((sub.memory || 0) / 1024),
      submitted_at: new Date(sub.epoch_second * 1000).toISOString(),
      difficulty_rating: metadata?.difficulty ?? null,
      tags: Array.isArray(metadata?.tags) ? metadata.tags : [],
      source_code: null,
      submission_url: `https://atcoder.jp/contests/${sub.contest_id}/submissions/${sub.id}`,
    };
  });
}

function unixTimestampToIsoOrNull(timestamp) {
  const seconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const parsed = new Date(seconds * 1000);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseLeetCodeRuntimeToMs(runtime) {
  if (runtime == null) {
    return null;
  }

  const text = String(runtime).trim();
  const match = text.match(/(\d+)/);
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function parseLeetCodeMemoryToKb(memory) {
  if (memory == null) {
    return null;
  }

  if (typeof memory === 'number' && Number.isFinite(memory)) {
    // LeetCode commonly returns memory in MB in API payloads.
    return Math.round(memory * 1024);
  }

  const text = String(memory).trim();
  const match = text.match(/([0-9]*\.?[0-9]+)/);
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  const upper = text.toUpperCase();
  if (upper.includes('GB')) {
    return Math.round(value * 1024 * 1024);
  }
  if (upper.includes('KB')) {
    return Math.round(value);
  }
  if (upper.includes('B') && !upper.includes('MB')) {
    return Math.round(value / 1024);
  }

  return Math.round(value * 1024);
}

function mapLeetCodeDifficultyToRating(difficulty) {
  if (!difficulty) {
    return null;
  }

  const normalized = String(difficulty).trim().toLowerCase();
  if (normalized === 'easy') return 1200;
  if (normalized === 'medium') return 1700;
  if (normalized === 'hard') return 2300;

  return null;
}

function normalizeLeetCodeSubmittedAt(rawTimestamp) {
  const fromUnix = unixTimestampToIsoOrNull(rawTimestamp);
  if (fromUnix) {
    return fromUnix;
  }

  if (rawTimestamp == null) {
    return null;
  }

  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeLeetCodeHandleInput(rawHandle) {
  if (rawHandle == null) {
    return '';
  }

  let handle = String(rawHandle).trim();
  if (!handle) {
    return '';
  }

  // Accept common formats such as @username, /u/username, or full profile URLs.
  handle = handle.replace(/^@+/, '');
  handle = handle.replace(
    /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\//i,
    ''
  );
  handle = handle.replace(/^(?:u|profile)\//i, '');
  handle = handle.split(/[/?#]/)[0].replace(/^@+/, '').trim();

  return handle;
}

function normalizeLeetCodeSubmission(rawSubmission, handle) {
  const submissionId =
    rawSubmission?.id?.toString?.() ||
    rawSubmission?.submission_id?.toString?.() ||
    null;
  const problemId =
    rawSubmission?.titleSlug ||
    rawSubmission?.title_slug ||
    rawSubmission?.problem_id ||
    null;
  const submittedAt = normalizeLeetCodeSubmittedAt(
    rawSubmission?.timestamp ?? rawSubmission?.submitted_at
  );

  if (!submissionId || !problemId || !submittedAt) {
    return null;
  }

  const rawUrl =
    typeof rawSubmission?.url === 'string' ? rawSubmission.url.trim() : '';
  let submissionUrl = `https://leetcode.com/submissions/detail/${submissionId}/`;

  if (rawUrl) {
    submissionUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `https://leetcode.com${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  const normalizedVerdict = normalizeVerdict(
    rawSubmission?.statusDisplay ??
      rawSubmission?.status_display ??
      rawSubmission?.verdict
  );

  const topicTags = Array.isArray(rawSubmission?.topicTags)
    ? rawSubmission.topicTags
    : Array.isArray(rawSubmission?.topic_tags)
      ? rawSubmission.topic_tags
      : [];

  const normalizedTags = topicTags
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
    .filter(Boolean);

  return {
    submission_id: submissionId,
    problem_id: problemId,
    problem_name: rawSubmission?.title || problemId,
    problem_url: `https://leetcode.com/problems/${problemId}/`,
    contest_id: null,
    verdict: normalizedVerdict || 'UNKNOWN',
    language: rawSubmission?.lang || rawSubmission?.lang_name || 'Unknown',
    execution_time_ms: parseLeetCodeRuntimeToMs(
      rawSubmission?.runtimeDisplay ??
        rawSubmission?.runtime_display ??
        rawSubmission?.runtime
    ),
    memory_kb: parseLeetCodeMemoryToKb(
      rawSubmission?.memoryDisplay ??
        rawSubmission?.memory_display ??
        rawSubmission?.memory
    ),
    submitted_at: submittedAt,
    difficulty_rating: mapLeetCodeDifficultyToRating(rawSubmission?.difficulty),
    tags: normalizedTags,
    source_code:
      typeof rawSubmission?.code === 'string' ? rawSubmission.code : null,
    submission_url: submissionUrl,
    handle,
    platform: 'leetcode',
  };
}

async function fetchLeetCodeSubmissions(handle) {
  const normalizedHandle = normalizeLeetCodeHandleInput(handle);
  if (!normalizedHandle) {
    throw new Error('Invalid LeetCode handle format');
  }

  console.log(`[NEUPC] Fetching LeetCode submissions for ${normalizedHandle}`);

  const bySubmissionId = new Map();
  const diagnostics = {
    source: 'public_recent',
    usedAuthenticated: false,
    pagesFetched: 0,
    duplicatesSkipped: 0,
    invalidSkipped: 0,
    authError: null,
    authGraphQLError: null,
    publicLimit: 100,
    publicReturned: 0,
  };

  const addSubmission = (raw) => {
    const normalized = normalizeLeetCodeSubmission(raw, normalizedHandle);
    if (!normalized) {
      diagnostics.invalidSkipped++;
      return;
    }

    if (bySubmissionId.has(normalized.submission_id)) {
      diagnostics.duplicatesSkipped++;
      return;
    }

    bySubmissionId.set(normalized.submission_id, normalized);
  };

  let authenticatedSucceeded = false;

  try {
    const limit = 20;
    let offset = 0;
    let hasNext = true;

    while (hasNext && offset < 50000) {
      const response = await fetch(
        `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rows = Array.isArray(data?.submissions_dump)
        ? data.submissions_dump
        : Array.isArray(data?.submissions)
          ? data.submissions
          : [];

      if (!Array.isArray(rows)) {
        throw new Error('Authenticated submissions payload unavailable');
      }

      diagnostics.pagesFetched++;

      for (const row of rows) {
        addSubmission(row);
      }

      if (rows.length === 0) {
        break;
      }

      hasNext = Boolean(data?.has_next);
      offset += limit;
      await sleep(250);
    }

    if (bySubmissionId.size > 0) {
      authenticatedSucceeded = true;
      diagnostics.source = 'authenticated_rest_submissions';
      diagnostics.usedAuthenticated = true;
    }
  } catch (error) {
    diagnostics.authError = error.message;
    console.warn(
      `[NEUPC] LeetCode authenticated REST fetch unavailable: ${error.message}`
    );
  }

  if (!authenticatedSucceeded) {
    const authQuery = `
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
            runtime
            memory
            url
          }
        }
      }
    `;

    try {
      const limit = 20;
      let offset = 0;
      let hasNext = true;

      while (hasNext && offset < 50000) {
        const response = await fetch(PLATFORMS_CONFIG.leetcode.apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({
            query: authQuery,
            variables: {
              offset,
              limit,
              questionSlug: '',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const list = data?.data?.submissionList;

        if (data?.errors?.length) {
          throw new Error(
            data.errors[0]?.message || 'GraphQL auth query failed'
          );
        }

        if (!list || !Array.isArray(list.submissions)) {
          throw new Error('Authenticated submission list unavailable');
        }

        diagnostics.pagesFetched++;

        for (const sub of list.submissions) {
          addSubmission(sub);
        }

        if (list.submissions.length === 0) {
          break;
        }

        hasNext = Boolean(list.hasNext);
        offset += limit;
        await sleep(300);
      }

      if (bySubmissionId.size > 0) {
        authenticatedSucceeded = true;
        diagnostics.source = 'authenticated_graphql_submission_list';
        diagnostics.usedAuthenticated = true;
      }
    } catch (error) {
      diagnostics.authGraphQLError = error.message;
      diagnostics.authError = diagnostics.authError
        ? `${diagnostics.authError}; GraphQL: ${error.message}`
        : error.message;
      console.warn(
        `[NEUPC] LeetCode authenticated GraphQL fetch unavailable: ${error.message}`
      );
    }
  }

  if (!authenticatedSucceeded) {
    const publicQuery = `
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

    const candidateHandles = [normalizedHandle];
    const lowercaseHandle = normalizedHandle.toLowerCase();
    if (
      lowercaseHandle !== normalizedHandle &&
      !candidateHandles.includes(lowercaseHandle)
    ) {
      candidateHandles.push(lowercaseHandle);
    }

    let lastPublicError = null;

    for (const candidateHandle of candidateHandles) {
      const response = await fetch(PLATFORMS_CONFIG.leetcode.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: publicQuery,
          variables: {
            username: candidateHandle,
            limit: diagnostics.publicLimit,
          },
        }),
      });

      if (!response.ok) {
        lastPublicError = `LeetCode public API error: HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const recentList = Array.isArray(data?.data?.recentAcSubmissionList)
        ? data.data.recentAcSubmissionList
        : [];

      if (data?.errors?.length && recentList.length === 0) {
        lastPublicError =
          data.errors[0]?.message || 'LeetCode public API error';
        continue;
      }

      diagnostics.publicReturned = recentList.length;

      for (const sub of recentList) {
        addSubmission({
          ...sub,
          statusDisplay: 'Accepted',
        });
      }

      const isLastCandidate =
        candidateHandle === candidateHandles[candidateHandles.length - 1];
      if (recentList.length > 0 || isLastCandidate) {
        break;
      }
    }

    if (bySubmissionId.size === 0 && lastPublicError) {
      throw new Error(lastPublicError);
    }
  }

  return {
    submissions: Array.from(bySubmissionId.values()),
    diagnostics,
  };
}

function buildLeetCodeValidationSummary(
  submissions,
  diagnostics,
  existingSubmissionCount
) {
  const dates = submissions
    .map((sub) => Date.parse(sub.submitted_at || ''))
    .filter((value) => Number.isFinite(value));

  const uniqueProblemCount = new Set(
    submissions.map((sub) => sub.problem_id).filter(Boolean)
  ).size;

  const firstExtraction = existingSubmissionCount === 0;
  const authenticatedSources = new Set([
    'authenticated_rest_submissions',
    'authenticated_graphql_submission_list',
    'authenticated_submission_list',
  ]);
  const isLikelyPartial =
    !authenticatedSources.has(diagnostics.source) &&
    submissions.length >= diagnostics.publicLimit;

  const warnings = [];
  if (diagnostics.invalidSkipped > 0) {
    warnings.push(
      `${diagnostics.invalidSkipped} rows were skipped due to missing id/problem/date.`
    );
  }
  if (diagnostics.duplicatesSkipped > 0) {
    warnings.push(
      `${diagnostics.duplicatesSkipped} duplicate submissions were ignored.`
    );
  }
  if (firstExtraction && isLikelyPartial) {
    warnings.push(
      'Public LeetCode API appears limited. Sign in to leetcode.com and rerun import for full history.'
    );
  }

  let message =
    submissions.length > 0
      ? `LeetCode extraction validated: ${submissions.length} submissions from ${diagnostics.source.replaceAll('_', ' ')}.`
      : 'LeetCode extraction validation failed: no submissions found.';

  if (firstExtraction) {
    message = `First extraction check: ${message}`;
  }

  if (warnings.length > 0) {
    message = `${message} ${warnings[0]}`;
  }

  return {
    platform: 'leetcode',
    firstExtraction,
    status: submissions.length > 0 ? 'passed' : 'failed',
    source: diagnostics.source,
    existingSubmissionCount,
    extractedSubmissions: submissions.length,
    uniqueProblems: uniqueProblemCount,
    earliestSubmissionAt:
      dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
    latestSubmissionAt:
      dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
    likelyPartial: isLikelyPartial,
    warnings,
    message,
  };
}

function firstDefinedValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return null;
}

function mergeExtractedSubmissionData(importCandidate, extracted) {
  if (!importCandidate || !extracted || typeof extracted !== 'object') {
    return;
  }

  const extractedSourceCode = firstDefinedValue(
    extracted.sourceCode,
    extracted.source_code
  );
  if (extractedSourceCode) {
    importCandidate.source_code = extractedSourceCode;
  }

  const extractedProblemId = firstDefinedValue(
    extracted.problemId,
    extracted.problem_id
  );
  if (extractedProblemId) {
    importCandidate.problem_id = extractedProblemId;
  }

  const extractedProblemName = firstDefinedValue(
    extracted.problemName,
    extracted.problem_name
  );
  if (
    extractedProblemName &&
    (!importCandidate.problem_name ||
      importCandidate.problem_name === importCandidate.problem_id)
  ) {
    importCandidate.problem_name = extractedProblemName;
  }

  const extractedProblemUrl = firstDefinedValue(
    extracted.problemUrl,
    extracted.problem_url
  );
  if (extractedProblemUrl) {
    importCandidate.problem_url = extractedProblemUrl;
  }

  const extractedContestId = firstDefinedValue(
    extracted.contestId,
    extracted.contest_id
  );
  if (extractedContestId && !importCandidate.contest_id) {
    importCandidate.contest_id = extractedContestId;
  }

  const extractedVerdict = firstDefinedValue(extracted.verdict);
  if (
    extractedVerdict &&
    (!importCandidate.verdict || importCandidate.verdict === 'UNKNOWN')
  ) {
    importCandidate.verdict = extractedVerdict;
  }

  const extractedLanguage = firstDefinedValue(extracted.language);
  if (
    extractedLanguage &&
    (!importCandidate.language || importCandidate.language === 'Unknown')
  ) {
    importCandidate.language = extractedLanguage;
  }

  const extractedExecutionTime = firstDefinedValue(
    extracted.executionTime,
    extracted.execution_time_ms
  );
  if (
    extractedExecutionTime != null &&
    (importCandidate.execution_time_ms == null ||
      Number(importCandidate.execution_time_ms) <= 0)
  ) {
    importCandidate.execution_time_ms = Number(extractedExecutionTime);
  }

  const extractedMemory = firstDefinedValue(
    extracted.memoryUsed,
    extracted.memory_kb
  );
  if (
    extractedMemory != null &&
    (importCandidate.memory_kb == null ||
      Number(importCandidate.memory_kb) <= 0)
  ) {
    importCandidate.memory_kb = Number(extractedMemory);
  }

  const extractedSubmittedAt = firstDefinedValue(
    extracted.submittedAt,
    extracted.submitted_at
  );
  if (extractedSubmittedAt && !importCandidate.submitted_at) {
    importCandidate.submitted_at = extractedSubmittedAt;
  }

  const extractedDifficulty = firstDefinedValue(
    extracted.problemRating,
    extracted.difficultyRating,
    extracted.difficulty_rating,
    extracted.difficulty
  );
  if (extractedDifficulty != null) {
    importCandidate.difficulty_rating = extractedDifficulty;
  }

  const extractedTags = Array.isArray(extracted.problemTags)
    ? extracted.problemTags
    : Array.isArray(extracted.tags)
      ? extracted.tags
      : null;
  if (extractedTags && extractedTags.length > 0) {
    importCandidate.tags = extractedTags;
  }
}

function buildProblemDetailsCacheKey(importCandidate, platform) {
  if (!importCandidate) return null;

  const problemId = firstDefinedValue(
    importCandidate.problem_id,
    importCandidate.problemId
  );
  if (problemId) {
    return `${platform || 'unknown'}:${problemId}`;
  }

  const problemUrl = firstDefinedValue(
    importCandidate.problem_url,
    importCandidate.problemUrl
  );
  if (problemUrl) {
    return `${platform || 'unknown'}:url:${problemUrl}`;
  }

  return null;
}

function applyProblemDetailsToImportCandidate(
  importCandidate,
  details,
  missingFields = null
) {
  if (!importCandidate || !details || typeof details !== 'object') {
    return;
  }

  const missingFieldSet = Array.isArray(missingFields)
    ? new Set(
        missingFields.map((field) => String(field || '').trim()).filter(Boolean)
      )
    : null;

  const hasMissingFieldFilter =
    missingFieldSet != null && missingFieldSet.size > 0;

  // Only do a full merge when we are not targeting specific missing fields.
  if (!hasMissingFieldFilter) {
    mergeExtractedSubmissionData(importCandidate, details);
  }

  const shouldApplyField = (fieldName) =>
    !missingFieldSet ||
    missingFieldSet.size === 0 ||
    missingFieldSet.has(fieldName);

  const description = firstDefinedValue(
    details.description,
    details.problemDescription,
    details.problem_description
  );
  if (
    shouldApplyField('description') &&
    typeof description === 'string' &&
    description.trim()
  ) {
    importCandidate.description = description;
    importCandidate.problemDescription = description;
    importCandidate.problem_description = description;
  }

  const inputFormat = firstDefinedValue(
    details.inputFormat,
    details.input_format
  );
  if (
    shouldApplyField('input_format') &&
    typeof inputFormat === 'string' &&
    inputFormat.trim()
  ) {
    importCandidate.inputFormat = inputFormat;
    importCandidate.input_format = inputFormat;
  }

  const outputFormat = firstDefinedValue(
    details.outputFormat,
    details.output_format
  );
  if (
    shouldApplyField('output_format') &&
    typeof outputFormat === 'string' &&
    outputFormat.trim()
  ) {
    importCandidate.outputFormat = outputFormat;
    importCandidate.output_format = outputFormat;
  }

  if (
    shouldApplyField('constraints') &&
    typeof details.constraints === 'string' &&
    details.constraints.trim()
  ) {
    importCandidate.constraints = details.constraints;
  }

  const examples = Array.isArray(details.examples)
    ? details.examples
    : Array.isArray(details.sample_tests)
      ? details.sample_tests
      : [];
  if (shouldApplyField('examples') && examples.length > 0) {
    importCandidate.examples = examples;
    importCandidate.sample_tests = examples;
  }

  if (
    shouldApplyField('notes') &&
    typeof details.notes === 'string' &&
    details.notes.trim()
  ) {
    importCandidate.notes = details.notes;
  }

  const tutorialUrl = firstDefinedValue(
    details.tutorialUrl,
    details.tutorial_url
  );
  if (
    shouldApplyField('tutorial_url') &&
    typeof tutorialUrl === 'string' &&
    tutorialUrl.trim()
  ) {
    importCandidate.tutorialUrl = tutorialUrl;
    importCandidate.tutorial_url = tutorialUrl;
  }

  const tutorialContent = firstDefinedValue(
    details.tutorialContent,
    details.tutorial_content
  );
  if (
    shouldApplyField('tutorial_content') &&
    typeof tutorialContent === 'string' &&
    tutorialContent.trim()
  ) {
    importCandidate.tutorialContent = tutorialContent;
    importCandidate.tutorial_content = tutorialContent;
  }

  const tutorialSolutions = Array.isArray(details.tutorialSolutions)
    ? details.tutorialSolutions
    : Array.isArray(details.tutorial_solutions)
      ? details.tutorial_solutions
      : [];
  if (shouldApplyField('tutorial_solutions') && tutorialSolutions.length > 0) {
    importCandidate.tutorialSolutions = tutorialSolutions;
    importCandidate.tutorial_solutions = tutorialSolutions;
  }

  const timeLimitMs = firstDefinedValue(
    details.timeLimitMs,
    details.time_limit_ms,
    details.timeLimit
  );
  const normalizedTimeLimit =
    timeLimitMs != null && Number.isFinite(Number(timeLimitMs))
      ? Number(timeLimitMs)
      : null;
  if (shouldApplyField('time_limit_ms') && normalizedTimeLimit != null) {
    importCandidate.time_limit_ms = normalizedTimeLimit;
    importCandidate.timeLimit = normalizedTimeLimit;
  }

  const memoryLimitKb = firstDefinedValue(
    details.memoryLimitKb,
    details.memory_limit_kb,
    details.memoryLimit
  );
  const normalizedMemoryLimit =
    memoryLimitKb != null && Number.isFinite(Number(memoryLimitKb))
      ? Number(memoryLimitKb)
      : null;
  if (shouldApplyField('memory_limit_kb') && normalizedMemoryLimit != null) {
    importCandidate.memory_limit_kb = normalizedMemoryLimit;
    importCandidate.memoryLimit = normalizedMemoryLimit;
  }
}

async function enrichProblemDetailsForImport(
  importCandidate,
  platform,
  progressContext = {},
  missingFields = null
) {
  if (!importCandidate?.problem_url) {
    return {
      success: false,
      attempted: false,
      fromCache: false,
      error: 'Missing problem URL',
    };
  }

  const normalizedMissingFields = Array.isArray(missingFields)
    ? missingFields.map((field) => String(field || '').trim()).filter(Boolean)
    : null;

  if (
    Array.isArray(normalizedMissingFields) &&
    normalizedMissingFields.length === 0
  ) {
    return {
      success: true,
      attempted: false,
      fromCache: true,
      skippedReason: 'already_complete_in_db',
    };
  }

  const cacheKey = buildProblemDetailsCacheKey(importCandidate, platform);

  if (cacheKey && problemDetailsCache.has(cacheKey)) {
    const cachedDetails = problemDetailsCache.get(cacheKey);
    if (cachedDetails) {
      applyProblemDetailsToImportCandidate(
        importCandidate,
        cachedDetails,
        normalizedMissingFields
      );
      return {
        success: true,
        attempted: true,
        fromCache: true,
      };
    }

    return {
      success: false,
      attempted: true,
      fromCache: true,
      error: 'Cached previous extraction failure',
    };
  }

  const { label, currentPage, totalPages, currentItem, totalItems } =
    progressContext;

  if (label && currentPage != null && totalPages != null) {
    sendProgress({
      phase: 'fetching_codes',
      message: `${label}: Extracting problem details ${currentItem}/${totalItems} - ${importCandidate.problem_id}`,
      currentPage,
      totalPages,
      currentItem,
      totalItems,
    });
  }

  const problemResult = await extractProblemDetails(
    importCandidate.problem_url,
    platform
  );

  if (problemResult.success && problemResult.data) {
    if (cacheKey) {
      problemDetailsCache.set(cacheKey, problemResult.data);
    }

    applyProblemDetailsToImportCandidate(
      importCandidate,
      problemResult.data,
      normalizedMissingFields
    );

    return {
      success: true,
      attempted: true,
      fromCache: false,
    };
  }

  if (cacheKey) {
    problemDetailsCache.set(cacheKey, null);
  }

  return {
    success: false,
    attempted: true,
    fromCache: false,
    error: problemResult.error || 'Problem details extraction failed',
  };
}

// ============================================================
// PAGE-BY-PAGE IMPORT WORKFLOW
// ============================================================

async function processPage(handle, page, totalPages, options) {
  const {
    platform = 'codeforces',
    fetchCodes = true,
    onlyAC = true,
    verdictFilter = 'all',
    skipExisting = false,
  } = options;
  const effectiveVerdictFilter = normalizeVerdictFilter(verdictFilter, onlyAC);

  if (importState.stopRequested) {
    return { stopped: true };
  }

  sendProgress({
    phase: 'fetching_page',
    message: `Fetching page ${page}/${totalPages}...`,
    currentPage: page,
    totalPages: totalPages,
    progress: Math.round(((page - 1) / totalPages) * 100),
  });

  // Fetch submissions for this page
  let submissions;
  try {
    if (platform === 'codeforces') {
      submissions = await fetchCodeforcesSubmissionsPage(handle, page);
    } else {
      throw new Error(`Platform ${platform} does not support paged fetching`);
    }
    console.log(`[NEUPC] Page ${page}: Got ${submissions.length} submissions`);
  } catch (error) {
    console.error(`[NEUPC] Error fetching page ${page}:`, error);
    importState.errors.push({ page, error: error.message });
    return { success: false, error: error.message };
  }

  if (submissions.length === 0) {
    return { success: true, processed: 0, fetched: 0, imported: 0 };
  }

  // In sync-everything mode we process all submissions (new + existing).
  const shouldSkipExisting = Boolean(skipExisting);
  const candidateSubmissions = shouldSkipExisting
    ? submissions.filter((s) => !existingSubmissionIds.has(s.submission_id))
    : submissions;
  const skippedCount = shouldSkipExisting
    ? submissions.length - candidateSubmissions.length
    : 0;

  if (skippedCount > 0) {
    importState.codesSkipped += skippedCount;
  }

  console.log(
    `[NEUPC] Page ${page}: ${candidateSubmissions.length} for import, ${skippedCount} skipped`
  );

  if (candidateSubmissions.length === 0) {
    sendProgress({
      phase: 'fetching_page',
      message: `Page ${page}/${totalPages}: All ${submissions.length} already imported`,
      currentPage: page,
      totalPages: totalPages,
      skipped: skippedCount,
    });
    return {
      success: true,
      processed: submissions.length,
      fetched: 0,
      imported: 0,
    };
  }

  const filteredSubmissions = candidateSubmissions.filter((s) =>
    matchesVerdictFilter(s.verdict, effectiveVerdictFilter)
  );
  const verdictSkippedCount =
    candidateSubmissions.length - filteredSubmissions.length;

  if (verdictSkippedCount > 0) {
    importState.codesSkipped += verdictSkippedCount;
    console.log(
      `[NEUPC] Page ${page}: ${verdictSkippedCount} skipped by verdict filter (${effectiveVerdictFilter})`
    );
  }

  if (filteredSubmissions.length === 0) {
    sendProgress({
      phase: 'fetching_page',
      message: `Page ${page}/${totalPages}: No submissions matched verdict filter (${effectiveVerdictFilter.toUpperCase()})`,
      currentPage: page,
      totalPages: totalPages,
      skipped: verdictSkippedCount,
    });
    return {
      success: true,
      processed: submissions.length,
      fetched: 0,
      imported: 0,
    };
  }

  const readyForImport = [];
  let extractedCount = 0;

  // In full mode, try to enrich each submission with code/details, but never
  // block metadata import if extraction fails.
  if (fetchCodes && filteredSubmissions.length > 0) {
    const pageOptimization = await fetchPageOptimizationStatusForSubmissions(
      filteredSubmissions,
      platform,
      {
        pageNumber: page,
        verdictFilter: effectiveVerdictFilter,
        fetchCodes,
      }
    );

    if (pageOptimization?.allComplete) {
      importState.processedSubmissions += filteredSubmissions.length;
      importState.codesSkipped += filteredSubmissions.length;

      filteredSubmissions.forEach((submission) => {
        const submissionId = normalizeSubmissionIdForLookup(
          firstDefinedValue(submission?.submission_id, submission?.submissionId)
        );
        if (submissionId) {
          existingSubmissionIds.add(submissionId);
        }
      });

      console.warn('[NEUPC][TEST] page extraction skipped', {
        platform,
        page,
        totalPages,
        submissions: filteredSubmissions.length,
        reason: 'all_complete_in_db',
        fromSyncJobs: pageOptimization.fromSyncJobs,
        cacheKey: pageOptimization.cacheKey,
      });

      sendProgress({
        phase: 'fetching_page',
        message: `Page ${page}/${totalPages}: Skipped ${filteredSubmissions.length} submissions (already complete in DB)`,
        currentPage: page,
        totalPages,
      });

      return {
        success: true,
        processed: submissions.length,
        fetched: 0,
        imported: 0,
        created: 0,
        updated: 0,
      };
    }

    if (!pageOptimization) {
      await prefetchProblemDetailStatusForSubmissions(
        filteredSubmissions,
        platform
      );
    }

    sendProgress({
      phase: 'fetching_codes',
      message: `Page ${page}/${totalPages}: Extracting details for ${filteredSubmissions.length} submissions...`,
      currentPage: page,
      totalPages: totalPages,
    });

    for (let i = 0; i < filteredSubmissions.length; i++) {
      if (importState.stopRequested) {
        return { stopped: true };
      }

      const submission = filteredSubmissions[i];
      const importCandidate = { ...submission };
      let sourceExtractionSucceeded = false;
      let detailsExtractionSucceeded = false;

      sendProgress({
        phase: 'fetching_codes',
        message: `Page ${page}/${totalPages}: Extracting ${i + 1}/${filteredSubmissions.length} - ${submission.problem_id}`,
        currentPage: page,
        totalPages: totalPages,
        currentItem: i + 1,
        totalItems: filteredSubmissions.length,
      });

      if (!submission.submission_url) {
        console.log(
          `[NEUPC] Skipping code extraction for ${submission.submission_id}: no submission_url`
        );
        importState.codesSkipped++;
      } else {
        const sourceResult = await extractSourceCode(submission, platform);

        if (sourceResult.success && sourceResult.data) {
          mergeExtractedSubmissionData(importCandidate, sourceResult.data);
          importState.codesFetched++;
          extractedCount++;
          sourceExtractionSucceeded = true;
        } else {
          console.log(
            `[NEUPC] Failed to extract ${submission.submission_id}: ${sourceResult.error}`
          );
          importState.codesSkipped++;
          importState.errors.push({
            submission_id: submission.submission_id,
            error: sourceResult.error,
          });
        }
      }

      const problemDetailStatus = getCachedProblemDetailStatus(
        platform,
        importCandidate.problem_id
      );

      let detailsResult;

      if (problemDetailStatus?.isComplete) {
        detailsResult = {
          success: true,
          attempted: false,
          fromCache: true,
          skippedReason: 'already_complete_in_db',
        };
        console.warn('[NEUPC][TEST] problem detail extraction skipped', {
          platform,
          problemId: importCandidate.problem_id,
          reason: 'already_complete_in_db',
        });
      } else {
        detailsResult = await enrichProblemDetailsForImport(
          importCandidate,
          platform,
          {
            label: `Page ${page}/${totalPages}`,
            currentPage: page,
            totalPages: totalPages,
            currentItem: i + 1,
            totalItems: filteredSubmissions.length,
          },
          problemDetailStatus?.missingFields
        );
      }

      if (detailsResult.success) {
        detailsExtractionSucceeded = true;
        if (detailsResult.skippedReason === 'already_complete_in_db') {
          console.log(
            `[NEUPC] Skipped problem detail extraction for ${importCandidate.problem_id} (already complete in DB)`
          );
        } else {
          console.log(
            `[NEUPC] Extracted problem details for ${importCandidate.problem_id}${detailsResult.fromCache ? ' (cached)' : ''}`
          );
        }
      } else if (
        detailsResult.attempted &&
        !detailsResult.fromCache &&
        detailsResult.error
      ) {
        importState.codesSkipped++;
        importState.errors.push({
          submission_id: importCandidate.submission_id,
          error: `Problem details extraction failed: ${detailsResult.error}`,
        });
        console.log(
          `[NEUPC] Failed to extract problem details for ${importCandidate.problem_id}: ${detailsResult.error}. Importing without details.`
        );
      }

      if (!sourceExtractionSucceeded && !detailsExtractionSucceeded) {
        console.log(
          `[NEUPC] Continuing with metadata-only import for submission ${importCandidate.submission_id}`
        );
      }

      if (detailsResult.attempted && !detailsResult.fromCache) {
        await sleep(1000);
      }

      readyForImport.push(importCandidate);

      await sleep(1500);
    }
  } else {
    readyForImport.push(...filteredSubmissions);
    extractedCount = filteredSubmissions.length;
  }

  importState.processedSubmissions += filteredSubmissions.length;

  if (readyForImport.length === 0) {
    sendProgress({
      phase: 'importing',
      message: `Page ${page}/${totalPages}: No submissions to save after filtering`,
      currentPage: page,
      totalPages: totalPages,
    });

    return {
      success: true,
      processed: submissions.length,
      fetched: extractedCount,
      imported: 0,
      created: 0,
      updated: 0,
    };
  }

  // Import to backend
  sendProgress({
    phase: 'importing',
    message: `Page ${page}/${totalPages}: Saving ${readyForImport.length} submissions...`,
    currentPage: page,
    totalPages: totalPages,
  });

  const importResult = await importSubmissionsToBackend(
    readyForImport,
    platform,
    effectiveVerdictFilter
  );

  if (importResult.success) {
    importState.imported += importResult.solvesCreated;
    importState.submissionsCreated += importResult.submissionsCreated || 0;
    importState.submissionsUpdated += importResult.submissionsUpdated || 0;

    readyForImport.forEach((s) => existingSubmissionIds.add(s.submission_id));

    console.log(
      `[NEUPC] Page ${page}: Created ${importResult.submissionsCreated}, updated ${importResult.submissionsUpdated}`
    );

    sendProgress({
      phase: 'importing',
      message: `Page ${page}/${totalPages}: Saved ${importResult.submissionsCreated} new, ${importResult.submissionsUpdated} updated`,
      currentPage: page,
      totalPages: totalPages,
    });
  } else {
    console.error(`[NEUPC] Page ${page} import error:`, importResult.error);
    importState.errors.push({ page, error: importResult.error });
  }

  return {
    success: importResult.success,
    processed: submissions.length,
    fetched: extractedCount,
    imported: importResult.solvesCreated || 0,
    created: importResult.submissionsCreated || 0,
    updated: importResult.submissionsUpdated || 0,
    error: importResult.error,
  };
}

async function processPreparedBatch(submissions, page, totalPages, options) {
  const {
    platform = 'codeforces',
    fetchCodes = true,
    verdictFilter = 'all',
  } = options;

  if (importState.stopRequested) {
    return { stopped: true };
  }

  if (!Array.isArray(submissions) || submissions.length === 0) {
    return {
      success: true,
      processed: 0,
      fetched: 0,
      imported: 0,
      created: 0,
      updated: 0,
    };
  }

  const readyForImport = [];
  let extractedCount = 0;

  if (fetchCodes) {
    const batchOptimization = await fetchPageOptimizationStatusForSubmissions(
      submissions,
      platform,
      {
        pageNumber: page,
        verdictFilter,
        fetchCodes,
      }
    );

    if (batchOptimization?.allComplete) {
      importState.processedSubmissions += submissions.length;
      importState.codesSkipped += submissions.length;

      submissions.forEach((submission) => {
        const submissionId = normalizeSubmissionIdForLookup(
          firstDefinedValue(submission?.submission_id, submission?.submissionId)
        );
        if (submissionId) {
          existingSubmissionIds.add(submissionId);
        }
      });

      console.warn('[NEUPC][TEST] batch extraction skipped', {
        platform,
        batch: page,
        totalBatches: totalPages,
        submissions: submissions.length,
        reason: 'all_complete_in_db',
        fromSyncJobs: batchOptimization.fromSyncJobs,
        cacheKey: batchOptimization.cacheKey,
      });

      sendProgress({
        phase: 'fetching_page',
        message: `Batch ${page}/${totalPages}: Skipped ${submissions.length} submissions (already complete in DB)`,
        currentPage: page,
        totalPages,
      });

      return {
        success: true,
        processed: submissions.length,
        fetched: 0,
        imported: 0,
        created: 0,
        updated: 0,
      };
    }

    if (!batchOptimization) {
      await prefetchProblemDetailStatusForSubmissions(submissions, platform);
    }

    sendProgress({
      phase: 'fetching_codes',
      message: `Batch ${page}/${totalPages}: Extracting details for ${submissions.length} submissions...`,
      currentPage: page,
      totalPages,
    });

    for (let i = 0; i < submissions.length; i++) {
      if (importState.stopRequested) {
        return { stopped: true };
      }

      const submission = submissions[i];
      const importCandidate = { ...submission };
      let sourceExtractionSucceeded = false;
      let detailsExtractionSucceeded = false;

      sendProgress({
        phase: 'fetching_codes',
        message: `Batch ${page}/${totalPages}: Extracting ${i + 1}/${submissions.length} - ${submission.problem_id}`,
        currentPage: page,
        totalPages,
        currentItem: i + 1,
        totalItems: submissions.length,
      });

      if (!submission.submission_url) {
        importState.codesSkipped++;
      } else {
        const sourceResult = await extractSourceCode(submission, platform);

        if (sourceResult.success && sourceResult.data) {
          mergeExtractedSubmissionData(importCandidate, sourceResult.data);
          importState.codesFetched++;
          extractedCount++;
          sourceExtractionSucceeded = true;
        } else {
          importState.codesSkipped++;
          importState.errors.push({
            submission_id: submission.submission_id,
            error: sourceResult.error,
          });
        }
      }

      const problemDetailStatus = getCachedProblemDetailStatus(
        platform,
        importCandidate.problem_id
      );

      let detailsResult;

      if (problemDetailStatus?.isComplete) {
        detailsResult = {
          success: true,
          attempted: false,
          fromCache: true,
          skippedReason: 'already_complete_in_db',
        };
        console.warn('[NEUPC][TEST] problem detail extraction skipped', {
          platform,
          problemId: importCandidate.problem_id,
          reason: 'already_complete_in_db',
        });
      } else {
        detailsResult = await enrichProblemDetailsForImport(
          importCandidate,
          platform,
          {
            label: `Batch ${page}/${totalPages}`,
            currentPage: page,
            totalPages,
            currentItem: i + 1,
            totalItems: submissions.length,
          },
          problemDetailStatus?.missingFields
        );
      }

      if (detailsResult.success) {
        detailsExtractionSucceeded = true;
      } else if (
        detailsResult.attempted &&
        !detailsResult.fromCache &&
        detailsResult.error
      ) {
        importState.codesSkipped++;
        importState.errors.push({
          submission_id: importCandidate.submission_id,
          error: `Problem details extraction failed: ${detailsResult.error}`,
        });
      }

      if (!sourceExtractionSucceeded && !detailsExtractionSucceeded) {
        console.log(
          `[NEUPC] Continuing with metadata-only import for submission ${importCandidate.submission_id}`
        );
      }

      if (detailsResult.attempted && !detailsResult.fromCache) {
        await sleep(1000);
      }

      readyForImport.push(importCandidate);
      await sleep(1500);
    }
  } else {
    readyForImport.push(...submissions);
    extractedCount = submissions.length;
  }

  importState.processedSubmissions += submissions.length;

  if (readyForImport.length === 0) {
    sendProgress({
      phase: 'importing',
      message: `Batch ${page}/${totalPages}: No submissions to save after filtering`,
      currentPage: page,
      totalPages,
    });

    return {
      success: true,
      processed: submissions.length,
      fetched: extractedCount,
      imported: 0,
      created: 0,
      updated: 0,
    };
  }

  sendProgress({
    phase: 'importing',
    message: `Batch ${page}/${totalPages}: Saving ${readyForImport.length} submissions...`,
    currentPage: page,
    totalPages,
  });

  const importResult = await importSubmissionsToBackend(
    readyForImport,
    platform,
    verdictFilter
  );

  if (importResult.success) {
    importState.imported += importResult.solvesCreated;
    importState.submissionsCreated += importResult.submissionsCreated || 0;
    importState.submissionsUpdated += importResult.submissionsUpdated || 0;
    readyForImport.forEach((s) => existingSubmissionIds.add(s.submission_id));
  } else {
    importState.errors.push({
      page,
      error: importResult.error || 'Import failed',
    });
  }

  return {
    success: importResult.success,
    processed: submissions.length,
    fetched: extractedCount,
    imported: importResult.solvesCreated || 0,
    created: importResult.submissionsCreated || 0,
    updated: importResult.submissionsUpdated || 0,
    error: importResult.error,
  };
}

// ============================================================
// FULL IMPORT WORKFLOW
// ============================================================

async function startFullImport(handle, options = {}) {
  const {
    fetchCodes = true,
    onlyAC = true,
    verdictFilter = 'all',
    syncEverything = true,
  } = options;
  const requestedPlatform =
    typeof options.platform === 'string'
      ? options.platform.trim().toLowerCase()
      : 'codeforces';
  const platformAliases = {
    leetcodecn: 'leetcode',
    'leetcode-cn': 'leetcode',
    leetcodecom: 'leetcode',
  };
  const platform = platformAliases[requestedPlatform] || requestedPlatform;
  const quickMode = !fetchCodes;
  const skipExisting = !syncEverything && fetchCodes;
  const effectiveVerdictFilter = quickMode
    ? 'all'
    : normalizeVerdictFilter(verdictFilter, onlyAC);

  if (importState.isRunning) {
    return { success: false, error: 'Import already in progress' };
  }

  let normalizedHandle = String(handle || '').trim();
  if (platform === 'leetcode') {
    normalizedHandle = normalizeLeetCodeHandleInput(normalizedHandle);
    if (!normalizedHandle) {
      throw new Error(
        'Invalid LeetCode handle. Use username, @username, or profile URL.'
      );
    }
  }

  resetImportState();
  importState.isRunning = true;
  importState.phase = 'fetching_api';
  importState.handle = normalizedHandle;
  importState.platform = platform;
  importState.fetchCodes = Boolean(fetchCodes);
  importState.verdictFilter = effectiveVerdictFilter;

  try {
    let leetcodeValidation = null;
    let acSubmissions = 0;

    sendProgress({
      phase: 'fetching_api',
      message: 'Detecting pages and counting submissions...',
    });

    // Get total count based on platform
    let totalCount;
    let submissions = null;

    if (platform === 'codeforces') {
      totalCount = await getCodeforcesTotalSubmissions(normalizedHandle);
    } else if (platform === 'atcoder') {
      submissions = await fetchAtCoderSubmissions(normalizedHandle);
      totalCount = submissions.length;
    } else if (platform === 'leetcode') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching LeetCode submission history...',
      });

      const existingForValidation = await fetchExistingSubmissionIds(
        platform,
        false
      );

      const leetcodeData = await fetchLeetCodeSubmissions(normalizedHandle);
      submissions = leetcodeData.submissions;
      totalCount = submissions.length;

      leetcodeValidation = buildLeetCodeValidationSummary(
        submissions,
        leetcodeData.diagnostics,
        existingForValidation.size
      );

      sendProgress({
        phase: 'validating_first_extract',
        message: leetcodeValidation.message,
        validation: leetcodeValidation,
      });
    } else {
      throw new Error(`Bulk import not supported for platform: ${platform}`);
    }

    const perPage =
      PLATFORMS_CONFIG[platform]?.submissionsPerPage || API_CONFIG.batchSize;
    const totalPages = Math.ceil(totalCount / perPage);

    importState.totalSubmissions = totalCount;
    importState.totalPages = totalPages;

    console.log(
      `[NEUPC] Total: ${totalCount} submissions, ${totalPages} pages`
    );

    sendProgress({
      phase: 'fetching_api',
      message: `Found ${totalCount} submissions. Processing in batches of ${API_CONFIG.batchSize}.`,
      total: totalCount,
      totalPages: totalPages,
    });

    // Quick mode and sync-everything mode both process all submissions.
    if (quickMode || !skipExisting) {
      existingSubmissionIds = new Set();
      sendProgress({
        phase: 'fetching_api',
        message: quickMode
          ? 'Quick mode: importing all submissions without skipping.'
          : 'Sync everything mode: importing all submissions (new + existing).',
      });
    } else {
      sendProgress({
        phase: 'fetching_api',
        message: 'Checking previously imported submissions...',
      });

      existingSubmissionIds = await fetchExistingSubmissionIds(
        platform,
        fetchCodes
      );
      console.log(`[NEUPC] ${existingSubmissionIds.size} already imported`);
    }

    let startPage = 1;
    if (platform === 'codeforces' && totalPages > 0) {
      const checkpoint = await loadImportCheckpoint();
      const checkpointContext = {
        platform,
        handle: normalizedHandle,
        fetchCodes,
        verdictFilter: effectiveVerdictFilter,
      };

      if (isCheckpointCompatible(checkpoint, checkpointContext)) {
        const checkpointPage = Math.min(
          toSafeCount(checkpoint.lastCompletedPage),
          totalPages
        );

        if (checkpointPage > 0 && checkpointPage < totalPages) {
          restoreCountersFromCheckpoint(checkpoint);
          importState.lastCompletedPage = checkpointPage;
          startPage = checkpointPage + 1;

          sendProgress({
            phase: 'fetching_api',
            message: `Checkpoint found. Resuming from page ${startPage}/${totalPages}.`,
            currentPage: checkpointPage,
            totalPages,
          });
        } else if (checkpointPage >= totalPages) {
          await clearImportCheckpoint();
        }
      }
    }

    // Process based on platform
    if ((platform === 'atcoder' || platform === 'leetcode') && submissions) {
      // AtCoder/LeetCode: process all fetched submissions in batches.
      // In full mode, each batch runs extraction (code + problem details)
      // before import, similar to Codeforces flow.
      const candidateSubmissions = quickMode
        ? submissions
        : submissions.filter(
            (s) => !existingSubmissionIds.has(s.submission_id)
          );

      const filteredSubmissions = candidateSubmissions.filter((s) =>
        matchesVerdictFilter(s.verdict, effectiveVerdictFilter)
      );
      acSubmissions = filteredSubmissions.filter(
        (s) => normalizeVerdict(s.verdict) === 'AC'
      ).length;

      if (filteredSubmissions.length > 0) {
        // Import in batches
        const batchSize = API_CONFIG.batchSize;
        const totalBatches = Math.ceil(filteredSubmissions.length / batchSize);
        importState.totalPages = totalBatches;

        for (let i = 0; i < filteredSubmissions.length; i += batchSize) {
          if (importState.stopRequested) break;

          const batch = filteredSubmissions.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          importState.currentPage = batchNum;

          const result = await processPreparedBatch(
            batch,
            batchNum,
            totalBatches,
            {
              platform,
              fetchCodes,
              verdictFilter: effectiveVerdictFilter,
            }
          );

          if (result.stopped) {
            break;
          }

          await sleep(1000);
        }
      }
    } else {
      // Codeforces: page by page
      for (let page = startPage; page <= totalPages; page++) {
        if (importState.stopRequested) break;

        importState.currentPage = page;

        const result = await processPage(normalizedHandle, page, totalPages, {
          platform,
          fetchCodes,
          onlyAC: effectiveVerdictFilter === 'ac',
          verdictFilter: effectiveVerdictFilter,
          skipExisting,
        });

        if (result.stopped) {
          break;
        }

        if (result.success) {
          importState.lastCompletedPage = page;
          await saveImportCheckpoint({
            phase: 'importing',
            currentPage: page,
            lastCompletedPage: page,
          });
        }

        await sleep(1000);
      }
    }

    const stopped = importState.stopRequested;
    importState.phase = stopped ? 'stopped' : 'complete';
    importState.isRunning = false;

    if (platform === 'codeforces') {
      if (stopped) {
        await saveImportCheckpoint({
          phase: 'stopped',
          currentPage: importState.currentPage,
          lastCompletedPage: importState.lastCompletedPage,
        });
      } else {
        await clearImportCheckpoint();
      }
    }

    const message = stopped
      ? `Stopped. Created ${importState.submissionsCreated}, updated ${importState.submissionsUpdated}.`
      : `Complete! Created ${importState.submissionsCreated} submissions, updated ${importState.submissionsUpdated}, ${importState.imported} new solves.`;

    console.log('[NEUPC] Import complete:', {
      totalSubmissions: importState.totalSubmissions,
      processedSubmissions: importState.processedSubmissions,
      submissionsCreated: importState.submissionsCreated,
      submissionsUpdated: importState.submissionsUpdated,
      codesFetched: importState.codesFetched,
      imported: importState.imported,
      errors: importState.errors.length,
    });

    sendProgress({
      phase: stopped ? 'stopped' : 'complete',
      message: message,
      acSubmissions,
      validation: leetcodeValidation,
    });

    return {
      success: true,
      data: {
        stopped,
        totalSubmissions: importState.totalSubmissions,
        processedSubmissions: importState.processedSubmissions,
        submissionsCreated: importState.submissionsCreated,
        submissionsUpdated: importState.submissionsUpdated,
        codesFetched: importState.codesFetched,
        imported: importState.imported,
        acSubmissions,
        lastCompletedPage: importState.lastCompletedPage,
        validation: leetcodeValidation,
      },
    };
  } catch (error) {
    importState.phase = 'error';
    importState.isRunning = false;

    if (platform === 'codeforces') {
      await saveImportCheckpoint({
        phase: 'error',
        error: error.message,
        currentPage: importState.currentPage,
        lastCompletedPage: importState.lastCompletedPage,
      });
    }

    console.error('[NEUPC] Import error:', error);

    sendProgress({
      phase: 'error',
      message: error.message,
    });

    return { success: false, error: error.message };
  }
}

async function startQuickImport(handle, options = {}) {
  return startFullImport(handle, { ...options, fetchCodes: false });
}

// ============================================================
// LEGACY SUPPORT FUNCTIONS
// ============================================================

async function bulkFetchSubmission(url, submissionId) {
  const submission = {
    submission_id: submissionId,
    submission_url: url,
  };

  // Detect platform from URL
  let platform = 'codeforces';
  if (url.includes('atcoder.jp')) platform = 'atcoder';
  else if (url.includes('leetcode.com')) platform = 'leetcode';
  else if (url.includes('toph.co')) platform = 'toph';

  const result = await extractSourceCode(submission, platform);

  if (result.success) {
    const extractedDifficulty =
      result.data.problemRating ??
      result.data.difficultyRating ??
      result.data.difficulty_rating ??
      result.data.difficulty ??
      null;
    const extractedTags = result.data.problemTags ?? result.data.tags ?? [];

    return {
      success: true,
      solution: {
        submission_id: submissionId,
        problem_id: result.data.problemId || '',
        problem_name: result.data.problemName || '',
        problem_url: result.data.problemUrl || url,
        verdict: result.data.verdict || 'UNKNOWN',
        language: result.data.language || '',
        source_code: result.data.sourceCode || '',
        submitted_at: result.data.submittedAt || new Date().toISOString(),
        difficulty_rating: extractedDifficulty,
        tags: Array.isArray(extractedTags) ? extractedTags : [],
      },
    };
  } else {
    return { success: false, error: result.error };
  }
}

async function uploadSolutionDirect(solution) {
  const { apiUrl, token } = await getApiCredentials();

  const response = await fetch(`${apiUrl}${API_CONFIG.endpoints.bulkImport}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      extensionToken: token,
      submissions: [solution],
      verdictFilter: 'all',
    }),
  });

  return await response.json();
}

// ============================================================
// MESSAGE HANDLERS
// ============================================================

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[NEUPC] Message received:', request.action);

  // Single submission sync (from content scripts)
  if (request.action === 'syncSubmission') {
    syncSingleSubmission(request.submission)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Full import with source code
  if (request.action === 'startFullImport') {
    const options = {
      ...request.options,
      platform:
        typeof request.platform === 'string'
          ? request.platform.trim().toLowerCase()
          : 'codeforces',
    };
    startFullImport(request.handle, options)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Quick import without source code
  if (request.action === 'startQuickImport') {
    const options = {
      ...request.options,
      platform:
        typeof request.platform === 'string'
          ? request.platform.trim().toLowerCase()
          : 'codeforces',
    };
    startQuickImport(request.handle, options)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Get import status
  if (request.action === 'getImportStatus') {
    sendResponse({
      success: true,
      state: { ...importState },
    });
    return true;
  }

  // Stop import
  if (request.action === 'stopImport') {
    importState.stopRequested = true;

    if (importState.isRunning && importState.platform === 'codeforces') {
      saveImportCheckpoint({
        phase: 'stopped',
        currentPage: importState.currentPage,
        lastCompletedPage: importState.lastCompletedPage,
      }).catch((error) => {
        console.error('[NEUPC] Failed to persist checkpoint on stop:', error);
      });
    }

    if (currentFetchTabId) {
      removeTab(currentFetchTabId);
      currentFetchTabId = null;
    }
    sendProgress({ phase: 'stopped', message: 'Import stopped by user' });
    sendResponse({ success: true });
    return true;
  }

  // Test backend connection
  if (request.action === 'testConnection') {
    testBackendConnection(request.apiUrl, request.token)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Extract submission from current tab
  if (request.action === 'extractSubmission') {
    // Forward to content script
    if (sender.tab?.id) {
      sendResponse({ success: true, forwarded: true });
    } else {
      sendResponse({ success: false, error: 'No tab context' });
    }
    return true;
  }

  // Bulk fetch single submission (legacy)
  if (request.action === 'bulkFetchSubmission') {
    bulkFetchSubmission(request.url, request.submissionId)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Upload solution directly (legacy)
  if (request.action === 'uploadSolutionDirect') {
    uploadSolutionDirect(request.solution)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Get settings
  if (request.action === 'getSettings') {
    getStorageData([
      'apiEndpoint',
      'extensionToken',
      'autoSync',
      'connectedHandles',
    ])
      .then((settings) => sendResponse({ success: true, settings }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Save settings
  if (request.action === 'saveSettings') {
    setStorageData(request.settings)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Get sync stats
  if (request.action === 'getSyncStats') {
    getLocalStorageData(['syncStats'])
      .then((data) =>
        sendResponse({ success: true, stats: data.syncStats || {} })
      )
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Unknown action
  console.warn('[NEUPC] Unknown action:', request.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// ============================================================
// EXTENSION LIFECYCLE
// ============================================================

browserAPI.runtime.onInstalled.addListener((details) => {
  console.log('[NEUPC] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // Set default settings
    setStorageData({
      apiEndpoint: API_CONFIG.defaultApiUrl,
      autoSync: true,
    });
  }
});

browserAPI.runtime.onStartup.addListener(() => {
  console.log('[NEUPC] Extension started');
  resetImportState();
});

console.log('[NEUPC] Background script ready');
