/**
 * NEUPC Browser Extension - Utilities
 * Common utility functions for all platform extractors
 */

import {
  VERDICT_ALIASES,
  VERDICTS,
  LANGUAGE_MAP,
  PLATFORMS,
} from './constants.js';

// Browser compatibility: Support both Chrome and Firefox
export const browserAPI = globalThis.chrome || globalThis.browser;

// ============================================================
// LOGGING
// ============================================================

const DEBUG = true; // Set to false in production

/**
 * Log with platform prefix
 * @param {string} platform - Platform identifier
 * @param {...any} args - Arguments to log
 */
export function log(platform, ...args) {
  if (DEBUG) {
    console.log(`[NEUPC:${platform}]`, ...args);
  }
}

/**
 * Error logging with platform prefix
 * @param {string} platform - Platform identifier
 * @param {...any} args - Arguments to log
 */
export function logError(platform, ...args) {
  console.error(`[NEUPC:${platform}]`, ...args);
}

/**
 * Warning logging with platform prefix
 * @param {string} platform - Platform identifier
 * @param {...any} args - Arguments to log
 */
export function logWarn(platform, ...args) {
  console.warn(`[NEUPC:${platform}]`, ...args);
}

// ============================================================
// DOM UTILITIES
// ============================================================

/**
 * Wait for an element to appear in the DOM
 * @param {string|string[]} selectors - CSS selector(s) to wait for
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @param {Element} parent - Parent element to search within
 * @returns {Promise<Element>}
 */
export async function waitForElement(
  selectors,
  timeout = 10000,
  parent = document
) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Check if element already exists
    for (const selector of selectorList) {
      const element = parent.querySelector(selector);
      if (element) {
        return resolve(element);
      }
    }

    // Set up observer
    const observer = new MutationObserver(() => {
      for (const selector of selectorList) {
        const element = parent.querySelector(selector);
        if (element) {
          observer.disconnect();
          return resolve(element);
        }
      }

      if (Date.now() - startTime > timeout) {
        observer.disconnect();
        reject(
          new Error(`Timeout waiting for element: ${selectorList.join(' | ')}`)
        );
      }
    });

    observer.observe(parent === document ? document.body : parent, {
      childList: true,
      subtree: true,
    });

    // Also set a timeout fallback
    setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(`Timeout waiting for element: ${selectorList.join(' | ')}`)
      );
    }, timeout);
  });
}

/**
 * Wait for multiple elements
 * @param {string[]} selectors - Array of CSS selectors
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element[]>}
 */
export async function waitForElements(selectors, timeout = 10000) {
  return Promise.all(selectors.map((sel) => waitForElement(sel, timeout)));
}

/**
 * Safely query selector with fallback
 * @param {string|string[]} selectors - CSS selector or array of selectors
 * @param {Element} parent - Parent element (default: document)
 * @returns {Element|null}
 */
export function safeQuery(selectors, parent = document) {
  try {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of selectorList) {
      const element = parent.querySelector(selector);
      if (element) return element;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Safely query all elements with fallback
 * @param {string|string[]} selectors - CSS selector or array of selectors
 * @param {Element} parent - Parent element (default: document)
 * @returns {Element[]}
 */
export function safeQueryAll(selectors, parent = document) {
  try {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of selectorList) {
      const elements = parent.querySelectorAll(selector);
      if (elements.length > 0) return Array.from(elements);
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Extract text content from element(s)
 * @param {string|Element} selector - CSS selector or element
 * @param {Element} parent - Parent element
 * @returns {string}
 */
export function extractText(selector, parent = document) {
  try {
    const element =
      typeof selector === 'string' ? parent.querySelector(selector) : selector;
    return element ? element.textContent.trim() : '';
  } catch (e) {
    return '';
  }
}

/**
 * Extract attribute from element
 * @param {string|Element} selector - CSS selector or element
 * @param {string} attr - Attribute name
 * @param {Element} parent - Parent element
 * @returns {string}
 */
export function extractAttr(selector, attr, parent = document) {
  try {
    const element =
      typeof selector === 'string' ? parent.querySelector(selector) : selector;
    return element ? element.getAttribute(attr) || '' : '';
  } catch (e) {
    return '';
  }
}

/**
 * Extract href from anchor element
 * @param {string|Element} selector - CSS selector or element
 * @param {Element} parent - Parent element
 * @returns {string}
 */
export function extractHref(selector, parent = document) {
  try {
    const element =
      typeof selector === 'string' ? parent.querySelector(selector) : selector;
    return element?.href || extractAttr(element, 'href', parent) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Sanitize text by removing extra whitespace
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// DATA NORMALIZATION
// ============================================================

/**
 * Normalize verdict to standardized format
 * @param {string} verdict - Raw verdict string
 * @returns {string} - Normalized verdict code
 */
export function normalizeVerdict(verdict) {
  if (!verdict) return VERDICTS.UNKNOWN;

  const cleaned = verdict
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_\s]/g, '')
    .replace(/\s+/g, '_');

  // Check direct match first
  if (VERDICTS[cleaned]) {
    return cleaned;
  }

  // Check aliases
  if (VERDICT_ALIASES[cleaned]) {
    return VERDICT_ALIASES[cleaned];
  }

  // Check partial matches
  for (const [alias, normalized] of Object.entries(VERDICT_ALIASES)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) {
      return normalized;
    }
  }

  // Special cases
  if (cleaned.includes('ACCEPT') || cleaned === 'OK' || cleaned === '100') {
    return VERDICTS.AC;
  }
  if (cleaned.includes('WRONG')) return VERDICTS.WA;
  if (cleaned.includes('TIME')) return VERDICTS.TLE;
  if (cleaned.includes('MEMORY')) return VERDICTS.MLE;
  if (cleaned.includes('RUNTIME') || cleaned.includes('ERROR'))
    return VERDICTS.RE;
  if (cleaned.includes('COMPIL')) return VERDICTS.CE;

  return VERDICTS.UNKNOWN;
}

/**
 * Check if verdict indicates an accepted submission
 * @param {string} verdict - Verdict string
 * @returns {boolean}
 */
export function isAcceptedVerdict(verdict) {
  const normalized = normalizeVerdict(verdict);
  return normalized === VERDICTS.AC;
}

/**
 * Normalize programming language
 * @param {string} language - Raw language string
 * @returns {string} - Normalized language name
 */
export function normalizeLanguage(language) {
  if (!language) return 'Unknown';

  const cleaned = language.toString().trim();

  for (const [normalized, variants] of Object.entries(LANGUAGE_MAP)) {
    for (const variant of variants) {
      if (cleaned.toLowerCase().includes(variant.toLowerCase())) {
        return normalized;
      }
    }
  }

  return cleaned;
}

/**
 * Get language file extension
 * @param {string} language - Language name
 * @returns {string}
 */
export function getLanguageExtension(language) {
  const extensions = {
    'C++': 'cpp',
    C: 'c',
    Java: 'java',
    Python: 'py',
    JavaScript: 'js',
    TypeScript: 'ts',
    'C#': 'cs',
    Go: 'go',
    Rust: 'rs',
    Kotlin: 'kt',
    Swift: 'swift',
    Ruby: 'rb',
    PHP: 'php',
    Perl: 'pl',
    Haskell: 'hs',
    Scala: 'scala',
    D: 'd',
    OCaml: 'ml',
    Pascal: 'pas',
    'F#': 'fs',
    Lua: 'lua',
    R: 'r',
    Julia: 'jl',
    Elixir: 'ex',
    Erlang: 'erl',
    Clojure: 'clj',
    Scheme: 'scm',
    Lisp: 'lisp',
    Bash: 'sh',
    SQL: 'sql',
    Assembly: 'asm',
  };

  const normalized = normalizeLanguage(language);
  return extensions[normalized] || 'txt';
}

// ============================================================
// DATE/TIME UTILITIES
// ============================================================

/**
 * Parse various date formats to ISO string
 * @param {string|Date|number} dateInput - Date in various formats
 * @returns {string|null} - ISO 8601 date string
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;

  try {
    let date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      // Unix timestamp (seconds or milliseconds)
      date = new Date(dateInput < 10000000000 ? dateInput * 1000 : dateInput);
    } else if (typeof dateInput === 'string') {
      // Try parsing as ISO or common formats
      date = new Date(dateInput);

      // If that fails, try some common patterns
      if (isNaN(date.getTime())) {
        // Try relative time parsing
        const relativeResult = parseRelativeTime(dateInput);
        if (relativeResult) return relativeResult;
      }
    }

    if (date && !isNaN(date.getTime())) {
      return date.toISOString();
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse relative time (e.g., "2 hours ago") to ISO string
 * @param {string} relativeTime - Relative time string
 * @returns {string|null}
 */
export function parseRelativeTime(relativeTime) {
  if (!relativeTime) return null;

  const now = new Date();
  const text = relativeTime.toLowerCase();

  const patterns = [
    { regex: /(\d+)\s*second(s)?\s*ago/, unit: 'seconds' },
    { regex: /(\d+)\s*minute(s)?\s*ago/, unit: 'minutes' },
    { regex: /(\d+)\s*hour(s)?\s*ago/, unit: 'hours' },
    { regex: /(\d+)\s*day(s)?\s*ago/, unit: 'days' },
    { regex: /(\d+)\s*week(s)?\s*ago/, unit: 'weeks' },
    { regex: /(\d+)\s*month(s)?\s*ago/, unit: 'months' },
    { regex: /(\d+)\s*year(s)?\s*ago/, unit: 'years' },
    { regex: /just\s*now/, unit: 'now' },
    { regex: /a\s*moment\s*ago/, unit: 'now' },
  ];

  for (const { regex, unit } of patterns) {
    const match = text.match(regex);
    if (match) {
      const value = parseInt(match[1]) || 1;
      const date = new Date(now);

      switch (unit) {
        case 'now':
          break;
        case 'seconds':
          date.setSeconds(date.getSeconds() - value);
          break;
        case 'minutes':
          date.setMinutes(date.getMinutes() - value);
          break;
        case 'hours':
          date.setHours(date.getHours() - value);
          break;
        case 'days':
          date.setDate(date.getDate() - value);
          break;
        case 'weeks':
          date.setDate(date.getDate() - value * 7);
          break;
        case 'months':
          date.setMonth(date.getMonth() - value);
          break;
        case 'years':
          date.setFullYear(date.getFullYear() - value);
          break;
      }

      return date.toISOString();
    }
  }

  return null;
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString();
}

// ============================================================
// URL UTILITIES
// ============================================================

/**
 * Detect platform from URL
 * @param {string} url - URL to check
 * @returns {string|null} - Platform ID or null
 */
export function detectPlatformFromUrl(url) {
  if (!url) return null;

  const urlLower = url.toLowerCase();

  for (const [platformId, config] of Object.entries(PLATFORMS)) {
    if (
      urlLower.includes(
        config.baseUrl.replace('https://', '').replace('http://', '')
      )
    ) {
      return platformId;
    }
  }

  return null;
}

/**
 * Extract problem ID from URL based on platform
 * @param {string} url - Problem URL
 * @param {string} platform - Platform ID
 * @returns {string|null}
 */
export function extractProblemIdFromUrl(url, platform) {
  if (!url || !platform) return null;

  const config = PLATFORMS[platform];
  if (!config?.problemUrlPattern) return null;

  const match = url.match(config.problemUrlPattern);
  if (!match) return null;

  // Handle different pattern group structures
  if (match.length >= 3) {
    // contestId + problemIndex format (e.g., Codeforces: 1850A)
    return `${match[1]}${match[2]}`;
  } else if (match.length >= 2) {
    return match[1];
  }

  return null;
}

/**
 * Extract submission ID from URL based on platform
 * @param {string} url - Submission URL
 * @param {string} platform - Platform ID
 * @returns {string|null}
 */
export function extractSubmissionIdFromUrl(url, platform) {
  if (!url || !platform) return null;

  const config = PLATFORMS[platform];
  if (!config?.submissionUrlPattern) return null;

  const match = url.match(config.submissionUrlPattern);
  if (!match) return null;

  // Handle different pattern group structures
  if (match.length >= 3) {
    // Some platforms have contestId + submissionId
    return match[2];
  } else if (match.length >= 2) {
    return match[1];
  }

  return null;
}

/**
 * Build problem URL for a platform
 * @param {string} platform - Platform ID
 * @param {string} problemId - Problem ID
 * @param {string} contestId - Optional contest ID
 * @returns {string}
 */
export function buildProblemUrl(platform, problemId, contestId = null) {
  const config = PLATFORMS[platform];
  if (!config) return '';

  // Platform-specific URL building
  switch (platform) {
    case 'codeforces':
    case 'cfgym':
      if (contestId) {
        const prefix = platform === 'cfgym' ? 'gym' : 'contest';
        return `${config.baseUrl}/${prefix}/${contestId}/problem/${problemId.replace(contestId, '')}`;
      }
      return `${config.baseUrl}/problemset/problem/${problemId.slice(0, -1)}/${problemId.slice(-1)}`;

    case 'atcoder':
      if (contestId) {
        return `${config.baseUrl}/contests/${contestId}/tasks/${problemId}`;
      }
      return `${config.baseUrl}/contests/unknown/tasks/${problemId}`;

    case 'leetcode':
    case 'leetcodecn':
      return `${config.baseUrl}/problems/${problemId}`;

    case 'cses':
      return `${config.baseUrl}/problemset/task/${problemId}`;

    default:
      return `${config.baseUrl}/problem/${problemId}`;
  }
}

// ============================================================
// EXTRACTION UTILITIES
// ============================================================

/**
 * Parse numeric value from string
 * @param {string} text - Text containing number
 * @returns {number|null}
 */
export function parseNumber(text) {
  if (!text) return null;

  const match = text.toString().match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }

  return null;
}

/**
 * Parse time value (e.g., "156 ms", "1.5s") to milliseconds
 * @param {string} text - Time string
 * @returns {number|null}
 */
export function parseTime(text) {
  if (!text) return null;

  const str = text.toString().toLowerCase();

  // Match patterns like "156 ms", "1.5s", "2000ms"
  const msMatch = str.match(/([\d.]+)\s*ms/i);
  if (msMatch) {
    return Math.round(parseFloat(msMatch[1]));
  }

  const secMatch = str.match(/([\d.]+)\s*s(?:ec)?/i);
  if (secMatch) {
    return Math.round(parseFloat(secMatch[1]) * 1000);
  }

  // Just a number, assume milliseconds
  const numMatch = str.match(/^([\d.]+)$/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]));
  }

  return null;
}

/**
 * Parse memory value (e.g., "2048 KB", "1.5 MB") to KB
 * @param {string} text - Memory string
 * @returns {number|null}
 */
export function parseMemory(text) {
  if (!text) return null;

  const str = text.toString().toLowerCase();

  // Match patterns like "2048 KB", "1.5 MB", "256MB"
  const kbMatch = str.match(/([\d.]+)\s*kb/i);
  if (kbMatch) {
    return Math.round(parseFloat(kbMatch[1]));
  }

  const mbMatch = str.match(/([\d.]+)\s*mb/i);
  if (mbMatch) {
    return Math.round(parseFloat(mbMatch[1]) * 1024);
  }

  const gbMatch = str.match(/([\d.]+)\s*gb/i);
  if (gbMatch) {
    return Math.round(parseFloat(gbMatch[1]) * 1024 * 1024);
  }

  const byteMatch = str.match(/([\d.]+)\s*(?:bytes?|b)/i);
  if (byteMatch) {
    return Math.round(parseFloat(byteMatch[1]) / 1024);
  }

  // Just a number, assume KB
  const numMatch = str.match(/^([\d.]+)$/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]));
  }

  return null;
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate submission object has required fields
 * @param {Object} submission - Submission data
 * @returns {boolean}
 */
export function validateSubmission(submission) {
  const required = ['platform', 'problemId', 'submissionId', 'verdict'];

  for (const field of required) {
    if (!submission[field]) {
      logError('Validation', `Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

/**
 * Sanitize submission data for API
 * @param {Object} submission - Raw submission data
 * @returns {Object} - Sanitized submission
 */
export function sanitizeSubmission(submission) {
  return {
    platform: submission.platform?.toLowerCase() || '',
    problemId: submission.problemId?.toString() || '',
    problemName: submission.problemName?.toString() || '',
    problemUrl: submission.problemUrl?.toString() || '',
    submissionId: submission.submissionId?.toString() || '',
    submissionUrl: submission.submissionUrl?.toString() || '',
    verdict: normalizeVerdict(submission.verdict),
    language: normalizeLanguage(submission.language),
    sourceCode: submission.sourceCode?.toString() || null,
    executionTime: parseNumber(submission.executionTime),
    memoryUsed: parseNumber(submission.memoryUsed),
    submittedAt: parseDate(submission.submittedAt) || null,
    contestId: submission.contestId?.toString() || '',
    difficultyRating: parseNumber(submission.difficultyRating),
    tags: Array.isArray(submission.tags) ? submission.tags : [],
    handle: submission.handle?.toString() || '',
  };
}

// ============================================================
// GENERAL UTILITIES
// ============================================================

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Deep clone an object
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate unique ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if running in extension context
 * @returns {boolean}
 */
export function isExtensionContext() {
  return (
    typeof browserAPI !== 'undefined' &&
    browserAPI.runtime &&
    browserAPI.runtime.id
  );
}

/**
 * Get current tab URL
 * @returns {Promise<string>}
 */
export async function getCurrentTabUrl() {
  if (!isExtensionContext()) {
    return window.location.href;
  }

  try {
    const tabs = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs[0]?.url || '';
  } catch (e) {
    return window.location.href;
  }
}
