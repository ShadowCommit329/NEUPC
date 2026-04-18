/**
 * NEUPC Toph Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility
 * Toph is a popular competitive programming platform in Bangladesh
 *
 * Supported pages:
 * - Submission page: /s/{id}
 * - Problem page: /p/{slug}
 * - Submissions page: /u/{handle}/submissions
 */

(function () {
  'use strict';

  // ============================================================
  // UTILITIES
  // ============================================================

  const PLATFORM = 'toph';
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

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    if (v.includes('ACCEPTED') || v === 'AC') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE') return 'RE';
    if (v.includes('COMPILATION ERROR') || v === 'CE') return 'CE';
    if (v.includes('OUTPUT LIMIT') || v === 'OLE') return 'OLE';
    if (
      v.includes('PENDING') ||
      v.includes('QUEUE') ||
      v.includes('RUNNING') ||
      v.includes('JUDGING')
    ) {
      return 'PENDING';
    }

    return verdict;
  }

  // ============================================================
  // TOPH EXTRACTOR
  // ============================================================

  class TophExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      // Single submission page: /s/{id}
      if (path.match(/\/s\/[a-z0-9]+\/?$/i)) {
        return 'submission';
      }

      // Submissions list: /u/{handle}/submissions
      if (path.includes('/submissions')) {
        return 'submissions';
      }

      // Problem page: /p/{slug}
      if (path.match(/\/p\/[^/?#]+\/?$/i)) {
        return 'problem';
      }

      // User profile: /u/{handle}
      if (path.match(/\/u\/[^/]+$/)) {
        return 'profile';
      }

      return 'unknown';
    }

    async getUserHandle() {
      // From submission page - look for user link
      const userLinks = safeQueryAll('a[href*="/u/"]');
      for (const link of userLinks) {
        const href = link.getAttribute('href');
        const match = href?.match(/\/u\/([^/?#]+)/);
        if (match) {
          return match[1];
        }
      }

      // From navbar if logged in
      const navProfile = safeQuery('.nav a[href^="/u/"]');
      if (navProfile) {
        const match = navProfile.href.match(/\/u\/([^/]+)/);
        if (match) return match[1];
      }

      return null;
    }

    async extractSubmission() {
      try {
        const path = window.location.pathname;

        // Extract submission ID from URL: /s/{id}
        const submissionMatch = path.match(/\/s\/([a-z0-9]+)\/?$/i);
        if (!submissionMatch) {
          log('No submission ID in URL');
          return null;
        }

        const submissionId = submissionMatch[1];
        log('Extracting submission:', submissionId);

        // Wait for page content to load
        await waitForElement('.submission, .card, article', 5000).catch(() => {
          logWarn('Submission container not found');
        });

        // Give extra time for content rendering
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
        // Extract problem info
        // ============================================================

        const problemLink = safeQuery('a[href*="/p/"]');
        if (problemLink) {
          problemUrl = problemLink.href;
          problemName = extractText(problemLink);
          const match = problemUrl.match(/\/p\/([^/?]+)/);
          if (match) {
            problemId = match[1];
          }
        }

        // ============================================================
        // Extract verdict from status badges
        // ============================================================

        const verdictSelectors = [
          '.badge',
          '.verdict',
          '.status',
          '.submission-verdict',
          '[class*="verdict"]',
          '.result',
          '.label',
        ];

        for (const selector of verdictSelectors) {
          const elements = safeQueryAll(selector);
          for (const el of elements) {
            const text = extractText(el);
            if (text) {
              const lowerText = text.toLowerCase();
              if (
                lowerText.includes('accepted') ||
                lowerText.includes('wrong') ||
                lowerText.includes('time limit') ||
                lowerText.includes('memory limit') ||
                lowerText.includes('runtime') ||
                lowerText.includes('compilation')
              ) {
                verdict = text;
                break;
              }
            }
          }
          if (verdict !== 'UNKNOWN') break;
        }

        // ============================================================
        // Extract metadata from detail rows/table
        // ============================================================

        // Look for dl/dt/dd pattern
        const dtElements = safeQueryAll('dt');
        for (const dt of dtElements) {
          const label = extractText(dt).toLowerCase();
          const dd = dt.nextElementSibling;
          if (!dd || dd.tagName !== 'DD') continue;

          const value = extractText(dd);

          if (label.includes('language') || label.includes('ভাষা')) {
            language = value;
          }

          if (label.includes('time') || label.includes('সময়')) {
            const match = value.match(/(\d+)\s*ms/i);
            if (match) executionTime = parseInt(match[1], 10);
          }

          if (label.includes('memory') || label.includes('মেমোরি')) {
            const match = value.match(/(\d+)\s*KB/i);
            if (match) memoryUsed = parseInt(match[1], 10);
          }
        }

        // Fallback: look for patterns in page text
        if (!executionTime) {
          const pageText = document.body.textContent;
          const timeMatch = pageText.match(/(\d+)\s*ms/i);
          if (timeMatch) executionTime = parseInt(timeMatch[1], 10);
        }

        if (!memoryUsed) {
          const pageText = document.body.textContent;
          const memMatch = pageText.match(/(\d+)\s*KB/i);
          if (memMatch) memoryUsed = parseInt(memMatch[1], 10);
        }

        // ============================================================
        // Extract submission time
        // ============================================================

        const timeElements = safeQueryAll('time, [datetime], .timestamp');
        for (const el of timeElements) {
          const datetime = el.getAttribute('datetime') || extractText(el);
          if (datetime) {
            try {
              const parsed = new Date(datetime);
              if (!isNaN(parsed.getTime())) {
                submittedAt = parsed.toISOString();
                break;
              }
            } catch (e) {}
          }
        }

        // ============================================================
        // Extract source code
        // ============================================================

        await this.revealSourceCodeIfNeeded();

        sourceCode = this.extractBestSourceCode();
        if (sourceCode) {
          log('Found source code candidate', {
            length: sourceCode.length,
          });
        }

        // ============================================================
        // Build submission object
        // ============================================================

        const submission = {
          platform: this.platform,
          handle: await this.getUserHandle(),
          problemId: problemId || `toph_${submissionId}`,
          problemName: problemName || problemId || '',
          problemUrl: problemUrl || '',
          contestId: '',
          submissionId: submissionId,
          submissionUrl: window.location.href,
          verdict: normalizeVerdict(verdict),
          language: language || '',
          executionTime: executionTime,
          memoryUsed: memoryUsed,
          submittedAt: submittedAt || null,
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

    looksLikeCode(text) {
      const indicators = [
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
        'if ',
        'cout',
        'cin',
        'printf',
        'scanf',
        'System.',
        'print(',
        'main',
        'using namespace',
      ];
      return indicators.some((ind) => text.includes(ind));
    }

    normalizeCodeCandidate(text) {
      if (typeof text !== 'string') return '';

      return text
        .replace(/\r\n?/g, '\n')
        .replace(/^\uFEFF/, '')
        .replace(/[\u0000\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        .trim();
    }

    isPlausibleCode(text) {
      const normalized = this.normalizeCodeCandidate(text);
      if (!normalized || normalized.length < 10) return false;

      if (this.looksLikeCode(normalized)) return true;
      if (/^\s*#!/m.test(normalized)) return true;
      if (
        /\b(echo|read|printf|then|fi|elif|done|function)\b/i.test(normalized)
      ) {
        return true;
      }
      if (normalized.length >= 120) return true;
      if (normalized.includes('\n') && /[{}();=#<>\[\]]/.test(normalized)) {
        return true;
      }

      return false;
    }

    async revealSourceCodeIfNeeded() {
      const triggers = safeQueryAll('a, button, [role="button"]').filter(
        (el) => {
          const label = extractText(el).toLowerCase();
          const href = String(el.getAttribute('href') || '').toLowerCase();
          const id = String(el.id || '').toLowerCase();
          const className = String(el.className || '').toLowerCase();
          const tagName = String(el.tagName || '').toLowerCase();

          const mentionsSourceOrCode =
            /source|code/.test(label) ||
            /source|code/.test(href) ||
            /source|code/.test(id) ||
            /source|code/.test(className);

          if (!mentionsSourceOrCode) {
            return false;
          }

          // Never click controls that look like file/download actions.
          if (
            /download|attachment|export|raw/.test(
              `${label} ${href} ${id} ${className}`
            )
          ) {
            return false;
          }

          if (tagName === 'a') {
            // Avoid navigation/download links. Only allow in-page tab anchors.
            const hasDownloadAttr = el.hasAttribute('download');
            if (hasDownloadAttr) {
              return false;
            }

            if (href.length === 0) {
              return true;
            }

            if (href.startsWith('#') || href.startsWith('javascript:')) {
              return true;
            }

            return false;
          }

          return true;
        }
      );

      for (const trigger of triggers.slice(0, 3)) {
        try {
          trigger.click();
          await sleep(250);
        } catch {
          // Ignore click failures and continue with extraction.
        }
      }
    }

    extractBestSourceCode() {
      const candidates = [];

      const pushCandidate = (text, selector, bonus = 0) => {
        const normalized = this.normalizeCodeCandidate(text);
        if (!normalized) return;

        const score =
          normalized.length +
          (normalized.includes('\n') ? 40 : 0) +
          (this.looksLikeCode(normalized) ? 180 : 0) +
          bonus;

        candidates.push({ text: normalized, selector, score });
      };

      const lineSelectors = [
        '.CodeMirror-code pre',
        '.CodeMirror-line',
        '.ace_line',
        '.ace_text-layer .ace_line',
      ];

      for (const selector of lineSelectors) {
        const lines = safeQueryAll(selector)
          .map((el) => (el.textContent || '').replace(/\u00A0/g, ' '))
          .filter((line) => line.trim().length > 0);
        if (lines.length > 0) {
          pushCandidate(lines.join('\n'), selector, 260);
        }
      }

      const blockSelectors = [
        'pre#program-source-text',
        '#program-source-text',
        '.source-code pre',
        '.source-code code',
        'pre[class*="source"]',
        '.submission-code pre',
        '.submission-code code',
        'pre.prettyprint',
        '.code-area pre',
        '.codehilite pre',
        'textarea#sourceCodeTextarea',
        'textarea[name*="source"]',
        'textarea',
        '.ace_content',
        '.CodeMirror-code',
        'pre code',
        'pre',
      ];

      for (const selector of blockSelectors) {
        const elements = safeQueryAll(selector);
        for (const el of elements) {
          const text = el?.textContent || el?.value || '';
          if (text && text.trim().length >= 8) {
            const selectorBonus = selector === 'pre code' ? 120 : 0;
            pushCandidate(text, selector, selectorBonus);
          }
        }
      }

      const plausible = candidates.filter((candidate) =>
        this.isPlausibleCode(candidate.text)
      );
      const pool = plausible.length > 0 ? plausible : candidates;
      if (pool.length === 0) {
        return null;
      }

      pool.sort((a, b) => b.score - a.score);
      return pool[0].text;
    }

    extractLabeledSectionFromText(text, labels, allSectionLabels) {
      if (typeof text !== 'string' || !text.trim()) return null;
      if (!Array.isArray(labels) || labels.length === 0) return null;

      const labelPattern = labels.map((label) => escapeRegex(label)).join('|');
      const boundaryPattern = allSectionLabels
        .map((label) => escapeRegex(label))
        .join('|');

      const regex = new RegExp(
        `(?:^|\\n)\\s*(?:${labelPattern})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${boundaryPattern})\\s*:?|$)`,
        'i'
      );

      const match = text.match(regex);
      if (!match?.[1]) return null;

      const section = match[1].trim();
      return section.length > 0 ? section : null;
    }

    extractProblemDetails() {
      const path = window.location.pathname;
      const problemMatch = path.match(/\/p\/([^/?#]+)\/?$/i);
      const problemId = problemMatch?.[1] || null;

      const headingEl =
        safeQuery('h1') ||
        safeQuery('.problem-title') ||
        safeQuery('.panel__title h3') ||
        safeQuery('main h2');

      const titleFromHeading = extractText(headingEl);
      const titleFromDocument =
        document?.title
          ?.replace(/\s*\|\s*Toph.*$/i, '')
          .replace(/\s*-\s*Toph.*$/i, '')
          .trim() || '';
      const problemName =
        titleFromHeading || titleFromDocument || problemId || '';

      const rootSelectors = [
        '.problem-statement',
        '.statement',
        '.problem-body',
        '.problem',
        'article',
        '.panel__body',
        'main',
      ];

      let bestRoot = null;
      let bestLength = 0;
      for (const selector of rootSelectors) {
        const elements = safeQueryAll(selector);
        for (const el of elements) {
          const length = (el?.textContent || '').trim().length;
          if (length > bestLength) {
            bestLength = length;
            bestRoot = el;
          }
        }
      }

      const root = bestRoot || document.body;
      const rootText = this.normalizeCodeCandidate(root?.textContent || '');

      const sectionLabels = [
        'Input Format',
        'Input',
        'Output Format',
        'Output',
        'Constraints',
        'Sample Input',
        'Sample Output',
        'Example',
        'Examples',
        'Explanation',
        'Note',
        'Notes',
      ];

      const firstSectionRegex = new RegExp(
        `\\n\\s*(?:${sectionLabels.map((label) => escapeRegex(label)).join('|')})\\s*:`,
        'i'
      );
      const firstSectionIndex = rootText.search(firstSectionRegex);
      const description =
        firstSectionIndex > 0
          ? rootText.slice(0, firstSectionIndex).trim()
          : rootText.trim();

      const inputFormat = this.extractLabeledSectionFromText(
        rootText,
        ['Input Format', 'Input'],
        sectionLabels
      );
      const outputFormat = this.extractLabeledSectionFromText(
        rootText,
        ['Output Format', 'Output'],
        sectionLabels
      );
      const constraints = this.extractLabeledSectionFromText(
        rootText,
        ['Constraints'],
        sectionLabels
      );

      const examples = [];
      const sampleRegex =
        /Sample\s*Input\s*:?\s*([\s\S]*?)\n\s*Sample\s*Output\s*:?\s*([\s\S]*?)(?=\n\s*(?:Sample\s*Input|Explanation|Notes?|Constraints?|$))/gi;
      let sampleMatch;
      while ((sampleMatch = sampleRegex.exec(rootText)) !== null) {
        const input = (sampleMatch[1] || '').trim();
        const output = (sampleMatch[2] || '').trim();
        if (input || output) {
          examples.push({ input, output, explanation: '' });
        }
      }

      const tutorialLink = safeQueryAll('a[href]').find((link) => {
        const href = String(link?.href || '').toLowerCase();
        const text = extractText(link).toLowerCase();
        return (
          href.includes('tutorial') ||
          href.includes('editorial') ||
          href.includes('solution') ||
          text.includes('tutorial') ||
          text.includes('editorial') ||
          text.includes('solution')
        );
      });

      return {
        platform: this.platform,
        problemId: problemId || null,
        problemName,
        problemUrl: window.location.href,
        problemDescription: description || null,
        description: description || null,
        inputFormat: inputFormat || null,
        input_format: inputFormat || null,
        outputFormat: outputFormat || null,
        output_format: outputFormat || null,
        constraints: constraints || null,
        examples,
        notes: null,
        tutorialUrl: tutorialLink?.href || null,
        tutorial_url: tutorialLink?.href || null,
        tutorialContent: null,
        tutorial_content: null,
        tutorialSolutions: [],
        tutorial_solutions: [],
        difficultyRating: null,
        difficulty_rating: null,
        tags: [],
      };
    }

    hasMeaningfulProblemDetails(details) {
      if (!details || typeof details !== 'object') {
        return false;
      }

      const description = String(
        details.problemDescription || details.description || ''
      ).trim();
      const inputFormat = String(
        details.inputFormat || details.input_format || ''
      ).trim();
      const outputFormat = String(
        details.outputFormat || details.output_format || ''
      ).trim();
      const constraints = String(details.constraints || '').trim();
      const examples = Array.isArray(details.examples) ? details.examples : [];

      const hasDescription = description.length >= 15;
      const hasInputOutput = inputFormat.length > 0 && outputFormat.length > 0;
      const hasConstraints = constraints.length > 0;
      const hasExamples = examples.length > 0;

      return hasDescription || hasInputOutput || hasConstraints || hasExamples;
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
            this.handleExtractSubmissionMessage(request, sendResponse);
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

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'submission') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on Toph submission page',
          });
          return;
        }

        const requiresSourceCode = request?.requireSourceCode === true;

        let submission = this.extractionResult;
        const hasCachedSource =
          typeof submission?.sourceCode === 'string' &&
          submission.sourceCode.trim().length > 0;

        if (!submission || (requiresSourceCode && !hasCachedSource)) {
          const attempts = requiresSourceCode ? 4 : 1;
          let bestSubmission = submission;

          for (let attempt = 0; attempt < attempts; attempt++) {
            const extracted = await this.extractSubmission();
            if (extracted) {
              const extractedSourceLength =
                typeof extracted.sourceCode === 'string'
                  ? extracted.sourceCode.trim().length
                  : 0;
              const bestSourceLength =
                typeof bestSubmission?.sourceCode === 'string'
                  ? bestSubmission.sourceCode.trim().length
                  : 0;

              if (!bestSubmission || extractedSourceLength > bestSourceLength) {
                bestSubmission = extracted;
              }

              if (!requiresSourceCode || extractedSourceLength > 0) {
                break;
              }
            }

            if (attempt < attempts - 1) {
              await sleep(700 + attempt * 400);
            }
          }

          submission = bestSubmission;
          this.extractionResult = submission;
          this.extractionComplete = true;
        }

        if (
          requiresSourceCode &&
          submission &&
          !(
            typeof submission.sourceCode === 'string' &&
            submission.sourceCode.trim()
          )
        ) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'Toph source code not ready yet',
          });
          return;
        }

        sendResponse({
          success: !!submission,
          data: submission || null,
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
            pending: true,
            error: 'Not on Toph problem page yet',
          });
          return;
        }

        await waitForElement('body', 4000).catch(() => null);
        await sleep(350);

        const details = this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'Toph problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract Toph problem details',
        });
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

        if (result.autoSync && result.extensionToken) {
          if (!submission.sourceCode) {
            logWarn(
              'Auto-sync continuing without source code. Metadata will be synced first.'
            );
          }

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
    const extractor = new TophExtractor();
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
