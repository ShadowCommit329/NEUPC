/**
 * NEUPC Library Checker Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Library Checker (judge.yosupo.jp - same platform as Yosupo)
 * This is essentially the same as Yosupo but with different branding
 */

(function () {
  'use strict';

  const PLATFORM = 'library-checker';

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
    if (v.includes('AC') || v.includes('ACCEPTED')) return 'AC';
    if (v.includes('WA') || v.includes('WRONG')) return 'WA';
    if (v.includes('TLE') || v.includes('TIME')) return 'TLE';
    if (v.includes('MLE') || v.includes('MEMORY')) return 'MLE';
    if (v.includes('RE') || v.includes('RUNTIME')) return 'RE';
    if (v.includes('CE') || v.includes('COMPILE')) return 'CE';
    if (v.includes('IE') || v.includes('INTERNAL')) return 'IE';
    return verdict;
  }

  class LibraryCheckerExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/')) return 'submission';
      if (path.includes('/problem/')) return 'problem';
      if (path.includes('/submissions')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href?.match(/\/user\/([^/?]+)/);
        if (match) return match[1];
        return extractText(userLink);
      }
      return null;
    }

    getProblemCategory(problemId) {
      // Library Checker categorizes problems
      const categories = {
        aplusb: 'Sample',
        convolution_mod: 'Convolution',
        point_add_range_sum: 'Data Structure',
        range_affine_range_sum: 'Data Structure',
        vertex_add_path_sum: 'Tree',
        shortest_path: 'Graph',
        scc: 'Graph',
        two_sat: 'Graph',
        bipartitematching: 'Matching',
        matrix_det: 'Matrix',
        sqrt_mod: 'Number Theory',
      };

      for (const [key, cat] of Object.entries(categories)) {
        if (problemId?.toLowerCase().includes(key)) return cat;
      }
      return 'Algorithm';
    }

    async extractSubmission() {
      try {
        const subMatch = window.location.pathname.match(
          /\/submission\/([^/?]+)/
        );

        if (!subMatch) {
          log('No submission ID found');
          return null;
        }

        const submissionId = subMatch[1];
        log('Extracting submission:', submissionId);

        await waitForElement('.submission, main, table', 3000).catch(
          () => null
        );

        // Get problem info
        const problemLink = safeQuery('a[href*="/problem/"]');
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/problem\/([^/?]+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink) || problemId;
        }

        // Extract verdict
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery(
          '.badge, .status, [class*="verdict"], [class*="result"]'
        );
        if (statusEl) {
          verdict = normalizeVerdict(extractText(statusEl));
          const className = statusEl.className;
          if (
            className.includes('badge-success') ||
            className.includes('bg-success')
          )
            verdict = 'AC';
          else if (
            className.includes('badge-danger') ||
            className.includes('bg-danger')
          )
            verdict = 'WA';
        }

        // Extract time and memory
        let executionTime = null,
          memoryUsed = null;
        const rows = safeQueryAll('tr, .stat-row, td');
        for (const row of rows) {
          const text = extractText(row);
          const timeMatch = text.match(/(\d+)\s*ms/);
          const memMatch = text.match(/(\d+)\s*(KB|MB|MiB)/i);

          if (timeMatch) executionTime = parseInt(timeMatch[1]);
          if (memMatch) {
            memoryUsed = parseInt(memMatch[1]);
            if (memMatch[2].toUpperCase().includes('M')) memoryUsed *= 1024;
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
        if (langEl) {
          const text = extractText(langEl);
          if (text && !text.match(/^\d/)) language = text;
        }

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();
        const category = this.getProblemCategory(problemId);

        return {
          platform: this.platform,
          handle,
          problemId,
          problemName,
          problemUrl,
          submissionId,
          submissionUrl: window.location.href,
          verdict,
          language,
          executionTime,
          memoryUsed,
          submittedAt: null,
          sourceCode,
          category,
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
        '.highlight',
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
      new LibraryCheckerExtractor().init()
    );
  } else {
    new LibraryCheckerExtractor().init();
  }
})();
