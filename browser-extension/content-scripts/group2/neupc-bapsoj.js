/**
 * NEUPC BAPSOJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from BAPS Online Judge (Bangladesh)
 */

(function () {
  'use strict';

  const PLATFORM = 'bapsoj';

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
    if (v.includes('COMPILATION ERROR') || v === 'CE') return 'CE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING'))
      return 'PENDING';
    return verdict;
  }

  class BAPSOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/') || path.includes('/submissions/'))
        return 'submission';
      if (path.includes('/problem/')) return 'problem';
      if (path.includes('/status')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"], a[href*="/profile/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/\/(user|profile)\/([^/]+)/);
        if (match) return match[2];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId = window.location.pathname.match(
          /\/submission[s]?\/(\d+)/
        )?.[1];
        if (!submissionId) {
          log('No submission ID in URL');
          return null;
        }

        log('Extracting submission:', submissionId);
        await waitForElement('table, .submission-info', 3000).catch(() => null);

        const problemLink = safeQuery('a[href*="/problem/"]');
        let problemId = null,
          problemUrl = null,
          problemName = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/problem\/([^/]+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        let verdict = 'UNKNOWN',
          language = 'Unknown',
          executionTime = null,
          memoryUsed = null;

        const rows = safeQueryAll('table tr, .info-row');
        for (const row of rows) {
          const text = extractText(row).toLowerCase();
          if (
            text.includes('verdict') ||
            text.includes('result') ||
            text.includes('status')
          ) {
            const cells = safeQueryAll('td', row);
            if (cells.length >= 2) verdict = extractText(cells[1]);
          }
          if (text.includes('language') || text.includes('lang')) {
            const cells = safeQueryAll('td', row);
            if (cells.length >= 2) language = extractText(cells[1]);
          }
          if (text.includes('time') && !text.includes('submit')) {
            const match = extractText(row).match(/(\d+)\s*ms/i);
            if (match) executionTime = parseInt(match[1]);
          }
          if (text.includes('memory')) {
            const match = extractText(row).match(/(\d+)\s*kb/i);
            if (match) memoryUsed = parseInt(match[1]);
          }
        }

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
          memoryUsed,
          submittedAt: null,
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
      const codeSelectors = [
        'pre code',
        '.source-code',
        'pre',
        'code',
        '.code',
      ];
      for (const selector of codeSelectors) {
        const el = safeQuery(selector);
        if (el) {
          const code = el.textContent.trim();
          if (code && code.length > 10) {
            log(`Extracted source code: ${code.length} characters`);
            return code;
          }
        }
      }
      return null;
    }

    async init() {
      if (this.initialized) return;
      log('Initializing extractor...');

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        const submission = await this.extractSubmission();
        if (submission) {
          log('Successfully extracted submission!');
          this.storeSubmission(submission);
        }
      }

      this.initialized = true;
    }

    storeSubmission(submission) {
      const browserAPI =
        typeof chrome !== 'undefined'
          ? chrome
          : typeof browser !== 'undefined'
            ? browser
            : null;
      if (browserAPI?.storage) {
        browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
          const cached = result.cachedSubmissions || {};
          const platformCache = cached[this.platform] || [];
          if (
            !platformCache.some(
              (s) => s.submissionId === submission.submissionId
            )
          ) {
            platformCache.unshift(submission);
            if (platformCache.length > 100) platformCache.pop();
            cached[this.platform] = platformCache;
            browserAPI.storage.local.set({ cachedSubmissions: cached });
            log('Submission cached');

            // Auto-sync if enabled and submission is AC
            this.autoSyncIfEnabled(submission);
          }
        });
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

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    new BAPSOJExtractor().init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
