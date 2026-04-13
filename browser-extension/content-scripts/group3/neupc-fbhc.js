/**
 * NEUPC Facebook Hacker Cup Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Facebook Hacker Cup (Meta Hacker Cup)
 * Note: Facebook Hacker Cup moved to Meta platform
 */

(function () {
  'use strict';

  const PLATFORM = 'fbhc';

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

  class FBHCExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      const host = window.location.hostname;

      // Meta Hacker Cup (new platform)
      if (
        host.includes('facebook.com/codingcompetitions') ||
        host.includes('metacareers.com') ||
        host.includes('fb.com')
      ) {
        if (path.includes('/problem')) return 'problem';
        if (path.includes('/submission')) return 'submission';
        if (path.includes('/round') || path.includes('/contest'))
          return 'round';
        if (path.includes('/hacker-cup')) return 'hackercup';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // Facebook uses real names, try to get username or ID
      const profileEl = safeQuery(
        '[class*="profile"], a[href*="/profile"], a[href*="/user"]'
      );
      if (profileEl) {
        const href = profileEl.getAttribute('href');
        const match = href?.match(/\/(?:profile|user)\/([^/?]+)/);
        if (match) return match[1];
        return extractText(profileEl);
      }

      // Try to get from page data or scripts
      const scripts = safeQueryAll('script');
      for (const script of scripts) {
        const text = script.textContent;
        if (text.includes('user_id') || text.includes('username')) {
          const idMatch = text.match(/"user_id":\s*"?(\d+)"?/);
          if (idMatch) return `fb_${idMatch[1]}`;
          const nameMatch = text.match(/"username":\s*"([^"]+)"/);
          if (nameMatch) return nameMatch[1];
        }
      }

      return null;
    }

    getRoundInfo() {
      const path = window.location.pathname;
      const roundMatch =
        path.match(/\/round\/(\d+)/) || path.match(/\/(\d{4})\/round(\d+)/i);
      if (roundMatch) {
        return {
          roundId: roundMatch[1],
          roundName: `Round ${roundMatch[roundMatch.length - 1]}`,
        };
      }

      // Try to extract from page content
      const roundEl = safeQuery('h1, h2, [class*="round-title"]');
      if (roundEl) {
        const text = extractText(roundEl);
        const match =
          text.match(/Round\s*(\d+)/i) ||
          text.match(/(Qualification|Finals?)/i);
        if (match) {
          return {
            roundId: match[1].toLowerCase(),
            roundName: match[0],
          };
        }
      }

      return { roundId: 'unknown', roundName: 'Hacker Cup' };
    }

    async extractSubmission() {
      try {
        log('Extracting Facebook Hacker Cup submission...');

        await waitForElement(
          '[class*="problem"], [class*="submission"], main',
          3000
        ).catch(() => null);

        // Extract problem info
        const problemNameEl = safeQuery(
          'h1, h2, [class*="problem-title"], [class*="title"]'
        );
        let problemName = extractText(problemNameEl) || 'Unknown Problem';

        // Get problem ID from URL or content
        const problemMatch =
          window.location.pathname.match(/\/problem\/([^/]+)/) ||
          problemName.match(/^([A-Z])\.\s*/);
        let problemId = problemMatch ? problemMatch[1] : null;
        if (problemMatch && problemName.match(/^[A-Z]\.\s*/)) {
          problemName = problemName.replace(/^[A-Z]\.\s*/, '');
        }

        const roundInfo = this.getRoundInfo();

        // Look for verdict/status - Facebook often uses colored indicators
        let verdict = 'UNKNOWN';

        // Check for explicit status elements
        const verdictSelectors = [
          '[class*="verdict"]',
          '[class*="status"]',
          '[class*="result"]',
          '[class*="correct"]',
          '[class*="wrong"]',
          '.score',
          '[data-testid*="result"]',
        ];

        for (const sel of verdictSelectors) {
          const el = safeQuery(sel);
          if (el) {
            const text = extractText(el);
            if (text) {
              verdict = normalizeVerdict(text);
              break;
            }
            // Check for visual indicators (green/red classes)
            const className = el.className;
            if (
              className.includes('success') ||
              className.includes('correct') ||
              className.includes('green')
            ) {
              verdict = 'AC';
              break;
            }
            if (
              className.includes('error') ||
              className.includes('wrong') ||
              className.includes('red')
            ) {
              verdict = 'WA';
              break;
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

  // Check for points/score display
        const scoreEl = safeQuery('[class*="score"], [class*="points"]');
        if (scoreEl && verdict === 'UNKNOWN') {
          const scoreText = extractText(scoreEl);
          const scoreMatch = scoreText.match(
            /(\d+)\s*(?:\/\s*(\d+)|pts?|points?)/i
          );
          if (scoreMatch) {
            const earned = parseInt(scoreMatch[1]);
            const total = scoreMatch[2] ? parseInt(scoreMatch[2]) : null;
            if (total && earned === total) verdict = 'AC';
            else if (earned > 0) verdict = 'PARTIAL';
            else verdict = 'WA';
          }
        }

        // Extract language (if available)
        let language = 'Unknown';
        const langEl = safeQuery(
          '[class*="language"], select[name*="lang"], [class*="file-type"]'
        );
        if (langEl) {
          language = langEl.value || extractText(langEl);
        }

        // Check file upload for language hints
        const fileInput = safeQuery('input[type="file"], [class*="upload"]');
        if (fileInput && language === 'Unknown') {
          const acceptAttr = fileInput.getAttribute('accept');
          if (acceptAttr) {
            if (acceptAttr.includes('.py')) language = 'Python';
            else if (acceptAttr.includes('.cpp') || acceptAttr.includes('.cc'))
              language = 'C++';
            else if (acceptAttr.includes('.java')) language = 'Java';
          }
        }

        const sourceCode = await this.extractSourceCode();
        const handle = await this.getUserHandle();

        const submissionId = `fbhc-${roundInfo.roundId}-${problemId || Date.now()}`;

        return {
          platform: this.platform,
          handle,
          problemId: problemId || roundInfo.roundId,
          problemName: `Hacker Cup ${roundInfo.roundName}: ${problemName}`,
          problemUrl: window.location.href,
          submissionId,
          submissionUrl: window.location.href,
          verdict,
          language,
          executionTime: null, // FB doesn't typically show execution time
          memoryUsed: null,
          submittedAt: new Date().toISOString(),
          sourceCode,
          contestId: roundInfo.roundId,
          roundName: roundInfo.roundName,
        };
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractSourceCode() {
      // Facebook Hacker Cup typically uses file uploads, but may show code
      const selectors = [
        '.ace_content',
        '.CodeMirror-code',
        'pre code',
        '.source-code',
        '[class*="code-viewer"]',
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
      log('Initializing Facebook Hacker Cup extractor...');

      const pageType = this.detectPageType();
      log('Detected page type:', pageType);

      if (pageType === 'submission' || pageType === 'problem') {
        const submission = await this.extractSubmission();
        if (submission) {
          log('Extracted submission:', submission);
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
            api\.storage\.local\.set\(\{ cachedSubmissions: cached \}\);
              
              // Auto-sync if enabled and submission is AC
              this.storeSubmission && this.autoSyncIfEnabled && this.autoSyncIfEnabled(submission);
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      new FBHCExtractor().init()
    );
  } else {
    new FBHCExtractor().init();
  }
})();
