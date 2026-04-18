/**
 * NEUPC LeetCode CN Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from LeetCode China (leetcode.cn)
 */

(function () {
  'use strict';

  const PLATFORM = 'leetcode-cn';

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
    if (v.includes('ACCEPTED') || v === 'AC' || v.includes('通过')) return 'AC';
    if (v.includes('WRONG') || v === 'WA' || v.includes('解答错误'))
      return 'WA';
    if (v.includes('TIME') || v === 'TLE' || v.includes('超出时间'))
      return 'TLE';
    if (v.includes('MEMORY') || v === 'MLE' || v.includes('超出内存'))
      return 'MLE';
    if (v.includes('RUNTIME') || v === 'RE' || v.includes('执行出错'))
      return 'RE';
    if (v.includes('COMPILE') || v === 'CE' || v.includes('编译出错'))
      return 'CE';
    if (v.includes('PENDING') || v.includes('执行中')) return 'PENDING';
    return verdict;
  }

  class LeetCodeCNExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submissions/detail/')) return 'submission';
      if (path.includes('/submissions')) return 'submissions-list';
      if (path.includes('/problems/') && path.includes('/solution'))
        return 'solution';
      if (path.includes('/problems/')) return 'problem';
      return 'unknown';
    }

    async getUserHandle() {
      // Try to get from profile link or nav
      const profileLink = safeQuery('a[href*="/u/"], a[href*="/profile/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match =
          href?.match(/\/u\/([^/]+)/) || href?.match(/\/profile\/([^/]+)/);
        if (match) return match[1];
      }
      // Try from page data
      const scripts = safeQueryAll('script');
      for (const s of scripts) {
        const match = s.textContent.match(/"username":\s*"([^"]+)"/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionMatch = window.location.pathname.match(
          /\/submissions\/detail\/(\d+)/
        );
        if (!submissionMatch) {
          log('No submission ID found');
          return null;
        }

        const submissionId = submissionMatch[1];
        log('Extracting submission:', submissionId);

        await waitForElement(
          '[class*="result"], [class*="status"], .submission-detail',
          3000
        ).catch(() => null);

        // Get problem info from breadcrumb or title
        const problemLink = safeQuery('a[href*="/problems/"]');
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/problems\/([^/]+)/);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        // Extract verdict - LeetCode CN uses similar classes to LeetCode
        let verdict = 'UNKNOWN';
        const verdictSelectors = [
          '[class*="text-success"]',
          '[class*="text-danger"]',
          '[class*="status"]',
          '[data-state]',
          '.result span',
        ];

        for (const sel of verdictSelectors) {
          const el = safeQuery(sel);
          if (el) {
            const text = extractText(el);
            if (text) {
              verdict = normalizeVerdict(text);
              if (verdict !== 'UNKNOWN') break;
            }
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

  // Extract runtime and memory
        let executionTime = null,
          memoryUsed = null;

        const statsEls = safeQueryAll(
          '[class*="runtime"], [class*="memory"], .info-line'
        );
        for (const el of statsEls) {
          const text = extractText(el);
          const timeMatch = text.match(/(\d+)\s*ms/);
          const memMatch = text.match(/(\d+\.?\d*)\s*(MB|KB)/i);

          if (timeMatch) executionTime = parseInt(timeMatch[1]);
          if (memMatch) {
            memoryUsed = parseFloat(memMatch[1]);
            if (memMatch[2].toUpperCase() === 'MB') memoryUsed *= 1024;
          }
        }

        // Extract language
        let language = 'Unknown';
        const langEl = safeQuery('[class*="language"], .lang-btn, select');
        if (langEl) {
          language = langEl.value || extractText(langEl);
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
        '.view-lines',
        '.monaco-editor',
        '.CodeMirror-code',
        'pre code',
        '.code-area',
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
      new LeetCodeCNExtractor().init()
    );
  } else {
    new LeetCodeCNExtractor().init();
  }
})();
