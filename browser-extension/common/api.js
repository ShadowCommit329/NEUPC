/**
 * NEUPC Browser Extension - API Module
 * Handles all communication with the NEUPC backend
 */

import { API_CONFIG } from './constants.js';
import {
  getApiUrl,
  getExtensionToken,
  clearExtensionToken,
  updateSyncStats,
  addCachedSubmission,
  updateLastSync,
} from './storage.js';
import {
  log,
  logError,
  logWarn,
  sanitizeSubmission,
  validateSubmission,
} from './utils.js';

// ============================================================
// API REQUEST HANDLER
// ============================================================

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
async function apiRequest(endpoint, options = {}) {
  const apiUrl = await getApiUrl();
  const token = await getExtensionToken();

  if (!token) {
    throw new Error(
      'Not authenticated. Please connect your NEUPC account first.'
    );
  }

  const url = `${apiUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Include token in body for POST requests (extension sync pattern)
  let body = options.body;
  if (options.method === 'POST' && body) {
    const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
    bodyObj.extensionToken = token;
    body = JSON.stringify(bodyObj);
  }

  try {
    log('API', `Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers,
      body,
      signal: AbortSignal.timeout(API_CONFIG.requestTimeout),
    });

    // Handle authentication errors
    if (response.status === 401) {
      await clearExtensionToken();
      throw new Error(
        'Authentication expired. Please reconnect your NEUPC account.'
      );
    }

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '5';
      throw new Error(`Rate limited. Please wait ${retryAfter} seconds.`);
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          errorData.message ||
          `API request failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    log('API', `Response success:`, data.success !== false);
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('Request timed out. Please try again.');
    }
    logError('API', `Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

// ============================================================
// REQUEST QUEUE WITH RETRY
// ============================================================

/**
 * Request queue for handling rate limits and retries
 */
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryAttempts = API_CONFIG.retryAttempts;
    this.retryDelay = API_CONFIG.retryDelay;
    this.rateLimitDelay = API_CONFIG.rateLimitDelay;
  }

  /**
   * Add request to queue
   * @param {Function} requestFn - Function that returns a Promise
   * @param {Object} options - Queue options
   * @returns {Promise}
   */
  async enqueue(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject,
        attempts: 0,
        priority: options.priority || 0,
      });

      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        const result = await item.requestFn();
        item.resolve(result);
        this.queue.shift();

        // Rate limit delay between successful requests
        if (this.queue.length > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.rateLimitDelay)
          );
        }
      } catch (error) {
        item.attempts++;

        // Check if we should retry
        const shouldRetry =
          item.attempts < this.retryAttempts &&
          !error.message.includes('Authentication') &&
          !error.message.includes('400');

        if (shouldRetry) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, item.attempts - 1);
          log(
            'API',
            `Retrying in ${delay}ms (attempt ${item.attempts}/${this.retryAttempts})`
          );

          await new Promise((resolve) => setTimeout(resolve, delay));

          // Move to end of queue
          this.queue.shift();
          this.queue.push(item);
        } else {
          item.reject(error);
          this.queue.shift();
        }
      }
    }

    this.processing = false;
  }

  /**
   * Clear the queue
   */
  clear() {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  /**
   * Get queue length
   */
  get length() {
    return this.queue.length;
  }
}

// Global request queue instance
const requestQueue = new RequestQueue();

// ============================================================
// SUBMISSION SYNC
// ============================================================

/**
 * Submit a single submission to NEUPC backend (extension-sync endpoint)
 * @param {Object} submission - Submission data
 * @returns {Promise<Object>}
 */
export async function syncSubmission(submission) {
  // Validate submission
  if (!validateSubmission(submission)) {
    throw new Error('Invalid submission data');
  }

  // Sanitize and prepare data
  const sanitized = sanitizeSubmission(submission);

  log(
    'API',
    `Syncing submission: ${sanitized.platform}/${sanitized.submissionId}`
  );

  try {
    const response = await apiRequest(API_CONFIG.endpoints.extensionSync, {
      method: 'POST',
      body: JSON.stringify({
        platform: sanitized.platform,
        problemId: sanitized.problemId,
        problemName: sanitized.problemName,
        problemUrl: sanitized.problemUrl,
        problemDescription: submission.problemDescription || '',
        contestId: sanitized.contestId,
        difficultyRating: sanitized.difficultyRating,
        tags: sanitized.tags,
        solutionCode: sanitized.sourceCode,
        language: sanitized.language,
        submissionId: sanitized.submissionId,
        submissionTime: sanitized.submittedAt,
        verdict: sanitized.verdict,
        executionTime: sanitized.executionTime,
        memoryUsage: sanitized.memoryUsed,
      }),
    });

    // Cache the submission
    await addCachedSubmission(sanitized.platform, sanitized);

    // Update sync stats
    await updateSyncStats(sanitized.platform, 1, true);
    await updateLastSync(sanitized.platform);

    log('API', `Submission synced successfully: ${sanitized.submissionId}`);
    return response;
  } catch (error) {
    await updateSyncStats(sanitized.platform, 1, false);
    throw error;
  }
}

/**
 * Submit submission with automatic retry via queue
 * @param {Object} submission
 * @param {Object} options - Queue options
 * @returns {Promise<Object>}
 */
export async function syncSubmissionWithRetry(submission, options = {}) {
  return requestQueue.enqueue(() => syncSubmission(submission), options);
}

// ============================================================
// BULK IMPORT
// ============================================================

/**
 * Bulk import submissions
 * @param {Object[]} submissions - Array of submission objects
 * @param {string} platform - Platform identifier
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>}
 */
export async function bulkImport(submissions, platform, onProgress = null) {
  if (!submissions || submissions.length === 0) {
    return {
      success: true,
      data: { submissionsReceived: 0, submissionsCreated: 0 },
    };
  }

  log(
    'API',
    `Bulk importing ${submissions.length} submissions for ${platform}`
  );

  // Sanitize all submissions
  const sanitizedSubmissions = submissions.map((sub) => ({
    submission_id: sub.submissionId || sub.submission_id,
    problem_id: sub.problemId || sub.problem_id,
    problem_name: sub.problemName || sub.problem_name,
    problem_url: sub.problemUrl || sub.problem_url,
    contest_id: sub.contestId || sub.contest_id,
    verdict: sub.verdict,
    language: sub.language,
    execution_time_ms: sub.executionTime || sub.execution_time_ms,
    memory_kb: sub.memoryUsed || sub.memory_kb,
    difficulty_rating: sub.difficultyRating || sub.difficulty_rating,
    tags: sub.tags || [],
    submitted_at: sub.submittedAt || sub.submitted_at,
    source_code: sub.sourceCode || sub.source_code,
  }));

  // Process in batches
  const batchSize = API_CONFIG.batchSize;
  const results = {
    submissionsReceived: sanitizedSubmissions.length,
    submissionsCreated: 0,
    submissionsUpdated: 0,
    problemsCreated: 0,
    solvesCreated: 0,
    errors: [],
  };

  for (let i = 0; i < sanitizedSubmissions.length; i += batchSize) {
    const batch = sanitizedSubmissions.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(sanitizedSubmissions.length / batchSize);

    log(
      'API',
      `Processing batch ${batchNum}/${totalBatches} (${batch.length} submissions)`
    );

    if (onProgress) {
      onProgress({
        current: i,
        total: sanitizedSubmissions.length,
        batch: batchNum,
        totalBatches,
        message: `Processing batch ${batchNum}/${totalBatches}...`,
      });
    }

    try {
      const response = await apiRequest(API_CONFIG.endpoints.bulkImport, {
        method: 'POST',
        body: JSON.stringify({
          submissions: batch,
          platform,
        }),
      });

      if (response.success && response.data) {
        results.submissionsCreated += response.data.submissionsCreated || 0;
        results.submissionsUpdated += response.data.submissionsUpdated || 0;
        results.problemsCreated += response.data.problemsCreated || 0;
        results.solvesCreated += response.data.solvesCreated || 0;
      }

      // Rate limit delay between batches
      if (i + batchSize < sanitizedSubmissions.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.rateLimitDelay)
        );
      }
    } catch (error) {
      logError('API', `Batch ${batchNum} failed:`, error.message);
      results.errors.push({
        batch: batchNum,
        error: error.message,
      });
    }
  }

  // Update sync stats
  await updateSyncStats(platform, results.submissionsCreated, true);
  await updateLastSync(platform);

  if (onProgress) {
    onProgress({
      current: sanitizedSubmissions.length,
      total: sanitizedSubmissions.length,
      batch: Math.ceil(sanitizedSubmissions.length / batchSize),
      totalBatches: Math.ceil(sanitizedSubmissions.length / batchSize),
      message: 'Import complete!',
      complete: true,
    });
  }

  log('API', `Bulk import complete:`, results);
  return { success: true, data: results };
}

// ============================================================
// SYNC STATUS & EXISTING SUBMISSIONS
// ============================================================

/**
 * Get sync status and connected handles from backend
 * @returns {Promise<Object>}
 */
export async function getSyncStatus() {
  try {
    const token = await getExtensionToken();
    if (!token) {
      return { authenticated: false, handles: [] };
    }

    const apiUrl = await getApiUrl();
    const response = await fetch(
      `${apiUrl}${API_CONFIG.endpoints.syncStatus}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await clearExtensionToken();
        return { authenticated: false, handles: [] };
      }
      throw new Error('Failed to get sync status');
    }

    const data = await response.json();
    return {
      authenticated: true,
      ...data,
    };
  } catch (error) {
    logError('API', 'Failed to get sync status:', error.message);
    return { authenticated: false, handles: [], error: error.message };
  }
}

/**
 * Get existing submission IDs for a platform
 * @param {string} platform - Platform identifier
 * @param {string[]} submissionIds - Submission IDs to check
 * @returns {Promise<Set<string>>}
 */
export async function getExistingSubmissions(platform, submissionIds) {
  try {
    if (!submissionIds || submissionIds.length === 0) {
      return new Set();
    }

    const response = await apiRequest(
      `${API_CONFIG.endpoints.existingSubmissions}?platform=${platform}&ids=${submissionIds.join(',')}`,
      { method: 'GET' }
    );

    return new Set(response.existingIds || []);
  } catch (error) {
    logWarn('API', 'Failed to check existing submissions:', error.message);
    return new Set();
  }
}

// ============================================================
// HANDLE MANAGEMENT
// ============================================================

/**
 * Get connected handles from backend
 * @returns {Promise<Object[]>}
 */
export async function getConnectedHandles() {
  try {
    const response = await apiRequest(API_CONFIG.endpoints.connectHandle, {
      method: 'GET',
    });

    return response.handles || [];
  } catch (error) {
    logError('API', 'Failed to get connected handles:', error.message);
    return [];
  }
}

/**
 * Connect a platform handle
 * @param {string} platform - Platform identifier
 * @param {string} handle - User handle
 * @returns {Promise<Object>}
 */
export async function connectHandle(platform, handle) {
  log('API', `Connecting handle for ${platform}: ${handle}`);

  const response = await apiRequest(API_CONFIG.endpoints.connectHandle, {
    method: 'POST',
    body: JSON.stringify({
      platform,
      handle,
    }),
  });

  log('API', 'Handle connected successfully');
  return response;
}

/**
 * Disconnect a platform handle
 * @param {string} platform - Platform identifier
 * @returns {Promise<Object>}
 */
export async function disconnectHandle(platform) {
  log('API', `Disconnecting handle for ${platform}`);

  const response = await apiRequest(API_CONFIG.endpoints.connectHandle, {
    method: 'DELETE',
    body: JSON.stringify({
      platform,
    }),
  });

  log('API', 'Handle disconnected successfully');
  return response;
}

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Verify extension token is valid
 * @returns {Promise<Object|null>}
 */
export async function verifyToken() {
  try {
    const status = await getSyncStatus();
    return status.authenticated ? status : null;
  } catch (error) {
    logError('API', 'Token verification failed:', error.message);
    return null;
  }
}

/**
 * Get or generate extension token URL
 * @returns {Promise<string>}
 */
export async function getTokenPageUrl() {
  const apiUrl = await getApiUrl();
  return `${apiUrl}/account/member/problem-solving?tab=settings`;
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

/**
 * Clear request queue
 */
export function clearRequestQueue() {
  requestQueue.clear();
}

/**
 * Get request queue length
 * @returns {number}
 */
export function getQueueLength() {
  return requestQueue.length;
}

/**
 * Check if API is reachable
 * @returns {Promise<boolean>}
 */
export async function checkApiHealth() {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
