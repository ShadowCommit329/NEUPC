/**
 * NEUPC Exercism Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts exercise completion data from Exercism
 */

(function () {
  'use strict';

  const PLATFORM = 'exercism';

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
    if (
      v.includes('PASSED') ||
      v.includes('COMPLETED') ||
      v.includes('SUCCESS')
    )
      return 'AC';
    if (v.includes('FAILED') || v.includes('ERROR')) return 'WA';
    return verdict;
  }

  class ExercismExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/exercises/') && path.includes('/iterations'))
        return 'submission';
      if (path.includes('/exercises/')) return 'problem';
      if (path.includes('/tracks/')) return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/profiles/"]');
      if (userLink) {
        const match = userLink
          .getAttribute('href')
          ?.match(/\/profiles\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        // Extract track and exercise from URL
        const pathMatch = window.location.pathname.match(
          /\/tracks\/([^/]+)\/exercises\/([^/]+)/
        );
        if (!pathMatch) {
          log('No exercise found in URL');
          return null;
        }

        const track = pathMatch[1];
        const exerciseId = pathMatch[2];
        log('Extracting:', track, exerciseId);

        await waitForElement(
          '.iteration, .solution, .exercise-container',
          3000
        ).catch(() => null);

        // Get exercise name
        const titleEl = safeQuery('h1, .exercise-title, [class*="title"]');
        const problemName = extractText(titleEl) || exerciseId;

        // Language is the track
        const language = track.charAt(0).toUpperCase() + track.slice(1);

        // Check if completed
        let verdict = 'UNKNOWN';
        const statusEl = safeQuery('.completed, .passed, [class*="status"]');
        if (statusEl) {
          const text = extractText(statusEl).toLowerCase();
          if (text.includes('completed') || text.includes('passed')) {
            verdict = 'AC';
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

  // Get iteration number
        const iterationEl = safeQuery(
          '.iteration-number, [class*="iteration"]'
        );
        const iteration = extractText(iterationEl) || '1';

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();
        const submissionId = `${track}-${exerciseId}-${iteration}`;

        return {
          platform: this.platform,
          handle,
          problemId: exerciseId,
          problemName,
          problemUrl: `https://exercism.org/tracks/${track}/exercises/${exerciseId}`,
          submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language,
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode,
          track,
        };
      } catch (error) {
        logError('Error:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const selectors = ['pre code', '.code-mirror', '.ace_content', 'pre'];
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new ExercismExtractor().init()
    );
  } else {
    new ExercismExtractor().init();
  }
})();
