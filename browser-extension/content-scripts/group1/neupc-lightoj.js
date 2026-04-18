/**
 * NEUPC LightOJ Extractor (Standalone)
 * Supports:
 * - Auto extraction on submission pages
 * - Background-triggered extraction via runtime messages
 * - Problem details extraction on problem pages
 */

(function () {
  'use strict';

  if (window.__NEUPC_LIGHTOJ_INJECTED__) {
    return;
  }
  window.__NEUPC_LIGHTOJ_INJECTED__ = true;

  const PLATFORM = 'lightoj';
  const browserAPI =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof browser !== 'undefined'
        ? browser
        : null;

  function log(...args) {
    console.log(`[NEUPC:${PLATFORM}]`, ...args);
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
      if (value === undefined || value === null) continue;
      const normalized = normalizeWhitespace(value);
      if (normalized) return normalized;
    }
    return null;
  }

  function normalizeHandleToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let normalized = raw
      .replace(/^@+/, '')
      .replace(/^(?:https?:\/\/)?(?:www\.)?lightoj\.com\/user\//i, '');

    normalized = normalized.split(/[/?#]/)[0] || '';
    return normalized.trim().toLowerCase();
  }

  function toAbsoluteUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return null;
    try {
      return new URL(raw, window.location.href).toString();
    } catch {
      return null;
    }
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

    if (
      v.includes('ACCEPTED') ||
      v === 'AC' ||
      v === 'OK' ||
      v.includes('SUCCESS')
    ) {
      return 'AC';
    }
    if (v.includes('PARTIAL')) {
      return 'PC';
    }
    if (v.includes('WRONG ANSWER') || v === 'WA' || v.includes('FAILED')) {
      return 'WA';
    }
    if (v.includes('TIME LIMIT') || v === 'TLE' || v.includes('TIMEOUT')) {
      return 'TLE';
    }
    if (v.includes('MEMORY LIMIT') || v === 'MLE') {
      return 'MLE';
    }
    if (
      v.includes('RUNTIME ERROR') ||
      v === 'RE' ||
      v === 'RTE' ||
      v.includes('SEGFAULT')
    ) {
      return 'RE';
    }
    if (v.includes('COMPILATION ERROR') || v === 'CE' || v.includes('COMPILE')) {
      return 'CE';
    }
    if (
      v.includes('PENDING') ||
      v.includes('QUEUE') ||
      v.includes('RUNNING') ||
      v.includes('JUDGING')
    ) {
      return 'PENDING';
    }

    return v || 'UNKNOWN';
  }

  function parseDurationToMs(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(/([0-9]*\.?[0-9]+)\s*(ms|msec|millisecond(?:s)?|s|sec|second(?:s)?)?/);
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

    return amount <= 20 ? Math.round(amount * 1000) : Math.round(amount);
  }

  function parseMemoryToKb(value) {
    const text = normalizeWhitespace(value).toLowerCase();
    if (!text) return null;

    const match = text.match(/([0-9]*\.?[0-9]+)\s*(kb|kib|mb|mib|gb|gib|b)?/);
    if (!match) return null;

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return null;

    const unit = String(match[2] || 'kb').toLowerCase();
    if (unit === 'gb' || unit === 'gib') return Math.round(amount * 1024 * 1024);
    if (unit === 'mb' || unit === 'mib') return Math.round(amount * 1024);
    if (unit === 'kb' || unit === 'kib') return Math.round(amount);
    if (unit === 'b') return Math.round(amount / 1024);

    return Math.round(amount);
  }

  function parseTimestampToIso(value) {
    const text = normalizeWhitespace(value);
    if (!text) return null;

    if (/^\d+$/.test(text)) {
      const numeric = Number.parseInt(text, 10);
      if (!Number.isFinite(numeric) || numeric <= 0) return null;

      const millis = text.length <= 10 ? numeric * 1000 : Number.parseInt(text.slice(0, 13), 10);
      const date = new Date(millis);
      return Number.isFinite(date.getTime()) ? date.toISOString() : null;
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
      /\bconsole\.log\b/,
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

  function parseSampleTests(text) {
    const normalized = String(text || '').replace(/\r/g, '');
    const tests = [];

    const regex =
      /Sample\s+Input\s*:?([\s\S]*?)\n\s*Sample\s+Output\s*:?([\s\S]*?)(?=\n\s*(?:Sample\s+Input|Explanation|Notes?|Constraints?|$))/gi;

    let match;
    while ((match = regex.exec(normalized)) != null && tests.length < 8) {
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

  class LightOJExtractor {
    constructor() {
      this.platform = PLATFORM;
      this.initialized = false;
      this.messageListenerAttached = false;
    }

    detectPageType() {
      const path = String(window.location.pathname || '');

      if (/\/submission\/(\d+)/i.test(path) || /\/submissions\/(\d+)/i.test(path)) {
        return 'submission';
      }
      if (/\/problems\/category(?:\/|$)/i.test(path)) {
        return 'category';
      }
      if (/\/problem\//i.test(path)) {
        return 'problem';
      }
      if (/\/submissions/i.test(path)) {
        return 'submissions';
      }
      if (/\/user\//i.test(path)) {
        return 'profile';
      }

      return 'unknown';
    }

    parseUrlContext(url = window.location.href) {
      let parsed;
      try {
        parsed = new URL(url, window.location.origin);
      } catch {
        parsed = new URL(window.location.href);
      }

      const path = parsed.pathname || '';
      const submissionId =
        path.match(/\/submission\/(\d+)/i)?.[1] ||
        path.match(/\/submissions\/(\d+)/i)?.[1] ||
        parsed.searchParams.get('submission_id') ||
        parsed.searchParams.get('sid') ||
        parsed.searchParams.get('id') ||
        null;

      const problemId = path.match(/\/problem\/([^/?#]+)/i)?.[1] || null;

      return {
        parsed,
        path,
        submissionId: submissionId ? String(submissionId).trim() : null,
        problemId: problemId ? String(problemId).trim() : null,
      };
    }

    buildProblemUrl(problemId) {
      const normalized = normalizeWhitespace(problemId);
      if (!normalized) return null;
      return `https://lightoj.com/problem/${encodeURIComponent(normalized)}`;
    }

    async getUserHandle() {
      const link = safeQuery('a[href^="/user/"], a[href*="/user/"]');
      if (link) {
        const href = link.getAttribute('href') || link.href || '';
        const match = href.match(/\/user\/([^/?#]+)/i);
        if (match?.[1]) return match[1];
      }

      const pathHandle =
        window.location.pathname.match(/\/user\/([^/?#]+)/i)?.[1] || null;
      if (pathHandle) return pathHandle;

      const scriptTexts = safeQueryAll('script:not([src])')
        .map((script) => script.textContent || '')
        .filter((text) => /"username"\s*:/i.test(text));

      for (const text of scriptTexts) {
        const match = text.match(/"username"\s*:\s*"([^"\\]+)"/i);
        if (match?.[1]) return match[1];
      }

      return null;
    }

    getHandleFromUrl(url = window.location.href) {
      const context = this.parseUrlContext(url);
      const pathHandle = context.path.match(/\/user\/([^/?#]+)/i)?.[1] || null;
      if (pathHandle) return pathHandle;
      return context.parsed.searchParams.get('user') || null;
    }

    findSubmissionsTable() {
      const tables = safeQueryAll('table');
      if (tables.length === 0) return null;

      let best = null;
      let bestScore = -1;

      for (const table of tables) {
        const rows = safeQueryAll('tr', table);
        if (rows.length === 0) continue;

        let score = rows.length;
        if (safeQuery('a[href*="/submission/"], a[href*="/submissions/"]', table)) {
          score += 25;
        }
        if (safeQuery('a[href*="/problem/"]', table)) score += 12;

        const headerText = normalizeWhitespace(
          String(
            safeQuery('thead', table)?.innerText ||
              safeQuery('tr', table)?.innerText ||
              ''
          )
        ).toLowerCase();

        if (
          /(submission|problem|status|verdict|language|memory|runtime|time|user)/i.test(
            headerText
          )
        ) {
          score += 30;
        }

        if (score > bestScore) {
          bestScore = score;
          best = table;
        }
      }

      return best;
    }

    extractHeaderMap(table) {
      const columns = {
        id: 0,
        problem: 1,
        user: null,
        verdict: 2,
        language: 3,
        time: 4,
        memory: 5,
        submittedAt: null,
      };

      let headers = safeQueryAll('thead th, thead td', table);
      if (headers.length === 0) {
        const firstRow = safeQuery('tr', table);
        headers = firstRow ? safeQueryAll('th, td', firstRow) : [];
      }

      headers.forEach((cell, index) => {
        const key = extractText(cell).toLowerCase();
        if (!key) return;

        if (/submission|sub\.?\s*id|^id$/.test(key)) {
          columns.id = index;
          return;
        }
        if (/problem|task/.test(key)) {
          columns.problem = index;
          return;
        }
        if (/status|verdict|result/.test(key)) {
          columns.verdict = index;
          return;
        }
        if (/language|\blang\b/.test(key)) {
          columns.language = index;
          return;
        }
        if (/runtime|execution|\btime\b/.test(key)) {
          columns.time = index;
          return;
        }
        if (/memory|\bmem\b/.test(key)) {
          columns.memory = index;
          return;
        }
        if (/submitted|date/.test(key)) {
          columns.submittedAt = index;
          return;
        }
        if (/user|author|handle/.test(key)) {
          columns.user = index;
        }
      });

      return columns;
    }

    getCellText(cells, index) {
      if (!Array.isArray(cells)) return '';
      if (index === null || index === undefined) return '';
      if (index < 0 || index >= cells.length) return '';
      return extractText(cells[index]);
    }

    extractSubmissionFromRow(row, columns, fallbackHandle) {
      const cells = safeQueryAll('td', row);
      if (cells.length < 2) return null;

      const submissionLink = safeQuery(
        'a[href*="/submission/"], a[href*="/submissions/"]',
        row
      );
      const submissionHref =
        submissionLink?.getAttribute('href') || submissionLink?.href || '';

      const submissionIdFromHref =
        submissionHref.match(/\/submissions?\/(\d+)/i)?.[1] || null;
      const submissionIdFromCell =
        this.getCellText(cells, columns.id).match(/\b(\d{2,})\b/)?.[1] || null;
      const submissionId = firstNonEmpty(submissionIdFromHref, submissionIdFromCell);

      if (!submissionId || !/^\d+$/.test(submissionId)) {
        return null;
      }

      const problemLink = safeQuery('a[href*="/problem/"]', row);
      const problemHref =
        problemLink?.getAttribute('href') || problemLink?.href || '';
      const problemIdFromHref = problemHref.match(/\/problem\/([^/?#]+)/i)?.[1] || null;
      const problemText = this.getCellText(cells, columns.problem);
      const problemIdFromCell = problemText.match(/\b([A-Za-z0-9_-]{2,})\b/)?.[1] || null;
      const problemId = firstNonEmpty(problemIdFromHref, problemIdFromCell);

      const problemName = firstNonEmpty(
        problemLink ? extractText(problemLink) : null,
        problemText,
        problemId
      );

      const verdictRaw = firstNonEmpty(
        this.getCellText(cells, columns.verdict),
        extractText('[class*="status"]', row),
        extractText('[class*="verdict"]', row)
      );

      const language = firstNonEmpty(
        this.getCellText(cells, columns.language),
        extractText('[class*="language"]', row),
        'Unknown'
      );

      const executionTime = parseDurationToMs(this.getCellText(cells, columns.time));
      const memoryUsed = parseMemoryToKb(this.getCellText(cells, columns.memory));

      const submittedRaw = firstNonEmpty(
        this.getCellText(cells, columns.submittedAt),
        extractText('time[datetime]', row)
      );
      const submittedAt =
        parseTimestampToIso(
          safeQuery('time[datetime]', row)?.getAttribute('datetime') || submittedRaw
        ) || null;

      const userLink = safeQuery('a[href*="/user/"]', row);
      const handle = firstNonEmpty(
        userLink ? extractText(userLink) : null,
        this.getCellText(cells, columns.user),
        fallbackHandle
      );

      const submissionUrl = firstNonEmpty(
        toAbsoluteUrl(submissionHref),
        `https://lightoj.com/submission/${submissionId}`
      );

      const problemUrl = firstNonEmpty(
        toAbsoluteUrl(problemHref),
        this.buildProblemUrl(problemId)
      );

      const verdict = normalizeVerdict(verdictRaw || 'UNKNOWN');

      return {
        platform: this.platform,
        handle,
        problemId,
        problemName,
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
        problem_name: problemName,
        problem_url: problemUrl,
        submission_id: submissionId,
        submission_url: submissionUrl,
        verdict_raw: verdictRaw || null,
        submitted_at: submittedAt,
        source_code: null,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };
    }

    collectDetectedHandles() {
      const detected = new Set();

      const urlHandle = normalizeHandleToken(this.getHandleFromUrl());
      if (urlHandle) {
        detected.add(urlHandle);
      }

      safeQueryAll('a[href*="/user/"]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || anchor.href || '';
        const hrefHandle = href.match(/\/user\/([^/?#]+)/i)?.[1] || null;
        const textHandle = extractText(anchor);

        const normalizedHrefHandle = normalizeHandleToken(hrefHandle);
        const normalizedTextHandle = normalizeHandleToken(textHandle);

        if (normalizedHrefHandle) detected.add(normalizedHrefHandle);
        if (normalizedTextHandle) detected.add(normalizedTextHandle);
      });

      return Array.from(detected);
    }

    normalizeLightojCrawlerUrl(url) {
      const absolute = toAbsoluteUrl(url);
      if (!absolute) return null;

      try {
        const parsed = new URL(absolute);
        if (!/lightoj\.com$/i.test(parsed.hostname || '')) {
          return null;
        }

        parsed.hash = '';
        parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
        return parsed.toString();
      } catch {
        return null;
      }
    }

    getProblemPathFromHref(href) {
      const normalized = this.normalizeLightojCrawlerUrl(href);
      if (!normalized) return null;

      try {
        return new URL(normalized).pathname || null;
      } catch {
        return null;
      }
    }

    collectProblemStatusLabelsFromContext(context, labels) {
      if (!context || !Array.isArray(labels)) {
        return;
      }

      const nodes = safeQueryAll('button p, .button p, button, .button', context);
      nodes.forEach((node) => {
        const text = normalizeWhitespace(node.textContent || node.innerText || '');
        if (!text || labels.includes(text)) {
          return;
        }

        labels.push(text);
      });
    }

    extractProblemStatusFromCategoryLink(problemLink) {
      const problemPath = this.getProblemPathFromHref(
        problemLink?.getAttribute('href') || problemLink?.href || ''
      );

      const candidateContexts = [];
      const addContext = (node) => {
        if (!node || candidateContexts.includes(node)) {
          return;
        }
        candidateContexts.push(node);
      };

      addContext(problemLink?.nextElementSibling || null);
      addContext(problemLink?.parentElement || null);
      addContext(
        problemLink?.closest(
          '.problem-card, .problem-item, .add-page, .box, .card, li, article, .media, .columns, .column'
        ) || null
      );

      let cursor = problemLink?.nextElementSibling || null;
      for (let i = 0; i < 3 && cursor; i++) {
        addContext(cursor);
        cursor = cursor.nextElementSibling;
      }

      if (problemPath) {
        safeQueryAll('a[href*="/problem/"]').forEach((anchor) => {
          const anchorPath = this.getProblemPathFromHref(
            anchor?.getAttribute('href') || anchor?.href || ''
          );
          if (!anchorPath || anchorPath !== problemPath) {
            return;
          }

          addContext(anchor);
          addContext(anchor.parentElement || null);
          addContext(
            anchor.closest(
              '.problem-card, .problem-item, .add-page, .box, .card, li, article, .media, .columns, .column'
            ) || null
          );
        });
      }

      const labels = [];
      let hasSolvedIcon = false;

      candidateContexts.forEach((context) => {
        if (safeQuery('.mdi-check-circle-outline, .mdi-check-circle, [class*="check-circle"]', context)) {
          hasSolvedIcon = true;
        }

        this.collectProblemStatusLabelsFromContext(context, labels);
      });

      const statusLabel =
        labels.find((label) => /(solve|solved|attempt|try|submitted|unsolved)/i.test(label)) ||
        labels[0] ||
        (hasSolvedIcon ? 'Solved' : null);

      const normalizedStatus = normalizeWhitespace(statusLabel || '').toLowerCase();
      const isAttempted = normalizedStatus ? normalizedStatus !== 'solve' : true;

      return {
        statusLabel,
        isAttempted,
      };
    }

    extractCategoryProblemsFromCurrentPage() {
      const subcategoryUrls = new Set();
      const problemsById = new Map();

      safeQueryAll('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || anchor.href || '';
        const normalizedUrl = this.normalizeLightojCrawlerUrl(href);
        if (!normalizedUrl) {
          return;
        }

        let path;
        try {
          path = new URL(normalizedUrl).pathname || '';
        } catch {
          path = '';
        }

        if (/^\/problems\/category(?:\/|$)/i.test(path)) {
          subcategoryUrls.add(normalizedUrl);
        }
      });

      let problemLinks = safeQueryAll('a.page-meta[href*="/problem/"]');
      if (problemLinks.length === 0) {
        problemLinks = safeQueryAll('a[href*="/problem/"]');
      }

      for (const problemLink of problemLinks) {
        const href = problemLink.getAttribute('href') || problemLink.href || '';
        const problemUrl = this.normalizeLightojCrawlerUrl(href);
        if (!problemUrl) {
          continue;
        }

        const problemId =
          problemUrl.match(/\/problem\/([^/?#]+)/i)?.[1] ||
          href.match(/\/problem\/([^/?#]+)/i)?.[1] ||
          null;
        if (!problemId) {
          continue;
        }

        const normalizedProblemId = normalizeWhitespace(problemId);
        if (!normalizedProblemId) {
          continue;
        }

        const { statusLabel, isAttempted } = this.extractProblemStatusFromCategoryLink(
          problemLink
        );
        if (!isAttempted) {
          continue;
        }

        const problemName = firstNonEmpty(
          extractText('.is-size-4', problemLink),
          extractText('.title', problemLink),
          extractText(problemLink),
          normalizedProblemId
        );
        const lojId = firstNonEmpty(extractText('.loj-id', problemLink), null);
        const difficulty = firstNonEmpty(
          extractText('.tag-difficulty', problemLink),
          null
        );
        const solvedBy = firstNonEmpty(
          extractText('.tag-solved-by', problemLink),
          null
        );
        const successRate = firstNonEmpty(
          extractText('.tag-success-rate', problemLink),
          null
        );

        if (!problemsById.has(normalizedProblemId)) {
          problemsById.set(normalizedProblemId, {
            problemId: normalizedProblemId,
            problemName,
            problemUrl,
            statusLabel: statusLabel || null,
            isAttempted: true,
            lojId,
            difficulty,
            solvedBy,
            successRate,
          });
          continue;
        }

        const existing = problemsById.get(normalizedProblemId) || {};
        problemsById.set(normalizedProblemId, {
          ...existing,
          problemName: firstNonEmpty(existing.problemName, problemName, normalizedProblemId),
          problemUrl: firstNonEmpty(existing.problemUrl, problemUrl, null),
          statusLabel: firstNonEmpty(existing.statusLabel, statusLabel, null),
          isAttempted: existing.isAttempted !== false,
          lojId: firstNonEmpty(existing.lojId, lojId, null),
          difficulty: firstNonEmpty(existing.difficulty, difficulty, null),
          solvedBy: firstNonEmpty(existing.solvedBy, solvedBy, null),
          successRate: firstNonEmpty(existing.successRate, successRate, null),
        });
      }

      return {
        currentUrl: window.location.href,
        subcategories: Array.from(subcategoryUrls),
        problems: Array.from(problemsById.values()),
      };
    }

    extractAttemptedProblemsFromProfile() {
      const root =
        safeQuery('main') ||
        safeQuery('article') ||
        safeQuery('.profile-page') ||
        document.body;

      const links = safeQueryAll('a[href*="/problem/"], a[href*="/problems/"]', root);
      const attempted = [];
      const seenProblemIds = new Set();

      for (const link of links) {
        const href = link.getAttribute('href') || link.href || '';
        const problemId =
          href.match(/\/problem\/([^/?#]+)/i)?.[1] ||
          href.match(/\/problems\/([^/?#]+)/i)?.[1] ||
          null;
        if (!problemId) continue;

        const normalizedProblemId = normalizeWhitespace(problemId);
        const normalizedProblemIdToken = normalizedProblemId.toLowerCase();
        if (
          normalizedProblemIdToken === 'category' ||
          normalizedProblemIdToken === 'categories' ||
          normalizedProblemIdToken === 'all'
        ) {
          continue;
        }
        if (!normalizedProblemId || seenProblemIds.has(normalizedProblemId)) {
          continue;
        }

        seenProblemIds.add(normalizedProblemId);

        const problemName = firstNonEmpty(
          extractText(link),
          extractText(link.closest('tr')),
          extractText(link.closest('li')),
          normalizedProblemId
        );

        attempted.push({
          problemId: normalizedProblemId,
          problemName,
          problemUrl:
            toAbsoluteUrl(href) ||
            `https://lightoj.com/problem/${encodeURIComponent(
              normalizedProblemId
            )}`,
        });
      }

      return attempted;
    }

    extractResultLinksFromProblemPage(options = {}) {
      const expectedHandles = [
        ...new Set(
          [
            options?.expectedHandle,
            ...(Array.isArray(options?.expectedHandles)
              ? options.expectedHandles
              : []),
            options?.handle,
          ]
            .map(normalizeHandleToken)
            .filter(Boolean)
        ),
      ];

      const shouldFilterByHandle = options?.filterByHandle !== false;

      const shouldKeepSubmissionForHandle = (submissionHandle) => {
        if (!shouldFilterByHandle || expectedHandles.length === 0) {
          return true;
        }

        const normalizedSubmissionHandle = normalizeHandleToken(submissionHandle);
        if (!normalizedSubmissionHandle) {
          return true;
        }

        return expectedHandles.includes(normalizedSubmissionHandle);
      };

      const resultLinks = safeQueryAll(
        'a[href*="/submission/"], a[href*="/submissions/"]'
      );
      const seenSubmissionIds = new Set();
      const links = [];

      for (const link of resultLinks) {
        const href = link.getAttribute('href') || link.href || '';
        const submissionId = href.match(/\/submissions?\/(\d+)/i)?.[1] || null;
        if (!submissionId || seenSubmissionIds.has(submissionId)) {
          continue;
        }

        const row = link.closest('tr');
        const rowHandle = row
          ? firstNonEmpty(
              extractText(safeQuery('a[href*="/user/"]', row)),
              extractText(safeQuery('[class*="user"]', row))
            )
          : null;

        if (!shouldKeepSubmissionForHandle(rowHandle)) {
          continue;
        }

        seenSubmissionIds.add(submissionId);

        const rowCells = row ? safeQueryAll('td', row) : [];
        const rowText = extractText(row || link.closest('li') || link);
        const verdict = firstNonEmpty(
          row ? extractText(safeQuery('[class*="status"]', row)) : null,
          row ? extractText(safeQuery('[class*="verdict"]', row)) : null,
          rowText.match(
            /(accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|running|judging|partial)/i
          )?.[1] || null
        );
        const language = firstNonEmpty(
          row ? extractText(safeQuery('[class*="language"]', row)) : null,
          rowText.match(
            /(C\+\+\s*\d*|C#|Java(?:\s*\d+)?|Python\s*\d*|PyPy\s*\d*|JavaScript|TypeScript|Rust|Go|Kotlin|Swift|Ruby|Scala|Haskell)/i
          )?.[1] || null
        );

        let submittedAt = null;
        const timeNode = row ? safeQuery('time[datetime]', row) : null;
        if (timeNode) {
          submittedAt = parseTimestampToIso(timeNode.getAttribute('datetime'));
        }
        if (!submittedAt) {
          for (const cell of rowCells) {
            const text = extractText(cell);
            if (/\d{4}/.test(text)) {
              const parsed = parseTimestampToIso(text);
              if (parsed) {
                submittedAt = parsed;
                break;
              }
            }
          }
        }

        links.push({
          submissionId,
          submissionUrl:
            toAbsoluteUrl(href) || `https://lightoj.com/submission/${submissionId}`,
          verdict: verdict || null,
          language: language || null,
          submittedAt: submittedAt || null,
          handle: rowHandle || null,
        });
      }

      return links;
    }

    async extractSubmissions(options = {}) {
      if (this.detectPageType() !== 'submissions') {
        return [];
      }

      await waitForElement(
        'table, a[href*="/submission/"], a[href*="/submissions/"]',
        5000
      ).catch(
        () => null
      );
      await sleep(250);

      const table = this.findSubmissionsTable();
      if (!table) {
        return [];
      }

      const rows = safeQueryAll('tbody tr', table);
      const normalizedRows =
        rows.length > 0
          ? rows
          : safeQueryAll('tr', table).filter(
              (row) => safeQueryAll('td', row).length >= 2
            );

      const columns = this.extractHeaderMap(table);
      const fallbackHandle =
        this.getHandleFromUrl() || (await this.getUserHandle()) || null;
      const expectedHandles = [
        ...new Set(
          [
            options?.expectedHandle,
            ...(Array.isArray(options?.expectedHandles)
              ? options.expectedHandles
              : []),
            options?.handle,
          ]
            .map(normalizeHandleToken)
            .filter(Boolean)
        ),
      ];
      const shouldFilterByHandle = options?.filterByHandle !== false;

      const shouldKeepSubmissionForHandle = (submissionHandle) => {
        if (!shouldFilterByHandle || expectedHandles.length === 0) {
          return true;
        }

        const normalizedSubmissionHandle = normalizeHandleToken(submissionHandle);
        if (!normalizedSubmissionHandle) {
          return true;
        }

        return expectedHandles.includes(normalizedSubmissionHandle);
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
        if (!shouldKeepSubmissionForHandle(submission.handle)) continue;

        const normalizedSubmissionId = String(submission.submissionId).trim();
        if (!/^\d+$/.test(normalizedSubmissionId)) continue;
        if (seenSubmissionIds.has(normalizedSubmissionId)) continue;

        seenSubmissionIds.add(normalizedSubmissionId);
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

      return submissions;
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
        if (!rawHref || rawHref.startsWith('#') || /^javascript:/i.test(rawHref)) {
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

        if (!/\/submissions/i.test(parsed.pathname || '')) return;

        const rel = String(anchor.getAttribute('rel') || '').toLowerCase();
        const text = extractText(anchor).toLowerCase();
        const title = String(anchor.getAttribute('title') || '').toLowerCase();
        const isNextLike =
          rel.includes('next') ||
          /(^|\s)(next|newer|>|>>|›|»)($|\s)/i.test(text) ||
          /next/i.test(title);

        const pageValue = Number.parseInt(
          parsed.searchParams.get('page') || parsed.searchParams.get('p'),
          10
        );
        const hasNewerPage = Number.isFinite(pageValue) && pageValue > currentPage;

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

      if (this.findSubmissionsTable()) {
        return true;
      }

      if (safeQuery('a[href*="/submission/"], a[href*="/submissions/"]')) {
        return true;
      }

      const bodyText = String(document.body?.innerText || '').toLowerCase();
      if (!bodyText) return false;
      if (bodyText.includes('loading')) return false;
      if (bodyText.includes('no submissions')) return true;

      return bodyText.length >= 120;
    }

    async handleExtractSubmissionsMessage(request, sendResponse) {
      try {
        if (this.detectPageType() !== 'submissions') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on LightOJ submissions page',
          });
          return;
        }

        if (!this.isSubmissionsPageReady()) {
          sendResponse({
            success: false,
            pending: true,
            error: 'LightOJ submissions page still loading',
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
          error: error?.message || 'Failed to extract LightOJ submissions',
        });
      }
    }

    async handleExtractAttemptedProblemsMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'profile') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on LightOJ user profile page yet',
          });
          return;
        }

        const bodyText = String(document.body?.innerText || '').toLowerCase();
        if (!bodyText || bodyText.includes('loading')) {
          sendResponse({
            success: false,
            pending: true,
            error: 'LightOJ profile page still loading',
          });
          return;
        }

        const attemptedProblems = this.extractAttemptedProblemsFromProfile();
        sendResponse({ success: true, data: attemptedProblems, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error:
            error?.message ||
            'Failed to extract attempted LightOJ problems from profile',
        });
      }
    }

    async handleExtractCategoryProblemsMessage(sendResponse) {
      try {
        if (this.detectPageType() !== 'category') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on LightOJ category page yet',
          });
          return;
        }

        await waitForElement('a[href*="/problems/category"], a[href*="/problem/"]', 4000).catch(
          () => null
        );

        const bodyText = String(document.body?.innerText || '').toLowerCase();
        if (!bodyText || bodyText.includes('loading')) {
          sendResponse({
            success: false,
            pending: true,
            error: 'LightOJ category page still loading',
          });
          return;
        }

        const categoryData = this.extractCategoryProblemsFromCurrentPage();
        sendResponse({
          success: true,
          data: categoryData,
          error: null,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error:
            error?.message ||
            'Failed to extract LightOJ category/subcategory problem data',
        });
      }
    }

    async handleExtractResultLinksMessage(request, sendResponse) {
      try {
        if (this.detectPageType() !== 'problem') {
          sendResponse({
            success: false,
            pending: true,
            error: 'Not on LightOJ problem page yet',
          });
          return;
        }

        const bodyText = String(document.body?.innerText || '').toLowerCase();
        if (!bodyText || bodyText.includes('loading')) {
          sendResponse({
            success: false,
            pending: true,
            error: 'LightOJ problem page still loading',
          });
          return;
        }

        const context = this.parseUrlContext();
        const links = this.extractResultLinksFromProblemPage({
          expectedHandle: request?.handle,
          expectedHandles: request?.options?.expectedHandles,
          filterByHandle: request?.options?.filterByHandle !== false,
        });

        const problemId = firstNonEmpty(
          context.problemId,
          safeQuery('a[href*="/problem/"]')
            ?.getAttribute('href')
            ?.match(/\/problem\/([^/?#]+)/i)?.[1] || null
        );
        const problemName = firstNonEmpty(
          extractText('h1'),
          extractText('h2'),
          problemId
        );

        sendResponse({
          success: true,
          data: {
            links,
            problemId,
            problemName,
          },
          error: null,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error:
            error?.message ||
            'Failed to extract LightOJ result links from problem page',
        });
      }
    }

    extractKeyValueRows() {
      const rows = [];

      safeQueryAll('table tr').forEach((row) => {
        const cells = safeQueryAll('th, td', row);
        if (cells.length < 2) return;
        const key = extractText(cells[0]).toLowerCase();
        const value = extractText(cells[cells.length - 1]);
        if (!key || !value) return;
        rows.push({ key, value });
      });

      safeQueryAll('dt').forEach((dt) => {
        const key = extractText(dt).toLowerCase();
        if (!key) return;

        const dd = dt.nextElementSibling;
        if (!dd || String(dd.tagName || '').toLowerCase() !== 'dd') return;

        const value = extractText(dd);
        if (!value) return;
        rows.push({ key, value });
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

    extractProblemMetaFromDom(context) {
      const problemLink =
        safeQuery('a[href*="/problem/"]') ||
        safeQuery('[data-automation*="problem"] a[href]');

      const href = problemLink?.getAttribute('href') || problemLink?.href || '';
      const slugFromLink = href.match(/\/problem\/([^/?#]+)/i)?.[1] || null;
      const problemId = firstNonEmpty(context.problemId, slugFromLink);

      let problemName = firstNonEmpty(
        problemLink ? extractText(problemLink) : null,
        extractText('[data-automation*="problem-title"]'),
        extractText('.problem-title'),
        extractText('.title'),
        extractText('h1'),
        extractText('h2'),
        problemId
      );

      if (problemName && /submission/i.test(problemName) && problemId) {
        problemName = problemId;
      }

      const problemUrl = firstNonEmpty(
        href ? new URL(href, window.location.href).toString() : null,
        this.buildProblemUrl(problemId)
      );

      return {
        problemId,
        problemName,
        problemUrl,
      };
    }

    extractVerdictFromDom(rows) {
      const selectors = [
        '[data-automation*="status"]',
        '[data-automation*="verdict"]',
        '.verdict',
        '.status',
        '[class*="verdict"]',
        '[class*="status"]',
        '.tag',
        '.badge',
      ];

      for (const selector of selectors) {
        const node = safeQuery(selector);
        const value = extractText(node);
        if (!value) continue;
        if (
          /(accepted|wrong answer|time limit|memory limit|runtime error|compile|pending|judging|queued|partial|failed)/i.test(
            value
          )
        ) {
          return value;
        }
      }

      const rowValue = this.findValueByKey(rows, [/status/, /result/, /verdict/]);
      if (rowValue) return rowValue;

      const bodyText = String(document.body?.innerText || '').slice(0, 12000);
      const match = bodyText.match(
        /\b(accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compilation error|pending|judging|partial(?:ly accepted)?|failed)\b/i
      );
      return match?.[1] || null;
    }

    extractLanguageFromDom(rows) {
      const selectors = [
        '[data-automation*="language"]',
        '.language',
        '[class*="language"]',
        '[class*="lang"]',
      ];

      for (const selector of selectors) {
        const node = safeQuery(selector);
        const value = extractText(node);
        if (!value) continue;
        if (/^[A-Za-z0-9#+_.()\- ]{2,50}$/.test(value)) {
          return value;
        }
      }

      const rowValue = this.findValueByKey(rows, [/language/, /^lang\b/]);
      if (rowValue) return rowValue;

      const bodyText = String(document.body?.innerText || '').slice(0, 12000);
      const match = bodyText.match(
        /\b(C\+\+\s*\d*|C#|Java(?:\s*\d+)?|Python\s*\d*|PyPy\s*\d*|JavaScript|TypeScript|Rust|Go|Kotlin|Swift|Ruby|Scala|Haskell)\b/i
      );
      return match?.[1] || null;
    }

    extractExecutionTimeFromDom(rows) {
      const rowValue = this.findValueByKey(rows, [/runtime/, /execution/, /^time$/]);
      if (rowValue) {
        const parsed = parseDurationToMs(rowValue);
        if (parsed !== null) return parsed;
      }

      const runtimeNode = safeQuery('[class*="runtime"], [data-automation*="runtime"], [class*="time"]');
      const runtimeText = extractText(runtimeNode);
      return parseDurationToMs(runtimeText);
    }

    extractMemoryFromDom(rows) {
      const rowValue = this.findValueByKey(rows, [/memory/, /mem\b/]);
      if (rowValue) {
        const parsed = parseMemoryToKb(rowValue);
        if (parsed !== null) return parsed;
      }

      const memoryNode = safeQuery('[class*="memory"], [data-automation*="memory"]');
      const memoryText = extractText(memoryNode);
      return parseMemoryToKb(memoryText);
    }

    extractSubmittedAtFromDom(rows) {
      const timeNode = safeQuery('time[datetime]');
      if (timeNode) {
        const parsed = parseTimestampToIso(timeNode.getAttribute('datetime'));
        if (parsed) return parsed;
      }

      const rowValue = this.findValueByKey(rows, [
        /submitted/,
        /submission\s*time/,
        /^time$/,
        /^date$/,
      ]);
      if (rowValue) {
        const parsed = parseTimestampToIso(rowValue);
        if (parsed) return parsed;
      }

      const candidateNodes = safeQueryAll('[data-timestamp], [data-time], [title]');
      for (const node of candidateNodes) {
        const parsed =
          parseTimestampToIso(node.getAttribute('data-timestamp')) ||
          parseTimestampToIso(node.getAttribute('data-time')) ||
          parseTimestampToIso(node.getAttribute('title'));
        if (parsed) return parsed;
      }

      return null;
    }

    extractSourceCodeFromDom() {
      const candidates = [];

      const pushCandidate = (rawValue, selector, bonus = 0) => {
        const cleaned = cleanSourceCode(rawValue);
        if (!cleaned) return;

        let score = cleaned.length + bonus;
        if (looksLikeCode(cleaned)) score += 1000;

        candidates.push({ code: cleaned, score, selector });
      };

      const monacoLines = safeQueryAll('.monaco-editor .view-lines .view-line')
        .map((line) => line.innerText || line.textContent || '')
        .map((line) => line.replace(/\u00A0/g, ' '));
      if (monacoLines.length > 0) {
        pushCandidate(monacoLines.join('\n'), 'monaco', 350);
      }

      const aceLines = safeQueryAll('.ace_line')
        .map((line) => line.innerText || line.textContent || '')
        .map((line) => line.replace(/\u00A0/g, ' '));
      if (aceLines.length > 0) {
        pushCandidate(aceLines.join('\n'), 'ace', 300);
      }

      const codeMirrorLines = safeQueryAll('.CodeMirror-code pre').map(
        (line) => line.textContent || ''
      );
      if (codeMirrorLines.length > 0) {
        pushCandidate(codeMirrorLines.join('\n'), 'codemirror', 300);
      }

      const selectors = [
        '[data-automation*="code"] pre',
        '[data-automation*="code"] code',
        '.source-code pre',
        '.source-code code',
        '.code-viewer pre',
        '.code-viewer code',
        '.problem-detail pre',
        'pre code',
        'pre',
        'textarea',
      ];

      selectors.forEach((selector) => {
        safeQueryAll(selector).forEach((node) => {
          const value = typeof node.value === 'string' ? node.value : node.textContent;
          let bonus = 0;
          if (/code/i.test(selector)) bonus += 160;
          if (/textarea/i.test(selector)) bonus += 120;
          pushCandidate(value, selector, bonus);
        });
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].code;
    }

    extractSourceCodeFromEmbeddedText() {
      const scripts = safeQueryAll('script:not([src])');

      for (const script of scripts) {
        const text = script.textContent || '';
        if (!text || text.length > 2_000_000) continue;
        if (!/source[_-]?code|submission|program|solution/i.test(text)) continue;

        const patterns = [
          /"source[_-]?code"\s*:\s*"([\s\S]*?)"/i,
          /"sourceCode"\s*:\s*"([\s\S]*?)"/i,
          /"code"\s*:\s*"([\s\S]*?)"/i,
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (!match?.[1]) continue;

          const decoded = cleanSourceCode(
            match[1]
              .replace(/\\r\\n/g, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
          );

          if (decoded && looksLikeCode(decoded)) {
            return decoded;
          }
        }
      }

      return null;
    }

    pickBestSourceCode(candidates) {
      let best = null;

      candidates.forEach((candidate) => {
        const cleaned = cleanSourceCode(candidate);
        if (!cleaned) return;

        let score = cleaned.length;
        if (looksLikeCode(cleaned)) score += 1000;
        if (/^\s*[{[]/.test(cleaned)) score -= 200;

        if (!best || score > best.score) {
          best = { score, code: cleaned };
        }
      });

      return best?.code || null;
    }

    async extractSubmission(request = {}) {
      const context = this.parseUrlContext();
      const requestSubmissionId = normalizeWhitespace(request?.submissionId);

      if (requestSubmissionId && !context.submissionId) {
        context.submissionId = requestSubmissionId;
      }

      if (!context.submissionId) {
        log('No submission ID found');
        return null;
      }

      await waitForElement('body', 5000).catch(() => null);

      const rows = this.extractKeyValueRows();
      const problem = this.extractProblemMetaFromDom(context);

      const verdictRaw = this.extractVerdictFromDom(rows);
      const language = firstNonEmpty(this.extractLanguageFromDom(rows), 'Unknown');
      const executionTime = this.extractExecutionTimeFromDom(rows);
      const memoryUsed = this.extractMemoryFromDom(rows);
      const submittedAt = this.extractSubmittedAtFromDom(rows);

      const sourceCode = this.pickBestSourceCode([
        this.extractSourceCodeFromDom(),
        this.extractSourceCodeFromEmbeddedText(),
      ]);

      const handle = await this.getUserHandle();
      const verdict = normalizeVerdict(verdictRaw || 'UNKNOWN');

      return {
        platform: this.platform,
        handle,
        problemId: problem.problemId,
        problemName: problem.problemName,
        problemUrl: problem.problemUrl,
        submissionId: context.submissionId,
        submissionUrl: window.location.href,
        verdict,
        language,
        executionTime,
        memoryUsed,
        submittedAt: submittedAt || null,
        sourceCode,

        problem_id: problem.problemId,
        problem_name: problem.problemName,
        problem_url: problem.problemUrl,
        submission_id: context.submissionId,
        submission_url: window.location.href,
        verdict_raw: verdictRaw || null,
        submitted_at: submittedAt || null,
        source_code: sourceCode,
        execution_time_ms: executionTime,
        memory_kb: memoryUsed,
      };
    }

    extractProblemDetails() {
      const context = this.parseUrlContext();
      const problem = this.extractProblemMetaFromDom(context);

      const root =
        safeQuery('.problem-statement') ||
        safeQuery('.statement') ||
        safeQuery('.problem-description') ||
        safeQuery('.problem-detail') ||
        safeQuery('.markdown-body') ||
        safeQuery('main') ||
        safeQuery('article') ||
        document.body;

      const rawText = String(root?.innerText || '')
        .replace(/\u00A0/g, ' ')
        .trim();
      const normalizedText = rawText.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');

      const inputFormat = extractLabeledSection(normalizedText, ['Input', 'Input Format']);
      const outputFormat = extractLabeledSection(normalizedText, ['Output', 'Output Format']);
      const constraints = extractLabeledSection(normalizedText, ['Constraints']);
      const notes = extractLabeledSection(normalizedText, ['Notes', 'Explanation']);
      const examples = parseSampleTests(normalizedText);

      const description = firstNonEmpty(
        extractText('.problem-statement'),
        extractText('.statement'),
        extractText('.problem-description'),
        normalizedText
      );

      return {
        problemId: problem.problemId,
        problemName: problem.problemName,
        problemUrl: problem.problemUrl || window.location.href,
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
        typeof details.description === 'string' && details.description.trim().length >= 20;
      const hasInputOutput =
        typeof details.inputFormat === 'string' &&
        details.inputFormat.trim().length > 0 &&
        typeof details.outputFormat === 'string' &&
        details.outputFormat.trim().length > 0;
      const hasExamples = Array.isArray(details.examples) && details.examples.length > 0;
      const hasConstraints =
        typeof details.constraints === 'string' && details.constraints.trim().length > 0;

      return hasDescription || hasInputOutput || hasExamples || hasConstraints;
    }

    async handleExtractSubmissionMessage(request, sendResponse) {
      try {
        const pageType = this.detectPageType();
        if (pageType !== 'submission') {
          sendResponse({
            success: false,
            nonRetriable: true,
            error: 'Not on LightOJ submission page',
          });
          return;
        }

        const submission = await this.extractSubmission(request);
        if (!submission) {
          sendResponse({
            success: false,
            error: 'Could not extract LightOJ submission details',
          });
          return;
        }

        const requiresSourceCode = request?.requireSourceCode === true;
        const sourceCode = firstNonEmpty(submission.sourceCode, submission.source_code);

        if (requiresSourceCode && !sourceCode) {
          sendResponse({
            success: false,
            pending: true,
            data: submission,
            error: 'LightOJ source code not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: submission, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract LightOJ submission',
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
            error: 'Not on LightOJ problem page yet',
          });
          return;
        }

        await waitForElement('body', 4000).catch(() => null);

        const details = this.extractProblemDetails();
        if (!this.hasMeaningfulProblemDetails(details)) {
          sendResponse({
            success: false,
            pending: true,
            error: 'LightOJ problem details not ready yet',
          });
          return;
        }

        sendResponse({ success: true, data: details, error: null });
      } catch (error) {
        sendResponse({
          success: false,
          error: error?.message || 'Failed to extract LightOJ problem details',
        });
      }
    }

    setupMessageListener() {
      if (!browserAPI?.runtime?.onMessage || this.messageListenerAttached) {
        return;
      }

      this.messageListenerAttached = true;

      browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request?.action === 'extractCategoryProblems') {
          this.handleExtractCategoryProblemsMessage(sendResponse);
          return true;
        }

        if (request?.action === 'extractResultLinks') {
          this.handleExtractResultLinksMessage(request, sendResponse);
          return true;
        }

        if (request?.action === 'extractAttemptedProblems') {
          this.handleExtractAttemptedProblemsMessage(sendResponse);
          return true;
        }

        if (request?.action === 'extractSubmissions') {
          this.handleExtractSubmissionsMessage(request, sendResponse);
          return true;
        }

        if (request?.action === 'extractSubmissionsPage') {
          this.handleExtractSubmissionsMessage(
            { ...request, includeMeta: true },
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
      });
    }

    storeSubmission(submission) {
      if (!browserAPI?.storage?.local || !submission?.submissionId) {
        return;
      }

      browserAPI.storage.local.get(['cachedSubmissions'], (result) => {
        const cached = result.cachedSubmissions || {};
        const platformCache = Array.isArray(cached[this.platform]) ? cached[this.platform] : [];

        const byId = new Map(
          platformCache
            .filter((item) => item?.submissionId)
            .map((item) => [String(item.submissionId), item])
        );

        byId.set(String(submission.submissionId), submission);

        const merged = Array.from(byId.values())
          .sort((a, b) => String(b.submissionId).localeCompare(String(a.submissionId)))
          .slice(0, 200);

        cached[this.platform] = merged;
        browserAPI.storage.local.set({ cachedSubmissions: cached }, () => {
          this.autoSyncIfEnabled(submission);
        });
      });
    }

    autoSyncIfEnabled(submission) {
      if (!browserAPI?.runtime || !browserAPI?.storage?.sync) return;
      if (!submission?.submissionId) return;

      browserAPI.storage.sync.get(
        ['autoSyncEnabled', 'autoFetchEnabled', 'autoSync', 'extensionToken'],
        (result) => {
          const autoSyncEnabled =
            result.autoSyncEnabled === true ||
            result.autoFetchEnabled === true ||
            result.autoSync === true;

          if (!autoSyncEnabled || !result.extensionToken) {
            return;
          }

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
      );
    }

    async init() {
      if (this.initialized) return;

      this.setupMessageListener();

      const pageType = this.detectPageType();
      if (pageType === 'submission') {
        const submission = await this.extractSubmission({});
        if (submission) {
          this.storeSubmission(submission);
        }
      }

      this.initialized = true;
      log('Extractor initialized on page type:', pageType);
    }
  }

  function initExtractor() {
    log('Content script loaded on:', window.location.href);
    const extractor = new LightOJExtractor();
    extractor.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
  } else {
    initExtractor();
  }
})();
