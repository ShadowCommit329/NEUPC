/**
 * NEUPC TopCoder Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Note: TopCoder has limited DOM extraction - requires API sync
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES (inline)
  // ============================================================

  const PLATFORM = 'topcoder';

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

  function extractText(selectorOrElement, context = document) {
    const el =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;
    return el ? el.textContent.trim() : '';
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = verdict.toUpperCase().trim();

    if (
      v.includes('ACCEPTED') ||
      v === 'AC' ||
      v === 'OK' ||
      v.includes('PASSED')
    )
      return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA' || v.includes('FAILED'))
      return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE' || v === 'RTE') return 'RE';
    if (
      v.includes('COMPILATION ERROR') ||
      v === 'CE' ||
      v.includes('COMPILE ERROR')
    )
      return 'CE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING'))
      return 'PENDING';

    return verdict;
  }

  // ============================================================
  // TOPCODER EXTRACTOR
  // ============================================================

  class TopCoderExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      if (window.location.pathname.includes('/challenges/')) {
        return 'problem';
      }
      if (window.location.pathname.includes('/my-dashboard')) {
        return 'submissions';
      }
      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href*="/members/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/\/members\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      log('TopCoder requires manual API sync - extension support limited');
      log(
        'Visit your profile or challenge results page for submission history'
      );
      return null;
    }

    async init() {
      if (this.initialized) return;

      log('Initializing extractor...');

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'problem') {
        log('Challenge page detected - TopCoder has limited DOM extraction');
      } else if (pageType === 'submissions') {
        log('Dashboard page - TopCoder submissions require API sync');
      } else {
        log('Unknown page type, skipping');
      }

      this.initialized = true;
      log('Extractor initialized');
    }

    storeSubmission(submission) {
      const browserAPI =
        typeof chrome !== 'undefined'
          ? chrome
          : typeof browser !== 'undefined'
            ? browser
            : null;

      if (browserAPI && browserAPI.storage) {
        browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
          const cached = result.cachedSubmissions || {};
          const platformCache = cached[this.platform] || [];

          const exists = platformCache.some(
            (s) => s.submissionId === submission.submissionId
          );
          if (!exists) {
            platformCache.unshift(submission);
            if (platformCache.length > 100) {
              platformCache.pop();
            }
            cached[this.platform] = platformCache;
            browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
              log('Submission cached successfully');
              
              // Auto-sync if enabled and submission is AC
              this.autoSyncIfEnabled(submission);
            });
          } else {
            log('Submission already cached');
          }
        });
      } else {
        log('Browser storage API not available');
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

  // ============================================================
  // AUTO-INITIALIZE
  // ============================================================

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new TopCoderExtractor();
    extractor.init();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
