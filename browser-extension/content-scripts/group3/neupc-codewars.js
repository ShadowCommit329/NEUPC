/**
 * NEUPC Codewars Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts kata completion data from Codewars
 */

(function () {
  'use strict';

  const PLATFORM = 'codewars';

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
    if (v.includes('TIMEOUT')) return 'TLE';
    return verdict;
  }

  class CodewarsExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/kata/') && path.includes('/solutions'))
        return 'submission';
      if (path.includes('/kata/')) return 'problem';
      if (path.includes('/users/') && path.includes('/completed'))
        return 'submissions';
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/users/"]');
      if (userLink) {
        const match = userLink.getAttribute('href')?.match(/\/users\/([^/]+)/);
        if (match) return match[1];
      }
      // Also check profile dropdown
      const profileEl = safeQuery('.profile-pic, [class*="username"]');
      if (profileEl) {
        const nameEl = profileEl.closest('a');
        if (nameEl) {
          const match = nameEl.getAttribute('href')?.match(/\/users\/([^/]+)/);
          if (match) return match[1];
        }
      }
      return null;
    }

    async extractSubmission() {
      try {
        // Codewars kata ID from URL
        const kataId =
          window.location.pathname.match(/\/kata\/([a-z0-9]+)/)?.[1];
        if (!kataId) {
          log('No kata ID');
          return null;
        }

        log('Extracting kata:', kataId);
        await waitForElement(
          '.solutions, .solution-list, .kata-container',
          3000
        ).catch(() => null);

        // Get kata name
        const kataTitle = safeQuery('h4, .kata-title, [class*="title"]');
        const problemName = extractText(kataTitle) || kataId;

        // Get language from solution or page
        let language = 'Unknown';
        const langEl = safeQuery(
          '.language-selector .is-active, [class*="language"] .selected, .solution-language'
        );
        if (langEl) {
          language = extractText(langEl);
        }

        // Solutions page shows completed solutions
        const solutionEl = safeQuery('.solution, .code-area, pre code');
        let verdict = 'AC'; // If we're on solutions page, it was accepted
        let sourceCode = null;

        if (solutionEl) {
          sourceCode = solutionEl.textContent.trim();
        }

        // Extract kata difficulty (kyu)
        const kyuEl = safeQuery('[class*="kyu"], .kata-kyu, .inner-small-hex');
        const difficulty = extractText(kyuEl) || null;

        const handle = await this.getUserHandle();
        const submissionId = `${kataId}-${language.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        return {
          platform: this.platform,
          handle,
          problemId: kataId,
          problemName,
          problemUrl: `https://www.codewars.com/kata/${kataId}`,
          submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language,
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode,
          difficulty,
        };
      } catch (error) {
        logError('Error:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const selectors = [
        '.solution code',
        'pre code',
        '.CodeMirror-code',
        '.ace_content',
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
      new CodewarsExtractor().init()
    );
  } else {
    new CodewarsExtractor().init();
  }
})();
