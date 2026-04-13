/**
 * NEUPC SPOJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from SPOJ (Sphere Online Judge)
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES (inline)
  // ============================================================

  const PLATFORM = 'spoj';

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
    if (
      v.includes('RUNTIME ERROR') ||
      v === 'RE' ||
      v === 'RTE' ||
      v.includes('SIGSEGV') ||
      v.includes('SIGFPE')
    )
      return 'RE';
    if (
      v.includes('COMPILATION ERROR') ||
      v === 'CE' ||
      v.includes('COMPILE ERROR')
    )
      return 'CE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING'))
      return 'PENDING';

    return verdict;
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  // ============================================================
  // SPOJ EXTRACTOR
  // ============================================================

  class SPOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (path.includes('/status/')) {
        return 'submissions';
      }
      if (path.includes('/submit/')) {
        return 'problem';
      }
      if (path.includes('/problems/')) {
        return 'problem';
      }

      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href^="/users/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/\/users\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmissions() {
      try {
        const submissions = [];

        await waitForElement('table.table, table tbody', 2000).catch(
          () => null
        );

        const rows = safeQueryAll('table.table tbody tr, table tbody tr');
        log(`Found ${rows.length} submission rows`);

        for (const row of rows) {
          const cells = safeQueryAll('td', row);
          if (cells.length < 5) continue;

          const submissionId = extractText(cells[0]);
          if (!submissionId || !/^\d+$/.test(submissionId)) continue;

          const problemLink = cells[2]?.querySelector('a');
          const problemId = problemLink
            ? problemLink.href.match(/\/problems\/([^/]+)/)?.[1]
            : null;
          const problemName = problemLink ? extractText(problemLink) : null;

          const verdict = extractText(cells[3]);
          const timeText = extractText(cells[4]);
          const executionTime = timeText ? parseFloat(timeText) * 1000 : null;
          const language = cells.length > 5 ? extractText(cells[5]) : 'Unknown';
          const submittedAt =
            cells.length > 1 ? parseDate(extractText(cells[1])) : null;

          const handle = await this.getUserHandle();

          const submission = {
            platform: this.platform,
            handle,
            problemId,
            problemName,
            problemUrl: problemId
              ? `https://www.spoj.com/problems/${problemId}/`
              : null,
            submissionId,
            submissionUrl: `https://www.spoj.com/status/${submissionId}/`,
            verdict: normalizeVerdict(verdict),
            language,
            executionTime,
            memoryUsed: null,
            submittedAt: submittedAt || new Date().toISOString(),
            sourceCode: null,
          };

          submissions.push(submission);
          log('Extracted submission:', submissionId);
        }

        log(`Extracted ${submissions.length} submissions total`);
        return submissions;
      } catch (error) {
        logError('Error extracting submissions:', error);
        return [];
      }
    }

    async extractSubmission() {
      const submissions = await this.extractSubmissions();
      return submissions.length > 0 ? submissions[0] : null;
    }

    async init() {
      if (this.initialized) return;

      log('Initializing extractor...');

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submissions') {
        log('Processing submissions list page');
        const submissions = await this.extractSubmissions();

        if (submissions.length > 0) {
          log(`Successfully extracted ${submissions.length} submissions!`);
          for (const submission of submissions) {
            this.storeSubmission(submission);
          }
        } else {
          log('No submissions found');
        }
      } else if (pageType === 'problem') {
        log('Problem page - submit to see submissions');
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
              log('Submission cached:', submission.submissionId);

              // Auto-sync if enabled and submission is AC
              this.autoSyncIfEnabled(submission);
            });
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
    const extractor = new SPOJExtractor();
    extractor.init();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
