/**
 * NEUPC COJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Caribbean Online Judge (Cuba)
 */

(function () {
  'use strict';

  const PLATFORM = 'coj';

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
  }
  function logError(...args) {
    console.error(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function safeQuery(sel, ctx = document) {
    try {
      return ctx.querySelector(sel);
    } catch (e) {
      return null;
    }
  }

  function safeQueryAll(sel, ctx = document) {
    try {
      return Array.from(ctx.querySelectorAll(sel));
    } catch (e) {
      return [];
    }
  }

  function extractText(el, ctx = document) {
    const elem = typeof el === 'string' ? safeQuery(el, ctx) : el;
    return elem ? elem.textContent.trim() : '';
  }

  function waitForElement(sel, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = safeQuery(sel);
      if (el) {
        resolve(el);
        return;
      }
      const obs = new MutationObserver(() => {
        const el = safeQuery(sel);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject(new Error('Timeout'));
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

  class COJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/')) return 'submission';
      if (path.includes('/problem/')) return 'problem';
      if (path.includes('/status')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"]');
      if (userLink) {
        const match = userLink.getAttribute('href')?.match(/\/user\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId =
          window.location.pathname.match(/\/submission\/(\d+)/)?.[1];
        if (!submissionId) {
          log('No submission ID');
          return null;
        }

        log('Extracting:', submissionId);
        await waitForElement('table, .submission-info', 3000).catch(() => null);

        const problemLink = safeQuery('a[href*="/problem/"]');
        let problemId = null,
          problemUrl = null,
          problemName = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/problem\/(\d+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        let verdict = 'UNKNOWN',
          language = 'Unknown',
          executionTime = null,
          memoryUsed = null;

        const rows = safeQueryAll('tr, .info-row');
        for (const row of rows) {
          const text = extractText(row).toLowerCase();
          if (text.includes('verdict') || text.includes('result')) {
            const cells = safeQueryAll('td', row);
            if (cells.length >= 2) verdict = extractText(cells[1]);
          }
          if (text.includes('language')) {
            const cells = safeQueryAll('td', row);
            if (cells.length >= 2) language = extractText(cells[1]);
          }
          if (text.includes('time') && !text.includes('submit')) {
            const match = text.match(/(\d+\.?\d*)\s*(ms|s)/i);
            if (match) {
              executionTime = parseFloat(match[1]);
              if (match[2].toLowerCase() === 's') executionTime *= 1000;
            }
          }
          if (text.includes('memory')) {
            const match = text.match(/(\d+)\s*kb/i);
            if (match) memoryUsed = parseInt(match[1]);
          }
        }

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();

        return {
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
      } catch (error) {
        logError('Error:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const selectors = ['pre code', '.source-code', 'pre', 'textarea'];
      for (const sel of selectors) {
        const el = safeQuery(sel);
        if (el) {
          const code = el.value || el.textContent.trim();
          if (code.length > 10) return code;
        }
      }
      return null;
    }

    async init() {
      if (this.initialized) return;
      log('Initializing...');
      if (this.detectPageType() === 'submission') {
        const submission = await this.extractSubmission();
        if (submission) {
          log('Extracted:', submission);
              
              // Auto-sync if enabled and submission is AC
              this.storeSubmission && this.autoSyncIfEnabled && this.autoSyncIfEnabled(submission);
          this.storeSubmission(submission);
        }
      }
      this.initialized = true;
    }

    storeSubmission(submission) {
      const api =
        typeof chrome !== 'undefined'
          ? chrome
          : typeof browser !== 'undefined'
            ? browser
            : null;
      if (api?.storage) {
        api.storage.local.get(['cachedSubmissions'], (r) => {
          const cached = r.cachedSubmissions || {};
          const pc = cached[this.platform] || [];
          if (!pc.some((s) => s.submissionId === submission.submissionId)) {
            pc.unshift(submission);
            if (pc.length > 100) pc.pop();
            cached[this.platform] = pc;
            api.storage.local.set({ cachedSubmissions: cached });
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

      browserAPI.storage.sync.get(['autoFetchEnabled', 'extensionToken'], (result) => {
        if (result.autoFetchEnabled && result.extensionToken) {
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
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new COJExtractor().init()
    );
  } else {
    new COJExtractor().init();
  }
})();
