/**
 * NEUPC Toph Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility
 * Toph is a popular competitive programming platform in Bangladesh
 *
 * Supported pages:
 * - Submission page: /s/{id}
 * - Problem page: /p/{slug}
 * - Submissions page: /u/{handle}/submissions
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES
  // ============================================================

  const PLATFORM = 'toph';
  const browserAPI =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof browser !== 'undefined'
        ? browser
        : null;

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logError(...args) {
    console.error(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logWarn(...args) {
    console.warn(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function safeQueryAll(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  function extractText(selectorOrElement, context = document) {
    const el =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;
    return el ? el.textContent.trim() : '';
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForElement(selector, timeout = 5000) {
    const el = safeQuery(selector);
    if (el) return el;

    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const found = safeQuery(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = verdict.toUpperCase().trim();

    if (v.includes('ACCEPTED') || v === 'AC') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE') return 'RE';
    if (v.includes('COMPILATION ERROR') || v === 'CE') return 'CE';
    if (v.includes('OUTPUT LIMIT') || v === 'OLE') return 'OLE';
    if (
      v.includes('PENDING') ||
      v.includes('QUEUE') ||
      v.includes('RUNNING') ||
      v.includes('JUDGING')
    ) {
      return 'PENDING';
    }

    return verdict;
  }

  // ============================================================
  // TOPH EXTRACTOR
  // ============================================================

  class TophExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      // Single submission page: /s/{id}
      if (path.match(/\/s\/[a-z0-9]+$/i)) {
        return 'submission';
      }

      // Submissions list: /u/{handle}/submissions
      if (path.includes('/submissions')) {
        return 'submissions';
      }

      // Problem page: /p/{slug}
      if (path.match(/\/p\/[^/]+$/)) {
        return 'problem';
      }

      // User profile: /u/{handle}
      if (path.match(/\/u\/[^/]+$/)) {
        return 'profile';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // From submission page - look for user link
      const userLinks = safeQueryAll('a[href*="/u/"]');
      for (const link of userLinks) {
        const href = link.getAttribute('href');
        const match = href.match(/\/u\/([^/]+)$/);
        if (match) {
          return match[1];
        }
      }

      // From navbar if logged in
      const navProfile = safeQuery('.nav a[href^="/u/"]');
      if (navProfile) {
        const match = navProfile.href.match(/\/u\/([^/]+)/);
        if (match) return match[1];
      }

      return null;
    }

    async extractSubmission() {
      try {
        const path = window.location.pathname;

        // Extract submission ID from URL: /s/{id}
        const submissionMatch = path.match(/\/s\/([a-z0-9]+)$/i);
        if (!submissionMatch) {
          log('No submission ID in URL');
          return null;
        }

        const submissionId = submissionMatch[1];
        log('Extracting submission:', submissionId);

        // Wait for page content to load
        await waitForElement('.submission, .card, article', 5000).catch(() => {
          logWarn('Submission container not found');
        });

        // Give extra time for content rendering
        await sleep(500);

        let problemId = null;
        let problemName = null;
        let problemUrl = null;
        let verdict = 'UNKNOWN';
        let language = null;
        let executionTime = null;
        let memoryUsed = null;
        let submittedAt = null;
        let sourceCode = null;

        // ============================================================
        // Extract problem info
        // ============================================================

        const problemLink = safeQuery('a[href*="/p/"]');
        if (problemLink) {
          problemUrl = problemLink.href;
          problemName = extractText(problemLink);
          const match = problemUrl.match(/\/p\/([^/?]+)/);
          if (match) {
            problemId = match[1];
          }
        }

        // ============================================================
        // Extract verdict from status badges
        // ============================================================

        const verdictSelectors = [
          '.badge',
          '.verdict',
          '.status',
          '.submission-verdict',
          '[class*="verdict"]',
          '.result',
          '.label',
        ];

        for (const selector of verdictSelectors) {
          const elements = safeQueryAll(selector);
          for (const el of elements) {
            const text = extractText(el);
            if (text) {
              const lowerText = text.toLowerCase();
              if (
                lowerText.includes('accepted') ||
                lowerText.includes('wrong') ||
                lowerText.includes('time limit') ||
                lowerText.includes('memory limit') ||
                lowerText.includes('runtime') ||
                lowerText.includes('compilation')
              ) {
                verdict = text;
                break;
              }
            }
          }
          if (verdict !== 'UNKNOWN') break;
        }

        // ============================================================
        // Extract metadata from detail rows/table
        // ============================================================

        // Look for dl/dt/dd pattern
        const dtElements = safeQueryAll('dt');
        for (const dt of dtElements) {
          const label = extractText(dt).toLowerCase();
          const dd = dt.nextElementSibling;
          if (!dd || dd.tagName !== 'DD') continue;

          const value = extractText(dd);

          if (label.includes('language') || label.includes('ভাষা')) {
            language = value;
          }

          if (label.includes('time') || label.includes('সময়')) {
            const match = value.match(/(\d+)\s*ms/i);
            if (match) executionTime = parseInt(match[1], 10);
          }

          if (label.includes('memory') || label.includes('মেমোরি')) {
            const match = value.match(/(\d+)\s*KB/i);
            if (match) memoryUsed = parseInt(match[1], 10);
          }
        }

        // Fallback: look for patterns in page text
        if (!executionTime) {
          const pageText = document.body.textContent;
          const timeMatch = pageText.match(/(\d+)\s*ms/i);
          if (timeMatch) executionTime = parseInt(timeMatch[1], 10);
        }

        if (!memoryUsed) {
          const pageText = document.body.textContent;
          const memMatch = pageText.match(/(\d+)\s*KB/i);
          if (memMatch) memoryUsed = parseInt(memMatch[1], 10);
        }

        // ============================================================
        // Extract submission time
        // ============================================================

        const timeElements = safeQueryAll('time, [datetime], .timestamp');
        for (const el of timeElements) {
          const datetime = el.getAttribute('datetime') || extractText(el);
          if (datetime) {
            try {
              const parsed = new Date(datetime);
              if (!isNaN(parsed.getTime())) {
                submittedAt = parsed.toISOString();
                break;
              }
            } catch (e) {}
          }
        }

        // ============================================================
        // Extract source code
        // ============================================================

        const codeSelectors = [
          'pre.code',
          '.source-code pre',
          'pre[class*="source"]',
          '.submission-code pre',
          'pre.prettyprint',
          '.code-area pre',
          'pre.highlight',
          'pre',
        ];

        for (const selector of codeSelectors) {
          const codeEl = safeQuery(selector);
          if (codeEl) {
            const text = codeEl.textContent.trim();
            if (text.length > 20 && this.looksLikeCode(text)) {
              sourceCode = text;
              log('Found source code with selector:', selector);
              break;
            }
          }
        }

        // ============================================================
        // Build submission object
        // ============================================================

        const submission = {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId: problemId || `toph_${submissionId}`,
          problemName: problemName || problemId || '',
          problemUrl: problemUrl || '',
          contestId: '',
          submissionId: submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language: language || '',
          executionTime: executionTime,
          memoryUsed: memoryUsed,
          submittedAt: submittedAt || new Date().toISOString(),
          sourceCode: sourceCode,
          difficultyRating: null,
          tags: [],
        };

        log('Extracted submission:', {
          problemId: submission.problemId,
          verdict: submission.verdict,
          codeLength: submission.sourceCode?.length || 0,
        });

        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    looksLikeCode(text) {
      const indicators = [
        'int ',
        'void ',
        'def ',
        'class ',
        '#include',
        'import ',
        'function ',
        'public ',
        'private ',
        'return ',
        'for ',
        'while ',
        'if ',
        'cout',
        'cin',
        'printf',
        'scanf',
        'System.',
        'print(',
        'main',
        'using namespace',
      ];
      return indicators.some((ind) => text.includes(ind));
    }

    // ============================================================
    // MESSAGE HANDLING
    // ============================================================

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage) return;

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          log('Message received:', request.action);

          if (request.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(sendResponse);
            return true;
          }

          if (request.action === 'ping') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              initialized: this.initialized,
            });
            return true;
          }

          if (request.action === 'getPageInfo') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              url: window.location.href,
            });
            return true;
          }

          sendResponse({ success: false, error: 'Unknown action' });
          return true;
        }
      );
    }

    async handleExtractSubmissionMessage(sendResponse) {
      try {
        if (this.extractionComplete && this.extractionResult) {
          sendResponse({ success: true, data: this.extractionResult });
          return;
        }

        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        this.extractionComplete = true;

        sendResponse({
          success: !!submission?.sourceCode,
          data: submission,
          error: submission ? null : 'No submission found',
        });
      } catch (error) {
        logError('Extract submission error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    // ============================================================
    // AUTO-SYNC
    // ============================================================

    async autoSyncIfEnabled(submission) {
      if (!browserAPI?.storage?.sync) return;

      try {
        const result = await new Promise((resolve) => {
          browserAPI.storage.sync.get(['autoSync', 'extensionToken'], resolve);
        });

        if (result.autoSync && result.extensionToken && submission.sourceCode) {
          log(
            `Auto-syncing ${submission.verdict || 'UNKNOWN'} submission to backend...`
          );

          browserAPI.runtime.sendMessage(
            { action: 'syncSubmission', submission },
            (response) => {
              if (response?.success) {
                log('Auto-sync successful!');
              } else {
                logWarn(
                  'Auto-sync failed:',
                  response?.error || 'Unknown error'
                );
              }
            }
          );
        }
      } catch (error) {
        logError('Auto-sync check failed:', error);
      }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async init() {
      if (this.initialized) return;

      log('Initializing extractor on:', window.location.href);

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        log('Processing submission page');

        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        this.extractionComplete = true;

        if (submission) {
          log('Successfully extracted submission');
          this.cacheSubmission(submission);
          await this.autoSyncIfEnabled(submission);
        } else {
          logWarn('Failed to extract submission data');
        }
      }

      this.initialized = true;
      log('Extractor initialized');
    }

    cacheSubmission(submission) {
      if (!browserAPI?.storage?.local) return;

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = cached[this.platform] || [];

        const exists = platformCache.some(
          (s) => s.submissionId === submission.submissionId
        );

        if (!exists) {
          platformCache.unshift(submission);
          if (platformCache.length > 100) {
            platformCache.pop();
          }
          cached[this.platform] = platformCache;

          browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
            log('Submission cached');
          });
        }
      });
    }
  }

  // ============================================================
  // AUTO-INITIALIZE
  // ============================================================

  function initExtractor() {
    log('Content script loaded');
    const extractor = new TophExtractor();
    extractor.init();

    // Store reference for debugging
    window.__neupcExtractor = extractor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
