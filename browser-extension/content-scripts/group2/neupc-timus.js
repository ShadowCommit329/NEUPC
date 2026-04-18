/**
 * NEUPC Timus Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Timus Online Judge (Russia - Ural University)
 */

(function () {
  'use strict';

  const PLATFORM = 'timus';

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
    if (v.includes('RUNTIME ERROR') || v === 'RE' || v.includes('CRASH'))
      return 'RE';
    if (v.includes('COMPILATION ERROR') || v === 'CE') return 'CE';
    if (v.includes('OUTPUT LIMIT')) return 'OLE';
    if (
      v.includes('PENDING') ||
      v.includes('RUNNING') ||
      v.includes('COMPILING')
    )
      return 'PENDING';
    return verdict;
  }

  class TimusExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path.includes('/status.aspx') && params.get('id'))
        return 'submission';
      if (path.includes('/status.aspx')) return 'submissions';
      if (path.includes('/problem.aspx')) return 'problem';
      return 'unknown';
    }

    async getUserHandle() {
      const params = new URLSearchParams(window.location.search);
      const authorId = params.get('author');
      if (authorId) return authorId;

      const userLink = safeQuery('a[href*="author.aspx"]');
      if (userLink) {
        const match = userLink.getAttribute('href')?.match(/id=(\d+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const params = new URLSearchParams(window.location.search);
        const submissionId = params.get('id');
        if (!submissionId) {
          log('No submission ID');
          return null;
        }

        log('Extracting:', submissionId);
        await waitForElement('table.status', 3000).catch(() => null);

        // Timus shows submission in a status table
        const rows = safeQueryAll('table.status tr');
        let problemId = null,
          problemUrl = null,
          problemName = null;
        let verdict = 'UNKNOWN',
          language = 'Unknown',
          executionTime = null,
          memoryUsed = null;

        for (const row of rows) {
          const cells = safeQueryAll('td', row);
          if (cells.length < 5) continue;

          // Check if this row matches our submission
          const idCell = extractText(cells[0]);
          if (
            idCell === submissionId ||
            cells[0].querySelector(`a[href*="id=${submissionId}"]`)
          ) {
            // Typical Timus columns: ID, Date, Author, Problem, Language, Verdict, Test, Time, Memory

            // Problem (usually column 3 or 4)
            const problemCell = cells[3] || cells[2];
            const problemLink = problemCell?.querySelector(
              'a[href*="problem.aspx"]'
            );
            if (problemLink) {
              problemUrl = problemLink.href;
              const match = problemUrl.match(/num=(\d+)/);
              if (match) problemId = match[1];
              problemName = extractText(problemLink);
            }

            // Language
            if (cells[4]) language = extractText(cells[4]);

            // Verdict
            if (cells[5]) verdict = extractText(cells[5]);

            // Time (ms)
            if (cells[7]) {
              const match = extractText(cells[7]).match(/(\d+\.?\d*)/);
              if (match) executionTime = parseFloat(match[1]) * 1000; // Timus shows in seconds
            }

            // Memory (KB)
            if (cells[8]) {
              const match = extractText(cells[8]).match(/(\d+)/);
              if (match) memoryUsed = parseInt(match[1]);
            }

            break;
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
      // Timus may show source code in a pre or textarea
      const selectors = ['pre', 'textarea.source', '.source-code'];
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
      new TimusExtractor().init()
    );
  } else {
    new TimusExtractor().init();
  }
})();
