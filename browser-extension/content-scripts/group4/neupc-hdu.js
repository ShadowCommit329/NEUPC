/**
 * NEUPC HDU (Hangzhou Dianzi University OJ) Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from HDU OJ (acm.hdu.edu.cn)
 */

(function () {
  'use strict';

  const PLATFORM = 'hdu';

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
    if (v.includes('OUTPUT LIMIT')) return 'OLE';
    return verdict;
  }

  class HDUExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path.includes('viewcode') || search.includes('rid='))
        return 'submission';
      if (path.includes('status.php')) return 'status';
      if (path.includes('showproblem')) return 'problem';
      return 'unknown';
    }

    async getUserHandle() {
      const userLinks = safeQueryAll('a[href*="userstatus"]');
      for (const link of userLinks) {
        const href = link.getAttribute('href');
        const match = href?.match(/user=([^&]+)/);
        if (match) return decodeURIComponent(match[1]);
      }
      return null;
    }

    async extractFromStatusPage() {
      try {
        log('Extracting from status page...');

        const rows = safeQueryAll('table tr');
        const submissions = [];

        for (let i = 1; i < rows.length && i < 20; i++) {
          const cells = safeQueryAll('td', rows[i]);
          if (cells.length < 9) continue;

          const runId = extractText(cells[0]);
          const submitTime = extractText(cells[1]);
          const verdict = normalizeVerdict(extractText(cells[2]));
          const problemId = extractText(cells[3]);
          const timeText = extractText(cells[4]);
          const memoryText = extractText(cells[5]);
          const language = extractText(cells[7]);
          const user = extractText(cells[8]);

          let memoryUsed = null,
            executionTime = null;
          const memMatch = memoryText.match(/(\d+)/);
          if (memMatch) memoryUsed = parseInt(memMatch[1]);
          const timeMatch = timeText.match(/(\d+)/);
          if (timeMatch) executionTime = parseInt(timeMatch[1]);

          submissions.push({
            platform: this.platform,
            handle: user,
            problemId,
            problemName: `HDU ${problemId}`,
            problemUrl: `https://acm.hdu.edu.cn/showproblem.php?pid=${problemId}`,
            submissionId: runId,
            submissionUrl: `https://acm.hdu.edu.cn/viewcode.php?rid=${runId}`,
            verdict,
            language,
            executionTime,
            memoryUsed,
            submittedAt: submitTime || null,
            sourceCode: null,
          });
        }

        return submissions;
      } catch (error) {
        logError('Error:', error);
        return [];
      }
    }

    async extractSubmission() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const submissionId = urlParams.get('rid');

        if (!submissionId) {
          log('No run ID found');
          return null;
        }

        log('Extracting submission:', submissionId);

        const sourceEl = safeQuery('textarea, pre');
        const sourceCode = sourceEl ? extractText(sourceEl) : null;

        // Try to extract problem info from page
        const problemLink = safeQuery('a[href*="showproblem"]');
        let problemId = null;
        if (problemLink) {
          const match = problemLink.href.match(/pid=(\d+)/);
          if (match) problemId = match[1];
        }

        return {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId,
          problemName: problemId ? `HDU ${problemId}` : null,
          problemUrl: problemId
            ? `https://acm.hdu.edu.cn/showproblem.php?pid=${problemId}`
            : null,
          submissionId,
          submissionUrl: window.location.href,
          verdict: 'UNKNOWN',
          language: 'Unknown',
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode,
        };
      } catch (error) {
        logError('Error:', error);
        return null;
      }
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
      } else if (pageType === 'status') {
        const submissions = await this.extractFromStatusPage();
        for (const s of submissions) {
          this.storeSubmission(s);
        }
        log('Extracted submissions:', submissions.length);
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
      new HDUExtractor().init()
    );
  } else {
    new HDUExtractor().init();
  }
})();
