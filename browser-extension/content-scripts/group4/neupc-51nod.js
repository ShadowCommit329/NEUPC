/**
 * NEUPC 51Nod Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from 51Nod (51nod.com) - Chinese algorithm OJ
 */

(function () {
  'use strict';

  const PLATFORM = '51nod';

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
    if (v.includes('ACCEPTED') || v === 'AC' || v.includes('正确')) return 'AC';
    if (v.includes('WRONG') || v === 'WA' || v.includes('答案错误'))
      return 'WA';
    if (v.includes('TIME') || v === 'TLE' || v.includes('超时')) return 'TLE';
    if (v.includes('MEMORY') || v === 'MLE' || v.includes('超内存'))
      return 'MLE';
    if (v.includes('RUNTIME') || v === 'RE' || v.includes('运行错误'))
      return 'RE';
    if (v.includes('COMPILE') || v === 'CE' || v.includes('编译错误'))
      return 'CE';
    return verdict;
  }

  class Nod51Extractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/') || path.includes('/Submit/'))
        return 'submission';
      if (path.includes('/Problem/') || path.includes('/problem/'))
        return 'problem';
      if (path.includes('/Status/') || path.includes('/status/'))
        return 'status';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/User/"], a[href*="/user/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href?.match(/\/(?:User|user)\/(\d+)/i);
        if (match) return match[1];
        return extractText(userLink);
      }
      return null;
    }

    async extractSubmission() {
      try {
        const subMatch =
          window.location.pathname.match(/\/submission\/(\d+)/i) ||
          window.location.pathname.match(/\/Submit\/(\d+)/i);

        if (!subMatch) {
          log('No submission ID found');
          return null;
        }

        const submissionId = subMatch[1];
        log('Extracting submission:', submissionId);

        await waitForElement('.submission, .result, main', 3000).catch(
          () => null
        );

        // Get problem info
        const problemLink = safeQuery(
          'a[href*="/Problem/"], a[href*="/problem/"]'
        );
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/Problem\/(\d+)/i);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        // Extract verdict
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery(
          '.status, .result, [class*="status"], [class*="result"]'
        );
        if (statusEl) {
          verdict = normalizeVerdict(extractText(statusEl));
        }

        // Extract time and memory
        let executionTime = null,
          memoryUsed = null;
        const infoEls = safeQueryAll('.info-item, .stat, td');
        for (const el of infoEls) {
          const text = extractText(el);
          const timeMatch = text.match(/(\d+)\s*ms/);
          const memMatch = text.match(/(\d+)\s*(KB|MB)/i);

          if (timeMatch) executionTime = parseInt(timeMatch[1]);
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
          problemName: problemName || (problemId ? `51Nod ${problemId}` : null),
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
      new Nod51Extractor().init()
    );
  } else {
    new Nod51Extractor().init();
  }
})();
