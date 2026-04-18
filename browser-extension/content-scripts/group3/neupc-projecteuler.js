/**
 * NEUPC Project Euler Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission data from Project Euler
 * Note: Project Euler doesn't show traditional submissions - tracks solved problems
 */

(function () {
  'use strict';

  const PLATFORM = 'projecteuler';

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

  class ProjectEulerExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;
      if (path.includes('/problem=')) return 'problem';
      if (path.includes('/progress')) return 'progress';
      if (path.includes('/recent')) return 'recent';
      if (path.includes('/archives')) return 'archives';
      return 'unknown';
    }

    async getUserHandle() {
      // Project Euler shows username in the navigation/profile area
      const userLink = safeQuery(
        'a[href*="/progress"], #nav .profile, .nav-link'
      );
      if (userLink) {
        const text = extractText(userLink);
        if (text && !text.includes('Sign')) return text;
      }
      // Check for username in page content
      const progressHeader = safeQuery('h2, .info');
      if (progressHeader) {
        const match = extractText(progressHeader).match(/(\w+)'s Progress/i);
        if (match) return match[1];
      }
      return null;
    }

    async extractSolvedProblem() {
      try {
        // Extract problem number from URL (e.g., /problem=1)
        const problemMatch = window.location.href.match(/problem=(\d+)/);
        if (!problemMatch) {
          log('No problem ID in URL');
          return null;
        }

        const problemId = problemMatch[1];
        log('Checking problem:', problemId);

        await waitForElement('h2, #content, .problem_content', 3000).catch(
          () => null
        );

        // Get problem name from title
        const titleEl = safeQuery('h2, #content h2, .problem_title');
        let problemName = problemId;
        if (titleEl) {
          const titleText = extractText(titleEl);
          const match =
            titleText.match(/Problem \d+\s*[-:]\s*(.+)/i) ||
            titleText.match(/^(.+)$/);
          if (match) problemName = match[1].trim();
        }

        // Check if problem is solved - look for solved indicator
        // Project Euler shows a checkmark or "completed" status
        const isSolved = this.checkIfSolved();

        if (!isSolved) {
          log('Problem not solved yet');
          return null;
        }

        const handle = await this.getUserHandle();

        return {
          platform: this.platform,
          handle,
          problemId,
          problemName,
          problemUrl: window.location.href,
          submissionId: `pe-${problemId}-${Date.now()}`,
          submissionUrl: window.location.href,
          verdict: 'AC',
          language: 'Unknown', // Project Euler is language agnostic
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode: null, // No source code stored on Project Euler
        };
      } catch (error) {
        logError('Error:', error);
        return null;
      }
    }

    checkIfSolved() {
      // Check for completion indicator
      const completedEl = safeQuery(
        '.complete, .solved, [class*="solved"], [class*="complete"], img[src*="check"], .tick'
      );
      if (completedEl) return true;

      // Check for "Answer" input being disabled or showing correct
      const answerInput = safeQuery('input[name="answer"]');
      if (answerInput?.disabled) return true;

      // Check for success message
      const successMsg = safeQuery('.message_body, .alert-success');
      if (
        successMsg &&
        extractText(successMsg).toLowerCase().includes('correct')
      )
        return true;

      // Check if the answer section shows completed
      const infoSection = safeQuery('#problem_info, .info_section');
      if (
        infoSection &&
        extractText(infoSection).toLowerCase().includes('solved')
      )
        return true;

      return false;
    }

    async extractProgressPage() {
      try {
        log('Extracting progress page...');
        await waitForElement('.grid, table, .progress', 3000).catch(() => null);

        const solvedProblems = [];
        const handle = await this.getUserHandle();

        // Project Euler progress shows solved problems in a grid or list
        const solvedLinks = safeQueryAll(
          'a[href*="problem="].complete, .solved_problem a, td.complete a'
        );

        for (const link of solvedLinks) {
          const href = link.getAttribute('href');
          const match = href?.match(/problem=(\d+)/);
          if (match) {
            solvedProblems.push({
              platform: this.platform,
              handle,
              problemId: match[1],
              problemName: extractText(link) || `Problem ${match[1]}`,
              problemUrl: `https://projecteuler.net/problem=${match[1]}`,
              submissionId: `pe-${match[1]}-progress`,
              submissionUrl: `https://projecteuler.net/problem=${match[1]}`,
              verdict: 'AC',
              language: 'Unknown',
              executionTime: null,
              memoryUsed: null,
              submittedAt: null,
              sourceCode: null,
            });
          }
        }

        return solvedProblems;
      } catch (error) {
        logError('Error extracting progress:', error);
        return [];
      }
    }

    async init() {
      if (this.initialized) return;
      log('Initializing...');

      const pageType = this.detectPageType();

      if (pageType === 'problem') {
        const submission = await this.extractSolvedProblem();
        if (submission) {
          log('Extracted solved problem:', submission);
          this.storeSubmission(submission);
        }
      } else if (pageType === 'progress') {
        const submissions = await this.extractProgressPage();
        if (submissions.length > 0) {
          log('Extracted solved problems:', submissions.length);
          submissions.forEach((s) => this.storeSubmission(s));
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
              
              // Auto-sync if enabled and submission is AC
              this.storeSubmission && this.autoSyncIfEnabled && this.autoSyncIfEnabled(submission);
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
      new ProjectEulerExtractor().init()
    );
  } else {
    new ProjectEulerExtractor().init();
  }
})();
