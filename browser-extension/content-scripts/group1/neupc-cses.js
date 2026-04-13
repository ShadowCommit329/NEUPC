/**
 * NEUPC CSES Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from CSES Problem Set
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES (inline)
  // ============================================================

  const PLATFORM = 'cses';

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logError(...args) {
    console.error(`[NEUPC:${PLATFORM}]`, ...args);
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

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = safeQuery(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = safeQuery(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
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

    if (v.includes('ACCEPTED') || v === 'AC' || v === 'OK') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE' || v === 'RTE') return 'RE';
    if (
      v.includes('COMPILATION ERROR') ||
      v === 'CE' ||
      v.includes('COMPILE ERROR')
    )
      return 'CE';
    if (v.includes('PRESENTATION ERROR') || v === 'PE') return 'PE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING'))
      return 'PENDING';

    return verdict;
  }

  // ============================================================
  // CSES EXTRACTOR
  // ============================================================

  class CSESExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (path.includes('/result/')) {
        return 'submission';
      }
      if (path.includes('/list/')) {
        return 'submissions';
      }
      if (path.includes('/task/')) {
        return 'problem';
      }

      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href^="/user/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/\/user\/(\d+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId =
          window.location.pathname.match(/\/result\/(\d+)/)?.[1];
        if (!submissionId) {
          log('No submission ID in URL');
          return null;
        }

        log('Extracting submission:', submissionId);

        await waitForElement('.content', 2000).catch(() => null);

        // Extract from info table
        const rows = safeQueryAll('table tr');
        let problemId = null;
        let problemName = null;
        let problemUrl = null;
        let verdict = 'UNKNOWN';
        let executionTime = null;
        let language = 'Unknown';

        for (const row of rows) {
          const header = extractText(row.querySelector('td:first-child'));
          const value = row.querySelector('td:last-child');

          if (header.includes('Task')) {
            const taskLink = value?.querySelector('a');
            if (taskLink) {
              const match = taskLink.href.match(/\/task\/(\d+)/);
              if (match) problemId = match[1];
              problemName = extractText(taskLink);
              problemUrl = taskLink.href;
            }
          } else if (header.includes('Result') || header.includes('Status')) {
            verdict = extractText(value);
            log('Found verdict:', verdict);
          } else if (header.includes('Time')) {
            const match = extractText(value).match(/(\d+\.?\d*)/);
            if (match) executionTime = parseFloat(match[1]) * 1000; // Convert to ms
            log('Found execution time:', executionTime);
          } else if (header.includes('Language')) {
            language = extractText(value);
            log('Found language:', language);
          }
        }

        if (!problemUrl && problemId) {
          problemUrl = `https://cses.fi/problemset/task/${problemId}`;
        }

        // Extract source code
        const sourceCode = await this.extractSourceCode();

        const handle = await this.getUserHandle();

        const submission = {
          platform: this.platform,
          handle,
          problemId,
          problemName,
          problemUrl,
          submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language,
          executionTime,
          memoryUsed: null,
          submittedAt: new Date().toISOString(),
          sourceCode,
        };

        log('Extracted submission:', submission);
        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractSourceCode() {
      try {
        const codeElement = safeQuery('pre, code, .code');
        if (codeElement) {
          const sourceCode = codeElement.textContent.trim();
          log(`Extracted source code: ${sourceCode.length} characters`);
          return sourceCode;
        }
        log('Source code element not found');
        return null;
      } catch (error) {
        logError('Error extracting source code:', error);
        return null;
      }
    }

    async init() {
      if (this.initialized) return;

      log('Initializing extractor...');

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        log('Processing submission page');
        const submission = await this.extractSubmission();

        if (submission) {
          log('Successfully extracted submission!');
          log('Submission data:', JSON.stringify(submission, null, 2));
          this.storeSubmission(submission);
        } else {
          log('Failed to extract submission data');
        }
      } else if (pageType === 'submissions') {
        log('Submissions list page - watching for navigation');
      } else {
        log('Unknown page type, skipping');
      }

      this.initialized = true;
      log('Extractor initialized');
    }

    storeSubmission(submission) {
      const browserAPI =
        typeof chrome !== 'undefined'
          ? chrome
          : typeof browser !== 'undefined'
            ? browser
            : null;

      if (browserAPI && browserAPI.storage) {
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
              log('Submission cached successfully');

              // Auto-sync if enabled and submission is AC
              this.autoSyncIfEnabled(submission);
            });
          } else {
            log('Submission already cached');
          }
        });
      } else {
        log('Browser storage API not available');
      }
    }

    autoSyncIfEnabled(submission) {
      const browserAPI =
        typeof chrome !== 'undefined'
          ? chrome
          : typeof browser !== 'undefined'
            ? browser
            : null;

      if (!browserAPI || !browserAPI.runtime) return;

      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          if (
            result.autoFetchEnabled &&
            result.extensionToken
          ) {
            log('Auto-syncing submission to backend...');

            browserAPI.runtime.sendMessage(
              { action: 'syncSubmission', submission },
              (response) => {
                if (response && response.success) {
                  log('Auto-sync successful!');
                } else {
                  log('Auto-sync failed:', response?.error || 'Unknown error');
                }
              }
            );
          }
        }
      );
    }
  }

  // ============================================================
  // AUTO-INITIALIZE
  // ============================================================

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new CSESExtractor();
    extractor.init();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
