/**
 * NEUPC VJudge Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from VJudge
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES (inline)
  // ============================================================

  const PLATFORM = 'vjudge';

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

  function extractText(selectorOrElement, context = document) {
    const el =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;
    return el ? el.textContent.trim() : '';
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = safeQuery(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = safeQuery(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = verdict.toUpperCase().trim();

    if (v.includes('ACCEPTED') || v === 'AC' || v === 'OK') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
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
  // VJUDGE EXTRACTOR
  // ============================================================

  class VJudgeExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (path.includes('/solution/')) {
        return 'submission';
      }
      if (path.includes('/status')) {
        return 'submissions';
      }

      return 'unknown';
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href^="/user/"]');
      if (userLink) {
        const href = userLink.getAttribute('href');
        const match = href.match(/\/user\/([^/]+)/);
        if (match) return match[1];
      }
      return null;
    }

    async extractSubmission() {
      try {
        const submissionId =
          window.location.pathname.match(/\/solution\/(\d+)/)?.[1];
        if (!submissionId) {
          log('No submission ID in URL');
          return null;
        }

        log('Extracting submission:', submissionId);

        await waitForElement(
          '#solution-details, .solution, [class*="solution"]',
          3000
        ).catch(() => null);

        // Extract problem info
        const problemInfo = extractText(
          '[class*="problem"], .title, .problem-title'
        );
        const problemId = problemInfo.match(/[A-Z0-9]+/)?.[0];
        log('Found problem info:', problemInfo, 'ID:', problemId);

        // Extract verdict
        let verdict = 'UNKNOWN';
        const verdictSelectors = [
          '[class*="status"]',
          '.verdict',
          '[class*="result"]',
        ];
        for (const selector of verdictSelectors) {
          const el = safeQuery(selector);
          if (el) {
            verdict = extractText(el);
            if (verdict) {
              log('Found verdict:', verdict);
              break;
            }
          }
        }

        // Extract language
        let language = 'Unknown';
        const langElement = safeQuery('[class*="language"]');
        if (langElement) {
          language = extractText(langElement);
          log('Found language:', language);
        }

        // Extract execution time
        let executionTime = null;
        const timeElement = safeQuery('[class*="time"]');
        if (timeElement) {
          const timeText = extractText(timeElement);
          const match = timeText.match(/(\d+)/);
          if (match) {
            executionTime = parseInt(match[1]);
            log('Found execution time:', executionTime);
          }
        }

        // Extract origin platform (VJudge aggregates multiple OJs)
        const originPlatform = extractText('[class*="oj"], .origin-oj');
        log('Origin platform:', originPlatform);

        // Extract source code
        const sourceCode = await this.extractSourceCode();

        const handle = await this.getUserHandle();

        const submission = {
          platform: this.platform,
          handle,
          problemId,
          problemName: problemInfo,
          problemUrl: null,
          submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language,
          executionTime,
          memoryUsed: null,
          submittedAt: new Date().toISOString(),
          sourceCode,
          originPlatform: originPlatform || null,
        };

        log('Extracted submission:', submission);
        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractSourceCode() {
      try {
        const codeSelectors = [
          'pre code',
          '.code-content',
          'pre',
          '.source-code',
        ];
        for (const selector of codeSelectors) {
          const codeElement = safeQuery(selector);
          if (codeElement) {
            const sourceCode = codeElement.textContent.trim();
            if (sourceCode && sourceCode.length > 10) {
              log(`Extracted source code: ${sourceCode.length} characters`);
              return sourceCode;
            }
          }
        }
        log('Source code element not found');
        return null;
      } catch (error) {
        logError('Error extracting source code:', error);
        return null;
      }
    }

    async init() {
      if (this.initialized) return;

      log('Initializing extractor...');

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        log('Processing submission page');
        const submission = await this.extractSubmission();

        if (submission) {
          log('Successfully extracted submission!');
          log('Submission data:', JSON.stringify(submission, null, 2));
          this.storeSubmission(submission);
        } else {
          log('Failed to extract submission data');
        }
      } else if (pageType === 'submissions') {
        log('Submissions list page - watching for navigation');
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
    const extractor = new VJudgeExtractor();
    extractor.init();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
