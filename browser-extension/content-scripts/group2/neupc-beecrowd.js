/**
 * NEUPC Beecrowd Extractor (Standalone)
 * Supports:
 * - Single submission extraction from run pages
 * - Fallback extraction from runs list pages
 * - Runtime message-based extraction
 */

(function () {
  'use strict';

  if (window.__NEUPC_BEECROWD_INJECTED__) {
    return;
  }
  window.__NEUPC_BEECROWD_INJECTED__ = true;

  const PLATFORM = 'beecrowd';
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
    const element =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;

    if (!element) return '';
    return normalizeWhitespace(element.textContent || element.innerText || '');
  }

  function extractMultilineText(selectorOrElement, context = document) {
    const element =
      typeof selectorOrElement === 'string'
        ? safeQuery(selectorOrElement, context)
        : selectorOrElement;

    if (!element) return '';

    const raw = String(element.innerText || element.textContent || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\r/g, '');

    return raw
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const text = normalizeWhitespace(value);
      if (text) return text;
    }
    return null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        reject(new Error('Timeout waiting for selector'));
      }, timeout);
    });
  }

  function toAbsoluteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
      return new URL(raw, window.location.href).toString();
    } catch {
      return null;
    }
  }

  function extractSubmissionIdFromValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const pathMatch = raw.match(/\/runs\/(?:code\/)?(\d+)/i);
    if (pathMatch?.[1]) return pathMatch[1];

    const numberMatch = raw.match(/\b(\d{4,})\b/);
    return numberMatch?.[1] || null;
  }

  function extractProblemIdFromValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let pathname = raw;
    try {
      pathname = new URL(raw, window.location.href).pathname || raw;
    } catch {
      // Keep raw string fallback for partial paths/snippets.
    }

    const explicitMatch = pathname.match(
      /\/problems\/(?:view\/|fullscreen\/)?(\d+)(?:[/?#]|$)/i
    );
    if (explicitMatch?.[1]) {
      return explicitMatch[1];
    }

    return null;
  }

  function buildCanonicalProblemUrl(problemId) {
    const normalized = String(problemId || '').trim();
    if (!/^\d+$/.test(normalized)) {
      return null;
    }

    return `https://judge.beecrowd.com/en/problems/view/${encodeURIComponent(
      normalized
    )}`;
  }

  function normalizeHandleToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let normalized = raw.replace(/^@+/, '');
    normalized = normalized.replace(
      /^(?:https?:\/\/)?(?:www\.)?(?:beecrowd\.com\.br|judge\.beecrowd\.com|urionlinejudge\.com\.br)\//i,
      ''
    );
    normalized = normalized.replace(/^judge\/[a-z]{2}\//i, '');
    normalized = normalized.replace(/^[a-z]{2}\//i, '');
    normalized = normalized.replace(/^(?:profile|users?)\//i, '');
    normalized = normalized.split(/[/?#]/)[0].replace(/^@+/, '').trim();

    return normalized.toLowerCase();
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
        : '(?:Input(?:\\s+Format)?|Output(?:\\s+Format)?|Constraints?|Sample\\s+Input|Sample\\s+Output|Examples?|Explanation|Entrad[ao]|Sa[íi]da|Restri(?:ç|c)[õo]es?)';

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
    const normalized = String(text || '').replace(/\r/g, '');
    if (!normalized) return [];

    const tests = [];
    const regex =
      /(?:Sample\s+Input|Entrada(?:\s+Exemplo)?)\s*:?([\s\S]*?)\n\s*(?:Sample\s+Output|Sa[íi]da(?:\s+Exemplo)?)\s*:?([\s\S]*?)(?=\n\s*(?:Sample\s+Input|Entrada(?:\s+Exemplo)?|Explanation|Examples?|Restri(?:ç|c)[õo]es?|$))/gi;

    let match;
    while ((match = regex.exec(normalized)) != null && tests.length < 8) {
      const input = String(match[1] || '').trim();
      const output = String(match[2] || '').trim();
      if (!input && !output) continue;
      tests.push({ input, output });
    }

    return tests;
  }

  function parseSampleTestsFromTables(context = document) {
    const root = context || document;
    const tests = [];
    const seen = new Set();
    const tables = safeQueryAll('table', root);

    for (const table of tables) {
      const headerText = normalizeWhitespace(
        extractText('thead', table)
      ).toLowerCase();
      const looksLikeSampleTable =
        /(input samples?|sample input|entrada)/i.test(headerText) ||
        /(output samples?|sample output|sa[íi]da)/i.test(headerText);

      const bodyRows = safeQueryAll('tbody tr', table);
      const rows = bodyRows.length > 0 ? bodyRows : safeQueryAll('tr', table);

      for (const row of rows) {
        const cells = safeQueryAll('td', row);
        if (cells.length < 2) {
          continue;
        }

        const input = String(cells[0].innerText || cells[0].textContent || '')
          .replace(/\u00A0/g, ' ')
          .replace(/\r/g, '')
          .trim();
        const output = String(cells[1].innerText || cells[1].textContent || '')
          .replace(/\u00A0/g, ' ')
          .replace(/\r/g, '')
          .trim();

        if (!input && !output) {
          continue;
        }

        if (!looksLikeSampleTable && input.length + output.length < 3) {
          continue;
        }

        const key = `${input}\u0000${output}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        tests.push({ input, output });

        if (tests.length >= 8) {
          return tests;
        }
      }
    }

    return tests;
  }

  function normalizeVerdict(verdictRaw) {
    const base = String(verdictRaw || '').trim();
    if (!base) return 'UNKNOWN';

    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (
      normalized.includes('ACCEPTED') ||
      normalized.includes('ACEITO') ||
      normalized === 'AC'
    ) {
      return 'AC';
    }
    if (
      normalized.includes('WRONG ANSWER') ||
      normalized.includes('RESPOSTA ERRADA') ||
      normalized === 'WA'
    ) {
      return 'WA';
    }
    if (
      normalized.includes('TIME LIMIT') ||
      normalized.includes('TEMPO LIMITE') ||
      normalized === 'TLE'
    ) {
      return 'TLE';
    }
    if (
      normalized.includes('MEMORY LIMIT') ||
      normalized.includes('LIMITE DE MEMORIA') ||
      normalized === 'MLE'
    ) {
      return 'MLE';
    }
    if (
      normalized.includes('RUNTIME ERROR') ||
      normalized.includes('ERRO DE EXECUCAO') ||
      normalized === 'RE'
    ) {
      return 'RE';
    }
    if (
      normalized.includes('COMPILATION ERROR') ||
      normalized.includes('ERRO DE COMPILACAO') ||
      normalized === 'CE'
    ) {
      return 'CE';
    }
    if (normalized.includes('PRESENTATION ERROR') || normalized === 'PE') {
      return 'PE';
    }
    if (
      normalized.includes('PENDING') ||
      normalized.includes('RUNNING') ||
      normalized.includes('QUEUE') ||
      normalized.includes('PROCESSING') ||
      normalized.includes('JULG')
    ) {
      return 'PENDING';
    }

    return normalized || 'UNKNOWN';
  }

  // Map beecrowd answer class (a-1..a-9) to verdict code, language-independent
  function verdictFromAnswerClass(element) {
    if (!element) return null;
    const cls = String(element.className || '');
    if (/\ba-1\b/.test(cls)) return 'AC';
    if (/\ba-2\b/.test(cls)) return 'PE';
    if (/\ba-3\b/.test(cls)) return 'TLE';
    if (/\ba-4\b/.test(cls)) return 'MLE';
    if (/\ba-5\b/.test(cls)) return 'PE';
    if (/\ba-6\b/.test(cls)) return 'WA';
    if (/\ba-7\b/.test(cls)) return 'RE';
    if (/\ba-8\b/.test(cls)) return 'CE';
    if (/\ba-9\b/.test(cls)) return 'CE';
    return null;
  }

  function parseDurationToMs(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?)?/
    );
    if (!match) return null;

    const amount = Number.parseFloat(String(match[1]).replace(',', '.'));
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || '').toLowerCase();
    if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
      return Math.round(amount);
    }
    if (unit === 'm' || unit.startsWith('min')) {
      return Math.round(amount * 60 * 1000);
    }
    if (unit.startsWith('s') || unit.startsWith('sec')) {
      return Math.round(amount * 1000);
    }

    if (amount <= 60) {
      return Math.round(amount * 1000);
    }

    return Math.round(amount);
  }

  function parseMemoryToKb(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(kb|kib|mb|mib|gb|gib|b)?/
    );
    if (!match) return null;

    const amount = Number.parseFloat(String(match[1]).replace(',', '.'));
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || 'kb').toLowerCase();
    if (unit === 'gb' || unit === 'gib')
      return Math.round(amount * 1024 * 1024);
    if (unit === 'mb' || unit === 'mib') return Math.round(amount * 1024);
    if (unit === 'kb' || unit === 'kib') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return Math.round(amount);
  }

  function parseTimeLimitToMs(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?|m|min|minute(?:s)?)/
    );
    if (!match) return null;

    const amount = Number.parseFloat(String(match[1]).replace(',', '.'));
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || '').toLowerCase();
    if (unit.startsWith('ms') || unit.startsWith('millisecond')) {
      return Math.round(amount);
    }
    if (unit === 'm' || unit.startsWith('min')) {
      return Math.round(amount * 60 * 1000);
    }
    if (unit.startsWith('s') || unit.startsWith('sec')) {
      return Math.round(amount * 1000);
    }

    return null;
  }

  function parseTimestampToIso(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      if (text.length < 10) return null;

      const n = Number.parseInt(text, 10);
      if (!Number.isFinite(n) || n <= 0) return null;

      const millis =
        text.length >= 13 ? n : text.length >= 10 ? n * 1000 : null;
      if (!Number.isFinite(millis)) return null;

      const date = new Date(millis);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
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
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (dmyMatch) {
      const day = Number.parseInt(dmyMatch[1], 10);
      const month = Number.parseInt(dmyMatch[2], 10);
      const yearRaw = Number.parseInt(dmyMatch[3], 10);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
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

    // Handle "M/D/YY, H:MM AM/PM" (beecrowd locale date format)
    const mdyAmPmMatch = text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );
    if (mdyAmPmMatch) {
      const month = Number.parseInt(mdyAmPmMatch[1], 10);
      const day = Number.parseInt(mdyAmPmMatch[2], 10);
      const yearRaw = Number.parseInt(mdyAmPmMatch[3], 10);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      let hour = Number.parseInt(mdyAmPmMatch[4], 10);
      const minute = Number.parseInt(mdyAmPmMatch[5], 10);
      const second = Number.parseInt(mdyAmPmMatch[6] || '0', 10);
      const ampm = (mdyAmPmMatch[7] || '').toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const millis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
      if (Number.isFinite(millis)) {
        const dt = new Date(millis);
        if (Number.isFinite(dt.getTime())) return dt.toISOString();
      }
    }

    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
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
    if (text.length < 20) return false;

    const patterns = [
      /#include\s*</,
      /\bint\s+main\s*\(/,
      /\bpublic\s+static\s+void\s+main\b/,
      /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/,
      /\bclass\s+[A-Za-z_][A-Za-z0-9_]*\b/,
      /\breturn\s+[^\n;]+;/,
      /\bcin\s*>>/,
      /\bcout\s*<</,
      /\bprintf\s*\(/,
      /\bscanf\s*\(/,
      /\{[\s\S]{20,}\}/,
    ];

    if (patterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    return (text.match(/\n/g) || []).length >= 4;
  }

  class BeecrowdExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.messageListenerAttached = false;
    }

    detectPageType() {
      const path = String(window.location.pathname || '');

      if (/\/runs\/(?:code\/)?\d+/i.test(path)) {
        return 'submission';
      }
      if (/\/runs(?:\/|$)/i.test(path)) {
        return 'submissions';
      }
      if (/\/problems\/(?:view|fullscreen)\//i.test(path)) {
        return 'problem';
      }

      return 'unknown';
    }

    getSubmissionIdFromUrl() {
      const pathMatch = String(window.location.pathname || '').match(
        /\/runs\/(?:code\/)?(\d+)/i
      );
      if (pathMatch?.[1]) return pathMatch[1];

      const query = new URL(window.location.href).searchParams;
      return firstNonEmpty(
        query.get('run'),
        query.get('submission_id'),
        extractSubmissionIdFromValue(window.location.href)
      );
    }

    async getUserHandle() {
      const profileLink = safeQuery(
        'a[href*="/profile/"], a[href*="/users/"], a[href*="/judge/en/profile/"]'
      );

      if (profileLink) {
        const href = profileLink.getAttribute('href') || profileLink.href || '';
        const match =
          href.match(/\/profile\/([^/?#]+)/i) ||
          href.match(/\/users\/([^/?#]+)/i) ||
          href.match(/\/judge\/[a-z]{2}\/profile\/([^/?#]+)/i);
        if (match?.[1]) return match[1];
      }

      const pathHandle = String(window.location.pathname || '').match(
        /\/(?:profile|users)\/([^/?#]+)/i
      )?.[1];
      if (pathHandle) return pathHandle;

      return null;
    }

    extractKeyValueRows() {
      const rows = [];

      safeQueryAll('table tr').forEach((row) => {
        const cells = safeQueryAll('th, td', row);
        if (cells.length < 2) return;

        const key = extractText(cells[0]).toLowerCase();
        const value = extractText(cells[cells.length - 1]);
        if (!key || !value) return;

        rows.push({ key, value, row });
      });

      safeQueryAll('dt').forEach((dt) => {
        const key = extractText(dt).toLowerCase();
        if (!key) return;

        const dd = dt.nextElementSibling;
        if (!dd || String(dd.tagName || '').toLowerCase() !== 'dd') return;

        const value = extractText(dd);
        if (!value) return;

        rows.push({ key, value, row: dd.parentElement || dd });
      });

      return rows;
    }

    findValueByKey(rows, patterns) {
      for (const row of rows) {
        if (patterns.some((pattern) => pattern.test(row.key))) {
          return row.value;
        }
      }
      return null;
    }

    extractProblemMeta() {
      const currentPathProblemId = extractProblemIdFromValue(
        window.location.href
      );

      const problemLinks = safeQueryAll(
        'a[href*="/problems/view/"], a[href*="/problems/"]'
      );

      const exactPathLink = currentPathProblemId
        ? problemLinks.find((link) => {
            const href = link.getAttribute('href') || link.href || '';
            const idFromHref = extractProblemIdFromValue(href);
            return (
              idFromHref &&
              String(idFromHref).toLowerCase() ===
                String(currentPathProblemId).toLowerCase()
            );
          })
        : null;

      const problemLinkWithValidId = problemLinks.find((link) => {
        const href = link.getAttribute('href') || link.href || '';
        return Boolean(extractProblemIdFromValue(href));
      });

      const problemLink =
        exactPathLink ||
        problemLinkWithValidId ||
        problemLinks.find((link) => /[A-Za-z]/.test(extractText(link))) ||
        problemLinks[0] ||
        null;
      const href = problemLink?.getAttribute('href') || problemLink?.href || '';

      const problemId =
        extractProblemIdFromValue(href) || currentPathProblemId || null;

      const escapedProblemId = String(problemId || '').replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      const rawLinkName = problemLink ? extractText(problemLink) : null;
      let cleanedLinkName = normalizeWhitespace(rawLinkName);
      if (cleanedLinkName && escapedProblemId) {
        cleanedLinkName = cleanedLinkName
          .replace(new RegExp(`^\\s*${escapedProblemId}\\s*-\\s*`, 'i'), '')
          .trim();
      }

      const headingName = firstNonEmpty(
        extractText('.header h1'),
        extractText('.problem h1'),
        extractText('h1'),
        extractText('h2')
      );
      const usableHeadingName =
        headingName && !/^source code$/i.test(headingName) ? headingName : null;
      const usableLinkName =
        cleanedLinkName &&
        (!problemId ||
          cleanedLinkName.toLowerCase() !== String(problemId).toLowerCase())
          ? cleanedLinkName
          : null;

      const problemName = firstNonEmpty(
        usableHeadingName,
        usableLinkName,
        problemId
      );

      let problemUrl = buildCanonicalProblemUrl(problemId);
      if (
        !problemUrl &&
        problemId &&
        /\/problems\/(?:view\/|fullscreen\/)?\d+/i.test(
          String(window.location.pathname || '')
        )
      ) {
        problemUrl = buildCanonicalProblemUrl(problemId);
      }

      return {
        problemId,
        problemName,
        problemUrl,
      };
    }

    extractSourceCode() {
      const candidates = [];

      const pushCandidate = (rawValue, scoreBoost = 0) => {
        const text = cleanSourceCode(rawValue);
        if (!text || !looksLikeCode(text)) {
          return;
        }

        const noisyAceDump =
          /ace_gutter|ace_scrollbar|ace_text-input|visualize the source code/i.test(
            text
          );

        candidates.push({
          score: text.length + scoreBoost - (noisyAceDump ? 600 : 0),
          text,
          noisyAceDump,
        });
      };

      const aceLayers = safeQueryAll('.ace_text-layer');
      for (const layer of aceLayers) {
        const lines = safeQueryAll('.ace_line', layer)
          .map((line) => String(line.textContent || '').replace(/\u00A0/g, ' '))
          .filter((line) => line.length > 0);

        if (lines.length > 0) {
          pushCandidate(lines.join('\n'), 1000);
        }
      }

      const lineSelectors = [
        '.ace_line',
        '.ace_text-layer .ace_line',
        '.CodeMirror-line',
        '.CodeMirror-code pre',
      ];
      lineSelectors.forEach((selector) => {
        const lines = safeQueryAll(selector)
          .map((line) => String(line.textContent || '').replace(/\u00A0/g, ' '))
          .filter((line) => line.trim().length > 0);

        if (lines.length > 0) {
          pushCandidate(lines.join('\n'), 400);
        }
      });

      [
        'pre code',
        'pre[class*="code"]',
        '.source-code',
        '.code-area',
        'pre',
        'textarea',
      ].forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const raw =
            typeof node.value === 'string' ? node.value : node.textContent;
          pushCandidate(raw, selector.includes('code') ? 120 : 0);
        });
      });

      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates.find((candidate) => !candidate.noisyAceDump);
      return (best || candidates[0]).text;
    }

    extractSubmissionFromCurrentPage() {
      const rows = this.extractKeyValueRows();
      const submissionId = this.getSubmissionIdFromUrl();
      const problemMeta = this.extractProblemMeta();

      const verdictRaw = firstNonEmpty(
        this.findValueByKey(rows, [
          /result/,
          /resultado/,
          /status/,
          /verdict/,
          /answer/,
        ]),
        extractText('.badge'),
        extractText('.status'),
        extractText('[class*="verdict"]'),
        extractText('[class*="result"]')
      );

      const language = firstNonEmpty(
        this.findValueByKey(rows, [
          /language/,
          /linguagem/,
          /idioma/,
          /^lang\b/,
        ]),
        extractText('[class*="language"]'),
        'Unknown'
      );

      const executionTime = parseDurationToMs(
        firstNonEmpty(
          this.findValueByKey(rows, [
            /runtime/,
            /execution/,
            /tempo(?!.*(submiss|envi|data|hora))/,
            /time(?!.*submit)/,
          ]),
          extractText('[class*="runtime"]')
        )
      );

      const memoryUsed = parseMemoryToKb(
        firstNonEmpty(
          this.findValueByKey(rows, [/memory/, /mem\b/, /mem[óo]ria/]),
          extractText('[class*="memory"]')
        )
      );

      const submittedAt =
        parseTimestampToIso(
          safeQuery('time[datetime]')?.getAttribute('datetime')
        ) ||
        parseTimestampToIso(
          firstNonEmpty(
            this.findValueByKey(rows, [
              /submitted/,
              /submetid/,
              /enviado/,
              /submission\s*time/,
              /data/,
              /hora/,
              /^date$/,
              /^time$/,
            ]),
            safeQuery('[data-time]')?.getAttribute('data-time'),
            safeQuery('[data-timestamp]')?.getAttribute('data-timestamp')
          )
        );

      const sourceCode = this.extractSourceCode();

      if (!submissionId) {
        return null;
      }

      return {
        platform: this.platform,
        handle: null,
        problemId: problemMeta.problemId,
        problemName: problemMeta.problemName,
        problemUrl: problemMeta.problemUrl,
        submissionId,
        submissionUrl: window.location.href,
        verdict: normalizeVerdict(verdictRaw || 'UNKNOWN'),
        language,
        executionTime,
        memoryUsed,
        submittedAt: submittedAt || null,
        sourceCode,
        problem_id: problemMeta.problemId,
        problem_name: problemMeta.problemName,
        problem_url: problemMeta.problemUrl,
        submission_id: submissionId,
        submission_url: window.location.href,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
        submitted_at: submittedAt || null,
      };
    }

    findRunsTable() {
      const tables = safeQueryAll('table');

      for (const table of tables) {
        if (safeQuery('a[href*="/runs/code/"], a[href*="/runs/"]', table)) {
          return table;
        }
      }

      for (const table of tables) {
        const headers = normalizeWhitespace(
          extractText('thead', table) || extractText('tr', table)
        ).toLowerCase();
        const rowCount = Math.max(
          safeQueryAll('tbody tr', table).length,
          safeQueryAll('tr', table).length
        );

        if (
          rowCount >= 1 &&
          /(run|submission|status|result|problem|language|runtime|memory|tempo|mem[óo]ria)/i.test(
            headers
          )
        ) {
          return table;
        }
      }

      for (const table of tables) {
        const candidateRows = safeQueryAll('tbody tr, tr', table).filter(
          (row) => safeQueryAll('td, th', row).length >= 2
        );

        if (candidateRows.length === 0) {
          continue;
        }

        const hasLikelyRunData = candidateRows.some((row) => {
          const rowText = normalizeWhitespace(extractText(row)).toLowerCase();
          return (
            /\b\d{5,}\b/.test(rowText) &&
            /(accepted|wrong|runtime|time limit|memory|compilation|pending|status|resultado|aceito|resposta)/i.test(
              rowText
            )
          );
        });

        if (hasLikelyRunData) {
          return table;
        }
      }

      return null;
    }

    getRunsRowCandidates() {
      const table = this.findRunsTable();

      if (table) {
        const rows = safeQueryAll('tbody tr', table);
        return rows.length > 0
          ? rows
          : safeQueryAll('tr', table).filter((row) => {
              return safeQueryAll('td', row).length >= 2;
            });
      }

      const containers = [];
      const seenNodes = new Set();
      const addContainer = (node) => {
        if (!node) {
          return;
        }

        const container =
          node.closest(
            'tr, li, article, [role="row"], .run, .submission, [class*="run"], [class*="submission"], .list-group-item'
          ) || node;

        if (seenNodes.has(container)) {
          return;
        }

        seenNodes.add(container);
        containers.push(container);
      };

      safeQueryAll('a[href*="/runs/code/"], a[href*="/runs/"]').forEach(
        addContainer
      );
      safeQueryAll(
        '[data-run-id], [data-submission-id], [onclick*="runs/code"], [data-href*="/runs/code/"]'
      ).forEach(addContainer);
      safeQueryAll('a[href*="/problems/view/"], a[href*="/problems/"]').forEach(
        addContainer
      );

      const filtered = containers.filter((container) => {
        const rowText = normalizeWhitespace(extractText(container));
        if (!rowText || rowText.length < 8) {
          return false;
        }

        const hasRunId =
          Boolean(
            extractSubmissionIdFromValue(
              container.getAttribute?.('data-run-id') ||
                container.getAttribute?.('data-submission-id') ||
                container.id
            )
          ) || /\b\d{5,}\b/.test(rowText);

        if (!hasRunId) {
          return false;
        }

        const hasProblemLink = Boolean(
          safeQuery(
            'a[href*="/problems/view/"], a[href*="/problems/"]',
            container
          )
        );
        const hasStatusSignals =
          /(accepted|wrong|runtime|time limit|memory|compilation|pending|status|resultado|aceito|resposta|erro|wa|tle|re|ce|ms|kb|mb)/i.test(
            rowText
          );

        return hasProblemLink || hasStatusSignals;
      });

      if (filtered.length > 0) {
        return filtered;
      }

      if (containers.length > 0) {
        return containers;
      }

      const fallbackRows = safeQueryAll(
        'tr, [role="row"], li, article, .list-group-item, [class*="run"], [class*="submission"]'
      ).filter((node) => {
        const text = normalizeWhitespace(extractText(node));
        if (!text || text.length < 8) {
          return false;
        }

        const hasRunId = /\b\d{5,}\b/.test(text);
        const hasProblemOrStatus =
          Boolean(
            safeQuery('a[href*="/problems/view/"], a[href*="/problems/"]', node)
          ) ||
          /(accepted|wrong|runtime|time limit|memory|compilation|pending|status|resultado|aceito|resposta|erro|wa|tle|re|ce|ms|kb|mb)/i.test(
            text
          );

        return hasRunId && hasProblemOrStatus;
      });

      return fallbackRows;
    }

    getCurrentPageNumber() {
      try {
        const parsed = new URL(window.location.href);
        const page = Number.parseInt(
          parsed.searchParams.get('page') || parsed.searchParams.get('p'),
          10
        );
        if (Number.isFinite(page) && page > 0) {
          return page;
        }
      } catch {
        // no-op
      }

      return 1;
    }

    extractNextPageUrl() {
      const currentUrl = window.location.href;
      const currentPage = this.getCurrentPageNumber();

      let bestUrl = null;
      let bestPage = Number.POSITIVE_INFINITY;

      safeQueryAll('a[href]').forEach((anchor) => {
        const rawHref = String(anchor.getAttribute('href') || '').trim();
        if (
          !rawHref ||
          rawHref.startsWith('#') ||
          /^javascript:/i.test(rawHref)
        ) {
          return;
        }

        const absolute = toAbsoluteUrl(rawHref);
        if (!absolute || absolute === currentUrl) return;

        let parsed;
        try {
          parsed = new URL(absolute);
        } catch {
          return;
        }

        if (!/\/runs(?:\/|$)/i.test(parsed.pathname || '')) return;

        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const text = extractText(anchor).toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();
        const isNextLike =
          rel.includes('next') ||
          /(^|\s)(next|newer|>|>>|›|»|proxima|pr[oó]xima)($|\s)/i.test(text) ||
          /next|proxima|pr[oó]xima/i.test(title);

        const pageValue = Number.parseInt(
          parsed.searchParams.get('page') || parsed.searchParams.get('p'),
          10
        );
        const hasNewerPage =
          Number.isFinite(pageValue) && pageValue > currentPage;

        if (hasNewerPage && pageValue < bestPage) {
          bestPage = pageValue;
          bestUrl = absolute;
          return;
        }

        if (isNextLike && bestUrl === null) {
          bestUrl = absolute;
        }
      });

      return bestUrl;
    }

    isSubmissionsPageReady() {
      if (this.detectPageType() !== 'submissions') {
        return false;
      }

      if (this.findRunsTable()) {
        return true;
      }

      if (safeQuery('a[href*="/runs/code/"], a[href*="/runs/"]')) {
        return true;
      }

      if (
        safeQuery(
          '[data-run-id], [data-submission-id], [onclick*="runs/code"], [data-href*="/runs/code/"]'
        )
      ) {
        return true;
      }

      const htmlSnapshot = String(document.documentElement?.innerHTML || '');
      if (/\/runs\/(?:code\/)?\d{4,}/i.test(htmlSnapshot)) {
        return true;
      }

      if (this.hasExplicitNoSubmissionsState()) {
        return true;
      }

      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) return false;
      if (bodyText.includes('loading')) return false;
      return false;
    }

    hasExplicitNoSubmissionsState() {
      const text = normalizeWhitespace(
        extractText(document.body)
      ).toLowerCase();
      if (!text) {
        return false;
      }

      return /(no submissions?|no runs?|no results?|no data|nothing found|sem submiss|nenhuma submiss|nenhum resultado)/i.test(
        text
      );
    }

    extractSubmissionIdFromRunsRow(row, runLink = null) {
      const href = runLink?.getAttribute('href') || runLink?.href || '';
      const fromLink = extractSubmissionIdFromValue(href);
      if (fromLink) return fromLink;

      const rowAttrs = [
        row?.getAttribute?.('data-run-id'),
        row?.getAttribute?.('data-submission-id'),
        row?.getAttribute?.('data-id'),
        row?.id,
      ];

      for (const attr of rowAttrs) {
        const parsed = extractSubmissionIdFromValue(attr);
        if (parsed) return parsed;
      }

      const clickableCandidates = safeQueryAll(
        '[data-run-id], [data-submission-id], a[href], button[onclick], button[data-href]',
        row
      );
      for (const node of clickableCandidates) {
        const candidates = [
          node.getAttribute('data-run-id'),
          node.getAttribute('data-submission-id'),
          node.getAttribute('data-id'),
          node.getAttribute('href'),
          node.getAttribute('data-href'),
          node.getAttribute('onclick'),
        ];

        for (const candidate of candidates) {
          const parsed = extractSubmissionIdFromValue(candidate);
          if (parsed) return parsed;
        }
      }

      const cells = safeQueryAll('td, th', row);
      for (let i = 0; i < Math.min(2, cells.length); i++) {
        const cellText = normalizeWhitespace(extractText(cells[i]));
        if (/^#?\d{4,}$/.test(cellText)) {
          return cellText.replace(/^#/, '');
        }
      }

      const rowText = normalizeWhitespace(extractText(row));
      return rowText.match(/\b(\d{5,})\b/)?.[1] || null;
    }

    extractSubmissionsFromHtmlSnapshot(options = {}) {
      const html = String(document.documentElement?.innerHTML || '');
      if (!html) {
        return [];
      }

      const expectedHandle = normalizeHandleToken(
        firstNonEmpty(options.expectedHandle, options.handle)
      );
      const expectedHandleAlias = normalizeHandleToken(
        options.expectedHandleAlias
      );
      const fallbackHandle = normalizeHandleToken(options.fallbackHandle);
      const filterByHandle = options.filterByHandle === true;
      const allowedHandles = new Set(
        [expectedHandle, expectedHandleAlias].filter(Boolean)
      );

      const results = [];
      const seenIds = new Set();
      const runPattern = /\/runs\/(?:code\/)?(\d{4,})(?:[/?#][^"'\s<]*)?/gi;
      let match;
      let scans = 0;

      while ((match = runPattern.exec(html)) != null && scans < 1200) {
        scans += 1;
        const submissionId = String(match[1] || '').trim();
        if (!submissionId || seenIds.has(submissionId)) {
          continue;
        }

        const start = Math.max(0, match.index - 700);
        const end = Math.min(html.length, match.index + 900);
        const chunk = html.slice(start, end);

        const problemId =
          chunk.match(
            /\/problems\/(?:view\/|fullscreen\/)?(\d+)(?:[/?#"'\s<]|$)/i
          )?.[1] || null;
        const verdictRaw =
          chunk.match(
            /(accepted|wrong\s*answer|time\s*limit\s*exceeded|memory\s*limit\s*exceeded|runtime\s*error|compilation\s*error|pending|aceito|resposta\s*errada|tempo\s*limite|erro\s*de\s*execucao|erro\s*de\s*compilacao)/i
          )?.[1] || null;

        const handle = fallbackHandle || null;
        if (filterByHandle && allowedHandles.size > 0) {
          const handleForMatch = normalizeHandleToken(handle);
          if (!handleForMatch || !allowedHandles.has(handleForMatch)) {
            continue;
          }
        }

        seenIds.add(submissionId);
        const submissionUrl = `https://judge.beecrowd.com/en/runs/code/${submissionId}`;
        const problemUrl = buildCanonicalProblemUrl(problemId);

        results.push({
          platform: this.platform,
          handle,
          problemId,
          problemName: problemId,
          problemUrl,
          submissionId,
          submissionUrl,
          verdict: normalizeVerdict(verdictRaw || 'UNKNOWN'),
          language: 'Unknown',
          executionTime: null,
          memoryUsed: null,
          submittedAt: null,
          sourceCode: null,
          problem_id: problemId,
          problem_name: problemId,
          problem_url: problemUrl,
          submission_id: submissionId,
          submission_url: submissionUrl,
          source_code: null,
          execution_time_ms: null,
          memory_kb: null,
          submitted_at: null,
        });
      }

      results.sort((a, b) => {
        const aId = Number.parseInt(String(a?.submissionId || ''), 10);
        const bId = Number.parseInt(String(b?.submissionId || ''), 10);
        if (Number.isFinite(aId) && Number.isFinite(bId)) {
          return bId - aId;
        }

        return String(b?.submissionId || '').localeCompare(
          String(a?.submissionId || '')
        );
      });

      return results;
    }

    extractSubmissionFromRunsRow(row) {
      const cells = safeQueryAll('td', row);
      const runLink = safeQuery(
        'a[href*="/runs/code/"], a[href*="/runs/"]',
        row
      );
      const href = runLink?.getAttribute('href') || runLink?.href || '';
      const submissionId = this.extractSubmissionIdFromRunsRow(row, runLink);
      if (!submissionId) return null;

      const handleLink = safeQuery(
        'a[href*="/profile/"], a[href*="/users/"], a[href*="/judge/"][href*="/profile/"]',
        row
      );
      const handleHref =
        handleLink?.getAttribute('href') || handleLink?.href || '';
      const handle =
        handleHref.match(/\/profile\/([^/?#]+)/i)?.[1] ||
        handleHref.match(/\/users\/([^/?#]+)/i)?.[1] ||
        null;

      const problemNameLink = safeQuery(
        'td.wide a[href*="/problems/view/"], td.wide a[href*="/problems/"]',
        row
      );
      const problemIdLink = safeQuery(
        'td.tiny a[href*="/problems/view/"], td.tiny a[href*="/problems/"]',
        row
      );
      const problemLink =
        problemNameLink ||
        problemIdLink ||
        safeQuery('a[href*="/problems/view/"], a[href*="/problems/"]', row);
      const problemHref =
        problemLink?.getAttribute('href') || problemLink?.href || '';
      const problemId =
        extractProblemIdFromValue(problemHref) ||
        firstNonEmpty(
          problemIdLink
            ? extractText(problemIdLink).match(/\b(\d+)\b/)?.[1] || null
            : null,
          null
        );

      const rawProblemName = firstNonEmpty(
        problemNameLink ? extractText(problemNameLink) : null,
        problemLink ? extractText(problemLink) : null,
        problemId
      );
      const problemName =
        rawProblemName &&
        problemId &&
        rawProblemName.toLowerCase() === String(problemId).toLowerCase()
          ? null
          : rawProblemName;

      const answerCell = safeQuery('td.answer, td[class*="answer"]', row);

      // Use a-N class as the primary verdict source (language-independent)
      const verdictFromClass = verdictFromAnswerClass(answerCell);
      const verdictRaw = verdictFromClass
        ? verdictFromClass
        : firstNonEmpty(
            answerCell ? extractText(answerCell) : null,
            extractText(
              safeQuery(
                '.badge, .status, [class*="verdict"], [class*="result"]',
                row
              )
            ),
            cells.find((cell) =>
              /(accepted|wrong|time limit|memory|runtime|compilation|pending|aceito|resposta|erro|resultado|status)/i.test(
                extractText(cell)
              )
            )
              ? extractText(
                  cells.find((cell) =>
                    /(accepted|wrong|time limit|memory|runtime|compilation|pending|aceito|resposta|erro|resultado|status)/i.test(
                      extractText(cell)
                    )
                  )
                )
              : null
          );

      const languageCell = safeQuery(
        'td.semi-wide-15, td[class*="language"], td[class*="lang"]',
        row
      );
      const language = firstNonEmpty(
        languageCell ? extractText(languageCell) : null,
        extractText(safeQuery('[class*="language"], [class*="lang"]', row)),
        cells.find((cell) =>
          /(^|\s)(c\+\+|c99|c11|c|java|python|javascript|go|rust|kotlin|pascal|c#|ruby|swift)(\s|$)/i.test(
            extractText(cell)
          )
        )
          ? extractText(
              cells.find((cell) =>
                /(^|\s)(c\+\+|c99|c11|c|java|python|javascript|go|rust|kotlin|pascal|c#|ruby|swift)(\s|$)/i.test(
                  extractText(cell)
                )
              )
            )
          : null,
        'Unknown'
      );

      let runtimeCell = cells.find((cell) =>
        /[0-9][0-9.,]*\s*(ms|msec|millisecond|s|sec|seg|segundo|min|minute)/i.test(
          extractText(cell)
        )
      );
      if (!runtimeCell && cells.length >= 7) {
        const value = normalizeWhitespace(extractText(cells[6]));
        if (/^[0-9]+(?:[.,][0-9]+)?$/.test(value)) {
          runtimeCell = cells[6];
        }
      }

      const memoryCell = cells.find((cell) =>
        /[0-9][0-9.,]*\s*(b|kb|kib|mb|mib|gb|gib)/i.test(extractText(cell))
      );
      const timestampCell =
        cells.find((cell) =>
          /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}/.test(
            extractText(cell)
          )
        ) || (cells.length >= 8 ? cells[cells.length - 1] : null);

      const executionTime = parseDurationToMs(
        runtimeCell ? extractText(runtimeCell) : null
      );
      const memoryUsed = parseMemoryToKb(
        memoryCell ? extractText(memoryCell) : null
      );
      const submittedAt =
        parseTimestampToIso(
          safeQuery('time[datetime]', row)?.getAttribute('datetime')
        ) ||
        parseTimestampToIso(
          timestampCell ? extractText(timestampCell) : null
        ) ||
        null;

      const submissionUrl =
        toAbsoluteUrl(href) ||
        `https://judge.beecrowd.com/en/runs/code/${submissionId}`;
      const problemUrl = buildCanonicalProblemUrl(problemId);
      const normalizedHandle = normalizeHandleToken(handle);

      return {
        platform: this.platform,
        handle: normalizedHandle || null,
        problemId,
        problemName: firstNonEmpty(problemName, problemId),
        problemUrl,
        submissionId,
        submissionUrl,
        verdict: normalizeVerdict(verdictRaw || 'UNKNOWN'),
        language,
        executionTime,
        memoryUsed,
        submittedAt,
        sourceCode: null,
        problem_id: problemId,
        problem_name: firstNonEmpty(problemName, problemId),
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        source_code: null,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
        submitted_at: submittedAt,
      };
    }

    extractSubmissionsFromRunsList(options = {}) {
      const normalizedRows = this.getRunsRowCandidates();
      if (normalizedRows.length === 0) {
        return [];
      }

      const expectedHandle = normalizeHandleToken(
        firstNonEmpty(options.expectedHandle, options.handle)
      );
      const expectedHandleAlias = normalizeHandleToken(
        options.expectedHandleAlias
      );
      const fallbackHandle = normalizeHandleToken(options.fallbackHandle);
      const filterByHandle = options.filterByHandle === true;
      const submissions = [];
      const seenSubmissionIds = new Set();
      const allowedHandles = new Set(
        [expectedHandle, expectedHandleAlias].filter(Boolean)
      );

      for (const row of normalizedRows) {
        const submission = this.extractSubmissionFromRunsRow(row);
        if (!submission?.submissionId) continue;

        const effectiveHandle =
          normalizeHandleToken(submission.handle) || fallbackHandle;
        if (effectiveHandle) {
          submission.handle = effectiveHandle;
        } else if (filterByHandle && allowedHandles.size > 0) {
          const firstAllowed = Array.from(allowedHandles)[0] || null;
          if (firstAllowed) {
            submission.handle = firstAllowed;
          }
        }

        if (filterByHandle && allowedHandles.size > 0) {
          const handleForMatch = normalizeHandleToken(submission.handle);
          if (!handleForMatch || !allowedHandles.has(handleForMatch)) {
            continue;
          }
        }

        if (seenSubmissionIds.has(submission.submissionId)) {
          continue;
        }

        seenSubmissionIds.add(submission.submissionId);
        submissions.push(submission);
      }

      submissions.sort((a, b) => {
        const aId = Number.parseInt(String(a?.submissionId || ''), 10);
        const bId = Number.parseInt(String(b?.submissionId || ''), 10);
        if (Number.isFinite(aId) && Number.isFinite(bId)) {
          return bId - aId;
        }

        return String(b?.submissionId || '').localeCompare(
          String(a?.submissionId || '')
        );
      });

      if (submissions.length === 0) {
        return this.extractSubmissionsFromHtmlSnapshot({
          expectedHandle,
          expectedHandleAlias,
          fallbackHandle,
          filterByHandle,
        });
      }

      return submissions;
    }

    extractSubmissionFromRunsList() {
      const submissions = this.extractSubmissionsFromRunsList({
        filterByHandle: false,
      });
      return submissions[0] || null;
    }

    extractProblemDetails() {
      // Beecrowd problem content may appear in /view/<id> or /fullscreen/<id>
      // Structure: .header (title, timelimit), .problem > .description, .input, .output,
      //            tables with thead "Input Samples"/"Output Samples"

      // --- Problem ID & name ---
      // .header span = "beecrowd | 1013", .header h1 = "The Greatest"
      const headerSpan = safeQuery('.header span');
      const problemIdFromHeader = headerSpan
        ? normalizeWhitespace(extractText(headerSpan)).match(
            /\|\s*(\d+)/
          )?.[1] || null
        : null;
      const problemIdFromPath = extractProblemIdFromValue(window.location.href);
      const problemId = problemIdFromHeader || problemIdFromPath || null;

      const problemName = firstNonEmpty(
        extractText('.header h1'),
        extractText('h1'),
        problemId
      );

      const problemUrl =
        buildCanonicalProblemUrl(problemId) ||
        buildCanonicalProblemUrl(
          extractProblemIdFromValue(window.location.href)
        );

      // --- Description ---
      const description = firstNonEmpty(
        extractMultilineText('.problem .description'),
        extractMultilineText('.description')
      );

      // --- Input / Output ---
      const inputFormat = firstNonEmpty(
        extractMultilineText('.problem .input'),
        extractMultilineText('.input')
      );
      const outputFormat = firstNonEmpty(
        extractMultilineText('.problem .output'),
        extractMultilineText('.output')
      );

      // --- Sample tests from tables ---
      // Tables: thead td = "Input Samples"/"Output Samples"
      // tbody tr: td.division = input side, sibling td = output side
      const examples = [];
      const seenPairs = new Set();
      safeQueryAll('.problem table, table').forEach((table) => {
        const theadText = normalizeWhitespace(
          extractText('thead', table)
        ).toLowerCase();
        const isExampleTable =
          theadText.includes('input') ||
          theadText.includes('sample') ||
          theadText.includes('entrada') ||
          theadText.includes('exemplo');
        if (!isExampleTable) return;

        safeQueryAll('tbody tr', table).forEach((row) => {
          const cells = safeQueryAll('td', row);
          if (cells.length < 2) return;
          // td.division = input column; next td = output column
          const inputCell =
            cells.find((c) => c.className.includes('division')) || cells[0];
          const outputCell =
            cells.find(
              (c) => !c.className.includes('division') && c !== inputCell
            ) || cells[1];
          const input = normalizeWhitespace(extractText(inputCell));
          const output = normalizeWhitespace(extractText(outputCell));
          if (!input && !output) return;
          const key = `${input}|${output}`;
          if (seenPairs.has(key)) return;
          seenPairs.add(key);
          examples.push({ input, output });
        });
      });

      // --- Time limit from .header strong: "Timelimit: 1" ---
      const timeLimitRaw = firstNonEmpty(
        extractText('.header strong'),
        extractText('.header .timelimit'),
        String(document.title || '').match(/timelimit[:\s]+([0-9.,]+)/i)?.[1] ||
          null
      );
      const timeLimitMatch = timeLimitRaw
        ? timeLimitRaw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(ms|s|sec|m|min)?/i)
        : null;
      let timeLimitMs = null;
      if (timeLimitMatch) {
        const amt = Number.parseFloat(
          String(timeLimitMatch[1]).replace(',', '.')
        );
        const unit = (timeLimitMatch[2] || 's').toLowerCase();
        if (Number.isFinite(amt)) {
          timeLimitMs = unit.startsWith('ms')
            ? Math.round(amt)
            : unit.startsWith('m') && !unit.startsWith('ms')
              ? Math.round(amt * 60000)
              : Math.round(amt * 1000);
        }
      }

      // --- Memory limit (beecrowd doesn't show it on-page prominently, default 256 MB) ---
      const memLimitRaw = firstNonEmpty(
        extractText('.header .memorylimit'),
        String(document.body?.innerText || '').match(
          /(?:memory\s*limit|limite\s*de\s*mem[oó]ria)\s*:?\s*([0-9]+(?:[.,][0-9]+)?\s*(?:kb|mb|gb)?)/i
        )?.[1] || null
      );
      const memoryLimitKb = memLimitRaw ? parseMemoryToKb(memLimitRaw) : null;

      return {
        problemId,
        problemName,
        problemUrl,
        description: description || null,
        inputFormat: inputFormat || null,
        outputFormat: outputFormat || null,
        constraints: null,
        examples,
        notes: null,
        sample_tests: examples,
        tags: [],
        problemTags: [],
        difficultyRating: null,
        difficulty_rating: null,
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
        input_format: inputFormat || null,
        output_format: outputFormat || null,
        problem_description: description || null,
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

      const hasResourceLimits =
        Number.isFinite(
          Number.parseInt(
            String(details.timeLimitMs ?? details.time_limit_ms),
            10
          )
        ) ||
        Number.isFinite(
          Number.parseInt(
            String(details.memoryLimitKb ?? details.memory_limit_kb),
            10
          )
        );

      return (
        hasDescription ||
        hasInputOutput ||
        hasExamples ||
        hasConstraints ||
        hasResourceLimits
      );
    }

    async handleExtractSubmissionsMessage(request, sendResponse) {
      try {
        if (this.detectPageType() !== 'submissions') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on beecrowd runs page',
          });
          return;
        }

        if (!this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'beecrowd runs page still loading',
          });
          return;
        }

        await waitForElement('body', 4000).catch(() => null);
        await sleep(250);
        const pageHandle = normalizeHandleToken(await this.getUserHandle());
        const requestedHandle = normalizeHandleToken(request?.handle);
        const shouldFilterByHandle = request?.options?.filterByHandle === true;

        let submissions = this.extractSubmissionsFromRunsList({
          expectedHandle: request?.handle,
          expectedHandleAlias: pageHandle,
          fallbackHandle: pageHandle,
          filterByHandle: shouldFilterByHandle,
        });

        if (
          shouldFilterByHandle &&
          submissions.length === 0 &&
          (/^\d+$/.test(requestedHandle) || !pageHandle)
        ) {
          submissions = this.extractSubmissionsFromRunsList({
            expectedHandle: request?.handle,
            expectedHandleAlias: pageHandle,
            fallbackHandle: pageHandle,
            filterByHandle: false,
          });
        }

        if (submissions.length === 0 && !this.hasExplicitNoSubmissionsState()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'beecrowd runs data still loading',
          });
          return;
        }

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
          error: error?.message || 'Failed to extract beecrowd submissions',
        });
      }
    }

    async handleExtractProblemDetailsMessage(sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'problem') {
          sendResponse({
            success: false,
            pending: true,
            error: `Not on beecrowd problem page (detected: ${pageType}, path: ${window.location.pathname})`,
          });
          return;
        }

        await waitForElement('body', 4000).catch(() => null);
        await sleep(300);

        // Detect Cloudflare challenge page
        const bodyText = normalizeWhitespace(
          document.body?.innerText || ''
        ).toLowerCase();
        if (
          /(cloudflare|just a moment|checking your browser|enable javascript and cookies)/i.test(
            bodyText
          )
        ) {
          sendResponse({
            success: false,
            nonRetriable: true,
            error:
              'beecrowd Cloudflare challenge detected. Open judge.beecrowd.com while logged in and retry.',
          });
          return;
        }

        const details = this.extractProblemDetails();

        console.log('[NEUPC] beecrowd extractProblemDetails result:', {
          url: window.location.href,
          problemId: details?.problemId,
          problemName: details?.problemName,
          descriptionLen: details?.description?.length || 0,
          inputFormatLen: details?.inputFormat?.length || 0,
          outputFormatLen: details?.outputFormat?.length || 0,
          examplesCount: details?.examples?.length || 0,
          timeLimitMs: details?.timeLimitMs,
          hasProblemDiv: !!document.querySelector('.problem'),
          hasDescriptionDiv: !!document.querySelector('.description'),
          hasHeaderH1: !!document.querySelector('.header h1'),
        });

        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: `beecrowd problem details not ready yet (problemId=${details?.problemId}, desc=${details?.description?.length || 0}chars)`,
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract beecrowd problem details',
        });
      }
    }

    async extractSubmission() {
      const pageType = this.detectPageType();

      await waitForElement('body', 5000).catch(() => null);
      if (pageType === 'submission') {
        const detailed = this.extractSubmissionFromCurrentPage();
        if (detailed) {
          detailed.handle = await this.getUserHandle();
          return detailed;
        }
      }

      const fromRuns = this.extractSubmissionFromRunsList();
      if (fromRuns) {
        fromRuns.handle = await this.getUserHandle();
      }
      return fromRuns;
    }

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage || this.messageListenerAttached) {
        return;
      }

      this.messageListenerAttached = true;

      browserAPI.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
          if (request?.action === 'extractSubmission') {
            this.extractSubmission()
              .then((submission) => {
                if (!submission) {
                  sendResponse({
                    success: false,
                    error: 'No beecrowd submission found',
                  });
                  return;
                }

                const requireSourceCode = request?.requireSourceCode === true;
                if (requireSourceCode && !submission.sourceCode) {
                  sendResponse({
                    success: false,
                    pending: true,
                    data: submission,
                    error: 'Beecrowd source code not ready yet',
                  });
                  return;
                }

                sendResponse({ success: true, data: submission, error: null });
              })
              .catch((error) =>
                sendResponse({
                  success: false,
                  error: error?.message || 'Extraction failed',
                })
              );
            return true;
          }

          if (request?.action === 'extractProblemDetails') {
            this.handleExtractProblemDetailsMessage(sendResponse);
            return true;
          }

          if (request?.action === 'extractSubmissionsPage') {
            this.handleExtractSubmissionsMessage(request, sendResponse);
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

    storeSubmission(submission) {
      if (!browserAPI?.storage?.local || !submission?.submissionId) return;

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = Array.isArray(cached[this.platform])
          ? cached[this.platform]
          : [];

        const exists = platformCache.some(
          (item) => item?.submissionId === submission.submissionId
        );
        if (exists) return;

        platformCache.unshift(submission);
        if (platformCache.length > 200) {
          platformCache.pop();
        }

        cached[this.platform] = platformCache;
        browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
          this.autoSyncIfEnabled(submission);
        });
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI?.runtime || !browserAPI?.storage?.sync) return;

      browserAPI.storage.sync.get(
        ['autoSyncEnabled', 'autoFetchEnabled', 'autoSync', 'extensionToken'],
        (result) => {
          const autoEnabled =
            result.autoSyncEnabled === true ||
            result.autoFetchEnabled === true ||
            result.autoSync === true;

          if (!autoEnabled || !result.extensionToken) {
            return;
          }

          browserAPI.runtime.sendMessage(
            { action: 'syncSubmission', submission },
            () => {}
          );
        }
      );
    }

    async init() {
      if (this.initialized) return;

      this.setupMessageListener();

      const pageType = this.detectPageType();
      if (pageType === 'submission' || pageType === 'submissions') {
        try {
          const submission = await this.extractSubmission();
          if (submission?.submissionId) {
            this.storeSubmission(submission);
          }
        } catch (error) {
          logError(
            'Initialization extraction failed:',
            error?.message || error
          );
        }
      }

      this.initialized = true;
      log('Extractor initialized on page type:', pageType);
    }
  }

  function bootstrap() {
    const extractor = new BeecrowdExtractor();
    extractor.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
