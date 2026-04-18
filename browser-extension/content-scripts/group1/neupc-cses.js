/**
 * NEUPC CSES Extractor (Standalone)
 * Supports:
 * - Single submission extraction from /problemset/result/<id>
 * - Submission list extraction from /problemset/list and /problemset/status
 * - Problem details extraction from /problemset/task/<id>
 */

(function () {
  'use strict';

  if (window.__NEUPC_CSES_INJECTED__) {
    return;
  }
  window.__NEUPC_CSES_INJECTED__ = true;

  const PLATFORM = 'cses';
  const browserAPI =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof browser !== 'undefined'
        ? browser
        : null;

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
  }

  function logWarn(...args) {
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

  function normalizeWhitespace(value) {
    return String(value || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractText(selectorOrElement, context = document) {
    const el =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;
    if (!el) return '';
    return normalizeWhitespace(el.textContent || el.innerText || '');
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const normalized = normalizeWhitespace(value);
      if (normalized) return normalized;
    }
    return null;
  }

  function decodeUriComponentSafe(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  }

  function isLikelyHandleToken(value) {
    const token = normalizeWhitespace(value);
    if (!token) return false;
    if (token.length > 64) return false;
    return /^[A-Za-z0-9_.-]+$/.test(token);
  }

  function normalizeHandleToken(value) {
    const token = normalizeWhitespace(value);
    if (!token) return null;
    return token.toLowerCase();
  }

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const existing = safeQuery(selector);
      if (existing) {
        resolve(existing);
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

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeVerdict(verdict) {
    if (!verdict) return 'UNKNOWN';
    const v = String(verdict).toUpperCase().trim();

    if (v.includes('ACCEPTED') || v === 'AC' || v === 'OK') return 'AC';
    if (v.includes('WRONG ANSWER') || v === 'WA') return 'WA';
    if (v.includes('TIME LIMIT') || v === 'TLE') return 'TLE';
    if (v.includes('MEMORY LIMIT') || v === 'MLE') return 'MLE';
    if (v.includes('RUNTIME ERROR') || v === 'RE' || v === 'RTE') return 'RE';
    if (v.includes('COMPILATION ERROR') || v.includes('COMPILE ERROR')) {
      return 'CE';
    }
    if (v.includes('PRESENTATION ERROR') || v === 'PE') return 'PE';
    if (v.includes('PENDING') || v.includes('QUEUE') || v.includes('RUNNING')) {
      return 'PENDING';
    }

    return v;
  }

  function parseDurationToMs(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    const match = text.match(
      /([0-9]*\.?[0-9]+)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?)?/i
    );
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || '').toLowerCase();
    if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
      return Math.round(amount);
    }
    if (unit.startsWith('s') || unit.startsWith('sec')) {
      return Math.round(amount * 1000);
    }

    // CSES runtime values without explicit units are typically seconds.
    return amount <= 20 ? Math.round(amount * 1000) : Math.round(amount);
  }

  function parseMemoryToKb(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|mb|gb|b)?/i);
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || 'kb').toLowerCase();
    if (unit === 'gb') return Math.round(amount * 1024 * 1024);
    if (unit === 'mb') return Math.round(amount * 1024);
    if (unit === 'kb') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return Math.round(amount);
  }

  function parseRgbComponents(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i
    );
    if (!match) return null;

    const red = Number.parseInt(match[1], 10);
    const green = Number.parseInt(match[2], 10);
    const blue = Number.parseInt(match[3], 10);
    const alpha = match[4] === undefined ? 1 : Number.parseFloat(match[4]);

    if (
      !Number.isFinite(red) ||
      !Number.isFinite(green) ||
      !Number.isFinite(blue) ||
      !Number.isFinite(alpha)
    ) {
      return null;
    }

    return { red, green, blue, alpha };
  }

  function isGreenishRgb(value) {
    const rgb = parseRgbComponents(value);
    if (!rgb || rgb.alpha <= 0) return false;

    return (
      rgb.green >= 90 && rgb.green >= rgb.red + 25 && rgb.green >= rgb.blue + 20
    );
  }

  function parseTimestampToIso(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      // Ignore short numeric values (e.g. runtime, memory, IDs) as timestamps.
      if (text.length < 10) return null;
      const numeric = Number.parseInt(text, 10);
      if (!Number.isFinite(numeric)) return null;
      const millis =
        text.length <= 10
          ? numeric * 1000
          : Number.parseInt(text.slice(0, 13), 10);
      const date = new Date(millis);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    // Avoid browser-dependent parsing of ambiguous values that do not include a year.
    if (!/\b\d{4}\b/.test(text)) {
      return null;
    }

    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }

    const ymdMatch = text.match(
      /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (ymdMatch) {
      const year = Number.parseInt(ymdMatch[1], 10);
      const month = Number.parseInt(ymdMatch[2], 10);
      const day = Number.parseInt(ymdMatch[3], 10);
      const hour = Number.parseInt(ymdMatch[4] || '0', 10);
      const minute = Number.parseInt(ymdMatch[5] || '0', 10);
      const second = Number.parseInt(ymdMatch[6] || '0', 10);

      const millis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
      if (Number.isFinite(millis)) {
        const dt = new Date(millis);
        if (Number.isFinite(dt.getTime())) {
          return dt.toISOString();
        }
      }
    }

    const dmyMatch = text.match(
      /^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (dmyMatch) {
      const day = Number.parseInt(dmyMatch[1], 10);
      const month = Number.parseInt(dmyMatch[2], 10);
      const year = Number.parseInt(dmyMatch[3], 10);
      const hour = Number.parseInt(dmyMatch[4] || '0', 10);
      const minute = Number.parseInt(dmyMatch[5] || '0', 10);
      const second = Number.parseInt(dmyMatch[6] || '0', 10);

      const millis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
      if (Number.isFinite(millis)) {
        const dt = new Date(millis);
        if (Number.isFinite(dt.getTime())) {
          return dt.toISOString();
        }
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
      .trimEnd();

    return cleaned.trim().length > 0 ? cleaned : null;
  }

  function looksLikeCode(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (text.length < 16) return false;

    const signalPatterns = [
      /#include\s*</,
      /\bint\s+main\s*\(/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
      /\bclass\s+[A-Za-z_][A-Za-z0-9_]*\b/,
      /\busing\s+namespace\b/,
      /\breturn\s+\d+\s*;/,
      /\bscanf\s*\(/,
      /\bprintf\s*\(/,
      /\bcin\s*>>/,
      /\bcout\s*<</,
      /\bconsole\.log\b/,
      /\{[\s\S]{18,}\}/,
    ];

    if (signalPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    const newlineCount = (text.match(/\n/g) || []).length;
    return newlineCount >= 4;
  }

  function parseSampleTests(text) {
    const normalized = String(text || '').replace(/\r/g, '');
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

  class CSESExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.extractionComplete = false;
      this.extractionResult = null;
      this.messageListenerAttached = false;
    }

    detectPageType() {
      const path = window.location.pathname;

      if (/\/result\//i.test(path)) return 'submission';
      if (/\/problemset\/task\/\d+\/(results?|submissions?)/i.test(path)) {
        return 'submissions';
      }
      if (/\/user\//i.test(path)) return 'profile';
      if (/\/problemset\/list\b/i.test(path) || /^\/problemset\/?$/i.test(path)) return 'list';
      if (
        /\/problemset\/(status|submissions?)/i.test(path) ||
        /\/(?:status|submissions?)\b/i.test(path)
      ) {
        return 'submissions';
      }
      if (/\/problemset\/task\//i.test(path)) return 'problem';

      return 'unknown';
    }

    collectDetectedHandles() {
      const handles = [];
      const seen = new Set();

      const addHandle = (value) => {
        const decoded = decodeUriComponentSafe(value);
        const cleaned = normalizeWhitespace(decoded);
        if (!isLikelyHandleToken(cleaned)) return;

        const normalized = normalizeHandleToken(cleaned);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        handles.push(cleaned);
      };

      const fromPath =
        window.location.pathname.match(/\/user\/([^/?#]+)/i)?.[1] || null;
      addHandle(fromPath);

      const userAnchors = safeQueryAll('a[href*="/user/"]');
      for (const anchor of userAnchors) {
        const href = String(anchor.getAttribute('href') || anchor.href || '');
        const token = href.match(/\/user\/([^/?#]+)/i)?.[1] || null;
        addHandle(token);
      }

      const headingText = firstNonEmpty(extractText('h1'), extractText('h2'));
      const headingHandle =
        String(headingText || '').match(/^User\s+([A-Za-z0-9_.-]+)$/i)?.[1] ||
        null;
      addHandle(headingHandle);

      const titleHandle =
        String(document.title || '').match(
          /\bUser\s+([A-Za-z0-9_.-]+)/i
        )?.[1] || null;
      addHandle(titleHandle);

      return handles;
    }

    async getUserHandle() {
      const handles = this.collectDetectedHandles();
      return handles[0] || null;
    }

    extractSubmissionIdFromUrl() {
      return window.location.pathname.match(/\/result\/(\d+)/i)?.[1] || null;
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

      const selectors = [
        'pre#code',
        'pre[id*="code"]',
        'pre[class*="code"]',
        'textarea[id*="code"]',
        'textarea[name*="code"]',
        '.code pre',
        '.code',
        'pre',
      ];

      selectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const value =
            typeof node.value === 'string' ? node.value : node.textContent;
          const textValue = firstNonEmpty(value, node.innerText) || '';

          let bonus = 0;
          if (/code/i.test(selector)) bonus += 260;
          if (/textarea/i.test(selector)) bonus += 90;

          pushCandidate(textValue, selector, bonus);
        });
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].code;
    }

    async extractSourceCode() {
      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sourceCode = this.extractSourceCodeFromDom();
        if (sourceCode) return sourceCode;
        await sleep(220 + attempt * 120);
      }
      return null;
    }

    extractInfoRowsFromSubmissionPage() {
      const infoRows = [];
      const tables = safeQueryAll('table');

      for (const table of tables) {
        const rows = safeQueryAll('tr', table);
        for (const row of rows) {
          const cells = safeQueryAll('th, td', row);
          if (cells.length < 2) continue;

          const key = extractText(cells[0]).toLowerCase();
          const valueCell = cells[cells.length - 1];
          const valueText = extractText(valueCell);
          if (!key || !valueText) continue;

          infoRows.push({ key, valueCell, valueText });
        }
      }

      return infoRows;
    }

    async extractSubmissionFromResultPage(request = {}) {
      const requestSubmissionId = String(request?.submissionId || '').trim();
      const submissionId =
        requestSubmissionId || this.extractSubmissionIdFromUrl();
      if (!submissionId || !/^\d+$/.test(submissionId)) {
        return null;
      }

      await waitForElement('body', 3500).catch(() => null);

      const infoRows = this.extractInfoRowsFromSubmissionPage();
      let problemId = null;
      let problemName = null;
      let problemUrl = null;
      let verdictText = null;
      let language = 'Unknown';
      let executionTime = null;
      let memoryUsed = null;
      let submittedAt = null;

      for (const row of infoRows) {
        const key = row.key;

        if (/(task|problem)/i.test(key)) {
          const taskLink = safeQuery(
            'a[href*="/problemset/task/"]',
            row.valueCell
          );
          if (taskLink) {
            const href = taskLink.getAttribute('href') || taskLink.href || '';
            const taskId = href.match(/\/problemset\/task\/(\d+)/i)?.[1];
            if (taskId) problemId = taskId;
            problemName = extractText(taskLink) || problemName;
            try {
              problemUrl = new URL(href, window.location.href).toString();
            } catch {
              problemUrl = null;
            }
          }
        } else if (/(result|status|verdict)/i.test(key)) {
          verdictText = row.valueText;
        } else if (/language|lang/i.test(key)) {
          language = row.valueText || language;
        } else if (/memory|mem/i.test(key)) {
          memoryUsed = parseMemoryToKb(row.valueText);
        } else if (/time|runtime|date|when|submitted/i.test(key)) {
          const val = row.valueText || '';
          if (
            /\d{4}-\d{2}-\d{2}/.test(val) ||
            /(date|when|submitted)/i.test(key)
          ) {
            submittedAt =
              parseTimestampToIso(
                row.valueCell?.querySelector('time')?.getAttribute('datetime')
              ) || parseTimestampToIso(val);
          } else {
            executionTime = parseDurationToMs(val);
          }
        }
      }

      if (!problemUrl || !problemId) {
        const taskLink = safeQuery('a[href*="/problemset/task/"]');
        if (taskLink) {
          const href = taskLink.getAttribute('href') || taskLink.href || '';
          const taskId = href.match(/\/problemset\/task\/(\d+)/i)?.[1] || null;
          if (!problemId && taskId) problemId = taskId;
          if (!problemName) problemName = extractText(taskLink) || problemId;
          if (!problemUrl) {
            try {
              problemUrl = new URL(href, window.location.href).toString();
            } catch {
              problemUrl = null;
            }
          }
        }
      }

      if (!problemName) {
        problemName =
          firstNonEmpty(extractText('h1'), extractText('h2'), problemId) ||
          problemId;
      }

      if (!problemUrl && problemId) {
        problemUrl = `https://cses.fi/problemset/task/${problemId}`;
      }

      if (!verdictText) {
        verdictText = firstNonEmpty(
          extractText('.status'),
          extractText('.verdict'),
          extractText('[class*="result"]')
        );
      }

      const sourceCode = await this.extractSourceCode();
      const handle = await this.getUserHandle();
      const verdict = normalizeVerdict(verdictText || 'UNKNOWN');

      return {
        platform: this.platform,
        handle,
        problemId,
        problemName,
        problemUrl,
        submissionId,
        submissionUrl: window.location.href,
        verdict,
        language,
        executionTime,
        memoryUsed,
        submittedAt: submittedAt || null,
        sourceCode,
        problem_id: problemId,
        problem_name: problemName,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: window.location.href,
        verdict_raw: verdictText || null,
        submitted_at: submittedAt || null,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };
    }

    findSubmissionsTable() {
      const tables = safeQueryAll('table');
      if (tables.length === 0) return null;

      let bestTable = null;
      let bestScore = -1;

      tables.forEach((table) => {
        const dataRows = safeQueryAll('tbody tr', table).filter(
          (row) => safeQueryAll('td', row).length >= 2
        );
        const fallbackRows =
          dataRows.length > 0
            ? dataRows
            : safeQueryAll('tr', table).filter(
                (row) => safeQueryAll('td', row).length >= 2
              );
        const resultLinks = safeQueryAll('a[href*="/result/"]', table).length;
        const taskLinks = safeQueryAll('a[href*="/task/"]', table).length;
        const headers = safeQueryAll('thead th, tr th', table)
          .map((th) => extractText(th).toLowerCase())
          .join(' ');

        const rowsWithNumericIds = fallbackRows.filter((row) => {
          const cells = safeQueryAll('td', row);
          if (cells.length === 0) return false;
          const idText = extractText(cells[0]);
          return /(^|\D)\d{4,}(\D|$)/.test(idText);
        }).length;

        const rowsCount = fallbackRows.length;

        let score = 0;
        score += resultLinks * 14;
        score += taskLinks * 4;
        score += Math.min(rowsCount, 15);
        score += rowsWithNumericIds * 7;
        if (/result|status|submission/.test(headers)) score += 8;
        if (/task|problem/.test(headers)) score += 6;
        if (/time|memory|lang/.test(headers)) score += 4;

        if (score > bestScore) {
          bestScore = score;
          bestTable = table;
        }
      });

      return bestScore >= 10 ? bestTable : null;
    }

    extractHeaderMap(table) {
      const headerCells = safeQueryAll('thead th', table);
      const labels =
        headerCells.length > 0
          ? headerCells.map((cell) => extractText(cell).toLowerCase())
          : (() => {
              const firstRow = safeQuery('tr', table);
              const rowCells = safeQueryAll('th, td', firstRow || table);
              return rowCells.map((cell) => extractText(cell).toLowerCase());
            })();

      const map = {
        id: null,
        task: null,
        status: null,
        language: null,
        time: null,
        memory: null,
        date: null,
        user: null,
      };

      labels.forEach((label, index) => {
        if (map.id === null && /id|submission|result/.test(label))
          map.id = index;
        else if (map.task === null && /task|problem/.test(label))
          map.task = index;
        else if (map.status === null && /status|result|verdict/.test(label)) {
          map.status = index;
        } else if (map.language === null && /lang|language/.test(label)) {
          map.language = index;
        } else if (/date|when|submitted/.test(label)) {
          map.date = index;
        } else if (/time|runtime/.test(label)) {
          if (map.date === null && index < 3) {
            // Usually the first "time" column is the submission date
            map.date = index;
          } else if (map.time === null) {
            // Execution time
            map.time = index;
          }
        } else if (map.memory === null && /memory|mem/.test(label)) {
          map.memory = index;
        } else if (map.user === null && /user|author|handle/.test(label)) {
          map.user = index;
        }
      });

      return map;
    }

    pickCell(cells, preferredIndices = []) {
      for (const index of preferredIndices) {
        if (!Number.isInteger(index)) continue;
        if (index < 0 || index >= cells.length) continue;
        return cells[index];
      }
      return null;
    }

    extractSubmissionFromRow(row, columns, fallbackHandle) {
      const cells = safeQueryAll('td', row);
      if (cells.length < 2) return null;

      const idCell = this.pickCell(cells, [columns.id, 0]);

      const resultLink =
        safeQuery('a[href*="/result/"]', row) ||
        idCell?.querySelector('a[href*="/result/"]');

      const resultHref =
        resultLink?.getAttribute('href') || resultLink?.href || '';
      const submissionId =
        resultHref.match(/\/result\/(\d+)/i)?.[1] ||
        extractText(idCell).match(/(?:^|\D)(\d{4,})(?:\D|$)/)?.[1];
      if (!submissionId || !/^\d+$/.test(submissionId)) return null;

      let submissionUrl = null;
      if (resultHref) {
        try {
          submissionUrl = new URL(resultHref, window.location.href).toString();
        } catch {
          submissionUrl = null;
        }
      }
      if (!submissionUrl) {
        submissionUrl = `https://cses.fi/problemset/result/${submissionId}/`;
      }

      const taskLink =
        safeQuery('a[href*="/task/"]', row) ||
        this.pickCell(cells, [columns.task, 1])?.querySelector(
          'a[href*="/task/"]'
        );

      const taskHref = taskLink?.getAttribute('href') || taskLink?.href || '';
      let problemId = taskHref.match(/\/task\/(\d+)/i)?.[1] || null;
      let problemName = extractText(taskLink) || problemId;

      let problemUrl = null;
      if (taskHref) {
        try {
          problemUrl = new URL(taskHref, window.location.href).toString();
        } catch {
          problemUrl = null;
        }
      }
      if (!problemUrl && problemId) {
        problemUrl = `https://cses.fi/problemset/task/${problemId}`;
      }

      if (!problemId) {
        const taskMatch = window.location.pathname.match(
          /\/problemset\/task\/(\d+)/i
        );
        if (taskMatch?.[1]) {
          problemId = taskMatch[1];
        }
      }

      if (!problemUrl && problemId) {
        problemUrl = `https://cses.fi/problemset/task/${problemId}`;
      }

      if (!problemName && problemId) {
        problemName = firstNonEmpty(
          extractText('h1'),
          extractText('h2'),
          problemId
        );
      }

      const statusCell =
        this.pickCell(cells, [columns.status, 2]) ||
        safeQuery('[class*="status"], [class*="result"]', row);
      let verdictText = firstNonEmpty(
        statusCell?.getAttribute('title'),
        statusCell?.getAttribute('aria-label'),
        extractText(statusCell)
      );

      if (!verdictText && statusCell) {
        const classText = String(statusCell.className || '').toLowerCase();
        if (/\bac\b|accepted/.test(classText)) verdictText = 'AC';
        else if (/\bwa\b|wrong/.test(classText)) verdictText = 'WA';
        else if (/\btle\b|time/.test(classText)) verdictText = 'TLE';
        else if (/\bmle\b|memory/.test(classText)) verdictText = 'MLE';
        else if (/\bre\b|rte|runtime/.test(classText)) verdictText = 'RE';
        else if (/\bce\b|compile/.test(classText)) verdictText = 'CE';
        else if (/pending|queue|running/.test(classText)) {
          verdictText = 'PENDING';
        }
      }

      const languageText = extractText(
        this.pickCell(cells, [columns.language, 3])
      );
      const timeText = extractText(this.pickCell(cells, [columns.time, 4]));
      const memoryText = extractText(this.pickCell(cells, [columns.memory, 5]));
      const dateCell =
        columns.date !== null ? this.pickCell(cells, [columns.date]) : null;
      const dateCandidates = [
        dateCell?.querySelector('time')?.getAttribute('datetime'),
        dateCell?.querySelector('time')?.getAttribute('title'),
        dateCell?.getAttribute('datetime'),
        dateCell?.getAttribute('data-timestamp'),
        dateCell?.getAttribute('data-order'),
        dateCell?.getAttribute('title'),
        extractText(dateCell),
      ];

      safeQueryAll('time[datetime]', row).forEach((timeNode) => {
        dateCandidates.push(timeNode.getAttribute('datetime'));
        dateCandidates.push(timeNode.getAttribute('title'));
        dateCandidates.push(extractText(timeNode));
      });

      safeQueryAll(
        'td[data-order], td[data-timestamp], td[title]',
        row
      ).forEach((cell) => {
        dateCandidates.push(cell.getAttribute('data-order'));
        dateCandidates.push(cell.getAttribute('data-timestamp'));
        dateCandidates.push(cell.getAttribute('title'));
      });

      let submittedAt = null;
      for (const candidate of dateCandidates) {
        const parsedDate = parseTimestampToIso(candidate);
        if (parsedDate) {
          submittedAt = parsedDate;
          break;
        }
      }

      if (!submittedAt) {
        for (const cell of cells) {
          const cellText = extractText(cell);
          if (!/\b\d{4}\b/.test(cellText)) continue;
          const parsedDate = parseTimestampToIso(cellText);
          if (parsedDate) {
            submittedAt = parsedDate;
            break;
          }
        }
      }

      const handleCell = this.pickCell(cells, [columns.user]);
      const handleHref =
        handleCell?.querySelector('a[href*="/user/"]')?.getAttribute('href') ||
        '';
      const rowHandleFromHref =
        handleHref.match(/\/user\/([^/?#]+)/i)?.[1] || null;
      const rowHandleFromText =
        normalizeWhitespace(handleCell?.textContent || '').match(
          /^([A-Za-z0-9_.-]{1,64})$/
        )?.[1] || null;
      const rowHandle = firstNonEmpty(rowHandleFromHref, rowHandleFromText);

      return {
        platform: this.platform,
        handle: firstNonEmpty(rowHandle, fallbackHandle),
        problemId,
        problemName,
        problemUrl,
        submissionId,
        submissionUrl,
        verdict: normalizeVerdict(verdictText || 'UNKNOWN'),
        language: languageText || 'Unknown',
        executionTime: parseDurationToMs(timeText),
        memoryUsed: parseMemoryToKb(memoryText),
        submittedAt: submittedAt || null,
        sourceCode: null,
        problem_id: problemId,
        problem_name: problemName,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        submitted_at: submittedAt || null,
        source_code: null,
        execution_time_ms: parseDurationToMs(timeText),
        memory_kb: parseMemoryToKb(memoryText),
      };
    }

    extractSubmissionFromResultLink(link, fallbackHandle) {
      if (!link) return null;

      const href = link.getAttribute('href') || link.href || '';
      const submissionId = href.match(/\/result\/(\d+)/i)?.[1];
      if (!submissionId || !/^\d+$/.test(submissionId)) {
        return null;
      }

      let submissionUrl = null;
      try {
        submissionUrl = new URL(href, window.location.href).toString();
      } catch {
        submissionUrl = `https://cses.fi/problemset/result/${submissionId}/`;
      }

      const container =
        link.closest('tr, li, article, section, div') || link.parentElement;

      const taskLink =
        safeQuery('a[href*="/task/"]', container || document) || null;
      const taskHref = taskLink?.getAttribute('href') || taskLink?.href || '';
      let problemId = taskHref.match(/\/task\/(\d+)/i)?.[1] || null;

      let problemUrl = null;
      if (taskHref) {
        try {
          problemUrl = new URL(taskHref, window.location.href).toString();
        } catch {
          problemUrl = null;
        }
      }
      if (!problemUrl && problemId) {
        problemUrl = `https://cses.fi/problemset/task/${problemId}`;
      }

      if (!problemId) {
        const taskMatch = window.location.pathname.match(
          /\/problemset\/task\/(\d+)/i
        );
        if (taskMatch?.[1]) {
          problemId = taskMatch[1];
        }
      }

      if (!problemUrl && problemId) {
        problemUrl = `https://cses.fi/problemset/task/${problemId}`;
      }

      const blockText = extractText(container || link);
      const verdictText = firstNonEmpty(
        safeQuery(
          '[class*="status"], [class*="result"]',
          container || link
        )?.getAttribute('title'),
        extractText(
          safeQuery('[class*="status"], [class*="result"]', container || link)
        ),
        blockText
      );

      const languageText =
        blockText.match(
          /\b(C\+\+|C#|JavaScript|TypeScript|Python|PyPy|Java|Rust|Go|Kotlin|Swift|Haskell)\b/i
        )?.[1] || 'Unknown';
      const timeText =
        blockText.match(/([0-9]*\.?[0-9]+\s*(?:ms|s|sec|seconds?))/i)?.[1] ||
        '';
      const memoryText =
        blockText.match(/([0-9]*\.?[0-9]+\s*(?:kb|mb|gb|b))/i)?.[1] || '';

      const problemName =
        extractText(taskLink) || firstNonEmpty(extractText('h1'), extractText('h2'), problemId);

      return {
        platform: this.platform,
        handle: fallbackHandle || null,
        problemId,
        problemName,
        problemUrl,
        submissionId,
        submissionUrl,
        verdict: normalizeVerdict(verdictText || 'UNKNOWN'),
        language: languageText,
        executionTime: parseDurationToMs(timeText),
        memoryUsed: parseMemoryToKb(memoryText),
        submittedAt: null,
        sourceCode: null,
        problem_id: problemId,
        problem_name: problemName,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        submitted_at: null,
        source_code: null,
        execution_time_ms: parseDurationToMs(timeText),
        memory_kb: parseMemoryToKb(memoryText),
      };
    }

    hasSolvedTaskSignal(scoreElement, taskNode) {
      if (!taskNode) {
        return false;
      }

      const scoreClassText = String(
        scoreElement?.className || ''
      ).toLowerCase();
      const taskClassText = String(taskNode.className || '').toLowerCase();
      const classTokens = [
        ...scoreClassText.split(/[^a-z0-9_-]+/),
        ...taskClassText.split(/[^a-z0-9_-]+/),
      ].filter(Boolean);

      const strongClassTokenSet = new Set([
        'solved',
        'accepted',
        'ac',
        'correct',
        'complete',
        'completed',
        'done',
        'success',
        'full',
        'passed',
      ]);

      for (const token of classTokens) {
        if (strongClassTokenSet.has(token)) {
          return true;
        }

        if (
          /^(?:task|status|score)[_-]?(?:solved|accepted|ac|done|full|complete|success)$/.test(
            token
          ) ||
          /^(?:solved|accepted|complete|success|done)[_-]?(?:task|status|score)$/.test(
            token
          )
        ) {
          return true;
        }
      }

      const signalTexts = [
        scoreElement?.getAttribute('title'),
        scoreElement?.getAttribute('aria-label'),
        scoreElement?.getAttribute('data-title'),
        scoreElement?.getAttribute('data-tooltip'),
        scoreElement?.getAttribute('data-status'),
        scoreElement?.dataset?.status,
        scoreElement?.dataset?.state,
        taskNode.getAttribute('title'),
      ]
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean);

      if (
        signalTexts.some((text) =>
          /(solved|accepted|\bac\b|correct|complete(?:d)?|done|passed?|100\s*%)/i.test(
            text
          )
        )
      ) {
        return true;
      }

      const numericScoreValues = [
        scoreElement?.getAttribute('data-score'),
        scoreElement?.dataset?.score,
        scoreElement?.getAttribute('data-progress'),
        scoreElement?.dataset?.progress,
      ];

      for (const value of numericScoreValues) {
        if (value == null || value === '') continue;
        const parsed = Number.parseFloat(String(value));
        if (Number.isFinite(parsed) && parsed > 0) {
          return true;
        }
      }

      if (scoreElement && /score/.test(scoreClassText)) {
        try {
          const style = window.getComputedStyle(scoreElement);
          if (
            isGreenishRgb(style?.color || '') ||
            isGreenishRgb(style?.backgroundColor || '')
          ) {
            return true;
          }
        } catch {
          // Ignore style-based fallback errors.
        }
      }

      return false;
    }

    extractResultLinksFromTaskPage() {
      // On /problemset/task/<id>, CSES shows a "Your submissions" table
      // with links like /problemset/result/<id>/
      const resultLinks = safeQueryAll('a[href*="/problemset/result/"]');
      const seen = new Set();
      const results = [];

      for (const link of resultLinks) {
        const href = link.getAttribute('href') || link.href || '';
        const submissionId = href.match(/\/problemset\/result\/(\d+)/i)?.[1];
        if (!submissionId || seen.has(submissionId)) continue;
        seen.add(submissionId);

        let submissionUrl = null;
        try {
          submissionUrl = new URL(href, window.location.href).toString();
        } catch {
          submissionUrl = `https://cses.fi/problemset/result/${submissionId}/`;
        }

        // Extract verdict from the same row if possible
        const row = link.closest('tr');
        let verdict = null;
        let language = null;
        let submittedAt = null;

        if (row) {
          const cells = safeQueryAll('td', row);
          const rowText = extractText(row);

          // Look for verdict text in cells
          for (const cell of cells) {
            const cellText = normalizeWhitespace(cell.textContent || '');
            const cellClass = String(cell.className || '').toLowerCase();
            if (
              /accepted|wrong answer|time limit|memory limit|runtime error|compile|pending/i.test(cellText) ||
              /verdict|result|status/i.test(cellClass)
            ) {
              verdict = cellText;
              break;
            }
          }

          // Try to get timestamp
          const timeEl = safeQuery('time[datetime]', row);
          if (timeEl) submittedAt = timeEl.getAttribute('datetime') || null;
          if (!submittedAt) {
            for (const cell of cells) {
              const t = normalizeWhitespace(cell.textContent || '');
              if (/\d{4}/.test(t)) { submittedAt = t; break; }
            }
          }

          // Try language
          for (const cell of cells) {
            const t = normalizeWhitespace(cell.textContent || '');
            if (/\b(C\+\+|C#|Python|Java|Rust|Go|Haskell|JavaScript|Pascal|Ruby|Kotlin|Swift|PHP)\b/i.test(t)) {
              language = t;
              break;
            }
          }
        }

        results.push({ submissionId, submissionUrl, verdict, language, submittedAt });
      }

      return results;
    }

    extractAttemptedProblemsFromList() {
      const taskItems = safeQueryAll('li.task, .task-list li.task');
      if (taskItems.length === 0) return [];

      const attempted = [];
      const seen = new Set();

      for (const item of taskItems) {
        const taskLink = safeQuery('a[href*="/problemset/task/"]', item);
        if (!taskLink) continue;

        const taskHref = taskLink.getAttribute('href') || taskLink.href || '';
        const problemId = taskHref.match(/\/problemset\/task\/(\d+)/i)?.[1];
        if (!problemId || seen.has(problemId)) continue;

        // CSES task-score classes:
        //   "task-score icon full"  → AC (full score)
        //   "task-score icon zero"  → attempted but no AC
        //   no .task-score element  → never attempted (skip)
        const scoreElement = safeQuery('.task-score', item);
        if (!scoreElement) continue;

        const cls = String(scoreElement.className || '');
        const isAttempted = cls.includes('full') || cls.includes('zero');
        if (!isAttempted) continue;

        seen.add(problemId);
        const problemName = extractText(taskLink) || problemId;
        let problemUrl = null;
        try {
          problemUrl = new URL(taskHref, window.location.href).toString();
        } catch {
          problemUrl = `https://cses.fi/problemset/task/${problemId}`;
        }
        attempted.push({ problemId, problemName, problemUrl });
      }

      return attempted;
    }

    extractSolvedTaskSubmissions(options = {}, fallbackHandle = null) {
      const taskItems = safeQueryAll('li.task, .task-list li.task');
      if (taskItems.length === 0) {
        return [];
      }

      const expectedHandleValues = Array.isArray(options?.expectedHandles)
        ? options.expectedHandles
        : [options?.expectedHandle];
      const preferredHandleToken =
        expectedHandleValues.map(normalizeHandleToken).find(Boolean) ||
        normalizeHandleToken(fallbackHandle) ||
        normalizeHandleToken(this.collectDetectedHandles()[0]) ||
        'user';

      const handleForSubmission =
        fallbackHandle ||
        expectedHandleValues.find((value) => normalizeHandleToken(value)) ||
        this.collectDetectedHandles()[0] ||
        preferredHandleToken;

      const synthesized = [];
      const seenProblemIds = new Set();

      for (const item of taskItems) {
        const taskLink = safeQuery('a[href*="/problemset/task/"]', item);
        if (!taskLink) continue;

        const taskHref = taskLink.getAttribute('href') || taskLink.href || '';
        const problemId = taskHref.match(/\/problemset\/task\/(\d+)/i)?.[1];
        if (!problemId || seenProblemIds.has(problemId)) {
          continue;
        }

        const scoreElement =
          safeQuery('.task-score', item) ||
          safeQuery('[class*="task-score"]', item) ||
          safeQuery('[class*="score"]', item);

        if (!this.hasSolvedTaskSignal(scoreElement, item)) {
          continue;
        }

        let problemUrl = null;
        try {
          problemUrl = new URL(taskHref, window.location.href).toString();
        } catch {
          problemUrl = null;
        }
        if (!problemUrl) {
          problemUrl = `https://cses.fi/problemset/task/${problemId}`;
        }

        const problemName = extractText(taskLink) || problemId;
        const submissionId = `cses_profile_${preferredHandleToken}_${problemId}`;

        synthesized.push({
          platform: this.platform,
          handle: handleForSubmission,
          problemId,
          problemName,
          problemUrl,
          submissionId,
          submissionUrl: null,
          verdict: 'AC',
          language: 'Unknown',
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode: null,
          problem_id: problemId,
          problem_name: problemName,
          problem_url: problemUrl,
          submission_id: submissionId,
          submission_url: null,
          submitted_at: null,
          source_code: null,
          execution_time_ms: null,
          memory_kb: null,
          synthetic_submission: true,
          syntheticSubmission: true,
        });

        seenProblemIds.add(problemId);
      }

      return synthesized;
    }

    async extractSubmissions(options = {}) {
      const pageType = this.detectPageType();

      if (pageType === 'profile') {
        await waitForElement(
          'li.task, .task-list li.task, a[href*="/problemset/task/"]',
          4500
        ).catch(() => null);
        const handle = await this.getUserHandle();
        return this.extractSolvedTaskSubmissions(options, handle);
      }

      if (pageType !== 'submissions') {
        return [];
      }

      await waitForElement(
        'table, a[href*="/result/"], .task-list a[href*="/problemset/task/"], a[href*="/problemset/task/"]',
        4500
      ).catch(() => null);

      const resultLinks = safeQueryAll('a[href*="/result/"]');
      const taskLinks = safeQueryAll('a[href*="/problemset/task/"]');

      const table = this.findSubmissionsTable();
      let normalizedRows = [];
      let columns = {
        id: 0,
        task: 1,
        status: 2,
        language: 3,
        time: 4,
        memory: 5,
        date: null,
        user: null,
      };

      if (table) {
        const rows = safeQueryAll('tbody tr', table);
        normalizedRows =
          rows.length > 0
            ? rows
            : safeQueryAll('tr', table).filter(
                (row) => safeQueryAll('td', row).length >= 2
              );
        columns = this.extractHeaderMap(table);
      } else {
        const linkRows = safeQueryAll('a[href*="/result/"]')
          .map((link) => link.closest('tr'))
          .filter((row) => row && safeQueryAll('td', row).length >= 2);

        const seenRows = new Set();
        normalizedRows = [];
        for (const row of linkRows) {
          if (seenRows.has(row)) continue;
          seenRows.add(row);
          normalizedRows.push(row);
        }
      }

      if (
        normalizedRows.length === 0 &&
        resultLinks.length === 0 &&
        taskLinks.length === 0
      ) {
        return [];
      }

      const fallbackHandle = await this.getUserHandle();
      const expectedHandleValues = Array.isArray(options?.expectedHandles)
        ? options.expectedHandles
        : [options?.expectedHandle];
      const expectedHandles = [
        ...new Set(
          expectedHandleValues.map(normalizeHandleToken).filter(Boolean)
        ),
      ];
      const shouldFilterByHandle = options?.filterByHandle !== false;
      const isUserScopedStatusPage = (() => {
        try {
          const parsed = new URL(window.location.href);
          const scopedUser = normalizeHandleToken(
            parsed.searchParams.get('user')
          );
          return Boolean(scopedUser && expectedHandles.includes(scopedUser));
        } catch {
          return false;
        }
      })();
      const expectedIncludesNumericHandle = expectedHandles.some((value) =>
        /^\d+$/.test(value)
      );

      const shouldKeepSubmissionForHandle = (submissionHandle) => {
        if (!shouldFilterByHandle || expectedHandles.length === 0) {
          return true;
        }

        const normalizedSubmissionHandle =
          normalizeHandleToken(submissionHandle);
        if (!normalizedSubmissionHandle) {
          return true;
        }

        if (expectedHandles.includes(normalizedSubmissionHandle)) {
          return true;
        }

        // CSES status pages filtered by numeric user id can still render username
        // handles in rows. Allow them on this scoped page only.
        if (
          isUserScopedStatusPage &&
          expectedIncludesNumericHandle &&
          !/^\d+$/.test(normalizedSubmissionHandle)
        ) {
          return true;
        }

        return false;
      };

      const submissions = [];
      const seenSubmissionIds = new Set();

      for (const row of normalizedRows) {
        const submission = this.extractSubmissionFromRow(
          row,
          columns,
          fallbackHandle
        );
        if (!submission?.submissionId) continue;

        if (!shouldKeepSubmissionForHandle(submission.handle)) {
          continue;
        }

        if (seenSubmissionIds.has(submission.submissionId)) {
          continue;
        }

        seenSubmissionIds.add(submission.submissionId);
        submissions.push(submission);
      }

      if (submissions.length === 0) {
        for (const link of resultLinks) {
          const submission = this.extractSubmissionFromResultLink(
            link,
            fallbackHandle
          );
          if (!submission?.submissionId) continue;

          if (!shouldKeepSubmissionForHandle(submission.handle)) {
            continue;
          }

          if (seenSubmissionIds.has(submission.submissionId)) {
            continue;
          }

          seenSubmissionIds.add(submission.submissionId);
          submissions.push(submission);
        }
      }

      // Do not synthesize profile-based submissions here; imports should only
      // contain real CSES submissions with numeric IDs and real timestamps.

      submissions.sort((a, b) => {
        const aId = String(a?.submissionId || '');
        const bId = String(b?.submissionId || '');
        const aNumeric = /^\d+$/.test(aId) ? Number(aId) : null;
        const bNumeric = /^\d+$/.test(bId) ? Number(bId) : null;

        if (aNumeric !== null && bNumeric !== null) {
          return bNumeric - aNumeric;
        }
        if (aNumeric !== null) return -1;
        if (bNumeric !== null) return 1;
        return bId.localeCompare(aId);
      });
      return submissions;
    }

    getCurrentPageNumber() {
      try {
        const parsed = new URL(window.location.href);
        const fromQuery = Number.parseInt(parsed.searchParams.get('page'), 10);
        if (Number.isFinite(fromQuery) && fromQuery > 0) {
          return fromQuery;
        }
      } catch {
        // no-op
      }
      return 1;
    }

    isSubmissionsListingUrl(url) {
      try {
        const parsed = new URL(url, window.location.href);
        return /\/(problemset\/(list|status|submissions?)|problemset\/task\/\d+\/(results?|submissions?)|user\/|submissions?\b|status\b)/i.test(
          parsed.pathname
        );
      } catch {
        return false;
      }
    }

    discoverSubmissionsListingUrls(limit = 8) {
      const links = safeQueryAll('a[href]')
        .map((anchor) => {
          const rawHref = String(anchor.getAttribute('href') || '').trim();
          if (!rawHref || rawHref.startsWith('#')) return null;
          if (/^javascript:/i.test(rawHref)) return null;

          let absolute;
          try {
            absolute = new URL(rawHref, window.location.href).toString();
          } catch {
            return null;
          }

          let parsed;
          try {
            parsed = new URL(absolute);
          } catch {
            return null;
          }

          const host = String(parsed.hostname || '').replace(/^www\./, '');
          if (host !== 'cses.fi') return null;

          const path = String(parsed.pathname || '').toLowerCase();
          const text = extractText(anchor).toLowerCase();
          const isTaskResultsLike = /\/problemset\/task\/\d+\/(results?|submissions?)/i.test(
            path
          );

          // Skip obvious non-listing pages.
          if (path.includes('/login') || path.includes('/register') || path.includes('/reset')) {
            return null;
          }
          if (path.includes('/darkmode')) return null;
          if (/\/result\/\d+/i.test(path)) return null;
          if (/\/task\/\d+/i.test(path) && !isTaskResultsLike) return null;

          let score = 0;
          if (/\/problemset\//i.test(path)) score += 3;

          if (/\bsubmissions?\b/.test(path)) score += 18;
          if (/\bstatus\b/.test(path)) score += 18;
          if (isTaskResultsLike) score += 16;
          if (text.includes('submissions')) score += 10;
          if (text.includes('status')) score += 10;
          if (text.includes('results')) score += 8;
          if (text.includes('my')) score += 3;

          // Prefer URLs that look like listing pages (pagination often uses ?page=).
          if (parsed.searchParams.has('page')) score += 2;

          if (score <= 0) return null;

          return { url: absolute, score };
        })
        .filter(Boolean);

      const bestByUrl = new Map();
      for (const entry of links) {
        const prev = bestByUrl.get(entry.url);
        if (!prev || entry.score > prev.score) {
          bestByUrl.set(entry.url, entry);
        }
      }

      return Array.from(bestByUrl.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(0, Number(limit) || 0))
        .map((entry) => entry.url);
    }

    extractNextPageUrl() {
      const currentUrl = window.location.href;
      const currentPage = this.getCurrentPageNumber();
      const links = safeQueryAll('a[href]').filter((anchor) => {
        const href = String(anchor.getAttribute('href') || '').trim();
        if (!href || href.startsWith('#') || /^javascript:/i.test(href)) {
          return false;
        }
        return true;
      });

      let best = null;
      let bestPage = Number.POSITIVE_INFINITY;

      for (const anchor of links) {
        const href = String(anchor.getAttribute('href') || '').trim();
        let absolute;
        try {
          absolute = new URL(href, currentUrl).toString();
        } catch {
          continue;
        }

        if (!this.isSubmissionsListingUrl(absolute)) continue;
        if (absolute === currentUrl) continue;

        const text = extractText(anchor).toLowerCase();
        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();
        const isNextLike =
          rel.includes('next') ||
          /(^|\s)(next|newer|>>|›|»)(\s|$)/i.test(text) ||
          /next/i.test(title);

        let candidatePage = Number.POSITIVE_INFINITY;
        try {
          const parsed = new URL(absolute);
          const page = Number.parseInt(parsed.searchParams.get('page'), 10);
          if (Number.isFinite(page) && page > currentPage) {
            candidatePage = page;
          }
        } catch {
          // no-op
        }

        if (isNextLike && best === null) {
          best = absolute;
        }

        if (Number.isFinite(candidatePage) && candidatePage < bestPage) {
          bestPage = candidatePage;
          best = absolute;
        }
      }

      return best;
    }

    isSubmissionsPageReady() {
      if (this.findSubmissionsTable()) {
        return true;
      }

      if (this.detectPageType() !== 'submissions') {
        return false;
      }

      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) return false;

      if (bodyText.includes('loading')) return false;
      // If we reached a known CSES submissions route and DOM is stable,
      // allow extraction attempt even when table shape differs.
      return true;
    }

    isLikelyLoginRequired() {
      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) return false;

      const hasUserAnchor = Boolean(safeQuery('a[href^="/user/"]'));
      const hasLogoutSignal =
        bodyText.includes('log out') || bodyText.includes('logout');
      const hasExplicitLoginGate =
        bodyText.includes('please log in') ||
        bodyText.includes('you must be logged in') ||
        bodyText.includes('sign in to continue') ||
        bodyText.includes('log in to continue');

      return hasExplicitLoginGate && !hasUserAnchor && !hasLogoutSignal;
    }

    extractProblemDetails() {
      const pathMatch = window.location.pathname.match(
        /\/problemset\/task\/(\d+)/i
      );
      const problemId = pathMatch?.[1] || null;
      const problemName = firstNonEmpty(extractText('h1'), extractText('h2'));

      const root =
        safeQuery('.content') ||
        safeQuery('main') ||
        safeQuery('article') ||
        document.body;
      const rawText = String(root?.innerText || '')
        .replace(/\u00A0/g, ' ')
        .trim();
      const normalizedText = rawText
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n');

      const inputFormat = extractLabeledSection(normalizedText, [
        'Input',
        'Input Format',
      ]);
      const outputFormat = extractLabeledSection(normalizedText, [
        'Output',
        'Output Format',
      ]);
      const constraints = extractLabeledSection(normalizedText, [
        'Constraints',
      ]);
      const notes = extractLabeledSection(normalizedText, [
        'Notes',
        'Explanation',
      ]);
      const examples = parseSampleTests(normalizedText);

      const description = firstNonEmpty(
        normalizedText,
        extractText('.content p')
      );

      return {
        problemId,
        problemName,
        problemUrl: problemId
          ? `https://cses.fi/problemset/task/${problemId}`
          : window.location.href,
        description: description || null,
        inputFormat: inputFormat || null,
        outputFormat: outputFormat || null,
        constraints: constraints || null,
        examples,
        notes: notes || null,
      };
    }

    hasMeaningfulProblemDetails(details) {
      if (!details || typeof details !== 'object') return false;

      const hasDescription =
        typeof details.description === 'string' &&
        details.description.trim().length >= 20;
      const hasInputOutput =
        typeof details.inputFormat === 'string' &&
        details.inputFormat.trim().length > 0 &&
        typeof details.outputFormat === 'string' &&
        details.outputFormat.trim().length > 0;
      const hasExamples =
        Array.isArray(details.examples) && details.examples.length > 0;
      const hasConstraints =
        typeof details.constraints === 'string' &&
        details.constraints.trim().length > 0;

      return hasDescription || hasInputOutput || hasExamples || hasConstraints;
    }

    async handleExtractSubmissionsMessage(request, sendResponse) {
      try {
        if (this.isLikelyLoginRequired()) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'CSES login required',
          });
          return;
        }

        const pageType = this.detectPageType();
        if (pageType !== 'submissions' && pageType !== 'profile') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on CSES submissions list or profile page',
          });
          return;
        }

        if (pageType === 'submissions' && !this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'CSES submissions page still loading',
          });
          return;
        }

        const submissions = await this.extractSubmissions({
          expectedHandle: request?.handle,
          expectedHandles: request?.options?.expectedHandles,
          filterByHandle: request?.options?.filterByHandle !== false,
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
              detectedHandles: this.collectDetectedHandles(),
            },
            error: null,
          });
          return;
        }

        sendResponse({ success: true, data: submissions, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract CSES submissions',
        });
      }
    }

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        const pageType = this.detectPageType();

        if (pageType === 'submission') {
          const submission =
            await this.extractSubmissionFromResultPage(request);
          if (!submission) {
            sendResponse({
              success: false,
              error: 'Could not extract CSES submission details',
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
          const requiresSourceCode = request?.requireSourceCode === true;

          if (requiresSourceCode && !sourceCode) {
            sendResponse({
              success: false,
              pending: true,
              data: submission,
              error: 'CSES source code not ready yet',
            });
            return;
          }

          this.extractionResult = submission;
          this.extractionComplete = Boolean(sourceCode);
          sendResponse({ success: true, data: submission, error: null });
          return;
        }

        if (pageType === 'submissions') {
          const submissions = await this.extractSubmissions({
            expectedHandle: request?.handle,
            filterByHandle: false,
          });

          const requestId = String(request?.submissionId || '').trim();
          const selected =
            submissions.find(
              (item) => String(item.submissionId) === requestId
            ) ||
            submissions[0] ||
            null;

          if (!selected) {
            sendResponse({
              success: false,
              error: 'No CSES submission rows found on current page',
            });
            return;
          }

          sendResponse({ success: true, data: selected, error: null });
          return;
        }

        sendResponse({
          success: false,
          nonRetriable: true,
          error: `Unsupported page type for CSES submission extraction: ${pageType}`,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract CSES submission',
        });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'problem') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on CSES problem page yet',
          });
          return;
        }

        await waitForElement('body', 3500).catch(() => null);

        const details = this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'CSES problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract CSES problem details',
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

          if (request?.action === 'discoverSubmissionsListing') {
            try {
              const candidates = this.discoverSubmissionsListingUrls(
                request?.limit
              );
              sendResponse({
                success: true,
                data: {
                  candidates,
                  currentUrl: window.location.href,
                  pageType: this.detectPageType(),
                },
                error: null,
              });
            } catch (error) {
              sendResponse({
                success: false,
                error:
                  error?.message ||
                  'Failed to discover CSES submissions listing links',
              });
            }
            return true;
          }

          if (request?.action === 'extractResultLinks') {
            try {
              const pageType = this.detectPageType();
              if (pageType !== 'problem') {
                sendResponse({ success: false, pending: true, error: 'Not on CSES task page yet' });
                return true;
              }
              const bodyText = String(document.body?.innerText || '').toLowerCase();
              if (!bodyText || bodyText.includes('loading')) {
                sendResponse({ success: false, pending: true, error: 'Task page still loading' });
                return true;
              }
              const links = this.extractResultLinksFromTaskPage();
              const problemId = window.location.pathname.match(/\/problemset\/task\/(\d+)/i)?.[1] || null;
              const problemName = firstNonEmpty(extractText('h1'), extractText('h2')) || problemId;
              sendResponse({ success: true, data: { links, problemId, problemName }, error: null });
            } catch (error) {
              sendResponse({ success: false, error: error?.message || 'Failed to extract result links' });
            }
            return true;
          }

          if (request?.action === 'extractAttemptedProblems') {
            try {
              const pageType = this.detectPageType();
              if (pageType !== 'list') {
                sendResponse({
                  success: false,
                  pending: true,
                  error: 'Not on CSES problemset list page yet',
                });
                return true;
              }
              const bodyText = String(document.body?.innerText || '').toLowerCase();
              if (!bodyText || bodyText.includes('loading')) {
                sendResponse({
                  success: false,
                  pending: true,
                  error: 'CSES list page still loading',
                });
                return true;
              }
              const problems = this.extractAttemptedProblemsFromList();
              sendResponse({ success: true, data: problems, error: null });
            } catch (error) {
              sendResponse({
                success: false,
                error: error?.message || 'Failed to extract attempted problems',
              });
            }
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

      const validSubmissions = submissions.filter((item) => item?.submissionId);
      if (validSubmissions.length === 0) return;

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

        validSubmissions.forEach((submission) => {
          existingById.set(String(submission.submissionId), submission);
        });

        const merged = Array.from(existingById.values())
          .sort((a, b) => Number(b.submissionId) - Number(a.submissionId))
          .slice(0, 300);

        cached[this.platform] = merged;
        browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
          validSubmissions.forEach((submission) =>
            this.autoSyncIfEnabled(submission)
          );
        });
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI?.storage?.sync || !browserAPI?.runtime) return;
      if (!submission || !submission.submissionId) return;

      browserAPI.storage.sync.get(
        ['autoFetchEnabled', 'extensionToken'],
        (result) => {
          if (result.autoFetchEnabled && result.extensionToken) {
            browserAPI.runtime.sendMessage(
              { action: 'syncSubmission', submission },
              () => {}
            );
          }
        }
      );
    }

    async init() {
      if (this.initialized) return;

      this.setupMessageListener();

      const pageType = this.detectPageType();
      log(
        'Content script ready on',
        window.location.href,
        'pageType=',
        pageType
      );

      if (pageType === 'submission') {
        const submission = await this.extractSubmissionFromResultPage({});
        if (submission) {
          this.storeSubmissions([submission]);
        }
      }

      this.initialized = true;
    }
  }

  function initExtractor() {
    const extractor = new CSESExtractor();
    extractor.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
