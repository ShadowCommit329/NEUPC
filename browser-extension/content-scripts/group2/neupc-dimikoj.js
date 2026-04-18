/**
 * NEUPC DIMIKOJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from DIMIK Online Judge (Bangladesh)
 */

(function () {
  'use strict';

  const PLATFORM = 'dimikoj';

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
        reject(new Error(`Timeout`));
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
    if (v.includes('PENDING') || v.includes('RUNNING')) return 'PENDING';
    return verdict;
  }

  class DIMIKOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission')) return 'submission';
      if (path.includes('/problem')) return 'problem';
      if (path.includes('/status')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"], .username, .user-handle');
      if (userLink) {
        const href = userLink.getAttribute('href');
        if (href) {
          const match = href.match(/\/user\/([^/]+)/);
          if (match) return match[1];
        }
        return extractText(userLink);
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId =
          window.location.pathname.match(/\/submission[s]?\/(\d+)/)?.[1] ||
          new URL(window.location.href).searchParams.get('id');
        if (!submissionId) {
          log('No submission ID found');
          return null;
        }

        log('Extracting submission:', submissionId);
        await waitForElement('table, .submission', 3000).catch(() => null);

        const problemLink = safeQuery('a[href*="/problem"]');
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

        // Try to extract from table cells
        const cells = safeQueryAll('td');
        for (const cell of cells) {
          const text = extractText(cell);
          if (text.match(/accepted|wrong|time limit|runtime|compile/i)) {
            verdict = text;
          }
          if (text.match(/c\+\+|python|java|c#|javascript/i)) {
            language = text;
          }
          if (text.match(/^\d+\s*ms$/i)) {
            executionTime = parseInt(text);
          }
          if (text.match(/^\d+\s*kb$/i)) {
            memoryUsed = parseInt(text);
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
        logError('Error:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const selectors = ['pre code', '.source-code', 'pre', '.code'];
      for (const sel of selectors) {
        const el = safeQuery(sel);
        if (el?.textContent.trim().length > 10) return el.textContent.trim();
      }
      return null;
    }

    async init() {
      if (this.initialized) return;
      log('Initializing...');
      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        const submission = await this.extractSubmission();
        if (submission) this.storeSubmission(submission);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new DIMIKOJExtractor().init()
    );
  } else {
    new DIMIKOJExtractor().init();
  }
})();
