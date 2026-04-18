/**
 * NEUPC LeetCode Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility
 *
 * Supported pages:
 * - Submission page: /submissions/detail/{id}/
 * - Problem page: /problems/{slug}/
 * - Submissions list: /problems/{slug}/submissions/
 *
 * Note: LeetCode uses React SPA with GraphQL API and dynamic rendering
 */

(function () {
  'use strict';

  if (window.__NEUPC_LEETCODE_INJECTED__) {
    console.warn('[NEUPC:leetcode] Already injected, skipping');
    return;
  }
  window.__NEUPC_LEETCODE_INJECTED__ = true;

  // ============================================================
  // UTILITIES
  // ============================================================

  const PLATFORM = 'leetcode';
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

  function logTest(label, payload = null) {
    if (payload == null) {
      console.warn(`[NEUPC:${PLATFORM}][TEST] ${label}`);
      return;
    }
    console.warn(`[NEUPC:${PLATFORM}][TEST] ${label}`, payload);
  }

  function safeQuery(selector, context = document) {
    try {
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
    if (v.includes('OUTPUT LIMIT') || v === 'OLE') return 'OLE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING'))
      return 'PENDING';

    return verdict;
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  }

  function parseRuntimeToMs(runtime) {
    if (runtime == null) return null;
    const text = String(runtime).trim();
    const match = text.match(/(\d+)/);
    if (!match) return null;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }

  function parseMemoryToKb(memory) {
    if (memory == null) return null;

    if (typeof memory === 'number' && Number.isFinite(memory)) {
      // LeetCode may return memory as MB (decimal) or already as KB.
      // Use a conservative heuristic to avoid multiplying KB values again.
      return memory > 2048 ? Math.round(memory) : Math.round(memory * 1024);
    }

    const text = String(memory).trim();
    const match = text.match(/([0-9]*\.?[0-9]+)/);
    if (!match) return null;

    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) return null;

    const upper = text.toUpperCase();
    if (upper.includes('GB')) return Math.round(value * 1024 * 1024);
    if (upper.includes('KB')) return Math.round(value);
    if (upper.includes('B') && !upper.includes('MB')) {
      return Math.round(value / 1024);
    }

    return Math.round(value * 1024);
  }

  function parseUnixTimestampToIso(timestamp) {
    const seconds = Number.parseInt(String(timestamp || ''), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    const parsed = new Date(seconds * 1000);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString();
  }

  // ============================================================
  // LEETCODE EXTRACTOR
  // ============================================================

  class LeetCodeExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
      this.observer = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      // Submission detail page: /submissions/detail/{id}/
      if (path.includes('/submissions/detail/')) {
        return 'submission';
      }

      // Submissions list on a problem: /problems/{slug}/submissions/
      if (path.match(/\/problems\/[^/]+\/submissions/)) {
        return 'submissions';
      }

      // Problem page and known sub-pages:
      // /problems/{slug}/
      // /problems/{slug}/description/
      // /problems/{slug}/solutions/
      // /problems/{slug}/editorial/
      if (
        path.match(
          /^\/problems\/[^/]+(?:\/(?:description|solutions|editorial|discuss)\/?)?$/
        )
      ) {
        return 'problem';
      }

      // User submissions: /{username}/submissions/ or /submissions/
      if (path.includes('/submissions')) {
        return 'submissions';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // Try to find username from navbar or profile elements
      const selectors = [
        '[data-cy="header-user-name"]',
        'a[href^="/@"]',
        'a[href^="/u/"]',
        '[class*="profile"] a',
        '[class*="username"]',
        'nav a[href*="/profile/"]',
      ];

      for (const selector of selectors) {
        const el = safeQuery(selector);
        if (el) {
          const href = el.getAttribute('href');
          if (href) {
            const match =
              href.match(/\/@([^/]+)/) || href.match(/\/u\/([^/]+)/);
            if (match) return match[1];
          }
          const text = extractText(el);
          if (text && !text.includes('Sign') && !text.includes('Log')) {
            return text;
          }
        }
      }

      return null;
    }

    async extractSubmission() {
      try {
        const submissionId = window.location.pathname.match(
          /\/submissions\/detail\/(\d+)/
        )?.[1];
        if (!submissionId) {
          log('No submission ID in URL');
          return null;
        }

        log('Extracting submission:', submissionId);

        await waitForElement(
          '[class*="submission"], [data-submission]',
          10000
        ).catch(() => {
          logWarn('Submission container not found');
        });

        await sleep(1000);

        let problemId = null;
        let problemUrl = null;
        let problemName = null;
        let verdict = 'UNKNOWN';
        let language = 'Unknown';
        let executionTime = null;
        let memoryUsed = null;
        let submittedAt = null;
        let difficultyRating = null;
        let tags = [];
        let sourceCode = null;
        let problemDescription = null;
        let inputFormat = null;
        let outputFormat = null;
        let constraints = null;
        let examples = [];
        let notes = null;
        let tutorialUrl = null;
        let tutorialContent = null;
        let tutorialSolutions = [];
        let timeLimitMs = null;
        let memoryLimitKb = null;

        const submissionDetails =
          await this.fetchSubmissionDetails(submissionId);
        logTest('submission_graphql_result', {
          submissionId,
          found: !!submissionDetails,
          hasQuestion: !!submissionDetails?.question,
          hasCode: typeof submissionDetails?.code === 'string',
          hasRuntime:
            submissionDetails?.runtimeDisplay != null ||
            submissionDetails?.runtime != null,
          hasMemory:
            submissionDetails?.memoryDisplay != null ||
            submissionDetails?.memory != null,
          hasTimestamp: submissionDetails?.timestamp != null,
        });
        if (submissionDetails) {
          const question = submissionDetails.question || null;

          if (question?.titleSlug) {
            problemId = question.titleSlug;
          }
          if (question?.title) {
            problemName = question.title;
          }
          if (problemId) {
            problemUrl = `https://leetcode.com/problems/${problemId}/`;
          }

          if (submissionDetails.statusDisplay) {
            verdict = submissionDetails.statusDisplay;
          }
          if (submissionDetails.lang) {
            language = submissionDetails.lang;
          }

          const runtimeFromApi = parseRuntimeToMs(
            submissionDetails.runtimeDisplay ?? submissionDetails.runtime
          );
          if (runtimeFromApi != null) {
            executionTime = runtimeFromApi;
          }

          const memoryFromApi = parseMemoryToKb(
            submissionDetails.memoryDisplay ?? submissionDetails.memory
          );
          if (memoryFromApi != null) {
            memoryUsed = memoryFromApi;
          }

          const submittedAtFromApi = parseUnixTimestampToIso(
            submissionDetails.timestamp
          );
          if (submittedAtFromApi) {
            submittedAt = submittedAtFromApi;
          }

          if (question?.difficulty) {
            difficultyRating = this.mapDifficultyToRating(question.difficulty);
          }

          if (Array.isArray(question?.topicTags)) {
            tags = question.topicTags.map((tag) => tag?.name).filter(Boolean);
          }

          if (typeof submissionDetails.code === 'string') {
            const code = submissionDetails.code.trim();
            if (code.length > 0) {
              sourceCode = code;
            }
          }
        }

        if (!problemId || !problemName || !problemUrl) {
          const problemLink = safeQuery('a[href*="/problems/"]');
          if (problemLink) {
            problemUrl = problemLink.href;
            const match = problemUrl.match(/\/problems\/([a-z0-9-]+)/);
            if (match) problemId = match[1];
            problemName = extractText(problemLink) || problemName;
          }

          if (!problemId) {
            const breadcrumb = safeQuery(
              '[class*="breadcrumb"], [class*="problem-title"]'
            );
            if (breadcrumb) {
              const link = safeQuery('a[href*="/problems/"]', breadcrumb);
              if (link) {
                const match = link.href.match(/\/problems\/([a-z0-9-]+)/);
                if (match) {
                  problemId = match[1];
                  problemName = extractText(link) || problemName;
                  problemUrl = link.href;
                }
              }
            }
          }
        }

        if (!submissionDetails?.statusDisplay) {
          const verdictSelectors = [
            '[data-e2e-locator="submission-result"]',
            '[class*="text-green"], [class*="text-red"]',
            '[class*="accepted"], [class*="rejected"]',
            '[class*="status-column"]',
            '.ant-badge',
            '[class*="result"]',
          ];

          for (const selector of verdictSelectors) {
            const el = safeQuery(selector);
            if (el) {
              const text = extractText(el);
              if (text) {
                verdict = text;
                break;
              }
            }
          }
        }

        if (!submissionDetails?.lang) {
          const langSelectors = [
            '[data-e2e-locator="submission-lang"]',
            '[class*="language"]',
            '[class*="lang-name"]',
            'select option[selected]',
          ];

          for (const selector of langSelectors) {
            const el = safeQuery(selector);
            if (el) {
              const text = extractText(el);
              if (text && text.length < 30) {
                language = text;
                break;
              }
            }
          }
        }

        if (executionTime == null || memoryUsed == null) {
          const pageText = document.body.innerText;

          if (executionTime == null) {
            const runtimePatterns = [/Runtime[:\s]+(\d+)\s*ms/i, /(\d+)\s*ms/];
            for (const pattern of runtimePatterns) {
              const match = pageText.match(pattern);
              if (match) {
                executionTime = parseInt(match[1], 10);
                break;
              }
            }
          }

          if (memoryUsed == null) {
            const memoryPatterns = [
              /Memory[:\s]+(\d+\.?\d*)\s*MB/i,
              /Memory[:\s]+(\d+\.?\d*)\s*KB/i,
              /(\d+\.?\d*)\s*MB/,
            ];
            for (const pattern of memoryPatterns) {
              const match = pageText.match(pattern);
              if (match) {
                const value = parseFloat(match[1]);
                if (pattern.source.includes('MB') || match[0].includes('MB')) {
                  memoryUsed = Math.round(value * 1024);
                } else {
                  memoryUsed = Math.round(value);
                }
                break;
              }
            }
          }
        }

        if (!submittedAt) {
          const timeSelectors = [
            'time',
            '[datetime]',
            '[class*="timestamp"]',
            '[class*="time"]',
          ];

          for (const selector of timeSelectors) {
            const el = safeQuery(selector);
            if (el) {
              const datetime = el.getAttribute('datetime') || extractText(el);
              const parsed = parseDate(datetime);
              if (parsed) {
                submittedAt = parsed;
                break;
              }
            }
          }
        }

        if (!sourceCode) {
          sourceCode = await this.extractSourceCode();
        }

        if (!problemUrl && problemId) {
          problemUrl = `https://leetcode.com/problems/${problemId}/`;
        }

        if (
          problemId &&
          (!problemName ||
            difficultyRating == null ||
            tags.length === 0 ||
            !problemDescription ||
            !inputFormat ||
            !outputFormat ||
            !constraints ||
            examples.length === 0 ||
            !notes ||
            !tutorialContent ||
            timeLimitMs == null ||
            memoryLimitKb == null)
        ) {
          const metadata = await this.fetchQuestionData(problemId);
          if (metadata) {
            if (metadata.title && !problemName) {
              problemName = metadata.title;
            }

            if (difficultyRating == null) {
              difficultyRating = this.mapDifficultyToRating(
                metadata.difficulty
              );
            }

            if (tags.length === 0 && Array.isArray(metadata.topicTags)) {
              tags = metadata.topicTags.map((tag) => tag?.name).filter(Boolean);
            }

            const contentHtml =
              metadata.translatedContent || metadata.content || null;
            const structured = this.extractStructuredProblemContent(contentHtml);

            problemDescription = structured.description;
            inputFormat = structured.inputFormat;
            outputFormat = structured.outputFormat;
            constraints = structured.constraints;
            examples = structured.examples;
            notes = structured.notes;
            timeLimitMs = structured.timeLimitMs;
            memoryLimitKb = structured.memoryLimitKb;

            if (
              examples.length === 0 &&
              typeof metadata.exampleTestcases === 'string'
            ) {
              const sampleInputs = metadata.exampleTestcases
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .slice(0, 5);

              if (sampleInputs.length > 0) {
                examples = sampleInputs.map((input) => ({ input, output: '' }));
                if (!inputFormat) {
                  inputFormat = `Input: ${sampleInputs[0]}`;
                }
              }
            }

            if (
              (!inputFormat || !outputFormat || !constraints) &&
              typeof metadata.metaData === 'string'
            ) {
              try {
                const parsedMeta = JSON.parse(metadata.metaData);
                const params = Array.isArray(parsedMeta?.params)
                  ? parsedMeta.params.filter((p) => p?.name || p?.type)
                  : [];
                const returnType =
                  parsedMeta?.return?.type || parsedMeta?.output?.type || null;

                if (!inputFormat && params.length > 0) {
                  inputFormat = params
                    .map((p) => {
                      const name = (p?.name || '').toString().trim();
                      const type = (p?.type || '').toString().trim();
                      if (name && type) return `${name}: ${type}`;
                      return name || type;
                    })
                    .filter(Boolean)
                    .join('\n');
                }

                if (!outputFormat && returnType) {
                  outputFormat = `return: ${String(returnType).trim()}`;
                }

                if (!constraints) {
                  const metaConstraints = Array.isArray(parsedMeta?.constraints)
                    ? parsedMeta.constraints
                        .map((item) => (item || '').toString().trim())
                        .filter(Boolean)
                        .join('\n')
                    : typeof parsedMeta?.constraints === 'string'
                      ? parsedMeta.constraints.trim()
                      : null;

                  if (metaConstraints) {
                    constraints = metaConstraints;
                  }
                }
              } catch (metaError) {
                logWarn(
                  'Failed to parse submission-side metaData:',
                  metaError.message
                );
              }
            }

            if (!notes && Array.isArray(metadata.hints)) {
              const hintText = metadata.hints
                .map((hint) => (hint || '').toString().trim())
                .filter(Boolean)
                .join('\n\n');
              if (hintText) {
                notes = hintText;
              }
            }

            tutorialUrl = problemId
              ? `https://leetcode.com/problems/${problemId}/solutions/`
              : null;

            const solutionContent =
              typeof metadata?.solution?.content === 'string'
                ? metadata.solution.content.trim()
                : null;

            if (solutionContent) {
              tutorialContent = solutionContent;
              tutorialSolutions =
                this.extractTutorialSolutionsFromContent(solutionContent);
            } else if (Array.isArray(metadata.hints)) {
              const hintTutorial = metadata.hints
                .map((hint) => (hint || '').toString().trim())
                .filter(Boolean)
                .join('\n\n');
              if (hintTutorial) {
                tutorialContent = hintTutorial;
              }
            }

            logTest('submission_problem_details_summary', {
              problemId,
              description: !!problemDescription,
              inputFormat: !!inputFormat,
              outputFormat: !!outputFormat,
              constraints: !!constraints,
              examplesCount: Array.isArray(examples) ? examples.length : 0,
              notes: !!notes,
              tutorialContent: !!tutorialContent,
              tutorialSolutionsCount: Array.isArray(tutorialSolutions)
                ? tutorialSolutions.length
                : 0,
              timeLimitMs,
              memoryLimitKb,
            });
          }
        }

        const submission = {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId: problemId || 'unknown',
          problemName: problemName || problemId || '',
          problemUrl: problemUrl || '',
          contestId: '',
          submissionId: submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language: language,
          executionTime: executionTime,
          memoryUsed: memoryUsed,
          // Do not fabricate timestamps for LeetCode.
          submittedAt: submittedAt || null,
          sourceCode: sourceCode,
          difficultyRating: difficultyRating,
          difficulty_rating: difficultyRating,
          tags: tags,
          description: problemDescription,
          problemDescription: problemDescription,
          problem_description: problemDescription,
          inputFormat: inputFormat,
          input_format: inputFormat,
          outputFormat: outputFormat,
          output_format: outputFormat,
          constraints: constraints,
          examples: Array.isArray(examples) ? examples : [],
          sample_tests: Array.isArray(examples) ? examples : [],
          notes: notes,
          tutorialUrl: tutorialUrl,
          tutorial_url: tutorialUrl,
          tutorialContent: tutorialContent,
          tutorial_content: tutorialContent,
          tutorialSolutions: Array.isArray(tutorialSolutions)
            ? tutorialSolutions
            : [],
          tutorial_solutions: Array.isArray(tutorialSolutions)
            ? tutorialSolutions
            : [],
          timeLimitMs: timeLimitMs,
          time_limit_ms: timeLimitMs,
          memoryLimitKb: memoryLimitKb,
          memory_limit_kb: memoryLimitKb,
          timeLimit: timeLimitMs,
          memoryLimit: memoryLimitKb,
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
        '.CodeMirror-code',
        '.view-lines',
        '[class*="code-area"] pre',
        '[class*="ace_content"]',
        'pre code',
        '[data-cy="submission-code"]',
        '.monaco-editor .view-lines',
        '[class*="editor"] pre',
      ];

      for (const selector of codeSelectors) {
        const el = safeQuery(selector);
        if (el) {
          const text = el.textContent.trim();
          if (text.length > 20 && this.looksLikeCode(text)) {
            log(
              'Found source code with selector:',
              selector,
              'length:',
              text.length
            );
            return text;
          }
        }
      }

      // Try getting from line elements
      const lines = safeQueryAll('.view-line, .CodeMirror-line');
      if (lines.length > 0) {
        const code = lines.map((line) => line.textContent).join('\n');
        if (code.length > 20) {
          log('Found source code from line elements, lines:', lines.length);
          return code;
        }
      }

      logWarn('No source code found');
      return null;
    }

    looksLikeCode(text) {
      const indicators = [
        'class ',
        'def ',
        'function ',
        'public ',
        'private ',
        'int ',
        'void ',
        'return ',
        'for ',
        'while ',
        'if ',
        '#include',
        'import ',
        'from ',
        'var ',
        'let ',
        'const ',
        'System.',
        'console.',
        'print(',
        'cout',
        'cin',
      ];
      return indicators.some((ind) => text.includes(ind));
    }

    mapDifficultyToRating(difficulty) {
      if (!difficulty) return null;

      const normalized = String(difficulty).trim().toLowerCase();
      if (normalized === 'easy') return 1200;
      if (normalized === 'medium') return 1700;
      if (normalized === 'hard') return 2300;

      return null;
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

    extractTutorialSolutionsFromContent(contentHtml) {
      const solutions = [];
      if (!contentHtml) return solutions;

      const container = document.createElement('div');
      container.innerHTML = String(contentHtml).trim();

      const codeBlocks = safeQueryAll('pre code, pre', container);
      const seen = new Set();

      for (const block of codeBlocks) {
        const code = extractText(block);
        if (!code || code.length < 20) continue;
        if (seen.has(code)) continue;
        seen.add(code);

        const classHint = `${block.className || ''} ${block.parentElement?.className || ''}`.toLowerCase();
        const langMatch =
          classHint.match(/language-([a-z0-9#+-]+)/i) ||
          classHint.match(/lang(?:uage)?-([a-z0-9#+-]+)/i);
        const language = (langMatch?.[1] || 'unknown').toLowerCase();

        let approachName = null;
        let cursor = block;
        for (let i = 0; i < 4 && cursor; i++) {
          const previous = cursor.previousElementSibling;
          const headingText = extractText(previous);
          if (headingText && headingText.length < 140) {
            approachName = headingText;
            break;
          }
          cursor = cursor.parentElement;
        }

        solutions.push({
          code,
          language,
          approach_name: approachName || `Approach ${solutions.length + 1}`,
          order: solutions.length + 1,
        });

        if (solutions.length >= 10) break;
      }

      return solutions;
    }

    getCurrentProblemSlug() {
      const match = window.location.pathname.match(/\/problems\/([^/]+)/);
      return match?.[1] || null;
    }

    async fetchSubmissionDetails(submissionId) {
      const parsedSubmissionId = Number.parseInt(
        String(submissionId || ''),
        10
      );
      if (!Number.isFinite(parsedSubmissionId) || parsedSubmissionId <= 0) {
        return null;
      }

      const queries = [
        {
          field: 'submissionDetails',
          query: `
            query submissionDetails($submissionId: Int!) {
              submissionDetails(submissionId: $submissionId) {
                runtime
                runtimeDisplay
                memory
                memoryDisplay
                code
                timestamp
                statusDisplay
                lang
                question {
                  title
                  titleSlug
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                }
              }
            }
          `,
        },
        {
          field: 'submissionDetail',
          query: `
            query submissionDetail($submissionId: Int!) {
              submissionDetail(submissionId: $submissionId) {
                runtime
                memory
                code
                timestamp
                statusDisplay
                lang
                question {
                  title
                  titleSlug
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                }
              }
            }
          `,
        },
      ];

      const csrfMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
      const headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };

      if (csrfMatch?.[1]) {
        headers['x-csrftoken'] = decodeURIComponent(csrfMatch[1]);
      }

      let lastError = null;

      for (const attempt of queries) {
        try {
          const response = await fetch('/graphql', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              query: attempt.query,
              variables: {
                submissionId: parsedSubmissionId,
              },
            }),
          });

          if (!response.ok) {
            lastError = `HTTP ${response.status}`;
            continue;
          }

          const payload = await response.json();
          if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
            lastError = payload.errors[0]?.message || 'GraphQL error';
            continue;
          }

          const details = payload?.data?.[attempt.field];
          if (details && typeof details === 'object') {
            logTest('submission_graphql_field_success', {
              field: attempt.field,
              submissionId: parsedSubmissionId,
            });
            return details;
          }
        } catch (error) {
          lastError = error.message;
        }
      }

      if (lastError) {
        logWarn('Failed to fetch submission details from GraphQL:', lastError);
        logTest('submission_graphql_field_failure', {
          submissionId: parsedSubmissionId,
          error: lastError,
        });
      }

      return null;
    }

    async fetchQuestionData(titleSlug) {
      if (!titleSlug) return null;

      try {
        const queryAttempts = [
          {
            label: 'with_solution',
            query: `
              query questionData($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                  questionId
                  questionFrontendId
                  title
                  titleSlug
                  content
                  translatedContent
                  metaData
                  exampleTestcases
                  hints
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                  solution {
                    id
                    canSeeDetail
                    paidOnly
                    hasVideoSolution
                    content
                    contentType
                  }
                }
              }
            `,
          },
          {
            label: 'base',
            query: `
              query questionData($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                  questionId
                  questionFrontendId
                  title
                  titleSlug
                  content
                  translatedContent
                  metaData
                  exampleTestcases
                  hints
                  difficulty
                  topicTags {
                    name
                    slug
                  }
                }
              }
            `,
          },
        ];

        const csrfMatch = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        };

        if (csrfMatch?.[1]) {
          headers['x-csrftoken'] = decodeURIComponent(csrfMatch[1]);
        }

        let lastError = null;

        for (const attempt of queryAttempts) {
          const response = await fetch('/graphql', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              query: attempt.query,
              variables: {
                titleSlug,
              },
            }),
          });

          if (!response.ok) {
            lastError = `GraphQL request failed with HTTP ${response.status}`;
            continue;
          }

          const payload = await response.json();
          if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
            lastError = payload.errors[0]?.message || 'GraphQL error';
            continue;
          }

          const question = payload?.data?.question || null;
          logTest('question_graphql_result', {
            titleSlug,
            queryVariant: attempt.label,
            found: !!question,
            hasContent: !!(question?.translatedContent || question?.content),
            hasMetaData: typeof question?.metaData === 'string',
            hasSolutionContent:
              typeof question?.solution?.content === 'string' &&
              question.solution.content.trim().length > 0,
            exampleTestcasesCount:
              typeof question?.exampleTestcases === 'string'
                ? question.exampleTestcases
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter(Boolean).length
                : 0,
            hintsCount: Array.isArray(question?.hints)
              ? question.hints.length
              : 0,
          });

          if (question) {
            return question;
          }
        }

        throw new Error(lastError || 'Unable to fetch question data');
      } catch (error) {
        logWarn('Failed to fetch question metadata:', error.message);
        return null;
      }
    }

    extractStructuredProblemContent(contentHtml) {
      const empty = {
        description: null,
        inputFormat: null,
        outputFormat: null,
        constraints: null,
        examples: [],
        examplesSource: 'none',
        notes: null,
        timeLimitMs: null,
        memoryLimitKb: null,
      };

      if (!contentHtml) {
        return empty;
      }

      const container = document.createElement('div');
      container.innerHTML = contentHtml.trim();

      // If the content is wrapped in a single root element, unwrap it
      while (
        container.children.length === 1 &&
        container.firstElementChild.tagName !== 'P'
      ) {
        const first = container.firstElementChild;
        container.innerHTML = first.innerHTML;
      }

      const childNodes = Array.from(container.childNodes);

      const isBoundaryHeading = (text) =>
        /^(example\s*\d*:|constraints?:|notes?:|follow\s*-?\s*up:?|input:|output:)/i.test(
          String(text || '').trim()
        );

      const sectionText = (node) =>
        extractText(node)
          .replace(/\u00a0/g, ' ')
          .trim();

      const extractFollowingSectionHtml = (headerRegex) => {
        const headerNodeIndex = childNodes.findIndex((child) =>
          headerRegex.test(sectionText(child))
        );
        if (headerNodeIndex === -1) return null;

        const headerNode = childNodes[headerNodeIndex];
        const chunks = [];

        const inlineRemainder = sectionText(headerNode)
          .replace(headerRegex, '')
          .trim();
        if (inlineRemainder) {
          chunks.push(inlineRemainder);
        }

        let cursorIndex = headerNodeIndex + 1;

        while (cursorIndex < childNodes.length) {
          const cursor = childNodes[cursorIndex];
          const text = sectionText(cursor);

          if (
            (cursor.nodeType === 1 || (cursor.nodeType === 3 && text.trim())) &&
            isBoundaryHeading(text)
          ) {
            break;
          }

          chunks.push(
            cursor.nodeType === 1 ? cursor.outerHTML : cursor.textContent || ''
          );
          cursorIndex++;
        }

        const joined = chunks.join('').trim();
        return joined.length > 0 ? joined : null;
      };

      const descriptionParts = [];
      for (const child of childNodes) {
        const text = sectionText(child);
        if (
          (child.nodeType === 1 || (child.nodeType === 3 && text.trim())) &&
          isBoundaryHeading(text)
        ) {
          break;
        }
        descriptionParts.push(
          child.nodeType === 1 ? child.outerHTML : child.textContent || ''
        );
      }

      const dChunksJoined = descriptionParts.join('').trim();
      if (dChunksJoined.length > 0) {
        empty.description = dChunksJoined;
      } else {
        empty.description = contentHtml.trim() || null;
      }

      const preBlocks = safeQueryAll('pre', container);
      for (const pre of preBlocks) {
        const blockText = sectionText(pre);
        if (!/input\s*:/i.test(blockText) || !/output\s*:/i.test(blockText)) {
          continue;
        }

        const inputMatch = blockText.match(
          /Input\s*:\s*([\s\S]*?)(?:\n\s*Output\s*:|$)/i
        );
        const outputMatch = blockText.match(
          /Output\s*:\s*([\s\S]*?)(?:\n\s*(?:Explanation|Constraints|Note)\s*:|$)/i
        );

        if (inputMatch?.[1] && outputMatch?.[1]) {
          empty.examples.push({
            input: inputMatch[1].trim(),
            output: outputMatch[1].trim(),
          });
        }
      }

      if (empty.examples.length > 0) {
        empty.examplesSource = 'pre';
      }

      // Fallback: parse inline Example blocks when Input/Output is not inside <pre>.
      if (empty.examples.length === 0) {
        const flattened = sectionText(container);
        const exampleRegex =
          /Example\s*\d*\s*:?\s*Input\s*:\s*([\s\S]*?)\s*Output\s*:\s*([\s\S]*?)(?=(?:Example\s*\d*\s*:)|(?:Constraints?\s*:)|(?:Notes?\s*:)|(?:Follow\s*-?\s*up)|$)/gi;

        let match = null;
        while ((match = exampleRegex.exec(flattened)) !== null) {
          const input = (match[1] || '').trim();
          const output = (match[2] || '')
            .split(/\n\s*Explanation\s*:/i)[0]
            .trim();

          if (input && output) {
            empty.examples.push({ input, output });
          }
        }

        if (empty.examples.length > 0) {
          empty.examplesSource = 'inline_regex';
        }
      }

      empty.inputFormat = extractFollowingSectionHtml(/^input\s*:?/i);
      empty.outputFormat = extractFollowingSectionHtml(/^output\s*:?/i);

      empty.constraints = extractFollowingSectionHtml(/^constraints?:/i);
      empty.notes = extractFollowingSectionHtml(
        /^(notes?:|follow\s*-?\s*up)\s*:?/i
      );

      if (!empty.inputFormat && empty.examples.length > 0) {
        empty.inputFormat = `Input: ${empty.examples[0].input}`;
      }

      if (!empty.outputFormat && empty.examples.length > 0) {
        empty.outputFormat = `Output: ${empty.examples[0].output}`;
      }

      const fullText = sectionText(container);
      const timeMatch = fullText.match(
        /Time\s*Limit\s*[:\s]+([0-9]*\.?[0-9]+)\s*(ms|millisecond|sec|second|s)/i
      );
      if (timeMatch) {
        const value = parseFloat(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        if (Number.isFinite(value)) {
          empty.timeLimitMs =
            unit.startsWith('ms') || unit.startsWith('millisecond')
              ? Math.round(value)
              : Math.round(value * 1000);
        }
      }

      const memoryMatch = fullText.match(
        /Memory\s*Limit\s*[:\s]+([0-9]*\.?[0-9]+)\s*(KB|MB|GB|KiB|MiB|GiB)/i
      );
      if (memoryMatch) {
        empty.memoryLimitKb = this.parseMemoryLimitToKb(
          parseFloat(memoryMatch[1]),
          memoryMatch[2]
        );
      }

      return empty;
    }

    async extractProblemDetails() {
      log('Extracting full problem details...');

      const titleSlug = this.getCurrentProblemSlug();
      const details = {
        problemId: titleSlug,
        problemName: null,
        problemUrl: titleSlug
          ? `https://leetcode.com/problems/${titleSlug}/`
          : window.location.href,
        contestId: null,
        description: null,
        problemDescription: null,
        problem_description: null,
        inputFormat: null,
        outputFormat: null,
        input_format: null,
        output_format: null,
        constraints: null,
        examples: [],
        sample_tests: [],
        notes: null,
        tutorialUrl: titleSlug
          ? `https://leetcode.com/problems/${titleSlug}/solutions/`
          : null,
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

      if (!titleSlug) {
        return details;
      }

      const questionData = await this.fetchQuestionData(titleSlug);
      if (questionData) {
        details.problemName = questionData.title || titleSlug;
        details.difficultyRating = this.mapDifficultyToRating(
          questionData.difficulty
        );

        if (Array.isArray(questionData.topicTags)) {
          details.tags = questionData.topicTags
            .map((tag) => tag?.name)
            .filter(Boolean);
        }

        const contentHtml =
          questionData.translatedContent || questionData.content || null;
        const structured = this.extractStructuredProblemContent(contentHtml);
        let examplesSource = structured.examplesSource || 'none';

        details.description = structured.description;
        details.inputFormat = structured.inputFormat;
        details.outputFormat = structured.outputFormat;
        details.constraints = structured.constraints;
        details.examples = structured.examples;
        details.notes = structured.notes;
        details.timeLimitMs = structured.timeLimitMs;
        details.memoryLimitKb = structured.memoryLimitKb;

        const solutionContent =
          typeof questionData?.solution?.content === 'string'
            ? questionData.solution.content.trim()
            : null;

        if (solutionContent) {
          details.tutorialContent = solutionContent;
          details.tutorialSolutions =
            this.extractTutorialSolutionsFromContent(solutionContent);
          logTest('tutorial_content_solution', {
            titleSlug,
            tutorialSolutionsCount: details.tutorialSolutions.length,
          });
        }

        if (
          details.examples.length === 0 &&
          typeof questionData.exampleTestcases === 'string'
        ) {
          const sampleInputs = questionData.exampleTestcases
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 5);

          if (sampleInputs.length > 0) {
            details.examples = sampleInputs.map((input) => ({
              input,
              output: '',
            }));
            examplesSource = 'graphql_exampleTestcases';

            if (!details.inputFormat) {
              details.inputFormat = `Input: ${sampleInputs[0]}`;
            }

            logTest('examples_fallback_exampleTestcases', {
              titleSlug,
              count: sampleInputs.length,
            });
          }
        }

        // Fallback: use question metadata for input/output contracts when
        // statement parsing does not expose explicit sections.
        if (
          (!details.inputFormat || !details.outputFormat) &&
          typeof questionData.metaData === 'string'
        ) {
          try {
            const inputWasMissing = !details.inputFormat;
            const outputWasMissing = !details.outputFormat;
            const parsedMeta = JSON.parse(questionData.metaData);
            const params = Array.isArray(parsedMeta?.params)
              ? parsedMeta.params.filter((p) => p?.name || p?.type)
              : [];
            const returnType =
              parsedMeta?.return?.type || parsedMeta?.output?.type || null;

            if (!details.inputFormat && params.length > 0) {
              details.inputFormat = params
                .map((p) => {
                  const name = (p?.name || '').toString().trim();
                  const type = (p?.type || '').toString().trim();
                  if (name && type) return `${name}: ${type}`;
                  return name || type;
                })
                .filter(Boolean)
                .join('\n');
            }

            if (!details.outputFormat && returnType) {
              details.outputFormat = `return: ${String(returnType).trim()}`;
            }

            if (!details.constraints) {
              const metaConstraints = Array.isArray(parsedMeta?.constraints)
                ? parsedMeta.constraints
                    .map((item) => (item || '').toString().trim())
                    .filter(Boolean)
                    .join('\n')
                : typeof parsedMeta?.constraints === 'string'
                  ? parsedMeta.constraints.trim()
                  : null;

              if (metaConstraints) {
                details.constraints = metaConstraints;
              }
            }

            if (
              (inputWasMissing && details.inputFormat) ||
              (outputWasMissing && details.outputFormat)
            ) {
              logTest('io_fallback_metadata', {
                titleSlug,
                generatedInput: inputWasMissing && !!details.inputFormat,
                generatedOutput: outputWasMissing && !!details.outputFormat,
              });
            }
          } catch (metaError) {
            logWarn('Failed to parse question metaData:', metaError.message);
          }
        }

        // Fallback: include hints as notes when statement does not contain
        // Notes / Follow-up sections.
        if (!details.notes && Array.isArray(questionData.hints)) {
          const hintText = questionData.hints
            .map((hint) => (hint || '').toString().trim())
            .filter(Boolean)
            .join('\n\n');
          if (hintText) {
            details.notes = hintText;
            logTest('notes_fallback_hints', {
              titleSlug,
              hintsCount: questionData.hints.length,
            });
          }
        }

        if (!details.tutorialContent && Array.isArray(questionData.hints)) {
          const hintTutorial = questionData.hints
            .map((hint) => (hint || '').toString().trim())
            .filter(Boolean)
            .join('\n\n');
          if (hintTutorial) {
            details.tutorialContent = hintTutorial;
          }
        }

        logTest('problem_details_summary', {
          titleSlug,
          description: !!details.description,
          inputFormat: !!details.inputFormat,
          outputFormat: !!details.outputFormat,
          constraints: !!details.constraints,
          examplesCount: details.examples.length,
          examplesSource,
          notes: !!details.notes,
          tutorialContent: !!details.tutorialContent,
          tutorialSolutionsCount: Array.isArray(details.tutorialSolutions)
            ? details.tutorialSolutions.length
            : 0,
          hintsCount: Array.isArray(questionData.hints)
            ? questionData.hints.length
            : 0,
          tagsCount: details.tags.length,
          difficultyRating: details.difficultyRating,
          timeLimitMs: details.timeLimitMs,
          memoryLimitKb: details.memoryLimitKb,
        });
      } else {
        const problemBody =
          safeQuery('article') ||
          safeQuery('[data-track-load="description_content"]') ||
          safeQuery('[class*="description"]');

        if (problemBody) {
          const structured = this.extractStructuredProblemContent(
            problemBody.innerHTML
          );

          details.description = structured.description;
          details.inputFormat = structured.inputFormat;
          details.outputFormat = structured.outputFormat;
          details.constraints = structured.constraints;
          details.examples = structured.examples;
          details.notes = structured.notes;
          details.timeLimitMs = structured.timeLimitMs;
          details.memoryLimitKb = structured.memoryLimitKb;

          logTest('problem_details_dom_fallback_summary', {
            titleSlug,
            description: !!details.description,
            inputFormat: !!details.inputFormat,
            outputFormat: !!details.outputFormat,
            constraints: !!details.constraints,
            examplesCount: details.examples.length,
            examplesSource: structured.examplesSource || 'none',
            notes: !!details.notes,
            timeLimitMs: details.timeLimitMs,
            memoryLimitKb: details.memoryLimitKb,
          });
        }
      }

      details.problemDescription = details.description;
      details.problem_description = details.description;
      details.input_format = details.inputFormat;
      details.output_format = details.outputFormat;
      details.sample_tests = details.examples;
      details.timeLimit = details.timeLimitMs;
      details.memoryLimit = details.memoryLimitKb;
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
        tagsCount: details.tags.length,
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
          logTest('runtime_message_received', {
            action: request?.action || null,
            pageType: this.detectPageType(),
          });

          if (request.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(sendResponse);
            return true;
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
        logTest('extract_submission_requested', {
          url: window.location.href,
        });

        // Return cached result if available
        if (this.extractionComplete && this.extractionResult) {
          logTest('extract_submission_cache_hit', {
            submissionId: this.extractionResult?.submissionId || null,
            problemId: this.extractionResult?.problemId || null,
          });
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

        logTest('extract_submission_response', {
          success: !!submission?.sourceCode,
          submissionId: submission?.submissionId || null,
          problemId: submission?.problemId || null,
          verdict: submission?.verdict || null,
          hasCode: !!submission?.sourceCode,
        });
      } catch (error) {
        logError('Extract submission error:', error);
        logTest('extract_submission_error', {
          message: error?.message || String(error),
        });
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
          logTest('extract_problem_details_response', {
            problemId: details.problemId,
            examplesCount: Array.isArray(details.examples)
              ? details.examples.length
              : 0,
            tagsCount: Array.isArray(details.tags) ? details.tags.length : 0,
          });
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
    // PROBLEM PAGE OBSERVER
    // ============================================================

    observeSubmissionSuccess() {
      log('Setting up submission success observer');

      this.observer = new MutationObserver(() => {
        // Look for "Accepted" status appearing
        const acceptedEl = safeQuery(
          '[class*="text-green"][class*="font-bold"]'
        );
        if (
          acceptedEl &&
          extractText(acceptedEl).toLowerCase().includes('accepted')
        ) {
          log('Detected accepted submission!');
          // Could navigate to submission detail page
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async init() {
      if (this.initialized) return;

      log('Initializing extractor on:', window.location.href);
      logTest('extractor_init_start', {
        url: window.location.href,
        readyState: document.readyState,
      });

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Page type:', pageType);
      logTest('page_type_detected', {
        pageType,
        path: window.location.pathname,
      });

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
      } else if (pageType === 'problem') {
        log('Problem page - setting up submission observer');
        this.observeSubmissionSuccess();
      }

      this.initialized = true;
      log('Extractor initialized');
      logTest('extractor_init_complete', {
        pageType,
        initialized: this.initialized,
        extractionComplete: this.extractionComplete,
      });
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
    logTest('content_script_loaded', {
      url: window.location.href,
    });
    const extractor = new LeetCodeExtractor();
    extractor.init();

    // Store reference for debugging
    window.__neupcExtractor = extractor;
    window.__NEUPC_TEST_LOG = (label, payload) => logTest(label, payload);
    logTest('debug_helper_registered', {
      helper: 'window.__NEUPC_TEST_LOG(label, payload)',
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
