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

  if (window.__NEUPC_ATCODER_INJECTED__) {
    console.warn('[NEUPC:atcoder] Already injected, skipping');
    return;
  }
  window.__NEUPC_ATCODER_INJECTED__ = true;

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
      this.clickedExpandTargets = new WeakSet();
      this.clickedSourceTabTargets = new WeakSet();
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
        if (this.isLikelyTruncatedSource(sourceCode)) {
          logWarn('Extracted source still looks truncated, requesting retry');
          sourceCode = null;
        }

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

    isElementVisible(element) {
      if (!element) return false;

      const style = window.getComputedStyle(element);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return false;
      }

      if (
        element.hasAttribute('hidden') ||
        element.getAttribute('aria-hidden') === 'true'
      ) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    getCurrentSourceLengthEstimate() {
      const selectors = [
        '#submission-code',
        'pre.prettyprint',
        'pre.linenums',
        '.submission-code pre',
        '.ace_text-layer',
        '.ace_content',
        '.ace_editor',
        'pre[id*="source"]',
      ];

      let bestLength = 0;

      for (const selector of selectors) {
        const el = safeQuery(selector);
        if (!el) continue;

        const textContentLength = String(el.textContent || '').length;
        const innerTextLength = String(el.innerText || '').length;
        bestLength = Math.max(bestLength, textContentLength, innerTextLength);
      }

      const lineItems = safeQueryAll(
        '#submission-code li, ol.linenums li, .prettyprint li, #submission-code .ace_line, .ace_text-layer .ace_line, .ace_content .ace_line'
      );
      if (lineItems.length > 0) {
        const joinedLength = lineItems
          .map((line) => String(line.textContent || ''))
          .join('\n').length;
        bestLength = Math.max(bestLength, joinedLength);
      }

      return bestLength;
    }

    getSourceRootElement(root = document) {
      return (
        safeQuery('#submission-code', root) ||
        safeQuery('pre.prettyprint', root) ||
        safeQuery('pre.linenums', root) ||
        safeQuery('.submission-code pre', root) ||
        safeQuery('.ace_text-layer', root) ||
        safeQuery('.ace_content', root) ||
        safeQuery('.ace_editor', root)
      );
    }

    isSourceTabTrigger(element) {
      if (!element || !this.isElementVisible(element)) {
        return false;
      }

      const tagName = String(element.tagName || '').toLowerCase();
      const href = String(element.getAttribute('href') || '');
      const dataTarget = String(element.getAttribute('data-target') || '');
      const ariaControls = String(element.getAttribute('aria-controls') || '');
      const text = String(
        element.innerText || element.textContent || ''
      ).trim();
      const className = String(element.className || '');
      const id = String(element.id || '');

      const sourcePattern =
        /(source\s*code|source|submission\s*code|code|ソース|コード)/i;
      const structuralPattern =
        /submission-code|source|tab|nav|toggle|prettyprint|linenums/i;

      const sourceSignal =
        sourcePattern.test(text) ||
        sourcePattern.test(href) ||
        sourcePattern.test(dataTarget) ||
        sourcePattern.test(ariaControls);

      if (!sourceSignal) {
        return false;
      }

      if (tagName === 'a' && href && !href.startsWith('#')) {
        // Avoid navigating away from the current page.
        return false;
      }

      return (
        sourceSignal &&
        (structuralPattern.test(
          `${href} ${dataTarget} ${ariaControls} ${className} ${id}`
        ) ||
          element.getAttribute('role') === 'tab' ||
          href.startsWith('#'))
      );
    }

    async ensureSourceTabActivated() {
      const existingRoot = this.getSourceRootElement();
      if (existingRoot && this.getCurrentSourceLengthEstimate() > 20) {
        const existingText =
          String(existingRoot.innerText || '') ||
          String(existingRoot.textContent || '');
        const existingCode = this.cleanSourceCode(existingText);
        if (
          existingCode &&
          existingCode.length > 20 &&
          !this.isLikelyTruncatedSource(existingCode)
        ) {
          return false;
        }
      }

      const tabCandidates = safeQueryAll(
        'a, button, [role="tab"], [data-toggle="tab"], [aria-controls]'
      ).filter((el) => this.isSourceTabTrigger(el));

      if (tabCandidates.length === 0) {
        return false;
      }

      let clicks = 0;
      for (const candidate of tabCandidates) {
        if (this.clickedSourceTabTargets.has(candidate)) {
          continue;
        }

        this.clickedSourceTabTargets.add(candidate);
        candidate.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        clicks++;
        await sleep(180);
      }

      if (clicks === 0) {
        return false;
      }

      await sleep(420);
      log('Source tab activation attempt:', {
        clicks,
        sourceLength: this.getCurrentSourceLengthEstimate(),
      });

      return true;
    }

    isExpandTrigger(element) {
      if (!element || !this.isElementVisible(element)) return false;

      const text = String(
        element.innerText || element.textContent || ''
      ).trim();
      const id = String(element.id || '');
      const className = String(element.className || '');
      const ariaLabel = String(element.getAttribute('aria-label') || '');
      const title = String(element.getAttribute('title') || '');
      const dataAction = String(element.getAttribute('data-action') || '');

      const haystack = `${text} ${id} ${className} ${ariaLabel} ${title} ${dataAction}`;

      const expandPattern =
        /(expand|show\s*all|view\s*all|open|more|full\s*screen|fullscreen|全文|全体|展開|もっと|表示)/i;
      const collapsePattern = /(collapse|hide|less|閉じる|折りたた)/i;

      if (!expandPattern.test(haystack)) {
        return false;
      }

      if (collapsePattern.test(text) && !/expand|open|show/i.test(text)) {
        return false;
      }

      return true;
    }

    async ensureSourceExpanded() {
      const sourceRoot =
        safeQuery('#submission-code') ||
        safeQuery('pre.prettyprint') ||
        safeQuery('pre.linenums') ||
        safeQuery('.submission-code pre') ||
        safeQuery('.ace_text-layer') ||
        safeQuery('.ace_content') ||
        safeQuery('.ace_editor');

      if (!sourceRoot) {
        return false;
      }

      const searchRoot =
        sourceRoot.closest('.panel, .part, .container, .col-sm-12') ||
        sourceRoot.parentElement ||
        document;

      const explicitTargets = safeQueryAll(
        '#expand-source, #source-expand, #toggle-source, #toggle-expand, [data-action*="expand"], [aria-label*="expand" i], [title*="expand" i]',
        searchRoot
      );
      const nearbyTargets = safeQueryAll(
        'button, a, [role="button"]',
        searchRoot
      );

      const targets = [
        ...new Set([...explicitTargets, ...nearbyTargets]),
      ].filter((target) => this.isExpandTrigger(target));

      if (targets.length === 0) {
        return false;
      }

      const beforeLength = this.getCurrentSourceLengthEstimate();
      let clicks = 0;

      for (const target of targets) {
        if (this.clickedExpandTargets.has(target)) {
          continue;
        }

        this.clickedExpandTargets.add(target);
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        clicks++;
        await sleep(140);
      }

      if (clicks === 0) {
        return false;
      }

      await sleep(320);
      const afterLength = this.getCurrentSourceLengthEstimate();

      log('Expand attempt on source block:', {
        clicks,
        beforeLength,
        afterLength,
      });

      return true;
    }

    isLikelyTruncatedSource(code) {
      if (typeof code !== 'string' || !code.trim()) {
        return true;
      }

      const normalized = code.trim();
      const newlineCount = (normalized.match(/\n/g) || []).length;

      if (/\.{3}\s*$|…\s*$/.test(normalized)) {
        return true;
      }

      if (/^\s*(?:\d{1,3}){8,}(?=\s*(?:#|[A-Za-z_]))/.test(normalized)) {
        return true;
      }

      if (/[^\x00-\x7F]{80,}/.test(normalized)) {
        return true;
      }

      if (normalized.length > 500 && newlineCount <= 1) {
        return true;
      }

      const lineCount = newlineCount + 1;
      const avgLineLength = normalized.length / Math.max(1, lineCount);
      if (normalized.length > 1200 && avgLineLength > 220) {
        return true;
      }

      return false;
    }

    isLikelyMidSliceAceLines(lines = []) {
      if (!Array.isArray(lines) || lines.length === 0) {
        return true;
      }

      const normalizedLines = lines.map((line) =>
        String(line || '').replace(/\u00A0/g, ' ')
      );
      const nonEmptyLines = normalizedLines.filter(
        (line) => line.trim().length > 0
      );

      if (nonEmptyLines.length === 0) {
        return true;
      }

      const firstRaw = nonEmptyLines[0];
      const first = firstRaw.trim();

      // For ACE virtualized views, a snippet from the middle often starts
      // indented or with a closing token. Prefer full-file starts.
      const looksLikeFileStart =
        /^(#include|#define|#pragma|import\b|from\b|package\b|using\b|class\b|struct\b|def\b|fn\b|namespace\b|template\b|\/\/|\/\*|int\s+main\b|signed\s+main\b)/.test(
          first
        );

      if (looksLikeFileStart) {
        return false;
      }

      if (/^[ \t]/.test(firstRaw) && nonEmptyLines.length < 25) {
        return true;
      }

      if (/^[)\]}]/.test(first) && nonEmptyLines.length < 40) {
        return true;
      }

      return false;
    }

    buildSourceCandidatesFromRoot(root, sourceContext = 'live-dom') {
      const codeSelectors = [
        '#submission-code',
        'pre.prettyprint',
        'pre.linenums',
        '.submission-code pre',
        'pre[id*="source"]',
      ];

      const lineSelectors = [
        '#submission-code li',
        'ol.linenums li',
        '.prettyprint li',
        '#submission-code .ace_line',
        '.ace_text-layer .ace_line',
        '.ace_content .ace_line',
      ];

      const textareaSelectors = [
        'textarea#submission-code',
        'textarea[name="sourceCode"]',
        'textarea[name="submission_code"]',
      ];

      const query = (selector, context = root) => {
        try {
          return context.querySelector(selector);
        } catch {
          return null;
        }
      };

      const queryAll = (selector, context = root) => {
        try {
          return Array.from(context.querySelectorAll(selector));
        } catch {
          return [];
        }
      };

      const candidates = [];
      const seen = new Set();

      const addCandidate = (rawCode, selector, strategy) => {
        if (typeof rawCode !== 'string') return;

        const normalized = this.cleanSourceCode(rawCode);
        if (!normalized) return;

        const fingerprint = `${sourceContext}|${selector}|${strategy}|${normalized.length}|${normalized.slice(0, 140)}`;
        if (seen.has(fingerprint)) {
          return;
        }
        seen.add(fingerprint);

        const contaminationPenalty =
          this.calculateSourceContaminationPenalty(normalized);
        if (contaminationPenalty >= 560) {
          return;
        }

        // Prefer canonical source node, but let clearly longer candidates win.
        const selectorBonus = selector === '#submission-code' ? 220 : 0;
        const strategyBonus =
          strategy === 'globalLineItems'
            ? 165
            : strategy === 'listItems'
              ? 145
              : strategy === 'aceLineItems'
                ? 180
                : strategy === 'textareaValue'
                  ? 130
                  : strategy === 'innerText' || strategy === 'codeInnerText'
                    ? 95
                    : strategy === 'codeElement'
                      ? 80
                      : 0;

        candidates.push({
          code: normalized,
          selector,
          strategy,
          length: normalized.length,
          score:
            normalized.length +
            selectorBonus +
            strategyBonus -
            contaminationPenalty,
        });
      };

      for (const selector of codeSelectors) {
        const codeEl = query(selector);
        if (!codeEl) continue;

        // Collect both DOM text channels because one can include hidden/merged junk.
        addCandidate(codeEl.textContent, selector, 'textContent');
        addCandidate(codeEl.innerText, selector, 'innerText');

        const codeInner = query('code', codeEl);
        if (codeInner && codeInner !== codeEl) {
          addCandidate(codeInner.textContent, selector, 'codeElement');
          addCandidate(codeInner.innerText, selector, 'codeInnerText');
        }

        // Fallback for line-number based renderers.
        const listItems = queryAll('li', codeEl);
        if (listItems.length > 0) {
          addCandidate(
            listItems.map((li) => li.textContent).join('\n'),
            selector,
            'listItems'
          );
        }
      }

      for (const selector of lineSelectors) {
        const lineItems = queryAll(selector);
        if (lineItems.length === 0) continue;

        const lineTexts = lineItems.map((line) =>
          String(line.textContent || '').replace(/\u00A0/g, ' ')
        );

        if (selector.includes('ace_line')) {
          if (this.isLikelyMidSliceAceLines(lineTexts)) {
            continue;
          }

          addCandidate(lineTexts.join('\n'), selector, 'aceLineItems');
          continue;
        }

        addCandidate(lineTexts.join('\n'), selector, 'globalLineItems');
      }

      for (const selector of textareaSelectors) {
        const textarea = query(selector);
        if (!textarea) continue;

        addCandidate(textarea.value, selector, 'textareaValue');
        addCandidate(textarea.textContent, selector, 'textareaTextContent');
      }

      candidates.sort((a, b) => b.score - a.score);
      return candidates;
    }

    async extractSourceCodeFromFetchedHtml() {
      try {
        const response = await fetch(window.location.href, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          logWarn('Fetched HTML fallback failed with status:', response.status);
          return null;
        }

        const html = await response.text();
        if (!html || html.length < 1000) {
          return null;
        }

        const parsed = new DOMParser().parseFromString(html, 'text/html');

        const title = String(parsed.title || '')
          .trim()
          .toLowerCase();
        if (title.includes('sign in')) {
          return null;
        }

        const candidates = this.buildSourceCandidatesFromRoot(
          parsed,
          'fetched-html'
        );
        if (candidates.length === 0) {
          return null;
        }

        const best = candidates[0];
        if (this.isLikelyTruncatedSource(best.code)) {
          return null;
        }

        log('Selected source code from fetched HTML:', {
          selector: best.selector,
          strategy: best.strategy,
          length: best.length,
        });

        return best.code;
      } catch (error) {
        logWarn(
          'Fetched HTML fallback error:',
          error?.message || String(error)
        );
        return null;
      }
    }

    getSourceDownloadUrl() {
      const downloadLink = safeQuery(
        'a[href$="/download"], a[href*="/submissions/"][href*="/download"]'
      );
      if (downloadLink) {
        try {
          const href = downloadLink.getAttribute('href') || downloadLink.href;
          if (href) {
            return new URL(href, window.location.href).href;
          }
        } catch {
          // Ignore URL parsing errors and continue with inferred path.
        }
      }

      const match = window.location.pathname.match(
        /^(\/contests\/[^/]+\/submissions\/\d+)$/
      );
      if (!match) {
        return null;
      }

      return `${window.location.origin}${match[1]}/download`;
    }

    async extractSourceCodeFromDownloadEndpoint() {
      const downloadUrl = this.getSourceDownloadUrl();
      if (!downloadUrl) {
        return null;
      }

      try {
        const response = await fetch(downloadUrl, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          return null;
        }

        const raw = await response.text();
        if (!raw || raw.length < 5) {
          return null;
        }

        // A sign-in or error page means download endpoint is not usable.
        if (/^\s*<!doctype html|^\s*<html/i.test(raw)) {
          return null;
        }

        const cleaned = this.cleanSourceCode(raw);
        if (!cleaned || cleaned.length < 5) {
          return null;
        }

        log('Selected source code from download endpoint:', {
          length: cleaned.length,
          downloadUrl,
        });

        return cleaned;
      } catch (error) {
        logWarn(
          'Download endpoint fallback error:',
          error?.message || String(error)
        );
        return null;
      }
    }

    async extractSourceCode() {
      const downloadFallback =
        await this.extractSourceCodeFromDownloadEndpoint();
      if (downloadFallback) {
        return downloadFallback;
      }

      let bestOverall = null;
      let lastBestLength = 0;
      let stableAttempts = 0;
      const maxAttempts = 16;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt === 0 || attempt === 1 || attempt === 3 || attempt === 5) {
          await this.ensureSourceTabActivated();
        }

        if (attempt === 0 || attempt === 2 || attempt === 4 || attempt === 6) {
          await this.ensureSourceExpanded();
        }

        const candidates = this.buildSourceCandidatesFromRoot(
          document,
          'live-dom'
        );
        if (candidates.length > 0) {
          const best = candidates[0];

          if (!bestOverall || best.score > bestOverall.score) {
            bestOverall = best;
          }

          if (best.length > lastBestLength) {
            lastBestLength = best.length;
            stableAttempts = 0;
          } else {
            stableAttempts++;
          }

          if (best.length > 20 && stableAttempts >= 2) {
            if (this.isLikelyTruncatedSource(best.code)) {
              logWarn('Best source candidate still looks truncated, retrying', {
                selector: best.selector,
                strategy: best.strategy,
                length: best.length,
                attempts: attempt + 1,
              });
              await sleep(300);
              continue;
            }

            log('Selected source code candidate:', {
              selector: best.selector,
              strategy: best.strategy,
              length: best.length,
              attempts: attempt + 1,
            });
            return best.code;
          }
        }

        await sleep(250);
      }

      if (bestOverall?.code) {
        if (this.isLikelyTruncatedSource(bestOverall.code)) {
          logWarn(
            'Fallback source candidate appears truncated; forcing retry',
            {
              selector: bestOverall.selector,
              strategy: bestOverall.strategy,
              length: bestOverall.length,
            }
          );
        } else {
          log('Selected source code fallback candidate:', {
            selector: bestOverall.selector,
            strategy: bestOverall.strategy,
            length: bestOverall.length,
            attempts: maxAttempts,
          });
          return bestOverall.code;
        }
      }

      const fetchedFallback = await this.extractSourceCodeFromFetchedHtml();
      if (fetchedFallback) {
        return fetchedFallback;
      }

      logWarn('No source code found');
      return null;
    }

    cleanSourceCode(code) {
      if (!code) return '';

      let normalized = String(code);

      normalized = normalized.replace(/\r\n?/g, '\n');
      normalized = normalized.replace(/^\uFEFF/, '');
      normalized = normalized.replace(/\u0000/g, '');
      normalized = normalized.replace(
        /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g,
        ''
      );
      normalized = normalized.replace(/\u00A0/g, ' ');
      normalized = this.stripLeadingMergedLineNumbers(normalized);
      normalized = this.stripSuspiciousNoise(normalized);
      normalized = this.repairCollapsedPreprocessorLines(normalized);
      normalized = normalized.replace(/\n{5,}/g, '\n\n\n');

      // Preserve leading indentation to avoid mutating source semantics.
      return normalized.trimEnd();
    }

    stripLeadingMergedLineNumbers(code) {
      let normalized = String(code || '');
      const leadingDigitsMatch = normalized.match(
        /^\s*(?:\d{1,3}){8,}(?=\s*(?:#|[A-Za-z_]))/
      );

      if (leadingDigitsMatch) {
        normalized = normalized.slice(leadingDigitsMatch[0].length).trimStart();
      }

      const lines = normalized.split('\n');
      if (lines.length >= 3) {
        const numberedLines = lines.filter((line) =>
          /^\s*\d+\s*(?:#|[A-Za-z_])/.test(line)
        ).length;

        if (numberedLines >= Math.max(3, Math.floor(lines.length * 0.35))) {
          normalized = lines
            .map((line) => line.replace(/^\s*\d+\s*(?=\S)/, ''))
            .join('\n');
        }
      }

      return normalized;
    }

    stripSuspiciousNoise(code) {
      let normalized = String(code || '');

      // Remove corruption chunks but keep trailing code after the chunk.
      normalized = normalized.replace(/[^\x00-\x7F]{120,}/g, '\n');
      normalized = normalized.replace(/([^\nA-Za-z0-9])\1{80,}/g, '\n');
      normalized = normalized.replace(/([A-Za-z])\1{200,}/g, '\n');
      normalized = normalized.replace(/\n{4,}/g, '\n\n\n');

      return normalized;
    }

    repairCollapsedPreprocessorLines(code) {
      let normalized = String(code || '');
      const directiveCount = (
        normalized.match(
          /#(?:include|define|if|ifdef|ifndef|pragma|endif|elif|else)\b/g
        ) || []
      ).length;
      const newlineCount = (normalized.match(/\n/g) || []).length;

      if (directiveCount < 2 || newlineCount > 3) {
        return normalized;
      }

      normalized = normalized.replace(
        /([^\n])(?=#(?:include|define|if|ifdef|ifndef|pragma|endif|elif|else)\b)/g,
        '$1\n'
      );

      normalized = normalized.replace(/>(?=\s*using\s+namespace\b)/g, '>\n');
      normalized = normalized.replace(
        /;(?=\s*(?:#|using\s+namespace\b|int\s+main\b|signed\s+main\b|void\s+[A-Za-z_][A-Za-z0-9_]*\s*\())/g,
        ';\n'
      );

      return normalized;
    }

    calculateSourceContaminationPenalty(code) {
      const normalized = String(code || '');
      if (!normalized) {
        return 1000;
      }

      let penalty = 0;

      if (/^\s*(?:\d{1,3}){8,}(?=\s*(?:#|[A-Za-z_]))/.test(normalized)) {
        penalty += 240;
      }

      const unicodeChars = normalized.match(/[^\x00-\x7F]/g) || [];
      const unicodeRatio = unicodeChars.length / Math.max(1, normalized.length);
      if (unicodeChars.length > 80 && unicodeRatio > 0.08) {
        penalty += 260;
      }

      if (/[^\x00-\x7F]{120,}/.test(normalized)) {
        penalty += 320;
      }

      if (/([^\nA-Za-z0-9])\1{80,}/.test(normalized)) {
        penalty += 220;
      }

      if (/([A-Za-z])\1{200,}/.test(normalized)) {
        penalty += 220;
      }

      const newlineCount = (normalized.match(/\n/g) || []).length;
      if (normalized.length > 400 && newlineCount <= 1) {
        penalty += 220;
      }

      const directiveCount = (
        normalized.match(
          /#(?:include|define|if|ifdef|ifndef|pragma|endif|elif|else)\b/g
        ) || []
      ).length;
      if (directiveCount >= 3 && newlineCount <= 2) {
        penalty += 130;
      }

      return penalty;
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
        // Return cached result only when source looks complete.
        if (
          this.extractionComplete &&
          this.extractionResult?.sourceCode &&
          !this.isLikelyTruncatedSource(this.extractionResult.sourceCode)
        ) {
          sendResponse({ success: true, data: this.extractionResult });
          return;
        }

        // Extract submission
        const submission = await this.extractSubmission();
        this.extractionResult = submission;
        const hasCompleteSource =
          !!submission?.sourceCode &&
          !this.isLikelyTruncatedSource(submission.sourceCode);
        this.extractionComplete = hasCompleteSource;

        if (!submission) {
          sendResponse({
            success: false,
            error: 'No submission found',
          });
          return;
        }

        if (!hasCompleteSource) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'Source code not fully expanded yet',
          });
          return;
        }

        sendResponse({
          success: true,
          data: submission,
          error: null,
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
        this.extractionComplete =
          !!submission?.sourceCode &&
          !this.isLikelyTruncatedSource(submission.sourceCode);

        if (submission && this.extractionComplete) {
          log('Successfully extracted submission');
          this.cacheSubmission(submission);
          await this.autoSyncIfEnabled(submission);
        } else if (submission) {
          logWarn(
            'Submission extracted but source is incomplete; waiting for retry'
          );
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
