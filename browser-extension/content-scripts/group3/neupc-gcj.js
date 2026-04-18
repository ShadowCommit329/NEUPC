/**
 * NEUPC Google Code Jam / Kick Start / Hash Code Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Google Coding Competitions
 * Note: Google has discontinued Code Jam, but old submissions may be viewable
 */

(function () {
  'use strict';

  const PLATFORM = 'gcj';

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
      v.includes('CORRECT') ||
      v.includes('ACCEPTED') ||
      v === 'AC' ||
      v.includes('PASSED')
    )
      return 'AC';
    if (
      v.includes('WRONG') ||
      v === 'WA' ||
      v.includes('INCORRECT') ||
      v.includes('FAILED')
    )
      return 'WA';
    if (v.includes('TIME') || v === 'TLE' || v.includes('TIMEOUT'))
      return 'TLE';
    if (v.includes('MEMORY') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME') || v === 'RE' || v.includes('ERROR')) return 'RE';
    if (v.includes('COMPILE') || v === 'CE') return 'CE';
    if (v.includes('PARTIAL')) return 'PARTIAL';
    if (v.includes('PENDING') || v.includes('RUNNING') || v.includes('JUDGING'))
      return 'PENDING';
    return verdict;
  }

  class GCJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      const host = window.location.hostname;

      // Google Coding Competitions platform
      if (host.includes('codingcompetitions.withgoogle.com')) {
        if (path.includes('/submissions')) return 'submissions';
        if (path.includes('/round/') && path.includes('/problem/'))
          return 'problem';
        if (path.includes('/round/')) return 'round';
        if (path.includes('/dashboard')) return 'dashboard';
      }

      // Old Code Jam domain (archived)
      if (
        host.includes('codejam.withgoogle.com') ||
        host.includes('code.google.com')
      ) {
        if (path.includes('/submission')) return 'submission';
        if (path.includes('/dashboard')) return 'dashboard';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // Google uses profile photos and names
      const profileEl = safeQuery(
        '[class*="user-name"], [class*="profile"], .username'
      );
      if (profileEl) {
        const text = extractText(profileEl);
        if (text) return text;
      }

      // Check for signed-in user info
      const accountEl = safeQuery('a[href*="/u/"], [data-email]');
      if (accountEl) {
        const email = accountEl.getAttribute('data-email');
        if (email) return email.split('@')[0];
        const href = accountEl.getAttribute('href');
        const match = href?.match(/\/u\/(\d+)/);
        if (match) return `user_${match[1]}`;
      }

      return null;
    }

    getCompetitionType() {
      const host = window.location.hostname;
      const path = window.location.pathname;

      if (path.includes('codejam') || path.includes('code-jam'))
        return 'Code Jam';
      if (path.includes('kickstart') || path.includes('kick-start'))
        return 'Kick Start';
      if (path.includes('hashcode') || path.includes('hash-code'))
        return 'Hash Code';
      if (host.includes('codejam')) return 'Code Jam';

      return 'Google Coding Competition';
    }

    async extractSubmission() {
      try {
        log('Extracting submission from Google Coding Competitions...');

        await waitForElement(
          '[class*="submission"], [class*="problem"], table',
          3000
        ).catch(() => null);

        // Extract problem info from page
        const problemNameEl = safeQuery(
          'h1, h2, [class*="problem-title"], [class*="task-name"]'
        );
        let problemName = extractText(problemNameEl) || 'Unknown Problem';

        // Try to get problem ID from URL
        const problemMatch =
          window.location.pathname.match(/\/problem\/([^/]+)/) ||
          window.location.pathname.match(/\/([A-Z0-9]+)$/);
        const problemId = problemMatch ? problemMatch[1] : null;

        // Extract round/contest info
        const roundMatch = window.location.pathname.match(/\/round\/([^/]+)/);
        const roundId = roundMatch ? roundMatch[1] : null;

        // Look for verdict/status
        let verdict = 'UNKNOWN';
        const verdictEl = safeQuery(
          '[class*="verdict"], [class*="status"], [class*="result"], .score'
        );
        if (verdictEl) {
          const text = extractText(verdictEl);
          verdict = normalizeVerdict(text);
        }

        // Check for score-based results (GCJ often shows points)
        const scoreEl = safeQuery('[class*="score"], [class*="points"]');
        if (scoreEl) {
          const scoreText = extractText(scoreEl);
          const scoreMatch = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
          if (scoreMatch) {
            const [, earned, total] = scoreMatch;
            if (earned === total) verdict = 'AC';
            else if (parseInt(earned) > 0) verdict = 'PARTIAL';
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

  // Extract language
        let language = 'Unknown';
        const langEl = safeQuery(
          '[class*="language"], select[name*="lang"], .lang-select'
        );
        if (langEl) {
          language = langEl.value || extractText(langEl);
        }

        // Extract execution time
        let executionTime = null;
        const timeEl = safeQuery('[class*="time"], [class*="runtime"]');
        if (timeEl) {
          const timeText = extractText(timeEl);
          const timeMatch = timeText.match(/(\d+\.?\d*)\s*(ms|s)/i);
          if (timeMatch) {
            executionTime = parseFloat(timeMatch[1]);
            if (timeMatch[2].toLowerCase() === 's') executionTime *= 1000;
          }
        }

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();
        const competitionType = this.getCompetitionType();

        const submissionId = `gcj-${roundId || 'unknown'}-${problemId || Date.now()}`;

        return {
          platform: this.platform,
          handle,
          problemId: problemId || roundId,
          problemName: `${competitionType}: ${problemName}`,
          problemUrl: window.location.href,
          submissionId,
          submissionUrl: window.location.href,
          verdict,
          language,
          executionTime,
          memoryUsed: null,
          submittedAt: null,
          sourceCode,
          contestId: roundId,
          competitionType,
        };
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const selectors = [
        '.ace_content',
        '.CodeMirror-code',
        'pre code',
        '.source-code',
        '[class*="code-editor"]',
        'textarea[name*="code"]',
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
      log('Initializing Google Coding Competitions extractor...');

      const pageType = this.detectPageType();
      log('Detected page type:', pageType);

      if (pageType === 'submission' || pageType === 'problem') {
        const submission = await this.extractSubmission();
        if (submission) {
          log('Extracted submission:', submission);
          this.storeSubmission(submission);
        }
      } else if (pageType === 'submissions' || pageType === 'dashboard') {
        // Could implement bulk extraction from submission list
        log('On submissions/dashboard page - bulk extraction not implemented');
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
              
              // Auto-sync if enabled and submission is AC
              this.storeSubmission && this.autoSyncIfEnabled && this.autoSyncIfEnabled(submission);
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new GCJExtractor().init()
    );
  } else {
    new GCJExtractor().init();
  }
})();
