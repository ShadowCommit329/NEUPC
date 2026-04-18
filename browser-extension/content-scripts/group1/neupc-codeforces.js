/**
 * NEUPC Codeforces Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility
 *
 * Supported pages:
 * - Submission page: /contest/{id}/submission/{id}, /gym/{id}/submission/{id}
 * - Problem page: /contest/{id}/problem/{index}, /problemset/problem/{id}/{index}
 * - Status page: /submissions/, /status
 * - Profile page: /profile/{handle}
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__NEUPC_CF_INJECTED__) {
    console.warn('[NEUPC:codeforces] Already injected, skipping');
    return;
  }
  window.__NEUPC_CF_INJECTED__ = true;

  // ============================================================
  // UTILITIES
  // ============================================================

  const PLATFORM = 'codeforces';
  const browserAPI =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof browser !== 'undefined'
        ? browser
        : null;

  function log(...args) {
    console.warn(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logError(...args) {
    console.error(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logWarn(...args) {
    console.warn(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function safeQuery(selector, context = document) {
    try {
      if (Array.isArray(selector)) {
        for (const s of selector) {
          const el = context.querySelector(s);
          if (el) return el;
        }
        return null;
      }
      return context.querySelector(selector);
    } catch {
      return null;
    }
  }

  function safeQueryAll(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch {
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

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = verdict.toUpperCase().trim();

    if (v === 'OK' || v === 'AC' || v.includes('ACCEPTED')) return 'AC';
    if (v === 'WA' || v.includes('WRONG')) return 'WA';
    if (v === 'TLE' || v.includes('TIME LIMIT')) return 'TLE';
    if (v === 'MLE' || v.includes('MEMORY LIMIT')) return 'MLE';
    if (v === 'RE' || v.includes('RUNTIME')) return 'RE';
    if (v === 'CE' || v.includes('COMPILATION')) return 'CE';
    if (v === 'PE' || v.includes('PRESENTATION')) return 'PE';
    if (v === 'ILE' || v.includes('IDLENESS')) return 'ILE';
    if (v.includes('HACKED') || v.includes('CHALLENGED')) return 'WA';
    if (v.includes('TESTING') || v.includes('QUEUE') || v.includes('WAITING'))
      return 'PENDING';
    if (v.includes('PARTIAL') || v.includes('SKIPPED')) return 'PC';

    return verdict;
  }

  // ============================================================
  // CODEFORCES EXTRACTOR
  // ============================================================

  class CodeforcesExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      // Submission pages
      // Covers: /contest/id/submission/id, /gym/id/submission/id,
      //         /group/.../submission/id, /problemset/submission/handle/id
      if (
        path.match(/\/contest\/\d+\/submission\/\d+/) ||
        path.match(/\/gym\/\d+\/submission\/\d+/) ||
        path.match(/\/group\/[^/]+\/contest\/\d+\/submission\/\d+/) ||
        path.match(/\/problemset\/submission\/[^/]+\/\d+/) ||
        path.match(/\/submission\/\d+/)
      ) {
        return 'submission';
      }

      // Problem pages
      if (
        path.match(/\/contest\/\d+\/problem\/[A-Za-z0-9]+/) ||
        path.match(/\/gym\/\d+\/problem\/[A-Za-z0-9]+/) ||
        path.match(/\/problemset\/problem\/\d+\/[A-Za-z0-9]+/)
      ) {
        return 'problem';
      }

      // Submissions/status pages
      if (
        path.includes('/submissions/') ||
        path.includes('/status') ||
        path.match(/\/my$/) ||
        path.match(/\/contest\/\d+\/my/)
      ) {
        return 'submissions';
      }

      // Profile pages
      if (path.match(/\/profile\/[^/]+/)) {
        return 'profile';
      }

      return 'unknown';
    }

    // ============================================================
    // SUBMISSION EXTRACTION
    // ============================================================

    async extractSubmission() {
      log('Extracting submission data...');

      // Wait for source code to load
      await this.waitForSourceCode();

      const submission = {
        platform: PLATFORM,
        submissionId: this.extractSubmissionId(),
        problemId: null,
        problemName: null,
        problemUrl: null,
        contestId: null,
        verdict: null,
        language: null,
        sourceCode: null,
        executionTime: null,
        memoryUsed: null,
        submittedAt: null,
        difficultyRating: null,
        tags: [],
      };

      // Extract contest/gym ID
      const contestMatch = window.location.pathname.match(
        /\/(?:contest|gym)\/(\d+)/
      );
      submission.contestId = contestMatch ? contestMatch[1] : null;

      // Extract problem info from page
      const problemInfo = this.extractProblemInfo();
      if (problemInfo) {
        submission.problemId = problemInfo.problemId;
        submission.problemName = problemInfo.problemName;
        submission.problemUrl = problemInfo.problemUrl;
      }

      // Extract verdict and other info from info table
      const tableInfo = this.extractSubmissionTableInfo();
      submission.verdict = tableInfo.verdict || 'UNKNOWN';
      submission.language = tableInfo.language || 'Unknown';
      submission.executionTime = tableInfo.executionTime;
      submission.memoryUsed = tableInfo.memoryUsed;
      submission.submittedAt = tableInfo.submittedAt;

      // Extract source code
      submission.sourceCode = this.extractSourceCode();

      // Try to get problem metadata from API
      if (submission.contestId && submission.problemId) {
        try {
          const apiMetadata = await this.fetchProblemMetadata(
            submission.contestId,
            submission.problemId
          );
          if (apiMetadata) {
            submission.difficultyRating = apiMetadata.rating;
            submission.tags = apiMetadata.tags;
            if (!submission.problemName && apiMetadata.name) {
              submission.problemName = apiMetadata.name;
            }
          }
        } catch (e) {
          logWarn('Could not fetch problem metadata:', e.message);
        }
      }

      log('Extraction complete:', {
        submissionId: submission.submissionId,
        problemId: submission.problemId,
        verdict: submission.verdict,
        codeLength: submission.sourceCode?.length || 0,
      });

      return submission;
    }

    /**
     * Wait for source code element to load
     */
    async waitForSourceCode() {
      const codeSelectors = [
        '#program-source-text',
        'pre#program-source-text',
        '.source-code pre',
        '.prettyprint.program-source',
        'pre.prettyprint',
        '.program-source',
      ];

      // Wait up to 10 seconds for source code
      for (let attempt = 0; attempt < 20; attempt++) {
        for (const selector of codeSelectors) {
          const codeEl = safeQuery(selector);
          if (codeEl && codeEl.textContent.trim().length > 10) {
            return true;
          }
        }
        await sleep(500);
      }

      logWarn('Source code element not found after waiting');
      return false;
    }

    /**
     * Extract submission ID from URL.
     * Handles patterns:
     *   /contest/{id}/submission/{subId}
     *   /gym/{id}/submission/{subId}
     *   /problemset/submission/{handle}/{subId}   ← last segment is the ID
     *   /group/.../submission/{subId}
     */
    extractSubmissionId() {
      const path = window.location.pathname;

      // Try the common /submission/{digits} pattern first
      const directMatch = path.match(/\/submission\/(\d+)(?:\/|$)/);
      if (directMatch) return directMatch[1];

      // Fallback: /problemset/submission/{handle}/{submissionId}
      // The submission ID is always the last numeric segment
      const segments = path.split('/').filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(segments[i])) {
          return segments[i];
        }
      }

      return null;
    }

    /**
     * Extract problem info from the submission page.
     * Handles /contest/, /gym/, and /problemset/problem/ link patterns.
     */
    extractProblemInfo() {
      // Build the full href (absolute) so the regex always sees a clean path
      const toAbsolute = (href) => {
        if (!href) return '';
        if (href.startsWith('http')) return href;
        return `https://codeforces.com${href.startsWith('/') ? '' : '/'}${href}`;
      };

      // Look for problem links anywhere on the page
      const problemLinks = safeQueryAll('a[href*="/problem/"]');

      for (const link of problemLinks) {
        const href = link.getAttribute('href') || '';
        const absoluteHref = toAbsolute(href);

        // Match /contest/{id}/problem/{index}
        //       /gym/{id}/problem/{index}
        //       /problemset/problem/{id}/{index}
        const match =
          absoluteHref.match(
            /\/(?:contest|gym)\/(\d+)\/problem\/([A-Za-z0-9]+)/
          ) ||
          absoluteHref.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);

        if (match) {
          const contestId = match[1];
          const problemIndex = match[2];

          // Build a canonical problem ID: e.g. "1234A"
          const problemId = `${contestId}${problemIndex}`;

          return {
            problemId,
            problemName: extractText(link) || problemId,
            problemUrl: absoluteHref,
            contestId,
            problemIndex,
          };
        }
      }

      // Fallback: try to extract from page title
      // Title format: "Submission #id - Problem Name - Contest Name - Codeforces"
      const titleMatch = document.title.match(/- (\d+)([A-Z]\d?)\b/);
      if (titleMatch) {
        const contestId = titleMatch[1];
        const problemIndex = titleMatch[2];
        const problemId = `${contestId}${problemIndex}`;
        return {
          problemId,
          problemName: null,
          problemUrl: `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`,
          contestId,
          problemIndex,
        };
      }

      return null;
    }

    /**
     * Extract info from the Codeforces submission info table.
     * Uses row-label-based extraction so the verdict, language, time and
     * memory values come from the correct table cells regardless of order.
     *
     * CF submission page layout (each <tr> has two cells):
     *   Contest | <link>
     *   Problem | <link>
     *   Lang    | GNU C++17 (64)
     *   Verdict | <span class="verdict-accepted">Accepted</span>
     *   Time    | 15 ms
     *   Memory  | 256 KB
     *   Submitted | <span class="format-time" data-time="1700000000">…</span>
     */
    extractSubmissionTableInfo() {
      const info = {
        verdict: null,
        language: null,
        executionTime: null,
        memoryUsed: null,
        submittedAt: null,
      };

      // ── Verdict ──────────────────────────────────────────────
      const verdictSelectors = [
        '.verdict-accepted',
        '.verdict-rejected',
        '.verdict-waiting',
        'span.verdict',
        '[class*="verdict"]',
      ];
      for (const selector of verdictSelectors) {
        const el = safeQuery(selector);
        if (el) {
          info.verdict = normalizeVerdict(extractText(el));
          break;
        }
      }

      // ── Submission time ───────────────────────────────────────
      // .format-time carries a "data-time" attribute (Unix seconds)
      const timeEl = safeQuery('.format-time');
      if (timeEl) {
        const dataTime = timeEl.getAttribute('data-time');
        if (dataTime && /^\d+$/.test(dataTime.trim())) {
          info.submittedAt = new Date(
            parseInt(dataTime.trim(), 10) * 1000
          ).toISOString();
        } else {
          // Fallback to title or visible text (may already be formatted)
          const fallback = timeEl.getAttribute('title') || extractText(timeEl);
          if (fallback) {
            try {
              const parsed = new Date(fallback);
              if (!isNaN(parsed.getTime())) {
                info.submittedAt = parsed.toISOString();
              }
            } catch {}
          }
        }
      }

      // ── Info table ────────────────────────────────────────────
      // Try several selectors that Codeforces has used over the years.
      const infoTable = safeQuery(
        'table.rtable, .roundbox table, .datatable table'
      );

      if (infoTable) {
        const rows = safeQueryAll('tr', infoTable);

        for (const row of rows) {
          // Each info row has a header cell (th or first td) and a value cell.
          const cells = safeQueryAll('td, th', row);
          if (cells.length < 2) continue;

          const label = extractText(cells[0]).toLowerCase().trim();
          // Value is always the last cell in the row
          const valueCell = cells[cells.length - 1];
          const value = extractText(valueCell).trim();

          if (
            (label.includes('lang') || label.includes('program')) &&
            !info.language
          ) {
            info.language = value;
          } else if (
            label === 'time' ||
            (label.startsWith('time') && !label.includes('submit'))
          ) {
            const m = value.match(/(\d+)\s*ms/i);
            if (m) info.executionTime = parseInt(m[1], 10);
          } else if (label.includes('memory') || label.includes('mem')) {
            const m = value.match(/(\d+(?:\.\d+)?)\s*[kK][bB]/);
            if (m) info.memoryUsed = Math.round(parseFloat(m[1]));
          } else if (
            (label.includes('submit') || label.includes('sent')) &&
            !info.submittedAt
          ) {
            // The value cell may contain a .format-time element
            const innerTimeEl = safeQuery('.format-time', valueCell);
            if (innerTimeEl) {
              const dt = innerTimeEl.getAttribute('data-time');
              if (dt && /^\d+$/.test(dt.trim())) {
                info.submittedAt = new Date(
                  parseInt(dt.trim(), 10) * 1000
                ).toISOString();
              }
            }
          }

          // Also check for verdict inside the table in case the CSS selector
          // above missed it (e.g. the verdict row has a .verdict-* span).
          if (!info.verdict && label.includes('verdict')) {
            const verdictSpan = safeQuery('[class*="verdict"]', valueCell);
            if (verdictSpan) {
              info.verdict = normalizeVerdict(extractText(verdictSpan));
            } else {
              info.verdict = normalizeVerdict(value);
            }
          }
        }
      }

      // ── Page-text fallback for verdict ─────────────────────────
      if (!info.verdict) {
        const pageText = document.body.innerText || '';
        if (pageText.includes('Accepted')) info.verdict = 'AC';
        else if (pageText.includes('Wrong answer')) info.verdict = 'WA';
        else if (pageText.includes('Time limit exceeded')) info.verdict = 'TLE';
        else if (pageText.includes('Memory limit exceeded'))
          info.verdict = 'MLE';
        else if (pageText.includes('Runtime error')) info.verdict = 'RE';
        else if (pageText.includes('Compilation error')) info.verdict = 'CE';
      }

      return info;
    }

    /**
     * Extract source code from page
     */
    extractSourceCode() {
      const codeSelectors = [
        '#program-source-text',
        'pre#program-source-text',
        '.source-code pre',
        '.prettyprint.program-source',
        'pre.prettyprint',
        '.program-source',
        'pre[class*="source"]',
        '#sourceCodeTextarea',
      ];

      for (const selector of codeSelectors) {
        const codeEl = safeQuery(selector);
        if (codeEl && codeEl.textContent.trim().length > 10) {
          log(`Found source code with selector: ${selector}`);
          return codeEl.textContent;
        }
      }

      // Fallback: look for any pre tag with code-like content
      const preTags = safeQueryAll('pre');
      for (const pre of preTags) {
        const text = pre.textContent.trim();
        if (this.looksLikeCode(text)) {
          log('Found source code in generic pre tag');
          return text;
        }
      }

      logWarn('No source code found');
      return null;
    }

    /**
     * Heuristic check if text looks like source code
     */
    looksLikeCode(text) {
      if (text.length < 50) return false;

      const codeIndicators = [
        'int ',
        'void ',
        'def ',
        'class ',
        '#include',
        'import ',
        'function ',
        'public ',
        'private ',
        'return ',
        'for ',
        'while ',
        'if (',
        'cout',
        'cin',
        'printf',
        'scanf',
        'System.out',
        'print(',
        'main(',
        'using namespace',
        '#define',
      ];

      return codeIndicators.some((indicator) => text.includes(indicator));
    }

    /**
     * Fetch problem metadata from Codeforces API.
     * problemId is in the form "{contestId}{index}", e.g. "1234A".
     */
    async fetchProblemMetadata(contestId, problemId) {
      try {
        // Strip the numeric contestId prefix to get just the problem index (e.g. "A", "B1")
        const problemIndex = problemId.startsWith(contestId)
          ? problemId.slice(contestId.length)
          : problemId;

        const apiUrl = `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`;

        log(`Fetching problem metadata from API...`);

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.result?.problems) {
          const problem = data.result.problems.find(
            (p) => p.index === problemIndex
          );

          if (problem) {
            log('Got problem metadata:', {
              rating: problem.rating,
              tags: problem.tags?.length,
            });

            return {
              name: problem.name,
              rating: problem.rating || null,
              tags: problem.tags || [],
            };
          }
        }
      } catch (error) {
        logWarn('Could not fetch problem metadata:', error.message);
      }

      return null;
    }

    /**
     * Extract full problem details (description, examples, I/O format, tutorial)
     * For problem pages
     */
    async extractProblemDetails() {
      log('Extracting full problem details...');

      const details = {
        problemId: null,
        problemName: null,
        problemUrl: window.location.href,
        contestId: null,
        description: null,
        inputFormat: null,
        outputFormat: null,
        constraints: null,
        examples: [],
        notes: null,
        tutorialUrl: null,
        tutorialContent: null,
        timeLimit: null,
        memoryLimit: null,
        difficulty: null,
        tags: [],
      };

      // Extract problem ID and contest ID from URL
      const urlMatch = window.location.pathname.match(
        /\/(?:contest|gym|problemset\/problem)\/(\d+)\/([A-Za-z0-9]+)/
      );
      if (urlMatch) {
        details.contestId = urlMatch[1];
        const problemIndex = urlMatch[2];
        details.problemId = `${details.contestId}${problemIndex}`;
      }

      // Find the problem statement container
      const problemStatement = safeQuery('.problem-statement');
      if (!problemStatement) {
        logWarn('Problem statement not found');
        return details;
      }

      // Extract problem name
      const titleEl = safeQuery(
        '.title, .problem-statement .title',
        problemStatement
      );
      if (titleEl) {
        // Remove the problem index prefix (e.g., "A. ")
        details.problemName = extractText(titleEl).replace(
          /^[A-Z]\d?\.\s*/,
          ''
        );
      }

      // Extract time and memory limits
      const timeLimitEl = safeQuery(
        '.time-limit, [class*="time-limit"]',
        problemStatement
      );
      if (timeLimitEl) {
        const timeLimitText = extractText(timeLimitEl);
        const timeLimitMatch = timeLimitText.match(/(\d+(?:\.\d+)?)\s*second/i);
        if (timeLimitMatch) {
          details.timeLimit = Math.round(parseFloat(timeLimitMatch[1]) * 1000); // Convert to ms
        }
      }

      const memoryLimitEl = safeQuery(
        '.memory-limit, [class*="memory-limit"]',
        problemStatement
      );
      if (memoryLimitEl) {
        const memoryLimitText = extractText(memoryLimitEl);
        const memoryLimitMatch = memoryLimitText.match(/(\d+)\s*megabyte/i);
        if (memoryLimitMatch) {
          details.memoryLimit = parseInt(memoryLimitMatch[1], 10) * 1024; // Convert to KB
        }
      }

      // Extract main problem description
      const headerEl = safeQuery('.header', problemStatement);
      if (headerEl) {
        // Get all paragraphs before input specification
        const paragraphs = [];
        let currentEl = headerEl.nextElementSibling;

        while (
          currentEl &&
          !currentEl.classList.contains('input-specification') &&
          !currentEl.classList.contains('output-specification') &&
          !currentEl.classList.contains('note')
        ) {
          if (currentEl.textContent.trim()) {
            paragraphs.push(currentEl.outerHTML.trim());
          }
          currentEl = currentEl.nextElementSibling;
        }

        if (paragraphs.length > 0) {
          details.description = paragraphs.join('\n\n');
        }
      }

      // Extract input format
      const inputSpec = safeQuery('.input-specification', problemStatement);
      if (inputSpec) {
        const inputHeader = safeQuery('.section-title', inputSpec);
        if (inputHeader) {
          // get all siblings after section-title
          const chunks = [];
          let currentEl = inputHeader.nextElementSibling;
          while (currentEl) {
            chunks.push(currentEl.outerHTML);
            currentEl = currentEl.nextElementSibling;
          }
          if (chunks.length > 0) {
            details.inputFormat = chunks.join('\n\n').trim();
          }
        } else {
          details.inputFormat = inputSpec.innerHTML.trim();
        }
      }

      // Extract output format
      const outputSpec = safeQuery('.output-specification', problemStatement);
      if (outputSpec) {
        const outputHeader = safeQuery('.section-title', outputSpec);
        if (outputHeader) {
          // get all siblings after section-title
          const chunks = [];
          let currentEl = outputHeader.nextElementSibling;
          while (currentEl) {
            chunks.push(currentEl.outerHTML);
            currentEl = currentEl.nextElementSibling;
          }
          if (chunks.length > 0) {
            details.outputFormat = chunks.join('\n\n').trim();
          }
        } else {
          details.outputFormat = outputSpec.innerHTML.trim();
        }
      }

      // Extract examples (input/output pairs)
      const sampleTests = safeQuery(
        '.sample-tests, .sample-test',
        problemStatement
      );
      if (sampleTests) {
        const inputs = safeQueryAll(
          '.input pre, .test-example-line.test-example-line-input pre',
          sampleTests
        );
        const outputs = safeQueryAll(
          '.output pre, .test-example-line.test-example-line-output pre',
          sampleTests
        );

        const exampleCount = Math.min(inputs.length, outputs.length);
        for (let i = 0; i < exampleCount; i++) {
          details.examples.push({
            input: inputs[i].textContent.trim(),
            output: outputs[i].textContent.trim(),
          });
        }

        log(`Extracted ${details.examples.length} examples`);
      }

      // Extract notes section
      const noteSection = safeQuery('.note', problemStatement);
      if (noteSection) {
        const noteHeader = safeQuery('.section-title', noteSection);
        if (noteHeader) {
          const chunks = [];
          let currentEl = noteHeader.nextElementSibling;
          while (currentEl) {
            chunks.push(currentEl.outerHTML);
            currentEl = currentEl.nextElementSibling;
          }
          if (chunks.length > 0) {
            details.notes = chunks.join('\n\n').trim();
          }
        } else {
          details.notes = noteSection.innerHTML.trim();
        }
      }

      // Try to find tutorial/editorial link
      const tutorialLink = safeQuery(
        'a[href*="/blog/entry/"], a[href*="tutorial"], a[href*="editorial"]'
      );
      if (tutorialLink) {
        details.tutorialUrl = tutorialLink.href;
      } else {
        const tutorialTextLink = safeQueryAll('a[href]').find((link) => {
          const text = extractText(link).toLowerCase();
          return (
            text.includes('tutorial') ||
            text.includes('editorial') ||
            text.includes('solution')
          );
        });

        if (tutorialTextLink?.href) {
          details.tutorialUrl = tutorialTextLink.href;
        }
      }

      // Fetch additional metadata from API
      if (details.contestId && details.problemId) {
        const metadata = await this.fetchProblemMetadata(
          details.contestId,
          details.problemId
        );
        if (metadata) {
          details.difficulty = metadata.rating;
          details.tags = metadata.tags;
        }
      }

      log('Problem details extracted:', {
        problemId: details.problemId,
        hasDescription: !!details.description,
        hasInput: !!details.inputFormat,
        hasOutput: !!details.outputFormat,
        examplesCount: details.examples.length,
        hasNotes: !!details.notes,
        hasTutorial: !!details.tutorialUrl,
      });

      return details;
    }

    /**
     * Extract tutorial/editorial content from a tutorial page
     * Called when extension opens a tutorial URL
     */
    async extractTutorialContent() {
      log('Extracting tutorial content...');

      const tutorial = {
        url: window.location.href,
        content: null,
        problemId: null,
        solutions: [],
      };

      // Find the main content div
      const contentSelectors = [
        '.ttypography',
        '.content',
        '.blog-entry-content',
        '#pageContent',
        'article',
      ];

      let contentEl = null;
      for (const selector of contentSelectors) {
        const el = safeQuery(selector);
        if (el && el.textContent.trim().length > 100) {
          contentEl = el;
          tutorial.content = el.innerHTML;
          log('Tutorial content extracted');
          break;
        }
      }

      // Extract code solutions from the tutorial
      if (contentEl) {
        const solutions = this.extractSolutionsFromTutorial(contentEl);
        tutorial.solutions = solutions;
        log(`Extracted ${solutions.length} solution(s) from tutorial`);
      }

      return tutorial;
    }

    /**
     * Extract code solutions from tutorial content
     * @param {HTMLElement} contentEl - The tutorial content element
     * @returns {Array} Array of solution objects
     */
    extractSolutionsFromTutorial(contentEl) {
      const solutions = [];

      // Look for code blocks in the tutorial
      // Codeforces tutorials use <pre> tags or .spoiler blocks for code
      const codeSelectors = [
        'pre:not(.prettyprinted)',
        'pre.prettyprinted',
        '.spoiler pre',
        'code.block',
        '.code-block',
        '.highlight pre',
      ];

      const codeBlocks = [];
      codeSelectors.forEach((selector) => {
        const elements = contentEl.querySelectorAll(selector);
        elements.forEach((el) => {
          // Only include code blocks that look like actual solutions
          // (more than 3 lines and contains typical programming keywords)
          const code = el.textContent.trim();
          const lineCount = code.split('\n').length;

          if (lineCount >= 3 && this.looksLikeCode(code)) {
            codeBlocks.push({
              element: el,
              code: code,
            });
          }
        });
      });

      // Try to identify language and create solution objects
      codeBlocks.forEach((block, index) => {
        const code = block.code;
        const element = block.element;

        // Try to detect language from context
        let language = this.detectLanguageFromCode(code);

        // Try to find language hint in nearby text or classes
        const classes = element.className || '';
        const languageHints = {
          cpp: ['cpp', 'c++', 'cxx'],
          python: ['python', 'py'],
          java: ['java'],
          javascript: ['javascript', 'js'],
          go: ['go', 'golang'],
          rust: ['rust'],
        };

        for (const [lang, hints] of Object.entries(languageHints)) {
          if (hints.some((hint) => classes.toLowerCase().includes(hint))) {
            language = lang;
            break;
          }
        }

        // Look for preceding text that might indicate the approach
        let approachName = null;
        let explanation = null;

        // Try to find heading before the code block
        let prevElement = element.previousElementSibling;
        let searchDepth = 0;
        while (prevElement && searchDepth < 5) {
          const tagName = prevElement.tagName.toLowerCase();
          const text = prevElement.textContent.trim();

          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            approachName = text;
            break;
          } else if (tagName === 'p' && text.length > 10 && text.length < 500) {
            explanation = text;
          }

          prevElement = prevElement.previousElementSibling;
          searchDepth++;
        }

        solutions.push({
          code: code,
          language: language || 'unknown',
          approach_name: approachName || `Solution ${index + 1}`,
          explanation: explanation,
          order: index + 1,
        });
      });

      return solutions;
    }

    /**
     * Check if text looks like code
     * @param {string} text - Text to check
     * @returns {boolean}
     */
    looksLikeCode(text) {
      const codeKeywords = [
        'int ',
        'void ',
        'return',
        'if (',
        'for (',
        'while (',
        'class ',
        'def ',
        'function',
        'const ',
        'let ',
        'var ',
        'import ',
        'include',
        '#include',
        'package ',
        'public ',
        'private ',
        'static ',
        'printf',
        'cout',
        'cin',
        'scanf',
        'print(',
        '{',
        '}',
        ';',
        '//',
        '/*',
        '*/',
      ];

      const lowerText = text.toLowerCase();
      return codeKeywords.some((keyword) =>
        lowerText.includes(keyword.toLowerCase())
      );
    }

    /**
     * Detect programming language from code content
     * @param {string} code - Source code
     * @returns {string|null} Detected language or null
     */
    detectLanguageFromCode(code) {
      const detectors = [
        {
          lang: 'cpp',
          patterns: ['#include', 'std::', 'cout', 'cin', 'vector<'],
        },
        {
          lang: 'python',
          patterns: ['def ', 'import ', 'print(', 'range(', '__name__'],
        },
        {
          lang: 'java',
          patterns: ['public class', 'public static void main', 'System.out'],
        },
        {
          lang: 'javascript',
          patterns: ['console.log', 'const ', 'let ', '=>', 'function'],
        },
        { lang: 'go', patterns: ['package main', 'func ', 'fmt.Print'] },
        { lang: 'rust', patterns: ['fn main()', 'let mut', 'println!'] },
      ];

      for (const detector of detectors) {
        if (detector.patterns.some((pattern) => code.includes(pattern))) {
          return detector.lang;
        }
      }

      return null;
    }

    // ============================================================
    // MESSAGE HANDLING
    // ============================================================

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage) {
        logWarn('Browser API not available');
        return;
      }

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          log('Received message:', request.action);

          if (request.action === 'extractSubmission') {
            this.handleExtractSubmission(sendResponse);
            return true; // Keep channel open for async response
          }

          if (request.action === 'extractProblemDetails') {
            this.handleExtractProblemDetails(sendResponse);
            return true;
          }

          if (request.action === 'extractTutorial') {
            this.handleExtractTutorial(sendResponse);
            return true;
          }

          if (request.action === 'ping') {
            sendResponse({ success: true, platform: PLATFORM });
            return true;
          }

          if (request.action === 'getPageType') {
            sendResponse({
              success: true,
              pageType: this.detectPageType(),
              platform: PLATFORM,
            });
            return true;
          }

          return false;
        }
      );

      log('Message listener set up');
    }

    async handleExtractSubmission(sendResponse) {
      try {
        // If already extracted, return cached result
        if (this.extractionComplete && this.extractionResult) {
          log('Returning cached extraction result');
          sendResponse({ success: true, data: this.extractionResult });
          return;
        }

        // Check page type
        const pageType = this.detectPageType();
        if (pageType !== 'submission') {
          sendResponse({
            success: false,
            error: `Not a submission page (detected: ${pageType})`,
          });
          return;
        }

        // Perform extraction
        const submission = await this.extractSubmission();

        if (submission && submission.submissionId) {
          this.extractionComplete = true;
          this.extractionResult = submission;
          sendResponse({ success: true, data: submission });
        } else {
          sendResponse({
            success: false,
            error: 'Could not extract submission data',
          });
        }
      } catch (error) {
        logError('Extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleExtractProblemDetails(sendResponse) {
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
            error: 'Could not extract problem details',
          });
        }
      } catch (error) {
        logError('Problem extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleExtractTutorial(sendResponse) {
      try {
        const tutorial = await this.extractTutorialContent();

        if (tutorial && tutorial.content) {
          sendResponse({ success: true, data: tutorial });
        } else {
          sendResponse({
            success: false,
            error: 'Could not extract tutorial content',
          });
        }
      } catch (error) {
        logError('Tutorial extraction error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    // ============================================================
    // AUTO-SYNC (for submission pages)
    // ============================================================

    async checkAutoSync() {
      if (!browserAPI?.storage?.sync) return;

      try {
        const result = await new Promise((resolve) => {
          browserAPI.storage.sync.get(['autoSyncEnabled'], resolve);
        });

        if (!result.autoSyncEnabled) {
          log('Auto-sync is disabled');
          return;
        }

        const pageType = this.detectPageType();
        if (pageType !== 'submission') {
          return;
        }

        // Wait a bit for page to fully load
        await sleep(2000);

        const submission = await this.extractSubmission();

        if (submission && submission.sourceCode) {
          log(
            `Submission with verdict ${submission.verdict} detected, triggering auto-sync...`
          );

          browserAPI.runtime.sendMessage(
            {
              action: 'syncSubmission',
              submission: submission,
            },
            (response) => {
              if (response?.success) {
                log('Auto-sync successful');
                this.showNotification('Submission synced to NEUPC!', 'success');
              } else {
                logWarn('Auto-sync failed:', response?.error);
              }
            }
          );
        }
      } catch (error) {
        logError('Auto-sync error:', error);
      }
    }

    showNotification(message, type = 'info') {
      // Create a simple notification element
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#00c853' : type === 'error' ? '#ff1744' : '#2196f3'};
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async init() {
      if (this.initialized) return;

      log('Initializing extractor...');
      log('Page type:', this.detectPageType());
      log('URL:', window.location.href);

      this.setupMessageListener();
      this.initialized = true;

      // Check for auto-sync on submission pages
      if (this.detectPageType() === 'submission') {
        this.checkAutoSync();
      }

      log('Extractor initialized');
    }
  }

  // ============================================================
  // AUTO-INITIALIZE
  // ============================================================

  const extractor = new CodeforcesExtractor();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => extractor.init());
  } else {
    extractor.init();
  }
})();
