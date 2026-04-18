/**
 * NEUPC CodeChef Extractor (Standalone)
 * Self-contained script without ES module imports for Firefox compatibility
 * Extracts submission and problem details from CodeChef pages.
 */

(function () {
  'use strict';

  if (window.__NEUPC_CODECHEF_INJECTED__) {
    console.warn('[NEUPC:codechef] Already injected, skipping');
    return;
  }
  window.__NEUPC_CODECHEF_INJECTED__ = true;

  const PLATFORM = 'codechef';
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

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = safeQuery(selector);
      if (el) {
        resolve(el);
        return;
      }

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

  function decodeHtmlEntities(value) {
    if (value == null) return '';

    return String(value)
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
        const codePoint = Number.parseInt(hex, 16);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : '';
      })
      .replace(/&#(\d+);/g, (_, decimal) => {
        const codePoint = Number.parseInt(decimal, 10);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : '';
      })
      .trim();
  }

  function stripHtmlTags(value) {
    if (value == null) return '';
    return decodeHtmlEntities(
      String(value)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  function cleanSourceCode(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const cleaned = value
      .replace(/\u0000/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trimEnd();

    return cleaned.length > 0 ? cleaned : null;
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = String(verdict).trim().toUpperCase();

    if (v.includes('PARTIAL')) return 'PC';
    if (v.includes('ACCEPTED') || v === 'AC' || v === 'OK') return 'AC';
    if (v.includes('WRONG') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME') || v === 'RE' || v === 'RTE') return 'RE';
    if (v.includes('COMPIL') || v === 'CE') return 'CE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING')) {
      return 'PENDING';
    }

    return verdict;
  }

  function parseDurationToMs(value) {
    if (!value) return null;
    const text = String(value).trim();
    const match = text.match(
      /([0-9]*\.?[0-9]+)\s*(ms|millisecond|milliseconds|s|sec|second|seconds)/i
    );
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2]).toLowerCase();
    if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
      return Math.round(amount);
    }

    return Math.round(amount * 1000);
  }

  function parseMemoryToKb(value) {
    if (!value) return null;
    const text = String(value).trim();
    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|mb|gb|b)/i);
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2]).toLowerCase();
    if (unit === 'gb') return Math.round(amount * 1024 * 1024);
    if (unit === 'mb') return Math.round(amount * 1024);
    if (unit === 'kb') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return null;
  }

  function parseCodeChefSubmittedAt(value) {
    if (!value) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const directParsed = Date.parse(raw);
    if (Number.isFinite(directParsed)) {
      return new Date(directParsed).toISOString();
    }

    const amPmMatch = raw.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i
    );

    if (!amPmMatch) return null;

    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const second = Number(amPmMatch[3] || 0);
    const amPm = String(amPmMatch[4]).toUpperCase();
    const day = Number(amPmMatch[5]);
    const month = Number(amPmMatch[6]);
    let year = Number(amPmMatch[7]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (
      !Number.isFinite(day) ||
      !Number.isFinite(month) ||
      !Number.isFinite(year)
    ) {
      return null;
    }

    if (year < 100) {
      year = year <= 69 ? 2000 + year : 1900 + year;
    }

    if (amPm === 'PM' && hour < 12) {
      hour += 12;
    } else if (amPm === 'AM' && hour === 12) {
      hour = 0;
    }

    const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
    if (!Number.isFinite(utcMs)) return null;

    return new Date(utcMs).toISOString();
  }

  function parseProblemNameFromTitle(title) {
    const rawTitle = String(title || '').trim();
    if (!rawTitle) return null;

    return rawTitle
      .replace(/\s+CodeChef\s*$/i, '')
      .replace(/\s+Practice\s+Coding\s+Problem\s*$/i, '')
      .replace(/\s+\|\s+CodeChef.*$/i, '')
      .trim();
  }

  function isLikelyGenericCodeChefDescription(text) {
    const normalized = String(text || '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;

    const genericPatterns = [
      /improve your coding skills/i,
      /challenge yourself and solve/i,
      /practical programming coding exercises/i,
      /learn to code for free/i,
      /start learning with codechef/i,
      /codechef:\s*practical coding for everyone/i,
      /pro tip:/i,
      /set the pace, set the goal/i,
      /coding is not difficult/i,
      /flash sale/i,
    ];

    return genericPatterns.some((pattern) => pattern.test(normalized));
  }

  function normalizeStatementText(text) {
    if (!text) return '';

    const noisyLinePatterns = [
      /^pro tip:/i,
      /^set the pace/i,
      /^coding is not difficult/i,
      /^learn to code for free/i,
      /^flash sale/i,
      /^something went wrong/i,
      /^wrong username or password/i,
      /^submission limit reached/i,
      /^clicked on explain solution/i,
      /^1% better everyday/i,
    ];

    return String(text)
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        return !noisyLinePatterns.some((pattern) => pattern.test(trimmed));
      })
      .join('\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function scoreStatementCandidate(text) {
    const normalized = normalizeStatementText(text);
    if (!normalized) return -Infinity;

    const lower = normalized.toLowerCase();
    const sectionMarkers = [
      'input format',
      'output format',
      'constraints',
      'sample input',
      'sample output',
      'examples',
      'problem statement',
    ];

    const markerHits = sectionMarkers.filter((marker) =>
      lower.includes(marker)
    ).length;

    let score = Math.min(30, normalized.length / 80);
    score += markerHits * 10;

    if (normalized.length < 140) {
      score -= 10;
    }

    if (isLikelyGenericCodeChefDescription(normalized)) {
      score -= 40;
    }

    return score;
  }

  function extractDescriptionFromStatement(statementText) {
    const normalized = normalizeStatementText(statementText);
    if (!normalized) return null;

    const sectionStops = [
      'Input',
      'Input Format',
      'Output',
      'Output Format',
      'Constraints',
      'Sample Input',
      'Sample Output',
      'Examples',
      'Explanation',
      'Note',
      'Notes',
    ];

    const labeledDescription = extractLabeledSection(
      normalized,
      ['Problem Statement', 'Statement', 'Description'],
      sectionStops
    );

    if (
      labeledDescription &&
      labeledDescription.trim().length >= 30 &&
      !isLikelyGenericCodeChefDescription(labeledDescription)
    ) {
      return labeledDescription.trim();
    }

    const prefaceMatch = normalized.match(
      /^[\s\S]*?(?=\n\s*(?:Input(?:\s+Format)?|Output(?:\s+Format)?|Constraints?|Sample\s+Input|Sample\s+Output|Examples?|Explanation|Note|Notes)\s*:?)/i
    );

    const preface = String(prefaceMatch?.[0] || '')
      .replace(/^Problem\s+Statement\s*:?\s*/i, '')
      .trim();

    if (
      preface &&
      preface.split(/\s+/).length >= 12 &&
      !isLikelyGenericCodeChefDescription(preface)
    ) {
      return preface;
    }

    return null;
  }

  function extractLabeledSection(text, labels, stopLabels) {
    if (!text || !Array.isArray(labels) || labels.length === 0) {
      return null;
    }

    const escapedStops = (Array.isArray(stopLabels) ? stopLabels : [])
      .map((label) => String(label || '').trim())
      .filter(Boolean)
      .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const stopGroup =
      escapedStops.length > 0
        ? `(?:${escapedStops.join('|')})`
        : '(?:Input(?:\\s+Format)?|Output(?:\\s+Format)?|Constraints?|Sample\\s+Input|Sample\\s+Output|Example|Examples|Explanation|Note|Notes)';

    for (const label of labels) {
      const escapedLabel = String(label || '')
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escapedLabel) continue;

      const pattern = new RegExp(
        `(?:^|\\n)\\s*${escapedLabel}\\s*:?[\\t ]*([\\s\\S]*?)(?=\\n\\s*${stopGroup}\\s*:|$)`,
        'i'
      );
      const match = text.match(pattern);
      if (!match) continue;

      const section = String(match[1] || '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (section.length > 0) {
        return section;
      }
    }

    return null;
  }

  function parseSampleTests(text) {
    if (!text) return [];

    const normalized = String(text).replace(/\r/g, '');
    const tests = [];
    const regex =
      /Sample\s+Input\s*:?([\s\S]*?)\n\s*Sample\s+Output\s*:?([\s\S]*?)(?=\n\s*(?:Sample\s+Input|Explanation|Note|Notes|Constraints?|$))/gi;

    let match;
    while ((match = regex.exec(normalized)) != null && tests.length < 5) {
      const input = String(match[1] || '').trim();
      const output = String(match[2] || '').trim();
      if (!input && !output) continue;
      tests.push({ input, output });
    }

    return tests;
  }

  class CodeChefExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (
        path.includes('/viewsolution/') ||
        path.includes('/submit/complete/')
      ) {
        return 'submission';
      }
      if (path.includes('/status/') || path.includes('/recent/user')) {
        return 'submissions';
      }
      if (path.includes('/problems/')) {
        return 'problem';
      }

      return 'unknown';
    }

    getSubmissionIdFromUrl() {
      return (
        window.location.pathname.match(/\/complete\/([A-Z0-9]+)/i)?.[1] ||
        window.location.pathname.match(/\/viewsolution\/(\d+)/)?.[1] ||
        new URL(window.location.href).searchParams.get('id')
      );
    }

    async getUserHandle() {
      const userLink = safeQuery('a[href^="/users/"]');
      if (userLink) {
        const href = userLink.getAttribute('href') || '';
        const match = href.match(/\/users\/([^/]+)/);
        if (match?.[1]) return match[1];
      }

      const profileElement = safeQuery(
        '[class*="user-name"], [class*="username"]'
      );
      if (profileElement) {
        const text = extractText(profileElement);
        if (text) return text;
      }

      return null;
    }

    parseProblemRefFromUrl(rawUrl) {
      const url = String(rawUrl || '').trim();
      if (!url) {
        return {
          contestId: null,
          problemId: null,
        };
      }

      let path = url;
      try {
        const parsed = new URL(url, window.location.origin);
        path = parsed.pathname || '';
      } catch {
        path = url;
      }

      const segmented = path.match(/^\/?([^/?#]+)\/problems\/([^/?#]+)/i);
      if (segmented) {
        const segment = decodeHtmlEntities(segmented[1]) || '';
        return {
          contestId: segment.toLowerCase() === 'problems' ? null : segment,
          problemId: decodeHtmlEntities(segmented[2]) || null,
        };
      }

      const standalone = path.match(/^\/?problems\/([^/?#]+)/i);
      if (standalone) {
        return {
          contestId: null,
          problemId: decodeHtmlEntities(standalone[1]) || null,
        };
      }

      return {
        contestId: null,
        problemId: null,
      };
    }

    getProblemLinkCandidate() {
      const links = safeQueryAll('a[href*="/problems/"]');
      if (links.length === 0) {
        return null;
      }

      const scored = links
        .map((link) => {
          const href = link.getAttribute('href') || link.href || '';
          const text = extractText(link);
          let score = 0;

          if (/\/problems\//i.test(href)) {
            score += 6;
          }
          if (text && text.length <= 48) {
            score += 1;
          }
          if (/^[A-Z0-9_()+\-]{2,}$/.test(text)) {
            score += 3;
          }
          if (link.closest('header, nav, footer')) {
            score -= 4;
          }
          if (/\/status\//i.test(href)) {
            score -= 2;
          }
          if (/viewsolution/i.test(href)) {
            score -= 3;
          }

          return {
            link,
            score,
            text,
            href,
          };
        })
        .sort((a, b) => b.score - a.score);

      return scored[0]?.link || null;
    }

    looksLikeCode(text) {
      if (typeof text !== 'string') return false;
      const trimmed = text.trim();
      if (trimmed.length < 20) return false;

      const signals = [
        /#include\s*</,
        /\bint\s+main\s*\(/,
        /\bpublic\s+static\s+void\s+main\b/,
        /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
        /\bclass\s+[A-Za-z_][A-Za-z0-9_]*/,
        /\busing\s+namespace\b/,
        /\bconsole\.log\b/i,
        /\bprintln\b/i,
        /\{[\s\S]{20,}\}/,
      ];

      if (signals.some((re) => re.test(trimmed))) {
        return true;
      }

      const lineCount = trimmed.split('\n').length;
      return lineCount >= 4;
    }

    async fetchSubmissionCodeFromApi(submissionId) {
      if (!submissionId) {
        return null;
      }

      try {
        const response = await fetch(
          `/api/submission-code/${encodeURIComponent(submissionId)}`,
          {
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          return null;
        }

        const payload = await response.json();
        const sourceCode = cleanSourceCode(
          payload?.data?.code || payload?.code || null
        );
        return sourceCode;
      } catch {
        return null;
      }
    }

    async extractSourceCode(submissionId) {
      const apiCode = await this.fetchSubmissionCodeFromApi(submissionId);
      if (apiCode) {
        log('Source code extracted via CodeChef API', {
          submissionId,
          length: apiCode.length,
        });
        return apiCode;
      }

      const selectors = [
        '.CodeMirror-code',
        '.CodeMirror pre',
        '[class*="view-solution"] pre',
        '[class*="solution"] pre',
        '[class*="submission"] pre',
        'pre code',
        'pre',
      ];

      const candidates = [];

      for (const selector of selectors) {
        const elements = safeQueryAll(selector);
        for (const element of elements) {
          const raw = element?.textContent || '';
          const cleaned = cleanSourceCode(raw);
          if (!cleaned || !this.looksLikeCode(cleaned)) {
            continue;
          }

          let score = cleaned.length;
          if (selector.includes('CodeMirror')) {
            score += 300;
          }
          if (selector.includes('view-solution')) {
            score += 200;
          }
          if ((cleaned.match(/\n/g) || []).length >= 8) {
            score += 150;
          }

          candidates.push({
            selector,
            text: cleaned,
            score,
          });
        }
      }

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      log('Source code extracted via DOM fallback', {
        selector: best.selector,
        length: best.text.length,
      });
      return best.text;
    }

    async extractSubmission() {
      try {
        const submissionId = this.getSubmissionIdFromUrl();
        if (!submissionId) {
          log('No submission ID in URL');
          return null;
        }

        await waitForElement('body', 3000).catch(() => null);
        await sleep(700);

        const problemLink = this.getProblemLinkCandidate();

        let problemId = null;
        let problemUrl = null;
        let problemName = null;
        let contestId = null;

        if (problemLink) {
          problemUrl =
            problemLink.href || problemLink.getAttribute('href') || null;
          problemName = extractText(problemLink) || null;
          const parsed = this.parseProblemRefFromUrl(problemUrl);
          problemId = parsed.problemId;
          contestId = parsed.contestId;
        }

        if (!problemId) {
          const fromPath = this.parseProblemRefFromUrl(
            window.location.pathname
          );
          problemId = fromPath.problemId || null;
          contestId = contestId || fromPath.contestId;
        }

        if (!problemName) {
          problemName = parseProblemNameFromTitle(document.title) || problemId;
        }

        const pageText = String(document.body?.innerText || '');

        const verdictCandidates = [];
        const verdictSelectors = [
          '[class*="status"] [title]',
          '[class*="result"] [title]',
          '[class*="submission"] [title]',
          '[class*="status"]',
          '[class*="result"]',
        ];

        for (const selector of verdictSelectors) {
          const elements = safeQueryAll(selector);
          for (const element of elements) {
            const title = element.getAttribute('title');
            const label = element.getAttribute('aria-label');
            const text = extractText(element);
            [title, label, text].forEach((candidate) => {
              if (!candidate) return;
              verdictCandidates.push(String(candidate));
            });
          }
          if (verdictCandidates.length > 0) break;
        }

        const pageVerdictMatch = pageText.match(
          /(accepted|partially accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|running)/i
        );
        if (pageVerdictMatch) {
          verdictCandidates.push(pageVerdictMatch[1]);
        }

        const verdict = normalizeVerdict(verdictCandidates[0] || 'UNKNOWN');

        const languageSelectors = [
          'td[title]',
          '[class*="language"]',
          '[class*="lang"]',
        ];

        let language = null;

        for (const selector of languageSelectors) {
          const elements = safeQueryAll(selector);
          for (const element of elements) {
            const title = element.getAttribute('title');
            const text = title || extractText(element);
            if (!text) continue;
            const candidate = decodeHtmlEntities(text).trim();
            if (!candidate || candidate.length > 48) continue;
            if (/^view$/i.test(candidate)) continue;
            if (/\d{1,2}:\d{2}\s*(am|pm)/i.test(candidate)) continue;

            if (
              /(c\+\+|python|java|pypy|javascript|kotlin|go|rust|c#|c\b|php)/i.test(
                candidate
              )
            ) {
              language = candidate;
              break;
            }
          }
          if (language) break;
        }

        if (!language) {
          const languageMatch = pageText.match(
            /(?:Lang(?:uage)?)[\s:]+([A-Za-z0-9+#().\- ]{1,40})/i
          );
          language = languageMatch?.[1]?.trim() || 'Unknown';
        }

        const runtimeMatch = pageText.match(
          /(?:Time|Runtime)[\s:]+([0-9]*\.?[0-9]+\s*(?:ms|s|sec|second|seconds))/i
        );
        const executionTime = runtimeMatch
          ? parseDurationToMs(runtimeMatch[1])
          : null;

        const memoryMatch = pageText.match(
          /(?:Mem(?:ory)?)[\s:]+([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i
        );
        const memoryUsed = memoryMatch ? parseMemoryToKb(memoryMatch[1]) : null;

        let submittedAt = null;
        const timestampCell = safeQuery(
          "td[title*='AM'], td[title*='PM'], td[title*='/']"
        );
        if (timestampCell) {
          submittedAt = parseCodeChefSubmittedAt(
            timestampCell.getAttribute('title')
          );
        }

        const sourceCode = await this.extractSourceCode(submissionId);

        const submission = {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId: problemId || `cc_problem_${submissionId}`,
          problemName: problemName || problemId || `Problem ${submissionId}`,
          problemUrl: problemUrl,
          contestId: contestId,
          submissionId,
          submissionUrl: window.location.href,
          verdict,
          language: language || 'Unknown',
          executionTime,
          memoryUsed,
          submittedAt,
          sourceCode,
        };

        log('Extracted submission', {
          submissionId,
          problemId: submission.problemId,
          verdict: submission.verdict,
          language: submission.language,
          sourceLength: submission.sourceCode?.length || 0,
        });

        return submission;
      } catch (error) {
        logError('Error extracting submission:', error);
        return null;
      }
    }

    hasMeaningfulProblemDetails(details) {
      if (!details || typeof details !== 'object') {
        return false;
      }

      const description = String(details.description || '').trim();
      const inputFormat = String(details.inputFormat || '').trim();
      const outputFormat = String(details.outputFormat || '').trim();
      const constraints = String(details.constraints || '').trim();
      const examples = Array.isArray(details.examples) ? details.examples : [];

      const hasDescription =
        description.length >= 40 &&
        !isLikelyGenericCodeChefDescription(description);
      const hasInputOutput =
        inputFormat.length >= 5 && outputFormat.length >= 5;
      const hasConstraints = constraints.length >= 8;
      const hasExamples = examples.length > 0;

      return hasDescription || hasInputOutput || hasConstraints || hasExamples;
    }

    async extractProblemDetails() {
      try {
        await waitForElement('body', 4000).catch(() => null);
        await sleep(1000);

        const rawPageText = String(document.body?.innerText || '');
        const pageText = normalizeStatementText(rawPageText);
        const problemId =
          window.location.pathname.match(/\/problems\/([^/?#]+)/i)?.[1] || null;

        const headingText =
          extractText('h1') ||
          extractText('[class*="problem"] h2') ||
          parseProblemNameFromTitle(document.title) ||
          problemId;

        const rawMetaDescription = decodeHtmlEntities(
          safeQuery('meta[name="description"]')?.getAttribute('content') || ''
        );
        const metaDescription =
          rawMetaDescription &&
          !isLikelyGenericCodeChefDescription(rawMetaDescription)
            ? rawMetaDescription
            : null;

        const statementSelectors = [
          '[class*="problem-statement"]',
          '[class*="problemStatement"]',
          '[class*="statement"]',
          '[class*="problem-content"]',
          '.markdown',
          'article',
          'main',
          '.content',
        ];

        const statementCandidates = [];
        for (const selector of statementSelectors) {
          const candidates = safeQueryAll(selector);
          for (const candidate of candidates) {
            const candidateText = normalizeStatementText(candidate?.innerText);
            if (candidateText.length < 120) {
              continue;
            }

            statementCandidates.push({
              selector,
              text: candidateText,
              score: scoreStatementCandidate(candidateText),
            });
          }
        }

        if (pageText.length >= 160) {
          statementCandidates.push({
            selector: 'body',
            text: pageText,
            score: scoreStatementCandidate(pageText) - 12,
          });
        }

        statementCandidates.sort((a, b) => b.score - a.score);
        const bestStatement = statementCandidates[0] || null;
        const statementText = bestStatement?.text || pageText;

        const sectionStops = [
          'Input',
          'Input Format',
          'Output',
          'Output Format',
          'Constraints',
          'Sample Input',
          'Sample Output',
          'Examples',
          'Explanation',
          'Note',
          'Notes',
        ];

        const description =
          extractDescriptionFromStatement(statementText) ||
          (metaDescription && metaDescription.length >= 30
            ? metaDescription
            : null);

        const inputFormat = extractLabeledSection(
          statementText,
          ['Input Format', 'Input'],
          sectionStops
        );

        const outputFormat = extractLabeledSection(
          statementText,
          ['Output Format', 'Output'],
          sectionStops
        );

        const constraints = extractLabeledSection(
          statementText,
          ['Constraints'],
          sectionStops
        );

        const notes = extractLabeledSection(
          statementText,
          ['Note', 'Notes', 'Explanation'],
          sectionStops
        );

        const examples = parseSampleTests(statementText);

        const timeLimitMatch = statementText.match(
          /Time\s*Limit\s*:?\s*([0-9]*\.?[0-9]+\s*(?:ms|s|sec|second|seconds))/i
        );
        const memoryLimitMatch = statementText.match(
          /Memory\s*Limit\s*:?\s*([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i
        );

        const timeLimitMs = timeLimitMatch
          ? parseDurationToMs(timeLimitMatch[1])
          : null;
        const memoryLimitKb = memoryLimitMatch
          ? parseMemoryToKb(memoryLimitMatch[1])
          : null;

        const details = {
          platform: this.platform,
          problemId,
          problemName: headingText || problemId || null,
          description,
          problemDescription: description,
          problem_description: description,
          inputFormat,
          input_format: inputFormat,
          outputFormat,
          output_format: outputFormat,
          constraints,
          examples,
          sample_tests: examples,
          notes,
          tutorialUrl: null,
          tutorial_url: null,
          tutorialContent: null,
          tutorial_content: null,
          tutorialSolutions: [],
          tutorial_solutions: [],
          timeLimitMs,
          time_limit_ms: timeLimitMs,
          memoryLimitKb,
          memory_limit_kb: memoryLimitKb,
          tags: [],
        };

        if (!this.hasMeaningfulProblemDetails(details)) {
          log('Problem details not meaningful yet', {
            problemId,
            bestSelector: bestStatement?.selector || null,
            bestScore: bestStatement?.score ?? null,
          });
          return null;
        }

        log('Extracted problem details', {
          problemId,
          bestSelector: bestStatement?.selector || null,
          bestScore: bestStatement?.score ?? null,
          hasDescription:
            typeof description === 'string' && description.trim().length > 20,
          examples: Array.isArray(examples) ? examples.length : 0,
          hasConstraints:
            typeof constraints === 'string' && constraints.trim().length > 0,
        });

        return details;
      } catch (error) {
        logError('Error extracting problem details:', error);
        return null;
      }
    }

    isSubmissionReady() {
      if (!this.getSubmissionIdFromUrl()) {
        return false;
      }

      const bodyTextLength = String(document.body?.innerText || '').trim()
        .length;
      return bodyTextLength > 40;
    }

    isProblemPageReady() {
      const normalizedText = normalizeStatementText(document.body?.innerText);
      if (normalizedText.length < 160) {
        return false;
      }

      const lower = normalizedText.toLowerCase();
      const markerHits = [
        'input format',
        'output format',
        'constraints',
        'sample input',
        'sample output',
      ].filter((marker) => lower.includes(marker)).length;

      if (markerHits >= 2) {
        return true;
      }

      const statementCandidates = safeQueryAll(
        '[class*="problem-statement"], [class*="problemStatement"], [class*="statement"], .markdown, article, [class*="problem-content"]'
      )
        .map((element) => normalizeStatementText(element?.innerText || ''))
        .filter(
          (text) =>
            text.length >= 160 && !isLikelyGenericCodeChefDescription(text)
        );

      return statementCandidates.length > 0;
    }

    async handleExtractSubmissionMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'submission') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on submission page',
          });
          return;
        }

        if (!this.isSubmissionReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Submission page still loading',
          });
          return;
        }

        const submission = await this.extractSubmission();

        if (!submission) {
          sendResponse({ success: false, error: 'No submission found' });
          return;
        }

        if (!submission.sourceCode) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'Source code not available yet',
          });
          return;
        }

        sendResponse({
          success: true,
          data: submission,
          error: null,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Extraction failed',
        });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'problem') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on problem page',
          });
          return;
        }

        if (!this.isProblemPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Problem page still loading',
          });
          return;
        }

        const details = await this.extractProblemDetails();

        if (!details || !this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Problem details extraction failed',
        });
      }
    }

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage) {
        return;
      }

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          if (request?.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(sendResponse);
            return true;
          }

          if (request?.action === 'extractProblemDetails') {
            this.handleExtractProblemDetailsMessage(sendResponse);
            return true;
          }

          if (request?.action === 'ping') {
            sendResponse({
              success: true,
              platform: this.platform,
              pageType: this.detectPageType(),
              initialized: this.initialized,
            });
            return true;
          }

          sendResponse({ success: false, error: 'Unknown action' });
          return true;
        }
      );
    }

    storeSubmission(submission) {
      if (!browserAPI?.storage?.local) {
        log('Browser storage API not available');
        return;
      }

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = cached[this.platform] || [];

        const exists = platformCache.some(
          (item) => item.submissionId === submission.submissionId
        );

        if (exists) {
          log('Submission already cached');
          return;
        }

        platformCache.unshift(submission);
        if (platformCache.length > 100) {
          platformCache.pop();
        }

        cached[this.platform] = platformCache;
        browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
          log('Submission cached successfully');
          this.autoSyncIfEnabled(submission);
        });
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI?.runtime || !browserAPI?.storage?.sync) return;

      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          if (result.autoFetchEnabled && result.extensionToken) {
            log('Auto-syncing submission to backend...');

            browserAPI.runtime.sendMessage(
              { action: 'syncSubmission', submission },
              (response) => {
                if (response?.success) {
                  log('Auto-sync successful');
                } else {
                  log('Auto-sync failed:', response?.error || 'Unknown error');
                }
              }
            );
          }
        }
      );
    }

    async init() {
      if (this.initialized) return;

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Initializing extractor on page type:', pageType);

      if (pageType === 'submission') {
        const submission = await this.extractSubmission();
        if (submission) {
          this.storeSubmission(submission);
        }
      }

      this.initialized = true;
      log('Extractor initialized');
    }
  }

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new CodeChefExtractor();
    extractor.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
