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
  cses: {
    id: 'cses',
    name: 'CSES',
    submissionsPerPage: 25,
    contentScript: 'content-scripts/group1/neupc-cses.js',
  },
  codechef: {
    id: 'codechef',
    name: 'CodeChef',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-codechef.js',
  },
  vjudge: {
    id: 'vjudge',
    name: 'VJudge',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-vjudge.js',
  },
  hackerrank: {
    id: 'hackerrank',
    name: 'HackerRank',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-hackerrank.js',
  },
  facebookhackercup: {
    id: 'facebookhackercup',
    name: 'Hacker Cup',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group3/neupc-fbhc.js',
  },
  lightoj: {
    id: 'lightoj',
    name: 'LightOJ',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-lightoj.js',
  },
  uva: {
    id: 'uva',
    name: 'UVa Online Judge',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-uva.js',
  },
  toph: {
    id: 'toph',
    name: 'Toph',
    submissionsPerPage: 50,
    contentScript: 'content-scripts/group1/neupc-toph.js',
  },
  spoj: {
    id: 'spoj',
    name: 'SPOJ',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group1/neupc-spoj.js',
  },
  beecrowd: {
    id: 'beecrowd',
    name: 'beecrowd',
    submissionsPerPage: 20,
    contentScript: 'content-scripts/group2/neupc-beecrowd.js',
  },
};

const VERDICT_MAP = {
  OK: 'AC',
  ACCEPTED: 'AC',
  WRONG_ANSWER: 'WA',
  TIME_LIMIT_EXCEEDED: 'TLE',
  CPU_LIMIT_EXCEEDED: 'TLE',
  CPULIMITEXCEEDED: 'TLE',
  MEMORY_LIMIT_EXCEEDED: 'MLE',
  RUNTIME_ERROR: 'RE',
  COMPILATION_ERROR: 'CE',
  IDLENESS_LIMIT_EXCEEDED: 'ILE',
  CHALLENGED: 'WA',
  SKIPPED: 'UNKNOWN',
  TESTING: 'PENDING',
  PARTIAL: 'PC',
  PASSED: 'AC',
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

function decodeHtmlEntitiesSimple(value) {
  if (value == null) {
    return '';
  }

  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCharCode(Number.parseInt(dec, 10))
    );
}

function stripHtmlTags(value) {
  const html = String(value || '');
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntitiesSimple(stripped).replace(/\s+/g, ' ').trim();
}

function escapeRegExpLiteral(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function htmlToTextWithLineBreaks(value) {
  const html = String(value || '');
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|tr|li|ul|ol|table)>/gi, '\n')
    .replace(
      /<(?:p|div|section|article|h[1-6]|tr|li|ul|ol|table)\b[^>]*>/gi,
      '\n'
    )
    .replace(/<td\b[^>]*>/gi, ' ')
    .replace(/<th\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntitiesSimple(stripped);
}

function normalizeMultilineStatementText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSectionFromStatementText(text, labels = [], stopLabels = []) {
  const normalizedText = String(text || '').trim();
  if (!normalizedText || !Array.isArray(labels) || labels.length === 0) {
    return null;
  }

  const defaultStopLabels = [
    'Problem Description',
    'Description',
    'Input',
    'Input Format',
    'Input Specification',
    'Output',
    'Output Format',
    'Output Specification',
    'Sample Input',
    'Sample Output',
    'Constraints',
    'Limits',
    'Explanation',
    'Note',
    'Notes',
  ];

  const stopCandidates =
    Array.isArray(stopLabels) && stopLabels.length > 0
      ? stopLabels
      : defaultStopLabels;

  const stopPattern = stopCandidates
    .map((label) => escapeRegExpLiteral(label))
    .join('|');

  for (const label of labels) {
    const escapedLabel = escapeRegExpLiteral(label);
    if (!escapedLabel) {
      continue;
    }

    const pattern = new RegExp(
      `(?:^|\\n)\\s*(?:${escapedLabel})\\s*:?\\s*(?:\\n+)?([\\s\\S]*?)(?=\\n\\s*(?:${stopPattern})\\s*:?(?:\\n|$)|$)`,
      'i'
    );

    const match = normalizedText.match(pattern);
    if (!match) {
      continue;
    }

    const section = normalizeMultilineStatementText(match[1]);
    if (section) {
      return section;
    }
  }

  return null;
}

function extractSamplePairsFromStatementText(text) {
  const normalizedText = String(text || '').replace(/\r/g, '');
  if (!normalizedText.trim()) {
    return [];
  }

  const samples = [];
  const samplePattern =
    /(?:^|\n)\s*Sample\s+Input\s*\d*\s*:?\s*\n?([\s\S]*?)\n\s*Sample\s+Output\s*\d*\s*:?\s*\n?([\s\S]*?)(?=\n\s*Sample\s+Input\s*\d*\s*:?|\n\s*(?:Problem\s+Description|Description|Input|Output|Constraints?|Limits?|Explanation|Notes?)\s*:?|$)/gi;

  let match;
  while ((match = samplePattern.exec(normalizedText)) != null) {
    const input = normalizeMultilineStatementText(match[1]);
    const output = normalizeMultilineStatementText(match[2]);

    if (!input && !output) {
      continue;
    }

    samples.push({ input, output });

    if (samples.length >= 8) {
      break;
    }
  }

  return samples;
}

function parseUvaTimeLimitToMs(text) {
  const normalizedText = String(text || '');
  const match = normalizedText.match(
    /time\s*limit\s*[:\-]?\s*([0-9]*\.?[0-9]+)\s*(ms|milliseconds?|s|sec|seconds?)/i
  );

  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = String(match[2] || '').toLowerCase();
  if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
    return Math.round(value);
  }

  return Math.round(value * 1000);
}

function parseUvaMemoryLimitToKb(text) {
  const normalizedText = String(text || '');
  const match = normalizedText.match(
    /memory\s*limit\s*[:\-]?\s*([0-9]*\.?[0-9]+)\s*(kb|kib|mb|mib|gb|gib|bytes?|b)/i
  );

  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = String(match[2] || '').toLowerCase();
  if (unit === 'gb' || unit === 'gib') {
    return Math.round(value * 1024 * 1024);
  }
  if (unit === 'mb' || unit === 'mib') {
    return Math.round(value * 1024);
  }
  if (unit === 'kb' || unit === 'kib') {
    return Math.round(value);
  }

  return Math.round(value / 1024);
}

function extractUvaMainContentHtml(html) {
  const source = String(html || '');
  if (!source) {
    return '';
  }

  const startMarker = '<!-- #col3: Main Content -->';
  const endMarker = '<!-- #main: Content End -->';
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker);

  if (startIndex >= 0 && endIndex > startIndex) {
    return source.slice(startIndex, endIndex);
  }

  return source;
}

function extractUvaStatementFrameUrl(mainHtml, baseUrl) {
  const iframeMatch = String(mainHtml || '').match(
    /<iframe[^>]+src\s*=\s*["']([^"']+)["']/i
  );

  if (!iframeMatch?.[1]) {
    return null;
  }

  return toAbsoluteUrlSafe(iframeMatch[1], baseUrl);
}

function extractUvaMetaRefreshUrl(html, baseUrl) {
  const refreshMatch = String(html || '').match(
    /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*url\s*=\s*([^"'>;\s]+)[^"']*["']/i
  );

  if (!refreshMatch?.[1]) {
    return null;
  }

  return toAbsoluteUrlSafe(refreshMatch[1], baseUrl);
}

function extractUvaProblemTitle(html, statementText) {
  const headingMatch = String(html || '').match(
    /<h3[^>]*>\s*([^<]+?)\s*<\/h3>/i
  );
  if (headingMatch?.[1]) {
    const heading = normalizeMultilineStatementText(
      stripHtmlTags(headingMatch[1])
    )
      .replace(/^\d+\s*[-:]\s*/, '')
      .trim();

    if (heading) {
      return heading;
    }
  }

  const titleMatch = String(html || '').match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );
  if (titleMatch?.[1]) {
    const titleText = normalizeMultilineStatementText(
      stripHtmlTags(titleMatch[1])
    )
      .replace(/^UVa\s+Online\s+Judge\s*[-:]\s*/i, '')
      .replace(/\s*[-:]\s*UVa\s+Online\s+Judge$/i, '')
      .trim();

    if (titleText && !/^online\s+judge$/i.test(titleText)) {
      return titleText;
    }
  }

  const firstLine = String(statementText || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine || null;
}

function extractUvaDescription(statementText) {
  const explicitDescription = extractSectionFromStatementText(statementText, [
    'Problem Description',
    'Description',
  ]);
  if (explicitDescription) {
    return explicitDescription;
  }

  const markerPattern =
    /\n\s*(?:Input(?:\s+Format|\s+Specification)?|Output(?:\s+Format|\s+Specification)?|Sample\s+Input|Sample\s+Output|Constraints?|Limits?|Explanation|Notes?)\s*:?/i;
  const markerIndex = statementText.search(markerPattern);
  const candidate =
    markerIndex > 0
      ? statementText.slice(0, markerIndex)
      : String(statementText || '');

  const filtered = candidate
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) {
        return false;
      }
      if (/^UVa\s+Online\s+Judge/i.test(line)) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();

  return filtered.length >= 20 ? filtered : null;
}

async function extractUvaProblemDetails(problemUrl) {
  try {
    const detailsUrl = normalizeProblemDetailsUrl(problemUrl, 'uva');
    if (!detailsUrl) {
      return { success: false, error: 'Missing problem URL' };
    }

    const response = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `UVa problem page HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const mainContentHtml = extractUvaMainContentHtml(html);
    const mainContentText = normalizeMultilineStatementText(
      htmlToTextWithLineBreaks(mainContentHtml)
    );

    let statementText = '';
    let statementPdfUrl = null;
    const statementFrameUrl = extractUvaStatementFrameUrl(
      mainContentHtml,
      detailsUrl
    );

    if (statementFrameUrl) {
      try {
        const statementResponse = await fetch(statementFrameUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/html,application/xhtml+xml',
          },
          cache: 'no-store',
        });

        if (statementResponse.ok) {
          const statementHtml = await statementResponse.text();
          const refreshUrl = extractUvaMetaRefreshUrl(
            statementHtml,
            statementFrameUrl
          );

          if (refreshUrl && /\.pdf(?:[?#]|$)/i.test(refreshUrl)) {
            statementPdfUrl = refreshUrl;
          } else {
            statementText = normalizeMultilineStatementText(
              htmlToTextWithLineBreaks(statementHtml)
            );
          }
        }
      } catch {
        // Keep best-effort parsing using the main page text.
      }
    }

    const sectionSourceText = statementText;
    const combinedSourceText = normalizeMultilineStatementText(
      [mainContentText, statementText].filter(Boolean).join('\n\n')
    );

    const inputFormat = extractSectionFromStatementText(sectionSourceText, [
      'Input',
      'Input Format',
      'Input Specification',
    ]);
    const outputFormat = extractSectionFromStatementText(sectionSourceText, [
      'Output',
      'Output Format',
      'Output Specification',
    ]);
    const constraints = extractSectionFromStatementText(sectionSourceText, [
      'Constraints',
      'Limits',
    ]);
    const extractedNotes = extractSectionFromStatementText(sectionSourceText, [
      'Explanation',
      'Note',
      'Notes',
    ]);
    const description = extractUvaDescription(sectionSourceText);
    const examples = extractSamplePairsFromStatementText(sectionSourceText);
    const timeLimitMs = parseUvaTimeLimitToMs(combinedSourceText);
    const memoryLimitKb = parseUvaMemoryLimitToKb(combinedSourceText);
    const notes = firstDefinedValue(
      extractedNotes,
      statementPdfUrl ? `Statement PDF: ${statementPdfUrl}` : null
    );

    const details = {
      problemName: extractUvaProblemTitle(mainContentHtml, sectionSourceText),
      description,
      inputFormat,
      outputFormat,
      constraints,
      examples,
      notes,
      tutorial_url: statementPdfUrl,
      tutorialUrl: statementPdfUrl,
      time_limit_ms: timeLimitMs,
      memory_limit_kb: memoryLimitKb,
    };

    const hasStructuredDetails = hasMeaningfulProblemDetails(details);
    const hasUsefulUvaMetadata =
      Boolean(details.problemName) &&
      (details.time_limit_ms != null ||
        details.memory_limit_kb != null ||
        Boolean(statementPdfUrl));

    if (!hasStructuredDetails && !hasUsefulUvaMetadata) {
      return {
        success: false,
        error: 'UVa problem details appear incomplete',
      };
    }

    return { success: true, data: details };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'UVa problem details extraction failed',
    };
  }
}

function toAbsoluteUrlSafe(rawUrl, baseUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function getValueByPath(obj, path) {
  if (!obj || typeof obj !== 'object' || !path) {
    return undefined;
  }

  const segments = String(path)
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current = obj;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function firstDefinedByPaths(obj, paths = []) {
  for (const path of paths) {
    const value = getValueByPath(obj, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function normalizeSubmissionTimestampToIso(rawTimestamp) {
  if (
    rawTimestamp === undefined ||
    rawTimestamp === null ||
    rawTimestamp === ''
  ) {
    return null;
  }

  const text = String(rawTimestamp).trim();
  if (!text) {
    return null;
  }

  if (/^\d+$/.test(text)) {
    const numeric = Number.parseInt(text, 10);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }

    const millis =
      text.length >= 13
        ? Number.parseInt(text.slice(0, 13), 10)
        : text.length >= 10
          ? numeric * 1000
          : null;

    if (millis == null || !Number.isFinite(millis)) {
      return null;
    }

    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }

  return null;
}

function getPlatformBaseUrlForNormalization(platform) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  const baseByPlatform = {
    codeforces: 'https://codeforces.com',
    atcoder: 'https://atcoder.jp',
    leetcode: 'https://leetcode.com',
    codechef: 'https://www.codechef.com',
    vjudge: 'https://vjudge.net',
    hackerrank: 'https://www.hackerrank.com',
    cses: 'https://cses.fi',
    lightoj: 'https://lightoj.com',
    uva: 'https://onlinejudge.org',
    toph: 'https://toph.co',
    spoj: 'https://www.spoj.com',
    beecrowd: 'https://judge.beecrowd.com',
  };

  return baseByPlatform[normalizedPlatform] || null;
}

function normalizePlatformUrl(rawUrl, platform) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const baseUrl = getPlatformBaseUrlForNormalization(platform);
  return baseUrl ? toAbsoluteUrlSafe(value, baseUrl) : null;
}

function buildFallbackProblemUrl(submission, platform) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  const problemId = String(
    firstDefinedValue(submission?.problem_id, submission?.problemId, '')
  ).trim();
  const contestId = String(
    firstDefinedValue(submission?.contest_id, submission?.contestId, '')
  ).trim();

  switch (normalizedPlatform) {
    case 'codeforces':
      if (contestId && problemId) {
        return `https://codeforces.com/problemset/problem/${encodeURIComponent(contestId)}/${encodeURIComponent(problemId)}`;
      }
      return null;
    case 'atcoder':
      if (contestId && problemId) {
        return `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/tasks/${encodeURIComponent(problemId)}`;
      }
      return null;
    case 'leetcode':
      return problemId
        ? `https://leetcode.com/problems/${encodeURIComponent(problemId)}/`
        : null;
    case 'codechef':
      if (!problemId) {
        return null;
      }
      if (contestId) {
        return `https://www.codechef.com/${encodeURIComponent(contestId)}/problems/${encodeURIComponent(problemId)}`;
      }
      return `https://www.codechef.com/problems/${encodeURIComponent(problemId)}`;
    case 'vjudge':
      return problemId
        ? `https://vjudge.net/problem/${encodeURIComponent(problemId)}`
        : null;
    case 'hackerrank':
      if (!problemId) {
        return null;
      }
      if (contestId && contestId.toLowerCase() !== 'master') {
        return `https://www.hackerrank.com/contests/${encodeURIComponent(contestId)}/challenges/${encodeURIComponent(problemId)}/problem`;
      }
      return `https://www.hackerrank.com/challenges/${encodeURIComponent(problemId)}/problem`;
    case 'cses':
      return /^\d+$/.test(problemId)
        ? `https://cses.fi/problemset/task/${problemId}`
        : null;
    case 'lightoj':
      return problemId
        ? `https://lightoj.com/problem/${encodeURIComponent(problemId)}`
        : null;
    case 'toph': {
      const normalizedProblemId = problemId.replace(/^\/?p\//i, '');
      return normalizedProblemId
        ? `https://toph.co/p/${encodeURIComponent(normalizedProblemId)}`
        : null;
    }
    case 'spoj':
      return problemId
        ? `https://www.spoj.com/problems/${encodeURIComponent(problemId)}/`
        : null;
    case 'beecrowd':
      return problemId
        ? `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(problemId)}`
        : null;
    default:
      return null;
  }
}

function buildFallbackSubmissionUrl(submission, platform) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();
  const submissionId = String(
    firstDefinedValue(submission?.submission_id, submission?.submissionId, '')
  ).trim();
  const problemId = String(
    firstDefinedValue(submission?.problem_id, submission?.problemId, '')
  ).trim();
  const contestId = String(
    firstDefinedValue(submission?.contest_id, submission?.contestId, '')
  ).trim();

  if (!submissionId) {
    return null;
  }

  switch (normalizedPlatform) {
    case 'codeforces':
      if (contestId) {
        return `https://codeforces.com/contest/${encodeURIComponent(contestId)}/submission/${encodeURIComponent(submissionId)}`;
      }
      return /^\d+$/.test(submissionId)
        ? `https://codeforces.com/submission/${encodeURIComponent(submissionId)}`
        : null;
    case 'atcoder':
      return contestId
        ? `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/submissions/${encodeURIComponent(submissionId)}`
        : null;
    case 'leetcode':
      return `https://leetcode.com/submissions/detail/${encodeURIComponent(submissionId)}/`;
    case 'codechef':
      return /^\d+$/.test(submissionId)
        ? `https://www.codechef.com/viewsolution/${encodeURIComponent(submissionId)}`
        : null;
    case 'vjudge': {
      const runId = submissionId.replace(/^vj_/i, '').trim();
      return /^\d+$/.test(runId)
        ? `https://vjudge.net/solution/${encodeURIComponent(runId)}`
        : null;
    }
    case 'hackerrank': {
      if (!/^\d+$/.test(submissionId) || !problemId) {
        return null;
      }
      if (contestId && contestId.toLowerCase() !== 'master') {
        return `https://www.hackerrank.com/contests/${encodeURIComponent(contestId)}/challenges/${encodeURIComponent(problemId)}/submissions/code/${encodeURIComponent(submissionId)}`;
      }
      return `https://www.hackerrank.com/challenges/${encodeURIComponent(problemId)}/submissions/code/${encodeURIComponent(submissionId)}`;
    }
    case 'cses':
      return /^\d+$/.test(submissionId)
        ? `https://cses.fi/problemset/result/${submissionId}/`
        : null;
    case 'lightoj':
      return /^\d+$/.test(submissionId)
        ? `https://lightoj.com/submission/${submissionId}`
        : null;
    case 'toph':
      return `https://toph.co/s/${encodeURIComponent(submissionId)}`;
    case 'spoj':
      return /^\d+$/.test(submissionId)
        ? `https://www.spoj.com/status/${submissionId}/`
        : null;
    case 'beecrowd':
      return /^\d+$/.test(submissionId)
        ? `https://judge.beecrowd.com/en/runs/code/${submissionId}`
        : null;
    default:
      return null;
  }
}

function hydrateSubmissionExtractionLinks(submission, platform) {
  if (!submission || typeof submission !== 'object') {
    return submission;
  }

  const normalizedPlatform = String(platform || submission?.platform || '')
    .trim()
    .toLowerCase();
  let normalizedProblemUrl = normalizePlatformUrl(
    firstDefinedValue(submission?.problem_url, submission?.problemUrl),
    normalizedPlatform
  );
  if (!normalizedProblemUrl) {
    normalizedProblemUrl = buildFallbackProblemUrl(
      submission,
      normalizedPlatform
    );
  }

  let normalizedSubmissionUrl = normalizePlatformUrl(
    firstDefinedValue(submission?.submission_url, submission?.submissionUrl),
    normalizedPlatform
  );
  if (!normalizedSubmissionUrl) {
    normalizedSubmissionUrl = buildFallbackSubmissionUrl(
      submission,
      normalizedPlatform
    );
  }

  if (normalizedProblemUrl) {
    submission.problem_url = normalizedProblemUrl;
    submission.problemUrl = normalizedProblemUrl;
  }

  if (normalizedSubmissionUrl) {
    submission.submission_url = normalizedSubmissionUrl;
    submission.submissionUrl = normalizedSubmissionUrl;
  }

  return submission;
}

function parseCodeChefTimestampToIso(rawTimestamp) {
  const text = decodeHtmlEntitiesSimple(rawTimestamp)
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) {
    return null;
  }

  const direct = normalizeSubmissionTimestampToIso(text);
  if (direct) {
    return direct;
  }

  const match = text.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i
  );

  if (!match) {
    return null;
  }

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const second = Number.parseInt(match[3] || '0', 10);
  const ampm = String(match[4] || '').toUpperCase();
  const day = Number.parseInt(match[5], 10);
  const month = Number.parseInt(match[6], 10);
  let year = Number.parseInt(match[7], 10);

  if (!Number.isFinite(year) || year <= 0) {
    return null;
  }

  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  if (ampm === 'PM' && hour < 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }

  const millis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  if (!Number.isFinite(millis)) {
    return null;
  }

  const parsedDate = new Date(millis);
  return Number.isFinite(parsedDate.getTime())
    ? parsedDate.toISOString()
    : null;
}

function parseCodeChefProblemRef(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return {
      contestId: null,
      problemId: null,
      problemUrl: null,
    };
  }

  let pathname = url;
  try {
    const parsed = new URL(url, 'https://www.codechef.com');
    pathname = parsed.pathname || '';
  } catch {
    pathname = url;
  }

  const segmented = pathname.match(/^\/?([^/?#]+)\/problems\/([^/?#]+)/i);
  if (segmented) {
    const contestId = decodeHtmlEntitiesSimple(segmented[1]);
    const normalizedContestId =
      contestId.toLowerCase() === 'problems' ? null : contestId;

    return {
      contestId: normalizedContestId,
      problemId: decodeHtmlEntitiesSimple(segmented[2]) || null,
      problemUrl: toAbsoluteUrlSafe(pathname, 'https://www.codechef.com'),
    };
  }

  const standalone = pathname.match(/^\/?problems\/([^/?#]+)/i);
  if (standalone) {
    return {
      contestId: null,
      problemId: decodeHtmlEntitiesSimple(standalone[1]) || null,
      problemUrl: toAbsoluteUrlSafe(pathname, 'https://www.codechef.com'),
    };
  }

  return {
    contestId: null,
    problemId: null,
    problemUrl: toAbsoluteUrlSafe(pathname, 'https://www.codechef.com'),
  };
}

function normalizeCodeChefVerdict(verdictRaw, statusCellHtml = '') {
  const combined = `${String(verdictRaw || '')} ${String(statusCellHtml || '')}`
    .toLowerCase()
    .trim();

  if (!combined) {
    return 'UNKNOWN';
  }

  if (combined.includes('partially accepted') || combined.includes('partial')) {
    return 'PC';
  }
  if (combined.includes('accepted') || combined.includes('tick-icon')) {
    return 'AC';
  }
  if (combined.includes('wrong answer')) {
    return 'WA';
  }
  if (combined.includes('time limit')) {
    return 'TLE';
  }
  if (combined.includes('memory limit')) {
    return 'MLE';
  }
  if (combined.includes('runtime error')) {
    return 'RE';
  }
  if (combined.includes('compilation error') || combined.includes('compile')) {
    return 'CE';
  }
  if (
    combined.includes('pending') ||
    combined.includes('running') ||
    combined.includes('queue')
  ) {
    return 'PENDING';
  }

  return String(verdictRaw || '').trim() || 'UNKNOWN';
}

function parseCodeChefRecentRows(content, expectedHandle) {
  const html = String(content || '');
  if (!html.trim()) {
    return [];
  }

  const submissions = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) != null) {
    const rowHtml = rowMatch[1];
    const cells = rowHtml.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 4) {
      continue;
    }

    const timeCell = cells[0] || '';
    const problemCell = cells[1] || '';
    const statusCell = cells[2] || '';
    const languageCell = cells[3] || '';
    const solutionCell = cells[4] || '';

    const submissionId =
      solutionCell.match(/\/viewsolution\/(\d+)/i)?.[1] ||
      rowHtml.match(/\/viewsolution\/(\d+)/i)?.[1] ||
      null;

    if (!submissionId) {
      continue;
    }

    const problemHrefRaw =
      problemCell.match(/href=['\"]([^'\"]*\/problems\/[^'\"]+)['\"]/i)?.[1] ||
      null;
    const problemRef = parseCodeChefProblemRef(problemHrefRaw || '');
    const problemName = stripHtmlTags(problemCell) || problemRef.problemId;

    const titleCandidates = Array.from(
      statusCell.matchAll(/title=['\"]([^'\"]+)['\"]/gi)
    )
      .map((entry) => decodeHtmlEntitiesSimple(entry[1]).trim())
      .filter(Boolean);

    const verdictCandidate =
      titleCandidates.find((candidate) =>
        /(accepted|wrong answer|time limit|memory limit|runtime error|compilation error|partial|pending|running|queue)/i.test(
          candidate
        )
      ) || stripHtmlTags(statusCell);

    const timeCandidates = Array.from(
      timeCell.matchAll(/title=['\"]([^'\"]+)['\"]/gi)
    )
      .map((entry) => decodeHtmlEntitiesSimple(entry[1]).trim())
      .filter(Boolean);

    const timestampText =
      timeCandidates.find((candidate) =>
        /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(candidate)
      ) ||
      timeCandidates[0] ||
      stripHtmlTags(timeCell);

    const language = stripHtmlTags(languageCell) || 'Unknown';
    const fallbackProblemId =
      (problemName || '').match(/\b[A-Z0-9_()+\-]{2,}\b/)?.[0] || null;
    const problemId =
      problemRef.problemId || fallbackProblemId || `cc_${submissionId}`;
    const problemUrl =
      problemRef.problemUrl ||
      `https://www.codechef.com/problems/${encodeURIComponent(problemId)}`;

    submissions.push({
      submission_id: String(submissionId),
      problem_id: problemId,
      problem_name: problemName || problemId,
      problem_url: problemUrl,
      contest_id: problemRef.contestId,
      verdict: normalizeVerdict(
        normalizeCodeChefVerdict(verdictCandidate, statusCell)
      ),
      language,
      execution_time_ms: null,
      memory_kb: null,
      submitted_at: parseCodeChefTimestampToIso(timestampText),
      source_code: null,
      submission_url: `https://www.codechef.com/viewsolution/${submissionId}`,
      platform: 'codechef',
      handle: expectedHandle || null,
      tags: [],
      difficulty_rating: null,
    });
  }

  return submissions;
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
let uvaProblemMapCache = null;
let uvaProblemMapCacheExpiresAt = 0;
const UVA_PROBLEM_MAP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
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
      const ids = new Set(
        data.data.submissionIds
          .map((submissionId) => normalizeSubmissionIdForLookup(submissionId))
          .filter(Boolean)
      );
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
        .map((field) =>
          String(field || '')
            .trim()
            .toLowerCase()
        )
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
      normalizedPlatform,
      problemId
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
  verdictFilter = 'all',
  options = {}
) {
  const { replaceExisting = false } = options;
  const { apiUrl, token } = await getApiCredentials();

  console.warn('[NEUPC][TEST] importSubmissionsToBackend credentials', {
    apiUrl,
    hasToken: !!token,
    platform,
    submissions: Array.isArray(submissions) ? submissions.length : 0,
    verdictFilter: normalizeVerdictFilter(verdictFilter),
    replaceExisting,
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
      replaceExisting,
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
        replaceExisting: Boolean(replaceExisting),
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
      submissionsAccepted: result.data?.submissionsAccepted,
      submissionsRejected: result.data?.submissionsRejected,
      recoveredProblemIds: result.data?.recoveredProblemIds,
      submissionsCreated: result.data?.submissionsCreated,
      submissionsUpdated: result.data?.submissionsUpdated,
      error: result.error,
    });

    if (response.ok && result.success) {
      return {
        success: true,
        submissionsAccepted: result.data?.submissionsAccepted || 0,
        submissionsRejected: result.data?.submissionsRejected || 0,
        recoveredProblemIds: result.data?.recoveredProblemIds || 0,
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
      try {
        await browserAPI.scripting.executeScript({
          target: { tabId },
          files: [config.contentScript],
        });
        console.log('[NEUPC] Script injected via scripting API');
        return true;
      } catch (e) {
        console.warn('[NEUPC] scripting.executeScript failed:', e.message);
        return false;
      }
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

      // Wait for tab to actually navigate to the domain instead of being about:blank
      if (
        tabInfo.status === 'loading' ||
        (tabInfo.url && !tabInfo.url.includes('http'))
      ) {
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
          submissionId: submission.submission_id,
          requireSourceCode: true,
        });

        if (response?.success && response?.data) {
          const mergedData = leetcodeApiData
            ? { ...response.data, ...leetcodeApiData }
            : response.data;

          const mergedSourceCode = firstDefinedValue(
            mergedData?.sourceCode,
            mergedData?.source_code
          );

          if (
            platform === 'spoj' &&
            !(
              typeof mergedSourceCode === 'string' &&
              mergedSourceCode.trim().length > 0
            )
          ) {
            await sleep(1200);
            continue;
          }

          return { success: true, data: mergedData };
        } else if (response?.nonRetriable) {
          throw new Error(
            response?.error || 'Non-retriable extraction failure'
          );
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
function extractBeecrowdProblemId(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw, 'https://judge.beecrowd.com');
    const pathMatch = parsed.pathname.match(
      /\/problems\/(?:view\/|fullscreen\/)?(\d+)(?:[/?#]|$)/i
    );
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }

    const queryId = parsed.searchParams.get('id');
    if (/^\d+$/.test(String(queryId || '').trim())) {
      return String(queryId).trim();
    }
  } catch {
    // Fall back to raw string checks below.
  }

  const pathOnlyMatch = raw.match(
    /\/problems\/(?:view\/|fullscreen\/)?(\d+)(?:[/?#]|$)/i
  );
  if (pathOnlyMatch?.[1]) {
    return pathOnlyMatch[1];
  }

  if (/^\d+$/.test(raw)) {
    return raw;
  }

  return null;
}

function normalizeProblemDetailsUrl(
  problemUrl,
  platform,
  fallbackProblemId = null
) {
  const normalizedPlatform = String(platform || '')
    .trim()
    .toLowerCase();

  // Canonicalize Beecrowd links to /problems/view/<numeric-id>.
  // This avoids invalid links like /problems/fullscreen/latest.
  if (normalizedPlatform === 'beecrowd') {
    const problemId =
      extractBeecrowdProblemId(problemUrl) ||
      extractBeecrowdProblemId(fallbackProblemId);
    if (problemId) {
      return `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(problemId)}`;
    }

    return problemUrl;
  }

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

  const hasResourceLimits =
    Number.isFinite(
      Number.parseInt(String(details.timeLimitMs ?? details.time_limit_ms), 10)
    ) ||
    Number.isFinite(
      Number.parseInt(
        String(details.memoryLimitKb ?? details.memory_limit_kb),
        10
      )
    );

  return (
    hasDescription ||
    hasInputOutput ||
    hasExamples ||
    hasConstraints ||
    hasResourceLimits
  );
}

async function extractProblemDetails(problemUrl, platform, problemId = null) {
  let tabId = null;

  try {
    if (
      String(platform || '')
        .trim()
        .toLowerCase() === 'uva'
    ) {
      return await extractUvaProblemDetails(problemUrl);
    }

    const detailsUrl = normalizeProblemDetailsUrl(
      problemUrl,
      platform,
      problemId
    );
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

      if (
        tabInfo.status === 'loading' ||
        (tabInfo.url && !tabInfo.url.startsWith('http'))
      ) {
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
        } else if (response?.nonRetriable) {
          throw new Error(
            response?.error || 'Non-retriable problem extraction failure'
          );
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
  const normalizedHandle = String(handle || '').trim();
  if (!normalizedHandle) {
    throw new Error('AtCoder handle is required');
  }

  console.log(`[NEUPC] Fetching AtCoder submissions for ${normalizedHandle}`);

  let problemMetadataById = new Map();
  try {
    problemMetadataById = await getAtCoderProblemMetadataMap();
  } catch (error) {
    console.warn(
      '[NEUPC] Continuing AtCoder fetch without metadata enrichment:',
      error
    );
  }

  const rawSubmissions = [];
  const seenSubmissionIds = new Set();
  const pageSizeHint = 500;
  const maxPages = 1000;
  let fromSecond = 0;

  for (let page = 0; page < maxPages; page++) {
    const response = await fetch(
      `${PLATFORMS_CONFIG.atcoder.apiUrl}/user/submissions?user=${encodeURIComponent(normalizedHandle)}&from_second=${fromSecond}`
    );

    if (!response.ok) {
      if (page === 0) {
        throw new Error('AtCoder API error');
      }
      break;
    }

    let pageRows;
    try {
      pageRows = await response.json();
    } catch (error) {
      if (page === 0) {
        throw new Error(`AtCoder API parse error: ${error.message}`);
      }
      break;
    }

    if (!Array.isArray(pageRows) || pageRows.length === 0) {
      break;
    }

    let highestEpochSecond = fromSecond;
    let addedThisPage = 0;

    for (const sub of pageRows) {
      const submissionId = String(sub?.id || '').trim();
      if (!submissionId || seenSubmissionIds.has(submissionId)) {
        continue;
      }

      seenSubmissionIds.add(submissionId);
      rawSubmissions.push(sub);
      addedThisPage++;

      const epochSecond = Number.parseInt(String(sub?.epoch_second || ''), 10);
      if (Number.isFinite(epochSecond) && epochSecond > highestEpochSecond) {
        highestEpochSecond = epochSecond;
      }
    }

    if (pageRows.length < pageSizeHint) {
      break;
    }

    if (addedThisPage === 0) {
      break;
    }

    const nextFromSecond = highestEpochSecond + 1;
    if (!Number.isFinite(nextFromSecond) || nextFromSecond <= fromSecond) {
      break;
    }

    fromSecond = nextFromSecond;
    await sleep(120);
  }

  return rawSubmissions.map((sub) => {
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

async function fetchCodeChefSubmissions(handle) {
  const normalizedHandle = String(handle || '').trim();
  if (!normalizedHandle) {
    throw new Error('CodeChef handle is required');
  }

  const submissions = [];
  const seenSubmissionIds = new Set();
  let page = 1;
  let maxPage = 1;
  const maxPageLimit = 300;

  while (page <= maxPage && page <= maxPageLimit) {
    const endpoint =
      `https://www.codechef.com/recent/user?page=${page}` +
      `&user_handle=${encodeURIComponent(normalizedHandle)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      if (page === 1) {
        throw new Error(`CodeChef recent submissions HTTP ${response.status}`);
      }
      break;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (page === 1) {
        throw new Error(`Unexpected CodeChef response: ${error.message}`);
      }
      break;
    }

    const parsedMaxPage = Number.parseInt(payload?.max_page, 10);
    if (Number.isFinite(parsedMaxPage) && parsedMaxPage > 0) {
      maxPage = Math.min(parsedMaxPage, maxPageLimit);
    }

    const rows = parseCodeChefRecentRows(payload?.content, normalizedHandle);
    if (rows.length === 0) {
      if (page === 1) {
        return [];
      }
      break;
    }

    rows.forEach((submission) => {
      const submissionId = String(submission?.submission_id || '').trim();
      if (!submissionId || seenSubmissionIds.has(submissionId)) {
        return;
      }

      seenSubmissionIds.add(submissionId);
      submissions.push(submission);
    });

    if (rows.length < 1) {
      break;
    }

    page += 1;
    await sleep(200);
  }

  return submissions;
}

async function fetchVjudgeSubmissions(handle) {
  const normalizedHandle = String(handle || '').trim();
  if (!normalizedHandle) {
    throw new Error('VJudge handle is required');
  }

  const submissions = [];
  const seenSubmissionIds = new Set();
  const pageSize = 20;
  const maxPages = 600;
  let start = 0;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const endpoint =
      `https://vjudge.net/status/data?un=${encodeURIComponent(normalizedHandle)}` +
      `&OJId=All&start=${start}&length=${pageSize}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      if (pageIndex === 0) {
        throw new Error(`VJudge status API HTTP ${response.status}`);
      }
      break;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (pageIndex === 0) {
        throw new Error(`Unexpected VJudge response: ${error.message}`);
      }
      break;
    }

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    if (rows.length === 0) {
      break;
    }

    rows.forEach((row) => {
      const rawRunId = firstDefinedValue(row?.runId, row?.id);
      const runIdText = String(rawRunId || '').trim();
      if (!runIdText || !/^\d+$/.test(runIdText)) {
        return;
      }

      const canonicalSubmissionId = `vj_${runIdText}`;
      if (seenSubmissionIds.has(canonicalSubmissionId)) {
        return;
      }
      seenSubmissionIds.add(canonicalSubmissionId);

      const oj = String(row?.oj || '').trim();
      const problemNumber = String(row?.probNum || '').trim();
      const fallbackProblemId = String(
        firstDefinedValue(row?.problemId, row?.problem_id) || ''
      ).trim();

      const problemId =
        oj && problemNumber
          ? `${oj}-${problemNumber}`
          : fallbackProblemId || `VJ-${runIdText}`;

      const submittedAt = normalizeSubmissionTimestampToIso(
        firstDefinedValue(row?.time, row?.timestamp)
      );

      const runtime = Number.parseInt(String(row?.runtime || ''), 10);
      const memory = Number.parseInt(String(row?.memory || ''), 10);

      const rawVerdict =
        row?.processing === true
          ? 'PENDING'
          : firstDefinedValue(row?.status, row?.result, row?.verdict) ||
            'UNKNOWN';

      submissions.push({
        submission_id: canonicalSubmissionId,
        problem_id: problemId,
        problem_name: problemId,
        problem_url: `https://vjudge.net/problem/${encodeURIComponent(problemId)}`,
        contest_id:
          row?.contestId != null
            ? String(row.contestId)
            : firstDefinedValue(row?.contest_id, null),
        verdict: normalizeVerdict(String(rawVerdict)),
        language:
          firstDefinedValue(row?.language, row?.languageCanonical, 'Unknown') ||
          'Unknown',
        execution_time_ms: Number.isFinite(runtime) ? runtime : null,
        memory_kb: Number.isFinite(memory) ? memory : null,
        submitted_at: submittedAt,
        difficulty_rating: null,
        tags: [],
        source_code: null,
        submission_url: `https://vjudge.net/solution/${runIdText}`,
        platform: 'vjudge',
        handle:
          String(
            firstDefinedValue(row?.userName, row?.user, normalizedHandle) || ''
          ) || normalizedHandle,
      });
    });

    if (rows.length < pageSize) {
      break;
    }

    start += rows.length;
    await sleep(180);
  }

  return submissions;
}

function normalizeHackerrankVerdict(verdictRaw) {
  const value = String(verdictRaw || '')
    .trim()
    .toLowerCase();
  if (!value) {
    return 'UNKNOWN';
  }

  if (
    value.includes('accepted') ||
    value.includes('solved') ||
    value.includes('passed') ||
    value === 'ok'
  ) {
    return 'AC';
  }
  if (value.includes('partial')) {
    return 'PC';
  }
  if (value.includes('wrong answer') || value.includes('failed')) {
    return 'WA';
  }
  if (value.includes('time limit') || value.includes('timeout')) {
    return 'TLE';
  }
  if (value.includes('memory limit')) {
    return 'MLE';
  }
  if (value.includes('runtime error')) {
    return 'RE';
  }
  if (value.includes('compile')) {
    return 'CE';
  }
  if (
    value.includes('pending') ||
    value.includes('running') ||
    value.includes('queue') ||
    value.includes('processing')
  ) {
    return 'PENDING';
  }

  return normalizeVerdict(value.toUpperCase());
}

function normalizeHackerrankHandleInput(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) {
    return '';
  }

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?hackerrank\.com\//i,
    ''
  );
  normalized = normalized.replace(/^profile\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();

  return normalized;
}

function normalizeHackerCupHandleInput(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) {
    return '';
  }

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
    ''
  );

  const profileId = normalized.match(/profile\.php\?id=(\d+)/i)?.[1];
  if (profileId) {
    return `fb_${profileId}`;
  }

  normalized = normalized
    .replace(/^people\//i, '')
    .replace(/^user\//i, '')
    .replace(/^codingcompetitions\//i, '')
    .split(/[/?#&]/)[0]
    .replace(/^@+/, '')
    .trim();

  return normalized;
}

function normalizeTophHandleInput(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) {
    return '';
  }

  const authorParamMatch = value.match(/[?&]author=([a-f0-9]{24})/i);
  if (authorParamMatch?.[1]) {
    return authorParamMatch[1].toLowerCase();
  }

  const directAuthorIdMatch = value.match(/^([a-f0-9]{24})$/i);
  if (directAuthorIdMatch?.[1]) {
    return directAuthorIdMatch[1].toLowerCase();
  }

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(/^(?:https?:\/\/)?(?:www\.)?toph\.co\//i, '');
  normalized = normalized.replace(/^\/+/, '');
  normalized = normalized.replace(/^(?:u|users|profile)\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();

  return normalized;
}

function normalizeUvaHandleInput(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) {
    return '';
  }

  const idFromQuery = value.match(/[?&]id=(\d+)/i);
  if (idFromQuery?.[1]) {
    return idFromQuery[1];
  }

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?uhunt\.onlinejudge\.org\/id\//i,
    ''
  );
  normalized = normalized
    .split(/[/?#&]/)[0]
    .replace(/^@+/, '')
    .trim();

  return normalized;
}

function normalizeBeecrowdHandleInput(rawHandle) {
  const value = String(rawHandle || '').trim();
  if (!value) {
    return '';
  }

  let normalized = value.replace(/^@+/, '');
  normalized = normalized.replace(
    /^(?:https?:\/\/)?(?:www\.)?(?:beecrowd\.com\.br|judge\.beecrowd\.com|urionlinejudge\.com\.br)\//i,
    ''
  );
  normalized = normalized.replace(/^judge\/[a-z]{2}\//i, '');
  normalized = normalized.replace(/^[a-z]{2}\//i, '');
  normalized = normalized.replace(/^(?:profile|users?)\//i, '');
  normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();

  return normalized;
}

function decodeUriComponentSafe(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function parseHackerrankChallengeRef(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) {
    return {
      contestSlug: null,
      challengeSlug: null,
      problemUrl: null,
    };
  }

  let pathname = url;
  let absoluteUrl = toAbsoluteUrlSafe(url, 'https://www.hackerrank.com');

  try {
    const parsed = new URL(url, 'https://www.hackerrank.com');
    pathname = parsed.pathname || '';
    absoluteUrl = parsed.toString();
  } catch {
    // Fall back to regex parsing below.
  }

  const contestChallengeMatch = pathname.match(
    /^\/contests\/([^/?#]+)\/challenges\/([^/?#]+)/i
  );

  if (contestChallengeMatch) {
    const contestSlug = decodeHtmlEntitiesSimple(
      decodeUriComponentSafe(contestChallengeMatch[1])
    ).trim();
    const challengeSlug = decodeHtmlEntitiesSimple(
      decodeUriComponentSafe(contestChallengeMatch[2])
    ).trim();

    if (contestSlug && challengeSlug) {
      return {
        contestSlug,
        challengeSlug,
        problemUrl: `https://www.hackerrank.com/contests/${encodeURIComponent(contestSlug)}/challenges/${encodeURIComponent(challengeSlug)}/problem`,
      };
    }
  }

  const challengeMatch = pathname.match(/^\/challenges\/([^/?#]+)/i);
  if (challengeMatch) {
    const challengeSlug = decodeHtmlEntitiesSimple(
      decodeUriComponentSafe(challengeMatch[1])
    ).trim();

    if (challengeSlug) {
      return {
        contestSlug: 'master',
        challengeSlug,
        problemUrl: `https://www.hackerrank.com/challenges/${encodeURIComponent(challengeSlug)}/problem`,
      };
    }
  }

  return {
    contestSlug: null,
    challengeSlug: null,
    problemUrl: absoluteUrl,
  };
}

function extractHackerrankHandleFromAny(rawValue) {
  if (rawValue == null) {
    return null;
  }

  if (typeof rawValue === 'string') {
    const normalized = normalizeHackerrankHandleInput(rawValue);
    return normalized || null;
  }

  if (typeof rawValue !== 'object') {
    return null;
  }

  const candidate = firstDefinedValue(
    firstDefinedByPaths(rawValue, ['username']),
    firstDefinedByPaths(rawValue, ['handle']),
    firstDefinedByPaths(rawValue, ['slug']),
    firstDefinedByPaths(rawValue, ['name']),
    firstDefinedByPaths(rawValue, ['user.username']),
    firstDefinedByPaths(rawValue, ['hacker.username'])
  );

  if (typeof candidate !== 'string') {
    return null;
  }

  const normalized = normalizeHackerrankHandleInput(candidate);
  return normalized || null;
}

async function fetchHackerrankLatestSubmissionMeta(
  handle,
  challengeSlug,
  contestSlug = null,
  targetSubmittedAt = null
) {
  const normalizedHandle = normalizeHackerrankHandleInput(handle);
  const normalizedChallengeSlug = String(challengeSlug || '').trim();

  if (!normalizedHandle || !normalizedChallengeSlug) {
    return null;
  }

  const contestCandidates = [];
  const normalizedContestSlug = String(contestSlug || '').trim();
  if (normalizedContestSlug) {
    contestCandidates.push(normalizedContestSlug);
  }
  if (!contestCandidates.some((item) => item.toLowerCase() === 'master')) {
    contestCandidates.push('master');
  }

  const targetIso = normalizeSubmissionTimestampToIso(targetSubmittedAt);
  const targetMillis = targetIso ? Date.parse(targetIso) : NaN;
  const hasTargetMillis = Number.isFinite(targetMillis);

  for (const contestCandidate of contestCandidates) {
    const endpoint =
      `https://www.hackerrank.com/rest/contests/${encodeURIComponent(contestCandidate)}/challenges/${encodeURIComponent(normalizedChallengeSlug)}/submissions?` +
      new URLSearchParams({ offset: '0', limit: '25' }).toString();

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      continue;
    }

    const rows = Array.isArray(payload?.models) ? payload.models : [];
    if (rows.length === 0) {
      continue;
    }

    const parsedRows = rows
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null;
        }

        const submissionIdRaw = firstDefinedByPaths(row, [
          'id',
          'submission_id',
          'submissionId',
          'recent_submission.id',
        ]);

        const submissionId = String(submissionIdRaw || '').trim();
        if (!submissionId) {
          return null;
        }

        const rowHandle = extractHackerrankHandleFromAny(
          firstDefinedValue(
            firstDefinedByPaths(row, ['hacker']),
            firstDefinedByPaths(row, ['owner']),
            firstDefinedByPaths(row, ['author']),
            firstDefinedByPaths(row, ['user']),
            firstDefinedByPaths(row, ['username']),
            firstDefinedByPaths(row, ['user.username']),
            firstDefinedByPaths(row, ['hacker.username'])
          )
        );

        const submittedAt = normalizeSubmissionTimestampToIso(
          firstDefinedByPaths(row, [
            'created_at',
            'submission_time',
            'submitted_at',
            'timestamp',
            'time',
          ])
        );

        return {
          submissionId,
          handle: rowHandle,
          verdictRaw: firstDefinedValue(
            firstDefinedByPaths(row, ['status']),
            firstDefinedByPaths(row, ['verdict']),
            firstDefinedByPaths(row, ['result'])
          ),
          language: firstDefinedValue(
            firstDefinedByPaths(row, ['language']),
            firstDefinedByPaths(row, ['lang']),
            firstDefinedByPaths(row, ['compiler'])
          ),
          submittedAt,
        };
      })
      .filter(Boolean);

    if (parsedRows.length === 0) {
      continue;
    }

    const normalizedHandleLower = normalizedHandle.toLowerCase();
    const explicitHandleMatches = parsedRows.filter(
      (row) =>
        typeof row.handle === 'string' &&
        row.handle.toLowerCase() === normalizedHandleLower
    );

    const candidateRows =
      explicitHandleMatches.length > 0 ? explicitHandleMatches : parsedRows;

    let bestCandidate = null;

    for (const row of candidateRows) {
      let score = 0;

      const normalizedVerdict = normalizeHackerrankVerdict(row.verdictRaw);
      if (normalizedVerdict === 'AC') {
        score += 120;
      } else if (normalizedVerdict && normalizedVerdict !== 'UNKNOWN') {
        score += 25;
      }

      if (row.submittedAt) {
        const rowMillis = Date.parse(row.submittedAt);
        if (Number.isFinite(rowMillis)) {
          score += 10;

          if (hasTargetMillis) {
            const diff = Math.abs(rowMillis - targetMillis);
            // Favor submissions closest to the recent_challenges timestamp.
            score += Math.max(0, 1000 - Math.floor(diff / 60000));
          } else {
            score += rowMillis / 1_000_000_000_000;
          }
        }
      }

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { ...row, score };
      }
    }

    if (bestCandidate) {
      return {
        submissionId: bestCandidate.submissionId,
        verdictRaw: bestCandidate.verdictRaw,
        language: bestCandidate.language,
        submittedAt: bestCandidate.submittedAt,
        contestSlug: contestCandidate,
      };
    }
  }

  return null;
}

async function fetchHackerrankSubmissions(handle, options = {}) {
  const { includeSubmissionIds = false } = options;
  const normalizedHandle = normalizeHackerrankHandleInput(handle);
  if (!normalizedHandle) {
    throw new Error('HackerRank handle is required');
  }

  const submissions = [];
  const seenSubmissionIds = new Set();
  const challengeSubmissionMetaCache = new Map();
  const limit = 100;
  const maxPages = 200;
  let offset = 0;
  let cursor = null;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const endpoint =
      `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(normalizedHandle)}/recent_challenges?` +
      params.toString();

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      if (pageIndex === 0) {
        if (response.status === 404) {
          throw new Error(
            `HackerRank handle not found or inaccessible: ${normalizedHandle}`
          );
        }
        throw new Error(`HackerRank recent challenges HTTP ${response.status}`);
      }
      break;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (pageIndex === 0) {
        throw new Error(`Unexpected HackerRank response: ${error.message}`);
      }
      break;
    }

    const models = Array.isArray(payload?.models) ? payload.models : [];
    if (models.length === 0) {
      break;
    }

    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      const model = models[modelIndex];
      if (!model || typeof model !== 'object') {
        continue;
      }

      const challengeRef = parseHackerrankChallengeRef(
        firstDefinedByPaths(model, ['url', 'challenge.url', 'challenge_url'])
      );

      const challengeSlugRaw = firstDefinedByPaths(model, [
        'challenge.slug',
        'challenge_slug',
        'ch_slug',
        'slug',
        'name_slug',
      ]);
      const challengeSlug = String(
        challengeSlugRaw || challengeRef.challengeSlug || ''
      ).trim();
      if (!challengeSlug) {
        continue;
      }

      const contestSlugRaw = firstDefinedByPaths(model, [
        'contest.slug',
        'contest_slug',
        'con_slug',
        'track.slug',
      ]);
      const contestSlug = String(
        contestSlugRaw || challengeRef.contestSlug || ''
      ).trim();
      const contestId =
        contestSlug && contestSlug.toLowerCase() !== 'master'
          ? contestSlug
          : null;

      const rawSubmissionId = firstDefinedByPaths(model, [
        'submission.id',
        'submission_id',
        'id',
        'recent_submission.id',
      ]);

      let submissionIdRaw =
        rawSubmissionId != null ? String(rawSubmissionId).trim() : '';

      const submittedAtRaw = firstDefinedByPaths(model, [
        'submission.created_at',
        'solved_at',
        'created_at',
        'timestamp',
        'time',
      ]);

      let submittedAt = normalizeSubmissionTimestampToIso(submittedAtRaw);

      let resolvedSubmissionMeta = null;
      if (includeSubmissionIds && !submissionIdRaw && challengeSlug) {
        const challengeKey = `${contestId || 'master'}:${challengeSlug}`;

        if (challengeSubmissionMetaCache.has(challengeKey)) {
          resolvedSubmissionMeta =
            challengeSubmissionMetaCache.get(challengeKey);
        } else {
          resolvedSubmissionMeta = await fetchHackerrankLatestSubmissionMeta(
            normalizedHandle,
            challengeSlug,
            contestId,
            submittedAt
          );
          challengeSubmissionMetaCache.set(
            challengeKey,
            resolvedSubmissionMeta || null
          );
          await sleep(120);
        }

        if (resolvedSubmissionMeta?.submissionId) {
          submissionIdRaw = String(resolvedSubmissionMeta.submissionId).trim();
        }

        if (!submittedAt && resolvedSubmissionMeta?.submittedAt) {
          submittedAt = normalizeSubmissionTimestampToIso(
            resolvedSubmissionMeta.submittedAt
          );
        }
      }

      const effectiveContestSlug = firstDefinedValue(
        resolvedSubmissionMeta?.contestSlug,
        contestId
      );
      const effectiveContestId =
        typeof effectiveContestSlug === 'string' &&
        effectiveContestSlug.trim() &&
        effectiveContestSlug.toLowerCase() !== 'master'
          ? effectiveContestSlug.trim()
          : null;

      const fallbackSuffix = (
        submittedAt
          ? submittedAt.replace(/[^a-zA-Z0-9_-]+/g, '_')
          : `${pageIndex + 1}_${modelIndex + 1}`
      ).replace(/^_+|_+$/g, '');

      const handlePart =
        normalizedHandle.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'handle';
      const contestPart =
        (effectiveContestId || 'master').replace(/[^a-zA-Z0-9_-]+/g, '_') ||
        'master';
      const challengePart =
        challengeSlug.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'challenge';

      const submissionId =
        submissionIdRaw != null && String(submissionIdRaw).trim().length > 0
          ? String(submissionIdRaw).trim()
          : `hr_recent_${handlePart}_${contestPart}_${challengePart}_${fallbackSuffix || `${pageIndex + 1}_${modelIndex + 1}`}`;

      if (seenSubmissionIds.has(submissionId)) {
        continue;
      }
      seenSubmissionIds.add(submissionId);

      const problemName =
        String(
          firstDefinedByPaths(model, [
            'challenge.name',
            'challenge_name',
            'name',
            'title',
          ]) || ''
        ).trim() || challengeSlug;

      const language =
        String(
          firstDefinedByPaths(model, [
            'submission.language',
            'language',
            'lang',
            'recent_submission.language',
            'submission.lang',
          ]) || ''
        ).trim() ||
        String(resolvedSubmissionMeta?.language || '').trim() ||
        'Unknown';

      const verdictRaw = firstDefinedByPaths(model, [
        'submission.status',
        'status',
        'verdict',
        'result',
      ]);

      const verdict = normalizeHackerrankVerdict(
        firstDefinedValue(verdictRaw, resolvedSubmissionMeta?.verdictRaw, 'AC')
      );

      const runtimeRaw = firstDefinedByPaths(model, [
        'submission.runtime',
        'runtime',
        'run_time',
      ]);
      const memoryRaw = firstDefinedByPaths(model, [
        'submission.memory',
        'memory',
      ]);

      const executionTime =
        runtimeRaw != null ? Number.parseInt(String(runtimeRaw), 10) : null;
      const memoryUsed =
        memoryRaw != null ? Number.parseInt(String(memoryRaw), 10) : null;

      const problemUrl =
        challengeRef.problemUrl ||
        (effectiveContestId
          ? `https://www.hackerrank.com/contests/${encodeURIComponent(effectiveContestId)}/challenges/${encodeURIComponent(challengeSlug)}/problem`
          : `https://www.hackerrank.com/challenges/${encodeURIComponent(challengeSlug)}/problem`);

      const submissionUrl =
        submissionIdRaw != null && String(submissionIdRaw).trim().length > 0
          ? effectiveContestId
            ? `https://www.hackerrank.com/contests/${encodeURIComponent(effectiveContestId)}/challenges/${encodeURIComponent(challengeSlug)}/submissions/code/${encodeURIComponent(String(submissionIdRaw).trim())}`
            : `https://www.hackerrank.com/challenges/${encodeURIComponent(challengeSlug)}/submissions/code/${encodeURIComponent(String(submissionIdRaw).trim())}`
          : null;

      submissions.push({
        submission_id: submissionId,
        problem_id: challengeSlug,
        problem_name: problemName,
        problem_url: problemUrl,
        contest_id: effectiveContestId,
        verdict,
        language,
        execution_time_ms: Number.isFinite(executionTime)
          ? executionTime
          : null,
        memory_kb: Number.isFinite(memoryUsed) ? memoryUsed : null,
        submitted_at: submittedAt,
        source_code: null,
        difficulty_rating: null,
        tags: [],
        submission_url: submissionUrl,
        platform: 'hackerrank',
        handle: normalizedHandle,
      });
    }

    if (payload?.last_page === true) {
      break;
    }

    const nextCursor = String(payload?.cursor || '').trim();
    if (nextCursor && nextCursor !== cursor) {
      cursor = nextCursor;
    }

    if (models.length < limit && !nextCursor) {
      break;
    }

    offset += models.length;
    await sleep(180);
  }

  return submissions;
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
        missingFields
          .map((field) =>
            String(field || '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    : null;

  const hasMissingFieldFilter =
    missingFieldSet != null && missingFieldSet.size > 0;

  // Only do a full merge when we are not targeting specific missing fields.
  if (!hasMissingFieldFilter) {
    mergeExtractedSubmissionData(importCandidate, details);
  }

  const shouldApplyField = (fieldName, aliases = []) => {
    if (!missingFieldSet || missingFieldSet.size === 0) {
      return true;
    }

    const candidates = [fieldName, ...(Array.isArray(aliases) ? aliases : [])]
      .map((name) =>
        String(name || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);

    return candidates.some((candidate) => missingFieldSet.has(candidate));
  };

  const description = firstDefinedValue(
    details.description,
    details.problemDescription,
    details.problem_description
  );
  if (
    shouldApplyField('description', [
      'problem_description',
      'problemdescription',
    ]) &&
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
    shouldApplyField('input_format', ['inputformat']) &&
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
    shouldApplyField('output_format', ['outputformat']) &&
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
  if (shouldApplyField('examples', ['sample_tests']) && examples.length > 0) {
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
    shouldApplyField('tutorial_url', ['tutorialurl']) &&
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
    shouldApplyField('tutorial_content', ['tutorialcontent']) &&
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
  if (
    shouldApplyField('tutorial_solutions', ['tutorialsolutions']) &&
    tutorialSolutions.length > 0
  ) {
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
    ? missingFields
        .map((field) =>
          String(field || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    : null;

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
    platform,
    importCandidate.problem_id
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
    forceExtract = false,
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
    const pageOptimization = forceExtract
      ? null
      : await fetchPageOptimizationStatusForSubmissions(
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

      hydrateSubmissionExtractionLinks(importCandidate, platform);

      if (!importCandidate.submission_url) {
        console.log(
          `[NEUPC] Skipping code extraction for ${importCandidate.submission_id}: no submission_url`
        );
        importState.codesSkipped++;
      } else {
        const sourceResult = await extractSourceCode(importCandidate, platform);

        const extractedSourceCode = firstDefinedValue(
          sourceResult?.data?.sourceCode,
          sourceResult?.data?.source_code
        );
        const hasExtractedSourceCode =
          typeof extractedSourceCode === 'string' &&
          extractedSourceCode.trim().length > 0;
        const hasUsableSourceResult =
          sourceResult.success &&
          sourceResult.data &&
          (platform !== 'spoj' || hasExtractedSourceCode);

        if (hasUsableSourceResult) {
          mergeExtractedSubmissionData(importCandidate, sourceResult.data);
          importState.codesFetched++;
          extractedCount++;
          sourceExtractionSucceeded = true;
        } else {
          console.log(
            `[NEUPC] Failed to extract ${importCandidate.submission_id}: ${sourceResult.error}`
          );
          importState.codesSkipped++;
          importState.errors.push({
            submission_id: importCandidate.submission_id,
            error: sourceResult.error,
          });
        }
      }

      const problemDetailStatus = getCachedProblemDetailStatus(
        platform,
        importCandidate.problem_id
      );

      let detailsResult;

      if (!forceExtract && problemDetailStatus?.isComplete) {
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
    filteredSubmissions.forEach((submission) => {
      const importCandidate = { ...submission };
      hydrateSubmissionExtractionLinks(importCandidate, platform);
      readyForImport.push(importCandidate);
    });
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
    effectiveVerdictFilter,
    { replaceExisting: false }
  );

  if (importResult.success) {
    importState.imported += importResult.solvesCreated;
    importState.submissionsCreated += importResult.submissionsCreated || 0;
    importState.submissionsUpdated += importResult.submissionsUpdated || 0;

    readyForImport.forEach((submission) => {
      const submissionId = normalizeSubmissionIdForLookup(
        firstDefinedValue(submission?.submission_id, submission?.submissionId)
      );
      if (submissionId) {
        existingSubmissionIds.add(submissionId);
      }
    });

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
    replaceExisting = false,
    forceExtract = false,
  } = options;
  const shouldRunExtractionPass = fetchCodes;
  const shouldExtractSourceCode = fetchCodes && platform !== 'uva';

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

  if (shouldRunExtractionPass) {
    const batchOptimization =
      replaceExisting || forceExtract
        ? null
        : await fetchPageOptimizationStatusForSubmissions(
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

      hydrateSubmissionExtractionLinks(importCandidate, platform);

      sendProgress({
        phase: 'fetching_codes',
        message: `Batch ${page}/${totalPages}: Extracting ${i + 1}/${submissions.length} - ${submission.problem_id}`,
        currentPage: page,
        totalPages,
        currentItem: i + 1,
        totalItems: submissions.length,
      });

      const shouldAttemptSourceExtraction =
        shouldExtractSourceCode &&
        (platform !== 'spoj' ||
          /^\d+$/.test(
            String(
              firstDefinedValue(
                submission?.submission_id,
                submission?.submissionId
              ) || ''
            ).trim()
          ));

      if (shouldAttemptSourceExtraction) {
        if (!importCandidate.submission_url) {
          importState.codesSkipped++;
        } else {
          const sourceResult = await extractSourceCode(
            importCandidate,
            platform
          );

          const extractedSourceCode = firstDefinedValue(
            sourceResult?.data?.sourceCode,
            sourceResult?.data?.source_code
          );
          const hasExtractedSourceCode =
            typeof extractedSourceCode === 'string' &&
            extractedSourceCode.trim().length > 0;
          const hasUsableSourceResult =
            sourceResult.success &&
            sourceResult.data &&
            (platform !== 'spoj' || hasExtractedSourceCode);

          if (hasUsableSourceResult) {
            mergeExtractedSubmissionData(importCandidate, sourceResult.data);
            importState.codesFetched++;
            extractedCount++;
            sourceExtractionSucceeded = true;
          } else {
            importState.codesSkipped++;
            importState.errors.push({
              submission_id: importCandidate.submission_id,
              error: sourceResult.error,
            });
          }
        }
      } else if (shouldExtractSourceCode && platform === 'spoj') {
        importState.codesSkipped++;
      }

      const problemDetailStatus = getCachedProblemDetailStatus(
        platform,
        importCandidate.problem_id
      );

      let detailsResult;

      if (!forceExtract && problemDetailStatus?.isComplete) {
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
    submissions.forEach((submission) => {
      const importCandidate = { ...submission };
      hydrateSubmissionExtractionLinks(importCandidate, platform);
      readyForImport.push(importCandidate);
    });
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
    verdictFilter,
    { replaceExisting }
  );

  if (importResult.success) {
    importState.imported += importResult.solvesCreated;
    importState.submissionsCreated += importResult.submissionsCreated || 0;
    importState.submissionsUpdated += importResult.submissionsUpdated || 0;
    readyForImport.forEach((submission) => {
      const submissionId = normalizeSubmissionIdForLookup(
        firstDefinedValue(submission?.submission_id, submission?.submissionId)
      );
      if (submissionId) {
        existingSubmissionIds.add(submissionId);
      }
    });
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
    hackercup: 'facebookhackercup',
    'hacker-cup': 'facebookhackercup',
    facebookhackercup: 'facebookhackercup',
    'facebook-hacker-cup': 'facebookhackercup',
    metahackercup: 'facebookhackercup',
    'meta-hacker-cup': 'facebookhackercup',
  };
  const platform = platformAliases[requestedPlatform] || requestedPlatform;
  const sourceCodeExtractionEnabled = fetchCodes;
  const quickMode = !fetchCodes;
  const skipExisting = !syncEverything;
  const effectiveVerdictFilter = normalizeVerdictFilter(verdictFilter, onlyAC);

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
  } else if (platform === 'hackerrank') {
    normalizedHandle = normalizeHackerrankHandleInput(normalizedHandle);
    if (!normalizedHandle) {
      throw new Error(
        'Invalid HackerRank handle. Use username, @username, or profile URL.'
      );
    }
  } else if (platform === 'facebookhackercup') {
    normalizedHandle = normalizeHackerCupHandleInput(normalizedHandle);
    if (!normalizedHandle) normalizedHandle = 'me';
  } else if (platform === 'toph') {
    normalizedHandle = normalizeTophHandleInput(normalizedHandle);
    if (!normalizedHandle) {
      throw new Error(
        'Invalid Toph input. Use username, author ID, profile URL, or submissions/filter URL.'
      );
    }
  } else if (platform === 'uva') {
    normalizedHandle = normalizeUvaHandleInput(normalizedHandle);
    if (!normalizedHandle) {
      throw new Error(
        'Invalid UVa input. Use your uHunt username, numeric uHunt ID, or uHunt profile URL.'
      );
    }
  } else if (platform === 'beecrowd') {
    normalizedHandle = normalizeBeecrowdHandleInput(normalizedHandle);
    if (!normalizedHandle) {
      throw new Error(
        'Invalid beecrowd input. Use your profile ID, username, or profile URL.'
      );
    }
  }

  const forceExtract = sourceCodeExtractionEnabled && !skipExisting;

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
    let fatalImportError = null;

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
    } else if (platform === 'spoj') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching SPOJ submission history...',
      });
      submissions = await fetchSpojSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-SPOJ] Fetched submissions:', submissions);
      console.log('[NEUPC-SPOJ] Total count:', totalCount);
    } else if (platform === 'codechef') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching CodeChef submission history...',
      });
      submissions = await fetchCodeChefSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-CODECHEF] Fetched submissions:', totalCount);
    } else if (platform === 'vjudge') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching VJudge submission history...',
      });
      submissions = await fetchVjudgeSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-VJUDGE] Fetched submissions:', totalCount);
    } else if (platform === 'hackerrank') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching HackerRank submission history...',
      });
      submissions = await fetchHackerrankSubmissions(normalizedHandle, {
        includeSubmissionIds: fetchCodes,
      });
      totalCount = submissions.length;
      console.log('[NEUPC-HACKERRANK] Fetched submissions:', totalCount);
    } else if (platform === 'facebookhackercup') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching Hacker Cup submission history...',
      });
      submissions = await fetchHackerCupSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-FBHC] Fetched submissions:', totalCount);
    } else if (platform === 'cses') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching CSES submission history...',
      });
      submissions = await fetchCsesSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-CSES] Fetched submissions:', totalCount);
    } else if (platform === 'lightoj') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching LightOJ submission history...',
      });
      submissions = await fetchLightojSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-LIGHTOJ] Fetched submissions:', totalCount);
    } else if (platform === 'uva') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching UVa submission history from uHunt API...',
      });
      submissions = await fetchUvaSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-UVA] Fetched submissions:', totalCount);
    } else if (platform === 'toph') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching Toph submission history...',
      });
      submissions = await fetchTophSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-TOPH] Fetched submissions:', totalCount);
    } else if (platform === 'beecrowd') {
      sendProgress({
        phase: 'fetching_api',
        message: 'Fetching beecrowd submission history from runs page...',
      });
      submissions = await fetchBeecrowdSubmissions(normalizedHandle);
      totalCount = submissions.length;
      console.log('[NEUPC-BEECROWD] Loaded submissions:', totalCount);
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

    // Sync-everything mode processes all submissions, otherwise deduplicate
    if (!skipExisting) {
      existingSubmissionIds = new Set();
      sendProgress({
        phase: 'fetching_api',
        message:
          'Sync everything mode: importing all submissions (new + existing).',
      });
    } else {
      sendProgress({
        phase: 'fetching_api',
        message: quickMode
          ? 'Quick mode: fast import without code fetching (deduplicating)...'
          : 'Checking previously imported submissions...',
      });

      existingSubmissionIds = await fetchExistingSubmissionIds(
        platform,
        sourceCodeExtractionEnabled
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
    if (
      (platform === 'atcoder' ||
        platform === 'leetcode' ||
        platform === 'codechef' ||
        platform === 'vjudge' ||
        platform === 'hackerrank' ||
        platform === 'facebookhackercup' ||
        platform === 'spoj' ||
        platform === 'toph' ||
        platform === 'cses' ||
        platform === 'lightoj' ||
        platform === 'uva' ||
        platform === 'beecrowd') &&
      submissions
    ) {
      // API-backed platforms: process all fetched submissions in batches.
      // In full mode, each batch runs extraction (code + problem details)
      // before import, similar to Codeforces flow.
      console.log(
        `[NEUPC-${platform.toUpperCase()}] Processing ${submissions.length} submissions`
      );

      const shouldReplaceExistingTrack =
        platform === 'spoj' && fetchCodes && skipExisting;

      let candidateSubmissions = submissions.filter((submission) => {
        const submissionId = normalizeSubmissionIdForLookup(
          firstDefinedValue(submission?.submission_id, submission?.submissionId)
        );
        if (!submissionId) {
          return true;
        }
        return !existingSubmissionIds.has(submissionId);
      });

      // AC count shown in popup should represent fetched submissions for the
      // selected verdict filter, not only the remaining deduped candidates.
      const filteredFetchedSubmissions = submissions.filter((s) =>
        matchesVerdictFilter(s.verdict, effectiveVerdictFilter)
      );
      acSubmissions = filteredFetchedSubmissions.filter(
        (s) => normalizeVerdict(s.verdict) === 'AC'
      ).length;

      if (shouldReplaceExistingTrack) {
        candidateSubmissions = submissions;
        sendProgress({
          phase: 'fetching_api',
          message:
            'Full SPOJ import: replacing previous SPOJ track with freshly fetched submissions...',
        });
      }

      // SPOJ historical data can already exist with stale/missing fields.
      // If dedupe removes everything, fall back to a reconciliation pass so
      // existing submissions are reprocessed and backend stats/solves can heal.
      if (
        platform === 'spoj' &&
        fetchCodes &&
        skipExisting &&
        !shouldReplaceExistingTrack &&
        submissions.length > 0 &&
        candidateSubmissions.length === 0
      ) {
        candidateSubmissions = submissions;
        sendProgress({
          phase: 'fetching_api',
          message:
            'No new SPOJ submissions found. Re-syncing existing submissions to repair database records...',
        });
        console.warn(
          '[NEUPC-SPOJ] Dedupe returned zero candidates; running reconciliation import over fetched submissions.'
        );
      }

      console.log(
        `[NEUPC-${platform.toUpperCase()}] After dedup: ${candidateSubmissions.length} candidates (quick mode: ${quickMode})`
      );

      const filteredSubmissions = candidateSubmissions.filter((s) =>
        matchesVerdictFilter(s.verdict, effectiveVerdictFilter)
      );
      console.log(
        `[NEUPC-${platform.toUpperCase()}] After verdict filter: ${filteredSubmissions.length} filtered`
      );

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
              forceExtract,
              replaceExisting:
                platform === 'spoj' && fetchCodes && batchNum === 1,
            }
          );

          if (result.stopped) {
            break;
          }

          if (!result.success) {
            fatalImportError =
              result.error ||
              `Batch ${batchNum}/${totalBatches} failed for ${platform} import.`;
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
          forceExtract,
        });

        if (result.stopped) {
          break;
        }

        if (!result.success) {
          fatalImportError =
            result.error ||
            `Page ${page}/${totalPages} failed for ${platform} import.`;
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

    if (fatalImportError) {
      importState.phase = 'error';
      importState.isRunning = false;

      if (platform === 'codeforces') {
        await saveImportCheckpoint({
          phase: 'error',
          error: fatalImportError,
          currentPage: importState.currentPage,
          lastCompletedPage: importState.lastCompletedPage,
        });
      }

      console.error('[NEUPC] Fatal import error:', fatalImportError);

      sendProgress({
        phase: 'error',
        message: fatalImportError,
        acSubmissions,
        validation: leetcodeValidation,
      });

      return {
        success: false,
        error: fatalImportError,
        data: {
          stopped: false,
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
  else if (url.includes('hackerrank.com')) platform = 'hackerrank';
  else if (url.includes('lightoj.com')) platform = 'lightoj';
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
        source_code:
          firstDefinedValue(result.data.sourceCode, result.data.source_code) ||
          '',
        submitted_at: result.data.submittedAt || null,
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

function mapUvaVerdictCode(rawCode) {
  const code = Number.parseInt(rawCode, 10);
  if (!Number.isFinite(code)) return 'UNKNOWN';

  const verdictMap = {
    90: 'AC',
    80: 'PE',
    70: 'WA',
    60: 'CE',
    50: 'RE',
    40: 'RE',
    30: 'TLE',
    20: 'MLE',
    10: 'UNKNOWN',
    0: 'PENDING',
  };

  return verdictMap[code] || 'UNKNOWN';
}

function mapUvaLanguageCode(rawCode) {
  const code = Number.parseInt(rawCode, 10);
  if (!Number.isFinite(code)) return 'Unknown';

  const languageMap = {
    1: 'ANSI C',
    2: 'Java',
    3: 'C++',
    4: 'Pascal',
    5: 'C++11',
    6: 'Python',
    7: 'C++14',
    8: 'PyPy',
    9: 'C++17',
  };

  return languageMap[code] || 'Unknown';
}

function extractUvaSubmittedAtIso(submissionTuple) {
  if (!Array.isArray(submissionTuple)) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  for (let index = submissionTuple.length - 1; index >= 0; index--) {
    const numericValue = Number.parseInt(submissionTuple[index], 10);

    if (
      Number.isFinite(numericValue) &&
      numericValue >= 946684800 &&
      numericValue <= nowSeconds
    ) {
      const normalized = normalizeSubmissionTimestampToIso(numericValue);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

async function fetchUvaProblemMap() {
  const now = Date.now();
  if (uvaProblemMapCache && now < uvaProblemMapCacheExpiresAt) {
    return uvaProblemMapCache;
  }

  const response = await fetch('https://uhunt.onlinejudge.org/api/p');
  if (!response.ok) {
    throw new Error(`uHunt problem list request failed (${response.status})`);
  }

  const problemRows = await response.json();
  const problemMap = {};

  if (Array.isArray(problemRows)) {
    for (const row of problemRows) {
      if (!Array.isArray(row) || row.length < 3) continue;

      const internalId = String(row[0] ?? '').trim();
      if (!internalId) continue;

      problemMap[internalId] = {
        internalId,
        number: row[1] != null ? String(row[1]) : internalId,
        title: String(row[2] || '').trim(),
      };
    }
  }

  uvaProblemMapCache = problemMap;
  uvaProblemMapCacheExpiresAt = now + UVA_PROBLEM_MAP_CACHE_TTL_MS;

  return problemMap;
}

async function fetchUvaSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Fetching UVa submissions from uHunt API...',
  });

  const normalizedHandle = normalizeUvaHandleInput(handle);
  if (!normalizedHandle) {
    throw new Error(
      'UVa import requires a valid uHunt username, numeric uHunt ID, or uHunt profile URL.'
    );
  }

  let numericUserId = normalizedHandle;
  if (!/^\d+$/.test(numericUserId)) {
    const idResponse = await fetch(
      `https://uhunt.onlinejudge.org/api/uname2uid/${encodeURIComponent(numericUserId)}`
    );
    if (!idResponse.ok) {
      throw new Error('Unable to resolve UVa handle via uHunt API.');
    }

    const resolvedId = String(await idResponse.text()).trim();
    if (!/^\d+$/.test(resolvedId) || resolvedId === '0') {
      throw new Error('UVa user not found in uHunt API.');
    }

    numericUserId = resolvedId;
  }

  const subsResponse = await fetch(
    `https://uhunt.onlinejudge.org/api/subs-user/${encodeURIComponent(numericUserId)}`
  );
  if (!subsResponse.ok) {
    throw new Error('Unable to fetch UVa submissions from uHunt API.');
  }

  const payload = await subsResponse.json();
  const rawSubmissions = Array.isArray(payload?.subs) ? payload.subs : [];

  let problemMap = {};
  try {
    problemMap = await fetchUvaProblemMap();
  } catch (error) {
    console.warn(
      '[NEUPC-UVA] Failed to fetch uHunt problem metadata, continuing with fallback names:',
      error?.message || String(error)
    );
  }

  const submissions = [];
  for (const row of rawSubmissions) {
    if (!Array.isArray(row) || row.length < 3) continue;

    const submissionId = String(row[0] ?? '').trim();
    const internalProblemId = String(row[1] ?? '').trim();
    if (!submissionId || !internalProblemId) continue;

    const verdict = mapUvaVerdictCode(row[2]);
    const problem = problemMap[internalProblemId] || null;
    const problemNumber = String(problem?.number || internalProblemId).trim();
    const problemName =
      String(problem?.title || '').trim() || `UVa ${problemNumber}`;

    const runtimeCandidate = Number.parseInt(row[3], 10);
    const executionTimeMs =
      Number.isFinite(runtimeCandidate) &&
      runtimeCandidate >= 0 &&
      runtimeCandidate <= 10 * 60 * 1000
        ? runtimeCandidate
        : null;

    const memoryCandidate = Number.parseInt(row[4], 10);
    const memoryKb =
      Number.isFinite(memoryCandidate) &&
      memoryCandidate >= 0 &&
      memoryCandidate <= 5_000_000
        ? memoryCandidate
        : null;

    submissions.push({
      submission_id: submissionId,
      problem_id: problemNumber,
      problem_name: problemName,
      problem_url: `https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=${encodeURIComponent(internalProblemId)}`,
      submission_url: null,
      verdict,
      language: mapUvaLanguageCode(row[5]),
      execution_time_ms: executionTimeMs,
      memory_kb: memoryKb,
      submitted_at: extractUvaSubmittedAtIso(row),
      source_code: null,
      platform: 'uva',
      handle: numericUserId,
      tags: [],
      difficulty_rating: null,
    });
  }

  submissions.sort((a, b) => {
    const aId = Number.parseInt(String(a?.submission_id || ''), 10);
    const bId = Number.parseInt(String(b?.submission_id || ''), 10);
    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return bId - aId;
    }
    return String(b?.submission_id || '').localeCompare(
      String(a?.submission_id || '')
    );
  });

  sendProgress({
    phase: 'fetching_api',
    message: `Found ${submissions.length} UVa submissions via uHunt API.`,
  });

  return submissions;
}

function normalizeHackerCupClistToken(value, fallback = 'item') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function parseBooleanLike(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value !== 0;
  }

  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    '1',
    'true',
    'yes',
    'y',
    'attempted',
    'submitted',
    'solved',
    'ac',
  ].includes(normalized);
}

function isHackerCupClistProblemAttempted(problem = {}) {
  const explicitAttempt = firstDefinedValue(
    problem?.attempted,
    problem?.isAttempted,
    problem?.is_attempted,
    problem?.submitted,
    problem?.tried
  );

  if (explicitAttempt !== undefined && explicitAttempt !== null) {
    return parseBooleanLike(explicitAttempt);
  }

  const resultText = String(
    firstDefinedValue(problem?.result, problem?.status, '') || ''
  ).trim();
  if (resultText) {
    return true;
  }

  const solvedFlag = firstDefinedValue(problem?.solved, problem?.accepted);
  return parseBooleanLike(solvedFlag);
}

function normalizeHackerCupClistProblemVerdict(problem = {}) {
  const directVerdict = firstDefinedValue(
    problem?.verdict,
    problem?.statusCode,
    problem?.status_code
  );
  if (directVerdict) {
    const normalizedDirect = normalizeVerdict(directVerdict);
    if (normalizedDirect && normalizedDirect !== 'UNKNOWN') {
      return normalizedDirect;
    }
  }

  const resultText = String(
    firstDefinedValue(problem?.result, problem?.status, '') || ''
  ).trim();

  if (resultText) {
    const normalizedResult = resultText.toLowerCase();
    if (/^\+/.test(resultText) || /accepted|solved/.test(normalizedResult)) {
      return 'AC';
    }
    if (/pending|running|queue|judging|testing/.test(normalizedResult)) {
      return 'PENDING';
    }
    if (/partial/.test(normalizedResult)) {
      return 'PC';
    }
    if (/time limit|timeout/.test(normalizedResult)) {
      return 'TLE';
    }
    if (/memory limit/.test(normalizedResult)) {
      return 'MLE';
    }
    if (/runtime error/.test(normalizedResult)) {
      return 'RE';
    }
    if (/compile|compilation/.test(normalizedResult)) {
      return 'CE';
    }
    if (/wrong|failed|unsolved/.test(normalizedResult)) {
      return 'WA';
    }

    const normalizedFallback = normalizeVerdict(resultText);
    if (normalizedFallback && normalizedFallback !== 'UNKNOWN') {
      return normalizedFallback;
    }
  }

  const solvedFlag = firstDefinedValue(problem?.solved, problem?.accepted);
  if (parseBooleanLike(solvedFlag)) {
    return 'AC';
  }

  return 'WA';
}

async function fetchHackerCupSubmissionsFromClist(handle) {
  const normalizedHandle = normalizeHackerCupHandleInput(handle);
  if (!normalizedHandle || normalizedHandle === 'me') {
    return [];
  }

  const { apiUrl, token } = await getApiCredentials();
  if (!apiUrl || !token) {
    return [];
  }

  const query = new URLSearchParams({
    platform: 'facebookhackercup',
    handle: normalizedHandle,
    type: 'contests',
    limit: '10000',
  });

  const endpoint = `${apiUrl}/api/problem-solving/clist?${query.toString()}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.warn(
      '[NEUPC-FBHC] CLIST request failed:',
      error?.message || String(error)
    );
    return [];
  }

  if (!response.ok) {
    if (response.status !== 404) {
      console.warn(
        '[NEUPC-FBHC] CLIST request returned non-OK status:',
        response.status
      );
    }
    return [];
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    return [];
  }

  if (!payload?.success) {
    return [];
  }

  const contests = Array.isArray(payload?.data) ? payload.data : [];
  if (contests.length === 0) {
    return [];
  }

  const submissions = [];
  const seenSubmissionIds = new Set();

  for (let contestIndex = 0; contestIndex < contests.length; contestIndex++) {
    const contest = contests[contestIndex] || {};
    const problems = Array.isArray(contest?.problems) ? contest.problems : [];
    if (problems.length === 0) {
      continue;
    }

    const rawContestId = firstDefinedValue(
      contest?.platformContestId,
      contest?.platform_contest_id,
      contest?.contestId,
      contest?.contest_id,
      contest?.id,
      contest?.name,
      `contest_${contestIndex + 1}`
    );
    const contestId = rawContestId != null ? String(rawContestId) : null;
    const contestToken = normalizeHackerCupClistToken(
      contestId,
      `contest_${contestIndex + 1}`
    );
    const roundName = firstDefinedValue(
      contest?.name,
      contest?.contestName,
      contest?.title,
      contestId ? `Hacker Cup ${contestId}` : null,
      `Hacker Cup Contest ${contestIndex + 1}`
    );
    const contestUrl = firstDefinedValue(contest?.url, contest?.contestUrl);
    const contestDateIso = normalizeSubmissionTimestampToIso(
      firstDefinedValue(
        contest?.date,
        contest?.startDate,
        contest?.startTime,
        contest?.endDate,
        null
      )
    );

    for (let problemIndex = 0; problemIndex < problems.length; problemIndex++) {
      const problem = problems[problemIndex] || {};
      if (!isHackerCupClistProblemAttempted(problem)) {
        continue;
      }

      const verdict = normalizeHackerCupClistProblemVerdict(problem);
      const statusType =
        verdict === 'AC'
          ? 'solved'
          : verdict === 'PENDING'
            ? 'pending'
            : 'tried';

      const rawProblemId = firstDefinedValue(
        problem?.problemId,
        problem?.problem_id,
        problem?.id,
        problem?.label,
        problem?.code,
        problem?.short,
        problem?.name,
        `problem_${problemIndex + 1}`
      );

      const problemId = rawProblemId != null ? String(rawProblemId) : null;
      const problemToken = normalizeHackerCupClistToken(
        problemId,
        `problem_${problemIndex + 1}`
      );
      const syntheticId = `fbhc_clist_${contestToken}_${problemToken}_${statusType}`;

      if (!syntheticId || seenSubmissionIds.has(syntheticId)) {
        continue;
      }
      seenSubmissionIds.add(syntheticId);

      const problemName = firstDefinedValue(
        problem?.name,
        problem?.title,
        problem?.short,
        problem?.label,
        problemId,
        `Hacker Cup ${problemToken}`
      );

      const problemUrl = firstDefinedValue(
        problem?.url,
        problem?.problemUrl,
        contestUrl,
        null
      );

      const problemDateIso = normalizeSubmissionTimestampToIso(
        firstDefinedValue(
          problem?.date,
          problem?.submittedAt,
          problem?.submitted_at,
          problem?.time,
          null
        )
      );

      submissions.push({
        platform: 'facebookhackercup',
        handle: normalizedHandle,
        submission_id: syntheticId,
        submissionId: syntheticId,
        submission_url: null,
        submissionUrl: null,
        problem_id: problemId || problemToken,
        problemId: problemId || problemToken,
        problem_name:
          String(problemName || '').trim() || `Hacker Cup ${problemToken}`,
        problemName:
          String(problemName || '').trim() || `Hacker Cup ${problemToken}`,
        problem_url: problemUrl || null,
        problemUrl: problemUrl || null,
        verdict,
        language: 'Unknown',
        submitted_at: problemDateIso || contestDateIso || null,
        submittedAt: problemDateIso || contestDateIso || null,
        contest_id: contestId || contestToken,
        contestId: contestId || contestToken,
        roundName: roundName || null,
        round_name: roundName || null,
        source_code: null,
        execution_time_ms: null,
        memory_kb: null,
        synthetic_submission: true,
        syntheticSubmission: true,
        status_type: statusType,
        statusType,
      });
    }
  }

  return submissions;
}

async function fetchHackerCupSubmissions(handle) {
  const normalizedHandle = normalizeHackerCupHandleInput(handle) || 'me';

  sendProgress({
    phase: 'fetching_api',
    message:
      'Trying CLIST for Hacker Cup first, then falling back to Competition History crawl if needed...',
  });

  const submissions = [];
  const seenSubmissionIds = new Set();

  const appendSubmission = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const submissionId = normalizeSubmissionIdForLookup(
      firstDefinedValue(entry?.submission_id, entry?.submissionId)
    );
    if (!submissionId || seenSubmissionIds.has(submissionId)) {
      return false;
    }

    const problemId = firstDefinedValue(
      entry?.problem_id,
      entry?.problemId,
      null
    );
    const problemName = firstDefinedValue(
      entry?.problem_name,
      entry?.problemName,
      problemId,
      `Hacker Cup ${submissionId}`
    );

    const isSynthetic =
      entry?.synthetic_submission === true ||
      entry?.syntheticSubmission === true;
    const providedSubmissionUrl = firstDefinedValue(
      entry?.submission_url,
      entry?.submissionUrl
    );

    const submissionUrl =
      providedSubmissionUrl ||
      (isSynthetic
        ? null
        : `https://www.facebook.com/codingcompetitions/hacker-cup/submissions/${encodeURIComponent(
            submissionId
          )}`);

    const problemUrl = firstDefinedValue(
      entry?.problem_url,
      entry?.problemUrl,
      problemId
        ? `https://www.facebook.com/codingcompetitions/hacker-cup/problems/${encodeURIComponent(
            String(problemId)
          )}`
        : null
    );

    const submittedAt = firstDefinedValue(
      entry?.submitted_at,
      entry?.submittedAt,
      null
    );

    const contestId = firstDefinedValue(entry?.contest_id, entry?.contestId);
    const roundName = firstDefinedValue(entry?.roundName, entry?.round_name);

    const verdict = normalizeVerdict(
      firstDefinedValue(entry?.verdict, 'UNKNOWN')
    );
    const language = firstDefinedValue(entry?.language, 'Unknown');

    submissions.push({
      ...entry,
      platform: 'facebookhackercup',
      handle: firstDefinedValue(entry?.handle, normalizedHandle),
      submission_id: submissionId,
      submissionId,
      submission_url: submissionUrl,
      submissionUrl,
      problem_id: problemId,
      problemId,
      problem_name: problemName,
      problemName,
      problem_url: problemUrl,
      problemUrl,
      verdict,
      language,
      submitted_at: submittedAt,
      submittedAt,
      contest_id: contestId,
      contestId,
      roundName,
      round_name: roundName,
      source_code: firstDefinedValue(entry?.source_code, entry?.sourceCode),
      execution_time_ms: firstDefinedValue(
        entry?.execution_time_ms,
        entry?.executionTime
      ),
      memory_kb: firstDefinedValue(entry?.memory_kb, entry?.memoryUsed),
      synthetic_submission: isSynthetic,
      syntheticSubmission: isSynthetic,
      status_type: firstDefinedValue(entry?.status_type, entry?.statusType),
      statusType: firstDefinedValue(entry?.status_type, entry?.statusType),
    });

    seenSubmissionIds.add(submissionId);
    return true;
  };

  const clistSubmissions =
    await fetchHackerCupSubmissionsFromClist(normalizedHandle);

  if (Array.isArray(clistSubmissions) && clistSubmissions.length > 0) {
    for (const entry of clistSubmissions) {
      appendSubmission(entry);
    }

    submissions.sort((a, b) => {
      const aId = Number.parseInt(String(a?.submission_id || ''), 10);
      const bId = Number.parseInt(String(b?.submission_id || ''), 10);

      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return bId - aId;
      }

      return String(b?.submission_id || '').localeCompare(
        String(a?.submission_id || '')
      );
    });

    if (submissions.length > 0) {
      sendProgress({
        phase: 'fetching_api',
        message: `Collected ${submissions.length} Hacker Cup submissions from CLIST.`,
      });

      return submissions;
    }
  }

  sendProgress({
    phase: 'fetching_api',
    message:
      'CLIST did not return attempted Hacker Cup entries. Crawling Competition History pages...',
  });

  const initialUrls = [
    'https://www.facebook.com/codingcompetitions/profile',
    'https://facebook.com/codingcompetitions/profile',
    'https://m.facebook.com/codingcompetitions/profile',
    'https://web.facebook.com/codingcompetitions/profile',
    'https://www.facebook.com/codingcompetitions/hacker-cup',
    'https://facebook.com/codingcompetitions/hacker-cup',
    'https://m.facebook.com/codingcompetitions/hacker-cup',
    'https://web.facebook.com/codingcompetitions/hacker-cup',
  ];

  let tab = null;
  let tabCreatedByUs = false;

  const queryTabsByPattern = async (pattern) => {
    try {
      return await new Promise((resolve) => {
        browserAPI.tabs.query({ url: pattern }, (tabs) => {
          resolve(Array.isArray(tabs) ? tabs : []);
        });
      });
    } catch {
      return [];
    }
  };

  const waitForLoad = async () => {
    for (let i = 0; i < 45 && !importState.stopRequested; i++) {
      await sleep(700);

      const info = await getTabInfo(tab.id);
      if (!info) {
        return null;
      }

      const currentUrl = String(info.url || '');
      if (/\/login|checkpoint|auth|two[-_]?factor/i.test(currentUrl)) {
        throw new Error(
          'Hacker Cup requires an authenticated Facebook session. Open Facebook, sign in, then retry import.'
        );
      }

      if (
        info.status === 'complete' &&
        /^https?:/i.test(currentUrl) &&
        /facebook\.com\/codingcompetitions/i.test(currentUrl)
      ) {
        return info;
      }
    }

    return null;
  };

  const injectAndWait = async () => {
    const ok = await injectContentScript(tab.id, 'facebookhackercup');
    if (ok) {
      await sleep(700);
    }
    return ok;
  };

  const askTab = async (request) => {
    for (let i = 0; i < 16 && !importState.stopRequested; i++) {
      const response = await sendMessageToTab(tab.id, request);
      if (response?.success || response?.nonRetriable) {
        return response;
      }

      if (response?.pending || !response) {
        if (i === 6) {
          await injectAndWait();
        }
        await sleep(900);
        continue;
      }

      await sleep(700);
    }

    return null;
  };

  const normalizeSeedUrl = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return null;

    const decodeUriComponentSafe = (candidate) => {
      const text = String(candidate || '').trim();
      if (!text) return '';

      try {
        return decodeURIComponent(text);
      } catch {
        return text;
      }
    };

    const toParsedUrl = (candidate) => {
      try {
        return new URL(candidate, 'https://www.facebook.com');
      } catch {
        return null;
      }
    };

    let parsed = toParsedUrl(value);
    if (!parsed) {
      return null;
    }

    const isFacebookHost =
      /facebook\.com$/i.test(parsed.hostname) ||
      /\.facebook\.com$/i.test(parsed.hostname);
    if (!isFacebookHost) {
      return null;
    }

    if (/\/l\.php$/i.test(parsed.pathname)) {
      const redirectedCandidates = [
        parsed.searchParams.get('u'),
        parsed.searchParams.get('href'),
        parsed.searchParams.get('url'),
        parsed.searchParams.get('target'),
      ];

      for (const redirected of redirectedCandidates) {
        const decoded = decodeUriComponentSafe(redirected);
        const redirectedParsed = toParsedUrl(decoded);
        if (redirectedParsed) {
          parsed = redirectedParsed;
          break;
        }
      }
    }

    const normalizedPath =
      String(parsed.pathname || '').replace(/\/+$/, '') || '/';
    if (
      !/\/codingcompetitions\/(?:hacker-cup|profile)(?:\/|$)/i.test(
        normalizedPath
      )
    ) {
      return null;
    }

    const allowedSearchKeys = new Set([
      'view',
      'tab',
      'section',
      'problem',
      'task',
      'problem_id',
      'submission_id',
      'submissionId',
      'result_id',
      'resultId',
      'id',
    ]);
    const normalizedSearch = new URLSearchParams();
    parsed.searchParams.forEach((paramValue, paramKey) => {
      if (allowedSearchKeys.has(paramKey)) {
        normalizedSearch.append(paramKey, paramValue);
      }
    });

    parsed.pathname = normalizedPath;
    parsed.search = normalizedSearch.toString()
      ? `?${normalizedSearch.toString()}`
      : '';
    parsed.hash = '';

    return parsed.toString();
  };

  const crawlProblemStatusFallback = async ({
    seedUrls = [],
    maxPagesLimit = 80,
    stopAfterStagnantPages = 8,
  } = {}) => {
    const queue = [];
    const queued = new Set();
    const visited = new Set();

    const enqueue = (url) => {
      const normalized = normalizeSeedUrl(url);
      if (!normalized) return;
      if (visited.has(normalized) || queued.has(normalized)) return;
      queued.add(normalized);
      queue.push(normalized);
    };

    (Array.isArray(seedUrls) ? seedUrls : []).forEach(enqueue);

    let pagesScanned = 0;
    let recovered = 0;
    let stagnantPages = 0;
    const maxPages =
      Number.isFinite(maxPagesLimit) && maxPagesLimit > 0
        ? Math.min(maxPagesLimit, 220)
        : 80;

    while (
      queue.length > 0 &&
      !importState.stopRequested &&
      pagesScanned < maxPages
    ) {
      const current = queue.shift();
      queued.delete(current);
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      pagesScanned += 1;

      await new Promise((resolve) => {
        browserAPI.tabs.update(tab.id, { url: current }, () => resolve());
      });

      const loadedInfo = await waitForLoad();
      if (!loadedInfo) {
        continue;
      }

      await injectAndWait();

      const ping = await askTab({ action: 'ping' });
      if (ping?.pageUnavailable === true) {
        continue;
      }

      let statusResponse = null;
      for (
        let attempt = 0;
        attempt < 3 && !importState.stopRequested;
        attempt++
      ) {
        statusResponse = await askTab({
          action: 'extractProblemStatuses',
          handle: normalizedHandle,
          options: {
            expectedHandle: normalizedHandle,
          },
        });

        if (statusResponse?.success || statusResponse?.nonRetriable) {
          break;
        }

        await sleep(900);
        await injectAndWait();
      }

      if (!statusResponse?.success) {
        continue;
      }

      const statusData = statusResponse.data || {};
      const statusSubmissions = Array.isArray(statusData.submissions)
        ? statusData.submissions
        : [];
      const contestLinks = Array.isArray(statusData.contestLinks)
        ? statusData.contestLinks
        : [];
      const queueSizeBeforeEnqueue = queue.length;

      let addedOnPage = 0;
      for (const entry of statusSubmissions) {
        if (appendSubmission(entry)) {
          addedOnPage += 1;
          recovered += 1;
        }
      }

      contestLinks.forEach(enqueue);
      const discoveredNewLinks = Math.max(
        0,
        queue.length - queueSizeBeforeEnqueue
      );

      if (addedOnPage === 0 && discoveredNewLinks === 0) {
        stagnantPages += 1;
      } else {
        stagnantPages = 0;
      }

      sendProgress({
        phase: 'fetching_api',
        message: `Hacker Cup crawl page ${pagesScanned}: +${addedOnPage}, +${discoveredNewLinks} links, total ${submissions.length}`,
      });

      if (stagnantPages >= stopAfterStagnantPages) {
        break;
      }
    }

    return { recovered, pagesScanned };
  };

  try {
    const existingTabs = [
      ...(await queryTabsByPattern(
        '*://*.facebook.com/codingcompetitions/profile*'
      )),
      ...(await queryTabsByPattern(
        '*://www.facebook.com/codingcompetitions/profile*'
      )),
      ...(await queryTabsByPattern(
        '*://facebook.com/codingcompetitions/profile*'
      )),
      ...(await queryTabsByPattern(
        '*://m.facebook.com/codingcompetitions/profile*'
      )),
      ...(await queryTabsByPattern(
        '*://web.facebook.com/codingcompetitions/profile*'
      )),
      ...(await queryTabsByPattern(
        '*://*.facebook.com/codingcompetitions/hacker-cup*'
      )),
      ...(await queryTabsByPattern(
        '*://www.facebook.com/codingcompetitions/hacker-cup*'
      )),
      ...(await queryTabsByPattern(
        '*://facebook.com/codingcompetitions/hacker-cup*'
      )),
      ...(await queryTabsByPattern(
        '*://m.facebook.com/codingcompetitions/hacker-cup*'
      )),
      ...(await queryTabsByPattern(
        '*://web.facebook.com/codingcompetitions/hacker-cup*'
      )),
    ];

    const preferredExistingTab =
      existingTabs.find((candidate) =>
        /facebook\.com\/codingcompetitions\/profile/i.test(
          String(candidate.url || '')
        )
      ) ||
      existingTabs.find(
        (candidate) =>
          /facebook\.com\/codingcompetitions\/hacker-cup/i.test(
            String(candidate.url || '')
          ) && /\/\d{4}\//i.test(String(candidate.url || ''))
      ) ||
      existingTabs.find((candidate) =>
        /facebook\.com\/codingcompetitions\/hacker-cup/i.test(
          String(candidate.url || '')
        )
      ) ||
      existingTabs.find((candidate) =>
        /facebook\.com\/codingcompetitions/i.test(String(candidate.url || ''))
      );

    if (preferredExistingTab) {
      tab = preferredExistingTab;
      tabCreatedByUs = false;
    }

    if (!tab) {
      tab = await createTab(initialUrls[0]);
      tabCreatedByUs = true;
    }

    let startUrl = null;
    let lastLoadedUrl = null;
    const candidateUrls = [];
    if (!tabCreatedByUs) {
      const tabUrl = String(tab.url || '').trim();
      if (tabUrl) {
        candidateUrls.push(tabUrl);
      }
    }
    candidateUrls.push(...initialUrls);

    for (const candidateUrl of candidateUrls) {
      if (importState.stopRequested) {
        break;
      }

      if (!candidateUrl) {
        continue;
      }

      await new Promise((resolve) => {
        browserAPI.tabs.update(tab.id, { url: candidateUrl }, () => resolve());
      });

      const loadedInfo = await waitForLoad();
      if (!loadedInfo) {
        continue;
      }
      lastLoadedUrl = String(loadedInfo.url || candidateUrl || '');

      const injected = await injectAndWait();
      const ping = await askTab({ action: 'ping' });
      const loadedUrl = String(loadedInfo.url || candidateUrl || '');
      const onCodingCompetitionsUrl =
        /facebook\.com\/codingcompetitions\/(?:hacker-cup|profile)/i.test(
          loadedUrl
        );
      const pageUnavailable = ping?.pageUnavailable === true;

      if (pageUnavailable) {
        console.warn('[NEUPC-FBHC] Skipping unavailable Hacker Cup URL', {
          loadedUrl,
        });
        continue;
      }

      if (ping?.success || onCodingCompetitionsUrl) {
        if (!ping?.success) {
          console.warn(
            '[NEUPC-FBHC] Ping not ready yet, proceeding with loaded Hacker Cup URL',
            {
              loadedUrl,
              injected,
            }
          );
        }
        startUrl = String(loadedInfo.url || candidateUrl);
        break;
      }
    }

    if (!startUrl) {
      throw new Error(
        `Could not open Hacker Cup pages. Open https://www.facebook.com/codingcompetitions/profile (or a Hacker Cup page) while signed in and retry. Last loaded URL: ${lastLoadedUrl || 'none'}`
      );
    }

    if (!importState.stopRequested) {
      sendProgress({
        phase: 'fetching_api',
        message:
          'Crawling attempted Hacker Cup entries from Competition History...',
      });

      const targetedCrawl = await crawlProblemStatusFallback({
        seedUrls: [startUrl],
        maxPagesLimit: 70,
        stopAfterStagnantPages: 6,
      });
      let recoveredTotal = targetedCrawl.recovered;
      let pagesScannedTotal = targetedCrawl.pagesScanned;

      if (recoveredTotal === 0 && !importState.stopRequested) {
        sendProgress({
          phase: 'fetching_api',
          message:
            'No attempted entries found in targeted pass. Running limited fallback crawl...',
        });

        const fallbackSeedUrls = [startUrl, ...candidateUrls, ...initialUrls];
        const fallbackCrawl = await crawlProblemStatusFallback({
          seedUrls: fallbackSeedUrls,
          maxPagesLimit: 40,
          stopAfterStagnantPages: 6,
        });

        recoveredTotal += fallbackCrawl.recovered;
        pagesScannedTotal += fallbackCrawl.pagesScanned;
      }

      if (recoveredTotal > 0) {
        sendProgress({
          phase: 'fetching_api',
          message: `Recovered ${recoveredTotal} Hacker Cup entries from ${pagesScannedTotal} pages.`,
        });
      }
    }
  } finally {
    if (tab && tabCreatedByUs) {
      await removeTab(tab.id);
    }
  }

  if (submissions.length === 0) {
    const storageData = await getLocalStorageData(['cachedSubmissions']);
    const cachedSubmissions = Array.isArray(
      storageData?.cachedSubmissions?.facebookhackercup
    )
      ? storageData.cachedSubmissions.facebookhackercup
      : [];

    for (const entry of cachedSubmissions) {
      appendSubmission(entry);
    }
  }

  submissions.sort((a, b) => {
    const aId = Number.parseInt(String(a?.submission_id || ''), 10);
    const bId = Number.parseInt(String(b?.submission_id || ''), 10);

    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return bId - aId;
    }

    return String(b?.submission_id || '').localeCompare(
      String(a?.submission_id || '')
    );
  });

  if (submissions.length === 0) {
    throw new Error(
      'No Hacker Cup submissions or problem statuses found. Open https://www.facebook.com/codingcompetitions/profile, scroll to Competition History, then retry sync.'
    );
  }

  sendProgress({
    phase: 'fetching_api',
    message: `Collected ${submissions.length} Hacker Cup submissions.`,
  });

  return submissions;
}

async function fetchBeecrowdSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Fetching beecrowd submissions from runs page...',
  });

  const normalizedHandle = normalizeBeecrowdHandleInput(handle);
  if (!normalizedHandle) {
    throw new Error(
      'beecrowd import requires a valid profile ID, username, or profile URL.'
    );
  }

  const normalizedHandleToken = normalizedHandle.toLowerCase();
  const seenSubmissionIds = new Set();
  const submissions = [];

  let startUrl = null;
  let relaxHandleMatch = false;
  const appendSubmission = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const submissionId = normalizeSubmissionIdForLookup(
      firstDefinedValue(entry?.submission_id, entry?.submissionId)
    );
    if (!submissionId || seenSubmissionIds.has(submissionId)) {
      return false;
    }

    const entryHandle = normalizeBeecrowdHandleInput(
      firstDefinedValue(entry?.handle, '')
    );
    if (entryHandle) {
      const requestedIsNumeric = /^\d+$/.test(normalizedHandleToken);
      const entryIsNumeric = /^\d+$/.test(entryHandle);
      const shouldEnforceHandleMatch =
        (requestedIsNumeric && entryIsNumeric) ||
        (!requestedIsNumeric && !entryIsNumeric);

      // If the user is on a filtered runs page, the URL contains '?'
      // which means they applied a filter. In that case, trust the row.
      const isFilteredPage = startUrl && startUrl.includes('?');

      if (
        shouldEnforceHandleMatch &&
        !relaxHandleMatch &&
        !isFilteredPage &&
        entryHandle.toLowerCase() !== normalizedHandleToken
      ) {
        return false;
      }
    }

    const problemId = firstDefinedValue(
      entry?.problem_id,
      entry?.problemId,
      null
    );

    let problemUrl = firstDefinedValue(
      entry?.problem_url,
      entry?.problemUrl,
      null
    );
    if (!problemUrl && problemId) {
      problemUrl = `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(String(problemId))}`;
    }

    let submissionUrl = firstDefinedValue(
      entry?.submission_url,
      entry?.submissionUrl,
      null
    );
    if (!submissionUrl) {
      submissionUrl = `https://judge.beecrowd.com/en/runs/code/${submissionId}`;
    }

    const submittedAt = firstDefinedValue(
      entry?.submitted_at,
      entry?.submittedAt,
      null
    );
    const verdict = normalizeVerdict(
      firstDefinedValue(entry?.verdict, 'UNKNOWN')
    );

    submissions.push({
      ...entry,
      platform: 'beecrowd',
      handle: entryHandle || normalizedHandle,
      submission_id: submissionId,
      submissionId,
      submission_url: submissionUrl,
      submissionUrl,
      problem_id: problemId,
      problemId,
      problem_url: problemUrl,
      problemUrl,
      problem_name: firstDefinedValue(
        entry?.problem_name,
        entry?.problemName,
        problemId
      ),
      problemName: firstDefinedValue(
        entry?.problem_name,
        entry?.problemName,
        problemId
      ),
      verdict,
      submitted_at: submittedAt,
      submittedAt,
    });

    seenSubmissionIds.add(submissionId);
    return true;
  };

  const beecrowdHostPattern =
    /(?:beecrowd\.com\.br|judge\.beecrowd\.com|urionlinejudge\.com\.br)/i;
  const initialUrls = [
    'https://judge.beecrowd.com/en/runs',
    'https://www.beecrowd.com.br/judge/en/runs',
    'https://beecrowd.com.br/judge/en/runs',
  ];

  let tab = null;
  let tabCreatedByUs = false;

  const waitForLoad = async () => {
    for (let i = 0; i < 40 && !importState.stopRequested; i++) {
      await sleep(800);
      const info = await getTabInfo(tab.id);
      if (!info) return null;

      const currentUrl = String(info.url || '');
      if (/\/login|\/auth|sign[-_]?in/i.test(currentUrl)) {
        throw new Error(
          'beecrowd requires login. Open judge.beecrowd.com, sign in, then retry import.'
        );
      }

      if (
        info.status === 'complete' &&
        currentUrl.startsWith('http') &&
        beecrowdHostPattern.test(currentUrl)
      ) {
        return info;
      }
    }

    return null;
  };

  const injectAndWait = async () => {
    const ok = await injectContentScript(tab.id, 'beecrowd');
    if (ok) {
      await sleep(700);
    }
    return ok;
  };

  const askTab = async (request) => {
    for (let i = 0; i < 14 && !importState.stopRequested; i++) {
      const response = await sendMessageToTab(tab.id, request);
      if (response?.success) {
        return response;
      }
      if (response?.nonRetriable) {
        return response;
      }
      if (response?.pending || !response) {
        if (i === 5) {
          await injectAndWait();
        }
        await sleep(900);
        continue;
      }

      if (i === 5) {
        await injectAndWait();
      }
      await sleep(700);
    }

    return null;
  };

  const extractSubmissionsPageDirectly = async () => {
    if (!tab?.id || !browserAPI.scripting?.executeScript) {
      return null;
    }

    try {
      const results = await browserAPI.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const normalizeWhitespace = (value) =>
            String(value || '')
              .replace(/\u00A0/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

          const textOf = (node) =>
            normalizeWhitespace(node?.textContent || node?.innerText || '');

          const toAbsoluteUrl = (value) => {
            const raw = String(value || '').trim();
            if (!raw) return null;

            try {
              return new URL(raw, window.location.href).toString();
            } catch {
              return null;
            }
          };

          const parseSubmissionId = (value) => {
            const raw = String(value || '').trim();
            if (!raw) return null;

            const fromRunsUrl = raw.match(/\/runs\/(?:code\/)?(\d+)/i)?.[1];
            if (fromRunsUrl) return fromRunsUrl;

            const fromNumber = raw.match(/\b(\d{4,})\b/)?.[1];
            return fromNumber || null;
          };

          const normalizeVerdict = (value) => {
            const normalized = String(value || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();

            if (!normalized) return 'UNKNOWN';
            if (
              normalized.includes('ACCEPTED') ||
              normalized.includes('ACEITO')
            ) {
              return 'AC';
            }
            if (
              normalized.includes('WRONG ANSWER') ||
              normalized.includes('RESPOSTA ERRADA')
            ) {
              return 'WA';
            }
            if (normalized.includes('TIME LIMIT')) return 'TLE';
            if (normalized.includes('MEMORY LIMIT')) return 'MLE';
            if (normalized.includes('RUNTIME ERROR')) return 'RE';
            if (normalized.includes('COMPILATION ERROR')) return 'CE';
            if (normalized.includes('PRESENTATION ERROR')) return 'PE';
            if (
              normalized.includes('PENDING') ||
              normalized.includes('RUNNING')
            ) {
              return 'PENDING';
            }

            return normalized;
          };

          const parseDurationToMs = (value) => {
            const text = normalizeWhitespace(value).toLowerCase();
            if (!text) return null;

            const match = text.match(
              /([0-9]+(?:[.,][0-9]+)?)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?)?/
            );
            if (!match) return null;

            const amount = Number.parseFloat(
              String(match[1]).replace(',', '.')
            );
            if (!Number.isFinite(amount)) return null;

            const unit = String(match[2] || '').toLowerCase();
            if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
              return Math.round(amount);
            }

            if (unit === 'm' || unit.startsWith('min')) {
              return Math.round(amount * 60 * 1000);
            }

            return Math.round(amount * 1000);
          };

          const parseMemoryToKb = (value) => {
            const text = normalizeWhitespace(value).toLowerCase();
            if (!text) return null;

            const match = text.match(
              /([0-9]+(?:[.,][0-9]+)?)\s*(kb|kib|mb|mib|gb|gib|b)?/
            );
            if (!match) return null;

            const amount = Number.parseFloat(
              String(match[1]).replace(',', '.')
            );
            if (!Number.isFinite(amount)) return null;

            const unit = String(match[2] || 'kb').toLowerCase();
            if (unit === 'gb' || unit === 'gib')
              return Math.round(amount * 1024 * 1024);
            if (unit === 'mb' || unit === 'mib')
              return Math.round(amount * 1024);
            if (unit === 'b') return Math.round(amount / 1024);
            return Math.round(amount);
          };

          const parseSubmittedAt = (value) => {
            const text = normalizeWhitespace(value);
            if (!text) return null;

            const ymdMatch = text.match(
              /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
            );
            if (ymdMatch) {
              const year = Number.parseInt(ymdMatch[1], 10);
              const month = Number.parseInt(ymdMatch[2], 10);
              const day = Number.parseInt(ymdMatch[3], 10);
              const hour = Number.parseInt(ymdMatch[4] || '0', 10);
              const minute = Number.parseInt(ymdMatch[5] || '0', 10);
              const second = Number.parseInt(ymdMatch[6] || '0', 10);

              const millis = Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                0
              );
              if (Number.isFinite(millis)) {
                const dt = new Date(millis);
                if (Number.isFinite(dt.getTime())) {
                  return dt.toISOString();
                }
              }
            }

            const dmyMatch = text.match(
              /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
            );
            if (dmyMatch) {
              const day = Number.parseInt(dmyMatch[1], 10);
              const month = Number.parseInt(dmyMatch[2], 10);
              const yearRaw = Number.parseInt(dmyMatch[3], 10);
              const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
              const hour = Number.parseInt(dmyMatch[4] || '0', 10);
              const minute = Number.parseInt(dmyMatch[5] || '0', 10);
              const second = Number.parseInt(dmyMatch[6] || '0', 10);

              const millis = Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                0
              );
              if (Number.isFinite(millis)) {
                const dt = new Date(millis);
                if (Number.isFinite(dt.getTime())) {
                  return dt.toISOString();
                }
              }
            }

            // Handle "M/D/YY, H:MM AM/PM" (beecrowd locale date format)
            const mdyAmPmMatch = text.match(
              /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
            );
            if (mdyAmPmMatch) {
              const month = Number.parseInt(mdyAmPmMatch[1], 10);
              const day = Number.parseInt(mdyAmPmMatch[2], 10);
              const yearRaw = Number.parseInt(mdyAmPmMatch[3], 10);
              const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
              let hour = Number.parseInt(mdyAmPmMatch[4], 10);
              const minute = Number.parseInt(mdyAmPmMatch[5], 10);
              const second = Number.parseInt(mdyAmPmMatch[6] || '0', 10);
              const ampm = (mdyAmPmMatch[7] || '').toUpperCase();
              if (ampm === 'PM' && hour < 12) hour += 12;
              if (ampm === 'AM' && hour === 12) hour = 0;
              const millis = Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second,
                0
              );
              if (Number.isFinite(millis)) {
                const dt = new Date(millis);
                if (Number.isFinite(dt.getTime())) return dt.toISOString();
              }
            }

            const parsed = Date.parse(text);
            if (Number.isFinite(parsed)) {
              return new Date(parsed).toISOString();
            }

            return null;
          };

          const submissions = [];
          const seenSubmissionIds = new Set();
          const rows = Array.from(
            document.querySelectorAll('table tbody tr, table tr')
          );

          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length < 5) continue;

            const runLink =
              row.querySelector('a[href*="/runs/code/"]') ||
              row.querySelector('a[href*="/runs/"]');
            if (!runLink) continue;

            const runHref = runLink.getAttribute('href') || runLink.href || '';
            const submissionId =
              parseSubmissionId(runHref) || parseSubmissionId(textOf(cells[0]));
            if (!submissionId || seenSubmissionIds.has(submissionId)) {
              continue;
            }

            const problemIdLink =
              row.querySelector('td.tiny a[href*="/problems/view/"]') ||
              row.querySelector('a[href*="/problems/view/"]') ||
              row.querySelector('a[href*="/problems/"]');
            const problemNameLink =
              row.querySelector('td.wide a[href*="/problems/view/"]') ||
              problemIdLink;

            const problemHref =
              problemNameLink?.getAttribute('href') ||
              problemNameLink?.href ||
              '';
            const problemId =
              problemHref.match(/\/problems\/(?:view\/)?([^/?#]+)/i)?.[1] ||
              textOf(problemIdLink) ||
              null;
            const problemName = textOf(problemNameLink) || problemId;

            const answerCell =
              row.querySelector('td.answer') ||
              row.querySelector('td[class*="answer"]') ||
              cells[4] ||
              null;
            const languageCell =
              row.querySelector('td.semi-wide-15') ||
              row.querySelector('td[class*="language"]') ||
              cells[5] ||
              null;
            const runtimeCell =
              cells.find((cell) =>
                /[0-9][0-9.,]*\s*(ms|msec|millisecond|s|sec|second)/i.test(
                  textOf(cell)
                )
              ) || (cells.length >= 7 ? cells[6] : null);
            const memoryCell = cells.find((cell) =>
              /[0-9][0-9.,]*\s*(kb|kib|mb|mib|gb|gib|b)/i.test(textOf(cell))
            );
            const dateCell = cells.length >= 8 ? cells[cells.length - 1] : null;

            const handleLink =
              row.querySelector('a[href*="/profile/"]') ||
              row.querySelector('a[href*="/users/"]');
            const handleHref =
              handleLink?.getAttribute('href') || handleLink?.href || '';
            const handle =
              handleHref.match(/\/profile\/([^/?#]+)/i)?.[1] ||
              handleHref.match(/\/users\/([^/?#]+)/i)?.[1] ||
              null;

            const submissionUrl =
              toAbsoluteUrl(runHref) ||
              `https://judge.beecrowd.com/en/runs/code/${submissionId}`;
            const problemUrl =
              toAbsoluteUrl(problemHref) ||
              (problemId
                ? `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(
                    String(problemId)
                  )}`
                : null);

            const answerClass = answerCell
              ? String(answerCell.className || '')
              : '';
            const verdictFromClass = /\ba-1\b/.test(answerClass)
              ? 'AC'
              : /\ba-2\b/.test(answerClass)
                ? 'PE'
                : /\ba-3\b/.test(answerClass)
                  ? 'TLE'
                  : /\ba-4\b/.test(answerClass)
                    ? 'MLE'
                    : /\ba-5\b/.test(answerClass)
                      ? 'PE'
                      : /\ba-6\b/.test(answerClass)
                        ? 'WA'
                        : /\ba-7\b/.test(answerClass)
                          ? 'RE'
                          : /\ba-8\b/.test(answerClass)
                            ? 'CE'
                            : /\ba-9\b/.test(answerClass)
                              ? 'CE'
                              : null;
            const verdictRaw =
              verdictFromClass || textOf(answerCell) || textOf(cells[4]);
            const language = textOf(languageCell) || 'Unknown';
            const executionTime = parseDurationToMs(textOf(runtimeCell));
            const memoryUsed = parseMemoryToKb(textOf(memoryCell));
            const submittedAt = parseSubmittedAt(textOf(dateCell));

            seenSubmissionIds.add(submissionId);
            submissions.push({
              platform: 'beecrowd',
              handle,
              problemId,
              problemName,
              problemUrl,
              submissionId,
              submissionUrl,
              verdict: normalizeVerdict(verdictRaw || 'UNKNOWN'),
              language,
              executionTime,
              memoryUsed,
              submittedAt,
              sourceCode: null,
              problem_id: problemId,
              problem_name: problemName,
              problem_url: problemUrl,
              submission_id: submissionId,
              submission_url: submissionUrl,
              source_code: null,
              execution_time_ms: executionTime,
              memory_kb: memoryUsed,
              submitted_at: submittedAt,
            });
          }

          if (submissions.length === 0) {
            const html = String(document.documentElement?.innerHTML || '');
            const runPattern =
              /\/runs\/(?:code\/)?(\d{4,})(?:[/?#][^"'\s<]*)?/gi;
            let match;
            let scans = 0;

            while ((match = runPattern.exec(html)) != null && scans < 1500) {
              scans += 1;
              const submissionId = String(match[1] || '').trim();
              if (!submissionId || seenSubmissionIds.has(submissionId)) {
                continue;
              }

              const start = Math.max(0, match.index - 700);
              const end = Math.min(html.length, match.index + 900);
              const chunk = html.slice(start, end);
              const problemId =
                chunk.match(/\/problems\/(?:view\/)?([^/?#"'\s<]+)/i)?.[1] ||
                null;
              const verdictRaw =
                chunk.match(
                  /(accepted|wrong\s*answer|time\s*limit\s*exceeded|memory\s*limit\s*exceeded|runtime\s*error|compilation\s*error|pending|aceito|resposta\s*errada)/i
                )?.[1] || 'UNKNOWN';

              const submissionUrl = `https://judge.beecrowd.com/en/runs/code/${submissionId}`;
              const problemUrl = problemId
                ? `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(
                    String(problemId)
                  )}`
                : null;

              seenSubmissionIds.add(submissionId);
              submissions.push({
                platform: 'beecrowd',
                handle: null,
                problemId,
                problemName: problemId,
                problemUrl,
                submissionId,
                submissionUrl,
                verdict: normalizeVerdict(verdictRaw),
                language: 'Unknown',
                executionTime: null,
                memoryUsed: null,
                submittedAt: null,
                sourceCode: null,
                problem_id: problemId,
                problem_name: problemId,
                problem_url: problemUrl,
                submission_id: submissionId,
                submission_url: submissionUrl,
                source_code: null,
                execution_time_ms: null,
                memory_kb: null,
                submitted_at: null,
              });
            }
          }

          const nextPageUrl = (() => {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            for (const anchor of anchors) {
              const rawHref = String(anchor.getAttribute('href') || '').trim();
              if (
                !rawHref ||
                rawHref.startsWith('#') ||
                /^javascript:/i.test(rawHref)
              ) {
                continue;
              }
              if (anchor.closest('.disabled, [aria-disabled="true"]')) {
                continue;
              }

              let absolute;
              try {
                absolute = new URL(rawHref, window.location.href);
              } catch {
                continue;
              }

              if (!/\/runs(?:\/|$)/i.test(String(absolute.pathname || ''))) {
                continue;
              }

              const rel = String(
                anchor.getAttribute('rel') || ''
              ).toLowerCase();
              const text = normalizeWhitespace(
                anchor.textContent || ''
              ).toLowerCase();
              const title = String(
                anchor.getAttribute('title') || ''
              ).toLowerCase();
              if (
                rel.includes('next') ||
                /(^|\s)(next|newer|>|>>|›|»|proxima|pr[oó]xima)(\s|$)/i.test(
                  text
                ) ||
                /next|proxima|pr[oó]xima/i.test(title)
              ) {
                return absolute.toString();
              }
            }

            return null;
          })();

          if (submissions.length === 0) {
            const bodyText = normalizeWhitespace(
              document.body?.innerText || ''
            ).toLowerCase();
            if (
              /(cloudflare|just a moment|checking your browser|cf_chl|cf-mitigated)/i.test(
                bodyText
              )
            ) {
              return {
                success: false,
                nonRetriable: true,
                error:
                  'beecrowd challenge page detected. Open judge.beecrowd.com while logged in and retry.',
              };
            }

            if (/loading|carregando/.test(bodyText)) {
              return {
                success: false,
                pending: true,
                error: 'beecrowd runs page still loading',
              };
            }
          }

          submissions.sort((a, b) => {
            const aId = Number.parseInt(String(a?.submission_id || ''), 10);
            const bId = Number.parseInt(String(b?.submission_id || ''), 10);
            if (Number.isFinite(aId) && Number.isFinite(bId)) {
              return bId - aId;
            }
            return String(b?.submission_id || '').localeCompare(
              String(a?.submission_id || '')
            );
          });

          return {
            success: true,
            data: {
              submissions,
              nextPageUrl,
              currentUrl: window.location.href,
            },
            error: null,
          };
        },
      });

      const directResult = results?.[0]?.result;
      return directResult && typeof directResult === 'object'
        ? directResult
        : null;
    } catch (error) {
      console.warn(
        '[NEUPC] Beecrowd direct extraction fallback failed:',
        error?.message
      );
      return null;
    }
  };

  try {
    let existingTabs = [];
    try {
      existingTabs = await new Promise((resolve) => {
        browserAPI.tabs.query({ url: '*://*.beecrowd.com.br/*' }, (t1) => {
          browserAPI.tabs.query({ url: '*://judge.beecrowd.com/*' }, (t2) => {
            browserAPI.tabs.query(
              { url: '*://urionlinejudge.com.br/*' },
              (t3) => {
                resolve([...(t1 || []), ...(t2 || []), ...(t3 || [])]);
              }
            );
          });
        });
      });
    } catch {
      existingTabs = [];
    }

    const scoreRunsTab = (tab) => {
      const tabUrl = String(tab?.url || '');
      if (!/\/runs/i.test(tabUrl)) {
        return Number.NEGATIVE_INFINITY;
      }

      let score = 0;

      // Prefer runs listing pages over single submission pages.
      if (/\/runs\/(?:code\/)?\d+/i.test(tabUrl)) {
        score += 10;
      } else if (/\/runs(?:\/|$|\?)/i.test(tabUrl)) {
        score += 100;
      }

      // Prefer user-filtered pages when available.
      if (tabUrl.includes('?')) {
        score += 30;
      }

      if (tab?.active) {
        score += 20;
      }
      if (tab?.pinned) {
        score += 2;
      }

      if (Number.isFinite(tab?.lastAccessed)) {
        score += tab.lastAccessed / 1e12;
      }

      return score;
    };

    const runsTab = (existingTabs || [])
      .filter((t) => /\/runs/i.test(String(t?.url || '')))
      .sort((a, b) => scoreRunsTab(b) - scoreRunsTab(a))[0];

    if (runsTab) {
      tab = runsTab;
      tabCreatedByUs = false;

      const loadedInfo = await waitForLoad();
      if (loadedInfo) {
        const injected = await injectAndWait();
        if (injected) {
          const ping = await askTab({ action: 'ping' });
          if (ping?.success) {
            const loadedUrl = String(loadedInfo.url || runsTab.url || '');
            const isRunsListingPage =
              /\/runs(?:\/|$|\?)/i.test(loadedUrl) &&
              !/\/runs\/(?:code\/)?\d+/i.test(loadedUrl);

            if (isRunsListingPage) {
              startUrl = loadedUrl;
            }
          }
        }
      }
    }

    if (!startUrl) {
      if (!tab) {
        tab = await createTab(initialUrls[0]);
        tabCreatedByUs = true;
      }

      for (const candidateUrl of initialUrls) {
        if (importState.stopRequested) break;

        await new Promise((resolve) => {
          browserAPI.tabs.update(tab.id, { url: candidateUrl }, () =>
            resolve()
          );
        });

        const loadedInfo = await waitForLoad();
        if (!loadedInfo) {
          continue;
        }

        const injected = await injectAndWait();
        if (!injected) {
          continue;
        }

        const ping = await askTab({ action: 'ping' });
        if (ping?.success) {
          startUrl = String(loadedInfo.url || candidateUrl);
          break;
        }
      }
    }

    if (!startUrl) {
      throw new Error(
        'Could not open beecrowd. Please go to judge.beecrowd.com, navigate to your Runs, leave the tab open, and retry.'
      );
    }

    const visited = new Set();
    let currentUrl = startUrl;
    let pageCount = 0;
    const maxPages = 300;

    while (currentUrl && !importState.stopRequested && pageCount < maxPages) {
      if (visited.has(currentUrl)) {
        break;
      }
      visited.add(currentUrl);
      pageCount += 1;

      await new Promise((resolve) => {
        browserAPI.tabs.update(tab.id, { url: currentUrl }, () => resolve());
      });

      const pageInfo = await waitForLoad();
      if (!pageInfo) {
        break;
      }

      await injectAndWait();

      let pageResponse = null;
      for (
        let attempt = 0;
        attempt < 3 && !importState.stopRequested;
        attempt++
      ) {
        pageResponse = await askTab({
          action: 'extractSubmissionsPage',
          handle: normalizedHandle,
          includeMeta: true,
          options: {
            expectedHandle: normalizedHandle,
            filterByHandle: false,
          },
        });

        if (pageResponse?.success || pageResponse?.nonRetriable) {
          break;
        }

        await sleep(1000);
        await injectAndWait();
      }

      if (!pageResponse?.success) {
        const directResponse = await extractSubmissionsPageDirectly();
        if (directResponse?.success || directResponse?.nonRetriable) {
          pageResponse = directResponse;
        }
      }

      if (!pageResponse?.success) {
        if (pageResponse?.nonRetriable) {
          throw new Error(
            pageResponse.error ||
              'Failed to extract submissions from beecrowd runs page.'
          );
        }
        break;
      }

      let pageData = pageResponse.data || {};
      let pageSubmissions = Array.isArray(pageData.submissions)
        ? pageData.submissions
        : [];

      if (pageCount === 1 && pageSubmissions.length === 0) {
        const directResponse = await extractSubmissionsPageDirectly();
        if (directResponse?.nonRetriable) {
          throw new Error(
            directResponse.error ||
              'Failed to extract submissions from beecrowd runs page.'
          );
        }

        if (directResponse?.success) {
          pageData = directResponse.data || {};
          pageSubmissions = Array.isArray(pageData.submissions)
            ? pageData.submissions
            : [];
        }
      }

      let addedOnPage = 0;
      for (const submission of pageSubmissions) {
        if (appendSubmission(submission)) {
          addedOnPage += 1;
        }
      }

      // If rows exist but none were accepted on first page, relax strict handle
      // enforcement once. This recovers from mixed handle formats or wrong-tab
      // selection while still deduplicating by submission id.
      const hasAnyRowHandle = pageSubmissions.some((submission) =>
        Boolean(
          normalizeBeecrowdHandleInput(
            firstDefinedValue(submission?.handle, '')
          )
        )
      );

      if (
        pageCount === 1 &&
        addedOnPage === 0 &&
        pageSubmissions.length > 0 &&
        !hasAnyRowHandle
      ) {
        relaxHandleMatch = true;
        for (const submission of pageSubmissions) {
          if (appendSubmission(submission)) {
            addedOnPage += 1;
          }
        }
      }

      sendProgress({
        phase: 'fetching_api',
        message: `beecrowd runs page ${pageCount}: +${addedOnPage}, total ${submissions.length}`,
      });

      const nextPageUrlRaw = firstDefinedValue(pageData.nextPageUrl, null);
      const nextPageUrl =
        typeof nextPageUrlRaw === 'string' ? nextPageUrlRaw.trim() : '';

      if (!nextPageUrl || visited.has(nextPageUrl)) {
        break;
      }

      currentUrl = nextPageUrl;
    }
  } finally {
    if (tab && tabCreatedByUs) {
      await removeTab(tab.id);
    }
  }

  if (submissions.length === 0) {
    const storageData = await getLocalStorageData(['cachedSubmissions']);
    const cachedSubmissions = Array.isArray(
      storageData?.cachedSubmissions?.beecrowd
    )
      ? storageData.cachedSubmissions.beecrowd
      : [];

    for (const entry of cachedSubmissions) {
      appendSubmission(entry);
    }
  }

  submissions.sort((a, b) => {
    const aId = Number.parseInt(String(a?.submission_id || ''), 10);
    const bId = Number.parseInt(String(b?.submission_id || ''), 10);

    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return bId - aId;
    }

    return String(b?.submission_id || '').localeCompare(
      String(a?.submission_id || '')
    );
  });

  if (submissions.length === 0) {
    throw new Error(
      'No beecrowd submissions found. Open judge.beecrowd.com, filter runs by your username, leave that tab open, and retry.'
    );
  }

  sendProgress({
    phase: 'fetching_api',
    message: `Collected ${submissions.length} beecrowd submissions.`,
  });

  return submissions;
}

async function fetchCsesSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Opening CSES problemset list to find attempted problems...',
  });

  const normalizedHandle = String(handle || '').trim();
  if (!/^\d+$/.test(normalizedHandle)) {
    throw new Error(
      'CSES import requires numeric CSES user ID. Update your CSES handle in NEUPC account settings.'
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const normalizeCsesUrl = (url) => {
    const trimmed = String(url || '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('/')) return `https://cses.fi${trimmed}`;
    return trimmed;
  };

  const submissions = [];
  const seenSubmissionIds = new Set();

  const appendSubmission = (sub, problemMeta = {}) => {
    const submissionId = normalizeSubmissionIdForLookup(
      firstDefinedValue(sub?.submission_id, sub?.submissionId)
    );
    if (!submissionId || !/^\d+$/.test(submissionId)) return false;
    if (seenSubmissionIds.has(submissionId)) return false;

    seenSubmissionIds.add(submissionId);

    const problemId = firstDefinedValue(
      sub?.problem_id,
      sub?.problemId,
      problemMeta?.problemId
    );
    let problemUrl = firstDefinedValue(
      sub?.problem_url,
      sub?.problemUrl,
      problemMeta?.problemUrl
    );
    if (typeof problemUrl === 'string' && problemUrl.startsWith('/')) {
      problemUrl = `https://cses.fi${problemUrl}`;
    }
    if (!problemUrl && problemId)
      problemUrl = `https://cses.fi/problemset/task/${problemId}`;

    let submissionUrl = firstDefinedValue(
      sub?.submission_url,
      sub?.submissionUrl
    );
    if (typeof submissionUrl === 'string' && submissionUrl.startsWith('/')) {
      submissionUrl = `https://cses.fi${submissionUrl}`;
    }
    if (!submissionUrl)
      submissionUrl = `https://cses.fi/problemset/result/${submissionId}/`;

    const submittedAt =
      firstDefinedValue(sub?.submitted_at, sub?.submittedAt) || null;

    submissions.push({
      ...sub,
      platform: 'cses',
      handle: firstDefinedValue(sub?.handle, normalizedHandle, null),
      submission_id: submissionId,
      submissionId,
      submitted_at: submittedAt,
      submittedAt,
      submission_url: submissionUrl,
      submissionUrl,
      problem_id: problemId,
      problemId,
      problem_url: problemUrl,
      problemUrl,
      problem_name: firstDefinedValue(
        sub?.problem_name,
        sub?.problemName,
        problemMeta?.problemName,
        problemId
      ),
      problemName: firstDefinedValue(
        sub?.problem_name,
        sub?.problemName,
        problemMeta?.problemName,
        problemId
      ),
      source_code: null,
      sourceCode: null,
    });
    return true;
  };

  // ── Find or reuse an existing logged-in CSES tab ────────────────────────────
  const getOrCreateCsesTab = async (url) => {
    // Prefer an existing CSES tab (already authenticated)
    let existingTabs = [];
    try {
      existingTabs =
        typeof browser !== 'undefined'
          ? await browserAPI.tabs.query({ url: '*://cses.fi/*' })
          : await new Promise((resolve) => {
              browserAPI.tabs.query({ url: '*://cses.fi/*' }, (tabs) =>
                resolve(Array.isArray(tabs) ? tabs : [])
              );
            });
    } catch {
      existingTabs = [];
    }

    if (existingTabs.length > 0) {
      // Reuse the first existing CSES tab — it's already authenticated
      const existing = existingTabs[0];
      await new Promise((resolve) =>
        browserAPI.tabs.update(existing.id, { url }, resolve)
      );
      return { tab: existing, created: false };
    }

    // No existing CSES tab — create one (shares the same cookie store)
    const tab = await createTab(url);
    return { tab, created: true };
  };

  // ── Navigate tab to a URL and wait for it to finish loading ─────────────────
  const navigateTab = async (tab, url) => {
    await new Promise((resolve) => {
      browserAPI.tabs.update(tab.id, { url }, resolve);
    });
    for (let i = 0; i < 40; i++) {
      await sleep(700);
      const info = await getTabInfo(tab.id);
      if (!info) return false;
      const tabUrl = String(info.url || '');
      // Detect 404/login redirect — CSES redirects to /login or shows 404 page
      if (tabUrl.includes('/login') || tabUrl.includes('/404')) return false;
      if (info.status === 'complete' && tabUrl.includes('cses.fi')) return true;
    }
    return false;
  };

  let tab = null;
  let tabCreatedByUs = false;

  // ── Helper: wait for tab to load a cses.fi page, detect login redirect ──────
  const waitForLoad = async (expectedUrlFragment) => {
    for (let i = 0; i < 30; i++) {
      await sleep(800);
      const info = await getTabInfo(tab.id);
      if (!info) return false;
      const u = String(info.url || '');
      if (u.includes('/login'))
        throw new Error(
          'CSES requires login. Open cses.fi, log in, then retry.'
        );
      if (info.status === 'complete' && u.includes(expectedUrlFragment))
        return true;
    }
    return false;
  };

  const injectAndWait = async () => {
    const ok = await injectContentScript(tab.id, 'cses');
    if (ok) await sleep(700);
    return ok;
  };

  const goTo = async (url) => {
    await new Promise((resolve) =>
      browserAPI.tabs.update(tab.id, { url }, resolve)
    );
    const fragment = new URL(url).hostname; // 'cses.fi'
    return waitForLoad(fragment);
  };

  const askTab = async (action, extra = {}) => {
    for (let i = 0; i < 12; i++) {
      const resp = await sendMessageToTab(tab.id, { action, ...extra });
      if (resp?.success) return resp;
      if (resp?.nonRetriable) return null;
      if (resp?.pending || !resp) {
        await sleep(800);
        continue;
      }
      // Unknown error — re-inject once and retry
      if (i === 4) await injectAndWait();
      await sleep(600);
    }
    return null;
  };

  try {
    // ── Step 1: https://cses.fi/problemset/ — get attempted problems ───────────
    sendProgress({
      phase: 'fetching_api',
      message: 'Opening CSES problemset page...',
    });

    const { tab: csesTab, created } = await getOrCreateCsesTab(
      'https://cses.fi/problemset/'
    );
    tab = csesTab;
    tabCreatedByUs = created;

    await waitForLoad('cses.fi/problemset');
    await injectAndWait();

    const listResp = await askTab('extractAttemptedProblems');
    if (
      !listResp ||
      !Array.isArray(listResp.data) ||
      listResp.data.length === 0
    ) {
      throw new Error(
        'No attempted problems found on CSES problemset page. Make sure you are logged in to CSES.'
      );
    }

    const attemptedProblems = listResp.data;
    sendProgress({
      phase: 'fetching_api',
      message: `Found ${attemptedProblems.length} attempted problem(s). Collecting submissions...`,
    });

    // ── Step 2: for each problem → https://cses.fi/problemset/task/<id> ────────
    //            extract "Your submissions" result links
    let problemsDone = 0;

    for (const problem of attemptedProblems) {
      if (importState.stopRequested) break;
      const taskUrl = `https://cses.fi/problemset/task/${problem.problemId}`;

      sendProgress({
        phase: 'fetching_api',
        message: `[${problemsDone + 1}/${attemptedProblems.length}] ${problem.problemName}...`,
      });

      const loaded = await goTo(taskUrl);
      if (!loaded) {
        problemsDone++;
        continue;
      }
      await injectAndWait();

      const taskResp = await askTab('extractResultLinks');
      if (!taskResp?.data?.links?.length) {
        problemsDone++;
        continue;
      }

      const { links, problemId, problemName } = taskResp.data;
      const meta = { problemId, problemName, problemUrl: taskUrl };

      // ── Step 3: for each result link → https://cses.fi/problemset/result/<id>/ ─
      let addedForProblem = 0;
      for (const linkInfo of links) {
        if (importState.stopRequested) break;

        const loaded2 = await goTo(linkInfo.submissionUrl);
        if (!loaded2) continue;
        await injectAndWait();

        const subResp = await askTab('extractSubmission', {
          submissionId: linkInfo.submissionId,
          requireSourceCode: false,
        });

        if (subResp?.data) {
          if (appendSubmission(subResp.data, meta)) addedForProblem++;
        }
      }

      problemsDone++;
      sendProgress({
        phase: 'fetching_api',
        message: `[${problemsDone}/${attemptedProblems.length}] ${problem.problemName}: ${addedForProblem} submission(s). Total: ${submissions.length}`,
      });
    }

    if (submissions.length === 0) {
      throw new Error(
        'No CSES submissions found. Make sure you are logged in and have submitted to problems.'
      );
    }

    sendProgress({
      phase: 'fetching_api',
      message: `Done. Collected ${submissions.length} CSES submission(s) from ${problemsDone} problem(s).`,
    });

    return submissions;
  } finally {
    if (tab && tabCreatedByUs) await removeTab(tab.id);
  }
}

async function fetchLightojSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Fetching LightOJ submission history...',
  });

  const normalizedHandle = String(handle || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^(?:https?:\/\/)?(?:www\.)?lightoj\.com\/user\//i, '')
    .split(/[/?#]/)[0];
  const expectedHandleToken = normalizedHandle.toLowerCase();

  if (!normalizedHandle) {
    throw new Error(
      'LightOJ import requires a valid username. Update your LightOJ handle in NEUPC account settings.'
    );
  }

  const submissions = [];
  const seenSubmissionIds = new Set();

  const normalizeHandleToken = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    return raw
      .replace(/^@+/, '')
      .replace(/^(?:https?:\/\/)?(?:www\.)?lightoj\.com\/user\//i, '')
      .split(/[/?#]/)[0]
      .trim()
      .toLowerCase();
  };

  const toAbsoluteLightojUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return null;
    try {
      return new URL(raw, 'https://lightoj.com').toString();
    } catch {
      return null;
    }
  };

  const isHandleMatch = (value) => {
    const normalized = normalizeHandleToken(value);
    if (!normalized) return true;
    return normalized === expectedHandleToken;
  };

  const appendSubmission = (sub) => {
    const providedSubmissionUrl = firstDefinedValue(
      sub?.submission_url,
      sub?.submissionUrl
    );
    const inferredIdFromUrl =
      typeof providedSubmissionUrl === 'string'
        ? providedSubmissionUrl.match(/\/submissions?\/(\d+)/i)?.[1] || null
        : null;

    const submissionId = normalizeSubmissionIdForLookup(
      firstDefinedValue(
        sub?.submission_id,
        sub?.submissionId,
        inferredIdFromUrl
      )
    );

    if (!submissionId || !/^\d+$/.test(submissionId)) {
      return false;
    }

    if (seenSubmissionIds.has(submissionId)) {
      return false;
    }

    const rawProblemUrl = firstDefinedValue(sub?.problem_url, sub?.problemUrl);
    const rawSubmissionUrl = firstDefinedValue(
      sub?.submission_url,
      sub?.submissionUrl
    );

    const candidateHandle = firstDefinedValue(sub?.handle, null);
    if (!isHandleMatch(candidateHandle)) {
      return false;
    }

    const submissionUrl =
      typeof rawSubmissionUrl === 'string' && rawSubmissionUrl.trim().length > 0
        ? rawSubmissionUrl.startsWith('/')
          ? `https://lightoj.com${rawSubmissionUrl}`
          : rawSubmissionUrl
        : `https://lightoj.com/submission/${submissionId}`;

    const problemId = firstDefinedValue(sub?.problem_id, sub?.problemId, null);
    const problemUrl =
      typeof rawProblemUrl === 'string' && rawProblemUrl.trim().length > 0
        ? rawProblemUrl.startsWith('/')
          ? `https://lightoj.com${rawProblemUrl}`
          : rawProblemUrl
        : problemId
          ? `https://lightoj.com/problem/${encodeURIComponent(problemId)}`
          : null;

    const handleValue = firstDefinedValue(
      candidateHandle,
      normalizedHandle,
      null
    );
    const submittedAt =
      firstDefinedValue(sub?.submitted_at, sub?.submittedAt) || null;
    const verdict = normalizeVerdict(
      firstDefinedValue(sub?.verdict, 'UNKNOWN')
    );

    submissions.push({
      ...sub,
      platform: 'lightoj',
      handle: handleValue,
      submission_id: submissionId,
      submissionId,
      submission_url: submissionUrl,
      submissionUrl,
      problem_id: problemId,
      problemId,
      problem_url: problemUrl,
      problemUrl,
      problem_name: firstDefinedValue(
        sub?.problem_name,
        sub?.problemName,
        problemId
      ),
      problemName: firstDefinedValue(
        sub?.problem_name,
        sub?.problemName,
        problemId
      ),
      verdict,
      submitted_at: submittedAt,
      submittedAt,
      source_code: null,
      sourceCode: null,
    });

    seenSubmissionIds.add(submissionId);
    return true;
  };

  const candidateUrls = [
    `https://lightoj.com/user/${encodeURIComponent(normalizedHandle)}/submissions`,
    `https://www.lightoj.com/user/${encodeURIComponent(normalizedHandle)}/submissions`,
    `https://lightoj.com/submissions?user=${encodeURIComponent(normalizedHandle)}`,
    `https://www.lightoj.com/submissions?user=${encodeURIComponent(normalizedHandle)}`,
    'https://lightoj.com/submissions',
    'https://www.lightoj.com/submissions',
  ];

  let tab = null;
  let loginRequired = false;

  const waitForLoad = async () => {
    for (let i = 0; i < 40 && !importState.stopRequested; i++) {
      await sleep(800);
      const info = await getTabInfo(tab.id);
      if (!info) return null;

      const currentUrl = String(info.url || '');
      if (/\/auth\/login/i.test(currentUrl)) {
        loginRequired = true;
      }

      if (
        info.status === 'complete' &&
        currentUrl.startsWith('http') &&
        /lightoj\.com/i.test(currentUrl)
      ) {
        return info;
      }
    }

    return null;
  };

  const injectAndWait = async () => {
    const ok = await injectContentScript(tab.id, 'lightoj');
    if (ok) {
      await sleep(800);
    }
    return ok;
  };

  const askTab = async (request) => {
    for (let i = 0; i < 14 && !importState.stopRequested; i++) {
      const response = await sendMessageToTab(tab.id, request);
      if (response?.success) {
        return response;
      }
      if (response?.nonRetriable) {
        return null;
      }
      if (response?.pending || !response) {
        await sleep(900);
        continue;
      }

      if (i === 5) {
        await injectAndWait();
      }

      await sleep(700);
    }

    return null;
  };

  const collectFromUrl = async (startUrl) => {
    const visited = new Set();
    let currentUrl = startUrl;
    let pages = 0;
    let addedCount = 0;

    const buildNextPageUrl = (url) => {
      try {
        const parsed = new URL(url);
        const currentPage = Number.parseInt(
          parsed.searchParams.get('page') ||
            parsed.searchParams.get('p') ||
            '1',
          10
        );
        const nextPage =
          Number.isFinite(currentPage) && currentPage > 0 ? currentPage + 1 : 2;

        parsed.searchParams.set('page', String(nextPage));
        return parsed.toString();
      } catch {
        return null;
      }
    };

    while (currentUrl && pages < 80 && !importState.stopRequested) {
      if (visited.has(currentUrl)) {
        break;
      }

      visited.add(currentUrl);
      pages++;

      await new Promise((resolve) => {
        browserAPI.tabs.update(tab.id, { url: currentUrl }, resolve);
      });

      const info = await waitForLoad();
      if (!info) {
        break;
      }

      const infoUrl = String(info.url || '');
      if (/\/auth\/login/i.test(infoUrl)) {
        loginRequired = true;
        break;
      }

      await injectAndWait();

      const response = await askTab({
        action: 'extractSubmissionsPage',
        handle: normalizedHandle,
        includeMeta: true,
        options: {
          expectedHandle: normalizedHandle,
          expectedHandles: [normalizedHandle],
          filterByHandle: true,
        },
      });

      if (!response?.success || !response?.data) {
        break;
      }

      const pageData = response.data;
      const pageSubmissions = Array.isArray(pageData.submissions)
        ? pageData.submissions
        : Array.isArray(pageData)
          ? pageData
          : [];

      let addedOnPage = 0;
      for (const sub of pageSubmissions) {
        if (appendSubmission(sub)) {
          addedOnPage++;
        }
      }

      addedCount += addedOnPage;

      sendProgress({
        phase: 'fetching_api',
        message: `LightOJ: scanned ${pages} page(s), collected ${submissions.length} unique submissions...`,
      });

      const nextPageUrlRaw = firstDefinedValue(pageData.nextPageUrl, null);
      let nextPageUrl =
        typeof nextPageUrlRaw === 'string' ? nextPageUrlRaw.trim() : '';

      if (!nextPageUrl && pageSubmissions.length > 0 && addedOnPage > 0) {
        nextPageUrl = buildNextPageUrl(currentUrl) || '';
      }

      if (
        !nextPageUrl ||
        nextPageUrl === currentUrl ||
        visited.has(nextPageUrl)
      ) {
        break;
      }

      currentUrl = nextPageUrl;
    }

    return addedCount;
  };

  const collectFromProblemSections = async () => {
    sendProgress({
      phase: 'fetching_api',
      message:
        'LightOJ submissions page yielded no rows. Crawling problem categories to discover attempted problems...',
    });

    const normalizeCategoryUrl = (url) => {
      const absolute = toAbsoluteLightojUrl(url);
      if (!absolute) return null;

      try {
        const parsed = new URL(absolute);
        if (!/lightoj\.com$/i.test(parsed.hostname || '')) {
          return null;
        }

        parsed.hash = '';
        parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';

        if (!/^\/problems\/category(?:\/|$)/i.test(parsed.pathname || '')) {
          return null;
        }

        return parsed.toString();
      } catch {
        return null;
      }
    };

    const mergeAttemptedProblems = (targetMap, candidates) => {
      if (!(targetMap instanceof Map) || !Array.isArray(candidates)) {
        return;
      }

      for (const candidate of candidates) {
        const problemId = String(
          firstDefinedValue(candidate?.problemId, candidate?.problem_id, '')
        ).trim();
        if (!problemId) {
          continue;
        }

        const statusLabel = String(
          firstDefinedValue(candidate?.statusLabel, candidate?.status, '')
        ).trim();
        const normalizedStatus = statusLabel.toLowerCase();
        const isAttempted =
          typeof candidate?.isAttempted === 'boolean'
            ? candidate.isAttempted
            : normalizedStatus
              ? normalizedStatus !== 'solve'
              : true;

        if (!isAttempted) {
          continue;
        }

        const problemUrl =
          toAbsoluteLightojUrl(
            firstDefinedValue(candidate?.problemUrl, candidate?.problem_url)
          ) || `https://lightoj.com/problem/${encodeURIComponent(problemId)}`;

        const existing = targetMap.get(problemId);
        const merged = {
          problemId,
          problemName: firstDefinedValue(
            existing?.problemName,
            candidate?.problemName,
            candidate?.problem_name,
            problemId
          ),
          problemUrl: firstDefinedValue(existing?.problemUrl, problemUrl, null),
          statusLabel: firstDefinedValue(
            existing?.statusLabel,
            statusLabel,
            null
          ),
        };

        targetMap.set(problemId, merged);
      }
    };

    const collectAttemptedProblemsFromCategoryTree = async () => {
      const queue = [
        'https://lightoj.com/problems/category',
        'https://www.lightoj.com/problems/category',
      ];
      const queuedUrls = new Set(
        queue.map((url) => normalizeCategoryUrl(url)).filter(Boolean)
      );
      const visitedUrls = new Set();
      const discoveredProblems = [];
      const maxCategoryPages = 500;

      while (
        queue.length > 0 &&
        visitedUrls.size < maxCategoryPages &&
        !importState.stopRequested
      ) {
        const nextRawUrl = queue.shift();
        const currentUrl = normalizeCategoryUrl(nextRawUrl);
        if (!currentUrl || visitedUrls.has(currentUrl)) {
          continue;
        }

        visitedUrls.add(currentUrl);

        await new Promise((resolve) => {
          browserAPI.tabs.update(tab.id, { url: currentUrl }, resolve);
        });

        const info = await waitForLoad();
        if (!info) {
          continue;
        }

        const infoUrl = String(info.url || '');
        if (/\/auth\/login/i.test(infoUrl)) {
          loginRequired = true;
          continue;
        }

        await injectAndWait();

        const categoryResp = await askTab({
          action: 'extractCategoryProblems',
        });
        if (!categoryResp?.success || !categoryResp?.data) {
          continue;
        }

        const subcategories = Array.isArray(categoryResp.data?.subcategories)
          ? categoryResp.data.subcategories
          : [];

        for (const rawSubcategoryUrl of subcategories) {
          const normalizedSubcategory = normalizeCategoryUrl(rawSubcategoryUrl);
          if (
            !normalizedSubcategory ||
            visitedUrls.has(normalizedSubcategory) ||
            queuedUrls.has(normalizedSubcategory)
          ) {
            continue;
          }

          queuedUrls.add(normalizedSubcategory);
          queue.push(normalizedSubcategory);
        }

        const problems = Array.isArray(categoryResp.data?.problems)
          ? categoryResp.data.problems
          : [];
        if (problems.length > 0) {
          discoveredProblems.push(...problems);
        }

        if (
          visitedUrls.size <= 5 ||
          visitedUrls.size % 10 === 0 ||
          queue.length === 0
        ) {
          sendProgress({
            phase: 'fetching_api',
            message: `LightOJ category crawl: scanned ${visitedUrls.size} page(s), queued ${queue.length}, found ${discoveredProblems.length} attempted candidate problem(s)...`,
          });
        }
      }

      return discoveredProblems;
    };

    const collectAttemptedProblemsFromProfile = async () => {
      const profileUrls = [
        `https://lightoj.com/user/${encodeURIComponent(normalizedHandle)}`,
        `https://www.lightoj.com/user/${encodeURIComponent(normalizedHandle)}`,
      ];
      const attempted = [];

      for (const profileUrl of profileUrls) {
        if (importState.stopRequested) {
          break;
        }

        await new Promise((resolve) => {
          browserAPI.tabs.update(tab.id, { url: profileUrl }, resolve);
        });

        const info = await waitForLoad();
        if (!info) {
          continue;
        }

        const infoUrl = String(info.url || '');
        if (/\/auth\/login/i.test(infoUrl)) {
          loginRequired = true;
          continue;
        }

        await injectAndWait();

        const profileResp = await askTab({
          action: 'extractAttemptedProblems',
        });
        if (!profileResp?.success || !Array.isArray(profileResp.data)) {
          continue;
        }

        attempted.push(...profileResp.data);

        if (attempted.length > 0) {
          break;
        }
      }

      return attempted;
    };

    const attemptedByProblemId = new Map();

    const categoryAttempted = await collectAttemptedProblemsFromCategoryTree();
    mergeAttemptedProblems(attemptedByProblemId, categoryAttempted);

    if (!importState.stopRequested && attemptedByProblemId.size === 0) {
      sendProgress({
        phase: 'fetching_api',
        message:
          'LightOJ category crawl did not return attempted problems. Trying profile fallback...',
      });

      const profileAttempted = await collectAttemptedProblemsFromProfile();
      mergeAttemptedProblems(attemptedByProblemId, profileAttempted);
    }

    const attemptedProblems = Array.from(attemptedByProblemId.values());

    if (attemptedProblems.length === 0) {
      return 0;
    }

    sendProgress({
      phase: 'fetching_api',
      message: `LightOJ fallback: discovered ${attemptedProblems.length} attempted problem(s). Fetching submission details from each problem page...`,
    });

    const problemQueue = attemptedProblems;

    let addedCount = 0;

    for (
      let i = 0;
      i < problemQueue.length && !importState.stopRequested;
      i++
    ) {
      const problem = problemQueue[i];

      sendProgress({
        phase: 'fetching_api',
        message: `LightOJ fallback: scanning problem ${i + 1}/${problemQueue.length} (${problem.problemId})...`,
      });

      await new Promise((resolve) => {
        browserAPI.tabs.update(tab.id, { url: problem.problemUrl }, resolve);
      });

      const info = await waitForLoad();
      if (!info) continue;

      const infoUrl = String(info.url || '');
      if (/\/auth\/login/i.test(infoUrl)) {
        loginRequired = true;
        continue;
      }

      await injectAndWait();

      const linksResp = await askTab({
        action: 'extractResultLinks',
        handle: normalizedHandle,
        options: {
          expectedHandle: normalizedHandle,
          expectedHandles: [normalizedHandle],
          filterByHandle: true,
        },
      });

      const resultLinks = Array.isArray(linksResp?.data?.links)
        ? linksResp.data.links
        : [];

      if (resultLinks.length === 0) {
        continue;
      }

      for (const linkInfo of resultLinks) {
        if (importState.stopRequested) break;

        const submissionId = normalizeSubmissionIdForLookup(
          firstDefinedValue(linkInfo?.submissionId, null)
        );
        if (!submissionId || seenSubmissionIds.has(submissionId)) {
          continue;
        }

        const submissionUrl =
          toAbsoluteLightojUrl(linkInfo?.submissionUrl) ||
          `https://lightoj.com/submission/${submissionId}`;

        await new Promise((resolve) => {
          browserAPI.tabs.update(tab.id, { url: submissionUrl }, resolve);
        });

        const submissionInfo = await waitForLoad();
        if (!submissionInfo) continue;

        const submissionUrlCurrent = String(submissionInfo.url || '');
        if (/\/auth\/login/i.test(submissionUrlCurrent)) {
          loginRequired = true;
          continue;
        }

        await injectAndWait();

        const subResp = await askTab({
          action: 'extractSubmission',
          submissionId,
          requireSourceCode: false,
        });

        const extracted = subResp?.success ? subResp.data : null;

        const fallbackSubmission = {
          platform: 'lightoj',
          handle: firstDefinedValue(linkInfo?.handle, normalizedHandle, null),
          problem_id: problem.problemId,
          problem_name: firstDefinedValue(
            problem.problemName,
            problem.problemId
          ),
          problem_url: problem.problemUrl,
          submission_id: submissionId,
          submission_url: submissionUrl,
          verdict: firstDefinedValue(linkInfo?.verdict, 'UNKNOWN'),
          language: firstDefinedValue(linkInfo?.language, 'Unknown'),
          submitted_at: firstDefinedValue(linkInfo?.submittedAt, null),
        };

        const merged = extracted
          ? {
              ...fallbackSubmission,
              ...extracted,
              problem_id: firstDefinedValue(
                extracted?.problem_id,
                extracted?.problemId,
                problem.problemId
              ),
              problem_name: firstDefinedValue(
                extracted?.problem_name,
                extracted?.problemName,
                problem.problemName,
                problem.problemId
              ),
              problem_url: firstDefinedValue(
                extracted?.problem_url,
                extracted?.problemUrl,
                problem.problemUrl
              ),
              submission_id: firstDefinedValue(
                extracted?.submission_id,
                extracted?.submissionId,
                submissionId
              ),
              submission_url: firstDefinedValue(
                extracted?.submission_url,
                extracted?.submissionUrl,
                submissionUrl
              ),
              verdict: firstDefinedValue(
                extracted?.verdict,
                linkInfo?.verdict,
                'UNKNOWN'
              ),
              language: firstDefinedValue(
                extracted?.language,
                linkInfo?.language,
                'Unknown'
              ),
              submitted_at: firstDefinedValue(
                extracted?.submitted_at,
                extracted?.submittedAt,
                linkInfo?.submittedAt,
                null
              ),
              handle: firstDefinedValue(
                extracted?.handle,
                linkInfo?.handle,
                normalizedHandle,
                null
              ),
            }
          : fallbackSubmission;

        if (appendSubmission(merged)) {
          addedCount++;
        }
      }
    }

    return addedCount;
  };

  try {
    tab = await createTab(candidateUrls[0]);

    for (const candidateUrl of candidateUrls) {
      if (importState.stopRequested) {
        break;
      }

      const added = await collectFromUrl(candidateUrl);
      if (added > 0) {
        break;
      }
    }

    if (!importState.stopRequested && submissions.length === 0) {
      await collectFromProblemSections();
    }

    if (importState.stopRequested) {
      return submissions;
    }

    if (submissions.length === 0) {
      if (loginRequired) {
        throw new Error(
          'LightOJ requires login. Open lightoj.com, sign in, then retry.'
        );
      }

      throw new Error(
        'No LightOJ submissions found. Verify your handle and ensure your profile/submissions pages are accessible.'
      );
    }

    submissions.sort((a, b) => {
      const aId = Number.parseInt(String(a?.submission_id || ''), 10);
      const bId = Number.parseInt(String(b?.submission_id || ''), 10);

      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return bId - aId;
      }

      return String(b?.submission_id || '').localeCompare(
        String(a?.submission_id || '')
      );
    });

    sendProgress({
      phase: 'fetching_api',
      message: `Found ${submissions.length} LightOJ submissions.`,
    });

    return submissions;
  } finally {
    if (tab) {
      await removeTab(tab.id);
    }
  }
}

async function fetchTophSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Fetching Toph submissions...',
  });

  const normalizedHandle = normalizeTophHandleInput(handle);
  if (!normalizedHandle) {
    throw new Error(
      'Toph import requires a valid username, author ID, or submissions/filter URL. Update your Toph handle in NEUPC account settings.'
    );
  }

  const authorIdFromInput =
    normalizedHandle.match(/^[a-f0-9]{24}$/i)?.[0]?.toLowerCase() || null;
  const authorHandle = authorIdFromInput ? '' : normalizedHandle;

  const profileUrls = authorHandle
    ? [
        `https://toph.co/u/${encodeURIComponent(authorHandle)}`,
        `https://www.toph.co/u/${encodeURIComponent(authorHandle)}`,
      ]
    : [];

  let authorId = authorIdFromInput;
  let loginRequired = false;

  const extractAuthorIdFromProfileHtml = (html) => {
    const text = String(html || '');
    if (!text) return null;

    const directMatch = text.match(
      /\/submissions\/filter\?author=([a-f0-9]{24})/i
    );
    if (directMatch?.[1]) return directMatch[1];

    const selectedAuthorMatch = text.match(
      /<select[^>]+name=author[^>]*>[\s\S]*?<option[^>]+value=([a-f0-9]{24})[^>]*selected/i
    );
    if (selectedAuthorMatch?.[1]) return selectedAuthorMatch[1];

    const facecardMatch = text.match(/"id"\s*:\s*"([a-f0-9]{24})"/i);
    if (facecardMatch?.[1]) return facecardMatch[1];

    const avatarMatch = text.match(/\/accounts\/([a-f0-9]{24})\/avatar/i);
    if (avatarMatch?.[1]) return avatarMatch[1];

    return null;
  };

  const submissions = [];
  const seenSubmissionIds = new Set();
  const pageSize = 50;
  const maxPages = 500;

  const appendSubmission = (submission) => {
    const submissionId = normalizeSubmissionIdForLookup(
      firstDefinedValue(submission?.submission_id, submission?.submissionId)
    );

    if (!submissionId || seenSubmissionIds.has(submissionId)) {
      return false;
    }

    seenSubmissionIds.add(submissionId);
    submissions.push(submission);
    return true;
  };

  const toAbsoluteTophUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return null;
    try {
      return new URL(raw, 'https://toph.co').toString();
    } catch {
      return null;
    }
  };

  const parseExecutionTimeToMs = (verdictText) => {
    const text = String(verdictText || '').trim();
    if (!text) return null;

    const seconds = text.match(/\((\d*\.?\d+)\s*s\)/i);
    if (seconds?.[1]) {
      const value = Number.parseFloat(seconds[1]);
      return Number.isFinite(value) ? Math.round(value * 1000) : null;
    }

    const millis = text.match(/\((\d+)\s*ms\)/i);
    if (millis?.[1]) {
      const value = Number.parseInt(millis[1], 10);
      return Number.isFinite(value) ? value : null;
    }

    return null;
  };

  const parseRowsFromHtml = (html) => {
    const parsedRows = [];

    const rowPattern =
      /<tr[^>]*\bid=(['"]?)trSubmission([A-Za-z0-9]+)\1[^>]*>([\s\S]*?)<\/tr>/gi;

    let rowMatch;
    while ((rowMatch = rowPattern.exec(html)) != null) {
      const submissionId = normalizeSubmissionIdForLookup(rowMatch[2]);
      if (!submissionId) {
        continue;
      }

      const rowHtml = rowMatch[3] || '';
      const cells = Array.from(
        rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)
      ).map((match) => stripHtmlTags(match[1]));

      const [beforeVerdictCell, afterVerdictCell] = rowHtml.split(
        /<td[^>]*class=(?:['"])?text-right(?:['"])?[^>]*>/i
      );
      const languageCandidates = Array.from(
        String(beforeVerdictCell || rowHtml).matchAll(
          /<td\b[^>]*>([\s\S]*?)<\/td>/gi
        )
      )
        .map((match) => stripHtmlTags(match[1]))
        .filter(Boolean);

      const timestampRaw =
        rowHtml.match(/data-timestamp=(['"]?)(\d{9,13})\1/i)?.[2] || null;
      const submittedAt = normalizeSubmissionTimestampToIso(
        timestampRaw || cells[1] || null
      );

      const handleMatch = rowHtml.match(
        /<a[^>]+href=(['"]?)\/u\/([^'"\s>]+)\1[^>]*>/i
      );
      const rowHandle =
        decodeUriComponentSafe(handleMatch?.[2] || '') || authorHandle || null;

      const problemAnchors = Array.from(
        rowHtml.matchAll(
          /<a[^>]+href=(['"]?)(\/p\/[^'"\s>]*)\1[^>]*>([\s\S]*?)<\/a>/gi
        )
      );
      const problemAnchor =
        problemAnchors.length > 0
          ? problemAnchors[problemAnchors.length - 1]
          : null;
      const problemPath = problemAnchor?.[2] || null;

      const problemNameFromAnchor = stripHtmlTags(problemAnchor?.[3] || '');
      const problemNameFromCell = cells[3] || '';
      const problemName = firstDefinedValue(
        problemNameFromAnchor,
        problemNameFromCell,
        `Toph Problem ${submissionId}`
      );

      const problemIdFromPath = decodeUriComponentSafe(
        problemPath?.match(/^\/p\/([^/?#]+)/i)?.[1] || ''
      );
      const fallbackProblemId = String(problemName || '').trim();
      const problemId =
        firstDefinedValue(problemIdFromPath, fallbackProblemId, null) ||
        `toph_problem_${submissionId}`;

      const problemUrl =
        toAbsoluteTophUrl(problemPath) ||
        (problemIdFromPath
          ? `https://toph.co/p/${encodeURIComponent(problemIdFromPath)}`
          : null);

      const verdictText = firstDefinedValue(
        stripHtmlTags(
          rowHtml.match(
            /<span[^>]*font-verdict-[a-z]+[^>]*>[\s\S]*?<\/span>/i
          )?.[0] || ''
        ),
        stripHtmlTags(afterVerdictCell || ''),
        cells[cells.length - 1] || '',
        ''
      );
      const verdictClassToken = (
        rowHtml.match(/font-verdict-([a-z]+)/i)?.[1] || ''
      ).toLowerCase();
      const verdictFromClass =
        {
          ac: 'AC',
          wa: 'WA',
          ce: 'CE',
          re: 'RE',
          mle: 'MLE',
          cle: 'TLE',
        }[verdictClassToken] || null;
      const verdictTextSanitized = String(verdictText || '')
        .replace(/\bon\s+test\s+\d+\b.*$/i, '')
        .replace(/\((?:\d*\.?\d+)\s*(?:ms|s)\)/gi, '')
        .trim();
      const verdict =
        verdictFromClass || normalizeVerdict(verdictTextSanitized || 'UNKNOWN');

      const rawLanguage = firstDefinedValue(
        languageCandidates[languageCandidates.length - 1] || '',
        cells[4] || '',
        'Unknown'
      );
      const languageCleaned = String(rawLanguage || '')
        .replace(
          /\b(accepted|wrong answer|compilation error|runtime error|memory limit exceeded|cpu limit exceeded|passed)\b.*$/i,
          ''
        )
        .trim();
      const language = languageCleaned || 'Unknown';

      parsedRows.push({
        submission_id: submissionId,
        submissionId,
        problem_id: problemId,
        problemId,
        problem_name: problemName,
        problemName,
        problem_url: problemUrl,
        problemUrl,
        submission_url: `https://toph.co/s/${encodeURIComponent(submissionId)}`,
        submissionUrl: `https://toph.co/s/${encodeURIComponent(submissionId)}`,
        verdict,
        language,
        submitted_at: submittedAt,
        submittedAt,
        execution_time_ms: parseExecutionTimeToMs(verdictText),
        platform: 'toph',
        handle: rowHandle,
      });
    }

    const nextStarts = [
      ...new Set(
        Array.from(html.matchAll(/[?&]start=(\d+)/gi))
          .map((match) => Number.parseInt(match[1], 10))
          .filter((value) => Number.isFinite(value) && value >= 0)
      ),
    ].sort((a, b) => a - b);

    return { rows: parsedRows, nextStarts };
  };

  const waitForTophTabLoad = async (tabId) => {
    for (let i = 0; i < 40 && !importState.stopRequested; i++) {
      await sleep(700);
      const info = await getTabInfo(tabId);
      if (!info) return null;

      const currentUrl = String(info.url || '');
      if (/\/login/i.test(currentUrl)) {
        loginRequired = true;
      }

      if (
        info.status === 'complete' &&
        currentUrl.startsWith('http') &&
        /toph\.co/i.test(currentUrl)
      ) {
        return info;
      }
    }

    return null;
  };

  const readTabHtml = async (tabId) => {
    try {
      const results = await browserAPI.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.outerHTML,
      });

      return String(results?.[0]?.result || '');
    } catch (error) {
      console.warn('[NEUPC-TOPH] Failed to read tab HTML:', error?.message);
      return '';
    }
  };

  const resolveAuthorIdFromProfileTab = async () => {
    for (const profileUrl of profileUrls) {
      if (importState.stopRequested) {
        return null;
      }

      let tab = null;
      try {
        tab = await createTab(profileUrl);
        const info = await waitForTophTabLoad(tab.id);
        if (!info) continue;

        const infoUrl = String(info.url || '');
        if (/\/login/i.test(infoUrl)) {
          loginRequired = true;
          continue;
        }

        const html = await readTabHtml(tab.id);
        const extractedAuthorId = extractAuthorIdFromProfileHtml(html);
        if (extractedAuthorId) {
          return extractedAuthorId;
        }
      } catch (error) {
        console.warn(
          '[NEUPC-TOPH] Profile tab fallback failed:',
          error?.message
        );
      } finally {
        if (tab) {
          await removeTab(tab.id);
        }
      }
    }

    return null;
  };

  for (const profileUrl of profileUrls) {
    if (importState.stopRequested) {
      return [];
    }

    try {
      const response = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        continue;
      }

      const responseUrl = String(response.url || profileUrl);
      if (/\/login/i.test(responseUrl)) {
        loginRequired = true;
      }

      const html = await response.text();
      if (!html) {
        continue;
      }

      const extractedAuthorId = extractAuthorIdFromProfileHtml(html);
      if (extractedAuthorId) {
        authorId = extractedAuthorId;
        break;
      }
    } catch (error) {
      console.warn(
        '[NEUPC-TOPH] Failed to fetch profile page:',
        error?.message
      );
    }
  }

  if (!authorId && !importState.stopRequested) {
    sendProgress({
      phase: 'fetching_api',
      message:
        'Toph profile fetch did not expose author info. Trying browser-tab fallback...',
    });

    authorId = await resolveAuthorIdFromProfileTab();
  }

  if (!authorId) {
    if (loginRequired) {
      throw new Error(
        'Toph requires login. Open toph.co, sign in, then retry.'
      );
    }

    throw new Error(
      'Could not locate Toph submissions feed. Verify your Toph username/author ID and ensure submissions are accessible.'
    );
  }

  const collectFromFetchedPages = async () => {
    const visitedStarts = new Set();
    let currentStart = 0;
    let pages = 0;
    let added = 0;

    while (
      pages < maxPages &&
      !importState.stopRequested &&
      !visitedStarts.has(currentStart)
    ) {
      visitedStarts.add(currentStart);
      pages++;

      const pageUrl = `https://toph.co/submissions/filter?author=${encodeURIComponent(authorId)}&start=${currentStart}`;

      let response;
      try {
        response = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/html,application/xhtml+xml',
          },
          cache: 'no-store',
        });
      } catch (error) {
        console.warn(
          '[NEUPC-TOPH] Failed to fetch submissions page:',
          error?.message
        );
        break;
      }

      if (!response?.ok) {
        break;
      }

      const responseUrl = String(response.url || pageUrl);
      if (/\/login/i.test(responseUrl)) {
        loginRequired = true;
        break;
      }

      const html = await response.text();
      if (!html) {
        break;
      }

      const { rows, nextStarts } = parseRowsFromHtml(html);
      if (rows.length === 0) {
        break;
      }

      let addedOnPage = 0;
      for (const row of rows) {
        if (appendSubmission(row)) {
          addedOnPage++;
        }
      }
      added += addedOnPage;

      sendProgress({
        phase: 'fetching_api',
        message: `Toph: scanned ${pages} page(s), collected ${submissions.length} unique submissions...`,
      });

      const higherStarts = nextStarts.filter((value) => value > currentStart);
      if (higherStarts.length > 0) {
        currentStart = higherStarts[0];
      } else if (rows.length >= pageSize && addedOnPage > 0) {
        currentStart += pageSize;
      } else {
        break;
      }

      await sleep(150);
    }

    return added;
  };

  const collectFromPagesViaTab = async () => {
    const visitedStarts = new Set();
    let currentStart = 0;
    let pages = 0;
    let added = 0;
    let tab = null;

    try {
      tab = await createTab(
        `https://toph.co/submissions/filter?author=${encodeURIComponent(authorId)}&start=0`
      );

      while (
        pages < maxPages &&
        !importState.stopRequested &&
        !visitedStarts.has(currentStart)
      ) {
        visitedStarts.add(currentStart);
        pages++;

        const pageUrl = `https://toph.co/submissions/filter?author=${encodeURIComponent(authorId)}&start=${currentStart}`;
        await new Promise((resolve) => {
          browserAPI.tabs.update(tab.id, { url: pageUrl }, resolve);
        });

        const info = await waitForTophTabLoad(tab.id);
        if (!info) {
          break;
        }

        const infoUrl = String(info.url || '');
        if (/\/login/i.test(infoUrl)) {
          loginRequired = true;
          break;
        }

        const html = await readTabHtml(tab.id);
        if (!html) {
          break;
        }

        const { rows, nextStarts } = parseRowsFromHtml(html);
        if (rows.length === 0) {
          break;
        }

        let addedOnPage = 0;
        for (const row of rows) {
          if (appendSubmission(row)) {
            addedOnPage++;
          }
        }
        added += addedOnPage;

        sendProgress({
          phase: 'fetching_api',
          message: `Toph fallback: scanned ${pages} page(s), collected ${submissions.length} unique submissions...`,
        });

        const higherStarts = nextStarts.filter((value) => value > currentStart);
        if (higherStarts.length > 0) {
          currentStart = higherStarts[0];
        } else if (rows.length >= pageSize && addedOnPage > 0) {
          currentStart += pageSize;
        } else {
          break;
        }

        await sleep(150);
      }
    } finally {
      if (tab) {
        await removeTab(tab.id);
      }
    }

    return added;
  };

  await collectFromFetchedPages();

  if (!importState.stopRequested && submissions.length === 0) {
    sendProgress({
      phase: 'fetching_api',
      message:
        'Toph direct fetch returned no rows. Trying browser-tab extraction fallback...',
    });

    await collectFromPagesViaTab();
  }

  if (importState.stopRequested) {
    return submissions;
  }

  if (submissions.length === 0) {
    if (loginRequired) {
      throw new Error(
        'Toph requires login. Open toph.co, sign in, then retry.'
      );
    }

    throw new Error(
      'No Toph submissions found. Verify your handle and ensure your profile/submissions are public.'
    );
  }

  submissions.sort((a, b) => {
    const aId = Number.parseInt(String(a?.submission_id || ''), 10);
    const bId = Number.parseInt(String(b?.submission_id || ''), 10);

    if (Number.isFinite(aId) && Number.isFinite(bId)) {
      return bId - aId;
    }

    const aTime = Date.parse(String(a?.submitted_at || ''));
    const bTime = Date.parse(String(b?.submitted_at || ''));
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
      return bTime - aTime;
    }

    return String(b?.submission_id || '').localeCompare(
      String(a?.submission_id || '')
    );
  });

  sendProgress({
    phase: 'fetching_api',
    message: `Found ${submissions.length} Toph submissions.`,
  });

  return submissions;
}

async function fetchSpojSubmissions(handle) {
  sendProgress({
    phase: 'fetching_api',
    message: 'Fetching SPOJ data...',
  });

  // Strategy 1: Try profile page first (lists all solved problems as AC)
  const profileSubmissions = await fetchSpojFromProfile(handle);
  if (profileSubmissions && profileSubmissions.length > 0) {
    sendProgress({
      phase: 'fetching_api',
      message: `Found ${profileSubmissions.length} solved problems from SPOJ profile. Now fetching full submission history...`,
    });
  }

  // Strategy 2: Always try status page scraping too (has ALL submissions: AC, WA, TLE, etc.)
  // This gives accurate total_submissions count (e.g. 94) not just solved count (e.g. 20)
  sendProgress({
    phase: 'fetching_api',
    message:
      profileSubmissions?.length > 0
        ? 'Fetching detailed submission history from status pages...'
        : 'Profile extraction failed. Trying status page scraping...',
  });
  const statusSubmissions = await fetchSpojFromStatusPages(handle);

  // Merge results: prefer status page data (has real submission IDs, verdicts, timing)
  // Profile entries use synthetic IDs (spoj_profile_X) while status uses real SPOJ IDs,
  // so we merge by problem_id instead of submission_id.
  if (statusSubmissions && statusSubmissions.length > 0) {
    // Build a set of problem IDs covered by status page submissions
    const statusProblemIds = new Set(
      statusSubmissions.map((s) => s.problem_id).filter(Boolean)
    );

    // Only keep profile-only problems that status pages missed
    // (e.g. if status page pagination didn't reach old solved problems)
    const profileOnlySubmissions = (profileSubmissions || []).filter(
      (s) => s.problem_id && !statusProblemIds.has(s.problem_id)
    );

    const allSubmissions = [...statusSubmissions, ...profileOnlySubmissions];
    sendProgress({
      phase: 'fetching_api',
      message: `Found ${allSubmissions.length} total submissions from SPOJ (${statusSubmissions.length} from status pages${profileOnlySubmissions.length > 0 ? `, ${profileOnlySubmissions.length} profile-only` : ''}).`,
    });
    return allSubmissions;
  }

  // Status pages failed — use profile data as fallback
  if (profileSubmissions && profileSubmissions.length > 0) {
    sendProgress({
      phase: 'fetching_api',
      message: `Using ${profileSubmissions.length} solved problems from profile (status pages unavailable).`,
    });
    return profileSubmissions;
  }

  // Both strategies failed
  sendProgress({
    phase: 'fetching_api',
    message:
      'SPOJ extraction failed (likely Cloudflare). Try the Manual Import in NEUPC dashboard instead.',
  });
  return [];
}

/**
 * Extract solved problems from SPOJ user profile page (/users/<handle>).
 * The profile lists all solved problem codes as links — ideal for quick import.
 */
async function fetchSpojFromProfile(handle) {
  let tab = null;
  try {
    const profileUrl = `https://www.spoj.com/users/${handle}/`;
    tab = await createTab(profileUrl);

    // Wait for page to load
    let html = null;
    for (let retry = 0; retry < 20 && !importState.stopRequested; retry++) {
      await sleep(1000);
      try {
        const info = await getTabInfo(tab.id);
        if (info?.status !== 'complete') continue;
        if (!info.url || !info.url.includes('spoj.com')) continue;

        const results = await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.documentElement.outerHTML,
        });
        html = results[0]?.result;
        if (!html) continue;

        // Detect Cloudflare challenge
        if (
          html.includes('Just a moment') ||
          html.includes('cf_chl_opt') ||
          html.includes('challenge-platform')
        ) {
          console.warn(
            '[NEUPC-SPOJ] Cloudflare challenge detected on profile page, waiting...'
          );
          // Give user time to solve the challenge manually in the background tab
          if (retry < 15) continue;
          console.warn(
            '[NEUPC-SPOJ] Cloudflare challenge not resolved after waiting.'
          );
          return null;
        }

        // Check if page has loaded with actual user content
        if (html.includes('/problems/') || html.includes('solved')) {
          break;
        }
      } catch (e) {
        console.warn('[NEUPC-SPOJ] Profile page script error:', e.message);
      }
    }

    if (!html || importState.stopRequested) return null;

    // Extract solved problems from the profile page
    const extracted = await browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      func: (userHandle) => {
        const submissions = [];
        const seen = new Set();

        // Always use the connected handle (userHandle) for the handle field
        // to match the bulk-import API's handle filter.
        // Only use page-detected handle for building submission_url.
        const pageHandle =
          document
            .querySelector(
              '#user-profile-left h3, #user-profile-left h4, .profile-username'
            )
            ?.textContent?.trim() ||
          window.location.pathname.match(/\/users\/([^/?#]+)/i)?.[1] ||
          '';
        const profileHandle = userHandle || pageHandle;

        // SPOJ profile pages list solved problems as links under
        // a heading like "List of solved problems" or in a table with
        // class "problems" or similar.
        const problemLinks = document.querySelectorAll('a[href*="/problems/"]');

        for (const link of problemLinks) {
          const href = link.getAttribute('href') || '';
          const match = href.match(/\/problems\/([^/?#]+)/i);
          if (!match || !match[1]) continue;

          const problemId = decodeURIComponent(match[1]).trim();
          if (!problemId) continue;
          // Skip navigation links like /problems/ (list page)
          if (problemId.length < 2) continue;
          // Skip if already seen
          if (seen.has(problemId)) continue;
          seen.add(problemId);

          // Filter noise: SPOJ problem codes are typically uppercase alphanumeric
          if (!/^[A-Z0-9_]{2,20}$/i.test(problemId)) continue;

          submissions.push({
            submission_id: `spoj_profile_${problemId}`,
            problem_id: problemId,
            problem_name: link.textContent?.trim() || problemId,
            problem_url: `https://www.spoj.com/problems/${problemId}/`,
            submission_url: `https://www.spoj.com/status/${problemId},${encodeURIComponent(profileHandle)}/`,
            verdict: 'AC',
            language: 'Unknown',
            submitted_at: null,
            platform: 'spoj',
            handle: profileHandle,
          });
        }

        return submissions;
      },
      args: [handle],
    });

    return extracted[0]?.result || null;
  } catch (e) {
    console.warn('[NEUPC-SPOJ] Profile extraction failed:', e.message);
    return null;
  } finally {
    if (tab) await removeTab(tab.id);
  }
}

/**
 * Extract submissions from SPOJ status pages (/status/<handle>/).
 * Paginates through pages for full submission history with verdicts.
 */
async function fetchSpojFromStatusPages(handle) {
  let submissions = [];
  let tab = null;
  try {
    // SPOJ status page URL: /status/{handle}/ (no /all/ segment)
    tab = await createTab(`https://www.spoj.com/status/${handle}/`);
    let start = 0;
    const maxPages = 100; // Safety limit
    let pagesScraped = 0;

    while (!importState.stopRequested && pagesScraped < maxPages) {
      if (start > 0) {
        await new Promise((resolve) => {
          browserAPI.tabs.update(
            tab.id,
            // SPOJ pagination uses path-style: /status/{handle}/start={N}
            { url: `https://www.spoj.com/status/${handle}/start=${start}` },
            resolve
          );
        });
      }

      // Wait for page to fully load
      let pageReady = false;
      for (let retry = 0; retry < 20 && !importState.stopRequested; retry++) {
        await sleep(1000);
        try {
          const info = await getTabInfo(tab.id);
          if (info?.status !== 'complete') continue;
          if (!info.url || !info.url.includes('spoj.com')) continue;

          const results = await browserAPI.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const bodyText = (document.body?.innerText || '').toLowerCase();
              // Detect Cloudflare
              if (
                bodyText.includes('just a moment') ||
                bodyText.includes(
                  'enable javascript and cookies to continue'
                ) ||
                bodyText.includes('checking your browser')
              ) {
                return { status: 'cloudflare' };
              }
              // Check for table content
              const tables = document.querySelectorAll('table');
              if (tables.length > 0) {
                return { status: 'ready' };
              }
              // Also check if page has "no submissions" message
              if (
                bodyText.includes('no submissions') ||
                bodyText.includes('no results')
              ) {
                return { status: 'empty' };
              }
              return { status: 'loading' };
            },
          });

          const pageStatus = results[0]?.result;
          if (pageStatus?.status === 'cloudflare') {
            console.warn(
              '[NEUPC-SPOJ] Cloudflare challenge on status page, waiting...'
            );
            if (retry < 15) continue;
            console.warn('[NEUPC-SPOJ] Cloudflare not resolved.');
            return submissions; // Return what we have so far
          }
          if (pageStatus?.status === 'empty') {
            pageReady = false;
            break;
          }
          if (pageStatus?.status === 'ready') {
            pageReady = true;
            break;
          }
        } catch (e) {
          console.warn('[NEUPC-SPOJ] Status page check error:', e.message);
        }
      }

      if (!pageReady) {
        console.warn(
          '[NEUPC-SPOJ] Status page failed to load at start=',
          start
        );
        break;
      }

      // Extract submissions from the current page
      let pageData = null;
      try {
        const extracted = await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          func: (userHandle) => {
            // Parse SPOJ date strings like "2024-01-15 10:30:22" to ISO
            function parseSpojDate(dateStr) {
              if (!dateStr) return null;
              // Try direct Date parse first
              const d = new Date(dateStr);
              if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
                return d.toISOString();
              }
              // Try manual parsing for "DD.MM.YYYY HH:MM:SS" or similar SPOJ formats
              const parts = dateStr.match(
                /(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{1,4})[\sT]?(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/
              );
              if (parts) {
                let [, p1, p2, p3, hh, mm, ss] = parts;
                // Determine if format is YYYY-MM-DD or DD.MM.YYYY
                let year, month, day;
                if (parseInt(p1) > 999) {
                  year = parseInt(p1);
                  month = parseInt(p2);
                  day = parseInt(p3);
                } else {
                  day = parseInt(p1);
                  month = parseInt(p2);
                  year = parseInt(p3);
                }
                const parsed = new Date(
                  year,
                  month - 1,
                  day,
                  parseInt(hh || 0),
                  parseInt(mm || 0),
                  parseInt(ss || 0)
                );
                if (!isNaN(parsed.getTime())) return parsed.toISOString();
              }
              return null;
            }

            // Find the submissions table
            const tables = Array.from(document.querySelectorAll('table'));
            let targetTable = null;

            // Score tables to find the status/submissions table
            let bestScore = -1;
            for (const table of tables) {
              const headerText = Array.from(table.querySelectorAll('th'))
                .map((th) => th.textContent || '')
                .join(' ')
                .toLowerCase();
              const txt = (table.textContent || '').toUpperCase();
              const hasLinks =
                table.querySelectorAll('a[href*="/problems/"]').length > 0;
              let score = 0;
              if (hasLinks) score += 10;
              if (
                headerText.includes('result') ||
                headerText.includes('status')
              )
                score += 5;
              if (headerText.includes('problem')) score += 3;
              if (headerText.includes('lang')) score += 3;
              if (headerText.includes('time') || headerText.includes('mem'))
                score += 2;
              if (txt.includes('RESULT') || txt.includes('STATUS')) score += 4;
              if (txt.includes('TIME') || txt.includes('MEM')) score += 3;
              const rows = table.querySelectorAll('tr');
              score += Math.min(rows.length, 5);

              if (score > bestScore) {
                bestScore = score;
                targetTable = table;
              }
            }

            if (!targetTable) return { data: [], hasNext: false };

            // Detect column positions from headers
            const headers = Array.from(targetTable.querySelectorAll('th')).map(
              (th) => (th.textContent || '').trim().toLowerCase()
            );

            let idCol = 0;
            let dateCol = 1;
            let problemCol = 2;
            let userCol = -1;
            let verdictCol = 3;
            let langCol = -1;
            let timeCol = -1;
            let memCol = -1;
            headers.forEach((h, i) => {
              if (/^id$|submission/.test(h)) idCol = i;
              else if (/^when$|submitted|date/.test(h)) dateCol = i;
              else if (/^problem$|task/.test(h)) problemCol = i;
              else if (/^user$|author|handle/.test(h)) userCol = i;
              else if (/^status$|^result$|verdict/.test(h)) verdictCol = i;
              else if (/^lang/.test(h)) langCol = i;
              else if (/^time$|execution/.test(h)) timeCol = i;
              else if (/^mem/.test(h)) memCol = i;
            });

            const rows = targetTable.querySelectorAll('tbody tr, tr');
            const res = [];
            let debugCount = 0;

            const statusToken = (() => {
              const match =
                window.location.pathname.match(/^\/status\/([^/?#]+)/i);
              return match?.[1] ? decodeURIComponent(match[1]).trim() : '';
            })();

            const pageHandle = (() => {
              if (!statusToken) {
                return userHandle || '';
              }

              if (statusToken.includes(',')) {
                const parts = statusToken
                  .split(',')
                  .map((part) => part.trim())
                  .filter(Boolean)
                  .filter(
                    (part) => !/^all$/i.test(part) && !/^start=\d+$/i.test(part)
                  );

                const fromCommaPath = parts[parts.length - 1] || '';
                if (fromCommaPath && !/^\d+$/.test(fromCommaPath)) {
                  return fromCommaPath;
                }
              }

              if (!/^\d+$/.test(statusToken) && !/^all$/i.test(statusToken)) {
                return statusToken;
              }

              return userHandle || '';
            })();

            for (const row of rows) {
              const tds = row.querySelectorAll('td');
              if (tds.length < 4) continue;

              const inferredIdCol = idCol >= 0 ? idCol : 0;
              const inferredDateCol = dateCol >= 0 ? dateCol : 1;
              const inferredProblemCol = problemCol >= 0 ? problemCol : 2;
              const inferredUserCol =
                userCol >= 0 ? userCol : tds.length >= 8 ? 3 : -1;
              const inferredVerdictCol =
                verdictCol >= 0 ? verdictCol : tds.length >= 8 ? 4 : 3;
              const inferredTimeCol =
                timeCol >= 0 ? timeCol : tds.length >= 8 ? 5 : 4;
              const inferredMemCol =
                memCol >= 0 ? memCol : tds.length >= 8 ? 6 : 5;
              const inferredLangCol =
                langCol >= 0 ? langCol : tds.length >= 8 ? 7 : 6;

              const subId = (tds[inferredIdCol]?.textContent || '').trim();
              if (!subId || !/^\d+$/.test(subId)) continue;

              const dateStr = (tds[inferredDateCol]?.textContent || '').trim();

              const problemCell = tds[inferredProblemCol];
              const problemA =
                problemCell?.querySelector('a[href*="/problems/"]') ||
                row.querySelector('a[href*="/problems/"]');
              if (!problemA) continue;

              const problemHref = problemA.getAttribute('href') || '';
              const problemMatch = problemHref.match(/\/problems\/([^/?#]+)/i);
              const problemId = problemMatch
                ? decodeURIComponent(problemMatch[1]).trim()
                : problemA.textContent.trim();

              let pUrl =
                problemA.href || `https://www.spoj.com/problems/${problemId}/`;
              if (pUrl.startsWith('/')) pUrl = 'https://www.spoj.com' + pUrl;

              // SPOJ verdict detection: try multiple strategies
              // 1. Find cell with class "statusres" (SPOJ's standard class)
              // 2. Fall back to header-detected column index
              let verdictCell = row.querySelector(
                'td.statusres, td[class*="statusres"]'
              );
              if (!verdictCell) {
                verdictCell = tds[inferredVerdictCol];
              }

              // Extract verdict text from the cell
              // SPOJ uses various HTML structures:
              // <td class="statusres"><strong>accepted</strong></td>
              // <td class="statusres">wrong answer</td>
              // <td class="statusres"><abbr title="accepted">AC</abbr></td>
              // <td class="statusres" id="statusres_12345">accepted</td>
              let verdict = (
                verdictCell
                  ?.querySelector('abbr[title]')
                  ?.getAttribute('title') ||
                verdictCell
                  ?.querySelector('span[title]')
                  ?.getAttribute('title') ||
                verdictCell?.querySelector('strong')?.textContent ||
                verdictCell?.querySelector('abbr')?.textContent ||
                verdictCell?.querySelector('span')?.textContent ||
                verdictCell?.textContent ||
                ''
              ).trim();

              // Debug first few rows
              if (debugCount < 3) {
                console.log(
                  `[NEUPC-SPOJ] Row ${subId}: raw verdict='${verdict}', verdictCol=${inferredVerdictCol}, cell class='${verdictCell?.className || 'none'}'`
                );
                debugCount++;
              }

              // Normalize verdict
              const lv = verdict.toLowerCase().replace(/[^a-z0-9\s]/g, '');
              if (lv.includes('accepted') || lv === 'ac') verdict = 'AC';
              else if (lv.includes('wrong answer') || lv === 'wa')
                verdict = 'WA';
              else if (lv.includes('time limit') || lv === 'tle')
                verdict = 'TLE';
              else if (lv.includes('memory limit') || lv === 'mle')
                verdict = 'MLE';
              else if (lv.includes('compilation error') || lv === 'ce')
                verdict = 'CE';
              else if (
                lv.includes('runtime error') ||
                lv.includes('sigsegv') ||
                lv.includes('sigfpe') ||
                lv === 're'
              )
                verdict = 'RE';
              else if (
                lv.includes('pending') ||
                lv.includes('running') ||
                lv.includes('queue') ||
                lv.includes('compiling')
              )
                verdict = 'PENDING';
              else if (/^\d+$/.test(lv)) {
                // SPOJ sometimes shows numeric scores: "100" or "10" for accepted
                // On SPOJ classical problems, any positive score typically means accepted
                const score = parseInt(lv, 10);
                verdict = score > 0 ? 'AC' : 'WA';
              } else if (
                verdict &&
                !/^(AC|WA|TLE|MLE|CE|RE|PENDING)$/.test(verdict)
              )
                verdict = 'OTHER';

              const fallbackLangCell = tds.length > 6 ? tds[6] : tds[5];
              const langCell = tds[inferredLangCol] || fallbackLangCell;
              const lang = (langCell?.textContent || '').trim();

              // Extract execution time (e.g. "0.12" seconds -> 120 ms)
              let executionTimeMs = null;
              const timeText = (tds[inferredTimeCol]?.textContent || '').trim();
              const timeMatch = timeText.match(/([\d.]+)/);
              if (timeMatch) {
                const seconds = parseFloat(timeMatch[1]);
                if (isFinite(seconds)) {
                  executionTimeMs = Math.round(seconds * 1000);
                }
              }

              // Extract memory (e.g. "1234M" or "56k" or raw KB)
              let memoryKb = null;
              const memText = (tds[inferredMemCol]?.textContent || '')
                .trim()
                .toUpperCase();
              const memMatch = memText.match(/([\d.]+)\s*(M|K|G)?B?/i);
              if (memMatch) {
                const val = parseFloat(memMatch[1]);
                const unit = (memMatch[2] || 'K').toUpperCase();
                if (isFinite(val)) {
                  if (unit === 'M') memoryKb = Math.round(val * 1024);
                  else if (unit === 'G')
                    memoryKb = Math.round(val * 1024 * 1024);
                  else memoryKb = Math.round(val); // default KB
                }
              }

              const submissionAnchor =
                tds[inferredIdCol]?.querySelector('a[href*="/status/"]') ||
                row.querySelector('a[href*="/status/"]');
              let submissionUrl =
                submissionAnchor?.getAttribute('href') ||
                submissionAnchor?.href ||
                '';
              if (submissionUrl && submissionUrl.startsWith('/')) {
                submissionUrl = `https://www.spoj.com${submissionUrl}`;
              }

              const isNumericStatusUrl = /\/status\/\d+\/?(?:[?#].*)?$/i.test(
                submissionUrl
              );
              if (
                submissionUrl &&
                (!/\/status\//i.test(submissionUrl) || isNumericStatusUrl)
              ) {
                submissionUrl = '';
              }
              if (!submissionUrl) {
                // Keep extraction on a valid status listing URL instead of a 404 numeric path.
                submissionUrl = window.location.href;
              }

              const userCell =
                inferredUserCol >= 0 ? tds[inferredUserCol] : null;
              const userHref =
                userCell
                  ?.querySelector('a[href*="/users/"]')
                  ?.getAttribute('href') ||
                row.querySelector('a[href*="/users/"]')?.getAttribute('href') ||
                '';
              const userMatch = userHref.match(/\/users\/([^/?#]+)/i);
              const rowHandleFromHref = userMatch
                ? decodeURIComponent(userMatch[1]).trim()
                : '';
              const rowHandleText = (userCell?.textContent || '').trim();
              const rowHandleFromCell =
                rowHandleText && /^[A-Za-z0-9_.-]+$/.test(rowHandleText)
                  ? rowHandleText
                  : '';

              res.push({
                submission_id: subId,
                problem_id: problemId,
                problem_name:
                  problemA.title || problemA.textContent.trim() || problemId,
                problem_url: pUrl,
                submission_url: submissionUrl,
                verdict: verdict || 'UNKNOWN',
                language: lang || 'Unknown',
                submitted_at: parseSpojDate(dateStr),
                execution_time_ms: executionTimeMs,
                memory_kb: memoryKb,
                platform: 'spoj',
                handle:
                  rowHandleFromHref ||
                  rowHandleFromCell ||
                  pageHandle ||
                  userHandle ||
                  '',
              });
            }

            // Check for next page - look for pagination links with start= in href
            const paginationLinks =
              document.querySelectorAll('a[href*="start="]');
            let hasNext = false;
            let nextStart = null;
            // Parse current start value from URL (can be in path or query)
            const fullUrl = window.location.href;
            const startFromPath = fullUrl.match(/start=(\d+)/);
            const currentStart = startFromPath
              ? parseInt(startFromPath[1], 10)
              : 0;
            for (const link of paginationLinks) {
              const linkHref = link.getAttribute('href') || link.href || '';
              if (!/\/status\//i.test(linkHref)) continue;
              const linkStartMatch = linkHref.match(/start=(\d+)/);
              const linkStart = linkStartMatch
                ? parseInt(linkStartMatch[1], 10)
                : 0;
              if (
                linkStart > currentStart &&
                (nextStart === null || linkStart < nextStart)
              ) {
                hasNext = true;
                nextStart = linkStart;
              }
            }

            return { data: res, hasNext, nextStart };
          },
          args: [handle],
        });
        pageData = extracted[0]?.result;
      } catch (e) {
        console.warn('[NEUPC-SPOJ] Status page extraction error:', e.message);
        break;
      }

      if (!pageData || !pageData.data || pageData.data.length === 0) {
        break;
      }

      submissions.push(...pageData.data);
      pagesScraped++;

      sendProgress({
        phase: 'fetching_api',
        message: `Scraped ${submissions.length} submissions from ${pagesScraped} page(s)...`,
      });

      if (!pageData.hasNext) break;
      const nextStart = Number(pageData.nextStart);
      if (Number.isFinite(nextStart) && nextStart > start) {
        start = nextStart;
      } else {
        start += 20; // SPOJ default page size fallback
      }
    }
  } finally {
    if (tab) await removeTab(tab.id);
  }
  return submissions;
}
