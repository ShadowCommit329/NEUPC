/**
 * NEUPC SPOJ Extractor (Standalone)
 * Self-contained script without ES module imports for browser compatibility.
 * Extracts submissions from SPOJ status pages.
 */

(function () {
  'use strict';

  if (window.__NEUPC_SPOJ_INJECTED__) {
    console.warn('[NEUPC:spoj] Already injected, skipping');
    return;
  }
  window.__NEUPC_SPOJ_INJECTED__ = true;

  const PLATFORM = 'spoj';
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

    return el
      ? String(el.innerText || el.textContent || '')
          .replace(/\u00A0/g, ' ')
          .trim()
      : '';
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const found = safeQuery(selector);
      if (found) {
        resolve(found);
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

  function normalizeHandle(value) {
    if (value === null || value === undefined) return null;
    const handle = String(value).trim();
    return handle ? handle : null;
  }

  function normalizeVerdict(verdict) {
    const raw = String(verdict || '').trim();
    if (!raw) return 'UNKNOWN';

    const upper = raw.toUpperCase();

    // Action labels from status pages are not verdicts.
    if (
      upper.includes('EDIT SOURCE CODE') ||
      upper.includes('VIEW DETAILS') ||
      upper === 'DETAILS' ||
      upper === 'SOURCE CODE'
    ) {
      return 'UNKNOWN';
    }

    if (upper.includes('ACCEPTED') || upper === 'AC' || upper === 'OK') {
      return 'AC';
    }
    if (upper.includes('WRONG ANSWER') || upper === 'WA') {
      return 'WA';
    }
    if (upper.includes('TIME LIMIT') || upper === 'TLE') {
      return 'TLE';
    }
    if (upper.includes('MEMORY LIMIT') || upper === 'MLE') {
      return 'MLE';
    }
    if (
      upper.includes('RUNTIME ERROR') ||
      upper === 'RE' ||
      upper === 'RTE' ||
      upper.includes('SIGSEGV') ||
      upper.includes('SIGFPE')
    ) {
      return 'RE';
    }
    if (
      upper.includes('COMPILATION ERROR') ||
      upper.includes('COMPILE ERROR') ||
      upper === 'CE'
    ) {
      return 'CE';
    }
    if (upper.includes('PRESENTATION ERROR') || upper === 'PE') {
      return 'PE';
    }
    if (upper.includes('PARTIAL') || upper === 'PC') {
      return 'PC';
    }
    if (
      upper.includes('PENDING') ||
      upper.includes('QUEUE') ||
      upper.includes('RUNNING') ||
      upper.includes('JUDGING')
    ) {
      return 'PENDING';
    }

    return upper;
  }

  function parseDurationToMs(value) {
    const text = String(value || '').trim();
    if (!text) return null;

    const match = text.match(
      /([0-9]*\.?[0-9]+)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?)/i
    );

    if (match) {
      const amount = Number.parseFloat(match[1]);
      if (!Number.isFinite(amount)) return null;

      const unit = String(match[2]).toLowerCase();
      if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
        return Math.round(amount);
      }
      return Math.round(amount * 1000);
    }

    const plain = Number.parseFloat(text.replace(/[^0-9.]+/g, ''));
    if (!Number.isFinite(plain)) return null;

    // SPOJ runtime is commonly shown in seconds when no unit is present.
    if (plain <= 20) {
      return Math.round(plain * 1000);
    }

    return Math.round(plain);
  }

  function parseMemoryToKb(value) {
    const text = String(value || '').trim();
    if (!text) return null;

    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|mb|gb|b)/i);
    if (!match) {
      const plain = Number.parseFloat(text.replace(/[^0-9.]+/g, ''));
      return Number.isFinite(plain) ? Math.round(plain) : null;
    }

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2]).toLowerCase();
    if (unit === 'gb') return Math.round(amount * 1024 * 1024);
    if (unit === 'mb') return Math.round(amount * 1024);
    if (unit === 'kb') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return null;
  }

  function parseTimestampToIso(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const numeric = Number.parseInt(raw, 10);
      if (!Number.isFinite(numeric)) return null;
      const millis = raw.length <= 10 ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    const direct = Date.parse(raw);
    if (Number.isFinite(direct)) {
      return new Date(direct).toISOString();
    }

    const compact = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (compact) {
      const assembled = `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6] || '00'}`;
      const parsed = Date.parse(assembled);
      if (Number.isFinite(parsed)) {
        return new Date(parsed).toISOString();
      }
    }

    return null;
  }

  function cleanSourceCode(value) {
    if (typeof value !== 'string') return null;

    const cleaned = value
      .replace(/\r\n?/g, '\n')
      .replace(/^\uFEFF/, '')
      .replace(/\u0000/g, '')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\u00A0/g, ' ')
      .trimEnd();

    return cleaned.trim().length > 0 ? cleaned : null;
  }

  function looksLikeCode(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (text.length < 20) return false;

    const signalPatterns = [
      /#include\s*</,
      /\bint\s+main\s*\(/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
      /\bclass\s+[A-Za-z_][A-Za-z0-9_]*\b/,
      /\busing\s+namespace\b/,
      /\breturn\s+\d+\s*;/,
      /\{[\s\S]{20,}\}/,
      /\bscanf\s*\(/,
      /\bprintf\s*\(/,
      /\bcin\s*>>/,
      /\bcout\s*<</,
    ];

    if (signalPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    const newlineCount = (text.match(/\n/g) || []).length;
    return newlineCount >= 4;
  }

  function looksLikeSpojSourcePayload(value) {
    if (typeof value !== 'string') return false;

    const text = value.trim();
    if (!text) return false;

    const normalized = text.toLowerCase();
    if (
      normalized.includes('submission does not exist') ||
      normalized.includes('source code unavailable') ||
      normalized.includes('source code is not available') ||
      normalized.includes('access denied') ||
      normalized.includes('error 404') ||
      normalized.includes('just a moment') ||
      normalized.includes('checking your browser before accessing')
    ) {
      return false;
    }

    if (looksLikeCode(text)) {
      return true;
    }

    return (
      text.length >= 12 &&
      (/\b(print|scanf|printf|cin|cout|return|class|public|private|def|function|var|let|const|main)\b/i.test(
        text
      ) ||
        /[{}();<>#]/.test(text) ||
        (text.match(/\n/g) || []).length >= 2)
    );
  }

  function extractCodeFromHtmlPayload(rawHtml) {
    if (typeof rawHtml !== 'string' || rawHtml.trim().length === 0) {
      return null;
    }

    if (!/<(?:html|body|pre|code|textarea)\b/i.test(rawHtml)) {
      return null;
    }

    try {
      const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
      const selectors = [
        'pre[id*="source"]',
        'pre[class*="source"]',
        'textarea[id*="source"]',
        'textarea[name*="source"]',
        'pre code',
        'pre',
        'code',
      ];

      for (const selector of selectors) {
        const node = parsed.querySelector(selector);
        if (!node) continue;

        const candidate = cleanSourceCode(
          typeof node.value === 'string' ? node.value : node.textContent
        );

        if (candidate && looksLikeSpojSourcePayload(candidate)) {
          return candidate;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  function parseProblemNameFromTitle(title) {
    const rawTitle = String(title || '').trim();
    if (!rawTitle) return null;

    return rawTitle
      .replace(/^\s*SPOJ\s*-\s*/i, '')
      .replace(/^\s*Sphere\s+Online\s+Judge\s*-\s*/i, '')
      .replace(/\s*\|\s*SPOJ.*$/i, '')
      .trim();
  }

  function normalizeProblemDetailText(value) {
    if (typeof value !== 'string') return '';

    const noisyLinePatterns = [
      /^home$/i,
      /^problems?$/i,
      /^status$/i,
      /^ranks?$/i,
      /^submit$/i,
      /^logout$/i,
      /^login$/i,
      /^register$/i,
      /^news$/i,
      /^forum$/i,
    ];

    return String(value)
      .replace(/\r/g, '')
      .replace(/\u00A0/g, ' ')
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

  function hasProblemStatementSignals(text) {
    const normalized = normalizeProblemDetailText(String(text || ''));
    if (!normalized) return false;

    const signalHits = [
      /input\s+format/i,
      /output\s+format/i,
      /constraints?/i,
      /sample\s+input/i,
      /sample\s+output/i,
      /problem\s+statement/i,
      /\bgiven\b/i,
      /\bfind\b/i,
    ].filter((pattern) => pattern.test(normalized)).length;

    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    return signalHits >= 1 || wordCount >= 50;
  }

  function extractLabeledSection(text, labels, stopLabels = []) {
    if (!text || !Array.isArray(labels) || labels.length === 0) {
      return null;
    }

    const escapedStops = stopLabels
      .map((label) => String(label || '').trim())
      .filter(Boolean)
      .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const stopGroup =
      escapedStops.length > 0
        ? `(?:${escapedStops.join('|')})`
        : '(?:Input(?:\\s+Format)?|Output(?:\\s+Format)?|Constraints?|Sample\\s+Input|Sample\\s+Output|Examples?|Explanation|Notes?)';

    for (const label of labels) {
      const escapedLabel = String(label || '')
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escapedLabel) continue;

      const pattern = new RegExp(
        `(?:^|\\n)\\s*${escapedLabel}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*${stopGroup}\\s*:?|$)`,
        'i'
      );
      const match = text.match(pattern);
      if (!match) continue;

      const section = String(match[1] || '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (section) {
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
      /Sample\s+Input\s*:?([\s\S]*?)\n\s*Sample\s+Output\s*:?([\s\S]*?)(?=\n\s*(?:Sample\s+Input|Explanation|Notes?|Constraints?|$))/gi;

    let match;
    while ((match = regex.exec(normalized)) != null && tests.length < 6) {
      const input = String(match[1] || '').trim();
      const output = String(match[2] || '').trim();
      if (!input && !output) continue;
      tests.push({ input, output });
    }

    return tests;
  }

  function normalizeHeaderLabel(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  class SPOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
      this.messageListenerAttached = false;
      this.problemDetailsCache = null;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (path.startsWith('/status')) {
        return 'submissions';
      }
      if (path.startsWith('/users/')) {
        return 'profile';
      }
      if (path.includes('/submit/')) {
        return 'problem';
      }
      if (path.includes('/problems/')) {
        return 'problem';
      }

      return 'unknown';
    }

    getHandleFromUrl() {
      const match = window.location.pathname.match(/^\/status\/?([^/?#]+)/i);
      if (match?.[1]) {
        const candidate = decodeURIComponent(match[1])
          .trim()
          .replace(/,all$/i, '')
          .replace(/,?start=\d+$/i, '')
          .replace(/,+$/g, '')
          .trim();

        // SPOJ status pages can be /status/<problemCode>,<handle>/.
        if (candidate.includes(',')) {
          const parts = candidate
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);

          const filteredParts = parts.filter(
            (part) => !/^all$/i.test(part) && !/^start=\d+$/i.test(part)
          );
          const maybeHandle = filteredParts[filteredParts.length - 1] || null;

          if (maybeHandle && !/^\d+$/.test(maybeHandle)) {
            return normalizeHandle(maybeHandle);
          }
        }

        if (candidate && !/^\d+$/.test(candidate)) {
          return normalizeHandle(candidate);
        }
      }

      const searchParams = new URL(window.location.href).searchParams;
      const queryHandle = firstNonEmpty(
        searchParams.get('user'),
        searchParams.get('username'),
        searchParams.get('name')
      );

      if (queryHandle && !/^\d+$/.test(queryHandle)) {
        return normalizeHandle(queryHandle);
      }

      return null;
    }

    async getUserHandle() {
      const fromUrl = this.getHandleFromUrl();
      if (fromUrl) return fromUrl;

      const prioritizedUserLink =
        safeQuery('nav a[href^="/users/"]') ||
        safeQuery('a[href^="/users/"][class*="user"]') ||
        safeQuery('a[href^="/users/"]');

      if (prioritizedUserLink) {
        const href = prioritizedUserLink.getAttribute('href') || '';
        const match = href.match(/\/users\/([^/?#]+)/i);
        if (match?.[1]) {
          return normalizeHandle(decodeURIComponent(match[1]));
        }
      }

      return null;
    }

    getSubmissionIdFromUrl() {
      const path = window.location.pathname;
      const directMatch = path.match(/^\/status\/(\d+)\/?$/i);
      if (directMatch?.[1]) {
        return directMatch[1];
      }

      const params = new URL(window.location.href).searchParams;
      return firstNonEmpty(params.get('solution'), params.get('id'));
    }

    extractSourceCodeFromDom() {
      const candidates = [];

      const pushCandidate = (rawValue, selector, bonus = 0) => {
        const cleaned = cleanSourceCode(rawValue);
        if (!cleaned || !looksLikeCode(cleaned)) {
          return;
        }

        candidates.push({
          selector,
          code: cleaned,
          score: cleaned.length + bonus,
        });
      };

      const codeSelectors = [
        'pre[id*="source"]',
        'pre[class*="source"]',
        'pre[class*="code"]',
        'textarea[id*="source"]',
        'textarea[name*="source"]',
        '.source code',
        '.source pre',
        'pre code',
        'pre',
      ];

      codeSelectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const nodeValue =
            typeof node.value === 'string' ? node.value : node.textContent;
          const textValue = firstNonEmpty(nodeValue, node.innerText) || '';

          let bonus = 0;
          if (/source/i.test(selector)) bonus += 320;
          if (/code/i.test(selector)) bonus += 120;

          pushCandidate(textValue, selector, bonus);
        });
      });

      const lineNodes = safeQueryAll(
        '.source li, .code li, pre li, .ace_line, .CodeMirror-line'
      );
      if (lineNodes.length > 0) {
        const joined = lineNodes
          .map((line) => String(line.textContent || '').replace(/\u00A0/g, ' '))
          .join('\n');
        pushCandidate(joined, 'line-nodes', 260);
      }

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      log('Source code candidate selected', {
        selector: best.selector,
        length: best.code.length,
      });
      return best.code;
    }

    async fetchSourceCodeFromApi(submissionId) {
      const normalizedSubmissionId = String(submissionId || '').trim();
      if (!/^\d+$/.test(normalizedSubmissionId)) return null;

      const endpointCandidates = [
        {
          url: `/files/src/plain/${normalizedSubmissionId}/`,
          kind: 'plain',
        },
        {
          url: `https://www.spoj.com/files/src/plain/${normalizedSubmissionId}/`,
          kind: 'plain',
        },
        {
          url: `/files/src/${normalizedSubmissionId}/`,
          kind: 'legacy',
        },
        {
          url: `https://www.spoj.com/files/src/${normalizedSubmissionId}/`,
          kind: 'legacy',
        },
      ];

      for (const endpoint of endpointCandidates) {
        try {
          const response = await fetch(endpoint.url, {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            continue;
          }

          const rawCode = await response.text();
          const cleanCode = cleanSourceCode(rawCode);
          const isUsablePayload =
            cleanCode &&
            (endpoint.kind === 'plain'
              ? looksLikeSpojSourcePayload(cleanCode)
              : looksLikeCode(cleanCode));

          if (isUsablePayload) {
            log('Fetched source code from SPOJ endpoint', {
              submissionId: normalizedSubmissionId,
              endpoint: endpoint.url,
              length: cleanCode.length,
            });
            return cleanCode;
          }

          const htmlFallbackCode = extractCodeFromHtmlPayload(rawCode);
          if (htmlFallbackCode) {
            log('Fetched source code from SPOJ HTML fallback', {
              submissionId: normalizedSubmissionId,
              endpoint: endpoint.url,
              length: htmlFallbackCode.length,
            });
            return htmlFallbackCode;
          }
        } catch (err) {
          log('Failed SPOJ source endpoint', {
            submissionId: normalizedSubmissionId,
            endpoint: endpoint.url,
            error: err?.message || String(err),
          });
        }
      }

      return null;
    }

    async extractSourceCode(submissionId = null) {
      submissionId = submissionId || this.getSubmissionIdFromUrl();

      // Try API first as it's the most reliable way on SPOJ
      const apiSourceCode = await this.fetchSourceCodeFromApi(submissionId);
      if (apiSourceCode) {
        return apiSourceCode;
      }

      // Fallback to DOM parsing
      const maxAttempts = 8;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sourceCode = this.extractSourceCodeFromDom();
        if (sourceCode) {
          return sourceCode;
        }

        await sleep(220 + attempt * 110);
      }

      return null;
    }

    findStatusTable() {
      const tables = safeQueryAll('table');
      if (tables.length === 0) {
        return null;
      }

      let bestTable = null;
      let bestScore = -1;

      tables.forEach((table) => {
        const rows = safeQueryAll('tr', table);
        const headers = safeQueryAll('thead th, tr th', table)
          .map((th) => normalizeHeaderLabel(extractText(th)))
          .filter(Boolean)
          .join(' ');
        const hasProblemLinks =
          safeQueryAll('a[href*="/problems/"]', table).length > 0;

        let score = 0;
        score += Math.min(rows.length, 10);
        if (hasProblemLinks) score += 8;
        if (headers.includes('status') || headers.includes('result'))
          score += 4;
        if (headers.includes('lang') || headers.includes('language'))
          score += 3;
        if (headers.includes('problem')) score += 3;

        if (score > bestScore) {
          bestScore = score;
          bestTable = table;
        }
      });

      return bestScore >= 6 ? bestTable : null;
    }

    extractHeaderCells(table) {
      const headerCells = safeQueryAll('thead th', table);
      if (headerCells.length > 0) {
        return headerCells.map((cell, index) => ({
          index,
          label: normalizeHeaderLabel(
            firstNonEmpty(
              extractText(cell),
              cell.getAttribute('title'),
              cell.getAttribute('aria-label')
            )
          ),
        }));
      }

      const firstRow = safeQuery('tr', table);
      if (!firstRow) {
        return [];
      }

      const firstRowHeaders = safeQueryAll('th', firstRow);
      if (firstRowHeaders.length > 0) {
        return firstRowHeaders.map((cell, index) => ({
          index,
          label: normalizeHeaderLabel(extractText(cell)),
        }));
      }

      return [];
    }

    findHeaderIndex(headers, patterns) {
      if (!Array.isArray(headers) || headers.length === 0) {
        return null;
      }

      for (const pattern of patterns) {
        const hit = headers.find((header) => pattern.test(header.label));
        if (hit && Number.isInteger(hit.index)) {
          return hit.index;
        }
      }

      return null;
    }

    resolveColumnIndexes(table) {
      const headers = this.extractHeaderCells(table);

      const id = this.findHeaderIndex(headers, [
        /^id$/,
        /solution/,
        /submission/,
      ]);
      const date = this.findHeaderIndex(headers, [
        /^when$/,
        /submitted/,
        /submission\s*time/,
        /^date$/,
      ]);
      const problem = this.findHeaderIndex(headers, [/^problem$/, /task/]);
      const user = this.findHeaderIndex(headers, [
        /^user$/,
        /author/,
        /handle/,
      ]);
      const verdict = this.findHeaderIndex(headers, [
        /^status$/,
        /^result$/,
        /verdict/,
      ]);
      const runtime = this.findHeaderIndex(headers, [
        /^time$/,
        /runtime/,
        /exec/,
      ]);
      const memory = this.findHeaderIndex(headers, [/^memory$/, /^mem$/]);
      const language = this.findHeaderIndex(headers, [/^lang$/, /language/]);

      return {
        id,
        date,
        problem,
        user,
        verdict,
        runtime,
        memory,
        language,
      };
    }

    pickCell(cells, preferredIndices = []) {
      for (const index of preferredIndices) {
        if (!Number.isInteger(index)) continue;
        if (index < 0 || index >= cells.length) continue;
        return cells[index];
      }
      return null;
    }

    parseSubmittedAt(dateCell) {
      if (!dateCell) return null;

      const datetimeEl = safeQuery('time[datetime]', dateCell);
      if (datetimeEl) {
        const parsedFromDatetime = parseTimestampToIso(
          datetimeEl.getAttribute('datetime')
        );
        if (parsedFromDatetime) return parsedFromDatetime;
      }

      const candidates = [
        dateCell.getAttribute('title'),
        dateCell.getAttribute('data-timestamp'),
        dateCell.getAttribute('data-value'),
        dateCell.getAttribute('data-original-title'),
        extractText(dateCell),
      ];

      for (const candidate of candidates) {
        const parsed = parseTimestampToIso(candidate);
        if (parsed) return parsed;
      }

      return null;
    }

    extractProblemInfo(problemCell, row) {
      const link =
        safeQuery('a[href*="/problems/"]', problemCell || row) ||
        safeQuery('a[href*="/problems/"]', row);

      let problemId = null;
      let problemName = null;
      let problemUrl = null;

      if (link) {
        const href = link.getAttribute('href') || link.href || '';
        const match = String(href).match(/\/problems\/([^/?#]+)/i);
        problemId = match?.[1] ? decodeURIComponent(match[1]).trim() : null;
        problemName = extractText(link) || problemId;
        problemUrl = problemId
          ? `https://www.spoj.com/problems/${encodeURIComponent(problemId)}/`
          : null;
      }

      if (!problemId && problemCell) {
        const fallbackText = extractText(problemCell);
        const codeMatch = fallbackText.match(/\b[A-Z0-9_]{2,}\b/);
        if (codeMatch?.[0]) {
          problemId = codeMatch[0];
          problemName = problemName || fallbackText || problemId;
          problemUrl = `https://www.spoj.com/problems/${encodeURIComponent(problemId)}/`;
        }
      }

      if (problemId && !problemName) {
        problemName = problemId;
      }

      return {
        problemId,
        problemName,
        problemUrl,
      };
    }

    extractRowHandle(userCell, row, fallbackHandle) {
      const userLink =
        safeQuery('a[href*="/users/"]', userCell || row) ||
        safeQuery('a[href*="/users/"]', row);

      if (userLink) {
        const href = userLink.getAttribute('href') || '';
        const match = href.match(/\/users\/([^/?#]+)/i);
        if (match?.[1]) {
          return normalizeHandle(decodeURIComponent(match[1]));
        }
      }

      const normalizedFallback = normalizeHandle(fallbackHandle);

      if (userCell) {
        const userText = extractText(userCell);
        const normalizedUserText = normalizeHandle(userText);
        if (normalizedUserText && /^[A-Za-z0-9_\-.]{2,}$/.test(userText)) {
          const looksLikeVerdict =
            /(accepted|wrong|time|memory|runtime|compil|pending|judge|status|result|running|finished|partial|skipped|error)/i.test(
              normalizedUserText
            );
          const looksLikeRuntimeOrMemory = /\d+\s*(ms|s|sec|kb|mb|gb)/i.test(
            userText
          );

          if (!looksLikeVerdict && !looksLikeRuntimeOrMemory) {
            if (
              !normalizedFallback ||
              normalizedUserText.toLowerCase() ===
                normalizedFallback.toLowerCase()
            ) {
              return normalizedUserText;
            }
          }
        }
      }

      return normalizedFallback;
    }

    extractVerdictText(verdictCell) {
      if (!verdictCell) return '';

      return (
        firstNonEmpty(
          verdictCell.getAttribute('title'),
          verdictCell.getAttribute('aria-label'),
          safeQuery('span[title], a[title]', verdictCell)?.getAttribute(
            'title'
          ),
          safeQuery('img[alt]', verdictCell)?.getAttribute('alt'),
          extractText(verdictCell)
        ) || ''
      );
    }

    extractSubmissionRef(row, idCell) {
      const statusLink =
        safeQuery('a[href*="/status/"]', idCell || row) ||
        safeQuery('a[href*="/status/"]', row);

      let statusUrlFromLink = null;

      if (statusLink) {
        const href = statusLink.getAttribute('href') || statusLink.href || '';
        try {
          const absolute = new URL(href, window.location.href).toString();
          const isNumericStatusUrl = /\/status\/\d+\/?(?:[?#].*)?$/i.test(
            absolute
          );
          if (/\/status\//i.test(absolute) && !isNumericStatusUrl) {
            statusUrlFromLink = absolute;
          } else if (isNumericStatusUrl) {
            // SPOJ numeric status URLs can 404; use the current listing page instead.
            statusUrlFromLink = window.location.href;
          }
        } catch {
          statusUrlFromLink = null;
        }

        const fromHref = String(href).match(/\/status\/([^/?#]+)/i)?.[1];
        const fromHrefSubmissionId = fromHref?.match(/(\d{3,})/)?.[1] || null;

        if (fromHrefSubmissionId) {
          return {
            submissionId: fromHrefSubmissionId,
            submissionUrl: statusUrlFromLink || window.location.href,
          };
        }
      }

      const fromText = extractText(idCell || row).match(/\b(\d{3,})\b/)?.[1];
      if (!fromText) {
        return null;
      }

      return {
        submissionId: fromText,
        submissionUrl: statusUrlFromLink || window.location.href,
      };
    }

    extractSubmissionFromRow(row, columns, fallbackHandle) {
      const cells = safeQueryAll('td', row);
      if (cells.length < 4) return null;

      const hasUserColumn = Number.isInteger(columns.user);

      const idCell = this.pickCell(cells, [columns.id, 0]);
      const dateCell = this.pickCell(cells, [columns.date, 1]);
      const problemCell = this.pickCell(cells, [columns.problem, 2]);
      const userCell = hasUserColumn
        ? this.pickCell(cells, [columns.user, 3])
        : null;
      const verdictCell = this.pickCell(
        cells,
        hasUserColumn ? [columns.verdict, 4, 3] : [columns.verdict, 3, 4]
      );
      const runtimeCell = this.pickCell(
        cells,
        hasUserColumn ? [columns.runtime, 5, 4] : [columns.runtime, 4, 5]
      );
      const memoryCell = this.pickCell(
        cells,
        hasUserColumn ? [columns.memory, 6, 5] : [columns.memory, 5, 6]
      );
      const languageCell = this.pickCell(
        cells,
        hasUserColumn ? [columns.language, 7, 6] : [columns.language, 6, 7]
      );

      const submissionRef = this.extractSubmissionRef(row, idCell);
      const submissionId = submissionRef?.submissionId;
      if (!submissionId || !/^\d+$/.test(submissionId)) {
        return null;
      }

      const { problemId, problemName, problemUrl } = this.extractProblemInfo(
        problemCell,
        row
      );
      if (!problemId) {
        return null;
      }

      const handle = this.extractRowHandle(userCell, row, fallbackHandle);
      const verdictText = this.extractVerdictText(verdictCell);
      const runtimeText = extractText(runtimeCell);
      const memoryText = extractText(memoryCell);
      const language = firstNonEmpty(extractText(languageCell), 'Unknown');
      const submittedAt = this.parseSubmittedAt(dateCell);
      const verdict = normalizeVerdict(verdictText);
      const executionTime = parseDurationToMs(runtimeText);
      const memoryUsed = parseMemoryToKb(memoryText);
      const submissionUrl =
        submissionRef?.submissionUrl || window.location.href;

      return {
        platform: this.platform,
        handle,
        problemId,
        problemName: problemName || problemId,
        problemUrl,
        submissionId,
        submissionUrl,
        verdict,
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode: null,
        problem_id: problemId,
        problem_name: problemName || problemId,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        submitted_at: submittedAt,
        source_code: null,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };
    }

    isSubmissionsPageReady() {
      const table = this.findStatusTable();
      if (table) {
        return true;
      }

      if (this.getSubmissionIdFromUrl()) {
        return true;
      }

      const text = extractText(document.body);
      if (!text) {
        return false;
      }

      if (/loading|please wait|fetching/i.test(text)) {
        return false;
      }

      return /status|submission/i.test(text);
    }

    isLikelyCloudflareBlocked() {
      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) {
        return false;
      }

      return (
        bodyText.includes('just a moment') ||
        bodyText.includes('enable javascript and cookies to continue') ||
        bodyText.includes('checking your browser before accessing') ||
        bodyText.includes('challenge-platform') ||
        bodyText.includes('cf_chl_opt')
      );
    }

    getStatusStartOffset(url) {
      try {
        const parsed = new URL(url, window.location.href);
        const pathMatch = parsed.pathname.match(/\/start=(\d+)(?:\/|$)/i);
        if (pathMatch?.[1]) {
          const fromPath = Number.parseInt(pathMatch[1], 10);
          if (Number.isFinite(fromPath)) {
            return Math.max(0, fromPath);
          }
        }

        const fromQuery = Number.parseInt(parsed.searchParams.get('start'), 10);
        if (Number.isFinite(fromQuery)) {
          return Math.max(0, fromQuery);
        }
      } catch {
        // Ignore malformed URLs and continue.
      }

      return null;
    }

    isStatusListingUrl(url) {
      try {
        const parsed = new URL(url, window.location.href);
        if (!/^\/status(?:\/|$)/i.test(parsed.pathname)) {
          return false;
        }

        const tokenMatch = parsed.pathname.match(/^\/status\/?([^/?#]*)/i);
        const token = decodeURIComponent(tokenMatch?.[1] || '').trim();

        // Direct submission pages are /status/<numericId>/ and are not
        // paginated status listing pages.
        if (token && /^\d+$/.test(token)) {
          return false;
        }

        if (!token) {
          return (
            parsed.searchParams.has('user') ||
            parsed.searchParams.has('username') ||
            parsed.searchParams.has('name') ||
            parsed.searchParams.has('start')
          );
        }

        return true;
      } catch {
        return false;
      }
    }

    extractNextPageUrl() {
      const currentUrl = window.location.href;
      const currentStart = this.getStatusStartOffset(currentUrl) ?? 0;

      const allLinks = safeQueryAll('a[href]').filter((anchor) => {
        const href = String(anchor.getAttribute('href') || '').trim();
        if (!href || href.startsWith('#') || /^javascript:/i.test(href)) {
          return false;
        }

        const className = String(anchor.className || '').toLowerCase();
        if (/(disabled|inactive)/i.test(className)) {
          return false;
        }

        return true;
      });

      const explicitNextLinks = allLinks.filter((anchor) => {
        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const text = extractText(anchor).toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();

        return (
          rel.includes('next') ||
          /(^|\s)(next|newer|>>|›|»)(\s|$)/i.test(text) ||
          /next/i.test(title)
        );
      });

      for (const anchor of explicitNextLinks) {
        const href = String(anchor.getAttribute('href') || '').trim();
        try {
          const absolute = new URL(href, currentUrl).toString();
          if (!absolute || absolute === currentUrl) {
            continue;
          }

          if (!this.isStatusListingUrl(absolute)) {
            continue;
          }

          const offset = this.getStatusStartOffset(absolute);
          if (Number.isFinite(offset) && offset <= currentStart) {
            continue;
          }

          if (absolute && absolute !== currentUrl) {
            return absolute;
          }
        } catch {
          // Ignore malformed href and continue.
        }
      }

      const startOffsetCandidates = [];
      for (const anchor of allLinks) {
        const href = String(anchor.getAttribute('href') || '').trim();

        let absolute;
        try {
          absolute = new URL(href, currentUrl).toString();
        } catch {
          continue;
        }

        if (!absolute || absolute === currentUrl) {
          continue;
        }

        if (!this.isStatusListingUrl(absolute)) {
          continue;
        }

        const offset = this.getStatusStartOffset(absolute);
        if (!Number.isFinite(offset) || offset <= currentStart) {
          continue;
        }

        startOffsetCandidates.push({
          url: absolute,
          offset,
        });
      }

      if (startOffsetCandidates.length > 0) {
        startOffsetCandidates.sort((a, b) => a.offset - b.offset);
        return startOffsetCandidates[0].url;
      }

      return null;
    }

    async extractSubmissionFromCurrentPageFallback(submissionId) {
      const pageText = extractText(document.body);
      const extractedProblemInfo = this.extractProblemInfo(null, document);
      const fallbackProblemId = this.extractProblemIdFromPage();
      const problemId = extractedProblemInfo.problemId || fallbackProblemId;
      const problemName =
        extractedProblemInfo.problemName ||
        this.extractProblemNameFromPage(problemId) ||
        problemId;
      const problemUrl =
        extractedProblemInfo.problemUrl ||
        (problemId
          ? `https://www.spoj.com/problems/${encodeURIComponent(problemId)}/`
          : null);

      const verdictText =
        firstNonEmpty(
          pageText.match(
            /(accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compilation error|presentation error|pending|running)/i
          )?.[1],
          extractText('[class*="status"], [class*="result"], .status, .result')
        ) || 'UNKNOWN';

      const language =
        firstNonEmpty(
          extractText('[class*="lang"], [class*="language"]'),
          safeQuery('td[title]')?.getAttribute('title'),
          'Unknown'
        ) || 'Unknown';

      const runtimeMatch = pageText.match(
        /(?:time|runtime)[^0-9]*([0-9]*\.?[0-9]+\s*(?:ms|msec|millisecond(?:s)?|s|sec|second(?:s)?))/i
      );
      const memoryMatch = pageText.match(
        /(?:memory|mem)[^0-9]*([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i
      );
      const submittedAtMatch = pageText.match(
        /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(?::\d{2})?)/
      );

      const sourceCode = await this.extractSourceCode(submissionId);
      const handle = await this.getUserHandle();
      // Keep extraction on the current listing page instead of numeric status URLs.
      const submissionUrl = window.location.href;
      const verdict = normalizeVerdict(verdictText);
      const executionTime = runtimeMatch
        ? parseDurationToMs(runtimeMatch[1])
        : null;
      const memoryUsed = memoryMatch ? parseMemoryToKb(memoryMatch[1]) : null;
      const submittedAt = submittedAtMatch
        ? parseTimestampToIso(submittedAtMatch[1])
        : null;

      return {
        platform: this.platform,
        handle,
        problemId,
        problemName: problemName || problemId,
        problemUrl,
        submissionId,
        submissionUrl,
        verdict,
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode,
        problem_id: problemId,
        problem_name: problemName || problemId,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        submitted_at: submittedAt,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };
    }

    async extractSubmissions(options = {}) {
      const pageType = this.detectPageType();

      // Profile page: extract solved problem list
      if (pageType === 'profile') {
        return this.extractProfileSolvedProblems();
      }

      if (pageType !== 'submissions') {
        return [];
      }

      await waitForElement('table', 5000).catch(() => null);
      await sleep(250);

      const table = this.findStatusTable();
      if (!table) {
        log('Status table not found');
        return [];
      }

      const columns = this.resolveColumnIndexes(table);
      const rows = safeQueryAll('tbody tr', table);
      const normalizedRows =
        rows.length > 0
          ? rows
          : safeQueryAll('tr', table).filter(
              (row) => safeQueryAll('td', row).length >= 4
            );

      const pageScopedHandle = normalizeHandle(this.getHandleFromUrl());
      const preferredHandle =
        normalizeHandle(options.expectedHandle) ||
        pageScopedHandle ||
        (await this.getUserHandle());
      const shouldFilterByHandle = options.filterByHandle !== false;
      const submissions = [];
      const seenSubmissionIds = new Set();

      for (const row of normalizedRows) {
        const submission = this.extractSubmissionFromRow(
          row,
          columns,
          pageScopedHandle
        );
        if (!submission) {
          continue;
        }

        if (shouldFilterByHandle && preferredHandle) {
          if (!submission.handle) {
            continue;
          }

          if (
            submission.handle.toLowerCase() !== preferredHandle.toLowerCase()
          ) {
            continue;
          }
        }

        if (seenSubmissionIds.has(submission.submissionId)) {
          continue;
        }

        seenSubmissionIds.add(submission.submissionId);
        submissions.push(submission);
      }

      log('Extracted submissions:', {
        count: submissions.length,
        pageRows: normalizedRows.length,
        preferredHandle: preferredHandle || null,
        pageScopedHandle: pageScopedHandle || null,
      });

      return submissions;
    }

    async extractSubmission(request = {}) {
      const urlSubmissionId =
        request.submissionId || this.getSubmissionIdFromUrl();
      const submissions = await this.extractSubmissions({
        filterByHandle: false,
      });

      let selected = null;
      if (urlSubmissionId) {
        selected =
          submissions.find(
            (submission) => String(submission.submissionId) === urlSubmissionId
          ) || null;
      }

      if (!selected && submissions.length > 0) {
        selected = submissions[0];
      }

      if (!selected && urlSubmissionId) {
        selected =
          await this.extractSubmissionFromCurrentPageFallback(urlSubmissionId);
      }

      if (!selected) {
        return null;
      }

      if (
        urlSubmissionId &&
        String(selected.submissionId) === urlSubmissionId
      ) {
        const sourceCode = await this.extractSourceCode(urlSubmissionId);
        if (sourceCode) {
          selected.sourceCode = sourceCode;
          selected.source_code = sourceCode;
        }
      }

      return selected;
    }

    extractProblemIdFromPage() {
      const path = window.location.pathname;
      const directMatch =
        path.match(/\/problems\/([^/?#]+)/i)?.[1] ||
        path.match(/\/submit\/([^/?#]+)/i)?.[1] ||
        null;

      if (directMatch) {
        return decodeURIComponent(directMatch).trim();
      }

      const problemLink = safeQuery('a[href*="/problems/"]');
      if (problemLink) {
        const href = problemLink.getAttribute('href') || problemLink.href || '';
        const fromLink = String(href).match(/\/problems\/([^/?#]+)/i)?.[1];
        if (fromLink) {
          return decodeURIComponent(fromLink).trim();
        }
      }

      const codeInput = safeQuery(
        'input[name="problemcode"], input[name="problem_code"], input[name="problem"]'
      );
      if (codeInput?.value) {
        return String(codeInput.value).trim();
      }

      return null;
    }

    extractProblemNameFromPage(problemId) {
      const heading = firstNonEmpty(
        extractText('h1'),
        extractText('h2'),
        extractText('.problem-name'),
        extractText('#problem-name'),
        extractText('.problem-description h3')
      );

      if (heading) {
        return heading;
      }

      const titleName = parseProblemNameFromTitle(document.title);
      if (titleName) {
        return titleName;
      }

      return problemId;
    }

    extractProblemStatementText() {
      const selectors = [
        '#problem-body',
        '#problem-content',
        '.problem-statement',
        '.problem-description',
        '.problem-content',
        '.content',
        'article',
        'main',
      ];

      const candidates = [];

      selectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const text = normalizeProblemDetailText(
            String(node?.innerText || node?.textContent || '')
          );
          if (text.length < 120) {
            return;
          }

          const signalHits = [
            /input\s+format/i,
            /output\s+format/i,
            /constraints?/i,
            /sample\s+input/i,
            /sample\s+output/i,
          ].filter((pattern) => pattern.test(text)).length;

          const noiseHits = [
            /recent\s+submissions/i,
            /ranklist/i,
            /news/i,
            /forum/i,
          ].filter((pattern) => pattern.test(text)).length;

          let score = Math.min(text.length, 16000) + signalHits * 500;
          if (/problem/i.test(selector)) score += 350;
          score -= noiseHits * 400;

          candidates.push({ selector, text, score });
        });
      });

      const bodyText = normalizeProblemDetailText(
        String(document.body?.innerText || '')
      );
      if (bodyText.length >= 200) {
        candidates.push({
          selector: 'body',
          text: bodyText,
          score: Math.min(bodyText.length, 4000),
        });
      }

      candidates.sort((a, b) => b.score - a.score);
      return candidates[0]?.text || bodyText;
    }

    isProblemPageReady() {
      if (this.detectPageType() !== 'problem') {
        return false;
      }

      const statementText = this.extractProblemStatementText();
      if (
        statementText.length >= 120 &&
        hasProblemStatementSignals(statementText)
      ) {
        return true;
      }

      const bodyText = normalizeProblemDetailText(
        String(document.body?.innerText || '')
      );
      if (!bodyText || bodyText.length < 180) {
        return false;
      }

      return !/loading|please wait|fetching/i.test(bodyText);
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
        description.length >= 20 && hasProblemStatementSignals(description);
      const hasInputOutput =
        inputFormat.length >= 5 && outputFormat.length >= 5;
      const hasConstraints = constraints.length >= 8;
      const hasExamples = examples.length > 0;

      return hasDescription || hasInputOutput || hasConstraints || hasExamples;
    }

    async extractProblemDetails() {
      await waitForElement('body', 5000).catch(() => null);
      await sleep(350);

      const problemId = this.extractProblemIdFromPage();
      const problemName = this.extractProblemNameFromPage(problemId);
      const statementText = this.extractProblemStatementText();
      const bodyText = normalizeProblemDetailText(
        String(document.body?.innerText || '')
      );

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

      let description =
        extractLabeledSection(
          statementText,
          ['Problem Statement', 'Statement', 'Description', 'Task'],
          sectionStops
        ) || null;

      if (!description && statementText) {
        const prefaceMatch = statementText.match(
          /^[\s\S]*?(?=\n\s*(?:Input(?:\s+Format)?|Output(?:\s+Format)?|Constraints?|Sample\s+Input|Sample\s+Output|Examples?|Explanation|Notes?)\s*:|$)/i
        );
        const preface = normalizeProblemDetailText(prefaceMatch?.[0] || '');
        if (preface.length >= 20 && hasProblemStatementSignals(preface)) {
          description = preface;
        }
      }

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

      const timeLimitMatch = bodyText.match(
        /time\s*limit[^0-9]*([0-9]*\.?[0-9]+\s*(?:ms|msec|millisecond(?:s)?|s|sec|second(?:s)?))/i
      );
      const memoryLimitMatch = bodyText.match(
        /memory\s*limit[^0-9]*([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i
      );

      const timeLimitMs = timeLimitMatch
        ? parseDurationToMs(timeLimitMatch[1])
        : null;
      const memoryLimitKb = memoryLimitMatch
        ? parseMemoryToKb(memoryLimitMatch[1])
        : null;

      const keywordMeta =
        safeQuery('meta[name="keywords"]')?.getAttribute('content') || '';
      const tags = keywordMeta
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);

      return {
        platform: this.platform,
        problemId,
        problemName,
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
        tags,
      };
    }

    async handleExtractSubmissionsMessage(request, sendResponse) {
      try {
        if (this.isLikelyCloudflareBlocked()) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error:
              'SPOJ page is blocked by Cloudflare challenge. Open SPOJ manually and retry import.',
          });
          return;
        }

        const pageType = this.detectPageType();
        if (pageType !== 'submissions' && pageType !== 'profile') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on SPOJ status or profile page',
          });
          return;
        }

        // Profile pages don't need the submissions-page-ready check
        if (pageType === 'submissions' && !this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'SPOJ status page still loading',
          });
          return;
        }

        const expectedHandle = normalizeHandle(
          firstNonEmpty(request?.handle, request?.options?.expectedHandle)
        );
        const filterByHandle = request?.options?.filterByHandle !== false;

        const submissions = await this.extractSubmissions({
          expectedHandle,
          filterByHandle,
        });

        if (
          request?.includeMeta ||
          request?.action === 'extractSubmissionsPage'
        ) {
          sendResponse({
            success: true,
            data: {
              submissions,
              nextPageUrl: this.extractNextPageUrl(),
              currentUrl: window.location.href,
            },
            error: null,
          });
          return;
        }

        sendResponse({ success: true, data: submissions, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract SPOJ submissions',
        });
      }
    }

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        if (this.detectPageType() !== 'submissions') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on SPOJ status page',
          });
          return;
        }

        if (!this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'SPOJ status page still loading',
          });
          return;
        }

        const submission = await this.extractSubmission(request);
        if (!submission) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'No valid SPOJ submission row found',
          });
          return;
        }

        const sourceCode =
          typeof firstNonEmpty(
            submission.sourceCode,
            submission.source_code
          ) === 'string'
            ? String(
                firstNonEmpty(submission.sourceCode, submission.source_code)
              ).trim()
            : '';
        const requestedSubmissionId = String(
          firstNonEmpty(request?.submissionId, this.getSubmissionIdFromUrl()) ||
            ''
        ).trim();
        const requiresSourceCode = /^\d+$/.test(requestedSubmissionId);

        if (requiresSourceCode && !sourceCode) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'SPOJ source code not ready yet',
          });
          return;
        }

        this.extractionResult = submission;
        this.extractionComplete = Boolean(sourceCode);
        sendResponse({ success: true, data: submission, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract SPOJ submission',
        });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'problem') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on SPOJ problem page yet',
          });
          return;
        }

        if (!this.isProblemPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'SPOJ problem page still loading',
          });
          return;
        }

        const details = await this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'SPOJ problem details not ready yet',
          });
          return;
        }

        this.problemDetailsCache = details;
        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract SPOJ problem details',
        });
      }
    }

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage || this.messageListenerAttached) {
        return;
      }

      this.messageListenerAttached = true;

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          if (request?.action === 'extractSubmissions') {
            this.handleExtractSubmissionsMessage(request, sendResponse);
            return true;
          }

          if (request?.action === 'extractSubmissionsPage') {
            this.handleExtractSubmissionsMessage(
              {
                ...request,
                includeMeta: true,
              },
              sendResponse
            );
            return true;
          }

          if (request?.action === 'extractSubmission') {
            this.handleExtractSubmissionMessage(request, sendResponse);
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

          return false;
        }
      );
    }

    storeSubmissions(submissions = []) {
      if (!browserAPI?.storage?.local || !Array.isArray(submissions)) {
        return;
      }

      if (submissions.length === 0) {
        return;
      }

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = Array.isArray(cached[this.platform])
          ? cached[this.platform]
          : [];

        const existingById = new Map(
          platformCache
            .filter((item) => item?.submissionId)
            .map((item) => [String(item.submissionId), item])
        );

        submissions.forEach((submission) => {
          if (!submission?.submissionId) return;
          existingById.set(String(submission.submissionId), submission);
        });

        const merged = Array.from(existingById.values())
          .sort((a, b) => Number(b.submissionId) - Number(a.submissionId))
          .slice(0, 300);

        cached[this.platform] = merged;
        browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
          log('Cached SPOJ submissions', {
            added: submissions.length,
            cachedTotal: merged.length,
          });

          submissions.forEach((submission) =>
            this.autoSyncIfEnabled(submission)
          );
        });
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI?.storage?.sync || !browserAPI?.runtime) return;

      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          if (result.autoFetchEnabled && result.extensionToken) {
            browserAPI.runtime.sendMessage(
              { action: 'syncSubmission', submission },
              (response) => {
                if (response?.success) {
                  log(
                    'Auto-sync successful for submission',
                    submission.submissionId
                  );
                } else {
                  log('Auto-sync failed:', response?.error || 'Unknown error');
                }
              }
            );
          }
        }
      );
    }

    /**
     * Extract solved problems from SPOJ user profile page.
     * Profile pages list solved problem codes as links — AC only.
     */
    extractProfileSolvedProblems() {
      const submissions = [];
      const seen = new Set();

      // Get the handle from the profile page
      const profileHandle = normalizeHandle(
        firstNonEmpty(
          extractText('#user-profile-left h3'),
          extractText('#user-profile-left h4'),
          extractText('.profile-username'),
          window.location.pathname.match(/\/users\/([^/?#]+)/i)?.[1]
        )
      );

      // Find all problem links on the profile
      const problemLinks = safeQueryAll('a[href*="/problems/"]');

      for (const link of problemLinks) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/problems\/([^/?#]+)/i);
        if (!match || !match[1]) continue;

        const problemId = decodeURIComponent(match[1]).trim();
        if (!problemId || problemId.length < 2) continue;
        if (seen.has(problemId)) continue;

        // Filter: SPOJ problem codes are uppercase alphanumeric
        if (!/^[A-Z0-9_]{2,20}$/i.test(problemId)) continue;

        seen.add(problemId);
        const problemUrl = `https://www.spoj.com/problems/${encodeURIComponent(problemId)}/`;

        submissions.push({
          platform: this.platform,
          handle: profileHandle,
          problemId,
          problemName: extractText(link) || problemId,
          problemUrl,
          submissionId: `spoj_profile_${problemId}`,
          submissionUrl: `https://www.spoj.com/status/${encodeURIComponent(problemId)},${encodeURIComponent(profileHandle || '')}/`,
          verdict: 'AC',
          language: 'Unknown',
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode: null,
          // Snake_case aliases for backend compatibility
          problem_id: problemId,
          problem_name: extractText(link) || problemId,
          problem_url: problemUrl,
          submission_id: `spoj_profile_${problemId}`,
          submission_url: `https://www.spoj.com/status/${encodeURIComponent(problemId)},${encodeURIComponent(profileHandle || '')}/`,
          submitted_at: null,
          source_code: null,
          execution_time_ms: null,
          memory_kb: null,
        });
      }

      log('Extracted profile solved problems:', submissions.length);
      return submissions;
    }

    async init() {
      if (this.initialized) return;

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log('Initializing extractor on page type:', pageType);

      if (pageType === 'submissions' || pageType === 'profile') {
        const submissions = await this.extractSubmissions({});
        if (submissions.length > 0) {
          this.extractionResult = submissions[0];
          this.extractionComplete = Boolean(submissions[0]?.sourceCode);
          this.storeSubmissions(submissions);
        } else {
          log('No SPOJ submissions extracted from page');
        }
      }

      this.initialized = true;
      log('SPOJ extractor initialized');
    }
  }

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new SPOJExtractor();
    extractor.init();
    window.__neupcExtractor = extractor;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
