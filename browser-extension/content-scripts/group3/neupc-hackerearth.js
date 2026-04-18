/**
 * NEUPC HackerEarth Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from HackerEarth
 */

(function () {
  'use strict';

  const PLATFORM = 'hackerearth';

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
    if (v.includes('ACCEPTED') || v === 'AC' || v.includes('CORRECT'))
      return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA' || v.includes('INCORRECT'))
      return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE') return 'RE';
    if (v.includes('COMPILATION ERROR') || v === 'CE') return 'CE';
    if (v.includes('PARTIALLY') || v.includes('PARTIAL')) return 'PARTIAL';
    if (
      v.includes('PENDING') ||
      v.includes('RUNNING') ||
      v.includes('EVALUATING')
    )
      return 'PENDING';
    return verdict;
  }

  class HackerEarthExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/')) return 'submission';
      if (path.includes('/problem/') || path.includes('/practice/'))
        return 'problem';
      if (path.includes('/submissions')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/@"], a[href*="/users/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match =
          href?.match(/\/@([^/]+)/) || href?.match(/\/users\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId = window.location.pathname.match(
          /\/submission\/([a-zA-Z0-9]+)/
        )?.[1];
        if (!submissionId) {
          log('No submission ID');
          return null;
        }

        log('Extracting:', submissionId);
        await waitForElement(
          '.submission-details, .he-submission, table',
          3000
        ).catch(() => null);

        const problemLink = safeQuery(
          'a[href*="/problem/"], a[href*="/practice/"]'
        );
        let problemId = null,
          problemUrl = null,
          problemName = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/(problem|practice)\/([^/]+)/);
          if (match) problemId = match[2];
          problemName = extractText(problemLink);
        }

        let verdict = 'UNKNOWN',
          language = 'Unknown',
          executionTime = null,
          memoryUsed = null;

        // HackerEarth uses various class-based status indicators
        const statusEl = safeQuery(
          '.status, .verdict, [class*="status"], [class*="result"]'
        );
        if (statusEl) {
          verdict = extractText(statusEl);
        }

        // Look for language selector or display
        const langEl = safeQuery(
          '.language, [class*="language"], select[name*="language"]'
        );
        if (langEl) {
          language = langEl.value || extractText(langEl);
        }

        // Extract time and memory from info sections
        const infoEls = safeQueryAll(
          '.info-item, .submission-stat, [class*="runtime"]'
        );
        for (const el of infoEls) {
          const text = extractText(el);
          if (text.match(/time/i)) {
            const match = text.match(/(\d+\.?\d*)\s*(ms|s)/i);
            if (match) {
              executionTime = parseFloat(match[1]);
              if (match[2].toLowerCase() === 's') executionTime *= 1000;
            }
          }
          if (text.match(/memory/i)) {
            const match = text.match(/(\d+\.?\d*)\s*(kb|mb)/i);
            if (match) {
              memoryUsed = parseFloat(match[1]);
              if (match[2].toLowerCase() === 'mb') memoryUsed *= 1024;
            }
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
      const selectors = [
        '.ace_content',
        '.CodeMirror-code',
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
      new HackerEarthExtractor().init()
    );
  } else {
    new HackerEarthExtractor().init();
  }
})();
