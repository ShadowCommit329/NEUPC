/**
 * NEUPC Luogu Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Luogu (luogu.com.cn) - Popular Chinese OJ
 */

(function () {
  'use strict';

  const PLATFORM = 'luogu';

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
    if (v.includes('WRONG') || v === 'WA' || v.includes('答案错误'))
      return 'WA';
    if (v.includes('TIME') || v === 'TLE' || v.includes('超时')) return 'TLE';
    if (v.includes('MEMORY') || v === 'MLE' || v.includes('超内存'))
      return 'MLE';
    if (v.includes('RUNTIME') || v === 'RE' || v.includes('运行错误'))
      return 'RE';
    if (v.includes('COMPILE') || v === 'CE' || v.includes('编译错误'))
      return 'CE';
    if (v.includes('UNACCEPTED') || v === 'UKE') return 'WA';
    if (v.includes('PARTIAL') || v.includes('部分')) return 'PARTIAL';
    return verdict;
  }

  class LuoguExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/record/')) return 'submission';
      if (path.includes('/problem/')) return 'problem';
      if (path.includes('/user/')) return 'user';
      return 'unknown';
    }

    async getUserHandle() {
      // Luogu shows username in nav
      const userLink = safeQuery('a[href*="/user/"], .user-nav .username');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href?.match(/\/user\/(\d+)/);
        if (match) return match[1];
        return extractText(userLink);
      }
      return null;
    }

    async extractSubmission() {
      try {
        const recordMatch = window.location.pathname.match(/\/record\/(\d+)/);
        if (!recordMatch) {
          log('No record ID found');
          return null;
        }

        const submissionId = recordMatch[1];
        log('Extracting record:', submissionId);

        await waitForElement('.record-info, .status, main', 3000).catch(
          () => null
        );

        // Get problem info
        const problemLink = safeQuery('a[href*="/problem/"]');
        let problemId = null,
          problemName = null,
          problemUrl = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/problem\/([A-Z]?\d+)/i);
          if (match) problemId = match[1];
          problemName = extractText(problemLink);
        }

        // Extract verdict - Luogu uses colored status badges
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery(
          '.status, [class*="status"], .record-status'
        );
        if (statusEl) {
          verdict = normalizeVerdict(extractText(statusEl));
          // Also check class for status
          const className = statusEl.className;
          if (className.includes('passed') || className.includes('accepted'))
            verdict = 'AC';
          else if (className.includes('failed') || className.includes('wrong'))
            verdict = 'WA';
        }

        // Extract score (Luogu shows scores like 100/100)
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

        const infoEls = safeQueryAll('.info-row, .stat-item, td');
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
        if (langEl) {
          language = extractText(langEl);
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
        '.code-content',
        '.lfe-code',
        'pre code',
        '.source-code',
        'pre',
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
      new LuoguExtractor().init()
    );
  } else {
    new LuoguExtractor().init();
  }
})();
