/**
 * NEUPC LOJ Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from LibreOJ (loj.ac)
 */

(function () {
  'use strict';

  const PLATFORM = 'loj';

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

  function extractText(el, context = document) {
    const elem = typeof el === 'string' ? safeQuery(el, context) : el;
    return elem ? elem.textContent.trim() : '';
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = safeQuery(selector);
      if (el) {
        resolve(el);
        return;
      }
      const obs = new MutationObserver(() => {
        const el = safeQuery(selector);
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
    if (v.includes('COMPILE') || v === 'CE') return 'CE';
    if (v.includes('PARTIAL')) return 'PARTIAL';
    if (v.includes('PENDING') || v.includes('JUDGING')) return 'PENDING';
    return verdict;
  }

  class LOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/submission/') || path.includes('/s/'))
        return 'submission';
      if (path.includes('/problem/') || path.includes('/p/')) return 'problem';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/user/"], a[href*="/u/"]');
      if (userLink) {
        const match = userLink.getAttribute('href')?.match(/\/(user|u)\/(\d+)/);
        if (match) return match[2];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId = window.location.pathname.match(
          /\/(submission|s)\/(\d+)/
        )?.[2];
        if (!submissionId) {
          log('No submission ID');
          return null;
        }

        log('Extracting:', submissionId);
        await waitForElement('.submission-item, .segment, table', 3000).catch(
          () => null
        );

        // LOJ uses semantic-ui, extract from segments or tables
        const problemLink = safeQuery('a[href*="/problem/"], a[href*="/p/"]');
        let problemId = null,
          problemUrl = null,
          problemName = null;

        if (problemLink) {
          problemUrl = problemLink.href;
          const match = problemUrl.match(/\/(problem|p)\/(\d+)/);
          if (match) problemId = match[2];
          problemName = extractText(problemLink);
        }

        // Extract verdict, time, memory from page
        let verdict = 'UNKNOWN',
          language = 'Unknown',
          executionTime = null,
          memoryUsed = null;

        // Look for status labels
        const statusEl = safeQuery(
          '.status, .verdict, [class*="status"], .label'
        );
        if (statusEl) {
          verdict = extractText(statusEl);
        }

        // Parse info from rows/segments
        const segments = safeQueryAll('.segment, .info-row, tr');
        for (const seg of segments) {
          const text = extractText(seg);
          if (text.match(/language|语言/i)) {
            const match = text.match(
              /(c\+\+|python|java|pascal|rust|go|haskell)/i
            );
            if (match) language = match[1];
          }
          if (text.match(/time|时间/i)) {
            const match = text.match(/(\d+)\s*ms/i);
            if (match) executionTime = parseInt(match[1]);
          }
          if (text.match(/memory|内存/i)) {
            const match = text.match(/(\d+)\s*(kb|mib|mb)/i);
            if (match) {
              memoryUsed = parseInt(match[1]);
              if (match[2].toLowerCase().includes('m')) memoryUsed *= 1024;
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
      const selectors = ['pre code', '.code-box', 'pre', '.source'];
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
      new LOJExtractor().init()
    );
  } else {
    new LOJExtractor().init();
  }
})();
