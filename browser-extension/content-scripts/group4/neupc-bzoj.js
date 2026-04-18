/**
 * NEUPC BZOJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from BZOJ / DarkBZOJ / Hydro mirrors
 * Note: Original BZOJ is down, this supports mirrors
 */

(function () {
  'use strict';

  const PLATFORM = 'bzoj';

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
    if (v.includes('COMPILE ERROR') || v === 'CE') return 'CE';
    return verdict;
  }

  class BZOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/record/') || path.includes('/submission/'))
        return 'submission';
      if (path.includes('/p/') || path.includes('/problem/')) return 'problem';
      if (path.includes('/status')) return 'status';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"], a[href*="/u/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href?.match(/\/(?:user|u)\/([^/]+)/);
        if (match) return match[1];
        return extractText(userLink);
      }
      return null;
    }

    async extractSubmission() {
      try {
        const recordMatch =
          window.location.pathname.match(/\/record\/([^/]+)/) ||
          window.location.pathname.match(/\/submission\/(\d+)/);

        if (!recordMatch) {
          log('No record ID found');
          return null;
        }

        const submissionId = recordMatch[1];
        log('Extracting record:', submissionId);

        await waitForElement('.record, .submission, main', 3000).catch(
          () => null
        );

        // Get problem info
        const problemLink = safeQuery('a[href*="/p/"], a[href*="/problem/"]');
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match =
            problemUrl.match(/\/p\/(\d+)/) ||
            problemUrl.match(/\/problem\/(\d+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        // Extract verdict
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery('.status, .result, [class*="status"]');
        if (statusEl) {
          verdict = normalizeVerdict(extractText(statusEl));
        }

        // Extract score (BZOJ/Hydro shows scores)
        const scoreEl = safeQuery('.score, [class*="score"]');
        if (scoreEl && verdict === 'UNKNOWN') {
          const scoreText = extractText(scoreEl);
          const match = scoreText.match(/(\d+)/);
          if (match) {
            const score = parseInt(match[1]);
            if (score === 100) verdict = 'AC';
            else if (score > 0) verdict = 'PARTIAL';
            else verdict = 'WA';
    }
    const autoSyncIfEnabled = (submission) => {
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

  // Extract time and memory
        let executionTime = null,
          memoryUsed = null;
        const infoEls = safeQueryAll('.info-row, .stat, td');
        for (const el of infoEls) {
          const text = extractText(el);
          const timeMatch = text.match(/(\d+)\s*ms/);
          const memMatch = text.match(/(\d+)\s*(KB|MB)/i);

          if (timeMatch) executionTime = parseInt(timeMatch[1]);
          if (memMatch) {
            memoryUsed = parseInt(memMatch[1]);
            if (memMatch[2].toUpperCase() === 'MB') memoryUsed *= 1024;
          }
        }

        // Extract language
        let language = 'Unknown';
        const langEl = safeQuery('.language, [class*="lang"]');
        if (langEl) language = extractText(langEl);

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();

        return {
          platform: this.platform,
          handle,
          problemId,
          problemName: problemName || (problemId ? `BZOJ ${problemId}` : null),
          problemUrl,
          submissionId,
          submissionUrl: window.location.href,
          verdict,
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
      const selectors = ['pre code', '.code-content', '.source-code', 'pre'];
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
      if (pageType === 'submission') {
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new BZOJExtractor().init()
    );
  } else {
    new BZOJExtractor().init();
  }
})();
