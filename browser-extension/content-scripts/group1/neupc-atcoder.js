/**
 * NEUPC AtCoder Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility
 *
 * Supported pages:
 * - Submission page: /contests/{contest}/submissions/{id}
 * - Problem page: /contests/{contest}/tasks/{task}
 * - Submissions page: /contests/{contest}/submissions, /users/{user}/submissions
 * - Profile page: /users/{handle}
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES
  // ============================================================

  const PLATFORM = 'atcoder';
  const browserAPI =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof browser !== 'undefined'
        ? browser
        : null;

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logError(...args) {
    console.error(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logWarn(...args) {
    console.warn(`[NEUPC:${PLATFORM}]`, ...args);
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForElement(selector, timeout = 5000) {
    const el = safeQuery(selector);
    if (el) return el;

    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const found = safeQuery(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
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

    if (v === 'AC' || v.includes('ACCEPTED')) return 'AC';
    if (v === 'WA' || v.includes('WRONG')) return 'WA';
    if (v === 'TLE' || v.includes('TIME')) return 'TLE';
    if (v === 'MLE' || v.includes('MEMORY')) return 'MLE';
    if (v === 'RE' || v.includes('RUNTIME')) return 'RE';
    if (v === 'CE' || v.includes('COMPILATION')) return 'CE';
    if (v === 'OLE' || v.includes('OUTPUT')) return 'OLE';
    if (v === 'WJ' || v.includes('WAITING') || v.includes('JUDGING'))
      return 'PENDING';

    return verdict;
  }

  // ============================================================
  // ATCODER EXTRACTOR
  // ============================================================

  class AtCoderExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      // Single submission page: /contests/abc123/submissions/12345678
      if (path.match(/\/contests\/[^/]+\/submissions\/\d+$/)) {
        return 'submission';
      }
      // Submissions list: /contests/abc123/submissions or /contests/abc123/submissions/me
      if (path.match(/\/contests\/[^/]+\/submissions(\/me)?$/)) {
        return 'submissions';
      }
      // User submissions: /users/{user}/submissions
      if (path.match(/\/users\/[^/]+\/submissions$/)) {
        return 'submissions';
      }
      // Problem page: /contests/abc123/tasks/abc123_a
      if (path.includes('/tasks/')) {
        return 'problem';
      }
      // User profile: /users/{user}
      if (path.match(/\/users\/[^/]+$/)) {
        return 'profile';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // From submission table (User row)
      const table = safeQuery('table.table');
      if (table) {
        const rows = safeQueryAll('tr', table);
        for (const row of rows) {
          const header = extractText('th', row);
          if (
            header &&
            (header.toLowerCase().includes('user') || header.includes('ユーザ'))
          ) {
            const userLink = safeQuery('a[href*="/users/"]', row);
            if (userLink) {
              const match = userLink.href.match(/\/users\/([^/?]+)/);
              if (match) {
                return match[1];
              }
            }
          }
        }
      }

      // From navbar dropdown
      const navbarUser = safeQuery('.navbar-right .dropdown-toggle');
      if (navbarUser) {
        const text = extractText(navbarUser);
        if (text && !text.includes('Sign') && !text.includes('Log')) {
          return text;
        }
      }

      // From user links on page
      const userLinks = safeQueryAll('a[href*="/users/"]');
      for (const link of userLinks) {
        const match = link.href.match(/\/users\/([^/?]+)/);
        if (match && match[1] !== 'me') {
          return match[1];
        }
      }

      return null;
    }

    async extractSubmission() {
      try {
        const path = window.location.pathname;

        // Extract contest and submission ID from URL
        const submissionMatch = path.match(
          /\/contests\/([^/]+)\/submissions\/(\d+)$/
        );
        if (!submissionMatch) {
          log('No submission ID in URL');
          return null;
        }

        const contestId = submissionMatch[1];
        const submissionId = submissionMatch[2];

        log('Extracting submission:', submissionId, 'from contest:', contestId);

        // Wait for page content to load
        await waitForElement('table', 5000).catch(() => {
          logWarn('Table not found after waiting');
        });

        // Give extra time for code to render
        await sleep(500);

        let problemId = null;
        let problemName = null;
        let problemUrl = null;
        let verdict = 'UNKNOWN';
        let language = null;
        let executionTime = null;
        let memoryUsed = null;
        let submittedAt = null;
        let sourceCode = null;

        // ============================================================
        // Extract from submission info table
        // ============================================================

        const table = safeQuery('table.table');
        if (table) {
          const rows = safeQueryAll('tr', table);

          for (const row of rows) {
            const th = safeQuery('th', row);
            const td = safeQuery('td', row);

            if (!th || !td) continue;

            const header = extractText(th).toLowerCase();
            const valueText = extractText(td);

            // Problem (Task)
            if (
              header.includes('task') ||
              header.includes('problem') ||
              header.includes('問題')
            ) {
              const link = safeQuery('a', td);
              if (link) {
                problemUrl = link.href;
                problemName = extractText(link);
                // Extract problem ID from URL: /contests/abc123/tasks/abc123_a
                const match = problemUrl.match(/\/tasks\/([^/?]+)/);
                if (match) {
                  problemId = match[1];
                }
              }
            }

            // Verdict/Status/Result
            if (
              header.includes('status') ||
              header.includes('result') ||
              header.includes('結果')
            ) {
              // Look for span with verdict class first
              const verdictSpan = safeQuery('span', td);
              verdict = verdictSpan ? extractText(verdictSpan) : valueText;
            }

            // Language
            if (
              header.includes('language') ||
              header.includes('lang') ||
              header.includes('言語')
            ) {
              language = valueText;
            }

            // Execution Time
            if (
              header.includes('exec') ||
              header.includes('time') ||
              header.includes('実行時間')
            ) {
              const timeMatch = valueText.match(/(\d+)\s*ms/);
              if (timeMatch) {
                executionTime = parseInt(timeMatch[1], 10);
              }
            }

            // Memory
            if (header.includes('memory') || header.includes('メモリ')) {
              const memMatchKB = valueText.match(/(\d+)\s*KB/i);
              if (memMatchKB) {
                memoryUsed = parseInt(memMatchKB[1], 10);
              } else {
                const memMatchMB = valueText.match(/(\d+)\s*MB/i);
                if (memMatchMB) {
                  memoryUsed = parseInt(memMatchMB[1], 10) * 1024;
                }
              }
            }

            // Submission Time
            if (
              header.includes('submission time') ||
              header.includes('date') ||
              header.includes('提出日時')
            ) {
              const timeEl = safeQuery('time', td);
              if (timeEl) {
                const datetime = timeEl.getAttribute('datetime');
                submittedAt = datetime || valueText;
              } else {
                submittedAt = valueText;
              }
            }
          }
        }

        // ============================================================
        // Extract source code
        // ============================================================

        sourceCode = await this.extractSourceCode();

        // ============================================================
        // Build submission object
        // ============================================================

        const submission = {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId: problemId || `${contestId}_unknown`,
          problemName: problemName || problemId || '',
          problemUrl: problemUrl || '',
          contestId: contestId,
          submissionId: submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language: language || '',
          executionTime: executionTime,
          memoryUsed: memoryUsed,
          submittedAt: submittedAt || new Date().toISOString(),
          sourceCode: sourceCode,
          difficultyRating: null,
          tags: [],
        };

        log('Extracted submission:', {
          problemId: submission.problemId,
          verdict: submission.verdict,
          codeLength: submission.sourceCode?.length || 0,
        });

        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    async extractSourceCode() {
      const codeSelectors = [
        '#submission-code',
        'pre.prettyprint',
        'pre.linenums',
        '.submission-code pre',
        'pre[id*="source"]',
      ];

      for (const selector of codeSelectors) {
        const codeEl = safeQuery(selector);
        if (!codeEl || !codeEl.textContent.trim()) continue;

        let sourceCode = '';

        // AtCoder wraps code in <ol><li> elements for line numbers
        const listItems = safeQueryAll('li', codeEl);
        if (listItems.length > 0) {
          sourceCode = listItems.map((li) => li.textContent).join('\n');
          log('Found source code from list items, lines:', listItems.length);
        } else {
          // No list items - get directly
          const codeInner = safeQuery('code', codeEl) || codeEl;
          sourceCode = codeInner.textContent;
        }

        // Clean up the source code
        if (sourceCode) {
          sourceCode = this.cleanSourceCode(sourceCode);
          if (sourceCode.length > 20) {
            log(
              'Found source code with selector:',
              selector,
              'length:',
              sourceCode.length
            );
            return sourceCode;
          }
        }
      }

      logWarn('No source code found');
      return null;
    }

    cleanSourceCode(code) {
      if (!code) return '';

      // Remove non-ASCII characters that aren't common programming symbols
      code = code.replace(/[^\x00-\x7F\u00A0-\u00FF]/g, '');

      // Remove line numbers if they appear at the start (e.g., "123456789..." pattern)
      code = code.replace(/^(\d{10,})/, '');

      // Remove line number prefix before common code patterns
      code = code.replace(
        /^\d+(?=#include|#define|#pragma|\/\/|\/\*|using |import |package |class |public |def |fn |func |int |void |auto )/,
        ''
      );

      // Clean up excessive whitespace
      code = code.replace(/\n{3,}/g, '\n\n');

      return code.trim();
    }

    parseMemoryLimitToKb(value, unit) {
      if (!Number.isFinite(value)) return null;

      const normalizedUnit = String(unit || '').toUpperCase();

      if (normalizedUnit.includes('GB') || normalizedUnit.includes('GIB')) {
        return Math.round(value * 1024 * 1024);
      }

      if (normalizedUnit.includes('MB') || normalizedUnit.includes('MIB')) {
        return Math.round(value * 1024);
      }

      return Math.round(value);
    }

    extractSectionHtml(sectionEl) {
      if (!sectionEl) return null;

      const clone = sectionEl.cloneNode(true);
      safeQueryAll('h1, h2, h3, h4, h5, .section-title', clone).forEach((el) =>
        el.remove()
      );

      const html = clone.innerHTML.trim();
      return html || null;
    }

    findSectionByKeywords(sections, keywords) {
      return (
        sections.find((section) => {
          const heading = extractText(
            'h1, h2, h3, h4, h5, .section-title',
            section
          ).toLowerCase();

          return (
            heading &&
            keywords.some((keyword) => heading.includes(keyword.toLowerCase()))
          );
        }) || null
      );
    }

    buildExamplesFromSections(sections) {
      const inputBlocks = [];
      const outputBlocks = [];

      for (const section of sections) {
        const heading = extractText(
          'h1, h2, h3, h4, h5, .section-title',
          section
        );
        if (!heading) continue;

        const pre = safeQuery('pre', section);
        if (!pre || !pre.textContent.trim()) continue;

        if (/sample\s*input|入力例/i.test(heading)) {
          inputBlocks.push(pre.textContent.trim());
        } else if (/sample\s*output|出力例/i.test(heading)) {
          outputBlocks.push(pre.textContent.trim());
        }
      }

      const exampleCount = Math.min(inputBlocks.length, outputBlocks.length);
      const examples = [];

      for (let i = 0; i < exampleCount; i++) {
        examples.push({
          input: inputBlocks[i],
          output: outputBlocks[i],
        });
      }

      return examples;
    }

    async extractProblemDetails() {
      log('Extracting full problem details...');

      const pathMatch = window.location.pathname.match(
        /\/contests\/([^/]+)\/tasks\/([^/?#]+)/
      );

      const details = {
        problemId: pathMatch?.[2] || null,
        problemName: null,
        problemUrl: window.location.href,
        contestId: pathMatch?.[1] || null,
        description: null,
        inputFormat: null,
        outputFormat: null,
        constraints: null,
        examples: [],
        notes: null,
        tutorialUrl: null,
        tutorialContent: null,
        tutorialSolutions: [],
        timeLimitMs: null,
        memoryLimitKb: null,
        // Keep aliases for compatibility with older mapping paths.
        timeLimit: null,
        memoryLimit: null,
        difficultyRating: null,
        tags: [],
        // Canonical aliases for backend import contracts.
        tutorial_url: null,
        tutorial_content: null,
        tutorial_solutions: [],
        time_limit_ms: null,
        memory_limit_kb: null,
        difficulty_rating: null,
      };

      const taskStatement = safeQuery('#task-statement');
      if (!taskStatement) {
        logWarn('Task statement not found');
        return details;
      }

      const languageRoot =
        safeQuery('.lang-en', taskStatement) ||
        safeQuery('.lang-ja', taskStatement) ||
        taskStatement;

      let sections = safeQueryAll('section', languageRoot);
      if (sections.length === 0) {
        sections = safeQueryAll('.part', languageRoot);
      }

      const rawTitle = extractText('span.h2, h1, h2, .h2');
      if (rawTitle) {
        details.problemName =
          rawTitle.replace(/^[A-Za-z0-9]+\s*-\s*/, '').trim() || rawTitle;
      }

      let descriptionSection = this.findSectionByKeywords(sections, [
        'problem statement',
        'statement',
        '問題文',
      ]);
      if (!descriptionSection && sections.length > 0) {
        descriptionSection = sections[0];
      }

      details.description = this.extractSectionHtml(descriptionSection);
      details.inputFormat = this.extractSectionHtml(
        this.findSectionByKeywords(sections, ['input', '入力'])
      );
      details.outputFormat = this.extractSectionHtml(
        this.findSectionByKeywords(sections, ['output', '出力'])
      );
      details.constraints = this.extractSectionHtml(
        this.findSectionByKeywords(sections, [
          'constraint',
          'constraints',
          '制約',
        ])
      );
      details.notes = this.extractSectionHtml(
        this.findSectionByKeywords(sections, ['note', 'notes', '注'])
      );
      details.examples = this.buildExamplesFromSections(sections);

      const statementText = extractText(taskStatement);
      const timeMatch = statementText.match(
        /Time\s*Limit\s*:\s*([0-9]*\.?[0-9]+)\s*sec/i
      );
      if (timeMatch) {
        details.timeLimitMs = Math.round(parseFloat(timeMatch[1]) * 1000);
        details.timeLimit = details.timeLimitMs;
      }

      const memoryMatch = statementText.match(
        /Memory\s*Limit\s*:\s*([0-9]*\.?[0-9]+)\s*(KB|MB|GB|KiB|MiB|GiB)/i
      );
      if (memoryMatch) {
        details.memoryLimitKb = this.parseMemoryLimitToKb(
          parseFloat(memoryMatch[1]),
          memoryMatch[2]
        );
        details.memoryLimit = details.memoryLimitKb;
      }

      const tutorialLink = safeQuery(
        'a[href*="/editorial"], a[href*="editorial"]'
      );
      if (tutorialLink) {
        details.tutorialUrl = tutorialLink.href;
      }

      details.tutorial_url = details.tutorialUrl;
      details.tutorial_content = details.tutorialContent;
      details.tutorial_solutions = details.tutorialSolutions;
      details.time_limit_ms = details.timeLimitMs;
      details.memory_limit_kb = details.memoryLimitKb;
      details.difficulty_rating = details.difficultyRating;

      log('Problem details extracted:', {
        problemId: details.problemId,
        hasDescription: !!details.description,
        hasInput: !!details.inputFormat,
        hasOutput: !!details.outputFormat,
        hasConstraints: !!details.constraints,
        examplesCount: details.examples.length,
        hasNotes: !!details.notes,
        hasTutorial: !!details.tutorialUrl,
      });

      return details;
    }

    // ============================================================
    // MESSAGE HANDLING
    // ============================================================

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage) return;

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          log('Message received:', request.action);

          if (request.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(sendResponse);
            return true; // Keep channel open for async
          }

          if (request.action === 'extractProblemDetails') {
            this.handleExtractProblemDetailsMessage(sendResponse);
            return true;
          }

          if (request.action === 'ping') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              initialized: this.initialized,
            });
            return true;
          }

          if (request.action === 'getPageInfo') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              url: window.location.href,
            });
            return true;
          }

          sendResponse({ success: false, error: 'Unknown action' });
          return true;
        }
      );
    }

    async handleExtractSubmissionMessage(sendResponse) {
      try {
        // Return cached result if available
        if (this.extractionComplete && this.extractionResult) {
          sendResponse({ success: true, data: this.extractionResult });
          return;
        }

        // Extract submission
        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        this.extractionComplete = true;

        sendResponse({
          success: !!submission?.sourceCode,
          data: submission,
          error: submission ? null : 'No submission found',
        });
      } catch (error) {
        logError('Extract submission error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'problem') {
          sendResponse({
            success: false,
            error: `Not a problem page (detected: ${pageType})`,
          });
          return;
        }

        const details = await this.extractProblemDetails();
        if (details && details.problemId) {
          sendResponse({ success: true, data: details });
        } else {
          sendResponse({
            success: false,
            error: 'No problem details extracted',
          });
        }
      } catch (error) {
        logError('Extract problem details error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    // ============================================================
    // AUTO-SYNC
    // ============================================================

    async autoSyncIfEnabled(submission) {
      if (!browserAPI?.storage?.sync) return;

      try {
        const result = await new Promise((resolve) => {
          browserAPI.storage.sync.get(['autoSync', 'extensionToken'], resolve);
        });

        if (result.autoSync && result.extensionToken && submission.sourceCode) {
          log(
            `Auto-syncing ${submission.verdict || 'UNKNOWN'} submission to backend...`
          );

          browserAPI.runtime.sendMessage(
            { action: 'syncSubmission', submission },
            (response) => {
              if (response?.success) {
                log('Auto-sync successful!');
              } else {
                logWarn(
                  'Auto-sync failed:',
                  response?.error || 'Unknown error'
                );
              }
            }
          );
        }
      } catch (error) {
        logError('Auto-sync check failed:', error);
      }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async init() {
      if (this.initialized) return;

      log('Initializing extractor on:', window.location.href);

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Page type:', pageType);

      if (pageType === 'submission') {
        log('Processing submission page');

        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        this.extractionComplete = true;

        if (submission) {
          log('Successfully extracted submission');
          this.cacheSubmission(submission);
          await this.autoSyncIfEnabled(submission);
        } else {
          logWarn('Failed to extract submission data');
        }
      }

      this.initialized = true;
      log('Extractor initialized');
    }

    cacheSubmission(submission) {
      if (!browserAPI?.storage?.local) return;

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
            log('Submission cached');
          });
        }
      });
    }
  }

  // ============================================================
  // AUTO-INITIALIZE
  // ============================================================

  function initExtractor() {
    log('Content script loaded');
    const extractor = new AtCoderExtractor();
    extractor.init();

    // Store reference for debugging
    window.__neupcExtractor = extractor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
