/**
 * NEUPC Aizu OJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Aizu Online Judge (onlinejudge.u-aizu.ac.jp)
 */

(function () {
  'use strict';

  const PLATFORM = 'aizu';

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
    if (v.includes('PRESENTATION ERROR') || v === 'PE') return 'PE';
    if (v.includes('OUTPUT LIMIT') || v === 'OLE') return 'OLE';
    return verdict;
  }

  class AizuExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      const hash = window.location.hash;

      // New Aizu uses hash-based routing
      if (hash.includes('/submissions/') || hash.includes('/judgeDetail/'))
        return 'submission';
      if (hash.includes('/problems/') || hash.includes('/description/'))
        return 'problem';
      if (hash.includes('/status')) return 'status';

      // Old paths
      if (path.includes('/submission_record')) return 'submission';
      if (path.includes('/problem')) return 'problem';

      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/users/"], a[href*="#/users/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href?.match(/\/users\/([^/?#]+)/);
        if (match) return match[1];
        return extractText(userLink);
      }
      return null;
    }

    async extractSubmission() {
      try {
        // Try to get submission ID from URL hash or path
        const hash = window.location.hash;
        const path = window.location.pathname;

        const subMatch =
          hash.match(/\/judgeDetail\/(\d+)/) ||
          hash.match(/\/submissions\/(\d+)/) ||
          path.match(/submission_record\/(\d+)/);

        if (!subMatch) {
          log('No submission ID found');
          return null;
        }

        const submissionId = subMatch[1];
        log('Extracting submission:', submissionId);

        await waitForElement(
          '.submission, .judge-detail, main, table',
          3000
        ).catch(() => null);

        // Get problem info
        const problemLink = safeQuery(
          'a[href*="/problems/"], a[href*="#/problems/"]'
        );
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match =
            problemUrl.match(/\/problems\/([^/?#]+)/) ||
            problemUrl.match(/#\/problems\/([^/?#]+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        // Extract verdict
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery(
          '.status, .result, [class*="verdict"], td.status'
        );
        if (statusEl) {
          verdict = normalizeVerdict(extractText(statusEl));
          // Check class for color indicators
          const className = statusEl.className;
          if (className.includes('accepted') || className.includes('success'))
            verdict = 'AC';
          else if (className.includes('wrong') || className.includes('error'))
            verdict = 'WA';
        }

        // Extract time and memory
        let executionTime = null,
          memoryUsed = null;
        const infoEls = safeQueryAll('.info-row, .stat, td, span');
        for (const el of infoEls) {
          const text = extractText(el);
          const timeMatch = text.match(/(\d+)\s*(?:ms|sec)/i);
          const memMatch = text.match(/(\d+)\s*(KB|MB)/i);

          if (timeMatch) {
            executionTime = parseInt(timeMatch[1]);
            if (text.toLowerCase().includes('sec') && !text.includes('ms')) {
              executionTime *= 1000;
            }
          }
          if (memMatch) {
            memoryUsed = parseInt(memMatch[1]);
            if (memMatch[2].toUpperCase() === 'MB') memoryUsed *= 1024;
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
          problemName: problemName || (problemId ? `Aizu ${problemId}` : null),
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
      const selectors = [
        'pre code',
        '.code-content',
        '.source-code',
        'pre',
        'textarea',
      ];
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
      new AizuExtractor().init()
    );
  } else {
    new AizuExtractor().init();
  }
})();
